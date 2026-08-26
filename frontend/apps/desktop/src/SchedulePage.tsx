/**
 * SchedulePage.tsx
 * 업무 일정 관리 — /schedule 라우트 메인 페이지
 *
 * space-dust 캘린더 UI를 우리 DESIGN.md 다크 테마 + Pretendard 폰트 + 전사 UI 표준에 맞게 이식.
 * - 월간/주간/일간 뷰 탭
 * - 사이드바: 미니 달력, 카테고리 필터
 * - 업무 등록/수정/상세보기 모달
 * - 완료 처리, 중요 토글
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Plus, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import {
  fetchEvents, fetchCategories, createEvent, updateEvent, deleteEvent, fetchEmployees,
  type ScheduleEvent, type CategoryMeta, type ScheduleEventCreate, type Employee
} from './scheduleApi';
import { EventFormModal } from './EventFormModal';
import { EventDetailModal } from './EventDetailModal';

// ─── 유틸 ────────────────────────────────────────────────────────────────────

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function startOfWeek(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  r.setDate(r.getDate() - r.getDay());
  return r;
}

// ─── 색상 맵 ─────────────────────────────────────────────────────────────────

const CAT_COLOR: Record<string, string> = {
  'sales-demo':     '#16a34a',
  'equip-ship':     '#0891b2',
  'part-ship':      '#2563eb',
  'rental-ship':    '#7c3aed',
  'as-service':     '#dc2626',
  'purchase-check': '#d97706',
  'maintenance':    '#0d9488',
  'other':          '#64748b',
};

// ─── 미니 캘린더 ──────────────────────────────────────────────────────────────

interface MiniCalProps {
  value: Date;
  selected: Date;
  onSelect: (d: Date) => void;
  eventsByDate: Record<string, ScheduleEvent[]>;
}

function MiniCal({ value, selected, onSelect, eventsByDate }: MiniCalProps) {
  const [cur, setCur] = useState(new Date(value.getFullYear(), value.getMonth(), 1));
  const today = new Date();

  const days: (Date | null)[] = useMemo(() => {
    const first = new Date(cur.getFullYear(), cur.getMonth(), 1);
    const last  = new Date(cur.getFullYear(), cur.getMonth() + 1, 0);
    const result: (Date | null)[] = [];
    for (let i = 0; i < first.getDay(); i++) result.push(null);
    for (let i = 1; i <= last.getDate(); i++) result.push(new Date(cur.getFullYear(), cur.getMonth(), i));
    return result;
  }, [cur]);

  return (
    <div style={{ border: '1px solid #23334d', borderRadius: 8, padding: 8, marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
        <button onClick={() => setCur(new Date(cur.getFullYear(), cur.getMonth() - 1, 1))}
          style={{ background: 'none', border: 'none', color: '#4b5563', cursor: 'pointer', fontSize: 15 }}>‹</button>
        <span style={{ color: '#111827' }}>{cur.getFullYear()}년 {cur.getMonth() + 1}월</span>
        <button onClick={() => setCur(new Date(cur.getFullYear(), cur.getMonth() + 1, 1))}
          style={{ background: 'none', border: 'none', color: '#4b5563', cursor: 'pointer', fontSize: 15 }}>›</button>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5, textAlign: 'center' }}>
        <thead>
          <tr>
            {['일','월','화','수','목','금','토'].map(d => (
              <th key={d} style={{ color: '#64748b', padding: '3px 0' }}>{d}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: Math.ceil(days.length / 7) }, (_, wi) => (
            <tr key={wi}>
              {days.slice(wi * 7, wi * 7 + 7).map((d, di) => {
                if (!d) return <td key={di} />;
                const isToday   = sameDay(d, today);
                const isSel     = sameDay(d, selected);
                const hasDots   = (eventsByDate[ymd(d)] ?? []).length > 0;
                const col       = di === 0 ? '#ef4444' : di === 6 ? '#60a5fa' : '#4b5563';
                return (
                  <td key={di}
                    onClick={() => onSelect(d)}
                    style={{
                      cursor: 'pointer', borderRadius: '50%', padding: '3px 0',
                      background: isSel ? '#2563eb' : isToday ? '#ffffff' : 'transparent',
                      color: isSel ? '#fff' : isToday ? '#2563eb' : col,
                      fontWeight: (isToday || isSel) ? 700 : 400,
                      position: 'relative',
                    }}>
                    {d.getDate()}
                    {hasDots && !isSel && (
                      <span style={{
                        display: 'block', width: 4, height: 4, borderRadius: '50%',
                        background: '#2563eb', margin: '1px auto 0',
                      }} />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── 이벤트 바 ───────────────────────────────────────────────────────────────

interface EventBarProps {
  ev: ScheduleEvent;
  cats: CategoryMeta[];
  onClick: () => void;
}

function EventBar({ ev, cats, onClick }: EventBarProps) {
  const cat = cats.find(c => c.key === ev.category);
  const color = cat?.color ?? CAT_COLOR[ev.category] ?? '#555';
  return (
    <div
      onClick={e => { e.stopPropagation(); onClick(); }}
      title={ev.title || cat?.label || ''}
      style={{
        fontSize: 11.5, padding: '2px 5px', borderRadius: 4,
        borderLeft: `3px solid ${color}`,
        background: `${color}22`,
        color: ev.is_done ? '#64748b' : '#111827',
        textDecoration: ev.is_done ? 'line-through' : 'none',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        cursor: 'pointer', marginBottom: 2,
        opacity: ev.is_done ? 0.6 : 1,
      }}>
      {ev.is_important && <span style={{ color: '#f59e0b', marginRight: 3 }}>★</span>}
      {ev.title || cat?.label || ev.category}
    </div>
  );
}

// ─── 월간 뷰 ─────────────────────────────────────────────────────────────────

interface MonthViewProps {
  baseDate: Date;
  events: ScheduleEvent[];
  cats: CategoryMeta[];
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  onClickEvent: (ev: ScheduleEvent) => void;
}

function MonthView({ baseDate, events, cats, selectedDate, onSelectDate, onClickEvent }: MonthViewProps) {
  const today = new Date();
  const first = startOfMonth(baseDate);
  const last  = endOfMonth(baseDate);
  const startPad = first.getDay();

  const cells: Date[] = [];
  for (let i = 0; i < startPad; i++) cells.push(addDays(first, -startPad + i));
  for (let d = new Date(first); d <= last; d = addDays(d, 1)) cells.push(new Date(d));
  while (cells.length % 7 !== 0) cells.push(addDays(cells[cells.length - 1], 1));

  const eventsByDate = useMemo(() => {
    const map: Record<string, ScheduleEvent[]> = {};
    events.forEach(ev => {
      const k = ev.start_at.slice(0, 10);
      if (!map[k]) map[k] = [];
      map[k].push(ev);
    });
    return map;
  }, [events]);

  const DOW = ['일','월','화','수','목','금','토'];

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
      background: '#ffffff', border: '1px solid #23334d', borderRadius: 10, overflow: 'hidden',
    }}>
      {DOW.map((d, i) => (
        <div key={d} style={{
          textAlign: 'center', fontSize: 12, fontWeight: 700,
          color: i === 0 ? '#ef4444' : i === 6 ? '#60a5fa' : '#64748b',
          padding: '9px 0', background: '#ffffff', borderBottom: '1px solid #23334d',
        }}>{d}</div>
      ))}
      {cells.map((cell, idx) => {
        const isCurrentMonth = cell.getMonth() === baseDate.getMonth();
        const isToday   = sameDay(cell, today);
        const isSel     = sameDay(cell, selectedDate);
        const dayEvs    = eventsByDate[ymd(cell)] ?? [];
        const dow       = idx % 7;
        return (
          <div
            key={idx}
            onClick={() => onSelectDate(cell)}
            style={{
              minHeight: 100, padding: 6, cursor: 'pointer',
              borderRight: (idx + 1) % 7 === 0 ? 'none' : '1px solid #23334d',
              borderBottom: '1px solid #23334d',
              background: isToday ? '#ffffff' : 'transparent',
              opacity: isCurrentMonth ? 1 : 0.35,
            }}>
            <div style={{
              fontSize: 12.5, fontWeight: 700, marginBottom: 4,
              color: isToday
                ? '#2563eb'
                : dow === 0 ? '#ef4444' : dow === 6 ? '#60a5fa' : '#64748b',
              ...(isSel ? {
                background: '#2563eb', color: '#fff', borderRadius: '50%',
                width: 22, height: 22, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 11,
              } : {}),
            }}>
              {cell.getDate()}
            </div>
            <div>
              {dayEvs.slice(0, 3).map(ev => (
                <EventBar key={ev.id} ev={ev} cats={cats} onClick={() => onClickEvent(ev)} />
              ))}
              {dayEvs.length > 3 && (
                <div style={{ fontSize: 11, color: '#64748b', cursor: 'pointer' }}>
                  +{dayEvs.length - 3}건 더
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── 일간 뷰 ─────────────────────────────────────────────────────────────────

interface DayViewProps {
  date: Date;
  events: ScheduleEvent[];
  cats: CategoryMeta[];
  onClickEvent: (ev: ScheduleEvent) => void;
  onNewEvent: () => void;
}

function DayView({ date, events, cats, onClickEvent, onNewEvent }: DayViewProps) {
  const dayEvs = events.filter(ev => ev.start_at.slice(0, 10) === ymd(date));
  const today = new Date();
  const isToday = sameDay(date, today);

  return (
    <div style={{ background: '#ffffff', border: '1px solid #23334d', borderRadius: 10, minHeight: 400, padding: 16 }}>
      <div style={{ fontWeight: 700, fontSize: 15, color: isToday ? '#2563eb' : '#111827', marginBottom: 14 }}>
        {date.getFullYear()}년 {date.getMonth() + 1}월 {date.getDate()}일
        {isToday && <span style={{ marginLeft: 8, fontSize: 11, background: '#2563eb22', color: '#2563eb', borderRadius: 4, padding: '2px 7px' }}>오늘</span>}
      </div>
      {dayEvs.length === 0 ? (
        <div style={{ color: '#64748b', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>
          등록된 일정이 없습니다.
          <br />
          <button onClick={onNewEvent} style={{ marginTop: 12, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 7, padding: '8px 16px', cursor: 'pointer', fontSize: 13 }}>
            + 업무 등록
          </button>
        </div>
      ) : (
        dayEvs
          .sort((a, b) => a.display_order - b.display_order || a.start_at.localeCompare(b.start_at))
          .map(ev => {
            const cat = cats.find(c => c.key === ev.category);
            const color = cat?.color ?? CAT_COLOR[ev.category] ?? '#555';
            return (
              <div key={ev.id} onClick={() => onClickEvent(ev)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: '10px 4px', borderBottom: '1px solid #23334d',
                  cursor: 'pointer',
                }}>
                <div style={{ flex: '0 0 52px', fontSize: 12, color: '#64748b', paddingTop: 2 }}>
                  {ev.is_allday ? '종일' : ev.start_at.slice(11, 16)}
                </div>
                <div style={{ width: 3, borderRadius: 2, background: color, alignSelf: 'stretch', minHeight: 20, flex: 'none' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 14, color: ev.is_done ? '#64748b' : '#111827',
                    textDecoration: ev.is_done ? 'line-through' : 'none',
                  }}>
                    {ev.is_important && <span style={{ color: '#f59e0b', marginRight: 4 }}>★</span>}
                    {ev.title || cat?.label || ev.category}
                    {ev.call_done && <span style={{ marginLeft: 6, fontSize: 11, color: '#10b981' }}>T</span>}
                  </div>
                  {ev.contract_company && (
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                      {ev.contract_company}{ev.use_company && ev.use_company !== ev.contract_company ? ` (사용: ${ev.use_company})` : ''}
                    </div>
                  )}
                  {ev.location && <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>{ev.location}</div>}
                </div>
              </div>
            );
          })
      )}
    </div>
  );
}

// ─── 목록 뷰 ─────────────────────────────────────────────────────────────────

interface ListViewProps {
  events: ScheduleEvent[];
  cats: CategoryMeta[];
  onClickEvent: (ev: ScheduleEvent) => void;
}

function ListView({ events, cats, onClickEvent }: ListViewProps) {
  // 그룹화 및 정렬
  const grouped = useMemo(() => {
    const map: Record<string, ScheduleEvent[]> = {};
    events.forEach(ev => {
      const k = ev.start_at.slice(0, 10);
      if (!map[k]) map[k] = [];
      map[k].push(ev);
    });
    // 날짜 오름차순 정렬
    const sortedKeys = Object.keys(map).sort();
    return sortedKeys.map(date => ({
      date,
      events: map[date].sort((a, b) => a.display_order - b.display_order || a.start_at.localeCompare(b.start_at))
    }));
  }, [events]);

  const DOW = ['일','월','화','수','목','금','토'];
  
  if (grouped.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280', background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb' }}>
        표시할 일정이 없습니다.
      </div>
    );
  }

  return (
    <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '16px 24px', overflowY: 'auto', minHeight: 400 }}>
      {grouped.map(({ date, events: dayEvs }) => {
        const dObj = new Date(date);
        const dateLabel = `${date.replace(/-/g, '.')} (${DOW[dObj.getDay()]})`;
        return (
          <div key={date} style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#4b5563', marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid #f3f4f6' }}>
              {dateLabel}
            </div>
            <div>
              {dayEvs.map(ev => {
                const cat = cats.find(c => c.key === ev.category);
                const color = cat?.color ?? CAT_COLOR[ev.category] ?? '#555';
                return (
                  <div key={ev.id} onClick={() => onClickEvent(ev)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0',
                      cursor: 'pointer', borderBottom: '1px dashed #f3f4f6'
                    }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <div style={{ flex: '0 0 40px', fontSize: 13, color: '#6b7280' }}>
                      {ev.is_allday ? '종일' : ev.start_at.slice(11, 16)}
                    </div>
                    <div style={{
                      flex: 1, fontSize: 14, color: ev.is_done ? '#9ca3af' : '#111827',
                      textDecoration: ev.is_done ? 'line-through' : 'none'
                    }}>
                      {ev.is_important && <span style={{ color: '#f59e0b', marginRight: 4 }}>★</span>}
                      {ev.title || cat?.label || ev.category}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── 메인 페이지 ─────────────────────────────────────────────────────────────

export default function SchedulePage() {
  const [view, setView] = useState<'month' | 'week' | 'day' | 'list'>('month');
  const [baseDate, setBaseDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [cats, setCats] = useState<CategoryMeta[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 필터
  const [catFilter, setCatFilter] = useState<Record<string, boolean>>({});
  const [selectedEmp, setSelectedEmp] = useState<string>('all'); // 담당자 전체
  
  // 일정검색
  const [searchDate, setSearchDate] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');

  // 모달 상태
  const [formOpen, setFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null);
  const [detailEvent, setDetailEvent] = useState<ScheduleEvent | null>(null);
  const [defaultDate, setDefaultDate] = useState<string | undefined>(undefined);

  // ─ 초기 데이터 로드 (카테고리, 임직원)
  useEffect(() => {
    fetchCategories().then(cs => {
      setCats(cs);
      const initial: Record<string, boolean> = {};
      cs.forEach(c => { initial[c.key] = true; });
      setCatFilter(initial);
    }).catch(() => {});

    fetchEmployees().then(emps => {
      setEmployees(emps);
    }).catch(() => {});
  }, []);

  // ─ 일정 로드 (뷰/날짜 변경 시)
  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let start: string, end: string;
      if (view === 'month' || view === 'list') {
        const sm = startOfMonth(baseDate);
        const em = endOfMonth(baseDate);
        start = ymd(addDays(sm, -sm.getDay()));
        const em2 = addDays(em, 6 - em.getDay());
        end = ymd(em2);
      } else if (view === 'week') {
        const sw = startOfWeek(baseDate);
        start = ymd(sw);
        end = ymd(addDays(sw, 6));
      } else {
        start = ymd(selectedDate);
        end = ymd(selectedDate);
      }
      const data = await fetchEvents({ start, end, limit: 1000 });
      setEvents(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [view, baseDate, selectedDate]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  // ─ 필터된 이벤트
  const filteredEvents = useMemo(() =>
    events.filter(ev => {
      // 1. 카테고리 필터
      if (catFilter[ev.category] === false) return false;
      
      // 2. 담당자 필터
      if (selectedEmp !== 'all') {
        const pStaff = ev.process_staff || [];
        const rStaff = ev.receive_staff || '';
        const sMng = ev.site_managers || [];
        // 처리직원, 접수직원, 현장담당자 중 하나라도 포함되면 표시
        const hasEmp = pStaff.includes(selectedEmp) || rStaff === selectedEmp || sMng.some(s => s.includes(selectedEmp));
        if (!hasEmp) return false;
      }
      
      // 3. 날짜 검색 필터 (연-월-일)
      if (searchDate) {
        if (!ev.start_at.includes(searchDate)) return false;
      }
      
      // 4. 키워드 검색 필터 (제목/장소/거래처 등)
      if (searchKeyword) {
        const kw = searchKeyword.toLowerCase();
        const textToSearch = [
          ev.title, ev.location, ev.use_company, ev.contract_company,
          ev.worktype, ev.category
        ].filter(Boolean).join(' ').toLowerCase();
        if (!textToSearch.includes(kw)) return false;
      }

      return true;
    }),
    [events, catFilter, selectedEmp, searchDate, searchKeyword]
  );

  // ─ 이벤트 저장
  async function handleSave(data: ScheduleEventCreate) {
    try {
      if (editingEvent) {
        await updateEvent(editingEvent.id, data);
      } else {
        await createEvent(data);
      }
      setFormOpen(false);
      setEditingEvent(null);
      await loadEvents();
    } catch (e) {
      alert((e as Error).message);
    }
  }

  // ─ 이벤트 삭제
  async function handleDelete(ev: ScheduleEvent) {
    if (!confirm(`"${ev.title || '이 일정'}"을 삭제하시겠습니까?`)) return;
    try {
      await deleteEvent(ev.id);
      setDetailEvent(null);
      await loadEvents();
    } catch (e) {
      alert((e as Error).message);
    }
  }

  // ─ 완료 처리
  async function handleToggleDone(ev: ScheduleEvent) {
    try {
      await updateEvent(ev.id, { is_done: !ev.is_done });
      await loadEvents();
      setDetailEvent(null);
    } catch (e) {
      alert((e as Error).message);
    }
  }

  // ─ 네비게이션
  function navigate(dir: 1 | -1) {
    const d = new Date(baseDate);
    if (view === 'month')      d.setMonth(d.getMonth() + dir);
    else if (view === 'week')  d.setDate(d.getDate() + dir * 7);
    else                       d.setDate(d.getDate() + dir);
    setBaseDate(d);
    setSelectedDate(d);
  }

  function handleSelectDate(d: Date) {
    setSelectedDate(d);
    setBaseDate(d);
    if (view === 'month') setView('day');
  }

  // ─ eventsByDate (미니캘 용)
  const eventsByDate = useMemo(() => {
    const map: Record<string, ScheduleEvent[]> = {};
    filteredEvents.forEach(ev => {
      const k = ev.start_at.slice(0, 10);
      if (!map[k]) map[k] = [];
      map[k].push(ev);
    });
    return map;
  }, [filteredEvents]);

  // ─ 현재 기간 헤더 문자열
  const periodLabel = useMemo(() => {
    if (view === 'month') return `${baseDate.getFullYear()}년 ${baseDate.getMonth() + 1}월`;
    if (view === 'week') {
      const sw = startOfWeek(baseDate);
      const ew = addDays(sw, 6);
      return `${sw.getFullYear()}년 ${sw.getMonth()+1}월 ${sw.getDate()}일 — ${ew.getMonth()+1}월 ${ew.getDate()}일`;
    }
    return `${selectedDate.getFullYear()}년 ${selectedDate.getMonth()+1}월 ${selectedDate.getDate()}일`;
  }, [view, baseDate, selectedDate]);

  // ─── 렌더 ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f9fafb', color: '#111827', fontFamily: "Pretendard, -apple-system, sans-serif", overflow: 'hidden' }}>
      
      {/* 모방용 상단 헤더 */}
      <header style={{ height: '48px', background: '#6366f1', display: 'flex', alignItems: 'center', padding: '0 20px', color: '#fff', flexShrink: 0, gap: '10px' }}>
        <div style={{ fontWeight: 900, fontSize: '18px', fontStyle: 'italic', letterSpacing: '-0.5px' }}>SPACE</div>
        <div style={{ fontSize: '14px', fontWeight: 600 }}>(주)스페이스 업무캘린더</div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '12px' }}>
          <button style={{ background: '#ffffff', color: '#6366f1', border: 'none', padding: '4px 10px', borderRadius: '12px', fontWeight: 600, cursor: 'pointer' }}>
            내 Google 계정 연결
          </button>
          <button style={{ background: 'transparent', color: '#fff', border: '1px solid #fff', padding: '4px 10px', borderRadius: '12px', cursor: 'pointer' }}>
            비밀번호 변경
          </button>
          <span style={{ marginLeft: '10px' }}>관리자님으로 로그인 중</span>
        </div>
      </header>

      {/* 경고바 (옵션) */}
      <div style={{ background: '#fef3c7', color: '#d97706', fontSize: '12px', padding: '8px', textAlign: 'center', fontWeight: 600 }}>
        ⚠️ Google Drive 연동은 현재 Space Advisor 내부 스토리지로 전환되었습니다. 첨부파일은 정상 작동합니다.
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* 사이드바 */}
        <aside style={{ width: 250, flexShrink: 0, background: '#ffffff', borderRight: '1px solid #e5e7eb', padding: 16, overflowY: 'auto' }}>
        {/* 등록 버튼 */}
        <button
          onClick={() => { setEditingEvent(null); setDefaultDate(ymd(selectedDate)); setFormOpen(true); }}
          style={{
            width: '100%', marginBottom: 8, background: '#2563eb', color: '#fff', border: 'none',
            padding: '10px 14px', borderRadius: 7, fontWeight: 600, fontSize: 13.5, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
          <Plus size={16} /> 업무 등록
        </button>

        {/* 관제 복귀 버튼 */}
        <button
          onClick={() => window.location.href = '/'}
          style={{
            width: '100%', marginBottom: 14, background: '#ffffff', color: '#4b5563', border: '1px solid #334155',
            padding: '8px 14px', borderRadius: 7, fontWeight: 600, fontSize: 13, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
          <span style={{ transform: 'scaleX(-1)' }}>↗</span> 상담 관제로 복귀
        </button>

        {/* 미니 캘린더 */}
        <MiniCal
          value={baseDate}
          selected={selectedDate}
          onSelect={handleSelectDate}
          eventsByDate={eventsByDate}
        />

        {/* 일정 검색 (Image 모방) */}
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px', marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#4b5563', marginBottom: 8 }}>
            일정검색
          </div>
          <input
            type="text"
            placeholder="연-월-일"
            value={searchDate}
            onChange={e => setSearchDate(e.target.value)}
            style={{
              width: '100%', padding: '6px 10px', fontSize: 13, border: '1px solid #d1d5db', borderRadius: 6,
              marginBottom: 6, outline: 'none', color: '#111827'
            }}
          />
          <input
            type="text"
            placeholder="제목/장소/거래처 등"
            value={searchKeyword}
            onChange={e => setSearchKeyword(e.target.value)}
            style={{
              width: '100%', padding: '6px 10px', fontSize: 13, border: '1px solid #d1d5db', borderRadius: 6,
              outline: 'none', color: '#111827'
            }}
          />
        </div>

        {/* 카테고리 필터 */}
        <div>
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>카테고리</span>
            <label style={{ fontWeight: 400, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
              <input type="checkbox"
                checked={Object.values(catFilter).every(Boolean)}
                onChange={e => {
                  const next: Record<string, boolean> = {};
                  cats.forEach(c => { next[c.key] = e.target.checked; });
                  setCatFilter(next);
                }} />
              전체
            </label>
          </div>
          {cats.map(c => (
            <label key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 2px', fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              <input type="checkbox"
                checked={catFilter[c.key] !== false}
                onChange={e => setCatFilter(prev => ({ ...prev, [c.key]: e.target.checked }))} />
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: c.color, display: 'inline-block', flexShrink: 0 }} />
              <span style={{ color: '#111827' }}>{c.label}</span>
            </label>
          ))}
        </div>
      </aside>

      {/* 메인 패널 */}
      <main style={{ flex: 1, overflow: 'auto', padding: '18px 20px' }}>
        {/* 툴바 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => { const d = new Date(); setBaseDate(d); setSelectedDate(d); }}
              style={{ background: '#ffffff', border: '1px solid #d1d5db', borderRadius: 6, padding: '6px 12px', fontSize: 13, color: '#4b5563', cursor: 'pointer' }}>
              오늘
            </button>
            <button onClick={() => navigate(-1)}
              style={{ background: '#ffffff', border: '1px solid #d1d5db', borderRadius: 6, padding: '6px 11px', color: '#4b5563', cursor: 'pointer' }}>
              <ChevronLeft size={14} />
            </button>
            <button onClick={() => navigate(1)}
              style={{ background: '#ffffff', border: '1px solid #d1d5db', borderRadius: 6, padding: '6px 11px', color: '#4b5563', cursor: 'pointer' }}>
              <ChevronRight size={14} />
            </button>
            <h2 style={{ margin: '0 0 0 6px', fontSize: 18, color: '#111827' }}>{periodLabel}</h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {loading && <RotateCcw size={14} style={{ color: '#64748b', animation: 'spin 1s linear infinite' }} />}
            
            {/* 담당자 필터 (Image 모방) */}
            <select
              value={selectedEmp}
              onChange={e => setSelectedEmp(e.target.value)}
              style={{
                background: '#ffffff', border: '1px solid #d1d5db', color: '#111827',
                padding: '6px 28px 6px 12px', borderRadius: 20, fontSize: 13, fontWeight: 500,
                outline: 'none', cursor: 'pointer', appearance: 'none',
                backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23111827\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'/%3E%3C/svg%3E")',
                backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center'
              }}
            >
              <option value="all">담당자 전체</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.name}>{emp.name}</option>
              ))}
            </select>

            {/* 뷰 전환 탭 */}
            <div style={{ display: 'flex', gap: 4 }}>
              {(['day', 'week', 'month', 'list'] as const).map(v => (
                <button key={v} onClick={() => setView(v)}
                  style={{
                    border: view === v ? '1px solid #2563eb' : '1px solid #d1d5db',
                    padding: '6px 12px', borderRadius: 20, fontSize: 13, cursor: 'pointer', fontWeight: 500,
                    background: view === v ? '#2563eb' : '#ffffff',
                    color: view === v ? '#ffffff' : '#4b5563',
                  }}>
                  {v === 'day' ? '일간' : v === 'week' ? '주간' : v === 'month' ? '월간' : '목록'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 오류 */}
        {error && (
          <div style={{ background: '#ef444422', border: '1px solid #ef4444', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#ef4444', marginBottom: 12 }}>
            {error}
          </div>
        )}

        {/* 뷰 본문 */}
        {view === 'month' && (
          <MonthView
            baseDate={baseDate}
            events={filteredEvents}
            cats={cats}
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
            onClickEvent={setDetailEvent}
          />
        )}
        {view === 'day' && (
          <DayView
            date={selectedDate}
            events={filteredEvents}
            cats={cats}
            onClickEvent={setDetailEvent}
            onNewEvent={() => { setEditingEvent(null); setDefaultDate(ymd(selectedDate)); setFormOpen(true); }}
          />
        )}
        {view === 'week' && (
          // 주간 뷰: 7열 그리드 (간소화 — 일간 뷰 7개 나열)
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {Array.from({ length: 7 }, (_, i) => {
              const d = addDays(startOfWeek(baseDate), i);
              const dayEvs = filteredEvents.filter(ev => ev.start_at.slice(0, 10) === ymd(d));
              const isToday = sameDay(d, new Date());
              const dow = i;
              return (
                <div key={i} style={{ background: '#ffffff', border: '1px solid #d1d5db', borderRadius: 8, padding: 6, minHeight: 300 }}>
                  <div style={{
                    textAlign: 'center', fontSize: 12, fontWeight: 700, marginBottom: 6,
                    color: isToday ? '#2563eb' : dow === 0 ? '#ef4444' : dow === 6 ? '#60a5fa' : '#4b5563',
                  }}>
                    {['일','월','화','수','목','금','토'][i]}<br />
                    <span style={{ fontSize: 11 }}>{d.getDate()}</span>
                  </div>
                  {dayEvs.map(ev => (
                    <EventBar key={ev.id} ev={ev} cats={cats} onClick={() => setDetailEvent(ev)} />
                  ))}
                </div>
              );
            })}
          </div>
        )}
        {view === 'list' && (
          <ListView
            events={filteredEvents}
            cats={cats}
            onClickEvent={setDetailEvent}
          />
        )}
      </main>

      {/* 업무 등록/수정 모달 */}
      {formOpen && (
        <EventFormModal
          event={editingEvent}
          defaultDate={defaultDate}
          cats={cats}
          onSave={handleSave}
          onClose={() => { setFormOpen(false); setEditingEvent(null); }}
        />
      )}

      {/* 상세보기 모달 */}
      {detailEvent && (
        <EventDetailModal
          event={detailEvent}
          cats={cats}
          onClose={() => setDetailEvent(null)}
          onEdit={() => { setEditingEvent(detailEvent); setDetailEvent(null); setFormOpen(true); }}
          onDelete={() => handleDelete(detailEvent)}
          onToggleDone={() => handleToggleDone(detailEvent)}
        />
      )}

      </div> {/* End flex row */}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
