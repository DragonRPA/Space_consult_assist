import ast, re

with open('backend/app/api/v1/endpoints/canonical_symptoms.py', encoding='utf-8') as f:
    text = f.read()

match = re.search(r'CANONICAL_FAILURE_TYPES: List\[Dict\[str, Any\]\] = (\[.*?\])\n\n', text, re.DOTALL)
if not match:
    # try broader match
    start = text.find('CANONICAL_FAILURE_TYPES: List[Dict[str, Any]] = [')
    end = text.find('\n]\n\ndef resolve_symptoms_for_model', start)
    raw = text[start + len('CANONICAL_FAILURE_TYPES: List[Dict[str, Any]] = '): end + 2]
    # replace OFFICIAL_12_ERROR_CODES
    raw = re.sub(r'OFFICIAL_12_ERROR_CODES', '[]', raw)
    data = ast.literal_eval(raw)
else:
    raw = re.sub(r'OFFICIAL_12_ERROR_CODES', '[]', match.group(1))
    data = ast.literal_eval(raw)

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
    
    t_clean = re.sub(r'[\s\(\)\[\]\-_\/.,]', '', t)
    q_clean = re.sub(r'[\s\(\)\[\]\-_\/.,]', '', q)
    if q_clean:
        if q_clean in t_clean:
            return True
        if extract_chosung(q_clean) in extract_chosung(t_clean):
            return True
    return False

def matches_preset(p: dict, query: str) -> bool:
    if not query:
        return True
    targets = [p.get('title', ''), p.get('symptom', ''), p.get('category', ''), p.get('part_code', '')]
    targets.extend(p.get('aliases', []))
    for ec in p.get('official_error_codes', []):
        targets.extend([ec.get('code', ''), ec.get('name', ''), ec.get('meaning', '')])
    
    return any(matches_chosung_or_text(t, query) for t in targets)

test_queries = ["ㅅㅇ", "ㅂㅌㄹ", "ㄱㄷ", "ㅎㅇ", "ㅇㄹ", "ㅈㅅ", "ㅂㄹㅅ", "소음", "누수", "888", "0-f"]

for q in test_queries:
    matched = [p['title'] for p in data if matches_preset(p, q)]
    print(f"Query '{q}' ({len(matched)}건): {matched}")
