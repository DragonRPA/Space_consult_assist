import urllib.request
import time
import re

print("Waiting 15s for Vercel deployment of commit 6c41389...")
time.sleep(15)

for i in range(15):
    try:
        req = urllib.request.Request('https://space-consult-assist.vercel.app/', headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as resp:
            html = resp.read().decode('utf-8')
            js_files = re.findall(r'src="([^"]+\.js)"', html)
            if js_files:
                js_url = 'https://space-consult-assist.vercel.app' + js_files[0]
                req_js = urllib.request.Request(js_url, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req_js) as r_js:
                    js_text = r_js.read().decode('utf-8', errors='ignore')
                    has_channel = 'data-channel-option' in js_text
                    print(f"Attempt {i+1}: {js_files[0]} -> has data-channel-option: {has_channel}")
                    if has_channel:
                        print("Vercel production successfully updated with 3-channel dispatch feature!")
                        break
    except Exception as e:
        print(f"Attempt {i+1} err: {e}")
    time.sleep(5)
