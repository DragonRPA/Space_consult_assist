# Space Advisor — Release Notes

---

## v1.2.0.Build.3 — 2026-08-26 12:38

### ✨ UI 미세조정 및 네비게이션 개선

| 파일 | 수정 내용 |
|---|---|
| `frontend/.../src/App.tsx` | 상담 관제 메인 화면 상단 네비게이션에 `[업무 일정 ↗]` 이동 버튼 추가 (lucide-react Calendar 아이콘 적용) |
| `frontend/.../src/SchedulePage.tsx` | 캘린더 화면 좌측 사이드바 상단에 `[↖ 상담 관제로 복귀]` 이동 버튼 추가 |

---

## v1.2.0.Build.2 — 2026-08-26 12:17

### ✨ 데이터 이관 완료 및 API 추가

| 파일 / 작업 | 수정 내용 |
|---|---|
| `backend/app/api/v1/endpoints/employees.py` | `POST /` (직원 등록) 엔드포인트 신설. (이름 중복 시 기존 레코드 반환 로직 포함) |
| `DB Migration (Data)` | space-dust Firebase의 기존 임직원(11명) 및 업무 일정(312건)을 추출하여 Supabase PostgreSQL(employees, schedule_events)로 직접 INSERT 완료. 실패율 0%. |

---

## v1.2.0.Build.1 — 2026-08-26 11:30

space-dust.com 거래처 캘린더 서비스를 우리 Supabase(PostgreSQL) + FastAPI로 완전 이식.

#### DB 스키마 보완 (Alembic `a3f9d2c1e847`)

| 변경 | 내용 |
|---|---|
| [NEW] `schedule_events` | 업무 일정 핵심 테이블. 7가지 카테고리, 동적 extra/equipment_rows/attachments JSONB, consult/visit/customer FK |
| [NEW] `transfer_centers` | 이관센터 마스터 |
| [MODIFY] `visits` | display_order, process_staff, site_managers, call_done, schedule_event_id 컬럼 추가 |
| [MODIFY] `customers` | use_company_name 컬럼 추가 (사용업체·계약업체 분리) |

#### 백엔드 API

| 파일 | 내용 |
|---|---|
| `backend/app/api/v1/endpoints/schedule.py` | 업무 일정 CRUD (`GET /events`, `POST /events`, `PUT /events/{id}`, `DELETE /events/{id}`, `GET /categories`) |
| `backend/app/api/v1/endpoints/transfer_centers.py` | 이관센터 CRUD |
| `backend/app/api/v1/api.py` | schedule, transfer-centers 라우터 등록 |
| `backend/app/models/domain.py` | `ScheduleEvent`, `TransferCenter` SQLAlchemy 모델 추가 |

#### 프론트엔드

| 파일 | 내용 |
|---|---|
| `frontend/.../src/scheduleApi.ts` | 업무 일정 API 클라이언트 (TypeScript) |
| `frontend/.../src/CategorySchema.ts` | 7개 카테고리 × 탭 × 필드 동적 스키마 (space-dust CATEGORY_SCHEMAS 이식) |
| `frontend/.../src/SchedulePage.tsx` | 월/주/일 캘린더 뷰, 사이드바, 카테고리 필터 (다크 테마 #0b0f17, Pretendard) |
| `frontend/.../src/EventFormModal.tsx` | 업무 등록/수정 모달 (동적 extra 필드: chips/toggle/parts/photostatus/select 등) |
| `frontend/.../src/EventDetailModal.tsx` | 상세보기, 완료처리, 삭제 |
| `frontend/.../src/App.tsx` | `/schedule` 경로 진입 시 SchedulePage 분기 라우팅 |

#### 아키텍처 결정
- Firebase 대신 우리 Supabase(PostgreSQL JSONB)로 완전 이관
- 첨부파일은 Google Drive 대신 Cloudflare R2(drcf 버킷) 연결 예정 (v1.2.0.Build.2)
- 동선셋팅(카카오맵 경로 최적화)은 v1.2.0.Build.3에서 추가 예정
- space-dust 고객사와의 통합 방향은 추후 협의

---

## v1.1.0.Build.4 — 2026-08-24 14:49

### 🐛 버그패치

| 파일 | 수정 내용 |
|------|---------|
| `frontend/apps/desktop/src/App.tsx` | 파일 재생 시 전체 통화내용이 한번에 출력되던 문제 수정 — GPU 모드에서 `transcribe-file` 전체 전송 블록 완전 제거 |
| `frontend/apps/desktop/src/App.tsx` | GPU 모드: 파일 재생 → 스피커 출력 → WASAPI 루프백 실시간 수신 흐름으로 단일화 |
| `frontend/apps/desktop/src/App.tsx` | Web Speech 모드에서만 `startSttStreaming()` 호출하도록 분기 정리 |
| `frontend/apps/desktop/src/App.tsx` | `processAudioWithActiveEngine` useCallback deps에서 미사용 `gpuServerOnline` 제거 |

---

## v1.1.0.Build.3 — 2026-08-24 14:41

### ✨ 신규 기능

| 파일 | 수정 내용 |
|------|---------|
| `backend/app/services/wasapi_loopback_service.py` | `_silence_threshold_chunks`, `_max_speech_chunks` 인스턴스 변수화 — 런타임 동적 변경 지원 |
| `backend/app/services/wasapi_loopback_service.py` | `set_chunk_params(silence_s, max_s)` 메서드 추가 — 서버 재시작 없이 청크 파라미터 변경 |
| `backend/app/api/v1/endpoints/stt.py` | WebSocket `set_chunk` 액션 핸들러 추가 |
| `frontend/apps/desktop/src/App.tsx` | Whisper 청크 설정 UI — 무음 감지(0.1~1.5s) + 최대 청크(0.5~5.0s) select 드롭다운 |
| `frontend/apps/desktop/src/App.tsx` | Web Speech 커밋 지연 UI — 0.5~3.0s select 드롭다운 |
| `frontend/apps/desktop/src/App.tsx` | Whisper 청크 변경 시 WebSocket `set_chunk` 자동 전송 useEffect |
| `frontend/apps/desktop/src/App.tsx` | Web Speech 인터림 자동 커밋 타이머 — 침묵 감지 후 `webSpeechSilenceSecRef.current` 초 뒤 강제 커밋 |

### 🐛 버그패치

| 파일 | 수정 내용 |
|------|---------|
| `backend/.env` | `REQUIRE_AUTH=false` 추가 (미설정 시 기본값 `true`로 403 반환되던 로컬 개발 이슈 수정) |
| `backend/app/main.py` | CORS regex에 `*.vercel.app` 추가 — Vercel HTTPS 환경에서 GPU 서버 감지 CORS 오류 수정 |
| `backend/app/api/v1/endpoints/stt.py` | 할루시네이션 필터 + 연속 중복 문장 필터 추가 |
| `backend/app/services/wasapi_loopback_service.py` | 실시간 루프백 STT 할루시네이션/no_speech_prob 필터 추가 |
| `frontend/apps/desktop/src/App.tsx` | Web Speech API 경쟁 조건 수정 — `isRecording` 변화 감시 useEffect 추가로 `recognition.start()` 타이밍 보장 |

---

## v1.1.0.Build.2 — 2026-08-24 14:01

### 🐛 버그패치 / UI 미세조정

| 파일 | 수정 내용 |
|------|---------|
| `backend/app/api/v1/endpoints/counsel.py` | `from pydantic import BaseModel` → `BaseModel, Field` 추가 (서버 기동 불가 NameError 핫픽스) |
| `frontend/apps/desktop/src/App.tsx` | GPU 에이전트 모달 — 파일명만 표시되던 경로를 절대경로(`D:\...\start_backend_stt.bat`)로 복원 |
| `frontend/apps/desktop/src/App.tsx` | GPU 에이전트 모달 — 상단 설명 문구("로컬 GPU(RTX 5080)에서 무소음 40배속...") 제거 |
| `frontend/apps/desktop/src/App.tsx` | 클립보드 복사 버튼 — 파일명만 복사 → 절대경로 복사로 복원, 토스트 메시지 일치 수정 |

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
