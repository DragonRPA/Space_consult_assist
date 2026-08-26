from fastapi import APIRouter
from app.api.v1.endpoints import counsel, visits, parts, sales, stt, employees, schedule, transfer_centers

api_router = APIRouter()
api_router.include_router(counsel.router, prefix="/counsel", tags=["counsel"])
api_router.include_router(visits.router, prefix="/visits", tags=["visits"])
api_router.include_router(parts.router, prefix="/parts", tags=["parts"])
api_router.include_router(sales.router, prefix="/sales", tags=["sales"])
api_router.include_router(stt.router, prefix="/stt", tags=["stt"])
api_router.include_router(employees.router, prefix="/employees", tags=["employees"])
api_router.include_router(schedule.router, prefix="/schedule", tags=["schedule"])
api_router.include_router(transfer_centers.router, prefix="/transfer-centers", tags=["transfer-centers"])
