# -*- coding: utf-8 -*-
"""
계기판 오류 메시지 및 에러 코드 분석 스크립트
consult_knowledge 5,854건 전수 조사:
- 에러/오류/코드/알람 관련 발화 및 키워드 추출
- 모델별 계기판 에러 코드 패턴 (E01, E02, EH, Err, 숫자 코드 등) 집계
"""
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

def analyze_errors():
    with psycopg.connect(DB_URL) as conn:
        with conn.cursor() as cur:
            # 1. 컬럼 목록
            cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'consult_knowledge';")
            cols = [r[0] for r in cur.fetchall()]
            print("=== consult_knowledge 컬럼 목록 ===")
            print(", ".join(cols))

            # 2. '에러', '오류', '코드', '경고', '불빛', '점멸' 관련 레코드 검색
            search_query = """
                SELECT id, equipment_model, symptoms, summary, stt_text, action_items
                FROM consult_knowledge
                WHERE stt_text ~* '(에러|오류|코드|알람|경고음|점멸|깜빡|디스플레이|계기판|e[0-9]|eh|al[0-9]|err)'
                   OR summary ~* '(에러|오류|코드|알람|경고음|점멸|깜빡|디스플레이|계기판|e[0-9]|eh|al[0-9]|err)'
                   OR array_to_string(symptoms, ' ') ~* '(에러|오류|코드|알람|점멸|깜빡)'
            """
            cur.execute(search_query)
            rows = cur.fetchall()
            print(f"\n=== 에러/오류/코드/계기판 관련 상담 건수: 총 {len(rows)}건 ===")

            # 정규표현식으로 에러 코드 패턴 추출
            # 예: E01, E02, E-1, EH, E1, E2, Er, Err, AL01, AL-1, 1.2 등
            error_code_regex = re.compile(r'\b([Ee][0-9]{1,2}|[Ee][Hh]|[Ee][Rr]{1,2}|[Aa][Ll][0-9]{1,2}|[Ff][0-9]{1,2})\b')
            korean_error_regex = re.compile(r'(에러\s*코드\s*[a-zA-Z0-9가-힣]+|오류\s*코드\s*[a-zA-Z0-9가-힣]+|[0-9]+번\s*에러|[a-zA-Z]\s*[0-9]\s*번)')

            code_counter = Counter()
            matched_examples = []

            for r in rows:
                cid, model, syms, summary, transcript, actions = r
                text_to_search = f"{summary or ''} {transcript or ''} {' '.join(syms or [])}"
                
                # 영문/숫자 코드 매칭
                codes = error_code_regex.findall(text_to_search)
                # 한글 패턴 매칭
                kor_matches = korean_error_regex.findall(text_to_search)

                found_codes = [c.upper() for c in codes] + kor_matches
                if found_codes:
                    for fc in found_codes:
                        code_counter[fc] += 1
                    if len(matched_examples) < 15:
                        matched_examples.append({
                            "id": cid,
                            "model": model,
                            "found_codes": found_codes,
                            "summary": summary[:120] if summary else "",
                            "snippet": text_to_search[:200]
                        })

            print("\n=== 발견된 에러 코드 빈도수 ===")
            for code, cnt in code_counter.most_common(30):
                print(f"  • {code}: {cnt}회")

            print("\n=== 대표 상담 사례 (최대 10건) ===")
            for i, ex in enumerate(matched_examples[:10], 1):
                print(f"\n[{i}] 모델: {ex['model']} | 감지코드: {ex['found_codes']}")
                print(f"    요약: {ex['summary']}")

if __name__ == "__main__":
    analyze_errors()
