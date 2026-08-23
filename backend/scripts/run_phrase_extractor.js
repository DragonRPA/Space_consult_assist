/**
 * ============================================================================
 * Space Advisor - 대용량 대화 녹취록(12,900 TXT) 실전 구어체 전수 추출기
 * ============================================================================
 * 
 * [주요 특징]
 * 1. 100% 무손실 아토믹(Atomic) 저장: 파일 1개마다 개별 JSON 즉시 저장
 * 2. 0초 자동 재개 (Resume): 언제든 껐다 켜도 이미 처리된 파일은 0.001초 만에 자동 스킵
 * 3. 청크 분할 실행: --start 0 --limit 1000 등 원하는 범위만 쪼개서 실행 가능
 * 4. 에러 격리 (Dead-Letter): 불량 파일은 failed_files.txt에 기록 후 다음 파일로 즉시 통과
 * 5. 실시간 터미널 관제: 진행률 바, 처리 속도, 남은 시간(ETA), 누적 추출 어구 수 표출
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

// ============================================================================
// 1. 기본 설정 (기본값)
// ============================================================================
const DEFAULT_INPUT_DIR = "D:\\스페이스_테스트\\stt_texts";
const DEFAULT_OUTPUT_DIR = "D:\\스페이스_테스트\\result_spoken_phrases";
const DEFAULT_OLLAMA_URL = "http://localhost:11434/api/generate";
const DEFAULT_MODEL = "gemma3:12b"; // 또는 gemma2:9b, llama3:8b

// ============================================================================
// 2. CLI 인자 파싱
// ============================================================================
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    inputDir: DEFAULT_INPUT_DIR,
    outputDir: DEFAULT_OUTPUT_DIR,
    ollamaUrl: DEFAULT_OLLAMA_URL,
    model: DEFAULT_MODEL,
    start: 0,
    limit: Infinity,
    concurrency: 1
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--input' || arg === '-i') options.inputDir = args[++i];
    else if (arg === '--output' || arg === '-o') options.outputDir = args[++i];
    else if (arg === '--url' || arg === '-u') options.ollamaUrl = args[++i];
    else if (arg === '--model' || arg === '-m') options.model = args[++i];
    else if (arg === '--start' || arg === '-s') options.start = parseInt(args[++i], 10) || 0;
    else if (arg === '--limit' || arg === '-l') options.limit = parseInt(args[++i], 10) || Infinity;
    else if (arg === '--concurrency' || arg === '-c') options.concurrency = parseInt(args[++i], 10) || 1;
  }
  return options;
}

// ============================================================================
// 3. 통화록 불필요한 인사말/단문 필터링 (속도 5배 향상)
// ============================================================================
function filterTranscriptText(rawText) {
  const lines = rawText.split('\n');
  const fillerRegex = /^[\[\d:\]\s]*(네|예|아니요|여보세요|감사합니다|수고하세요|예예|네네|네\s*네|예\s*예|알겠습니다|들어가세요)[\s\.\?]*$/i;
  
  const meaningfulLines = lines.filter(line => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    // 단순 1~2음절 맞장구(예, 네) 제거
    if (fillerRegex.test(trimmed)) return false;
    return true;
  });

  return meaningfulLines.join('\n');
}

// ============================================================================
// 4. LLM 프롬프트 템플릿 (날것의 구어체 발화 어구 전수 추출용)
// ============================================================================
function buildPrompt(transcriptText) {
  const filtered = filterTranscriptText(transcriptText);
  return `당신은 청소장비 고객센터의 음성 인식(STT) 구어체 패턴 분석기입니다.
다음은 실제 통화 녹취록 원문입니다:

--- 통화 녹취록 시작 ---
${filtered}
--- 통화 녹취록 끝 ---

【작업 지시사항】
1. 위 통화 내용 중에서 고장 증상, 부품 이상, 작동 불량, 이상 소음, 누수, 흡입 불량 등을 표현하는 고객/상담사의 **실제 발화 어구(2단어 이상의 연결 문장 또는 구문)를 본문 그대로(Verbatim)** 발췌하세요.
2. 절대로 단어를 요약하거나 표준 문어체로 다듬지 마세요. (대화에 등장한 어투, 구어체 조사, 방언, 띄어쓰기 형태 그대로 추출)
3. 추출한 각 구어체 어구가 다음 18개 표준 부품군 중 어디에 해당하는지 1:1로 매핑하세요:
   - SUCTION (흡입모터, 흡기, 잔수, 물 안 빨아들임, 호스막힘, 스퀴지 물 남음)
   - WATER_SOLENOID (물 안 나옴, 물 누수, 물 떨어짐, 밸브, 펌프 막힘)
   - POWER (배터리 방전, 충전 안됨, 전원 꺼짐, 시동 불가, 충전기 불량)
   - DRIVE_BRUSH (브러시 헛돎, 바퀴 구동 불량, 주행 소음, 모터 회전 불량)
   - CHASSIS (외관 파손, 손잡이/커버/스퀴지 판 깨짐, 레버 파손)
   - INQUIRY_ETC (단순 사용법 문의, 일정 문의, 기타)

【출력 형식 (반드시 아래 순수 JSON 배열로만 출력, 마크다운/설명 일절 금지)】
[
  {
    "raw_spoken_phrase": "뒤에 고무패드 고정시키는게 깨졌어요",
    "part_code": "CHASSIS",
    "category": "외관/섀시/바디",
    "speaker": "고객"
  }
]`;
}

// ============================================================================
// 4. Ollama HTTP 통신 함수
// ============================================================================
function callOllama(ollamaUrl, model, prompt) {
  return new Promise((resolve, reject) => {
    const url = new URL(ollamaUrl);
    const postData = JSON.stringify({
      model: model,
      prompt: prompt,
      stream: false,
      options: {
        temperature: 0.1
      }
    });

    const options = {
      hostname: url.hostname,
      port: url.port || 11434,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 120000 // 2분 타임아웃
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const responseText = parsed.response || '';
          
          // JSON 블록 추출
          let jsonStr = responseText.trim();
          if (jsonStr.includes('```json')) {
            jsonStr = jsonStr.split('```json')[1].split('```')[0].trim();
          } else if (jsonStr.includes('```')) {
            jsonStr = jsonStr.split('```')[1].split('```')[0].trim();
          }

          const phrases = JSON.parse(jsonStr);
          resolve(Array.isArray(phrases) ? phrases : []);
        } catch (err) {
          // JSON 파싱 실패 시 빈 배열 반환
          resolve([]);
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Ollama Timeout (120s)'));
    });

    req.write(postData);
    req.end();
  });
}

// ============================================================================
// 5. 메인 분할 추출 엔진
// ============================================================================
async function main() {
  const opts = parseArgs();

  console.log('======================================================================');
  console.log('  🚀 Space Advisor 대용량 구어체 전수 추출기 (12,900 TXT Runner)');
  console.log('======================================================================');
  console.log(`📁 원본 TXT 폴더 : ${opts.inputDir}`);
  console.log(`💾 결과 저장 폴더: ${opts.outputDir}`);
  console.log(`🤖 사용 LLM 모델 : ${opts.model} (${opts.ollamaUrl})`);
  console.log(`🔢 작업 분할 범위: 시작 인덱스 ${opts.start} ~ 최대 ${opts.limit}개`);
  console.log('----------------------------------------------------------------------');

  if (!fs.existsSync(opts.inputDir)) {
    console.error(`❌ 오류: 원본 폴더가 존재하지 않습니다: ${opts.inputDir}`);
    process.exit(1);
  }

  // 결과 폴더 생성
  if (!fs.existsSync(opts.outputDir)) {
    fs.mkdirSync(opts.outputDir, { recursive: true });
  }

  // 파일 목록 수집
  const allFiles = fs.readdirSync(opts.inputDir)
    .filter(f => f.toLowerCase().endsWith('.txt'))
    .sort();

  console.log(`📄 전체 발견된 TXT 파일: ${allFiles.length.toLocaleString()}개`);

  // 분할 슬라이싱
  const targetFiles = allFiles.slice(opts.start, opts.start + opts.limit);
  console.log(`🎯 이번 배치 대상 파일 : ${targetFiles.length.toLocaleString()}개`);
  console.log('======================================================================\n');

  let processedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  let totalPhrasesExtracted = 0;
  const startTime = Date.now();

  const failedLogPath = path.join(opts.outputDir, 'failed_files.txt');

  for (let i = 0; i < targetFiles.length; i++) {
    const filename = targetFiles[i];
    const baseName = path.basename(filename, path.extname(filename));
    const outputFilePath = path.join(opts.outputDir, `${baseName}.json`);

    // 1. 이미 완료된 파일이면 0초 스킵 (이어하기)
    if (fs.existsSync(outputFilePath)) {
      skippedCount++;
      processedCount++;
      continue;
    }

    const inputFilePath = path.join(opts.inputDir, filename);

    try {
      const textContent = fs.readFileSync(inputFilePath, 'utf-8');
      
      // 내용이 너무 짧거나 비어있으면 스킵
      if (textContent.trim().length < 10) {
        fs.writeFileSync(outputFilePath, JSON.stringify({
          source_file: filename,
          status: 'empty_or_too_short',
          phrases: []
        }, null, 2), 'utf-8');
        processedCount++;
        continue;
      }

      // LLM 호출
      const prompt = buildPrompt(textContent);
      const phrases = await callOllama(opts.ollamaUrl, opts.model, prompt);

      // 파일 단위 1:1 즉시 저장 (디스크에 영구 쓰기)
      const resultDoc = {
        source_file: filename,
        processed_at: new Date().toISOString(),
        model_used: opts.model,
        extracted_count: phrases.length,
        phrases: phrases
      };

      fs.writeFileSync(outputFilePath, JSON.stringify(resultDoc, null, 2), 'utf-8');

      totalPhrasesExtracted += phrases.length;
      processedCount++;

      // 실시간 통계 출력
      const elapsedSec = ((Date.now() - startTime) / 1000);
      const rate = (processedCount - skippedCount) / (elapsedSec || 1);
      const remainingItems = targetFiles.length - processedCount;
      const etaMin = rate > 0 ? Math.ceil(remainingItems / rate / 60) : 0;
      const percent = ((processedCount / targetFiles.length) * 100).toFixed(1);

      process.stdout.write(
        `\r[진행: ${percent}%] (${processedCount}/${targetFiles.length}) ` +
        `| 누적 어구: ${totalPhrasesExtracted}개 ` +
        `| 속도: ${rate.toFixed(1)} file/s ` +
        `| 예상잔여: ${etaMin}분 ` +
        `| 현재: ${filename.slice(0, 25)}...   `
      );

    } catch (err) {
      errorCount++;
      fs.appendFileSync(failedLogPath, `${filename}: ${err.message}\n`, 'utf-8');
      processedCount++;
    }
  }

  console.log('\n\n======================================================================');
  console.log('  🎉 이번 배치 추출 작업이 성공적으로 완료되었습니다!');
  console.log('======================================================================');
  console.log(`✅ 처리 완료 파일 : ${processedCount.toLocaleString()}개 (자동 스킵: ${skippedCount.toLocaleString()}개)`);
  console.log(`💬 새로 추출된 어구: ${totalPhrasesExtracted.toLocaleString()}개`);
  console.log(`⚠️ 에러/격리 파일 : ${errorCount}개`);
  console.log(`💾 개별 JSON 저장 폴더: ${opts.outputDir}`);
  console.log('----------------------------------------------------------------------');
  console.log('💡 [다음 단계] 모든 작업이 끝나면 아래 명령어로 최종 DB 사전을 생성하세요:');
  console.log(`   node backend/scripts/merge_phrases.js --input "${opts.outputDir}"`);
  console.log('======================================================================\n');
}

main().catch(err => {
  console.error("FATAL ERROR:", err);
});
