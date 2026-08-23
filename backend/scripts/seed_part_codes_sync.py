import psycopg
import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

DATABASE_URL = os.getenv("DATABASE_URL_MIGRATION")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL_MIGRATION is not set")

# convert postgresql+psycopg:// to postgresql://
if DATABASE_URL.startswith("postgresql+psycopg://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql+psycopg://", "postgresql://", 1)

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

def seed():
    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            for code, desc in PART_CODES:
                cur.execute(
                    "INSERT INTO part_codes (code, description) VALUES (%s, %s) ON CONFLICT (code) DO NOTHING",
                    (code, desc)
                )
            conn.commit()
            print(f"Successfully seeded {len(PART_CODES)} part codes.")

if __name__ == "__main__":
    seed()
