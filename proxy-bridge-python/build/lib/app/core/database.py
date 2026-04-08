from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel, create_engine
from app.core.settings import settings

# For async operations
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=True,
    future=True
)

async def init_db():
    async with engine.begin() as conn:
        # SQLModel.metadata.create_all is synchronous, so we need to bridge it
        await conn.run_sync(SQLModel.metadata.create_all)

async def get_session() -> AsyncSession:
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    async with async_session() as session:
        yield session
