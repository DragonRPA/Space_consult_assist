// 제조사((주)스페이스) 공식 매뉴얼 기반 장비군별 계기판 에러코드 사전 데이터 (SSOT)
import type { OfficialErrorCode } from './counselShared';

// ─────────────────────────────────────────────────────────────
// 제조사((주)스페이스) 공식 매뉴얼 기반 모델별 에러코드 및 알람 규격
// ─────────────────────────────────────────────────────────────

export const S3_S5_ERROR_CODES: OfficialErrorCode[] = [
  {
    code: '888',
    name: '자체 점검 (Self-Test)',
    category: '시스템',
    meaning: '키 스위치 ON 시 2초간 시스템 자체 점검 후 누적 사용 시간(Hour) 표시',
    call_script: '고객님, 키를 켤 때 888이 뜨는 것은 2초간 시스템 자체 점검이며, 이후 뜨는 숫자는 고장이 아닌 누적 사용 시간(Hour)입니다. 장비는 정상 작동 상태입니다.',
    resolution_type: 'RESOLVED',
    part_code: null,
    action_desc: '정상 동작 안내 후 상담 완료'
  },
  {
    code: '0-F',
    name: '폐수탱크 만수',
    category: '탱크/센서',
    meaning: '오수(폐수)탱크에 물이 가득 차 부표 플로트 센서 작동으로 흡입 모터 안전 차단',
    call_script: '고객님, 계기판의 0-F 코드는 오수탱크가 가득 찼다는 신호입니다. 오수 배출 호스로 물을 완전히 비우고 탱크 내부 부표망을 헹궈주시면 정상 작동합니다.',
    resolution_type: 'RESOLVED',
    part_code: 'FLOAT-VALVE-ASSY',
    action_desc: '오수 탱크 배출 및 부표망 청소 안내'
  },
  {
    code: '0-C',
    name: '세수탱크 물없음',
    category: '탱크/센서',
    meaning: '세수(정수)탱크 수위 저하로 펌프 및 밸브 보호를 위해 장비 안전 차단',
    call_script: '고객님, 계기판의 0-C 코드는 깨끗한 물(정수)이 떨어졌다는 알림입니다. 정수 탱크에 물을 보충해 주시면 즉시 정상 작동합니다.',
    resolution_type: 'RESOLVED',
    part_code: 'SOLENOID-VALVE-24V',
    action_desc: '세수탱크 물 보충 안내'
  },
  {
    code: '0-0',
    name: '배터리 저전압',
    category: '배터리',
    meaning: '배터리 잔량이 컷오프 전압 이하로 방전되어 BMS 저전압 셧다운',
    call_script: '고객님, 0-0 코드는 배터리가 완전 방전된 상태입니다. 장비 전원을 끄고 전용 충전기에 연결하여 최소 8시간 동안 완충해 주십시오.',
    resolution_type: 'RESOLVED',
    part_code: 'BATTERY-PACK-24V',
    action_desc: '전용 충전기 8시간 완충 사이클 안내'
  },
  {
    code: '1-0',
    name: '브러시 과부하',
    category: '브러시',
    meaning: '브러시 모터에 과부하가 걸려 서킷 브레이커(차단기) 트립 또는 모터 보호 차단',
    call_script: '고객님, 1-0 코드는 브러시에 이물질이 감겼을 때 뜹니다. 브러시를 떼어내고 회전축에 감긴 노끈이나 비닐을 제거한 뒤 후면 차단기 버튼을 딸깍 눌러주십시오.',
    resolution_type: 'RESOLVED',
    part_code: 'BRUSH-MOTOR-ASSY',
    action_desc: '브러시 이물 제거 및 차단기 리셋 안내'
  },
  {
    code: '1-5',
    name: '브러시 단락/합선',
    category: '브러시',
    meaning: '브러시 구동 모터 단락(합선) 및 과전류 차단',
    call_script: '고객님, 1-5 코드는 브러시 모터 내부 회로 보호를 위해 차단된 상태입니다. 무리하게 재가동하시면 모터 손상이 심해지므로 즉시 전원을 끄고 전문 엔지니어 출장 점검을 접수해 드리겠습니다.',
    resolution_type: 'VISIT_REQUIRED',
    part_code: 'BRUSH-MOTOR-ASSY',
    action_desc: '브러시 모터 어셈블리 교체 출장 접수'
  },
  {
    code: '1-H',
    name: '브러시 과열',
    category: '브러시',
    meaning: '브러시 모터 내부 온도가 과열 임계치 초과',
    call_script: '고객님, 1-H 코드는 브러시 모터 과열 상태입니다. 장비 전원을 끄고 통풍이 잘되는 곳에서 30분간 모터를 식힌 후 다시 켜주십시오.',
    resolution_type: 'RESOLVED',
    part_code: 'BRUSH-MOTOR-ASSY',
    action_desc: '30분 브러시 모터 냉각 안내'
  },
  {
    code: '2-0',
    name: '흡입 모터 과부하',
    category: '흡입',
    meaning: '흡입 모터에 공기 흐름 차단 또는 이물질 걸림으로 과부하 발생',
    call_script: '고객님, 2-0 코드는 흡입 모터 통로가 막혔다는 신호입니다. 흡입 호스와 오수 탱크 거름망 필터를 빼서 물로 깨끗이 헹군 뒤 재가동해 주십시오.',
    resolution_type: 'RESOLVED',
    part_code: 'VACUUM-MOTOR-ASSY',
    action_desc: '흡입 호스 및 필터 이물 청소 안내'
  },
  {
    code: '2-5',
    name: '흡입 모터 단락/합선',
    category: '흡입',
    meaning: '흡입 모터 내부 코일 합선 또는 침수로 인한 단락 차단',
    call_script: '고객님, 2-5 코드는 흡입 모터 침수 또는 쇼트로 인한 안전 차단입니다. 모터 파손 위험이 있으므로 전원을 켜지 마시고 모터 교체 출동을 접수해 드리겠습니다.',
    resolution_type: 'VISIT_REQUIRED',
    part_code: 'VACUUM-MOTOR-ASSY',
    action_desc: '흡입 모터 어셈블리 교체 출장 접수'
  },
  {
    code: '2-H',
    name: '흡입 모터 과열',
    category: '흡입',
    meaning: '흡입 모터 장시간 연속 가동 또는 필터 막힘으로 내부 과열',
    call_script: '고객님, 2-H 코드는 흡입 모터 과열 경보입니다. 오수 배출구 및 스퀴지 호스 막힘을 확인하시고 30분 이상 열을 식혀주십시오.',
    resolution_type: 'RESOLVED',
    part_code: 'VACUUM-MOTOR-ASSY',
    action_desc: '30분 흡입 모터 냉각 안내'
  },
  {
    code: '3-0',
    name: '세척수 펌프/밸브 과부하',
    category: '세척수',
    meaning: '세척수(솔레노이드) 밸브 또는 공급 펌프 과부하',
    call_script: '고객님, 3-0 코드는 물 공급 밸브에 물때나 모래가 끼었을 때 발생합니다. 세수탱크 하부 거름망 필터를 분리해 세척해 주십시오.',
    resolution_type: 'RESOLVED',
    part_code: 'SOLENOID-VALVE-24V',
    action_desc: '세수탱크 하부 필터 청소 안내'
  },
  {
    code: '3-5',
    name: '세척수 밸브 단락',
    category: '세척수',
    meaning: '솔레노이드 밸브 코일 단락 또는 액추에이터 고착 파손',
    call_script: '고객님, 3-5 코드는 전자 급수 밸브 코일 단락 상태입니다. 수동 급수 밸브를 잠그고 부품 교체 출동을 접수해 드리겠습니다.',
    resolution_type: 'VISIT_REQUIRED',
    part_code: 'SOLENOID-VALVE-24V',
    action_desc: '솔레노이드 밸브 부품 교체 출장 접수'
  },
  {
    code: '9-5',
    name: '키스위치/메인 퓨즈 단락',
    category: '전원/시스템',
    meaning: '키 스위치 입력 신호 이상 또는 메인 컨트롤러 전원 퓨즈 단락',
    call_script: '고객님, 9-5 코드는 키 스위치 신호 접촉 불량 또는 메인 퓨즈 단락입니다. 전원 잭을 뽑았다가 다시 꽉 꽂아보시고 계속 발생 시 출동을 접수해 드리겠습니다.',
    resolution_type: 'VISIT_REQUIRED',
    part_code: 'MAIN-FUSE-50A',
    action_desc: '메인 퓨즈 및 하네스 점검 출장 접수'
  }
];

export const S7P_ERROR_CODES: OfficialErrorCode[] = [
  ...S3_S5_ERROR_CODES.filter(c => c.code !== '9-5'),
  {
    code: '4-0',
    name: '경적(Horn) 과부하',
    category: '전장/안전',
    meaning: '혼 스위치 접점 고착 또는 경적 유닛 내부 코일 과부하',
    call_script: '고객님, 4-0 코드는 핸들의 경적 스위치가 눌려 있거나 코일 과부하 상태입니다. 핸들 혼 버튼을 가볍게 툭툭 쳐서 복귀시켜 주십시오.',
    resolution_type: 'RESOLVED',
    part_code: 'HORN-UNIT-24V',
    action_desc: '경적 스위치 복귀 및 결선 점검'
  },
  {
    code: '4-5',
    name: '경적 회로 단락',
    category: '전장/안전',
    meaning: '경적 배선 단락 또는 혼 유닛 내부 쇼트',
    call_script: '고객님, 4-5 코드는 경적 전기선 단락입니다. 주행에는 지장이 없으나 현장 안전을 위해 출장 수리를 접수해 드리겠습니다.',
    resolution_type: 'VISIT_REQUIRED',
    part_code: 'HORN-UNIT-24V',
    action_desc: '경적 유닛 및 배선 교체 접수'
  },
  {
    code: '6-0',
    name: '브러시 액추에이터 과부하',
    category: '리프팅',
    meaning: '브러시 데크 전동 리프트 모터 과부하 (하부 걸림/기계적 고착)',
    call_script: '고객님, 6-0 코드는 브러시를 올리고 내리는 모터에 바닥 턱이나 이물질이 걸린 상태입니다. 데크 하부에 돌이나 턱이 끼어있는지 확인해 주십시오.',
    resolution_type: 'RESOLVED',
    part_code: 'ACTUATOR-BRUSH-S7',
    action_desc: '브러시 데크 하부 이물 제거 및 재기동'
  },
  {
    code: '6-1',
    name: '브러시 액추에이터 단락',
    category: '리프팅',
    meaning: '브러시 전동 리프트 액추에이터 모터 단락/단선',
    call_script: '고객님, 6-1 코드는 브러시 상하 모터 내부 단락입니다. 전동 승하차가 불가능하므로 액추에이터 교체 출동을 접수해 드리겠습니다.',
    resolution_type: 'VISIT_REQUIRED',
    part_code: 'ACTUATOR-BRUSH-S7',
    action_desc: '브러시 리프트 액추에이터 교체 접수'
  },
  {
    code: '6-2',
    name: '스퀴지 액추에이터 과부하',
    category: '리프팅',
    meaning: '스퀴지 전동 리프트 모터 과부하 (스퀴지 걸림 또는 링크 고착)',
    call_script: '고객님, 6-2 코드는 후면 스퀴지 리프트 모터 과부하입니다. 후진 시 스퀴지가 턱에 걸렸거나 링크 부위에 이물질이 끼었는지 확인해 주십시오.',
    resolution_type: 'RESOLVED',
    part_code: 'ACTUATOR-SQ-S7',
    action_desc: '스퀴지 링크 청소 및 윤활 점검'
  },
  {
    code: '6-3',
    name: '스퀴지 액추에이터 단락',
    category: '리프팅',
    meaning: '스퀴지 전동 리프트 액추에이터 모터 단락/단선',
    call_script: '고객님, 6-3 코드는 스퀴지 상하 전동 모터 고장입니다. 스퀴지가 내려간 상태로 멈추면 바닥 손상 위험이 있으므로 엔지니어 출동을 접수해 드리겠습니다.',
    resolution_type: 'VISIT_REQUIRED',
    part_code: 'ACTUATOR-SQ-S7',
    action_desc: '스퀴지 리프트 액추에이터 교체 접수'
  },
  {
    code: '7-0',
    name: '세척수 보조 펌프 과부하',
    category: '세척수',
    meaning: '세척수 가압 분사 펌프 과부하 (노즐 막힘 또는 공회전)',
    call_script: '고객님, 7-0 코드는 물 분사 가압 펌프 막힘입니다. 물탱크 필터와 분사 호스 밸브를 열어 막힌 이물질을 빼내 주십시오.',
    resolution_type: 'RESOLVED',
    part_code: 'WATER-PUMP-24V',
    action_desc: '분사 펌프 및 필터 세척 안내'
  },
  {
    code: '7-2',
    name: '주행 모터 과부하/서밋',
    category: '주행',
    meaning: '트랜스액슬(주행 구동 모터) 과부하 또는 급경사 등판 과열',
    call_script: '고객님, 7-2 코드는 바퀴 주행 모터 과부하입니다. 급경사로 주행이나 무거운 짐 견인을 중단하시고 평지에서 20분간 모터를 식혀주십시오.',
    resolution_type: 'RESOLVED',
    part_code: 'DRIVE-MOTOR-S7',
    action_desc: '평지 20분 냉각 및 과적 제거 안내'
  },
  {
    code: '7-5',
    name: '주행 컨트롤러 통신 불량',
    category: '주행/통신',
    meaning: 'CAN 통신선 접촉 불량 또는 커티스(Curtis) 컨트롤러 통신 두절',
    call_script: '고객님, 7-5 코드는 메인 컴퓨터와 주행 컨트롤러 간 통신 이상입니다. 배터리 메인 앤더슨 커넥터를 뺐다 꽉 꽂아보시고 지속 시 점검을 접수해 드리겠습니다.',
    resolution_type: 'VISIT_REQUIRED',
    part_code: 'CURTIS-CONTROLLER-S7',
    action_desc: '주행 컨트롤러 하네스 교체 접수'
  },
  {
    code: '9-5',
    name: '메인 전원 제어반 퓨즈 단락',
    category: '전원/시스템',
    meaning: '키 스위치 또는 메인 제어반 파워 퓨즈 단락',
    call_script: '고객님, 9-5 코드는 전원 회로 차단입니다. 시트 하단 퓨즈 박스에서 50A 메인 퓨즈 상태를 확인해 주십시오.',
    resolution_type: 'VISIT_REQUIRED',
    part_code: 'MAIN-FUSE-S7',
    action_desc: '메인 전원 제어반 출장 점검 접수'
  },
  {
    code: '9-E',
    name: '가속 페달 중립 불량',
    category: '주행/안전',
    meaning: '키 ON 시 발 페달(Potentiometer)이 눌려있거나 영점 복귀 불량',
    call_script: '고객님, 9-E 코드는 시동을 걸 때 발 페달이 눌려있어 급출발 방지를 위해 차단된 것입니다. 발을 떼고 페달이 완전히 올라온 상태에서 키를 다시 켜주십시오.',
    resolution_type: 'RESOLVED',
    part_code: 'PEDAL-POTENTIOMETER',
    action_desc: '발 페달 중립 위치 확인 및 재시동'
  },
  {
    code: 'E-0',
    name: '브러시 가압 발판 고착',
    category: '브러시/조작',
    meaning: '브러시 가압 페달 마이크로스위치 단락 또는 물리적 고착',
    call_script: '고객님, E-0 코드는 브러시 압력 페달 스위치가 눌린 채 올라오지 않은 상태입니다. 우측 하단 발판을 발로 톡 쳐서 원위치로 올려주십시오.',
    resolution_type: 'RESOLVED',
    part_code: 'PRESSURE-FOOT-SWITCH',
    action_desc: '가압 발판 물리적 복귀 조치 안내'
  },
  {
    code: 'E-1',
    name: '비상정지 스위치 락 잠김',
    category: '안전',
    meaning: '비상정지(E-Stop) 버섯형 버튼이 눌려 전원 차단 상태',
    call_script: '고객님, E-1 코드는 빨간색 비상정지 버튼이 눌려있는 상태입니다. 빨간 버튼을 오른쪽(시계방향)으로 살짝 돌려주시면 딸깍 튀어나오며 정상 작동합니다.',
    resolution_type: 'RESOLVED',
    part_code: null,
    action_desc: '비상정지 버튼 시계방향 회전 해제'
  }
];

export const S12_ERROR_CODES: OfficialErrorCode[] = [
  {
    code: 'SOLUTION TANK EMPTY',
    name: '세수탱크 물 부족 (정수 소진)',
    category: '탱크/센서',
    meaning: '깨끗한 물(정수) 탱크 수위 센서 감지 레벨 이하로 소진',
    call_script: '고객님, LCD 화면의 "SOLUTION TANK EMPTY" 표시는 세수탱크 물이 떨어진 상태입니다. 깨끗한 물을 보충해 주시면 즉시 작업이 재개됩니다.',
    resolution_type: 'RESOLVED',
    part_code: 'WATER-LEVEL-SENSOR-S12',
    action_desc: '세수탱크 정수 급수 안내'
  },
  {
    code: 'RECOVERY TANK FULL',
    name: '오수탱크 만수 (폐수 가득참)',
    category: '탱크/센서',
    meaning: '오수탱크 전자 수위 프로브 만수 감지 -> 흡입 모터 안전 차단',
    call_script: '고객님, LCD의 "RECOVERY TANK FULL"은 오수가 가득 찼다는 경보입니다. 좌측 하단 대형 배출 호스로 오수를 비워주십시오.',
    resolution_type: 'RESOLVED',
    part_code: 'LEVEL-PROBE-S12',
    action_desc: '오수탱크 배출 및 레벨 센서 세척'
  },
  {
    code: 'BRUSH MOTOR OVERLOAD',
    name: '브러시 모터 과부하 트립',
    category: '브러시',
    meaning: '듀얼 500mm 브러시 모터에 과부하가 걸려 소프트웨어 전류 차단',
    call_script: '고객님, 브러시에 로프나 전선이 감겼을 때 나타납니다. 브러시 자동탈착 버튼을 눌러 브러시를 떼고 회전축 이물을 제거해 주십시오.',
    resolution_type: 'RESOLVED',
    part_code: 'BRUSH-MOTOR-36V-S12',
    action_desc: '브러시 자동분리 후 이물질 제거'
  },
  {
    code: 'BRUSH MOTOR TEMP PAUSE',
    name: '브러시 모터 과열 일시 정지',
    category: '브러시',
    meaning: '연속 가동으로 브러시 드라이브 온도 90도 초과 보호 정지',
    call_script: '고객님, 브러시 모터 온도가 높아 일시 정지된 상태입니다. 시동을 끄고 약 25분간 열을 식힌 후 재기동해 주십시오.',
    resolution_type: 'RESOLVED',
    part_code: 'BRUSH-MOTOR-36V-S12',
    action_desc: '모터 냉각 25분 대기 안내'
  },
  {
    code: 'VACUUM MOTOR OVERLOAD',
    name: '흡입 모터 과부하 트립',
    category: '흡입',
    meaning: '흡입 모터 흡기압 과다 또는 거름망 막힘으로 과부하 차단',
    call_script: '고객님, 흡입 필터 또는 스퀴지 목 호스가 이물질로 막혔습니다. 오수탱크 내부 원뿔형 필터를 물세척해 주십시오.',
    resolution_type: 'RESOLVED',
    part_code: 'VACUUM-MOTOR-36V-S12',
    action_desc: '흡입 원뿔 필터 세척 및 호스 관통'
  },
  {
    code: 'BATTERY FLAT STOP',
    name: '배터리 방전 보호 전체 정지',
    category: '배터리',
    meaning: '36V 대용량 배터리 전압이 컷오프 전압(31.5V) 이하로 강하',
    call_script: '고객님, 배터리가 완전 방전되었습니다. 즉시 전용 36V 30A 고주파 충전기를 연결하여 10시간 완충 사이클을 진행해 주십시오.',
    resolution_type: 'RESOLVED',
    part_code: 'BATTERY-36V-310AH',
    action_desc: '36V 전용 충전기 완충 사이클 안내'
  },
  {
    code: 'PLEASE SIT UP',
    name: '운전자 시트 미감지 (안전 연동)',
    category: '안전/조작',
    meaning: '운전석 시트 스위치(Seat Sensor) 접점 오픈 상태에서 페달 조작',
    call_script: '고객님, 운전석 시트의 안전 센서가 운전자를 감지하지 못했습니다. 의자 깊숙이 앉아 체중을 실어주시면 정상 주행이 가능합니다.',
    resolution_type: 'RESOLVED',
    part_code: 'SEAT-SWITCH-S12',
    action_desc: '시트 착석 위치 교정 및 센서 커넥터 점검'
  },
  {
    code: 'ACTUATOR TIMEOUT',
    name: '액추에이터 리프트 타임아웃',
    category: '리프팅',
    meaning: '브러시 또는 스퀴지 리프팅 액추에이터가 10초 내 목표 위치 도달 실패',
    call_script: '고객님, 리프팅 장치에 물리적 걸림이 발생했습니다. 데크 주변에 이물질이 끼어있는지 확인하시고 지속 시 엔지니어 점검을 접수해 드리겠습니다.',
    resolution_type: 'VISIT_REQUIRED',
    part_code: 'ACTUATOR-HEAVY-S12',
    action_desc: '액추에이터 기어 및 리미트 스위치 출장 점검'
  }
];

export const JINCLEAN_ERROR_CODES: OfficialErrorCode[] = [
  {
    code: '전압 22.0V 이하',
    name: '배터리 저전압 경보 (볼트미터)',
    category: '배터리/전압',
    meaning: '실시간 볼트미터 22.0V 이하 표시 및 부저음 -> 21.0V 도달 시 자동 셧다운',
    call_script: '고객님, 볼트미터에 22V 이하로 숫자가 뜨면 배터리가 거의 다 된 것입니다. 장비 전원을 끄고 즉시 충전기에 연결해 주십시오.',
    resolution_type: 'RESOLVED',
    part_code: 'BATTERY-12V-2EA',
    action_desc: '충전기 연결 및 완충 사이클 안내'
  },
  {
    code: '전압 25.5V 이상',
    name: '충전기 과전압 감지 (볼트미터)',
    category: '배터리/전압',
    meaning: '충전 중 또는 충전 직후 26.5V 초과 시 계기판 보호 알람',
    call_script: '고객님, 충전 직후에는 일시적으로 26V 이상 뜰 수 있으나 정상입니다. 키를 켜고 5분 정도 지나면 안정적인 25V대로 내려옵니다.',
    resolution_type: 'RESOLVED',
    part_code: null,
    action_desc: '충전 직후 안정화 현상 안내'
  },
  {
    code: '흡입 퓨즈 단락',
    name: '흡입 모터 퓨즈 단락 (40A)',
    category: '전원/퓨즈',
    meaning: '오수탱크 하부 퓨즈함 내 40A 블레이드 퓨즈 단락 -> 흡입 모터 무반응',
    call_script: '고객님, 오수탱크를 옆으로 제끼면 나오는 퓨즈함에서 40A 녹색 퓨즈가 끊어졌는지 확인하시고, 여분 퓨즈로 교체해 주십시오.',
    resolution_type: 'RESOLVED',
    part_code: 'FUSE-BLADE-40A',
    action_desc: '하부 퓨즈함 40A 퓨즈 교체 안내'
  },
  {
    code: '브러시 퓨즈 단락',
    name: '브러시 모터 퓨즈 단락 (50A)',
    category: '전원/퓨즈',
    meaning: '브러시 회전 과부하로 인한 50A 메인 볼트온/블레이드 퓨즈 용단',
    call_script: '고객님, 브러시가 갑자기 안 돌면 하부 퓨즈함의 50A 붉은색 퓨즈를 확인해 주십시오. 브러시에 감긴 노끈을 먼저 푼 뒤 교체해야 합니다.',
    resolution_type: 'RESOLVED',
    part_code: 'FUSE-BLADE-50A',
    action_desc: '브러시 이물 제거 및 50A 퓨즈 교체'
  },
  {
    code: '역류방지볼 흡입 차단',
    name: '역류방지 플로트볼 흡입 차단',
    category: '흡입/탱크',
    meaning: '오수가 찼거나 급회전 시 플로트볼이 입구를 막아 모터 굉음 발생',
    call_script: '고객님, 모터 소리만 웽 하고 커지고 물이 안 빨리면 오수탱크 뚜껑 안쪽의 하얀색 부표 볼이 위로 붙은 것입니다. 오수를 비워주시면 복구됩니다.',
    resolution_type: 'RESOLVED',
    part_code: 'FLOAT-CAGE-BALL',
    action_desc: '오수 배출 및 플로트볼 하강 복원'
  },
  {
    code: '세수배관 막힘',
    name: '세수 스트레이너 거름망 막힘',
    category: '세척수',
    meaning: '세수 밸브를 열어도 물이 안 나옴 -> 하부 투명 스트레이너 이물질 고착',
    call_script: '고객님, 장비 우측 하단의 투명한 세수 필터 컵을 돌려 빼서 그물망에 낀 모래와 물때를 수돗물로 헹궈내 주십시오.',
    resolution_type: 'RESOLVED',
    part_code: 'WATER-STRAINER-1/2',
    action_desc: '투명 스트레이너 분리 세척 안내'
  },
  {
    code: '브러시 결합 불량',
    name: '브러시 커플러 클러치 탈락',
    category: '브러시',
    meaning: '브러시 모터는 도는데 브러시 패드가 헛돌거나 빠짐',
    call_script: '고객님, 브러시 결합 날개(알루미늄 커플러)가 마모되었거나 락이 덜 걸렸습니다. 데크를 올린 뒤 손으로 브러시를 시계 반대방향으로 꽉 체결해 주십시오.',
    resolution_type: 'RESOLVED',
    part_code: 'BRUSH-COUPLER-J600',
    action_desc: '브러시 커플러 재결합 및 마모 확인'
  },
  {
    code: '키스위치 무반응',
    name: '메인 앤더슨 단자 결속 불량',
    category: '전원/시스템',
    meaning: '키를 켜도 볼트미터 화면이 전혀 안 켜짐 -> 배터리 커넥터 접촉 불량',
    call_script: '고객님, 배터리와 본체를 연결하는 붉은색 메인 앤더슨 잭이 헐겁게 꽂혀있는지 뺐다가 딸깍 소리가 나도록 다시 꽉 꽂아주십시오.',
    resolution_type: 'RESOLVED',
    part_code: 'ANDERSEN-PLUG-50A',
    action_desc: '메인 전원 앤더슨 플러그 결속 확인'
  }
];

export const SWEEPER_ERROR_CODES: OfficialErrorCode[] = [
  {
    code: '배터리 적색 LED',
    name: '배터리 전압 부족 경보 (3색 인디케이터)',
    category: '배터리',
    meaning: '인디케이터가 녹색에서 적색으로 바뀌며 점멸 -> 차단 임박',
    call_script: '고객님, 배터리 표시등이 빨간색으로 깜빡이면 방전 경고입니다. 작업을 중단하고 즉시 충전 구역으로 이동하여 충전해 주십시오.',
    resolution_type: 'RESOLVED',
    part_code: 'BATTERY-PACK-24V',
    action_desc: '충전 구역 이동 및 완충 안내'
  },
  {
    code: '메인 브러시 차단기 팝업',
    name: '메인 롤러브러시 차단기 팝업 (트립)',
    category: '브러시',
    meaning: '바닥 롤러 브러시에 노끈이나 철사 걸림 -> 서킷 브레이커 버튼 튀어나옴',
    call_script: '고객님, 콘솔 우측의 차단기 검정 버튼이 툭 튀어나왔는지 확인하십시오. 하부 롤러에 감긴 이물질을 가위로 잘라낸 뒤 버튼을 눌러주십시오.',
    resolution_type: 'RESOLVED',
    part_code: 'ROLLER-BRUSH-W12',
    action_desc: '롤러브러시 이물 제거 및 서킷브레이커 리셋'
  },
  {
    code: '사이드 브러시 차단기 팝업',
    name: '측면 사이드브러시 차단기 팝업 (트립)',
    category: '브러시',
    meaning: '사이드 브러시 모터 과부하 -> 서킷 브레이커 차단',
    call_script: '고객님, 양쪽 사이드 브러시에 비닐이나 노끈이 감겨 차단기가 튀어나왔습니다. 이물을 제거하고 차단기 버튼을 다시 눌러주십시오.',
    resolution_type: 'RESOLVED',
    part_code: 'SIDE-BRUSH-W12',
    action_desc: '사이드 브러시 이물 제거 및 차단기 리셋'
  },
  {
    code: '진동 모터 필터 막힘',
    name: '더스트 필터 쉐이커 막힘',
    category: '필터/흡진',
    meaning: '먼지 털이 진동 모터(쉐이커) 미작동 또는 주름필터 먼지 포화',
    call_script: '고객님, 콘솔의 필터 쉐이커 버튼을 10초간 눌러 필터 먼지를 털어주시고, 흡입력이 약하면 호퍼 내부 패널 필터를 에어건으로 청소해 주십시오.',
    resolution_type: 'RESOLVED',
    part_code: 'PANEL-FILTER-W12',
    action_desc: '필터 쉐이커 10초 가동 및 에어건 청소'
  },
  {
    code: '호퍼 만차 경보',
    name: '먼지 수거 호퍼 만차 경보',
    category: '호퍼/센서',
    meaning: '70L 후면 집진 호퍼 내부에 쓰레기가 가득 차 센서 감지',
    call_script: '고객님, 먼지통(호퍼)이 가득 찼다는 부저음입니다. 호퍼 잠금 레버를 풀고 쓰레기통을 꺼내 비워주십시오.',
    resolution_type: 'RESOLVED',
    part_code: 'HOPPER-ASSY-W12',
    action_desc: '호퍼 분리 및 쓰레기 배출 안내'
  },
  {
    code: '살수 펌프 노즐 막힘',
    name: '살수 펌프/스프레이 노즐 막힘',
    category: '살수/방진',
    meaning: '먼지 날림 방지용 전면 미스트 살수 노즐에 석회질 막힘',
    call_script: '고객님, 전면 물안개 노즐 끝을 핀이나 바늘로 찔러 뚫어주시고, 물탱크 거름망을 세척해 주십시오.',
    resolution_type: 'RESOLVED',
    part_code: 'MIST-NOZZLE-W12',
    action_desc: '노즐 관통 및 살수 탱크 청소 안내'
  }
];

export const ROBOT_ERROR_CODES: OfficialErrorCode[] = [
  {
    code: 'LIDAR SENSOR BLOCKED',
    name: '라이다 센서 시야 차단',
    category: '센서/내비게이션',
    meaning: 'LiDAR 상단 센서 렌즈에 먼지나 오염 물질이 묻어 360도 맵핑 불가',
    call_script: '고객님, 로봇 상단의 회전하는 라이다 센서 유리창을 극세사 천으로 부드럽게 닦아주시면 즉시 자율주행이 재개됩니다.',
    resolution_type: 'RESOLVED',
    part_code: 'LIDAR-SENSOR-ASSY',
    action_desc: '라이다 센서 글라스 청소 안내'
  },
  {
    code: 'EMERGENCY STOP PRESSED',
    name: '비상정지 스위치 체결',
    category: '안전',
    meaning: '후면 빨간색 비상정지 버튼이 눌려 모든 주행/작동 하드웨어 차단',
    call_script: '고객님, 비상정지 버튼이 눌려있습니다. 버튼을 시계 방향으로 돌려 딸깍 소리가 나며 튀어나오게 해 주십시오.',
    resolution_type: 'RESOLVED',
    part_code: null,
    action_desc: '비상정지 버튼 회전 복귀'
  },
  {
    code: 'PATH OBSTRUCTED',
    name: '주행 경로 장애물 연속 감지',
    category: '주행/센서',
    meaning: '지정 경로 상에 예상치 못한 박스나 팔레트 등 장애물 감지로 대기',
    call_script: '고객님, 로봇 앞 1미터 이내에 놓인 장애물을 치워주시거나 화면의 [우회 주행] 버튼을 터치해 주십시오.',
    resolution_type: 'RESOLVED',
    part_code: null,
    action_desc: '장애물 제거 및 우회 주행 터치 안내'
  },
  {
    code: 'DOCKING FAILED',
    name: '충전 스테이션 도킹 실패',
    category: '충전/도킹',
    meaning: '워크스테이션 진입 시 마커 인식 또는 충전 패드 접점 정렬 불량',
    call_script: '고객님, 스테이션 충전 전극 패드에 이물질이 없는지 마른걸레로 닦아주시고 수동 조작으로 전극에 밀착시켜 주십시오.',
    resolution_type: 'RESOLVED',
    part_code: 'CHARGING-STATION-ROBOT',
    action_desc: '충전 스테이션 패드 청소 및 수동 정렬'
  },
  {
    code: 'RECOVERY TANK FULL',
    name: '오수탱크 만수 차단',
    category: '탱크/센서',
    meaning: '내부 24L 오수탱크 만수 감지 -> 스테이션 자동 복귀 또는 작업 일시중지',
    call_script: '고객님, 오수탱크가 가득 찼습니다. 워크스테이션 자동 배출 또는 수동 호스로 물을 비워주십시오.',
    resolution_type: 'RESOLVED',
    part_code: 'TANK-SENSOR-ROBOT',
    action_desc: '오수 배출 및 필터 청소'
  },
  {
    code: 'CLEAN TANK EMPTY',
    name: '세수탱크 물없음 차단',
    category: '탱크/센서',
    meaning: '내부 24L 세수탱크 정수 고갈 -> 바닥 손상 방지 위해 브러시 정지',
    call_script: '고객님, 세수탱크 물이 떨어졌습니다. 깨끗한 물을 채워주시면 지정된 구역 세정을 계속 진행합니다.',
    resolution_type: 'RESOLVED',
    part_code: 'WATER-TANK-ROBOT',
    action_desc: '세수탱크 급수 안내'
  }
];

export const MODEL_OFFICIAL_ERROR_CODES: Record<string, OfficialErrorCode[]> = {
  'S3': S3_S5_ERROR_CODES,
  'S5': S3_S5_ERROR_CODES,
  'S1': S3_S5_ERROR_CODES,
  'S2': S3_S5_ERROR_CODES,
  'S7': S7P_ERROR_CODES,
  'S7P': S7P_ERROR_CODES,
  'S12': S12_ERROR_CODES,
  'J600T': JINCLEAN_ERROR_CODES,
  'J800': JINCLEAN_ERROR_CODES,
  'W12': SWEEPER_ERROR_CODES,
  'W15': SWEEPER_ERROR_CODES,
  '쓰담': ROBOT_ERROR_CODES
};

export function getModelErrorCodes(modelName?: string): OfficialErrorCode[] {
  if (!modelName || modelName.trim() === '전체' || modelName.trim() === '') {
    return S3_S5_ERROR_CODES;
  }
  const target = modelName.trim().toUpperCase();
  if (MODEL_OFFICIAL_ERROR_CODES[target]) {
    return MODEL_OFFICIAL_ERROR_CODES[target];
  }
  for (const [k, v] of Object.entries(MODEL_OFFICIAL_ERROR_CODES)) {
    if (k.toUpperCase().includes(target) || target.includes(k.toUpperCase())) {
      return v;
    }
  }
  return S3_S5_ERROR_CODES;
}

export function getModelErrorCodePanelTitle(modelName?: string, count?: number): string {
  const c = count !== undefined ? ` (${count}종)` : '';
  if (!modelName || modelName === '전체') {
    return `계기판 에러 코드${c}`;
  }
  const m = modelName.toUpperCase();
  if (m.includes('J600') || m.includes('J800')) {
    return `${modelName} 전압 및 고장 알람${c}`;
  }
  if (m.includes('S12')) {
    return `${modelName} LCD 텍스트 알람${c}`;
  }
  if (m.includes('S7') || m.includes('S7P')) {
    return `${modelName} 계기판 에러 코드${c}`;
  }
  if (m.includes('W12') || m.includes('W15')) {
    return `${modelName} LED 및 차단기 경보${c}`;
  }
  if (m.includes('쓰담')) {
    return `${modelName} AI 센서 및 시스템 알람${c}`;
  }
  return `${modelName} 계기판 에러 코드${c}`;
}

export const DEFAULT_OFFICIAL_ERROR_CODES: OfficialErrorCode[] = S3_S5_ERROR_CODES;



