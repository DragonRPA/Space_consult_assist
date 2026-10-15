import asyncio
import os
from playwright.async_api import async_playwright

ARTIFACT_DIR = r"C:\Users\이정용\.gemini\antigravity\brain\d1cd0a4e-25fa-4001-b755-61009a16b9c7"
LIVE_URL = "https://space-consult-assist.vercel.app/"

async def verify_live_vercel():
    print(f"[VERIFY] Checking Live Vercel Deployment at {LIVE_URL}...")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1440, "height": 900})
        page = await context.new_page()

        await page.goto(LIVE_URL, wait_until="networkidle")
        await page.wait_for_timeout(2000)

        # 1. 라이브 사이트 메인 캡처
        path1 = os.path.join(ARTIFACT_DIR, "vercel_live_symptom_search.png")
        await page.screenshot(path=path1)
        print(f"  -> Live main screenshot: {path1}")

        # 2. 증상 초성 검색 'ㅅㅇ'
        symptom_input = page.locator("input[placeholder*='증상 검색']")
        await symptom_input.fill("ㅅㅇ")
        await page.wait_for_timeout(800)
        
        path2 = os.path.join(ARTIFACT_DIR, "vercel_live_symptom_chosung_suction.png")
        await page.screenshot(path=path2)
        print(f"  -> Live chosung screenshot: {path2}")

        # 3. 퀵버튼 '에러코드' 클릭
        await symptom_input.fill("")
        err_btn = page.locator("button:has-text('에러코드')").first
        if await err_btn.is_visible():
            await err_btn.click()
            await page.wait_for_timeout(800)
            path3 = os.path.join(ARTIFACT_DIR, "vercel_live_error_code_category.png")
            await page.screenshot(path=path3)
            print(f"  -> Live category screenshot: {path3}")

        # 4. 전화번호 입력 필드 및 대기열 모달 확인
        btn_pending = page.locator("[data-uia='btn-subtoolbar-pending-queue']")
        if await btn_pending.is_visible():
            await btn_pending.click()
            await page.wait_for_timeout(800)
            
            search_pending = page.locator("[data-uia='input-pending-search']")
            if await search_pending.is_visible():
                await search_pending.fill("4567")
                await page.wait_for_timeout(600)
                path4 = os.path.join(ARTIFACT_DIR, "vercel_live_pending_search_phone.png")
                await page.screenshot(path=path4)
                print(f"  -> Live pending search screenshot: {path4}")

        print("[VERIFY] Live Vercel verification complete.")
        await browser.close()

if __name__ == '__main__':
    asyncio.run(verify_live_vercel())
