import requests

url = "http://localhost:11434/api/generate"

for model_name in ["qwen2.5:0.5b", "gemma3:12b"]:
    payload = {
        "model": model_name,
        "prompt": "안녕? 한 문장으로 대답해줘.",
        "stream": False
    }
    try:
        r = requests.post(url, json=payload, timeout=15)
        print(f"[{model_name}] Status code:", r.status_code)
        if r.status_code == 200:
            print(f"[{model_name}] Response:", r.json().get("response", "")[:100].strip())
        else:
            print(f"[{model_name}] Error text:", r.text)
    except Exception as e:
        print(f"[{model_name}] Error:", e)
