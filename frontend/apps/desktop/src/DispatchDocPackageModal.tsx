import { useState, useRef } from 'react';
import {
  X, Check, Printer, Send,
  FileText, ShieldCheck, CheckCircle2, ChevronRight, User, Building,
  Camera, Edit3, Eye
} from 'lucide-react';

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
}

export interface DispatchDoc1st {
  docNo: string;
  issuedAt: string;
  recipientCompany: string; // 원청 고객사 (관리사무소)
  recipientManager: string; // 원청 결재권자 (시설과장/관리소장)
  recipientPhone: string;   // 원청 연락처
  recipientEmail: string;   // 원청 이메일
  siteCompany: string;      // 실사용처 (하청 청소용역사)
  siteWorkerName: string;   // 현장 통화자 (미화원/반장)
  siteWorkerPhone: string;  // 현장 연락처
  equipmentModel: string;
  serialNumber: string;
  salesType: string;
  symptoms: string[];
  selectedErrorCodes: string[];
  evidenceSteps: SelfActionEvidenceItem[];
  failureReason: string;    // 현장 불가피 사유 소명문
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
  onToast
}: DispatchDocPackageModalProps) {
  const [activeTab, setActiveTab] = useState<'doc1' | 'doc2'>(initialTab);
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const printAreaRef = useRef<HTMLDivElement>(null);

  // ── 1차 문서 기본 상태 ──
  const now = new Date();
  const dateFormatted = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;
  const tomorrowFormatted = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate() + 1).padStart(2, '0')} 14:00`;

  const [doc1, setDoc1] = useState<DispatchDoc1st>(() => ({
    docNo: initialDoc1st?.docNo || `S-CHK-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-01`,
    issuedAt: initialDoc1st?.issuedAt || dateFormatted,
    recipientCompany: initialDoc1st?.recipientCompany || '반포자이 아파트 관리사무소',
    recipientManager: initialDoc1st?.recipientManager || '박시설 시설과장',
    recipientPhone: initialDoc1st?.recipientPhone || '010-9876-5432',
    recipientEmail: initialDoc1st?.recipientEmail || 'facility@banpojai.co.kr',
    siteCompany: initialDoc1st?.siteCompany || '(주)클린에코 미화용역',
    siteWorkerName: initialDoc1st?.siteWorkerName || '김순자 미화반장',
    siteWorkerPhone: initialDoc1st?.siteWorkerPhone || '010-3456-7890',
    equipmentModel: initialDoc1st?.equipmentModel || 'J600T',
    serialNumber: initialDoc1st?.serialNumber || 'J600T-2024-0812',
    salesType: initialDoc1st?.salesType || '렌탈(임대)',
    symptoms: initialDoc1st?.symptoms?.length ? initialDoc1st.symptoms : ['잔수 흡입 불량 및 오수 유출'],
    selectedErrorCodes: initialDoc1st?.selectedErrorCodes?.length ? initialDoc1st.selectedErrorCodes : ['E01'],
    evidenceSteps: initialDoc1st?.evidenceSteps?.length ? initialDoc1st.evidenceSteps : [
      {
        stepNo: 1,
        title: '배터리 전압 및 메인 퓨즈 점검',
        method: '키 ON 상태에서 메인 퓨즈 통전 및 전압계 수치 확인',
        result: 'NORMAL',
        note: '정상 24.2V 출력 확인, 퓨즈 단선 없음'
      },
      {
        stepNo: 2,
        title: '오수탱크 플로트 밸브 및 흡입 호스 점검',
        method: '오수탱크 플로트 유동 상태 및 호스 내부 이물질 통수 점검',
        result: 'NORMAL',
        note: '플로트 정상 차단 작동, 호스 내 슬러지 막힘 없음 확인'
      },
      {
        stepNo: 3,
        title: '진공 흡입 모터 임펠러 구동 및 통전 테스트',
        method: '모터 직결 배선 수음 및 임펠러 수동 회전 점검',
        result: 'FAULT',
        note: '모터 내부 코일 소손 및 카본브러시 마모로 팬 고착 (현장 조치 불가)'
      }
    ],
    failureReason: initialDoc1st?.failureReason || '제조사 공식 매뉴얼에 의거하여 3단계 사전 자가점검(호스/필터/퓨즈)을 성실히 이행하였으나, 진공 흡입 모터 모듈 내부 고장으로 판정되어 현장 일반 조치가 불가능하며, 정품 부품 지참 및 전문 기술 엔지니어 현장 출장 정비가 불가피함을 확인합니다.',
    assignedEngineer: initialDoc1st?.assignedEngineer || '이정민 주임',
    engineerPhone: initialDoc1st?.engineerPhone || '010-4444-5555',
    engineerCenter: initialDoc1st?.engineerCenter || '스페이스 수도권 AS 직영센터',
    plannedVisitAt: initialDoc1st?.plannedVisitAt || tomorrowFormatted,
    sitePreparation: initialDoc1st?.sitePreparation || '장비 주변 작업 공간 확보 및 전원 키 보관 상태 유지 협조',
    sentAt: initialDoc1st?.sentAt,
    sentChannel: initialDoc1st?.sentChannel,
    status: initialDoc1st?.status || 'DRAFT'
  }));

  // ── 2차 통합문서 기본 상태 ──
  const [doc2, setDoc2] = useState<DispatchDoc2nd>(() => {
    const initialParts: EstimatePartItem[] = initialDoc2nd?.parts?.length ? initialDoc2nd.parts : [
      {
        id: 'p1',
        name: '진공 흡입 모터 어셈블리 24V',
        partCode: 'J600T-MOT-01',
        qty: 1,
        unitPrice: 180000,
        supplyPrice: 180000
      },
      {
        id: 'p2',
        name: '방진 모터 실링 가스켓',
        partCode: 'J600T-GSK-02',
        qty: 1,
        unitPrice: 20000,
        supplyPrice: 20000
      }
    ];

    const techFee = initialDoc2nd?.techLaborFee ?? 80000;
    const travelFee = initialDoc2nd?.travelFee ?? 50000;
    const partsSum = initialParts.reduce((sum, p) => sum + p.supplyPrice, 0);
    const supplyTotal = partsSum + techFee + travelFee;
    const vat = Math.round(supplyTotal * 0.1);
    const grandTotal = supplyTotal + vat;

    return {
      docNo: initialDoc2nd?.docNo || `S-EST-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate() + 1).padStart(2, '0')}-01`,
      refDoc1stNo: initialDoc2nd?.refDoc1stNo || doc1.docNo,
      issuedAt: initialDoc2nd?.issuedAt || dateFormatted,
      recipientCompany: initialDoc2nd?.recipientCompany || doc1.recipientCompany,
      recipientManager: initialDoc2nd?.recipientManager || doc1.recipientManager,
      recipientPhone: initialDoc2nd?.recipientPhone || doc1.recipientPhone,
      recipientEmail: initialDoc2nd?.recipientEmail || doc1.recipientEmail,
      siteCompany: initialDoc2nd?.siteCompany || doc1.siteCompany,
      equipmentModel: initialDoc2nd?.equipmentModel || doc1.equipmentModel,
      serialNumber: initialDoc2nd?.serialNumber || doc1.serialNumber,
      engineerName: initialDoc2nd?.engineerName || doc1.assignedEngineer,
      visitedAt: initialDoc2nd?.visitedAt || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate() + 1).padStart(2, '0')} 14:30 ~ 15:40`,
      rootCause: initialDoc2nd?.rootCause || '진공 흡입 모터 내부 카본브러시 완전 마모 및 회전자 코일 소손에 의한 구동 고착',
      actionTaken: initialDoc2nd?.actionTaken || '24V 신품 흡입 모터 어셈블리 교체, 방진 가스켓 교환, 시운전 진공 흡입 압력 18.2kPa 정상치 복구 완료',
      parts: initialParts,
      techLaborFee: techFee,
      travelFee: travelFee,
      supplyTotal: supplyTotal,
      vat: vat,
      grandTotal: grandTotal,
      bankInfo: initialDoc2nd?.bankInfo || '신한은행 110-123-456789 (예금주: (주)스페이스)',
      sentAt: initialDoc2nd?.sentAt,
      sentChannel: initialDoc2nd?.sentChannel,
      approvalStatus: initialDoc2nd?.approvalStatus || 'PENDING'
    };
  });

  // 부품 합계 재계산 헬퍼
  const recalculateAmounts = (parts: EstimatePartItem[], techFee: number, travelFee: number) => {
    const partsSum = parts.reduce((acc, p) => acc + (p.qty * p.unitPrice), 0);
    const supply = partsSum + techFee + travelFee;
    const vat = Math.round(supply * 0.1);
    const grand = supply + vat;
    setDoc2(prev => ({
      ...prev,
      parts,
      techLaborFee: techFee,
      travelFee: travelFee,
      supplyTotal: supply,
      vat,
      grandTotal: grand
    }));
  };

  // 1차 발송 핸들러
  const handleSendDoc1 = () => {
    const sendTime = new Date().toLocaleString();
    setDoc1(prev => ({
      ...prev,
      sentAt: sendTime,
      sentChannel: 'KAKAO',
      status: 'SENT'
    }));
    onToast?.(`원청 결재권자(${doc1.recipientCompany} ${doc1.recipientManager} 귀하)에게 1차 [기술점검 확인 및 방문안내서] 알림톡 및 전자문서가 성공적으로 발송되었습니다.`);
  };

  // 2차 발송 핸들러
  const handleSendDoc2 = () => {
    const sendTime = new Date().toLocaleString();
    setDoc2(prev => ({
      ...prev,
      sentAt: sendTime,
      sentChannel: 'KAKAO',
      approvalStatus: 'SENT'
    }));
    onToast?.(`원청 결재권자(${doc2.recipientCompany} ${doc2.recipientManager} 귀하)에게 2차 [AS 완료보고 및 통합 정산 견적서] 알림톡 및 전자결재 링크가 발송되었습니다.`);
  };

  // 원청 결재 승인 종결 핸들러
  const handleApproveDoc2 = () => {
    setDoc2(prev => ({
      ...prev,
      approvalStatus: 'APPROVED'
    }));
    onToast?.(`원청 관리사무소 품의 및 지출결재 승인이 완료되었습니다. (종결 처리됨)`);
  };

  // 인쇄 다이얼로그 호출
  const handlePrint = () => {
    window.print();
  };

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
            <FileText size={18} color="#dc2626" />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                  원청 결재 연계 2단계 AS 행정 패키지
                </span>
                <span style={{
                  fontSize: 13.5, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                  background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca'
                }}>
                  원청 수신 원칙
                </span>
              </div>
              <div style={{ fontSize: 13.5, color: '#64748b', marginTop: 2 }}>
                하청(현장 미화원) 자가조치 시도 실패 증빙 ➔ 원청(관리사무소) 1차 방문안내 및 2차 통합 견적서 연계
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* 뷰 모드 토글 */}
            <div style={{ display: 'flex', background: '#f5f2eb', border: '1px solid #dcd5c9', borderRadius: 5, padding: 2 }}>
              <button
                onClick={() => setViewMode('edit')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px',
                  borderRadius: 4, fontSize: 13.5, fontWeight: viewMode === 'edit' ? 800 : 600,
                  border: 'none', background: viewMode === 'edit' ? '#2563eb' : 'transparent',
                  color: viewMode === 'edit' ? '#ffffff' : '#64748b', cursor: 'pointer'
                }}
              >
                <Edit3 size={13} />
                <span>작업/편집</span>
              </button>
              <button
                onClick={() => setViewMode('preview')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px',
                  borderRadius: 4, fontSize: 13.5, fontWeight: viewMode === 'preview' ? 800 : 600,
                  border: 'none', background: viewMode === 'preview' ? '#2563eb' : 'transparent',
                  color: viewMode === 'preview' ? '#ffffff' : '#64748b', cursor: 'pointer'
                }}
              >
                <Eye size={13} />
                <span>공식 A4 서식</span>
              </button>
            </div>

            <button
              onClick={handlePrint}
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
                  최종 문서 수신인 (원청 결재권자)
                </span>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
                  {doc1.recipientCompany}
                </span>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: '#475569' }}>
                  {doc1.recipientManager} ({doc1.recipientPhone})
                </span>
              </div>
              <div style={{ fontSize: 13.5, color: '#64748b' }}>
                품의서/지출결의서 첨부용 1차 점검확인서 및 2차 직인 견적서 직통 수신
              </div>
            </div>
          </div>

          <div style={{ width: 1, height: 26, background: '#dcd5c9' }} />

          {/* 하청 현장 통화자 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
            <User size={16} color="#059669" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 13.5, fontWeight: 800, color: '#047857', background: '#ecfdf5', padding: '1px 6px', borderRadius: 3 }}>
                  실사용처 (현장 통화자)
                </span>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
                  {doc1.siteCompany}
                </span>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: '#475569' }}>
                  {doc1.siteWorkerName} ({doc1.siteWorkerPhone})
                </span>
              </div>
              <div style={{ fontSize: 13.5, color: '#64748b' }}>
                현장 3단계 자가조치 가이드 및 이상 증거 사진 촬영·회신 담당
              </div>
            </div>
          </div>
        </div>

        {/* ── [단계 탭 선택 바] ── */}
        <div style={{
          background: '#ece7de', borderBottom: '1px solid #dcd5c9',
          padding: '0 20px', display: 'flex', alignItems: 'center', gap: 12, height: 42, flexShrink: 0
        }}>
          {/* 1차 탭 */}
          <button
            onClick={() => setActiveTab('doc1')}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, height: '100%',
              padding: '0 12px', border: 'none', cursor: 'pointer', background: 'transparent',
              borderBottom: activeTab === 'doc1' ? '2.5px solid #2563eb' : '2.5px solid transparent',
              color: activeTab === 'doc1' ? '#1d4ed8' : '#64748b',
              fontWeight: activeTab === 'doc1' ? 800 : 600, fontSize: 14
            }}
          >
            <span>1차: 기술점검 확인 및 방문안내서 (사전 면책 명분)</span>
            <span style={{
              fontSize: 13.5, fontWeight: 700, padding: '1px 6px', borderRadius: 3,
              background: doc1.status === 'SENT' ? '#ecfdf5' : '#fffbeb',
              color: doc1.status === 'SENT' ? '#059669' : '#b45309',
              border: doc1.status === 'SENT' ? '1px solid #a7f3d0' : '1px solid #fde68a'
            }}>
              {doc1.status === 'SENT' ? '원청 발송완료' : '원청 발송대기'}
            </span>
          </button>

          <ChevronRight size={14} color="#94a3b8" />

          {/* 2차 탭 */}
          <button
            onClick={() => setActiveTab('doc2')}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, height: '100%',
              padding: '0 12px', border: 'none', cursor: 'pointer', background: 'transparent',
              borderBottom: activeTab === 'doc2' ? '2.5px solid #2563eb' : '2.5px solid transparent',
              color: activeTab === 'doc2' ? '#1d4ed8' : '#64748b',
              fontWeight: activeTab === 'doc2' ? 800 : 600, fontSize: 14
            }}
          >
            <span>2차: AS 완료보고 및 통합 정산 견적서 (사후 최종 결재)</span>
            <span style={{
              fontSize: 13.5, fontWeight: 700, padding: '1px 6px', borderRadius: 3,
              background: doc2.approvalStatus === 'APPROVED' ? '#ecfdf5' : doc2.approvalStatus === 'SENT' ? '#eff6ff' : '#fef2f2',
              color: doc2.approvalStatus === 'APPROVED' ? '#059669' : doc2.approvalStatus === 'SENT' ? '#1d4ed8' : '#dc2626',
              border: doc2.approvalStatus === 'APPROVED' ? '1px solid #a7f3d0' : doc2.approvalStatus === 'SENT' ? '1px solid #bfdbfe' : '1px solid #fecaca'
            }}>
              {doc2.approvalStatus === 'APPROVED' ? '결재승인 종결' : doc2.approvalStatus === 'SENT' ? '견적서 발송완료' : '견적서 작성대기'}
            </span>
          </button>
        </div>

        {/* ── [본문 작업 영역] ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20, background: '#f5f2eb' }}>
          {viewMode === 'edit' ? (
            activeTab === 'doc1' ? (
              /* ── 1차 문서 작업/편집 폼 ── */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 960, margin: '0 auto' }}>
                {/* 1. 기본 개요 패널 */}
                <div style={{ background: '#f5f2eb', border: '1px solid #dcd5c9', borderRadius: 6, padding: '14px 16px' }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>1. 점검 및 접수 기본 사항</span>
                    <span style={{ fontSize: 13.5, color: '#64748b', fontFamily: 'monospace' }}>문서번호: {doc1.docNo}</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <label style={{ fontSize: 13.5, fontWeight: 700, color: '#64748b' }}>고객사 (원청)</label>
                      <input
                        value={doc1.recipientCompany}
                        onChange={e => setDoc1(prev => ({ ...prev, recipientCompany: e.target.value }))}
                        style={{ border: '1px solid #dcd5c9', borderRadius: 4, padding: '4px 8px', fontSize: 13.5, background: '#f5f2eb' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <label style={{ fontSize: 13.5, fontWeight: 700, color: '#64748b' }}>원청 결재권자</label>
                      <input
                        value={doc1.recipientManager}
                        onChange={e => setDoc1(prev => ({ ...prev, recipientManager: e.target.value }))}
                        style={{ border: '1px solid #dcd5c9', borderRadius: 4, padding: '4px 8px', fontSize: 13.5, background: '#f5f2eb' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <label style={{ fontSize: 13.5, fontWeight: 700, color: '#64748b' }}>결재자 연락처 (문서 수신)</label>
                      <input
                        value={doc1.recipientPhone}
                        onChange={e => setDoc1(prev => ({ ...prev, recipientPhone: e.target.value }))}
                        style={{ border: '1px solid #dcd5c9', borderRadius: 4, padding: '4px 8px', fontSize: 13.5, background: '#f5f2eb' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <label style={{ fontSize: 13.5, fontWeight: 700, color: '#64748b' }}>결재자 이메일</label>
                      <input
                        value={doc1.recipientEmail}
                        onChange={e => setDoc1(prev => ({ ...prev, recipientEmail: e.target.value }))}
                        style={{ border: '1px solid #dcd5c9', borderRadius: 4, padding: '4px 8px', fontSize: 13.5, background: '#f5f2eb' }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <label style={{ fontSize: 13.5, fontWeight: 700, color: '#64748b' }}>실사용처 (하청 용역사)</label>
                      <input
                        value={doc1.siteCompany}
                        onChange={e => setDoc1(prev => ({ ...prev, siteCompany: e.target.value }))}
                        style={{ border: '1px solid #dcd5c9', borderRadius: 4, padding: '4px 8px', fontSize: 13.5, background: '#f5f2eb' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <label style={{ fontSize: 13.5, fontWeight: 700, color: '#64748b' }}>현장 통화자 (미화원)</label>
                      <input
                        value={doc1.siteWorkerName}
                        onChange={e => setDoc1(prev => ({ ...prev, siteWorkerName: e.target.value }))}
                        style={{ border: '1px solid #dcd5c9', borderRadius: 4, padding: '4px 8px', fontSize: 13.5, background: '#f5f2eb' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <label style={{ fontSize: 13.5, fontWeight: 700, color: '#64748b' }}>현장 연락처</label>
                      <input
                        value={doc1.siteWorkerPhone}
                        onChange={e => setDoc1(prev => ({ ...prev, siteWorkerPhone: e.target.value }))}
                        style={{ border: '1px solid #dcd5c9', borderRadius: 4, padding: '4px 8px', fontSize: 13.5, background: '#f5f2eb' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <label style={{ fontSize: 13.5, fontWeight: 700, color: '#64748b' }}>대상 장비 및 S/N</label>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <input
                          value={doc1.equipmentModel}
                          onChange={e => setDoc1(prev => ({ ...prev, equipmentModel: e.target.value }))}
                          style={{ width: '45%', border: '1px solid #dcd5c9', borderRadius: 4, padding: '4px 8px', fontSize: 13.5, background: '#f5f2eb' }}
                        />
                        <input
                          value={doc1.serialNumber}
                          onChange={e => setDoc1(prev => ({ ...prev, serialNumber: e.target.value }))}
                          style={{ width: '55%', border: '1px solid #dcd5c9', borderRadius: 4, padding: '4px 8px', fontSize: 13.5, background: '#f5f2eb' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. ★ 핵심: 3단계 자가조치 시도 및 실패 증빙 (원청 품의 명분) ★ */}
                <div style={{ background: '#f5f2eb', border: '1.5px solid #2563eb', borderRadius: 6, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <ShieldCheck size={16} color="#1d4ed8" />
                      <span style={{ fontSize: 14.5, fontWeight: 800, color: '#1e40af' }}>
                        2. 3단계 사전 자가조치 시도 및 실패 증빙 (원청 내부 품의용 핵심 근거)
                      </span>
                    </div>
                    <span style={{ fontSize: 13.5, color: '#64748b' }}>
                      "최선의 점검 노력을 다했으나 부품 고장으로 조치 불가함을 입증"
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {doc1.evidenceSteps.map((step, idx) => (
                      <div key={idx} style={{
                        background: '#f5f2eb', border: '1px solid #dcd5c9', borderRadius: 5, padding: '10px 12px',
                        display: 'flex', flexDirection: 'column', gap: 6
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{
                              fontSize: 13.5, fontWeight: 800, padding: '2px 8px', borderRadius: 3,
                              background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe'
                            }}>
                              STEP {step.stepNo}
                            </span>
                            <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                              {step.title}
                            </span>
                          </div>

                          {/* 결과 상태 선택 */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <button
                              onClick={() => {
                                const next = [...doc1.evidenceSteps];
                                next[idx].result = 'NORMAL';
                                setDoc1(prev => ({ ...prev, evidenceSteps: next }));
                              }}
                              style={{
                                padding: '2px 8px', borderRadius: 4, fontSize: 13.5, fontWeight: 700,
                                border: step.result === 'NORMAL' ? '1px solid #059669' : '1px solid #dcd5c9',
                                background: step.result === 'NORMAL' ? '#ecfdf5' : '#f5f2eb',
                                color: step.result === 'NORMAL' ? '#059669' : '#64748b', cursor: 'pointer'
                              }}
                            >
                              정상 (이상무)
                            </button>
                            <button
                              onClick={() => {
                                const next = [...doc1.evidenceSteps];
                                next[idx].result = 'FAULT';
                                setDoc1(prev => ({ ...prev, evidenceSteps: next }));
                              }}
                              style={{
                                padding: '2px 8px', borderRadius: 4, fontSize: 13.5, fontWeight: 700,
                                border: step.result === 'FAULT' ? '1px solid #dc2626' : '1px solid #dcd5c9',
                                background: step.result === 'FAULT' ? '#fef2f2' : '#f5f2eb',
                                color: step.result === 'FAULT' ? '#dc2626' : '#64748b', cursor: 'pointer'
                              }}
                            >
                              불량 (조치불가)
                            </button>
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          <div>
                            <span style={{ fontSize: 13.5, color: '#64748b', fontWeight: 600 }}>점검 방법: </span>
                            <span style={{ fontSize: 13.5, color: '#334155' }}>{step.method}</span>
                          </div>
                          <div>
                            <span style={{ fontSize: 13.5, color: '#64748b', fontWeight: 600 }}>현장 확인 결과: </span>
                            <input
                              value={step.note}
                              onChange={e => {
                                const next = [...doc1.evidenceSteps];
                                next[idx].note = e.target.value;
                                setDoc1(prev => ({ ...prev, evidenceSteps: next }));
                              }}
                              style={{ width: '80%', border: '1px solid #dcd5c9', borderRadius: 3, padding: '2px 6px', fontSize: 13.5, background: '#f5f2eb' }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 현장 조치 불가 사유 소명문 */}
                  <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 13.5, fontWeight: 700, color: '#b91c1c' }}>
                      현장 조치 불가 및 출장 필요 사유 (소명서 문안)
                    </label>
                    <textarea
                      rows={2}
                      value={doc1.failureReason}
                      onChange={e => setDoc1(prev => ({ ...prev, failureReason: e.target.value }))}
                      style={{ border: '1px solid #fca5a5', borderRadius: 4, padding: '6px 10px', fontSize: 13.5, background: '#fff5f5', color: '#0f172a', lineHeight: 1.4 }}
                    />
                  </div>

                  {/* 현장 사진 증빙 박스 */}
                  <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, background: '#eff6ff', border: '1px dashed #bfdbfe', borderRadius: 5, padding: '8px 12px' }}>
                    <Camera size={16} color="#2563eb" />
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: '#1e40af' }}>
                      현장 통화자 전송 사진 증빙 2건 등록됨
                    </span>
                    <span style={{ fontSize: 13.5, color: '#64748b' }}>
                      (1. 플로트 밸브 상태 사진 / 2. 흡입 모터 접점 및 적색 펜 스케치 회신 사진)
                    </span>
                  </div>
                </div>

                {/* 3. AS 엔지니어 방문 예정 안내 */}
                <div style={{ background: '#f5f2eb', border: '1px solid #dcd5c9', borderRadius: 6, padding: '14px 16px' }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginBottom: 10 }}>
                    3. AS 엔지니어 방문 예정 정보
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <label style={{ fontSize: 13.5, fontWeight: 700, color: '#64748b' }}>배정 엔지니어</label>
                      <input
                        value={doc1.assignedEngineer}
                        onChange={e => setDoc1(prev => ({ ...prev, assignedEngineer: e.target.value }))}
                        style={{ border: '1px solid #dcd5c9', borderRadius: 4, padding: '4px 8px', fontSize: 13.5, background: '#f5f2eb' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <label style={{ fontSize: 13.5, fontWeight: 700, color: '#64748b' }}>엔지니어 연락처</label>
                      <input
                        value={doc1.engineerPhone}
                        onChange={e => setDoc1(prev => ({ ...prev, engineerPhone: e.target.value }))}
                        style={{ border: '1px solid #dcd5c9', borderRadius: 4, padding: '4px 8px', fontSize: 13.5, background: '#f5f2eb' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <label style={{ fontSize: 13.5, fontWeight: 700, color: '#64748b' }}>방문 예정 일시</label>
                      <input
                        value={doc1.plannedVisitAt}
                        onChange={e => setDoc1(prev => ({ ...prev, plannedVisitAt: e.target.value }))}
                        style={{ border: '1px solid #dcd5c9', borderRadius: 4, padding: '4px 8px', fontSize: 13.5, background: '#f5f2eb' }}
                      />
                    </div>
                  </div>
                </div>

                {/* 1차 하단 발송 액션 바 */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {doc1.sentAt && (
                      <span style={{ fontSize: 13.5, color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle2 size={14} />
                        원청({doc1.recipientManager}) 카카오 알림톡 발송 완료 ({doc1.sentAt})
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      onClick={handleSendDoc1}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px',
                        borderRadius: 5, fontSize: 14, fontWeight: 800,
                        background: '#2563eb', color: '#ffffff', border: 'none', cursor: 'pointer',
                        boxShadow: '0 1px 3px rgba(37,99,235,0.2)'
                      }}
                    >
                      <Send size={14} />
                      <span>원청 결재자에게 1차 발송 (알림톡/문자)</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('doc2')}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                        borderRadius: 5, fontSize: 13.5, fontWeight: 700,
                        background: '#f5f2eb', color: '#334155', border: '1px solid #dcd5c9', cursor: 'pointer'
                      }}
                    >
                      <span>2차 견적서 단계로 ➔</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* ── 2차 통합문서 작업/편집 폼 ── */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 960, margin: '0 auto' }}>
                {/* 1. 1차 연계 및 방문 정비 결과 */}
                <div style={{ background: '#f5f2eb', border: '1px solid #dcd5c9', borderRadius: 6, padding: '14px 16px' }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckCircle2 size={16} color="#059669" />
                      <span>1. 현장 방문 AS 정비 결과 보고</span>
                    </div>
                    <span style={{ fontSize: 13.5, color: '#64748b', fontFamily: 'monospace' }}>
                      1차 점검 연계 번호: {doc2.refDoc1stNo}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <label style={{ fontSize: 13.5, fontWeight: 700, color: '#64748b' }}>방문 정비 일시</label>
                      <input
                        value={doc2.visitedAt}
                        onChange={e => setDoc2(prev => ({ ...prev, visitedAt: e.target.value }))}
                        style={{ border: '1px solid #dcd5c9', borderRadius: 4, padding: '4px 8px', fontSize: 13.5, background: '#f5f2eb' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <label style={{ fontSize: 13.5, fontWeight: 700, color: '#64748b' }}>담당 정비 엔지니어</label>
                      <input
                        value={doc2.engineerName}
                        onChange={e => setDoc2(prev => ({ ...prev, engineerName: e.target.value }))}
                        style={{ border: '1px solid #dcd5c9', borderRadius: 4, padding: '4px 8px', fontSize: 13.5, background: '#f5f2eb' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <label style={{ fontSize: 13.5, fontWeight: 700, color: '#64748b' }}>수신처 (원청 결재권자)</label>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a', padding: '6px 8px', background: '#eff6ff', borderRadius: 4 }}>
                        {doc2.recipientCompany} ({doc2.recipientManager})
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <label style={{ fontSize: 13.5, fontWeight: 700, color: '#b91c1c' }}>최종 정밀 고장 원인 판정</label>
                      <input
                        value={doc2.rootCause}
                        onChange={e => setDoc2(prev => ({ ...prev, rootCause: e.target.value }))}
                        style={{ border: '1px solid #dcd5c9', borderRadius: 4, padding: '4px 8px', fontSize: 13.5, background: '#f5f2eb' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <label style={{ fontSize: 13.5, fontWeight: 700, color: '#059669' }}>정비 조치 내역 및 정상 복구 확인</label>
                      <textarea
                        rows={2}
                        value={doc2.actionTaken}
                        onChange={e => setDoc2(prev => ({ ...prev, actionTaken: e.target.value }))}
                        style={{ border: '1px solid #dcd5c9', borderRadius: 4, padding: '6px 8px', fontSize: 13.5, background: '#f5f2eb', lineHeight: 1.4 }}
                      />
                    </div>
                  </div>
                </div>

                {/* 2. ★ 핵심: 통합 정산 견적서 (스페이스 직인 날인) ★ */}
                <div style={{ background: '#f5f2eb', border: '1.5px solid #059669', borderRadius: 6, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <FileText size={16} color="#059669" />
                      <span style={{ fontSize: 14.5, fontWeight: 800, color: '#065f46' }}>
                        2. 통합 정산 견적서 (원청 관리소장 결재 및 품의서 직통용)
                      </span>
                    </div>
                    <span style={{ fontSize: 13.5, color: '#64748b' }}>
                      (주)스페이스 대표이사 직인 날인 견적서
                    </span>
                  </div>

                  {/* 견적 항목 테이블 */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5, marginBottom: 12 }}>
                    <thead>
                      <tr style={{ background: '#ece7de', borderBottom: '1px solid #dcd5c9', color: '#475569' }}>
                        <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 700, width: '40%' }}>품목 / 정비 항목</th>
                        <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 700, width: '20%' }}>규격 / 부품코드</th>
                        <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, width: '10%' }}>수량</th>
                        <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, width: '15%' }}>단가 (원)</th>
                        <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, width: '15%' }}>공급가액 (원)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {doc2.parts.map((p, idx) => (
                        <tr key={p.id} style={{ borderBottom: '1px solid #e8e2d8' }}>
                          <td style={{ padding: '6px 8px', fontWeight: 600, color: '#0f172a' }}>{p.name}</td>
                          <td style={{ padding: '6px 8px', color: '#64748b', fontFamily: 'monospace' }}>{p.partCode}</td>
                          <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                            <input
                              type="number"
                              value={p.qty}
                              onChange={e => {
                                const newQty = parseInt(e.target.value) || 0;
                                const nextParts = [...doc2.parts];
                                nextParts[idx].qty = newQty;
                                nextParts[idx].supplyPrice = newQty * nextParts[idx].unitPrice;
                                recalculateAmounts(nextParts, doc2.techLaborFee, doc2.travelFee);
                              }}
                              style={{ width: 44, textAlign: 'right', border: '1px solid #dcd5c9', borderRadius: 3, padding: '2px 4px', fontSize: 13.5, background: '#f5f2eb' }}
                            />
                          </td>
                          <td style={{ padding: '6px 8px', textAlign: 'right', color: '#334155' }}>
                            {p.unitPrice.toLocaleString()}
                          </td>
                          <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                            {p.supplyPrice.toLocaleString()}
                          </td>
                        </tr>
                      ))}

                      {/* 기술료 (공임) */}
                      <tr style={{ borderBottom: '1px solid #e8e2d8' }}>
                        <td style={{ padding: '6px 8px', fontWeight: 600, color: '#0f172a' }}>기술료 (엔지니어 정밀 분해 장착 공임)</td>
                        <td style={{ padding: '6px 8px', color: '#64748b' }}>표준 공임</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right' }}>1</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', color: '#334155' }}>
                          <input
                            type="number"
                            value={doc2.techLaborFee}
                            onChange={e => {
                              const val = parseInt(e.target.value) || 0;
                              recalculateAmounts(doc2.parts, val, doc2.travelFee);
                            }}
                            style={{ width: 80, textAlign: 'right', border: '1px solid #dcd5c9', borderRadius: 3, padding: '2px 4px', fontSize: 13.5, background: '#f5f2eb' }}
                          />
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                          {doc2.techLaborFee.toLocaleString()}
                        </td>
                      </tr>

                      {/* 출장비 */}
                      <tr style={{ borderBottom: '1px solid #dcd5c9' }}>
                        <td style={{ padding: '6px 8px', fontWeight: 600, color: '#0f172a' }}>현장 출장비 (수도권 직영 출장)</td>
                        <td style={{ padding: '6px 8px', color: '#64748b' }}>기본 출장</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right' }}>1</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', color: '#334155' }}>
                          <input
                            type="number"
                            value={doc2.travelFee}
                            onChange={e => {
                              const val = parseInt(e.target.value) || 0;
                              recalculateAmounts(doc2.parts, doc2.techLaborFee, val);
                            }}
                            style={{ width: 80, textAlign: 'right', border: '1px solid #dcd5c9', borderRadius: 3, padding: '2px 4px', fontSize: 13.5, background: '#f5f2eb' }}
                          />
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                          {doc2.travelFee.toLocaleString()}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* 금액 집계 및 결재 박스 */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#ece7de', border: '1px solid #dcd5c9', borderRadius: 5, padding: '10px 14px' }}>
                    <div style={{ fontSize: 13.5, color: '#475569' }}>
                      입금 계좌: <span style={{ fontWeight: 700, color: '#0f172a' }}>{doc2.bankInfo}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ fontSize: 13.5, color: '#64748b' }}>
                        공급가액: <span style={{ fontWeight: 700, color: '#0f172a' }}>₩{doc2.supplyTotal.toLocaleString()}</span>
                      </div>
                      <div style={{ fontSize: 13.5, color: '#64748b' }}>
                        부가세 (10%): <span style={{ fontWeight: 700, color: '#0f172a' }}>₩{doc2.vat.toLocaleString()}</span>
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 900, color: '#dc2626' }}>
                        최종 청구 총액: ₩{doc2.grandTotal.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2차 하단 발송 및 결재 액션 바 */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {doc2.sentAt && (
                      <span style={{ fontSize: 13.5, color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle2 size={14} />
                        원청({doc2.recipientManager}) 견적서 알림톡 발송 완료 ({doc2.sentAt})
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      onClick={handleSendDoc2}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px',
                        borderRadius: 5, fontSize: 14, fontWeight: 800,
                        background: '#059669', color: '#ffffff', border: 'none', cursor: 'pointer',
                        boxShadow: '0 1px 3px rgba(5,150,105,0.2)'
                      }}
                    >
                      <Send size={14} />
                      <span>원청 결재자에게 2차 견적서 발송 (알림톡/문자)</span>
                    </button>

                    <button
                      onClick={handleApproveDoc2}
                      disabled={doc2.approvalStatus === 'APPROVED'}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
                        borderRadius: 5, fontSize: 13.5, fontWeight: 800,
                        background: doc2.approvalStatus === 'APPROVED' ? '#dcd5c9' : '#1d4ed8',
                        color: '#ffffff', border: 'none', cursor: doc2.approvalStatus === 'APPROVED' ? 'default' : 'pointer'
                      }}
                    >
                      <Check size={14} />
                      <span>{doc2.approvalStatus === 'APPROVED' ? '원청 결재승인 완료됨' : '원청 최종 결재승인 종결'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )
          ) : (
            /* ── 공식 A4 서식 인쇄 미리보기 모드 ── */
            <div ref={printAreaRef} style={{
              width: 794, minHeight: 1123, margin: '0 auto', padding: '40px 48px',
              background: '#ffffff', border: '1px solid #cbd5e1', boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              fontFamily: "'Batang', 'KoPubBatang', 'Pretendard', serif", color: '#000000', boxSizing: 'border-box'
            }}>
              {/* 상단 공문서 헤더 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #000', paddingBottom: 10, marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: '0.1em' }}>(주) 스 페 이 스</div>
                  <div style={{ fontSize: 13.5, color: '#475569', marginTop: 2 }}>SPACE ENGINEERING CO., LTD. | 기술지원본부</div>
                </div>
                <div style={{ textAlign: 'right', fontSize: 13.5, lineHeight: 1.5 }}>
                  <div>문서번호: <b>{activeTab === 'doc1' ? doc1.docNo : doc2.docNo}</b></div>
                  <div>발행일자: {activeTab === 'doc1' ? doc1.issuedAt : doc2.issuedAt}</div>
                  <div>수신담당: <b>{doc1.recipientManager} 귀하</b></div>
                </div>
              </div>

              {/* 공문서 타이틀 */}
              <div style={{ textAlign: 'center', margin: '24px 0 20px' }}>
                <span style={{
                  fontSize: 22, fontWeight: 900, textDecoration: 'underline', textUnderlineOffset: 6,
                  letterSpacing: '0.05em'
                }}>
                  {activeTab === 'doc1' ? '기술점검 확인 및 AS 방문예정 안내서' : 'AS 정비 완료보고 및 통합 정산 견적서'}
                </span>
                <div style={{ fontSize: 13.5, color: '#64748b', marginTop: 8 }}>
                  {activeTab === 'doc1'
                    ? '본 문서는 현장 3단계 사전 자가점검 결과 및 불가피한 방문 출장 사유를 입증하는 공식 점검확인서입니다.'
                    : '본 문서는 현장 정비 조치 결과 및 소요 부품·공임 일체의 최종 정산 승인을 위한 공식 견적서입니다.'}
                </div>
              </div>

              {/* 수신처 / 발신처 그리드 테이블 */}
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', fontSize: 13.5, marginBottom: 16 }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                    <th style={{ width: '15%', background: '#f1f5f9', padding: '6px 8px', borderRight: '1px solid #cbd5e1', textAlign: 'center' }}>수 신</th>
                    <td style={{ width: '35%', padding: '6px 8px', borderRight: '1px solid #cbd5e1', fontWeight: 700 }}>
                      {doc1.recipientCompany} ({doc1.recipientManager})
                    </td>
                    <th style={{ width: '15%', background: '#f1f5f9', padding: '6px 8px', borderRight: '1px solid #cbd5e1', textAlign: 'center' }}>발 신</th>
                    <td style={{ width: '35%', padding: '6px 8px', fontWeight: 700 }}>
                      (주)스페이스 기술지원본부 CS센터
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                    <th style={{ background: '#f1f5f9', padding: '6px 8px', borderRight: '1px solid #cbd5e1', textAlign: 'center' }}>연락처</th>
                    <td style={{ padding: '6px 8px', borderRight: '1px solid #cbd5e1' }}>{doc1.recipientPhone}</td>
                    <th style={{ background: '#f1f5f9', padding: '6px 8px', borderRight: '1px solid #cbd5e1', textAlign: 'center' }}>대표전화</th>
                    <td style={{ padding: '6px 8px' }}>1588-0000 (직통 02-123-4567)</td>
                  </tr>
                  <tr>
                    <th style={{ background: '#f1f5f9', padding: '6px 8px', borderRight: '1px solid #cbd5e1', textAlign: 'center' }}>실사용처(하청)</th>
                    <td style={{ padding: '6px 8px', borderRight: '1px solid #cbd5e1' }}>{doc1.siteCompany} ({doc1.siteWorkerName})</td>
                    <th style={{ background: '#f1f5f9', padding: '6px 8px', borderRight: '1px solid #cbd5e1', textAlign: 'center' }}>대상 장비</th>
                    <td style={{ padding: '6px 8px' }}><b>{doc1.equipmentModel}</b> (S/N: {doc1.serialNumber})</td>
                  </tr>
                </tbody>
              </table>

              {activeTab === 'doc1' ? (
                <>
                  {/* 1차: 증상 및 3단계 사전 점검 결과 표 */}
                  <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 6 }}>
                    1. 접수 증상 및 공식 에러코드
                  </div>
                  <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '8px 12px', fontSize: 13.5, marginBottom: 16 }}>
                    증상명: <b>{doc1.symptoms.join(', ')}</b> | 계기판 에러코드: <b>{doc1.selectedErrorCodes.map(c => `[${c}]`).join(' ')}</b>
                  </div>

                  <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 6 }}>
                    2. 3단계 사전 자가점검 시도 내역 및 조치 불가 증빙 (원청 품의 근거)
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', fontSize: 13.5, marginBottom: 14 }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #000' }}>
                        <th style={{ width: '12%', padding: '6px', borderRight: '1px solid #cbd5e1' }}>단계</th>
                        <th style={{ width: '28%', padding: '6px', borderRight: '1px solid #cbd5e1' }}>점검 항목</th>
                        <th style={{ width: '45%', padding: '6px', borderRight: '1px solid #cbd5e1' }}>현장 점검 방법 및 상태</th>
                        <th style={{ width: '15%', padding: '6px' }}>판정 결과</th>
                      </tr>
                    </thead>
                    <tbody>
                      {doc1.evidenceSteps.map(step => (
                        <tr key={step.stepNo} style={{ borderBottom: '1px solid #cbd5e1' }}>
                          <td style={{ textAlign: 'center', padding: '6px', borderRight: '1px solid #cbd5e1', fontWeight: 700 }}>
                            STEP {step.stepNo}
                          </td>
                          <td style={{ padding: '6px', borderRight: '1px solid #cbd5e1', fontWeight: 600 }}>
                            {step.title}
                          </td>
                          <td style={{ padding: '6px', borderRight: '1px solid #cbd5e1' }}>
                            {step.note || step.method}
                          </td>
                          <td style={{
                            textAlign: 'center', padding: '6px', fontWeight: 800,
                            color: step.result === 'NORMAL' ? '#059669' : '#dc2626'
                          }}>
                            {step.result === 'NORMAL' ? '정상 (이상무)' : '불량 (조치불가)'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* 소명 문안 */}
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '10px 14px', fontSize: 13.5, lineHeight: 1.6, marginBottom: 16 }}>
                    <b>[출장 불가피 소명 사유]</b> {doc1.failureReason}
                  </div>

                  {/* 방문 예정 안내 */}
                  <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 6 }}>
                    3. AS 엔지니어 현장 방문 예정 안내
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', fontSize: 13.5, marginBottom: 20 }}>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                        <th style={{ width: '20%', background: '#f1f5f9', padding: '6px', borderRight: '1px solid #cbd5e1' }}>배정 엔지니어</th>
                        <td style={{ width: '30%', padding: '6px', borderRight: '1px solid #cbd5e1', fontWeight: 700 }}>{doc1.assignedEngineer} ({doc1.engineerPhone})</td>
                        <th style={{ width: '20%', background: '#f1f5f9', padding: '6px', borderRight: '1px solid #cbd5e1' }}>방문 예정 일시</th>
                        <td style={{ width: '30%', padding: '6px', fontWeight: 700 }}>{doc1.plannedVisitAt}</td>
                      </tr>
                      <tr>
                        <th style={{ background: '#f1f5f9', padding: '6px', borderRight: '1px solid #cbd5e1' }}>소속 부서</th>
                        <td style={{ padding: '6px', borderRight: '1px solid #cbd5e1' }}>{doc1.engineerCenter}</td>
                        <th style={{ background: '#f1f5f9', padding: '6px', borderRight: '1px solid #cbd5e1' }}>현장 준비 요청</th>
                        <td style={{ padding: '6px' }}>{doc1.sitePreparation}</td>
                      </tr>
                    </tbody>
                  </table>
                </>
              ) : (
                <>
                  {/* 2차: 방문 결과 및 통합 정산 견적서 */}
                  <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 6 }}>
                    1. 현장 방문 AS 정비 결과
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', fontSize: 13.5, marginBottom: 14 }}>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                        <th style={{ width: '18%', background: '#f1f5f9', padding: '6px', borderRight: '1px solid #cbd5e1' }}>정비 일시 / 기사</th>
                        <td style={{ width: '82%', padding: '6px' }}>{doc2.visitedAt} / 담당 엔지니어: <b>{doc2.engineerName}</b></td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                        <th style={{ background: '#f1f5f9', padding: '6px', borderRight: '1px solid #cbd5e1' }}>최종 고장 원인</th>
                        <td style={{ padding: '6px', color: '#b91c1c', fontWeight: 700 }}>{doc2.rootCause}</td>
                      </tr>
                      <tr>
                        <th style={{ background: '#f1f5f9', padding: '6px', borderRight: '1px solid #cbd5e1' }}>정비 조치 내역</th>
                        <td style={{ padding: '6px', color: '#047857' }}>{doc2.actionTaken}</td>
                      </tr>
                    </tbody>
                  </table>

                  <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 6 }}>
                    2. 정비 비용 정산 견적 명세 (공급가액 및 세액)
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', fontSize: 13.5, marginBottom: 12 }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #000' }}>
                        <th style={{ width: '38%', padding: '6px', borderRight: '1px solid #cbd5e1' }}>품목명 / 기술 내역</th>
                        <th style={{ width: '22%', padding: '6px', borderRight: '1px solid #cbd5e1' }}>규격</th>
                        <th style={{ width: '10%', padding: '6px', borderRight: '1px solid #cbd5e1', textAlign: 'right' }}>수량</th>
                        <th style={{ width: '15%', padding: '6px', borderRight: '1px solid #cbd5e1', textAlign: 'right' }}>단가 (원)</th>
                        <th style={{ width: '15%', padding: '6px', textAlign: 'right' }}>금액 (원)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {doc2.parts.map(p => (
                        <tr key={p.id} style={{ borderBottom: '1px solid #cbd5e1' }}>
                          <td style={{ padding: '6px', borderRight: '1px solid #cbd5e1', fontWeight: 600 }}>{p.name}</td>
                          <td style={{ padding: '6px', borderRight: '1px solid #cbd5e1', fontFamily: 'monospace' }}>{p.partCode}</td>
                          <td style={{ padding: '6px', borderRight: '1px solid #cbd5e1', textAlign: 'right' }}>{p.qty}</td>
                          <td style={{ padding: '6px', borderRight: '1px solid #cbd5e1', textAlign: 'right' }}>{p.unitPrice.toLocaleString()}</td>
                          <td style={{ padding: '6px', textAlign: 'right', fontWeight: 700 }}>{p.supplyPrice.toLocaleString()}</td>
                        </tr>
                      ))}
                      <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                        <td style={{ padding: '6px', borderRight: '1px solid #cbd5e1', fontWeight: 600 }}>기술료 (엔지니어 분해정밀 장착)</td>
                        <td style={{ padding: '6px', borderRight: '1px solid #cbd5e1' }}>표준 기술료</td>
                        <td style={{ padding: '6px', borderRight: '1px solid #cbd5e1', textAlign: 'right' }}>1</td>
                        <td style={{ padding: '6px', borderRight: '1px solid #cbd5e1', textAlign: 'right' }}>{doc2.techLaborFee.toLocaleString()}</td>
                        <td style={{ padding: '6px', textAlign: 'right', fontWeight: 700 }}>{doc2.techLaborFee.toLocaleString()}</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #000' }}>
                        <td style={{ padding: '6px', borderRight: '1px solid #cbd5e1', fontWeight: 600 }}>현장 출장비 (서울/수도권)</td>
                        <td style={{ padding: '6px', borderRight: '1px solid #cbd5e1' }}>기본 출장</td>
                        <td style={{ padding: '6px', borderRight: '1px solid #cbd5e1', textAlign: 'right' }}>1</td>
                        <td style={{ padding: '6px', borderRight: '1px solid #cbd5e1', textAlign: 'right' }}>{doc2.travelFee.toLocaleString()}</td>
                        <td style={{ padding: '6px', textAlign: 'right', fontWeight: 700 }}>{doc2.travelFee.toLocaleString()}</td>
                      </tr>
                      <tr style={{ background: '#f8fafc', fontWeight: 800 }}>
                        <td colSpan={3} style={{ padding: '8px', borderRight: '1px solid #cbd5e1', textAlign: 'center' }}>
                          합 계 금 액 (VAT 포함)
                        </td>
                        <td colSpan={2} style={{ padding: '8px', textAlign: 'right', fontSize: 14.5, color: '#dc2626' }}>
                          일금 {doc2.grandTotal.toLocaleString()}원정 (₩{doc2.grandTotal.toLocaleString()})
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </>
              )}

              {/* 하단 공식 직인 날인 및 원청 결재란 */}
              <div style={{ marginTop: 24, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                {/* 발신자 직인 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ lineHeight: 1.6, fontSize: 13.5 }}>
                    <div><b>주식회사 스페이스</b></div>
                    <div>서울특별시 금천구 가산디지털1로 123 스페이스빌딩 5층</div>
                    <div>대표이사 <b>이 스 페 이 스</b> (직인생략/전자서명)</div>
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
          )}
        </div>

        {/* ── [하단 닫기 바] ── */}
        <div style={{
          background: '#ece7de', borderTop: '1px solid #dcd5c9',
          padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', flexShrink: 0
        }}>
          <button
            onClick={() => {
              onSave?.(doc1, doc2);
              onClose();
            }}
            style={{
              padding: '6px 16px', borderRadius: 4, fontSize: 13.5, fontWeight: 700,
              background: '#f5f2eb', border: '1px solid #dcd5c9', color: '#0f172a', cursor: 'pointer'
            }}
          >
            패키지 저장 후 닫기
          </button>
        </div>
      </div>
    </div>
  );
}
