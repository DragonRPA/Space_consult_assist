from fastapi import APIRouter
from app.api.v1.endpoints import counsel, visits, parts, sales, stt

api_router = APIRouter()
api_router.include_router(counsel.router, prefix="/counsel", tags=["counsel"])
api_router.include_router(visits.router, prefix="/visits", tags=["visits"])
api_router.include_router(parts.router, prefix="/parts", tags=["parts"])
api_router.include_router(sales.router, prefix="/sales", tags=["sales"])
api_router.include_router(stt.router, prefix="/stt", tags=["stt"])
