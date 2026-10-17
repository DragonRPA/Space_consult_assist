-- =====================================================================
-- public.stt_audio_archives 테이블 및 스키마 생성 / 확장
-- 목적: 열어본 음성 파일명 + 추출 STT 엔진명 + 작업일시(KST) + STT 추출 텍스트 + 전처리 스위치 설정 + AI 결론 세트 통합 저장
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.stt_audio_archives (
    id                      uuid DEFAULT gen_random_uuid() PRIMARY KEY,

    -- 1. 원본 음성 파일 메타데이터
    file_name               text NOT NULL,
    file_size_bytes         bigint DEFAULT 0,
    audio_duration_sec      numeric(10, 2) DEFAULT 0,

    -- 2. STT 추출 엔진 및 전처리 스위치 상태
    stt_engine              text NOT NULL DEFAULT 'whisper_large_v3',
    stt_engine_label        text NOT NULL DEFAULT 'Groq Whisper (whisper-large-v3-turbo)',
    stt_lab_options         jsonb NOT NULL DEFAULT '{}'::jsonb,

    -- 3. 작업일시 (타임스탬프 및 한국시간 문자열)
    work_datetime           timestamptz NOT NULL DEFAULT now(),
    work_datetime_kst       text NOT NULL DEFAULT '',
    stt_completed_at        timestamptz NULL,
    ai_analyzed_at          timestamptz NULL,

    -- 4. 추출된 STT 텍스트 및 문단 상세
    stt_text                text NOT NULL DEFAULT '',
    stt_paragraphs          jsonb NOT NULL DEFAULT '[]'::jsonb,
    paragraph_count         integer NOT NULL DEFAULT 0,
    detected_keywords       jsonb NOT NULL DEFAULT '[]'::jsonb,

    -- 5. 고객·장비 식별 정보
    customer_name           text DEFAULT '',
    manager_name            text DEFAULT '',
    phone                   text DEFAULT '',
    address                 text DEFAULT '',
    equipment_model         text DEFAULT '',

    -- 6. AI 결론 세트 (3줄 핵심 요약 + 5대 결론 카드 배열)
    ai_summary_issue        text DEFAULT '',
    ai_summary_guidance     text DEFAULT '',
    ai_summary_conclusion   text DEFAULT '',
    ai_outcomes             jsonb NOT NULL DEFAULT '[]'::jsonb,
    ai_provider             text DEFAULT '',

    -- 7. 연계 마스터 상담 ID 및 진행 상태
    consult_id              uuid NULL,
    status                  text NOT NULL DEFAULT 'OPENED', -- OPENED | STT_PROCESSING | STT_COMPLETED | AI_ANALYZED | CONFIRMED

    opened_at               timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now()
);

-- 기존 테이블에 신규 컬럼 멱등 추가
ALTER TABLE public.stt_audio_archives ADD COLUMN IF NOT EXISTS stt_engine_label  text NOT NULL DEFAULT 'Groq Whisper (whisper-large-v3-turbo)';
ALTER TABLE public.stt_audio_archives ADD COLUMN IF NOT EXISTS work_datetime     timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.stt_audio_archives ADD COLUMN IF NOT EXISTS work_datetime_kst text NOT NULL DEFAULT '';
ALTER TABLE public.stt_audio_archives ADD COLUMN IF NOT EXISTS stt_completed_at  timestamptz NULL;
ALTER TABLE public.stt_audio_archives ADD COLUMN IF NOT EXISTS ai_analyzed_at    timestamptz NULL;

CREATE INDEX IF NOT EXISTS idx_stt_audio_archives_opened_at     ON public.stt_audio_archives(opened_at DESC);
CREATE INDEX IF NOT EXISTS idx_stt_audio_archives_work_datetime ON public.stt_audio_archives(work_datetime DESC);
CREATE INDEX IF NOT EXISTS idx_stt_audio_archives_stt_engine    ON public.stt_audio_archives(stt_engine);
CREATE INDEX IF NOT EXISTS idx_stt_audio_archives_file_name     ON public.stt_audio_archives(file_name);
CREATE INDEX IF NOT EXISTS idx_stt_audio_archives_status        ON public.stt_audio_archives(status);
CREATE INDEX IF NOT EXISTS idx_stt_audio_archives_customer      ON public.stt_audio_archives(customer_name);

ALTER TABLE public.stt_audio_archives ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stt_audio_archives_anon_select" ON public.stt_audio_archives;
CREATE POLICY "stt_audio_archives_anon_select" ON public.stt_audio_archives
    FOR SELECT TO anon, authenticated, service_role USING (true);

DROP POLICY IF EXISTS "stt_audio_archives_anon_insert" ON public.stt_audio_archives;
CREATE POLICY "stt_audio_archives_anon_insert" ON public.stt_audio_archives
    FOR INSERT TO anon, authenticated, service_role WITH CHECK (true);

DROP POLICY IF EXISTS "stt_audio_archives_anon_update" ON public.stt_audio_archives;
CREATE POLICY "stt_audio_archives_anon_update" ON public.stt_audio_archives
    FOR UPDATE TO anon, authenticated, service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "stt_audio_archives_anon_delete" ON public.stt_audio_archives;
CREATE POLICY "stt_audio_archives_anon_delete" ON public.stt_audio_archives
    FOR DELETE TO anon, authenticated, service_role USING (true);
