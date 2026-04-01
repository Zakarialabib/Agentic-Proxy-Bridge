import contextlib
import uvloop
from fastapi import FastAPI
from prometheus_client import make_asgi_app
from app.routers import models, chat, embeddings, agent
from app.services.pool import connection_pool

# Set uvloop as the default event loop policy
uvloop.install()

@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    # Setup resources
    yield
    # Teardown resources
    await connection_pool.close_all()

app = FastAPI(
    title="Proxy Bridge API",
    version="1.0.0",
    lifespan=lifespan
)

# Add prometheus metrics endpoint
metrics_app = make_asgi_app()
app.mount("/metrics", metrics_app)

# Include routers
app.include_router(models.router)
app.include_router(chat.router)
app.include_router(embeddings.router)
app.include_router(agent.router)

@app.get("/health")
async def health_check():
    return {"status": "ok"}
