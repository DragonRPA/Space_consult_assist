# -*- coding: utf-8 -*-
import os
import re
import sys
import io
import psycopg
from dotenv import load_dotenv

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
load_dotenv("backend/.env")
DB_URL = os.environ.get("DATABASE_URL_MIGRATION", "").replace("postgresql+psycopg://", "postgresql://")

def inspect_dialogues():
    with psycopg.connect(DB_URL) as conn:
        with conn.cursor() as cur:
            query = """
                SELECT id, equipment_model, summary, stt_text
                FROM consult_knowledge
                WHERE stt_text ~* '(에러\s*코드|오류\s*코드|[0-9]+번\s*에러|e[0-9]|eh|al[0-9])'
                LIMIT 30;
            """
            cur.execute(query)
            rows = cur.fetchall()
            print(f"Total matching rows: {len(rows)}")
            for idx, (cid, model, summary, stt) in enumerate(rows, 1):
                # find matches in stt
                matches = re.findall(r'.{0,35}(?:에러\s*코드|오류\s*코드|[0-9]+번\s*에러|[eE][0-9]|[eE][hH]|[aA][lL][0-9]).{0,35}', stt)
                print(f"\n--- [{idx}] ID: {cid} | 모델: {model} ---")
                print(f"요약: {summary[:100]}")
                print(f"문맥: {' // '.join(matches[:3])}")

if __name__ == "__main__":
    inspect_dialogues()
