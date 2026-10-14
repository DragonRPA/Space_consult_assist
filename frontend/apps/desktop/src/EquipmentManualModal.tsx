import { useState, useEffect, useMemo } from 'react';
import {
  X, BookOpen, Search, Check, Send, Download, Eye,
  FileText, Smartphone, Mail, MessageSquare, Paperclip, ExternalLink, CheckCircle2
} from 'lucide-react';
import {
  fetchEquipmentManuals,
  saveManualDispatchRecord,
  findRecommendedManualsForModel,
  type EquipmentManualItem,
  type ManualDispatchRecord
} from './equipmentManualsApi';

export interface EquipmentManualModalProps {
  equipmentModel: string;
  serialNumber: string;
  customerName: string;
  manager: string;
  phone: string;
  email?: string;
  siteCompany?: string;
  siteWorkerName?: string;
  siteWorkerPhone?: string;
  symptoms: string[];
  onClose: () => void;
  onToast?: (msg: string) => void;
}

const CATEGORIES = ['전체', '사용설명서(매뉴얼)', '종합/장비 카탈로그', '로봇 카탈로그'];
const MODEL_FILTERS = [
  '전체', 'J600', 'J600T', 'J700', 'J800', 'J900', 'J1300', 'J1900', 'J1900CAR',
  'S2', 'S3mini', 'S3', 'S5', 'S7P', 'The New S7P', 'S12', 'W12', 'W15',
  '플로어닥터', '닥터오비트', 'R3 SCP', 'R3 VAC', 'Sparky', 'Phantas'
];

export function EquipmentManualModal({
  equipmentModel,
  serialNumber,
  customerName,
  manager,
  phone,
  email = 'facility@client.co.kr',
  siteCompany = '',
  siteWorkerName = '현장 담당자',
  siteWorkerPhone = '',
  symptoms,
  onClose,
  onToast
}: EquipmentManualModalProps) {
  const [manuals, setManuals] = useState<EquipmentManualItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [previewManual, setPreviewManual] = useState<EquipmentManualItem | null>(null);
  const [activeTab, setActiveTab] = useState<'SELECT' | 'PREVIEW_PDF' | 'MOBILE_PREVIEW'>('SELECT');

  // 필터 상태
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [selectedModelFilter, setSelectedModelFilter] = useState<string>(
    MODEL_FILTERS.includes(equipmentModel) ? equipmentModel : '전체'
  );

  // 발송 설정 상태
  const [primaryRecipient, setPrimaryRecipient] = useState<'WORKER' | 'MANAGER' | 'BOTH'>('WORKER');
  const [dispatchChannel, setDispatchChannel] = useState<'KAKAO' | 'SMS' | 'EMAIL'>('KAKAO');
  const [recipientEmail, setRecipientEmail] = useState(email);
  const [customNote, setCustomNote] = useState(
    `[${equipmentModel}] 장비 운전 조작법, 일일 점검 및 소모품 관리 표준 매뉴얼(PDF)을 첨부하여 발송드립니다.`
  );
  const [isDispatched, setIsDispatched] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetchEquipmentManuals().then(data => {
      if (!mounted) return;
      setManuals(data);

      // 현재 상담 기종에 맞는 공식 매뉴얼 자동 첨부 선택
      const recommended = findRecommendedManualsForModel(data, equipmentModel);
      if (recommended.length > 0) {
        setSelectedIds(recommended.map(m => m.id));
        setPreviewManual(recommended[0]);
      } else if (data.length > 0) {
        setSelectedIds([data[0].id]);
        setPreviewManual(data[0]);
      }
    });
    return () => {
      mounted = false;
    };
  }, [equipmentModel]);

  const filteredManuals = useMemo(() => {
    return manuals.filter(m => {
      if (selectedCategory !== '전체' && m.category !== selectedCategory) return false;
      if (selectedModelFilter !== '전체') {
        const matchModel = m.applicable_models.some(
          am =>
            am === '전 기종 공용' ||
            am.toLowerCase() === selectedModelFilter.toLowerCase() ||
            selectedModelFilter.toLowerCase().includes(am.toLowerCase())
        );
        if (!matchModel) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const hay = `${m.title} ${m.file_name} ${m.manual_code} ${m.description} ${m.applicable_models.join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [manuals, selectedCategory, selectedModelFilter, searchQuery]);

  const selectedManuals = useMemo(
    () => manuals.filter(m => selectedIds.includes(m.id)),
    [manuals, selectedIds]
  );

  const toggleManual = (id: string) => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const activeRecipientLabel = useMemo(() => {
    if (primaryRecipient === 'WORKER') {
      return `${siteWorkerName || '현장 담당자'} (${siteWorkerPhone || phone})`;
    }
    if (primaryRecipient === 'MANAGER') {
      return `${manager} (${phone})`;
    }
    return `현장(${siteWorkerName || '담당자'}) + 원청(${manager}) 동시 발송`;
  }, [primaryRecipient, siteWorkerName, siteWorkerPhone, manager, phone]);

  const handleDispatchManuals = async () => {
    if (selectedManuals.length === 0) {
      onToast?.('첨부 발송할 매뉴얼 파일을 1개 이상 선택해 주십시오.');
      return;
    }

    const docNo = `MAN-DOC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
    const record: ManualDispatchRecord = {
      dispatch_id: `mdisp_${Date.now()}`,
      doc_no: docNo,
      customer_name: customerName,
      manager,
      phone,
      email: recipientEmail,
      site_company: siteCompany,
      site_worker_name: siteWorkerName,
      site_worker_phone: siteWorkerPhone || phone,
      primary_recipient: primaryRecipient,
      dispatch_channel: dispatchChannel,
      recipient_contact:
        dispatchChannel === 'EMAIL'
          ? recipientEmail
          : primaryRecipient === 'WORKER'
          ? siteWorkerPhone || phone
          : phone,
      equipment_model: equipmentModel,
      serial_number: serialNumber,
      symptoms,
      attached_manuals: selectedManuals.map(m => ({
        id: m.id,
        manual_code: m.manual_code,
        title: m.title,
        file_name: m.file_name,
        file_size_label: m.file_size_label,
        file_url: m.file_url
      })),
      message_note: customNote,
      created_at: new Date().toISOString()
    };

    await saveManualDispatchRecord(record);
    setIsDispatched(true);

    const channelName =
      dispatchChannel === 'KAKAO' ? '카카오 알림톡' : dispatchChannel === 'SMS' ? '문자(LMS)' : '이메일';
    onToast?.(
      `[${channelName}] ${selectedManuals.map(m => m.file_name).join(', ')} (${selectedManuals.length}건) 매뉴얼 첨부 발송 완료`
    );
  };

  return (
    <div
      data-uia="equipment-manual-modal"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.65)',
        zIndex: 9800,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        backdropFilter: 'blur(3px)'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 1320,
          height: '90vh',
          background: '#f5f2eb',
          borderRadius: 12,
          border: '1px solid #cbd5e1',
          boxShadow: '0 24px 48px rgba(15, 23, 42, 0.32)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── 상단 헤더 ── */}
        <div
          style={{
            background: '#0f172a',
            color: '#ffffff',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img
              src="/SPACE_logo_white.png"
              alt="(주)스페이스"
              style={{ height: 22, width: 'auto', objectFit: 'contain' }}
            />
            <div style={{ width: 1, height: 18, background: '#334155' }} />
            <BookOpen size={18} color="#38bdf8" />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16, fontWeight: 900, letterSpacing: '-0.02em' }}>
                  공식 제품 매뉴얼·카탈로그 DB 및 첨부 발송
                </span>
                <span
                  style={{
                    fontSize: 13.5,
                    fontWeight: 800,
                    background: '#1e293b',
                    color: '#38bdf8',
                    border: '1px solid #0284c7',
                    padding: '2px 8px',
                    borderRadius: 4,
                    whiteSpace: 'nowrap'
                  }}
                >
                  space-dust.com 공식 PDF {manuals.length}종 동기화 완료
                </span>
              </div>
              <div style={{ fontSize: 13.5, color: '#94a3b8', marginTop: 2 }}>
                상담 대상: <strong style={{ color: '#f8fafc' }}>{customerName}</strong> · 기종:{' '}
                <strong style={{ color: '#38bdf8' }}>{equipmentModel}</strong> ({serialNumber})
              </div>
            </div>
          </div>

          {/* 상단 뷰 전환 탭 + 닫기 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              data-uia="tab-manual-select"
              onClick={() => setActiveTab('SELECT')}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                border: activeTab === 'SELECT' ? '1.5px solid #38bdf8' : '1px solid #334155',
                background: activeTab === 'SELECT' ? '#0284c7' : '#1e293b',
                color: '#ffffff',
                fontSize: 13.5,
                fontWeight: 800,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              1. 매뉴얼 DB 선택·첨부 ({selectedManuals.length}건)
            </button>
            <button
              type="button"
              data-uia="tab-manual-pdf-preview"
              onClick={() => setActiveTab('PREVIEW_PDF')}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                border: activeTab === 'PREVIEW_PDF' ? '1.5px solid #38bdf8' : '1px solid #334155',
                background: activeTab === 'PREVIEW_PDF' ? '#0284c7' : '#1e293b',
                color: '#ffffff',
                fontSize: 13.5,
                fontWeight: 800,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              2. 매뉴얼 PDF 원본 열람
            </button>
            <button
              type="button"
              data-uia="tab-manual-mobile-preview"
              onClick={() => setActiveTab('MOBILE_PREVIEW')}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                border: activeTab === 'MOBILE_PREVIEW' ? '1.5px solid #38bdf8' : '1px solid #334155',
                background: activeTab === 'MOBILE_PREVIEW' ? '#0284c7' : '#1e293b',
                color: '#ffffff',
                fontSize: 13.5,
                fontWeight: 800,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              3. 고객 모바일 수신 화면 미리보기
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: '1px solid #475569',
                color: '#cbd5e1',
                borderRadius: 6,
                padding: '6px 10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── 본문 영역: 좌측(매뉴얼 DB / 미리보기) + 우측(첨부함 & 발송 컨트롤 패널) ── */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 410px', overflow: 'hidden' }}>
          {/* 좌측 패널 */}
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: '1px solid #dcd5c9' }}>
            {activeTab === 'SELECT' && (
              <>
                {/* 검색 및 기종·분류 필터 바 */}
                <div
                  style={{
                    padding: '12px 16px',
                    background: '#ece7de',
                    borderBottom: '1px solid #dcd5c9',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    flexShrink: 0
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: 6,
                        padding: '6px 12px'
                      }}
                    >
                      <Search size={15} color="#64748b" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="기종명(J600, S7P, W15, 플로어닥터) 또는 매뉴얼 파일명 검색..."
                        style={{
                          border: 'none',
                          outline: 'none',
                          width: '100%',
                          fontSize: 13.5,
                          fontWeight: 600,
                          color: '#0f172a'
                        }}
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    {/* 문서 분류 필터 */}
                    <div style={{ display: 'flex', gap: 6 }}>
                      {CATEGORIES.map(cat => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setSelectedCategory(cat)}
                          style={{
                            padding: '6px 11px',
                            borderRadius: 6,
                            border: selectedCategory === cat ? '1.5px solid #0284c7' : '1px solid #cbd5c9',
                            background: selectedCategory === cat ? '#e0f2fe' : '#ffffff',
                            color: selectedCategory === cat ? '#0369a1' : '#334155',
                            fontSize: 13.5,
                            fontWeight: 800,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 장비 모델 필터 칩 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13.5, fontWeight: 800, color: '#475569', marginRight: 4, whiteSpace: 'nowrap' }}>
                      기종 필터:
                    </span>
                    {MODEL_FILTERS.map(m => {
                      const isCurrentConsultModel = m.toLowerCase() === equipmentModel.toLowerCase();
                      const isActive = selectedModelFilter === m;
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setSelectedModelFilter(m)}
                          style={{
                            padding: '3px 9px',
                            borderRadius: 5,
                            border: isActive
                              ? '1.5px solid #0f172a'
                              : isCurrentConsultModel
                              ? '1.5px solid #2563eb'
                              : '1px solid #cbd5e1',
                            background: isActive ? '#0f172a' : isCurrentConsultModel ? '#eff6ff' : '#ffffff',
                            color: isActive ? '#ffffff' : isCurrentConsultModel ? '#1d4ed8' : '#334155',
                            fontSize: 13.5,
                            fontWeight: isActive || isCurrentConsultModel ? 800 : 600,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {m}
                          {isCurrentConsultModel ? ' (상담기종)' : ''}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 매뉴얼 그리드 목록 */}
                <div
                  style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: 16,
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
                    gap: 12,
                    alignContent: 'start'
                  }}
                >
                  {filteredManuals.map(manual => {
                    const isChecked = selectedIds.includes(manual.id);
                    const isConsultModelMatch = manual.applicable_models.some(
                      am =>
                        am !== '전 기종 공용' &&
                        (am.toLowerCase() === equipmentModel.toLowerCase() ||
                          equipmentModel.toLowerCase().includes(am.toLowerCase()))
                    );

                    return (
                      <div
                        key={manual.id}
                        data-manual-card={manual.manual_code}
                        onClick={() => toggleManual(manual.id)}
                        style={{
                          background: isChecked ? '#f0f9ff' : '#ffffff',
                          border: isChecked ? '2px solid #0284c7' : '1px solid #dcd5c9',
                          borderRadius: 10,
                          padding: 14,
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: 10,
                          boxShadow: isChecked
                            ? '0 4px 12px rgba(2, 132, 199, 0.12)'
                            : '0 1px 3px rgba(15, 23, 42, 0.05)'
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <span
                                style={{
                                  fontSize: 13.5,
                                  fontWeight: 800,
                                  padding: '2px 7px',
                                  borderRadius: 4,
                                  background: manual.category === '사용설명서(매뉴얼)' ? '#eff6ff' : '#fef3c7',
                                  color: manual.category === '사용설명서(매뉴얼)' ? '#1d4ed8' : '#b45309',
                                  border:
                                    manual.category === '사용설명서(매뉴얼)'
                                      ? '1px solid #bfdbfe'
                                      : '1px solid #fde68a',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {manual.category}
                              </span>
                              {isConsultModelMatch && (
                                <span
                                  style={{
                                    fontSize: 13.5,
                                    fontWeight: 800,
                                    padding: '2px 7px',
                                    borderRadius: 4,
                                    background: '#dcfce7',
                                    color: '#15803d',
                                    border: '1px solid #86efac',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  현재 기종 매칭
                                </span>
                              )}
                            </div>

                            <div
                              style={{
                                width: 22,
                                height: 22,
                                borderRadius: 6,
                                background: isChecked ? '#0284c7' : '#f1f5f9',
                                border: isChecked ? '1px solid #0284c7' : '1px solid #94a3b8',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#ffffff',
                                flexShrink: 0
                              }}
                            >
                              {isChecked && <Check size={14} />}
                            </div>
                          </div>

                          <div style={{ fontSize: 15, fontWeight: 900, color: '#0f172a' }}>{manual.title}</div>

                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              fontSize: 13.5,
                              color: '#334155',
                              fontWeight: 700,
                              background: '#f8fafc',
                              padding: '5px 8px',
                              borderRadius: 6,
                              border: '1px solid #e2e8f0'
                            }}
                          >
                            <FileText size={14} color="#dc2626" style={{ flexShrink: 0 }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                              {manual.file_name}
                            </span>
                            <span style={{ color: '#64748b', fontWeight: 800, whiteSpace: 'nowrap' }}>
                              ({manual.file_size_label})
                            </span>
                          </div>

                          <div style={{ fontSize: 13.5, color: '#475569', lineHeight: 1.4 }}>{manual.description}</div>
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingTop: 8,
                            borderTop: '1px dashed #e2e8f0',
                            gap: 6
                          }}
                          onClick={e => e.stopPropagation()}
                        >
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {manual.applicable_models.slice(0, 4).map(am => (
                              <span
                                key={am}
                                style={{
                                  fontSize: 13.5,
                                  fontWeight: 700,
                                  background: '#f1f5f9',
                                  color: '#334155',
                                  padding: '1px 6px',
                                  borderRadius: 4,
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {am}
                              </span>
                            ))}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                            <button
                              type="button"
                              onClick={() => {
                                setPreviewManual(manual);
                                setActiveTab('PREVIEW_PDF');
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '4px 8px',
                                borderRadius: 5,
                                border: '1px solid #cbd5e1',
                                background: '#ffffff',
                                color: '#0f172a',
                                fontSize: 13.5,
                                fontWeight: 700,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              <Eye size={13} />
                              <span>열람</span>
                            </button>
                            <a
                              href={manual.file_url}
                              target="_blank"
                              rel="noreferrer"
                              download={manual.file_name}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '4px 8px',
                                borderRadius: 5,
                                border: '1px solid #0284c7',
                                background: '#e0f2fe',
                                color: '#0369a1',
                                fontSize: 13.5,
                                fontWeight: 800,
                                textDecoration: 'none',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              <Download size={13} />
                              <span>PDF</span>
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {activeTab === 'PREVIEW_PDF' && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#1e293b' }}>
                <div
                  style={{
                    padding: '10px 16px',
                    background: '#0f172a',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    borderBottom: '1px solid #334155',
                    flexShrink: 0
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 800, color: '#38bdf8', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      열람 문서:
                    </span>
                    <select
                      value={previewManual?.id || ''}
                      onChange={e => {
                        const found = manuals.find(m => m.id === e.target.value);
                        if (found) setPreviewManual(found);
                      }}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 6,
                        background: '#1e293b',
                        color: '#ffffff',
                        border: '1px solid #475569',
                        fontSize: 13.5,
                        fontWeight: 700,
                        maxWidth: 420
                      }}
                    >
                      {manuals.map(m => (
                        <option key={m.id} value={m.id}>
                          [{m.category}] {m.title} — {m.file_name} ({m.file_size_label})
                        </option>
                      ))}
                    </select>
                  </div>

                  {previewManual && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <a
                        href={`/manuals/space_manual_${String(previewManual.wr_id).padStart(2, '0')}.pdf`}
                        target="_blank"
                        rel="noreferrer"
                        download={previewManual.file_name}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '6px 12px',
                          borderRadius: 6,
                          background: '#0284c7',
                          color: '#ffffff',
                          fontSize: 13.5,
                          fontWeight: 800,
                          textDecoration: 'none',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        <ExternalLink size={14} />
                        <span>새 창 원본 PDF 다운로드 ({previewManual.file_size_label})</span>
                      </a>
                    </div>
                  )}
                </div>

                {previewManual ? (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#f8fafc' }}>
                    {/* 상단 공식 매뉴얼 메타데이터 요약 배너 */}
                    <div
                      style={{
                        padding: '12px 18px',
                        background: '#ffffff',
                        borderBottom: '1px solid #cbd5e1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        flexShrink: 0
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <FileText size={20} color="#dc2626" />
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 900, color: '#0f172a' }}>
                            {previewManual.title} — <span style={{ color: '#0284c7' }}>{previewManual.file_name}</span> ({previewManual.file_size_label})
                          </div>
                          <div style={{ fontSize: 13.5, color: '#475569', marginTop: 2 }}>
                            {previewManual.description} · 적용기종: {previewManual.applicable_models.join(', ')}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (!selectedIds.includes(previewManual.id)) {
                            toggleManual(previewManual.id);
                          }
                        }}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 6,
                          background: selectedIds.includes(previewManual.id) ? '#dcfce7' : '#e0f2fe',
                          color: selectedIds.includes(previewManual.id) ? '#15803d' : '#0369a1',
                          border: selectedIds.includes(previewManual.id) ? '1px solid #86efac' : '1px solid #7dd3fc',
                          fontSize: 13.5,
                          fontWeight: 800,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {selectedIds.includes(previewManual.id) ? '✓ 발송 목록에 첨부됨' : '+ 발송 목록에 첨부'}
                      </button>
                    </div>
                    <iframe
                      title={previewManual.title}
                      src={`/manuals/space_manual_${String(previewManual.wr_id).padStart(2, '0')}.pdf`}
                      style={{ width: '100%', flex: 1, border: 'none', background: '#e2e8f0' }}
                    />
                  </div>
                ) : (
                  <div style={{ padding: 40, textAlign: 'center', color: '#cbd5e1', fontSize: 14 }}>
                    열람할 매뉴얼을 선택해 주십시오.
                  </div>
                )}
              </div>
            )}

            {activeTab === 'MOBILE_PREVIEW' && (
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: 24,
                  background: '#e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {/* 모바일 매뉴얼 수신 카드 프리뷰 */}
                <div
                  data-uia="mobile-manual-preview-card"
                  style={{
                    width: 410,
                    background: '#ffffff',
                    borderRadius: 24,
                    border: '6px solid #0f172a',
                    boxShadow: '0 20px 40px rgba(15, 23, 42, 0.25)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  <div
                    style={{
                      background: '#0f172a',
                      color: '#ffffff',
                      padding: '16px 18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <img
                        src="/SPACE_logo_white.png"
                        alt="(주)스페이스"
                        style={{ height: 20, width: 'auto', objectFit: 'contain' }}
                      />
                      <span style={{ fontSize: 14, fontWeight: 800 }}>공식 기술지원 매뉴얼 안내</span>
                    </div>
                    <span
                      style={{
                        fontSize: 13.5,
                        fontWeight: 800,
                        background: '#0284c7',
                        padding: '2px 8px',
                        borderRadius: 4
                      }}
                    >
                      {equipmentModel}
                    </span>
                  </div>

                  <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: 10,
                        padding: 12,
                        fontSize: 13.5,
                        color: '#334155',
                        lineHeight: 1.5
                      }}
                    >
                      <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>
                        수신: {customerName} ({activeRecipientLabel})
                      </div>
                      <div>{customNote}</div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 900, color: '#0f172a' }}>
                        첨부된 공식 매뉴얼 파일 ({selectedManuals.length}건)
                      </div>
                      {selectedManuals.map(m => (
                        <div
                          key={m.id}
                          style={{
                            background: '#f0f9ff',
                            border: '1px solid #bae6fd',
                            borderRadius: 10,
                            padding: '10px 12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 8
                          }}
                        >
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{m.title}</div>
                            <div
                              style={{
                                fontSize: 13.5,
                                color: '#0369a1',
                                fontWeight: 700,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {m.file_name} ({m.file_size_label})
                            </div>
                          </div>
                          <a
                            href={m.file_url}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              background: '#0284c7',
                              color: '#ffffff',
                              padding: '6px 10px',
                              borderRadius: 6,
                              fontSize: 13.5,
                              fontWeight: 800,
                              textDecoration: 'none',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            PDF 열기
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── 우측 패널: 첨부파일 바구니 + 수신인/채널 선택 + 즉시 발송 ── */}
          <div
            style={{
              background: '#f5f2eb',
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 12,
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* 1. 첨부된 매뉴얼 파일 목록 */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #dcd5c9',
                  borderRadius: 8,
                  padding: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Paperclip size={15} color="#0284c7" />
                    <span style={{ fontSize: 14, fontWeight: 900, color: '#0f172a' }}>
                      첨부 매뉴얼 파일 ({selectedManuals.length}건)
                    </span>
                  </div>
                  {selectedManuals.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedIds([])}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#64748b',
                        fontSize: 13.5,
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      전체 해제
                    </button>
                  )}
                </div>

                {selectedManuals.length === 0 ? (
                  <div style={{ padding: 14, textAlign: 'center', color: '#64748b', fontSize: 13.5 }}>
                    좌측 목록에서 발송할 매뉴얼을 선택해 주십시오.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 195, overflowY: 'auto' }}>
                    {selectedManuals.map(m => (
                      <div
                        key={m.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 8,
                          padding: '7px 10px',
                          background: '#f0f9ff',
                          border: '1px solid #bae6fd',
                          borderRadius: 6
                        }}
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div
                            style={{
                              fontSize: 13.5,
                              fontWeight: 800,
                              color: '#0f172a',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                          >
                            {m.title}
                          </div>
                          <div
                            style={{
                              fontSize: 13.5,
                              color: '#0369a1',
                              fontWeight: 700,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                          >
                            {m.file_name} ({m.file_size_label})
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleManual(m.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#64748b',
                            cursor: 'pointer',
                            padding: 2
                          }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. 수신인 지정 (현장 통화자 / 원청 담당자 / 동시 발송) */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #dcd5c9',
                  borderRadius: 8,
                  padding: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6
                }}
              >
                <label style={{ fontSize: 13.5, fontWeight: 800, color: '#0f172a' }}>1차 매뉴얼 수신인 지정</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => setPrimaryRecipient('WORKER')}
                    style={{
                      padding: '7px 6px',
                      borderRadius: 6,
                      border: primaryRecipient === 'WORKER' ? '1.5px solid #0284c7' : '1px solid #cbd5e1',
                      background: primaryRecipient === 'WORKER' ? '#e0f2fe' : '#f8fafc',
                      color: primaryRecipient === 'WORKER' ? '#0369a1' : '#334155',
                      fontSize: 13.5,
                      fontWeight: 800,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    현장 통화자
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrimaryRecipient('MANAGER')}
                    style={{
                      padding: '7px 6px',
                      borderRadius: 6,
                      border: primaryRecipient === 'MANAGER' ? '1.5px solid #0284c7' : '1px solid #cbd5e1',
                      background: primaryRecipient === 'MANAGER' ? '#e0f2fe' : '#f8fafc',
                      color: primaryRecipient === 'MANAGER' ? '#0369a1' : '#334155',
                      fontSize: 13.5,
                      fontWeight: 800,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    원청 결재권자
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrimaryRecipient('BOTH')}
                    style={{
                      padding: '7px 6px',
                      borderRadius: 6,
                      border: primaryRecipient === 'BOTH' ? '1.5px solid #0284c7' : '1px solid #cbd5e1',
                      background: primaryRecipient === 'BOTH' ? '#e0f2fe' : '#f8fafc',
                      color: primaryRecipient === 'BOTH' ? '#0369a1' : '#334155',
                      fontSize: 13.5,
                      fontWeight: 800,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    양측 동시 발송
                  </button>
                </div>
                <div style={{ fontSize: 13.5, color: '#475569', fontWeight: 600 }}>수신처: {activeRecipientLabel}</div>
              </div>

              {/* 3. 수신 수단 선택 (카카오톡 / 문자 / 이메일) */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #dcd5c9',
                  borderRadius: 8,
                  padding: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6
                }}
              >
                <label style={{ fontSize: 13.5, fontWeight: 800, color: '#0f172a' }}>발송 수단 선택</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => setDispatchChannel('KAKAO')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 5,
                      padding: '8px 6px',
                      borderRadius: 6,
                      border: dispatchChannel === 'KAKAO' ? '2px solid #f59e0b' : '1px solid #cbd5e1',
                      background: dispatchChannel === 'KAKAO' ? '#fef3c7' : '#f8fafc',
                      color: '#0f172a',
                      fontSize: 13.5,
                      fontWeight: 800,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <MessageSquare size={14} />
                    <span>카카오톡</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDispatchChannel('SMS')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 5,
                      padding: '8px 6px',
                      borderRadius: 6,
                      border: dispatchChannel === 'SMS' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                      background: dispatchChannel === 'SMS' ? '#eff6ff' : '#f8fafc',
                      color: '#0f172a',
                      fontSize: 13.5,
                      fontWeight: 800,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <Smartphone size={14} />
                    <span>문자메시지</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDispatchChannel('EMAIL')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 5,
                      padding: '8px 6px',
                      borderRadius: 6,
                      border: dispatchChannel === 'EMAIL' ? '2px solid #059669' : '1px solid #cbd5e1',
                      background: dispatchChannel === 'EMAIL' ? '#ecfdf5' : '#f8fafc',
                      color: '#0f172a',
                      fontSize: 13.5,
                      fontWeight: 800,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <Mail size={14} />
                    <span>이메일</span>
                  </button>
                </div>

                {dispatchChannel === 'EMAIL' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                    <label style={{ fontSize: 13.5, fontWeight: 700, color: '#475569' }}>수신 이메일 주소</label>
                    <input
                      type="email"
                      value={recipientEmail}
                      onChange={e => setRecipientEmail(e.target.value)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 6,
                        border: '1px solid #cbd5e1',
                        fontSize: 13.5
                      }}
                    />
                  </div>
                )}
              </div>

              {/* 4. 발송 안내 문구 */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #dcd5c9',
                  borderRadius: 8,
                  padding: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4
                }}
              >
                <label style={{ fontSize: 13.5, fontWeight: 800, color: '#0f172a' }}>동봉 안내 메시지</label>
                <textarea
                  value={customNote}
                  onChange={e => setCustomNote(e.target.value)}
                  rows={3}
                  style={{
                    width: '100%',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    padding: 8,
                    fontSize: 13.5,
                    resize: 'none',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* 우하단 최종 액션 버튼 (Z-Pattern Terminal Action) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {isDispatched && (
                <div
                  data-uia="manual-dispatch-success-banner"
                  style={{
                    background: '#ecfdf5',
                    border: '1px solid #10b981',
                    borderRadius: 8,
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    color: '#047857',
                    fontSize: 13.5,
                    fontWeight: 800
                  }}
                >
                  <CheckCircle2 size={16} />
                  <span>매뉴얼 PDF ({selectedManuals.length}건) 첨부 발송이 완료되었습니다.</span>
                </div>
              )}

              <button
                type="button"
                data-uia="btn-dispatch-manuals-submit"
                onClick={handleDispatchManuals}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: 8,
                  background: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: 15,
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: '0 4px 12px rgba(2, 132, 199, 0.28)'
                }}
              >
                <Send size={16} />
                <span>선택 매뉴얼 PDF 첨부 발송 ({selectedManuals.length}건)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
