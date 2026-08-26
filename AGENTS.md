# Space Consult Assist - Project Rules

## 🚫 [CRITICAL] STT 엔진 오디오 파일 직접 전송 금지 정책 (Zero Batch-Transcription Rule)
- **절대 금지 사항**: 어떠한 경우라도 프론트엔드에서 `m4a`, `wav` 등의 오디오 파일을 백엔드 STT 엔진(`transcribe-file` 등)으로 직접 전송(Throw)하여 한 번에 일괄 전사(Batch Transcription)하는 로직을 작성하지 마십시오.
- **아키텍처 원칙**: 파일 재생 시 파일 전체를 STT에 넘기지 않습니다. 오직 "스피커로 재생(Play)"만 수행해야 합니다.
- **동작 원리**: GPU 모드의 STT는 "스피커로 출력되는 소리를 WASAPI 루프백이 실시간으로 캡처"하여 플레이 속도에 맞춰 자연스럽게 STT가 이루어지는 아키텍처로 고정되어 있습니다. 파일 전체를 백엔드에 던져 텍스트를 한 번에 덤프받는 꼼수나 우회 코드는 영구적으로 금지됩니다.
