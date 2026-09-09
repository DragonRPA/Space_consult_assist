import httpx
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

res = httpx.post("http://localhost:11434/api/generate", json={
    "model": "space-slm-0.5b",
    "prompt": "hello",
    "stream": False
}, timeout=30.0)

print("Status:", res.status_code)
print("Response text:", res.text)
