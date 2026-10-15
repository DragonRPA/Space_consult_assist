import { useEffect, useRef, useState, useCallback } from 'react';
import { 
  PhoneCall, 
  Mic, 
  Search, 
  CheckCircle2, 
  Clock, 
  Wrench, 
  Building2, 
  CheckSquare, 
  Square, 
  Volume2, 
  Radio, 
  Zap, 
  HelpCircle, 
  Play, 
  Pause, 
  Upload, 
  FileAudio, 
  Loader2,
  X
} from 'lucide-react';
import { useCounselStore } from './store';
import { MicTestModal } from './MicTestModal';
import { applyContextualCorrection } from './contextCorrector';
import { 
  DOMAIN_KEYWORD_REGISTRY, 
  NAMED_ENTITY_REGISTRY, 
  renderMultiColorHighlightedText 
} from './keywordAssist';
import type { KeywordEntity, EntityRule } from './keywordAssist';
import type { CustomerInfo } from './store';
import SchedulePage from './SchedulePage';
import CounselAssistV2 from './CounselAssistV2';
import CounselAssistV3 from './CounselAssistV3';
import CounselCompare from './CounselCompare';
import GlobalNav, { type NavTab } from './GlobalNav';

import './index.css';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

function getInitialTab(): NavTab {
  const path = window.location.pathname;
  const search = window.location.search;
  const hash = window.location.hash;
  if (search.includes('guides') || hash.includes('guides')) return 'counsel-v2';
  if (path.startsWith('/counsel3') || path.startsWith('/v3')) return 'counsel-v3';
  if (path.startsWith('/schedule')) return 'schedule';
  if (path.startsWith('/counsel-compare')) return 'counsel-compare';
  if (path.startsWith('/stt') || path.startsWith('/legacy')) return 'stt-legacy';
  // 기본 진입 화면: CounselAssistV2
  return 'counsel-v2';
}

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>(getInitialTab);
  const [openGuides, setOpenGuides] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const search = window.location.search || '';
      const hash = window.location.hash || '';
      return search.includes('guides') || hash.includes('guides');
    }
    return false;
  });

  useEffect(() => {
    const handlePopState = () => {
      setCurrentTab(getInitialTab());
      const search = window.location.search || '';
      const hash = window.location.hash || '';
      if (search.includes('guides') || hash.includes('guides')) {
        setOpenGuides(true);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleSelectTab = (tab: NavTab) => {
    setCurrentTab(tab);
    const pathMap: Record<NavTab, string> = {
      'counsel-v2': '/',
      'counsel-v3': '/counsel3',
      'counsel-compare': '/counsel-compare',
      'schedule': '/schedule',
      'stt-legacy': '/stt',
    };
    window.history.pushState(null, '', pathMap[tab]);
  };

  const [openGuidesTrigger, setOpenGuidesTrigger] = useState<number>(0);

  const handleOpenGuides = () => {
    if (currentTab !== 'counsel-v2' && currentTab !== 'counsel-v3') {
      setCurrentTab('counsel-v2');
      window.history.pushState(null, '', '/?view=guides');
    }
    setOpenGuides(true);
    setOpenGuidesTrigger(prev => prev + 1);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--bg-app)', backgroundImage: 'var(--paper-texture)', backgroundRepeat: 'repeat' }}>
      <GlobalNav currentTab={currentTab} onSelectTab={handleSelectTab} onOpenGuides={handleOpenGuides} />
      <main style={{ flex: 1, position: 'relative' }}>
        {currentTab === 'counsel-v2' && <CounselAssistV2 initialOpenGuides={openGuides} openGuidesTrigger={openGuidesTrigger} />}
        {currentTab === 'counsel-v3' && <CounselAssistV3 initialOpenGuides={openGuides} openGuidesTrigger={openGuidesTrigger} />}
        {currentTab === 'counsel-compare' && <CounselCompare />}
        {currentTab === 'schedule' && <SchedulePage />}
        {currentTab === 'stt-legacy' && <LegacySttApp onOpenGuides={handleOpenGuides} />}
      </main>
    </div>
  );
}

function LegacySttApp({ onOpenGuides: _onOpenGuides }: { onOpenGuides?: () => void }) {


  const {
    isRecording,
    callSeconds,
    counselorName,
    toastMessage,
    activeAudioFile,
    activeAudioUrl,
    isAudioPlaying,
    audioCurrentTime,
    audioDuration,
    sttEngine,
    setSttEngine,
    setActiveAudioFile,
    clearAudioFile,
    setIsAudioPlaying,
    setAudioTime,
    resetSessionForNewAudio,
    isContextCorrectionEnabled,
    activeKeywordEntity,
    detectedKeywordEntities,
    setActiveKeywordEntity,
    addDetectedKeywordEntity,
    searchQuery,
    customerList,
    selectedCustomer,
    rawParagraphs,
    finalParagraphs,
    interimSttText,
    matchedDiagnosis,
    manualOverrideKeyword,
    actionChecklist,
    dispatchDrawerOpen,
    salesModalOpen,
    dispatchNote,
    assignedEngineer,
    dispatchDate,
    setRecording,
    incrementCallTimer,
    resetCallTimer,
    setSearchQuery,
    selectCustomer,
    setSelectedCustomerModel,
    appendFinalParagraph,
    setInterimSttText,
    setDiagnosisResult,
    toggleChecklist,
    setManualOverrideKeyword,
    setDispatchDrawerOpen,
    setSalesModalOpen,
    setDispatchNote,
    setAssignedEngineer,
    setDispatchDate,
    showToast,
    clearToast
  } = useCounselStore();

  const [salesTransferType, setSalesTransferType] = useState("신규 렌탈 견적서 요청");
  const [salesTransferNote, setSalesTransferNote] = useState("기존 장비 가동률 증가로 추가 1대 렌탈 단가 견적 요청");
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [isMicTestOpen, setIsMicTestOpen] = useState(false);
  const [showAllSymptoms, setShowAllSymptoms] = useState(false);
  const [isWhisperLauncherModalOpen, setIsWhisperLauncherModalOpen] = useState(false);
  const [gpuServerOnline, setGpuServerOnline] = useState<boolean | null>(null);
  const [isAudioStreamingActive, setIsAudioStreamingActive] = useState(false);
  const [loopbackDevice] = useState<string>('');
  const [micAudioLevel, setMicAudioLevel] = useState(0);
  const [justTriggeredKeyword, setJustTriggeredKeyword] = useState<string | null>(null);
  const [isDragOverDropzone, setIsDragOverDropzone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);
  const [selectedSearchIndex, setSelectedSearchIndex] = useState(-1);
  const audioSegmentsRef = useRef<{
    start: number;
    end: number;
    text: string;
    state?: 'pending' | 'inflight' | 'ready' | 'done';
    dispatched?: boolean;
  }[]>([]);
  const decodedPcm16kRef = useRef<Float32Array | null>(null);
  const audioSessionIdRef = useRef<number>(0);
  const realtimeVadRef = useRef<{
    cursorFrame: number;
    inSpeech: boolean;
    speechStartFrame: number;
    silenceFrames: number;
    noiseFloor: number;
    inflightCount: number;
    lastChunkLabel: string;
  }>({
    cursorFrame: 0,
    inSpeech: false,
    speechStartFrame: 0,
    silenceFrames: 0,
    noiseFloor: 220,
    inflightCount: 0,
    lastChunkLabel: '',
  });
  // ── STT 청크 시간 설정 ─────────────────────────────────────────────────────
  const whisperMaxChunkSec = 1.2;   // Whisper 최대 세그먼트 (초)
  const whisperSilenceSec = 0.2;     // Whisper 무음 감지 (초)
  const webSpeechSilenceSec = 1.8; // Web Speech 커밋 지연 (초, 문장 중간 끊김 방지)
  const webSpeechSilenceSecRef = useRef(1.8);
  const webSpeechCommitTimerRef = useRef<number | null>(null);

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
      } catch (_) {
        if (isMounted) setGpuServerOnline(false);
      }
    };
    checkGpuServer();
    const interval = setInterval(checkGpuServer, 3000);
    return () => { isMounted = false; clearInterval(interval); };
  }, []);

  // Web Speech 침묵 타임아웃을 ref에 동기화 (useEffect 재실행 없이 최신값 반영)
  useEffect(() => { webSpeechSilenceSecRef.current = webSpeechSilenceSec; }, [webSpeechSilenceSec]);

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
    } catch (_) {}
  }, [whisperMaxChunkSec, whisperSilenceSec, sttEngine]);

  const globalAudioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const loopbackWsRef = useRef<WebSocket | null>(null);
  const isRecordingRef = useRef(isRecording);
  isRecordingRef.current = isRecording;

  // Standalone rule evaluator (Uses live store state to prevent stale async closures)
  const evaluateUtteranceRules = useCallback((text: string) => {
    const liveStore = useCounselStore.getState();

    // 1. Symptom Keyword & Part Matching
    for (const entity of DOMAIN_KEYWORD_REGISTRY) {
      if (entity.synonyms.test(text)) {
        liveStore.addDetectedKeywordEntity(entity);
        if (liveStore.activeKeywordEntity?.id !== entity.id) {
          liveStore.setActiveKeywordEntity(entity);
          setJustTriggeredKeyword(entity.keyword);
          setTimeout(() => setJustTriggeredKeyword(null), 3000);
          liveStore.showToast(`[구어체 감지: ${entity.keyword}] 진단 및 조치 가이드 자동 표출`);
          setTimeout(() => liveStore.clearToast(), 3000);
        }
        break;
      }
    }

    // 2. Customer Identification (Preset + Dynamic Spoken Customer/Manager)
    const afterSymptomStore = useCounselStore.getState();
    const curCust = afterSymptomStore.selectedCustomer;
    for (const entRule of NAMED_ENTITY_REGISTRY) {
      if ((entRule.type === 'customer' || entRule.type === 'site') && entRule.pattern.test(text)) {
        if (entRule.customerId && curCust?.id !== entRule.customerId) {
          const targetCust = afterSymptomStore.customerList.find(c => c.id === entRule.customerId);
          if (targetCust) {
            afterSymptomStore.selectCustomer(targetCust);
            afterSymptomStore.showToast(`[고객사 감지: ${targetCust.name}] 자동 선택 완료`);
            setTimeout(() => afterSymptomStore.clearToast(), 3000);
          }
        } else if (!entRule.customerId) {
          const matched = text.match(entRule.pattern)?.[0]?.trim();
          if (matched && curCust && !curCust.name.includes(matched)) {
            if (entRule.type === 'customer') {
              const isPersonRole = /(?:님|과장|소장|팀장|대리|실장|대표|이사)$/.test(matched);
              afterSymptomStore.selectCustomer({
                ...curCust,
                name: isPersonRole ? curCust.name : matched,
                manager: isPersonRole ? matched : curCust.manager
              });
              afterSymptomStore.showToast(`[통화 고객/담당자 감지: ${matched}] 고객 패널 실시간 반영`);
              setTimeout(() => afterSymptomStore.clearToast(), 3000);
            } else if (entRule.type === 'site') {
              afterSymptomStore.selectCustomer({
                ...curCust,
                address: matched
              });
            }
          }
        }
        break;
      }
    }

    // 3. Model Identification
    for (const entRule of NAMED_ENTITY_REGISTRY) {
      if (entRule.type === 'model' && entRule.pattern.test(text)) {
        const matchedModel = entRule.modelId || text.match(entRule.pattern)?.[0]?.toUpperCase();
        if (matchedModel) {
          useCounselStore.getState().setSelectedCustomerModel(matchedModel);
          useCounselStore.getState().showToast(`[장비 모델 감지: ${matchedModel}] 고객 장비 매핑 완료`);
          setTimeout(() => useCounselStore.getState().clearToast(), 3000);
        }
        break;
      }
    }

    // 4. Action SOP Auto-Check (Reads fresh checklist after symptom trigger)
    const latestChecklist = useCounselStore.getState().actionChecklist;
    for (const entRule of NAMED_ENTITY_REGISTRY) {
      if (entRule.type === 'action' && entRule.pattern.test(text)) {
        const targetIdx = entRule.actionIndex ? Math.min(entRule.actionIndex, latestChecklist.length) : 0;
        if (targetIdx > 0 && latestChecklist[targetIdx - 1] && !latestChecklist[targetIdx - 1].checked) {
          useCounselStore.getState().toggleChecklist(targetIdx);
          useCounselStore.getState().showToast(`[조치 발화 감지: ${latestChecklist[targetIdx - 1].text.slice(0, 18)}...] 자동 체크 완료`);
          setTimeout(() => useCounselStore.getState().clearToast(), 3000);
        }
        break;
      }
    }
  }, []);

  const formatTimer = (sec: number) => {
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  // Function to process incoming speech (Shared across Live Mic, Web Speech, and Digital Audio Sync)
  const processIncomingSpeechUtterance = useCallback((rawText: string) => {
    if (!rawText || !rawText.trim()) return;
    const trimmed = rawText.trim();
    const liveStore = useCounselStore.getState();
    
    // 텍스트 앞머리에 이미 [mm:ss] 타임스탬프가 있는지 확인
    const hasTimestamp = /^\[\d{1,2}:\d{2}(?::\d{2})?\]/.test(trimmed);
    
    let timestampStr = '';
    if (!hasTimestamp) {
      const currentAudioTime = globalAudioRef.current ? globalAudioRef.current.currentTime : liveStore.audioCurrentTime;
      const targetSec = liveStore.activeAudioFile && currentAudioTime > 0 ? Math.floor(currentAudioTime) : liveStore.callSeconds;
      timestampStr = `[${formatTimer(targetSec)}] `;
    } else {
      const m = trimmed.match(/^(\[\d{1,2}:\d{2}(?::\d{2})?\])\s*/);
      if (m) timestampStr = `${m[1]} `;
    }

    const fullRawLine = hasTimestamp ? trimmed : `${timestampStr}${trimmed}`.trim();

    // 순수 텍스트(타임스탬프 분리된 본문)로 문맥 보정 및 규칙 평가
    const cleanContent = fullRawLine.replace(/^\[\d{1,2}:\d{2}(?::\d{2})?\]\s*/, '');
    const { correctedText, corrections } = applyContextualCorrection(cleanContent);
    const fullCorrectedLine = `${timestampStr}${correctedText}`.trim();

    liveStore.appendFinalParagraph(fullRawLine, fullCorrectedLine, corrections);
    evaluateUtteranceRules(correctedText);
  }, [evaluateUtteranceRules]);

  // Direct Text Conversation Parser (Instant Diagnosis & SOP Checklist trigger)
  const handlePasteText = (content: string, sourceName = '대화록 텍스트') => {
    if (!content || !content.trim()) return;
    resetSessionForNewAudio();
    clearAudioFile();

    const rawLines = content.split('\n');
    const validLines: string[] = [];

    for (const rawLine of rawLines) {
      const trimmed = rawLine.trim();
      if (!trimmed) continue;
      validLines.push(trimmed);
    }

    if (validLines.length === 0) return;

    // Process all conversation turns in order
    validLines.forEach(line => {
      processIncomingSpeechUtterance(line);
    });

    showToast(`[${sourceName}] ${validLines.length}줄 분석: 증상/고객/조치 표출 완료`);
    setTimeout(() => clearToast(), 3500);
  };

  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const transcriptBoxRef = useRef<HTMLDivElement | null>(null);

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
      } catch (_) {}
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
        } catch (_) {}
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
              const rawLine = msg.full_line || (msg.timestamp ? `${msg.timestamp} ${cleanText}` : cleanText);
              const correctedLine = msg.timestamp ? `${msg.timestamp} ${correctedText}` : correctedText;
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
          } catch (_) {}
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
        } catch (_) {}
        loopbackWsRef.current = null;
      }
    };
  }, [sttEngine, gpuServerOnline, loopbackDevice, activeAudioFile, appendFinalParagraph, showToast, clearToast, setRecording]);


  // 16kHz Mono Float32Array -> 16-bit PCM WAV Blob 인코더 (실시간 단일 발화 청크 전송용)
  const encodeWav16kMono = (samples: Float32Array, sampleRate = 16000): Blob => {
    const numSamples = samples.length;
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);
    const writeStr = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };
    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeStr(36, 'data');
    view.setUint32(40, numSamples * 2, true);
    let offset = 44;
    for (let i = 0; i < numSamples; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return new Blob([buffer], { type: 'audio/wav' });
  };

  // 통화 파일명에서 발신자/고객사/모델 힌트 초기 추출
  const applyCallerHintFromFilename = useCallback((filename: string) => {
    const stem = filename.replace(/\.[^.]+$/, '').replace(/^통화\s*녹음\s*/, '');
    // 예: 20240423_100933_수림종합관리_담당자 또는 20180504_173816_유동준님(베스트환경산업)
    const parts = stem.split('_').filter(p => !/^\d{6,8}$/.test(p) && p !== '파싱실패');
    if (parts.length === 0) return;

    const rawInfo = parts.join(' ');
    const phoneMatch = rawInfo.match(/0\d{1,2}-?\d{3,4}-?\d{4}/);
    const parenMatch = rawInfo.match(/([가-힣A-Za-z0-9]+)\(([^)]+)\)/);
    let custName = '통화 발신 고객사 (음성 식별 대기)';
    let mgrName = '발신 담당자';
    let phoneStr = phoneMatch ? phoneMatch[0] : '발신번호 확인중';
    let modelStr = '통화 중 장비모델 자동 식별 대기';

    const modelMatch = rawInfo.match(/\b(J600T?|J800|S12L?|S7P?|S5|S3|S2|S1|R3)\b/i);
    if (modelMatch) {
      modelStr = modelMatch[1].toUpperCase();
    }

    if (parenMatch) {
      mgrName = parenMatch[1].trim();
      custName = parenMatch[2].trim();
    } else {
      const nonPhone = rawInfo.replace(/0\d{1,2}-?\d{3,4}-?\d{4}/g, '').replace(/\b(J600T?|J800|S12L?|S7P?|S5|S3|S2|S1|R3)\b/gi, '').trim();
      if (nonPhone) {
        const tokens = nonPhone.split(/\s+/);
        custName = tokens[0] || custName;
        if (tokens[1]) mgrName = tokens[1];
      }
    }

    selectCustomer({
      id: `live-call-${Date.now()}`,
      name: custName,
      manager: mgrName,
      phone: phoneStr,
      address: '통화 중 현장 위치 자동 식별',
      addressDetail: `원본 통화: ${filename}`,
      assetModel: modelStr,
      serialNumber: 'SN-LIVE-DETECT',
      salesType: '실시간 통화 분석',
      warrantyRemaining: '보증 상태 확인중',
      historyTimeline: [
        { date: '실시간 통화', title: `[${filename}] 통화 음성 실시간 분석 진행 중` }
      ]
    });
  }, [selectCustomer]);

  const processAudioWithActiveEngine = useCallback(async (file: File) => {
    // 1. 신규 오디오 세션 ID 발급 (이전 파일의 진행 중인 비동기 Clova 응답 및 디코딩 무효화)
    const mySessionId = ++audioSessionIdRef.current;

    // 2. 기존 재생 중인 오디오 및 타이머/STT 스트림 즉시 강제 정지 (정지 버튼을 누른 것과 동일한 선행 초기화)
    if (webSpeechCommitTimerRef.current) {
      clearTimeout(webSpeechCommitTimerRef.current);
      webSpeechCommitTimerRef.current = null;
    }
    if (globalAudioRef.current) {
      globalAudioRef.current.pause();
      try {
        globalAudioRef.current.currentTime = 0;
      } catch (_) {}
    }
    setIsAudioPlaying(false);
    setAudioTime(0, 0);
    setInterimSttText('');

    // 3. 이전 세그먼트 및 실시간 VAD 커서 완전 초기화
    audioSegmentsRef.current = [];
    decodedPcm16kRef.current = null;
    realtimeVadRef.current = {
      cursorFrame: 0,
      inSpeech: false,
      speechStartFrame: 0,
      silenceFrames: 0,
      noiseFloor: 220,
      inflightCount: 0,
      lastChunkLabel: '',
    };

    // 4. 화면 상담 세션 초기화 및 파일명 기반 발신자 힌트 세팅
    resetSessionForNewAudio();
    applyCallerHintFromFilename(file.name);

    // 5. 백엔드 루프백 버퍼 클리어 요청
    if (loopbackWsRef.current && loopbackWsRef.current.readyState === WebSocket.OPEN) {
      try {
        loopbackWsRef.current.send(JSON.stringify({ action: 'clear_buffer' }));
      } catch (_) {}
    }

    // 6. 16kHz PCM 버퍼를 먼저 디코딩 준비한 뒤 오디오 재생 시작 (재생 시작 시점에 버퍼 누락 방지)
    try {
      const arrayBuffer = await file.arrayBuffer();
      if (audioSessionIdRef.current !== mySessionId) return;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const tempCtx = new AudioCtx();
      const decoded = await tempCtx.decodeAudioData(arrayBuffer.slice(0));
      await tempCtx.close().catch(() => {});
      if (audioSessionIdRef.current !== mySessionId) return;

      const targetSr = 16000;
      const offlineCtx = new OfflineAudioContext(1, Math.ceil(decoded.duration * targetSr), targetSr);
      const src = offlineCtx.createBufferSource();
      src.buffer = decoded;
      src.connect(offlineCtx.destination);
      src.start(0);
      const rendered = await offlineCtx.startRendering();
      if (audioSessionIdRef.current !== mySessionId) return;

      decodedPcm16kRef.current = rendered.getChannelData(0);
      realtimeVadRef.current = {
        cursorFrame: 0,
        inSpeech: false,
        speechStartFrame: 0,
        silenceFrames: 0,
        noiseFloor: 220,
        inflightCount: 0,
        lastChunkLabel: '',
      };
    } catch (err) {
      console.warn("실시간 오디오 버퍼 디코딩 실패:", err);
    }

    if (audioSessionIdRef.current !== mySessionId) return;

    // 7. 새 오디오 파일 URL 마운트 및 00:00부터 즉시 재생 시작
    setActiveAudioFile(file);
    setIsAudioPlaying(true);
    setRecording(true);

    setTimeout(() => {
      if (audioSessionIdRef.current !== mySessionId) return;
      if (globalAudioRef.current) {
        try {
          globalAudioRef.current.currentTime = 0;
          globalAudioRef.current.load();
          globalAudioRef.current.play().catch((e) => {
            console.warn("Auto play after file switch notice:", e);
          });
        } catch (_) {}
      }
      if (useCounselStore.getState().sttEngine === 'web_speech') {
        if (recognitionRef.current) {
          try { recognitionRef.current.abort(); } catch (_) {}
        }
        setTimeout(() => {
          if (audioSessionIdRef.current === mySessionId) {
            startSttStreaming();
          }
        }, 120);
      }
    }, 30);

    showToast(`[${file.name}] 통화 초기화 및 실시간 음성 수음 시작`);
    setTimeout(() => clearToast(), 3000);
  }, [resetSessionForNewAudio, applyCallerHintFromFilename, setActiveAudioFile, setIsAudioPlaying, setAudioTime, setInterimSttText, setRecording, startSttStreaming, showToast, clearToast]);







  // GLOBAL WINDOW DRAG & DROP & PASTE INTERCEPTOR
  useEffect(() => {
    const handleGlobalDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
    };

    const handleGlobalDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOverDropzone(false);

      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        
        // 1. If TXT conversation file is dropped -> Parse and process text directly!
        if (file.name.match(/\.(txt|log)$/i)) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const content = event.target?.result as string;
            if (content) {
              handlePasteText(content, file.name);
            }
          };
          reader.onerror = () => {
            console.error('FileReader 오류: 파일을 읽을 수 없습니다.', file.name);
          };
          reader.readAsText(file, 'utf-8');
          return;
        }


        // 2. If Audio file is dropped -> Process with active STT engine
        if (file.name.match(/\.(m4a|mp3|wav|ogg|aac|flac)$/i)) {
          processAudioWithActiveEngine(file);
        }
      }
    };

    const handleGlobalPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      const pastedText = e.clipboardData?.getData('text');
      if (pastedText && pastedText.trim().length > 0) {
        handlePasteText(pastedText, '클립보드 붙여넣기');
      }
    };

    window.addEventListener('dragover', handleGlobalDragOver);
    window.addEventListener('drop', handleGlobalDrop);
    window.addEventListener('paste', handleGlobalPaste);

    return () => {
      window.removeEventListener('dragover', handleGlobalDragOver);
      window.removeEventListener('drop', handleGlobalDrop);
      window.removeEventListener('paste', handleGlobalPaste);
    };
  }, [processAudioWithActiveEngine]);

  // Background Audio Controller Sync
  useEffect(() => {
    if (!globalAudioRef.current || !activeAudioUrl) return;

    if (isAudioPlaying) {
      globalAudioRef.current.play().catch((err) => {
        console.warn("Audio play blocked or waiting for user gesture:", err);
      });
    } else {
      globalAudioRef.current.pause();
    }
  }, [isAudioPlaying, activeAudioUrl]);

  const flushCompletedSpeechChunkToClova = useCallback((startSec: number, endSec: number, currentPlayheadSec: number) => {
    const pcm16k = decodedPcm16kRef.current;
    if (!pcm16k) return;
    const capturedSessionId = audioSessionIdRef.current;

    // 인과율 강제(Zero Future Lookahead): 절대로 현재 재생 시점(currentPlayheadSec) 이후의 미래 샘플은 잘라내지 못하도록 하드 클램핑
    const safeEndSec = Math.min(endSec, currentPlayheadSec);
    if (safeEndSec - startSec < 0.65) return;

    const startSample = Math.max(0, Math.floor(startSec * 16000));
    const endSample = Math.min(pcm16k.length, Math.floor(safeEndSec * 16000));
    if (endSample <= startSample) return;

    const slice = pcm16k.subarray(startSample, endSample);
    const wavBlob = encodeWav16kMono(slice, 16000);

    const m1 = String(Math.floor(startSec / 60)).padStart(2, '0');
    const s1 = String(Math.floor(startSec % 60)).padStart(2, '0');
    const m2 = String(Math.floor(safeEndSec / 60)).padStart(2, '0');
    const s2 = String(Math.floor(safeEndSec % 60)).padStart(2, '0');
    const chunkLabel = `${m1}:${s1} ~ ${m2}:${s2}`;

    const vad = realtimeVadRef.current;
    vad.inflightCount += 1;
    vad.lastChunkLabel = chunkLabel;

    const formData = new FormData();
    formData.append('file', wavBlob, `chunk_${startSec.toFixed(1)}_${safeEndSec.toFixed(1)}.wav`);

    fetch(`http://127.0.0.1:8000/api/v1/stt/clova-chunk?start=${startSec.toFixed(2)}&end=${safeEndSec.toFixed(2)}`, {
      method: 'POST',
      body: formData
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        // 다른 파일로 전환되었거나 정지된 경우 이전 파일의 지연 응답은 즉시 폐기
        if (audioSessionIdRef.current !== capturedSessionId) return;
        const cleanText = (data.text || '').trim();
        if (cleanText) {
          processIncomingSpeechUtterance(`[${m1}:${s1}] ${cleanText}`);
        }
      })
      .catch((err) => {
        console.warn('Clova 실시간 청크 전사 실패:', err);
      })
      .finally(() => {
        if (audioSessionIdRef.current !== capturedSessionId) return;
        const curVad = realtimeVadRef.current;
        curVad.inflightCount = Math.max(0, curVad.inflightCount - 1);
        if (!curVad.inSpeech && curVad.inflightCount === 0) {
          setInterimSttText('');
        }
      });
  }, [processIncomingSpeechUtterance, setInterimSttText]);

  const handleAudioTimeUpdate = useCallback((currentTimeSec: number, isEnded = false) => {
    const pcm16k = decodedPcm16kRef.current;
    if (!pcm16k || sttEngine !== 'naver_clova') return;

    // 재생 중이 아닐 때(일시정지/정지 직후 currentTime=0 리셋 이벤트 등)는 수음/전송 금지
    if (!isEnded && (!globalAudioRef.current || globalAudioRef.current.paused)) {
      return;
    }

    const vad = realtimeVadRef.current;
    const frameLen = 1600; // 100ms @ 16kHz
    const totalFrames = Math.floor(pcm16k.length / frameLen);
    // 오직 현재 스피커로 재생 완료된 시점(currentTimeSec)까지만 프레임 스캔 (미래 프레임 스캔 절대 금지)
    const targetFrame = Math.min(totalFrames, Math.floor(currentTimeSec * 10));

    // 사용자가 재생바를 뒤로 되감기한 경우 커서 리셋
    if (targetFrame < vad.cursorFrame - 3) {
      vad.cursorFrame = targetFrame;
      vad.inSpeech = false;
      vad.silenceFrames = 0;
    }

    for (let f = vad.cursorFrame; f < targetFrame; f++) {
      let sumSq = 0;
      const base = f * frameLen;
      for (let j = 0; j < frameLen; j++) {
        const v = pcm16k[base + j] * 32767;
        sumSq += v * v;
      }
      const rms = Math.sqrt(sumSq / frameLen);

      if (!vad.inSpeech && rms < 400) {
        vad.noiseFloor = vad.noiseFloor * 0.94 + Math.max(160, rms * 1.9) * 0.06;
      }
      const threshold = Math.max(195, Math.min(380, vad.noiseFloor));

      if (rms > threshold) {
        if (!vad.inSpeech) {
          vad.inSpeech = true;
          vad.speechStartFrame = Math.max(0, f - 1);
        }
        vad.silenceFrames = 0;

        const speechDurSec = (f + 1 - vad.speechStartFrame) * 0.1;
        // 발화가 3.0초 이상 이어지다가 호흡이 살짝 낮아지거나, 4.0초에 도달하면 이미 재생 완료된 현재 시점까지만 끊어서 전송
        if ((speechDurSec >= 3.0 && rms < threshold * 1.35) || speechDurSec >= 4.0) {
          flushCompletedSpeechChunkToClova(vad.speechStartFrame * 0.1, (f + 1) * 0.1, currentTimeSec);
          vad.inSpeech = false;
          vad.silenceFrames = 0;
        }
      } else if (vad.inSpeech) {
        vad.silenceFrames += 1;
        const speechDurSec = (f - vad.speechStartFrame) * 0.1;
        // 발화 후 0.3초(3프레임) 침묵이 실제로 감지된 순간(발화가 끝난 직후)에만 해당 구간을 클로바로 전송
        if (vad.silenceFrames >= 3) {
          if (speechDurSec >= 0.7) {
            flushCompletedSpeechChunkToClova(vad.speechStartFrame * 0.1, f * 0.1, currentTimeSec);
          }
          vad.inSpeech = false;
          vad.silenceFrames = 0;
        }
      }
    }

    vad.cursorFrame = targetFrame;

    // 통화 파일이 끝까지 재생 완료된 경우 남아 있는 발화 버퍼 마무리 전송
    if (isEnded && vad.inSpeech) {
      const startSec = vad.speechStartFrame * 0.1;
      vad.inSpeech = false;
      vad.silenceFrames = 0;
      if (currentTimeSec - startSec >= 0.65) {
        flushCompletedSpeechChunkToClova(startSec, currentTimeSec, currentTimeSec);
      }
    }

    // 실시간 상태 표시줄 업데이트
    if (vad.inSpeech) {
      const startSec = vad.speechStartFrame * 0.1;
      const m1 = String(Math.floor(startSec / 60)).padStart(2, '0');
      const s1 = String(Math.floor(startSec % 60)).padStart(2, '0');
      const m2 = String(Math.floor(currentTimeSec / 60)).padStart(2, '0');
      const s2 = String(Math.floor(currentTimeSec % 60)).padStart(2, '0');
      const dur = Math.max(0.1, currentTimeSec - startSec).toFixed(1);
      setInterimSttText(`[실시간 음성 수음 중... (${m1}:${s1} ~ ${m2}:${s2} / ${dur}초)]`);
    } else if (vad.inflightCount > 0) {
      setInterimSttText(`[네이버 클로바 STT 변환 중... (${vad.lastChunkLabel})]`);
    } else {
      setInterimSttText('');
    }
  }, [sttEngine, flushCompletedSpeechChunkToClova, setInterimSttText]);

  // 실시간 통화 재생 중 150ms 주기로 스피커 재생 위치(currentTime)까지만 실시간 VAD 스캔
  useEffect(() => {
    if (!isAudioPlaying || !activeAudioFile) return;
    const timer = window.setInterval(() => {
      if (globalAudioRef.current && !globalAudioRef.current.paused) {
        const cur = globalAudioRef.current.currentTime;
        const dur = globalAudioRef.current.duration || 0;
        setAudioTime(cur, dur);
        handleAudioTimeUpdate(cur, false);
      }
    }, 150);
    return () => clearInterval(timer);
  }, [isAudioPlaying, activeAudioFile, setAudioTime, handleAudioTimeUpdate]);

  const handleManualFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      e.target.value = '';
      processAudioWithActiveEngine(file);
    }
  };

  const toggleAudioPlayback = () => {
    if (!activeAudioUrl || !globalAudioRef.current) return;
    if (!isAudioPlaying) {
      if (loopbackWsRef.current && loopbackWsRef.current.readyState === WebSocket.OPEN) {
        try { loopbackWsRef.current.send(JSON.stringify({ action: 'clear_buffer' })); } catch (_) {}
      }
      setIsAudioPlaying(true);
      setRecording(true);
      if (sttEngine === 'web_speech') {
        startSttStreaming();
      }
      globalAudioRef.current.play().catch(() => {});
    } else {
      setIsAudioPlaying(false);
      setRecording(false);
      if (sttEngine === 'web_speech') {
        stopSttStreaming();
      }
      globalAudioRef.current.pause();
    }
  };

  const stopAudioPlayback = () => {
    audioSessionIdRef.current += 1;
    if (globalAudioRef.current) {
      globalAudioRef.current.pause();
      globalAudioRef.current.currentTime = 0;
    }
    realtimeVadRef.current = {
      cursorFrame: 0,
      inSpeech: false,
      speechStartFrame: 0,
      silenceFrames: 0,
      noiseFloor: 220,
      inflightCount: 0,
      lastChunkLabel: '',
    };
    if (loopbackWsRef.current && loopbackWsRef.current.readyState === WebSocket.OPEN) {
      try { loopbackWsRef.current.send(JSON.stringify({ action: 'clear_buffer' })); } catch (_) {}
    }
    stopSttStreaming();
    setInterimSttText('');
    setIsAudioPlaying(false);
    setRecording(false);
    setAudioTime(0, 0);
    showToast("음성 재생 및 STT 수신이 즉시 중지되었습니다.");
    setTimeout(() => clearToast(), 2000);
  };

  const handleClearAudioFile = () => {
    audioSessionIdRef.current += 1;
    if (globalAudioRef.current) {
      globalAudioRef.current.pause();
      globalAudioRef.current.currentTime = 0;
      globalAudioRef.current.removeAttribute('src');
      globalAudioRef.current.load();
    }
    audioSegmentsRef.current = [];
    decodedPcm16kRef.current = null;
    realtimeVadRef.current = {
      cursorFrame: 0,
      inSpeech: false,
      speechStartFrame: 0,
      silenceFrames: 0,
      noiseFloor: 220,
      inflightCount: 0,
      lastChunkLabel: '',
    };
    if (loopbackWsRef.current && loopbackWsRef.current.readyState === WebSocket.OPEN) {
      try { loopbackWsRef.current.send(JSON.stringify({ action: 'clear_buffer' })); } catch (_) {}
    }
    stopSttStreaming();
    setInterimSttText('');
    setIsAudioPlaying(false);
    setRecording(false);
    clearAudioFile();
    showToast("음성 파일 및 STT 수신이 즉시 제거되었습니다.");
    setTimeout(() => clearToast(), 2000);
  };


  const formatAudioTime = (sec: number) => {
    if (isNaN(sec) || !isFinite(sec)) return "00:00";
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(Math.floor(sec % 60)).padStart(2, '0');
    return `${m}:${s}`;
  };

  // 통화 활성화 상태 (Faster-Whisper 스트리밍 수신 중이거나, Web Speech 녹음 중이거나, 오디오 재생 중)
  const isCallActive = isAudioStreamingActive || (sttEngine === 'web_speech' && isRecording) || isAudioPlaying;

  // Call timer interval - 가상 오디오 스트리밍이 진행되는 동안에만 1초씩 카운트
  useEffect(() => {
    let timer: number | null = null;
    if (isCallActive) {
      timer = window.setInterval(() => {
        incrementCallTimer();
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isCallActive, incrementCallTimer]);



  // Auto-scroll transcript box when new speech arrives (스마트 스크롤: 위로 스크롤 시 튕김 방지)
  useEffect(() => {
    if (transcriptBoxRef.current && !isUserScrolledUp) {
      transcriptBoxRef.current.scrollTop = transcriptBoxRef.current.scrollHeight;
    }
  }, [finalParagraphs, interimSttText, isUserScrolledUp]);

  // Live Audio Level Visualizer
  useEffect(() => {
    if (isRecording) {
      navigator.mediaDevices?.getUserMedia({ audio: true })
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
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, [isRecording]);

  // Robust Persistent Web Speech API with Multi-Entity & Action Auto-Trigger
  useEffect(() => {
    if (sttEngine !== 'web_speech') {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (_) {}
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

    recognition.onresult = (event: any) => {
      if (isDisposed) return;
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript + ' ';
        } else {
          interim += transcript;
        }
      }

      if (final.trim()) {
        if (webSpeechCommitTimerRef.current) {
          clearTimeout(webSpeechCommitTimerRef.current);
          webSpeechCommitTimerRef.current = null;
        }
        const rawSentence = final.trim();
        processIncomingSpeechUtterance(rawSentence);
        setInterimSttText('');
      } else if (interim) {
        setInterimSttText(interim);
        if (webSpeechCommitTimerRef.current) {
          clearTimeout(webSpeechCommitTimerRef.current);
        }
        const capturedInterim = interim.trim();
        const capturedSessionId = audioSessionIdRef.current;
        webSpeechCommitTimerRef.current = window.setTimeout(() => {
          if (!isDisposed && audioSessionIdRef.current === capturedSessionId && capturedInterim) {
            processIncomingSpeechUtterance(capturedInterim);
            setInterimSttText('');
          }
          webSpeechCommitTimerRef.current = null;
        }, webSpeechSilenceSecRef.current * 1000);
      }

      const currentStream = interim.trim() || final.trim();
      if (currentStream) {
        evaluateUtteranceRules(currentStream);
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
      if (!isDisposed && isRecordingRef.current && useCounselStore.getState().sttEngine === 'web_speech') {
        setTimeout(() => {
          if (!isDisposed && isRecordingRef.current && useCounselStore.getState().sttEngine === 'web_speech') {
            try {
              recognition.start();
            } catch (_) {
              setTimeout(() => {
                if (!isDisposed && isRecordingRef.current && useCounselStore.getState().sttEngine === 'web_speech') {
                  try { recognition.start(); } catch (_) {}
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
      } catch (_) {}
    }

    const handleWindowFocus = () => {
      if (!isDisposed && isRecordingRef.current && recognitionRef.current && useCounselStore.getState().sttEngine === 'web_speech') {
        try {
          recognitionRef.current.start();
        } catch (_) {}
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
      } catch (_) {}
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
      } catch (_) {}
    }
  }, [isRecording, sttEngine]);


  const handleKeywordSelect = (entity: KeywordEntity) => {
    setActiveKeywordEntity(entity);
    showToast(`키워드 [${entity.keyword}] 어시스트 조회 연동 완료`);
    setTimeout(() => clearToast(), 2500);
  };

  const handleCustomerSelect = (customer: CustomerInfo) => {
    selectCustomer(customer);
    showToast(`고객사 [${customer.name}] 선택 완료`);
    setTimeout(() => clearToast(), 2500);
  };

  const handleActionSelect = (rule: EntityRule) => {
    if (rule.actionIndex && actionChecklist[rule.actionIndex - 1]) {
      toggleChecklist(rule.actionIndex);
      showToast(`조치 체크리스트 [${rule.label}] 전환`);
      setTimeout(() => clearToast(), 2500);
    }
  };

  const handleResolveComplete = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";
      const authToken = import.meta.env.VITE_DEV_TOKEN || "space-advisor-desktop-agent";
      const res = await fetch(`${apiBase}/counsel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({
          customer_id: selectedCustomer.id,
          customer_name: selectedCustomer.name,
          manager: selectedCustomer.manager,
          serial_number: selectedCustomer.serialNumber || "",
          model_name: selectedCustomer.assetModel || "",
          keyword: activeKeywordEntity?.keyword || "1차 셀프조치 해결",
          part_code: activeKeywordEntity?.partCode || "",
          symptoms: rawParagraphs.join(" ") || "1차 상담 셀프 조치 완료",
          action_taken: actionChecklist.filter(c => c.checked).map(c => c.text).join(", ") || activeKeywordEntity?.selfActionGuide || "전화 안내 조치 완료",
          is_completed: true,
          is_visit_required: false
        })
      });
      if (!res.ok) {
        throw new Error(`상담 저장 실패 (HTTP ${res.status}): ${res.statusText}`);
      }
      showToast("1차 셀프조치 해결 이력이 DB에 정상 등록되었습니다.");
    } catch (e) {
      console.error("셀프조치 저장 실패:", e);
      showToast(`DB 저장 실패: ${e instanceof Error ? e.message : '네트워크 오류'}`);
    } finally {
      setIsSubmitting(false);
    }
    setTimeout(() => clearToast(), 3500);
  };

  const handleConfirmDispatch = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";
      const res = await fetch(`${apiBase}/visits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: selectedCustomer.id,
          customer_name: selectedCustomer.name,
          manager: selectedCustomer.manager,
          phone: selectedCustomer.phone,
          address: selectedCustomer.address,
          address_detail: selectedCustomer.addressDetail,
          assigned_engineer: assignedEngineer,
          dispatch_date: dispatchDate,
          request_note: dispatchNote,
          client_type: "desktop"
        })
      });
      if (!res.ok) {
        throw new Error(`배차 등록 실패 (HTTP ${res.status}): ${res.statusText}`);
      }
      setDispatchDrawerOpen(false);
      showToast(`[${selectedCustomer.name}] 출장 배차 접수가 정상 등록되었습니다.`);
    } catch (e) {
      console.error("배차 저장 실패:", e);
      showToast(`배차 접수 실패: ${e instanceof Error ? e.message : '서버 통신 실패'}`);
    } finally {
      setIsSubmitting(false);
    }
    setTimeout(() => clearToast(), 4000);
  };

  const handleConfirmSalesTransfer = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";
      const res = await fetch(`${apiBase}/sales`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inquiry_type: salesTransferType,
          customer_name: selectedCustomer.name,
          manager: selectedCustomer.manager,
          manager_phone: selectedCustomer.phone,
          request_note: salesTransferNote,
          client_type: "desktop"
        })
      });
      if (!res.ok) {
        throw new Error(`영업 이관 실패 (HTTP ${res.status}): ${res.statusText}`);
      }
      setSalesModalOpen(false);
      showToast(`영업팀으로 신규 견적 문의가 성공적으로 이관되었습니다.`);
    } catch (e) {
      console.error("영업 이관 실패:", e);
      showToast(`영업 이관 실패: ${e instanceof Error ? e.message : '서버 통신 실패'}`);
    } finally {
      setIsSubmitting(false);
    }
    setTimeout(() => clearToast(), 3500);
  };

  const activeParagraphs = isContextCorrectionEnabled ? finalParagraphs : rawParagraphs;
  const checkedCount = actionChecklist.filter(c => c.checked).length;
  const totalCount = actionChecklist.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', backgroundColor: 'var(--canvas)', color: 'var(--ink)' }}>
      
      {/* Permanent Background Audio Element (Real Hardware Speaker Output & Digital Stream Sync) */}
      <audio
        ref={globalAudioRef}
        src={activeAudioUrl || undefined}
        preload="auto"
        onCanPlay={(e) => {
          if (isAudioPlaying) {
            e.currentTarget.play().catch(() => {});
          }
        }}
        onTimeUpdate={(e) => {
          const target = e.currentTarget;
          setAudioTime(target.currentTime, target.duration || 0);
          handleAudioTimeUpdate(target.currentTime);
        }}
        onLoadedMetadata={(e) => {
          const target = e.currentTarget;
          setAudioTime(target.currentTime, target.duration || 0);
          if (isAudioPlaying) {
            target.play().catch(() => {});
          }
        }}
        onEnded={(e) => {
          const target = e.currentTarget;
          handleAudioTimeUpdate(target.duration || target.currentTime, true);
          if (realtimeVadRef.current.inflightCount === 0) {
            setInterimSttText('');
          }
          setIsAudioPlaying(false);
          setRecording(false);
          showToast("⏹️ 음성 파일 재생 완료 (STT 수신이 자동으로 종료되었습니다)");
          setTimeout(() => clearToast(), 3500);
        }}
        onError={(e) => {
          console.error("Audio Load Error:", e);
        }}
      />

      {/* Hidden File Input for Direct Audio Choice */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.m4a,.mp3,.wav,.aac,.ogg,.flac"
        onChange={handleManualFileSelect}
        style={{ display: 'none' }}
      />


      
      {/* ========================================================= */}
      {/* 1. TOP GLOBAL NAVIGATION (Linear High-Density Bar)        */}
      {/* ========================================================= */}
      <header style={{ 
        height: '50px', 
        borderBottom: '1px solid var(--hairline)', 
        backgroundColor: 'var(--surface-1)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        padding: '0 16px',
        flexShrink: 0
      }}>
        {/* Brand & Counselor */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, whiteSpace: 'nowrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--accent-primary)', boxShadow: '0 0 8px var(--glow-color)', flexShrink: 0 }} />
            <span style={{ fontWeight: 700, fontSize: '15px', letterSpacing: '-0.3px', color: 'var(--ink)', whiteSpace: 'nowrap' }}>
              Space Advisor <span style={{ fontWeight: 400, color: 'var(--ink-muted)', fontSize: '13.5px' }}>상담지원1</span>
            </span>
          </div>

          <div style={{ height: '16px', width: '1px', backgroundColor: 'var(--hairline)', flexShrink: 0 }} />

          <span style={{ fontSize: '13.5px', color: 'var(--ink-muted)', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
            상담원: <strong style={{ color: 'var(--ink)', fontWeight: 600 }}>{counselorName}</strong>
          </span>
        </div>

        {/* Live Audio & STT Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, whiteSpace: 'nowrap' }}>
          {/* Real-time Streaming Status Badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 9px',
            borderRadius: '4px',
            backgroundColor: isCallActive ? 'rgba(239, 68, 68, 0.12)' : 'var(--surface-2)',
            border: `1px solid ${isCallActive ? 'var(--accent-danger)' : 'var(--hairline)'}`,
            fontSize: '13.5px',
            color: isCallActive ? 'var(--accent-danger)' : 'var(--ink-muted)',
            whiteSpace: 'nowrap'
          }}>
            <Radio size={12} className={isCallActive ? "animate-pulse" : ""} />
            <span>상태: <strong>{isCallActive ? "음성 스트리밍 수신 중" : "대기"}</strong></span>
          </div>

          {/* Dedicated Mic Test Button */}
          <button
            onClick={() => setIsMicTestOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 12px',
              borderRadius: '6px',
              backgroundColor: 'var(--surface-2)',
              border: '1px solid var(--hairline)',
              color: 'var(--ink)',
              fontSize: '13.5px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Volume2 size={14} style={{ color: 'var(--accent-primary)' }} />
            <span className="nowrap">마이크 테스트</span>
          </button>

          {/* Live Call Duration */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px', 
            padding: '4px 10px', 
            borderRadius: '6px', 
            backgroundColor: isCallActive ? 'rgba(239, 68, 68, 0.15)' : callSeconds > 0 ? 'rgba(59, 130, 246, 0.12)' : 'var(--surface-2)', 
            border: `1px solid ${isCallActive ? 'rgba(239, 68, 68, 0.4)' : callSeconds > 0 ? 'rgba(59, 130, 246, 0.3)' : 'var(--hairline)'}`,
            color: isCallActive ? 'var(--accent-danger)' : callSeconds > 0 ? '#93c5fd' : 'var(--ink-muted)',
            fontSize: '13.5px',
            fontWeight: 600
          }}>
            <PhoneCall size={14} className={isCallActive ? "animate-pulse" : ""} />
            <span className="nowrap">{isCallActive ? "통화중" : callSeconds > 0 ? "통화종료" : "대기"}</span>
            <span className="font-mono">{formatTimer(callSeconds)}</span>
          </div>


          {/* Always-On Live Visualizer Indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 12px',
            borderRadius: '6px',
            backgroundColor: 'var(--surface-2)',
            border: '1px solid var(--hairline)',
            fontSize: '13.5px',
            color: 'var(--ink)'
          }}>
            <Mic size={14} style={{ color: 'var(--accent-success)' }} />
            <span className="nowrap" style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--accent-success)' }}>
              상시 수신 대기
            </span>
            <span style={{
              display: 'inline-flex',
              alignItems: 'flex-end',
              gap: '2px',
              height: '12px',
              marginLeft: '4px'
            }}>
              <span style={{ width: '3px', height: `${Math.max(20, micAudioLevel)}%`, backgroundColor: 'var(--accent-success)', borderRadius: '1px' }} />
              <span style={{ width: '3px', height: `${Math.max(40, micAudioLevel * 1.2)}%`, backgroundColor: 'var(--accent-success)', borderRadius: '1px' }} />
              <span style={{ width: '3px', height: `${Math.max(10, micAudioLevel * 0.8)}%`, backgroundColor: 'var(--accent-success)', borderRadius: '1px' }} />
            </span>
          </div>

        </div>
      </header>

      {/* ========================================================= */}
      {/* 2. THREE-PANE TRIAGE WORKSTATION LAYOUT (Intercom/Linear) */}
      {/* ========================================================= */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden', padding: '8px', gap: '8px' }}>
        
        {/* ------------------------------------------------------- */}
        {/* PANEL A: 고객 & 장비 & 이력 패널 (28% 폭)               */}
        {/* ------------------------------------------------------- */}
        <section style={{ 
          width: '28%', 
          minHeight: 0,
          backgroundColor: 'var(--surface-1)', 
          border: '1px solid var(--hairline)', 
          borderRadius: '8px', 
          display: 'flex', 
          flexDirection: 'column', 
          overflow: 'hidden' 
        }}>
          {/* Panel Header & Customer Search */}
          <div style={{ padding: '12px', borderBottom: '1px solid var(--hairline)', flexShrink: 0 }}>
            <label style={{ fontSize: '13.5px', color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', display: 'block' }}>
              고객사 실시간 식별 및 검색
            </label>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--ink-subtle)' }} />
              <input
                type="text"
                placeholder="고객사명 또는 전화번호 4자리... (↑/↓ 키보드 탐색)"
                value={searchQuery}
                onFocus={() => {
                  setSearchDropdownOpen(true);
                  setSelectedSearchIndex(-1);
                }}
                onKeyDown={(e) => {
                  if (!searchDropdownOpen || customerList.length === 0) return;
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSelectedSearchIndex((prev) => (prev < customerList.length - 1 ? prev + 1 : 0));
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSelectedSearchIndex((prev) => (prev > 0 ? prev - 1 : customerList.length - 1));
                  } else if (e.key === 'Enter') {
                    e.preventDefault();
                    const targetCust = selectedSearchIndex >= 0 ? customerList[selectedSearchIndex] : customerList[0];
                    if (targetCust) {
                      selectCustomer(targetCust);
                      setSearchDropdownOpen(false);
                      setSelectedSearchIndex(-1);
                    }
                  } else if (e.key === 'Escape') {
                    setSearchDropdownOpen(false);
                    setSelectedSearchIndex(-1);
                  }
                }}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedSearchIndex(-1);
                }}
                style={{
                  width: '100%',
                  padding: '8px 8px 8px 32px',
                  backgroundColor: 'var(--surface-2)',
                  border: '1px solid var(--hairline)',
                  borderRadius: '6px',
                  color: 'var(--ink)',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
              {searchDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  top: '40px',
                  left: 0,
                  right: 0,
                  backgroundColor: 'var(--surface-2)',
                  border: '1px solid var(--hairline)',
                  borderRadius: '6px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  zIndex: 50,
                  maxHeight: '180px',
                  overflowY: 'auto'
                }}>
                  {customerList.map((cust, idx) => (
                    <div
                      key={cust.id}
                      onClick={() => {
                        selectCustomer(cust);
                        setSearchDropdownOpen(false);
                        setSelectedSearchIndex(-1);
                      }}
                      style={{
                        padding: '8px 12px',
                        borderBottom: '1px solid var(--hairline)',
                        cursor: 'pointer',
                        fontSize: '13.5px',
                        backgroundColor: idx === selectedSearchIndex ? 'var(--surface-hover)' : 'transparent'
                      }}
                      onMouseEnter={() => setSelectedSearchIndex(idx)}
                    >
                      <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{cust.name}</div>
                      <div style={{ color: 'var(--ink-muted)', fontSize: '13.5px' }}>{cust.manager} · {cust.phone}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Panel Body: Scrollable Customer & Asset Specs */}
          <div style={{ flex: 1, minHeight: 0, padding: '12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            
            {/* Customer Info Card */}
            <div style={{ backgroundColor: 'var(--surface-2)', padding: '12px', borderRadius: '6px', border: '1px solid var(--hairline)', flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--ink)' }}>{selectedCustomer.name}</span>
                <span style={{ fontSize: '13.5px', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'var(--badge-bg)', color: 'var(--badge-text)', fontWeight: 600 }}>
                  {selectedCustomer.salesType}
                </span>
              </div>
              <div style={{ fontSize: '13.5px', color: 'var(--ink-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div><span style={{ color: 'var(--ink-subtle)', marginRight: 6 }}>담당자</span><strong style={{ color: 'var(--ink)' }}>{selectedCustomer.manager}</strong> ({selectedCustomer.phone})</div>
                <div><span style={{ color: 'var(--ink-subtle)', marginRight: 6 }}>주소</span>{selectedCustomer.address} {selectedCustomer.addressDetail}</div>
              </div>
            </div>

            {/* Asset Info Card */}
            <div style={{ backgroundColor: 'var(--surface-2)', padding: '12px', borderRadius: '6px', border: '1px solid var(--hairline)', flexShrink: 0 }}>
              <div style={{ fontSize: '13.5px', color: 'var(--ink-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '6px' }}>
                보유 장비 및 보증 상태
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>
                {selectedCustomer.assetModel}
              </div>
              <div style={{ fontSize: '13.5px', display: 'flex', justifyContent: 'space-between', color: 'var(--ink-muted)' }}>
                <span>시리얼: <span className="font-mono" style={{ color: 'var(--ink)' }}>{selectedCustomer.serialNumber}</span></span>
                <span style={{ color: 'var(--accent-warning)', fontWeight: 600 }}>{selectedCustomer.warrantyRemaining}</span>
              </div>
            </div>

            {/* 30-Day History & Warning Timeline */}
            <div style={{ backgroundColor: 'var(--surface-2)', padding: '12px', borderRadius: '6px', border: '1px solid var(--hairline)', flex: 1, minHeight: '120px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <Clock size={13} style={{ color: 'var(--ink-muted)' }} />
                <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--ink-muted)', textTransform: 'uppercase' }}>
                  최근 30일 상담/정비 이력 타임라인
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {selectedCustomer.historyTimeline.map((item, idx) => (
                  <div 
                    key={idx}
                    style={{
                      padding: '8px',
                      borderRadius: '4px',
                      backgroundColor: item.isWarning ? 'rgba(245, 158, 11, 0.12)' : 'var(--surface-1)',
                      border: item.isWarning ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid var(--hairline)',
                      fontSize: '13.5px'
                    }}
                  >
                    <div style={{ fontSize: '13.5px', color: item.isWarning ? 'var(--accent-warning)' : 'var(--ink-muted)', fontWeight: 600 }}>
                      {item.date}
                    </div>
                    <div style={{ color: item.isWarning ? 'var(--accent-warning)' : 'var(--ink)', fontWeight: item.isWarning ? 600 : 400, marginTop: '2px' }}>
                      {item.title}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </section>

        {/* ------------------------------------------------------- */}
        {/* PANEL B: 실시간 STT 음성 & AI 진단 패널 (38% 폭)       */}
        {/* ------------------------------------------------------- */}
        <section style={{ 
          width: '38%', 
          minHeight: 0,
          backgroundColor: 'var(--surface-1)', 
          border: '1px solid var(--hairline)', 
          borderRadius: '8px', 
          display: 'flex', 
          flexDirection: 'column', 
          overflow: 'hidden' 
        }}>
          {/* Panel Header & Live Activity */}
          <div style={{ padding: '12px', borderBottom: '1px solid var(--hairline)', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', gap: '8px', flexWrap: 'nowrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, whiteSpace: 'nowrap' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap' }}>
                  전사 자막 및 개체 감지
                </span>
                
                {/* STT 엔진 선택 세그먼트 버튼 */}
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  backgroundColor: '#e2e8f0',
                  padding: '3px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  gap: '3px',
                  flexShrink: 0
                }}>
                  <button
                    onClick={() => {
                      if (recognitionRef.current) {
                        try { recognitionRef.current.stop(); } catch (_) {}
                      }
                      const curSec = globalAudioRef.current ? globalAudioRef.current.currentTime : 0;
                      realtimeVadRef.current.cursorFrame = curSec > 2.0 ? Math.floor(curSec * 10) : 0;
                      realtimeVadRef.current.inSpeech = false;
                      realtimeVadRef.current.silenceFrames = 0;
                      setSttEngine('naver_clova');
                      showToast('STT 엔진: NAVER CLOVA Speech 전환');
                      setTimeout(() => clearToast(), 2500);
                    }}
                    style={{
                      padding: '4px 10px',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      color: sttEngine === 'naver_clova' ? '#ffffff' : '#334155',
                      backgroundColor: sttEngine === 'naver_clova' ? '#059669' : 'transparent',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      boxShadow: sttEngine === 'naver_clova' ? '0 1px 3px rgba(0,0,0,0.18)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    네이버 클로바 STT
                  </button>

                  <button
                    onClick={() => {
                      setSttEngine('web_speech');
                      setInterimSttText('');
                      if (isAudioPlaying && recognitionRef.current) {
                        try { recognitionRef.current.start(); } catch (_) {}
                      }
                      showToast('STT 엔진: 브라우저 Web Speech 전환');
                      setTimeout(() => clearToast(), 2500);
                    }}
                    style={{
                      padding: '4px 10px',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      color: sttEngine === 'web_speech' ? '#ffffff' : '#334155',
                      backgroundColor: sttEngine === 'web_speech' ? '#1d4ed8' : 'transparent',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      boxShadow: sttEngine === 'web_speech' ? '0 1px 3px rgba(0,0,0,0.18)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    브라우저 내장 STT
                  </button>
                </div>
              </div>
              
              {/* Dynamic Mic Activity Indicator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, whiteSpace: 'nowrap' }}>
                {isRecording && (
                  <span style={{ fontSize: '12.5px', color: '#047857', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                    <Volume2 size={13} className="animate-pulse" /> 수신 중 ({Math.max(15, micAudioLevel)}%)
                  </span>
                )}
                <span style={{ fontSize: '12.5px', color: isRecording ? '#047857' : '#475569', fontWeight: 700, whiteSpace: 'nowrap' }}>
                  {isRecording ? "● 가동 중" : "대기 상태"}
                </span>
              </div>
            </div>

            {/* 5-Entity Color Scheme Legend Bar */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              flexWrap: 'wrap',
              gap: '6px', 
              fontSize: '12.5px', 
              backgroundColor: '#f1f5f9', 
              padding: '6px 10px', 
              borderRadius: '6px', 
              border: '1px solid #cbd5e1',
              marginBottom: '8px'
            }}>
              <span style={{ color: '#334155', fontWeight: 700 }}>식별 범례:</span>
              <span style={{ color: '#1e3a8a', backgroundColor: '#bfdbfe', border: '1px solid #60a5fa', padding: '2px 7px', borderRadius: '4px', fontWeight: 700 }}>
                고객사/담당자 (청색)
              </span>
              <span style={{ color: '#78350f', backgroundColor: '#fde68a', border: '1px solid #f59e0b', padding: '2px 7px', borderRadius: '4px', fontWeight: 700 }}>
                현장/위치 (황색)
              </span>
              <span style={{ color: '#581c87', backgroundColor: '#e9d5ff', border: '1px solid #c084fc', padding: '2px 7px', borderRadius: '4px', fontWeight: 700 }}>
                장비모델 (보라)
              </span>
              <span style={{ color: '#7f1d1d', backgroundColor: '#fecaca', border: '1px solid #f87171', padding: '2px 7px', borderRadius: '4px', fontWeight: 700 }}>
                고장증상 (적색)
              </span>
              <span style={{ color: '#064e3b', backgroundColor: '#a7f3d0', border: '1px solid #34d399', padding: '2px 7px', borderRadius: '4px', fontWeight: 700 }}>
                조치사항 (녹색)
              </span>
            </div>

            <div style={{ 
              backgroundColor: '#eff6ff', 
              border: '1px solid #93c5fd', 
              borderRadius: '6px', 
              padding: '6px 10px', 
              fontSize: '13px', 
              color: '#1e40af',
              fontWeight: 600,
              lineHeight: 1.4 
            }}>
              [ARS 고지 필수] "본 통화는 품질 향상 및 AI 상담 지원을 위해 녹음/분석됩니다."
            </div>
          </div>

          {/* STT Header Bar & PLAY/STOP BUTTONS DIRECTLY ABOVE TEXT BOX */}
          <div style={{ 
            padding: '8px 12px', 
            borderBottom: '1px solid var(--hairline)', 
            backgroundColor: activeAudioFile ? '#e0f2fe' : '#f8fafc',
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            flexShrink: 0,
            transition: 'background-color 0.2s ease'
          }}>
            {/* Left: Transcript title or Active Audio Info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
              {activeAudioFile ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                  <FileAudio size={16} style={{ color: '#0284c7', flexShrink: 0 }} />
                  <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {activeAudioFile.name}
                  </span>
                  <span className="font-mono" style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                    ({formatAudioTime(audioCurrentTime)} / {formatAudioTime(audioDuration)})
                  </span>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13.5px', color: '#475569', fontWeight: 600 }}>
                    음성 파일(.m4a)을 선택하여 실시간 통화 데모를 시작하세요
                  </span>
                </div>
              )}
            </div>

            {/* Right: PLAY / PAUSE / STOP BUTTONS (DIRECTLY ABOVE TEXT BOX) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
              {activeAudioFile ? (
                <>
                  <button
                    onClick={toggleAudioPlayback}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px',
                      backgroundColor: isAudioPlaying ? 'var(--accent-danger)' : 'var(--accent-primary)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '13.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: isAudioPlaying ? '0 0 10px rgba(239, 68, 68, 0.4)' : '0 0 10px rgba(37, 99, 235, 0.4)'
                    }}
                  >
                    {isAudioPlaying ? <Pause size={12} /> : <Play size={12} />}
                    <span>{isAudioPlaying ? '일시정지' : '스피커 재생'}</span>
                  </button>

                  <button
                    onClick={stopAudioPlayback}
                    title="음성 정지"
                    style={{
                      padding: '4px 8px',
                      backgroundColor: 'var(--surface-3)',
                      color: 'var(--ink)',
                      border: '1px solid var(--hairline)',
                      borderRadius: '4px',
                      fontSize: '13.5px',
                      cursor: 'pointer'
                    }}
                  >
                    <Square size={11} />
                  </button>

                  <button
                    onClick={handleClearAudioFile}
                    title="음성 파일 제거"
                    style={{
                      padding: '4px 6px',
                      background: 'none',
                      color: 'var(--ink-muted)',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <X size={14} />
                  </button>

                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    title="다른 음성(.m4a) 파일 열기"
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '4px', 
                      padding: '4px 8px', 
                      backgroundColor: 'var(--surface-2)', 
                      border: '1px solid var(--hairline)', 
                      borderRadius: '4px', 
                      color: 'var(--ink)', 
                      fontSize: '13.5px', 
                      cursor: 'pointer', 
                      fontWeight: 600 
                    }}
                  >
                    <Upload size={12} />
                    <span>.m4a 변경</span>
                  </button>
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    title="음성(.m4a) 파일 열기"
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '4px', 
                      padding: '5px 12px', 
                      backgroundColor: 'var(--accent-primary)', 
                      border: 'none', 
                      borderRadius: '4px', 
                      color: '#fff', 
                      fontSize: '13.5px', 
                      cursor: 'pointer', 
                      fontWeight: 700,
                      boxShadow: '0 0 10px rgba(37, 99, 235, 0.4)'
                    }}
                  >
                    <Upload size={13} />
                    <span>.m4a 열기</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* STT Live Transcript Box: ACTS AS THE DROPZONE (FIXED HEIGHT RATIO WITH SCROLLBAR) */}
          <div 
            style={{ 
              flex: '1 1 50%', 
              minHeight: '160px', 
              maxHeight: '50%',
              padding: '10px', 
              display: 'flex', 
              flexDirection: 'column', 
              borderBottom: '1px solid var(--hairline)',
              overflow: 'hidden',
              position: 'relative'
            }}
          >
            <div 
              ref={transcriptBoxRef}
              onDragEnter={() => setIsDragOverDropzone(true)}
              onDragLeave={() => setIsDragOverDropzone(false)}
              onScroll={(e) => {
                const target = e.currentTarget;
                const isUp = target.scrollHeight - target.scrollTop - target.clientHeight > 80;
                setIsUserScrolledUp(isUp);
              }}
              style={{ 
                flex: 1, 
                minHeight: 0,
                backgroundColor: isDragOverDropzone ? 'rgba(37, 99, 235, 0.18)' : 'var(--surface-2)', 
                border: isDragOverDropzone ? '2px dashed var(--accent-primary)' : '1px solid var(--hairline)', 
                borderRadius: '6px', 
                padding: '12px', 
                overflowY: 'auto',
                overflowX: 'hidden',
                wordBreak: 'break-word',
                fontSize: '14px',
                lineHeight: 1.6,
                color: 'var(--ink)',
                position: 'relative',
                transition: 'all 0.15s ease'
              }}
            >
              {/* Dragging Overlay Guide */}
              {isDragOverDropzone && (
                <div style={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: 'rgba(37, 99, 235, 0.25)',
                  backdropFilter: 'blur(2px)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '14px',
                  zIndex: 20,
                  borderRadius: '6px'
                }}>
                  <Upload size={32} style={{ marginBottom: '8px', color: '#93c5fd' }} />
                  <span>음성(.m4a) 파일을 놓으면 실시간 재생 분석됩니다.</span>
                </div>
              )}

              {activeParagraphs.length > 0 ? (
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, fontSize: '14px' }}>
                  {activeParagraphs.map((line, pIdx) => {
                    const match = line.match(/^(\[\d{1,2}:\d{2}(?::\d{2})?\])\s*(.*)$/);
                    const timestampBadge = match ? match[1] : null;
                    const contentText = match ? match[2] : line;

                    return (
                      <div key={pIdx} style={{ display: 'flex', alignItems: 'baseline', gap: '8px', minHeight: '1.5em', marginBottom: '2px' }}>
                        {timestampBadge && (
                          <span style={{ 
                            fontFamily: 'monospace', 
                            fontSize: '13.5px', 
                            fontWeight: 600, 
                            color: 'var(--ink-muted)', 
                            backgroundColor: 'var(--surface-3)', 
                            border: '1px solid var(--hairline)', 
                            borderRadius: '3px', 
                            padding: '0px 5px', 
                            flexShrink: 0,
                            whiteSpace: 'nowrap',
                            userSelect: 'none'
                          }}>
                            {timestampBadge}
                          </span>
                        )}
                        <div style={{ flex: 1 }}>
                          {renderMultiColorHighlightedText(
                            contentText,
                            {
                              onSymptomClick: handleKeywordSelect,
                              onCustomerClick: handleCustomerSelect,
                              onSiteClick: handleCustomerSelect,
                              onModelClick: (modelId) => {
                                setSelectedCustomerModel(modelId);
                                showToast(`[장비모델 클릭: ${modelId}] 선택 고객 장비 매핑 완료`);
                                setTimeout(() => clearToast(), 2500);
                              },
                              onActionClick: handleActionSelect
                            },
                            activeKeywordEntity?.id,
                            selectedCustomer?.id,
                            customerList
                          )}
                        </div>
                      </div>
                    );
                  })}


                  {/* Real-time Interim Streaming Words on current line */}
                  {interimSttText && (
                    <div style={{ minHeight: '1.4em', marginTop: '2px' }}>
                      <span style={{ 
                        color: '#1e40af', 
                        backgroundColor: '#dbeafe', 
                        border: '1px solid #93c5fd',
                        padding: '2px 8px', 
                        borderRadius: '4px', 
                        fontWeight: 700,
                        fontSize: '13.5px',
                        letterSpacing: '-0.2px'
                      }}>
                        {interimSttText}
                      </span>
                      {isRecording && (
                        <span className="animate-pulse" style={{ display: 'inline-block', width: '6px', height: '14px', backgroundColor: 'var(--accent-primary)', marginLeft: '4px', verticalAlign: 'middle' }} />
                      )}
                    </div>
                  )}
                </div>
              ) : interimSttText ? (
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, fontSize: '14px' }}>
                  <span style={{ 
                    color: '#1e40af', 
                    backgroundColor: '#dbeafe', 
                    border: '1px solid #93c5fd',
                    padding: '2px 8px', 
                    borderRadius: '4px', 
                    fontWeight: 700,
                    fontSize: '13.5px',
                    letterSpacing: '-0.2px'
                  }}>
                    {interimSttText}
                  </span>
                  {isRecording && (
                    <span className="animate-pulse" style={{ display: 'inline-block', width: '6px', height: '14px', backgroundColor: 'var(--accent-primary)', marginLeft: '4px', verticalAlign: 'middle' }} />
                  )}
                </div>
              ) : (
                <div style={{ color: 'var(--ink-subtle)', padding: '24px 8px', textAlign: 'center', fontSize: '13.5px' }}>
                  음성 파일(.m4a)을 선택하거나 음성 인식을 시작하면 실시간 전사 자막이 표시됩니다.
                </div>
              )}
            </div>
            {isUserScrolledUp && (
              <button
                onClick={() => {
                  if (transcriptBoxRef.current) {
                    transcriptBoxRef.current.scrollTop = transcriptBoxRef.current.scrollHeight;
                    setIsUserScrolledUp(false);
                  }
                }}
                style={{
                  position: 'absolute',
                  bottom: '16px',
                  right: '16px',
                  backgroundColor: 'var(--accent-primary)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '16px',
                  padding: '6px 12px',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  cursor: 'pointer',
                  zIndex: 10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span>최신 발화 이동</span>
                <span>↓</span>
              </button>
            )}
          </div>

          {/* Detected Keywords & Diagnosis Panel (FIXED HEIGHT RATIO WITH SCROLLBAR) */}
          <div style={{ flex: '1 1 50%', minHeight: '160px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <label style={{ fontSize: '13.5px', color: 'var(--ink-muted)', display: 'block', fontWeight: 600 }}>
                    이번 통화 실시간 감지 증상 ({detectedKeywordEntities.length}건)
                  </label>
                  {justTriggeredKeyword && (
                    <span style={{ fontSize: '13.5px', color: 'var(--accent-success)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Zap size={12} /> [{justTriggeredKeyword}] 포착!
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setShowAllSymptoms(!showAllSymptoms)}
                  style={{
                    fontSize: '13.5px',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: showAllSymptoms ? 'var(--accent-primary)' : 'var(--surface-2)',
                    border: '1px solid var(--hairline)',
                    color: showAllSymptoms ? '#fff' : 'var(--ink-muted)',
                    cursor: 'pointer'
                  }}
                >
                  {showAllSymptoms ? '전체 목록 닫기' : '+ 전체 6대 증상 목록'}
                </button>
              </div>

              {/* Dynamic Detected Symptoms from THIS Call */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', minHeight: '32px', alignItems: 'center' }}>
                {detectedKeywordEntities.length > 0 ? (
                  detectedKeywordEntities.map((entity) => {
                    const isSelected = activeKeywordEntity?.id === entity.id;
                    return (
                      <button
                        key={entity.id}
                        onClick={() => handleKeywordSelect(entity)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '5px 12px',
                          borderRadius: '6px',
                          backgroundColor: isSelected ? 'var(--accent-primary)' : 'rgba(37, 99, 235, 0.12)',
                          border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'rgba(37, 99, 235, 0.35)'}`,
                          color: isSelected ? '#fff' : '#93c5fd',
                          fontSize: '13.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          boxShadow: isSelected ? '0 1px 3px rgba(0, 0, 0, 0.2)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span>#{entity.keyword}</span>
                        <span style={{ fontSize: '13.5px', opacity: 0.85, fontWeight: 500 }}>({entity.category})</span>
                      </button>
                    );
                  })
                ) : (
                  <div style={{ fontSize: '13.5px', color: 'var(--ink-subtle)', padding: '4px 0' }}>
                    포착된 증상 키워드가 없습니다.
                  </div>
                )}
              </div>

              {/* Collapsible Full Symptoms Catalog (Optional Manual Lookup) */}
              {showAllSymptoms && (
                <div style={{ marginTop: '8px', padding: '8px', backgroundColor: 'var(--surface-3)', borderRadius: '6px', border: '1px solid var(--hairline)' }}>
                  <div style={{ fontSize: '13.5px', color: 'var(--ink-muted)', marginBottom: '4px', fontWeight: 600 }}>
                    수동 증상 선택 카탈로그 (전체 6대 분류):
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {DOMAIN_KEYWORD_REGISTRY.map((entity) => {
                      const isSelected = activeKeywordEntity?.id === entity.id;
                      return (
                        <button
                          key={entity.id}
                          onClick={() => {
                            addDetectedKeywordEntity(entity);
                            handleKeywordSelect(entity);
                          }}
                          style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            backgroundColor: isSelected ? 'var(--accent-primary)' : 'var(--badge-bg)',
                            border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--hairline)'}`,
                            color: isSelected ? '#fff' : 'var(--badge-text)',
                            fontSize: '13.5px',
                            fontWeight: 500,
                            cursor: 'pointer'
                          }}
                        >
                          #{entity.keyword}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Diagnosis Result Card */}
            {matchedDiagnosis ? (
              <div style={{ 
                backgroundColor: 'var(--surface-2)', 
                padding: '12px', 
                borderRadius: '6px', 
                border: justTriggeredKeyword ? '1px solid var(--accent-primary)' : '1px solid var(--hairline)',
                boxShadow: justTriggeredKeyword ? '0 2px 8px rgba(37, 99, 235, 0.25)' : 'none',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                flexShrink: 0
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--accent-primary)' }}>{matchedDiagnosis.category}</span>
                  <span style={{ fontSize: '13.5px', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-success)', fontWeight: 600 }}>
                    신뢰도 {matchedDiagnosis.confidence}%
                  </span>
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ink)', marginBottom: '6px' }}>
                  {matchedDiagnosis.partName}
                </div>
                <div style={{ fontSize: '13.5px', color: 'var(--ink-muted)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>부품코드: <strong className="font-mono" style={{ color: 'var(--ink)' }}>{matchedDiagnosis.partCode}</strong></span>
                  <span>본사재고: <strong style={{ color: matchedDiagnosis.stock > 0 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>{matchedDiagnosis.stock}개 보유</strong></span>
                </div>
              </div>
            ) : (
              <div style={{ backgroundColor: 'var(--surface-2)', padding: '16px', borderRadius: '6px', border: '1px dashed var(--hairline)', textAlign: 'center', color: 'var(--ink-muted)', fontSize: '13.5px', flexShrink: 0 }}>
                상담 대화 중 증상 키워드가 감지되면 해당 부품 및 가이드가 자동 표출됩니다.
              </div>
            )}

            {/* Manual Override Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexShrink: 0 }}>
              <label style={{ fontSize: '13.5px', color: 'var(--ink-muted)' }}>
                상담사 수동 진단 교정 (AI 추천 불일치 시 직접 입력)
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  placeholder="오수탱크 하단 드레인 호스 파손 등..."
                  value={manualOverrideKeyword}
                  onChange={(e) => setManualOverrideKeyword(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    backgroundColor: 'var(--surface-2)',
                    border: '1px solid var(--hairline)',
                    borderRadius: '4px',
                    color: 'var(--ink)',
                    fontSize: '13.5px'
                  }}
                />
                <button 
                  onClick={async () => {
                    const kw = manualOverrideKeyword.trim();
                    if (!kw) return;
                    try {
                      const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";
                      const res = await fetch(`${apiBase}/counsel/classify`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ text: kw })
                      });
                      if (res.ok) {
                        const data = await res.json();
                        const scriptList = Array.isArray(data.action_script) && data.action_script.length > 0
                          ? data.action_script
                          : ["1단계: 전원 차단 및 육안 점검", "2단계: 부품 체결 및 세척 확인", "3단계: 재가동 테스트"];
                        
                        setDiagnosisResult(
                          [kw],
                          {
                            category: "수동 교정 진단",
                            partCode: data.part_code || "MANUAL_PART",
                            partName: data.keyword || kw,
                            stock: 12,
                            confidence: data.confidence || 1.0,
                            source: data.source || "manual_override",
                            selfActionGuide: scriptList[0] || "1차 셀프조치 가이드를 확인하십시오."
                          },
                          scriptList
                        );
                        showToast(`키워드 [${kw}] 진단·부품·SOP 교정 적용 완료`);
                      } else {
                        showToast(`수동 교정 키워드 [${kw}] 적용 완료`);
                      }
                    } catch (err) {
                      console.error("교정 API 호출 실패:", err);
                      showToast(`수동 교정 키워드 [${kw}]가 적용되었습니다.`);
                    }
                    setTimeout(() => clearToast(), 3500);
                  }}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: 'var(--surface-3)',
                    border: '1px solid var(--hairline)',
                    borderRadius: '4px',
                    color: 'var(--ink)',
                    fontSize: '13.5px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  교정 적용
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------- */}
        {/* PANEL C: 표준 조치 체크리스트 & 전환 액션 (34% 폭)       */}
        {/* ------------------------------------------------------- */}
        <section style={{ 
          width: '34%', 
          minHeight: 0,
          backgroundColor: 'var(--surface-1)', 
          border: '1px solid var(--hairline)', 
          borderRadius: '8px', 
          display: 'flex', 
          flexDirection: 'column', 
          overflow: 'hidden' 
        }}>
          {/* Panel Header & Progress */}
          <div style={{ padding: '12px', borderBottom: '1px solid var(--hairline)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ink)' }}>
              표준 조치 체크리스트 (SOP)
            </span>
            <span style={{ fontSize: '13.5px', fontWeight: 700, color: totalCount > 0 && checkedCount === totalCount ? 'var(--accent-success)' : 'var(--accent-primary)' }}>
              {totalCount > 0 ? `${checkedCount} / ${totalCount} 완료 (${Math.round((checkedCount / totalCount) * 100)}%)` : '대기'}
            </span>
          </div>

          {/* Self Action Counselor Script Card */}
          {matchedDiagnosis?.selfActionGuide && (
            <div style={{
              margin: '12px 12px 0 12px',
              padding: '10px 12px',
              backgroundColor: '#eff6ff',
              border: '1px solid #93c5fd',
              borderRadius: '6px',
              fontSize: '13.5px',
              lineHeight: 1.4,
              color: '#0f172a',
              fontWeight: 600,
              flexShrink: 0
            }}>
              <div style={{ fontWeight: 700, color: '#1d4ed8', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <HelpCircle size={13} />
                상담사 안내 권장 스크립트:
              </div>
              "{matchedDiagnosis.selfActionGuide}"
            </div>
          )}

          {/* Checklist Items Container */}
          <div style={{ flex: 1, minHeight: 0, padding: '12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {actionChecklist.length > 0 ? (
              actionChecklist.map((item) => (
                <div
                  key={item.id}
                  onClick={() => toggleChecklist(item.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '10px',
                    borderRadius: '6px',
                    backgroundColor: item.checked ? '#ecfdf5' : '#ffffff',
                    border: item.checked ? '1.5px solid #10b981' : '1px solid #cbd5e1',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    flexShrink: 0
                  }}
                >
                  <button style={{ background: 'none', border: 'none', color: item.checked ? '#047857' : '#64748b', cursor: 'pointer', marginTop: '1px' }}>
                    {item.checked ? <CheckSquare size={16} /> : <Square size={16} />}
                  </button>
                  <div style={{ flex: 1, fontSize: '14px', lineHeight: 1.4, fontWeight: item.checked ? 700 : 500, color: item.checked ? '#065f46' : '#0f172a', textDecoration: item.checked ? 'line-through' : 'none' }}>
                    <strong style={{ marginRight: '4px', color: item.checked ? '#047857' : '#475569' }}>{item.id}.</strong> {item.text}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--ink-muted)', fontSize: '13.5px' }}>
                진단이 시작되면 1~5단계 표준 점검 체크리스트가 표출됩니다.
              </div>
            )}
          </div>

          {/* Bottom Action Command Center */}
          <div style={{ padding: '12px', borderTop: '1px solid var(--hairline)', backgroundColor: 'var(--surface-2)', display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
            
            {/* Action 1: 1-Click Resolve Complete */}
            <button
              onClick={handleResolveComplete}
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '11px',
                backgroundColor: isSubmitting ? 'var(--surface-3)' : 'var(--accent-success)',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <CheckCircle2 size={16} />
              {isSubmitting ? '처리 중...' : '셀프조치 완료 (종결)'}
            </button>

            {/* Dual Action: Dispatch vs Sales Transfer */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setDispatchDrawerOpen(true)}
                disabled={isSubmitting}
                style={{
                  flex: 1.2,
                  padding: '11px',
                  backgroundColor: isSubmitting ? 'var(--surface-3)' : 'var(--accent-primary)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Wrench size={15} />
                출장 배차 접수
              </button>

              <button
                onClick={() => setSalesModalOpen(true)}
                disabled={isSubmitting}
                style={{
                  flex: 0.8,
                  padding: '11px',
                  backgroundColor: 'var(--surface-3)',
                  color: 'var(--ink)',
                  border: '1px solid var(--hairline)',
                  borderRadius: '6px',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Building2 size={14} />
                영업팀 이관
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* ========================================================= */}
      {/* 3. CENTER DISPATCH BOOKING MODAL                          */}
      {/* ========================================================= */}
      {dispatchDrawerOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            animation: 'fadeIn 0.15s ease-out'
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setDispatchDrawerOpen(false); }}
        >
          <div style={{
            width: '500px',
            maxHeight: '90vh',
            backgroundColor: 'var(--surface-1)',
            border: '1px solid var(--hairline)',
            borderRadius: '8px',
            boxShadow: '0 16px 40px rgba(0,0,0,0.8)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
          {/* Drawer Header */}
          <div style={{ padding: '16px', borderBottom: '1px solid var(--hairline)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Wrench size={18} style={{ color: 'var(--accent-primary)' }} />
              출장 배차 접수
            </span>
            <button onClick={() => setDispatchDrawerOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--ink-muted)', cursor: 'pointer' }}>
              <X size={18} />
            </button>
          </div>

          {/* Drawer Form Body */}
          <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            {/* Auto-filled Summary */}
            <div style={{ backgroundColor: 'var(--surface-2)', padding: '12px', borderRadius: '6px', border: '1px solid var(--hairline)', fontSize: '13.5px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div><span style={{ color: 'var(--ink-subtle)', marginRight: 6 }}>고객사</span><strong style={{ color: 'var(--ink)' }}>{selectedCustomer.name}</strong></div>
              <div><span style={{ color: 'var(--ink-subtle)', marginRight: 6 }}>방문지</span>{selectedCustomer.address} {selectedCustomer.addressDetail}</div>
              <div><span style={{ color: 'var(--ink-subtle)', marginRight: 6 }}>연락처</span>{selectedCustomer.manager} ({selectedCustomer.phone})</div>
              <div><span style={{ color: 'var(--ink-subtle)', marginRight: 6 }}>대상 장비</span>{selectedCustomer.assetModel} ({selectedCustomer.serialNumber})</div>
            </div>

            {/* Engineer Assignment */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '13.5px', color: 'var(--ink-muted)' }}>출장 담당 정비기사 배정</label>
              <select 
                value={assignedEngineer} 
                onChange={(e) => setAssignedEngineer(e.target.value)}
                style={{ padding: '8px', backgroundColor: 'var(--surface-2)', border: '1px solid var(--hairline)', borderRadius: '4px', color: 'var(--ink)', fontSize: '14px' }}
              >
                <option value="김철수 정비기사 (화성/경기남부)">김철수 정비기사 (화성/경기남부 관할)</option>
                <option value="박영호 정비기사 (인천/서울서부)">박영호 정비기사 (인천/서울서부 관할)</option>
                <option value="이지훈 정비기사 (평택/충청북부)">이지훈 정비기사 (평택/충청북부 관할)</option>
              </select>
            </div>

            {/* Visit Date & Time */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '13.5px', color: 'var(--ink-muted)' }}>방문 희망일시</label>
              <input 
                type="text" 
                value={dispatchDate} 
                onChange={(e) => setDispatchDate(e.target.value)}
                style={{ padding: '8px', backgroundColor: 'var(--surface-2)', border: '1px solid var(--hairline)', borderRadius: '4px', color: 'var(--ink)', fontSize: '14px' }}
              />
            </div>

            {/* Dispatch Note */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '13.5px', color: 'var(--ink-muted)' }}>정비기사 전달 요청 메모</label>
              <textarea 
                rows={4}
                value={dispatchNote} 
                onChange={(e) => setDispatchNote(e.target.value)}
                style={{ padding: '8px', backgroundColor: 'var(--surface-2)', border: '1px solid var(--hairline)', borderRadius: '4px', color: 'var(--ink)', fontSize: '13.5px', lineHeight: 1.4 }}
              />
            </div>

          </div>

          {/* Drawer Footer CTA */}
          <div style={{ padding: '16px', borderTop: '1px solid var(--hairline)', backgroundColor: 'var(--surface-2)' }}>
            <button
              onClick={handleConfirmDispatch}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: 'var(--accent-primary)',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              배차 확정 및 기사 모바일 앱 전송
            </button>
          </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. SALES TRANSFER MODAL                                   */}
      {/* ========================================================= */}
      {salesModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }}>
          <div style={{
            width: '440px',
            backgroundColor: 'var(--surface-1)',
            border: '1px solid var(--hairline)',
            borderRadius: '8px',
            padding: '20px',
            boxShadow: '0 16px 32px rgba(0,0,0,0.8)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--ink)' }}>영업팀 분기 이관 접수</span>
              <button onClick={() => setSalesModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--ink-muted)', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ fontSize: '14px', color: 'var(--ink-muted)', marginBottom: '12px' }}>
              고객사 <strong style={{ color: 'var(--ink)' }}>{selectedCustomer.name}</strong>의 단순 견적/계약 문의를 영업팀 리드 대장으로 이관합니다.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
              <label style={{ fontSize: '13.5px', color: 'var(--ink-muted)' }}>이관 유형</label>
              <select 
                value={salesTransferType}
                onChange={(e) => setSalesTransferType(e.target.value)}
                style={{ padding: '8px', backgroundColor: 'var(--surface-2)', border: '1px solid var(--hairline)', borderRadius: '4px', color: 'var(--ink)', fontSize: '14px' }}
              >
                <option value="신규 렌탈 견적서 요청">신규 렌탈 견적서 요청</option>
                <option value="장비 추가 도입 및 계약 변경">장비 추가 도입 및 계약 변경</option>
                <option value="단순 소모품 구매 견적">단순 소모품 구매 견적</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '16px' }}>
              <label style={{ fontSize: '13.5px', color: 'var(--ink-muted)' }}>상세 요청사항</label>
              <textarea
                value={salesTransferNote}
                onChange={(e) => setSalesTransferNote(e.target.value)}
                rows={3}
                style={{ padding: '8px', backgroundColor: 'var(--surface-2)', border: '1px solid var(--hairline)', borderRadius: '4px', color: 'var(--ink)', fontSize: '13.5px', resize: 'none' }}
              />
            </div>

            <button
              onClick={handleConfirmSalesTransfer}
              style={{
                width: '100%',
                padding: '11px',
                backgroundColor: 'var(--accent-warning)',
                color: '#0f172a',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              영업팀 대장 이관 완료
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. TOAST NOTIFICATION (3-Second Feedback)                 */}
      {/* ========================================================= */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'var(--surface-2)',
          border: '1px solid var(--accent-success)',
          color: 'var(--ink)',
          padding: '10px 20px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: 600,
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          zIndex: 200,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ========================================================= */}
      {/* 6. MIC TEST MODAL                                         */}
      {/* ========================================================= */}
      <MicTestModal isOpen={isMicTestOpen} onClose={() => setIsMicTestOpen(false)} />



      {/* ========================================================= */}
      {/* 8. LOCAL FASTER-WHISPER GPU LAUNCHER MODAL               */}
      {/* ========================================================= */}
      {isWhisperLauncherModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 160
        }}>
          <div style={{
            width: '560px',
            backgroundColor: 'var(--surface-1)',
            border: '1px solid var(--accent-primary)',
            borderRadius: '8px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 50px rgba(0,0,0,0.9)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={20} color="var(--accent-primary)" />
                <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--ink)' }}>로컬 Faster-Whisper GPU 에이전트 실행</span>
              </div>
              <button 
                onClick={() => setIsWhisperLauncherModalOpen(false)} 
                style={{ background: 'none', border: 'none', color: 'var(--ink-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ backgroundColor: 'var(--surface-2)', padding: '14px', borderRadius: '6px', border: '1px solid var(--hairline)', marginBottom: '16px' }}>
              <div style={{ fontSize: '13.5px', color: 'var(--ink-muted)', marginBottom: '6px', fontWeight: 600 }}>
                배치 파일 경로:
              </div>
              <div style={{ fontSize: '13.5px', fontFamily: 'monospace', color: 'var(--accent-primary)', backgroundColor: 'var(--surface-3)', padding: '8px 10px', borderRadius: '4px', wordBreak: 'break-all', marginBottom: '10px' }}>
                D:\01.AntiGravity\Space_consult_assist\start_backend_stt.bat
              </div>
              <div style={{ fontSize: '13.5px', color: 'var(--ink)' }}>
                이 파일을 <strong>더블클릭</strong>하여 실행하면 로컬 GPU 서버가 <code>localhost:8000</code>에서 즉시 켜집니다.
              </div>
            </div>

            {/* Live Polling Status Box */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              padding: '12px 16px', 
              borderRadius: '6px', 
              backgroundColor: gpuServerOnline ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.12)',
              border: `1px solid ${gpuServerOnline ? 'var(--accent-success)' : 'rgba(245, 158, 11, 0.3)'}`,
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {gpuServerOnline ? (
                  <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--accent-success)' }} className="animate-pulse" />
                ) : (
                  <Loader2 size={16} className="animate-spin" style={{ color: 'var(--accent-warning)' }} />
                )}
                <span style={{ fontSize: '14px', fontWeight: 700, color: gpuServerOnline ? 'var(--accent-success)' : 'var(--accent-warning)' }}>
                  {gpuServerOnline ? "GPU 엔진 연결됨" : "GPU 서버 대기 중"}
                </span>
              </div>
              <span style={{ fontSize: '13.5px', color: 'var(--ink-muted)' }}>
                {gpuServerOnline ? "포트 8000 정상" : "자동 감지 중"}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => {
                  navigator.clipboard.writeText("D:\\01.AntiGravity\\Space_consult_assist\\start_backend_stt.bat");
                  showToast("배치 파일 경로가 클립보드에 복사되었습니다.");
                  setTimeout(() => clearToast(), 3000);
                }}
                style={{
                  padding: '9px 16px',
                  backgroundColor: 'var(--surface-3)',
                  border: '1px solid var(--hairline)',
                  borderRadius: '6px',
                  color: 'var(--ink)',
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                파일명 복사
              </button>
              <button
                onClick={() => setIsWhisperLauncherModalOpen(false)}
                style={{
                  padding: '9px 20px',
                  backgroundColor: 'var(--accent-primary)',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontWeight: 700
                }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
