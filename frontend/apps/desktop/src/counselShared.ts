/**
 * counselShared.ts
 * 상담 진단 공통 도메인 타입, 기본 고객 프리셋, 한글 초성·음운 유사도 매칭 유틸 (SSOT)
 */

import { applyContextualCorrection, computeJamoSimilarity } from './contextCorrector';
import { DOMAIN_KEYWORD_REGISTRY } from './keywordRegistryData';
import { extractNegativeStateExpressions } from './keywordExtractors';
import type { DispatchDoc1st, DispatchDoc2nd } from './dispatchDocTypes';

export interface Customer {
  id: string;
  name: string;             // 원청 고객사 (예: 반포자이 아파트 관리사무소)
  manager: string;          // 원청 결재권자 (예: 박시설 시설과장)
  phone: string;            // 원청 결재자 연락처 (예: 010-9876-5432)
  managerEmail?: string;    // 원청 결재자 이메일
  address?: string;         // 도로명/지번 주소 (예: 서울 서초구 신반포로 270)
  addressDetail?: string;   // 동·층·상세위치 (예: 지하 1층 방재실)
  useCompany?: string;      // 실사용처/하청 용역사 (예: (주)클린에코 청소용역)
  siteWorkerName?: string;  // 현장 통화자/미화원 (예: 김순자 미화반장)
  siteWorkerPhone?: string; // 현장 통화자 연락처 (예: 010-3456-7890)
  assetModel: string;       // 보유 장비 모델 (예: J600T)
  serialNumber: string;     // 일련번호 (예: J600T-2024-0812)
  salesType: string;        // 계약구분 (예: 렌탈(임대))
  historyTimeline: { date: string; title: string; isWarning?: boolean }[];
}

// ─── 건물/아파트 관리사무소(원청) & 청소용역(하청) 기본 B2B 고객사 프리셋 ─────────────
export const DEFAULT_B2B_CUSTOMERS: Customer[] = [
  {
    id: 'cust-001',
    name: '반포자이 아파트 관리사무소',
    manager: '박시설 시설과장',
    phone: '010-9876-5432',
    managerEmail: 'facility@banpojai.co.kr',
    address: '서울 서초구 신반포로 270',
    addressDetail: '지하 1층 방재실',
    useCompany: '(주)클린에코 청소용역',
    siteWorkerName: '김순자 미화반장',
    siteWorkerPhone: '010-3456-7890',
    assetModel: 'J600T',
    serialNumber: 'J600T-2024-0812',
    salesType: '렌탈(임대)',
    historyTimeline: [
      { date: '2026-09-15', title: '정기 소모품(스퀴지 러버) 납품 완료' },
      { date: '2026-07-20', title: '배터리 증류수 보충 및 점검' }
    ]
  },
  {
    id: 'cust-002',
    name: '래미안퍼스티지 관리지원센터',
    manager: '이관리 관리소장',
    phone: '010-8765-4321',
    managerEmail: 'raemian.mgr@seoul.kr',
    address: '서울 서초구 반포대로 275',
    addressDetail: '지하 2층 주차장 관리소',
    useCompany: '(주)삼원종합관리 미화팀',
    siteWorkerName: '이영희 미화원',
    siteWorkerPhone: '010-2345-6789',
    assetModel: 'J800',
    serialNumber: 'J800-2023-1104',
    salesType: '렌탈(임대)',
    historyTimeline: [
      { date: '2026-08-10', title: '메인 브러시 모터 점검 정상' }
    ]
  },
  {
    id: 'cust-003',
    name: '도곡렉슬아파트 관리사무소',
    manager: '최기술 기술팀장',
    phone: '010-7654-3210',
    managerEmail: 'choi.tech@rexle.com',
    address: '서울 강남구 선릉로 221',
    addressDetail: '지하 방재실',
    useCompany: '(주)한결에프엠',
    siteWorkerName: '박철수 조장',
    siteWorkerPhone: '010-5678-1234',
    assetModel: 'S7',
    serialNumber: 'S7-2024-0309',
    salesType: '직구매(유지보수계약)',
    historyTimeline: [
      { date: '2026-06-02', title: '필터 및 흡입 호스 정기 세척' }
    ]
  },
  {
    id: 'cust-004',
    name: '송도더샵퍼스트월드 관리단',
    manager: '정운영 운영총괄',
    phone: '010-6543-2109',
    managerEmail: 'songdo.thesharp@mgmt.com',
    address: '인천 연수구 해돋이로 107',
    addressDetail: 'A동 지하 1층 기전실',
    useCompany: '(주)대경종합개발',
    siteWorkerName: '정명자 반장',
    siteWorkerPhone: '010-4321-8765',
    assetModel: 'J600T',
    serialNumber: 'J600T-2025-0105',
    salesType: '렌탈(임대)',
    historyTimeline: [
      { date: '2026-09-01', title: '정기 점검 및 구동 모터 체크' }
    ]
  },
  {
    id: 'cust-005',
    name: '가산디지털엠타워 관리단',
    manager: '강센터 관리실장',
    phone: '010-5432-1098',
    managerEmail: 'mtower.as@gasan.co.kr',
    address: '서울 금천구 가산디지털1로 186',
    addressDetail: '지하 1층 하역장',
    useCompany: '(주)피앤씨클린',
    siteWorkerName: '최순덕 미화원',
    siteWorkerPhone: '010-3210-9876',
    assetModel: 'S5',
    serialNumber: 'S5-2024-0518',
    salesType: '렌탈(임대)',
    historyTimeline: [
      { date: '2026-08-25', title: '충전기 플러그 접촉 점검' }
    ]
  },
  {
    id: 'cust-006',
    name: '탕정삼성트라팰리스 관리사무소',
    manager: '이달연 미화팀장',
    phone: '010-4123-8890',
    managerEmail: 'tangjeong@trapalace.co.kr',
    address: '충남 아산시 탕정면 트라팰리스로 41',
    addressDetail: '지하 1층 미화대기실',
    useCompany: '(주)세원종합관리',
    siteWorkerName: '이달연 미화팀장',
    siteWorkerPhone: '010-4123-8890',
    assetModel: 'XD80',
    serialNumber: 'XD80-2025-041',
    salesType: '렌탈(임대)',
    historyTimeline: [
      { date: '2026-08-18', title: '스퀴지 블레이드 마모 점검 및 교체' }
    ]
  },
  {
    id: 'cust-007',
    name: '성우하이텍 서창공장',
    manager: '김동민 시설과장',
    phone: '010-3321-7765',
    managerEmail: 'dmkim@swhitech.com',
    address: '경남 양산시 소주공단3길 50',
    addressDetail: '1공장 생산라인 B구역',
    useCompany: '성우하이텍 직영환경팀',
    siteWorkerName: '박현수 반장',
    siteWorkerPhone: '010-3321-7799',
    assetModel: 'S800',
    serialNumber: 'S800-2024-019',
    salesType: '렌탈(임대)',
    historyTimeline: [
      { date: '2026-07-29', title: '구동모터 마그네틱 브레이크 해제 안내 및 정상화' }
    ]
  },
  {
    id: 'cust-008',
    name: '(주)케이로지스 화성센터',
    manager: '최현우 센터장',
    phone: '010-9988-7766',
    managerEmail: 'hwchoi@klogis.co.kr',
    address: '경기 화성시 동탄물류로 112',
    addressDetail: '상온물류 A동 1층 하역장',
    useCompany: '(주)마스터크린',
    siteWorkerName: '정기호 현장소장',
    siteWorkerPhone: '010-8877-6655',
    assetModel: 'M100',
    serialNumber: 'M100-2025-007',
    salesType: '렌탈(임대)',
    historyTimeline: [
      { date: '2026-08-12', title: '사이드 브러시 벨트 장력 조정' }
    ]
  },
  {
    id: 'cust-009',
    name: '더샵반포리버파크 관리단',
    manager: '김재환 미화팀장',
    phone: '010-6543-2109',
    managerEmail: 'banporiver@thesharp.co.kr',
    address: '서울 서초구 신반포로15길 19',
    addressDetail: '지하 2층 기전실',
    useCompany: '(주)유림환경',
    siteWorkerName: '김재환 미화팀장',
    siteWorkerPhone: '010-6543-2109',
    assetModel: 'XD60',
    serialNumber: 'XD60-2025-062',
    salesType: '렌탈(임대)',
    historyTimeline: [
      { date: '2026-08-03', title: '오수탱크 만수 플로트 센서 이물질 세척' }
    ]
  },
  {
    id: 'cust-010',
    name: '우림라이온스밸리 관리단',
    manager: '구자륭 미화반장',
    phone: '010-5566-7788',
    managerEmail: 'woorim@lionsvalley.co.kr',
    address: '서울 금천구 가산디지털1로 168',
    addressDetail: 'A동 지하 1층 방재실',
    useCompany: '(주)세원종합관리',
    siteWorkerName: '구자륭 미화반장',
    siteWorkerPhone: '010-5566-7788',
    assetModel: 'Q45',
    serialNumber: 'Q45-2025-034',
    salesType: '렌탈(임대)',
    historyTimeline: [
      { date: '2026-07-22', title: '흡입 호스 크랙 테이핑 및 신품 발주' }
    ]
  }
];

export interface DiagnosticStep {
  step_no: number;
  title: string;
  method?: string;
  criteria_normal?: string;
  criteria_fault?: string;
  fault_action?: string;
  status?: 'pending' | 'active' | 'resolved' | 'unresolved';
}

export type CounselStatus = 'in_progress' | 'resolved_by_call' | 'visit_required';

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
  managerEmail?: string;
  useCompany?: string;
  siteWorkerName?: string;
  siteWorkerPhone?: string;
  serialNumber: string;
  modelName: string;
  activeSymptomKey: string | null;
  symptomSessions: Record<string, SymptomSession>;
  notes: string;
  counselorName: string;
  summaryText: string;
  currentStepSummary: string;
  selectedErrorCodes: string[];
  doc1st?: DispatchDoc1st;
  doc2nd?: DispatchDoc2nd;
}


export interface SymptomPreset {
  id?: string;
  title: string;
  symptom: string;
  tag?: string;
  urgency: string;
  category?: string;
  aliases?: string[];
  part_code?: string;
  official_error_codes?: OfficialErrorCode[];
  call_script?: string;
  steps?: DiagnosticStep[];
  action_plan?: {
    keyword?: string;
    part_code?: string;
    urgency?: string;
    can_self_resolve?: boolean;
    call_script?: string;
    steps?: (DiagnosticStep | string | any)[];
  };
  [key: string]: any;
}

export interface KbResult {
  id: string;
  summary: string;
  equipment_model: string;
  symptoms: string[];
  parts_mentioned: string[];
  action_items: string[];
  urgency: string;
  similarity: number;
}

export const EQUIPMENT_MODELS = ['J600T', 'J800', 'S7', 'S5', 'S1', 'S3', 'W12', 'W15', 'S2', 'S12', '쓰담', '전체'];
export const SYMPTOM_CATEGORIES = ['전체', '에러코드', '충전/전원', '흡입/잔수', '브러시/구동', '세척수/배관', '외관/기타'];

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
  const correctedQuery = applyContextualCorrection(query).correctedText || query;
  const candidates = correctedQuery !== query ? [query, correctedQuery] : [query];
  const tNorm = target.toLowerCase();
  const tClean = cleanForSearch(target);
  const tChosung = extractChosung(tNorm);
  const tCleanChosung = extractChosung(tClean);

  for (const cand of candidates) {
    const qNorm = cand.toLowerCase();
    // 1. 단순 텍스트 포함
    if (tNorm.includes(qNorm)) return true;

    // 2. 공백/특수문자 제거 후 텍스트 포함
    const qClean = cleanForSearch(cand);
    if (qClean && tClean.includes(qClean)) return true;

    // 3. 초성 분해 포함
    const qChosung = extractChosung(qNorm);
    if (qChosung && tChosung.includes(qChosung)) return true;

    // 4. 공백/특수문자 제거 후 초성 포함
    const qCleanChosung = extractChosung(qClean);
    if (qCleanChosung && tCleanChosung.includes(qCleanChosung)) return true;

    // 5. 한국어 자모 음운 유사도 슬라이딩 비교 (예: 솔노이드 vs 솔레노이드, 스끼즈 vs 스퀴지)
    if (qClean.length >= 3 && tClean.length >= 3 && /[가-힣]/.test(qClean)) {
      const qLen = qClean.length;
      const minW = Math.max(3, qLen - 1);
      const maxW = Math.min(tClean.length, qLen + 1);
      for (let w = minW; w <= maxW; w++) {
        for (let i = 0; i + w <= tClean.length; i++) {
          const sub = tClean.slice(i, i + w);
          if (computeJamoSimilarity(qClean, sub) >= 0.78) {
            return true;
          }
        }
      }
    }
  }

  return false;
}

export function calculateSymptomMatchScore(preset: SymptomPreset, query: string): number {
  if (!query || !query.trim()) return 1;
  const rawQ = query.trim();
  const correctedQ = applyContextualCorrection(rawQ).correctedText.trim();
  const q = correctedQ.toLowerCase();
  let score = 0;

  // 0. 16대 표준 고장 구어체 조합 정규식(DOMAIN_KEYWORD_REGISTRY) 직접 매칭
  for (const entity of DOMAIN_KEYWORD_REGISTRY) {
    const isSamePreset =
      (preset.id && entity.canonicalId === preset.id) ||
      (preset.part_code && entity.partCode === preset.part_code) ||
      preset.title.includes(entity.keyword.split('/')[0].trim());
    if (isSamePreset && (entity.synonyms.test(rawQ) || entity.synonyms.test(correctedQ))) {
      score = Math.max(score, 85);
      break;
    }
  }

  // 0-B. 부정적 상태표현 구문 추출기 ([OOO + 안됨/불가/파손/깨짐/부서짐/빠짐/뽑힘]) 매칭
  const negStates = [
    ...extractNegativeStateExpressions(correctedQ),
    ...extractNegativeStateExpressions(rawQ)
  ];
  for (const st of negStates) {
    if (st.mappedKeywordId) {
      const entity = DOMAIN_KEYWORD_REGISTRY.find(e => e.id === st.mappedKeywordId);
      if (entity) {
        const isSamePreset =
          (preset.id && entity.canonicalId === preset.id) ||
          (preset.part_code && entity.partCode === preset.part_code) ||
          preset.title.includes(entity.keyword.split('/')[0].trim());
        if (isSamePreset) {
          score = Math.max(score, 92);
        }
      }
    }
    if (st.target && st.target.length >= 2) {
      if (
        matchesChosungOrText(preset.title, st.target) ||
        preset.aliases?.some(a => matchesChosungOrText(a, st.target)) ||
        matchesChosungOrText(preset.symptom, st.target)
      ) {
        score = Math.max(score, 78);
      }
    }
  }

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
        score = Math.max(score, 65);
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
        score = Math.max(score, 55);
        break;
      }
    }
  }

  // 4. Symptom 설명 매칭
  if (matchesChosungOrText(preset.symptom, q)) {
    score = Math.max(score, 45);
  }

  // 5. Part Code 또는 Category 매칭
  if (matchesChosungOrText(preset.part_code, q) || matchesChosungOrText(preset.category, q)) {
    score = Math.max(score, 35);
  }

  return score;
}

export function matchesIntegratedSessionQuery(record: ConsultSessionRecord, fullQuery: string): boolean {
  if (!fullQuery || !fullQuery.trim()) return true;
  const tokens = fullQuery.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;

  const rawPhone = record.phone || '';
  const cleanDigitsPhone = rawPhone.replace(/\D/g, '');
  const sitePhone = record.siteWorkerPhone || '';
  const cleanDigitsSitePhone = sitePhone.replace(/\D/g, '');

  return tokens.every(token => {
    const tLower = token.toLowerCase();
    const tokenDigits = token.replace(/\D/g, '');

    // ① 전화번호 매칭 (원청 결재자 및 현장 통화자 전화번호)
    if (rawPhone && rawPhone.toLowerCase().includes(tLower)) return true;
    if (tokenDigits.length >= 2 && cleanDigitsPhone.includes(tokenDigits)) return true;
    if (sitePhone && sitePhone.toLowerCase().includes(tLower)) return true;
    if (tokenDigits.length >= 2 && cleanDigitsSitePhone.includes(tokenDigits)) return true;

    // ② 고객명 (원청 관리소명) (초성 및 텍스트)
    if (matchesChosungOrText(record.customerName, token)) return true;

    // ②-2 실사용처 (하청 용역사명)
    if (record.useCompany && matchesChosungOrText(record.useCompany, token)) return true;

    // ③ 담당자 (원청 결재자 및 현장 미화원) (초성 및 텍스트)
    if (matchesChosungOrText(record.manager, token)) return true;
    if (record.siteWorkerName && matchesChosungOrText(record.siteWorkerName, token)) return true;

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
