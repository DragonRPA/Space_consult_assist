import os
import sys
import traceback

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

print("=== PATH 길이 진단 ===")
path_val = os.environ.get("PATH", "")
print(f"PATH 길이: {len(path_val)} 문자")

print("\n=== os.add_dll_directory 테스트 ===")
torch_lib = r"C:\Users\이정용\AppData\Local\Programs\Python\Python311\Lib\site-packages\torch\lib"
print(f"torch_lib 존재 여부: {os.path.exists(torch_lib)}")
try:
    os.add_dll_directory(torch_lib)
    print("os.add_dll_directory 성공!")
except Exception as e:
    print(f"os.add_dll_directory 실패: {type(e).__name__}: {e}")
    traceback.print_exc()

print("\n=== import torch 테스트 ===")
try:
    import torch
    print(f"torch 로드 성공: {torch.__version__}")
except Exception as e:
    print(f"torch 로드 실패: {type(e).__name__}: {e}")
    traceback.print_exc()

print("\n=== STTEngine load_models_once 테스트 ===")
sys.path.insert(0, r"d:\01.AntiGravity\Space_consult_assist\tools\ConsultParser")
try:
    from core.stt_engine import STTEngine
    engine = STTEngine(whisper_model="custom-tiny-ko", device_setting="cuda")
    engine.load_models_once()
    print("STTEngine load_models_once 성공!")
except Exception as e:
    print(f"STTEngine load_models_once 실패: {type(e).__name__}: {e}")
    traceback.print_exc()
