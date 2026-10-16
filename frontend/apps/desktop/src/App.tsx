import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
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
  Zap, 
  Upload, 
  FileAudio, 
  MicOff,
  X,
  FileText,
  Package,
  Copy,
  RotateCcw,
  ChevronRight,
  Check
} from 'lucide-react';
import { useCounselStore } from './store';
import { MicTestModal } from './MicTestModal';
import { EquipmentManualModal } from './EquipmentManualModal';
import { PartsOrderQuotationModal } from './PartsOrderQuotationModal';
import { SelfActionGuideModal } from './SelfActionGuideModal';
import { DispatchDocPackageModal } from './DispatchDocPackageModal';
import { applyContextualCorrection } from './contextCorrector';
import { 
  DOMAIN_KEYWORD_REGISTRY, 
  NAMED_ENTITY_REGISTRY, 
  findMatchingSymptomEntities,
  extractCustomerAndAddressEntities,
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
  if (path.startsWith('/counsel3') || path.startsWith('/v3')) return 'counsel-v3';
  if (path.startsWith('/schedule')) return 'schedule';
  if (path.startsWith('/counsel-compare')) return 'counsel-compare';
  if (path.startsWith('/stt') || path.startsWith('/legacy')) return 'stt-legacy';
  // 기본 진입 화면: CounselAssistV2
  return 'counsel-v2';
}

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>(getInitialTab);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentTab(getInitialTab());
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--bg-app)', backgroundImage: 'var(--paper-texture)', backgroundRepeat: 'repeat' }}>
      <GlobalNav currentTab={currentTab} onSelectTab={handleSelectTab} />
      <main style={{ flex: 1, position: 'relative' }}>
        {currentTab === 'counsel-v2' && <CounselAssistV2 />}
        {currentTab === 'counsel-v3' && <CounselAssistV3 />}
        {currentTab === 'counsel-compare' && <CounselCompare />}
        {currentTab === 'schedule' && <SchedulePage />}
        {currentTab === 'stt-legacy' && <LegacySttApp />}
      </main>
    </div>
  );
}

function LegacySttApp() {


  const {
    isRecording,
    callSeconds,
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
  const [gpuServerOnline, setGpuServerOnline] = useState<boolean | null>(null);
  const [isAudioStreamingActive, setIsAudioStreamingActive] = useState(false);
  const [loopbackDevice] = useState<string>('');
  const [, setMicAudioLevel] = useState(0);
  const [justTriggeredKeyword, setJustTriggeredKeyword] = useState<string | null>(null);
  const [isDragOverDropzone, setIsDragOverDropzone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);
  const [selectedSearchIndex, setSelectedSearchIndex] = useState(-1);

  // Co-Pilot Visual Document Modals & Automatic Closing Recommendation State
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isPartsQuoteModalOpen, setIsPartsQuoteModalOpen] = useState(false);
  const [isSelfGuideModalOpen, setIsSelfGuideModalOpen] = useState(false);
  const [isDispatchDocModalOpen, setIsDispatchDocModalOpen] = useState(false);
  const [recommendedClosingAction, setRecommendedClosingAction] = useState<'NONE' | 'PARTS_QUOTE' | 'DISPATCH' | 'RESOLVED'>('NONE');
  const [confirmedSlotFlags, setConfirmedSlotFlags] = useState<{
    customer: boolean;
    phone: boolean;
    address: boolean;
    model: boolean;
  }>({ customer: false, phone: false, address: false, model: false });

  const audioSessionIdRef = useRef<number>(0);
  const clovaAbortControllersRef = useRef<AbortController[]>([]);
  const clovaInflightCountRef = useRef<number>(0);
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

  // 단일 발화 원문 기반 사실 정보 추출기 (임의 문장 합성·자모 추측·체크리스트 자동체크 배제)
  const evaluateUtteranceRules = useCallback((text: string) => {
    if (!text || !text.trim()) return;

    // 1. 명시적으로 발화된 고장 증상/부품만 매칭
    const directMatches = findMatchingSymptomEntities(text);
    for (const entity of directMatches) {
      const curState = useCounselStore.getState();
      const alreadyDetected = curState.detectedKeywordEntities.some(e => e.id === entity.id);
      curState.addDetectedKeywordEntity(entity);
      if (!curState.activeKeywordEntity) {
        curState.setActiveKeywordEntity(entity);
        setJustTriggeredKeyword(entity.keyword);
        setTimeout(() => setJustTriggeredKeyword(null), 3000);
        curState.showToast(`[증상 확인: ${entity.keyword}]`);
        setTimeout(() => curState.clearToast(), 3000);
      } else if (!alreadyDetected) {
        setJustTriggeredKeyword(entity.keyword);
        setTimeout(() => setJustTriggeredKeyword(null), 3000);
      }
    }

    // 2. 음성 STT에서 실제 발화된 고객사/담당자/연락처/주소 사실 정보만 추출·표시
    const afterSymptomStore = useCounselStore.getState();
    const curCust = afterSymptomStore.selectedCustomer;
    const extractedInfo = extractCustomerAndAddressEntities(text);
    let activeCust: CustomerInfo = curCust
      ? { ...curCust }
      : {
          id: 'live-dynamic-customer',
          name: '',
          manager: '',
          phone: '',
          address: '',
          addressDetail: '',
          assetModel: '',
          serialNumber: '',
          salesType: '미확인',
          warrantyRemaining: '',
          historyTimeline: [],
        };
    const changedFields: string[] = [];

    let spokenCustomerName = extractedInfo.customerName || '';
    if (!spokenCustomerName) {
      for (const entRule of NAMED_ENTITY_REGISTRY) {
        if (entRule.type === 'customer' && entRule.pattern.test(text)) {
          const matchedText = text.match(entRule.pattern)?.[0]?.trim();
          // 전화번호나 단순 직함 단어는 고객사명에서 제외
          if (matchedText && !/^\d/.test(matchedText) && !/^(?:팀장|과장|소장|대표|대리|실장|반장)님?$/.test(matchedText)) {
            spokenCustomerName = matchedText;
            break;
          }
        }
      }
    }

    if (spokenCustomerName && !activeCust.name.includes(spokenCustomerName)) {
      activeCust.name = spokenCustomerName;
      changedFields.push(`고객사: ${spokenCustomerName}`);
    }
    if (extractedInfo.managerName && !activeCust.manager.includes(extractedInfo.managerName)) {
      activeCust.manager = extractedInfo.managerName;
      changedFields.push(`담당자: ${extractedInfo.managerName}`);
    }
    if (extractedInfo.phone && activeCust.phone !== extractedInfo.phone) {
      activeCust.phone = extractedInfo.phone;
      changedFields.push(`연락처: ${extractedInfo.phone}`);
    }
    if (extractedInfo.roadOrLotAddress && !activeCust.address.includes(extractedInfo.roadOrLotAddress)) {
      activeCust.address = extractedInfo.roadOrLotAddress;
      changedFields.push(`주소: ${extractedInfo.roadOrLotAddress}`);
    }
    if (extractedInfo.addressDetail || extractedInfo.useCompany) {
      const detailParts: string[] = [];
      if (extractedInfo.addressDetail) detailParts.push(extractedInfo.addressDetail);
      if (extractedInfo.useCompany) detailParts.push(extractedInfo.useCompany);
      const newDetail = detailParts.join(' / ');
      if (newDetail && !activeCust.addressDetail.includes(newDetail)) {
        activeCust.addressDetail = newDetail;
        changedFields.push(`상세위치: ${newDetail}`);
      }
    }

    if (changedFields.length > 0) {
      afterSymptomStore.selectCustomer(activeCust);
      setConfirmedSlotFlags(prev => ({
        customer: prev.customer || Boolean(spokenCustomerName || extractedInfo.managerName),
        phone: prev.phone || Boolean(extractedInfo.phone),
        address: prev.address || Boolean(extractedInfo.roadOrLotAddress || extractedInfo.addressDetail),
        model: prev.model,
      }));

      const addrText = `${activeCust.address} ${activeCust.addressDetail}`;
      if (/(?:서울|서초|강남|금천|송파|영등포|마포|인천|부천|광명|고양)/.test(addrText)) {
        afterSymptomStore.setAssignedEngineer('박영호 정비기사 (인천/서울서부)');
      } else if (/(?:화성|동탄|수원|용인|성남|안산|오산|시흥|안양)/.test(addrText)) {
        afterSymptomStore.setAssignedEngineer('김철수 정비기사 (화성/경기남부)');
      } else if (/(?:아산|천안|평택|충남|충북|대전|경남|양산|부산)/.test(addrText)) {
        afterSymptomStore.setAssignedEngineer('이지훈 정비기사 (평택/충청북부)');
      }

      afterSymptomStore.showToast(`[음성 확인: ${changedFields.join(' · ')}]`);
      setTimeout(() => afterSymptomStore.clearToast(), 3000);
    }

    // 3. 명시적으로 발화된 장비 모델명 식별
    for (const entRule of NAMED_ENTITY_REGISTRY) {
      if (entRule.type === 'model' && entRule.pattern.test(text)) {
        const matchedModel = entRule.modelId || text.match(entRule.pattern)?.[0]?.toUpperCase();
        if (matchedModel) {
          useCounselStore.getState().setSelectedCustomerModel(matchedModel);
          setConfirmedSlotFlags(prev => ({ ...prev, model: true }));
          useCounselStore.getState().showToast(`[장비 모델 확인: ${matchedModel}]`);
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

  // STT 수신 텍스트 원문 직결 처리 (임의 단어 변형·의미 추론 배제)
  const processIncomingSpeechUtterance = useCallback((rawText: string) => {
    if (!rawText || !rawText.trim()) return;
    const trimmed = rawText.trim();
    const liveStore = useCounselStore.getState();

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
    const cleanContent = fullRawLine.replace(/^\[\d{1,2}:\d{2}(?::\d{2})?\]\s*/, '');

    // STT 엔진이 반환한 원문 그대로 대화창에 기록
    liveStore.appendFinalParagraph(fullRawLine, fullRawLine, []);
    evaluateUtteranceRules(cleanContent);
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

  const abortAllClovaStreams = useCallback(() => {
    for (const ctrl of clovaAbortControllersRef.current) {
      try {
        ctrl.abort();
      } catch (_) {}
    }
    clovaAbortControllersRef.current = [];
  }, []);

  const processAudioWithActiveEngine = useCallback(async (file: File) => {
    // 1. 신규 오디오 세션 ID 발급 및 진행 중인 이전 요청 취소
    const mySessionId = ++audioSessionIdRef.current;
    abortAllClovaStreams();
    clovaInflightCountRef.current = 0;

    // 2. 기존 재생 중인 오디오 및 타이머/STT 스트림 즉시 정지
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

    // 3. 화면 상담 세션 완전 초기화 (파일명 기반 사전 정보 표출 및 파일 메모리 디코딩 일절 금지)
    resetSessionForNewAudio();
    setConfirmedSlotFlags({ customer: false, phone: false, address: false, model: false });
    setRecommendedClosingAction('NONE');

    // 4. 백엔드 루프백 버퍼 클리어 요청
    if (loopbackWsRef.current && loopbackWsRef.current.readyState === WebSocket.OPEN) {
      try {
        loopbackWsRef.current.send(JSON.stringify({ action: 'clear_buffer' }));
      } catch (_) {}
    }

    // 5. 오디오 파일은 오직 <audio> 태그로 스피커 재생만 수행하며, STT는 물리적 마이크(getUserMedia)가 스피커 소리를 수음하여 처리
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

    showToast(`[${file.name}] 스피커 재생 및 마이크 수음 시작`);
    setTimeout(() => clearToast(), 3000);
  }, [abortAllClovaStreams, resetSessionForNewAudio, setActiveAudioFile, setIsAudioPlaying, setAudioTime, setInterimSttText, setRecording, startSttStreaming, showToast, clearToast]);

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

        // 2. If Audio file is dropped -> Play out of speaker only
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

  // 재생바 시간 표시 업데이트 (오직 UI 재생 시간 표시용)
  useEffect(() => {
    if (!isAudioPlaying || !activeAudioFile) return;
    const timer = window.setInterval(() => {
      if (globalAudioRef.current && !globalAudioRef.current.paused) {
        const cur = globalAudioRef.current.currentTime;
        const dur = globalAudioRef.current.duration || 0;
        setAudioTime(cur, dur);
      }
    }, 200);
    return () => clearInterval(timer);
  }, [isAudioPlaying, activeAudioFile, setAudioTime]);

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
      setInterimSttText('');
      if (sttEngine === 'web_speech') {
        stopSttStreaming();
      }
      globalAudioRef.current.pause();
    }
  };

  const handleClearAudioFile = () => {
    audioSessionIdRef.current += 1;
    abortAllClovaStreams();
    clovaInflightCountRef.current = 0;
    if (globalAudioRef.current) {
      globalAudioRef.current.pause();
      globalAudioRef.current.currentTime = 0;
      globalAudioRef.current.removeAttribute('src');
      globalAudioRef.current.load();
    }
    if (loopbackWsRef.current && loopbackWsRef.current.readyState === WebSocket.OPEN) {
      try { loopbackWsRef.current.send(JSON.stringify({ action: 'clear_buffer' })); } catch (_) {}
    }
    stopSttStreaming();
    setInterimSttText('');
    setIsAudioPlaying(false);
    setRecording(false);
    clearAudioFile();
    resetSessionForNewAudio();
    setConfirmedSlotFlags({ customer: false, phone: false, address: false, model: false });
    setRecommendedClosingAction('NONE');
    showToast("음성 파일 및 STT 수신이 즉시 제거되었습니다.");
    setTimeout(() => clearToast(), 2000);
  };

  const formatAudioTime = (sec: number) => {
    if (isNaN(sec) || !isFinite(sec)) return "00:00";
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(Math.floor(sec % 60)).padStart(2, '0');
    return `${m}:${s}`;
  };

  // 수동 STT 켜기/끄기 토글
  const toggleManualStt = useCallback(() => {
    if (!isRecording) {
      setRecording(true);
      if (sttEngine === 'web_speech') {
        startSttStreaming();
      }
      showToast(`STT 청음 시작 (${sttEngine === 'naver_clova' ? '네이버 클로바 STT' : '브라우저 내장 STT'})`);
      setTimeout(() => clearToast(), 2500);
    } else {
      if (webSpeechCommitTimerRef.current) {
        clearTimeout(webSpeechCommitTimerRef.current);
        webSpeechCommitTimerRef.current = null;
      }
      abortAllClovaStreams();
      clovaInflightCountRef.current = 0;
      stopSttStreaming();
      setInterimSttText('');
      showToast('STT 청음 중지');
      setTimeout(() => clearToast(), 2500);
    }
  }, [isRecording, sttEngine, abortAllClovaStreams, setRecording, startSttStreaming, stopSttStreaming, setInterimSttText, showToast, clearToast]);

  // 통화 활성화 상태 (STT 녹음/수음 중이거나 오디오 재생 중)
  const isCallActive = isAudioStreamingActive || isRecording || isAudioPlaying;

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

  // 100% 물리적 마이크(getUserMedia) 실시간 수음 + NAVER CLOVA Speech gRPC 스트리밍 전송
  // (m4a 재생 시에도 파일 데이터를 읽지 않고, 오직 스피커에서 나와 마이크로 들어온 실제 소리만 캡처하여 전송)
  useEffect(() => {
    let processorNode: ScriptProcessorNode | null = null;
    let micSpeechSamples: number[] = [];
    let micPreRollSamples: number[] = [];
    let micInSpeech = false;
    let micSilenceChunks = 0;
    let micVoicedChunks = 0;
    let micSpeechStartSec = 0;
    let micNoiseFloor = 55;
    const PRE_ROLL_MAX = 5600; // 0.35초 (16kHz 기준)

    const flushMicSamplesToClova = async (samples16k: number[], startSec: number) => {
      if (samples16k.length < 16000 * 0.5) return;
      const capturedSessionId = audioSessionIdRef.current;
      const floatArr = new Float32Array(samples16k);
      const wavBlob = encodeWav16kMono(floatArr, 16000);
      const durSec = Number((samples16k.length / 16000).toFixed(2));
      const endSec = startSec + durSec;
      const m = String(Math.floor(startSec / 60)).padStart(2, '0');
      const s = String(Math.floor(startSec % 60)).padStart(2, '0');

      const abortCtrl = new AbortController();
      clovaAbortControllersRef.current.push(abortCtrl);
      clovaInflightCountRef.current += 1;
      setInterimSttText('듣는중');

      try {
        const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const qs = `stream=1&start=${startSec.toFixed(2)}&end=${endSec.toFixed(2)}`;
        let response: Response | null = null;

        if (isLocalHost) {
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

          const cloudUrl = isLocalHost
            ? `https://space-consult-assist.vercel.app/api/clova-chunk?${qs}`
            : `/api/clova-chunk?${qs}`;

          response = await fetch(cloudUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audio_base64: audioBase64,
              start: Number(startSec.toFixed(2)),
              end: Number(endSec.toFixed(2)),
              stream: true,
            }),
            signal: abortCtrl.signal,
          });
        }

        if (!response.ok) {
          throw new Error(`Clova gRPC HTTP ${response.status}`);
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
                  const ts = segObj.timestamp || `[${m}:${s}]`;
                  processIncomingSpeechUtterance(`${ts} ${cleanText}`);
                }
              } catch (_) {}
            }
          }
          if (lineBuf.trim() && audioSessionIdRef.current === capturedSessionId) {
            try {
              const segObj = JSON.parse(lineBuf.trim());
              const cleanText = String(segObj?.text || '').trim();
              if (cleanText) {
                const ts = segObj.timestamp || `[${m}:${s}]`;
                processIncomingSpeechUtterance(`${ts} ${cleanText}`);
              }
            } catch (_) {}
          }
        } else {
          const data = await response.json();
          const cleanText = String(data?.text || '').trim();
          if (cleanText && audioSessionIdRef.current === capturedSessionId) {
            processIncomingSpeechUtterance(`[${m}:${s}] ${cleanText}`);
          }
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          console.warn('마이크 클로바 STT 전사 실패:', err);
        }
      } finally {
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

          // 오직 물리적 마이크(getUserMedia)가 실제로 수음한 파형만 16kHz로 다운샘플링하여 클로바로 전송
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
              if (!isRecordingRef.current || state.sttEngine !== 'naver_clova') {
                return;
              }

              const input = e.inputBuffer.getChannelData(0);
              const outLen = Math.floor(input.length / ratio);
              let sumSq = 0;
              const downsampled: number[] = new Array(outLen);
              for (let i = 0; i < outLen; i++) {
                const sample = input[Math.min(input.length - 1, Math.floor(i * ratio))];
                downsampled[i] = sample;
                const v = sample * 32767;
                sumSq += v * v;
              }
              const rms = Math.sqrt(sumSq / Math.max(1, outLen));

              if (!micInSpeech && rms < 150) {
                micNoiseFloor = micNoiseFloor * 0.95 + Math.max(40, rms) * 0.05;
              }
              const threshold = Math.max(55, Math.min(145, micNoiseFloor * 1.55));

              if (rms > threshold) {
                if (!micInSpeech) {
                  micInSpeech = true;
                  micSilenceChunks = 0;
                  micVoicedChunks = 0;
                  const audioEl = globalAudioRef.current;
                  micSpeechStartSec =
                    state.activeAudioFile && audioEl && audioEl.currentTime > 0
                      ? Math.max(0, audioEl.currentTime - 0.35)
                      : state.callSeconds;
                  micSpeechSamples = [...micPreRollSamples];
                }
                micVoicedChunks += 1;
                micSilenceChunks = 0;
                for (let i = 0; i < downsampled.length; i++) micSpeechSamples.push(downsampled[i]);
                setInterimSttText('듣는중');

                // 4.8초 이상 쉼 없이 이어지는 발화는 구절 단위로 즉시 전송
                if (micSpeechSamples.length >= 16000 * 4.8) {
                  const toSend = micSpeechSamples;
                  const startToSend = micSpeechStartSec;
                  micPreRollSamples = downsampled.slice(-Math.min(downsampled.length, 3200));
                  micSpeechSamples = [];
                  micInSpeech = false;
                  micSilenceChunks = 0;
                  micVoicedChunks = 0;
                  flushMicSamplesToClova(toSend, startToSend);
                }
              } else {
                for (let i = 0; i < downsampled.length; i++) micPreRollSamples.push(downsampled[i]);
                if (micPreRollSamples.length > PRE_ROLL_MAX) {
                  micPreRollSamples.splice(0, micPreRollSamples.length - PRE_ROLL_MAX);
                }

                if (micInSpeech) {
                  micSilenceChunks += 1;
                  for (let i = 0; i < downsampled.length; i++) micSpeechSamples.push(downsampled[i]);
                  const isSentencePause = micSilenceChunks >= 5; // 약 0.42초 침묵
                  const isClausePause = micSpeechSamples.length >= 16000 * 3.0 && micSilenceChunks >= 3; // 3초 이상 발화 후 0.25초 휴지

                  if (isSentencePause || isClausePause) {
                    const toSend = micSpeechSamples;
                    const startToSend = micSpeechStartSec;
                    const voiced = micVoicedChunks;
                    micSpeechSamples = [];
                    micInSpeech = false;
                    micSilenceChunks = 0;
                    micVoicedChunks = 0;
                    if (voiced >= 3 && toSend.length >= 16000 * 0.5) {
                      flushMicSamplesToClova(toSend, startToSend);
                    } else if (clovaInflightCountRef.current === 0) {
                      setInterimSttText('');
                    }
                  }
                }
              }
            };
          } catch (_) {}

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
      if (micInSpeech && micVoicedChunks >= 3 && micSpeechSamples.length >= 16000 * 0.5) {
        flushMicSamplesToClova(micSpeechSamples, micSpeechStartSec);
        micSpeechSamples = [];
        micInSpeech = false;
      }
      if (processorNode) {
        try { processorNode.disconnect(); } catch (_) {}
      }
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, [isRecording, processIncomingSpeechUtterance, setInterimSttText]);

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
        const correctedInterim = applyContextualCorrection(interim).correctedText;
        setInterimSttText(correctedInterim);
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
    setConfirmedSlotFlags({ customer: true, phone: true, address: true, model: true });
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
          customer_id: selectedCustomer?.id || "live-dynamic-customer",
          customer_name: selectedCustomer?.name || "미확인 고객사",
          manager: selectedCustomer?.manager || "",
          serial_number: selectedCustomer?.serialNumber || "",
          model_name: selectedCustomer?.assetModel || cleanModelCode || "",
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
          customer_id: selectedCustomer?.id || "live-dynamic-customer",
          customer_name: selectedCustomer?.name || "미확인 고객사",
          manager: selectedCustomer?.manager || "",
          phone: selectedCustomer?.phone || "",
          address: selectedCustomer?.address || "",
          address_detail: selectedCustomer?.addressDetail || "",
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
      showToast(`[${selectedCustomer?.name || '고객사'}] 출장 배차 접수가 정상 등록되었습니다.`);
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
          customer_name: selectedCustomer?.name || "미확인 고객사",
          manager: selectedCustomer?.manager || "",
          manager_phone: selectedCustomer?.phone || "",
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
  const nextUncheckedStep = useMemo(() => actionChecklist.find(c => !c.checked) || null, [actionChecklist]);

  // 추출된 클린 장비 모델 코드 (J600T, S7P, S5 등 - 미선택 시 빈 문자열)
  const cleanModelCode = useMemo(() => {
    const raw = selectedCustomer?.assetModel || '';
    const m = raw.match(/\b(J600T?|J800|S12L?|S7P?|S5|S3|S2|S1|R3|XD80|XD60|S800|M100|Q45)\b/i);
    return m ? m[1].toUpperCase() : '';
  }, [selectedCustomer?.assetModel]);

  // 5대 필수 정보 자동 확인 상태 판정
  const confirmedSlots = useMemo(() => {
    const customerOk = confirmedSlotFlags.customer || Boolean(selectedCustomer?.name && !selectedCustomer.name.includes('식별 대기') && selectedCustomer.name.trim());
    const phoneOk = confirmedSlotFlags.phone || Boolean(selectedCustomer?.phone && /0\d{1,2}-\d{3,4}-\d{4}/.test(selectedCustomer.phone));
    const addressOk = confirmedSlotFlags.address || Boolean(
      (selectedCustomer?.address && !selectedCustomer.address.includes('자동 식별') && selectedCustomer.address.trim()) ||
      (selectedCustomer?.addressDetail && selectedCustomer.addressDetail.trim())
    );
    const modelOk = confirmedSlotFlags.model || Boolean(cleanModelCode);
    const symptomOk = detectedKeywordEntities.length > 0 || Boolean(matchedDiagnosis);
    return {
      customer: customerOk,
      phone: phoneOk,
      address: addressOk,
      model: modelOk,
      symptom: symptomOk,
      confirmedCount: [customerOk, phoneOk, addressOk, modelOk, symptomOk].filter(Boolean).length,
    };
  }, [confirmedSlotFlags, selectedCustomer, cleanModelCode, detectedKeywordEntities, matchedDiagnosis]);

  // 상담 진행에 따른 배차 메모 및 영업 이관 메모 실시간 자동 합성
  useEffect(() => {
    const modelLabel = cleanModelCode || '모델 미확인';
    const custLabel = selectedCustomer?.name || '고객사 미확인';
    const symptomTitle = activeKeywordEntity?.keyword || matchedDiagnosis?.category || '증상 확인중';
    const partTitle = matchedDiagnosis ? `${matchedDiagnosis.partName} (${matchedDiagnosis.partCode})` : '현장 점검 요망';
    const checkedItems = actionChecklist.filter(c => c.checked).map(c => `${c.id}단계(${c.text.slice(0, 14)})`);
    const checkSummary = checkedItems.length > 0 ? `${checkedItems.join(', ')} 점검 완료` : '1차 유선 점검 진행';

    setDispatchNote(
      `[자동요약] 장비: ${modelLabel} | 증상: ${symptomTitle} | 점검내역: ${checkSummary} | 지참부품: ${partTitle}`
    );
    setSalesTransferNote(
      `[상담이관] ${custLabel} (${modelLabel}) | ${symptomTitle} 관련 ${partTitle} 견적·교체 요청`
    );
  }, [cleanModelCode, activeKeywordEntity, matchedDiagnosis, actionChecklist, selectedCustomer?.name, setDispatchNote]);

  // 다음 안내 멘트 (Next Script Teleprompter) 동적 생성 엔진
  const nextLeadGuidance = useMemo(() => {
    const missingNames: string[] = [];
    if (!confirmedSlots.model) missingNames.push('장비 모델명');
    if (!confirmedSlots.address) missingNames.push('현장 위치');
    if (!confirmedSlots.phone) missingNames.push('담당자 연락처');

    const symptomName = activeKeywordEntity?.keyword || matchedDiagnosis?.category || '';
    const partName = matchedDiagnosis?.partName || '관련 소모품';
    const engShort = assignedEngineer.split(' ')[0] || '담당 기사';
    const modelDisplay = cleanModelCode || '해당 장비';

    if (!confirmedSlots.symptom) {
      return {
        stageBadge: '1단계 · 접수 및 증상 확인',
        accentColor: '#2563eb',
        bgTint: '#eff6ff',
        borderTint: '#93c5fd',
        script: `"안녕하세요, 스페이스 고객지원실입니다. 사용 중인 장비 모델명과 어떤 불편 증상이 있으신지 말씀해 주시겠습니까?"`,
        subPrompt: '고객 발화 시 고객사·장비·증상이 자동 추출되고 1차 점검 멘트가 제안됩니다.',
      };
    }

    if (recommendedClosingAction === 'RESOLVED') {
      return {
        stageBadge: '3단계 · 자가조치 해결 마무리',
        accentColor: '#059669',
        bgTint: '#ecfdf5',
        borderTint: '#6ee7b7',
        script: `"정상 작동을 확인해 주셔서 다행입니다! 오늘 조치하신 [${symptomName}] 예방 점검 가이드를 문자로 발송해 드리고 상담을 마무리하겠습니다."`,
        subPrompt: '권장 조치: [자가조치 가이드] 발송 후 [자가조치 완료]로 종결하세요.',
      };
    }

    if (recommendedClosingAction === 'PARTS_QUOTE') {
      return {
        stageBadge: '3단계 · 소모품 견적 및 교체 안내',
        accentColor: '#d97706',
        bgTint: '#fffbeb',
        borderTint: '#fcd34d',
        script: `"말씀하신 증상은 [${partName}] 마모·손상으로 확인됩니다. ${modelDisplay} 전용 사진 견적서와 자가교체 가이드를 문자로 바로 발송해 드리겠습니다."`,
        subPrompt: `권장 조치: [소모품 견적] 버튼을 눌러 ${modelDisplay} 부품 견적서를 즉시 발송하세요.`,
      };
    }

    if (recommendedClosingAction === 'DISPATCH' || (totalCount > 0 && checkedCount === totalCount)) {
      return {
        stageBadge: '3단계 · 출장 기사 배정 안내',
        accentColor: '#dc2626',
        bgTint: '#fef2f2',
        borderTint: '#fca5a5',
        script: `"1차 점검 후에도 증상이 동일하여 현장 정밀 수리가 필요합니다. 관할 [${engShort}] 기사님 방문 일정을 접수하고 출장 안내 문서를 발송해 드리겠습니다."`,
        subPrompt: missingNames.length > 0
          ? `방문 전 추가 확인 질문: "정확한 기사님 방문을 위해 ${missingNames.join(', ')}를 확인 부탁드립니다."`
          : `권장 조치: [출장 배차 접수] 확정 또는 [출장 패키지] 문서를 발송하세요.`,
      };
    }

    if (nextUncheckedStep) {
      const stepNum = nextUncheckedStep.id;
      const cleanStepText = nextUncheckedStep.text.replace(/^\d+단계:\s*/, '').trim();
      const leadSentence = checkedCount === 0
        ? `"고객님, [${symptomName}] 증상이시군요. 현장 즉시 조치를 위해 먼저 1단계로「${cleanStepText}」상태를 확인해 주시겠습니까?"`
        : `"네, 확인 감사합니다. 이어서 ${stepNum}단계로「${cleanStepText}」부분을 한 번 확인 부탁드립니다."`;

      return {
        stageBadge: `2단계 · ${stepNum}차 점검 유도 (${checkedCount}/${totalCount})`,
        accentColor: '#1d4ed8',
        bgTint: '#eff6ff',
        borderTint: '#60a5fa',
        script: leadSentence,
        subPrompt: missingNames.length > 0
          ? `함께 확인할 정보: "${missingNames.join(', ')}도 함께 말씀해 주시겠습니까?"`
          : `고객 응답에 따라 아래 [현 단계 정상 ➔ 다음 안내], [부품 마모 ➔ 견적], [조치 불가 ➔ 출장]을 선택하세요.`,
      };
    }

    return {
      stageBadge: '2단계 · 증상 진단 안내',
      accentColor: '#2563eb',
      bgTint: '#eff6ff',
      borderTint: '#93c5fd',
      script: `"${matchedDiagnosis?.selfActionGuide || '전원 차단 후 기본 점검 항목을 순서대로 안내해 드리겠습니다.'}"`,
      subPrompt: '점검 결과에 따라 자가조치 완료 또는 출장 배차를 선택하세요.',
    };
  }, [
    confirmedSlots,
    activeKeywordEntity,
    matchedDiagnosis,
    assignedEngineer,
    recommendedClosingAction,
    cleanModelCode,
    totalCount,
    checkedCount,
    nextUncheckedStep,
  ]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 48px)', width: '100%', backgroundColor: 'var(--canvas)', color: 'var(--ink)', overflow: 'hidden' }}>
      
      {/* Permanent Background Audio Element */}
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
        }}
        onLoadedMetadata={(e) => {
          const target = e.currentTarget;
          setAudioTime(target.currentTime, target.duration || 0);
          if (isAudioPlaying) {
            target.play().catch(() => {});
          }
        }}
        onEnded={() => {
          setInterimSttText('');
          setIsAudioPlaying(false);
          setRecording(false);
          showToast("음성 파일 재생 완료");
          setTimeout(() => clearToast(), 3000);
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
      {/* 1. SLIM AUTO-CONFIRMED SLOTS & STT CONTROL STRIP (42px)   */}
      {/* ========================================================= */}
      <div style={{
        height: '44px',
        borderBottom: '1px solid var(--hairline)',
        backgroundColor: 'var(--surface-1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 12px',
        gap: '10px',
        flexShrink: 0,
        overflowX: 'auto'
      }}>
        {/* Left: 5 Auto-Confirmed Information Slots */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, whiteSpace: 'nowrap' }}>
          <span style={{
            fontSize: '12px',
            fontWeight: 800,
            color: confirmedSlots.confirmedCount === 5 ? '#047857' : '#1d4ed8',
            backgroundColor: confirmedSlots.confirmedCount === 5 ? '#d1fae5' : '#dbeafe',
            padding: '3px 8px',
            borderRadius: '4px',
            whiteSpace: 'nowrap'
          }}>
            자동확인 {confirmedSlots.confirmedCount}/5
          </span>

          {[
            { key: 'customer', label: '고객사', value: selectedCustomer?.name ? selectedCustomer.name.replace(/\s*\(.*?\)/g, '') : '대기', ok: confirmedSlots.customer },
            { key: 'phone', label: '연락처', value: selectedCustomer?.phone || '대기', ok: confirmedSlots.phone },
            { key: 'address', label: '현장위치', value: (selectedCustomer?.addressDetail?.split('/')[0]?.trim() || selectedCustomer?.address) || '대기', ok: confirmedSlots.address },
            { key: 'model', label: '모델', value: cleanModelCode || '대기', ok: confirmedSlots.model },
            { key: 'symptom', label: '증상', value: activeKeywordEntity?.keyword || matchedDiagnosis?.category || '대기', ok: confirmedSlots.symptom },
          ].map((slot) => (
            <div
              key={slot.key}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 8px',
                borderRadius: '4px',
                backgroundColor: slot.ok ? '#f0fdf4' : 'var(--surface-2)',
                border: `1px solid ${slot.ok ? '#86efac' : 'var(--hairline)'}`,
                fontSize: '12px',
                whiteSpace: 'nowrap'
              }}
            >
              <span style={{
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                backgroundColor: slot.ok ? '#10b981' : '#cbd5e1',
                color: '#fff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '9px',
                fontWeight: 800,
                flexShrink: 0
              }}>
                {slot.ok ? '✓' : '·'}
              </span>
              <span style={{ color: 'var(--ink-muted)', fontWeight: 600 }}>{slot.label}</span>
              <strong style={{
                color: slot.ok ? '#065f46' : 'var(--ink-subtle)',
                fontWeight: 700,
                maxWidth: '125px',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {slot.value}
              </strong>
            </div>
          ))}
        </div>

        {/* Right: Unified Audio / STT / Timer Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, whiteSpace: 'nowrap' }}>
          {/* Call Timer */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '4px 9px',
            borderRadius: '5px',
            backgroundColor: isCallActive ? '#fef2f2' : 'var(--surface-2)',
            border: `1px solid ${isCallActive ? '#fca5a5' : 'var(--hairline)'}`,
            color: isCallActive ? '#dc2626' : 'var(--ink-muted)',
            fontSize: '12.5px',
            fontWeight: 700,
            whiteSpace: 'nowrap'
          }}>
            <PhoneCall size={12} className={isCallActive ? "animate-pulse" : ""} />
            <span className="font-mono">{formatTimer(callSeconds)}</span>
          </div>

          {/* Engine Selector */}
          <div style={{
            display: 'inline-flex',
            backgroundColor: '#e2e8f0',
            padding: '2px',
            borderRadius: '5px',
            border: '1px solid #cbd5e1',
            gap: '2px'
          }}>
            <button
              onClick={() => {
                if (recognitionRef.current) {
                  try { recognitionRef.current.stop(); } catch (_) {}
                }
                setSttEngine('naver_clova');
              }}
              style={{
                padding: '3px 8px',
                fontSize: '11.5px',
                fontWeight: 700,
                color: sttEngine === 'naver_clova' ? '#fff' : '#334155',
                backgroundColor: sttEngine === 'naver_clova' ? '#059669' : 'transparent',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              클로바 STT
            </button>
            <button
              onClick={() => {
                setSttEngine('web_speech');
                setInterimSttText('');
                if (isAudioPlaying && recognitionRef.current) {
                  try { recognitionRef.current.start(); } catch (_) {}
                }
              }}
              style={{
                padding: '3px 8px',
                fontSize: '11.5px',
                fontWeight: 700,
                color: sttEngine === 'web_speech' ? '#fff' : '#334155',
                backgroundColor: sttEngine === 'web_speech' ? '#1d4ed8' : 'transparent',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              웹 음성 STT
            </button>
          </div>

          {/* STT Toggle */}
          <button
            onClick={toggleManualStt}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 10px',
              borderRadius: '5px',
              border: 'none',
              backgroundColor: isRecording ? '#dc2626' : '#059669',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            {isRecording ? <MicOff size={12} /> : <Mic size={12} />}
            <span>{isRecording ? 'STT 중지' : 'STT 시작'}</span>
          </button>

          {/* Open Audio File */}
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 10px',
              borderRadius: '5px',
              border: '1px solid var(--hairline)',
              backgroundColor: 'var(--surface-2)',
              color: 'var(--ink)',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            <Upload size={12} />
            <span>음성파일 열기</span>
          </button>

          {/* Mic Check */}
          <button
            onClick={() => setIsMicTestOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              borderRadius: '5px',
              border: '1px solid var(--hairline)',
              backgroundColor: 'var(--surface-2)',
              color: 'var(--ink-muted)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            <Volume2 size={12} />
            <span>마이크</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. THREE-PANE LOW-COGNITIVE-LOAD WORKSPACE                */}
      {/* ========================================================= */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden', padding: '8px', gap: '8px' }}>
        
        {/* ------------------------------------------------------- */}
        {/* PANEL A: 고객·장비·시각 문서 조립 발송 (25% 폭)          */}
        {/* ------------------------------------------------------- */}
        <section style={{
          width: '25%',
          minHeight: 0,
          backgroundColor: 'var(--surface-1)',
          border: '1px solid var(--hairline)',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Customer Search */}
          <div style={{ padding: '10px', borderBottom: '1px solid var(--hairline)', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--ink-muted)', whiteSpace: 'nowrap' }}>
              고객사·현장 검색
            </label>
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: '9px', top: '9px', color: 'var(--ink-subtle)' }} />
              <input
                type="text"
                placeholder="고객사, 담당자, 연락처, 주소 검색"
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
                      setConfirmedSlotFlags({ customer: true, phone: true, address: true, model: true });
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
                  padding: '6px 8px 6px 28px',
                  backgroundColor: 'var(--surface-2)',
                  border: '1px solid var(--hairline)',
                  borderRadius: '5px',
                  color: 'var(--ink)',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
              {searchDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  top: '36px',
                  left: 0,
                  right: 0,
                  backgroundColor: 'var(--surface-1)',
                  border: '1px solid var(--hairline)',
                  borderRadius: '6px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                  zIndex: 50,
                  maxHeight: '210px',
                  overflowY: 'auto'
                }}>
                  {customerList.map((cust, idx) => (
                    <div
                      key={cust.id}
                      onClick={() => {
                        selectCustomer(cust);
                        setConfirmedSlotFlags({ customer: true, phone: true, address: true, model: true });
                        setSearchDropdownOpen(false);
                        setSelectedSearchIndex(-1);
                      }}
                      style={{
                        padding: '7px 10px',
                        borderBottom: '1px solid var(--hairline)',
                        cursor: 'pointer',
                        fontSize: '12.5px',
                        backgroundColor: idx === selectedSearchIndex ? 'var(--surface-hover)' : 'transparent'
                      }}
                      onMouseEnter={() => setSelectedSearchIndex(idx)}
                    >
                      <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{cust.name}</div>
                      <div style={{ color: 'var(--ink-muted)', fontSize: '11.5px' }}>{cust.manager} · {cust.phone} · {cust.assetModel.split(' ')[0]}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Customer + Equipment Consolidated Dossier */}
          <div style={{ flex: 1, minHeight: 0, padding: '10px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ backgroundColor: 'var(--surface-2)', padding: '10px', borderRadius: '6px', border: '1px solid var(--hairline)', display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontWeight: 800, fontSize: '14px', color: selectedCustomer?.name ? 'var(--ink)' : 'var(--ink-subtle)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selectedCustomer?.name || '고객사 미선택'}
                </span>
                {selectedCustomer?.salesType && selectedCustomer.salesType !== '미확인' && (
                  <span style={{ fontSize: '11.5px', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'var(--badge-bg)', color: 'var(--badge-text)', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {selectedCustomer.salesType}
                  </span>
                )}
              </div>

              <div style={{ fontSize: '12.5px', color: 'var(--ink-muted)', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  <span style={{ color: 'var(--ink-subtle)', marginRight: 6 }}>담당자</span>
                  <strong style={{ color: selectedCustomer?.manager ? 'var(--ink)' : 'var(--ink-subtle)' }}>
                    {selectedCustomer?.manager || '-'}
                  </strong>
                  {selectedCustomer?.phone ? ` (${selectedCustomer.phone})` : ''}
                </div>
                <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  <span style={{ color: 'var(--ink-subtle)', marginRight: 6 }}>도로명</span>
                  <span style={{ color: selectedCustomer?.address ? 'var(--ink)' : 'var(--ink-subtle)' }}>
                    {selectedCustomer?.address || '-'}
                  </span>
                </div>
                <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  <span style={{ color: 'var(--ink-subtle)', marginRight: 6 }}>상세위치</span>
                  <strong style={{ color: selectedCustomer?.addressDetail ? '#b45309' : 'var(--ink-subtle)' }}>
                    {selectedCustomer?.addressDetail || '-'}
                  </strong>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--hairline)', paddingTop: '6px', marginTop: '2px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                  <span style={{ fontSize: '11px', color: 'var(--ink-subtle)', fontWeight: 600 }}>보유 장비 · 보증</span>
                  <strong style={{ fontSize: '13px', color: selectedCustomer?.assetModel ? 'var(--ink)' : 'var(--ink-subtle)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {selectedCustomer?.assetModel || '장비 미선택'}
                  </strong>
                  {selectedCustomer?.serialNumber && (
                    <span style={{ fontSize: '11.5px', color: 'var(--accent-warning)', fontWeight: 700 }}>
                      {selectedCustomer.warrantyRemaining} · {selectedCustomer.serialNumber}
                    </span>
                  )}
                </div>
                <select
                  value={cleanModelCode}
                  onChange={(e) => {
                    setSelectedCustomerModel(e.target.value);
                    setConfirmedSlotFlags(prev => ({ ...prev, model: Boolean(e.target.value) }));
                  }}
                  title="장비 모델 선택"
                  style={{
                    padding: '4px 6px',
                    fontSize: '12px',
                    fontWeight: 700,
                    borderRadius: '4px',
                    border: '1px solid var(--hairline)',
                    backgroundColor: 'var(--surface-1)',
                    color: 'var(--ink)',
                    cursor: 'pointer',
                    flexShrink: 0
                  }}
                >
                  <option value="">모델 선택</option>
                  {['J600T', 'J800', 'S12', 'S12L', 'S7P', 'S7', 'S5', 'S3', 'S2', 'S1', 'R3', 'W12', 'W15', 'XD80', 'XD60', 'S800', 'M100', 'Q45'].map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 1-Click Model-Matched Visual Document Assembly Bar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--ink-muted)', whiteSpace: 'nowrap' }}>
                  모델 맞춤 사진 문서 발송{cleanModelCode ? ` (${cleanModelCode})` : ''}
                </label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <button
                  onClick={() => setIsManualModalOpen(true)}
                  style={{
                    padding: '8px 8px',
                    borderRadius: '6px',
                    border: '1px solid var(--hairline)',
                    backgroundColor: 'var(--surface-2)',
                    color: 'var(--ink)',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <FileText size={13} style={{ color: '#2563eb', flexShrink: 0 }} />
                  <span>카탈로그·매뉴얼</span>
                </button>

                <button
                  onClick={() => setIsSelfGuideModalOpen(true)}
                  style={{
                    padding: '8px 8px',
                    borderRadius: '6px',
                    border: recommendedClosingAction === 'RESOLVED' ? '1.5px solid #10b981' : '1px solid var(--hairline)',
                    backgroundColor: recommendedClosingAction === 'RESOLVED' ? '#ecfdf5' : 'var(--surface-2)',
                    color: 'var(--ink)',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <CheckCircle2 size={13} style={{ color: '#059669', flexShrink: 0 }} />
                  <span>자가조치 사진</span>
                </button>

                <button
                  onClick={() => setIsPartsQuoteModalOpen(true)}
                  style={{
                    padding: '8px 8px',
                    borderRadius: '6px',
                    border: recommendedClosingAction === 'PARTS_QUOTE' ? '1.5px solid #f59e0b' : '1px solid var(--hairline)',
                    backgroundColor: recommendedClosingAction === 'PARTS_QUOTE' ? '#fffbeb' : 'var(--surface-2)',
                    color: 'var(--ink)',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <Package size={13} style={{ color: '#d97706', flexShrink: 0 }} />
                  <span>소모품 견적서</span>
                </button>

                <button
                  onClick={() => setIsDispatchDocModalOpen(true)}
                  style={{
                    padding: '8px 8px',
                    borderRadius: '6px',
                    border: recommendedClosingAction === 'DISPATCH' ? '1.5px solid #ef4444' : '1px solid var(--hairline)',
                    backgroundColor: recommendedClosingAction === 'DISPATCH' ? '#fef2f2' : 'var(--surface-2)',
                    color: 'var(--ink)',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <Wrench size={13} style={{ color: '#dc2626', flexShrink: 0 }} />
                  <span>출장 문서 패키지</span>
                </button>
              </div>
            </div>

            {/* Compact History Timeline */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1, minHeight: '90px' }}>
              <label style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--ink-muted)', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                <Clock size={12} /> 최근 정비·상담 이력
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {selectedCustomer && selectedCustomer.historyTimeline.length > 0 ? (
                  selectedCustomer.historyTimeline.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '6px 8px',
                        borderRadius: '5px',
                        backgroundColor: item.isWarning ? 'rgba(245, 158, 11, 0.12)' : 'var(--surface-2)',
                        border: item.isWarning ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid var(--hairline)',
                        fontSize: '12px'
                      }}
                    >
                      <div style={{ color: item.isWarning ? 'var(--accent-warning)' : 'var(--ink-muted)', fontWeight: 700, fontSize: '11px' }}>
                        {item.date}
                      </div>
                      <div style={{ color: item.isWarning ? 'var(--accent-warning)' : 'var(--ink)', fontWeight: item.isWarning ? 700 : 500, marginTop: '1px' }}>
                        {item.title}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '12px 8px', fontSize: '12px', color: 'var(--ink-subtle)' }}>
                    고객사 선택 시 이력 표시
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------- */}
        {/* PANEL B: 실시간 대화 자막 & 자동 감지 증상 (37% 폭)     */}
        {/* ------------------------------------------------------- */}
        <section style={{
          width: '37%',
          minHeight: 0,
          backgroundColor: 'var(--surface-1)',
          border: '1px solid var(--hairline)',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Slim Transcript Header + Subtle Entity Legend + Audio Player */}
          <div style={{
            padding: '8px 12px',
            borderBottom: '1px solid var(--hairline)',
            backgroundColor: activeAudioFile ? '#e0f2fe' : isRecording ? '#ecfdf5' : 'var(--surface-1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '8px',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, overflow: 'hidden' }}>
              <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--ink)', whiteSpace: 'nowrap' }}>
                실시간 대화 자막
              </span>
              {activeAudioFile ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  <FileAudio size={13} style={{ color: '#0284c7', flexShrink: 0 }} />
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>
                    {activeAudioFile.name}
                  </span>
                  <span className="font-mono" style={{ fontSize: '11.5px', color: '#475569', fontWeight: 600 }}>
                    {formatAudioTime(audioCurrentTime)}/{formatAudioTime(audioDuration)}
                  </span>
                  <button
                    onClick={toggleAudioPlayback}
                    style={{
                      padding: '2px 7px',
                      borderRadius: '4px',
                      border: 'none',
                      backgroundColor: isAudioPlaying ? '#dc2626' : '#2563eb',
                      color: '#fff',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {isAudioPlaying ? '일시정지' : '재생'}
                  </button>
                  <button
                    onClick={handleClearAudioFile}
                    style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '2px' }}
                  >
                    <X size={13} />
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', whiteSpace: 'nowrap' }}>
                  <span style={{ padding: '1px 5px', borderRadius: '3px', backgroundColor: '#bfdbfe', color: '#1e3a8a', fontWeight: 700 }}>고객</span>
                  <span style={{ padding: '1px 5px', borderRadius: '3px', backgroundColor: '#fde68a', color: '#78350f', fontWeight: 700 }}>위치</span>
                  <span style={{ padding: '1px 5px', borderRadius: '3px', backgroundColor: '#e9d5ff', color: '#581c87', fontWeight: 700 }}>모델</span>
                  <span style={{ padding: '1px 5px', borderRadius: '3px', backgroundColor: '#fecaca', color: '#7f1d1d', fontWeight: 700 }}>증상</span>
                  <span style={{ padding: '1px 5px', borderRadius: '3px', backgroundColor: '#a7f3d0', color: '#064e3b', fontWeight: 700 }}>조치</span>
                </div>
              )}
            </div>

            {/* Reset Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0, whiteSpace: 'nowrap' }}>
              {activeParagraphs.length > 0 && (
                <button
                  onClick={() => {
                    resetSessionForNewAudio();
                    setRecommendedClosingAction('NONE');
                    setConfirmedSlotFlags({ customer: false, phone: false, address: false, model: false });
                  }}
                  title="대화 초기화"
                  style={{
                    padding: '3px 6px',
                    borderRadius: '4px',
                    border: '1px solid var(--hairline)',
                    backgroundColor: 'var(--surface-2)',
                    color: 'var(--ink-muted)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center'
                  }}
                >
                  <RotateCcw size={11} />
                </button>
              )}
            </div>
          </div>

          {/* Live Transcript Box (70% height) */}
          <div style={{ flex: 1, minHeight: 0, padding: '8px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
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
                backgroundColor: isDragOverDropzone ? 'rgba(37, 99, 235, 0.14)' : 'var(--surface-2)',
                border: isDragOverDropzone ? '2px dashed var(--accent-primary)' : '1px solid var(--hairline)',
                borderRadius: '6px',
                padding: '10px 12px',
                overflowY: 'auto',
                overflowX: 'hidden',
                wordBreak: 'break-word',
                fontSize: '13.5px',
                lineHeight: 1.65,
                color: 'var(--ink)',
                position: 'relative'
              }}
            >
              {isDragOverDropzone && (
                <div style={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: 'rgba(37, 99, 235, 0.22)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#1e3a8a',
                  fontWeight: 800,
                  fontSize: '14px',
                  zIndex: 20,
                  borderRadius: '6px'
                }}>
                  <Upload size={28} style={{ marginBottom: '6px' }} />
                  <span>음성(.m4a) 또는 대화 텍스트(.txt) 드롭</span>
                </div>
              )}

              {activeParagraphs.length > 0 ? (
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.65, fontSize: '13.5px' }}>
                  {activeParagraphs.map((line, pIdx) => {
                    const match = line.match(/^(\[\d{1,2}:\d{2}(?::\d{2})?\])\s*(.*)$/);
                    const timestampBadge = match ? match[1] : null;
                    const contentText = match ? match[2] : line;

                    return (
                      <div key={pIdx} style={{ display: 'flex', alignItems: 'baseline', gap: '7px', minHeight: '1.5em', marginBottom: '4px' }}>
                        {timestampBadge && (
                          <span style={{
                            fontFamily: 'monospace',
                            fontSize: '12px',
                            fontWeight: 700,
                            color: 'var(--ink-muted)',
                            backgroundColor: 'var(--surface-3)',
                            border: '1px solid var(--hairline)',
                            borderRadius: '3px',
                            padding: '0px 4px',
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
                                setConfirmedSlotFlags(prev => ({ ...prev, model: true }));
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

                  {(interimSttText || isRecording) && (
                    <div style={{ minHeight: '1.4em', marginTop: '4px' }}>
                      <span style={{
                        color: '#1e40af',
                        backgroundColor: '#dbeafe',
                        border: '1px solid #93c5fd',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontWeight: 700,
                        fontSize: '13px'
                      }}>
                        {interimSttText || '듣는중'}
                      </span>
                    </div>
                  )}
                </div>
              ) : (interimSttText || isRecording) ? (
                <div>
                  <span style={{
                    color: '#1e40af',
                    backgroundColor: '#dbeafe',
                    border: '1px solid #93c5fd',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontWeight: 700,
                    fontSize: '13px'
                  }}>
                    {interimSttText || '듣는중'}
                  </span>
                </div>
              ) : null}
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
                  borderRadius: '14px',
                  padding: '4px 10px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  zIndex: 10
                }}
              >
                최신 발화 ↓
              </button>
            )}
          </div>

          {/* Compact Detected Symptom & Part Strip (Bottom of Panel B) */}
          <div style={{ padding: '10px', borderTop: '1px solid var(--hairline)', backgroundColor: 'var(--surface-1)', display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink-muted)', whiteSpace: 'nowrap' }}>
                  감지 증상 ({detectedKeywordEntities.length})
                </span>
                {justTriggeredKeyword && (
                  <span style={{ fontSize: '11.5px', color: 'var(--accent-success)', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                    <Zap size={11} /> {justTriggeredKeyword}
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowAllSymptoms(!showAllSymptoms)}
                style={{
                  fontSize: '11.5px',
                  padding: '2px 7px',
                  borderRadius: '4px',
                  backgroundColor: showAllSymptoms ? 'var(--accent-primary)' : 'var(--surface-2)',
                  border: '1px solid var(--hairline)',
                  color: showAllSymptoms ? '#fff' : 'var(--ink-muted)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  whiteSpace: 'nowrap'
                }}
              >
                {showAllSymptoms ? '증상목록 닫기' : '+ 수동 증상 선택'}
              </button>
            </div>

            {/* Detected Symptom Chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', minHeight: '26px', alignItems: 'center' }}>
              {detectedKeywordEntities.length > 0 ? (
                detectedKeywordEntities.map((entity) => {
                  const isSelected = activeKeywordEntity?.id === entity.id;
                  return (
                    <button
                      key={entity.id}
                      onClick={() => handleKeywordSelect(entity)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '5px',
                        backgroundColor: isSelected ? 'var(--accent-primary)' : '#eff6ff',
                        border: `1px solid ${isSelected ? 'var(--accent-primary)' : '#93c5fd'}`,
                        color: isSelected ? '#fff' : '#1d4ed8',
                        fontSize: '12.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      #{entity.keyword}
                    </button>
                  );
                })
              ) : (
                <span style={{ fontSize: '12px', color: 'var(--ink-subtle)' }}>대기 중 (발화 시 자동 포착)</span>
              )}
            </div>

            {showAllSymptoms && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', padding: '6px', backgroundColor: 'var(--surface-2)', borderRadius: '5px', border: '1px solid var(--hairline)' }}>
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
                        backgroundColor: isSelected ? 'var(--accent-primary)' : 'var(--surface-1)',
                        border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--hairline)'}`,
                        color: isSelected ? '#fff' : 'var(--ink)',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      #{entity.keyword}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Matched Part Compact Bar + Manual Input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {matchedDiagnosis ? (
                <div style={{
                  flex: 1,
                  padding: '6px 10px',
                  borderRadius: '5px',
                  backgroundColor: 'var(--surface-2)',
                  border: '1px solid var(--hairline)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '6px',
                  fontSize: '12px',
                  minWidth: 0
                }}>
                  <strong style={{ color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {matchedDiagnosis.partName}
                  </strong>
                  <span style={{ color: 'var(--ink-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    <code style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>{matchedDiagnosis.partCode}</code> · 재고 {matchedDiagnosis.stock}개
                  </span>
                </div>
              ) : null}

              <div style={{ display: 'flex', gap: '4px', flex: matchedDiagnosis ? 0.85 : 1 }}>
                <input
                  type="text"
                  placeholder="수동 증상/부품 입력"
                  value={manualOverrideKeyword}
                  onChange={(e) => setManualOverrideKeyword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && manualOverrideKeyword.trim()) {
                      const kw = manualOverrideKeyword.trim();
                      const localMatches = findMatchingSymptomEntities(kw);
                      if (localMatches.length > 0) {
                        addDetectedKeywordEntity(localMatches[0]);
                        handleKeywordSelect(localMatches[0]);
                      } else {
                        setDiagnosisResult(
                          [kw],
                          {
                            category: kw,
                            partCode: 'MANUAL_PART',
                            partName: kw,
                            stock: 10,
                            confidence: 100,
                            source: 'manual',
                            selfActionGuide: `${kw} 관련 전원 차단 및 1차 외관 상태를 확인해 주십시오.`
                          },
                          ['1단계: 전원 차단 및 외관 상태 확인', '2단계: 체결 부위 및 소모품 마모 점검', '3단계: 재가동 테스트']
                        );
                      }
                      setManualOverrideKeyword('');
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '5px 8px',
                    backgroundColor: 'var(--surface-2)',
                    border: '1px solid var(--hairline)',
                    borderRadius: '4px',
                    color: 'var(--ink)',
                    fontSize: '12px',
                    minWidth: '90px'
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------- */}
        {/* PANEL C: 다음 멘트 안내 & 점검 체크리스트 & 종결 (38% 폭) */}
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
          {/* 1. HERO: DYNAMIC NEXT SCRIPT TELEPROMPTER (다음 안내 멘트) */}
          <div style={{
            padding: '12px',
            backgroundColor: nextLeadGuidance.bgTint,
            borderBottom: `2px solid ${nextLeadGuidance.borderTint}`,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{
                  fontSize: '11.5px',
                  fontWeight: 800,
                  color: '#fff',
                  backgroundColor: nextLeadGuidance.accentColor,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  whiteSpace: 'nowrap'
                }}>
                  다음 안내 멘트
                </span>
                <span style={{ fontSize: '12px', fontWeight: 800, color: nextLeadGuidance.accentColor, whiteSpace: 'nowrap' }}>
                  {nextLeadGuidance.stageBadge}
                </span>
              </div>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(nextLeadGuidance.script.replace(/^"|"$/g, ''));
                  showToast('안내 멘트가 복사되었습니다.');
                  setTimeout(() => clearToast(), 2000);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                  padding: '2px 7px',
                  borderRadius: '4px',
                  border: `1px solid ${nextLeadGuidance.borderTint}`,
                  backgroundColor: '#ffffff',
                  color: '#334155',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                <Copy size={11} /> 멘트 복사
              </button>
            </div>

            {/* Primary Counselor Script to Read Aloud */}
            <div style={{
              padding: '10px 12px',
              backgroundColor: '#ffffff',
              border: `1.5px solid ${nextLeadGuidance.borderTint}`,
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 700,
              color: '#0f172a',
              lineHeight: 1.5,
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
            }}>
              {nextLeadGuidance.script}
            </div>

            {/* Sub-prompt for missing slot info or next action cue */}
            <div style={{ fontSize: '12px', color: '#334155', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ChevronRight size={13} style={{ color: nextLeadGuidance.accentColor, flexShrink: 0 }} />
              <span>{nextLeadGuidance.subPrompt}</span>
            </div>

            {/* 1-Click Counselor Progression Bar */}
            {confirmedSlots.symptom && (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', paddingTop: '2px' }}>
                {nextUncheckedStep && (
                  <button
                    onClick={() => {
                      toggleChecklist(nextUncheckedStep.id);
                      showToast(`${nextUncheckedStep.id}단계 정상 확인 ➔ 다음 점검 멘트로 전환`);
                      setTimeout(() => clearToast(), 2200);
                    }}
                    style={{
                      flex: 1.2,
                      padding: '7px 10px',
                      borderRadius: '5px',
                      border: 'none',
                      backgroundColor: '#2563eb',
                      color: '#fff',
                      fontSize: '12px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <Check size={13} />
                    <span>{nextUncheckedStep.id}단계 정상 ➔ 다음 안내</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setRecommendedClosingAction('PARTS_QUOTE');
                    setIsPartsQuoteModalOpen(true);
                  }}
                  style={{
                    flex: 1,
                    padding: '7px 8px',
                    borderRadius: '5px',
                    border: '1px solid #f59e0b',
                    backgroundColor: '#fffbeb',
                    color: '#92400e',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  부품 마모 ➔ 견적발송
                </button>

                <button
                  onClick={() => {
                    setRecommendedClosingAction('DISPATCH');
                    setDispatchDrawerOpen(true);
                  }}
                  style={{
                    flex: 1,
                    padding: '7px 8px',
                    borderRadius: '5px',
                    border: '1px solid #ef4444',
                    backgroundColor: '#fef2f2',
                    color: '#991b1b',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  조치 불가 ➔ 출장접수
                </button>
              </div>
            )}
          </div>

          {/* 2. MIDDLE: INTERACTIVE SOP CHECKLIST WITH ACTIVE STEP FOCUS */}
          <div style={{ padding: '10px 12px 6px 12px', borderBottom: '1px solid var(--hairline)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: '12.5px', fontWeight: 800, color: 'var(--ink)' }}>
              단계별 점검 체크리스트
            </span>
            <span style={{ fontSize: '12px', fontWeight: 700, color: totalCount > 0 && checkedCount === totalCount ? 'var(--accent-success)' : 'var(--accent-primary)' }}>
              {totalCount > 0 ? `${checkedCount} / ${totalCount} 확인됨` : '증상 감지 시 자동 생성'}
            </span>
          </div>

          <div style={{ flex: 1, minHeight: 0, padding: '10px 12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {actionChecklist.length > 0 ? (
              actionChecklist.map((item) => {
                const isCurrentLeadStep = !item.checked && nextUncheckedStep?.id === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleChecklist(item.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      backgroundColor: item.checked ? '#ecfdf5' : isCurrentLeadStep ? '#eff6ff' : '#ffffff',
                      border: item.checked
                        ? '1.5px solid #10b981'
                        : isCurrentLeadStep
                          ? '1.5px solid #3b82f6'
                          : '1px solid #cbd5e1',
                      cursor: 'pointer',
                      flexShrink: 0
                    }}
                  >
                    <button style={{ background: 'none', border: 'none', color: item.checked ? '#047857' : isCurrentLeadStep ? '#1d4ed8' : '#64748b', cursor: 'pointer', padding: 0, display: 'flex' }}>
                      {item.checked ? <CheckSquare size={16} /> : <Square size={16} />}
                    </button>
                    <div style={{
                      flex: 1,
                      fontSize: '13px',
                      lineHeight: 1.4,
                      fontWeight: item.checked || isCurrentLeadStep ? 700 : 500,
                      color: item.checked ? '#065f46' : isCurrentLeadStep ? '#1e3a8a' : '#0f172a',
                      textDecoration: item.checked ? 'line-through' : 'none'
                    }}>
                      <strong style={{ marginRight: '4px' }}>{item.id}.</strong>
                      {item.text}
                    </div>
                    {isCurrentLeadStep && (
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: '#dbeafe',
                        color: '#1d4ed8',
                        whiteSpace: 'nowrap',
                        flexShrink: 0
                      }}>
                        안내 차례
                      </span>
                    )}
                  </div>
                );
              })
            ) : (
              <div style={{ padding: '20px 12px', textAlign: 'center', color: 'var(--ink-subtle)', fontSize: '12.5px' }}>
                대화 중 고장 증상이 포착되면 1~4단계 점검 체크리스트가 자동 구성됩니다.
              </div>
            )}
          </div>

          {/* 3. BOTTOM TERMINAL ACTION BAR (Z-Pattern 우하단 완결 액션) */}
          <div style={{ padding: '10px 12px', borderTop: '1px solid var(--hairline)', backgroundColor: 'var(--surface-2)', display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
            {/* Auto-Synthesized Note Preview */}
            <div style={{
              fontSize: '11.5px',
              color: 'var(--ink-muted)',
              backgroundColor: 'var(--surface-1)',
              border: '1px solid var(--hairline)',
              borderRadius: '4px',
              padding: '5px 8px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {dispatchNote}
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={handleResolveComplete}
                disabled={isSubmitting}
                style={{
                  flex: 1.1,
                  padding: '10px 8px',
                  backgroundColor: isSubmitting ? 'var(--surface-3)' : 'var(--accent-success)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  whiteSpace: 'nowrap'
                }}
              >
                <CheckCircle2 size={15} />
                <span>자가조치 완료</span>
              </button>

              <button
                onClick={() => setDispatchDrawerOpen(true)}
                disabled={isSubmitting}
                style={{
                  flex: 1.1,
                  padding: '10px 8px',
                  backgroundColor: isSubmitting ? 'var(--surface-3)' : 'var(--accent-primary)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  whiteSpace: 'nowrap'
                }}
              >
                <Wrench size={14} />
                <span>출장 배차 접수</span>
              </button>

              <button
                onClick={() => setSalesModalOpen(true)}
                disabled={isSubmitting}
                style={{
                  flex: 0.8,
                  padding: '10px 8px',
                  backgroundColor: 'var(--surface-3)',
                  color: 'var(--ink)',
                  border: '1px solid var(--hairline)',
                  borderRadius: '6px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  whiteSpace: 'nowrap'
                }}
              >
                <Building2 size={13} />
                <span>영업 이관</span>
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
            backgroundColor: 'rgba(0,0,0,0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setDispatchDrawerOpen(false); }}
        >
          <div style={{
            width: '480px',
            maxHeight: '90vh',
            backgroundColor: 'var(--surface-1)',
            border: '1px solid var(--hairline)',
            borderRadius: '8px',
            boxShadow: '0 16px 40px rgba(0,0,0,0.45)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--hairline)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: '7px' }}>
                <Wrench size={16} style={{ color: 'var(--accent-primary)' }} />
                출장 배차 접수
              </span>
              <button onClick={() => setDispatchDrawerOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--ink-muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ flex: 1, padding: '14px 16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ backgroundColor: 'var(--surface-2)', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--hairline)', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div><span style={{ color: 'var(--ink-subtle)', marginRight: 6 }}>고객사</span><strong style={{ color: 'var(--ink)' }}>{selectedCustomer?.name || '미확인'}</strong></div>
                <div><span style={{ color: 'var(--ink-subtle)', marginRight: 6 }}>방문지</span>{selectedCustomer?.address || '-'} {selectedCustomer?.addressDetail ? `(${selectedCustomer.addressDetail})` : ''}</div>
                <div><span style={{ color: 'var(--ink-subtle)', marginRight: 6 }}>연락처</span>{selectedCustomer?.manager || '-'} · {selectedCustomer?.phone || '-'}</div>
                <div><span style={{ color: 'var(--ink-subtle)', marginRight: 6 }}>장비모델</span>{selectedCustomer?.assetModel || cleanModelCode || '미확인'} {selectedCustomer?.serialNumber ? `(${selectedCustomer.serialNumber})` : ''}</div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink-muted)' }}>관할 정비기사 (주소 기반 자동 매칭)</label>
                <select
                  value={assignedEngineer}
                  onChange={(e) => setAssignedEngineer(e.target.value)}
                  style={{ padding: '8px', backgroundColor: 'var(--surface-2)', border: '1px solid var(--hairline)', borderRadius: '5px', color: 'var(--ink)', fontSize: '13.5px' }}
                >
                  <option value="김철수 정비기사 (화성/경기남부)">김철수 정비기사 (화성/경기남부 관할)</option>
                  <option value="박영호 정비기사 (인천/서울서부)">박영호 정비기사 (인천/서울서부 관할)</option>
                  <option value="이지훈 정비기사 (평택/충청북부)">이지훈 정비기사 (평택/충청북부 관할)</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink-muted)' }}>방문 일시</label>
                <input
                  type="text"
                  value={dispatchDate}
                  onChange={(e) => setDispatchDate(e.target.value)}
                  style={{ padding: '8px', backgroundColor: 'var(--surface-2)', border: '1px solid var(--hairline)', borderRadius: '5px', color: 'var(--ink)', fontSize: '13.5px' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink-muted)' }}>정비기사 전달 메모 (대화내용 자동 요약)</label>
                <textarea
                  rows={3}
                  value={dispatchNote}
                  onChange={(e) => setDispatchNote(e.target.value)}
                  style={{ padding: '8px', backgroundColor: 'var(--surface-2)', border: '1px solid var(--hairline)', borderRadius: '5px', color: 'var(--ink)', fontSize: '13px', lineHeight: 1.4 }}
                />
              </div>
            </div>

            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--hairline)', backgroundColor: 'var(--surface-2)', display: 'flex', gap: '8px' }}>
              <button
                onClick={() => {
                  setDispatchDrawerOpen(false);
                  setIsDispatchDocModalOpen(true);
                }}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: 'var(--surface-1)',
                  color: 'var(--ink)',
                  border: '1px solid var(--hairline)',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                출장 안내 문서 조립
              </button>
              <button
                onClick={handleConfirmDispatch}
                style={{
                  flex: 1.4,
                  padding: '10px',
                  backgroundColor: 'var(--accent-primary)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13.5px',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                배차 확정 및 기사 전송
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
          backgroundColor: 'rgba(0,0,0,0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }}>
          <div style={{
            width: '420px',
            backgroundColor: 'var(--surface-1)',
            border: '1px solid var(--hairline)',
            borderRadius: '8px',
            padding: '18px',
            boxShadow: '0 16px 32px rgba(0,0,0,0.45)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--ink)' }}>영업팀 이관 접수</span>
              <button onClick={() => setSalesModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--ink-muted)', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink-muted)' }}>이관 유형</label>
              <select
                value={salesTransferType}
                onChange={(e) => setSalesTransferType(e.target.value)}
                style={{ padding: '8px', backgroundColor: 'var(--surface-2)', border: '1px solid var(--hairline)', borderRadius: '5px', color: 'var(--ink)', fontSize: '13.5px' }}
              >
                <option value="신규 렌탈 견적서 요청">신규 렌탈 견적서 요청</option>
                <option value="장비 추가 도입 및 계약 변경">장비 추가 도입 및 계약 변경</option>
                <option value="단순 소모품 구매 견적">단순 소모품 구매 견적</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink-muted)' }}>상세 요청사항 (자동 요약)</label>
              <textarea
                value={salesTransferNote}
                onChange={(e) => setSalesTransferNote(e.target.value)}
                rows={3}
                style={{ padding: '8px', backgroundColor: 'var(--surface-2)', border: '1px solid var(--hairline)', borderRadius: '5px', color: 'var(--ink)', fontSize: '13px', resize: 'none' }}
              />
            </div>

            <button
              onClick={handleConfirmSalesTransfer}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: 'var(--accent-warning)',
                color: '#0f172a',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 800,
                fontSize: '13.5px',
                cursor: 'pointer'
              }}
            >
              영업팀 대장 이관 확정
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. 4 VISUAL PHOTO-ASSEMBLY DOCUMENT MODALS                */}
      {/* ========================================================= */}
      {isManualModalOpen && (
        <EquipmentManualModal
          isOpen={isManualModalOpen}
          onClose={() => setIsManualModalOpen(false)}
          equipmentModel={cleanModelCode || 'J600T'}
          serialNumber={selectedCustomer?.serialNumber || ''}
          customerName={selectedCustomer?.name || ''}
          manager={selectedCustomer?.manager || ''}
          phone={selectedCustomer?.phone || ''}
          symptoms={detectedKeywordEntities.map(e => e.keyword)}
          onToast={(msg) => {
            showToast(msg);
            setTimeout(() => clearToast(), 3000);
          }}
        />
      )}

      {isPartsQuoteModalOpen && (
        <PartsOrderQuotationModal
          equipmentModel={cleanModelCode || 'J600T'}
          customerName={selectedCustomer?.name || ''}
          manager={selectedCustomer?.manager || ''}
          phone={selectedCustomer?.phone || ''}
          serialNumber={selectedCustomer?.serialNumber || ''}
          symptoms={detectedKeywordEntities.map(e => e.keyword)}
          onClose={() => setIsPartsQuoteModalOpen(false)}
          onToast={(msg) => {
            showToast(msg);
            setTimeout(() => clearToast(), 3000);
          }}
        />
      )}

      {isSelfGuideModalOpen && (
        <SelfActionGuideModal
          equipmentModel={cleanModelCode || 'J600T'}
          customerName={selectedCustomer?.name || ''}
          manager={selectedCustomer?.manager || ''}
          phone={selectedCustomer?.phone || ''}
          serialNumber={selectedCustomer?.serialNumber || ''}
          symptomTitle={activeKeywordEntity?.keyword || matchedDiagnosis?.category || '기본 자가점검'}
          symptomSteps={actionChecklist.map((c) => ({
            step_no: c.id,
            title: c.text,
            method: c.text,
          }))}
          onClose={() => setIsSelfGuideModalOpen(false)}
          onOpenPartsQuotation={() => {
            setIsSelfGuideModalOpen(false);
            setIsPartsQuoteModalOpen(true);
          }}
          onOpenDispatchPackage={() => {
            setIsSelfGuideModalOpen(false);
            setIsDispatchDocModalOpen(true);
          }}
          onResolveDirect={() => {
            setIsSelfGuideModalOpen(false);
            handleResolveComplete();
          }}
          onToast={(msg) => {
            showToast(msg);
            setTimeout(() => clearToast(), 3000);
          }}
        />
      )}

      {isDispatchDocModalOpen && (
        <DispatchDocPackageModal
          initialDoc1st={{
            recipientCompany: selectedCustomer?.name || '',
            recipientManager: selectedCustomer?.manager || '',
            recipientPhone: selectedCustomer?.phone || '',
            siteCompany: `${selectedCustomer?.address || ''} ${selectedCustomer?.addressDetail || ''}`.trim(),
            siteWorkerName: selectedCustomer?.manager || '',
            siteWorkerPhone: selectedCustomer?.phone || '',
            equipmentModel: cleanModelCode || 'J600T',
            serialNumber: selectedCustomer?.serialNumber || '',
            salesType: selectedCustomer?.salesType || '',
            symptoms: detectedKeywordEntities.map(e => e.keyword),
            assignedEngineer: assignedEngineer.split(' ')[0] || '김철수',
            plannedVisitAt: dispatchDate,
          }}
          initialDoc2nd={{
            recipientCompany: selectedCustomer?.name || '',
            recipientManager: selectedCustomer?.manager || '',
            recipientPhone: selectedCustomer?.phone || '',
            siteCompany: `${selectedCustomer?.address || ''} ${selectedCustomer?.addressDetail || ''}`.trim(),
            equipmentModel: cleanModelCode || 'J600T',
            serialNumber: selectedCustomer?.serialNumber || '',
            engineerName: assignedEngineer.split(' ')[0] || '김철수',
            visitedAt: dispatchDate,
          }}
          onClose={() => setIsDispatchDocModalOpen(false)}
          onToast={(msg) => {
            showToast(msg);
            setTimeout(() => clearToast(), 3000);
          }}
        />
      )}

      {/* ========================================================= */}
      {/* 6. TOAST NOTIFICATION & MIC TEST MODAL                    */}
      {/* ========================================================= */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '18px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#0f172a',
          border: '1px solid #10b981',
          color: '#ffffff',
          padding: '8px 16px',
          borderRadius: '6px',
          fontSize: '13px',
          fontWeight: 700,
          boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
          zIndex: 200,
          whiteSpace: 'nowrap'
        }}>
          {toastMessage}
        </div>
      )}

      <MicTestModal isOpen={isMicTestOpen} onClose={() => setIsMicTestOpen(false)} />
    </div>
  );
}
