import os
import sys
import time

if sys.platform == "win32":
    import site
    for sp in site.getsitepackages():
        for sub in ["nvidia/cublas/bin", "nvidia/cudnn/bin", "nvidia/cuda_nvrtc/bin"]:
            dll_dir = os.path.join(sp, sub.replace("/", os.sep))
            if os.path.isdir(dll_dir):
                try:
                    os.add_dll_directory(dll_dir)
                    os.environ["PATH"] = dll_dir + os.pathsep + os.environ.get("PATH", "")
                    print(f"Added DLL directory: {dll_dir}")
                except Exception as e:
                    print(f"Failed to add {dll_dir}: {e}")

from faster_whisper import WhisperModel
import ctranslate2

print(f"CTranslate2 CUDA device count: {ctranslate2.get_cuda_device_count()}")

print("Initializing Large-v3-Turbo on CUDA (float16)...")
model = WhisperModel("large-v3-turbo", device="cuda", compute_type="float16")
print("Model loaded successfully!")

audio_path = r"D:\스페이스_테스트\completed_audio\20180503_134215_01033197280.m4a"
print(f"Transcribing {audio_path}...")
start = time.time()
segments, info = model.transcribe(audio_path, language="ko", beam_size=5)
for s in segments:
    print(f"[{s.start:.2f}s -> {s.end:.2f}s] {s.text}")
print(f"Transcribed {info.duration:.2f}s audio in {time.time() - start:.2f}s on RTX 5080!")
