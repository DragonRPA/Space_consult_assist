import React, { useEffect, useState, useCallback } from 'react';
import { X, FileAudio, RotateCcw, Copy, Check, Trash2, Search } from 'lucide-react';
import { supabase } from './scheduleApi';

export interface SttAudioArchiveRow {
  id: string;
  file_name: string;
  file_size_bytes: number;
  audio_duration_sec: number;
  stt_engine: string;
  stt_lab_options: Record<string, boolean>;
  stt_text: string;
  stt_paragraphs: string[];
  paragraph_count: number;
  detected_keywords: Array<{ id?: string; keyword?: string; category?: string }>;
  customer_name: string;
  manager_name: string;
  phone: string;
  address: string;
  equipment_model: string;
  ai_summary_issue: string;
  ai_summary_guidance: string;
  ai_summary_conclusion: string;
  ai_outcomes: Array<{
    id?: string;
    checked?: boolean;
    outcomeType?: string;
    title?: string;
    confidence?: number;
    worktype?: string;
    fields?: Record<string, any>;
  }>;
  ai_provider: string;
  consult_id: string | null;
  status: string;
  opened_at: string;
  updated_at: string;
}

interface SttArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadTranscript: (fileName: string, paragraphs: string[]) => void;
  onToast: (msg: string) => void;
}

const SWITCH_LABEL_MAP: Record<string, string> = {
  lowCut85Hz: '저역차단 85Hz',
  highBoostConsonant: '자음증폭 3.2kHz',
  dualSpeakerBalance: '2화자 음색·성량',
  rollingPrevSentence: '직전문장 포함',
  domainWordBoost: '도메인 단어장',
  wavPeakNormalize: '음량 정규화',
  boxcarAntiAliasing: '안티에일리어싱',
  dynamicEnvelopeVad: '호흡 적응절단',
};

const STATUS_BADGE_MAP: Record<string, { label: string; bg: string; color: string; border: string }> = {
  OPENED: { label: '파일열림', bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' },
  STT_PROCESSING: { label: 'STT 진행중', bg: '#eff6ff', color: '#1d4ed8', border: '#93c5fd' },
  STT_COMPLETED: { label: 'STT 추출완료', bg: '#e0f2fe', color: '#0369a1', border: '#7dd3fc' },
  AI_ANALYZED: { label: 'AI 결론생성', bg: '#fef3c7', color: '#92400e', border: '#fcd34d' },
  CONFIRMED: { label: '결론 확정마감', bg: '#dcfce7', color: '#166534', border: '#86efac' },
};

export const SttArchiveModal: React.FC<SttArchiveModalProps> = ({
  isOpen,
  onClose,
  onLoadTranscript,
  onToast,
}) => {
  const [records, setRecords] = useState<SttAudioArchiveRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [copiedFlag, setCopiedFlag] = useState(false);

  const fetchArchives = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('stt_audio_archives')
        .select('*')
        .order('opened_at', { ascending: false })
        .limit(100);

      if (error) {
        throw error;
      }
      const rows = (data || []) as SttAudioArchiveRow[];
      setRecords(rows);
      if (rows.length > 0 && (!selectedId || !rows.some((r) => r.id === selectedId))) {
        setSelectedId(rows[0].id);
      }
    } catch (err: any) {
      onToast(`기록 조회 오류: ${String(err?.message || err)}`);
    } finally {
      setIsLoading(false);
    }
  }, [selectedId, onToast]);

  useEffect(() => {
    if (isOpen) {
      fetchArchives();
    }
  }, [isOpen, fetchArchives]);

  if (!isOpen) return null;

  const filteredRecords = records.filter((r) => {
    const q = searchKeyword.trim().toLowerCase();
    if (!q) return true;
    const hay = `${r.file_name} ${r.customer_name} ${r.equipment_model} ${r.stt_text} ${r.ai_summary_issue} ${r.ai_summary_conclusion}`.toLowerCase();
    return hay.includes(q);
  });

  const activeRecord = filteredRecords.find((r) => r.id === selectedId) || filteredRecords[0] || null;

  const formatDateTime = (iso: string) => {
    if (!iso) return '-';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
  };

  const formatSize = (bytes: number) => {
    if (!bytes || bytes <= 0) return '-';
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleDeleteRecord = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { error } = await supabase.from('stt_audio_archives').delete().eq('id', id);
      if (error) throw error;
      const next = records.filter((r) => r.id !== id);
      setRecords(next);
      if (selectedId === id) {
        setSelectedId(next[0]?.id || null);
      }
      onToast('선택한 기록이 삭제되었습니다.');
    } catch (err: any) {
      onToast(`삭제 실패: ${String(err?.message || err)}`);
    }
  };

  const handleCopySet = () => {
    if (!activeRecord) return;
    const outcomesText = (activeRecord.ai_outcomes || [])
      .map((o, idx) => `${idx + 1}. [${o.outcomeType || ''}] ${o.title || ''}`)
      .join('\n');
    const fullCopy = [
      `[파일명] ${activeRecord.file_name}`,
      `[일시] ${formatDateTime(activeRecord.opened_at)}`,
      `[엔진] ${activeRecord.stt_engine}`,
      `[고객/장비] ${activeRecord.customer_name || '-'} / ${activeRecord.equipment_model || '-'}`,
      ``,
      `--- [추출된 STT 텍스트 (${activeRecord.paragraph_count || 0}문단)] ---`,
      activeRecord.stt_text || '(추출된 텍스트 없음)',
      ``,
      `--- [AI 결론 요약] ---`,
      `• 문의/증상: ${activeRecord.ai_summary_issue || '-'}`,
      `• 진단/안내: ${activeRecord.ai_summary_guidance || '-'}`,
      `• 합의 결론: ${activeRecord.ai_summary_conclusion || '-'}`,
      outcomesText ? `\n--- [AI 결론 항목] ---\n${outcomesText}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    navigator.clipboard.writeText(fullCopy);
    setCopiedFlag(true);
    setTimeout(() => setCopiedFlag(false), 2000);
    onToast('파일명 + STT 전문 + AI 결론 세트가 클립보드에 복사되었습니다.');
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.72)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 160,
        padding: '16px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '1120px',
          maxWidth: '96vw',
          height: '86vh',
          backgroundColor: '#ffffff',
          border: '1px solid #cbd5e1',
          borderRadius: '8px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.45)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* TOP HEADER */}
        <div
          style={{
            padding: '10px 16px',
            backgroundColor: '#0f172a',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', whiteSpace: 'nowrap' }}>
            <FileAudio size={17} style={{ color: '#38bdf8' }} />
            <span style={{ fontSize: '15px', fontWeight: 800 }}>
              음성파일 · STT 추출텍스트 · AI 결론 DB 기록 보관함
            </span>
            <span
              style={{
                padding: '2px 8px',
                borderRadius: '4px',
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                color: '#93c5fd',
                fontSize: '11.5px',
                fontWeight: 700,
              }}
            >
              public.stt_audio_archives · 총 {records.length}건
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
            <div style={{ position: 'relative', width: '240px' }}>
              <Search
                size={13}
                style={{ position: 'absolute', left: '8px', top: '8px', color: '#94a3b8' }}
              />
              <input
                type="text"
                placeholder="파일명, 고객사, 모델, 대화내용 검색"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '5px 8px 5px 26px',
                  borderRadius: '5px',
                  border: '1px solid #334155',
                  backgroundColor: '#1e293b',
                  color: '#f8fafc',
                  fontSize: '12px',
                  outline: 'none',
                }}
              />
            </div>

            <button
              onClick={fetchArchives}
              style={{
                padding: '5px 10px',
                borderRadius: '5px',
                border: '1px solid #475569',
                backgroundColor: '#1e293b',
                color: '#f8fafc',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <RotateCcw size={12} />
              <span>새로고침</span>
            </button>

            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '4px',
                display: 'inline-flex',
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* BODY: LEFT LIST (38%) + RIGHT DETAIL (62%) */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>
          {/* LEFT: ARCHIVE LIST */}
          <div
            style={{
              width: '38%',
              borderRight: '1px solid #cbd5e1',
              backgroundColor: '#f8fafc',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
            }}
          >
            <div
              style={{
                padding: '8px 12px',
                borderBottom: '1px solid #e2e8f0',
                fontSize: '11.5px',
                fontWeight: 800,
                color: '#475569',
                display: 'flex',
                justifyContent: 'space-between',
                whiteSpace: 'nowrap',
              }}
            >
              <span>열어본 음성 파일 및 세션 목록 ({filteredRecords.length}건)</span>
              <span>최근순</span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '6px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {isLoading ? (
                <div style={{ padding: '24px', textAlign: 'center', fontSize: '12.5px', color: '#64748b', fontWeight: 700 }}>
                  DB 기록을 불러오는 중...
                </div>
              ) : filteredRecords.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', fontSize: '12.5px', color: '#64748b' }}>
                  저장된 음성 파일·STT 기록이 없습니다.
                </div>
              ) : (
                filteredRecords.map((row) => {
                  const isSelected = activeRecord?.id === row.id;
                  const badge = STATUS_BADGE_MAP[row.status] || STATUS_BADGE_MAP.OPENED;
                  return (
                    <div
                      key={row.id}
                      onClick={() => setSelectedId(row.id)}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: isSelected ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                        backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0, overflow: 'hidden' }}>
                          <FileAudio size={13} style={{ color: '#0284c7', flexShrink: 0 }} />
                          <span
                            style={{
                              fontSize: '12.5px',
                              fontWeight: 800,
                              color: '#0f172a',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {row.file_name}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                          <span
                            style={{
                              padding: '1px 6px',
                              borderRadius: '4px',
                              fontSize: '10.5px',
                              fontWeight: 800,
                              backgroundColor: badge.bg,
                              color: badge.color,
                              border: `1px solid ${badge.border}`,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {badge.label}
                          </span>
                          <button
                            onClick={(e) => handleDeleteRecord(row.id, e)}
                            title="기록 삭제"
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#94a3b8',
                              cursor: 'pointer',
                              padding: '2px',
                              display: 'inline-flex',
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '11px',
                          color: '#64748b',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <span>{formatDateTime(row.opened_at)}</span>
                        <span>
                          {row.stt_engine === 'whisper_large_v3'
                            ? 'Groq Whisper'
                            : row.stt_engine === 'web_speech'
                              ? '웹 음성 STT'
                              : row.stt_engine}{' '}
                          · {row.paragraph_count || 0}문단
                        </span>
                      </div>

                      <div
                        style={{
                          fontSize: '11.5px',
                          color: '#334155',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {row.ai_summary_conclusion
                          ? `[AI 결론] ${row.ai_summary_conclusion}`
                          : row.stt_text
                            ? row.stt_text.replace(/\n+/g, ' ')
                            : '(STT 추출 대기중)'}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT: SELECTED RECORD DETAIL */}
          <div
            style={{
              width: '62%',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              backgroundColor: '#ffffff',
            }}
          >
            {!activeRecord ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '13px' }}>
                좌측 목록에서 확인할 기록을 선택하세요.
              </div>
            ) : (
              <>
                {/* Detail Top Bar */}
                <div
                  style={{
                    padding: '10px 14px',
                    borderBottom: '1px solid #e2e8f0',
                    backgroundColor: '#f8fafc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    flexShrink: 0,
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                        {activeRecord.file_name}
                      </span>
                      <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600 }}>
                        ({formatSize(activeRecord.file_size_bytes)} · {Number(activeRecord.audio_duration_sec || 0).toFixed(1)}s)
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11.5px', color: '#475569', whiteSpace: 'nowrap' }}>
                      <span>열람일시: {formatDateTime(activeRecord.opened_at)}</span>
                      <span>|</span>
                      <span>고객사: {activeRecord.customer_name || '미식별'}</span>
                      <span>|</span>
                      <span>모델: {activeRecord.equipment_model || '미식별'}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, whiteSpace: 'nowrap' }}>
                    <button
                      onClick={handleCopySet}
                      style={{
                        padding: '5px 10px',
                        borderRadius: '5px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        color: '#0f172a',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      {copiedFlag ? <Check size={13} style={{ color: '#059669' }} /> : <Copy size={13} />}
                      <span>세트 전체 복사</span>
                    </button>

                    <button
                      onClick={() => {
                        const paras =
                          Array.isArray(activeRecord.stt_paragraphs) && activeRecord.stt_paragraphs.length > 0
                            ? activeRecord.stt_paragraphs
                            : (activeRecord.stt_text || '').split('\n').filter(Boolean);
                        if (paras.length === 0) {
                          onToast('불러올 STT 텍스트가 없습니다.');
                          return;
                        }
                        onLoadTranscript(activeRecord.file_name, paras);
                        onClose();
                      }}
                      style={{
                        padding: '5px 10px',
                        borderRadius: '5px',
                        border: 'none',
                        backgroundColor: '#2563eb',
                        color: '#ffffff',
                        fontSize: '12px',
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                    >
                      현재 화면으로 자막 불러오기
                    </button>
                  </div>
                </div>

                {/* Detail Body Scroll */}
                <div
                  style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  {/* 1. Active Switches Snapshot */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#334155' }}>
                      1. 적용된 STT 엔진 및 전처리 스위치 구성
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      <span
                        style={{
                          padding: '2px 7px',
                          borderRadius: '4px',
                          backgroundColor: '#ffedd5',
                          border: '1px solid #fdba74',
                          color: '#9a3412',
                          fontSize: '11px',
                          fontWeight: 800,
                        }}
                      >
                        엔진: {activeRecord.stt_engine}
                      </span>
                      {Object.entries(SWITCH_LABEL_MAP).map(([k, label]) => {
                        const on = Boolean(activeRecord.stt_lab_options?.[k]);
                        return (
                          <span
                            key={k}
                            style={{
                              padding: '2px 7px',
                              borderRadius: '4px',
                              backgroundColor: on ? '#eff6ff' : '#f1f5f9',
                              border: on ? '1px solid #93c5fd' : '1px solid #cbd5e1',
                              color: on ? '#1e3a8a' : '#94a3b8',
                              fontSize: '11px',
                              fontWeight: 700,
                            }}
                          >
                            {label}: {on ? 'ON' : 'OFF'}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. Extracted STT Text */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#334155' }}>
                        2. 추출된 STT 텍스트 전문 ({activeRecord.paragraph_count || 0}문단)
                      </span>
                    </div>
                    <div
                      style={{
                        maxHeight: '240px',
                        overflowY: 'auto',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        backgroundColor: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        fontSize: '12.5px',
                        lineHeight: 1.65,
                        color: '#0f172a',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {activeRecord.stt_text || '(추출된 STT 텍스트가 없습니다)'}
                    </div>
                  </div>

                  {/* 3. AI Conclusion Set */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#334155' }}>
                        3. AI 결론 세트 (3줄 핵심 요약 & 5대 결론 항목)
                      </span>
                      {activeRecord.ai_provider && (
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>
                          분석 모델: {activeRecord.ai_provider}
                        </span>
                      )}
                    </div>

                    {activeRecord.ai_summary_issue ||
                    activeRecord.ai_summary_guidance ||
                    activeRecord.ai_summary_conclusion ||
                    (activeRecord.ai_outcomes && activeRecord.ai_outcomes.length > 0) ? (
                      <div
                        style={{
                          padding: '10px 12px',
                          borderRadius: '6px',
                          backgroundColor: '#f0fdf4',
                          border: '1px solid #86efac',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          fontSize: '12.5px',
                        }}
                      >
                        <div>
                          <strong style={{ color: '#166534' }}>• 문의/증상: </strong>
                          <span style={{ color: '#0f172a' }}>{activeRecord.ai_summary_issue || '-'}</span>
                        </div>
                        <div>
                          <strong style={{ color: '#166534' }}>• 진단/안내: </strong>
                          <span style={{ color: '#0f172a' }}>{activeRecord.ai_summary_guidance || '-'}</span>
                        </div>
                        <div>
                          <strong style={{ color: '#166534' }}>• 합의 결론: </strong>
                          <span style={{ color: '#0f172a', fontWeight: 700 }}>
                            {activeRecord.ai_summary_conclusion || '-'}
                          </span>
                        </div>

                        {Array.isArray(activeRecord.ai_outcomes) && activeRecord.ai_outcomes.length > 0 && (
                          <div
                            style={{
                              marginTop: '6px',
                              paddingTop: '6px',
                              borderTop: '1px dashed #86efac',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px',
                            }}
                          >
                            {activeRecord.ai_outcomes.map((o, idx) => (
                              <div
                                key={o.id || idx}
                                style={{
                                  padding: '5px 8px',
                                  borderRadius: '4px',
                                  backgroundColor: '#ffffff',
                                  border: '1px solid #bbf7d0',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  fontSize: '12px',
                                }}
                              >
                                <div>
                                  <strong style={{ color: '#15803d', marginRight: '6px' }}>
                                    [{o.outcomeType}]
                                  </strong>
                                  <span style={{ color: '#0f172a', fontWeight: 700 }}>{o.title}</span>
                                </div>
                                <span style={{ fontSize: '11px', color: '#475569', fontWeight: 600 }}>
                                  {o.worktype || ''}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div
                        style={{
                          padding: '14px',
                          borderRadius: '6px',
                          backgroundColor: '#f8fafc',
                          border: '1px dashed #cbd5e1',
                          color: '#64748b',
                          fontSize: '12px',
                          textAlign: 'center',
                        }}
                      >
                        아직 AI 상담 마감 결론이 생성되지 않은 기록입니다. (우측 하단 [AI 상담 마감 · 일정/대장 일괄전송] 실행 시 AI 결론이 이 레코드에 세트로 자동 합산 저장됩니다)
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
