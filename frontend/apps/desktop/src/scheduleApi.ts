/**
 * scheduleApi.ts
 * 업무 일정 관리 API 클라이언트 (space-dust 캘린더 → 우리 FastAPI 이관)
 */

const BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';

export type Category =
  | 'sales-demo' | 'equip-ship' | 'part-ship'
  | 'rental-ship' | 'as-service' | 'purchase-check'
  | 'maintenance' | 'other';

export interface ScheduleEvent {
  id: string;
  category: Category;
  worktype?: string;
  use_company?: string;
  contract_company?: string;
  location?: string;
  site_managers?: string[];
  receive_staff?: string;
  receive_date?: string;
  process_staff?: string[];
  display_order: number;
  call_done: boolean;
  is_allday: boolean;
  is_done: boolean;
  is_important: boolean;
  start_at: string;
  end_at?: string;
  title?: string;
  equipment_rows?: EquipmentRow[];
  extra?: Record<string, unknown>;
  attachments?: Attachment[];
  consult_id?: string;
  visit_id?: string;
  customer_id?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface EquipmentRow {
  name: string;
  serial?: string;
  [key: string]: unknown;
}

export interface Attachment {
  url: string;
  type: 'image' | 'video' | 'file';
  name: string;
}

export interface CategoryMeta {
  key: Category;
  label: string;
  color: string;
}

export type ScheduleEventCreate = Omit<ScheduleEvent,
  'id' | 'created_at' | 'updated_at' | 'created_by'
> & { created_by_name?: string };

export type ScheduleEventUpdate = Partial<ScheduleEventCreate>;

// ─── 카테고리 ───────────────────────────────────────────────────────────────

export async function fetchCategories(): Promise<CategoryMeta[]> {
  const res = await fetch(`${BASE}/schedule/categories`);
  if (!res.ok) throw new Error('카테고리 조회 실패');
  return res.json();
}

// ─── 일정 CRUD ───────────────────────────────────────────────────────────────

export interface FetchEventsParams {
  start?: string;   // YYYY-MM-DD
  end?: string;     // YYYY-MM-DD
  category?: string; // 콤마 구분
  is_done?: boolean;
  limit?: number;
  offset?: number;
}

export async function fetchEvents(params: FetchEventsParams = {}): Promise<ScheduleEvent[]> {
  const q = new URLSearchParams();
  if (params.start)    q.set('start', params.start);
  if (params.end)      q.set('end', params.end);
  if (params.category) q.set('category', params.category);
  if (params.is_done !== undefined) q.set('is_done', String(params.is_done));
  if (params.limit)    q.set('limit', String(params.limit));
  if (params.offset)   q.set('offset', String(params.offset));
  const res = await fetch(`${BASE}/schedule/events?${q.toString()}`);
  if (!res.ok) throw new Error('일정 조회 실패');
  return res.json();
}

export async function fetchEvent(id: string): Promise<ScheduleEvent> {
  const res = await fetch(`${BASE}/schedule/events/${id}`);
  if (!res.ok) throw new Error('일정 조회 실패');
  return res.json();
}

export async function createEvent(data: ScheduleEventCreate): Promise<ScheduleEvent> {
  const res = await fetch(`${BASE}/schedule/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail || '일정 생성 실패');
  }
  return res.json();
}

export async function updateEvent(id: string, data: ScheduleEventUpdate): Promise<ScheduleEvent> {
  const res = await fetch(`${BASE}/schedule/events/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail || '일정 수정 실패');
  }
  return res.json();
}

export async function deleteEvent(id: string, deletedByName?: string): Promise<void> {
  const q = deletedByName ? `?deleted_by_name=${encodeURIComponent(deletedByName)}` : '';
  const res = await fetch(`${BASE}/schedule/events/${id}${q}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('일정 삭제 실패');
}

// ─── 이관센터 ────────────────────────────────────────────────────────────────

export interface TransferCenter { id: string; name: string; address?: string; }

export async function fetchTransferCenters(): Promise<TransferCenter[]> {
  const res = await fetch(`${BASE}/transfer-centers/`);
  if (!res.ok) throw new Error('이관센터 조회 실패');
  return res.json();
}
