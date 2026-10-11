import { useState, useRef } from 'react';
import {
  X, Check, Printer, Send,
  FileText, CheckCircle2, Building, Package,
  Truck, Edit3, Eye, MessageSquare, Smartphone, Mail, Plus, Camera
} from 'lucide-react';

export type DispatchChannelType = 'KAKAO' | 'SMS' | 'EMAIL';

export interface ConsumablePartItem {
  id: string;
  name: string;
  partCode: string;
  spec: string;
  qty: number;
  unitPrice: number;
  supplyPrice: number;
  isSelected: boolean;
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

// 모델별 전용 표준 소모품 카탈로그 데이터
const MODEL_PARTS_CATALOG: Record<string, Omit<ConsumablePartItem, 'id' | 'isSelected'>[]> = {
  'J600T': [
    { name: '825mm 내유성 라텍스 스퀴지 블레이드 세트 (앞/뒤)', partCode: 'J600T-SQG-825', spec: '825mm 내마모 라텍스 고무', qty: 1, unitPrice: 45000, supplyPrice: 45000 },
    { name: '22인치 바닥 세척 브러시 어셈블리', partCode: 'J600T-BRS-22', spec: '560mm 나일론 155rpm', qty: 1, unitPrice: 85000, supplyPrice: 85000 },
    { name: '22인치 고밀도 바닥 광택/세척 패드 (흑색 5장입)', partCode: 'J600T-PAD-BLK', spec: '22인치 규격 패드 (스트립용)', qty: 1, unitPrice: 28000, supplyPrice: 28000 },
    { name: '38mm 강화 오수 흡입 주름 호스 (1.5m)', partCode: 'J600T-HOS-38', spec: '38mm 연질 내유 호스', qty: 1, unitPrice: 35000, supplyPrice: 35000 },
    { name: '오수탱크 플로트 역류 차단 밸브 필터', partCode: 'J600T-FLT-01', spec: '부구형 플로트 밸브', qty: 1, unitPrice: 24000, supplyPrice: 24000 },
    { name: '24V 40A 메인 세라믹 전원 퓨즈 (5개입)', partCode: 'J600T-FUS-40', spec: '40A 고용량 세라믹관', qty: 1, unitPrice: 15000, supplyPrice: 15000 }
  ],
  'J800': [
    { name: '1,190mm 내유성 스퀴지 블레이드 세트 (앞/뒤)', partCode: 'J800-SQG-1190', spec: '1,190mm 대형 탑승식 전용', qty: 1, unitPrice: 65000, supplyPrice: 65000 },
    { name: '16인치 듀얼 바닥 세척 디스크 브러시 (2개 세트)', partCode: 'J800-BRS-16D', spec: '405mm 듀얼 브러시', qty: 1, unitPrice: 140000, supplyPrice: 140000 },
    { name: '오수탱크 밀폐 실링 가스켓 고무 (140L용)', partCode: 'J800-GSK-140', spec: 'EPDM 발포 방진 가스켓', qty: 1, unitPrice: 38000, supplyPrice: 38000 },
    { name: '24V 200A 산업용 메인 퓨즈 블록', partCode: 'J800-FUS-200', spec: '200A 볼트 체결형', qty: 1, unitPrice: 28000, supplyPrice: 28000 }
  ],
  'S7': [
    { name: '1,120mm 탑승형 스퀴지 고무 블레이드 세트', partCode: 'S7-SQG-1120', spec: '1,120mm 라텍스 립', qty: 1, unitPrice: 58000, supplyPrice: 58000 },
    { name: '22인치 고효율 세척 브러시', partCode: 'S7-BRS-22', spec: '560mm 표준 브러시', qty: 1, unitPrice: 88000, supplyPrice: 88000 },
    { name: '24V 솔레노이드 청수 제어 밸브', partCode: 'S7-VAL-24V', spec: '전자식 차단 밸브', qty: 1, unitPrice: 42000, supplyPrice: 42000 }
  ],
  'S5': [
    { name: '705mm 콤팩트 스퀴지 블레이드 세트', partCode: 'S5-SQG-705', spec: '705mm 소형 탑승형', qty: 1, unitPrice: 42000, supplyPrice: 42000 },
    { name: '22인치 세척 브러시', partCode: 'S5-BRS-22', spec: '560mm 나일론', qty: 1, unitPrice: 82000, supplyPrice: 82000 }
  ],
  'S3': [
    { name: '680mm 보행식 스퀴지 블레이드 세트', partCode: 'S3-SQG-680', spec: '680mm 표준 고무', qty: 1, unitPrice: 38000, supplyPrice: 38000 },
    { name: '18인치 디스크 세척 브러시', partCode: 'S3-BRS-18', spec: '450mm 보행형', qty: 1, unitPrice: 75000, supplyPrice: 75000 }
  ]
};

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
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const [sentChannel, setSentChannel] = useState<DispatchChannelType>('KAKAO');
  const printAreaRef = useRef<HTMLDivElement>(null);

  const now = new Date();
  const dateFormatted = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;

  // 모델별 초기 부품 리스트 로드 (첫 2개 품목 자동 선택)
  const [parts, setParts] = useState<ConsumablePartItem[]>(() => {
    const rawCatalog = MODEL_PARTS_CATALOG[equipmentModel] || MODEL_PARTS_CATALOG['J600T'];
    return rawCatalog.map((item, idx) => ({
      ...item,
      id: `part-${idx + 1}`,
      isSelected: idx === 0 // 1번째 품목 기본 선택
    }));
  });

  const [doc, setDoc] = useState<PartsQuotationDoc>(() => {
    const selected = parts.filter(p => p.isSelected);
    const supply = selected.reduce((sum, p) => sum + p.supplyPrice, 0);
    const shipping = 3000;
    const supplyWithShip = supply + shipping;
    const vat = Math.round(supplyWithShip * 0.1);

    return {
      docNo: `S-PRT-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-01`,
      issuedAt: dateFormatted,
      recipientCompany: customerName || '반포자이 아파트 관리사무소',
      recipientManager: manager || '박시설 시설과장',
      recipientPhone: phone || '010-9876-5432',
      recipientEmail: email || 'facility@banpojai.co.kr',
      siteCompany: siteCompany || '(주)클린에코 청소용역',
      siteWorkerName: siteWorkerName || '김순자 미화반장',
      siteWorkerPhone: siteWorkerPhone || '010-3456-7890',
      equipmentModel: equipmentModel || 'J600T',
      serialNumber: serialNumber || `${equipmentModel}-2024-0812`,
      symptoms: symptoms.length ? symptoms : ['잔수 흡입 불량 및 오수 유출'],
      justificationReason: `제조사 공식 매뉴얼에 의거하여 현장 3단계 사전 자가점검(호스/플로트/스퀴지)을 성실히 수행한 결과, 장비 모터 본체 이상이 아닌 [스퀴지 마모 및 흡입 호스 크랙]으로 판정되었습니다. 엔지니어 출장비 부담 없이 정품 소모품 1:1 단순 교체만으로 정상 복구가 가능함을 확인하여 본 소모품 견적서를 제출합니다.`,
      parts: parts,
      shippingFee: shipping,
      supplyTotal: supplyWithShip,
      vat: vat,
      grandTotal: supplyWithShip + vat,
      bankInfo: '신한은행 110-123-456789 (예금주: (주)스페이스)',
      deliveryMethod: '택배(CJ대한통운)',
      deliveryAddress: `${customerName || '관리사무소'} 방재실 / 청소장비 보관주기장 앞`,
      approvalStatus: 'PENDING',
      photoEvidenceUrl: 'attached'
    };
  });

  // 부품 선택 토글 및 수량 변경 시 금액 재계산
  const updatePartItem = (id: string, delta: Partial<ConsumablePartItem>) => {
    setParts(prev => {
      const next = prev.map(p => {
        if (p.id !== id) return p;
        const updated = { ...p, ...delta };
        if (delta.qty !== undefined || delta.unitPrice !== undefined) {
          const qty = updated.qty || 1;
          const price = updated.unitPrice || 0;
          updated.supplyPrice = qty * price;
        }
        return updated;
      });

      const selected = next.filter(p => p.isSelected);
      const supply = selected.reduce((sum, p) => sum + p.supplyPrice, 0);
      const supplyWithShip = supply + doc.shippingFee;
      const vat = Math.round(supplyWithShip * 0.1);

      setDoc(d => ({
        ...d,
        parts: next,
        supplyTotal: supplyWithShip,
        vat,
        grandTotal: supplyWithShip + vat
      }));

      return next;
    });
  };

  // 품목 신규 직접 추가
  const handleAddCustomPart = () => {
    const newId = `custom-${Date.now()}`;
    const newItem: ConsumablePartItem = {
      id: newId,
      name: '신규 요청 소모품/부품',
      partCode: `${equipmentModel}-CUSTOM`,
      spec: '규격 직접 입력',
      qty: 1,
      unitPrice: 30000,
      supplyPrice: 30000,
      isSelected: true
    };
    setParts(prev => [...prev, newItem]);
    updatePartItem(newId, {});
  };

  // 부품 발송 핸들러
  const handleSendQuotation = () => {
    const sendTime = new Date().toLocaleString();
    setDoc(prev => ({
      ...prev,
      sentAt: sendTime,
      sentChannel,
      approvalStatus: 'SENT'
    }));
    const channelName = sentChannel === 'KAKAO'
      ? '카톡(알림톡)'
      : sentChannel === 'SMS'
        ? '문자메세지(LMS)'
        : `이메일(${doc.recipientEmail})`;
    onToast?.(`원청 결재권자(${doc.recipientCompany} ${doc.recipientManager} 귀하)에게 [소모품 부품 견적서]가 ${channelName}으로 발송되었습니다.`);
  };

  // 원청 결재 승인 핸들러
  const handleApprove = () => {
    setDoc(prev => ({
      ...prev,
      approvalStatus: 'APPROVED'
    }));
    onToast?.(`원청 관리사무소 소모품 발주 승인이 완료되었습니다. 배송 출고 지시가 생성됩니다.`);
  };

  // 출고 배송 지시 완료 핸들러
  const handleDispatch = () => {
    setDoc(prev => ({
      ...prev,
      approvalStatus: 'DISPATCHED'
    }));
    onToast?.(`[택배 배송 지시 완료] 운송장 연계 및 부품이 ${doc.recipientCompany} 현장으로 출고되었습니다.`);
  };

  const selectedPartsCount = parts.filter(p => p.isSelected).length;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 10000, padding: 16, backdropFilter: 'blur(2px)'
    }}>
      <div style={{
        width: '100%', maxWidth: 1060, height: '92vh',
        background: '#ece7de',
        borderRadius: 10, border: '1px solid #dcd5c9',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Pretendard', sans-serif"
      }}>
        {/* ── [헤더 바] ── */}
        <div style={{
          background: '#ece7de', borderBottom: '1px solid #dcd5c9',
          padding: '12px 20px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Package size={18} color="#059669" />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                  소모품·부품 발주 및 원청 견적서 연계 (분기 B)
                </span>
                <span style={{
                  fontSize: 13.5, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                  background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0'
                }}>
                  자가조치 후 부품교체 전용
                </span>
              </div>
              <div style={{ fontSize: 13.5, color: '#64748b', marginTop: 2 }}>
                하청(현장 미화원) 점검 확인 ➔ 원청(관리사무소 결재권자) 직인 견적서 발송 및 택배 배송 연계
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* 뷰 모드 토글 */}
            <div style={{ display: 'flex', background: '#f5f2eb', border: '1px solid #dcd5c9', borderRadius: 5, padding: 2 }}>
              <button
                onClick={() => setViewMode('edit')}
                data-uia="btn-parts-tab-edit"
                style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px',
                  borderRadius: 4, fontSize: 13.5, fontWeight: viewMode === 'edit' ? 800 : 600,
                  border: 'none', background: viewMode === 'edit' ? '#059669' : 'transparent',
                  color: viewMode === 'edit' ? '#ffffff' : '#64748b', cursor: 'pointer'
                }}
              >
                <Edit3 size={13} />
                <span>작업/견적</span>
              </button>
              <button
                onClick={() => setViewMode('preview')}
                data-uia="btn-parts-tab-a4"
                style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px',
                  borderRadius: 4, fontSize: 13.5, fontWeight: viewMode === 'preview' ? 800 : 600,
                  border: 'none', background: viewMode === 'preview' ? '#059669' : 'transparent',
                  color: viewMode === 'preview' ? '#ffffff' : '#64748b', cursor: 'pointer'
                }}
              >
                <Eye size={13} />
                <span>공식 A4 서식</span>
              </button>
            </div>

            <button
              onClick={() => window.print()}
              style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px',
                borderRadius: 5, fontSize: 13.5, fontWeight: 700,
                background: '#f5f2eb', border: '1px solid #dcd5c9', color: '#0f172a',
                cursor: 'pointer'
              }}
            >
              <Printer size={13} />
              <span>인쇄 / PDF</span>
            </button>

            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4 }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── [2-Track 수신자 요약 띠 배너] ── */}
        <div style={{
          background: '#f5f2eb', borderBottom: '1px solid #dcd5c9',
          padding: '10px 20px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 16, flexShrink: 0
        }}>
          {/* 원청 결재권자 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
            <Building size={16} color="#1d4ed8" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 13.5, fontWeight: 800, color: '#1e40af', background: '#eff6ff', padding: '1px 6px', borderRadius: 3 }}>
                  최종 견적 수신인 (원청 결재권자)
                </span>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
                  {doc.recipientCompany}
                </span>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: '#475569' }}>
                  {doc.recipientManager} ({doc.recipientPhone})
                </span>
              </div>
              <div style={{ fontSize: 13.5, color: '#64748b' }}>
                품의서/지출결의서 첨부용 공식 소모품 견적서 수신처
              </div>
            </div>
          </div>

          <div style={{ width: 1, height: 28, background: '#dcd5c9' }} />

          {/* 실사용처 미화원 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
            <Package size={16} color="#059669" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 13.5, fontWeight: 800, color: '#047857', background: '#ecfdf5', padding: '1px 6px', borderRadius: 3 }}>
                  실사용처 (현장 수령처)
                </span>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
                  {doc.siteCompany}
                </span>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: '#475569' }}>
                  {doc.siteWorkerName} ({doc.siteWorkerPhone})
                </span>
              </div>
              <div style={{ fontSize: 13.5, color: '#64748b' }}>
                소모품 택배 수령 및 1:1 장착 담당 (고장 부위 사진 촬영 회신 완료)
              </div>
            </div>
          </div>
        </div>

        {/* ── [본문 작업 영역] ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 60px 20px', background: '#f5f2eb' }}>
          {viewMode === 'edit' ? (
            /* ── 부품 작업/편집 폼 ── */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 960, margin: '0 auto' }}>

              {/* 1. 현장 자가점검 확인 및 부품 교체 사유 소명문 */}
              <div style={{ background: '#f5f2eb', border: '1px solid #dcd5c9', borderRadius: 6, padding: '14px 16px' }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FileText size={16} color="#1d4ed8" />
                    <span>1. 자가점검 결과 및 부품 교체 사유 소명문 (원청 내부 기안용)</span>
                  </div>
                  <span style={{ fontSize: 13.5, color: '#64748b', fontFamily: 'monospace' }}>
                    문서번호: {doc.docNo}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <textarea
                    rows={2}
                    value={doc.justificationReason}
                    onChange={e => setDoc(prev => ({ ...prev, justificationReason: e.target.value }))}
                    style={{ border: '1px solid #bfdbfe', borderRadius: 4, padding: '8px 10px', fontSize: 13.5, background: '#eff6ff', color: '#0f172a', lineHeight: 1.45 }}
                  />
                  <span style={{ fontSize: 13.5, color: '#64748b' }}>
                    * 관리소장/입대의 감사 시 "불필요한 출장비를 지출하지 않고 소모품 자가교체로 해결함"을 증빙하는 소명 문안입니다.
                  </span>
                </div>

                {/* 고객 현장 사진 & 적색 스케치 회신 증빙 바 */}
                <div style={{
                  marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: '#fef2f2', border: '1px dashed #fca5a5', borderRadius: 5, padding: '8px 12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Camera size={16} color="#dc2626" />
                    <span style={{ fontSize: 13.5, fontWeight: 800, color: '#b91c1c' }}>
                      현장 미화원 전송 사진 증빙: 적색 펜 스케치(동그라미) 고장 부위 회신 접수됨
                    </span>
                  </div>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: '#059669', background: '#ecfdf5', padding: '2px 8px', borderRadius: 4, border: '1px solid #a7f3d0' }}>
                    ✓ 스퀴지 라텍스 찢김 부품 매핑 완료
                  </span>
                </div>
              </div>

              {/* 2. 장비 모델 전용 소모품 카탈로그 선택 그리드 */}
              <div style={{ background: '#f5f2eb', border: '1.5px solid #059669', borderRadius: 6, padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Package size={16} color="#059669" />
                    <span style={{ fontSize: 14.5, fontWeight: 800, color: '#065f46' }}>
                      2. {equipmentModel} 전용 정품 소모품 카탈로그 ({selectedPartsCount}개 품목 선택됨)
                    </span>
                  </div>

                  <button
                    onClick={handleAddCustomPart}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px',
                      borderRadius: 4, fontSize: 13.5, fontWeight: 700,
                      background: '#f5f2eb', color: '#047857', border: '1px solid #059669', cursor: 'pointer'
                    }}
                  >
                    <Plus size={13} />
                    <span>기타 부품 직접 추가</span>
                  </button>
                </div>

                {/* 부품 테이블 */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5, marginBottom: 12 }}>
                  <thead>
                    <tr style={{ background: '#ece7de', borderBottom: '1px solid #dcd5c9', color: '#475569' }}>
                      <th style={{ width: '6%', padding: '6px 4px', textAlign: 'center' }}>선택</th>
                      <th style={{ width: '38%', padding: '6px 8px', textAlign: 'left' }}>소모품명 / 부품코드</th>
                      <th style={{ width: '22%', padding: '6px 8px', textAlign: 'left' }}>규격</th>
                      <th style={{ width: '12%', padding: '6px 8px', textAlign: 'center' }}>수량</th>
                      <th style={{ width: '11%', padding: '6px 8px', textAlign: 'right' }}>단가 (원)</th>
                      <th style={{ width: '11%', padding: '6px 8px', textAlign: 'right' }}>공급가액 (원)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parts.map(p => (
                      <tr
                        key={p.id}
                        style={{
                          borderBottom: '1px solid #e8e2d8',
                          background: p.isSelected ? '#f0fdf4' : 'transparent'
                        }}
                      >
                        <td style={{ textAlign: 'center', padding: '6px 4px' }}>
                          <input
                            type="checkbox"
                            checked={p.isSelected}
                            onChange={e => updatePartItem(p.id, { isSelected: e.target.checked })}
                            style={{ cursor: 'pointer', width: 16, height: 16 }}
                          />
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          <div style={{ fontWeight: 700, color: p.isSelected ? '#0f172a' : '#64748b' }}>{p.name}</div>
                          <div style={{ fontSize: 13.5, color: '#64748b', fontFamily: 'monospace' }}>{p.partCode}</div>
                        </td>
                        <td style={{ padding: '6px 8px', color: '#475569' }}>
                          {p.spec}
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                          <input
                            type="number"
                            min={1}
                            value={p.qty}
                            disabled={!p.isSelected}
                            onChange={e => updatePartItem(p.id, { qty: Math.max(1, parseInt(e.target.value) || 1) })}
                            style={{
                              width: 50, textAlign: 'center', border: '1px solid #dcd5c9',
                              borderRadius: 4, padding: '2px 4px', fontSize: 13.5, background: p.isSelected ? '#ffffff' : '#f5f2eb'
                            }}
                          />
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', color: '#334155' }}>
                          {p.unitPrice.toLocaleString()}
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: p.isSelected ? '#0f172a' : '#94a3b8' }}>
                          {p.supplyPrice.toLocaleString()}
                        </td>
                      </tr>
                    ))}

                    {/* 배송비 행 */}
                    <tr style={{ borderBottom: '1px solid #dcd5c9', background: '#fafaf9' }}>
                      <td style={{ textAlign: 'center', padding: '6px 4px' }}>
                        <span style={{ fontSize: 13.5, color: '#059669', fontWeight: 800 }}>배송</span>
                      </td>
                      <td style={{ padding: '6px 8px', fontWeight: 700, color: '#0f172a' }}>
                        기본 안심 화물/택배 배송비 ({doc.deliveryMethod})
                      </td>
                      <td style={{ padding: '6px 8px', color: '#64748b' }}>수도권 당일/익일 출고</td>
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}>1</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right' }}>{doc.shippingFee.toLocaleString()}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700 }}>{doc.shippingFee.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>

                {/* 금액 집계 박스 */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#ece7de', border: '1px solid #dcd5c9', borderRadius: 5, padding: '10px 14px' }}>
                  <div style={{ fontSize: 13.5, color: '#475569' }}>
                    입금 계좌: <span style={{ fontWeight: 700, color: '#0f172a' }}>{doc.bankInfo}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ fontSize: 13.5, color: '#64748b' }}>
                      공급가액: <span style={{ fontWeight: 700, color: '#0f172a' }}>₩{doc.supplyTotal.toLocaleString()}</span>
                    </div>
                    <div style={{ fontSize: 13.5, color: '#64748b' }}>
                      부가세 (10%): <span style={{ fontWeight: 700, color: '#0f172a' }}>₩{doc.vat.toLocaleString()}</span>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 900, color: '#047857' }}>
                      최종 견적 총액: ₩{doc.grandTotal.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. 배송 수령지 정보 */}
              <div style={{ background: '#f5f2eb', border: '1px solid #dcd5c9', borderRadius: 6, padding: '12px 16px' }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Truck size={16} color="#475569" />
                  <span>3. 부품 배송 수령지 정보</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <label style={{ fontSize: 13.5, fontWeight: 700, color: '#64748b' }}>배송 방법</label>
                    <select
                      value={doc.deliveryMethod}
                      onChange={e => setDoc(prev => ({ ...prev, deliveryMethod: e.target.value as any }))}
                      style={{ border: '1px solid #dcd5c9', borderRadius: 4, padding: '4px 8px', fontSize: 13.5, background: '#f5f2eb' }}
                    >
                      <option value="택배(CJ대한통운)">택배 (CJ대한통운 - 익일 도착)</option>
                      <option value="화물직배송">화물 직배송 (당일 긴급 배송)</option>
                      <option value="엔지니어직접수령">스페이스 직영센터 직접 수령</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <label style={{ fontSize: 13.5, fontWeight: 700, color: '#64748b' }}>배송 상세 주소</label>
                    <input
                      value={doc.deliveryAddress}
                      onChange={e => setDoc(prev => ({ ...prev, deliveryAddress: e.target.value }))}
                      style={{ border: '1px solid #dcd5c9', borderRadius: 4, padding: '4px 8px', fontSize: 13.5, background: '#f5f2eb' }}
                    />
                  </div>
                </div>
              </div>

              {/* 4. 문서 발송 수단 3가지 선택기 (카톡 / 문자 / 이메일) */}
              <div style={{
                background: '#ece7de', border: '1px solid #dcd5c9', borderRadius: 6, padding: '10px 14px',
                display: 'flex', flexDirection: 'column', gap: 8
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 800, color: '#0f172a' }}>견적서 발송 수단 선택</span>
                    <span style={{ fontSize: 13.5, color: '#64748b' }}>(소모품 부품 견적서)</span>
                  </div>
                  <div style={{ fontSize: 13.5, color: '#334155', fontWeight: 600 }}>
                    {sentChannel === 'KAKAO' && <span>수신처: <b>{doc.recipientManager}</b> ({doc.recipientPhone}) · 카톡 알림톡</span>}
                    {sentChannel === 'SMS' && <span>수신처: <b>{doc.recipientManager}</b> ({doc.recipientPhone}) · LMS 장문 문자</span>}
                    {sentChannel === 'EMAIL' && <span>수신처: <b>{doc.recipientEmail || '이메일 주소 필요'}</b> · 전자공문 PDF</span>}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  <button
                    type="button"
                    data-channel-option="KAKAO"
                    onClick={() => setSentChannel('KAKAO')}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      padding: '7px 12px', borderRadius: 5, fontSize: 13.5,
                      fontWeight: sentChannel === 'KAKAO' ? 800 : 600,
                      border: sentChannel === 'KAKAO' ? '1px solid #ca8a04' : '1px solid #dcd5c9',
                      background: sentChannel === 'KAKAO' ? '#fef08a' : '#f5f2eb',
                      color: sentChannel === 'KAKAO' ? '#713f12' : '#475569',
                      cursor: 'pointer', whiteSpace: 'nowrap'
                    }}
                  >
                    <MessageSquare size={14} color={sentChannel === 'KAKAO' ? '#713f12' : '#64748b'} />
                    <span>카톡으로 보내기</span>
                  </button>

                  <button
                    type="button"
                    data-channel-option="SMS"
                    onClick={() => setSentChannel('SMS')}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      padding: '7px 12px', borderRadius: 5, fontSize: 13.5,
                      fontWeight: sentChannel === 'SMS' ? 800 : 600,
                      border: sentChannel === 'SMS' ? '1px solid #0f172a' : '1px solid #dcd5c9',
                      background: sentChannel === 'SMS' ? '#0f172a' : '#f5f2eb',
                      color: sentChannel === 'SMS' ? '#ffffff' : '#475569',
                      cursor: 'pointer', whiteSpace: 'nowrap'
                    }}
                  >
                    <Smartphone size={14} color={sentChannel === 'SMS' ? '#ffffff' : '#64748b'} />
                    <span>문자메세지로 보내기</span>
                  </button>

                  <button
                    type="button"
                    data-channel-option="EMAIL"
                    onClick={() => setSentChannel('EMAIL')}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      padding: '7px 12px', borderRadius: 5, fontSize: 13.5,
                      fontWeight: sentChannel === 'EMAIL' ? 800 : 600,
                      border: sentChannel === 'EMAIL' ? '1px solid #1d4ed8' : '1px solid #dcd5c9',
                      background: sentChannel === 'EMAIL' ? '#1d4ed8' : '#f5f2eb',
                      color: sentChannel === 'EMAIL' ? '#ffffff' : '#475569',
                      cursor: 'pointer', whiteSpace: 'nowrap'
                    }}
                  >
                    <Mail size={14} color={sentChannel === 'EMAIL' ? '#ffffff' : '#64748b'} />
                    <span>이메일로 보내기</span>
                  </button>
                </div>

                {sentChannel === 'EMAIL' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2, background: '#eff6ff', padding: '6px 10px', borderRadius: 4, border: '1px solid #bfdbfe' }}>
                    <label style={{ fontSize: 13.5, fontWeight: 700, color: '#1e40af', whiteSpace: 'nowrap' }}>수신 이메일 주소:</label>
                    <input
                      value={doc.recipientEmail}
                      onChange={e => setDoc(prev => ({ ...prev, recipientEmail: e.target.value }))}
                      placeholder="원청 관리사무소 시설과장/소장 이메일 입력"
                      style={{ flex: 1, border: '1px solid #93c5fd', borderRadius: 4, padding: '3px 8px', fontSize: 13.5, background: '#ffffff', outline: 'none' }}
                    />
                  </div>
                )}
              </div>

              {/* 하단 발송 및 결재 액션 바 */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {doc.sentAt && (
                    <span style={{ fontSize: 13.5, color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CheckCircle2 size={14} />
                      원청({doc.recipientManager}) {doc.sentChannel === 'KAKAO' ? '카톡(알림톡)' : doc.sentChannel === 'SMS' ? '문자메세지' : '이메일'} 발송 완료 ({doc.sentAt})
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={handleSendQuotation}
                    data-uia="btn-send-parts-quote"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px',
                      borderRadius: 5, fontSize: 14, fontWeight: 800,
                      background: sentChannel === 'KAKAO' ? '#ca8a04' : sentChannel === 'SMS' ? '#0f172a' : '#1d4ed8',
                      color: '#ffffff', border: 'none', cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.18)'
                    }}
                  >
                    <Send size={14} />
                    <span>
                      원청 결재자에게 견적서 발송 ({sentChannel === 'KAKAO' ? '카톡으로 보내기' : sentChannel === 'SMS' ? '문자메세지로 보내기' : '이메일로 보내기'})
                    </span>
                  </button>

                  <button
                    onClick={handleApprove}
                    disabled={doc.approvalStatus === 'APPROVED' || doc.approvalStatus === 'DISPATCHED'}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
                      borderRadius: 5, fontSize: 13.5, fontWeight: 800,
                      background: doc.approvalStatus === 'APPROVED' || doc.approvalStatus === 'DISPATCHED' ? '#dcd5c9' : '#059669',
                      color: '#ffffff', border: 'none',
                      cursor: (doc.approvalStatus === 'APPROVED' || doc.approvalStatus === 'DISPATCHED') ? 'default' : 'pointer'
                    }}
                  >
                    <Check size={14} />
                    <span>{doc.approvalStatus === 'APPROVED' || doc.approvalStatus === 'DISPATCHED' ? '관리소 발주승인 완료' : '관리소 최종 발주승인'}</span>
                  </button>

                  <button
                    onClick={handleDispatch}
                    disabled={doc.approvalStatus === 'DISPATCHED'}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
                      borderRadius: 5, fontSize: 13.5, fontWeight: 800,
                      background: doc.approvalStatus === 'DISPATCHED' ? '#dcd5c9' : '#0f172a',
                      color: '#ffffff', border: 'none', cursor: doc.approvalStatus === 'DISPATCHED' ? 'default' : 'pointer'
                    }}
                  >
                    <Truck size={14} />
                    <span>{doc.approvalStatus === 'DISPATCHED' ? '택배 출고완료됨' : '출고 배송 지시'}</span>
                  </button>
                </div>
              </div>

            </div>
          ) : (
            /* ── 공식 A4 서식 인쇄 미리보기 모드 ── */
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              {/* 인쇄 제외 영역: 발송 수단 선택 및 즉시 발송 바 */}
              <div className="no-print" style={{ width: 794, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: '#ece7de', border: '1px solid #dcd5c9', borderRadius: 6, padding: '8px 14px'
                }}>
                  <div style={{ fontSize: 13.5, color: '#059669', fontWeight: 700 }}>
                    {doc.sentAt ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle2 size={14} />
                        원청({doc.recipientManager}) {doc.sentChannel === 'KAKAO' ? '카톡(알림톡)' : doc.sentChannel === 'SMS' ? '문자메세지(LMS)' : '이메일'} 발송 완료 ({doc.sentAt})
                      </span>
                    ) : (
                      <span style={{ color: '#64748b' }}>발송 상태: 발송 대기중</span>
                    )}
                  </div>

                  <button
                    onClick={handleSendQuotation}
                    data-uia="btn-send-preview"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '7px 18px',
                      borderRadius: 5, fontSize: 13.5, fontWeight: 800,
                      background: sentChannel === 'KAKAO' ? '#ca8a04' : sentChannel === 'SMS' ? '#0f172a' : '#1d4ed8',
                      color: '#ffffff', border: 'none', cursor: 'pointer'
                    }}
                  >
                    <Send size={13} />
                    <span>
                      공식 A4 견적서 바로 발송 ({sentChannel === 'KAKAO' ? '카톡으로 보내기' : sentChannel === 'SMS' ? '문자메세지로 보내기' : '이메일로 보내기'})
                    </span>
                  </button>
                </div>
              </div>

              {/* 실제 A4 인쇄 대상 컨테이너 */}
              <div ref={printAreaRef} style={{
                width: 794, minHeight: 1123, margin: '0 auto', padding: '40px 48px',
                background: '#ffffff', border: '1px solid #cbd5e1', boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                fontFamily: "'Batang', 'KoPubBatang', 'Pretendard', serif", color: '#000000', boxSizing: 'border-box'
              }}>
                {/* 상단 공문서 헤더 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #000', paddingBottom: 10, marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: '0.1em' }}>(주) 스 페 이 스</div>
                    <div style={{ fontSize: 13.5, color: '#475569', marginTop: 2 }}>SPACE ENGINEERING CO., LTD. | 소모품공급사업부</div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 13.5, lineHeight: 1.5 }}>
                    <div>문서번호: <b>{doc.docNo}</b></div>
                    <div>발행일자: {doc.issuedAt}</div>
                    <div>수신담당: <b>{doc.recipientManager} 귀하</b></div>
                  </div>
                </div>

                {/* 공문서 타이틀 */}
                <div style={{ textAlign: 'center', margin: '24px 0 20px' }}>
                  <span style={{
                    fontSize: 22, fontWeight: 900, textDecoration: 'underline', textUnderlineOffset: 6,
                    letterSpacing: '0.05em'
                  }}>
                    소모품·부품 공급 견적서
                  </span>
                  <div style={{ fontSize: 13.5, color: '#64748b', marginTop: 8 }}>
                    본 문서는 현장 사전 자가점검 확인에 의거한 정품 소모품 공급 및 구매 품의를 위한 공식 견적서입니다.
                  </div>
                </div>

                {/* 수신처 / 발신처 그리드 테이블 */}
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
                      <th style={{ background: '#f1f5f9', padding: '6px 8px', borderRight: '1px solid #cbd5e1', textAlign: 'center' }}>발송 수단</th>
                      <td style={{ padding: '6px 8px', borderRight: '1px solid #cbd5e1', fontWeight: 700 }}>
                        {sentChannel === 'KAKAO' ? '카톡 (카카오 알림톡)' : sentChannel === 'SMS' ? '문자메세지 (LMS 웹문서)' : `전자우편 (이메일: ${doc.recipientEmail})`}
                      </td>
                      <th style={{ background: '#f1f5f9', padding: '6px 8px', borderRight: '1px solid #cbd5e1', textAlign: 'center' }}>발송 상태</th>
                      <td style={{ padding: '6px 8px', fontWeight: 700, color: doc.sentAt ? '#059669' : '#b91c1c' }}>
                        {doc.sentAt ? `발송 완료 (${doc.sentAt})` : '발송 대기'}
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

                {/* 견적 품목 표 */}
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
                    {parts.filter(p => p.isSelected).map(p => (
                      <tr key={p.id} style={{ borderBottom: '1px solid #cbd5e1' }}>
                        <td style={{ padding: '6px', borderRight: '1px solid #cbd5e1', fontWeight: 600 }}>{p.name}</td>
                        <td style={{ padding: '6px', borderRight: '1px solid #cbd5e1', fontFamily: 'monospace' }}>{p.partCode}</td>
                        <td style={{ padding: '6px', borderRight: '1px solid #cbd5e1', textAlign: 'right' }}>{p.qty}</td>
                        <td style={{ padding: '6px', borderRight: '1px solid #cbd5e1', textAlign: 'right' }}>{p.unitPrice.toLocaleString()}</td>
                        <td style={{ padding: '6px', textAlign: 'right', fontWeight: 700 }}>{p.supplyPrice.toLocaleString()}</td>
                      </tr>
                    ))}
                    <tr style={{ borderBottom: '1px solid #000' }}>
                      <td style={{ padding: '6px', borderRight: '1px solid #cbd5e1', fontWeight: 600 }}>기본 안심 화물/택배 배송비</td>
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

                {/* 하단 공식 직인 날인 및 원청 결재란 */}
                <div style={{ marginTop: 24, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                  {/* 발신자 직인 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ lineHeight: 1.6, fontSize: 13.5 }}>
                      <div><b>주식회사 스페이스</b></div>
                      <div>서울특별시 금천구 가산디지털1로 123 스페이스빌딩 5층</div>
                      <div>대표이사 <b>이 스 페 이 스</b> (직인생략/전자서명)</div>
                      <div>입금계좌: <b>{doc.bankInfo}</b></div>
                    </div>

                    {/* 공식 직인 인장 SVG */}
                    <div style={{
                      width: 66, height: 66, border: '2px solid #dc2626', borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#dc2626', fontWeight: 900, fontSize: 13.5, textAlign: 'center', lineHeight: 1.2,
                      transform: 'rotate(-5deg)', opacity: 0.88, flexShrink: 0
                    }}>
                      (주)스페이스<br />대표이사<br />인
                    </div>
                  </div>

                  {/* 원청 관리사무소 결재란 박스 */}
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
        </div>

        {/* ── [하단 닫기 바] ── */}
        <div className="no-print" style={{
          background: '#ece7de', borderTop: '1px solid #dcd5c9',
          padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', flexShrink: 0
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '6px 16px', borderRadius: 4, fontSize: 13.5, fontWeight: 700,
              background: '#f5f2eb', border: '1px solid #dcd5c9', color: '#0f172a', cursor: 'pointer'
            }}
          >
            닫기
          </button>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
}
