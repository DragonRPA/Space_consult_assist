import os
import sys
import ctypes

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

def get_short_path(long_path: str) -> str:
    """Windows 8.3 짧은 경로(Short Path)로 변환 (한글 및 MAX_PATH 260자 버그 원천 해결)"""
    try:
        buffer = ctypes.create_unicode_buffer(1024)
        result = ctypes.windll.kernel32.GetShortPathNameW(long_path, buffer, 1024)
        if result > 0:
            return buffer.value
    except Exception:
        pass
    return long_path

torch_lib = r"C:\Users\이정용\AppData\Local\Programs\Python\Python311\Lib\site-packages\torch\lib"
short_lib = get_short_path(torch_lib)
print(f"원본 경로: {torch_lib}")
print(f"단축 경로: {short_lib}")
print(f"단축 경로 존재 여부: {os.path.exists(short_lib)}")
