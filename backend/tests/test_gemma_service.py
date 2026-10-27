import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from gemma_service import extract_json, GemmaService
from schemas import ExplainOutput, AppError, ErrorCode


# ============================================================================
# JSON Extraction Tests (08 §1.10, 09 §2)
# ============================================================================

def test_extract_json_plain():
    text = '{"title": "Ohm\'s Law", "explanation": "V=IR"}'
    data = extract_json(text)
    assert data["title"] == "Ohm's Law"
    assert data["explanation"] == "V=IR"


def test_extract_json_code_fenced():
    text = """```json
{"title": "Gravity", "explanation": "What goes up must come down"}
```"""
    data = extract_json(text)
    assert data["title"] == "Gravity"


def test_extract_json_fenced_without_language_tag():
    text = """```
{"title": "Friction", "explanation": "Resistance to motion"}
```"""
    data = extract_json(text)
    assert data["title"] == "Friction"


def test_extract_json_with_surrounding_commentary():
    text = """Here is the explanation you requested:
{"title": "Energy", "explanation": "Ability to do work"}
Hope that helps! Let me know if you need anything else."""
    data = extract_json(text)
    assert data["title"] == "Energy"


def test_extract_json_trailing_commas_rejected():
    text = '{"title": "Test", "points": [1, 2, ],}'
    with pytest.raises(ValueError, match="JSON could not be parsed"):
        extract_json(text)


def test_extract_json_invalid_structure():
    with pytest.raises(ValueError, match="Model returned an empty response"):
        extract_json("")

    with pytest.raises(ValueError, match="No valid JSON object found"):
        extract_json("Just plain text with no json")


# ============================================================================
# GemmaService Async Tests
# ============================================================================

@pytest.mark.asyncio
async def test_gemma_service_missing_api_key():
    service = GemmaService(api_key="", client=None)
    with pytest.raises(AppError) as exc_info:
        await service.generate_json(
            system="system",
            user="user",
            output_model=ExplainOutput,
            temperature=0.4,
            max_output_tokens=1000,
        )
    assert exc_info.value.code == ErrorCode.MODEL_UNAVAILABLE
    assert exc_info.value.status_code == 503


@pytest.mark.asyncio
async def test_gemma_service_successful_first_attempt():
    mock_client = MagicMock()
    mock_resp = MagicMock()
    mock_resp.text = json_str = """{
        "title": "Photosynthesis",
        "explanation": "Process by which plants convert sunlight into food.",
        "example": "Leaves turning green and absorbing sunlight.",
        "key_points": ["Uses chlorophyll", "Produces oxygen"],
        "quick_recap": "Sunlight to energy."
    }"""
    mock_client.aio.models.generate_content = AsyncMock(return_value=mock_resp)

    service = GemmaService(api_key="valid-mock-key", client=mock_client)
    result, meta = await service.generate_json(
        system="sys",
        user="explain photosynthesis",
        output_model=ExplainOutput,
        temperature=0.4,
        max_output_tokens=1200,
        language="en",
    )

    assert isinstance(result, ExplainOutput)
    assert result.title == "Photosynthesis"
    assert meta.attempts == 1
    assert meta.language == "en"
    assert meta.latency_ms >= 0


@pytest.mark.asyncio
async def test_gemma_service_unsuitable_input():
    mock_client = MagicMock()
    mock_resp = MagicMock()
    mock_resp.text = '{"error": "This topic cannot be used for studying."}'
    mock_client.aio.models.generate_content = AsyncMock(return_value=mock_resp)

    service = GemmaService(api_key="valid-mock-key", client=mock_client)
    with pytest.raises(AppError) as exc_info:
        await service.generate_json(
            system="sys",
            user="bad text",
            output_model=ExplainOutput,
            temperature=0.4,
            max_output_tokens=1200,
        )
    assert exc_info.value.code == ErrorCode.UNSUITABLE_INPUT
    assert exc_info.value.status_code == 422
    assert exc_info.value.retryable is False


@pytest.mark.asyncio
async def test_gemma_service_retry_on_invalid_output_success_second_try():
    mock_client = MagicMock()
    bad_resp = MagicMock()
    bad_resp.text = 'Invalid JSON response from model'

    good_resp = MagicMock()
    good_resp.text = """{
        "title": "Photosynthesis",
        "explanation": "Process by which plants convert sunlight into food.",
        "example": "Leaves turning green.",
        "key_points": ["Uses chlorophyll"],
        "quick_recap": "Sunlight to energy."
    }"""

    mock_client.aio.models.generate_content = AsyncMock(side_effect=[bad_resp, good_resp])

    service = GemmaService(api_key="valid-mock-key", client=mock_client)
    result, meta = await service.generate_json(
        system="sys",
        user="explain photosynthesis",
        output_model=ExplainOutput,
        temperature=0.4,
        max_output_tokens=1200,
    )

    assert result.title == "Photosynthesis"
    assert meta.attempts == 2
    # Verify second call received repair prompt
    second_call_user_prompt = mock_client.aio.models.generate_content.call_args_list[1].kwargs["contents"]
    assert "Your previous reply was not valid." in second_call_user_prompt


@pytest.mark.asyncio
async def test_gemma_service_both_attempts_fail():
    mock_client = MagicMock()
    bad_resp = MagicMock()
    bad_resp.text = 'Broken JSON'
    mock_client.aio.models.generate_content = AsyncMock(return_value=bad_resp)

    service = GemmaService(api_key="valid-mock-key", client=mock_client)
    with pytest.raises(AppError) as exc_info:
        await service.generate_json(
            system="sys",
            user="user",
            output_model=ExplainOutput,
            temperature=0.4,
            max_output_tokens=1200,
        )

    assert exc_info.value.code == ErrorCode.MODEL_OUTPUT_INVALID
    assert exc_info.value.status_code == 502
    assert exc_info.value.retryable is True


@pytest.mark.asyncio
async def test_gemma_service_timeout():
    mock_client = MagicMock()
    async def slow_call(*args, **kwargs):
        await asyncio.sleep(0.5)
        return MagicMock()

    mock_client.aio.models.generate_content = slow_call

    service = GemmaService(api_key="valid-mock-key", client=mock_client)
    service.timeout_seconds = 0.05

    with pytest.raises(AppError) as exc_info:
        await service.generate_json(
            system="sys",
            user="user",
            output_model=ExplainOutput,
            temperature=0.4,
            max_output_tokens=1200,
        )

    assert exc_info.value.code == ErrorCode.MODEL_TIMEOUT
    assert exc_info.value.status_code == 504


@pytest.mark.asyncio
async def test_gemma_service_upstream_429():
    mock_client = MagicMock()
    rate_limit_err = Exception("429 RESOURCE_EXHAUSTED: Rate limit exceeded")
    mock_client.aio.models.generate_content = AsyncMock(side_effect=rate_limit_err)

    service = GemmaService(api_key="valid-mock-key", client=mock_client)

    with patch("asyncio.sleep", new_callable=AsyncMock):
        with pytest.raises(AppError) as exc_info:
            await service.generate_json(
                system="sys",
                user="user",
                output_model=ExplainOutput,
                temperature=0.4,
                max_output_tokens=1200,
            )

    assert exc_info.value.code == ErrorCode.RATE_LIMITED
    assert exc_info.value.status_code == 429
