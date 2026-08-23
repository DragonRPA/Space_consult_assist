# Space Advisor — 상담 보조 시스템

> 저숙련 상담사가 고객 전화 응대 중 AI가 실시간으로 셀프조치 스크립트를 제시하고, 출장 일정을 자동 접수하는 웹서비스.

## 기술 스택

| 영역 | 기술 |
|---|---|
| 백엔드 | FastAPI + SQLAlchemy 2.0 + Alembic |
| DB | Supabase (PostgreSQL 16, ap-northeast-2) |
| LLM | Ollama (로컬, 무료) |
| 프론트엔드 | React + Vite monorepo (desktop + mobile) |
| STT | Web Speech API (P2) + WASAPI Loopback + faster-whisper (P4+) |
| 모바일 | PWA (Service Worker + Background Sync) |
| 알림 | 카카오 알림톡 (알리고, CEO 결재 후 활성화) |
| CI/CD | GitHub Actions |

## 폴더 구조

```
Space_consult_assist/
├── backend/               # FastAPI 백엔드
│   ├── app/
│   │   ├── api/v1/        # REST API 엔드포인트
│   │   ├── services/      # 비즈니스 로직 (분류엔진, STT, 알림)
│   │   ├── models/        # SQLAlchemy 모델
│   │   └── core/          # 설정, 인증, DB 연결
│   └── alembic/           # DB 마이그레이션
├── frontend/
│   └── packages/
│       ├── common/        # 공유 컴포넌트 (shadcn/ui)
│       ├── desktop/       # 상담사 데스크톱 화면 (/counsel)
│       └── mobile/        # 현장정비사 모바일 (/mobile, PWA)
├── docs/                  # 설계 문서
├── scripts/               # 데이터 임포트, 유틸 스크립트
├── docker-compose.yml     # FastAPI + Nginx + Ollama
└── .env.example           # 환경변수 템플릿
```

## 개발 단계

- **Phase 0**: 기반 설계 (DB DDL, docker-compose, monorepo 설정)
- **Phase 1**: 백엔드 API + 데이터 파이프라인 (분류엔진, fact.csv 임포트)
- **Phase 2**: 상담 화면 MVP (P2a: 핵심 플로우 / P2b: STT)
- **Phase 3**: 관리 화면 + 출장 데스크톱
- **Phase 4**: 현장정비사 모바일 (PWA + WASAPI Loopback STT POC)
- **Phase 5**: LLM 고도화 + 통계 + Silent STT 운영
- **Phase 6**: 안정화 (카카오 알림톡 전체 체계)
