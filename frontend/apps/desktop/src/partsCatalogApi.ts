/**
 * partsCatalogApi.ts
 * 부품 카탈로그 DB 연동 (Supabase PostgreSQL `parts_catalog` & `parts_orders` + 로컬 캐시 폴백)
 */

import { supabase } from './supabaseClient';
import { SPACE_DUST_OFFICIAL_CATALOG } from './spaceDustCatalogSeed';
import type { CatalogPartItem, CartItem, PartsOrderRecord } from './partsCatalogTypes';

export { supabase };
export type { CatalogPartItem, CartItem, PartsOrderRecord };

const LOCAL_CATALOG_KEY = 'space_parts_catalog_cache_v2';
const LOCAL_ORDERS_KEY = 'space_parts_orders_cache';

// ── 1. 부품 카탈로그 전체 목록 조회 (Supabase DB + 공식 72종 시드 병합) ──
export async function getAllPartsCatalog(): Promise<CatalogPartItem[]> {
  const seedList = getFallbackCatalog();
  try {
    const { data, error } = await supabase
      .from('space_parts_catalog')
      .select('*')
      .order('is_recommended', { ascending: false })
      .order('category', { ascending: true });

    if (!error && data && data.length > 0) {
      const dbList = data as CatalogPartItem[];
      const byCode = new Map<string, CatalogPartItem>();
      seedList.forEach(item => byCode.set(item.part_code, item));
      dbList.forEach(item => {
        const existing = byCode.get(item.part_code);
        byCode.set(item.part_code, {
          ...existing,
          ...item,
          image_url: item.image_url || existing?.image_url || '',
          applicable_models:
            Array.isArray(item.applicable_models) && item.applicable_models.length > 0
              ? item.applicable_models
              : existing?.applicable_models || ['전 기종 공용'],
        });
      });
      const merged = Array.from(byCode.values());
      localStorage.setItem(LOCAL_CATALOG_KEY, JSON.stringify(merged));
      return merged;
    }
  } catch (err) {
    console.warn('[partsCatalogApi] Supabase fetch error, fallback to seed:', err);
  }

  return seedList;
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
      .from('space_parts_catalog')
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
      .from('space_parts_orders')
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
  return SPACE_DUST_OFFICIAL_CATALOG.filter(p => {
    const matchM = !model || model === 'ALL' || model === '전체' || p.applicable_models.includes(model);
    const matchC = !category || category === 'ALL' || category === '전체' || p.category === category;
    return matchM && matchC;
  });
}
