/**
 * Vercel Serverless Function: /api/consult-wrapup
 * - 통화 종료 후 대화 전문(STT) + 감지된 복합/단일 키워드 + 고객/장비 슬롯 + 체크리스트 상태를 종합하여
 *   1-Click으로 다중 결론(기술상담, 영업문의/견적, 데모시연, 납품일정 조정, AS 방문일정 조정)을 구조화 JSON으로 생성합니다.
 * - 1순위 엔진: Groq Cloud API (`llama-3.3-70b-versatile` -> 한도 초과 시 `llama-3.1-8b-instant`)
 * - 2순위 엔진: OpenAI API (`gpt-4o-mini`)
 * - 3순위 엔진: 결정론적 도메인 규칙 기반 분석기 (API 키 미설정 또는 네트워크 장애 시 무중단 폴백)
 * - 보안 원칙: GROQ_API_KEY / OPENAI_API_KEY는 오직 서버 환경변수에서만 읽으며 클라이언트에 절대 노출하지 않습니다.
 */

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

const SYSTEM_PROMPT = `당신은 산업용 청소장비(습식 스크러버, 건식 청소차: J600T, J800, J900, S5, S7, S12, W12, R3, XD80, 스마트타워 등) 렌탈·판매·AS 전문 기업 '스페이스(SPACE)'의 수석 상담 결론 정리 AI입니다.

상담원과 고객의 통화 녹취록 및 실시간 감지 메타데이터를 분석하여, 통화에서 도출된 **모든 결론(단일 또는 복합 결론)**을 빠짐없이 분류하고 즉시 DB 및 문서에 반영할 수 있는 구조화 JSON으로만 응답하세요.

[5대 결론 카테고리 코드 (outcomeType)]
1. "TECH_COUNSEL": 기술상담 (증상별 원격 진단, 자가조치 안내 완료, 경과 관찰 등)
2. "SALES_QUOTE": 영업문의 (신규 장비 구매문의, 렌탈 단가 문의, 소모품/부품 견적서 요청)
3. "DEMO_REQUEST": 데모시연 (현장 시연 요청, 사전 답사 요청)
4. "DELIVERY_ADJUST": 납품일정 조정 (예정된 장비/렌탈/부품 출고·납품 일시 변경, 배송방식 변경)
5. "AS_SCHEDULE": AS 방문일정 조정 및 출장접수 (신규 AS 방문수리 접수, 기존 예약된 AS/정기점검 방문일시 변경)

[필수 출력 JSON 스키마]
{
  "overallSummary": {
    "issue": "고객 문의 및 핵심 증상/요청 요약 (건조한 명사형 1줄)",
    "guidance": "상담원 안내 및 점검/협의 내용 요약 (건조한 명사형 1줄)",
    "conclusion": "최종 합의된 결론 및 후속 조치 요약 (건조한 명사형 1줄)"
  },
  "extractedCustomer": {
    "companyName": "대화 또는 메타데이터에서 확인된 고객사/현장명",
    "managerName": "담당자명/통화자명",
    "phone": "연락처 (010-XXXX-XXXX 등)",
    "address": "현장 주소 및 상세 위치",
    "equipmentModel": "장비 모델명 (예: J600T)",
    "serialNumber": "시리얼 번호 (확인된 경우)"
  },
  "outcomes": [
    {
      "outcomeType": "TECH_COUNSEL | SALES_QUOTE | DEMO_REQUEST | DELIVERY_ADJUST | AS_SCHEDULE",
      "title": "결론 카드 제목 (예: [기술상담] J600T 배터리 케이블 단자 자가조치 완료)",
      "confidence": 0.95,
      "scheduleCategory": "as-service | sales-demo | equip-ship | part-ship | rental-ship | maintenance | other",
      "worktype": "현장수리 | 긴급수리 | 재방문 | 시연 | 상담답사 | 출고예정 | 부품예정 | 렌탈예정 | 정기점검 | 기타",
      "fields": {
        "symptomCategory": "증상 분류명 (기술상담/AS 시, 예: 배터리 케이블·단자 접촉 불량)",
        "symptomDetail": "증상 및 원인 상세 기록",
        "resolutionStatus": "자가조치완료 | 경과관찰 | 출장전환 | 견적전환",
        "checkedStepsSummary": "수행 완료된 점검 단계 요약",
        "quoteType": "부품·소모품 견적 | 신규 렌탈 견적 | 장비 구매 견적",
        "requestedItems": [
          { "name": "품목 또는 모델명 (예: 스퀴지 고무, 배터리 케이블, J600T)", "qty": 1, "note": "규격/특이사항" }
        ],
        "quoteDeliveryMethod": "견적서 발송(팩스/이메일/문자) | 구두 안내",
        "industry": "현장 업종 (데모시연 시, 예: 아파트 지하주차장, 물류센터, 공장)",
        "floorSpec": "바닥 면적 및 재질 (예: 에폭시 1,500평)",
        "contaminant": "주된 오염물질 (예: 타이어 분진, 오일, 시멘트 가루)",
        "recommendedModel": "시연/도입 추천 모델명",
        "isReschedule": false,
        "originalDateText": "기존 예정 일시 (일정 조정인 경우)",
        "requestedDateIso": "YYYY-MM-DDTHH:mm (요청/합의된 방문·시연·납품 일시, 기준 시각 대비 계산)",
        "requestedDateLabel": "화면에 표시할 일시 텍스트 (예: 2026-10-20 14:00)",
        "assignedEngineer": "관할 담당자/정비기사 (예: 김철수 정비기사)",
        "shipMethod": "직배송 | 화물 | 택배 | 내방",
        "nextVisitParts": "기사 지참 필요 부품 (예: 배터리 케이블, 솔레노이드 밸브)",
        "actionMemo": "일정 캘린더 및 담당자에게 전달할 핵심 특이사항 메모"
      }
    }
  ]
}

[작성 원칙]
- 감성적 수식어를 배제하고 건조한 명사·동사 위주로 명확히 작성하세요.
- 한 통화에서 기술상담과 부품견적, 또는 AS방문일정 조정 등 여러 결론이 함께 논의되었다면 outcomes 배열에 각각의 결론 객체를 모두 포함하세요.
- 반드시 유효한 순수 JSON 객체만 출력하세요.`;

function resolveRelativeDateIso(text, baseDateStr) {
  const base = baseDateStr ? new Date(baseDateStr) : new Date();
  const target = new Date(base.getTime());
  let dayOffset = 1;

  if (/오늘|금일|당일/.test(text)) dayOffset = 0;
  else if (/내일|명일/.test(text)) dayOffset = 1;
  else if (/모레/.test(text)) dayOffset = 2;
  else if (/다음\s*주|차주/.test(text)) dayOffset = 5;

  target.setDate(target.getDate() + dayOffset);

  let hour = 14;
  let minute = 0;
  const timeMatch = text.match(/(오전|오후)?\s*(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분)?/);
  if (timeMatch) {
    const ampm = timeMatch[1] || '';
    let h = parseInt(timeMatch[2], 10);
    const m = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
    if (ampm === '오후' && h < 12) h += 12;
    else if (!ampm && h >= 1 && h <= 6) h += 12;
    hour = Math.min(23, Math.max(0, h));
    minute = Math.min(59, Math.max(0, m));
  }

  const yyyy = target.getFullYear();
  const mm = String(target.getMonth() + 1).padStart(2, '0');
  const dd = String(target.getDate()).padStart(2, '0');
  const hh = String(hour).padStart(2, '0');
  const min = String(minute).padStart(2, '0');
  return {
    iso: `${yyyy}-${mm}-${dd}T${hh}:${min}`,
    label: `${yyyy}-${mm}-${dd} ${hh}:${min}`,
  };
}

function buildRuleBasedWrapup(payload) {
  const {
    transcript = '',
    customer = {},
    detectedKeywords = [],
    checklist = [],
    assignedEngineer = '김철수 정비기사 (화성/경기남부)',
    dispatchDate = '',
    currentTimeIso = new Date().toISOString(),
  } = payload || {};

  const cleanTranscript = String(transcript || '').trim();
  const companyName = customer?.name || '미확인 고객사';
  const managerName = customer?.manager || '현장 담당자';
  const phone = customer?.phone || '';
  const address = [customer?.address, customer?.addressDetail].filter(Boolean).join(' ') || '';
  const equipmentModel = customer?.assetModel || 'J600T';
  const serialNumber = customer?.serialNumber || '';

  const kwList = Array.isArray(detectedKeywords) ? detectedKeywords : [];
  const primarySymptom = kwList[0]?.keyword || '장비 기본 점검';
  const checkedItems = (Array.isArray(checklist) ? checklist : []).filter((c) => c.checked);
  const checkedSummary =
    checkedItems.length > 0
      ? checkedItems.map((c) => `${c.id}단계(${c.text})`).join(', ')
      : '자가점검 가이드 안내';

  const dateInfo = resolveRelativeDateIso(cleanTranscript || dispatchDate, currentTimeIso);
  const outcomes = [];

  const hasQuoteIntent = /견적|구매|구입|발주|소모품|부품\s*주문|단가|렌탈\s*문의|임대\s*문의|추가\s*도입/.test(cleanTranscript);
  const hasDemoIntent = /시연|데모|답사|테스트\s*방문|써보고|시운전/.test(cleanTranscript);
  const hasDeliveryAdjustIntent = /납품\s*일정|출고\s*일정|배송\s*일정|납품일|도착일|화물|직배송|택배.*언제|납품.*변경|납품.*미뤄|납품.*연기/.test(cleanTranscript);
  const hasAsScheduleIntent = /방문|출장|기사님|수리\s*접수|일정\s*조정|일정\s*변경|시간\s*변경|오실\s*때|다녀가|점검\s*일정/.test(cleanTranscript);
  const isReschedule = /조정|변경|미뤄|연기|바꿔|바꾸|늦춰|앞당겨/.test(cleanTranscript);
  const isSelfResolved = /해결|정상|잘\s*되네요|작동\s*되네요|작동합니다|고마워요|감사합니다/.test(cleanTranscript) && !hasAsScheduleIntent;

  // 1. 기술상담 (증상 키워드가 감지되었거나 기본 진단 대화가 있는 경우)
  if (kwList.length > 0 || (!hasQuoteIntent && !hasDemoIntent && !hasDeliveryAdjustIntent)) {
    const symptomNames = kwList.map((k) => k.keyword).join(', ') || primarySymptom;
    outcomes.push({
      outcomeType: 'TECH_COUNSEL',
      title: `[기술상담] ${equipmentModel} ${symptomNames} ${isSelfResolved ? '자가조치 완료' : '원격 기술안내'}`,
      confidence: 0.92,
      scheduleCategory: 'other',
      worktype: '기타',
      fields: {
        symptomCategory: symptomNames,
        symptomDetail: `${equipmentModel} ${symptomNames} 관련 유선 원인 진단 및 현장 점검 안내`,
        resolutionStatus: isSelfResolved ? '자가조치완료' : hasAsScheduleIntent ? '출장전환' : '경과관찰',
        checkedStepsSummary: checkedSummary,
        actionMemo: `[기술상담] ${symptomNames} / 점검확인: ${checkedSummary}`,
      },
    });
  }

  // 2. 영업문의 (구매/견적요청)
  if (hasQuoteIntent) {
    const isEquipQuote = /장비\s*구매|신규\s*렌탈|추가\s*렌탈|임대\s*견적|대수/.test(cleanTranscript);
    const items = kwList.length > 0
      ? kwList.map((k) => ({ name: k.keyword.split('/')[0].trim(), qty: 1, note: `${equipmentModel} 호환 부품` }))
      : [{ name: isEquipQuote ? `${equipmentModel} 장비` : `${equipmentModel} 소모품 세트`, qty: 1, note: '통화 요청 품목' }];

    outcomes.push({
      outcomeType: 'SALES_QUOTE',
      title: `[영업/견적] ${companyName} ${isEquipQuote ? '장비 구매·렌탈 견적 요청' : '부품·소모품 견적서 발송'}`,
      confidence: 0.9,
      scheduleCategory: isEquipQuote ? 'sales-demo' : 'part-ship',
      worktype: isEquipQuote ? '상담답사' : '부품예정',
      fields: {
        quoteType: isEquipQuote ? '신규 렌탈/구매 견적' : '부품·소모품 견적',
        requestedItems: items,
        quoteDeliveryMethod: '견적서 발송(이메일/문자)',
        requestedDateIso: dateInfo.iso,
        requestedDateLabel: dateInfo.label,
        actionMemo: `${companyName} (${managerName}) ${items.map((i) => i.name).join(', ')} 견적서 발송 요청`,
      },
    });
  }

  // 3. 데모시연
  if (hasDemoIntent) {
    outcomes.push({
      outcomeType: 'DEMO_REQUEST',
      title: `[데모시연] ${companyName} ${equipmentModel} 현장 시연 접수`,
      confidence: 0.91,
      scheduleCategory: 'sales-demo',
      worktype: '시연',
      fields: {
        industry: '빌딩/아파트 관리현장',
        floorSpec: '현장 바닥 재질·면적 확인 필요',
        contaminant: '일반 분진 및 오염수',
        recommendedModel: equipmentModel,
        requestedDateIso: dateInfo.iso,
        requestedDateLabel: dateInfo.label,
        actionMemo: `${companyName} 현장 시연 요청 (${dateInfo.label})`,
      },
    });
  }

  // 4. 납품일정 조정
  if (hasDeliveryAdjustIntent) {
    outcomes.push({
      outcomeType: 'DELIVERY_ADJUST',
      title: `[납품일정 조정] ${companyName} ${equipmentModel} 출고·납품 일시 조정`,
      confidence: 0.9,
      scheduleCategory: 'equip-ship',
      worktype: '출고예정',
      fields: {
        isReschedule: true,
        originalDateText: '기존 예정일',
        requestedDateIso: dateInfo.iso,
        requestedDateLabel: dateInfo.label,
        shipMethod: /택배/.test(cleanTranscript) ? '택배' : /화물/.test(cleanTranscript) ? '화물' : '직배송',
        actionMemo: `고객 요청에 따른 납품일정 조정 ➔ ${dateInfo.label}`,
      },
    });
  }

  // 5. AS 방문일정 조정 / 현장출장 접수
  if (hasAsScheduleIntent) {
    const symptomNames = kwList.map((k) => k.keyword).join(', ') || primarySymptom;
    outcomes.push({
      outcomeType: 'AS_SCHEDULE',
      title: `[AS ${isReschedule ? '방문일정 조정' : '방문접수'}] ${companyName} ${equipmentModel} (${dateInfo.label})`,
      confidence: 0.93,
      scheduleCategory: 'as-service',
      worktype: isReschedule ? '재방문' : '현장수리',
      fields: {
        symptomCategory: symptomNames,
        symptomDetail: `${equipmentModel} ${symptomNames} 현장 점검 및 수리 요청`,
        isReschedule,
        originalDateText: isReschedule ? '기존 예약 일정' : '신규 접수',
        requestedDateIso: dateInfo.iso,
        requestedDateLabel: dateInfo.label,
        assignedEngineer,
        nextVisitParts: symptomNames,
        actionMemo: `${isReschedule ? '[AS 방문일정 변경]' : '[신규 AS 출장]'} ${symptomNames} / 담당: ${assignedEngineer}`,
      },
    });
  }

  return {
    overallSummary: {
      issue: `${companyName} (${equipmentModel}) ${kwList.map((k) => k.keyword).join(', ') || '장비 상담 및 일정/견적 문의'}`,
      guidance: checkedSummary,
      conclusion: outcomes.map((o) => o.title).join(' + '),
    },
    extractedCustomer: {
      companyName,
      managerName,
      phone,
      address,
      equipmentModel,
      serialNumber,
    },
    outcomes,
  };
}

async function callGroqChatCompletion(apiKey, model, userPromptText, maxTokens = 1600) {
  const resp = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPromptText },
      ],
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`Groq API HTTP ${resp.status}: ${errText.slice(0, 240)}`);
  }

  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content || '{}';
  return JSON.parse(content);
}

async function callOpenAIChatCompletion(apiKey, model, userPromptText) {
  const resp = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model || 'gpt-4o-mini',
      temperature: 0.1,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPromptText },
      ],
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`OpenAI API HTTP ${resp.status}: ${errText.slice(0, 240)}`);
  }

  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content || '{}';
  return JSON.parse(content);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const startMs = Date.now();
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const {
      transcript = '',
      customer = {},
      detectedKeywords = [],
      checklist = [],
      assignedEngineer = '김철수 정비기사 (화성/경기남부)',
      dispatchDate = '',
      currentTimeIso = new Date().toISOString(),
    } = body;

    const groqApiKey = (process.env.GROQ_API_KEY || '').trim();
    const groqModel = (process.env.GROQ_LLM_MODEL || 'openai/gpt-oss-120b').trim();
    const openaiApiKey = (process.env.OPENAI_API_KEY || '').trim();

    const userPromptText = JSON.stringify(
      {
        referenceTimeIso: currentTimeIso,
        customerContext: customer,
        detectedDomainKeywords: detectedKeywords,
        completedChecklistSteps: checklist,
        defaultAssignedEngineer: assignedEngineer,
        defaultDispatchDate: dispatchDate,
        callTranscript: transcript,
      },
      null,
      2
    );

    // 1순위: Groq Cloud API (openai/gpt-oss-120b -> openai/gpt-oss-20b -> qwen/qwen3.8-27b 폴백)
    if (groqApiKey) {
      const candidateModels = [
        { name: groqModel, maxTokens: 1600 },
        { name: 'openai/gpt-oss-20b', maxTokens: 1600 },
        { name: 'qwen/qwen3.8-27b', maxTokens: 850 },
      ];
      for (const cand of candidateModels) {
        try {
          const parsed = await callGroqChatCompletion(groqApiKey, cand.name, userPromptText, cand.maxTokens);
          return res.status(200).json({
            status: 'ok',
            provider: 'groq_cloud',
            model: cand.name,
            elapsedMs: Date.now() - startMs,
            data: parsed,
          });
        } catch (groqErr) {
          console.warn(`[consult-wrapup] Groq model ${cand.name} failed:`, groqErr.message);
        }
      }
    }

    // 2순위: OpenAI API (보안 환경변수에 설정된 경우)
    if (openaiApiKey) {
      try {
        const parsedOpenAI = await callOpenAIChatCompletion(openaiApiKey, 'gpt-4o-mini', userPromptText);
        return res.status(200).json({
          status: 'ok',
          provider: 'openai_fallback',
          model: 'gpt-4o-mini',
          elapsedMs: Date.now() - startMs,
          data: parsedOpenAI,
        });
      } catch (openAiErr) {
        console.warn('[consult-wrapup] OpenAI fallback triggered:', openAiErr.message);
      }
    }

    // 3순위: 결정론적 도메인 규칙 엔진 (GROQ_API_KEY 등록 전에도 100% 무중단 작동)
    const ruleData = buildRuleBasedWrapup(body);
    return res.status(200).json({
      status: 'ok',
      provider: groqApiKey ? 'rule_fallback' : 'groq_key_pending_rule_engine',
      model: groqApiKey ? 'domain-rule-v1' : 'domain-rule-v1 (GROQ_API_KEY 등록 시 llama-3.3-70b 즉시 전환)',
      elapsedMs: Date.now() - startMs,
      data: ruleData,
    });
  } catch (err) {
    console.error('[consult-wrapup] Error:', err);
    return res.status(500).json({
      status: 'error',
      error: String(err?.message || err),
    });
  }
}
