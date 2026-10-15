import re

with open('frontend/apps/desktop/src/manualKnowledgeData.ts', 'r', encoding='utf-8') as f:
    text = f.read()

models = re.findall(r"'([A-Z0-9]+)':\s*\{[^}]+key_consumables:\s*'([^']+)'", text)
for m, c in models:
    print(f"Model: {m} -> Key Consumables: {c}")
