import json
import os
import sys
import time
import httpx

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

# Space Consult Assist — 파인튜닝된 커스텀 SLM 종합 벤치마크 평가기

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEST_PATH = os.path.join(BASE_DIR, "scripts", "dataset_test.jsonl")
OLLAMA_URL = "http://localhost:11434/api/generate"

def run_evaluation(model_name="space-slm-0.5b", sample_count=50):
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

    print(f"\n=======================================================")
    print(f"[커스텀 모델 벤치마크 평가: {model_name}]")
    print(f"- 테스트셋: {len(test_samples)}건 (Holdout Test Set)")
    print(f"- 대상 엔드포인트: {OLLAMA_URL}")
    print(f"=======================================================\n")

    latencies = []
    correct_pcode = 0
    valid_json_count = 0
    results = []

    client = httpx.Client(timeout=30.0)

    for idx, sample in enumerate(test_samples, 1):
        messages = sample["messages"]
        system_content = messages[0]["content"]
        user_content = messages[1]["content"]
        expected = json.loads(messages[2]["content"])
        expected_pcode = expected["part_code"]
        expected_kw = expected["keyword"]

        # 파인튜닝 모델은 단축 프롬프트로도 동작
        prompt = f"""고객 발화: "{user_content}"
반드시 다음 JSON 형식으로만 답하세요:
{{"keyword": "증상 키워드", "part_code": "부품코드"}}
"""

        start_t = time.time()
        try:
            res = client.post(OLLAMA_URL, json={
                "model": model_name,
                "prompt": prompt,
                "stream": False,
                "format": "json",
                "options": {
                    "temperature": 0.1,
                    "top_p": 0.9
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
                    
                    mark = "[O] 일치" if is_match else "[X] 불일치"
                    print(f"[{idx:02d}] {mark} {elapsed_ms:3d}ms | 입력: {user_content[:28]}...")
                    print(f"     정답: [{expected_pcode}] | 예측: [{pred_pcode}] (키워드: {pred_kw})")
                    
                    results.append({
                        "id": idx,
                        "latency_ms": elapsed_ms,
                        "matched": is_match,
                        "expected": expected_pcode,
                        "predicted": pred_pcode
                    })
                except Exception as parse_err:
                    print(f"[{idx:02d}] [파싱오류] {elapsed_ms:3d}ms | 응답: {raw_resp[:40]} | 에러: {parse_err}")
            else:
                print(f"[{idx:02d}] [HTTP {res.status_code}] 에러 발생")
        except Exception as net_err:
            print(f"[{idx:02d}] [통신 오류] {net_err}")

    client.close()

    avg_lat = sum(latencies) / len(latencies) if latencies else 0
    acc = (correct_pcode / len(test_samples)) * 100 if test_samples else 0
    json_rate = (valid_json_count / len(test_samples)) * 100 if test_samples else 0

    print("\n" + "=" * 55)
    print(f"=== [최종 평가 결과 리포트: {model_name}] ===")
    print(f"- 검증 건수: {len(test_samples)}건")
    print(f"- 평균 응답 시간: {avg_lat:.1f} ms")
    print(f"- 최소 / 최대 시간: {min(latencies) if latencies else 0} ms / {max(latencies) if latencies else 0} ms")
    print(f"- 부품코드 정확도(Hit Rate): {correct_pcode}/{len(test_samples)} ({acc:.1f}%)")
    print(f"- JSON 파싱 무결성: {valid_json_count}/{len(test_samples)} ({json_rate:.1f}%)")
    print("=" * 55)

if __name__ == "__main__":
    import sys
    target_model = sys.argv[1] if len(sys.argv) > 1 else "space-slm-0.5b"
    count = int(sys.argv[2]) if len(sys.argv) > 2 else 50
    run_evaluation(target_model, count)
