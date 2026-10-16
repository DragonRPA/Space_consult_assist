/**
 * Vercel Serverless Function: POST /api/clova-chunk
 * 실시간 통화 재생 및 마이크 수음 시 발화 단위 WAV 청크(16kHz Mono PCM)를 받아
 * NAVER CLOVA Speech Recognition (CSR) API로 즉시 전사하여 반환합니다.
 */
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

  const clientId = (process.env.NAVER_CLOVA_CLIENT_ID || '').trim();
  const clientSecret = (process.env.NAVER_CLOVA_CLIENT_SECRET || '').trim();

  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: 'NAVER CLOVA credentials not configured on server' });
  }

  const t0 = Date.now();
  try {
    let wavBuffer = null;
    let startSec = Number(req.query?.start || 0);
    let endSec = Number(req.query?.end || 0);

    if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
      if (req.body.audio_base64) {
        wavBuffer = Buffer.from(req.body.audio_base64, 'base64');
      }
      if (req.body.start !== undefined) startSec = Number(req.body.start);
      if (req.body.end !== undefined) endSec = Number(req.body.end);
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
          } catch (_) {}
        }
        if (!wavBuffer) {
          wavBuffer = rawBuf;
        }
      }
    }

    if (!wavBuffer || wavBuffer.length < 100) {
      return res.status(200).json({
        text: '',
        timestamp: '[00:00]',
        full_line: '',
        start: startSec,
        end: endSec,
        provider: 'naver_clova',
      });
    }

    const clovaResp = await fetch('https://naveropenapi.apigw.ntruss.com/recog/v1/stt?lang=Kor', {
      method: 'POST',
      headers: {
        'X-NCP-APIGW-API-KEY-ID': clientId,
        'X-NCP-APIGW-API-KEY': clientSecret,
        'Content-Type': 'application/octet-stream',
      },
      body: wavBuffer,
    });

    if (!clovaResp.ok) {
      const errText = await clovaResp.text();
      return res.status(clovaResp.status).json({
        error: `Clova API HTTP ${clovaResp.status}: ${errText}`,
      });
    }

    const data = await clovaResp.json();
    const text = String(data.text || '').trim();
    const elapsedMs = Date.now() - t0;
    const m = String(Math.floor(startSec / 60)).padStart(2, '0');
    const s = String(Math.floor(startSec % 60)).padStart(2, '0');
    const ts = `[${m}:${s}]`;
    const line = text ? `${ts} ${text}` : '';

    return res.status(200).json({
      text,
      timestamp: ts,
      full_line: line,
      start: Number(startSec.toFixed(2)),
      end: Number(endSec.toFixed(2)),
      elapsed_ms: elapsedMs,
      provider: 'naver_clova',
    });
  } catch (err) {
    return res.status(500).json({
      error: `Clova real-time chunk error: ${err && err.message ? err.message : String(err)}`,
    });
  }
};
