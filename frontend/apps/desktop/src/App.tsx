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
import { ConsultWrapupModal } from './ConsultWrapupModal';
import { SttArchiveModal } from './SttArchiveModal';
import { supabase } from './scheduleApi';
import { applyContextualCorrection } from './contextCorrector';
import { 
  DOMAIN_KEYWORD_REGISTRY, 
  NAMED_ENTITY_REGISTRY, 
  findCompoundSymptomEntity,
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
  const [isWrapupModalOpen, setIsWrapupModalOpen] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [activeArchiveId, setActiveArchiveId] = useState<string | null>(null);
  const activeArchiveIdRef = useRef<string | null>(null);
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

  // ── 실시간 화자 템포·박자 적응형 VAD 프로파일러 (3대 STT 엔진 공통: Groq Whisper / CLOVA / Web Speech) ──
  const [tempoBadgeText, setTempoBadgeText] = useState<string>('박자 보통 0.85s');
  const tempoProfileRef = useRef({
    emaSps: 4.1,             // 화자 평균 발화 속도 (음절/초, 한국어 통화 표준 4.1)
    emaBreathPauseSec: 0.36, // 문장 내 숨고르기(Micro-Pause) 평균 길이 (초)
    emaEnvelopeRate: 3.8,    // 음향 포락선 음절 맥박 빈도 (peaks/sec)
    tempoMultiplier: 1.0,    // 통합 박자 배율 (0.76 = 빠름 ~ 1.48 = 느림/숙고)
    targetSilenceSec: 0.82,  // 표준 문장 절단 침묵 기준 (초, 기본 0.82s, 범위 0.56s ~ 1.22s)
    targetClauseSec: 0.46,   // 장문 구절 호흡 절단 기준 (초, 범위 0.34s ~ 0.68s)
    softMaxChunkSec: 5.2,    // 소프트 에너지 골짜기 절단 시작 시점 (초, 범위 4.2s ~ 6.6s)
    hardMaxChunkSec: 7.4,    // 최대 강제 절단 상한 (초, 범위 6.2s ~ 8.6s - 기계적 5.8초 균일 절단 해소)
    clovaGapMs: 650,         // CLOVA gRPC semanticEpd gapThreshold (ms)
    clovaDurMs: 6800,        // CLOVA gRPC semanticEpd durationThreshold (ms)
  });

  const whisperMaxChunkSec = 1.2;
  const whisperSilenceSec = 0.2;
  const webSpeechSilenceSecRef = useRef(0.95);
  const webSpeechCommitTimerRef = useRef<number | null>(null);
  const webSpeechTurnStartMsRef = useRef<number>(0);
  const webSpeechPendingFinalRef = useRef<string>('');
  const webSpeechAcousticFlushRef = useRef<((measuredDurSec?: number) => void) | null>(null);
  const lastRecognizedSentenceRef = useRef<string>('');

  // ── STT 전처리·문맥·음색 개별 ON/OFF 실험 스위치 (로컬스토리지 상태 보존) ──
  const STT_LAB_STORAGE_KEY = 'space_stt_lab_options_v1';
  const defaultSttLabOptions = {
    lowCut85Hz: true,           // 1. 저역 노이즈 차단 (85Hz High-Pass Filter)
    highBoostConsonant: false,  // 2. 고역 자음 증폭 (2.5~5.5kHz 프리엠퍼시스 부스트)
    dualSpeakerBalance: true,   // 3. 2화자 음색·성량 밸런서 (먹먹한 저음 화자 틸트 보정 + 로컬 볼륨 평탄화)
    rollingPrevSentence: true,  // 4. 직전 문장 문맥 포함 (Whisper prompt / CLOVA 동적 부스팅)
    domainWordBoost: true,      // 5. 도메인 단어장 주입 (모델명·부품명·고객사 사전 부스팅)
    wavPeakNormalize: true,     // 6. 음량 정규화 (DC 오프셋 제거 + -1.4dBFS 볼륨 증폭)
    boxcarAntiAliasing: true,   // 7. 안티에일리어싱 필터 (48kHz->16kHz 구간 평균 LPF)
    dynamicEnvelopeVad: true,   // 8. 호흡 적응형 절단 (상대 포락선 낙폭 VAD vs 고정 5.5초 주기 절단)
  };
  const [sttLabOptions, setSttLabOptions] = useState<typeof defaultSttLabOptions>(() => {
    try {
      const saved = window.localStorage.getItem(STT_LAB_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return {
            lowCut85Hz: typeof parsed.lowCut85Hz === 'boolean' ? parsed.lowCut85Hz : defaultSttLabOptions.lowCut85Hz,
            highBoostConsonant: typeof parsed.highBoostConsonant === 'boolean' ? parsed.highBoostConsonant : defaultSttLabOptions.highBoostConsonant,
            dualSpeakerBalance: typeof parsed.dualSpeakerBalance === 'boolean' ? parsed.dualSpeakerBalance : defaultSttLabOptions.dualSpeakerBalance,
            rollingPrevSentence: typeof parsed.rollingPrevSentence === 'boolean' ? parsed.rollingPrevSentence : defaultSttLabOptions.rollingPrevSentence,
            domainWordBoost: typeof parsed.domainWordBoost === 'boolean' ? parsed.domainWordBoost : defaultSttLabOptions.domainWordBoost,
            wavPeakNormalize: typeof parsed.wavPeakNormalize === 'boolean' ? parsed.wavPeakNormalize : defaultSttLabOptions.wavPeakNormalize,
            boxcarAntiAliasing: typeof parsed.boxcarAntiAliasing === 'boolean' ? parsed.boxcarAntiAliasing : defaultSttLabOptions.boxcarAntiAliasing,
            dynamicEnvelopeVad: typeof parsed.dynamicEnvelopeVad === 'boolean' ? parsed.dynamicEnvelopeVad : defaultSttLabOptions.dynamicEnvelopeVad,
          };
        }
      }
    } catch (_) {}
    return defaultSttLabOptions;
  });
  const [hoveredSttHelp, setHoveredSttHelp] = useState<{ label: string; desc: string; status?: string } | null>(null);
  const sttLabOptionsRef = useRef(sttLabOptions);
  useEffect(() => {
    sttLabOptionsRef.current = sttLabOptions;
    try {
      window.localStorage.setItem(STT_LAB_STORAGE_KEY, JSON.stringify(sttLabOptions));
    } catch (_) {}
  }, [sttLabOptions]);

  useEffect(() => {
    if (sttEngine === 'naver_clova') {
      setSttEngine('whisper_large_v3');
    }
  }, [sttEngine, setSttEngine]);

  const toggleSttLabOption = useCallback((key: keyof typeof defaultSttLabOptions) => {
    setSttLabOptions((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      sttLabOptionsRef.current = next;
      try {
        window.localStorage.setItem(STT_LAB_STORAGE_KEY, JSON.stringify(next));
      } catch (_) {}
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
              lowCut85Hz: true,
              highBoostConsonant: false,
              dualSpeakerBalance: true,
              rollingPrevSentence: true,
              domainWordBoost: true,
              wavPeakNormalize: true,
              boxcarAntiAliasing: true,
              dynamicEnvelopeVad: true,
            };
    sttLabOptionsRef.current = next;
    try {
      window.localStorage.setItem(STT_LAB_STORAGE_KEY, JSON.stringify(next));
    } catch (_) {}
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
      } catch (_) {
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
    } catch (_) {}
  }, [whisperMaxChunkSec, whisperSilenceSec, sttEngine]);

  const globalAudioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const loopbackWsRef = useRef<WebSocket | null>(null);
  const isRecordingRef = useRef(isRecording);
  isRecordingRef.current = isRecording;

  // 단일 발화 원문 기반 사실 정보 추출기 (복합어 최우선 승격 규칙 적용)
  const evaluateUtteranceRules = useCallback((text: string) => {
    if (!text || !text.trim()) return;

    // 1. 명시적으로 발화된 고장 증상/부품 매칭 (2단어 이상 결합된 복합어가 단일어보다 최우선)
    const compoundPrimaryEntity = findCompoundSymptomEntity(text);
    const directMatches = findMatchingSymptomEntities(text);
    for (const entity of directMatches) {
      const curState = useCounselStore.getState();
      const alreadyDetected = curState.detectedKeywordEntities.some(e => e.id === entity.id);
      curState.addDetectedKeywordEntity(entity);
      const isCompoundUpgrade =
        Boolean(compoundPrimaryEntity && compoundPrimaryEntity.id === entity.id && curState.activeKeywordEntity?.id !== entity.id);
      if (!curState.activeKeywordEntity || isCompoundUpgrade) {
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

  // STT 수신 텍스트 원문 직결 처리 (임의 단어 변형·의미 추론 배제 + 청크 사이즈 메타데이터 부착)
  const processIncomingSpeechUtterance = useCallback((rawText: string, chunkSizeBadge?: string) => {
    if (!rawText || !rawText.trim()) return;
    const trimmed = rawText.trim();
    const liveStore = useCounselStore.getState();

    const tsAndSizeMatch = trimmed.match(
      /^(\[\d{1,2}:\d{2}(?::\d{2})?\])\s*(\[\d+(?:\.\d+)?s\s*·\s*[^\]]+\])?\s*(.*)$/
    );

    let timestampStr = '';
    let sizeTagStr = chunkSizeBadge ? `${chunkSizeBadge.trim()} ` : '';
    let bodyText = trimmed;

    if (tsAndSizeMatch) {
      timestampStr = `${tsAndSizeMatch[1]} `;
      if (tsAndSizeMatch[2] && !sizeTagStr) {
        sizeTagStr = `${tsAndSizeMatch[2]} `;
      }
      bodyText = tsAndSizeMatch[3].trim();
    } else {
      const sizeOnlyMatch = trimmed.match(/^(\[\d+(?:\.\d+)?s\s*·\s*[^\]]+\])\s*(.*)$/);
      if (sizeOnlyMatch) {
        if (!sizeTagStr) sizeTagStr = `${sizeOnlyMatch[1]} `;
        bodyText = sizeOnlyMatch[2].trim();
      }
      const currentAudioTime = globalAudioRef.current ? globalAudioRef.current.currentTime : liveStore.audioCurrentTime;
      const targetSec = liveStore.activeAudioFile && currentAudioTime > 0 ? Math.floor(currentAudioTime) : liveStore.callSeconds;
      timestampStr = `[${formatTimer(targetSec)}] `;
    }

    if (!bodyText) return;
    const fullRawLine = `${timestampStr}${sizeTagStr}${bodyText}`.replace(/\s+/g, ' ').trim();
    const cleanContent = bodyText;

    // STT 엔진이 반환한 원문 그대로 대화창에 기록 (누적/중복 문장은 store에서 제자리 갱신)
    liveStore.appendFinalParagraph(fullRawLine, fullRawLine, []);
    const updatedParagraphs = useCounselStore.getState().finalParagraphs;
    const latestClean =
      updatedParagraphs.length > 0
        ? updatedParagraphs[updatedParagraphs.length - 1]
            .replace(/^\[\d{1,2}:\d{2}(?::\d{2})?\]\s*/, '')
            .replace(/^\[\d+(?:\.\d+)?s\s*·\s*[^\]]+\]\s*/, '')
            .trim()
        : cleanContent;
    evaluateUtteranceRules(cleanContent);
    if (latestClean !== cleanContent) {
      evaluateUtteranceRules(latestClean);
    }
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


  // 16kHz Mono Float32Array -> 16-bit PCM WAV Blob 인코더 (개별 스위치 기반 DSP 전처리 체인)
  const encodeWav16kMono = (samples: Float32Array, sampleRate = 16000): Blob => {
    const opts = sttLabOptionsRef.current;
    const numSamples = samples.length;
    const proc = new Float32Array(numSamples);

    // 0. 기본 DC 오프셋 계산 (음량 정규화 또는 필터 활성화 시 기준선 정렬)
    let sum = 0;
    for (let i = 0; i < numSamples; i++) {
      sum += samples[i];
    }
    const dcOffset = opts.wavPeakNormalize && numSamples > 0 ? sum / numSamples : 0;
    for (let i = 0; i < numSamples; i++) {
      proc[i] = samples[i] - dcOffset;
    }

    // 1. [스위치: 저역 노이즈 차단 (85Hz HPF)] 에어컨·팬·진동 초저주파 험 노이즈(0~85Hz) 2차(12dB/oct) 감쇠
    if (opts.lowCut85Hz && numSamples > 4) {
      const alphaHp = 1.0 / (1.0 + (2.0 * Math.PI * 85.0) / sampleRate); // ~0.9677 @ 16kHz
      for (let pass = 0; pass < 2; pass++) {
        let prevX = proc[0];
        let prevY = proc[0];
        for (let i = 1; i < numSamples; i++) {
          const x = proc[i];
          const y = alphaHp * (prevY + x - prevX);
          proc[i] = y;
          prevX = x;
          prevY = y;
        }
      }
    }

    // 2. [스위치: 2화자 음색·성량 보정 (Dual-Speaker Timbre & Loudness Balancer)]
    //    (a) 저음·수화기 너머 먹먹한 화자(고역 에너지 비율 < 0.42)일 때만 자음 명료도 틸트를 자동 보강하고 고음 화자는 원본 유지
    //    (b) 0.35초 로컬 윈도우별 성량 격차 평탄화(큰 목소리 상담원과 작은 목소리 고객 간 볼륨 비대칭 해소)
    if (opts.dualSpeakerBalance && numSamples > 320) {
      let absSum = 0;
      let diffSum = 0;
      for (let i = 1; i < numSamples; i++) {
        absSum += Math.abs(proc[i]);
        diffSum += Math.abs(proc[i] - proc[i - 1]);
      }
      const hfRatio = absSum > 1e-5 ? diffSum / absSum : 0.45;
      if (hfRatio < 0.42) {
        const tiltCoeff = Math.min(0.52, (0.44 - hfRatio) * 1.65);
        for (let i = numSamples - 1; i >= 1; i--) {
          proc[i] = proc[i] + tiltCoeff * (proc[i] - proc[i - 1]);
        }
      }

      // 0.35초(5600샘플) 블록 단위 로컬 RMS 측정 후 작은 목소리 구간만 최대 2.4배 부드럽게 부스트
      const winSize = 5600;
      let globalVoicedSq = 0;
      let globalVoicedCnt = 0;
      for (let i = 0; i < numSamples; i++) {
        const v = proc[i];
        if (Math.abs(v) > 0.006) {
          globalVoicedSq += v * v;
          globalVoicedCnt++;
        }
      }
      const targetRms = globalVoicedCnt > 0 ? Math.sqrt(globalVoicedSq / globalVoicedCnt) : 0;
      if (targetRms > 0.008) {
        const numWins = Math.max(1, Math.ceil(numSamples / winSize));
        const winGains = new Float32Array(numWins);
        for (let w = 0; w < numWins; w++) {
          const sIdx = w * winSize;
          const eIdx = Math.min(numSamples, sIdx + winSize);
          let wSq = 0;
          for (let i = sIdx; i < eIdx; i++) wSq += proc[i] * proc[i];
          const wRms = Math.sqrt(wSq / Math.max(1, eIdx - sIdx));
          // 무음(배경 히스)은 키우지 않고, 작은 목소리로 말한 구간(targetRms의 22%~85%)만 끌어올림
          if (wRms > targetRms * 0.22 && wRms < targetRms * 0.92) {
            winGains[w] = Math.min(2.35, Math.max(1.0, (targetRms * 0.92) / wRms));
          } else {
            winGains[w] = 1.0;
          }
        }
        for (let i = 0; i < numSamples; i++) {
          const wFloat = i / winSize;
          const w0 = Math.min(numWins - 1, Math.floor(wFloat));
          const w1 = Math.min(numWins - 1, w0 + 1);
          const frac = wFloat - w0;
          const g = winGains[w0] * (1 - frac) + winGains[w1] * frac;
          proc[i] *= g;
        }
      }
    }

    // 3. [스위치: 고역 자음 증폭 (3.2kHz Consonant Boost)] 한국어 마찰음·파열음(ㅅ,ㅈ,ㅊ,ㅋ,ㅌ,ㅍ) 고역 프리엠퍼시스 증폭
    if (opts.highBoostConsonant && numSamples > 2) {
      const preEmp = 0.56;
      for (let i = numSamples - 1; i >= 1; i--) {
        proc[i] = proc[i] + preEmp * (proc[i] - proc[i - 1]);
      }
    }

    // 4. [스위치: 음량 정규화 (WAV Gain)] 돌발 클릭음 영향을 배제한 99% 분위수 기반 -1.4dBFS(0.85) 증폭 vs 순정 원본(1.0)
    let normGain = 1.0;
    if (opts.wavPeakNormalize && numSamples > 0) {
      let peak = 0;
      for (let i = 0; i < numSamples; i++) {
        const v = Math.abs(proc[i]);
        if (v > peak) peak = v;
      }
      normGain = peak > 0.008 ? Math.min(8.5, Math.max(1.0, 0.85 / peak)) : 1.0;
    }

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
      const normalized = proc[i] * normGain;
      // Soft-knee saturation防止: 0.95 이상 돌발 피크는 완만하게 리미팅하여 디지털 클리핑 왜곡 차단
      const s =
        normalized > 0.95
          ? Math.min(1.0, 0.95 + Math.tanh((normalized - 0.95) * 2.0) * 0.05)
          : normalized < -0.95
            ? Math.max(-1.0, -0.95 + Math.tanh((normalized + 0.95) * 2.0) * 0.05)
            : normalized;
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
    resetTempoProfile();
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

    // 6. 음성 파일 열람 즉시 public.stt_audio_archives 테이블에 초기 세션 행 생성 (OPENED)
    activeArchiveIdRef.current = null;
    setActiveArchiveId(null);
    void (async () => {
      try {
        const curEngine = useCounselStore.getState().sttEngine;
        const { data: insRow, error: insErr } = await supabase
          .from('stt_audio_archives')
          .insert([
            {
              file_name: file.name,
              file_size_bytes: file.size || 0,
              audio_duration_sec: 0,
              stt_engine: curEngine,
              stt_lab_options: sttLabOptionsRef.current,
              stt_text: '',
              stt_paragraphs: [],
              paragraph_count: 0,
              detected_keywords: [],
              status: 'OPENED',
            },
          ])
          .select('id')
          .single();
        if (!insErr && insRow?.id && audioSessionIdRef.current === mySessionId) {
          activeArchiveIdRef.current = insRow.id;
          setActiveArchiveId(insRow.id);
        }
      } catch (e) {
        console.warn('stt_audio_archives OPENED insert notice:', e);
      }
    })();

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

    showToast(`[${file.name}] 스피커 재생 및 마이크 수음 시작 (DB 기록 시작)`);
    setTimeout(() => clearToast(), 3000);
  }, [abortAllClovaStreams, resetSessionForNewAudio, resetTempoProfile, setActiveAudioFile, setIsAudioPlaying, setAudioTime, setInterimSttText, setRecording, startSttStreaming, showToast, clearToast]);

  // STT 추출 텍스트가 누적·갱신될 때마다 public.stt_audio_archives 테이블에 실시간 자동 반영
  useEffect(() => {
    if (finalParagraphs.length === 0) return;
    const timer = window.setTimeout(async () => {
      try {
        const joinedText = finalParagraphs.join('\n');
        const rawMod = selectedCustomer?.assetModel || '';
        const modMatch = rawMod.match(/\b(J600T?|J800|S12L?|S7P?|S5|S3|S2|S1|R3|XD80|XD60|S800|M100|Q45)\b/i);
        const eqMod = modMatch ? modMatch[1].toUpperCase() : rawMod;
        const payload: Record<string, unknown> = {
          file_name: activeAudioFile?.name || '실시간 마이크 수음',
          file_size_bytes: activeAudioFile?.size || 0,
          audio_duration_sec: Number((audioDuration || callSeconds || 0).toFixed(2)),
          stt_engine: sttEngine,
          stt_lab_options: sttLabOptionsRef.current,
          stt_text: joinedText,
          stt_paragraphs: finalParagraphs,
          paragraph_count: finalParagraphs.length,
          detected_keywords: detectedKeywordEntities.map((k) => ({
            id: k.id,
            keyword: k.keyword,
            category: k.category,
          })),
          customer_name: selectedCustomer?.name || '',
          manager_name: selectedCustomer?.manager || '',
          phone: selectedCustomer?.phone || '',
          address: `${selectedCustomer?.address || ''} ${selectedCustomer?.addressDetail || ''}`.trim(),
          equipment_model: eqMod || '',
          updated_at: new Date().toISOString(),
        };

        const curArchiveId = activeArchiveIdRef.current;
        if (curArchiveId) {
          await supabase
            .from('stt_audio_archives')
            .update({ ...payload, status: 'STT_COMPLETED' })
            .eq('id', curArchiveId)
            .in('status', ['OPENED', 'STT_PROCESSING', 'STT_COMPLETED']);
          await supabase
            .from('stt_audio_archives')
            .update(payload)
            .eq('id', curArchiveId)
            .in('status', ['AI_ANALYZED', 'CONFIRMED']);
        } else {
          const { data: insRow } = await supabase
            .from('stt_audio_archives')
            .insert([{ ...payload, status: 'STT_COMPLETED' }])
            .select('id')
            .single();
          if (insRow?.id) {
            activeArchiveIdRef.current = insRow.id;
            setActiveArchiveId(insRow.id);
          }
        }
      } catch (e) {
        console.warn('stt_audio_archives auto-sync notice:', e);
      }
    }, 650);

    return () => window.clearTimeout(timer);
  }, [
    finalParagraphs,
    activeAudioFile,
    audioDuration,
    callSeconds,
    sttEngine,
    detectedKeywordEntities,
    selectedCustomer,
  ]);

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
    resetTempoProfile();
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
      showToast(
        `STT 청음 시작 (${
          sttEngine === 'whisper_large_v3'
            ? 'Groq Whisper LPU'
            : sttEngine === 'naver_clova'
              ? '네이버 클로바 STT'
              : '브라우저 내장 STT'
        })`
      );
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
      const wavBlob = encodeWav16kMono(floatArr, 16000);
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
      const normSeg = (str: string) => str.replace(/[\s.,?!~·\-]/g, '');

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
              } catch (_) {}
            }
          }
          if (lineBuf.trim() && audioSessionIdRef.current === capturedSessionId) {
            try {
              const segObj = JSON.parse(lineBuf.trim());
              const cleanText = String(segObj?.text || '').trim();
              if (cleanText) {
                handleChunkSegment(cleanText);
              }
            } catch (_) {}
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
        try { processorNode.disconnect(); } catch (_) {}
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

    // 각 resultIndex 별로 이미 확정(Commit)된 원문을 기록하여,
    // 동일 resultIndex 내에서 interim -> interim 또는 interim -> isFinal 전환 시 앞 문장이 누적 반복되는 현상을 원천 차단
    const consumedRawByResultIdx = new Map<number, string>();
    let lastVoiceActivityMs = 0;
    let latestUnconsumedInterimEntries: Array<{ index: number; rawTranscript: string; delta: string }> = [];

    const normChars = (s: string): string => s.replace(/[\s.,?!~·\-]/g, '');

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
        if (!/[\s.,?!~·\-]/.test(rawTrim[k])) {
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
      return rawTrim.slice(rawCutIdx).replace(/^[\s.,?!~·\-]+/, '').trim();
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
          setInterimSttText(applyContextualCorrection(previewDisplay).correctedText);
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
        const correctedInterim = applyContextualCorrection(combinedPreview).correctedText;
        setInterimSttText(correctedInterim);

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

          {/* Adaptive Speaker Tempo Status Pill */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 8px',
            borderRadius: '5px',
            backgroundColor: tempoBadgeText.startsWith('박자 빠름')
              ? '#eff6ff'
              : tempoBadgeText.startsWith('박자 느림')
              ? '#fefce8'
              : 'var(--surface-2)',
            border: `1px solid ${
              tempoBadgeText.startsWith('박자 빠름')
                ? '#93c5fd'
                : tempoBadgeText.startsWith('박자 느림')
                ? '#fde047'
                : 'var(--hairline)'
            }`,
            color: tempoBadgeText.startsWith('박자 빠름')
              ? '#1d4ed8'
              : tempoBadgeText.startsWith('박자 느림')
              ? '#854d0e'
              : 'var(--ink-muted)',
            fontSize: '11.5px',
            fontWeight: 700,
            whiteSpace: 'nowrap'
          }}>
            <Clock size={11} />
            <span>{tempoBadgeText}</span>
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
              title="Groq Whisper (whisper-large-v3-turbo): LPU 기반 초고속 한국어 음성 인식 및 직전문맥·도메인 단어 프롬프트 지원"
              onClick={() => {
                if (recognitionRef.current) {
                  try { recognitionRef.current.stop(); } catch (_) {}
                }
                setSttEngine('whisper_large_v3');
              }}
              style={{
                padding: '3px 8px',
                fontSize: '11.5px',
                fontWeight: 700,
                color: sttEngine === 'whisper_large_v3' ? '#fff' : '#334155',
                backgroundColor: sttEngine === 'whisper_large_v3' ? '#ea580c' : 'transparent',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              Groq Whisper
            </button>
            <button
              title="웹 음성 STT (Web Speech API): 브라우저 내장 실시간 스트리밍 음성 인식"
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
            <button
              disabled
              title="클로바 STT: 응답 속도 및 정확도 이슈로 현재 비활성화됨"
              style={{
                padding: '3px 8px',
                fontSize: '11.5px',
                fontWeight: 700,
                color: '#94a3b8',
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: '4px',
                cursor: 'not-allowed',
                opacity: 0.55,
                whiteSpace: 'nowrap'
              }}
            >
              클로바 STT
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

          {/* STT & AI Archive History */}
          <button
            onClick={() => setIsArchiveModalOpen(true)}
            title="열어본 음성파일 · STT 추출텍스트 · AI 결론 DB 기록 보관함"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 10px',
              borderRadius: '5px',
              border: '1px solid #93c5fd',
              backgroundColor: '#eff6ff',
              color: '#1e3a8a',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            <FileText size={12} />
            <span>파일·STT 기록</span>
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

          {/* STT 전처리·문맥 개별 스위치 바 (8대 기법 개별 ON/OFF 실험용) */}
          <div
            onMouseLeave={() => setHoveredSttHelp(null)}
            style={{
              position: 'relative',
              padding: '6px 10px',
              borderBottom: '1px solid var(--hairline)',
              backgroundColor: '#f8fafc',
              display: 'flex',
              flexDirection: 'column',
              gap: '5px',
              flexShrink: 0
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#334155', whiteSpace: 'nowrap' }}>
                전처리·문맥 스위치
              </span>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <button
                  onClick={() => applySttLabPreset('RAW_DEFAULT')}
                  title="순정 원본 (전체 OFF): 8가지 음향 전처리·문맥 주입·적응형 절단을 모두 끄고 원본 오디오(고정 5.5초 주기) 그대로 STT 엔진에 전송합니다."
                  onMouseEnter={() =>
                    setHoveredSttHelp({
                      label: '순정 원본 (전체 OFF)',
                      status: '프리셋',
                      desc: '8가지 음향 전처리·문맥 주입·적응형 절단을 모두 끄고 원본 오디오(고정 5.5초 주기) 그대로 STT 엔진에 전송합니다.'
                    })
                  }
                  onMouseLeave={() => setHoveredSttHelp(null)}
                  style={{
                    padding: '2px 6px',
                    fontSize: '10.5px',
                    fontWeight: 700,
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: Object.values(sttLabOptions).every((v) => !v) ? '#0f172a' : '#ffffff',
                    color: Object.values(sttLabOptions).every((v) => !v) ? '#ffffff' : '#475569',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  순정 원본 (전체 OFF)
                </button>
                <button
                  onClick={() => applySttLabPreset('RECOMMENDED')}
                  title="권장 설정: 통화 녹음 표준 최적 조합(자음증폭 3.2kHz만 OFF, 나머지 7종 ON)을 일괄 적용합니다."
                  onMouseEnter={() =>
                    setHoveredSttHelp({
                      label: '권장 설정',
                      status: '프리셋',
                      desc: '통화 녹음 표준 최적 조합(자음증폭 3.2kHz만 OFF, 나머지 7종 ON)을 일괄 적용합니다.'
                    })
                  }
                  onMouseLeave={() => setHoveredSttHelp(null)}
                  style={{
                    padding: '2px 6px',
                    fontSize: '10.5px',
                    fontWeight: 700,
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    backgroundColor:
                      sttLabOptions.lowCut85Hz &&
                      !sttLabOptions.highBoostConsonant &&
                      sttLabOptions.dualSpeakerBalance &&
                      sttLabOptions.rollingPrevSentence &&
                      sttLabOptions.domainWordBoost &&
                      sttLabOptions.wavPeakNormalize &&
                      sttLabOptions.boxcarAntiAliasing &&
                      sttLabOptions.dynamicEnvelopeVad
                        ? '#2563eb'
                        : '#ffffff',
                    color:
                      sttLabOptions.lowCut85Hz &&
                      !sttLabOptions.highBoostConsonant &&
                      sttLabOptions.dualSpeakerBalance &&
                      sttLabOptions.rollingPrevSentence &&
                      sttLabOptions.domainWordBoost &&
                      sttLabOptions.wavPeakNormalize &&
                      sttLabOptions.boxcarAntiAliasing &&
                      sttLabOptions.dynamicEnvelopeVad
                        ? '#ffffff'
                        : '#475569',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  권장 설정
                </button>
                <button
                  onClick={() => applySttLabPreset('ALL_ON')}
                  title="전체 켜기: 자음증폭(3.2kHz)을 포함한 8가지 전처리·문맥·음색 보정 기법을 모두 활성화합니다."
                  onMouseEnter={() =>
                    setHoveredSttHelp({
                      label: '전체 켜기',
                      status: '프리셋',
                      desc: '자음증폭(3.2kHz)을 포함한 8가지 전처리·문맥·음색 보정 기법을 모두 활성화합니다.'
                    })
                  }
                  onMouseLeave={() => setHoveredSttHelp(null)}
                  style={{
                    padding: '2px 6px',
                    fontSize: '10.5px',
                    fontWeight: 700,
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: Object.values(sttLabOptions).every(Boolean) ? '#059669' : '#ffffff',
                    color: Object.values(sttLabOptions).every(Boolean) ? '#ffffff' : '#475569',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  전체 켜기
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '4px' }}>
              {(
                [
                  {
                    key: 'lowCut85Hz',
                    label: '저역차단 85Hz',
                    desc: '85Hz 이하 저주파 대역(에어컨·환풍기·책상 진동·마이크 험 노이즈)을 고역통과 필터(HPF)로 제거하여 무음 오인식 및 저역 마스킹을 방지합니다.'
                  },
                  {
                    key: 'highBoostConsonant',
                    label: '자음증폭 3.2kHz',
                    desc: '3.2kHz 대역 피킹 필터(+4.5dB)로 한국어 파열음·마찰음(ㄱ,ㄷ,ㅂ,ㅅ,ㅈ,ㅊ,ㅋ,ㅌ,ㅍ) 명료도를 증폭합니다. 고역 치찰음이 강할 때는 OFF 하세요.'
                  },
                  {
                    key: 'dualSpeakerBalance',
                    label: '2화자 음색·성량',
                    desc: '상담원과 고객의 음색 높낮이(먹먹한 저음 화자 틸트 보정) 및 마이크 거리 차이로 인한 볼륨 편차를 문장 구간별로 자동 평탄화합니다.'
                  },
                  {
                    key: 'rollingPrevSentence',
                    label: '직전문장 포함',
                    desc: '직전 1~2문장의 인식 결과를 다음 음성 조각의 문맥 프롬프트(Whisper prompt)로 전달하여 끊어진 문장 연결과 동음이의어 추론을 강화합니다.'
                  },
                  {
                    key: 'domainWordBoost',
                    label: '도메인 단어장',
                    desc: '청소장비 모델명(J600T, S7, XD80 등), 주요 부품(스퀴지, 흡입모터, 솔레노이드), 현장 용어를 엔진 사전 프롬프트에 주입하여 고유명사 오타를 줄입니다.'
                  },
                  {
                    key: 'wavPeakNormalize',
                    label: '음량 정규화',
                    desc: '전송 직전 PCM 파형의 DC 오프셋을 제거하고 최대 피크를 -1.4dBFS(85% 진폭)로 정규화하여 작은 목소리도 균일한 음량으로 인식시킵니다.'
                  },
                  {
                    key: 'boxcarAntiAliasing',
                    label: '안티에일리어싱',
                    desc: '48kHz 원본 음성을 16kHz로 다운샘플링할 때 단순 샘플 건너뛰기 대신 구간 평균(Boxcar LPF)을 적용해 고주파 접힘 왜곡(Aliasing)을 차단합니다.'
                  },
                  {
                    key: 'dynamicEnvelopeVad',
                    label: '호흡 적응절단',
                    desc: '고정 5.5초 기계적 절단 대신 화자의 발화 속도·에너지 낙폭(Envelope Drop)과 주변 소음 바닥을 추적하여 자연스러운 호흡·구절 단위로 음성을 절단합니다.'
                  },
                ] as const
              ).map((item) => {
                const isOn = sttLabOptions[item.key];
                return (
                  <button
                    key={item.key}
                    onClick={() => {
                      toggleSttLabOption(item.key);
                      setHoveredSttHelp({
                        label: item.label,
                        status: !isOn ? '현재 ON' : '현재 OFF',
                        desc: item.desc
                      });
                    }}
                    title={`${item.label} (${isOn ? 'ON' : 'OFF'}): ${item.desc}`}
                    onMouseEnter={() =>
                      setHoveredSttHelp({
                        label: item.label,
                        status: isOn ? '현재 ON' : '현재 OFF',
                        desc: item.desc
                      })
                    }
                    onMouseLeave={() => setHoveredSttHelp(null)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '4px',
                      padding: '3px 6px',
                      borderRadius: '4px',
                      border: isOn ? '1px solid #2563eb' : '1px solid #cbd5e1',
                      backgroundColor: isOn ? '#eff6ff' : '#ffffff',
                      color: isOn ? '#1e3a8a' : '#64748b',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden'
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
                    <span
                      style={{
                        padding: '0px 4px',
                        borderRadius: '3px',
                        fontSize: '9.5px',
                        fontWeight: 800,
                        backgroundColor: isOn ? '#2563eb' : '#e2e8f0',
                        color: isOn ? '#ffffff' : '#64748b',
                        flexShrink: 0
                      }}
                    >
                      {isOn ? 'ON' : 'OFF'}
                    </span>
                  </button>
                );
              })}
            </div>

            {hoveredSttHelp && (
              <div
                style={{
                  position: 'absolute',
                  left: '8px',
                  right: '8px',
                  top: 'calc(100% + 4px)',
                  zIndex: 45,
                  backgroundColor: '#0f172a',
                  color: '#f8fafc',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  padding: '7px 10px',
                  boxShadow: '0 8px 20px rgba(15, 23, 42, 0.28)',
                  pointerEvents: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '3px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#38bdf8' }}>
                    {hoveredSttHelp.label}
                  </span>
                  {hoveredSttHelp.status && (
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        padding: '1px 5px',
                        borderRadius: '3px',
                        backgroundColor:
                          hoveredSttHelp.status === '현재 ON'
                            ? '#1d4ed8'
                            : hoveredSttHelp.status === '현재 OFF'
                              ? '#334155'
                              : '#0369a1',
                        color: '#ffffff'
                      }}
                    >
                      {hoveredSttHelp.status}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '11.5px', lineHeight: 1.45, color: '#e2e8f0', fontWeight: 500 }}>
                  {hoveredSttHelp.desc}
                </div>
              </div>
            )}
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
                    const match = line.match(
                      /^(\[\d{1,2}:\d{2}(?::\d{2})?\])\s*(\[\d+(?:\.\d+)?s\s*·\s*[^\]]+\])?\s*(.*)$/
                    );
                    const timestampBadge = match ? match[1] : null;
                    const chunkSizeBadge = match ? match[2] : null;
                    const contentText = match ? match[3] : line;

                    return (
                      <div key={pIdx} style={{ display: 'flex', alignItems: 'baseline', gap: '6px', minHeight: '1.5em', marginBottom: '4px' }}>
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
                        {chunkSizeBadge && (
                          <span style={{
                            fontFamily: 'monospace',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            color: '#0369a1',
                            backgroundColor: '#f0f9ff',
                            border: '1px solid #bae6fd',
                            borderRadius: '3px',
                            padding: '0px 5px',
                            flexShrink: 0,
                            whiteSpace: 'nowrap',
                            userSelect: 'none'
                          }}>
                            {chunkSizeBadge}
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

            {/* 1-Click AI Multi-Outcome Wrap-Up Button (Groq Cloud LPU) */}
            <button
              onClick={() => setIsWrapupModalOpen(true)}
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '9px 10px',
                backgroundColor: '#0f172a',
                color: '#ffffff',
                border: '1.5px solid #2563eb',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 800,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                whiteSpace: 'nowrap'
              }}
            >
              <Zap size={14} style={{ color: '#38bdf8' }} />
              <span>AI 결론 정리 (기술·견적·시연·납품·AS 일괄 분류)</span>
            </button>

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

      {isWrapupModalOpen && (
        <ConsultWrapupModal
          isOpen={isWrapupModalOpen}
          onClose={() => setIsWrapupModalOpen(false)}
          transcriptText={finalParagraphs.join('\n')}
          selectedCustomer={selectedCustomer}
          equipmentModel={cleanModelCode || 'J600T'}
          detectedKeywords={detectedKeywordEntities}
          checklist={actionChecklist}
          assignedEngineer={assignedEngineer}
          dispatchDate={dispatchDate}
          archiveId={activeArchiveId}
          audioFileName={activeAudioFile?.name || '실시간 마이크 수음'}
          audioFileSize={activeAudioFile?.size || 0}
          audioDurationSec={audioDuration || callSeconds || 0}
          sttEngine={sttEngine}
          sttLabOptions={sttLabOptions}
          sttParagraphs={finalParagraphs}
          onArchiveIdChange={(id) => {
            activeArchiveIdRef.current = id;
            setActiveArchiveId(id);
          }}
          onOpenPartsQuote={() => {
            setIsWrapupModalOpen(false);
            setIsPartsQuoteModalOpen(true);
          }}
          onOpenDispatchDoc={() => {
            setIsWrapupModalOpen(false);
            setIsDispatchDocModalOpen(true);
          }}
          onCompleteWrapup={(summaryNote) => {
            setDispatchNote(summaryNote);
            const curCust = useCounselStore.getState().selectedCustomer;
            if (curCust) {
              const todayStr = new Date().toISOString().slice(0, 10);
              const updatedCust = {
                ...curCust,
                historyTimeline: [
                  { date: `방금 (${todayStr})`, title: summaryNote },
                  ...(curCust.historyTimeline || []),
                ],
              };
              selectCustomer(updatedCust);
            }
          }}
          onToast={(msg) => {
            showToast(msg);
            setTimeout(() => clearToast(), 3500);
          }}
        />
      )}

      {isArchiveModalOpen && (
        <SttArchiveModal
          isOpen={isArchiveModalOpen}
          onClose={() => setIsArchiveModalOpen(false)}
          onLoadTranscript={(fileName, paras) => {
            handlePasteText(paras.join('\n'), fileName);
          }}
          onToast={(msg) => {
            showToast(msg);
            setTimeout(() => clearToast(), 3500);
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
