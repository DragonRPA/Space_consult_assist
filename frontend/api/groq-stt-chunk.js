/**
 * Vercel Serverless Function: /api/groq-stt-chunk
 * - 물리 마이크(getUserMedia)가 수음한 16kHz 16-bit Mono WAV 오디오 청크를
 *   Groq Cloud LPU (`whisper-large-v3-turbo` -> 한도 도달 시 `whisper-large-v3` 폴백)로 초고속 전사합니다.
 * - 보안 원칙: GROQ_API_KEY는 오직 서버 환경변수에서만 읽으며 클라이언트에 절대 노출하지 않습니다.
 */

const GROQ_STT_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';

const DOMAIN_CONTEXT_PROMPT =
  '스페이스, 수림종합관리, 청소차, 스크러버, J600T, J800, J900, S12, S12L, S7, S5, S3, S2, S1, W12, W15, R3, XD80, 스마트타워, 배터리 케이블, 배터리 단자, 점퍼 케이블, 충전기 케이블, 전원 케이블, 솔레노이드 밸브, 흡입 호스, 배수 호스, 브러시 모터, 흡입 모터, 주행 모터, 스퀴지 고무, 앤더슨 커넥터';

const HALLUCINATION_PATTERNS = [
  /MBC\s*뉴스/i,
  /KBS\s*뉴스/i,
  /SBS\s*뉴스/i,
  /YTN/i,
  /구독과\s*좋아요/,
  /시청해\s*주셔서\s*감사합니다/,
  /자막\s*제공/,
  /번역\s*및\s*자막/,
  /한글자막/,
  /뉴스\s*이덕영/,
  /뉴스\s*김/,
];

function isHallucinatedOrPromptEcho(text) {
  const clean = String(text || '').trim();
  if (!clean) return true;
  for (const pat of HALLUCINATION_PATTERNS) {
    if (pat.test(clean)) return true;
  }
  // 프롬프트 단어 나열이 그대로 에코(반복)된 무음 환각 방어
  if (clean.includes('스페이스, 수림종합관리, 청소차') || clean.includes('J600T, J800, J900, S12')) {
    return true;
  }
  const commaCount = (clean.match(/,/g) || []).length;
  if (commaCount >= 5 && /J600T|스크러버|배터리\s*케이블/.test(clean)) {
    return true;
  }
  return false;
}

function buildMultipartBody(wavBuffer, modelName, customPrompt) {
  const boundary = `----GroqWhisperBoundary${Date.now().toString(16)}`;
  const chunks = [];

  const pushField = (name, value) => {
    chunks.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`,
        'utf-8'
      )
    );
  };

  chunks.push(
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="chunk.wav"\r\nContent-Type: audio/wav\r\n\r\n`,
      'utf-8'
    )
  );
  chunks.push(wavBuffer);
  chunks.push(Buffer.from('\r\n', 'utf-8'));

  pushField('model', modelName);
  pushField('language', 'ko');
  pushField('response_format', 'verbose_json');
  pushField('temperature', '0');
  if (customPrompt && customPrompt.trim()) {
    pushField('prompt', customPrompt.trim());
  }

  chunks.push(Buffer.from(`--${boundary}--\r\n`, 'utf-8'));

  return {
    boundary,
    bodyBuffer: Buffer.concat(chunks),
  };
}

async function transcribeWithGroqModel(apiKey, wavBuffer, modelName, customPrompt) {
  const { boundary, bodyBuffer } = buildMultipartBody(wavBuffer, modelName, customPrompt);

  const resp = await fetch(GROQ_STT_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body: bodyBuffer,
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    const err = new Error(`Groq STT HTTP ${resp.status} (${modelName}): ${errText.slice(0, 200)}`);
    err.status = resp.status;
    throw err;
  }

  return await resp.json();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const startMs = Date.now();
  try {
    const groqApiKey = (process.env.GROQ_API_KEY || '').trim();
    if (!groqApiKey) {
      return res.status(500).json({
        status: 'error',
        error: '서버 환경변수에 GROQ_API_KEY가 설정되지 않았습니다.',
      });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const audioBase64 = String(body.audio_base64 || '').trim();
    const startSec = Number(body.start || req.query?.start || 0);
    const isStreamMode = Boolean(body.stream || req.query?.stream === '1');
    const useDomainPrompt = body.use_domain_prompt !== undefined ? Boolean(body.use_domain_prompt) : true;
    const prevContext = String(body.prev_context || '').trim();

    if (!audioBase64) {
      return res.status(400).json({ status: 'error', error: 'audio_base64 데이터가 없습니다.' });
    }

    const wavBuffer = Buffer.from(audioBase64, 'base64');
    if (wavBuffer.length < 320) {
      return res.status(200).json({ status: 'ok', text: '', segments: [] });
    }

    const promptParts = [];
    if (useDomainPrompt) {
      promptParts.push(DOMAIN_CONTEXT_PROMPT);
    }
    if (prevContext) {
      promptParts.push(prevContext.slice(-110));
    }
    const effectivePrompt = promptParts.join(' ').trim();

    let usedModel = 'whisper-large-v3-turbo';
    let whisperData = null;

    try {
      whisperData = await transcribeWithGroqModel(groqApiKey, wavBuffer, 'whisper-large-v3-turbo', effectivePrompt);
    } catch (errTurbo) {
      usedModel = 'whisper-large-v3';
      whisperData = await transcribeWithGroqModel(groqApiKey, wavBuffer, 'whisper-large-v3', effectivePrompt);
    }

    const rawSegments = Array.isArray(whisperData?.segments) ? whisperData.segments : [];
    const validTexts = [];
    const validSegments = [];

    if (rawSegments.length > 0) {
      for (const seg of rawSegments) {
        const noSpeechProb = Number(seg?.no_speech_prob || 0);
        const avgLogprob = Number(seg?.avg_logprob ?? -0.3);
        const segText = String(seg?.text || '').trim();
        // 무음 구간 환각(no_speech_prob > 0.78 또는 극저확률 잡음) 필터링
        if (!segText || noSpeechProb > 0.78 || (noSpeechProb > 0.55 && avgLogprob < -1.15)) {
          continue;
        }
        if (isHallucinatedOrPromptEcho(segText)) {
          continue;
        }
        validTexts.push(segText);
        validSegments.push({
          text: segText,
          start: Number((startSec + Number(seg.start || 0)).toFixed(2)),
          end: Number((startSec + Number(seg.end || 0)).toFixed(2)),
          confidence: Number(Math.max(0.1, Math.min(0.99, Math.exp(avgLogprob))).toFixed(2)),
          provider: 'groq_whisper',
          model: usedModel,
        });
      }
    } else {
      const topText = String(whisperData?.text || '').trim();
      if (topText && !isHallucinatedOrPromptEcho(topText)) {
        validTexts.push(topText);
        validSegments.push({
          text: topText,
          start: Number(startSec.toFixed(2)),
          end: Number(startSec.toFixed(2)),
          confidence: 0.92,
          provider: 'groq_whisper',
          model: usedModel,
        });
      }
    }

    const finalText = validTexts.join(' ').replace(/\s+/g, ' ').trim();

    if (isStreamMode) {
      res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
      if (finalText) {
        res.write(
          JSON.stringify({
            text: finalText,
            start: Number(startSec.toFixed(2)),
            provider: 'groq_whisper',
            model: usedModel,
            elapsedMs: Date.now() - startMs,
          }) + '\n'
        );
      }
      return res.status(200).end();
    }

    return res.status(200).json({
      status: 'ok',
      provider: 'groq_whisper',
      model: usedModel,
      elapsedMs: Date.now() - startMs,
      text: finalText,
      segments: validSegments,
    });
  } catch (err) {
    console.error('[groq-stt-chunk] Error:', err);
    return res.status(500).json({
      status: 'error',
      error: String(err?.message || err),
    });
  }
}
