import json
import os
import glob
import re
import random

# Space Consult Assist — 청소장비 특수목적 18대 부품코드 데이터셋 생성기

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SQL_DIR = os.path.join(BASE_DIR, "backend", "scripts")

PART_DEFINITIONS = {
    "SUCTION": {
        "keywords": ["흡입 안됨", "오수 흡입 불량", "흡입 모터 소음", "호스 막힘", "바닥 물기 남음", "스퀴지 흡입 안됨"],
        "templates": [
            "청소기가 지나갔는데 바닥에 물기가 그대로 흥건하게 남아있어요.",
            "오수 흡입이 전혀 안 돼요. 호스가 막힌 것 같은데 어떻게 하죠?",
            "흡입 모터 돌아가는 소리가 평소랑 다르게 굉음이 나면서 흡입력이 없어요.",
            "바닥에 물을 빨아들이지를 못해요. 오수통에 물이 하나도 안 차요.",
            "스퀴지 쪽에서 물을 못 끌어올리고 바닥에 다 끌고 다닙니다.",
            "호스 연결부에서 쉭쉭 바람 새는 소리만 나고 흡입이 안 먹혀요.",
            "오수통 비웠는데도 흡입 모터가 전혀 힘을 못 쓰고 물을 못 빨아올립니다.",
            "먼지 필터랑 거름망은 청소했는데 흡입 압력이 아예 안 걸려요."
        ]
    },
    "POWER": {
        "keywords": ["전원 안 켜짐", "전원 스위치 불량", "시동 안 걸림", "배터리 방전", "키스위치 먹통"],
        "templates": [
            "장비 메인 전원 스위치를 켰는데 아무런 불도 안 들어오고 반응이 없어요.",
            "어제 분명 충전기 꽂아뒀는데 오늘 아침에 켜보니까 전원이 전혀 안 들어옵니다.",
            "열쇠 돌려도 틱 소리도 안 나고 시동이 아예 안 켜져요.",
            "전원 버튼이 뻑뻑해서 안 눌러지는 것 같아요. 불이 안 켜집니다.",
            "장비 메인 전원이 나간 것 같아요. 220V 전원선 연결해도 무반응입니다.",
            "배터리 방전인지 스위치 고장인지 전원 자체가 아예 안 먹힙니다."
        ]
    },
    "WATER_SOLENOID": {
        "keywords": ["솔레노이드 밸브 불량", "세정수 차단 안됨", "밸브 누수", "솔레노이드 딸깍 소리 없음", "세정수 분사 불량"],
        "templates": [
            "세정수 스위치를 켜도 솔레노이드 밸브에서 딸깍하는 작동음이 안 들려요.",
            "청소기를 껐는데도 바닥으로 물이 계속 찔끔찔끔 새어 나옵니다. 밸브가 안 닫히나요?",
            "솔레노이드 밸브에 전기가 안 들어가는지 밸브가 열리지를 않아서 물이 안 나와요.",
            "급수 밸브 쪽에 손을 대봐도 진동이 없고 세정수가 차단되어 있어요.",
            "스위치 끄면 물이 멈춰야 하는데 밸브가 고착됐는지 계속 바닥으로 물이 흐릅니다."
        ]
    },
    "WATER_NO_FLOW": {
        "keywords": ["물 안나옴", "세정수 미공급", "물 분사 안됨", "급수 노즐 막힘", "청수통 물 있음"],
        "templates": [
            "청수통에 물을 가득 채웠는데 바닥으로 물이 전혀 안 나와요.",
            "브러시는 도는데 세정수가 안 뿌려져서 바닥이 뻑뻑해요.",
            "물 분사 노즐 구멍이 막혔는지 물이 한 방울도 안 떨어집니다.",
            "하단 급수 밸브 열어뒀는데도 물이 안 나와서 바닥 청소를 못하고 있어요.",
            "물통에는 물이 많은데 브러시 패드 쪽으로 물 공급이 아예 안 돼요."
        ]
    },
    "WATER_SUPPLY_FAIL": {
        "keywords": ["급수 펌프 고장", "급수 라인 에어참", "청수 필터 막힘", "펌프 작동음 없음"],
        "templates": [
            "급수 펌프 모터 소리는 위잉 나는데 물이 펌핑이 안 되고 에어만 차있어요.",
            "청수 필터 거름망을 열어보니까 찌꺼기로 꽉 막혀서 물이 안 넘어갑니다.",
            "급수 모터 자체가 안 돌아요. 펌프 쪽 배선이 빠진 건가요?",
            "배관 라인에 에어가 찼는지 펌프가 헛돌면서 물을 못 밀어냅니다."
        ]
    },
    "DRIVE_BRUSH": {
        "keywords": ["브러시 회전 안됨", "브러시 모터 이상", "브러시 이물질 걸림", "구동 벨트 끊어짐"],
        "templates": [
            "브러시 레버를 밟아도 바닥 브러시가 전혀 회전하지 않아요.",
            "브러시 쪽에 비닐 끈이랑 걸레가 칭칭 감겨서 모터가 멈춰버렸습니다.",
            "브러시 모터 쪽에서 타는 냄새가 나면서 회전이 안 됩니다.",
            "구동 벨트가 벗겨진 건지 헛도는 소리만 나고 브러시 패드가 안 돌아요.",
            "브러시 모터 회전음은 들리는데 실제 브러시는 멈춰있습니다."
        ]
    },
    "BRUSH_FAIL": {
        "keywords": ["브러시 과열 트립", "브러시 퓨즈 끊어짐", "브러시 모터 고장", "브러시 정지"],
        "templates": [
            "청소하다가 갑자기 탁 소리가 나면서 브러시가 멈추고 다시 안 돌아요.",
            "브러시 차단기(과부하 스위치)가 툭 튀어나와서 리셋해도 바로 또 튕깁니다.",
            "브러시 모터 수명이 다 된 것 같아요. 힘없이 돌다가 그냥 서버립니다.",
            "브러시 릴레이 접점이 붙었는지 브러시가 제어가 안 되고 멈춥니다."
        ]
    },
    "BRUSH_WIRE": {
        "keywords": ["브러시 와이어 단선", "승강 와이어 끊어짐", "와이어 피복 손상", "와이어 장력 불량"],
        "templates": [
            "브러시 들어 올리는 와이어가 툭 끊어져서 브러시 헤드가 바닥에 뚝 떨어졌어요.",
            "와이어가 녹슬어서 뻑뻑해가지고 레버를 당겨도 브러시가 올라오지 않아요.",
            "승강 와이어 피복이 벗겨져서 철심이 다 삐져나왔습니다. 손 다칠 것 같아요.",
            "조작 와이어 장력이 풀려서 브러시 높이 조절이 전혀 안 됩니다."
        ]
    },
    "BRUSH_COVER": {
        "keywords": ["브러시 커버 깨짐", "스커트 파손", "커버 고정 핀 이탈", "커버 간섭"],
        "templates": [
            "기둥에 살짝 부딪혔는데 브러시 플라스틱 커버가 쩍 갈라져서 깨졌어요.",
            "브러시 덮개 핀이 빠져서 커버가 덜렁거리고 바닥에 긁힙니다.",
            "사이드 스커트 고무랑 커버가 찢어져서 옆으로 물이 다 튑니다.",
            "브러시 커버가 찌그러져서 브러시 회전할 때마다 딱딱딱 때리는 소리가 나요."
        ]
    },
    "FORWARD_FAIL": {
        "keywords": ["전후진 불가", "주행 모터 고장", "구동 바퀴 헛돎", "주행 레버 먹통", "전진 안됨"],
        "templates": [
            "전진 레버를 당겨도 장비가 앞으로 나가지 않고 꿈쩍도 안 해요.",
            "후진은 되는데 전진만 넣으면 삐 소리 나면서 주행이 안 됩니다.",
            "구동 바퀴 축에 이물질이 끼었는지 모터 돌아가는 소리만 나고 차가 안 가요.",
            "악셀 페달/손잡이 레버를 쥐어도 주행 모터에 동력이 전혀 전달되지 않습니다.",
            "평지에서는 조금 움직이다가 약간의 경사로만 만나면 전진을 아예 못해요."
        ]
    },
    "CHARGER_FAIL": {
        "keywords": ["충전기 불량", "충전기 전원 안 켜짐", "충전 안됨", "충전 플러그 파손", "충전 전압 없음"],
        "templates": [
            "충전기를 콘센트에 꽂았는데 충전기 본체 LED 불이 아예 안 켜져요.",
            "밤새 충전기를 꽂아뒀는데 아침에 보니 충전이 1칸도 안 되어 있습니다.",
            "충전기 플러그 단자 핀 하나가 타서 녹아내렸어요. 스파크가 튑니다.",
            "충전기 쿨링팬만 세게 돌고 배터리 쪽으로 충전 전류가 전혀 안 들어갑니다.",
            "220V 코드는 정상인데 충전기 기판에서 삐삐 경고음만 계속 울립니다."
        ]
    },
    "POWER_FAIL": {
        "keywords": ["메인 전원 차단", "메인 퓨즈 단락", "키박스 불량", "배터리 터미널 부식"],
        "templates": [
            "메인 퓨즈가 타버린 것 같아요. 새 퓨즈로 갈아 끼워도 바로 또 나가버려요.",
            "키박스 열쇠 꽂는 곳이 헛돌아서 전원이 연결이 안 됩니다.",
            "배터리 연결 단자(터미널)에 하얗게 부식이 심하게 생겨서 전기가 끊겼어요.",
            "장비 전체 배선 어딘가에서 쇼트가 났는지 전원이 완전히 사망했습니다."
        ]
    },
    "CHARGE_INDICATOR": {
        "keywords": ["배터리 잔량 표시등 고장", "게이지 깜빡임", "인디케이터 먹통", "충전 잔량 불일치"],
        "templates": [
            "배터리는 완충했는데 계기판 잔량 게이지에는 불이 1칸만 들어오고 깜빡여요.",
            "충전 잔량 표시창 디스플레이 화면이 깨져서 숫자가 안 보입니다.",
            "작업 중인데 배터리 인디케이터가 초록불이었다가 순식간에 빨간불로 뚝 떨어져요.",
            "배터리 표시등 LED가 다 나가서 지금 충전이 얼마나 남았는지 알 수가 없어요."
        ]
    },
    "CHASSIS": {
        "keywords": ["섀시 외관 파손", "범퍼 깨짐", "프레임 균열", "바디 카울 손상"],
        "templates": [
            "현장에서 지게차랑 살짝 접촉해서 앞쪽 범퍼 프레임이 찌그러지고 부러졌어요.",
            "장비 바닥 섀시 철판에 균열이 가서 용접이나 교체를 해야 할 것 같습니다.",
            "외관 플라스틱 바디가 크게 깨져서 내부 전선이 바깥으로 다 보입니다.",
            "충돌 충격으로 뒷부분 캐스터 바퀴 지지 프레임이 휘어져서 장비가 기우뚱해요."
        ]
    },
    "SALES_INQUIRY": {
        "keywords": ["장비 구매 문의", "임대 렌탈 견적", "카탈로그 요청", "신규 도입 상담"],
        "templates": [
            "공장 바닥 청소용 탑승형 장비 신규 구매 견적서를 좀 받아보고 싶습니다.",
            "보행식 청소차 3개월 단기 렌탈 임대 단가가 어떻게 되나요? 카탈로그 부탁드립니다.",
            "현재 쓰는 장비 교체하고 싶은데 영업 담당자 방문 상담 예약 가능한가요?",
            "신규 물류센터에 장비 3대 납품받으려고 하는데 제원표랑 견적 부탁드려요."
        ]
    },
    "SCHEDULE_DELIVERY": {
        "keywords": ["배송 일정 확인", "출장 일정 문의", "장비 납품일 조율", "회수 일정"],
        "templates": [
            "지난주에 계약한 청소장비 이번 주 금요일 오전 10시까지 납품 가능한가요?",
            "임대 기간 끝난 장비 회수해 가시는 일정 언제쯤으로 잡혀있나요?",
            "AS 기사님 오늘 오후에 방문하시기로 했는데 몇 시쯤 도착하시는지 일정 확인 부탁드립니다.",
            "배송 장소가 공장 2공장으로 변경되었는데 기사님 배차 일정 수정되나요?"
        ]
    },
    "INQUIRY_ETC": {
        "keywords": ["단순 문의", "부서 연결 요청", "세금계산서 문의", "사용 설명서 요청"],
        "templates": [
            "지난달 청소기 렌탈료 세금계산서 재발행 받고 싶은데 회계팀 연결해주세요.",
            "장비 매뉴얼 사용설명서 책자를 분실했는데 이메일로 PDF 파일 하나 보내주실 수 있나요?",
            "담당 영업사원 분 직통 전화번호 좀 알 수 있을까요?",
            "장비 작동법 교육 영상을 어디서 볼 수 있는지 문의드립니다."
        ]
    },
    "IRRELEVANT": {
        "keywords": ["스팸 전화", "업무 무관", "오발신", "장난 전화"],
        "templates": [
            "인터넷 가입하시고 현금 사은품 최대 47만원 받아가세요 고객님.",
            "여보세요 거기 중국집 아니에요? 짜장면 두 그릇 배달 되나요?",
            "대표님 계신가요? 이번 정부 지원금 저금리 대출 안내차 연락드렸습니다.",
            "어 잘못 걸었네 죄송합니다 끊을게요."
        ]
    }
}

VOICE_VARIATIONS = [
    "{text}",
    "저기요, {text}",
    "다름이 아니라 {text} 어떻게 해야 하죠?",
    "지금 현장인데 {text} 빨리 조치 좀 해주세요.",
    "문의 좀 드리려구요. {text}",
    "장비가 이상해서 연락했는데요. {text}",
    "아이고 답답해라, {text} 기사님 좀 보내주세요.",
    "확인 좀 부탁드립니다. {text}",
    "상담원님, {text}",
    "A/S 접수 부탁합니다. {text}"
]

def load_sql_symptoms():
    """SQL 시드 파일에서 실제 등록된 keyword와 part_code 추출"""
    sql_files = glob.glob(os.path.join(SQL_DIR, "seed_symptom_rules_*.sql"))
    extracted = []
    
    pattern = re.compile(r"\('([^']+)',\s*'([A-Z_]+)'")
    for fpath in sql_files:
        try:
            with open(fpath, "r", encoding="utf-8") as f:
                content = f.read()
                matches = pattern.findall(content)
                for kw, pcode in matches:
                    if pcode in PART_DEFINITIONS:
                        extracted.append((kw, pcode))
        except Exception as e:
            print(f"Failed to read {fpath}: {e}")
            
    print(f"Extracted {len(extracted)} rules from SQL seed files.")
    return extracted

def generate_dataset(output_dir=None):
    if output_dir is None:
        output_dir = os.path.join(BASE_DIR, "scripts")
    os.makedirs(output_dir, exist_ok=True)
    
    all_data = []
    system_prompt = (
        "너는 바닥 청소장비 A/S 상담 전문 분류기다. "
        "고객 발화에서 핵심 증상 키워드와 18개 표준 부품코드"
        "(SALES_INQUIRY, SCHEDULE_DELIVERY, SUCTION, POWER, DRIVE_BRUSH, "
        "WATER_SOLENOID, CHASSIS, WATER_NO_FLOW, BRUSH_WIRE, BRUSH_COVER, "
        "FORWARD_FAIL, WATER_SUPPLY_FAIL, BRUSH_FAIL, CHARGER_FAIL, POWER_FAIL, "
        "CHARGE_INDICATOR, INQUIRY_ETC, IRRELEVANT) 중 하나를 매핑하여 오직 JSON 형식으로만 응답하라."
    )

    # 1. 템플릿 기반 구어체 변형 생성
    for part_code, data in PART_DEFINITIONS.items():
        keywords = data["keywords"]
        templates = data["templates"]
        
        for tmpl in templates:
            for v_tmpl in VOICE_VARIATIONS:
                utterance = v_tmpl.format(text=tmpl)
                chosen_kw = random.choice(keywords)
                
                item = {
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": utterance},
                        {"role": "assistant", "content": json.dumps({"keyword": chosen_kw, "part_code": part_code}, ensure_ascii=False)}
                    ]
                }
                all_data.append(item)

    # 2. 실제 DB 시드 SQL 키워드 기반 발화 증강
    sql_rules = load_sql_symptoms()
    rule_variations = [
        "고객님 말씀이 {kw} 현상이 있다고 하시네요.",
        "{kw} 때문에 사용을 못하겠어요. 수리 되나요?",
        "장비 점검하니까 {kw} 증상이 발생합니다.",
        "지금 {kw} 문제로 현장 작업이 중단되었습니다.",
        "어제부터 {kw} 나타나는데 자가 조치 가능한가요?",
        "{kw}"
    ]
    for kw, pcode in sql_rules:
        for r_tmpl in rule_variations:
            utterance = r_tmpl.format(kw=kw)
            item = {
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": utterance},
                    {"role": "assistant", "content": json.dumps({"keyword": kw, "part_code": pcode}, ensure_ascii=False)}
                ]
            }
            all_data.append(item)

    # 셔플 및 Train/Test 분할
    random.seed(42)
    random.shuffle(all_data)

    split_idx = int(len(all_data) * 0.9)
    train_data = all_data[:split_idx]
    test_data = all_data[split_idx:]

    train_path = os.path.join(output_dir, "dataset_train.jsonl")
    test_path = os.path.join(output_dir, "dataset_test.jsonl")

    with open(train_path, "w", encoding="utf-8") as f:
        for item in train_data:
            f.write(json.dumps(item, ensure_ascii=False) + "\n")

    with open(test_path, "w", encoding="utf-8") as f:
        for item in test_data:
            f.write(json.dumps(item, ensure_ascii=False) + "\n")

    print(f"Dataset generated successfully!")
    print(f"Total: {len(all_data)} samples | Train: {len(train_data)} | Test: {len(test_data)}")
    print(f"Train path: {train_path}")
    print(f"Test path: {test_path}")

if __name__ == "__main__":
    generate_dataset()
