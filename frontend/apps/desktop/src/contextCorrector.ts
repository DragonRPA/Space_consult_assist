// Domain-Specific Phonetic, Spoken Model/Error Code & Jamo Fuzzy Correction Engine
// for Industrial Cleaning Equipment (SPACE Consult Assist)

export interface CorrectionEvent {
  original: string;
  corrected: string;
  category: string;
  timestamp: string;
}

interface DomainRule {
  pattern: RegExp;
  replacement: string | ((match: string, ...args: any[]) => string);
  category: string;
}

// ── 1. 한국어 숫자 발음 -> 아라비아 숫자 매핑 (에러코드 변환용) ──────────────────
const KOREAN_DIGIT_MAP: Record<string, string> = {
  '공': '0', '영': '0', '제로': '0', '고': '0', '0': '0',
  '일': '1', '원': '1', '하나': '1', '1': '1',
  '이': '2', '투': '2', '둘': '2', '2': '2',
  '삼': '3', '쓰리': '3', '셋': '3', '3': '3',
  '사': '4', '포': '4', '넷': '4', '4': '4',
  '오': '5', '파이브': '5', '다섯': '5', '5': '5',
  '육': '6', '륙': '6', '식스': '6', '6': '6',
  '칠': '7', '세븐': '7', '쎄븐': '7', '7': '7',
  '팔': '8', '에잇': '8', '8': '8',
  '구': '9', '나인': '9', '9': '9',
};

const DIGIT_TOKEN_PATTERN = '(?:공|영|제로|고|일|원|이|투|삼|쓰리|사|포|오|파이브|육|륙|식스|칠|세븐|쎄븐|팔|에잇|구|나인|[0-9])';

// ── 2. 장비 모델명 & 에러코드 & 전문용어 구어체/오발음 정규화 룰 ─────────────────
const DOMAIN_CORRECTION_RULES: DomainRule[] = [
  // [0] 전화번호 음성 발화 최우선 치환 ("공일공 구팔칠육에 오사삼이", "공일공 일이고삼 사오육칠" -> "010-9876-5432", "010-1203-4567")
  {
    pattern: new RegExp(
      `(?:공\\s*일\\s*공|영\\s*일\\s*공|0\\s*1\\s*0)(?:\\s*에|\\s*의|\\s*-)?\\s*` +
      `(${DIGIT_TOKEN_PATTERN})\\s*(${DIGIT_TOKEN_PATTERN})\\s*(${DIGIT_TOKEN_PATTERN})\\s*(${DIGIT_TOKEN_PATTERN}?)(?:\\s*에|\\s*의|\\s*-)?\\s*` +
      `(${DIGIT_TOKEN_PATTERN})\\s*(${DIGIT_TOKEN_PATTERN})\\s*(${DIGIT_TOKEN_PATTERN})\\s*(${DIGIT_TOKEN_PATTERN})`,
      'gi'
    ),
    replacement: (_m: string, a1: string, a2: string, a3: string, a4: string, b1: string, b2: string, b3: string, b4: string) => {
      const mid = [a1, a2, a3, a4].filter(Boolean).map(x => KOREAN_DIGIT_MAP[x] ?? x).join('');
      const last = [b1, b2, b3, b4].filter(Boolean).map(x => KOREAN_DIGIT_MAP[x] ?? x).join('');
      return `010-${mid}-${last}`;
    },
    category: '전화번호'
  },

  // [A] 장비 모델명 (긴 모델명 S12, W12, W15, J600T, J800 등을 S1, S2보다 먼저 평가)
  {
    pattern: /(?:에스|애스|엑스|S|X)\s*(?:12|십\s*이|일\s*이|트웰브)\s*(?:엘|L)?|f10이/gi,
    replacement: (m: string) => (/엘|L/i.test(m) ? 'S12L' : 'S12'),
    category: '장비모델'
  },
  {
    pattern: /(?:더블유|떠블유|다블유|W)\s*(?:15|십\s*오|일\s*오|피프틴)/gi,
    replacement: 'W15',
    category: '장비모델'
  },
  {
    pattern: /(?:더블유|떠블유|다블유|W)\s*(?:12|십\s*이|일\s*이|트웰브)/gi,
    replacement: 'W12',
    category: '장비모델'
  },
  {
    pattern: /(?:제이|재이|J)\s*(?:600|육\s*백|육백|6\s*0\s*0)\s*(?:티|T)?|진\s*클린\s*(?:600|육백|6|식스)/gi,
    replacement: 'J600T',
    category: '장비모델'
  },
  {
    pattern: /(?:제이|재이|J)\s*(?:800|팔\s*백|팔백|8\s*0\s*0)\s*(?:에이\s*디|AD)?|진\s*클린\s*(?:800|팔백|8|에잇)/gi,
    replacement: 'J800',
    category: '장비모델'
  },
  {
    pattern: /(?:제이|재이|J)\s*(?:900|구\s*백|구백|9\s*0\s*0)/gi,
    replacement: 'J900',
    category: '장비모델'
  },
  {
    pattern: /(?:더\s*뉴\s*)?(?:에스|애스|S)\s*(?:7|칠|세븐|쎄븐)\s*(?:피|P)?(?![0-9])/gi,
    replacement: 'S7',
    category: '장비모델'
  },
  {
    pattern: /(?:에스|애스|S)\s*(?:5(?![0-9])|파이브|오(?=\s|$|[이가은는을를의로도만과와에]|모델|장비|청소))/gi,
    replacement: 'S5',
    category: '장비모델'
  },
  {
    pattern: /(?:에스|애스|S)\s*(?:3(?![0-9])|쓰리|삼(?=\s|$|[이가은는을를의로도만과와에]|모델|장비|청소|미니))(?:\s*미니|\s*mini)?/gi,
    replacement: 'S3',
    category: '장비모델'
  },
  {
    pattern: /(?:에스|애스|S)\s*(?:2(?![0-9])|투|이(?=\s+(?:모델|장비|청소기)))/gi,
    replacement: 'S2',
    category: '장비모델'
  },
  {
    pattern: /(?:에스|애스|S)\s*(?:1(?![0-9])|원|일(?=\s+(?:모델|장비|청소기)))/gi,
    replacement: 'S1',
    category: '장비모델'
  },
  {
    pattern: /(?:알|아르|R)\s*(?:3(?![0-9])|쓰리|삼(?=\s|$|[이가은는을를의로도만과와에]|모델|장비|청소))/gi,
    replacement: 'R3',
    category: '장비모델'
  },

  // [B] 계기판 에러코드 음성 발화 치환 (예: "이 공일", "E 영일", "에러 01", "에러 공삼" -> "E01", "E03")
  {
    pattern: new RegExp(`(?<![가-힣0-9])(?:에러\\s*코드|에러|코드|이(?=\\s*(?:공|영|0))|E)\\s*(${DIGIT_TOKEN_PATTERN})\\s*(${DIGIT_TOKEN_PATTERN})(?:\\s*번)?`, 'gi'),
    replacement: (_m: string, d1: string, d2: string) => {
      const n1 = KOREAN_DIGIT_MAP[d1] ?? d1;
      const n2 = KOREAN_DIGIT_MAP[d2] ?? d2;
      return `E${n1}${n2}`;
    },
    category: '에러코드'
  },
  {
    pattern: /(?:에러\s*코드|에러)\s*([1-9])\s*번/gi,
    replacement: (_m: string, d: string) => `E0${d}`,
    category: '에러코드'
  },
  {
    pattern: /(?:에프|F)\s*(공|영|0)\s*(일|원|1|이|투|2)/gi,
    replacement: (_m: string, _d1: string, d2: string) => `F0${KOREAN_DIGIT_MAP[d2] ?? d2}`,
    category: '에러코드'
  },
  {
    pattern: /(?:에러\s*)?(?:이\s*에이치|E\s*H)(?=\s|$|에러|가|이|뜨|점멸)/gi,
    replacement: 'EH',
    category: '에러코드'
  },

  // [C] 솔레노이드 밸브 (고객 오발음: 솔리노이드, 솔노이드, 소레노이드, 솔래노이드, 슬레노이드, 솔밸브 등)
  {
    pattern: /솔리노이드|솔노이드|소레노이드|솔래노이드|솔로노이드|슬레노이드|셀레노이드|솔레노이트|솔레노이드|솔레노드|솔리노드|솔노드|솔레노이(?=\s|$|벨|밸)|솔\s*밸브|솔\s*벨브|전자\s*급수\s*밸브|설레는\s*너희들(?:\s*밸브)?/gi,
    replacement: '솔레노이드',
    category: '급수/솔레노이드'
  },

  // [D] 스퀴지 / 고무 블레이드 (고객 오발음: 스퀴즈, 스키지, 스끼지, 스크지, 스쿠지, 뒷고무 등)
  {
    pattern: /스퀴즈|스키지|스키즈|스끼지|스끼즈|스크지|스쿠지|스퀴시|스퀴기|스위지|수키지|수퀴지|스퀴징|물받이\s*고무|물\s*긁는\s*고무|뒤에\s*고무날|뒷\s*고무날/gi,
    replacement: '스퀴지',
    category: '소모품/스퀴지'
  },

  // [E] 흡입 모터 / 진공압 (흐빕모터, 흡입모타, 석션모터, 바큠모터 등)
  {
    pattern: /흡입\s*모타|흐빕\s*모터|흡입\s*못터|흡잉\s*모터|흡기\s*모타|석션\s*모터|석션\s*모타|셕션\s*모터|바큠\s*모터|바쿰\s*모터|진공\s*모타|진공\s*모터/gi,
    replacement: '흡입 모터',
    category: '구동/흡입'
  },
  {
    pattern: /친구\s*납|진공\s*앞|진공\s*암/gi,
    replacement: '진공압',
    category: '계측/성능'
  },

  // [F] 플로트 밸브 / 만수 차단 센서 (프로토밸브, 플로터밸브, 만수볼, 오수통 부표 등)
  {
    pattern: /프로토\s*밸브|플롯\s*밸브|플로터\s*밸브|플로트\s*벨브|프로트\s*밸브|플로투\s*밸브|만수\s*차단볼|만수\s*부표|물차단\s*부표|오수통\s*부표/gi,
    replacement: '플로트 밸브',
    category: '센서/만수'
  },

  // [G] 액추에이터 / 승강 리프트 (엑추에이터, 액추레이터 등)
  {
    pattern: /액츄에이터|엑추에이터|엑츄에이터|액추레이터|엑추레이터|액츄레이터|엑츄레이터|액추에이타|엑추에이타/gi,
    replacement: '액추에이터',
    category: '승강/리프트'
  },

  // [H] 앤더슨 커넥터 / 단자 (엔더슨잭, 언더슨잭, 안데르센잭, 배터리깍지 등)
  {
    pattern: /앤더슨\s*잭|엔더슨\s*잭|언더슨\s*잭|안데르센\s*잭|앤더슨\s*플러그|엔더슨\s*커넥터|언더슨\s*커넥터|배터리\s*깍지/gi,
    replacement: '앤더슨 커넥터',
    category: '전원/단자'
  },

  // [I] 패드 드라이버 / 브러시 계통
  {
    pattern: /패트\s*드라이버|팻\s*드라이버|페드\s*드라이버|패드\s*드라이바|페드\s*드라이바|페드판|패드\s*거치판|패드\s*홀더/gi,
    replacement: '패드 드라이버',
    category: '브러시계통'
  },
  {
    pattern: /브러쉬|부러시|부러쉬/gi,
    replacement: '브러시',
    category: '브러시계통'
  },
  {
    pattern: /선지\s*프로\s*실물|프로\s*실물/gi,
    replacement: '브러시 물',
    category: '브러시/급수'
  },

  // [J] 서킷 브레이커 / 트랜스액슬 / 포텐셔미터
  {
    pattern: /서킷\s*브레이카|써킷\s*브레이커|서키트\s*브레이커|서킷\s*브래이커|과부하\s*차단기|두꺼비집\s*차단기/gi,
    replacement: '서킷 브레이커',
    category: '전원/차단기'
  },
  {
    pattern: /트랜스\s*엑슬|트렌스\s*액슬|트랜스\s*액슬|트랜스\s*엑술/gi,
    replacement: '트랜스액슬',
    category: '주행/구동'
  },
  {
    pattern: /포텐쇼메타|포텐셔메타|포텐시오미터|포텐샤미터/gi,
    replacement: '포텐셔미터',
    category: '주행/속도'
  },

  // [K] 탱크 / 호스 / 배터리 구어체
  {
    pattern: /해수\s*탱크|배수\s*탱크|회수\s*통|더러운\s*물통|폐수\s*통|오수\s*통/gi,
    replacement: '폐수탱크',
    category: '탱크계통'
  },
  {
    pattern: /깨끗한\s*물통|정수\s*통|세수\s*통|청수\s*통/gi,
    replacement: '세수탱크',
    category: '탱크계통'
  },
  {
    pattern: /호오스|물\s*호수|퇴수\s*호수|배수\s*호수|오수\s*호수/gi,
    replacement: '드레인 호스',
    category: '호스/배관'
  },
  {
    pattern: /흡입\s*호수|석션\s*호수|자바라\s*호수/gi,
    replacement: '흡입 호스',
    category: '호스/배관'
  },
  {
    pattern: /밧데리|빠떼리|바떼리|배떠리|밧때리/gi,
    replacement: '배터리',
    category: '전원/배터리'
  },
  {
    pattern: /물이\s*안\s*나서/gi,
    replacement: '물이 안 나와서',
    category: '급수계통'
  },
  // [L] 부정 상태 서술어 구어체/오타 표준화 (부셔짐/뿌셔짐 ➔ 부서짐, 뿌러짐 ➔ 부러짐, 안됌 ➔ 안됨 등)
  {
    pattern: /(?:부셔|뿌셔)(?:짐|졌(?:어요|어|네|습니다)?|져(?:요|서)?)/gi,
    replacement: '부서짐',
    category: '상태서술어'
  },
  {
    pattern: /뿌러(?:짐|졌(?:어요|어|네|습니다)?|져(?:요|서)?)/gi,
    replacement: '부러짐',
    category: '상태서술어'
  },
  {
    pattern: /안\s*됌|안\s*됀다/gi,
    replacement: '안됨',
    category: '상태서술어'
  },
  {
    pattern: /(?:뽀혔|뽀힘|뽑훴)(?:어요|어|네|습니다)?/gi,
    replacement: '뽑힘',
    category: '상태서술어'
  },
  // [M] 전화번호 음성 발화 치환 (예: "공일공 구팔칠육에 오사삼이", "010 9876 5432" -> "010-9876-5432")
  {
    pattern: new RegExp(
      `(?:공\\s*일\\s*공|영\\s*일\\s*공|0\\s*1\\s*0)(?:\\s*에|\\s*의|\\s*-)?\\s*` +
      `(${DIGIT_TOKEN_PATTERN})\\s*(${DIGIT_TOKEN_PATTERN})\\s*(${DIGIT_TOKEN_PATTERN})\\s*(${DIGIT_TOKEN_PATTERN}?)(?:\\s*에|\\s*의|\\s*-)?\\s*` +
      `(${DIGIT_TOKEN_PATTERN})\\s*(${DIGIT_TOKEN_PATTERN})\\s*(${DIGIT_TOKEN_PATTERN})\\s*(${DIGIT_TOKEN_PATTERN})`,
      'gi'
    ),
    replacement: (_m: string, a1: string, a2: string, a3: string, a4: string, b1: string, b2: string, b3: string, b4: string) => {
      const mid = [a1, a2, a3, a4].filter(Boolean).map(x => KOREAN_DIGIT_MAP[x] ?? x).join('');
      const last = [b1, b2, b3, b4].filter(Boolean).map(x => KOREAN_DIGIT_MAP[x] ?? x).join('');
      return `010-${mid}-${last}`;
    },
    category: '전화번호'
  },
  // [N] 건물 층수·동·호수 음성 발화 치환 (예: "지하 일층" -> "지하 1층", "백일동" -> "101동")
  {
    pattern: /지하\s*(일|하나|이|둘|삼|셋|사|넷|오|다섯)\s*층/gi,
    replacement: (_m: string, d: string) => `지하 ${KOREAN_DIGIT_MAP[d] ?? d}층`,
    category: '주소/위치'
  },
  {
    pattern: /(?<![가-힣0-9])(일|이|삼|사|오|육|칠|팔|구)\s*층/gi,
    replacement: (_m: string, d: string) => `${KOREAN_DIGIT_MAP[d] ?? d}층`,
    category: '주소/위치'
  },
  {
    pattern: /(?:백\s*일|일\s*공\s*일)\s*동/gi,
    replacement: '101동',
    category: '주소/위치'
  },
  {
    pattern: /(?:백\s*이|일\s*공\s*이)\s*동/gi,
    replacement: '102동',
    category: '주소/위치'
  },
  {
    pattern: /(?:백\s*삼|일\s*공\s*삼)\s*동/gi,
    replacement: '103동',
    category: '주소/위치'
  }
];

// ── 3. 한국어 자모 분해(초·중·종성) 및 음운 유사도 퍼지 매칭 엔진 ──────────────────
const CHO = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
const JUNG = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
const JONG = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];

// 발음상 혼동하기 쉬운 자모 그룹 (교체 비용 0.25로 감경)
const PHONETIC_SIMILAR_GROUPS: string[][] = [
  ['ㅐ', 'ㅔ', 'ㅒ', 'ㅖ'],
  ['ㅗ', 'ㅜ', 'ㅛ', 'ㅠ'],
  ['ㅓ', 'ㅡ', 'ㅗ'],
  ['ㅣ', 'ㅟ', 'ㅢ', 'ㅡ'],
  ['ㅘ', 'ㅝ', 'ㅙ', 'ㅞ', 'ㅚ'],
  ['ㄱ', 'ㅋ', 'ㄲ'],
  ['ㄷ', 'ㅌ', 'ㄸ'],
  ['ㅂ', 'ㅍ', 'ㅃ'],
  ['ㅅ', 'ㅆ', 'ㅈ', 'ㅊ'],
  ['ㄴ', 'ㄹ', 'ㅇ'],
];

function areJamoPhoneticSimilar(a: string, b: string): boolean {
  if (a === b) return true;
  return PHONETIC_SIMILAR_GROUPS.some(g => g.includes(a) && g.includes(b));
}

export function decomposeHangulToJamo(str: string): string[] {
  const result: string[] = [];
  const clean = str.replace(/\s+/g, '').toLowerCase();
  for (let i = 0; i < clean.length; i++) {
    const code = clean.charCodeAt(i);
    if (code >= 0xac00 && code <= 0xd7a3) {
      const offset = code - 0xac00;
      const cho = Math.floor(offset / 588);
      const jung = Math.floor((offset % 588) / 28);
      const jong = offset % 28;
      result.push(CHO[cho], JUNG[jung]);
      if (JONG[jong]) result.push(JONG[jong]);
    } else {
      result.push(clean[i]);
    }
  }
  return result;
}

/**
 * 두 문자열의 한국어 자모 기반 음운 가중 유사도 (0.0 ~ 1.0)
 * - 예: "솔노이드" vs "솔레노이드" -> 0.84
 * - 예: "솔리노이드" vs "솔레노이드" -> 0.93
 * - 예: "스끼즈" vs "스퀴지" -> 0.86
 */
export function computeJamoSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const ja = decomposeHangulToJamo(a);
  const jb = decomposeHangulToJamo(b);
  const m = ja.length;
  const n = jb.length;
  if (m === 0 || n === 0) return 0;

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const subCost = ja[i - 1] === jb[j - 1] ? 0 : areJamoPhoneticSimilar(ja[i - 1], jb[j - 1]) ? 0.25 : 1.0;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 0.85,     // 탈락 (예: 솔레노이드 -> 솔노이드)
        dp[i][j - 1] + 0.85,     // 첨가
        dp[i - 1][j - 1] + subCost
      );
    }
  }

  const maxLen = Math.max(m, n);
  return Math.max(0, 1 - dp[m][n] / maxLen);
}

// 퍼지 자동 교정 대상 표준 도메인 어휘 사전
const CANONICAL_DOMAIN_TERMS: { term: string; category: string; minSyllables: number; threshold: number }[] = [
  { term: '솔레노이드', category: '급수/솔레노이드', minSyllables: 3, threshold: 0.74 },
  { term: '스퀴지', category: '소모품/스퀴지', minSyllables: 3, threshold: 0.76 },
  { term: '액추에이터', category: '승강/리프트', minSyllables: 4, threshold: 0.75 },
  { term: '플로트밸브', category: '센서/만수', minSyllables: 4, threshold: 0.76 },
  { term: '패드드라이버', category: '브러시계통', minSyllables: 4, threshold: 0.76 },
  { term: '서킷브레이커', category: '전원/차단기', minSyllables: 4, threshold: 0.76 },
  { term: '트랜스액슬', category: '주행/구동', minSyllables: 4, threshold: 0.76 },
  { term: '포텐셔미터', category: '주행/속도', minSyllables: 4, threshold: 0.76 },
  { term: '앤더슨커넥터', category: '전원/단자', minSyllables: 4, threshold: 0.76 },
  { term: '비상정지', category: '전원/스위치', minSyllables: 4, threshold: 0.82 },
];

// 어절 끝 조사 분리 정규식
const KOREAN_PARTICLE_REGEX = /^([가-힣]{3,7}?)(이|가|은|는|을|를|에|에서|으로|로|도|만|과|와|이나|나|부터|까지|요|네요|군요|인가요|인데|인데요|이라서|라서)?$/;

// 자모 퍼지 교정에서 제외할 정상 표준 어간 목록 (예: '스위치'가 '스퀴지'로 오교정되는 현상 원천 차단)
const PROTECTED_EXACT_STEMS = new Set([
  '스위치', '키스위치', '전원스위치', '급수스위치', '메인스위치',
  '스페이스', '서비스', '사이즈', '시리즈', '스펀지', '스탠드', '스피커', '스튜디오'
]);

export function applyContextualCorrection(rawText: string): { correctedText: string; corrections: CorrectionEvent[] } {
  if (!rawText) return { correctedText: '', corrections: [] };
  let text = rawText;
  const corrections: CorrectionEvent[] = [];
  const nowStr = () => new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // Pass 1 & 2: 정규식 기반 장비 모델명 / 에러코드 / 오발음 사전 치환
  for (const rule of DOMAIN_CORRECTION_RULES) {
    const flags = rule.pattern.flags.includes('g') ? rule.pattern.flags : rule.pattern.flags + 'g';
    const rx = new RegExp(rule.pattern.source, flags);

    text = text.replace(rx, (...args) => {
      const matched = args[0] as string;
      const replaced =
        typeof rule.replacement === 'function'
          ? rule.replacement(matched, ...args.slice(1))
          : rule.replacement;

      if (matched !== replaced && !corrections.some(c => c.original === matched && c.corrected === replaced)) {
        corrections.push({
          original: matched,
          corrected: replaced,
          category: rule.category,
          timestamp: nowStr()
        });
      }
      return replaced;
    });
  }

  // Pass 3: 어절 단위 자모 음운 퍼지 유사도 보정 (정규식에 미등록된 유사 오발음 포착)
  const tokens = text.split(/(\s+)/);
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (!tok || /^\s+$/.test(tok)) continue;

    const m = tok.match(KOREAN_PARTICLE_REGEX);
    if (!m) continue;
    const stem = m[1];
    const particle = m[2] || '';
    if (stem.length < 3) continue;

    // 이미 표준 용어이거나 보호 대상 정상 단어('스위치' 등)이면 스킵
    if (PROTECTED_EXACT_STEMS.has(stem) || CANONICAL_DOMAIN_TERMS.some(d => d.term === stem)) continue;

    const stemJamo = decomposeHangulToJamo(stem);
    if (stemJamo.length === 0) continue;

    let bestMatch: { term: string; category: string; sim: number } | null = null;
    for (const cand of CANONICAL_DOMAIN_TERMS) {
      if (stem.length < cand.minSyllables) continue;
      const candJamo = decomposeHangulToJamo(cand.term);
      // 첫 초성이 발음상 유사해야 오탐(일반 단어 치환)을 방지
      if (!areJamoPhoneticSimilar(stemJamo[0], candJamo[0])) continue;

      const sim = computeJamoSimilarity(stem, cand.term);
      if (sim >= cand.threshold && (!bestMatch || sim > bestMatch.sim)) {
        bestMatch = { term: cand.term, category: cand.category, sim };
      }
    }

    if (bestMatch && bestMatch.term !== stem) {
      tokens[i] = `${bestMatch.term}${particle}`;
      if (!corrections.some(c => c.original === stem && c.corrected === bestMatch!.term)) {
        corrections.push({
          original: stem,
          corrected: bestMatch.term,
          category: `${bestMatch.category} (음운유사도 ${Math.round(bestMatch.sim * 100)}%)`,
          timestamp: nowStr()
        });
      }
    }
  }

  return { correctedText: tokens.join(''), corrections };
}
