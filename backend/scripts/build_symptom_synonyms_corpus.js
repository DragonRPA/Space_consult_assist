/**
 * Build Ground-Truth Symptom Synonyms Corpus from Real Call Records (Node.js)
 * Extracts raw customer expressions from unique_expressions_frequency.json and unique_technical_frequency.json,
 * maps them to standard part codes, and generates summary + SQL.
 */
const fs = require('fs');
const path = require('path');

const SOURCE_EXPR_PATH = "D:\\스페이스_테스트\\ensemble_master\\unique_expressions_frequency.json";
const SOURCE_TECH_PATH = "D:\\스페이스_테스트\\ensemble_master\\unique_technical_frequency.json";
const SUMMARY_OUTPUT_PATH = path.join(__dirname, "extracted_symptoms_summary.json");
const SQL_OUTPUT_PATH = path.join(__dirname, "seed_symptom_synonyms_ground_truth.sql");

const CATEGORY_RULES = [
  {
    part_code: "SUCTION",
    category_l1: "흡입계통",
    category_l2: "호스막힘/흡입불량",
    patterns: [
      /흡입/i, /흡기/i, /빨아들/i, /진공/i, /잔수/i, /오수/i, /호스.*막힘/i, /스퀴지.*물/i,
      /물.*남아/i, /물.*안.*빨/i, /흡입력/i, /모터.*소음/i, /모터.*타는/i, /물.*안.*당겨/i, /모터.*열/i
    ]
  },
  {
    part_code: "WATER_SOLENOID",
    category_l1: "급수/세제계통",
    category_l2: "솔레노이드/누수/필터막힘",
    patterns: [
      /솔레노이드/i, /급수/i, /물.*안.*나옴/i, /물.*누수/i, /물.*새/i, /물.*떨어짐/i, /물.*고임/i,
      /세제/i, /밸브/i, /청수/i, /필터.*막힘/i, /물.*분사/i, /물.*안.*뿌려/i, /누수/i
    ]
  },
  {
    part_code: "POWER",
    category_l1: "배터리/전원계통",
    category_l2: "배터리방전/충전기불량",
    patterns: [
      /배터리/i, /충전/i, /방전/i, /전원/i, /시동/i, /키스위치/i, /퓨즈/i, /안.*켜/i,
      /꺼짐/i, /전압/i, /충전기/i, /코드/i, /플러그/i, /메인.*전원/i
    ]
  },
  {
    part_code: "DRIVE_BRUSH",
    category_l1: "브러시/구동계통",
    category_l2: "브러시모터/구동불량",
    patterns: [
      /브러시/i, /구동/i, /바퀴/i, /주행/i, /전진/i, /후진/i, /모터.*회전/i, /벨트/i,
      /덜그럭/i, /소음.*발생/i, /회전.*안/i, /헛돌/i, /브러쉬/i, /패드/i
    ]
  },
  {
    part_code: "CHASSIS",
    category_l1: "외관/섀시/바디",
    category_l2: "외관파손",
    patterns: [
      /파손/i, /깨짐/i, /부러짐/i, /손잡이/i, /커버/i, /범퍼/i, /탱크.*깨/i, /바디/i, /섀시/i, /스퀴지.*찢/i
    ]
  }
];

function classifyExpression(phrase) {
  const phraseClean = phrase.trim();
  for (const cat of CATEGORY_RULES) {
    for (const pat of cat.patterns) {
      if (pat.test(phraseClean)) {
        return { part_code: cat.part_code, category_l1: cat.category_l1, category_l2: cat.category_l2 };
      }
    }
  }
  return { part_code: "INQUIRY_ETC", category_l1: "단순문의/기타", category_l2: "기타문의" };
}

function main() {
  console.log("🚀 [Step 1] Loading raw customer observations from ground truth files...");
  const extractedPhrases = new Map();

  function processFile(filePath) {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(raw);
      const items = data.top_symptom_descriptions || [];
      for (const item of items) {
        if (Array.isArray(item) && item.length === 2) {
          const p = String(item[0]).trim();
          const count = Number(item[1]) || 1;
          if (p.length >= 2 && !p.startsWith("{") && !p.startsWith("분류")) {
            extractedPhrases.set(p, (extractedPhrases.get(p) || 0) + count);
          }
        }
      }
    }
  }

  processFile(SOURCE_EXPR_PATH);
  processFile(SOURCE_TECH_PATH);

  console.log(`✅ Extracted ${extractedPhrases.size.toLocaleString()} unique ground-truth symptom expressions!`);

  // Sort by frequency
  const sorted = Array.from(extractedPhrases.entries()).sort((a, b) => b[1] - a[1]);

  const classified = sorted.map(([phrase, count]) => {
    const meta = classifyExpression(phrase);
    return {
      phrase,
      part_code: meta.part_code,
      category_l1: meta.category_l1,
      category_l2: meta.category_l2,
      count
    };
  });

  console.log("\n📊 Top 20 Real Customer Expressions Extracted:");
  classified.slice(0, 20).forEach((r, idx) => {
    console.log(`  ${String(idx + 1).padStart(2, ' ')}. [${r.part_code.padEnd(14, ' ')}] '${r.phrase}' (발생빈도: ${r.count}회)`);
  });

  // Group by category counts
  const categoryStats = {};
  classified.forEach(r => {
    categoryStats[r.part_code] = (categoryStats[r.part_code] || 0) + 1;
  });
  console.log("\n📈 Category Distribution:", categoryStats);

  // Save summary JSON
  fs.writeFileSync(SUMMARY_OUTPUT_PATH, JSON.stringify({
    total_unique_expressions: classified.length,
    category_distribution: categoryStats,
    top_100_expressions: classified.slice(0, 100),
    all_expressions: classified
  }, null, 2), 'utf-8');

  console.log(`\n💾 Summary JSON saved to: ${SUMMARY_OUTPUT_PATH}`);
}

main();
