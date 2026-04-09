from fastapi import APIRouter, Body, HTTPException
from typing import Dict, Any
from app.core.settings import settings

router = APIRouter(tags=["Settings"])

@router.get("/settings")
async def get_settings():
    try:
        from urllib.parse import urlparse
        parsed = urlparse(settings.LMSTUDIO_BASE_URL)
        host = parsed.hostname or "localhost"
        port = parsed.port or 1234
    except:
        host, port = "localhost", 1234

    return {
        "lm_studio": {
            "host": host,
            "port": port,
            "auto_connect": True
        },
        "proxy": {
            "streaming_enabled": True,
            "logging_enabled": True,
            "log_level": settings.LOG_LEVEL
        },
        "retrieval": {
            "cache_embeddings": True,
            "default_reranker": "cascade"
        },
        "vram": {
            "budget_mb": int(settings.VRAM_BUDGET_GB * 1024),
            "auto_evict": True,
            "pre_warm": settings.ENABLE_PREWARMING
        },
        "approval_mode": getattr(settings, "APPROVAL_MODE", "autonomous")
    }

@router.post("/settings")
async def save_settings(payload: Dict[str, Any] = Body(...)):
    # Handle LM Studio
    if "lm_studio" in payload:
        lm_conf = payload["lm_studio"]
        host = lm_conf.get("host", "localhost")
        port = lm_conf.get("port", 1234)
        if not host.startswith("http"):
            # support both http and https if provided, else assume http
            schema = "https" if "https" in str(host) else "http"
            settings.LMSTUDIO_BASE_URL = f"{schema}://{host}:{port}"
        else:
            settings.LMSTUDIO_BASE_URL = f"{host}:{port}"

    # Handle Proxy
    if "proxy" in payload:
        if "log_level" in payload["proxy"]:
            settings.LOG_LEVEL = str(payload["proxy"]["log_level"])
            
    # Handle VRAM
    if "vram" in payload:
        vram_conf = payload["vram"]
        if "budget_mb" in vram_conf:
            settings.VRAM_BUDGET_GB = float(vram_conf["budget_mb"]) / 1024.0
        if "pre_warm" in vram_conf:
            settings.ENABLE_PREWARMING = bool(vram_conf["pre_warm"])
            
    return await get_settings()


@router.post("/approval-mode")
async def update_approval_mode(payload: Dict[str, Any] = Body(...)):
    mode = payload.get("mode")
    if not mode:
        raise HTTPException(status_code=400, detail="mode required")
    settings.APPROVAL_MODE = mode
    return {"success": True, "mode": mode}
