import asyncio
import os
from playwright.async_api import async_playwright

ARTIFACT_DIR = r"C:\Users\이정용\.gemini\antigravity\brain\d1cd0a4e-25fa-4001-b755-61009a16b9c7"

async def run_chosung_test():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1600, "height": 900})
        page = await context.new_page()

        print("[1] 포트 5173 로드 중...")
        await page.goto("http://127.0.0.1:5173", wait_until="networkidle")
        await asyncio.sleep(1)

        search_input = page.locator("input[placeholder*='초성']").first

        # 1. 고객사명 초성 'ㅅㅍ' 입력
        print("[2] 고객사명 초성 'ㅅㅍ' 입력...")
        await search_input.click()
        await search_input.fill("ㅅㅍ")
        # 드롭다운이 렌더링될 때까지 대기
        await page.wait_for_selector("[data-customer-item*='스페이스클린']", timeout=5000)
        await asyncio.sleep(0.5)

        shot1 = os.path.join(ARTIFACT_DIR, "chosung_01_sp.png")
        await page.screenshot(path=shot1)
        print(f"[OK] 1. 초성 'ㅅㅍ' 드롭다운 캡처: {shot1}")

        # 2. 드롭다운에서 스페이스클린 클릭하여 선택
        print("[3] 드롭다운에서 '(주)스페이스클린 강남점' 선택...")
        await page.locator("[data-customer-item*='스페이스클린']").first.click()
        await asyncio.sleep(0.5)

        shot2 = os.path.join(ARTIFACT_DIR, "chosung_02_selected.png")
        await page.screenshot(path=shot2)
        print(f"[OK] 2. 고객사 선택 완료 캡처: {shot2}")

        # 3. 고객사 해제 후 초성 'ㅁㄹ' 입력
        print("[4] 고객사 해제 후 초성 'ㅁㄹ' (미래물류) 입력...")
        # 고객사 해제 버튼 클릭
        await page.locator("button:has-text('고객사 미지정')").first.click() if await page.locator("button:has-text('고객사 미지정')").count() > 0 else None
        await search_input.click()
        await search_input.fill("ㅁㄹ")
        await page.wait_for_selector("[data-customer-item*='미래물류']", timeout=5000)
        await asyncio.sleep(0.5)

        shot3 = os.path.join(ARTIFACT_DIR, "chosung_03_mr.png")
        await page.screenshot(path=shot3)
        print(f"[OK] 3. 초성 'ㅁㄹ' 드롭다운 캡처: {shot3}")

        # 4. 담당자 초성 'ㅊㄱㄹ' (최관리) 입력
        print("[5] 담당자 초성 'ㅊㄱㄹ' (최관리) 입력...")
        await search_input.fill("ㅊㄱㄹ")
        await page.wait_for_selector("[data-customer-item*='스페이스클린']", timeout=5000)
        await asyncio.sleep(0.5)

        shot4 = os.path.join(ARTIFACT_DIR, "chosung_04_manager.png")
        await page.screenshot(path=shot4)
        print(f"[OK] 4. 담당자 초성 'ㅊㄱㄹ' 드롭다운 캡처: {shot4}")

        await browser.close()
        print("\n=== 초성 검색 UI 전수 실증 테스트 완료 ===")

if __name__ == "__main__":
    asyncio.run(run_chosung_test())
