import sys
import asyncio
import logging
from contextlib import asynccontextmanager
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import get_settings

logger = logging.getLogger("space_advisor.main")
settings = get_settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI lifespan: 앱 시작/종료 시 리소스 관리 (Graceful Shutdown)"""
    logger.info("🚀 Space Advisor API 시작")
    yield
    # 종료 시 리소스 정리
    logger.info("🛑 Space Advisor API 종료 중...")
    # httpx 클라이언트 풀 정리 (필요 시 전역 클라이언트 close)
    # DB 엔진은 SQLAlchemy AsyncEngine이 자동 정리하지만 명시적 처리
    try:
        from app.core.database import engine
        await engine.dispose()
        logger.info("✅ DB 커넥션 풀 정리 완료")
    except Exception as e:
        logger.warning(f"DB dispose 중 오류: {e}")
    logger.info("✅ Space Advisor API 종료 완료")

app = FastAPI(title="Space Advisor API", version="1.0.0", lifespan=lifespan)

from app.api.v1.api import api_router
app.include_router(api_router, prefix="/api/v1")

# CORS setup
origins = [origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()]
if not origins:
    origins = ["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173", "http://127.0.0.1:5174"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$|^https://[a-z0-9-]+\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "Space Advisor Backend", "env": settings.app_env}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

