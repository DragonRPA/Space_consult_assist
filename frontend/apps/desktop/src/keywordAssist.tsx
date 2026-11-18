import React from 'react';
import {
  DOMAIN_KEYWORD_REGISTRY,
  NAMED_ENTITY_REGISTRY,
  type CustomerInfo,
  type KeywordEntity,
  type EntityRule,
} from './keywordRegistryData';
import {
  extractNegativeStateExpressions,
  findCompoundSymptomEntity,
  findMatchingSymptomEntities,
} from './keywordExtractors';

export interface EntityClickHandlers {
  onSymptomClick: (entity: KeywordEntity) => void;
  onCustomerClick?: (customer: CustomerInfo) => void;
  onSiteClick?: (customer: CustomerInfo) => void;
  onModelClick?: (modelId: string) => void;
  onActionClick?: (actionRule: EntityRule) => void;
}

/**
 * 복합어 최우선 · 최장 일치(Longest-Match & Compound-Term-First) 스팬 스캐너
 * - "배터리 케이블"처럼 두 단어가 결합되어 하나의 뜻을 갖는 표현이 등장할 때,
 *   단일 단어("배터리")가 앞부분만 먼저 잘라먹지 못하도록 문장 내 모든 후보 매칭 중
 *   [복합어(2어절 이상) & 글자 길이가 더 긴 매칭]을 최우선 확정합니다.
 * - 또한 DOMAIN_KEYWORD_REGISTRY의 모든 synonyms를 SSOT로 함께 스캔하여,
 *   증상 감지(evaluateUtteranceRules)에 포착된 모든 구어체/오발음(예: '스퀴즈')이
 *   예외 없이 자막 하이라이트 박스에도 100% 동일하게 유지되도록 보장합니다.
 */
export function renderMultiColorHighlightedText(
  text: string,
  handlers: EntityClickHandlers,
  activeKeywordId?: string,
  activeCustomerId?: string,
  customerList?: CustomerInfo[]
): React.ReactNode[] {
  if (!text) return [];

  interface CandidateSpan {
    start: number;
    end: number;
    matchedText: string;
    normLen: number;
    isCompound: boolean;
    ruleIdx: number;
    rule: EntityRule;
  }

  const candidates: CandidateSpan[] = [];

  for (let rIdx = 0; rIdx < NAMED_ENTITY_REGISTRY.length; rIdx++) {
    const rule = NAMED_ENTITY_REGISTRY[rIdx];
    const globalRegex = new RegExp(rule.pattern.source, 'gi');
    let m: RegExpExecArray | null;
    while ((m = globalRegex.exec(text)) !== null) {
      const hit = m[0];
      if (!hit) {
        globalRegex.lastIndex += 1;
        continue;
      }
      const normLen = hit.replace(/\s+/g, '').length;
      const isCompound =
        /\s/.test(hit.trim()) ||
        normLen >= 4 ||
        Boolean(findCompoundSymptomEntity(hit));
      candidates.push({
        start: m.index,
        end: m.index + hit.length,
        matchedText: hit,
        normLen,
        isCompound,
        ruleIdx: rIdx,
        rule,
      });
    }
  }

  // SSOT 연동: DOMAIN_KEYWORD_REGISTRY의 synonyms에 매칭되는 모든 구어체/오발음도 하이라이트 후보로 자동 편입
  for (let dIdx = 0; dIdx < DOMAIN_KEYWORD_REGISTRY.length; dIdx++) {
    const kwEntity = DOMAIN_KEYWORD_REGISTRY[dIdx];
    const synRegex = new RegExp(kwEntity.synonyms.source, 'gi');
    let m: RegExpExecArray | null;
    while ((m = synRegex.exec(text)) !== null) {
      const hit = m[0];
      if (!hit) {
        synRegex.lastIndex += 1;
        continue;
      }
      const normLen = hit.replace(/\s+/g, '').length;
      const isCompound =
        /\s/.test(hit.trim()) ||
        normLen >= 4 ||
        Boolean(findCompoundSymptomEntity(hit));
      candidates.push({
        start: m.index,
        end: m.index + hit.length,
        matchedText: hit,
        normLen,
        isCompound,
        ruleIdx: NAMED_ENTITY_REGISTRY.length + dIdx,
        rule: {
          id: `domain-syn-${kwEntity.id}`,
          type: 'symptom',
          label: '고장증상',
          pattern: kwEntity.synonyms,
          keywordId: kwEntity.id,
          colorScheme: { bg: '#fecaca', border: '#f87171', text: '#7f1d1d', glow: 'none' },
        },
      });
    }
  }

  if (candidates.length === 0) {
    return [<span key={0}>{text}</span>];
  }

  // 정렬 우선순위: 1) 글자 길이(normLen)가 긴 복합어 최우선 -> 2) 시작 위치가 빠른 순 -> 3) 룰 등록 순
  candidates.sort((a, b) => {
    if (b.normLen !== a.normLen) return b.normLen - a.normLen;
    if (a.isCompound !== b.isCompound) return a.isCompound ? -1 : 1;
    if (a.start !== b.start) return a.start - b.start;
    return a.ruleIdx - b.ruleIdx;
  });

  const occupied = new Array<boolean>(text.length).fill(false);
  const selectedSpans: CandidateSpan[] = [];

  for (const cand of candidates) {
    let conflict = false;
    for (let i = cand.start; i < cand.end; i++) {
      if (occupied[i]) {
        conflict = true;
        break;
      }
    }
    if (conflict) continue;
    for (let i = cand.start; i < cand.end; i++) {
      occupied[i] = true;
    }
    selectedSpans.push(cand);
  }

  selectedSpans.sort((a, b) => a.start - b.start);

  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  let nodeKey = 0;

  for (const span of selectedSpans) {
    if (span.start > cursor) {
      nodes.push(<span key={nodeKey++}>{text.slice(cursor, span.start)}</span>);
    }

    const part = span.matchedText;
    const matchedRule = span.rule;
    const resolvedSymptomEntity =
      matchedRule.type === 'symptom'
        ? findCompoundSymptomEntity(part) ||
          (matchedRule.keywordId
            ? DOMAIN_KEYWORD_REGISTRY.find(k => k.id === matchedRule.keywordId)
            : undefined) ||
          findMatchingSymptomEntities(part)[0]
        : undefined;

    let isSelected = false;
    if (matchedRule.type === 'symptom' && resolvedSymptomEntity?.id === activeKeywordId) {
      isSelected = true;
    } else if ((matchedRule.type === 'customer' || matchedRule.type === 'site') && matchedRule.customerId === activeCustomerId) {
      isSelected = true;
    }

    const handleClick = () => {
      if (matchedRule.type === 'symptom' && resolvedSymptomEntity) {
        handlers.onSymptomClick(resolvedSymptomEntity);
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

    const extractedNeg = matchedRule.type === 'symptom' ? extractNegativeStateExpressions(part)[0] : undefined;
    const titleText =
      matchedRule.type === 'customer'
        ? `[고객사: ${part}]`
        : matchedRule.type === 'site'
          ? `[현장/위치: ${part}]`
          : matchedRule.type === 'model'
            ? `[장비모델: ${part}]`
            : matchedRule.type === 'action'
              ? `[조치사항: ${part}]`
              : extractedNeg
                ? `[부정상태 추출: ${extractedNeg.stateSummary}]`
                : `[증상/부품: ${part}]`;

    nodes.push(
      <span
        key={nodeKey++}
        onClick={handleClick}
        tabIndex={0}
        role="button"
        aria-label={titleText}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
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
          transition: 'all 0.15s ease',
        }}
      >
        {part}
      </span>
    );

    cursor = span.end;
  }

  if (cursor < text.length) {
    nodes.push(<span key={nodeKey++}>{text.slice(cursor)}</span>);
  }

  return nodes;
}

