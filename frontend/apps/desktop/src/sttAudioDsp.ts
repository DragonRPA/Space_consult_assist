import type { KeywordEntity } from './keywordRegistryData';
import type { MatchedDiagnosis } from './store';

export const STT_LAB_STORAGE_KEY = 'space_stt_lab_options_v1';

export const DEFAULT_STT_LAB_OPTIONS = {
  lowCut85Hz: false,
  highBoostConsonant: false,
  dualSpeakerBalance: true,
  rollingPrevSentence: true,
  domainWordBoost: true,
  wavPeakNormalize: true,
  boxcarAntiAliasing: true,
  dynamicEnvelopeVad: false,
};

export type SttLabOptions = typeof DEFAULT_STT_LAB_OPTIONS;

export interface TempoProfile {
  emaSps: number;
  emaBreathPauseSec: number;
  emaEnvelopeRate: number;
  tempoMultiplier: number;
  targetSilenceSec: number;
  targetClauseSec: number;
  softMaxChunkSec: number;
  hardMaxChunkSec: number;
  clovaGapMs: number;
  clovaDurMs: number;
}

export const createDefaultTempoProfile = (): TempoProfile => ({
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
});

export function loadInitialSttLabOptions(): SttLabOptions {
  try {
    const saved = window.localStorage.getItem(STT_LAB_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') {
        return {
          lowCut85Hz: typeof parsed.lowCut85Hz === 'boolean' ? parsed.lowCut85Hz : DEFAULT_STT_LAB_OPTIONS.lowCut85Hz,
          highBoostConsonant: typeof parsed.highBoostConsonant === 'boolean' ? parsed.highBoostConsonant : DEFAULT_STT_LAB_OPTIONS.highBoostConsonant,
          dualSpeakerBalance: typeof parsed.dualSpeakerBalance === 'boolean' ? parsed.dualSpeakerBalance : DEFAULT_STT_LAB_OPTIONS.dualSpeakerBalance,
          rollingPrevSentence: typeof parsed.rollingPrevSentence === 'boolean' ? parsed.rollingPrevSentence : DEFAULT_STT_LAB_OPTIONS.rollingPrevSentence,
          domainWordBoost: typeof parsed.domainWordBoost === 'boolean' ? parsed.domainWordBoost : DEFAULT_STT_LAB_OPTIONS.domainWordBoost,
          wavPeakNormalize: typeof parsed.wavPeakNormalize === 'boolean' ? parsed.wavPeakNormalize : DEFAULT_STT_LAB_OPTIONS.wavPeakNormalize,
          boxcarAntiAliasing: typeof parsed.boxcarAntiAliasing === 'boolean' ? parsed.boxcarAntiAliasing : DEFAULT_STT_LAB_OPTIONS.boxcarAntiAliasing,
          dynamicEnvelopeVad: typeof parsed.dynamicEnvelopeVad === 'boolean' ? parsed.dynamicEnvelopeVad : DEFAULT_STT_LAB_OPTIONS.dynamicEnvelopeVad,
        };
      }
    }
  } catch {}
  return DEFAULT_STT_LAB_OPTIONS;
}

export function formatTimer(sec: number): string {
  const m = String(Math.floor(sec / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export function formatAudioTime(sec: number): string {
  if (isNaN(sec) || !isFinite(sec)) return '00:00';
  const m = String(Math.floor(sec / 60)).padStart(2, '0');
  const s = String(Math.floor(sec % 60)).padStart(2, '0');
  return `${m}:${s}`;
}

// 16kHz Mono Float32Array -> 16-bit PCM WAV Blob 인코더 (개별 스위치 기반 DSP 전처리 체인)
export function encodeWav16kMono(
  samples: Float32Array,
  sampleRate = 16000,
  opts: SttLabOptions = DEFAULT_STT_LAB_OPTIONS
): Blob {
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
}

export interface ConfirmedSlotsState {
  customer: boolean;
  phone: boolean;
  address: boolean;
  model: boolean;
  symptom: boolean;
  confirmedCount: number;
}

export interface NextLeadGuidanceState {
  stageBadge: string;
  accentColor: string;
  bgTint: string;
  borderTint: string;
  script: string;
  subPrompt: string;
}

export function computeNextLeadGuidance(params: {
  confirmedSlots: ConfirmedSlotsState;
  activeKeywordEntity: KeywordEntity | null;
  matchedDiagnosis: MatchedDiagnosis | null;
  assignedEngineer: string;
  recommendedClosingAction: 'NONE' | 'PARTS_QUOTE' | 'DISPATCH' | 'RESOLVED';
  cleanModelCode: string;
  totalCount: number;
  checkedCount: number;
  nextUncheckedStep: { id: number; text: string; checked: boolean } | null;
}): NextLeadGuidanceState {
  const {
    confirmedSlots,
    activeKeywordEntity,
    matchedDiagnosis,
    assignedEngineer,
    recommendedClosingAction,
    cleanModelCode,
    totalCount,
    checkedCount,
    nextUncheckedStep,
  } = params;
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
}
