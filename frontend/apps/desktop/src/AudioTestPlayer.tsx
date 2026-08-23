import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  Upload, 
  Volume2, 
  VolumeX,
  FileAudio,
  Sparkles,
  Headphones,
  X
} from 'lucide-react';
import { useCounselStore } from './store';

interface RealAudioPlayerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AudioTestPlayer: React.FC<RealAudioPlayerProps> = ({ isOpen, onClose }) => {
  const { 
    showToast, 
    clearToast, 
    isRecording, 
    setRecording,
    activeAudioFile,
    activeAudioUrl,
    setActiveAudioFile
  } = useCounselStore();

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [volume, setVolume] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-play when a new file is loaded
  useEffect(() => {
    if (activeAudioUrl && audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);

      // Auto start STT recording if not active
      if (!isRecording) {
        setRecording(true);
      }

      // Try auto play
      audioRef.current.play().then(() => {
        setIsPlaying(true);
        showToast(`▶ [${activeAudioFile?.name}] 스피커 소리 출력을 시작합니다.`);
        setTimeout(() => clearToast(), 3000);
      }).catch((err) => {
        console.warn("Auto-play waiting for user click:", err);
        setIsPlaying(false);
      });
    }
  }, [activeAudioUrl, activeAudioFile, isRecording, setRecording, showToast, clearToast]);

  // Handle Manual File Upload (.m4a, .mp3, .wav, etc.)
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setActiveAudioFile(file);
    }
  };

  // Real Speaker Audio Playback Toggle
  const togglePlayAudio = () => {
    if (!audioRef.current || !activeAudioUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      showToast("⏸️ 일시정지됨");
      setTimeout(() => clearToast(), 2000);
    } else {
      if (!isRecording) {
        setRecording(true);
      }

      audioRef.current.play().then(() => {
        setIsPlaying(true);
        showToast("▶ 스피커로 소리 출력 중 (마이크로 실시간 전사)");
        setTimeout(() => clearToast(), 3000);
      }).catch(err => {
        console.error("Audio playback error:", err);
        showToast("⚠ 브라우저 오디오 재생 실패: 볼륨 및 오디오 장치를 확인해 주세요.");
        setTimeout(() => clearToast(), 3500);
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

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    if (audioRef.current) {
      audioRef.current.volume = newVol;
      audioRef.current.muted = newVol === 0;
      setIsMuted(newVol === 0);
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.muted = false;
      setIsMuted(false);
      if (volume === 0) setVolume(1.0);
    } else {
      audioRef.current.muted = true;
      setIsMuted(true);
    }
  };

  const changePlaybackRate = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const formatTime = (sec: number) => {
    if (isNaN(sec) || !isFinite(sec)) return "00:00";
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(Math.floor(sec % 60)).padStart(2, '0');
    return `${m}:${s}`;
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.8)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 200,
      animation: 'fadeIn 0.15s ease-out'
    }}>
      <div style={{
        width: '560px',
        backgroundColor: 'var(--surface-1)',
        border: '1px solid var(--hairline)',
        borderRadius: '10px',
        padding: '24px',
        boxShadow: '0 20px 48px rgba(0,0,0,0.85)',
        color: 'var(--ink)',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--hairline)', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <Headphones size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>실제 음성 파일(.m4a) 미디어 플레이어</h3>
              <p style={{ margin: 0, fontSize: '11px', color: 'var(--ink-muted)' }}>스피커로 실제 소리를 출력하여 STT 및 AI 어시스트를 검증합니다.</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--ink-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Real HTML5 Audio Element */}
        {activeAudioUrl && (
          <audio
            ref={audioRef}
            src={activeAudioUrl}
            preload="auto"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => setIsPlaying(false)}
            onError={(e) => {
              console.error("Audio Load Error:", e);
              showToast("⚠ 음성 파일 재생 오류: 파일 코덱을 확인해 주세요.");
            }}
          />
        )}

        {/* File Select & Drop Area */}
        <div 
          onClick={() => fileInputRef.current?.click()}
          style={{ 
            backgroundColor: activeAudioFile ? 'var(--surface-2)' : 'rgba(37, 99, 235, 0.08)', 
            padding: '20px', 
            borderRadius: '8px', 
            border: activeAudioFile ? '1px solid var(--hairline)' : '2px dashed var(--accent-primary)',
            cursor: 'pointer',
            textAlign: 'center',
            transition: 'all 0.2s ease'
          }}
        >
          <input 
            ref={fileInputRef}
            type="file" 
            accept="audio/*,.m4a,.mp3,.wav,.aac,.ogg,.flac" 
            onChange={handleFileInputChange} 
            style={{ display: 'none' }} 
          />

          {activeAudioFile ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              <FileAudio size={28} style={{ color: 'var(--accent-primary)' }} />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--ink)' }}>{activeAudioFile.name}</div>
                <div style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>
                  크기: {(activeAudioFile.size / (1024 * 1024)).toFixed(2)} MB · 길이: {formatTime(duration)} (클릭 시 다른 파일 선택)
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <Upload size={28} style={{ color: 'var(--accent-primary)' }} />
              <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--ink)' }}>
                내 PC의 통화 녹음 파일(.m4a, .mp3, .wav)을 클릭하여 선택하세요
              </div>
              <div style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>
                파일을 끌어다 놓으셔도 즉시 로드되어 스피커로 소리가 출력됩니다.
              </div>
            </div>
          )}
        </div>

        {/* Hardware Playback Control Panel */}
        {activeAudioUrl ? (
          <div style={{ backgroundColor: 'var(--surface-2)', padding: '16px', borderRadius: '8px', border: '1px solid var(--hairline)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            
            {/* Timeline Scrub Slider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="font-mono" style={{ fontSize: '12px', color: 'var(--accent-primary)', fontWeight: 600 }}>{formatTime(currentTime)}</span>
              <input
                type="range"
                min="0"
                max={duration || 100}
                step="0.1"
                value={currentTime}
                onChange={handleSeek}
                style={{ flex: 1, accentColor: 'var(--accent-primary)', cursor: 'pointer', height: '6px' }}
              />
              <span className="font-mono" style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>{formatTime(duration)}</span>
            </div>

            {/* Play/Pause/Stop & Volume & Speed Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              
              {/* Primary Play/Pause/Stop Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={togglePlayAudio}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 18px',
                    backgroundColor: isPlaying ? 'var(--accent-danger)' : 'var(--accent-primary)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: isPlaying ? '0 0 12px rgba(239, 68, 68, 0.5)' : '0 0 12px rgba(37, 99, 235, 0.4)'
                  }}
                >
                  {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                  <span>{isPlaying ? '일시정지' : '스피커로 소리 재생'}</span>
                </button>

                <button
                  onClick={stopAudio}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '8px 12px',
                    backgroundColor: 'var(--surface-3)',
                    color: 'var(--ink)',
                    border: '1px solid var(--hairline)',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  <Square size={14} />
                  <span>정지</span>
                </button>
              </div>

              {/* Speaker Volume Slider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button onClick={toggleMute} style={{ background: 'none', border: 'none', color: isMuted ? 'var(--accent-danger)' : 'var(--ink)', cursor: 'pointer' }}>
                  {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  style={{ width: '70px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '11px', color: 'var(--ink-muted)', width: '30px' }}>
                  {isMuted ? '0%' : `${Math.round(volume * 100)}%`}
                </span>
              </div>

              {/* Speed Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                {[1.0, 1.2, 1.5].map((rate) => (
                  <button
                    key={rate}
                    onClick={() => changePlaybackRate(rate)}
                    style={{
                      padding: '3px 7px',
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

            {/* STT Integration Helper Callout */}
            <div style={{ 
              backgroundColor: 'rgba(37, 99, 235, 0.12)', 
              border: '1px solid rgba(37, 99, 235, 0.3)', 
              borderRadius: '6px', 
              padding: '10px 12px', 
              fontSize: '12px', 
              color: '#93c5fd',
              lineHeight: 1.4,
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px'
            }}>
              <Sparkles size={16} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--accent-primary)' }} />
              <div>
                <strong>💡 실시간 STT 검증 안내:</strong><br/>
                스피커로 재생되는 실제 음성이 PC 마이크로 입력되어 중앙 자막창에 4색 하이라이트로 실시간 전사됩니다.
              </div>
            </div>

          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '16px', color: 'var(--ink-subtle)', fontSize: '12px' }}>
            위 박스를 클릭하여 PC의 실제 통화 녹음 파일(.m4a)을 선택하세요.
          </div>
        )}

        {/* Footer */}
        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: 'var(--surface-3)',
            color: 'var(--ink)',
            border: '1px solid var(--hairline)',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          플레이어 닫기 (상담 화면 유지)
        </button>

      </div>
    </div>
  );
};
