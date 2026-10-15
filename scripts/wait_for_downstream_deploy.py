import urllib.request
import re
import time

expected_js = 'index-Wbq5Pt6G.js'
print(f"Waiting for Vercel deployment with JS: {expected_js}...")

for i in range(18):
    try:
        req = urllib.request.Request(
            'https://space-consult-assist.vercel.app/',
            headers={'User-Agent': 'Mozilla/5.0', 'Cache-Control': 'no-cache'}
        )
        html = urllib.request.urlopen(req, timeout=10).read().decode('utf-8')
        m = re.search(r'src=[\'"](/assets/index-[^\'"]+\.js)[\'"]', html)
        current_js = m.group(1) if m else 'None'
        print(f"[{i+1}/18] Current live JS: {current_js}")
        if expected_js in current_js:
            print("🎉 Vercel production deployment is LIVE with the new build!")
            break
    except Exception as e:
        print(f"[{i+1}/18] Request error: {e}")
    time.sleep(5)
