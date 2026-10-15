import ast, re

with open('backend/app/api/v1/endpoints/canonical_symptoms.py', encoding='utf-8') as f:
    text = f.read()

match = re.search(r'CANONICAL_SYMPTOMS = (\[.*?\])\n\n', text, re.DOTALL)
if match:
    data = ast.literal_eval(match.group(1))
    for i, p in enumerate(data):
        codes = [c['code'] for c in p.get('official_error_codes', [])]
        print(f"{i+1:2d}. [{p.get('category')}] {p.get('title')} (Codes: {codes})")
