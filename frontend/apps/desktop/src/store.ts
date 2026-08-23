import { create } from 'zustand';
import type { CorrectionEvent } from './contextCorrector';

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
}

interface CounselWorkstationState {
  // Global / Call State
  isRecording: boolean;
  callSeconds: number;
  counselorName: string;
  toastMessage: string | null;

  // Contextual STT Semantic Correction Engine
  isContextCorrectionEnabled: boolean;
  correctionHistory: CorrectionEvent[];
  toggleContextCorrection: () => void;

  // Panel A: Customer & Asset
  searchQuery: string;
  customerList: CustomerInfo[];
  selectedCustomer: CustomerInfo;

  // Panel B: STT & Live Streaming
  rawFinalSttText: string;
  finalSttText: string;
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
  setSearchQuery: (query: string) => void;
  selectCustomer: (customer: CustomerInfo) => void;
  appendFinalSttText: (rawText: string, correctedText: string, corrections: CorrectionEvent[]) => void;
  setInterimSttText: (text: string) => void;
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

export const useCounselStore = create<CounselWorkstationState>((set) => ({
  isRecording: false,
  callSeconds: 204, // 03:24
  counselorName: '이지은 상담원 (선임)',
  toastMessage: null,

  isContextCorrectionEnabled: true,
  correctionHistory: [
    { original: '스키즈', corrected: '스퀴지', category: '소모품/스퀴지', timestamp: '03:10' },
    { original: '흐빕 모터', corrected: '흡입 모터', category: '구동/흡입', timestamp: '03:15' }
  ],
  toggleContextCorrection: () => set((state) => ({ isContextCorrectionEnabled: !state.isContextCorrectionEnabled })),

  searchQuery: '',
  customerList: DEFAULT_CUSTOMERS,
  selectedCustomer: DEFAULT_CUSTOMERS[0],

  rawFinalSttText: '흡입 모터 쪽에서 타는 냄새가 나고 굉음이 심하게 발생하면서',
  finalSttText: '흡입 모터 쪽에서 타는 냄새가 나고 굉음이 심하게 발생하면서',
  interimSttText: '바닥 오수 흡입이 전혀 안돼요...',
  detectedKeywords: ['흡입모터 굉음', '타는 냄새', '오수 흡입불량'],
  matchedDiagnosis: {
    category: 'POWER / 흡입·구동계통',
    partCode: 'SUCTION',
    partName: '흡입모터 24V 500W 어셈블리',
    stock: 14,
    confidence: 96,
    source: '정식 등록 룰베이스 (pg_trgm 0.96)'
  },
  manualOverrideKeyword: '',

  actionChecklist: [
    { id: 1, text: '전원 스위치 즉시 차단 및 모터 하우징 열기 냉각 안내', checked: true },
    { id: 2, text: '폐수탱크 플로트 밸브(만수 차단기) 오작동/이물질 확인', checked: true },
    { id: 3, text: '흡입 호스 및 스퀴지 연결부 막힘 육안 점검', checked: false },
    { id: 4, text: '10분 후 재가동 시 동일 소음/타는 냄새 지속 여부 확인', checked: false },
    { id: 5, text: '증상 지속 시 1차 셀프조치 중단 및 현장 긴급 정밀점검 배차', checked: false }
  ],
  dispatchDrawerOpen: false,
  salesModalOpen: false,
  dispatchNote: '흡입 모터 과열 및 굉음 발생 건. 14일 전 기교체 이력 확인됨. 진공압 및 메인 전압 정밀 계측 출장 요망.',
  assignedEngineer: '김철수 정비기사 (화성/경기남부)',
  dispatchDate: '2026-08-24 10:00',

  setRecording: (status) => set({ isRecording: status }),
  incrementCallTimer: () => set((state) => ({ callSeconds: state.callSeconds + 1 })),
  setSearchQuery: (query) => set({ searchQuery: query }),
  selectCustomer: (customer) => set({ selectedCustomer: customer }),
  appendFinalSttText: (rawText, correctedText, newCorrections) => set((state) => ({
    rawFinalSttText: (state.rawFinalSttText ? state.rawFinalSttText + ' ' : '') + rawText,
    finalSttText: (state.finalSttText ? state.finalSttText + ' ' : '') + correctedText,
    correctionHistory: [...state.correctionHistory, ...newCorrections]
  })),
  setInterimSttText: (text) => set({ interimSttText: text }),
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
