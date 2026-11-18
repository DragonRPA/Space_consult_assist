import type { Dispatch, MouseEvent, SetStateAction } from 'react';
import { Clock, FileText, History, Search, X } from 'lucide-react';
import type { DispatchDoc1st, DispatchDoc2nd } from './dispatchDocTypes';
import {
  matchesIntegratedSessionQuery,
  type ConsultSessionRecord,
} from './counselShared';

export interface CounselV2SessionDialogsProps {
  showPendingModal: boolean;
  setShowPendingModal: Dispatch<SetStateAction<boolean>>;
  pendingSearchQuery: string;
  setPendingSearchQuery: Dispatch<SetStateAction<string>>;
  pendingSessions: ConsultSessionRecord[];
  handleResumeSession: (record: ConsultSessionRecord) => void;
  handleDeletePendingSession: (id: string, e?: MouseEvent) => Promise<void>;
  showHistoryModal: boolean;
  setShowHistoryModal: Dispatch<SetStateAction<boolean>>;
  historySearchQuery: string;
  setHistorySearchQuery: Dispatch<SetStateAction<string>>;
  historyStatusFilter: 'all' | 'in_progress' | 'resolved' | 'visit';
  setHistoryStatusFilter: Dispatch<SetStateAction<'all' | 'in_progress' | 'resolved' | 'visit'>>;
  historyRecords: ConsultSessionRecord[];
  selectedHistoryItem: ConsultSessionRecord | null;
  setSelectedHistoryItem: Dispatch<SetStateAction<ConsultSessionRecord | null>>;
  formatRelativeTime: (dateStr?: string) => string;
  setDispatchDoc1st: Dispatch<SetStateAction<Partial<DispatchDoc1st> | null>>;
  setDispatchDoc2nd: Dispatch<SetStateAction<Partial<DispatchDoc2nd> | null>>;
  setDispatchModalTab: Dispatch<SetStateAction<'doc1' | 'doc2'>>;
  setShowDispatchPackageModal: Dispatch<SetStateAction<boolean>>;
}

export default function CounselV2SessionDialogs({
  showPendingModal,
  setShowPendingModal,
  pendingSearchQuery,
  setPendingSearchQuery,
  pendingSessions,
  handleResumeSession,
  handleDeletePendingSession,
  showHistoryModal,
  setShowHistoryModal,
  historySearchQuery,
  setHistorySearchQuery,
  historyStatusFilter,
  setHistoryStatusFilter,
  historyRecords,
  selectedHistoryItem,
  setSelectedHistoryItem,
  formatRelativeTime,
  setDispatchDoc1st,
  setDispatchDoc2nd,
  setDispatchModalTab,
  setShowDispatchPackageModal,
}: CounselV2SessionDialogsProps) {
  return (
    <>
      {showPendingModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(3px)'
        }}>
          <div
            data-pending-queue-modal
            style={{
              width: '90%',
              maxWidth: 900,
              maxHeight: '85vh',
              background: '#f5f2eb',
              borderRadius: 10,
              backgroundImage: 'var(--paper-texture)',
              backgroundRepeat: 'repeat',
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            {/* Header */}
            <div style={{
              padding: '12px 18px',
              borderBottom: '1px solid #dcd5c9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#ece7de'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={16} color="#d97706" />
                <span style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
                  진행 상담 대기열
                </span>
                <span style={{
                  fontSize: 13.5,
                  fontWeight: 700,
                  background: '#fef3c7',
                  color: '#b45309',
                  border: '1px solid #fde68a',
                  padding: '2px 8px',
                  borderRadius: 4
                }}>
                  {pendingSessions.length}건 대기
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: '#f5f2eb',
                  border: '1px solid #dcd5c9',
                  borderRadius: 5,
                  padding: '4px 10px',
                  width: 300
                }}>
                  <Search size={14} color="#64748b" />
                  <input
                    data-uia="input-pending-search"
                    value={pendingSearchQuery}
                    onChange={e => setPendingSearchQuery(e.target.value)}
                    placeholder="고객명, 전화번호, 에러코드, 증상, 초성 검색"
                    style={{ border: 'none', outline: 'none', fontSize: 13.5, width: '100%' }}
                  />
                  {pendingSearchQuery && (
                    <button onClick={() => setPendingSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                      <X size={13} color="#94a3b8" />
                    </button>
                  )}
                </div>

                <button
                  onClick={() => setShowPendingModal(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4 }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pendingSessions
                .filter(p => matchesIntegratedSessionQuery(p, pendingSearchQuery))
                .map(record => {
                  const symptomCount = Object.keys(record.symptomSessions || {}).length;
                  return (
                    <div
                      key={record.id}
                      data-pending-item={record.id}
                      style={{
                        border: '1px solid #dcd5c9',
                        borderRadius: 6,
                        padding: '10px 14px',
                        background: '#f5f2eb',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                        boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 14.5, fontWeight: 800, color: '#0f172a' }}>
                            {record.customerName}
                          </span>
                          {(record.manager || record.phone) && (
                            <span style={{ fontSize: 13.5, color: '#475569', fontWeight: 600 }}>
                              ({[record.manager, record.phone].filter(Boolean).join(' / ')})
                            </span>
                          )}
                          <span style={{
                            fontSize: 13.5,
                            fontWeight: 700,
                            background: '#eff6ff',
                            color: '#1d4ed8',
                            border: '1px solid #bfdbfe',
                            padding: '2px 7px',
                            borderRadius: 3
                          }}>
                            {record.modelName}
                          </span>
                          <span style={{
                            fontSize: 13.5,
                            fontWeight: 700,
                            background: '#fffbeb',
                            color: '#b45309',
                            border: '1px solid #fde68a',
                            padding: '2px 7px',
                            borderRadius: 3
                          }}>
                            고객 대기
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                          <span style={{ fontSize: 13.5, color: '#64748b', fontWeight: 600 }}>
                            {formatRelativeTime(record.timestamp)} ({new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                          </span>
                          <button
                            onClick={() => handleResumeSession(record)}
                            data-uia={`btn-resume-session-${record.id}`}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 5,
                              background: '#2563eb',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: 4,
                              padding: '5px 12px',
                              fontSize: 13.5,
                              fontWeight: 700,
                              cursor: 'pointer',
                              boxShadow: '0 1px 2px rgba(37,99,235,0.2)'
                            }}
                          >
                            <span>상담 재개</span>
                          </button>
                          <button
                            onClick={e => handleDeletePendingSession(record.id, e)}
                            style={{
                              background: '#f5f2eb',
                              color: '#dc2626',
                              border: '1px solid #fecaca',
                              borderRadius: 4,
                              padding: '5px 10px',
                              fontSize: 13.5,
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            삭제
                          </button>
                        </div>
                      </div>

                      {/* 에러 코드 및 진행 단계 상세 */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        {record.selectedErrorCodes.map(code => (
                          <span
                            key={code}
                            style={{
                              fontSize: 13.5,
                              fontWeight: 800,
                              fontFamily: 'Consolas, Monaco, monospace',
                              background: '#1d4ed8',
                              color: '#ffffff',
                              padding: '2px 7px',
                              borderRadius: 3
                            }}
                          >
                            [{code}]
                          </span>
                        ))}
                        <span style={{ fontSize: 13.5, fontWeight: 600, color: '#334155' }}>
                          {record.currentStepSummary || record.summaryText}
                        </span>
                        {symptomCount > 1 && (
                          <span style={{ fontSize: 13.5, color: '#64748b' }}>
                            (총 {symptomCount}건 복합 진단 중)
                          </span>
                        )}
                      </div>

                      {/* 상담 메모 */}
                      {record.notes && (
                        <div style={{
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: 4,
                          padding: '6px 10px',
                          fontSize: 13.5,
                          color: '#475569'
                        }}>
                          <span style={{ fontWeight: 800, color: '#1e293b' }}>메모: </span>
                          {record.notes}
                        </div>
                      )}
                    </div>
                  );
                })}

              {pendingSessions.length === 0 && (
                <div style={{ padding: 40, textAlign: 'center', color: '#64748b', fontSize: 14 }}>
                  현재 대기 중인 진행 상담이 없습니다.
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: '10px 18px',
              borderTop: '1px solid #dcd5c9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#ece7de'
            }}>
              <span style={{ fontSize: 13.5, color: '#64748b' }}>
                대기 상담 선택 시 직전 STEP부터 즉시 재개됩니다.
              </span>
              <button
                onClick={() => setShowPendingModal(false)}
                style={{
                  background: '#f5f2eb',
                  border: '1px solid #dcd5c9',
                  borderRadius: 4,
                  padding: '6px 16px',
                  fontSize: 13.5,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {showHistoryModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(3px)'
        }}>
          <div
            data-history-modal
            style={{
              width: '94%',
              maxWidth: 1050,
              maxHeight: '88vh',
              background: '#f5f2eb',
              borderRadius: 10,
              backgroundImage: 'var(--paper-texture)',
              backgroundRepeat: 'repeat',
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            {/* Header */}
            <div style={{
              padding: '12px 18px',
              borderBottom: '1px solid #dcd5c9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#ece7de'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <History size={16} color="#2563eb" />
                <span style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
                  상담 이력
                </span>
                <span style={{
                  fontSize: 13.5,
                  fontWeight: 700,
                  background: '#eff6ff',
                  color: '#1d4ed8',
                  border: '1px solid #bfdbfe',
                  padding: '2px 8px',
                  borderRadius: 4
                }}>
                  총 {historyRecords.length}건
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {/* 필터 탭 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  {(['all', 'resolved', 'visit', 'in_progress'] as const).map(f => {
                    const label = f === 'all' ? '전체' : f === 'resolved' ? '해결' : f === 'visit' ? '출장접수' : '대기/진행';
                    const active = historyStatusFilter === f;
                    return (
                      <button
                        key={f}
                        onClick={() => setHistoryStatusFilter(f)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 4,
                          fontSize: 13.5,
                          fontWeight: active ? 700 : 500,
                          border: active ? '1px solid #1d4ed8' : '1px solid #dcd5c9',
                          background: active ? '#eff6ff' : '#f5f2eb',
                          color: active ? '#1d4ed8' : '#64748b',
                          cursor: 'pointer',
                          transition: 'all 0.1s ease'
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: '#f5f2eb',
                  border: '1px solid #dcd5c9',
                  borderRadius: 5,
                  padding: '4px 10px',
                  width: 280
                }}>
                  <Search size={14} color="#64748b" />
                  <input
                    data-uia="input-history-search"
                    value={historySearchQuery}
                    onChange={e => setHistorySearchQuery(e.target.value)}
                    placeholder="고객명, 전화번호, 에러코드, 증상, 초성 검색"
                    style={{ border: 'none', outline: 'none', fontSize: 13.5, width: '100%' }}
                  />
                  {historySearchQuery && (
                    <button onClick={() => setHistorySearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                      <X size={13} color="#94a3b8" />
                    </button>
                  )}
                </div>

                <button
                  onClick={() => { setShowHistoryModal(false); setSelectedHistoryItem(null); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4 }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
              {/* Left: Record List */}
              <div style={{
                flex: selectedHistoryItem ? 1 : 'none',
                width: selectedHistoryItem ? '48%' : '100%',
                overflowY: 'auto',
                padding: '12px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                borderRight: selectedHistoryItem ? '1px solid #dcd5c9' : 'none'
              }}>
                {historyRecords
                  .filter(record => {
                    if (historyStatusFilter === 'resolved' && record.status !== 'resolved_by_call') return false;
                    if (historyStatusFilter === 'visit' && record.status !== 'visit_required') return false;
                    if (historyStatusFilter === 'in_progress' && record.status !== 'in_progress') return false;
                    return matchesIntegratedSessionQuery(record, historySearchQuery);
                  })
                  .map(record => {
                    const isSelected = selectedHistoryItem?.id === record.id;
                    const isResolved = record.status === 'resolved_by_call';
                    const isVisit = record.status === 'visit_required';

                    return (
                      <div
                        key={record.id}
                        data-history-item={record.id}
                        onClick={() => setSelectedHistoryItem(record)}
                        style={{
                          border: isSelected ? '1px solid #1d4ed8' : '1px solid #dcd5c9',
                          borderRadius: 6,
                          padding: '10px 14px',
                          background: isSelected ? '#eff6ff' : '#f5f2eb',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 5,
                          boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                          transition: 'all 0.1s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 14.5, fontWeight: 800, color: '#0f172a' }}>
                              {record.customerName}
                            </span>
                            {(record.manager || record.phone) && (
                              <span style={{ fontSize: 13.5, color: '#475569', fontWeight: 600 }}>
                                ({[record.manager, record.phone].filter(Boolean).join(' / ')})
                              </span>
                            )}
                            <span style={{ fontSize: 13.5, color: '#64748b' }}>
                              {record.modelName}
                            </span>
                            <span style={{
                              fontSize: 13.5,
                              fontWeight: 700,
                              padding: '2px 7px',
                              borderRadius: 3,
                              background: isResolved ? '#ecfdf5' : isVisit ? '#fef2f2' : '#fffbeb',
                              color: isResolved ? '#059669' : isVisit ? '#dc2626' : '#b45309',
                              border: isResolved ? '1px solid #a7f3d0' : isVisit ? '1px solid #fecaca' : '1px solid #fde68a'
                            }}>
                              {isResolved ? '직접조치 완료' : isVisit ? 'AS 출장 접수' : '고객 대기'}
                            </span>
                          </div>

                          <span style={{ fontSize: 13.5, color: '#64748b' }}>
                            {formatRelativeTime(record.timestamp)} ({new Date(record.timestamp).toLocaleDateString()})
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          {record.selectedErrorCodes.map(c => (
                            <span key={c} style={{
                              fontSize: 13.5,
                              fontWeight: 800,
                              fontFamily: 'Consolas, Monaco, monospace',
                              background: '#1d4ed8',
                              color: '#fff',
                              padding: '2px 7px',
                              borderRadius: 3
                            }}>
                              [{c}]
                            </span>
                          ))}
                          <span style={{ fontSize: 13.5, color: '#334155', fontWeight: 600 }}>
                            {record.summaryText}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                {historyRecords.length === 0 && (
                  <div style={{ padding: 40, textAlign: 'center', color: '#64748b', fontSize: 14 }}>
                    저장된 상담 이력이 없습니다.
                  </div>
                )}
              </div>

              {/* Right: Detailed Inspection Dossier (Selected Record) */}
              {selectedHistoryItem && (
                <div style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '14px 18px',
                  background: '#f5f2eb',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #dcd5c9', paddingBottom: 8 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
                        {selectedHistoryItem.customerName} 상담 상세 기록
                      </span>
                      <span style={{ fontSize: 13.5, color: '#64748b' }}>
                        담당: {selectedHistoryItem.manager || '미지정'} | 연락처: {selectedHistoryItem.phone || '미등록'} | 장비: {selectedHistoryItem.modelName} | 일시: {new Date(selectedHistoryItem.timestamp).toLocaleString()}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {selectedHistoryItem.status === 'in_progress' && (
                        <button
                          onClick={() => handleResumeSession(selectedHistoryItem)}
                          data-uia="btn-history-resume"
                          style={{
                            background: '#2563eb',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: 4,
                            padding: '5px 12px',
                            fontSize: 13.5,
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          상담 재개
                        </button>
                      )}

                      {/* 원청 결재 연계 공문서 열기 버튼 */}
                      <button
                        onClick={() => {
                          const item = selectedHistoryItem;
                          if (item.doc1st) {
                            setDispatchDoc1st(item.doc1st);
                          } else {
                            const evidenceSteps = Object.values(item.symptomSessions || {}).flatMap(s =>
                              s.steps.map(st => ({
                                stepNo: st.step_no,
                                title: st.title,
                                method: st.method || st.title,
                                result: (st.status === 'resolved' ? 'NORMAL' : st.status === 'unresolved' ? 'FAULT' : 'UNRESOLVED') as 'NORMAL' | 'FAULT' | 'UNRESOLVED',
                                note: st.status === 'resolved' ? '정상 해결 및 이상 없음' : st.status === 'unresolved' ? '현장 조치 불가 / 불량 판정' : '안내 진행'
                              }))
                            );
                            setDispatchDoc1st({
                              recipientCompany: item.customerName,
                              recipientManager: item.manager || '시설과장',
                              recipientPhone: item.phone,
                              siteCompany: item.useCompany || '(주)클린에코 미화용역',
                              siteWorkerName: item.siteWorkerName || '김순자 미화반장',
                              siteWorkerPhone: item.siteWorkerPhone || item.phone,
                              equipmentModel: item.modelName,
                              serialNumber: item.serialNumber,
                              symptoms: [item.summaryText],
                              selectedErrorCodes: item.selectedErrorCodes,
                              evidenceSteps: evidenceSteps.length ? evidenceSteps : undefined
                            });
                          }

                          if (item.doc2nd) {
                            setDispatchDoc2nd(item.doc2nd);
                          }
                          setDispatchModalTab(item.status === 'resolved_by_call' ? 'doc2' : 'doc1');
                          setShowDispatchPackageModal(true);
                        }}
                        data-uia="btn-history-open-dispatch-docs"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          background: '#fef2f2',
                          color: '#b91c1c',
                          border: '1px solid #fecaca',
                          borderRadius: 4,
                          padding: '5px 12px',
                          fontSize: 13.5,
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        <FileText size={13} color="#dc2626" />
                        <span>원청 결재 공문서 (1차·2차)</span>
                      </button>
                    </div>
                  </div>

                  {/* 증상별 단계 감사 기록 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: '#1e40af' }}>
                      진단 단계별 조치 기록
                    </span>

                    {Object.values(selectedHistoryItem.symptomSessions || {}).map(s => (
                      <div key={s.key} style={{ background: '#f5f2eb', border: '1px solid #dcd5c9', borderRadius: 6, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
                            증상: {s.title}
                          </span>
                          {s.selectedErrorCode && (
                            <span style={{
                              fontSize: 13.5,
                              fontWeight: 800,
                              fontFamily: 'Consolas, Monaco, monospace',
                              background: '#1d4ed8',
                              color: '#ffffff',
                              padding: '2px 7px',
                              borderRadius: 3
                            }}>
                              [{s.selectedErrorCode.code}] {s.selectedErrorCode.name}
                            </span>
                          )}
                        </div>

                        {/* Steps */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {s.steps.map(st => (
                            <div
                              key={st.step_no}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '6px 10px',
                                borderRadius: 4,
                                background: st.status === 'resolved' ? '#f0fdf4' : st.status === 'unresolved' ? '#fef2f2' : '#f8fafc',
                                border: st.status === 'resolved' ? '1px solid #bbf7d0' : st.status === 'unresolved' ? '1px solid #fecaca' : '1px solid #e2e8f0',
                                fontSize: 13.5
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontWeight: 800, color: '#1e40af' }}>STEP {st.step_no}</span>
                                <span style={{ fontWeight: 600, color: '#1e293b' }}>{st.title}</span>
                              </div>
                              <span style={{
                                fontWeight: 700,
                                fontSize: 13.5,
                                color: st.status === 'resolved' ? '#059669' : st.status === 'unresolved' ? '#dc2626' : st.status === 'active' ? '#2563eb' : '#64748b'
                              }}>
                                {st.status === 'resolved' ? '정상 해결' : st.status === 'unresolved' ? '불량 판정' : st.status === 'active' ? '안내 진행' : '대기'}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* History events */}
                        {s.historyLog && s.historyLog.length > 0 && (
                          <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <span style={{ fontSize: 13.5, fontWeight: 800, color: '#475569' }}>이벤트 타임라인:</span>
                            {s.historyLog.map((log, i) => (
                              <span key={i} style={{ fontSize: 13.5, color: '#64748b', paddingLeft: 6 }}>
                                • {log}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}

                    {Object.keys(selectedHistoryItem.symptomSessions || {}).length === 0 && (
                      <div style={{ background: '#f5f2eb', border: '1px solid #dcd5c9', borderRadius: 6, padding: '10px 12px', fontSize: 13.5, color: '#334155' }}>
                        {selectedHistoryItem.notes || selectedHistoryItem.summaryText || '상세 진단 내역이 기록되지 않은 레거시 데이터입니다.'}
                      </div>
                    )}
                  </div>

                  {/* 상담원 메모 */}
                  {selectedHistoryItem.notes && (
                    <div style={{ background: '#f5f2eb', border: '1px solid #dcd5c9', borderRadius: 6, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 800, color: '#0f172a' }}>상담원 메모</span>
                      <span style={{ fontSize: 13.5, color: '#334155', lineHeight: 1.4 }}>{selectedHistoryItem.notes}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: '10px 18px',
              borderTop: '1px solid #dcd5c9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              background: '#ece7de'
            }}>
              <button
                onClick={() => { setShowHistoryModal(false); setSelectedHistoryItem(null); }}
                style={{
                  background: '#f5f2eb',
                  border: '1px solid #dcd5c9',
                  borderRadius: 4,
                  padding: '6px 16px',
                  fontSize: 13.5,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
