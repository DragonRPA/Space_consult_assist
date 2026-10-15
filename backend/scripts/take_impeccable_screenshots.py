import asyncio
import os
from playwright.async_api import async_playwright

ARTIFACT_DIR = r"C:\Users\이정용\.gemini\antigravity\brain\d1cd0a4e-25fa-4001-b755-61009a16b9c7"

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 1600, 'height': 980})
        page = await context.new_page()

        # 1. CounselAssistV2 (메인)
        print("Navigating to / (CounselAssistV2)...")
        await page.goto("http://127.0.0.1:5173/", wait_until="networkidle")
        await asyncio.sleep(1)
        path1 = os.path.join(ARTIFACT_DIR, "impeccable_counsel_v2.png")
        await page.screenshot(path=path1, full_page=False)
        print(f"Saved: {path1}")

        # 2. SchedulePage (일정 관리)
        print("Navigating to /schedule...")
        await page.goto("http://127.0.0.1:5173/schedule", wait_until="networkidle")
        await asyncio.sleep(1)
        path2 = os.path.join(ARTIFACT_DIR, "impeccable_schedule.png")
        await page.screenshot(path=path2, full_page=False)
        print(f"Saved: {path2}")

        # 3. CounselCompare (임베딩 비교)
        print("Navigating to /counsel-compare...")
        await page.goto("http://127.0.0.1:5173/counsel-compare", wait_until="networkidle")
        await asyncio.sleep(1)
        path3 = os.path.join(ARTIFACT_DIR, "impeccable_compare.png")
        await page.screenshot(path=path3, full_page=False)
        print(f"Saved: {path3}")

        # 4. LegacySttApp (통화 녹음 및 전사)
        print("Navigating to /stt...")
        await page.goto("http://127.0.0.1:5173/stt", wait_until="networkidle")
        await asyncio.sleep(1)
        path4 = os.path.join(ARTIFACT_DIR, "impeccable_stt.png")
        await page.screenshot(path=path4, full_page=False)
        print(f"Saved: {path4}")

        await browser.close()
        print("All screenshots captured successfully.")

if __name__ == "__main__":
    asyncio.run(main())
