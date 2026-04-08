from fastapi import APIRouter, Body, HTTPException
from typing import Dict, Any
from app.core.settings import settings

router = APIRouter(tags=["Settings"])

@router.get("/settings")
async def get_settings():
    return {
        "vram_budget_gb": settings.VRAM_BUDGET_GB,
        "max_context_length": settings.MAX_CONTEXT_LENGTH,
        "enable_probing": settings.ENABLE_PROBING,
        "enable_prewarming": settings.ENABLE_PREWARMING,
        "enable_fallback_chains": settings.ENABLE_FALLBACK_CHAINS,
        "log_level": settings.LOG_LEVEL,
        "approval_mode": getattr(settings, "APPROVAL_MODE", "autonomous")
    }

@router.post("/settings")
async def save_settings(payload: Dict[str, Any] = Body(...)):
    if "vram_budget_gb" in payload:
        settings.VRAM_BUDGET_GB = float(payload["vram_budget_gb"])
    if "max_context_length" in payload:
        settings.MAX_CONTEXT_LENGTH = int(payload["max_context_length"])
    if "enable_probing" in payload:
        settings.ENABLE_PROBING = bool(payload["enable_probing"])
    if "enable_prewarming" in payload:
        settings.ENABLE_PREWARMING = bool(payload["enable_prewarming"])
    if "enable_fallback_chains" in payload:
        settings.ENABLE_FALLBACK_CHAINS = bool(payload["enable_fallback_chains"])
    if "log_level" in payload:
        settings.LOG_LEVEL = str(payload["log_level"])
    if "approval_mode" in payload:
        settings.APPROVAL_MODE = str(payload["approval_mode"])
        
    return await get_settings()

@router.post("/approval-mode")
async def update_approval_mode(payload: Dict[str, Any] = Body(...)):
    mode = payload.get("mode")
    if not mode:
        raise HTTPException(status_code=400, detail="mode required")
    settings.APPROVAL_MODE = mode
    return {"success": True, "mode": mode}
