import { useState, useEffect, useMemo } from 'react';
import {
  X, Send, Check, Copy, Image as ImageIcon, Package, Wrench, CheckCircle2
} from 'lucide-react';
import type { DispatchChannelType } from './PartsOrderQuotationModal';
import { SymptomPhotoManagerModal } from './SymptomPhotoManagerModal';
import { type SymptomPhotoItem, getSymptomPhotos } from './symptomPhotoApi';
import {
  MODEL_KEYS,
  resolveModelKey,
  getModelCatalogBundle,
} from './modelCatalogVisuals';

export interface GuideStepItem {
  stepNo: number;
  title: string;
  description: string;
  photoUrl?: string;
  photoLabel: string;
  youtubeUrl?: string;
  youtubeTitle?: string;
  isSelected: boolean;
}

export interface SitePhotoSketchEvidence {
  photoId: string;
  capturedAt: string;
  siteWorkerName: string;
  siteWorkerPhone: string;
  memo: string;
  dataUrl: string;
  hasRedSketch: boolean;
  matchedPartName?: string;
}

interface SelfActionGuideModalProps {
  equipmentModel: string;
  customerName: string;
  manager: string;
  phone: string;
  email?: string;
  siteCompany?: string;
  siteWorkerName?: string;
  siteWorkerPhone?: string;
  serialNumber?: string;
  symptomTitle: string;
  symptomSteps?: {
    step_no: number;
    title: string;
    method?: string;
    criteria_normal?: string;
    criteria_fault?: string;
  }[];
  onClose: () => void;
  onOpenPartsQuotation?: (evidence?: SitePhotoSketchEvidence) => void;
  onOpenDispatchPackage?: () => void;
  onResolveDirect?: () => void;
  onToast?: (msg: string) => void;
}

function buildCompactSteps(
  symptom: string,
  symptomSteps?: SelfActionGuideModalProps['symptomSteps']
): GuideStepItem[] {
  if (symptomSteps && symptomSteps.length > 0) {
    return symptomSteps.map((s, idx) => ({
      stepNo: s.step_no || idx + 1,
      title: s.title,
      description: s.method || '',
      photoLabel: s.title,
      isSelected: true,
    }));
  }

  if (symptom.includes('잔수') || symptom.includes('흡입') || symptom.includes('물기')) {
    return [
      {
        stepNo: 1,
        title: '스퀴지 고무 마모 확인 및 4면 반전 장착',
        description: '고정 노브 탈거 후 고무 날 상태 확인',
        photoLabel: '스퀴지 고무 점검',
        isSelected: true,
      },
      {
        stepNo: 2,
        title: '스퀴지 수평 및 바닥 접지각 조절',
        description: '중앙 각도 조절 노브 및 좌우 밸런스 휠 조정',
        photoLabel: '스퀴지 각도 조절',
        isSelected: true,
      },
      {
        stepNo: 3,
        title: '흡입 호스 막힘 및 오수탱크 패킹 밀폐 확인',
        description: '호스 이물질 제거 및 뚜껑 가스켓 밀착 점검',
        photoLabel: '흡입 호스·패킹 점검',
        isSelected: true,
      },
    ];
  }

  if (symptom.includes('충전') || symptom.includes('배터리') || symptom.includes('전원')) {
    return [
      {
        stepNo: 1,
        title: '비상정지 스위치 해제 및 키 스위치 확인',
        description: '비상버튼 시계방향 회전 해제',
        photoLabel: '비상정지 스위치',
        isSelected: true,
      },
      {
        stepNo: 2,
        title: '배터리 단자 체결 및 충전기 플러그 점검',
        description: '단자 유격·부식 확인 및 충전 램프 점등 확인',
        photoLabel: '배터리 단자 점검',
        isSelected: true,
      },
      {
        stepNo: 3,
        title: '메인 차단기(퓨즈) 트립 여부 확인',
        description: '차단기 레버 ON 복귀',
        photoLabel: '차단기·퓨즈 점검',
        isSelected: true,
      },
    ];
  }

  return [
    {
      stepNo: 1,
      title: '조작부 상태 표시 및 비상정지 스위치 확인',
      description: '계기판 점등 상태 및 스위치 위치 확인',
      photoLabel: '조작부 점검',
      isSelected: true,
    },
    {
      stepNo: 2,
      title: '소모품(브러시·스퀴지·호스) 장착 상태 확인',
      description: '이물질 끼임 및 체결 상태 점검',
      photoLabel: '주요부품 점검',
      isSelected: true,
    },
    {
      stepNo: 3,
      title: '현장 부위 사진 회신 요청',
      description: '증상 부위 사진 촬영 후 회신',
      photoLabel: '현장 사진 회신',
      isSelected: true,
    },
  ];
}

export function SelfActionGuideModal({
  equipmentModel,
  customerName,
  manager,
  phone,
  email,
  siteCompany,
  siteWorkerName,
  siteWorkerPhone,
  symptomTitle,
  symptomSteps,
  onClose,
  onOpenPartsQuotation,
  onOpenDispatchPackage,
  onResolveDirect,
  onToast,
}: SelfActionGuideModalProps) {
  const [selectedModel, setSelectedModel] = useState<string>(() => resolveModelKey(equipmentModel));
  const [steps, setSteps] = useState<GuideStepItem[]>(() =>
    buildCompactSteps(symptomTitle || '', symptomSteps)
  );
  const [selectedVisualIds, setSelectedVisualIds] = useState<string[]>([]);
  const [symptomPhotos, setSymptomPhotos] = useState<SymptomPhotoItem[]>([]);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const [includeManualPdf, setIncludeManualPdf] = useState<boolean>(true);
  const [isPhotoManagerOpen, setIsPhotoManagerOpen] = useState<boolean>(false);

  const [recipientTarget, setRecipientTarget] = useState<'WORKER' | 'MANAGER'>('WORKER');
  const [sentChannel, setSentChannel] = useState<DispatchChannelType>('KAKAO');
  const [receiverName, setReceiverName] = useState<string>(
    siteWorkerName || manager || customerName || ''
  );
  const [receiverContact, setReceiverContact] = useState<string>(siteWorkerPhone || phone || '');
  const [copied, setCopied] = useState<boolean>(false);

  const bundle = useMemo(() => getModelCatalogBundle(selectedModel), [selectedModel]);
  const primaryManual = bundle.manuals[0] || null;

  // Auto-select structure + control diagrams for the active model
  useEffect(() => {
    const structAndCtrl = bundle.visualCards
      .filter(v => v.section === '구조' || v.section === '조작')
      .map(v => v.id);
    setSelectedVisualIds(
      structAndCtrl.length > 0 ? structAndCtrl : bundle.visualCards.slice(0, 2).map(v => v.id)
    );
  }, [bundle]);

  // Load symptom photos
  useEffect(() => {
    let mounted = true;
    getSymptomPhotos(selectedModel, symptomTitle || 'general').then(list => {
      if (!mounted) return;
      setSymptomPhotos(list);
    });
    return () => {
      mounted = false;
    };
  }, [selectedModel, symptomTitle]);

  // Sync recipient
  useEffect(() => {
    if (recipientTarget === 'WORKER') {
      setReceiverName(siteWorkerName || siteCompany || manager || customerName || '');
      setReceiverContact(siteWorkerPhone || phone || '');
    } else {
      setReceiverName(manager || customerName || '');
      setReceiverContact(sentChannel === 'EMAIL' ? email || '' : phone || '');
    }
  }, [recipientTarget, sentChannel, siteWorkerName, siteCompany, siteWorkerPhone, manager, customerName, phone, email]);

  const toggleStep = (stepNo: number) => {
    setSteps(prev =>
      prev.map(s => (s.stepNo === stepNo ? { ...s, isSelected: !s.isSelected } : s))
    );
  };

  const toggleVisual = (id: string) => {
    setSelectedVisualIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const toggleSymptomPhoto = (id: string) => {
    setSelectedPhotoIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const activeSteps = useMemo(() => steps.filter(s => s.isSelected), [steps]);
  const activeVisuals = useMemo(
    () => bundle.visualCards.filter(v => selectedVisualIds.includes(v.id)),
    [bundle.visualCards, selectedVisualIds]
  );
  const activeSymptomPhotos = useMemo(
    () => symptomPhotos.filter(p => selectedPhotoIds.includes(p.id)),
    [symptomPhotos, selectedPhotoIds]
  );

  const guideMessage = useMemo(() => {
    const lines: string[] = [];
    lines.push(`[스페이스] ${selectedModel} 자가조치 가이드`);
    if (symptomTitle) lines.push(`증상: ${symptomTitle}`);
    lines.push('');
    activeSteps.forEach((s, idx) => {
      lines.push(`${idx + 1}. ${s.title}`);
      if (s.description) lines.push(`   - ${s.description}`);
    });
    if (includeManualPdf && primaryManual) {
      lines.push('');
      lines.push(`매뉴얼: ${primaryManual.file_url}`);
    }
    return lines.join('\n');
  }, [selectedModel, symptomTitle, activeSteps, includeManualPdf, primaryManual]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(guideMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  };

  const handleSend = () => {
    const chLabel = sentChannel === 'KAKAO' ? '카톡' : sentChannel === 'SMS' ? '문자' : '이메일';
    onToast?.(
      `[자가조치 가이드 발송] ${selectedModel} (단계 ${activeSteps.length}·도해 ${activeVisuals.length + activeSymptomPhotos.length}) → ${receiverName || '고객'} (${chLabel})`
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
        {/* ① 상단 바 (헌장 3.1 무수식어 건조 명사, 3.2 nowrap) */}
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
              자가조치 가이드 조립
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

            {symptomTitle && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '5px',
                  backgroundColor: '#f1f5f9',
                  color: '#334155',
                  whiteSpace: 'nowrap',
                }}
              >
                {symptomTitle}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setIsPhotoManagerOpen(true)}
              style={{
                height: '30px',
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
                gap: '5px',
                whiteSpace: 'nowrap',
              }}
            >
              <ImageIcon size={13} /> 사진 관리
            </button>
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

        {/* ② 본문 2단: 좌측 도해·점검단계 선택 (56%) | 우측 조립 미리보기 및 발송 (44%) */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* 좌측: 모델 도해 사진 + 점검 단계 */}
          <div
            style={{
              width: '56%',
              borderRight: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              padding: '12px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            {/* 1) 모델 도해·구조 사진 선택 */}
            <div>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 800,
                  color: '#0f172a',
                  marginBottom: '8px',
                  whiteSpace: 'nowrap',
                }}
              >
                모델 도해 사진 ({bundle.visualCards.length})
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                {bundle.visualCards.map(card => {
                  const selected = selectedVisualIds.includes(card.id);
                  return (
                    <div
                      key={card.id}
                      onClick={() => toggleVisual(card.id)}
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
                          height: '150px',
                          backgroundColor: '#ffffff',
                          borderBottom: '1px solid #f1f5f9',
                        }}
                      >
                        <img
                          src={card.imageUrl}
                          alt={card.title}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
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
                          }}
                        >
                          <Check size={12} />
                        </div>
                      </div>
                      <div
                        style={{
                          padding: '6px 8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            color: '#0f172a',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {card.title}
                        </span>
                        <span
                          style={{
                            fontSize: '10px',
                            color: '#64748b',
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
            </div>

            {/* 2) 점검 항목 선택 */}
            <div>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 800,
                  color: '#0f172a',
                  marginBottom: '8px',
                  whiteSpace: 'nowrap',
                }}
              >
                점검 단계 ({steps.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {steps.map(step => (
                  <div
                    key={step.stepNo}
                    onClick={() => toggleStep(step.stepNo)}
                    style={{
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: step.isSelected ? '2px solid #2563eb' : '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                    }}
                  >
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '4px',
                        backgroundColor: step.isSelected ? '#2563eb' : '#e2e8f0',
                        color: step.isSelected ? '#ffffff' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Check size={12} />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
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
                        {step.stepNo}. {step.title}
                      </div>
                      {step.description && (
                        <div
                          style={{
                            fontSize: '11px',
                            color: '#64748b',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {step.description}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3) 증상 사진 보관함 연동 (등록된 사진이 있을 때) */}
            {symptomPhotos.length > 0 && (
              <div>
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 800,
                    color: '#0f172a',
                    marginBottom: '8px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  증상 사진 ({symptomPhotos.length})
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {symptomPhotos.slice(0, 6).map(p => {
                    const selected = selectedPhotoIds.includes(p.id);
                    return (
                      <div
                        key={p.id}
                        onClick={() => toggleSymptomPhoto(p.id)}
                        style={{
                          borderRadius: '6px',
                          border: selected ? '2px solid #2563eb' : '1px solid #cbd5e1',
                          backgroundColor: '#ffffff',
                          overflow: 'hidden',
                          cursor: 'pointer',
                        }}
                      >
                        <img
                          src={p.photo_url}
                          alt={p.caption}
                          style={{
                            width: '100%',
                            height: '84px',
                            objectFit: 'cover',
                            display: 'block',
                          }}
                        />
                        <div
                          style={{
                            padding: '4px 6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#0f172a',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {p.caption}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 4) 후속 업무 전환 바 */}
            <div
              style={{
                marginTop: 'auto',
                paddingTop: '8px',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                gap: '6px',
              }}
            >
              {onOpenPartsQuotation && (
                <button
                  type="button"
                  onClick={() => onOpenPartsQuotation()}
                  style={{
                    height: '30px',
                    padding: '0 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
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
                  <Package size={12} /> 소모품 견적 전환
                </button>
              )}
              {onOpenDispatchPackage && (
                <button
                  type="button"
                  onClick={onOpenDispatchPackage}
                  style={{
                    height: '30px',
                    padding: '0 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
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
                  <Wrench size={12} /> 출장 문서 전환
                </button>
              )}
              {onResolveDirect && (
                <button
                  type="button"
                  onClick={onResolveDirect}
                  style={{
                    height: '30px',
                    padding: '0 10px',
                    borderRadius: '6px',
                    border: '1px solid #bbf7d0',
                    backgroundColor: '#f0fdf4',
                    color: '#15803d',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <CheckCircle2 size={12} /> 해결 종결
                </button>
              )}
            </div>
          </div>

          {/* 우측: 조립된 가이드 시트 & 발송 */}
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
                [{selectedModel}] 가이드 조립본
              </span>
              {primaryManual && (
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
                    checked={includeManualPdf}
                    onChange={e => setIncludeManualPdf(e.target.checked)}
                  />
                  매뉴얼 PDF 첨부
                </label>
              )}
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
              {/* 조립된 모델 도해 사진 */}
              {activeVisuals.map(v => (
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
                      padding: '5px 10px',
                      borderBottom: '1px solid #f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap' }}>
                      {v.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleVisual(v.id)}
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
                    src={v.imageUrl}
                    alt={v.title}
                    style={{
                      width: '100%',
                      maxHeight: '165px',
                      objectFit: 'contain',
                      backgroundColor: '#ffffff',
                      display: 'block',
                    }}
                  />
                </div>
              ))}

              {/* 조립된 점검 단계 */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap' }}>
                  점검 순서 ({activeSteps.length})
                </div>
                {activeSteps.map((s, idx) => (
                  <div key={s.stepNo} style={{ fontSize: '12px', color: '#1e293b', lineHeight: 1.4 }}>
                    <span style={{ fontWeight: 800 }}>{idx + 1}. {s.title}</span>
                    {s.description && (
                      <div style={{ fontSize: '11px', color: '#64748b', marginLeft: '14px' }}>
                        {s.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
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
                    {(['WORKER', 'MANAGER'] as const).map(t => (
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
                        {t === 'WORKER' ? '현장' : '원청'}
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
                    <Send size={13} /> 가이드 발송
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isPhotoManagerOpen && (
        <SymptomPhotoManagerModal
          equipmentModel={selectedModel}
          symptomId={symptomTitle || 'general'}
          symptomTitle={symptomTitle || '점검'}
          onClose={() => {
            setIsPhotoManagerOpen(false);
            getSymptomPhotos(selectedModel, symptomTitle || 'general').then(setSymptomPhotos);
          }}
        />
      )}
    </div>
  );
}
export default SelfActionGuideModal;
