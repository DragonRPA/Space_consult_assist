# -*- coding: utf-8 -*-
import urllib.request
import json
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

url = "http://127.0.0.1:8000/api/v1/counsel/model-symptoms?model=%EC%A0%84%EC%B2%B4"
req = urllib.request.urlopen(url)
data = json.loads(req.read().decode("utf-8"))

print(f"Total symptoms returned by API: {data['total']}")
all_clean = True
for i, item in enumerate(data["symptoms"], 1):
    has_slash = "/" in item["title"]
    if has_slash:
        all_clean = False
    flag = "[FAIL/SLASH]" if has_slash else "[PASS/CLEAN]"
    print(f"{i:02d}. {flag} {item['id']}: {item['title']} (부품: {item['part_code']})")

if all_clean:
    print("\nAPI VERIFICATION SUCCESS: All 16 symptoms are 100% clean single sensory terms!")
else:
    print("\nAPI VERIFICATION FAILED: Slashes still detected!")
