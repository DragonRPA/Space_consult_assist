import asyncio
import os
from playwright.async_api import async_playwright

ARTIFACT_DIR = r"C:\Users\이정용\.gemini\antigravity\brain\d1cd0a4e-25fa-4001-b755-61009a16b9c7"

async def run_manual_knowledge_test():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1600, "height": 950})
        page = await context.new_page()

        print("[1] 포트 5173 접속...")
        await page.goto("http://127.0.0.1:5173", wait_until="networkidle")
        await asyncio.sleep(2)

        # 1. 모델 제원·규격 토글 버튼 클릭 (J600T -> S7)
        print("[2] '제원·규격' 토글 버튼 클릭...")
        spec_btn = page.locator("[data-spec-toggle-btn]")
        await spec_btn.click()
        await asyncio.sleep(0.5)

        # 모델 S7 클릭하여 스펙 갱신 확인
        print("[2-2] 'S7' 모델 클릭...")
        await page.locator("button:has-text('S7')").first.click()
        await asyncio.sleep(0.5)

        shot_1 = os.path.join(ARTIFACT_DIR, "manual_01_spec_card.png")
        await page.screenshot(path=shot_1)
        print(f"[OK] 1. 모델 제원 및 소모품 규격 카드 캡처: {shot_1}")

        # 2. '바닥 잔수 과다' 증상 선택
        print("[3] '바닥 잔수 과다' 증상 선택...")
        symptom_card = page.locator("[data-symptom-card='바닥 잔수 과다']")
        await symptom_card.click()
        await asyncio.sleep(1)

        # 3. 상황별 수칙 (4종) 버튼 클릭
        print("[4] '상황별 수칙 (4종)' 버튼 클릭...")
        guide_btn = page.locator("[data-guide-toggle-btn]")
        await guide_btn.click()
        await asyncio.sleep(0.5)

        # '소포제(거품제거제) 투입 및 모터 침수 방지' 탭 클릭
        print("[4-2] '소포제(거품제거제) 투입' 탭 클릭...")
        foam_tab = page.locator("[data-guide-tab='GUIDE_ANTI_FOAM']")
        await foam_tab.click()
        await asyncio.sleep(0.5)

        shot_2 = os.path.join(ARTIFACT_DIR, "manual_02_special_guides.png")
        await page.screenshot(path=shot_2)
        print(f"[OK] 2. 상황별 매뉴얼 수칙 가이드 캡처: {shot_2}")

        # 상황별 수칙 패널 닫기
        await guide_btn.click()
        await asyncio.sleep(0.5)

        # 4. 바닥 잔수 과다의 강화된 STEP 1 (스퀴지 4면 뒤집기) & STEP 2 (45도 각도 조절) 캡처
        shot_3 = os.path.join(ARTIFACT_DIR, "manual_03_symptom_steps_enhanced.png")
        await page.screenshot(path=shot_3)
        print(f"[OK] 3. 강화된 스퀴지 4면 뒤집기/45도 각도 SOP 단계 캡처: {shot_3}")

        # 5. '브러시 모터 회전 불가' 선택 -> 오수탱크 틸팅 퓨즈함 / 서킷브레이커 리셋 STEP 캡처
        print("[5] '브러시 모터 회전 불가' 증상 선택...")
        brush_card = page.locator("[data-symptom-card='브러시 모터 회전 불가']")
        await brush_card.click()
        await asyncio.sleep(1)

        shot_4 = os.path.join(ARTIFACT_DIR, "manual_04_brush_fuse_step.png")
        await page.screenshot(path=shot_4)
        print(f"[OK] 4. 브러시 모터 틸팅 퓨즈함 / 서킷브레이커 리셋 SOP 캡처: {shot_4}")

        await browser.close()
        print("\n=== 매뉴얼 기반 고부가가치 상담 지식 상황별 전개 E2E 실증 성공 ===")

if __name__ == "__main__":
    asyncio.run(run_manual_knowledge_test())
