import { useState, useMemo } from 'react';
import {
  X, Check, Printer, Send, Copy, Plus, Minus
} from 'lucide-react';
import {
  MODEL_KEYS,
  resolveModelKey,
  getModelCatalogBundle,
} from './modelCatalogVisuals';

export interface SelfActionEvidenceItem {
  stepNo: number;
  title: string;
  method: string;
  result: 'NORMAL' | 'FAULT' | 'UNRESOLVED';
  note: string;
}

export interface EstimatePartItem {
  id: string;
  name: string;
  partCode: string;
  qty: number;
  unitPrice: number;
  supplyPrice: number;
  imageUrl?: string;
}

export interface DispatchDoc1st {
  docNo: string;
  issuedAt: string;
  recipientCompany: string;
  recipientManager: string;
  recipientPhone: string;
  recipientEmail: string;
  siteCompany: string;
  siteWorkerName: string;
  siteWorkerPhone: string;
  equipmentModel: string;
  serialNumber: string;
  salesType: string;
  symptoms: string[];
  selectedErrorCodes: string[];
  evidenceSteps: SelfActionEvidenceItem[];
  failureReason: string;
  assignedEngineer: string;
  engineerPhone: string;
  engineerCenter: string;
  plannedVisitAt: string;
  sitePreparation: string;
  sentAt?: string;
  sentChannel?: 'KAKAO' | 'SMS' | 'EMAIL';
  status: 'DRAFT' | 'SENT';
}

export interface DispatchDoc2nd {
  docNo: string;
  refDoc1stNo: string;
  issuedAt: string;
  recipientCompany: string;
  recipientManager: string;
  recipientPhone: string;
  recipientEmail: string;
  siteCompany: string;
  equipmentModel: string;
  serialNumber: string;
  engineerName: string;
  visitedAt: string;
  rootCause: string;
  actionTaken: string;
  parts: EstimatePartItem[];
  techLaborFee: number;
  travelFee: number;
  supplyTotal: number;
  vat: number;
  grandTotal: number;
  bankInfo: string;
  sentAt?: string;
  sentChannel?: 'KAKAO' | 'SMS' | 'EMAIL';
  approvalStatus: 'PENDING' | 'SENT' | 'APPROVED';
}

export type DispatchChannelType = 'KAKAO' | 'SMS' | 'EMAIL';

interface DispatchDocPackageModalProps {
  initialDoc1st?: Partial<DispatchDoc1st>;
  initialDoc2nd?: Partial<DispatchDoc2nd>;
  initialTab?: 'doc1' | 'doc2';
  onClose: () => void;
  onSave?: (doc1: DispatchDoc1st, doc2: DispatchDoc2nd) => void;
  onToast?: (msg: string) => void;
}

export function DispatchDocPackageModal({
  initialDoc1st,
  initialDoc2nd,
  initialTab = 'doc1',
  onClose,
  onSave,
  onToast,
}: DispatchDocPackageModalProps) {
  const now = new Date();
  const dateFormatted = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;
  const tomorrowFormatted = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate() + 1).padStart(2, '0')} 14:00`;

  const [activeTab, setActiveTab] = useState<'doc1' | 'doc2'>(initialTab);
  const [selectedModel, setSelectedModel] = useState<string>(() =>
    resolveModelKey(initialDoc1st?.equipmentModel || initialDoc2nd?.equipmentModel)
  );
  const [includeVisual, setIncludeVisual] = useState<boolean>(true);

  const [doc1, setDoc1] = useState<DispatchDoc1st>(() => ({
    docNo: initialDoc1st?.docNo || `AS-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-01`,
    issuedAt: initialDoc1st?.issuedAt || dateFormatted,
    recipientCompany: initialDoc1st?.recipientCompany || '',
    recipientManager: initialDoc1st?.recipientManager || '',
    recipientPhone: initialDoc1st?.recipientPhone || '',
    recipientEmail: initialDoc1st?.recipientEmail || '',
    siteCompany: initialDoc1st?.siteCompany || '',
    siteWorkerName: initialDoc1st?.siteWorkerName || '',
    siteWorkerPhone: initialDoc1st?.siteWorkerPhone || '',
    equipmentModel: initialDoc1st?.equipmentModel || selectedModel,
    serialNumber: initialDoc1st?.serialNumber || '',
    salesType: initialDoc1st?.salesType || '렌탈',
    symptoms: initialDoc1st?.symptoms?.length ? initialDoc1st.symptoms : ['현장 점검 요청'],
    selectedErrorCodes: initialDoc1st?.selectedErrorCodes || [],
    evidenceSteps: initialDoc1st?.evidenceSteps?.length
      ? initialDoc1st.evidenceSteps
      : [
          { stepNo: 1, title: '전원·차단기 점검', method: '전압 확인', result: 'NORMAL', note: '정상' },
          { stepNo: 2, title: '소모품·호스 점검', method: '외관 확인', result: 'NORMAL', note: '정상' },
          { stepNo: 3, title: '구동부·모터 점검', method: '작동 확인', result: 'FAULT', note: '출장 정비 필요' },
        ],
    failureReason: initialDoc1st?.failureReason || '현장 자가점검 후 엔지니어 방문 점검 확정',
    assignedEngineer: initialDoc1st?.assignedEngineer || '이정민 주임',
    engineerPhone: initialDoc1st?.engineerPhone || '010-4444-5555',
    engineerCenter: initialDoc1st?.engineerCenter || '직영 AS센터',
    plannedVisitAt: initialDoc1st?.plannedVisitAt || tomorrowFormatted,
    sitePreparation: initialDoc1st?.sitePreparation || '',
    status: 'DRAFT',
  }));

  const bundle = useMemo(() => getModelCatalogBundle(selectedModel), [selectedModel]);
  const structVisual = useMemo(
    () => bundle.visualCards.find(v => v.section === '구조') || bundle.visualCards[0] || null,
    [bundle]
  );

  const [doc2Parts, setDoc2Parts] = useState<EstimatePartItem[]>(() => {
    if (initialDoc2nd?.parts?.length) return initialDoc2nd.parts;
    return bundle.parts.slice(0, 2).map(p => ({
      id: p.id,
      name: p.part_name,
      partCode: p.part_code,
      qty: 1,
      unitPrice: p.unit_price,
      supplyPrice: p.unit_price,
      imageUrl: p.image_url,
    }));
  });
  const [techLaborFee, setTechLaborFee] = useState<number>(initialDoc2nd?.techLaborFee ?? 50000);
  const [travelFee, setTravelFee] = useState<number>(initialDoc2nd?.travelFee ?? 30000);

  const [recipientTarget, setRecipientTarget] = useState<'PRIME' | 'SITE'>('PRIME');
  const [channel, setChannel] = useState<DispatchChannelType>('KAKAO');
  const [copied, setCopied] = useState<boolean>(false);

  const receiverName =
    recipientTarget === 'PRIME'
      ? doc1.recipientManager || doc1.recipientCompany
      : doc1.siteWorkerName || doc1.siteCompany;

  const receiverContact =
    channel === 'EMAIL'
      ? doc1.recipientEmail
      : recipientTarget === 'PRIME'
        ? doc1.recipientPhone
        : doc1.siteWorkerPhone || doc1.recipientPhone;

  const togglePart = (item: typeof bundle.parts[number]) => {
    setDoc2Parts(prev => {
      const exists = prev.find(p => p.partCode === item.part_code);
      if (exists) return prev.filter(p => p.partCode !== item.part_code);
      return [
        ...prev,
        {
          id: item.id,
          name: item.part_name,
          partCode: item.part_code,
          qty: 1,
          unitPrice: item.unit_price,
          supplyPrice: item.unit_price,
          imageUrl: item.image_url,
        },
      ];
    });
  };

  const updatePartQty = (partCode: string, delta: number) => {
    setDoc2Parts(prev =>
      prev
        .map(p => {
          if (p.partCode !== partCode) return p;
          const next = p.qty + delta;
          if (next <= 0) return null;
          return { ...p, qty: next, supplyPrice: next * p.unitPrice };
        })
        .filter((p): p is EstimatePartItem => Boolean(p))
    );
  };

  const partsTotal = useMemo(
    () => doc2Parts.reduce((acc, p) => acc + p.qty * p.unitPrice, 0),
    [doc2Parts]
  );
  const supplyTotal = partsTotal + techLaborFee + travelFee;
  const vat = Math.round(supplyTotal * 0.1);
  const grandTotal = supplyTotal + vat;

  const previewText = useMemo(() => {
    if (activeTab === 'doc1') {
      return [
        `[스페이스] ${selectedModel} 출장 접수증 (${doc1.docNo})`,
        `고객사: ${doc1.recipientCompany || '-'} / ${receiverName || '-'}`,
        `증상: ${doc1.symptoms.join(', ')}`,
        `방문예정: ${doc1.plannedVisitAt}`,
        `담당기사: ${doc1.assignedEngineer} (${doc1.engineerPhone})`,
      ].join('\n');
    }
    const lines = [
      `[스페이스] ${selectedModel} 출장 정비 견적서`,
      `고객사: ${doc1.recipientCompany || '-'} / ${receiverName || '-'}`,
      '',
      ...doc2Parts.map((p, i) => `${i + 1}. ${p.name} × ${p.qty} = ₩${(p.qty * p.unitPrice).toLocaleString()}`),
      `기술료: ₩${techLaborFee.toLocaleString()} / 출장비: ₩${travelFee.toLocaleString()}`,
      `합계(VAT포함): ₩${grandTotal.toLocaleString()}`,
    ];
    return lines.join('\n');
  }, [activeTab, selectedModel, doc1, receiverName, doc2Parts, techLaborFee, travelFee, grandTotal]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(previewText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  };

  const handleSend = () => {
    const doc2Obj: DispatchDoc2nd = {
      docNo: `EST-${doc1.docNo}`,
      refDoc1stNo: doc1.docNo,
      issuedAt: doc1.issuedAt,
      recipientCompany: doc1.recipientCompany,
      recipientManager: doc1.recipientManager,
      recipientPhone: doc1.recipientPhone,
      recipientEmail: doc1.recipientEmail,
      siteCompany: doc1.siteCompany,
      equipmentModel: selectedModel,
      serialNumber: doc1.serialNumber,
      engineerName: doc1.assignedEngineer,
      visitedAt: doc1.plannedVisitAt,
      rootCause: doc1.symptoms.join(', '),
      actionTaken: '부품 교체 및 점검',
      parts: doc2Parts,
      techLaborFee,
      travelFee,
      supplyTotal,
      vat,
      grandTotal,
      bankInfo: '',
      sentChannel: channel,
      approvalStatus: 'SENT',
    };
    onSave?.({ ...doc1, equipmentModel: selectedModel, sentChannel: channel, status: 'SENT' }, doc2Obj);
    const chLabel = channel === 'KAKAO' ? '카톡' : channel === 'SMS' ? '문자' : '이메일';
    onToast?.(
      `[${activeTab === 'doc1' ? '출장 접수증' : '정비 견적서'} 발송] ${selectedModel} → ${receiverName || '고객'} (${chLabel})`
    );
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          width: '1120px',
          maxWidth: '98vw',
          height: '85vh',
          borderRadius: '10px',
          border: '1px solid #cbd5e1',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 16px 36px rgba(15, 23, 42, 0.22)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ① 상단 바 (헌장 3.1 건조 명사, 3.2 nowrap) */}
        <div
          style={{
            height: '50px',
            padding: '0 16px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#f8fafc',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap' }}>
              출장 문서 조립 발송
            </span>

            <div style={{ width: '1px', height: '16px', backgroundColor: '#cbd5e1' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', whiteSpace: 'nowrap' }}>
                상담 모델
              </span>
              <select
                value={selectedModel}
                onChange={e => setSelectedModel(e.target.value)}
                style={{
                  height: '30px',
                  padding: '0 10px',
                  borderRadius: '6px',
                  border: '1px solid #94a3b8',
                  backgroundColor: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 800,
                  color: '#0f172a',
                  cursor: 'pointer',
                }}
              >
                {MODEL_KEYS.map(m => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '4px', marginLeft: '6px' }}>
              {[
                { key: 'doc1' as const, label: '1차 출장 접수증' },
                { key: 'doc2' as const, label: '2차 정비 견적서' },
              ].map(t => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setActiveTab(t.key)}
                  style={{
                    height: '30px',
                    padding: '0 12px',
                    borderRadius: '6px',
                    border: activeTab === t.key ? '1px solid #0f172a' : '1px solid #cbd5e1',
                    backgroundColor: activeTab === t.key ? '#0f172a' : '#ffffff',
                    color: activeTab === t.key ? '#ffffff' : '#475569',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* ② 본문 2단 */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* 좌측: 입력 및 부품 사진 선택 (56%) */}
          <div
            style={{
              width: '56%',
              borderRight: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              padding: '12px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {activeTab === 'doc1' ? (
              <>
                {/* 출장 일정 및 기사 배정 (상하 스택 3.4) */}
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    padding: '12px',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
                      배정 기사
                    </label>
                    <input
                      type="text"
                      value={doc1.assignedEngineer}
                      onChange={e => setDoc1(prev => ({ ...prev, assignedEngineer: e.target.value }))}
                      style={{
                        height: '30px',
                        padding: '0 8px',
                        borderRadius: '5px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12px',
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
                      기사 연락처
                    </label>
                    <input
                      type="text"
                      value={doc1.engineerPhone}
                      onChange={e => setDoc1(prev => ({ ...prev, engineerPhone: e.target.value }))}
                      style={{
                        height: '30px',
                        padding: '0 8px',
                        borderRadius: '5px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12px',
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
                      방문 일시
                    </label>
                    <input
                      type="text"
                      value={doc1.plannedVisitAt}
                      onChange={e => setDoc1(prev => ({ ...prev, plannedVisitAt: e.target.value }))}
                      style={{
                        height: '30px',
                        padding: '0 8px',
                        borderRadius: '5px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12px',
                      }}
                    />
                  </div>
                </div>

                {/* 접수 증상 */}
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
                    접수 증상
                  </label>
                  <input
                    type="text"
                    value={doc1.symptoms.join(', ')}
                    onChange={e =>
                      setDoc1(prev => ({
                        ...prev,
                        symptoms: e.target.value.split(',').map(s => s.trim()).filter(Boolean),
                      }))
                    }
                    style={{
                      height: '30px',
                      padding: '0 8px',
                      borderRadius: '5px',
                      border: '1px solid #cbd5e1',
                      fontSize: '12px',
                    }}
                  />
                </div>

                {/* 사전 점검 결과 (정상/불량 토글) */}
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap' }}>
                    사전 점검 항목
                  </span>
                  {doc1.evidenceSteps.map((st, idx) => (
                    <div
                      key={st.stepNo}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '7px 10px',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>
                        {idx + 1}. {st.title}
                      </span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {(['NORMAL', 'FAULT'] as const).map(r => (
                          <button
                            key={r}
                            type="button"
                            onClick={() =>
                              setDoc1(prev => ({
                                ...prev,
                                evidenceSteps: prev.evidenceSteps.map(x =>
                                  x.stepNo === st.stepNo ? { ...x, result: r } : x
                                ),
                              }))
                            }
                            style={{
                              height: '24px',
                              padding: '0 8px',
                              borderRadius: '4px',
                              border:
                                st.result === r
                                  ? r === 'FAULT'
                                    ? '1px solid #dc2626'
                                    : '1px solid #16a34a'
                                  : '1px solid #cbd5e1',
                              backgroundColor:
                                st.result === r
                                  ? r === 'FAULT'
                                    ? '#fef2f2'
                                    : '#f0fdf4'
                                  : '#ffffff',
                              color:
                                st.result === r
                                  ? r === 'FAULT'
                                    ? '#dc2626'
                                    : '#15803d'
                                  : '#64748b',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {r === 'NORMAL' ? '정상' : '점검필요'}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                {/* 2차 정비 견적서: 기술료/출장비 + 모델 부품 사진 클릭 조립 */}
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    padding: '10px 12px',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
                      기술료 (원)
                    </label>
                    <input
                      type="number"
                      value={techLaborFee}
                      onChange={e => setTechLaborFee(Number(e.target.value) || 0)}
                      style={{
                        height: '30px',
                        padding: '0 8px',
                        borderRadius: '5px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12px',
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
                      출장비 (원)
                    </label>
                    <input
                      type="number"
                      value={travelFee}
                      onChange={e => setTravelFee(Number(e.target.value) || 0)}
                      style={{
                        height: '30px',
                        padding: '0 8px',
                        borderRadius: '5px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12px',
                      }}
                    />
                  </div>
                </div>

                {/* 교체 부품 사진 선택 그리드 */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '8px',
                  }}
                >
                  {bundle.parts.map(part => {
                    const selected = doc2Parts.find(p => p.partCode === part.part_code);
                    return (
                      <div
                        key={part.part_code}
                        onClick={() => togglePart(part)}
                        style={{
                          borderRadius: '8px',
                          border: selected ? '2px solid #2563eb' : '1px solid #cbd5e1',
                          backgroundColor: '#ffffff',
                          overflow: 'hidden',
                          cursor: 'pointer',
                        }}
                      >
                        <div
                          style={{
                            position: 'relative',
                            height: '110px',
                            backgroundColor: '#ffffff',
                            borderBottom: '1px solid #f1f5f9',
                          }}
                        >
                          <img
                            src={part.image_url}
                            alt={part.part_name}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'contain',
                              padding: '6px',
                            }}
                          />
                          <div
                            style={{
                              position: 'absolute',
                              top: '6px',
                              left: '6px',
                              width: '20px',
                              height: '20px',
                              borderRadius: '4px',
                              backgroundColor: selected ? '#2563eb' : '#e2e8f0',
                              color: selected ? '#ffffff' : '#64748b',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '11px',
                              fontWeight: 800,
                            }}
                          >
                            {selected ? selected.qty : <Check size={12} />}
                          </div>
                        </div>
                        <div style={{ padding: '6px 8px' }}>
                          <div
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              color: '#0f172a',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {part.part_name}
                          </div>
                          <div style={{ fontSize: '11px', fontWeight: 800, color: '#2563eb' }}>
                            ₩{part.unit_price.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* 우측: 조립 미리보기 및 발송 (44%) */}
          <div
            style={{
              width: '44%',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#ffffff',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '10px 14px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#f8fafc',
              }}
            >
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap' }}>
                [{selectedModel}] {activeTab === 'doc1' ? '출장 접수증' : '정비 견적서'} 조립본
              </span>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#475569',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                <input
                  type="checkbox"
                  checked={includeVisual}
                  onChange={e => setIncludeVisual(e.target.checked)}
                />
                구조 도해 포함
              </label>
            </div>

            <div
              style={{
                flex: 1,
                padding: '12px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                backgroundColor: '#f1f5f9',
              }}
            >
              {includeVisual && structVisual && (
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      padding: '5px 10px',
                      borderBottom: '1px solid #f1f5f9',
                      fontSize: '11px',
                      fontWeight: 800,
                      color: '#0f172a',
                    }}
                  >
                    {structVisual.title}
                  </div>
                  <img
                    src={structVisual.imageUrl}
                    alt={structVisual.title}
                    style={{
                      width: '100%',
                      maxHeight: '150px',
                      objectFit: 'contain',
                      backgroundColor: '#ffffff',
                      display: 'block',
                    }}
                  />
                </div>
              )}

              {activeTab === 'doc1' ? (
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    padding: '10px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    fontSize: '12px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>문서번호</span>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>{doc1.docNo}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>방문일시</span>
                    <span style={{ fontWeight: 700, color: '#2563eb' }}>{doc1.plannedVisitAt}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>담당기사</span>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>
                      {doc1.assignedEngineer} ({doc1.engineerPhone})
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>접수증상</span>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>{doc1.symptoms.join(', ')}</span>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {doc2Parts.map(p => (
                    <div
                      key={p.partCode}
                      style={{
                        backgroundColor: '#ffffff',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        padding: '7px 10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      {p.imageUrl && (
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          style={{ width: '36px', height: '36px', objectFit: 'contain' }}
                        />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: '12px',
                            fontWeight: 700,
                            color: '#0f172a',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {p.name}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          ₩{p.unitPrice.toLocaleString()}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button
                          type="button"
                          onClick={() => updatePartQty(p.partCode, -1)}
                          style={{
                            width: '22px',
                            height: '22px',
                            border: '1px solid #cbd5e1',
                            background: '#f8fafc',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Minus size={11} />
                        </button>
                        <span style={{ fontSize: '12px', fontWeight: 800, minWidth: '18px', textAlign: 'center' }}>
                          {p.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => updatePartQty(p.partCode, 1)}
                          style={{
                            width: '22px',
                            height: '22px',
                            border: '1px solid #cbd5e1',
                            background: '#f8fafc',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Plus size={11} />
                        </button>
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 800, color: '#2563eb', minWidth: '68px', textAlign: 'right' }}>
                        ₩{(p.qty * p.unitPrice).toLocaleString()}
                      </div>
                    </div>
                  ))}
                  <div
                    style={{
                      backgroundColor: '#ffffff',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      padding: '8px 12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '12px',
                      fontWeight: 800,
                      color: '#0f172a',
                    }}
                  >
                    <span>합계 (부품+기술료+출장비+VAT)</span>
                    <span style={{ color: '#2563eb' }}>₩{grandTotal.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>

            {/* ④ 우하단 발송 제어부 */}
            <div
              style={{
                padding: '10px 14px',
                borderTop: '1px solid #e2e8f0',
                backgroundColor: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr', gap: '8px', alignItems: 'end' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
                    대상
                  </label>
                  <div style={{ display: 'flex', gap: '3px' }}>
                    {(['PRIME', 'SITE'] as const).map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setRecipientTarget(t)}
                        style={{
                          height: '30px',
                          padding: '0 8px',
                          borderRadius: '5px',
                          border: recipientTarget === t ? '1px solid #0f172a' : '1px solid #cbd5e1',
                          backgroundColor: recipientTarget === t ? '#0f172a' : '#ffffff',
                          color: recipientTarget === t ? '#ffffff' : '#475569',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {t === 'PRIME' ? '원청' : '현장'}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
                    수신인
                  </label>
                  <input
                    type="text"
                    value={receiverName}
                    onChange={e =>
                      recipientTarget === 'PRIME'
                        ? setDoc1(prev => ({ ...prev, recipientManager: e.target.value }))
                        : setDoc1(prev => ({ ...prev, siteWorkerName: e.target.value }))
                    }
                    placeholder="담당자명"
                    style={{
                      height: '30px',
                      padding: '0 8px',
                      borderRadius: '5px',
                      border: '1px solid #cbd5e1',
                      fontSize: '12px',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
                    {channel === 'EMAIL' ? '이메일' : '연락처'}
                  </label>
                  <input
                    type="text"
                    value={receiverContact}
                    onChange={e =>
                      channel === 'EMAIL'
                        ? setDoc1(prev => ({ ...prev, recipientEmail: e.target.value }))
                        : recipientTarget === 'PRIME'
                          ? setDoc1(prev => ({ ...prev, recipientPhone: e.target.value }))
                          : setDoc1(prev => ({ ...prev, siteWorkerPhone: e.target.value }))
                    }
                    placeholder={channel === 'EMAIL' ? 'email@domain.com' : '010-0000-0000'}
                    style={{
                      height: '30px',
                      padding: '0 8px',
                      borderRadius: '5px',
                      border: '1px solid #cbd5e1',
                      fontSize: '12px',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {[
                    { key: 'KAKAO' as const, label: '카톡' },
                    { key: 'SMS' as const, label: '문자' },
                    { key: 'EMAIL' as const, label: '이메일' },
                  ].map(ch => (
                    <button
                      key={ch.key}
                      type="button"
                      onClick={() => setChannel(ch.key)}
                      style={{
                        height: '32px',
                        padding: '0 10px',
                        borderRadius: '6px',
                        border: channel === ch.key ? '1px solid #2563eb' : '1px solid #cbd5e1',
                        backgroundColor: channel === ch.key ? '#eff6ff' : '#ffffff',
                        color: channel === ch.key ? '#1d4ed8' : '#475569',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {ch.label}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    style={{
                      height: '32px',
                      padding: '0 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      color: '#334155',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Printer size={13} /> 인쇄
                  </button>
                  <button
                    type="button"
                    onClick={handleCopy}
                    style={{
                      height: '32px',
                      padding: '0 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      color: '#334155',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Copy size={13} /> {copied ? '복사됨' : '복사'}
                  </button>
                  <button
                    type="button"
                    onClick={handleSend}
                    style={{
                      height: '32px',
                      padding: '0 16px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Send size={13} /> 문서 발송
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
export default DispatchDocPackageModal;
