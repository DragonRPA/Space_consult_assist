/**
 * partsCatalogApi.ts
 * 부품 카탈로그 DB 연동 (Supabase PostgreSQL `parts_catalog` & `parts_orders` + 로컬 캐시 폴백)
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://eknwzjcbchbefdlykqgl.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_y7xsEQsIj_lFTYiHtYOr5Q_44z2fM-Z';

export const supabase = createClient(SUPABASE_URL || '', SUPABASE_KEY || '');

export interface CatalogPartItem {
  id: string;
  part_code: string;
  part_name: string;
  category: '스퀴지/고무' | '브러시/패드' | '호스/필터' | '배터리/전원' | '모터/밸브' | '세제/소모품' | string;
  applicable_models: string[];
  unit_price: number;
  spec: string;
  description: string;
  image_url: string;
  in_stock: boolean;
  lead_time_days: number;
  is_recommended: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CartItem {
  part: CatalogPartItem;
  quantity: number;
}

export interface PartsOrderRecord {
  order_id: string;
  doc_no: string;
  customer_name: string;
  manager: string;
  phone: string;
  site_company?: string;
  site_worker_name?: string;
  site_worker_phone?: string;
  primary_recipient: 'WORKER' | 'MANAGER';
  dispatch_channel: 'KAKAO' | 'SMS' | 'EMAIL';
  equipment_model: string;
  items: {
    part_code: string;
    part_name: string;
    unit_price: number;
    qty: number;
    total: number;
  }[];
  supply_total: number;
  shipping_fee: number;
  vat: number;
  grand_total: number;
  order_status?: string;
  shipping_address?: string;
  created_at?: string;
}

const LOCAL_CATALOG_KEY = 'space_parts_catalog_cache';
const LOCAL_ORDERS_KEY = 'space_parts_orders_cache';

// ── 1. 부품 카탈로그 전체 목록 조회 (Supabase DB + 캐시) ──
export async function getAllPartsCatalog(): Promise<CatalogPartItem[]> {
  try {
    const { data, error } = await supabase
      .from('parts_catalog')
      .select('*')
      .order('is_recommended', { ascending: false })
      .order('category', { ascending: true });

    if (!error && data && data.length > 0) {
      localStorage.setItem(LOCAL_CATALOG_KEY, JSON.stringify(data));
      return data as CatalogPartItem[];
    }
  } catch (err) {
    console.warn('[partsCatalogApi] Supabase fetch error, fallback to cache:', err);
  }

  // 2. 로컬 스토리지 캐시 폴백
  try {
    const raw = localStorage.getItem(LOCAL_CATALOG_KEY);
    if (raw) {
      return JSON.parse(raw) as CatalogPartItem[];
    }
  } catch {}

  // 3. 비상 시 기본 내장 시드 반환
  return getFallbackCatalog();
}

// ── 1-1. 부품 카탈로그 필터 조회 (모델 및 카테고리 필터링) ──
export async function getPartsCatalog(equipmentModel?: string, category?: string): Promise<CatalogPartItem[]> {
  const all = await getAllPartsCatalog();
  return all.filter(p => {
    const matchesModel = !equipmentModel || equipmentModel === '전체' || equipmentModel === 'ALL' || (p.applicable_models && p.applicable_models.includes(equipmentModel));
    const matchesCat = !category || category === '전체' || category === 'ALL' || p.category === category;
    return matchesModel && matchesCat;
  });
}

// ── 2. 부품 신규 등록 / 정보 수정 (DB 저장) ──
export async function saveCatalogPart(part: CatalogPartItem): Promise<CatalogPartItem> {
  const payload = {
    ...part,
    updated_at: new Date().toISOString()
  };

  try {
    const { data, error } = await supabase
      .from('parts_catalog')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single();

    if (!error && data) {
      updateLocalCache(data as CatalogPartItem);
      return data as CatalogPartItem;
    }
  } catch (err) {
    console.warn('[partsCatalogApi] Upsert failed:', err);
  }

  updateLocalCache(payload);
  return payload;
}

// ── 3. 온라인 쇼핑 주문서 제출 및 DB 저장 ──
export async function submitPartsOrder(order: PartsOrderRecord): Promise<{ success: boolean; orderId: string }> {
  const payload = {
    ...order,
    created_at: new Date().toISOString(),
    order_status: 'ORDER_RECEIVED'
  };

  try {
    const { error } = await supabase
      .from('parts_orders')
      .insert([payload]);

    if (error) {
      console.warn('[partsCatalogApi] Order DB insert error:', error);
    }
  } catch (err) {
    console.warn('[partsCatalogApi] Order remote exception:', err);
  }

  // 로컬 스토리지 무조건 보존
  try {
    const raw = localStorage.getItem(LOCAL_ORDERS_KEY);
    const list: PartsOrderRecord[] = raw ? JSON.parse(raw) : [];
    list.unshift(payload);
    localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(list));
  } catch {}

  return { success: true, orderId: order.order_id };
}

function updateLocalCache(part: CatalogPartItem) {
  try {
    const raw = localStorage.getItem(LOCAL_CATALOG_KEY);
    const list: CatalogPartItem[] = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex(p => p.id === part.id);
    if (idx >= 0) {
      list[idx] = part;
    } else {
      list.push(part);
    }
    localStorage.setItem(LOCAL_CATALOG_KEY, JSON.stringify(list));
  } catch {}
}

function getFallbackCatalog(model?: string, category?: string): CatalogPartItem[] {
  const defaults: CatalogPartItem[] = [
    {
      id: 'part-j600t-sqg-825',
      part_code: 'J600T-SQG-825',
      part_name: '825mm 내유성 라텍스 스퀴지 블레이드 세트 (앞/뒤)',
      category: '스퀴지/고무',
      applicable_models: ['J600T', 'S5'],
      unit_price: 45000,
      spec: '825mm 내마모 라텍스 고무 (4면 반전 가능)',
      description: '오일 및 세제 부식에 강한 최고급 라텍스 소재. 스퀴지 립 마모 시 4면 반전 장착으로 4회 재사용 가능.',
      image_url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="280"><rect width="400" height="280" fill="%231e293b"/><text x="200" y="140" fill="%23ffffff" font-size="14" text-anchor="middle">825mm 스퀴지 블레이드</text></svg>',
      in_stock: true,
      lead_time_days: 1,
      is_recommended: true
    },
    {
      id: 'part-j600t-brs-22',
      part_code: 'J600T-BRS-22',
      part_name: '22인치 고효율 바닥 세척 브러시 어셈블리',
      category: '브러시/패드',
      applicable_models: ['J600T', 'S7'],
      unit_price: 85000,
      spec: '560mm 나일론 0.6mm 직경 (155rpm)',
      description: '에폭시 및 아스타일 바닥 전용 고밀도 나일론 브러시.',
      image_url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="280"><rect width="400" height="280" fill="%231e293b"/><text x="200" y="140" fill="%23ffffff" font-size="14" text-anchor="middle">22인치 세척 브러시</text></svg>',
      in_stock: true,
      lead_time_days: 1,
      is_recommended: true
    }
  ];

  return defaults.filter(p => {
    const matchM = !model || model === 'ALL' || p.applicable_models.includes(model);
    const matchC = !category || category === 'ALL' || p.category === category;
    return matchM && matchC;
  });
}
