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
  const audioSegmentsRef = useRef<{ start: number; end: number; text: string; dispatched?: boolean }[]>([]);
  // ── STT 청크 시간 설정 ─────────────────────────────────────────────────────
  const whisperMaxChunkSec = 1.2;   // Whisper 최대 세그먼트 (초)
  const whisperSilenceSec = 0.2;     // Whisper 무음 감지 (초)
  const webSpeechSilenceSec = 1.0; // Web Speech 커밋 지연 (초)
  const webSpeechSilenceSecRef = useRef(1.0);
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

  // Standalone rule evaluator (Evaluates on live typing or speech without duplicate append)
  const evaluateUtteranceRules = (text: string) => {
    // 1. Symptom Keyword & Part Matching
    for (const entity of DOMAIN_KEYWORD_REGISTRY) {
      if (entity.synonyms.test(text)) {
        addDetectedKeywordEntity(entity);
        if (activeKeywordEntity?.id !== entity.id) {
          setActiveKeywordEntity(entity);
          setJustTriggeredKeyword(entity.keyword);
          setTimeout(() => setJustTriggeredKeyword(null), 3000);
          showToast(`[구어체 감지: ${entity.keyword}] 진단 및 조치 가이드 자동 표출`);
          setTimeout(() => clearToast(), 3000);
        }
        break;
      }
    }

    // 2. Customer Identification
    for (const entRule of NAMED_ENTITY_REGISTRY) {
      if (entRule.type === 'customer' && entRule.pattern.test(text)) {
        if (entRule.customerId && selectedCustomer?.id !== entRule.customerId) {
          const targetCust = customerList.find(c => c.id === entRule.customerId);
          if (targetCust) {
            selectCustomer(targetCust);
            showToast(`[고객사 감지: ${targetCust.name}] 자동 선택 완료`);
            setTimeout(() => clearToast(), 3000);
          }
        }
        break;
      }
    }

    // 3. Model Identification
    for (const entRule of NAMED_ENTITY_REGISTRY) {
      if (entRule.type === 'model' && entRule.pattern.test(text)) {
        if (entRule.modelId) {
          setSelectedCustomerModel(entRule.modelId);
          showToast(`[장비 모델 감지: ${entRule.modelId}] 고객 장비 매핑 완료`);
          setTimeout(() => clearToast(), 3000);
        }
        break;
      }
    }

    // 4. Action SOP Auto-Check
    for (const entRule of NAMED_ENTITY_REGISTRY) {
      if (entRule.type === 'action' && entRule.pattern.test(text)) {
        if (entRule.actionIndex && actionChecklist[entRule.actionIndex - 1] && !actionChecklist[entRule.actionIndex - 1].checked) {
          toggleChecklist(entRule.actionIndex);
          showToast(`[조치 발화 감지: ${actionChecklist[entRule.actionIndex - 1].text.slice(0, 18)}...] 자동 체크 완료`);
          setTimeout(() => clearToast(), 3000);
        }
        break;
      }
    }
  };

  const formatTimer = (sec: number) => {
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  // Function to process incoming speech (Shared across Live Mic, Web Speech, and Digital Audio Sync)
  const processIncomingSpeechUtterance = (rawText: string) => {
    if (!rawText || !rawText.trim()) return;
    const trimmed = rawText.trim();
    
    // 텍스트 앞머리에 이미 [mm:ss] 타임스탬프가 있는지 확인
    const hasTimestamp = /^\[\d{1,2}:\d{2}(?::\d{2})?\]/.test(trimmed);
    
    let timestampStr = '';
    if (!hasTimestamp) {
      // 오디오 파일 재생 중일 때는 오디오의 실제 현재 재생 시간(currentTime)을 최우선 기준으로 타임스탬프 동기화
      const currentAudioTime = globalAudioRef.current ? globalAudioRef.current.currentTime : audioCurrentTime;
      const targetSec = activeAudioFile && currentAudioTime > 0 ? Math.floor(currentAudioTime) : callSeconds;
      timestampStr = `[${formatTimer(targetSec)}] `;
    }

    const fullRawLine = `${timestampStr}${trimmed}`.trim();

    // 순수 텍스트(타임스탬프 분리된 본문)로 문맥 보정 및 규칙 평가
    const cleanContent = fullRawLine.replace(/^\[\d{1,2}:\d{2}(?::\d{2})?\]\s*/, '');
    const { correctedText, corrections } = applyContextualCorrection(cleanContent);
    const fullCorrectedLine = hasTimestamp ? fullRawLine : `${timestampStr}${correctedText}`.trim();

    appendFinalParagraph(fullRawLine, fullCorrectedLine, corrections);
    evaluateUtteranceRules(correctedText);
  };

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
    // Faster-Whisper GPU 모드 또는 NAVER CLOVA 모드 및 로컬 서버가 켜져 있으면 상시 루프백 연결 (Always-On)
    const isLoopbackEngine = sttEngine === 'whisper_large_v3' || sttEngine === 'naver_clova';
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
          // 연결이 비정상 종료된 경우 3초 후 자동 재연결
          if (!isDisposed && (sttEngine === 'whisper_large_v3' || sttEngine === 'naver_clova') && gpuServerOnline) {
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
  }, [sttEngine, gpuServerOnline, loopbackDevice, appendFinalParagraph, showToast, clearToast, setRecording]);


  const processAudioWithActiveEngine = useCallback(async (file: File) => {
    // 이전 세그먼트 및 세션 초기화
    audioSegmentsRef.current = [];
    resetSessionForNewAudio();
    setActiveAudioFile(file);
    setIsAudioPlaying(true);
    setRecording(true);

    // 백엔드 루프백 버퍼 클리어 요청
    if (loopbackWsRef.current && loopbackWsRef.current.readyState === WebSocket.OPEN) {
      try {
        loopbackWsRef.current.send(JSON.stringify({ action: 'clear_buffer' }));
      } catch (_) {}
    }

    // Faster-Whisper GPU 백엔드 고속 사전 전사 호출 (동기화 자막 생성)
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('http://127.0.0.1:8000/api/v1/stt/transcribe-file', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer space-advisor-desktop-agent'
        },
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.segments) && data.segments.length > 0) {
          audioSegmentsRef.current = data.segments.map((seg: any) => ({
            start: Number(seg.start) || 0,
            end: Number(seg.end) || 0,
            text: seg.text || '',
            dispatched: false
          }));
          showToast(`[${file.name}] 음성 전사 완료 (${data.segments.length}개 세그먼트 실시간 동기화)`);
          setTimeout(() => clearToast(), 3000);
        }
      }
    } catch (err) {
      console.warn("파일 고속 전사 API 실패, 루프백/Web Speech 폴백 유지:", err);
    }

    if (sttEngine === 'web_speech') {
      startSttStreaming();
      showToast(`[${file.name}] Web Speech STT 수신 시작`);
      setTimeout(() => clearToast(), 3500);
    }
  }, [sttEngine, resetSessionForNewAudio, setActiveAudioFile, setIsAudioPlaying, setRecording, startSttStreaming, showToast, clearToast]);







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


        // 2. If Audio file is dropped -> Process with active STT engine (Faster-Whisper GPU or Web Speech)
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

  const handleAudioTimeUpdate = (currentTimeSec: number) => {
    // 오디오 재생 시간에 맞추어 사전 분석된 STT 세그먼트를 실시간으로 화면과 규칙 엔진에 디스패치
    if (audioSegmentsRef.current && audioSegmentsRef.current.length > 0) {
      for (const seg of audioSegmentsRef.current) {
        if (!seg.dispatched && currentTimeSec >= seg.start) {
          seg.dispatched = true;
          processIncomingSpeechUtterance(seg.text);
        }
      }
    }
  };

  const handleManualFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      processAudioWithActiveEngine(file);
    }
  };

  const toggleAudioPlayback = () => {
    if (!activeAudioUrl || !globalAudioRef.current) return;
    if (!isAudioPlaying) {
      // 재생 시작 시 백엔드 잔여 버퍼 즉시 플러시
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
    if (globalAudioRef.current) {
      globalAudioRef.current.pause();
      globalAudioRef.current.currentTime = 0;
    }
    // 세그먼트 디스패치 플래그 초기화
    if (audioSegmentsRef.current) {
      audioSegmentsRef.current.forEach((s: { dispatched?: boolean }) => { s.dispatched = false; });
    }
    if (loopbackWsRef.current && loopbackWsRef.current.readyState === WebSocket.OPEN) {
      try { loopbackWsRef.current.send(JSON.stringify({ action: 'clear_buffer' })); } catch (_) {}
    }
    stopSttStreaming();
    setIsAudioPlaying(false);
    setRecording(false);
    setAudioTime(0, 0);
    showToast("음성 재생 및 STT 수신이 즉시 중지되었습니다.");
    setTimeout(() => clearToast(), 2000);
  };

  const handleClearAudioFile = () => {
    if (globalAudioRef.current) {
      globalAudioRef.current.pause();
      globalAudioRef.current.currentTime = 0;
      globalAudioRef.current.removeAttribute('src');
      globalAudioRef.current.load();
    }
    audioSegmentsRef.current = [];
    if (loopbackWsRef.current && loopbackWsRef.current.readyState === WebSocket.OPEN) {
      try { loopbackWsRef.current.send(JSON.stringify({ action: 'clear_buffer' })); } catch (_) {}
    }
    stopSttStreaming();
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
    // Faster-Whisper GPU 모드일 때는 Web Speech API를 완전히 비활성화 (브라우저 마이크 이중 수음 방지)
    if (sttEngine !== 'web_speech') {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (_) {}
        recognitionRef.current = null;
      }
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'ko-KR';

    recognition.onresult = (event: any) => {
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

      // Natural STT stream processing with silence-based auto-commit
      if (final.trim()) {
        // final 결과 → 커밋 타이머 취소 후 즉시 처리
        if (webSpeechCommitTimerRef.current) {
          clearTimeout(webSpeechCommitTimerRef.current);
          webSpeechCommitTimerRef.current = null;
        }
        const rawSentence = final.trim();
        processIncomingSpeechUtterance(rawSentence);
        setInterimSttText('');
      } else if (interim) {
        setInterimSttText(interim);
        // 침묵 감지 후 자동 커밋 (webSpeechSilenceSecRef로 최신값 참조)
        if (webSpeechCommitTimerRef.current) {
          clearTimeout(webSpeechCommitTimerRef.current);
        }
        const capturedInterim = interim.trim();
        webSpeechCommitTimerRef.current = window.setTimeout(() => {
          if (capturedInterim) {
            processIncomingSpeechUtterance(capturedInterim);
            setInterimSttText('');
          }
          webSpeechCommitTimerRef.current = null;
        }, webSpeechSilenceSecRef.current * 1000);
      }

      // Real-time Multi-Entity Detection (Customer, Site, Symptom, Action)
      const currentStream = interim.trim() || final.trim();
      if (currentStream) {
        // 1. Symptom Trigger
        for (const entity of DOMAIN_KEYWORD_REGISTRY) {
          if (entity.synonyms.test(currentStream)) {
            addDetectedKeywordEntity(entity);
            if (!activeKeywordEntity || activeKeywordEntity.id !== entity.id) {
              setActiveKeywordEntity(entity);
              setJustTriggeredKeyword(entity.keyword);
              setTimeout(() => setJustTriggeredKeyword(null), 2500);
            }
            break;
          }
        }

        // 2. Customer / Site Trigger
        for (const entRule of NAMED_ENTITY_REGISTRY) {
          if ((entRule.type === 'customer' || entRule.type === 'site') && entRule.pattern.test(currentStream)) {
            if (entRule.customerId && selectedCustomer.id !== entRule.customerId) {
              const matchedCust = customerList.find(c => c.id === entRule.customerId);
              if (matchedCust) {
                selectCustomer(matchedCust);
                showToast(`[고객사] [${matchedCust.name}] 자동 매핑 완료`);
                setTimeout(() => clearToast(), 3000);
              }
            }
            break;
          }
        }

        // 3. Model Trigger
        for (const entRule of NAMED_ENTITY_REGISTRY) {
          if (entRule.type === 'model' && entRule.pattern.test(currentStream)) {
            if (entRule.modelId) {
              setSelectedCustomerModel(entRule.modelId);
              showToast(`[장비모델] [${entRule.modelId}] 자동 매핑 완료`);
              setTimeout(() => clearToast(), 3000);
            }
            break;
          }
        }

        // 4. Action Trigger: Auto-check SOP checklist step on counselor speech
        for (const entRule of NAMED_ENTITY_REGISTRY) {
          if (entRule.type === 'action' && entRule.pattern.test(currentStream)) {
            if (entRule.actionIndex && actionChecklist[entRule.actionIndex - 1] && !actionChecklist[entRule.actionIndex - 1].checked) {
              toggleChecklist(entRule.actionIndex);
              showToast(`[조치 발화 감지] [${actionChecklist[entRule.actionIndex - 1].text.slice(0, 18)}...] 자동 체크 완료`);
              setTimeout(() => clearToast(), 3000);
            }
            break;
          }
        }
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
      if (isRecordingRef.current && sttEngine === 'web_speech') {
        setTimeout(() => {
          if (isRecordingRef.current && sttEngine === 'web_speech') {
            try {
              recognition.start();
            } catch (e) {
              setTimeout(() => {
                if (isRecordingRef.current && sttEngine === 'web_speech') {
                  try { recognition.start(); } catch (_) {}
                }
              }, 400);
            }
          }
        }, 150);
      }
    };

    recognitionRef.current = recognition;

    const handleWindowFocus = () => {
      if (isRecordingRef.current && recognitionRef.current && sttEngine === 'web_speech') {
        try {
          recognitionRef.current.start();
        } catch (_) {}
      }
    };

    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleWindowFocus);

    return () => {
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleWindowFocus);
      try {
        recognition.stop();
      } catch (_) {}
    };
  }, [sttEngine, appendFinalParagraph, setInterimSttText, isContextCorrectionEnabled, setRecording, activeKeywordEntity, setActiveKeywordEntity, selectedCustomer, customerList, selectCustomer, actionChecklist, toggleChecklist, showToast, clearToast]);

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
        onEnded={() => {
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ink)' }}>
                  전사 자막 및 개체 감지
                </span>
                
                {/* STT 엔진 선택 세그먼트 버튼 */}
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  backgroundColor: 'var(--surface-3)',
                  padding: '2px',
                  borderRadius: '5px',
                  border: '1px solid var(--hairline)',
                  gap: '2px'
                }}>
                  <button
                    onClick={() => {
                      setSttEngine('naver_clova');
                      showToast('STT 엔진: NAVER CLOVA Speech 전환');
                      setTimeout(() => clearToast(), 2500);
                    }}
                    style={{
                      padding: '2px 8px',
                      fontSize: '12.5px',
                      fontWeight: sttEngine === 'naver_clova' ? 700 : 500,
                      color: sttEngine === 'naver_clova' ? '#4ade80' : 'var(--ink-muted)',
                      backgroundColor: sttEngine === 'naver_clova' ? 'rgba(3, 199, 90, 0.2)' : 'transparent',
                      border: sttEngine === 'naver_clova' ? '1px solid rgba(3, 199, 90, 0.45)' : '1px solid transparent',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    네이버 클로바 STT
                  </button>

                  <button
                    onClick={() => {
                      setSttEngine('web_speech');
                      showToast('STT 엔진: 브라우저 Web Speech 전환');
                      setTimeout(() => clearToast(), 2500);
                    }}
                    style={{
                      padding: '2px 8px',
                      fontSize: '12.5px',
                      fontWeight: sttEngine === 'web_speech' ? 700 : 500,
                      color: sttEngine === 'web_speech' ? '#93c5fd' : 'var(--ink-muted)',
                      backgroundColor: sttEngine === 'web_speech' ? 'rgba(37, 99, 235, 0.25)' : 'transparent',
                      border: sttEngine === 'web_speech' ? '1px solid rgba(37, 99, 235, 0.45)' : '1px solid transparent',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    브라우저 내장 STT
                  </button>
                </div>
              </div>
              
              {/* Dynamic Mic Activity Indicator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {isRecording && (
                  <span style={{ fontSize: '13.5px', color: 'var(--accent-success)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Volume2 size={12} className="animate-pulse" /> STT 음성 수신 중 ({Math.max(15, micAudioLevel)}%)
                  </span>
                )}
                <span style={{ fontSize: '13.5px', color: isRecording ? 'var(--accent-success)' : 'var(--ink-muted)', fontWeight: 600 }}>
                  {isRecording ? "● 실시간 가동 중" : "대기 상태"}
                </span>
              </div>
            </div>

            {/* 5-Entity Color Scheme Legend Bar */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              flexWrap: 'wrap',
              gap: '6px', 
              fontSize: '13.5px', 
              backgroundColor: 'var(--surface-2)', 
              padding: '5px 8px', 
              borderRadius: '4px', 
              border: '1px solid var(--hairline)',
              marginBottom: '6px'
            }}>
              <span style={{ color: 'var(--ink-muted)', fontWeight: 600 }}>식별 범례:</span>
              <span style={{ color: '#bfdbfe', backgroundColor: 'rgba(37, 99, 235, 0.2)', padding: '1px 5px', borderRadius: '3px', fontWeight: 600 }}>
                고객사/담당자 (청색)
              </span>
              <span style={{ color: '#fde68a', backgroundColor: 'rgba(245, 158, 11, 0.2)', padding: '1px 5px', borderRadius: '3px', fontWeight: 600 }}>
                현장/위치 (황색)
              </span>
              <span style={{ color: '#e9d5ff', backgroundColor: 'rgba(168, 85, 247, 0.2)', padding: '1px 5px', borderRadius: '3px', fontWeight: 600 }}>
                장비모델 (보라)
              </span>
              <span style={{ color: '#fecaca', backgroundColor: 'rgba(220, 38, 38, 0.2)', padding: '1px 5px', borderRadius: '3px', fontWeight: 600 }}>
                고장증상 (적색)
              </span>
              <span style={{ color: '#a7f3d0', backgroundColor: 'rgba(16, 185, 129, 0.2)', padding: '1px 5px', borderRadius: '3px', fontWeight: 600 }}>
                조치사항 (녹색)
              </span>
            </div>

            <div style={{ 
              backgroundColor: 'var(--ars-bg)', 
              border: '1px solid var(--ars-border)', 
              borderRadius: '4px', 
              padding: '4px 8px', 
              fontSize: '13.5px', 
              color: 'var(--ars-text)',
              lineHeight: 1.3 
            }}>
              [ARS 고지 필수] "본 통화는 품질 향상 및 AI 상담 지원을 위해 녹음/분석됩니다."
            </div>
          </div>

          {/* STT Header Bar & PLAY/STOP BUTTONS DIRECTLY ABOVE TEXT BOX */}
          <div style={{ 
            padding: '8px 12px', 
            borderBottom: '1px solid var(--hairline)', 
            backgroundColor: activeAudioFile ? 'rgba(37, 99, 235, 0.14)' : 'var(--surface-1)',
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
                  <FileAudio size={15} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                  <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#93c5fd', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {activeAudioFile.name}
                  </span>
                  <span className="font-mono" style={{ fontSize: '13.5px', color: 'var(--ink-muted)' }}>
                    ({formatAudioTime(audioCurrentTime)} / {formatAudioTime(audioDuration)})
                  </span>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13.5px', color: 'var(--ink-muted)', fontWeight: 600 }}>
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
                    <div style={{ minHeight: '1.4em' }}>
                      <span style={{ color: '#93c5fd', backgroundColor: 'rgba(59, 130, 246, 0.15)', padding: '2px 6px', borderRadius: '3px', fontWeight: 600 }}>
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
                  <span style={{ color: '#93c5fd', backgroundColor: 'rgba(59, 130, 246, 0.15)', padding: '2px 6px', borderRadius: '3px', fontWeight: 600 }}>
                    {interimSttText}
                  </span>
                  {isRecording && (
                    <span className="animate-pulse" style={{ display: 'inline-block', width: '6px', height: '14px', backgroundColor: 'var(--accent-primary)', marginLeft: '4px', verticalAlign: 'middle' }} />
                  )}
                </div>
              ) : (
                <div style={{ color: 'var(--ink-subtle)', padding: '24px 8px', textAlign: 'center', fontSize: '13.5px' }}>
                  이 영역을 더블클릭하거나 상단 <strong>[텍스트 직접 편집]</strong> 버튼을 누르면 글을 쓰고 수정할 수 있습니다.
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
              backgroundColor: 'rgba(37, 99, 235, 0.1)',
              border: '1px solid rgba(37, 99, 235, 0.3)',
              borderRadius: '6px',
              fontSize: '13.5px',
              lineHeight: 1.4,
              color: '#bfdbfe',
              flexShrink: 0
            }}>
              <div style={{ fontWeight: 700, color: '#93c5fd', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
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
                    backgroundColor: item.checked ? 'rgba(16, 185, 129, 0.12)' : 'var(--surface-2)',
                    border: item.checked ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid var(--hairline)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    flexShrink: 0
                  }}
                >
                  <button style={{ background: 'none', border: 'none', color: item.checked ? 'var(--accent-success)' : 'var(--ink-subtle)', cursor: 'pointer', marginTop: '1px' }}>
                    {item.checked ? <CheckSquare size={16} /> : <Square size={16} />}
                  </button>
                  <div style={{ flex: 1, fontSize: '14px', lineHeight: 1.4, color: item.checked ? 'var(--accent-success)' : 'var(--ink)', textDecoration: item.checked ? 'line-through' : 'none' }}>
                    <strong style={{ marginRight: '4px', color: 'var(--ink-muted)' }}>{item.id}.</strong> {item.text}
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
