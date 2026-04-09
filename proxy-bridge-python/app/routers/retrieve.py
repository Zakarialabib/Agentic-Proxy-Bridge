from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import math
import asyncio
from app.services.coalescer import embedding_coalescer
from app.core.settings import settings

router = APIRouter(tags=["Retrieval"])

@router.get("/gateway/status")
async def get_gateway_status():
    return {
        "status": "active",
        "last_sync": 0.0,
        "active_indices": 0
    }



class RetrieveRequest(BaseModel):
    query: str
    top_k: int = 5
    min_score: float = 0.0
    method: str = "dense"
    reranker: Optional[str] = None


class RetrieveResult(BaseModel):
    query: str
    results: List[Dict[str, Any]]
    total_time_ms: float
    method: str


class RerankRequest(BaseModel):
    query: str
    documents: List[str]
    top_k: int = 5


class RerankResult(BaseModel):
    query: str
    results: List[Dict[str, Any]]
    total_time_ms: float
    model: str


@router.post("/query", response_model=RetrieveResult)
async def retrieve_documents(req: RetrieveRequest):
    return RetrieveResult(
        query=req.query,
        results=[],
        total_time_ms=0.0,
        method=req.method,
    )


@router.post("/rerank", response_model=RerankResult)
async def rerank_documents(req: RerankRequest):
    if not req.documents:
        return RerankResult(query=req.query, results=[], total_time_ms=0.0, model=settings.EMBED_MODEL)

    async def embed(text: str) -> List[float]:
        return await embedding_coalescer.get_embedding(text, settings.EMBED_MODEL)

    def cosine(a: List[float], b: List[float]) -> float:
        if not a or not b:
            return 0.0
        dot = sum(x * y for x, y in zip(a, b))
        norm_a = math.sqrt(sum(x * x for x in a))
        norm_b = math.sqrt(sum(y * y for y in b))
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return dot / (norm_a * norm_b)

    try:
        query_emb = await embed(req.query)
        doc_embs = await asyncio.gather(*[embed(doc) for doc in req.documents])
        scored = [
            {"index": i, "text": doc, "score": cosine(query_emb, emb)}
            for i, (doc, emb) in enumerate(zip(req.documents, doc_embs))
        ]
        scored.sort(key=lambda x: x["score"], reverse=True)
        scored = scored[: req.top_k]
    except Exception:
        scored = [{"index": i, "text": doc, "score": 0.0} for i, doc in enumerate(req.documents[:req.top_k])]
    return RerankResult(
        query=req.query,
        results=scored,
        total_time_ms=0.0,
        model=settings.EMBED_MODEL,
    )


@router.get("/stats")
async def get_retrieval_stats():
    return {
        "total_queries": 0,
        "avg_latency_ms": 0.0,
        "cache_hit_rate": 0.0,
        "documents_indexed": 0,
    }
