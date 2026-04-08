from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from app.schemas import EmbeddingRequest
from app.services.coalescer import embedding_coalescer

router = APIRouter(prefix="/v1", tags=["Embeddings"])

@router.post("/embeddings")
async def create_embedding(request: EmbeddingRequest):
    try:
        if isinstance(request.input, str):
            embedding = await embedding_coalescer.get_embedding(request.input, request.model)
            return {
                "object": "list",
                "data": [
                    {
                        "object": "embedding",
                        "index": 0,
                        "embedding": embedding
                    }
                ],
                "model": request.model
            }
        elif isinstance(request.input, list):
            # If a list is provided, we map them through coalescer concurrently
            import asyncio
            tasks = [
                embedding_coalescer.get_embedding(text, request.model)
                for text in request.input
            ]
            embeddings = await asyncio.gather(*tasks)
            
            return {
                "object": "list",
                "data": [
                    {
                        "object": "embedding",
                        "index": i,
                        "embedding": emb
                    } for i, emb in enumerate(embeddings)
                ],
                "model": request.model,
                "usage": {"prompt_tokens": 0, "total_tokens": 0}
            }
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": {"message": str(e), "type": "server_error"}}
        )
