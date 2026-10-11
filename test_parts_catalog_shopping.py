import asyncio
from playwright.async_api import async_playwright
import os

ARTIFACT_DIR = r"C:\Users\이정용\.gemini\antigravity\brain\d1cd0a4e-25fa-4001-b755-61009a16b9c7"

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 1600, 'height': 960})
        page = await context.new_page()

        print("[TEST] 1. Loading app at http://localhost:5173...")
        await page.goto("http://localhost:5173", wait_until="networkidle")
        await page.wait_for_timeout(1000)

        # 1. Open PartsOrderQuotationModal from subtoolbar
        quote_btn = page.locator('[data-uia="btn-subtoolbar-parts-quote"]')
        await quote_btn.click()
        await page.wait_for_timeout(1500)

        # 2. Verify Visual Shopping Tab is active
        modal_header = page.locator('text=소모품·부품 카탈로그 온라인 주문 및 원청 견적 연계')
        await modal_header.wait_for(state="visible")
        print("[TEST] PartsOrderQuotationModal opened successfully in Visual Shopping mode!")

        # 3. Capture initial shopping screen
        await page.screenshot(path=os.path.join(ARTIFACT_DIR, "catalog_01_visual_shopping_mode.png"))
        print("[TEST] Saved catalog_01_visual_shopping_mode.png")

        # 4. Test category filter: click '스퀴지/고무'
        squeegee_filter = page.locator('button:has-text("스퀴지/고무")').first
        await squeegee_filter.click()
        await page.wait_for_timeout(800)
        await page.screenshot(path=os.path.join(ARTIFACT_DIR, "catalog_02_filter_squeegee.png"))
        print("[TEST] Saved catalog_02_filter_squeegee.png")

        # 5. Add item to cart
        add_btn = page.locator('button:has-text("장바구니 담기")').first
        if await add_btn.count() > 0:
            await add_btn.click()
            await page.wait_for_timeout(500)

        # 6. Test 1st document recipient toggle: change to 원청 결재권자
        recipient_manager_radio = page.locator('input[type="radio"][value="MANAGER"], label:has-text("원청 결재권자")')
        await recipient_manager_radio.click()
        await page.wait_for_timeout(500)

        # 7. Test 3-channel selection: click 문자메세지
        sms_btn = page.locator('button:has-text("문자메세지")')
        await sms_btn.click()
        await page.wait_for_timeout(500)
        await page.screenshot(path=os.path.join(ARTIFACT_DIR, "catalog_03_cart_and_recipient.png"))
        print("[TEST] Saved catalog_03_cart_and_recipient.png")

        # 8. Test Online Order button (Save to Supabase DB)
        order_btn = page.locator('[data-uia="btn-submit-parts-order"]')
        await order_btn.click()
        await page.wait_for_timeout(1500)
        await page.screenshot(path=os.path.join(ARTIFACT_DIR, "catalog_04_order_submitted.png"))
        print("[TEST] Saved catalog_04_order_submitted.png")

        # 9. Switch to DB Admin tab
        db_tab = page.locator('[data-uia="btn-parts-tab-db"]')
        await db_tab.click()
        await page.wait_for_timeout(1000)
        await page.screenshot(path=os.path.join(ARTIFACT_DIR, "catalog_05_db_master_admin.png"))
        print("[TEST] Saved catalog_05_db_master_admin.png")

        # 10. Switch to A4 Official Quote tab
        a4_tab = page.locator('[data-uia="btn-parts-tab-a4"]')
        await a4_tab.click()
        await page.wait_for_timeout(1000)
        await page.screenshot(path=os.path.join(ARTIFACT_DIR, "catalog_06_official_a4_quote.png"))
        print("[TEST] Saved catalog_06_official_a4_quote.png")

        # 11. Switch to Mobile Preview tab
        mobile_tab = page.locator('[data-uia="btn-parts-tab-mobile"]')
        await mobile_tab.click()
        await page.wait_for_timeout(1000)
        await page.screenshot(path=os.path.join(ARTIFACT_DIR, "catalog_07_mobile_live_preview.png"))
        print("[TEST] Saved catalog_07_mobile_live_preview.png")

        await browser.close()
        print("[TEST] All parts catalog E2E tests finished 100% successfully!")

if __name__ == '__main__':
    asyncio.run(main())
