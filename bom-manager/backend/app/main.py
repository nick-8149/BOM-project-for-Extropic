from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import uvicorn

from app.config import settings
from app.database import get_db
from app.api.v1.api import api_router
from app.api.v1.deps import get_current_user
from app.models.models import User
from app.schemas.user import UserOut

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    debug=settings.DEBUG,
)

# Set up CORS middleware per configured origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")

@app.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    """API endpoint verifying backend service operation and database accessibility."""
    db_status = "Healthy"
    try:
        # Run a simple query to verify db connection is alive
        await db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"Unhealthy: {str(e)}"
        
    return {
        "status": "online",
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "database": db_status
    }

@app.get("/api/v1/users/me", response_model=UserOut)
async def read_users_me(current_user: User = Depends(get_current_user)):
    """Endpoint returning details of the currently authenticated system profile."""
    return current_user

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
