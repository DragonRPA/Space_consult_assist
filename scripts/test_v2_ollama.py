import requests
import json
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

payload = {
    "model": "space-slm-0.5b:v2",
    "prompt": "청소기 바닥에 물이 전혀 안 나와요.",
    "stream": False
}

print("Ollama space-slm-0.5b:v2 호출 테스트 중...")
resp = requests.post("http://localhost:11434/api/generate", json=payload, timeout=20)
print(f"상태 코드: {resp.status_code}")
if resp.status_code == 200:
    res = resp.json()
    print("응답 내용:")
    print(res.get("response", ""))
else:
    print(f"오류: {resp.text}")
