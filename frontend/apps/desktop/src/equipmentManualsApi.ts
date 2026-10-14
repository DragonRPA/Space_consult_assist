/**
 * equipmentManualsApi.ts
 * 공식 제품 매뉴얼 및 카탈로그 DB 연동 (Supabase PostgreSQL `equipment_manuals` + `equipment_manual_dispatches` + 로컬 폴백)
 */

import { supabase } from './partsCatalogApi';
import { SPACE_DUST_OFFICIAL_MANUALS, type EquipmentManualItem } from './spaceDustManualsSeed';

export type { EquipmentManualItem };

export interface ManualDispatchRecord {
  dispatch_id: string;
  doc_no: string;
  customer_name: string;
  manager: string;
  phone: string;
  email?: string;
  site_company?: string;
  site_worker_name?: string;
  site_worker_phone?: string;
  primary_recipient: 'WORKER' | 'MANAGER' | 'BOTH';
  dispatch_channel: 'KAKAO' | 'SMS' | 'EMAIL';
  recipient_contact: string;
  equipment_model: string;
  serial_number?: string;
  symptoms: string[];
  attached_manuals: {
    id: string;
    manual_code: string;
    title: string;
    file_name: string;
    file_size_label: string;
    file_url: string;
  }[];
  message_note?: string;
  created_at: string;
}

const LOCAL_MANUALS_KEY = 'space_equipment_manuals_cache_v1';
const LOCAL_DISPATCHES_KEY = 'space_manual_dispatches_v1';

export async function fetchEquipmentManuals(): Promise<EquipmentManualItem[]> {
  try {
    const { data, error } = await supabase
      .from('equipment_manuals')
      .select('*')
      .order('wr_id', { ascending: false });

    if (!error && data && data.length > 0) {
      localStorage.setItem(LOCAL_MANUALS_KEY, JSON.stringify(data));
      return data as EquipmentManualItem[];
    }
  } catch {
    // Fallback to local cache / official seed
  }

  try {
    const raw = localStorage.getItem(LOCAL_MANUALS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }

  localStorage.setItem(LOCAL_MANUALS_KEY, JSON.stringify(SPACE_DUST_OFFICIAL_MANUALS));
  return SPACE_DUST_OFFICIAL_MANUALS;
}

export async function saveManualDispatchRecord(record: ManualDispatchRecord): Promise<void> {
  try {
    const raw = localStorage.getItem(LOCAL_DISPATCHES_KEY);
    const list: ManualDispatchRecord[] = raw ? JSON.parse(raw) : [];
    const next = [record, ...list.filter(r => r.dispatch_id !== record.dispatch_id)];
    localStorage.setItem(LOCAL_DISPATCHES_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

export function getSavedManualDispatches(): ManualDispatchRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_DISPATCHES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * 상담 중인 장비 모델명에 따라 가장 적합한 공식 매뉴얼을 자동 추천합니다.
 */
export function findRecommendedManualsForModel(
  manuals: EquipmentManualItem[],
  equipmentModel: string
): EquipmentManualItem[] {
  if (!equipmentModel) return [];
  const norm = equipmentModel.trim().toLowerCase();

  // 1. 정확히 해당 기종의 사용설명서(매뉴얼) 매칭
  const exactManuals = manuals.filter(m => {
    if (m.category !== '사용설명서(매뉴얼)') return false;
    return m.applicable_models.some(am => am.toLowerCase() === norm || norm.includes(am.toLowerCase()));
  });

  if (exactManuals.length > 0) {
    return exactManuals;
  }

  // 2. 카탈로그 또는 부분 일치 매칭
  return manuals.filter(m =>
    m.applicable_models.some(
      am => am !== '전 기종 공용' && (am.toLowerCase() === norm || norm.includes(am.toLowerCase()))
    )
  );
}
