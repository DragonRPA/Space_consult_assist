import type { Dispatch, RefObject, SetStateAction } from 'react';
import {
  BookOpen,
  Clock,
  FileText,
  History,
  Loader2,
  Package,
  RotateCcw,
  Search,
  Smartphone,
  X,
} from 'lucide-react';
import type { DispatchDoc1st } from './dispatchDocTypes';
import type { ModelSpec } from './modelSpecsData';
import {
  EQUIPMENT_MODELS,
  SYMPTOM_CATEGORIES,
  calculateSymptomMatchScore,
  type ConsultSessionRecord,
  type Customer,
  type SymptomPreset,
  type SymptomSession,
} from './counselShared';

export interface CounselV2SubToolbarProps {
  sessionList: SymptomSession[];
  pendingSessions: ConsultSessionRecord[];
  counselorName: string;
  setCounselorName: Dispatch<SetStateAction<string>>;
  setShowPendingModal: Dispatch<SetStateAction<boolean>>;
  setShowHistoryModal: Dispatch<SetStateAction<boolean>>;
  setShowEquipmentManualModal: Dispatch<SetStateAction<boolean>>;
  setShowSelfActionGuideModal: Dispatch<SetStateAction<boolean>>;
  setShowPartsOrderModal: Dispatch<SetStateAction<boolean>>;
  selectedCustomer: Customer | null;
  selectedModel: string;
  customerPhone: string;
  customerEmail: string;
  siteWorkerPhone: string;
  dispatchDoc1st: Partial<DispatchDoc1st> | null;
  setDispatchDoc1st: Dispatch<SetStateAction<Partial<DispatchDoc1st> | null>>;
  setDispatchModalTab: Dispatch<SetStateAction<'doc1' | 'doc2'>>;
  setShowDispatchPackageModal: Dispatch<SetStateAction<boolean>>;
  handleReset: () => void;
}

export function CounselV2SubToolbar({
  sessionList,
  pendingSessions,
  counselorName,
  setCounselorName,
  setShowPendingModal,
  setShowHistoryModal,
  setShowEquipmentManualModal,
  setShowSelfActionGuideModal,
  setShowPartsOrderModal,
  selectedCustomer,
  selectedModel,
  customerPhone,
  customerEmail,
  siteWorkerPhone,
  dispatchDoc1st,
  setDispatchDoc1st,
  setDispatchModalTab,
  setShowDispatchPackageModal,
  handleReset,
}: CounselV2SubToolbarProps) {
  return (
    <div style={{ background: '#ece7de', borderBottom: '1px solid #dcd5c9', padding: '0 16px', display: 'flex', alignItems: 'center', height: 46, gap: 12, flexShrink: 0, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <img
          src="/SPACE_logo.png"
          alt="SPACE"
          style={{ height: 16, width: 'auto', objectFit: 'contain', display: 'block' }}
        />
        <span style={{ fontWeight: 800, fontSize: 14, color: '#0f172a', whiteSpace: 'nowrap' }}>상담지원2</span>
      </div>

      {/* 현재 통화 내 진단 중인 증상 수 뱃지 */}
      {sessionList.length > 0 && (
        <span style={{ fontSize: 13.5, fontWeight: 700, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #dbeafe', padding: '3px 10px', borderRadius: 12 }}>
          진단 대상 {sessionList.length}건
        </span>
      )}

      <div style={{ flex: 1 }} />

      {/* 1. 진행중 상담 대기열 버튼 */}
      <button
        onClick={() => setShowPendingModal(true)}
        data-uia="btn-subtoolbar-pending-queue"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 12px',
          borderRadius: 6,
          fontSize: 13.5,
          fontWeight: 700,
          background: pendingSessions.length > 0 ? '#fffbeb' : '#f5f2eb',
          color: pendingSessions.length > 0 ? '#b45309' : '#475569',
          border: pendingSessions.length > 0 ? '1px solid #fde68a' : '1px solid #dcd5c9',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          height: 30,
          boxShadow: pendingSessions.length > 0 ? '0 1px 2px rgba(245, 158, 11, 0.15)' : 'none',
          transition: 'all 0.15s ease'
        }}
      >
        <Clock size={13} color={pendingSessions.length > 0 ? '#d97706' : '#64748b'} />
        <span>대기열</span>
        <span style={{
          fontSize: 13.5,
          fontWeight: 800,
          background: pendingSessions.length > 0 ? '#d97706' : '#f1f5f9',
          color: pendingSessions.length > 0 ? '#ffffff' : '#64748b',
          padding: '1px 6px',
          borderRadius: 8,
          marginLeft: 2
        }}>
          {pendingSessions.length}
        </span>
      </button>

      {/* 2. 상담 이력 조회 버튼 */}
      <button
        onClick={() => setShowHistoryModal(true)}
        data-uia="btn-subtoolbar-history"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 12px',
          borderRadius: 6,
          fontSize: 13.5,
          fontWeight: 600,
          background: '#f5f2eb',
          color: '#334155',
          border: '1px solid #dcd5c9',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          height: 30,
          transition: 'all 0.15s ease'
        }}
      >
        <History size={13} color="#64748b" />
        <span>상담 이력</span>
      </button>

      {/* 문서 발송 버튼군 (건조 명사·절제 톤) */}
      <button
        onClick={() => setShowEquipmentManualModal(true)}
        data-uia="btn-subtoolbar-equipment-manual"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          padding: '0 10px',
          borderRadius: 6,
          fontSize: 12.5,
          fontWeight: 700,
          background: '#ffffff',
          color: '#1e293b',
          border: '1px solid #cbd5e1',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          height: 28
        }}
      >
        <BookOpen size={13} color="#2563eb" />
        <span>카탈로그·매뉴얼</span>
      </button>

      <button
        onClick={() => setShowSelfActionGuideModal(true)}
        data-uia="btn-subtoolbar-self-guide"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          padding: '0 10px',
          borderRadius: 6,
          fontSize: 12.5,
          fontWeight: 700,
          background: '#ffffff',
          color: '#1e293b',
          border: '1px solid #cbd5e1',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          height: 28
        }}
      >
        <Smartphone size={13} color="#475569" />
        <span>자가조치 가이드</span>
      </button>

      <button
        onClick={() => setShowPartsOrderModal(true)}
        data-uia="btn-subtoolbar-parts-quote"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          padding: '0 10px',
          borderRadius: 6,
          fontSize: 12.5,
          fontWeight: 700,
          background: '#ffffff',
          color: '#1e293b',
          border: '1px solid #cbd5e1',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          height: 28
        }}
      >
        <Package size={13} color="#475569" />
        <span>소모품 견적</span>
      </button>

      <button
        onClick={() => {
          if (!dispatchDoc1st) {
            const evidenceSteps = (sessionList[0]?.steps || []).map(st => ({
              stepNo: st.step_no,
              title: st.title,
              method: st.method || st.title,
              result: (st.status === 'resolved' ? 'NORMAL' : st.status === 'unresolved' ? 'FAULT' : 'UNRESOLVED') as 'NORMAL' | 'FAULT' | 'UNRESOLVED',
              note: st.status === 'resolved' ? '정상' : st.status === 'unresolved' ? '점검필요' : '진행'
            }));
            setDispatchDoc1st({
              recipientCompany: selectedCustomer?.name || '',
              recipientManager: selectedCustomer?.manager || '',
              recipientPhone: customerPhone || selectedCustomer?.phone || '',
              recipientEmail: customerEmail.trim() || selectedCustomer?.managerEmail || '',
              siteCompany: selectedCustomer?.useCompany || '',
              siteWorkerName: selectedCustomer?.siteWorkerName || '',
              siteWorkerPhone: siteWorkerPhone || selectedCustomer?.siteWorkerPhone || '',
              equipmentModel: selectedModel,
              serialNumber: selectedCustomer?.serialNumber || '',
              symptoms: sessionList.map(s => s.title).length ? sessionList.map(s => s.title) : ['현장 점검 요청'],
              selectedErrorCodes: sessionList.flatMap(s => s.selectedErrorCode ? [s.selectedErrorCode.code] : []),
              evidenceSteps: evidenceSteps.length ? evidenceSteps : undefined
            });
          }
          setDispatchModalTab('doc1');
          setShowDispatchPackageModal(true);
        }}
        data-uia="btn-subtoolbar-dispatch-docs"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          padding: '0 10px',
          borderRadius: 6,
          fontSize: 12.5,
          fontWeight: 700,
          background: '#ffffff',
          color: '#1e293b',
          border: '1px solid #cbd5e1',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          height: 28
        }}
      >
        <FileText size={13} color="#475569" />
        <span>출장 문서</span>
      </button>

      <div style={{ width: 1, height: 18, background: '#dcd5c9' }} />

      {/* 상담자 입력 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <label style={{ fontSize: 13.5, fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>상담자</label>
        <input
          value={counselorName}
          onChange={e => setCounselorName(e.target.value)}
          placeholder="성명"
          style={{ border: '1px solid #dcd5c9', borderRadius: 4, padding: '2px 8px', fontSize: 13.5, width: 78, height: 28, outline: 'none', background: '#f5f2eb' }}
        />
      </div>

      {/* 초기화 버튼 */}
      <button
        onClick={handleReset}
        style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#f5f2eb', border: '1px solid #dcd5c9', borderRadius: 4, padding: '2px 10px', fontSize: 13.5, fontWeight: 600, color: '#475569', cursor: 'pointer', whiteSpace: 'nowrap', height: 28 }}
      >
        <RotateCcw size={12} /> 초기화
      </button>
    </div>
  );
}

export interface CounselV2LeftPaneProps {
  selectedModel: string;
  setSelectedModel: Dispatch<SetStateAction<string>>;
  currentModelSpec: ModelSpec | null;
  showModelSpec: boolean;
  setShowModelSpec: Dispatch<SetStateAction<boolean>>;
  searchRef: RefObject<HTMLInputElement | null>;
  searchText: string;
  setSearchText: Dispatch<SetStateAction<string>>;
  searchResults: Customer[];
  setSearchResults: Dispatch<SetStateAction<Customer[]>>;
  selectedCustomer: Customer | null;
  setSelectedCustomer: Dispatch<SetStateAction<Customer | null>>;
  customerPhone: string;
  setCustomerPhone: Dispatch<SetStateAction<string>>;
  siteWorkerPhone: string;
  setSiteWorkerPhone: Dispatch<SetStateAction<string>>;
  customerEmail: string;
  setCustomerEmail: Dispatch<SetStateAction<string>>;
  dropdownOpen: boolean;
  setDropdownOpen: Dispatch<SetStateAction<boolean>>;
  isSearching: boolean;
  handleCustomerSearch: (q: string) => Promise<void>;
  selectCustomer: (c: Customer) => void;
  pendingSessions: ConsultSessionRecord[];
  currentSessionId: string | null;
  handleResumeSession: (record: ConsultSessionRecord) => void;
  formatRelativeTime: (dateStr?: string) => string;
  selectedCategory: string;
  setSelectedCategory: Dispatch<SetStateAction<string>>;
  symptomSearchQuery: string;
  setSymptomSearchQuery: Dispatch<SetStateAction<string>>;
  symptomPresets: SymptomPreset[];
  symptomSessions: Record<string, SymptomSession>;
  activeSymptomKey: string | null;
  isLoadingPlan: boolean;
  handleSelectSymptom: (preset: SymptomPreset) => void;
  showCustomInput: boolean;
  setShowCustomInput: Dispatch<SetStateAction<boolean>>;
  customSymptom: string;
  setCustomSymptom: Dispatch<SetStateAction<string>>;
  handleCustomSearch: () => Promise<void>;
}

export function CounselV2LeftPane({
  selectedModel,
  setSelectedModel,
  currentModelSpec,
  showModelSpec,
  setShowModelSpec,
  searchRef,
  searchText,
  setSearchText,
  searchResults,
  setSearchResults,
  selectedCustomer,
  setSelectedCustomer,
  customerPhone,
  setCustomerPhone,
  siteWorkerPhone,
  setSiteWorkerPhone,
  customerEmail,
  setCustomerEmail,
  dropdownOpen,
  setDropdownOpen,
  isSearching,
  handleCustomerSearch,
  selectCustomer,
  pendingSessions,
  currentSessionId,
  handleResumeSession,
  formatRelativeTime,
  selectedCategory,
  setSelectedCategory,
  symptomSearchQuery,
  setSymptomSearchQuery,
  symptomPresets,
  symptomSessions,
  activeSymptomKey,
  isLoadingPlan,
  handleSelectSymptom,
  showCustomInput,
  setShowCustomInput,
  customSymptom,
  setCustomSymptom,
  handleCustomSearch,
}: CounselV2LeftPaneProps) {
  return (
    <div style={{ width: 380, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6, height: '100%', overflow: 'hidden' }}>

      {/* 좌측 상단: 장비 모델 및 고객사 조회 */}
      <div style={{ background: '#f5f2eb', borderRadius: 8, border: '1px solid #dcd5c9', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0, position: 'relative', zIndex: 50, boxShadow: '0 1px 2px rgba(40,30,20,0.05)' }}>
        {/* 장비 모델 칩 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ fontSize: 13.5, fontWeight: 700, color: '#334155', whiteSpace: 'nowrap' }}>장비 모델</label>
              {currentModelSpec && (
                <button
                  data-spec-toggle-btn
                  onClick={() => setShowModelSpec(prev => !prev)}
                  style={{
                    padding: '2px 8px',
                    borderRadius: 4,
                    fontSize: 13.5,
                    fontWeight: 700,
                    background: showModelSpec ? '#1d4ed8' : '#eff6ff',
                    color: showModelSpec ? '#ffffff' : '#2563eb',
                    border: showModelSpec ? '1px solid #1e40af' : '1px solid #bfdbfe',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                    transition: 'all 0.1s ease'
                  }}
                >
                  <FileText size={12} />
                  <span>{showModelSpec ? '제원 닫기' : '제원·규격'}</span>
                </button>
              )}
            </div>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: '#2563eb' }}>선택: {selectedModel}</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {EQUIPMENT_MODELS.map(m => {
              const isActive = selectedModel === m;
              return (
                <button
                  key={m}
                  onClick={() => { setSelectedModel(m); }}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 5,
                    fontSize: 13.5,
                    fontWeight: isActive ? 700 : 500,
                    border: isActive ? '1px solid #0f172a' : '1px solid #dcd5c9',
                    background: isActive ? '#0f172a' : '#f5f2eb',
                    color: isActive ? '#ffffff' : '#334155',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    boxShadow: isActive ? '0 1px 2px rgba(15,23,42,0.2)' : 'none',
                    transition: 'all 0.12s ease'
                  }}
                >
                  {m}
                </button>
              );
            })}
          </div>

          {/* 매뉴얼 기반 모델 제원·규격 접이식 카드 */}
          {showModelSpec && currentModelSpec && (
            <div
              data-model-spec-card
              style={{
                background: '#f5f2eb',
                border: '1px solid #bfdbfe',
                borderRadius: 6,
                padding: '8px 10px',
                display: 'flex',
                flexDirection: 'column',
                gap: 5,
                fontSize: 13.5,
                marginTop: 4
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #dcd5c9', paddingBottom: 4 }}>
                <span style={{ fontWeight: 800, color: '#1e40af', fontSize: 14 }}>
                  {currentModelSpec.model_name} <span style={{ fontWeight: 500, color: '#64748b', fontSize: 13.5 }}>({currentModelSpec.category})</span>
                </span>
                <span style={{ color: '#059669', fontWeight: 700, fontSize: 13.5 }}>가동 {currentModelSpec.run_time}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 8px', color: '#334155', fontSize: 13.5 }}>
                <div><span style={{ color: '#64748b', fontWeight: 600 }}>탱크:</span> {currentModelSpec.clean_tank_l}L / {currentModelSpec.recovery_tank_l}L</div>
                <div><span style={{ color: '#64748b', fontWeight: 600 }}>브러시:</span> {currentModelSpec.brush_spec}</div>
                <div><span style={{ color: '#64748b', fontWeight: 600 }}>스퀴지:</span> {currentModelSpec.squeegee_width_mm > 0 ? `${currentModelSpec.squeegee_width_mm}mm` : '건식 진공'}</div>
                <div><span style={{ color: '#64748b', fontWeight: 600 }}>배터리:</span> {currentModelSpec.battery_spec}</div>
              </div>
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 4, padding: '4px 8px', color: '#991b1b', fontSize: 13.5, lineHeight: 1.35 }}>
                <span style={{ fontWeight: 700 }}>차단기/퓨즈: </span>{currentModelSpec.fuse_location}
              </div>
              <div style={{ color: '#475569', fontSize: 13.5, lineHeight: 1.35 }}>
                <span style={{ fontWeight: 600, color: '#334155' }}>주요 소모품: </span>{currentModelSpec.key_consumables}
              </div>
            </div>
          )}
        </div>

        {/* 고객 검색 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, position: 'relative' }}>
          <label style={{ fontSize: 13.5, fontWeight: 700, color: '#334155', whiteSpace: 'nowrap' }}>고객사 조회</label>
          <div style={{ position: 'relative' }}>
            <Search size={14} color="#64748b" style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              ref={searchRef}
              data-uia="input-customer-search"
              value={searchText}
              onChange={e => handleCustomerSearch(e.target.value)}
              onFocus={() => searchText && setDropdownOpen(true)}
              placeholder="고객사명, 담당자 또는 초성 검색 (예: ㅅㅍ)"
              style={{ width: '100%', paddingLeft: 28, paddingRight: 24, height: 32, border: '1px solid #dcd5c9', borderRadius: 5, fontSize: 13.5, outline: 'none', boxSizing: 'border-box', background: '#f5f2eb' }}
            />
            {searchText && (
              <button
                onClick={() => { setSearchText(''); setSearchResults([]); setDropdownOpen(false); }}
                style={{ position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 0 }}
              >
                <X size={13} />
              </button>
            )}
            {isSearching && <Loader2 size={13} color="#64748b" style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', animation: 'spin 1s linear infinite' }} />}
          </div>

          {/* 검색 결과 드롭다운 */}
          {dropdownOpen && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#f5f2eb', border: '1px solid #1d4ed8', borderRadius: 6, boxShadow: '0 8px 24px rgba(40,30,20,0.15)', zIndex: 999, marginTop: 4, maxHeight: 200, overflowY: 'auto' }}>
              {searchResults.map(c => (
                <div
                  key={c.id}
                  data-customer-item={c.name}
                  onClick={() => selectCustomer(c)}
                  style={{ padding: '8px 10px', cursor: 'pointer', borderBottom: '1px solid #e8e2d8', fontSize: 13.5 }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#eff6ff')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#f5f2eb')}
                >
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>{c.name}</div>
                  <div style={{ fontSize: 13.5, color: '#64748b' }}>
                    {c.manager} · {c.phone} {c.useCompany ? `| 실사용: ${c.useCompany}` : ''} | 보유: {c.assetModel || '미지정'}
                  </div>
                </div>
              ))}
              {searchResults.length === 0 && !isSearching && (
                <div style={{ padding: '10px 12px', fontSize: 13.5, color: '#64748b', textAlign: 'center' }}>
                  일치하는 고객사가 없습니다.
                </div>
              )}
            </div>
          )}
        </div>

        {selectedCustomer && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, padding: '8px 10px', fontSize: 13.5 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 800, color: '#1e40af', background: '#dbeafe', padding: '1px 5px', borderRadius: 3 }}>원청</span>
                  <span style={{ fontWeight: 800, color: '#0f172a' }}>{selectedCustomer.name}</span>
                </div>
                <div style={{ fontSize: 13.5, color: '#475569' }}>
                  결재: <b>{selectedCustomer.manager}</b> ({selectedCustomer.phone})
                </div>
              </div>
              <button onClick={() => { setSelectedCustomer(null); setCustomerPhone(''); setSiteWorkerPhone(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 0 }}>
                <X size={13} />
              </button>
            </div>

            {selectedCustomer.useCompany && (
              <div style={{ borderTop: '1px dashed #bfdbfe', paddingTop: 4, display: 'flex', flexDirection: 'column', gap: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 800, color: '#047857', background: '#d1fae5', padding: '1px 5px', borderRadius: 3 }}>실사용처</span>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>{selectedCustomer.useCompany}</span>
                </div>
                <div style={{ fontSize: 13.5, color: '#475569' }}>
                  현장통화: <b>{selectedCustomer.siteWorkerName || '미화반장'}</b> ({selectedCustomer.siteWorkerPhone || selectedCustomer.phone})
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2-Track 연락처 입력 필드: 현장 통화자 vs 원청 결재권자 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {/* ① 현장 통화자 연락처 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <label style={{ fontSize: 13.5, fontWeight: 700, color: '#047857', whiteSpace: 'nowrap' }}>
              현장통화 (미화원)
            </label>
            <input
              data-uia="input-site-worker-phone"
              value={siteWorkerPhone}
              onChange={e => setSiteWorkerPhone(e.target.value)}
              placeholder="010-3456-7890"
              style={{
                width: '100%', height: 32, border: '1px solid #dcd5c9', borderRadius: 5,
                padding: '0 6px', fontSize: 13.5, outline: 'none', background: '#f5f2eb', boxSizing: 'border-box'
              }}
            />
          </div>

          {/* ② 원청 결재자 연락처 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <label style={{ fontSize: 13.5, fontWeight: 700, color: '#1e40af', whiteSpace: 'nowrap' }}>
              원청결재 (관리소)
            </label>
            <input
              data-uia="input-customer-phone"
              value={customerPhone}
              onChange={e => setCustomerPhone(e.target.value)}
              placeholder="010-9876-5432"
              style={{
                width: '100%', height: 32, border: '1px solid #dcd5c9', borderRadius: 5,
                padding: '0 6px', fontSize: 13.5, outline: 'none', background: '#f5f2eb', boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        {/* ③ 원청 결재 이메일 (공문서/견적서 이메일 발송용) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <label style={{ fontSize: 13.5, fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
            원청 결재 이메일 (공문서/견적서 수신)
          </label>
          <input
            data-uia="input-customer-email"
            value={customerEmail}
            onChange={e => setCustomerEmail(e.target.value)}
            placeholder="facility@apt.co.kr (이메일 발송용)"
            style={{
              width: '100%', height: 30, border: '1px solid #dcd5c9', borderRadius: 5,
              padding: '0 8px', fontSize: 13.5, outline: 'none', background: '#f5f2eb', boxSizing: 'border-box'
            }}
          />
        </div>

        {/* 해당 고객사의 진행 중인 상담 자동 감지 배너 */}
        {(() => {
          if (!selectedCustomer) return null;
          const foundPending = pendingSessions.find(p =>
            p.customerName === selectedCustomer.name ||
            (selectedCustomer.phone && p.phone && p.phone === selectedCustomer.phone)
          );
          if (!foundPending || foundPending.id === currentSessionId) return null;

          return (
            <div style={{
              background: '#fffbeb',
              border: '1.5px solid #f59e0b',
              borderRadius: 6,
              padding: '8px 10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              boxShadow: '0 2px 6px rgba(245,158,11,0.15)'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={14} color="#d97706" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 13.5, fontWeight: 900, color: '#b45309', whiteSpace: 'nowrap' }}>
                    진행 중 상담 감지
                  </span>
                  <span style={{ fontSize: 13.5, color: '#b45309', background: '#fef3c7', padding: '1px 6px', borderRadius: 3, border: '1px solid #fde68a', fontWeight: 800 }}>
                    {formatRelativeTime(foundPending.timestamp)}
                  </span>
                </div>
                <span style={{ fontSize: 13.5, color: '#78350f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {foundPending.currentStepSummary || foundPending.summaryText}
                </span>
              </div>
              <button
                onClick={() => handleResumeSession(foundPending)}
                data-uia="btn-resume-detected-session"
                style={{
                  background: '#d97706',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 4,
                  padding: '4px 10px',
                  fontSize: 13.5,
                  fontWeight: 800,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  boxShadow: '0 1px 3px rgba(217,119,6,0.3)'
                }}
              >
                상담 이어하기
              </button>
            </div>
          );
        })()}
      </div>


      {/* 좌측 중단: 계통 필터 & 검색 */}
      <div style={{ background: '#f5f2eb', borderRadius: 8, border: '1px solid #dcd5c9', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0, boxShadow: '0 1px 2px rgba(40,30,20,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
          {SYMPTOM_CATEGORIES.map(cat => {
            const isCatActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '4px 8px',
                  borderRadius: 4,
                  fontSize: 13.5,
                  fontWeight: isCatActive ? 700 : 500,
                  border: isCatActive ? '1px solid #bfdbfe' : '1px solid #dcd5c9',
                  background: isCatActive ? '#eff6ff' : '#f5f2eb',
                  color: isCatActive ? '#1d4ed8' : '#64748b',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.1s ease'
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <input
            value={symptomSearchQuery}
            onChange={e => setSymptomSearchQuery(e.target.value)}
            placeholder="증상 검색 (초성: ㅅㅇ, ㅂㅌㄹ, 소음)"
            style={{ flex: 1, height: 32, border: '1px solid #dcd5c9', borderRadius: 5, padding: '0 8px', fontSize: 13.5, outline: 'none', background: '#f5f2eb' }}
          />
          {symptomSearchQuery && (
            <button onClick={() => setSymptomSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '0 2px' }}>
              <X size={13} />
            </button>
          )}
          <button
            onClick={() => setShowCustomInput(!showCustomInput)}
            style={{ background: '#f5f2eb', border: '1px solid #dcd5c9', borderRadius: 5, padding: '0 10px', height: 32, color: '#1d4ed8', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            {showCustomInput ? '닫기' : '직접입력'}
          </button>
        </div>

        {showCustomInput && (
          <div style={{ display: 'flex', gap: 4, paddingTop: 4, borderTop: '1px dashed #dcd5c9' }}>
            <input
              value={customSymptom}
              onChange={e => setCustomSymptom(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCustomSearch()}
              placeholder="증상 직접 입력"
              style={{ flex: 1, height: 32, border: '1px solid #dcd5c9', borderRadius: 5, padding: '0 8px', fontSize: 13.5, outline: 'none', background: '#f5f2eb' }}
            />
            <button
              onClick={handleCustomSearch}
              disabled={!customSymptom.trim() || isLoadingPlan}
              style={{ background: '#0f172a', color: '#fff', border: 'none', borderRadius: 5, padding: '0 12px', height: 32, fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}
            >
              추가
            </button>
          </div>
        )}
      </div>

      {/* 좌측 하단: 16대 표준 장애 유형 리스트 (실시간 세션 상태 뱃지 탑재) */}
      <div style={{ flex: 1, background: '#f5f2eb', borderRadius: 8, border: '1px solid #dcd5c9', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 1px 2px rgba(40,30,20,0.05)' }}>
        <div style={{ padding: '7px 10px', background: '#ece7de', borderBottom: '1px solid #dcd5c9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
            표준 장애 유형 ({symptomPresets.length}건)
          </span>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 5, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {(() => {
            const q = symptomSearchQuery.trim();
            const filtered = symptomPresets
              .filter(p => {
                let matchCat = false;
                if (selectedCategory === '전체') {
                  matchCat = true;
                } else if (selectedCategory === '에러코드') {
                  matchCat = p.category === '에러코드' || p.id === 'EXT_ERROR_CODE' || Boolean(p.official_error_codes && p.official_error_codes.length > 0);
                } else {
                  matchCat = p.category === selectedCategory;
                }

                if (!matchCat) return false;
                if (!q) return true;

                return calculateSymptomMatchScore(p, q) > 0;
              })
              .sort((a, b) => {
                if (!q) return 0;
                return calculateSymptomMatchScore(b, q) - calculateSymptomMatchScore(a, q);
              });

            if (filtered.length === 0) {
              return (
                <div style={{ padding: 16, textAlign: 'center', color: '#64748b', fontSize: 13.5 }}>
                  일치하는 증상이 없습니다.
                </div>
              );
            }

            return filtered.map((preset, idx) => {
              const isCurrentActive = activeSymptomKey === preset.title;
              const existingSession = symptomSessions[preset.title];

              return (
                <div
                  key={idx}
                  data-symptom-card={preset.title}
                  onClick={() => handleSelectSymptom(preset)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3,
                    padding: '6px 8px',
                    borderRadius: 5,
                    border: isCurrentActive
                      ? '1.5px solid #2563eb'
                      : existingSession
                      ? '1px solid #94a3b8'
                      : '1px solid #dcd5c9',
                    background: isCurrentActive
                      ? '#eff6ff'
                      : existingSession
                      ? '#f5f2eb'
                      : '#f5f2eb',
                    cursor: 'pointer',
                    transition: 'all 0.12s ease'
                  }}
                  onMouseEnter={e => { if (!isCurrentActive) e.currentTarget.style.background = '#f5f2eb'; }}
                  onMouseLeave={e => { if (!isCurrentActive && !existingSession) e.currentTarget.style.background = '#f5f2eb'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0, flex: 1 }}>
                      <span style={{ fontSize: 14, fontWeight: isCurrentActive ? 800 : 700, color: isCurrentActive ? '#1d4ed8' : '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {preset.title}
                      </span>
                    </div>

                    {/* 세션 상태 뱃지 (진행중, 해결, 출장필요) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                      {existingSession && (
                        <span style={{
                          fontSize: 13.5,
                          padding: '2px 7px',
                          borderRadius: 3,
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                          background: existingSession.status === 'resolved_by_call'
                            ? '#ecfdf5'
                            : existingSession.status === 'visit_required'
                            ? '#fef2f2'
                            : '#eff6ff',
                          color: existingSession.status === 'resolved_by_call'
                            ? '#059669'
                            : existingSession.status === 'visit_required'
                            ? '#dc2626'
                            : '#1d4ed8',
                          border: existingSession.status === 'resolved_by_call'
                            ? '1px solid #a7f3d0'
                            : existingSession.status === 'visit_required'
                            ? '1px solid #fecaca'
                            : '1px solid #bfdbfe'
                        }}>
                          {existingSession.status === 'resolved_by_call'
                            ? '해결됨'
                            : existingSession.status === 'visit_required'
                            ? '출장필요'
                            : `STEP ${existingSession.activeStepIndex + 1}`}
                        </span>
                      )}

                      <span style={{
                        fontSize: 13.5,
                        padding: '2px 7px',
                        borderRadius: 3,
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        background: preset.urgency === '긴급' ? '#fef2f2' : '#f5f2eb',
                        color: preset.urgency === '긴급' ? '#dc2626' : '#64748b',
                        border: preset.urgency === '긴급' ? '1px solid #fecaca' : '1px solid #dcd5c9'
                      }}>
                        {preset.urgency}
                      </span>
                    </div>
                  </div>

                  <span style={{ fontSize: 13.5, color: '#64748b', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {preset.symptom}
                  </span>
                </div>
              );
            });
          })()}
        </div>
      </div>

    </div>
  );
}
