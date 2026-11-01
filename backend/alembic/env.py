import os
import sys
from logging.config import fileConfig

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context
from backend.app.core.config import settings
from backend.app.core.database import Base
import backend.app.models.models  # Ensures all models are registered

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Overwrite sqlalchemy.url with the application's actual configured DATABASE_URL
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    from backend.app.core.database import engine as app_engine

    with app_engine.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            render_as_batch=True if app_engine.url.drivername.startswith("sqlite") else False
        )

        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
