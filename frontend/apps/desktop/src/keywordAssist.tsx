import React from 'react';
import type { CustomerInfo } from './store';

export type EntityType = 'symptom' | 'customer' | 'site';

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
  icon: string;
  colorScheme: {
    bg: string;
    border: string;
    text: string;
    glow: string;
  };
  customerId?: string;
  keywordId?: string;
}

// 1. Symptom & Part Keyword Master
export const DOMAIN_KEYWORD_REGISTRY: KeywordEntity[] = [
  {
    id: 'kw-suction',
    keyword: '흡입모터 과열 / 굉음',
    synonyms: /흡입\s*모터|진공압|굉음|타는\s*냄새|모터\s*소리|흡입력/i,
    category: 'POWER / 흡입·구동계통',
    partCode: 'SUCTION-500W',
    partName: '흡입모터 24V 500W 어셈블리',
    stock: 14,
    confidence: 98,
    checklist: [
      '전원 스위치 즉시 차단 및 모터 하우징 열기 냉각 안내',
      '폐수탱크 플로트 밸브(만수 차단기) 오작동/이물질 확인',
      '흡입 호스 및 스퀴지 연결부 막힘 육안 점검',
      '10분 후 재가동 시 동일 소음/타는 냄새 지속 여부 확인',
      '증상 지속 시 1차 셀프조치 중단 및 현장 긴급 정밀점검 배차'
    ],
    selfActionGuide: '고객에게 전원을 끄고 모터 열기를 10분간 식힌 뒤, 폐수탱크 거름망 이물질을 털어내도록 안내하세요.'
  },
  {
    id: 'kw-squeegee',
    keyword: '스퀴지 마모 / 바닥 잔수',
    synonyms: /스퀴지|바닥\s*물기|잔수|고무\s*블레이드|물\s*자국/i,
    category: 'WEARABLE / 스퀴지·소모품',
    partCode: 'SQUEEGEE-RUBBER',
    partName: '내유성 우레탄 스퀴지 블레이드 세트',
    stock: 35,
    confidence: 96,
    checklist: [
      '스퀴지 고무날 마모 상태 및 찢어짐 육안 확인',
      '스퀴지 블레이드 4면 뒤집기(재사용) 가능 여부 안내',
      '스퀴지 브라켓 수평 조절 노브 장력 점검',
      '폐수 흡입 호스 꺾임 및 연결 조인트 기밀 확인'
    ],
    selfActionGuide: '스퀴지 고무 블레이드는 4면을 돌려가며 쓸 수 있습니다. 날을 반대로 뒤집어 끼우도록 유도하세요.'
  },
  {
    id: 'kw-battery',
    keyword: '배터리 충전 불량 / 방전',
    synonyms: /배터리|충전|전원\s*불량|안\s*켜|방전|충전기/i,
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
      '완전 방전 의심 시 현장 급속 충전기 및 배터리 출장 점검'
    ],
    selfActionGuide: '비상정지 빨간 버튼이 눌려있지 않은지 먼저 당겨보게 하고, 220V 충전기 전원 LED를 확인하세요.'
  },
  {
    id: 'kw-solenoid',
    keyword: '솔레노이드 밸브 / 바닥 누수',
    synonyms: /솔레노이드|물\s*안\s*나옴|누수|급수\s*밸브|세제\s*분사/i,
    category: 'WATER / 급수·솔레노이드',
    partCode: 'SOLENOID-VALVE-24V',
    partName: '전자식 급수 솔레노이드 밸브 24V',
    stock: 22,
    confidence: 94,
    checklist: [
      '세수탱크(청수통) 필터망 이물질 막힘 청소 안내',
      '솔레노이드 밸브 전원 커넥터 접촉 불량 점검',
      '급수 레버 작동 시 "딸깍" 작동음 발생 여부 확인',
      '밸브 고착으로 지속 누수 시 밸브 신품 교체 출장 배차'
    ],
    selfActionGuide: '청수통 하단 거름망 필터에 세제 찌꺼기가 굳어 막혔는지 먼저 세척하도록 안내하세요.'
  }
];

// 2. Comprehensive Multi-Category Named Entity Registry
export const NAMED_ENTITY_REGISTRY: EntityRule[] = [
  // A. CUSTOMER & PERSON (고객사명 / 담당자명 - Purple / Violet)
  {
    id: 'ent-cust-gangnam',
    type: 'customer',
    label: '고객사',
    pattern: /스페이스\s*클린|스페이스|최관리\s*(팀장)?/i,
    icon: '🏢',
    customerId: 'a1111111-1111-1111-1111-111111111111',
    colorScheme: {
      bg: 'rgba(168, 85, 247, 0.18)',
      border: '#a855f7',
      text: '#e9d5ff',
      glow: '0 0 8px rgba(168, 85, 247, 0.5)'
    }
  },
  {
    id: 'ent-cust-pyeongtaek',
    type: 'customer',
    label: '고객사',
    pattern: /미래\s*물류(\s*센터)?|정센터장|미래물류/i,
    icon: '🏢',
    customerId: 'a2222222-2222-2222-2222-222222222222',
    colorScheme: {
      bg: 'rgba(168, 85, 247, 0.18)',
      border: '#a855f7',
      text: '#e9d5ff',
      glow: '0 0 8px rgba(168, 85, 247, 0.5)'
    }
  },
  {
    id: 'ent-cust-hwaseong',
    type: 'customer',
    label: '고객사',
    pattern: /케이\s*로지스|오센터장|케이로지스/i,
    icon: '🏢',
    customerId: 'a1010101-1010-1010-1010-101010101010',
    colorScheme: {
      bg: 'rgba(168, 85, 247, 0.18)',
      border: '#a855f7',
      text: '#e9d5ff',
      glow: '0 0 8px rgba(168, 85, 247, 0.5)'
    }
  },

  // B. SITE & LOCATION (현장명 / 지점명 / 건물구역 - Amber / Orange)
  {
    id: 'ent-site-gangnam',
    type: 'site',
    label: '현장/위치',
    pattern: /강남점|강남|방재실|테헤란로|지하\s*1층/i,
    icon: '📍',
    customerId: 'a1111111-1111-1111-1111-111111111111',
    colorScheme: {
      bg: 'rgba(245, 158, 11, 0.18)',
      border: '#f59e0b',
      text: '#fde68a',
      glow: '0 0 8px rgba(245, 158, 11, 0.5)'
    }
  },
  {
    id: 'ent-site-pyeongtaek',
    type: 'site',
    label: '현장/위치',
    pattern: /평택점|평택|물류\s*데크|산단로|1층/i,
    icon: '📍',
    customerId: 'a2222222-2222-2222-2222-222222222222',
    colorScheme: {
      bg: 'rgba(245, 158, 11, 0.18)',
      border: '#f59e0b',
      text: '#fde68a',
      glow: '0 0 8px rgba(245, 158, 11, 0.5)'
    }
  },
  {
    id: 'ent-site-hwaseong',
    type: 'site',
    label: '현장/위치',
    pattern: /화성\s*센터|화성|하역장|남양읍|남양로|A동/i,
    icon: '📍',
    customerId: 'a1010101-1010-1010-1010-101010101010',
    colorScheme: {
      bg: 'rgba(245, 158, 11, 0.18)',
      border: '#f59e0b',
      text: '#fde68a',
      glow: '0 0 8px rgba(245, 158, 11, 0.5)'
    }
  },

  // C. SYMPTOM & PART (증상 / 부품 - Cyan / Blue)
  {
    id: 'ent-sym-suction',
    type: 'symptom',
    label: '증상/부품',
    pattern: /흡입\s*모터|진공압|굉음|타는\s*냄새|모터\s*소리|흡입력/i,
    icon: '🔍',
    keywordId: 'kw-suction',
    colorScheme: {
      bg: 'rgba(37, 99, 235, 0.18)',
      border: '#60a5fa',
      text: '#93c5fd',
      glow: '0 0 8px rgba(37, 99, 235, 0.5)'
    }
  },
  {
    id: 'ent-sym-squeegee',
    type: 'symptom',
    label: '증상/부품',
    pattern: /스퀴지|바닥\s*물기|잔수|고무\s*블레이드|물\s*자국/i,
    icon: '🔍',
    keywordId: 'kw-squeegee',
    colorScheme: {
      bg: 'rgba(37, 99, 235, 0.18)',
      border: '#60a5fa',
      text: '#93c5fd',
      glow: '0 0 8px rgba(37, 99, 235, 0.5)'
    }
  },
  {
    id: 'ent-sym-battery',
    type: 'symptom',
    label: '증상/부품',
    pattern: /배터리|충전|전원\s*불량|안\s*켜|방전|충전기/i,
    icon: '🔍',
    keywordId: 'kw-battery',
    colorScheme: {
      bg: 'rgba(37, 99, 235, 0.18)',
      border: '#60a5fa',
      text: '#93c5fd',
      glow: '0 0 8px rgba(37, 99, 235, 0.5)'
    }
  },
  {
    id: 'ent-sym-solenoid',
    type: 'symptom',
    label: '증상/부품',
    pattern: /솔레노이드|물\s*안\s*나옴|누수|급수\s*밸브|세제\s*분사/i,
    icon: '🔍',
    keywordId: 'kw-solenoid',
    colorScheme: {
      bg: 'rgba(37, 99, 235, 0.18)',
      border: '#60a5fa',
      text: '#93c5fd',
      glow: '0 0 8px rgba(37, 99, 235, 0.5)'
    }
  }
];

export interface EntityClickHandlers {
  onSymptomClick: (entity: KeywordEntity) => void;
  onCustomerClick?: (customer: CustomerInfo) => void;
  onSiteClick?: (customer: CustomerInfo) => void;
}

export function renderMultiColorHighlightedText(
  text: string,
  handlers: EntityClickHandlers,
  activeKeywordId?: string,
  activeCustomerId?: string,
  customerList?: CustomerInfo[]
): React.ReactNode[] {
  if (!text) return [];

  // Master Unified Regex capturing Customers, Sites, and Symptoms
  const masterRegex = /(스페이스\s*클린|스페이스|최관리\s*(팀장)?|미래\s*물류(\s*센터)?|정센터장|미래물류|케이\s*로지스|오센터장|강남점|방재실|테헤란로|지하\s*1층|평택점|물류\s*데크|산단로|화성\s*센터|하역장|남양읍|남양로|흡입\s*모터|진공압|굉음|타는\s*냄새|모터\s*소리|스퀴지|바닥\s*물기|잔수|고무\s*블레이드|배터리|충전|방전|솔레노이드|누수|급수\s*밸브)/gi;

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
        }
      };

      const titleText = matchedRule.type === 'customer' 
        ? `[고객사: ${part}] 클릭 시 고객 카드 자동 식별` 
        : matchedRule.type === 'site' 
        ? `[현장/위치: ${part}] 클릭 시 해당 지점 고객 카드 연동` 
        : `[증상: ${part}] 클릭 시 어시스트 조치 가이드 연동`;

      return (
        <span
          key={idx}
          onClick={handleClick}
          title={titleText}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '2px',
            backgroundColor: isSelected ? matchedRule.colorScheme.bg.replace('0.18', '0.38') : matchedRule.colorScheme.bg,
            borderBottom: `2px solid ${matchedRule.colorScheme.border}`,
            color: matchedRule.colorScheme.text,
            fontWeight: 700,
            padding: '1px 5px',
            margin: '0 2px',
            borderRadius: '4px',
            cursor: 'pointer',
            boxShadow: isSelected ? matchedRule.colorScheme.glow : 'none',
            transition: 'all 0.15s ease'
          }}
        >
          <span>{matchedRule.icon}</span>
          <span>{part}</span>
        </span>
      );
    }

    return <span key={idx}>{part}</span>;
  });
}
