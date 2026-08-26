/**
 * scheduleApi.ts
 * 업무 일정 관리 API 클라이언트 (Serverless - Supabase Direct 연동)
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://eknwzjcbchbefdlykqgl.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_y7xsEQsIj_lFTYiHtYOr5Q_44z2fM-Z';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env");
}

export const supabase = createClient(SUPABASE_URL || '', SUPABASE_KEY || '');

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

export type ScheduleEventCreate = Omit<ScheduleEvent, 'id' | 'created_at' | 'updated_at' | 'created_by'> & { created_by_name?: string };
export type ScheduleEventUpdate = Partial<ScheduleEventCreate>;

// ─── 카테고리 ───────────────────────────────────────────────────────────────

const STATIC_CATEGORIES: CategoryMeta[] = [
    { key: "sales-demo", label: "영업시연", color: "#8b5cf6" },
    { key: "equip-ship", label: "장비출고", color: "#3b82f6" },
    { key: "part-ship", label: "부품출고", color: "#2563eb" },
    { key: "rental-ship", label: "렌탈출고", color: "#0ea5e9" },
    { key: "as-service", label: "A/S접수", color: "#ef4444" },
    { key: "purchase-check", label: "매입실사", color: "#f59e0b" },
    { key: "maintenance", label: "유지보수", color: "#10b981" },
    { key: "other", label: "기타", color: "#64748b" }
];

export async function fetchCategories(): Promise<CategoryMeta[]> {
  return STATIC_CATEGORIES;
}

// ─── 일정 CRUD ───────────────────────────────────────────────────────────────

export interface FetchEventsParams {
  start?: string;
  end?: string;
  category?: string;
  is_done?: boolean;
  limit?: number;
  offset?: number;
}

export async function fetchEvents(params: FetchEventsParams = {}): Promise<ScheduleEvent[]> {
  let query = supabase.from('schedule_events').select('*');

  if (params.start) {
    query = query.gte('start_at', params.start);
  }
  if (params.end) {
    // start_at <= end+1day or something similar.
    query = query.lte('start_at', params.end + 'T23:59:59');
  }
  if (params.category) {
    const cats = params.category.split(',');
    query = query.in('category', cats);
  }
  if (params.is_done !== undefined) {
    query = query.eq('is_done', params.is_done);
  }
  
  // order by start_at
  query = query.order('start_at', { ascending: true });

  if (params.limit) {
    query = query.limit(params.limit);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  
  return data as ScheduleEvent[];
}

export async function fetchEvent(id: string): Promise<ScheduleEvent> {
  const { data, error } = await supabase.from('schedule_events').select('*').eq('id', id).single();
  if (error) throw new Error(error.message);
  return data as ScheduleEvent;
}

export async function createEvent(data: ScheduleEventCreate): Promise<ScheduleEvent> {
  const { data: created, error } = await supabase.from('schedule_events').insert([data]).select().single();
  if (error) throw new Error(error.message);
  return created as ScheduleEvent;
}

export async function updateEvent(id: string, data: ScheduleEventUpdate): Promise<ScheduleEvent> {
  const { data: updated, error } = await supabase.from('schedule_events').update(data).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return updated as ScheduleEvent;
}

export async function deleteEvent(id: string, _deletedByName?: string): Promise<void> {
  const { error } = await supabase.from('schedule_events').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ─── 이관센터 ────────────────────────────────────────────────────────────────

export interface TransferCenter { id: string; name: string; address?: string; }

export async function fetchTransferCenters(): Promise<TransferCenter[]> {
  const { data, error } = await supabase.from('transfer_centers').select('*');
  if (error) throw new Error(error.message);
  return data as TransferCenter[];
}

// ─── 임직원 ──────────────────────────────────────────────────────────────────

export interface Employee {
  id: string;
  name: string;
  role: string;
  active: boolean;
}

export async function fetchEmployees(): Promise<Employee[]> {
  const { data, error } = await supabase.from('employees').select('*').eq('is_active', true).order('display_order');
  if (error) throw new Error(error.message);
  return data as Employee[];
}

