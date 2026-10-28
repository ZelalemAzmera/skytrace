from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from .models import Base
import os

_engine = None
_session_factory = None

def get_engine(database_url: str):
    global _engine, _session_factory
    if _engine is None:
        # ensure data directory exists for sqlite
        if "sqlite" in database_url:
            os.makedirs("data", exist_ok=True)
        _engine = create_async_engine(database_url, echo=False)
        _session_factory = async_sessionmaker(_engine, expire_on_commit=False)
    return _engine

async def create_tables(database_url: str) -> None:
    engine = get_engine(database_url)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

def get_session_factory():
    return _session_factory
