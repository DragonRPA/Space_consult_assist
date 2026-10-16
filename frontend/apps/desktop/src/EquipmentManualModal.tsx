import React, { useState, useEffect, useMemo } from 'react';
import {
  X, Check, Send, Copy, ExternalLink, ArrowUp, ArrowDown,
  ZoomIn, Layers, Package, FileText
} from 'lucide-react';
import {
  MODEL_KEYS,
  resolveModelKey,
  getModelCatalogBundle,
} from './modelCatalogVisuals';
import { saveManualDispatchRecord } from './equipmentManualsApi';

export interface EquipmentManualModalProps {
  isOpen?: boolean;
  onClose: () => void;
  equipmentModel?: string;
  serialNumber?: string;
  customerName?: string;
  manager?: string;
  phone?: string;
  email?: string;
  siteCompany?: string;
  siteWorkerName?: string;
  siteWorkerPhone?: string;
  symptoms?: string[];
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  primeCompanyName?: string;
  primeContactName?: string;
  primeContactPhone?: string;
  primeContactEmail?: string;
  counselSessionId?: string;
  onToast?: (msg: string) => void;
  onSentSuccess?: (summaryText: string) => void;
}

export const EquipmentManualModal: React.FC<EquipmentManualModalProps> = ({
  isOpen = true,
  onClose,
  equipmentModel = '',
  serialNumber = '',
  customerName = '',
  manager = '',
  phone = '',
  email = '',
  siteCompany = '',
  siteWorkerName = '',
  siteWorkerPhone = '',
  symptoms = [],
  contactName = '',
  contactPhone = '',
  contactEmail = '',
  primeCompanyName = '',
  primeContactName = '',
  primeContactPhone = '',
  primeContactEmail = '',
  onToast,
  onSentSuccess,
}) => {
  const [selectedModel, setSelectedModel] = useState<string>(() => resolveModelKey(equipmentModel));
  const [activeTab, setActiveTab] = useState<'visual' | 'parts' | 'pdf'>('visual');

  // Assembled items (ordered IDs)
  const [selectedVisualIds, setSelectedVisualIds] = useState<string[]>([]);
  const [selectedPartIds, setSelectedPartIds] = useState<string[]>([]);
  const [selectedPdfIds, setSelectedPdfIds] = useState<string[]>([]);

  // Zoomed image modal
  const [zoomImage, setZoomImage] = useState<{ title: string; url: string } | null>(null);

  // Recipient & Channel
  const [recipientTarget, setRecipientTarget] = useState<'SITE' | 'PRIME'>('SITE');
  const [channel, setChannel] = useState<'KAKAO' | 'SMS' | 'EMAIL'>('KAKAO');
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [receiverEmail, setReceiverEmail] = useState('');
  const [customNote, setCustomNote] = useState('');
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);

  // Sync model when modal opens or equipmentModel changes
  useEffect(() => {
    if (!isOpen) return;
    const resolved = resolveModelKey(equipmentModel);
    setSelectedModel(resolved);
  }, [isOpen, equipmentModel]);

  const bundle = useMemo(() => getModelCatalogBundle(selectedModel), [selectedModel]);

  // Auto-assemble default visual cards, top 4 matched parts, and primary manual when model changes
  useEffect(() => {
    const defaultVis = bundle.visualCards.filter(v => v.defaultSelected).map(v => v.id);
    setSelectedVisualIds(defaultVis.length > 0 ? defaultVis : bundle.visualCards.slice(0, 2).map(v => v.id));

    const defaultParts = bundle.parts
      .filter(p => !p.applicable_models.includes('전 기종 공용'))
      .slice(0, 4)
      .map(p => p.id);
    setSelectedPartIds(defaultParts);

    const primaryPdf = bundle.manuals.slice(0, 1).map(m => m.id);
    setSelectedPdfIds(primaryPdf);
  }, [bundle]);

  // Sync recipient fields
  useEffect(() => {
    if (!isOpen) return;
    if (recipientTarget === 'PRIME') {
      setReceiverName(primeContactName || manager || primeCompanyName || customerName || '');
      setReceiverPhone(primeContactPhone || phone || contactPhone || '');
      setReceiverEmail(primeContactEmail || email || contactEmail || '');
    } else {
      setReceiverName(siteWorkerName || contactName || siteCompany || manager || customerName || '');
      setReceiverPhone(siteWorkerPhone || contactPhone || phone || '');
      setReceiverEmail(contactEmail || email || '');
    }
  }, [
    isOpen,
    recipientTarget,
    customerName,
    manager,
    phone,
    email,
    siteCompany,
    siteWorkerName,
    siteWorkerPhone,
    contactName,
    contactPhone,
    contactEmail,
    primeCompanyName,
    primeContactName,
    primeContactPhone,
    primeContactEmail,
  ]);

  const toggleVisual = (id: string) => {
    setSelectedVisualIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const moveVisual = (id: string, dir: -1 | 1) => {
    setSelectedVisualIds(prev => {
      const idx = prev.indexOf(id);
      if (idx < 0) return prev;
      const nextIdx = idx + dir;
      if (nextIdx < 0 || nextIdx >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(idx, 1);
      copy.splice(nextIdx, 0, item);
      return copy;
    });
  };

  const togglePart = (id: string) => {
    setSelectedPartIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const togglePdf = (id: string) => {
    setSelectedPdfIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const assembledVisuals = useMemo(
    () =>
      selectedVisualIds
        .map(id => bundle.visualCards.find(v => v.id === id))
        .filter((v): v is NonNullable<typeof v> => Boolean(v)),
    [selectedVisualIds, bundle.visualCards]
  );

  const assembledParts = useMemo(
    () =>
      selectedPartIds
        .map(id => bundle.parts.find(p => p.id === id))
        .filter((p): p is NonNullable<typeof p> => Boolean(p)),
    [selectedPartIds, bundle.parts]
  );

  const assembledPdfs = useMemo(
    () =>
      selectedPdfIds
        .map(id => bundle.manuals.find(m => m.id === id))
        .filter((m): m is NonNullable<typeof m> => Boolean(m)),
    [selectedPdfIds, bundle.manuals]
  );

  const totalSelectedCount = assembledVisuals.length + assembledParts.length + assembledPdfs.length;

  const messagePreview = useMemo(() => {
    const lines: string[] = [];
    lines.push(`[스페이스] ${bundle.label} 맞춤 카탈로그`);
    if (receiverName) lines.push(`수신: ${receiverName}`);
    lines.push('');

    if (assembledVisuals.length > 0) {
      lines.push(`■ 도해·제원 (${assembledVisuals.length}건)`);
      assembledVisuals.forEach((v, i) => {
        lines.push(`${i + 1}. ${v.title}`);
      });
      lines.push('');
    }

    if (assembledParts.length > 0) {
      lines.push(`■ 전용 소모품 (${assembledParts.length}건)`);
      assembledParts.forEach(p => {
        lines.push(`- ${p.part_name}: ${p.unit_price.toLocaleString()}원`);
      });
      lines.push('');
    }

    if (assembledPdfs.length > 0) {
      lines.push(`■ 첨부 문서 (${assembledPdfs.length}건)`);
      assembledPdfs.forEach(m => {
        lines.push(`- ${m.title}: ${m.file_url}`);
      });
      lines.push('');
    }

    if (customNote.trim()) {
      lines.push(`메모: ${customNote.trim()}`);
    }
    return lines.join('\n').trim();
  }, [bundle.label, receiverName, assembledVisuals, assembledParts, assembledPdfs, customNote]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(messagePreview);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  };

  const handleSend = async () => {
    if (totalSelectedCount === 0) return;
    setSending(true);
    try {
      const nowStr = new Date().toISOString();
      await saveManualDispatchRecord({
        dispatch_id: `MD-${Date.now()}`,
        doc_no: `MAN-${nowStr.slice(2, 10).replace(/-/g, '')}`,
        customer_name: customerName || receiverName,
        manager: receiverName,
        phone: receiverPhone,
        email: receiverEmail,
        site_company: siteCompany,
        site_worker_name: siteWorkerName,
        site_worker_phone: siteWorkerPhone,
        primary_recipient: recipientTarget === 'PRIME' ? 'MANAGER' : 'WORKER',
        dispatch_channel: channel,
        recipient_contact: channel === 'EMAIL' ? receiverEmail : receiverPhone,
        equipment_model: bundle.label,
        serial_number: serialNumber,
        symptoms,
        attached_manuals: assembledPdfs.map(m => ({
          id: m.id,
          manual_code: m.manual_code,
          title: m.title,
          file_name: m.file_name,
          file_size_label: m.file_size_label,
          file_url: m.file_url,
        })),
        message_note: messagePreview,
        created_at: nowStr,
      });
      const chLabel = channel === 'KAKAO' ? '카톡' : channel === 'SMS' ? '문자' : '이메일';
      const summary = `[카탈로그 발송] ${bundle.label} (도해 ${assembledVisuals.length}·부품 ${assembledParts.length}·PDF ${assembledPdfs.length}) → ${receiverName || '고객'} (${chLabel})`;
      onToast?.(summary);
      onSentSuccess?.(summary);
      onClose();
    } finally {
      setSending(false);
    }
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
          width: '1140px',
          maxWidth: '98vw',
          height: '86vh',
          borderRadius: '10px',
          border: '1px solid #cbd5e1',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 16px 36px rgba(15, 23, 42, 0.22)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ① 상단 바 (헌장 3.1 건조 명사, 3.2 nowrap, 3.5 좌상단 Scope) */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap' }}>
              카탈로그 조립 발송
            </span>

            <div style={{ width: '1px', height: '16px', backgroundColor: '#cbd5e1' }} />

            {/* 상담 모델 선택 */}
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
                  outline: 'none',
                }}
              >
                {MODEL_KEYS.map(m => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* 소스 탭 (도해·제원 / 소모품 사진 / PDF 원본) */}
            <div style={{ display: 'flex', gap: '4px', marginLeft: '6px' }}>
              {[
                { key: 'visual' as const, label: `도해·제원 (${bundle.visualCards.length})`, icon: Layers },
                { key: 'parts' as const, label: `소모품 사진 (${bundle.parts.length})`, icon: Package },
                { key: 'pdf' as const, label: `PDF 문서 (${bundle.manuals.length})`, icon: FileText },
              ].map(tab => {
                const Icon = tab.icon;
                const active = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    style={{
                      height: '30px',
                      padding: '0 10px',
                      borderRadius: '6px',
                      border: active ? '1px solid #0f172a' : '1px solid #cbd5e1',
                      backgroundColor: active ? '#0f172a' : '#ffffff',
                      color: active ? '#ffffff' : '#475569',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Icon size={13} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <button
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

        {/* ② 본문 2단 영역: 좌측 사진 블록 선택 팔레트 (58%) | 우측 조립 미리보기 및 발송 (42%) */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* 좌측: 추출 사진 팔레트 */}
          <div
            style={{
              width: '58%',
              borderRight: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              padding: '12px',
              overflowY: 'auto',
            }}
          >
            {activeTab === 'visual' && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '10px',
                }}
              >
                {bundle.visualCards.map(card => {
                  const isSelected = selectedVisualIds.includes(card.id);
                  const orderIdx = selectedVisualIds.indexOf(card.id);
                  return (
                    <div
                      key={card.id}
                      onClick={() => toggleVisual(card.id)}
                      style={{
                        borderRadius: '8px',
                        border: isSelected ? '2px solid #2563eb' : '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      <div
                        style={{
                          position: 'relative',
                          height: '220px',
                          backgroundColor: '#f1f5f9',
                          borderBottom: '1px solid #e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                        }}
                      >
                        <img
                          src={card.imageUrl}
                          alt={card.title}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            backgroundColor: '#ffffff',
                          }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            top: '8px',
                            left: '8px',
                            width: '22px',
                            height: '22px',
                            borderRadius: '5px',
                            backgroundColor: isSelected ? '#2563eb' : 'rgba(15,23,42,0.55)',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            fontWeight: 800,
                          }}
                        >
                          {isSelected ? orderIdx + 1 : <Check size={12} />}
                        </div>
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            setZoomImage({ title: card.title, url: card.imageUrl });
                          }}
                          style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            width: '26px',
                            height: '26px',
                            borderRadius: '5px',
                            border: '1px solid #cbd5e1',
                            backgroundColor: 'rgba(255,255,255,0.92)',
                            color: '#0f172a',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                          title="확대"
                        >
                          <ZoomIn size={13} />
                        </button>
                      </div>
                      <div
                        style={{
                          padding: '8px 10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '6px',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 800,
                            color: '#0f172a',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {card.title}
                        </span>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: isSelected ? '#dbeafe' : '#f1f5f9',
                            color: isSelected ? '#1d4ed8' : '#64748b',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {card.section}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'parts' && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '8px',
                }}
              >
                {bundle.parts.map(part => {
                  const isSelected = selectedPartIds.includes(part.id);
                  return (
                    <div
                      key={part.id}
                      onClick={() => togglePart(part.id)}
                      style={{
                        borderRadius: '8px',
                        border: isSelected ? '2px solid #2563eb' : '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      <div
                        style={{
                          position: 'relative',
                          height: '118px',
                          backgroundColor: '#ffffff',
                          borderBottom: '1px solid #f1f5f9',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
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
                            backgroundColor: isSelected ? '#2563eb' : '#e2e8f0',
                            color: isSelected ? '#ffffff' : '#64748b',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Check size={12} />
                        </div>
                      </div>
                      <div style={{ padding: '7px 8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#0f172a',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                          title={part.part_name}
                        >
                          {part.part_name}
                        </div>
                        <div
                          style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            color: '#2563eb',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          ₩{part.unit_price.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'pdf' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {bundle.manuals.map(man => {
                  const isSelected = selectedPdfIds.includes(man.id);
                  return (
                    <div
                      key={man.id}
                      onClick={() => togglePdf(man.id)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: isSelected ? '2px solid #2563eb' : '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                        <div
                          style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '4px',
                            backgroundColor: isSelected ? '#2563eb' : '#e2e8f0',
                            color: isSelected ? '#ffffff' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <Check size={12} />
                        </div>
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 800,
                            color: '#0f172a',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {man.title}
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            color: '#64748b',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {man.file_size_label}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          window.open(man.file_url, '_blank', 'noopener,noreferrer');
                        }}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '5px',
                          border: '1px solid #cbd5e1',
                          backgroundColor: '#f8fafc',
                          color: '#334155',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <ExternalLink size={11} /> 열기
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 우측: 모델 조립 시트 & 발송 패널 */}
          <div
            style={{
              width: '42%',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#ffffff',
              overflow: 'hidden',
            }}
          >
            {/* 조립 시트 헤더 */}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap' }}>
                  [{bundle.label}] 조립 시트
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: '4px',
                    backgroundColor: '#dbeafe',
                    color: '#1d4ed8',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {totalSelectedCount}건
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedVisualIds([]);
                  setSelectedPartIds([]);
                  setSelectedPdfIds([]);
                }}
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#64748b',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                비우기
              </button>
            </div>

            {/* 조립된 사진·부품 미리보기 스트립 */}
            <div
              style={{
                flex: 1,
                padding: '12px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                backgroundColor: '#f1f5f9',
              }}
            >
              {/* 1) 조립된 도해·제원 사진 카드 */}
              {assembledVisuals.map((v, idx) => (
                <div
                  key={v.id}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      padding: '6px 10px',
                      borderBottom: '1px solid #f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap' }}>
                      {idx + 1}. {v.title}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <button
                        type="button"
                        onClick={() => moveVisual(v.id, -1)}
                        disabled={idx === 0}
                        style={{
                          border: '1px solid #e2e8f0',
                          background: '#f8fafc',
                          borderRadius: '4px',
                          padding: '2px',
                          cursor: idx === 0 ? 'default' : 'pointer',
                          opacity: idx === 0 ? 0.35 : 1,
                        }}
                      >
                        <ArrowUp size={11} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveVisual(v.id, 1)}
                        disabled={idx === assembledVisuals.length - 1}
                        style={{
                          border: '1px solid #e2e8f0',
                          background: '#f8fafc',
                          borderRadius: '4px',
                          padding: '2px',
                          cursor: idx === assembledVisuals.length - 1 ? 'default' : 'pointer',
                          opacity: idx === assembledVisuals.length - 1 ? 0.35 : 1,
                        }}
                      >
                        <ArrowDown size={11} />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleVisual(v.id)}
                        style={{
                          border: '1px solid #fecaca',
                          background: '#fef2f2',
                          color: '#dc2626',
                          borderRadius: '4px',
                          padding: '2px',
                          cursor: 'pointer',
                        }}
                      >
                        <X size={11} />
                      </button>
                    </div>
                  </div>
                  <img
                    src={v.imageUrl}
                    alt={v.title}
                    onClick={() => setZoomImage({ title: v.title, url: v.imageUrl })}
                    style={{
                      width: '100%',
                      maxHeight: '190px',
                      objectFit: 'contain',
                      backgroundColor: '#ffffff',
                      cursor: 'zoom-in',
                      display: 'block',
                    }}
                  />
                </div>
              ))}

              {/* 2) 조립된 소모품 사진 그리드 */}
              {assembledParts.length > 0 && (
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    padding: '8px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      color: '#0f172a',
                      marginBottom: '6px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    전용 소모품 ({assembledParts.length})
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                    {assembledParts.map(p => (
                      <div
                        key={p.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '5px',
                          borderRadius: '6px',
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        <img
                          src={p.image_url}
                          alt={p.part_name}
                          style={{
                            width: '38px',
                            height: '38px',
                            objectFit: 'contain',
                            borderRadius: '4px',
                            flexShrink: 0,
                          }}
                        />
                        <div style={{ minWidth: 0, flex: 1 }}>
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
                            {p.part_name}
                          </div>
                          <div style={{ fontSize: '10px', fontWeight: 800, color: '#2563eb' }}>
                            ₩{p.unit_price.toLocaleString()}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => togglePart(p.id)}
                          style={{
                            border: 'none',
                            background: 'none',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            padding: '2px',
                          }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3) 첨부 PDF */}
              {assembledPdfs.length > 0 && (
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    padding: '8px 10px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '6px',
                  }}
                >
                  {assembledPdfs.map(m => (
                    <span
                      key={m.id}
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '4px',
                        backgroundColor: '#f1f5f9',
                        color: '#334155',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      PDF · {m.title}
                      <X
                        size={11}
                        style={{ cursor: 'pointer', color: '#94a3b8' }}
                        onClick={() => togglePdf(m.id)}
                      />
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* ④ 우하단 발송 제어부 (헌장 3.4 상하 스택, 3.5 Terminal Action) */}
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
                    {(['SITE', 'PRIME'] as const).map(t => (
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
                        {t === 'SITE' ? '현장' : '원청'}
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
                    onChange={e => setReceiverName(e.target.value)}
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
                    value={channel === 'EMAIL' ? receiverEmail : receiverPhone}
                    onChange={e =>
                      channel === 'EMAIL'
                        ? setReceiverEmail(e.target.value)
                        : setReceiverPhone(e.target.value)
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

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
                  메모
                </label>
                <input
                  type="text"
                  value={customNote}
                  onChange={e => setCustomNote(e.target.value)}
                  placeholder="발송 메모"
                  style={{
                    height: '28px',
                    padding: '0 8px',
                    borderRadius: '5px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12px',
                  }}
                />
              </div>

              {/* 발송 수단 & 최종 발송 버튼 */}
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
                    <Copy size={13} />
                    {copied ? '복사됨' : '복사'}
                  </button>
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={sending || totalSelectedCount === 0}
                    style={{
                      height: '32px',
                      padding: '0 16px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: totalSelectedCount === 0 ? '#94a3b8' : '#2563eb',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: 800,
                      cursor: totalSelectedCount === 0 ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Send size={13} />
                    {sending ? '발송중' : '조립본 발송'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 확대 보기 모달 */}
      {zoomImage && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.8)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
          onClick={() => setZoomImage(null)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '10px',
              maxWidth: '90vw',
              maxHeight: '90vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div
              style={{
                padding: '10px 14px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                {zoomImage.title}
              </span>
              <button
                type="button"
                onClick={() => setZoomImage(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>
            <img
              src={zoomImage.url}
              alt={zoomImage.title}
              style={{
                maxWidth: '88vw',
                maxHeight: '82vh',
                objectFit: 'contain',
                backgroundColor: '#ffffff',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
export default EquipmentManualModal;
