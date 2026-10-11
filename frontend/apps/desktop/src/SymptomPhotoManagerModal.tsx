import React, { useState, useEffect, useRef } from 'react';
import {
  X, Upload, ArrowUp, ArrowDown, Trash2, CheckCircle2,
  Image as ImageIcon, Loader2, Save, Cloud, HardDrive, Eye
} from 'lucide-react';
import {
  type SymptomPhotoItem,
  getSymptomPhotos,
  uploadSymptomPhoto,
  saveReorderedPhotos,
  deleteSymptomPhoto
} from './symptomPhotoApi';

interface SymptomPhotoManagerModalProps {
  equipmentModel: string;
  symptomId: string;
  symptomTitle: string;
  onClose: () => void;
  onPhotosUpdated?: (photos: SymptomPhotoItem[]) => void;
  onToast?: (msg: string) => void;
}

export function SymptomPhotoManagerModal({
  equipmentModel,
  symptomId,
  symptomTitle,
  onClose,
  onPhotosUpdated,
  onToast
}: SymptomPhotoManagerModalProps) {
  const [photos, setPhotos] = useState<SymptomPhotoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // 신규 업로드 시 기본 매핑할 STEP
  const [defaultStepNo, setDefaultStepNo] = useState<number>(1);

  // 파일 입력 참조
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 확대 미리보기 상태
  const [zoomedPhoto, setZoomedPhoto] = useState<SymptomPhotoItem | null>(null);

  // 1. 초기 사진 목록 로드
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    getSymptomPhotos(equipmentModel, symptomId)
      .then(data => {
        if (isMounted) {
          setPhotos(data);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => { isMounted = false; };
  }, [equipmentModel, symptomId]);

  // 2. 다중 파일 업로드 핸들러 (고압축 + 수파베이스 순차 등록)
  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newPhotos: SymptomPhotoItem[] = [];
    const total = files.length;

    for (let i = 0; i < total; i++) {
      const file = files[i];
      setUploadProgress(`사진 ${i + 1}/${total} 고압축 및 수파베이스 업로드 중...`);
      try {
        const nextOrderNo = photos.length + newPhotos.length + 1;
        const uploaded = await uploadSymptomPhoto(
          file,
          equipmentModel,
          symptomId,
          defaultStepNo,
          nextOrderNo,
          `STEP ${defaultStepNo} 조작 점검 사진 (${nextOrderNo}번)`
        );
        newPhotos.push(uploaded);
      } catch (err) {
        console.error('[SymptomPhotoManager] Upload failed for', file.name, err);
      }
    }

    const updatedList = [...photos, ...newPhotos].map((p, idx) => ({ ...p, order_no: idx + 1 }));
    setPhotos(updatedList);
    setIsUploading(false);
    setUploadProgress(null);

    // 파일 입력 리셋
    if (fileInputRef.current) fileInputRef.current.value = '';

    onToast?.(`사진 ${newPhotos.length}장이 고압축(WebP)으로 수파베이스 스토리지에 등록되었습니다.`);
    onPhotosUpdated?.(updatedList);
  };

  // 3. 순서 위로 이동
  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const nextList = [...photos];
    const temp = nextList[index - 1];
    nextList[index - 1] = nextList[index];
    nextList[index] = temp;

    // order_no 재배열
    const reordered = nextList.map((p, idx) => ({ ...p, order_no: idx + 1 }));
    setPhotos(reordered);
  };

  // 4. 순서 아래로 이동
  const handleMoveDown = (index: number) => {
    if (index >= photos.length - 1) return;
    const nextList = [...photos];
    const temp = nextList[index + 1];
    nextList[index + 1] = nextList[index];
    nextList[index] = temp;

    // order_no 재배열
    const reordered = nextList.map((p, idx) => ({ ...p, order_no: idx + 1 }));
    setPhotos(reordered);
  };

  // 5. STEP 매핑 변경
  const handleStepChange = (index: number, newStep: number) => {
    setPhotos(prev => prev.map((p, i) => i === index ? { ...p, step_no: newStep } : p));
  };

  // 6. 캡션(설명) 인라인 변경
  const handleCaptionChange = (index: number, newCaption: string) => {
    setPhotos(prev => prev.map((p, i) => i === index ? { ...p, caption: newCaption } : p));
  };

  // 7. 사진 삭제
  const handleDeletePhoto = async (index: number) => {
    const target = photos[index];
    if (!target) return;

    const confirmed = window.confirm(`[순서 ${target.order_no}] 사진을 삭제하시겠습니까?`);
    if (!confirmed) return;

    try {
      await deleteSymptomPhoto(equipmentModel, symptomId, target.id, target.photo_url);
      const filtered = photos.filter((_, i) => i !== index).map((p, idx) => ({ ...p, order_no: idx + 1 }));
      setPhotos(filtered);
      onToast?.(`[순서 ${target.order_no}] 사진이 삭제되었습니다.`);
      onPhotosUpdated?.(filtered);
    } catch (err) {
      console.error('[SymptomPhotoManager] Delete error:', err);
    }
  };

  // 8. 최종 순서 및 설명 일괄 저장
  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      await saveReorderedPhotos(equipmentModel, symptomId, photos);
      onToast?.(`사진 ${photos.length}장의 정렬 순서 및 설명이 수파베이스에 저장되었습니다.`);
      onPhotosUpdated?.(photos);
      onClose();
    } catch (err) {
      console.error('[SymptomPhotoManager] Save failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // 총 용량 계산
  const totalSizeBytes = photos.reduce((acc, p) => acc + (p.file_size_bytes || 50000), 0);
  const totalSizeKb = Math.round(totalSizeBytes / 1024);

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(3px)',
        zIndex: 10001,
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
          boxShadow: '0 20px 40px rgba(0,0,0,0.35)',
          width: '100%',
          maxWidth: 1060,
          height: '88vh',
          maxHeight: 840,
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
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 6,
                background: '#1d4ed8',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <ImageIcon size={18} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16, fontWeight: 900, color: '#0f172a' }}>
                  증상별 참고 사진 순서 등록 관리 (수파베이스 스토리지 보관)
                </span>
                <span
                  style={{
                    background: '#1d4ed8',
                    color: '#ffffff',
                    fontSize: 13,
                    fontWeight: 800,
                    padding: '2px 7px',
                    borderRadius: 4
                  }}
                >
                  모델: {equipmentModel}
                </span>
                <span
                  style={{
                    background: '#e0e7ff',
                    color: '#1e40af',
                    fontSize: 13,
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: 4
                  }}
                >
                  증상: {symptomTitle}
                </span>
              </div>
              <span style={{ fontSize: 13, color: '#64748b' }}>
                버킷: <strong>symptom-guide-photos</strong> | 고압축(WebP) 규격 저장 | 조작 순서대로 현장 가이드 자동 렌더링
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

        {/* ── 상단 업로드 및 제어 바 ── */}
        <div
          style={{
            background: '#ffffff',
            borderBottom: '1px solid #dcd5c9',
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexShrink: 0
          }}
        >
          {/* 단계 선택 및 일괄 파일 업로드 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ fontSize: 13.5, fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
                등록 대상 단계:
              </label>
              <select
                value={defaultStepNo}
                onChange={e => setDefaultStepNo(Number(e.target.value))}
                style={{
                  border: '1px solid #dcd5c9',
                  borderRadius: 4,
                  padding: '5px 10px',
                  fontSize: 13.5,
                  fontWeight: 700,
                  background: '#f8fafc',
                  color: '#0f172a',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value={1}>STEP 1 (1단계 점검)</option>
                <option value={2}>STEP 2 (2단계 점검)</option>
                <option value={3}>STEP 3 (3단계 점검)</option>
                <option value={0}>공통 / 전체 참고</option>
              </select>
            </div>

            {/* 숨김 파일 입력창 */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFilesSelected}
              style={{ display: 'none' }}
            />

            {/* 업로드 트리거 버튼 */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              data-uia="btn-upload-symptom-photos"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: '#1d4ed8',
                color: '#ffffff',
                border: 'none',
                borderRadius: 5,
                padding: '7px 14px',
                fontSize: 13.5,
                fontWeight: 800,
                cursor: isUploading ? 'not-allowed' : 'pointer',
                boxShadow: '0 1px 3px rgba(29,78,216,0.25)',
                whiteSpace: 'nowrap'
              }}
            >
              {isUploading ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={15} />}
              <span>+ 사진 파일 일괄 선택 (여러장 동시 등록)</span>
            </button>

            {uploadProgress && (
              <span style={{ fontSize: 13, color: '#1d4ed8', fontWeight: 700 }}>
                {uploadProgress}
              </span>
            )}
          </div>

          {/* 스토리지 상태 요약 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#475569' }}>
              <Cloud size={14} color="#059669" />
              <span>수파베이스 버킷 연결됨</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#475569' }}>
              <HardDrive size={14} color="#1d4ed8" />
              <span>총 {photos.length}장 ({totalSizeKb} KB)</span>
            </div>
          </div>
        </div>

        {/* ── 본문: 순서대로 정렬된 사진 목록 ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: 300, gap: 10, color: '#64748b' }}>
              <Loader2 size={32} color="#1d4ed8" style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: 14, fontWeight: 700 }}>수파베이스 사진 목록을 불러오는 중...</span>
            </div>
          ) : photos.length === 0 ? (
            <div style={{ border: '2px dashed #cbd5e1', borderRadius: 8, padding: 40, textAlign: 'center', background: '#f8fafc', color: '#64748b', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <ImageIcon size={40} color="#94a3b8" />
              <span style={{ fontSize: 15, fontWeight: 800, color: '#334155' }}>
                등록된 참고 사진이 없습니다.
              </span>
              <span style={{ fontSize: 13.5 }}>
                상단의 <strong>[+ 사진 파일 일괄 선택]</strong> 버튼을 눌러 조작 순서별 사진을 등록해 주십시오. (자동 저용량 고압축 변환)
              </span>
            </div>
          ) : (
            photos.map((item, idx) => (
              <div
                key={item.id || idx}
                style={{
                  background: '#ffffff',
                  border: '1px solid #dcd5c9',
                  borderRadius: 6,
                  padding: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}
              >
                {/* 1. 순서 뱃지 & 순서 변경 컨트롤 */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: 68, flexShrink: 0 }}>
                  <span
                    style={{
                      background: '#1d4ed8',
                      color: '#ffffff',
                      fontSize: 13,
                      fontWeight: 900,
                      padding: '3px 8px',
                      borderRadius: 4,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    순서 {idx + 1}
                  </span>

                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveUp(idx)}
                      data-uia="btn-photo-move-up"
                      title="위로 이동 (순서 앞으로)"
                      style={{
                        background: idx === 0 ? '#f1f5f9' : '#f5f2eb',
                        border: '1px solid #dcd5c9',
                        borderRadius: 3,
                        padding: 3,
                        cursor: idx === 0 ? 'not-allowed' : 'pointer',
                        color: idx === 0 ? '#cbd5e1' : '#0f172a'
                      }}
                    >
                      <ArrowUp size={13} />
                    </button>

                    <button
                      type="button"
                      disabled={idx === photos.length - 1}
                      onClick={() => handleMoveDown(idx)}
                      data-uia="btn-photo-move-down"
                      title="아래로 이동 (순서 뒤로)"
                      style={{
                        background: idx === photos.length - 1 ? '#f1f5f9' : '#f5f2eb',
                        border: '1px solid #dcd5c9',
                        borderRadius: 3,
                        padding: 3,
                        cursor: idx === photos.length - 1 ? 'not-allowed' : 'pointer',
                        color: idx === photos.length - 1 ? '#cbd5e1' : '#0f172a'
                      }}
                    >
                      <ArrowDown size={13} />
                    </button>
                  </div>
                </div>

                {/* 2. 썸네일 뷰어 */}
                <div
                  onClick={() => setZoomedPhoto(item)}
                  data-uia="photo-manager-thumbnail"
                  title="클릭하여 원본 사진 확대"
                  style={{
                    width: 110,
                    height: 80,
                    borderRadius: 4,
                    overflow: 'hidden',
                    border: '1px solid #cbd5e1',
                    background: '#0f172a',
                    cursor: 'pointer',
                    position: 'relative',
                    flexShrink: 0
                  }}
                >
                  <img
                    src={item.photo_url}
                    alt={item.caption}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(0,0,0,0.3)',
                      opacity: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      transition: 'opacity 0.15s ease'
                    }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                  >
                    <Eye size={18} />
                  </div>
                </div>

                {/* 3. 단계 선택 및 캡션/설명 인라인 편집 */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <label style={{ fontSize: 13, fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
                      연계 진단 절차:
                    </label>
                    <select
                      value={item.step_no}
                      onChange={e => handleStepChange(idx, Number(e.target.value))}
                      style={{
                        border: '1px solid #dcd5c9',
                        borderRadius: 4,
                        padding: '3px 8px',
                        fontSize: 13,
                        fontWeight: 700,
                        background: '#f8fafc',
                        color: '#0f172a',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value={1}>STEP 1 점검</option>
                      <option value={2}>STEP 2 점검</option>
                      <option value={3}>STEP 3 점검</option>
                      <option value={0}>공통 참고</option>
                    </select>

                    <span style={{ fontSize: 13, color: '#64748b' }}>
                      용량: {item.file_size_bytes ? `${Math.round(item.file_size_bytes / 1024)} KB` : '고압축 WebP'}
                    </span>
                    {item.is_local_only && (
                      <span style={{ fontSize: 13, color: '#b45309', background: '#fef3c7', padding: '1px 6px', borderRadius: 3 }}>
                        로컬 보관
                      </span>
                    )}
                  </div>

                  <input
                    value={item.caption}
                    onChange={e => handleCaptionChange(idx, e.target.value)}
                    placeholder="조작 및 점검 부위 설명을 입력하십시오"
                    style={{
                      border: '1px solid #dcd5c9',
                      borderRadius: 4,
                      padding: '6px 10px',
                      fontSize: 13.5,
                      color: '#0f172a',
                      background: '#ffffff',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* 4. 삭제 버튼 */}
                <button
                  type="button"
                  onClick={() => handleDeletePhoto(idx)}
                  title="사진 삭제"
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: 4,
                    padding: '8px 10px',
                    color: '#dc2626',
                    cursor: 'pointer',
                    flexShrink: 0
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* ── 하단 액션 바 (Terminal Actions) ── */}
        <div
          style={{
            background: '#ece7de',
            borderTop: '1px solid #dcd5c9',
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, color: '#475569' }}>
            <CheckCircle2 size={16} color="#059669" />
            <span>등록된 사진은 현장 모바일 가이드 및 진단 콘솔에 순서대로 100% 동적 연동됩니다.</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#f5f2eb',
                border: '1px solid #dcd5c9',
                borderRadius: 5,
                padding: '7px 16px',
                fontSize: 13.5,
                fontWeight: 700,
                color: '#475569',
                cursor: 'pointer'
              }}
            >
              닫기
            </button>

            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveAll}
              data-uia="btn-save-symptom-photos"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: '#059669',
                color: '#ffffff',
                border: 'none',
                borderRadius: 5,
                padding: '7px 18px',
                fontSize: 13.5,
                fontWeight: 800,
                cursor: isSaving ? 'not-allowed' : 'pointer',
                boxShadow: '0 1px 3px rgba(5,150,105,0.25)'
              }}
            >
              {isSaving ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={15} />}
              <span>사진 순서 및 설명 최종 저장 (수파베이스)</span>
            </button>
          </div>
        </div>

        {/* ── 사진 확대 미리보기 모달 ── */}
        {zoomedPhoto && (
          <div
            onClick={() => setZoomedPhoto(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.85)',
              zIndex: 10005,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20
            }}
          >
            <div style={{ maxWidth: 880, maxHeight: '80vh', display: 'flex', flexDirection: 'column', gap: 10, background: '#0f172a', padding: 12, borderRadius: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#ffffff' }}>
                <span style={{ fontSize: 14, fontWeight: 800 }}>
                  [순서 {zoomedPhoto.order_no}] {zoomedPhoto.caption}
                </span>
                <button
                  onClick={() => setZoomedPhoto(null)}
                  data-uia="btn-close-zoom-photo"
                  aria-label="사진 확대 닫기"
                  style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', padding: 4 }}
                >
                  <X size={20} />
                </button>
              </div>
              <img
                src={zoomedPhoto.photo_url}
                alt={zoomedPhoto.caption}
                style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: 4 }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SymptomPhotoManagerModal;
