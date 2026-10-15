import os
from playwright.sync_api import sync_playwright

def main():
    art_dir = r"C:\Users\이정용\.gemini\antigravity\brain\d1cd0a4e-25fa-4001-b755-61009a16b9c7"
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.goto("http://127.0.0.1:5173/")
        page.wait_for_timeout(1000)

        # 1. '배터리 조기 방전' 첫 번째 증상 클릭
        first_symptom = page.locator("text=배터리 조기 방전").first
        first_symptom.click()
        page.wait_for_timeout(600)
        page.screenshot(path=os.path.join(art_dir, "impeccable_before_symptom1.png"))

        # 2. 에러코드 카테고리 클릭 후 '계기판 에러 코드 점멸' 증상 클릭 (복수 증상 탭 상태)
        page.locator("button:has-text('에러코드')").first.click()
        page.wait_for_timeout(300)
        page.locator("text=계기판 에러 코드 점멸").first.click()
        page.wait_for_timeout(600)
        page.screenshot(path=os.path.join(art_dir, "impeccable_before_multi_error.png"))

        browser.close()
        print("Done capturing active states.")

if __name__ == "__main__":
    main()
