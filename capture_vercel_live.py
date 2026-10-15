# -*- coding: utf-8 -*-
import os
import time
from playwright.sync_api import sync_playwright

def main():
    url = "https://space-consult-assist.vercel.app/"
    artifact_dir = os.path.abspath("C:/Users/이정용/.gemini/antigravity/brain/d1cd0a4e-25fa-4001-b755-61009a16b9c7")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1600, 'height': 960})
        page = context.new_page()

        print("Navigating to LIVE Vercel production app...")
        page.goto(url, wait_until='networkidle')
        time.sleep(2)

        # 1. Activate symptom "바닥 잔수 과다" to reveal 4-stage stepper
        print("Selecting symptom '바닥 잔수 과다'...")
        page.locator('text="바닥 잔수 과다"').first.click()
        time.sleep(1.5)

        # Live Studio Screenshot with Stepper & Active Step Card & 3 Branches
        shot1 = os.path.join(artifact_dir, "vercel_live_downstream_01_studio.png")
        page.screenshot(path=shot1, full_page=False)
        print(f"Saved: {shot1}")

        # 2. Click Stepper button to open SelfActionGuideModal
        print("Opening SelfActionGuideModal...")
        page.locator('[data-uia="btn-stepper-self-guide"]').click()
        time.sleep(1.5)

        shot2 = os.path.join(artifact_dir, "vercel_live_downstream_02_self_guide.png")
        page.screenshot(path=shot2, full_page=False)
        print(f"Saved: {shot2}")

        # 3. Jump to Parts Quotation from sketch photo
        print("Jumping to Parts Quotation from sketch photo evidence...")
        page.locator('[data-uia="btn-jump-to-parts-quotation"]').click()
        time.sleep(1.5)

        shot3 = os.path.join(artifact_dir, "vercel_live_downstream_03_parts_quote.png")
        page.screenshot(path=shot3, full_page=False)
        print(f"Saved: {shot3}")

        # 4. Official A4 Format
        print("Switching to official A4 format...")
        page.locator('[data-uia="btn-parts-tab-a4"]').click()
        time.sleep(1.5)

        shot4 = os.path.join(artifact_dir, "vercel_live_downstream_04_parts_a4.png")
        page.screenshot(path=shot4, full_page=False)
        print(f"Saved: {shot4}")

        browser.close()
        print("All live Vercel screenshots captured successfully!")

if __name__ == '__main__':
    main()
