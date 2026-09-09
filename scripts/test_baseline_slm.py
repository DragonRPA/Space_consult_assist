import json
import os
import time
import httpx

# Space Consult Assist — Qwen2.5-0.5B Baseline 벤치마크 테스트

TEST_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dataset_test.jsonl")
OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "qwen2.5:0.5b"

def run_baseline_test(sample_count=20):
    if not os.path.exists(TEST_PATH):
        print(f"Test dataset not found: {TEST_PATH}")
        return

    test_samples = []
    with open(TEST_PATH, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                test_samples.append(json.loads(line))
            if len(test_samples) >= sample_count:
                break

    print(f"=== Qwen2.5-0.5B 순정 모델 Zero-shot 벤치마크 (샘플 {len(test_samples)}건) ===")
    print(f"Ollama Target: {OLLAMA_URL} | Model: {MODEL_NAME}\n")

    latencies = []
    correct_pcode = 0
    valid_json_count = 0

    client = httpx.Client(timeout=30.0)

    for idx, sample in enumerate(test_samples, 1):
        messages = sample["messages"]
        system_content = messages[0]["content"]
        user_content = messages[1]["content"]
        expected = json.loads(messages[2]["content"])
        expected_pcode = expected["part_code"]

        prompt = f"""{system_content}

고객 발화: "{user_content}"
반드시 다음 JSON 형식으로만 답하세요:
{{"keyword": "증상 키워드", "part_code": "부품코드"}}
"""

        start_t = time.time()
        try:
            res = client.post(OLLAMA_URL, json={
                "model": MODEL_NAME,
                "prompt": prompt,
                "stream": False,
                "format": "json",
                "options": {
                    "temperature": 0.1
                }
            })
            elapsed_ms = int((time.time() - start_t) * 1000)
            latencies.append(elapsed_ms)

            if res.status_code == 200:
                raw_resp = res.json().get("response", "{}").strip()
                try:
                    parsed = json.loads(raw_resp)
                    valid_json_count += 1
                    pred_pcode = parsed.get("part_code", "")
                    pred_kw = parsed.get("keyword", "")
                    
                    is_match = (pred_pcode == expected_pcode)
                    if is_match:
                        correct_pcode += 1
                    
                    mark = "O" if is_match else "X"
                    print(f"[{idx:02d}] [{mark}] {elapsed_ms:3d}ms | 입력: {user_content[:30]}...")
                    print(f"     정답: {expected_pcode} | 예측: {pred_pcode} (키워드: {pred_kw})")
                except Exception as parse_err:
                    print(f"[{idx:02d}] [E] {elapsed_ms:3d}ms | JSON 파싱 실패: {raw_resp[:40]} | 에러: {parse_err}")
            else:
                print(f"[{idx:02d}] [HTTP {res.status_code}] 에러 발생")
        except Exception as net_err:
            print(f"[{idx:02d}] [REQ ERR] {net_err}")

    client.close()

    avg_lat = sum(latencies) / len(latencies) if latencies else 0
    acc = (correct_pcode / len(test_samples)) * 100 if test_samples else 0
    json_rate = (valid_json_count / len(test_samples)) * 100 if test_samples else 0

    print("\n" + "=" * 50)
    print("=== [결과 요약: Qwen2.5-0.5B 순정 모델] ===")
    print(f"- 총 테스트 건수: {len(test_samples)}건")
    print(f"- 평균 응답 지연시간: {avg_lat:.1f} ms")
    print(f"- 최소/최대 지연시간: {min(latencies)} ms / {max(latencies)} ms")
    print(f"- 부품코드 정확도: {correct_pcode}/{len(test_samples)} ({acc:.1f}%)")
    print(f"- JSON 무결성 준수율: {valid_json_count}/{len(test_samples)} ({json_rate:.1f}%)")
    print("=" * 50)

if __name__ == "__main__":
    run_baseline_test(sample_count=20)
