import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { applyContextualCorrection, type CorrectionEvent } from './contextCorrector';
import { useCounselStore } from './store';
import {
  STT_LAB_STORAGE_KEY,
  createDefaultTempoProfile,
  encodeWav16kMono,
  loadInitialSttLabOptions,
  type SttLabOptions,
  type TempoProfile,
} from './sttAudioDsp';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export interface UseRealtimeSttCaptureParams {
  sttEngine: 'whisper_large_v3' | 'naver_clova' | 'web_speech';
  setSttEngine: (engine: 'whisper_large_v3' | 'naver_clova' | 'web_speech') => void;
  isRecording: boolean;
  activeAudioFile: File | null;
  globalAudioRef: RefObject<HTMLAudioElement | null>;
  setRecording: (status: boolean) => void;
  setInterimSttText: (text: string) => void;
  resetCallTimer: () => void;
  appendFinalParagraph: (rawText: string, correctedText: string, corrections: CorrectionEvent[]) => void;
  showToast: (msg: string) => void;
  clearToast: () => void;
  evaluateUtteranceRules: (text: string) => void;
  processIncomingSpeechUtterance: (rawText: string, chunkSizeBadge?: string) => void;
}

export function useRealtimeSttCapture({
  sttEngine,
  setSttEngine,
  isRecording,
  activeAudioFile,
  globalAudioRef,
  setRecording,
  setInterimSttText,
  resetCallTimer,
  appendFinalParagraph,
  showToast,
  clearToast,
  evaluateUtteranceRules,
  processIncomingSpeechUtterance,
}: UseRealtimeSttCaptureParams) {
  const [gpuServerOnline, setGpuServerOnline] = useState<boolean | null>(null);
  const [isAudioStreamingActive, setIsAudioStreamingActive] = useState(false);
  const [loopbackDevice] = useState<string>('');
  const [, setMicAudioLevel] = useState(0);

  const audioSessionIdRef = useRef<number>(0);
  const clovaAbortControllersRef = useRef<AbortController[]>([]);
  const clovaInflightCountRef = useRef<number>(0);
  const loopbackWsRef = useRef<WebSocket | null>(null);
  const isRecordingRef = useRef(isRecording);
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  // ── 실시간 화자 템포·박자 적응형 VAD 프로파일러 (3대 STT 엔진 공통: Groq Whisper / CLOVA / Web Speech) ──
  const [tempoBadgeText, setTempoBadgeText] = useState<string>('박자 보통 0.85s');
  const tempoProfileRef = useRef<TempoProfile>(createDefaultTempoProfile());

  const whisperMaxChunkSec = 1.2;
  const whisperSilenceSec = 0.2;
  const webSpeechSilenceSecRef = useRef(0.95);
  const webSpeechCommitTimerRef = useRef<number | null>(null);
  const webSpeechTurnStartMsRef = useRef<number>(0);
  const webSpeechPendingFinalRef = useRef<string>('');
  const webSpeechAcousticFlushRef = useRef<((measuredDurSec?: number) => void) | null>(null);
  const lastRecognizedSentenceRef = useRef<string>('');

  // ── STT 전처리·문맥·음색 개별 ON/OFF 실험 스위치 (로컬스토리지 상태 보존) ──
  const [sttLabOptions, setSttLabOptions] = useState<SttLabOptions>(() => loadInitialSttLabOptions());
  const sttLabOptionsRef = useRef(sttLabOptions);
  useEffect(() => {
    sttLabOptionsRef.current = sttLabOptions;
    try {
      window.localStorage.setItem(STT_LAB_STORAGE_KEY, JSON.stringify(sttLabOptions));
    } catch {}
  }, [sttLabOptions]);

  useEffect(() => {
    if (sttEngine === 'naver_clova') {
      setSttEngine('whisper_large_v3');
    }
  }, [sttEngine, setSttEngine]);

  const toggleSttLabOption = useCallback((key: keyof SttLabOptions) => {
    setSttLabOptions((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      sttLabOptionsRef.current = next;
      try {
        window.localStorage.setItem(STT_LAB_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const applySttLabPreset = useCallback((mode: 'RAW_DEFAULT' | 'RECOMMENDED' | 'ALL_ON') => {
    const next =
      mode === 'RAW_DEFAULT'
        ? {
            lowCut85Hz: false,
            highBoostConsonant: false,
            dualSpeakerBalance: false,
            rollingPrevSentence: false,
            domainWordBoost: false,
            wavPeakNormalize: false,
            boxcarAntiAliasing: false,
            dynamicEnvelopeVad: false,
          }
        : mode === 'ALL_ON'
          ? {
              lowCut85Hz: true,
              highBoostConsonant: true,
              dualSpeakerBalance: true,
              rollingPrevSentence: true,
              domainWordBoost: true,
              wavPeakNormalize: true,
              boxcarAntiAliasing: true,
              dynamicEnvelopeVad: true,
            }
          : {
              lowCut85Hz: false,
              highBoostConsonant: false,
              dualSpeakerBalance: true,
              rollingPrevSentence: true,
              domainWordBoost: true,
              wavPeakNormalize: true,
              boxcarAntiAliasing: true,
              dynamicEnvelopeVad: false,
            };
    sttLabOptionsRef.current = next;
    try {
      window.localStorage.setItem(STT_LAB_STORAGE_KEY, JSON.stringify(next));
    } catch {}
    setSttLabOptions(next);
  }, []);

  const recomputeTempoProfile = useCallback(() => {
    const tp = tempoProfileRef.current;
    // 음절 속도(SPS)와 실시간 음향 포락선 맥박(Envelope Rate)을 결합한 유효 말하기 속도
    const effectiveRate = tp.emaSps * 0.65 + tp.emaEnvelopeRate * 0.35;
    // 말이 빠를수록(< 1.0) 기민하게 자르고, 느릴수록(> 1.0) 여유 있게 대기
    const rateFactor = Math.max(0.76, Math.min(1.48, 4.15 / Math.max(2.2, effectiveRate)));
    // 화자의 평소 문장 내 숨고르기 길이(emaBreathPauseSec)의 1.85배 이상 보장하여 문장 중간 절단 방지
    const breathSafeSilence = tp.emaBreathPauseSec * 1.85;
    const nextSilenceSec = Math.max(0.56, Math.min(1.22, Math.max(0.82 * rateFactor, breathSafeSilence)));
    const nextClauseSec = Math.max(0.34, Math.min(0.68, nextSilenceSec * 0.58));
    // 단문(1.2~2.5s), 표준문(2.6~4.8s), 장문(4.9~7.8s)이 발화 호흡에 맞춰 가변 절단되도록 폭넓은 동적 상한 부여
    const nextSoftMaxSec = Math.max(4.2, Math.min(6.6, 5.2 * rateFactor));
    const nextHardMaxSec = Math.max(6.2, Math.min(8.6, 7.4 * rateFactor));
    const nextClovaGapMs = Math.round(Math.max(520, Math.min(950, nextSilenceSec * 820)));
    const nextClovaDurMs = Math.round(Math.max(5200, Math.min(8200, nextHardMaxSec * 940)));

    tp.tempoMultiplier = Number(rateFactor.toFixed(2));
    tp.targetSilenceSec = Number(nextSilenceSec.toFixed(2));
    tp.targetClauseSec = Number(nextClauseSec.toFixed(2));
    tp.softMaxChunkSec = Number(nextSoftMaxSec.toFixed(2));
    tp.hardMaxChunkSec = Number(nextHardMaxSec.toFixed(2));
    tp.clovaGapMs = nextClovaGapMs;
    tp.clovaDurMs = nextClovaDurMs;

    // 웹 음성 STT 침묵 커밋 타이머도 화자 템포에 1:1 동기화
    webSpeechSilenceSecRef.current = Number(Math.max(0.68, Math.min(1.35, nextSilenceSec * 1.08)).toFixed(2));

    const tempoTag =
      nextSilenceSec <= 0.72 ? '박자 빠름' : nextSilenceSec >= 1.02 ? '박자 느림' : '박자 보통';
    const nextBadge = `${tempoTag} ${nextSilenceSec.toFixed(1)}s`;
    setTempoBadgeText((prev) => (prev === nextBadge ? prev : nextBadge));
  }, []);

  const updateTempoFromUtterance = useCallback((utteranceText: string, durationSec: number) => {
    const clean = (utteranceText || '')
      .replace(/^\[\d{1,2}:\d{2}(?::\d{2})?\]\s*/, '')
      .replace(/^\[\d+(?:\.\d+)?s\s*·\s*[^\]]+\]\s*/, '')
      .trim();
    if (clean.length >= 2) {
      lastRecognizedSentenceRef.current = clean.slice(-90);
    }
    const syllables = (clean.match(/[가-힣0-9a-zA-Z]/g) || []).length;
    if (durationSec >= 0.8 && syllables >= 3) {
      const observedSps = Math.max(1.9, Math.min(7.2, syllables / durationSec));
      const tp = tempoProfileRef.current;
      tp.emaSps = tp.emaSps * 0.68 + observedSps * 0.32;
      recomputeTempoProfile();
    }
  }, [recomputeTempoProfile]);

  const resetTempoProfile = useCallback(() => {
    tempoProfileRef.current = {
      emaSps: 4.1,
      emaBreathPauseSec: 0.36,
      emaEnvelopeRate: 3.8,
      tempoMultiplier: 1.0,
      targetSilenceSec: 0.82,
      targetClauseSec: 0.46,
      softMaxChunkSec: 5.2,
      hardMaxChunkSec: 7.4,
      clovaGapMs: 650,
      clovaDurMs: 6800,
    };
    webSpeechSilenceSecRef.current = 0.95;
    webSpeechPendingFinalRef.current = '';
    webSpeechTurnStartMsRef.current = 0;
    lastRecognizedSentenceRef.current = '';
    setTempoBadgeText('박자 보통 0.82s');
  }, []);

  // Periodic Local GPU Server Heartbeat Monitor (Every 3 seconds)
  useEffect(() => {
    let isMounted = true;
    const checkGpuServer = async () => {
      try {
        const res = await fetch('http://127.0.0.1:8000/api/v1/stt/status');
        if (!isMounted) return;
        if (res.ok) {
          setGpuServerOnline(true);
        } else {
          setGpuServerOnline(false);
        }
      } catch {
        if (isMounted) setGpuServerOnline(false);
      }
    };
    checkGpuServer();
    const interval = setInterval(checkGpuServer, 3000);
    return () => { isMounted = false; clearInterval(interval); };
  }, []);

  // Whisper / NAVER CLOVA 청크 파라미터 변경 시 WebSocket으로 즉시 전송 (서버 재시작 불필요)
  useEffect(() => {
    if (sttEngine !== 'whisper_large_v3' && sttEngine !== 'naver_clova') return;
    if (!loopbackWsRef.current || loopbackWsRef.current.readyState !== WebSocket.OPEN) return;
    try {
      loopbackWsRef.current.send(JSON.stringify({
        action: 'set_chunk',
        silence_seconds: whisperSilenceSec,
        max_seconds: whisperMaxChunkSec
      }));
    } catch {}
  }, [whisperMaxChunkSec, whisperSilenceSec, sttEngine]);

  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Synchronous STT Startup Function (Instant Mic Engagement)
  const startSttStreaming = useCallback(() => {
    setRecording(true);
    if (sttEngine === 'web_speech' && recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e: any) {
        if (e.name !== 'InvalidStateError') {
          console.warn("STT Start Notice:", e);
        }
      }
    }
  }, [sttEngine, setRecording]);

  const stopSttStreaming = useCallback(() => {
    setRecording(false);
    if (sttEngine === 'web_speech' && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
  }, [sttEngine, setRecording]);


  useEffect(() => {
    // 오디오 파일(.m4a) 재생 데모 중일 때는 하드웨어 WASAPI 루프백을 중지하여 중복/충돌 방지
    const isLoopbackEngine = (sttEngine === 'whisper_large_v3' || sttEngine === 'naver_clova') && !activeAudioFile;
    if (!isLoopbackEngine || !gpuServerOnline) {
      if (loopbackWsRef.current) {
        try {
          loopbackWsRef.current.send(JSON.stringify({ action: 'stop' }));
          loopbackWsRef.current.close();
        } catch {}
        loopbackWsRef.current = null;
      }
      return;
    }

    let isDisposed = false;
    let reconnectTimeout: number | null = null;

    const connectLoopback = () => {
      if (isDisposed) return;
      try {
        const ws = new WebSocket('ws://127.0.0.1:8000/api/v1/stt/ws');
        loopbackWsRef.current = ws;

        ws.onopen = () => {
          if (isDisposed) { ws.close(); return; }
          ws.send(JSON.stringify({
            action: 'start',
            device: loopbackDevice || null,
            engine_provider: sttEngine
          }));
          setRecording(true);
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'stream_state') {
              if (msg.streaming) {
                setIsAudioStreamingActive((prev) => {
                  if (!prev) resetCallTimer();
                  return true;
                });
              } else {
                setIsAudioStreamingActive(false);
              }
            }
            if (msg.text) {
              setIsAudioStreamingActive(true);
              const cleanText = msg.text.trim();
              const { correctedText, corrections } = applyContextualCorrection(cleanText);
              const syllables = (cleanText.match(/[가-힣0-9a-zA-Z]/g) || []).length;
              const estDur =
                typeof msg.start === 'number' && typeof msg.end === 'number' && msg.end > msg.start
                  ? Math.max(0.6, msg.end - msg.start)
                  : typeof msg.duration === 'number' && msg.duration > 0
                    ? msg.duration
                    : Math.max(1.0, syllables / 4.1);
              const estKb = Math.max(1, Math.round((estDur * 32000) / 1024));
              const sizeBadge = `[${estDur.toFixed(1)}s · ${estKb}KB]`;
              const tsPrefix = msg.timestamp ? `${msg.timestamp} ${sizeBadge}` : sizeBadge;
              const rawLine = `${tsPrefix} ${cleanText}`;
              const correctedLine = `${tsPrefix} ${correctedText}`;
              appendFinalParagraph(rawLine, correctedLine, corrections);
              evaluateUtteranceRules(correctedText);
            }

            if (msg.status === 'stopped' && msg.recording) {
              setIsAudioStreamingActive(false);
              showToast(`[녹음 저장] ${msg.recording}`);
              setTimeout(() => clearToast(), 4000);
            }
            if (msg.error) {
              console.warn('[루프백 STT]', msg.error);
            }
          } catch {}
        };

        ws.onerror = () => {};

        ws.onclose = () => {
          loopbackWsRef.current = null;
          if (!isDisposed && (sttEngine === 'whisper_large_v3' || sttEngine === 'naver_clova') && gpuServerOnline && !activeAudioFile) {
            reconnectTimeout = window.setTimeout(connectLoopback, 3000);
          }
        };
      } catch (err) {
        console.warn('Loopback WS connection error:', err);
      }
    };

    connectLoopback();

    return () => {
      isDisposed = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (loopbackWsRef.current) {
        try {
          loopbackWsRef.current.send(JSON.stringify({ action: 'stop' }));
          loopbackWsRef.current.close();
        } catch {}
        loopbackWsRef.current = null;
      }
    };
  }, [sttEngine, gpuServerOnline, loopbackDevice, activeAudioFile, appendFinalParagraph, showToast, clearToast, setRecording]);

  const abortAllClovaStreams = useCallback(() => {
    for (const ctrl of clovaAbortControllersRef.current) {
      try {
        ctrl.abort();
      } catch {}
    }
    clovaAbortControllersRef.current = [];
  }, []);

  // 100% 물리적 마이크(getUserMedia) 실시간 수음 + 상대적 포락선 낙폭(Relative Envelope Drop) & 동적 노이즈 플로어 적응형 VAD
  // 3대 STT 엔진(Groq Whisper / NAVER CLOVA / 브라우저 내장 Web Speech) 모두 동일한 호흡·박자 감지기 공유
  useEffect(() => {
    let processorNode: ScriptProcessorNode | null = null;
    let micSpeechSamples: number[] = [];
    let micPreRollSamples: number[] = [];
    let micInSpeech = false;
    let micSilenceChunks = 0;
    let micVoicedChunks = 0;
    let micSpeechStartSec = 0;
    let micNoiseFloor = 65;
    let speechPeakRms = 420;
    const rollingRmsHistory: number[] = [];
    let prevFrameRms = 0;
    let prevRmsRising = false;
    let voicedPeakCount = 0;
    let voicedRmsSum = 0;
    let recentVoicedRms: number[] = [];
    const PRE_ROLL_MAX = 7200; // 0.45초 (16kHz 기준, 첫 자음/음절 유실 방지)

    const flushMicSamplesToClova = async (samples16k: number[], startSec: number) => {
      if (samples16k.length < 16000 * 0.35) return;
      const capturedSessionId = audioSessionIdRef.current;
      const floatArr = new Float32Array(samples16k);
      const wavBlob = encodeWav16kMono(floatArr, 16000, sttLabOptionsRef.current);
      const durSec = Number((samples16k.length / 16000).toFixed(2));
      const wavKb = Math.max(1, Math.round(wavBlob.size / 1024));
      const endSec = startSec + durSec;
      const m = String(Math.floor(startSec / 60)).padStart(2, '0');
      const s = String(Math.floor(startSec % 60)).padStart(2, '0');
      const chunkTs = `[${m}:${s}]`;
      const chunkSizeBadge = `[${durSec.toFixed(1)}s · ${wavKb}KB]`;
      const chunkHeader = `${chunkTs} ${chunkSizeBadge}`;
      const tp = tempoProfileRef.current;
      const gapMs = tp.clovaGapMs;
      const durMs = tp.clovaDurMs;

      const abortCtrl = new AbortController();
      clovaAbortControllersRef.current.push(abortCtrl);
      clovaInflightCountRef.current += 1;
      setInterimSttText('듣는중');

      const chunkTexts: string[] = [];
      let hasCommittedFirst = false;
      const normSeg = (str: string) => str.replace(/[\s.,?!~·-]/g, '');

      const handleChunkSegment = (cleanText: string) => {
        if (!cleanText || audioSessionIdRef.current !== capturedSessionId) return;
        const incomingNorm = normSeg(cleanText);
        if (!incomingNorm) return;

        if (chunkTexts.length > 0) {
          const lastIdx = chunkTexts.length - 1;
          const prevNorm = normSeg(chunkTexts[lastIdx]);
          if (prevNorm === incomingNorm || prevNorm.includes(incomingNorm)) {
            return;
          }
          if (incomingNorm.startsWith(prevNorm)) {
            chunkTexts[lastIdx] = cleanText;
          } else {
            chunkTexts.push(cleanText);
          }
        } else {
          chunkTexts.push(cleanText);
        }

        const combinedChunkBody = chunkTexts.join(' ').replace(/\s+/g, ' ').trim();

        if (!hasCommittedFirst) {
          hasCommittedFirst = true;
          processIncomingSpeechUtterance(`${chunkHeader} ${combinedChunkBody}`);
        } else {
          // 동일 1개 오디오 청크(chunkHeader 일치) 내에서 세부 세그먼트가 추가 도착한 경우 제자리 갱신 (다른 청크 덮어쓰기 절대 방지)
          const storeState = useCounselStore.getState();
          const fParas = [...storeState.finalParagraphs];
          const rParas = [...storeState.rawParagraphs];
          let targetIdx = -1;
          for (let i = fParas.length - 1; i >= 0; i--) {
            if (fParas[i].startsWith(chunkHeader)) {
              targetIdx = i;
              break;
            }
          }
          if (targetIdx >= 0) {
            const updatedLine = `${chunkHeader} ${combinedChunkBody}`;
            fParas[targetIdx] = updatedLine;
            rParas[targetIdx] = updatedLine;
            useCounselStore.setState({ finalParagraphs: fParas, rawParagraphs: rParas });
            evaluateUtteranceRules(combinedChunkBody);
          } else {
            processIncomingSpeechUtterance(`${chunkHeader} ${combinedChunkBody}`);
          }
        }
      };

      try {
        const activeEngine = useCounselStore.getState().sttEngine;
        const isGroqStt = activeEngine === 'whisper_large_v3';
        const labOpts = sttLabOptionsRef.current;
        const useDomainPrompt = labOpts.domainWordBoost;
        const prevContextStr = labOpts.rollingPrevSentence ? lastRecognizedSentenceRef.current : '';
        const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const qs = `stream=1&start=${startSec.toFixed(2)}&end=${endSec.toFixed(2)}&gap_ms=${gapMs}&dur_ms=${durMs}&domain_boost=${useDomainPrompt ? '1' : '0'}`;
        let response: Response | null = null;

        if (isLocalHost && !isGroqStt) {
          try {
            const formData = new FormData();
            formData.append('file', wavBlob, `mic_${startSec.toFixed(1)}_${endSec.toFixed(1)}.wav`);
            const localRes = await fetch(`http://127.0.0.1:8000/api/v1/stt/clova-chunk?${qs}`, {
              method: 'POST',
              body: formData,
              signal: abortCtrl.signal,
            });
            if (localRes.ok) {
              response = localRes;
            }
          } catch (e: any) {
            if (e?.name === 'AbortError') throw e;
          }
        }

        if (!response) {
          const audioBase64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const res = String(reader.result || '');
              const commaIdx = res.indexOf(',');
              resolve(commaIdx >= 0 ? res.slice(commaIdx + 1) : res);
            };
            reader.onerror = reject;
            reader.readAsDataURL(wavBlob);
          });

          const endpointPath = isGroqStt ? `/api/groq-stt-chunk?${qs}` : `/api/clova-chunk?${qs}`;
          const cloudUrl = isLocalHost
            ? `https://space-consult-assist.vercel.app${endpointPath}`
            : endpointPath;

          response = await fetch(cloudUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audio_base64: audioBase64,
              start: Number(startSec.toFixed(2)),
              end: Number(endSec.toFixed(2)),
              gap_ms: gapMs,
              dur_ms: durMs,
              use_domain_prompt: useDomainPrompt,
              prev_context: prevContextStr,
              stream: true,
            }),
            signal: abortCtrl.signal,
          });
        }

        if (!response.ok) {
          throw new Error(`${isGroqStt ? 'Groq STT' : 'Clova gRPC'} HTTP ${response.status}`);
        }

        if (response.body) {
          const reader = response.body.getReader();
          const decoder = new TextDecoder('utf-8');
          let lineBuf = '';
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            if (audioSessionIdRef.current !== capturedSessionId) break;
            lineBuf += decoder.decode(value, { stream: true });
            const lines = lineBuf.split('\n');
            lineBuf = lines.pop() || '';
            for (const rawLine of lines) {
              const trimmed = rawLine.trim();
              if (!trimmed) continue;
              try {
                const segObj = JSON.parse(trimmed);
                const cleanText = String(segObj?.text || '').trim();
                if (cleanText) {
                  handleChunkSegment(cleanText);
                }
              } catch {}
            }
          }
          if (lineBuf.trim() && audioSessionIdRef.current === capturedSessionId) {
            try {
              const segObj = JSON.parse(lineBuf.trim());
              const cleanText = String(segObj?.text || '').trim();
              if (cleanText) {
                handleChunkSegment(cleanText);
              }
            } catch {}
          }
        } else {
          const data = await response.json();
          const cleanText = String(data?.text || '').trim();
          if (cleanText && audioSessionIdRef.current === capturedSessionId) {
            handleChunkSegment(cleanText);
          }
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          console.warn('마이크 클라우드 STT 전사 실패:', err);
        }
      } finally {
        if (chunkTexts.length > 0 && audioSessionIdRef.current === capturedSessionId) {
          updateTempoFromUtterance(chunkTexts.join(' '), durSec);
        }
        clovaAbortControllersRef.current = clovaAbortControllersRef.current.filter((c) => c !== abortCtrl);
        clovaInflightCountRef.current = Math.max(0, clovaInflightCountRef.current - 1);
        if (!micInSpeech && clovaInflightCountRef.current === 0) {
          setInterimSttText('');
        }
      }
    };

    if (isRecording) {
      // echoCancellation: false 로 설정하여 브라우저가 스피커 재생음(<audio>)을 에코로 오인해 캔슬링(차단)하지 않도록 강제
      navigator.mediaDevices?.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: true,
        },
      })
        .then((stream) => {
          streamRef.current = stream;
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          const audioCtx = new AudioCtx();
          audioContextRef.current = audioCtx;

          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          analyserRef.current = analyser;

          const source = audioCtx.createMediaStreamSource(stream);
          source.connect(analyser);

          // 오직 물리적 마이크(getUserMedia)가 실제로 수음한 파형만 16kHz로 다운샘플링하여 3대 STT 엔진 공통 VAD 수행
          try {
            processorNode = audioCtx.createScriptProcessor(4096, 1, 1);
            source.connect(processorNode);
            processorNode.connect(audioCtx.destination);
            const inRate = audioCtx.sampleRate || 48000;
            const ratio = inRate / 16000;

            processorNode.onaudioprocess = (e) => {
              const out = e.outputBuffer.getChannelData(0);
              for (let i = 0; i < out.length; i++) out[i] = 0;

              const state = useCounselStore.getState();
              if (!isRecordingRef.current) {
                return;
              }
              const isClovaActive = state.sttEngine === 'naver_clova' || state.sttEngine === 'whisper_large_v3';
              const labOpts = sttLabOptionsRef.current;

              const input = e.inputBuffer.getChannelData(0);
              const outLen = Math.floor(input.length / ratio);
              let sumSq = 0;
              const downsampled: number[] = new Array(outLen);
              for (let i = 0; i < outLen; i++) {
                const startIdx = Math.floor(i * ratio);
                let sample = 0;
                if (labOpts.boxcarAntiAliasing) {
                  // [스위치 ON: 안티에일리어싱 필터] 48kHz -> 16kHz 다운샘플링 시 구간 평균으로 고주파 에일리어싱 왜곡 차단
                  const endIdx = Math.min(input.length, Math.max(startIdx + 1, Math.floor((i + 1) * ratio)));
                  let acc = 0;
                  for (let k = startIdx; k < endIdx; k++) {
                    acc += input[k];
                  }
                  sample = acc / (endIdx - startIdx);
                } else {
                  // [스위치 OFF: 원본 포인트 샘플링]
                  sample = input[startIdx] || 0;
                }
                downsampled[i] = sample;
                const v = sample * 32767;
                sumSq += v * v;
              }
              const rms = Math.sqrt(sumSq / Math.max(1, outLen));

              // ── [스위치: 호흡 적응형 VAD (dynamicEnvelopeVad)] 상대적 포락선 낙폭 vs 고정 임계치(<=90) 비교 ──
              rollingRmsHistory.push(rms);
              if (rollingRmsHistory.length > 48) {
                rollingRmsHistory.shift();
              }
              let onsetThreshold: number;
              let pauseThreshold: number;

              if (labOpts.dynamicEnvelopeVad) {
                const sortedRms = [...rollingRmsHistory].sort((a, b) => a - b);
                const p22Rms = sortedRms[Math.floor((sortedRms.length - 1) * 0.22)] ?? rms;
                const p85Rms = sortedRms[Math.floor((sortedRms.length - 1) * 0.85)] ?? rms;

                if (!micInSpeech) {
                  micNoiseFloor = Math.max(35, Math.min(680, micNoiseFloor * 0.88 + p22Rms * 0.12));
                } else {
                  micNoiseFloor = Math.max(35, Math.min(680, micNoiseFloor * 0.96 + Math.min(micNoiseFloor, p22Rms) * 0.04));
                }
                speechPeakRms = Math.max(
                  160,
                  Math.min(12000, speechPeakRms * 0.90 + Math.max(p85Rms, micNoiseFloor * 2.2) * 0.10)
                );

                onsetThreshold = Math.max(52, Math.min(820, Math.max(micNoiseFloor * 1.52, micNoiseFloor + 60)));
                const currentMeanVoiced = micVoicedChunks > 0 ? voicedRmsSum / micVoicedChunks : speechPeakRms;
                const relativeDropThreshold = Math.min(currentMeanVoiced * 0.44, speechPeakRms * 0.40);
                pauseThreshold = Math.max(
                  45,
                  Math.min(740, Math.max(micNoiseFloor * 1.28, relativeDropThreshold))
                );
              } else {
                // 고정 임계치 (기존 5.8초 균일 절단 재현 비교용)
                if (!micInSpeech && rms < 110) {
                  micNoiseFloor = Math.max(35, Math.min(75, micNoiseFloor * 0.97 + Math.max(35, rms) * 0.03));
                }
                const fixedThr = Math.max(45, Math.min(90, micNoiseFloor * 1.35));
                onsetThreshold = fixedThr;
                pauseThreshold = fixedThr;
              }

              const isVoicedFrame = micInSpeech ? rms > pauseThreshold : rms > onsetThreshold;
              const tp = tempoProfileRef.current;
              const effectiveSoftMaxSec = labOpts.dynamicEnvelopeVad ? tp.softMaxChunkSec : 4.0;
              const effectiveHardMaxSec = labOpts.dynamicEnvelopeVad ? tp.hardMaxChunkSec : 5.5;

              if (isVoicedFrame) {
                if (!micInSpeech) {
                  micInSpeech = true;
                  micSilenceChunks = 0;
                  micVoicedChunks = 0;
                  voicedPeakCount = 0;
                  voicedRmsSum = 0;
                  recentVoicedRms = [];
                  prevFrameRms = rms;
                  prevRmsRising = true;
                  const audioEl = globalAudioRef.current;
                  micSpeechStartSec =
                    state.activeAudioFile && audioEl && audioEl.currentTime > 0
                      ? Math.max(0, audioEl.currentTime - 0.4)
                      : state.callSeconds;
                  micSpeechSamples = isClovaActive ? [...micPreRollSamples] : [];
                } else if (micSilenceChunks >= 2) {
                  // 문장 도중 잠깐 숨을 고른 뒤(0.16s ~ 1.35s) 다시 말을 이어간 경우 -> 3대 엔진 공통 화자 고유 호흡 길이 학습
                  const breathPauseSec = (micSilenceChunks * outLen) / 16000;
                  if (breathPauseSec >= 0.16 && breathPauseSec <= 1.35) {
                    tp.emaBreathPauseSec = tp.emaBreathPauseSec * 0.72 + breathPauseSec * 0.28;
                    recomputeTempoProfile();
                  }
                }

                // 음향 포락선 음절 맥박(Syllable Peak) 감지: 3대 엔진 공통 실시간 말하기 빠르기 추정
                if (prevRmsRising && rms < prevFrameRms && prevFrameRms > pauseThreshold * 1.22) {
                  voicedPeakCount += 1;
                }
                prevRmsRising = rms > prevFrameRms;
                prevFrameRms = rms;

                micVoicedChunks += 1;
                micSilenceChunks = 0;
                voicedRmsSum += rms;
                recentVoicedRms.push(rms);
                if (recentVoicedRms.length > 4) recentVoicedRms.shift();

                if (micVoicedChunks > 0 && micVoicedChunks % 10 === 0) {
                  const voicedDurSec = (micVoicedChunks * outLen) / 16000;
                  if (voicedDurSec >= 0.8) {
                    const estPeakRate = Math.max(2.0, Math.min(6.8, (voicedPeakCount / voicedDurSec) * 1.45));
                    tp.emaEnvelopeRate = tp.emaEnvelopeRate * 0.75 + estPeakRate * 0.25;
                    recomputeTempoProfile();
                  }
                }

                if (isClovaActive) {
                  for (let i = 0; i < downsampled.length; i++) micSpeechSamples.push(downsampled[i]);
                  setInterimSttText('듣는중');
                }

                // 소프트 에너지 골짜기 절단(Soft Valley Split) — 3대 엔진 공통 적용:
                const uttDurSec = isClovaActive
                  ? micSpeechSamples.length / 16000
                  : ((micVoicedChunks + micSilenceChunks) * outLen) / 16000;
                const updatedMeanVoiced = voicedRmsSum / Math.max(1, micVoicedChunks);
                const isEnergyValley = labOpts.dynamicEnvelopeVad
                  ? rms < Math.max(pauseThreshold * 1.25, updatedMeanVoiced * 0.56)
                  : rms < pauseThreshold * 1.22;
                if (uttDurSec >= effectiveHardMaxSec || (uttDurSec >= effectiveSoftMaxSec && isEnergyValley)) {
                  const toSend = micSpeechSamples;
                  const startToSend = micSpeechStartSec;
                  if (isClovaActive) {
                    micPreRollSamples = toSend.slice(-Math.min(toSend.length, 4800));
                  }
                  micSpeechSamples = [];
                  micInSpeech = false;
                  micSilenceChunks = 0;
                  micVoicedChunks = 0;
                  if (isClovaActive) {
                    flushMicSamplesToClova(toSend, startToSend);
                  } else {
                    webSpeechAcousticFlushRef.current?.(uttDurSec);
                  }
                }
              } else {
                prevRmsRising = false;
                prevFrameRms = rms;
                if (isClovaActive) {
                  for (let i = 0; i < downsampled.length; i++) micPreRollSamples.push(downsampled[i]);
                  if (micPreRollSamples.length > PRE_ROLL_MAX) {
                    micPreRollSamples.splice(0, micPreRollSamples.length - PRE_ROLL_MAX);
                  }
                }

                if (micInSpeech) {
                  micSilenceChunks += 1;
                  if (isClovaActive) {
                    for (let i = 0; i < downsampled.length; i++) micSpeechSamples.push(downsampled[i]);
                  }

                  const silenceDurSec = (micSilenceChunks * outLen) / 16000;
                  const uttDurSec = isClovaActive
                    ? micSpeechSamples.length / 16000
                    : ((micVoicedChunks + micSilenceChunks) * outLen) / 16000;
                  const voicedDurSec = (micVoicedChunks * outLen) / 16000;

                  // 직전 유성음 구간의 억양/에너지 감쇠(Terminal Prosody Decay vs Hesitation Hold) 분석
                  const meanVoicedRms = voicedRmsSum / Math.max(1, micVoicedChunks);
                  const tailVoicedRms =
                    recentVoicedRms.length > 0
                      ? recentVoicedRms.reduce((a, b) => a + b, 0) / recentVoicedRms.length
                      : meanVoicedRms;
                  // 말을 생각하느라 모음을 끌거나 높은 에너지에서 갑자기 멈춘 경우(+0.14s 대기), 문장 끝 억양이 자연 하강한 경우(-0.07s)
                  const hesitationBonusSec =
                    tailVoicedRms > meanVoicedRms * 1.04 ? 0.14 : tailVoicedRms < meanVoicedRms * 0.78 ? -0.07 : 0;

                  // 4단계 발화 길이에 따른 적응형 침묵 절단 임계시간 계산 (Groq Whisper / CLOVA / Web Speech 공통)
                  let requiredSilenceSec: number;
                  if (uttDurSec < 1.9) {
                    // Stage 1: 초단문 / 맞장구 / 단답형 구간 (1.1s~1.8s 단문 즉시 종결)
                    requiredSilenceSec = Math.max(0.42, tp.targetSilenceSec * 0.74 + Math.max(0, hesitationBonusSec));
                  } else if (uttDurSec < 3.6) {
                    // Stage 2: 표준 대화 문장 구간 (2.0s~3.5s 문장 호흡 기준 적용)
                    requiredSilenceSec = Math.max(0.50, tp.targetSilenceSec * 0.88 + hesitationBonusSec);
                  } else if (uttDurSec < tp.softMaxChunkSec) {
                    // Stage 3: 3.6초 이상 장문 발화 구간 (구절 호흡 휴지에서 자연 절단)
                    requiredSilenceSec = tp.targetClauseSec;
                  } else {
                    // Stage 4: softMaxChunkSec 이상 장문 구간 (미세 호흡만 감지되어도 즉시 절단)
                    requiredSilenceSec = 0.16;
                  }

                  if (silenceDurSec >= requiredSilenceSec) {
                    const toSend = micSpeechSamples;
                    const startToSend = micSpeechStartSec;
                    if (isClovaActive) {
                      micPreRollSamples = toSend.slice(-Math.min(toSend.length, 4800));
                    }
                    micSpeechSamples = [];
                    micInSpeech = false;
                    micSilenceChunks = 0;
                    micVoicedChunks = 0;
                    if (isClovaActive) {
                      if (voicedDurSec >= 0.18 && toSend.length >= 16000 * 0.35) {
                        flushMicSamplesToClova(toSend, startToSend);
                      } else if (clovaInflightCountRef.current === 0) {
                        setInterimSttText('');
                      }
                    } else if (voicedDurSec >= 0.18) {
                      webSpeechAcousticFlushRef.current?.(uttDurSec);
                    }
                  }
                }
              }
            };
          } catch {}

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const update = () => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
            const avg = sum / dataArray.length;
            setMicAudioLevel(Math.min(100, Math.round((avg / 128) * 100 * 1.6)));
            animFrameRef.current = requestAnimationFrame(update);
          };
          update();
        })
        .catch((err) => {
          console.warn("Audio meter stream failed", err);
        });
    } else {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      setMicAudioLevel(0);
    }

    return () => {
      const endEngine = useCounselStore.getState().sttEngine;
      if (
        (endEngine === 'naver_clova' || endEngine === 'whisper_large_v3') &&
        micInSpeech &&
        micVoicedChunks >= 2 &&
        micSpeechSamples.length >= 16000 * 0.35
      ) {
        flushMicSamplesToClova(micSpeechSamples, micSpeechStartSec);
        micSpeechSamples = [];
        micInSpeech = false;
      }
      if (processorNode) {
        try { processorNode.disconnect(); } catch {}
      }
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, [isRecording, processIncomingSpeechUtterance, evaluateUtteranceRules, recomputeTempoProfile, updateTempoFromUtterance, setInterimSttText]);

  // Robust Persistent Web Speech API with Multi-Entity & Action Auto-Trigger
  useEffect(() => {
    if (sttEngine !== 'web_speech') {
      webSpeechAcousticFlushRef.current = null;
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
        recognitionRef.current = null;
      }
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    let isDisposed = false;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'ko-KR';

    // 각 resultIndex 별로 이미 확정(Commit)된 원문을 기록하여,
    // 동일 resultIndex 내에서 interim -> interim 또는 interim -> isFinal 전환 시 앞 문장이 누적 반복되는 현상을 원천 차단
    const consumedRawByResultIdx = new Map<number, string>();
    let lastVoiceActivityMs = 0;
    let latestUnconsumedInterimEntries: Array<{ index: number; rawTranscript: string; delta: string }> = [];

    const normChars = (s: string): string => s.replace(/[\s.,?!~·-]/g, '');

    const extractUnconsumedSpeech = (fullTranscript: string, consumedRaw: string): string => {
      const rawTrim = (fullTranscript || '').trim();
      if (!rawTrim) return '';
      if (!consumedRaw) return rawTrim;

      const fullNorm = normChars(rawTrim);
      const consNorm = normChars(consumedRaw);
      if (!fullNorm || fullNorm === consNorm || consNorm.includes(fullNorm)) {
        return '';
      }

      // 이미 커밋된 문장의 끝부분(4~5글자)과 현재 문장의 끝부분이 동일하고 글자수 차이가 미세(±4자 이내)하면
      // 크롬이 문장부호나 조사 1글자만 교정한 것이므로 중복 출력하지 않음
      const tailAnchor = consNorm.slice(-Math.min(5, consNorm.length));
      if (
        tailAnchor.length >= 2 &&
        fullNorm.endsWith(tailAnchor) &&
        Math.abs(fullNorm.length - consNorm.length) <= 4
      ) {
        return '';
      }

      const normIdxToRawEnd: number[] = [];
      for (let k = 0; k < rawTrim.length; k++) {
        if (!/[\s.,?!~·-]/.test(rawTrim[k])) {
          normIdxToRawEnd.push(k + 1);
        }
      }

      const searchFrom = Math.max(0, consNorm.length - tailAnchor.length - 4);
      const anchorPos = tailAnchor.length >= 2 ? fullNorm.indexOf(tailAnchor, searchFrom) : -1;
      const endNormCount = anchorPos >= 0 ? anchorPos + tailAnchor.length : consNorm.length;

      if (endNormCount >= normIdxToRawEnd.length) {
        return '';
      }
      const rawCutIdx = normIdxToRawEnd[Math.max(0, endNormCount - 1)];
      return rawTrim.slice(rawCutIdx).replace(/^[\s.,?!~·-]+/, '').trim();
    };

    const flushWebSpeechPending = (sessionId: number, acousticDurSec?: number) => {
      if (isDisposed || audioSessionIdRef.current !== sessionId) return;
      const committed = webSpeechPendingFinalRef.current.trim();
      webSpeechPendingFinalRef.current = '';
      if (!committed) return;

      const syllables = (committed.match(/[가-힣0-9a-zA-Z]/g) || []).length;
      const estBySyllables = Math.max(1.0, syllables / Math.max(2.4, tempoProfileRef.current.emaSps));
      const endVoiceMs = lastVoiceActivityMs > webSpeechTurnStartMsRef.current ? lastVoiceActivityMs : Date.now();
      const measuredSec =
        typeof acousticDurSec === 'number' && acousticDurSec >= 0.8
          ? acousticDurSec
          : webSpeechTurnStartMsRef.current > 0
            ? Math.max(0.9, (endVoiceMs - webSpeechTurnStartMsRef.current) / 1000 + 0.35)
            : estBySyllables;
      const turnDurSec = Number(Math.min(12.5, Math.max(estBySyllables * 0.72, measuredSec)).toFixed(1));
      const sizeKb = Math.max(1, Math.round((turnDurSec * 32000) / 1024));
      const chunkSizeBadge = `[${turnDurSec.toFixed(1)}s · ${sizeKb}KB]`;

      webSpeechTurnStartMsRef.current = 0;
      lastVoiceActivityMs = 0;
      updateTempoFromUtterance(committed, turnDurSec);
      processIncomingSpeechUtterance(committed, chunkSizeBadge);
      setInterimSttText('');
    };

    // 물리 마이크 음향 포락선 VAD(onaudioprocess)에서 실제 문장/구절 휴지가 감지된 즉시 내장 STT 턴도 동일 박자로 커밋
    webSpeechAcousticFlushRef.current = (acousticDurSec?: number) => {
      if (isDisposed) return;
      const capturedSessionId = audioSessionIdRef.current;
      if (webSpeechPendingFinalRef.current.trim()) {
        if (webSpeechCommitTimerRef.current) {
          clearTimeout(webSpeechCommitTimerRef.current);
          webSpeechCommitTimerRef.current = null;
        }
        flushWebSpeechPending(capturedSessionId, acousticDurSec);
        return;
      }
      if (latestUnconsumedInterimEntries.length > 0) {
        const interimJoined = latestUnconsumedInterimEntries.map((e) => e.delta).join(' ').trim();
        const isEndedSentence =
          interimJoined.length >= 10 && /(?:요|다|까|죠|니다|세요|네요|군요|게요)[.?!~]*$/.test(interimJoined);
        const isLongClause =
          typeof acousticDurSec === 'number' &&
          acousticDurSec >= tempoProfileRef.current.softMaxChunkSec &&
          interimJoined.length >= 14;
        if (isEndedSentence || isLongClause) {
          if (webSpeechCommitTimerRef.current) {
            clearTimeout(webSpeechCommitTimerRef.current);
            webSpeechCommitTimerRef.current = null;
          }
          let freshlyConsumed = '';
          for (const item of latestUnconsumedInterimEntries) {
            const prevConsumed = consumedRawByResultIdx.get(item.index) || '';
            const freshDelta = extractUnconsumedSpeech(item.rawTranscript, prevConsumed);
            consumedRawByResultIdx.set(item.index, item.rawTranscript);
            if (freshDelta) {
              freshlyConsumed += (freshlyConsumed ? ' ' : '') + freshDelta;
            }
          }
          latestUnconsumedInterimEntries = [];
          if (freshlyConsumed) {
            webSpeechPendingFinalRef.current = freshlyConsumed;
            flushWebSpeechPending(capturedSessionId, acousticDurSec);
          }
        }
      }
    };

    recognition.onresult = (event: any) => {
      if (isDisposed) return;
      lastVoiceActivityMs = Date.now();

      let newFinalDelta = '';
      let currentInterimDelta = '';
      const unconsumedInterimEntries: Array<{ index: number; rawTranscript: string; delta: string }> = [];

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const rawTranscript = String(event.results[i][0]?.transcript || '').trim();
        if (!rawTranscript) continue;
        const alreadyConsumed = consumedRawByResultIdx.get(i) || '';
        const delta = extractUnconsumedSpeech(rawTranscript, alreadyConsumed);

        if (event.results[i].isFinal) {
          // isFinal 도달 즉시 해당 resultIndex 전체를 소비 완료 처리하여 재방출 차단
          consumedRawByResultIdx.set(i, rawTranscript);
          if (delta) {
            newFinalDelta += (newFinalDelta ? ' ' : '') + delta;
          }
        } else if (delta) {
          currentInterimDelta += (currentInterimDelta ? ' ' : '') + delta;
          unconsumedInterimEntries.push({ index: i, rawTranscript, delta });
        }
      }
      latestUnconsumedInterimEntries = unconsumedInterimEntries;

      const tp = tempoProfileRef.current;
      const capturedSessionId = audioSessionIdRef.current;

      if (newFinalDelta.trim()) {
        if (webSpeechTurnStartMsRef.current === 0) {
          webSpeechTurnStartMsRef.current = Date.now() - 1400;
        }
        if (webSpeechCommitTimerRef.current) {
          clearTimeout(webSpeechCommitTimerRef.current);
          webSpeechCommitTimerRef.current = null;
        }
        const incomingFinal = newFinalDelta.trim();
        webSpeechPendingFinalRef.current = webSpeechPendingFinalRef.current
          ? `${webSpeechPendingFinalRef.current} ${incomingFinal}`.replace(/\s+/g, ' ').trim()
          : incomingFinal;

        const combinedPending = webSpeechPendingFinalRef.current;
        const isUnfinishedEnding =
          /(?:는데|길래|더니|면서|려고|니까|지만|어서|아서|해서|하고|이고|며|고서|다가|은데|건데|거고|거나|부터|까지|에서|으로|010|공일공|연락처[가는은]?|전화번호[가는은]?|모델명?[은이가]?|\d{2,4})$/.test(
            combinedPending
          );
        const isCompleteSentence =
          combinedPending.length >= 28 ||
          (combinedPending.length >= 12 && !isUnfinishedEnding && /(?:요|다|까|죠|니다|세요)[.?!~]*$/.test(combinedPending));

        if (isCompleteSentence && !currentInterimDelta.trim()) {
          flushWebSpeechPending(capturedSessionId);
        } else {
          const previewDisplay = currentInterimDelta.trim()
            ? `${combinedPending} ${currentInterimDelta.trim()}`
            : combinedPending;
          setInterimSttText(previewDisplay);
          const holdSec = isUnfinishedEnding
            ? Math.max(0.55, tp.targetSilenceSec * 0.85)
            : Math.max(0.32, tp.targetSilenceSec * 0.54);
          webSpeechCommitTimerRef.current = window.setTimeout(() => {
            webSpeechCommitTimerRef.current = null;
            flushWebSpeechPending(capturedSessionId);
          }, holdSec * 1000);
        }
      } else if (currentInterimDelta.trim()) {
        if (webSpeechTurnStartMsRef.current === 0) {
          webSpeechTurnStartMsRef.current = Date.now();
        }
        const combinedPreview = webSpeechPendingFinalRef.current
          ? `${webSpeechPendingFinalRef.current} ${currentInterimDelta.trim()}`.replace(/\s+/g, ' ').trim()
          : currentInterimDelta.trim();
        setInterimSttText(combinedPreview);

        if (webSpeechCommitTimerRef.current) {
          clearTimeout(webSpeechCommitTimerRef.current);
        }
        // 크롬이 isFinal을 지연시키는 긴 침묵 구간에서만 미소비(unconsumed) 델타를 안전하게 커밋하고 소비 오프셋을 즉시 기록
        const interimFallbackHoldSec = Math.max(1.15, webSpeechSilenceSecRef.current * 1.18);
        webSpeechCommitTimerRef.current = window.setTimeout(() => {
          webSpeechCommitTimerRef.current = null;
          if (!isDisposed && audioSessionIdRef.current === capturedSessionId) {
            let freshlyConsumed = '';
            for (const item of unconsumedInterimEntries) {
              const prevConsumed = consumedRawByResultIdx.get(item.index) || '';
              const freshDelta = extractUnconsumedSpeech(item.rawTranscript, prevConsumed);
              consumedRawByResultIdx.set(item.index, item.rawTranscript);
              if (freshDelta) {
                freshlyConsumed += (freshlyConsumed ? ' ' : '') + freshDelta;
              }
            }
            if (freshlyConsumed) {
              webSpeechPendingFinalRef.current = webSpeechPendingFinalRef.current
                ? `${webSpeechPendingFinalRef.current} ${freshlyConsumed}`.replace(/\s+/g, ' ').trim()
                : freshlyConsumed;
            }
            if (webSpeechPendingFinalRef.current.trim()) {
              flushWebSpeechPending(capturedSessionId);
            }
          }
        }, interimFallbackHoldSec * 1000);
      }

      const currentStream = (
        webSpeechPendingFinalRef.current
          ? `${webSpeechPendingFinalRef.current} ${currentInterimDelta.trim() || newFinalDelta.trim()}`
          : currentInterimDelta.trim() || newFinalDelta.trim()
      ).trim();
      if (currentStream) {
        const correctedStream = applyContextualCorrection(currentStream).correctedText;
        evaluateUtteranceRules(correctedStream);
      }
    };

    recognition.onerror = (event: any) => {
      console.warn("Speech Recognition Status:", event.error);
      if (event.error === 'not-allowed') {
        setRecording(false);
        showToast("마이크 권한이 차단되었습니다. 브라우저 설정에서 마이크를 허용해 주세요.");
        setTimeout(() => clearToast(), 4000);
      }
    };

    // Keep-Alive Auto-Recovery
    recognition.onend = () => {
      consumedRawByResultIdx.clear();
      if (!isDisposed && isRecordingRef.current && useCounselStore.getState().sttEngine === 'web_speech') {
        setTimeout(() => {
          if (!isDisposed && isRecordingRef.current && useCounselStore.getState().sttEngine === 'web_speech') {
            try {
              recognition.start();
            } catch {
              setTimeout(() => {
                if (!isDisposed && isRecordingRef.current && useCounselStore.getState().sttEngine === 'web_speech') {
                  try { recognition.start(); } catch {}
                }
              }, 350);
            }
          }
        }, 120);
      }
    };

    recognitionRef.current = recognition;

    if (isRecordingRef.current) {
      try {
        recognition.start();
      } catch {}
    }

    const handleWindowFocus = () => {
      if (!isDisposed && isRecordingRef.current && recognitionRef.current && useCounselStore.getState().sttEngine === 'web_speech') {
        try {
          recognitionRef.current.start();
        } catch {}
      }
    };

    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleWindowFocus);

    return () => {
      isDisposed = true;
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleWindowFocus);
      try {
        recognition.stop();
      } catch {}
    };
  }, [sttEngine, processIncomingSpeechUtterance, evaluateUtteranceRules, setInterimSttText, setRecording, showToast, clearToast]);

  // Web Speech API 녹음 상태 동기화 — isRecording이 true가 되는 시점에 recognition.start() 보장
  // (useEffect 비동기 특성으로 recognitionRef가 null인 경쟁 조건 방지)
  useEffect(() => {
    if (sttEngine !== 'web_speech') return;
    if (isRecording && recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e: any) {
        if (e.name !== 'InvalidStateError') {
          console.warn('Web Speech delayed start:', e);
        }
      }
    } else if (!isRecording && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
  }, [isRecording, sttEngine]);

  return {
    isAudioStreamingActive,
    tempoBadgeText,
    sttLabOptions,
    sttLabOptionsRef,
    toggleSttLabOption,
    applySttLabPreset,
    audioSessionIdRef,
    clovaInflightCountRef,
    loopbackWsRef,
    recognitionRef,
    webSpeechCommitTimerRef,
    resetTempoProfile,
    abortAllClovaStreams,
    startSttStreaming,
    stopSttStreaming,
  };
}
