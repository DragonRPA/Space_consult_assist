import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import text
import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL is not set")

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

PART_CODES = [
    ("SALES_INQUIRY", "일반영업상담"),
    ("SCHEDULE_DELIVERY", "납품/회수/일정조율"),
    ("SUCTION", "흡입불량/호스막힘"),
    ("POWER", "배터리/전원/충전기불량"),
    ("INQUIRY_ETC", "단순문의/업무무관"),
    ("DRIVE_BRUSH", "브러시/구동불량"),
    ("IRRELEVANT", "비업무/스팸"),
    ("WATER_SOLENOID", "누수/솔레노이드"),
    ("CHASSIS", "외관파손"),
    ("WATER_NO_FLOW", "청수안나옴"),
    ("BRUSH_WIRE", "브러시와이어불량"),
    ("BRUSH_COVER", "브러시커버파손"),
    ("FORWARD_FAIL", "전진불량"),
    ("WATER_SUPPLY_FAIL", "급수불량"),
    ("BRUSH_FAIL", "브러시작동불량"),
    ("CHARGER_FAIL", "충전기고장"),
    ("POWER_FAIL", "전원안켜짐"),
    ("CHARGE_INDICATOR", "충전표시등불량"),
]

async def seed():
    async with AsyncSessionLocal() as session:
        for code, desc in PART_CODES:
            await session.execute(
                text("INSERT INTO part_codes (code, description) VALUES (:code, :desc) ON CONFLICT (code) DO NOTHING"),
                {"code": code, "desc": desc}
            )
        await session.commit()
        print(f"Successfully seeded {len(PART_CODES)} part codes.")

if __name__ == "__main__":
    asyncio.run(seed())
