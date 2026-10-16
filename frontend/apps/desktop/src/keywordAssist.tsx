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
    synonyms: /솔레노이드|솔리노이드|솔노이드|소레노이드|솔래노이드|솔밸브|급수\s*밸브|전자\s*밸브|노즐\s*막힘|분사구\s*막힘|세척수\s*미분사|(?:솔레노이드|솔밸브|급수|세척수|청수|세수|물\s*분사|분사구?|노즐)[이가은는]?\s*(?:작동\s*)?(?:안\s*됨|안\s*돼|안\s*되|불가|불량|고장|막힘|파손|깨짐|부서짐|빠짐|뽑힘)|(?:물|세제|청수|세수|액)[이가은는을를]?\s*(?:아예\s*|전혀\s*|하나도\s*|잘\s*|계속\s*)?(?:안|못)\s*(?:나와|나오|나옴|뿌려|뿌리|내려|떨어|공급)|(?:안|못)\s*(?:나와|나오|뿌려).{0,8}(?:물|세제|청수)|브러시.{0,8}물.{0,8}(?:안|못)|필터\s*열어서|필터가?\s*막혀|세수\s*필터/i,
    fuzzyPhrases: ['솔레노이드밸브', '물이안나와요', '물안나옴', '세척수미분사', '급수밸브불량', '급수안됨', '급수불가', '노즐막힘'],
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
    synonyms: /누수|물\s*샘|물이?\s*새|물이?\s*샜|물이?\s*줄줄|물이?\s*뚝뚝|(?:꺼놨|껐|정지|가만히).{0,12}물.{0,8}(?:나와|새|흘러)|(?:밑|바닥|호스|배관|이음새|통).{0,10}물[이가]?\s*(?:새|흘러|떨어져|고여)|(?:배관|피팅|엘보|급수관)[이가은는]?\s*(?:파손|깨짐|깨졌|부서짐|빠짐|빠졌|뽑힘|뽑혔|누수)|호스\s*피팅\s*누수|밸브\s*닫힘\s*불량/i,
    fuzzyPhrases: ['세척수누수', '물이계속새요', '바닥에물이새요', '호스물샘', '밸브누수', '배관파손', '피팅빠짐'],
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
    synonyms: /스퀴지|스퀴즈|스키지|스끼지|와이퍼|바닥\s*물기|잔수|줄무늬|고무\s*블레이드|고무\s*날|고무날|뒷\s*고무|뒤에\s*고무|물\s*자국|고무\s*패드|패드\s*거치대|고정판|판\s*거치대|(?:스퀴지|와이퍼|고무날?|블레이드|물받이)[이가은는]?\s*(?:안\s*됨|안\s*돼|불가|파손|깨짐|깨졌|부서짐|부서졌|부러짐|빠짐|빠졌|뽑힘|뽑혔|찢어짐|찢어졌|마모)|(?:물|물기|바닥|오수)[이가은는을를]?\s*(?:잘\s*|제대로\s*|전혀\s*|하나도\s*)?(?:안|못)\s*(?:빨아|먹어|끌어|건조|마르|올라오|올라와)|(?:물|물기|자국)[이가]?\s*(?:남아|남네|흥건|그대로|질질|줄줄)|빨아들이지\s*못|편마모|고무.{0,8}(?:닳|찢어|갈라|들떠|빠져|뽑혀)/i,
    fuzzyPhrases: ['바닥잔수과다', '스퀴지마모', '스퀴지파손', '스퀴지빠짐', '고무날뽑힘', '물이안빨려요', '바닥에물기가남아요', '고무날찢어짐', '줄무늬잔수'],
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
    synonyms: /흡입\s*모터|흡입\s*모타|석션\s*모터|바큠\s*모터|진공\s*모터|흡입력|흡입\s*부분|(?:흡입\s*모터|석션\s*모터|진공\s*모터|흡입력?|석션|바큠|진공)[이가은는]?\s*(?:작동\s*)?(?:약|안\s*됨|안\s*돼|안\s*되|불가|불량|고장|문제|떨어|멈춤|파손)|진공압\s*저하|모터\s*굉음|모터\s*과열|모터.{0,8}(?:소리|소음|냄새|연기|뜨거|멈춰|안\s*돌|안\s*됨|고장|불량)|타는\s*냄새|탄\s*냄새|탄내|쇠\s*갈리는\s*소리|비명\s*소리|소음\s*발생|소리가?\s*크게/i,
    fuzzyPhrases: ['흡입모터과열', '흡입력저하', '흡입불량', '흡입안됨', '흡입불가', '석션안됨', '모터소음발생', '모터에서타는냄새'],
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
    synonyms: /플로트\s*밸브|플로트\s*볼|부표|만수\s*센서|만수\s*경보|만수\s*차단|(?:플로트\s*밸브|플로트\s*볼|플로트|부표|만수\s*센서|수위\s*센서)[이가은는]?\s*(?:안\s*됨|안\s*돼|불가|불량|고장|파손|깨짐|깨졌|부서짐|빠짐|빠졌|뽑힘|고착)|(?:오수|폐수|물통).{0,10}(?:비었|안\s*찼|조금\s*찼).{0,10}(?:차단|멈춰|꺼져|안\s*빨)|거품.{0,8}(?:차단|넘쳐|가득)|소포제/i,
    fuzzyPhrases: ['만수센서오작동', '플로트밸브고착', '플로트밸브파손', '부표빠짐', '오수탱크조기차단', '부표일찍올라옴'],
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
    synonyms: /배터리\s*충전|충전\s*불량|충전\s*불가|충전\s*문제|충전이?\s*안|충전기\s*고장|(?:충전기?|어댑터)[이가은는]?\s*(?:작동\s*)?(?:안\s*됨|안\s*돼|안\s*되|불가|불량|고장|파손|깨짐|부서짐)|충전기.{0,10}(?:안\s*들어|깜빡|점멸|빨간\s*불|적색|소리|에러)|충전.{0,8}(?:안\s*돼|안\s*되|안\s*됨|불가|중단|멈춰)|배터리\s*문제/i,
    fuzzyPhrases: ['배터리충전불량', '충전안됨', '충전불가', '충전기고장', '충전기파손', '충전문제', '배터리문제'],
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
    synonyms: /전원\s*불량|전원이?\s*안\s*켜|전원\s*먹통|계기판\s*먹통|시동이?\s*안\s*걸|아예\s*안\s*켜|묵묵부답|(?:전원|시동|계기판|키\s*스위치|키\s*박스|비상\s*정지)[이가은는]?\s*(?:인입\s*|작동\s*)?(?:안\s*됨|안\s*돼|안\s*되|불가|불능|먹통|고장)|(?:키|스위치|전원|계기판)[이가은는을를]?\s*(?:돌려도|켜도|눌러도)?\s*(?:전혀\s*|아예\s*|하나도\s*)?(?:안\s*들어|안\s*켜|안\s*와|반응\s*없|먹통|꺼져)|비상\s*정지\s*버튼/i,
    fuzzyPhrases: ['전원안켜짐', '전원안됨', '전원불가', '시동안됨', '작동불가', '전원완전인입불가', '계기판먹통', '시동안걸림', '아예작동안함'],
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
    synonyms: /앤더슨\s*커넥터|단자\s*접촉|충전\s*단자|충전\s*잭|커넥터\s*헐거|단자\s*유격|(?:앤더슨\s*커넥터|커넥터|충전\s*단자|단자|충전\s*잭)[이가은는]?\s*(?:접촉\s*)?(?:안\s*됨|안\s*돼|불가|불량|파손|깨짐|깨졌|부서짐|부서졌|빠짐|빠졌|뽑힘|뽑혔|끊어짐|끊어졌)|(?:잔량|게이지|배터리\s*칸)[이가]?\s*(?:튀어|튐|왔다\s*갔다|깜빡|오류|안\s*맞|안\s*됨|불량)/i,
    fuzzyPhrases: ['충전단자접촉불량', '앤더슨커넥터파손', '단자빠짐', '전선뽑힘', '배선뽑힘', '커넥터깨짐', '배터리게이지오류', '단자헐거움'],
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
    synonyms: /브러시\s*모터|브러시\s*회전|브러시\s*미회전|(?:브러시\s*모터|브러시\s*회전|브러시|솔|서킷\s*브레이커|차단기)[이가은는]?\s*(?:회전\s*|작동\s*)?(?:안\s*됨|안\s*돼|안\s*되|불가|불량|고장|멈춤)|(?:브러시|솔|패드|밑에\s*판)[이가은는]?\s*(?:전혀\s*|아예\s*|잘\s*)?(?:안\s*돌|못\s*돌|멈춰|헛돌|안\s*돌아)|(?:안\s*돌아|안\s*돌고|멈췄).{0,8}(?:브러시|솔|패드)|서킷\s*브레이커|과부하\s*차단|퓨즈함/i,
    fuzzyPhrases: ['브러시모터회전불가', '브러시안돌아감', '브러시안됨', '브러시불가', '솔이안돌아요', '브러시과부하차단'],
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

  // [11] 브러시·패드판 체결 / 노브·볼트 이상 (DRV_BRUSH_STALL 연계)
  {
    id: 'kw-brush-deck',
    canonicalId: 'DRV_BRUSH_STALL',
    keyword: '브러시·패드판 체결 / 노브·볼트 이상',
    synonyms: /패드\s*드라이버|패드판|페드판|브러시\s*장착|브러시\s*탈착|볼트\s*(?:조정|풀림|부재)|녹이?\s*슬|녹\s*발생|(?:패드\s*드라이버|패드판?|데크\s*노브|고정\s*노브|삼발이|클러치|패드\s*거치대)[이가은는]?\s*(?:체결\s*|장착\s*|탈착\s*|고정\s*)?(?:안\s*됨|안\s*돼|불가|불량|파손|깨짐|깨졌|부서짐|부서졌|부러짐|부러졌|빠짐|빠졌|뽑힘|뽑혔|풀림|풀렸)|(?:브러시|패드판?)[이가은는을를]?\s*(?:빠짐|빠져|빠졌|뽑힘|뽑혔|깨짐|부서짐|파손|떨어져|안\s*끼워|안\s*맞|흔들|덜덜)/i,
    fuzzyPhrases: ['패드드라이버파손', '패드판체결불량', '패드판빠짐', '브러시빠짐', '노브깨짐', '노브부서짐', '데크볼트풀림'],
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
    synonyms: /주행\s*불가|주행\s*불량|구동\s*불량|트랜스액슬|포텐셔미터|전후진|직진\s*쏠림|(?:주행|전진|후진|전후진|구동|이동|운행|조향|트랜스액슬|포텐셔미터|브레이크)[이가은는]?\s*(?:작동\s*)?(?:안\s*됨|안\s*돼|안\s*되|불가|불능|불량|고장|먹통)|(?:앞으로|뒤로|전진|후진|바퀴|주행|장비)[이가은는도]?\s*(?:전혀\s*|아예\s*|잘\s*)?(?:안\s*가|안\s*나|안\s*되|안\s*움직|멈춰|안\s*굴러|헛돌|먹통|뻑뻑)|한쪽으로\s*쏠림/i,
    fuzzyPhrases: ['주행구동불가', '주행안됨', '전진안됨', '후진불가', '앞으로안가요', '전진후진불량', '바퀴가안움직여요', '주행불량'],
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
    synonyms: /벨트\s*슬립|타이밍\s*벨트|벨트\s*마모|벨트\s*늘어짐|벨트\s*끊어짐|(?:타이밍\s*벨트|구동\s*벨트|벨트|텐셔너)[이가은는]?\s*(?:안\s*됨|불가|불량|파손|부서짐|빠짐|빠졌|뽑힘|뽑혔|끊어짐|끊어졌)|끼익\s*(?:소리|소음)|고무\s*마찰음|회전력\s*저하/i,
    fuzzyPhrases: ['구동벨트슬립', '벨트끊어짐', '벨트빠짐', '벨트파손', '끼익소리발생', '벨트장력불량'],
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
    synonyms: /액추에이터|승강\s*불량|승강\s*장치|리프트\s*불량|(?:액추에이터|승강|리프트|와이어)[이가은는]?\s*(?:작동\s*)?(?:안\s*됨|안\s*돼|안\s*되|불가|불량|고장|파손|깨짐|부서짐|빠짐|뽑힘|끊어짐|고착)|(?:브러시|스퀴지|헤드|데크|페달|레버)[이가은는을를]?\s*(?:안\s*내려|안\s*올라|고착|안\s*움직|들려\s*있|안\s*떨어져)|내려가지\s*않|올라가지\s*않/i,
    fuzzyPhrases: ['브러시승강불량', '승강안됨', '승강불가', '리프트안됨', '액추에이터고장', '액추에이터파손', '브러시안내려감', '리프트모터불량'],
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
    synonyms: /외장\s*파손|커버\s*파손|범퍼\s*파손|핸들\s*파손|레버\s*부러|스위치\s*깨짐|호스\s*찢어|호스\s*터짐|호스\s*막힘|드레인\s*호스|흡입\s*호스|(?:외장|커버|뚜껑|범퍼|핸들|손잡이|레버|스위치|호스|드레인\s*호스|흡입\s*호스|배수\s*호스|배수구?|배수\s*캡|물통|탱크|오수통|청수통|바퀴|캐스터|휠|페달|투명창|창|케이스|핀|고정핀|걸쇠|고리|클램프|마개|거름망)[이가은는]?\s*(?:안\s*됨|불가|파손|파손됨|깨짐|깨졌|부서짐|부서졌|부러짐|부러졌|빠짐|빠졌|뽑힘|뽑혔|찢어짐|찢어졌|터짐|터졌|막힘|막혔)/i,
    fuzzyPhrases: ['외장부품파손', '레버부러짐', '레버부서짐', '물통깨짐', '뚜껑깨짐', '호스빠짐', '호스뽑힘', '흡입호스찢어짐', '드레인호스파손', '호스막힘'],
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

  // 1. 스퀴지 / 고무날 / 잔수
  if (/스퀴지|와이퍼|고무날|블레이드|물받이|뒷고무|잔수|물기|건조|지지휠/.test(t)) {
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
  if (/외장|커버|뚜껑|범퍼|핸들|손잡이|레버|스위치|호스|드레인|배수|물통|탱크|오수통|청수통|바퀴|캐스터|휠|페달|투명창|창|케이스|핀|고정핀|걸쇠|고리|클램프|마개|캡|거름망|전조등|라이트/.test(t)) {
    return 'kw-chassis-damage';
  }

  // 17. 자모 음운 유사도로 대상(OOO) 명칭 퍼지 추론 (예: "솔노드 안됨", "스키지 빠짐", "액추에이타 불가")
  const FUZZY_TARGET_MAP: Array<{ sample: string; kwId: string }> = [
    { sample: '솔레노이드', kwId: 'kw-solenoid' },
    { sample: '급수밸브', kwId: 'kw-solenoid' },
    { sample: '스퀴지', kwId: 'kw-squeegee' },
    { sample: '흡입모터', kwId: 'kw-suction' },
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

/**
 * 문장(또는 슬라이딩 윈도우 문맥)에서 매칭되는 모든 표준 증상 엔티티를 반환
 * 1차: 구어체 조합 정규식(synonyms) 매칭
 * 2차: 부정적 상태표현 구문 추출기([OOO 안됨/불가/파손/깨짐/부서짐/빠짐/뽑힘]) 기반 의미 매핑
 * 3차: 정규식/구문 미매칭 시 한국어 자모 음운 유사도(fuzzyPhrases) 기반 매칭 (유사도 >= 0.78)
 */
export function findMatchingSymptomEntities(text: string): KeywordEntity[] {
  if (!text || !text.trim()) return [];
  const matched: KeywordEntity[] = [];
  const seenIds = new Set<string>();

  // 명시적 증상/부품 구어체 정규식(synonyms) 매칭만 수행 (모호한 부정상태 추론 및 자모 유사도 추측 비활성화)
  for (const entity of DOMAIN_KEYWORD_REGISTRY) {
    if (entity.synonyms.test(text) && !seenIds.has(entity.id)) {
      matched.push(entity);
      seenIds.add(entity.id);
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
  }

  return info;
}

// ── 2. Comprehensive 5-Category Named Entity Registry (High-Contrast Solid UI) ──
export const NAMED_ENTITY_REGISTRY: EntityRule[] = [
  // A. CUSTOMER & PERSON (고객사명 / 담당자명 / 연락처 - Primary Blue)
  {
    id: 'ent-cust-banpo',
    type: 'customer',
    label: '고객사',
    pattern: /반포\s*자이|반포자이|박시설\s*(?:과장|시설과장)?|클린\s*에코|클린에코|스페이스\s*클린\s*강남점/i,
    customerId: 'a1111111-1111-1111-1111-111111111111',
    colorScheme: { bg: '#bfdbfe', border: '#3b82f6', text: '#1e3a8a', glow: 'none' }
  },
  {
    id: 'ent-cust-raemian',
    type: 'customer',
    label: '고객사',
    pattern: /래미안\s*퍼스티지|래미안|퍼스티지|이관리\s*(?:소장|관리소장)?|삼원\s*종합|삼원종합관리|미래\s*물류\s*센터\s*평택점/i,
    customerId: 'a2222222-2222-2222-2222-222222222222',
    colorScheme: { bg: '#bfdbfe', border: '#3b82f6', text: '#1e3a8a', glow: 'none' }
  },
  {
    id: 'ent-cust-dogok',
    type: 'customer',
    label: '고객사',
    pattern: /도곡\s*렉슬|도곡렉슬|최기술\s*(?:팀장|기술팀장)?|한결\s*에프엠|한결에프엠|케이\s*로지스\s*화성\s*센터/i,
    customerId: 'a1010101-1010-1010-1010-101010101010',
    colorScheme: { bg: '#bfdbfe', border: '#3b82f6', text: '#1e3a8a', glow: 'none' }
  },
  {
    id: 'ent-cust-gasan',
    type: 'customer',
    label: '고객사',
    pattern: /가산\s*디지털\s*엠타워|디지털\s*엠타워|엠타워|강센터\s*(?:실장|관리실장)?|피앤씨\s*클린|피앤씨클린|한국\s*유통\s*판교\s*본점/i,
    customerId: 'a3333333-3333-3333-3333-333333333333',
    colorScheme: { bg: '#bfdbfe', border: '#3b82f6', text: '#1e3a8a', glow: 'none' }
  },
  {
    id: 'ent-cust-general',
    type: 'customer',
    label: '고객사/담당자/연락처',
    pattern: /\b(?:01[016789]|02|0[3-6][1-5]|070)[-\s.]?\d{3,4}[-\s.]?\d{4}\b|(?:\(주\)|주식회사)\s*[가-힣A-Za-z0-9_]{2,12}|[가-힣A-Za-z0-9_]{2,12}\s*(?:\(주\)|주식회사)|수림\s*종합\s*관리|머쉬앤\s*파머스|파머스|팜\s*스마트|비와이씨|BYC\s*빌딩|세원\s*종합\s*관리|베스트\s*환경\s*산업|반짝반짝\s*시스템|우주\s*엔비텍|티에스\s*식스티즈|롯데\s*캐슬(?:\s*프레미어)?|이편한\s*세상|우미린|트라팰리스|힐스테이트|더샵(?:\s*퍼스트월드|\s*반포리버파크)?|우림\s*라이온스\s*밸리|성우\s*하이텍(?:\s*서창공장|\s*선장공장)?|인천\s*공항\s*시설\s*관리|시민\s*마스터\s*크린|위너스텍|에스에프\s*코리아|듀델\s*코리아|건물\s*코디\s*뱅크|성원\s*테크|케이엠\s*산업|앰앰아이|글로벌\s*팩토리|인천\s*남동\s*정밀|메가\s*물류\s*센터|현대\s*메디컬\s*센터|[가-힣]{2,10}(?:종합관리|환경산업|관리사무소|관리지원센터|관리단|물류센터|유통센터|메디컬센터|아파트|선장공장|서창공장)/i,
    colorScheme: { bg: '#bfdbfe', border: '#3b82f6', text: '#1e3a8a', glow: 'none' }
  },

  // B. SITE & LOCATION (도로명/지번 주소 / 현장명 / 건물 층·구역 - Amber / Orange)
  {
    id: 'ent-site-banpo',
    type: 'site',
    label: '현장/위치',
    pattern: /서울\s*서초구\s*신반포로\s*270|신반포로(?:\s*270)?|반포|방재실|지하\s*1층/i,
    customerId: 'a1111111-1111-1111-1111-111111111111',
    colorScheme: { bg: '#fde68a', border: '#f59e0b', text: '#78350f', glow: 'none' }
  },
  {
    id: 'ent-site-raemian',
    type: 'site',
    label: '현장/위치',
    pattern: /서울\s*서초구\s*반포대로\s*275|반포대로(?:\s*275)?|주차장\s*관리소|지하\s*2층/i,
    customerId: 'a2222222-2222-2222-2222-222222222222',
    colorScheme: { bg: '#fde68a', border: '#f59e0b', text: '#78350f', glow: 'none' }
  },
  {
    id: 'ent-site-dogok',
    type: 'site',
    label: '현장/위치',
    pattern: /서울\s*강남구\s*선릉로\s*221|선릉로(?:\s*221)?|도곡|지하\s*방재실/i,
    customerId: 'a1010101-1010-1010-1010-101010101010',
    colorScheme: { bg: '#fde68a', border: '#f59e0b', text: '#78350f', glow: 'none' }
  },
  {
    id: 'ent-site-gasan',
    type: 'site',
    label: '현장/위치',
    pattern: /서울\s*금천구\s*가산디지털1로\s*186|가산디지털1로(?:\s*186)?|가산|지하\s*1층\s*하역장/i,
    customerId: 'a3333333-3333-3333-3333-333333333333',
    colorScheme: { bg: '#fde68a', border: '#f59e0b', text: '#78350f', glow: 'none' }
  },
  {
    id: 'ent-site-general',
    type: 'site',
    label: '주소/상세위치',
    pattern: /(?:(?:서울|부산|대구|인천|광주|대전|울산|세종|경기|경기도|강원|충북|충남|전북|전남|경북|경남|제주)(?:특별시|광역시|특별자치시|도)?\s+)?(?:[가-힣]{1,5}(?:시|군|구)\s+)*(?:[가-힣]{1,6}(?:구|읍|면|동)\s+)?[가-힣0-9]{1,12}(?:대로|번길|산단로|단지로|로|길)\s*\d{1,4}(?:-\d{1,4})?(?:\s*번지)?|[가-힣]{2,5}(?:시|군|구)\s+[가-힣0-9]{2,8}(?:읍|면|동|가|리)(?:\s+\d{1,4}(?:-\d{1,4})?)?|(?:지하\s*\d{1,2}\s*층|B\s*\d{1,2}\s*층?|\d{1,2}\s*층|\d{1,4}\s*동)(?:\s*(?:지하\s*주차장|주차장|하역장|방재실|기계실|기전실|전기실|관리사무소|관리실|경비실|미화실|창고|물류데크|생산라인))?|지하\s*주차장|주차장|입출고\s*하역장|하역장|물류\s*데크|방재실|기계실|기전실|전기실|기관실|경비실|보안실|미화실|정비\s*창고|저온\s*창고|프레스룸|생산\s*라인|청도|분당|판교|대전|파주|탕정|천안|아산|수원|화성|평택|안성|성남|안산|김포|일산|인천|부산|대구|광주|원주|청주|나라\s*장터/i,
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
    pattern: /S12L|S12|(?:에스|엑스|S)\s*(?:12|십이|일이)/i,
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
    pattern: /드레인\s*호스|흡입\s*호스|배수\s*호스|호스\s*찢어짐|호스\s*막힘|호스\s*빠짐|호스\s*뽑힘|레버\s*부러짐|레버\s*부서짐|물통\s*깨짐|뚜껑\s*깨짐|외장\s*파손|커버\s*파손/i,
    keywordId: 'kw-chassis-damage',
    colorScheme: { bg: '#fecaca', border: '#f87171', text: '#7f1d1d', glow: 'none' }
  },
  {
    id: 'ent-sym-negative-state',
    type: 'symptom',
    label: '부정상태',
    pattern: /(?:솔레노이드|솔밸브|급수|세척수|청수|분사구?|노즐|배관|피팅|스퀴지|와이퍼|고무날?|블레이드|흡입\s*모터|흡입력?|석션|진공|플로트|부표|만수\s*센서|배터리|충전기?|단자|커넥터|앤더슨|전선|배선|케이블|코드|잭|전원|시동|계기판|키\s*스위치|키\s*박스|브러시|솔|차단기|패드\s*드라이버|패드판?|데크|노브|볼트|삼발이|주행|전진|후진|전후진|구동|트랜스액슬|포텐셔미터|브레이크|벨트|텐셔너|액추에이터|승강|리프트|와이어|호스|레버|핸들|손잡이|뚜껑|커버|범퍼|물통|탱크|오수통|청수통|바퀴|캐스터|휠|페달|투명창|케이스|고정핀|핀|걸쇠|클램프|마개|캡|거름망|스위치)[이가은는을를도]?\s*(?:작동\s*|가동\s*|회전\s*|체결\s*)?(?:안\s*됨|안\s*돼(?:요|서)?|안\s*되(?:요|네)?|불가(?:능)?|파손(?:됨|됐)?|깨짐|깨졌(?:어요|어)?|부서짐|부서졌(?:어요|어)?|부러짐|부러졌(?:어요|어)?|빠짐|빠졌(?:어요|어)?|뽑힘|뽑혔(?:어요|어)?|끊어짐|끊어졌(?:어요|어)?|찢어짐|찢어졌(?:어요|어)?|막힘|막혔(?:어요|어)?)/i,
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
      const resolvedSymptomEntity =
        matchedRule.type === 'symptom'
          ? (matchedRule.keywordId
              ? DOMAIN_KEYWORD_REGISTRY.find(k => k.id === matchedRule.keywordId)
              : undefined) || findMatchingSymptomEntities(part)[0]
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
      const titleText = matchedRule.type === 'customer' 
        ? `[고객사: ${part}]` 
        : matchedRule.type === 'site' 
        ? `[현장/위치: ${part}]` 
        : matchedRule.type === 'model'
        ? `[장비모델: ${part}]`
        : matchedRule.type === 'action'
        ? `[조치사항: ${part}]` 
        : extractedNeg
        ? `[부정상태 추출: ${extractedNeg.stateSummary}]`
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
