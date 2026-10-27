import pytest
from httpx import AsyncClient, ASGITransport
from main import app
from config import get_settings


@pytest.mark.asyncio
async def test_health_endpoint_structure():
    """Verify GET /api/health conforms to 05-API-Spec §3."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "ai_configured" in data
        assert isinstance(data["ai_configured"], bool)
        assert "model" in data
        assert data["version"] == "1.0.0"


@pytest.mark.asyncio
async def test_health_ai_configured_flag():
    """Verify ai_configured accurately reflects API key state."""
    settings = get_settings()
    expected_ai = bool(settings.gemini_api_key and settings.gemini_api_key.strip())
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/health")
        data = response.json()
        assert data["ai_configured"] == expected_ai
