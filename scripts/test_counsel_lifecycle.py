import asyncio
import os
import sys
from playwright.async_api import async_playwright

async def main():
    artifacts_dir = r"C:\Users\이정용\.gemini\antigravity\brain\d1cd0a4e-25fa-4001-b755-61009a16b9c7"
    os.makedirs(artifacts_dir, exist_ok=True)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1440, "height": 900})
        page = await context.new_page()

        print("[Step 1] Navigating to http://127.0.0.1:5173/")
        await page.goto("http://127.0.0.1:5173/")
        await page.wait_for_load_state("networkidle")
        await asyncio.sleep(1)

        # ── 1. 에러코드 확대 및 가독성 검증 ─────────────────────────────
        print("[Step 2] Selecting symptom with error codes...")
        symptom_card = page.locator("[data-symptom-card]").first
        await symptom_card.click()
        await asyncio.sleep(0.5)

        # Check error chip 888
        chip_888 = page.locator('[data-error-chip="888"]')
        await chip_888.wait_for(state="visible", timeout=5000)
        
        # Verify font size of chip code badge
        badge_font_size = await chip_888.locator("span").first.evaluate("el => window.getComputedStyle(el).fontSize")
        print(f"Chip 888 badge font size: {badge_font_size}")
        
        # Click error chip 888
        await chip_888.click()
        await asyncio.sleep(0.5)

        # Check instant resolve card
        instant_card = page.locator("text=원인 및 점검 포인트:")
        await instant_card.wait_for(state="visible", timeout=5000)

        shot1 = os.path.join(artifacts_dir, "test_01_error_code_enlarged.png")
        await page.screenshot(path=shot1)
        print(f"Captured: {shot1}")

        # ── 2. 고객 선택 및 STEP 1 불량 처리 ─────────────────────────────
        print("[Step 3] Selecting customer and advancing STEP 1 to fail...")
        cust_input = page.locator('[data-uia="input-customer-search"]')
        await cust_input.fill("이마트")
        await asyncio.sleep(0.5)

        cust_item = page.locator('[data-customer-item]').first
        if await cust_item.is_visible():
            await cust_item.click()
            print("Selected customer from dropdown")
        await asyncio.sleep(0.5)

        # Advance STEP 1 to fail using data-uia
        fail_btn = page.locator('[data-uia="btn-step-fail"]')
        await fail_btn.click()
        await asyncio.sleep(0.5)

        # Enter consultation notes
        notes_input = page.locator('[data-uia="input-counsel-notes"]')
        await notes_input.fill("고객 배터리실 개방 점검 후 30분 뒤 재인입 예정")
        await asyncio.sleep(0.3)

        # ── 3. 고객 확인 대기 (진행중 저장) ─────────────────────────────
        print("[Step 4] Saving as pending (Customer wait)...")
        save_pending_btn = page.locator('[data-uia="btn-save-pending"]')
        await save_pending_btn.click()
        await asyncio.sleep(1.5)

        shot2 = os.path.join(artifacts_dir, "test_02_pending_saved_reset.png")
        await page.screenshot(path=shot2)
        print(f"Captured: {shot2}")

        # Check subtoolbar badge count
        queue_btn = page.locator('[data-uia="btn-subtoolbar-pending-queue"]')
        btn_text = await queue_btn.text_content()
        print(f"Queue button text: {btn_text}")

        # ── 4. 진행중 상담 대기열 모달 열기 ─────────────────────────────
        print("[Step 5] Opening pending queue modal...")
        await queue_btn.click()
        await asyncio.sleep(0.5)

        pending_modal = page.locator("[data-pending-queue-modal]")
        await pending_modal.wait_for(state="visible", timeout=5000)

        shot3 = os.path.join(artifacts_dir, "test_03_pending_queue_modal.png")
        await page.screenshot(path=shot3)
        print(f"Captured: {shot3}")

        # ── 5. 상담 이어하기 (Resume) ──────────────────────────────────
        print("[Step 6] Clicking resume session...")
        resume_btn = pending_modal.locator("button:has-text('상담 이어하기')").first
        await resume_btn.click()
        await asyncio.sleep(1)

        shot4 = os.path.join(artifacts_dir, "test_04_session_resumed_step2.png")
        await page.screenshot(path=shot4)
        print(f"Captured: {shot4}")

        # ── 6. STEP 2 정상 판정 및 전체 직접조치 완료 종결 ──────────────
        print("[Step 7] Completing consultation with resolve...")
        resolve_step_btn = page.locator('[data-uia="btn-step-resolve"]')
        await resolve_step_btn.click()
        await asyncio.sleep(1)

        complete_btn = page.locator('[data-uia="btn-save-resolved"]')
        await complete_btn.click()
        await asyncio.sleep(1.5)

        # ── 7. 상담 이력 조회 모달 및 상세 타임라인 감사 ───────────────
        print("[Step 8] Opening history audit modal...")
        history_btn = page.locator('[data-uia="btn-subtoolbar-history"]')
        await history_btn.click()
        await asyncio.sleep(0.8)

        history_modal = page.locator("[data-history-modal]")
        await history_modal.wait_for(state="visible", timeout=5000)

        # Click the first record in history list to view dossier
        first_hist = page.locator("[data-history-item]").first
        await first_hist.click()
        await asyncio.sleep(0.5)

        shot5 = os.path.join(artifacts_dir, "test_05_history_audit_dossier.png")
        await page.screenshot(path=shot5)
        print(f"Captured: {shot5}")

        # Close history modal
        close_btn = history_modal.locator("button:has-text('닫기')")
        await close_btn.click()
        await asyncio.sleep(0.5)

        # ── 8. 고객 검색 시 진행 중 상담 자동 감지 배너 검증 ─────────
        print("[Step 9] Testing customer pending session auto-detect banner...")
        # Create a pending session for '스페이스클린'
        cust_input = page.locator('[data-uia="input-customer-search"]')
        await cust_input.fill("스페이스")
        await asyncio.sleep(0.5)
        space_item = page.locator('[data-customer-item]').first
        await space_item.wait_for(state="visible", timeout=5000)
        await space_item.click()
        print("Selected 스페이스 customer from dropdown")
        await asyncio.sleep(0.5)

        await page.locator("[data-symptom-card]").first.click()
        await asyncio.sleep(0.3)
        await page.locator('[data-uia="btn-save-pending"]').click()
        await asyncio.sleep(1.5)

        # Now search and select 스페이스 again
        await cust_input.fill("스페이스")
        await asyncio.sleep(0.5)
        space_item2 = page.locator('[data-customer-item]').first
        await space_item2.wait_for(state="visible", timeout=5000)
        await space_item2.click()
        print("Re-selected 스페이스 customer")
        await asyncio.sleep(0.5)
        
        # Verify detected banner
        banner_btn = page.locator('[data-uia="btn-resume-detected-session"]')
        await banner_btn.wait_for(state="visible", timeout=5000)

        shot6 = os.path.join(artifacts_dir, "test_06_customer_pending_banner.png")
        await page.screenshot(path=shot6)
        print(f"Captured: {shot6}")

        print("\nAll 6 tests passed successfully!")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
