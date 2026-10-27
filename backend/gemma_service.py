import json
import logging
import time
import asyncio
from typing import Type, TypeVar, Tuple, Dict, Any, Optional
from pydantic import BaseModel, ValidationError

from config import get_settings
from schemas import AppError, ErrorCode, ResponseMeta
from prompts import build_repair_message

logger = logging.getLogger("studyspark.gemma")

T = TypeVar("T", bound=BaseModel)


def extract_json(raw_text: str) -> dict:
    """
    Extracts and parses a JSON object from raw model output.
    Handles:
    - Markdown code fences (```json ... ``` or ``` ... ```)
    - Surrounding commentary/conversational text (extracts outermost { ... })
    - Rejects trailing commas (enforced by standard json.loads)
    - Rejects empty/invalid input
    """
    if not raw_text or not raw_text.strip():
        raise ValueError("Model returned an empty response")

    text = raw_text.strip()

    # Strip code block fences if present
    if text.startswith("```"):
        first_newline = text.find("\n")
        if first_newline != -1:
            text = text[first_newline + 1:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()

    # Locate outermost { and }
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end < start:
        raise ValueError("No valid JSON object found in response")

    json_str = text[start : end + 1]

    try:
        data = json.loads(json_str)
    except json.JSONDecodeError as e:
        raise ValueError(f"JSON could not be parsed: {e.msg}") from e

    if not isinstance(data, dict):
        raise ValueError("Parsed JSON root is not an object")

    return data


class GemmaService:
    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        client: Optional[Any] = None,
    ):
        settings = get_settings()
        self.api_key = api_key if api_key is not None else settings.gemini_api_key
        self.model = model if model is not None else settings.gemma_model
        self.timeout_seconds = settings.model_timeout_seconds
        self.client = client

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key and self.api_key.strip())

    def _get_client(self):
        if self.client is not None:
            return self.client
        if not self.is_configured:
            raise AppError(
                code=ErrorCode.MODEL_UNAVAILABLE,
                message="Gemini API key is not configured.",
                retryable=True,
            )
        try:
            from google import genai
            self.client = genai.Client(api_key=self.api_key)
            return self.client
        except Exception as e:
            logger.error(f"Failed to create Google GenAI client: {e}")
            raise AppError(
                code=ErrorCode.MODEL_UNAVAILABLE,
                message="Failed to initialize AI service client.",
                retryable=True,
            )

    async def _call_model(self, system: str, user: str, temperature: float, max_output_tokens: int) -> str:
        client = self._get_client()
        from google.genai import types

        # Attempt call with system_instruction in config
        config = types.GenerateContentConfig(
            temperature=temperature,
            max_output_tokens=max_output_tokens,
            system_instruction=system,
        )

        try:
            response = await asyncio.wait_for(
                client.aio.models.generate_content(
                    model=self.model,
                    contents=user,
                    config=config,
                ),
                timeout=self.timeout_seconds,
            )
            return response.text or ""
        except asyncio.TimeoutError:
            raise
        except Exception as e:
            # Fall back to prepending system instruction if system_instruction rejected
            err_str = str(e).lower()
            if "system_instruction" in err_str or "not supported" in err_str:
                logger.info("System instruction not directly supported, prepending to user prompt")
                combined = f"{system}\n\n{user}"
                fallback_config = types.GenerateContentConfig(
                    temperature=temperature,
                    max_output_tokens=max_output_tokens,
                )
                response = await asyncio.wait_for(
                    client.aio.models.generate_content(
                        model=self.model,
                        contents=combined,
                        config=fallback_config,
                    ),
                    timeout=self.timeout_seconds,
                )
                return response.text or ""
            raise

    async def generate_json(
        self,
        *,
        system: str,
        user: str,
        output_model: Type[T],
        temperature: float,
        max_output_tokens: int,
        language: str = "en",
    ) -> Tuple[T, ResponseMeta]:
        """
        Calls Gemma to generate structured JSON, validates against output_model,
        and applies the single-retry repair policy (max 2 attempts).
        """
        start_time = time.perf_counter()
        current_user_prompt = user
        attempts = 0
        max_attempts = 2

        while attempts < max_attempts:
            attempts += 1
            raw_response = ""

            try:
                raw_response = await self._call_model(
                    system=system,
                    user=current_user_prompt,
                    temperature=temperature,
                    max_output_tokens=max_output_tokens,
                )
            except asyncio.TimeoutError:
                logger.warning(f"Gemma model call timed out after {self.timeout_seconds}s (attempt {attempts})")
                raise AppError(
                    code=ErrorCode.MODEL_TIMEOUT,
                    message="Model call exceeded the timeout limit.",
                    retryable=True,
                )
            except AppError:
                raise
            except Exception as e:
                err_code = getattr(e, "code", None)
                err_msg = str(e)

                # Upstream 429
                if err_code == 429 or "429" in err_msg or "RESOURCE_EXHAUSTED" in err_msg:
                    logger.warning(f"Upstream rate limit hit on attempt {attempts}: {e}")
                    if attempts < max_attempts:
                        await asyncio.sleep(1.5)
                        continue
                    raise AppError(
                        code=ErrorCode.RATE_LIMITED,
                        message="Upstream AI rate limit reached. Please wait a moment and try again.",
                        retryable=True,
                    )

                # Upstream 5xx / connection error
                if (err_code and err_code >= 500) or "503" in err_msg or "unavailable" in err_msg.lower():
                    logger.warning(f"Upstream provider error on attempt {attempts}: {e}")
                    if attempts < max_attempts:
                        await asyncio.sleep(1.0)
                        continue
                    raise AppError(
                        code=ErrorCode.MODEL_UNAVAILABLE,
                        message="AI service is temporarily unavailable. Please try again.",
                        retryable=True,
                    )

                # Other unexpected model failure
                logger.error(f"Unexpected model call error on attempt {attempts}: {e}")
                if attempts < max_attempts:
                    await asyncio.sleep(0.5)
                    continue
                raise AppError(
                    code=ErrorCode.MODEL_UNAVAILABLE,
                    message="Failed to contact the AI model. Please try again.",
                    retryable=True,
                )

            # Parse and validate the response
            try:
                data_dict = extract_json(raw_response)

                # Check if model reported content cannot be used for studying
                if "error" in data_dict and isinstance(data_dict["error"], str):
                    reason = data_dict["error"]
                    logger.info(f"Model returned unsuitable input error: {reason}")
                    raise AppError(
                        code=ErrorCode.UNSUITABLE_INPUT,
                        message=reason,
                        retryable=False,
                    )

                validated_instance = output_model.model_validate(data_dict)
                latency_ms = int((time.perf_counter() - start_time) * 1000)
                meta = ResponseMeta(
                    model=self.model,
                    language=language,
                    latency_ms=latency_ms,
                    attempts=attempts,
                )
                return validated_instance, meta

            except AppError:
                # Re-raise AppError immediately (e.g. UNSUITABLE_INPUT)
                raise
            except (ValueError, ValidationError) as parse_err:
                logger.warning(f"Model output validation failed on attempt {attempts}: {parse_err}")
                if attempts < max_attempts:
                    # Append repair instruction for attempt 2
                    problem_hint = str(parse_err).split("\n")[0]
                    repair_suffix = build_repair_message(problem=problem_hint)
                    current_user_prompt = f"{user}\n\n{repair_suffix}"
                    continue

                raise AppError(
                    code=ErrorCode.MODEL_OUTPUT_INVALID,
                    message="We couldn't format that answer. Please try again.",
                    retryable=True,
                )

        # Fallback if loop exits without returning or raising
        raise AppError(
            code=ErrorCode.MODEL_OUTPUT_INVALID,
            message="We couldn't format that answer. Please try again.",
            retryable=True,
        )


_gemma_service_instance: Optional[GemmaService] = None

def get_gemma_service() -> GemmaService:
    global _gemma_service_instance
    if _gemma_service_instance is None:
        _gemma_service_instance = GemmaService()
    return _gemma_service_instance
