import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Phone, Search, ChevronRight, AlertTriangle,
  Loader2, RotateCcw, Wrench, CheckCircle2,
  HelpCircle, History, Sparkles, X, ChevronDown,
  ChevronUp, Check, ArrowRight, RefreshCw, ShieldAlert,
  Layers, Cpu, FileText, BookOpen, Copy
} from 'lucide-react';

// ─── 타입 정의 ─────────────────────────────────────────────────────────────────
interface Customer {
  id: string;
  name: string;
  manager: string;
  phone: string;
  assetModel: string;
  serialNumber: string;
  salesType: string;
  historyTimeline: { date: string; title: string; isWarning?: boolean }[];
}

export interface DiagnosticStep {
  step_no: number;
  title: string;
  method?: string;
  criteria_normal?: string;
  criteria_fault?: string;
  fault_action?: string;
  status: 'pending' | 'active' | 'resolved' | 'unresolved';
}

type CounselStatus = 'in_progress' | 'resolved_by_call' | 'visit_required';

// ─── 제조사 공식 12대 계기판 에러 코드 규격 ─────────────────────────────────────
export interface OfficialErrorCode {
  code: string;
  name: string;
  category: string;
  meaning: string;
  call_script: string;
  resolution_type: 'RESOLVED' | 'VISIT_REQUIRED';
  part_code?: string | null;
  action_desc: string;
}

// ─── 단일 통화 내 복수 증상 진단 세션 객체 ───────────────────────────────────────
export interface SymptomSession {
  key: string;                 // 고유 식별자 (증상 title)
  title: string;
  category: string;
  part_code: string;
  urgency: string;
  can_self_resolve: boolean;
  call_script: string;
  steps: DiagnosticStep[];     // 단계별 진단-판정 진행 상태 보존
  activeStepIndex: number;     // 현재 안내/조치 중인 단계 인덱스
  status: CounselStatus;       // 'in_progress' | 'resolved_by_call' | 'visit_required'
  historyLog: string[];        // 해당 증상 판정 이력 로그
  official_error_codes?: OfficialErrorCode[]; // 공식 에러 코드 12종
  selectedErrorCode?: OfficialErrorCode | null; // 상담원이 선택한 에러 코드
}

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

interface KbResult {
  id: string;
  summary: string;
  equipment_model: string;
  symptoms: string[];
  parts_mentioned: string[];
  action_items: string[];
  urgency: string;
  similarity: number;
}

interface ModelSpec {
  model_name: string;
  category: string;
  clean_tank_l: number;
  recovery_tank_l: number;
  brush_spec: string;
  squeegee_width_mm: number;
  battery_spec: string;
  run_time: string;
  clean_area_m2h: string;
  weight_kg: number;
  fuse_location: string;
  key_consumables: string;
}

interface SpecialGuide {
  id: string;
  category: string;
  title: string;
  target_situation: string;
  operation_steps: string[];
  call_script: string;
}

const API = 'http://127.0.0.1:8000/api/v1';

const EQUIPMENT_MODELS = ['J600T', 'J800', 'S7', 'S5', 'S1', 'S3', 'W12', 'W15', 'S2', 'S12', '쓰담', '전체'];
const SYMPTOM_CATEGORIES = ['전체', '충전/전원', '흡입/잔수', '브러시/구동', '세척수/배관', '외관/기타'];

export interface CounselAssistV2Props {
  initialOpenGuides?: boolean;
}

export default function CounselAssistV2({ initialOpenGuides }: CounselAssistV2Props = {}) {
  // ① 고객 및 장비 선택
  const [searchText, setSearchText]                 = useState('');
  const [searchResults, setSearchResults]           = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer]     = useState<Customer | null>(null);
  const [selectedModel, setSelectedModel]           = useState<string>('J600T');
  const [isSearching, setIsSearching]               = useState(false);
  const [dropdownOpen, setDropdownOpen]             = useState(false);

  // ①-2 모델 하드웨어 제원 & 상황별 매뉴얼 가이드
  const [currentModelSpec, setCurrentModelSpec]     = useState<ModelSpec | null>(null);
  const [showModelSpec, setShowModelSpec]           = useState(false);
  const [specialGuides, setSpecialGuides]           = useState<SpecialGuide[]>([]);
  const [showGuidesModal, setShowGuidesModal]       = useState<boolean>(() => {
    if (initialOpenGuides) return true;
    if (typeof window !== 'undefined') {
      const search = window.location.search || '';
      const hash = window.location.hash || '';
      return search.includes('guides') || hash.includes('guides');
    }
    return false;
  });
  const [selectedGuideId, setSelectedGuideId]       = useState<string>('GUIDE_BRUSH_AUTO');

  useEffect(() => {
    if (initialOpenGuides) {
      setShowGuidesModal(true);
      setTimeout(() => {
        const el = document.querySelector('[data-special-guides-panel]');
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [initialOpenGuides]);

  // ② 증상 목록 및 필터링
  const [symptomPresets, setSymptomPresets]         = useState<SymptomPreset[]>([]);
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
    try {
      const res = await fetch(`${API}/counsel/model-symptoms?model=${encodeURIComponent(modelName)}`);
      if (res.ok) {
        const data = await res.json();
        setSymptomPresets(data.symptoms ?? []);
        if (data.model_spec) {
          setCurrentModelSpec(data.model_spec);
        } else {
          setCurrentModelSpec(null);
        }
        if (data.special_guides && data.special_guides.length > 0) {
          setSpecialGuides(data.special_guides);
        }
      }
    } catch {
      // 오프라인/에러 시 기존 목록 유지
    }
  }, []);

  useEffect(() => {
    fetchModelSymptoms(selectedModel);
  }, [selectedModel, fetchModelSymptoms]);

  // ── 고객 검색 (한글 초성 검색 완벽 지원) ─────────────────────────────────────────
  const handleCustomerSearch = useCallback(async (q: string) => {
    setSearchText(q);
    if (q.trim().length < 1) { setSearchResults([]); setDropdownOpen(false); return; }
    setIsSearching(true);
    setDropdownOpen(true);
    try {
      const res = await fetch(`${API}/schedule/customers?q=${encodeURIComponent(q)}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data) ? data : data.items ?? [];
        setSearchResults(items);
        setDropdownOpen(true);
      }
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const selectCustomer = (c: Customer) => {
    setSelectedCustomer(c);
    setSearchText(c.name);
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

    const officialCodes = preset.official_error_codes || (preset as any).action_plan?.official_error_codes || [];

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
          historyLog: [`[수동 증상 추가] ${key}`]
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

    const logEntry = `STEP ${currentStep.step_no} (${currentStep.title}): 🔴 불량 판정`;
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
      showToast(`[${currentSession.title}] 모든 조치 실패 ➔ AS 출장 접수 필요`, 3000);
    } else {
      showToast(`[${currentSession.title}] 다음 조치 (STEP ${stepIdx + 2})로 자동 전이`);
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
            `[즉시 판정] 에러코드 ${codeObj.code} (${codeObj.name}) -> ${isVisit ? '🚨 AS 출장 접수' : '🟢 전화 자가해결 종결'}`
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

  // ── 최종 조치 저장 (다수 증상 전체 통합 저장) ─────────────────────────────
  const handleSave = async (isVisit: boolean) => {
    if (sessionList.length === 0 && !customSymptom.trim()) {
      showToast('진단된 증상 또는 조치 내용이 없습니다.');
      return;
    }
    setIsSaving(true);
    try {
      // 복수 증상별 진단 결과를 누락 없이 100% 통합 조립
      const sessionSummaries = sessionList.map(s => {
        const stepLogs = s.steps.map(st => {
          const mark = st.status === 'resolved' ? '🟢해결' : st.status === 'unresolved' ? '🔴불량' : st.status === 'active' ? '🔵진행' : '⚪대기';
          return `STEP ${st.step_no} ${st.title} (${mark})`;
        }).join(' / ');
        const errCodeLog = s.selectedErrorCode ? ` (선택 에러코드: [${s.selectedErrorCode.code}] ${s.selectedErrorCode.name})` : '';
        const statLabel = s.status === 'resolved_by_call' ? '🟢전화해결' : s.status === 'visit_required' ? '🚨출장필요' : '🔵진행중';
        return `[증상: ${s.title}${errCodeLog} | ${statLabel}]\n - 조치내역: ${stepLogs}`;
      }).join('\n');

      const allSymptoms = sessionList.map(s => s.title).join(', ') || customSymptom;
      const finalAction = `${sessionSummaries}\n[상담원 메모] ${notes || '특이사항 없음'}`.trim();

      await fetch(`${API}/counsel/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name:     selectedCustomer?.name ?? '일반 고객',
          manager:           selectedCustomer?.manager ?? '',
          serial_number:     selectedCustomer?.serialNumber ?? '',
          model_name:        selectedModel,
          keyword:           sessionList[0]?.title ?? customSymptom,
          part_code:         sessionList.map(s => s.part_code).join(', ') || 'GENERAL',
          symptoms:          allSymptoms,
          action_taken:      finalAction,
          is_completed:      !isVisit,
          is_visit_required: isVisit,
          counselor_name:    counselorName || '상담원',
        }),
      });

      showToast(isVisit ? '복수 증상 AS 출동 예약 접수 완료' : '복수 증상 직접조치 완료 저장');
      if (isVisit) handleReset();
    } catch {
      showToast('저장 실패. 서버를 확인하세요.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setSearchText('');
    setSelectedCustomer(null);
    setCustomSymptom('');
    setSymptomSessions({});
    setActiveSymptomKey(null);
    setKbResults([]);
    setNotes('');
  };

  return (
    <div style={{ fontFamily: "'Apple SD Gothic Neo','Malgun Gothic',sans-serif", height: 'calc(100vh - 54px)', display: 'flex', flexDirection: 'column', background: '#f8fafc', overflow: 'hidden' }}>

      {/* 토스트 */}
      {toast && (
        <div style={{ position: 'fixed', top: 16, right: 20, zIndex: 9999, background: '#0f172a', color: '#fff', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 600, boxShadow: '0 6px 20px rgba(0,0,0,0.2)' }}>
          {toast}
        </div>
      )}

      {/* ── [최상단 서브 툴바] ── */}
      <div style={{ background: '#fff', borderBottom: '1.5px solid #cbd5e1', padding: '0 16px', display: 'flex', alignItems: 'center', height: 40, gap: 12, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Phone size={15} color="#2563eb" />
          <span style={{ fontWeight: 800, fontSize: 13, color: '#0f172a', whiteSpace: 'nowrap' }}>상담 보조 스튜디오</span>
        </div>
        <div style={{ width: 1, height: 14, background: '#cbd5e1' }} />
        <span style={{ fontSize: 11, color: '#475569', fontWeight: 600, whiteSpace: 'nowrap' }}>
          다수 증상 복합 진단-판정 세션 콘솔
        </span>

        {/* 현재 통화 내 진단 중인 증상 수 뱃지 */}
        {sessionList.length > 0 && (
          <span style={{ fontSize: 11, fontWeight: 800, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '1px 8px', borderRadius: 12 }}>
            진단 대상: {sessionList.length}건
          </span>
        )}

        <div style={{ flex: 1 }} />

        {/* 매뉴얼 상황별 수칙 바로가기 버튼 */}
        <button
          onClick={() => {
            setShowGuidesModal(prev => !prev);
            setTimeout(() => {
              const el = document.querySelector('[data-special-guides-panel]');
              el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
          }}
          data-uia="btn-subtoolbar-special-guides"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '3px 10px',
            borderRadius: 5,
            fontSize: 11.5,
            fontWeight: 800,
            background: showGuidesModal ? '#312e81' : '#4338ca',
            color: '#ffffff',
            border: 'none',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            boxShadow: '0 1px 3px rgba(67, 56, 202, 0.4)',
            transition: 'all 0.15s ease'
          }}
        >
          <BookOpen size={12} />
          <span>상황별 수칙</span>
        </button>

        {/* 상담자 입력 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>상담자</label>
          <input
            value={counselorName}
            onChange={e => setCounselorName(e.target.value)}
            placeholder="성명"
            style={{ border: '1.5px solid #94a3b8', borderRadius: 5, padding: '2px 8px', fontSize: 11, width: 70, outline: 'none', background: '#fff' }}
          />
        </div>

        {/* 초기화 버튼 */}
        <button
          onClick={handleReset}
          style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#fff', border: '1.5px solid #94a3b8', borderRadius: 5, padding: '2px 8px', fontSize: 11, fontWeight: 700, color: '#334155', cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          <RotateCcw size={11} /> 초기화
        </button>
      </div>

      {/* ── [메인 본문] 꽉 채우는 좌우 2단 분할 스튜디오 ── */}
      <div style={{ flex: 1, display: 'flex', gap: 8, padding: 8, overflow: 'hidden', boxSizing: 'border-box' }}>

        {/* ════════════════════════════════════════════════════════════════════════
            [좌측 패널 (너비 380px)] : 모델 선택 + 고객 조회 + 16대 표준 장애 목록
        ════════════════════════════════════════════════════════════════════════ */}
        <div style={{ width: 380, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6, height: '100%', overflow: 'hidden' }}>

          {/* 좌측 상단: 장비 모델 및 고객사 조회 */}
          <div style={{ background: '#fff', borderRadius: 8, border: '1.5px solid #94a3b8', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0, position: 'relative', zIndex: 50 }}>
            {/* 장비 모델 칩 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <label style={{ fontSize: 11, fontWeight: 800, color: '#334155', whiteSpace: 'nowrap' }}>장비 모델</label>
                  {currentModelSpec && (
                    <button
                      data-spec-toggle-btn
                      onClick={() => setShowModelSpec(prev => !prev)}
                      style={{
                        padding: '1px 6px',
                        borderRadius: 4,
                        fontSize: 9.5,
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
                      <FileText size={10} />
                      <span>{showModelSpec ? '제원 닫기' : '제원·규격'}</span>
                    </button>
                  )}
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#2563eb' }}>선택: {selectedModel}</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {EQUIPMENT_MODELS.map(m => {
                  const isActive = selectedModel === m;
                  return (
                    <button
                      key={m}
                      onClick={() => { setSelectedModel(m); }}
                      style={{
                        padding: '3px 8px',
                        borderRadius: 5,
                        fontSize: 11,
                        fontWeight: isActive ? 800 : 600,
                        border: isActive ? '2px solid #1d4ed8' : '1px solid #cbd5e1',
                        background: isActive ? '#dbeafe' : '#ffffff',
                        color: isActive ? '#1e40af' : '#334155',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.1s ease'
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
                    background: '#f8fafc',
                    border: '1.5px solid #3b82f6',
                    borderRadius: 6,
                    padding: '6px 8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3,
                    fontSize: 10,
                    marginTop: 2
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: 2 }}>
                    <span style={{ fontWeight: 900, color: '#1e3a8a', fontSize: 10.5 }}>
                      {currentModelSpec.model_name} <span style={{ fontWeight: 600, color: '#64748b', fontSize: 9 }}>({currentModelSpec.category})</span>
                    </span>
                    <span style={{ color: '#059669', fontWeight: 800, fontSize: 9.5 }}>가동 {currentModelSpec.run_time}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 6px', color: '#334155', fontSize: 9.5 }}>
                    <div><span style={{ color: '#64748b', fontWeight: 700 }}>탱크:</span> {currentModelSpec.clean_tank_l}L / {currentModelSpec.recovery_tank_l}L</div>
                    <div><span style={{ color: '#64748b', fontWeight: 700 }}>브러시:</span> {currentModelSpec.brush_spec}</div>
                    <div><span style={{ color: '#64748b', fontWeight: 700 }}>스퀴지:</span> {currentModelSpec.squeegee_width_mm > 0 ? `${currentModelSpec.squeegee_width_mm}mm` : '건식 진공'}</div>
                    <div><span style={{ color: '#64748b', fontWeight: 700 }}>배터리:</span> {currentModelSpec.battery_spec}</div>
                  </div>
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 4, padding: '2px 5px', color: '#991b1b', fontSize: 9, lineHeight: 1.25 }}>
                    <span style={{ fontWeight: 800 }}>차단기/퓨즈: </span>{currentModelSpec.fuse_location}
                  </div>
                  <div style={{ color: '#475569', fontSize: 8.5, lineHeight: 1.2 }}>
                    <span style={{ fontWeight: 700, color: '#334155' }}>주요 소모품: </span>{currentModelSpec.key_consumables}
                  </div>
                </div>
              )}
            </div>

            {/* 고객 검색 (한글 초성 검색 완벽 지원) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ fontSize: 10, fontWeight: 800, color: '#334155', whiteSpace: 'nowrap' }}>고객사 조회</label>
                <span style={{ fontSize: 9, color: '#2563eb', fontWeight: 700 }}>초성 검색 지원 (예: ㅅㅍ, ㅁㄹ)</span>
              </div>
              <div style={{ position: 'relative' }}>
                <Search size={12} color="#64748b" style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  ref={searchRef}
                  value={searchText}
                  onChange={e => handleCustomerSearch(e.target.value)}
                  onFocus={() => searchText && setDropdownOpen(true)}
                  placeholder="고객사명, 담당자 또는 초성 (예: ㅅㅍ, ㅁㄹ)"
                  style={{ width: '100%', paddingLeft: 26, paddingRight: 24, height: 28, border: '1.5px solid #94a3b8', borderRadius: 5, fontSize: 11, outline: 'none', boxSizing: 'border-box', background: '#fff' }}
                />
                {searchText && (
                  <button
                    onClick={() => { setSearchText(''); setSearchResults([]); setDropdownOpen(false); }}
                    style={{ position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 0 }}
                  >
                    <X size={11} />
                  </button>
                )}
                {isSearching && <Loader2 size={12} color="#64748b" style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', animation: 'spin 1s linear infinite' }} />}
              </div>

              {/* 검색 결과 드롭다운 */}
              {dropdownOpen && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#ffffff', border: '2px solid #2563eb', borderRadius: 6, boxShadow: '0 12px 28px rgba(0,0,0,0.25)', zIndex: 999, marginTop: 4, maxHeight: 180, overflowY: 'auto' }}>
                  {searchResults.map(c => (
                    <div
                      key={c.id}
                      data-customer-item={c.name}
                      onClick={() => selectCustomer(c)}
                      style={{ padding: '6px 8px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: 11 }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#eff6ff')}
                      onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                    >
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{c.name}</div>
                      <div style={{ fontSize: 10, color: '#64748b' }}>{c.manager} · {c.phone} | 보유: {c.assetModel || '미지정'}</div>
                    </div>
                  ))}
                  {searchResults.length === 0 && !isSearching && (
                    <div style={{ padding: '8px 10px', fontSize: 11, color: '#64748b', textAlign: 'center' }}>
                      일치하는 고객사가 없습니다.
                    </div>
                  )}
                </div>
              )}
            </div>

            {selectedCustomer && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 5, padding: '3px 6px', fontSize: 10 }}>
                <span style={{ fontWeight: 700, color: '#1e40af' }}>{selectedCustomer.name} ({selectedCustomer.manager})</span>
                <button onClick={() => setSelectedCustomer(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 0 }}>
                  <X size={11} />
                </button>
              </div>
            )}
          </div>

          {/* 좌측 중단: 계통 필터 & 검색 */}
          <div style={{ background: '#fff', borderRadius: 8, border: '1.5px solid #94a3b8', padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
              {SYMPTOM_CATEGORIES.map(cat => {
                const isCatActive = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    style={{
                      padding: '2px 6px',
                      borderRadius: 4,
                      fontSize: 10,
                      fontWeight: isCatActive ? 800 : 500,
                      border: isCatActive ? '1.5px solid #1d4ed8' : '1px solid #cbd5e1',
                      background: isCatActive ? '#dbeafe' : '#ffffff',
                      color: isCatActive ? '#1e40af' : '#475569',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
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
                placeholder="증상 검색 (예: 20분, 소음, 누수)"
                style={{ flex: 1, height: 26, border: '1px solid #94a3b8', borderRadius: 4, padding: '0 6px', fontSize: 11, outline: 'none', background: '#fff' }}
              />
              {symptomSearchQuery && (
                <button onClick={() => setSymptomSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                  <X size={11} />
                </button>
              )}
              <button
                onClick={() => setShowCustomInput(!showCustomInput)}
                style={{ background: '#fff', border: '1px solid #94a3b8', borderRadius: 4, padding: '2px 6px', color: '#1d4ed8', fontSize: 10, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                {showCustomInput ? '닫기' : '직접입력'}
              </button>
            </div>

            {showCustomInput && (
              <div style={{ display: 'flex', gap: 4, paddingTop: 3, borderTop: '1px dashed #cbd5e1' }}>
                <input
                  value={customSymptom}
                  onChange={e => setCustomSymptom(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCustomSearch()}
                  placeholder="증상 직접 입력"
                  style={{ flex: 1, height: 26, border: '1px solid #94a3b8', borderRadius: 4, padding: '0 6px', fontSize: 11, outline: 'none' }}
                />
                <button
                  onClick={handleCustomSearch}
                  disabled={!customSymptom.trim() || isLoadingPlan}
                  style={{ background: '#0f172a', color: '#fff', border: 'none', borderRadius: 4, padding: '0 8px', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}
                >
                  추가
                </button>
              </div>
            )}
          </div>

          {/* 좌측 하단: 16대 표준 장애 유형 리스트 (실시간 세션 상태 뱃지 탑재) */}
          <div style={{ flex: 1, background: '#fff', borderRadius: 8, border: '1.5px solid #94a3b8', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '6px 8px', background: '#f8fafc', borderBottom: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#0f172a' }}>
                표준 장애 유형 ({symptomPresets.length}건)
              </span>
              <span style={{ fontSize: 9, color: '#64748b' }}>클릭 시 세션에 추가/전환</span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {(() => {
                const q = symptomSearchQuery.trim().toLowerCase();
                const filtered = symptomPresets.filter(p => {
                  const matchCat = selectedCategory === '전체' || (p.category && p.category === selectedCategory);
                  const matchQ = !q ||
                    p.title.toLowerCase().includes(q) ||
                    p.symptom.toLowerCase().includes(q) ||
                    (p.aliases && p.aliases.some(a => a.toLowerCase().includes(q))) ||
                    (p.official_error_codes && p.official_error_codes.some(ec =>
                      ec.code.toLowerCase().includes(q) || ec.name.toLowerCase().includes(q) || ec.meaning.toLowerCase().includes(q)
                    ));
                  return matchCat && matchQ;
                });

                if (filtered.length === 0) {
                  return (
                    <div style={{ padding: 16, textAlign: 'center', color: '#64748b', fontSize: 11 }}>
                      일치하는 증상이 없습니다.
                    </div>
                  );
                }

                return filtered.map((preset, idx) => {
                  const isCurrentActive = activeSymptomKey === preset.title;
                  // 이 증상이 현재 상담 세션에 등록되어 있는지 여부
                  const existingSession = symptomSessions[preset.title];

                  return (
                    <div
                      key={idx}
                      data-symptom-card={preset.title}
                      onClick={() => handleSelectSymptom(preset)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                        padding: '6px 8px',
                        borderRadius: 5,
                        border: isCurrentActive
                          ? '2px solid #1d4ed8'
                          : existingSession
                          ? '1.5px solid #60a5fa'
                          : '1px solid #cbd5e1',
                        background: isCurrentActive
                          ? '#eff6ff'
                          : existingSession
                          ? '#f8fafc'
                          : '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.1s ease',
                        boxShadow: isCurrentActive ? '0 0 0 1.5px rgba(29,78,216,0.2)' : 'none'
                      }}
                      onMouseEnter={e => { if (!isCurrentActive) e.currentTarget.style.background = '#f8fafc'; }}
                      onMouseLeave={e => { if (!isCurrentActive && !existingSession) e.currentTarget.style.background = '#ffffff'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0, flex: 1 }}>
                          <span style={{ fontSize: 11, fontWeight: isCurrentActive ? 800 : 700, color: isCurrentActive ? '#1d4ed8' : '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {preset.title}
                          </span>
                        </div>

                        {/* 세션 상태 뱃지 (진행중, 해결, 출장필요) */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                          {existingSession && (
                            <span style={{
                              fontSize: 9,
                              padding: '1px 4px',
                              borderRadius: 3,
                              fontWeight: 800,
                              whiteSpace: 'nowrap',
                              background: existingSession.status === 'resolved_by_call'
                                ? '#dcfce7'
                                : existingSession.status === 'visit_required'
                                ? '#fee2e2'
                                : '#e0e7ff',
                              color: existingSession.status === 'resolved_by_call'
                                ? '#15803d'
                                : existingSession.status === 'visit_required'
                                ? '#b91c1c'
                                : '#3730a3',
                              border: existingSession.status === 'resolved_by_call'
                                ? '1px solid #86efac'
                                : existingSession.status === 'visit_required'
                                ? '1px solid #fca5a5'
                                : '1px solid #c7d2fe'
                            }}>
                              {existingSession.status === 'resolved_by_call'
                                ? '🟢해결'
                                : existingSession.status === 'visit_required'
                                ? '🚨출장'
                                : `STEP ${existingSession.activeStepIndex + 1}`}
                            </span>
                          )}

                          <span style={{
                            fontSize: 9,
                            padding: '1px 4px',
                            borderRadius: 3,
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                            background: preset.urgency === '긴급' ? '#fee2e2' : '#fef3c7',
                            color: preset.urgency === '긴급' ? '#991b1b' : '#92400e',
                            border: preset.urgency === '긴급' ? '1px solid #f87171' : '1px solid #fcd34d'
                          }}>
                            {preset.urgency}
                          </span>
                        </div>
                      </div>

                      <span style={{ fontSize: 10, color: '#475569', lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {preset.symptom}
                      </span>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

        </div>

        {/* ════════════════════════════════════════════════════════════════════════
            [우측 패널 (Flex 1)] : 복수 증상 탭 바 + 실시간 진단 콘솔 + 통합 완결
        ════════════════════════════════════════════════════════════════════════ */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, height: '100%', overflow: 'hidden' }}>

          {/* 매뉴얼 상황별 긴급/수칙 접이식 패널 (화면 상단 전역 배치 - 증상 세션 유무와 무관하게 즉시 열림) */}
          {showGuidesModal && specialGuides.length > 0 && (
            <div
              data-special-guides-panel
              style={{
                background: '#ffffff',
                border: '1.5px solid #6366f1',
                borderRadius: 8,
                padding: '8px 10px',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                flexShrink: 0,
                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.12)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <BookOpen size={13} color="#4f46e5" />
                  <span style={{ fontSize: 11.5, fontWeight: 900, color: '#1e1b4b' }}>상황별 수칙</span>
                </div>
                <button
                  onClick={() => setShowGuidesModal(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 0 }}
                >
                  <X size={13} />
                </button>
              </div>

              {/* 4대 상황별 탭 */}
              <div style={{ display: 'flex', gap: 4, overflowX: 'auto' }}>
                {specialGuides.map(g => {
                  const isCurrent = g.id === selectedGuideId;
                  return (
                    <button
                      key={g.id}
                      data-guide-tab={g.id}
                      onClick={() => setSelectedGuideId(g.id)}
                      style={{
                        padding: '3px 8px',
                        borderRadius: 4,
                        fontSize: 10,
                        fontWeight: isCurrent ? 800 : 600,
                        background: isCurrent ? '#e0e7ff' : '#f8fafc',
                        color: isCurrent ? '#3730a3' : '#475569',
                        border: isCurrent ? '1.5px solid #6366f1' : '1px solid #e2e8f0',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.1s ease'
                      }}
                    >
                      {g.title}
                    </button>
                  );
                })}
              </div>

              {/* 선택된 수칙 상세 내용 */}
              {(() => {
                const activeG = specialGuides.find(g => g.id === selectedGuideId) || specialGuides[0];
                if (!activeG) return null;
                return (
                  <div style={{ background: '#f8fafc', borderRadius: 6, padding: '7px 9px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ fontSize: 10.5, fontWeight: 800, color: '#1e293b' }}>
                      🎯 대상 상황: <span style={{ color: '#2563eb' }}>{activeG.target_situation}</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 10, color: '#334155' }}>
                      {activeG.operation_steps.map((st, sidx) => (
                        <div key={sidx} style={{ lineHeight: 1.35 }}>{st}</div>
                      ))}
                    </div>

                    <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 4, padding: '4px 8px', display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: 2 }}>
                      <Sparkles size={11} color="#2563eb" style={{ flexShrink: 0, marginTop: 2 }} />
                      <div style={{ fontSize: 10.5, color: '#1e3a8a', fontWeight: 700, lineHeight: 1.35, flex: 1 }}>
                        "{activeG.call_script}"
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(activeG.call_script);
                          showToast('안내 멘트가 복사되었습니다');
                        }}
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: 3,
                          background: '#ffffff',
                          border: '1px solid #93c5fd',
                          color: '#1d4ed8',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2,
                          flexShrink: 0
                        }}
                      >
                        <Copy size={9} />
                        <span>복사</span>
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* 증상 미선택 시 대기 화면 */}
          {sessionList.length === 0 && !isLoadingPlan && (
            <div style={{ flex: 1, background: '#fff', borderRadius: 8, border: '2px dashed #94a3b8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <HelpCircle size={32} color="#94a3b8" />
              <span style={{ fontSize: 14, fontWeight: 800, color: '#334155' }}>증상 선택 대기</span>
              <span style={{ fontSize: 12, color: '#64748b' }}>
                좌측 목록에서 고객이 호소하는 증상을 클릭하십시오. 증상이 여러 개일 경우 계속 클릭하여 다수 증상을 동시에 관리할 수 있습니다.
              </span>
            </div>
          )}

          {isLoadingPlan && (
            <div style={{ flex: 1, background: '#fff', borderRadius: 8, border: '1.5px solid #94a3b8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Loader2 size={24} color="#2563eb" style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: 12, color: '#334155', fontWeight: 700 }}>대응 조치 계획 분석 중...</span>
            </div>
          )}

          {/* 증상 세션이 1개 이상 존재할 때 꽉 차는 활성 스튜디오 */}
          {sessionList.length > 0 && currentSession && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, overflow: 'hidden' }}>

              {/* ── [우측 최상단: 다수 증상 세션 탭 바 + 상황별 매뉴얼 수칙 버튼] ── */}
              <div style={{ background: '#fff', borderRadius: 8, border: '1.5px solid #94a3b8', padding: '5px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginRight: 4, color: '#475569', fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap' }}>
                    <Layers size={13} color="#2563eb" />
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
                          fontSize: 11,
                          fontWeight: isCurrent ? 800 : 600,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          border: isCurrent
                            ? '2px solid #1d4ed8'
                            : isResolved
                            ? '1.5px solid #86efac'
                            : isFault
                            ? '1.5px solid #fca5a5'
                            : '1px solid #cbd5e1',
                          background: isCurrent
                            ? '#dbeafe'
                            : isResolved
                            ? '#f0fdf4'
                            : isFault
                            ? '#fef2f2'
                            : '#ffffff',
                          color: isCurrent
                            ? '#1e40af'
                            : isResolved
                            ? '#15803d'
                            : isFault
                            ? '#b91c1c'
                            : '#334155',
                          boxShadow: isCurrent ? '0 1px 3px rgba(29,78,216,0.2)' : 'none',
                          transition: 'all 0.1s ease'
                        }}
                      >
                        <span>{s.title}</span>
                        <span style={{ fontSize: 9, padding: '0 4px', borderRadius: 3, background: 'rgba(0,0,0,0.06)' }}>
                          {isResolved ? '🟢해결' : isFault ? '🚨출장필요' : `STEP ${s.activeStepIndex + 1}`}
                        </span>
                        <button
                          onClick={(e) => handleCloseSession(s.key, e)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 0, display: 'flex', alignItems: 'center' }}
                        >
                          <X size={11} />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* 상황별 매뉴얼 긴급/수칙 가이드 토글 버튼 */}
                {specialGuides.length > 0 && (
                  <button
                    data-guide-toggle-btn
                    onClick={() => setShowGuidesModal(prev => !prev)}
                    style={{
                      padding: '3px 8px',
                      borderRadius: 5,
                      fontSize: 11,
                      fontWeight: 800,
                      background: showGuidesModal ? '#4338ca' : '#eef2ff',
                      color: showGuidesModal ? '#ffffff' : '#4338ca',
                      border: showGuidesModal ? '1.5px solid #3730a3' : '1.5px solid #c7d2fe',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      transition: 'all 0.1s ease'
                    }}
                  >
                    <BookOpen size={12} />
                    <span>상황별 수칙</span>
                  </button>
                )}
              </div>

              {/* [우측 1구역] 현재 활성 증상 헤더 & 표준 안내 스크립트 */}
              <div style={{ background: '#fff', borderRadius: 8, border: '1.5px solid #94a3b8', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
                      🎯 {currentSession.title}
                    </span>
                    <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 3, background: '#dbeafe', color: '#1e40af', fontWeight: 800, border: '1px solid #93c5fd' }}>
                      부품: {currentSession.part_code}
                    </span>
                    <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 3, background: currentSession.urgency === '긴급' ? '#fee2e2' : '#fef3c7', color: currentSession.urgency === '긴급' ? '#991b1b' : '#92400e', fontWeight: 800, border: currentSession.urgency === '긴급' ? '1px solid #f87171' : '1px solid #fcd34d' }}>
                      {currentSession.urgency}
                    </span>
                  </div>

                  {/* 해당 증상의 현재 진단 상태 */}
                  <div>
                    {currentSession.status === 'resolved_by_call' ? (
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 5, background: '#dcfce7', color: '#166534', fontWeight: 800, border: '1.5px solid #86efac', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle2 size={13} /> 🟢 이 증상은 전화로 해결됨
                      </span>
                    ) : currentSession.status === 'visit_required' ? (
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 5, background: '#fee2e2', color: '#991b1b', fontWeight: 800, border: '1.5px solid #fca5a5', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <ShieldAlert size={13} /> 🚨 이 증상은 AS 출장 접수 필요
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 5, background: '#eff6ff', color: '#1d4ed8', fontWeight: 800, border: '1.5px solid #bfdbfe', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <RefreshCw size={11} style={{ animation: 'spin 3s linear infinite' }} /> 🔵 단계별 진단-판정 진행 중
                      </span>
                    )}
                  </div>
                </div>

                {/* 표준 안내 스크립트 */}
                <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 5, padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Sparkles size={13} color="#2563eb" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 10, fontWeight: 800, color: '#1e40af', whiteSpace: 'nowrap' }}>표준 안내:</span>
                  <span style={{ fontSize: 11, color: '#1e293b', fontWeight: 600 }}>
                    "{currentSession.call_script}"
                  </span>
                </div>
              </div>

              {/* ── [제조사 공식 12대 계기판 에러 코드 퀵 칩 & 원클릭 직통 판정 콘솔] ── */}
              {currentSession.official_error_codes && currentSession.official_error_codes.length > 0 && (
                <div style={{
                  background: '#ffffff',
                  borderRadius: 8,
                  border: '2px solid #3b82f6',
                  padding: '8px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  boxShadow: '0 2px 6px rgba(59,130,246,0.1)',
                  flexShrink: 0
                }}>
                  {/* 패널 헤더: 타이틀 & 검색창 */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <Cpu size={15} color="#2563eb" />
                      <span style={{ fontSize: 12, fontWeight: 900, color: '#1e3a8a', whiteSpace: 'nowrap' }}>
                        계기판 에러 코드 (12종)
                      </span>
                      <span style={{ fontSize: 9, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '1px 5px', borderRadius: 3, fontWeight: 800, whiteSpace: 'nowrap' }}>
                        즉시 판정
                      </span>
                    </div>

                    {/* 코드 빠른 검색창 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, width: 220 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        borderRadius: 4,
                        padding: '2px 6px',
                        width: '100%'
                      }}>
                        <Search size={11} color="#64748b" />
                        <input
                          type="text"
                          placeholder="코드 검색 (예: 0-C, 0-0, 888, 35...)"
                          value={errorCodeFilter}
                          onChange={e => setErrorCodeFilter(e.target.value)}
                          style={{
                            border: 'none',
                            outline: 'none',
                            background: 'transparent',
                            fontSize: 10,
                            width: '100%'
                          }}
                        />
                        {errorCodeFilter && (
                          <button
                            onClick={() => setErrorCodeFilter('')}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#94a3b8' }}
                          >
                            <X size={10} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 12대 퀵 칩 가로 리스트 */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
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
                              gap: 4,
                              padding: '3px 7px',
                              borderRadius: 4,
                              fontSize: 10,
                              fontWeight: isSelected ? 900 : 700,
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                              border: isSelected
                                ? '2px solid #1d4ed8'
                                : isVisit
                                ? '1px solid #fca5a5'
                                : '1px solid #86efac',
                              background: isSelected
                                ? '#dbeafe'
                                : isVisit
                                ? '#fff5f5'
                                : '#f0fdf4',
                              color: isSelected
                                ? '#1e40af'
                                : isVisit
                                ? '#991b1b'
                                : '#166534',
                              boxShadow: isSelected ? '0 0 0 1.5px rgba(29,78,216,0.3)' : 'none',
                              transition: 'all 0.1s ease'
                            }}
                          >
                            <span style={{
                              fontWeight: 900,
                              fontFamily: 'monospace',
                              background: isSelected ? '#1d4ed8' : isVisit ? '#ef4444' : '#16a34a',
                              color: '#ffffff',
                              padding: '0 4px',
                              borderRadius: 3,
                              fontSize: 9
                            }}>
                              {ec.code}
                            </span>
                            <span>{ec.name}</span>
                            <span style={{ fontSize: 9 }}>
                              {isVisit ? '🚨' : '🟢'}
                            </span>
                          </button>
                        );
                      })}
                  </div>

                  {/* 칩 선택 시 활성화되는 [원클릭 즉시 판정 카드] */}
                  {currentSession.selectedErrorCode && (
                    <div style={{
                      background: currentSession.selectedErrorCode.resolution_type === 'VISIT_REQUIRED' ? '#fef2f2' : '#f0fdf4',
                      border: currentSession.selectedErrorCode.resolution_type === 'VISIT_REQUIRED' ? '1.5px solid #f87171' : '1.5px solid #4ade80',
                      borderRadius: 6,
                      padding: '8px 10px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{
                            fontSize: 12,
                            fontWeight: 900,
                            fontFamily: 'monospace',
                            background: currentSession.selectedErrorCode.resolution_type === 'VISIT_REQUIRED' ? '#dc2626' : '#16a34a',
                            color: '#ffffff',
                            padding: '1px 6px',
                            borderRadius: 4
                          }}>
                            {currentSession.selectedErrorCode.code}
                          </span>
                          <span style={{ fontSize: 12, fontWeight: 900, color: '#0f172a' }}>
                            {currentSession.selectedErrorCode.name} ({currentSession.selectedErrorCode.category})
                          </span>
                          <span style={{
                            fontSize: 9,
                            fontWeight: 800,
                            padding: '1px 5px',
                            borderRadius: 3,
                            background: currentSession.selectedErrorCode.resolution_type === 'VISIT_REQUIRED' ? '#fee2e2' : '#dcfce7',
                            color: currentSession.selectedErrorCode.resolution_type === 'VISIT_REQUIRED' ? '#b91c1c' : '#15803d',
                            border: currentSession.selectedErrorCode.resolution_type === 'VISIT_REQUIRED' ? '1px solid #fca5a5' : '1px solid #86efac'
                          }}>
                            {currentSession.selectedErrorCode.resolution_type === 'VISIT_REQUIRED' ? '🚨 AS 출장 접수 대상' : '🟢 전화 자가해결 종결 가능'}
                          </span>
                        </div>

                        <button
                          onClick={handleClearSelectedErrorCode}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: 10,
                            color: '#64748b',
                            textDecoration: 'underline'
                          }}
                        >
                          선택 해제
                        </button>
                      </div>

                      {/* 상태/원인 설명 */}
                      <div style={{ fontSize: 11, color: '#334155', fontWeight: 600 }}>
                        <span style={{ fontWeight: 800, color: '#0f172a' }}>원인: </span>
                        {currentSession.selectedErrorCode.meaning}
                      </div>

                      {/* 표준 음성 안내 (Call Script) */}
                      <div style={{
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: 4,
                        padding: '6px 8px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 6
                      }}>
                        <Sparkles size={12} color="#2563eb" style={{ flexShrink: 0, marginTop: 2 }} />
                        <span style={{ fontSize: 11, color: '#0f172a', fontWeight: 700, lineHeight: 1.4 }}>
                          "{currentSession.selectedErrorCode.call_script}"
                        </span>
                      </div>

                      {/* 직통 판정 확정 버튼 */}
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
                              padding: '7px 12px',
                              background: '#16a34a',
                              color: '#fff',
                              border: 'none',
                              borderRadius: 5,
                              fontSize: 12,
                              fontWeight: 900,
                              cursor: 'pointer',
                              boxShadow: '0 1px 3px rgba(22,163,74,0.3)'
                            }}
                          >
                            <CheckCircle2 size={14} />
                            <span>🟢 [{currentSession.selectedErrorCode.code}] 자가 조치 안내 완료 (해결 종결)</span>
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
                              padding: '7px 12px',
                              background: '#dc2626',
                              color: '#fff',
                              border: 'none',
                              borderRadius: 5,
                              fontSize: 12,
                              fontWeight: 900,
                              cursor: 'pointer',
                              boxShadow: '0 1px 3px rgba(220,38,38,0.3)'
                            }}
                          >
                            <ShieldAlert size={14} />
                            <span>🚨 [{currentSession.selectedErrorCode.code}] AS 출장 접수 확정 (부품: {currentSession.selectedErrorCode.part_code || currentSession.part_code})</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* [우측 2구역] 현재 증상의 스텝 네비게이션 프로그레스 바 */}
              <div style={{ background: '#fff', borderRadius: 8, border: '1.5px solid #94a3b8', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: '#475569', whiteSpace: 'nowrap' }}>진단 절차:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1, overflowX: 'auto' }}>
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
                          gap: 4,
                          padding: '3px 8px',
                          borderRadius: 5,
                          fontSize: 11,
                          fontWeight: isSelected ? 800 : 600,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          border: isSelected
                            ? '2px solid #1d4ed8'
                            : isResolved
                            ? '1.5px solid #16a34a'
                            : isUnresolved
                            ? '1.5px solid #dc2626'
                            : '1px solid #cbd5e1',
                          background: isSelected
                            ? '#dbeafe'
                            : isResolved
                            ? '#f0fdf4'
                            : isUnresolved
                            ? '#fef2f2'
                            : '#ffffff',
                          color: isSelected
                            ? '#1e40af'
                            : isResolved
                            ? '#15803d'
                            : isUnresolved
                            ? '#b91c1c'
                            : '#475569',
                          transition: 'all 0.1s ease'
                        }}
                      >
                        <span>STEP {st.step_no}</span>
                        {isResolved && <Check size={11} color="#16a34a" />}
                        {isUnresolved && <X size={11} color="#dc2626" />}
                        {idx < currentSession.steps.length - 1 && (
                          <ChevronRight size={11} color="#94a3b8" style={{ marginLeft: 2 }} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* [우측 3구역] 실시간 진단-판정 콘솔 (현재 증상 트리의 Active Step 카드) */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto' }}>

                {activeStep && (
                  <div style={{ background: '#fff', borderRadius: 8, border: '2px solid #2563eb', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10, boxShadow: '0 2px 8px rgba(37,99,235,0.06)' }}>

                    {/* 스텝 제목 & 현재 상태 */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 900, background: '#1d4ed8', color: '#fff', padding: '1px 6px', borderRadius: 4 }}>
                          STEP {activeStep.step_no}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>
                          {activeStep.title}
                        </span>
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 700, color: activeStep.status === 'resolved' ? '#16a34a' : activeStep.status === 'unresolved' ? '#dc2626' : '#2563eb' }}>
                        {activeStep.status === 'resolved' ? '🟢 정상 해결됨' : activeStep.status === 'unresolved' ? '🔴 불량 판정' : '🔵 현재 안내 진행 중'}
                      </span>
                    </div>

                    {/* 1. 조치 및 시험 방법 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, background: '#f8fafc', padding: '8px 10px', borderRadius: 5, border: '1px solid #cbd5e1' }}>
                      <label style={{ fontSize: 10, fontWeight: 800, color: '#334155' }}>
                        📌 [조치 및 시험 방법] (고객에게 실행하도록 안내하십시오)
                      </label>
                      <p style={{ margin: 0, fontSize: 12, color: '#0f172a', fontWeight: 600, lineHeight: 1.45 }}>
                        {activeStep.method || activeStep.title}
                      </p>
                    </div>

                    {/* 2. 정상 vs 불량 판정 기준 */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 5, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle2 size={12} color="#16a34a" />
                          <span style={{ fontSize: 10, fontWeight: 800, color: '#166534' }}>정상 판정 조건 (해결)</span>
                        </div>
                        <span style={{ fontSize: 11, color: '#14532d', fontWeight: 600, lineHeight: 1.35 }}>
                          {activeStep.criteria_normal || '정상 작동 및 계기판 정상 표시'}
                        </span>
                      </div>

                      <div style={{ background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 5, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <AlertTriangle size={12} color="#dc2626" />
                          <span style={{ fontSize: 10, fontWeight: 800, color: '#991b1b' }}>불량 판정 조건 (미해결)</span>
                        </div>
                        <span style={{ fontSize: 11, color: '#7f1d1d', fontWeight: 600, lineHeight: 1.35 }}>
                          {activeStep.criteria_fault || '증상 지속 또는 전압/동작 이상'}
                        </span>
                      </div>
                    </div>

                    {/* 3. 판정 액션 버튼 바 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 2 }}>
                      <button
                        onClick={() => handleStepResolve(currentSession.activeStepIndex)}
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 5,
                          background: '#16a34a',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: 6,
                          height: 36,
                          fontSize: 12,
                          fontWeight: 800,
                          cursor: 'pointer',
                          boxShadow: '0 2px 4px rgba(22,163,74,0.2)',
                          transition: 'all 0.1s ease'
                        }}
                      >
                        <Check size={14} />
                        🟢 정상 판정 (이 조치로 해결됨)
                      </button>

                      <button
                        onClick={() => handleStepFail(currentSession.activeStepIndex)}
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 5,
                          background: currentSession.activeStepIndex >= currentSession.steps.length - 1 ? '#dc2626' : '#ea580c',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: 6,
                          height: 36,
                          fontSize: 12,
                          fontWeight: 800,
                          cursor: 'pointer',
                          boxShadow: '0 2px 4px rgba(234,88,12,0.2)',
                          transition: 'all 0.1s ease'
                        }}
                      >
                        {currentSession.activeStepIndex >= currentSession.steps.length - 1 ? (
                          <>
                            <AlertTriangle size={14} />
                            🔴 최종 불량 (모든 조치 실패 ➔ AS 출장 접수 전환)
                          </>
                        ) : (
                          <>
                            <ArrowRight size={14} />
                            🔴 불량 / 여전히 안 됨 (다음 조치 STEP {currentSession.activeStepIndex + 2} 시도 ➔)
                          </>
                        )}
                      </button>
                    </div>

                  </div>
                )}

                {/* 현재 증상의 전체 진단 절차 타임라인 요약 */}
                <div style={{ background: '#fff', borderRadius: 8, border: '1.5px solid #94a3b8', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: '#334155' }}>
                    [{currentSession.title}] 진단 단계 현황
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {currentSession.steps.map((st, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleStepSelect(idx)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '5px 8px',
                          borderRadius: 5,
                          border: idx === currentSession.activeStepIndex ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                          background: idx === currentSession.activeStepIndex ? '#eff6ff' : '#f8fafc',
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ fontSize: 10, fontWeight: 800, color: '#1e40af' }}>STEP {st.step_no}</span>
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#0f172a' }}>{st.title}</span>
                        </div>
                        <span style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: st.status === 'resolved' ? '#16a34a' : st.status === 'unresolved' ? '#dc2626' : st.status === 'active' ? '#2563eb' : '#64748b'
                        }}>
                          {st.status === 'resolved' ? '🟢 해결됨' : st.status === 'unresolved' ? '🔴 불량 판정' : st.status === 'active' ? '🔵 현재 단계' : '⚪ 대기'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 과거 유사 상담 사례 */}
                <div style={{ background: '#fff', borderRadius: 8, border: '1.5px solid #cbd5e1', padding: '6px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div
                    onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <History size={12} color="#475569" />
                      <span style={{ fontSize: 10, fontWeight: 800, color: '#334155' }}>
                        과거 유사 상담 사례 ({kbResults.length}건)
                      </span>
                      {isLoadingKb && <Loader2 size={10} color="#2563eb" style={{ animation: 'spin 1s linear infinite' }} />}
                    </div>
                    {isHistoryExpanded ? <ChevronUp size={12} color="#64748b" /> : <ChevronDown size={12} color="#64748b" />}
                  </div>

                  {isHistoryExpanded && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 4, paddingTop: 3 }}>
                      {kbResults.map((r, i) => (
                        <div key={r.id || i} style={{ border: '1px solid #cbd5e1', borderRadius: 5, padding: '5px 7px', background: '#f8fafc', fontSize: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                            <span style={{ fontWeight: 800, color: '#1d4ed8' }}>{Math.round(r.similarity * 100)}% 일치</span>
                            <span style={{ color: '#64748b' }}>{r.equipment_model}</span>
                          </div>
                          <p style={{ margin: 0, color: '#1e293b', lineHeight: 1.25 }}>{r.summary}</p>
                        </div>
                      ))}
                      {kbResults.length === 0 && (
                        <div style={{ padding: 8, textAlign: 'center', color: '#64748b', fontSize: 10 }}>
                          과거 유사 사례 없음
                        </div>
                      )}
                    </div>
                  )}
                </div>

              </div>

              {/* [우측 4구역] 하단 종합 종결 바 (Terminal Action, 전체 증상 통합 판정) */}
              <div style={{ background: '#fff', borderRadius: 8, border: '1.5px solid #94a3b8', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, boxShadow: '0 -2px 6px rgba(0,0,0,0.03)' }}>
                {/* 종합 상태 뱃지 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 140 }}>
                  <label style={{ fontSize: 9, fontWeight: 800, color: '#475569' }}>전체 종합 판정 ({sessionList.length}건)</label>
                  <div>
                    {overallStatus === 'visit_required' ? (
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <ShieldAlert size={13} /> 🚨 출장 접수 필수 (일부 불량)
                      </span>
                    ) : overallStatus === 'resolved_by_call' ? (
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <CheckCircle2 size={13} /> 🟢 전 증상 자가조치 완료
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#2563eb', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <RefreshCw size={11} style={{ animation: 'spin 3s linear infinite' }} /> 🔵 진단 진행 중
                      </span>
                    )}
                  </div>
                </div>

                {/* 특이사항 메모 입력창 */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <label style={{ fontSize: 9, fontWeight: 800, color: '#475569' }}>진단 및 통화 메모</label>
                  <input
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="복수 증상 종합 특이사항 메모 입력"
                    style={{ border: '1.5px solid #94a3b8', borderRadius: 5, padding: '4px 8px', fontSize: 11, outline: 'none', height: 28, boxSizing: 'border-box', background: '#fff' }}
                  />
                </div>

                {/* 1. 직접조치 완료 저장 버튼 (모든 증상이 해결되었을 때만 가능) */}
                <button
                  onClick={() => handleSave(false)}
                  disabled={isSaving || overallStatus === 'visit_required'}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    background: overallStatus === 'resolved_by_call' ? '#16a34a' : '#ffffff',
                    color: overallStatus === 'resolved_by_call' ? '#ffffff' : '#0f172a',
                    border: overallStatus === 'resolved_by_call' ? '1.5px solid #15803d' : '1.5px solid #64748b',
                    borderRadius: 5,
                    padding: '0 14px',
                    fontSize: 11,
                    fontWeight: 800,
                    cursor: overallStatus === 'visit_required' ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap',
                    height: 30,
                    opacity: overallStatus === 'visit_required' ? 0.35 : 1,
                    boxShadow: overallStatus === 'resolved_by_call' ? '0 2px 6px rgba(22,163,74,0.3)' : 'none'
                  }}
                >
                  <Wrench size={12} />
                  전체 직접조치 완료
                </button>

                {/* 2. AS 출동 예약 접수 버튼 (1개라도 출장 필요 시 강조) */}
                <button
                  onClick={() => handleSave(true)}
                  disabled={isSaving}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    background: overallStatus === 'visit_required' ? '#dc2626' : '#ffffff',
                    color: overallStatus === 'visit_required' ? '#ffffff' : '#dc2626',
                    border: overallStatus === 'visit_required' ? '1.5px solid #991b1b' : '1.5px solid #dc2626',
                    borderRadius: 5,
                    padding: '0 16px',
                    fontSize: 11,
                    fontWeight: 800,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    height: 30,
                    opacity: isSaving ? 0.5 : 1,
                    boxShadow: overallStatus === 'visit_required' ? '0 2px 6px rgba(220,38,38,0.3)' : 'none'
                  }}
                >
                  {isSaving ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <AlertTriangle size={12} />}
                  통합 AS 출동 예약 전환
                </button>
              </div>

            </div>
          )}

        </div>

      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input:focus { border-color: #2563eb !important; box-shadow: 0 0 0 2px rgba(37,99,235,0.15); }
        button:active { opacity: 0.85; }
      `}</style>
    </div>
  );
}
