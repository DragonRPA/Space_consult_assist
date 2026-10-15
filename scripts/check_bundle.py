import urllib.request
import re

req = urllib.request.Request('https://space-consult-assist.vercel.app/', headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req) as resp:
    html = resp.read().decode('utf-8')
    print('HTML length:', len(html))
    js_files = re.findall(r'src="([^"]+\.js)"', html)
    print('JS files:', js_files)
    if js_files:
        js_url = 'https://space-consult-assist.vercel.app' + js_files[0]
        req_js = urllib.request.Request(js_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req_js) as r_js:
            js_content = r_js.read().decode('utf-8', errors='ignore')
            print('JS length:', len(js_content))
            print('Contains doc1st:', 'doc1st' in js_content)
            print('Contains DispatchDocPackage:', 'DispatchDocPackage' in js_content)
            print('Contains siteWorkerName:', 'siteWorkerName' in js_content)
            print('Contains 원청 (비용결재/행정):', '원청 (비용결재/행정)' in js_content)
