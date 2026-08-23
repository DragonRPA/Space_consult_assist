import re

with open('D:\\GoogleDrive\\RPA_dev\\01.AntiGravity\\Space_consult_assist\\backend\\app\\models\\domain.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Add UniqueConstraint import if missing
if "UniqueConstraint" not in content:
    content = content.replace("from sqlalchemy import ", "from sqlalchemy import UniqueConstraint, ")

# Add __table_args__ to SymptomRule
replacement = """    __tablename__ = "symptom_rules"
    __table_args__ = (UniqueConstraint('keyword', 'part_code', name='uq_keyword_part_code'),)"""

content = content.replace('    __tablename__ = "symptom_rules"', replacement)

with open('D:\\GoogleDrive\\RPA_dev\\01.AntiGravity\\Space_consult_assist\\backend\\app\\models\\domain.py', 'w', encoding='utf-8') as f:
    f.write(content)
