import type { Category } from './scheduleApi';

export type OutcomeType =
  | 'TECH_COUNSEL'
  | 'SALES_QUOTE'
  | 'DEMO_REQUEST'
  | 'DELIVERY_ADJUST'
  | 'AS_SCHEDULE';

export interface RequestedItem {
  name: string;
  qty: number;
  note?: string;
}

export interface WrapupOutcomeFields {
  symptomCategory?: string;
  symptomDetail?: string;
  resolutionStatus?: string;
  checkedStepsSummary?: string;
  quoteType?: string;
  requestedItems?: RequestedItem[];
  quoteDeliveryMethod?: string;
  industry?: string;
  floorSpec?: string;
  contaminant?: string;
  recommendedModel?: string;
  isReschedule?: boolean;
  originalDateText?: string;
  requestedDateIso?: string;
  requestedDateLabel?: string;
  assignedEngineer?: string;
  shipMethod?: string;
  nextVisitParts?: string;
  actionMemo?: string;
}

export interface WrapupOutcomeItem {
  id: string;
  checked: boolean;
  outcomeType: OutcomeType;
  title: string;
  confidence: number;
  scheduleCategory: Category;
  worktype: string;
  fields: WrapupOutcomeFields;
}

export interface OverallSummary {
  issue: string;
  guidance: string;
  conclusion: string;
}

export const OUTCOME_META: Record<
  OutcomeType,
  {
    label: string;
    badgeBg: string;
    badgeColor: string;
    borderColor: string;
    defaultCategory: Category;
    defaultWorktype: string;
  }
> = {
  TECH_COUNSEL: {
    label: '기술상담 (증상별)',
    badgeBg: '#dcfce7',
    badgeColor: '#166534',
    borderColor: '#86efac',
    defaultCategory: 'other',
    defaultWorktype: '기타',
  },
  SALES_QUOTE: {
    label: '영업문의 (구매/견적)',
    badgeBg: '#fef3c7',
    badgeColor: '#92400e',
    borderColor: '#fcd34d',
    defaultCategory: 'part-ship',
    defaultWorktype: '부품예정',
  },
  DEMO_REQUEST: {
    label: '데모시연 접수',
    badgeBg: '#e0f2fe',
    badgeColor: '#075985',
    borderColor: '#7dd3fc',
    defaultCategory: 'sales-demo',
    defaultWorktype: '시연',
  },
  DELIVERY_ADJUST: {
    label: '납품일정 조정',
    badgeBg: '#ede9fe',
    badgeColor: '#5b21b6',
    borderColor: '#c4b5fd',
    defaultCategory: 'equip-ship',
    defaultWorktype: '출고예정',
  },
  AS_SCHEDULE: {
    label: 'AS 방문일정·출장접수',
    badgeBg: '#fee2e2',
    badgeColor: '#991b1b',
    borderColor: '#fca5a5',
    defaultCategory: 'as-service',
    defaultWorktype: '현장수리',
  },
};

export function getTomorrowAfternoonIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T14:00`;
}
