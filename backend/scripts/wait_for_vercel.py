import time
import urllib.request
import re

print("Polling Vercel deployment...")
for i in range(15):
    time.sleep(4)
    req = urllib.request.Request("https://space-consult-assist.vercel.app/", headers={"User-Agent": "Mozilla/5.0"})
    html = urllib.request.urlopen(req).read().decode("utf-8")
    m = re.search(r'href=[\'"](/assets/index-[^\'"]+\.css)[\'"]', html)
    bundle = m.group(1) if m else "None"
    print(f"Check {i+1}: {bundle}")
    if "x2u3xm4Q" in bundle:
        print("Success: New bundle deployed on Vercel!")
        break
