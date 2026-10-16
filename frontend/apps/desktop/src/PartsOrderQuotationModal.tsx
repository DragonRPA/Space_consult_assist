import { useState, useEffect, useMemo } from 'react';
import {
  X, Printer, Send, Plus, Minus, Copy, Search, Check, Layers
} from 'lucide-react';
import {
  type CatalogPartItem,
  type PartsOrderRecord,
  getAllPartsCatalog,
  submitPartsOrder,
} from './partsCatalogApi';
import {
  MODEL_KEYS,
  resolveModelKey,
  getModelCatalogBundle,
} from './modelCatalogVisuals';

export type DispatchChannelType = 'KAKAO' | 'SMS' | 'EMAIL';
export type PrimaryRecipientType = 'WORKER' | 'MANAGER';

export interface ConsumablePartItem {
  id: string;
  name: string;
  partCode: string;
  spec: string;
  qty: number;
  unitPrice: number;
  supplyPrice: number;
  isSelected: boolean;
  imageUrl?: string;
  category?: string;
}

export interface PartsQuotationDoc {
  docNo: string;
  issuedAt: string;
  recipientCompany: string;
  recipientManager: string;
  recipientPhone: string;
  recipientEmail: string;
  siteCompany: string;
  siteWorkerName: string;
  siteWorkerPhone: string;
  primaryRecipient: PrimaryRecipientType;
  isCcEnabled: boolean;
  equipmentModel: string;
  serialNumber: string;
  symptoms: string[];
  justificationReason: string;
  parts: ConsumablePartItem[];
  shippingFee: number;
  supplyTotal: number;
  vat: number;
  grandTotal: number;
  bankInfo: string;
  deliveryMethod: '택배(CJ대한통운)' | '화물직배송' | '엔지니어직접수령';
  deliveryAddress: string;
  sentAt?: string;
  sentChannel?: DispatchChannelType;
  approvalStatus: 'PENDING' | 'SENT' | 'APPROVED' | 'DISPATCHED';
  orderId?: string;
  photoEvidenceUrl?: string;
}

interface PartsOrderQuotationModalProps {
  equipmentModel: string;
  customerName: string;
  manager: string;
  phone: string;
  email?: string;
  siteCompany?: string;
  siteWorkerName?: string;
  siteWorkerPhone?: string;
  serialNumber?: string;
  symptoms?: string[];
  onClose: () => void;
  onToast?: (msg: string) => void;
}

const CATEGORIES = ['전체', '스퀴지/고무', '브러시/패드', '모터/전장', '세제/약품'];

export function PartsOrderQuotationModal({
  equipmentModel,
  customerName,
  manager,
  phone,
  email,
  siteCompany,
  siteWorkerName,
  siteWorkerPhone,
  serialNumber: _serialNumber,
  symptoms: _symptoms = [],
  onClose,
  onToast,
}: PartsOrderQuotationModalProps) {
  const [selectedModel, setSelectedModel] = useState<string>(() =>
    equipmentModel?.trim() ? resolveModelKey(equipmentModel) : 'S7P'
  );
  const [filterAllModels, setFilterAllModels] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('전체');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [includeStructDiagram, setIncludeStructDiagram] = useState<boolean>(true);

  const modelBundle = useMemo(() => getModelCatalogBundle(selectedModel), [selectedModel]);
  const structCard = useMemo(
    () =>
      modelBundle.visualCards.find(v => v.section === '구조') ||
      modelBundle.visualCards[0] ||
      null,
    [modelBundle]
  );

  const [allCatalogList, setAllCatalogList] = useState<CatalogPartItem[]>(() =>
    modelBundle.parts as unknown as CatalogPartItem[]
  );
  const [cartItems, setCartItems] = useState<ConsumablePartItem[]>([]);
  const [shippingFee, setShippingFee] = useState<number>(4000);

  const [primaryRecipient, setPrimaryRecipient] = useState<PrimaryRecipientType>('MANAGER');
  const [sentChannel, setSentChannel] = useState<DispatchChannelType>('KAKAO');
  const [receiverName, setReceiverName] = useState<string>(manager || customerName || '');
  const [receiverContact, setReceiverContact] = useState<string>(phone || '');
  const [deliveryAddress, setDeliveryAddress] = useState<string>(customerName || '');
  const [sending, setSending] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Load catalog and auto-pick 2 matched consumables for active model
  useEffect(() => {
    let mounted = true;
    getAllPartsCatalog().then(items => {
      if (!mounted) return;
      setAllCatalogList(items);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Auto-populate default model consumables when model changes or catalog loads
  useEffect(() => {
    if (allCatalogList.length === 0) return;
    const aliases = new Set<string>([selectedModel.toUpperCase()]);
    if (selectedModel === 'S7P' || selectedModel === 'The New S7P') {
      aliases.add('S7');
      aliases.add('S7P');
      aliases.add('THE NEW S7P');
    } else if (selectedModel === 'S3') {
      aliases.add('S3P');
    } else if (selectedModel === 'J600') {
      aliases.add('J600T');
    }

    const matched = allCatalogList
      .filter(p => (p.applicable_models || []).some(am => aliases.has(am.toUpperCase())))
      .sort((a, b) => (a.applicable_models?.length || 99) - (b.applicable_models?.length || 99));
    const initial = matched.slice(0, 2).map(p => ({
      id: p.id || p.part_code,
      name: p.part_name,
      partCode: p.part_code,
      spec: p.spec || '',
      qty: 1,
      unitPrice: p.unit_price,
      supplyPrice: p.unit_price,
      isSelected: true,
      imageUrl: p.image_url,
      category: p.category,
    }));
    setCartItems(initial);
  }, [selectedModel, allCatalogList]);

  // Sync recipient target
  useEffect(() => {
    if (primaryRecipient === 'MANAGER') {
      setReceiverName(manager || customerName || '');
      setReceiverContact(sentChannel === 'EMAIL' ? email || '' : phone || '');
    } else {
      setReceiverName(siteWorkerName || siteCompany || manager || '');
      setReceiverContact(siteWorkerPhone || phone || '');
    }
  }, [primaryRecipient, sentChannel, manager, customerName, phone, email, siteWorkerName, siteCompany, siteWorkerPhone]);

  // Filtered catalog items
  const filteredParts = useMemo(() => {
    const aliases = new Set<string>([selectedModel.toUpperCase()]);
    if (selectedModel === 'S7P' || selectedModel === 'The New S7P') {
      aliases.add('S7');
      aliases.add('S7P');
      aliases.add('THE NEW S7P');
    } else if (selectedModel === 'S3') {
      aliases.add('S3P');
    } else if (selectedModel === 'J600') {
      aliases.add('J600T');
    }

    const list = allCatalogList.filter(item => {
      if (!filterAllModels) {
        const models = item.applicable_models || [];
        const modelMatch =
          models.some(m => aliases.has(m.toUpperCase())) ||
          models.some(m => m.includes('전 기종'));
        if (!modelMatch) return false;
      }

      if (selectedCategory !== '전체') {
        const cat = item.category || '';
        if (selectedCategory === '스퀴지/고무' && !cat.includes('스퀴지')) return false;
        if (selectedCategory === '브러시/패드' && !cat.includes('브러시') && !cat.includes('패드')) return false;
        if (selectedCategory === '모터/전장' && !cat.includes('모터') && !cat.includes('전장') && !cat.includes('부품')) return false;
        if (selectedCategory === '세제/약품' && !cat.includes('세제') && !cat.includes('약품')) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const hay = `${item.part_name} ${item.part_code} ${(item.applicable_models || []).join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });

    return [...list].sort(
      (a, b) => (a.applicable_models?.length || 99) - (b.applicable_models?.length || 99)
    );
  }, [allCatalogList, selectedModel, filterAllModels, selectedCategory, searchQuery]);

  const togglePartInCart = (item: CatalogPartItem) => {
    const code = item.part_code;
    setCartItems(prev => {
      const exists = prev.find(p => p.partCode === code);
      if (exists) {
        return prev.filter(p => p.partCode !== code);
      }
      return [
        ...prev,
        {
          id: item.id || code,
          name: item.part_name,
          partCode: code,
          spec: item.spec || '',
          qty: 1,
          unitPrice: item.unit_price,
          supplyPrice: item.unit_price,
          isSelected: true,
          imageUrl: item.image_url,
          category: item.category,
        },
      ];
    });
  };

  const updateQty = (partCode: string, delta: number) => {
    setCartItems(prev =>
      prev
        .map(p => {
          if (p.partCode !== partCode) return p;
          const nextQty = p.qty + delta;
          if (nextQty <= 0) return null;
          return {
            ...p,
            qty: nextQty,
            supplyPrice: nextQty * p.unitPrice,
          };
        })
        .filter((p): p is ConsumablePartItem => Boolean(p))
    );
  };

  const supplyTotal = useMemo(
    () => cartItems.reduce((acc, p) => acc + p.qty * p.unitPrice, 0),
    [cartItems]
  );
  const vat = Math.round(supplyTotal * 0.1);
  const grandTotal = supplyTotal + vat + shippingFee;

  const quoteText = useMemo(() => {
    const lines: string[] = [];
    lines.push(`[스페이스] ${selectedModel} 소모품 견적서`);
    if (receiverName) lines.push(`수신: ${receiverName}`);
    lines.push('');
    cartItems.forEach((p, idx) => {
      lines.push(`${idx + 1}. ${p.name} × ${p.qty}개 = ${(p.qty * p.unitPrice).toLocaleString()}원`);
    });
    lines.push('');
    lines.push(`공급가: ${supplyTotal.toLocaleString()}원`);
    lines.push(`부가세: ${vat.toLocaleString()}원`);
    if (shippingFee > 0) lines.push(`배송비: ${shippingFee.toLocaleString()}원`);
    lines.push(`합계: ${grandTotal.toLocaleString()}원`);
    return lines.join('\n');
  }, [selectedModel, receiverName, cartItems, supplyTotal, vat, shippingFee, grandTotal]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(quoteText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  };

  const handleSend = async () => {
    if (cartItems.length === 0) return;
    setSending(true);
    try {
      const orderNo = `PO-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
      const payload: PartsOrderRecord = {
        order_id: orderNo,
        doc_no: orderNo,
        customer_name: customerName || '미지정',
        manager: receiverName || '담당자',
        phone: receiverContact || phone || '',
        site_company: siteCompany || '',
        site_worker_name: siteWorkerName || '',
        site_worker_phone: siteWorkerPhone || '',
        primary_recipient: primaryRecipient,
        dispatch_channel: sentChannel,
        equipment_model: selectedModel,
        items: cartItems.map(p => ({
          part_code: p.partCode,
          part_name: p.name,
          unit_price: p.unitPrice,
          qty: p.qty,
          total: p.qty * p.unitPrice,
        })),
        supply_total: supplyTotal,
        shipping_fee: shippingFee,
        vat,
        grand_total: grandTotal,
        order_status: 'SENT',
        shipping_address: deliveryAddress,
      };
      await submitPartsOrder(payload);
      const chLabel = sentChannel === 'KAKAO' ? '카톡' : sentChannel === 'SMS' ? '문자' : '이메일';
      onToast?.(`[소모품 견적 발송] ${selectedModel} (${cartItems.length}건 · ₩${grandTotal.toLocaleString()}) → ${receiverName || '고객'} (${chLabel})`);
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
        {/* ① 상단 바 (헌장 3.1 무수식어 건조 명사, 3.2 nowrap, 3.5 좌상단 Scope) */}
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
              소모품 카탈로그·견적 조립
            </span>

            <div style={{ width: '1px', height: '16px', backgroundColor: '#cbd5e1' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', whiteSpace: 'nowrap' }}>
                상담 모델
              </span>
              <select
                value={selectedModel}
                onChange={e => {
                  setSelectedModel(e.target.value);
                  setFilterAllModels(false);
                }}
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

              <button
                type="button"
                onClick={() => setFilterAllModels(prev => !prev)}
                style={{
                  height: '30px',
                  padding: '0 8px',
                  borderRadius: '6px',
                  border: filterAllModels ? '1px solid #0f172a' : '1px solid #cbd5e1',
                  backgroundColor: filterAllModels ? '#0f172a' : '#ffffff',
                  color: filterAllModels ? '#ffffff' : '#475569',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                전체 기종 보기
              </button>
            </div>

            {/* 분류 필터 */}
            <div style={{ display: 'flex', gap: '3px' }}>
              {CATEGORIES.map(cat => {
                const active = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    style={{
                      height: '28px',
                      padding: '0 8px',
                      borderRadius: '5px',
                      border: active ? '1px solid #2563eb' : '1px solid #cbd5e1',
                      backgroundColor: active ? '#eff6ff' : '#ffffff',
                      color: active ? '#1d4ed8' : '#475569',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ position: 'relative', width: '170px' }}>
              <Search
                size={13}
                style={{
                  position: 'absolute',
                  left: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8',
                }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="품명 검색"
                style={{
                  width: '100%',
                  height: '30px',
                  padding: '0 8px 0 26px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12px',
                  boxSizing: 'border-box',
                }}
              />
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
        </div>

        {/* ② 본문 2단: 좌측 추출 사진 그리드 (58%) | 우측 조립 견적 시트 (42%) */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* 좌측: 소모품 사진 그리드 */}
          <div
            style={{
              width: '58%',
              borderRight: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              padding: '12px',
              overflowY: 'auto',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px',
              }}
            >
              {filteredParts.map(item => {
                const inCart = cartItems.find(c => c.partCode === item.part_code);
                return (
                  <div
                    key={item.part_code}
                    onClick={() => togglePartInCart(item)}
                    style={{
                      borderRadius: '8px',
                      border: inCart ? '2px solid #2563eb' : '1px solid #cbd5e1',
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
                        height: '124px',
                        backgroundColor: '#ffffff',
                        borderBottom: '1px solid #f1f5f9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.part_name}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            padding: '6px',
                          }}
                        />
                      ) : (
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>이미지 없음</span>
                      )}
                      <div
                        style={{
                          position: 'absolute',
                          top: '6px',
                          left: '6px',
                          width: '20px',
                          height: '20px',
                          borderRadius: '4px',
                          backgroundColor: inCart ? '#2563eb' : '#e2e8f0',
                          color: inCart ? '#ffffff' : '#64748b',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: 800,
                        }}
                      >
                        {inCart ? inCart.qty : <Check size={12} />}
                      </div>
                    </div>
                    <div style={{ padding: '8px 9px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <div
                        style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          color: '#0f172a',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                        title={item.part_name}
                      >
                        {item.part_name}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: '#2563eb', whiteSpace: 'nowrap' }}>
                          ₩{item.unit_price.toLocaleString()}
                        </span>
                        <span style={{ fontSize: '10px', color: '#64748b', whiteSpace: 'nowrap' }}>
                          {item.category}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 우측: 조립 견적 시트 & 발송 */}
          <div
            style={{
              width: '42%',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#ffffff',
              overflow: 'hidden',
            }}
          >
            {/* 조립 시트 상단 바 */}
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
                  [{selectedModel}] 소모품 견적 조립본
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
                  {cartItems.length}건
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIncludeStructDiagram(prev => !prev)}
                style={{
                  height: '24px',
                  padding: '0 8px',
                  borderRadius: '4px',
                  border: includeStructDiagram ? '1px solid #2563eb' : '1px solid #cbd5e1',
                  backgroundColor: includeStructDiagram ? '#eff6ff' : '#ffffff',
                  color: includeStructDiagram ? '#1d4ed8' : '#64748b',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  whiteSpace: 'nowrap',
                }}
              >
                <Layers size={11} /> 구조 도해 포함
              </button>
            </div>

            {/* 조립된 항목 목록 */}
            <div
              style={{
                flex: 1,
                padding: '10px 12px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                backgroundColor: '#f1f5f9',
              }}
            >
              {includeStructDiagram && structCard && (
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
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap' }}>
                      {structCard.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIncludeStructDiagram(false)}
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
                  <img
                    src={structCard.imageUrl}
                    alt={structCard.title}
                    style={{
                      width: '100%',
                      maxHeight: '145px',
                      objectFit: 'contain',
                      backgroundColor: '#ffffff',
                      display: 'block',
                    }}
                  />
                </div>
              )}

              {cartItems.map(item => (
                <div
                  key={item.partCode}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    padding: '8px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      style={{
                        width: '44px',
                        height: '44px',
                        objectFit: 'contain',
                        borderRadius: '6px',
                        border: '1px solid #f1f5f9',
                        flexShrink: 0,
                      }}
                    />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '12px',
                        fontWeight: 800,
                        color: '#0f172a',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {item.name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap' }}>
                      단가 ₩{item.unitPrice.toLocaleString()}
                    </div>
                  </div>

                  {/* 수량 조절 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={() => updateQty(item.partCode, -1)}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '4px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#f8fafc',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Minus size={11} />
                    </button>
                    <span
                      style={{
                        minWidth: '20px',
                        textAlign: 'center',
                        fontSize: '12px',
                        fontWeight: 800,
                        color: '#0f172a',
                      }}
                    >
                      {item.qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQty(item.partCode, 1)}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '4px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#f8fafc',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Plus size={11} />
                    </button>
                  </div>

                  <div
                    style={{
                      minWidth: '72px',
                      textAlign: 'right',
                      fontSize: '12px',
                      fontWeight: 800,
                      color: '#2563eb',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    ₩{(item.qty * item.unitPrice).toLocaleString()}
                  </div>
                </div>
              ))}

              {cartItems.length === 0 && (
                <div
                  style={{
                    padding: '32px 12px',
                    textAlign: 'center',
                    color: '#94a3b8',
                    fontSize: '12px',
                  }}
                >
                  좌측 사진을 클릭하여 담으세요
                </div>
              )}
            </div>

            {/* 합계 요약 바 */}
            <div
              style={{
                padding: '8px 14px',
                borderTop: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '11px',
                color: '#475569',
              }}
            >
              <span style={{ whiteSpace: 'nowrap' }}>
                공급가 ₩{supplyTotal.toLocaleString()} + VAT ₩{vat.toLocaleString()} + 배송 ₩{shippingFee.toLocaleString()}
              </span>
              <span style={{ fontSize: '13px', fontWeight: 900, color: '#0f172a', whiteSpace: 'nowrap' }}>
                합계 ₩{grandTotal.toLocaleString()}
              </span>
            </div>

            {/* ④ 우하단 수신 및 발송 제어부 */}
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
                    {(['MANAGER', 'WORKER'] as const).map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setPrimaryRecipient(t)}
                        style={{
                          height: '30px',
                          padding: '0 8px',
                          borderRadius: '5px',
                          border: primaryRecipient === t ? '1px solid #0f172a' : '1px solid #cbd5e1',
                          backgroundColor: primaryRecipient === t ? '#0f172a' : '#ffffff',
                          color: primaryRecipient === t ? '#ffffff' : '#475569',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {t === 'MANAGER' ? '원청' : '현장'}
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
                    {sentChannel === 'EMAIL' ? '이메일' : '연락처'}
                  </label>
                  <input
                    type="text"
                    value={receiverContact}
                    onChange={e => setReceiverContact(e.target.value)}
                    placeholder={sentChannel === 'EMAIL' ? 'email@domain.com' : '010-0000-0000'}
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px', alignItems: 'end' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
                    배송지
                  </label>
                  <input
                    type="text"
                    value={deliveryAddress}
                    onChange={e => setDeliveryAddress(e.target.value)}
                    placeholder="배송 주소"
                    style={{
                      height: '28px',
                      padding: '0 8px',
                      borderRadius: '5px',
                      border: '1px solid #cbd5e1',
                      fontSize: '12px',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
                    배송비
                  </label>
                  <select
                    value={shippingFee}
                    onChange={e => setShippingFee(Number(e.target.value))}
                    style={{
                      height: '28px',
                      padding: '0 6px',
                      borderRadius: '5px',
                      border: '1px solid #cbd5e1',
                      fontSize: '12px',
                    }}
                  >
                    <option value={4000}>택배 ₩4,000</option>
                    <option value={0}>무료 ₩0</option>
                  </select>
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
                      onClick={() => setSentChannel(ch.key)}
                      style={{
                        height: '32px',
                        padding: '0 10px',
                        borderRadius: '6px',
                        border: sentChannel === ch.key ? '1px solid #2563eb' : '1px solid #cbd5e1',
                        backgroundColor: sentChannel === ch.key ? '#eff6ff' : '#ffffff',
                        color: sentChannel === ch.key ? '#1d4ed8' : '#475569',
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
                    disabled={sending || cartItems.length === 0}
                    style={{
                      height: '32px',
                      padding: '0 16px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: cartItems.length === 0 ? '#94a3b8' : '#2563eb',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: 800,
                      cursor: cartItems.length === 0 ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Send size={13} />
                    {sending ? '발송중' : '견적 발송'}
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
export default PartsOrderQuotationModal;
