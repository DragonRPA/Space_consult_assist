import asyncio
import os
from playwright.async_api import async_playwright

async def main():
    artifacts_dir = r"C:\Users\이정용\.gemini\antigravity\brain\d1cd0a4e-25fa-4001-b755-61009a16b9c7"
    os.makedirs(artifacts_dir, exist_ok=True)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1440, "height": 900})
        page = await context.new_page()

        print("[Live Verification] Visiting https://space-consult-assist.vercel.app/")
        await page.goto("https://space-consult-assist.vercel.app/", timeout=30000)
        await page.wait_for_load_state("networkidle")
        await asyncio.sleep(2)

        # 1. Capture main page
        shot1 = os.path.join(artifacts_dir, "vercel_live_lifecycle_main.png")
        await page.screenshot(path=shot1)
        print(f"Captured: {shot1}")

        # 2. Select symptom to check enlarged error codes
        await page.locator("[data-symptom-card]").first.click()
        await asyncio.sleep(1)

        chip_888 = page.locator('[data-error-chip="888"]')
        await chip_888.wait_for(state="visible", timeout=10000)
        await chip_888.click()
        await asyncio.sleep(0.5)

        shot2 = os.path.join(artifacts_dir, "vercel_live_lifecycle_error_enlarged.png")
        await page.screenshot(path=shot2)
        print(f"Captured: {shot2}")

        # 3. Enter note and click save pending
        notes_input = page.locator('[data-uia="input-counsel-notes"]')
        await notes_input.fill("고객 증류수 보충 후 15분 뒤 재확인 통화 예정")
        await asyncio.sleep(0.3)

        await page.locator('[data-uia="btn-save-pending"]').click()
        await asyncio.sleep(1)

        # 4. Open pending queue modal
        await page.locator('[data-uia="btn-subtoolbar-pending-queue"]').click()
        await asyncio.sleep(0.5)

        shot3 = os.path.join(artifacts_dir, "vercel_live_lifecycle_pending_queue.png")
        await page.screenshot(path=shot3)
        print(f"Captured: {shot3}")

        # 5. Resume session
        await page.locator("[data-pending-queue-modal]").locator("button:has-text('상담 이어하기')").first.click()
        await asyncio.sleep(1)

        shot4 = os.path.join(artifacts_dir, "vercel_live_lifecycle_resumed.png")
        await page.screenshot(path=shot4)
        print(f"Captured: {shot4}")

        print("Live Vercel verification completed successfully!")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
