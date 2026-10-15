import asyncio
import os
from playwright.async_api import async_playwright

ARTIFACT_DIR = r"C:\Users\이정용\.gemini\antigravity\brain\d1cd0a4e-25fa-4001-b755-61009a16b9c7"

async def verify_live_vercel():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1600, "height": 950})
        page = await context.new_page()

        print("[1] Navigating to https://space-consult-assist.vercel.app/ ...")
        await page.goto("https://space-consult-assist.vercel.app/", wait_until="networkidle")
        await asyncio.sleep(2)
        shot_1 = os.path.join(ARTIFACT_DIR, "vercel_live_main.png")
        await page.screenshot(path=shot_1)
        print(f"[OK] 1. Live main page: {shot_1}")

        print("[2] Clicking [상황별 수칙] button in GlobalNav ...")
        global_btn = page.locator("[data-uia='global-nav-special-guides']")
        await global_btn.click()
        await asyncio.sleep(1)
        shot_2 = os.path.join(ARTIFACT_DIR, "vercel_live_guides_opened.png")
        await page.screenshot(path=shot_2)
        print(f"[OK] 2. Guides opened: {shot_2}")

        print("[3] Navigating to https://space-consult-assist.vercel.app/?view=guides ...")
        await page.goto("https://space-consult-assist.vercel.app/?view=guides", wait_until="networkidle")
        await asyncio.sleep(2)
        shot_3 = os.path.join(ARTIFACT_DIR, "vercel_live_direct_url.png")
        await page.screenshot(path=shot_3)
        print(f"[OK] 3. Direct URL guides: {shot_3}")

        await browser.close()
        print("=== Live Vercel verification complete ===")

if __name__ == "__main__":
    asyncio.run(verify_live_vercel())
