from fastapi import APIRouter
from app.api.v1.endpoints import auth, parts, manufacturers, suppliers, bom, risk, reports, pcn, dashboard, ai_replacements

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(parts.router, prefix="/parts", tags=["parts"])
api_router.include_router(manufacturers.router, prefix="/manufacturers", tags=["manufacturers"])
api_router.include_router(suppliers.router, prefix="/suppliers", tags=["suppliers"])
api_router.include_router(bom.router, prefix="/bom", tags=["bom"])
api_router.include_router(risk.router, prefix="/risk", tags=["risk"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
api_router.include_router(pcn.router, prefix="/pcn", tags=["pcn"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(ai_replacements.router, prefix="/replacements", tags=["ai-replacements"])
