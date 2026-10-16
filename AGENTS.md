# Space Consult Assist - Project Rules

## 🚫 [CRITICAL] STT 엔진 오디오 파일 직접 전송 및 메모리 디코딩 영구 금지 정책 (Zero File-Buffer Bypass & 100% Real-Audio Capture Rule)
> **"실제를 테스트하는 것이 목적이다. 진짜 서비스를 만들었을 때 테스트한 대로 작동해주지 않는다면 고객의 신뢰를 잃고 사업의 기반을 잃게 된다. 단지 테스트의 작은 성과를 뽐내기 위한 작업이 아니라는 것을 명심한다."**

1. **오디오 파일 메모리 해독·직접 전송 절대 금지**:
   - 어떠한 경우라도 프론트엔드에서 `m4a`, `wav`, `mp3` 등의 오디오 파일을 `file.arrayBuffer()`, `OfflineAudioContext`, `decodeAudioData` 등으로 메모리에서 디코딩하여 백엔드나 클라우드 STT API(`clova-chunk`, `transcribe-file` 등)로 직접 전송(일괄 전송 또는 구간 분할 선행 전송 포함)하는 코드를 작성하지 마십시오.
2. **테스트 파일 플레이어의 유일한 역할**:
   - 화면의 오디오 파일 플레이어(`<audio>`)는 오직 **"스피커로 소리만 재생(Play)"**하는 용도로만 동작해야 합니다.
3. **100% 실제 수음 파이프라인 단일화**:
   - 모든 STT 엔진(`web_speech`, `naver_clova`, `whisper_large_v3`)은 오디오 파일 재생 여부(`isAudioPlaying`)와 무관하게 **오직 스피커를 통해 출력된 소리를 물리적 마이크(`navigator.mediaDevices.getUserMedia`) 또는 하드웨어 루프백(`WASAPI Loopback`)이 실시간으로 수음한 오디오 파형만** 입력받아 전사해야 합니다.
   - 스피커 볼륨을 0(음소거)으로 줄이면 어떤 STT도 텍스트를 뱉어내지 못하는 구조만이 유일한 정상 아키텍처입니다.
   - 파일명에서 고객사/담당자 정보를 미리 파싱하거나, 파일 버퍼를 미리 읽어 재생 시간에 맞춰 뿌리는 모든 눈속임·우회 코드는 영구 금지됩니다.
