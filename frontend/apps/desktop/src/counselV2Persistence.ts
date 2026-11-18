import type { DispatchDoc1st, DispatchDoc2nd, SelfActionEvidenceItem } from './dispatchDocTypes';
import type { ConsultSessionRecord, Customer, SymptomSession } from './counselShared';

export const PENDING_STORAGE_KEY = 'space_consult_pending_sessions';
export const HISTORY_STORAGE_KEY = 'space_consult_history_records';

export function generateV2SessionId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `sess_${Date.now()}`;
}

export async function fetchMergedPendingSessions(apiBase: string): Promise<ConsultSessionRecord[]> {
  let localList: ConsultSessionRecord[] = [];
  try {
    const raw = localStorage.getItem(PENDING_STORAGE_KEY);
    if (raw) localList = JSON.parse(raw);
  } catch {}

  try {
    const res = await fetch(`${apiBase}/counsel/pending`, {
      headers: { Authorization: 'Bearer space-advisor-desktop-agent' },
    });
    if (res.ok) {
      const data = await res.json();
      const serverItems = (data.items || []).map((item: any): ConsultSessionRecord => {
        if (item.session_snapshot) {
          return item.session_snapshot;
        }
        return {
          id: item.id,
          timestamp: item.timestamp,
          updatedAt: item.timestamp,
          status: 'in_progress',
          customerName: item.customer_name,
          manager: item.manager,
          phone: '',
          serialNumber: item.serial_number,
          modelName: item.model_name,
          activeSymptomKey: null,
          symptomSessions: {},
          notes: item.action,
          counselorName: '',
          summaryText: item.symptom,
          currentStepSummary: item.keyword,
          selectedErrorCodes: item.keyword ? [item.keyword] : [],
        };
      });

      const map = new Map<string, ConsultSessionRecord>();
      serverItems.forEach((s: ConsultSessionRecord) => map.set(s.id, s));
      localList.forEach((l) => {
        if (!map.has(l.id)) map.set(l.id, l);
      });
      const merged = Array.from(map.values()).sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      try {
        localStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(merged));
      } catch {}
      return merged;
    }
  } catch {}

  return localList;
}

export async function fetchMergedHistoryRecords(apiBase: string): Promise<ConsultSessionRecord[]> {
  let localList: ConsultSessionRecord[] = [];
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (raw) localList = JSON.parse(raw);
  } catch {}

  try {
    const res = await fetch(`${apiBase}/counsel/history?limit=50`, {
      headers: { Authorization: 'Bearer space-advisor-desktop-agent' },
    });
    if (res.ok) {
      const data = await res.json();
      const serverItems = (data.items || []).map((item: any): ConsultSessionRecord => {
        if (item.session_snapshot) {
          return item.session_snapshot;
        }
        return {
          id: item.id,
          timestamp: item.timestamp,
          updatedAt: item.timestamp,
          status: item.is_completed
            ? item.is_visit_required
              ? 'visit_required'
              : 'resolved_by_call'
            : 'in_progress',
          customerName: item.customer_name,
          manager: item.manager,
          phone: '',
          serialNumber: item.serial_number,
          modelName: item.model_name,
          activeSymptomKey: null,
          symptomSessions: {},
          notes: item.action,
          counselorName: '',
          summaryText: item.symptom,
          currentStepSummary: item.action,
          selectedErrorCodes: item.keyword ? [item.keyword] : [],
        };
      });

      const map = new Map<string, ConsultSessionRecord>();
      serverItems.forEach((s: ConsultSessionRecord) => map.set(s.id, s));
      localList.forEach((l) => {
        if (!map.has(l.id)) map.set(l.id, l);
      });
      const merged = Array.from(map.values()).sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      try {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(merged));
      } catch {}
      return merged;
    }
  } catch {}

  return localList;
}

function collectSelectedCodes(sessionList: SymptomSession[]): string[] {
  const selectedCodes: string[] = [];
  sessionList.forEach((s) => {
    if (s.selectedErrorCode && !selectedCodes.includes(s.selectedErrorCode.code)) {
      selectedCodes.push(s.selectedErrorCode.code);
    }
  });
  return selectedCodes;
}

function buildSessionSummaries(sessionList: SymptomSession[], pendingMode: boolean): string {
  return sessionList
    .map((s) => {
      const stepLogs = s.steps
        .map((st) => {
          const mark =
            st.status === 'resolved'
              ? '[해결]'
              : st.status === 'unresolved'
                ? '[불량]'
                : st.status === 'active'
                  ? '[진행]'
                  : '[대기]';
          return `STEP ${st.step_no} ${st.title} (${mark})`;
        })
        .join(' / ');
      const errCodeLog = s.selectedErrorCode
        ? ` (선택 에러코드: [${s.selectedErrorCode.code}] ${s.selectedErrorCode.name})`
        : '';
      const statLabel = pendingMode
        ? '진행중(고객확인대기)'
        : s.status === 'resolved_by_call'
          ? '[전화해결]'
          : s.status === 'visit_required'
            ? '[출장필요]'
            : '[진행중]';
      return `[증상: ${s.title}${errCodeLog} | ${statLabel}]\n - 조치내역: ${stepLogs}`;
    })
    .join('\n');
}

export async function savePendingV2Session(params: {
  apiBase: string;
  currentSessionId: string | null;
  sessionList: SymptomSession[];
  currentSession: SymptomSession | null;
  activeSymptomKey: string | null;
  symptomSessions: Record<string, SymptomSession>;
  customSymptom: string;
  notes: string;
  selectedCustomer: Customer | null;
  searchText: string;
  customerPhone: string;
  siteWorkerPhone: string;
  selectedModel: string;
  counselorName: string;
  pendingSessions: ConsultSessionRecord[];
  historyRecords: ConsultSessionRecord[];
}): Promise<{ updatedPending: ConsultSessionRecord[]; updatedHistory: ConsultSessionRecord[] }> {
  const sessionId = params.currentSessionId || generateV2SessionId();
  const nowIso = new Date().toISOString();
  const selectedCodes = collectSelectedCodes(params.sessionList);

  let stepSummary = '진단 준비';
  if (params.currentSession) {
    const activeStepObj = params.currentSession.steps[params.currentSession.activeStepIndex];
    stepSummary = `${params.currentSession.title}: STEP ${params.currentSession.activeStepIndex + 1} (${activeStepObj?.title || '조치 중'}) 진행 중`;
  } else if (params.sessionList.length > 0) {
    stepSummary = `${params.sessionList[0].title} 외 ${params.sessionList.length - 1}건 진행 중`;
  }

  const sessionSummaries = buildSessionSummaries(params.sessionList, true);
  const allSymptoms = params.sessionList.map((s) => s.title).join(', ') || params.customSymptom;
  const finalAction = `${sessionSummaries}\n[고객 재통화 대기 메모] ${params.notes || '조치 확인 후 재연락 예정'}`.trim();

  const newRecord: ConsultSessionRecord = {
    id: sessionId,
    timestamp: nowIso,
    updatedAt: nowIso,
    status: 'in_progress',
    customerName: params.selectedCustomer?.name ?? (params.searchText.trim() || '일반 고객'),
    manager: params.selectedCustomer?.manager ?? '',
    phone: params.customerPhone.trim() || params.selectedCustomer?.phone || '',
    managerEmail: params.selectedCustomer?.managerEmail ?? '',
    useCompany: params.selectedCustomer?.useCompany ?? '',
    siteWorkerName: params.selectedCustomer?.siteWorkerName ?? '',
    siteWorkerPhone: params.siteWorkerPhone.trim() || params.selectedCustomer?.siteWorkerPhone || '',
    serialNumber: params.selectedCustomer?.serialNumber ?? '',
    modelName: params.selectedModel,
    activeSymptomKey: params.activeSymptomKey,
    symptomSessions: params.symptomSessions,
    notes: params.notes,
    counselorName: params.counselorName || '상담원',
    summaryText: allSymptoms,
    currentStepSummary: stepSummary,
    selectedErrorCodes: selectedCodes,
  };

  const updatedPending = [newRecord, ...params.pendingSessions.filter((p) => p.id !== sessionId)];
  try {
    localStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(updatedPending));
  } catch {}

  const updatedHistory = [newRecord, ...params.historyRecords.filter((h) => h.id !== sessionId)];
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updatedHistory));
  } catch {}

  return {
    updatedPending,
    updatedHistory,
    ...(await (async () => {
      try {
        await fetch(`${params.apiBase}/counsel/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer space-advisor-desktop-agent',
          },
          body: JSON.stringify({
            id: sessionId,
            customer_name: newRecord.customerName,
            manager: newRecord.manager,
            phone: newRecord.phone,
            serial_number: newRecord.serialNumber,
            model_name: newRecord.modelName,
            keyword: selectedCodes.join(', ') || params.sessionList[0]?.title || '고객확인대기',
            part_code: params.sessionList.map((s) => s.part_code).join(', ') || 'GENERAL',
            symptoms: allSymptoms,
            action_taken: finalAction,
            is_completed: false,
            is_visit_required: false,
            counselor_name: params.counselorName || '상담원',
            session_snapshot: newRecord,
          }),
        });
      } catch {}
      return {};
    })()),
  };
}

export async function deletePendingV2Session(
  apiBase: string,
  pendingSessions: ConsultSessionRecord[],
  id: string
): Promise<ConsultSessionRecord[]> {
  const nextList = pendingSessions.filter((p) => p.id !== id);
  try {
    localStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(nextList));
  } catch {}

  try {
    await fetch(`${apiBase}/counsel/session/${id}`, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer space-advisor-desktop-agent' },
    });
  } catch {}

  return nextList;
}

export async function completeAndSaveV2Session(params: {
  apiBase: string;
  isVisit: boolean;
  currentSessionId: string | null;
  sessionList: SymptomSession[];
  activeSymptomKey: string | null;
  symptomSessions: Record<string, SymptomSession>;
  customSymptom: string;
  notes: string;
  selectedCustomer: Customer | null;
  searchText: string;
  customerPhone: string;
  siteWorkerPhone: string;
  customerEmail: string;
  selectedModel: string;
  counselorName: string;
  pendingSessions: ConsultSessionRecord[];
  historyRecords: ConsultSessionRecord[];
}): Promise<{
  doc1Obj: DispatchDoc1st;
  doc2Obj: DispatchDoc2nd;
  updatedPending: ConsultSessionRecord[];
  updatedHistory: ConsultSessionRecord[];
}> {
  const sessionId = params.currentSessionId || generateV2SessionId();
  const nowIso = new Date().toISOString();
  const selectedCodes = collectSelectedCodes(params.sessionList);
  const sessionSummaries = buildSessionSummaries(params.sessionList, false);
  const allSymptoms = params.sessionList.map((s) => s.title).join(', ') || params.customSymptom;
  const finalAction = `${sessionSummaries}\n[상담원 메모] ${params.notes || '특이사항 없음'}`.trim();

  const primeCompany = params.selectedCustomer?.name ?? (params.searchText.trim() || '일반 고객');
  const primeManager = params.selectedCustomer?.manager ?? '관리소 시설과장';
  const primePhone = params.customerPhone.trim() || params.selectedCustomer?.phone || '';
  const subCompany = params.selectedCustomer?.useCompany || '(주)클린에코 청소용역';
  const workerName = params.selectedCustomer?.siteWorkerName || '김순자 미화반장';
  const workerPhone = params.siteWorkerPhone.trim() || params.selectedCustomer?.siteWorkerPhone || '';

  const evidenceSteps: SelfActionEvidenceItem[] = (params.sessionList[0]?.steps || []).map((st) => ({
    stepNo: st.step_no,
    title: st.title,
    method: st.method || st.title,
    result: (st.status === 'resolved'
      ? 'NORMAL'
      : st.status === 'unresolved'
        ? 'FAULT'
        : 'UNRESOLVED') as 'NORMAL' | 'FAULT' | 'UNRESOLVED',
    note:
      st.status === 'resolved'
        ? '정상 해결 및 이상 없음 확인'
        : st.status === 'unresolved'
          ? '현장 조치 불가 / 불량 판정'
          : '안내 진행',
  }));

  const failureReasonText = `제조사 공식 매뉴얼에 의거하여 3단계 사전 자가점검(호스/필터/퓨즈)을 성실히 이행하였으나, [${allSymptoms}] 관련 현장 조치가 불가능하여 부품 지참 및 전문 기술 엔지니어 현장 출장 정비가 불가피함을 확인합니다.`;

  const doc1Obj: DispatchDoc1st = {
    docNo: `S-CHK-${nowIso.slice(0, 10).replace(/-/g, '')}-01`,
    issuedAt: new Date().toLocaleDateString(),
    recipientCompany: primeCompany,
    recipientManager: primeManager,
    recipientPhone: primePhone,
    recipientEmail: params.customerEmail.trim() || params.selectedCustomer?.managerEmail || '',
    siteCompany: subCompany,
    siteWorkerName: workerName,
    siteWorkerPhone: workerPhone,
    equipmentModel: params.selectedModel,
    serialNumber: params.selectedCustomer?.serialNumber || `${params.selectedModel}-2024-0812`,
    salesType: params.selectedCustomer?.salesType || '렌탈(임대)',
    symptoms: params.sessionList.map((s) => s.title).length
      ? params.sessionList.map((s) => s.title)
      : [allSymptoms],
    selectedErrorCodes: selectedCodes,
    evidenceSteps: evidenceSteps.length
      ? evidenceSteps
      : [
          {
            stepNo: 1,
            title: '배터리 전압 및 메인 퓨즈 점검',
            method: '키 ON 통전 전압 확인',
            result: 'NORMAL',
            note: '24V 정상 확인',
          },
          {
            stepNo: 2,
            title: '흡입 호스 및 플로트 점검',
            method: '호스 내 이물질 통수 점검',
            result: 'NORMAL',
            note: '호스 막힘 없음',
          },
          {
            stepNo: 3,
            title: '모터 구동 및 통전 테스트',
            method: '모터 직결 회전 점검',
            result: 'FAULT',
            note: '모터 코일 소손 (조치 불가)',
          },
        ],
    failureReason: failureReasonText,
    assignedEngineer: '이정민 주임',
    engineerPhone: '010-4444-5555',
    engineerCenter: '스페이스 수도권 AS 직영센터',
    plannedVisitAt: `${new Date().toLocaleDateString()} 14:00 (사전 연락 후 방문)`,
    sitePreparation: '장비 주변 작업 공간 확보 및 전원 키 보관 상태 유지 협조',
    status: 'DRAFT',
  };

  const doc2Obj: DispatchDoc2nd = {
    docNo: `S-EST-${nowIso.slice(0, 10).replace(/-/g, '')}-01`,
    refDoc1stNo: doc1Obj.docNo,
    issuedAt: new Date().toLocaleDateString(),
    recipientCompany: primeCompany,
    recipientManager: primeManager,
    recipientPhone: primePhone,
    recipientEmail: params.customerEmail.trim() || params.selectedCustomer?.managerEmail || '',
    siteCompany: subCompany,
    equipmentModel: params.selectedModel,
    serialNumber: params.selectedCustomer?.serialNumber || `${params.selectedModel}-2024-0812`,
    engineerName: '이정민 주임',
    visitedAt: `${new Date().toLocaleDateString()} 14:30 ~ 15:40`,
    rootCause: `${params.sessionList[0]?.title || '구동 모듈'} 내부 카본브러시 마모 및 회전자 코일 소손에 의한 구동 고착`,
    actionTaken: '24V 신품 모터 어셈블리 교체, 방진 가스켓 교환, 시운전 진공 흡입 압력 정상치 복구 완료',
    parts: [
      {
        id: 'p1',
        name: '진공 흡입 모터 어셈블리 24V',
        partCode: `${params.selectedModel}-MOT-01`,
        qty: 1,
        unitPrice: 180000,
        supplyPrice: 180000,
      },
      {
        id: 'p2',
        name: '방진 모터 실링 가스켓',
        partCode: `${params.selectedModel}-GSK-02`,
        qty: 1,
        unitPrice: 20000,
        supplyPrice: 20000,
      },
    ],
    techLaborFee: 80000,
    travelFee: 50000,
    supplyTotal: 330000,
    vat: 33000,
    grandTotal: 363000,
    bankInfo: '신한은행 110-123-456789 (예금주: (주)스페이스)',
    approvalStatus: 'PENDING',
  };

  const newRecord: ConsultSessionRecord = {
    id: sessionId,
    timestamp: nowIso,
    updatedAt: nowIso,
    status: params.isVisit ? 'visit_required' : 'resolved_by_call',
    customerName: primeCompany,
    manager: primeManager,
    phone: primePhone,
    managerEmail: params.selectedCustomer?.managerEmail || '',
    useCompany: subCompany,
    siteWorkerName: workerName,
    siteWorkerPhone: workerPhone,
    serialNumber: params.selectedCustomer?.serialNumber ?? '',
    modelName: params.selectedModel,
    activeSymptomKey: params.activeSymptomKey,
    symptomSessions: params.symptomSessions,
    notes: params.notes,
    counselorName: params.counselorName || '상담원',
    summaryText: allSymptoms,
    currentStepSummary: params.isVisit ? 'AS 출장 접수 (1차 확인서 발행)' : '직접 조치 종결 완료',
    selectedErrorCodes: selectedCodes,
    doc1st: params.isVisit ? doc1Obj : undefined,
    doc2nd: params.isVisit ? doc2Obj : undefined,
  };

  const updatedPending = params.pendingSessions.filter((p) => p.id !== sessionId);
  try {
    localStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(updatedPending));
  } catch {}

  const updatedHistory = [newRecord, ...params.historyRecords.filter((h) => h.id !== sessionId)];
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updatedHistory));
  } catch {}

  try {
    await fetch(`${params.apiBase}/counsel/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer space-advisor-desktop-agent',
      },
      body: JSON.stringify({
        id: sessionId,
        customer_name: newRecord.customerName,
        manager: newRecord.manager,
        phone: newRecord.phone,
        serial_number: newRecord.serialNumber,
        model_name: newRecord.modelName,
        keyword: selectedCodes.join(', ') || (params.sessionList[0]?.title ?? params.customSymptom),
        part_code: params.sessionList.map((s) => s.part_code).join(', ') || 'GENERAL',
        symptoms: allSymptoms,
        action_taken: finalAction,
        is_completed: true,
        is_visit_required: params.isVisit,
        counselor_name: params.counselorName || '상담원',
        session_snapshot: newRecord,
      }),
    });
  } catch {}

  return { doc1Obj, doc2Obj, updatedPending, updatedHistory };
}
