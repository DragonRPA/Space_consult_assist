import os
import sys
import asyncio
import httpx
from dotenv import load_dotenv
from sqlalchemy import text

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.main import app
from app.core.database import AsyncSessionLocal

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

print("=" * 70)
print("  [WTT] Space Advisor (통합 워크스루 테스트) REST API E2E 검증기")
print("=" * 70)

async def run_e2e_wtt():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        
        # -------------------------------------------------------------
        # S-1. 룰 기반 키워드 분류 API 실측
        # -------------------------------------------------------------
        print("\n[S-1] 룰 기반 키워드 분류 API (POST /api/v1/counsel/classify)")
        res1 = await client.post("/api/v1/counsel/classify", json={"text": "세제 탱크에 거품 발생"})
        assert res1.status_code == 200, f"S-1 Failed: {res1.text}"
        data1 = res1.json()
        print(f"  [PASS] 키워드: '{data1.get('keyword')}', 부품코드: '{data1.get('part_code')}', 신뢰도: {data1.get('confidence')}")
        print(f"  [PASS] 액션 스크립트: {len(data1.get('action_script', []))}단계 도출 완료")

        # -------------------------------------------------------------
        # S-2. 1차 상담 및 셀프조치 DB 저장 API 실측 (consult_logs + audit_log_minimal)
        # -------------------------------------------------------------
        print("\n[S-2] 상담 및 셀프조치 등록 API (POST /api/v1/counsel/)")
        res2 = await client.post("/api/v1/counsel/", json={
            "customer_name": "스페이스클린 강남점",
            "manager": "최관리 팀장",
            "serial_number": "SC-2024-0801",
            "model_name": "Space-500W",
            "keyword": "스퀴지 마모",
            "part_code": "SQUEEGEE-RUBBER",
            "symptoms": "바닥에 물기가 남고 잔수가 발생함",
            "action_taken": "스퀴지 고무 블레이드 4면 뒤집기 안내 완료",
            "is_completed": True,
            "is_visit_required": False
        })
        assert res2.status_code == 200, f"S-2 Failed: {res2.text}"
        counsel_id = res2.json().get("id")
        print(f"  [PASS] consult_logs 저장 성공 (ID: {counsel_id})")

        # -------------------------------------------------------------
        # S-3. 출장 배차 접수 API 실측 (visits + visit_status_history + audit_log)
        # -------------------------------------------------------------
        print("\n[S-3] 출장 배차 접수 API (POST /api/v1/visits/)")
        res3 = await client.post("/api/v1/visits/", json={
            "customer_name": "미래물류 평택센터",
            "manager": "정센터장",
            "phone": "010-9876-5432",
            "address": "경기도 평택시 물류단지로 100",
            "address_detail": "A동 정비창고",
            "assigned_engineer": "김엔지니어",
            "dispatch_date": "2026-08-25 14:00",
            "request_note": "흡입모터 굉음 및 과열로 정밀점검 출장 요청",
            "client_type": "desktop"
        })
        assert res3.status_code == 200, f"S-3 Failed: {res3.text}"
        visit_id = res3.json().get("visit_id")
        print(f"  [PASS] visits 테이블 접수 성공 (ID: {visit_id})")

        # -------------------------------------------------------------
        # S-4. 출장 상태 변경 실측 (PATCH /api/v1/visits/{id}/status)
        # -------------------------------------------------------------
        print(f"\n[S-4] 현장 정비사 출발/진행중 상태 전이 API (PATCH /api/v1/visits/{visit_id}/status)")
        res4 = await client.patch(f"/api/v1/visits/{visit_id}/status", json={
            "status": "진행중",
            "note": "현장 도착 후 흡입모터 분해 점검 중",
            "client_type": "mobile"
        })
        assert res4.status_code == 200, f"S-4 Failed: {res4.text}"
        print(f"  [PASS] 상태 전이 성공: '{res4.json().get('old_status')}' -> '{res4.json().get('new_status')}'")

        # -------------------------------------------------------------
        # S-5. 현장 부품 사용 및 재고 차감 실측 (POST /api/v1/visits/{id}/parts)
        # -------------------------------------------------------------
        print(f"\n[S-5] 현장 부품 사용 등록 및 재고 차감 API (POST /api/v1/visits/{visit_id}/parts)")
        async with AsyncSessionLocal() as session:
            part_row = (await session.execute(text("SELECT id, name, stock FROM parts LIMIT 1"))).fetchone()
        
        if part_row:
            part_id = str(part_row.id)
            res5 = await client.post(f"/api/v1/visits/{visit_id}/parts", json={
                "part_id": part_id,
                "quantity": 1
            })
            assert res5.status_code == 200, f"S-5 Failed: {res5.text}"
            print(f"  [PASS] {res5.json().get('message')}")
        else:
            print("  [SKIP] 등록된 부품이 없어 부품 차감 건너뜀")

        # -------------------------------------------------------------
        # S-6. 출장 완료 및 고객 알림톡 트리거 실측 (POST /api/v1/visits/{id}/complete)
        # -------------------------------------------------------------
        print(f"\n[S-6] 출장 완료 및 고객 알림톡 발송 API (POST /api/v1/visits/{visit_id}/complete)")
        res6 = await client.post(f"/api/v1/visits/{visit_id}/complete", json={
            "engineer_name": "김엔지니어",
            "work_summary": "흡입모터 어셈블리 교체 및 시험 가동 완료",
            "phone": "010-9876-5432",
            "customer_name": "미래물류 평택센터",
            "client_type": "mobile"
        })
        assert res6.status_code == 200, f"S-6 Failed: {res6.text}"
        print(f"  [PASS] 출장 완료 처리 성공 (이전상태: '{res6.json().get('old_status')}')")

        # -------------------------------------------------------------
        # S-7. Faster-Whisper GPU 엔진 상태 조회 API 실측
        # -------------------------------------------------------------
        print("\n[S-7] Faster-Whisper 엔진 상태 API (GET /api/v1/stt/status)")
        res7 = await client.get("/api/v1/stt/status")
        assert res7.status_code == 200, f"S-7 Failed: {res7.text}"
        stt_info = res7.json()
        print(f"  [PASS] 엔진: {stt_info.get('engine')}, 장치: {stt_info.get('device')}, 준비여부: {stt_info.get('is_ready')}")

    print("\n" + "=" * 70)
    print("  [WTT E2E ALL PASS] 7대 REST API 엔드포인트 실측 검증 100% 성공!")
    print("=" * 70)

if __name__ == "__main__":
    asyncio.run(run_e2e_wtt())
