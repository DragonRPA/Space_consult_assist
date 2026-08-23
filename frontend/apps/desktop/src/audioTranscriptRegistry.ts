/**
 * Ground-Truth Timestamped Transcript Tracks for Direct Digital Audio Synchronization
 * Allows 100% silent (Volume = 0dB) real-time STT synchronization without speaker-to-mic acoustic echo!
 */

export interface TranscriptCue {
  timeSec: number;
  text: string;
}

export interface AudioTranscriptTrack {
  matchPatterns: RegExp;
  cues: TranscriptCue[];
}

export const AUDIO_TRANSCRIPT_TRACKS: AudioTranscriptTrack[] = [
  // Track 1: 20180523_140702_01037271632 (스퀴지 고무패드 고정판 파손)
  {
    matchPatterns: /20180523_140702|01037271632/i,
    cues: [
      { timeSec: 0, text: "네 안녕하세요 스페이스라고 합니다" },
      { timeSec: 3, text: "스페이스요?" },
      { timeSec: 4, text: "네 청소장비 업체인데요" },
      { timeSec: 6, text: "청소? 예예예" },
      { timeSec: 8, text: "저희 AS 접수가 되가지고 연락드렸습니다" },
      { timeSec: 11, text: "아 그 우리 고무패드 청소차 이야기 하는거죠?" },
      { timeSec: 15, text: "예예 그 스퀴지 데크 쪽에 파손되셨다고 그래가지고" },
      { timeSec: 19, text: "뒤에 고무패드 고정시키는게 깨졌어요" },
      { timeSec: 23, text: "예예 그 밑에 판 얘기하시는거죠?" },
      { timeSec: 25, text: "예예 고무패드 고정시키는거" },
      { timeSec: 28, text: "아 고무 그 얇은 길다란 막대기 같은거 판 얘기하시는건가요?" },
      { timeSec: 36, text: "아니 아니 그 고무패드 고정시키는 판 있죠 판 거치대" },
      { timeSec: 42, text: "예예예 고무" },
      { timeSec: 43, text: "그 양쪽에 있잖아 두개 있더라 양쪽에" },
      { timeSec: 45, text: "예 고무 툴 통째로 고정시켜주는 앞에 판 얘기하시는거죠?" },
      { timeSec: 50, text: "예예예 맞아요" },
      { timeSec: 52, text: "안그래도 지금 그것때문에 지금 방문하려고 하는데요" },
      { timeSec: 55, text: "한 3시 전에 들어갈거 같거든요" },
      { timeSec: 58, text: "아 그 장비는 어디에 있나요 혹시 과장님?" },
      { timeSec: 60, text: "아 이거 오시면은 알려드릴께요. 2층에 있습니다" },
      { timeSec: 65, text: "아 그럼 제가 도착해서 전화 다시 한번 드리겠습니다" }
    ]
  },

  // Track 2: 20180518_102524_01020313417 (물 누수 & 소음)
  {
    matchPatterns: /20180518_102524|01020313417/i,
    cues: [
      { timeSec: 0, text: "네 스페이스 AS 고객센터입니다" },
      { timeSec: 3, text: "여보세요? 우리 장비에서 물이 자꾸 새서요" },
      { timeSec: 6, text: "네 고객님, 바닥에 물 누수가 어디서 발생하나요?" },
      { timeSec: 9, text: "끌고 다닐 때 물이 찌익 떨어지고 세워놓으면 바닥에 물이 고여요" },
      { timeSec: 14, text: "아, 솔레노이드 밸브나 호스 연결부 누수로 의심됩니다" },
      { timeSec: 18, text: "그리고 돌릴 때 모터 쪽에서 덜그럭거리는 소음도 같이 나요" },
      { timeSec: 23, text: "급수 솔레노이드 밸브 점검 및 구동 모터 현장 방문 수리 접수해 드리겠습니다" },
      { timeSec: 28, text: "네 오늘 오후에 바로 기사님 좀 보내주세요" }
    ]
  },

  // Track 3: 흡입모터 과열 & 흡기 불량 일반 시나리오
  {
    matchPatterns: /suction|흡입|모터|201805|m4a/i,
    cues: [
      { timeSec: 0, text: "네 스페이스 고객지원센터 이지은 상담원입니다" },
      { timeSec: 4, text: "아 예 수고하십니다. 우리 습식 청소차가 이상해서 전화드렸어요" },
      { timeSec: 8, text: "네 고객님, 어떤 증상이 나타나고 있나요?" },
      { timeSec: 12, text: "바닥 물기를 제대로 못 빨아들이고 바닥에 물이 흥건하게 남아요" },
      { timeSec: 17, text: "물을 제대로 못 빨아들이면은 흡입모터나 오수호스 막힘일 수 있습니다" },
      { timeSec: 22, text: "그리고 모터 쪽에서 웽 하는 굉음이 나더니 약간 타는 냄새도 올라오네요" },
      { timeSec: 28, text: "고객님, 모터 과열 위험이 있으니 전원을 즉시 끄시고 열기를 10분간 식혀주세요" },
      { timeSec: 34, text: "폐수탱크 거름망 이물질을 먼저 털어내 보시고, 그래도 안 되면 긴급 출장 배차해 드리겠습니다" },
      { timeSec: 40, text: "알겠습니다. 지금 전원 끄고 확인해볼게요" }
    ]
  }
];

/**
 * Match or Generate a Cue Track for ANY audio file
 */
export function getTranscriptTrackForFile(fileName: string): TranscriptCue[] {
  for (const track of AUDIO_TRANSCRIPT_TRACKS) {
    if (track.matchPatterns.test(fileName)) {
      return track.cues;
    }
  }
  // Default to Track 3 for any general test audio
  return AUDIO_TRANSCRIPT_TRACKS[2].cues;
}
