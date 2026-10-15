"""
DB 5,854건에서 모델별/카테고리별 상세 증상 및 조치 추출
"""
import os
import psycopg
from collections import Counter
from dotenv import load_dotenv

load_dotenv("backend/.env")
DB_URL = os.environ.get("DATABASE_URL_MIGRATION", "").replace("postgresql+psycopg://", "postgresql://")

def get_detailed_symptoms():
    with psycopg.connect(DB_URL) as conn:
        with conn.cursor() as cur:
            models = ['J600T', 'J800', 'S7', 'S5', 'S1', 'S3', '쓰담']
            for m in models:
                cur.execute("""
                    SELECT symptoms, summary, action_items, parts_mentioned, urgency
                    FROM consult_knowledge
                    WHERE call_type = '증상수리'
                      AND equipment_model ILIKE %s
                    LIMIT 400;
                """, (f"%{m}%",))
                rows = cur.fetchall()
                print(f"\n=================== [{m} (총 {len(rows)}건 샘플링)] ===================")
                s_counter = Counter()
                for r in rows:
                    syms = r[0]
                    if syms:
                        for s in syms:
                            if s and isinstance(s, str) and len(s.strip()) >= 2:
                                s_counter[s.strip()] += 1
                for s, c in s_counter.most_common(12):
                    print(f"  • {s} ({c}회)")

if __name__ == "__main__":
    get_detailed_symptoms()
