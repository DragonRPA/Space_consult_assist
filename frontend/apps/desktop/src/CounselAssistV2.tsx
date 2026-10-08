import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Phone, Search, ChevronRight, AlertTriangle,
  Loader2, RotateCcw, Wrench, CheckCircle2,
  History, Sparkles, X, ChevronDown,
  ChevronUp, Check, ArrowRight, RefreshCw, ShieldAlert,
  Layers, Cpu, FileText, BookOpen, Copy, Clock
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
  status?: 'pending' | 'active' | 'resolved' | 'unresolved';
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

// ─── 전체 상담 스냅샷 및 이력/대기열 레코드 규격 ──────────────────────────────────
export interface ConsultSessionRecord {
  id: string;
  timestamp: string;
  updatedAt: string;
  status: CounselStatus;
  customerName: string;
  manager: string;
  phone: string;
  serialNumber: string;
  modelName: string;
  activeSymptomKey: string | null;
  symptomSessions: Record<string, SymptomSession>;
  notes: string;
  counselorName: string;
  summaryText: string;
  currentStepSummary: string;
  selectedErrorCodes: string[];
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

const API = 'http://127.0.0.1:8000/api/v1';

const EQUIPMENT_MODELS = ['J600T', 'J800', 'S7', 'S5', 'S1', 'S3', 'W12', 'W15', 'S2', 'S12', '쓰담', '전체'];
const SYMPTOM_CATEGORIES = ['전체', '에러코드', '충전/전원', '흡입/잔수', '브러시/구동', '세척수/배관', '외관/기타'];

// ── 한글 초성 분해 및 통합 검색 엔진 ──────────────────────────────────────────
const CHOSUNG_LIST = [
  'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ',
  'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'
];

export function extractChosung(str: string): string {
  if (!str) return '';
  let res = '';
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code >= 0xac00 && code <= 0xd7a3) {
      const chosungIndex = Math.floor((code - 0xac00) / 588);
      res += CHOSUNG_LIST[chosungIndex];
    } else {
      res += str[i];
    }
  }
  return res;
}

export function cleanForSearch(str: string): string {
  return (str || '').replace(/[\s\-_.,/()[\]]/g, '').toLowerCase();
}

export function matchesChosungOrText(target: string | undefined | null, query: string): boolean {
  if (!target || !query) return false;
  const tNorm = target.toLowerCase();
  const qNorm = query.toLowerCase();

  // 1. 단순 텍스트 포함
  if (tNorm.includes(qNorm)) return true;

  // 2. 공백/특수문자 제거 후 텍스트 포함
  const tClean = cleanForSearch(target);
  const qClean = cleanForSearch(query);
  if (tClean.includes(qClean)) return true;

  // 3. 초성 분해 포함
  const tChosung = extractChosung(tNorm);
  const qChosung = extractChosung(qNorm);
  if (tChosung.includes(qChosung)) return true;

  // 4. 공백/특수문자 제거 후 초성 포함
  const tCleanChosung = extractChosung(tClean);
  const qCleanChosung = extractChosung(qClean);
  if (tCleanChosung.includes(qCleanChosung)) return true;

  return false;
}

export function calculateSymptomMatchScore(preset: SymptomPreset, query: string): number {
  if (!query || !query.trim()) return 1;
  const q = query.trim().toLowerCase();
  let score = 0;

  // 1. Title 매칭
  if (matchesChosungOrText(preset.title, q)) {
    const titleNorm = preset.title.toLowerCase();
    const titleChosung = extractChosung(titleNorm);
    if (titleNorm.startsWith(q) || titleChosung.startsWith(extractChosung(q))) {
      score = Math.max(score, 100);
    } else {
      score = Math.max(score, 80);
    }
  }

  // 2. Aliases 매칭
  if (preset.aliases && preset.aliases.length > 0) {
    for (const alias of preset.aliases) {
      if (matchesChosungOrText(alias, q)) {
        score = Math.max(score, 60);
        break;
      }
    }
  }

  // 3. Official Error Codes 매칭 (code, name, meaning)
  if (preset.official_error_codes && preset.official_error_codes.length > 0) {
    for (const ec of preset.official_error_codes) {
      if (
        matchesChosungOrText(ec.code, q) ||
        matchesChosungOrText(ec.name, q) ||
        matchesChosungOrText(ec.meaning, q)
      ) {
        score = Math.max(score, 50);
        break;
      }
    }
  }

  // 4. Symptom 설명 매칭
  if (matchesChosungOrText(preset.symptom, q)) {
    score = Math.max(score, 40);
  }

  // 5. Part Code 또는 Category 매칭
  if (matchesChosungOrText(preset.part_code, q) || matchesChosungOrText(preset.category, q)) {
    score = Math.max(score, 30);
  }

  return score;
}

export function matchesIntegratedSessionQuery(record: ConsultSessionRecord, fullQuery: string): boolean {
  if (!fullQuery || !fullQuery.trim()) return true;
  const tokens = fullQuery.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;

  const rawPhone = record.phone || '';
  const cleanDigitsPhone = rawPhone.replace(/\D/g, '');

  return tokens.every(token => {
    const tLower = token.toLowerCase();
    const tokenDigits = token.replace(/\D/g, '');

    // ① 전화번호 매칭 (부분 일치, 숫자만 일치, 뒷자리 일치)
    if (rawPhone && rawPhone.toLowerCase().includes(tLower)) return true;
    if (tokenDigits.length >= 2 && cleanDigitsPhone.includes(tokenDigits)) return true;

    // ② 고객명 (초성 및 텍스트)
    if (matchesChosungOrText(record.customerName, token)) return true;

    // ③ 담당자 (초성 및 텍스트)
    if (matchesChosungOrText(record.manager, token)) return true;

    // ④ 장비 모델명
    if (matchesChosungOrText(record.modelName, token)) return true;

    // ⑤ 시리얼 번호
    if (matchesChosungOrText(record.serialNumber, token)) return true;

    // ⑥ 에러코드 매칭 (예: "888", "EH", "E01")
    if (record.selectedErrorCodes && record.selectedErrorCodes.some(c =>
      c.toLowerCase().includes(tLower) || `에러코드 ${c}`.toLowerCase().includes(tLower)
    )) return true;

    // ⑦ 요약 및 현재 단계 요약 (초성 및 텍스트)
    if (matchesChosungOrText(record.summaryText, token)) return true;
    if (matchesChosungOrText(record.currentStepSummary, token)) return true;

    // ⑧ 메모 (초성 및 텍스트)
    if (matchesChosungOrText(record.notes, token)) return true;

    // ⑨ 상담원 이름
    if (matchesChosungOrText(record.counselorName, token)) return true;

    // ⑩ 등록된 개별 증상 세션들 내부 검사
    if (record.symptomSessions) {
      for (const sKey of Object.keys(record.symptomSessions)) {
        const s = record.symptomSessions[sKey];
        if (!s) continue;
        if (matchesChosungOrText(s.title, token)) return true;
        if (matchesChosungOrText(s.part_code, token)) return true;
        if (s.selectedErrorCode && (
          s.selectedErrorCode.code.toLowerCase().includes(tLower) ||
          matchesChosungOrText(s.selectedErrorCode.name, token)
        )) return true;
        if (s.steps && s.steps.some(st =>
          matchesChosungOrText(st.title, token) || matchesChosungOrText(st.method, token)
        )) return true;
      }
    }

    return false;
  });
}

export interface CounselAssistV2Props {
  initialOpenGuides?: boolean;
}

export default function CounselAssistV2({ initialOpenGuides }: CounselAssistV2Props = {}) {
  // ① 고객 및 장비 선택
  const [searchText, setSearchText]                 = useState('');
  const [searchResults, setSearchResults]           = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer]     = useState<Customer | null>(null);
  const [customerPhone, setCustomerPhone]           = useState('');
  const [selectedModel, setSelectedModel]           = useState<string>('J600T');
  const [isSearching, setIsSearching]               = useState(false);
  const [dropdownOpen, setDropdownOpen]             = useState(false);

  // ①-2 모델 하드웨어 제원 & 상황별 매뉴얼 가이드
  const [currentModelSpec, setCurrentModelSpec]     = useState<ModelSpec | null>(() => DEFAULT_MODEL_SPECS['J600T'] || null);
  const [showModelSpec, setShowModelSpec]           = useState(false);
  const [specialGuides, setSpecialGuides]           = useState<SpecialGuide[]>(DEFAULT_SPECIAL_GUIDES);
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
        if (data.special_guides && data.special_guides.length > 0) {
          setSpecialGuides(data.special_guides);
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
    setCustomerPhone(c.phone || '');
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

  const PENDING_STORAGE_KEY = 'space_consult_pending_sessions';
  const HISTORY_STORAGE_KEY = 'space_consult_history_records';

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
    let localList: ConsultSessionRecord[] = [];
    try {
      const raw = localStorage.getItem(PENDING_STORAGE_KEY);
      if (raw) localList = JSON.parse(raw);
    } catch {}

    try {
      const res = await fetch(`${API}/counsel/pending`, {
        headers: { 'Authorization': 'Bearer space-advisor-desktop-agent' }
      });
      if (res.ok) {
        const data = await res.json();
        const serverItems = (data.items || []).map((item: any): ConsultSessionRecord => {
          if (item.session_snapshot) {
            return item.session_snapshot;
          }
          return {
            id: item.id,
            timestamp: item.timestamp,
            updatedAt: item.timestamp,
            status: 'in_progress',
            customerName: item.customer_name,
            manager: item.manager,
            phone: '',
            serialNumber: item.serial_number,
            modelName: item.model_name,
            activeSymptomKey: null,
            symptomSessions: {},
            notes: item.action,
            counselorName: '',
            summaryText: item.symptom,
            currentStepSummary: item.keyword,
            selectedErrorCodes: item.keyword ? [item.keyword] : []
          };
        });

        const map = new Map<string, ConsultSessionRecord>();
        serverItems.forEach((s: ConsultSessionRecord) => map.set(s.id, s));
        localList.forEach(l => {
          if (!map.has(l.id)) map.set(l.id, l);
        });
        const merged = Array.from(map.values()).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setPendingSessions(merged);
        try { localStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(merged)); } catch {}
        return;
      }
    } catch {}

    setPendingSessions(localList);
  }, []);

  const loadHistoryRecords = useCallback(async () => {
    let localList: ConsultSessionRecord[] = [];
    try {
      const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (raw) localList = JSON.parse(raw);
    } catch {}

    try {
      const res = await fetch(`${API}/counsel/history?limit=50`, {
        headers: { 'Authorization': 'Bearer space-advisor-desktop-agent' }
      });
      if (res.ok) {
        const data = await res.json();
        const serverItems = (data.items || []).map((item: any): ConsultSessionRecord => {
          if (item.session_snapshot) {
            return item.session_snapshot;
          }
          return {
            id: item.id,
            timestamp: item.timestamp,
            updatedAt: item.timestamp,
            status: item.is_completed ? (item.is_visit_required ? 'visit_required' : 'resolved_by_call') : 'in_progress',
            customerName: item.customer_name,
            manager: item.manager,
            phone: '',
            serialNumber: item.serial_number,
            modelName: item.model_name,
            activeSymptomKey: null,
            symptomSessions: {},
            notes: item.action,
            counselorName: '',
            summaryText: item.symptom,
            currentStepSummary: item.action,
            selectedErrorCodes: item.keyword ? [item.keyword] : []
          };
        });

        const map = new Map<string, ConsultSessionRecord>();
        serverItems.forEach((s: ConsultSessionRecord) => map.set(s.id, s));
        localList.forEach(l => {
          if (!map.has(l.id)) map.set(l.id, l);
        });
        const merged = Array.from(map.values()).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setHistoryRecords(merged);
        try { localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(merged)); } catch {}
        return;
      }
    } catch {}

    setHistoryRecords(localList);
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
      const sessionId = currentSessionId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `sess_${Date.now()}`);
      const nowIso = new Date().toISOString();

      const selectedCodes: string[] = [];
      sessionList.forEach(s => {
        if (s.selectedErrorCode && !selectedCodes.includes(s.selectedErrorCode.code)) {
          selectedCodes.push(s.selectedErrorCode.code);
        }
      });

      const activeSession = currentSession;
      let stepSummary = '진단 준비';
      if (activeSession) {
        const activeStepObj = activeSession.steps[activeSession.activeStepIndex];
        stepSummary = `${activeSession.title}: STEP ${activeSession.activeStepIndex + 1} (${activeStepObj?.title || '조치 중'}) 진행 중`;
      } else if (sessionList.length > 0) {
        stepSummary = `${sessionList[0].title} 외 ${sessionList.length - 1}건 진행 중`;
      }

      const sessionSummaries = sessionList.map(s => {
        const stepLogs = s.steps.map(st => {
          const mark = st.status === 'resolved' ? '🟢해결' : st.status === 'unresolved' ? '🔴불량' : st.status === 'active' ? '🔵진행' : '⚪대기';
          return `STEP ${st.step_no} ${st.title} (${mark})`;
        }).join(' / ');
        const errCodeLog = s.selectedErrorCode ? ` (선택 에러코드: [${s.selectedErrorCode.code}] ${s.selectedErrorCode.name})` : '';
        return `[증상: ${s.title}${errCodeLog} | 🔵진행중(고객확인대기)]\n - 조치내역: ${stepLogs}`;
      }).join('\n');

      const allSymptoms = sessionList.map(s => s.title).join(', ') || customSymptom;
      const finalAction = `${sessionSummaries}\n[고객 재통화 대기 메모] ${notes || '조치 확인 후 재연락 예정'}`.trim();

      const newRecord: ConsultSessionRecord = {
        id: sessionId,
        timestamp: nowIso,
        updatedAt: nowIso,
        status: 'in_progress',
        customerName: selectedCustomer?.name ?? (searchText.trim() || '일반 고객'),
        manager: selectedCustomer?.manager ?? '',
        phone: customerPhone.trim() || selectedCustomer?.phone || '',
        serialNumber: selectedCustomer?.serialNumber ?? '',
        modelName: selectedModel,
        activeSymptomKey,
        symptomSessions,
        notes,
        counselorName: counselorName || '상담원',
        summaryText: allSymptoms,
        currentStepSummary: stepSummary,
        selectedErrorCodes: selectedCodes
      };

      const updatedPending = [newRecord, ...pendingSessions.filter(p => p.id !== sessionId)];
      setPendingSessions(updatedPending);
      try { localStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(updatedPending)); } catch {}

      const updatedHistory = [newRecord, ...historyRecords.filter(h => h.id !== sessionId)];
      setHistoryRecords(updatedHistory);
      try { localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updatedHistory)); } catch {}

      showToast('✓ 고객 확인 대기 상태로 저장되었습니다. [진행중 상담] 목록에서 언제든 이어할 수 있습니다.', 3500);
      handleReset();

      try {
        await fetch(`${API}/counsel/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer space-advisor-desktop-agent'
          },
          body: JSON.stringify({
            id: sessionId,
            customer_name: newRecord.customerName,
            manager: newRecord.manager,
            phone: newRecord.phone,
            serial_number: newRecord.serialNumber,
            model_name: newRecord.modelName,
            keyword: selectedCodes.join(', ') || sessionList[0]?.title || '고객확인대기',
            part_code: sessionList.map(s => s.part_code).join(', ') || 'GENERAL',
            symptoms: allSymptoms,
            action_taken: finalAction,
            is_completed: false,
            is_visit_required: false,
            counselor_name: counselorName || '상담원',
            session_snapshot: newRecord
          })
        });
      } catch {}
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
      assetModel: record.modelName,
      serialNumber: record.serialNumber,
      salesType: '렌탈',
      historyTimeline: []
    });
    setSearchText(record.customerName);
    setCustomerPhone(record.phone || '');
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
    const nextList = pendingSessions.filter(p => p.id !== id);
    setPendingSessions(nextList);
    try { localStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(nextList)); } catch {}

    try {
      await fetch(`${API}/counsel/session/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer space-advisor-desktop-agent' }
      });
    } catch {}

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
      const sessionId = currentSessionId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `sess_${Date.now()}`);
      const nowIso = new Date().toISOString();

      const selectedCodes: string[] = [];
      sessionList.forEach(s => {
        if (s.selectedErrorCode && !selectedCodes.includes(s.selectedErrorCode.code)) {
          selectedCodes.push(s.selectedErrorCode.code);
        }
      });

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

      const newRecord: ConsultSessionRecord = {
        id: sessionId,
        timestamp: nowIso,
        updatedAt: nowIso,
        status: isVisit ? 'visit_required' : 'resolved_by_call',
        customerName: selectedCustomer?.name ?? (searchText.trim() || '일반 고객'),
        manager: selectedCustomer?.manager ?? '',
        phone: customerPhone.trim() || selectedCustomer?.phone || '',
        serialNumber: selectedCustomer?.serialNumber ?? '',
        modelName: selectedModel,
        activeSymptomKey,
        symptomSessions,
        notes,
        counselorName: counselorName || '상담원',
        summaryText: allSymptoms,
        currentStepSummary: isVisit ? '🚨 AS 출동 예약 접수 완료' : '🟢 직접조치 종결 완료',
        selectedErrorCodes: selectedCodes
      };

      const updatedPending = pendingSessions.filter(p => p.id !== sessionId);
      setPendingSessions(updatedPending);
      try { localStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(updatedPending)); } catch {}

      const updatedHistory = [newRecord, ...historyRecords.filter(h => h.id !== sessionId)];
      setHistoryRecords(updatedHistory);
      try { localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updatedHistory)); } catch {}

      showToast(isVisit ? '복수 증상 AS 출동 예약 접수 완료' : '복수 증상 직접조치 완료 저장');
      handleReset();

      try {
        await fetch(`${API}/counsel/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer space-advisor-desktop-agent'
          },
          body: JSON.stringify({
            id: sessionId,
            customer_name:     newRecord.customerName,
            manager:           newRecord.manager,
            phone:             newRecord.phone,
            serial_number:     newRecord.serialNumber,
            model_name:        newRecord.modelName,
            keyword:           selectedCodes.join(', ') || (sessionList[0]?.title ?? customSymptom),
            part_code:         sessionList.map(s => s.part_code).join(', ') || 'GENERAL',
            symptoms:          allSymptoms,
            action_taken:      finalAction,
            is_completed:      true,
            is_visit_required: isVisit,
            counselor_name:    counselorName || '상담원',
            session_snapshot:  newRecord
          }),
        });
      } catch {}
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
    setCustomSymptom('');
    setSymptomSessions({});
    setActiveSymptomKey(null);
    setKbResults([]);
    setNotes('');
  };


  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Pretendard', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif", letterSpacing: '-0.015em', height: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column', background: '#f8fafc', overflow: 'hidden' }}>

      {/* 토스트 알림 */}
      {toast && (
        <div style={{ position: 'fixed', top: 16, right: 20, zIndex: 9999, background: '#0f172a', color: '#fff', borderRadius: 8, padding: '10px 18px', fontSize: 12.5, fontWeight: 600, boxShadow: '0 8px 24px rgba(0,0,0,0.18)', border: '1px solid #334155' }}>
          {toast}
        </div>
      )}

      {/* ── [최상단 서브 툴바] ── */}
      <div style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '0 16px', display: 'flex', alignItems: 'center', height: 42, gap: 12, flexShrink: 0, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <Phone size={14} color="#2563eb" />
          <span style={{ fontWeight: 800, fontSize: 13, color: '#0f172a', whiteSpace: 'nowrap' }}>상담 지원</span>
        </div>

        {/* 현재 통화 내 진단 중인 증상 수 뱃지 */}
        {sessionList.length > 0 && (
          <span style={{ fontSize: 11, fontWeight: 700, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #dbeafe', padding: '2px 8px', borderRadius: 12 }}>
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
            gap: 5,
            padding: '4px 10px',
            borderRadius: 6,
            fontSize: 11.5,
            fontWeight: 700,
            background: pendingSessions.length > 0 ? '#fffbeb' : '#ffffff',
            color: pendingSessions.length > 0 ? '#b45309' : '#475569',
            border: pendingSessions.length > 0 ? '1px solid #fde68a' : '1px solid #e2e8f0',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            height: 28,
            boxShadow: pendingSessions.length > 0 ? '0 1px 2px rgba(245, 158, 11, 0.15)' : 'none',
            transition: 'all 0.15s ease'
          }}
        >
          <Clock size={12} color={pendingSessions.length > 0 ? '#d97706' : '#64748b'} />
          <span>대기열</span>
          <span style={{
            fontSize: 10,
            fontWeight: 800,
            background: pendingSessions.length > 0 ? '#d97706' : '#f1f5f9',
            color: pendingSessions.length > 0 ? '#ffffff' : '#64748b',
            padding: '1px 5px',
            borderRadius: 8,
            marginLeft: 1
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
            gap: 5,
            padding: '4px 10px',
            borderRadius: 6,
            fontSize: 11.5,
            fontWeight: 600,
            background: '#ffffff',
            color: '#334155',
            border: '1px solid #e2e8f0',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            height: 28,
            transition: 'all 0.15s ease'
          }}
        >
          <History size={12} color="#64748b" />
          <span>상담 이력</span>
        </button>

        {/* 3. 상황별 수칙 바로가기 버튼 */}
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
            padding: '4px 10px',
            borderRadius: 6,
            fontSize: 11.5,
            fontWeight: 700,
            background: showGuidesModal ? '#312e81' : '#eef2ff',
            color: showGuidesModal ? '#ffffff' : '#4338ca',
            border: '1px solid #c7d2fe',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            height: 28,
            transition: 'all 0.15s ease'
          }}
        >
          <BookOpen size={12} />
          <span>상황별 수칙</span>
        </button>

        <div style={{ width: 1, height: 16, background: '#e2e8f0' }} />

        {/* 상담자 입력 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>상담자</label>
          <input
            value={counselorName}
            onChange={e => setCounselorName(e.target.value)}
            placeholder="성명"
            style={{ border: '1px solid #cbd5e1', borderRadius: 4, padding: '2px 8px', fontSize: 11, width: 68, height: 26, outline: 'none', background: '#fff' }}
          />
        </div>

        {/* 초기화 버튼 */}
        <button
          onClick={handleReset}
          style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 600, color: '#475569', cursor: 'pointer', whiteSpace: 'nowrap', height: 26 }}
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
          <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0, position: 'relative', zIndex: 50, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
            {/* 장비 모델 칩 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#334155', whiteSpace: 'nowrap' }}>장비 모델</label>
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
                        fontWeight: isActive ? 700 : 500,
                        border: isActive ? '1px solid #0f172a' : '1px solid #e2e8f0',
                        background: isActive ? '#0f172a' : '#f8fafc',
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
                    background: '#f8fafc',
                    border: '1px solid #bfdbfe',
                    borderRadius: 6,
                    padding: '8px 10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    fontSize: 10,
                    marginTop: 4
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: 3 }}>
                    <span style={{ fontWeight: 800, color: '#1e3a8a', fontSize: 11 }}>
                      {currentModelSpec.model_name} <span style={{ fontWeight: 500, color: '#64748b', fontSize: 9.5 }}>({currentModelSpec.category})</span>
                    </span>
                    <span style={{ color: '#059669', fontWeight: 700, fontSize: 10 }}>가동 {currentModelSpec.run_time}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 8px', color: '#334155', fontSize: 10 }}>
                    <div><span style={{ color: '#64748b', fontWeight: 600 }}>탱크:</span> {currentModelSpec.clean_tank_l}L / {currentModelSpec.recovery_tank_l}L</div>
                    <div><span style={{ color: '#64748b', fontWeight: 600 }}>브러시:</span> {currentModelSpec.brush_spec}</div>
                    <div><span style={{ color: '#64748b', fontWeight: 600 }}>스퀴지:</span> {currentModelSpec.squeegee_width_mm > 0 ? `${currentModelSpec.squeegee_width_mm}mm` : '건식 진공'}</div>
                    <div><span style={{ color: '#64748b', fontWeight: 600 }}>배터리:</span> {currentModelSpec.battery_spec}</div>
                  </div>
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 4, padding: '3px 6px', color: '#991b1b', fontSize: 9.5, lineHeight: 1.3 }}>
                    <span style={{ fontWeight: 700 }}>차단기/퓨즈: </span>{currentModelSpec.fuse_location}
                  </div>
                  <div style={{ color: '#475569', fontSize: 9, lineHeight: 1.25 }}>
                    <span style={{ fontWeight: 600, color: '#334155' }}>주요 소모품: </span>{currentModelSpec.key_consumables}
                  </div>
                </div>
              )}
            </div>

            {/* 고객 검색 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, position: 'relative' }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#334155', whiteSpace: 'nowrap' }}>고객사 조회</label>
              <div style={{ position: 'relative' }}>
                <Search size={12} color="#64748b" style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  ref={searchRef}
                  data-uia="input-customer-search"
                  value={searchText}
                  onChange={e => handleCustomerSearch(e.target.value)}
                  onFocus={() => searchText && setDropdownOpen(true)}
                  placeholder="고객사명, 담당자 또는 초성 검색 (예: ㅅㅍ)"
                  style={{ width: '100%', paddingLeft: 26, paddingRight: 24, height: 28, border: '1px solid #cbd5e1', borderRadius: 5, fontSize: 11, outline: 'none', boxSizing: 'border-box', background: '#fff' }}
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
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#ffffff', border: '1px solid #3b82f6', borderRadius: 6, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', zIndex: 999, marginTop: 4, maxHeight: 180, overflowY: 'auto' }}>
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 5, padding: '3px 8px', fontSize: 10.5 }}>
                <span style={{ fontWeight: 700, color: '#1e40af' }}>{selectedCustomer.name} ({selectedCustomer.manager})</span>
                <button onClick={() => { setSelectedCustomer(null); setCustomerPhone(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 0 }}>
                  <X size={11} />
                </button>
              </div>
            )}

            {/* 고객 연락처 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#334155', whiteSpace: 'nowrap' }}>연락처 (전화번호)</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  data-uia="input-customer-phone"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  placeholder="전화번호 입력 (예: 010-9123-4567)"
                  style={{
                    width: '100%',
                    height: 28,
                    border: '1px solid #cbd5e1',
                    borderRadius: 5,
                    padding: '0 24px 0 8px',
                    fontSize: 11,
                    outline: 'none',
                    background: '#fff',
                    boxSizing: 'border-box'
                  }}
                />
                {customerPhone && (
                  <button
                    onClick={() => setCustomerPhone('')}
                    style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 0 }}
                  >
                    <X size={11} />
                  </button>
                )}
              </div>
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
                  padding: '6px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 6,
                  boxShadow: '0 2px 6px rgba(245,158,11,0.15)'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={12} color="#d97706" style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: 10.5, fontWeight: 900, color: '#92400e', whiteSpace: 'nowrap' }}>
                        진행 중 상담 감지
                      </span>
                      <span style={{ fontSize: 9, color: '#b45309', background: '#fef3c7', padding: '0 4px', borderRadius: 3, border: '1px solid #fde68a', fontWeight: 800 }}>
                        {formatRelativeTime(foundPending.timestamp)}
                      </span>
                    </div>
                    <span style={{ fontSize: 10, color: '#78350f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
                      padding: '4px 8px',
                      fontSize: 10.5,
                      fontWeight: 800,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      boxShadow: '0 1px 3px rgba(217,119,6,0.3)'
                    }}
                  >
                    상담 이어하기 ➔
                  </button>
                </div>
              );
            })()}
          </div>


          {/* 좌측 중단: 계통 필터 & 검색 */}
          <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
              {SYMPTOM_CATEGORIES.map(cat => {
                const isCatActive = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    style={{
                      padding: '3px 7px',
                      borderRadius: 4,
                      fontSize: 10.5,
                      fontWeight: isCatActive ? 700 : 500,
                      border: isCatActive ? '1px solid #93c5fd' : '1px solid #e2e8f0',
                      background: isCatActive ? '#eff6ff' : '#f8fafc',
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
                style={{ flex: 1, height: 28, border: '1px solid #cbd5e1', borderRadius: 5, padding: '0 8px', fontSize: 11, outline: 'none', background: '#fff' }}
              />
              {symptomSearchQuery && (
                <button onClick={() => setSymptomSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '0 2px' }}>
                  <X size={12} />
                </button>
              )}
              <button
                onClick={() => setShowCustomInput(!showCustomInput)}
                style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 5, padding: '0 8px', height: 28, color: '#2563eb', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                {showCustomInput ? '닫기' : '직접입력'}
              </button>
            </div>

            {showCustomInput && (
              <div style={{ display: 'flex', gap: 4, paddingTop: 4, borderTop: '1px dashed #e2e8f0' }}>
                <input
                  value={customSymptom}
                  onChange={e => setCustomSymptom(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCustomSearch()}
                  placeholder="증상 직접 입력"
                  style={{ flex: 1, height: 28, border: '1px solid #cbd5e1', borderRadius: 5, padding: '0 8px', fontSize: 11, outline: 'none' }}
                />
                <button
                  onClick={handleCustomSearch}
                  disabled={!customSymptom.trim() || isLoadingPlan}
                  style={{ background: '#0f172a', color: '#fff', border: 'none', borderRadius: 5, padding: '0 10px', height: 28, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                >
                  추가
                </button>
              </div>
            )}
          </div>

          {/* 좌측 하단: 16대 표준 장애 유형 리스트 (실시간 세션 상태 뱃지 탑재) */}
          <div style={{ flex: 1, background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
            <div style={{ padding: '7px 10px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: '#0f172a' }}>
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
                    <div style={{ padding: 16, textAlign: 'center', color: '#64748b', fontSize: 11 }}>
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
                          ? '1px solid #93c5fd'
                          : existingSession
                          ? '1px solid #cbd5e1'
                          : '1px solid #f1f5f9',
                        borderLeft: isCurrentActive
                          ? '3px solid #2563eb'
                          : existingSession
                          ? '3px solid #64748b'
                          : '1px solid #f1f5f9',
                        background: isCurrentActive
                          ? '#eff6ff'
                          : existingSession
                          ? '#f8fafc'
                          : '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.12s ease'
                      }}
                      onMouseEnter={e => { if (!isCurrentActive) e.currentTarget.style.background = '#f8fafc'; }}
                      onMouseLeave={e => { if (!isCurrentActive && !existingSession) e.currentTarget.style.background = '#ffffff'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0, flex: 1 }}>
                          <span style={{ fontSize: 11.5, fontWeight: isCurrentActive ? 800 : 700, color: isCurrentActive ? '#1d4ed8' : '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {preset.title}
                          </span>
                        </div>

                        {/* 세션 상태 뱃지 (진행중, 해결, 출장필요) */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                          {existingSession && (
                            <span style={{
                              fontSize: 9.5,
                              padding: '1px 5px',
                              borderRadius: 3,
                              fontWeight: 700,
                              whiteSpace: 'nowrap',
                              background: existingSession.status === 'resolved_by_call'
                                ? '#ecfdf5'
                                : existingSession.status === 'visit_required'
                                ? '#fef2f2'
                                : '#eef2ff',
                              color: existingSession.status === 'resolved_by_call'
                                ? '#059669'
                                : existingSession.status === 'visit_required'
                                ? '#dc2626'
                                : '#4338ca',
                              border: existingSession.status === 'resolved_by_call'
                                ? '1px solid #a7f3d0'
                                : existingSession.status === 'visit_required'
                                ? '1px solid #fecaca'
                                : '1px solid #c7d2fe'
                            }}>
                              {existingSession.status === 'resolved_by_call'
                                ? '해결됨'
                                : existingSession.status === 'visit_required'
                                ? '출장필요'
                                : `STEP ${existingSession.activeStepIndex + 1}`}
                            </span>
                          )}

                          <span style={{
                            fontSize: 9.5,
                            padding: '1px 5px',
                            borderRadius: 3,
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                            background: preset.urgency === '긴급' ? '#fef2f2' : '#f8fafc',
                            color: preset.urgency === '긴급' ? '#dc2626' : '#64748b',
                            border: preset.urgency === '긴급' ? '1px solid #fecaca' : '1px solid #e2e8f0'
                          }}>
                            {preset.urgency}
                          </span>
                        </div>
                      </div>

                      <span style={{ fontSize: 10.5, color: '#64748b', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
                border: '1px solid #c7d2fe',
                borderRadius: 8,
                padding: '8px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                flexShrink: 0,
                boxShadow: '0 2px 8px rgba(99, 102, 241, 0.08)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <BookOpen size={13} color="#4338ca" />
                  <span style={{ fontSize: 11.5, fontWeight: 800, color: '#1e1b4b' }}>상황별 수칙</span>
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
                        fontSize: 10.5,
                        fontWeight: isCurrent ? 800 : 600,
                        background: isCurrent ? '#e0e7ff' : '#f8fafc',
                        color: isCurrent ? '#3730a3' : '#475569',
                        border: isCurrent ? '1px solid #6366f1' : '1px solid #e2e8f0',
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
                  <div style={{ background: '#f8fafc', borderRadius: 6, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 5, border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                      <span style={{ fontSize: 9.5, padding: '1px 5px', borderRadius: 3, background: '#e0e7ff', color: '#4338ca', fontWeight: 800 }}>적용 조건</span>
                      <span style={{ color: '#1e40af', fontWeight: 700 }}>{activeG.target_situation}</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 10.5, color: '#334155' }}>
                      {activeG.operation_steps.map((st, sidx) => (
                        <div key={sidx} style={{ lineHeight: 1.4 }}>{st}</div>
                      ))}
                    </div>

                    <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 4, padding: '5px 8px', display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: 2 }}>
                      <Sparkles size={11} color="#2563eb" style={{ flexShrink: 0, marginTop: 2 }} />
                      <div style={{ fontSize: 10.5, color: '#1e3a8a', fontWeight: 600, lineHeight: 1.4, flex: 1 }}>
                        {activeG.call_script}
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(activeG.call_script);
                          showToast('안내 멘트가 복사되었습니다');
                        }}
                        style={{
                          fontSize: 9.5,
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

          {/* 증상 미선택 시 대기 화면 (고밀도 전문 가이드) */}
          {sessionList.length === 0 && !isLoadingPlan && (
            <div style={{
              flex: 1,
              background: '#ffffff',
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '32px 24px',
              gap: 16
            }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #e2e8f0'
              }}>
                <Layers size={22} color="#64748b" />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, textAlign: 'center' }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>상담 증상 대기</span>
                <span style={{ fontSize: 11.5, color: '#64748b', maxWidth: 440, lineHeight: 1.5 }}>
                  좌측에서 고객의 호소 증상 또는 계기판 에러코드를 선택하면 단계별 표준 진단 절차와 안내 스크립트가 실행됩니다.
                </span>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 10,
                width: '100%',
                maxWidth: 580,
                marginTop: 8
              }}>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 800, color: '#1e40af' }}>
                    <span style={{ width: 16, height: 16, borderRadius: '50%', background: '#dbeafe', color: '#1d4ed8', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>1</span>
                    <span>모델 및 고객 확인</span>
                  </div>
                  <span style={{ fontSize: 10.5, color: '#64748b', lineHeight: 1.35 }}>장비 모델과 고객사 연락처를 좌측 상단에서 확인합니다.</span>
                </div>

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 800, color: '#1e40af' }}>
                    <span style={{ width: 16, height: 16, borderRadius: '50%', background: '#dbeafe', color: '#1d4ed8', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>2</span>
                    <span>증상 및 에러코드 선택</span>
                  </div>
                  <span style={{ fontSize: 10.5, color: '#64748b', lineHeight: 1.35 }}>초성 검색 또는 퀵버튼으로 일치하는 증상을 선택합니다.</span>
                </div>

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 800, color: '#1e40af' }}>
                    <span style={{ width: 16, height: 16, borderRadius: '50%', background: '#dbeafe', color: '#1d4ed8', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>3</span>
                    <span>진단 및 종결</span>
                  </div>
                  <span style={{ fontSize: 10.5, color: '#64748b', lineHeight: 1.35 }}>단계별 조치 후 전화 종결, 고객 대기, 출장 접수를 완결합니다.</span>
                </div>
              </div>
            </div>
          )}

          {isLoadingPlan && (
            <div style={{ flex: 1, background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Loader2 size={24} color="#2563eb" style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: 12, color: '#334155', fontWeight: 700 }}>대응 조치 계획 분석 중...</span>
            </div>
          )}

          {/* 증상 세션이 1개 이상 존재할 때 꽉 차는 활성 스튜디오 */}
          {sessionList.length > 0 && currentSession && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, overflow: 'hidden' }}>

              {/* ── [우측 최상단: 다수 증상 세션 탭 바 + 상황별 매뉴얼 수칙 버튼] ── */}
              <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', padding: '5px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, flexShrink: 0 }}>
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
                          fontWeight: isCurrent ? 700 : 500,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          border: isCurrent
                            ? '1px solid #93c5fd'
                            : isResolved
                            ? '1px solid #a7f3d0'
                            : isFault
                            ? '1px solid #fecaca'
                            : '1px solid #e2e8f0',
                          borderBottom: isCurrent ? '2px solid #2563eb' : undefined,
                          background: isCurrent
                            ? '#eff6ff'
                            : isResolved
                            ? '#ecfdf5'
                            : isFault
                            ? '#fef2f2'
                            : '#ffffff',
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
                          fontSize: 9.5,
                          padding: '0 4px',
                          borderRadius: 3,
                          fontWeight: 700,
                          background: isResolved ? '#d1fae5' : isFault ? '#fee2e2' : '#e2e8f0',
                          color: isResolved ? '#065f46' : isFault ? '#991b1b' : '#475569'
                        }}>
                          {isResolved ? '해결' : isFault ? '출장' : `STEP ${s.activeStepIndex + 1}`}
                        </span>
                        <button
                          onClick={(e) => handleCloseSession(s.key, e)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0, display: 'flex', alignItems: 'center' }}
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
                      padding: '4px 10px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 700,
                      background: showGuidesModal ? '#312e81' : '#eef2ff',
                      color: showGuidesModal ? '#ffffff' : '#4338ca',
                      border: '1px solid #c7d2fe',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      transition: 'all 0.12s ease'
                    }}
                  >
                    <BookOpen size={12} />
                    <span>상황별 수칙</span>
                  </button>
                )}
              </div>

              {/* [우측 1구역] 현재 활성 증상 헤더 & 표준 안내 스크립트 */}
              <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <Layers size={14} color="#2563eb" />
                    <span style={{ fontSize: 13.5, fontWeight: 800, color: '#0f172a' }}>
                      {currentSession.title}
                    </span>
                    <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: '#f1f5f9', color: '#475569', fontWeight: 600, border: '1px solid #e2e8f0' }}>
                      부품: {currentSession.part_code}
                    </span>
                    <span style={{
                      fontSize: 10,
                      padding: '1px 6px',
                      borderRadius: 4,
                      background: currentSession.urgency === '긴급' ? '#fef2f2' : '#f8fafc',
                      color: currentSession.urgency === '긴급' ? '#dc2626' : '#64748b',
                      fontWeight: 700,
                      border: currentSession.urgency === '긴급' ? '1px solid #fecaca' : '1px solid #e2e8f0'
                    }}>
                      {currentSession.urgency}
                    </span>
                  </div>

                  {/* 해당 증상의 현재 진단 상태 */}
                  <div>
                    {currentSession.status === 'resolved_by_call' ? (
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: '#ecfdf5', color: '#059669', fontWeight: 700, border: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle2 size={12} /> 전화 조치 해결 완료
                      </span>
                    ) : currentSession.status === 'visit_required' ? (
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: '#fef2f2', color: '#dc2626', fontWeight: 700, border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <ShieldAlert size={12} /> AS 출장 접수 필요
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: '#eff6ff', color: '#2563eb', fontWeight: 700, border: '1px solid #dbeafe', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <RefreshCw size={11} style={{ animation: 'spin 3s linear infinite' }} /> 단계별 진단 진행 중
                      </span>
                    )}
                  </div>
                </div>

                {/* 표준 안내 스크립트 */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderLeft: '3px solid #2563eb', borderRadius: '0 6px 6px 0', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Sparkles size={13} color="#2563eb" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: '#1e40af', whiteSpace: 'nowrap' }}>표준 안내:</span>
                  <span style={{ fontSize: 11.5, color: '#1e293b', fontWeight: 600 }}>
                    "{currentSession.call_script}"
                  </span>
                </div>
              </div>

              {/* ── [제조사 공식 계기판 에러 코드 퀵 칩 & 원클릭 즉시 판정 콘솔] ── */}
              {currentSession.official_error_codes && currentSession.official_error_codes.length > 0 && (
                <div style={{
                  background: '#f8fafc',
                  borderRadius: 8,
                  border: '1px solid #bfdbfe',
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
                      <Cpu size={14} color="#2563eb" />
                      <span style={{ fontSize: 12, fontWeight: 800, color: '#1e3a8a', whiteSpace: 'nowrap' }}>
                        {getModelErrorCodePanelTitle(selectedModel, currentSession.official_error_codes.length)}
                      </span>
                      <span style={{ fontSize: 9.5, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '1px 6px', borderRadius: 4, fontWeight: 700, whiteSpace: 'nowrap' }}>
                        즉시 판정
                      </span>
                    </div>

                    {/* 코드 빠른 검색창 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, width: 220 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: 5,
                        padding: '2px 8px',
                        width: '100%',
                        height: 26
                      }}>
                        <Search size={11} color="#64748b" />
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
                            fontSize: 10.5,
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
                              padding: '4px 8px',
                              borderRadius: 5,
                              fontSize: 11.5,
                              fontWeight: isSelected ? 700 : 500,
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                              border: isSelected
                                ? '1px solid #1d4ed8'
                                : '1px solid #e2e8f0',
                              background: isSelected
                                ? '#1d4ed8'
                                : '#ffffff',
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
                              padding: '1px 5px',
                              borderRadius: 3,
                              fontSize: 11,
                              letterSpacing: '0.3px'
                            }}>
                              {ec.code}
                            </span>
                            <span style={{ fontSize: 11, fontWeight: isSelected ? 700 : 600 }}>{ec.name}</span>
                            <span style={{
                              fontSize: 9.5,
                              fontWeight: 700,
                              padding: '1px 4px',
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
                      background: '#ffffff',
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
                            fontSize: 13,
                            fontWeight: 800,
                            fontFamily: 'SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                            background: currentSession.selectedErrorCode.resolution_type === 'VISIT_REQUIRED' ? '#dc2626' : '#16a34a',
                            color: '#ffffff',
                            padding: '2px 8px',
                            borderRadius: 4
                          }}>
                            {currentSession.selectedErrorCode.code}
                          </span>
                          <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>
                            {currentSession.selectedErrorCode.name} ({currentSession.selectedErrorCode.category})
                          </span>
                          <span style={{
                            fontSize: 10.5,
                            fontWeight: 700,
                            padding: '2px 6px',
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
                            background: '#ffffff',
                            border: '1px solid #cbd5e1',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontSize: 11,
                            fontWeight: 600,
                            color: '#64748b',
                            padding: '2px 8px'
                          }}
                        >
                          선택 해제
                        </button>
                      </div>

                      {/* 상태/원인 설명 */}
                      <div style={{ fontSize: 12, color: '#334155', fontWeight: 500, lineHeight: 1.45 }}>
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>원인 및 점검 포인트: </span>
                        {currentSession.selectedErrorCode.meaning}
                      </div>

                      {/* 표준 음성 안내 (Call Script) */}
                      <div style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderLeft: '3px solid #2563eb',
                        borderRadius: '0 5px 5px 0',
                        padding: '6px 10px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 7
                      }}>
                        <Sparkles size={13} color="#2563eb" style={{ flexShrink: 0, marginTop: 2 }} />
                        <span style={{ fontSize: 12, color: '#0f172a', fontWeight: 600, lineHeight: 1.45 }}>
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
                              background: '#059669',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: 5,
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: 'pointer',
                              boxShadow: '0 1px 3px rgba(5,150,105,0.2)',
                              transition: 'all 0.12s ease'
                            }}
                          >
                            <CheckCircle2 size={14} />
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
                              padding: '7px 12px',
                              background: '#dc2626',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: 5,
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: 'pointer',
                              boxShadow: '0 1px 3px rgba(220,38,38,0.2)',
                              transition: 'all 0.12s ease'
                            }}
                          >
                            <ShieldAlert size={14} />
                            <span>[{currentSession.selectedErrorCode.code}] AS 출장 접수 전환 (부품: {currentSession.selectedErrorCode.part_code || currentSession.part_code})</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* [우측 2구역] 현재 증상의 스텝 네비게이션 프로그레스 바 */}
              <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <span style={{ fontSize: 10.5, fontWeight: 800, color: '#475569', whiteSpace: 'nowrap' }}>진단 절차:</span>
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
                          gap: 4,
                          padding: '3px 8px',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: isSelected ? 800 : 600,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          border: isSelected
                            ? '1px solid #2563eb'
                            : isResolved
                            ? '1px solid #86efac'
                            : isUnresolved
                            ? '1px solid #fca5a5'
                            : '1px solid #e2e8f0',
                          background: isSelected
                            ? '#eff6ff'
                            : isResolved
                            ? '#f0fdf4'
                            : isUnresolved
                            ? '#fef2f2'
                            : '#ffffff',
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
                  <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #93c5fd', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10, boxShadow: '0 1px 3px rgba(37,99,235,0.06)' }}>

                    {/* 스텝 제목 & 현재 상태 */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 800, background: '#2563eb', color: '#ffffff', padding: '2px 7px', borderRadius: 4 }}>
                          STEP {activeStep.step_no}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>
                          {activeStep.title}
                        </span>
                      </div>
                      <div>
                        {activeStep.status === 'resolved' ? (
                          <span style={{ fontSize: 10.5, fontWeight: 700, color: '#059669', display: 'flex', alignItems: 'center', gap: 4, background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '2px 8px', borderRadius: 4 }}>
                            <CheckCircle2 size={12} /> 정상 해결
                          </span>
                        ) : activeStep.status === 'unresolved' ? (
                          <span style={{ fontSize: 10.5, fontWeight: 700, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 4, background: '#fef2f2', border: '1px solid #fecaca', padding: '2px 8px', borderRadius: 4 }}>
                            <AlertTriangle size={12} /> 불량 판정
                          </span>
                        ) : (
                          <span style={{ fontSize: 10.5, fontWeight: 700, color: '#2563eb', display: 'flex', alignItems: 'center', gap: 4, background: '#eff6ff', border: '1px solid #dbeafe', padding: '2px 8px', borderRadius: 4 }}>
                            <RefreshCw size={11} style={{ animation: 'spin 3s linear infinite' }} /> 안내 진행
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 1. 조치 및 시험 방법 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, background: '#f8fafc', padding: '9px 12px', borderRadius: 6, border: '1px solid #e2e8f0', borderLeft: '3px solid #2563eb' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Wrench size={11} color="#475569" />
                        <label style={{ fontSize: 10.5, fontWeight: 800, color: '#334155' }}>
                          조치 및 시험 방법
                        </label>
                      </div>
                      <p style={{ margin: 0, fontSize: 12, color: '#0f172a', fontWeight: 600, lineHeight: 1.5 }}>
                        {activeStep.method || activeStep.title}
                      </p>
                    </div>

                    {/* 2. 정상 vs 불량 판정 기준 */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div style={{ background: '#f0fdf4', border: '1px solid #a7f3d0', borderRadius: 6, padding: '9px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle2 size={13} color="#059669" />
                          <span style={{ fontSize: 10.5, fontWeight: 800, color: '#166534' }}>정상 판정 조건 (해결)</span>
                        </div>
                        <span style={{ fontSize: 11, color: '#14532d', fontWeight: 600, lineHeight: 1.4 }}>
                          {activeStep.criteria_normal || '정상 작동 및 계기판 정상 표시'}
                        </span>
                      </div>

                      <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '9px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <AlertTriangle size={13} color="#dc2626" />
                          <span style={{ fontSize: 10.5, fontWeight: 800, color: '#991b1b' }}>불량 판정 조건 (미해결)</span>
                        </div>
                        <span style={{ fontSize: 11, color: '#7f1d1d', fontWeight: 600, lineHeight: 1.4 }}>
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
                          height: 36,
                          fontSize: 12,
                          fontWeight: 800,
                          cursor: 'pointer',
                          boxShadow: '0 1px 3px rgba(5,150,105,0.25)',
                          transition: 'all 0.1s ease'
                        }}
                      >
                        <Check size={14} />
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
                          height: 36,
                          fontSize: 12,
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
                            <ShieldAlert size={14} />
                            <span>불량 판정 (AS 출장 접수 전환)</span>
                          </>
                        ) : (
                          <>
                            <ArrowRight size={14} />
                            <span>불량 판정 (다음 조치 STEP {currentSession.activeStepIndex + 2} ➔)</span>
                          </>
                        )}
                      </button>
                    </div>

                  </div>
                )}

                {/* 현재 증상의 전체 진단 절차 타임라인 요약 */}
                <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <span style={{ fontSize: 10.5, fontWeight: 800, color: '#334155' }}>
                    진단 단계 현황 ({currentSession.title})
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
                          border: idx === currentSession.activeStepIndex ? '1px solid #2563eb' : '1px solid #e2e8f0',
                          background: idx === currentSession.activeStepIndex ? '#eff6ff' : '#f8fafc',
                          cursor: 'pointer',
                          transition: 'all 0.1s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 10, fontWeight: 800, color: '#1e40af' }}>STEP {st.step_no}</span>
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#0f172a' }}>{st.title}</span>
                        </div>
                        <div>
                          {st.status === 'resolved' ? (
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#059669', background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '1px 6px', borderRadius: 3, display: 'flex', alignItems: 'center', gap: 3 }}>
                              <Check size={10} /> 해결
                            </span>
                          ) : st.status === 'unresolved' ? (
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', padding: '1px 6px', borderRadius: 3, display: 'flex', alignItems: 'center', gap: 3 }}>
                              <X size={10} /> 불량
                            </span>
                          ) : st.status === 'active' ? (
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '1px 6px', borderRadius: 3, display: 'flex', alignItems: 'center', gap: 3 }}>
                              <RefreshCw size={9} /> 진행
                            </span>
                          ) : (
                            <span style={{ fontSize: 10, fontWeight: 600, color: '#64748b', background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '1px 6px', borderRadius: 3 }}>
                              대기
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 과거 유사 상담 사례 */}
                <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', padding: '6px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
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
              <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #cbd5e1', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, boxShadow: '0 -1px 3px rgba(0,0,0,0.03)' }}>
                {/* 종합 상태 뱃지 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 140 }}>
                  <label style={{ fontSize: 9.5, fontWeight: 800, color: '#64748b' }}>종합 판정 ({sessionList.length}건)</label>
                  <div>
                    {overallStatus === 'visit_required' ? (
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <ShieldAlert size={13} /> AS 출장 접수 필요
                      </span>
                    ) : overallStatus === 'resolved_by_call' ? (
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#059669', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle2 size={13} /> 직접 조치 완료
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#2563eb', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <RefreshCw size={11} style={{ animation: 'spin 3s linear infinite' }} /> 진단 진행 중
                      </span>
                    )}
                  </div>
                </div>

                {/* 특이사항 메모 입력창 */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <label style={{ fontSize: 9.5, fontWeight: 800, color: '#64748b' }}>진단 및 통화 메모</label>
                  <input
                    data-uia="input-counsel-notes"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="특이사항 및 추가 진단 메모"
                    style={{ border: '1px solid #cbd5e1', borderRadius: 5, padding: '4px 10px', fontSize: 11, outline: 'none', height: 32, boxSizing: 'border-box', background: '#ffffff', transition: 'border-color 0.15s ease' }}
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
                    gap: 5,
                    background: '#fffbeb',
                    color: '#b45309',
                    border: '1px solid #f59e0b',
                    borderRadius: 5,
                    padding: '0 12px',
                    fontSize: 11,
                    fontWeight: 800,
                    cursor: (sessionList.length === 0 && !customSymptom.trim() && !selectedCustomer) ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap',
                    height: 32,
                    boxShadow: '0 1px 2px rgba(245,158,11,0.15)',
                    opacity: (sessionList.length === 0 && !customSymptom.trim() && !selectedCustomer) ? 0.4 : 1,
                    transition: 'all 0.1s ease'
                  }}
                >
                  <Clock size={12} />
                  <span>고객 대기 등록</span>
                </button>

                {/* 2. 직접 조치 종결 버튼 (모든 증상이 해결되었을 때만 가능) */}
                <button
                  onClick={() => handleSave(false)}
                  disabled={isSaving || overallStatus === 'visit_required'}
                  data-uia="btn-save-resolved"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    background: overallStatus === 'resolved_by_call' ? '#059669' : '#f8fafc',
                    color: overallStatus === 'resolved_by_call' ? '#ffffff' : '#475569',
                    border: overallStatus === 'resolved_by_call' ? '1px solid #047857' : '1px solid #cbd5e1',
                    borderRadius: 5,
                    padding: '0 14px',
                    fontSize: 11,
                    fontWeight: 800,
                    cursor: overallStatus === 'visit_required' ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap',
                    height: 32,
                    opacity: overallStatus === 'visit_required' ? 0.35 : 1,
                    boxShadow: overallStatus === 'resolved_by_call' ? '0 1px 3px rgba(5,150,105,0.25)' : 'none',
                    transition: 'all 0.1s ease'
                  }}
                >
                  <CheckCircle2 size={13} />
                  <span>직접 조치 종결</span>
                </button>

                {/* 3. AS 출장 접수 버튼 (1개라도 출장 필요 시 강조) */}
                <button
                  onClick={() => handleSave(true)}
                  disabled={isSaving}
                  data-uia="btn-save-visit"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    background: overallStatus === 'visit_required' ? '#dc2626' : '#ffffff',
                    color: overallStatus === 'visit_required' ? '#ffffff' : '#dc2626',
                    border: overallStatus === 'visit_required' ? '1px solid #b91c1c' : '1px solid #f87171',
                    borderRadius: 5,
                    padding: '0 16px',
                    fontSize: 11,
                    fontWeight: 800,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    height: 32,
                    opacity: isSaving ? 0.5 : 1,
                    boxShadow: overallStatus === 'visit_required' ? '0 1px 3px rgba(220,38,38,0.25)' : 'none',
                    transition: 'all 0.1s ease'
                  }}
                >
                  {isSaving ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <ShieldAlert size={13} />}
                  <span>AS 출장 접수</span>
                </button>
              </div>

            </div>
          )}

        </div>

      </div>

      {/* ── [모달 1: 진행중 상담 대기열 (고객 확인 대기)] ── */}
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
              background: '#ffffff',
              borderRadius: 10,
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            {/* Header */}
            <div style={{
              padding: '12px 18px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f8fafc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={16} color="#d97706" />
                <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
                  진행 상담 대기열
                </span>
                <span style={{
                  fontSize: 10.5,
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
                  gap: 5,
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 5,
                  padding: '3px 8px',
                  width: 280
                }}>
                  <Search size={12} color="#64748b" />
                  <input
                    data-uia="input-pending-search"
                    value={pendingSearchQuery}
                    onChange={e => setPendingSearchQuery(e.target.value)}
                    placeholder="고객명, 전화번호, 에러코드, 증상, 초성 검색"
                    style={{ border: 'none', outline: 'none', fontSize: 11, width: '100%' }}
                  />
                  {pendingSearchQuery && (
                    <button onClick={() => setPendingSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                      <X size={11} color="#94a3b8" />
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
                        border: '1px solid #e2e8f0',
                        borderRadius: 6,
                        padding: '10px 14px',
                        background: '#ffffff',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                        boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 13.5, fontWeight: 800, color: '#0f172a' }}>
                            {record.customerName}
                          </span>
                          {(record.manager || record.phone) && (
                            <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>
                              ({[record.manager, record.phone].filter(Boolean).join(' / ')})
                            </span>
                          )}
                          <span style={{
                            fontSize: 10,
                            fontWeight: 700,
                            background: '#eff6ff',
                            color: '#1d4ed8',
                            border: '1px solid #bfdbfe',
                            padding: '1px 6px',
                            borderRadius: 3
                          }}>
                            {record.modelName}
                          </span>
                          <span style={{
                            fontSize: 10,
                            fontWeight: 700,
                            background: '#fffbeb',
                            color: '#b45309',
                            border: '1px solid #fde68a',
                            padding: '1px 6px',
                            borderRadius: 3
                          }}>
                            고객 대기
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                          <span style={{ fontSize: 10.5, color: '#64748b', fontWeight: 600 }}>
                            {formatRelativeTime(record.timestamp)} ({new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                          </span>
                          <button
                            onClick={() => handleResumeSession(record)}
                            data-uia={`btn-resume-session-${record.id}`}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              background: '#2563eb',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: 4,
                              padding: '4px 10px',
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: 'pointer',
                              boxShadow: '0 1px 2px rgba(37,99,235,0.2)'
                            }}
                          >
                            <span>상담 재개 ➔</span>
                          </button>
                          <button
                            onClick={e => handleDeletePendingSession(record.id, e)}
                            style={{
                              background: '#ffffff',
                              color: '#dc2626',
                              border: '1px solid #fecaca',
                              borderRadius: 4,
                              padding: '4px 8px',
                              fontSize: 11,
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
                              fontSize: 10.5,
                              fontWeight: 800,
                              fontFamily: 'Consolas, Monaco, monospace',
                              background: '#1d4ed8',
                              color: '#ffffff',
                              padding: '1px 6px',
                              borderRadius: 3
                            }}
                          >
                            [{code}]
                          </span>
                        ))}
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#334155' }}>
                          {record.currentStepSummary || record.summaryText}
                        </span>
                        {symptomCount > 1 && (
                          <span style={{ fontSize: 10, color: '#64748b' }}>
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
                          padding: '4px 8px',
                          fontSize: 11,
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
                <div style={{ padding: 40, textAlign: 'center', color: '#64748b', fontSize: 12 }}>
                  현재 대기 중인 진행 상담이 없습니다.
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: '10px 18px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f8fafc'
            }}>
              <span style={{ fontSize: 11, color: '#64748b' }}>
                대기 상담 선택 시 직전 STEP부터 즉시 재개됩니다.
              </span>
              <button
                onClick={() => setShowPendingModal(false)}
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: 4,
                  padding: '4px 14px',
                  fontSize: 11,
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

      {/* ── [모달 2: 상담 이력 및 진행 기록 (Audit History)] ── */}
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
              background: '#ffffff',
              borderRadius: 10,
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            {/* Header */}
            <div style={{
              padding: '12px 18px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f8fafc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <History size={16} color="#2563eb" />
                <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
                  상담 이력
                </span>
                <span style={{
                  fontSize: 10.5,
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
                          padding: '3px 8px',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: active ? 700 : 500,
                          border: active ? '1px solid #2563eb' : '1px solid #e2e8f0',
                          background: active ? '#eff6ff' : '#ffffff',
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
                  gap: 5,
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 5,
                  padding: '3px 8px',
                  width: 260
                }}>
                  <Search size={12} color="#64748b" />
                  <input
                    data-uia="input-history-search"
                    value={historySearchQuery}
                    onChange={e => setHistorySearchQuery(e.target.value)}
                    placeholder="고객명, 전화번호, 에러코드, 증상, 초성 검색"
                    style={{ border: 'none', outline: 'none', fontSize: 11, width: '100%' }}
                  />
                  {historySearchQuery && (
                    <button onClick={() => setHistorySearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                      <X size={11} color="#94a3b8" />
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
                borderRight: selectedHistoryItem ? '1px solid #e2e8f0' : 'none'
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
                          border: isSelected ? '1px solid #2563eb' : '1px solid #e2e8f0',
                          borderRadius: 6,
                          padding: '8px 12px',
                          background: isSelected ? '#eff6ff' : '#ffffff',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 4,
                          boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                          transition: 'all 0.1s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>
                              {record.customerName}
                            </span>
                            {(record.manager || record.phone) && (
                              <span style={{ fontSize: 10.5, color: '#475569', fontWeight: 600 }}>
                                ({[record.manager, record.phone].filter(Boolean).join(' / ')})
                              </span>
                            )}
                            <span style={{ fontSize: 10.5, color: '#64748b' }}>
                              {record.modelName}
                            </span>
                            <span style={{
                              fontSize: 9.5,
                              fontWeight: 700,
                              padding: '1px 5px',
                              borderRadius: 3,
                              background: isResolved ? '#ecfdf5' : isVisit ? '#fef2f2' : '#fffbeb',
                              color: isResolved ? '#059669' : isVisit ? '#dc2626' : '#b45309',
                              border: isResolved ? '1px solid #a7f3d0' : isVisit ? '1px solid #fecaca' : '1px solid #fde68a'
                            }}>
                              {isResolved ? '직접조치 완료' : isVisit ? 'AS 출장 접수' : '고객 대기'}
                            </span>
                          </div>

                          <span style={{ fontSize: 10, color: '#64748b' }}>
                            {formatRelativeTime(record.timestamp)} ({new Date(record.timestamp).toLocaleDateString()})
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                          {record.selectedErrorCodes.map(c => (
                            <span key={c} style={{
                              fontSize: 10,
                              fontWeight: 800,
                              fontFamily: 'Consolas, Monaco, monospace',
                              background: '#1d4ed8',
                              color: '#fff',
                              padding: '1px 5px',
                              borderRadius: 3
                            }}>
                              [{c}]
                            </span>
                          ))}
                          <span style={{ fontSize: 11, color: '#334155', fontWeight: 600 }}>
                            {record.summaryText}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                {historyRecords.length === 0 && (
                  <div style={{ padding: 40, textAlign: 'center', color: '#64748b', fontSize: 12 }}>
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
                  background: '#f8fafc',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: 8 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
                        {selectedHistoryItem.customerName} 상담 상세 기록
                      </span>
                      <span style={{ fontSize: 11, color: '#64748b' }}>
                        담당: {selectedHistoryItem.manager || '미지정'} | 연락처: {selectedHistoryItem.phone || '미등록'} | 장비: {selectedHistoryItem.modelName} | 일시: {new Date(selectedHistoryItem.timestamp).toLocaleString()}
                      </span>
                    </div>

                    {selectedHistoryItem.status === 'in_progress' && (
                      <button
                        onClick={() => handleResumeSession(selectedHistoryItem)}
                        data-uia="btn-history-resume"
                        style={{
                          background: '#2563eb',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: 4,
                          padding: '4px 10px',
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        상담 재개 ➔
                      </button>
                    )}
                  </div>

                  {/* 증상별 단계 감사 기록 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 800, color: '#1e3a8a' }}>
                      진단 단계별 조치 기록
                    </span>

                    {Object.values(selectedHistoryItem.symptomSessions || {}).map(s => (
                      <div key={s.key} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 6, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>
                            증상: {s.title}
                          </span>
                          {s.selectedErrorCode && (
                            <span style={{
                              fontSize: 10.5,
                              fontWeight: 800,
                              fontFamily: 'Consolas, Monaco, monospace',
                              background: '#1d4ed8',
                              color: '#ffffff',
                              padding: '1px 6px',
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
                                padding: '4px 8px',
                                borderRadius: 4,
                                background: st.status === 'resolved' ? '#f0fdf4' : st.status === 'unresolved' ? '#fef2f2' : '#f8fafc',
                                border: st.status === 'resolved' ? '1px solid #bbf7d0' : st.status === 'unresolved' ? '1px solid #fecaca' : '1px solid #e2e8f0',
                                fontSize: 11
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontWeight: 800, color: '#1e40af' }}>STEP {st.step_no}</span>
                                <span style={{ fontWeight: 600, color: '#1e293b' }}>{st.title}</span>
                              </div>
                              <span style={{
                                fontWeight: 700,
                                fontSize: 10.5,
                                color: st.status === 'resolved' ? '#059669' : st.status === 'unresolved' ? '#dc2626' : st.status === 'active' ? '#2563eb' : '#64748b'
                              }}>
                                {st.status === 'resolved' ? '정상 해결' : st.status === 'unresolved' ? '불량 판정' : st.status === 'active' ? '안내 진행' : '대기'}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* History events */}
                        {s.historyLog && s.historyLog.length > 0 && (
                          <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span style={{ fontSize: 10, fontWeight: 800, color: '#475569' }}>이벤트 타임라인:</span>
                            {s.historyLog.map((log, i) => (
                              <span key={i} style={{ fontSize: 10, color: '#64748b', paddingLeft: 6 }}>
                                • {log}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}

                    {Object.keys(selectedHistoryItem.symptomSessions || {}).length === 0 && (
                      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 6, padding: '10px 12px', fontSize: 11, color: '#334155' }}>
                        {selectedHistoryItem.notes || selectedHistoryItem.summaryText || '상세 진단 내역이 기록되지 않은 레거시 데이터입니다.'}
                      </div>
                    )}
                  </div>

                  {/* 상담원 메모 */}
                  {selectedHistoryItem.notes && (
                    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 6, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#0f172a' }}>상담원 메모</span>
                      <span style={{ fontSize: 11, color: '#334155', lineHeight: 1.4 }}>{selectedHistoryItem.notes}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: '10px 18px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              background: '#f8fafc'
            }}>
              <button
                onClick={() => { setShowHistoryModal(false); setSelectedHistoryItem(null); }}
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: 4,
                  padding: '4px 14px',
                  fontSize: 11,
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


      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input:focus { border-color: #2563eb !important; box-shadow: 0 0 0 2px rgba(37,99,235,0.15); }
        button:active { opacity: 0.85; }
      `}</style>
    </div>
  );
}
