CHOSUNG_LIST = [
    'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ',
    'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'
]

def extract_chosung(text: str) -> str:
    if not text:
        return ""
    result = []
    for ch in text:
        code = ord(ch)
        if 0xAC00 <= code <= 0xD7A3:
            chosung_idx = (code - 0xAC00) // 588
            result.append(CHOSUNG_LIST[chosung_idx])
        else:
            result.append(ch)
    return ''.join(result)

def matches_chosung_or_text(target: str, query: str) -> bool:
    if not query:
        return True
    if not target:
        return False
    q = query.strip().lower()
    t = target.lower()
    if q in t:
        return True
    
    t_chosung = extract_chosung(t)
    q_chosung = extract_chosung(q)
    if q_chosung in t_chosung:
        return True
    
    # 띄어쓰기 및 특수기호 제거 비교
    import re
    t_clean = re.sub(r'[\s\(\)\[\]\-_\/]', '', t)
    q_clean = re.sub(r'[\s\(\)\[\]\-_\/]', '', q)
    if q_clean:
        if q_clean in t_clean:
            return True
        if extract_chosung(q_clean) in extract_chosung(t_clean):
            return True
    return False

symptoms = [
    "배터리 조기 방전",
    "배터리 충전 불가",
    "전원 완전 인입 불가",
    "충전 단자 접촉 불량",
    "바닥 잔수 과다",
    "바닥 줄무늬 잔수",
    "흡입 모터 이상 소음",
    "오수 탱크 조기 차단",
    "브러시 모터 회전 불가",
    "주행 구동 불가",
    "구동 벨트 슬립",
    "솔레노이드 밸브 개폐 불량",
    "세척수 분사 노즐 막힘",
    "호스 피팅 부위 누수",
    "계기판 에러 코드 점멸",
    "외장 부품 파손"
]

test_queries = ["ㅅㅇ", "ㅂㅌㄹ", "ㄱㄷ", "ㅎㅇ", "ㅇㄹ", "ㅈㅅ", "ㅂㄹㅅ", "소음", "888", "누수"]

for q in test_queries:
    matched = [s for s in symptoms if matches_chosung_or_text(s, q)]
    print(f"Query '{q}': {len(matched)} matches -> {matched}")
