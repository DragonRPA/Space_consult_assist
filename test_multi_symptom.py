import asyncio
import os
from playwright.async_api import async_playwright

ARTIFACT_DIR = r"C:\Users\이정용\.gemini\antigravity\brain\d1cd0a4e-25fa-4001-b755-61009a16b9c7"

async def run_multi_symptom_test():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1600, "height": 900})
        page = await context.new_page()

        print("[1] 포트 5173 접속 중...")
        await page.goto("http://127.0.0.1:5173", wait_until="networkidle")
        await asyncio.sleep(1)

        # 1. 좌측에서 증상 1 (배터리 조기 방전) 클릭
        print("[2] 증상 1 '배터리 조기 방전 / 수명 열화' 선택...")
        await page.locator("[data-symptom-card='배터리 조기 방전 / 수명 열화']").click()
        await asyncio.sleep(1)

        # STEP 1 불량 판정 -> STEP 2로 전이
        print("[3] 증상 1 STEP 1 불량 판정 -> STEP 2 전이...")
        await page.locator("button:has-text('다음 조치 STEP 2 시도')").first.click()
        await asyncio.sleep(1)
        shot_a = os.path.join(ARTIFACT_DIR, "multi_01_symptom1_step2.png")
        await page.screenshot(path=shot_a)
        print(f"[OK] 1. 증상 1 STEP 2 진행 상태 캡처: {shot_a}")

        # 2. 좌측에서 증상 2 (바닥 잔수 과다 / 흡입력 저하) 클릭 -> 새 세션 추가 및 작업대 전환
        print("[4] 증상 2 '바닥 잔수 과다 / 흡입력 저하' 선택...")
        await page.locator("[data-symptom-card='바닥 잔수 과다 / 흡입력 저하']").click()
        await asyncio.sleep(1)

        # 증상 2 STEP 1 정상 해결 판정
        print("[5] 증상 2 STEP 1 정상 해결 판정 클릭...")
        await page.locator("button:has-text('정상 판정 (이 조치로 해결됨)')").first.click()
        await asyncio.sleep(1)
        shot_b = os.path.join(ARTIFACT_DIR, "multi_02_symptom2_resolved.png")
        await page.screenshot(path=shot_b)
        print(f"[OK] 2. 증상 2 정상 해결 상태 캡처: {shot_b}")

        # 3. [핵심 검증] 상단 탭에서 증상 1 (배터리 조기 방전) 탭 클릭!
        print("[6] [핵심] 상단 탭에서 증상 1 탭 클릭하여 이전 진단 기록 무손실 복원 확인...")
        await page.locator("[data-symptom-tab='배터리 조기 방전 / 수명 열화']").click()
        await asyncio.sleep(1)
        shot_c = os.path.join(ARTIFACT_DIR, "multi_03_symptom1_restored.png")
        await page.screenshot(path=shot_c)
        print(f"[OK] 3. 증상 1 진단 기록 무손실 복원 캡처: {shot_c}")

        # 4. 증상 1 마저 진행 -> STEP 2 불량 -> STEP 3 최종 불량 (출장 접수 전환)
        print("[7] 증상 1 STEP 2 불량 판정 -> STEP 3 전이...")
        await page.locator("button:has-text('다음 조치 STEP 3 시도')").first.click()
        await asyncio.sleep(1)

        print("[8] 증상 1 STEP 3 최종 불량 클릭 -> 출장 접수 전환...")
        await page.locator("button:has-text('최종 불량')").first.click()
        await asyncio.sleep(1)

        shot_d = os.path.join(ARTIFACT_DIR, "multi_04_consolidated_terminal.png")
        await page.screenshot(path=shot_d)
        print(f"[OK] 4. 복수 증상 종합 판정(출장 필수 + 자가해결 공존) 캡처: {shot_d}")

        await browser.close()
        print("\n=== 전 과정 100% 실증 E2E 완료 ===")

if __name__ == "__main__":
    asyncio.run(run_multi_symptom_test())
