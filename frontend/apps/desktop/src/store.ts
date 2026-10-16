import { create } from 'zustand';
import type { CorrectionEvent } from './contextCorrector';
import type { KeywordEntity } from './keywordAssist';

export interface CustomerInfo {
  id: string;
  name: string;
  manager: string;
  phone: string;
  address: string;
  addressDetail: string;
  assetModel: string;
  serialNumber: string;
  salesType: string;
  warrantyRemaining: string;
  historyTimeline: { date: string; title: string; isWarning?: boolean }[];
}

export interface ChecklistItem {
  id: number;
  text: string;
  checked: boolean;
}

export interface MatchedDiagnosis {
  category: string;
  partCode: string;
  partName: string;
  stock: number;
  confidence: number;
  source: string;
  selfActionGuide?: string;
}

interface CounselWorkstationState {
  // Global / Call State
  isRecording: boolean;
  callSeconds: number;
  counselorName: string;
  toastMessage: string | null;

  // Real Hardware Audio Player State
  activeAudioFile: File | null;
  activeAudioUrl: string | null;
  isAudioPlaying: boolean;
  isAudioPlayerOpen: boolean;
  audioCurrentTime: number;
  audioDuration: number;
  setActiveAudioFile: (file: File) => void;
  clearAudioFile: () => void;
  setIsAudioPlayerOpen: (open: boolean) => void;
  setIsAudioPlaying: (playing: boolean) => void;
  setAudioTime: (current: number, duration: number) => void;
  resetSessionForNewAudio: () => void;

  // Triple STT Engine Selection
  sttEngine: 'whisper_large_v3' | 'naver_clova' | 'web_speech';
  setSttEngine: (engine: 'whisper_large_v3' | 'naver_clova' | 'web_speech') => void;

  // Contextual STT Semantic Correction Engine
  isContextCorrectionEnabled: boolean;
  correctionHistory: CorrectionEvent[];
  toggleContextCorrection: () => void;

  // Real-time Keyword & Auto-Assist Trigger
  activeKeywordEntity: KeywordEntity | null;
  detectedKeywordEntities: KeywordEntity[];
  setActiveKeywordEntity: (entity: KeywordEntity) => void;
  addDetectedKeywordEntity: (entity: KeywordEntity) => void;

  // Panel A: Customer & Asset
  searchQuery: string;
  customerList: CustomerInfo[];
  selectedCustomer: CustomerInfo | null;

  // Panel B: STT & Live Streaming (Clean initial state)
  rawParagraphs: string[];
  finalParagraphs: string[];
  interimSttText: string;
  detectedKeywords: string[];
  matchedDiagnosis: MatchedDiagnosis | null;
  manualOverrideKeyword: string;

  // Panel C: SOP Checklist & Actions
  actionChecklist: ChecklistItem[];
  dispatchDrawerOpen: boolean;
  salesModalOpen: boolean;
  dispatchNote: string;
  assignedEngineer: string;
  dispatchDate: string;

  // Actions
  setRecording: (status: boolean) => void;
  incrementCallTimer: () => void;
  resetCallTimer: () => void;
  setSearchQuery: (query: string) => void;
  selectCustomer: (customer: CustomerInfo | null) => void;
  setSelectedCustomerModel: (modelName: string) => void;
  appendFinalParagraph: (rawText: string, correctedText: string, corrections: CorrectionEvent[]) => void;
  setInterimSttText: (text: string) => void;
  clearTranscript: () => void;
  setDiagnosisResult: (keywords: string[], diagnosis: MatchedDiagnosis, checklist: string[]) => void;
  toggleChecklist: (id: number) => void;
  setManualOverrideKeyword: (kw: string) => void;
  setDispatchDrawerOpen: (open: boolean) => void;
  setSalesModalOpen: (open: boolean) => void;
  setDispatchNote: (note: string) => void;
  setAssignedEngineer: (engineer: string) => void;
  setDispatchDate: (date: string) => void;
  showToast: (msg: string) => void;
  clearToast: () => void;
}

export const DEFAULT_CUSTOMERS: CustomerInfo[] = [
  {
    id: 'a1111111-1111-1111-1111-111111111111',
    name: '반포자이 아파트 관리사무소',
    manager: '박시설 시설과장',
    phone: '010-9876-5432',
    address: '서울 서초구 신반포로 270',
    addressDetail: '지하 1층 방재실 / (주)클린에코 청소용역',
    assetModel: 'J600T (보행식 습식청소기)',
    serialNumber: 'SN-2025-J600T-089',
    salesType: '임대(렌탈)',
    warrantyRemaining: '무상 7개월 잔여',
    historyTimeline: [
      { date: '14일 전 (08-09)', title: '[30일 내 반복 고장 경고] 흡입모터 1차 교체 완료', isWarning: true },
      { date: '2026-07-10', title: '솔레노이드 급수밸브 신품 교체 완료' },
      { date: '2026-05-15', title: '정기 점검 및 스퀴지 고무 블레이드 교체' }
    ]
  },
  {
    id: 'a2222222-2222-2222-2222-222222222222',
    name: '래미안퍼스티지 관리지원센터',
    manager: '이관리 관리소장',
    phone: '010-8765-4321',
    address: '서울 서초구 반포대로 275',
    addressDetail: '지하 2층 주차장 관리소 / (주)삼원종합관리 미화팀',
    assetModel: 'J800 (대형 탑승형 습식청소기)',
    serialNumber: 'SN-2024-J800-012',
    salesType: '임대(렌탈)',
    warrantyRemaining: '무상 11개월 잔여',
    historyTimeline: [
      { date: '2026-08-10', title: '메인 브러시 모터 점검 정상' }
    ]
  },
  {
    id: 'a1010101-1010-1010-1010-101010101010',
    name: '도곡렉슬아파트 관리사무소',
    manager: '최기술 기술팀장',
    phone: '010-7654-3210',
    address: '서울 강남구 선릉로 221',
    addressDetail: '지하 방재실 / (주)한결에프엠',
    assetModel: 'S7 (탑승형 습식청소기)',
    serialNumber: 'SN-2024-S7-088',
    salesType: '임대(렌탈)',
    warrantyRemaining: '보증 만료 (유상)',
    historyTimeline: [
      { date: '14일 전 (08-09)', title: '[반복 AS 2회차] 흡입 모터 1차 교체 완료', isWarning: true }
    ]
  },
  {
    id: 'a3333333-3333-3333-3333-333333333333',
    name: '가산디지털엠타워 관리단',
    manager: '강센터 관리실장',
    phone: '010-5432-1098',
    address: '서울 금천구 가산디지털1로 186',
    addressDetail: '지하 1층 하역장 / (주)피앤씨클린',
    assetModel: 'S5 (소형 탑승형 습식청소기)',
    serialNumber: 'SN-2025-S5-103',
    salesType: '임대(렌탈)',
    warrantyRemaining: '무상 10개월 잔여',
    historyTimeline: [
      { date: '2026-08-25', title: '충전기 플러그 접촉 점검 및 배터리 수위 체크' }
    ]
  },
  {
    id: 'a4444444-4444-4444-4444-444444444444',
    name: '탕정삼성트라팰리스 관리사무소',
    manager: '이달연 미화팀장',
    phone: '010-4123-8890',
    address: '충남 아산시 탕정면 트라팰리스로 41',
    addressDetail: '지하 1층 미화대기실 / (주)세원종합관리',
    assetModel: 'XD80 (탑승형 습식청소기)',
    serialNumber: 'SN-2025-XD80-041',
    salesType: '임대(렌탈)',
    warrantyRemaining: '무상 9개월 잔여',
    historyTimeline: [
      { date: '2026-08-18', title: '스퀴지 블레이드 마모 점검 및 교체' }
    ]
  },
  {
    id: 'a5555555-5555-5555-5555-555555555555',
    name: '성우하이텍 서창공장',
    manager: '김동민 시설과장',
    phone: '010-3321-7765',
    address: '경남 양산시 소주공단3길 50',
    addressDetail: '1공장 생산라인 B구역 / 본사 직영',
    assetModel: 'S800 (대형 탑승형 습식청소기)',
    serialNumber: 'SN-2024-S800-019',
    salesType: '임대(렌탈)',
    warrantyRemaining: '무상 5개월 잔여',
    historyTimeline: [
      { date: '2026-07-29', title: '구동모터 마그네틱 브레이크 해제 안내 및 정상화' }
    ]
  },
  {
    id: 'a6666666-6666-6666-6666-666666666666',
    name: '(주)케이로지스 화성센터',
    manager: '최현우 센터장',
    phone: '010-9988-7766',
    address: '경기 화성시 동탄물류로 112',
    addressDetail: '상온물류 A동 1층 하역장 / (주)마스터크린',
    assetModel: 'M100 (대형 탑승형 청소차)',
    serialNumber: 'SN-2025-M100-007',
    salesType: '임대(렌탈)',
    warrantyRemaining: '무상 12개월 잔여',
    historyTimeline: [
      { date: '2026-08-12', title: '사이드 브러시 벨트 장력 조정' }
    ]
  },
  {
    id: 'a7777777-7777-7777-7777-777777777777',
    name: '더샵반포리버파크 관리단',
    manager: '김재환 미화팀장',
    phone: '010-6543-2109',
    address: '서울 서초구 신반포로15길 19',
    addressDetail: '지하 2층 기전실 / (주)유림환경',
    assetModel: 'XD60 (보행식 습식청소기)',
    serialNumber: 'SN-2025-XD60-062',
    salesType: '임대(렌탈)',
    warrantyRemaining: '무상 8개월 잔여',
    historyTimeline: [
      { date: '2026-08-03', title: '오수탱크 만수 플로트 센서 이물질 세척' }
    ]
  },
  {
    id: 'a8888888-8888-8888-8888-888888888888',
    name: '우림라이온스밸리 관리단',
    manager: '구자륭 미화반장',
    phone: '010-5566-7788',
    address: '서울 금천구 가산디지털1로 168',
    addressDetail: 'A동 지하 1층 방재실 / (주)세원종합관리',
    assetModel: 'Q45 (보행식 습식청소기)',
    serialNumber: 'SN-2025-Q45-034',
    salesType: '임대(렌탈)',
    warrantyRemaining: '무상 6개월 잔여',
    historyTimeline: [
      { date: '2026-07-22', title: '흡입 호스 크랙 테이핑 및 신품 발주' }
    ]
  }
];

export const useCounselStore = create<CounselWorkstationState>((set, get) => ({
  isRecording: false,
  callSeconds: 0,
  counselorName: '이지은 상담원 (선임)',
  toastMessage: null,

  // Real Hardware Audio Player State
  activeAudioFile: null,
  activeAudioUrl: null,
  isAudioPlaying: false,
  isAudioPlayerOpen: false,
  audioCurrentTime: 0,
  audioDuration: 0,
  setActiveAudioFile: (file: File) => {
    const currentUrl = get().activeAudioUrl;
    if (currentUrl) {
      setTimeout(() => URL.revokeObjectURL(currentUrl), 300);
    }
    const newUrl = URL.createObjectURL(file);
    set({ 
      activeAudioFile: file, 
      activeAudioUrl: newUrl,
      isAudioPlaying: true,
      isAudioPlayerOpen: false,
      audioCurrentTime: 0,
      audioDuration: 0
    });
  },
  clearAudioFile: () => {
    const currentUrl = get().activeAudioUrl;
    if (currentUrl) URL.revokeObjectURL(currentUrl);
    set({ activeAudioFile: null, activeAudioUrl: null, isAudioPlaying: false, audioCurrentTime: 0, audioDuration: 0 });
  },
  setIsAudioPlayerOpen: (open: boolean) => set({ isAudioPlayerOpen: open }),
  setIsAudioPlaying: (playing: boolean) => set({ isAudioPlaying: playing }),
  setAudioTime: (current: number, duration: number) => set({ audioCurrentTime: current, audioDuration: duration }),

  // Full Session Reset on New Audio File Drop/Select
  resetSessionForNewAudio: () => set({
    rawParagraphs: [],
    finalParagraphs: [],
    interimSttText: '',
    correctionHistory: [],
    callSeconds: 0,
    selectedCustomer: null,
    activeKeywordEntity: null,
    detectedKeywordEntities: [],
    detectedKeywords: [],
    matchedDiagnosis: null,
    actionChecklist: [],
    manualOverrideKeyword: ''
  }),

  sttEngine: 'web_speech',
  setSttEngine: (engine) => set({ sttEngine: engine }),

  isContextCorrectionEnabled: true,
  correctionHistory: [],
  toggleContextCorrection: () => set((state) => ({ isContextCorrectionEnabled: !state.isContextCorrectionEnabled })),

  activeKeywordEntity: null,
  detectedKeywordEntities: [],
  setActiveKeywordEntity: (entity) => set({
    activeKeywordEntity: entity,
    matchedDiagnosis: {
      category: entity.category,
      partCode: entity.partCode,
      partName: entity.partName,
      stock: entity.stock,
      confidence: entity.confidence,
      source: `실시간 키워드 [${entity.keyword}] 즉시 연동`,
      selfActionGuide: entity.selfActionGuide
    },
    actionChecklist: entity.checklist.map((txt, idx) => ({ id: idx + 1, text: txt, checked: false }))
  }),
  addDetectedKeywordEntity: (entity) => set((state) => {
    const exists = state.detectedKeywordEntities.some(e => e.id === entity.id);
    if (exists) return state;
    return { detectedKeywordEntities: [...state.detectedKeywordEntities, entity] };
  }),

  searchQuery: '',
  customerList: DEFAULT_CUSTOMERS,
  selectedCustomer: null,

  // Clean initial state
  rawParagraphs: [],
  finalParagraphs: [],
  interimSttText: '',
  detectedKeywords: [],
  matchedDiagnosis: null,
  manualOverrideKeyword: '',

  actionChecklist: [],
  dispatchDrawerOpen: false,
  salesModalOpen: false,
  dispatchNote: '',
  assignedEngineer: '김철수 정비기사 (화성/경기남부)',
  dispatchDate: '2026-08-24 10:00',

  setRecording: (status) => set({ isRecording: status }),
  incrementCallTimer: () => set((state) => ({ callSeconds: state.callSeconds + 1 })),
  resetCallTimer: () => set({ callSeconds: 0 }),
  setSearchQuery: (query) => {
    const q = query.trim().toLowerCase();
    const qCompact = q.replace(/[\s-]/g, '');
    if (!q) {
      set({ searchQuery: query, customerList: DEFAULT_CUSTOMERS });
      return;
    }
    const filtered = DEFAULT_CUSTOMERS.filter((c) => {
      const hay = `${c.name} ${c.manager} ${c.phone} ${c.address} ${c.addressDetail} ${c.assetModel} ${c.serialNumber}`.toLowerCase();
      const hayCompact = hay.replace(/[\s-]/g, '');
      return hay.includes(q) || (qCompact.length >= 2 && hayCompact.includes(qCompact));
    });
    set({ searchQuery: query, customerList: filtered.length > 0 ? filtered : DEFAULT_CUSTOMERS });
  },
  selectCustomer: (customer) => set({ selectedCustomer: customer }),
  setSelectedCustomerModel: (modelName) => set((state) => {
    const cleanCode = modelName.replace(/[^A-Za-z0-9]/g, '');
    const baseCustomer: CustomerInfo = state.selectedCustomer || {
      id: 'live-dynamic-customer',
      name: '',
      manager: '',
      phone: '',
      address: '',
      addressDetail: '',
      assetModel: '',
      serialNumber: '',
      salesType: '미확인',
      warrantyRemaining: '확인 대기',
      historyTimeline: []
    };
    return {
      selectedCustomer: {
        ...baseCustomer,
        assetModel: modelName ? `${modelName} (실시간 발화 자동 식별)` : '',
        serialNumber: cleanCode ? `SN-2025-${cleanCode}-AUTO` : ''
      }
    };
  }),
  appendFinalParagraph: (rawText, correctedText, newCorrections) => set((state) => {
    const trimmed = (correctedText || rawText || '').trim();
    if (!trimmed) return state;

    // ── 자막 중복 및 점진적 확장 방어 (Deduplication & Prefix-Expansion Guard) ──
    const lastParagraph = state.finalParagraphs[state.finalParagraphs.length - 1];
    if (lastParagraph) {
      // 타임스탬프 [mm:ss] 제거 후 본문 비교
      const cleanLast = lastParagraph.replace(/^\[\d{1,2}:\d{2}(?::\d{2})?\]\s*/, '').replace(/[.,?!~]/g, '').trim();
      const cleanCurrent = trimmed.replace(/^\[\d{1,2}:\d{2}(?::\d{2})?\]\s*/, '').replace(/[.,?!~]/g, '').trim();

      // 1) 직전 문장과 100% 동일한 경우 무시
      if (cleanLast === cleanCurrent) {
        return state;
      }

      // 2) 직전 문장이 현재 문장의 앞부분과 겹치는 경우 (미완성 문장이 길게 완성된 경우) -> 직전 줄을 현재 완성문장으로 교체(Update)
      if (cleanLast.length >= 4 && cleanCurrent.startsWith(cleanLast)) {
        const updatedRaw = [...state.rawParagraphs];
        const updatedFinal = [...state.finalParagraphs];
        updatedRaw[updatedRaw.length - 1] = rawText;
        updatedFinal[updatedFinal.length - 1] = trimmed;
        return {
          rawParagraphs: updatedRaw,
          finalParagraphs: updatedFinal,
          correctionHistory: [...state.correctionHistory, ...newCorrections]
        };
      }

      // 3) 직전 문장이 현재 문장의 뒷부분과 겹치거나 완전히 포함하고 있는 경우 무시
      if (cleanLast.length > 5 && (cleanLast.endsWith(cleanCurrent) || cleanLast.includes(cleanCurrent))) {
        return state;
      }
    }

    return {
      rawParagraphs: [...state.rawParagraphs, rawText],
      finalParagraphs: [...state.finalParagraphs, trimmed],
      correctionHistory: [...state.correctionHistory, ...newCorrections]
    };
  }),
  setInterimSttText: (text) => set({ interimSttText: text }),
  clearTranscript: () => set({ rawParagraphs: [], finalParagraphs: [], interimSttText: '', correctionHistory: [] }),
  setDiagnosisResult: (keywords, diagnosis, checklist) => set({
    detectedKeywords: keywords,
    matchedDiagnosis: diagnosis,
    actionChecklist: checklist.map((txt, idx) => ({ id: idx + 1, text: txt, checked: false }))
  }),
  toggleChecklist: (id) => set((state) => ({
    actionChecklist: state.actionChecklist.map((item) =>
      item.id === id ? { ...item, checked: !item.checked } : item
    )
  })),
  setManualOverrideKeyword: (kw) => set({ manualOverrideKeyword: kw }),
  setDispatchDrawerOpen: (open) => set({ dispatchDrawerOpen: open }),
  setSalesModalOpen: (open) => set({ salesModalOpen: open }),
  setDispatchNote: (note) => set({ dispatchNote: note }),
  setAssignedEngineer: (engineer) => set({ assignedEngineer: engineer }),
  setDispatchDate: (date) => set({ dispatchDate: date }),
  showToast: (msg) => set({ toastMessage: msg }),
  clearToast: () => set({ toastMessage: null })
}));
