import asyncio
import os
from playwright.async_api import async_playwright

ARTIFACT_DIR = r"C:\Users\이정용\.gemini\antigravity\brain\d1cd0a4e-25fa-4001-b755-61009a16b9c7"

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 1600, 'height': 980})
        page = await context.new_page()

        print("Testing live Vercel deployment...")
        # 1. Main / CounselAssistV2
        await page.goto("https://space-consult-assist.vercel.app/", wait_until="networkidle")
        await asyncio.sleep(2)
        p1 = os.path.join(ARTIFACT_DIR, "vercel_live_counsel_v2.png")
        await page.screenshot(path=p1)
        print("Captured:", p1)

        # 2. Schedule
        await page.goto("https://space-consult-assist.vercel.app/schedule", wait_until="networkidle")
        await asyncio.sleep(2)
        p2 = os.path.join(ARTIFACT_DIR, "vercel_live_schedule.png")
        await page.screenshot(path=p2)
        print("Captured:", p2)

        # 3. Compare
        await page.goto("https://space-consult-assist.vercel.app/counsel-compare", wait_until="networkidle")
        await asyncio.sleep(2)
        p3 = os.path.join(ARTIFACT_DIR, "vercel_live_compare.png")
        await page.screenshot(path=p3)
        print("Captured:", p3)

        await browser.close()
        print("Live Vercel verification complete.")

if __name__ == "__main__":
    asyncio.run(main())
