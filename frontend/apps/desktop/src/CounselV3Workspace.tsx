import type { Dispatch, SetStateAction } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
  Package,
  Smartphone,
} from 'lucide-react';
import { getModelErrorCodePanelTitle } from './modelErrorCodesData';
import type { ModelSpec } from './modelSpecsData';
import type {
  Customer,
  OfficialErrorCode,
  SymptomPreset,
  SymptomSession,
} from './counselShared';

export interface SmartReturnDescriptor {
  targetMode: 'pending' | 'resolved' | 'visit_completed';
  badgeLabel: string;
  color: string;
}

export interface CounselV3WorkspaceProps {
  selectedCustomer: Customer | null;
  effectiveModel: string;
  currentModelSpec: ModelSpec | null;
  showModelSpec: boolean;
  setShowModelSpec: Dispatch<SetStateAction<boolean>>;
  customerPhone: string;
  siteWorkerPhone: string;
  symptomPresets: SymptomPreset[];
  currentSession: SymptomSession | null;
  notes: string;
  setNotes: Dispatch<SetStateAction<string>>;
  smartReturnDescriptor: SmartReturnDescriptor;
  activateSymptomPreset: (preset: SymptomPreset, targetModel?: string, initialErrorCode?: OfficialErrorCode) => void;
  setSymptomSessions: Dispatch<SetStateAction<Record<string, SymptomSession>>>;
  handleStepResolve: (stepIdx: number) => void;
  handleStepFail: (stepIdx: number) => void;
  handleSaveSession: (mode: 'pending' | 'resolved' | 'visit' | 'visit_completed') => void;
  handleSmartSaveAndReturn: () => void;
  setShowSelfActionGuideModal: Dispatch<SetStateAction<boolean>>;
  setShowPartsOrderModal: Dispatch<SetStateAction<boolean>>;
  setShowEquipmentManualModal: Dispatch<SetStateAction<boolean>>;
  setShowDispatchPackageModal: Dispatch<SetStateAction<boolean>>;
}

export function CounselV3Workspace({
  selectedCustomer,
  effectiveModel,
  currentModelSpec,
  showModelSpec,
  setShowModelSpec,
  customerPhone,
  siteWorkerPhone,
  symptomPresets,
  currentSession,
  notes,
  setNotes,
  smartReturnDescriptor,
  activateSymptomPreset,
  setSymptomSessions,
  handleStepResolve,
  handleStepFail,
  handleSaveSession,
  handleSmartSaveAndReturn,
  setShowSelfActionGuideModal,
  setShowPartsOrderModal,
  setShowEquipmentManualModal,
  setShowDispatchPackageModal,
}: CounselV3WorkspaceProps) {
  return (
  <div
    style={{
      flex: 1,
      display: 'grid',
      gridTemplateColumns: '340px 1fr',
      gap: 16,
      padding: 16,
      overflowY: 'auto'
    }}
  >
    {/* ── [좌측 슬롯] 고객 및 장비 컨텍스트 카드 ── */}
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* 고객사 정보 카드: 고객이 선택되었을 때만 상세 노출, 미선택 시 심플 안내 */}
      {selectedCustomer ? (
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #dcd5c9',
            borderRadius: 10,
            padding: 16,
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span
              style={{
                fontSize: 13.5,
                fontWeight: 800,
                color: '#1d4ed8',
                background: '#eff6ff',
                padding: '2px 8px',
                borderRadius: 4
              }}
            >
              {selectedCustomer.salesType}
            </span>
            <span style={{ fontSize: 13.5, color: '#64748b', fontFamily: 'monospace' }}>
              {selectedCustomer.serialNumber}
            </span>
          </div>
          <div style={{ fontSize: 16, fontWeight: 900, color: '#0f172a', marginBottom: 10 }}>
            {selectedCustomer.name}
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              padding: 10,
              background: '#f5f2eb',
              borderRadius: 6,
              border: '1px solid #dcd5c9',
              fontSize: 13.5
            }}
          >
            <div>
              <div style={{ color: '#059669', fontWeight: 800 }}>
                현장 실사용자: {selectedCustomer.siteWorkerName || '미화반장'}
              </div>
              <div style={{ color: '#0f172a', fontWeight: 700, fontFamily: 'monospace' }}>
                {siteWorkerPhone}
              </div>
            </div>
            <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: 6 }}>
              <div style={{ color: '#1d4ed8', fontWeight: 800 }}>
                원청 결재권자: {selectedCustomer.manager}
              </div>
              <div style={{ color: '#0f172a', fontWeight: 700, fontFamily: 'monospace' }}>
                {customerPhone}
              </div>
            </div>
          </div>

          {/* 최근 정비 이력 */}
          {selectedCustomer.historyTimeline.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: '#475569', marginBottom: 6 }}>
                최근 정비 이력
              </div>
              {selectedCustomer.historyTimeline.map((h, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: 13.5,
                    color: '#334155',
                    padding: '5px 8px',
                    background: '#f8fafc',
                    borderRadius: 4,
                    marginBottom: 4,
                    borderLeft: '3px solid #2563eb'
                  }}
                >
                  <span style={{ fontWeight: 700, color: '#64748b', marginRight: 6 }}>{h.date}</span>
                  <span>{h.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div
          style={{
            background: '#ece7de',
            border: '1px dashed #cbd5c9',
            borderRadius: 10,
            padding: 16
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 800, color: '#334155', marginBottom: 4 }}>
            고객사 미지정 상태
          </div>
          <div style={{ fontSize: 13.5, color: '#64748b', lineHeight: 1.5 }}>
            상단 검색창에 전화번호 뒷자리(예: 3456) 또는 고객사명(예: 반포자이)을 입력하면 고객 카드가 이 자리에 채워집니다.
          </div>
        </div>
      )}

      {/* 장비 모델 컨텍스트 카드 (필요 시 제원 아코디언 토글) */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #dcd5c9',
          borderRadius: 10,
          padding: 16
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 13.5, color: '#64748b', fontWeight: 700 }}>적용 장비 모델</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', marginTop: 2 }}>
              {effectiveModel}{' '}
              <span style={{ fontSize: 13.5, fontWeight: 600, color: '#475569' }}>
                ({currentModelSpec?.category || '습식 청소차'})
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowModelSpec(prev => !prev)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              background: '#f5f2eb',
              border: '1px solid #dcd5c9',
              borderRadius: 6,
              padding: '5px 10px',
              fontSize: 13.5,
              fontWeight: 700,
              color: '#334155',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            <span>제원 {showModelSpec ? '접기' : '보기'}</span>
            {showModelSpec ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        {showModelSpec && currentModelSpec && (
          <div
            style={{
              marginTop: 12,
              paddingTop: 10,
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              fontSize: 13.5
            }}
          >
            <div>
              <strong style={{ color: '#475569' }}>배터리:</strong> {currentModelSpec.battery_spec}
            </div>
            <div>
              <strong style={{ color: '#475569' }}>브러시:</strong> {currentModelSpec.brush_spec}
            </div>
            <div>
              <strong style={{ color: '#475569' }}>스퀴지:</strong> {currentModelSpec.squeegee_width_mm}mm
            </div>
            <div>
              <strong style={{ color: '#475569' }}>탱크 용량:</strong> 정수 {currentModelSpec.clean_tank_l}L / 폐수{' '}
              {currentModelSpec.recovery_tank_l}L
            </div>
          </div>
        )}
      </div>
    </div>

    {/* ── [우측 메인 슬롯] 진단 및 단계별 조치 워크스페이스 ── */}
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {currentSession ? (
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #dcd5c9',
            borderRadius: 10,
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          }}
        >
          {/* 진단 헤더 & 전화 응대 스크립트 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #e2e8f0',
              paddingBottom: 12
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                style={{
                  background: currentSession.urgency === '긴급' ? '#fef2f2' : '#eff6ff',
                  color: currentSession.urgency === '긴급' ? '#dc2626' : '#1d4ed8',
                  border: `1px solid ${currentSession.urgency === '긴급' ? '#fecaca' : '#bfdbfe'}`,
                  padding: '3px 10px',
                  borderRadius: 6,
                  fontSize: 13.5,
                  fontWeight: 800
                }}
              >
                {currentSession.urgency}
              </span>
              <h2 style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', margin: 0 }}>
                {currentSession.title}
              </h2>
              <span style={{ fontSize: 13.5, color: '#64748b', fontFamily: 'monospace' }}>
                [{currentSession.part_code}]
              </span>
            </div>

            <span
              style={{
                fontSize: 13.5,
                fontWeight: 800,
                padding: '4px 12px',
                borderRadius: 14,
                background:
                  currentSession.status === 'resolved_by_call'
                    ? '#ecfdf5'
                    : currentSession.status === 'visit_required'
                    ? '#fef2f2'
                    : '#eff6ff',
                color:
                  currentSession.status === 'resolved_by_call'
                    ? '#059669'
                    : currentSession.status === 'visit_required'
                    ? '#dc2626'
                    : '#1d4ed8'
              }}
            >
              {currentSession.status === 'resolved_by_call'
                ? '전화 조치 해결'
                : currentSession.status === 'visit_required'
                ? 'AS 출장 정비 대상'
                : `STEP ${currentSession.activeStepIndex + 1} 점검 진행중`}
            </span>
          </div>

          {/* 표준 안내 스크립트 */}
          <div
            style={{
              background: '#f5f2eb',
              borderLeft: '4px solid #2563eb',
              padding: '12px 16px',
              borderRadius: '0 8px 8px 0',
              fontSize: 14.5,
              fontWeight: 600,
              color: '#0f172a',
              lineHeight: 1.5
            }}
          >
            "{currentSession.selectedErrorCode?.call_script || currentSession.call_script}"
          </div>

          {/* 에러코드 선택 칩 (에러코드가 선택되었거나 에러코드 관련 증상일 때 표시) */}
          {(currentSession.category === '에러코드' ||
            currentSession.title.includes('에러') ||
            currentSession.selectedErrorCode) &&
            currentSession.official_error_codes && (
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: 8,
                  padding: 12
                }}
              >
                <div style={{ fontSize: 13.5, fontWeight: 800, color: '#334155', marginBottom: 8 }}>
                  {getModelErrorCodePanelTitle(effectiveModel)}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {currentSession.official_error_codes.map(ec => {
                    const isSel = currentSession.selectedErrorCode?.code === ec.code;
                    return (
                      <button
                        key={ec.code}
                        type="button"
                        onClick={() =>
                          setSymptomSessions(prev => ({
                            ...prev,
                            [currentSession.key]: {
                              ...currentSession,
                              selectedErrorCode: isSel ? null : ec
                            }
                          }))
                        }
                        style={{
                          padding: '5px 10px',
                          borderRadius: 6,
                          border: isSel ? '2px solid #2563eb' : '1px solid #cbd5e1',
                          background: isSel ? '#eff6ff' : '#ffffff',
                          color: isSel ? '#1d4ed8' : '#334155',
                          fontSize: 13.5,
                          fontWeight: 700,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        [{ec.code}] {ec.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

          {/* 단계별 점검 리스트 (Progressive Stepper) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {currentSession.steps.map((st, idx) => {
              const isActive = idx === currentSession.activeStepIndex;
              const isResolved = st.status === 'resolved';
              const isFailed = st.status === 'unresolved';

              return (
                <div
                  key={st.step_no}
                  onClick={() =>
                    setSymptomSessions(prev => ({
                      ...prev,
                      [currentSession.key]: { ...currentSession, activeStepIndex: idx }
                    }))
                  }
                  style={{
                    border: isActive
                      ? '2px solid #2563eb'
                      : isResolved
                      ? '1px solid #a7f3d0'
                      : isFailed
                      ? '1px solid #fecaca'
                      : '1px solid #dcd5c9',
                    background: isActive
                      ? '#ffffff'
                      : isResolved
                      ? '#ecfdf5'
                      : isFailed
                      ? '#fef2f2'
                      : '#f8fafc',
                    borderRadius: 8,
                    padding: '12px 16px',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 4,
                          background: isActive ? '#2563eb' : '#cbd5e1',
                          color: isActive ? '#ffffff' : '#334155',
                          fontSize: 13.5,
                          fontWeight: 800,
                          whiteSpace: 'nowrap'
                        }}
                      >
                        STEP {st.step_no}
                      </span>
                      <span style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>{st.title}</span>
                    </div>

                    {/* 현재 점검 단계 판정 버튼 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleStepResolve(idx)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          background: isResolved ? '#059669' : '#ecfdf5',
                          color: isResolved ? '#ffffff' : '#059669',
                          border: '1px solid #059669',
                          borderRadius: 6,
                          padding: '5px 12px',
                          fontSize: 13.5,
                          fontWeight: 800,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        <Check size={14} />
                        <span>정상 해결</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStepFail(idx)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          background: isFailed ? '#dc2626' : '#fef2f2',
                          color: isFailed ? '#ffffff' : '#dc2626',
                          border: '1px solid #dc2626',
                          borderRadius: 6,
                          padding: '5px 12px',
                          fontSize: 13.5,
                          fontWeight: 800,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        <AlertTriangle size={14} />
                        <span>{idx >= currentSession.steps.length - 1 ? '불량 (출장 전환)' : '불량 (다음 단계)'}</span>
                      </button>
                    </div>
                  </div>

                  {isActive && st.method && st.method !== st.title && (
                    <div style={{ marginTop: 8, fontSize: 13.5, color: '#475569', paddingLeft: 68 }}>
                      점검 방법: {st.method}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 상담 메모 및 후속 연계 문서 발송 바 (진단 시점에만 노출) */}
          <div
            style={{
              marginTop: 6,
              paddingTop: 14,
              borderTop: '1px solid #dcd5c9',
              display: 'flex',
              flexDirection: 'column',
              gap: 12
            }}
          >
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="상담 특이사항 또는 현장 메모 입력..."
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                fontSize: 13.5,
                background: '#f8fafc'
              }}
            />

            {/* 후속 문서 발송 & 상담 완결 액션 바 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              {/* 좌측: 문서 발송 버튼군 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  data-uia="btn-open-equipment-manual-modal"
                  onClick={() => setShowEquipmentManualModal(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    background: '#ffffff',
                    color: '#1e293b',
                    border: '1px solid #cbd5e1',
                    borderRadius: 6,
                    padding: '6px 10px',
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <BookOpen size={13} color="#2563eb" />
                  <span>카탈로그·매뉴얼</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowSelfActionGuideModal(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    background: '#ffffff',
                    color: '#1e293b',
                    border: '1px solid #cbd5e1',
                    borderRadius: 6,
                    padding: '6px 10px',
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <Smartphone size={13} color="#475569" />
                  <span>자가조치 가이드</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowPartsOrderModal(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    background: '#ffffff',
                    color: '#1e293b',
                    border: '1px solid #cbd5e1',
                    borderRadius: 6,
                    padding: '6px 10px',
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <Package size={13} color="#475569" />
                  <span>소모품 견적</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowDispatchPackageModal(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    background: '#ffffff',
                    color: '#1e293b',
                    border: '1px solid #cbd5e1',
                    borderRadius: 6,
                    padding: '6px 10px',
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <FileText size={13} color="#475569" />
                  <span>출장 문서</span>
                </button>
              </div>

              {/* 우측: 최종 종결 및 첫 조회화면 복귀 버튼군 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  data-uia="btn-v3-bottom-smart-save"
                  onClick={handleSmartSaveAndReturn}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 6,
                    background: smartReturnDescriptor.color,
                    border: 'none',
                    color: '#ffffff',
                    fontSize: 13.5,
                    fontWeight: 800,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 2px 6px rgba(15, 23, 42, 0.14)'
                  }}
                >
                  {smartReturnDescriptor.badgeLabel}
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveSession('pending')}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 6,
                    background: '#f5f2eb',
                    border: '1px solid #dcd5c9',
                    color: '#334155',
                    fontSize: 13.5,
                    fontWeight: 800,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  진행중 보류 저장
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveSession('resolved')}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 6,
                    background: '#059669',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: 13.5,
                    fontWeight: 800,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  전화 조치 완료
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveSession('visit')}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 6,
                    background: '#dc2626',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: 13.5,
                    fontWeight: 800,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  AS 출장 접수
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* 고객 또는 모델만 먼저 선택되고 아직 증상이 입력되지 않은 경우: 빈출 증상 6개만 깔끔하게 추천 */
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #dcd5c9',
            borderRadius: 10,
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 14
          }}
        >
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#0f172a' }}>
              [{effectiveModel}] 증상 키워드를 상단 검색창에 입력하거나 아래 빈출 증상을 선택하십시오
            </div>
            <div style={{ fontSize: 13.5, color: '#64748b', marginTop: 4 }}>
              증상이 선택되면 단계별 점검 체크리스트와 문서 발송 도구가 이 자리에 채워집니다.
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {symptomPresets.slice(0, 6).map(preset => (
              <button
                key={preset.title}
                type="button"
                onClick={() => activateSymptomPreset(preset, effectiveModel)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: '#f5f2eb',
                  border: '1px solid #dcd5c9',
                  borderRadius: 8,
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div>
                  <div style={{ fontSize: 14.5, fontWeight: 800, color: '#0f172a' }}>{preset.title}</div>
                  <div style={{ fontSize: 13.5, color: '#64748b', marginTop: 2 }}>{preset.symptom}</div>
                </div>
                <ArrowRight size={16} color="#2563eb" style={{ flexShrink: 0 }} />
              </button>
            ))}
          </div>

          {/* 증상 선택 전(고객/모델만 선택된 상태)에서도 매뉴얼 발송 및 즉시 진행중/완료 저장 지원 */}
          <div
            style={{
              marginTop: 6,
              paddingTop: 14,
              borderTop: '1px solid #dcd5c9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10
            }}
          >
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="상담 메모 입력 (증상 미선택 상태에서도 메모와 함께 저장 가능)..."
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                fontSize: 13.5,
                background: '#f8fafc'
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => setShowEquipmentManualModal(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '7px 12px',
                  borderRadius: 6,
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#1e293b',
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                <BookOpen size={13} color="#2563eb" />
                <span>카탈로그·매뉴얼</span>
              </button>
              <button
                type="button"
                onClick={() => handleSaveSession('pending')}
                style={{
                  padding: '8px 14px',
                  borderRadius: 6,
                  background: '#2563eb',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: 13.5,
                  fontWeight: 800,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                진행중 저장 · 첫 화면 복귀
              </button>
              <button
                type="button"
                onClick={() => handleSaveSession('resolved')}
                style={{
                  padding: '8px 14px',
                  borderRadius: 6,
                  background: '#059669',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: 13.5,
                  fontWeight: 800,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                단순안내 완료 저장 · 첫 화면 복귀
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
  );
}
