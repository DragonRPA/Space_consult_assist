import time
from app.services.stt_service import transcribe_audio_file

audio_path = r"D:\스페이스_테스트\completed_audio\20180503_134215_01033197280.m4a"
print(f"Loading {audio_path}...")
with open(audio_path, "rb") as f:
    data = f.read()

print(f"Sending {len(data):,} bytes to Faster-Whisper Large-v3 on RTX 5080...")
start = time.time()
result = transcribe_audio_file(data, filename="20180503_134215_01033197280.m4a")
elapsed = time.time() - start

print(f"\n=======================================================")
print(f"  ⚡ Transcribed in {elapsed:.2f} seconds! (Engine: {result.get('engine')})")
print(f"  Duration: {result.get('duration')}s")
print(f"=======================================================")
print(result.get("full_transcript"))
print(f"=======================================================")
