import { useState, useEffect } from 'react';
import {
  X, Printer, Send,
  FileText, CheckCircle2, Truck, MessageSquare, Smartphone, Mail, Plus,
  ShoppingCart, Trash2, Database, Search
} from 'lucide-react';
import {
  type CatalogPartItem,
  type PartsOrderRecord,
  getAllPartsCatalog,
  saveCatalogPart,
  submitPartsOrder
} from './partsCatalogApi';

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
  recipientCompany: string; // 원청 고객사 (관리사무소)
  recipientManager: string; // 원청 결재권자 (시설과장/소장)
  recipientPhone: string;   // 원청 연락처
  recipientEmail: string;   // 원청 이메일
  siteCompany: string;      // 실사용처 (하청 용역사)
  siteWorkerName: string;   // 현장 요청자 (미화원)
  siteWorkerPhone: string;  // 현장 연락처
  primaryRecipient: PrimaryRecipientType; // 1차 문서 수신인
  isCcEnabled: boolean;     // 2차 참조인 전송 여부
  equipmentModel: string;
  serialNumber: string;
  symptoms: string[];
  justificationReason: string; // 부품 교체 필요 소명문
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

const CATEGORIES = ['전체', '스퀴지/고무', '브러시/패드', '호스/필터', '배터리/전원', '모터/밸브', '세제/소모품'];
const MODELS = ['전체', 'J600T', 'J800', 'S7', 'S5', 'S3'];

export function PartsOrderQuotationModal({
  equipmentModel,
  customerName,
  manager,
  phone,
  email,
  siteCompany,
  siteWorkerName,
  siteWorkerPhone,
  serialNumber,
  symptoms = [],
  onClose,
  onToast
}: PartsOrderQuotationModalProps) {
  // ── 뷰 모드: 'shop' (온라인 쇼핑/조립) | 'db_admin' (카탈로그 DB 관리) | 'quote_a4' (원청 결재 A4) | 'mobile' (모바일 프리뷰)
  const [viewMode, setViewMode] = useState<'shop' | 'db_admin' | 'quote_a4' | 'mobile'>('shop');

  // ── 수신 수단 (카카오톡, 문자메세지, 이메일)
  const [sentChannel, setSentChannel] = useState<DispatchChannelType>('KAKAO');

  // ── 1차 문서 수신인 지정 (WORKER: 현장 미화원 | MANAGER: 원청 관리소장)
  const [primaryRecipient, setPrimaryRecipient] = useState<PrimaryRecipientType>('WORKER');
  const [isCcEnabled, setIsCcEnabled] = useState<boolean>(true);

  // ── 카탈로그 DB 목록 & 로딩 상태
  const [allCatalogList, setAllCatalogList] = useState<CatalogPartItem[]>([]);
  const [catalogList, setCatalogList] = useState<CatalogPartItem[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);

  // ── 카탈로그 필터 (모델, 카테고리, 검색어)
  const [filterModel, setFilterModel] = useState<string>(equipmentModel || 'J600T');
  const [filterCategory, setFilterCategory] = useState<string>('전체');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // ── 장바구니에 담긴 품목 (Cart: partCode -> qty)
  const [cartQuantities, setCartQuantities] = useState<Record<string, number>>({});

  // ── 신규 부품 등록 모달 상태 (DB 관리용)
  const [showAddPartModal, setShowAddPartModal] = useState(false);
  const [newPartForm, setNewPartForm] = useState({
    part_code: '',
    part_name: '',
    category: '스퀴지/고무',
    applicable_models: [equipmentModel || 'J600T'],
    unit_price: 35000,
    spec: '',
    description: '',
    in_stock: true,
    lead_time_days: 1
  });

  // ── 주문 접수 완료 상태
  const [placedOrder, setPlacedOrder] = useState<PartsOrderRecord | null>(null);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // ── 날짜 포맷
  const now = new Date();
  const dateFormatted = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;

  // ── 배송지 정보
  const [deliveryAddress, setDeliveryAddress] = useState<string>(
    `${customerName || '관리사무소'} 방재실 / 청소장비 주기장 앞`
  );

  // ── 1. 수파베이스 DB에서 부품 카탈로그 로드
  useEffect(() => {
    let isMounted = true;
    setIsLoadingCatalog(true);
    getAllPartsCatalog()
      .then(allData => {
        if (!isMounted) return;
        setAllCatalogList(allData);

        const filtered = allData.filter(p => {
          const matchesModel = !filterModel || filterModel === '전체' || filterModel === 'ALL' || (p.applicable_models && p.applicable_models.includes(filterModel));
          const matchesCat = !filterCategory || filterCategory === '전체' || filterCategory === 'ALL' || p.category === filterCategory;
          return matchesModel && matchesCat;
        });

        setCatalogList(filtered);
        setIsLoadingCatalog(false);

        // 첫 진입 시 권장 품목 1개를 장바구니에 기본 선택 세팅
        if (Object.keys(cartQuantities).length === 0 && filtered.length > 0) {
          const recommended = filtered.find(p => p.is_recommended) || filtered[0];
          if (recommended) {
            setCartQuantities({ [recommended.part_code]: 1 });
          }
        }
      })
      .catch(err => {
        console.error('[PartsOrderQuotationModal] Catalog load failed:', err);
        if (isMounted) setIsLoadingCatalog(false);
      });

    return () => { isMounted = false; };
  }, [filterModel, filterCategory]);

  // ── 2. 장바구니 수량 조절 핸들러
  const handleUpdateQty = (partCode: string, delta: number) => {
    setCartQuantities(prev => {
      const cur = prev[partCode] || 0;
      const next = cur + delta;
      if (next <= 0) {
        const copy = { ...prev };
        delete copy[partCode];
        return copy;
      }
      return { ...prev, [partCode]: next };
    });
  };

  const handleAddToCart = (part: CatalogPartItem) => {
    setCartQuantities(prev => ({
      ...prev,
      [part.part_code]: (prev[part.part_code] || 0) + 1
    }));
    onToast?.(`[${part.part_name}] 품목이 장바구니에 담겼습니다.`);
  };

  const handleRemoveFromCart = (partCode: string) => {
    setCartQuantities(prev => {
      const copy = { ...prev };
      delete copy[partCode];
      return copy;
    });
  };

  const handleClearCart = () => {
    setCartQuantities({});
  };

  // ── 3. 장바구니 품목 배열 및 금액 계산
  const cartItems: { part: CatalogPartItem; qty: number; subtotal: number }[] = Object.entries(cartQuantities)
    .map(([code, qty]) => {
      const part = allCatalogList.find(p => p.part_code === code) || catalogList.find(p => p.part_code === code) || {
        id: code,
        part_code: code,
        part_name: code,
        category: '기타',
        applicable_models: [equipmentModel],
        unit_price: 30000,
        spec: '표준 규격',
        description: '',
        image_url: '',
        in_stock: true,
        lead_time_days: 1,
        is_recommended: false
      };
      return {
        part,
        qty,
        subtotal: part.unit_price * qty
      };
    });

  const supplyTotal = cartItems.reduce((acc, item) => acc + item.subtotal, 0);
  const shippingFee = supplyTotal >= 100000 || supplyTotal === 0 ? 0 : 3000;
  const supplyWithShipping = supplyTotal + shippingFee;
  const vat = Math.round(supplyWithShipping * 0.1);
  const grandTotal = supplyWithShipping + vat;

  // ── 4. 공식 A4 견적서 객체 파생
  const doc: PartsQuotationDoc = {
    docNo: `S-PRT-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-01`,
    issuedAt: dateFormatted,
    recipientCompany: customerName || '반포자이 아파트 관리사무소',
    recipientManager: manager || '박시설 시설과장',
    recipientPhone: phone || '010-9876-5432',
    recipientEmail: email || 'facility@banpojai.co.kr',
    siteCompany: siteCompany || '(주)클린에코 청소용역',
    siteWorkerName: siteWorkerName || '김순자 미화반장',
    siteWorkerPhone: siteWorkerPhone || '010-3456-7890',
    primaryRecipient,
    isCcEnabled,
    equipmentModel: equipmentModel || 'J600T',
    serialNumber: serialNumber || `${equipmentModel}-2024-0812`,
    symptoms: symptoms.length ? symptoms : ['잔수 흡입 불량 및 오수 유출'],
    justificationReason: `제조사 공식 매뉴얼에 의거하여 현장 3단계 사전 자가점검(스퀴지 립 마모/호스 부압/가스켓 밀폐)을 성실히 수행한 결과, 장비 모터 본체 고장이 아닌 [스퀴지 마모 및 소모품 노후]로 판정되었습니다. 엔지니어 출장비 부담 없이 정품 소모품 1:1 단순 교체만으로 정상 복구가 가능함을 확인하여 본 온라인 소모품 견적 및 발주서를 제출합니다.`,
    parts: cartItems.map((ci, idx) => ({
      id: `part-${idx + 1}`,
      name: ci.part.part_name,
      partCode: ci.part.part_code,
      spec: ci.part.spec,
      qty: ci.qty,
      unitPrice: ci.part.unit_price,
      supplyPrice: ci.subtotal,
      isSelected: true,
      imageUrl: ci.part.image_url,
      category: ci.part.category
    })),
    shippingFee,
    supplyTotal: supplyWithShipping,
    vat,
    grandTotal,
    bankInfo: '신한은행 110-123-456789 (예금주: (주)스페이스)',
    deliveryMethod: '택배(CJ대한통운)',
    deliveryAddress,
    approvalStatus: placedOrder ? 'APPROVED' : 'PENDING',
    orderId: placedOrder?.order_id,
    photoEvidenceUrl: 'attached'
  };

  // ── 5. 온라인 쇼핑 주문하기 실행 (수파베이스 DB 저장)
  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) {
      alert('장바구니에 소모품을 1개 이상 담아주십시오.');
      return;
    }

    setIsSubmittingOrder(true);
    const orderId = `ORD-${Date.now().toString().slice(-8)}`;

    const orderPayload: PartsOrderRecord = {
      order_id: orderId,
      doc_no: doc.docNo,
      customer_name: doc.recipientCompany,
      manager: doc.recipientManager,
      phone: doc.recipientPhone,
      site_company: doc.siteCompany,
      site_worker_name: doc.siteWorkerName,
      site_worker_phone: doc.siteWorkerPhone,
      primary_recipient: primaryRecipient,
      dispatch_channel: sentChannel,
      equipment_model: equipmentModel,
      items: cartItems.map(ci => ({
        part_code: ci.part.part_code,
        part_name: ci.part.part_name,
        unit_price: ci.part.unit_price,
        qty: ci.qty,
        total: ci.subtotal
      })),
      supply_total: supplyTotal,
      shipping_fee: shippingFee,
      vat,
      grand_total: grandTotal,
      shipping_address: deliveryAddress
    };

    try {
      await submitPartsOrder(orderPayload);
      setPlacedOrder(orderPayload);
      const recipientName = primaryRecipient === 'WORKER'
        ? `현장 실사용자(${doc.siteWorkerName})`
        : `원청 관리사무소(${doc.recipientManager})`;
      const channelLabel = sentChannel === 'KAKAO' ? '카톡 알림톡' : sentChannel === 'SMS' ? '문자메세지(LMS)' : '이메일';
      onToast?.(`주문 완료! [주문번호: ${orderId}] ${recipientName}에게 ${channelLabel}로 발주 및 배송 안내가 전송되었습니다.`);
    } catch (err) {
      console.error('[PartsOrderQuotationModal] Order submission failed:', err);
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // ── 6. 신규 부품 DB 등록 저장
  const handleSaveNewPart = async () => {
    if (!newPartForm.part_code.trim() || !newPartForm.part_name.trim()) {
      alert('부품코드와 품목명을 입력하십시오.');
      return;
    }

    const newPart: CatalogPartItem = {
      id: `part-${Date.now()}`,
      part_code: newPartForm.part_code.trim().toUpperCase(),
      part_name: newPartForm.part_name.trim(),
      category: newPartForm.category,
      applicable_models: newPartForm.applicable_models,
      unit_price: Number(newPartForm.unit_price) || 0,
      spec: newPartForm.spec || '표준 규격',
      description: newPartForm.description || '',
      image_url: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="280"><rect width="400" height="280" fill="%231e293b"/><text x="200" y="140" fill="%23ffffff" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle">${encodeURIComponent(newPartForm.part_name)}</text></svg>`,
      in_stock: newPartForm.in_stock,
      lead_time_days: Number(newPartForm.lead_time_days) || 1,
      is_recommended: false
    };

    try {
      await saveCatalogPart(newPart);
      setAllCatalogList(prev => [newPart, ...prev]);
      setCatalogList(prev => [newPart, ...prev]);
      setShowAddPartModal(false);
      onToast?.(`[${newPart.part_name}] 품목이 수파베이스 parts_catalog DB에 신규 저장되었습니다.`);
    } catch (err) {
      console.error('Failed to save part:', err);
    }
  };

  // ── 필터링된 카탈로그 목록
  const filteredCatalog = catalogList.filter(p => {
    if (searchKeyword.trim()) {
      const kw = searchKeyword.toLowerCase();
      const matchCode = p.part_code.toLowerCase().includes(kw);
      const matchName = p.part_name.toLowerCase().includes(kw);
      const matchSpec = p.spec.toLowerCase().includes(kw);
      if (!matchCode && !matchName && !matchSpec) return false;
    }
    return true;
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(3px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 1360,
          height: '94vh',
          maxHeight: 920,
          background: '#ece7de',
          borderRadius: 8,
          border: '1px solid #dcd5c9',
          boxShadow: '0 25px 50px rgba(0,0,0,0.35)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* ── [헤더 바 (Header)] ── */}
        <div
          style={{
            background: '#ece7de',
            borderBottom: '1px solid #dcd5c9',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 6,
                background: '#059669',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <ShoppingCart size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16, fontWeight: 900, color: '#0f172a' }}>
                  소모품·부품 카탈로그 온라인 주문 및 원청 견적 연계
                </span>
                <span
                  style={{
                    background: '#059669',
                    color: '#ffffff',
                    fontSize: 13.5,
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: 4
                  }}
                >
                  모델: {equipmentModel}
                </span>
                <span
                  style={{
                    background: '#ecfdf5',
                    color: '#065f46',
                    border: '1px solid #a7f3d0',
                    fontSize: 13.5,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 4
                  }}
                >
                  수파베이스 DB 카탈로그 실시간 연동
                </span>
              </div>
              <div style={{ fontSize: 13.5, color: '#64748b', marginTop: 2 }}>
                사진 보며 장바구니 담기 ➔ 1차 수신인 지정 ➔ 3대 채널 발송 ➔ 원청 결재 A4 연계
              </div>
            </div>
          </div>

          {/* 4대 뷰 모드 탭 & 인쇄 & 닫기 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', background: '#f5f2eb', border: '1px solid #dcd5c9', borderRadius: 5, padding: 2 }}>
              <button
                type="button"
                onClick={() => setViewMode('shop')}
                data-uia="btn-parts-tab-shop"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '5px 12px',
                  borderRadius: 4,
                  fontSize: 13.5,
                  fontWeight: viewMode === 'shop' ? 800 : 600,
                  border: 'none',
                  background: viewMode === 'shop' ? '#059669' : 'transparent',
                  color: viewMode === 'shop' ? '#ffffff' : '#64748b',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                <ShoppingCart size={14} />
                <span>카탈로그 쇼핑/주문</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('db_admin')}
                data-uia="btn-parts-tab-db"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '5px 12px',
                  borderRadius: 4,
                  fontSize: 13.5,
                  fontWeight: viewMode === 'db_admin' ? 800 : 600,
                  border: 'none',
                  background: viewMode === 'db_admin' ? '#1d4ed8' : 'transparent',
                  color: viewMode === 'db_admin' ? '#ffffff' : '#64748b',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                <Database size={14} />
                <span>카탈로그 DB 관리</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('quote_a4')}
                data-uia="btn-parts-tab-a4"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '5px 12px',
                  borderRadius: 4,
                  fontSize: 13.5,
                  fontWeight: viewMode === 'quote_a4' ? 800 : 600,
                  border: 'none',
                  background: viewMode === 'quote_a4' ? '#0f172a' : 'transparent',
                  color: viewMode === 'quote_a4' ? '#ffffff' : '#64748b',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                <FileText size={14} />
                <span>공식 A4 견적서</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('mobile')}
                data-uia="btn-parts-tab-mobile"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '5px 12px',
                  borderRadius: 4,
                  fontSize: 13.5,
                  fontWeight: viewMode === 'mobile' ? 800 : 600,
                  border: 'none',
                  background: viewMode === 'mobile' ? '#b45309' : 'transparent',
                  color: viewMode === 'mobile' ? '#ffffff' : '#64748b',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                <Smartphone size={14} />
                <span>모바일 프리뷰</span>
              </button>
            </div>

            {viewMode === 'quote_a4' && (
              <button
                type="button"
                onClick={() => window.print()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '5px 12px',
                  borderRadius: 5,
                  fontSize: 13.5,
                  fontWeight: 700,
                  background: '#f5f2eb',
                  border: '1px solid #dcd5c9',
                  color: '#0f172a',
                  cursor: 'pointer'
                }}
              >
                <Printer size={14} />
                <span>인쇄 / PDF</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#64748b',
                padding: 6,
                borderRadius: 4
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ── [2-Track R&R 수신인 지정 & 발송 채널 선택 배너] ── */}
        <div
          style={{
            background: '#f5f2eb',
            borderBottom: '1px solid #dcd5c9',
            padding: '10px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexShrink: 0
          }}
        >
          {/* 1차 문서 수신인 지정 라디오 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13.5, fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap' }}>
              1차 문서 수신인 지정:
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: 'pointer',
                  background: primaryRecipient === 'WORKER' ? '#ecfdf5' : '#ffffff',
                  border: primaryRecipient === 'WORKER' ? '1.5px solid #059669' : '1px solid #cbd5e1',
                  borderRadius: 4,
                  padding: '4px 10px',
                  fontSize: 13.5,
                  fontWeight: primaryRecipient === 'WORKER' ? 800 : 600,
                  color: primaryRecipient === 'WORKER' ? '#065f46' : '#475569'
                }}
              >
                <input
                  type="radio"
                  name="primaryRecipient"
                  checked={primaryRecipient === 'WORKER'}
                  onChange={() => setPrimaryRecipient('WORKER')}
                />
                <span>현장 실사용자 (하청 미화원: {doc.siteWorkerName} {doc.siteWorkerPhone})</span>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: 'pointer',
                  background: primaryRecipient === 'MANAGER' ? '#eff6ff' : '#ffffff',
                  border: primaryRecipient === 'MANAGER' ? '1.5px solid #1d4ed8' : '1px solid #cbd5e1',
                  borderRadius: 4,
                  padding: '4px 10px',
                  fontSize: 13.5,
                  fontWeight: primaryRecipient === 'MANAGER' ? 800 : 600,
                  color: primaryRecipient === 'MANAGER' ? '#1e40af' : '#475569'
                }}
              >
                <input
                  type="radio"
                  name="primaryRecipient"
                  checked={primaryRecipient === 'MANAGER'}
                  onChange={() => setPrimaryRecipient('MANAGER')}
                />
                <span>원청 결재권자 (관리소 시설과장: {doc.recipientManager} {doc.recipientPhone})</span>
              </label>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13.5, color: '#64748b', cursor: 'pointer', marginLeft: 6 }}>
              <input
                type="checkbox"
                checked={isCcEnabled}
                onChange={e => setIsCcEnabled(e.target.checked)}
              />
              <span>참조인 동시 공유</span>
            </label>
          </div>

          {/* 3대 발송 수단 선택 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: '#475569', marginRight: 4 }}>
              발송 수단:
            </span>
            <button
              type="button"
              onClick={() => setSentChannel('KAKAO')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '4px 10px',
                borderRadius: 4,
                border: sentChannel === 'KAKAO' ? '2px solid #eab308' : '1px solid #dcd5c9',
                background: sentChannel === 'KAKAO' ? '#fef08a' : '#ffffff',
                color: '#854d0e',
                fontSize: 13.5,
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              <MessageSquare size={14} />
              <span>카카오톡</span>
            </button>

            <button
              type="button"
              onClick={() => setSentChannel('SMS')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '4px 10px',
                borderRadius: 4,
                border: sentChannel === 'SMS' ? '2px solid #2563eb' : '1px solid #dcd5c9',
                background: sentChannel === 'SMS' ? '#dbeafe' : '#ffffff',
                color: '#1e40af',
                fontSize: 13.5,
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              <Smartphone size={14} />
              <span>문자메세지</span>
            </button>

            <button
              type="button"
              onClick={() => setSentChannel('EMAIL')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '4px 10px',
                borderRadius: 4,
                border: sentChannel === 'EMAIL' ? '2px solid #059669' : '1px solid #dcd5c9',
                background: sentChannel === 'EMAIL' ? '#d1fae5' : '#ffffff',
                color: '#065f46',
                fontSize: 13.5,
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              <Mail size={14} />
              <span>이메일</span>
            </button>
          </div>
        </div>

        {/* ── [본문 뷰 분기 영역] ── */}
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex' }}>

          {/* ══════════════════════════════════════════════════════════════════
              VIEW 1: 카탈로그 쇼핑 & 주문 조립 ('shop')
          ══════════════════════════════════════════════════════════════════ */}
          {viewMode === 'shop' && (
            <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>

              {/* [좌측 패널 63%]: 시각적 부품 카탈로그 그리드 */}
              <div
                style={{
                  flex: '0 0 63%',
                  borderRight: '1px solid #dcd5c9',
                  display: 'flex',
                  flexDirection: 'column',
                  background: '#f5f2eb',
                  minHeight: 0
                }}
              >
                {/* 필터 및 검색 바 */}
                <div
                  style={{
                    background: '#ece7de',
                    borderBottom: '1px solid #dcd5c9',
                    padding: '10px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    flexShrink: 0
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    {/* 모델 필터 칩 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 800, color: '#334155' }}>모델:</span>
                      {MODELS.map(m => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setFilterModel(m)}
                          style={{
                            padding: '3px 8px',
                            borderRadius: 4,
                            border: filterModel === m ? '1.5px solid #1d4ed8' : '1px solid #cbd5e1',
                            background: filterModel === m ? '#1d4ed8' : '#ffffff',
                            color: filterModel === m ? '#ffffff' : '#334155',
                            fontSize: 13.5,
                            fontWeight: filterModel === m ? 800 : 600,
                            cursor: 'pointer'
                          }}
                        >
                          {m}
                        </button>
                      ))}
                    </div>

                    {/* 검색 인풋 */}
                    <div style={{ position: 'relative', width: 220 }}>
                      <Search size={14} color="#64748b" style={{ position: 'absolute', left: 8, top: 9 }} />
                      <input
                        value={searchKeyword}
                        onChange={e => setSearchKeyword(e.target.value)}
                        placeholder="부품명, 규격, 코드 검색"
                        style={{
                          width: '100%',
                          padding: '5px 8px 5px 28px',
                          borderRadius: 4,
                          border: '1px solid #cbd5e1',
                          fontSize: 13.5,
                          background: '#ffffff',
                          color: '#0f172a'
                        }}
                      />
                    </div>
                  </div>

                  {/* 카테고리 필터 탭 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, overflowX: 'auto', paddingBottom: 2 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 800, color: '#334155', whiteSpace: 'nowrap' }}>분류:</span>
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setFilterCategory(cat)}
                        style={{
                          padding: '3px 9px',
                          borderRadius: 14,
                          border: filterCategory === cat ? '1px solid #059669' : '1px solid #cbd5e1',
                          background: filterCategory === cat ? '#059669' : '#ffffff',
                          color: filterCategory === cat ? '#ffffff' : '#475569',
                          fontSize: 13.5,
                          fontWeight: filterCategory === cat ? 800 : 600,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 부품 카드 그리드 본문 */}
                <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
                  {isLoadingCatalog ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 10, color: '#64748b' }}>
                      <span style={{ fontSize: 14, fontWeight: 700 }}>수파베이스 부품 카탈로그를 불러오는 중...</span>
                    </div>
                  ) : filteredCatalog.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40, color: '#64748b', fontSize: 14 }}>
                      조건에 부합하는 부품이 없습니다.
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                      {filteredCatalog.map(part => {
                        const inCartQty = cartQuantities[part.part_code] || 0;
                        return (
                          <div
                            key={part.id}
                            style={{
                              background: '#ffffff',
                              border: inCartQty > 0 ? '2px solid #059669' : '1px solid #cbd5e1',
                              borderRadius: 6,
                              overflow: 'hidden',
                              display: 'flex',
                              flexDirection: 'column',
                              boxShadow: inCartQty > 0 ? '0 4px 10px rgba(5,150,105,0.15)' : '0 1px 3px rgba(0,0,0,0.05)',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {/* 부품 이미지 썸네일 */}
                            <div style={{ position: 'relative', height: 130, background: '#0f172a', overflow: 'hidden' }}>
                              <img
                                src={part.image_url}
                                alt={part.part_name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                              <div style={{ position: 'absolute', top: 6, left: 6, display: 'flex', gap: 4 }}>
                                <span style={{ background: '#059669', color: '#ffffff', fontSize: 13.5, fontWeight: 800, padding: '1px 6px', borderRadius: 3 }}>
                                  {part.category}
                                </span>
                                {part.is_recommended && (
                                  <span style={{ background: '#d97706', color: '#ffffff', fontSize: 13.5, fontWeight: 800, padding: '1px 6px', borderRadius: 3 }}>
                                    ⭐ 추천 정품
                                  </span>
                                )}
                              </div>
                              <span style={{ position: 'absolute', bottom: 6, right: 6, background: 'rgba(0,0,0,0.7)', color: '#ffffff', fontSize: 13.5, padding: '1px 6px', borderRadius: 3, fontFamily: 'monospace' }}>
                                {part.part_code}
                              </span>
                            </div>

                            {/* 부품 정보 본문 */}
                            <div style={{ padding: 10, display: 'flex', flexDirection: 'column', flex: 1, gap: 4 }}>
                              <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', lineHeight: 1.35 }}>
                                {part.part_name}
                              </div>
                              <div style={{ fontSize: 13.5, color: '#64748b' }}>
                                규격: {part.spec}
                              </div>
                              <div style={{ fontSize: 13.5, color: '#475569', lineHeight: 1.35, marginTop: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {part.description}
                              </div>

                              {/* 가격 및 수량/담기 바 */}
                              <div style={{ marginTop: 'auto', paddingTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9' }}>
                                <div>
                                  <span style={{ fontSize: 15, fontWeight: 900, color: '#059669' }}>
                                    ₩{part.unit_price.toLocaleString()}
                                  </span>
                                </div>

                                {inCartQty > 0 ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 4, padding: 2 }}>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateQty(part.part_code, -1)}
                                      style={{ width: 24, height: 24, border: 'none', background: '#ffffff', color: '#065f46', borderRadius: 3, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >
                                      -
                                    </button>
                                    <span style={{ minWidth: 24, textAlign: 'center', fontSize: 13.5, fontWeight: 900, color: '#065f46' }}>
                                      {inCartQty}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateQty(part.part_code, 1)}
                                      style={{ width: 24, height: 24, border: 'none', background: '#059669', color: '#ffffff', borderRadius: 3, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >
                                      +
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleAddToCart(part)}
                                    data-uia={`btn-add-cart-${part.part_code}`}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 4,
                                      background: '#059669',
                                      color: '#ffffff',
                                      border: 'none',
                                      borderRadius: 4,
                                      padding: '5px 10px',
                                      fontSize: 13.5,
                                      fontWeight: 800,
                                      cursor: 'pointer'
                                    }}
                                  >
                                    <Plus size={14} />
                                    <span>장바구니 담기</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* [우측 패널 37%]: 실시간 장바구니 & 주문서 완결 터미널 */}
              <div
                style={{
                  flex: '0 0 37%',
                  display: 'flex',
                  flexDirection: 'column',
                  background: '#ece7de',
                  minHeight: 0
                }}
              >
                {/* 장바구니 헤더 */}
                <div
                  style={{
                    padding: '10px 16px',
                    borderBottom: '1px solid #dcd5c9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexShrink: 0
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ShoppingCart size={16} color="#059669" />
                    <span style={{ fontSize: 14, fontWeight: 900, color: '#0f172a' }}>
                      온라인 장바구니 ({cartItems.length}개 품목)
                    </span>
                  </div>
                  {cartItems.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearCart}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#64748b',
                        fontSize: 13.5,
                        cursor: 'pointer'
                      }}
                    >
                      전체 비우기
                    </button>
                  )}
                </div>

                {/* 장바구니 품목 리스트 */}
                <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {cartItems.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 10px', color: '#64748b', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <ShoppingCart size={32} color="#94a3b8" />
                      <span style={{ fontSize: 13.5, fontWeight: 700 }}>장바구니가 비어 있습니다.</span>
                      <span style={{ fontSize: 13.5 }}>왼쪽 카탈로그에서 필요한 소모품을 담아주십시오.</span>
                    </div>
                  ) : (
                    cartItems.map(item => (
                      <div
                        key={item.part.part_code}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: 6,
                          padding: 10,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 13.5, fontWeight: 800, color: '#0f172a' }}>
                            {item.part.part_name}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveFromCart(item.part.part_code)}
                            style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: 2 }}
                            title="삭제"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13.5 }}>
                          <span style={{ color: '#64748b', fontFamily: 'monospace' }}>{item.part.part_code}</span>
                          <span style={{ color: '#0f172a' }}>단가: ₩{item.part.unit_price.toLocaleString()}</span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4, borderTop: '1px dashed #e2e8f0' }}>
                          {/* 수량 조절 */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#f1f5f9', borderRadius: 4, padding: 2 }}>
                            <button
                              type="button"
                              onClick={() => handleUpdateQty(item.part.part_code, -1)}
                              style={{ width: 22, height: 22, border: 'none', background: '#ffffff', borderRadius: 3, fontWeight: 800, cursor: 'pointer' }}
                            >
                              -
                            </button>
                            <span style={{ minWidth: 20, textAlign: 'center', fontSize: 13.5, fontWeight: 800 }}>
                              {item.qty}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateQty(item.part.part_code, 1)}
                              style={{ width: 22, height: 22, border: 'none', background: '#ffffff', borderRadius: 3, fontWeight: 800, cursor: 'pointer' }}
                            >
                              +
                            </button>
                          </div>

                          <span style={{ fontSize: 14, fontWeight: 900, color: '#059669' }}>
                            소계: ₩{item.subtotal.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))
                  )}

                  {/* 배송지 인라인 확인 */}
                  <div style={{ background: '#f5f2eb', border: '1px solid #dcd5c9', borderRadius: 6, padding: '8px 10px', marginTop: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                      <Truck size={14} color="#1d4ed8" />
                      <span>배송지 (택배/화물):</span>
                    </div>
                    <input
                      value={deliveryAddress}
                      onChange={e => setDeliveryAddress(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        borderRadius: 4,
                        border: '1px solid #cbd5e1',
                        fontSize: 13.5,
                        background: '#ffffff',
                        color: '#0f172a'
                      }}
                    />
                  </div>
                </div>

                {/* 결제 요약 및 주문하기 버튼군 */}
                <div
                  style={{
                    background: '#f5f2eb',
                    borderTop: '1px solid #dcd5c9',
                    padding: '12px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    flexShrink: 0
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, color: '#475569' }}>
                    <span>공급가액 합계:</span>
                    <span style={{ fontWeight: 700 }}>₩{supplyTotal.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, color: '#475569' }}>
                    <span>배송비 (10만원 이상 무료):</span>
                    <span style={{ fontWeight: 700, color: shippingFee === 0 ? '#059669' : '#0f172a' }}>
                      {shippingFee === 0 ? '무료 (₩0)' : `₩${shippingFee.toLocaleString()}`}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, color: '#475569' }}>
                    <span>부가가치세 (VAT 10%):</span>
                    <span style={{ fontWeight: 700 }}>₩{vat.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 900, color: '#0f172a', paddingTop: 6, borderTop: '1px solid #dcd5c9' }}>
                    <span>최종 발주 금액:</span>
                    <span style={{ color: '#059669' }}>₩{grandTotal.toLocaleString()}</span>
                  </div>

                  {placedOrder && (
                    <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 4, padding: '6px 10px', fontSize: 13.5, color: '#065f46', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckCircle2 size={16} color="#059669" />
                      <span>수파베이스 DB 주문 저장 완료 (주문번호: {placedOrder.order_id})</span>
                    </div>
                  )}

                  {/* 최종 주문하기 버튼 */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
                    <button
                      type="button"
                      disabled={isSubmittingOrder || cartItems.length === 0}
                      onClick={handlePlaceOrder}
                      data-uia="btn-submit-parts-order"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        background: '#059669',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 5,
                        padding: '10px 12px',
                        fontSize: 14,
                        fontWeight: 900,
                        cursor: isSubmittingOrder || cartItems.length === 0 ? 'not-allowed' : 'pointer',
                        boxShadow: '0 2px 4px rgba(5,150,105,0.25)',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <Send size={15} />
                      <span>{isSubmittingOrder ? '주문 저장 중...' : '온라인 주문하기'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setViewMode('quote_a4')}
                      data-uia="btn-goto-a4-quote"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        background: '#0f172a',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 5,
                        padding: '10px 12px',
                        fontSize: 14,
                        fontWeight: 800,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <FileText size={15} />
                      <span>원청 공식 A4 견적서 ➔</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              VIEW 2: 카탈로그 DB 마스터 관리 ('db_admin')
          ══════════════════════════════════════════════════════════════════ */}
          {viewMode === 'db_admin' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f5f2eb', overflow: 'hidden' }}>
              {/* 상단 툴바 */}
              <div style={{ padding: '12px 20px', background: '#ece7de', borderBottom: '1px solid #dcd5c9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Database size={18} color="#1d4ed8" />
                  <span style={{ fontSize: 15, fontWeight: 900, color: '#0f172a' }}>
                    전사 부품 카탈로그 마스터 DB (수파베이스 parts_catalog 테이블)
                  </span>
                  <span style={{ background: '#dbeafe', color: '#1e40af', fontSize: 13.5, fontWeight: 700, padding: '2px 8px', borderRadius: 4 }}>
                    총 {allCatalogList.length}건 등록됨
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddPartModal(true)}
                  data-uia="btn-open-add-part-modal"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    background: '#1d4ed8',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 5,
                    padding: '6px 14px',
                    fontSize: 13.5,
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  <Plus size={15} />
                  <span>신규 부품 DB 등록</span>
                </button>
              </div>

              {/* 고밀도 테이블 그리드 */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', background: '#ffffff', borderRadius: 6, overflow: 'hidden', border: '1px solid #cbd5e1', fontSize: 13.5 }}>
                  <thead>
                    <tr style={{ background: '#0f172a', color: '#ffffff', textAlign: 'left' }}>
                      <th style={{ padding: '8px 12px', width: 90 }}>사진</th>
                      <th style={{ padding: '8px 12px', width: 140 }}>부품코드</th>
                      <th style={{ padding: '8px 12px' }}>품목명</th>
                      <th style={{ padding: '8px 12px', width: 110 }}>분류</th>
                      <th style={{ padding: '8px 12px', width: 130 }}>적용모델</th>
                      <th style={{ padding: '8px 12px', width: 110, textAlign: 'right' }}>단가</th>
                      <th style={{ padding: '8px 12px', width: 90, textAlign: 'center' }}>재고</th>
                      <th style={{ padding: '8px 12px', width: 90, textAlign: 'center' }}>추천</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allCatalogList.map((part, idx) => (
                      <tr key={part.id} style={{ borderBottom: '1px solid #e2e8f0', background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                        <td style={{ padding: 6 }}>
                          <img src={part.image_url} alt="" style={{ width: 64, height: 44, objectFit: 'cover', borderRadius: 4, border: '1px solid #cbd5e1' }} />
                        </td>
                        <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 800, color: '#1e40af' }}>
                          {part.part_code}
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <div style={{ fontWeight: 800, color: '#0f172a' }}>{part.part_name}</div>
                          <div style={{ fontSize: 13.5, color: '#64748b' }}>규격: {part.spec}</div>
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <span style={{ background: '#e2e8f0', color: '#334155', padding: '2px 6px', borderRadius: 3, fontSize: 13.5 }}>
                            {part.category}
                          </span>
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {part.applicable_models.map(m => (
                              <span key={m} style={{ background: '#ecfdf5', color: '#065f46', fontSize: 13.5, fontWeight: 700, padding: '1px 5px', borderRadius: 3 }}>
                                {m}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 800, color: '#059669' }}>
                          ₩{part.unit_price.toLocaleString()}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                          <span style={{ color: part.in_stock ? '#059669' : '#dc2626', fontWeight: 700 }}>
                            {part.in_stock ? '보유' : '품절'}
                          </span>
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                          {part.is_recommended ? '⭐' : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              VIEW 3: 공식 A4 소모품 견적서 ('quote_a4')
          ══════════════════════════════════════════════════════════════════ */}
          {viewMode === 'quote_a4' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 60px 20px', background: '#f5f2eb' }}>
              <div
                style={{
                  maxWidth: 860,
                  margin: '0 auto',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: 4,
                  boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
                  padding: '36px 40px',
                  color: '#000000',
                  fontFamily: "'Nanum Myeongjo', serif, -apple-system, sans-serif"
                }}
              >
                {/* 견적서 상단 공식 CI 로고 및 타이틀 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <img
                      src="/SPACE_logo.png"
                      alt="SPACE 로고"
                      style={{ height: 22, width: 'auto', objectFit: 'contain', display: 'block' }}
                    />
                    <span style={{ fontSize: 15, fontWeight: 900, color: '#0f172a' }}>(주)스페이스 부품공급사업부</span>
                  </div>
                  <span style={{ fontSize: 13.5, color: '#475569' }}>SPACE ENGINEERING CO., LTD.</span>
                </div>

                {/* 견적서 타이틀 */}
                <div style={{ textAlign: 'center', marginBottom: 24, borderBottom: '2px solid #000', paddingBottom: 14 }}>
                  <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: '0.25em' }}>
                    소 모 품   공 급   견 적 서
                  </div>
                  <div style={{ fontSize: 13.5, color: '#475569', marginTop: 4, letterSpacing: '0.05em' }}>
                    (현장 자가조치 점검 완료 및 소모품 1:1 교체 신청용)
                  </div>
                </div>

                {/* 견적서 상단 헤더 표 */}
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', fontSize: 13.5, marginBottom: 16 }}>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                      <th style={{ width: '15%', background: '#f1f5f9', padding: '6px 8px', borderRight: '1px solid #cbd5e1', textAlign: 'center' }}>수 신</th>
                      <td style={{ width: '35%', padding: '6px 8px', borderRight: '1px solid #cbd5e1', fontWeight: 700 }}>
                        {doc.recipientCompany} ({doc.recipientManager})
                      </td>
                      <th style={{ width: '15%', background: '#f1f5f9', padding: '6px 8px', borderRight: '1px solid #cbd5e1', textAlign: 'center' }}>발 신</th>
                      <td style={{ width: '35%', padding: '6px 8px', fontWeight: 700 }}>
                        (주)스페이스 부품공급사업부
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                      <th style={{ background: '#f1f5f9', padding: '6px 8px', borderRight: '1px solid #cbd5e1', textAlign: 'center' }}>연락처</th>
                      <td style={{ padding: '6px 8px', borderRight: '1px solid #cbd5e1' }}>{doc.recipientPhone}</td>
                      <th style={{ background: '#f1f5f9', padding: '6px 8px', borderRight: '1px solid #cbd5e1', textAlign: 'center' }}>대표전화</th>
                      <td style={{ padding: '6px 8px' }}>1588-0000 (부품관리 02-123-4568)</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                      <th style={{ background: '#f1f5f9', padding: '6px 8px', borderRight: '1px solid #cbd5e1', textAlign: 'center' }}>1차 수신인</th>
                      <td style={{ padding: '6px 8px', borderRight: '1px solid #cbd5e1', fontWeight: 700, color: '#1d4ed8' }}>
                        {doc.primaryRecipient === 'WORKER' ? `현장 미화원 (${doc.siteWorkerName})` : `원청 결재권자 (${doc.recipientManager})`}
                      </td>
                      <th style={{ background: '#f1f5f9', padding: '6px 8px', borderRight: '1px solid #cbd5e1', textAlign: 'center' }}>발송 수단</th>
                      <td style={{ padding: '6px 8px', fontWeight: 700 }}>
                        {sentChannel === 'KAKAO' ? '카카오 알림톡' : sentChannel === 'SMS' ? '문자메세지(LMS)' : `이메일 (${doc.recipientEmail})`}
                      </td>
                    </tr>
                    <tr>
                      <th style={{ background: '#f1f5f9', padding: '6px 8px', borderRight: '1px solid #cbd5e1', textAlign: 'center' }}>실사용처(하청)</th>
                      <td style={{ padding: '6px 8px', borderRight: '1px solid #cbd5e1' }}>{doc.siteCompany} ({doc.siteWorkerName})</td>
                      <th style={{ background: '#f1f5f9', padding: '6px 8px', borderRight: '1px solid #cbd5e1', textAlign: 'center' }}>대상 장비</th>
                      <td style={{ padding: '6px 8px' }}><b>{doc.equipmentModel}</b> (S/N: {doc.serialNumber})</td>
                    </tr>
                  </tbody>
                </table>

                {/* 사전점검 소명 사유 */}
                <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 6 }}>
                  1. 자가점검 결과 및 소모품 교체 소명 사유
                </div>
                <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '8px 12px', fontSize: 13.5, lineHeight: 1.6, marginBottom: 16 }}>
                  {doc.justificationReason}
                </div>

                {/* 견적 품목 명세 표 */}
                <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 6 }}>
                  2. 정비 소모품 공급 견적 명세 (공급가액 및 세액)
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', fontSize: 13.5, marginBottom: 14 }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #000' }}>
                      <th style={{ width: '38%', padding: '6px', borderRight: '1px solid #cbd5e1' }}>품목명 / 부품코드</th>
                      <th style={{ width: '22%', padding: '6px', borderRight: '1px solid #cbd5e1' }}>규격</th>
                      <th style={{ width: '10%', padding: '6px', borderRight: '1px solid #cbd5e1', textAlign: 'right' }}>수량</th>
                      <th style={{ width: '15%', padding: '6px', borderRight: '1px solid #cbd5e1', textAlign: 'right' }}>단가 (원)</th>
                      <th style={{ width: '15%', padding: '6px', textAlign: 'right' }}>금액 (원)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doc.parts.map(p => (
                      <tr key={p.id} style={{ borderBottom: '1px solid #cbd5e1' }}>
                        <td style={{ padding: '6px', borderRight: '1px solid #cbd5e1', fontWeight: 600 }}>{p.name}</td>
                        <td style={{ padding: '6px', borderRight: '1px solid #cbd5e1', fontFamily: 'monospace' }}>{p.partCode}</td>
                        <td style={{ padding: '6px', borderRight: '1px solid #cbd5e1', textAlign: 'right' }}>{p.qty}</td>
                        <td style={{ padding: '6px', borderRight: '1px solid #cbd5e1', textAlign: 'right' }}>{p.unitPrice.toLocaleString()}</td>
                        <td style={{ padding: '6px', textAlign: 'right', fontWeight: 700 }}>{p.supplyPrice.toLocaleString()}</td>
                      </tr>
                    ))}
                    <tr style={{ borderBottom: '1px solid #000' }}>
                      <td style={{ padding: '6px', borderRight: '1px solid #cbd5e1', fontWeight: 600 }}>배송비 (10만원 이상 무료)</td>
                      <td style={{ padding: '6px', borderRight: '1px solid #cbd5e1' }}>{doc.deliveryMethod}</td>
                      <td style={{ padding: '6px', borderRight: '1px solid #cbd5e1', textAlign: 'right' }}>1</td>
                      <td style={{ padding: '6px', borderRight: '1px solid #cbd5e1', textAlign: 'right' }}>{doc.shippingFee.toLocaleString()}</td>
                      <td style={{ padding: '6px', textAlign: 'right', fontWeight: 700 }}>{doc.shippingFee.toLocaleString()}</td>
                    </tr>
                    <tr style={{ background: '#f8fafc', fontWeight: 800 }}>
                      <td colSpan={3} style={{ padding: '8px', borderRight: '1px solid #cbd5e1', textAlign: 'center' }}>
                        합 계 금 액 (VAT 포함)
                      </td>
                      <td colSpan={2} style={{ padding: '8px', textAlign: 'right', fontSize: 14.5, color: '#047857' }}>
                        일금 {doc.grandTotal.toLocaleString()}원정 (₩{doc.grandTotal.toLocaleString()})
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* 하단 공식 직인 및 결재란 */}
                <div style={{ marginTop: 24, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ lineHeight: 1.6, fontSize: 13.5 }}>
                      <div><b>주식회사 스페이스</b></div>
                      <div>서울특별시 금천구 가산디지털1로 123 스페이스빌딩 5층</div>
                      <div>대표이사 <b>이 스 페 이 스</b> (직인생략/전자서명)</div>
                      <div>입금계좌: <b>{doc.bankInfo}</b></div>
                    </div>

                    <div style={{
                      width: 66,
                      height: 66,
                      border: '2px solid #dc2626',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#dc2626',
                      fontWeight: 900,
                      fontSize: 13.5,
                      textAlign: 'center',
                      lineHeight: 1.2,
                      transform: 'rotate(-5deg)',
                      opacity: 0.88,
                      flexShrink: 0
                    }}>
                      (주)스페이스<br />대표이사<br />인
                    </div>
                  </div>

                  <div style={{ border: '1px solid #000', fontSize: 13.5 }}>
                    <table style={{ borderCollapse: 'collapse', textAlign: 'center' }}>
                      <tbody>
                        <tr>
                          <th rowSpan={2} style={{ width: 26, background: '#f1f5f9', borderRight: '1px solid #000', padding: 2 }}>결<br />재</th>
                          <th style={{ width: 65, borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '2px 4px' }}>담 당</th>
                          <th style={{ width: 65, borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '2px 4px' }}>과 장</th>
                          <th style={{ width: 65, borderBottom: '1px solid #000', padding: '2px 4px' }}>소 장</th>
                        </tr>
                        <tr style={{ height: 42 }}>
                          <td style={{ borderRight: '1px solid #000' }}></td>
                          <td style={{ borderRight: '1px solid #000' }}></td>
                          <td></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              VIEW 4: 모바일 수신 화면 미리보기 ('mobile')
          ══════════════════════════════════════════════════════════════════ */}
          {viewMode === 'mobile' && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#cbd5e1', padding: 20, overflowY: 'auto' }}>
              <div
                style={{
                  width: 380,
                  background: '#ffffff',
                  borderRadius: 28,
                  border: '8px solid #0f172a',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                {/* 상단 노치 */}
                <div style={{ height: 24, background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 44, height: 4, background: '#334155', borderRadius: 2 }} />
                </div>

                {/* 모바일 화면 내용 */}
                <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10, background: '#f8fafc', maxHeight: '75vh', overflowY: 'auto' }}>
                  <div
                    style={{
                      background: sentChannel === 'KAKAO' ? '#fee500' : '#059669',
                      color: sentChannel === 'KAKAO' ? '#000000' : '#ffffff',
                      padding: '8px 12px',
                      borderRadius: 6,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <img
                        src={sentChannel === 'KAKAO' ? '/SPACE_logo.png' : '/SPACE_logo_white.png'}
                        alt="SPACE"
                        style={{ height: 14, width: 'auto', objectFit: 'contain' }}
                      />
                      <span style={{ fontSize: 13.5, fontWeight: 900 }}>
                        정품 소모품 주문
                      </span>
                    </div>
                    <span style={{ fontSize: 13.5, opacity: 0.85 }}>공식 알림톡</span>
                  </div>

                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 6, padding: 10, fontSize: 13.5, color: '#0f172a', lineHeight: 1.45 }}>
                    <div style={{ fontWeight: 800, color: '#047857', marginBottom: 2 }}>
                      [{equipmentModel}] 소모품 주문 카탈로그
                    </div>
                    {doc.siteWorkerName} 반장님, 자가점검 결과에 따른 추천 소모품 목록입니다. 수량을 확인하고 주문하기를 눌러주십시오.
                  </div>

                  {/* 모바일 담긴 품목 카드 */}
                  {cartItems.map(item => (
                    <div key={item.part.part_code} style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 6, padding: 8, display: 'flex', gap: 8 }}>
                      <img src={item.part.image_url} alt="" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 4, border: '1px solid #e2e8f0' }} />
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0f172a' }}>{item.part.part_name}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 13.5, color: '#64748b' }}>수량: {item.qty}개</span>
                          <span style={{ fontSize: 13.5, fontWeight: 800, color: '#059669' }}>₩{item.subtotal.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 6, padding: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 900, color: '#065f46' }}>
                      <span>최종 주문금액:</span>
                      <span>₩{grandTotal.toLocaleString()}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handlePlaceOrder}
                    style={{
                      background: '#059669',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 6,
                      padding: 12,
                      fontSize: 14,
                      fontWeight: 900,
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    이 품목으로 주문하기 ➔
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* ── [하단 닫기 및 상태 바] ── */}
        <div
          style={{
            background: '#ece7de',
            borderTop: '1px solid #dcd5c9',
            padding: '10px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0
          }}
        >
          <div style={{ fontSize: 13.5, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle2 size={16} color="#059669" />
            <span>온라인 주문 완료 시 수파베이스 DB 무누락 보존 및 택배 송장 배송 연계</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '6px 16px',
              borderRadius: 4,
              fontSize: 13.5,
              fontWeight: 700,
              background: '#f5f2eb',
              border: '1px solid #dcd5c9',
              color: '#0f172a',
              cursor: 'pointer'
            }}
          >
            닫기
          </button>
        </div>
      </div>

      {/* ── [모달: 신규 부품 DB 등록] ── */}
      {showAddPartModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            zIndex: 10005,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16
          }}
        >
          <div
            style={{
              background: '#f5f2eb',
              borderRadius: 8,
              maxWidth: 520,
              width: '100%',
              overflow: 'hidden',
              boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
              border: '1px solid #dcd5c9',
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 12
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #dcd5c9', paddingBottom: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 900, color: '#0f172a' }}>
                신규 부품 카탈로그 DB 등록
              </span>
              <button
                type="button"
                onClick={() => setShowAddPartModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13.5 }}>
              <div>
                <label style={{ fontWeight: 700, color: '#334155', display: 'block', marginBottom: 2 }}>
                  부품 코드:
                </label>
                <input
                  value={newPartForm.part_code}
                  onChange={e => setNewPartForm(prev => ({ ...prev, part_code: e.target.value }))}
                  placeholder="예: J600T-FLT-NEW"
                  style={{ width: '100%', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 13.5 }}
                />
              </div>

              <div>
                <label style={{ fontWeight: 700, color: '#334155', display: 'block', marginBottom: 2 }}>
                  품목명:
                </label>
                <input
                  value={newPartForm.part_name}
                  onChange={e => setNewPartForm(prev => ({ ...prev, part_name: e.target.value }))}
                  placeholder="예: 오수 거름망 카트리지 필터"
                  style={{ width: '100%', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 13.5 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontWeight: 700, color: '#334155', display: 'block', marginBottom: 2 }}>
                    카테고리:
                  </label>
                  <select
                    value={newPartForm.category}
                    onChange={e => setNewPartForm(prev => ({ ...prev, category: e.target.value }))}
                    style={{ width: '100%', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 13.5 }}
                  >
                    {CATEGORIES.filter(c => c !== '전체').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontWeight: 700, color: '#334155', display: 'block', marginBottom: 2 }}>
                    공급 단가 (원):
                  </label>
                  <input
                    type="number"
                    value={newPartForm.unit_price}
                    onChange={e => setNewPartForm(prev => ({ ...prev, unit_price: Number(e.target.value) }))}
                    style={{ width: '100%', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 13.5 }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontWeight: 700, color: '#334155', display: 'block', marginBottom: 2 }}>
                  규격 및 설명:
                </label>
                <input
                  value={newPartForm.spec}
                  onChange={e => setNewPartForm(prev => ({ ...prev, spec: e.target.value }))}
                  placeholder="예: 38mm 내경, 스테인리스 304"
                  style={{ width: '100%', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 13.5 }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
              <button
                type="button"
                onClick={() => setShowAddPartModal(false)}
                style={{ padding: '6px 12px', borderRadius: 4, border: '1px solid #cbd5e1', background: '#ffffff', fontSize: 13.5, cursor: 'pointer' }}
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSaveNewPart}
                style={{ padding: '6px 14px', borderRadius: 4, border: 'none', background: '#1d4ed8', color: '#ffffff', fontSize: 13.5, fontWeight: 800, cursor: 'pointer' }}
              >
                수파베이스 DB 저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default PartsOrderQuotationModal;
