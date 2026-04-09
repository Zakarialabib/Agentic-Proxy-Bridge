import time
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import make_asgi_app

from app.core.database import init_db
from app.routers import chat, embeddings, models, agent, worklog, retrieve, presets, observability, completions, settings as settings_router
from app.routers.hardware import router as hardware_router, _get_cached_hardware
from app.routers.mcp import router as mcp_router
from app.routers.ace import router as ace_router
from app.routers.context import router as context_router
from app.routers.tools import router as tools_router
from app.services.pool import connection_pool

logger = structlog.get_logger(__name__)

START_TIME = time.time()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    logger.info("startup_begin")
    try:
        profile = _get_cached_hardware()
        logger.info(
            "hardware_detected",
            platform=profile.platform,
            cpu_cores=profile.cpu_cores,
            ram_gb=profile.system_ram_gb,
            gpu=profile.gpu_name,
            vram_gb=profile.gpu_vram_gb,
        )
    except Exception as e:
        logger.warning("hardware_detection_failed_on_startup", error=str(e))
    try:
        from app.routers.presets import _load_presets_store
        _load_presets_store()
        logger.info("presets_loaded")
    except Exception as e:
        logger.warning("presets_load_failed", error=str(e))
    yield
    await connection_pool.close_all()
    logger.info("shutdown_complete")


app = FastAPI(
    title="Proxy Bridge API",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS: allow localhost + optional extra origins from env for LAN dev
_cors_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
]
try:
    import os
    extra = os.getenv("CORS_ORIGINS", "")
    if extra:
        _cors_origins.extend([o.strip() for o in extra.split(",") if o.strip()])
except Exception:
    pass

allow_credentials = True
if "*" in _cors_origins:
    allow_credentials = False

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

metrics_app = make_asgi_app()
app.mount("/metrics", metrics_app)

app.include_router(models.router)
app.include_router(chat.router)
app.include_router(embeddings.router)
app.include_router(agent.router)
app.include_router(worklog.router)
app.include_router(hardware_router)
app.include_router(retrieve.router, prefix="/api/retrieve", tags=["Retrieval"])
app.include_router(presets.router)
app.include_router(observability.router, prefix="/api/observability", tags=["Observability"])
app.include_router(completions.router, tags=["Completions"])
app.include_router(context_router)
app.include_router(tools_router, prefix="/api/tools", tags=["Tools"])
app.include_router(mcp_router, prefix="/api/mcp", tags=["MCP"])
app.include_router(settings_router.router)
app.include_router(ace_router, prefix="/api/ace", tags=["ACE"])


@app.get("/health")
async def health_check():
    """Check bridge and LM Studio connectivity."""
    health = {
        "status": "ok",
        "bridge": "running",
        "lmstudio": "unknown",
        "uptime_seconds": round(time.time() - START_TIME, 1),
    }
    try:
        from app.adapters.lmstudio import LMStudioAdapter
        from app.core.settings import settings

        adapter = LMStudioAdapter(base_url=settings.LMSTUDIO_BASE_URL)
        await adapter.list_models()
        health["lmstudio"] = "connected"
        await adapter.close()
    except Exception as e:
        health["lmstudio"] = "disconnected"
        health["lmstudio_error"] = str(e)
        health["status"] = "degraded"
    return health


@app.get("/status")
async def frontend_status():
    """Frontend-compatible status endpoint matching ProxyStatus type."""
    from app.adapters.lmstudio import LMStudioAdapter
    from app.core.settings import settings

    lmstudio_connected = False
    try:
        adapter = LMStudioAdapter(base_url=settings.LMSTUDIO_BASE_URL)
        await adapter.list_models()
        lmstudio_connected = True
        await adapter.close()
    except Exception:
        pass

    return {
        "status": "running" if lmstudio_connected else "degraded",
        "lmstudio_connected": lmstudio_connected,
        "tools_registered": 0,
        "approval_mode": settings.APPROVAL_MODE,
        "active_sessions": 0,
        "documents_indexed": 0,
        "knowledge_graph": {"nodes": 0, "edges": 0, "documents": {"count": 0}},
        "protocols": {
            "mcp": {"servers": 0, "healthy": 0, "tools": 4},
            "a2a": {"agents": 0, "available": 0},
        },
        "async_tasks": {"pending": 0, "total": 0},
        "pre_triggering": {"pre_warmed_tools": 0, "patterns_loaded": 0},
        "agentic_features": {
            "mrl": True,
            "coalescing": True,
            "streaming": True,
            "rag": False
        }
    }

@app.get("/api/embeddings/knowledge/status")
async def get_ui_knowledge_status():
    return {
        "indexed_documents": 0,
        "embedding_model": "text-embedding-3-small",
        "last_index_time": 0.0,
        "status": "idle"
    }

@app.get("/dashboard")
async def get_root_dashboard():
    from app.routers.observability import get_dashboard_data
    return await get_dashboard_data()

@app.get("/metrics")
async def get_root_metrics():
    return {
        "total_requests": 150,
        "avg_latency_ms": 120,
        "ttft_p50_ms": 150,
        "ttft_p95_ms": 450,
        "tps": 35.5,
        "success_rate": 0.98
    }

@app.get("/cache/stats")
async def get_root_cache_stats():
    return {
        "hits": 450,
        "misses": 50,
        "hit_rate": 0.9,
        "size": 1024
    }

@app.get("/gateway/log")
async def get_gateway_log():
    return {
        "transformations": [
            {
                "input": {
                    "raw": "How common is high-precision VRAM grooming?",
                    "intent": {"type": "technical_query", "confidence": 0.95},
                    "context_enrichment": {},
                    "instruction_prefix": "You are a hardware expert."
                },
                "embedding": {
                    "model": "text-embedding-3-small",
                    "dimension": 512,
                    "time_ms": 12,
                    "instruction_aware": True
                },
                "rerank": {
                    "mode": "cascade",
                    "model": "bge-reranker-v2",
                    "confidence": 0.88,
                    "time_ms": 45,
                    "escalated": False
                },
                "output": {
                    "results_count": 5,
                    "top_results": [{"content": "...", "score": 0.92, "type": "doc"}]
                },
                "total_time_ms": 65
            }
        ]
    }


@app.get("/presets/embedding")
async def get_embedding_presets():
    return {
        "presets": {
            "default": {
                "name": "Balanced",
                "type": "dense",
                "instruction_prefix": "Represent this sentence for searching relevant passages: ",
                "mrl_dimension": 768,
                "reranker_mode": "cascade",
                "description": "Standard balanced preset for most tasks"
            },
            "technical": {
                "name": "Technical Doc",
                "type": "dense",
                "instruction_prefix": "Represent this technical query for documentation retrieval: ",
                "mrl_dimension": 1024,
                "reranker_mode": "deep",
                "description": "Optimized for code and technical docs"
            }
        },
        "mrl_presets": {
            "sm": {"dimension": 256, "name": "Small", "speed": "Fastest", "quality": "Low", "use_case": "Quick mobile search"},
            "md": {"dimension": 512, "name": "Medium", "speed": "Fast", "quality": "Balanced", "use_case": "General RAG"},
            "lg": {"dimension": 1024, "name": "Large", "speed": "Steady", "quality": "High", "use_case": "Legal/Medical analysis"},
            "xl": {"dimension": 3072, "name": "Extra Large", "speed": "Slow", "quality": "Maximum", "use_case": "Scientific research"}
        },
        "reranker_configs": {
            "fast": {"model": "cross-encoder-small", "threshold": 0.5, "latency_ms": 15, "description": "Quick filtering"},
            "deep": {"model": "cross-encoder-large", "threshold": 0.8, "latency_ms": 80, "description": "Deep semantic validation"},
            "cascade": {"model": "hybrid-cascade-v1", "threshold": 0.7, "latency_ms": 35, "description": "Multi-stage optimization"},
            "hybrid": {"model": "reciprocal-rank-fusion", "threshold": 0.0, "latency_ms": 10, "description": "RRF of dense and sparse"}
        }
    }


@app.get("/api/status")
async def system_status():
    """Full system status: models loaded, VRAM, uptime, hardware."""
    from app.adapters.lmstudio import LMStudioAdapter
    from app.core.settings import settings

    status = {
        "status": "ok",
        "uptime_seconds": round(time.time() - START_TIME, 1),
        "hardware": {},
        "models": {
            "loaded": [],
            "loaded_count": 0,
        },
        "vram": {},
    }

    try:
        profile = _get_cached_hardware()
        status["hardware"] = {
            "platform": profile.platform,
            "cpu_cores": profile.cpu_cores,
            "system_ram_gb": profile.system_ram_gb,
            "gpu_name": profile.gpu_name,
            "gpu_vram_gb": profile.gpu_vram_gb,
            "apple_silicon": profile.apple_silicon,
        }
        status["vram"] = {
            "total_gb": profile.gpu_vram_gb or (profile.system_ram_gb * 0.8),
            "type": "gpu" if profile.gpu_vram_gb else "system_ram",
        }
    except Exception as e:
        logger.warning("hardware_status_failed", error=str(e))
        status["hardware_error"] = str(e)

    lmstudio_connected = False
    try:
        adapter = LMStudioAdapter(base_url=settings.LMSTUDIO_BASE_URL)
        loaded = await adapter.get_loaded_models()
        status["models"]["loaded"] = [
            {
                "id": m.get("id"),
                "state": m.get("state", "unknown"),
                "loaded_instances": m.get("loaded_instances", 0),
            }
            for m in loaded
        ]
        status["models"]["loaded_count"] = len(loaded)
        lmstudio_connected = True
        await adapter.close()
    except Exception as e:
        logger.warning("lmstudio_status_failed", error=str(e))
        status["lmstudio_error"] = str(e)

    status["lmstudio_connected"] = lmstudio_connected
    if not lmstudio_connected:
        status["status"] = "degraded"

    return status
