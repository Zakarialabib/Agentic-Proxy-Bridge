import httpx
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Body
from app.schemas import ModelListResponse
from app.core.settings import settings
from app.adapters.lmstudio import LMStudioAdapter

router = APIRouter(tags=["Models"])

@router.get("/v1/models")
async def list_models_v1():
    async with LMStudioAdapter() as adapter:
        try:
            models = await adapter.list_models()
            return {"object": "list", "data": models}
        except Exception:
            return {"object": "list", "data": []}

@router.get("/models/available")
async def get_available_models():
    async with LMStudioAdapter() as adapter:
        try:
            models = await adapter.list_models()
            available = []
            for m in models:
                model_id = m.get("id")
                available.append({
                    "modelKey": model_id,
                    "displayName": model_id.split("/")[-1] if "/" in model_id else model_id,
                    "type": "embedding" if "embedding" in model_id.lower() else "llm",
                    "format": "GGUF",
                    "sizeBytes": 0,
                    "sizeGB": 0,
                    "params": None,
                    "architecture": None,
                    "quantization": None,
                    "loaded": m.get("state") == "loaded" or m.get("loaded_instances", 0) > 0
                })
            return {"models": available, "connected": True}
        except Exception as e:
            return {"models": [], "connected": False, "error": str(e)}

@router.get("/models/loaded")
async def get_loaded_models():
    async with LMStudioAdapter() as adapter:
        try:
            loaded = await adapter.get_loaded_models()
            return {
                "data": [
                    {
                        "instance_id": m.get("id"),
                        "type": "llm",
                        "load_time_seconds": 0
                    } for m in loaded
                ],
                "count": len(loaded)
            }
        except Exception:
            return {"data": [], "count": 0}

@router.post("/models/load")
async def load_model(payload: Dict[str, Any] = Body(...)):
    model_id = payload.get("model")
    if not model_id:
        raise HTTPException(status_code=400, detail="model id required")
    
    async with LMStudioAdapter() as adapter:
        try:
            await adapter.load_model(model_id)
            return {
                "instance_id": model_id,
                "status": "loaded",
                "load_time_seconds": 0
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

@router.post("/models/unload")
async def unload_model(payload: Dict[str, Any] = Body(...)):
    model_id = payload.get("model")
    if not model_id:
        raise HTTPException(status_code=400, detail="model id required")
        
    async with LMStudioAdapter() as adapter:
        try:
            await adapter.unload_model(model_id)
            return {"status": "unloaded", "instance_id": model_id}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

@router.post("/models/refresh")
async def refresh_models():
    return {"status": "refreshed"}

@router.get("/models/stats/{model_id}")
async def get_model_stats(model_id: str):
    return {
        "model_id": model_id,
        "memory_usage_mb": 0,
        "tokens_processed": 0,
        "avg_tps": 0,
        "uptime_seconds": 0,
        "requests_total": 0
    }
