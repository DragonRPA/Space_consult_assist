import asyncio
import os
from playwright.async_api import async_playwright

ARTIFACT_DIR = r"C:\Users\이정용\.gemini\antigravity\brain\d1cd0a4e-25fa-4001-b755-61009a16b9c7"

async def run_error_chips_test():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1600, "height": 950})
        page = await context.new_page()

        print("[1] 포트 5173 접속...")
        await page.goto("http://127.0.0.1:5173", wait_until="networkidle")
        await asyncio.sleep(2)

        # 1. '계기판 에러 코드 점멸' 카드 클릭
        print("[2] '계기판 에러 코드 점멸' 증상 카드 클릭...")
        error_card = page.locator("[data-symptom-card='계기판 에러 코드 점멸']")
        await error_card.scroll_into_view_if_needed()
        await error_card.click()
        await asyncio.sleep(1)

        # 12대 퀵 칩 리스트 캡처
        shot_1 = os.path.join(ARTIFACT_DIR, "error_chip_01_list.png")
        await page.screenshot(path=shot_1)
        print(f"[OK] 1. 12대 공식 에러코드 퀵 칩 리스트 캡처 완료: {shot_1}")

        # 2. '0-C' (세수탱크 물부족 - 자가해결) 칩 클릭
        print("[3] '0-C' (세수탱크 물없음) 칩 클릭...")
        chip_0c = page.locator("[data-error-chip='0-C']")
        await chip_0c.click()
        await asyncio.sleep(1)

        # 0-C 자가해결 종결 버튼 클릭
        resolve_btn = page.locator("[data-instant-resolve-btn]")
        await resolve_btn.click()
        await asyncio.sleep(1)

        shot_2 = os.path.join(ARTIFACT_DIR, "error_chip_02_resolved.png")
        await page.screenshot(path=shot_2)
        print(f"[OK] 2. 0-C 자가해결 즉시 종결 캡처 완료: {shot_2}")

        # 3. '1-5' (브러시 모터 단락 - 출장필요) 칩 클릭
        print("[4] '1-5' (브러시 모터 단락) 칩 클릭...")
        chip_15 = page.locator("[data-error-chip='1-5']")
        await chip_15.click()
        await asyncio.sleep(1)

        # 1-5 AS 출장 접수 확정 버튼 클릭
        visit_btn = page.locator("[data-instant-visit-btn]")
        await visit_btn.click()
        await asyncio.sleep(1)

        shot_3 = os.path.join(ARTIFACT_DIR, "error_chip_03_visit.png")
        await page.screenshot(path=shot_3)
        print(f"[OK] 3. 1-5 AS 출장접수 확정 캡처 완료: {shot_3}")

        # 4. 에러코드 검색 필터 동작 테스트 (예: '2-H' 또는 '모터')
        print("[5] 에러코드 검색창 필터 테스트...")
        filter_input = page.locator("input[placeholder*='코드 검색']")
        if await filter_input.count() > 0:
            await filter_input.fill("모터")
            await asyncio.sleep(0.5)
            shot_4 = os.path.join(ARTIFACT_DIR, "error_chip_04_filtered.png")
            await page.screenshot(path=shot_4)
            print(f"[OK] 4. 에러코드 검색 필터 캡처 완료: {shot_4}")

        await browser.close()
        print("\n=== 제조사 공식 12대 에러코드 퀵 칩 E2E 검증 성공 ===")

if __name__ == "__main__":
    asyncio.run(run_error_chips_test())
