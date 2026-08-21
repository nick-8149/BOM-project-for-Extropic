import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from app.config import settings

# Determine if we're using SQLite or PostgreSQL
DATABASE_URL = settings.DATABASE_URL
IS_SQLITE = DATABASE_URL.startswith("sqlite")

# Configure connection arguments depending on the database dialect
connect_args = {}
if IS_SQLITE:
    # SQLite-specific configuration for handling multi-threaded connections
    connect_args["check_same_thread"] = False

# Create the async engine
engine = create_async_engine(
    DATABASE_URL,
    connect_args=connect_args,
    echo=settings.DEBUG,
)

# Async session factory
async_session_maker = async_sessionmaker(
    engine, 
    class_=AsyncSession, 
    expire_on_commit=False
)

# Base class for declarative SQLAlchemy models
Base = declarative_base()

async def get_db():
    """Dependency for providing database sessions during API requests."""
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()
