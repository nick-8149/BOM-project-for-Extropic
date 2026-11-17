from fastapi import APIRouter
from app.api.v1.endpoints import auth, parts, manufacturers, suppliers, bom, risk, reports, pcn, dashboard, ai_replacements, alerts, part_mappings, identity_resolution, lifecycle, aliases

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(parts.router, prefix="/parts", tags=["parts"])
api_router.include_router(part_mappings.router, prefix="/part-mappings", tags=["part-mappings"])
api_router.include_router(identity_resolution.router, prefix="/identity-resolution", tags=["identity-resolution"])
api_router.include_router(lifecycle.router, prefix="/lifecycle", tags=["lifecycle"])
api_router.include_router(aliases.router, prefix="/aliases", tags=["aliases"])
api_router.include_router(manufacturers.router, prefix="/manufacturers", tags=["manufacturers"])
api_router.include_router(suppliers.router, prefix="/suppliers", tags=["suppliers"])
api_router.include_router(bom.router, prefix="/bom", tags=["bom"])
api_router.include_router(risk.router, prefix="/risk", tags=["risk"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
api_router.include_router(pcn.router, prefix="/pcn", tags=["pcn"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(ai_replacements.router, prefix="/replacements", tags=["ai-replacements"])
api_router.include_router(alerts.router, prefix="/alerts", tags=["alerts"])

