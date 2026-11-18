import { lazy, Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { DEFAULT_MODEL_SPECS, type ModelSpec } from './modelSpecsData';
import { DEFAULT_SYMPTOM_PRESETS } from './manualKnowledgeData';
import { getModelErrorCodes } from './modelErrorCodesData';
import type {
  DispatchDoc1st,
  DispatchDoc2nd,
} from './dispatchDocTypes';
import type { SitePhotoSketchEvidence } from './SelfActionGuideModal';
import { applyContextualCorrection } from './contextCorrector';
import { extractCustomerAndAddressEntities } from './keywordExtractors';
import {
  DEFAULT_B2B_CUSTOMERS,
  matchesChosungOrText,
  type Customer,
  type DiagnosticStep,
  type CounselStatus,
  type OfficialErrorCode,
  type SymptomSession,
  type ConsultSessionRecord,
  type SymptomPreset,
  type KbResult,
} from './counselShared';
import {
  completeAndSaveV2Session,
  deletePendingV2Session,
  fetchMergedHistoryRecords,
  fetchMergedPendingSessions,
  savePendingV2Session,
} from './counselV2Persistence';
import { CounselV2LeftPane, CounselV2SubToolbar } from './CounselV2LeftPane';
import { CounselV2RightStudio } from './CounselV2RightStudio';

const DispatchDocPackageModal = lazy(() => import('./DispatchDocPackageModal'));
const PartsOrderQuotationModal = lazy(() => import('./PartsOrderQuotationModal'));
const SelfActionGuideModal = lazy(() => import('./SelfActionGuideModal'));
const EquipmentManualModal = lazy(() => import('./EquipmentManualModal'));
const CounselV2SessionDialogs = lazy(() => import('./CounselV2SessionDialogs'));

const API = 'http://127.0.0.1:8000/api/v1';
export default function CounselAssistV2() {
  // ① 고객 및 장비 선택
  const [searchText, setSearchText]                 = useState('');
  const [searchResults, setSearchResults]           = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer]     = useState<Customer | null>(null);
  const [customerPhone, setCustomerPhone]           = useState('');
  const [siteWorkerPhone, setSiteWorkerPhone]       = useState('');
  const [customerEmail, setCustomerEmail]           = useState('');
  const [selectedModel, setSelectedModel]           = useState<string>('J600T');
  const [isSearching, setIsSearching]               = useState(false);
  const [dropdownOpen, setDropdownOpen]             = useState(false);

  // ①-3 원청 결재 연계 2단계 AS 출장 행정 패키지 상태
  const [showDispatchPackageModal, setShowDispatchPackageModal] = useState(false);
  const [dispatchDoc1st, setDispatchDoc1st]         = useState<Partial<DispatchDoc1st> | null>(null);
  const [dispatchDoc2nd, setDispatchDoc2nd]         = useState<Partial<DispatchDoc2nd> | null>(null);
  const [dispatchModalTab, setDispatchModalTab]     = useState<'doc1' | 'doc2'>('doc1');

  // ①-4 현장 자가조치 모바일 가이드 & 소모품 견적서 & 매뉴얼 첨부 발송 & 사진 순서 관리 상태
  const [showSelfActionGuideModal, setShowSelfActionGuideModal] = useState(false);
  const [showPartsOrderModal, setShowPartsOrderModal]           = useState(false);
  const [showEquipmentManualModal, setShowEquipmentManualModal] = useState(false);
  const [photoEvidence, setPhotoEvidence]                       = useState<SitePhotoSketchEvidence | null>(null);

  // ①-2 모델 하드웨어 제원
  const [currentModelSpec, setCurrentModelSpec]     = useState<ModelSpec | null>(() => DEFAULT_MODEL_SPECS['J600T'] || null);
  const [showModelSpec, setShowModelSpec]           = useState(false);

  // ② 증상 목록 및 필터링
  const [symptomPresets, setSymptomPresets]         = useState<SymptomPreset[]>(DEFAULT_SYMPTOM_PRESETS as any);
  const [selectedCategory, setSelectedCategory]     = useState<string>('전체');
  const [symptomSearchQuery, setSymptomSearchQuery] = useState('');
  const [errorCodeFilter, setErrorCodeFilter]       = useState('');
  const [customSymptom, setCustomSymptom]           = useState('');
  const [showCustomInput, setShowCustomInput]       = useState(false);

  // ③ 복수 증상 진단 세션 맵 (Multi-Symptom Session Management)
  // 키: 증상 title | 값: 독립적인 진단 트리 상태
  const [symptomSessions, setSymptomSessions]       = useState<Record<string, SymptomSession>>({});
  const [activeSymptomKey, setActiveSymptomKey]     = useState<string | null>(null);

  const [isLoadingPlan, setIsLoadingPlan]           = useState(false);
  const [isLoadingKb, setIsLoadingKb]               = useState(false);
  const [kbResults, setKbResults]                   = useState<KbResult[]>([]);
  const [, setSearchMode]                           = useState<string>('vector');
  const [isHistoryExpanded, setIsHistoryExpanded]   = useState(false);

  // ④ 저장 및 상담원 정보
  const [counselorName, setCounselorName]           = useState('');
  const [notes, setNotes]                           = useState('');
  const [isSaving, setIsSaving]                     = useState(false);
  const [toast, setToast]                           = useState<string | null>(null);

  // ⑤ 상담 라이프사이클 및 대기열/이력 추적 상태
  const [currentSessionId, setCurrentSessionId]     = useState<string | null>(null);
  const [pendingSessions, setPendingSessions]       = useState<ConsultSessionRecord[]>([]);
  const [historyRecords, setHistoryRecords]         = useState<ConsultSessionRecord[]>([]);
  const [showPendingModal, setShowPendingModal]     = useState(false);
  const [showHistoryModal, setShowHistoryModal]     = useState(false);
  const [pendingSearchQuery, setPendingSearchQuery] = useState('');
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'all' | 'in_progress' | 'resolved' | 'visit'>('all');
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<ConsultSessionRecord | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);


  const showToast = (msg: string, ms = 2500) => {
    setToast(msg);
    setTimeout(() => setToast(null), ms);
  };

  // 현재 열려 있는 활성 증상 세션 객체
  const currentSession: SymptomSession | null = activeSymptomKey ? (symptomSessions[activeSymptomKey] ?? null) : null;
  const activeStep: DiagnosticStep | null = currentSession ? (currentSession.steps[currentSession.activeStepIndex] ?? null) : null;
  const sessionList: SymptomSession[] = Object.values(symptomSessions);

  // ── 전체 통화 세션의 종합 상태 산출 ──────────────────────────────────────────
  // 원칙: 등록된 증상 중 단 1개라도 visit_required면 전체는 'visit_required' (출장 필수)
  // 모든 증상이 resolved_by_call로 해결되면 전체는 'resolved_by_call' (직접조치 종결)
  const getOverallStatus = (): CounselStatus => {
    if (sessionList.length === 0) return 'in_progress';
    if (sessionList.some(s => s.status === 'visit_required')) return 'visit_required';
    if (sessionList.every(s => s.status === 'resolved_by_call')) return 'resolved_by_call';
    return 'in_progress';
  };
  const overallStatus = getOverallStatus();

  // ── 장비 모델별 빈출 질문/증상 & 제원/가이드 로드 ──────────────────────────────────────────
  const fetchModelSymptoms = useCallback(async (modelName: string) => {
    if (DEFAULT_MODEL_SPECS[modelName]) {
      setCurrentModelSpec(DEFAULT_MODEL_SPECS[modelName]);
    }
    const currentModelCodes = getModelErrorCodes(modelName);

    // 열려있는 에러코드 진단 세션들의 official_error_codes를 새 모델 코드로 즉시 동기화
    setSymptomSessions(prev => {
      let modified = false;
      const next = { ...prev };
      for (const [k, session] of Object.entries(next)) {
        if (session.official_error_codes && session.official_error_codes.length > 0) {
          const isSelectedStillValid = currentModelCodes.some(c => c.code === session.selectedErrorCode?.code);
          next[k] = {
            ...session,
            official_error_codes: currentModelCodes,
            selectedErrorCode: isSelectedStillValid ? session.selectedErrorCode : null
          };
          modified = true;
        }
      }
      return modified ? next : prev;
    });

    try {
      const res = await fetch(`${API}/counsel/model-symptoms?model=${encodeURIComponent(modelName)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.symptoms && data.symptoms.length > 0) {
          const mappedSymptoms = data.symptoms.map((s: any) => {
            if (s.id === 'EXT_ERROR_CODE' || s.category === '에러코드') {
              return { ...s, official_error_codes: data.error_codes || currentModelCodes };
            }
            return s;
          });
          setSymptomPresets(mappedSymptoms);
        }
        if (data.model_spec) {
          setCurrentModelSpec(data.model_spec);
        }
      } else {
        // 백엔드 비정상 응답 시 프론트엔드 프리셋 갱신
        setSymptomPresets(prev => prev.map(s => {
          if (s.id === 'EXT_ERROR_CODE' || s.category === '에러코드') {
            return { ...s, official_error_codes: currentModelCodes };
          }
          return s;
        }));
      }
    } catch {
      // 오프라인/에러 시 기본 목록 및 모델별 에러코드 유지
      setSymptomPresets(prev => prev.map(s => {
        if (s.id === 'EXT_ERROR_CODE' || s.category === '에러코드') {
          return { ...s, official_error_codes: currentModelCodes };
        }
        return s;
      }));
    }
  }, []);

  useEffect(() => {
    fetchModelSymptoms(selectedModel);
  }, [selectedModel, fetchModelSymptoms]);

  // ── 고객 검색 (한글 초성 + 구어체/전화번호/도로명·상세주소 추출 & DB 2,345건 통합 매칭) ──
  const handleCustomerSearch = useCallback(async (q: string) => {
    setSearchText(q);
    if (q.trim().length < 1) { setSearchResults([]); setDropdownOpen(false); return; }
    setIsSearching(true);
    setDropdownOpen(true);

    const query = q.trim();
    const correctedQuery = applyContextualCorrection(query).correctedText || query;
    const extracted = extractCustomerAndAddressEntities(correctedQuery);
    const queryDigits = (extracted.phone || correctedQuery).replace(/\D/g, '');

    // 1. 로컬 B2B 프리셋에서 원청명, 관리자, 실사용처, 현장통화자, 도로명주소, 상세위치, 전화번호, 모델 초성 검색
    const localMatches = DEFAULT_B2B_CUSTOMERS.filter(c => {
      const searchTerms = [
        query,
        correctedQuery,
        extracted.customerName,
        extracted.managerName,
        extracted.roadOrLotAddress,
        extracted.addressDetail,
        extracted.useCompany
      ].filter((t): t is string => Boolean(t && t.trim()));

      for (const term of searchTerms) {
        if (matchesChosungOrText(c.name, term)) return true;
        if (matchesChosungOrText(c.manager, term)) return true;
        if (c.useCompany && matchesChosungOrText(c.useCompany, term)) return true;
        if (c.siteWorkerName && matchesChosungOrText(c.siteWorkerName, term)) return true;
        if (c.address && matchesChosungOrText(c.address, term)) return true;
        if (c.addressDetail && matchesChosungOrText(c.addressDetail, term)) return true;
        if (matchesChosungOrText(c.assetModel, term)) return true;
      }
      if (queryDigits.length >= 3) {
        if (c.phone && c.phone.replace(/\D/g, '').includes(queryDigits)) return true;
        if (c.siteWorkerPhone && c.siteWorkerPhone.replace(/\D/g, '').includes(queryDigits)) return true;
      }
      return false;
    });

    // 자연어 문장에서 신규 고객/담당자/주소/연락처가 추출되었으나 로컬 프리셋에 없는 경우 동적 프로필 후보 생성
    if (
      localMatches.length === 0 &&
      (extracted.customerName || extracted.managerName || extracted.phone || extracted.roadOrLotAddress || extracted.addressDetail)
    ) {
      localMatches.unshift({
        id: `extracted-${Date.now()}`,
        name: extracted.customerName || '신규 현장 고객 (자동 추출)',
        manager: extracted.managerName || '현장 담당자',
        phone: extracted.phone || '',
        address: extracted.roadOrLotAddress || '',
        addressDetail: extracted.addressDetail || '',
        useCompany: extracted.useCompany || '',
        assetModel: selectedModel || 'J600T',
        serialNumber: `${selectedModel || 'J600T'}-AUTO`,
        salesType: '렌탈(임대)',
        historyTimeline: []
      });
    }

    try {
      const [schedRes, lookupRes] = await Promise.allSettled([
        fetch(`${API}/schedule/customers?q=${encodeURIComponent(correctedQuery)}&limit=10`),
        fetch(`${API}/counsel/customer-lookup?q=${encodeURIComponent(correctedQuery)}&limit=10`)
      ]);
      const combined = [...localMatches];

      if (lookupRes.status === 'fulfilled' && lookupRes.value.ok) {
        const lookupData = await lookupRes.value.json();
        const lookupItems = Array.isArray(lookupData.items) ? lookupData.items : [];
        lookupItems.forEach((item: any) => {
          if (item.name && !combined.some(c => c.name === item.name && c.manager === item.manager)) {
            combined.push({
              id: item.id || `db-${combined.length}`,
              name: item.name,
              manager: item.manager || '현장 담당자',
              phone: item.phone || '',
              address: item.address || '',
              addressDetail: item.addressDetail || '',
              useCompany: item.useCompany || '',
              assetModel: item.assetModel || selectedModel || 'J600T',
              serialNumber: item.serialNumber || `${item.assetModel || 'J600T'}-DB`,
              salesType: item.salesType || '렌탈(임대)',
              historyTimeline: item.historyTimeline || []
            });
          }
        });
      }

      if (schedRes.status === 'fulfilled' && schedRes.value.ok) {
        const data = await schedRes.value.json();
        const items = Array.isArray(data) ? data : data.items ?? [];
        items.forEach((item: any) => {
          if (item.name && !combined.some(c => c.name === item.name)) {
            combined.push(item);
          }
        });
      }
      setSearchResults(combined);
    } catch {
      setSearchResults(localMatches);
    } finally {
      setIsSearching(false);
      setDropdownOpen(true);
    }
  }, [selectedModel]);

  const selectCustomer = (c: Customer) => {
    setSelectedCustomer(c);
    setSearchText(c.name);
    setCustomerPhone(c.phone || '');
    setSiteWorkerPhone(c.siteWorkerPhone || c.phone || '');
    setCustomerEmail(c.managerEmail || '');
    setDropdownOpen(false);
    if (c.assetModel) {
      setSelectedModel(c.assetModel);
      fetchModelSymptoms(c.assetModel);
    }
  };

  // ── 증상 선택 시: 기존 진행 기록 100% 보존 복원 or 신규 증상 세션 생성 ────────
  const handleSelectSymptom = (preset: SymptomPreset) => {
    const key = preset.title;

    // [핵심] 이미 진단 중인 증상인 경우: 과거 기록을 100% 보존한 채 활성 탭만 전환!
    if (symptomSessions[key]) {
      setActiveSymptomKey(key);
      showToast(`'${key}' 이전 진단 기록 복원 (STEP ${symptomSessions[key].activeStepIndex + 1})`);
      return;
    }

    // 신규 증상인 경우: 진단 단계 파싱 및 세션 등록
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
        step_no: s.step_no ?? (idx + 1),
        title: s.title ?? `조치 단계 ${idx + 1}`,
        method: s.method ?? s.title ?? '',
        criteria_normal: s.criteria_normal ?? '정상 상태 확인',
        criteria_fault: s.criteria_fault ?? '이상 지속',
        fault_action: s.fault_action ?? '다음 조치 진행',
        status: idx === 0 ? 'active' : 'pending'
      };
    });

    const isErrorCodeSymptom = preset.id === 'EXT_ERROR_CODE' || preset.category === '에러코드' || preset.title.includes('에러');
    const rawCodes = preset.official_error_codes || (preset as any).action_plan?.official_error_codes;
    const officialCodes = isErrorCodeSymptom
      ? getModelErrorCodes(selectedModel)
      : ((rawCodes && rawCodes.length > 0) ? rawCodes : getModelErrorCodes(selectedModel));

    const newSession: SymptomSession = {
      key,
      title: preset.title,
      category: preset.category || '기타',
      part_code: preset.action_plan?.part_code || preset.part_code || preset.tag || 'GENERAL',
      urgency: preset.action_plan?.urgency || preset.urgency || '보통',
      can_self_resolve: preset.action_plan?.can_self_resolve ?? true,
      call_script: preset.action_plan?.call_script || `고객님, ${preset.title} 증상은 단계별 기본 점검을 순서대로 안내해 드리겠습니다.`,
      steps: parsedSteps,
      activeStepIndex: 0,
      status: 'in_progress',
      historyLog: [`[증상 추가] ${preset.title}`],
      official_error_codes: officialCodes,
      selectedErrorCode: null
    };

    setSymptomSessions(prev => ({
      ...prev,
      [key]: newSession
    }));
    setActiveSymptomKey(key);

    // 과거 유사 사례 백그라운드 조회
    setIsLoadingKb(true);
    fetch(`${API}/counsel/kb-search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: preset.symptom,
        limit: 4,
        equipment_model: selectedModel !== '전체' ? selectedModel : undefined,
      }),
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          setKbResults(data.kb_results ?? []);
          setSearchMode(data.search_mode ?? 'vector');
        }
      })
      .catch(() => {})
      .finally(() => setIsLoadingKb(false));
  };

  // ── 특정 증상 세션 닫기/제거 ────────────────────────────────────────────────
  const handleCloseSession = (keyToClose: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSymptomSessions(prev => {
      const next = { ...prev };
      delete next[keyToClose];
      return next;
    });
    if (activeSymptomKey === keyToClose) {
      const remainingKeys = Object.keys(symptomSessions).filter(k => k !== keyToClose);
      setActiveSymptomKey(remainingKeys.length > 0 ? remainingKeys[0] : null);
    }
  };

  // ── 수동 입력 검색 ────────────────────────────────────────────────────────
  const handleCustomSearch = async () => {
    if (!customSymptom.trim()) return;
    const key = customSymptom.trim();

    if (symptomSessions[key]) {
      setActiveSymptomKey(key);
      showToast(`'${key}' 이전 진단 기록 복원`);
      return;
    }

    setIsLoadingPlan(true);
    try {
      const res = await fetch(`${API}/counsel/kb-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: key,
          limit: 4,
          equipment_model: selectedModel !== '전체' ? selectedModel : undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const plan = data.action_plan;
        const rawSteps = plan?.steps || ['기본 상태 점검', '부품 점검', '출동 접수'];
        const parsedSteps: DiagnosticStep[] = rawSteps.map((s: any, idx: number) => ({
          step_no: idx + 1,
          title: typeof s === 'string' ? s : (s.title || `조치 ${idx + 1}`),
          method: typeof s === 'string' ? s : (s.method || s.title || ''),
          criteria_normal: typeof s === 'string' ? '정상 작동' : (s.criteria_normal || '정상 판정'),
          criteria_fault: typeof s === 'string' ? '이상 지속' : (s.criteria_fault || '불량 판정'),
          fault_action: typeof s === 'string' ? '다음 단계 진행' : (s.fault_action || '다음 단계 진행'),
          status: idx === 0 ? 'active' : 'pending'
        }));

        const rawCodes = plan?.official_error_codes;
        const officialCodes = (rawCodes && rawCodes.length > 0) ? rawCodes : getModelErrorCodes(selectedModel);

        const newSession: SymptomSession = {
          key,
          title: key,
          category: '수동입력',
          part_code: plan?.part_code || 'GENERAL',
          urgency: plan?.urgency || '보통',
          can_self_resolve: plan?.can_self_resolve ?? true,
          call_script: plan?.call_script || `고객님, ${key} 관련 점검 사항을 안내해 드리겠습니다.`,
          steps: parsedSteps,
          activeStepIndex: 0,
          status: 'in_progress',
          historyLog: [`[수동 증상 추가] ${key}`],
          official_error_codes: officialCodes,
          selectedErrorCode: null
        };

        setSymptomSessions(prev => ({ ...prev, [key]: newSession }));
        setActiveSymptomKey(key);
        setKbResults(data.kb_results ?? []);
        setSearchMode(data.search_mode ?? 'vector');
      }
    } catch {
      showToast('진단 검색 실패');
    } finally {
      setIsLoadingPlan(false);
    }
  };

  // ── [인터랙티브 진단 머신 1] 특정 스텝 "정상/해결" 판정 (현재 세션에 영구 보존) ──
  const handleStepResolve = (stepIdx: number) => {
    if (!currentSession) return;
    const currentStep = currentSession.steps[stepIdx];

    const updatedSteps = currentSession.steps.map((st, i) => {
      if (i === stepIdx) return { ...st, status: 'resolved' as const };
      return st;
    });

    const logEntry = `STEP ${currentStep.step_no} (${currentStep.title}): 🟢 정상 해결`;

    const updatedSession: SymptomSession = {
      ...currentSession,
      steps: updatedSteps,
      status: 'resolved_by_call',
      historyLog: [...currentSession.historyLog, logEntry]
    };

    setSymptomSessions(prev => ({
      ...prev,
      [currentSession.key]: updatedSession
    }));

    showToast(`[${currentSession.title}] STEP ${currentStep.step_no} 정상 해결 판정 완료!`);
  };

  // ── [인터랙티브 진단 머신 2] 특정 스텝 "불량/미해결" 판정 (다음 단계 전이 or 출장) ─
  const handleStepFail = (stepIdx: number) => {
    if (!currentSession) return;
    const currentStep = currentSession.steps[stepIdx];
    const isLastStep = stepIdx >= currentSession.steps.length - 1;

    const updatedSteps = currentSession.steps.map((st, i) => {
      if (i === stepIdx) return { ...st, status: 'unresolved' as const };
      if (!isLastStep && i === stepIdx + 1) return { ...st, status: 'active' as const };
      return st;
    });

    const logEntry = `STEP ${currentStep.step_no} (${currentStep.title}): [불량 판정]`;
    const nextActiveIdx = isLastStep ? stepIdx : stepIdx + 1;
    const nextStatus: CounselStatus = isLastStep ? 'visit_required' : currentSession.status;

    const updatedSession: SymptomSession = {
      ...currentSession,
      steps: updatedSteps,
      activeStepIndex: nextActiveIdx,
      status: nextStatus,
      historyLog: isLastStep
        ? [...currentSession.historyLog, logEntry, '전수 조치 미해결 -> 정비사 출동 접수 필수']
        : [...currentSession.historyLog, logEntry]
    };

    setSymptomSessions(prev => ({
      ...prev,
      [currentSession.key]: updatedSession
    }));

    if (isLastStep) {
      showToast(`[${currentSession.title}] 전수 조치 미해결 -> AS 출장 접수 필요`, 3000);
    } else {
      showToast(`[${currentSession.title}] 다음 조치 (STEP ${stepIdx + 2})로 전이`);
    }
  };

  // ── 특정 스텝 직접 클릭 점프 (재검토/확인) ──────────────────────────────────
  const handleStepSelect = (stepIdx: number) => {
    if (!currentSession) return;
    const updatedSteps = currentSession.steps.map((st, i) => {
      if (i === stepIdx && st.status === 'pending') {
        return { ...st, status: 'active' as const };
      }
      return st;
    });

    const updatedSession: SymptomSession = {
      ...currentSession,
      steps: updatedSteps,
      activeStepIndex: stepIdx
    };

    setSymptomSessions(prev => ({
      ...prev,
      [currentSession.key]: updatedSession
    }));
  };

  // ── 제조사 공식 12대 에러 코드 퀵 칩 선택 및 직통 판정 핸들러 ──────────────
  const handleSelectErrorCode = (codeObj: OfficialErrorCode) => {
    if (!activeSymptomKey) return;
    setSymptomSessions(prev => {
      const s = prev[activeSymptomKey];
      if (!s) return prev;
      return {
        ...prev,
        [activeSymptomKey]: {
          ...s,
          selectedErrorCode: codeObj,
          call_script: codeObj.call_script,
          part_code: codeObj.part_code || s.part_code,
          historyLog: [...s.historyLog, `[에러코드 선택] ${codeObj.code} (${codeObj.name})`]
        }
      };
    });
    showToast(`에러 코드 [${codeObj.code}] ${codeObj.name} 적용됨`);
  };

  const handleInstantResolveByErrorCode = (codeObj: OfficialErrorCode) => {
    if (!activeSymptomKey) return;
    const isVisit = codeObj.resolution_type === 'VISIT_REQUIRED';
    setSymptomSessions(prev => {
      const s = prev[activeSymptomKey];
      if (!s) return prev;
      return {
        ...prev,
        [activeSymptomKey]: {
          ...s,
          selectedErrorCode: codeObj,
          status: isVisit ? 'visit_required' : 'resolved_by_call',
          part_code: codeObj.part_code || s.part_code,
          call_script: codeObj.call_script,
          historyLog: [
            ...s.historyLog,
            `[즉시 판정] 에러코드 ${codeObj.code} (${codeObj.name}) -> ${isVisit ? '[AS 출장 접수]' : '[전화 자가해결 종결]'}`
          ]
        }
      };
    });
    showToast(isVisit ? `[${codeObj.code}] AS 출장 접수 확정` : `[${codeObj.code}] 자가 해결 종결 완료`);
  };

  const handleClearSelectedErrorCode = () => {
    if (!activeSymptomKey) return;
    setSymptomSessions(prev => {
      const s = prev[activeSymptomKey];
      if (!s) return prev;
      return {
        ...prev,
        [activeSymptomKey]: {
          ...s,
          selectedErrorCode: null
        }
      };
    });
  };

  const formatRelativeTime = (dateStr?: string): string => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);
      if (diffSec < 60) return '방금 전';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}분 전`;
      const diffHour = Math.floor(diffMin / 60);
      if (diffHour < 24) return `${diffHour}시간 전`;
      const diffDay = Math.floor(diffHour / 24);
      if (diffDay < 7) return `${diffDay}일 전`;
      return `${d.getMonth() + 1}월 ${d.getDate()}일`;
    } catch {
      return dateStr;
    }
  };

  const loadPendingSessions = useCallback(async () => {
    const merged = await fetchMergedPendingSessions(API);
    setPendingSessions(merged);
  }, []);

  const loadHistoryRecords = useCallback(async () => {
    const merged = await fetchMergedHistoryRecords(API);
    setHistoryRecords(merged);
  }, []);

  useEffect(() => {
    loadPendingSessions();
    loadHistoryRecords();
  }, [loadPendingSessions, loadHistoryRecords]);

  // ── [상담 라이프사이클 1] 진행 중 (고객 확인 대기) 임시 저장 ──────────────
  const handleSavePending = async () => {
    if (sessionList.length === 0 && !customSymptom.trim() && !selectedCustomer) {
      showToast('저장할 상담 증상 또는 고객 정보가 없습니다.');
      return;
    }
    setIsSaving(true);
    try {
      const { updatedPending, updatedHistory } = await savePendingV2Session({
        apiBase: API,
        currentSessionId,
        sessionList,
        currentSession,
        activeSymptomKey,
        symptomSessions,
        customSymptom,
        notes,
        selectedCustomer,
        searchText,
        customerPhone,
        siteWorkerPhone,
        selectedModel,
        counselorName,
        pendingSessions,
        historyRecords,
      });
      setPendingSessions(updatedPending);
      setHistoryRecords(updatedHistory);
      showToast('고객 확인 대기 상태로 저장되었습니다. [진행 상담 대기열]에서 언제든 이어할 수 있습니다.', 3500);
      handleReset();
    } catch {
      showToast('저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // ── [상담 라이프사이클 2] 대기 중 상담 복원 및 이어하기 ───────────────────────
  const handleResumeSession = (record: ConsultSessionRecord) => {
    setCurrentSessionId(record.id);
    setSelectedCustomer({
      id: `cust_${record.customerName}`,
      name: record.customerName,
      manager: record.manager,
      phone: record.phone,
      managerEmail: record.managerEmail,
      useCompany: record.useCompany,
      siteWorkerName: record.siteWorkerName,
      siteWorkerPhone: record.siteWorkerPhone,
      assetModel: record.modelName,
      serialNumber: record.serialNumber,
      salesType: '렌탈',
      historyTimeline: []
    });
    setSearchText(record.customerName);
    setCustomerPhone(record.phone || '');
    setSiteWorkerPhone(record.siteWorkerPhone || record.phone || '');
    setCustomerEmail(record.managerEmail || '');
    setSelectedModel(record.modelName || 'J600T');
    fetchModelSymptoms(record.modelName || 'J600T');

    // 세션 및 조치 상태 복원
    const restoredSessions: Record<string, SymptomSession> = {};
    Object.entries(record.symptomSessions || {}).forEach(([k, s]) => {
      restoredSessions[k] = {
        ...s,
        historyLog: [...(s.historyLog || []), `[상담 재개] ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} 고객 재인입으로 상담 이어하기`]
      };
    });

    setSymptomSessions(restoredSessions);
    setActiveSymptomKey(record.activeSymptomKey || Object.keys(restoredSessions)[0] || null);
    setNotes(record.notes || '');

    setShowPendingModal(false);
    setShowHistoryModal(false);

    const symptomCount = Object.keys(restoredSessions).length;
    showToast(`[${record.customerName}] 이전 상담 복원 완료 (${record.currentStepSummary || `${symptomCount}건 증상 진행중`})`, 3000);
  };

  const handleDeletePendingSession = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const nextList = await deletePendingV2Session(API, pendingSessions, id);
    setPendingSessions(nextList);
    showToast('진행중 상담 대기열에서 삭제되었습니다.');
  };

  // ── 최종 조치 저장 (다수 증상 전체 통합 저장 / 완결) ─────────────────────────
  const handleSave = async (isVisit: boolean) => {
    if (sessionList.length === 0 && !customSymptom.trim()) {
      showToast('진단된 증상 또는 조치 내용이 없습니다.');
      return;
    }
    setIsSaving(true);
    try {
      const { doc1Obj, doc2Obj, updatedPending, updatedHistory } = await completeAndSaveV2Session({
        apiBase: API,
        isVisit,
        currentSessionId,
        sessionList,
        activeSymptomKey,
        symptomSessions,
        customSymptom,
        notes,
        selectedCustomer,
        searchText,
        customerPhone,
        siteWorkerPhone,
        customerEmail,
        selectedModel,
        counselorName,
        pendingSessions,
        historyRecords,
      });

      setPendingSessions(updatedPending);
      setHistoryRecords(updatedHistory);

      if (isVisit) {
        setDispatchDoc1st(doc1Obj);
        setDispatchDoc2nd(doc2Obj);
        setDispatchModalTab('doc1');
        setShowDispatchPackageModal(true);
        showToast('AS 출장 접수 완료 ➔ 원청 결재 연계 [기술점검 확인서]가 자동 생성되었습니다.', 4000);
      } else {
        showToast('복수 증상 직접조치 완료 저장');
        handleReset();
      }
    } catch {
      showToast('저장 실패. 서버를 확인하세요.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setCurrentSessionId(null);
    setSearchText('');
    setSelectedCustomer(null);
    setCustomerPhone('');
    setSiteWorkerPhone('');
    setCustomerEmail('');
    setCustomSymptom('');
    setSymptomSessions({});
    setActiveSymptomKey(null);
    setKbResults([]);
    setNotes('');
  };


  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Pretendard', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif", letterSpacing: '-0.015em', height: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-app)', overflow: 'hidden' }}>

      {/* 토스트 알림 */}
      {toast && (
        <div style={{ position: 'fixed', top: 16, right: 20, zIndex: 9999, background: '#0f172a', color: '#fff', borderRadius: 8, padding: '10px 18px', fontSize: 14, fontWeight: 600, boxShadow: '0 8px 24px rgba(0,0,0,0.18)', border: '1px solid #334155' }}>
          {toast}
        </div>
      )}

      {/* ── [최상단 서브 툴바] ── */}
      <CounselV2SubToolbar
        sessionList={sessionList}
        pendingSessions={pendingSessions}
        counselorName={counselorName}
        setCounselorName={setCounselorName}
        setShowPendingModal={setShowPendingModal}
        setShowHistoryModal={setShowHistoryModal}
        setShowEquipmentManualModal={setShowEquipmentManualModal}
        setShowSelfActionGuideModal={setShowSelfActionGuideModal}
        setShowPartsOrderModal={setShowPartsOrderModal}
        selectedCustomer={selectedCustomer}
        selectedModel={selectedModel}
        customerPhone={customerPhone}
        customerEmail={customerEmail}
        siteWorkerPhone={siteWorkerPhone}
        dispatchDoc1st={dispatchDoc1st}
        setDispatchDoc1st={setDispatchDoc1st}
        setDispatchModalTab={setDispatchModalTab}
        setShowDispatchPackageModal={setShowDispatchPackageModal}
        handleReset={handleReset}
      />

      {/* ── [메인 본문] 꽉 채우는 좌우 2단 분할 스튜디오 ── */}
      <div style={{ flex: 1, display: 'flex', gap: 8, padding: 8, overflow: 'hidden', boxSizing: 'border-box' }}>
        <CounselV2LeftPane
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
          currentModelSpec={currentModelSpec}
          showModelSpec={showModelSpec}
          setShowModelSpec={setShowModelSpec}
          searchRef={searchRef}
          searchText={searchText}
          setSearchText={setSearchText}
          searchResults={searchResults}
          setSearchResults={setSearchResults}
          selectedCustomer={selectedCustomer}
          setSelectedCustomer={setSelectedCustomer}
          customerPhone={customerPhone}
          setCustomerPhone={setCustomerPhone}
          siteWorkerPhone={siteWorkerPhone}
          setSiteWorkerPhone={setSiteWorkerPhone}
          customerEmail={customerEmail}
          setCustomerEmail={setCustomerEmail}
          dropdownOpen={dropdownOpen}
          setDropdownOpen={setDropdownOpen}
          isSearching={isSearching}
          handleCustomerSearch={handleCustomerSearch}
          selectCustomer={selectCustomer}
          pendingSessions={pendingSessions}
          currentSessionId={currentSessionId}
          handleResumeSession={handleResumeSession}
          formatRelativeTime={formatRelativeTime}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          symptomSearchQuery={symptomSearchQuery}
          setSymptomSearchQuery={setSymptomSearchQuery}
          symptomPresets={symptomPresets}
          symptomSessions={symptomSessions}
          activeSymptomKey={activeSymptomKey}
          isLoadingPlan={isLoadingPlan}
          handleSelectSymptom={handleSelectSymptom}
          showCustomInput={showCustomInput}
          setShowCustomInput={setShowCustomInput}
          customSymptom={customSymptom}
          setCustomSymptom={setCustomSymptom}
          handleCustomSearch={handleCustomSearch}
        />

        <CounselV2RightStudio
          sessionList={sessionList}
          isLoadingPlan={isLoadingPlan}
          selectedModel={selectedModel}
          selectedCustomer={selectedCustomer}
          activeSymptomKey={activeSymptomKey}
          setActiveSymptomKey={setActiveSymptomKey}
          handleCloseSession={handleCloseSession}
          currentSession={currentSession}
          activeStep={activeStep}
          errorCodeFilter={errorCodeFilter}
          setErrorCodeFilter={setErrorCodeFilter}
          handleSelectErrorCode={handleSelectErrorCode}
          handleInstantResolveByErrorCode={handleInstantResolveByErrorCode}
          handleClearSelectedErrorCode={handleClearSelectedErrorCode}
          handleStepSelect={handleStepSelect}
          handleStepResolve={handleStepResolve}
          handleStepFail={handleStepFail}
          isLoadingKb={isLoadingKb}
          kbResults={kbResults}
          isHistoryExpanded={isHistoryExpanded}
          setIsHistoryExpanded={setIsHistoryExpanded}
          overallStatus={overallStatus}
          photoEvidence={photoEvidence}
          notes={notes}
          setNotes={setNotes}
          customSymptom={customSymptom}
          isSaving={isSaving}
          handleSavePending={handleSavePending}
          handleSave={handleSave}
          setShowSelfActionGuideModal={setShowSelfActionGuideModal}
          setShowPartsOrderModal={setShowPartsOrderModal}
          setShowEquipmentManualModal={setShowEquipmentManualModal}
        />
      </div>

      {(showPendingModal || showHistoryModal) && (
        <Suspense fallback={null}>
          <CounselV2SessionDialogs
            showPendingModal={showPendingModal}
            setShowPendingModal={setShowPendingModal}
            pendingSearchQuery={pendingSearchQuery}
            setPendingSearchQuery={setPendingSearchQuery}
            pendingSessions={pendingSessions}
            handleResumeSession={handleResumeSession}
            handleDeletePendingSession={handleDeletePendingSession}
            showHistoryModal={showHistoryModal}
            setShowHistoryModal={setShowHistoryModal}
            historySearchQuery={historySearchQuery}
            setHistorySearchQuery={setHistorySearchQuery}
            historyStatusFilter={historyStatusFilter}
            setHistoryStatusFilter={setHistoryStatusFilter}
            historyRecords={historyRecords}
            selectedHistoryItem={selectedHistoryItem}
            setSelectedHistoryItem={setSelectedHistoryItem}
            formatRelativeTime={formatRelativeTime}
            setDispatchDoc1st={setDispatchDoc1st}
            setDispatchDoc2nd={setDispatchDoc2nd}
            setDispatchModalTab={setDispatchModalTab}
            setShowDispatchPackageModal={setShowDispatchPackageModal}
          />
        </Suspense>
      )}

      <Suspense fallback={null}>
        {/* ── [모달 3: 원청 결재 연계 2단계 AS 출장 행정 패키지] ── */}
        {showDispatchPackageModal && (
          <DispatchDocPackageModal
            initialDoc1st={dispatchDoc1st || undefined}
            initialDoc2nd={dispatchDoc2nd || undefined}
            initialTab={dispatchModalTab}
            onClose={() => setShowDispatchPackageModal(false)}
            onSave={(d1, d2) => {
              setDispatchDoc1st(d1);
              setDispatchDoc2nd(d2);
              showToast('원청 결재 연계 문서 패키지가 성공적으로 저장되었습니다.');
            }}
            onToast={msg => showToast(msg, 3500)}
          />
        )}

        {/* ── [모달 4: 현장 자가조치 모바일 가이드 패키지 (사진·동영상·스케치 접수)] ── */}
        {showSelfActionGuideModal && (
          <SelfActionGuideModal
            equipmentModel={selectedModel}
            customerName={selectedCustomer?.name || '반포자이 아파트 관리사무소'}
            manager={selectedCustomer?.manager || '박시설 시설과장'}
            phone={customerPhone || selectedCustomer?.phone || '010-9876-5432'}
            email={customerEmail.trim() || selectedCustomer?.managerEmail || 'facility@banpojai.co.kr'}
            siteCompany={selectedCustomer?.useCompany || '(주)클린에코 미화용역'}
            siteWorkerName={selectedCustomer?.siteWorkerName || '김순자 미화반장'}
            siteWorkerPhone={siteWorkerPhone || selectedCustomer?.siteWorkerPhone || '010-3456-7890'}
            serialNumber={selectedCustomer?.serialNumber || `${selectedModel}-2024-0812`}
            symptomTitle={currentSession?.title || '바닥 잔수 과다 / 흡입 불량'}
            symptomSteps={currentSession?.steps}
            onClose={() => setShowSelfActionGuideModal(false)}
            onOpenPartsQuotation={(evidence) => {
              if (evidence) setPhotoEvidence(evidence);
              setShowSelfActionGuideModal(false);
              setShowPartsOrderModal(true);
            }}
            onOpenDispatchPackage={() => {
              setShowSelfActionGuideModal(false);
              setShowDispatchPackageModal(true);
            }}
            onResolveDirect={() => {
              setShowSelfActionGuideModal(false);
              handleSave(false);
            }}
            onToast={msg => showToast(msg, 3500)}
          />
        )}

        {/* ── [모달 5: 원청 결재 소모품/부품 견적 및 발주 관리 (분기 B)] ── */}
        {showPartsOrderModal && (
          <PartsOrderQuotationModal
            equipmentModel={selectedModel}
            customerName={selectedCustomer?.name || '반포자이 아파트 관리사무소'}
            manager={selectedCustomer?.manager || '박시설 시설과장'}
            phone={customerPhone || selectedCustomer?.phone || '010-9876-5432'}
            email={customerEmail.trim() || selectedCustomer?.managerEmail || 'facility@banpojai.co.kr'}
            siteCompany={selectedCustomer?.useCompany || '(주)클린에코 미화용역'}
            siteWorkerName={selectedCustomer?.siteWorkerName || '김순자 미화반장'}
            siteWorkerPhone={siteWorkerPhone || selectedCustomer?.siteWorkerPhone || '010-3456-7890'}
            serialNumber={selectedCustomer?.serialNumber || `${selectedModel}-2024-0812`}
            symptoms={sessionList.map(s => s.title).length ? sessionList.map(s => s.title) : ['잔수 흡입 불량 및 오수 유출']}
            onClose={() => setShowPartsOrderModal(false)}
            onToast={msg => showToast(msg, 3500)}
          />
        )}

        {/* ── [모달 5-2: 공식 제품 매뉴얼·카탈로그 PDF 첨부 발송 (space-dust.com 25종 DB 연동)] ── */}
        {showEquipmentManualModal && (
          <EquipmentManualModal
            equipmentModel={selectedModel}
            serialNumber={selectedCustomer?.serialNumber || `${selectedModel}-2024-0812`}
            customerName={selectedCustomer?.name || '반포자이 아파트 관리사무소'}
            manager={selectedCustomer?.manager || '박시설 시설과장'}
            phone={customerPhone || selectedCustomer?.phone || '010-9876-5432'}
            email={customerEmail.trim() || selectedCustomer?.managerEmail || 'facility@banpojai.co.kr'}
            siteCompany={selectedCustomer?.useCompany || '(주)클린에코 미화용역'}
            siteWorkerName={selectedCustomer?.siteWorkerName || '김순자 미화반장'}
            siteWorkerPhone={siteWorkerPhone || selectedCustomer?.siteWorkerPhone || '010-3456-7890'}
            symptoms={sessionList.map(s => s.title).length ? sessionList.map(s => s.title) : ['장비 운용 및 점검']}
            onClose={() => setShowEquipmentManualModal(false)}
            onToast={msg => showToast(msg, 3500)}
          />
        )}

      </Suspense>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input:focus { border-color: #2563eb !important; box-shadow: 0 0 0 2px rgba(37,99,235,0.15); }
        button:active { opacity: 0.85; }
      `}</style>
    </div>
  );
}

