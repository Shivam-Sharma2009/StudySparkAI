import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import get_settings

settings = get_settings()

logging.basicConfig(level=settings.log_level)
logger = logging.getLogger("studyspark")

app = FastAPI(
    title="StudySpark AI API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url=None,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-Request-Id"],
)


@app.get("/api/health")
async def health_check():
    """
    Health check endpoint per 05-API-Spec §3.
    Always fast, no model call. Returns ai_configured: false if GEMINI_API_KEY is not set.
    """
    current_settings = get_settings()
    return {
        "status": "ok",
        "ai_configured": current_settings.is_ai_configured,
        "model": current_settings.gemma_model,
        "version": "1.0.0",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
