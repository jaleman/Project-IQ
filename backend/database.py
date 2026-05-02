import ssl

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from config import settings

# asyncpg does not accept sslmode as a URL parameter — strip it and pass ssl via connect_args
_db_url = settings.database_url.replace("?sslmode=require", "").replace("&sslmode=require", "")
_connect_args = {"ssl": ssl.create_default_context()} if "sslmode=require" in settings.database_url else {}

engine = create_async_engine(_db_url, echo=settings.debug, future=True, connect_args=_connect_args)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:  # type: ignore[return]
    async with AsyncSessionLocal() as session:
        yield session
