import os
import time
import urllib.request
import re
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\이정용\.gemini\antigravity\brain\d1cd0a4e-25fa-4001-b755-61009a16b9c7"
LIVE_URL = "https://space-consult-assist.vercel.app"

print("Waiting for Vercel deployment of new bundle (index-BLpRQ5XX.js)...")
for i in range(25):
    try:
        req = urllib.request.Request(LIVE_URL + "/", headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=10) as resp:
            html = resp.read().decode('utf-8')
            js_files = re.findall(r'src="([^"]+\.js)"', html)
            if js_files:
                print(f"Attempt {i+1}: {js_files[0]}")
                if 'BLpRQ5XX' in js_files[0]:
                    print("Vercel live updated!")
                    break
    except Exception as e:
        print(f"Attempt {i+1} error: {e}")
    time.sleep(4)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1750, "height": 900})
    page = context.new_page()

    # 1. 상담지원1 (/stt)
    page.goto(LIVE_URL + "/stt", wait_until="networkidle", timeout=30000)
    time.sleep(1.5)
    page.screenshot(path=os.path.join(ARTIFACT_DIR, "nav_01_counsel1_stt.png"))
    print("Saved nav_01_counsel1_stt.png")

    # 2. 상담지원2 (/)
    page.locator('button:has-text("상담지원2")').first.click()
    time.sleep(1.5)
    page.screenshot(path=os.path.join(ARTIFACT_DIR, "nav_02_counsel2_studio.png"))
    print("Saved nav_02_counsel2_studio.png")

    browser.close()
print("Done!")
