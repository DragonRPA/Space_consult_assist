import time
import urllib.request
import re
import asyncio
from playwright.async_api import async_playwright
import os

ARTIFACT_DIR = r"C:\Users\이정용\.gemini\antigravity\brain\d1cd0a4e-25fa-4001-b755-61009a16b9c7"
VERCEL_URL = "https://space-consult-assist.vercel.app/"

def wait_for_deploy():
    print("[VERCEL] Polling Vercel for new deployment...")
    for i in range(25):
        time.sleep(5)
        try:
            req = urllib.request.Request(VERCEL_URL, headers={"User-Agent": "Mozilla/5.0"})
            html = urllib.request.urlopen(req).read().decode("utf-8")
            m = re.search(r'src=[\'"](/assets/index-[^\'"]+\.js)[\'"]', html)
            bundle = m.group(1) if m else "None"
            print(f"[VERCEL] Check {i+1}: {bundle}")
            if "9zp8pm4c" in bundle or "CrjjO13A" in bundle or "BiCtTLjw" in bundle:
                print("[VERCEL] New production bundle is live on Vercel!")
                return True
        except Exception as e:
            print("[VERCEL] Polling error:", e)
    return False

async def verify_live():
    print("[VERCEL LIVE TEST] Starting Playwright on Vercel production...")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 1600, 'height': 960})
        page = await context.new_page()

        await page.goto(VERCEL_URL, wait_until="networkidle")
        await page.wait_for_timeout(1500)

        # 1. Main Studio with Subtoolbar
        await page.screenshot(path=os.path.join(ARTIFACT_DIR, "vercel_live_photo_01_studio.png"))
        print("[VERCEL LIVE TEST] Saved vercel_live_photo_01_studio.png")

        # 2. Open Photo Manager from subtoolbar
        photo_btn = page.locator('[data-uia="btn-subtoolbar-photo-manager"]')
        await photo_btn.click()
        await page.wait_for_timeout(2500)
        await page.screenshot(path=os.path.join(ARTIFACT_DIR, "vercel_live_photo_02_manager.png"))
        print("[VERCEL LIVE TEST] Saved vercel_live_photo_02_manager.png")

        # Close Photo Manager
        close_btn = page.locator('button[aria-label="닫기"]').first
        await close_btn.click()
        await page.wait_for_timeout(600)

        # 3. Open SelfActionGuideModal
        guide_btn = page.locator('[data-uia="btn-subtoolbar-self-guide"]')
        await guide_btn.click()
        await page.wait_for_timeout(1500)
        await page.screenshot(path=os.path.join(ARTIFACT_DIR, "vercel_live_photo_03_guide_photos.png"))
        print("[VERCEL LIVE TEST] Saved vercel_live_photo_03_guide_photos.png")

        # 4. Open Nested Photo Manager from Guide Modal
        nested_btn = page.locator('[data-uia="btn-open-photo-manager"]')
        await nested_btn.click()
        await page.wait_for_timeout(2500)
        await page.screenshot(path=os.path.join(ARTIFACT_DIR, "vercel_live_photo_04_nested_manager.png"))
        print("[VERCEL LIVE TEST] Saved vercel_live_photo_04_nested_manager.png")

        await browser.close()
        print("[VERCEL LIVE TEST] Completed all live verifications on Vercel production!")

if __name__ == '__main__':
    wait_for_deploy()
    asyncio.run(verify_live())
