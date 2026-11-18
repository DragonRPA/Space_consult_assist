import type { Dispatch, MouseEvent, SetStateAction } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  Cpu,
  Edit3,
  History,
  Layers,
  Loader2,
  Package,
  RefreshCw,
  Search,
  ShieldAlert,
  Smartphone,
  Sparkles,
  Wrench,
  X,
} from 'lucide-react';
import { getModelErrorCodePanelTitle } from './modelErrorCodesData';
import type { SitePhotoSketchEvidence } from './SelfActionGuideModal';
import type {
  CounselStatus,
  Customer,
  DiagnosticStep,
  KbResult,
  OfficialErrorCode,
  SymptomSession,
} from './counselShared';

export interface CounselV2RightStudioProps {
  sessionList: SymptomSession[];
  isLoadingPlan: boolean;
  selectedModel: string;
  selectedCustomer: Customer | null;
  activeSymptomKey: string | null;
  setActiveSymptomKey: Dispatch<SetStateAction<string | null>>;
  handleCloseSession: (keyToClose: string, e?: MouseEvent) => void;
  currentSession: SymptomSession | null;
  activeStep: DiagnosticStep | null;
  errorCodeFilter: string;
  setErrorCodeFilter: Dispatch<SetStateAction<string>>;
  handleSelectErrorCode: (codeObj: OfficialErrorCode) => void;
  handleInstantResolveByErrorCode: (codeObj: OfficialErrorCode) => void;
  handleClearSelectedErrorCode: () => void;
  handleStepSelect: (stepIdx: number) => void;
  handleStepResolve: (stepIdx: number) => void;
  handleStepFail: (stepIdx: number) => void;
  isLoadingKb: boolean;
  kbResults: KbResult[];
  isHistoryExpanded: boolean;
  setIsHistoryExpanded: Dispatch<SetStateAction<boolean>>;
  overallStatus: CounselStatus;
  photoEvidence: SitePhotoSketchEvidence | null;
  notes: string;
  setNotes: Dispatch<SetStateAction<string>>;
  customSymptom: string;
  isSaving: boolean;
  handleSavePending: () => Promise<void>;
  handleSave: (isVisit: boolean) => Promise<void>;
  setShowSelfActionGuideModal: Dispatch<SetStateAction<boolean>>;
  setShowPartsOrderModal: Dispatch<SetStateAction<boolean>>;
  setShowEquipmentManualModal: Dispatch<SetStateAction<boolean>>;
}

export function CounselV2RightStudio({
  sessionList,
  isLoadingPlan,
  selectedModel,
  selectedCustomer,
  activeSymptomKey,
  setActiveSymptomKey,
  handleCloseSession,
  currentSession,
  activeStep,
  errorCodeFilter,
  setErrorCodeFilter,
  handleSelectErrorCode,
  handleInstantResolveByErrorCode,
  handleClearSelectedErrorCode,
  handleStepSelect,
  handleStepResolve,
  handleStepFail,
  isLoadingKb,
  kbResults,
  isHistoryExpanded,
  setIsHistoryExpanded,
  overallStatus,
  photoEvidence,
  notes,
  setNotes,
  customSymptom,
  isSaving,
  handleSavePending,
  handleSave,
  setShowSelfActionGuideModal,
  setShowPartsOrderModal,
  setShowEquipmentManualModal,
}: CounselV2RightStudioProps) {
  return (
    <div data-testid="detail-studio" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, height: '100%', overflow: 'hidden' }}>

      {/* 증상 미선택 시 대기 화면 (고밀도 전문 가이드) - 디테일 스튜디오 */}
      {sessionList.length === 0 && !isLoadingPlan && (
        <div style={{
          flex: 1,
          background: '#ece7de',
          borderRadius: 8,
          border: '1px solid #dcd5c9',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 24px',
          gap: 16,
          boxShadow: '0 1px 3px rgba(40,30,20,0.05)'
        }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: '#f5f2eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid #dcd5c9'
          }}>
            <Layers size={22} color="#64748b" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center' }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>상담 증상 대기</span>
            <span style={{ fontSize: 13.5, color: '#64748b', maxWidth: 480, lineHeight: 1.5 }}>
              좌측에서 고객의 호소 증상 또는 계기판 에러코드를 선택하면 단계별 표준 진단 절차와 안내 스크립트가 실행됩니다.
            </span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 10,
            width: '100%',
            maxWidth: 620,
            marginTop: 8
          }}>
            <div style={{ background: '#f5f2eb', border: '1px solid #dcd5c9', borderRadius: 6, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, fontWeight: 800, color: '#1e40af' }}>
                <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#dbeafe', color: '#1d4ed8', fontSize: 13.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>1</span>
                <span>모델 및 고객 확인</span>
              </div>
              <span style={{ fontSize: 13.5, color: '#64748b', lineHeight: 1.4 }}>장비 모델과 고객사 연락처를 좌측 상단에서 확인합니다.</span>
            </div>

            <div style={{ background: '#f5f2eb', border: '1px solid #dcd5c9', borderRadius: 6, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, fontWeight: 800, color: '#1e40af' }}>
                <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#dbeafe', color: '#1d4ed8', fontSize: 13.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>2</span>
                <span>증상 및 에러코드 선택</span>
              </div>
              <span style={{ fontSize: 13.5, color: '#64748b', lineHeight: 1.4 }}>초성 검색 또는 퀵버튼으로 일치하는 증상을 선택합니다.</span>
            </div>

            <div style={{ background: '#f5f2eb', border: '1px solid #dcd5c9', borderRadius: 6, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, fontWeight: 800, color: '#1e40af' }}>
                <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#dbeafe', color: '#1d4ed8', fontSize: 13.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>3</span>
                <span>진단 및 종결</span>
              </div>
              <span style={{ fontSize: 13.5, color: '#64748b', lineHeight: 1.4 }}>단계별 조치 후 전화 종결, 고객 대기, 출장 접수를 완결합니다.</span>
            </div>
          </div>
        </div>
      )}

      {isLoadingPlan && (
        <div style={{ flex: 1, background: '#ece7de', borderRadius: 8, border: '1px solid #dcd5c9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Loader2 size={24} color="#1d4ed8" style={{ animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: 14, color: '#334155', fontWeight: 700 }}>대응 조치 계획 분석 중...</span>
        </div>
      )}

      {/* 증상 세션이 1개 이상 존재할 때 꽉 차는 활성 스튜디오 */}
      {sessionList.length > 0 && currentSession && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, overflow: 'hidden' }}>

          {/* ── [우측 최상단: 다수 증상 세션 탭 바 + 상황별 매뉴얼 수칙 버튼] ── */}
          <div style={{ background: '#ece7de', borderRadius: 8, border: '1px solid #dcd5c9', padding: '6px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginRight: 4, color: '#475569', fontSize: 13.5, fontWeight: 800, whiteSpace: 'nowrap' }}>
                <Layers size={15} color="#2563eb" />
                <span>진단 증상 ({sessionList.length}):</span>
              </div>

              {sessionList.map(s => {
                const isCurrent = s.key === activeSymptomKey;
                const isResolved = s.status === 'resolved_by_call';
                const isFault = s.status === 'visit_required';

                return (
                  <div
                    key={s.key}
                    data-symptom-tab={s.key}
                    onClick={() => setActiveSymptomKey(s.key)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '4px 10px',
                      borderRadius: 6,
                      fontSize: 13.5,
                      fontWeight: isCurrent ? 700 : 500,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      border: isCurrent
                        ? '1px solid #93c5fd'
                        : isResolved
                        ? '1px solid #a7f3d0'
                        : isFault
                        ? '1px solid #fecaca'
                        : '1px solid #dcd5c9',
                      borderBottom: isCurrent ? '2px solid #1d4ed8' : undefined,
                      background: isCurrent
                        ? '#eff6ff'
                        : isResolved
                        ? '#ecfdf5'
                        : isFault
                        ? '#fef2f2'
                        : '#f5f2eb',
                      color: isCurrent
                        ? '#1d4ed8'
                        : isResolved
                        ? '#059669'
                        : isFault
                        ? '#dc2626'
                        : '#475569',
                      boxShadow: isCurrent ? '0 1px 2px rgba(37,99,235,0.08)' : 'none',
                      transition: 'all 0.12s ease'
                    }}
                  >
                    <span>{s.title}</span>
                    <span style={{
                      fontSize: 13.5,
                      padding: '1px 5px',
                      borderRadius: 3,
                      fontWeight: 700,
                      background: isResolved ? '#f0fdf4' : isFault ? '#fef2f2' : '#e2e8f0',
                      color: isResolved ? '#059669' : isFault ? '#dc2626' : '#475569'
                    }}>
                      {isResolved ? '해결' : isFault ? '출장' : `STEP ${s.activeStepIndex + 1}`}
                    </span>
                    <button
                      onClick={(e) => handleCloseSession(s.key, e)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0, display: 'flex', alignItems: 'center' }}
                    >
                      <X size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* [상단 파이프라인] 증상 판정 ➔ 자가조치 가이드 ➔ 현장 회신 대기 ➔ 종결 분기 4단계 스테퍼 */}
          <div
            style={{
              background: '#ece7de',
              borderRadius: 8,
              border: '1px solid #dcd5c9',
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              flexShrink: 0
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, overflowX: 'auto' }}>
              {/* 단계 1: 증상 판정 */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: '#dbeafe',
                  color: '#1e40af',
                  padding: '4px 10px',
                  borderRadius: 4,
                  fontSize: 13.5,
                  fontWeight: 800,
                  border: '1px solid #93c5fd',
                  whiteSpace: 'nowrap'
                }}
              >
                <span>1. 증상 판정</span>
                <CheckCircle2 size={13} color="#1d4ed8" />
              </div>

              <ChevronRight size={14} color="#94a3b8" />

              {/* 단계 2: 자가조치 가이드 (사진/영상) */}
              <button
                type="button"
                onClick={() => setShowSelfActionGuideModal(true)}
                data-uia="btn-stepper-self-guide"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: '#fef3c7',
                  color: '#92400e',
                  padding: '4px 10px',
                  borderRadius: 4,
                  fontSize: 13.5,
                  fontWeight: 800,
                  border: '1px solid #fcd34d',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                <Smartphone size={13} color="#b45309" />
                <span>2. 자가조치 가이드 (사진·영상 전송)</span>
              </button>

              <ChevronRight size={14} color="#94a3b8" />

              {/* 단계 3: 현장 사진 회신 대기 (스케치) */}
              <button
                type="button"
                onClick={() => setShowSelfActionGuideModal(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: photoEvidence ? '#fee2e2' : '#f5f2eb',
                  color: photoEvidence ? '#b91c1c' : '#64748b',
                  padding: '4px 10px',
                  borderRadius: 4,
                  fontSize: 13.5,
                  fontWeight: 800,
                  border: photoEvidence ? '1px solid #fecaca' : '1px solid #dcd5c9',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                <Edit3 size={13} />
                <span>3. 현장 회신 대기 {photoEvidence ? '(사진 접수됨)' : '(스케치 링크)'}</span>
              </button>

              <ChevronRight size={14} color="#94a3b8" />

              {/* 단계 4: 종결 분기 (해결 / 부품 / 출장) */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: '#f5f2eb',
                  color: '#334155',
                  padding: '4px 10px',
                  borderRadius: 4,
                  fontSize: 13.5,
                  fontWeight: 800,
                  border: '1px solid #dcd5c9',
                  whiteSpace: 'nowrap'
                }}
              >
                <span>4. 결과 분기 (직접해결 / 소모품 / AS 출장)</span>
              </div>
            </div>

            {/* 우측 퀵 가이드 버튼 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                type="button"
                onClick={() => setShowSelfActionGuideModal(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  background: '#1d4ed8',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 4,
                  padding: '4px 10px',
                  fontSize: 13.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                <Smartphone size={13} />
                <span>가이드 열기</span>
              </button>
            </div>
          </div>

          {/* [우측 1구역] 현재 활성 증상 헤더 & 표준 안내 스크립트 */}
          <div style={{ background: '#ece7de', borderRadius: 8, border: '1px solid #dcd5c9', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0, boxShadow: '0 1px 2px rgba(40,30,20,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Layers size={15} color="#2563eb" />
                <span style={{ fontSize: 14.5, fontWeight: 800, color: '#0f172a' }}>
                  {currentSession.title}
                </span>
                <span style={{ fontSize: 13.5, padding: '2px 7px', borderRadius: 4, background: '#ece7de', color: '#475569', fontWeight: 600, border: '1px solid #dcd5c9' }}>
                  부품: {currentSession.part_code}
                </span>
                <span style={{
                  fontSize: 13.5,
                  padding: '2px 7px',
                  borderRadius: 4,
                  background: currentSession.urgency === '긴급' ? '#fef2f2' : '#f5f2eb',
                  color: currentSession.urgency === '긴급' ? '#dc2626' : '#64748b',
                  fontWeight: 700,
                  border: currentSession.urgency === '긴급' ? '1px solid #fecaca' : '1px solid #dcd5c9'
                }}>
                  {currentSession.urgency}
                </span>
              </div>

              {/* 해당 증상의 현재 진단 상태 */}
              <div>
                {currentSession.status === 'resolved_by_call' ? (
                  <span style={{ fontSize: 13.5, padding: '3px 10px', borderRadius: 4, background: '#ecfdf5', color: '#059669', fontWeight: 700, border: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <CheckCircle2 size={14} /> 전화 조치 해결 완료
                  </span>
                ) : currentSession.status === 'visit_required' ? (
                  <span style={{ fontSize: 13.5, padding: '3px 10px', borderRadius: 4, background: '#fef2f2', color: '#dc2626', fontWeight: 700, border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <ShieldAlert size={14} /> AS 출장 접수 필요
                  </span>
                ) : (
                  <span style={{ fontSize: 13.5, padding: '3px 10px', borderRadius: 4, background: '#eff6ff', color: '#2563eb', fontWeight: 700, border: '1px solid #dbeafe', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <RefreshCw size={13} style={{ animation: 'spin 3s linear infinite' }} /> 단계별 진단 진행 중
                  </span>
                )}
              </div>
            </div>

            {/* 표준 안내 스크립트 */}
            <div style={{ background: '#f5f2eb', border: '1px solid #dcd5c9', borderRadius: 6, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={14} color="#2563eb" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 13.5, fontWeight: 700, color: '#1e40af', whiteSpace: 'nowrap' }}>표준 안내:</span>
              <span style={{ fontSize: 14, color: '#1e293b', fontWeight: 600 }}>
                "{currentSession.call_script}"
              </span>
            </div>
          </div>

          {/* ── [제조사 공식 계기판 에러 코드 퀵 칩 & 원클릭 즉시 판정 콘솔] ── */}
          {currentSession.official_error_codes && currentSession.official_error_codes.length > 0 && (
            <div style={{
              background: '#ece7de',
              borderRadius: 8,
              border: '1px solid #dcd5c9',
              padding: '10px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              boxShadow: '0 1px 3px rgba(37,99,235,0.05)',
              flexShrink: 0
            }}>
              {/* 패널 헤더: 타이틀 & 검색창 */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <Cpu size={15} color="#2563eb" />
                  <span style={{ fontSize: 14, fontWeight: 800, color: '#1e40af', whiteSpace: 'nowrap' }}>
                    {getModelErrorCodePanelTitle(selectedModel, currentSession.official_error_codes.length)}
                  </span>
                  <span style={{ fontSize: 13.5, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '2px 7px', borderRadius: 4, fontWeight: 700, whiteSpace: 'nowrap' }}>
                    즉시 판정
                  </span>
                </div>

                {/* 코드 빠른 검색창 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, width: 240 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    background: '#f5f2eb',
                    border: '1px solid #dcd5c9',
                    borderRadius: 5,
                    padding: '3px 8px',
                    width: '100%',
                    height: 28
                  }}>
                    <Search size={12} color="#64748b" />
                    <input
                      type="text"
                      placeholder={
                        selectedModel.includes('J600') || selectedModel.includes('J800')
                          ? "알람 검색 (예: 22V, 퓨즈, 역류...)"
                          : selectedModel.includes('S12')
                          ? "알람 검색 (예: TANK, BRUSH...)"
                          : selectedModel.includes('W12') || selectedModel.includes('W15')
                          ? "알람 검색 (예: LED, 차단기, 호퍼...)"
                          : selectedModel.includes('쓰담')
                          ? "알람 검색 (예: LIDAR, STOP...)"
                          : "코드 검색 (예: 0-C, 0-0, 888...)"
                      }
                      value={errorCodeFilter}
                      onChange={e => setErrorCodeFilter(e.target.value)}
                      style={{
                        border: 'none',
                        outline: 'none',
                        background: 'transparent',
                        fontSize: 13.5,
                        width: '100%'
                      }}
                    />
                    {errorCodeFilter && (
                      <button
                        onClick={() => setErrorCodeFilter('')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#94a3b8' }}
                      >
                        <X size={11} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* 퀵 칩 가로 리스트 */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {currentSession.official_error_codes
                  .filter(ec => {
                    const q = errorCodeFilter.trim().toLowerCase();
                    if (!q) return true;
                    return ec.code.toLowerCase().includes(q) ||
                           ec.name.toLowerCase().includes(q) ||
                           ec.category.toLowerCase().includes(q) ||
                           ec.meaning.toLowerCase().includes(q);
                  })
                  .map(ec => {
                    const isSelected = currentSession.selectedErrorCode?.code === ec.code;
                    const isVisit = ec.resolution_type === 'VISIT_REQUIRED';

                    return (
                      <button
                        key={ec.code}
                        data-error-chip={ec.code}
                        onClick={() => handleSelectErrorCode(ec)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '4px 10px',
                          borderRadius: 5,
                          fontSize: 13.5,
                          fontWeight: isSelected ? 700 : 500,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          border: isSelected
                            ? '1px solid #1d4ed8'
                            : '1px solid #dcd5c9',
                          background: isSelected
                            ? '#1d4ed8'
                            : '#f5f2eb',
                          color: isSelected
                            ? '#ffffff'
                            : '#1e293b',
                          boxShadow: isSelected ? '0 1px 3px rgba(29,78,216,0.3)' : '0 1px 2px rgba(0,0,0,0.02)',
                          transition: 'all 0.12s ease'
                        }}
                      >
                        <span style={{
                          fontWeight: 700,
                          fontFamily: 'SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                          background: isSelected ? 'rgba(255,255,255,0.2)' : isVisit ? '#fef2f2' : '#f0fdf4',
                          color: isSelected ? '#ffffff' : isVisit ? '#b91c1c' : '#15803d',
                          border: isSelected ? 'none' : isVisit ? '1px solid #fecaca' : '1px solid #bbf7d0',
                          padding: '1px 6px',
                          borderRadius: 3,
                          fontSize: 13.5,
                          letterSpacing: '0.3px'
                        }}>
                          {ec.code}
                        </span>
                        <span style={{ fontSize: 13.5, fontWeight: isSelected ? 700 : 600 }}>{ec.name}</span>
                        <span style={{
                          fontSize: 13.5,
                          fontWeight: 700,
                          padding: '1px 5px',
                          borderRadius: 3,
                          background: isSelected ? 'rgba(255,255,255,0.2)' : isVisit ? '#fef2f2' : '#f0fdf4',
                          color: isSelected ? '#ffffff' : isVisit ? '#dc2626' : '#16a34a'
                        }}>
                          {isVisit ? '출장' : '전화해결'}
                        </span>
                      </button>
                    );
                  })}
              </div>

              {/* 칩 선택 시 활성화되는 [원클릭 즉시 판정 카드] */}
              {currentSession.selectedErrorCode && (
                <div style={{
                  background: '#f5f2eb',
                  border: currentSession.selectedErrorCode.resolution_type === 'VISIT_REQUIRED' ? '1px solid #fca5a5' : '1px solid #86efac',
                  borderRadius: 6,
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 7,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{
                        fontSize: 14,
                        fontWeight: 800,
                        fontFamily: 'SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        background: currentSession.selectedErrorCode.resolution_type === 'VISIT_REQUIRED' ? '#dc2626' : '#16a34a',
                        color: '#ffffff',
                        padding: '3px 8px',
                        borderRadius: 4
                      }}>
                        {currentSession.selectedErrorCode.code}
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
                        {currentSession.selectedErrorCode.name} ({currentSession.selectedErrorCode.category})
                      </span>
                      <span style={{
                        fontSize: 13.5,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 4,
                        background: currentSession.selectedErrorCode.resolution_type === 'VISIT_REQUIRED' ? '#fef2f2' : '#f0fdf4',
                        color: currentSession.selectedErrorCode.resolution_type === 'VISIT_REQUIRED' ? '#b91c1c' : '#15803d',
                        border: currentSession.selectedErrorCode.resolution_type === 'VISIT_REQUIRED' ? '1px solid #fecaca' : '1px solid #bbf7d0'
                      }}>
                        {currentSession.selectedErrorCode.resolution_type === 'VISIT_REQUIRED' ? 'AS 출장 접수 대상' : '전화 조치 종결 가능'}
                      </span>
                    </div>

                    <button
                      onClick={handleClearSelectedErrorCode}
                      style={{
                        background: '#f5f2eb',
                        border: '1px solid #dcd5c9',
                        borderRadius: 4,
                        cursor: 'pointer',
                        fontSize: 13.5,
                        fontWeight: 600,
                        color: '#64748b',
                        padding: '3px 10px'
                      }}
                    >
                      선택 해제
                    </button>
                  </div>

                  {/* 상태/원인 설명 */}
                  <div style={{ fontSize: 14, color: '#334155', fontWeight: 500, lineHeight: 1.45 }}>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>원인 및 점검 포인트: </span>
                    {currentSession.selectedErrorCode.meaning}
                  </div>

                  {/* 표준 안내 */}
                  <div style={{
                    background: '#f5f2eb',
                    border: '1px solid #dcd5c9',
                    borderRadius: 6,
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8
                  }}>
                    <Sparkles size={14} color="#2563eb" style={{ flexShrink: 0, marginTop: 2 }} />
                    <span style={{ fontSize: 14, color: '#0f172a', fontWeight: 600, lineHeight: 1.45 }}>
                      "{currentSession.selectedErrorCode.call_script}"
                    </span>
                  </div>

                  {/* 즉시 판정 확정 버튼 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 2 }}>
                    {currentSession.selectedErrorCode.resolution_type === 'RESOLVED' ? (
                      <button
                        data-instant-resolve-btn
                        onClick={() => handleInstantResolveByErrorCode(currentSession.selectedErrorCode!)}
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          padding: '8px 14px',
                          background: '#059669',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: 5,
                          fontSize: 14,
                          fontWeight: 700,
                          cursor: 'pointer',
                          boxShadow: '0 1px 3px rgba(5,150,105,0.2)',
                          transition: 'all 0.12s ease'
                        }}
                      >
                        <CheckCircle2 size={15} />
                        <span>[{currentSession.selectedErrorCode.code}] 전화 조치 완료 (해결 종결)</span>
                      </button>
                    ) : (
                      <button
                        data-instant-visit-btn
                        onClick={() => handleInstantResolveByErrorCode(currentSession.selectedErrorCode!)}
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          padding: '8px 14px',
                          background: '#dc2626',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: 5,
                          fontSize: 14,
                          fontWeight: 700,
                          cursor: 'pointer',
                          boxShadow: '0 1px 3px rgba(220,38,38,0.2)',
                          transition: 'all 0.12s ease'
                        }}
                      >
                        <ShieldAlert size={15} />
                        <span>[{currentSession.selectedErrorCode.code}] AS 출장 접수 전환 (부품: {currentSession.selectedErrorCode.part_code || currentSession.part_code})</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* [우측 2구역] 현재 증상의 스텝 네비게이션 프로그레스 바 */}
          <div style={{ background: '#ece7de', borderRadius: 8, border: '1px solid #dcd5c9', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 13.5, fontWeight: 800, color: '#475569', whiteSpace: 'nowrap' }}>진단 절차:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flex: 1, overflowX: 'auto' }}>
              {currentSession.steps.map((st, idx) => {
                const isSelected = currentSession.activeStepIndex === idx;
                const isResolved = st.status === 'resolved';
                const isUnresolved = st.status === 'unresolved';

                return (
                  <button
                    key={idx}
                    onClick={() => handleStepSelect(idx)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '4px 10px',
                      borderRadius: 4,
                      fontSize: 13.5,
                      fontWeight: isSelected ? 800 : 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      border: isSelected
                        ? '1px solid #2563eb'
                        : isResolved
                        ? '1px solid #86efac'
                        : isUnresolved
                        ? '1px solid #fca5a5'
                        : '1px solid #dcd5c9',
                      background: isSelected
                        ? '#eff6ff'
                        : isResolved
                        ? '#f0fdf4'
                        : isUnresolved
                        ? '#fef2f2'
                        : '#f5f2eb',
                      color: isSelected
                        ? '#1d4ed8'
                        : isResolved
                        ? '#15803d'
                        : isUnresolved
                        ? '#b91c1c'
                        : '#475569',
                      transition: 'all 0.1s ease'
                    }}
                  >
                    <span>STEP {st.step_no}</span>
                    {isResolved && <Check size={12} color="#16a34a" />}
                    {isUnresolved && <X size={12} color="#dc2626" />}
                    {idx < currentSession.steps.length - 1 && (
                      <ChevronRight size={12} color="#94a3b8" style={{ marginLeft: 2 }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* [우측 3구역] 실시간 진단-판정 콘솔 (현재 증상 트리의 Active Step 카드) */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto' }}>

            {activeStep && (
              <div style={{ background: '#ece7de', borderRadius: 8, border: '1px solid #dcd5c9', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10, boxShadow: '0 1px 3px rgba(40,30,20,0.05)' }}>

                {/* 스텝 제목 & 현재 상태 */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e8e2d8', paddingBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 800, background: '#2563eb', color: '#ffffff', padding: '2px 8px', borderRadius: 4 }}>
                      STEP {activeStep.step_no}
                    </span>
                    <span style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
                      {activeStep.title}
                    </span>
                  </div>
                  <div>
                    {activeStep.status === 'resolved' ? (
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: '#059669', display: 'flex', alignItems: 'center', gap: 4, background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '3px 10px', borderRadius: 4 }}>
                        <CheckCircle2 size={14} /> 정상 해결
                      </span>
                    ) : activeStep.status === 'unresolved' ? (
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 4, background: '#fef2f2', border: '1px solid #fecaca', padding: '3px 10px', borderRadius: 4 }}>
                        <AlertTriangle size={14} /> 불량 판정
                      </span>
                    ) : (
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: '#2563eb', display: 'flex', alignItems: 'center', gap: 4, background: '#eff6ff', border: '1px solid #dbeafe', padding: '3px 10px', borderRadius: 4 }}>
                        <RefreshCw size={13} style={{ animation: 'spin 3s linear infinite' }} /> 안내 진행
                      </span>
                    )}
                  </div>
                </div>

                {/* 1. 조치 및 시험 방법 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, background: '#f5f2eb', padding: '10px 14px', borderRadius: 6, border: '1px solid #dcd5c9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Wrench size={13} color="#475569" />
                      <label style={{ fontSize: 13.5, fontWeight: 800, color: '#334155' }}>
                        조치 및 시험 방법
                      </label>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowSelfActionGuideModal(true)}
                      data-uia="btn-send-step-self-guide"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        border: '1px solid #bfdbfe',
                        borderRadius: 4,
                        padding: '3px 10px',
                        fontSize: 13.5,
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <Smartphone size={13} />
                      <span>자가조치 가이드 (사진/영상) 현장 전송</span>
                    </button>
                  </div>
                  <p style={{ margin: 0, fontSize: 14, color: '#0f172a', fontWeight: 600, lineHeight: 1.5 }}>
                    {activeStep.method || activeStep.title}
                  </p>
                </div>

                {/* 2. 정상 vs 불량 판정 기준 */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div style={{ background: '#f0fdf4', border: '1px solid #a7f3d0', borderRadius: 6, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <CheckCircle2 size={14} color="#059669" />
                      <span style={{ fontSize: 13.5, fontWeight: 800, color: '#166534' }}>정상 판정 조건 (해결)</span>
                    </div>
                    <span style={{ fontSize: 13.5, color: '#166534', fontWeight: 600, lineHeight: 1.4 }}>
                      {activeStep.criteria_normal || '정상 작동 및 계기판 정상 표시'}
                    </span>
                  </div>

                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <AlertTriangle size={14} color="#dc2626" />
                      <span style={{ fontSize: 13.5, fontWeight: 800, color: '#991b1b' }}>불량 판정 조건 (미해결)</span>
                    </div>
                    <span style={{ fontSize: 13.5, color: '#7f1d1d', fontWeight: 600, lineHeight: 1.4 }}>
                      {activeStep.criteria_fault || '증상 지속 또는 전압/동작 이상'}
                    </span>
                  </div>
                </div>

                {/* 3. 판정 액션 버튼 바 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 2 }}>
                  <button
                    data-uia="btn-step-resolve"
                    onClick={() => handleStepResolve(currentSession.activeStepIndex)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      background: '#059669',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 6,
                      height: 38,
                      fontSize: 14,
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(5,150,105,0.25)',
                      transition: 'all 0.1s ease'
                    }}
                  >
                    <Check size={15} />
                    <span>정상 판정 (조치 완료)</span>
                  </button>

                  <button
                    data-uia="btn-step-fail"
                    onClick={() => handleStepFail(currentSession.activeStepIndex)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      background: currentSession.activeStepIndex >= currentSession.steps.length - 1 ? '#dc2626' : '#d97706',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 6,
                      height: 38,
                      fontSize: 14,
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: currentSession.activeStepIndex >= currentSession.steps.length - 1
                        ? '0 1px 3px rgba(220,38,38,0.25)'
                        : '0 1px 3px rgba(217,119,6,0.25)',
                      transition: 'all 0.1s ease'
                    }}
                  >
                    {currentSession.activeStepIndex >= currentSession.steps.length - 1 ? (
                      <>
                        <ShieldAlert size={15} />
                        <span>불량 판정 (AS 출장 접수 전환)</span>
                      </>
                    ) : (
                      <>
                        <ArrowRight size={15} />
                        <span>불량 판정 (다음 조치 STEP {currentSession.activeStepIndex + 2} 진행)</span>
                      </>
                    )}
                  </button>
                </div>

              </div>
            )}

            {/* 현재 증상의 전체 진단 절차 타임라인 요약 */}
            <div style={{ background: '#ece7de', borderRadius: 8, border: '1px solid #dcd5c9', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 13.5, fontWeight: 800, color: '#334155' }}>
                진단 단계 현황 ({currentSession.title})
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {currentSession.steps.map((st, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleStepSelect(idx)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 10px',
                      borderRadius: 5,
                      border: idx === currentSession.activeStepIndex ? '1px solid #1d4ed8' : '1px solid #dcd5c9',
                      background: idx === currentSession.activeStepIndex ? '#eff6ff' : '#f5f2eb',
                      cursor: 'pointer',
                      transition: 'all 0.1s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 800, color: '#1e40af' }}>STEP {st.step_no}</span>
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: '#0f172a' }}>{st.title}</span>
                    </div>
                    <div>
                      {st.status === 'resolved' ? (
                        <span style={{ fontSize: 13.5, fontWeight: 700, color: '#059669', background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '2px 7px', borderRadius: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Check size={12} /> 해결
                        </span>
                      ) : st.status === 'unresolved' ? (
                        <span style={{ fontSize: 13.5, fontWeight: 700, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', padding: '2px 7px', borderRadius: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <X size={12} /> 불량
                        </span>
                      ) : st.status === 'active' ? (
                        <span style={{ fontSize: 13.5, fontWeight: 700, color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '2px 7px', borderRadius: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <RefreshCw size={11} /> 진행
                        </span>
                      ) : (
                        <span style={{ fontSize: 13.5, fontWeight: 600, color: '#64748b', background: '#ece7de', border: '1px solid #dcd5c9', padding: '2px 7px', borderRadius: 3 }}>
                          대기
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 과거 유사 상담 사례 */}
            <div style={{ background: '#ece7de', borderRadius: 8, border: '1px solid #dcd5c9', padding: '8px 14px', display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div
                onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <History size={14} color="#475569" />
                  <span style={{ fontSize: 13.5, fontWeight: 800, color: '#334155' }}>
                    과거 유사 상담 사례 ({kbResults.length}건)
                  </span>
                  {isLoadingKb && <Loader2 size={12} color="#2563eb" style={{ animation: 'spin 1s linear infinite' }} />}
                </div>
                {isHistoryExpanded ? <ChevronUp size={14} color="#64748b" /> : <ChevronDown size={14} color="#64748b" />}
              </div>

              {isHistoryExpanded && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 6, paddingTop: 4 }}>
                  {kbResults.map((r, i) => (
                    <div key={r.id || i} style={{ border: '1px solid #dcd5c9', borderRadius: 5, padding: '6px 9px', background: '#f5f2eb', fontSize: 13.5 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontWeight: 800, color: '#1d4ed8' }}>{Math.round(r.similarity * 100)}% 일치</span>
                        <span style={{ color: '#64748b' }}>{r.equipment_model}</span>
                      </div>
                      <p style={{ margin: 0, color: '#1e293b', lineHeight: 1.35 }}>{r.summary}</p>
                    </div>
                  ))}
                  {kbResults.length === 0 && (
                    <div style={{ padding: 10, textAlign: 'center', color: '#64748b', fontSize: 13.5 }}>
                      과거 유사 사례 없음
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>

          {/* [우측 4구역] 하단 종합 종결 바 (Terminal Action, 전체 증상 통합 판정) */}
          <div style={{ background: '#ece7de', borderRadius: 8, border: '1px solid #dcd5c9', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, boxShadow: '0 -1px 3px rgba(40,30,20,0.05)' }}>
            {/* 종합 상태 뱃지 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 140 }}>
              <label style={{ fontSize: 13.5, fontWeight: 800, color: '#64748b' }}>종합 판정 ({sessionList.length}건)</label>
              <div>
                {overallStatus === 'visit_required' ? (
                  <span style={{ fontSize: 13.5, fontWeight: 800, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <ShieldAlert size={14} /> AS 출장 접수 필요
                  </span>
                ) : overallStatus === 'resolved_by_call' ? (
                  <span style={{ fontSize: 13.5, fontWeight: 800, color: '#059669', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <CheckCircle2 size={14} /> 직접 조치 완료
                  </span>
                ) : (
                  <span style={{ fontSize: 13.5, fontWeight: 800, color: '#2563eb', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <RefreshCw size={12} style={{ animation: 'spin 3s linear infinite' }} /> 진단 진행 중
                  </span>
                )}
              </div>
            </div>

            {/* 특이사항 메모 입력창 */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <label style={{ fontSize: 13.5, fontWeight: 800, color: '#64748b' }}>진단 및 통화 메모</label>
              <input
                data-uia="input-counsel-notes"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="특이사항 및 추가 진단 메모"
                style={{ border: '1px solid #dcd5c9', borderRadius: 5, padding: '4px 10px', fontSize: 13.5, outline: 'none', height: 34, boxSizing: 'border-box', background: '#f5f2eb', transition: 'border-color 0.15s ease' }}
              />
            </div>

            {/* 1. 고객 대기 등록 (진행중 임시저장) 버튼 */}
            <button
              onClick={handleSavePending}
              disabled={isSaving || (sessionList.length === 0 && !customSymptom.trim() && !selectedCustomer)}
              data-uia="btn-save-pending"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: '#fffbeb',
                color: '#b45309',
                border: '1px solid #f59e0b',
                borderRadius: 5,
                padding: '0 14px',
                fontSize: 13.5,
                fontWeight: 800,
                cursor: (sessionList.length === 0 && !customSymptom.trim() && !selectedCustomer) ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
                height: 34,
                boxShadow: '0 1px 2px rgba(245,158,11,0.15)',
                opacity: (sessionList.length === 0 && !customSymptom.trim() && !selectedCustomer) ? 0.4 : 1,
                transition: 'all 0.1s ease'
              }}
            >
              <Clock size={14} />
              <span>고객 대기 등록</span>
            </button>

            <button
              type="button"
              onClick={() => setShowSelfActionGuideModal(true)}
              data-uia="btn-bottom-self-guide"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                background: '#ffffff',
                color: '#1e293b',
                border: '1px solid #cbd5e1',
                borderRadius: 5,
                padding: '0 12px',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                height: 34
              }}
            >
              <Smartphone size={14} color="#475569" />
              <span>자가조치 가이드</span>
            </button>

            <button
              type="button"
              onClick={() => setShowEquipmentManualModal(true)}
              data-uia="btn-bottom-equipment-manual"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                background: '#ffffff',
                color: '#1e293b',
                border: '1px solid #cbd5e1',
                borderRadius: 5,
                padding: '0 12px',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                height: 34
              }}
            >
              <BookOpen size={14} color="#2563eb" />
              <span>카탈로그·매뉴얼</span>
            </button>

            {/* 3. [분기 A] 직접 조치 종결 버튼 (모든 증상이 해결되었을 때만 가능) */}
            <button
              onClick={() => handleSave(false)}
              disabled={isSaving || overallStatus === 'visit_required'}
              data-uia="btn-save-resolved"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: overallStatus === 'resolved_by_call' ? '#059669' : '#f5f2eb',
                color: overallStatus === 'resolved_by_call' ? '#ffffff' : '#475569',
                border: overallStatus === 'resolved_by_call' ? '1px solid #047857' : '1px solid #dcd5c9',
                borderRadius: 5,
                padding: '0 16px',
                fontSize: 13.5,
                fontWeight: 800,
                cursor: overallStatus === 'visit_required' ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
                height: 34,
                opacity: overallStatus === 'visit_required' ? 0.35 : 1,
                boxShadow: overallStatus === 'resolved_by_call' ? '0 1px 3px rgba(5,150,105,0.25)' : 'none',
                transition: 'all 0.1s ease'
              }}
            >
              <CheckCircle2 size={15} />
              <span>직접 조치 종결 (₩0)</span>
            </button>

            {/* 4. [분기 B] 원청 결재 소모품/부품 견적 버튼 */}
            <button
              type="button"
              onClick={() => setShowPartsOrderModal(true)}
              data-uia="btn-bottom-parts-quote"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: '#fef3c7',
                color: '#92400e',
                border: '1px solid #f59e0b',
                borderRadius: 5,
                padding: '0 16px',
                fontSize: 13.5,
                fontWeight: 800,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                height: 34,
                boxShadow: '0 1px 3px rgba(245,158,11,0.2)',
                transition: 'all 0.1s ease'
              }}
            >
              <Package size={15} />
              <span>소모품 견적서 발행</span>
            </button>

            {/* 5. [분기 C] AS 출장 접수 버튼 (1개라도 출장 필요 시 강조) */}
            <button
              onClick={() => handleSave(true)}
              disabled={isSaving}
              data-uia="btn-save-visit"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: overallStatus === 'visit_required' ? '#dc2626' : '#f5f2eb',
                color: overallStatus === 'visit_required' ? '#ffffff' : '#dc2626',
                border: overallStatus === 'visit_required' ? '1px solid #b91c1c' : '1px solid #f87171',
                borderRadius: 5,
                padding: '0 18px',
                fontSize: 13.5,
                fontWeight: 800,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                height: 34,
                opacity: isSaving ? 0.5 : 1,
                boxShadow: overallStatus === 'visit_required' ? '0 1px 3px rgba(220,38,38,0.25)' : 'none',
                transition: 'all 0.1s ease'
              }}
            >
              {isSaving ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <ShieldAlert size={15} />}
              <span>AS 출장 접수</span>
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
