/**
 * Generate SQL Migration and Seed Script for symptom_synonyms (Ground-Truth + Conjugation)
 */
const fs = require('fs');
const path = require('path');

const SUMMARY_JSON_PATH = path.join(__dirname, "extracted_symptoms_summary.json");
const SQL_OUTPUT_PATH = path.join(__dirname, "seed_symptom_synonyms_ground_truth.sql");

function generateConjugations(phrase) {
  const variations = new Set();
  variations.add(phrase);

  // Common verb endings in Korean call transcripts
  const rules = [
    { target: /불량$/, replacements: [' 불량 발생', ' 불량입니다', ' 불량인 것 같아요', ' 문제가 있어요'] },
    { target: /저하$/, replacements: [' 저하됨', ' 떨어짐', ' 약해졌어요', ' 약해지면'] },
    { target: /불가$/, replacements: ['가 안 돼요', ' 안 됨', ' 안 됨니다', ' 안 될 때'] },
    { target: /안\s*나옴$/, replacements: ['안 나와요', '안 나오면은', '안 나오고', '안 나오더니', '안 나와'] },
    { target: /누수$/, replacements: [' 누수 발생', '물이 새요', '물이 뚝뚝 떨어져요', '물이 찌익 새요'] },
    { target: /방전$/, replacements: [' 방전됨', ' 방전됐어요', ' 방전되면'] },
    { target: /막힘$/, replacements: [' 막혔어요', ' 막히면', ' 막혀서 안 돼요'] }
  ];

  for (const r of rules) {
    if (r.target.test(phrase)) {
      for (const rep of r.replacements) {
        variations.add(phrase.replace(r.target, rep).trim());
      }
    }
  }

  return Array.from(variations);
}

function main() {
  const raw = fs.readFileSync(SUMMARY_JSON_PATH, 'utf-8');
  const data = JSON.parse(raw);
  const items = data.all_expressions || [];

  // Filter technical relevant expressions
  const techItems = items.filter(it => it.part_code !== 'INQUIRY_ETC' && it.count >= 2);

  console.log(`Generating SQL for ${techItems.length} core technical expressions with conjugations...`);

  let sql = `-- =========================================================================\n`;
  sql += `-- GROUND-TRUTH SYMPTOM SYNONYMS CORPUS SEED (REAL CALL DATA + CONJUGATIONS)\n`;
  sql += `-- Generated from 12,969 real customer call observations\n`;
  sql += `-- =========================================================================\n\n`;
  sql += `BEGIN;\n\n`;

  sql += `-- 1. Ensure Table Structure\n`;
  sql += `CREATE TABLE IF NOT EXISTS symptom_synonyms (\n`;
  sql += `    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n`;
  sql += `    part_code VARCHAR(50) NOT NULL,\n`;
  sql += `    category_l1 VARCHAR(100) NOT NULL,\n`;
  sql += `    phrase VARCHAR(255) NOT NULL,\n`;
  sql += `    source VARCHAR(50) DEFAULT 'ground_truth_mined',\n`;
  sql += `    frequency_count INT DEFAULT 1,\n`;
  sql += `    is_active BOOLEAN DEFAULT TRUE,\n`;
  sql += `    created_at TIMESTAMPTZ DEFAULT NOW(),\n`;
  sql += `    CONSTRAINT uq_part_phrase UNIQUE (part_code, phrase)\n`;
  sql += `);\n\n`;

  sql += `CREATE EXTENSION IF NOT EXISTS pg_trgm;\n`;
  sql += `CREATE INDEX IF NOT EXISTS idx_symptom_synonyms_phrase_trgm ON symptom_synonyms USING gin (phrase gin_trgm_ops);\n\n`;

  sql += `-- 2. Insert Ground-Truth Phrases & Colloquial Variations\n`;
  sql += `INSERT INTO symptom_synonyms (part_code, category_l1, phrase, source, frequency_count)\nVALUES\n`;

  const values = [];
  for (const item of techItems) {
    const variations = generateConjugations(item.phrase);
    for (const v of variations) {
      const cleanV = v.replace(/'/g, "''");
      values.push(`('${item.part_code}', '${item.category_l1}', '${cleanV}', 'ground_truth_mined', ${item.count})`);
    }
  }

  // Add key colloquial suction phrases specifically requested
  const manualSuctions = [
    "빨아들이고", "빨아들이면은", "빨아들이질 않음", "물을 못 빨아들임", "바닥에 물이 흥건함",
    "물을 못 당겨요", "웽웽거리는 모터 소음", "모터에서 탄내 남", "흡입이 안 먹혀요", "물이 그대로 남아있음"
  ];
  for (const ms of manualSuctions) {
    values.push(`('SUCTION', '흡입계통', '${ms}', 'counselor_manual', 100)`);
  }

  sql += values.join(',\n') + '\n';
  sql += `ON CONFLICT (part_code, phrase) DO UPDATE SET \n`;
  sql += `    frequency_count = EXCLUDED.frequency_count,\n`;
  sql += `    is_active = true;\n\n`;
  sql += `COMMIT;\n`;

  fs.writeFileSync(SQL_OUTPUT_PATH, sql, 'utf-8');
  console.log(`✅ Generated SQL file (${values.length.toLocaleString()} total entries) at: ${SQL_OUTPUT_PATH}`);
}

main();
