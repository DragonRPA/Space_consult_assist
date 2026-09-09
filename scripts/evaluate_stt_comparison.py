import os
import sys
import json
import time
import torch
import soundfile as sf
from transformers import WhisperProcessor, WhisperForConditionalGeneration
import jiwer

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

BASE_MODEL = "openai/whisper-tiny"
MERGED_MODEL = r"d:\01.AntiGravity\Space_consult_assist\scripts\merged_whisper_tiny"
TEST_JSON = r"d:\01.AntiGravity\Space_consult_assist\scripts\stt_data\test_stt.json"

print("==================================================================")
print("  ⚖️ [트랙 1 실증] 원본 Whisper-Tiny vs 한국어 특화 Whisper-Tiny 비교")
print("==================================================================")

with open(TEST_JSON, "r", encoding="utf-8") as f:
    test_samples = json.load(f)[:10]  # 대표 10건

# 1. 모델 로드
print("📦 [1/2] 원본 Whisper-Tiny 로딩 중...")
processor_base = WhisperProcessor.from_pretrained(BASE_MODEL, language="korean", task="transcribe")
model_base = WhisperForConditionalGeneration.from_pretrained(
    BASE_MODEL, dtype=torch.float16, device_map="cuda"
)

print(f"📦 [2/2] 한국어 특화 파인튜닝 Whisper-Tiny 로딩 중: {MERGED_MODEL} ...")
processor_ft = WhisperProcessor.from_pretrained(MERGED_MODEL, language="korean", task="transcribe")
model_ft = WhisperForConditionalGeneration.from_pretrained(
    MERGED_MODEL, dtype=torch.float16, device_map="cuda"
)

def transcribe(model, processor, wav_path):
    waveform, sr = sf.read(wav_path)
    if len(waveform.shape) > 1:
        waveform = waveform.mean(axis=1)
    waveform = waveform.astype("float32")

    inputs = processor(waveform, sampling_rate=16000, return_tensors="pt").to("cuda")
    
    t0 = time.time()
    with torch.no_grad():
        forced_ids = processor.get_decoder_prompt_ids(language="korean", task="transcribe")
        pred_ids = model.generate(
            inputs.input_features.to(torch.float16),
            forced_decoder_ids=forced_ids,
            max_new_tokens=128
        )
    latency_ms = (time.time() - t0) * 1000
    text = processor.batch_decode(pred_ids, skip_special_tokens=True)[0].strip()
    return text, latency_ms

print(f"\n🎯 테스트 샘플 {len(test_samples)}건 1:1 비교 전사 시작...\n")

results = []
base_cers = []
ft_cers = []
base_times = []
ft_times = []

for idx, item in enumerate(test_samples, 1):
    wav_path = item["audio_path"]
    truth = item["sentence"]
    
    text_base, time_base = transcribe(model_base, processor_base, wav_path)
    text_ft, time_ft = transcribe(model_ft, processor_ft, wav_path)
    
    cer_base = jiwer.cer(truth, text_base) * 100
    cer_ft = jiwer.cer(truth, text_ft) * 100
    
    base_cers.append(cer_base)
    ft_cers.append(cer_ft)
    base_times.append(time_base)
    ft_times.append(time_ft)
    
    results.append({
        "idx": idx,
        "truth": truth,
        "base_text": text_base,
        "ft_text": text_ft,
        "cer_base": round(cer_base, 1),
        "cer_ft": round(cer_ft, 1)
    })
    
    print(f"------------------------------------------------------------------")
    print(f"[{idx:02d}/10] 오디오: {os.path.basename(wav_path)}")
    print(f"  📖 [실제 정답]: {truth}")
    print(f"  ⚪ [원본 Tiny]: {text_base} (CER: {cer_base:.1f}%, {time_base:.0f}ms)")
    print(f"  🟢 [특화 Tiny]: {text_ft} (CER: {cer_ft:.1f}%, {time_ft:.0f}ms)")

avg_base_cer = sum(base_cers) / len(base_cers)
avg_ft_cer = sum(ft_cers) / len(ft_cers)
avg_base_t = sum(base_times) / len(base_times)
avg_ft_t = sum(ft_times) / len(ft_times)

print("\n==================================================================")
print("  📊 Whisper-Tiny 한국어 파인튜닝 비교 실증 최종 결과")
print("==================================================================")
print(f"- 원본 Whisper-Tiny    : 평균 음절오류율(CER) {avg_base_cer:.1f}% | 평균 속도 {avg_base_t:.1f}ms")
print(f"- 한국어 특화 Whisper-Tiny : 평균 음절오류율(CER) {avg_ft_cer:.1f}% | 평균 속도 {avg_ft_t:.1f}ms")
print(f"- 오인식 개선율        : {avg_base_cer - avg_ft_cer:+.1f}%p 개선")
print("==================================================================")
