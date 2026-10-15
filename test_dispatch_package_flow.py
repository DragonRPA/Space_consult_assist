import asyncio
import http.server
import os
import socketserver
import threading
from playwright.async_api import async_playwright

PORT = 5174
DIST_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "frontend", "dist"))
ARTIFACT_DIR = r"C:\Users\이정용\.gemini\antigravity\brain\d1cd0a4e-25fa-4001-b755-61009a16b9c7"

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIST_DIR, **kwargs)

def start_server():
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("127.0.0.1", PORT), Handler) as httpd:
        httpd.serve_forever()

async def main():
    server_thread = threading.Thread(target=start_server, daemon=True)
    server_thread.start()
    print(f"Static HTTP server started at http://127.0.0.1:{PORT} serving {DIST_DIR}")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 1600, 'height': 980})
        page = await context.new_page()

        # 1. 메인 진입
        print("1. Loading http://127.0.0.1:5174/ ...")
        await page.goto(f"http://127.0.0.1:{PORT}/", wait_until="networkidle")
        await asyncio.sleep(1)
        path1 = os.path.join(ARTIFACT_DIR, "dispatch_01_main.png")
        await page.screenshot(path=path1)
        print(f"Captured: {path1}")

        # 2. 고객사 초성/검색 ("반포")
        print("2. Searching customer '반포'...")
        search_input = page.locator('[data-uia="input-customer-search"]')
        await search_input.fill("반포")
        await asyncio.sleep(0.5)

        # 드롭다운에서 선택
        cust_item = page.locator('[data-customer-item="반포자이 아파트 관리사무소"]')
        await cust_item.click()
        await asyncio.sleep(0.5)
        path2 = os.path.join(ARTIFACT_DIR, "dispatch_02_customer_2track.png")
        await page.screenshot(path=path2)
        print(f"Captured: {path2}")

        # 3. 증상 선택 (첫 번째 증상 클릭)
        print("3. Selecting symptom...")
        symptom_chip = page.locator('[data-symptom-card]').first
        if await symptom_chip.count() > 0:
            await symptom_chip.click()
        else:
            # fallback to any symptom list item
            await page.locator('text=잔수 흡입 불량 및 오수 유출').first.click()
        await asyncio.sleep(0.5)

        # 4. AS 출장 접수 버튼 클릭
        print("4. Clicking AS 출장 접수...")
        visit_btn = page.locator('[data-uia="btn-save-visit"]')
        await visit_btn.click()
        await asyncio.sleep(1)

        path3 = os.path.join(ARTIFACT_DIR, "dispatch_03_modal_doc1.png")
        await page.screenshot(path=path3)
        print(f"Captured: {path3}")

        # 5. 2차 통합문서 탭 전환
        print("5. Switching to 2차 견적서 tab...")
        tab2_btn = page.locator('text=2차: AS 완료보고 및 통합 정산 견적서')
        await tab2_btn.click()
        await asyncio.sleep(0.5)

        path4 = os.path.join(ARTIFACT_DIR, "dispatch_04_modal_doc2.png")
        await page.screenshot(path=path4)
        print(f"Captured: {path4}")

        # 6. 공식 A4 서식 모드 전환
        print("6. Switching to A4 preview mode...")
        preview_mode_btn = page.locator('button:has-text("공식 A4 서식")')
        await preview_mode_btn.click()
        await asyncio.sleep(0.5)

        path5 = os.path.join(ARTIFACT_DIR, "dispatch_05_modal_a4_doc2_preview.png")
        await page.screenshot(path=path5)
        print(f"Captured: {path5}")

        # 7. 1차 문서 A4 서식 전환
        print("7. Switching to 1차 tab in A4 preview mode...")
        tab1_btn = page.locator('text=1차: 기술점검 확인 및 방문안내서')
        await tab1_btn.click()
        await asyncio.sleep(0.5)

        path6 = os.path.join(ARTIFACT_DIR, "dispatch_06_modal_a4_doc1_preview.png")
        await page.screenshot(path=path6)
        print(f"Captured: {path6}")

        await browser.close()
        print("All test steps passed and screenshots captured successfully!")

if __name__ == "__main__":
    asyncio.run(main())
