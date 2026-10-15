# -*- coding: utf-8 -*-
import urllib.request
import json
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

res = urllib.request.urlopen("http://127.0.0.1:8000/api/v1/counsel/official-error-codes")
data = json.loads(res.read().decode("utf-8"))
print(f"Total official codes: {data['total']}")
for c in data["codes"]:
    print(f"  • [{c['code']}] {c['name']} ({c['category']}) -> {c['resolution_type']} | {c['meaning']}")
