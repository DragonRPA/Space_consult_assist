import sys
import os
import asyncio

# Windows에서 psycopg3 비동기 지원을 위해 SelectorEventLoop 강제 적용
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

import uvicorn
from app.main import app

def start():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    config = uvicorn.Config(
        app,
        host="127.0.0.1",
        port=8000,
        loop="asyncio",
        log_level="info",
        reload=False
    )
    server = uvicorn.Server(config)
    loop.run_until_complete(server.serve())

if __name__ == "__main__":
    start()
