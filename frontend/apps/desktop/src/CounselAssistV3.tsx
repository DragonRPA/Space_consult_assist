import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Search, Phone, Wrench, AlertTriangle,
  RotateCcw, Clock, History, FileText, BookOpen,
  Smartphone, Image as ImageIcon, Package, Building2,
  Cpu, X, Check, ArrowRight, ChevronDown, ChevronUp
} from 'lucide-react';
import {
  DEFAULT_MODEL_SPECS,
  DEFAULT_SPECIAL_GUIDES,
  DEFAULT_SYMPTOM_PRESETS,
  getModelErrorCodes,
  getModelErrorCodePanelTitle,
  type ModelSpec,
  type SpecialGuide
} from './manualKnowledgeData';
import {
  DEFAULT_B2B_CUSTOMERS,
  matchesChosungOrText,
  calculateSymptomMatchScore,
  type Customer,
  type DiagnosticStep,
  type OfficialErrorCode,
  type SymptomSession,
  type ConsultSessionRecord
} from './CounselAssistV2';
import {
  DispatchDocPackageModal,
  type DispatchDoc1st,
  type DispatchDoc2nd,
  type SelfActionEvidenceItem
} from './DispatchDocPackageModal';
import { PartsOrderQuotationModal } from './PartsOrderQuotationModal';
import { SelfActionGuideModal } from './SelfActionGuideModal';
import { SymptomPhotoManagerModal } from './SymptomPhotoManagerModal';

const API = 'http://127.0.0.1:8000/api/v1';
const PENDING_STORAGE_KEY = 'space_advisor_pending_sessions_v2';
const HISTORY_STORAGE_KEY = 'space_advisor_history_records_v2';

const EQUIPMENT_MODELS = ['J600T', 'J800', 'S7', 'S5', 'S1', 'S3', 'W12', 'W15', 'S2', 'S12', '쓰담'];

interface SymptomPreset {
  id?: string;
  title: string;
  symptom: string;
  tag?: string;
  urgency: string;
  category?: string;
  aliases?: string[];
  part_code?: string;
  official_error_codes?: OfficialErrorCode[];
  action_plan?: {
    keyword?: string;
    part_code?: string;
    urgency?: string;
    can_self_resolve?: boolean;
    call_script?: string;
    steps?: (DiagnosticStep | string | any)[];
  };
}

// ─── 단일 옴니 검색어 복합 파싱 결과 타입 ─────────────────────────────────────
interface OmniParsedResult {
  matchedCustomers: Customer[];
  matchedModels: string[];
  matchedErrorCodes: { codeObj: OfficialErrorCode; model: string }[];
  matchedSymptoms: { preset: SymptomPreset; score: number }[];
  compositePreview: {
    customer?: Customer;
    model?: string;
    symptom?: SymptomPreset;
    errorCode?: OfficialErrorCode;
    tokenCount: number;
  } | null;
}

export interface CounselAssistV3Props {
  initialOpenGuides?: boolean;
}

export default function CounselAssistV3({ initialOpenGuides }: CounselAssistV3Props = {}) {
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
  const [showGuidesModal, setShowGuidesModal] = useState<boolean>(Boolean(initialOpenGuides));
  const [selectedGuideId, setSelectedGuideId] = useState<string>('GUIDE_BRUSH_AUTO');
  const [specialGuides] = useState<SpecialGuide[]>(DEFAULT_SPECIAL_GUIDES);

  const [showSelfActionGuideModal, setShowSelfActionGuideModal] = useState<boolean>(false);
  const [showPhotoManagerModal, setShowPhotoManagerModal] = useState<boolean>(false);
  const [showPartsOrderModal, setShowPartsOrderModal] = useState<boolean>(false);
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
  const parsedOmni: OmniParsedResult = useMemo(() => {
    const raw = omniQuery.trim();
    if (!raw) {
      return {
        matchedCustomers: [],
        matchedModels: [],
        matchedErrorCodes: [],
        matchedSymptoms: [],
        compositePreview: null
      };
    }

    const tokens = raw.split(/\s+/).filter(Boolean);
    const matchedCustomersMap = new Map<string, Customer>();
    const matchedModelsSet = new Set<string>();
    const matchedErrorCodesList: { codeObj: OfficialErrorCode; model: string }[] = [];
    const symptomScoreMap = new Map<string, { preset: SymptomPreset; score: number }>();

    let bestCustomer: Customer | undefined;
    let bestModel: string | undefined;
    let bestErrorCode: OfficialErrorCode | undefined;
    let bestSymptom: SymptomPreset | undefined;
    let bestSymptomScore = 0;

    const currentCodes = getModelErrorCodes(effectiveModel);

    for (const token of tokens) {
      const tokenClean = token.toLowerCase();
      const tokenDigits = token.replace(/\D/g, '');

      // 1. 장비 모델명 매칭 (예: J600T, J800, S7, S5, S3, W12 등)
      for (const m of EQUIPMENT_MODELS) {
        const mLower = m.toLowerCase();
        if (
          mLower === tokenClean ||
          (tokenClean.length >= 2 && mLower.startsWith(tokenClean)) ||
          matchesChosungOrText(m, token)
        ) {
          matchedModelsSet.add(m);
          if (!bestModel) bestModel = m;
        }
      }

      // 2. 고객사 / 전화번호 / 담당자 매칭
      for (const c of DEFAULT_B2B_CUSTOMERS) {
        const phoneDigits = (c.phone || '').replace(/\D/g, '');
        const workerDigits = (c.siteWorkerPhone || '').replace(/\D/g, '');
        const isPhoneMatch =
          tokenDigits.length >= 3 &&
          (phoneDigits.includes(tokenDigits) || workerDigits.includes(tokenDigits));
        const isNameMatch =
          matchesChosungOrText(c.name, token) ||
          matchesChosungOrText(c.manager, token) ||
          (c.useCompany && matchesChosungOrText(c.useCompany, token)) ||
          (c.siteWorkerName && matchesChosungOrText(c.siteWorkerName, token));

        if (isPhoneMatch || isNameMatch) {
          matchedCustomersMap.set(c.id, c);
          if (!bestCustomer) bestCustomer = c;
        }
      }

      // 3. 계기판 에러코드 매칭 (E01, E02, EL, EH, 888 등)
      for (const ec of currentCodes) {
        if (
          ec.code.toLowerCase() === tokenClean ||
          (tokenClean.length >= 2 && ec.code.toLowerCase().includes(tokenClean)) ||
          matchesChosungOrText(ec.name, token)
        ) {
          if (!matchedErrorCodesList.some(x => x.codeObj.code === ec.code)) {
            matchedErrorCodesList.push({ codeObj: ec, model: effectiveModel });
          }
          if (!bestErrorCode) bestErrorCode = ec;
        }
      }

      // 4. 증상 프리셋 매칭
      for (const preset of symptomPresets) {
        const sc = calculateSymptomMatchScore(preset, token);
        if (sc > 0) {
          const prev = symptomScoreMap.get(preset.title);
          const nextScore = (prev?.score || 0) + sc;
          symptomScoreMap.set(preset.title, { preset, score: nextScore });
          if (nextScore > bestSymptomScore) {
            bestSymptomScore = nextScore;
            bestSymptom = preset;
          }
        }
      }
    }

    // 전체 문자열 통째로도 증상 매칭 재검산
    for (const preset of symptomPresets) {
      const fullSc = calculateSymptomMatchScore(preset, raw);
      if (fullSc > 0) {
        const prev = symptomScoreMap.get(preset.title);
        const nextScore = Math.max(prev?.score || 0, fullSc + 20);
        symptomScoreMap.set(preset.title, { preset, score: nextScore });
        if (nextScore > bestSymptomScore) {
          bestSymptomScore = nextScore;
          bestSymptom = preset;
        }
      }
    }

    // 만약 에러코드가 감지되었고 증상이 미지정이면 에러코드 진단 프리셋 자동 연결
    if (bestErrorCode && !bestSymptom) {
      const errPreset = symptomPresets.find(
        s => s.id === 'EXT_ERROR_CODE' || s.category === '에러코드' || s.title.includes('에러')
      );
      if (errPreset) bestSymptom = errPreset;
    }

    const matchedSymptoms = Array.from(symptomScoreMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);

    const entityCount =
      (bestCustomer ? 1 : 0) +
      (bestModel ? 1 : 0) +
      (bestSymptom ? 1 : 0) +
      (bestErrorCode ? 1 : 0);

    return {
      matchedCustomers: Array.from(matchedCustomersMap.values()),
      matchedModels: Array.from(matchedModelsSet),
      matchedErrorCodes: matchedErrorCodesList.slice(0, 4),
      matchedSymptoms,
      compositePreview:
        entityCount >= 1
          ? {
              customer: bestCustomer,
              model: bestModel || bestCustomer?.assetModel,
              symptom: bestSymptom,
              errorCode: bestErrorCode,
              tokenCount: tokens.length
            }
          : null
    };
  }, [omniQuery, symptomPresets, effectiveModel]);

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

      // customQuery가 넘어온 경우 즉시 파싱 수행
      const tokens = q.split(/\s+/).filter(Boolean);
      let foundCust: Customer | undefined;
      let foundModel: string | undefined;
      let foundError: OfficialErrorCode | undefined;
      let foundSymptom: SymptomPreset | undefined;
      let topScore = 0;

      for (const token of tokens) {
        const tokenClean = token.toLowerCase();
        const tokenDigits = token.replace(/\D/g, '');

        for (const m of EQUIPMENT_MODELS) {
          if (m.toLowerCase() === tokenClean || (tokenClean.length >= 2 && m.toLowerCase().startsWith(tokenClean))) {
            if (!foundModel) foundModel = m;
          }
        }

        for (const c of DEFAULT_B2B_CUSTOMERS) {
          const pDigits = (c.phone || '').replace(/\D/g, '');
          const wDigits = (c.siteWorkerPhone || '').replace(/\D/g, '');
          if (
            (tokenDigits.length >= 3 && (pDigits.includes(tokenDigits) || wDigits.includes(tokenDigits))) ||
            matchesChosungOrText(c.name, token) ||
            matchesChosungOrText(c.manager, token) ||
            (c.useCompany && matchesChosungOrText(c.useCompany, token)) ||
            (c.siteWorkerName && matchesChosungOrText(c.siteWorkerName, token))
          ) {
            if (!foundCust) foundCust = c;
          }
        }

        const modelCodes = getModelErrorCodes(foundModel || foundCust?.assetModel || effectiveModel);
        for (const ec of modelCodes) {
          if (ec.code.toLowerCase() === tokenClean) {
            if (!foundError) foundError = ec;
          }
        }

        for (const preset of symptomPresets) {
          const sc = calculateSymptomMatchScore(preset, token);
          if (sc > topScore) {
            topScore = sc;
            foundSymptom = preset;
          }
        }
      }

      if (foundError && !foundSymptom) {
        foundSymptom = symptomPresets.find(
          s => s.id === 'EXT_ERROR_CODE' || s.category === '에러코드' || s.title.includes('에러')
        );
      }

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
          {/* 중앙 미니멀 타이틀 */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '4px 12px',
                borderRadius: 20,
                background: '#ece7de',
                border: '1px solid #dcd5c9',
                fontSize: 13.5,
                fontWeight: 700,
                color: '#475569',
                marginBottom: 12
              }}
            >
              <span>점진적 정보 전개 워크스페이스</span>
            </div>
            <h1
              style={{
                fontSize: 34,
                fontWeight: 900,
                color: '#0f172a',
                letterSpacing: '-0.8px',
                margin: 0
              }}
            >
              Space Advisor <span style={{ color: '#2563eb' }}>상담지원3</span>
            </h1>
            <p style={{ fontSize: 14.5, color: '#64748b', marginTop: 8, fontWeight: 500 }}>
              전화번호, 고객사명, 장비 모델, 증상 키워드를 구분 없이 한 줄에 입력하십시오.
            </p>
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

          {/* 하단 보조 진입점 (대기열 / 이력 / 상황별 수칙) */}
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
            <button
              type="button"
              onClick={() => setShowGuidesModal(true)}
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
                color: '#1d4ed8',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              <BookOpen size={14} color="#1d4ed8" />
              <span>상황별 수칙</span>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, whiteSpace: 'nowrap' }}>
              <Phone size={15} color="#2563eb" />
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
                      {/* 좌측: 고객 지원 가이드 / 소모품 카탈로그 / 원청 결재 문서 */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => setShowSelfActionGuideModal(true)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            background: '#eff6ff',
                            color: '#1d4ed8',
                            border: '1px solid #93c5fd',
                            borderRadius: 6,
                            padding: '7px 12px',
                            fontSize: 13.5,
                            fontWeight: 800,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          <Smartphone size={14} />
                          <span>자가조치 가이드 (사진/영상)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowPhotoManagerModal(true)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            background: '#ecfdf5',
                            color: '#047857',
                            border: '1px solid #6ee7b7',
                            borderRadius: 6,
                            padding: '7px 12px',
                            fontSize: 13.5,
                            fontWeight: 800,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          <ImageIcon size={14} />
                          <span>사진 순서 관리</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowPartsOrderModal(true)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            background: '#fffbeb',
                            color: '#b45309',
                            border: '1px solid #fcd34d',
                            borderRadius: 6,
                            padding: '7px 12px',
                            fontSize: 13.5,
                            fontWeight: 800,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          <Package size={14} />
                          <span>소모품 카탈로그·견적서</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowDispatchPackageModal(true)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            background: '#fef2f2',
                            color: '#b91c1c',
                            border: '1px solid #fca5a5',
                            borderRadius: 6,
                            padding: '7px 12px',
                            fontSize: 13.5,
                            fontWeight: 800,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          <FileText size={14} />
                          <span>원청 결재 연계 (1차·2차)</span>
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

                  {/* 증상 선택 전(고객/모델만 선택된 상태)에서도 즉시 진행중/완료 저장 후 첫 조회화면 복귀 지원 */}
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
        </div>
      )}

      {/* ── 연동 모달군 (필요 시점에만 마운트) ── */}
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

      {showPhotoManagerModal && (
        <SymptomPhotoManagerModal
          equipmentModel={effectiveModel}
          symptomId={currentSession?.key || 'SUCTION_FAIL'}
          symptomTitle={currentSession?.title || '바닥 잔수 과다'}
          onClose={() => setShowPhotoManagerModal(false)}
          onToast={msg => showToast(msg, 3000)}
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

      {/* 상황별 수칙 모달 */}
      {showGuidesModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            zIndex: 9500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24
          }}
          onClick={() => setShowGuidesModal(false)}
        >
          <div
            style={{
              background: '#f5f2eb',
              borderRadius: 12,
              width: '100%',
              maxWidth: 820,
              maxHeight: '80vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              border: '1px solid #cbd5e1'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div
              style={{
                padding: '14px 20px',
                background: '#0f172a',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <span style={{ fontSize: 16, fontWeight: 800 }}>상황별 수칙</span>
              <button
                type="button"
                onClick={() => setShowGuidesModal(false)}
                style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {specialGuides.map(g => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setSelectedGuideId(g.id)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 6,
                      border: selectedGuideId === g.id ? '2px solid #2563eb' : '1px solid #cbd5e1',
                      background: selectedGuideId === g.id ? '#eff6ff' : '#ffffff',
                      color: selectedGuideId === g.id ? '#1d4ed8' : '#334155',
                      fontSize: 13.5,
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {g.title}
                  </button>
                ))}
              </div>
              {specialGuides
                .filter(g => g.id === selectedGuideId)
                .map(g => (
                  <div
                    key={g.id}
                    style={{ background: '#ffffff', padding: 16, borderRadius: 8, border: '1px solid #dcd5c9' }}
                  >
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
                      {g.target_situation}
                    </div>
                    <div style={{ fontSize: 14, color: '#1d4ed8', fontWeight: 700, marginBottom: 10 }}>
                      "{g.call_script}"
                    </div>
                    <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13.5, color: '#334155', lineHeight: 1.7 }}>
                      {g.operation_steps.map((st: string, idx: number) => (
                        <li key={idx}>{st}</li>
                      ))}
                    </ol>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 실시간 통합 자동완성 드롭다운 컴포넌트 ──────────────────────────────────
function OmniSuggestDropdown({
  parsed,
  query,
  onExecuteComposite,
  onSelectCustomer,
  onSelectModel,
  onSelectSymptom
}: {
  parsed: OmniParsedResult;
  query: string;
  onExecuteComposite: () => void;
  onSelectCustomer: (c: Customer) => void;
  onSelectModel: (m: string) => void;
  onSelectSymptom: (p: SymptomPreset, errCode?: OfficialErrorCode) => void;
}) {
  const { matchedCustomers, matchedModels, matchedErrorCodes, matchedSymptoms, compositePreview } = parsed;

  return (
    <div
      data-uia="omni-suggest-dropdown"
      style={{
        position: 'absolute',
        top: 'calc(100% + 6px)',
        left: 0,
        right: 0,
        background: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: 14,
        boxShadow: '0 14px 36px rgba(15, 23, 42, 0.16)',
        zIndex: 3000,
        maxHeight: 440,
        overflowY: 'auto',
        padding: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }}
    >
      {/* 1. 복합 원클릭 실행 배너 */}
      {compositePreview && (
        <div
          onClick={onExecuteComposite}
          data-uia="omni-composite-action"
          style={{
            background: '#eff6ff',
            border: '1.5px solid #2563eb',
            borderRadius: 10,
            padding: '10px 14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span
              style={{
                background: '#2563eb',
                color: '#ffffff',
                fontSize: 13.5,
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: 4,
                whiteSpace: 'nowrap'
              }}
            >
              통합 즉시 전개 (Enter)
            </span>
            {compositePreview.customer && (
              <span style={{ fontSize: 13.5, fontWeight: 800, color: '#0f172a' }}>
                고객: {compositePreview.customer.name}
              </span>
            )}
            {compositePreview.model && (
              <span style={{ fontSize: 13.5, fontWeight: 800, color: '#1d4ed8' }}>
                모델: {compositePreview.model}
              </span>
            )}
            {compositePreview.errorCode && (
              <span style={{ fontSize: 13.5, fontWeight: 800, color: '#dc2626' }}>
                에러코드: [{compositePreview.errorCode.code}] {compositePreview.errorCode.name}
              </span>
            )}
            {compositePreview.symptom && (
              <span style={{ fontSize: 13.5, fontWeight: 800, color: '#059669' }}>
                증상: {compositePreview.symptom.title}
              </span>
            )}
          </div>
          <ArrowRight size={16} color="#2563eb" style={{ flexShrink: 0 }} />
        </div>
      )}

      {/* 2. 고객사 / 전화번호 매칭 결과 */}
      {matchedCustomers.length > 0 && (
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: '#64748b', padding: '2px 6px 4px' }}>
            고객사 및 전화번호 ({matchedCustomers.length}건)
          </div>
          {matchedCustomers.map(c => (
            <div
              key={c.id}
              onClick={() => onSelectCustomer(c)}
              style={{
                padding: '8px 10px',
                borderRadius: 8,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: 13.5
              }}
            >
              <div>
                <strong style={{ color: '#0f172a' }}>{c.name}</strong>{' '}
                <span style={{ color: '#64748b' }}>
                  ({c.siteWorkerName} {c.siteWorkerPhone} / 원청: {c.manager} {c.phone})
                </span>
              </div>
              <span
                style={{
                  background: '#0f172a',
                  color: '#ffffff',
                  padding: '2px 8px',
                  borderRadius: 4,
                  fontWeight: 800,
                  fontSize: 13.5
                }}
              >
                {c.assetModel}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* 3. 장비 모델 매칭 결과 */}
      {matchedModels.length > 0 && (
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: '#64748b', padding: '2px 6px 4px' }}>
            장비 모델 선택
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: '0 6px' }}>
            {matchedModels.map(m => (
              <button
                key={m}
                type="button"
                onClick={() => onSelectModel(m)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 6,
                  background: '#0f172a',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: 13.5,
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                {m} 모델 적용
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 4. 계기판 에러코드 매칭 결과 */}
      {matchedErrorCodes.length > 0 && (
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: '#64748b', padding: '2px 6px 4px' }}>
            계기판 에러코드
          </div>
          {matchedErrorCodes.map(({ codeObj }) => (
            <div
              key={codeObj.code}
              onClick={() =>
                onSelectSymptom(
                  {
                    id: 'EXT_ERROR_CODE',
                    title: '계기판 에러코드 점멸 및 경고음',
                    symptom: `[${codeObj.code}] ${codeObj.name} - ${codeObj.meaning}`,
                    urgency: '긴급',
                    category: '에러코드'
                  },
                  codeObj
                )
              }
              style={{
                padding: '7px 10px',
                borderRadius: 8,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: 13.5
              }}
            >
              <div>
                <strong style={{ color: '#dc2626' }}>[{codeObj.code}]</strong>{' '}
                <strong style={{ color: '#0f172a' }}>{codeObj.name}</strong> —{' '}
                <span style={{ color: '#64748b' }}>{codeObj.meaning}</span>
              </div>
              <span style={{ color: '#2563eb', fontWeight: 700 }}>진단 열기</span>
            </div>
          ))}
        </div>
      )}

      {/* 5. 표준 장애 증상 매칭 결과 */}
      {matchedSymptoms.length > 0 && (
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: '#64748b', padding: '2px 6px 4px' }}>
            증상 키워드 진단 ({matchedSymptoms.length}건)
          </div>
          {matchedSymptoms.map(({ preset }) => (
            <div
              key={preset.title}
              onClick={() => onSelectSymptom(preset)}
              style={{
                padding: '8px 10px',
                borderRadius: 8,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: 13.5
              }}
            >
              <div>
                <strong style={{ color: '#0f172a' }}>{preset.title}</strong>{' '}
                <span style={{ color: '#64748b' }}>— {preset.symptom}</span>
              </div>
              <span
                style={{
                  color: preset.urgency === '긴급' ? '#dc2626' : '#059669',
                  fontWeight: 800,
                  whiteSpace: 'nowrap'
                }}
              >
                {preset.urgency}
              </span>
            </div>
          ))}
        </div>
      )}

      {matchedCustomers.length === 0 &&
        matchedModels.length === 0 &&
        matchedErrorCodes.length === 0 &&
        matchedSymptoms.length === 0 && (
          <div
            onClick={onExecuteComposite}
            style={{ padding: 12, fontSize: 13.5, color: '#475569', cursor: 'pointer' }}
          >
            Enter를 눌러 <strong>"{query}"</strong> 수동 증상 진단을 시작합니다.
          </div>
        )}
    </div>
  );
}

function SimpleSessionListModal({
  title,
  records,
  onClose,
  onSelect
}: {
  title: string;
  records: ConsultSessionRecord[];
  onClose: () => void;
  onSelect: (rec: ConsultSessionRecord) => void;
}) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.55)',
        zIndex: 9500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#f5f2eb',
          borderRadius: 12,
          width: '100%',
          maxWidth: 680,
          maxHeight: '75vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid #cbd5e1'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div
          style={{
            padding: '14px 20px',
            background: '#0f172a',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 800 }}>{title}</span>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {records.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#64748b', fontSize: 14 }}>
              저장된 상담 내역이 없습니다.
            </div>
          ) : (
            records.map(r => (
              <div
                key={r.id}
                onClick={() => onSelect(r)}
                style={{
                  background: '#ffffff',
                  border: '1px solid #dcd5c9',
                  borderRadius: 8,
                  padding: '12px 16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontSize: 13.5,
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: 6,
                        background: r.status === 'in_progress' ? '#fffbeb' : '#ecfdf5',
                        color: r.status === 'in_progress' ? '#b45309' : '#047857',
                        border: r.status === 'in_progress' ? '1px solid #f59e0b' : '1px solid #10b981',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {r.status === 'in_progress'
                        ? `진행중 · ${r.currentStepSummary}`
                        : r.status === 'visit_required'
                        ? '상담완료 · AS 출장 접수'
                        : '상담완료 · 전화 조치 완료'}
                    </span>
                    <span style={{ fontSize: 14.5, fontWeight: 800, color: '#0f172a' }}>
                      {r.customerName} ({r.modelName})
                    </span>
                    <span style={{ fontSize: 13.5, color: '#64748b' }}>· {r.updatedAt.slice(0, 16).replace('T', ' ')}</span>
                  </div>
                  <div style={{ fontSize: 13.5, color: '#475569', marginTop: 4 }}>{r.summaryText}</div>
                </div>
                <span style={{ fontSize: 13.5, fontWeight: 800, color: '#2563eb', whiteSpace: 'nowrap' }}>불러오기 →</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
