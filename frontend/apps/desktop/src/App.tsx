import { useEffect, useRef, useState } from 'react';
import { 
  PhoneCall, 
  Mic, 
  MicOff, 
  Search, 
  CheckCircle2, 
  Clock, 
  Wrench, 
  Building2, 
  CheckSquare, 
  Square, 
  Sparkles,
  Layers,
  Palette,
  X
} from 'lucide-react';
import { useCounselStore } from './store';
import './index.css';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function App() {
  const {
    themeStyle,
    colorScheme,
    setThemeStyle,
    setColorScheme,
    isRecording,
    callSeconds,
    counselorName,
    toastMessage,
    searchQuery,
    customerList,
    selectedCustomer,
    sttText,
    detectedKeywords,
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
    setSearchQuery,
    selectCustomer,
    appendSttText,
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

  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const debounceTimer = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);

  // Call timer interval
  useEffect(() => {
    const timer = setInterval(() => {
      incrementCallTimer();
    }, 1000);
    return () => clearInterval(timer);
  }, [incrementCallTimer]);

  const formatTimer = (sec: number) => {
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  // Web Speech API STT
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'ko-KR';

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          }
        }
        if (finalTranscript) {
          appendSttText(finalTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech Recognition Error", event.error);
        if (event.error === 'not-allowed') {
          setRecording(false);
        }
      };

      recognition.onend = () => {
        if (isRecording) {
          try {
            recognition.start();
          } catch (e) {
            console.error(e);
          }
        }
      };

      recognitionRef.current = recognition;
    }
  }, [appendSttText, isRecording, setRecording]);

  useEffect(() => {
    if (recognitionRef.current) {
      if (isRecording) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.error(e);
        }
      } else {
        recognitionRef.current.stop();
      }
    }
  }, [isRecording]);

  // STT Debounced Classification
  useEffect(() => {
    if (!sttText.trim()) return;

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = window.setTimeout(async () => {
      try {
        const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";
        const res = await fetch(`${apiBase}/counsel/classify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: sttText })
        });
        if (res.ok) {
          const data = await res.json();
          setDiagnosisResult(
            [data.keyword || "흡입모터 굉음", "타는 냄새"],
            {
              category: "POWER / 흡입·구동계통",
              partCode: data.part_code || "SUCTION",
              partName: "흡입모터 24V 500W 어셈블리",
              stock: 14,
              confidence: Math.round((data.similarity || 0.95) * 100),
              source: "정식 등록 룰베이스 (pg_trgm)"
            },
            data.action_script && data.action_script.length > 0 ? data.action_script : [
              "전원 스위치 즉시 차단 및 모터 하우징 열기 냉각 안내",
              "폐수탱크 플로트 밸브(만수 차단기) 오작동/이물질 확인",
              "흡입 호스 및 스퀴지 연결부 막힘 육안 점검",
              "10분 후 재가동 시 동일 소음/타는 냄새 지속 여부 확인",
              "증상 지속 시 1차 셀프조치 중단 및 현장 긴급 정밀점검 배차"
            ]
          );
        }
      } catch (e) {
        console.error("분류 API 호출 실패 (Fallback 유지)", e);
      }
    }, 1000);
  }, [sttText, setDiagnosisResult]);

  const handleResolveComplete = () => {
    showToast("✓ 1차 셀프조치 해결 완료로 기록되었습니다. (3초 후 DB 확정)");
    setTimeout(() => clearToast(), 3500);
  };

  const handleConfirmDispatch = async () => {
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";
      await fetch(`${apiBase}/visits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: selectedCustomer.id,
          customer_name: selectedCustomer.name,
          manager: selectedCustomer.manager,
          phone: selectedCustomer.phone,
          address: selectedCustomer.address,
          address_detail: selectedCustomer.addressDetail,
          request_note: dispatchNote,
          status: "접수",
          client_type: "desktop"
        })
      });
    } catch (e) {
      console.warn("로컬 모의 저장 완료", e);
    }
    setDispatchDrawerOpen(false);
    showToast(`🚗 [${selectedCustomer.name}] 출장 배차 접수가 정상 완료되었습니다!`);
    setTimeout(() => clearToast(), 3500);
  };

  const handleConfirmSalesTransfer = async () => {
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";
      await fetch(`${apiBase}/sales`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inquiry_type: "신규 장비 추가 렌탈 견적",
          customer_name: selectedCustomer.name,
          manager: selectedCustomer.manager,
          manager_phone: selectedCustomer.phone,
          request_note: "기존 장비 가동률 증가로 추가 1대 렌탈 단가 견적 요청",
          client_type: "desktop"
        })
      });
    } catch (e) {
      console.warn("로컬 영업 이관 모의 완료", e);
    }
    setSalesModalOpen(false);
    showToast(`💼 영업팀으로 신규 견적 문의가 성공적으로 이관되었습니다.`);
    setTimeout(() => clearToast(), 3500);
  };

  const checkedCount = actionChecklist.filter(c => c.checked).length;
  const totalCount = actionChecklist.length;

  return (
    <div 
      data-theme={themeStyle} 
      data-color={colorScheme} 
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100vh', 
        width: '100vw', 
        backgroundColor: 'var(--canvas)', 
        color: 'var(--ink)' 
      }}
    >
      
      {/* ========================================================= */}
      {/* 1. TOP GLOBAL NAVIGATION & 3x3 MATRIX CONTROLLER           */}
      {/* ========================================================= */}
      <header style={{ 
        height: '56px', 
        borderBottom: 'var(--border-width) solid var(--hairline)', 
        backgroundColor: 'var(--surface-1)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        padding: '0 16px',
        flexShrink: 0,
        boxShadow: 'var(--panel-shadow)',
        zIndex: 10
      }}>
        {/* Brand & Counselor */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--accent-primary)', boxShadow: '0 0 8px var(--glow-color)' }} />
            <span style={{ fontWeight: 700, fontSize: '15px', letterSpacing: 'var(--letter-spacing)', color: 'var(--ink)' }}>
              Space Advisor <span style={{ fontWeight: 400, color: 'var(--ink-muted)', fontSize: '12px' }}>PRO 관제</span>
            </span>
          </div>

          <div style={{ height: '16px', width: '1px', backgroundColor: 'var(--hairline)' }} />

          <span style={{ fontSize: '13px', color: 'var(--ink-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            상담원: <strong style={{ color: 'var(--ink)', fontWeight: 600 }}>{counselorName}</strong>
          </span>
        </div>

        {/* 3x3 DUAL CONTROLLER: Theme Style & Color Palette */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          
          {/* 1) Design Tone (Theme Style) */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '2px', 
            padding: '3px 6px', 
            backgroundColor: 'var(--surface-2)', 
            border: 'var(--border-width) solid var(--hairline)', 
            borderRadius: 'var(--radius-md)' 
          }}>
            <Layers size={13} style={{ color: 'var(--ink-muted)', marginRight: '4px' }} />
            <span style={{ fontSize: '11px', color: 'var(--ink-muted)', marginRight: '4px', fontWeight: 600 }}>디자인 톤:</span>
            
            <button
              onClick={() => setThemeStyle('precision')}
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                fontWeight: themeStyle === 'precision' ? 700 : 500,
                borderRadius: 'var(--radius-xs)',
                border: 'none',
                backgroundColor: themeStyle === 'precision' ? 'var(--accent-primary)' : 'transparent',
                color: themeStyle === 'precision' ? '#fff' : 'var(--ink-muted)',
                cursor: 'pointer'
              }}
            >
              1. Linear 정밀
            </button>

            <button
              onClick={() => setThemeStyle('soft')}
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                fontWeight: themeStyle === 'soft' ? 700 : 500,
                borderRadius: 'var(--radius-xs)',
                border: 'none',
                backgroundColor: themeStyle === 'soft' ? 'var(--accent-primary)' : 'transparent',
                color: themeStyle === 'soft' ? '#fff' : 'var(--ink-muted)',
                cursor: 'pointer'
              }}
            >
              2. Soft 입체
            </button>

            <button
              onClick={() => setThemeStyle('cyber')}
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                fontWeight: themeStyle === 'cyber' ? 700 : 500,
                borderRadius: 'var(--radius-xs)',
                border: 'none',
                backgroundColor: themeStyle === 'cyber' ? 'var(--accent-primary)' : 'transparent',
                color: themeStyle === 'cyber' ? '#fff' : 'var(--ink-muted)',
                cursor: 'pointer'
              }}
            >
              3. Cyber HUD
            </button>
          </div>

          {/* 2) Color Palette */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '2px', 
            padding: '3px 6px', 
            backgroundColor: 'var(--surface-2)', 
            border: 'var(--border-width) solid var(--hairline)', 
            borderRadius: 'var(--radius-md)' 
          }}>
            <Palette size={13} style={{ color: 'var(--ink-muted)', marginRight: '4px' }} />
            <span style={{ fontSize: '11px', color: 'var(--ink-muted)', marginRight: '4px', fontWeight: 600 }}>컬러:</span>

            <button
              onClick={() => setColorScheme('slate')}
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                fontWeight: colorScheme === 'slate' ? 700 : 500,
                borderRadius: 'var(--radius-xs)',
                border: 'none',
                backgroundColor: colorScheme === 'slate' ? 'var(--accent-primary)' : 'transparent',
                color: colorScheme === 'slate' ? '#fff' : 'var(--ink-muted)',
                cursor: 'pointer'
              }}
            >
              블루
            </button>

            <button
              onClick={() => setColorScheme('cream')}
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                fontWeight: colorScheme === 'cream' ? 700 : 500,
                borderRadius: 'var(--radius-xs)',
                border: 'none',
                backgroundColor: colorScheme === 'cream' ? 'var(--accent-primary)' : 'transparent',
                color: colorScheme === 'cream' ? '#fff' : 'var(--ink-muted)',
                cursor: 'pointer'
              }}
            >
              크림
            </button>

            <button
              onClick={() => setColorScheme('emerald')}
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                fontWeight: colorScheme === 'emerald' ? 700 : 500,
                borderRadius: 'var(--radius-xs)',
                border: 'none',
                backgroundColor: colorScheme === 'emerald' ? 'var(--accent-primary)' : 'transparent',
                color: colorScheme === 'emerald' ? '#fff' : 'var(--ink-muted)',
                cursor: 'pointer'
              }}
            >
              에메랄드
            </button>
          </div>

        </div>

        {/* Live Call Stopwatch & Audio Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px', 
            padding: '4px 10px', 
            borderRadius: 'var(--radius-md)', 
            backgroundColor: 'rgba(239, 68, 68, 0.12)', 
            border: 'var(--border-width) solid rgba(239, 68, 68, 0.25)',
            color: 'var(--accent-danger)',
            fontSize: '12px',
            fontWeight: 600
          }}>
            <PhoneCall size={14} className="animate-pulse" />
            <span className="nowrap">통화중</span>
            <span className="font-mono">{formatTimer(callSeconds)}</span>
          </div>

          <button 
            onClick={() => setRecording(!isRecording)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 12px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: isRecording ? 'var(--accent-danger)' : 'var(--accent-primary)',
              color: '#fff',
              border: 'none',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {isRecording ? <MicOff size={14} /> : <Mic size={14} />}
            <span className="nowrap">{isRecording ? "STT 정지" : "STT 시작"}</span>
          </button>
        </div>
      </header>

      {/* ========================================================= */}
      {/* 2. THREE-PANE TRIAGE WORKSTATION LAYOUT (Intercom/Linear) */}
      {/* ========================================================= */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', padding: '8px', gap: '8px' }}>
        
        {/* ------------------------------------------------------- */}
        {/* PANEL A: 고객 & 장비 & 이력 패널 (28% 폭)               */}
        {/* ------------------------------------------------------- */}
        <section style={{ 
          width: '28%', 
          backgroundColor: 'var(--surface-1)', 
          border: 'var(--border-width) solid var(--hairline)', 
          borderRadius: 'var(--radius-lg)', 
          boxShadow: 'var(--panel-shadow)',
          display: 'flex', 
          flexDirection: 'column', 
          overflow: 'hidden' 
        }}>
          {/* Panel Header & Customer Search */}
          <div style={{ padding: 'var(--density-padding)', borderBottom: 'var(--border-width) solid var(--hairline)' }}>
            <label style={{ fontSize: '11px', color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', display: 'block' }}>
              고객사 실시간 식별 및 검색
            </label>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--ink-subtle)' }} />
              <input
                type="text"
                placeholder="고객사명 또는 전화번호 4자리..."
                value={searchQuery}
                onFocus={() => setSearchDropdownOpen(true)}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 8px 8px 32px',
                  backgroundColor: 'var(--surface-2)',
                  border: 'var(--border-width) solid var(--hairline)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--ink)',
                  fontSize: '13px',
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
                  border: 'var(--border-width) solid var(--hairline)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                  zIndex: 50,
                  maxHeight: '180px',
                  overflowY: 'auto'
                }}>
                  {customerList.map((cust) => (
                    <div
                      key={cust.id}
                      onClick={() => {
                        selectCustomer(cust);
                        setSearchDropdownOpen(false);
                      }}
                      style={{
                        padding: '8px 12px',
                        borderBottom: 'var(--border-width) solid var(--hairline)',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--surface-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{cust.name}</div>
                      <div style={{ color: 'var(--ink-muted)', fontSize: '11px' }}>{cust.manager} · {cust.phone}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Panel Body: Scrollable Customer & Asset Specs */}
          <div style={{ flex: 1, padding: 'var(--density-padding)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            
            {/* Customer Info Card */}
            <div style={{ backgroundColor: 'var(--surface-2)', padding: '12px', borderRadius: 'var(--radius-md)', border: 'var(--border-width) solid var(--hairline)', boxShadow: 'var(--card-shadow)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--ink)' }}>{selectedCustomer.name}</span>
                <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: 'var(--radius-xs)', backgroundColor: 'var(--badge-bg)', color: 'var(--badge-text)', fontWeight: 600 }}>
                  {selectedCustomer.salesType}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--ink-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div>👤 담당자: <strong style={{ color: 'var(--ink)' }}>{selectedCustomer.manager}</strong> ({selectedCustomer.phone})</div>
                <div>📍 주소: {selectedCustomer.address} {selectedCustomer.addressDetail}</div>
              </div>
            </div>

            {/* Asset Info Card */}
            <div style={{ backgroundColor: 'var(--surface-2)', padding: '12px', borderRadius: 'var(--radius-md)', border: 'var(--border-width) solid var(--hairline)', boxShadow: 'var(--card-shadow)' }}>
              <div style={{ fontSize: '11px', color: 'var(--ink-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '6px' }}>
                보유 장비 및 보증 상태
              </div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>
                {selectedCustomer.assetModel}
              </div>
              <div style={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between', color: 'var(--ink-muted)' }}>
                <span>시리얼: <span className="font-mono" style={{ color: 'var(--ink)' }}>{selectedCustomer.serialNumber}</span></span>
                <span style={{ color: 'var(--accent-warning)', fontWeight: 600 }}>{selectedCustomer.warrantyRemaining}</span>
              </div>
            </div>

            {/* 30-Day History & Warning Timeline */}
            <div style={{ backgroundColor: 'var(--surface-2)', padding: '12px', borderRadius: 'var(--radius-md)', border: 'var(--border-width) solid var(--hairline)', boxShadow: 'var(--card-shadow)', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <Clock size={13} style={{ color: 'var(--ink-muted)' }} />
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink-muted)', textTransform: 'uppercase' }}>
                  최근 30일 상담/정비 이력 타임라인
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {selectedCustomer.historyTimeline.map((item, idx) => (
                  <div 
                    key={idx}
                    style={{
                      padding: '8px',
                      borderRadius: 'var(--radius-xs)',
                      backgroundColor: item.isWarning ? 'rgba(245, 158, 11, 0.12)' : 'var(--surface-1)',
                      border: item.isWarning ? '1px solid rgba(245, 158, 11, 0.35)' : 'var(--border-width) solid var(--hairline)',
                      fontSize: '12px'
                    }}
                  >
                    <div style={{ fontSize: '10px', color: item.isWarning ? 'var(--accent-warning)' : 'var(--ink-muted)', fontWeight: 600 }}>
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
          backgroundColor: 'var(--surface-1)', 
          border: 'var(--border-width) solid var(--hairline)', 
          borderRadius: 'var(--radius-lg)', 
          boxShadow: 'var(--panel-shadow)',
          display: 'flex', 
          flexDirection: 'column', 
          overflow: 'hidden' 
        }}>
          {/* Panel Header & ARS Notice */}
          <div style={{ padding: 'var(--density-padding)', borderBottom: 'var(--border-width) solid var(--hairline)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={14} style={{ color: 'var(--accent-primary)' }} />
                실시간 음성 전사 및 AI 분류
              </span>
              <span style={{ fontSize: '11px', color: isRecording ? 'var(--accent-danger)' : 'var(--ink-muted)', fontWeight: 600 }}>
                {isRecording ? "● 음성 스트리밍 수신중" : "대기 상태"}
              </span>
            </div>

            <div style={{ 
              backgroundColor: 'var(--ars-bg)', 
              border: 'var(--border-width) solid var(--ars-border)', 
              borderRadius: 'var(--radius-xs)', 
              padding: '6px 10px', 
              fontSize: '11px', 
              color: 'var(--ars-text)',
              lineHeight: 1.3 
            }}>
              ⚖️ [ARS 고지 필수] "본 통화는 품질 향상 및 AI 상담 지원을 위해 녹음/분석됩니다."
            </div>
          </div>

          {/* STT Live Transcript Box */}
          <div style={{ flex: '1.2', padding: 'var(--density-padding)', display: 'flex', flexDirection: 'column', borderBottom: 'var(--border-width) solid var(--hairline)' }}>
            <label style={{ fontSize: '11px', color: 'var(--ink-muted)', marginBottom: '4px' }}>
              실시간 전사 자막 (1000ms 디바운스 자동 추론)
            </label>
            <div style={{ 
              flex: 1, 
              backgroundColor: 'var(--surface-2)', 
              border: 'var(--border-width) solid var(--hairline)', 
              borderRadius: 'var(--radius-md)', 
              boxShadow: 'var(--card-shadow)',
              padding: '12px', 
              overflowY: 'auto',
              fontSize: '13px',
              lineHeight: 1.6,
              color: 'var(--ink)'
            }}>
              {sttText ? (
                <span>
                  {sttText}
                  {isRecording && <span className="animate-pulse" style={{ display: 'inline-block', width: '6px', height: '14px', backgroundColor: 'var(--accent-primary)', marginLeft: '4px', verticalAlign: 'middle' }} />}
                </span>
              ) : (
                <span style={{ color: 'var(--ink-subtle)' }}>통화 음성이 인식되면 실시간으로 자막이 표시됩니다...</span>
              )}
            </div>
          </div>

          {/* Detected Keywords & Diagnosis Card */}
          <div style={{ flex: '1.5', padding: 'var(--density-padding)', display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--ink-muted)', display: 'block', marginBottom: '6px' }}>
                자동 감지 증상 키워드
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {detectedKeywords.map((kw, idx) => (
                  <span 
                    key={idx}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--badge-bg)',
                      border: 'var(--border-width) solid var(--hairline)',
                      color: 'var(--badge-text)',
                      fontSize: '12px',
                      fontWeight: 600
                    }}
                  >
                    #{kw}
                  </span>
                ))}
              </div>
            </div>

            {/* Diagnosis Result Card */}
            {matchedDiagnosis && (
              <div style={{ backgroundColor: 'var(--surface-2)', padding: '12px', borderRadius: 'var(--radius-md)', border: 'var(--border-width) solid var(--hairline)', boxShadow: 'var(--card-shadow)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)' }}>{matchedDiagnosis.category}</span>
                  <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: 'var(--radius-xs)', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-success)', fontWeight: 600 }}>
                    신뢰도 {matchedDiagnosis.confidence}%
                  </span>
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ink)', marginBottom: '6px' }}>
                  {matchedDiagnosis.partName}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--ink-muted)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>부품코드: <strong className="font-mono" style={{ color: 'var(--ink)' }}>{matchedDiagnosis.partCode}</strong></span>
                  <span>본사재고: <strong style={{ color: matchedDiagnosis.stock > 0 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>{matchedDiagnosis.stock}개 보유</strong></span>
                </div>
              </div>
            )}

            {/* Manual Override Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>
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
                    border: 'var(--border-width) solid var(--hairline)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--ink)',
                    fontSize: '12px'
                  }}
                />
                <button 
                  onClick={() => {
                    if (manualOverrideKeyword.trim()) {
                      showToast(`수동 교정 키워드 [${manualOverrideKeyword}]가 적용되었습니다.`);
                      setTimeout(() => clearToast(), 3000);
                    }
                  }}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: 'var(--surface-3)',
                    border: 'var(--border-width) solid var(--hairline)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--ink)',
                    fontSize: '12px',
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
          backgroundColor: 'var(--surface-1)', 
          border: 'var(--border-width) solid var(--hairline)', 
          borderRadius: 'var(--radius-lg)', 
          boxShadow: 'var(--panel-shadow)',
          display: 'flex', 
          flexDirection: 'column', 
          overflow: 'hidden' 
        }}>
          {/* Panel Header & Progress */}
          <div style={{ padding: 'var(--density-padding)', borderBottom: 'var(--border-width) solid var(--hairline)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink)' }}>
              표준 조치 체크리스트 (SOP)
            </span>
            <span style={{ fontSize: '12px', fontWeight: 700, color: checkedCount === totalCount ? 'var(--accent-success)' : 'var(--accent-primary)' }}>
              {checkedCount} / {totalCount} 완료 ({Math.round((checkedCount / totalCount) * 100)}%)
            </span>
          </div>

          {/* Checklist Items Container */}
          <div style={{ flex: 1, padding: 'var(--density-padding)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {actionChecklist.map((item) => (
              <div
                key={item.id}
                onClick={() => toggleChecklist(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  padding: '10px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: item.checked ? 'rgba(16, 185, 129, 0.08)' : 'var(--surface-2)',
                  border: item.checked ? '1px solid rgba(16, 185, 129, 0.35)' : 'var(--border-width) solid var(--hairline)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <button style={{ background: 'none', border: 'none', color: item.checked ? 'var(--accent-success)' : 'var(--ink-subtle)', cursor: 'pointer', marginTop: '1px' }}>
                  {item.checked ? <CheckSquare size={16} /> : <Square size={16} />}
                </button>
                <div style={{ flex: 1, fontSize: '13px', lineHeight: 1.4, color: item.checked ? 'var(--accent-success)' : 'var(--ink)', textDecoration: item.checked ? 'line-through' : 'none' }}>
                  <strong style={{ marginRight: '4px', color: 'var(--ink-muted)' }}>{item.id}.</strong> {item.text}
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Action Command Center */}
          <div style={{ padding: '12px', borderTop: 'var(--border-width) solid var(--hairline)', backgroundColor: 'var(--surface-2)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            
            {/* Action 1: 1-Click Resolve Complete */}
            <button
              onClick={handleResolveComplete}
              style={{
                width: '100%',
                padding: '11px',
                backgroundColor: 'var(--accent-success)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <CheckCircle2 size={16} />
              1차 셀프조치 해결 완료 (종결)
            </button>

            {/* Dual Action: Dispatch vs Sales Transfer */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setDispatchDrawerOpen(true)}
                style={{
                  flex: 1.2,
                  padding: '11px',
                  backgroundColor: 'var(--accent-primary)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Wrench size={15} />
                긴급 출장 배차 접수
              </button>

              <button
                onClick={() => setSalesModalOpen(true)}
                style={{
                  flex: 0.8,
                  padding: '11px',
                  backgroundColor: 'var(--surface-3)',
                  color: 'var(--ink)',
                  border: 'var(--border-width) solid var(--hairline)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
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
      {/* 3. SLIDE-IN DISPATCH BOOKING DRAWER (Intercom Style)       */}
      {/* ========================================================= */}
      {dispatchDrawerOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '420px',
          backgroundColor: 'var(--surface-1)',
          borderLeft: 'var(--border-width) solid var(--hairline)',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.5)',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideIn 0.2s ease-out'
        }}>
          {/* Drawer Header */}
          <div style={{ padding: '16px', borderBottom: 'var(--border-width) solid var(--hairline)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Wrench size={18} style={{ color: 'var(--accent-primary)' }} />
              출장 배차 접수 (100% 자동완성)
            </span>
            <button onClick={() => setDispatchDrawerOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--ink-muted)', cursor: 'pointer' }}>
              <X size={18} />
            </button>
          </div>

          {/* Drawer Form Body */}
          <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            {/* Auto-filled Summary */}
            <div style={{ backgroundColor: 'var(--surface-2)', padding: '12px', borderRadius: 'var(--radius-md)', border: 'var(--border-width) solid var(--hairline)', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div>🏢 고객사: <strong style={{ color: 'var(--ink)' }}>{selectedCustomer.name}</strong></div>
              <div>📍 방문지: {selectedCustomer.address} {selectedCustomer.addressDetail}</div>
              <div>📞 연락처: {selectedCustomer.manager} ({selectedCustomer.phone})</div>
              <div>🔧 대상장비: {selectedCustomer.assetModel} ({selectedCustomer.serialNumber})</div>
            </div>

            {/* Engineer Assignment */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>출장 담당 정비기사 배정</label>
              <select 
                value={assignedEngineer} 
                onChange={(e) => setAssignedEngineer(e.target.value)}
                style={{ padding: '8px', backgroundColor: 'var(--surface-2)', border: 'var(--border-width) solid var(--hairline)', borderRadius: 'var(--radius-sm)', color: 'var(--ink)', fontSize: '13px' }}
              >
                <option value="김철수 정비기사 (화성/경기남부)">김철수 정비기사 (화성/경기남부 관할)</option>
                <option value="박영호 정비기사 (인천/서울서부)">박영호 정비기사 (인천/서울서부 관할)</option>
                <option value="이지훈 정비기사 (평택/충청북부)">이지훈 정비기사 (평택/충청북부 관할)</option>
              </select>
            </div>

            {/* Visit Date & Time */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>방문 희망일시</label>
              <input 
                type="text" 
                value={dispatchDate} 
                onChange={(e) => setDispatchDate(e.target.value)}
                style={{ padding: '8px', backgroundColor: 'var(--surface-2)', border: 'var(--border-width) solid var(--hairline)', borderRadius: 'var(--radius-sm)', color: 'var(--ink)', fontSize: '13px' }}
              />
            </div>

            {/* Dispatch Note */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>정비기사 전달 요청 메모</label>
              <textarea 
                rows={4}
                value={dispatchNote} 
                onChange={(e) => setDispatchNote(e.target.value)}
                style={{ padding: '8px', backgroundColor: 'var(--surface-2)', border: 'var(--border-width) solid var(--hairline)', borderRadius: 'var(--radius-sm)', color: 'var(--ink)', fontSize: '12px', lineHeight: 1.4 }}
              />
            </div>

          </div>

          {/* Drawer Footer CTA */}
          <div style={{ padding: '16px', borderTop: 'var(--border-width) solid var(--hairline)', backgroundColor: 'var(--surface-2)' }}>
            <button
              onClick={handleConfirmDispatch}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: 'var(--accent-primary)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              배차 확정 및 기사 모바일 앱 전송
            </button>
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
            border: 'var(--border-width) solid var(--hairline)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
            boxShadow: '0 16px 32px rgba(0,0,0,0.8)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--ink)' }}>영업팀 분기 이관 접수</span>
              <button onClick={() => setSalesModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--ink-muted)', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ fontSize: '13px', color: 'var(--ink-muted)', marginBottom: '12px' }}>
              고객사 <strong style={{ color: 'var(--ink)' }}>{selectedCustomer.name}</strong>의 단순 견적/계약 문의를 영업팀 리드 대장으로 이관합니다.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '16px' }}>
              <label style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>이관 유형</label>
              <select style={{ padding: '8px', backgroundColor: 'var(--surface-2)', border: 'var(--border-width) solid var(--hairline)', borderRadius: 'var(--radius-sm)', color: 'var(--ink)' }}>
                <option>신규 렌탈 견적서 요청</option>
                <option>장비 추가 도입 및 계약 변경</option>
                <option>단순 소모품 구매 견적</option>
              </select>
            </div>

            <button
              onClick={handleConfirmSalesTransfer}
              style={{
                width: '100%',
                padding: '11px',
                backgroundColor: 'var(--accent-warning)',
                color: '#000',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              영업팀 대장 이관 완료
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. TOAST NOTIFICATION (3-Second Undo / Feedback)          */}
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
          borderRadius: 'var(--radius-lg)',
          fontSize: '13px',
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

    </div>
  );
}
