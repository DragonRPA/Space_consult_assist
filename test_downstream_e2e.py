# -*- coding: utf-8 -*-
import os
import sys
import time
import socket
import threading
import http.server
import socketserver
from playwright.sync_api import sync_playwright

def find_free_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]

def run_server(port, dist_dir):
    class QuietHandler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=dist_dir, **kwargs)
        def log_message(self, format, *args):
            pass

    with socketserver.TCPServer(('127.0.0.1', port), QuietHandler) as httpd:
        httpd.serve_forever()

def main():
    dist_dir = os.path.abspath('frontend/dist')
    if not os.path.exists(dist_dir):
        print(f"Dist dir does not exist: {dist_dir}")
        sys.exit(1)

    port = find_free_port()
    server_thread = threading.Thread(target=run_server, args=(port, dist_dir), daemon=True)
    server_thread.start()
    time.sleep(1)

    url = f"http://127.0.0.1:{port}/"
    artifact_dir = os.path.abspath("C:/Users/이정용/.gemini/antigravity/brain/d1cd0a4e-25fa-4001-b755-61009a16b9c7")
    os.makedirs(artifact_dir, exist_ok=True)

    print(f"Server started at {url}")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1600, 'height': 960})
        page = context.new_page()

        print("Navigating to app...")
        page.goto(url, wait_until='networkidle')
        time.sleep(2)

        # 1. Main Studio Screenshot with 4-stage stepper, subtoolbar, active step, and bottom action bar
        shot1 = os.path.join(artifact_dir, "downstream_01_studio_stepper.png")
        page.screenshot(path=shot1, full_page=False)
        print(f"Screenshot 1 saved: {shot1}")

        # 2. Click Stepper button to open SelfActionGuideModal
        print("Opening SelfActionGuideModal from Stepper...")
        stepper_btn = page.locator('[data-uia="btn-stepper-self-guide"]')
        if stepper_btn.count() > 0:
            stepper_btn.click()
        else:
            page.locator('button:has-text("자가조치 가이드")').first.click()
        time.sleep(1.5)

        shot2 = os.path.join(artifact_dir, "downstream_02_self_guide_modal.png")
        page.screenshot(path=shot2, full_page=False)
        print(f"Screenshot 2 saved: {shot2}")

        # 3. Test sending guide (click Send Guide button)
        print("Testing Send Guide button in SelfActionGuideModal...")
        send_guide_btn = page.locator('[data-uia="btn-send-guide-to-worker"]')
        if send_guide_btn.count() > 0:
            send_guide_btn.click()
            time.sleep(1)

        shot3 = os.path.join(artifact_dir, "downstream_03_self_guide_sent.png")
        page.screenshot(path=shot3, full_page=False)
        print(f"Screenshot 3 saved: {shot3}")

        # 4. Jump directly from Self Action photo to Parts Order Quotation
        print("Clicking jump to Parts Quotation from sketch photo evidence...")
        jump_btn = page.locator('[data-uia="btn-jump-to-parts-quotation"]')
        jump_btn.click()
        time.sleep(1.5)

        # 5. Parts Order Quotation Modal Screenshot
        shot4 = os.path.join(artifact_dir, "downstream_04_parts_quotation_modal.png")
        page.screenshot(path=shot4, full_page=False)
        print(f"Screenshot 4 saved: {shot4}")

        # 6. Switch to Official A4 Print Preview in Parts Order Quotation
        print("Toggling A4 Print Form mode in Parts Quotation...")
        a4_btn = page.locator('[data-uia="btn-parts-tab-a4"]')
        a4_btn.click()
        time.sleep(1.5)

        shot5 = os.path.join(artifact_dir, "downstream_05_parts_a4_official_doc.png")
        page.screenshot(path=shot5, full_page=False)
        print(f"Screenshot 5 saved: {shot5}")

        # 7. Test 3 channels in Parts Quotation (switch to Email, then SMS)
        print("Switching back to edit tab and testing EMAIL channel...")
        page.locator('[data-uia="btn-parts-tab-edit"]').click()
        time.sleep(1)
        page.locator('[data-channel-option="EMAIL"]').click()
        time.sleep(0.5)

        shot6 = os.path.join(artifact_dir, "downstream_06_parts_email_channel.png")
        page.screenshot(path=shot6, full_page=False)
        print(f"Screenshot 6 saved: {shot6}")

        print("Testing SMS channel...")
        page.locator('[data-channel-option="SMS"]').click()
        time.sleep(0.5)

        shot7 = os.path.join(artifact_dir, "downstream_07_parts_sms_channel.png")
        page.screenshot(path=shot7, full_page=False)
        print(f"Screenshot 7 saved: {shot7}")

        browser.close()
        print("All downstream E2E test steps completed successfully!")

if __name__ == '__main__':
    main()
