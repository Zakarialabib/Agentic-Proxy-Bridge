import time
from fastapi import APIRouter
from app.schemas import ModelListResponse, Model

router = APIRouter(prefix="/v1", tags=["Models"])

@router.get("/models", response_model=ModelListResponse)
async def list_models():
    # Return a basic static list of models for the skeleton
    current_time = int(time.time())
    return ModelListResponse(
        data=[
            Model(id="gpt-3.5-turbo", created=current_time, owned_by="openai"),
            Model(id="gpt-4", created=current_time, owned_by="openai"),
            Model(id="text-embedding-ada-002", created=current_time, owned_by="openai"),
        ]
    )
