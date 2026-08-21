import asyncio
from app.database import Base, engine
from app.models.models import *  # Make sure all models are imported to register metadata

async def init_models():
    async with engine.begin() as conn:
        # Create all tables on start (SQLite development convenience)
        await conn.run_sync(Base.metadata.create_all)
    print("Database tables initialized successfully.")

if __name__ == "__main__":
    asyncio.run(init_models())
