"""
NAVER CLOVA Speech Live Streaming Recognition Service (gRPC: clovaspeech-gw.ncloud.com:50051)
- 프로토콜: gRPC (/com.nbp.cdncp.nest.grpc.proto.v1.NestService/recognize)
- 오디오 규격: 16kHz, 1 Channel, 16-bit Signed Integer PCM (Headerless WAV)
- 보안 원칙: Secret Key는 오직 서버 전용 볼트(private_vault.system_secrets) 및 서버 환경변수에서만 로드하며,
  클라이언트 응답이나 로그에 절대 노출하지 않습니다.
"""

import json
import logging
import threading
from typing import Dict, Generator, List, Optional, Tuple

import grpc
from app.core.config import get_settings
from app.core.secret_vault import get_server_secret

logger = logging.getLogger("space_advisor.clova_grpc")

CLOVA_DOMAIN_BOOST_WORDS = (
    "S12,S12L,S7,S5,S3,S2,S1,R3,W12,W15,J600T,J800,J900,"
    "스페이스,수림종합관리,청소차,스크러버,스퀴지,흡입모터,솔모터,솔레노이드,"
    "배터리,충전기,솔브러쉬,패드홀더,오수탱크,정수탱크,플로트밸브,앤더슨커넥터"
)

_channel_lock = threading.Lock()
_shared_channel: Optional[grpc.Channel] = None
_shared_target: str = ""


def _get_clova_grpc_credentials() -> Tuple[str, str]:
    settings = get_settings()
    secret_key = (
        getattr(settings, "naver_clova_speech_secret_key", "")
        or get_server_secret("NAVER_CLOVA_SPEECH_SECRET_KEY", "")
    ).strip()
    grpc_url = (
        getattr(settings, "naver_clova_speech_grpc_url", "")
        or get_server_secret("NAVER_CLOVA_SPEECH_GRPC_URL", "clovaspeech-gw.ncloud.com:50051")
    ).strip() or "clovaspeech-gw.ncloud.com:50051"

    if not secret_key:
        raise RuntimeError("서버 보안 볼트(private_vault)에 NAVER_CLOVA_SPEECH_SECRET_KEY가 설정되지 않았습니다.")
    return secret_key, grpc_url


def _get_shared_grpc_channel(grpc_url: str) -> grpc.Channel:
    global _shared_channel, _shared_target
    with _channel_lock:
        if _shared_channel is None or _shared_target != grpc_url:
            _shared_channel = grpc.secure_channel(
                grpc_url,
                grpc.ssl_channel_credentials(),
                options=[
                    ("grpc.keepalive_time_ms", 30000),
                    ("grpc.keepalive_timeout_ms", 10000),
                    ("grpc.keepalive_permit_without_calls", 1),
                ],
            )
            _shared_target = grpc_url
        return _shared_channel


def _encode_varint(n: int) -> bytes:
    out = bytearray()
    v = n & 0xFFFFFFFF
    while v > 0x7F:
        out.append((v & 0x7F) | 0x80)
        v >>= 7
    out.append(v)
    return bytes(out)


def _encode_len_delimited(field_num: int, data: bytes) -> bytes:
    tag = _encode_varint((field_num << 3) | 2)
    length = _encode_varint(len(data))
    return tag + length + data


def build_nest_config_request(
    config_dict: Optional[Dict] = None,
    gap_threshold_ms: int = 850,
    duration_threshold_ms: int = 9000,
) -> bytes:
    safe_gap = max(500, min(1600, int(gap_threshold_ms or 850)))
    safe_dur = max(5000, min(15000, int(duration_threshold_ms or 9000)))
    if config_dict is None:
        config_dict = {
            "transcription": {"language": "ko"},
            "semanticEpd": {
                "skipEmptyText": True,
                "useWordEpd": False,
                "usePeriodEpd": True,
                "gapThreshold": safe_gap,
                "durationThreshold": safe_dur,
                "syllableThreshold": 0,
            },
            "keywordBoosting": {
                "boostings": [
                    {
                        "words": CLOVA_DOMAIN_BOOST_WORDS,
                        "weight": 2.0,
                    }
                ]
            },
        }
    json_bytes = json.dumps(config_dict, ensure_ascii=False).encode("utf-8")
    nest_config = _encode_len_delimited(1, json_bytes)
    # NestRequest: type=CONFIG(0, default), oneof part field 2 = config
    return _encode_len_delimited(2, nest_config)


def build_nest_data_request(pcm_chunk: bytes, seq_id: int, ep_flag: bool = False) -> bytes:
    parts = bytearray()
    if pcm_chunk:
        parts.extend(_encode_len_delimited(1, pcm_chunk))
    extra_json = json.dumps({"epFlag": bool(ep_flag), "seqId": int(seq_id)}).encode("utf-8")
    parts.extend(_encode_len_delimited(2, extra_json))
    # NestRequest: field 1 type=DATA(1) -> 0x08 0x01, field 3 data=NestData
    return b"\x08\x01" + _encode_len_delimited(3, bytes(parts))


def decode_nest_response_contents(raw_msg: bytes) -> str:
    if not raw_msg:
        return ""
    offset = 0
    n = len(raw_msg)
    while offset < n:
        tag = 0
        shift = 0
        while offset < n:
            b = raw_msg[offset]
            offset += 1
            tag |= (b & 0x7F) << shift
            if (b & 0x80) == 0:
                break
            shift += 7
        field_num = tag >> 3
        wire_type = tag & 0x07
        if wire_type == 2:
            length = 0
            shift = 0
            while offset < n:
                b = raw_msg[offset]
                offset += 1
                length |= (b & 0x7F) << shift
                if (b & 0x80) == 0:
                    break
                shift += 7
            slice_bytes = raw_msg[offset : offset + length]
            offset += length
            if field_num == 1:
                return slice_bytes.decode("utf-8", errors="replace")
        else:
            break
    return ""


def extract_pcm_s16le_from_wav_or_raw(audio_bytes: bytes) -> bytes:
    """WAV 헤더(RIFF....WAVE)가 포함된 경우 데이터 청크만 추출하여 순수 16kHz 16-bit PCM 바이트 반환"""
    if len(audio_bytes) > 44 and audio_bytes[:4] == b"RIFF" and audio_bytes[8:12] == b"WAVE":
        idx = audio_bytes.find(b"data", 12, 128)
        if idx != -1 and idx + 8 <= len(audio_bytes):
            return audio_bytes[idx + 8 :]
        return audio_bytes[44:]
    return audio_bytes


def stream_pcm_with_clova_grpc(
    pcm_Or_wav_bytes: bytes,
    start_offset_sec: float = 0.0,
    gap_threshold_ms: int = 850,
    duration_threshold_ms: int = 9000,
) -> Generator[Dict, None, None]:
    """
    16kHz 1ch 16-bit PCM 데이터를 CLOVA Speech gRPC 실시간 스트리밍 API로 전송하며,
    인식된 문장 조각(NestResponse)이 도착할 때마다 즉시 yield 합니다.
    """
    secret_key, grpc_url = _get_clova_grpc_credentials()
    pcm_bytes = extract_pcm_s16le_from_wav_or_raw(pcm_Or_wav_bytes)
    if not pcm_bytes or len(pcm_bytes) < 320:
        return

    channel = _get_shared_grpc_channel(grpc_url)
    recognize_rpc = channel.stream_stream(
        "/com.nbp.cdncp.nest.grpc.proto.v1.NestService/recognize",
        request_serializer=lambda b: b,
        response_deserializer=lambda b: b,
    )

    config_done_event = threading.Event()
    stop_send_event = threading.Event()
    last_seq_id_box = [0]

    def request_iterator():
        yield build_nest_config_request(
            gap_threshold_ms=gap_threshold_ms,
            duration_threshold_ms=duration_threshold_ms,
        )
        config_done_event.wait(timeout=3.0)
        chunk_size = 8000  # 0.25s of 16kHz 16-bit mono PCM (32,000 bytes/sec)
        total_len = len(pcm_bytes)
        seq_id = 1
        for offset in range(0, total_len, chunk_size):
            if stop_send_event.is_set():
                break
            end = min(total_len, offset + chunk_size)
            is_last = end >= total_len
            cur_seq = seq_id
            seq_id += 1
            if is_last:
                last_seq_id_box[0] = cur_seq
            yield build_nest_data_request(pcm_bytes[offset:end], seq_id=cur_seq, ep_flag=is_last)
        # 서버로부터 최종 응답을 수신할 때까지 클라이언트 스트림 half-close(END_STREAM) 보류
        stop_send_event.wait(timeout=45.0)

    metadata = (("authorization", f"Bearer {secret_key}"),)
    responses = recognize_rpc(request_iterator(), metadata=metadata, timeout=90.0)

    try:
        for raw_resp in responses:
            contents = decode_nest_response_contents(raw_resp)
            if not contents:
                continue
            try:
                parsed = json.loads(contents)
            except Exception:
                continue

            resp_types = parsed.get("responseType") or []
            if "config" in resp_types:
                config_done_event.set()
                continue

            if "transcription" in resp_types:
                tr = parsed.get("transcription") or {}
                txt = str(tr.get("text") or "").strip()
                start_ms = int(tr.get("startTimestamp") or 0)
                end_ms = int(tr.get("endTimestamp") or 0)
                ep_flag = bool(tr.get("epFlag"))
                seq_id = int(tr.get("seqId") or 0)

                if txt:
                    abs_start = round(start_offset_sec + (start_ms / 1000.0), 2)
                    abs_end = round(start_offset_sec + (end_ms / 1000.0), 2)
                    m = int(abs_start // 60)
                    s = int(abs_start % 60)
                    ts = f"[{m:02d}:{s:02d}]"
                    yield {
                        "text": txt,
                        "timestamp": ts,
                        "full_line": f"{ts} {txt}",
                        "start": abs_start,
                        "end": abs_end,
                        "startMs": start_ms,
                        "endMs": end_ms,
                        "epdType": str(tr.get("epdType") or ""),
                        "epFlag": ep_flag,
                        "confidence": float(tr.get("confidence") or 0.0),
                        "provider": "naver_clova",
                    }

                if last_seq_id_box[0] > 0 and (
                    seq_id >= last_seq_id_box[0]
                    or (ep_flag and seq_id >= max(1, last_seq_id_box[0] - 2))
                ):
                    stop_send_event.set()
                    break
    finally:
        stop_send_event.set()
        config_done_event.set()


def transcribe_pcm_with_clova_grpc(
    pcm_or_wav_bytes: bytes,
    start_offset_sec: float = 0.0,
    gap_threshold_ms: int = 850,
    duration_threshold_ms: int = 9000,
) -> Tuple[List[Dict], List[str], str]:
    """단일 오디오 버퍼를 CLOVA Speech gRPC로 전사하여 (세그먼트 리스트, 라인 리스트, 병합 텍스트) 반환"""
    segments: List[Dict] = []
    full_lines: List[str] = []
    texts: List[str] = []
    for seg in stream_pcm_with_clova_grpc(
        pcm_or_wav_bytes,
        start_offset_sec=start_offset_sec,
        gap_threshold_ms=gap_threshold_ms,
        duration_threshold_ms=duration_threshold_ms,
    ):
        segments.append(seg)
        full_lines.append(seg["full_line"])
        texts.append(seg["text"])
    return segments, full_lines, " ".join(texts).strip()
