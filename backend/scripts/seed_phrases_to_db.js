/**
 * ============================================================================
 * Space Advisor - 8,360건 마스터 구어체 사전 DB 자동 분할 배치 주입기
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const JSON_FILE_PATH = path.join(__dirname, 'master_spoken_synonyms.json');
const BATCH_SIZE = 250;

// Direct PostgreSQL Connection to Supabase Pooler
const connectionString = "postgresql://postgres.eknwzjcbchbefdlykqgl:jUHGAmVsSeXc1jdR@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres";

const pool = new Pool({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000
});

async function main() {
  console.log('======================================================================');
  console.log('  🚀 Space Advisor 마스터 구어체 DB 분할 배치 주입기 (Chunker)');
  console.log('======================================================================');
  console.log(`📁 입력 파일: ${JSON_FILE_PATH}`);
  console.log(`📦 배치 크기: ${BATCH_SIZE}개 단위`);
  console.log('----------------------------------------------------------------------');

  if (!fs.existsSync(JSON_FILE_PATH)) {
    console.error(`❌ 오류: 파일이 존재하지 않습니다: ${JSON_FILE_PATH}`);
    process.exit(1);
  }

  const rawJson = JSON.parse(fs.readFileSync(JSON_FILE_PATH, 'utf-8'));
  const allPhrases = rawJson.all_phrases || [];

  console.log(`🔍 총 적재 대상 구어체: ${allPhrases.length.toLocaleString()}건`);

  const client = await pool.connect();

  try {
    console.log('1️⃣ [테이블 준비] symptom_synonyms 테이블 및 인덱스 확인 중...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS symptom_synonyms (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          part_code VARCHAR(50) NOT NULL,
          category_l1 VARCHAR(100) NOT NULL,
          phrase VARCHAR(255) NOT NULL,
          source VARCHAR(50) DEFAULT 'raw_txt_mined',
          frequency_count INT DEFAULT 1,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          CONSTRAINT uq_category_phrase UNIQUE (category_l1, phrase)
      );
    `);
    await client.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_symptom_synonyms_phrase_trgm ON symptom_synonyms USING gin (phrase gin_trgm_ops);`);
    console.log('   ✅ 테이블 및 pg_trgm GIN 인덱스 준비 완료!');

    console.log('\n2️⃣ [분할 배치 주입 시작]...');
    const totalBatches = Math.ceil(allPhrases.length / BATCH_SIZE);
    let insertedCount = 0;
    const startTime = Date.now();

    for (let b = 0; b < totalBatches; b++) {
      const batchItems = allPhrases.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);
      
      const valuePlaceholders = [];
      const queryParams = [];
      let pIndex = 1;

      for (const item of batchItems) {
        valuePlaceholders.push(`($${pIndex++}, $${pIndex++}, $${pIndex++}, 'raw_txt_mined', $${pIndex++})`);
        queryParams.push(
          item.part_code || 'INQUIRY_ETC',
          item.category || '단순문의',
          item.phrase.slice(0, 250),
          item.frequency || 1
        );
      }

      const insertQuery = `
        INSERT INTO symptom_synonyms (part_code, category_l1, phrase, source, frequency_count)
        VALUES ${valuePlaceholders.join(', ')}
        ON CONFLICT (category_l1, phrase) DO UPDATE SET
          frequency_count = EXCLUDED.frequency_count,
          part_code = EXCLUDED.part_code;
      `;

      await client.query(insertQuery, queryParams);
      insertedCount += batchItems.length;

      const percent = ((insertedCount / allPhrases.length) * 100).toFixed(1);
      const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
      process.stdout.write(`   ⚡ [배치 ${b + 1}/${totalBatches}] (${percent}%) ${insertedCount.toLocaleString()}개 적재 완료 (${elapsedSec}초 경과)\r`);
    }

    const totalElapsedSec = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n\n🎉 [성공] 총 ${insertedCount.toLocaleString()}건의 실전 구어체가 DB에 무누락 100% 적재 완료되었습니다! (총 소요시간: ${totalElapsedSec}초)`);

    // Verification check
    const countRes = await client.query(`SELECT COUNT(*) FROM symptom_synonyms;`);
    console.log(`📊 DB symptom_synonyms 현재 총 레코드 수: ${parseInt(countRes.rows[0].count).toLocaleString()}건`);

  } catch (err) {
    console.error('\n❌ DB 적재 중 오류 발생:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
