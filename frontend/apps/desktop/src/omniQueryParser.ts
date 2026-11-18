import { applyContextualCorrection } from './contextCorrector';
import { extractCustomerAndAddressEntities } from './keywordExtractors';
import { getModelErrorCodes } from './modelErrorCodesData';
import {
  DEFAULT_B2B_CUSTOMERS,
  matchesChosungOrText,
  calculateSymptomMatchScore,
  type Customer,
  type OfficialErrorCode,
  type SymptomPreset,
} from './counselShared';

export const EQUIPMENT_MODELS = ['J600T', 'J800', 'S7', 'S5', 'S1', 'S3', 'W12', 'W15', 'S2', 'S12', '쓰담'];

export interface OmniParsedResult {
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

const OMNI_GENERIC_STOP_RE =
  /^(?:과장|시설과장|소장|관리소장|현장소장|팀장|미화팀장|기술팀장|대리|실장|관리실장|반장|미화반장|센터장|운영총괄|미화원|조장|대표|이사|담당자|아파트|관리사무소|관리지원센터|관리단|청소용역|미화팀|본사|직영|서울|서울시|경기|경기도|인천|인천시|경남|경북|충남|충북|부산|대구|대전|광주|울산|지하|지상|1층|2층|3층|B1층|B2층|A동|B동|101동|102동|1공장|2공장|본관|방재실|기전실|주차장|하역장|기계실|미화대기실|생산라인|여기는|저희는|현장명은|주소는|전화번호는|연락처는|\d{1,3})$/i;

export function parseOmniQuery(
  omniQuery: string,
  symptomPresets: SymptomPreset[],
  effectiveModel: string
): OmniParsedResult {
  const raw = omniQuery.trim();
  if (!raw) {
    return {
      matchedCustomers: [],
      matchedModels: [],
      matchedErrorCodes: [],
      matchedSymptoms: [],
      compositePreview: null,
    };
  }

  const correctedRaw = applyContextualCorrection(raw).correctedText || raw;
  const tokens = Array.from(new Set([...correctedRaw.split(/\s+/), ...raw.split(/\s+/)])).filter(Boolean);
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

    const strippedToken = token.replace(/(?:인데요|입니다|인데|이고요|이고|예요|이에요)$/g, '');
    if (!OMNI_GENERIC_STOP_RE.test(strippedToken)) {
      for (const c of DEFAULT_B2B_CUSTOMERS) {
        const phoneDigits = (c.phone || '').replace(/\D/g, '');
        const workerDigits = (c.siteWorkerPhone || '').replace(/\D/g, '');
        const isPhoneMatch =
          tokenDigits.length >= 4 &&
          (phoneDigits.includes(tokenDigits) || workerDigits.includes(tokenDigits));
        const isNameOrAddrMatch =
          token.length >= 2 &&
          (matchesChosungOrText(c.name, token) ||
            matchesChosungOrText(c.manager, token) ||
            (c.useCompany && matchesChosungOrText(c.useCompany, token)) ||
            (c.siteWorkerName && matchesChosungOrText(c.siteWorkerName, token)) ||
            (c.address && token.length >= 3 && matchesChosungOrText(c.address, token)) ||
            (c.addressDetail && token.length >= 3 && matchesChosungOrText(c.addressDetail, token)));

        if (isPhoneMatch || isNameOrAddrMatch) {
          matchedCustomersMap.set(c.id, c);
          if (!bestCustomer) bestCustomer = c;
        }
      }
    }

    for (const ec of currentCodes) {
      if (
        ec.code.toLowerCase() === tokenClean ||
        (tokenClean.length >= 2 && ec.code.toLowerCase().includes(tokenClean)) ||
        matchesChosungOrText(ec.name, token)
      ) {
        if (!matchedErrorCodesList.some((x) => x.codeObj.code === ec.code)) {
          matchedErrorCodesList.push({ codeObj: ec, model: effectiveModel });
        }
        if (!bestErrorCode) bestErrorCode = ec;
      }
    }

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

  const extractedEntities = extractCustomerAndAddressEntities(correctedRaw);
  const isExplicitNewCustomer =
    Boolean(extractedEntities.customerName) &&
    (!bestCustomer || !matchesChosungOrText(bestCustomer.name, extractedEntities.customerName!));

  if (
    (!bestCustomer || isExplicitNewCustomer) &&
    (extractedEntities.customerName ||
      extractedEntities.managerName ||
      extractedEntities.phone ||
      extractedEntities.roadOrLotAddress ||
      extractedEntities.addressDetail)
  ) {
    const dynamicCust: Customer = {
      id: 'cust-extracted-omni',
      name: extractedEntities.customerName || '신규 현장 고객 (자동 추출)',
      manager: extractedEntities.managerName || '현장 담당자',
      phone: extractedEntities.phone || '',
      address: extractedEntities.roadOrLotAddress || '',
      addressDetail: extractedEntities.addressDetail || '',
      useCompany: extractedEntities.useCompany || '',
      assetModel: bestModel || effectiveModel,
      serialNumber: `${bestModel || effectiveModel}-AUTO`,
      salesType: '렌탈(임대)',
      historyTimeline: [],
    };
    matchedCustomersMap.set(dynamicCust.id, dynamicCust);
    bestCustomer = dynamicCust;
  } else if (bestCustomer) {
    const extMgrCore = extractedEntities.managerName?.split(' ')[0] || '';
    bestCustomer = {
      ...bestCustomer,
      phone: extractedEntities.phone || bestCustomer.phone,
      manager:
        extractedEntities.managerName && (!bestCustomer.manager || !bestCustomer.manager.includes(extMgrCore))
          ? extractedEntities.managerName
          : bestCustomer.manager,
      address:
        extractedEntities.roadOrLotAddress &&
        (!bestCustomer.address || !bestCustomer.address.includes(extractedEntities.roadOrLotAddress))
          ? extractedEntities.roadOrLotAddress
          : bestCustomer.address,
      addressDetail:
        extractedEntities.addressDetail &&
        (!bestCustomer.addressDetail || !bestCustomer.addressDetail.includes(extractedEntities.addressDetail))
          ? extractedEntities.addressDetail
          : bestCustomer.addressDetail,
    };
    matchedCustomersMap.set(bestCustomer.id, bestCustomer);
  }

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

  if (bestErrorCode && !bestSymptom) {
    const errPreset = symptomPresets.find(
      (s) => s.id === 'EXT_ERROR_CODE' || s.category === '에러코드' || s.title.includes('에러')
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
            tokenCount: tokens.length,
          }
        : null,
  };
}

export interface OmniExecutionMatch {
  foundCust: Customer | undefined;
  foundModel: string | undefined;
  foundError: OfficialErrorCode | undefined;
  foundSymptom: SymptomPreset | undefined;
}

export function matchOmniExecutionEntities(
  q: string,
  symptomPresets: SymptomPreset[],
  effectiveModel: string
): OmniExecutionMatch {
  const correctedQ = applyContextualCorrection(q).correctedText || q;
  const tokens = Array.from(new Set([...correctedQ.split(/\s+/), ...q.split(/\s+/)])).filter(Boolean);
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
        (c.siteWorkerName && matchesChosungOrText(c.siteWorkerName, token)) ||
        (c.address && matchesChosungOrText(c.address, token)) ||
        (c.addressDetail && matchesChosungOrText(c.addressDetail, token))
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

  const extractedFromQ = extractCustomerAndAddressEntities(correctedQ);
  if (
    !foundCust &&
    (extractedFromQ.customerName ||
      extractedFromQ.managerName ||
      extractedFromQ.phone ||
      extractedFromQ.roadOrLotAddress ||
      extractedFromQ.addressDetail)
  ) {
    foundCust = {
      id: 'cust-extracted-omni',
      name: extractedFromQ.customerName || '신규 현장 고객 (자동 추출)',
      manager: extractedFromQ.managerName || '현장 담당자',
      phone: extractedFromQ.phone || '',
      address: extractedFromQ.roadOrLotAddress || '',
      addressDetail: extractedFromQ.addressDetail || '',
      useCompany: extractedFromQ.useCompany || '',
      assetModel: foundModel || effectiveModel,
      serialNumber: `${foundModel || effectiveModel}-AUTO`,
      salesType: '렌탈(임대)',
      historyTimeline: [],
    };
  }

  if (foundError && !foundSymptom) {
    foundSymptom = symptomPresets.find(
      (s) => s.id === 'EXT_ERROR_CODE' || s.category === '에러코드' || s.title.includes('에러')
    );
  }

  return { foundCust, foundModel, foundError, foundSymptom };
}
