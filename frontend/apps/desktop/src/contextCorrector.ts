// Domain-Specific Phonetic & Contextual Correction Table for Industrial Cleaning Equipment
export interface CorrectionEvent {
  original: string;
  corrected: string;
  category: string;
  timestamp: string;
}

interface DomainRule {
  pattern: RegExp;
  replacement: string;
  category: string;
}

const DOMAIN_CORRECTION_RULES: DomainRule[] = [
  // 1. Squeegee / Rubber blade phonetics
  { pattern: /스키즈|스퀴즈|스큐지|스키지/g, replacement: '스퀴지', category: '소모품/스퀴지' },
  // 2. Solenoid Valve phonetics
  { pattern: /솔레노이트|소레노이드|설레는\s*너희들\s*밸브/g, replacement: '솔레노이드 밸브', category: '급수계통' },
  // 3. Suction Motor phonetics
  { pattern: /흐빕\s*모터|흡입\s*못터|흡잉\s*모터/g, replacement: '흡입 모터', category: '구동/흡입' },
  // 4. Float Valve (Water Level) phonetics
  { pattern: /프로토\s*밸브|플롯\s*밸브|플로터\s*밸브/g, replacement: '플로트 밸브', category: '센서/만수' },
  // 5. Wastewater Tank phonetics
  { pattern: /해수\s*탱크|배수\s*탱크|회수\s*통/g, replacement: '폐수탱크', category: '탱크계통' },
  // 6. Vacuum Pressure phonetics
  { pattern: /친구\s*납|진공\s*앞|진공\s*암/g, replacement: '진공압', category: '계측/성능' },
  // 7. Pad Driver / Brush Motor phonetics
  { pattern: /패트\s*드라이버|팻드라이버|페드\s*드라이버/g, replacement: '패드 드라이버', category: '브러시계통' },
  // 8. Solenoid / Water Hose
  { pattern: /호오스|물\s*호수|퇴수\s*호수/g, replacement: '드레인 호스', category: '호스/배관' }
];

export function applyContextualCorrection(rawText: string): { correctedText: string; corrections: CorrectionEvent[] } {
  let text = rawText;
  const corrections: CorrectionEvent[] = [];

  for (const rule of DOMAIN_CORRECTION_RULES) {
    // 가변 lastIndex 상태 오염 방지를 위해 매 실행 시 fresh RegExp 인스턴스 사용
    const rx = new RegExp(rule.pattern.source, 'g');
    const matches = text.match(rx);
    if (matches) {
      matches.forEach(m => {
        if (!corrections.some(c => c.original === m && c.corrected === rule.replacement)) {
          corrections.push({
            original: m,
            corrected: rule.replacement,
            category: rule.category,
            timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          });
        }
      });
      text = text.replace(rx, rule.replacement);
    }
  }

  return { correctedText: text, corrections };
}
