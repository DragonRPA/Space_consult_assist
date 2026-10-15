import asyncio
import os
from playwright.async_api import async_playwright

ARTIFACT_DIR = r"C:\Users\이정용\.gemini\antigravity\brain\d1cd0a4e-25fa-4001-b755-61009a16b9c7"

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 1600, 'height': 980})
        page = await context.new_page()

        print("Testing live CounselAssistV2 active states...")
        await page.goto("https://space-consult-assist.vercel.app/", wait_until="networkidle")
        await asyncio.sleep(2)

        # 1. Click on first symptom "배터리 조기 방전"
        symptom_btn = page.locator('text="배터리 조기 방전"').first
        if await symptom_btn.count() > 0:
            await symptom_btn.click()
            await asyncio.sleep(1)

        p1 = os.path.join(ARTIFACT_DIR, "vercel_live_symptom_active.png")
        await page.screenshot(path=p1)
        print("Captured:", p1)

        # 2. Click "상황별 수칙" button
        guide_btn = page.locator('text="상황별 수칙"').first
        if await guide_btn.count() > 0:
            await guide_btn.click()
            await asyncio.sleep(1)
            p2 = os.path.join(ARTIFACT_DIR, "vercel_live_guide_modal.png")
            await page.screenshot(path=p2)
            print("Captured:", p2)
            # close by clicking outside or close
            await page.keyboard.press("Escape")
            await asyncio.sleep(0.5)

        # 3. Click "제원·규격" button
        spec_btn = page.locator('text="제원·규격"').first
        if await spec_btn.count() > 0:
            await spec_btn.click()
            await asyncio.sleep(1)
            p3 = os.path.join(ARTIFACT_DIR, "vercel_live_spec_modal.png")
            await page.screenshot(path=p3)
            print("Captured:", p3)

        await browser.close()
        print("Complete.")

if __name__ == "__main__":
    asyncio.run(main())
