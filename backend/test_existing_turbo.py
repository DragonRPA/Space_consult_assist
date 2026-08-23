import time
from faster_whisper import WhisperModel

print("Loading WhisperModel('large-v3-turbo', device='cuda', compute_type='float16')...")
start = time.time()
model = WhisperModel("large-v3-turbo", device="cuda", compute_type="float16")
elapsed = time.time() - start

print(f"✅ Loaded Large-v3-Turbo on RTX 5080 in {elapsed:.2f} seconds!")

# Transcribe sample audio
audio_path = r"D:\스페이스_테스트\completed_audio\20180503_134215_01033197280.m4a"
print(f"Transcribing {audio_path}...")
t_start = time.time()
segments, info = model.transcribe(audio_path, language="ko", beam_size=5)
for seg in segments:
    print(f"[{seg.start:.2f}s -> {seg.end:.2f}s] {seg.text}")
print(f"🎉 Total transcription time: {time.time() - t_start:.2f}s (Audio Duration: {info.duration:.2f}s)")
