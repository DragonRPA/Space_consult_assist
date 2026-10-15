# -*- coding: utf-8 -*-
import os
import re

canonical_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "app", "api", "v1", "endpoints", "canonical_symptoms.py"))
counsel_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "app", "api", "v1", "endpoints", "counsel.py"))

with open(canonical_path, "r", encoding="utf-8") as f:
    content = f.read()

# Define OFFICIAL_12_ERROR_CODES definition
codes_block = '''
OFFICIAL_12_ERROR_CODES: List[Dict[str, Any]] = [
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
        "action_desc": "이물 제거 및 후면 차단기 리셋 안내"
    },
    {
        "code": "1-5",
        "name": "브러시 단락/합선",
        "category": "브러시",
        "meaning": "브러시 모터 내부 코일 합선 또는 전원 배선 단락 감지",
        "call_script": "고객님, 1-5 코드는 브러시 모터 내부 코일 손상이 감지된 상태입니다. 안전을 위해 전원을 끄고 정비사 방문 점검을 접수해 드리겠습니다.",
        "resolution_type": "VISIT_REQUIRED",
        "part_code": "BRUSH-MOTOR-ASSY",
        "action_desc": "브러시 모터 어셈블리 교체 출장 접수"
    },
    {
        "code": "1-H",
        "name": "브러시 과열",
        "category": "브러시",
        "meaning": "브러시 모터 내부 온도가 과열 임계치 초과",
        "call_script": "고객님, 1-H 코드는 브러시 모터가 과열된 상태입니다. 키 스위치를 끄고 통풍이 잘되는 그늘에서 30분간 식힌 뒤 다시 켜주십시오.",
        "resolution_type": "RESOLVED",
        "part_code": "BRUSH-MOTOR-ASSY",
        "action_desc": "30분 전원 차단 후 자연 냉각 안내"
    },
    {
        "code": "2-0",
        "name": "흡입 모터 과부하",
        "category": "흡입",
        "meaning": "흡입 호스 막힘 또는 오수 넘침으로 진공 모터 부압/과전류 발생",
        "call_script": "고객님, 2-0 코드는 흡입 모터에 과부하가 걸린 것입니다. 오수 탱크를 비우고 흡입 호스 내부 이물질과 필터를 청소해 주십시오.",
        "resolution_type": "RESOLVED",
        "part_code": "VACUUM-MOTOR-ASSY",
        "action_desc": "흡입 호스 및 필터 이물 세척 안내"
    },
    {
        "code": "2-5",
        "name": "흡입 모터 단락/합선",
        "category": "흡입",
        "meaning": "흡입 모터 내부 코일 소손 또는 배선 단락 감지",
        "call_script": "고객님, 2-5 코드는 흡입 모터 내부 단락 상태입니다. 추가 손상을 막기 위해 전원을 끄시고, 모터 교체 출동을 즉시 배차해 드리겠습니다.",
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
]
'''

# 1. Insert OFFICIAL_12_ERROR_CODES if not already present
if "OFFICIAL_12_ERROR_CODES" not in content:
    target = 'AVAILABLE_MODELS = ["전체", "J600T", "J800", "S7", "S5", "S1", "S3", "쓰담"]\n'
    content = content.replace(target, target + codes_block + "\n")

# 2. Add "official_error_codes": OFFICIAL_12_ERROR_CODES to EXT_ERROR_CODE
target_ext = '"id": "EXT_ERROR_CODE",\n        "category": "외관/기타",\n        "title": "계기판 에러 코드 점멸",'
replacement_ext = '"id": "EXT_ERROR_CODE",\n        "category": "외관/기타",\n        "title": "계기판 에러 코드 점멸",\n        "official_error_codes": OFFICIAL_12_ERROR_CODES,'

if target_ext in content and '"official_error_codes"' not in content:
    content = content.replace(target_ext, replacement_ext)

with open(canonical_path, "w", encoding="utf-8") as f:
    f.write(content)
print(f"Updated {canonical_path}")

# 3. Update counsel.py to expose GET /official-error-codes
with open(counsel_path, "r", encoding="utf-8") as f:
    counsel_content = f.read()

if "OFFICIAL_12_ERROR_CODES" not in counsel_content:
    counsel_content = counsel_content.replace(
        "from .canonical_symptoms import (\n    AVAILABLE_MODELS,\n    CANONICAL_FAILURE_TYPES,\n    resolve_symptoms_for_model\n)",
        "from .canonical_symptoms import (\n    AVAILABLE_MODELS,\n    CANONICAL_FAILURE_TYPES,\n    OFFICIAL_12_ERROR_CODES,\n    resolve_symptoms_for_model\n)"
    )
    
    endpoint_code = '''
@router.get("/official-error-codes")
async def get_official_error_codes():
    """제조사((주)스페이스) 공식 12대 계기판 에러 코드 및 원클릭 즉시 판정 기준 반환"""
    return {
        "status": "success",
        "total": len(OFFICIAL_12_ERROR_CODES),
        "codes": OFFICIAL_12_ERROR_CODES
    }
'''
    counsel_content = counsel_content.replace(
        '@router.get("/model-symptoms")',
        endpoint_code + '\n@router.get("/model-symptoms")'
    )

    with open(counsel_path, "w", encoding="utf-8") as f:
        f.write(counsel_content)
    print(f"Updated {counsel_path}")

print("Backend update complete!")
