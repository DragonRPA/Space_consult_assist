# -*- coding: utf-8 -*-
import os
import psycopg
import io
import sys
import re
from collections import Counter
from dotenv import load_dotenv

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
load_dotenv("backend/.env")
DB_URL = os.environ.get("DATABASE_URL_MIGRATION", "").replace("postgresql+psycopg://", "postgresql://")

def find_manufacturers():
    with psycopg.connect(DB_URL) as conn:
        with conn.cursor() as cur:
            # 1. file_name 패턴 분석 (거래처명, 상대방 회사명 등)
            cur.execute("""
                SELECT file_name, equipment_model, summary
                FROM consult_knowledge
                WHERE file_name ~* '(티에스|스페이스|크린|모터|상사|코리아|테크|이엔지|산업)'
                LIMIT 30;
            """)
            rows = cur.fetchall()
            print("=== [파일명 패턴에서 감지된 회사명/거래처] ===")
            for fn, model, summary in rows[:15]:
                print(f"  • 파일: {fn} | 모델: {model}")

            # 2. 본문에서 제조사/수입사/브랜드 언급 검색
            cur.execute("""
                SELECT file_name, equipment_model, summary, stt_text
                FROM consult_knowledge
                WHERE stt_text ~* '(제조사|제조원|수입원|공장|본사|티에스식스티즈|스페이스)'
                LIMIT 20;
            """)
            rows2 = cur.fetchall()
            print(f"\n=== [본문 제조사/수입사 언급 건수: {len(rows2)}건] ===")
            for fn, model, summary, stt in rows2[:8]:
                print(f"\n파일: {fn} | 모델: {model}")
                print(f"요약: {summary[:120] if summary else ''}")
                matches = re.findall(r'.{0,35}(?:제조사|제조원|수입원|공장|본사|티에스식스티즈|스페이스).{0,35}', stt)
                print(f"문맥: {' // '.join(matches[:2])}")

if __name__ == "__main__":
    find_manufacturers()
