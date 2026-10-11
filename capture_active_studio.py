# -*- coding: utf-8 -*-
import os
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
    port = find_free_port()
    server_thread = threading.Thread(target=run_server, args=(port, dist_dir), daemon=True)
    server_thread.start()
    time.sleep(1)

    url = f"http://127.0.0.1:{port}/"
    artifact_dir = os.path.abspath("C:/Users/이정용/.gemini/antigravity/brain/d1cd0a4e-25fa-4001-b755-61009a16b9c7")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1600, 'height': 960})
        page = context.new_page()

        page.goto(url, wait_until='networkidle')
        time.sleep(2)

        # Click symptom "바닥 잔수 과다" on the left list to activate session
        symptom_btn = page.locator('text="바닥 잔수 과다"').first
        if symptom_btn.count() > 0:
            symptom_btn.click()
            time.sleep(1.5)

        shot = os.path.join(artifact_dir, "downstream_08_active_studio_full.png")
        page.screenshot(path=shot, full_page=False)
        print(f"Screenshot saved: {shot}")
        browser.close()

if __name__ == '__main__':
    main()
