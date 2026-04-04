import httpx
from fastapi import APIRouter, HTTPException
from app.schemas import ModelListResponse
from app.core.settings import settings

router = APIRouter(prefix="/v1", tags=["Models"])

@router.get("/models")
async def list_models():
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{settings.lm_studio_base_url}/models")
            response.raise_for_status()
            return response.json()
    except Exception as e:
        # Fallback if LM Studio is down
        return {"object": "list", "data": []}
