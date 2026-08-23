"""
Faster-Whisper Large-v3 Local GPU Acceleration Service
Space Advisor On-Premise STT Engine (RTX 5080 / CUDA 13.1)
"""

import os
import sys
import logging
from typing import Optional

# Register NVIDIA CUDA & CUDNN runtime DLL paths on Windows
if sys.platform == "win32":
    import site
    for sp in site.getsitepackages():
        for sub in ["nvidia/cublas/bin", "nvidia/cudnn/bin", "nvidia/cuda_nvrtc/bin"]:
            dll_dir = os.path.join(sp, sub.replace("/", os.sep))
            if os.path.isdir(dll_dir):
                try:
                    os.add_dll_directory(dll_dir)
                    os.environ["PATH"] = dll_dir + os.pathsep + os.environ.get("PATH", "")
                except Exception:
                    pass

logger = logging.getLogger("space_advisor.stt")
logging.basicConfig(level=logging.INFO)

_whisper_model = None

def get_whisper_model():
    """
    Lazy-loads the Faster-Whisper Large-v3 model on CUDA (RTX 5080).
    Falls back to CPU/int8 if CUDA is unavailable.
    """
    global _whisper_model
    if _whisper_model is not None:
        return _whisper_model

    try:
        import ctranslate2
        from faster_whisper import WhisperModel

        cuda_count = ctranslate2.get_cuda_device_count()
        device = "cuda" if cuda_count > 0 else "cpu"
        compute_type = "float16" if device == "cuda" else "int8"
        
        logger.info(f"⚡ [Faster-Whisper] Loading pre-cached large-v3-turbo on {device.upper()} (CUDA devices: {cuda_count}, compute: {compute_type})...")
        _whisper_model = WhisperModel(
            "large-v3-turbo",
            device=device,
            compute_type=compute_type,
        )
        logger.info("✅ [Faster-Whisper] Large-v3-Turbo model initialized successfully on RTX 5080 GPU!")
        return _whisper_model
    except Exception as e:
        logger.error(f"❌ [Faster-Whisper] GPU model initialization error: {e}", exc_info=True)
        return None
