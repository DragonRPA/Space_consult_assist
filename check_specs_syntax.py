import sys

# Test script to prepare MODEL_SPECIFICATIONS and SPECIAL_MANUAL_GUIDES
MODEL_SPECIFICATIONS = {
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
        "fuse_location": "오수탱크 후크 해제 틸팅 후 하부 퓨즈함 커버(모터 보호 퓨즈)",
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
}

SPECIAL_MANUAL_GUIDES = [
    {
        "id": "GUIDE_BRUSH_AUTO",
        "category": "브러시/패드",
        "title": "원터치 브러시 자동 착탈 가이드",
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
        "title": "소포제(거품제거제) 투입 및 모터 침수 방지",
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
        "title": "겨울철 동파 방지 및 100% 완전 퇴수 수칙",
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
        "title": "전자 파킹 브레이크 해제 및 수동 견인",
        "target_situation": "배터리 방전으로 탑승 장비가 멈춰서 안 움직일 때",
        "operation_steps": [
            "1. 탑승식 장비(S7P/J800/W12 등)는 전자 브레이크가 걸려 전원이 없으면 인력으로 밀 수 없음.",
            "2. 장비 하부 구동 모터(트랜스액슬) 뒤편의 '수동 브레이크 해제 레버'를 찾음.",
            "3. 해제 레버를 당겨 '수동 중립(N)' 위치로 전환하면 인력으로 밀거나 견인 가능.",
            "4. ※ 주의: 경사면에서는 장비가 굴러 내려갈 수 있으므로 반드시 평지에서만 해제할 것."
        ],
        "call_script": "고객님, 배터리가 나가면 전자 브레이크가 잠겨 차가 안 밀립니다. 뒷바퀴 모터 뒤쪽에 달린 작은 해제 레버를 당기시면 손으로 밀어서 안전한 곳으로 이동하실 수 있습니다."
    }
]

print("Syntax check passed! Models:", len(MODEL_SPECIFICATIONS), "Guides:", len(SPECIAL_MANUAL_GUIDES))
