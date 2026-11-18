import type { KeywordEntity } from './keywordRegistryData';
import type { CustomerInfo } from './store';
import type { ScheduleEventCreate } from './scheduleApi';
import type { OverallSummary, WrapupOutcomeItem } from './consultWrapupTypes';

export function formatSttEngineLabel(engine: string): string {
  if (engine === 'whisper_large_v3') return 'Groq Whisper (whisper-large-v3-turbo)';
  if (engine === 'web_speech') return '웹 음성 STT (Web Speech API)';
  return '네이버 클로바 STT (CLOVA Speech)';
}

export function formatNowKst(now = new Date()): { nowIso: string; kstStr: string } {
  const nowIso = now.toISOString();
  const kstStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  return { nowIso, kstStr };
}

function serializeDetectedKeywords(keywords: KeywordEntity[]) {
  return keywords.map((k) => ({
    id: k.id,
    keyword: k.keyword,
    category: k.category,
  }));
}

export async function insertOpenedSttArchive(params: {
  fileName: string;
  fileSizeBytes: number;
  sttEngine: string;
  sttLabOptions: Record<string, boolean>;
}): Promise<string | null> {
  const { supabase } = await import('./supabaseClient');
  const { nowIso, kstStr } = formatNowKst();
  const { data: insRow, error: insErr } = await supabase
    .from('space_stt_audio_archives')
    .insert([
      {
        file_name: params.fileName,
        file_size_bytes: params.fileSizeBytes || 0,
        audio_duration_sec: 0,
        stt_engine: params.sttEngine,
        stt_engine_label: formatSttEngineLabel(params.sttEngine),
        stt_lab_options: params.sttLabOptions,
        work_datetime: nowIso,
        work_datetime_kst: kstStr,
        stt_text: '',
        stt_paragraphs: [],
        paragraph_count: 0,
        detected_keywords: [],
        status: 'OPENED',
      },
    ])
    .select('id')
    .single();

  if (insErr) {
    throw insErr;
  }
  return insRow?.id ?? null;
}

export async function syncLiveSttArchive(params: {
  curArchiveId: string | null;
  fileName: string;
  fileSizeBytes: number;
  audioDurationSec: number;
  sttEngine: string;
  sttLabOptions: Record<string, boolean>;
  paragraphs: string[];
  detectedKeywords: KeywordEntity[];
  selectedCustomer: CustomerInfo | null;
}): Promise<string | null> {
  const { supabase } = await import('./supabaseClient');
  const rawMod = params.selectedCustomer?.assetModel || '';
  const modMatch = rawMod.match(/\b(J600T?|J800|S12L?|S7P?|S5|S3|S2|S1|R3|XD80|XD60|S800|M100|Q45)\b/i);
  const eqMod = modMatch ? modMatch[1].toUpperCase() : rawMod;
  const { nowIso, kstStr } = formatNowKst();

  const payload: Record<string, unknown> = {
    file_name: params.fileName || '실시간 마이크 수음',
    file_size_bytes: params.fileSizeBytes || 0,
    audio_duration_sec: Number((params.audioDurationSec || 0).toFixed(2)),
    stt_engine: params.sttEngine,
    stt_engine_label: formatSttEngineLabel(params.sttEngine),
    stt_lab_options: params.sttLabOptions,
    work_datetime: nowIso,
    work_datetime_kst: kstStr,
    stt_completed_at: nowIso,
    stt_text: params.paragraphs.join('\n'),
    stt_paragraphs: params.paragraphs,
    paragraph_count: params.paragraphs.length,
    detected_keywords: serializeDetectedKeywords(params.detectedKeywords),
    customer_name: params.selectedCustomer?.name || '',
    manager_name: params.selectedCustomer?.manager || '',
    phone: params.selectedCustomer?.phone || '',
    address: `${params.selectedCustomer?.address || ''} ${params.selectedCustomer?.addressDetail || ''}`.trim(),
    equipment_model: eqMod || '',
    updated_at: nowIso,
  };

  if (params.curArchiveId) {
    await supabase
      .from('space_stt_audio_archives')
      .update({ ...payload, status: 'STT_COMPLETED' })
      .eq('id', params.curArchiveId)
      .in('status', ['OPENED', 'STT_PROCESSING', 'STT_COMPLETED']);
    await supabase
      .from('space_stt_audio_archives')
      .update(payload)
      .eq('id', params.curArchiveId)
      .in('status', ['AI_ANALYZED', 'CONFIRMED']);
    return null;
  }

  const { data: insRow } = await supabase
    .from('space_stt_audio_archives')
    .insert([{ ...payload, status: 'STT_COMPLETED' }])
    .select('id')
    .single();
  return insRow?.id ?? null;
}

export async function upsertAnalyzedSttArchive(params: {
  archiveId?: string | null;
  fileName?: string;
  fileSizeBytes?: number;
  audioDurationSec?: number;
  sttEngine?: string;
  sttLabOptions?: Record<string, boolean>;
  sttParagraphs?: string[];
  transcriptText: string;
  detectedKeywords: KeywordEntity[];
  customerDraft: {
    companyName: string;
    managerName: string;
    phone: string;
    address: string;
    equipmentModel: string;
  };
  overallSummary: OverallSummary;
  mappedOutcomes: WrapupOutcomeItem[];
  providerStr: string;
  modelStr: string;
}): Promise<string | null> {
  const { supabase } = await import('./supabaseClient');
  const paras =
    Array.isArray(params.sttParagraphs) && params.sttParagraphs.length > 0
      ? params.sttParagraphs
      : (params.transcriptText || '').split('\n').filter(Boolean);
  const engKey = params.sttEngine || 'whisper_large_v3';
  const { nowIso, kstStr } = formatNowKst();

  const archivePayload = {
    file_name: params.fileName || '실시간 마이크 수음',
    file_size_bytes: params.fileSizeBytes || 0,
    audio_duration_sec: Number((params.audioDurationSec || 0).toFixed(2)),
    stt_engine: engKey,
    stt_engine_label: formatSttEngineLabel(engKey),
    stt_lab_options: params.sttLabOptions || {},
    work_datetime: nowIso,
    work_datetime_kst: kstStr,
    ai_analyzed_at: nowIso,
    stt_text: params.transcriptText || '',
    stt_paragraphs: paras,
    paragraph_count: paras.length,
    detected_keywords: serializeDetectedKeywords(params.detectedKeywords),
    customer_name: params.customerDraft.companyName,
    manager_name: params.customerDraft.managerName,
    phone: params.customerDraft.phone,
    address: params.customerDraft.address,
    equipment_model: params.customerDraft.equipmentModel,
    ai_summary_issue: params.overallSummary.issue,
    ai_summary_guidance: params.overallSummary.guidance,
    ai_summary_conclusion: params.overallSummary.conclusion,
    ai_outcomes: params.mappedOutcomes,
    ai_provider: `${params.providerStr}:${params.modelStr}`,
    status: 'AI_ANALYZED',
    updated_at: nowIso,
  };

  if (params.archiveId) {
    await supabase.from('space_stt_audio_archives').update(archivePayload).eq('id', params.archiveId);
    return null;
  }

  const { data: insertedRow } = await supabase
    .from('space_stt_audio_archives')
    .insert([archivePayload])
    .select('id')
    .single();
  return insertedRow?.id ?? null;
}

export async function confirmAndSaveConsultWrapup(params: {
  checkedOutcomes: WrapupOutcomeItem[];
  detectedKeywords: KeywordEntity[];
  customerDraft: {
    companyName: string;
    managerName: string;
    phone: string;
    address: string;
    equipmentModel: string;
    serialNumber: string;
  };
  overallSummary: OverallSummary;
  transcriptText: string;
  providerInfo: { provider: string; model: string; elapsedMs: number };
  archiveId?: string | null;
  audioFileName?: string;
  audioFileSize?: number;
  audioDurationSec?: number;
  sttEngine?: string;
  sttLabOptions?: Record<string, boolean>;
  sttParagraphs?: string[];
}): Promise<{
  consultId: string | undefined;
  newArchiveId: string | null;
  savedScheduleCount: number;
  savedVisitCount: number;
  savedSalesCount: number;
}> {
  const { supabase } = await import('./supabaseClient');
  const { createEvent } = await import('./scheduleApi');

  const {
    checkedOutcomes,
    detectedKeywords,
    customerDraft,
    overallSummary,
    transcriptText,
    providerInfo,
  } = params;

  let savedScheduleCount = 0;
  let savedVisitCount = 0;
  let savedSalesCount = 0;

  const hasAsVisit = checkedOutcomes.some((o) => o.outcomeType === 'AS_SCHEDULE');
  const primaryKeyword =
    checkedOutcomes[0]?.fields?.symptomCategory ||
    detectedKeywords[0]?.keyword ||
    checkedOutcomes.map((o) => o.outcomeType).join(',');

  // 1. 상담 마스터 이력 저장 (public.consult_logs)
  const { data: consultRow, error: consultErr } = await supabase
    .from('space_consult_logs')
    .insert([
      {
        customer_name: customerDraft.companyName,
        manager: `${customerDraft.managerName} ${customerDraft.phone}`.trim(),
        serial_number: customerDraft.serialNumber || '',
        model_name: customerDraft.equipmentModel || 'J600T',
        keyword: primaryKeyword,
        symptom: `[문의/증상] ${overallSummary.issue}\n[통화녹취] ${(transcriptText || '').slice(0, 1500)}`,
        action: `[진단/안내] ${overallSummary.guidance}\n[합의결론] ${overallSummary.conclusion}`,
        is_completed: !hasAsVisit,
        is_visit_required: hasAsVisit,
      },
    ])
    .select('id')
    .single();

  if (consultErr) {
    throw new Error(`상담 이력(consult_logs) 저장 실패: ${consultErr.message}`);
  }
  const consultId: string | undefined = consultRow?.id;

  // 2. AI 요약 감사 로그 저장 (public.llm_logs)
  await supabase.from('space_llm_logs').insert([
    {
      consult_id: consultId || null,
      model_name: `${providerInfo.provider}:${providerInfo.model}`,
      prompt_hash: `wrapup-${Date.now()}`,
      prompt_text: (transcriptText || '상담 요약 요청').slice(0, 2000),
      response_text: JSON.stringify({ overallSummary, outcomes: checkedOutcomes }),
      latency_ms: providerInfo.elapsedMs || 0,
      is_error: false,
      cache_hit: false,
      client_type: 'desktop_web',
    },
  ]);

  // 3. 결론 유형별 후속 테이블 저장 (schedule_events, visits, sales_inquiries)
  for (const item of checkedOutcomes) {
    if (item.outcomeType === 'TECH_COUNSEL') {
      continue;
    }

    const startIso = item.fields.requestedDateIso
      ? new Date(item.fields.requestedDateIso).toISOString()
      : new Date().toISOString();

    const extraData: Record<string, unknown> = {
      consultSummaryIssue: overallSummary.issue,
      consultSummaryGuidance: overallSummary.guidance,
      consultSummaryConclusion: overallSummary.conclusion,
      outcomeType: item.outcomeType,
      memo: item.fields.actionMemo || item.title,
    };

    if (item.outcomeType === 'AS_SCHEDULE') {
      extraData.symptomChips = [item.fields.symptomCategory || '기타'];
      extraData.symptomDetail = item.fields.symptomDetail || item.fields.actionMemo || '';
      extraData.repairType = '점검';
      extraData.nextVisitParts = item.fields.nextVisitParts || '';
      extraData.isReschedule = Boolean(item.fields.isReschedule);
    } else if (item.outcomeType === 'DEMO_REQUEST') {
      extraData.industry = item.fields.industry || '';
      extraData.floorSpec = item.fields.floorSpec || '';
      extraData.contaminant = item.fields.contaminant || '';
      extraData.memoReceive = item.fields.actionMemo || '';
    } else if (item.outcomeType === 'DELIVERY_ADJUST') {
      extraData.shipMethod = item.fields.shipMethod || '직배송';
      extraData.deliveryDate = (item.fields.requestedDateIso || '').slice(0, 10);
      extraData.memo = `[납품일정 조정] ${item.fields.actionMemo || ''}`;
    } else if (item.outcomeType === 'SALES_QUOTE') {
      extraData.quoteType = '견적서';
      extraData.memoReceive = `[${item.fields.quoteType}] ${(item.fields.requestedItems || [])
        .map((r) => `${r.name} x${r.qty}`)
        .join(', ')} / ${item.fields.actionMemo || ''}`;
    }

    const payload: ScheduleEventCreate = {
      category: item.scheduleCategory,
      worktype: item.worktype,
      use_company: customerDraft.companyName,
      contract_company: customerDraft.companyName,
      location: customerDraft.address,
      site_managers: [
        [customerDraft.managerName, customerDraft.phone].filter(Boolean).join(' '),
      ].filter(Boolean),
      receive_staff: '상담실 AI접수',
      receive_date: new Date().toISOString().slice(0, 10),
      process_staff: item.fields.assignedEngineer
        ? [item.fields.assignedEngineer.split(' ')[0]]
        : ['김철수'],
      display_order: 0,
      call_done: true,
      is_allday: false,
      is_done: false,
      is_important: item.outcomeType === 'AS_SCHEDULE' || item.outcomeType === 'DELIVERY_ADJUST',
      start_at: startIso,
      title: item.title,
      equipment_rows: [
        {
          name: customerDraft.equipmentModel || 'J600T',
          serial: customerDraft.serialNumber || '',
        },
      ],
      extra: extraData,
      attachments: [],
      consult_id: consultId,
    };

    const createdEvent = await createEvent(payload);
    savedScheduleCount += 1;

    // 3-A. AS 방문일정/출장접수인 경우 public.visits 배차 대장에도 동시 기록
    if (item.outcomeType === 'AS_SCHEDULE') {
      const { data: visitRow, error: visitErr } = await supabase
        .from('space_visits')
        .insert([
          {
            customer_name: customerDraft.companyName,
            manager: customerDraft.managerName,
            phone: customerDraft.phone,
            address: customerDraft.address,
            consult_id: consultId || null,
            schedule_event_id: createdEvent?.id || null,
            request_note: `${item.title} / 증상: ${item.fields.symptomCategory || ''} / 지참부품: ${item.fields.nextVisitParts || ''}`,
            status: item.fields.isReschedule ? '일정변경' : '배차접수',
            note: item.fields.actionMemo || '',
            process_staff: item.fields.assignedEngineer
              ? [item.fields.assignedEngineer.split(' ')[0]]
              : ['김철수'],
            site_managers: [customerDraft.managerName].filter(Boolean),
            call_done: true,
          },
        ])
        .select('id')
        .single();

      if (!visitErr && visitRow?.id && consultId) {
        savedVisitCount += 1;
        await supabase
          .from('space_consult_logs')
          .update({ visit_id: visitRow.id })
          .eq('id', consultId);
      }
    }

    // 3-B. 영업문의(구매/견적) 또는 데모시연인 경우 public.sales_inquiries 영업 대장에도 동시 기록
    if (item.outcomeType === 'SALES_QUOTE' || item.outcomeType === 'DEMO_REQUEST') {
      const itemsStr = (item.fields.requestedItems || [])
        .map((r) => `${r.name}(${r.qty})`)
        .join(', ');
      const { error: salesErr } = await supabase.from('space_sales_inquiries').insert([
        {
          inquiry_type:
            item.outcomeType === 'DEMO_REQUEST'
              ? '데모시연 요청'
              : item.fields.quoteType || '부품·소모품 견적',
          customer_name: customerDraft.companyName,
          manager: customerDraft.managerName,
          manager_phone: customerDraft.phone,
          request_note: `${item.title} / 요청품목: ${itemsStr || customerDraft.equipmentModel} / 메모: ${item.fields.actionMemo || ''}`,
          is_completed: false,
          client_type: 'desktop_web',
        },
      ]);
      if (!salesErr) {
        savedSalesCount += 1;
      }
    }
  }

  // 4. 음성파일 + 추출텍스트 + AI 결론 세트 최종 확정 저장 (public.stt_audio_archives)
  const paras =
    Array.isArray(params.sttParagraphs) && params.sttParagraphs.length > 0
      ? params.sttParagraphs
      : (transcriptText || '').split('\n').filter(Boolean);
  const engKey = params.sttEngine || 'whisper_large_v3';
  const { nowIso, kstStr } = formatNowKst();

  const confirmedArchivePayload = {
    file_name: params.audioFileName || '실시간 마이크 수음',
    file_size_bytes: params.audioFileSize || 0,
    audio_duration_sec: Number((params.audioDurationSec || 0).toFixed(2)),
    stt_engine: engKey,
    stt_engine_label: formatSttEngineLabel(engKey),
    stt_lab_options: params.sttLabOptions || {},
    work_datetime: nowIso,
    work_datetime_kst: kstStr,
    ai_analyzed_at: nowIso,
    stt_text: transcriptText || '',
    stt_paragraphs: paras,
    paragraph_count: paras.length,
    detected_keywords: serializeDetectedKeywords(detectedKeywords),
    customer_name: customerDraft.companyName,
    manager_name: customerDraft.managerName,
    phone: customerDraft.phone,
    address: customerDraft.address,
    equipment_model: customerDraft.equipmentModel,
    ai_summary_issue: overallSummary.issue,
    ai_summary_guidance: overallSummary.guidance,
    ai_summary_conclusion: overallSummary.conclusion,
    ai_outcomes: checkedOutcomes,
    ai_provider: `${providerInfo.provider}:${providerInfo.model}`,
    consult_id: consultId || null,
    status: 'CONFIRMED',
    updated_at: nowIso,
  };

  let newArchiveId: string | null = null;
  if (params.archiveId) {
    const { error: archUpdErr } = await supabase
      .from('space_stt_audio_archives')
      .update(confirmedArchivePayload)
      .eq('id', params.archiveId);
    if (archUpdErr) {
      throw new Error(`파일·STT·AI 세트(stt_audio_archives) 확정 저장 실패: ${archUpdErr.message}`);
    }
  } else {
    const { data: archInsRow, error: archInsErr } = await supabase
      .from('space_stt_audio_archives')
      .insert([confirmedArchivePayload])
      .select('id')
      .single();
    if (archInsErr) {
      throw new Error(`파일·STT·AI 세트(stt_audio_archives) 신규 저장 실패: ${archInsErr.message}`);
    }
    if (archInsRow?.id) {
      newArchiveId = archInsRow.id;
    }
  }

  return {
    consultId,
    newArchiveId,
    savedScheduleCount,
    savedVisitCount,
    savedSalesCount,
  };
}
