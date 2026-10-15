import asyncio
from sqlalchemy import text
from app.core.database import AsyncSessionLocal

async def check():
    try:
        async with AsyncSessionLocal() as s:
            r = await s.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'customers'"))
            cols = r.fetchall()
            print("Columns in customers table:")
            for col in cols:
                print(f" - {col[0]}: {col[1]}")
            
            r3 = await s.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'assets'"))
            print("\nColumns in assets table:")
            for col in r3.fetchall():
                print(f" - {col[0]}: {col[1]}")
    except Exception as e:
        print("Error querying customers:", e)

if __name__ == "__main__":
    import sys
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(check())
