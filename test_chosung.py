import re

CHOSUNG_LIST = [
    'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ',
    'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'
]

def extract_chosung(text: str) -> str:
    result = []
    for ch in text:
        code = ord(ch)
        if 0xAC00 <= code <= 0xD7A3:
            chosung_idx = (code - 0xAC00) // 588
            result.append(CHOSUNG_LIST[chosung_idx])
        else:
            result.append(ch)
    return ''.join(result)

def matches_chosung(target: str, query: str) -> bool:
    if not query:
        return True
    q = query.strip().lower()
    t = target.lower()
    if q in t:
        return True
    t_chosung = extract_chosung(t)
    q_chosung = extract_chosung(q)
    if q_chosung in t_chosung:
        return True
    # 괄호 및 특수문자 제거 후 검사
    t_clean = re.sub(r'[\(\)\[\]\s]', '', t)
    t_clean_chosung = extract_chosung(t_clean)
    q_clean = re.sub(r'[\(\)\[\]\s]', '', q)
    q_clean_chosung = extract_chosung(q_clean)
    if q_clean and (q_clean in t_clean or q_clean_chosung in t_clean_chosung):
        return True
    return False

# 테스트
customers = [
    "(주)스페이스클린 강남점",
    "(주)미래물류센터 평택점",
    "(주)케이로지스 화성센터",
    "한국알콜 안양공장",
    "삼천리도시가스 인천지사"
]

queries = ["ㅅㅍ", "ㅅㅍㅇㅅ", "스페이스", "ㅁㄹ", "ㅁㄹㅁㄹ", "ㅍㅌ", "ㅋㅇ", "ㅎㄱ", "ㅅㅊㄹ"]

for q in queries:
    matched = [c for c in customers if matches_chosung(c, q)]
    print(f"검색어: '{q}' -> 매칭 결과 ({len(matched)}건): {matched}")
