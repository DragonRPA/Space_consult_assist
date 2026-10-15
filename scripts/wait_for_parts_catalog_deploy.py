import urllib.request
import time
import re

print("Monitoring Vercel production deployment for commit 9b5da4f...")

for i in range(25):
    try:
        req = urllib.request.Request('https://space-consult-assist.vercel.app/', headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=10) as resp:
            html = resp.read().decode('utf-8')
            js_files = re.findall(r'src="([^"]+\.js)"', html)
            if js_files:
                js_url = 'https://space-consult-assist.vercel.app' + js_files[0]
                req_js = urllib.request.Request(js_url, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req_js, timeout=10) as r_js:
                    js_text = r_js.read().decode('utf-8', errors='ignore')
                    has_parts_catalog = 'parts_catalog' in js_text and 'btn-submit-parts-order' in js_text
                    print(f"Attempt {i+1}: {js_files[0]} -> has parts_catalog: {has_parts_catalog}")
                    if has_parts_catalog:
                        print("🎉 Vercel production successfully deployed new bundle with parts_catalog & online shopping features!")
                        break
    except Exception as e:
        print(f"Attempt {i+1} exception: {e}")
    time.sleep(5)
