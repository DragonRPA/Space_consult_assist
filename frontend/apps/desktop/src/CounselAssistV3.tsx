import { lazy, Suspense, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Search, Wrench, RotateCcw, Clock, History,
  Building2, Cpu, X, Check
} from 'lucide-react';
import { DEFAULT_MODEL_SPECS, type ModelSpec } from './modelSpecsData';
import { DEFAULT_SYMPTOM_PRESETS } from './manualKnowledgeData';
import { getModelErrorCodes } from './modelErrorCodesData';
import {
  type Customer,
  type DiagnosticStep,
  type OfficialErrorCode,
  type SymptomSession,
  type ConsultSessionRecord,
  type SymptomPreset,
} from './counselShared';
import type {
  DispatchDoc1st,
  DispatchDoc2nd,
  SelfActionEvidenceItem
} from './dispatchDocTypes';
import {
  OmniSuggestDropdown,
  SimpleSessionListModal,
} from './CounselAssistV3Parts';
import {
  matchOmniExecutionEntities,
  parseOmniQuery,
  type OmniParsedResult,
} from './omniQueryParser';
import { CounselV3Workspace } from './CounselV3Workspace';

const DispatchDocPackageModal = lazy(() => import('./DispatchDocPackageModal'));
const PartsOrderQuotationModal = lazy(() => import('./PartsOrderQuotationModal'));
const SelfActionGuideModal = lazy(() => import('./SelfActionGuideModal'));
const EquipmentManualModal = lazy(() => import('./EquipmentManualModal'));

const API = 'http://127.0.0.1:8000/api/v1';
const PENDING_STORAGE_KEY = 'space_advisor_pending_sessions_v2';
const HISTORY_STORAGE_KEY = 'space_advisor_history_records_v2';

export default function CounselAssistV3() {
  // ── 1. 단일 옴니 검색창 상태 ──────────────────────────────────────────────────
  const [omniQuery, setOmniQuery] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const omniInputRef = useRef<HTMLInputElement>(null);

  // ── 2. 점진적으로 채워지는 컨텍스트 상태 (초기값은 모두 비어있음 = Zero-State) ──
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [siteWorkerPhone, setSiteWorkerPhone] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');

  // ── 3. 증상 진단 세션 상태 ───────────────────────────────────────────────────
  const [symptomPresets, setSymptomPresets] = useState<SymptomPreset[]>(DEFAULT_SYMPTOM_PRESETS as any);
  const [symptomSessions, setSymptomSessions] = useState<Record<string, SymptomSession>>({});
  const [activeSymptomKey, setActiveSymptomKey] = useState<string | null>(null);
  const [notes, setNotes] = useState<string>('');
  const [counselorName] = useState<string>('이지은 선임');

  // ── 4. 부가 패널 및 모달 상태 (필요 시점에만 호출) ───────────────────────────
  const [showModelSpec, setShowModelSpec] = useState<boolean>(false);

  const [showSelfActionGuideModal, setShowSelfActionGuideModal] = useState<boolean>(false);
  const [showPartsOrderModal, setShowPartsOrderModal] = useState<boolean>(false);
  const [showEquipmentManualModal, setShowEquipmentManualModal] = useState<boolean>(false);
  const [showDispatchPackageModal, setShowDispatchPackageModal] = useState<boolean>(false);
  const [dispatchDoc1st, setDispatchDoc1st] = useState<Partial<DispatchDoc1st> | null>(null);
  const [dispatchDoc2nd, setDispatchDoc2nd] = useState<Partial<DispatchDoc2nd> | null>(null);
  const [dispatchModalTab, setDispatchModalTab] = useState<'doc1' | 'doc2'>('doc1');

  // ── 5. 대기열 및 상담 이력 상태 ──────────────────────────────────────────────
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [pendingSessions, setPendingSessions] = useState<ConsultSessionRecord[]>([]);
  const [historyRecords, setHistoryRecords] = useState<ConsultSessionRecord[]>([]);
  const [showPendingModal, setShowPendingModal] = useState<boolean>(false);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string, ms = 2600) => {
    setToast(msg);
    setTimeout(() => setToast(null), ms);
  }, []);

  // 로컬 스토리지 대기열/이력 로드
  useEffect(() => {
    try {
      const savedPending = localStorage.getItem(PENDING_STORAGE_KEY);
      if (savedPending) setPendingSessions(JSON.parse(savedPending));
      const savedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (savedHistory) setHistoryRecords(JSON.parse(savedHistory));
    } catch {}
  }, []);

  const effectiveModel = selectedModel || selectedCustomer?.assetModel || 'J600T';
  const currentModelSpec: ModelSpec | null = DEFAULT_MODEL_SPECS[effectiveModel] || DEFAULT_MODEL_SPECS['J600T'] || null;
  const sessionList: SymptomSession[] = Object.values(symptomSessions);
  const currentSession: SymptomSession | null = activeSymptomKey ? (symptomSessions[activeSymptomKey] ?? null) : null;

  // ── 화면이 초기 제로 상태(Zero-State)인지 판정 ───────────────────────────────
  const isZeroState = !selectedCustomer && !selectedModel && sessionList.length === 0;

  // ── 모델별 증상 동기화 ───────────────────────────────────────────────────────
  useEffect(() => {
    const modelToLoad = effectiveModel;
    const currentCodes = getModelErrorCodes(modelToLoad);
    fetch(`${API}/counsel/model-symptoms?model=${encodeURIComponent(modelToLoad)}`)
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (data?.symptoms?.length) {
          setSymptomPresets(
            data.symptoms.map((s: any) =>
              s.id === 'EXT_ERROR_CODE' || s.category === '에러코드'
                ? { ...s, official_error_codes: data.error_codes || currentCodes }
                : s
            )
          );
        }
      })
      .catch(() => {});
  }, [effectiveModel]);

  // ── 증상 세션 생성/전환 함수 ──────────────────────────────────────────────────
  const activateSymptomPreset = useCallback(
    (preset: SymptomPreset, targetModel?: string, initialErrorCode?: OfficialErrorCode) => {
      const key = preset.title;
      const modelForCodes = targetModel || effectiveModel;

      if (symptomSessions[key]) {
        setActiveSymptomKey(key);
        if (initialErrorCode) {
          setSymptomSessions(prev => ({
            ...prev,
            [key]: { ...prev[key], selectedErrorCode: initialErrorCode }
          }));
        }
        return;
      }

      const rawSteps = preset.action_plan?.steps || [
        '장비 가동 정지 후 전원 스위치 및 비상정지 버튼 점검',
        '하부 주요 부품 및 케이블 결속 상태 육안 확인',
        '현장 조치 불가 시 담당 정비사 출동 접수'
      ];

      const parsedSteps: DiagnosticStep[] = rawSteps.map((s: any, idx: number) => {
        if (typeof s === 'string') {
          return {
            step_no: idx + 1,
            title: s,
            method: s,
            criteria_normal: '정상 작동 확인 및 증상 해소',
            criteria_fault: '증상 지속 또는 오류 재발',
            fault_action: idx + 1 < rawSteps.length ? `STEP ${idx + 2} 단계로 진행` : '정비사 출동 접수 전환',
            status: idx === 0 ? 'active' : 'pending'
          };
        }
        return {
          step_no: s.step_no ?? idx + 1,
          title: s.title ?? `조치 단계 ${idx + 1}`,
          method: s.method ?? s.title ?? '',
          criteria_normal: s.criteria_normal ?? '정상 상태 확인',
          criteria_fault: s.criteria_fault ?? '이상 지속',
          fault_action: s.fault_action ?? '다음 조치 진행',
          status: idx === 0 ? 'active' : 'pending'
        };
      });

      const officialCodes = getModelErrorCodes(modelForCodes);

      const newSession: SymptomSession = {
        key,
        title: preset.title,
        category: preset.category || '기타',
        part_code: preset.action_plan?.part_code || preset.part_code || preset.tag || 'GENERAL',
        urgency: preset.action_plan?.urgency || preset.urgency || '보통',
        can_self_resolve: preset.action_plan?.can_self_resolve ?? true,
        call_script:
          preset.action_plan?.call_script ||
          `고객님, ${preset.title} 증상은 단계별 기본 점검을 순서대로 안내해 드리겠습니다.`,
        steps: parsedSteps,
        activeStepIndex: 0,
        status: 'in_progress',
        historyLog: [`[증상 시작] ${preset.title}`],
        official_error_codes: officialCodes,
        selectedErrorCode: initialErrorCode || null
      };

      setSymptomSessions(prev => ({ ...prev, [key]: newSession }));
      setActiveSymptomKey(key);
    },
    [effectiveModel, symptomSessions]
  );

  // ── [핵심] 단일 검색창 다중 엔티티 파서 (고객전화번호 + 업체명 + 모델명 + 증상/에러코드) ──
  const parsedOmni: OmniParsedResult = useMemo(
    () => parseOmniQuery(omniQuery, symptomPresets, effectiveModel),
    [omniQuery, symptomPresets, effectiveModel]
  );
  // ── 고객 선택 적용 ───────────────────────────────────────────────────────────
  const applyCustomer = useCallback((c: Customer, explicitModel?: string) => {
    setSelectedCustomer(c);
    setCustomerPhone(c.phone || '');
    setSiteWorkerPhone(c.siteWorkerPhone || c.phone || '');
    setCustomerEmail(c.managerEmail || '');
    setSelectedModel(explicitModel || c.assetModel || 'J600T');
  }, []);

  // ── 옴니 검색창에서 Enter 또는 복합 실행 클릭 시 일괄 전개 ──────────────────
  const handleExecuteOmni = useCallback(
    (customQuery?: string) => {
      const q = (customQuery ?? omniQuery).trim();
      if (!q) return;

      const { foundCust, foundModel, foundError, foundSymptom } = matchOmniExecutionEntities(
        q,
        symptomPresets,
        effectiveModel
      );

      const appliedLabels: string[] = [];
      if (foundCust) {
        applyCustomer(foundCust, foundModel);
        appliedLabels.push(`고객: ${foundCust.name}`);
      } else if (foundModel) {
        setSelectedModel(foundModel);
        appliedLabels.push(`모델: ${foundModel}`);
      }

      if (foundSymptom) {
        const targetM = foundModel || foundCust?.assetModel || selectedModel || 'J600T';
        if (!selectedModel && !foundCust) {
          setSelectedModel(targetM);
        }
        activateSymptomPreset(foundSymptom, targetM, foundError);
        appliedLabels.push(`증상: ${foundSymptom.title}`);
      }

      if (appliedLabels.length === 0) {
        // 매칭된 프리셋이 없으면 수동 증상 세션으로 즉시 생성
        const fallbackPreset: SymptomPreset = {
          title: q,
          symptom: q,
          urgency: '보통',
          category: '수동입력'
        };
        if (!selectedModel) setSelectedModel('J600T');
        activateSymptomPreset(fallbackPreset, selectedModel || 'J600T');
        appliedLabels.push(`수동 진단: ${q}`);
      }

      showToast(`화면 전개 완료 (${appliedLabels.join(' · ')})`);
      setOmniQuery('');
      setIsDropdownOpen(false);
    },
    [omniQuery, effectiveModel, symptomPresets, applyCustomer, activateSymptomPreset, selectedModel, showToast]
  );

  // ── 단계별 정상/해결 및 불량/다음단계 핸들러 ─────────────────────────────────
  const handleStepResolve = (stepIdx: number) => {
    if (!currentSession) return;
    const step = currentSession.steps[stepIdx];
    const updatedSteps = currentSession.steps.map((st, i) =>
      i === stepIdx ? { ...st, status: 'resolved' as const } : st
    );
    const updatedSession: SymptomSession = {
      ...currentSession,
      steps: updatedSteps,
      status: 'resolved_by_call',
      historyLog: [...currentSession.historyLog, `STEP ${step.step_no} (${step.title}): 정상 해결`]
    };
    setSymptomSessions(prev => ({ ...prev, [currentSession.key]: updatedSession }));
    showToast(`[${currentSession.title}] STEP ${step.step_no} 해결 완료`);
  };

  const handleStepFail = (stepIdx: number) => {
    if (!currentSession) return;
    const step = currentSession.steps[stepIdx];
    const isLast = stepIdx >= currentSession.steps.length - 1;
    const updatedSteps = currentSession.steps.map((st, i) => {
      if (i === stepIdx) return { ...st, status: 'unresolved' as const };
      if (!isLast && i === stepIdx + 1) return { ...st, status: 'active' as const };
      return st;
    });
    const updatedSession: SymptomSession = {
      ...currentSession,
      steps: updatedSteps,
      activeStepIndex: isLast ? stepIdx : stepIdx + 1,
      status: isLast ? 'visit_required' : currentSession.status,
      historyLog: [
        ...currentSession.historyLog,
        `STEP ${step.step_no} (${step.title}): 불량 판정${isLast ? ' -> 출장 정비 전환' : ''}`
      ]
    };
    setSymptomSessions(prev => ({ ...prev, [currentSession.key]: updatedSession }));
    showToast(
      isLast
        ? `[${currentSession.title}] 전 단계 미해결 -> AS 출장 접수 전환`
        : `STEP ${stepIdx + 2} 점검 단계로 이동합니다.`
    );
  };

  // ── 전체 초기화 (초기 구글 검색 화면으로 복귀) ───────────────────────────────
  const handleResetToZero = () => {
    setCurrentSessionId(null);
    setSelectedCustomer(null);
    setSelectedModel(null);
    setCustomerPhone('');
    setSiteWorkerPhone('');
    setCustomerEmail('');
    setSymptomSessions({});
    setActiveSymptomKey(null);
    setNotes('');
    setOmniQuery('');
    setShowModelSpec(false);
    setTimeout(() => omniInputRef.current?.focus(), 80);
  };

  // ── 현재 진행 상태에 따른 자동 저장 판정 (진행중 vs 완료) ───────────────────────
  const smartReturnDescriptor = useMemo(() => {
    const hasCompletedSymptom =
      sessionList.length > 0 &&
      sessionList.some(
        s =>
          s.status === 'resolved_by_call' ||
          s.status === 'visit_required' ||
          s.steps.some(st => st.status === 'resolved') ||
          (s.steps.length > 0 && s.steps.every(st => st.status === 'unresolved'))
      );

    if (hasCompletedSymptom) {
      const isVisit = sessionList.some(
        s =>
          s.status === 'visit_required' ||
          (s.steps.length > 0 && s.steps.every(st => st.status === 'unresolved'))
      );
      return {
        targetMode: isVisit ? ('visit_completed' as const) : ('resolved' as const),
        badgeLabel: isVisit ? '출장접수 완료 저장 · 첫 화면 복귀' : '상담완료 저장 · 첫 화면 복귀',
        color: '#059669'
      };
    }

    return {
      targetMode: 'pending' as const,
      badgeLabel: '진행중 저장 · 첫 화면 복귀',
      color: '#2563eb'
    };
  }, [sessionList]);

  // ── 상담 대기열 보류 저장 및 완료 저장 ───────────────────────────────────────
  const handleSaveSession = (mode: 'pending' | 'resolved' | 'visit' | 'visit_completed') => {
    const sessionId = currentSessionId || `sess_${Date.now()}`;
    const nowIso = new Date().toISOString();
    const primeCompany = selectedCustomer?.name || '현장 접수 고객';
    const primeManager = selectedCustomer?.manager || '관리소 시설과장';
    const primePhone = customerPhone || selectedCustomer?.phone || '010-9876-5432';
    const subCompany = selectedCustomer?.useCompany || '(주)클린에코 청소용역';
    const workerName = selectedCustomer?.siteWorkerName || '김순자 미화반장';
    const workerPhone = siteWorkerPhone || selectedCustomer?.siteWorkerPhone || '010-3456-7890';
    const allSymptoms = sessionList.map(s => s.title).join(', ') || '일반 점검';

    const newRecord: ConsultSessionRecord = {
      id: sessionId,
      timestamp: nowIso,
      updatedAt: nowIso,
      status:
        mode === 'visit' || mode === 'visit_completed'
          ? 'visit_required'
          : mode === 'resolved'
          ? 'resolved_by_call'
          : 'in_progress',
      customerName: primeCompany,
      manager: primeManager,
      phone: primePhone,
      managerEmail: customerEmail || selectedCustomer?.managerEmail || 'facility@apt.co.kr',
      useCompany: subCompany,
      siteWorkerName: workerName,
      siteWorkerPhone: workerPhone,
      serialNumber: selectedCustomer?.serialNumber || `${effectiveModel}-2024-0812`,
      modelName: effectiveModel,
      activeSymptomKey,
      symptomSessions,
      notes,
      counselorName,
      summaryText: allSymptoms,
      currentStepSummary: currentSession
        ? `${currentSession.title} (STEP ${currentSession.activeStepIndex + 1})`
        : '고객/모델 조회 진행중',
      selectedErrorCodes: sessionList
        .map(s => s.selectedErrorCode?.code)
        .filter((c): c is string => Boolean(c))
    };

    if (mode === 'pending') {
      const nextPending = [newRecord, ...pendingSessions.filter(p => p.id !== sessionId)];
      setPendingSessions(nextPending);
      try {
        localStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(nextPending));
      } catch {}
      showToast(`[진행중 상담 저장] "${primeCompany} (${allSymptoms})" 건이 진행 대기열에 저장되고 첫 조회화면으로 복귀했습니다.`);
      handleResetToZero();
      return;
    }

    // 완료 저장 시 진행 대기열에 있던 동일 세션은 자동 제거
    const remainingPending = pendingSessions.filter(p => p.id !== sessionId);
    if (remainingPending.length !== pendingSessions.length) {
      setPendingSessions(remainingPending);
      try {
        localStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(remainingPending));
      } catch {}
    }

    const nextHistory = [newRecord, ...historyRecords.filter(h => h.id !== sessionId)];
    setHistoryRecords(nextHistory);
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(nextHistory));
    } catch {}

    if (mode === 'visit') {
      const evidenceSteps: SelfActionEvidenceItem[] = (currentSession?.steps || []).map(st => ({
        stepNo: st.step_no,
        title: st.title,
        method: st.method || st.title,
        result: st.status === 'resolved' ? 'NORMAL' : 'FAULT',
        note: st.status === 'resolved' ? '이상 없음' : '현장 조치 불가 / 부품 점검 요망'
      }));
      setDispatchDoc1st({
        docNo: `S-CHK-${nowIso.slice(0, 10).replace(/-/g, '')}-01`,
        issuedAt: new Date().toLocaleDateString(),
        recipientCompany: primeCompany,
        recipientManager: primeManager,
        recipientPhone: primePhone,
        recipientEmail: newRecord.managerEmail,
        siteCompany: subCompany,
        siteWorkerName: workerName,
        siteWorkerPhone: workerPhone,
        equipmentModel: effectiveModel,
        serialNumber: newRecord.serialNumber,
        symptoms: sessionList.map(s => s.title),
        evidenceSteps,
        failureReason: `매뉴얼 기준 사전 자가점검을 수행하였으나 [${allSymptoms}] 현장 복구가 불가하여 전문 엔지니어 방문 정비를 접수합니다.`,
        assignedEngineer: '박정비 기술수석',
        engineerPhone: '010-5555-8282',
        plannedVisitAt: `${new Date(Date.now() + 86400000).toISOString().slice(0, 10)} 14:00 방문 예정`,
        status: 'DRAFT'
      });
      setDispatchModalTab('doc1');
      setShowDispatchPackageModal(true);
      showToast('AS 출장 접수 완료 -> 원청 결재 연계 문서가 생성되었습니다.');
    } else if (mode === 'visit_completed') {
      showToast(`[완료 상담 저장] "${primeCompany} (${allSymptoms})" 건이 AS 출장 대상 이력으로 저장되고 첫 조회화면으로 복귀했습니다.`);
      handleResetToZero();
    } else {
      showToast(`[완료 상담 저장] "${primeCompany} (${allSymptoms})" 건이 상담 이력에 저장되고 첫 조회화면으로 복귀했습니다.`);
      handleResetToZero();
    }
  };

  // ── 어떤 상황에서든 현재 진행 상태에 맞춰 자동 저장 후 첫 조회화면 복귀 ─────────
  const handleSmartSaveAndReturn = () => {
    handleSaveSession(smartReturnDescriptor.targetMode);
  };

  return (
    <div
      style={{
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Pretendard', 'Segoe UI', Roboto, sans-serif",
        minHeight: 'calc(100vh - 48px)',
        backgroundColor: 'var(--bg-app)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
      }}
      onClick={() => setIsDropdownOpen(false)}
    >
      {/* 토스트 알림 */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: 60,
            right: 24,
            zIndex: 9999,
            background: '#0f172a',
            color: '#ffffff',
            borderRadius: 8,
            padding: '10px 18px',
            fontSize: 14,
            fontWeight: 700,
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            border: '1px solid #334155'
          }}
        >
          {toast}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════
          [STAGE 0] ZERO-STATE: 구글 검색 엔진 스타일 미니멀 시작 화면
          (아무 정보도 선택되지 않았을 때 화면 정중앙에 검색창 하나만 노출)
      ═════════════════════════════════════════════════════════════════════════ */}
      {isZeroState ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 24px 100px'
          }}
        >
          {/* 중앙 로고 */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 28 }}>
            <img
              src="/SPACE_logo.png"
              alt="SPACE 공식 로고"
              data-uia="v3-zero-hero-logo"
              style={{ height: 40, width: 'auto', objectFit: 'contain', display: 'block' }}
            />
          </div>

          {/* 구글 스타일 중앙 옴니 검색창 */}
          <div
            style={{ width: '100%', maxWidth: 740, position: 'relative' }}
            onClick={e => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: '#ffffff',
                border: isDropdownOpen ? '2px solid #2563eb' : '1.5px solid #cbd5e1',
                borderRadius: 28,
                padding: '8px 10px 8px 22px',
                boxShadow: isDropdownOpen
                  ? '0 10px 30px rgba(37, 99, 235, 0.14)'
                  : '0 4px 18px rgba(15, 23, 42, 0.06)',
                transition: 'all 0.15s ease'
              }}
            >
              <Search size={20} color="#2563eb" style={{ flexShrink: 0, marginRight: 12 }} />
              <input
                ref={omniInputRef}
                type="text"
                data-uia="omni-search-input"
                value={omniQuery}
                onFocus={() => setIsDropdownOpen(true)}
                onChange={e => {
                  setOmniQuery(e.target.value);
                  setIsDropdownOpen(true);
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleExecuteOmni();
                  }
                }}
                placeholder="전화번호(3456), 고객사(반포자이), 모델(J600T), 증상(잔수, 충전불가, E01) 통합 입력..."
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  fontSize: 16,
                  fontWeight: 600,
                  color: '#0f172a',
                  background: 'transparent'
                }}
                autoFocus
              />
              {omniQuery && (
                <button
                  type="button"
                  onClick={() => setOmniQuery('')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: '4px 8px'
                  }}
                >
                  <X size={17} />
                </button>
              )}
              <button
                type="button"
                data-uia="omni-search-submit"
                onClick={() => handleExecuteOmni()}
                style={{
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 20,
                  padding: '9px 20px',
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
              >
                진단 전개
              </button>
            </div>

            {/* 실시간 통합 자동완성 드롭다운 */}
            {isDropdownOpen && omniQuery.trim().length > 0 && (
              <OmniSuggestDropdown
                parsed={parsedOmni}
                query={omniQuery}
                onExecuteComposite={() => handleExecuteOmni()}
                onSelectCustomer={c => {
                  applyCustomer(c);
                  setOmniQuery('');
                  setIsDropdownOpen(false);
                  showToast(`[${c.name}] 고객 및 보유장비(${c.assetModel}) 로드 완료`);
                }}
                onSelectModel={m => {
                  setSelectedModel(m);
                  setOmniQuery('');
                  setIsDropdownOpen(false);
                  showToast(`장비 모델 [${m}] 선택 완료`);
                }}
                onSelectSymptom={(preset, errCode) => {
                  if (!selectedModel) setSelectedModel('J600T');
                  activateSymptomPreset(preset, effectiveModel, errCode);
                  setOmniQuery('');
                  setIsDropdownOpen(false);
                }}
              />
            )}
          </div>

          {/* 구글 검색창 하단 스타일: 원클릭 복합 검색 예시 칩 */}
          <div
            style={{
              marginTop: 22,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
              justifyContent: 'center'
            }}
          >
            <span style={{ fontSize: 13.5, fontWeight: 700, color: '#64748b', whiteSpace: 'nowrap' }}>
              복합 검색 예시:
            </span>
            {[
              { label: '반포자이 잔수', query: '반포자이 잔수' },
              { label: '3456 J600T 충전불가', query: '3456 J600T 충전불가' },
              { label: '래미안 J800 E01', query: '래미안 J800 E01' },
              { label: '도곡렉슬 S7 브러시', query: '도곡렉슬 S7 브러시' }
            ].map(sample => (
              <button
                key={sample.query}
                type="button"
                data-uia={`sample-chip-${sample.query}`}
                onClick={() => handleExecuteOmni(sample.query)}
                style={{
                  background: '#ece7de',
                  border: '1px solid #dcd5c9',
                  borderRadius: 16,
                  padding: '5px 13px',
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: '#334155',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                "{sample.label}"
              </button>
            ))}
          </div>

          {/* 하단 보조 진입점 (대기열 / 이력 — 상단 전역 '상황별 수칙' 버튼과 중복 제거) */}
          <div style={{ marginTop: 36, display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              onClick={() => setShowPendingModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 14px',
                borderRadius: 8,
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                fontSize: 13.5,
                fontWeight: 700,
                color: '#334155',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              <Clock size={14} color="#d97706" />
              <span>진행 대기열 ({pendingSessions.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setShowHistoryModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 14px',
                borderRadius: 8,
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                fontSize: 13.5,
                fontWeight: 700,
                color: '#334155',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              <History size={14} color="#64748b" />
              <span>상담 이력 ({historyRecords.length})</span>
            </button>
          </div>
        </div>
      ) : (
        /* ═════════════════════════════════════════════════════════════════════════
            [STAGE 1 ~ 3] 점진적 전개 화면 (Progressive Disclosure Workspace)
            상단에 동일한 옴니 검색창이 도킹되고, 인식된 정보만 화면 빈자리에 생성됨
        ═════════════════════════════════════════════════════════════════════════ */
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* 1. 상단 도킹 옴니 검색 바 (동일한 검색줄에서 추가 검색/전환 수행) */}
          <div
            style={{
              background: '#ece7de',
              borderBottom: '1px solid #dcd5c9',
              padding: '8px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              flexShrink: 0
            }}
            onClick={e => e.stopPropagation()}
          >
            <div
              onClick={() => handleResetToZero()}
              title="첫 조회화면으로 복귀"
              style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, whiteSpace: 'nowrap', cursor: 'pointer' }}
            >
              <img
                src="/SPACE_logo.png"
                alt="SPACE"
                data-uia="v3-docked-logo"
                style={{ height: 17, width: 'auto', objectFit: 'contain', display: 'block' }}
              />
              <span style={{ fontWeight: 900, fontSize: 14.5, color: '#0f172a' }}>상담지원3</span>
            </div>

            {/* 도킹된 단일 옴니 검색창 */}
            <div style={{ position: 'relative', width: 460, flexShrink: 0 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: '#ffffff',
                  border: '1.5px solid #2563eb',
                  borderRadius: 20,
                  padding: '5px 8px 5px 14px'
                }}
              >
                <Search size={15} color="#2563eb" style={{ marginRight: 8, flexShrink: 0 }} />
                <input
                  ref={omniInputRef}
                  type="text"
                  data-uia="omni-search-input-docked"
                  value={omniQuery}
                  onFocus={() => setIsDropdownOpen(true)}
                  onChange={e => {
                    setOmniQuery(e.target.value);
                    setIsDropdownOpen(true);
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleExecuteOmni();
                    }
                  }}
                  placeholder="추가 증상, 에러코드, 모델명, 고객 전화번호를 이어서 입력..."
                  style={{
                    flex: 1,
                    border: 'none',
                    outline: 'none',
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: '#0f172a',
                    background: 'transparent'
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleExecuteOmni()}
                  style={{
                    background: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 14,
                    padding: '4px 12px',
                    fontSize: 13.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  추가/변경
                </button>
              </div>

              {isDropdownOpen && omniQuery.trim().length > 0 && (
                <OmniSuggestDropdown
                  parsed={parsedOmni}
                  query={omniQuery}
                  onExecuteComposite={() => handleExecuteOmni()}
                  onSelectCustomer={c => {
                    applyCustomer(c);
                    setOmniQuery('');
                    setIsDropdownOpen(false);
                  }}
                  onSelectModel={m => {
                    setSelectedModel(m);
                    setOmniQuery('');
                    setIsDropdownOpen(false);
                  }}
                  onSelectSymptom={(preset, errCode) => {
                    activateSymptomPreset(preset, effectiveModel, errCode);
                    setOmniQuery('');
                    setIsDropdownOpen(false);
                  }}
                />
              )}
            </div>

            {/* 현재 인식된 활성 컨텍스트 태그 (클릭하여 개별 해제 가능) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, overflowX: 'auto' }}>
              {selectedCustomer && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    background: '#dbeafe',
                    color: '#1e40af',
                    border: '1px solid #93c5fd',
                    borderRadius: 14,
                    padding: '3px 10px',
                    fontSize: 13.5,
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    flexShrink: 0
                  }}
                >
                  <Building2 size={13} />
                  <span>{selectedCustomer.name}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedCustomer(null)}
                    style={{ background: 'none', border: 'none', color: '#1e40af', cursor: 'pointer', padding: 0 }}
                  >
                    <X size={13} />
                  </button>
                </span>
              )}

              {(selectedModel || selectedCustomer?.assetModel) && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    background: '#0f172a',
                    color: '#ffffff',
                    borderRadius: 14,
                    padding: '3px 10px',
                    fontSize: 13.5,
                    fontWeight: 800,
                    whiteSpace: 'nowrap',
                    flexShrink: 0
                  }}
                >
                  <Cpu size={13} />
                  <span>모델: {effectiveModel}</span>
                </span>
              )}

              {sessionList.map(s => (
                <span
                  key={s.key}
                  onClick={() => setActiveSymptomKey(s.key)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    background: activeSymptomKey === s.key ? '#059669' : '#ffffff',
                    color: activeSymptomKey === s.key ? '#ffffff' : '#334155',
                    border: '1px solid #cbd5e1',
                    borderRadius: 14,
                    padding: '3px 10px',
                    fontSize: 13.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0
                  }}
                >
                  <Wrench size={12} />
                  <span>{s.title}</span>
                </span>
              ))}
            </div>

            {/* 우측 최소 유틸리티 (어떤 상황에서든 현재 상태에 맞춰 자동 저장 후 첫 조회화면 복귀 지원) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => setShowPendingModal(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '5px 10px',
                  borderRadius: 6,
                  background: '#f5f2eb',
                  border: '1px solid #dcd5c9',
                  fontSize: 13.5,
                  fontWeight: 700,
                  color: '#334155',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                <Clock size={13} color="#d97706" />
                <span>진행중 ({pendingSessions.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setShowHistoryModal(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '5px 10px',
                  borderRadius: 6,
                  background: '#f5f2eb',
                  border: '1px solid #dcd5c9',
                  fontSize: 13.5,
                  fontWeight: 700,
                  color: '#334155',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                <History size={13} color="#059669" />
                <span>완료이력 ({historyRecords.length})</span>
              </button>
              <button
                type="button"
                data-uia="btn-v3-smart-save-return"
                onClick={handleSmartSaveAndReturn}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 14px',
                  borderRadius: 6,
                  background: smartReturnDescriptor.color,
                  border: 'none',
                  fontSize: 13.5,
                  fontWeight: 800,
                  color: '#ffffff',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 2px 6px rgba(15, 23, 42, 0.14)'
                }}
              >
                <Check size={14} />
                <span>{smartReturnDescriptor.badgeLabel}</span>
              </button>
              <button
                type="button"
                data-uia="btn-v3-reset"
                onClick={handleResetToZero}
                title="저장 없이 첫 화면으로 초기화"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '5px 10px',
                  borderRadius: 6,
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  fontSize: 13.5,
                  fontWeight: 700,
                  color: '#64748b',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                <RotateCcw size={13} />
                <span>초기화</span>
              </button>
            </div>
          </div>

          {/* 2. 점진적 본문 레이아웃 (좌측 컨텍스트 슬롯 + 우측 진단 워크스페이스 슬롯) */}
          {/* 2. 점진적 본문 레이아웃 (좌측 컨텍스트 슬롯 + 우측 진단 워크스페이스 슬롯) */}
          <CounselV3Workspace
            selectedCustomer={selectedCustomer}
            effectiveModel={effectiveModel}
            currentModelSpec={currentModelSpec}
            showModelSpec={showModelSpec}
            setShowModelSpec={setShowModelSpec}
            customerPhone={customerPhone}
            siteWorkerPhone={siteWorkerPhone}
            symptomPresets={symptomPresets}
            currentSession={currentSession}
            notes={notes}
            setNotes={setNotes}
            smartReturnDescriptor={smartReturnDescriptor}
            activateSymptomPreset={activateSymptomPreset}
            setSymptomSessions={setSymptomSessions}
            handleStepResolve={handleStepResolve}
            handleStepFail={handleStepFail}
            handleSaveSession={handleSaveSession}
            handleSmartSaveAndReturn={handleSmartSaveAndReturn}
            setShowSelfActionGuideModal={setShowSelfActionGuideModal}
            setShowPartsOrderModal={setShowPartsOrderModal}
            setShowEquipmentManualModal={setShowEquipmentManualModal}
            setShowDispatchPackageModal={setShowDispatchPackageModal}
          />
        </div>
      )}

      {/* ── 연동 모달군 (필요 시점에만 마운트) ── */}
      <Suspense fallback={null}>
        {showSelfActionGuideModal && (
          <SelfActionGuideModal
            equipmentModel={effectiveModel}
            customerName={selectedCustomer?.name || '반포자이 아파트 관리사무소'}
            manager={selectedCustomer?.manager || '박시설 시설과장'}
            phone={customerPhone || selectedCustomer?.phone || '010-9876-5432'}
            email={customerEmail || selectedCustomer?.managerEmail || 'facility@banpojai.co.kr'}
            siteCompany={selectedCustomer?.useCompany || '(주)클린에코 청소용역'}
            siteWorkerName={selectedCustomer?.siteWorkerName || '김순자 미화반장'}
            siteWorkerPhone={siteWorkerPhone || selectedCustomer?.siteWorkerPhone || '010-3456-7890'}
            serialNumber={selectedCustomer?.serialNumber || `${effectiveModel}-2024-0812`}
            symptomTitle={currentSession?.title || '바닥 잔수 과다'}
            symptomSteps={currentSession?.steps}
            onClose={() => setShowSelfActionGuideModal(false)}
            onOpenPartsQuotation={() => {
              setShowSelfActionGuideModal(false);
              setShowPartsOrderModal(true);
            }}
            onOpenDispatchPackage={() => {
              setShowSelfActionGuideModal(false);
              setShowDispatchPackageModal(true);
            }}
            onResolveDirect={() => {
              setShowSelfActionGuideModal(false);
              handleSaveSession('resolved');
            }}
            onToast={msg => showToast(msg, 3500)}
          />
        )}

        {showPartsOrderModal && (
          <PartsOrderQuotationModal
            equipmentModel={effectiveModel}
            serialNumber={selectedCustomer?.serialNumber || `${effectiveModel}-2024-0812`}
            customerName={selectedCustomer?.name || '반포자이 아파트 관리사무소'}
            manager={selectedCustomer?.manager || '박시설 시설과장'}
            phone={customerPhone || '010-9876-5432'}
            email={customerEmail || 'facility@banpojai.co.kr'}
            siteCompany={selectedCustomer?.useCompany || '(주)클린에코 청소용역'}
            siteWorkerName={selectedCustomer?.siteWorkerName || '김순자 미화반장'}
            siteWorkerPhone={siteWorkerPhone || '010-3456-7890'}
            symptoms={sessionList.length > 0 ? sessionList.map(s => s.title) : ['바닥 잔수 과다']}
            onClose={() => setShowPartsOrderModal(false)}
            onToast={msg => showToast(msg, 3500)}
          />
        )}

        {showEquipmentManualModal && (
          <EquipmentManualModal
            equipmentModel={effectiveModel}
            serialNumber={selectedCustomer?.serialNumber || `${effectiveModel}-2024-0812`}
            customerName={selectedCustomer?.name || '반포자이 아파트 관리사무소'}
            manager={selectedCustomer?.manager || '박시설 시설과장'}
            phone={customerPhone || selectedCustomer?.phone || '010-9876-5432'}
            email={customerEmail || selectedCustomer?.managerEmail || 'facility@banpojai.co.kr'}
            siteCompany={selectedCustomer?.useCompany || '(주)클린에코 청소용역'}
            siteWorkerName={selectedCustomer?.siteWorkerName || '김순자 미화반장'}
            siteWorkerPhone={siteWorkerPhone || selectedCustomer?.siteWorkerPhone || '010-3456-7890'}
            symptoms={sessionList.length > 0 ? sessionList.map(s => s.title) : ['장비 운용 및 점검']}
            onClose={() => setShowEquipmentManualModal(false)}
            onToast={msg => showToast(msg, 3500)}
          />
        )}

        {showDispatchPackageModal && (
          <DispatchDocPackageModal
            initialDoc1st={dispatchDoc1st || undefined}
            initialDoc2nd={dispatchDoc2nd || undefined}
            initialTab={dispatchModalTab}
            onClose={() => setShowDispatchPackageModal(false)}
            onSave={(d1, d2) => {
              setDispatchDoc1st(d1);
              setDispatchDoc2nd(d2);
              setShowDispatchPackageModal(false);
              handleResetToZero();
              showToast('AS 출장 접수 및 결재 문서 저장 완료 · 첫 조회화면으로 복귀하였습니다.', 3800);
            }}
            onToast={msg => showToast(msg, 3500)}
          />
        )}

      </Suspense>

      {/* 진행 대기열 모달 */}
      {showPendingModal && (
        <SimpleSessionListModal
          title={`진행 대기열 (${pendingSessions.length}건)`}
          records={pendingSessions}
          onClose={() => setShowPendingModal(false)}
          onSelect={rec => {
            setCurrentSessionId(rec.id);
            setSelectedCustomer({
              id: `cust_${rec.customerName}`,
              name: rec.customerName,
              manager: rec.manager,
              phone: rec.phone,
              managerEmail: rec.managerEmail,
              useCompany: rec.useCompany,
              siteWorkerName: rec.siteWorkerName,
              siteWorkerPhone: rec.siteWorkerPhone,
              assetModel: rec.modelName,
              serialNumber: rec.serialNumber,
              salesType: '렌탈(임대)',
              historyTimeline: []
            });
            setSelectedModel(rec.modelName);
            setCustomerPhone(rec.phone);
            setSiteWorkerPhone(rec.siteWorkerPhone || rec.phone);
            setSymptomSessions(rec.symptomSessions || {});
            setActiveSymptomKey(rec.activeSymptomKey);
            setShowPendingModal(false);
            showToast(`[${rec.customerName}] 대기 상담을 복원하였습니다.`);
          }}
        />
      )}

      {/* 상담 이력 모달 */}
      {showHistoryModal && (
        <SimpleSessionListModal
          title={`상담 이력 (${historyRecords.length}건)`}
          records={historyRecords}
          onClose={() => setShowHistoryModal(false)}
          onSelect={rec => {
            setSelectedCustomer({
              id: `cust_${rec.customerName}`,
              name: rec.customerName,
              manager: rec.manager,
              phone: rec.phone,
              managerEmail: rec.managerEmail,
              useCompany: rec.useCompany,
              siteWorkerName: rec.siteWorkerName,
              siteWorkerPhone: rec.siteWorkerPhone,
              assetModel: rec.modelName,
              serialNumber: rec.serialNumber,
              salesType: '렌탈(임대)',
              historyTimeline: []
            });
            setSelectedModel(rec.modelName);
            setSymptomSessions(rec.symptomSessions || {});
            setActiveSymptomKey(rec.activeSymptomKey);
            setShowHistoryModal(false);
          }}
        />
      )}
    </div>
  );
}
