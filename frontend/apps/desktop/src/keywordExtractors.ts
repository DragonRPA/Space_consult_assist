import { computeJamoSimilarity } from './contextCorrector';
import {
  DOMAIN_KEYWORD_REGISTRY,
  type KeywordEntity,
} from './keywordRegistryData';

// ── 1-B. 부정적 상태표현 구문 구조 추출기 ([대상 OOO] + [안됨/불가/파손/깨짐/부서짐/빠짐/뽑힘]) ──
export type NegativeStateCategory =
  | 'NON_FUNCTION' // 안됨, 불가, 먹통, 작동불가, 멈춤
  | 'FRACTURE'     // 파손, 깨짐, 부서짐, 부러짐, 균열, 박살
  | 'DETACHMENT'   // 빠짐, 뽑힘, 이탈, 탈거, 풀림, 헐거움, 떨어짐
  | 'TEAR_CUT'     // 끊어짐, 찢어짐, 터짐, 절단, 단선
  | 'BLOCK_LEAK'   // 막힘, 누수, 물샘, 고착, 끼임
  | 'DEFECT_WEAR'; // 고장, 불량, 마모, 닳음

export interface ExtractedNegativeState {
  rawPhrase: string;
  target: string;
  predicate: string;
  canonicalPredicate: string;
  category: NegativeStateCategory;
  stateSummary: string;
  mappedKeywordId?: string;
}

// 대상 명사(OOO) 오탐 방지용 대화 불용어/시간어/대명사
const NEGATIVE_STATE_STOPWORDS = new Set([
  '그게', '이게', '저게', '그거', '이거', '저거', '무슨', '어떤', '아무', '전체', '전부',
  '하나도', '아예', '전혀', '계속', '자꾸', '갑자기', '원래', '지금', '오늘', '어제',
  '내일', '방금', '아까', '제가', '우리가', '거기', '여기', '저기', '말이', '연락',
  '통화', '시간', '일정', '예약', '방문', '출장', '결제', '계산', '생각', '기억',
  '확인', '점검', '테스트', '해결', '조치', '수리', '교체', '처리', '진행'
]);

function classifyNegativePredicate(rawPred: string): {
  canonicalPredicate: string;
  category: NegativeStateCategory;
} {
  const p = rawPred.replace(/\s+/g, '');
  if (/뽑힘|뽑혔|뽑혀|뽑힌/.test(p)) {
    return { canonicalPredicate: '뽑힘', category: 'DETACHMENT' };
  }
  if (/빠짐|빠졌|빠져|빠진|이탈|탈거|풀림|풀렸|헐거|들뜸|들떴|떨어짐|떨어졌/.test(p)) {
    return { canonicalPredicate: '빠짐', category: 'DETACHMENT' };
  }
  if (/부서짐|부서졌|부서져|부서진|부러짐|부러졌|부러져|부러진|박살/.test(p)) {
    return { canonicalPredicate: /부러/.test(p) ? '부러짐' : '부서짐', category: 'FRACTURE' };
  }
  if (/깨짐|깨졌|깨져|깨진|균열|금감|금이갔|갈라짐|갈라졌/.test(p)) {
    return { canonicalPredicate: '깨짐', category: 'FRACTURE' };
  }
  if (/파손|완파/.test(p)) {
    return { canonicalPredicate: '파손', category: 'FRACTURE' };
  }
  if (/끊어짐|끊어졌|끊어져|끊어진|절단|단선|찢어짐|찢어졌|찢어져|찢어진|터짐|터졌|터져|터진/.test(p)) {
    return { canonicalPredicate: /찢/.test(p) ? '찢어짐' : /터/.test(p) ? '터짐' : '끊어짐', category: 'TEAR_CUT' };
  }
  if (/막힘|막혔|막혀|막힌|누수|물샘|고착|끼임|끼었/.test(p)) {
    return { canonicalPredicate: /누수|샘/.test(p) ? '누수' : /고착|끼/.test(p) ? '고착' : '막힘', category: 'BLOCK_LEAK' };
  }
  if (/불가|불능/.test(p)) {
    return { canonicalPredicate: '불가', category: 'NON_FUNCTION' };
  }
  if (/안됨|안돼|안되|안됌|먹통|마비|멈춤|멈췄|안돌|안켜|안나|안먹/.test(p)) {
    return { canonicalPredicate: '안됨', category: 'NON_FUNCTION' };
  }
  return { canonicalPredicate: '고장/불량', category: 'DEFECT_WEAR' };
}

// 추출된 [대상(OOO)] + [부정상태 분류]를 16대 표준 고장 엔티티 ID로 의미 매핑
export function resolveTargetToKeywordId(
  target: string,
  category: NegativeStateCategory,
  canonicalPredicate: string
): string | undefined {
  const t = target.replace(/\s+/g, '').toLowerCase();
  if (!t) return undefined;

  // 1. 스퀴지 / 고무날 / 잔수 / 쫄대
  if (/스퀴지|와이퍼|고무날|블레이드|물받이|뒷고무|잔수|물기|건조|지지휠|쫄대/.test(t)) {
    return 'kw-squeegee';
  }
  // 2. 솔레노이드 / 급수 / 세척수 / 노즐 / 분사
  if (/솔레노이드|솔밸브|급수|세척수|청수|세수|분사구?|노즐|전자밸브|세제/.test(t)) {
    if (canonicalPredicate === '누수') return 'kw-water-leak';
    return 'kw-solenoid';
  }
  if (/^(?:물|물공급|물토출)$/.test(t)) {
    if (canonicalPredicate === '누수') return 'kw-water-leak';
    return 'kw-solenoid';
  }
  // 3. 배관 / 피팅 / 누수
  if (/누수|물샘|배관|피팅|엘보|급수관/.test(t)) {
    return 'kw-water-leak';
  }
  // 4. 플로트 밸브 / 부표 / 만수센서
  if (/플로트|부표|만수|수위센서|차단볼/.test(t)) {
    return 'kw-float-sensor';
  }
  // 5. 흡입모터 / 석션 / 진공 (단, 흡입호스 물리 파손/빠짐은 외장/호스로 분기)
  if (/흡입호스|석션호스|드레인호스|배수호스/.test(t)) {
    return 'kw-chassis-damage';
  }
  if (/흡입|석션|바큠|진공|모터소음/.test(t)) {
    return 'kw-suction';
  }
  // 6. 단자 / 커넥터 / 앤더슨 / 전선 / 배선 / 케이블 / 코드 / 잭
  if (/앤더슨|커넥터|단자|충전잭|잭|플러그|배선|전선|케이블|코드|게이지|잔량계|전기선/.test(t)) {
    return 'kw-terminal-loose';
  }
  // 7. 배터리 방전 / 수명
  if (/방전|배터리수명|사용시간|가동시간|증류수/.test(t)) {
    return 'kw-battery-degrade';
  }
  // 8. 충전 / 충전기 / 배터리
  if (/충전|어댑터|콘센트|배터리/.test(t)) {
    return 'kw-battery';
  }
  // 9. 패드판 / 패드드라이버 / 노브 / 볼트 / 데크 / 삼발이
  if (/패드|데크|노브|볼트|너트|삼발이|클러치|거치대|고정판|장착|탈착/.test(t)) {
    return 'kw-brush-deck';
  }
  // 10. 브러시 / 솔 / 차단기 (빠짐/뽑힘/파손/깨짐은 체결부 이상, 안됨/불가/멈춤은 회전불가)
  if (/브러시|솔|서킷브레이커|차단기|회전/.test(t)) {
    if ((category === 'DETACHMENT' || category === 'FRACTURE') && !/모터|차단기/.test(t)) {
      return 'kw-brush-deck';
    }
    return 'kw-brush-stall';
  }
  // 11. 벨트 / 타이밍벨트 / 텐셔너
  if (/벨트|텐셔너/.test(t)) {
    return 'kw-belt-slip';
  }
  // 12. 액추에이터 / 승강 / 리프트 / 와이어
  if (/액추에이터|승강|리프트|상하|올림|내림|와이어/.test(t)) {
    return 'kw-lift-fail';
  }
  // 13. 주행 / 전진 / 후진 / 구동 / 트랜스액슬 / 포텐셔미터 / 브레이크
  if (/주행|전진|후진|전후진|구동|이동|운행|조향|트랜스액슬|포텐셔미터|속도조절|브레이크|견인/.test(t)) {
    return 'kw-wheel-drive';
  }
  // 14. 에러코드 / 경고음 / 부저
  if (/에러|오류|경고음|경보음|부저|알람/.test(t)) {
    return 'kw-error-code';
  }
  // 15. 전원 / 시동 / 계기판 / 키 / 스위치 (물리적 깨짐/부서짐/빠짐은 외장 파손, 안됨/불가/먹통은 전원불량)
  if (/전원|시동|계기판|메인|릴레이|퓨즈|비상정지|키스위치|키박스|장비|기계|작동|가동/.test(t)) {
    if (category === 'FRACTURE' || category === 'DETACHMENT') {
      return 'kw-chassis-damage';
    }
    return 'kw-power-dead';
  }
  // 16. 외장 / 커버 / 호스 / 레버 / 물통 / 바퀴 / 스위치 등 물리 부품
  if (/외장|커버|뚜껑|범퍼|핸들|손잡이|레버|스위치|호스|드레인|배수|물통|탱크|오수통|청수통|패스탱크|패스통|폐수통|폐수탱크|바퀴|캐스터|휠|페달|투명창|창|케이스|핀|고정핀|걸쇠|고리|클램프|마개|캡|거름망|전조등|라이트/.test(t)) {
    return 'kw-chassis-damage';
  }

  // 17. 자모 음운 유사도로 대상(OOO) 명칭 퍼지 추론 (예: "솔노드 안됨", "스키지 빠짐", "액추에이타 불가")
  const FUZZY_TARGET_MAP: Array<{ sample: string; kwId: string }> = [
    { sample: '솔레노이드', kwId: 'kw-solenoid' },
    { sample: '급수밸브', kwId: 'kw-solenoid' },
    { sample: '스퀴지', kwId: 'kw-squeegee' },
    { sample: '흡입모터', kwId: 'kw-suction' },
    { sample: '흡입필터', kwId: 'kw-suction' },
    { sample: '플로트밸브', kwId: 'kw-float-sensor' },
    { sample: '충전기', kwId: 'kw-battery' },
    { sample: '앤더슨커넥터', kwId: 'kw-terminal-loose' },
    { sample: '브러시모터', kwId: 'kw-brush-stall' },
    { sample: '패드드라이버', kwId: 'kw-brush-deck' },
    { sample: '트랜스액슬', kwId: 'kw-wheel-drive' },
    { sample: '타이밍벨트', kwId: 'kw-belt-slip' },
    { sample: '액추에이터', kwId: 'kw-lift-fail' }
  ];
  if (t.length >= 2) {
    let bestKwId: string | undefined;
    let bestSim = 0;
    for (const item of FUZZY_TARGET_MAP) {
      if (Math.abs(t.length - item.sample.length) > 3) continue;
      const sim = computeJamoSimilarity(t, item.sample);
      if (sim >= 0.74 && sim > bestSim) {
        bestSim = sim;
        bestKwId = item.kwId;
      }
    }
    if (bestKwId) return bestKwId;
  }

  // 18. 미등록 일반 부품(OOO)이라도 파손/깨짐/부서짐/빠짐/뽑힘/끊어짐/찢어짐 상태면 외장·부품 파손(kw-chassis-damage)으로 자동 귀속
  if (category === 'FRACTURE' || category === 'DETACHMENT' || category === 'TEAR_CUT') {
    return 'kw-chassis-damage';
  }

  return undefined;
}

function cleanExtractedTarget(rawTarget: string): string {
  // 앞부분 장비 모델명 토큰 제거 및 끝부분 조사 제거
  let cleaned = rawTarget
    .replace(/^\b(?:J600T?|J800(?:AD)?|J900|S12L?|S7P?|S5|S3|S2|S1|W12|W15|R3)\b\s*/i, '')
    .trim();
  // 어절 단위로 보아 앞의 불용어 제거
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  while (tokens.length > 1 && NEGATIVE_STATE_STOPWORDS.has(tokens[0])) {
    tokens.shift();
  }
  cleaned = tokens.join(' ');
  // 끝 조사(이/가/은/는/을/를/도/만/의) 제거 (단, 2글자 이상 명사 보존)
  if (cleaned.length >= 2) {
    cleaned = cleaned.replace(/[이가은는을를도만의]$/, '');
  }
  return cleaned.trim();
}

/**
 * 문장 내 "OOO 안됨", "OOO 불가", "OOO 파손", "OOO 깨짐", "OOO 부서짐", "OOO 빠짐", "OOO 뽑힘" 등
 * 부정적 상태표현 구문을 구조화 추출하여 반환
 */
export function extractNegativeStateExpressions(text: string): ExtractedNegativeState[] {
  if (!text || !text.trim()) return [];
  const results: ExtractedNegativeState[] = [];
  const seenSummaries = new Set<string>();

  // 패턴 1 (정순): [대상 OOO] + (조사) + (부사/보조용언) + [부정적 상태표현]
  const forwardRegex = /([가-힣A-Za-z0-9]{1,10}(?:\s+[가-힣A-Za-z0-9]{1,10})?)\s*(?:아예|전혀|완전히|자꾸|계속|갑자기|잘)?\s*(?:작동[이가은는]?\s*|가동[이가은는]?\s*|회전[이가은는]?\s*|체결[이가은는]?\s*|고정[이가은는]?\s*)?(안\s*됨|안\s*돼(?:요|서|네)?|안\s*되(?:요|네|고|더|는|니)?|안\s*됌|불가(?:능|합니다|해요)?|파손(?:됨|됐|되었|되)?|깨짐|깨졌(?:어요|어|네|습니다)?|깨져(?:요|서|있)?|부서짐|부서졌(?:어요|어|네|습니다)?|부서져(?:요|서|있)?|부러짐|부러졌(?:어요|어|네|습니다)?|부러져(?:요|서|있)?|빠짐|빠졌(?:어요|어|네|습니다)?|빠져(?:요|서|버렸|있)?|뽑힘|뽑혔(?:어요|어|네|습니다)?|뽑혀(?:요|서|버렸|있)?|끊어짐|끊어졌(?:어요|어|네)?|찢어짐|찢어졌(?:어요|어|네)?|터짐|터졌(?:어요|어|네)?|막힘|막혔(?:어요|어|네)?|고장(?:남|났)?|불량|먹통)/gi;

  let match: RegExpExecArray | null;
  while ((match = forwardRegex.exec(text)) !== null) {
    const rawPhrase = match[0].trim();
    const rawTarget = match[1].trim();
    const rawPred = match[2].trim();
    const target = cleanExtractedTarget(rawTarget);
    if (!target || target.length < 1 || NEGATIVE_STATE_STOPWORDS.has(target)) continue;

    const { canonicalPredicate, category } = classifyNegativePredicate(rawPred);
    const mappedKeywordId = resolveTargetToKeywordId(target, category, canonicalPredicate);
    const stateSummary = `${target} ${canonicalPredicate}`;

    if (!seenSummaries.has(stateSummary)) {
      seenSummaries.add(stateSummary);
      results.push({
        rawPhrase,
        target,
        predicate: rawPred,
        canonicalPredicate,
        category,
        stateSummary,
        mappedKeywordId
      });
    }
  }

  // 패턴 2 (관형형 역순): [깨진/부서진/부러진/빠진/뽑힌/파손된/끊어진/찢어진/막힌/고장난] + [대상 OOO]
  const modifierRegex = /(파손된|깨진|부서진|부러진|빠진|뽑힌|끊어진|찢어진|터진|막힌|고장\s*난)\s+([가-힣A-Za-z0-9]{1,10}(?:\s+[가-힣A-Za-z0-9]{1,8})?)/gi;
  while ((match = modifierRegex.exec(text)) !== null) {
    const rawPhrase = match[0].trim();
    const rawPred = match[1].trim();
    const target = cleanExtractedTarget(match[2].trim());
    if (!target || target.length < 1 || NEGATIVE_STATE_STOPWORDS.has(target)) continue;

    const { canonicalPredicate, category } = classifyNegativePredicate(rawPred);
    const mappedKeywordId = resolveTargetToKeywordId(target, category, canonicalPredicate);
    const stateSummary = `${target} ${canonicalPredicate}`;

    if (!seenSummaries.has(stateSummary)) {
      seenSummaries.add(stateSummary);
      results.push({
        rawPhrase,
        target,
        predicate: rawPred,
        canonicalPredicate,
        category,
        stateSummary,
        mappedKeywordId
      });
    }
  }

  return results;
}

// ── 1-B-2. 복합어(2단어 이상 결합 = 단일 의미) 최우선 식별 사전 ──
// 단일 단어("배터리", "모터", "호스", "브러시", "밸브")가 복합어("배터리 케이블", "흡입 호스", "브러시 모터")의
// 앞부분만 가로채어 오판정하는 현상을 방지하기 위해, 복합어를 최장 일치(Longest-Match) 기준으로 선행 매칭 후 해당 구간을 마스킹합니다.
const COMPOUND_SYMPTOM_PRIORITY_RULES: Array<{ pattern: RegExp; keywordId: string }> = [
  // 배터리 케이블 / 단자 / 커넥터 (단일어 '배터리'보다 최우선 처리)
  { pattern: /배터리\s*점퍼\s*케이블|배터리\s*케이블|배터리\s*단자|배터리\s*커넥터|배터리\s*배선|배터리\s*전선|배터리\s*선|점퍼\s*케이블|충전기?\s*케이블|전원\s*케이블|전원\s*코드|앤더슨\s*커넥터|앤더슨\s*잭|충전\s*단자|충전\s*커넥터|단자\s*접촉\s*불량|잔량\s*표시\s*오류|배터리\s*게이지/gi, keywordId: 'kw-terminal-loose' },
  // 배터리 방전 / 수명 열화
  { pattern: /배터리\s*조기\s*방전|배터리\s*방전|조기\s*방전|금방\s*방전|빨리\s*방전|배터리\s*수명|배터리\s*교체|사용\s*시간\s*급감|증류수\s*보충/gi, keywordId: 'kw-battery-degrade' },
  // 배터리 충전 / 충전기 이상
  { pattern: /배터리\s*충전\s*불량|배터리\s*충전|충전\s*불량|충전\s*불가|충전기\s*고장|충전기\s*불량|충전기\s*파손|어댑터\s*불량/gi, keywordId: 'kw-battery' },
  // 급수 / 솔레노이드 밸브 / 청수 필터
  { pattern: /솔레노이드\s*밸브|급수\s*밸브|전자\s*밸브|세척수\s*미분사|노즐\s*막힘|분사구\s*막힘|청수\s*필터|세수\s*필터|거름망\s*필터/gi, keywordId: 'kw-solenoid' },
  // 세척수 누수 / 호스 피팅 물샘
  { pattern: /세척수\s*누수|청수\s*누수|호스\s*피팅\s*누수|호스\s*물샘|엘보\s*피팅|밸브\s*닫힘\s*불량|물이?\s*계속\s*새/gi, keywordId: 'kw-water-leak' },
  // 스퀴지 고무 / 바닥 잔수
  { pattern: /스퀴지\s*블레이드|스퀴지\s*고무|스퀴지\s*날|와이퍼\s*고무|고무\s*블레이드|고무\s*날|뒷\s*고무|바닥\s*물기|바닥\s*잔수|줄무늬\s*잔수|물\s*자국|패드\s*거치대|판\s*거치대/gi, keywordId: 'kw-squeegee' },
  // 외장 / 흡입 호스 / 드레인 호스 / 폐수 탱크 (단일어 '흡입'보다 '흡입 호스'가 먼저 매칭되도록 배치)
  { pattern: /흡입\s*호스|석션\s*호스|드레인\s*호스|배수\s*호스|배수\s*캡|폐수\s*탱크|오수\s*탱크|패스\s*탱크|패스\s*통|청수\s*탱크|물통\s*깨짐|뚜껑\s*깨짐|레버\s*부러짐|레버\s*부서짐|외장\s*파손|커버\s*파손|호스\s*찢어짐|호스\s*빠짐|호스\s*뽑힘|호스\s*막힘/gi, keywordId: 'kw-chassis-damage' },
  // 흡입 모터 / 석션 모터 / 진공 모터 / 흡입 필터
  { pattern: /흡입\s*모터|흡입\s*모타|석션\s*모터|바큠\s*모터|진공\s*모터|흡입\s*필터|흡기\s*필터|석션\s*필터|모터\s*필터|흡입력\s*저하|흡입\s*불량|진공압\s*저하|모터\s*굉음|모터\s*과열|모터\s*소음|타는\s*냄새|탄\s*냄새/gi, keywordId: 'kw-suction' },
  // 오수탱크 플로트 밸브 / 만수 센서
  { pattern: /플로트\s*밸브|플로트\s*볼|플로트\s*센서|만수\s*센서|만수\s*경보|만수\s*차단|수위\s*센서|오수\s*탱크\s*조기\s*차단/gi, keywordId: 'kw-float-sensor' },
  // 전원 완전 인입 불가 / 비상정지 / 키스위치
  { pattern: /비상\s*정지\s*버튼|비상\s*정지\s*스위치|비상\s*정지|키\s*스위치|키\s*박스|메인\s*릴레이|메인\s*퓨즈|전원\s*불량|전원\s*먹통|계기판\s*먹통/gi, keywordId: 'kw-power-dead' },
  // 브러시 모터 / 서킷 브레이커
  { pattern: /브러시\s*모터|브러시\s*회전\s*불량|브러시\s*회전|브러시\s*미회전|서킷\s*브레이커|과부하\s*차단기?/gi, keywordId: 'kw-brush-stall' },
  // 패드 드라이버 / 고정 노브 / 삼발이
  { pattern: /패드\s*드라이버|패드\s*홀더|데크\s*노브|고정\s*노브|삼발이\s*클러치|브러시\s*장착|브러시\s*탈착|볼트\s*풀림/gi, keywordId: 'kw-brush-deck' },
  // 주행 구동 / 트랜스액슬 / 전자 브레이크
  { pattern: /주행\s*모터|구동\s*모터|주행\s*불가|주행\s*불량|구동\s*불량|전자\s*브레이크|견인\s*레버|직진\s*쏠림/gi, keywordId: 'kw-wheel-drive' },
  // 타이밍 벨트 / 구동 벨트 슬립
  { pattern: /타이밍\s*벨트|구동\s*벨트|벨트\s*슬립|벨트\s*마모|벨트\s*늘어짐|벨트\s*끊어짐|끼익\s*소리|고무\s*마찰음/gi, keywordId: 'kw-belt-slip' },
  // 리프트 액추에이터 / 승강 불량
  { pattern: /리프트\s*액추에이터|전동\s*액추에이터|승강\s*불량|승강\s*장치|리프트\s*불량|승강\s*페달/gi, keywordId: 'kw-lift-fail' },
  // 에러 코드 / 경고음
  { pattern: /에러\s*코드|오류\s*코드|삐삐\s*소리|5C\s*에러|OC\s*에러|오씨\s*에러/gi, keywordId: 'kw-error-code' },
];

/**
 * 발화 문장 내 2단어 이상 결합된 복합어(예: "배터리 케이블", "솔레노이드 밸브", "흡입 호스")가
 * 포함되어 있는지 최장 일치 기준으로 우선 판정하여 반환합니다.
 */
export function findCompoundSymptomEntity(text: string): KeywordEntity | null {
  if (!text || !text.trim()) return null;
  let bestKeywordId: string | null = null;
  let bestNormLen = 0;

  for (const rule of COMPOUND_SYMPTOM_PRIORITY_RULES) {
    const regex = new RegExp(rule.pattern.source, 'gi');
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text)) !== null) {
      const normLen = m[0].replace(/\s+/g, '').length;
      if (normLen > bestNormLen) {
        bestNormLen = normLen;
        bestKeywordId = rule.keywordId;
      }
    }
  }
  if (!bestKeywordId) return null;
  return DOMAIN_KEYWORD_REGISTRY.find(k => k.id === bestKeywordId) || null;
}

/**
 * 문장(또는 슬라이딩 윈도우 문맥)에서 매칭되는 모든 표준 증상 엔티티를 반환
 * - 1단계 (복합어 최우선 처리 & 구간 마스킹): "배터리 케이블", "흡입 호스", "솔레노이드 밸브" 등
 *   2단어 이상 결합된 복합어를 최장 일치(Longest-Match) 순으로 먼저 식별하고 해당 글자 구간을 마스킹합니다.
 * - 2단계 (잔여 구간 일반 매칭): 마스킹된 후 남은 문장에 대해서만 일반 정규식(synonyms) 매칭을 수행하여
 *   "배터리 케이블"에서 "배터리"만 먼저 잡혀 오판정되는 현상을 원천 차단합니다.
 */
export function findMatchingSymptomEntities(text: string): KeywordEntity[] {
  if (!text || !text.trim()) return [];
  const matched: KeywordEntity[] = [];
  const seenIds = new Set<string>();

  // 1단계: 복합어(2단어 이상 결합어) 후보 전체 수집 후 길이 내림차순(최장 일치) 정렬 및 구간 마스킹
  const compoundHits: Array<{ start: number; end: number; normLen: number; keywordId: string }> = [];
  for (const rule of COMPOUND_SYMPTOM_PRIORITY_RULES) {
    const regex = new RegExp(rule.pattern.source, 'gi');
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text)) !== null) {
      const hitText = m[0];
      compoundHits.push({
        start: m.index,
        end: m.index + hitText.length,
        normLen: hitText.replace(/\s+/g, '').length,
        keywordId: rule.keywordId,
      });
    }
  }

  compoundHits.sort((a, b) => (b.normLen !== a.normLen ? b.normLen - a.normLen : a.start - b.start));

  const chars = text.split('');
  const consumedMask = new Array<boolean>(chars.length).fill(false);

  for (const hit of compoundHits) {
    let overlaps = false;
    for (let i = hit.start; i < hit.end; i++) {
      if (consumedMask[i]) {
        overlaps = true;
        break;
      }
    }
    if (overlaps) continue;

    for (let i = hit.start; i < hit.end; i++) {
      consumedMask[i] = true;
      chars[i] = ' ';
    }

    if (!seenIds.has(hit.keywordId)) {
      const entity = DOMAIN_KEYWORD_REGISTRY.find(k => k.id === hit.keywordId);
      if (entity) {
        matched.push(entity);
        seenIds.add(entity.id);
      }
    }
  }

  // 2단계: 복합어 구간이 마스킹(제거)된 잔여 텍스트에서만 단일어/일반 구어체 정규식 매칭 수행
  const remainingText = chars.join('');
  if (remainingText.trim()) {
    for (const entity of DOMAIN_KEYWORD_REGISTRY) {
      if (entity.synonyms.test(remainingText) && !seenIds.has(entity.id)) {
        matched.push(entity);
        seenIds.add(entity.id);
      }
    }
  }

  return matched;
}


// ── 1-C. 고객사 · 담당자 · 전화번호 · 도로명/지번 주소 · 상세위치 5차원 구조화 추출기 ──
export interface ExtractedCustomerAddressInfo {
  customerName?: string;
  useCompany?: string;
  managerName?: string;
  phone?: string;
  roadOrLotAddress?: string;
  addressDetail?: string;
  matchedPresetCustomerId?: string;
}

const NON_PERSON_NAME_PREFIXES = new Set([
  '관리', '시설', '기술', '미화', '운영', '현장', '본사', '지점', '센터', '공장',
  '담당', '총괄', '청소', '용역', '보안', '경비', '방재', '기전', '전기', '기계',
  '저희', '우리', '여기', '거기', '오늘', '지금', '이번', '다음', '출장', '방문'
]);

const NON_COMPANY_CUES = new Set([
  '우리', '저희', '여기', '거기', '지금', '오늘', '청소기', '장비', '배터리', '브러시', '스퀴지'
]);

export function formatPhoneNumber(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, '');
  if (digits.startsWith('02')) {
    if (digits.length === 9) return `02-${digits.slice(2, 5)}-${digits.slice(5)}`;
    if (digits.length === 10) return `02-${digits.slice(2, 6)}-${digits.slice(6)}`;
  } else if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  } else if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  return rawPhone.trim();
}

/**
 * 발화 문장 또는 검색어에서 [고객사/현장명], [용역사], [담당자명+직함], [전화번호], [도로명/지번 본주소], [층/동/구역 상세위치]를 정밀 분리 추출
 */
export function extractCustomerAndAddressEntities(text: string): ExtractedCustomerAddressInfo {
  const info: ExtractedCustomerAddressInfo = {};
  if (!text || !text.trim()) return info;

  // 1. 전화번호 추출 (휴대폰 010 및 지역번호 02, 031~064, 070)
  const phoneMatch = text.match(/\b(?:01[016789]|02|0[3-6][1-5]|070)[-\s.]?\d{3,4}[-\s.]?\d{4}\b/);
  if (phoneMatch) {
    info.phone = formatPhoneNumber(phoneMatch[0]);
  }

  // 2. 도로명 주소 및 지번/행정구역 본주소 추출
  const roadAddressRegex = /(?:(?:서울|부산|대구|인천|광주|대전|울산|세종|경기|경기도|강원|강원도|충북|충청북도|충남|충청남도|전북|전라북도|전남|전라남도|경북|경상북도|경남|경상남도|제주|제주도)(?:특별시|광역시|특별자치시|특별자치도)?\s+)?(?:[가-힣]{1,5}(?:시|군|구)\s+)*(?:[가-힣]{1,6}(?:구|읍|면|동)\s+)?[가-힣0-9]{1,12}(?:대로|번길|산단로|단지로|로|길)\s*\d{1,4}(?:-\d{1,4})?(?:\s*번지)?/;
  const lotAddressRegex = /(?:(?:서울|부산|대구|인천|광주|대전|울산|세종|경기|경기도|강원|강원도|충북|충청북도|충남|충청남도|전북|전라북도|전남|전라남도|경북|경상북도|경남|경상남도|제주|제주도)(?:특별시|광역시|특별자치시|특별자치도)?\s+)[가-힣]{1,5}(?:시|군|구)(?:\s+[가-힣0-9]{1,8}(?:구|읍|면|동|가|리))?(?:\s+\d{1,4}(?:-\d{1,4})?(?:\s*번지)?)?|[가-힣]{2,5}(?:시|군|구)\s+[가-힣0-9]{2,8}(?:읍|면|동|가|리)(?:\s+\d{1,4}(?:-\d{1,4})?(?:\s*번지)?)?/;

  const roadMatch = text.match(roadAddressRegex);
  if (roadMatch) {
    info.roadOrLotAddress = roadMatch[0].trim();
  } else {
    const lotMatch = text.match(lotAddressRegex);
    if (lotMatch) {
      info.roadOrLotAddress = lotMatch[0].trim();
    }
  }

  // 3. 건물 동·층·호수·상세 구역(방재실/하역장/주차장/기계실 등) 추출
  const detailParts: string[] = [];
  const dongMatch = text.match(/\b(?:\d{1,4}\s*동|[A-Z]\s*동|본관|별관|신관|물류동|생산동|[1-4]공장)\b/i);
  if (dongMatch) detailParts.push(dongMatch[0].trim());

  const floorMatch = text.match(/\b(?:지하\s*\d{1,2}\s*층|B\s*\d{1,2}\s*층?|\d{1,2}\s*층|\d{1,4}\s*호)\b/i);
  if (floorMatch) detailParts.push(floorMatch[0].trim());

  const zoneMatch = text.match(/(?:지하\s*주차장|주차장\s*관리소|주차장|입출고\s*하역장|하역장|물류\s*데크|방재실|기계실|기전실|전기실|기관실|관리\s*지원\s*센터|관리\s*사무소|관리실|관리소|경비실|보안실|미화원?실|대기실|휴게실|정비\s*창고|저온\s*창고|창고|프레스룸|생산\s*라인|정문|후문)/);
  if (zoneMatch && !detailParts.some(p => p.includes(zoneMatch[0]))) {
    detailParts.push(zoneMatch[0].trim());
  }

  if (detailParts.length > 0) {
    info.addressDetail = detailParts.join(' ');
  }

  // 4. 담당자 성함 + 직함 추출
  const managerRoleRegex = /([가-힣]{2,4})\s*(시설과장|관리과장|관리소장|관리실장|기술팀장|미화팀장|미화반장|미화원|운영총괄|공장장|센터장|본부장|과장|소장|팀장|실장|차장|부장|대리|주임|반장|조장|대표|이사|전무|상무|사장|총괄|매니저)님?/g;
  let mgrMatch: RegExpExecArray | null;
  while ((mgrMatch = managerRoleRegex.exec(text)) !== null) {
    const candidateName = mgrMatch[1].trim();
    const role = mgrMatch[2].trim();
    if (!NON_PERSON_NAME_PREFIXES.has(candidateName)) {
      info.managerName = `${candidateName} ${role}`;
      break;
    }
  }
  if (!info.managerName) {
    const selfIntroMgr = text.match(/(?:저는|담당자(?:는|분은)?|제\s*이름은|성함은)\s*([가-힣]{2,4})(?:\s*(?:입니다|인데|입니|이고|라고))/);
    if (selfIntroMgr && !NON_PERSON_NAME_PREFIXES.has(selfIntroMgr[1])) {
      info.managerName = selfIntroMgr[1].trim();
    }
  }

  // 5. 고객사 / 건물 / 단지 / 용역사명 추출 (명시적인 법인격·단지·시설관리 상호만 추출)
  const corpRegex = /(?:\(주\)|주식회사|\(유\)|유한회사)\s*[가-힣A-Za-z0-9_]{2,14}(?:\s+[가-힣A-Za-z0-9]{2,10})?|[가-힣A-Za-z0-9_]{2,14}\s*(?:\(주\)|주식회사)/;
  const facilityRegex = /([가-힣A-Za-z0-9]{2,12}(?:\s+[가-힣A-Za-z0-9]{2,10})?\s*(?:아파트(?:\s*관리사무소)?|관리사무소|관리단|관리지원센터|물류센터|유통센터|메디컬센터|화성센터|선장공장|서창공장|대학교|고등학교|중학교|초등학교|라이온스밸리|테크노밸리|리버파크|에듀파크|더샵(?:\s*퍼스트월드)?|반포자이|래미안(?:\s*퍼스티지)?|푸르지오|아이파크|롯데캐슬(?:\s*프레미어)?|이편한세상|e편한세상|우미린|트라팰리스|힐스테이트|종합관리|환경산업|마스터크린|클린에코|피앤씨클린|삼원종합관리|한결에프엠|대경종합개발|건물코디뱅크|반짝반짝시스템|에스에프코리아|듀델코리아|위너스텍|성원테크|케이엠산업|시설관리))/;
  const cueCompanyRegex = /(?:현장(?:명)?은|업체(?:명)?은|회사(?:명)?는|건물(?:명)?은|상호(?:명)?는)\s+([가-힣A-Za-z0-9()]{2,14}(?:\s+[가-힣A-Za-z0-9]{2,10}){0,2}?)\s*(?:인데|입니다|입니|이고|에서|거든)/;

  const corpMatch = text.match(corpRegex);
  const facMatch = text.match(facilityRegex);
  const cueMatch = text.match(cueCompanyRegex);
  const shortConfirmCompanyMatch = text.match(/(?:^|\s)(수림\s*종합\s*관리|수림)(?=\s*맞아요|\s*맞습니다|\s*입니다|\s*이에요)/);

  const stripMgrAndCue = (rawName: string): string => {
    let cleaned = rawName.replace(/^(?:안녕하세요|여기는?|저희는?|지금|현장명은|업체명은|회사명은)\s+/, '').trim();
    if (info.managerName) {
      const mgrParts = info.managerName.split(/\s+/);
      for (const mp of [info.managerName, mgrParts[0]]) {
        if (mp && cleaned.endsWith(mp)) {
          cleaned = cleaned.slice(0, cleaned.length - mp.length).trim();
        }
      }
    }
    return cleaned.replace(/[이가은는을를도만의]$/, '').trim();
  };

  if (facMatch) {
    const facName = stripMgrAndCue(facMatch[1]);
    if (/클린|크린|용역|종합관리|에프엠|환경산업|코디뱅크/.test(facName) && corpMatch && corpMatch[0] !== facName) {
      info.useCompany = facName;
      info.customerName = stripMgrAndCue(corpMatch[0]);
    } else if (facName.length >= 2 && !NON_COMPANY_CUES.has(facName)) {
      info.customerName = facName;
      if (corpMatch && !facName.includes(corpMatch[0].trim())) {
        info.useCompany = corpMatch[0].trim();
      }
    }
  } else if (corpMatch) {
    info.customerName = stripMgrAndCue(corpMatch[0]);
  } else if (cueMatch) {
    const candidate = stripMgrAndCue(cueMatch[1]);
    if (candidate.length >= 2 && !NON_COMPANY_CUES.has(candidate)) {
      info.customerName = candidate;
    }
  } else if (shortConfirmCompanyMatch) {
    info.customerName = shortConfirmCompanyMatch[1].trim();
  }

  return info;
}
