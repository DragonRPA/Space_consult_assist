import React, { useEffect, useState, useCallback } from 'react';
import {
  X,
  CheckSquare,
  Square,
  RotateCcw,
  CheckCircle2,
  FileText,
  Package,
  Plus,
  Trash2,
} from 'lucide-react';
import { supabase, createEvent, type Category, type ScheduleEventCreate } from './scheduleApi';
import type { CustomerInfo } from './store';
import type { KeywordEntity } from './keywordAssist';

export type OutcomeType =
  | 'TECH_COUNSEL'
  | 'SALES_QUOTE'
  | 'DEMO_REQUEST'
  | 'DELIVERY_ADJUST'
  | 'AS_SCHEDULE';

export interface RequestedItem {
  name: string;
  qty: number;
  note?: string;
}

export interface WrapupOutcomeFields {
  symptomCategory?: string;
  symptomDetail?: string;
  resolutionStatus?: string;
  checkedStepsSummary?: string;
  quoteType?: string;
  requestedItems?: RequestedItem[];
  quoteDeliveryMethod?: string;
  industry?: string;
  floorSpec?: string;
  contaminant?: string;
  recommendedModel?: string;
  isReschedule?: boolean;
  originalDateText?: string;
  requestedDateIso?: string;
  requestedDateLabel?: string;
  assignedEngineer?: string;
  shipMethod?: string;
  nextVisitParts?: string;
  actionMemo?: string;
}

export interface WrapupOutcomeItem {
  id: string;
  checked: boolean;
  outcomeType: OutcomeType;
  title: string;
  confidence: number;
  scheduleCategory: Category;
  worktype: string;
  fields: WrapupOutcomeFields;
}

export interface OverallSummary {
  issue: string;
  guidance: string;
  conclusion: string;
}

interface ConsultWrapupModalProps {
  isOpen: boolean;
  onClose: () => void;
  transcriptText: string;
  selectedCustomer: CustomerInfo | null;
  equipmentModel: string;
  detectedKeywords: KeywordEntity[];
  checklist: { id: number; text: string; checked: boolean }[];
  assignedEngineer: string;
  dispatchDate: string;
  archiveId?: string | null;
  audioFileName?: string;
  audioFileSize?: number;
  audioDurationSec?: number;
  sttEngine?: string;
  sttLabOptions?: Record<string, boolean>;
  sttParagraphs?: string[];
  onArchiveIdChange?: (id: string) => void;
  onOpenPartsQuote: () => void;
  onOpenDispatchDoc: () => void;
  onCompleteWrapup: (summaryNote: string) => void;
  onToast: (msg: string) => void;
}

const OUTCOME_META: Record<
  OutcomeType,
  {
    label: string;
    badgeBg: string;
    badgeColor: string;
    borderColor: string;
    defaultCategory: Category;
    defaultWorktype: string;
  }
> = {
  TECH_COUNSEL: {
    label: '기술상담 (증상별)',
    badgeBg: '#dcfce7',
    badgeColor: '#166534',
    borderColor: '#86efac',
    defaultCategory: 'other',
    defaultWorktype: '기타',
  },
  SALES_QUOTE: {
    label: '영업문의 (구매/견적)',
    badgeBg: '#fef3c7',
    badgeColor: '#92400e',
    borderColor: '#fcd34d',
    defaultCategory: 'part-ship',
    defaultWorktype: '부품예정',
  },
  DEMO_REQUEST: {
    label: '데모시연 접수',
    badgeBg: '#e0f2fe',
    badgeColor: '#075985',
    borderColor: '#7dd3fc',
    defaultCategory: 'sales-demo',
    defaultWorktype: '시연',
  },
  DELIVERY_ADJUST: {
    label: '납품일정 조정',
    badgeBg: '#ede9fe',
    badgeColor: '#5b21b6',
    borderColor: '#c4b5fd',
    defaultCategory: 'equip-ship',
    defaultWorktype: '출고예정',
  },
  AS_SCHEDULE: {
    label: 'AS 방문일정·출장접수',
    badgeBg: '#fee2e2',
    badgeColor: '#991b1b',
    borderColor: '#fca5a5',
    defaultCategory: 'as-service',
    defaultWorktype: '현장수리',
  },
};

function getTomorrowAfternoonIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T14:00`;
}

export const ConsultWrapupModal: React.FC<ConsultWrapupModalProps> = ({
  isOpen,
  onClose,
  transcriptText,
  selectedCustomer,
  equipmentModel,
  detectedKeywords,
  checklist,
  assignedEngineer,
  dispatchDate,
  archiveId,
  audioFileName,
  audioFileSize,
  audioDurationSec,
  sttEngine,
  sttLabOptions,
  sttParagraphs,
  onArchiveIdChange,
  onOpenPartsQuote,
  onOpenDispatchDoc,
  onCompleteWrapup,
  onToast,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loadingElapsedMs, setLoadingElapsedMs] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [providerInfo, setProviderInfo] = useState<{ provider: string; model: string; elapsedMs: number }>({
    provider: 'groq_cloud',
    model: 'openai/gpt-oss-120b',
    elapsedMs: 0,
  });

  useEffect(() => {
    if (!isLoading && !isSaving) {
      setLoadingElapsedMs(0);
      return;
    }
    const startAt = Date.now();
    setLoadingElapsedMs(0);
    const timer = window.setInterval(() => {
      setLoadingElapsedMs(Date.now() - startAt);
    }, 100);
    return () => window.clearInterval(timer);
  }, [isLoading, isSaving]);

  const [overallSummary, setOverallSummary] = useState<OverallSummary>({
    issue: '',
    guidance: '',
    conclusion: '',
  });

  const [customerDraft, setCustomerDraft] = useState({
    companyName: '',
    managerName: '',
    phone: '',
    address: '',
    equipmentModel: '',
    serialNumber: '',
  });

  const [outcomes, setOutcomes] = useState<WrapupOutcomeItem[]>([]);

  const runWrapupAnalysis = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const resp = await fetch('/api/consult-wrapup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: transcriptText,
          customer: selectedCustomer || {},
          detectedKeywords: detectedKeywords.map((k) => ({
            id: k.id,
            keyword: k.keyword,
            category: k.category,
          })),
          checklist,
          assignedEngineer,
          dispatchDate,
          currentTimeIso: new Date().toISOString(),
        }),
      });

      if (!resp.ok) {
        const errBody = await resp.text().catch(() => '');
        throw new Error(`AI 결론 분석 요청 실패 (${resp.status}): ${errBody.slice(0, 120)}`);
      }

      const result = await resp.json();
      const data = result.data || {};

      const provStr = result.provider || 'groq_cloud';
      const modStr = result.model || 'llama-3.3-70b-versatile';
      setProviderInfo({
        provider: provStr,
        model: modStr,
        elapsedMs: Number(result.elapsedMs || 0),
      });

      const nextSummary = {
        issue: data.overallSummary?.issue || `${selectedCustomer?.name || '고객사'} (${equipmentModel}) 상담 접수`,
        guidance: data.overallSummary?.guidance || '점검 체크리스트 안내 완료',
        conclusion: data.overallSummary?.conclusion || '상담 결론 도출 완료',
      };
      setOverallSummary(nextSummary);

      const nextCustomer = {
        companyName: data.extractedCustomer?.companyName || selectedCustomer?.name || '미확인 고객사',
        managerName: data.extractedCustomer?.managerName || selectedCustomer?.manager || '현장 담당자',
        phone: data.extractedCustomer?.phone || selectedCustomer?.phone || '',
        address:
          data.extractedCustomer?.address ||
          [selectedCustomer?.address, selectedCustomer?.addressDetail].filter(Boolean).join(' ') ||
          '',
        equipmentModel: data.extractedCustomer?.equipmentModel || equipmentModel || 'J600T',
        serialNumber: data.extractedCustomer?.serialNumber || selectedCustomer?.serialNumber || '',
      };
      setCustomerDraft(nextCustomer);

      const rawOutcomes = Array.isArray(data.outcomes) ? data.outcomes : [];
      const mappedOutcomes: WrapupOutcomeItem[] = rawOutcomes.map((item: any, idx: number) => {
        const oType: OutcomeType = OUTCOME_META[item.outcomeType as OutcomeType]
          ? (item.outcomeType as OutcomeType)
          : 'TECH_COUNSEL';
        const meta = OUTCOME_META[oType];
        const defaultIso = getTomorrowAfternoonIso();
        return {
          id: `outcome-${Date.now()}-${idx}`,
          checked: true,
          outcomeType: oType,
          title: item.title || `[${meta.label}] ${selectedCustomer?.name || ''} ${equipmentModel}`,
          confidence: Number(item.confidence || 0.9),
          scheduleCategory: (item.scheduleCategory as Category) || meta.defaultCategory,
          worktype: item.worktype || meta.defaultWorktype,
          fields: {
            symptomCategory: item.fields?.symptomCategory || detectedKeywords[0]?.keyword || '기본 점검',
            symptomDetail: item.fields?.symptomDetail || '',
            resolutionStatus: item.fields?.resolutionStatus || '자가조치완료',
            checkedStepsSummary: item.fields?.checkedStepsSummary || '',
            quoteType: item.fields?.quoteType || '부품·소모품 견적',
            requestedItems: Array.isArray(item.fields?.requestedItems)
              ? item.fields.requestedItems
              : [{ name: `${equipmentModel} 소모품`, qty: 1, note: '' }],
            quoteDeliveryMethod: item.fields?.quoteDeliveryMethod || '견적서 발송',
            industry: item.fields?.industry || '빌딩/아파트 관리현장',
            floorSpec: item.fields?.floorSpec || '',
            contaminant: item.fields?.contaminant || '',
            recommendedModel: item.fields?.recommendedModel || equipmentModel,
            isReschedule: Boolean(item.fields?.isReschedule),
            originalDateText: item.fields?.originalDateText || '',
            requestedDateIso: (item.fields?.requestedDateIso || defaultIso).slice(0, 16),
            requestedDateLabel: item.fields?.requestedDateLabel || defaultIso.replace('T', ' '),
            assignedEngineer: item.fields?.assignedEngineer || assignedEngineer,
            shipMethod: item.fields?.shipMethod || '직배송',
            nextVisitParts: item.fields?.nextVisitParts || detectedKeywords.map((k) => k.keyword).join(', '),
            actionMemo: item.fields?.actionMemo || '',
          },
        };
      });

      setOutcomes(mappedOutcomes);

      // AI 결론 도출 즉시 public.stt_audio_archives 테이블에 (파일명 + STT 텍스트 + AI 결론) 세트 자동 기록
      try {
        const paras = Array.isArray(sttParagraphs) && sttParagraphs.length > 0
          ? sttParagraphs
          : (transcriptText || '').split('\n').filter(Boolean);
        const engKey = sttEngine || 'whisper_large_v3';
        const engineLabel =
          engKey === 'whisper_large_v3'
            ? 'Groq Whisper (whisper-large-v3-turbo)'
            : engKey === 'web_speech'
              ? '웹 음성 STT (Web Speech API)'
              : '네이버 클로바 STT (CLOVA Speech)';
        const now = new Date();
        const nowIso = now.toISOString();
        const kstStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
        const archivePayload = {
          file_name: audioFileName || '실시간 마이크 수음',
          file_size_bytes: audioFileSize || 0,
          audio_duration_sec: Number((audioDurationSec || 0).toFixed(2)),
          stt_engine: engKey,
          stt_engine_label: engineLabel,
          stt_lab_options: sttLabOptions || {},
          work_datetime: nowIso,
          work_datetime_kst: kstStr,
          ai_analyzed_at: nowIso,
          stt_text: transcriptText || '',
          stt_paragraphs: paras,
          paragraph_count: paras.length,
          detected_keywords: detectedKeywords.map((k) => ({
            id: k.id,
            keyword: k.keyword,
            category: k.category,
          })),
          customer_name: nextCustomer.companyName,
          manager_name: nextCustomer.managerName,
          phone: nextCustomer.phone,
          address: nextCustomer.address,
          equipment_model: nextCustomer.equipmentModel,
          ai_summary_issue: nextSummary.issue,
          ai_summary_guidance: nextSummary.guidance,
          ai_summary_conclusion: nextSummary.conclusion,
          ai_outcomes: mappedOutcomes,
          ai_provider: `${provStr}:${modStr}`,
          status: 'AI_ANALYZED',
          updated_at: nowIso,
        };

        if (archiveId) {
          await supabase.from('stt_audio_archives').update(archivePayload).eq('id', archiveId);
        } else {
          const { data: insertedRow } = await supabase
            .from('stt_audio_archives')
            .insert([archivePayload])
            .select('id')
            .single();
          if (insertedRow?.id && onArchiveIdChange) {
            onArchiveIdChange(insertedRow.id);
          }
        }
      } catch (archiveErr) {
        console.warn('stt_audio_archives AI_ANALYZED update notice:', archiveErr);
      }
    } catch (err: any) {
      setErrorMsg(String(err?.message || err));
    } finally {
      setIsLoading(false);
    }
  }, [
    transcriptText,
    selectedCustomer,
    equipmentModel,
    detectedKeywords,
    checklist,
    assignedEngineer,
    dispatchDate,
    archiveId,
    audioFileName,
    audioFileSize,
    audioDurationSec,
    sttEngine,
    sttLabOptions,
    sttParagraphs,
    onArchiveIdChange,
  ]);

  useEffect(() => {
    if (isOpen) {
      runWrapupAnalysis();
    }
  }, [isOpen, runWrapupAnalysis]);

  if (!isOpen) return null;

  const handleToggleOutcome = (id: string) => {
    setOutcomes((prev) => prev.map((o) => (o.id === id ? { ...o, checked: !o.checked } : o)));
  };

  const handleRemoveOutcome = (id: string) => {
    setOutcomes((prev) => prev.filter((o) => o.id !== id));
  };

  const handleAddOutcome = (oType: OutcomeType) => {
    const meta = OUTCOME_META[oType];
    const defaultIso = getTomorrowAfternoonIso();
    const symptomStr = detectedKeywords.map((k) => k.keyword).join(', ') || '기본 점검';
    const newItem: WrapupOutcomeItem = {
      id: `outcome-manual-${Date.now()}`,
      checked: true,
      outcomeType: oType,
      title: `[${meta.label}] ${customerDraft.companyName} (${customerDraft.equipmentModel})`,
      confidence: 1.0,
      scheduleCategory: meta.defaultCategory,
      worktype: meta.defaultWorktype,
      fields: {
        symptomCategory: symptomStr,
        symptomDetail: `${customerDraft.equipmentModel} ${symptomStr} 관련 상담`,
        resolutionStatus: '자가조치완료',
        checkedStepsSummary: checklist
          .filter((c) => c.checked)
          .map((c) => `${c.id}단계`)
          .join(', '),
        quoteType: '부품·소모품 견적',
        requestedItems: [{ name: symptomStr, qty: 1, note: customerDraft.equipmentModel }],
        quoteDeliveryMethod: '견적서 발송',
        industry: '관리현장',
        floorSpec: '',
        contaminant: '',
        recommendedModel: customerDraft.equipmentModel,
        isReschedule: oType === 'DELIVERY_ADJUST',
        originalDateText: '기존 예정일',
        requestedDateIso: defaultIso,
        requestedDateLabel: defaultIso.replace('T', ' '),
        assignedEngineer,
        shipMethod: '직배송',
        nextVisitParts: symptomStr,
        actionMemo: `${meta.label} 후속 조치`,
      },
    };
    setOutcomes((prev) => [...prev, newItem]);
  };

  const updateOutcomeField = (id: string, key: keyof WrapupOutcomeFields, value: any) => {
    setOutcomes((prev) =>
      prev.map((o) =>
        o.id === id
          ? {
              ...o,
              fields: {
                ...o.fields,
                [key]: value,
              },
            }
          : o
      )
    );
  };

  const updateOutcomeTitle = (id: string, title: string) => {
    setOutcomes((prev) => prev.map((o) => (o.id === id ? { ...o, title } : o)));
  };

  const checkedOutcomes = outcomes.filter((o) => o.checked);
  const scheduleSyncCount = checkedOutcomes.filter((o) => o.outcomeType !== 'TECH_COUNSEL').length;

  const handleConfirmAll = async () => {
    if (checkedOutcomes.length === 0) {
      onToast('확정할 결론 항목을 1개 이상 선택하세요.');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);
    let savedScheduleCount = 0;
    let savedVisitCount = 0;
    let savedSalesCount = 0;

    try {
      const hasAsVisit = checkedOutcomes.some((o) => o.outcomeType === 'AS_SCHEDULE');
      const primaryKeyword =
        checkedOutcomes[0]?.fields?.symptomCategory ||
        detectedKeywords[0]?.keyword ||
        checkedOutcomes.map((o) => o.outcomeType).join(',');

      // 1. 상담 마스터 이력 저장 (public.consult_logs)
      const { data: consultRow, error: consultErr } = await supabase
        .from('consult_logs')
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
      await supabase.from('llm_logs').insert([
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
            .from('visits')
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
              .from('consult_logs')
              .update({ visit_id: visitRow.id })
              .eq('id', consultId);
          }
        }

        // 3-B. 영업문의(구매/견적) 또는 데모시연인 경우 public.sales_inquiries 영업 대장에도 동시 기록
        if (item.outcomeType === 'SALES_QUOTE' || item.outcomeType === 'DEMO_REQUEST') {
          const itemsStr = (item.fields.requestedItems || [])
            .map((r) => `${r.name}(${r.qty})`)
            .join(', ');
          const { error: salesErr } = await supabase.from('sales_inquiries').insert([
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
      const paras = Array.isArray(sttParagraphs) && sttParagraphs.length > 0
        ? sttParagraphs
        : (transcriptText || '').split('\n').filter(Boolean);
      const engKey = sttEngine || 'whisper_large_v3';
      const engineLabel =
        engKey === 'whisper_large_v3'
          ? 'Groq Whisper (whisper-large-v3-turbo)'
          : engKey === 'web_speech'
            ? '웹 음성 STT (Web Speech API)'
            : '네이버 클로바 STT (CLOVA Speech)';
      const now = new Date();
      const nowIso = now.toISOString();
      const kstStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      const confirmedArchivePayload = {
        file_name: audioFileName || '실시간 마이크 수음',
        file_size_bytes: audioFileSize || 0,
        audio_duration_sec: Number((audioDurationSec || 0).toFixed(2)),
        stt_engine: engKey,
        stt_engine_label: engineLabel,
        stt_lab_options: sttLabOptions || {},
        work_datetime: nowIso,
        work_datetime_kst: kstStr,
        ai_analyzed_at: nowIso,
        stt_text: transcriptText || '',
        stt_paragraphs: paras,
        paragraph_count: paras.length,
        detected_keywords: detectedKeywords.map((k) => ({
          id: k.id,
          keyword: k.keyword,
          category: k.category,
        })),
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

      if (archiveId) {
        const { error: archUpdErr } = await supabase
          .from('stt_audio_archives')
          .update(confirmedArchivePayload)
          .eq('id', archiveId);
        if (archUpdErr) {
          throw new Error(`파일·STT·AI 세트(stt_audio_archives) 확정 저장 실패: ${archUpdErr.message}`);
        }
      } else {
        const { data: archInsRow, error: archInsErr } = await supabase
          .from('stt_audio_archives')
          .insert([confirmedArchivePayload])
          .select('id')
          .single();
        if (archInsErr) {
          throw new Error(`파일·STT·AI 세트(stt_audio_archives) 신규 저장 실패: ${archInsErr.message}`);
        }
        if (archInsRow?.id && onArchiveIdChange) {
          onArchiveIdChange(archInsRow.id);
        }
      }

      const finalSummaryNote = `[AI 결론 확정] ${checkedOutcomes.map((o) => o.title).join(' / ')}`;
      onCompleteWrapup(finalSummaryNote);
      onToast(
        `DB 저장 완료: 파일·STT·AI 세트(stt_audio_archives) 1건 · 상담이력 1건 · 일정캘린더 ${savedScheduleCount}건${
          savedVisitCount > 0 ? ` · 출장배차 ${savedVisitCount}건` : ''
        }${savedSalesCount > 0 ? ` · 영업대장 ${savedSalesCount}건` : ''}`
      );
      onClose();
    } catch (err: any) {
      setErrorMsg(`DB 저장 중 오류가 발생했습니다: ${String(err?.message || err)}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.72)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 150,
        padding: '16px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSaving) onClose();
      }}
    >
      <div
        style={{
          width: '1120px',
          maxWidth: '96vw',
          height: '88vh',
          backgroundColor: '#ffffff',
          border: '1px solid #cbd5e1',
          borderRadius: '8px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.45)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <style>{`
          @keyframes spaceWrapupSpin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes spaceWrapupReverseSpin {
            0% { transform: rotate(360deg); }
            100% { transform: rotate(0deg); }
          }
          @keyframes spaceWrapupLogoTurn {
            0% { transform: perspective(400px) rotateY(0deg) scale(1); }
            50% { transform: perspective(400px) rotateY(180deg) scale(1.04); }
            100% { transform: perspective(400px) rotateY(360deg) scale(1); }
          }
        `}</style>

        {/* 1. TOP HEADER BAR (Z-Pattern 좌상단 Scope & 우상단 Pipeline) */}
        <div
          style={{
            padding: '10px 16px',
            borderBottom: '1px solid #cbd5e1',
            backgroundColor: '#f8fafc',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flexShrink: 0 }}>
            <span
              style={{
                fontSize: '14.5px',
                fontWeight: 800,
                color: '#0f172a',
                whiteSpace: 'nowrap',
              }}
            >
              통화 결론 분류 및 일정·문서 일괄 확정
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                padding: '3px 7px',
                borderRadius: '4px',
                backgroundColor: isLoading
                  ? '#eff6ff'
                  : providerInfo.provider === 'groq_cloud'
                    ? '#dcfce7'
                    : '#fef3c7',
                color: isLoading
                  ? '#1d4ed8'
                  : providerInfo.provider === 'groq_cloud'
                    ? '#166534'
                    : '#92400e',
                border: isLoading
                  ? '1px solid #93c5fd'
                  : providerInfo.provider === 'groq_cloud'
                    ? '1px solid #86efac'
                    : '1px solid #fcd34d',
                whiteSpace: 'nowrap',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {isLoading ? (
                <>
                  <RotateCcw
                    size={11}
                    style={{ animation: 'spaceWrapupSpin 1s linear infinite', flexShrink: 0 }}
                  />
                  <span>Groq 분석중 · {(loadingElapsedMs / 1000).toFixed(1)}s</span>
                </>
              ) : providerInfo.provider === 'groq_cloud' ? (
                `Groq (${providerInfo.model.replace(/^openai\//, '')}) · ${providerInfo.elapsedMs}ms`
              ) : (
                `${providerInfo.model} · ${providerInfo.elapsedMs}ms`
              )}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0, marginLeft: 'auto' }}>
            {(
              [
                { type: 'TECH_COUNSEL' as OutcomeType, shortLabel: '기술상담' },
                { type: 'SALES_QUOTE' as OutcomeType, shortLabel: '영업문의' },
                { type: 'DEMO_REQUEST' as OutcomeType, shortLabel: '데모시연' },
                { type: 'DELIVERY_ADJUST' as OutcomeType, shortLabel: '납품일정' },
                { type: 'AS_SCHEDULE' as OutcomeType, shortLabel: 'AS일정' },
              ]
            ).map(({ type: oType, shortLabel }) => {
              const meta = OUTCOME_META[oType];
              return (
                <button
                  key={oType}
                  onClick={() => handleAddOutcome(oType)}
                  title={`${shortLabel} 결론 카드 추가`}
                  style={{
                    padding: '4px 7px',
                    borderRadius: '4px',
                    border: `1px solid ${meta.borderColor}`,
                    backgroundColor: meta.badgeBg,
                    color: meta.badgeColor,
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '2px',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  <Plus size={11} />
                  <span>{shortLabel}</span>
                </button>
              );
            })}

            <button
              onClick={runWrapupAnalysis}
              disabled={isLoading}
              style={{
                padding: '4px 9px',
                borderRadius: '4px',
                border: '1px solid #94a3b8',
                backgroundColor: '#ffffff',
                color: '#0f172a',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: isLoading ? 'wait' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              <RotateCcw
                size={12}
                style={isLoading ? { animation: 'spaceWrapupSpin 1s linear infinite' } : undefined}
              />
              <span>{isLoading ? '분석중' : 'AI 재분석'}</span>
            </button>

            <button
              onClick={onClose}
              title="모달 닫기"
              style={{
                background: 'none',
                border: '1px solid #cbd5e1',
                borderRadius: '4px',
                backgroundColor: '#ffffff',
                color: '#475569',
                cursor: 'pointer',
                padding: '4px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* 2. CUSTOMER & 3-LINE OVERALL SUMMARY STRIP */}
        <div
          style={{
            padding: '10px 18px',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#f1f5f9',
            display: 'grid',
            gridTemplateColumns: '1.1fr 1.9fr',
            gap: '14px',
            flexShrink: 0,
          }}
        >
          {/* 좌측: 고객/장비 기본 컨텍스트 */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              padding: '10px 12px',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
                고객사 / 현장명
              </label>
              <input
                type="text"
                value={customerDraft.companyName}
                onChange={(e) => setCustomerDraft((p) => ({ ...p, companyName: e.target.value }))}
                style={{
                  padding: '5px 8px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  color: '#0f172a',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
                장비 모델 / 시리얼
              </label>
              <input
                type="text"
                value={customerDraft.equipmentModel}
                onChange={(e) => setCustomerDraft((p) => ({ ...p, equipmentModel: e.target.value }))}
                style={{
                  padding: '5px 8px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  color: '#0f172a',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
                담당자명 / 연락처
              </label>
              <input
                type="text"
                value={`${customerDraft.managerName} ${customerDraft.phone}`.trim()}
                onChange={(e) => setCustomerDraft((p) => ({ ...p, managerName: e.target.value }))}
                style={{
                  padding: '5px 8px',
                  fontSize: '12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  color: '#0f172a',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
                방문 / 납품 주소
              </label>
              <input
                type="text"
                value={customerDraft.address}
                onChange={(e) => setCustomerDraft((p) => ({ ...p, address: e.target.value }))}
                style={{
                  padding: '5px 8px',
                  fontSize: '12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  color: '#0f172a',
                }}
              />
            </div>
          </div>

          {/* 우측: 3단 건조 요약 (문의/증상 -> 안내/점검 -> 최종 결론) */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              padding: '10px 12px',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', fontWeight: 800, color: '#1e40af', whiteSpace: 'nowrap' }}>
                1. 문의 및 증상 요약
              </label>
              <textarea
                rows={2}
                value={overallSummary.issue}
                onChange={(e) => setOverallSummary((p) => ({ ...p, issue: e.target.value }))}
                style={{
                  padding: '6px 8px',
                  fontSize: '12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  color: '#0f172a',
                  resize: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', fontWeight: 800, color: '#047857', whiteSpace: 'nowrap' }}>
                2. 진단 및 안내 사항
              </label>
              <textarea
                rows={2}
                value={overallSummary.guidance}
                onChange={(e) => setOverallSummary((p) => ({ ...p, guidance: e.target.value }))}
                style={{
                  padding: '6px 8px',
                  fontSize: '12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  color: '#0f172a',
                  resize: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', fontWeight: 800, color: '#b45309', whiteSpace: 'nowrap' }}>
                3. 합의 결론 및 후속조치
              </label>
              <textarea
                rows={2}
                value={overallSummary.conclusion}
                onChange={(e) => setOverallSummary((p) => ({ ...p, conclusion: e.target.value }))}
                style={{
                  padding: '6px 8px',
                  fontSize: '12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  color: '#0f172a',
                  resize: 'none',
                }}
              />
            </div>
          </div>
        </div>

        {/* 에러 배너 표시 (무음 실패 방지) */}
        {errorMsg && (
          <div
            style={{
              padding: '8px 18px',
              backgroundColor: '#fef2f2',
              borderBottom: '1px solid #fca5a5',
              color: '#991b1b',
              fontSize: '12.5px',
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* 3. CENTER BODY: MULTI-OUTCOME DOSSIER CARDS */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            padding: '14px 18px',
            backgroundColor: '#f8fafc',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {isLoading ? (
            <div
              style={{
                flex: 1,
                minHeight: '300px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '18px',
                padding: '36px 20px',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
              }}
            >
              {/* SPACE 로고 이중 회전 궤도 스피너 */}
              <div
                style={{
                  position: 'relative',
                  width: '132px',
                  height: '132px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {/* 외곽 시계방향 고속 회전 링 */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '50%',
                    border: '4px solid #e2e8f0',
                    borderTopColor: '#2563eb',
                    borderRightColor: '#3b82f6',
                    animation: 'spaceWrapupSpin 1.05s linear infinite',
                  }}
                />
                {/* 내측 반시계방향 회전 링 */}
                <div
                  style={{
                    position: 'absolute',
                    inset: '11px',
                    borderRadius: '50%',
                    border: '2.5px dashed #93c5fd',
                    borderBottomColor: '#1d4ed8',
                    animation: 'spaceWrapupReverseSpin 1.8s linear infinite',
                  }}
                />
                {/* 중앙 SPACE 회사 로고 원형 배지 */}
                <div
                  style={{
                    width: '88px',
                    height: '88px',
                    borderRadius: '50%',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.14)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '10px',
                  }}
                >
                  <img
                    src="/SPACE_logo.png"
                    alt="SPACE"
                    style={{
                      width: '68px',
                      height: 'auto',
                      objectFit: 'contain',
                      animation: 'spaceWrapupLogoTurn 2.4s ease-in-out infinite',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <div
                  style={{
                    fontSize: '15px',
                    fontWeight: 800,
                    color: '#0f172a',
                    whiteSpace: 'nowrap',
                  }}
                >
                  통화 녹취록 기반 결론 분류 및 일정 추출 중 ({(loadingElapsedMs / 1000).toFixed(1)}s)
                </div>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#475569',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span
                    style={{
                      padding: '3px 8px',
                      borderRadius: '4px',
                      backgroundColor: '#eff6ff',
                      color: '#1d4ed8',
                      border: '1px solid #bfdbfe',
                    }}
                  >
                    1. 통화녹취·키워드 전송
                  </span>
                  <span>➔</span>
                  <span
                    style={{
                      padding: '3px 8px',
                      borderRadius: '4px',
                      backgroundColor: loadingElapsedMs >= 600 ? '#eff6ff' : '#f1f5f9',
                      color: loadingElapsedMs >= 600 ? '#1d4ed8' : '#64748b',
                      border: loadingElapsedMs >= 600 ? '1px solid #bfdbfe' : '1px solid #cbd5e1',
                    }}
                  >
                    2. 고객·장비·희망일시 추출
                  </span>
                  <span>➔</span>
                  <span
                    style={{
                      padding: '3px 8px',
                      borderRadius: '4px',
                      backgroundColor: loadingElapsedMs >= 1400 ? '#eff6ff' : '#f1f5f9',
                      color: loadingElapsedMs >= 1400 ? '#1d4ed8' : '#64748b',
                      border: loadingElapsedMs >= 1400 ? '1px solid #bfdbfe' : '1px solid #cbd5e1',
                    }}
                  >
                    3. 5대 결론 카드 구성
                  </span>
                </div>
              </div>
            </div>
          ) : outcomes.length === 0 ? (
            <div
              style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: '#64748b',
                fontSize: '13px',
              }}
            >
              추출된 결론 항목이 없습니다. 상단 [+ 추가] 버튼으로 결론 카드를 추가하세요.
            </div>
          ) : (
            outcomes.map((item) => {
              const meta = OUTCOME_META[item.outcomeType];
              return (
                <div
                  key={item.id}
                  style={{
                    backgroundColor: '#ffffff',
                    border: item.checked ? `2px solid ${meta.borderColor}` : '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    opacity: item.checked ? 1 : 0.6,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    flexShrink: 0,
                  }}
                >
                  {/* 카드 상단 헤더 */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                      <button
                        onClick={() => handleToggleOutcome(item.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: item.checked ? '#2563eb' : '#94a3b8',
                          cursor: 'pointer',
                          padding: 0,
                          display: 'flex',
                        }}
                      >
                        {item.checked ? <CheckSquare size={18} /> : <Square size={18} />}
                      </button>

                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          backgroundColor: meta.badgeBg,
                          color: meta.badgeColor,
                          border: `1px solid ${meta.borderColor}`,
                          fontSize: '12px',
                          fontWeight: 800,
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}
                      >
                        {meta.label}
                      </span>

                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => updateOutcomeTitle(item.id, e.target.value)}
                        style={{
                          flex: 1,
                          padding: '5px 8px',
                          fontSize: '13.5px',
                          fontWeight: 800,
                          color: '#0f172a',
                          border: '1px solid #e2e8f0',
                          borderRadius: '4px',
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      <span
                        style={{
                          fontSize: '11.5px',
                          fontWeight: 700,
                          color: '#475569',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        일정분류: <strong>{item.worktype}</strong>
                      </span>

                      {item.outcomeType === 'SALES_QUOTE' && (
                        <button
                          onClick={onOpenPartsQuote}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            border: '1px solid #f59e0b',
                            backgroundColor: '#fffbeb',
                            color: '#92400e',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <Package size={12} />
                          <span>부품 견적서 열기</span>
                        </button>
                      )}

                      {item.outcomeType === 'AS_SCHEDULE' && (
                        <button
                          onClick={onOpenDispatchDoc}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            border: '1px solid #3b82f6',
                            backgroundColor: '#eff6ff',
                            color: '#1d4ed8',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <FileText size={12} />
                          <span>출장 안내문 조립</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleRemoveOutcome(item.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#94a3b8',
                          cursor: 'pointer',
                          padding: '2px',
                          display: 'flex',
                        }}
                        title="결론 카드 삭제"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* 카테고리별 맞춤 필드 그리드 (상하 세로 스택 레이아웃 준수) */}
                  {item.outcomeType === 'TECH_COUNSEL' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 1.5fr 1.5fr', gap: '10px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
                          증상 분류 (복합어 우선)
                        </label>
                        <input
                          type="text"
                          value={item.fields.symptomCategory || ''}
                          onChange={(e) => updateOutcomeField(item.id, 'symptomCategory', e.target.value)}
                          style={{ padding: '6px 8px', fontSize: '12.5px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
                          처리 상태
                        </label>
                        <select
                          value={item.fields.resolutionStatus || '자가조치완료'}
                          onChange={(e) => updateOutcomeField(item.id, 'resolutionStatus', e.target.value)}
                          style={{ padding: '6px 8px', fontSize: '12.5px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                        >
                          <option value="자가조치완료">자가조치완료</option>
                          <option value="경과관찰">경과관찰</option>
                          <option value="출장전환">출장전환</option>
                          <option value="견적전환">견적전환</option>
                        </select>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
                          수행 완료 점검 단계
                        </label>
                        <input
                          type="text"
                          value={item.fields.checkedStepsSummary || ''}
                          onChange={(e) => updateOutcomeField(item.id, 'checkedStepsSummary', e.target.value)}
                          style={{ padding: '6px 8px', fontSize: '12.5px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
                          상담 이력 저장 메모
                        </label>
                        <input
                          type="text"
                          value={item.fields.actionMemo || ''}
                          onChange={(e) => updateOutcomeField(item.id, 'actionMemo', e.target.value)}
                          style={{ padding: '6px 8px', fontSize: '12.5px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                        />
                      </div>
                    </div>
                  )}

                  {item.outcomeType === 'SALES_QUOTE' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '0.9fr 1.6fr 0.9fr 1.6fr', gap: '10px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
                          문의 유형
                        </label>
                        <select
                          value={item.fields.quoteType || '부품·소모품 견적'}
                          onChange={(e) => updateOutcomeField(item.id, 'quoteType', e.target.value)}
                          style={{ padding: '6px 8px', fontSize: '12.5px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                        >
                          <option value="부품·소모품 견적">부품·소모품 견적</option>
                          <option value="신규 렌탈 견적">신규 렌탈 견적</option>
                          <option value="장비 구매 견적">장비 구매 견적</option>
                        </select>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
                          요청 품목 / 모델명
                        </label>
                        <input
                          type="text"
                          value={(item.fields.requestedItems || []).map((r) => `${r.name} (${r.qty}개)`).join(', ')}
                          onChange={(e) =>
                            updateOutcomeField(item.id, 'requestedItems', [
                              { name: e.target.value, qty: 1, note: '' },
                            ])
                          }
                          style={{ padding: '6px 8px', fontSize: '12.5px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
                          발송 목표 일시
                        </label>
                        <input
                          type="datetime-local"
                          value={item.fields.requestedDateIso || ''}
                          onChange={(e) => updateOutcomeField(item.id, 'requestedDateIso', e.target.value)}
                          style={{ padding: '5px 8px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
                          견적 전달 메모
                        </label>
                        <input
                          type="text"
                          value={item.fields.actionMemo || ''}
                          onChange={(e) => updateOutcomeField(item.id, 'actionMemo', e.target.value)}
                          style={{ padding: '6px 8px', fontSize: '12.5px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                        />
                      </div>
                    </div>
                  )}

                  {item.outcomeType === 'DEMO_REQUEST' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 0.9fr 1.1fr 1.4fr', gap: '10px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
                          현장 업종
                        </label>
                        <input
                          type="text"
                          value={item.fields.industry || ''}
                          onChange={(e) => updateOutcomeField(item.id, 'industry', e.target.value)}
                          style={{ padding: '6px 8px', fontSize: '12.5px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
                          바닥 면적 / 재질
                        </label>
                        <input
                          type="text"
                          value={item.fields.floorSpec || ''}
                          onChange={(e) => updateOutcomeField(item.id, 'floorSpec', e.target.value)}
                          style={{ padding: '6px 8px', fontSize: '12.5px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
                          시연 장비 모델
                        </label>
                        <input
                          type="text"
                          value={item.fields.recommendedModel || ''}
                          onChange={(e) => updateOutcomeField(item.id, 'recommendedModel', e.target.value)}
                          style={{ padding: '6px 8px', fontSize: '12.5px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
                          시연 희망 일시
                        </label>
                        <input
                          type="datetime-local"
                          value={item.fields.requestedDateIso || ''}
                          onChange={(e) => updateOutcomeField(item.id, 'requestedDateIso', e.target.value)}
                          style={{ padding: '5px 8px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
                          시연 특이사항 메모
                        </label>
                        <input
                          type="text"
                          value={item.fields.actionMemo || ''}
                          onChange={(e) => updateOutcomeField(item.id, 'actionMemo', e.target.value)}
                          style={{ padding: '6px 8px', fontSize: '12.5px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                        />
                      </div>
                    </div>
                  )}

                  {item.outcomeType === 'DELIVERY_ADJUST' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.8fr 1fr 2.1fr', gap: '10px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
                          변경 납품 일시
                        </label>
                        <input
                          type="datetime-local"
                          value={item.fields.requestedDateIso || ''}
                          onChange={(e) => updateOutcomeField(item.id, 'requestedDateIso', e.target.value)}
                          style={{ padding: '5px 8px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
                          출고 방식
                        </label>
                        <select
                          value={item.fields.shipMethod || '직배송'}
                          onChange={(e) => updateOutcomeField(item.id, 'shipMethod', e.target.value)}
                          style={{ padding: '6px 8px', fontSize: '12.5px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                        >
                          <option value="직배송">직배송</option>
                          <option value="화물">화물</option>
                          <option value="택배">택배</option>
                          <option value="내방">내방</option>
                        </select>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
                          기존 일정 참고
                        </label>
                        <input
                          type="text"
                          value={item.fields.originalDateText || '기존 예정일'}
                          onChange={(e) => updateOutcomeField(item.id, 'originalDateText', e.target.value)}
                          style={{ padding: '6px 8px', fontSize: '12.5px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
                          납품 조정 사유 및 수령자 메모
                        </label>
                        <input
                          type="text"
                          value={item.fields.actionMemo || ''}
                          onChange={(e) => updateOutcomeField(item.id, 'actionMemo', e.target.value)}
                          style={{ padding: '6px 8px', fontSize: '12.5px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                        />
                      </div>
                    </div>
                  )}

                  {item.outcomeType === 'AS_SCHEDULE' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '0.8fr 1.1fr 1.1fr 1.1fr 1.4fr', gap: '10px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
                          접수 구분
                        </label>
                        <select
                          value={item.fields.isReschedule ? 'RESCHEDULE' : 'NEW'}
                          onChange={(e) =>
                            updateOutcomeField(item.id, 'isReschedule', e.target.value === 'RESCHEDULE')
                          }
                          style={{ padding: '6px 8px', fontSize: '12.5px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                        >
                          <option value="NEW">신규 출장접수</option>
                          <option value="RESCHEDULE">방문일정 변경</option>
                        </select>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
                          방문 희망 일시
                        </label>
                        <input
                          type="datetime-local"
                          value={item.fields.requestedDateIso || ''}
                          onChange={(e) => updateOutcomeField(item.id, 'requestedDateIso', e.target.value)}
                          style={{ padding: '5px 8px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
                          배정 정비기사
                        </label>
                        <input
                          type="text"
                          value={item.fields.assignedEngineer || ''}
                          onChange={(e) => updateOutcomeField(item.id, 'assignedEngineer', e.target.value)}
                          style={{ padding: '6px 8px', fontSize: '12.5px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
                          지참 필요 부품
                        </label>
                        <input
                          type="text"
                          value={item.fields.nextVisitParts || ''}
                          onChange={(e) => updateOutcomeField(item.id, 'nextVisitParts', e.target.value)}
                          style={{ padding: '6px 8px', fontSize: '12.5px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
                          기사 전달 메모
                        </label>
                        <input
                          type="text"
                          value={item.fields.actionMemo || ''}
                          onChange={(e) => updateOutcomeField(item.id, 'actionMemo', e.target.value)}
                          style={{ padding: '6px 8px', fontSize: '12.5px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* 4. BOTTOM TERMINAL ACTION BAR (Z-Pattern 우하단 최종 확정 액션) */}
        <div
          style={{
            padding: '12px 18px',
            borderTop: '1px solid #cbd5e1',
            backgroundColor: '#f8fafc',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            flexShrink: 0,
          }}
        >
          <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155', whiteSpace: 'nowrap' }}>
            선택된 결론: <strong style={{ color: '#0f172a' }}>{checkedOutcomes.length}건</strong>
            {' · '}
            통합 일정 캘린더(`schedule_events`) 자동 등록 대상:{' '}
            <strong style={{ color: '#2563eb' }}>{scheduleSyncCount}건</strong>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={onClose}
              disabled={isSaving}
              style={{
                padding: '9px 16px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#334155',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              닫기
            </button>

            <button
              onClick={handleConfirmAll}
              disabled={isSaving || isLoading || checkedOutcomes.length === 0}
              style={{
                padding: '9px 20px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor:
                  isSaving || isLoading || checkedOutcomes.length === 0 ? '#94a3b8' : '#2563eb',
                color: '#ffffff',
                fontSize: '13.5px',
                fontWeight: 800,
                cursor:
                  isSaving || isLoading || checkedOutcomes.length === 0 ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
              }}
            >
              <CheckCircle2 size={15} />
              <span>
                {isSaving
                  ? 'DB 저장 중...'
                  : `선택 결론 일괄 확정 (${checkedOutcomes.length}건)`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
