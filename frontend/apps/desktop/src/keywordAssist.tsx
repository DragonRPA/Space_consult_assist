import React from 'react';
import type { CustomerInfo } from './store';

export type EntityType = 'symptom' | 'customer' | 'site' | 'model' | 'action';

export interface KeywordEntity {
  id: string;
  keyword: string;
  synonyms: RegExp;
  category: string;
  partCode: string;
  partName: string;
  stock: number;
  confidence: number;
  checklist: string[];
  selfActionGuide: string;
}

export interface EntityRule {
  id: string;
  type: EntityType;
  label: string;
  pattern: RegExp;
  colorScheme: {
    bg: string;
    border: string;
    text: string;
    glow: string;
  };
  customerId?: string;
  keywordId?: string;
  modelId?: string;
  actionIndex?: number; // Map to SOP checklist step
}

// 1. Symptom & Part Keyword Master
export const DOMAIN_KEYWORD_REGISTRY: KeywordEntity[] = [
  {
    id: 'kw-squeegee',
    keyword: '스퀴지 마모 / 바닥 잔수',
    synonyms: /스퀴지|와이퍼|바닥\s*물기|잔수|고무\s*블레이드|물\s*자국|고무\s*패드|고무패드|패드\s*거치대|고정판|판\s*거치대|빨아들이지\s*못|물\s*(?:자국|방울|이)?\s*남아|물\s*흡입\s*안|잔수\s*발생|중간\s*부분|양쪽\s*끝.*달라붙/i,
    category: 'WEARABLE / 스퀴지·소모품',
    partCode: 'SQUEEGEE-RUBBER',
    partName: '내유성 우레탄 스퀴지 블레이드 세트',
    stock: 35,
    confidence: 96,
    checklist: [
      '스퀴지 고무날 마모 상태 및 찢어짐 육안 확인',
      '스퀴지 블레이드 4면 뒤집기(재사용) 가능 여부 안내',
      '스퀴지 브라켓 수평 조절 노브 및 회전 바퀴 볼트 장력 점검',
      '폐수 흡입 호스 꺾임 및 연결 조인트 기밀 확인'
    ],
    selfActionGuide: '스퀴지 고무 블레이드는 4면을 돌려가며 쓸 수 있습니다. 날을 반대로 뒤집어 끼우거나 브라켓 수평 조절 노브를 조정하도록 유도하세요.'
  },
  {
    id: 'kw-solenoid',
    keyword: '솔레노이드 밸브 / 급수 불량·누수',
    synonyms: /솔레노이드|솔래노이드|물이?\s*아예\s*안\s*나와|물이?\s*안\s*나와|물\s*안\s*나옴|브러시\s*물|누수|급수\s*밸브|밸브\s*문제|세제\s*분사|필터\s*열어서|필터가?\s*막혀/i,
    category: 'WATER / 급수·솔레노이드',
    partCode: 'SOLENOID-VALVE-24V',
    partName: '전자식 급수 솔레노이드 밸브 24V',
    stock: 22,
    confidence: 97,
    checklist: [
      '세수탱크(청수통) 하단 거름망 필터 열어서 물 토출 여부 확인',
      '필터 이후 브러시 측 미출수 시 솔레노이드 밸브 코일/전원 점검',
      '급수 레버/스위치 작동 시 밸브 개폐 작동음 확인',
      '솔레노이드 밸브 고착 판정 시 현장 방문 교체 배차 접수'
    ],
    selfActionGuide: '하단 청수 필터를 열었을 때 물이 나오는데 브러시 쪽으로만 안 나온다면 솔레노이드 밸브 또는 전력 공급 문제입니다. 현장 방문 점검을 안내하세요.'
  },
  {
    id: 'kw-suction',
    keyword: '흡입모터 과열 / 흡입력 저하·소음',
    synonyms: /흡입\s*모터|흡입력|흡입\s*부분|흡입이?\s*(?:약|안|떨어)|진공압\s*저하|모터\s*굉음|모터\s*과열|모터에서\s*소리|타는\s*냄새|모터\s*소음/i,
    category: 'POWER / 흡입·구동계통',
    partCode: 'SUCTION-500W',
    partName: '흡입모터 24V 500W 어셈블리',
    stock: 14,
    confidence: 98,
    checklist: [
      '전원 스위치 즉시 차단 및 모터 하우징 열기 냉각 안내',
      '폐수탱크 플로트 밸브(만수 차단기) 오작동/이물질 확인',
      '흡입 호스 및 스퀴지 연결부 막힘·커넥터 기밀 육안 점검',
      '10분 후 재가동 시 동일 소음/흡입력 저하 지속 여부 확인',
      '증상 지속 시 1차 셀프조치 중단 및 현장 정밀점검 배차'
    ],
    selfActionGuide: '전원을 끄고 폐수탱크 거름망 이물질 및 흡입 호스/와이퍼 고무 밀착 상태를 먼저 점검하도록 안내하세요.'
  },
  {
    id: 'kw-battery',
    keyword: '배터리 충전 불량 / 전원·방전',
    synonyms: /배터리|밧데리|충전|전원\s*불량|안\s*켜|방전|충전기|220\s*볼트|220V|콘센트/i,
    category: 'ELECTRICAL / 배터리·전원계통',
    partCode: 'BATTERY-24V-105AH',
    partName: '딥사이클 산업용 배터리 24V 105AH',
    stock: 8,
    confidence: 95,
    checklist: [
      '충전기 플러그 220V 콘센트 정상 통전 여부 확인',
      '장비 후면 메인 비상정지(Emergency) 버튼 해제 확인',
      '배터리 단자 체결 상태 및 부식/단선 육안 점검',
      '충전기 표시등 에러 코드(적색 점멸) 패턴 확인',
      '배터리 노후/방전 판정 시 사진 확인 후 신품 발송 또는 출장 교체'
    ],
    selfActionGuide: '비상정지 빨간 버튼이 눌려있지 않은지 먼저 당겨보게 하고, 220V 충전기 전원 LED 상태를 확인하세요.'
  },
  {
    id: 'kw-brush-deck',
    keyword: '브러시·패드판 체결 / 노브·볼트 이상',
    synonyms: /브러시|브러쉬|패드판|페드판|데크|노브|볼트\s*(?:조정|풀림|부재)|녹이?\s*슬|녹\s*발생|장착/i,
    category: 'DECK / 브러시·데크계통',
    partCode: 'PAD-DRIVER-19',
    partName: '패드 드라이버 및 데크 고정 노브 어셈블리',
    stock: 19,
    confidence: 94,
    checklist: [
      '데크 상단 고정 노브 2개 체결 상태 및 유격 확인',
      '브러시/패드판 중심 홀 정렬 후 회전 체결 안내',
      '부식 또는 볼트 망실 시 사진/영상 통화로 규격 확인 후 부품 발송'
    ],
    selfActionGuide: '데크 위 홀에 노브 2개를 맞추어 끼우고 볼트 방향을 안쪽으로 조정하여 수평을 맞추도록 안내하세요.'
  }
];

// 2. Comprehensive 5-Category Named Entity Registry (Zero Emoji, High-Contrast Solid UI)
export const NAMED_ENTITY_REGISTRY: EntityRule[] = [
  // A. CUSTOMER & PERSON (고객사명 / 담당자명 - Primary Blue)
  {
    id: 'ent-cust-banpo',
    type: 'customer',
    label: '고객사',
    pattern: /반포\s*자이|반포자이|박시설\s*(?:과장|시설과장)?|클린\s*에코|클린에코/i,
    customerId: 'a1111111-1111-1111-1111-111111111111',
    colorScheme: { bg: '#bfdbfe', border: '#3b82f6', text: '#1e3a8a', glow: 'none' }
  },
  {
    id: 'ent-cust-raemian',
    type: 'customer',
    label: '고객사',
    pattern: /래미안\s*퍼스티지|래미안|퍼스티지|이관리\s*(?:소장|관리소장)?|삼원\s*종합|삼원종합관리/i,
    customerId: 'a2222222-2222-2222-2222-222222222222',
    colorScheme: { bg: '#bfdbfe', border: '#3b82f6', text: '#1e3a8a', glow: 'none' }
  },
  {
    id: 'ent-cust-dogok',
    type: 'customer',
    label: '고객사',
    pattern: /도곡\s*렉슬|도곡렉슬|최기술\s*(?:팀장|기술팀장)?|한결\s*에프엠|한결에프엠/i,
    customerId: 'a1010101-1010-1010-1010-101010101010',
    colorScheme: { bg: '#bfdbfe', border: '#3b82f6', text: '#1e3a8a', glow: 'none' }
  },
  {
    id: 'ent-cust-gasan',
    type: 'customer',
    label: '고객사',
    pattern: /가산\s*디지털\s*엠타워|디지털\s*엠타워|엠타워|강센터\s*(?:실장|관리실장)?|피앤씨\s*클린|피앤씨클린/i,
    customerId: 'a3333333-3333-3333-3333-333333333333',
    colorScheme: { bg: '#bfdbfe', border: '#3b82f6', text: '#1e3a8a', glow: 'none' }
  },
  {
    id: 'ent-cust-general',
    type: 'customer',
    label: '고객사/담당자',
    pattern: /수림\s*종합\s*관리|머쉬앤\s*파머스|파머스|팜\s*스마트|비와이씨|BYC\s*빌딩|세원\s*종합\s*관리|베스트\s*환경\s*산업|반짝반짝\s*시스템|우주\s*엔비텍|티에스\s*식스티즈|롯데\s*캐슬(?:\s*프레미어)?|이편한|레코인|[가-힣]{2,8}(?:종합관리|환경산업|관리사무소|관리소|관리단|빌딩|아파트)|[가-힣]{2,4}\s*(?:과장님?|소장님?|팀장님?|대리님?|실장님?|대표님?|소장|과장|팀장|대리|대표|이사님?)|팀장님|과장님|소장님|대표님|대리님|실장님/i,
    colorScheme: { bg: '#bfdbfe', border: '#3b82f6', text: '#1e3a8a', glow: 'none' }
  },

  // B. SITE & LOCATION (현장명 / 지점명 / 건물구역 - Amber / Orange)
  {
    id: 'ent-site-banpo',
    type: 'site',
    label: '현장/위치',
    pattern: /신반포로|반포|방재실|지하\s*1층|관리사무소/i,
    customerId: 'a1111111-1111-1111-1111-111111111111',
    colorScheme: { bg: '#fde68a', border: '#f59e0b', text: '#78350f', glow: 'none' }
  },
  {
    id: 'ent-site-raemian',
    type: 'site',
    label: '현장/위치',
    pattern: /반포대로|주차장\s*관리소|지하\s*2층|관리지원센터/i,
    customerId: 'a2222222-2222-2222-2222-222222222222',
    colorScheme: { bg: '#fde68a', border: '#f59e0b', text: '#78350f', glow: 'none' }
  },
  {
    id: 'ent-site-dogok',
    type: 'site',
    label: '현장/위치',
    pattern: /선릉로|도곡|지하\s*방재실/i,
    customerId: 'a1010101-1010-1010-1010-101010101010',
    colorScheme: { bg: '#fde68a', border: '#f59e0b', text: '#78350f', glow: 'none' }
  },
  {
    id: 'ent-site-gasan',
    type: 'site',
    label: '현장/위치',
    pattern: /가산디지털1로|가산|지하\s*1층\s*하역장|관리단/i,
    customerId: 'a3333333-3333-3333-3333-333333333333',
    colorScheme: { bg: '#fde68a', border: '#f59e0b', text: '#78350f', glow: 'none' }
  },
  {
    id: 'ent-site-general',
    type: 'site',
    label: '현장/위치',
    pattern: /주차장|하역장|기계실|사무실|현장|실내|외부|청도|분당|대전|파주|탕정|천안|아산|수원|인천|부산|대구|광주|나라\s*장터/i,
    colorScheme: { bg: '#fde68a', border: '#f59e0b', text: '#78350f', glow: 'none' }
  },

  // C. MODEL & EQUIPMENT (장비 모델명 - Violet / Purple)
  {
    id: 'ent-model-j600t',
    type: 'model',
    label: '장비모델',
    pattern: /J600T|J600|제이\s*600|제이\s*육백|보행식\s*습식/i,
    modelId: 'J600T',
    colorScheme: { bg: '#e9d5ff', border: '#c084fc', text: '#581c87', glow: 'none' }
  },
  {
    id: 'ent-model-j800',
    type: 'model',
    label: '장비모델',
    pattern: /J800|제이\s*800|제이\s*팔백|대형\s*탑승형/i,
    modelId: 'J800',
    colorScheme: { bg: '#e9d5ff', border: '#c084fc', text: '#581c87', glow: 'none' }
  },
  {
    id: 'ent-model-s12',
    type: 'model',
    label: '장비모델',
    pattern: /S12L|S12|에스\s*12|엑스\s*12|f10이/i,
    modelId: 'S12',
    colorScheme: { bg: '#e9d5ff', border: '#c084fc', text: '#581c87', glow: 'none' }
  },
  {
    id: 'ent-model-s7',
    type: 'model',
    label: '장비모델',
    pattern: /S7P|S7|에스\s*세븐|에스\s*7|에스\s*칠/i,
    modelId: 'S7',
    colorScheme: { bg: '#e9d5ff', border: '#c084fc', text: '#581c87', glow: 'none' }
  },
  {
    id: 'ent-model-s5',
    type: 'model',
    label: '장비모델',
    pattern: /S5|에스\s*파이브|에스\s*5|소형\s*탑승형/i,
    modelId: 'S5',
    colorScheme: { bg: '#e9d5ff', border: '#c084fc', text: '#581c87', glow: 'none' }
  },
  {
    id: 'ent-model-other',
    type: 'model',
    label: '장비모델',
    pattern: /S3|S2|S1|R3|알\s*3|알\s*쓰리|징클린\s*19|징클린|청소\s*장비|습식\s*청소기/i,
    modelId: 'S2/R3',
    colorScheme: { bg: '#e9d5ff', border: '#c084fc', text: '#581c87', glow: 'none' }
  },

  // D. SYMPTOM & PART (증상 / 부품 - Red / 적색)
  {
    id: 'ent-sym-solenoid',
    type: 'symptom',
    label: '고장증상',
    pattern: /솔레노이드\s*밸브|솔레노이드|솔래노이드|물이?\s*아예\s*안\s*나와요?|물이?\s*안\s*나와요?|물이?\s*안\s*나와서|물\s*안\s*나옴|안\s*나오더라고요|브러시\s*물|누수|급수\s*밸브|필터가?\s*막혀/i,
    keywordId: 'kw-solenoid',
    colorScheme: { bg: '#fecaca', border: '#f87171', text: '#7f1d1d', glow: 'none' }
  },
  {
    id: 'ent-sym-suction',
    type: 'symptom',
    label: '고장증상',
    pattern: /흡입\s*모터|흡입\s*부분|흡입력|흡입이?\s*(?:안|약|떨어)|흡기|진공압|굉음|타는\s*냄새|모터\s*소리|빨아들이(?:고|면(?:은)?|지)?|빨아들/i,
    keywordId: 'kw-suction',
    colorScheme: { bg: '#fecaca', border: '#f87171', text: '#7f1d1d', glow: 'none' }
  },
  {
    id: 'ent-sym-squeegee',
    type: 'symptom',
    label: '고장증상',
    pattern: /스퀴지|와이퍼\s*고무|와이퍼|바닥\s*물기|잔수|고무\s*블레이드|물\s*자국|고무\s*패드|고무패드|패드\s*거치대|고정판|판\s*거치대|중간\s*부분|양쪽\s*끝/i,
    keywordId: 'kw-squeegee',
    colorScheme: { bg: '#fecaca', border: '#f87171', text: '#7f1d1d', glow: 'none' }
  },
  {
    id: 'ent-sym-battery',
    type: 'symptom',
    label: '고장증상',
    pattern: /배터리|밧데리|충전기?|전원\s*불량|안\s*켜|방전/i,
    keywordId: 'kw-battery',
    colorScheme: { bg: '#fecaca', border: '#f87171', text: '#7f1d1d', glow: 'none' }
  },
  {
    id: 'ent-sym-brush',
    type: 'symptom',
    label: '고장증상',
    pattern: /브러시|브러쉬|패드판|페드판|데크|노브|볼트|녹이?\s*슬|녹\s*발생|커넥터/i,
    keywordId: 'kw-brush-deck',
    colorScheme: { bg: '#fecaca', border: '#f87171', text: '#7f1d1d', glow: 'none' }
  },

  // E. ACTION & SOP CHECKLIST TRIGGER (조치 / 점검 행동 - Emerald / Green)
  {
    id: 'ent-act-power-off',
    type: 'action',
    label: '조치사항',
    pattern: /전원\s*(?:스위치)?\s*차단|전원\s*(?:스위치)?\s*끄|모터\s*냉각|열기\s*식히|10분\s*식히/i,
    actionIndex: 1,
    colorScheme: { bg: '#a7f3d0', border: '#34d399', text: '#064e3b', glow: 'none' }
  },
  {
    id: 'ent-act-filter-clean',
    type: 'action',
    label: '조치사항',
    pattern: /필터\s*열어서|거름망\s*청소|필터\s*(?:망)?\s*(?:세척|확인|체크)|이물질\s*(?:제거|청소|털어)|탱크\s*비우|오수\s*비우|물\s*채워/i,
    actionIndex: 1,
    colorScheme: { bg: '#a7f3d0', border: '#34d399', text: '#064e3b', glow: 'none' }
  },
  {
    id: 'ent-act-blade-flip',
    type: 'action',
    label: '조치사항',
    pattern: /날\s*뒤집|4면\s*뒤집|반대로\s*끼우|날\s*교체|수평\s*조절|노브\s*조절|볼트\s*조정|장착/i,
    actionIndex: 2,
    colorScheme: { bg: '#a7f3d0', border: '#34d399', text: '#064e3b', glow: 'none' }
  },
  {
    id: 'ent-act-emergency-switch',
    type: 'action',
    label: '조치사항',
    pattern: /비상\s*정지\s*(?:버튼)?\s*(?:해제|당기)|빨간\s*버튼\s*당기|220V\s*콘센트|충전기\s*확인|단자\s*체결|실내\s*보관|사진\s*(?:확인|요청)|영상\s*통화|부품\s*발송|매뉴얼/i,
    actionIndex: 2,
    colorScheme: { bg: '#a7f3d0', border: '#34d399', text: '#064e3b', glow: 'none' }
  },
  {
    id: 'ent-act-dispatch',
    type: 'action',
    label: '조치사항',
    pattern: /출장\s*배차|방문\s*(?:좀\s*)?드릴려고|방문\s*점검|오후에\s*괜찮|점심\s*이후에\s*출발|기사\s*(?:님)?\s*방문|현장\s*점검|정비\s*배차|부품\s*교체\s*출장/i,
    actionIndex: 4,
    colorScheme: { bg: '#a7f3d0', border: '#34d399', text: '#064e3b', glow: 'none' }
  }
];

export interface EntityClickHandlers {
  onSymptomClick: (entity: KeywordEntity) => void;
  onCustomerClick?: (customer: CustomerInfo) => void;
  onSiteClick?: (customer: CustomerInfo) => void;
  onModelClick?: (modelId: string) => void;
  onActionClick?: (actionRule: EntityRule) => void;
}

// Master Unified Regex capturing Customers, Sites, Models, Symptoms, and Action SOP steps dynamically
const masterRegex = new RegExp('(' + NAMED_ENTITY_REGISTRY.map(r => r.pattern.source).join('|') + ')', 'gi');

export function renderMultiColorHighlightedText(
  text: string,
  handlers: EntityClickHandlers,
  activeKeywordId?: string,
  activeCustomerId?: string,
  customerList?: CustomerInfo[]
): React.ReactNode[] {
  if (!text) return [];

  const parts = text.split(masterRegex);

  return parts.map((part, idx) => {
    if (!part) return null;

    const matchedRule = NAMED_ENTITY_REGISTRY.find(r => r.pattern.test(part));

    if (matchedRule) {
      let isSelected = false;
      if (matchedRule.type === 'symptom' && matchedRule.keywordId === activeKeywordId) {
        isSelected = true;
      } else if ((matchedRule.type === 'customer' || matchedRule.type === 'site') && matchedRule.customerId === activeCustomerId) {
        isSelected = true;
      }

      const handleClick = () => {
        if (matchedRule.type === 'symptom' && matchedRule.keywordId) {
          const kw = DOMAIN_KEYWORD_REGISTRY.find(k => k.id === matchedRule.keywordId);
          if (kw) handlers.onSymptomClick(kw);
        } else if ((matchedRule.type === 'customer' || matchedRule.type === 'site') && matchedRule.customerId && customerList) {
          const cust = customerList.find(c => c.id === matchedRule.customerId);
          if (cust && handlers.onCustomerClick) {
            handlers.onCustomerClick(cust);
          }
        } else if (matchedRule.type === 'model' && matchedRule.modelId && handlers.onModelClick) {
          handlers.onModelClick(matchedRule.modelId);
        } else if (matchedRule.type === 'action' && handlers.onActionClick) {
          handlers.onActionClick(matchedRule);
        }
      };

      const titleText = matchedRule.type === 'customer' 
        ? `[고객사: ${part}]` 
        : matchedRule.type === 'site' 
        ? `[현장/위치: ${part}]` 
        : matchedRule.type === 'model'
        ? `[장비모델: ${part}]`
        : matchedRule.type === 'action'
        ? `[조치사항: ${part}]` 
        : `[증상: ${part}]`;

      return (
        <span
          key={idx}
          onClick={handleClick}
          tabIndex={0}
          role="button"
          aria-label={titleText}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); } }}
          title={titleText}
          style={{
            display: 'inline',
            backgroundColor: matchedRule.colorScheme.bg,
            border: `1px solid ${matchedRule.colorScheme.border}`,
            color: matchedRule.colorScheme.text,
            fontWeight: 700,
            padding: '1px 5px',
            margin: '0 2px',
            borderRadius: '3px',
            cursor: 'pointer',
            boxShadow: isSelected ? `0 0 0 2px ${matchedRule.colorScheme.border}` : 'none',
            transition: 'all 0.15s ease'
          }}
        >
          {part}

        </span>
      );
    }

    return <span key={idx}>{part}</span>;
  });
}
