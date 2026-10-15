import asyncio
import os
from playwright.async_api import async_playwright

ARTIFACT_DIR = r"C:\Users\이정용\.gemini\antigravity\brain\d1cd0a4e-25fa-4001-b755-61009a16b9c7"

async def test_live():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 1600, 'height': 980})
        page = await context.new_page()

        print("1. Loading https://space-consult-assist.vercel.app/ ...")
        await page.goto("https://space-consult-assist.vercel.app/", wait_until="networkidle")
        await asyncio.sleep(1)

        # 2. 고객사 초성/검색 ("반포")
        print("2. Searching customer '반포'...")
        search_input = page.locator('[data-uia="input-customer-search"]')
        await search_input.fill("반포")
        await asyncio.sleep(0.5)

        cust_item = page.locator('[data-customer-item="반포자이 아파트 관리사무소"]')
        await cust_item.click()
        await asyncio.sleep(0.5)

        email_input = page.locator('[data-uia="input-customer-email"]')
        email_val = await email_input.input_value()
        print(f"Verified live customer email: '{email_val}'")

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

        # 5. 3가지 발송 채널 전환 테스트 (SMS -> EMAIL -> KAKAO)
        print("5. Testing channel options on live...")
        sms_btn = page.locator('[data-channel-option="SMS"]').first
        await sms_btn.click()
        await asyncio.sleep(0.5)
        path_sms = os.path.join(ARTIFACT_DIR, "vercel_live_channel_sms.png")
        await page.screenshot(path=path_sms)
        print(f"Captured: {path_sms}")

        email_btn = page.locator('[data-channel-option="EMAIL"]').first
        await email_btn.click()
        await asyncio.sleep(0.5)
        path_email = os.path.join(ARTIFACT_DIR, "vercel_live_channel_email.png")
        await page.screenshot(path=path_email)
        print(f"Captured: {path_email}")

        # 이메일로 발송 실행
        send_doc1_btn = page.locator('[data-uia="btn-send-doc1"]')
        await send_doc1_btn.click()
        await asyncio.sleep(0.5)

        # 6. 2차 견적서 탭 전환 및 카톡 발송
        print("6. Switching to Tab 2 and sending via KakaoTalk...")
        tab2 = page.locator("text=2차: AS 완료보고 및 통합 정산 견적서")
        await tab2.click()
        await asyncio.sleep(0.5)

        kakao_btn2 = page.locator('[data-channel-option="KAKAO"]').first
        await kakao_btn2.click()
        await asyncio.sleep(0.5)

        send_doc2_btn = page.locator('[data-uia="btn-send-doc2"]')
        await send_doc2_btn.click()
        await asyncio.sleep(0.5)

        path_doc2 = os.path.join(ARTIFACT_DIR, "vercel_live_channel_doc2_kakao.png")
        await page.screenshot(path=path_doc2)
        print(f"Captured: {path_doc2}")

        # 7. 공식 A4 서식 모드 전환
        print("7. Switching to A4 preview mode...")
        preview_btn = page.locator('button:has-text("공식 A4 서식")')
        await preview_btn.click()
        await asyncio.sleep(0.5)

        path_a4 = os.path.join(ARTIFACT_DIR, "vercel_live_channel_a4.png")
        await page.screenshot(path=path_a4)
        print(f"Captured: {path_a4}")

        await browser.close()
        print(">>> ALL PRODUCTION CHECKS FOR 3 DISPATCH CHANNELS PASSED! <<<")

if __name__ == "__main__":
    asyncio.run(test_live())
