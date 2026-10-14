import React, { useState, useRef, useEffect } from 'react';
import {
  X, Send, Smartphone, MessageSquare, Mail,
  CheckCircle2, ExternalLink, Play, RotateCcw,
  Edit3, ArrowRight, ShieldAlert, Package,
  Image as ImageIcon, Paperclip, FileText, Download
} from 'lucide-react';
import type { DispatchChannelType } from './PartsOrderQuotationModal';
import { SymptomPhotoManagerModal } from './SymptomPhotoManagerModal';
import {
  type SymptomPhotoItem,
  getSymptomPhotos
} from './symptomPhotoApi';
import {
  fetchEquipmentManuals,
  findRecommendedManualsForModel,
  type EquipmentManualItem
} from './equipmentManualsApi';

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
  symptomSteps?: { step_no: number; title: string; method?: string; criteria_normal?: string; criteria_fault?: string }[];
  onClose: () => void;
  onOpenPartsQuotation?: (evidence?: SitePhotoSketchEvidence) => void;
  onOpenDispatchPackage?: () => void;
  onResolveDirect?: () => void;
  onToast?: (msg: string) => void;
}

// 모델 및 증상별 기본 가이드 프리셋 생성기
function generateDefaultGuideSteps(model: string, symptom: string): GuideStepItem[] {
  if (symptom.includes('잔수') || symptom.includes('흡입') || symptom.includes('물기')) {
    return [
      {
        stepNo: 1,
        title: '스퀴지 블레이드 4면 뒤집기 점검',
        description: '스퀴지 툴 고정 볼트 2개를 손으로 풀고 블레이드를 탈거하여 마모된 날 대신 반대쪽 미사용 날 또는 상하를 뒤집어 재결속하십시오. (블레이드 1개당 4회 재사용 가능)',
        photoLabel: `${model} 스퀴지 블레이드 결합 노브 및 4면 반전 위치`,
        youtubeUrl: 'https://youtu.be/space_j600t_squeegee_flip',
        youtubeTitle: '스퀴지 고무 4면 뒤집기 1분 조작법',
        isSelected: true
      },
      {
        stepNo: 2,
        title: '스퀴지 바닥 접지 각도(45도) 미세조정',
        description: '장비 주행 레버를 살짝 당겨 전진할 때 스퀴지 고무 날이 바닥면에 정확히 45도로 고르게 휘어지는지 확인하고, 중앙 각도 조절 노브를 돌려 좌우 편차를 수평으로 맞추십시오.',
        photoLabel: '스퀴지 45도 접지각 조절 노브 및 좌우 수평 휠',
        youtubeUrl: 'https://youtu.be/space_j600t_angle_adjust',
        youtubeTitle: '스퀴지 바닥 접지각 수평 노브 조절법',
        isSelected: true
      },
      {
        stepNo: 3,
        title: '손바닥 흡입구 진공 부압 테스트 및 오수탱크 가스켓 밀폐',
        description: '흡입 모터 스위치를 켠 상태에서 흡입 호스 끝단을 손바닥으로 완전히 밀착 차단하십시오. 손바닥이 강하게 딸려 들어오면 모터 정상이며, 흡입력이 약하면 오수탱크 뚜껑 가스켓 틈새나 플로트 밸브 이물질을 점검하십시오.',
        photoLabel: '흡입 호스 끝단 손바닥 테스트 및 오수탱크 실링 고무',
        youtubeUrl: 'https://youtu.be/space_j600t_vacuum_test',
        youtubeTitle: '진공 흡입 모터 부압 테스트 및 가스켓 점검',
        isSelected: true
      }
    ];
  }

  if (symptom.includes('충전') || symptom.includes('전원') || symptom.includes('방전')) {
    return [
      {
        stepNo: 1,
        title: '충전 플러그 체결 및 벽면 220V 콘센트 전압 확인',
        description: '충전 플러그를 뽑았다가 딸깍 소리가 날 때까지 끝까지 밀어 넣고, 벽면 콘센트에 스마트폰 충전기 등을 꽂아 220V 전원이 정상 공급되는지 확인하십시오.',
        photoLabel: '충전 커넥터 체결부 및 충전기 표시등',
        youtubeUrl: 'https://youtu.be/space_battery_charge_guide',
        youtubeTitle: '배터리 충전기 연결 및 표시등 확인법',
        isSelected: true
      },
      {
        stepNo: 2,
        title: '메인 전원 퓨즈 및 차단기 리셋 버튼 점검',
        description: '오수탱크 후크를 풀고 탱크를 틸팅하여 하부 퓨즈함 커버를 연 후, 메인 서킷 브레이커 버튼이 튀어나와 있는지 확인하고 꾹 눌러 리셋하십시오.',
        photoLabel: '오수탱크 하부 퓨즈함 및 차단기 리셋 스위치',
        youtubeUrl: 'https://youtu.be/space_fuse_reset_guide',
        youtubeTitle: '장비 메인 퓨즈 및 차단기 복구법',
        isSelected: true
      }
    ];
  }

  // 기본 가이드
  return [
    {
      stepNo: 1,
      title: '외관 체결 부위 및 이물질 확인',
      description: '장비 전원을 끄고 해당 부품의 체결 볼트 이완, 파손, 이물질 끼임 상태를 육안으로 확인하십시오.',
      photoLabel: '체결 상태 점검 부위',
      isSelected: true
    },
    {
      stepNo: 2,
      title: '조작 레버 및 센서 재기동 점검',
      description: '키 스위치를 OFF한 후 10초 대기 후 재인가하여 정상 작동 여부를 테스트하십시오.',
      photoLabel: '제어반 조작 스위치 위치',
      isSelected: true
    }
  ];
}

// 캔버스 기본 스케치 이미지 생성 함수 (스퀴지 립 마모 + 적색 원 스케치)
function createDefaultSketchDataUrl(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 480;
  canvas.height = 320;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // 배경 (바닥 및 장비 하부 메탈 톤)
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, 480, 320);

  // 바닥 에폭시 느낌
  const floorGrad = ctx.createLinearGradient(0, 160, 0, 320);
  floorGrad.addColorStop(0, '#334155');
  floorGrad.addColorStop(1, '#0f172a');
  ctx.fillStyle = floorGrad;
  ctx.fillRect(0, 160, 480, 160);

  // 스퀴지 프레임 알루미늄 바
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(40, 110, 400, 32);
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 2;
  ctx.strokeRect(40, 110, 400, 32);

  // 고정 노브 (황동 볼트)
  ctx.fillStyle = '#d97706';
  ctx.beginPath();
  ctx.arc(100, 100, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(380, 100, 14, 0, Math.PI * 2);
  ctx.fill();

  // 스퀴지 고무 블레이드 (적갈색 라텍스 고무)
  ctx.fillStyle = '#b45309';
  ctx.fillRect(50, 142, 380, 50);

  // 찢어진 결함 부위 (중앙 우측 마모 찢김)
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.moveTo(270, 192);
  ctx.lineTo(285, 165);
  ctx.lineTo(300, 192);
  ctx.closePath();
  ctx.fill();

  // 안내 텍스트 (카메라 촬영 메타데이터 룩)
  ctx.fillStyle = '#94a3b8';
  ctx.font = '12px sans-serif';
  ctx.fillText('[현장 사진] J600T 후면 스퀴지 어셈블리 촬영본', 16, 26);
  ctx.fillText('2026-10-12 03:22 접수 (김순자 미화반장 전송)', 16, 44);

  // 적색 펜 스케치 오버레이 (빨간 동그라미)
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 5;
  ctx.setLineDash([2, 1]);
  ctx.beginPath();
  ctx.ellipse(285, 178, 48, 32, -0.1, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // 적색 화살표 및 손글씨 메모
  ctx.fillStyle = '#f87171';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('이 고무 찢어졌어요! 하나 보내주세요', 180, 240);

  // 화살표
  ctx.strokeStyle = '#f87171';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(260, 224);
  ctx.lineTo(280, 206);
  ctx.stroke();

  return canvas.toDataURL('image/png');
}

export function SelfActionGuideModal({
  equipmentModel,
  customerName,
  manager,
  phone,
  email,
  siteCompany = '(주)클린에코 미화용역',
  siteWorkerName = '김순자 미화반장',
  siteWorkerPhone = '010-3456-7890',
  serialNumber = `${equipmentModel}-2024-0812`,
  symptomTitle,
  symptomSteps,
  onClose,
  onOpenPartsQuotation,
  onOpenDispatchPackage,
  onResolveDirect,
  onToast
}: SelfActionGuideModalProps) {
  // 발송 채널 상태
  const [selectedChannel, setSelectedChannel] = useState<DispatchChannelType>('KAKAO');
  const [isCcToManager, setIsCcToManager] = useState(true);
  const [workerPhoneInput, setWorkerPhoneInput] = useState(siteWorkerPhone);
  const [managerPhoneInput, setManagerPhoneInput] = useState(phone);
  const [managerEmailInput, setManagerEmailInput] = useState(email || 'facility@apartment.co.kr');

  // 가이드 스텝 리스트
  const [guideSteps, setGuideSteps] = useState<GuideStepItem[]>(() => {
    if (symptomSteps && symptomSteps.length > 0) {
      return symptomSteps.map(s => ({
        stepNo: s.step_no,
        title: s.title,
        description: s.method || s.title,
        photoLabel: `${equipmentModel} STEP ${s.step_no} 점검 부위`,
        youtubeUrl: s.step_no === 1 ? 'https://youtu.be/space_guide_step1' : undefined,
        youtubeTitle: `${s.title} 1분 가이드`,
        isSelected: true
      }));
    }
    return generateDefaultGuideSteps(equipmentModel, symptomTitle);
  });

  // 발송 상태
  const [isSent, setIsSent] = useState(false);
  const [sentAt, setSentAt] = useState<string | null>(null);

  // 증상별 가이드 사진 관리 상태 (수파베이스 스토리지 보관 및 순서 매핑)
  const [symptomPhotos, setSymptomPhotos] = useState<SymptomPhotoItem[]>([]);
  const [showPhotoManager, setShowPhotoManager] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<SymptomPhotoItem | null>(null);

  // 공식 장비 매뉴얼 PDF 첨부 상태 (space-dust.com 25종 DB 연동)
  const [availableManuals, setAvailableManuals] = useState<EquipmentManualItem[]>([]);
  const [attachedManualIds, setAttachedManualIds] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;
    fetchEquipmentManuals().then(list => {
      if (!mounted) return;
      setAvailableManuals(list);
      const recommended = findRecommendedManualsForModel(list, equipmentModel);
      if (recommended.length > 0) {
        setAttachedManualIds(recommended.map(m => m.id));
      }
    });
    return () => {
      mounted = false;
    };
  }, [equipmentModel]);

  const attachedManuals = availableManuals.filter(m => attachedManualIds.includes(m.id));
  const toggleAttachedManual = (id: string) => {
    setAttachedManualIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  // 수파베이스 스토리지로부터 등록된 사진 목록 로드 및 가이드 스텝 1:1 매핑
  useEffect(() => {
    let isMounted = true;
    getSymptomPhotos(equipmentModel, symptomTitle)
      .then(photos => {
        if (!isMounted) return;
        setSymptomPhotos(photos);
        if (photos && photos.length > 0) {
          setGuideSteps(prev => prev.map(step => {
            const matched = photos.find(p => p.step_no === step.stepNo) || photos[step.stepNo - 1];
            if (matched) {
              return {
                ...step,
                photoUrl: matched.photo_url,
                photoLabel: matched.caption || step.photoLabel
              };
            }
            return step;
          }));
        }
      })
      .catch(err => {
        console.warn('[SelfActionGuideModal] Failed to load symptom photos:', err);
      });
    return () => { isMounted = false; };
  }, [equipmentModel, symptomTitle]);

  // 사진 관리 모달에서 순서 재배열 또는 사진 추가/삭제 시 가이드 스텝 동기화
  const handlePhotosUpdated = (updatedPhotos: SymptomPhotoItem[]) => {
    setSymptomPhotos(updatedPhotos);
    setGuideSteps(prev => prev.map(step => {
      const matched = updatedPhotos.find(p => p.step_no === step.stepNo) || updatedPhotos[step.stepNo - 1];
      if (matched) {
        return {
          ...step,
          photoUrl: matched.photo_url,
          photoLabel: matched.caption || step.photoLabel
        };
      }
      return step;
    }));
    onToast?.(`가이드 사진 ${updatedPhotos.length}장의 정렬 순서 및 설명이 반영되었습니다.`);
  };

  // 현장 회신 사진 및 적색 스케치 상태
  const [sketchEvidence, setSketchEvidence] = useState<SitePhotoSketchEvidence>({
    photoId: `PHOTO-${Date.now().toString().slice(-6)}`,
    capturedAt: '2026-10-12 03:22',
    siteWorkerName,
    siteWorkerPhone: workerPhoneInput,
    memo: '스퀴지 바닥 고무가 찢어져서 물이 끌립니다. 부품 주문 원합니다.',
    dataUrl: createDefaultSketchDataUrl(),
    hasRedSketch: true,
    matchedPartName: '825mm 내유성 라텍스 스퀴지 블레이드 세트'
  });

  // 인터랙티브 드로잉 캔버스 참조
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasCustomDrawn, setHasCustomDrawn] = useState(false);

  // 초기 캔버스 렌더링
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = sketchEvidence.dataUrl;
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
  }, [sketchEvidence.dataUrl]);

  // 마우스/터치 드로잉 핸들러 (빨간 동그라미 스케치)
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasCustomDrawn(true);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSketchEvidence(prev => ({
      ...prev,
      dataUrl: canvas.toDataURL('image/png'),
      hasRedSketch: true
    }));
  };

  // 캔버스 초기화
  const handleResetCanvas = () => {
    const defaultUrl = createDefaultSketchDataUrl();
    setSketchEvidence(prev => ({
      ...prev,
      dataUrl: defaultUrl,
      hasRedSketch: true
    }));
    setHasCustomDrawn(false);
    onToast?.('기본 현장 접수 사진으로 복원되었습니다.');
  };

  // 가이드 발송 실행
  const handleSendGuide = () => {
    const nowStr = new Date().toLocaleString('ko-KR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    });
    setIsSent(true);
    setSentAt(nowStr);

    const channelName = selectedChannel === 'KAKAO' ? '카카오 알림톡' : selectedChannel === 'SMS' ? 'LMS 문자' : '이메일';
    const ccMsg = isCcToManager ? ` (원청 관리소장 ${managerPhoneInput} 참조 전송)` : '';
    onToast?.(`현장 미화원(${workerPhoneInput})에게 ${channelName}로 자가조치 가이드가 발송되었습니다.${ccMsg}`);
  };

  // 선택된 단계 토글
  const toggleStepSelect = (idx: number) => {
    setGuideSteps(prev => prev.map((s, i) => i === idx ? { ...s, isSelected: !s.isSelected } : s));
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(3px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
    >
      <div
        style={{
          background: '#f5f2eb',
          color: '#0f172a',
          borderRadius: 8,
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          width: '100%',
          maxWidth: 1320,
          height: '92vh',
          maxHeight: 900,
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid #dcd5c9',
          overflow: 'hidden'
        }}
      >
        {/* ── 헤더 (Header) ── */}
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
                background: '#1d4ed8',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: 16
              }}
            >
              <Smartphone size={20} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16, fontWeight: 900, color: '#0f172a' }}>
                  현장 자가조치 모바일 가이드 패키지 (사진·동영상·스케치 접수)
                </span>
                <span
                  style={{
                    background: '#1d4ed8',
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
                    background: '#e0e7ff',
                    color: '#1e40af',
                    fontSize: 13.5,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 4
                  }}
                >
                  증상: {symptomTitle}
                </span>
              </div>
              <span style={{ fontSize: 13.5, color: '#64748b' }}>
                원청: {customerName} ({manager}) | 실사용: {siteCompany} ({siteWorkerName}) | S/N: {serialNumber}
              </span>
            </div>
          </div>

          <button
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
            <X size={22} />
          </button>
        </div>

        {/* ── 본문 2컬럼 레이아웃 (Body) ── */}
        <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>

          {/* ── [좌측 패널 56%]: 조작 설정 및 파이프라인 ── */}
          <div
            style={{
              flex: '0 0 56%',
              borderRight: '1px solid #dcd5c9',
              padding: 16,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 16
            }}
          >
            {/* 섹션 1: 2-Track 수신자 및 발송 채널 선택 */}
            <div
              style={{
                background: '#ece7de',
                borderRadius: 6,
                border: '1px solid #dcd5c9',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
                  1. 수신자 정보 및 전송 채널 (2-Track R&R)
                </span>
                <span style={{ fontSize: 13.5, color: '#475569' }}>
                  현장 조치용 (미화원 발송)
                </span>
              </div>

              {/* 3대 전송 채널 선택 탭 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setSelectedChannel('KAKAO')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '8px 12px',
                    borderRadius: 5,
                    border: selectedChannel === 'KAKAO' ? '2px solid #eab308' : '1px solid #dcd5c9',
                    background: selectedChannel === 'KAKAO' ? '#fef08a' : '#f5f2eb',
                    color: '#854d0e',
                    fontSize: 13.5,
                    fontWeight: 800,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <MessageSquare size={16} />
                  <span>카톡으로 보내기</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedChannel('SMS')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '8px 12px',
                    borderRadius: 5,
                    border: selectedChannel === 'SMS' ? '2px solid #2563eb' : '1px solid #dcd5c9',
                    background: selectedChannel === 'SMS' ? '#dbeafe' : '#f5f2eb',
                    color: '#1e40af',
                    fontSize: 13.5,
                    fontWeight: 800,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <Smartphone size={16} />
                  <span>문자메세지로 보내기</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedChannel('EMAIL')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '8px 12px',
                    borderRadius: 5,
                    border: selectedChannel === 'EMAIL' ? '2px solid #059669' : '1px solid #dcd5c9',
                    background: selectedChannel === 'EMAIL' ? '#d1fae5' : '#f5f2eb',
                    color: '#065f46',
                    fontSize: 13.5,
                    fontWeight: 800,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <Mail size={16} />
                  <span>이메일로 보내기</span>
                </button>
              </div>

              {/* 2-Track 수신인 인라인 확인/수정 폼 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {/* 1차 수신인: 현장 미화원 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 13.5, fontWeight: 700, color: '#334155' }}>
                    실제 조작자 (현장 미화원)
                  </label>
                  <input
                    value={workerPhoneInput}
                    onChange={e => setWorkerPhoneInput(e.target.value)}
                    placeholder="미화원 전화번호"
                    style={{
                      border: '1px solid #dcd5c9',
                      borderRadius: 4,
                      padding: '6px 10px',
                      fontSize: 13.5,
                      background: '#ffffff',
                      color: '#0f172a'
                    }}
                  />
                  <span style={{ fontSize: 13.5, color: '#64748b' }}>
                    {siteCompany} {siteWorkerName}
                  </span>
                </div>

                {/* 2차 참조인: 원청 관리사무소 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label style={{ fontSize: 13.5, fontWeight: 700, color: '#334155' }}>
                      원청 관리사무소 (참조)
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13.5, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={isCcToManager}
                        onChange={e => setIsCcToManager(e.target.checked)}
                      />
                      <span>안내 알림 공유</span>
                    </label>
                  </div>
                  {selectedChannel === 'EMAIL' ? (
                    <input
                      value={managerEmailInput}
                      onChange={e => setManagerEmailInput(e.target.value)}
                      placeholder="원청 관리소 이메일"
                      disabled={!isCcToManager}
                      style={{
                        border: '1px solid #dcd5c9',
                        borderRadius: 4,
                        padding: '6px 10px',
                        fontSize: 13.5,
                        background: isCcToManager ? '#ffffff' : '#f1f5f9',
                        color: '#0f172a'
                      }}
                    />
                  ) : (
                    <input
                      value={managerPhoneInput}
                      onChange={e => setManagerPhoneInput(e.target.value)}
                      placeholder="원청 담당자 전화번호"
                      disabled={!isCcToManager}
                      style={{
                        border: '1px solid #dcd5c9',
                        borderRadius: 4,
                        padding: '6px 10px',
                        fontSize: 13.5,
                        background: isCcToManager ? '#ffffff' : '#f1f5f9',
                        color: '#0f172a'
                      }}
                    />
                  )}
                  <span style={{ fontSize: 13.5, color: '#64748b' }}>
                    {customerName} {manager}
                  </span>
                </div>
              </div>
            </div>

            {/* 섹션 2: 모델/증상별 단계별 조작 사진 & 유튜브 영상 가이드 */}
            <div
              style={{
                background: '#ece7de',
                borderRadius: 6,
                border: '1px solid #dcd5c9',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
                  2. 단계별 자가조치 사진 및 공식 유튜브 가이드
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setShowPhotoManager(true)}
                    data-uia="btn-open-photo-manager"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      background: '#1d4ed8',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 4,
                      padding: '4px 10px',
                      fontSize: 13.5,
                      fontWeight: 800,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <ImageIcon size={14} />
                    <span>사진 순서 등록/관리 (수파베이스)</span>
                  </button>
                  <span style={{ fontSize: 13.5, color: '#059669', fontWeight: 700 }}>
                    고압축 참고 이미지 탑재
                  </span>
                </div>
              </div>

              {/* 스텝 리스트 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {guideSteps.map((step, idx) => (
                  <div
                    key={step.stepNo}
                    style={{
                      background: step.isSelected ? '#ffffff' : '#f8fafc',
                      border: step.isSelected ? '1px solid #93c5fd' : '1px solid #dcd5c9',
                      borderRadius: 6,
                      padding: 10,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={step.isSelected}
                          onChange={() => toggleStepSelect(idx)}
                        />
                        <span
                          style={{
                            background: '#1d4ed8',
                            color: '#ffffff',
                            fontSize: 13.5,
                            fontWeight: 800,
                            padding: '1px 6px',
                            borderRadius: 3
                          }}
                        >
                          STEP {step.stepNo}
                        </span>
                        <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
                          {step.title}
                        </span>
                      </label>

                      {step.youtubeUrl && (
                        <a
                          href={step.youtubeUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            background: '#fef2f2',
                            color: '#dc2626',
                            border: '1px solid #fecaca',
                            borderRadius: 4,
                            padding: '2px 8px',
                            fontSize: 13.5,
                            fontWeight: 700,
                            textDecoration: 'none'
                          }}
                        >
                          <Play size={12} />
                          <span>유튜브 영상</span>
                          <ExternalLink size={12} />
                        </a>
                      )}
                    </div>

                    <p style={{ margin: 0, fontSize: 13.5, color: '#334155', lineHeight: 1.45, paddingLeft: 24 }}>
                      {step.description}
                    </p>

                    {/* 참고 사진 썸네일 & 관리 액션 */}
                    <div
                      style={{
                        marginLeft: 24,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 10,
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: 4,
                        padding: '6px 10px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                        {step.photoUrl ? (
                          <img
                            src={step.photoUrl}
                            alt={step.photoLabel}
                            style={{
                              width: 54,
                              height: 38,
                              objectFit: 'cover',
                              borderRadius: 4,
                              border: '1px solid #cbd5e1',
                              cursor: 'pointer',
                              flexShrink: 0
                            }}
                            onClick={() => {
                              const found = symptomPhotos.find(p => p.photo_url === step.photoUrl);
                              if (found) setPreviewPhoto(found);
                              else {
                                setPreviewPhoto({
                                  id: `step-${step.stepNo}`,
                                  equipment_model: equipmentModel,
                                  symptom_id: symptomTitle,
                                  step_no: step.stepNo,
                                  order_no: step.stepNo,
                                  photo_url: step.photoUrl!,
                                  caption: step.photoLabel
                                });
                              }
                            }}
                            title="클릭하여 원본 사진 확대"
                          />
                        ) : (
                          <div style={{ width: 54, height: 38, background: '#e2e8f0', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <ImageIcon size={18} color="#94a3b8" />
                          </div>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, overflow: 'hidden' }}>
                          <span style={{ fontSize: 13.5, fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            참고 사진: {step.photoLabel}
                          </span>
                          <span style={{ fontSize: 13.5, color: '#64748b' }}>
                            {step.photoUrl?.startsWith('data:image/svg') ? '기본 도해 그래픽' : '수파베이스 보관 고압축 사진'}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowPhotoManager(true)}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: 4,
                          padding: '3px 8px',
                          fontSize: 13.5,
                          fontWeight: 700,
                          color: '#1d4ed8',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          flexShrink: 0
                        }}
                      >
                        사진 변경/순서 조정
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* ── 공식 장비 매뉴얼 PDF 동봉 첨부 섹션 (space-dust.com 25종 DB 연동) ── */}
              <div
                data-uia="self-guide-manual-attachment-box"
                style={{
                  marginTop: 6,
                  background: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  borderRadius: 6,
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Paperclip size={14} color="#0284c7" />
                    <span style={{ fontSize: 13.5, fontWeight: 900, color: '#0f172a' }}>
                      공식 제품 매뉴얼 PDF 동봉 첨부 ({attachedManuals.length}건 선택됨)
                    </span>
                  </div>
                  <select
                    value=""
                    onChange={e => {
                      if (e.target.value && !attachedManualIds.includes(e.target.value)) {
                        setAttachedManualIds(prev => [...prev, e.target.value]);
                      }
                    }}
                    style={{
                      padding: '4px 8px',
                      borderRadius: 4,
                      border: '1px solid #7dd3fc',
                      background: '#ffffff',
                      fontSize: 13.5,
                      fontWeight: 700,
                      color: '#0369a1'
                    }}
                  >
                    <option value="">+ 다른 매뉴얼·카탈로그 추가 첨부 (25종)...</option>
                    {availableManuals.map(m => (
                      <option key={m.id} value={m.id}>
                        [{m.category}] {m.title} — {m.file_name} ({m.file_size_label})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {attachedManuals.map(m => (
                    <div
                      key={m.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: '#ffffff',
                        border: '1px solid #bae6fd',
                        borderRadius: 5,
                        padding: '6px 10px',
                        gap: 8
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 }}>
                        <FileText size={14} color="#dc2626" style={{ flexShrink: 0 }} />
                        <span style={{ fontSize: 13.5, fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap' }}>
                          {m.title}
                        </span>
                        <span
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
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <a
                          href={m.file_url}
                          target="_blank"
                          rel="noreferrer"
                          download={m.file_name}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '2px 8px',
                            borderRadius: 4,
                            background: '#e0f2fe',
                            color: '#0369a1',
                            fontSize: 13.5,
                            fontWeight: 800,
                            textDecoration: 'none'
                          }}
                        >
                          <Download size={12} />
                          <span>원본 PDF</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => toggleAttachedManual(m.id)}
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
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 섹션 3: 미화원 사진 촬영 및 적색 펜 스케치 회신 접수처 (Request 5 충족) */}
            <div
              style={{
                background: '#ece7de',
                borderRadius: 6,
                border: '1px solid #dcd5c9',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
                    3. 현장 사진 촬영 및 적색 동그라미 스케치 회신 접수
                  </span>
                  <span
                    style={{
                      background: '#fee2e2',
                      color: '#b91c1c',
                      fontSize: 13.5,
                      fontWeight: 800,
                      padding: '2px 6px',
                      borderRadius: 4
                    }}
                  >
                    현장 회신 접수됨
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleResetCanvas}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    background: '#f5f2eb',
                    border: '1px solid #dcd5c9',
                    borderRadius: 4,
                    padding: '3px 8px',
                    fontSize: 13.5,
                    cursor: 'pointer',
                    color: '#475569'
                  }}
                >
                  <RotateCcw size={12} />
                  <span>원상 복원</span>
                </button>
              </div>

              <div style={{ fontSize: 13.5, color: '#475569' }}>
                현장 미화원이 모바일 가이드 하단 회신 링크를 통해 고장 부위 사진에 <strong>적색 동그라미</strong>를 그려 전송한 내역입니다. (마우스/터치로 캔버스에 직접 추가 스케치 가능)
              </div>

              {/* 인터랙티브 스케치 캔버스 영역 */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  background: '#0f172a',
                  borderRadius: 6,
                  padding: 8,
                  position: 'relative'
                }}
              >
                <canvas
                  ref={canvasRef}
                  width={480}
                  height={300}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  style={{
                    maxWidth: '100%',
                    height: 'auto',
                    borderRadius: 4,
                    cursor: 'crosshair',
                    background: '#1e293b'
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: 14,
                    right: 14,
                    background: 'rgba(239, 68, 68, 0.9)',
                    color: '#ffffff',
                    fontSize: 13.5,
                    fontWeight: 800,
                    padding: '3px 8px',
                    borderRadius: 4,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  <Edit3 size={13} />
                  <span>적색 펜 스케치 모드</span>
                </div>
                {hasCustomDrawn && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 14,
                      left: 14,
                      background: 'rgba(22, 101, 52, 0.9)',
                      color: '#ffffff',
                      fontSize: 13.5,
                      fontWeight: 800,
                      padding: '3px 8px',
                      borderRadius: 4
                    }}
                  >
                    수동 적색 마킹 반영됨
                  </div>
                )}
              </div>

              {/* 회신 메타데이터 및 부품 매핑 요약 */}
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 6,
                  padding: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13.5, fontWeight: 800, color: '#991b1b' }}>
                    현장 미화원 메시지: &ldquo;{sketchEvidence.memo}&rdquo;
                  </span>
                  <span style={{ fontSize: 13.5, color: '#64748b' }}>
                    접수: {sketchEvidence.capturedAt} ({sketchEvidence.siteWorkerName})
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Package size={15} color="#1d4ed8" />
                    <span style={{ fontSize: 13.5, fontWeight: 800, color: '#1e40af' }}>
                      매핑 정품 부품: {sketchEvidence.matchedPartName}
                    </span>
                  </div>

                  {/* 분기 B 즉시 연계 버튼 */}
                  <button
                    type="button"
                    onClick={() => onOpenPartsQuotation?.(sketchEvidence)}
                    data-uia="btn-jump-to-parts-quotation"
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
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(29,78,216,0.3)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <span>이 사진으로 소모품 견적서 발행</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* 섹션 4: 발송 실행 및 결과 분기 버튼군 (Bottom Terminal Actions) */}
            <div
              style={{
                marginTop: 'auto',
                background: '#ece7de',
                border: '1px solid #dcd5c9',
                borderRadius: 6,
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10
              }}
            >
              {/* 발송 버튼 */}
              <button
                type="button"
                onClick={handleSendGuide}
                data-uia="btn-send-guide-to-worker"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: isSent ? '#059669' : '#1d4ed8',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 5,
                  padding: '9px 18px',
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                  whiteSpace: 'nowrap'
                }}
              >
                {isSent ? <CheckCircle2 size={16} /> : <Send size={16} />}
                <span>
                  {isSent
                    ? `가이드 발송 완료 (${sentAt || ''} ${selectedChannel})`
                    : `현장 사용자에게 자가조치 가이드 전송 (${selectedChannel === 'KAKAO' ? '카톡' : selectedChannel === 'SMS' ? '문자' : '이메일'})`}
                </span>
              </button>

              {/* 3대 결과 분기 빠른 전환 버튼군 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {/* 분기 A: 자가조치 성공 종결 */}
                <button
                  type="button"
                  onClick={onResolveDirect}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    background: '#f0fdf4',
                    color: '#166534',
                    border: '1px solid #bbf7d0',
                    borderRadius: 5,
                    padding: '8px 12px',
                    fontSize: 13.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <CheckCircle2 size={14} color="#16a34a" />
                  <span>직접 조치 종결 (₩0)</span>
                </button>

                {/* 분기 B: 소모품 견적서 발행 */}
                <button
                  type="button"
                  onClick={() => onOpenPartsQuotation?.(sketchEvidence)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    background: '#eff6ff',
                    color: '#1e40af',
                    border: '1px solid #bfdbfe',
                    borderRadius: 5,
                    padding: '8px 12px',
                    fontSize: 13.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <Package size={14} color="#1d4ed8" />
                  <span>소모품 견적서 발행</span>
                </button>

                {/* 분기 C: AS 출장 접수 */}
                <button
                  type="button"
                  onClick={onOpenDispatchPackage}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    background: '#fef2f2',
                    color: '#991b1b',
                    border: '1px solid #fecaca',
                    borderRadius: 5,
                    padding: '8px 12px',
                    fontSize: 13.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <ShieldAlert size={14} color="#dc2626" />
                  <span>AS 출장 접수</span>
                </button>
              </div>
            </div>
          </div>

          {/* ── [우측 패널 44%]: 모바일 스마트폰 실시간 Live HTML 프리뷰 ── */}
          <div
            style={{
              flex: '0 0 44%',
              background: '#e2e8f0',
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-start',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <Smartphone size={16} color="#475569" />
              <span style={{ fontSize: 14, fontWeight: 800, color: '#334155' }}>
                수신자 모바일 화면 미리보기 ({selectedChannel === 'KAKAO' ? '카카오 알림톡' : selectedChannel === 'SMS' ? 'LMS 모바일 웹' : 'HTML 이메일'})
              </span>
            </div>

            {/* 스마트폰 목업 프레임 */}
            <div
              style={{
                width: 380,
                background: '#ffffff',
                borderRadius: 28,
                border: '8px solid #0f172a',
                boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {/* 스마트폰 상단 스피커 & 노치 */}
              <div
                style={{
                  height: 24,
                  background: '#0f172a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#94a3b8',
                  fontSize: 13.5
                }}
              >
                <div style={{ width: 44, height: 4, background: '#334155', borderRadius: 2 }} />
              </div>

              {/* 모바일 화면 내용 */}
              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10, background: '#f8fafc' }}>

                {/* 카카오톡 / LMS 헤더 */}
                <div
                  style={{
                    background: selectedChannel === 'KAKAO' ? '#fee500' : '#1d4ed8',
                    color: selectedChannel === 'KAKAO' ? '#000000' : '#ffffff',
                    padding: '8px 12px',
                    borderRadius: 6,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <img
                      src={selectedChannel === 'KAKAO' ? '/SPACE_logo.png' : '/SPACE_logo_white.png'}
                      alt="SPACE"
                      style={{ height: 14, width: 'auto', objectFit: 'contain' }}
                    />
                    <span style={{ fontSize: 13.5, fontWeight: 900 }}>
                      고객기술지원센터
                    </span>
                  </div>
                  <span style={{ fontSize: 13.5, opacity: 0.85 }}>공식 알림</span>
                </div>

                {/* 환영 안내문 */}
                <div
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 6,
                    padding: 10,
                    fontSize: 13.5,
                    lineHeight: 1.45,
                    color: '#0f172a'
                  }}
                >
                  <div style={{ fontWeight: 800, marginBottom: 4, color: '#1e40af' }}>
                    [{equipmentModel}] 현장 자가점검 안내
                  </div>
                  {siteWorkerName} 반장님, 접수해 주신 <strong>&ldquo;{symptomTitle}&rdquo;</strong> 증상에 대해 아래 3단계 자가조치 절차를 진행해 주시기 바랍니다.
                </div>

                {/* 단계별 카드 리스트 */}
                {guideSteps.filter(s => s.isSelected).map(step => (
                  <div
                    key={step.stepNo}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: 6,
                      padding: 10,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        style={{
                          background: '#1d4ed8',
                          color: '#ffffff',
                          fontSize: 13.5,
                          fontWeight: 800,
                          padding: '2px 7px',
                          borderRadius: 3
                        }}
                      >
                        STEP {step.stepNo}
                      </span>
                      <span style={{ fontSize: 13.5, fontWeight: 800, color: '#0f172a' }}>
                        {step.title}
                      </span>
                    </div>

                    {/* 모바일 가이드 내 참고 사진 표시 */}
                    {step.photoUrl && (
                      <div
                        style={{
                          position: 'relative',
                          borderRadius: 4,
                          overflow: 'hidden',
                          border: '1px solid #cbd5e1',
                          background: '#0f172a'
                        }}
                      >
                        <img
                          src={step.photoUrl}
                          alt={step.photoLabel}
                          style={{
                            width: '100%',
                            height: 140,
                            objectFit: 'cover',
                            display: 'block'
                          }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            background: 'rgba(15, 23, 42, 0.82)',
                            color: '#ffffff',
                            fontSize: 13.5,
                            padding: '3px 8px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          📷 {step.photoLabel}
                        </div>
                      </div>
                    )}

                    <p style={{ margin: 0, fontSize: 13.5, color: '#334155', lineHeight: 1.4 }}>
                      {step.description}
                    </p>

                    {/* 유튜브 링크 카드 */}
                    {step.youtubeUrl && (
                      <div
                        style={{
                          background: '#fef2f2',
                          border: '1px solid #fecaca',
                          borderRadius: 4,
                          padding: '6px 8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        <span style={{ fontSize: 13.5, color: '#dc2626', fontWeight: 700 }}>
                          ▶ {step.youtubeTitle || '1분 조작 영상 보기'}
                        </span>
                        <ExternalLink size={13} color="#dc2626" />
                      </div>
                    )}
                  </div>
                ))}

                {/* 모바일 수신 화면 내 동봉된 공식 매뉴얼 PDF 다운로드 카드 */}
                {attachedManuals.length > 0 && (
                  <div
                    style={{
                      background: '#f0f9ff',
                      border: '1px solid #7dd3fc',
                      borderRadius: 6,
                      padding: 10,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Paperclip size={13} color="#0284c7" />
                      <span style={{ fontSize: 13.5, fontWeight: 900, color: '#0369a1' }}>
                        동봉된 공식 제품 매뉴얼 PDF ({attachedManuals.length}건)
                      </span>
                    </div>
                    {attachedManuals.map(m => (
                      <a
                        key={m.id}
                        href={m.file_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: '#ffffff',
                          border: '1px solid #bae6fd',
                          borderRadius: 5,
                          padding: '6px 8px',
                          textDecoration: 'none',
                          gap: 6
                        }}
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0f172a' }}>{m.title}</div>
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
                        <span
                          style={{
                            background: '#0284c7',
                            color: '#ffffff',
                            padding: '3px 8px',
                            borderRadius: 4,
                            fontSize: 13.5,
                            fontWeight: 800,
                            whiteSpace: 'nowrap'
                          }}
                        >
                          PDF 열기
                        </span>
                      </a>
                    ))}
                  </div>
                )}

                {/* 미화원 전용 회신 배너 (Request 5 핵심) */}
                <div
                  style={{
                    background: '#eff6ff',
                    border: '1px dashed #3b82f6',
                    borderRadius: 6,
                    padding: 10,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    textAlign: 'center'
                  }}
                >
                  <span style={{ fontSize: 13.5, fontWeight: 900, color: '#1e40af' }}>
                    📸 부품을 모르시겠다면?
                  </span>
                  <span style={{ fontSize: 13.5, color: '#475569', lineHeight: 1.35 }}>
                    스마트폰으로 장비 부위를 찍고 <strong>빨간 동그라미</strong>를 그려서 회신하시면 즉시 동일 소모품 견적서로 연결됩니다.
                  </span>
                  <button
                    type="button"
                    style={{
                      background: '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 4,
                      padding: '6px 12px',
                      fontSize: 13.5,
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    사진 촬영 및 스케치 회신하기 ➔
                  </button>
                </div>

                {/* 고객센터 직통 안내 */}
                <div style={{ textAlign: 'center', padding: '6px 0', fontSize: 13.5, color: '#94a3b8' }}>
                  문의: (주)스페이스 고객센터 1588-0000 | 평일 08:30 ~ 17:30
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── 사진 원본 확대 모달 (Zoom Modal) ── */}
      {previewPhoto && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setPreviewPhoto(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            zIndex: 10005,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            cursor: 'zoom-out'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#0f172a',
              borderRadius: 8,
              maxWidth: 780,
              width: '100%',
              overflow: 'hidden',
              boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
              border: '1px solid #334155',
              cursor: 'default'
            }}
          >
            <div
              style={{
                padding: '12px 16px',
                background: '#1e293b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: '#ffffff'
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 800 }}>
                [순서 {previewPhoto.order_no}] {previewPhoto.caption}
              </span>
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: 4
                }}
              >
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: 16, display: 'flex', justifyContent: 'center', background: '#020617' }}>
              <img
                src={previewPhoto.photo_url}
                alt={previewPhoto.caption}
                style={{ maxWidth: '100%', maxHeight: '65vh', objectFit: 'contain', borderRadius: 4 }}
              />
            </div>
            <div
              style={{
                padding: '10px 16px',
                background: '#1e293b',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 13.5,
                color: '#94a3b8'
              }}
            >
              <span>매핑: STEP {previewPhoto.step_no}</span>
              <span>{previewPhoto.is_local_only ? '로컬 저장' : '수파베이스 스토리지 보관 (WebP 고압축)'}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── 증상별 참고 사진 순서 등록 관리 모달 (수파베이스 연동) ── */}
      {showPhotoManager && (
        <SymptomPhotoManagerModal
          equipmentModel={equipmentModel}
          symptomId={symptomTitle}
          symptomTitle={symptomTitle}
          onClose={() => setShowPhotoManager(false)}
          onPhotosUpdated={handlePhotosUpdated}
          onToast={onToast}
        />
      )}
    </div>
  );
}
export default SelfActionGuideModal;
