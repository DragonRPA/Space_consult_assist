import type { Dispatch, SetStateAction } from 'react';
import {
  Building2,
  Check,
  CheckCircle2,
  CheckSquare,
  ChevronRight,
  Copy,
  Square,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import type { ChecklistItem, CustomerInfo } from './store';
import type { ConfirmedSlotsState, NextLeadGuidanceState } from './sttAudioDsp';

export interface LegacySttPanelCProps {
  nextLeadGuidance: NextLeadGuidanceState;
  confirmedSlots: ConfirmedSlotsState;
  checkedCount: number;
  totalCount: number;
  nextUncheckedStep: ChecklistItem | null;
  actionChecklist: ChecklistItem[];
  toggleChecklist: (id: number) => void;
  setRecommendedClosingAction: Dispatch<SetStateAction<'NONE' | 'PARTS_QUOTE' | 'DISPATCH' | 'RESOLVED'>>;
  setIsPartsQuoteModalOpen: Dispatch<SetStateAction<boolean>>;
  setDispatchDrawerOpen: (open: boolean) => void;
  dispatchNote: string;
  showToast: (msg: string) => void;
  clearToast: () => void;
  isSubmitting: boolean;
  setIsWrapupModalOpen: Dispatch<SetStateAction<boolean>>;
  handleResolveComplete: () => Promise<void>;
  setSalesModalOpen: (open: boolean) => void;
}

export function LegacySttPanelC({
  nextLeadGuidance,
  confirmedSlots,
  checkedCount,
  totalCount,
  nextUncheckedStep,
  actionChecklist,
  toggleChecklist,
  setRecommendedClosingAction,
  setIsPartsQuoteModalOpen,
  setDispatchDrawerOpen,
  dispatchNote,
  showToast,
  clearToast,
  isSubmitting,
  setIsWrapupModalOpen,
  handleResolveComplete,
  setSalesModalOpen,
}: LegacySttPanelCProps) {
  return (
    <section style={{
      width: '38%',
      minHeight: 0,
      backgroundColor: 'var(--surface-1)',
      border: '1px solid var(--hairline)',
      borderRadius: '8px',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* 1. HERO: DYNAMIC NEXT SCRIPT TELEPROMPTER (다음 안내 멘트) */}
      <div style={{
        padding: '12px',
        backgroundColor: nextLeadGuidance.bgTint,
        borderBottom: `2px solid ${nextLeadGuidance.borderTint}`,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              fontSize: '11.5px',
              fontWeight: 800,
              color: '#fff',
              backgroundColor: nextLeadGuidance.accentColor,
              padding: '2px 8px',
              borderRadius: '4px',
              whiteSpace: 'nowrap'
            }}>
              다음 안내 멘트
            </span>
            <span style={{ fontSize: '12px', fontWeight: 800, color: nextLeadGuidance.accentColor, whiteSpace: 'nowrap' }}>
              {nextLeadGuidance.stageBadge}
            </span>
          </div>

          <button
            onClick={() => {
              navigator.clipboard.writeText(nextLeadGuidance.script.replace(/^"|"$/g, ''));
              showToast('안내 멘트가 복사되었습니다.');
              setTimeout(() => clearToast(), 2000);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              padding: '2px 7px',
              borderRadius: '4px',
              border: `1px solid ${nextLeadGuidance.borderTint}`,
              backgroundColor: '#ffffff',
              color: '#334155',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            <Copy size={11} /> 멘트 복사
          </button>
        </div>

        {/* Primary Counselor Script to Read Aloud */}
        <div style={{
          padding: '10px 12px',
          backgroundColor: '#ffffff',
          border: `1.5px solid ${nextLeadGuidance.borderTint}`,
          borderRadius: '6px',
          fontSize: '14px',
          fontWeight: 700,
          color: '#0f172a',
          lineHeight: 1.5,
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
        }}>
          {nextLeadGuidance.script}
        </div>

        {/* Sub-prompt for missing slot info or next action cue */}
        <div style={{ fontSize: '12px', color: '#334155', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
          <ChevronRight size={13} style={{ color: nextLeadGuidance.accentColor, flexShrink: 0 }} />
          <span>{nextLeadGuidance.subPrompt}</span>
        </div>

        {/* 1-Click Counselor Progression Bar */}
        {confirmedSlots.symptom && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', paddingTop: '2px' }}>
            {nextUncheckedStep && (
              <button
                onClick={() => {
                  toggleChecklist(nextUncheckedStep.id);
                  showToast(`${nextUncheckedStep.id}단계 정상 확인 ➔ 다음 점검 멘트로 전환`);
                  setTimeout(() => clearToast(), 2200);
                }}
                style={{
                  flex: 1.2,
                  padding: '7px 10px',
                  borderRadius: '5px',
                  border: 'none',
                  backgroundColor: '#2563eb',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  whiteSpace: 'nowrap'
                }}
              >
                <Check size={13} />
                <span>{nextUncheckedStep.id}단계 정상 ➔ 다음 안내</span>
              </button>
            )}

            <button
              onClick={() => {
                setRecommendedClosingAction('PARTS_QUOTE');
                setIsPartsQuoteModalOpen(true);
              }}
              style={{
                flex: 1,
                padding: '7px 8px',
                borderRadius: '5px',
                border: '1px solid #f59e0b',
                backgroundColor: '#fffbeb',
                color: '#92400e',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              부품 마모 ➔ 견적발송
            </button>

            <button
              onClick={() => {
                setRecommendedClosingAction('DISPATCH');
                setDispatchDrawerOpen(true);
              }}
              style={{
                flex: 1,
                padding: '7px 8px',
                borderRadius: '5px',
                border: '1px solid #ef4444',
                backgroundColor: '#fef2f2',
                color: '#991b1b',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              조치 불가 ➔ 출장접수
            </button>
          </div>
        )}
      </div>

      {/* 2. MIDDLE: INTERACTIVE SOP CHECKLIST WITH ACTIVE STEP FOCUS */}
      <div style={{ padding: '10px 12px 6px 12px', borderBottom: '1px solid var(--hairline)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: '12.5px', fontWeight: 800, color: 'var(--ink)' }}>
          단계별 점검 체크리스트
        </span>
        <span style={{ fontSize: '12px', fontWeight: 700, color: totalCount > 0 && checkedCount === totalCount ? 'var(--accent-success)' : 'var(--accent-primary)' }}>
          {totalCount > 0 ? `${checkedCount} / ${totalCount} 확인됨` : '증상 감지 시 자동 생성'}
        </span>
      </div>

      <div style={{ flex: 1, minHeight: 0, padding: '10px 12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {actionChecklist.length > 0 ? (
          actionChecklist.map((item) => {
            const isCurrentLeadStep = !item.checked && nextUncheckedStep?.id === item.id;
            return (
              <div
                key={item.id}
                onClick={() => toggleChecklist(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  backgroundColor: item.checked ? '#ecfdf5' : isCurrentLeadStep ? '#eff6ff' : '#ffffff',
                  border: item.checked
                    ? '1.5px solid #10b981'
                    : isCurrentLeadStep
                      ? '1.5px solid #3b82f6'
                      : '1px solid #cbd5e1',
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              >
                <button style={{ background: 'none', border: 'none', color: item.checked ? '#047857' : isCurrentLeadStep ? '#1d4ed8' : '#64748b', cursor: 'pointer', padding: 0, display: 'flex' }}>
                  {item.checked ? <CheckSquare size={16} /> : <Square size={16} />}
                </button>
                <div style={{
                  flex: 1,
                  fontSize: '13px',
                  lineHeight: 1.4,
                  fontWeight: item.checked || isCurrentLeadStep ? 700 : 500,
                  color: item.checked ? '#065f46' : isCurrentLeadStep ? '#1e3a8a' : '#0f172a',
                  textDecoration: item.checked ? 'line-through' : 'none'
                }}>
                  <strong style={{ marginRight: '4px' }}>{item.id}.</strong>
                  {item.text}
                </div>
                {isCurrentLeadStep && (
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: '#dbeafe',
                    color: '#1d4ed8',
                    whiteSpace: 'nowrap',
                    flexShrink: 0
                  }}>
                    안내 차례
                  </span>
                )}
              </div>
            );
          })
        ) : (
          <div style={{ padding: '20px 12px', textAlign: 'center', color: 'var(--ink-subtle)', fontSize: '12.5px' }}>
            대화 중 고장 증상이 포착되면 1~4단계 점검 체크리스트가 자동 구성됩니다.
          </div>
        )}
      </div>

      {/* 3. BOTTOM TERMINAL ACTION BAR (Z-Pattern 우하단 완결 액션) */}
      <div style={{ padding: '10px 12px', borderTop: '1px solid var(--hairline)', backgroundColor: 'var(--surface-2)', display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
        {/* Auto-Synthesized Note Preview */}
        <div style={{
          fontSize: '11.5px',
          color: 'var(--ink-muted)',
          backgroundColor: 'var(--surface-1)',
          border: '1px solid var(--hairline)',
          borderRadius: '4px',
          padding: '5px 8px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {dispatchNote}
        </div>

        {/* 1-Click AI Multi-Outcome Wrap-Up Button (Groq Cloud LPU) */}
        <button
          onClick={() => setIsWrapupModalOpen(true)}
          disabled={isSubmitting}
          style={{
            width: '100%',
            padding: '9px 10px',
            backgroundColor: '#0f172a',
            color: '#ffffff',
            border: '1.5px solid #2563eb',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 800,
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            whiteSpace: 'nowrap'
          }}
        >
          <Zap size={14} style={{ color: '#38bdf8' }} />
          <span>AI 결론 정리 (기술·견적·시연·납품·AS 일괄 분류)</span>
        </button>

        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={handleResolveComplete}
            disabled={isSubmitting}
            style={{
              flex: 1.1,
              padding: '10px 8px',
              backgroundColor: isSubmitting ? 'var(--surface-3)' : 'var(--accent-success)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 800,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
              whiteSpace: 'nowrap'
            }}
          >
            <CheckCircle2 size={15} />
            <span>자가조치 완료</span>
          </button>

          <button
            onClick={() => setDispatchDrawerOpen(true)}
            disabled={isSubmitting}
            style={{
              flex: 1.1,
              padding: '10px 8px',
              backgroundColor: isSubmitting ? 'var(--surface-3)' : 'var(--accent-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 800,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
              whiteSpace: 'nowrap'
            }}
          >
            <Wrench size={14} />
            <span>출장 배차 접수</span>
          </button>

          <button
            onClick={() => setSalesModalOpen(true)}
            disabled={isSubmitting}
            style={{
              flex: 0.8,
              padding: '10px 8px',
              backgroundColor: 'var(--surface-3)',
              color: 'var(--ink)',
              border: '1px solid var(--hairline)',
              borderRadius: '6px',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              whiteSpace: 'nowrap'
            }}
          >
            <Building2 size={13} />
            <span>영업 이관</span>
          </button>
        </div>
      </div>
    </section>
  );
}

export interface LegacySttActionDialogsProps {
  dispatchDrawerOpen: boolean;
  setDispatchDrawerOpen: (open: boolean) => void;
  selectedCustomer: CustomerInfo | null;
  cleanModelCode: string;
  assignedEngineer: string;
  setAssignedEngineer: (engineer: string) => void;
  dispatchDate: string;
  setDispatchDate: (date: string) => void;
  dispatchNote: string;
  setDispatchNote: (note: string) => void;
  setIsDispatchDocModalOpen: Dispatch<SetStateAction<boolean>>;
  handleConfirmDispatch: () => Promise<void>;
  salesModalOpen: boolean;
  setSalesModalOpen: (open: boolean) => void;
  salesTransferType: string;
  setSalesTransferType: Dispatch<SetStateAction<string>>;
  salesTransferNote: string;
  setSalesTransferNote: Dispatch<SetStateAction<string>>;
  handleConfirmSalesTransfer: () => Promise<void>;
}

export function LegacySttActionDialogs({
  dispatchDrawerOpen,
  setDispatchDrawerOpen,
  selectedCustomer,
  cleanModelCode,
  assignedEngineer,
  setAssignedEngineer,
  dispatchDate,
  setDispatchDate,
  dispatchNote,
  setDispatchNote,
  setIsDispatchDocModalOpen,
  handleConfirmDispatch,
  salesModalOpen,
  setSalesModalOpen,
  salesTransferType,
  setSalesTransferType,
  salesTransferNote,
  setSalesTransferNote,
  handleConfirmSalesTransfer,
}: LegacySttActionDialogsProps) {
  return (
    <>
      {dispatchDrawerOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setDispatchDrawerOpen(false); }}
        >
          <div style={{
            width: '480px',
            maxHeight: '90vh',
            backgroundColor: 'var(--surface-1)',
            border: '1px solid var(--hairline)',
            borderRadius: '8px',
            boxShadow: '0 16px 40px rgba(0,0,0,0.45)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--hairline)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: '7px' }}>
                <Wrench size={16} style={{ color: 'var(--accent-primary)' }} />
                출장 배차 접수
              </span>
              <button onClick={() => setDispatchDrawerOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--ink-muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ flex: 1, padding: '14px 16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ backgroundColor: 'var(--surface-2)', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--hairline)', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div><span style={{ color: 'var(--ink-subtle)', marginRight: 6 }}>고객사</span><strong style={{ color: 'var(--ink)' }}>{selectedCustomer?.name || '미확인'}</strong></div>
                <div><span style={{ color: 'var(--ink-subtle)', marginRight: 6 }}>방문지</span>{selectedCustomer?.address || '-'} {selectedCustomer?.addressDetail ? `(${selectedCustomer.addressDetail})` : ''}</div>
                <div><span style={{ color: 'var(--ink-subtle)', marginRight: 6 }}>연락처</span>{selectedCustomer?.manager || '-'} · {selectedCustomer?.phone || '-'}</div>
                <div><span style={{ color: 'var(--ink-subtle)', marginRight: 6 }}>장비모델</span>{selectedCustomer?.assetModel || cleanModelCode || '미확인'} {selectedCustomer?.serialNumber ? `(${selectedCustomer.serialNumber})` : ''}</div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink-muted)' }}>관할 정비기사 (주소 기반 자동 매칭)</label>
                <select
                  value={assignedEngineer}
                  onChange={(e) => setAssignedEngineer(e.target.value)}
                  style={{ padding: '8px', backgroundColor: 'var(--surface-2)', border: '1px solid var(--hairline)', borderRadius: '5px', color: 'var(--ink)', fontSize: '13.5px' }}
                >
                  <option value="김철수 정비기사 (화성/경기남부)">김철수 정비기사 (화성/경기남부 관할)</option>
                  <option value="박영호 정비기사 (인천/서울서부)">박영호 정비기사 (인천/서울서부 관할)</option>
                  <option value="이지훈 정비기사 (평택/충청북부)">이지훈 정비기사 (평택/충청북부 관할)</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink-muted)' }}>방문 일시</label>
                <input
                  type="text"
                  value={dispatchDate}
                  onChange={(e) => setDispatchDate(e.target.value)}
                  style={{ padding: '8px', backgroundColor: 'var(--surface-2)', border: '1px solid var(--hairline)', borderRadius: '5px', color: 'var(--ink)', fontSize: '13.5px' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink-muted)' }}>정비기사 전달 메모 (대화내용 자동 요약)</label>
                <textarea
                  rows={3}
                  value={dispatchNote}
                  onChange={(e) => setDispatchNote(e.target.value)}
                  style={{ padding: '8px', backgroundColor: 'var(--surface-2)', border: '1px solid var(--hairline)', borderRadius: '5px', color: 'var(--ink)', fontSize: '13px', lineHeight: 1.4 }}
                />
              </div>
            </div>

            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--hairline)', backgroundColor: 'var(--surface-2)', display: 'flex', gap: '8px' }}>
              <button
                onClick={() => {
                  setDispatchDrawerOpen(false);
                  setIsDispatchDocModalOpen(true);
                }}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: 'var(--surface-1)',
                  color: 'var(--ink)',
                  border: '1px solid var(--hairline)',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                출장 안내 문서 조립
              </button>
              <button
                onClick={handleConfirmDispatch}
                style={{
                  flex: 1.4,
                  padding: '10px',
                  backgroundColor: 'var(--accent-primary)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13.5px',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                배차 확정 및 기사 전송
              </button>
            </div>
          </div>
        </div>
      )}

      {salesModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }}>
          <div style={{
            width: '420px',
            backgroundColor: 'var(--surface-1)',
            border: '1px solid var(--hairline)',
            borderRadius: '8px',
            padding: '18px',
            boxShadow: '0 16px 32px rgba(0,0,0,0.45)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--ink)' }}>영업팀 이관 접수</span>
              <button onClick={() => setSalesModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--ink-muted)', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink-muted)' }}>이관 유형</label>
              <select
                value={salesTransferType}
                onChange={(e) => setSalesTransferType(e.target.value)}
                style={{ padding: '8px', backgroundColor: 'var(--surface-2)', border: '1px solid var(--hairline)', borderRadius: '5px', color: 'var(--ink)', fontSize: '13.5px' }}
              >
                <option value="신규 렌탈 견적서 요청">신규 렌탈 견적서 요청</option>
                <option value="장비 추가 도입 및 계약 변경">장비 추가 도입 및 계약 변경</option>
                <option value="단순 소모품 구매 견적">단순 소모품 구매 견적</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink-muted)' }}>상세 요청사항 (자동 요약)</label>
              <textarea
                value={salesTransferNote}
                onChange={(e) => setSalesTransferNote(e.target.value)}
                rows={3}
                style={{ padding: '8px', backgroundColor: 'var(--surface-2)', border: '1px solid var(--hairline)', borderRadius: '5px', color: 'var(--ink)', fontSize: '13px', resize: 'none' }}
              />
            </div>

            <button
              onClick={handleConfirmSalesTransfer}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: 'var(--accent-warning)',
                color: '#0f172a',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 800,
                fontSize: '13.5px',
                cursor: 'pointer'
              }}
            >
              영업팀 대장 이관 확정
            </button>
          </div>
        </div>
      )}
    </>
  );
}
