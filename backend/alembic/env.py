"""
Alembic env.py — configured for Digital Stylist MVP.

- Uses SQLModel.metadata for autogenerate support
- Reads DATABASE_URL from environment, falls back to alembic.ini value
"""
import os
import logging
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context
from sqlmodel import SQLModel

# Import ALL models so their tables are registered in SQLModel.metadata
from app.models import User, ClothingItem, LinkClick  # noqa: F401

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Alembic Config object (provides access to the .ini file values)
# ---------------------------------------------------------------------------
config = context.config

# Override sqlalchemy.url from env var if set
database_url = os.getenv("DATABASE_URL")
if database_url:
    config.set_main_option("sqlalchemy.url", database_url)

# Interpret the config file for Python logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# ---------------------------------------------------------------------------
# Model metadata for 'autogenerate' support
# ---------------------------------------------------------------------------
target_metadata = SQLModel.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    Configures the context with just a URL (no Engine needed).
    Calls to context.execute() emit the given string to the script output.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        render_as_batch=True,  # Required for SQLite ALTER TABLE support
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    Creates an Engine and associates a connection with the context.
    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            render_as_batch=True,  # Required for SQLite ALTER TABLE support
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
