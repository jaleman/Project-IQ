"""Alembic migration environment."""

import asyncio
import ssl
from logging.config import fileConfig

from alembic import context
from sqlalchemy.ext.asyncio import async_engine_from_config, create_async_engine
from sqlalchemy import pool

from config import settings
from database import Base
import models  # noqa: F401 – ensure all models are imported

config = context.config

# Strip sslmode from the URL — asyncpg requires ssl via connect_args, not a URL param
_db_url = settings.database_url.replace("?sslmode=require", "").replace("&sslmode=require", "")
_use_ssl = "sslmode=require" in settings.database_url

config.set_main_option("sqlalchemy.url", _db_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(
        url=settings.database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    connect_args = {"ssl": ssl.create_default_context()} if _use_ssl else {}
    connectable = create_async_engine(
        _db_url,
        poolclass=pool.NullPool,
        connect_args=connect_args,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
