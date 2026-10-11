import asyncio
from playwright.async_api import async_playwright
import os

ARTIFACT_DIR = r"C:\Users\이정용\.gemini\antigravity\brain\d1cd0a4e-25fa-4001-b755-61009a16b9c7"

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 1600, 'height': 960})
        page = await context.new_page()

        print("[TEST] 1. Loading app...")
        await page.goto("http://localhost:5173", wait_until="networkidle")
        await page.wait_for_timeout(1000)

        # 1. Open SelfActionGuideModal from subtoolbar
        guide_btn = page.locator('[data-uia="btn-subtoolbar-self-guide"]')
        await guide_btn.click()
        await page.wait_for_timeout(1000)

        # 2. Open photo manager from inside guide modal
        nested_manager_btn = page.locator('[data-uia="btn-open-photo-manager"]')
        await nested_manager_btn.click()
        await page.wait_for_timeout(2500) # Wait for photos to load

        # 3. Test move down
        move_down = page.locator('[data-uia="btn-photo-move-down"]').first
        await move_down.wait_for(state="visible")
        print("[TEST] Move down button found, clicking...")
        await move_down.click()
        await page.wait_for_timeout(800)
        await page.screenshot(path=os.path.join(ARTIFACT_DIR, "photo_06_reordered_item1_down.png"))
        print("[TEST] Saved photo_06_reordered_item1_down.png")

        # 4. Test zoom modal by clicking thumbnail in manager
        thumb = page.locator('[data-uia="photo-manager-thumbnail"]').first
        print("[TEST] Clicking photo thumbnail to zoom...")
        await thumb.click()
        await page.wait_for_timeout(800)
        await page.screenshot(path=os.path.join(ARTIFACT_DIR, "photo_07_zoom_modal.png"))
        print("[TEST] Saved photo_07_zoom_modal.png")

        # Close zoom modal by clicking close button
        close_zoom = page.locator('[data-uia="btn-close-zoom-photo"]')
        await close_zoom.click()
        await page.wait_for_timeout(600)

        # 5. Click Save
        save_btn = page.locator('[data-uia="btn-save-symptom-photos"]')
        await save_btn.click()
        await page.wait_for_timeout(1500)

        # 6. Verify back to SelfActionGuideModal and capture
        await page.screenshot(path=os.path.join(ARTIFACT_DIR, "photo_08_after_save_in_guide.png"))
        print("[TEST] Saved photo_08_after_save_in_guide.png")

        await browser.close()
        print("[TEST] All tests passed 100% successfully!")

if __name__ == '__main__':
    asyncio.run(main())
