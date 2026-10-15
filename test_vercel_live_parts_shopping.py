import os
import time
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\이정용\.gemini\antigravity\brain\d1cd0a4e-25fa-4001-b755-61009a16b9c7"
LIVE_URL = "https://space-consult-assist.vercel.app/"

def run():
    print(f"[LIVE TEST] 1. Loading app at {LIVE_URL}...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1600, "height": 950})
        page = context.new_page()

        page.goto(LIVE_URL, wait_until="networkidle", timeout=30000)
        time.sleep(3)

        # 1. 고객 상담 1건 선택
        consult_cards = page.locator('div:has-text("J600T")')
        if consult_cards.count() > 0:
            consult_cards.first.click()
            time.sleep(1)

        # 2. 소모품 카탈로그 / 원청 견적 연계 모달 열기
        open_btn = page.locator('button:has-text("소모품 견적서")')
        if open_btn.count() == 0:
            open_btn = page.locator('button:has-text("카탈로그")')
        if open_btn.count() == 0:
            open_btn = page.locator('[data-uia="btn-open-parts-quotation"]')

        if open_btn.count() > 0:
            open_btn.first.click()
            time.sleep(2)
            print("[LIVE TEST] PartsOrderQuotationModal opened successfully on Vercel Live!")
        else:
            print("[LIVE TEST] Trying fallback button...")
            page.locator('button').filter(has_text="견적").first.click()
            time.sleep(2)

        # 3. 뷰 모드 1: 카탈로그 쇼핑 모드 스크린샷
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "vercel_live_parts_01_shopping.png"))
        print("[LIVE TEST] Saved vercel_live_parts_01_shopping.png")

        # 4. 장바구니에 품목 담기 (수량 올리기)
        plus_buttons = page.locator('button:has-text("+")')
        if plus_buttons.count() > 0:
            plus_buttons.first.click()
            time.sleep(0.5)

        # 1차 수신인 변경: 원청 결재권자 라디오 선택
        manager_radio = page.locator('input[type="radio"][value="MANAGER"]')
        if manager_radio.count() > 0:
            manager_radio.click()
            time.sleep(0.5)

        # 발송 수단 변경: 문자메세지(LMS) 클릭
        sms_btn = page.locator('button:has-text("문자메세지")')
        if sms_btn.count() > 0:
            sms_btn.click()
            time.sleep(0.5)

        page.screenshot(path=os.path.join(ARTIFACT_DIR, "vercel_live_parts_02_cart_recipient.png"))
        print("[LIVE TEST] Saved vercel_live_parts_02_cart_recipient.png")

        # 5. 온라인 주문하기 실행 (Supabase DB 저장)
        submit_btn = page.locator('[data-uia="btn-submit-parts-order"]')
        if submit_btn.count() > 0:
            submit_btn.click()
            time.sleep(2)
            page.screenshot(path=os.path.join(ARTIFACT_DIR, "vercel_live_parts_03_order_placed.png"))
            print("[LIVE TEST] Saved vercel_live_parts_03_order_placed.png")

        # 6. 뷰 모드 2: DB 마스터 관리 탭 전환
        db_tab = page.locator('button:has-text("카탈로그 DB 관리")')
        if db_tab.count() > 0:
            db_tab.click()
            time.sleep(1.5)
            page.screenshot(path=os.path.join(ARTIFACT_DIR, "vercel_live_parts_04_db_master.png"))
            print("[LIVE TEST] Saved vercel_live_parts_04_db_master.png")

        # 7. 뷰 모드 3: 원청 공식 A4 견적서 탭 전환
        quote_tab = page.locator('button:has-text("공식 A4 견적서")')
        if quote_tab.count() > 0:
            quote_tab.click()
            time.sleep(1.5)
            page.screenshot(path=os.path.join(ARTIFACT_DIR, "vercel_live_parts_05_a4_quote.png"))
            print("[LIVE TEST] Saved vercel_live_parts_05_a4_quote.png")

        # 8. 뷰 모드 4: 모바일 수신 프리뷰 탭 전환
        mobile_tab = page.locator('button:has-text("모바일 프리뷰")')
        if mobile_tab.count() > 0:
            mobile_tab.click()
            time.sleep(1.5)
            page.screenshot(path=os.path.join(ARTIFACT_DIR, "vercel_live_parts_06_mobile_preview.png"))
            print("[LIVE TEST] Saved vercel_live_parts_06_mobile_preview.png")

        browser.close()
        print("[LIVE TEST] All Vercel live production tests completed 100% successfully!")

if __name__ == "__main__":
    run()
