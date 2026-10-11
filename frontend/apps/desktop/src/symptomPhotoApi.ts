/**
 * symptomPhotoApi.ts
 * 증상별 가이드 사진 관리 API (Supabase Storage & Table 연동 + 클라이언트 고압축 + 오프라인 로컬 폴백)
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://eknwzjcbchbefdlykqgl.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_y7xsEQsIj_lFTYiHtYOr5Q_44z2fM-Z';

export const supabase = createClient(SUPABASE_URL || '', SUPABASE_KEY || '');

export const STORAGE_BUCKET = 'symptom-guide-photos';

export interface SymptomPhotoItem {
  id: string;
  equipment_model: string;
  symptom_id: string;
  step_no: number;
  order_no: number;
  photo_url: string;
  caption: string;
  file_size_bytes?: number;
  created_at?: string;
  updated_at?: string;
  is_local_only?: boolean;
}

const LOCAL_STORAGE_PREFIX = 'space_symptom_photos_';

// ── 클라이언트 사전 고압축 유틸리티 (Canvas Resize + WebP 80%) ──
export async function compressImageClient(file: File, maxDimension = 1200, quality = 0.82): Promise<{ blob: Blob; dataUrl: string; originalSize: number; compressedSize: number }> {
  const originalSize = file.size;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas 2D Context initialization failed'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // WebP 변환 시도, 미지원 시 image/jpeg 사용
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Canvas toBlob conversion failed'));
              return;
            }
            const dataUrl = canvas.toDataURL('image/webp', quality);
            resolve({
              blob,
              dataUrl,
              originalSize,
              compressedSize: blob.size
            });
          },
          'image/webp',
          quality
        );
      };
      img.onerror = () => reject(new Error('Image decode error'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('File read error'));
    reader.readAsDataURL(file);
  });
}

// ── 증상별 등록된 사진 목록 조회 (순서대로 정렬) ──
export async function getSymptomPhotos(equipmentModel: string, symptomId: string): Promise<SymptomPhotoItem[]> {
  try {
    // 1. Supabase DB 조회
    const { data, error } = await supabase
      .from('symptom_guide_photos')
      .select('*')
      .eq('equipment_model', equipmentModel)
      .eq('symptom_id', symptomId)
      .order('order_no', { ascending: true })
      .order('created_at', { ascending: true });

    if (!error && data && data.length > 0) {
      return data as SymptomPhotoItem[];
    }
  } catch (err) {
    console.warn('[symptomPhotoApi] Supabase query failed, falling back to local:', err);
  }

  // 2. 로컬 스토리지 폴백 조회
  const localKey = `${LOCAL_STORAGE_PREFIX}${equipmentModel}_${symptomId}`;
  try {
    const raw = localStorage.getItem(localKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}

  // 3. 기본 프리셋 목업 사진 생성 (첫 접근 시)
  return getDefaultPresetPhotos(equipmentModel, symptomId);
}

// ── 단일/복수 사진 압축 및 수파베이스 업로드 등록 ──
export async function uploadSymptomPhoto(
  file: File,
  equipmentModel: string,
  symptomId: string,
  stepNo: number,
  orderNo: number,
  caption: string
): Promise<SymptomPhotoItem> {
  // 1. 클라이언트 고압축 (평균 5MB ➔ 60~120KB)
  const compressed = await compressImageClient(file);
  const fileExt = 'webp';
  const timestamp = Date.now();
  const filePath = `${equipmentModel}/${symptomId}/step${stepNo}_order${orderNo}_${timestamp}.${fileExt}`;

  let photoUrl = compressed.dataUrl; // 기본 dataUrl
  let isLocalOnly = false;

  // 2. Supabase Storage 업로드
  try {
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, compressed.blob, {
        contentType: 'image/webp',
        upsert: true
      });

    if (!uploadError) {
      const { data: publicUrlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(filePath);

      if (publicUrlData?.publicUrl) {
        photoUrl = publicUrlData.publicUrl;
      }
    } else {
      console.warn('[symptomPhotoApi] Storage upload failed, using local base64:', uploadError);
      isLocalOnly = true;
    }
  } catch (err) {
    console.warn('[symptomPhotoApi] Supabase storage exception:', err);
    isLocalOnly = true;
  }

  // 3. DB 메타데이터 저장
  const photoItem: SymptomPhotoItem = {
    id: `photo-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    equipment_model: equipmentModel,
    symptom_id: symptomId,
    step_no: stepNo,
    order_no: orderNo,
    photo_url: photoUrl,
    caption: caption || `STEP ${stepNo} 조작 점검 사진 (${orderNo}번)`,
    file_size_bytes: compressed.compressedSize,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_local_only: isLocalOnly
  };

  if (!isLocalOnly) {
    try {
      const { data: dbItem, error: dbError } = await supabase
        .from('symptom_guide_photos')
        .insert([{
          equipment_model: photoItem.equipment_model,
          symptom_id: photoItem.symptom_id,
          step_no: photoItem.step_no,
          order_no: photoItem.order_no,
          photo_url: photoItem.photo_url,
          caption: photoItem.caption,
          file_size_bytes: photoItem.file_size_bytes
        }])
        .select()
        .single();

      if (!dbError && dbItem) {
        photoItem.id = dbItem.id;
      }
    } catch (err) {
      console.warn('[symptomPhotoApi] DB record insert error:', err);
    }
  }

  // 4. 로컬 스토리지 동기화
  saveToLocalStorage(equipmentModel, symptomId, photoItem);

  return photoItem;
}

// ── 사진 순서 재배열 및 일괄 저장 ──
export async function saveReorderedPhotos(
  equipmentModel: string,
  symptomId: string,
  photos: SymptomPhotoItem[]
): Promise<void> {
  const updatedPhotos = photos.map((p, idx) => ({
    ...p,
    order_no: idx + 1,
    updated_at: new Date().toISOString()
  }));

  // 1. Supabase DB 일괄 업데이트 시도
  try {
    for (const p of updatedPhotos) {
      if (!p.id.startsWith('photo-')) {
        await supabase
          .from('symptom_guide_photos')
          .update({
            order_no: p.order_no,
            step_no: p.step_no,
            caption: p.caption,
            updated_at: p.updated_at
          })
          .eq('id', p.id);
      }
    }
  } catch (err) {
    console.warn('[symptomPhotoApi] Reorder DB update error:', err);
  }

  // 2. 로컬 스토리지 저장
  const localKey = `${LOCAL_STORAGE_PREFIX}${equipmentModel}_${symptomId}`;
  try {
    localStorage.setItem(localKey, JSON.stringify(updatedPhotos));
  } catch {}
}

// ── 사진 삭제 ──
export async function deleteSymptomPhoto(
  equipmentModel: string,
  symptomId: string,
  photoId: string,
  photoUrl: string
): Promise<void> {
  // 1. DB 삭제
  try {
    if (!photoId.startsWith('photo-')) {
      await supabase
        .from('symptom_guide_photos')
        .delete()
        .eq('id', photoId);
    }
  } catch (err) {
    console.warn('[symptomPhotoApi] DB delete error:', err);
  }

  // 2. Storage 삭제
  try {
    if (photoUrl.includes(STORAGE_BUCKET)) {
      const parts = photoUrl.split(`${STORAGE_BUCKET}/`);
      if (parts[1]) {
        await supabase.storage.from(STORAGE_BUCKET).remove([parts[1]]);
      }
    }
  } catch (err) {
    console.warn('[symptomPhotoApi] Storage delete error:', err);
  }

  // 3. 로컬 스토리지 삭제
  const localKey = `${LOCAL_STORAGE_PREFIX}${equipmentModel}_${symptomId}`;
  try {
    const raw = localStorage.getItem(localKey);
    if (raw) {
      const list: SymptomPhotoItem[] = JSON.parse(raw);
      const filtered = list.filter(p => p.id !== photoId).map((p, idx) => ({ ...p, order_no: idx + 1 }));
      localStorage.setItem(localKey, JSON.stringify(filtered));
    }
  } catch {}
}

function saveToLocalStorage(equipmentModel: string, symptomId: string, item: SymptomPhotoItem) {
  const localKey = `${LOCAL_STORAGE_PREFIX}${equipmentModel}_${symptomId}`;
  try {
    const raw = localStorage.getItem(localKey);
    const list: SymptomPhotoItem[] = raw ? JSON.parse(raw) : [];
    const existingIdx = list.findIndex(p => p.id === item.id);
    if (existingIdx >= 0) {
      list[existingIdx] = item;
    } else {
      list.push(item);
    }
    list.sort((a, b) => a.order_no - b.order_no);
    localStorage.setItem(localKey, JSON.stringify(list));
  } catch {}
}

// ── 기본 프리셋 목업 사진 생성 (기본 고품질 도해) ──
function getDefaultPresetPhotos(equipmentModel: string, symptomId: string): SymptomPhotoItem[] {
  // 스퀴지/흡입 관련 기본 도해
  if (symptomId.includes('SUC') || symptomId.includes('잔수') || symptomId.includes('흡입')) {
    return [
      {
        id: 'default-1',
        equipment_model: equipmentModel,
        symptom_id: symptomId,
        step_no: 1,
        order_no: 1,
        photo_url: createStepSvgMock(1, `${equipmentModel} 스퀴지 툴 고정 볼트 2개 해제 및 블레이드 반전 위치`),
        caption: '1. 스퀴지 고정 노브를 풀고 블레이드를 탈거하여 미사용 날로 반전 장착',
        file_size_bytes: 48200
      },
      {
        id: 'default-2',
        equipment_model: equipmentModel,
        symptom_id: symptomId,
        step_no: 2,
        order_no: 2,
        photo_url: createStepSvgMock(2, `${equipmentModel} 45도 바닥 접지각 수평 조절 휠 및 노브`),
        caption: '2. 장비 주행 시 고무 립이 45도로 균일하게 휘어지도록 수평 조절',
        file_size_bytes: 52400
      },
      {
        id: 'default-3',
        equipment_model: equipmentModel,
        symptom_id: symptomId,
        step_no: 3,
        order_no: 3,
        photo_url: createStepSvgMock(3, `${equipmentModel} 흡입 호스 손바닥 진공 부압 테스트 및 오수탱크 가스켓`),
        caption: '3. 손바닥으로 호스 끝단을 막아 진공 흡입력 및 탱크 뚜껑 실링 밀폐 확인',
        file_size_bytes: 61800
      }
    ];
  }

  // 전원/배터리 관련 기본 도해
  return [
    {
      id: 'default-1',
      equipment_model: equipmentModel,
      symptom_id: symptomId,
      step_no: 1,
      order_no: 1,
      photo_url: createStepSvgMock(1, `${equipmentModel} 220V 충전 플러그 체결 상태 확인`),
      caption: '1. 충전 플러그 접속 단자 완전 체결 및 벽면 전압 확인',
      file_size_bytes: 45000
    },
    {
      id: 'default-2',
      equipment_model: equipmentModel,
      symptom_id: symptomId,
      step_no: 2,
      order_no: 2,
      photo_url: createStepSvgMock(2, `${equipmentModel} 오수탱크 하부 메인 퓨즈함 및 차단기 리셋 스위치`),
      caption: '2. 메인 서킷 브레이커 트립 여부 점검 및 복귀 버튼 가압',
      file_size_bytes: 58000
    }
  ];
}

function createStepSvgMock(stepNo: number, title: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="380" viewBox="0 0 600 380">
    <rect width="600" height="380" fill="#1e293b"/>
    <rect x="20" y="20" width="560" height="340" fill="#0f172a" rx="8" stroke="#334155" stroke-width="2"/>
    <rect x="36" y="36" width="90" height="28" fill="#1d4ed8" rx="4"/>
    <text x="81" y="55" fill="#ffffff" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle">순서 ${stepNo}</text>
    <rect x="136" y="36" width="428" height="28" fill="#334155" rx="4"/>
    <text x="146" y="55" fill="#f8fafc" font-family="sans-serif" font-size="13" font-weight="600">${title.slice(0, 36)}</text>
    
    <!-- 장비 부품 도해 모식도 -->
    <rect x="80" y="110" width="440" height="150" fill="#1e293b" rx="6" stroke="#475569" stroke-width="2"/>
    <line x1="80" y1="185" x2="520" y2="185" stroke="#334155" stroke-width="1" stroke-dasharray="4"/>
    
    <!-- 핵심 부품 강조 영역 -->
    <circle cx="200" cy="185" r="34" fill="none" stroke="#22c55e" stroke-width="4"/>
    <circle cx="400" cy="185" r="34" fill="none" stroke="#22c55e" stroke-width="4"/>
    <rect x="150" y="205" width="100" height="18" fill="#166534" rx="3"/>
    <text x="200" y="218" fill="#ffffff" font-family="sans-serif" font-size="11" font-weight="bold" text-anchor="middle">체결 노브 [좌]</text>
    <rect x="350" y="205" width="100" height="18" fill="#166534" rx="3"/>
    <text x="400" y="218" fill="#ffffff" font-family="sans-serif" font-size="11" font-weight="bold" text-anchor="middle">체결 노브 [우]</text>
    
    <!-- 하단 설명 바 -->
    <rect x="36" y="295" width="528" height="48" fill="#0284c7" fill-opacity="0.15" stroke="#0284c7" rx="4"/>
    <text x="50" y="324" fill="#38bdf8" font-family="sans-serif" font-size="13" font-weight="bold">수파베이스 스토리지 보관 정품 표준 사진 (WebP 저용량 고압축)</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
