import asyncio
import os
from playwright.async_api import async_playwright

ARTIFACT_DIR = r"C:\Users\이정용\.gemini\antigravity\brain\d1cd0a4e-25fa-4001-b755-61009a16b9c7"

async def run_clean_symptoms_test():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1600, "height": 900})
        page = await context.new_page()

        print("[1] 포트 5173 접속...")
        await page.goto("http://127.0.0.1:5173", wait_until="networkidle")
        await asyncio.sleep(2)

        # 1. 16개 표준 장애 유형 카드 그리드 전체 캡처
        shot_1 = os.path.join(ARTIFACT_DIR, "clean_01_grid_overview.png")
        await page.screenshot(path=shot_1)
        print(f"[OK] 1. 단일 순수 감각 현상 카드 그리드 캡처: {shot_1}")

        # 2. '세척수 미분사' (구 '세척수 미분사 / 노즐 막힘') 카드 클릭
        print("[2] '세척수 미분사' 카드 클릭...")
        spray_card = page.locator("[data-symptom-card='세척수 미분사']")
        await spray_card.click()
        await asyncio.sleep(1)

        shot_2 = os.path.join(ARTIFACT_DIR, "clean_02_spray_symptom.png")
        await page.screenshot(path=shot_2)
        print(f"[OK] 2. '세척수 미분사' 진단 워크스페이스 캡처: {shot_2}")

        # 3. '주행 구동 불가' (구 '주행 구동 불량 / 직진 쏠림') 카드 클릭 -> 복수 증상 탭 생성
        print("[3] '주행 구동 불가' 카드 클릭...")
        drive_card = page.locator("[data-symptom-card='주행 구동 불가']")
        await drive_card.click()
        await asyncio.sleep(1)

        shot_3 = os.path.join(ARTIFACT_DIR, "clean_03_drive_symptom.png")
        await page.screenshot(path=shot_3)
        print(f"[OK] 3. '주행 구동 불가' 멀티 탭 생성 캡처: {shot_3}")

        # 4. '배터리 조기 방전' (구 '배터리 조기 방전 / 수명 열화') 카드 클릭
        print("[4] '배터리 조기 방전' 카드 클릭 및 STEP 진행...")
        bat_card = page.locator("[data-symptom-card='배터리 조기 방전']")
        await bat_card.click()
        await asyncio.sleep(1)

        # STEP 1 불량 -> STEP 2로 전이
        await page.locator("button:has-text('다음 조치 STEP 2 시도')").first.click()
        await asyncio.sleep(1)

        shot_4 = os.path.join(ARTIFACT_DIR, "clean_04_battery_terminal.png")
        await page.screenshot(path=shot_4)
        print(f"[OK] 4. '배터리 조기 방전' STEP 2 진행 캡처: {shot_4}")

        await browser.close()
        print("\n=== 단일 순수 감각 현상 리팩토링 검증 완료 ===")

if __name__ == "__main__":
    asyncio.run(run_clean_symptoms_test())
