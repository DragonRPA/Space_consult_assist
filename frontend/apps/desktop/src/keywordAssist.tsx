import React from 'react';
import type { CustomerInfo } from './store';
import { computeJamoSimilarity } from './contextCorrector';

export type EntityType = 'symptom' | 'customer' | 'site' | 'model' | 'action';

export interface KeywordEntity {
  id: string;
  canonicalId?: string;
  keyword: string;
  synonyms: RegExp;
  fuzzyPhrases?: string[];
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

// ── 1. 전사 16대 표준 장애 유형 + DB 5,200건 구어체 통합 정규식 마스터 ─────────────
export const DOMAIN_KEYWORD_REGISTRY: KeywordEntity[] = [
  // [1] 세척수 미분사 / 솔레노이드 밸브 (WTR_SPRAY_FAIL)
  {
    id: 'kw-solenoid',
    canonicalId: 'WTR_SPRAY_FAIL',
    keyword: '솔레노이드 밸브 / 급수 불량',
    synonyms: /솔레노이드|솔리노이드|솔노이드|소레노이드|솔래노이드|솔밸브|급수\s*밸브|전자\s*밸브|노즐\s*막힘|분사구\s*막힘|세척수\s*미분사|(?:물|세제|청수|세수|액)[이가은는을를]?\s*(?:아예\s*|전혀\s*|하나도\s*|잘\s*|계속\s*)?(?:안|못)\s*(?:나와|나오|나옴|뿌려|뿌리|내려|떨어|공급)|(?:안|못)\s*(?:나와|나오|뿌려).{0,8}(?:물|세제|청수)|브러시.{0,8}물.{0,8}(?:안|못)|필터\s*열어서|필터가?\s*막혀|세수\s*필터/i,
    fuzzyPhrases: ['솔레노이드밸브', '물이안나와요', '물안나옴', '세척수미분사', '급수밸브불량', '청수안나옴', '노즐막힘'],
    category: 'WATER / 급수·솔레노이드',
    partCode: 'SOLENOID-VALVE-24V',
    partName: '전자식 급수 솔레노이드 밸브 24V',
    stock: 22,
    confidence: 97,
    checklist: [
      '세수탱크(청수통) 하단 거름망 필터 열어서 물 토출 여부 확인',
      '필터 이후 브러시 측 미출수 시 솔레노이드 밸브 코일/전원 점검',
      '급수 레버/스위치 작동 시 밸브 개폐 작동음(딸깍) 확인',
      '솔레노이드 밸브 고착 판정 시 현장 방문 교체 배차 접수'
    ],
    selfActionGuide: '하단 청수 필터를 열었을 때 물이 나오는데 브러시 쪽으로만 안 나온다면 솔레노이드 밸브 또는 전력 공급 문제입니다. 현장 방문 점검을 안내하세요.'
  },

  // [2] 세척수 누수 / 밸브 덜 닫힘 (WTR_LEAK)
  {
    id: 'kw-water-leak',
    canonicalId: 'WTR_LEAK',
    keyword: '세척수 누수 / 호스·밸브 물샘',
    synonyms: /누수|물\s*샘|물이?\s*새|물이?\s*샜|물이?\s*줄줄|물이?\s*뚝뚝|(?:꺼놨|껐|정지|가만히).{0,12}물.{0,8}(?:나와|새|흘러)|(?:밑|바닥|호스|배관|이음새|통).{0,10}물[이가]?\s*(?:새|흘러|떨어져|고여)|호스\s*피팅\s*누수|밸브\s*닫힘\s*불량/i,
    fuzzyPhrases: ['세척수누수', '물이계속새요', '바닥에물이새요', '호스물샘', '밸브누수'],
    category: 'WATER / 배관·누수계통',
    partCode: 'WATER-HOSE-FITTING',
    partName: '솔레노이드 시트 및 급수 호스 피팅 어셈블리',
    stock: 28,
    confidence: 95,
    checklist: [
      '세수 밸브 최대(OPEN) 개방 후 10초간 플러싱하여 시트 이물질 배출',
      '전원 OFF 상태에서도 물이 계속 새는지 솔레노이드 차단 여부 확인',
      '세수탱크 하부 호스 클램프 및 엘보 피팅 균열 육안 점검',
      '플러싱 후에도 지속 누수 시 밸브/피팅 교체 배차 접수'
    ],
    selfActionGuide: '전원을 꺼도 물이 계속 뚝뚝 떨어진다면 솔레노이드 밸브 고무 시트에 모래알이 끼었거나 피팅 유격입니다. 밸브를 최대로 열어 이물질을 흘려보내도록 안내하세요.'
  },

  // [3] 바닥 잔수 과다 / 스퀴지 마모 (SUC_RESIDUAL_WATER & SUC_SQUEEGEE_STRIPE)
  {
    id: 'kw-squeegee',
    canonicalId: 'SUC_RESIDUAL_WATER',
    keyword: '스퀴지 마모 / 바닥 잔수·줄무늬',
    synonyms: /스퀴지|스퀴즈|스키지|스끼지|와이퍼|바닥\s*물기|잔수|줄무늬|고무\s*블레이드|고무\s*날|고무날|뒷\s*고무|뒤에\s*고무|물\s*자국|고무\s*패드|패드\s*거치대|고정판|판\s*거치대|(?:물|물기|바닥|오수)[이가은는을를]?\s*(?:잘\s*|제대로\s*|전혀\s*|하나도\s*)?(?:안|못)\s*(?:빨아|먹어|끌어|건조|마르|올라오|올라와)|(?:물|물기|자국)[이가]?\s*(?:남아|남네|흥건|그대로|질질|줄줄)|빨아들이지\s*못|중간\s*부분|양쪽\s*끝.*달라붙|편마모|고무.{0,8}(?:닳|찢어|갈라|들떠)/i,
    fuzzyPhrases: ['바닥잔수과다', '스퀴지마모', '물이안빨려요', '바닥에물기가남아요', '고무날찢어짐', '줄무늬잔수'],
    category: 'WEARABLE / 스퀴지·소모품',
    partCode: 'SQUEEGEE-RUBBER',
    partName: '내유성 우레탄 스퀴지 블레이드 세트',
    stock: 35,
    confidence: 96,
    checklist: [
      '스퀴지 고무날 마모 상태 및 찢어짐·이물질 끼임 육안 확인',
      '스퀴지 블레이드 4면 뒤집기(재사용) 가능 여부 안내',
      '스퀴지 브라켓 수평 조절 노브(45도 각도) 및 지지 휠 볼트 장력 점검',
      '폐수 흡입 호스 꺾임 및 연결 조인트 기밀 확인'
    ],
    selfActionGuide: '스퀴지 고무 블레이드는 4면을 돌려가며 쓸 수 있습니다. 날을 반대로 뒤집어 끼우거나 브라켓 수평 조절 노브를 조정하도록 유도하세요.'
  },

  // [4] 흡입모터 과열 / 흡입력 저하·이상 소음 (SUC_MOTOR_NOISE)
  {
    id: 'kw-suction',
    canonicalId: 'SUC_MOTOR_NOISE',
    keyword: '흡입모터 과열 / 흡입력 저하·소음',
    synonyms: /흡입\s*모터|흡입\s*모타|석션\s*모터|바큠\s*모터|진공\s*모터|흡입력|흡입\s*부분|흡입이?\s*(?:약|안|떨어|불량|문제)|진공압\s*저하|모터\s*굉음|모터\s*과열|모터.{0,8}(?:소리|소음|냄새|연기|뜨거|멈춰|안\s*돌)|타는\s*냄새|탄\s*냄새|탄내|쇠\s*갈리는\s*소리|비명\s*소리|소음\s*발생|소리가?\s*크게/i,
    fuzzyPhrases: ['흡입모터과열', '흡입력저하', '흡입불량', '모터소음발생', '모터에서타는냄새'],
    category: 'POWER / 흡입·구동계통',
    partCode: 'SUCTION-500W',
    partName: '흡입모터 24V 500W 어셈블리',
    stock: 14,
    confidence: 98,
    checklist: [
      '전원 스위치 즉시 차단 및 모터 하우징 열기 냉각 안내',
      '폐수탱크 거품 유입 여부 확인 및 소포제(Anti-Foam) 투입 안내',
      '폐수탱크 플로트 밸브(만수 차단기) 오작동/이물질 확인',
      '흡입 호스 끝단 손바닥 진공 부압 테스트로 모터 흡착력 점검',
      '증상 지속 시 1차 셀프조치 중단 및 현장 정밀점검 배차'
    ],
    selfActionGuide: '전원을 끄고 폐수탱크 거름망 이물질 및 거품 유입 여부, 흡입 호스 기밀 상태를 먼저 점검하도록 안내하세요.'
  },

  // [5] 오수탱크 조기 차단 / 만수 부표·센서 오작동 (SUC_FLOAT_EARLY_STOP)
  {
    id: 'kw-float-sensor',
    canonicalId: 'SUC_FLOAT_EARLY_STOP',
    keyword: '오수탱크 조기 차단 / 플로트 밸브(부표)',
    synonyms: /플로트\s*밸브|플로트\s*볼|부표|만수\s*센서|만수\s*경보|만수\s*차단|(?:오수|폐수|물통).{0,10}(?:비었|안\s*찼|조금\s*찼).{0,10}(?:차단|멈춰|꺼져|안\s*빨)|거품.{0,8}(?:차단|넘쳐|가득)|소포제/i,
    fuzzyPhrases: ['만수센서오작동', '플로트밸브고착', '오수탱크조기차단', '부표일찍올라옴'],
    category: 'SENSOR / 오수탱크·만수차단',
    partCode: 'FLOAT-VALVE-ASSY',
    partName: '오수탱크 플로트 밸브(부표 케이지) 어셈블리',
    stock: 18,
    confidence: 94,
    checklist: [
      '오수탱크 뚜껑 개방 후 내부 부표(플로트) 케이지 이물질 고착 확인',
      '손으로 부표를 위아래로 흔들어 원활하게 내려오는지 유동 점검',
      '고기포 세제 거품으로 인한 조기 상승 시 소포제 투입 안내',
      '부표 정상 위치에도 만수 경보 지속 시 수위 센서 교체 접수'
    ],
    selfActionGuide: '오수탱크가 차지 않았는데도 흡입이 막힌다면 뚜껑 안쪽 부표(플로트볼) 망에 찌꺼기가 끼어 부표가 위에 붙어 있는지 흔들어 보도록 안내하세요.'
  },

  // [6] 배터리 조기 방전 / 수명 열화 (PWR_BAT_DEGRADE)
  {
    id: 'kw-battery-degrade',
    canonicalId: 'PWR_BAT_DEGRADE',
    keyword: '배터리 조기 방전 / 사용시간 급감',
    synonyms: /조기\s*방전|배터리\s*방전|금방\s*방전|빨리\s*방전|배터리\s*수명|배터리\s*교체|(?:완충|충전).{0,12}(?:금방|빨리|10분|15분|20분|30분|얼마\s*못|조금\s*쓰면).{0,10}(?:꺼져|방전|닳아|떨어져|줄어)|사용\s*시간.{0,8}(?:짧|줄어|부족)|증류수\s*보충/i,
    fuzzyPhrases: ['배터리조기방전', '배터리방전', '배터리수명저하', '충전해도금방꺼짐', '사용시간급감'],
    category: 'ELECTRICAL / 배터리·수명열화',
    partCode: 'BATTERY-24V-105AH',
    partName: '딥사이클 산업용 배터리 24V 105AH',
    stock: 12,
    confidence: 96,
    checklist: [
      '전용 충전기로 8시간 이상 완전 충전 사이클 수행 여부 확인',
      '액식(납산) 배터리 모델의 경우 완충 직후 증류수 극판 수위 점검',
      '배터리 단자 점퍼 케이블 체결 너트 풀림 및 백화(황산염) 부식 확인',
      '완충 후 20~30분 내 전압 급락 지속 시 배터리 팩 신품 교체 배차'
    ],
    selfActionGuide: '완충 후에도 20~30분 만에 전원이 꺼진다면 액식 배터리는 완충 직후 증류수 수위를 먼저 확인하게 하시고, 극판 수명 도달 시 배터리 팩 교체를 안내하세요.'
  },

  // [7] 배터리 충전 불가 / 충전기 불량 (PWR_CHG_FAIL)
  {
    id: 'kw-battery',
    canonicalId: 'PWR_CHG_FAIL',
    keyword: '배터리 충전 불량 / 충전기 이상',
    synonyms: /배터리\s*충전|충전\s*불량|충전\s*불가|충전\s*문제|충전이?\s*안|충전기\s*고장|충전기.{0,10}(?:안\s*들어|깜빡|점멸|빨간\s*불|적색|소리|에러)|충전.{0,8}(?:안\s*돼|안\s*되|안\s*됨|중단|멈춰)|배터리\s*문제|220\s*볼트|220V|콘센트/i,
    fuzzyPhrases: ['배터리충전불량', '충전안됨', '충전기고장', '충전문제', '배터리문제'],
    category: 'ELECTRICAL / 충전기·전원계통',
    partCode: 'CHARGER-UNIT-24V',
    partName: '전용 스마트 충전기 24V 어셈블리',
    stock: 9,
    confidence: 95,
    checklist: [
      '장비 키 스위치 OFF 상태에서 충전 플러그 딸깍 소리까지 재체결 확인',
      '벽면 220V 콘센트에 다른 기기를 꽂아 현장 분전반 통전 여부 확인',
      '충전기 표시등 에러(적색 점멸/미점등) 및 플러그 내부 핀 소손 점검',
      '충전기 본체 불량 판정 시 택배 발송 또는 현장 교체 배차'
    ],
    selfActionGuide: '장비 키를 끄고 충전 잭을 끝까지 다시 밀어 넣은 뒤, 벽면 220V 콘센트 전원과 충전기 LED 색상(적색 점멸 여부)을 먼저 확인하세요.'
  },

  // [8] 전원 완전 인입 불가 / 작동 먹통 (PWR_TOTAL_DEAD)
  {
    id: 'kw-power-dead',
    canonicalId: 'PWR_TOTAL_DEAD',
    keyword: '전원 완전 인입 불가 / 계기판 먹통',
    synonyms: /전원\s*불량|전원이?\s*안\s*켜|전원\s*먹통|계기판\s*먹통|시동이?\s*안\s*걸|아예\s*안\s*켜|묵묵부답|(?:키|스위치|전원|계기판|불)[이가은는을를]?\s*(?:돌려도|켜도|눌러도)?\s*(?:전혀\s*|아예\s*|하나도\s*)?(?:안\s*들어|안\s*켜|안\s*와|반응\s*없|먹통|꺼져)|비상\s*정지\s*버튼|작동\s*멈춤/i,
    fuzzyPhrases: ['전원안켜짐', '전원완전인입불가', '계기판먹통', '시동안걸림', '아예작동안함'],
    category: 'ELECTRICAL / 메인전원·비상정지',
    partCode: 'MAIN-POWER-RELAY',
    partName: '메인 전원 릴레이 및 키 스위치 어셈블리',
    stock: 15,
    confidence: 97,
    checklist: [
      '조작부 적색 버섯형 비상정지 버튼을 시계 방향 1/4바퀴 돌려 해제 확인',
      '오수탱크 틸팅 후 배터리룸 대형 앤더슨 커넥터 분리·재결속 안내',
      '충전기 코드가 장비에 꽂혀 있는지 확인(충전 인터록 해제)',
      '재체결 후에도 계기판 무반응 시 메인 퓨즈/키스위치 교체 출장 접수'
    ],
    selfActionGuide: '계기판에 불이 전혀 안 들어온다면 가장 먼저 빨간색 비상정지 버튼이 눌려 있는지 시계 방향으로 돌려 튀어나오게 하고, 배터리 앤더슨 잭을 재체결하도록 안내하세요.'
  },

  // [9] 충전 단자 접촉 불량 / 게이지 튐 (PWR_TERMINAL_LOOSE)
  {
    id: 'kw-terminal-loose',
    canonicalId: 'PWR_TERMINAL_LOOSE',
    keyword: '충전 단자 접촉 불량 / 잔량 표시 오류',
    synonyms: /앤더슨\s*커넥터|단자\s*접촉|충전\s*단자|충전\s*잭|커넥터\s*헐거|단자\s*유격|(?:잔량|게이지|배터리\s*칸)[이가]?\s*(?:튀어|튐|왔다\s*갔다|깜빡|오류|안\s*맞)/i,
    fuzzyPhrases: ['충전단자접촉불량', '앤더슨커넥터파손', '배터리게이지오류', '단자헐거움'],
    category: 'ELECTRICAL / 단자·커넥터',
    partCode: 'ANDERSON-CONNECTOR',
    partName: '앤더슨 파워 커넥터 50A/120A 하우징 세트',
    stock: 30,
    confidence: 93,
    checklist: [
      '앤더슨 커넥터 내부 금속 단자 핀이 뒤로 밀렸거나 벌어졌는지 확인',
      '커넥터 플라스틱 하우징 균열 및 케이블 압착부 발열 흔적 점검',
      '하우징 파손 시 규격(50A/120A/175A) 확인 후 부품 출고'
    ],
    selfActionGuide: '충전 잭이 헐겁거나 잔량 게이지가 튄다면 앤더슨 커넥터 내부의 금속 핀이 뒤로 밀리지 않았는지 확인하도록 안내하세요.'
  },

  // [10] 브러시 모터 회전 불가 / 과부하 차단 (DRV_BRUSH_STALL)
  {
    id: 'kw-brush-stall',
    canonicalId: 'DRV_BRUSH_STALL',
    keyword: '브러시 회전 불가 / 과부하 차단기 트립',
    synonyms: /브러시\s*모터|브러시\s*회전|브러시\s*미회전|(?:브러시|솔|패드|밑에\s*판)[이가은는]?\s*(?:전혀\s*|아예\s*|잘\s*)?(?:안\s*돌|못\s*돌|멈춰|헛돌|안\s*돌아)|(?:안\s*돌아|안\s*돌고|멈췄).{0,8}(?:브러시|솔|패드)|서킷\s*브레이커|과부하\s*차단|퓨즈함/i,
    fuzzyPhrases: ['브러시모터회전불가', '브러시안돌아감', '솔이안돌아요', '브러시과부하차단'],
    category: 'DRIVE / 브러시구동·차단기',
    partCode: 'BRUSH-MOTOR-ASSY',
    partName: '브러시 구동 기어드 모터 어셈블리',
    stock: 11,
    confidence: 96,
    checklist: [
      '하부 퓨즈함 또는 시트 하단 튀어나온 서킷브레이커(차단기) 버튼 푸시 리셋',
      '브러시 탈거 후 모터 회전축에 감긴 노끈·비닐·철사 등 이물질 제거',
      '이물질 제거 후 손으로 커플러 회전 시 고착 여부 확인',
      '차단기 반복 트립 또는 감속기 고착 시 브러시 모터 교체 배차'
    ],
    selfActionGuide: '브러시가 돌지 않는다면 먼저 튀어나온 과부하 차단기(서킷브레이커) 버튼을 눌러 리셋하고, 브러시 축에 노끈이나 비닐이 감기지 않았는지 확인하세요.'
  },

  // [11] 브러시·패드판 체결 / 노브·볼트 이상 (DRV_PAD_HOLDER)
  {
    id: 'kw-brush-deck',
    canonicalId: 'DRV_PAD_HOLDER',
    keyword: '브러시·패드판 체결 / 노브·볼트 이상',
    synonyms: /패드\s*드라이버|패드판|페드판|브러시\s*장착|브러시\s*탈착|데크|노브|볼트\s*(?:조정|풀림|부재)|녹이?\s*슬|녹\s*발생|(?:브러시|패드판?)[이가은는을를]?\s*(?:빠져|떨어져|안\s*끼워|안\s*맞|흔들|덜덜)/i,
    fuzzyPhrases: ['패드드라이버파손', '패드판체결불량', '브러시노브파손', '데크볼트풀림'],
    category: 'DECK / 브러시·데크계통',
    partCode: 'PAD-DRIVER-19',
    partName: '패드 드라이버 및 데크 고정 노브 어셈블리',
    stock: 19,
    confidence: 94,
    checklist: [
      '데크 상단 고정 노브 2개 체결 상태 및 유격 확인',
      '브러시/패드판 중심 홀(삼발이 클러치) 정렬 후 회전 체결 안내',
      '부식 또는 볼트 망실 시 사진/영상 통화로 규격 확인 후 부품 발송'
    ],
    selfActionGuide: '데크 위 홀에 노브 2개를 맞추어 끼우고 볼트 방향을 안쪽으로 조정하여 수평을 맞추도록 안내하세요.'
  },

  // [12] 주행 구동 불가 / 전후진 먹통·쏠림 (DRV_WHEEL_DRIVE)
  {
    id: 'kw-wheel-drive',
    canonicalId: 'DRV_WHEEL_DRIVE',
    keyword: '주행 구동 불가 / 전후진 먹통·쏠림',
    synonyms: /주행\s*불가|주행\s*불량|구동\s*불량|트랜스액슬|포텐셔미터|전후진|직진\s*쏠림|(?:앞으로|뒤로|전진|후진|바퀴|주행|장비)[이가은는도]?\s*(?:전혀\s*|아예\s*|잘\s*)?(?:안\s*가|안\s*나|안\s*되|안\s*움직|멈춰|안\s*굴러|헛돌|먹통|뻑뻑)|한쪽으로\s*쏠림/i,
    fuzzyPhrases: ['주행구동불가', '앞으로안가요', '전진후진불량', '바퀴가안움직여요', '주행불량'],
    category: 'DRIVE / 주행·트랜스액슬',
    partCode: 'TRANSAXLE-DRIVE-WHEEL',
    partName: '주행 트랜스액슬 구동 모터 및 전자브레이크',
    stock: 7,
    confidence: 96,
    checklist: [
      '하부 구동 모터 뒤쪽 전자 브레이크 수동 해제 레버(견인 모드) 위치 점검',
      '속도 조절 다이얼(포텐셔미터) 최소값 여부 및 전후진 스위치 접점 확인',
      '레버 정상 위치에도 주행 불능 시 트랜스액슬/컨트롤러 점검 배차 접수'
    ],
    selfActionGuide: '전원은 켜졌는데 전/후진이 안 된다면 하부 구동바퀴 쪽 수동 견인 레버(브레이크 해제 레버)가 풀려 있는지 주행 위치로 잠그도록 안내하세요.'
  },

  // [13] 구동 벨트 슬립 / 끼익 마찰 소음 (DRV_BELT_SLIP)
  {
    id: 'kw-belt-slip',
    canonicalId: 'DRV_BELT_SLIP',
    keyword: '구동 벨트 슬립 / 마찰 소음·장력 저하',
    synonyms: /벨트\s*슬립|타이밍\s*벨트|벨트\s*마모|벨트\s*늘어짐|벨트\s*끊어짐|끼익\s*(?:소리|소음)|고무\s*마찰음|회전력\s*저하/i,
    fuzzyPhrases: ['구동벨트슬립', '벨트끊어짐', '끼익소리발생', '벨트장력불량'],
    category: 'DRIVE / 벨트·전동계통',
    partCode: 'TIMING-BELT',
    partName: '고장력 폴리우레탄 타이밍 벨트',
    stock: 24,
    confidence: 92,
    checklist: [
      '구동 시 끼익거리는 마찰음 및 고무 가루 발생 여부 확인',
      '모터 측면 텐셔너 볼트 장력 및 벨트 톱니 마모/절단 점검',
      '벨트 절단 또는 장력 한계 도달 시 규격 타이밍 벨트 교체 출고'
    ],
    selfActionGuide: '끼익거리는 마찰음과 함께 회전력이 떨어진다면 구동 벨트 장력 저하 또는 마모 상태이므로 텐셔너 점검 및 벨트 교체를 안내하세요.'
  },

  // [14] 브러시·스퀴지 승강 작동 불가 (DRV_LIFT_FAIL)
  {
    id: 'kw-lift-fail',
    canonicalId: 'DRV_LIFT_FAIL',
    keyword: '브러시·스퀴지 승강 불량 / 리프트·액추에이터',
    synonyms: /액추에이터|승강\s*불량|승강\s*장치|리프트\s*불량|(?:브러시|스퀴지|헤드|데크|페달|레버)[이가은는을를]?\s*(?:안\s*내려|안\s*올라|고착|안\s*움직|들려\s*있|안\s*떨어져)|내려가지\s*않|올라가지\s*않/i,
    fuzzyPhrases: ['브러시승강불량', '액추에이터고장', '브러시안내려감', '리프트모터불량'],
    category: 'DRIVE / 승강·액추에이터',
    partCode: 'LIFT-ACTUATOR',
    partName: '전동 리프트 액추에이터 / 승강 페달 링크',
    stock: 10,
    confidence: 94,
    checklist: [
      '기계식 발 페달 모델은 페달을 살짝 밟고 옆으로 비틀어 잠금 홈 해제 확인',
      '전동식 모델은 승강 작동 시 액추에이터 모터 작동음 유무 점검',
      '와이어 끊어짐 또는 액추에이터 고착 시 부품 교체 출장 접수'
    ],
    selfActionGuide: '브러시나 스퀴지가 내려가지 않는다면 기계식 페달 걸림 홈을 확인하거나 전동 리프트 액추에이터 작동음 유무를 확인하세요.'
  },

  // [15] 계기판 에러 코드 점멸 / 경고음 (EXT_ERROR_CODE)
  {
    id: 'kw-error-code',
    canonicalId: 'EXT_ERROR_CODE',
    keyword: '계기판 에러코드 점멸 / 경고음 (E01~E91)',
    synonyms: /\b(?:E0[1-9]|E1[0-9]|E2[0-9]|E91|F0[1-4]|EH|EL|Err)\b|에러\s*코드|오류\s*코드|경고음|경보음|부저음|삐삐\s*소리|(?:계기판|화면|창).{0,10}(?:에러|코드|깜빡|점멸|숫자|영문)/i,
    fuzzyPhrases: ['계기판에러코드', '경고음울림', '에러코드점멸', '삐삐소리남'],
    category: 'CONTROLLER / 에러코드·PCB',
    partCode: 'MAIN-CONTROLLER-PCB',
    partName: '메인 컨트롤러 PCB 보드 어셈블리',
    stock: 6,
    confidence: 98,
    checklist: [
      '계기판에 표시된 정확한 영문/숫자 에러코드(예: E01, E03, EH 등) 확인',
      '키 스위치를 끄고 비상정지 버튼을 누른 뒤 30초 후 재기동(소프트 리셋)',
      '재기동 후에도 동일 에러코드 점멸 시 모델별 에러코드 원인 부품 조치'
    ],
    selfActionGuide: '계기판에 뜨는 알파벳과 숫자(예: E01, E03, F01)를 먼저 확인하고, 키를 껐다가 30초 뒤 재시동해도 동일한 코드가 뜨는지 점검하세요.'
  },

  // [16] 외장 부품·호스·스위치 파손 (EXT_CHASSIS_DAMAGE)
  {
    id: 'kw-chassis-damage',
    canonicalId: 'EXT_CHASSIS_DAMAGE',
    keyword: '외장 커버·레버·호스 파손',
    synonyms: /외장\s*파손|커버\s*파손|범퍼\s*파손|핸들\s*파손|레버\s*부러|스위치\s*깨짐|호스\s*찢어|호스\s*터짐|호스\s*막힘|드레인\s*호스|흡입\s*호스|(?:뚜껑|커버|레버|손잡이|바퀴|호스)[이가은는]?\s*(?:깨졌|부러졌|파손|찢어졌|빠졌)/i,
    fuzzyPhrases: ['외장부품파손', '레버부러짐', '흡입호스찢어짐', '드레인호스파손', '호스막힘'],
    category: 'CHASSIS / 외장·호스·레버',
    partCode: 'CHASSIS-PARTS',
    partName: '외장 커버·레버 및 흡입/드레인 호스 세트',
    stock: 25,
    confidence: 93,
    checklist: [
      '파손된 부위(호스, 레버, 커버, 스위치) 근접 사진 문자/카톡 수신',
      '단순 소모성 호스/레버 파손 시 규격 확인 후 택배 즉시 출고',
      '조향부 또는 전장 배선 노출 파손 시 가동 중단 안내 및 출장 접수'
    ],
    selfActionGuide: '파손된 호스나 레버, 커버 부위 사진을 수신하여 정확한 모델 규격 부품을 택배 발송하거나 현장 교체를 진행하세요.'
  }
];

/**
 * 문장(또는 슬라이딩 윈도우 문맥)에서 매칭되는 모든 표준 증상 엔티티를 반환
 * 1차: 구어체 조합 정규식(synonyms) 매칭
 * 2차: 정규식 미매칭 시 한국어 자모 음운 유사도(fuzzyPhrases) 기반 매칭 (유사도 >= 0.78)
 */
export function findMatchingSymptomEntities(text: string): KeywordEntity[] {
  if (!text || !text.trim()) return [];
  const matched: KeywordEntity[] = [];
  const seenIds = new Set<string>();

  // 1차: 정규식 매칭 (복수 증상 모두 수집)
  for (const entity of DOMAIN_KEYWORD_REGISTRY) {
    if (entity.synonyms.test(text)) {
      matched.push(entity);
      seenIds.add(entity.id);
    }
  }

  // 2차: 정규식으로 아무것도 안 잡혔을 때, 어절 슬라이딩 윈도우 자모 음운 유사도 검사
  if (matched.length === 0) {
    const clean = text.replace(/[\[\]0-9:.,!?~()]/g, ' ').trim();
    const words = clean.split(/\s+/).filter(w => w.length >= 2);
    const ngrams: string[] = [];
    for (let i = 0; i < words.length; i++) {
      if (words[i].length >= 3) ngrams.push(words[i]);
      if (i + 1 < words.length) ngrams.push(words[i] + words[i + 1]);
      if (i + 2 < words.length) ngrams.push(words[i] + words[i + 1] + words[i + 2]);
    }

    let bestEntity: KeywordEntity | null = null;
    let bestSim = 0;
    for (const entity of DOMAIN_KEYWORD_REGISTRY) {
      if (!entity.fuzzyPhrases) continue;
      for (const phrase of entity.fuzzyPhrases) {
        for (const ng of ngrams) {
          if (Math.abs(ng.length - phrase.length) > 4) continue;
          const sim = computeJamoSimilarity(ng, phrase);
          if (sim >= 0.78 && sim > bestSim) {
            bestSim = sim;
            bestEntity = entity;
          }
        }
      }
    }
    if (bestEntity && !seenIds.has(bestEntity.id)) {
      matched.push(bestEntity);
    }
  }

  return matched;
}

// ── 2. Comprehensive 5-Category Named Entity Registry (High-Contrast Solid UI) ──
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
    pattern: /J600T|J600|(?:제이|J)\s*(?:600|육백)(?:\s*티|\s*T)?|보행식\s*습식/i,
    modelId: 'J600T',
    colorScheme: { bg: '#e9d5ff', border: '#c084fc', text: '#581c87', glow: 'none' }
  },
  {
    id: 'ent-model-j800',
    type: 'model',
    label: '장비모델',
    pattern: /J800AD|J800|J900|(?:제이|J)\s*(?:800|팔백|900|구백)|대형\s*탑승형/i,
    modelId: 'J800',
    colorScheme: { bg: '#e9d5ff', border: '#c084fc', text: '#581c87', glow: 'none' }
  },
  {
    id: 'ent-model-s12',
    type: 'model',
    label: '장비모델',
    pattern: /S12L|S12|(?:에스|엑스|S)\s*(?:12|십이|일이)|f10이/i,
    modelId: 'S12',
    colorScheme: { bg: '#e9d5ff', border: '#c084fc', text: '#581c87', glow: 'none' }
  },
  {
    id: 'ent-model-w12-w15',
    type: 'model',
    label: '장비모델',
    pattern: /W15|W12|(?:더블유|W)\s*(?:15|십오|12|십이)/i,
    modelId: 'W12',
    colorScheme: { bg: '#e9d5ff', border: '#c084fc', text: '#581c87', glow: 'none' }
  },
  {
    id: 'ent-model-s7',
    type: 'model',
    label: '장비모델',
    pattern: /S7P|S7|(?:에스|S)\s*(?:세븐|7|칠)(?:\s*피|\s*P)?/i,
    modelId: 'S7',
    colorScheme: { bg: '#e9d5ff', border: '#c084fc', text: '#581c87', glow: 'none' }
  },
  {
    id: 'ent-model-s5',
    type: 'model',
    label: '장비모델',
    pattern: /S5|(?:에스|S)\s*(?:파이브|5)|소형\s*탑승형/i,
    modelId: 'S5',
    colorScheme: { bg: '#e9d5ff', border: '#c084fc', text: '#581c87', glow: 'none' }
  },
  {
    id: 'ent-model-s3',
    type: 'model',
    label: '장비모델',
    pattern: /S3|(?:에스|S)\s*(?:쓰리|3|삼)/i,
    modelId: 'S3',
    colorScheme: { bg: '#e9d5ff', border: '#c084fc', text: '#581c87', glow: 'none' }
  },
  {
    id: 'ent-model-other',
    type: 'model',
    label: '장비모델',
    pattern: /S2|S1|R3|(?:알|R)\s*(?:3|쓰리|삼)|쓰담|징클린\s*19|징클린|청소\s*장비|습식\s*청소기/i,
    modelId: 'S2/R3',
    colorScheme: { bg: '#e9d5ff', border: '#c084fc', text: '#581c87', glow: 'none' }
  },

  // D. SYMPTOM & PART (16대 표준 고장증상 / 부품 - Red / 적색)
  {
    id: 'ent-sym-solenoid',
    type: 'symptom',
    label: '고장증상',
    pattern: /솔레노이드\s*밸브|솔레노이드|솔리노이드|솔노이드|솔래노이드|물이?\s*(?:아예\s*|잘\s*)?안\s*나와(?:요|서)?|물\s*안\s*나옴|안\s*나오더라고요|브러시\s*물|세척수\s*미분사|노즐\s*막힘|급수\s*밸브|필터가?\s*막혀|세수\s*필터/i,
    keywordId: 'kw-solenoid',
    colorScheme: { bg: '#fecaca', border: '#f87171', text: '#7f1d1d', glow: 'none' }
  },
  {
    id: 'ent-sym-leak',
    type: 'symptom',
    label: '고장증상',
    pattern: /세척수\s*누수|누수|물이?\s*계속\s*새(?:요|서)?|물이?\s*새요?|물이?\s*줄줄|물이?\s*뚝뚝|호스\s*물샘/i,
    keywordId: 'kw-water-leak',
    colorScheme: { bg: '#fecaca', border: '#f87171', text: '#7f1d1d', glow: 'none' }
  },
  {
    id: 'ent-sym-suction',
    type: 'symptom',
    label: '고장증상',
    pattern: /흡입\s*모터|흡입\s*부분|흡입력\s*저하|흡입\s*불량|흡입력|흡입이?\s*(?:안|약|떨어)|흡기|진공압|모터\s*굉음|모터\s*과열|굉음|타는\s*냄새|탄\s*냄새|모터\s*소리|소음\s*발생|빨아들이지\s*못|안\s*빨려요?|못\s*빨아들/i,
    keywordId: 'kw-suction',
    colorScheme: { bg: '#fecaca', border: '#f87171', text: '#7f1d1d', glow: 'none' }
  },
  {
    id: 'ent-sym-squeegee',
    type: 'symptom',
    label: '고장증상',
    pattern: /스퀴지|와이퍼\s*고무|와이퍼|바닥\s*물기|잔수|줄무늬\s*잔수|고무\s*블레이드|고무날|물\s*자국|물이?\s*남아(?:요|서)?|물기가?\s*남아|물이?\s*흥건|고무\s*패드|패드\s*거치대|고정판|판\s*거치대|중간\s*부분|양쪽\s*끝|편마모/i,
    keywordId: 'kw-squeegee',
    colorScheme: { bg: '#fecaca', border: '#f87171', text: '#7f1d1d', glow: 'none' }
  },
  {
    id: 'ent-sym-float',
    type: 'symptom',
    label: '고장증상',
    pattern: /플로트\s*밸브|플로트\s*볼|만수\s*센서|만수\s*경보|부표|오수탱크\s*조기\s*차단|거품\s*차단/i,
    keywordId: 'kw-float-sensor',
    colorScheme: { bg: '#fecaca', border: '#f87171', text: '#7f1d1d', glow: 'none' }
  },
  {
    id: 'ent-sym-battery-degrade',
    type: 'symptom',
    label: '고장증상',
    pattern: /조기\s*방전|배터리\s*방전|금방\s*방전|빨리\s*방전|금방\s*꺼져요?|사용\s*시간\s*급감|배터리\s*수명/i,
    keywordId: 'kw-battery-degrade',
    colorScheme: { bg: '#fecaca', border: '#f87171', text: '#7f1d1d', glow: 'none' }
  },
  {
    id: 'ent-sym-battery',
    type: 'symptom',
    label: '고장증상',
    pattern: /충전\s*불량|충전\s*불가|충전\s*안\s*됨|충전이?\s*안\s*돼요?|충전기\s*고장|충전\s*문제|배터리\s*문제|배터리|충전기?|방전/i,
    keywordId: 'kw-battery',
    colorScheme: { bg: '#fecaca', border: '#f87171', text: '#7f1d1d', glow: 'none' }
  },
  {
    id: 'ent-sym-power-dead',
    type: 'symptom',
    label: '고장증상',
    pattern: /전원\s*불량|전원이?\s*안\s*켜져?요?|전원\s*먹통|계기판\s*먹통|시동이?\s*안\s*걸려?요?|아예\s*먹통|비상\s*정지|안\s*켜져요?/i,
    keywordId: 'kw-power-dead',
    colorScheme: { bg: '#fecaca', border: '#f87171', text: '#7f1d1d', glow: 'none' }
  },
  {
    id: 'ent-sym-terminal',
    type: 'symptom',
    label: '고장증상',
    pattern: /앤더슨\s*커넥터|단자\s*접촉\s*불량|충전\s*단자|잔량\s*표시\s*오류|게이지가?\s*튀어요?/i,
    keywordId: 'kw-terminal-loose',
    colorScheme: { bg: '#fecaca', border: '#f87171', text: '#7f1d1d', glow: 'none' }
  },
  {
    id: 'ent-sym-brush-stall',
    type: 'symptom',
    label: '고장증상',
    pattern: /브러시\s*회전\s*불량|브러시가?\s*안\s*돌아?요?|솔이?\s*안\s*돌아?요?|과부하\s*차단|서킷\s*브레이커|브러시\s*모터/i,
    keywordId: 'kw-brush-stall',
    colorScheme: { bg: '#fecaca', border: '#f87171', text: '#7f1d1d', glow: 'none' }
  },
  {
    id: 'ent-sym-brush',
    type: 'symptom',
    label: '고장증상',
    pattern: /패드\s*드라이버|브러시|패드판|데크|노브|볼트|녹이?\s*슬|녹\s*발생|커넥터/i,
    keywordId: 'kw-brush-deck',
    colorScheme: { bg: '#fecaca', border: '#f87171', text: '#7f1d1d', glow: 'none' }
  },
  {
    id: 'ent-sym-wheel-drive',
    type: 'symptom',
    label: '고장증상',
    pattern: /주행\s*불가|주행\s*불량|구동\s*불량|트랜스액슬|포텐셔미터|앞으로\s*안\s*가요?|뒤로\s*안\s*가요?|전진이?\s*안\s*돼요?|후진이?\s*안\s*돼요?|바퀴가?\s*안\s*굴러|직진\s*쏠림/i,
    keywordId: 'kw-wheel-drive',
    colorScheme: { bg: '#fecaca', border: '#f87171', text: '#7f1d1d', glow: 'none' }
  },
  {
    id: 'ent-sym-belt-slip',
    type: 'symptom',
    label: '고장증상',
    pattern: /벨트\s*슬립|타이밍\s*벨트|벨트\s*끊어짐|벨트\s*마모|끼익\s*소리/i,
    keywordId: 'kw-belt-slip',
    colorScheme: { bg: '#fecaca', border: '#f87171', text: '#7f1d1d', glow: 'none' }
  },
  {
    id: 'ent-sym-lift-fail',
    type: 'symptom',
    label: '고장증상',
    pattern: /액추에이터|승강\s*불량|리프트\s*불량|브러시가?\s*안\s*내려가요?|스퀴지가?\s*안\s*내려가요?|안\s*올라가요?/i,
    keywordId: 'kw-lift-fail',
    colorScheme: { bg: '#fecaca', border: '#f87171', text: '#7f1d1d', glow: 'none' }
  },
  {
    id: 'ent-sym-error-code',
    type: 'symptom',
    label: '고장증상',
    pattern: /\b(?:E0[1-9]|E1[0-9]|E2[0-9]|E91|F0[1-4]|EH|EL)\b|에러\s*코드|경고음|삐삐\s*소리/i,
    keywordId: 'kw-error-code',
    colorScheme: { bg: '#fecaca', border: '#f87171', text: '#7f1d1d', glow: 'none' }
  },
  {
    id: 'ent-sym-chassis',
    type: 'symptom',
    label: '고장증상',
    pattern: /드레인\s*호스|흡입\s*호스|호스\s*찢어짐|호스\s*막힘|레버\s*부러짐|외장\s*파손|커버\s*파손/i,
    keywordId: 'kw-chassis-damage',
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
    pattern: /필터\s*열어서|거름망\s*청소|필터\s*(?:망)?\s*(?:세척|확인|체크)|이물질\s*(?:제거|청소|털어)|탱크\s*비우|오수\s*비우|물\s*채워|소포제\s*투입/i,
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
    pattern: /비상\s*정지\s*(?:버튼)?\s*(?:해제|당기|돌려)|빨간\s*버튼\s*당기|220V\s*콘센트|충전기\s*확인|단자\s*체결|실내\s*보관|사진\s*(?:확인|요청)|영상\s*통화|부품\s*발송|매뉴얼/i,
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
