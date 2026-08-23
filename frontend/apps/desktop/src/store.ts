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

  // A/B Dual STT Engine Selection
  sttEngine: 'whisper_large_v3' | 'web_speech';
  setSttEngine: (engine: 'whisper_large_v3' | 'web_speech') => void;

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
  selectedCustomer: CustomerInfo;

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
  selectCustomer: (customer: CustomerInfo) => void;
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

const DEFAULT_CUSTOMERS: CustomerInfo[] = [
  {
    id: 'a1111111-1111-1111-1111-111111111111',
    name: '(주)스페이스클린 강남점',
    manager: '최관리 팀장',
    phone: '010-9123-4567',
    address: '서울 강남구 테헤란로 123',
    addressDetail: '지하 1층 방재실',
    assetModel: 'SC-500 프리미엄 습식청소기',
    serialNumber: 'SN-2025-SC500-089',
    salesType: '임대(렌탈)',
    warrantyRemaining: '무상 7개월 잔여',
    historyTimeline: [
      { date: '14일 전 (08-09)', title: '⚠ [30일 내 반복 고장 경고] 흡입모터 1차 교체 완료', isWarning: true },
      { date: '2026-07-10', title: '솔레노이드 급수밸브 신품 교체 완료' },
      { date: '2026-05-15', title: '정기 점검 및 스퀴지 고무 블레이드 교체' }
    ]
  },
  {
    id: 'a2222222-2222-2222-2222-222222222222',
    name: '(주)미래물류센터 평택점',
    manager: '정센터장',
    phone: '010-8234-5678',
    address: '경기 평택시 산단로 45',
    addressDetail: '1층 물류데크',
    assetModel: 'SC-800 대형 탑승형청소기',
    serialNumber: 'SN-2024-SC800-012',
    salesType: '임대(렌탈)',
    warrantyRemaining: '무상 11개월 잔여',
    historyTimeline: [
      { date: '2026-06-20', title: '구동 브러시 모터 점검 완료' }
    ]
  },
  {
    id: 'a1010101-1010-1010-1010-101010101010',
    name: '(주)케이로지스 화성센터',
    manager: '오센터장',
    phone: '010-8888-4444',
    address: '경기 화성시 남양읍 남양로 300',
    addressDetail: 'A동 입출고 하역장',
    assetModel: 'SC-800 대형 탑승형청소기',
    serialNumber: 'SN-2024-SC800-088',
    salesType: '임대(렌탈)',
    warrantyRemaining: '보증 만료 (유상)',
    historyTimeline: [
      { date: '14일 전 (08-09)', title: '⚠ [반복 AS 2회차] 흡입 모터 1차 교체 완료', isWarning: true }
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
    if (currentUrl) URL.revokeObjectURL(currentUrl);
    const newUrl = URL.createObjectURL(file);
    set({ 
      activeAudioFile: file, 
      activeAudioUrl: newUrl,
      isAudioPlaying: true,
      isAudioPlayerOpen: false
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
    activeKeywordEntity: null,
    detectedKeywordEntities: [],
    detectedKeywords: [],
    matchedDiagnosis: null,
    actionChecklist: [],
    manualOverrideKeyword: ''
  }),

  sttEngine: 'whisper_large_v3',
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
  selectedCustomer: DEFAULT_CUSTOMERS[0],

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
  setSearchQuery: (query) => set({ searchQuery: query }),
  selectCustomer: (customer) => set({ selectedCustomer: customer }),
  appendFinalParagraph: (rawText, correctedText, newCorrections) => set((state) => {
    const trimmed = (correctedText || rawText || '').trim();
    if (!trimmed) return state;

    // ── 자막 중복 방어 (Deduplication Guard) ──────────────────────────────────
    // 직전 문장과 100% 동일하거나, 직전 문장이 현재 문장을 완전히 포함하는 경우 중복 방지
    const lastParagraph = state.finalParagraphs[state.finalParagraphs.length - 1];
    if (lastParagraph) {
      const cleanLast = lastParagraph.replace(/[.,?!~]/g, '').trim();
      const cleanCurrent = trimmed.replace(/[.,?!~]/g, '').trim();
      if (cleanLast === cleanCurrent || (cleanLast.length > 5 && cleanLast.endsWith(cleanCurrent))) {
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
