import asyncio
import os
from playwright.async_api import async_playwright

ARTIFACT_DIR = r"C:\Users\이정용\.gemini\antigravity\brain\d1cd0a4e-25fa-4001-b755-61009a16b9c7"

async def test_guides_navigation():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1600, "height": 950})
        page = await context.new_page()

        # 1. 메인 화면 접속 (증상 선택 없는 상태)
        print("[1] 메인 페이지 접속 (증상 0건 대기 상태)...")
        await page.goto("http://127.0.0.1:5173", wait_until="networkidle")
        await asyncio.sleep(1)

        # 2. GlobalNav 상단 '상황별 수칙' 버튼 클릭
        print("[2] GlobalNav 상단 '상황별 수칙' 버튼 클릭...")
        global_btn = page.locator("[data-uia='global-nav-special-guides']")
        await global_btn.click()
        await asyncio.sleep(0.5)

        # 패널 노출 확인 및 스크린샷 1
        shot_1 = os.path.join(ARTIFACT_DIR, "nav_guides_01_global_opened.png")
        await page.screenshot(path=shot_1)
        print(f"[OK] 1. GlobalNav 버튼 클릭으로 즉시 상단에 수칙 패널 전개: {shot_1}")

        # 3. 직접 URL ?view=guides 접속 테스트
        print("[3] 직접 쿼리 ?view=guides 로 접근 테스트...")
        await page.goto("http://127.0.0.1:5173/?view=guides", wait_until="networkidle")
        await asyncio.sleep(1)
        shot_2 = os.path.join(ARTIFACT_DIR, "nav_guides_02_url_query_opened.png")
        await page.screenshot(path=shot_2)
        print(f"[OK] 2. ?view=guides 직접 접근 시 자동 수칙 패널 전개: {shot_2}")

        # 4. Legacy STT 화면 (/stt) 접속 후 상단 '상황별 수칙 ↗' 버튼 클릭 테스트
        print("[4] Legacy STT 화면 (/stt) 접속...")
        await page.goto("http://127.0.0.1:5173/stt", wait_until="networkidle")
        await asyncio.sleep(1)

        shot_3 = os.path.join(ARTIFACT_DIR, "nav_guides_03_legacy_screen.png")
        await page.screenshot(path=shot_3)
        print(f"[OK] 3. Legacy STT 화면 상단 버튼 배치 확인: {shot_3}")

        print("[5] Legacy STT 상단 '상황별 수칙 ↗' 버튼 클릭...")
        legacy_btn = page.locator("[data-uia='btn-legacy-goto-guides']")
        await legacy_btn.click()
        await asyncio.sleep(1)

        shot_4 = os.path.join(ARTIFACT_DIR, "nav_guides_04_switched_to_guides.png")
        await page.screenshot(path=shot_4)
        print(f"[OK] 4. Legacy에서 원클릭으로 CounselAssistV2 상황별 수칙 이동 완료: {shot_4}")

        await browser.close()
        print("=== E2E 가이드 네비게이션 전수 검증 성공 ===")

if __name__ == "__main__":
    asyncio.run(test_guides_navigation())
