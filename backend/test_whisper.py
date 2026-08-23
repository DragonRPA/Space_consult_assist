import traceback
try:
    from faster_whisper import WhisperModel
    print("1. faster_whisper imported successfully.")
    
    # Check CTranslate2 CUDA support
    import ctranslate2
    print("2. ctranslate2 version:", ctranslate2.__version__)
    cuda_devices = ctranslate2.get_cuda_device_count()
    print("3. ctranslate2 CUDA devices:", cuda_devices)
    
    device = "cuda" if cuda_devices > 0 else "cpu"
    compute_type = "float16" if device == "cuda" else "int8"
    print(f"4. Initializing WhisperModel on {device} ({compute_type})...")
    
    # Try small or large-v3
    model = WhisperModel("small", device=device, compute_type=compute_type)
    print("5. WhisperModel initialized successfully!")
    
except Exception as e:
    print("ERROR:")
    traceback.print_exc()
