/**
 * CategorySchema.ts
 * 업무 카테고리별 extra 필드 동적 스키마 정의
 * (space-dust CATEGORY_SCHEMAS를 TypeScript로 이식)
 */

export type FieldType =
  | 'text' | 'textarea' | 'number' | 'date'
  | 'select' | 'toggle' | 'datalist' | 'chips'
  | 'photostatus' | 'parts';

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  unit?: string;
  options?: string[];
  statuses?: string[];
  onText?: string;
  offText?: string;
  perEquip?: boolean;
  noPrice?: boolean;
  withNote?: boolean;
  placeholder?: string;
  enabledIfKey?: string;   // 이 key 필드가 특정 값일 때만 활성
  enabledIfValue?: string;
}

export interface TabDef {
  key: string;
  label: string;
  fields: FieldDef[];
  carryFrom?: Record<string, string>; // {fromKey: toKey}
}

export interface CategorySchema {
  tabs?: TabDef[];
  fields?: FieldDef[];  // 탭 없이 단일 필드셋
}

// ─── 공통 필드 정의 헬퍼 ─────────────────────────────────────────────────────

const f = {
  text:        (key: string, label: string, extra?: Partial<FieldDef>): FieldDef => ({ key, label, type: 'text', ...extra }),
  textarea:    (key: string, label: string, extra?: Partial<FieldDef>): FieldDef => ({ key, label, type: 'textarea', ...extra }),
  number:      (key: string, label: string, unit: string, extra?: Partial<FieldDef>): FieldDef => ({ key, label, type: 'number', unit, ...extra }),
  date:        (key: string, label: string, extra?: Partial<FieldDef>): FieldDef => ({ key, label, type: 'date', ...extra }),
  select:      (key: string, label: string, options: string[], extra?: Partial<FieldDef>): FieldDef => ({ key, label, type: 'select', options, ...extra }),
  toggle:      (key: string, label: string, onText: string, offText: string, extra?: Partial<FieldDef>): FieldDef => ({ key, label, type: 'toggle', onText, offText, ...extra }),
  datalist:    (key: string, label: string, extra?: Partial<FieldDef>): FieldDef => ({ key, label, type: 'datalist', ...extra }),
  chips:       (key: string, label: string, options: string[], extra?: Partial<FieldDef>): FieldDef => ({ key, label, type: 'chips', options, ...extra }),
  photostatus: (key: string, label: string, statuses: string[], extra?: Partial<FieldDef>): FieldDef => ({ key, label, type: 'photostatus', statuses, ...extra }),
  parts:       (key: string, label: string, extra?: Partial<FieldDef>): FieldDef => ({ key, label, type: 'parts', ...extra }),
};

// ─── 카테고리별 스키마 ────────────────────────────────────────────────────────

export const CATEGORY_SCHEMAS: Record<string, CategorySchema> = {

  'sales-demo': {
    tabs: [
      {
        key: 'receive', label: '접수시', fields: [
          f.text('industry', '업종'),
          f.text('floorSpec', '바닥 면적/재질'),
          f.text('contaminant', '주된 이물질'),
          f.select('quoteType', '견적제공', ['무제공', '구두', '견적서']),
          f.text('quoteNumber', '견적서번호', { enabledIfKey: 'quoteType', enabledIfValue: '견적서' }),
          f.parts('quoteParts', '견적 부품'),
          f.textarea('memoReceive', '기타'),
        ],
      },
      {
        key: 'post', label: '영업/시연후', fields: [
          f.text('floorCondition', '바닥상태'),
          f.text('demoDetail', '시연내용(브러시/패드타입/세제)'),
          f.text('demoIssue', '시연중 문제점'),
          f.select('satisfaction', '시연만족도', ['상', '중', '하']),
          f.date('purchaseEta', '구매예상시기'),
          f.photostatus('photoStatus', '사진촬영', ['사진촬영', '캘린더', '클라우드']),
          f.textarea('memoPost', '기타(엘리베이터 및 특이사항)'),
        ],
      },
    ],
  },

  'equip-ship': {
    fields: [
      f.text('basicType', '장비 기본타입', { perEquip: true }),
      f.text('batteryInfo', '배터리 정보', { perEquip: true }),
      f.text('chargerInfo', '충전기 정보', { perEquip: true }),
      f.textarea('lithiumSerial', '리튬 시리얼', { perEquip: true }),
      f.datalist('inspector', '완성검사자', { perEquip: true }),
      f.toggle('chargeStatus', '충전여부', '충전완료', '미충전', { perEquip: true }),
      f.parts('extraParts', '추가 제공 부품'),
      f.number('shippingPrice', '출고가 총액(VAT별도)', '원'),
      f.datalist('transferCenter', '이관센터'),
      f.date('deliveryDate', '이관센터 납품일자'),
      f.select('shipMethod', '출고방식', ['택배', '화물', '내방', '직배송']),
      f.datalist('packingManager', '포장담당자'),
      f.photostatus('photoStatus', '사진촬영', ['사진촬영', '캘린더', '납품확인서', '클라우드']),
      f.date('paymentDate', '결제(예정)일'),
      f.toggle('kakao', '카카오톡 친구추가', '완료', '미완료'),
      f.textarea('memo', '기타 특이사항'),
    ],
  },

  'part-ship': {
    fields: [
      f.parts('shipParts', '출고 부품', { withNote: true, perEquip: true }),
      f.datalist('transferCenter', '이관센터'),
      f.date('deliveryDate', '이관센터 납품일자'),
      f.datalist('shipMethod', '출고방식'),
      f.date('paymentDate', '결제(예정)일'),
      f.textarea('memo', '기타'),
    ],
  },

  'rental-ship': {
    tabs: [
      {
        key: 'pre', label: '개시전', fields: [
          f.text('basicType', '장비 기본타입', { perEquip: true }),
          f.text('batteryInfo', '배터리 정보', { perEquip: true }),
          f.text('chargerInfo', '충전기 정보', { perEquip: true }),
          f.text('unitSerial', '호차 시리얼', { perEquip: true }),
          f.number('startUsage', '사용 시간', 'h', { perEquip: true }),
          f.date('rentStart', '임대 시작일', { perEquip: true }),
          f.date('rentEnd', '임대 종료 예정일', { perEquip: true }),
          f.toggle('chargeStatus', '충전여부', '충전완료', '미충전', { perEquip: true }),
          f.parts('extraParts', '추가 제공 부품'),
          f.number('rentPrice', '임대료(VAT별도)', '원'),
          f.number('deliveryPrice', '운반비(VAT별도)', '원'),
          f.datalist('inspector', '검수담당자'),
          f.datalist('transferCenter', '이관센터'),
          f.select('shipMethod', '출고방식', ['택배', '화물', '내방', '직배송']),
          f.photostatus('photoStatus', '사진촬영', ['사진촬영', '캘린더', '납품확인서', '클라우드']),
          f.textarea('memo', '기타'),
        ],
      },
      {
        key: 'post', label: '렌탈 종료 후', carryFrom: { 'extraParts': 'returnParts' }, fields: [
          f.number('endUsage', '반납 시간', 'h', { perEquip: true }),
          f.date('returnDate', '실제 반납일', { perEquip: true }),
          f.toggle('cleanStatus', '세척여부', '세척완료', '미세척', { perEquip: true }),
          f.photostatus('photoStatus', '사진촬영', ['사진촬영', '캘린더', '클라우드']),
          f.parts('returnParts', '반납 동봉 부품'),
          f.textarea('memoPost', '특이사항'),
        ],
      },
    ],
  },

  'as-service': {
    tabs: [
      {
        key: 'receive', label: '접수시', fields: [
          f.chips('symptomChips', '증상', ['소음', '진동', '누수', '작동불량', '충전불량', '파손', '배터리', '기타'], { perEquip: true }),
          f.select('repairType', '수리구분', ['보증수리', '유상수리', '점검'], { perEquip: true }),
          f.textarea('symptomDetail', '증상 상세', { perEquip: true }),
          f.chips('causeChips', '원인', ['소모품', '사용자과실', '제품결함', '기타'], { perEquip: true }),
          f.parts('repairQuoteParts', '수리 견적 부품', { perEquip: true }),
          f.parts('repairParts', '실제 수리 부품', { perEquip: true }),
        ],
      },
      {
        key: 'post', label: '처리후', fields: [
          f.chips('actionChips', '조치', ['부품교체', '조정', '세척', '수리불가', '재방문필요'], { perEquip: true }),
          f.textarea('result', '처리 결과', { perEquip: true }),
          f.photostatus('photoStatus', '사진촬영', ['사진촬영', '캘린더', '클라우드']),
          f.select('warrantyType', '보증유형', ['보증수리', '유상', '점검']),
          f.textarea('refusalReason', '수리거절 사유'),
          f.parts('nextVisitParts', '차기방문 지참 부품', { noPrice: true }),
        ],
      },
    ],
  },

  'purchase-check': {
    fields: [
      f.text('purchaseTarget', '매입 대상 장비'),
      f.text('equipmentCondition', '장비 상태'),
      f.number('quotedPrice', '견적 가격', '원'),
      f.select('purchaseResult', '매입 결과', ['매입 확정', '보류', '매입 불가']),
      f.textarea('memo', '기타'),
    ],
  },

  'maintenance': {
    tabs: [
      {
        key: 'pre', label: '점검전', fields: [
          f.chips('checkItems', '점검 항목', ['브러시', '패드', '스퀴지', '충전기', '배터리', '본체'], { perEquip: true }),
          f.textarea('preMemo', '점검 전 특이사항', { perEquip: true }),
          f.parts('nextVisitParts', '차기방문 지참 부품', { noPrice: true }),
        ],
      },
      {
        key: 'post', label: '점검후', fields: [
          f.chips('actionItems', '조치 내용', ['부품교체', '세척', '조정', '교육', '재방문필요'], { perEquip: true }),
          f.parts('usedParts', '사용 부품', { perEquip: true }),
          f.photostatus('photoStatus', '사진촬영', ['사진촬영', '캘린더', '클라우드']),
          f.textarea('postMemo', '점검 후 특이사항', { perEquip: true }),
          f.parts('nextVisitParts', '차기방문 지참 부품', { noPrice: true }),
        ],
      },
    ],
  },
};

// ─── 유틸 ────────────────────────────────────────────────────────────────────

/**모든 탭의 fields를 flat하게 반환 (perEquip 포함) */
export function getAllFields(schema: CategorySchema): FieldDef[] {
  if (schema.tabs) {
    return schema.tabs.flatMap(t => t.fields);
  }
  return schema.fields ?? [];
}
