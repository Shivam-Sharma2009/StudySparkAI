import logging
from typing import Optional
from config import get_settings

logger = logging.getLogger(__name__)


class GemmaService:
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        settings = get_settings()
        self.api_key = api_key if api_key is not None else settings.gemini_api_key
        self.model = model if model is not None else settings.gemma_model
        self.client = None

        if self.is_configured:
            try:
                from google import genai
                self.client = genai.Client(api_key=self.api_key)
                logger.info(f"GemmaService initialized with model: {self.model}")
            except Exception as e:
                logger.warning(f"Failed to initialize google-genai client: {e}")
        else:
            logger.info("GemmaService initialized without API key (ai_configured=False)")

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key and self.api_key.strip())

    async def generate_content(self, prompt: str) -> str:
        if not self.is_configured or not self.client:
            raise RuntimeError("GemmaService is not configured with a valid GEMINI_API_KEY.")
        
        # Async execution wrapper for google-genai
        response = self.client.models.generate_content(
            model=self.model,
            contents=prompt,
        )
        return response.text
