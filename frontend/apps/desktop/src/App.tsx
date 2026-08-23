import React, { useEffect, useState, useRef } from 'react';
import { useCounselStore } from './store';
import './index.css';

// Web Speech API 타입 선언
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

function App() {
  const { 
    sttText, 
    keyword, 
    partCode, 
    actionScripts, 
    isRecording, 
    setRecording, 
    setSttText,
    appendSttText,
    setClassificationResult 
  } = useCounselStore();

  const [localText, setLocalText] = useState("");
  const debounceTimer = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);

  // Web Speech API 초기화
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
        // 녹음이 활성화되어 있는데 끊겼다면 재시작 (자동 이어가기)
        if (isRecording) {
          recognition.start();
        }
      };

      recognitionRef.current = recognition;
    } else {
      console.warn("이 브라우저는 Web Speech API를 지원하지 않습니다.");
    }
  }, [appendSttText, isRecording, setRecording]);

  // isRecording 상태에 따라 녹음 시작/중지
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

  // STT 텍스트가 변경될 때마다 백엔드로 분류 요청 (Debounce 적용)
  useEffect(() => {
    if (!sttText.trim()) return;
    
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    
    debounceTimer.current = window.setTimeout(async () => {
      try {
        const res = await fetch("http://localhost:8000/api/v1/counsel/classify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: sttText })
        });
        if (res.ok) {
          const data = await res.json();
          setClassificationResult(data.keyword, data.part_code, data.action_script);
        }
      } catch (e) {
        console.error("분류 API 호출 실패", e);
      }
    }, 1000); // 1000ms 디바운스로 안정화
  }, [sttText, setClassificationResult]);

  const handleMicToggle = () => {
    setRecording(!isRecording);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif', backgroundColor: '#f3f4f6' }}>
      
      {/* 좌측 패널: STT 영역 */}
      <div style={{ flex: '3', borderRight: '1px solid #d1d5db', display: 'flex', flexDirection: 'column', padding: '16px', backgroundColor: '#fff' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 16px 0' }}>고객 음성 수신</h2>
        
        {/* Q4 법무 확인: 법적 책임 및 고지 안내 */}
        <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fcd34d', color: '#b45309', padding: '12px', borderRadius: '4px', marginBottom: '16px', fontSize: '13px', lineHeight: '1.4' }}>
          <strong>[법무/컴플라이언스 안내]</strong><br/>
          * 전화 시작 시 ARS 고지: "본 통화는 AI 상담 품질 향상을 위해 분석됩니다."를 반드시 송출하십시오.<br/>
          * 본 시스템이 추천하는 셀프조치 스크립트에 대한 최종 판단 책임은 상담사에게 있습니다.
        </div>

        <div style={{ flex: 1, backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '12px', overflowY: 'auto', marginBottom: '16px', borderRadius: '4px' }}>
          {sttText ? (
            <p style={{ margin: 0, lineHeight: '1.5' }}>{sttText}</p>
          ) : (
            <p style={{ margin: 0, color: '#9ca3af' }}>통화 내용 대기 중...</p>
          )}
        </div>
        
        <button 
          onClick={handleMicToggle}
          style={{
            padding: '12px', backgroundColor: isRecording ? '#ef4444' : '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'
          }}>
          {isRecording ? "수신 중지" : "수신 시작"}
        </button>
      </div>

      {/* 우측 패널: 분석 결과 및 조치 영역 */}
      <div style={{ flex: '7', padding: '16px', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 16px 0' }}>분석 결과 및 조치 스크립트</h2>
        
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#374151', whiteSpace: 'nowrap', flexShrink: 0 }}>감지 키워드</label>
            <input readOnly value={keyword} style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', backgroundColor: '#f3f4f6' }} />
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#374151', whiteSpace: 'nowrap', flexShrink: 0 }}>부품 코드</label>
            <input readOnly value={partCode} style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', backgroundColor: '#f3f4f6' }} />
          </div>
        </div>

        <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 12px 0' }}>조치 체크리스트</h3>
        <div style={{ flex: 1, backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '4px', padding: '16px' }}>
          {actionScripts.length > 0 ? (
            <ul style={{ listStyleType: 'none', padding: 0, margin: 0 }}>
              {actionScripts.map((script, idx) => (
                <li key={idx} style={{ padding: '8px 0', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" id={`chk-${idx}`} />
                  <label htmlFor={`chk-${idx}`} style={{ cursor: 'pointer', flex: 1 }}>{script}</label>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: '#9ca3af', margin: 0 }}>STT 수신 시 자동 표시됩니다.</p>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px', gap: '12px', alignItems: 'center' }}>
          
          <div style={{ marginRight: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#374151' }}>부서 이관</label>
            <select style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', backgroundColor: '#fff' }}>
              <option value="none">선택</option>
              <option value="sales">영업팀 (견적/계약)</option>
              <option value="field">출장/AS팀</option>
            </select>
            <button style={{ padding: '8px 16px', backgroundColor: '#e5e7eb', color: '#374151', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer' }}>이관 접수</button>
          </div>

          <button style={{ padding: '12px 24px', backgroundColor: '#6b7280', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>상담 종료</button>
          <button style={{ padding: '12px 24px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>출장 배차 접수</button>
        </div>
      </div>
      
    </div>
  );
}

export default App;
