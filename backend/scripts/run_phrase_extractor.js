/**
 * ============================================================================
 * Space Advisor - 대용량 대화 녹취록(12,986 TXT) 순수 한글 실전 구어체 전수 추출기
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

// ============================================================================
// 1. 기본 설정 (Default Configuration)
// ============================================================================
const DEFAULT_INPUT_DIR = "D:\\스페이스_테스트\\stt_texts";
const DEFAULT_OUTPUT_DIR = "D:\\스페이스_테스트\\result_spoken_phrases";
const DEFAULT_OLLAMA_URL = "http://localhost:11434/api/generate";
const DEFAULT_MODEL = "gemma3:1b";

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
// 3. 통화록 불필요한 맞장구/인사말 필터링 (속도 극대화)
// ============================================================================
function filterTranscriptText(rawText) {
  const lines = rawText.split('\n');
  const fillerRegex = /^[\[\d:\]\s]*(네|예|아니요|여보세요|감사합니다|수고하세요|예예|네네|네\s*네|예\s*예|알겠습니다|들어가세요)[\s\.\?]*$/i;
  
  const meaningfulLines = lines.filter(line => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    if (fillerRegex.test(trimmed)) return false;
    return true;
  });

  return meaningfulLines.join('\n');
}

// ============================================================================
// 4. 순수 한글 DB 매핑 초고속 프롬프트
// ============================================================================
function buildPrompt(transcriptText) {
  const filtered = filterTranscriptText(transcriptText);
  return `다음 통화 녹취록에서 고장 증상이나 부품 이상을 말하는 고객의 실제 발화 어구(본문 그대로)를 발췌하고, 해당하는 증상 분류를 지정하여 JSON 배열로 출력하세요.

【증상 분류 목록】
- 흡입계통 (물 흡입 안됨, 바닥 잔수, 흡입모터 소음, 호스 막힘)
- 급수/누수 (물 안 나옴, 바닥 물 누수, 솔레노이드, 필터 막힘)
- 배터리/전원 (충전 안됨, 배터리 방전, 전원 꺼짐, 시동 불가)
- 브러시/구동 (브러시 헛돎, 주행/바퀴 이상, 덜그럭 소음)
- 외관파손 (손잡이, 커버, 스퀴지 판 깨짐/부러짐)
- 단순문의 (사용법, 일정, 단가, 기타)

【출력 형식 (반드시 아래 순수 JSON 배열만 출력)】
[
  {
    "발화어구": "뒤에 고무패드 고정시키는게 깨졌어요",
    "증상분류": "외관파손"
  }
]

【통화 녹취록】
${filtered}`;
}

// ============================================================================
// 5. Ollama 초고속 HTTP 통신 (JSON 모드 + 토큰 제한)
// ============================================================================
function callOllama(ollamaUrl, model, prompt) {
  return new Promise((resolve, reject) => {
    const url = new URL(ollamaUrl);
    const postData = JSON.stringify({
      model: model,
      prompt: prompt,
      format: "json", // 하드웨어 JSON 모드 강제
      stream: false,
      options: {
        temperature: 0.1,
        num_predict: 250 // 최대 토큰 제한 (속도 3배 향상)
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
      timeout: 60000 // 60초 타임아웃
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const responseText = parsed.response || '';
          
          let jsonStr = responseText.trim();
          if (jsonStr.includes('```json')) {
            jsonStr = jsonStr.split('```json')[1].split('```')[0].trim();
          } else if (jsonStr.includes('```')) {
            jsonStr = jsonStr.split('```')[1].split('```')[0].trim();
          }

          const parsedJson = JSON.parse(jsonStr);
          let phrases = [];
          if (Array.isArray(parsedJson)) {
            phrases = parsedJson;
          } else if (parsedJson && typeof parsedJson === 'object') {
            // 키가 감싸져 있는 경우 배열 추출
            const firstArray = Object.values(parsedJson).find(v => Array.isArray(v));
            if (firstArray) phrases = firstArray;
            else if (parsedJson['발화어구']) phrases = [parsedJson];
          }

          resolve(phrases);
        } catch (err) {
          resolve([]);
        }
      });
    });

    req.on('error', (e) => { reject(e); });
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Ollama Timeout (60s)'));
    });

    req.write(postData);
    req.end();
  });
}

// ============================================================================
// 6. 메인 분할 추출 엔진
// ============================================================================
async function main() {
  const opts = parseArgs();

  console.log('======================================================================');
  console.log('  🚀 Space Advisor 대용량 구어체 전수 추출기 (12,986 TXT Runner)');
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

  if (!fs.existsSync(opts.outputDir)) {
    fs.mkdirSync(opts.outputDir, { recursive: true });
  }

  const allFiles = fs.readdirSync(opts.inputDir)
    .filter(f => f.toLowerCase().endsWith('.txt'))
    .sort();

  console.log(`📄 전체 발견된 TXT 파일: ${allFiles.length.toLocaleString()}개`);

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

    // 이미 완료된 파일이면 0초 스킵 (이어하기)
    if (fs.existsSync(outputFilePath)) {
      skippedCount++;
      processedCount++;
      continue;
    }

    const inputFilePath = path.join(opts.inputDir, filename);

    try {
      const textContent = fs.readFileSync(inputFilePath, 'utf-8');
      
      if (textContent.trim().length < 10) {
        fs.writeFileSync(outputFilePath, JSON.stringify({
          source_file: filename,
          status: 'empty_or_too_short',
          phrases: []
        }, null, 2), 'utf-8');
        processedCount++;
        continue;
      }

      // LLM 순수 한글 초고속 호출
      const prompt = buildPrompt(textContent);
      const phrases = await callOllama(opts.ollamaUrl, opts.model, prompt);

      // 파일 단위 1:1 즉시 영구 저장
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

      // 실시간 게이지 출력
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
