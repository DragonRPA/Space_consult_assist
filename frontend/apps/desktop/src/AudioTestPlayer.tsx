import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  Upload, 
  Music, 
  FileAudio,
  Sparkles,
  X
} from 'lucide-react';
import { useCounselStore } from './store';
import { DOMAIN_KEYWORD_REGISTRY } from './keywordAssist';

interface AudioTestPlayerProps {
  isOpen: boolean;
  onClose: () => void;
}

// Built-in Mock Scenarios for instant testing without local files
const MOCK_SCENARIOS = [
  {
    id: 'sc-1',
    title: '시나리오 1: 흡입모터 굉음 및 타는 냄새',
    category: '흡입모터',
    dialogues: [
      { delay: 1000, text: '안녕하세요, 강남점 방재실인데요. SC-500 청소기 때문에 전화드렸습니다.' },
      { delay: 3000, text: '지금 장비를 돌리는데 흡입 모터 쪽에서 갑자기 끼기긱 거리는 굉음이 심하게 나요.' },
      { delay: 5500, text: '그리고 뒤쪽에서 뭔가 타는 냄새가 나면서 바닥 오수 흡입이 전혀 안되고 있어요.' },
      { delay: 8500, text: '폐수탱크는 방금 비웠는데도 모터 열기가 엄청 뜨거운데 어떻게 조치해야 하나요?' }
    ]
  },
  {
    id: 'sc-2',
    title: '시나리오 2: 스퀴지 마모 및 바닥 잔수 줄생김',
    category: '스퀴지',
    dialogues: [
      { delay: 1000, text: '여보세요, 평택 물류센터입니다. 바닥 청소 후에 물기가 안 말라요.' },
      { delay: 3200, text: '뒤에 달린 스퀴지 고무 블레이드 양 끝이 찢어졌는지 바닥에 잔수 자국이 길게 남습니다.' },
      { delay: 6000, text: '스퀴지 날을 반대로 뒤집어서 끼우면 쓸 수 있는지, 아니면 새 부품으로 교체해야 하나요?' }
    ]
  },
  {
    id: 'sc-3',
    title: '시나리오 3: 배터리 충전 안됨 및 전원 불량',
    category: '배터리',
    dialogues: [
      { delay: 1000, text: '화성 하역장인데요, 청소기 전원이 아예 안 켜져서 급하게 문의드립니다.' },
      { delay: 3500, text: '어제 밤새 220V 콘센트에 충전기를 꽂아뒀는데 배터리 충전 게이지가 0칸이에요.' },
      { delay: 6500, text: '장비 비상정지 버튼은 당겨져 있는데 충전기 빨간불만 깜빡이고 방전된 것 같습니다.' }
    ]
  },
  {
    id: 'sc-4',
    title: '시나리오 4: 솔레노이드 밸브 고착 및 바닥 누수',
    category: '솔레노이드',
    dialogues: [
      { delay: 1000, text: '상담원님, 청소기 바닥 쪽에서 세척수가 계속 줄줄 새어 나옵니다.' },
      { delay: 3200, text: '급수 레버를 잠갔는데도 솔레노이드 밸브가 안 닫히는지 청수 탱크 물이 바닥으로 다 쏟아져요.' },
      { delay: 6500, text: '거름망 필터는 청소했는데 밸브 고착인 것 같아서 기사님 출장 점검 요청드립니다.' }
    ]
  }
];

export const AudioTestPlayer: React.FC<AudioTestPlayerProps> = ({ isOpen, onClose }) => {
  const { appendFinalParagraph, setInterimSttText, setActiveKeywordEntity, showToast, clearToast } = useCounselStore();

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const simulationTimers = useRef<number[]>([]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      simulationTimers.current.forEach(t => clearTimeout(t));
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  // Handle Local File Upload (.m4a, .mp3, .wav)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setAudioFile(file);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      setIsPlaying(false);
      setCurrentTime(0);
      showToast(`📁 [${file.name}] 음성 파일이 로드되었습니다.`);
      setTimeout(() => clearToast(), 3000);
    }
  };

  // HTML5 Audio Event Handlers
  const togglePlayAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(err => {
        console.error("Audio playback error:", err);
      });
    }
  };

  const stopAudio = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const changePlaybackRate = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const formatTime = (sec: number) => {
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(Math.floor(sec % 60)).padStart(2, '0');
    return `${m}:${s}`;
  };

  // Run Mock Conversation Audio Simulation
  const runScenarioSimulation = (scenario: typeof MOCK_SCENARIOS[0]) => {
    // Clear previous timers
    simulationTimers.current.forEach(t => clearTimeout(t));
    simulationTimers.current = [];

    setIsSimulating(true);
    setActiveScenarioId(scenario.id);
    showToast(`▶ [${scenario.title}] 실시간 음성 시뮬레이션 시작`);
    setTimeout(() => clearToast(), 2500);

    // Feed dialogues sequentially into STT box
    scenario.dialogues.forEach((d) => {
      // 1) Interim typing preview
      const interimTimer = window.setTimeout(() => {
        setInterimSttText(`(발화 중...) ${d.text.slice(0, 15)}...`);
      }, Math.max(0, d.delay - 600));

      // 2) Final sentence push with keyword trigger
      const finalTimer = window.setTimeout(() => {
        appendFinalParagraph(d.text, d.text, []);
        setInterimSttText('');

        // Trigger matching keyword
        const matched = DOMAIN_KEYWORD_REGISTRY.find(k => k.synonyms.test(d.text));
        if (matched) {
          setActiveKeywordEntity(matched);
        }
      }, d.delay);

      simulationTimers.current.push(interimTimer, finalTimer);
    });

    // End simulation
    const lastDelay = scenario.dialogues[scenario.dialogues.length - 1].delay + 1000;
    const endTimer = window.setTimeout(() => {
      setIsSimulating(false);
      setActiveScenarioId(null);
      showToast(`✓ [${scenario.title}] 통화 시뮬레이션 완료`);
      setTimeout(() => clearToast(), 3000);
    }, lastDelay);

    simulationTimers.current.push(endTimer);
  };

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
        width: '580px',
        backgroundColor: 'var(--surface-1)',
        border: '1px solid var(--hairline)',
        borderRadius: '10px',
        padding: '24px',
        boxShadow: '0 16px 40px rgba(0,0,0,0.8)',
        color: 'var(--ink)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--hairline)', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <Music size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>STT 검증용 음성 파일 플레이어 & 시뮬레이터</h3>
              <p style={{ margin: 0, fontSize: '11px', color: 'var(--ink-muted)' }}>로컬 .m4a / .mp3 파일 직접 재생 및 표준 상담 시나리오 1-클릭 테스트</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--ink-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Section 1: Local Audio File Upload & Player */}
        <div style={{ backgroundColor: 'var(--surface-2)', padding: '16px', borderRadius: '8px', border: '1px solid var(--hairline)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileAudio size={16} style={{ color: 'var(--accent-primary)' }} />
              내 PC 음성 파일 (.m4a, .mp3, .wav)
            </span>

            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 12px',
              backgroundColor: 'var(--accent-primary)',
              color: '#fff',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer'
            }}>
              <Upload size={13} />
              파일 선택 (.m4a)
              <input 
                type="file" 
                accept="audio/*,.m4a,.mp3,.wav,.aac,.ogg" 
                onChange={handleFileUpload} 
                style={{ display: 'none' }} 
              />
            </label>
          </div>

          {audioUrl ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* File Info */}
              <div style={{ fontSize: '12px', color: '#93c5fd', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                🎵 {audioFile?.name} ({formatTime(duration)})
              </div>

              {/* Native Audio Tag (Hidden) */}
              <audio
                ref={audioRef}
                src={audioUrl}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
              />

              {/* Progress Slider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="font-mono" style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>{formatTime(currentTime)}</span>
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  value={currentTime}
                  onChange={handleSeek}
                  style={{ flex: 1, accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                />
                <span className="font-mono" style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>{formatTime(duration)}</span>
              </div>

              {/* Player Controls Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={togglePlayAudio}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 14px',
                      backgroundColor: isPlaying ? 'var(--accent-danger)' : 'var(--accent-primary)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                    <span>{isPlaying ? '일시정지' : '재생'}</span>
                  </button>

                  <button
                    onClick={stopAudio}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '6px 10px',
                      backgroundColor: 'var(--surface-3)',
                      color: 'var(--ink)',
                      border: '1px solid var(--hairline)',
                      borderRadius: '6px',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    <Square size={13} />
                    <span>정지</span>
                  </button>
                </div>

                {/* Playback Rate Selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
                  <span style={{ color: 'var(--ink-muted)' }}>배속:</span>
                  {[1.0, 1.2, 1.5].map((rate) => (
                    <button
                      key={rate}
                      onClick={() => changePlaybackRate(rate)}
                      style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: playbackRate === rate ? 'var(--accent-primary)' : 'var(--surface-3)',
                        color: playbackRate === rate ? '#fff' : 'var(--ink-muted)',
                        border: 'none',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '16px', color: 'var(--ink-subtle)', fontSize: '12px', border: '1px dashed var(--hairline)', borderRadius: '6px' }}>
              우측 [파일 선택] 버튼을 눌러 테스트할 .m4a 음성 파일을 업로드하세요.
            </div>
          )}
        </div>

        {/* Section 2: 1-Click Preset Scenario Simulations */}
        <div style={{ backgroundColor: 'var(--surface-2)', padding: '16px', borderRadius: '8px', border: '1px solid var(--hairline)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={16} style={{ color: 'var(--accent-warning)' }} />
              표준 상담 시나리오 1-클릭 실시간 테스트
            </span>
            {isSimulating && (
              <span style={{ fontSize: '11px', color: 'var(--accent-success)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                ● 시뮬레이션 전사 중...
              </span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {MOCK_SCENARIOS.map((sc) => {
              const isActive = activeScenarioId === sc.id;
              return (
                <div
                  key={sc.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    backgroundColor: isActive ? 'rgba(37, 99, 235, 0.2)' : 'var(--surface-1)',
                    border: `1px solid ${isActive ? 'var(--accent-primary)' : 'var(--hairline)'}`,
                    fontSize: '12px'
                  }}
                >
                  <div>
                    <strong style={{ color: isActive ? '#93c5fd' : 'var(--ink)' }}>{sc.title}</strong>
                    <div style={{ color: 'var(--ink-muted)', fontSize: '11px', marginTop: '2px' }}>
                      {sc.dialogues.length}개 대화 턴 · 키워드: #{sc.category}
                    </div>
                  </div>

                  <button
                    onClick={() => runScenarioSimulation(sc)}
                    disabled={isSimulating}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '5px 12px',
                      backgroundColor: isActive ? 'var(--accent-success)' : 'var(--surface-3)',
                      color: isActive ? '#fff' : 'var(--ink)',
                      border: '1px solid var(--hairline)',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: isSimulating ? 'not-allowed' : 'pointer',
                      opacity: isSimulating && !isActive ? 0.5 : 1
                    }}
                  >
                    <Play size={12} />
                    <span>{isActive ? '시뮬레이션 중' : '테스트 시작'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: 'var(--accent-primary)',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
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
