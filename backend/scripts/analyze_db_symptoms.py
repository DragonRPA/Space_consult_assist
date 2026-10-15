"""
consult_knowledge 5,854건 전수에서 모델별 실제 빈출 증상 분석 스크립트
"""
import os
import psycopg
from collections import Counter
from dotenv import load_dotenv

load_dotenv("backend/.env")
DB_URL = os.environ.get("DATABASE_URL_MIGRATION", "").replace("postgresql+psycopg://", "postgresql://")

def analyze_symptoms():
    with psycopg.connect(DB_URL) as conn:
        with conn.cursor() as cur:
            # 1. 모델별 전체 건수 확인
            cur.execute("""
                SELECT COALESCE(equipment_model, '기타'), COUNT(*) 
                FROM consult_knowledge 
                WHERE call_type = '증상수리'
                GROUP BY 1 
                ORDER BY 2 DESC 
                LIMIT 15;
            """)
            print("=== [모델별 증상수리 상담 건수] ===")
            models = cur.fetchall()
            for m, cnt in models:
                print(f"  • {m}: {cnt}건")

            # 2. 대표 모델별 symptoms 실제 빈출 상위 8개
            target_models = ['J600T', 'J800', 'S7', 'S5', '쓰담']
            print("\n=== [모델별 DB 실제 빈출 증상 TOP 8] ===")
            for tm in target_models:
                cur.execute("""
                    SELECT symptoms, summary, parts_mentioned
                    FROM consult_knowledge
                    WHERE call_type = '증상수리' 
                      AND equipment_model ILIKE %s
                      AND symptoms IS NOT NULL
                """, (f"%{tm}%",))
                rows = cur.fetchall()
                symptom_counter = Counter()
                for r in rows:
                    syms = r[0]
                    if syms:
                        for s in syms:
                            if s and isinstance(s, str):
                                s_clean = s.strip()
                                if len(s_clean) >= 2:
                                    symptom_counter[s_clean] += 1
                
                print(f"\n[{tm}] 총 {len(rows)}건 중 빈출 증상 상위:")
                for sym, c in symptom_counter.most_common(8):
                    print(f"   - {sym} ({c}회 발생)")

if __name__ == "__main__":
    analyze_symptoms()
