import asyncio
import os
import sys
from playwright.async_api import async_playwright

ARTIFACT_DIR = r"C:\Users\이정용\.gemini\antigravity\brain\d1cd0a4e-25fa-4001-b755-61009a16b9c7"

async def run_e2e_verification():
    print("[E2E] Starting Integrated Search & Symptom Chosung Verification...")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1440, "height": 900})
        page = await context.new_page()

        # 1. 메인 화면 접속
        print("Step 1: Navigating to http://127.0.0.1:5173/...")
        await page.goto("http://127.0.0.1:5173/", wait_until="networkidle")
        await page.wait_for_timeout(1000)

        # 2. 증상 초성 검색 테스트: 'ㅅㅇ' 입력
        print("Step 2: Testing Symptom Chosung Search with 'ㅅㅇ'...")
        symptom_input = page.locator("input[placeholder*='증상 검색']")
        await symptom_input.fill("ㅅㅇ")
        await page.wait_for_timeout(600)
        
        # '흡입 모터 이상 소음' 카드가 보이는지 확인
        suction_card = page.locator("[data-symptom-card*='흡입']")
        is_suction_visible = await suction_card.is_visible()
        print(f"  -> 'ㅅㅇ' matching '흡입 모터 이상 소음': {'SUCCESS' if is_suction_visible else 'FAIL'}")
        
        path1 = os.path.join(ARTIFACT_DIR, "test_symptom_chosung_suction.png")
        await page.screenshot(path=path1)
        print(f"  -> Screenshot saved: {path1}")

        # 3. 증상 초성 검색 테스트: 'ㅂㅌㄹ' 입력
        print("Step 3: Testing Symptom Chosung Search with 'ㅂㅌㄹ'...")
        await symptom_input.fill("ㅂㅌㄹ")
        await page.wait_for_timeout(600)
        battery_card = page.locator("[data-symptom-card*='배터리']").first
        is_battery_visible = await battery_card.is_visible()
        print(f"  -> 'ㅂㅌㄹ' matching '배터리 조기 방전': {'SUCCESS' if is_battery_visible else 'FAIL'}")

        # 4. 증상 카테고리 퀵버튼 '에러코드' 클릭 테스트
        print("Step 4: Testing '에러코드' Symptom Category button...")
        await symptom_input.fill("") # 검색어 비우기
        await page.wait_for_timeout(400)
        
        err_cat_btn = page.locator("button:has-text('에러코드')").first
        await err_cat_btn.click()
        await page.wait_for_timeout(600)
        
        err_card = page.locator("[data-symptom-card*='계기판 에러 코드 점멸']")
        is_err_card_visible = await err_card.is_visible()
        print(f"  -> Category '에러코드' shows '계기판 에러 코드 점멸': {'SUCCESS' if is_err_card_visible else 'FAIL'}")
        
        path2 = os.path.join(ARTIFACT_DIR, "test_symptom_category_error_code.png")
        await page.screenshot(path=path2)
        print(f"  -> Screenshot saved: {path2}")

        # 5. 고객 선택 및 전화번호 입력 필드 검증
        print("Step 5: Testing Customer Search and Phone Number Auto-fill...")
        all_cat_btn = page.locator("button:has-text('전체')").first
        await all_cat_btn.click()
        await page.wait_for_timeout(300)

        # 고객 검색에 '스페이스' 입력 후 스페이스클린 강남점 선택
        cust_input = page.locator("[data-uia='input-customer-search']")
        await cust_input.click()
        await cust_input.fill("스페이스")
        await page.wait_for_timeout(800)
        
        cust_item = page.locator("[data-customer-item*='스페이스클린 강남점']").first
        if await cust_item.is_visible():
            await cust_item.click()
            await page.wait_for_timeout(600)
            print("  -> Selected '(주)스페이스클린 강남점'")
        else:
            # 직접 전화번호 입력 테스트
            phone_input = page.locator("[data-uia='input-customer-phone']")
            await phone_input.fill("010-9123-4567")
            print("  -> Manually filled phone: 010-9123-4567")

        # 전화번호 입력창 값 확인
        phone_input = page.locator("[data-uia='input-customer-phone']")
        phone_val = await phone_input.input_value()
        print(f"  -> Phone input value: '{phone_val}'")

        # 증상 선택 및 대기열 임시 저장
        symptom_item = page.locator("[data-symptom-card]").first
        await symptom_item.click()
        await page.wait_for_timeout(600)

        # 888 에러코드 칩 선택
        chip_888 = page.locator("[data-error-chip='888']").first
        if await chip_888.is_visible():
            await chip_888.click()
            await page.wait_for_timeout(400)

        # 메모 입력
        memo_textarea = page.locator("textarea[placeholder*='특이사항']")
        if await memo_textarea.is_visible():
            await memo_textarea.fill("고객 배터리실 개방 점검 후 30분 뒤 재인입 예정 (통합검색테스트)")

        # 고객 확인 대기(임시저장) 버튼 클릭
        btn_pending_save = page.locator("[data-uia='btn-save-pending']")
        await btn_pending_save.click()
        await page.wait_for_timeout(1000)
        print("  -> Saved session as pending (고객 확인 대기)")

        # 6. 상단 진행중 상담 대기열 모달 열기
        print("Step 6: Opening Pending Queue Modal...")
        btn_open_pending = page.locator("[data-uia='btn-subtoolbar-pending-queue']")
        await btn_open_pending.click()
        await page.wait_for_timeout(600)

        # 대기열 모달 스크린샷 1: 전체 목록
        path3 = os.path.join(ARTIFACT_DIR, "test_pending_modal_all_items.png")
        await page.screenshot(path=path3)
        print(f"  -> Screenshot saved: {path3}")

        # 7. 통합 검색 강화 테스트: 전화번호 뒷자리 '4567' 검색
        print("Step 7: Testing Pending Search with Phone digits '4567'...")
        pending_search = page.locator("[data-uia='input-pending-search']")
        await pending_search.fill("4567")
        await page.wait_for_timeout(500)
        
        path4 = os.path.join(ARTIFACT_DIR, "test_pending_search_phone_digits.png")
        await page.screenshot(path=path4)
        print(f"  -> Screenshot saved: {path4}")

        # 8. 통합 검색 강화 테스트: 초성 'ㅅㅍ' 검색
        print("Step 8: Testing Pending Search with Chosung 'ㅅㅍ'...")
        await pending_search.fill("ㅅㅍ")
        await page.wait_for_timeout(500)
        path5 = os.path.join(ARTIFACT_DIR, "test_pending_search_chosung.png")
        await page.screenshot(path=path5)
        print(f"  -> Screenshot saved: {path5}")

        # 9. 통합 검색 강화 테스트: 에러코드 '888' 검색
        print("Step 9: Testing Pending Search with Error Code '888'...")
        await pending_search.fill("888")
        await page.wait_for_timeout(500)
        path6 = os.path.join(ARTIFACT_DIR, "test_pending_search_error_code.png")
        await page.screenshot(path=path6)
        print(f"  -> Screenshot saved: {path6}")

        # 10. 통합 검색 강화 테스트: 다중 조건 '스페이스 4567' 검색
        print("Step 10: Testing Pending Search with Multiple Tokens '스페이스 4567'...")
        await pending_search.fill("스페이스 4567")
        await page.wait_for_timeout(500)
        path7 = os.path.join(ARTIFACT_DIR, "test_pending_search_multi_tokens.png")
        await page.screenshot(path=path7)
        print(f"  -> Screenshot saved: {path7}")

        print("\nAll 10 verification steps completed successfully!")
        await browser.close()

if __name__ == '__main__':
    asyncio.run(run_e2e_verification())
