import os
import time
from playwright.sync_api import sync_playwright

def run_test():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        print("1. 로컬 프론트엔드 (http://localhost:5173/) 접속")
        page.goto("http://localhost:5173/")
        page.wait_for_load_state("networkidle")
        time.sleep(1)

        # 2. J600T 모델 기본 상태에서 에러코드 카테고리 클릭 및 '계기판 에러 코드 점멸' 선택
        print("2. J600T 모델 상태에서 에러코드 증상 선택")
        error_cat_btn = page.locator("button:has-text('에러코드')").first
        if error_cat_btn.is_visible():
            error_cat_btn.click()
            time.sleep(0.5)

        symptom_item = page.locator("text=계기판 에러 코드 점멸").first
        symptom_item.click()
        time.sleep(1)

        # J600T 스크린샷
        art_dir = r"C:\Users\이정용\.gemini\antigravity\brain\d1cd0a4e-25fa-4001-b755-61009a16b9c7"
        page.screenshot(path=os.path.join(art_dir, "test_model_error_codes_j600t.png"))
        print("-> J600T 스크린샷 저장 완료: test_model_error_codes_j600t.png")

        # 3. 모델을 'S7'로 변경
        print("3. 모델을 S7로 변경")
        model_select = page.locator("select").first
        model_select.select_option("S7")
        time.sleep(1)

        page.screenshot(path=os.path.join(art_dir, "test_model_error_codes_s7.png"))
        print("-> S7 스크린샷 저장 완료: test_model_error_codes_s7.png")

        # 4. 모델을 'S12'로 변경
        print("4. 모델을 S12로 변경")
        model_select.select_option("S12")
        time.sleep(1)

        page.screenshot(path=os.path.join(art_dir, "test_model_error_codes_s12.png"))
        print("-> S12 스크린샷 저장 완료: test_model_error_codes_s12.png")

        # 5. 모델을 'W12'로 변경
        print("5. 모델을 W12로 변경")
        model_select.select_option("W12")
        time.sleep(1)

        page.screenshot(path=os.path.join(art_dir, "test_model_error_codes_w12.png"))
        print("-> W12 스크린샷 저장 완료: test_model_error_codes_w12.png")

        # 6. S7에서 에러코드 칩 클릭 동작 검증 (예: 6-0 액추에이터 과부하)
        print("6. S7 모델로 복귀 후 6-0 브러시 액추에이터 칩 클릭")
        model_select.select_option("S7")
        time.sleep(0.5)
        
        chip_6_0 = page.locator("button:has-text('6-0')").first
        if chip_6_0.is_visible():
            chip_6_0.click()
            time.sleep(0.5)

        page.screenshot(path=os.path.join(art_dir, "test_model_error_codes_s7_chip_clicked.png"))
        print("-> S7 칩 클릭 스크린샷 저장 완료: test_model_error_codes_s7_chip_clicked.png")

        browser.close()
        print("E2E 검증 완료!")

if __name__ == "__main__":
    run_test()
