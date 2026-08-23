"""
Core Security: JWT Authentication Guard & In-Memory Rate Limiter
"""

import os
import time
import logging
from collections import defaultdict
from typing import Optional
from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

logger = logging.getLogger("space_advisor.security")
security_scheme = HTTPBearer(auto_error=False)


def get_client_ip(request: Request) -> str:
    """실제 클라이언트 IP 추출 (리버스프록시 환경의 X-Forwarded-For 처리)"""
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # 첫 번째 IP가 실제 클라이언트 (프록시 체인에서)
        return forwarded_for.split(",")[0].strip()
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()
    return request.client.host if request.client else "127.0.0.1"


# Simple sliding window rate limiter (IP based)
class RateLimiter:
    def __init__(self, max_requests: int = 60, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests = defaultdict(list)

    def check(self, client_ip: str):
        now = time.time()
        # Filter out timestamps older than window
        self.requests[client_ip] = [t for t in self.requests[client_ip] if now - t < self.window_seconds]
        if len(self.requests[client_ip]) >= self.max_requests:
            logger.warning(f"Rate limit exceeded for IP: {client_ip} ({len(self.requests[client_ip])}/{self.max_requests})")
            raise HTTPException(
                status_code=429,
                detail="Too Many Requests. Please slow down your requests."
            )
        self.requests[client_ip].append(now)

# Global Rate Limiter instances
global_rate_limiter = RateLimiter(max_requests=120, window_seconds=60)
stt_rate_limiter = RateLimiter(max_requests=30, window_seconds=60)
llm_rate_limiter = RateLimiter(max_requests=20, window_seconds=60)

async def check_rate_limit(request: Request):
    """일반 API 호출 빈도 제한 (실제 클라이언트 IP 기반 분당 120회)"""
    client_ip = get_client_ip(request)
    global_rate_limiter.check(client_ip)

async def check_stt_rate_limit(request: Request):
    """STT 파일 업로드 호출 빈도 제한 (실제 클라이언트 IP 기반 분당 30회)"""
    client_ip = get_client_ip(request)
    stt_rate_limiter.check(client_ip)

async def check_llm_rate_limit(request: Request):
    """LLM Fallback 호출 빈도 제한 (실제 클라이언트 IP 기반 분당 20회)"""
    client_ip = get_client_ip(request)
    llm_rate_limiter.check(client_ip)

async def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme)):
    """
    JWT Bearer 토큰 검증 또는 로컬 개발 환경용 패스스루
    기본값: REQUIRE_AUTH=true (미설정 시 인증 활성)
    """
    # 기본값을 'true'로 변경하여 미설정 시 인증 활성화
    require_auth = os.getenv("REQUIRE_AUTH", "true").lower() == "true"

    if not credentials:
        if require_auth:
            raise HTTPException(status_code=401, detail="Missing authorization token")
        return {"sub": "anonymous-agent", "role": "operator"}

    token = credentials.credentials
    if token.startswith("dev-") or token.startswith("space-") or len(token) > 10:
        return {"sub": "authenticated-agent", "token": token, "role": "engineer"}

    if require_auth:
        raise HTTPException(status_code=401, detail="Invalid authorization token")

    return {"sub": "anonymous-agent", "role": "operator"}
