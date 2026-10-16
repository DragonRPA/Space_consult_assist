/**
 * Vercel Serverless Function: POST /api/clova-chunk
 * NAVER CLOVA Speech 실시간 스트리밍 인식 (gRPC over HTTP/2: clovaspeech-gw.ncloud.com:50051)
 * - Secret Key는 서버 환경변수(NAVER_CLOVA_SPEECH_SECRET_KEY)에서만 로드하며 외부로 절대 노출하지 않습니다.
 * - ?stream=1 요청 시 발화 세그먼트가 인식되는 즉시 NDJSON(application/x-ndjson) 스트림으로 실시간 플러시합니다.
 */
const http2 = require('http2');

const DEFAULT_GRPC_HOST = 'clovaspeech-gw.ncloud.com:50051';
const NEST_SERVICE_PATH = '/com.nbp.cdncp.nest.grpc.proto.v1.NestService/recognize';

const DOMAIN_BOOST_WORDS = [
  '솔레노이드', '솔레노이드 밸브', '스퀴지', '흡입모터', '플로트 볼', '플로트 밸브',
  '액추에이터', '트랜스액슬', '브러시', '청수필터', '수림종합관리', '수림', 'S12', '스12', 'J600T', 'J800'
];

function encodeVarint(val) {
  const bytes = [];
  let v = val >>> 0;
  while (v > 0x7f) {
    bytes.push((v & 0x7f) | 0x80);
    v >>>= 7;
  }
  bytes.push(v & 0x7f);
  return Buffer.from(bytes);
}

function encodeTag(fieldNumber, wireType) {
  return encodeVarint((fieldNumber << 3) | wireType);
}

function encodeBytesField(fieldNumber, buf) {
  if (!buf || buf.length === 0) return Buffer.alloc(0);
  const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf, 'utf8');
  return Buffer.concat([encodeTag(fieldNumber, 2), encodeVarint(b.length), b]);
}

function wrapGrpcFrame(msgBuf) {
  const header = Buffer.alloc(5);
  header.writeUInt8(0, 0);
  header.writeUInt32BE(msgBuf.length, 1);
  return Buffer.concat([header, msgBuf]);
}

function buildConfigRequest(configJsonStr) {
  const nestConfig = encodeBytesField(1, Buffer.from(configJsonStr, 'utf8'));
  const req = Buffer.concat([
    encodeTag(1, 0),
    encodeVarint(0), // RequestType.CONFIG = 0
    encodeBytesField(2, nestConfig),
  ]);
  return wrapGrpcFrame(req);
}

function buildDataRequest(pcmChunk, extraJsonStr) {
  const nestData = Buffer.concat([
    encodeBytesField(1, pcmChunk),
    encodeBytesField(2, Buffer.from(extraJsonStr, 'utf8')),
  ]);
  const req = Buffer.concat([
    encodeTag(1, 0),
    encodeVarint(1), // RequestType.DATA = 1
    encodeBytesField(3, nestData),
  ]);
  return wrapGrpcFrame(req);
}

function decodeVarint(buf, offset) {
  let result = 0;
  let shift = 0;
  let pos = offset;
  while (pos < buf.length) {
    const b = buf[pos++];
    result |= (b & 0x7f) << shift;
    if ((b & 0x80) === 0) return { value: result >>> 0, nextOffset: pos };
    shift += 7;
  }
  return { value: result >>> 0, nextOffset: pos };
}

function parseNestResponse(buf) {
  let offset = 0;
  while (offset < buf.length) {
    const tag = decodeVarint(buf, offset);
    offset = tag.nextOffset;
    const fieldNum = tag.value >>> 3;
    const wireType = tag.value & 0x7;
    if (wireType === 2) {
      const len = decodeVarint(buf, offset);
      offset = len.nextOffset;
      const strBytes = buf.subarray(offset, offset + len.value);
      offset += len.value;
      if (fieldNum === 1) {
        return strBytes.toString('utf8');
      }
    } else if (wireType === 0) {
      const v = decodeVarint(buf, offset);
      offset = v.nextOffset;
    } else {
      break;
    }
  }
  return '';
}

function extractPcmFromWavOrRaw(audioBytes) {
  if (!audioBytes || audioBytes.length === 0) return Buffer.alloc(0);
  if (
    audioBytes.length > 44 &&
    audioBytes.subarray(0, 4).toString('ascii') === 'RIFF' &&
    audioBytes.subarray(8, 12).toString('ascii') === 'WAVE'
  ) {
    let offset = 12;
    while (offset + 8 <= audioBytes.length) {
      const chunkId = audioBytes.subarray(offset, offset + 4).toString('ascii');
      const chunkSize = audioBytes.readUInt32LE(offset + 4);
      if (chunkId === 'data') {
        const dataStart = offset + 8;
        const dataEnd = Math.min(audioBytes.length, dataStart + chunkSize);
        return audioBytes.subarray(dataStart, dataEnd);
      }
      offset += 8 + chunkSize;
    }
    return audioBytes.subarray(44);
  }
  return audioBytes;
}

function formatMmSs(sec) {
  const safe = Math.max(0, Number(sec) || 0);
  const m = String(Math.floor(safe / 60)).padStart(2, '0');
  const s = String(Math.floor(safe % 60)).padStart(2, '0');
  return `[${m}:${s}]`;
}

function streamClovaGrpcPcm({ pcmBuffer, startSec, secretKey, grpcHost, onSegment, isClientClosed }) {
  return new Promise((resolve, reject) => {
    const targetHost = (grpcHost || DEFAULT_GRPC_HOST).replace(/^https?:\/\//, '');
    const client = http2.connect(`https://${targetHost}`);
    let settled = false;
    let sendTimer = null;

    const cleanup = () => {
      if (sendTimer) {
        clearTimeout(sendTimer);
        sendTimer = null;
      }
      try {
        client.close();
      } catch (_) {}
    };

    const finishResolve = (val) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(val);
    };

    const finishReject = (err) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(err);
    };

    client.on('error', (err) => {
      finishReject(err);
    });

    const grpcReq = client.request({
      ':method': 'POST',
      ':path': NEST_SERVICE_PATH,
      ':scheme': 'https',
      ':authority': targetHost,
      'content-type': 'application/grpc',
      'te': 'trailers',
      'authorization': `Bearer ${secretKey}`,
    });

    let grpcStatus = '0';
    let grpcMessage = '';
    let recvBuffer = Buffer.alloc(0);
    const segments = [];

    const chunkSize = 3200; // 100ms @ 16kHz 16-bit mono
    const totalChunks = Math.max(1, Math.ceil(pcmBuffer.length / chunkSize));

    grpcReq.on('response', (headers) => {
      if (headers['grpc-status'] && headers['grpc-status'] !== '0') {
        grpcStatus = String(headers['grpc-status']);
        grpcMessage = decodeURIComponent(String(headers['grpc-message'] || ''));
      }
    });

    grpcReq.on('data', (chunk) => {
      recvBuffer = Buffer.concat([recvBuffer, chunk]);
      while (recvBuffer.length >= 5) {
        const msgLen = recvBuffer.readUInt32BE(1);
        if (recvBuffer.length < 5 + msgLen) break;
        const msgPayload = recvBuffer.subarray(5, 5 + msgLen);
        recvBuffer = recvBuffer.subarray(5 + msgLen);

        const jsonStr = parseNestResponse(msgPayload);
        if (!jsonStr) continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const tr = parsed.transcription;
          if (tr) {
            const rawText = String(tr.text || '').trim();
            if (rawText) {
              const relStartSec = typeof tr.startTimestamp === 'number' ? tr.startTimestamp / 1000.0 : 0;
              const relEndSec = typeof tr.endTimestamp === 'number' ? tr.endTimestamp / 1000.0 : relStartSec;
              const absStart = Math.max(0, startSec + relStartSec);
              const absEnd = Math.max(absStart, startSec + relEndSec);
              const ts = formatMmSs(absStart);
              const segObj = {
                text: rawText,
                timestamp: ts,
                full_line: `${ts} ${rawText}`,
                start: Number(absStart.toFixed(2)),
                end: Number(absEnd.toFixed(2)),
                confidence: Number(tr.confidence || 0),
                provider: 'naver_clova',
                protocol: 'grpc_nest_v1',
              };
              segments.push(segObj);
              if (onSegment) {
                try {
                  onSegment(segObj);
                } catch (_) {}
              }
            }
            if (tr.epFlag === true || (typeof tr.seqId === 'number' && tr.seqId >= totalChunks)) {
              try {
                grpcReq.end();
              } catch (_) {}
            }
          }
        } catch (_) {}
      }
    });

    grpcReq.on('trailers', (trailers) => {
      if (trailers['grpc-status']) {
        grpcStatus = String(trailers['grpc-status']);
      }
      if (trailers['grpc-message']) {
        grpcMessage = decodeURIComponent(String(trailers['grpc-message']));
      }
    });

    grpcReq.on('end', () => {
      if (grpcStatus !== '0' && segments.length === 0) {
        return finishReject(new Error(`CLOVA Speech gRPC error (status=${grpcStatus}): ${grpcMessage}`));
      }
      finishResolve(segments);
    });

    grpcReq.on('error', (err) => {
      if (segments.length > 0) {
        finishResolve(segments);
      } else {
        finishReject(err);
      }
    });

    const configPayload = JSON.stringify({
      transcription: { language: 'ko' },
      keywordBoosting: {
        boostings: [
          {
            words: DOMAIN_BOOST_WORDS.join(','),
            weight: 3.5,
          },
        ],
      },
      semanticEpd: {
        skipEmptyText: true,
        useWordEpd: true,
        usePeriodEpd: true,
        gapThreshold: 350,
        durationThreshold: 3500,
        syllableThreshold: 0,
      },
    });

    grpcReq.write(buildConfigRequest(configPayload));

    let idx = 0;
    const sendNextChunk = () => {
      if (settled) return;
      if (isClientClosed && isClientClosed()) {
        try {
          grpcReq.close();
        } catch (_) {}
        return finishResolve(segments);
      }
      if (idx >= totalChunks) {
        // 모든 오디오 프레임 전송 완료 후 서버가 마지막 epFlag 응답을 보낼 때까지 최대 3.5초 대기
        sendTimer = setTimeout(() => {
          try {
            grpcReq.end();
          } catch (_) {}
        }, 3500);
        return;
      }

      const slice = pcmBuffer.subarray(idx * chunkSize, (idx + 1) * chunkSize);
      const isLast = idx === totalChunks - 1;
      const seqId = idx + 1;
      const extraJson = JSON.stringify({ epFlag: isLast, seqId });
      try {
        grpcReq.write(buildDataRequest(slice, extraJson));
      } catch (_) {}
      idx += 1;
      // 초반 400ms(4프레임)는 즉시 버스트 전송하고 이후 55ms 간격으로 스트리밍하여 서버 지연 최소화
      sendTimer = setTimeout(sendNextChunk, idx <= 4 ? 5 : 55);
    };

    sendNextChunk();
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const secretKey = (
    process.env.NAVER_CLOVA_SPEECH_SECRET_KEY ||
    process.env.CLOVA_SPEECH_SECRET_KEY ||
    ''
  ).trim();
  const grpcHost = (process.env.NAVER_CLOVA_SPEECH_GRPC_URL || DEFAULT_GRPC_HOST).trim();

  if (!secretKey) {
    return res.status(500).json({ error: 'NAVER CLOVA Speech Secret Key not configured on server' });
  }

  const t0 = Date.now();
  try {
    let wavBuffer = null;
    let startSec = Number(req.query?.start || 0);
    let endSec = Number(req.query?.end || 0);
    let streamMode = req.query?.stream === '1' || req.query?.stream === 'true';

    if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
      if (req.body.audio_base64) {
        wavBuffer = Buffer.from(req.body.audio_base64, 'base64');
      }
      if (req.body.start !== undefined) startSec = Number(req.body.start);
      if (req.body.end !== undefined) endSec = Number(req.body.end);
      if (req.body.stream !== undefined) streamMode = Boolean(req.body.stream);
    } else if (Buffer.isBuffer(req.body)) {
      wavBuffer = req.body;
    } else if (typeof req.body === 'string' && req.body.length > 0) {
      try {
        const parsed = JSON.parse(req.body);
        if (parsed.audio_base64) {
          wavBuffer = Buffer.from(parsed.audio_base64, 'base64');
        }
        if (parsed.start !== undefined) startSec = Number(parsed.start);
        if (parsed.end !== undefined) endSec = Number(parsed.end);
        if (parsed.stream !== undefined) streamMode = Boolean(parsed.stream);
      } catch (_) {
        wavBuffer = Buffer.from(req.body, 'binary');
      }
    }

    if (!wavBuffer) {
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      if (chunks.length > 0) {
        const rawBuf = Buffer.concat(chunks);
        const rawStr = rawBuf.toString('utf8');
        if (rawStr.trim().startsWith('{')) {
          try {
            const parsed = JSON.parse(rawStr);
            if (parsed.audio_base64) {
              wavBuffer = Buffer.from(parsed.audio_base64, 'base64');
            }
            if (parsed.start !== undefined) startSec = Number(parsed.start);
            if (parsed.end !== undefined) endSec = Number(parsed.end);
            if (parsed.stream !== undefined) streamMode = Boolean(parsed.stream);
          } catch (_) {}
        }
        if (!wavBuffer) {
          wavBuffer = rawBuf;
        }
      }
    }

    const pcmBuffer = extractPcmFromWavOrRaw(wavBuffer);
    if (!pcmBuffer || pcmBuffer.length < 3200) {
      if (streamMode) {
        res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
        return res.status(200).end();
      }
      return res.status(200).json({
        text: '',
        segments: [],
        timestamp: formatMmSs(startSec),
        full_line: '',
        start: startSec,
        end: endSec,
        provider: 'naver_clova',
        protocol: 'grpc_nest_v1',
      });
    }

    let clientAborted = false;
    req.on('close', () => {
      if (!res.writableEnded) {
        clientAborted = true;
      }
    });

    if (streamMode) {
      res.writeHead(200, {
        'Content-Type': 'application/x-ndjson; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
        'Access-Control-Allow-Origin': '*',
      });

      await streamClovaGrpcPcm({
        pcmBuffer,
        startSec,
        secretKey,
        grpcHost,
        isClientClosed: () => clientAborted || res.writableEnded,
        onSegment: (segObj) => {
          if (!res.writableEnded) {
            res.write(JSON.stringify(segObj) + '\n');
          }
        },
      });

      if (!res.writableEnded) {
        res.end();
      }
      return;
    }

    const segments = await streamClovaGrpcPcm({
      pcmBuffer,
      startSec,
      secretKey,
      grpcHost,
      isClientClosed: () => clientAborted,
    });

    const text = segments.map((s) => s.text).filter(Boolean).join(' ').trim();
    const elapsedMs = Date.now() - t0;
    const ts = segments.length > 0 ? segments[0].timestamp : formatMmSs(startSec);
    const line = text ? `${ts} ${text}` : '';

    return res.status(200).json({
      text,
      segments,
      timestamp: ts,
      full_line: line,
      start: Number(startSec.toFixed(2)),
      end: Number(endSec.toFixed(2)),
      elapsed_ms: elapsedMs,
      provider: 'naver_clova',
      protocol: 'grpc_nest_v1',
    });
  } catch (err) {
    if (res.headersSent) {
      if (!res.writableEnded) {
        res.write(JSON.stringify({ error: err && err.message ? err.message : String(err) }) + '\n');
        res.end();
      }
      return;
    }
    return res.status(500).json({
      error: `Clova Speech gRPC error: ${err && err.message ? err.message : String(err)}`,
    });
  }
};
