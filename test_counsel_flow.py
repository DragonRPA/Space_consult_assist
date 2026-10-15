import asyncio
import os
from playwright.async_api import async_playwright

ARTIFACT_DIR = r"C:\Users\이정용\.gemini\antigravity\brain\d1cd0a4e-25fa-4001-b755-61009a16b9c7"

async def run_test():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        # 1600x900 표준 데스크탑 뷰포트
        context = await browser.new_context(viewport={"width": 1600, "height": 900})
        page = await context.new_page()

        print("[1] 포트 5173 페이지 로드...")
        await page.goto("http://127.0.0.1:5173", wait_until="networkidle")
        await asyncio.sleep(1)

        # 1. 초기 화면
        await page.screenshot(path=os.path.join(ARTIFACT_DIR, "shot_01_init.png"))
        print("[OK] shot_01_init.png")

        # 2. '배터리 조기 방전 / 수명 열화' 클릭 -> STEP 1 활성화
        await page.locator("text=배터리 조기 방전 / 수명 열화").first.click()
        await asyncio.sleep(1)
        await page.screenshot(path=os.path.join(ARTIFACT_DIR, "shot_02_step1_active.png"))
        print("[OK] shot_02_step1_active.png")

        # 3. STEP 1에서 '불량 / 여전히 안 됨' 클릭 -> STEP 2 전이
        await page.locator("button:has-text('다음 조치 STEP 2 시도')").first.click()
        await asyncio.sleep(1)
        await page.screenshot(path=os.path.join(ARTIFACT_DIR, "shot_03_step2_active.png"))
        print("[OK] shot_03_step2_active.png")

        # 4. STEP 2에서 '불량 / 여전히 안 됨' 클릭 -> STEP 3 전이
        await page.locator("button:has-text('다음 조치 STEP 3 시도')").first.click()
        await asyncio.sleep(1)
        await page.screenshot(path=os.path.join(ARTIFACT_DIR, "shot_04_step3_active.png"))
        print("[OK] shot_04_step3_active.png")

        # 5. STEP 3에서 '최종 불량' 클릭 -> AS 출장 접수 전환 모드
        await page.locator("button:has-text('최종 불량')").first.click()
        await asyncio.sleep(1)
        await page.screenshot(path=os.path.join(ARTIFACT_DIR, "shot_05_visit_required.png"))
        print("[OK] shot_05_visit_required.png")

        # 6. '정상 판정 (이 조치로 해결됨)' 클릭 -> 자가조치 완료 종결 모드
        await page.locator("button:has-text('정상 판정')").first.click()
        await asyncio.sleep(1)
        await page.screenshot(path=os.path.join(ARTIFACT_DIR, "shot_06_resolved_mode.png"))
        print("[OK] shot_06_resolved_mode.png")

        await browser.close()
        print("\n=== 전수 테스트 6단계 캡처 성공 ===")

if __name__ == "__main__":
    asyncio.run(run_test())
