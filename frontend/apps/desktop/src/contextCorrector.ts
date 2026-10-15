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
  { pattern: /솔레노이트|솔래노이드|소레노이드|설레는\s*너희들\s*밸브/g, replacement: '솔레노이드', category: '급수계통' },
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
  { pattern: /선지\s*프로\s*실물|프로\s*실물/g, replacement: '브러시 물', category: '브러시/급수' },
  { pattern: /물이\s*안\s*나서/g, replacement: '물이 안 나와서', category: '급수계통' },
  // 8. Solenoid / Water Hose
  { pattern: /호오스|물\s*호수|퇴수\s*호수/g, replacement: '드레인 호스', category: '호스/배관' },
  // 9. Equipment Model Name phonetics
  { pattern: /f10이|엑스\s*12|에스\s*12|에스\s*십이/gi, replacement: 'S12', category: '장비모델' },
  { pattern: /제이\s*600|제이\s*육백/g, replacement: 'J600T', category: '장비모델' },
  { pattern: /제이\s*800|제이\s*팔백/g, replacement: 'J800', category: '장비모델' },
  { pattern: /에스\s*세븐|에스\s*7|에스\s*칠/g, replacement: 'S7', category: '장비모델' },
  { pattern: /에스\s*파이브|에스\s*5|에스\s*오(?=\s|$|이|가|는|을)/g, replacement: 'S5', category: '장비모델' },
  { pattern: /알\s*쓰리|알\s*3/g, replacement: 'R3', category: '장비모델' }
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
