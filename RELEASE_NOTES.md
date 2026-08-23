# Space Advisor — Release Notes

---

## v1.1.0.Build.1 — 2026-08-24 03:35

> **Gemini 4차 + GPT 2차 + Claude 2차 취약점 발굴 대회 전체 수정 완료판**

### 🔴 CRITICAL / HIGH 수정 (백엔드 보안·트랜잭션)

| 파일 | 수정 내용 |
|------|---------|
| `backend/app/core/security.py` | `REQUIRE_AUTH` 기본값 `false`→`true` (미설정 시 인증 활성) |
| `backend/app/core/security.py` | `get_client_ip()` 추가 — X-Forwarded-For/X-Real-IP 우선 추출로 리버스프록시 환경 레이트리밋 정확도 향상 |
| `backend/app/core/security.py` | `os` import 누락 수정 |
| `backend/app/api/v1/endpoints/counsel.py` | `fallback_llm_classification()` 내부 `db.commit()` 2곳 제거 (조기 커밋 → 상위 트랜잭션 오염 차단) |
| `backend/app/api/v1/endpoints/counsel.py` | `create_counsel` POST에 `get_current_user` 인증 의존성 추가 |
| `backend/app/api/v1/endpoints/counsel.py` | `symptoms`, `action_taken` 필드 `max_length=5000` 추가 (대용량 입력 공격 방어) |
| `backend/app/api/v1/endpoints/counsel.py` | `create_counsel` POST → `status_code=201` 명시 |
| `backend/app/api/v1/endpoints/visits.py` | `VisitStatusUpdate.status: str` → `Literal["접수","진행중","완료","취소","재방문"]` (허용값 검증) |
| `backend/app/api/v1/endpoints/visits.py` | `VisitCreate.phone` → `Field(..., pattern=r"^\d{2,3}-\d{3,4}-\d{4}$")` 전화번호 형식 검증 |
| `backend/app/api/v1/endpoints/visits.py` | `consult_id` UUID 파싱 `try-except` 추가 → 400 에러 반환 |
| `backend/app/api/v1/endpoints/stt.py` | 파일 업로드 `Content-Type` 화이트리스트 검증 추가 (415 반환) |
| `backend/app/api/v1/endpoints/stt.py` | 전사 에러 `detail=str(e)` → 일반화 메시지로 교체 (내부 정보 노출 차단) |

### 🟠 MEDIUM 수정 (인프라 + API 설계)

| 파일 | 수정 내용 |
|------|---------|
| `backend/requirements.txt` | `>=` → `==` 버전 고정 (재빌드 시 호환성 파괴 방지) |
| `backend/app/main.py` | `lifespan` context manager 추가 → DB 커넥션 풀 Graceful Shutdown |
| `backend/app/api/v1/endpoints/parts.py` | 전체 fetchall → `limit/offset` 페이지네이션 추가, 부품명 검색 파라미터 추가 |
| `docker-compose.yml` | fastapi `8000:8000` → `127.0.0.1:8000:8000`, ollama → `127.0.0.1:11434:11434` (외부 직접 접근 차단) |
| `frontend/nginx.conf` | gzip 압축, X-Frame-Options 등 보안 헤더, buffer/timeout 설정, `/api/` 프록시 블록 활성화 |
| `.env.example` | `REQUIRE_AUTH=false` 항목 추가 (SSOT 원칙 준수) |

### 🟡 프론트엔드 수정

| 파일 | 수정 내용 |
|------|---------|
| `frontend/apps/mobile/public/sw.js` | CACHE_NAME `v1`→`v2`, 캐시 항목 50개 제한, API 요청 캐싱 제외, 모든 요청 타입 fallback 처리 |
| `frontend/apps/mobile/src/App.tsx` | `usedPartsList: any[]` → `UsedPart[]` 타입 명시 |
| `frontend/apps/mobile/src/App.tsx` | `isMounted` ref 추가 → 언마운트 후 setState 방지 |
| `frontend/apps/mobile/src/App.tsx` | 출장 목록 아이템에 `tabIndex={0}`, `role="button"`, `onKeyDown` 접근성 추가 |
| `frontend/apps/mobile/src/App.tsx` | `fetchParts` → `limit=500` 파라미터 추가 (전체 부품 목록 보장) |
| `frontend/apps/desktop/src/App.tsx` | `FileReader` `onerror` 핸들러 추가 |
| `frontend/apps/desktop/src/App.tsx` | `counsel POST`에 `Authorization` 헤더 추가 (REQUIRE_AUTH=true 환경 호환) |
| `frontend/apps/desktop/src/keywordAssist.tsx` | 하이라이트 `span`에 `tabIndex={0}`, `role="button"`, `onKeyDown` 접근성 추가 |

---

## v1.0.0 (Phase 0 완료 예정)

> 기반 설계 완료

- Supabase 프로젝트 생성 및 초기 스키마 마이그레이션
- part_codes 18개 마스터 데이터 삽입
- action_script 90개 드래프트 작성
- docker-compose (FastAPI + Nginx + Ollama) 초안
- monorepo 구조 설정 (frontend/packages/desktop, mobile, common)

---
