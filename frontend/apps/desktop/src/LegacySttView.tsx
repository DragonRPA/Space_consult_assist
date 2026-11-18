import { lazy, Suspense, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useCounselStore } from './store';
import { applyContextualCorrection } from './contextCorrector';
import { insertOpenedSttArchive, syncLiveSttArchive } from './sttArchiveSync';
import {
  NAMED_ENTITY_REGISTRY,
  type KeywordEntity,
  type EntityRule,
} from './keywordRegistryData';
import {
  findCompoundSymptomEntity,
  findMatchingSymptomEntities,
  extractCustomerAndAddressEntities,
} from './keywordExtractors';
import type { CustomerInfo } from './store';
import {
  computeNextLeadGuidance,
  formatTimer,
} from './sttAudioDsp';
import { useRealtimeSttCapture } from './useRealtimeSttCapture';
import { LegacySttTopStrip, LegacySttPanelA } from './LegacySttTopAndLeftPane';
import { LegacySttTranscriptPane } from './LegacySttTranscriptPane';
import { LegacySttPanelC, LegacySttActionDialogs } from './LegacySttGuidanceAndDialogs';

const MicTestModal = lazy(() => import('./MicTestModal'));
const EquipmentManualModal = lazy(() => import('./EquipmentManualModal'));
const PartsOrderQuotationModal = lazy(() => import('./PartsOrderQuotationModal'));
const SelfActionGuideModal = lazy(() => import('./SelfActionGuideModal'));
const DispatchDocPackageModal = lazy(() => import('./DispatchDocPackageModal'));
const ConsultWrapupModal = lazy(() => import('./ConsultWrapupModal'));
const SttArchiveModal = lazy(() => import('./SttArchiveModal'));

export default function LegacySttView() {
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

  const [hoveredSttHelp, setHoveredSttHelp] = useState<{ label: string; desc: string; status?: string } | null>(null);
  const globalAudioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const transcriptBoxRef = useRef<HTMLDivElement | null>(null);
  // 단일 발화 원문 기반 사실 정보 추출기 (복합어 최우선 승격 규칙 적용)
  const evaluateUtteranceRules = useCallback((text: string) => {
    if (!text || !text.trim()) return;

    // 1. 명시적으로 발화된 고장 증상/부품 매칭 (원문 및 음운보정 텍스트 동시 검사 + 복합어 최우선)
    const correctedForMatch = applyContextualCorrection(text).correctedText;
    const combinedMatchTarget = correctedForMatch !== text ? `${text} ${correctedForMatch}` : text;
    const compoundPrimaryEntity = findCompoundSymptomEntity(combinedMatchTarget);
    const directMatches = findMatchingSymptomEntities(combinedMatchTarget);
    for (const entity of directMatches) {
      const curState = useCounselStore.getState();
      const alreadyDetected = curState.detectedKeywordEntities.some(e => e.id === entity.id);
      curState.addDetectedKeywordEntity(entity);
      const isCompoundUpgrade =
        Boolean(compoundPrimaryEntity && compoundPrimaryEntity.id === entity.id && curState.activeKeywordEntity?.id !== entity.id);
      if (!curState.activeKeywordEntity || isCompoundUpgrade) {
        curState.setActiveKeywordEntity(entity);
        setJustTriggeredKeyword(entity.keyword);
        curState.showToast(`[증상 확인: ${entity.keyword}]`);
        setTimeout(() => curState.clearToast(), 3000);
      } else if (!alreadyDetected) {
        setJustTriggeredKeyword(entity.keyword);
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


  const {
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
  } = useRealtimeSttCapture({
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
  });

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
      } catch {}
    }
    setIsAudioPlaying(false);
    setAudioTime(0, 0);
    setInterimSttText('');

    // 3. 화면 상담 세션 완전 초기화 (파일명 기반 사전 정보 표출 및 파일 메모리 디코딩 일절 금지)
    resetSessionForNewAudio();
    resetTempoProfile();
    setJustTriggeredKeyword(null);
    setConfirmedSlotFlags({ customer: false, phone: false, address: false, model: false });
    setRecommendedClosingAction('NONE');

    // 4. 백엔드 루프백 버퍼 클리어 요청
    if (loopbackWsRef.current && loopbackWsRef.current.readyState === WebSocket.OPEN) {
      try {
        loopbackWsRef.current.send(JSON.stringify({ action: 'clear_buffer' }));
      } catch {}
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
        const insId = await insertOpenedSttArchive({
          fileName: file.name,
          fileSizeBytes: file.size || 0,
          sttEngine: curEngine,
          sttLabOptions: sttLabOptionsRef.current,
        });
        if (insId && audioSessionIdRef.current === mySessionId) {
          activeArchiveIdRef.current = insId;
          setActiveArchiveId(insId);
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
        } catch {}
      }
      if (useCounselStore.getState().sttEngine === 'web_speech') {
        if (recognitionRef.current) {
          try { recognitionRef.current.abort(); } catch {}
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
        const createdId = await syncLiveSttArchive({
          curArchiveId: activeArchiveIdRef.current,
          fileName: activeAudioFile?.name || '실시간 마이크 수음',
          fileSizeBytes: activeAudioFile?.size || 0,
          audioDurationSec: audioDuration || callSeconds || 0,
          sttEngine,
          sttLabOptions: sttLabOptionsRef.current,
          paragraphs: finalParagraphs,
          detectedKeywords: detectedKeywordEntities,
          selectedCustomer,
        });
        if (createdId) {
          activeArchiveIdRef.current = createdId;
          setActiveArchiveId(createdId);
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
        try { loopbackWsRef.current.send(JSON.stringify({ action: 'clear_buffer' })); } catch {}
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
      try { loopbackWsRef.current.send(JSON.stringify({ action: 'clear_buffer' })); } catch {}
    }
    stopSttStreaming();
    setInterimSttText('');
    setIsAudioPlaying(false);
    setRecording(false);
    clearAudioFile();
    resetSessionForNewAudio();
    resetTempoProfile();
    setJustTriggeredKeyword(null);
    setConfirmedSlotFlags({ customer: false, phone: false, address: false, model: false });
    setRecommendedClosingAction('NONE');
    showToast("음성 파일 및 STT 수신이 즉시 제거되었습니다.");
    setTimeout(() => clearToast(), 2000);
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
  const nextLeadGuidance = useMemo(
    () =>
      computeNextLeadGuidance({
        confirmedSlots,
        activeKeywordEntity,
        matchedDiagnosis,
        assignedEngineer,
        recommendedClosingAction,
        cleanModelCode,
        totalCount,
        checkedCount,
        nextUncheckedStep,
      }),
    [
      confirmedSlots,
      activeKeywordEntity,
      matchedDiagnosis,
      assignedEngineer,
      recommendedClosingAction,
      cleanModelCode,
      totalCount,
      checkedCount,
      nextUncheckedStep,
    ]
  );

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
      {/* ========================================================= */}
      {/* 1. SLIM AUTO-CONFIRMED SLOTS & STT CONTROL STRIP (42px)   */}
      {/* ========================================================= */}
      <LegacySttTopStrip
        selectedCustomer={selectedCustomer}
        confirmedSlots={confirmedSlots}
        cleanModelCode={cleanModelCode}
        activeKeywordEntity={activeKeywordEntity}
        matchedDiagnosis={matchedDiagnosis}
        isCallActive={isCallActive}
        callSeconds={callSeconds}
        tempoBadgeText={tempoBadgeText}
        recognitionRef={recognitionRef}
        sttEngine={sttEngine}
        setSttEngine={setSttEngine}
        setInterimSttText={setInterimSttText}
        isAudioPlaying={isAudioPlaying}
        isRecording={isRecording}
        toggleManualStt={toggleManualStt}
        fileInputRef={fileInputRef}
        setIsArchiveModalOpen={setIsArchiveModalOpen}
        setIsMicTestOpen={setIsMicTestOpen}
      />

      {/* ========================================================= */}
      {/* 2. THREE-PANE LOW-COGNITIVE-LOAD WORKSPACE                */}
      {/* ========================================================= */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden', padding: '8px', gap: '8px' }}>
        <LegacySttPanelA
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchDropdownOpen={searchDropdownOpen}
          setSearchDropdownOpen={setSearchDropdownOpen}
          selectedSearchIndex={selectedSearchIndex}
          setSelectedSearchIndex={setSelectedSearchIndex}
          customerList={customerList}
          selectedCustomer={selectedCustomer}
          selectCustomer={selectCustomer}
          setConfirmedSlotFlags={setConfirmedSlotFlags}
          cleanModelCode={cleanModelCode}
          setSelectedCustomerModel={setSelectedCustomerModel}
          recommendedClosingAction={recommendedClosingAction}
          setIsManualModalOpen={setIsManualModalOpen}
          setIsSelfGuideModalOpen={setIsSelfGuideModalOpen}
          setIsPartsQuoteModalOpen={setIsPartsQuoteModalOpen}
          setIsDispatchDocModalOpen={setIsDispatchDocModalOpen}
        />

        <LegacySttTranscriptPane
          activeAudioFile={activeAudioFile}
          isRecording={isRecording}
          isAudioPlaying={isAudioPlaying}
          toggleAudioPlayback={toggleAudioPlayback}
          audioCurrentTime={audioCurrentTime}
          audioDuration={audioDuration}
          handleClearAudioFile={handleClearAudioFile}
          resetSessionForNewAudio={resetSessionForNewAudio}
          setJustTriggeredKeyword={setJustTriggeredKeyword}
          setConfirmedSlotFlags={setConfirmedSlotFlags}
          setRecommendedClosingAction={setRecommendedClosingAction}
          showToast={showToast}
          clearToast={clearToast}
          sttLabOptions={sttLabOptions}
          applySttLabPreset={applySttLabPreset}
          hoveredSttHelp={hoveredSttHelp}
          setHoveredSttHelp={setHoveredSttHelp}
          toggleSttLabOption={toggleSttLabOption}
          transcriptBoxRef={transcriptBoxRef}
          isUserScrolledUp={isUserScrolledUp}
          setIsUserScrolledUp={setIsUserScrolledUp}
          isDragOverDropzone={isDragOverDropzone}
          setIsDragOverDropzone={setIsDragOverDropzone}
          activeParagraphs={activeParagraphs}
          interimSttText={interimSttText}
          customerList={customerList}
          selectedCustomer={selectedCustomer}
          handleKeywordSelect={handleKeywordSelect}
          handleCustomerSelect={handleCustomerSelect}
          handleActionSelect={handleActionSelect}
          justTriggeredKeyword={justTriggeredKeyword}
          detectedKeywordEntities={detectedKeywordEntities}
          addDetectedKeywordEntity={addDetectedKeywordEntity}
          activeKeywordEntity={activeKeywordEntity}
          showAllSymptoms={showAllSymptoms}
          setShowAllSymptoms={setShowAllSymptoms}
          matchedDiagnosis={matchedDiagnosis}
          manualOverrideKeyword={manualOverrideKeyword}
          setManualOverrideKeyword={setManualOverrideKeyword}
          setDiagnosisResult={setDiagnosisResult}
          setSelectedCustomerModel={setSelectedCustomerModel}
        />

        <LegacySttPanelC
          nextLeadGuidance={nextLeadGuidance}
          confirmedSlots={confirmedSlots}
          checkedCount={checkedCount}
          totalCount={totalCount}
          nextUncheckedStep={nextUncheckedStep}
          actionChecklist={actionChecklist}
          toggleChecklist={toggleChecklist}
          setRecommendedClosingAction={setRecommendedClosingAction}
          setIsPartsQuoteModalOpen={setIsPartsQuoteModalOpen}
          setDispatchDrawerOpen={setDispatchDrawerOpen}
          dispatchNote={dispatchNote}
          showToast={showToast}
          clearToast={clearToast}
          isSubmitting={isSubmitting}
          setIsWrapupModalOpen={setIsWrapupModalOpen}
          handleResolveComplete={handleResolveComplete}
          setSalesModalOpen={setSalesModalOpen}
        />
      </div>

      <LegacySttActionDialogs
        dispatchDrawerOpen={dispatchDrawerOpen}
        setDispatchDrawerOpen={setDispatchDrawerOpen}
        selectedCustomer={selectedCustomer}
        cleanModelCode={cleanModelCode}
        assignedEngineer={assignedEngineer}
        setAssignedEngineer={setAssignedEngineer}
        dispatchDate={dispatchDate}
        setDispatchDate={setDispatchDate}
        dispatchNote={dispatchNote}
        setDispatchNote={setDispatchNote}
        setIsDispatchDocModalOpen={setIsDispatchDocModalOpen}
        handleConfirmDispatch={handleConfirmDispatch}
        salesModalOpen={salesModalOpen}
        setSalesModalOpen={setSalesModalOpen}
        salesTransferType={salesTransferType}
        setSalesTransferType={setSalesTransferType}
        salesTransferNote={salesTransferNote}
        setSalesTransferNote={setSalesTransferNote}
        handleConfirmSalesTransfer={handleConfirmSalesTransfer}
      />

      {/* ========================================================= */}
      {/* 5. 4 VISUAL PHOTO-ASSEMBLY DOCUMENT MODALS                */}
      {/* ========================================================= */}
      <Suspense fallback={null}>
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
      </Suspense>

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

      <Suspense fallback={null}>
        {isMicTestOpen && <MicTestModal isOpen={isMicTestOpen} onClose={() => setIsMicTestOpen(false)} />}
      </Suspense>
    </div>
  );
}
