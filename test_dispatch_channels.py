import asyncio
import http.server
import os
import socket
import socketserver
import threading
from playwright.async_api import async_playwright

def get_free_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]

PORT = get_free_port()
DIST_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "frontend", "dist"))
ARTIFACT_DIR = r"C:\Users\이정용\.gemini\antigravity\brain\d1cd0a4e-25fa-4001-b755-61009a16b9c7"

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIST_DIR, **kwargs)

def start_server(port):
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("127.0.0.1", port), Handler) as httpd:
        httpd.serve_forever()

async def main():
    server_thread = threading.Thread(target=start_server, args=(PORT,), daemon=True)
    server_thread.start()
    print(f"Static HTTP server started at http://127.0.0.1:{PORT} serving {DIST_DIR}")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 1600, 'height': 980})
        page = await context.new_page()

        # 1. 메인 진입
        print(f"1. Loading http://127.0.0.1:{PORT}/ ...")
        await page.goto(f"http://127.0.0.1:{PORT}/", wait_until="networkidle")
        await asyncio.sleep(1)

        # 2. 고객사 초성/검색 ("반포")
        print("2. Searching customer '반포'...")
        search_input = page.locator('[data-uia="input-customer-search"]')
        await search_input.fill("반포")
        await asyncio.sleep(0.5)

        # 드롭다운에서 선택
        cust_item = page.locator('[data-customer-item="반포자이 아파트 관리사무소"]')
        await cust_item.click()
        await asyncio.sleep(0.5)

        # 이메일 확인
        email_input = page.locator('[data-uia="input-customer-email"]')
        email_val = await email_input.input_value()
        print(f"Customer email populated: '{email_val}'")

        # 3. 증상 선택 (첫 번째 증상 클릭)
        print("3. Selecting symptom...")
        symptom_chip = page.locator('[data-symptom-card]').first
        if await symptom_chip.count() > 0:
            await symptom_chip.click()
        else:
            await page.locator('text=잔수 흡입 불량 및 오수 유출').first.click()
        await asyncio.sleep(0.5)

        # 4. AS 출장 접수 버튼 클릭 -> 모달 오픈
        print("4. Clicking AS 출장 접수...")
        visit_btn = page.locator('[data-uia="btn-save-visit"]')
        await visit_btn.click()
        await asyncio.sleep(1)

        # 5. 1차 문서 발송 수단 3가지 전환 테스트
        print("5. Testing 3 channel options on Doc 1...")
        # (1) 카톡 기본 상태 확인
        path_kakao = os.path.join(ARTIFACT_DIR, "dispatch_channel_01_doc1_kakao.png")
        await page.screenshot(path=path_kakao)
        print(f"Captured: {path_kakao}")

        # (2) 문자메세지로 보내기 클릭
        print("   - Clicking 문자메세지로 보내기...")
        sms_btn = page.locator('[data-channel-option="SMS"]').first
        await sms_btn.click()
        await asyncio.sleep(0.5)
        path_sms = os.path.join(ARTIFACT_DIR, "dispatch_channel_02_doc1_sms.png")
        await page.screenshot(path=path_sms)
        print(f"Captured: {path_sms}")

        # (3) 이메일로 보내기 클릭
        print("   - Clicking 이메일로 보내기...")
        email_btn = page.locator('[data-channel-option="EMAIL"]').first
        await email_btn.click()
        await asyncio.sleep(0.5)
        path_email = os.path.join(ARTIFACT_DIR, "dispatch_channel_03_doc1_email.png")
        await page.screenshot(path=path_email)
        print(f"Captured: {path_email}")

        # 1차 문서 이메일 발송 실행
        send_doc1_btn = page.locator('[data-uia="btn-send-doc1"]')
        await send_doc1_btn.click()
        await asyncio.sleep(0.5)

        # 6. 2차 통합문서 탭 전환
        print("6. Switching to 2차 견적서 tab...")
        tab2_btn = page.locator('text=2차: AS 완료보고 및 통합 정산 견적서')
        await tab2_btn.click()
        await asyncio.sleep(0.5)

        # 2차 문서에서 카톡 선택 후 발송
        kakao_btn_doc2 = page.locator('[data-channel-option="KAKAO"]').first
        await kakao_btn_doc2.click()
        await asyncio.sleep(0.5)

        send_doc2_btn = page.locator('[data-uia="btn-send-doc2"]')
        await send_doc2_btn.click()
        await asyncio.sleep(0.5)
        path_doc2_sent = os.path.join(ARTIFACT_DIR, "dispatch_channel_04_doc2_sent.png")
        await page.screenshot(path=path_doc2_sent)
        print(f"Captured: {path_doc2_sent}")

        # 7. 공식 A4 서식 모드 전환
        print("7. Switching to A4 preview mode...")
        preview_mode_btn = page.locator('button:has-text("공식 A4 서식")')
        await preview_mode_btn.click()
        await asyncio.sleep(0.5)

        path_a4_doc2 = os.path.join(ARTIFACT_DIR, "dispatch_channel_05_a4_doc2.png")
        await page.screenshot(path=path_a4_doc2)
        print(f"Captured: {path_a4_doc2}")

        # 8. 1차 문서 A4 서식 확인
        print("8. Switching to 1차 tab in A4 preview mode...")
        tab1_btn = page.locator('text=1차: 기술점검 확인 및 방문안내서')
        await tab1_btn.click()
        await asyncio.sleep(0.5)

        path_a4_doc1 = os.path.join(ARTIFACT_DIR, "dispatch_channel_06_a4_doc1.png")
        await page.screenshot(path=path_a4_doc1)
        print(f"Captured: {path_a4_doc1}")

        await browser.close()
        print("ALL DISPATCH CHANNEL TESTS COMPLETED SUCCESSFULLY!")

if __name__ == "__main__":
    asyncio.run(main())
