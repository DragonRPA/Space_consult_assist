import asyncio, httpx, os, sys
sys.path.insert(0, os.path.abspath('backend'))
from app.main import app

async def test_compare():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url='http://testserver') as client:
        # 1. 헬스체크
        r_health = await client.get('/health')
        print('Health:', r_health.status_code, r_health.json())

        # 2. kb-compare API 테스트 (bge vs openai)
        print('Testing /api/v1/counsel/kb-compare...')
        r = await client.post('/api/v1/counsel/kb-compare', json={'text': '물이 줄줄 새고 바닥에 물기가 남아요', 'limit': 3})
        print('kb-compare status:', r.status_code)
        if r.status_code == 200:
            data = r.json()
            print('Query:', data.get('query'))
            print('Local Engine:', data.get('local_engine'))
            print('Local Ready:', data.get('nomic_ready'), 'Count:', data.get('local_count'))
            print('OpenAI Ready:', data.get('openai_ready'), 'Count:', data.get('openai_count'))
            local_items = data.get('nomic_results', [])
            print(f'Local ({data.get("local_engine")}) Results Count: {len(local_items)}')
            for idx, item in enumerate(local_items):
                print(f'  [Local #{idx+1}] {item.get("summary")[:40]} (sim: {item.get("similarity")})')
            openai_items = data.get('openai_results', [])
            print(f'OpenAI Results Count: {len(openai_items)}')
            for idx, item in enumerate(openai_items):
                print(f'  [OpenAI #{idx+1}] {item.get("summary")[:40]} (sim: {item.get("similarity")})')
        else:
            print('Error response:', r.text)

if __name__ == '__main__':
    asyncio.run(test_compare())
