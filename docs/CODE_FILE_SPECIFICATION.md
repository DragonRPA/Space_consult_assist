# Space Consult Assist 코드 파일 목록 및 기능 명세서 (SSOT)

> 본 문서는 전사 개발 표준 헌장 **1.5조**, **3.1조**, **카테고리 XV**에 따라 결정론적 AST 분석 엔진(`scripts/generate_code_file_spec.cjs`, `scripts/extract_python_ast.py`)으로 생성·검증된 단일 진실의 원천(SSOT)이다.
> 정량 메타데이터(`code_file_manifest.json`)와 100% 동기화되며, 무수식어 건조한 명사·동사 표준으로 전 파일의 역할·의존성·최적화 지표를 관리한다.

## 1. 아키텍처 개요 및 계층별 목차

- **총 관리 대상 코드·설정 파일 수**: 355개
- **총 코드 라인 / 용량**: 78,138줄 / 5,629.1 KB
- **의존성 매니페스트**: [code_file_manifest.json](file:///d:/01.AntiGravity/Space_consult_assist/docs/code_file_manifest.json)
- **명세 동기화·검증·영향도 조회 명령**: `npm --prefix frontend run spec:sync` / `npm --prefix frontend run spec:verify` / `npm --prefix frontend run spec:query -- <검색어>`

| 구분 / 계층 ID | 계층명 | 파일 수 | 총 라인 수 | 총 용량 (KB) | 문서 라인 범위 |
| :---: | :--- | :---: | :---: | :---: | :---: |
| `SEC-2` | 코드 구조 최적화 레이더 (헌장 15.3조) | - | - | - | L29~L85 |
| `L01` | 프론트엔드 모노레포 인프라 및 Vercel Serverless API | 7 | 1,403 | 50.2 | L88~L145 |
| `L02` | 데스크톱 상담·일정 웹 애플리케이션 | 61 | 31,267 | 1,277.1 | L146~L635 |
| `L03` | 모바일 현장정비 PWA 애플리케이션 | 12 | 1,130 | 41.5 | L636~L733 |
| `L04` | 백엔드 FastAPI 코어·ORM 모델·API 라우터 | 25 | 4,836 | 221.4 | L734~L935 |
| `L05` | 백엔드 비즈니스 서비스 및 공급자 계층 | 26 | 2,733 | 108.9 | L936~L1145 |
| `L06` | 데이터베이스 마이그레이션 및 스키마·시드 SQL | 22 | 13,561 | 2,915.4 | L1146~L1323 |
| `L07` | 백엔드 운영·데이터 파이프라인·UI 감사 스크립트 | 70 | 6,989 | 341.9 | L1324~L1885 |
| `L08` | 백엔드 단위·통합·E2E 테스트 | 7 | 413 | 15.1 | L1886~L1943 |
| `L09` | 데스크톱 배치 STT·LLM 파서 도구 (ConsultParser) | 21 | 5,006 | 220.8 | L1944~L2113 |
| `L10` | AWS 세종텔레콤 비즈메시지 프로토타입 | 3 | 260 | 9.5 | L2114~L2139 |
| `L11` | SLM·STT 학습·평가 및 코드 명세 거버넌스 스크립트 | 56 | 7,921 | 319.2 | L2140~L2589 |
| `L12` | CI/CD·컨테이너 인프라·루트 검증 및 진단 스크립트 | 45 | 2,619 | 108.1 | L2590~L2951 |

## 2. 코드 구조 최적화 레이더 (헌장 15.3조 5대 기준)

| 지표 코드 | 판정 기준 | 검출 건수 | 대상 요약 |
| :--- | :--- | :---: | :--- |
| `GOD_FILE` | 비시드 코드 1,500줄 이상 또는 80KB 초과 | 0 | - |
| `SQL_BULK_SEED` | 대용량 적재 SQL (1,500줄 이상 또는 80KB 초과) | 8 | `backend/scripts/seed_symptom_rules_1.sql`, `backend/scripts/seed_symptom_rules_2.sql`, `backend/scripts/seed_symptom_rules_3.sql`, `backend/scripts/seed_symptom_rules_4.sql`, `backend/scripts/seed_symptom_rules_5.sql`, `backend/scripts/seed_symptom_rules_6.sql`, `backend/scripts/seed_symptom_synonyms_from_txt.sql`, `scratch/supabase_data_injection.sql` |
| `EAGER_ROUTE_IMPORT` | React.lazy 미적용 정적 라우트·모달 import 컨테이너 | 0 | - |
| `HIGH_COUPLING_HUB` | 역방향 피참조 Fan-In 8 이상 허브 모듈 | 7 | `backend/app/core/config.py`, `backend/app/core/database.py`, `backend/app/services/ai/base.py`, `frontend/apps/desktop/src/counselShared.ts`, `frontend/apps/desktop/src/keywordRegistryData.ts`, `frontend/apps/desktop/src/store.ts`, `tools/ConsultParser/core/stt_engine.py` |
| `CIRCULAR_IMPORT` | 상호 순환 참조 사이클 포함 모듈 | 0 | - |
| `ORPHAN_CANDIDATE` | 미참조 모듈·백업 파일 (Fan-In = 0) | 0 | - |

### 2.1 비대 모듈 (`GOD_FILE`) 분할 대상

| 파일 경로 | 계층 | 라인 수 | 용량 (KB) | Fan-In | 최적화 권고 |
| :--- | :---: | :---: | :---: | :---: | :--- |

### 2.2 정적 라우트·모달 로드 (`EAGER_ROUTE_IMPORT`) 코드 분할 대상

| 컨테이너 파일 | 정적 import 컴포넌트 수 | 대상 컴포넌트 목록 |
| :--- | :---: | :--- |

### 2.3 고결합 허브 (`HIGH_COUPLING_HUB`, Fan-In >= 8 및 주요 피참조 모듈 Fan-In >= 4)

| 파일 경로 | 계층 | Fan-In | 시그널 | 주요 호출부 상위 목록 |
| :--- | :---: | :---: | :--- | :--- |
| `frontend/apps/desktop/src/counselShared.ts` | L02 | 11 | `HIGH_COUPLING_HUB` | `frontend/apps/desktop/src/CounselAssistV2.tsx`, `frontend/apps/desktop/src/CounselAssistV3.tsx`, `frontend/apps/desktop/src/CounselAssistV3Parts.tsx`, `frontend/apps/desktop/src/CounselV2LeftPane.tsx`, `frontend/apps/desktop/src/CounselV2RightStudio.tsx`, `frontend/apps/desktop/src/CounselV2SessionDialogs.tsx` 외 5건 |
| `backend/app/core/database.py` | L04 | 10 | `HIGH_COUPLING_HUB` | `backend/app/api/v1/endpoints/counsel.py`, `backend/app/api/v1/endpoints/employees.py`, `backend/app/api/v1/endpoints/parts.py`, `backend/app/api/v1/endpoints/sales.py`, `backend/app/api/v1/endpoints/schedule.py`, `backend/app/api/v1/endpoints/transfer_centers.py` 외 4건 |
| `frontend/apps/desktop/src/keywordRegistryData.ts` | L02 | 10 | `HIGH_COUPLING_HUB` | `frontend/apps/desktop/src/ConsultWrapupModal.tsx`, `frontend/apps/desktop/src/LegacySttTopAndLeftPane.tsx`, `frontend/apps/desktop/src/LegacySttTranscriptPane.tsx`, `frontend/apps/desktop/src/LegacySttView.tsx`, `frontend/apps/desktop/src/counselShared.ts`, `frontend/apps/desktop/src/keywordAssist.tsx` 외 4건 |
| `tools/ConsultParser/core/stt_engine.py` | L09 | 9 | `HIGH_COUPLING_HUB` | `scripts/diagnose_winerror206.py`, `scripts/test_chunk_length.py`, `scripts/test_chunk_success.py`, `scripts/test_consult_parser_stt.py`, `scripts/test_error_m4a_files.py`, `scripts/test_m4a_ffmpeg.py` 외 3건 |
| `backend/app/core/config.py` | L04 | 8 | `HIGH_COUPLING_HUB` | `backend/app/main.py`, `backend/app/services/ai/__init__.py`, `backend/app/services/clova_grpc_service.py`, `backend/app/services/counsel_kb_service.py`, `backend/app/services/messaging/__init__.py`, `backend/app/services/notification.py` 외 2건 |
| `backend/app/services/ai/base.py` | L05 | 8 | `HIGH_COUPLING_HUB` | `backend/app/services/ai/__init__.py`, `backend/app/services/ai/llm_groq.py`, `backend/app/services/ai/llm_ollama.py`, `backend/app/services/ai/llm_openai.py`, `backend/app/services/ai/stt_groq.py`, `backend/app/services/ai/stt_mock.py` 외 2건 |
| `frontend/apps/desktop/src/store.ts` | L02 | 8 | `HIGH_COUPLING_HUB` | `frontend/apps/desktop/src/ConsultWrapupModal.tsx`, `frontend/apps/desktop/src/LegacySttGuidanceAndDialogs.tsx`, `frontend/apps/desktop/src/LegacySttTopAndLeftPane.tsx`, `frontend/apps/desktop/src/LegacySttTranscriptPane.tsx`, `frontend/apps/desktop/src/LegacySttView.tsx`, `frontend/apps/desktop/src/sttArchiveSync.ts` 외 2건 |
| `frontend/apps/desktop/src/contextCorrector.ts` | L02 | 7 | - | `frontend/apps/desktop/src/CounselAssistV2.tsx`, `frontend/apps/desktop/src/LegacySttView.tsx`, `frontend/apps/desktop/src/counselShared.ts`, `frontend/apps/desktop/src/keywordExtractors.ts`, `frontend/apps/desktop/src/omniQueryParser.ts`, `frontend/apps/desktop/src/store.ts` 외 1건 |
| `frontend/apps/desktop/src/dispatchDocTypes.ts` | L02 | 7 | - | `frontend/apps/desktop/src/CounselAssistV2.tsx`, `frontend/apps/desktop/src/CounselAssistV3.tsx`, `frontend/apps/desktop/src/CounselV2LeftPane.tsx`, `frontend/apps/desktop/src/CounselV2SessionDialogs.tsx`, `frontend/apps/desktop/src/DispatchDocPackageModal.tsx`, `frontend/apps/desktop/src/counselShared.ts` 외 1건 |
| `frontend/apps/desktop/src/keywordExtractors.ts` | L02 | 6 | - | `frontend/apps/desktop/src/CounselAssistV2.tsx`, `frontend/apps/desktop/src/LegacySttTranscriptPane.tsx`, `frontend/apps/desktop/src/LegacySttView.tsx`, `frontend/apps/desktop/src/counselShared.ts`, `frontend/apps/desktop/src/keywordAssist.tsx`, `frontend/apps/desktop/src/omniQueryParser.ts` |
| `frontend/apps/desktop/src/scheduleApi.ts` | L02 | 6 | - | `frontend/apps/desktop/src/ConsultWrapupModal.tsx`, `frontend/apps/desktop/src/EventDetailModal.tsx`, `frontend/apps/desktop/src/EventFormModal.tsx`, `frontend/apps/desktop/src/SchedulePage.tsx`, `frontend/apps/desktop/src/consultWrapupTypes.ts`, `frontend/apps/desktop/src/sttArchiveSync.ts` |
| `frontend/apps/desktop/src/supabaseClient.ts` | L02 | 6 | - | `frontend/apps/desktop/src/SttArchiveModal.tsx`, `frontend/apps/desktop/src/equipmentManualsApi.ts`, `frontend/apps/desktop/src/partsCatalogApi.ts`, `frontend/apps/desktop/src/scheduleApi.ts`, `frontend/apps/desktop/src/sttArchiveSync.ts`, `frontend/apps/desktop/src/symptomPhotoApi.ts` |
| `tools/ConsultParser/core/ollama_client.py` | L09 | 6 | - | `scripts/test_consult_parser_llm.py`, `scripts/test_prompt_bias.py`, `scripts/verify_explicit_paths_and_slm.py`, `tools/ConsultParser/ui/process_worker.py`, `tools/ConsultParser/ui/tab_process.py`, `tools/ConsultParser/ui/tab_settings.py` |
| `backend/app/core/secret_vault.py` | L04 | 5 | - | `backend/app/api/v1/endpoints/stt.py`, `backend/app/core/config.py`, `backend/app/main.py`, `backend/app/services/clova_grpc_service.py`, `backend/scripts/verify_vault_security.py` |
| `backend/app/main.py` | L04 | 5 | - | `.github/workflows/deploy.yml`, `backend/run_server.py`, `backend/scripts/run_wtt_tests.py`, `backend/tests/test_telecom_api.py`, `start_backend_stt.bat` |
| `frontend/apps/desktop/src/modelErrorCodesData.ts` | L02 | 5 | - | `frontend/apps/desktop/src/CounselAssistV2.tsx`, `frontend/apps/desktop/src/CounselAssistV3.tsx`, `frontend/apps/desktop/src/CounselV2RightStudio.tsx`, `frontend/apps/desktop/src/CounselV3Workspace.tsx`, `frontend/apps/desktop/src/omniQueryParser.ts` |
| `frontend/apps/desktop/src/sttAudioDsp.ts` | L02 | 5 | - | `frontend/apps/desktop/src/LegacySttGuidanceAndDialogs.tsx`, `frontend/apps/desktop/src/LegacySttTopAndLeftPane.tsx`, `frontend/apps/desktop/src/LegacySttTranscriptPane.tsx`, `frontend/apps/desktop/src/LegacySttView.tsx`, `frontend/apps/desktop/src/useRealtimeSttCapture.ts` |
| `tools/ConsultParser/core/config_manager.py` | L09 | 5 | - | `scripts/test_consult_parser_llm.py`, `scripts/test_prompt_bias.py`, `scripts/verify_explicit_paths_and_slm.py`, `tools/ConsultParser/ui/tab_process.py`, `tools/ConsultParser/ui/tab_settings.py` |
| `backend/app/services/messaging/base.py` | L05 | 4 | - | `backend/app/services/messaging/__init__.py`, `backend/app/services/messaging/aligo.py`, `backend/app/services/messaging/mock.py`, `backend/app/services/messaging/sejong.py` |
| `frontend/apps/desktop/src/PartsOrderQuotationModal.tsx` | L02 | 4 | - | `frontend/apps/desktop/src/CounselAssistV2.tsx`, `frontend/apps/desktop/src/CounselAssistV3.tsx`, `frontend/apps/desktop/src/LegacySttView.tsx`, `frontend/apps/desktop/src/SelfActionGuideModal.tsx` |
| `frontend/apps/desktop/src/SelfActionGuideModal.tsx` | L02 | 4 | - | `frontend/apps/desktop/src/CounselAssistV2.tsx`, `frontend/apps/desktop/src/CounselAssistV3.tsx`, `frontend/apps/desktop/src/CounselV2RightStudio.tsx`, `frontend/apps/desktop/src/LegacySttView.tsx` |
| `frontend/apps/desktop/src/modelCatalogVisuals.ts` | L02 | 4 | - | `frontend/apps/desktop/src/DispatchDocPackageModal.tsx`, `frontend/apps/desktop/src/EquipmentManualModal.tsx`, `frontend/apps/desktop/src/PartsOrderQuotationModal.tsx`, `frontend/apps/desktop/src/SelfActionGuideModal.tsx` |
| `frontend/apps/desktop/src/modelSpecsData.ts` | L02 | 4 | - | `frontend/apps/desktop/src/CounselAssistV2.tsx`, `frontend/apps/desktop/src/CounselAssistV3.tsx`, `frontend/apps/desktop/src/CounselV2LeftPane.tsx`, `frontend/apps/desktop/src/CounselV3Workspace.tsx` |
| `tools/ConsultParser/ui/widgets.py` | L09 | 4 | - | `tools/ConsultParser/ui/main_window.py`, `tools/ConsultParser/ui/process_worker.py`, `tools/ConsultParser/ui/tab_process.py`, `tools/ConsultParser/ui/tab_settings.py` |

### 2.4 순환 참조 (`CIRCULAR_IMPORT`) 및 미참조 후보 (`ORPHAN_CANDIDATE`)

- **검출된 순환 참조 사이클**: 없음 (0건)

| 미참조 후보 경로 | 계층 | 구분 | 규모 | 기능 요약 |
| :--- | :---: | :---: | :---: | :--- |

## 3. 계층별 전체 코드 파일 기능 명세 (6대 필수 스키마)

### L01. 프론트엔드 모노레포 인프라 및 Vercel Serverless API (7개)

#### `frontend/api/clova-chunk.js`
- **규모 / 구분**: 580줄 / 19.4 KB (entrypoint)
- **계층 / Menu ID / 대칭 쌍**: `L01` / `POST /api/clova-chunk (stt-legacy)` / -
- **주요 Export 심볼**: `module.exports (handler)`
- **정·역방향 의존성**: Out(0): - | In(1): `frontend/vercel.json`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `NAVER CLOVA Speech gRPC (clovaspeech-gw.ncloud.com:50051)`, `Node.js http2`
- **핵심 기능 명세**: Base64 PCM/WAV 오디오 청크를 16kHz 기준으로 분할하고 HTTP/2 gRPC 프레임으로 인코딩해 네이버 클로바 서버에 전송 후 전사 결과 반환

#### `frontend/api/consult-wrapup.js`
- **규모 / 구분**: 432줄 / 18.8 KB (entrypoint)
- **계층 / Menu ID / 대칭 쌍**: `L01` / `POST /api/consult-wrapup (stt-legacy)` / -
- **주요 Export 심볼**: `default handler`
- **정·역방향 의존성**: Out(0): - | In(1): `frontend/vercel.json`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Groq Chat Completions API`, `OpenAI Chat Completions API`
- **핵심 기능 명세**: 통화 녹취록·감지 키워드·고객 정보·체크리스트 기반 상담 3줄 요약 및 5대 결론 유형 JSON 생성과 규칙 기반 폴백 반환

#### `frontend/api/groq-stt-chunk.js`
- **규모 / 구분**: 236줄 / 7.8 KB (entrypoint)
- **계층 / Menu ID / 대칭 쌍**: `L01` / `POST /api/groq-stt-chunk (stt-legacy)` / -
- **주요 Export 심볼**: `default handler`
- **정·역방향 의존성**: Out(0): - | In(1): `frontend/vercel.json`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Groq Audio Transcriptions API (whisper-large-v3-turbo / whisper-large-v3)`
- **핵심 기능 명세**: Base64 WAV 오디오 청크를 멀티파트 폼으로 변환해 Groq Whisper API 전사 요청 및 무음 환각·프롬프트 에코 필터링 반환

#### `frontend/build_monorepo.js`
- **규모 / 구분**: 49줄 / 1.4 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L01` / `build-pipeline` / -
- **주요 Export 심볼**: -
- **정·역방향 의존성**: Out(0): - | In(1): `frontend/package.json`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Node.js fs/path`
- **핵심 기능 명세**: 데스크톱 빌드 산출물을 통합 dist 루트로 복사하고 모바일 빌드 산출물을 dist/mobile 하위 디렉터리로 병합

#### `frontend/nginx.conf`
- **규모 / 구분**: 48줄 / 1.4 KB (config)
- **계층 / Menu ID / 대칭 쌍**: `L01` / `/ | /mobile | /api/` / -
- **주요 Export 심볼**: `location /api/`, `location /mobile`, `location /`
- **정·역방향 의존성**: Out(0): - | In(1): `docker-compose.yml`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Nginx`, `FastAPI upstream`
- **핵심 기능 명세**: 컨테이너 배포용 Gzip 압축, 보안 헤더 부여, 데스크톱·모바일 SPA 폴백 라우팅 및 /api 역프록시 설정

#### `frontend/package.json`
- **규모 / 구분**: 23줄 / 0.8 KB (config)
- **계층 / Menu ID / 대칭 쌍**: `L01` / `monorepo-root` / -
- **주요 Export 심볼**: `script:dev:desktop`, `script:dev:mobile`, `script:build:desktop`, `script:build:mobile`, `script:build`, `script:purge:vercel`, `script:spec:sync`, `script:spec:verify`, `script:spec:query`
- **정·역방향 의존성**: Out(3): `frontend/build_monorepo.js`, `scripts/auto_purge_vercel.cjs`, `scripts/generate_code_file_spec.cjs` | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `lucide-react`, `zustand`
- **핵심 기능 명세**: 데스크톱 및 모바일 워크스페이스 공통 의존성과 통합 빌드·Vercel 배포 정리 스크립트 정의

#### `frontend/vercel.json`
- **규모 / 구분**: 35줄 / 0.6 KB (config)
- **계층 / Menu ID / 대칭 쌍**: `L01` / `/api/* | /mobile/* | /*` / -
- **주요 Export 심볼**: `api/clova-chunk.js`, `api/groq-stt-chunk.js`, `api/consult-wrapup.js`
- **정·역방향 의존성**: Out(3): `frontend/api/clova-chunk.js`, `frontend/api/consult-wrapup.js`, `frontend/api/groq-stt-chunk.js` | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Vercel (icn1)`
- **핵심 기능 명세**: Vercel 서울 리전 지정, 서버리스 함수 실행 제한시간 설정 및 데스크톱·모바일·API 경로 리라이트 규칙 정의

### L02. 데스크톱 상담·일정 웹 애플리케이션 (61개)

#### `frontend/apps/desktop/.oxlintrc.json`
- **규모 / 구분**: 9줄 / 0.2 KB (config)
- **계층 / Menu ID / 대칭 쌍**: `L02` / `desktop-lint` / `frontend/apps/mobile/.oxlintrc.json`
- **주요 Export 심볼**: `$schema`, `plugins`, `rules`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `oxlint`
- **핵심 기능 명세**: 데스크톱 소스코드 대상 React Hooks 의존성 및 Fast Refresh export 정적 린트 규칙 설정

#### `frontend/apps/desktop/index.html`
- **규모 / 구분**: 14줄 / 0.4 KB (entrypoint)
- **계층 / Menu ID / 대칭 쌍**: `L02` / `/` / `frontend/apps/mobile/index.html`
- **주요 Export 심볼**: -
- **정·역방향 의존성**: Out(1): `frontend/apps/desktop/src/main.tsx` | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: 데스크톱 웹 애플리케이션 DOM 마운트 루트(#root) 및 문서 메타데이터 정의

#### `frontend/apps/desktop/package.json`
- **규모 / 구분**: 27줄 / 0.6 KB (config)
- **계층 / Menu ID / 대칭 쌍**: `L02` / `desktop-pkg` / `frontend/apps/mobile/package.json`
- **주요 Export 심볼**: `script:dev`, `script:build`, `script:lint`, `script:preview`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `@supabase/supabase-js`, `react`, `vite`
- **핵심 기능 명세**: 데스크톱 애플리케이션 의존성 패키지 및 개발·빌드·정적검사 스크립트 정의

#### `frontend/apps/desktop/src/App.tsx`
- **규모 / 구분**: 59줄 / 2.3 KB (entrypoint)
- **계층 / Menu ID / 대칭 쌍**: `L02` / `router (/, /stt, /counsel3, /counsel-compare, /schedule)` / `frontend/apps/mobile/src/App.tsx`
- **주요 Export 심볼**: `default App`
- **정·역방향 의존성**: Out(7): `frontend/apps/desktop/src/CounselAssistV2.tsx`, `frontend/apps/desktop/src/CounselAssistV3.tsx`, `frontend/apps/desktop/src/CounselCompare.tsx`, `frontend/apps/desktop/src/GlobalNav.tsx`, `frontend/apps/desktop/src/LegacySttView.tsx`, `frontend/apps/desktop/src/SchedulePage.tsx`, `frontend/apps/desktop/src/index.css` | In(1): `frontend/apps/desktop/src/main.tsx`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `React.lazy / Suspense`
- **핵심 기능 명세**: URL 경로와 상단 탭 상태를 동기화하고 5개 데스크톱 화면 모듈을 지연 로딩으로 분기 렌더링

#### `frontend/apps/desktop/src/CategorySchema.ts`
- **규모 / 구분**: 243줄 / 11.5 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L02` / `schedule (/schedule schema)` / -
- **주요 Export 심볼**: `FieldType`, `FieldDef`, `TabDef`, `CategorySchema`, `WORKTYPE_OPTIONS`, `CATEGORY_SCHEMAS`, `getAllFields`
- **정·역방향 의존성**: Out(0): - | In(2): `frontend/apps/desktop/src/EventDetailModal.tsx`, `frontend/apps/desktop/src/EventFormModal.tsx`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: 8대 일정 카테고리별 세부 업무유형 목록과 extra JSONB 동적 입력 필드·탭 구조 정의

#### `frontend/apps/desktop/src/ConsultWrapupModal.tsx`
- **규모 / 구분**: 1037줄 / 35.6 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L02` / `stt-legacy (/stt modal)` / `frontend/apps/mobile/src/App.tsx`
- **주요 Export 심볼**: `ConsultWrapupModal`, `default`
- **정·역방향 의존성**: Out(6): `frontend/apps/desktop/src/ConsultWrapupOutcomeCard.tsx`, `frontend/apps/desktop/src/consultWrapupTypes.ts`, `frontend/apps/desktop/src/keywordRegistryData.ts`, `frontend/apps/desktop/src/scheduleApi.ts`, `frontend/apps/desktop/src/store.ts`, `frontend/apps/desktop/src/sttArchiveSync.ts` | In(1): `frontend/apps/desktop/src/LegacySttView.tsx`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `POST /api/consult-wrapup`
- **핵심 기능 명세**: 통화 자막과 감지 키워드를 API로 전송해 도출된 5대 결론 카드를 선택·편집하고 sttArchiveSync를 통해 DB 테이블에 일괄 저장

#### `frontend/apps/desktop/src/ConsultWrapupOutcomeCard.tsx`
- **규모 / 구분**: 481줄 / 19.5 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L02` / `stt-legacy (/stt modal card)` / -
- **주요 Export 심볼**: `WrapupOutcomeCardProps`, `WrapupOutcomeCard`
- **정·역방향 의존성**: Out(1): `frontend/apps/desktop/src/consultWrapupTypes.ts` | In(1): `frontend/apps/desktop/src/ConsultWrapupModal.tsx`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `lucide-react`
- **핵심 기능 명세**: 상담 결론 선택 모달의 개별 결론 카드 체크 상태, 결론 유형 전환, 요약·담당자·일시 인라인 편집 UI 렌더링

#### `frontend/apps/desktop/src/CounselAssistV2.tsx`
- **규모 / 구분**: 1056줄 / 44.5 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L02` / `counsel-v2 (/, 상담지원2)` / `frontend/apps/mobile/src/App.tsx`
- **주요 Export 심볼**: `default CounselAssistV2`
- **정·역방향 의존성**: Out(15): `frontend/apps/desktop/src/CounselV2LeftPane.tsx`, `frontend/apps/desktop/src/CounselV2RightStudio.tsx`, `frontend/apps/desktop/src/CounselV2SessionDialogs.tsx`, `frontend/apps/desktop/src/DispatchDocPackageModal.tsx`, `frontend/apps/desktop/src/EquipmentManualModal.tsx`, `frontend/apps/desktop/src/PartsOrderQuotationModal.tsx`, `frontend/apps/desktop/src/SelfActionGuideModal.tsx`, `frontend/apps/desktop/src/contextCorrector.ts`, `frontend/apps/desktop/src/counselShared.ts`, `frontend/apps/desktop/src/counselV2Persistence.ts` 외 5건 | In(1): `frontend/apps/desktop/src/App.tsx`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `FastAPI (/api/v1/counsel/*, /api/v1/schedule/customers)`, `localStorage`
- **핵심 기능 명세**: 상담지원2 컨테이너 화면으로 고객 조회, 복수 증상·에러코드 진단 상태, counselV2Persistence 저장 연동 및 좌우 패널·지연 로딩 모달 조립 수행

#### `frontend/apps/desktop/src/CounselAssistV3.tsx`
- **규모 / 구분**: 1191줄 / 49.4 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L02` / `counsel-v3 (/counsel3, 상담지원3)` / -
- **주요 Export 심볼**: `default CounselAssistV3`
- **정·역방향 의존성**: Out(12): `frontend/apps/desktop/src/CounselAssistV3Parts.tsx`, `frontend/apps/desktop/src/CounselV3Workspace.tsx`, `frontend/apps/desktop/src/DispatchDocPackageModal.tsx`, `frontend/apps/desktop/src/EquipmentManualModal.tsx`, `frontend/apps/desktop/src/PartsOrderQuotationModal.tsx`, `frontend/apps/desktop/src/SelfActionGuideModal.tsx`, `frontend/apps/desktop/src/counselShared.ts`, `frontend/apps/desktop/src/dispatchDocTypes.ts`, `frontend/apps/desktop/src/manualKnowledgeData.ts`, `frontend/apps/desktop/src/modelErrorCodesData.ts` 외 2건 | In(1): `frontend/apps/desktop/src/App.tsx`
- **접근 DB 테이블 · 외부 연동**: DB: `space_advisor_history_records_v2`, `space_advisor_pending_sessions_v2` | 외부: `FastAPI (/api/v1/counsel/model-symptoms)`, `localStorage`
- **핵심 기능 명세**: 상담지원3 컨테이너 화면으로 초기 통합 검색창과 도킹 검색 바 전환, 증상 세션·대기·이력 상태 관리, omniQueryParser 실행 매칭 및 워크스페이스·지연 로딩 모달 조합 수행

#### `frontend/apps/desktop/src/CounselAssistV3Parts.tsx`
- **규모 / 구분**: 391줄 / 13 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L02` / `counsel-v3 (/counsel3 subviews)` / -
- **주요 Export 심볼**: `OmniSuggestDropdown`, `SimpleSessionListModal`
- **정·역방향 의존성**: Out(2): `frontend/apps/desktop/src/counselShared.ts`, `frontend/apps/desktop/src/omniQueryParser.ts` | In(1): `frontend/apps/desktop/src/CounselAssistV3.tsx`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `lucide-react`
- **핵심 기능 명세**: 상담지원3 기종 선택 드롭다운, 통합검색 자동완성 메뉴 및 대기·이력 목록 모달 UI 컴포넌트 제공

#### `frontend/apps/desktop/src/CounselCompare.tsx`
- **규모 / 구분**: 241줄 / 13.8 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L02` / `counsel-compare (/counsel-compare, 임베딩 모델비교)` / -
- **주요 Export 심볼**: `default CounselCompare`
- **정·역방향 의존성**: Out(0): - | In(1): `frontend/apps/desktop/src/App.tsx`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `FastAPI (/api/v1/counsel/kb-compare, /knowledge/{id}/exclude)`
- **핵심 기능 명세**: 증상 질의문에 대한 로컬 bge-m3와 OpenAI text-embedding-3-small 검색 결과 및 소요시간을 좌우 2열로 대조 표시하고 지식 항목 제외 처리 수행

#### `frontend/apps/desktop/src/CounselV2LeftPane.tsx`
- **규모 / 구분**: 886줄 / 37.7 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L02` / `counsel-v2 (/, subtoolbar+left-pane)` / -
- **주요 Export 심볼**: `CounselV2SubToolbarProps`, `CounselV2SubToolbar`, `CounselV2LeftPaneProps`, `CounselV2LeftPane`
- **정·역방향 의존성**: Out(3): `frontend/apps/desktop/src/counselShared.ts`, `frontend/apps/desktop/src/dispatchDocTypes.ts`, `frontend/apps/desktop/src/modelSpecsData.ts` | In(1): `frontend/apps/desktop/src/CounselAssistV2.tsx`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `lucide-react`
- **핵심 기능 명세**: 상담지원2 상단 서브툴바(CounselV2SubToolbar) 및 좌측 패널(모델 선택, 고객 조회, 2트랙 연락처, 대기 상담 배너, 16대 표준 증상 필터) 렌더링

#### `frontend/apps/desktop/src/CounselV2RightStudio.tsx`
- **규모 / 구분**: 1246줄 / 57.9 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L02` / `counsel-v2 (/, right-studio)` / -
- **주요 Export 심볼**: `CounselV2RightStudioProps`, `CounselV2RightStudio`
- **정·역방향 의존성**: Out(3): `frontend/apps/desktop/src/SelfActionGuideModal.tsx`, `frontend/apps/desktop/src/counselShared.ts`, `frontend/apps/desktop/src/modelErrorCodesData.ts` | In(1): `frontend/apps/desktop/src/CounselAssistV2.tsx`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `lucide-react`
- **핵심 기능 명세**: 상담지원2 우측 진단 스튜디오(복수 증상 탭, 4단계 파이프라인 스테퍼, 계기판 에러코드 칩 콘솔, 단계 판정 카드, 하단 종결 바) 렌더링

#### `frontend/apps/desktop/src/CounselV2SessionDialogs.tsx`
- **규모 / 구분**: 772줄 / 34.6 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L02` / `counsel-v2 (/, dialogs)` / -
- **주요 Export 심볼**: `CounselV2SessionDialogsProps`, `default CounselV2SessionDialogs`
- **정·역방향 의존성**: Out(2): `frontend/apps/desktop/src/counselShared.ts`, `frontend/apps/desktop/src/dispatchDocTypes.ts` | In(1): `frontend/apps/desktop/src/CounselAssistV2.tsx`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `lucide-react`
- **핵심 기능 명세**: 상담지원2 지연 로딩 모달 묶음으로 진행중 상담 대기열 검색·복원·삭제 및 상담 이력 상세 감사 조회 UI 렌더링

#### `frontend/apps/desktop/src/CounselV3Workspace.tsx`
- **규모 / 구분**: 856줄 / 31 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L02` / `counsel-v3 (/counsel3 workspace)` / -
- **주요 Export 심볼**: `SmartReturnDescriptor`, `CounselV3WorkspaceProps`, `CounselV3Workspace`
- **정·역방향 의존성**: Out(3): `frontend/apps/desktop/src/counselShared.ts`, `frontend/apps/desktop/src/modelErrorCodesData.ts`, `frontend/apps/desktop/src/modelSpecsData.ts` | In(1): `frontend/apps/desktop/src/CounselAssistV3.tsx`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `lucide-react`
- **핵심 기능 명세**: 상담지원3 점진적 전개 본문으로 좌측 고객·장비 컨텍스트 카드와 우측 진단 스크립트·에러코드 칩·단계 점검·문서 발송 바 렌더링

#### `frontend/apps/desktop/src/DispatchDocPackageModal.tsx`
- **규모 / 구분**: 1095줄 / 42.5 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L02` / `counsel-modal (dispatch-docs)` / `frontend/apps/mobile/src/App.tsx`
- **주요 Export 심볼**: `SelfActionEvidenceItem`, `EstimatePartItem`, `DispatchDoc1st`, `DispatchDoc2nd`, `DispatchChannelType`, `DispatchDocPackageModal`, `default`
- **정·역방향 의존성**: Out(2): `frontend/apps/desktop/src/dispatchDocTypes.ts`, `frontend/apps/desktop/src/modelCatalogVisuals.ts` | In(3): `frontend/apps/desktop/src/CounselAssistV2.tsx`, `frontend/apps/desktop/src/CounselAssistV3.tsx`, `frontend/apps/desktop/src/LegacySttView.tsx`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Clipboard API`, `window.print`
- **핵심 기능 명세**: dispatchDocTypes 기반 1차 출장 접수증(방문 일정·기사·자가점검 증빙)과 2차 수리 견적서(부품·기술료·출장비·부가세 합계) 탭 분리 편집 및 인쇄·복사·발송 처리

#### `frontend/apps/desktop/src/EquipmentManualModal.tsx`
- **규모 / 구분**: 1265줄 / 46.2 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L02` / `counsel-modal (equipment-manual)` / -
- **주요 Export 심볼**: `EquipmentManualModalProps`, `EquipmentManualModal`, `default`
- **정·역방향 의존성**: Out(2): `frontend/apps/desktop/src/equipmentManualsApi.ts`, `frontend/apps/desktop/src/modelCatalogVisuals.ts` | In(3): `frontend/apps/desktop/src/CounselAssistV2.tsx`, `frontend/apps/desktop/src/CounselAssistV3.tsx`, `frontend/apps/desktop/src/LegacySttView.tsx`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Clipboard API`
- **핵심 기능 명세**: 상담 장비의 카탈로그 도해 카드, 호환 소모품 사진 카드, 매뉴얼 PDF를 선택·정렬하고 수신처별 카톡·문자·이메일 안내문 조립·복사·기록

#### `frontend/apps/desktop/src/EventDetailModal.tsx`
- **규모 / 구분**: 255줄 / 13.4 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L02` / `schedule (/schedule modal)` / `frontend/apps/mobile/src/App.tsx`
- **주요 Export 심볼**: `EventDetailModal`, `default`
- **정·역방향 의존성**: Out(2): `frontend/apps/desktop/src/CategorySchema.ts`, `frontend/apps/desktop/src/scheduleApi.ts` | In(1): `frontend/apps/desktop/src/SchedulePage.tsx`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: 선택한 일정의 기본 속성, A/S 세부 필드 및 카테고리별 확장 데이터 조회와 완료 토글·삭제·수정 전환 수행

#### `frontend/apps/desktop/src/EventFormModal.tsx`
- **규모 / 구분**: 534줄 / 22.5 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L02` / `schedule (/schedule modal)` / -
- **주요 Export 심볼**: `EventFormModal`, `default`
- **정·역방향 의존성**: Out(2): `frontend/apps/desktop/src/CategorySchema.ts`, `frontend/apps/desktop/src/scheduleApi.ts` | In(1): `frontend/apps/desktop/src/SchedulePage.tsx`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: 업무 카테고리와 세부 업무유형에 맞춰 공통 일정 필드 및 동적 탭·장비 목록·체크박스 입력 폼 렌더링과 저장 페이로드 제출

#### `frontend/apps/desktop/src/GlobalNav.tsx`
- **규모 / 구분**: 142줄 / 3.9 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L02` / `global-nav (stt-legacy | counsel-v2 | counsel-v3 | counsel-compare | schedule)` / `frontend/apps/mobile/src/App.tsx`
- **주요 Export 심볼**: `NavTab`, `GlobalNav`, `default`
- **정·역방향 의존성**: Out(0): - | In(1): `frontend/apps/desktop/src/App.tsx`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `lucide-react`
- **핵심 기능 명세**: 상단 고정 헤더 바 및 5개 데스크톱 메뉴 탭 전환 네비게이션 렌더링

#### `frontend/apps/desktop/src/LegacySttGuidanceAndDialogs.tsx`
- **규모 / 구분**: 642줄 / 25 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L02` / `stt-legacy (/stt panelC+dialogs)` / -
- **주요 Export 심볼**: `LegacySttPanelCProps`, `LegacySttPanelC`, `LegacySttActionDialogsProps`, `LegacySttActionDialogs`
- **정·역방향 의존성**: Out(2): `frontend/apps/desktop/src/store.ts`, `frontend/apps/desktop/src/sttAudioDsp.ts` | In(1): `frontend/apps/desktop/src/LegacySttView.tsx`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `lucide-react`
- **핵심 기능 명세**: 상담지원1 우측 안내 멘트·체크리스트·종결 바(LegacySttPanelC) 및 출장 배차·영업 이관 모달(LegacySttActionDialogs) 렌더링

#### `frontend/apps/desktop/src/LegacySttTopAndLeftPane.tsx`
- **규모 / 구분**: 707줄 / 27.4 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L02` / `stt-legacy (/stt top+panelA)` / -
- **주요 Export 심볼**: `LegacySttTopStripProps`, `LegacySttTopStrip`, `LegacySttPanelAProps`, `LegacySttPanelA`
- **정·역방향 의존성**: Out(3): `frontend/apps/desktop/src/keywordRegistryData.ts`, `frontend/apps/desktop/src/store.ts`, `frontend/apps/desktop/src/sttAudioDsp.ts` | In(1): `frontend/apps/desktop/src/LegacySttView.tsx`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `lucide-react`
- **핵심 기능 명세**: 상담지원1 상단 5대 슬롯·STT 제어 바(LegacySttTopStrip) 및 좌측 고객 조회·장비 선택·문서 발송·이력 타임라인 패널(LegacySttPanelA) 렌더링

#### `frontend/apps/desktop/src/LegacySttTranscriptPane.tsx`
- **규모 / 구분**: 844줄 / 35.3 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L02` / `stt-legacy (/stt panelB)` / -
- **주요 Export 심볼**: `LegacySttTranscriptPaneProps`, `LegacySttTranscriptPane`
- **정·역방향 의존성**: Out(5): `frontend/apps/desktop/src/keywordAssist.tsx`, `frontend/apps/desktop/src/keywordExtractors.ts`, `frontend/apps/desktop/src/keywordRegistryData.ts`, `frontend/apps/desktop/src/store.ts`, `frontend/apps/desktop/src/sttAudioDsp.ts` | In(1): `frontend/apps/desktop/src/LegacySttView.tsx`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `lucide-react`
- **핵심 기능 명세**: 상담지원1 중앙 자막 패널(LegacySttTranscriptPane)로 전처리 실험 스위치 8종, 다색 엔티티 자막 창, 감지 증상 칩 및 수동 부품 매핑 바 렌더링

#### `frontend/apps/desktop/src/LegacySttView.tsx`
- **규모 / 구분**: 1267줄 / 49.6 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L02` / `stt-legacy (/stt, 상담지원1)` / `frontend/apps/mobile/src/App.tsx`
- **주요 Export 심볼**: `default LegacySttView`
- **정·역방향 의존성**: Out(17): `frontend/apps/desktop/src/ConsultWrapupModal.tsx`, `frontend/apps/desktop/src/DispatchDocPackageModal.tsx`, `frontend/apps/desktop/src/EquipmentManualModal.tsx`, `frontend/apps/desktop/src/LegacySttGuidanceAndDialogs.tsx`, `frontend/apps/desktop/src/LegacySttTopAndLeftPane.tsx`, `frontend/apps/desktop/src/LegacySttTranscriptPane.tsx`, `frontend/apps/desktop/src/MicTestModal.tsx`, `frontend/apps/desktop/src/PartsOrderQuotationModal.tsx`, `frontend/apps/desktop/src/SelfActionGuideModal.tsx`, `frontend/apps/desktop/src/SttArchiveModal.tsx` 외 7건 | In(1): `frontend/apps/desktop/src/App.tsx`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `FastAPI (/api/v1/counsel, /visits, /sales)`
- **핵심 기능 명세**: 상담지원1 컨테이너 화면으로 useRealtimeSttCapture 훅과 3단 패널, 드래그앤드롭 오디오 재생 제어, 동적 보관함 동기화(sttArchiveSync) 및 7종 지연 로딩 모달 조립 수행

#### `frontend/apps/desktop/src/MicTestModal.tsx`
- **규모 / 구분**: 357줄 / 13.2 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L02` / `stt-legacy (/stt modal)` / -
- **주요 Export 심볼**: `MicTestModal`, `default`
- **정·역방향 의존성**: Out(0): - | In(1): `frontend/apps/desktop/src/LegacySttView.tsx`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `MediaDevices API`, `AudioContext`, `SpeechRecognition`
- **핵심 기능 명세**: 오디오 입력 장치 목록 조회·전환, 브라우저 마이크 권한 확인, 입력 음량 레벨 미터 표시 및 음성인식 에코 테스트 수행

#### `frontend/apps/desktop/src/PartsOrderQuotationModal.tsx`
- **규모 / 구분**: 1115줄 / 40 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L02` / `counsel-modal (parts-quotation)` / -
- **주요 Export 심볼**: `DispatchChannelType`, `PrimaryRecipientType`, `ConsumablePartItem`, `PartsQuotationDoc`, `PartsOrderQuotationModal`, `default`
- **정·역방향 의존성**: Out(2): `frontend/apps/desktop/src/modelCatalogVisuals.ts`, `frontend/apps/desktop/src/partsCatalogApi.ts` | In(4): `frontend/apps/desktop/src/CounselAssistV2.tsx`, `frontend/apps/desktop/src/CounselAssistV3.tsx`, `frontend/apps/desktop/src/LegacySttView.tsx`, `frontend/apps/desktop/src/SelfActionGuideModal.tsx`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Clipboard API`, `window.print`
- **핵심 기능 명세**: 호환 소모품·부품 카탈로그에서 품목·수량을 선택하여 공급가액·부가세·택배비를 합산하고 도해 첨부 견적서 인쇄·복사 및 주문 등록

#### `frontend/apps/desktop/src/SchedulePage.tsx`
- **규모 / 구분**: 857줄 / 36.8 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L02` / `schedule (/schedule, 일정관리)` / `frontend/apps/mobile/src/App.tsx`
- **주요 Export 심볼**: `default SchedulePage`
- **정·역방향 의존성**: Out(3): `frontend/apps/desktop/src/EventDetailModal.tsx`, `frontend/apps/desktop/src/EventFormModal.tsx`, `frontend/apps/desktop/src/scheduleApi.ts` | In(1): `frontend/apps/desktop/src/App.tsx`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Supabase REST`
- **핵심 기능 명세**: 월간·주간·일간·목록 4종 뷰와 미니 달력을 제공하고 카테고리·담당자·기간·키워드 필터링 및 일정 등록·수정·삭제·완료 상태 전환 수행

#### `frontend/apps/desktop/src/SelfActionGuideModal.tsx`
- **규모 / 구분**: 1055줄 / 36.7 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L02` / `counsel-modal (self-action-guide)` / -
- **주요 Export 심볼**: `GuideStepItem`, `SitePhotoSketchEvidence`, `SelfActionGuideModal`, `default`
- **정·역방향 의존성**: Out(4): `frontend/apps/desktop/src/PartsOrderQuotationModal.tsx`, `frontend/apps/desktop/src/SymptomPhotoManagerModal.tsx`, `frontend/apps/desktop/src/modelCatalogVisuals.ts`, `frontend/apps/desktop/src/symptomPhotoApi.ts` | In(4): `frontend/apps/desktop/src/CounselAssistV2.tsx`, `frontend/apps/desktop/src/CounselAssistV3.tsx`, `frontend/apps/desktop/src/CounselV2RightStudio.tsx`, `frontend/apps/desktop/src/LegacySttView.tsx`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Clipboard API`
- **핵심 기능 명세**: 기종 도해, 단계별 점검 절차, 증상 사진 보관함, 매뉴얼 링크를 조합해 현장·원청 수신자용 자가점검 안내문 생성·발송 및 후속 모달 분기

#### `frontend/apps/desktop/src/SttArchiveModal.tsx`
- **규모 / 구분**: 769줄 / 31 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L02` / `stt-legacy (/stt modal)` / -
- **주요 Export 심볼**: `SttAudioArchiveRow`, `SttArchiveModal`, `default`
- **정·역방향 의존성**: Out(1): `frontend/apps/desktop/src/supabaseClient.ts` | In(1): `frontend/apps/desktop/src/LegacySttView.tsx`
- **접근 DB 테이블 · 외부 연동**: DB: `space_stt_audio_archives` | 외부: `Supabase REST`, `Clipboard API`
- **핵심 기능 명세**: space_stt_audio_archives 테이블의 음성파일 메타데이터, 전처리 옵션, 엔진별 전사 전문 및 결론 요약 기록 조회·검색·삭제·복사·불러오기 수행

#### `frontend/apps/desktop/src/SymptomPhotoManagerModal.tsx`
- **규모 / 구분**: 694줄 / 25.2 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L02` / `counsel-modal (photo-manager)` / -
- **주요 Export 심볼**: `SymptomPhotoManagerModal`, `default`
- **정·역방향 의존성**: Out(1): `frontend/apps/desktop/src/symptomPhotoApi.ts` | In(1): `frontend/apps/desktop/src/SelfActionGuideModal.tsx`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: 기종·증상별 점검 사진 파일 다중 업로드, 단계 매핑, 표시 순서 상하 이동, 설명 수정, 원본 확대 및 일괄 저장 수행

#### `frontend/apps/desktop/src/consultWrapupTypes.ts`
- **규모 / 구분**: 116줄 / 2.6 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L02` / `stt-legacy (/stt wrapup-types)` / -
- **주요 Export 심볼**: `OutcomeType`, `RequestedItem`, `WrapupOutcomeFields`, `WrapupOutcomeItem`, `OverallSummary`, `OUTCOME_META`, `getTomorrowAfternoonIso`
- **정·역방향 의존성**: Out(1): `frontend/apps/desktop/src/scheduleApi.ts` | In(3): `frontend/apps/desktop/src/ConsultWrapupModal.tsx`, `frontend/apps/desktop/src/ConsultWrapupOutcomeCard.tsx`, `frontend/apps/desktop/src/sttArchiveSync.ts`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: 상담 결론 5대 유형 메타데이터(OUTCOME_META), 요약·결론 카드 인터페이스 및 기본 일시 계산 유틸 제공

#### `frontend/apps/desktop/src/contextCorrector.ts`
- **규모 / 구분**: 494줄 / 20 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L02` / `shared-domain-util` / -
- **주요 Export 심볼**: `CorrectionEvent`, `DOMAIN_CORRECTION_RULES`, `decomposeHangulToJamo`, `computeJamoSimilarity`, `CANONICAL_DOMAIN_TERMS`, `KOREAN_PARTICLE_REGEX`, `PROTECTED_EXACT_STEMS`, `applyContextualCorrection`
- **정·역방향 의존성**: Out(0): - | In(7): `frontend/apps/desktop/src/CounselAssistV2.tsx`, `frontend/apps/desktop/src/LegacySttView.tsx`, `frontend/apps/desktop/src/counselShared.ts`, `frontend/apps/desktop/src/keywordExtractors.ts`, `frontend/apps/desktop/src/omniQueryParser.ts`, `frontend/apps/desktop/src/store.ts`, `frontend/apps/desktop/src/useRealtimeSttCapture.ts`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: 한글 음절 초·중·종성 자모 분해, 음운 가중 편집거리 유사도 산출 및 도메인 오인식 보정 사전 관리(보정 함수는 원문 반환 상태)

#### `frontend/apps/desktop/src/counselShared.ts`
- **규모 / 구분**: 555줄 / 19.8 KB (module) | 시그널: `HIGH_COUPLING_HUB`
- **계층 / Menu ID / 대칭 쌍**: `L02` / `shared-counsel-domain` / -
- **주요 Export 심볼**: `Customer`, `DEFAULT_B2B_CUSTOMERS`, `DiagnosticStep`, `CounselStatus`, `OfficialErrorCode`, `SymptomSession`, `ConsultSessionRecord`, `SymptomPreset`, `KbResult`, `EQUIPMENT_MODELS`, `SYMPTOM_CATEGORIES`, `extractChosung` 외 4건
- **정·역방향 의존성**: Out(4): `frontend/apps/desktop/src/contextCorrector.ts`, `frontend/apps/desktop/src/dispatchDocTypes.ts`, `frontend/apps/desktop/src/keywordExtractors.ts`, `frontend/apps/desktop/src/keywordRegistryData.ts` | In(11): `frontend/apps/desktop/src/CounselAssistV2.tsx`, `frontend/apps/desktop/src/CounselAssistV3.tsx`, `frontend/apps/desktop/src/CounselAssistV3Parts.tsx`, `frontend/apps/desktop/src/CounselV2LeftPane.tsx`, `frontend/apps/desktop/src/CounselV2RightStudio.tsx`, `frontend/apps/desktop/src/CounselV2SessionDialogs.tsx`, `frontend/apps/desktop/src/CounselV3Workspace.tsx`, `frontend/apps/desktop/src/counselV2Persistence.ts`, `frontend/apps/desktop/src/manualKnowledgeData.ts`, `frontend/apps/desktop/src/modelErrorCodesData.ts` 외 1건
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `localStorage`
- **핵심 기능 명세**: 상담진단 공통 타입(Customer, SymptomPreset, ConsultSessionRecord), 초성·유사도 매칭 헬퍼 및 기본 B2B 고객 시드 10건(DEFAULT_B2B_CUSTOMERS) 제공

#### `frontend/apps/desktop/src/counselV2Persistence.ts`
- **규모 / 구분**: 502줄 / 18.5 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L02` / `counsel-v2 (/, persistence)` / `backend/app/api/v1/endpoints/counsel.py`
- **주요 Export 심볼**: `PENDING_STORAGE_KEY`, `HISTORY_STORAGE_KEY`, `generateV2SessionId`, `fetchMergedPendingSessions`, `fetchMergedHistoryRecords`, `savePendingV2Session`, `deletePendingV2Session`, `completeAndSaveV2Session`
- **정·역방향 의존성**: Out(2): `frontend/apps/desktop/src/counselShared.ts`, `frontend/apps/desktop/src/dispatchDocTypes.ts` | In(1): `frontend/apps/desktop/src/CounselAssistV2.tsx`
- **접근 DB 테이블 · 외부 연동**: DB: `space_consult_history_records`, `space_consult_pending_sessions` | 외부: `FastAPI (/api/v1/counsel/*)`, `localStorage`
- **핵심 기능 명세**: 상담지원2 대기열·이력 로컬스토리지·백엔드 API 병합 조회, 1·2차 AS 출장 문서 조립 및 진행·완료 저장·삭제 처리

#### `frontend/apps/desktop/src/dispatchDocTypes.ts`
- **규모 / 구분**: 75줄 / 1.7 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L02` / `shared-dispatch-types` / -
- **주요 Export 심볼**: `SelfActionEvidenceItem`, `EstimatePartItem`, `DispatchDoc1st`, `DispatchDoc2nd`, `DispatchChannelType`
- **정·역방향 의존성**: Out(0): - | In(7): `frontend/apps/desktop/src/CounselAssistV2.tsx`, `frontend/apps/desktop/src/CounselAssistV3.tsx`, `frontend/apps/desktop/src/CounselV2LeftPane.tsx`, `frontend/apps/desktop/src/CounselV2SessionDialogs.tsx`, `frontend/apps/desktop/src/DispatchDocPackageModal.tsx`, `frontend/apps/desktop/src/counselShared.ts`, `frontend/apps/desktop/src/counselV2Persistence.ts`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: 1·2차 AS 출장 행정 문서(DispatchDoc1st, DispatchDoc2nd), 자가조치 증빙 및 부품 견적 품목 TypeScript 인터페이스 정의

#### `frontend/apps/desktop/src/equipmentManualsApi.ts`
- **규모 / 구분**: 120줄 / 3.4 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L02` / `equipment-manuals-api` / -
- **주요 Export 심볼**: `EquipmentManualItem`, `ManualDispatchRecord`, `fetchEquipmentManuals`, `saveManualDispatchRecord`, `getSavedManualDispatches`, `findRecommendedManualsForModel`
- **정·역방향 의존성**: Out(2): `frontend/apps/desktop/src/spaceDustManualsSeed.ts`, `frontend/apps/desktop/src/supabaseClient.ts` | In(1): `frontend/apps/desktop/src/EquipmentManualModal.tsx`
- **접근 DB 테이블 · 외부 연동**: DB: `space_equipment_manuals`, `space_equipment_manuals_cache_v1`, `space_manual_dispatches_v1` | 외부: `Supabase REST`, `localStorage`
- **핵심 기능 명세**: 장비 매뉴얼 메타데이터를 Supabase 또는 로컬 캐시·시드에서 조회하고 상담 모델 기준 추천 필터링 및 발송 이력 저장 수행

#### `frontend/apps/desktop/src/index.css`
- **규모 / 구분**: 141줄 / 3.2 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L02` / `desktop-global-css` / `frontend/apps/mobile/src/index.css`
- **주요 Export 심볼**: `--bg-app`, `--bg-sidebar`, `--bg-card`, `--bg-header`, `--bg-card-header`, `--border-color`, `--table-border-color`, `--table-row-border`, `--scrollbar-track`, `--scrollbar-thumb`, `--scrollbar-thumb-hover`, `--scrollbar-thumb-border`
- **정·역방향 의존성**: Out(0): - | In(2): `frontend/apps/desktop/src/App.tsx`, `frontend/apps/desktop/src/main.tsx`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Pretendard CDN`, `Google Fonts JetBrains Mono`
- **핵심 기능 명세**: 데스크톱 디자인 토큰 CSS 변수, 타이포그래피, 폼 요소 및 스크롤바 전역 스타일 정의

#### `frontend/apps/desktop/src/keywordAssist.tsx`
- **규모 / 구분**: 245줄 / 7.9 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L02` / `shared-domain-renderer` / -
- **주요 Export 심볼**: `EntityClickHandlers`, `renderMultiColorHighlightedText`
- **정·역방향 의존성**: Out(2): `frontend/apps/desktop/src/keywordExtractors.ts`, `frontend/apps/desktop/src/keywordRegistryData.ts` | In(1): `frontend/apps/desktop/src/LegacySttTranscriptPane.tsx`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `react`
- **핵심 기능 명세**: 통화 자막 문자열 내 복합어·구어체·5종 엔티티 하이라이트 스팬 스캔 및 클릭·키보드 배지 UI(renderMultiColorHighlightedText) 렌더링

#### `frontend/apps/desktop/src/keywordExtractors.ts`
- **규모 / 구분**: 558줄 / 30.2 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L02` / `shared-domain-extractors` / -
- **주요 Export 심볼**: `NegativeStateCategory`, `ExtractedNegativeState`, `resolveTargetToKeywordId`, `extractNegativeStateExpressions`, `findCompoundSymptomEntity`, `findMatchingSymptomEntities`, `ExtractedCustomerAddressInfo`, `formatPhoneNumber`, `extractCustomerAndAddressEntities`
- **정·역방향 의존성**: Out(2): `frontend/apps/desktop/src/contextCorrector.ts`, `frontend/apps/desktop/src/keywordRegistryData.ts` | In(6): `frontend/apps/desktop/src/CounselAssistV2.tsx`, `frontend/apps/desktop/src/LegacySttTranscriptPane.tsx`, `frontend/apps/desktop/src/LegacySttView.tsx`, `frontend/apps/desktop/src/counselShared.ts`, `frontend/apps/desktop/src/keywordAssist.tsx`, `frontend/apps/desktop/src/omniQueryParser.ts`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: 16대 고장 증상 엔티티 매칭, 복합 증상 구문·부정 상태 표현 구조 추출 및 고객사·담당자·연락처·주소 정규식 파싱 유틸(React 비의존) 제공

#### `frontend/apps/desktop/src/keywordRegistryData.ts`
- **규모 / 구분**: 720줄 / 49.2 KB (module) | 시그널: `HIGH_COUPLING_HUB`
- **계층 / Menu ID / 대칭 쌍**: `L02` / `shared-keyword-registry` / -
- **주요 Export 심볼**: `CustomerInfo`, `EntityType`, `KeywordEntity`, `EntityRule`, `DOMAIN_KEYWORD_REGISTRY`, `NAMED_ENTITY_REGISTRY`
- **정·역방향 의존성**: Out(0): - | In(10): `frontend/apps/desktop/src/ConsultWrapupModal.tsx`, `frontend/apps/desktop/src/LegacySttTopAndLeftPane.tsx`, `frontend/apps/desktop/src/LegacySttTranscriptPane.tsx`, `frontend/apps/desktop/src/LegacySttView.tsx`, `frontend/apps/desktop/src/counselShared.ts`, `frontend/apps/desktop/src/keywordAssist.tsx`, `frontend/apps/desktop/src/keywordExtractors.ts`, `frontend/apps/desktop/src/store.ts`, `frontend/apps/desktop/src/sttArchiveSync.ts`, `frontend/apps/desktop/src/sttAudioDsp.ts`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: 상담 도메인 고객·엔티티 타입 정의 및 16대 고장 증상 키워드 엔티티 사전 데이터(DOMAIN_KEYWORD_REGISTRY, NAMED_ENTITY_REGISTRY) 제공

#### `frontend/apps/desktop/src/main.tsx`
- **규모 / 구분**: 11줄 / 0.2 KB (entrypoint)
- **계층 / Menu ID / 대칭 쌍**: `L02` / `/ (bootstrap)` / `frontend/apps/mobile/src/main.tsx`
- **주요 Export 심볼**: -
- **정·역방향 의존성**: Out(2): `frontend/apps/desktop/src/App.tsx`, `frontend/apps/desktop/src/index.css` | In(1): `frontend/apps/desktop/index.html`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `react-dom/client`
- **핵심 기능 명세**: DOM #root 요소에 데스크톱 App 루트 컴포넌트를 마운트하는 진입점

#### `frontend/apps/desktop/src/manualKnowledgeData.ts`
- **규모 / 구분**: 1205줄 / 46.3 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L02` / `shared-knowledge-seed` / `backend/app/api/v1/endpoints/canonical_symptoms.py`
- **주요 Export 심볼**: `DEFAULT_SYMPTOM_PRESETS`
- **정·역방향 의존성**: Out(1): `frontend/apps/desktop/src/counselShared.ts` | In(2): `frontend/apps/desktop/src/CounselAssistV2.tsx`, `frontend/apps/desktop/src/CounselAssistV3.tsx`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: 16대 표준 고장 증상별 단계 진단 가이드(DEFAULT_SYMPTOM_PRESETS) 및 현장 점검 절차 시드 데이터 정의

#### `frontend/apps/desktop/src/modelCatalogVisuals.ts`
- **규모 / 구분**: 261줄 / 18.2 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L02` / `shared-docs-bundle` / -
- **주요 Export 심볼**: `SpaceDustCatalogItem`, `CatalogVisualCard`, `ModelCatalogBundle`, `MODEL_KEYS`, `resolveModelKey`, `getModelCatalogBundle`
- **정·역방향 의존성**: Out(2): `frontend/apps/desktop/src/spaceDustCatalogSeed.ts`, `frontend/apps/desktop/src/spaceDustManualsSeed.ts` | In(4): `frontend/apps/desktop/src/DispatchDocPackageModal.tsx`, `frontend/apps/desktop/src/EquipmentManualModal.tsx`, `frontend/apps/desktop/src/PartsOrderQuotationModal.tsx`, `frontend/apps/desktop/src/SelfActionGuideModal.tsx`
- **접근 DB 테이블 · 외부 연동**: DB: `space_manual_01`, `space_manual_02`, `space_manual_03`, `space_manual_04`, `space_manual_05`, `space_manual_06`, `space_manual_07`, `space_manual_08`, `space_manual_09`, `space_manual_10`, `space_manual_11`, `space_manual_12` 외 12건 | 외부: -
- **핵심 기능 명세**: 23종 장비 모델 별칭을 표준 키로 정규화하고 도해 이미지 카드, 호환 소모품 목록, 매뉴얼 PDF를 모델별 단일 번들로 조합 반환

#### `frontend/apps/desktop/src/modelErrorCodesData.ts`
- **규모 / 구분**: 626줄 / 31.1 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L02` / `shared-error-codes` / `backend/app/api/v1/endpoints/model_error_codes.py`
- **주요 Export 심볼**: `S3_S5_ERROR_CODES`, `S7P_ERROR_CODES`, `S12_ERROR_CODES`, `JINCLEAN_ERROR_CODES`, `SWEEPER_ERROR_CODES`, `ROBOT_ERROR_CODES`, `MODEL_OFFICIAL_ERROR_CODES`, `getModelErrorCodes`, `getModelErrorCodePanelTitle`, `DEFAULT_OFFICIAL_ERROR_CODES`
- **정·역방향 의존성**: Out(1): `frontend/apps/desktop/src/counselShared.ts` | In(5): `frontend/apps/desktop/src/CounselAssistV2.tsx`, `frontend/apps/desktop/src/CounselAssistV3.tsx`, `frontend/apps/desktop/src/CounselV2RightStudio.tsx`, `frontend/apps/desktop/src/CounselV3Workspace.tsx`, `frontend/apps/desktop/src/omniQueryParser.ts`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: 제품군별 공식 계기판 에러코드·알람 정의 데이터(MODEL_FAMILY_ERROR_CODES) 및 모델명 기준 에러코드 목록·단건 조회 헬퍼 제공

#### `frontend/apps/desktop/src/modelSpecsData.ts`
- **규모 / 구분**: 236줄 / 10.4 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L02` / `shared-model-specs` / `backend/app/api/v1/endpoints/canonical_symptoms.py`
- **주요 Export 심볼**: `ModelSpec`, `SpecialGuide`, `DEFAULT_MODEL_SPECS`, `DEFAULT_SPECIAL_GUIDES`
- **정·역방향 의존성**: Out(0): - | In(4): `frontend/apps/desktop/src/CounselAssistV2.tsx`, `frontend/apps/desktop/src/CounselAssistV3.tsx`, `frontend/apps/desktop/src/CounselV2LeftPane.tsx`, `frontend/apps/desktop/src/CounselV3Workspace.tsx`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: 11종 청소장비 하드웨어 제원표(DEFAULT_MODEL_SPECS) 및 4대 상황별 관리 수칙(DEFAULT_SPECIAL_GUIDES) 정의

#### `frontend/apps/desktop/src/omniQueryParser.ts`
- **규모 / 구분**: 323줄 / 11.9 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L02` / `counsel-v3 (/counsel3 omni-parser)` / -
- **주요 Export 심볼**: `EQUIPMENT_MODELS`, `OmniParsedResult`, `parseOmniQuery`, `OmniExecutionMatch`, `matchOmniExecutionEntities`
- **정·역방향 의존성**: Out(4): `frontend/apps/desktop/src/contextCorrector.ts`, `frontend/apps/desktop/src/counselShared.ts`, `frontend/apps/desktop/src/keywordExtractors.ts`, `frontend/apps/desktop/src/modelErrorCodesData.ts` | In(2): `frontend/apps/desktop/src/CounselAssistV3.tsx`, `frontend/apps/desktop/src/CounselAssistV3Parts.tsx`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: 상담지원3 통합 검색 입력을 고객사·전화번호·장비모델·증상·에러코드로 복합 파싱하는 순수 유틸(parseOmniQuery, matchOmniExecutionEntities) 제공

#### `frontend/apps/desktop/src/partsCatalogApi.ts`
- **규모 / 구분**: 141줄 / 4.8 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L02` / `parts-catalog-api` / `frontend/apps/mobile/src/App.tsx`
- **주요 Export 심볼**: `supabase`, `CatalogPartItem`, `CartItem`, `PartsOrderRecord`, `getAllPartsCatalog`, `getPartsCatalog`, `saveCatalogPart`, `submitPartsOrder`
- **정·역방향 의존성**: Out(3): `frontend/apps/desktop/src/partsCatalogTypes.ts`, `frontend/apps/desktop/src/spaceDustCatalogSeed.ts`, `frontend/apps/desktop/src/supabaseClient.ts` | In(1): `frontend/apps/desktop/src/PartsOrderQuotationModal.tsx`
- **접근 DB 테이블 · 외부 연동**: DB: `space_parts_catalog`, `space_parts_catalog_cache_v2`, `space_parts_orders`, `space_parts_orders_cache` | 외부: `@supabase/supabase-js`, `localStorage`
- **핵심 기능 명세**: Supabase space_parts_catalog 데이터와 72종 로컬 시드를 병합해 호환 부품 목록을 반환하고 품목 저장 및 견적 주문 등록 수행

#### `frontend/apps/desktop/src/partsCatalogTypes.ts`
- **규모 / 구분**: 55줄 / 1.3 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L02` / `shared-parts-types` / -
- **주요 Export 심볼**: `CatalogPartItem`, `CartItem`, `PartsOrderRecord`
- **정·역방향 의존성**: Out(0): - | In(2): `frontend/apps/desktop/src/partsCatalogApi.ts`, `frontend/apps/desktop/src/spaceDustCatalogSeed.ts`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: 소모품·부품 카탈로그 품목(CatalogPartItem), 장바구니(CartItem) 및 주문 이력(PartsOrderRecord) TypeScript 인터페이스 정의

#### `frontend/apps/desktop/src/scheduleApi.ts`
- **규모 / 구분**: 172줄 / 5.7 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L02` / `schedule | stt-legacy` / `frontend/apps/mobile/src/App.tsx`
- **주요 Export 심볼**: `supabase`, `Category`, `ScheduleEvent`, `EquipmentRow`, `Attachment`, `CategoryMeta`, `ScheduleEventCreate`, `ScheduleEventUpdate`, `fetchCategories`, `FetchEventsParams`, `fetchEvents`, `fetchEvent` 외 7건
- **정·역방향 의존성**: Out(1): `frontend/apps/desktop/src/supabaseClient.ts` | In(6): `frontend/apps/desktop/src/ConsultWrapupModal.tsx`, `frontend/apps/desktop/src/EventDetailModal.tsx`, `frontend/apps/desktop/src/EventFormModal.tsx`, `frontend/apps/desktop/src/SchedulePage.tsx`, `frontend/apps/desktop/src/consultWrapupTypes.ts`, `frontend/apps/desktop/src/sttArchiveSync.ts`
- **접근 DB 테이블 · 외부 연동**: DB: `space_employees`, `space_schedule_events`, `space_transfer_centers` | 외부: `@supabase/supabase-js`
- **핵심 기능 명세**: Supabase 클라이언트 기반 업무 일정 CRUD, 8대 업무 카테고리 메타데이터 제공, 이관센터 및 재직 직원 목록 조회 수행

#### `frontend/apps/desktop/src/spaceDustCatalogSeed.ts`
- **규모 / 구분**: 1014줄 / 51.8 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L02` / `shared-catalog-seed` / -
- **주요 Export 심볼**: `SPACE_DUST_OFFICIAL_CATALOG`
- **정·역방향 의존성**: Out(1): `frontend/apps/desktop/src/partsCatalogTypes.ts` | In(2): `frontend/apps/desktop/src/modelCatalogVisuals.ts`, `frontend/apps/desktop/src/partsCatalogApi.ts`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `space-dust.com static images`
- **핵심 기능 명세**: 공식몰 기준 72종 소모품·부품의 품번, 품명, 분류, 공급단가, 호환 기종, 교체 난이도 및 상품 이미지 URL 시드 데이터 정의

#### `frontend/apps/desktop/src/spaceDustManualsSeed.ts`
- **규모 / 구분**: 471줄 / 17.2 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L02` / `shared-manuals-seed` / -
- **주요 Export 심볼**: `EquipmentManualItem`, `SPACE_DUST_OFFICIAL_MANUALS`
- **정·역방향 의존성**: Out(0): - | In(2): `frontend/apps/desktop/src/equipmentManualsApi.ts`, `frontend/apps/desktop/src/modelCatalogVisuals.ts`
- **접근 DB 테이블 · 외부 연동**: DB: `space_manual_01`, `space_manual_02`, `space_manual_03`, `space_manual_04`, `space_manual_05`, `space_manual_06`, `space_manual_07`, `space_manual_08`, `space_manual_09`, `space_manual_10`, `space_manual_11`, `space_manual_12` 외 13건 | 외부: `Supabase Storage`
- **핵심 기능 명세**: 25종 장비 사용설명서 및 제품군 카탈로그 PDF의 제목, 문서 구분, 호환 모델, 페이지 수, 파일 크기 및 다운로드 URL 시드 데이터 정의

#### `frontend/apps/desktop/src/store.ts`
- **규모 / 구분**: 542줄 / 20.7 KB (module) | 시그널: `HIGH_COUPLING_HUB`
- **계층 / Menu ID / 대칭 쌍**: `L02` / `stt-legacy (/stt)` / `frontend/apps/mobile/src/store.ts`
- **주요 Export 심볼**: `CustomerInfo`, `ChecklistItem`, `MatchedDiagnosis`, `DEFAULT_CUSTOMERS`, `useCounselStore`
- **정·역방향 의존성**: Out(2): `frontend/apps/desktop/src/contextCorrector.ts`, `frontend/apps/desktop/src/keywordRegistryData.ts` | In(8): `frontend/apps/desktop/src/ConsultWrapupModal.tsx`, `frontend/apps/desktop/src/LegacySttGuidanceAndDialogs.tsx`, `frontend/apps/desktop/src/LegacySttTopAndLeftPane.tsx`, `frontend/apps/desktop/src/LegacySttTranscriptPane.tsx`, `frontend/apps/desktop/src/LegacySttView.tsx`, `frontend/apps/desktop/src/sttArchiveSync.ts`, `frontend/apps/desktop/src/sttAudioDsp.ts`, `frontend/apps/desktop/src/useRealtimeSttCapture.ts`
- **접근 DB 테이블 · 외부 연동**: DB: `space_stt_engine_v1` | 외부: `zustand`, `localStorage`
- **핵심 기능 명세**: 상담지원1 화면의 통화 타이머, 오디오 재생 상태, STT 엔진 선택, 자막 중복 병합, 키워드, 고객 정보, 체크리스트 및 배차 드로어 상태 관리

#### `frontend/apps/desktop/src/sttArchiveSync.ts`
- **규모 / 구분**: 485줄 / 17.4 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L02` / `stt-legacy (/stt archive-sync)` / -
- **주요 Export 심볼**: `formatSttEngineLabel`, `formatNowKst`, `insertOpenedSttArchive`, `syncLiveSttArchive`, `upsertAnalyzedSttArchive`, `confirmAndSaveConsultWrapup`
- **정·역방향 의존성**: Out(5): `frontend/apps/desktop/src/consultWrapupTypes.ts`, `frontend/apps/desktop/src/keywordRegistryData.ts`, `frontend/apps/desktop/src/scheduleApi.ts`, `frontend/apps/desktop/src/store.ts`, `frontend/apps/desktop/src/supabaseClient.ts` | In(2): `frontend/apps/desktop/src/ConsultWrapupModal.tsx`, `frontend/apps/desktop/src/LegacySttView.tsx`
- **접근 DB 테이블 · 외부 연동**: DB: `space_consult_logs`, `space_llm_logs`, `space_sales_inquiries`, `space_stt_audio_archives`, `space_visits` | 외부: `Supabase REST (dynamic)`
- **핵심 기능 명세**: STT 보관함(space_stt_audio_archives) 초기화·자막 갱신 및 상담 결론 4개 테이블 일괄 저장을 동적 Supabase import로 수행

#### `frontend/apps/desktop/src/sttAudioDsp.ts`
- **규모 / 구분**: 348줄 / 14.3 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L02` / `stt-legacy (/stt dsp-helper)` / -
- **주요 Export 심볼**: `STT_LAB_STORAGE_KEY`, `DEFAULT_STT_LAB_OPTIONS`, `SttLabOptions`, `TempoProfile`, `createDefaultTempoProfile`, `loadInitialSttLabOptions`, `formatTimer`, `formatAudioTime`, `encodeWav16kMono`, `ConfirmedSlotsState`, `NextLeadGuidanceState`, `computeNextLeadGuidance`
- **정·역방향 의존성**: Out(2): `frontend/apps/desktop/src/keywordRegistryData.ts`, `frontend/apps/desktop/src/store.ts` | In(5): `frontend/apps/desktop/src/LegacySttGuidanceAndDialogs.tsx`, `frontend/apps/desktop/src/LegacySttTopAndLeftPane.tsx`, `frontend/apps/desktop/src/LegacySttTranscriptPane.tsx`, `frontend/apps/desktop/src/LegacySttView.tsx`, `frontend/apps/desktop/src/useRealtimeSttCapture.ts`
- **접근 DB 테이블 · 외부 연동**: DB: `space_stt_lab_options_v1` | 외부: `localStorage`
- **핵심 기능 명세**: STT 실험 스위치 기본값·로드, 적응형 VAD 템포 프로파일 초기화, WAV 16kHz PCM 인코더(encodeWav16kMono), 타이머 포맷 및 안내 멘트 계산 함수 제공

#### `frontend/apps/desktop/src/supabaseClient.ts`
- **규모 / 구분**: 18줄 / 0.8 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L02` / `shared-supabase-client` / -
- **주요 Export 심볼**: `supabase`
- **정·역방향 의존성**: Out(0): - | In(6): `frontend/apps/desktop/src/SttArchiveModal.tsx`, `frontend/apps/desktop/src/equipmentManualsApi.ts`, `frontend/apps/desktop/src/partsCatalogApi.ts`, `frontend/apps/desktop/src/scheduleApi.ts`, `frontend/apps/desktop/src/sttArchiveSync.ts`, `frontend/apps/desktop/src/symptomPhotoApi.ts`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `@supabase/supabase-js`
- **핵심 기능 명세**: 프론트엔드 데스크톱 공통 단일 Supabase 클라이언트 싱글턴 생성 및 공개 URL·Anon 키 제공

#### `frontend/apps/desktop/src/symptomPhotoApi.ts`
- **규모 / 구분**: 399줄 / 13.5 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L02` / `symptom-photo-api` / `frontend/apps/mobile/src/App.tsx`
- **주요 Export 심볼**: `supabase`, `STORAGE_BUCKET`, `SymptomPhotoItem`, `compressImageClient`, `getSymptomPhotos`, `uploadSymptomPhoto`, `saveReorderedPhotos`, `deleteSymptomPhoto`
- **정·역방향 의존성**: Out(1): `frontend/apps/desktop/src/supabaseClient.ts` | In(2): `frontend/apps/desktop/src/SelfActionGuideModal.tsx`, `frontend/apps/desktop/src/SymptomPhotoManagerModal.tsx`
- **접근 DB 테이블 · 외부 연동**: DB: `space_symptom_guide_photos`, `space_symptom_photos_` | 외부: `@supabase/supabase-js`, `Supabase Storage (symptom-guide-photos)`, `localStorage`
- **핵심 기능 명세**: 업로드 이미지를 캔버스에서 WebP로 압축해 Supabase Storage 및 메타 테이블에 저장·순서변경·삭제하고 미등록 시 기본 SVG 도해 생성

#### `frontend/apps/desktop/src/useRealtimeSttCapture.ts`
- **규모 / 구분**: 1260줄 / 52.9 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L02` / `stt-legacy (/stt capture-hook)` / -
- **주요 Export 심볼**: `UseRealtimeSttCaptureParams`, `useRealtimeSttCapture`
- **정·역방향 의존성**: Out(3): `frontend/apps/desktop/src/contextCorrector.ts`, `frontend/apps/desktop/src/store.ts`, `frontend/apps/desktop/src/sttAudioDsp.ts` | In(1): `frontend/apps/desktop/src/LegacySttView.tsx`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `MediaDevices API`, `Web Audio API`, `WebSocket (/api/v1/stt/ws)`, `Vercel (/api/groq-stt-chunk, /api/clova-chunk)`, `Web SpeechRecognition`
- **핵심 기능 명세**: 상담지원1 음성 수음 커스텀 훅으로 마이크·WASAPI 루프백 스트림, 화자 템포 적응형 VAD, Whisper·CLOVA·WebSpeech 전사 파이프라인 제어

#### `frontend/apps/desktop/tsconfig.app.json`
- **규모 / 구분**: 27줄 / 0.6 KB (config)
- **계층 / Menu ID / 대칭 쌍**: `L02` / `desktop-tsc-app` / `frontend/apps/mobile/tsconfig.app.json`
- **주요 Export 심볼**: -
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: 데스크톱 src 하위 TypeScript·TSX 컴파일 규칙 및 미사용 변수 검사 옵션 정의

#### `frontend/apps/desktop/tsconfig.json`
- **규모 / 구분**: 8줄 / 0.1 KB (config)
- **계층 / Menu ID / 대칭 쌍**: `L02` / `desktop-tsc` / `frontend/apps/mobile/tsconfig.json`
- **주요 Export 심볼**: `files`, `references`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: 데스크톱 브라우저 소스 설정과 Vite 노드 설정 간 TypeScript 프로젝트 참조 연결

#### `frontend/apps/desktop/tsconfig.node.json`
- **규모 / 구분**: 24줄 / 0.5 KB (config)
- **계층 / Menu ID / 대칭 쌍**: `L02` / `desktop-tsc-node` / `frontend/apps/mobile/tsconfig.node.json`
- **주요 Export 심볼**: -
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: 데스크톱 vite.config.ts 번들 설정 파일용 Node.js TypeScript 컴파일 옵션 정의

#### `frontend/apps/desktop/vite.config.ts`
- **규모 / 구분**: 8줄 / 0.2 KB (config)
- **계층 / Menu ID / 대칭 쌍**: `L02` / `desktop-vite` / `frontend/apps/mobile/vite.config.ts`
- **주요 Export 심볼**: `default`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Vite`, `@vitejs/plugin-react`
- **핵심 기능 명세**: 루트 경로(/) 서빙을 위한 데스크톱 React 애플리케이션 Vite 번들러 설정

### L03. 모바일 현장정비 PWA 애플리케이션 (12개)

#### `frontend/apps/mobile/.oxlintrc.json`
- **규모 / 구분**: 9줄 / 0.2 KB (config)
- **계층 / Menu ID / 대칭 쌍**: `L03` / `mobile-lint` / `frontend/apps/desktop/.oxlintrc.json`
- **주요 Export 심볼**: `$schema`, `plugins`, `rules`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `oxlint`
- **핵심 기능 명세**: 모바일 소스코드 대상 React Hooks 및 컴포넌트 export 정적 린트 규칙 설정

#### `frontend/apps/mobile/index.html`
- **규모 / 구분**: 25줄 / 0.8 KB (entrypoint)
- **계층 / Menu ID / 대칭 쌍**: `L03` / `/mobile` / `frontend/apps/desktop/index.html`
- **주요 Export 심볼**: -
- **정·역방향 의존성**: Out(2): `frontend/apps/mobile/public/sw.js`, `frontend/apps/mobile/src/main.tsx` | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `ServiceWorker API`
- **핵심 기능 명세**: 모바일 현장정비 PWA 루트 DOM 마운트 지점(#root) 및 페이지 로드 시 서비스 워커(/sw.js) 등록 스크립트 정의

#### `frontend/apps/mobile/package.json`
- **규모 / 구분**: 26줄 / 0.5 KB (config)
- **계층 / Menu ID / 대칭 쌍**: `L03` / `mobile-pkg` / `frontend/apps/desktop/package.json`
- **주요 Export 심볼**: `script:dev`, `script:build`, `script:lint`, `script:preview`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `react`, `vite`
- **핵심 기능 명세**: 모바일 PWA 워크스페이스 패키지 의존성 및 개발·빌드·정적검사 스크립트 정의

#### `frontend/apps/mobile/public/sw.js`
- **규모 / 구분**: 91줄 / 2.9 KB (entrypoint)
- **계층 / Menu ID / 대칭 쌍**: `L03` / `/sw.js (PWA Service Worker)` / -
- **주요 Export 심볼**: -
- **정·역방향 의존성**: Out(0): - | In(1): `frontend/apps/mobile/index.html`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Cache Storage API`
- **핵심 기능 명세**: 정적 에셋 네트워크 우선 조회 후 오프라인 시 최대 50개 캐시 폴백 반환 및 /api 요청 캐시 배제·503 JSON 응답 처리

#### `frontend/apps/mobile/src/App.tsx`
- **규모 / 구분**: 736줄 / 32.1 KB (entrypoint)
- **계층 / Menu ID / 대칭 쌍**: `L03` / `/mobile (FEED | DETAIL)` / `frontend/apps/desktop/src/App.tsx`
- **주요 Export 심볼**: `default`
- **정·역방향 의존성**: Out(2): `frontend/apps/mobile/src/index.css`, `frontend/apps/mobile/src/store.ts` | In(1): `frontend/apps/mobile/src/main.tsx`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `FastAPI (/api/v1/visits*, /api/v1/parts, /api/v1/employees)`, `HTML5 Canvas`, `FileReader API`
- **핵심 기능 명세**: 현장정비사 모바일 PWA 화면으로 배정 출장 피드 조회, 작업 시작 상태 전환, 부품 검색·수량 스텝퍼 등록, 현장 사진 첨부, HTML5 캔버스 고객 자필 서명 및 출장 완료 처리 수행

#### `frontend/apps/mobile/src/index.css`
- **규모 / 구분**: 111줄 / 2.1 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L03` / `mobile-global-css` / `frontend/apps/desktop/src/index.css`
- **주요 Export 심볼**: `--text`, `--text-h`, `--bg`, `--border`, `--code-bg`, `--accent`, `--accent-bg`, `--accent-border`, `--social-bg`, `--shadow`, `--sans`, `--heading`
- **정·역방향 의존성**: Out(0): - | In(2): `frontend/apps/mobile/src/App.tsx`, `frontend/apps/mobile/src/main.tsx`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: 모바일 PWA 라이트·다크 미디어쿼리 색상 변수, 반응형 레이아웃 및 타이포그래피 기본 스타일 정의

#### `frontend/apps/mobile/src/main.tsx`
- **규모 / 구분**: 11줄 / 0.2 KB (entrypoint)
- **계층 / Menu ID / 대칭 쌍**: `L03` / `/mobile (bootstrap)` / `frontend/apps/desktop/src/main.tsx`
- **주요 Export 심볼**: -
- **정·역방향 의존성**: Out(2): `frontend/apps/mobile/src/App.tsx`, `frontend/apps/mobile/src/index.css` | In(1): `frontend/apps/mobile/index.html`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `react-dom/client`
- **핵심 기능 명세**: DOM #root 요소에 모바일 App 루트 컴포넌트를 마운트하는 진입점

#### `frontend/apps/mobile/src/store.ts`
- **규모 / 구분**: 53줄 / 1.3 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L03` / `/mobile (FEED | DETAIL)` / `frontend/apps/desktop/src/store.ts`
- **주요 Export 심볼**: `VisitItem`, `PartItem`, `useMobileStore`
- **정·역방향 의존성**: Out(0): - | In(1): `frontend/apps/mobile/src/App.tsx`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `zustand`
- **핵심 기능 명세**: 모바일 현장 기사의 출장 배정 목록, 부품 재고 목록, 선택 출장 건, 활성 탭 및 담당 기사명 상태 관리

#### `frontend/apps/mobile/tsconfig.app.json`
- **규모 / 구분**: 27줄 / 0.6 KB (config)
- **계층 / Menu ID / 대칭 쌍**: `L03` / `mobile-tsc-app` / `frontend/apps/desktop/tsconfig.app.json`
- **주요 Export 심볼**: -
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: 모바일 src 하위 TypeScript·TSX 컴파일 및 정적 타입 검사 옵션 정의

#### `frontend/apps/mobile/tsconfig.json`
- **규모 / 구분**: 8줄 / 0.1 KB (config)
- **계층 / Menu ID / 대칭 쌍**: `L03` / `mobile-tsc` / `frontend/apps/desktop/tsconfig.json`
- **주요 Export 심볼**: `files`, `references`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: 모바일 앱 소스 설정과 Vite 노드 설정 간 TypeScript 프로젝트 참조 연결

#### `frontend/apps/mobile/tsconfig.node.json`
- **규모 / 구분**: 24줄 / 0.5 KB (config)
- **계층 / Menu ID / 대칭 쌍**: `L03` / `mobile-tsc-node` / `frontend/apps/desktop/tsconfig.node.json`
- **주요 Export 심볼**: -
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: 모바일 vite.config.ts 번들 설정 파일용 Node.js TypeScript 컴파일 옵션 정의

#### `frontend/apps/mobile/vite.config.ts`
- **규모 / 구분**: 9줄 / 0.2 KB (config)
- **계층 / Menu ID / 대칭 쌍**: `L03` / `/mobile/` / `frontend/apps/desktop/vite.config.ts`
- **주요 Export 심볼**: `default`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Vite`, `@vitejs/plugin-react`
- **핵심 기능 명세**: /mobile/ 하위 경로 배포를 위한 모바일 React 앱 Vite 번들러 설정

### L04. 백엔드 FastAPI 코어·ORM 모델·API 라우터 (25개)

#### `backend/app/__init__.py`
- **규모 / 구분**: 2줄 / 0 KB (config)
- **계층 / Menu ID / 대칭 쌍**: `L04` / `pkg-marker` / -
- **주요 Export 심볼**: -
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: 백엔드 애플리케이션 루트 패키지 선언 파일

#### `backend/app/api/__init__.py`
- **규모 / 구분**: 2줄 / 0 KB (config)
- **계층 / Menu ID / 대칭 쌍**: `L04` / `pkg-marker` / -
- **주요 Export 심볼**: -
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: 백엔드 API 상위 패키지 선언 파일

#### `backend/app/api/v1/__init__.py`
- **규모 / 구분**: 2줄 / 0 KB (config)
- **계층 / Menu ID / 대칭 쌍**: `L04` / `pkg-marker` / -
- **주요 Export 심볼**: -
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: 백엔드 API v1 버전 패키지 선언 파일

#### `backend/app/api/v1/api.py`
- **규모 / 구분**: 15줄 / 1 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L04` / `/api/v1` / -
- **주요 Export 심볼**: -
- **정·역방향 의존성**: Out(10): `backend/app/api/v1/endpoints/counsel.py`, `backend/app/api/v1/endpoints/employees.py`, `backend/app/api/v1/endpoints/parts.py`, `backend/app/api/v1/endpoints/sales.py`, `backend/app/api/v1/endpoints/schedule.py`, `backend/app/api/v1/endpoints/stt.py`, `backend/app/api/v1/endpoints/telecom.py`, `backend/app/api/v1/endpoints/telephony.py`, `backend/app/api/v1/endpoints/transfer_centers.py`, `backend/app/api/v1/endpoints/visits.py` | In(1): `backend/app/main.py`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `FastAPI APIRouter`
- **핵심 기능 명세**: 10개 도메인 엔드포인트 라우터를 단일 /api/v1 라우터로 병합 등록

#### `backend/app/api/v1/endpoints/canonical_symptoms.py`
- **규모 / 구분**: 1033줄 / 58.9 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L04` / `/api/v1/counsel (reference)` / `frontend/apps/desktop/src/manualKnowledgeData.ts`
- **주요 Export 심볼**: `resolve_symptoms_for_model`, `get_model_spec`, `get_special_guides`, `AVAILABLE_MODELS`, `OFFICIAL_12_ERROR_CODES`, `MODEL_SPECIFICATIONS`, `SPECIAL_MANUAL_GUIDES`, `CANONICAL_FAILURE_TYPES`
- **정·역방향 의존성**: Out(1): `backend/app/api/v1/endpoints/model_error_codes.py` | In(2): `backend/app/api/v1/endpoints/counsel.py`, `backend/scripts/check_canonical_titles.py`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: 청소장비 11종 모델 제원표, 상황별 수칙 4종, 16대 표준 장애 유형 및 모델별 부품코드 오버라이드 해석 제공

#### `backend/app/api/v1/endpoints/counsel.py`
- **규모 / 구분**: 734줄 / 27.9 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L04` / `/api/v1/counsel` / `frontend/apps/desktop/src/CounselAssistV2.tsx`
- **주요 Export 심볼**: `POST /classify (classify_text)`, `PATCH /knowledge/{item_id}/exclude (exclude_knowledge_item)`, `PATCH /knowledge/{item_id}/restore (restore_knowledge_item)`, `GET /knowledge/excluded (list_excluded_items)`, `POST / (create_or_update_counsel)`, `GET /pending (get_pending_counsels)`, `GET /history (get_counsel_history)`, `DELETE /session/{session_id} (delete_counsel_session)`, `GET /official-error-codes (get_official_error_codes)`, `GET /model-symptoms (get_model_symptoms)`, `GET /model-spec (get_model_specification)`, `GET /special-guides (get_special_manual_guides)` 외 12건
- **정·역방향 의존성**: Out(4): `backend/app/api/v1/endpoints/canonical_symptoms.py`, `backend/app/core/database.py`, `backend/app/core/security.py`, `backend/app/services/counsel_kb_service.py` | In(2): `.github/workflows/deploy.yml`, `backend/app/api/v1/api.py`
- **접근 DB 테이블 · 외부 연동**: DB: `consult_knowledge`, `space_audit_log_minimal`, `space_consult_knowledge`, `space_consult_logs`, `space_customers`, `space_employees`, `space_symptom_rules`, `space_visits`, `symptom_rules` | 외부: `FastAPI APIRouter`, `PostgreSQL (AsyncSession)`
- **핵심 기능 명세**: 상담 텍스트 분류·KB 검색·비교 라우트 위임(counsel_kb_service), 상담 세션·이력 CRUD, 지식 제외·복원, 표준 증상·제원·에러코드 반환 및 고객 통합 조회 수행

#### `backend/app/api/v1/endpoints/employees.py`
- **규모 / 구분**: 53줄 / 1.8 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L04` / `/api/v1/employees` / `frontend/apps/desktop/src/scheduleApi.ts`
- **주요 Export 심볼**: `GET / (list_employees)`, `POST / (create_employee)`, `EmployeeItem`, `EmployeeCreate`, `list_employees`, `create_employee`
- **정·역방향 의존성**: Out(1): `backend/app/core/database.py` | In(1): `backend/app/api/v1/api.py`
- **접근 DB 테이블 · 외부 연동**: DB: `space_employees` | 외부: -
- **핵심 기능 명세**: 임직원 및 정비사 목록 조회와 중복 이름 검증 후 신규 직원 레코드 등록 수행

#### `backend/app/api/v1/endpoints/model_error_codes.py`
- **규모 / 구분**: 646줄 / 36.8 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L04` / `/api/v1/counsel (error-codes)` / `frontend/apps/desktop/src/modelErrorCodesData.ts`
- **주요 Export 심볼**: `get_model_error_codes`, `S3_S5_ERROR_CODES`, `S7P_ERROR_CODES`, `S12_ERROR_CODES`, `JINCLEAN_ERROR_CODES`, `SWEEPER_ERROR_CODES`, `ROBOT_ERROR_CODES`, `MODEL_OFFICIAL_ERROR_CODES`
- **정·역방향 의존성**: Out(0): - | In(1): `backend/app/api/v1/endpoints/canonical_symptoms.py`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: 제조사 매뉴얼 기반 장비군별 계기판 에러코드·알람 정의 및 모델명 기준 에러코드 목록 조회 제공

#### `backend/app/api/v1/endpoints/parts.py`
- **규모 / 구분**: 61줄 / 1.8 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L04` / `/api/v1/parts` / `frontend/apps/mobile/src/App.tsx`
- **주요 Export 심볼**: `GET / (list_parts)`, `PartResponse`, `list_parts`
- **정·역방향 의존성**: Out(1): `backend/app/core/database.py` | In(2): `.github/workflows/deploy.yml`, `backend/app/api/v1/api.py`
- **접근 DB 테이블 · 외부 연동**: DB: `space_parts` | 외부: -
- **핵심 기능 명세**: 부품명 검색어 및 페이지네이션 조건 기반 부품 단가·재고 목록 조회 수행

#### `backend/app/api/v1/endpoints/sales.py`
- **규모 / 구분**: 63줄 / 2.2 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L04` / `/api/v1/sales` / `frontend/apps/desktop/src/App.tsx`
- **주요 Export 심볼**: `POST / (create_sales_inquiry)`, `SalesInquiryCreate`, `create_sales_inquiry`
- **정·역방향 의존성**: Out(1): `backend/app/core/database.py` | In(1): `backend/app/api/v1/api.py`
- **접근 DB 테이블 · 외부 연동**: DB: `space_audit_log_minimal`, `space_employees`, `space_sales_inquiries` | 외부: -
- **핵심 기능 명세**: 영업 문의 레코드 생성 및 최소 감사 로그 기록 수행

#### `backend/app/api/v1/endpoints/schedule.py`
- **규모 / 구분**: 537줄 / 22 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L04` / `/api/v1/schedule` / `frontend/apps/desktop/src/SchedulePage.tsx`
- **주요 Export 심볼**: `GET /events (list_schedule_events)`, `GET /events/{event_id} (get_schedule_event)`, `POST /events (create_schedule_event)`, `PUT /events/{event_id} (update_schedule_event)`, `DELETE /events/{event_id} (delete_schedule_event)`, `GET /categories (list_categories)`, `GET /customers (search_customers)`, `ScheduleEventCreate`, `ScheduleEventUpdate`, `ScheduleEventResponse`, `_parse_json_field`, `_row_to_response` 외 12건
- **정·역방향 의존성**: Out(1): `backend/app/core/database.py` | In(1): `backend/app/api/v1/api.py`
- **접근 DB 테이블 · 외부 연동**: DB: `schedule_events`, `space_assets`, `space_audit_log_minimal`, `space_customers`, `space_employees`, `space_schedule_events` | 외부: -
- **핵심 기능 명세**: 업무 일정 CRUD 및 감사 로그 저장, 일정 카테고리 목록 반환, 한글 초성 기반 고객사·자산 매칭 조회 수행

#### `backend/app/api/v1/endpoints/stt.py`
- **규모 / 구분**: 452줄 / 17.1 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L04` / `/api/v1/stt (REST & WS)` / `frontend/apps/desktop/src/App.tsx`
- **주요 Export 심볼**: `GET /status (get_stt_engine_status)`, `GET /recordings (list_recordings)`, `GET /recordings/{filename} (download_recording)`, `POST /reset (reset_stt_session)`, `POST /clova-chunk (transcribe_realtime_clova_chunk)`, `POST /transcribe-file (transcribe_uploaded_audio_file)`, `WS /ws (stt_loopback_websocket)`, `get_stt_engine_status`, `list_recordings`, `download_recording`, `reset_stt_session`, `_is_hallucination` 외 7건
- **정·역방향 의존성**: Out(5): `backend/app/core/secret_vault.py`, `backend/app/core/security.py`, `backend/app/services/clova_grpc_service.py`, `backend/app/services/stt_service.py`, `backend/app/services/wasapi_loopback_service.py` | In(1): `backend/app/api/v1/api.py`
- **접근 DB 테이블 · 외부 연동**: DB: `space_advisor` | 외부: `NAVER CLOVA Speech gRPC`, `Faster-Whisper`, `Windows WASAPI`
- **핵심 기능 명세**: STT 엔진·루프백 장치 상태 조회, 녹음 파일 목록·다운로드, CLOVA gRPC 청크 전사, 업로드 오디오 전사 및 WASAPI 루프백 WebSocket 스트리밍 제어

#### `backend/app/api/v1/endpoints/telecom.py`
- **규모 / 구분**: 68줄 / 2.4 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L04` / `/api/v1/telecom` / -
- **주요 Export 심볼**: `POST /send (send_message)`, `POST /webhook (receive_telecom_webhook)`, `SendMessageRequest`, `WebhookResponse`, `send_message`, `receive_telecom_webhook`
- **정·역방향 의존성**: Out(1): `backend/app/services/messaging/__init__.py` | In(1): `backend/app/api/v1/api.py`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Messaging Providers (Sejong / Aligo / Mock)`
- **핵심 기능 명세**: 비즈메시지(알림톡·SMS) 발송 요청 위임 및 통신사 발송 결과 웹훅 페이로드 표준 파싱

#### `backend/app/api/v1/endpoints/telephony.py`
- **규모 / 구분**: 55줄 / 1.8 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L04` / `/api/v1/telephony` / -
- **주요 Export 심볼**: `POST /call-event (receive_call_event)`, `POST /upload-recording (upload_call_recording)`, `CallEventRequest`, `receive_call_event`, `upload_call_recording`
- **정·역방향 의존성**: Out(1): `backend/app/services/telephony/__init__.py` | In(1): `backend/app/api/v1/api.py`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `PBX Webhook`, `Storage/STT/LLM Pipeline`
- **핵심 기능 명세**: PBX 통화 상태 이벤트 수신 및 통화 종료 녹음 파일 업로드·전사·요약 파이프라인 실행

#### `backend/app/api/v1/endpoints/transfer_centers.py`
- **규모 / 구분**: 53줄 / 1.9 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L04` / `/api/v1/transfer-centers` / `frontend/apps/desktop/src/scheduleApi.ts`
- **주요 Export 심볼**: `GET / (list_transfer_centers)`, `POST / (create_transfer_center)`, `DELETE /{center_id} (delete_transfer_center)`, `TransferCenterCreate`, `TransferCenterResponse`, `list_transfer_centers`, `create_transfer_center`, `delete_transfer_center`
- **정·역방향 의존성**: Out(1): `backend/app/core/database.py` | In(1): `backend/app/api/v1/api.py`
- **접근 DB 테이블 · 외부 연동**: DB: `space_transfer_centers`, `transfer_centers` | 외부: -
- **핵심 기능 명세**: 이관센터 마스터 목록 조회, 신규 등록 및 단건 삭제 처리

#### `backend/app/api/v1/endpoints/visits.py`
- **규모 / 구분**: 431줄 / 16 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L04` / `/api/v1/visits` / `frontend/apps/mobile/src/App.tsx`
- **주요 Export 심볼**: `GET / (list_visits)`, `GET /{visit_id} (get_visit_detail)`, `POST / (create_visit)`, `PATCH /{visit_id}/status (update_visit_status)`, `POST /{visit_id}/parts (add_visit_parts)`, `POST /{visit_id}/complete (complete_visit)`, `VisitCreate`, `VisitPartCreate`, `VisitStatusUpdate`, `VisitComplete`, `VisitResponse`, `list_visits` 외 5건
- **정·역방향 의존성**: Out(2): `backend/app/core/database.py`, `backend/app/services/notification.py` | In(2): `.github/workflows/deploy.yml`, `backend/app/api/v1/api.py`
- **접근 DB 테이블 · 외부 연동**: DB: `space_audit_log_minimal`, `space_employees`, `space_parts`, `space_visit_parts`, `space_visit_status_history`, `space_visits` | 외부: `Aligo Kakao Alimtalk`
- **핵심 기능 명세**: 출장 목록·상세 조회, 출장 접수 생성, 상태 변경 이력 기록, 현장 사용 부품 등록 및 재고 차감, 출장 완료 처리 및 알림 발송

#### `backend/app/core/__init__.py`
- **규모 / 구분**: 2줄 / 0 KB (config)
- **계층 / Menu ID / 대칭 쌍**: `L04` / `pkg-marker` / -
- **주요 Export 심볼**: -
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: 백엔드 코어 설정·보안 패키지 선언 파일

#### `backend/app/core/config.py`
- **규모 / 구분**: 77줄 / 2.9 KB (module) | 시그널: `HIGH_COUPLING_HUB`
- **계층 / Menu ID / 대칭 쌍**: `L04` / `core-config` / -
- **주요 Export 심볼**: `Settings`, `get_settings`
- **정·역방향 의존성**: Out(1): `backend/app/core/secret_vault.py` | In(8): `backend/app/main.py`, `backend/app/services/ai/__init__.py`, `backend/app/services/clova_grpc_service.py`, `backend/app/services/counsel_kb_service.py`, `backend/app/services/messaging/__init__.py`, `backend/app/services/notification.py`, `backend/app/services/storage/__init__.py`, `backend/tests/test_providers.py`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `pydantic-settings`, `.env`
- **핵심 기능 명세**: DB, JWT, Ollama, 메시징, R2 스토리지, STT/LLM 공급자 및 CLOVA gRPC 설정 로드와 싱글턴 캐싱

#### `backend/app/core/database.py`
- **규모 / 구분**: 45줄 / 1.1 KB (module) | 시그널: `HIGH_COUPLING_HUB`
- **계층 / Menu ID / 대칭 쌍**: `L04` / `core-db` / -
- **주요 Export 심볼**: `get_db`, `DATABASE_URL`
- **정·역방향 의존성**: Out(0): - | In(10): `backend/app/api/v1/endpoints/counsel.py`, `backend/app/api/v1/endpoints/employees.py`, `backend/app/api/v1/endpoints/parts.py`, `backend/app/api/v1/endpoints/sales.py`, `backend/app/api/v1/endpoints/schedule.py`, `backend/app/api/v1/endpoints/transfer_centers.py`, `backend/app/api/v1/endpoints/visits.py`, `backend/app/main.py`, `backend/check_cust.py`, `backend/scripts/run_wtt_tests.py`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `SQLAlchemy AsyncEngine (asyncpg)`
- **핵심 기능 명세**: 비동기 SQLAlchemy 엔진·세션 팩토리 구성 및 요청별 DB 세션 생성·롤백·종료 관리

#### `backend/app/core/secret_vault.py`
- **규모 / 구분**: 85줄 / 3.4 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L04` / `core-vault` / -
- **주요 Export 심볼**: `_get_migration_dsn`, `load_vault_secrets_into_memory`, `get_server_secret`
- **정·역방향 의존성**: Out(0): - | In(5): `backend/app/api/v1/endpoints/stt.py`, `backend/app/core/config.py`, `backend/app/main.py`, `backend/app/services/clova_grpc_service.py`, `backend/scripts/verify_vault_security.py`
- **접근 DB 테이블 · 외부 연동**: DB: `private_vault.system_secrets`, `space_advisor` | 외부: `psycopg (private_vault.system_secrets)`
- **핵심 기능 명세**: 원격 PostgreSQL 격리 스키마(private_vault.system_secrets)에서 서버 전용 시크릿을 인메모리 캐시로 로드 및 조회 반환

#### `backend/app/core/security.py`
- **규모 / 구분**: 89줄 / 3.7 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L04` / `core-security` / -
- **주요 Export 심볼**: `get_client_ip`, `RateLimiter`, `check_rate_limit`, `check_stt_rate_limit`, `check_llm_rate_limit`, `get_current_user`
- **정·역방향 의존성**: Out(0): - | In(2): `backend/app/api/v1/endpoints/counsel.py`, `backend/app/api/v1/endpoints/stt.py`
- **접근 DB 테이블 · 외부 연동**: DB: `space_advisor` | 외부: `FastAPI Security`
- **핵심 기능 명세**: 클라이언트 IP 추출, 슬라이딩 윈도우 기반 요청 빈도 제한 검증 및 Bearer 토큰 인증 검사 수행

#### `backend/app/main.py`
- **규모 / 구분**: 70줄 / 2.4 KB (entrypoint)
- **계층 / Menu ID / 대칭 쌍**: `L04` / `FastAPI App (/ | /health | /api/v1)` / -
- **주요 Export 심볼**: `GET /health (health_check)`, `lifespan`, `add_pna_headers`, `health_check`
- **정·역방향 의존성**: Out(4): `backend/app/api/v1/api.py`, `backend/app/core/config.py`, `backend/app/core/database.py`, `backend/app/core/secret_vault.py` | In(5): `.github/workflows/deploy.yml`, `backend/run_server.py`, `backend/scripts/run_wtt_tests.py`, `backend/tests/test_telecom_api.py`, `start_backend_stt.bat`
- **접근 DB 테이블 · 외부 연동**: DB: `space_advisor` | 외부: `FastAPI`, `Uvicorn`
- **핵심 기능 명세**: FastAPI 인스턴스 생성, 수명주기 시크릿 로드 및 DB 풀 해제, CORS·사설 네트워크 헤더 미들웨어 설정, 헬스체크 응답 반환

#### `backend/app/models/__init__.py`
- **규모 / 구분**: 8줄 / 0.3 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L04` / `models-pkg` / -
- **주요 Export 심볼**: -
- **정·역방향 의존성**: Out(2): `backend/app/models/base.py`, `backend/app/models/domain.py` | In(1): `backend/alembic/env.py`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `SQLAlchemy DeclarativeBase`
- **핵심 기능 명세**: SQLAlchemy 선언형 Base 및 차량재고·이관센터·업무일정 포함 전 19개 도메인 ORM 모델 패키지 재노출

#### `backend/app/models/base.py`
- **규모 / 구분**: 5줄 / 0.1 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L04` / `models-base` / -
- **주요 Export 심볼**: `Base`
- **정·역방향 의존성**: Out(0): - | In(3): `backend/alembic/env.py`, `backend/app/models/__init__.py`, `backend/app/models/domain.py`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `SQLAlchemy DeclarativeBase`
- **핵심 기능 명세**: SQLAlchemy 2.0 DeclarativeBase 메타데이터 기반 클래스 정의

#### `backend/app/models/domain.py`
- **규모 / 구분**: 248줄 / 15.9 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L04` / `orm-schema (19 tables)` / -
- **주요 Export 심볼**: `PartCode`, `Part`, `Employee`, `Asset`, `Customer`, `AssetHistory`, `ConsultLog`, `Visit`, `SalesInquiry`, `SymptomRule`, `ConsultKeyword`, `LlmLog` 외 7건
- **정·역방향 의존성**: Out(1): `backend/app/models/base.py` | In(1): `backend/app/models/__init__.py`
- **접근 DB 테이블 · 외부 연동**: DB: `space_asset_history`, `space_assets`, `space_audit_log_minimal`, `space_classification_attempts`, `space_consult_keywords`, `space_consult_logs`, `space_customers`, `space_employees`, `space_llm_logs`, `space_part_codes`, `space_parts`, `space_sales_inquiries` 외 7건 | 외부: `PostgreSQL / SQLAlchemy`
- **핵심 기능 명세**: 부품·자산·고객·상담·출장·영업문의·증상규칙·감사로그·차량재고·이관센터·업무일정 19개 PostgreSQL 테이블 ORM 스키마 정의

### L05. 백엔드 비즈니스 서비스 및 공급자 계층 (26개)

#### `backend/app/services/__init__.py`
- **규모 / 구분**: 2줄 / 0 KB (config)
- **계층 / Menu ID / 대칭 쌍**: `L05` / `pkg-marker` / -
- **주요 Export 심볼**: -
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: 백엔드 비즈니스 서비스 패키지 선언 파일

#### `backend/app/services/ai/__init__.py`
- **규모 / 구분**: 47줄 / 1.4 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L05` / `service-ai-factory` / -
- **주요 Export 심볼**: `get_stt_provider`, `get_llm_provider`
- **정·역방향 의존성**: Out(8): `backend/app/core/config.py`, `backend/app/services/ai/base.py`, `backend/app/services/ai/llm_groq.py`, `backend/app/services/ai/llm_ollama.py`, `backend/app/services/ai/llm_openai.py`, `backend/app/services/ai/stt_groq.py`, `backend/app/services/ai/stt_mock.py`, `backend/app/services/ai/stt_openai.py` | In(2): `backend/app/services/telephony/generic_webhook.py`, `backend/tests/test_providers.py`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: 환경설정에 따라 STT 공급자(Groq/OpenAI/Mock) 및 LLM 공급자(Groq/OpenAI/Ollama) 싱글턴 인스턴스 반환

#### `backend/app/services/ai/base.py`
- **규모 / 구분**: 33줄 / 1 KB (module) | 시그널: `HIGH_COUPLING_HUB`
- **계층 / Menu ID / 대칭 쌍**: `L05` / `service-ai-base` / -
- **주요 Export 심볼**: `BaseSTTProvider`, `BaseLLMProvider`
- **정·역방향 의존성**: Out(0): - | In(8): `backend/app/services/ai/__init__.py`, `backend/app/services/ai/llm_groq.py`, `backend/app/services/ai/llm_ollama.py`, `backend/app/services/ai/llm_openai.py`, `backend/app/services/ai/stt_groq.py`, `backend/app/services/ai/stt_mock.py`, `backend/app/services/ai/stt_openai.py`, `backend/tests/test_providers.py`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: 음성 텍스트 변환(STT) 및 통화 내용 요약·의도 분석(LLM) 추상 인터페이스 정의

#### `backend/app/services/ai/llm_groq.py`
- **규모 / 구분**: 77줄 / 3.1 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L05` / `service-llm-groq` / -
- **주요 Export 심볼**: `GroqLLMProvider`, `SYSTEM_PROMPT`
- **정·역방향 의존성**: Out(1): `backend/app/services/ai/base.py` | In(2): `backend/app/services/ai/__init__.py`, `backend/tests/test_providers.py`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Groq Chat Completions API`
- **핵심 기능 명세**: Groq API를 호출하여 통화 녹취록의 상담 유형·요약·조치 항목 JSON 추출

#### `backend/app/services/ai/llm_ollama.py`
- **규모 / 구분**: 69줄 / 2.5 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L05` / `service-llm-ollama` / -
- **주요 Export 심볼**: `OllamaLLMProvider`, `SYSTEM_PROMPT`
- **정·역방향 의존성**: Out(1): `backend/app/services/ai/base.py` | In(1): `backend/app/services/ai/__init__.py`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Ollama HTTP (/api/chat)`
- **핵심 기능 명세**: 로컬 또는 온프레미스 Ollama 서버를 호출하여 통화 녹취 텍스트 요약 및 후속 조치 JSON 생성

#### `backend/app/services/ai/llm_openai.py`
- **규모 / 구분**: 75줄 / 2.8 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L05` / `service-llm-openai` / -
- **주요 Export 심볼**: `OpenAILLMProvider`, `SYSTEM_PROMPT`
- **정·역방향 의존성**: Out(1): `backend/app/services/ai/base.py` | In(1): `backend/app/services/ai/__init__.py`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `OpenAI Chat Completions API (gpt-4o-mini)`
- **핵심 기능 명세**: OpenAI API를 호출하여 통화 녹취록 요약·고객 의도·후속 조치 JSON 도출

#### `backend/app/services/ai/stt_groq.py`
- **규모 / 구분**: 65줄 / 2.4 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L05` / `service-stt-groq` / -
- **주요 Export 심볼**: `GroqWhisperProvider`
- **정·역방향 의존성**: Out(1): `backend/app/services/ai/base.py` | In(2): `backend/app/services/ai/__init__.py`, `backend/tests/test_providers.py`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Groq Audio Transcriptions API (whisper-large-v3-turbo)`
- **핵심 기능 명세**: Groq Whisper 엔드포인트로 오디오 바이트를 전송하여 한국어 전사 텍스트 반환

#### `backend/app/services/ai/stt_mock.py`
- **규모 / 구분**: 19줄 / 0.6 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L05` / `service-stt-mock` / -
- **주요 Export 심볼**: `MockSTTProvider`
- **정·역방향 의존성**: Out(1): `backend/app/services/ai/base.py` | In(2): `backend/app/services/ai/__init__.py`, `backend/tests/test_providers.py`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: 개발·테스트 환경용 고정 모의 전사 텍스트 반환 공급자

#### `backend/app/services/ai/stt_openai.py`
- **규모 / 구분**: 59줄 / 2 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L05` / `service-stt-openai` / -
- **주요 Export 심볼**: `OpenAIWhisperProvider`
- **정·역방향 의존성**: Out(1): `backend/app/services/ai/base.py` | In(1): `backend/app/services/ai/__init__.py`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `OpenAI Audio Transcriptions API (whisper-1)`
- **핵심 기능 명세**: OpenAI Whisper API를 호출하여 오디오 데이터를 한국어 텍스트로 변환

#### `backend/app/services/clova_grpc_service.py`
- **규모 / 구분**: 295줄 / 11 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L05` / `service-clova-grpc` / `frontend/api/clova-chunk.js`
- **주요 Export 심볼**: `_get_clova_grpc_credentials`, `_get_shared_grpc_channel`, `_encode_varint`, `_encode_len_delimited`, `build_nest_config_request`, `build_nest_data_request`, `decode_nest_response_contents`, `extract_pcm_s16le_from_wav_or_raw`, `stream_pcm_with_clova_grpc`, `transcribe_pcm_with_clova_grpc`, `CLOVA_DOMAIN_BOOST_WORDS`
- **정·역방향 의존성**: Out(2): `backend/app/core/config.py`, `backend/app/core/secret_vault.py` | In(2): `backend/app/api/v1/endpoints/stt.py`, `backend/app/services/wasapi_loopback_service.py`
- **접근 DB 테이블 · 외부 연동**: DB: `private_vault.system_secrets`, `space_advisor` | 외부: `NAVER CLOVA Speech gRPC (clovaspeech-gw.ncloud.com:50051)`
- **핵심 기능 명세**: 16kHz 16-bit PCM 오디오 추출, 도메인 키워드 부스팅 Protobuf 프레임 인코딩, CLOVA gRPC 양방향 스트리밍 송수신 및 전사 세그먼트 디코딩 수행

#### `backend/app/services/counsel_kb_service.py`
- **규모 / 구분**: 573줄 / 27.2 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L05` / `service-counsel-kb` / -
- **주요 Export 심볼**: `fallback_llm_classification`, `_get_openai_embedding`, `_get_bge_embedding`, `_get_nomic_embedding`, `_normalize_domain_query`, `_extract_negative_states_backend`, `execute_kb_search`, `execute_kb_compare`, `OLLAMA_EMBED_URL`, `BGE_MODEL`, `NOMIC_MODEL`
- **정·역방향 의존성**: Out(1): `backend/app/core/config.py` | In(1): `backend/app/api/v1/endpoints/counsel.py`
- **접근 DB 테이블 · 외부 연동**: DB: `consult_knowledge`, `match_similar_bge`, `match_similar_nomic`, `match_similar_openai`, `space_consult_knowledge`, `space_llm_logs`, `space_symptom_rules`, `symptom_rules` | 외부: `Ollama HTTP (/api/generate, /api/embed)`, `OpenAI Embeddings API`, `pgvector / pg_trgm`
- **핵심 기능 명세**: 상담 미매칭 시 Ollama LLM 분류 폴백, 도메인 정규화·부정 상태 추출, OpenAI·bge-m3·nomic 임베딩 생성 및 지식베이스 복합·비교 검색(execute_kb_search, execute_kb_compare) 수행

#### `backend/app/services/messaging/__init__.py`
- **규모 / 구분**: 27줄 / 0.9 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L05` / `service-messaging-factory` / -
- **주요 Export 심볼**: `get_messaging_provider`
- **정·역방향 의존성**: Out(5): `backend/app/core/config.py`, `backend/app/services/messaging/aligo.py`, `backend/app/services/messaging/base.py`, `backend/app/services/messaging/mock.py`, `backend/app/services/messaging/sejong.py` | In(1): `backend/app/api/v1/endpoints/telecom.py`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: 설정에 따른 비즈메시지 공급자(Sejong / Aligo / Mock) 싱글턴 인스턴스 반환

#### `backend/app/services/messaging/aligo.py`
- **규모 / 구분**: 114줄 / 3.8 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L05` / `service-messaging-aligo` / -
- **주요 Export 심볼**: `AligoMessagingProvider`
- **정·역방향 의존성**: Out(1): `backend/app/services/messaging/base.py` | In(1): `backend/app/services/messaging/__init__.py`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Aligo REST API (apis.aligo.in)`
- **핵심 기능 명세**: 알리고 API를 통한 카카오 알림톡·SMS 발송 및 콜백 결과 코드 표준 상태 변환

#### `backend/app/services/messaging/base.py`
- **규모 / 구분**: 43줄 / 1.3 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L05` / `service-messaging-base` / -
- **주요 Export 심볼**: `BaseMessagingProvider`
- **정·역방향 의존성**: Out(0): - | In(4): `backend/app/services/messaging/__init__.py`, `backend/app/services/messaging/aligo.py`, `backend/app/services/messaging/mock.py`, `backend/app/services/messaging/sejong.py`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: 알림톡 발송, SMS 발송, 발송 결과 웹훅 파싱 추상 메서드 규격 정의

#### `backend/app/services/messaging/mock.py`
- **규모 / 구분**: 58줄 / 1.8 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L05` / `service-messaging-mock` / -
- **주요 Export 심볼**: `MockMessagingProvider`
- **정·역방향 의존성**: Out(1): `backend/app/services/messaging/base.py` | In(2): `backend/app/services/messaging/__init__.py`, `backend/tests/test_providers.py`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: 외부 통신 없이 로그 기록 후 성공 응답을 반환하는 테스트용 메시징 모의 처리

#### `backend/app/services/messaging/sejong.py`
- **규모 / 구분**: 165줄 / 6.1 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L05` / `service-messaging-sejong` / -
- **주요 Export 심볼**: `SejongMessagingProvider`
- **정·역방향 의존성**: Out(1): `backend/app/services/messaging/base.py` | In(2): `backend/app/services/messaging/__init__.py`, `backend/tests/test_providers.py`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Sejong Telecom Bizmsg API (api.sejongnetworks.com)`
- **핵심 기능 명세**: 세종텔레콤 알림톡 발송 요청, 실패 시 SMS/LMS 폴백 전환 발송 및 웹훅 상태값 매핑 처리

#### `backend/app/services/notification.py`
- **규모 / 구분**: 107줄 / 4.3 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L05` / `service-notification` / -
- **주요 Export 심볼**: `_get_http_client`, `NotificationService`, `MockNotificationService`, `AligoKakaoService`, `get_notification_service`
- **정·역방향 의존성**: Out(1): `backend/app/core/config.py` | In(1): `backend/app/api/v1/endpoints/visits.py`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Aligo REST API`
- **핵심 기능 명세**: 출장 접수 확인 및 출장 작업 완료 시 고객 대상 카카오 알림톡 또는 모의 로그 발송

#### `backend/app/services/storage/__init__.py`
- **규모 / 구분**: 19줄 / 0.7 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L05` / `service-storage-factory` / -
- **주요 Export 심볼**: `get_storage_provider`
- **정·역방향 의존성**: Out(4): `backend/app/core/config.py`, `backend/app/services/storage/base.py`, `backend/app/services/storage/local_storage.py`, `backend/app/services/storage/r2_storage.py` | In(1): `backend/app/services/telephony/generic_webhook.py`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: 설정에 따른 파일 저장소 공급자(Cloudflare R2 / Local) 싱글턴 인스턴스 반환

#### `backend/app/services/storage/base.py`
- **규모 / 구분**: 35줄 / 0.9 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L05` / `service-storage-base` / -
- **주요 Export 심볼**: `BaseStorageProvider`
- **정·역방향 의존성**: Out(0): - | In(3): `backend/app/services/storage/__init__.py`, `backend/app/services/storage/local_storage.py`, `backend/app/services/storage/r2_storage.py`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: 오디오·미디어 파일 업로드, 다운로드, URL 조회, 삭제 추상 인터페이스 정의

#### `backend/app/services/storage/local_storage.py`
- **규모 / 구분**: 50줄 / 1.8 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L05` / `service-storage-local` / -
- **주요 Export 심볼**: `LocalStorageProvider`
- **정·역방향 의존성**: Out(1): `backend/app/services/storage/base.py` | In(2): `backend/app/services/storage/__init__.py`, `backend/tests/test_providers.py`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Local Filesystem (./recordings)`
- **핵심 기능 명세**: 로컬 디렉터리 기반 오디오 파일 저장·읽기·경로 반환·삭제 수행

#### `backend/app/services/storage/r2_storage.py`
- **규모 / 구분**: 74줄 / 2.8 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L05` / `service-storage-r2` / -
- **주요 Export 심볼**: `CloudflareR2StorageProvider`
- **정·역방향 의존성**: Out(1): `backend/app/services/storage/base.py` | In(1): `backend/app/services/storage/__init__.py`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Cloudflare R2 (boto3 S3)`
- **핵심 기능 명세**: Cloudflare R2 버킷에 오디오 객체 업로드·다운로드·공개 URL 조합·삭제 수행

#### `backend/app/services/stt_service.py`
- **규모 / 구분**: 76줄 / 2.7 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L05` / `service-local-whisper` / -
- **주요 Export 심볼**: `get_whisper_model`
- **정·역방향 의존성**: Out(0): - | In(2): `backend/app/api/v1/endpoints/stt.py`, `backend/app/services/wasapi_loopback_service.py`
- **접근 DB 테이블 · 외부 연동**: DB: `space_advisor` | 외부: `CTranslate2`, `Faster-Whisper (large-v3-turbo)`, `NVIDIA CUDA`
- **핵심 기능 명세**: Faster-Whisper large-v3-turbo 모델의 CUDA(float16) 우선 초기화 및 CPU(int8) 폴백 싱글턴 로드

#### `backend/app/services/telephony/__init__.py`
- **규모 / 구분**: 8줄 / 0.2 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L05` / `service-telephony-factory` / -
- **주요 Export 심볼**: `get_telephony_provider`
- **정·역방향 의존성**: Out(2): `backend/app/services/telephony/base.py`, `backend/app/services/telephony/generic_webhook.py` | In(1): `backend/app/api/v1/endpoints/telephony.py`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: PBX 통화 이벤트 및 녹음 처리 공급자 싱글턴 인스턴스 반환

#### `backend/app/services/telephony/base.py`
- **규모 / 구분**: 33줄 / 0.8 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L05` / `service-telephony-base` / -
- **주요 Export 심볼**: `BaseTelephonyProvider`
- **정·역방향 의존성**: Out(0): - | In(2): `backend/app/services/telephony/__init__.py`, `backend/app/services/telephony/generic_webhook.py`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: 통화 상태 이벤트 수신 및 통화 녹음 후속 처리 추상 인터페이스 정의

#### `backend/app/services/telephony/generic_webhook.py`
- **규모 / 구분**: 70줄 / 2.5 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L05` / `service-telephony-webhook` / -
- **주요 Export 심볼**: `GenericWebhookTelephonyProvider`
- **정·역방향 의존성**: Out(3): `backend/app/services/ai/__init__.py`, `backend/app/services/storage/__init__.py`, `backend/app/services/telephony/base.py` | In(2): `backend/app/services/telephony/__init__.py`, `backend/tests/test_providers.py`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: PBX 통화 상태 이벤트 로깅 및 녹음 파일 저장·STT 전사·LLM 요약 연계 파이프라인 실행

#### `backend/app/services/wasapi_loopback_service.py`
- **규모 / 구분**: 540줄 / 24.3 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L05` / `service-wasapi-loopback` / -
- **주요 Export 심볼**: `resample_to_16k`, `list_loopback_devices`, `find_vb_cable_device`, `LoopbackSTTService`, `get_loopback_service`, `CAPTURE_SAMPLE_RATE`, `WHISPER_SAMPLE_RATE`, `CHUNK_SECONDS`, `CHUNK_FRAMES`, `SILENCE_THRESHOLD_RMS`, `RECORDINGS_DIR`
- **정·역방향 의존성**: Out(2): `backend/app/services/clova_grpc_service.py`, `backend/app/services/stt_service.py` | In(1): `backend/app/api/v1/endpoints/stt.py`
- **접근 DB 테이블 · 외부 연동**: DB: `space_advisor` | 외부: `Windows WASAPI (soundcard)`, `SciPy`, `Faster-Whisper`, `NAVER CLOVA gRPC`
- **핵심 기능 명세**: Windows 출력 오디오 루프백·마이크 장치 탐색, 프로듀서-컨슈머 큐 기반 수음, 노이즈 플로어 VAD 구간 분할, 전사 및 48kHz WAV 녹음 저장

### L06. 데이터베이스 마이그레이션 및 스키마·시드 SQL (22개)

#### `backend/alembic.ini`
- **규모 / 구분**: 150줄 / 4.9 KB (config)
- **계층 / Menu ID / 대칭 쌍**: `L06` / `alembic-config` / -
- **주요 Export 심볼**: `[alembic]`, `script_location`
- **정·역방향 의존성**: Out(1): `backend/alembic/env.py` | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Alembic`
- **핵심 기능 명세**: Alembic 마이그레이션 스크립트 경로 및 콘솔 로깅 포맷 설정 정의

#### `backend/alembic/env.py`
- **규모 / 구분**: 53줄 / 1.3 KB (entrypoint)
- **계층 / Menu ID / 대칭 쌍**: `L06` / `alembic-env` / -
- **주요 Export 심볼**: `get_url`, `run_migrations_offline`, `run_migrations_online`
- **정·역방향 의존성**: Out(2): `backend/app/models/__init__.py`, `backend/app/models/base.py` | In(1): `backend/alembic.ini`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Alembic`, `psycopg`
- **핵심 기능 명세**: ORM 메타데이터 로드 및 오프라인·온라인 PostgreSQL 스키마 마이그레이션 트랜잭션 실행

#### `backend/alembic/script.py.mako`
- **규모 / 구분**: 29줄 / 0.7 KB (config)
- **계층 / Menu ID / 대칭 쌍**: `L06` / `alembic-template` / -
- **주요 Export 심볼**: -
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Mako`
- **핵심 기능 명세**: 신규 Alembic 리비전 파일 자동 생성 시 사용되는 Mako 코드 템플릿 정의

#### `backend/alembic/versions/1f41ee9b8913_initial_schema.py`
- **규모 / 구분**: 238줄 / 11.9 KB (sql_migration)
- **계층 / Menu ID / 대칭 쌍**: `L06` / `alembic-rev-01` / -
- **주요 Export 심볼**: `upgrade`, `downgrade`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: `symptom_rules` | 외부: `Alembic`
- **핵심 기능 명세**: 초기 16개 기본 도메인 테이블 생성 및 롤백 삭제 DDL 마이그레이션 정의

#### `backend/alembic/versions/592f319e9774_add_unique_constraint_to_symptom_rules.py`
- **규모 / 구분**: 37줄 / 1.4 KB (sql_migration)
- **계층 / Menu ID / 대칭 쌍**: `L06` / `alembic-rev-02` / -
- **주요 Export 심볼**: `upgrade`, `downgrade`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: `symptom_rules` | 외부: `Alembic`
- **핵심 기능 명세**: 증상 규칙 테이블의 (keyword, part_code) 복합 고유 제약조건 생성 및 다운그레이드 복원 정의

#### `backend/alembic/versions/8b72c91a03e1_restore_trgm_and_add_vehicle_inventory.py`
- **규모 / 구분**: 48줄 / 2 KB (sql_migration)
- **계층 / Menu ID / 대칭 쌍**: `L06` / `alembic-rev-03` / -
- **주요 Export 심볼**: `upgrade`, `downgrade`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: `space_symptom_rules`, `space_vehicle_inventories`, `space_visit_parts`, `space_visits` | 외부: `Alembic`, `PostgreSQL pg_trgm`
- **핵심 기능 명세**: pg_trgm 확장 및 검색 인덱스 복원과 기사별 차량 부품 재고(space_vehicle_inventories) 테이블 생성

#### `backend/alembic/versions/a3f9d2c1e847_add_schedule_events_and_transfer_centers.py`
- **규모 / 구분**: 86줄 / 4 KB (sql_migration)
- **계층 / Menu ID / 대칭 쌍**: `L06` / `alembic-rev-04` / -
- **주요 Export 심볼**: `upgrade`, `downgrade`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: `schedule_events`, `space_customers`, `space_schedule_events`, `space_transfer_centers`, `space_visits`, `transfer_centers` | 외부: `Alembic`
- **핵심 기능 명세**: 이관센터 및 업무 일정 테이블 신설과 출장·고객 테이블의 일정 연동 및 사용업체 컬럼 추가

#### `backend/scripts/create_consult_knowledge.sql`
- **규모 / 구분**: 51줄 / 1.8 KB (sql_migration)
- **계층 / Menu ID / 대칭 쌍**: `L06` / `sql-ddl` / -
- **주요 Export 심볼**: `TABLE consult_knowledge`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: `consult_knowledge` | 외부: `PostgreSQL / Supabase`
- **핵심 기능 명세**: 통화록 분석 결과 저장용 consult_knowledge 테이블과 조회 인덱스 및 RLS 정책 생성

#### `backend/scripts/create_stt_audio_archives.sql`
- **규모 / 구분**: 84줄 / 4.7 KB (sql_migration)
- **계층 / Menu ID / 대칭 쌍**: `L06` / `sql-ddl` / -
- **주요 Export 심볼**: `TABLE stt_audio_archives`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: `stt_audio_archives` | 외부: `PostgreSQL / Supabase`
- **핵심 기능 명세**: 음성 파일 메타데이터, STT 전사 본문, AI 요약 결과를 통합 저장하는 stt_audio_archives 테이블과 RLS 정책 정의

#### `backend/scripts/migrate_dual_embedding.sql`
- **규모 / 구분**: 101줄 / 3.1 KB (sql_migration)
- **계층 / Menu ID / 대칭 쌍**: `L06` / `sql-migration` / -
- **주요 Export 심볼**: `TABLE consult_knowledge`, `FN match_similar_nomic`, `FN match_similar_openai`, `FN match_similar_calls`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: `consult_knowledge`, `match_similar_calls`, `match_similar_nomic`, `match_similar_openai` | 외부: `PostgreSQL pgvector`
- **핵심 기능 명세**: 상담 지식 테이블의 임베딩 컬럼을 nomic(768차원)과 openai(1536차원)로 분리하고 엔진별 검색 RPC 함수 생성

#### `backend/scripts/seed_symptom_rules_1.sql`
- **규모 / 구분**: 509줄 / 214.9 KB (sql_seed) | 시그널: `SQL_BULK_SEED`
- **계층 / Menu ID / 대칭 쌍**: `L06` / `sql-seed` / -
- **주요 Export 심볼**: -
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: `symptom_rules` | 외부: `PostgreSQL`
- **핵심 기능 명세**: 증상 키워드, 부품코드, 분류 체계, 조치 스크립트 규칙 데이터 1차 분할분(500건) 적재

#### `backend/scripts/seed_symptom_rules_2.sql`
- **규모 / 구분**: 509줄 / 216.9 KB (sql_seed) | 시그널: `SQL_BULK_SEED`
- **계층 / Menu ID / 대칭 쌍**: `L06` / `sql-seed` / -
- **주요 Export 심볼**: -
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: `symptom_rules` | 외부: `PostgreSQL`
- **핵심 기능 명세**: 증상 키워드 및 조치 스크립트 규칙 데이터 2차 분할분(500건) 적재

#### `backend/scripts/seed_symptom_rules_3.sql`
- **규모 / 구분**: 509줄 / 210.4 KB (sql_seed) | 시그널: `SQL_BULK_SEED`
- **계층 / Menu ID / 대칭 쌍**: `L06` / `sql-seed` / -
- **주요 Export 심볼**: -
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: `symptom_rules` | 외부: `PostgreSQL`
- **핵심 기능 명세**: 증상 키워드 및 조치 스크립트 규칙 데이터 3차 분할분(500건) 적재

#### `backend/scripts/seed_symptom_rules_4.sql`
- **규모 / 구분**: 509줄 / 201.2 KB (sql_seed) | 시그널: `SQL_BULK_SEED`
- **계층 / Menu ID / 대칭 쌍**: `L06` / `sql-seed` / -
- **주요 Export 심볼**: -
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: `symptom_rules` | 외부: `PostgreSQL`
- **핵심 기능 명세**: 급수·누수·주행·흡입 관련 증상 키워드 규칙 데이터 4차 분할분(500건) 적재

#### `backend/scripts/seed_symptom_rules_5.sql`
- **규모 / 구분**: 509줄 / 199.9 KB (sql_seed) | 시그널: `SQL_BULK_SEED`
- **계층 / Menu ID / 대칭 쌍**: `L06` / `sql-seed` / -
- **주요 Export 심볼**: -
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: `symptom_rules` | 외부: `PostgreSQL`
- **핵심 기능 명세**: 세제·소음·손잡이·솔레노이드 관련 증상 키워드 규칙 데이터 5차 분할분(500건) 적재

#### `backend/scripts/seed_symptom_rules_6.sql`
- **규모 / 구분**: 241줄 / 94.2 KB (sql_seed) | 시그널: `SQL_BULK_SEED`
- **계층 / Menu ID / 대칭 쌍**: `L06` / `sql-seed` / -
- **주요 Export 심볼**: -
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: `symptom_rules` | 외부: `PostgreSQL`
- **핵심 기능 명세**: 필터·호스 관련 잔여 증상 키워드 규칙 데이터 6차 분할분 적재

#### `backend/scripts/seed_symptom_synonyms_from_txt.sql`
- **규모 / 구분**: 8391줄 / 855 KB (sql_seed) | 시그널: `SQL_BULK_SEED`
- **계층 / Menu ID / 대칭 쌍**: `L06` / `sql-seed` / -
- **주요 Export 심볼**: `TABLE symptom_synonyms`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: `symptom_synonyms` | 외부: `PostgreSQL pg_trgm`
- **핵심 기능 명세**: 통화 녹취록 텍스트에서 추출한 고객 구어체 증상 표현 사전을 symptom_synonyms 테이블에 일괄 적재

#### `backend/scripts/seed_symptom_synonyms_ground_truth.sql`
- **규모 / 구분**: 774줄 / 67.3 KB (sql_seed)
- **계층 / Menu ID / 대칭 쌍**: `L06` / `sql-seed` / -
- **주요 Export 심볼**: `TABLE symptom_synonyms`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: `symptom_synonyms` | 외부: `PostgreSQL pg_trgm`
- **핵심 기능 명세**: 실제 상담 관측 어구와 한국어 어미 활용 변형 데이터를 symptom_synonyms 테이블에 적재

#### `backend/scripts/seed_wtt_master_all.sql`
- **규모 / 구분**: 198줄 / 19.3 KB (sql_seed)
- **계층 / Menu ID / 대칭 쌍**: `L06` / `sql-seed-wtt` / -
- **주요 Export 심볼**: -
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: `assets`, `audit_log_minimal`, `classification_attempts`, `consult_logs`, `customers`, `employees`, `llm_logs`, `parts`, `sales_inquiries`, `visit_parts`, `visit_status_history`, `visits` | 외부: `PostgreSQL`
- **핵심 기능 명세**: 1차(S1~S5) 및 2차(S6~S10) 워크스루 테스트용 전체 모의 운영 데이터를 단일 트랜잭션으로 적재

#### `backend/scripts/seed_wtt_mock_data.sql`
- **규모 / 구분**: 103줄 / 10.3 KB (sql_seed)
- **계층 / Menu ID / 대칭 쌍**: `L06` / `sql-seed-wtt` / -
- **주요 Export 심볼**: -
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: `assets`, `audit_log_minimal`, `consult_logs`, `customers`, `employees`, `llm_logs`, `parts`, `sales_inquiries`, `visit_parts`, `visit_status_history`, `visits` | 외부: `PostgreSQL`
- **핵심 기능 명세**: 1차 워크스루 테스트(S1~S5) 시나리오 검증을 위한 기본 마스터 및 트랜잭션 모의 데이터 적재

#### `backend/scripts/seed_wtt_mock_data_phase2.sql`
- **규모 / 구분**: 94줄 / 8.9 KB (sql_seed)
- **계층 / Menu ID / 대칭 쌍**: `L06` / `sql-seed-wtt` / -
- **주요 Export 심볼**: -
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: `audit_log_minimal`, `classification_attempts`, `consult_logs`, `customers`, `employees`, `parts`, `visit_status_history`, `visits` | 외부: `PostgreSQL`
- **핵심 기능 명세**: 2차 워크스루 테스트(S6~S10) 예외 시나리오 검증을 위한 모의 출장·상담·감사로그 데이터 적재

#### `scratch/supabase_data_injection.sql`
- **규모 / 구분**: 338줄 / 781.3 KB (sql_seed) | 시그널: `SQL_BULK_SEED`
- **계층 / Menu ID / 대칭 쌍**: `L06` / `sql-seed-migration` / -
- **주요 Export 심볼**: -
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: `employees`, `schedule_events` | 외부: `PostgreSQL / Supabase`
- **핵심 기능 명세**: 기존 시스템에서 추출한 직원 및 업무 일정(schedule_events) 데이터를 Supabase DB에 적재하는 SQL 덤프

### L07. 백엔드 운영·데이터 파이프라인·UI 감사 스크립트 (70개)

#### `backend/Dockerfile`
- **규모 / 구분**: 20줄 / 0.4 KB (config)
- **계층 / Menu ID / 대칭 쌍**: `L07` / `backend-docker` / -
- **주요 Export 심볼**: `EXPOSE 8000`, `CMD uvicorn app.main:app`
- **정·역방향 의존성**: Out(1): `backend/requirements.txt` | In(1): `docker-compose.yml`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Docker (python:3.11-slim)`
- **핵심 기능 명세**: 백엔드 FastAPI 서버 배포용 Docker 컨테이너 이미지 빌드 절차 정의

#### `backend/capture_impeccable_active.py`
- **규모 / 구분**: 30줄 / 1.2 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L07` / `ui-verification` / -
- **주요 Export 심볼**: `main`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Playwright`
- **핵심 기능 명세**: Playwright 헤드리스 브라우저로 로컬 프론트엔드 증상 선택 및 에러코드 탭 활성 상태 화면 캡처 저장

#### `backend/check_cust.py`
- **규모 / 구분**: 26줄 / 1 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L07` / `db-diagnostic` / -
- **주요 Export 심볼**: `check`
- **정·역방향 의존성**: Out(1): `backend/app/core/database.py` | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: `assets`, `customers` | 외부: `PostgreSQL`
- **핵심 기능 명세**: 원격 DB의 customers 및 assets 테이블 컬럼명·데이터타입 조회 출력

#### `backend/requirements.txt`
- **규모 / 구분**: 15줄 / 0.3 KB (config)
- **계층 / Menu ID / 대칭 쌍**: `L07` / `backend-deps` / -
- **주요 Export 심볼**: `fastapi`, `uvicorn`, `sqlalchemy`, `alembic`, `psycopg`, `psycopg-pool`, `pydantic`, `pydantic-settings`, `python-dotenv`, `httpx`, `pandas`, `asyncpg` 외 2건
- **정·역방향 의존성**: Out(0): - | In(2): `.github/workflows/deploy.yml`, `backend/Dockerfile`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `PyPI`
- **핵심 기능 명세**: 백엔드 서버 구동 및 DB·클라우드 연동에 필요한 Python 의존성 패키지 목록 명시

#### `backend/run_server.py`
- **규모 / 구분**: 28줄 / 0.6 KB (entrypoint)
- **계층 / Menu ID / 대칭 쌍**: `L07` / `backend-launcher` / -
- **주요 Export 심볼**: `start`
- **정·역방향 의존성**: Out(1): `backend/app/main.py` | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Uvicorn`
- **핵심 기능 명세**: Windows SelectorEventLoopPolicy 적용 후 127.0.0.1:8000 로컬 Uvicorn 서버 기동

#### `backend/scripts/STT.bat`
- **규모 / 구분**: 41줄 / 0.7 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L07` / `batch-launcher` / -
- **주요 Export 심볼**: -
- **정·역방향 의존성**: Out(1): `backend/scripts/batch_analyze_stt.py` | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Windows cmd`
- **핵심 기능 명세**: UTF-8 콘솔 코드페이지를 설정하고 batch_analyze_stt.py 통화록 배치 분석 스크립트 실행

#### `backend/scripts/STT배치분석_실행.bat`
- **규모 / 구분**: 23줄 / 0.7 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L07` / `batch-launcher` / -
- **주요 Export 심볼**: -
- **정·역방향 의존성**: Out(1): `backend/scripts/batch_analyze_stt.py` | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Windows cmd`
- **핵심 기능 명세**: 한글 상태 안내문을 출력하고 체크포인트 이어받기를 지원하는 batch_analyze_stt.py 실행

#### `backend/scripts/analyze_db_symptoms.py`
- **규모 / 구분**: 57줄 / 2.2 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L07` / `data-pipeline` / -
- **주요 Export 심볼**: `analyze_symptoms`, `DB_URL`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: `consult_knowledge`, `space_consult_knowledge` | 외부: `psycopg`
- **핵심 기능 명세**: DB에 적재된 증상수리 상담 레코드에서 장비 모델별 건수와 상위 빈출 증상 집계

#### `backend/scripts/analyze_error_codes.py`
- **규모 / 구분**: 82줄 / 3.8 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L07` / `data-pipeline` / -
- **주요 Export 심볼**: `analyze_errors`, `DB_URL`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: `consult_knowledge`, `space_consult_knowledge` | 외부: `psycopg`
- **핵심 기능 명세**: 상담 녹취록과 요약문에서 정규표현식으로 계기판 에러 코드 패턴과 출현 빈도 추출

#### `backend/scripts/apply_detail_studio_theme.py`
- **규모 / 구분**: 175줄 / 13.3 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L07` / `ui-theme-patch` / -
- **주요 Export 심볼**: `apply_detail_studio_theme`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: 상담 지원 화면의 종이 질감 배경 속성을 제거하고 우측 디테일 스튜디오 대기 카드 배경색 변경

#### `backend/scripts/apply_official_error_codes.py`
- **규모 / 구분**: 183줄 / 9.3 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L07` / `code-generator` / -
- **주요 Export 심볼**: -
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: 12종 공식 계기판 에러 코드 상수와 /official-error-codes 조회 엔드포인트를 백엔드 코드에 주입

#### `backend/scripts/apply_paper_texture.py`
- **규모 / 구분**: 160줄 / 9.9 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L07` / `ui-theme-patch` / -
- **주요 Export 심볼**: `update_counsel_assist_v2`, `update_counsel_compare`, `update_schedule_page`, `update_modals`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: 데스크탑 프론트엔드 5개 컴포넌트의 카드 및 모달 배경에 종이 질감 CSS 변수와 웜톤 색상 코드 일괄 적용

#### `backend/scripts/apply_paper_texture_theme.py`
- **규모 / 구분**: 541줄 / 39 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L07` / `ui-theme-patch` / -
- **주요 Export 심볼**: `update_counsel_assist_v2`, `update_schedule_page`, `update_counsel_compare`, `update_event_modals`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: 데스크탑 주요 화면의 슬레이트·백색 배경 및 테두리 색상을 종이 질감 테마 색상 토큰으로 치환

#### `backend/scripts/audit_and_map_5colors.py`
- **규모 / 구분**: 72줄 / 3.2 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L07` / `ui-audit` / -
- **주요 Export 심볼**: `find_unapproved_colors`, `FRONTEND_SRC`, `APPROVED_5_FAMILIES`, `ALL_APPROVED`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: 프론트엔드 소스 파일에서 5대 표준 색상군에 속하지 않는 미승인 HEX 색상 코드와 위치 목록 검출

#### `backend/scripts/audit_impeccable_deep.py`
- **규모 / 구분**: 44줄 / 1.8 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L07` / `ui-audit` / -
- **주요 Export 심볼**: `check_files`, `FRONTEND_SRC`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: 프론트엔드 코드에서 측면 두꺼운 테두리, 바운스 애니메이션, 10pt 미만 폰트 크기 위반 항목 검사

#### `backend/scripts/audit_paper_texture.py`
- **규모 / 구분**: 11줄 / 0.4 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L07` / `ui-audit` / -
- **주요 Export 심볼**: -
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: 프론트엔드 소스 파일별 #fff 및 #ffffff 백색 코드 잔존 건수 집계 출력

#### `backend/scripts/audit_pure_white_bg.py`
- **규모 / 구분**: 44줄 / 1.8 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L07` / `ui-audit` / -
- **주요 Export 심볼**: `SRC_DIR`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: 프론트엔드 스타일 속성 중 배경색에 순백색(#fff, #ffffff, white)이 지정된 라인 검출

#### `backend/scripts/batch_analyze_stt.py`
- **규모 / 구분**: 297줄 / 11.6 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L07` / `data-pipeline` / -
- **주요 Export 심볼**: `read_file`, `parse_filename`, `ollama_call`, `clean_json`, `classify_1차`, `analyze_2차`, `load_checkpoint`, `save_checkpoint`, `log_error`, `main`, `STT_DIR`, `CHECKPOINT` 외 8건
- **정·역방향 의존성**: Out(0): - | In(2): `backend/scripts/STT.bat`, `backend/scripts/STT배치분석_실행.bat`
- **접근 DB 테이블 · 외부 연동**: DB: `consult_knowledge`, `space_consult_knowledge` | 외부: `Ollama HTTP (gemma3:12b)`, `psycopg`
- **핵심 기능 명세**: 통화 텍스트 파일을 Ollama 모델로 1차 유형 분류 및 2차 증상 분석한 뒤 체크포인트 기반으로 DB 적재

#### `backend/scripts/benchmark_models.py`
- **규모 / 구분**: 105줄 / 4.7 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L07` / `benchmark` / -
- **주요 Export 심볼**: `benchmark`, `API_BASE`, `HEADERS`, `TEST_QUERIES`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: `consult_knowledge` | 외부: `FastAPI (/api/v1/counsel/*)`
- **핵심 기능 명세**: 로컬 bge-m3 임베딩과 OpenAI 임베딩의 유사도 검색 결과 및 액션플랜 API 응답 시간 비교 측정

#### `backend/scripts/build_symptom_synonyms_corpus.js`
- **규모 / 구분**: 137줄 / 4.9 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L07` / `data-pipeline` / -
- **주요 Export 심볼**: -
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: 통화 빈도 JSON에서 고객 증상 발화 어구를 추출하고 표준 부품코드로 분류하여 요약 JSON과 시드 SQL 생성

#### `backend/scripts/build_symptom_synonyms_corpus.py`
- **규모 / 구분**: 128줄 / 5.4 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L07` / `data-pipeline` / -
- **주요 Export 심볼**: `classify_expression`, `main`, `SOURCE_EXPR_PATH`, `SOURCE_TECH_PATH`, `MERGED_TECH_PATH`, `OUTPUT_SQL_PATH`, `CATEGORY_RULES`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: `symptom_synonyms` | 외부: -
- **핵심 기능 명세**: 통화 빈도 파일의 고객 발화 어구를 정규식 규칙으로 부품코드에 매핑하여 통계 JSON 및 동의어 SQL 파일 작성

#### `backend/scripts/check_canonical_titles.py`
- **규모 / 구분**: 14줄 / 0.6 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L07` / `diagnostic` / -
- **주요 Export 심볼**: -
- **정·역방향 의존성**: Out(1): `backend/app/api/v1/endpoints/canonical_symptoms.py` | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: 16종 표준 장애 유형 타이틀의 슬래시(/) 포함 여부와 매핑 부품코드 콘솔 출력

#### `backend/scripts/check_live_vercel_status.py`
- **규모 / 구분**: 20줄 / 0.9 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L07` / `deploy-check` / -
- **주요 Export 심볼**: -
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Vercel Production URL`
- **핵심 기능 명세**: 운영 Vercel 배포 페이지의 번들 에셋 경로와 CSS 내 테마 변수 반영 여부 조회

#### `backend/scripts/create_bge_hnsw.py`
- **규모 / 구분**: 43줄 / 1.4 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L07` / `db-migration-helper` / -
- **주요 Export 심볼**: `create_index`, `DB_URL`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: `consult_knowledge`, `space_consult_knowledge` | 외부: `psycopg`, `pgvector`
- **핵심 기능 명세**: 상담 지식 테이블의 embedding_bge 벡터 컬럼에 코사인 거리 기반 HNSW 인덱스 생성

#### `backend/scripts/download_j600_pdf.py`
- **규모 / 구분**: 43줄 / 1.5 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L07` / `manual-crawler` / -
- **주요 Export 심볼**: -
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `space-dust.com`
- **핵심 기능 명세**: 제조사 웹사이트 게시글에서 세션 쿠키와 다운로드 링크를 획득하여 J600 매뉴얼 PDF 파일 저장

#### `backend/scripts/embed_batch.py`
- **규모 / 구분**: 158줄 / 5.4 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L07` / `embedding-pipeline` / -
- **주요 Export 심볼**: `generate_embeddings`, `build_text`, `load_cp`, `save_cp`, `main`, `ENV_PATH`, `DB_URL`, `EMBED_MODEL`, `OLLAMA_URL`, `BATCH_SIZE`, `CHECKPOINT_PATH`, `LOG_PATH`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: `space_consult_knowledge` | 외부: `Ollama HTTP (nomic-embed-text)`, `psycopg`
- **핵심 기능 명세**: 증상수리 상담 레코드를 로컬 Ollama nomic-embed-text 768차원 벡터로 변환하여 DB 배치 갱신

#### `backend/scripts/embed_batch_bge.py`
- **규모 / 구분**: 206줄 / 8.3 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L07` / `embedding-pipeline` / -
- **주요 Export 심볼**: `clean_text`, `generate_single_embedding`, `generate_embeddings_batch`, `build_text`, `load_cp`, `save_cp`, `main`, `DB_URL`, `EMBED_MODEL`, `OLLAMA_URL`, `BATCH_SIZE`, `CHECKPOINT_PATH` 외 2건
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: `space_consult_knowledge` | 외부: `Ollama HTTP (bge-m3)`, `psycopg`
- **핵심 기능 명세**: 증상수리 상담 레코드를 bge-m3 1024차원 벡터로 임베딩하고 NaN 발생 시 개별 폴백 처리하여 DB 저장

#### `backend/scripts/embed_batch_openai.py`
- **규모 / 구분**: 186줄 / 6.4 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L07` / `embedding-pipeline` / -
- **주요 Export 심볼**: `generate_embeddings`, `build_text`, `load_cp`, `save_cp`, `main`, `ENV_PATH`, `OPENAI_API_KEY`, `DB_URL`, `EMBED_MODEL`, `BATCH_SIZE`, `CHECKPOINT_PATH`, `LOG_PATH`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: `consult_knowledge`, `space_consult_knowledge` | 외부: `OpenAI Embeddings API (text-embedding-3-small)`, `psycopg`
- **핵심 기능 명세**: 증상수리 상담 레코드를 OpenAI 1536차원 임베딩 벡터로 변환하여 DB 컬럼에 배치 저장

#### `backend/scripts/extract_all_symptoms.py`
- **규모 / 구분**: 38줄 / 1.4 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L07` / `data-pipeline` / -
- **주요 Export 심볼**: `get_detailed_symptoms`, `DB_URL`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: `space_consult_knowledge` | 외부: `psycopg`
- **핵심 기능 명세**: 7개 장비 모델별 증상수리 상담 표본을 조회하여 모델별 빈출 증상 상위 12건 집계

#### `backend/scripts/find_all_bg_whites.py`
- **규모 / 구분**: 24줄 / 0.9 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L07` / `ui-audit` / -
- **주요 Export 심볼**: `SRC_DIR`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: 프론트엔드 파일에서 텍스트 색상을 제외한 배경 스타일 내 #fff 및 white 사용 구문 출력

#### `backend/scripts/find_manufacturers.py`
- **규모 / 구분**: 46줄 / 1.9 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L07` / `diagnostic` / -
- **주요 Export 심볼**: `find_manufacturers`, `DB_URL`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: `space_consult_knowledge` | 외부: `psycopg`
- **핵심 기능 명세**: 상담 지식 DB의 파일명과 녹취록 본문에서 거래처·제조사·수입사 관련 키워드 출현 사례 검색

#### `backend/scripts/generate_sql.py`
- **규모 / 구분**: 109줄 / 7.6 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L07` / `data-pipeline` / -
- **주요 Export 심볼**: `format_val`, `DRAFT_SCRIPTS`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: `space_symptom_rules`, `symptom_rules` | 외부: -
- **핵심 기능 명세**: 상담 분석 CSV 데이터를 증상 어구별로 집계하고 표준 점검 스크립트를 매핑하여 분할 시드 SQL 파일 생성

#### `backend/scripts/generate_synonyms_sql.js`
- **규모 / 구분**: 100줄 / 4.4 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L07` / `data-pipeline` / -
- **주요 Export 심볼**: -
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: `space_symptom_synonyms` | 외부: -
- **핵심 기능 명세**: 추출된 기술 증상 어구에 한국어 구어체 어미 활용형을 결합하여 space_symptom_synonyms 적재용 SQL 파일 생성

#### `backend/scripts/generate_wtt_mock_sql.py`
- **규모 / 구분**: 175줄 / 11.7 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L07` / `wtt-seed-generator` / -
- **주요 Export 심볼**: `gen_sql`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: `space_assets`, `space_audit_log_minimal`, `space_consult_logs`, `space_customers`, `space_employees`, `space_llm_logs`, `space_parts`, `space_sales_inquiries`, `space_visit_parts`, `space_visit_status_history`, `space_visits` | 외부: -
- **핵심 기능 명세**: 1차 워크스루 테스트(S1~S5) 검증용 직원·고객·자산·부품·상담·출장·감사로그 모의 데이터 SQL 파일 생성

#### `backend/scripts/generate_wtt_mock_sql_all.py`
- **규모 / 구분**: 297줄 / 21.1 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L07` / `wtt-seed-generator` / -
- **주요 Export 심볼**: `gen_all_sql_seeds`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: `space_assets`, `space_audit_log_minimal`, `space_classification_attempts`, `space_consult_logs`, `space_customers`, `space_employees`, `space_llm_logs`, `space_parts`, `space_sales_inquiries`, `space_visit_parts`, `space_visit_status_history`, `space_visits` | 외부: -
- **핵심 기능 명세**: 1차(S1~S5)와 2차(S6~S10) 워크스루 테스트 모의 데이터를 생성하고 단일 마스터 SQL 파일로 병합 저장

#### `backend/scripts/generate_wtt_mock_sql_phase2.py`
- **규모 / 구분**: 168줄 / 11.2 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L07` / `wtt-seed-generator` / -
- **주요 Export 심볼**: `gen_phase2_sql`, `gen_master_all_sql`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: `space_audit_log_minimal`, `space_classification_attempts`, `space_consult_logs`, `space_customers`, `space_employees`, `space_parts`, `space_visit_status_history`, `space_visits` | 외부: -
- **핵심 기능 명세**: 재고 부족 재방문, 오프라인 동기화, 상담사 수동 교정, 반복 고장 승격 시나리오용 2차 WTT 시드 SQL 생성

#### `backend/scripts/import_fact_csv.py`
- **규모 / 구분**: 111줄 / 8.3 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L07` / `data-pipeline` / -
- **주요 Export 심볼**: `run_import`, `DRAFT_SCRIPTS`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: `space_symptom_rules`, `symptom_rules` | 외부: `psycopg`, `pandas`
- **핵심 기능 명세**: 상담 분석 팩트 CSV의 증상 어구와 점검 스크립트를 집계하여 space_symptom_rules 테이블에 청크 단위 적재

#### `backend/scripts/inspect_error_dialogues.py`
- **규모 / 구분**: 34줄 / 1.3 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L07` / `diagnostic` / -
- **주요 Export 심볼**: `inspect_dialogues`, `DB_URL`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: `space_consult_knowledge` | 외부: `psycopg`
- **핵심 기능 명세**: 녹취록 본문에 에러 코드 관련 표현이 포함된 상담 레코드 30건의 요약문과 전후 문맥 조회

#### `backend/scripts/inspect_file.py`
- **규모 / 구분**: 38줄 / 1.4 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L07` / `ui-audit` / -
- **주요 Export 심볼**: `inspect`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: 지정한 프론트엔드 파일에서 10pt 미만 폰트 크기 선언 라인을 검출하여 콘솔 또는 파일 출력

#### `backend/scripts/inspect_non5_details.py`
- **규모 / 구분**: 69줄 / 2.1 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L07` / `ui-audit` / -
- **주요 Export 심볼**: `inspect_file`, `FRONTEND_SRC`, `APPROVED_5_FAMILIES`, `ALL_APPROVED`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: 주요 프론트엔드 파일 9종을 순회하며 5대 표준 색상군 외 HEX 코드 사용 라인과 코드값 출력

#### `backend/scripts/inspect_other_manuals.py`
- **규모 / 구분**: 72줄 / 2.6 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L07` / `manual-crawler` / -
- **주요 Export 심볼**: -
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `space-dust.com`, `pdfplumber`
- **핵심 기능 명세**: 제조사 게시판에서 S5·S7P·J800·R3 매뉴얼 PDF를 다운로드하고 에러 코드 관련 문구 추출

#### `backend/scripts/merge_phrases.js`
- **규모 / 구분**: 161줄 / 6.5 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L07` / `data-pipeline` / -
- **주요 Export 심볼**: -
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: `space_symptom_synonyms` | 외부: -
- **핵심 기능 명세**: 개별 추출된 구어체 JSON 파일들을 병합·중복 제거하여 마스터 동의어 JSON과 DB 시드 SQL 파일 생성

#### `backend/scripts/migrate_bge.py`
- **규모 / 구분**: 108줄 / 3.5 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L07` / `db-migration-helper` / -
- **주요 Export 심볼**: `DB_URL`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: `match_similar_bge`, `match_similar_calls`, `match_similar_nomic`, `space_consult_knowledge` | 외부: `Ollama HTTP (bge-m3)`, `psycopg`
- **핵심 기능 명세**: Ollama bge-m3 1024차원 동작을 검증한 후 embedding_bge 컬럼과 코사인 유사도 검색 RPC 함수를 DB에 등록

#### `backend/scripts/migrate_parts_catalog.py`
- **규모 / 구분**: 379줄 / 17.7 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L07` / `db-migration-helper` / -
- **주요 Export 심볼**: `create_part_svg`, `main`, `INITIAL_PARTS`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: `space_parts_catalog`, `space_parts_orders` | 외부: `psycopg`
- **핵심 기능 명세**: 부품 카탈로그 및 주문 테이블과 RLS 정책을 생성하고 SVG 도해가 포함된 16종 표준 소모품 데이터 적재

#### `backend/scripts/migrate_symptom_photos.py`
- **규모 / 구분**: 58줄 / 2.7 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L07` / `db-migration-helper` / -
- **주요 Export 심볼**: `main`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: `space_symptom_guide_photos` | 외부: `psycopg`, `Supabase Storage`
- **핵심 기능 명세**: 증상 가이드 사진 저장용 Supabase 스토리지 버킷과 space_symptom_guide_photos 메타데이터 테이블 및 접근 정책 생성

#### `backend/scripts/mine_all_error_codes.py`
- **규모 / 구분**: 64줄 / 3 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L07` / `data-pipeline` / -
- **주요 Export 심볼**: `mine_all_codes`, `DB_URL`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: `space_consult_knowledge` | 외부: `psycopg`
- **핵심 기능 명세**: 에러·알람 관련 상담 녹취록에서 영문·숫자·한글 표기 에러 코드와 주변 발화 문맥을 빈도순 추출

#### `backend/scripts/mine_canonical_symptoms.py`
- **규모 / 구분**: 221줄 / 9.9 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L07` / `data-pipeline` / -
- **주요 Export 심볼**: `extract_dialogue_snippets`, `run_mining`, `DB_URL`, `CANONICAL_TARGETS`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: `consult_knowledge`, `space_consult_knowledge` | 외부: `psycopg`
- **핵심 기능 명세**: 16종 표준 장애 유형별로 상담 지식 DB에서 매칭 통화와 조치 대화 발췌문을 추출하여 JSON 파일 저장

#### `backend/scripts/package.json`
- **규모 / 구분**: 17줄 / 0.3 KB (config)
- **계층 / Menu ID / 대칭 쌍**: `L07` / `backend-scripts-pkg` / -
- **주요 Export 심볼**: `script:test`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `pg`
- **핵심 기능 명세**: 백엔드 Node.js 유틸리티 스크립트 실행용 CommonJS 설정 및 PostgreSQL 드라이버 의존성 정의

#### `backend/scripts/parse_j600_pdf.py`
- **규모 / 구분**: 35줄 / 1.1 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L07` / `manual-parser` / -
- **주요 Export 심볼**: -
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `pdfplumber`
- **핵심 기능 명세**: J600 매뉴얼 PDF 전체 페이지 텍스트를 추출하고 고장·에러 키워드 포함 페이지를 탐색하여 텍스트 파일 저장

#### `backend/scripts/post_embed_chain.py`
- **규모 / 구분**: 149줄 / 5.5 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L07` / `embedding-pipeline` / -
- **주요 Export 심볼**: `step1_check_nomic_done`, `step2_migrate`, `step3_check_openai`, `step4_run_openai_batch`, `main`, `ENV_PATH`, `LOG_PATH`, `DB_URL`, `SQL_PATH`, `OPENAI_BATCH`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: `consult_knowledge`, `space_consult_knowledge` | 외부: `psycopg`, `OpenAI Embeddings API`
- **핵심 기능 명세**: nomic 임베딩 완료 여부를 확인한 뒤 컬럼 분리 SQL 실행과 OpenAI 임베딩 배치 스크립트 호출을 순차 수행

#### `backend/scripts/refactor_canonical_titles.py`
- **규모 / 구분**: 109줄 / 7.7 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L07` / `code-refactor` / -
- **주요 Export 심볼**: -
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: 16종 표준 장애 유형의 복합 명칭 타이틀을 단일 현상 명사로 치환하고 기존 명칭을 aliases 배열로 이동

#### `backend/scripts/run_phrase_extractor.js`
- **규모 / 구분**: 289줄 / 11.2 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L07` / `data-pipeline` / -
- **주요 Export 심볼**: -
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Ollama HTTP (gemma3:1b)`
- **핵심 기능 명세**: 통화 녹취록 텍스트에서 인사말을 제거한 뒤 로컬 Ollama 모델로 고객 증상 발화 어구를 추출하여 개별 JSON 저장

#### `backend/scripts/run_wtt_tests.py`
- **규모 / 구분**: 132줄 / 6.9 KB (test)
- **계층 / Menu ID / 대칭 쌍**: `L07` / `wtt-e2e` / -
- **주요 Export 심볼**: `run_e2e_wtt`
- **정·역방향 의존성**: Out(2): `backend/app/core/database.py`, `backend/app/main.py` | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: `space_parts` | 외부: `httpx ASGI TestClient`
- **핵심 기능 명세**: FastAPI ASGI 인메모리 클라이언트로 키워드 분류, 상담 등록, 출장 접수·상태전이·부품차감·완료 API 흐름 검증

#### `backend/scripts/run_wtt_tests_phase2.py`
- **규모 / 구분**: 209줄 / 11.1 KB (test)
- **계층 / Menu ID / 대칭 쌍**: `L07` / `wtt-e2e` / -
- **주요 Export 심볼**: -
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: `space_classification_attempts`, `space_consult_logs`, `space_customers`, `space_parts`, `space_symptom_rules`, `space_visit_status_history`, `space_visits` | 외부: `psycopg`
- **핵심 기능 명세**: 복합 증상 우선순위, 재고 부족 롤백, 오프라인 지연 동기화, 수동 교정 기록, 반복 고장 승격 등 2차 WTT 5대 시나리오 검증

#### `backend/scripts/save_all_manuals.py`
- **규모 / 구분**: 89줄 / 3.6 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L07` / `manual-crawler` / -
- **주요 Export 심볼**: `SAVE_DIR`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `space-dust.com`
- **핵심 기능 명세**: 제조사 매뉴얼 게시판 wr_id 1~25번 게시물을 순회하여 첨부 PDF 문서를 docs/manuals 폴더에 다운로드

#### `backend/scripts/scan_all_colors.py`
- **규모 / 구분**: 44줄 / 1.3 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L07` / `ui-audit` / -
- **주요 Export 심볼**: `scan_colors`, `FRONTEND_SRC`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: 프론트엔드 전체 파일에서 사용된 HEX 및 RGBA 색상 코드의 출현 빈도와 파일별 고유 색상 수 집계

#### `backend/scripts/scan_font_sizes.py`
- **규모 / 구분**: 59줄 / 2.4 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L07` / `ui-audit` / -
- **주요 Export 심볼**: `scan`, `SRC_DIR`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: 데스크탑 프론트엔드 소스 트리를 순회하여 10pt 미만 폰트 크기 위반 항목을 파일별로 집계

#### `backend/scripts/seed_action_scripts.py`
- **규모 / 구분**: 50줄 / 5.3 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L07` / `db-seed-script` / -
- **주요 Export 심볼**: `seed_drafts`, `DRAFT_SCRIPTS`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: `space_symptom_rules` | 외부: `psycopg`
- **핵심 기능 명세**: 18종 표준 부품코드별 5단계 점검 스크립트 JSON을 space_symptom_rules 테이블에 일괄 갱신

#### `backend/scripts/seed_part_codes2.py`
- **규모 / 구분**: 49줄 / 1.7 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L07` / `db-seed-script` / -
- **주요 Export 심볼**: `seed`, `DATABASE_URL`, `PART_CODES`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: `space_part_codes` | 외부: `SQLAlchemy AsyncSession`
- **핵심 기능 명세**: 비동기 SQLAlchemy 세션을 통해 18종 표준 부품코드와 한글 설명을 space_part_codes 테이블에 적재

#### `backend/scripts/seed_part_codes_sync.py`
- **규모 / 구분**: 49줄 / 1.7 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L07` / `db-seed-script` / -
- **주요 Export 심볼**: `seed`, `DATABASE_URL`, `PART_CODES`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: `space_part_codes` | 외부: `psycopg`
- **핵심 기능 명세**: 동기 psycopg 커넥션을 통해 18종 표준 부품코드 마스터 데이터를 space_part_codes 테이블에 적재

#### `backend/scripts/seed_phrases_to_db.js`
- **규모 / 구분**: 116줄 / 4.7 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L07` / `db-seed-script` / -
- **주요 Export 심볼**: -
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: `space_symptom_synonyms` | 외부: `pg`
- **핵심 기능 명세**: 마스터 구어체 사전 JSON 데이터를 250건 단위 배치로 분할하여 space_symptom_synonyms 테이블과 pg_trgm 인덱스에 적재

#### `backend/scripts/setup_supabase_vault.py`
- **규모 / 구분**: 83줄 / 3.4 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L07` / `security-infra` / -
- **주요 Export 심볼**: `setup_vault`, `DB_URL`, `DDL_SQL`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: `private_vault.system_secrets` | 외부: `psycopg`
- **핵심 기능 명세**: 외부 노출이 차단된 private_vault.system_secrets 스키마·테이블을 생성하고 CLOVA 및 OpenAI API 키를 이관 저장

#### `backend/scripts/silent_stt_poc.py`
- **규모 / 구분**: 43줄 / 1.6 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L07` / `stt-poc` / -
- **주요 Export 심볼**: `run_poc`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `soundcard WASAPI`
- **핵심 기능 명세**: Windows 기본 스피커의 WASAPI 루프백 수음 장치 바인딩 가능 여부를 점검하는 개념 검증 스크립트

#### `backend/scripts/take_impeccable_screenshots.py`
- **규모 / 구분**: 50줄 / 2 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L07` / `ui-verification` / -
- **주요 Export 심볼**: `main`, `ARTIFACT_DIR`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Playwright`
- **핵심 기능 명세**: 로컬 개발 서버의 4개 주요 라우트 화면에 접속하여 UI 검수용 스크린샷 캡처 저장

#### `backend/scripts/test_api_symptoms.py`
- **규모 / 구분**: 26줄 / 0.8 KB (test)
- **계층 / Menu ID / 대칭 쌍**: `L07` / `api-verification` / -
- **주요 Export 심볼**: -
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `FastAPI (/api/v1/counsel/model-symptoms)`
- **핵심 기능 명세**: 로컬 백엔드 /model-symptoms API 응답에서 16종 표준 증상 타이틀의 슬래시(/) 제거 여부 검증

#### `backend/scripts/test_official_codes.py`
- **규모 / 구분**: 14줄 / 0.5 KB (test)
- **계층 / Menu ID / 대칭 쌍**: `L07` / `api-verification` / -
- **주요 Export 심볼**: -
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `FastAPI (/api/v1/counsel/official-error-codes)`
- **핵심 기능 명세**: 로컬 백엔드 /official-error-codes API를 호출하여 공식 에러 코드 목록과 판정 유형 반환 확인

#### `backend/scripts/verify_live_counsel_states.py`
- **규모 / 구분**: 53줄 / 1.9 KB (test)
- **계층 / Menu ID / 대칭 쌍**: `L07` / `live-e2e` / -
- **주요 Export 심볼**: `main`, `ARTIFACT_DIR`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Playwright`, `Vercel Production URL`
- **핵심 기능 명세**: 운영 Vercel 앱에서 증상 선택, 상황별 수칙 모달, 제원·규격 모달 활성화 상태를 구동하고 스크린샷 저장

#### `backend/scripts/verify_live_vercel_impeccable.py`
- **규모 / 구분**: 40줄 / 1.5 KB (test)
- **계층 / Menu ID / 대칭 쌍**: `L07` / `live-e2e` / -
- **주요 Export 심볼**: `main`, `ARTIFACT_DIR`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Playwright`, `Vercel Production URL`
- **핵심 기능 명세**: 운영 Vercel에 배포된 메인 상담, 일정 관리, 임베딩 비교 3개 화면 렌더링 상태 검증 및 스크린샷 저장

#### `backend/scripts/verify_vault_security.py`
- **규모 / 구분**: 107줄 / 5.3 KB (test)
- **계층 / Menu ID / 대칭 쌍**: `L07` / `security-audit` / -
- **주요 Export 심볼**: `run_security_audit`
- **정·역방향 의존성**: Out(1): `backend/app/core/secret_vault.py` | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: `private_vault.system_secrets` | 외부: `NAVER CLOVA REST API`, `psycopg`
- **핵심 기능 명세**: 소스 내 평문 API 키 부재, anon/authenticated 롤의 볼트 접근 차단 및 인메모리 시크릿 기반 CLOVA STT 인증 검증

#### `backend/scripts/wait_for_vercel.py`
- **규모 / 구분**: 16줄 / 0.5 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L07` / `deploy-check` / -
- **주요 Export 심볼**: -
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Vercel Production URL`
- **핵심 기능 명세**: 운영 Vercel 메인 HTML을 주기적으로 조회하여 신규 CSS 번들 해시 배포 완료 여부 확인

### L08. 백엔드 단위·통합·E2E 테스트 (7개)

#### `backend/test_db.py`
- **규모 / 구분**: 20줄 / 0.4 KB (test)
- **계층 / Menu ID / 대칭 쌍**: `L08` / `db-smoke-test` / -
- **주요 Export 심볼**: -
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `psycopg`
- **핵심 기능 명세**: 환경변수 DATABASE_URL 기준 PostgreSQL 동기 연결 성공 여부 반복 점검

#### `backend/test_e2e_model_error_codes.py`
- **규모 / 구분**: 75줄 / 2.9 KB (test)
- **계층 / Menu ID / 대칭 쌍**: `L08` / `frontend-e2e-test` / -
- **주요 Export 심볼**: `run_test`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Playwright`
- **핵심 기능 명세**: 장비 모델(J600T, S7, S12, W12) 전환 및 에러코드 칩 선택 동작을 브라우저에서 검증하고 화면 캡처 저장

#### `backend/test_existing_turbo.py`
- **규모 / 구분**: 19줄 / 0.8 KB (test)
- **계층 / Menu ID / 대칭 쌍**: `L08` / `stt-benchmark-test` / -
- **주요 Export 심볼**: -
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Faster-Whisper`, `CUDA`
- **핵심 기능 명세**: CUDA float16 환경에서 large-v3-turbo 모델 로드 시간 및 샘플 음성 파일 전사 소요 시간 측정

#### `backend/test_gpu_inference.py`
- **규모 / 구분**: 34줄 / 1.3 KB (test)
- **계층 / Menu ID / 대칭 쌍**: `L08` / `stt-gpu-test` / -
- **주요 Export 심볼**: -
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Faster-Whisper`, `CTranslate2`, `NVIDIA CUDA`
- **핵심 기능 명세**: CUDA 디바이스 수 확인 및 large-v3-turbo 모델의 한국어 샘플 오디오 전사 추론 검증

#### `backend/test_whisper.py`
- **규모 / 구분**: 23줄 / 0.8 KB (test)
- **계층 / Menu ID / 대칭 쌍**: `L08` / `stt-smoke-test` / -
- **주요 Export 심볼**: -
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Faster-Whisper`, `CTranslate2`
- **핵심 기능 명세**: CTranslate2 버전·CUDA 장치 수 조회 및 Whisper small 모델 초기화 가능 여부 점검

#### `backend/tests/test_providers.py`
- **규모 / 구분**: 163줄 / 6.3 KB (test)
- **계층 / Menu ID / 대칭 쌍**: `L08` / `backend-unit-test` / -
- **주요 Export 심볼**: `test_local_storage`, `test_messaging_mock`, `test_telephony_pipeline`, `test_groq_stt`, `test_groq_llm`, `main`
- **정·역방향 의존성**: Out(10): `backend/app/core/config.py`, `backend/app/services/ai/__init__.py`, `backend/app/services/ai/base.py`, `backend/app/services/ai/llm_groq.py`, `backend/app/services/ai/stt_groq.py`, `backend/app/services/ai/stt_mock.py`, `backend/app/services/messaging/mock.py`, `backend/app/services/messaging/sejong.py`, `backend/app/services/storage/local_storage.py`, `backend/app/services/telephony/generic_webhook.py` | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Groq Audio API`, `Groq Chat API`
- **핵심 기능 명세**: 로컬 스토리지 CRUD, 모의 메시징 발송·웹훅 파싱, 모의 공급자 기반 통화 녹음 파이프라인, Groq STT·LLM 공급자 팩토리 및 안전 폴백 단위 검증

#### `backend/tests/test_telecom_api.py`
- **규모 / 구분**: 79줄 / 2.6 KB (test)
- **계층 / Menu ID / 대칭 쌍**: `L08` / `backend-api-test` / -
- **주요 Export 심볼**: `test_telecom_endpoints`, `test_telephony_endpoints`, `main`
- **정·역방향 의존성**: Out(1): `backend/app/main.py` | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `FastAPI TestClient`
- **핵심 기능 명세**: 메시징 발송·웹훅 엔드포인트 및 PBX 통화 이벤트·녹음 업로드 API 통합 응답 검증

### L09. 데스크톱 배치 STT·LLM 파서 도구 (ConsultParser) (21개)

#### `tools/ConsultParser/core/__init__.py`
- **규모 / 구분**: 4줄 / 0 KB (config)
- **계층 / Menu ID / 대칭 쌍**: `L09` / `pkg-marker` / -
- **주요 Export 심볼**: -
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: ConsultParser 코어 모듈 패키지 선언 파일

#### `tools/ConsultParser/core/config.json`
- **규모 / 구분**: 47줄 / 8.6 KB (config)
- **계층 / Menu ID / 대칭 쌍**: `L09` / `ConsultParser-config` / -
- **주요 Export 심볼**: `engine_type`, `ollama_url`, `model`, `model_list`, `gemini_api_key`, `gemini_model`, `gemini_model_list`, `whisper_model`, `whisper_device`, `process_mode`, `threads`, `skip_bytes` 외 2건
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: ConsultParser 분석 엔진, 모델 목록, Whisper 설정, 입출력 디렉터리 및 2·3단계 JSON 분석 프롬프트 저장 파일

#### `tools/ConsultParser/core/config_manager.py`
- **규모 / 구분**: 113줄 / 5.6 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L09` / `ConsultParser-core` / -
- **주요 Export 심볼**: `load_config`, `save_config`, `get_default_prompt`, `get_stage3_default_prompt`, `CONFIG_FILE`, `DEFAULT_PROMPT`, `DEFAULT_CONFIG`
- **정·역방향 의존성**: Out(0): - | In(5): `scripts/test_consult_parser_llm.py`, `scripts/test_prompt_bias.py`, `scripts/verify_explicit_paths_and_slm.py`, `tools/ConsultParser/ui/tab_process.py`, `tools/ConsultParser/ui/tab_settings.py`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: config.json 설정 파일 로드·병합·저장 및 기본 4대 규칙 한글 JSON 분석 프롬프트 제공

#### `tools/ConsultParser/core/exporter.py`
- **규모 / 구분**: 203줄 / 8.3 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L09` / `ConsultParser-core` / -
- **주요 Export 심볼**: `run_schema_migration`, `build_supabase_export`, `_escape_sql`
- **정·역방향 의존성**: Out(0): - | In(1): `tools/ConsultParser/ui/tab_process.py`
- **접근 DB 테이블 · 외부 연동**: DB: `consult_items`, `consult_records` | 외부: `Supabase SQL Seed`
- **핵심 기능 명세**: 결과 JSON의 call_type 스키마 마이그레이션 및 merged_consults.json, supabase_export.json, supabase_seed.sql 생성

#### `tools/ConsultParser/core/file_scanner.py`
- **규모 / 구분**: 409줄 / 17 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L09` / `ConsultParser-core` / -
- **주요 Export 심볼**: `FileItem`, `read_txt_content`, `norm_ts`, `extract_timestamp_from_filename`, `_build_json_timestamp_map`, `_build_txt_timestamp_map`, `scan_folder`, `_get_unique_path`, `sync_filenames_by_timestamp`, `STRICT_TS_PATTERN`
- **정·역방향 의존성**: Out(1): `tools/ConsultParser/core/stt_parser.py` | In(3): `scripts/verify_explicit_paths_and_slm.py`, `tools/ConsultParser/ui/process_worker.py`, `tools/ConsultParser/ui/tab_process.py`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: 입력 폴더 하위 음성·텍스트 파일 재귀 스캔, 타임스탬프·파일명 매핑, UTF-8/CP949 텍스트 읽기 수행

#### `tools/ConsultParser/core/gemini_client.py`
- **규모 / 구분**: 220줄 / 9 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L09` / `ConsultParser-core` / -
- **주요 Export 심볼**: `GeminiClient`
- **정·역방향 의존성**: Out(0): - | In(2): `tools/ConsultParser/ui/process_worker.py`, `tools/ConsultParser/ui/tab_settings.py`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Google Generative Language REST API (Gemini)`
- **핵심 기능 명세**: Gemini REST API 키 검증, 지원 모델 목록 조회, 레이트리밋·오류 재시도 기반 상담 텍스트 분석 요청 처리

#### `tools/ConsultParser/core/ollama_client.py`
- **규모 / 구분**: 156줄 / 5.7 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L09` / `ConsultParser-core` / -
- **주요 Export 심볼**: `LocalSLMRunner`, `OllamaClient`
- **정·역방향 의존성**: Out(0): - | In(6): `scripts/test_consult_parser_llm.py`, `scripts/test_prompt_bias.py`, `scripts/verify_explicit_paths_and_slm.py`, `tools/ConsultParser/ui/process_worker.py`, `tools/ConsultParser/ui/tab_process.py`, `tools/ConsultParser/ui/tab_settings.py`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Ollama HTTP (/api/tags, /api/generate)`, `PyTorch Transformers (merged_qwen_0.5b_v2)`
- **핵심 기능 명세**: 자체 훈련 Qwen 0.5B 인프로세스 추론(LocalSLMRunner) 및 로컬 Ollama API 모델 목록·생성 호출 처리

#### `tools/ConsultParser/core/parser.py`
- **규모 / 구분**: 157줄 / 5.4 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L09` / `ConsultParser-core` / -
- **주요 Export 심볼**: `parse_llm_response`, `_clean_text_values`, `_try_parse_json`, `_extract_meta_from_filename`
- **정·역방향 의존성**: Out(0): - | In(3): `scripts/test_consult_parser_llm.py`, `scripts/verify_explicit_paths_and_slm.py`, `tools/ConsultParser/ui/process_worker.py`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: LLM 응답의 코드블록·미완성 괄호를 4단계 복구 파싱하고 파일명 메타데이터와 한글·영문 키를 정규화하여 결과 딕셔너리 반환

#### `tools/ConsultParser/core/stt_engine.py`
- **규모 / 구분**: 374줄 / 16.9 KB (module) | 시그널: `HIGH_COUPLING_HUB`
- **계층 / Menu ID / 대칭 쌍**: `L09` / `ConsultParser-core` / -
- **주요 Export 심볼**: `STTEngine`, `FFMPEG_EXE_PATH`
- **정·역방향 의존성**: Out(0): - | In(9): `scripts/diagnose_winerror206.py`, `scripts/test_chunk_length.py`, `scripts/test_chunk_success.py`, `scripts/test_consult_parser_stt.py`, `scripts/test_error_m4a_files.py`, `scripts/test_m4a_ffmpeg.py`, `scripts/test_real_call_stt.py`, `scripts/verify_consult_parser_launch.py`, `tools/ConsultParser/ui/process_worker.py`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `FunASR SenseVoiceSmall`, `Faster-Whisper`, `HuggingFace Transformers`, `imageio_ffmpeg`
- **핵심 기능 명세**: FFmpeg 경로 초기화 및 SenseVoice-Small·파인튜닝 Whisper-Tiny·Faster-Whisper 엔진 기반 오디오 파일 전사·타임스탬프 생성

#### `tools/ConsultParser/core/stt_parser.py`
- **규모 / 구분**: 166줄 / 6.7 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L09` / `ConsultParser-core` / -
- **주요 Export 심볼**: `STTFilenameParser`
- **정·역방향 의존성**: Out(0): - | In(1): `tools/ConsultParser/core/file_scanner.py`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: 통화 녹음 및 카카오톡 내보내기 파일명에서 전화번호를 격리 보호한 뒤 일자시간·고객명·모델명 추출 및 파일명 정규화

#### `tools/ConsultParser/main.py`
- **규모 / 구분**: 63줄 / 1.9 KB (entrypoint)
- **계층 / Menu ID / 대칭 쌍**: `L09` / `ConsultParser (Entrypoint)` / -
- **주요 Export 심볼**: `main`
- **정·역방향 의존성**: Out(1): `tools/ConsultParser/ui/main_window.py` | In(3): `scripts/verify_consult_parser_launch.py`, `tools/ConsultParser/run.bat`, `tools/ConsultParser/실행.bat`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `PyQt5`, `PyTorch Windows DLL`
- **핵심 기능 명세**: Windows PyTorch DLL 및 Qt 플랫폼 플러그인 경로 초기화 후 ConsultParser2 메인 윈도우 실행

#### `tools/ConsultParser/requirements.txt`
- **규모 / 구분**: 3줄 / 0 KB (config)
- **계층 / Menu ID / 대칭 쌍**: `L09` / `ConsultParser-deps` / -
- **주요 Export 심볼**: `PyQt5`, `requests`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `PyPI`
- **핵심 기능 명세**: ConsultParser2 GUI 구동에 필요한 PyQt5 및 requests 패키지 의존성 명시

#### `tools/ConsultParser/run.bat`
- **규모 / 구분**: 28줄 / 0.7 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L09` / `ConsultParser-launcher` / -
- **주요 Export 심볼**: -
- **정·역방향 의존성**: Out(1): `tools/ConsultParser/main.py` | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Windows cmd`
- **핵심 기능 명세**: Qt 플랫폼 플러그인 환경변수 설정 후 ConsultParser main.py를 실행하는 배치 파일

#### `tools/ConsultParser/ui/__init__.py`
- **규모 / 구분**: 4줄 / 0 KB (config)
- **계층 / Menu ID / 대칭 쌍**: `L09` / `pkg-marker` / -
- **주요 Export 심볼**: -
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: ConsultParser UI 패키지 선언 파일

#### `tools/ConsultParser/ui/main_window.py`
- **규모 / 구분**: 115줄 / 4 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L09` / `ConsultParser-ui` / -
- **주요 Export 심볼**: `MainWindow`
- **정·역방향 의존성**: Out(3): `tools/ConsultParser/ui/tab_process.py`, `tools/ConsultParser/ui/tab_settings.py`, `tools/ConsultParser/ui/widgets.py` | In(2): `tools/ConsultParser/main.py`, `tools/ConsultParser/verify_load.py`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `PyQt5`
- **핵심 기능 명세**: ConsultParser2 메인 창 타이틀바 및 작업 실행·환경 설정 2개 탭 컨테이너 구성

#### `tools/ConsultParser/ui/process_worker.py`
- **규모 / 구분**: 687줄 / 35.3 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L09` / `ConsultParser-ui (ProcessWorker)` / -
- **주요 Export 심볼**: `format_file_size`, `ErrorSelectDialog`, `TextPreviewSkipDialog`, `ClickableCard`, `ProcessWorker`
- **정·역방향 의존성**: Out(6): `tools/ConsultParser/core/file_scanner.py`, `tools/ConsultParser/core/gemini_client.py`, `tools/ConsultParser/core/ollama_client.py`, `tools/ConsultParser/core/parser.py`, `tools/ConsultParser/core/stt_engine.py`, `tools/ConsultParser/ui/widgets.py` | In(1): `tools/ConsultParser/ui/tab_process.py`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `PyQt5 QThread`
- **핵심 기능 명세**: 파일 용량 포맷터, 오류 재처리 파일 선택·텍스트 미리보기 건너뛰기 다이얼로그, 클릭 통계 카드 및 STT·LLM 배치 QThread 워커 구현

#### `tools/ConsultParser/ui/tab_process.py`
- **규모 / 구분**: 1150줄 / 52.6 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L09` / `ConsultParser-ui (ProcessTab)` / -
- **주요 Export 심볼**: `ProcessTab`
- **정·역방향 의존성**: Out(6): `tools/ConsultParser/core/config_manager.py`, `tools/ConsultParser/core/exporter.py`, `tools/ConsultParser/core/file_scanner.py`, `tools/ConsultParser/core/ollama_client.py`, `tools/ConsultParser/ui/process_worker.py`, `tools/ConsultParser/ui/widgets.py` | In(1): `tools/ConsultParser/ui/main_window.py`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `PyQt5 QWidget`
- **핵심 기능 명세**: ConsultParser2 처리 탭 UI로 입출력 폴더 지정, 공정 모드·정렬 선택, ProcessWorker 제어, 통계 카드 및 로그 뷰어 제공

#### `tools/ConsultParser/ui/tab_settings.py`
- **규모 / 구분**: 762줄 / 33.3 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L09` / `ConsultParser-ui (SettingsTab)` / -
- **주요 Export 심볼**: `ModelFetchThread`, `GeminiModelFetchThread`, `GeminiPingThread`, `SettingsTab`
- **정·역방향 의존성**: Out(4): `tools/ConsultParser/core/config_manager.py`, `tools/ConsultParser/core/gemini_client.py`, `tools/ConsultParser/core/ollama_client.py`, `tools/ConsultParser/ui/widgets.py` | In(1): `tools/ConsultParser/ui/main_window.py`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `PyQt5 QThread`
- **핵심 기능 명세**: Ollama·Gemini 분석 엔진 및 모델 선택, Whisper 장치 설정, API 연결 테스트 및 2·3단계 프롬프트 편집 UI 제공

#### `tools/ConsultParser/ui/widgets.py`
- **규모 / 구분**: 292줄 / 8.4 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L09` / `ConsultParser-ui` / -
- **주요 Export 심볼**: `make_separator`, `LogTextEdit`, `PALETTE`, `GLOBAL_STYLESHEET`
- **정·역방향 의존성**: Out(0): - | In(4): `tools/ConsultParser/ui/main_window.py`, `tools/ConsultParser/ui/process_worker.py`, `tools/ConsultParser/ui/tab_process.py`, `tools/ConsultParser/ui/tab_settings.py`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `PyQt5`
- **핵심 기능 명세**: ConsultParser2 다크 테마 색상 팔레트, 전역 QSS 스타일시트 및 LogTextEdit·구분선 공통 위젯 정의

#### `tools/ConsultParser/verify_load.py`
- **규모 / 구분**: 25줄 / 0.7 KB (test)
- **계층 / Menu ID / 대칭 쌍**: `L09` / `ConsultParser (Smoke Test)` / -
- **주요 Export 심볼**: -
- **정·역방향 의존성**: Out(1): `tools/ConsultParser/ui/main_window.py` | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `PyQt5`
- **핵심 기능 명세**: Qt 플랫폼 플러그인 로드 및 MainWindow 위젯 생성·종료 정상 여부 검증

#### `tools/ConsultParser/실행.bat`
- **규모 / 구분**: 28줄 / 0.7 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L09` / `ConsultParser-launcher-ko` / -
- **주요 Export 심볼**: -
- **정·역방향 의존성**: Out(1): `tools/ConsultParser/main.py` | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Windows cmd`
- **핵심 기능 명세**: Qt 플랫폼 플러그인 환경변수 설정 후 ConsultParser main.py를 실행하는 한글명 배치 파일

### L10. AWS 세종텔레콤 비즈메시지 프로토타입 (3개)

#### `aws_sejong_prototype/aws_cdk_stack.py`
- **규모 / 구분**: 80줄 / 2.9 KB (entrypoint)
- **계층 / Menu ID / 대칭 쌍**: `L10` / `aws-cdk-infra` / -
- **주요 Export 심볼**: `SejongAwsPrototypeStack`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `AWS CDK v2 (VPC, NAT Gateway, Lambda, SQS, API Gateway)`
- **핵심 기능 명세**: 고정 발신 IP 확보용 NAT 게이트웨이 VPC, 메시지 발송 Lambda, 콜백 적재용 SQS 큐 및 웹훅 API Gateway 스택 정의

#### `aws_sejong_prototype/lambda_sender.py`
- **규모 / 구분**: 114줄 / 4.2 KB (entrypoint)
- **계층 / Menu ID / 대칭 쌍**: `L10` / `aws-lambda-sender` / -
- **주요 Export 심볼**: `lambda_handler`, `send_alimtalk`, `send_sms`, `SEJONG_API_URL`, `SEJONG_CLIENT_ID`, `SEJONG_CLIENT_SECRET`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `AWS Lambda`, `Sejong Telecom Bizmsg API`
- **핵심 기능 명세**: 알림톡 발송 요청 처리 및 실패 시 대체 문자(SMS) 전환 발송을 수행하는 AWS Lambda 핸들러 프로토타입

#### `aws_sejong_prototype/lambda_webhook.py`
- **규모 / 구분**: 66줄 / 2.4 KB (entrypoint)
- **계층 / Menu ID / 대칭 쌍**: `L10` / `aws-lambda-webhook` / -
- **주요 Export 심볼**: `lambda_handler`, `QUEUE_URL`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `AWS Lambda`, `AWS SQS (boto3)`
- **핵심 기능 명세**: 세종텔레콤 전송 결과 콜백 페이로드 검증 후 SQS 큐에 이벤트를 적재하는 웹훅 수신 Lambda 핸들러

### L11. SLM·STT 학습·평가 및 코드 명세 거버넌스 스크립트 (56개)

#### `scripts/Modelfile`
- **규모 / 구분**: 8줄 / 0.6 KB (config)
- **계층 / Menu ID / 대칭 쌍**: `L11` / `ollama-modelfile` / -
- **주요 Export 심볼**: `FROM D:/01.AntiGravity/Space_consult_assist/scripts/merged_qwen_0.5b`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Ollama`
- **핵심 기능 명세**: 1차 병합 Qwen2.5-0.5B 가중치와 18종 부품코드 분류 시스템 프롬프트를 묶는 Ollama Modelfile 정의

#### `scripts/Modelfile.lora`
- **규모 / 구분**: 4줄 / 0.1 KB (config)
- **계층 / Menu ID / 대칭 쌍**: `L11` / `ollama-modelfile` / -
- **주요 Export 심볼**: `FROM qwen2.5:0.5b`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Ollama`
- **핵심 기능 명세**: 기본 qwen2.5:0.5b 모델에 LoRA 어댑터 디렉터리를 결합하는 Ollama 설정 파일

#### `scripts/Modelfile.v2`
- **규모 / 구분**: 11줄 / 0.3 KB (config)
- **계층 / Menu ID / 대칭 쌍**: `L11` / `ollama-modelfile` / -
- **주요 Export 심볼**: `FROM D:/01.AntiGravity/Space_consult_assist/scripts/merged_qwen_0.5b_v2`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Ollama`
- **핵심 기능 명세**: 균형 재학습된 merged_qwen_0.5b_v2 가중치와 ChatML 프롬프트 템플릿을 지정하는 Ollama Modelfile

#### `scripts/auto_purge_vercel.cjs`
- **규모 / 구분**: 69줄 / 2.2 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L11` / `npm run purge:vercel` / -
- **주요 Export 심볼**: -
- **정·역방향 의존성**: Out(0): - | In(1): `frontend/package.json`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Vercel CLI`
- **핵심 기능 명세**: 운영 Alias 배포본을 제외하고 누적된 이전 Vercel 배포본을 삭제하며 지연 재실행 옵션 지원

#### `scripts/build_balanced_slm_dataset.py`
- **규모 / 구분**: 123줄 / 4.7 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L11` / `slm-dataset` / -
- **주요 Export 심볼**: `load_and_prepare`, `MASTER_DIR`, `TEXT_DIR`, `OUTPUT_DIR`, `SYSTEM_PROMPT`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: 기술문의·영업문의·일정조율 통화 데이터를 동일 비율로 추출하여 SLM 학습·검증용 ChatML JSONL 데이터셋 구축

#### `scripts/check_audio_durations.py`
- **규모 / 구분**: 24줄 / 0.8 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L11` / `stt-diagnostic` / -
- **주요 Export 심볼**: `FFMPEG_EXE`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `imageio_ffmpeg`
- **핵심 기능 명세**: 파싱 실패로 분류된 m4a 통화 녹음 파일의 재생 길이를 ffmpeg 메타데이터로 조회 출력

#### `scripts/check_bundle.py`
- **규모 / 구분**: 20줄 / 1 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L11` / `deploy-check` / -
- **주요 Export 심볼**: -
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Vercel Production URL`
- **핵심 기능 명세**: 운영 Vercel 프론트엔드 JS 번들을 다운로드하여 출장 문서 패키지 관련 문자열 포함 여부 확인

#### `scripts/code_file_descriptions.cjs`
- **규모 / 구분**: 2522줄 / 112.5 KB (module)
- **계층 / Menu ID / 대칭 쌍**: `L11` / `spec-ssot` / -
- **주요 Export 심볼**: `FILE_DESCRIPTIONS`
- **정·역방향 의존성**: Out(0): - | In(1): `scripts/generate_code_file_spec.cjs`
- **접근 DB 테이블 · 외부 연동**: DB: `space_employees`, `space_part_codes`, `space_parts_catalog`, `space_schedule_events`, `space_stt_audio_archives`, `space_symptom_guide_photos`, `space_symptom_rules`, `space_symptom_synonyms`, `space_transfer_centers`, `space_vehicle_inventories` | 외부: -
- **핵심 기능 명세**: 프로젝트 전 코드·설정·SQL·스크립트 파일의 계층, 라우트, 대칭 쌍, 외부 연동 및 무수식어 기능 명세 사전(SSOT) 정의

#### `scripts/convert_hf_to_gguf.py`
- **규모 / 구분**: 308줄 / 12.5 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L11` / `slm-export` / -
- **주요 Export 심볼**: `split_str_to_n_bytes`, `parse_args`, `main`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `PyTorch`, `gguf`
- **핵심 기능 명세**: HuggingFace 포맷 언어 모델 가중치와 토크나이저를 Ollama/llama.cpp 호환 GGUF 바이너리 파일로 변환

#### `scripts/debug_ollama_err.py`
- **규모 / 구분**: 15줄 / 0.3 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L11` / `slm-diagnostic` / -
- **주요 Export 심볼**: -
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Ollama HTTP`
- **핵심 기능 명세**: 로컬 Ollama 서버의 space-slm-0.5b 모델에 단문 프롬프트를 전송해 HTTP 상태 코드와 응답 본문 점검

#### `scripts/diagnose_winerror206.py`
- **규모 / 구분**: 40줄 / 1.3 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L11` / `stt-diagnostic` / -
- **주요 Export 심볼**: -
- **정·역방향 의존성**: Out(1): `tools/ConsultParser/core/stt_engine.py` | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `PyTorch`
- **핵심 기능 명세**: Windows PATH 길이, torch DLL 디렉터리 등록 및 STTEngine 모델 로드 시 경로 길이 오류 진단

#### `scripts/evaluate_balanced_slm_benchmark.py`
- **규모 / 구분**: 179줄 / 7 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L11` / `slm-eval` / -
- **주요 Export 심볼**: `load_json_records`, `collect_valid_samples`, `MODEL_PATH`, `TEXT_DIR`, `MASTER_DIR`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `PyTorch Transformers`
- **핵심 기능 명세**: 균형 데이터셋으로 재학습한 Qwen2.5-0.5B v2 모델을 통화록 50건에 추론시켜 유형 분류 정확도와 지연시간 산출

#### `scripts/evaluate_current_slm_real_calls.py`
- **규모 / 구분**: 200줄 / 7.5 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L11` / `slm-eval` / -
- **주요 Export 심볼**: `load_json_records`, `collect_valid_samples`, `map_code_to_type`, `MODEL_PATH`, `TEXT_DIR`, `MASTER_DIR`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `PyTorch Transformers`
- **핵심 기능 명세**: 1차 파인튜닝 Qwen2.5-0.5B 모델의 통화 50건 분류 정확도와 응답 속도를 측정해 slm_benchmark_results.json 저장

#### `scripts/evaluate_custom_slm.py`
- **규모 / 구분**: 123줄 / 4.8 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L11` / `slm-eval` / -
- **주요 Export 심볼**: `run_evaluation`, `BASE_DIR`, `TEST_PATH`, `OLLAMA_URL`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Ollama HTTP`
- **핵심 기능 명세**: 홀드아웃 테스트셋 50건을 로컬 Ollama 커스텀 SLM에 호출하여 부품코드 일치율과 JSON 파싱 성공률 평가

#### `scripts/evaluate_stt_comparison.py`
- **규모 / 구분**: 109줄 / 4.2 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L11` / `stt-eval` / -
- **주요 Export 심볼**: `transcribe`, `BASE_MODEL`, `MERGED_MODEL`, `TEST_JSON`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `HuggingFace Transformers`
- **핵심 기능 명세**: 순정 Whisper-Tiny와 한국어 파인튜닝 Whisper-Tiny 모델의 테스트 음성 전사 음절오류율(CER) 및 추론 시간 비교

#### `scripts/extract_python_ast.py`
- **규모 / 구분**: 224줄 / 8.6 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L11` / `spec-ast-python` / -
- **주요 Export 심볼**: `_resolve_module_path`, `_extract_route_decorator`, `_collect_db_tables_from_text`, `analyze_python_file`, `main`, `ROUTER_HTTP_METHODS`, `SPACE_TABLE_RE`, `EXPLICIT_TABLE_RE`, `SQL_CONTEXT_TABLE_RE`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: `consult_items`, `consult_knowledge`, `consult_records`, `match_similar_bge`, `match_similar_calls`, `match_similar_nomic`, `match_similar_openai`, `schedule_events`, `stt_audio_archives`, `symptom_rules`, `symptom_synonyms`, `transfer_centers` | 외부: `Python ast`
- **핵심 기능 명세**: Python 표준 ast 모듈로 클래스·함수·FastAPI 엔드포인트·상수·내부 import·DB 테이블 참조를 정적 추출해 JSON 출력

#### `scripts/generate_code_file_spec.cjs`
- **규모 / 구분**: 1120줄 / 41 KB (entrypoint)
- **계층 / Menu ID / 대칭 쌍**: `L11` / `npm run spec:sync | spec:verify | spec:query` / -
- **주요 Export 심볼**: -
- **정·역방향 의존성**: Out(1): `scripts/code_file_descriptions.cjs` | In(1): `frontend/package.json`
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `TypeScript Compiler API`, `Node.js child_process`
- **핵심 기능 명세**: TS/JS·Python AST 및 SQL·설정 파일을 정적 분석하여 code_file_manifest.json과 CODE_FILE_SPECIFICATION.md 생성, 무결성 검증 및 영향도 검색 수행

#### `scripts/generate_slm_dataset.py`
- **규모 / 구분**: 303줄 / 17 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L11` / `slm-dataset` / -
- **주요 Export 심볼**: `load_sql_symptoms`, `generate_dataset`, `BASE_DIR`, `SQL_DIR`, `PART_DEFINITIONS`, `VOICE_VARIATIONS`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: 18종 부품코드별 구어체 템플릿과 시드 SQL의 증상 키워드를 조합하여 SLM 파인튜닝용 학습·테스트 JSONL 생성

#### `scripts/inspect_parts.py`
- **규모 / 구분**: 9줄 / 0.3 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L11` / `diagnostic` / -
- **주요 Export 심볼**: -
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: 프론트엔드 manualKnowledgeData.ts에서 장비 모델별 주요 소모품(key_consumables) 문자열 정규식 추출

#### `scripts/inspect_torch_dll.py`
- **규모 / 구분**: 15줄 / 0.3 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L11` / `diagnostic` / -
- **주요 Export 심볼**: -
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `PyTorch`
- **핵심 기능 명세**: 설치된 torch 패키지 초기화 코드에서 _load_dll_libraries 함수 구현 소스 추출 출력

#### `scripts/interactive_test.py`
- **규모 / 구분**: 133줄 / 4.7 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L11` / `slm-eval` / -
- **주요 Export 심볼**: `main`, `process_text`, `normalize_part_code`, `BASE_DIR`, `MODEL_DIR`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `PyTorch Transformers`
- **핵심 기능 명세**: 병합된 Qwen2.5-0.5B 모델을 로드하여 CLI 인자 또는 대화형 입력 문장의 증상 키워드·부품코드 추론 수행

#### `scripts/list_symptoms.py`
- **규모 / 구분**: 12줄 / 0.4 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L11` / `diagnostic` / -
- **주요 Export 심볼**: -
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: 백엔드 표준 증상 정의 파일에서 증상 목록과 연결된 에러 코드 리스트 파싱 출력

#### `scripts/prepare_stt_dataset.py`
- **규모 / 구분**: 113줄 / 4.3 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L11` / `stt-dataset` / -
- **주요 Export 심볼**: `extract_first_30s_text`, `AUDIO_DIR`, `TEXT_DIR`, `OUTPUT_DIR`, `CHUNKS_DIR`, `FFMPEG_EXE`, `TARGET_COUNT`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `imageio_ffmpeg`
- **핵심 기능 명세**: m4a 녹음 파일의 0~28초 구간을 16kHz 모노 WAV로 추출하고 전사 텍스트와 쌍을 맞춰 Whisper-Tiny 학습 JSON 생성

#### `scripts/test_baseline_slm.py`
- **규모 / 구분**: 101줄 / 3.8 KB (test)
- **계층 / Menu ID / 대칭 쌍**: `L11` / `slm-eval` / -
- **주요 Export 심볼**: `run_baseline_test`, `TEST_PATH`, `OLLAMA_URL`, `MODEL_NAME`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Ollama HTTP`
- **핵심 기능 명세**: 파인튜닝 전 순정 qwen2.5:0.5b 모델의 제로샷 부품코드 분류 정확도와 응답 지연시간 측정

#### `scripts/test_chunk_length.py`
- **규모 / 구분**: 56줄 / 1.9 KB (test)
- **계층 / Menu ID / 대칭 쌍**: `L11` / `stt-test` / -
- **주요 Export 심볼**: `FFMPEG_EXE`, `TEST_LONG`
- **정·역방향 의존성**: Out(1): `tools/ConsultParser/core/stt_engine.py` | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Transformers ASR`
- **핵심 기능 명세**: 장시간 통화 음성 전사 시 chunk_length_s=30 옵션 유무에 따른 청크 분할 개수와 마지막 타임스탬프 비교

#### `scripts/test_chunk_success.py`
- **규모 / 구분**: 47줄 / 1.5 KB (test)
- **계층 / Menu ID / 대칭 쌍**: `L11` / `stt-test` / -
- **주요 Export 심볼**: `FFMPEG_EXE`, `TEST_LONG`
- **정·역방향 의존성**: Out(1): `tools/ConsultParser/core/stt_engine.py` | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `ConsultParser STTEngine`
- **핵심 기능 명세**: STTEngine 파이프라인에 30초 청크와 4초 스트라이드 설정을 적용해 장시간 m4a 통화 전사 소요시간과 결과 검증

#### `scripts/test_consult_parser_llm.py`
- **규모 / 구분**: 45줄 / 1.4 KB (test)
- **계층 / Menu ID / 대칭 쌍**: `L11` / `slm-test` / -
- **주요 Export 심볼**: -
- **정·역방향 의존성**: Out(3): `tools/ConsultParser/core/config_manager.py`, `tools/ConsultParser/core/ollama_client.py`, `tools/ConsultParser/core/parser.py` | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Ollama HTTP`
- **핵심 기능 명세**: ConsultParser의 OllamaClient와 응답 파서를 호출해 space-slm-0.5b-v2 모델 출력의 JSON 파싱 검증

#### `scripts/test_consult_parser_stt.py`
- **규모 / 구분**: 30줄 / 1.1 KB (test)
- **계층 / Menu ID / 대칭 쌍**: `L11` / `stt-test` / -
- **주요 Export 심볼**: `progress_cb`, `TEST_AUDIO`
- **정·역방향 의존성**: Out(1): `tools/ConsultParser/core/stt_engine.py` | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `ConsultParser STTEngine`
- **핵심 기능 명세**: ConsultParser STTEngine에서 custom-tiny-ko 모델로 샘플 WAV 음성을 전사하고 진행률 콜백과 출력 행 수 확인

#### `scripts/test_counsel_lifecycle.py`
- **규모 / 구분**: 177줄 / 7.7 KB (test)
- **계층 / Menu ID / 대칭 쌍**: `L11` / `frontend-e2e` / -
- **주요 Export 심볼**: `main`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Playwright`
- **핵심 기능 명세**: 에러 코드 칩 선택, 상담 보류 임시저장, 대기열 모달 재개, 상담 완료 및 이력 조회 라이프사이클 검증

#### `scripts/test_error_m4a_files.py`
- **규모 / 구분**: 35줄 / 1.2 KB (test)
- **계층 / Menu ID / 대칭 쌍**: `L11` / `stt-test` / -
- **주요 Export 심볼**: -
- **정·역방향 의존성**: Out(1): `tools/ConsultParser/core/stt_engine.py` | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `ConsultParser STTEngine`
- **핵심 기능 명세**: 변환 오류가 발생했던 m4a 통화 파일 3건을 STTEngine.process_audio로 실행해 정상 전사 여부 확인

#### `scripts/test_full_chosung.py`
- **규모 / 구분**: 76줄 / 2.5 KB (test)
- **계층 / Menu ID / 대칭 쌍**: `L11` / `search-unit-test` / -
- **주요 Export 심볼**: `extract_chosung`, `matches_chosung_or_text`, `matches_preset`, `CHOSUNG_LIST`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: 표준 장애 유형 데이터와 공식 에러 코드를 대상으로 한글 초성·부분문자열 검색 매칭 결과 검증

#### `scripts/test_integrated_search_and_symptom.py`
- **규모 / 구분**: 160줄 / 7.5 KB (test)
- **계층 / Menu ID / 대칭 쌍**: `L11` / `frontend-e2e` / -
- **주요 Export 심볼**: `run_e2e_verification`, `ARTIFACT_DIR`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Playwright`
- **핵심 기능 명세**: 증상 초성 검색, 에러코드 카테고리 필터, 고객 연락처 자동 채움, 대기열 다중 조건 검색 UI 검증

#### `scripts/test_local_merged_slm.py`
- **규모 / 구분**: 116줄 / 4.5 KB (test)
- **계층 / Menu ID / 대칭 쌍**: `L11` / `slm-test` / -
- **주요 Export 심볼**: `run_local_evaluation`, `BASE_DIR`, `MODEL_DIR`, `TEST_PATH`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `PyTorch Transformers`
- **핵심 기능 명세**: merged_qwen_0.5b 모델의 GPU·CPU 추론 시간과 부품코드 JSON 출력 검증

#### `scripts/test_m4a_ffmpeg.py`
- **규모 / 구분**: 59줄 / 1.8 KB (test)
- **계층 / Menu ID / 대칭 쌍**: `L11` / `stt-test` / -
- **주요 Export 심볼**: `load_audio_via_ffmpeg`, `FFMPEG_EXE`, `TEST_M4A`
- **정·역방향 의존성**: Out(1): `tools/ConsultParser/core/stt_engine.py` | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `imageio_ffmpeg`, `ConsultParser STTEngine`
- **핵심 기능 명세**: ffmpeg 서브프로세스로 m4a 파일을 16kHz PCM 배열로 디코딩한 뒤 Whisper 파이프라인 전사 동작 확인

#### `scripts/test_ollama_status.py`
- **규모 / 구분**: 20줄 / 0.6 KB (test)
- **계층 / Menu ID / 대칭 쌍**: `L11` / `slm-diagnostic` / -
- **주요 Export 심볼**: -
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Ollama HTTP`
- **핵심 기능 명세**: 로컬 Ollama 서버에 등록된 qwen2.5:0.5b 및 gemma3:12b 모델의 응답 상태와 생성 결과 확인

#### `scripts/test_pipeline_timestamps.py`
- **규모 / 구분**: 45줄 / 1.5 KB (test)
- **계층 / Menu ID / 대칭 쌍**: `L11` / `stt-test` / -
- **주요 Export 심볼**: `MODEL_PATH`, `TEST_AUDIO`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `HuggingFace Transformers`
- **핵심 기능 명세**: HuggingFace ASR 파이프라인으로 merged_whisper_tiny 모델을 구동해 구간별 타임스탬프 전사 출력 확인

#### `scripts/test_prompt_bias.py`
- **규모 / 구분**: 52줄 / 2.7 KB (test)
- **계층 / Menu ID / 대칭 쌍**: `L11` / `slm-test` / -
- **주요 Export 심볼**: -
- **정·역방향 의존성**: Out(2): `tools/ConsultParser/core/config_manager.py`, `tools/ConsultParser/core/ollama_client.py` | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `ConsultParser OllamaClient`
- **핵심 기능 명세**: 예시 문구 포함 프롬프트와 스키마 전용 프롬프트 간 로컬 SLM 증상 추론 편향 차이 비교

#### `scripts/test_qthread_torch.py`
- **규모 / 구분**: 31줄 / 0.7 KB (test)
- **계층 / Menu ID / 대칭 쌍**: `L11` / `qt-diagnostic` / -
- **주요 Export 심볼**: `TestWorker`, `on_finished`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `PyQt5`, `PyTorch`
- **핵심 기능 명세**: PyQt5 QThread 워커 스레드 내부에서 torch 라이브러리 임포트 정상 여부 확인

#### `scripts/test_real_call_stt.py`
- **규모 / 구분**: 20줄 / 0.6 KB (test)
- **계층 / Menu ID / 대칭 쌍**: `L11` / `stt-test` / -
- **주요 Export 심볼**: `TEST_FILE`
- **정·역방향 의존성**: Out(1): `tools/ConsultParser/core/stt_engine.py` | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `ConsultParser STTEngine`
- **핵심 기능 명세**: 고객 통화 m4a 녹음 파일을 custom-tiny-ko STT 엔진으로 전사하여 전체 텍스트 출력

#### `scripts/test_short_path.py`
- **규모 / 구분**: 24줄 / 0.8 KB (test)
- **계층 / Menu ID / 대칭 쌍**: `L11` / `win32-diagnostic` / -
- **주요 Export 심볼**: `get_short_path`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Win32 kernel32`
- **핵심 기능 명세**: 한글 사용자명 포함 경로를 Windows 8.3 단축 경로로 변환하고 경로 유효성 확인

#### `scripts/test_sliding_whisper.py`
- **규모 / 구분**: 67줄 / 2.1 KB (test)
- **계층 / Menu ID / 대칭 쌍**: `L11` / `stt-test` / -
- **주요 Export 심볼**: `FFMPEG_EXE`, `TEST_LONG`, `MODEL_PATH`, `CHUNK_SAMPLES`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `HuggingFace Transformers`, `ffmpeg`
- **핵심 기능 명세**: ffmpeg로 변환한 장시간 PCM 파형을 30초 단위 슬라이딩 윈도우로 분할해 merged_whisper_tiny 모델로 전사

#### `scripts/test_slm_on_real_calls.py`
- **규모 / 구분**: 88줄 / 3.4 KB (test)
- **계층 / Menu ID / 대칭 쌍**: `L11` / `slm-test` / -
- **주요 Export 심볼**: `MODEL_PATH`, `TEXT_DIR`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `PyTorch Transformers`
- **핵심 기능 명세**: 통화 녹취록 텍스트 5건을 로드하여 파인튜닝 Qwen2.5-0.5B 모델의 추론 속도와 JSON 출력 검증

#### `scripts/test_symptom_chosung.py`
- **규모 / 구분**: 69줄 / 2 KB (test)
- **계층 / Menu ID / 대칭 쌍**: `L11` / `search-unit-test` / -
- **주요 Export 심볼**: `extract_chosung`, `matches_chosung_or_text`, `CHOSUNG_LIST`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: 16종 표준 증상 명칭 리스트에 대한 한글 초성 및 일반 검색어 매칭 함수 단위 테스트

#### `scripts/test_v2_ollama.py`
- **규모 / 구분**: 23줄 / 0.6 KB (test)
- **계층 / Menu ID / 대칭 쌍**: `L11` / `slm-diagnostic` / -
- **주요 Export 심볼**: -
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Ollama HTTP`
- **핵심 기능 명세**: Ollama에 등록된 space-slm-0.5b:v2 모델 엔드포인트를 호출하여 상태 코드와 생성 응답 확인

#### `scripts/train_balanced_slm.py`
- **규모 / 구분**: 118줄 / 3.7 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L11` / `slm-train` / -
- **주요 Export 심볼**: `BASE_MODEL`, `TRAIN_FILE`, `TEST_FILE`, `OUTPUT_DIR`, `MERGED_DIR`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `PyTorch`, `PEFT/TRL SFTTrainer`
- **핵심 기능 명세**: 균형 상담 데이터셋으로 Qwen2.5-0.5B-Instruct 모델을 LoRA 파인튜닝한 후 베이스 모델과 가중치 병합 저장

#### `scripts/train_slm.py`
- **규모 / 구분**: 154줄 / 5 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L11` / `slm-train` / -
- **주요 Export 심볼**: `load_jsonl_dataset`, `train`, `BASE_DIR`, `TRAIN_FILE`, `OUTPUT_DIR`, `MERGED_DIR`, `MODEL_ID`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `PyTorch`, `PEFT/TRL SFTTrainer`
- **핵심 기능 명세**: 18종 부품코드 분류 데이터셋으로 Qwen2.5-0.5B-Instruct 모델의 LoRA 학습과 단일 가중치 병합 수행

#### `scripts/train_whisper_tiny.py`
- **규모 / 구분**: 168줄 / 5.8 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L11` / `stt-train` / -
- **주요 Export 심볼**: `WhisperDataset`, `DataCollatorSpeechSeq2SeqWithPadding`, `BASE_MODEL`, `DATA_DIR`, `OUTPUT_DIR`, `MERGED_DIR`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `PyTorch`, `PEFT/Transformers Seq2SeqTrainer`
- **핵심 기능 명세**: 한국어 상담 음성 데이터셋으로 Whisper-Tiny 모델을 LoRA 파인튜닝하고 병합 모델 생성

#### `scripts/update_config_prompt.py`
- **규모 / 구분**: 52줄 / 1.8 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L11` / `config-sync` / -
- **주요 Export 심볼**: `PROMPT_FILE`, `CONFIG_FILE`, `CONFIG_MGR_FILE`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: 문서화된 표준 프롬프트 본문을 읽어 ConsultParser의 config.json과 config_manager.py 기본 프롬프트 상수 갱신

#### `scripts/verify_consult_parser_launch.py`
- **규모 / 구분**: 34줄 / 1.3 KB (test)
- **계층 / Menu ID / 대칭 쌍**: `L11` / `qt-verification` / -
- **주요 Export 심볼**: `TEST_AUDIO`
- **정·역방향 의존성**: Out(2): `tools/ConsultParser/core/stt_engine.py`, `tools/ConsultParser/main.py` | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: ConsultParser 초기화 루틴 임포트 후 STTEngine 음성 전사를 실행하여 WinError 206 해소 여부 검증

#### `scripts/verify_explicit_paths_and_slm.py`
- **규모 / 구분**: 66줄 / 3 KB (test)
- **계층 / Menu ID / 대칭 쌍**: `L11` / `tool-verification` / -
- **주요 Export 심볼**: -
- **정·역방향 의존성**: Out(4): `tools/ConsultParser/core/config_manager.py`, `tools/ConsultParser/core/file_scanner.py`, `tools/ConsultParser/core/ollama_client.py`, `tools/ConsultParser/core/parser.py` | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: ConsultParser의 4개 입출력 경로 스캔 동작과 예시 제거 프롬프트 기반 로컬 SLM 증상 파싱 결과 검증

#### `scripts/verify_live_dispatch.py`
- **규모 / 구분**: 100줄 / 3.9 KB (test)
- **계층 / Menu ID / 대칭 쌍**: `L11` / `live-e2e` / -
- **주요 Export 심볼**: `test_live`, `ARTIFACT_DIR`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Playwright`, `Vercel Production URL`
- **핵심 기능 명세**: 운영 Vercel 앱에서 고객 검색, AS 출장 접수 모달 3채널 전환, 2차 견적서 및 A4 서식 전환 검증

#### `scripts/verify_live_vercel_enhanced.py`
- **규모 / 구분**: 61줄 / 2.6 KB (test)
- **계층 / Menu ID / 대칭 쌍**: `L11` / `live-e2e` / -
- **주요 Export 심볼**: `verify_live_vercel`, `ARTIFACT_DIR`, `LIVE_URL`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Playwright`, `Vercel Production URL`
- **핵심 기능 명세**: 운영 Vercel 배포 환경에서 증상 초성 검색, 에러코드 카테고리 필터, 대기열 전화번호 검색 검증

#### `scripts/verify_vercel_lifecycle.py`
- **규모 / 구분**: 66줄 / 2.5 KB (test)
- **계층 / Menu ID / 대칭 쌍**: `L11` / `live-e2e` / -
- **주요 Export 심볼**: `main`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Playwright`, `Vercel Production URL`
- **핵심 기능 명세**: 운영 Vercel 앱에서 에러 코드 칩 선택, 상담 보류 저장, 대기열 모달 조회 및 상담 이어하기 동작 검증

#### `scripts/wait_for_channel_deploy.py`
- **규모 / 구분**: 27줄 / 1.2 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L11` / `deploy-check` / -
- **주요 Export 심볼**: -
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Vercel Production URL`
- **핵심 기능 명세**: 운영 Vercel 프론트엔드 JS 번들에 data-channel-option 속성 반영 완료 여부 폴링

#### `scripts/wait_for_downstream_deploy.py`
- **규모 / 구분**: 24줄 / 0.8 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L11` / `deploy-check` / -
- **주요 Export 심볼**: -
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Vercel Production URL`
- **핵심 기능 명세**: 운영 Vercel 메인 HTML에 지정된 신규 JS 번들 파일명 노출 여부 폴링

#### `scripts/wait_for_parts_catalog_deploy.py`
- **규모 / 구분**: 26줄 / 1.3 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L11` / `deploy-check` / -
- **주요 Export 심볼**: -
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Vercel Production URL`
- **핵심 기능 명세**: 운영 Vercel JS 번들에 부품 카탈로그 및 온라인 주문 버튼 식별자 반영 여부 폴링

### L12. CI/CD·컨테이너 인프라·루트 검증 및 진단 스크립트 (45개)

#### `.env.example`
- **규모 / 구분**: 36줄 / 1 KB (config)
- **계층 / Menu ID / 대칭 쌍**: `L12` / `env-template` / -
- **주요 Export 심볼**: -
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: Supabase DB, Ollama, JWT, 인증 우회, 알리고 카카오 알림톡 및 CORS 환경변수 템플릿 정의

#### `.github/workflows/deploy.yml`
- **규모 / 구분**: 41줄 / 1 KB (config)
- **계층 / Menu ID / 대칭 쌍**: `L12` / `ci-deploy` / -
- **주요 Export 심볼**: `CI/CD Pipeline`
- **정·역방향 의존성**: Out(5): `backend/app/api/v1/endpoints/counsel.py`, `backend/app/api/v1/endpoints/parts.py`, `backend/app/api/v1/endpoints/visits.py`, `backend/app/main.py`, `backend/requirements.txt` | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `GitHub Actions`
- **핵심 기능 명세**: main 브랜치 푸시 및 PR 시 백엔드 주요 Python 모듈 py_compile 검사와 프론트엔드 의존성 설치 검사 실행

#### `.github/workflows/vercel-purge.yml`
- **규모 / 구분**: 33줄 / 0.8 KB (config)
- **계층 / Menu ID / 대칭 쌍**: `L12` / `ci-vercel-purge` / -
- **주요 Export 심볼**: `Vercel Auto-Purge Old Deployments`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `GitHub Actions`, `Vercel CLI`
- **핵심 기능 명세**: main 브랜치 배포 90초 대기 후 현재 운영 버전을 제외한 이전 Vercel 배포본 정리 실행

#### `analyze_manual_topics.py`
- **규모 / 구분**: 63줄 / 2.8 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L12` / `manual-pipeline` / -
- **주요 Export 심볼**: `analyze_topics`, `INPUT_FILE`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: 매뉴얼 추출 텍스트에서 차단기·브레이크·스퀴지·사양·소포제·배터리 6개 주제별 관련 페이지와 문구 분류

#### `capture_active_studio.py`
- **규모 / 구분**: 56줄 / 1.8 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L12` / `ui-verification` / -
- **주요 Export 심볼**: `find_free_port`, `run_server`, `main`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Playwright`
- **핵심 기능 명세**: 빌드된 frontend/dist 정적 HTTP 서버를 구동하고 증상 선택 활성 스튜디오 화면 스크린샷 저장

#### `capture_vercel_live.py`
- **규모 / 구분**: 61줄 / 2.3 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L12` / `ui-verification` / -
- **주요 Export 심볼**: `main`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Playwright`, `Vercel Production URL`
- **핵심 기능 명세**: 운영 Vercel 페이지에서 자가조치 가이드, 소모품 견적 모달, A4 공식 서식 화면 순차 캡처 저장

#### `check_specs_syntax.py`
- **규모 / 구분**: 217줄 / 10.9 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L12` / `data-draft` / -
- **주요 Export 심볼**: `MODEL_SPECIFICATIONS`, `SPECIAL_MANUAL_GUIDES`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: 모델 제원표(MODEL_SPECIFICATIONS) 및 상황별 매뉴얼 수칙(SPECIAL_MANUAL_GUIDES) Python 딕셔너리 구문 검사

#### `compile_manual_knowledge.py`
- **규모 / 구분**: 93줄 / 5.3 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L12` / `manual-pipeline` / -
- **주요 Export 심볼**: `compile_comprehensive_analysis`, `INPUT_FILE`, `OUTPUT_REPORT`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: 추출된 매뉴얼 텍스트에서 7대 상담 주제별 페이지와 발췌문을 집계하여 manual_extracted_consultation_knowledge.md 작성

#### `docker-compose.yml`
- **규모 / 구분**: 37줄 / 0.7 KB (config)
- **계층 / Menu ID / 대칭 쌍**: `L12` / `docker-infra` / -
- **주요 Export 심볼**: `service:fastapi`, `service:nginx`, `service:ollama`
- **정·역방향 의존성**: Out(2): `backend/Dockerfile`, `frontend/nginx.conf` | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Docker Compose`
- **핵심 기능 명세**: FastAPI 백엔드(8000), Nginx 역프록시(80), Ollama 추론 서버(11434) 3개 컨테이너와 볼륨·네트워크 바인딩 정의

#### `dump_key_sections.py`
- **규모 / 구분**: 32줄 / 1.3 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L12` / `manual-pipeline` / -
- **주요 Export 심볼**: `dump_key_sections`, `MANUAL_DIR`, `OUT_FILE`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `pdfplumber`
- **핵심 기능 명세**: S3·S7P·W12·JINCLEAN9 매뉴얼 PDF 주요 페이지 텍스트를 추출하여 detailed_sections_dump.txt 저장

#### `dump_manual_text.py`
- **규모 / 구분**: 24줄 / 0.8 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L12` / `manual-pipeline` / -
- **주요 Export 심볼**: `print_page_text`, `MANUAL_DIR`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `pdfplumber`
- **핵심 기능 명세**: S3·JINCLEAN9·W12 매뉴얼 PDF의 고장진단 및 퓨즈 관련 지정 페이지 텍스트 콘솔 출력

#### `dump_specs.py`
- **규모 / 구분**: 49줄 / 1.9 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L12` / `manual-pipeline` / -
- **주요 Export 심볼**: `dump_specs`, `MANUAL_DIR`, `OUT_FILE`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `pdfplumber`
- **핵심 기능 명세**: 14종 매뉴얼 PDF 앞쪽 페이지에서 사양·제원 표를 추출하여 specs_dump.txt 저장

#### `extract_all_tables_to_file.py`
- **규모 / 구분**: 55줄 / 2.9 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L12` / `manual-pipeline` / -
- **주요 Export 심볼**: `extract_manual_details`, `MANUAL_DIR`, `OUTPUT_FILE`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `pdfplumber`
- **핵심 기능 명세**: docs/manuals 하위 전 매뉴얼 PDF에서 고장진단·퓨즈·제원·점검 페이지 표와 원문을 extracted_manual_data.txt로 일괄 추출

#### `extract_deep_manual_info.py`
- **규모 / 구분**: 89줄 / 3.5 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L12` / `manual-pipeline` / -
- **주요 Export 심볼**: `extract_manual_sections`, `MANUAL_DIR`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `pdfplumber`
- **핵심 기능 명세**: 11종 대표 매뉴얼 PDF의 목차·고장진단·제원·비상해제·일일점검 섹션을 구조화해 manual_deep_analysis.json 저장

#### `inspect_manual_codes.py`
- **규모 / 구분**: 38줄 / 2 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L12` / `manual-pipeline` / -
- **주요 Export 심볼**: `find_troubleshoot_content`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `pdfplumber`
- **핵심 기능 명세**: 7종 장비 매뉴얼 PDF에서 알람·에러코드·경고 테이블 포함 페이지 행 추출 출력

#### `inspect_manuals.py`
- **규모 / 구분**: 39줄 / 1.8 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L12` / `manual-pipeline` / -
- **주요 Export 심볼**: `inspect_all_manuals`, `MANUAL_DIR`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `pdfplumber`
- **핵심 기능 명세**: docs/manuals 내 전 PDF 파일 페이지 수 및 운영·트러블슈팅 키워드 포함 페이지 요약 출력

#### `scratch/check_emp.py`
- **규모 / 구분**: 14줄 / 0.5 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L12` / `scratch-diagnostic` / -
- **주요 Export 심볼**: `DATABASE_URL`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: `employees`, `space_employees` | 외부: `psycopg`
- **핵심 기능 명세**: Supabase DB의 employees 스키마 컬럼 및 space_employees 현재 레코드 목록 조회 출력

#### `scratch/check_emp_ref.py`
- **규모 / 구분**: 25줄 / 0.8 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L12` / `scratch-diagnostic` / -
- **주요 Export 심볼**: `DATABASE_URL`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: `space_employees` | 외부: `psycopg`
- **핵심 기능 명세**: space_employees 테이블에 is_active 불리언 컬럼이 없으면 추가하는 스키마 보정 스크립트

#### `scratch/check_fk.py`
- **규모 / 구분**: 27줄 / 1 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L12` / `scratch-diagnostic` / -
- **주요 Export 심볼**: `DATABASE_URL`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: `employees` | 외부: `psycopg`
- **핵심 기능 명세**: information_schema에서 employees 테이블을 참조하는 외래키 제약조건 목록 조회 출력

#### `scratch/check_schema.py`
- **규모 / 구분**: 15줄 / 0.4 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L12` / `scratch-diagnostic` / -
- **주요 Export 심볼**: `DATABASE_URL`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: `schedule_events` | 외부: `psycopg`
- **핵심 기능 명세**: information_schema에서 schedule_events 테이블의 컬럼명과 데이터타입 조회 출력

#### `scratch/dump_sql.py`
- **규모 / 구분**: 45줄 / 1.6 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L12` / `scratch-migration` / -
- **주요 Export 심볼**: `dump_table`, `DATABASE_URL`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: `schedule_events` | 외부: `psycopg`
- **핵심 기능 명세**: Supabase employees 및 schedule_events 테이블 데이터를 조회해 INSERT SQL 파일로 덤프 생성

#### `scratch/get_as_sample.py`
- **규모 / 구분**: 18줄 / 0.6 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L12` / `scratch-diagnostic` / -
- **주요 Export 심볼**: `DATABASE_URL`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: `space_schedule_events` | 외부: `psycopg`
- **핵심 기능 명세**: space_schedule_events 테이블에서 as-service 카테고리 표본 2건의 제목과 extra JSON 출력

#### `scratch/patch_emp.py`
- **규모 / 구분**: 52줄 / 1.4 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L12` / `scratch-migration` / -
- **주요 Export 심볼**: `DATABASE_URL`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: `space_employees` | 외부: `psycopg`
- **핵심 기능 명세**: space_employees에 display_order 컬럼을 추가하고 기존 행 삭제 후 임직원 12명 레코드 일괄 삽입

#### `scratch/patch_emp_active.py`
- **규모 / 구분**: 60줄 / 2.5 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L12` / `scratch-migration` / -
- **주요 Export 심볼**: `DATABASE_URL`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: `space_employees` | 외부: `psycopg`
- **핵심 기능 명세**: 외래키 참조를 유지한 채 space_employees의 is_active·display_order 컬럼을 갱신해 임직원 12명 활성화 동기화

#### `scratch/test_api_compare.py`
- **규모 / 구분**: 35줄 / 1.7 KB (test)
- **계층 / Menu ID / 대칭 쌍**: `L12` / `scratch-test` / -
- **주요 Export 심볼**: `test_compare`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `httpx ASGI TestClient`
- **핵심 기능 명세**: FastAPI ASGI TestClient로 /health 및 /api/v1/counsel/kb-compare 임베딩 비교 응답 검증

#### `scratch/update_rls.py`
- **규모 / 구분**: 21줄 / 1.1 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L12` / `scratch-rls` / -
- **주요 Export 심볼**: `DATABASE_URL`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: `space_schedule_events` | 외부: `psycopg`
- **핵심 기능 명세**: space_schedule_events 테이블의 Row Level Security 및 전체 사용자 SELECT·INSERT·UPDATE·DELETE 정책 설정

#### `scratch/update_rls2.py`
- **규모 / 구분**: 18줄 / 0.8 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L12` / `scratch-rls` / -
- **주요 Export 심볼**: `DATABASE_URL`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: `space_employees`, `space_transfer_centers` | 외부: `psycopg`
- **핵심 기능 명세**: space_transfer_centers 및 space_employees 테이블의 Row Level Security와 전체 사용자 SELECT 정책 설정

#### `start_backend_stt.bat`
- **규모 / 구분**: 13줄 / 0.4 KB (cli_script)
- **계층 / Menu ID / 대칭 쌍**: `L12` / `backend-bat-launcher` / -
- **주요 Export 심볼**: -
- **정·역방향 의존성**: Out(1): `backend/app/main.py` | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Windows cmd`, `Uvicorn`
- **핵심 기능 명세**: 로컬 Python 3.11 실행 경로를 탐색하여 포트 8000에서 FastAPI 및 GPU STT 백엔드 서버 기동

#### `test_chosung.py`
- **규모 / 구분**: 53줄 / 1.6 KB (test)
- **계층 / Menu ID / 대칭 쌍**: `L12` / `search-unit-test` / -
- **주요 Export 심볼**: `extract_chosung`, `matches_chosung`, `CHOSUNG_LIST`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: -
- **핵심 기능 명세**: 고객사명 샘플 문자열 대상 한글 초성 추출 및 부분일치 검색 함수 단위 검증

#### `test_chosung_ui.py`
- **규모 / 구분**: 68줄 / 3 KB (test)
- **계층 / Menu ID / 대칭 쌍**: `L12` / `frontend-e2e` / -
- **주요 Export 심볼**: `run_chosung_test`, `ARTIFACT_DIR`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Playwright`
- **핵심 기능 명세**: 고객사명·담당자명 초성 입력 드롭다운 필터링 및 선택 동작 브라우저 검증

#### `test_clean_symptoms_ui.py`
- **규모 / 구분**: 61줄 / 2.7 KB (test)
- **계층 / Menu ID / 대칭 쌍**: `L12` / `frontend-e2e` / -
- **주요 Export 심볼**: `run_clean_symptoms_test`, `ARTIFACT_DIR`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Playwright`
- **핵심 기능 명세**: 16대 표준 장애 유형 카드 그리드, 단일 명사 타이틀 선택 및 복수 증상 탭 진행 화면 검증

#### `test_counsel_flow.py`
- **규모 / 구분**: 57줄 / 2.6 KB (test)
- **계층 / Menu ID / 대칭 쌍**: `L12` / `frontend-e2e` / -
- **주요 Export 심볼**: `run_test`, `ARTIFACT_DIR`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Playwright`
- **핵심 기능 명세**: 배터리 증상 STEP 1~3 불량 전이, 최종 출장 전환 및 정상 해결 판정 6단계 화면 흐름 검증

#### `test_dispatch_channels.py`
- **규모 / 구분**: 146줄 / 5.8 KB (test)
- **계층 / Menu ID / 대칭 쌍**: `L12` / `frontend-e2e` / -
- **주요 Export 심볼**: `get_free_port`, `Handler`, `start_server`, `main`, `PORT`, `DIST_DIR`, `ARTIFACT_DIR`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Playwright`
- **핵심 기능 명세**: 빌드 dist 서버에서 고객 검색, 출장 접수 모달 1·2차 문서의 카톡·SMS·이메일 3채널 전환 및 A4 서식 검증

#### `test_dispatch_package_flow.py`
- **규모 / 구분**: 108줄 / 4.1 KB (test)
- **계층 / Menu ID / 대칭 쌍**: `L12` / `frontend-e2e` / -
- **주요 Export 심볼**: `Handler`, `start_server`, `main`, `PORT`, `DIST_DIR`, `ARTIFACT_DIR`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Playwright`
- **핵심 기능 명세**: 포트 5174 정적 dist 서버에서 고객 선택, 출장 문서 패키지 모달 1·2차 탭 및 A4 미리보기 전환 검증

#### `test_downstream_e2e.py`
- **규모 / 구분**: 126줄 / 4.7 KB (test)
- **계층 / Menu ID / 대칭 쌍**: `L12` / `frontend-e2e` / -
- **주요 Export 심볼**: `find_free_port`, `run_server`, `main`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Playwright`
- **핵심 기능 명세**: 자가조치 가이드 모달에서 소모품 견적 모달로의 연계 이동, 3채널 전환 및 A4 견적서 인쇄 미리보기 E2E 검증

#### `test_error_chips_ui.py`
- **규모 / 구분**: 74줄 / 3.1 KB (test)
- **계층 / Menu ID / 대칭 쌍**: `L12` / `frontend-e2e` / -
- **주요 Export 심볼**: `run_error_chips_test`, `ARTIFACT_DIR`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Playwright`
- **핵심 기능 명세**: 계기판 에러코드 칩 목록 전개, 0-C 자가해결 종결, 1-5 출장 접수 전환 및 코드 필터 동작 검증

#### `test_manual_knowledge_ui.py`
- **규모 / 구분**: 78줄 / 3.4 KB (test)
- **계층 / Menu ID / 대칭 쌍**: `L12` / `frontend-e2e` / -
- **주요 Export 심볼**: `run_manual_knowledge_test`, `ARTIFACT_DIR`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Playwright`
- **핵심 기능 명세**: 모델 제원·규격 토글, 상황별 수칙 4종 패널 탭 전환 및 스퀴지·퓨즈 점검 단계 UI 검증

#### `test_multi_symptom.py`
- **규모 / 구분**: 69줄 / 3.4 KB (test)
- **계층 / Menu ID / 대칭 쌍**: `L12` / `frontend-e2e` / -
- **주요 Export 심볼**: `run_multi_symptom_test`, `ARTIFACT_DIR`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Playwright`
- **핵심 기능 명세**: 복수 증상 선택 시 개별 탭 상태 유지, 탭 전환 복원 및 자가해결·출장필요 공존 종합 판정 흐름 검증

#### `test_parts_catalog_shopping.py`
- **규모 / 구분**: 89줄 / 4.1 KB (test)
- **계층 / Menu ID / 대칭 쌍**: `L12` / `frontend-e2e` / -
- **주요 Export 심볼**: `main`, `ARTIFACT_DIR`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Playwright`
- **핵심 기능 명세**: 소모품 카탈로그 카테고리 필터, 장바구니 담기, 수신인·발송채널 선택, DB 주문 저장 및 A4·모바일 미리보기 탭 검증

#### `test_quick_guides_nav.py`
- **규모 / 구분**: 60줄 / 2.7 KB (test)
- **계층 / Menu ID / 대칭 쌍**: `L12` / `frontend-e2e` / -
- **주요 Export 심볼**: `test_guides_navigation`, `ARTIFACT_DIR`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Playwright`
- **핵심 기능 명세**: 상단 네비게이션 상황별 수칙 진입, ?view=guides 직접 URL 접근 및 /stt 화면 연동 이동 검증

#### `test_symptom_photos.py`
- **규모 / 구분**: 63줄 / 2.6 KB (test)
- **계층 / Menu ID / 대칭 쌍**: `L12` / `frontend-e2e` / -
- **주요 Export 심볼**: `main`, `ARTIFACT_DIR`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Playwright`
- **핵심 기능 명세**: 자가조치 가이드 모달 내 사진 관리 모달 진입, 사진 순서 이동, 원본 확대 모달 및 저장 반영 흐름 검증

#### `test_vercel_live_parts_shopping.py`
- **규모 / 구분**: 102줄 / 4.3 KB (test)
- **계층 / Menu ID / 대칭 쌍**: `L12` / `live-e2e` / -
- **주요 Export 심볼**: `run`, `ARTIFACT_DIR`, `LIVE_URL`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Playwright`, `Vercel Production URL`
- **핵심 기능 명세**: 운영 Vercel 배포 환경에서 소모품 카탈로그 쇼핑, DB 주문 등록, DB 관리·A4 견적·모바일 미리보기 탭 전환 검증

#### `verify_live_vercel.py`
- **규모 / 구분**: 40줄 / 1.7 KB (test)
- **계층 / Menu ID / 대칭 쌍**: `L12` / `live-e2e` / -
- **주요 Export 심볼**: `verify_live_vercel`, `ARTIFACT_DIR`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Playwright`, `Vercel Production URL`
- **핵심 기능 명세**: 운영 Vercel 메인 화면, 상단 상황별 수칙 전개 및 ?view=guides 직접 접근 화면 캡처 검증

#### `verify_nav_reorder.py`
- **규모 / 구분**: 45줄 / 1.6 KB (test)
- **계층 / Menu ID / 대칭 쌍**: `L12` / `live-e2e` / -
- **주요 Export 심볼**: `ARTIFACT_DIR`, `LIVE_URL`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Playwright`, `Vercel Production URL`
- **핵심 기능 명세**: 운영 Vercel 신규 번들 배포 대기 후 상담지원1(/stt) 및 상담지원2(/) 네비게이션 전환 검증

#### `verify_vercel_photos.py`
- **규모 / 구분**: 74줄 / 3.1 KB (test)
- **계층 / Menu ID / 대칭 쌍**: `L12` / `live-e2e` / -
- **주요 Export 심볼**: `wait_for_deploy`, `verify_live`, `ARTIFACT_DIR`, `VERCEL_URL`
- **정·역방향 의존성**: Out(0): - | In(0): -
- **접근 DB 테이블 · 외부 연동**: DB: - | 외부: `Playwright`, `Vercel Production URL`
- **핵심 기능 명세**: 운영 Vercel 신규 번들 배포 대기 후 사진 관리 모달, 자가조치 가이드 및 중첩 사진 관리 모달 동작 검증
