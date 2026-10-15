# -*- coding: utf-8 -*-
import os
import re
import sys
import io
import psycopg
from collections import Counter
from dotenv import load_dotenv

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
load_dotenv("backend/.env")
DB_URL = os.environ.get("DATABASE_URL_MIGRATION", "").replace("postgresql+psycopg://", "postgresql://")

def mine_all_codes():
    with psycopg.connect(DB_URL) as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id, equipment_model, summary, stt_text 
                FROM consult_knowledge 
                WHERE stt_text ~* '(에러|오류|코드|알람)'
            """)
            rows = cur.fetchall()
            print(f"Total analyzed rows: {len(rows)}")

            # 패턴들:
            # 1. 에러코드 뒤의 숫자나 알파벳 (예: 에러코드 13, 에러코드 35, 0-C, 0C, E01, E1, E3 등)
            # 2. 한글 표기: 영다시씨, 영씨, 삼십오번, 십삼번 등
            patterns = [
                re.compile(r'에러\s*코드\s*([0-9A-Za-z\-\.]+)', re.IGNORECASE),
                re.compile(r'오류\s*코드\s*([0-9A-Za-z\-\.]+)', re.IGNORECASE),
                re.compile(r'코드\s*([0-9A-Za-z\-\.]+)\s*(?:가|이|번|뜨)', re.IGNORECASE),
                re.compile(r'([0-9A-Za-z\-\.]+)\s*에러', re.IGNORECASE),
                re.compile(r'([0-9]+)\s*번\s*에러', re.IGNORECASE),
                re.compile(r'([0-9]\s*다시\s*[A-Za-z가-힣])', re.IGNORECASE),
                re.compile(r'([eE][0-9]{1,2}|[eE][hH]|[aA][lL][0-9]{1,2})')
            ]

            extracted_codes = Counter()
            dialogue_samples = {}

            for cid, model, summary, stt in rows:
                text = f"{summary or ''} {stt or ''}"
                for pat in patterns:
                    for m in pat.finditer(text):
                        code = m.group(1).strip().upper()
                        # 잡음 필터링 (가, 이, 는, 를, 발생, 확인 등 제외)
                        if code in ['가', '이', '는', '를', '로', '도', '에', '의', '와', '과', '발생', '확인', '뜨', '나오', '없', '말씀', '표시', '진행', '관련', '문의', '있는']:
                            continue
                        if len(code) >= 1 and len(code) <= 10:
                            extracted_codes[code] += 1
                            if code not in dialogue_samples:
                                # extract window
                                start = max(0, m.start() - 30)
                                end = min(len(text), m.end() + 30)
                                dialogue_samples[code] = (model, text[start:end].replace('\n', ' '))

            print("\n=== [추출된 에러 코드 목록 및 발생 빈도] ===")
            for code, count in extracted_codes.most_common(40):
                sample_model, sample_txt = dialogue_samples.get(code, ("-", "-"))
                print(f"  • 코드 '{code}': {count}회 | 모델: {sample_model} | 문맥: ...{sample_txt}...")

if __name__ == "__main__":
    mine_all_codes()
