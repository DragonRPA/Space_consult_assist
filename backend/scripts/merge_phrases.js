/**
 * ============================================================================
 * Space Advisor - 순수 한글 구어체 JSON들을 마스터 DB 및 사전으로 1-클릭 통합
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_JSON_DIR = "D:\\스페이스_테스트\\result_spoken_phrases";
const DEFAULT_OUTPUT_DIR = "D:\\GoogleDrive\\RPA_dev\\01.AntiGravity\\Space_consult_assist\\backend\\scripts";

const CATEGORY_TO_PART_CODE = {
  "흡입계통": "SUCTION",
  "급수/누수": "WATER_SOLENOID",
  "배터리/전원": "POWER",
  "브러시/구동": "DRIVE_BRUSH",
  "외관파손": "CHASSIS",
  "단순문의": "INQUIRY_ETC"
};

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    inputDir: DEFAULT_JSON_DIR,
    outputDir: DEFAULT_OUTPUT_DIR
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--input' || arg === '-i') options.inputDir = args[++i];
    else if (arg === '--output' || arg === '-o') options.outputDir = args[++i];
  }
  return options;
}

function main() {
  const opts = parseArgs();

  console.log('======================================================================');
  console.log('  📦 Space Advisor 추출 구어체 마스터 사전 통합기 (Merger)');
  console.log('======================================================================');
  console.log(`📁 개별 JSON 폴더: ${opts.inputDir}`);
  console.log(`💾 마스터 저장 폴더: ${opts.outputDir}`);
  console.log('----------------------------------------------------------------------');

  if (!fs.existsSync(opts.inputDir)) {
    console.error(`❌ 오류: JSON 폴더가 존재하지 않습니다: ${opts.inputDir}`);
    process.exit(1);
  }

  const jsonFiles = fs.readdirSync(opts.inputDir)
    .filter(f => f.toLowerCase().endsWith('.json'));

  console.log(`🔍 스캔된 JSON 파일: ${jsonFiles.length.toLocaleString()}개`);

  const phraseMap = new Map(); // phrase -> { part_code, category, frequency, source_files: Set }

  for (const f of jsonFiles) {
    const filePath = path.join(opts.inputDir, f);
    try {
      const doc = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const phrases = doc.phrases || [];
      for (const p of phrases) {
        // 한글 키 우선 지원
        const rawPhrase = (p.발화어구 || p.raw_spoken_phrase || '').trim();
        const category = (p.증상분류 || p.category || '단순문의').trim();
        const partCode = CATEGORY_TO_PART_CODE[category] || (p.part_code || 'INQUIRY_ETC').trim().toUpperCase();

        if (rawPhrase.length >= 2) {
          const key = `${category}:::${rawPhrase}`;
          if (!phraseMap.has(key)) {
            phraseMap.set(key, {
              part_code: partCode,
              category: category,
              phrase: rawPhrase,
              frequency: 0,
              source_files: new Set()
            });
          }
          const entry = phraseMap.get(key);
          entry.frequency += 1;
          entry.source_files.add(f);
        }
      }
    } catch (_) {}
  }

  const aggregatedList = Array.from(phraseMap.values()).map(item => ({
    part_code: item.part_code,
    category: item.category,
    phrase: item.phrase,
    frequency: item.frequency,
    source_file_count: item.source_files.size
  }));

  // 빈도수 내림차순 정렬
  aggregatedList.sort((a, b) => b.frequency - a.frequency);

  console.log(`✅ 중복 제거 후 고유 구어체 표현: 총 ${aggregatedList.length.toLocaleString()}건 도출!`);

  // 1. 마스터 JSON 사전 저장
  const masterJsonPath = path.join(opts.outputDir, 'master_spoken_synonyms.json');
  fs.writeFileSync(masterJsonPath, JSON.stringify({
    total_unique_phrases: aggregatedList.length,
    scanned_files_count: jsonFiles.length,
    generated_at: new Date().toISOString(),
    top_30_phrases: aggregatedList.slice(0, 30),
    all_phrases: aggregatedList
  }, null, 2), 'utf-8');

  // 2. PostgreSQL DB 적재 SQL 생성
  const masterSqlPath = path.join(opts.outputDir, 'seed_symptom_synonyms_from_txt.sql');
  let sql = `-- =========================================================================\n`;
  sql += `-- GROUND TRUTH SPOKEN PHRASES MASTER SEED (FROM ${jsonFiles.length} TXT FILES)\n`;
  sql += `-- Generated At: ${new Date().toISOString()}\n`;
  sql += `-- =========================================================================\n\n`;
  sql += `BEGIN;\n\n`;
  sql += `CREATE TABLE IF NOT EXISTS symptom_synonyms (\n`;
  sql += `    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n`;
  sql += `    part_code VARCHAR(50) NOT NULL,\n`;
  sql += `    category_l1 VARCHAR(100) NOT NULL,\n`;
  sql += `    phrase VARCHAR(255) NOT NULL,\n`;
  sql += `    source VARCHAR(50) DEFAULT 'raw_txt_mined',\n`;
  sql += `    frequency_count INT DEFAULT 1,\n`;
  sql += `    is_active BOOLEAN DEFAULT TRUE,\n`;
  sql += `    created_at TIMESTAMPTZ DEFAULT NOW(),\n`;
  sql += `    CONSTRAINT uq_category_phrase UNIQUE (category_l1, phrase)\n`;
  sql += `);\n\n`;
  sql += `CREATE EXTENSION IF NOT EXISTS pg_trgm;\n`;
  sql += `CREATE INDEX IF NOT EXISTS idx_symptom_synonyms_phrase_trgm ON symptom_synonyms USING gin (phrase gin_trgm_ops);\n\n`;

  if (aggregatedList.length > 0) {
    sql += `INSERT INTO symptom_synonyms (part_code, category_l1, phrase, source, frequency_count)\nVALUES\n`;
    const rows = aggregatedList.map(item => {
      const cleanPhrase = item.phrase.replace(/'/g, "''");
      const cleanCat = item.category.replace(/'/g, "''");
      return `('${item.part_code}', '${cleanCat}', '${cleanPhrase}', 'raw_txt_mined', ${item.frequency})`;
    });
    sql += rows.join(',\n') + '\n';
    sql += `ON CONFLICT (category_l1, phrase) DO UPDATE SET \n`;
    sql += `    frequency_count = EXCLUDED.frequency_count,\n`;
    sql += `    is_active = true;\n\n`;
  }

  sql += `COMMIT;\n`;
  fs.writeFileSync(masterSqlPath, sql, 'utf-8');

  console.log('\n📊 [Top 15 실전 고객 발화 구어체 랭킹]:');
  aggregatedList.slice(0, 15).forEach((item, idx) => {
    console.log(`  ${String(idx + 1).padStart(2, ' ')}. [${item.category.padEnd(8, ' ')}] "${item.phrase}" (${item.frequency}회 발생 / ${item.source_file_count}개 파일)`);
  });

  console.log('\n======================================================================');
  console.log(`💾 마스터 JSON 사전: ${masterJsonPath}`);
  console.log(`💾 PostgreSQL SQL 시드: ${masterSqlPath}`);
  console.log('======================================================================\n');
}

main();
