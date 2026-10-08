# -*- coding: utf-8 -*-
"""
제조사((주)스페이스) 공식 매뉴얼 기반 모델별 계기판 에러 코드 및 상태 알람 체계
- 보행식 표준형 (S3, S5, S1, S2): 7-세그먼트 13대 코드
- 탑승식 소중형 (S7, S7P, The New S7P): 액추에이터/혼/페달 포함 22대 코드
- 탑승식 대형 프리미엄 (S12): 그래픽 다기능 LCD 영문 텍스트 알람 8종
- JINCLEAN 전압계형 (J600T, J800): 실시간 볼트미터 전압 및 퓨즈/역류볼 판정 8종
- 스위퍼 (W12, W15): 3색 LED 인디케이터 및 기계식 차단기 경보 6종
- 자율주행 AI 로봇 (쓰담 / Gausium): 센서/E-Stop/도킹 시스템 알람 6종
"""

from typing import List, Dict, Any, Optional

# ─────────────────────────────────────────────────────────────
# 1. 보행식 스크러버 표준형 (S3, S3mini, S5, S1, S2) - 매뉴얼 P.37, P.39
# ─────────────────────────────────────────────────────────────
S3_S5_ERROR_CODES: List[Dict[str, Any]] = [
    {
        "code": "888",
        "name": "자체 점검 (Self-Test)",
        "category": "시스템",
        "meaning": "키 스위치 ON 시 2초간 시스템 자체 점검 후 누적 사용 시간(Hour) 표시",
        "call_script": "고객님, 키를 켤 때 888이 뜨는 것은 2초간 시스템 자체 점검이며, 이후 뜨는 숫자는 고장이 아닌 누적 사용 시간(Hour)입니다. 장비는 정상 작동 상태입니다.",
        "resolution_type": "RESOLVED",
        "part_code": None,
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
    },
    {
        "code": "9-5",
        "name": "메인 컨트롤러 고장",
        "category": "시스템",
        "meaning": "메인보드 파워단 MOSFET 파손 또는 전류 센싱 회로 비정상",
        "call_script": "고객님, 9-5 코드는 메인 제어보드 내부 부품 회로 이상입니다. 현장 자가조치가 불가하므로 전문 정비사 출장 점검을 즉시 접수해 드리겠습니다.",
        "resolution_type": "VISIT_REQUIRED",
        "part_code": "MAIN-CONTROLLER-PCB",
        "action_desc": "메인 컨트롤러 PCB 교체 출장 접수"
    }
]

# ─────────────────────────────────────────────────────────────
# 2. 탑승식 스크러버 소중형 (S7, S7P, The New S7P) - 매뉴얼 P.41
# ─────────────────────────────────────────────────────────────
S7P_ERROR_CODES: List[Dict[str, Any]] = [
    *S3_S5_ERROR_CODES[:12],  # 888 ~ 3-5 기본 코드 상속
    {
        "code": "4-0",
        "name": "경적 과전류",
        "category": "탑승/전장",
        "meaning": "경적(혼) 회로에 과전류 발생",
        "call_script": "고객님, 4-0 코드는 경적 스위치 또는 배선에 과전류가 흐른 상태입니다. 경적 버튼 끼임을 확인하고 재시동해 주십시오.",
        "resolution_type": "RESOLVED",
        "part_code": "HORN-UNIT-24V",
        "action_desc": "경적 버튼 이물 점검 및 재시동 안내"
    },
    {
        "code": "4-5",
        "name": "경적 단락/합선",
        "category": "탑승/전장",
        "meaning": "경적 유닛 내부 코일 단락",
        "call_script": "고객님, 4-5 코드는 경적 전기선 단락 상태입니다. 배선 점검 및 경적 부품 교체 출장을 접수해 드리겠습니다.",
        "resolution_type": "VISIT_REQUIRED",
        "part_code": "HORN-UNIT-24V",
        "action_desc": "경적 유닛 교체 출장 접수"
    },
    {
        "code": "6-0",
        "name": "브러시 액추에이터 과부하",
        "category": "브러시",
        "meaning": "브러시 데크 전동 승강 리프팅 모터에 기계적 걸림 또는 과부하 발생",
        "call_script": "고객님, 6-0 코드는 브러시를 올리고 내리는 전동 모터에 이물질이 걸렸을 때 뜹니다. 브러시 데크 주변에 낀 이물질을 치우고 스위치를 다시 눌러주십시오.",
        "resolution_type": "RESOLVED",
        "part_code": "ACTUATOR-BRUSH-S7",
        "action_desc": "브러시 데크 하부 이물 제거 및 승강 스위치 재조작"
    },
    {
        "code": "6-1",
        "name": "브러시 액추에이터 단락",
        "category": "브러시",
        "meaning": "브러시 승강 모터 내부 코일 합선 또는 파손",
        "call_script": "고객님, 6-1 코드는 브러시 승강 전동 모터 단락 고장입니다. 전동 액추에이터 교체 엔지니어 출장을 접수해 드리겠습니다.",
        "resolution_type": "VISIT_REQUIRED",
        "part_code": "ACTUATOR-BRUSH-S7",
        "action_desc": "브러시 승강 액추에이터 모터 교체 출장 접수"
    },
    {
        "code": "6-2",
        "name": "스퀴지 액추에이터 과부하",
        "category": "흡입",
        "meaning": "스퀴지툴 전동 승강 리프팅 모터 기계적 걸림 또는 과부하",
        "call_script": "고객님, 6-2 코드는 스퀴지 승강 장치에 걸림이 발생한 상태입니다. 스퀴지 와이어와 리프팅 암 주변에 걸린 것이 없는지 확인 후 조작해 주십시오.",
        "resolution_type": "RESOLVED",
        "part_code": "ACTUATOR-SQUEEGEE-S7",
        "action_desc": "스퀴지 승강 와이어 및 암 걸림 해제"
    },
    {
        "code": "6-3",
        "name": "스퀴지 액추에이터 단락",
        "category": "흡입",
        "meaning": "스퀴지 승강 모터 내부 코일 합선 또는 파손",
        "call_script": "고객님, 6-3 코드는 스퀴지 승강 전동 모터 단락 상태입니다. 스퀴지 액추에이터 부품 교체 출장을 접수해 드리겠습니다.",
        "resolution_type": "VISIT_REQUIRED",
        "part_code": "ACTUATOR-SQUEEGEE-S7",
        "action_desc": "스퀴지 승강 액추에이터 모터 교체 출장 접수"
    },
    {
        "code": "7-0",
        "name": "세척수 펌프 고장",
        "category": "세척수",
        "meaning": "세척수 공급 부스터 펌프 회로 이상 또는 펌프 모터 소손",
        "call_script": "고객님, 7-0 코드는 물을 뿜어주는 급수 펌프 고장입니다. 펌프 점검 및 교체 출동을 접수해 드리겠습니다.",
        "resolution_type": "VISIT_REQUIRED",
        "part_code": "WATER-PUMP-24V",
        "action_desc": "세척수 가압 펌프 교체 출장 접수"
    },
    {
        "code": "7-1",
        "name": "세제 분배유니트 고장",
        "category": "세척수",
        "meaning": "자동 세제 희석 믹싱 유니트 분배 펌프 이상",
        "call_script": "고객님, 7-1 코드는 세제 자동 투입 장치 이상입니다. 세제 공급관 에어빼기를 진행하거나 세제 투입 스위치를 껐다 켜주십시오.",
        "resolution_type": "RESOLVED",
        "part_code": "CHEMICAL-DOSING-UNIT",
        "action_desc": "세제 공급 라인 점검 및 전원 리셋"
    },
    {
        "code": "7-2",
        "name": "주행 트랙션 모터 고장",
        "category": "탑승/주행",
        "meaning": "탑승식 주행 감속기 모터 단락, 단선 또는 엔코더 신호 단절",
        "call_script": "고객님, 7-2 코드는 바퀴 주행 모터 이상입니다. 장비를 평지에 세우고 전원을 끈 후 주행모터 정밀 점검 출장을 접수해 드리겠습니다.",
        "resolution_type": "VISIT_REQUIRED",
        "part_code": "DRIVE-MOTOR-S7",
        "action_desc": "탑승식 주행 모터/감속기 출장 수리 접수"
    },
    {
        "code": "9-0",
        "name": "컨트롤러 과열",
        "category": "시스템",
        "meaning": "메인 주행/작업 컨트롤러 방열판 온도가 85℃ 초과",
        "call_script": "고객님, 9-0 코드는 장비 제어 컴퓨터(컨트롤러) 과열 상태입니다. 오르막 연속 작업 시 발생할 수 있으니 평지에서 30분간 냉각해 주십시오.",
        "resolution_type": "RESOLVED",
        "part_code": "MAIN-CONTROLLER-PCB",
        "action_desc": "장비 30분 완전 냉각 안내"
    },
    {
        "code": "9-5",
        "name": "메인보드 파워부품 고장",
        "category": "시스템",
        "meaning": "MOS 배관 파손 또는 전류 감지 센싱 회로 비정상",
        "call_script": "고객님, 9-5 코드는 컨트롤러 내부 파워 소자 이상입니다. 메인보드 교체 엔지니어 출장을 즉시 접수해 드리겠습니다.",
        "resolution_type": "VISIT_REQUIRED",
        "part_code": "MAIN-CONTROLLER-PCB",
        "action_desc": "컨트롤러 파워보드 교체 출장 접수"
    },
    {
        "code": "9-E",
        "name": "액셀레이터(페달) 고장",
        "category": "탑승/주행",
        "meaning": "발 페달 가속기 홀 센서 신호 이상 또는 리턴 스프링 파손",
        "call_script": "고객님, 9-E 코드는 발로 밟는 가속 페달 센서 이상입니다. 페달 밑에 낀 이물질이 없는지 보시고, 지속 시 페달 센서 교체 출장을 접수해 드리겠습니다.",
        "resolution_type": "VISIT_REQUIRED",
        "part_code": "ACCEL-PEDAL-ASSY",
        "action_desc": "가속 페달 어셈블리 점검 및 출장 교체 접수"
    },
    {
        "code": "E-0",
        "name": "가압 발판 미해제",
        "category": "브러시",
        "meaning": "브러시 가압 페달이 밟혀 잠긴 상태에서 전동 브러시 승강 조작 불가",
        "call_script": "고객님, E-0 코드는 발판 가압 장치가 잠겨있는 상태입니다. 운전석 발밑의 브러시 가압 페달을 한 번 더 밟아 잠금을 해제해 주시면 정상 승강됩니다.",
        "resolution_type": "RESOLVED",
        "part_code": None,
        "action_desc": "브러시 가압 발판 락 해제 안내"
    }
]

# ─────────────────────────────────────────────────────────────
# 3. 탑승식 대형 프리미엄 LCD 디스플레이 (S12) - 매뉴얼 P.38
# ─────────────────────────────────────────────────────────────
S12_ERROR_CODES: List[Dict[str, Any]] = [
    {
        "code": "SOLUTION TANK EMPTY",
        "name": "세수탱크 물 없음",
        "category": "세척수",
        "meaning": "세수(정수) 탱크에 물이 고갈되어 펌프 공회전 방지를 위해 밸브 자동 차단",
        "call_script": "고객님, 화면의 'SOLUTION TANK EMPTY' 문구는 정수 탱크가 비었다는 안내입니다. 깨끗한 물을 채워주시면 즉시 정상 가동됩니다.",
        "resolution_type": "RESOLVED",
        "part_code": None,
        "action_desc": "세수탱크 물 보충 안내 후 상담 종결"
    },
    {
        "code": "RECOVERY TANK FULL",
        "name": "폐수탱크 만수",
        "category": "탱크/센서",
        "meaning": "오수탱크에 폐수가 100% 도달하여 전자 레벨 센서에 의해 흡입 자동 정지",
        "call_script": "고객님, 'RECOVERY TANK FULL' 문구는 오수탱크가 가득 찼다는 알림입니다. 배출 호스로 오수를 비워주시면 바로 재가동됩니다.",
        "resolution_type": "RESOLVED",
        "part_code": None,
        "action_desc": "오수 탱크 배출 안내 후 상담 종결"
    },
    {
        "code": "BRUSH MOTOR TEMPERATURE PAUSE",
        "name": "브러시 모터 과열 정지",
        "category": "브러시",
        "meaning": "듀얼 대형 브러시 모터 내부 써모스탯 과열 감지로 모터 보호 일시 정지",
        "call_script": "고객님, 'BRUSH MOTOR TEMPERATURE PAUSE'는 브러시 모터 열을 식히는 중이라는 뜻입니다. 장비를 30분간 세워두시면 자동으로 안전 잠금이 풀립니다.",
        "resolution_type": "RESOLVED",
        "part_code": "BRUSH-MOTOR-S12",
        "action_desc": "브러시 모터 30분 냉각 안내"
    },
    {
        "code": "BATTERY LOW CHARGE BATTERY",
        "name": "배터리 충전 요망 (잔량 20% 이하)",
        "category": "배터리",
        "meaning": "배터리 잔량이 20% 이하로 저하되어 조기 충전 권장",
        "call_script": "고객님, 'BATTERY LOW' 알람은 배터리가 20% 이하라는 경고입니다. 작업을 마무리하시고 충전 스테이션으로 이동하여 충전해 주십시오.",
        "resolution_type": "RESOLVED",
        "part_code": "BATTERY-S12-PACK",
        "action_desc": "충전소 이동 및 충전 안내"
    },
    {
        "code": "BATTERY FLAT TRACTION ONLY",
        "name": "배터리 고갈 (주행만 가능, 10% 이하)",
        "category": "배터리",
        "meaning": "배터리 10% 이하로 청소 모터 자동 차단되며 오직 복귀 주행만 허용",
        "call_script": "고객님, 'TRACTION ONLY' 상태는 배터리 보호를 위해 브러시와 흡입이 꺼지고 이동만 가능한 상태입니다. 즉시 충전기로 이동해 주십시오.",
        "resolution_type": "RESOLVED",
        "part_code": "BATTERY-S12-PACK",
        "action_desc": "청소 중단 및 즉시 충전 안내"
    },
    {
        "code": "BATTERY FLAT ALL FUNCTION STOP",
        "name": "배터리 완전 방전 (전 기능 정지, 5% 이하)",
        "category": "배터리",
        "meaning": "배터리 잔량 5% 이하로 BMS 보호 차단(완전 셧다운)",
        "call_script": "고객님, 'ALL FUNCTION STOP'은 배터리가 완전 방전된 상태입니다. 이동을 멈추고 충전기를 장비 위치로 가져와 즉시 연결해 주십시오.",
        "resolution_type": "RESOLVED",
        "part_code": "BATTERY-S12-PACK",
        "action_desc": "전원 차단 및 즉시 충전기 직결 안내"
    },
    {
        "code": "BRUSHES WORN CHECK BRUSHES",
        "name": "브러시 마모 한계 도달",
        "category": "브러시",
        "meaning": "브러시 솔 길이가 마모 한계선에 도달하여 바닥 손상 및 청소력 저하 감지",
        "call_script": "고객님, 'CHECK BRUSHES' 알람은 브러시 교체 주기가 되었다는 신호입니다. 신품 브러시 출고 또는 정비사 방문 교체를 접수해 드리겠습니다.",
        "resolution_type": "VISIT_REQUIRED",
        "part_code": "DISC-BRUSH-17INCH",
        "action_desc": "브러시 신품 교체 출장/택배 접수"
    },
    {
        "code": "~ PLEASE SIT UP",
        "name": "시트 운전자 감지 센서 미감지",
        "category": "탑승/주행",
        "meaning": "운전석 시트 하부 압력 센서에 체중이 감지되지 않아 안전을 위해 주행 정지",
        "call_script": "고객님, 화면의 'PLEASE SIT UP'은 운전석 의자 센서가 운전자를 감지하지 못한 상태입니다. 의자 중앙에 바르게 앉아주시면 안전 차단이 즉시 해제됩니다.",
        "resolution_type": "RESOLVED",
        "part_code": "SEAT-SAFETY-SENSOR",
        "action_desc": "시트 정위치 착석 안내 후 즉시 해결"
    }
]

# ─────────────────────────────────────────────────────────────
# 4. JINCLEAN 전압계형 모델 (J600T, J800) - 매뉴얼 P.10, P.22
# ─────────────────────────────────────────────────────────────
JINCLEAN_ERROR_CODES: List[Dict[str, Any]] = [
    {
        "code": "전압 22.0V 이하",
        "name": "배터리 저전압 경보",
        "category": "배터리",
        "meaning": "디스플레이 전압 수치가 22.0V 이하로 떨어져 저전압 셧다운 임박",
        "call_script": "고객님, JINCLEAN 계기판의 전압 수치가 22V 이하인 경우 배터리 부족 상태입니다. 전원을 끄고 전용 충전기로 최소 8시간 완충해 주십시오.",
        "resolution_type": "RESOLVED",
        "part_code": "BATTERY-PACK-24V",
        "action_desc": "전용 충전기 완충 사이클 안내"
    },
    {
        "code": "디스플레이 미점등",
        "name": "전원 인입 불가",
        "category": "전원",
        "meaning": "전원 스위치를 켜도 디스플레이에 전압 숫자가 일절 뜨지 않음",
        "call_script": "고객님, 계기판에 숫자가 전혀 안 들어오시면 비상정지 스위치가 눌려있거나 배터리 연결잭이 헐거워진 상태입니다. 비상스위치를 시계방향으로 돌려 풀고 배터리 잭을 다시 꽂아보십시오.",
        "resolution_type": "RESOLVED",
        "part_code": "MAIN-SWITCH-ASSY",
        "action_desc": "비상스위치 해제 및 배터리 커넥터 결속 점검"
    },
    {
        "code": "흡입 퓨즈 단락",
        "name": "흡입 모터 퓨즈 단락",
        "category": "흡입",
        "meaning": "흡입 모터 과부하 또는 수분 유입으로 퓨즈함 내부 보호 퓨즈 단락",
        "call_script": "고객님, 흡입 모터가 전혀 돌지 않는 경우 오수탱크 하부 퓨즈함의 퓨즈가 단락된 상태일 수 있습니다. 정비사 출장 점검으로 퓨즈 및 모터 상태를 확인해 드리겠습니다.",
        "resolution_type": "VISIT_REQUIRED",
        "part_code": "FUSE-50A",
        "action_desc": "흡입모터 보호 퓨즈 교체 출장 접수"
    },
    {
        "code": "브러시 퓨즈 단락",
        "name": "브러시 모터 퓨즈 단락",
        "category": "브러시",
        "meaning": "브러시 모터에 이물질 과부하로 브러시 보호 퓨즈 단락",
        "call_script": "고객님, 브러시가 돌지 않는 경우 모터 보호 퓨즈가 끊어진 상태입니다. 브러시 회전축 이물질 제거와 퓨즈 교체 출동을 접수해 드리겠습니다.",
        "resolution_type": "VISIT_REQUIRED",
        "part_code": "FUSE-40A",
        "action_desc": "브러시 보호 퓨즈 교체 출장 접수"
    },
    {
        "code": "역류방지볼 흡입 차단",
        "name": "폐수 만수 부구 차단",
        "category": "흡입",
        "meaning": "폐수탱크 만수로 인해 안전 차단 볼(플로트)이 흡입 관로를 막음",
        "call_script": "고객님, 흡입 모터 소리가 고음으로 커지며 바닥 물이 안 빨리는 것은 폐수가 가득 차서 안전 볼이 구멍을 막았기 때문입니다. 오수 배출 호스로 폐수를 완전히 비워주십시오.",
        "resolution_type": "RESOLVED",
        "part_code": None,
        "action_desc": "오수탱크 배출 및 플로트볼 정상 위치 확인"
    },
    {
        "code": "세수배관/필터 막힘",
        "name": "세수 분사 불량",
        "category": "세척수",
        "meaning": "세수 탱크 하부 필터 커버 내 불순물 포화로 물 분사 중단",
        "call_script": "고객님, 물이 나오지 않는 경우 세수 필터 커버에 찌꺼기가 낀 상태입니다. 장비 하단 투명 필터 캡을 돌려 빼서 거름망을 물로 세척해 주십시오.",
        "resolution_type": "RESOLVED",
        "part_code": "WATER-FILTER-COVER",
        "action_desc": "세수 스트레이너 거름망 필터 세척 안내"
    },
    {
        "code": "솔레노이드 밸브 고장",
        "name": "전자 급수 밸브 고장",
        "category": "세척수",
        "meaning": "솔레노이드 밸브 코일 소손으로 전원이 들어가도 밸브 개방 불가",
        "call_script": "고객님, 물탱크와 필터가 깨끗한데도 물이 분사되지 않는다면 전자 솔레노이드 밸브 고장입니다. 부품 교체 출장을 접수해 드리겠습니다.",
        "resolution_type": "VISIT_REQUIRED",
        "part_code": "SOLENOID-VALVE-24V",
        "action_desc": "솔레노이드 밸브 부품 교체 출장 접수"
    },
    {
        "code": "스퀴지 과다 눌림",
        "name": "스퀴지 접지 불량 및 잔수",
        "category": "흡입",
        "meaning": "스퀴지 고무가 바닥에 너무 눌려 소음 발생 및 잔수 남음",
        "call_script": "고객님, 스퀴지에서 뽀드득 소리가 심하고 물이 덜 빨리는 것은 고무 높이가 너무 낮게 눌렸기 때문입니다. 스퀴지 바퀴 조절 휠을 반바퀴 돌려 높이를 올려주십시오.",
        "resolution_type": "RESOLVED",
        "part_code": "SQUEEGEE-RUBBER-825",
        "action_desc": "스퀴지 고무 높이 조정 노브 세팅 안내"
    }
]

# ─────────────────────────────────────────────────────────────
# 5. 탑승식 스위퍼 (W12, W15) - 매뉴얼 P.6, P.13
# ─────────────────────────────────────────────────────────────
SWEEPER_ERROR_CODES: List[Dict[str, Any]] = [
    {
        "code": "배터리 적색 LED",
        "name": "배터리 방전 경고",
        "category": "배터리",
        "meaning": "배터리 잔량 인디게이터 적색 LED 점등 (잔량 부족)",
        "call_script": "고객님, 배터리 게이지에 빨간불이 들어온 것은 즉시 충전이 필요한 상태입니다. 작업을 멈추고 충전소로 이동하여 전원 코드를 꽂아주십시오.",
        "resolution_type": "RESOLVED",
        "part_code": "BATTERY-PACK-24V",
        "action_desc": "즉시 충전기 연결 완충 안내"
    },
    {
        "code": "브러시 차단기 팝업",
        "name": "브러시 과부하 차단기 작동",
        "category": "브러시",
        "meaning": "메인/사이드 브러시에 끈이나 비닐이 감겨 기계식 차단기 버튼 팝업",
        "call_script": "고객님, 브러시가 돌지 않는 경우 운전석 옆 서킷브레이커 버튼이 튀어나와 있는지 보십시오. 브러시에 감긴 끈을 가위로 제거한 후 튀어나온 버튼을 꾹 눌러주십시오.",
        "resolution_type": "RESOLVED",
        "part_code": "BREAKER-SWITCH-W12",
        "action_desc": "브러시 이물 제거 및 서킷브레이커 버튼 리셋"
    },
    {
        "code": "물탱크 저수위 점등",
        "name": "살수 물탱크 저수위 경고",
        "category": "살수/분진",
        "meaning": "비산먼지 방지 사이드브러시 스프레이 물탱크 저수위 인디게이터 점등",
        "call_script": "고객님, 물탱크 경고등이 켜진 것은 먼지 방지용 물탱크가 비었다는 알림입니다. 물을 보충해 주시면 스프레이가 다시 작동합니다.",
        "resolution_type": "RESOLVED",
        "part_code": None,
        "action_desc": "물탱크 보충 안내 후 상담 종결"
    },
    {
        "code": "주차브레이크 램프",
        "name": "주차브레이크 잠김 상태",
        "category": "탑승/주행",
        "meaning": "파킹 브레이크가 걸린 상태에서 페달을 밟아 주행 경보등 점등",
        "call_script": "고객님, 계기판의 브레이크 램프가 켜져 있으면 페달을 밟아도 주행되지 않습니다. 발밑의 파킹 브레이크 페달을 다시 밟아 잠금을 풀어주십시오.",
        "resolution_type": "RESOLVED",
        "part_code": None,
        "action_desc": "주차 브레이크 페달 잠금 해제 안내"
    },
    {
        "code": "필터 쉐이커 막힘",
        "name": "먼지 필터 포화 (흡입 저하)",
        "category": "흡입/필터",
        "meaning": "스위퍼 내부 원통형 분진 필터에 먼지가 포화되어 흡입력 저하",
        "call_script": "고객님, 비산먼지가 날리거나 흡입력이 약해진 경우 조작부의 '필터 청소 스위치'를 10초간 눌러 진동 모터로 필터 먼지를 털어내 주십시오.",
        "resolution_type": "RESOLVED",
        "part_code": "FILTER-SHAKER-MOTOR",
        "action_desc": "자동 필터 쉐이커 스위치 작동 안내"
    },
    {
        "code": "비상정지 버튼 눌림",
        "name": "비상정지 스위치 체결",
        "category": "시스템",
        "meaning": "빨간색 비상정지 버튼(E-Stop)이 눌려 전체 전원 차단",
        "call_script": "고객님, 장비 전원이 일절 켜지지 않는 경우 운전석 옆 빨간색 비상정지 버튼을 시계 방향으로 돌려 딸깍 소리가 나며 튀어나오게 해제해 주십시오.",
        "resolution_type": "RESOLVED",
        "part_code": None,
        "action_desc": "비상정지 버튼 우회전 팝업 해제 안내"
    }
]

# ─────────────────────────────────────────────────────────────
# 6. 자율주행 AI 로봇 (쓰담 / Gausium)
# ─────────────────────────────────────────────────────────────
ROBOT_ERROR_CODES: List[Dict[str, Any]] = [
    {
        "code": "LIDAR SENSOR BLOCKED",
        "name": "라이다 센서 차폐/오염",
        "category": "센서/AI",
        "meaning": "3D LiDAR 또는 Depth 카메라 센서 표면에 먼지/오염 차폐 발생",
        "call_script": "고객님, 로봇 화면의 센서 차폐 알람은 라이다 렌즈에 오염이 묻었을 때 발생합니다. 전용 극세사 천으로 전면 센서 렌즈를 깨끗이 닦아주십시오.",
        "resolution_type": "RESOLVED",
        "part_code": "LIDAR-SENSOR-ROBOT",
        "action_desc": "라이다 및 카메라 센서 표면 극세사 청소 안내"
    },
    {
        "code": "EMERGENCY STOP PRESSED",
        "name": "비상정지 스위치 눌림",
        "category": "시스템",
        "meaning": "로봇 본체 상단 비상정지 E-Stop 버튼 물리적 체결",
        "call_script": "고객님, 로봇 상단의 빨간 비상정지 버튼을 오른쪽으로 가볍게 돌려 딸깍 올려주시면 자율주행 모드가 재개됩니다.",
        "resolution_type": "RESOLVED",
        "part_code": None,
        "action_desc": "E-Stop 버튼 회전 해제 안내"
    },
    {
        "code": "PATH OBSTRUCTED",
        "name": "주행 경로 고정 장애물",
        "category": "주행/내비",
        "meaning": "지정 맵 경로 상에 이동 불가능한 대형 장애물이 1분 이상 차폐",
        "call_script": "고객님, 로봇이 서 있는 통로 앞의 카트나 적재물을 치워주시거나, 화면의 '경로 우회 재탐색' 버튼을 눌러주십시오.",
        "resolution_type": "RESOLVED",
        "part_code": None,
        "action_desc": "경로 장애물 이동 또는 터치패널 우회 재탐색"
    },
    {
        "code": "CLEAN WATER EMPTY",
        "name": "세수탱크 물 고갈",
        "category": "세척수",
        "meaning": "로봇 세수탱크 수위 고갈로 자동 정지",
        "call_script": "고객님, 로봇 화면에서 '홈 스테이션 복귀'를 누르시거나 워크스테이션 급수 커넥터를 연결해 깨끗한 물을 채워주십시오.",
        "resolution_type": "RESOLVED",
        "part_code": None,
        "action_desc": "도킹 스테이션 자동 급수 또는 수동 급수 안내"
    },
    {
        "code": "WASTE WATER FULL",
        "name": "오수탱크 만수",
        "category": "탱크/센서",
        "meaning": "로봇 오수탱크 레벨 센서 만수 도달",
        "call_script": "고객님, 오수 탱크가 가득 찼습니다. 워크스테이션 자동 배출 또는 후면 배출 호스로 오수를 비워주십시오.",
        "resolution_type": "RESOLVED",
        "part_code": None,
        "action_desc": "오수탱크 자동/수동 배출 안내"
    },
    {
        "code": "DOCKING FAILED",
        "name": "충전 스테이션 도킹 실패",
        "category": "충전/도킹",
        "meaning": "워크스테이션 진입 시 마커 인식 또는 충전 패드 접점 정렬 불량",
        "call_script": "고객님, 스테이션 충전 전극 패드에 이물질이 없는지 마른걸레로 닦아주시고 수동 조작으로 전극에 밀착시켜 주십시오.",
        "resolution_type": "RESOLVED",
        "part_code": "CHARGING-STATION-ROBOT",
        "action_desc": "충전 스테이션 패드 청소 및 수동 정렬"
    }
]

# ─────────────────────────────────────────────────────────────
# 모델명별 에러코드 매핑 딕셔너리
# ─────────────────────────────────────────────────────────────
MODEL_OFFICIAL_ERROR_CODES: Dict[str, List[Dict[str, Any]]] = {
    # 보행식 표준형
    "S3": S3_S5_ERROR_CODES,
    "S5": S3_S5_ERROR_CODES,
    "S1": S3_S5_ERROR_CODES,
    "S2": S3_S5_ERROR_CODES,

    # 탑승식 소중형
    "S7": S7P_ERROR_CODES,
    "S7P": S7P_ERROR_CODES,

    # 탑승식 대형 프리미엄 LCD
    "S12": S12_ERROR_CODES,

    # JINCLEAN 전압계형
    "J600T": JINCLEAN_ERROR_CODES,
    "J800": JINCLEAN_ERROR_CODES,

    # 스위퍼
    "W12": SWEEPER_ERROR_CODES,
    "W15": SWEEPER_ERROR_CODES,

    # 자율주행 AI 로봇
    "쓰담": ROBOT_ERROR_CODES,
}


def get_model_error_codes(model_name: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    선택된 장비 모델에 해당하는 공식 매뉴얼 에러코드 및 알람 목록 반환.
    - S3, S5, S1, S2 -> 보행식 7-세그먼트 13종
    - S7, S7P -> 탑승식 전용 전동 액추에이터/혼/페달 포함 22종
    - S12 -> 대형 그래픽 LCD 영문 텍스트 알람 8종
    - J600T, J800 -> 볼트미터 전압 및 퓨즈/역류볼 8종
    - W12, W15 -> 스위퍼 LED 및 차단기 경보 6종
    - 쓰담 -> AI 로봇 라이다/도킹 알람 6종
    - 전체 또는 미지정 -> 대표 표준 목록 반환
    """
    if not model_name or model_name.strip() in ("전체", ""):
        # '전체'일 경우 가장 범용적인 S3/S5 표준 13종 반환
        return S3_S5_ERROR_CODES

    target = model_name.strip().upper()
    if target in MODEL_OFFICIAL_ERROR_CODES:
        return MODEL_OFFICIAL_ERROR_CODES[target]

    # 부분 일치 검색
    for k, v in MODEL_OFFICIAL_ERROR_CODES.items():
        if k.upper() in target or target in k.upper():
            return v

    return S3_S5_ERROR_CODES
