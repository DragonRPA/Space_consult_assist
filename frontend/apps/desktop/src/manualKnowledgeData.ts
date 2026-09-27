// Auto-generated fallback data for client-side offline / Vercel deployment
import type { DiagnosticStep } from './CounselAssistV2';

export interface ModelSpec {
  model_name: string;
  category: string;
  clean_tank_l: number;
  recovery_tank_l: number;
  brush_spec: string;
  squeegee_width_mm: number;
  battery_spec: string;
  run_time: string;
  clean_area_m2h: string;
  weight_kg: number;
  fuse_location: string;
  key_consumables: string;
}

export interface SpecialGuide {
  id: string;
  category: string;
  title: string;
  target_situation: string;
  operation_steps: string[];
  call_script: string;
}

export interface OfficialErrorCode {
  code: string;
  name: string;
  category: string;
  meaning: string;
  call_script: string;
  resolution_type: 'RESOLVED' | 'VISIT_REQUIRED';
  part_code?: string | null;
  action_desc: string;
}

export interface SymptomPreset {
  id?: string;
  title: string;
  category: string;
  urgency: '긴급' | '보통';
  symptom: string;
  call_script?: string;
  part_code?: string;
  steps?: DiagnosticStep[];
  official_error_codes?: OfficialErrorCode[];
  aliases?: string[];
  action_plan?: {
    keyword?: string;
    part_code?: string;
    urgency?: string;
    can_self_resolve?: boolean;
    call_script?: string;
    steps?: DiagnosticStep[];
  };
  [key: string]: any;
}

export const DEFAULT_MODEL_SPECS: Record<string, ModelSpec> = {
  "J600T": {
    "model_name": "J600T (JINCLEAN6)",
    "category": "보행식 습식",
    "clean_tank_l": 55,
    "recovery_tank_l": 65,
    "brush_spec": "560mm (22인치) 155rpm / 550W",
    "squeegee_width_mm": 825,
    "battery_spec": "24V 100Ah (무보수/납산)",
    "run_time": "2 ~ 3시간",
    "clean_area_m2h": "3,300 ㎡/h",
    "weight_kg": 150,
    "fuse_location": "오수탱크 후크 해제 틸팅 후 하부 퓨즈함 커버 (모터 보호 퓨즈)",
    "key_consumables": "22인치 패드/디스크브러시, 825mm 스퀴지고무, 38mm 흡입호스"
  },
  "J800": {
    "model_name": "J800 (JINCLEAN8)",
    "category": "탑승식 습식",
    "clean_tank_l": 138,
    "recovery_tank_l": 140,
    "brush_spec": "830mm (듀얼 350W*2) / 600W 흡입",
    "squeegee_width_mm": 1190,
    "battery_spec": "24V 200Ah",
    "run_time": "4 ~ 5시간",
    "clean_area_m2h": "6,500 ㎡/h",
    "weight_kg": 380,
    "fuse_location": "운전석 시트 하단 배터리룸 서킷브레이커 & 메인 차단기",
    "key_consumables": "16인치 듀얼 패드, 1,190mm 스퀴지고무, 140L 오수탱크 가스켓"
  },
  "S7": {
    "model_name": "S7P / The New S7P",
    "category": "탑승식 습식",
    "clean_tank_l": 105,
    "recovery_tank_l": 110,
    "brush_spec": "560mm (22인치) 150rpm / 600W 주행",
    "squeegee_width_mm": 1120,
    "battery_spec": "24V 242Ah(납산) / 105Ah·160Ah(리튬)",
    "run_time": "3.5 ~ 4.5시간",
    "clean_area_m2h": "5,500 ㎡/h",
    "weight_kg": 367,
    "fuse_location": "시트 하단 배터리룸 차단기 및 제어반 브러시 자동착탈 버튼",
    "key_consumables": "22인치 패드, 1,120mm 스퀴지 블레이드, 24V 솔레노이드밸브"
  },
  "S5": {
    "model_name": "S5",
    "category": "소형 탑승식 습식",
    "clean_tank_l": 70,
    "recovery_tank_l": 70,
    "brush_spec": "560mm (22인치) 155rpm / 380W 흡입",
    "squeegee_width_mm": 705,
    "battery_spec": "24V 155Ah",
    "run_time": "3 ~ 3.5시간",
    "clean_area_m2h": "3,800 ㎡/h",
    "weight_kg": 162,
    "fuse_location": "오수탱크 틸팅 하단 퓨즈함 커버",
    "key_consumables": "22인치 브러시, 705mm 스퀴지, 70L 세수/폐수 탱크"
  },
  "S3": {
    "model_name": "S3 / S3mini",
    "category": "보행식 습식",
    "clean_tank_l": 40,
    "recovery_tank_l": 45,
    "brush_spec": "500mm (20인치) 155rpm",
    "squeegee_width_mm": 815,
    "battery_spec": "24V AGM 70Ah",
    "run_time": "2 ~ 3시간",
    "clean_area_m2h": "2,200 ㎡/h",
    "weight_kg": 128,
    "fuse_location": "오수탱크 후크 해제 틸팅 후 하부 퓨즈함 커버(A)",
    "key_consumables": "20인치 패드/브러시, 815mm 스퀴지고무, 세수탱크 하부필터"
  },
  "S1": {
    "model_name": "S1 (초소형 보행식)",
    "category": "보행식 습식",
    "clean_tank_l": 15,
    "recovery_tank_l": 18,
    "brush_spec": "380mm (15인치)",
    "squeegee_width_mm": 450,
    "battery_spec": "24V 50Ah 리튬",
    "run_time": "1.5 ~ 2시간",
    "clean_area_m2h": "1,500 ㎡/h",
    "weight_kg": 65,
    "fuse_location": "본체 측면 인라인 퓨즈 홀더",
    "key_consumables": "15인치 패드, 450mm 스퀴지 립"
  },
  "W12": {
    "model_name": "W12 (탑승 건식 스위퍼)",
    "category": "탑승식 건식",
    "clean_tank_l": 0,
    "recovery_tank_l": 70,
    "brush_spec": "메인 700mm / 사이드 450mm (합계 950mm)",
    "squeegee_width_mm": 0,
    "battery_spec": "24V 242Ah",
    "run_time": "3 ~ 4시간",
    "clean_area_m2h": "7,000 ㎡/h",
    "weight_kg": 410,
    "fuse_location": "전면 보닛(B-5) 내부 기능별 푸시버튼 서킷브레이커",
    "key_consumables": "700mm 롤러브러시, 450mm 사이드브러시, 4㎡ 원형 필터"
  },
  "W15": {
    "model_name": "W15 (대형 건식 스위퍼)",
    "category": "탑승식 건식",
    "clean_tank_l": 45,
    "recovery_tank_l": 135,
    "brush_spec": "메인 710mm / 주행 1500W / 등판 25%",
    "squeegee_width_mm": 0,
    "battery_spec": "36V 242Ah",
    "run_time": "4 ~ 5시간",
    "clean_area_m2h": "10,500 ㎡/h",
    "weight_kg": 660,
    "fuse_location": "전면 보닛 내부 기능별 푸시버튼 서킷브레이커",
    "key_consumables": "710mm 롤러브러시, 5㎡ 플리츠 필터, 비산먼지 차단 고무"
  },
  "S2": {
    "model_name": "S2 (소형 보행식)",
    "category": "보행식 습식",
    "clean_tank_l": 22,
    "recovery_tank_l": 25,
    "brush_spec": "470mm (18인치) 150rpm",
    "squeegee_width_mm": 530,
    "battery_spec": "24V 무보수",
    "run_time": "1.5 ~ 2시간",
    "clean_area_m2h": "1,600 ㎡/h",
    "weight_kg": 101,
    "fuse_location": "오수탱크 틸팅 후 하부 퓨즈함",
    "key_consumables": "18인치 패드, 530mm 스퀴지 립"
  },
  "S12": {
    "model_name": "S12 (대형 탑승식)",
    "category": "탑승식 습식",
    "clean_tank_l": 140,
    "recovery_tank_l": 180,
    "brush_spec": "500mm × 2EA (듀얼 1,000mm) / 670W 흡입",
    "squeegee_width_mm": 1120,
    "battery_spec": "36V 310Ah",
    "run_time": "4 ~ 5시간",
    "clean_area_m2h": "7,500 ㎡/h",
    "weight_kg": 560,
    "fuse_location": "컨트롤박스 내부 메인 차단기",
    "key_consumables": "20인치 듀얼 패드, 1,120mm 스퀴지 고무, 36V 구동모터"
  },
  "쓰담": {
    "model_name": "쓰담 (자율주행 청소로봇)",
    "category": "스마트 로봇",
    "clean_tank_l": 24,
    "recovery_tank_l": 24,
    "brush_spec": "400mm 롤러브러시",
    "squeegee_width_mm": 500,
    "battery_spec": "24V 리튬 60Ah",
    "run_time": "3 ~ 4시간",
    "clean_area_m2h": "1,800 ㎡/h",
    "weight_kg": 85,
    "fuse_location": "상단 유지보수 해치 내부 BMS 리셋 스위치",
    "key_consumables": "LiDAR 센서 보호커버, 400mm 롤러, 마이크로파이버 패드"
  }
};

export const DEFAULT_SPECIAL_GUIDES: SpecialGuide[] = [
  {
    "id": "GUIDE_BRUSH_AUTO",
    "category": "브러시/패드",
    "title": "브러시 자동 착탈",
    "target_situation": "브러시 분리가 안 되거나 장착 시 힘이 많이 들 때",
    "operation_steps": [
      "1. [보행식(S3/S5/J600T)]: 브러시 데크를 페달로 올린 상태에서 작동 레버를 순간적으로 '당겼다 탁 놓으면' 관성으로 자동 이탈.",
      "2. [장착 시]: 브러시를 데크 정중앙 바닥에 놓고 데크를 내린 후, 레버를 2~3초 당기면 모터가 회전하며 원터치 결합.",
      "3. [탑승식(S7P/S12)]: 제어반의 '브러시 자동착탈 버튼' 1회 누름으로 자동 분리 및 체결.",
      "4. ※ 주의: 브러시가 중앙에 맞지 않은 상태에서 무리하게 돌리면 모터 결합부 커플러 파손 위험."
    ],
    "call_script": "고객님, 손으로 힘줘서 떼지 마시고, 브러시를 공중에 띄운 상태에서 작동 레버를 순간적으로 당겼다 놓으시면 브러시가 아래로 툭 떨어지며 자동으로 분리됩니다."
  },
  {
    "id": "GUIDE_ANTI_FOAM",
    "category": "세제/모터보호",
    "title": "소포제 투입 및 침수 방지",
    "target_situation": "모터에서 탄내가 나거나 오수 흡입 시 거품이 일어날 때",
    "operation_steps": [
      "1. 일반 주방세제/퐁퐁/고기포 세제는 절대 사용 금지 (거품이 플로트망을 뚫고 흡입 모터로 직행하여 코일 소손).",
      "2. 바닥 청소 전용 '저기포성 액상 중성세제'만을 정량 희석하여 세수탱크에 투입.",
      "3. 왁스 박리 현장이나 오염 바닥 작업 전, 반드시 '오수탱크 내부에 소포제(Anti-foam) 종이컵 1~2컵 사전 투입'.",
      "4. 만약 모터에서 연기나 탄 냄새가 나면 즉시 전원을 끄고 물기가 마를 때까지 재가동 절대 금지."
    ],
    "call_script": "고객님, 일반 거품 세제는 거품이 모터로 빨려 들어가 모터를 태워버립니다. 반드시 바닥 전용 중성세제를 쓰시고, 오수탱크 안에 소포제를 한 컵 미리 넣어주십시오."
  },
  {
    "id": "GUIDE_WINTER_DRAIN",
    "category": "동파/보관",
    "title": "동파 방지 및 퇴수",
    "target_situation": "동절기(11월~3월) 보관 및 장기간 미사용 시",
    "operation_steps": [
      "1. [세수탱크 완전 퇴수]: 세수탱크 하부 배수 밸브(Drain Plug)를 열어 100% 물을 배출 (솔레노이드 밸브 동파 파손 1위 방지).",
      "2. [세수 필터 분리]: 세수탱크 하단 필터 캡을 풀어 내부 고인 물을 완전히 비우고 재조립.",
      "3. [스퀴지/브러시 리프트]: 바닥에 닿은 채 얼지 않도록 반드시 레버나 페달로 리프트 상승 상태 보관.",
      "4. [배터리 자연방전 방지]: 배터리 메인 앤더슨 잭을 분리하고, 미사용 시에도 최소 월 1회 완전 완충."
    ],
    "call_script": "고객님, 영하의 날씨에는 세수탱크 아래쪽 배수 밸브를 열어 남아있는 물을 100% 다 빼주셔야 밸브가 얼어 터지는 것을 막을 수 있습니다."
  },
  {
    "id": "GUIDE_BRAKE_TOW",
    "category": "비상견인",
    "title": "전자 브레이크 해제 및 견인",
    "target_situation": "배터리 방전으로 탑승 장비가 멈춰서 안 움직일 때",
    "operation_steps": [
      "1. 탑승식 장비(S7P/J800/W12 등)는 전자 브레이크가 걸려 전원이 없으면 인력으로 밀 수 없음.",
      "2. 장비 하부 구동 모터(트랜스액슬) 뒤편의 '수동 브레이크 해제 레버'를 찾음.",
      "3. 해제 레버를 당겨 '수동 중립(N)' 위치로 전환하면 인력으로 밀거나 견인 가능.",
      "4. ※ 주의: 경사면에서는 장비가 굴러 내려갈 수 있으므로 반드시 평지에서만 해제할 것."
    ],
    "call_script": "고객님, 배터리가 나가면 전자 브레이크가 잠겨 차가 안 밀립니다. 뒷바퀴 모터 뒤쪽에 달린 작은 해제 레버를 당기시면 손으로 밀어서 안전한 곳으로 이동하실 수 있습니다."
  }
];

export const DEFAULT_SYMPTOM_PRESETS: SymptomPreset[] = [
  {
    "id": "PWR_BAT_DEGRADE",
    "category": "충전/전원",
    "title": "배터리 조기 방전",
    "symptom": "완충 후 15~30분 이내 전원 꺼짐 또는 배터리 경고음 발생",
    "aliases": [
      "배터리 조기 방전 / 수명 열화",
      "수명 열화",
      "가동 시간 급감",
      "20분 방전",
      "30분 정지",
      "15분 전원 차단",
      "배터리 부족 경고음",
      "배터리 수명 저하",
      "완충 방전",
      "용량 급감",
      "배터리 방전"
    ],
    "urgency": "긴급",
    "part_code": "BATTERY-PACK-24V-120AH",
    "action_plan": {
      "keyword": "배터리 조기 방전",
      "part_code": "BATTERY-PACK-24V-120AH",
      "urgency": "긴급",
      "can_self_resolve": false,
      "call_script": "고객님, 배터리 조기 방전 증상은 완충 사이클 점검 및 액식 배터리 증류수 수위 확인을 먼저 안내해 드리겠습니다.",
      "steps": [
        {
          "step_no": 1,
          "title": "전용 충전기로 8시간 완충 사이클 점검 및 충전잭 손잡이 분리",
          "method": "장비 전원 OFF 후 전용 충전기를 연결하여 최소 8시간 동안 완전 충전 사이클을 수행합니다. 분리 시 전선이 아닌 손잡이 플러그를 잡고 탈거합니다.",
          "criteria_normal": "완충 후 계기판 배터리 잔량 게이지가 100%(만충)로 표시되고 충전기 녹색등 점등",
          "criteria_fault": "완충 후 사용하는데 15분~30분 이내에 배터리 경고음이 울리며 전원이 차단됨",
          "fault_action": "STEP 2 액식 배터리 증류수 수위 점검 (완충 직후 보충 원칙)으로 진행"
        },
        {
          "step_no": 2,
          "title": "액식 배터리 증류수 수위 점검 (완충 직후 보충 원칙)",
          "method": "[액식 배터리 장착 모델] 반드시 충전이 완료된 직후 캡을 열고 극판 상단 10~15mm까지 증류수를 보충합니다 (충전 전 보충 시 끓어 넘침 주의).",
          "criteria_normal": "전해액 수위가 최대선까지 정상 유지되고 급속 방전 해소",
          "criteria_fault": "증류수 보충 후에도 20분 내 전압 급락 발생 (극판 황산염화/셀 영구 손상)",
          "fault_action": "STEP 3 배터리 팩 교체 배차 접수로 진행"
        },
        {
          "step_no": 3,
          "title": "배터리 팩 교체 배차 접수",
          "method": "장비 모델별 정격 배터리 규격을 확인하고 고객사와 교체 일정을 확정합니다.",
          "criteria_normal": "배터리 팩 출고 및 교체 일정 예약 확정",
          "criteria_fault": "고객사 승인 지연 시 임시 대차 검토",
          "fault_action": "A/S 정비사 현장 출동 예약 확정"
        }
      ]
    },
    "model_overrides": {
      "J600T": {
        "part_code": "BATTERY-PACK-24V-120AH"
      },
      "J800": {
        "part_code": "BATTERY-PACK-24V-200AH"
      },
      "S7": {
        "part_code": "BATTERY-PACK-24V-105AH"
      },
      "S5": {
        "part_code": "BATTERY-PACK-24V-85AH"
      },
      "S1": {
        "part_code": "BATTERY-PACK-24V-LITHIUM-50AH"
      },
      "S3": {
        "part_code": "BATTERY-PACK-24V-70AH"
      },
      "W12": {
        "part_code": "BATTERY-PACK-24V-242AH"
      },
      "W15": {
        "part_code": "BATTERY-PACK-36V-242AH"
      },
      "S12": {
        "part_code": "BATTERY-PACK-36V-310AH"
      },
      "쓰담": {
        "part_code": "BATTERY-PACK-12V-LITHIUM"
      }
    }
  },
  {
    "id": "PWR_CHG_FAIL",
    "category": "충전/전원",
    "title": "배터리 충전 불가",
    "symptom": "충전기를 연결해도 충전이 되지 않거나 충전기 에러 표시등 점멸",
    "aliases": [
      "배터리 충전 불가 / 충전 불량",
      "충전 불량",
      "충전기 적색등 점멸",
      "충전기 표시등 미점등",
      "계기판 깜빡임",
      "충전 에러코드",
      "충전 안됨",
      "충전기 고장",
      "충전 중단",
      "충전 불가"
    ],
    "urgency": "긴급",
    "part_code": "CHARGER-24V-15A",
    "action_plan": {
      "keyword": "배터리 충전 불가",
      "part_code": "CHARGER-24V-15A",
      "urgency": "긴급",
      "can_self_resolve": true,
      "call_script": "고객님, 충전 불량의 경우 충전 단자 접속 상태와 벽면 콘센트 전압 확인을 먼저 진행해 주셔야 합니다.",
      "steps": [
        {
          "step_no": 1,
          "title": "장비 전원 OFF 후 충전 플러그 체결 상태 재확인",
          "method": "장비 키 스위치를 끄고, 충전 플러그를 뽑았다가 '딸깍' 소리가 나도록 끝까지 밀어 넣어 재결속합니다.",
          "criteria_normal": "체결 즉시 충전기 전면 램프에 불이 들어오며 충전 전류 인가 시작",
          "criteria_fault": "플러그를 재체결해도 충전기에 불이 전혀 안 들어오거나 계속 램프가 깜빡임",
          "fault_action": "STEP 2 벽면 콘센트 전원 확인으로 진행"
        },
        {
          "step_no": 2,
          "title": "벽면 220V 콘센트 전원 정상 공급 확인",
          "method": "다른 전자기기(스마트폰 충전기 등)를 동일 벽면 콘센트에 꽂아 전기가 정상 공급되는지 확인합니다.",
          "criteria_normal": "콘센트 정상 작동 확인 -> 충전기 본체 상태 점검",
          "criteria_fault": "콘센트에 전기가 들어오지 않음 (현장 배전반 차단기 트립)",
          "fault_action": "현장 분전함 차단기 리셋 안내 후 상담 종결 (장비 정상)"
        },
        {
          "step_no": 3,
          "title": "충전기 내부 퓨즈 및 단자 단락 점검",
          "method": "충전기 전원선 피복 손상 여부 및 충전 플러그 내부 핀 소손 여부를 확인합니다.",
          "criteria_normal": "외관상 이상 없음 -> 충전기 전압 출력 측정",
          "criteria_fault": "플러그 내부 핀이 까맣게 탔거나 충전기 내부에서 타는 냄새 발생",
          "fault_action": "충전기 단품 교체 택배 발송 또는 현장 방문 접수"
        }
      ]
    },
    "model_overrides": {
      "J600T": {
        "part_code": "CHARGER-24V-15A"
      },
      "J800": {
        "part_code": "CHARGER-24V-25A"
      },
      "S7": {
        "part_code": "CHARGER-24V-20A"
      },
      "S5": {
        "part_code": "CHARGER-24V-15A"
      },
      "S1": {
        "part_code": "CHARGER-24V-10A"
      },
      "S3": {
        "part_code": "CHARGER-24V-12A"
      },
      "W12": {
        "part_code": "CHARGER-24V-30A"
      },
      "W15": {
        "part_code": "CHARGER-36V-30A"
      },
      "쓰담": {
        "part_code": "CHARGER-STATION-DOCK"
      }
    }
  },
  {
    "id": "PWR_TOTAL_DEAD",
    "category": "충전/전원",
    "title": "전원 완전 인입 불가",
    "symptom": "키 스위치를 켜도 계기판에 불이 전혀 들어오지 않고 묵묵부답",
    "aliases": [
      "전원 완전 인입 불가 / 작동 멈춤",
      "작동 멈춤",
      "키 스위치 불량",
      "전원 안 켜짐",
      "작동 안 함",
      "시동 안 걸림",
      "계기판 먹통",
      "전원 인입 불능",
      "완전 묵묵부답",
      "전원 먹통"
    ],
    "urgency": "긴급",
    "part_code": "RELAY-24V-MAIN",
    "action_plan": {
      "keyword": "전원 완전 인입 불가",
      "part_code": "RELAY-24V-MAIN",
      "urgency": "긴급",
      "can_self_resolve": true,
      "call_script": "고객님, 전원이 전혀 들어오지 않는 경우 비상정지 버튼 눌림 상태와 배터리 메인 앤더슨 잭 체결을 확인해야 합니다.",
      "steps": [
        {
          "step_no": 1,
          "title": "비상정지 버튼(적색 버섯형) 해제 확인",
          "method": "조작부 또는 핸들에 위치한 커다란 빨간색 비상정지 버튼을 시계 방향으로 1/4바퀴 돌려 '탁' 튀어나오게 합니다.",
          "criteria_normal": "버튼이 위로 튀어나오며 계기판에 전원 LED 점등",
          "criteria_fault": "버튼을 회전 해제해도 계기판에 아무 반응 없음",
          "fault_action": "STEP 2 배터리 룸 앤더슨 커넥터 체결 점검으로 진행"
        },
        {
          "step_no": 2,
          "title": "오수 탱크 틸팅 후 배터리 룸 메인 앤더슨 커넥터 재체결",
          "method": "오수 탱크를 들어 올려 배터리 룸 내부의 대형 앤더슨 커넥터를 분리 후 딸깍 소리가 날 때까지 끝까지 밀어 넣어 재결속합니다.",
          "criteria_normal": "커넥터 재체결 후 키 스위치 ON 시 계기판 정상 켜짐",
          "criteria_fault": "커넥터를 꽉 꽂은 후에도 계기판 불 안 들어옴",
          "fault_action": "메인 대전류 퓨즈 단락 또는 키 스위치 접점 파손 -> A/S 정비사 현장 출동 예약"
        }
      ]
    },
    "model_overrides": {
      "J600T": {
        "part_code": "RELAY-24V-MAIN"
      },
      "J800": {
        "part_code": "RELAY-24V-HEAVY"
      },
      "S7": {
        "part_code": "RELAY-24V-S7"
      },
      "S5": {
        "part_code": "RELAY-24V-S5"
      },
      "S1": {
        "part_code": "MAIN-SWITCH-S1"
      },
      "S3": {
        "part_code": "RELAY-24V-S3"
      },
      "W12": {
        "part_code": "MAIN-FUSE-150A"
      },
      "W15": {
        "part_code": "MAIN-FUSE-200A"
      },
      "쓰담": {
        "part_code": "POWER-BOARD-ROBOT"
      }
    }
  },
  {
    "id": "PWR_TERMINAL_LOOSE",
    "category": "충전/전원",
    "title": "충전 단자 접촉 불량",
    "symptom": "충전 단자가 헐겁거나 계기판 배터리 잔량 표시가 불규칙하게 튐",
    "aliases": [
      "충전 단자 접촉 불량 / 잔량 표시 오류",
      "잔량 표시 오류",
      "단자 접촉 흔들림",
      "배터리 게이지 튐",
      "충전 단자 헐거움",
      "앤더슨 잭 파손",
      "게이지 오작동",
      "단자 유격",
      "잔량 깜빡임"
    ],
    "urgency": "보통",
    "part_code": "CONNECTOR-ANDERSON-50A",
    "action_plan": {
      "keyword": "충전 단자 접촉 불량",
      "part_code": "CONNECTOR-ANDERSON-50A",
      "urgency": "보통",
      "can_self_resolve": true,
      "call_script": "고객님, 단자 접촉 불량은 충전 잭 핀의 벌어짐이나 유격을 점검하여 자가 조치하실 수 있습니다.",
      "steps": [
        {
          "step_no": 1,
          "title": "앤더슨 커넥터 내부 금속 단자 핀 변형 및 유격 확인",
          "method": "커넥터 내부의 구리 단자 핀이 뒤로 밀려나 있거나 벌어졌는지 확인하고 롱노우즈 등으로 살짝 오므려줍니다.",
          "criteria_normal": "커넥터 결합 시 헐거움 없이 단단히 고정되고 게이지 정상 안정화",
          "criteria_fault": "단자 핀 플라스틱 하우징이 깨져 핀이 계속 뒤로 밀려남",
          "fault_action": "앤더슨 커넥터 하우징 및 압착 핀 신품 교체 발송"
        }
      ]
    },
    "model_overrides": {
      "J600T": {
        "part_code": "CONNECTOR-ANDERSON-50A"
      },
      "J800": {
        "part_code": "CONNECTOR-ANDERSON-120A"
      },
      "S7": {
        "part_code": "CONNECTOR-ANDERSON-120A"
      },
      "S5": {
        "part_code": "CONNECTOR-ANDERSON-50A"
      },
      "S1": {
        "part_code": "CONNECTOR-DC-JACK"
      },
      "S3": {
        "part_code": "CONNECTOR-ANDERSON-50A"
      },
      "W12": {
        "part_code": "CONNECTOR-ANDERSON-175A"
      },
      "W15": {
        "part_code": "CONNECTOR-ANDERSON-175A"
      },
      "쓰담": {
        "part_code": "CHARGING-PIN-UNIT"
      }
    }
  },
  {
    "id": "SUC_RESIDUAL_WATER",
    "category": "흡입/잔수",
    "title": "바닥 잔수 과다",
    "symptom": "세척 후 바닥에 물기가 흥건하게 남고 스퀴지 흡입력이 약함",
    "aliases": [
      "바닥 잔수 과다 / 흡입력 저하",
      "흡입력 저하",
      "바닥에 물기 남음",
      "물 흡입 불량",
      "흡입력 약화",
      "스퀴지 물기 끌림",
      "물 안 빨림",
      "바닥 잔수",
      "흡입 불량"
    ],
    "urgency": "보통",
    "part_code": "SQUEEGEE-RUBBER-850MM",
    "action_plan": {
      "keyword": "바닥 잔수 과다",
      "part_code": "SQUEEGEE-RUBBER-850MM",
      "urgency": "보통",
      "can_self_resolve": true,
      "call_script": "고객님, 바닥 잔수는 스퀴지 고무 4면 뒤집기 재사용 및 45도 각도 조절로 즉시 해결하실 수 있습니다.",
      "steps": [
        {
          "step_no": 1,
          "title": "스퀴지 블레이드 4면(앞/뒤, 상/하) 뒤집기 재사용 조치",
          "method": "스퀴지 툴 고정 노브를 풀고 블레이드를 탈거하여 마모된 모서리 대신 미사용 반대면 또는 상하를 뒤집어 재결속합니다 (4회 재활용 가능).",
          "criteria_normal": "미사용 모서리 밀착 후 바닥 잔수 없이 100% 흡입 건조",
          "criteria_fault": "4면 모서리가 모두 마모/경화되었거나 찢겨 반전해도 잔수 지속",
          "fault_action": "STEP 2 스퀴지 바닥면 45도 각도 휘어짐 노브 미세조정으로 진행"
        },
        {
          "step_no": 2,
          "title": "스퀴지 바닥면 45도 각도 휘어짐 및 지지 휠 미세조정",
          "method": "장비 주행 시 스퀴지 고무가 바닥면에 45도로 균일하게 휘어지는지 확인하고 중앙 각도 조절 노브 및 지지 휠 볼트를 조정합니다.",
          "criteria_normal": "고무 립이 45도로 균일하게 휘어지며 좌우 편차 없이 완벽 흡입",
          "criteria_fault": "각도 조절 후에도 고무가 뜨거나 휠 파손으로 편마모 지속",
          "fault_action": "STEP 3 손바닥 흡입구 진공 부압 테스트로 진행"
        },
        {
          "step_no": 3,
          "title": "손바닥 흡입구 진공 부압 테스트 (흡입 모터 및 가스켓 점검)",
          "method": "흡입 스위치를 켠 상태에서 흡입 호스 끝단을 손바닥으로 완전히 막아 손바닥이 빨려 들어가는 부압을 확인합니다.",
          "criteria_normal": "손바닥을 떼기 힘들 정도로 강하게 밀착 흡착됨 (모터 정상 -> 오수탱크 가스켓 밀폐 확인)",
          "criteria_fault": "손바닥에 흡착력이 거의 안 느껴지거나 약한 바람만 나옴",
          "fault_action": "흡입 모터 임펠러 파손 또는 배관 파손 -> 모터 교체 출동 접수"
        }
      ]
    },
    "model_overrides": {
      "J600T": {
        "part_code": "SQUEEGEE-RUBBER-850MM"
      },
      "J800": {
        "part_code": "SQUEEGEE-RUBBER-1050MM"
      },
      "S7": {
        "part_code": "SQUEEGEE-RUBBER-1120MM"
      },
      "S5": {
        "part_code": "SQUEEGEE-RUBBER-705MM"
      },
      "S1": {
        "part_code": "SQUEEGEE-RUBBER-450MM"
      },
      "S3": {
        "part_code": "SQUEEGEE-RUBBER-815MM"
      },
      "S2": {
        "part_code": "SQUEEGEE-RUBBER-530MM"
      },
      "S12": {
        "part_code": "SQUEEGEE-RUBBER-1120MM"
      },
      "쓰담": {
        "part_code": "SUCTION-STRIP-SWEP"
      }
    }
  },
  {
    "id": "SUC_SQUEEGEE_STRIPE",
    "category": "흡입/잔수",
    "title": "바닥 줄무늬 잔수",
    "symptom": "장비가 지나간 자리에 물줄기 줄무늬가 선명하게 남음",
    "aliases": [
      "스퀴지 줄무늬 잔수 (편마모/이물)",
      "스퀴지 편마모",
      "줄무늬 잔수",
      "고무 찢어짐",
      "편마모",
      "스퀴지 들뜸",
      "고무 패킹 손상",
      "스퀴지 자국",
      "와이퍼 찢김"
    ],
    "urgency": "보통",
    "part_code": "SQUEEGEE-BLADE-J600",
    "action_plan": {
      "keyword": "바닥 줄무늬 잔수",
      "part_code": "SQUEEGEE-BLADE-J600",
      "urgency": "보통",
      "can_self_resolve": true,
      "call_script": "고객님, 줄무늬 잔수는 스퀴지 틈새에 모래나 핀이 끼었거나 고무 날이 파손된 경우 발생합니다.",
      "steps": [
        {
          "step_no": 1,
          "title": "스퀴지 고무 날 틈새 모래알 제거 및 4면 반전 장착",
          "method": "스퀴지 노브를 풀어 고무 날을 빼낸 후 반대쪽 면이나 상하를 뒤집어 새로운 각(Edge)으로 재장착합니다.",
          "criteria_normal": "고무 날 반전 장착 후 줄무늬 없이 매끄럽게 건조됨",
          "criteria_fault": "고무 날 전체가 찢어지거나 경화되어 반전해도 줄무늬 지속",
          "fault_action": "스퀴지 고무 소모품 신품 교체 출고"
        }
      ]
    },
    "model_overrides": {
      "J600T": {
        "part_code": "SQUEEGEE-BLADE-J600"
      },
      "J800": {
        "part_code": "SQUEEGEE-BLADE-J800"
      },
      "S7": {
        "part_code": "SQUEEGEE-BLADE-S7"
      },
      "S5": {
        "part_code": "SQUEEGEE-BLADE-S5"
      },
      "S1": {
        "part_code": "SQUEEGEE-BLADE-S1"
      },
      "S3": {
        "part_code": "SQUEEGEE-BLADE-S3"
      },
      "쓰담": {
        "part_code": "SQUEEGEE-BLADE-SD"
      }
    }
  },
  {
    "id": "SUC_MOTOR_NOISE",
    "category": "흡입/잔수",
    "title": "흡입 모터 이상 소음",
    "symptom": "흡입 스위치 작동 시 모터에서 굉음이 발생하거나 탄 냄새 발생",
    "aliases": [
      "흡입 모터 이상 소음 / 과열",
      "모터 과열",
      "흡입 모터 굉음",
      "모터에서 탄 냄새",
      "모터 작동 중 정지",
      "오수 유입",
      "모터 과열",
      "흡입 소음",
      "흡입모터 과열"
    ],
    "urgency": "긴급",
    "part_code": "VACUUM-MOTOR-24V-500W",
    "action_plan": {
      "keyword": "흡입 모터 이상 소음",
      "part_code": "VACUUM-MOTOR-24V-500W",
      "urgency": "긴급",
      "can_self_resolve": false,
      "call_script": "고객님, 모터 이상 소음은 거품 유입 또는 베어링 파손 우려가 있어 즉시 흡입 스위치를 끄셔야 합니다.",
      "steps": [
        {
          "step_no": 1,
          "title": "고기포 세제 사용 여부 확인 및 오수탱크 소포제(Anti-Foam) 투입",
          "method": "퐁퐁/일반 락스 등 고기포 세제를 사용했는지 확인하고, 즉시 흡입 스위치를 끈 뒤 오수탱크에 소포제 종이컵 1~2잔을 투입하여 거품을 가라앉힙니다.",
          "criteria_normal": "소포제 투입 및 거품 소멸 후 흡입 모터 정상음 회복",
          "criteria_fault": "거품이 없는데도 모터에서 쇠 긁는 굉음, 탄내, 또는 연기 발생",
          "fault_action": "흡입 모터 임펠러 베어링/코일 소손 확정 -> 모터 교체 출장 접수"
        }
      ]
    },
    "model_overrides": {
      "J600T": {
        "part_code": "VACUUM-MOTOR-24V-500W"
      },
      "J800": {
        "part_code": "VACUUM-MOTOR-24V-650W"
      },
      "S7": {
        "part_code": "VACUUM-MOTOR-24V-450W"
      },
      "S5": {
        "part_code": "VACUUM-MOTOR-24V-400W"
      },
      "S1": {
        "part_code": "VACUUM-MOTOR-24V-300W"
      },
      "S3": {
        "part_code": "VACUUM-MOTOR-24V-350W"
      },
      "쓰담": {
        "part_code": "VACUUM-MOTOR-12V-250W"
      }
    }
  },
  {
    "id": "SUC_FLOAT_EARLY_STOP",
    "category": "흡입/잔수",
    "title": "오수 탱크 조기 차단",
    "symptom": "오수 탱크가 비어있거나 조금 찼는데 흡입이 차단되고 경보 발생",
    "aliases": [
      "오수 탱크 만수 센서 오작동 (조기 차단)",
      "만수 센서 오작동",
      "오수탱크 안 찼는데 차단",
      "부표 일찍 올라옴",
      "거품 차단",
      "만수 센서 오류",
      "만수 경보 울림",
      "플로트 센서"
    ],
    "urgency": "보통",
    "part_code": "FLOAT-VALVE-J600",
    "action_plan": {
      "keyword": "오수 탱크 조기 차단",
      "part_code": "FLOAT-VALVE-J600",
      "urgency": "보통",
      "can_self_resolve": true,
      "call_script": "고객님, 오수 탱크 조기 차단은 거품 발생 또는 부표 센서에 찌꺼기 고착 여부를 점검해 주십시오.",
      "steps": [
        {
          "step_no": 1,
          "title": "부표 케이지 이물질 고착 해제 및 소포제 투입",
          "method": "오수 탱크 뚜껑 안쪽의 부표 케이지를 손으로 흔들어 부표가 위아래로 원활히 움직이는지 확인하고 소포제를 투입합니다.",
          "criteria_normal": "부표 유동 원활 및 거품 가라앉은 후 정상 흡입 지속",
          "criteria_fault": "부표가 바닥에 있는데도 계속 만수 경보가 울리고 흡입 차단",
          "fault_action": "전자식 수위 센서 단락 -> 센서 부품 교체 접수"
        }
      ]
    },
    "model_overrides": {
      "J600T": {
        "part_code": "FLOAT-VALVE-J600"
      },
      "J800": {
        "part_code": "FLOAT-VALVE-J800"
      },
      "S7": {
        "part_code": "FLOAT-VALVE-S7"
      },
      "S5": {
        "part_code": "FLOAT-VALVE-S5"
      },
      "S1": {
        "part_code": "FLOAT-SENSOR-S1"
      },
      "S3": {
        "part_code": "FLOAT-VALVE-S3"
      },
      "쓰담": {
        "part_code": "FLOAT-VALVE-SD"
      }
    }
  },
  {
    "id": "DRV_BRUSH_STALL",
    "category": "브러시/구동",
    "title": "브러시 모터 회전 불가",
    "symptom": "브러시가 돌지 않거나 헛돌고, 구동 중 과부하 차단기가 튀어나옴",
    "aliases": [
      "브러시 모터 회전 불량 / 과부하 멈춤",
      "브러시 모터 회전 불량",
      "과부하 멈춤",
      "브러시 안 돎",
      "브러시 모터 헛돎",
      "브러시 과부하 차단",
      "브러시에서 연기",
      "브러시 작동 불능",
      "브러시 회전 불량",
      "브러시미회전"
    ],
    "urgency": "긴급",
    "part_code": "BRUSH-MOTOR-24V-550W",
    "action_plan": {
      "keyword": "브러시 모터 회전 불가",
      "part_code": "BRUSH-MOTOR-24V-550W",
      "urgency": "긴급",
      "can_self_resolve": true,
      "call_script": "고객님, 브러시 회전 불량은 퓨즈/차단기 리셋 및 모터 축 이물질 감김을 먼저 점검해 주셔야 합니다.",
      "steps": [
        {
          "step_no": 1,
          "title": "오수탱크 틸팅 후 하부 퓨즈함(보행식) / 보닛·시트 서킷브레이커 푸시 리셋(탑승식)",
          "method": "[보행식] 오수탱크를 비우고 세수탱크 후크를 풀어 위로 젖힌 후 하부 퓨즈함 커버를 열어 모터 퓨즈를 확인합니다. [탑승식] 전면 보닛 또는 시트 하단의 튀어나온 서킷브레이커 버튼을 손가락으로 꾹 눌러 리셋합니다.",
          "criteria_normal": "퓨즈 교체 또는 차단기 리셋 후 브러시 스위치 작동 시 정상 회전",
          "criteria_fault": "차단기 버튼이 들어가지 않고 즉시 튕겨 나오거나 퓨즈가 즉시 재단락됨",
          "fault_action": "STEP 2 브러시 원터치 자동 탈거 후 모터 축 이물질 제거로 진행"
        },
        {
          "step_no": 2,
          "title": "브러시 원터치 자동 탈거 후 모터 축 이물질 제거",
          "method": "브러시 데크를 올린 상태에서 작동 레버를 순간 당겼다 놓거나(보행식) 자동착탈 버튼을 눌러(탑승식) 브러시를 자동 이탈시키고 회전축 노끈/비닐을 제거합니다.",
          "criteria_normal": "이물질 제거 후 손으로 브러시 커플러를 돌렸을 때 부드럽게 회전",
          "criteria_fault": "이물질이 없는데도 손으로 전혀 안 돌아가거나 헛돎",
          "fault_action": "브러시 모터 감속기 소손 확정 -> 모터 교체 출동 배차"
        }
      ]
    },
    "model_overrides": {
      "J600T": {
        "part_code": "BRUSH-MOTOR-24V-550W"
      },
      "J800": {
        "part_code": "BRUSH-MOTOR-24V-750W"
      },
      "S7": {
        "part_code": "BRUSH-MOTOR-24V-500W"
      },
      "S5": {
        "part_code": "BRUSH-MOTOR-24V-450W"
      },
      "S1": {
        "part_code": "BRUSH-MOTOR-24V-250W"
      },
      "S3": {
        "part_code": "BRUSH-MOTOR-24V-350W"
      },
      "W12": {
        "part_code": "MAIN-BRUSH-MOTOR-500W"
      },
      "W15": {
        "part_code": "MAIN-BRUSH-MOTOR-800W"
      },
      "쓰담": {
        "part_code": "SIDE-BRUSH-MOTOR-12V"
      }
    }
  },
  {
    "id": "DRV_WHEEL_DRIVE",
    "category": "브러시/구동",
    "title": "주행 구동 불가",
    "symptom": "전진 레버를 당겨도 장비가 나가지 않거나 직진 시 한쪽으로 심하게 쏠림",
    "aliases": [
      "주행 구동 불량 / 직진 쏠림",
      "주행 구동 불량",
      "직진 쏠림",
      "장비가 안 나감",
      "직진 주행 쏠림",
      "구동 바퀴 헛돎",
      "전후진 레버 불량",
      "주행 불가",
      "바퀴 구동 이상",
      "쏠림"
    ],
    "urgency": "긴급",
    "part_code": "TRANSAXLE-24V-400W",
    "action_plan": {
      "keyword": "주행 구동 불가",
      "part_code": "TRANSAXLE-24V-400W",
      "urgency": "긴급",
      "can_self_resolve": true,
      "call_script": "고객님, 주행 불가 증상은 수동 견인 레버(중립 클러치) 체결 여부를 먼저 확인해 주십시오.",
      "steps": [
        {
          "step_no": 1,
          "title": "감속기 전자 브레이크 수동 해제 레버(견인 모드) 점검",
          "method": "장비 하부 구동 모터(트랜스액슬) 뒤쪽의 수동 브레이크 해제 레버가 주행(Lock) 위치인지 확인합니다. (수동 중립 해제 상태에서는 전진 페달을 밟아도 주행 불가)",
          "criteria_normal": "레버를 주행 위치로 체결 후 전진 레버/페달 밟으면 정상 구동",
          "criteria_fault": "레버가 정상 체결되어 있는데도 모터만 헛돌거나 바퀴가 전혀 굴러가지 않음",
          "fault_action": "트랜스액슬 내부 차동기어 파손 -> 트랜스액슬 교체 배차"
        }
      ]
    },
    "model_overrides": {
      "J600T": {
        "part_code": "TRANSAXLE-24V-400W"
      },
      "J800": {
        "part_code": "TRANSAXLE-24V-600W"
      },
      "S7": {
        "part_code": "TRANSAXLE-24V-600W"
      },
      "S5": {
        "part_code": "TRANSAXLE-24V-300W"
      },
      "S1": {
        "part_code": "DRIVE-WHEEL-S1"
      },
      "S3": {
        "part_code": "TRANSAXLE-24V-350W"
      },
      "W12": {
        "part_code": "DRIVE-MOTOR-24V-700W"
      },
      "W15": {
        "part_code": "DRIVE-MOTOR-36V-1500W"
      },
      "쓰담": {
        "part_code": "HUB-MOTOR-WHEEL"
      }
    }
  },
  {
    "id": "DRV_BELT_SLIP",
    "category": "브러시/구동",
    "title": "구동 벨트 슬립",
    "symptom": "브러시 또는 주행 시 끼익거리는 고무 마찰음이 발생하고 회전력이 떨어짐",
    "aliases": [
      "구동 벨트 슬립 / 이상 소음",
      "구동 벨트 슬립",
      "벨트 늘어짐",
      "끼익 소음",
      "회전력 저하",
      "벨트 마모",
      "벨트 헛돎",
      "벨트 장력 불량",
      "벨트 끊어짐"
    ],
    "urgency": "보통",
    "part_code": "TIMING-BELT-8M-J600",
    "action_plan": {
      "keyword": "구동 벨트 슬립",
      "part_code": "TIMING-BELT-8M-J600",
      "urgency": "보통",
      "can_self_resolve": false,
      "call_script": "고객님, 끼익거리는 고무 소음은 구동 타이밍 벨트 장력 저하 또는 마모 상태입니다.",
      "steps": [
        {
          "step_no": 1,
          "title": "벨트 장력 텐셔너 볼트 유격 점검",
          "method": "모터 측면 텐셔너 볼트를 확인하고 벨트 처짐 상태를 확인합니다.",
          "criteria_normal": "텐셔너 장력 조절 후 소음 소멸 및 정상 회전력 복구",
          "criteria_fault": "벨트 톱니가 닳았거나 갈라짐, 또는 벨트가 완전히 절단됨",
          "fault_action": "규격 타이밍 벨트 소모품 교체 출고"
        }
      ]
    },
    "model_overrides": {
      "J600T": {
        "part_code": "TIMING-BELT-8M-J600"
      },
      "J800": {
        "part_code": "TIMING-BELT-8M-J800"
      },
      "S7": {
        "part_code": "TIMING-BELT-8M-S7"
      },
      "S5": {
        "part_code": "TIMING-BELT-8M-S5"
      },
      "S1": {
        "part_code": "TIMING-BELT-HTD-S1"
      },
      "S3": {
        "part_code": "TIMING-BELT-8M-S3"
      },
      "쓰담": {
        "part_code": "GEAR-DRIVE-ROBOT"
      }
    }
  },
  {
    "id": "DRV_LIFT_FAIL",
    "category": "브러시/구동",
    "title": "브러시 승강 작동 불가",
    "symptom": "브러시 페달 또는 승강 스위치를 조작해도 브러시 헤드가 바닥으로 하강하지 않음",
    "aliases": [
      "브러시 승강 장치 불량 (하강/상승 불가)",
      "승강 장치 불량",
      "브러시 안 내려감",
      "브러시 헤드 고착",
      "승강 모터 불량",
      "리프트 불량",
      "브러시 들림",
      "페달 고착"
    ],
    "urgency": "보통",
    "part_code": "LIFT-ACTUATOR-24V",
    "action_plan": {
      "keyword": "브러시 승강 작동 불가",
      "part_code": "LIFT-ACTUATOR-24V",
      "urgency": "보통",
      "can_self_resolve": true,
      "call_script": "고객님, 승강 불량은 페달 기계식 래치 걸림 또는 리프트 액추에이터 상태를 점검해야 합니다.",
      "steps": [
        {
          "step_no": 1,
          "title": "기계식 발 페달 래치 고착 해제 및 스프링 점검",
          "method": "발 페달을 살짝 밟은 상태에서 옆으로 비틀어 잠금 홈에서 정상 이탈되는지 확인합니다.",
          "criteria_normal": "래치 분리 후 부드럽게 바닥으로 헤드 하강",
          "criteria_fault": "페달 스프링이 빠졌거나 힌지 핀이 부러져 움직이지 않음",
          "fault_action": "승강 페달 링크 어셈블리 또는 전동 액추에이터 교체 접수"
        }
      ]
    },
    "model_overrides": {
      "J600T": {
        "part_code": "LIFT-ACTUATOR-24V"
      },
      "J800": {
        "part_code": "LIFT-ACTUATOR-24V-HEAVY"
      },
      "S7": {
        "part_code": "LIFT-ACTUATOR-24V-S7"
      },
      "S5": {
        "part_code": "PEDAL-LIFT-ASSY-S5"
      },
      "S1": {
        "part_code": "MANUAL-LIFT-LEVER-S1"
      },
      "S3": {
        "part_code": "PEDAL-LIFT-ASSY-S3"
      },
      "쓰담": {
        "part_code": "LIFT-SERVO-ROBOT"
      }
    }
  },
  {
    "id": "WTR_SPRAY_FAIL",
    "category": "세척수/배관",
    "title": "세척수 미분사",
    "symptom": "정수 탱크에 세척수가 채워져 있으나 바닥으로 물이 분사되지 않음",
    "aliases": [
      "세척수 미분사 / 노즐 막힘",
      "노즐 막힘",
      "물 안 나옴",
      "세척수 분사 불량",
      "분사구 막힘",
      "물 공급 안됨",
      "청수 안 나옴",
      "솔레노이드 안 열림",
      "세수 배관 막힘",
      "물 부족 경고"
    ],
    "urgency": "보통",
    "part_code": "SOLENOID-VALVE-24V-NC",
    "action_plan": {
      "keyword": "세척수 미분사",
      "part_code": "SOLENOID-VALVE-24V-NC",
      "urgency": "보통",
      "can_self_resolve": true,
      "call_script": "고객님, 물이 나오지 않는 경우 세수탱크 하부 세수필터 세척과 물량 레버 OPEN 위치를 점검해 주십시오.",
      "steps": [
        {
          "step_no": 1,
          "title": "세수탱크 하부 세수필터 캡 분리 및 흐르는 물 세척",
          "method": "세수탱크 하단(또는 장비 옆면)에 위치한 세수필터 캡을 시계 반대 방향으로 돌려 빼낸 후 내부 철망 스트레이너의 석회질/슬러지를 세척합니다.",
          "criteria_normal": "필터 세척 후 물량 조절 레버 OPEN 시 브러시 중앙으로 원활히 분사",
          "criteria_fault": "필터가 깨끗한데도 물이 한 방울도 바닥으로 공급되지 않음",
          "fault_action": "STEP 2 솔레노이드 밸브 탭핑 및 물량 조절 레버 OPEN 확인으로 진행"
        },
        {
          "step_no": 2,
          "title": "솔레노이드 밸브 탭핑 및 물량 조절 레버 OPEN 확인",
          "method": "물량 조절 레버가 OPEN 위치인지 확인하고, 전원 ON 상태에서 솔레노이드 밸브 몸체를 가볍게 톡톡 두드려 플런저 고착을 풀어줍니다.",
          "criteria_normal": "딸깍 작동음과 함께 세척수 정상 분사",
          "criteria_fault": "작동음이 전혀 나지 않고 물 공급 불가",
          "fault_action": "24V 솔레노이드 밸브 코일 단락 -> 밸브 부품 교체 출장 접수"
        }
      ]
    },
    "model_overrides": {
      "J600T": {
        "part_code": "SOLENOID-VALVE-24V-NC"
      },
      "J800": {
        "part_code": "SOLENOID-VALVE-24V-HIGHFLOW"
      },
      "S7": {
        "part_code": "SOLENOID-VALVE-24V-S7"
      },
      "S5": {
        "part_code": "SOLENOID-VALVE-24V-S5"
      },
      "S1": {
        "part_code": "MANUAL-VALVE-S1"
      },
      "S3": {
        "part_code": "SOLENOID-VALVE-24V-S3"
      },
      "쓰담": {
        "part_code": "PUMP-UNIT-ROBOT"
      }
    }
  },
  {
    "id": "WTR_LEAK",
    "category": "세척수/배관",
    "title": "세척수 누수",
    "symptom": "장비를 정지해 두어도 바닥으로 물이 계속 새어나오거나 호스 피팅에서 누수",
    "aliases": [
      "세척수 누수 / 밸브 닫힘 불량",
      "세척수 누수",
      "바닥 물 챔",
      "밸브 누수",
      "호스 이음새 물 챔",
      "장비 밑 물 흐름",
      "세수탱크 누수",
      "배관 물 샘",
      "솔레노이드 누수"
    ],
    "urgency": "보통",
    "part_code": "HOSE-FITTING-12MM",
    "action_plan": {
      "keyword": "세척수 누수",
      "part_code": "HOSE-FITTING-12MM",
      "urgency": "보통",
      "can_self_resolve": true,
      "call_script": "고객님, 물이 계속 새는 것은 솔레노이드 밸브 내 이물질 끼임 또는 호스 클램프 체결 불량입니다.",
      "steps": [
        {
          "step_no": 1,
          "title": "솔레노이드 밸브 내부 찌꺼기 플러싱 세척",
          "method": "세수 밸브를 최대(OPEN)로 열고 물을 강하게 10초간 흘려보내 밸브 고무 시트에 낀 모래알을 밀어냅니다.",
          "criteria_normal": "이물질 씻겨 내려간 후 전원 껐을 때 물 완벽 차단",
          "criteria_fault": "플러싱 후에도 전원 OFF 상태에서 바닥으로 물이 계속 뚝뚝 떨어짐",
          "fault_action": "솔레노이드 밸브 시트 파손 또는 호스 피팅 교체 접수"
        }
      ]
    },
    "model_overrides": {
      "J600T": {
        "part_code": "HOSE-FITTING-12MM"
      },
      "J800": {
        "part_code": "HOSE-FITTING-15MM"
      },
      "S7": {
        "part_code": "HOSE-FITTING-12MM"
      },
      "S5": {
        "part_code": "HOSE-FITTING-10MM"
      },
      "S1": {
        "part_code": "HOSE-FITTING-8MM"
      },
      "S3": {
        "part_code": "HOSE-FITTING-10MM"
      },
      "쓰담": {
        "part_code": "WATER-TUBE-ROBOT"
      }
    }
  },
  {
    "id": "EXT_ERROR_CODE",
    "category": "외관/기타",
    "title": "계기판 에러 코드 점멸",
    "official_error_codes": [
      {
        "code": "888",
        "name": "자체 점검 (Self-Test)",
        "category": "시스템",
        "meaning": "키 스위치 ON 시 2초간 시스템 자체 점검 후 누적 사용 시간(Hour) 표시",
        "call_script": "고객님, 키를 켤 때 888이 뜨는 것은 2초간 시스템 자체 점검이며, 이후 뜨는 숫자는 고장이 아닌 누적 사용 시간(Hour)입니다. 장비는 정상 작동 상태입니다.",
        "resolution_type": "RESOLVED",
        "part_code": null,
        "action_desc": "정상 동작 안내 후 상담 완료"
      },
      {
        "code": "0-F",
        "name": "폐수탱크 만수",
        "category": "탱크/센서",
        "meaning": "오수(폐수)탱크에 물이 가득 차 부표 플로트 센서 작동으로 흡입 모터 안전 차단",
        "call_script": "고객님, 계기판의 0-F 코드는 오수탱크가 가득 찼다는 신호입니다. 오수 배출 호스로 물을 완전히 비우고 탱크 내부 부표망을 헹궈주시면 정상 작동합니다.",
        "resolution_type": "RESOLVED",
        "part_code": "FLOAT-VALVE-ASSY",
        "action_desc": "오수 탱크 배출 및 부표망 청소 안내"
      },
      {
        "code": "0-C",
        "name": "세수탱크 물없음",
        "category": "탱크/센서",
        "meaning": "세수(정수)탱크 수위 저하로 펌프 및 밸브 보호를 위해 장비 안전 차단",
        "call_script": "고객님, 계기판의 0-C 코드는 깨끗한 물(정수)이 떨어졌다는 알림입니다. 정수 탱크에 물을 보충해 주시면 즉시 정상 작동합니다.",
        "resolution_type": "RESOLVED",
        "part_code": "SOLENOID-VALVE-24V",
        "action_desc": "세수탱크 물 보충 안내"
      },
      {
        "code": "0-0",
        "name": "배터리 저전압",
        "category": "배터리",
        "meaning": "배터리 잔량이 컷오프 전압 이하로 방전되어 BMS 저전압 셧다운",
        "call_script": "고객님, 0-0 코드는 배터리가 완전 방전된 상태입니다. 장비 전원을 끄고 전용 충전기에 연결하여 최소 8시간 동안 완충해 주십시오.",
        "resolution_type": "RESOLVED",
        "part_code": "BATTERY-PACK-24V",
        "action_desc": "전용 충전기 8시간 완충 사이클 안내"
      },
      {
        "code": "1-0",
        "name": "브러시 과부하",
        "category": "브러시",
        "meaning": "브러시 모터에 과부하가 걸려 서킷 브레이커(차단기) 트립 또는 모터 보호 차단",
        "call_script": "고객님, 1-0 코드는 브러시에 이물질이 감겼을 때 뜹니다. 브러시를 떼어내고 회전축에 감긴 노끈이나 비닐을 제거한 뒤 후면 차단기 버튼을 딸깍 눌러주십시오.",
        "resolution_type": "RESOLVED",
        "part_code": "BRUSH-MOTOR-ASSY",
        "action_desc": "브러시 이물 제거 및 차단기 리셋 안내"
      },
      {
        "code": "1-5",
        "name": "브러시 단락/합선",
        "category": "브러시",
        "meaning": "브러시 구동 모터 단락(합선) 및 과전류 차단",
        "call_script": "고객님, 1-5 코드는 브러시 모터 내부 회로 보호를 위해 차단된 상태입니다. 무리하게 재가동하시면 모터 손상이 심해지므로 즉시 전원을 끄고 전문 엔지니어 출장 점검을 접수해 드리겠습니다.",
        "resolution_type": "VISIT_REQUIRED",
        "part_code": "BRUSH-MOTOR-ASSY",
        "action_desc": "브러시 모터 어셈블리 교체 출장 접수"
      },
      {
        "code": "1-H",
        "name": "브러시 과열",
        "category": "브러시",
        "meaning": "브러시 모터 내부 온도가 과열 임계치 초과",
        "call_script": "고객님, 1-H 코드는 브러시 모터 과열 상태입니다. 장비 전원을 끄고 통풍이 잘되는 곳에서 30분간 모터를 식힌 후 다시 켜주십시오.",
        "resolution_type": "RESOLVED",
        "part_code": "BRUSH-MOTOR-ASSY",
        "action_desc": "30분 브러시 모터 냉각 안내"
      },
      {
        "code": "2-0",
        "name": "흡입 모터 과부하",
        "category": "흡입",
        "meaning": "흡입 모터에 공기 흐름 차단 또는 이물질 걸림으로 과부하 발생",
        "call_script": "고객님, 2-0 코드는 흡입 모터 통로가 막혔다는 신호입니다. 흡입 호스와 오수 탱크 거름망 필터를 빼서 물로 깨끗이 헹군 뒤 재가동해 주십시오.",
        "resolution_type": "RESOLVED",
        "part_code": "VACUUM-MOTOR-ASSY",
        "action_desc": "흡입 호스 및 필터 이물 청소 안내"
      },
      {
        "code": "2-5",
        "name": "흡입 모터 단락/합선",
        "category": "흡입",
        "meaning": "흡입 모터 내부 코일 합선 또는 컨트롤러 파워선 단락",
        "call_script": "고객님, 2-5 코드는 흡입 모터 전기 코일 단락 상태입니다. 누전 위험이 있으므로 즉시 전원을 끄고 흡입 모터 교체 출동을 접수해 드리겠습니다.",
        "resolution_type": "VISIT_REQUIRED",
        "part_code": "VACUUM-MOTOR-ASSY",
        "action_desc": "흡입 모터 어셈블리 교체 출장 접수"
      },
      {
        "code": "2-H",
        "name": "흡입 모터 과열",
        "category": "흡입",
        "meaning": "흡입 모터 내부 온도가 과열 임계치 초과",
        "call_script": "고객님, 2-H 코드는 흡입 모터 과열 상태입니다. 흡입 스위치를 끄고 30분간 모터를 냉각시킨 후 재작동해 주십시오.",
        "resolution_type": "RESOLVED",
        "part_code": "VACUUM-MOTOR-ASSY",
        "action_desc": "30분 흡입 모터 냉각 안내"
      },
      {
        "code": "3-0",
        "name": "밸브 과전류",
        "category": "세척수",
        "meaning": "세척수 공급 솔레노이드 밸브에 과전류 감지",
        "call_script": "고객님, 3-0 코드는 물 분사 밸브에 이물질이 걸린 상태입니다. 정수 탱크 하단 스트레이너 거름망 필터를 돌려 빼서 석회질을 세척해 주십시오.",
        "resolution_type": "RESOLVED",
        "part_code": "SOLENOID-VALVE-24V",
        "action_desc": "정수 스트레이너 필터 세척 안내"
      },
      {
        "code": "3-5",
        "name": "밸브 단락/합선",
        "category": "세척수",
        "meaning": "솔레노이드 밸브 코일 단락 또는 액추에이터 고착 파손",
        "call_script": "고객님, 3-5 코드는 전자 급수 밸브 코일 단락 상태입니다. 수동 급수 밸브를 잠그고 부품 교체 출동을 접수해 드리겠습니다.",
        "resolution_type": "VISIT_REQUIRED",
        "part_code": "SOLENOID-VALVE-24V",
        "action_desc": "솔레노이드 밸브 부품 교체 출장 접수"
      }
    ],
    "symptom": "계기판에 알 수 없는 영문/숫자 에러 코드가 깜빡이며 경보 부저가 계속 울림",
    "aliases": [
      "계기판 에러 코드 점멸 / 경고음",
      "경고음 계속 울림",
      "에러 코드 점멸",
      "경고등 깜빡임",
      "경고음 계속 울림",
      "EH 에러",
      "E01 에러",
      "컨트롤러 에러",
      "에러코드"
    ],
    "urgency": "긴급",
    "part_code": "MAIN-PCB-J600",
    "action_plan": {
      "keyword": "계기판 에러 코드 점멸",
      "part_code": "MAIN-PCB-J600",
      "urgency": "긴급",
      "can_self_resolve": true,
      "call_script": "고객님, 계기판에 표시된 에러 코드 알파벳과 숫자를 말씀해 주시면 즉시 원클릭 조치 방법을 안내해 드리겠습니다.",
      "steps": [
        {
          "step_no": 1,
          "title": "에러 코드 확인 및 컨트롤러 소프트웨어 전원 리셋",
          "method": "계기판 에러 코드(E01, EH 등)를 확인 후, 키를 끄고 비상버튼을 누른 뒤 30초 대기했다가 다시 켭니다.",
          "criteria_normal": "재기동 후 에러 코드가 사라지고 정상 작동 대기 상태로 복구",
          "criteria_fault": "리셋 후에도 즉시 동일 에러 코드가 깜빡이며 경보음 울림",
          "fault_action": "상단 공식 12대 에러코드 퀵 칩에서 해당 코드 선택 후 원클릭 조치"
        }
      ]
    },
    "model_overrides": {
      "J600T": {
        "part_code": "MAIN-PCB-J600"
      },
      "J800": {
        "part_code": "MAIN-PCB-J800"
      },
      "S7": {
        "part_code": "MAIN-PCB-S7"
      },
      "S5": {
        "part_code": "MAIN-PCB-S5"
      },
      "S1": {
        "part_code": "MAIN-PCB-S1"
      },
      "S3": {
        "part_code": "MAIN-PCB-S3"
      },
      "W12": {
        "part_code": "MAIN-CONTROLLER-W12"
      },
      "W15": {
        "part_code": "MAIN-CONTROLLER-W15"
      },
      "쓰담": {
        "part_code": "MAIN-IPC-ROBOT"
      }
    }
  },
  {
    "id": "EXT_CHASSIS_DAMAGE",
    "category": "외관/기타",
    "title": "외장 부품 파손",
    "symptom": "운전 핸들 스위치, 레버, 외장 범퍼 또는 탱크 커버가 부러지거나 파손됨",
    "aliases": [
      "외장 범퍼 / 커버 파손",
      "외장 범퍼 파손",
      "커버 파손",
      "핸들 스위치 깨짐",
      "레버 부러짐",
      "탱크 뚜껑 파손",
      "외관 파손",
      "케이스 깨짐",
      "스위치 파손"
    ],
    "urgency": "보통",
    "part_code": "CHASSIS-LEVER-J600",
    "action_plan": {
      "keyword": "외장 부품 파손",
      "part_code": "CHASSIS-LEVER-J600",
      "urgency": "보통",
      "can_self_resolve": false,
      "call_script": "고객님, 파손된 외장 부품 부위 사진을 문자나 카카오톡으로 수신 후 교체 부품을 출고해 드리겠습니다.",
      "steps": [
        {
          "step_no": 1,
          "title": "파손 부위 사진 접수 및 안전상 주행 가능 여부 판정",
          "method": "파손 부위가 방수/절연에 영향을 주는지 확인하고, 안전 운행 가능 시 부품만 택배 발송합니다.",
          "criteria_normal": "단순 커버류 파손 -> 부품 택배 출고 및 고객 자체 볼팅 조치",
          "criteria_fault": "핸들 조향부 크랙 또는 배선 노출로 감전/충돌 위험",
          "fault_action": "장비 가동 중단 지시 및 A/S 긴급 출동 접수"
        }
      ]
    },
    "model_overrides": {
      "J600T": {
        "part_code": "CHASSIS-LEVER-J600"
      },
      "J800": {
        "part_code": "CHASSIS-BUMPER-J800"
      },
      "S7": {
        "part_code": "CHASSIS-HOOD-S7"
      },
      "S5": {
        "part_code": "CHASSIS-COVER-S5"
      },
      "S1": {
        "part_code": "HANDLE-ASSY-S1"
      },
      "S3": {
        "part_code": "CHASSIS-COVER-S3"
      },
      "W12": {
        "part_code": "BONNET-ASSY-W12"
      },
      "W15": {
        "part_code": "BONNET-ASSY-W15"
      },
      "쓰담": {
        "part_code": "BUMPER-SENSOR-ROBOT"
      }
    }
  }
];
