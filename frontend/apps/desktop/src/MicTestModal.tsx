import React, { useEffect, useRef, useState } from 'react';
import { Mic, Volume2, CheckCircle2, AlertCircle, X, RefreshCw } from 'lucide-react';

interface MicTestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MicTestModal: React.FC<MicTestModalProps> = ({ isOpen, onClose }) => {
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [permissionStatus, setPermissionStatus] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [deviceList, setDeviceList] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [testTranscript, setTestTranscript] = useState<string>('');
  const [isTestListening, setIsTestListening] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const testRecognitionRef = useRef<any>(null);

  // Initialize Mic Hardware & Audio Level Analyzer
  const startMicTest = async (deviceId?: string) => {
    stopMicTest();
    setErrorMessage('');

    try {
      const constraints: MediaStreamConstraints = {
        audio: deviceId ? { deviceId: { exact: deviceId } } : true
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;
      setPermissionStatus('granted');

      // Enumerate devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(d => d.kind === 'audioinput');
      setDeviceList(audioInputs);
      if (!selectedDeviceId && audioInputs.length > 0) {
        setSelectedDeviceId(audioInputs[0].deviceId);
      }

      // Web Audio API Level Meter
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.5;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateMeter = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(100, Math.round((avg / 128) * 100 * 1.5));
        setAudioLevel(normalized);

        animationFrameRef.current = requestAnimationFrame(updateMeter);
      };

      updateMeter();

      // Start Test Web Speech API
      const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRec) {
        const rec = new SpeechRec();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = 'ko-KR';

        rec.onresult = (event: any) => {
          let text = '';
          for (let i = 0; i < event.results.length; i++) {
            text += event.results[i][0].transcript + ' ';
          }
          setTestTranscript(text);
        };

        rec.onerror = (err: any) => {
          console.warn("Test STT Error:", err);
          if (err.error === 'not-allowed') {
            setErrorMessage("마이크 권한이 브라우저에서 차단되었습니다.");
          }
        };

        try {
          rec.start();
          testRecognitionRef.current = rec;
          setIsTestListening(true);
        } catch (e) {
          console.error(e);
        }
      }

    } catch (err: any) {
      console.error("Mic Access Error:", err);
      setPermissionStatus('denied');
      setErrorMessage(err.message || "마이크 장치를 찾을 수 없거나 권한이 거부되었습니다.");
    }
  };

  const stopMicTest = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    if (testRecognitionRef.current) {
      try {
        testRecognitionRef.current.stop();
      } catch (e) {}
      testRecognitionRef.current = null;
    }
    setIsTestListening(false);
    setAudioLevel(0);
  };

  useEffect(() => {
    if (isOpen) {
      startMicTest();
    } else {
      stopMicTest();
    }
    return () => {
      stopMicTest();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.75)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 200,
      animation: 'fadeIn 0.15s ease-out'
    }}>
      <div style={{
        width: '520px',
        backgroundColor: 'var(--surface-1)',
        border: 'var(--border-width) solid var(--hairline)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
        boxShadow: 'var(--panel-shadow)',
        color: 'var(--ink)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: 'var(--border-width) solid var(--hairline)', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <Mic size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>실시간 마이크 & 음성인식 진단 테스트</h3>
              <p style={{ margin: 0, fontSize: '11px', color: 'var(--ink-muted)' }}>마이크 하드웨어 입력 및 실시간 음성인식(STT) 정상 여부 진단</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--ink-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Diagnostic Status */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: permissionStatus === 'granted' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          border: `1px solid ${permissionStatus === 'granted' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
        }}>
          {permissionStatus === 'granted' ? (
            <CheckCircle2 size={20} style={{ color: 'var(--accent-success)', flexShrink: 0 }} />
          ) : (
            <AlertCircle size={20} style={{ color: 'var(--accent-danger)', flexShrink: 0 }} />
          )}
          <div style={{ fontSize: '12px' }}>
            <strong style={{ color: permissionStatus === 'granted' ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
              {permissionStatus === 'granted' ? "마이크 하드웨어 정상 연결됨" : "마이크 권한 필요 또는 오류 발생"}
            </strong>
            <div style={{ color: 'var(--ink-muted)', marginTop: '2px' }}>
              {errorMessage || (permissionStatus === 'granted' ? "마이크 신호가 실시간으로 수신되고 있습니다. 말을 해보세요." : "브라우저 주소창 좌측 자물쇠 아이콘을 눌러 마이크 권한을 허용해 주세요.")}
            </div>
          </div>
        </div>

        {/* Real-time VU Decibel Meter */}
        <div style={{ backgroundColor: 'var(--surface-2)', padding: '16px', borderRadius: 'var(--radius-md)', border: 'var(--border-width) solid var(--hairline)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px' }}>
            <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Volume2 size={15} style={{ color: audioLevel > 15 ? 'var(--accent-success)' : 'var(--ink-muted)' }} />
              실시간 음량 레벨 (VU Meter)
            </span>
            <span className="font-mono" style={{ color: audioLevel > 15 ? 'var(--accent-success)' : 'var(--ink-muted)', fontWeight: 700 }}>
              {audioLevel}% {audioLevel > 15 ? "(입력 감지 중)" : "(음소거 / 침묵)"}
            </span>
          </div>

          {/* Segmented LED Bar */}
          <div style={{
            height: '24px',
            backgroundColor: 'var(--canvas)',
            borderRadius: 'var(--radius-sm)',
            border: 'var(--border-width) solid var(--hairline)',
            padding: '3px',
            display: 'flex',
            gap: '3px',
            overflow: 'hidden'
          }}>
            {Array.from({ length: 24 }).map((_, idx) => {
              const segmentThreshold = ((idx + 1) / 24) * 100;
              const isActive = audioLevel >= segmentThreshold;
              let segColor = 'var(--accent-success)';
              if (idx >= 16) segColor = 'var(--accent-warning)';
              if (idx >= 21) segColor = 'var(--accent-danger)';

              return (
                <div
                  key={idx}
                  style={{
                    flex: 1,
                    borderRadius: '2px',
                    backgroundColor: isActive ? segColor : 'rgba(255,255,255,0.05)',
                    boxShadow: isActive ? `0 0 6px ${segColor}` : 'none',
                    transition: 'background-color 0.05s ease'
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Live Speech Recognition Echo Box */}
        <div style={{ backgroundColor: 'var(--surface-2)', padding: '14px', borderRadius: 'var(--radius-md)', border: 'var(--border-width) solid var(--hairline)' }}>
          <label style={{ fontSize: '11px', color: 'var(--ink-muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
            음성인식(STT) 텍스트 전사 에코 테스트
          </label>
          <div style={{
            minHeight: '60px',
            maxHeight: '100px',
            overflowY: 'auto',
            backgroundColor: 'var(--canvas)',
            borderRadius: 'var(--radius-sm)',
            border: 'var(--border-width) solid var(--hairline)',
            padding: '10px',
            fontSize: '13px',
            lineHeight: 1.5,
            color: testTranscript ? 'var(--ink)' : 'var(--ink-subtle)'
          }}>
            {testTranscript || (isTestListening ? "👉 지금 마이크에 대고 '아, 아, 마이크 테스트'라고 말씀해 보세요..." : "음성인식 대기 중...")}
          </div>
        </div>

        {/* Device Selection & Re-test Button */}
        {deviceList.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <select
              value={selectedDeviceId}
              onChange={(e) => {
                setSelectedDeviceId(e.target.value);
                startMicTest(e.target.value);
              }}
              style={{
                flex: 1,
                padding: '8px',
                backgroundColor: 'var(--surface-2)',
                border: 'var(--border-width) solid var(--hairline)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--ink)',
                fontSize: '12px'
              }}
            >
              {deviceList.map((d, i) => (
                <option key={d.deviceId || i} value={d.deviceId}>
                  🎙️ {d.label || `마이크 입력 장치 ${i + 1}`}
                </option>
              ))}
            </select>

            <button
              onClick={() => startMicTest(selectedDeviceId)}
              style={{
                padding: '8px 14px',
                backgroundColor: 'var(--surface-3)',
                border: 'var(--border-width) solid var(--hairline)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--ink)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <RefreshCw size={13} />
              재검사
            </button>
          </div>
        )}

        {/* Footer Button */}
        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: 'var(--accent-primary)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          확인 완료 및 상담 화면으로 돌아가기
        </button>

      </div>
    </div>
  );
};
