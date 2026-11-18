import type { Dispatch, RefObject, SetStateAction } from 'react';
import { FileAudio, RotateCcw, Upload, X, Zap } from 'lucide-react';
import {
  DOMAIN_KEYWORD_REGISTRY,
  type EntityRule,
  type KeywordEntity,
} from './keywordRegistryData';
import { findMatchingSymptomEntities } from './keywordExtractors';
import { renderMultiColorHighlightedText } from './keywordAssist';
import type { CustomerInfo, MatchedDiagnosis } from './store';
import { formatAudioTime, type SttLabOptions } from './sttAudioDsp';

export interface LegacySttTranscriptPaneProps {
  activeAudioFile: File | null;
  isRecording: boolean;
  isAudioPlaying: boolean;
  toggleAudioPlayback: () => void;
  audioCurrentTime: number;
  audioDuration: number;
  handleClearAudioFile: () => void;
  resetSessionForNewAudio: () => void;
  setJustTriggeredKeyword: Dispatch<SetStateAction<string | null>>;
  setConfirmedSlotFlags: Dispatch<
    SetStateAction<{ customer: boolean; phone: boolean; address: boolean; model: boolean }>
  >;
  setRecommendedClosingAction: Dispatch<SetStateAction<'NONE' | 'PARTS_QUOTE' | 'DISPATCH' | 'RESOLVED'>>;
  showToast: (msg: string) => void;
  clearToast: () => void;
  sttLabOptions: SttLabOptions;
  applySttLabPreset: (mode: 'RAW_DEFAULT' | 'RECOMMENDED' | 'ALL_ON') => void;
  hoveredSttHelp: { label: string; desc: string; status?: string } | null;
  setHoveredSttHelp: Dispatch<SetStateAction<{ label: string; desc: string; status?: string } | null>>;
  toggleSttLabOption: (key: keyof SttLabOptions) => void;
  transcriptBoxRef: RefObject<HTMLDivElement | null>;
  isUserScrolledUp: boolean;
  setIsUserScrolledUp: Dispatch<SetStateAction<boolean>>;
  isDragOverDropzone: boolean;
  setIsDragOverDropzone: Dispatch<SetStateAction<boolean>>;
  activeParagraphs: string[];
  interimSttText: string;
  customerList: CustomerInfo[];
  selectedCustomer: CustomerInfo | null;
  handleKeywordSelect: (entity: KeywordEntity) => void;
  handleCustomerSelect: (customer: CustomerInfo) => void;
  handleActionSelect: (rule: EntityRule) => void;
  justTriggeredKeyword: string | null;
  detectedKeywordEntities: KeywordEntity[];
  addDetectedKeywordEntity: (entity: KeywordEntity) => void;
  activeKeywordEntity: KeywordEntity | null;
  showAllSymptoms: boolean;
  setShowAllSymptoms: Dispatch<SetStateAction<boolean>>;
  matchedDiagnosis: MatchedDiagnosis | null;
  manualOverrideKeyword: string;
  setManualOverrideKeyword: (kw: string) => void;
  setDiagnosisResult: (keywords: string[], diagnosis: MatchedDiagnosis, checklist: string[]) => void;
  setSelectedCustomerModel: (modelName: string) => void;
}

export function LegacySttTranscriptPane({
  activeAudioFile,
  isRecording,
  isAudioPlaying,
  toggleAudioPlayback,
  audioCurrentTime,
  audioDuration,
  handleClearAudioFile,
  resetSessionForNewAudio,
  setJustTriggeredKeyword,
  setConfirmedSlotFlags,
  setRecommendedClosingAction,
  showToast,
  clearToast,
  sttLabOptions,
  applySttLabPreset,
  hoveredSttHelp,
  setHoveredSttHelp,
  toggleSttLabOption,
  transcriptBoxRef,
  isUserScrolledUp,
  setIsUserScrolledUp,
  isDragOverDropzone,
  setIsDragOverDropzone,
  activeParagraphs,
  interimSttText,
  customerList,
  selectedCustomer,
  handleKeywordSelect,
  handleCustomerSelect,
  handleActionSelect,
  justTriggeredKeyword,
  detectedKeywordEntities,
  addDetectedKeywordEntity,
  activeKeywordEntity,
  showAllSymptoms,
  setShowAllSymptoms,
  matchedDiagnosis,
  manualOverrideKeyword,
  setManualOverrideKeyword,
  setDiagnosisResult,
  setSelectedCustomerModel,
}: LegacySttTranscriptPaneProps) {
  return (
    <section style={{
      width: '37%',
      minHeight: 0,
      backgroundColor: 'var(--surface-1)',
      border: '1px solid var(--hairline)',
      borderRadius: '8px',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Slim Transcript Header + Subtle Entity Legend + Audio Player */}
      <div style={{
        padding: '8px 12px',
        borderBottom: '1px solid var(--hairline)',
        backgroundColor: activeAudioFile ? '#e0f2fe' : isRecording ? '#ecfdf5' : 'var(--surface-1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '8px',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, overflow: 'hidden' }}>
          <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--ink)', whiteSpace: 'nowrap' }}>
            실시간 대화 자막
          </span>
          {activeAudioFile ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', overflow: 'hidden', whiteSpace: 'nowrap' }}>
              <FileAudio size={13} style={{ color: '#0284c7', flexShrink: 0 }} />
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>
                {activeAudioFile.name}
              </span>
              <span className="font-mono" style={{ fontSize: '11.5px', color: '#475569', fontWeight: 600 }}>
                {formatAudioTime(audioCurrentTime)}/{formatAudioTime(audioDuration)}
              </span>
              <button
                onClick={toggleAudioPlayback}
                style={{
                  padding: '2px 7px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: isAudioPlaying ? '#dc2626' : '#2563eb',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {isAudioPlaying ? '일시정지' : '재생'}
              </button>
              <button
                onClick={handleClearAudioFile}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '2px' }}
              >
                <X size={13} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', whiteSpace: 'nowrap' }}>
              <span style={{ padding: '1px 5px', borderRadius: '3px', backgroundColor: '#bfdbfe', color: '#1e3a8a', fontWeight: 700 }}>고객</span>
              <span style={{ padding: '1px 5px', borderRadius: '3px', backgroundColor: '#fde68a', color: '#78350f', fontWeight: 700 }}>위치</span>
              <span style={{ padding: '1px 5px', borderRadius: '3px', backgroundColor: '#e9d5ff', color: '#581c87', fontWeight: 700 }}>모델</span>
              <span style={{ padding: '1px 5px', borderRadius: '3px', backgroundColor: '#fecaca', color: '#7f1d1d', fontWeight: 700 }}>증상</span>
              <span style={{ padding: '1px 5px', borderRadius: '3px', backgroundColor: '#a7f3d0', color: '#064e3b', fontWeight: 700 }}>조치</span>
            </div>
          )}
        </div>

        {/* Reset Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0, whiteSpace: 'nowrap' }}>
          {activeParagraphs.length > 0 && (
            <button
              onClick={() => {
                resetSessionForNewAudio();
                setJustTriggeredKeyword(null);
                setRecommendedClosingAction('NONE');
                setConfirmedSlotFlags({ customer: false, phone: false, address: false, model: false });
              }}
              title="대화 초기화"
              style={{
                padding: '3px 6px',
                borderRadius: '4px',
                border: '1px solid var(--hairline)',
                backgroundColor: 'var(--surface-2)',
                color: 'var(--ink-muted)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center'
              }}
            >
              <RotateCcw size={11} />
            </button>
          )}
        </div>
      </div>

      {/* STT 전처리·문맥 개별 스위치 바 (8대 기법 개별 ON/OFF 실험용) */}
      <div
        onMouseLeave={() => setHoveredSttHelp(null)}
        style={{
          position: 'relative',
          padding: '6px 10px',
          borderBottom: '1px solid var(--hairline)',
          backgroundColor: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          gap: '5px',
          flexShrink: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#334155', whiteSpace: 'nowrap' }}>
            전처리·문맥 스위치
          </span>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <button
              onClick={() => applySttLabPreset('RAW_DEFAULT')}
              title="순정 원본 (전체 OFF): 8가지 음향 전처리·문맥 주입·적응형 절단을 모두 끄고 원본 오디오(고정 5.5초 주기) 그대로 STT 엔진에 전송합니다."
              onMouseEnter={() =>
                setHoveredSttHelp({
                  label: '순정 원본 (전체 OFF)',
                  status: '프리셋',
                  desc: '8가지 음향 전처리·문맥 주입·적응형 절단을 모두 끄고 원본 오디오(고정 5.5초 주기) 그대로 STT 엔진에 전송합니다.'
                })
              }
              onMouseLeave={() => setHoveredSttHelp(null)}
              style={{
                padding: '2px 6px',
                fontSize: '10.5px',
                fontWeight: 700,
                borderRadius: '4px',
                border: '1px solid #cbd5e1',
                backgroundColor: Object.values(sttLabOptions).every((v) => !v) ? '#0f172a' : '#ffffff',
                color: Object.values(sttLabOptions).every((v) => !v) ? '#ffffff' : '#475569',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              순정 원본 (전체 OFF)
            </button>
            <button
              onClick={() => applySttLabPreset('RECOMMENDED')}
              title="권장 설정: 실시간 통화 최적 5종 ON(2화자 음색·성량, 직전문장, 도메인단어장, 음량정규화, 안티에일리어싱) / 3종 OFF(저역차단, 자음증폭, 호흡적응절단)를 일괄 적용합니다."
              onMouseEnter={() =>
                setHoveredSttHelp({
                  label: '권장 설정',
                  status: '프리셋',
                  desc: '실시간 통화 최적 5종 ON(2화자 음색·성량, 직전문장, 도메인단어장, 음량정규화, 안티에일리어싱) / 3종 OFF(저역차단, 자음증폭, 호흡적응절단)를 일괄 적용합니다.'
                })
              }
              onMouseLeave={() => setHoveredSttHelp(null)}
              style={{
                padding: '2px 6px',
                fontSize: '10.5px',
                fontWeight: 700,
                borderRadius: '4px',
                border: '1px solid #cbd5e1',
                backgroundColor:
                  !sttLabOptions.lowCut85Hz &&
                  !sttLabOptions.highBoostConsonant &&
                  sttLabOptions.dualSpeakerBalance &&
                  sttLabOptions.rollingPrevSentence &&
                  sttLabOptions.domainWordBoost &&
                  sttLabOptions.wavPeakNormalize &&
                  sttLabOptions.boxcarAntiAliasing &&
                  !sttLabOptions.dynamicEnvelopeVad
                    ? '#2563eb'
                    : '#ffffff',
                color:
                  !sttLabOptions.lowCut85Hz &&
                  !sttLabOptions.highBoostConsonant &&
                  sttLabOptions.dualSpeakerBalance &&
                  sttLabOptions.rollingPrevSentence &&
                  sttLabOptions.domainWordBoost &&
                  sttLabOptions.wavPeakNormalize &&
                  sttLabOptions.boxcarAntiAliasing &&
                  !sttLabOptions.dynamicEnvelopeVad
                    ? '#ffffff'
                    : '#475569',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              권장 설정
            </button>
            <button
              onClick={() => applySttLabPreset('ALL_ON')}
              title="전체 켜기: 자음증폭(3.2kHz)을 포함한 8가지 전처리·문맥·음색 보정 기법을 모두 활성화합니다."
              onMouseEnter={() =>
                setHoveredSttHelp({
                  label: '전체 켜기',
                  status: '프리셋',
                  desc: '자음증폭(3.2kHz)을 포함한 8가지 전처리·문맥·음색 보정 기법을 모두 활성화합니다.'
                })
              }
              onMouseLeave={() => setHoveredSttHelp(null)}
              style={{
                padding: '2px 6px',
                fontSize: '10.5px',
                fontWeight: 700,
                borderRadius: '4px',
                border: '1px solid #cbd5e1',
                backgroundColor: Object.values(sttLabOptions).every(Boolean) ? '#059669' : '#ffffff',
                color: Object.values(sttLabOptions).every(Boolean) ? '#ffffff' : '#475569',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              전체 켜기
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '4px' }}>
          {(
            [
              {
                key: 'lowCut85Hz',
                label: '저역차단 85Hz',
                desc: '85Hz 이하 저주파 대역(에어컨·환풍기·책상 진동·마이크 험 노이즈)을 고역통과 필터(HPF)로 제거하여 무음 오인식 및 저역 마스킹을 방지합니다.'
              },
              {
                key: 'highBoostConsonant',
                label: '자음증폭 3.2kHz',
                desc: '3.2kHz 대역 피킹 필터(+4.5dB)로 한국어 파열음·마찰음(ㄱ,ㄷ,ㅂ,ㅅ,ㅈ,ㅊ,ㅋ,ㅌ,ㅍ) 명료도를 증폭합니다. 고역 치찰음이 강할 때는 OFF 하세요.'
              },
              {
                key: 'dualSpeakerBalance',
                label: '2화자 음색·성량',
                desc: '상담원과 고객의 음색 높낮이(먹먹한 저음 화자 틸트 보정) 및 마이크 거리 차이로 인한 볼륨 편차를 문장 구간별로 자동 평탄화합니다.'
              },
              {
                key: 'rollingPrevSentence',
                label: '직전문장 포함',
                desc: '직전 1~2문장의 인식 결과를 다음 음성 조각의 문맥 프롬프트(Whisper prompt)로 전달하여 끊어진 문장 연결과 동음이의어 추론을 강화합니다.'
              },
              {
                key: 'domainWordBoost',
                label: '도메인 단어장',
                desc: '청소장비 모델명(J600T, S7, XD80 등), 주요 부품(스퀴지, 흡입모터, 솔레노이드), 현장 용어를 엔진 사전 프롬프트에 주입하여 고유명사 오타를 줄입니다.'
              },
              {
                key: 'wavPeakNormalize',
                label: '음량 정규화',
                desc: '전송 직전 PCM 파형의 DC 오프셋을 제거하고 최대 피크를 -1.4dBFS(85% 진폭)로 정규화하여 작은 목소리도 균일한 음량으로 인식시킵니다.'
              },
              {
                key: 'boxcarAntiAliasing',
                label: '안티에일리어싱',
                desc: '48kHz 원본 음성을 16kHz로 다운샘플링할 때 단순 샘플 건너뛰기 대신 구간 평균(Boxcar LPF)을 적용해 고주파 접힘 왜곡(Aliasing)을 차단합니다.'
              },
              {
                key: 'dynamicEnvelopeVad',
                label: '호흡 적응절단',
                desc: '고정 5.5초 기계적 절단 대신 화자의 발화 속도·에너지 낙폭(Envelope Drop)과 주변 소음 바닥을 추적하여 자연스러운 호흡·구절 단위로 음성을 절단합니다.'
              },
            ] as const
          ).map((item) => {
            const isOn = sttLabOptions[item.key];
            return (
              <button
                key={item.key}
                onClick={() => {
                  toggleSttLabOption(item.key);
                  setHoveredSttHelp({
                    label: item.label,
                    status: !isOn ? '현재 ON' : '현재 OFF',
                    desc: item.desc
                  });
                }}
                title={`${item.label} (${isOn ? 'ON' : 'OFF'}): ${item.desc}`}
                onMouseEnter={() =>
                  setHoveredSttHelp({
                    label: item.label,
                    status: isOn ? '현재 ON' : '현재 OFF',
                    desc: item.desc
                  })
                }
                onMouseLeave={() => setHoveredSttHelp(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '4px',
                  padding: '3px 6px',
                  borderRadius: '4px',
                  border: isOn ? '1px solid #2563eb' : '1px solid #cbd5e1',
                  backgroundColor: isOn ? '#eff6ff' : '#ffffff',
                  color: isOn ? '#1e3a8a' : '#64748b',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden'
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
                <span
                  style={{
                    padding: '0px 4px',
                    borderRadius: '3px',
                    fontSize: '9.5px',
                    fontWeight: 800,
                    backgroundColor: isOn ? '#2563eb' : '#e2e8f0',
                    color: isOn ? '#ffffff' : '#64748b',
                    flexShrink: 0
                  }}
                >
                  {isOn ? 'ON' : 'OFF'}
                </span>
              </button>
            );
          })}
        </div>

        {hoveredSttHelp && (
          <div
            style={{
              position: 'absolute',
              left: '8px',
              right: '8px',
              top: 'calc(100% + 4px)',
              zIndex: 45,
              backgroundColor: '#0f172a',
              color: '#f8fafc',
              border: '1px solid #334155',
              borderRadius: '6px',
              padding: '7px 10px',
              boxShadow: '0 8px 20px rgba(15, 23, 42, 0.28)',
              pointerEvents: 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: '3px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#38bdf8' }}>
                {hoveredSttHelp.label}
              </span>
              {hoveredSttHelp.status && (
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    padding: '1px 5px',
                    borderRadius: '3px',
                    backgroundColor:
                      hoveredSttHelp.status === '현재 ON'
                        ? '#1d4ed8'
                        : hoveredSttHelp.status === '현재 OFF'
                          ? '#334155'
                          : '#0369a1',
                    color: '#ffffff'
                  }}
                >
                  {hoveredSttHelp.status}
                </span>
              )}
            </div>
            <div style={{ fontSize: '11.5px', lineHeight: 1.45, color: '#e2e8f0', fontWeight: 500 }}>
              {hoveredSttHelp.desc}
            </div>
          </div>
        )}
      </div>

      {/* Live Transcript Box (70% height) */}
      <div style={{ flex: 1, minHeight: 0, padding: '8px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <div
          ref={transcriptBoxRef}
          onDragEnter={() => setIsDragOverDropzone(true)}
          onDragLeave={() => setIsDragOverDropzone(false)}
          onScroll={(e) => {
            const target = e.currentTarget;
            const isUp = target.scrollHeight - target.scrollTop - target.clientHeight > 80;
            setIsUserScrolledUp(isUp);
          }}
          style={{
            flex: 1,
            minHeight: 0,
            backgroundColor: isDragOverDropzone ? 'rgba(37, 99, 235, 0.14)' : 'var(--surface-2)',
            border: isDragOverDropzone ? '2px dashed var(--accent-primary)' : '1px solid var(--hairline)',
            borderRadius: '6px',
            padding: '10px 12px',
            overflowY: 'auto',
            overflowX: 'hidden',
            wordBreak: 'break-word',
            fontSize: '13.5px',
            lineHeight: 1.65,
            color: 'var(--ink)',
            position: 'relative'
          }}
        >
          {isDragOverDropzone && (
            <div style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(37, 99, 235, 0.22)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#1e3a8a',
              fontWeight: 800,
              fontSize: '14px',
              zIndex: 20,
              borderRadius: '6px'
            }}>
              <Upload size={28} style={{ marginBottom: '6px' }} />
              <span>음성(.m4a) 또는 대화 텍스트(.txt) 드롭</span>
            </div>
          )}

          {activeParagraphs.length > 0 ? (
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.65, fontSize: '13.5px' }}>
              {activeParagraphs.map((line, pIdx) => {
                const match = line.match(
                  /^(\[\d{1,2}:\d{2}(?::\d{2})?\])\s*(\[\d+(?:\.\d+)?s\s*·\s*[^\]]+\])?\s*(.*)$/
                );
                const timestampBadge = match ? match[1] : null;
                const chunkSizeBadge = match ? match[2] : null;
                const contentText = match ? match[3] : line;

                return (
                  <div key={pIdx} style={{ display: 'flex', alignItems: 'baseline', gap: '6px', minHeight: '1.5em', marginBottom: '4px' }}>
                    {timestampBadge && (
                      <span style={{
                        fontFamily: 'monospace',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: 'var(--ink-muted)',
                        backgroundColor: 'var(--surface-3)',
                        border: '1px solid var(--hairline)',
                        borderRadius: '3px',
                        padding: '0px 4px',
                        flexShrink: 0,
                        whiteSpace: 'nowrap',
                        userSelect: 'none'
                      }}>
                        {timestampBadge}
                      </span>
                    )}
                    {chunkSizeBadge && (
                      <span style={{
                        fontFamily: 'monospace',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        color: '#0369a1',
                        backgroundColor: '#f0f9ff',
                        border: '1px solid #bae6fd',
                        borderRadius: '3px',
                        padding: '0px 5px',
                        flexShrink: 0,
                        whiteSpace: 'nowrap',
                        userSelect: 'none'
                      }}>
                        {chunkSizeBadge}
                      </span>
                    )}
                    <div style={{ flex: 1 }}>
                      {renderMultiColorHighlightedText(
                        contentText,
                        {
                          onSymptomClick: handleKeywordSelect,
                          onCustomerClick: handleCustomerSelect,
                          onSiteClick: handleCustomerSelect,
                          onModelClick: (modelId) => {
                            setSelectedCustomerModel(modelId);
                            setConfirmedSlotFlags(prev => ({ ...prev, model: true }));
                            showToast(`[장비모델 클릭: ${modelId}] 선택 고객 장비 매핑 완료`);
                            setTimeout(() => clearToast(), 2500);
                          },
                          onActionClick: handleActionSelect
                        },
                        activeKeywordEntity?.id,
                        selectedCustomer?.id,
                        customerList
                      )}
                    </div>
                  </div>
                );
              })}

              {(interimSttText || isRecording) && (
                <div style={{ minHeight: '1.4em', marginTop: '4px' }}>
                  <span style={{
                    color: '#1e40af',
                    backgroundColor: '#dbeafe',
                    border: '1px solid #93c5fd',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontWeight: 700,
                    fontSize: '13px'
                  }}>
                    {interimSttText && interimSttText !== '듣는중'
                      ? renderMultiColorHighlightedText(
                          interimSttText,
                          {
                            onSymptomClick: handleKeywordSelect,
                            onCustomerClick: handleCustomerSelect,
                            onSiteClick: handleCustomerSelect,
                            onModelClick: (modelId) => {
                              setSelectedCustomerModel(modelId);
                              setConfirmedSlotFlags(prev => ({ ...prev, model: true }));
                            },
                            onActionClick: handleActionSelect
                          },
                          activeKeywordEntity?.id,
                          selectedCustomer?.id,
                          customerList
                        )
                      : '듣는중'}
                  </span>
                </div>
              )}
            </div>
          ) : (interimSttText || isRecording) ? (
            <div>
              <span style={{
                color: '#1e40af',
                backgroundColor: '#dbeafe',
                border: '1px solid #93c5fd',
                padding: '2px 8px',
                borderRadius: '4px',
                fontWeight: 700,
                fontSize: '13px'
              }}>
                {interimSttText && interimSttText !== '듣는중'
                  ? renderMultiColorHighlightedText(
                      interimSttText,
                      {
                        onSymptomClick: handleKeywordSelect,
                        onCustomerClick: handleCustomerSelect,
                        onSiteClick: handleCustomerSelect,
                        onModelClick: (modelId) => {
                          setSelectedCustomerModel(modelId);
                          setConfirmedSlotFlags(prev => ({ ...prev, model: true }));
                        },
                        onActionClick: handleActionSelect
                      },
                      activeKeywordEntity?.id,
                      selectedCustomer?.id,
                      customerList
                    )
                  : '듣는중'}
              </span>
            </div>
          ) : null}
        </div>

        {isUserScrolledUp && (
          <button
            onClick={() => {
              if (transcriptBoxRef.current) {
                transcriptBoxRef.current.scrollTop = transcriptBoxRef.current.scrollHeight;
                setIsUserScrolledUp(false);
              }
            }}
            style={{
              position: 'absolute',
              bottom: '16px',
              right: '16px',
              backgroundColor: 'var(--accent-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: '14px',
              padding: '4px 10px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              zIndex: 10
            }}
          >
            최신 발화 ↓
          </button>
        )}
      </div>

      {/* Compact Detected Symptom & Part Strip (Bottom of Panel B) */}
      <div style={{ padding: '10px', borderTop: '1px solid var(--hairline)', backgroundColor: 'var(--surface-1)', display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink-muted)', whiteSpace: 'nowrap' }}>
              감지 증상 ({detectedKeywordEntities.length})
            </span>
            {justTriggeredKeyword && (
              <span style={{ fontSize: '11.5px', color: 'var(--accent-success)', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                <Zap size={11} /> {justTriggeredKeyword}
              </span>
            )}
          </div>
          <button
            onClick={() => setShowAllSymptoms(!showAllSymptoms)}
            style={{
              fontSize: '11.5px',
              padding: '2px 7px',
              borderRadius: '4px',
              backgroundColor: showAllSymptoms ? 'var(--accent-primary)' : 'var(--surface-2)',
              border: '1px solid var(--hairline)',
              color: showAllSymptoms ? '#fff' : 'var(--ink-muted)',
              cursor: 'pointer',
              fontWeight: 600,
              whiteSpace: 'nowrap'
            }}
          >
            {showAllSymptoms ? '증상목록 닫기' : '+ 수동 증상 선택'}
          </button>
        </div>

        {/* Detected Symptom Chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', minHeight: '26px', alignItems: 'center' }}>
          {detectedKeywordEntities.length > 0 ? (
            detectedKeywordEntities.map((entity) => {
              const isSelected = activeKeywordEntity?.id === entity.id;
              return (
                <button
                  key={entity.id}
                  onClick={() => handleKeywordSelect(entity)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '5px',
                    backgroundColor: isSelected ? 'var(--accent-primary)' : '#eff6ff',
                    border: `1px solid ${isSelected ? 'var(--accent-primary)' : '#93c5fd'}`,
                    color: isSelected ? '#fff' : '#1d4ed8',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  #{entity.keyword}
                </button>
              );
            })
          ) : (
            <span style={{ fontSize: '12px', color: 'var(--ink-subtle)' }}>대기 중 (발화 시 자동 포착)</span>
          )}
        </div>

        {showAllSymptoms && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', padding: '6px', backgroundColor: 'var(--surface-2)', borderRadius: '5px', border: '1px solid var(--hairline)' }}>
            {DOMAIN_KEYWORD_REGISTRY.map((entity) => {
              const isSelected = activeKeywordEntity?.id === entity.id;
              return (
                <button
                  key={entity.id}
                  onClick={() => {
                    addDetectedKeywordEntity(entity);
                    handleKeywordSelect(entity);
                  }}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '4px',
                    backgroundColor: isSelected ? 'var(--accent-primary)' : 'var(--surface-1)',
                    border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--hairline)'}`,
                    color: isSelected ? '#fff' : 'var(--ink)',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  #{entity.keyword}
                </button>
              );
            })}
          </div>
        )}

        {/* Matched Part Compact Bar + Manual Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {matchedDiagnosis ? (
            <div style={{
              flex: 1,
              padding: '6px 10px',
              borderRadius: '5px',
              backgroundColor: 'var(--surface-2)',
              border: '1px solid var(--hairline)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '6px',
              fontSize: '12px',
              minWidth: 0
            }}>
              <strong style={{ color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {matchedDiagnosis.partName}
              </strong>
              <span style={{ color: 'var(--ink-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                <code style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>{matchedDiagnosis.partCode}</code> · 재고 {matchedDiagnosis.stock}개
              </span>
            </div>
          ) : null}

          <div style={{ display: 'flex', gap: '4px', flex: matchedDiagnosis ? 0.85 : 1 }}>
            <input
              type="text"
              placeholder="수동 증상/부품 입력"
              value={manualOverrideKeyword}
              onChange={(e) => setManualOverrideKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && manualOverrideKeyword.trim()) {
                  const kw = manualOverrideKeyword.trim();
                  const localMatches = findMatchingSymptomEntities(kw);
                  if (localMatches.length > 0) {
                    addDetectedKeywordEntity(localMatches[0]);
                    handleKeywordSelect(localMatches[0]);
                  } else {
                    setDiagnosisResult(
                      [kw],
                      {
                        category: kw,
                        partCode: 'MANUAL_PART',
                        partName: kw,
                        stock: 10,
                        confidence: 100,
                        source: 'manual',
                        selfActionGuide: `${kw} 관련 전원 차단 및 1차 외관 상태를 확인해 주십시오.`
                      },
                      ['1단계: 전원 차단 및 외관 상태 확인', '2단계: 체결 부위 및 소모품 마모 점검', '3단계: 재가동 테스트']
                    );
                  }
                  setManualOverrideKeyword('');
                }
              }}
              style={{
                flex: 1,
                padding: '5px 8px',
                backgroundColor: 'var(--surface-2)',
                border: '1px solid var(--hairline)',
                borderRadius: '4px',
                color: 'var(--ink)',
                fontSize: '12px',
                minWidth: '90px'
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
