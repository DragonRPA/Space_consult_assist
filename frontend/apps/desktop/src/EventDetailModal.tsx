/**
 * EventDetailModal.tsx
 * 업무 상세보기 모달
 */

import { X, Edit3, Trash2, CheckCircle2, Circle } from 'lucide-react';
import type { ScheduleEvent, CategoryMeta } from './scheduleApi';
import { CATEGORY_SCHEMAS, getAllFields } from './CategorySchema';

interface Props {
  event: ScheduleEvent;
  cats: CategoryMeta[];
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleDone: () => void;
}

const OVERLAY: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)',
  display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
  zIndex: 1000, overflowY: 'auto', padding: '40px 16px',
};

const MODAL: React.CSSProperties = {
  background: '#1e293b', borderRadius: 12, width: '100%', maxWidth: 560,
  boxShadow: '0 20px 50px rgba(0,0,0,.4)', color: '#f8fafc',
  fontFamily: "Pretendard, -apple-system, sans-serif",
};

const D_ROW: React.CSSProperties = {
  display: 'flex', gap: 14, padding: '8px 0', borderBottom: '1px solid #23334d', fontSize: 13,
};

const D_LABEL: React.CSSProperties = { flex: '0 0 120px', color: '#64748b', fontWeight: 600 };
const D_VALUE: React.CSSProperties = { flex: 1, color: '#f8fafc', whiteSpace: 'pre-wrap', wordBreak: 'break-word' };

function formatFieldValue(val: unknown, type: string): string {
  if (val === undefined || val === null || val === '') return '';
  switch (type) {
    case 'toggle': return val ? '예' : '아니오';
    case 'chips': {
      const v = val as { selected?: string[] };
      return (v.selected ?? []).join(', ');
    }
    case 'photostatus': {
      const v = val as Record<string, boolean>;
      return Object.entries(v)
        .filter(([k]) => !k.startsWith('__'))
        .map(([k, done]) => `${k}(${done ? '완료' : '미완료'})`)
        .join(', ');
    }
    case 'parts': {
      const rows = val as { name: string; qty: number; price: number }[];
      if (!Array.isArray(rows) || rows.length === 0) return '';
      const items = rows.filter(r => r.name).map(r => `${r.name} ${r.qty}EA${r.price ? ` (${(r.qty * r.price).toLocaleString()}원)` : ''}`);
      return items.join(', ');
    }
    default: return String(val);
  }
}

export function EventDetailModal({ event: ev, cats, onClose, onEdit, onDelete, onToggleDone }: Props) {
  const cat = cats.find(c => c.key === ev.category);
  const color = cat?.color ?? '#555';
  const schema = CATEGORY_SCHEMAS[ev.category];
  const allFields = schema ? getAllFields(schema) : [];

  const formatDate = (iso?: string) => iso ? iso.replace('T', ' ').slice(0, 16) : '';

  return (
    <div style={OVERLAY} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={MODAL}>
        {/* 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #23334d' }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>일정 상세보기</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={18} /></button>
        </div>

        {/* 바디 */}
        <div style={{ padding: '14px 20px', maxHeight: '70vh', overflowY: 'auto' }}>
          {/* 제목 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 4 }}>
            <div style={{ width: 11, height: 11, borderRadius: '50%', background: color, flexShrink: 0 }} />
            <h3 style={{ margin: 0, fontSize: 17, textDecoration: ev.is_done ? 'line-through' : 'none', color: ev.is_done ? '#64748b' : '#f8fafc' }}>
              {ev.is_important && <span style={{ color: '#f59e0b', marginRight: 4 }}>★</span>}
              {ev.title || cat?.label || ev.category}
            </h3>
          </div>
          <div style={{ fontSize: 12.5, color: '#64748b', marginBottom: 14, paddingLeft: 20 }}>
            {cat?.label} {ev.worktype ? `· ${ev.worktype}` : ''}
          </div>

          {/* 상세 행 */}
          <div style={{ borderTop: '1px solid #23334d' }}>
            {ev.contract_company && (
              <div style={D_ROW}><span style={D_LABEL}>계약업체</span><span style={D_VALUE}>{ev.contract_company}</span></div>
            )}
            {ev.use_company && ev.use_company !== ev.contract_company && (
              <div style={D_ROW}><span style={D_LABEL}>사용업체</span><span style={D_VALUE}>{ev.use_company}</span></div>
            )}
            {ev.location && (
              <div style={D_ROW}><span style={D_LABEL}>주소</span><span style={D_VALUE}>{ev.location}</span></div>
            )}
            {ev.site_managers && ev.site_managers.length > 0 && (
              <div style={D_ROW}><span style={D_LABEL}>현장담당자</span><span style={D_VALUE}>{ev.site_managers.join(', ')}</span></div>
            )}
            {ev.receive_staff && (
              <div style={D_ROW}><span style={D_LABEL}>접수직원</span><span style={D_VALUE}>{ev.receive_staff}</span></div>
            )}
            {ev.process_staff && ev.process_staff.length > 0 && (
              <div style={D_ROW}><span style={D_LABEL}>처리직원</span><span style={D_VALUE}>{ev.process_staff.join(', ')}</span></div>
            )}
            <div style={D_ROW}>
              <span style={D_LABEL}>처리일시</span>
              <span style={D_VALUE}>
                {formatDate(ev.start_at)}
                {ev.end_at ? ` ~ ${formatDate(ev.end_at)}` : ''}
                {ev.is_allday ? ' (종일)' : ''}
              </span>
            </div>
            {ev.call_done && (
              <div style={D_ROW}><span style={D_LABEL}>통화</span><span style={{ ...D_VALUE, color: '#10b981' }}>통화 완료</span></div>
            )}
            {ev.display_order > 0 && (
              <div style={D_ROW}><span style={D_LABEL}>업무순서</span><span style={D_VALUE}>{ev.display_order}</span></div>
            )}

            {/* extra 필드 */}
            {ev.extra && allFields.map(fld => {
              const val = ev.extra?.[fld.key];
              const txt = formatFieldValue(val, fld.type);
              if (!txt) return null;
              return (
                <div key={fld.key} style={D_ROW}>
                  <span style={D_LABEL}>{fld.label}</span>
                  <span style={D_VALUE}>{txt}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 푸터 */}
        <div style={{ display: 'flex', gap: 8, padding: '14px 20px', borderTop: '1px solid #23334d', alignItems: 'center' }}>
          <button onClick={onToggleDone}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: '1px solid #23334d', color: '#94a3b8', padding: '8px 14px', borderRadius: 7, fontSize: 13, cursor: 'pointer' }}>
            {ev.is_done
              ? <><Circle size={14} /> 완료취소</>
              : <><CheckCircle2 size={14} /> 완료처리</>}
          </button>
          <button onClick={onDelete}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: '1px solid #fca5a5', color: '#ef4444', padding: '8px 14px', borderRadius: 7, fontSize: 13, cursor: 'pointer' }}>
            <Trash2 size={14} /> 삭제
          </button>
          <div style={{ flex: 1 }} />
          <button onClick={onClose}
            style={{ background: 'transparent', border: '1px solid #23334d', color: '#94a3b8', padding: '8px 14px', borderRadius: 7, fontSize: 13, cursor: 'pointer' }}>
            닫기
          </button>
          <button onClick={onEdit}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#2563eb', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 7, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
            <Edit3 size={14} /> 수정
          </button>
        </div>
      </div>
    </div>
  );
}
