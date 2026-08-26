import { X } from 'lucide-react';
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
  background: '#ffffff', borderRadius: 12, width: '100%', maxWidth: 560,
  boxShadow: '0 20px 50px rgba(0,0,0,.4)', color: '#111827',
  fontFamily: "Pretendard, -apple-system, sans-serif",
};

const D_ROW: React.CSSProperties = {
  display: 'flex', gap: 14, padding: '10px 0', borderBottom: '1px solid #e5e7eb', fontSize: 13,
};

const D_LABEL: React.CSSProperties = { flex: '0 0 120px', color: '#6b7280', fontWeight: 500 };
const D_VALUE: React.CSSProperties = { flex: 1, color: '#111827', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontWeight: 500 };

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

// cause/action 파싱용 유틸 ( { other: '...', selected: [] } 배열 처리 )
function formatCauseAction(val: any): string {
  if (Array.isArray(val)) {
    return val.map(v => {
      const sel = v.selected ? v.selected.join(', ') : '';
      const oth = v.other || '';
      return [sel, oth].filter(Boolean).join(' / ');
    }).filter(Boolean).join(', ');
  }
  return '';
}

// 배열의 첫번째 값 가져오기
function firstArrVal(val: any): string {
  if (Array.isArray(val) && val.length > 0) return val[0];
  return '';
}

export function EventDetailModal({ event: ev, cats, onClose, onEdit, onDelete: _onDelete, onToggleDone }: Props) {
  const cat = cats.find(c => c.key === ev.category);
  const color = cat?.color ?? '#10b981';
  const schema = CATEGORY_SCHEMAS[ev.category];
  const allFields = schema ? getAllFields(schema) : [];

  const formatJustDate = (iso?: string) => iso ? iso.slice(0, 10) : '';

  // 일시 포맷 (종일 처리)
  let timeStr = '';
  if (ev.start_at) {
    timeStr = formatJustDate(ev.start_at);
    timeStr += ev.is_allday ? ' (종일)' : ' ' + ev.start_at.slice(11, 16);
  }

  // 장비명
  let equipString = '';
  if (ev.equipment_rows && ev.equipment_rows.length > 0) {
    equipString = ev.equipment_rows.map(r => r.name).filter(Boolean).join(', ');
  } else if (ev.extra && typeof ev.extra.equipment === 'string') {
    equipString = ev.extra.equipment;
  }

  // 사진촬영
  let photoString = '';
  if (ev.extra && ev.extra.photoStatus) {
    photoString = formatFieldValue(ev.extra.photoStatus, 'photostatus');
  } else if (ev.extra && ev.extra.photo_status) {
    photoString = formatFieldValue(ev.extra.photo_status, 'photostatus');
  }

  const isAS = ev.category === 'as-service';

  return (
    <div style={OVERLAY} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={MODAL}>
        
        {/* 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>일정 상세보기</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        {/* 바디 */}
        <div style={{ padding: '24px 20px 14px 20px', maxHeight: '70vh', overflowY: 'auto' }}>
          
          {/* 제목부 (A/S 모방: 빨간점 + 제목) */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0, marginTop: 5 }} />
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827', textDecoration: ev.is_done ? 'line-through' : 'none' }}>
                {ev.is_important && <span style={{ color: '#f59e0b', marginRight: 4 }}>★</span>}
                {ev.title || cat?.label || ev.category}
              </h3>
              <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
                {cat?.label || ev.category}
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #e5e7eb', marginTop: 16 }}>
            {/* 고정 필드 순서 (공통 & A/S 특화) */}
            
            <div style={D_ROW}><span style={D_LABEL}>업무카테고리</span><span style={D_VALUE}>{cat?.label || ev.category}</span></div>
            {ev.worktype && (
              <div style={D_ROW}><span style={D_LABEL}>업무</span><span style={D_VALUE}>{ev.worktype}</span></div>
            )}
            <div style={D_ROW}><span style={D_LABEL}>일시</span><span style={D_VALUE}>{timeStr}</span></div>
            
            {ev.contract_company && (
              <div style={D_ROW}><span style={D_LABEL}>계약업체</span><span style={D_VALUE}>{ev.contract_company}</span></div>
            )}
            {ev.use_company && (
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
            {ev.receive_date && (
              <div style={D_ROW}><span style={D_LABEL}>접수일</span><span style={D_VALUE}>{formatJustDate(ev.receive_date)}</span></div>
            )}
            {ev.process_staff && ev.process_staff.length > 0 && (
              <div style={D_ROW}><span style={D_LABEL}>{isAS ? '출고직원' : '처리직원'}</span><span style={D_VALUE}>{ev.process_staff.join(', ')}</span></div>
            )}
            
            <div style={D_ROW}><span style={D_LABEL}>통화여부</span><span style={D_VALUE}>{ev.call_done ? '통화완료' : '미통화'}</span></div>
            
            {equipString && (
              <div style={D_ROW}><span style={D_LABEL}>장비명</span><span style={D_VALUE}>{equipString}</span></div>
            )}
            
            <div style={D_ROW}><span style={D_LABEL}>상태</span><span style={D_VALUE}>{ev.is_done ? '완료' : '진행중'}</span></div>

            {/* A/S 접수 특화 하드코딩 렌더링 (Image 1 참조) */}
            {isAS && ev.extra && (
              <>
                {ev.extra.shipDate && firstArrVal(ev.extra.shipDate) && <div style={D_ROW}><span style={D_LABEL}>장비 출고일</span><span style={D_VALUE}>{firstArrVal(ev.extra.shipDate)}</span></div>}
                {ev.extra.shipCompany && firstArrVal(ev.extra.shipCompany) && <div style={D_ROW}><span style={D_LABEL}>출고업체</span><span style={D_VALUE}>{firstArrVal(ev.extra.shipCompany)}</span></div>}
                {ev.extra.equipSerial && firstArrVal(ev.extra.equipSerial) && <div style={D_ROW}><span style={D_LABEL}>출고장비 시리얼</span><span style={D_VALUE}>{firstArrVal(ev.extra.equipSerial)}</span></div>}
                {ev.extra.receiveContent && firstArrVal(ev.extra.receiveContent) && <div style={D_ROW}><span style={D_LABEL}>A/S 접수내용</span><span style={D_VALUE}>{firstArrVal(ev.extra.receiveContent)}</span></div>}
                {ev.extra.quoteType && firstArrVal(ev.extra.quoteType) && <div style={D_ROW}><span style={D_LABEL}>견적제공</span><span style={D_VALUE}>{firstArrVal(ev.extra.quoteType)}</span></div>}
                <div style={D_ROW}><span style={D_LABEL}>기타 특이사항</span><span style={D_VALUE}>{String(ev.extra.memoAdmin || ev.extra.memoReceive || '-')}</span></div>
                {ev.extra.repairStaff && <div style={D_ROW}><span style={D_LABEL}>수리직원</span><span style={D_VALUE}>{String(ev.extra.repairStaff)}</span></div>}
                {ev.extra.useHours && firstArrVal(ev.extra.useHours) && <div style={D_ROW}><span style={D_LABEL}>사용시간</span><span style={D_VALUE}>{firstArrVal(ev.extra.useHours)}</span></div>}
                {ev.extra.voltage && firstArrVal(ev.extra.voltage) && <div style={D_ROW}><span style={D_LABEL}>전압</span><span style={D_VALUE}>{firstArrVal(ev.extra.voltage)}</span></div>}
                {ev.extra.cause && formatCauseAction(ev.extra.cause) && <div style={D_ROW}><span style={D_LABEL}>원인</span><span style={D_VALUE}>{formatCauseAction(ev.extra.cause)}</span></div>}
                {ev.extra.action && formatCauseAction(ev.extra.action) && <div style={D_ROW}><span style={D_LABEL}>조치</span><span style={D_VALUE}>{formatCauseAction(ev.extra.action)}</span></div>}
              </>
            )}

            {photoString && (
              <div style={D_ROW}><span style={D_LABEL}>사진촬영</span><span style={D_VALUE}>{photoString}</span></div>
            )}

            {isAS && ev.extra && (
              <>
                {ev.extra.quoteType && firstArrVal(ev.extra.quoteType) && <div style={D_ROW}><span style={D_LABEL}>견적제공</span><span style={D_VALUE}>{firstArrVal(ev.extra.quoteType)}</span></div>}
                {ev.extra.kakao && <div style={D_ROW}><span style={D_LABEL}>카카오톡 친구추가</span><span style={D_VALUE}>{String(ev.extra.kakao)}</span></div>}
                {ev.extra.quoteSent && <div style={D_ROW}><span style={D_LABEL}>견적서 발송</span><span style={D_VALUE}>{String(ev.extra.quoteSent)}</span></div>}
              </>
            )}

            {/* A/S접수가 아닌 일반 모달일 때만 동적 필드를 노출시킴 (중복 방지) */}
            {!isAS && ev.extra && allFields.map(fld => {
              if (['photoStatus', 'photo_status', 'equipment', 'memoReceive'].includes(fld.key)) return null;
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
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 20px', borderTop: '1px solid #e5e7eb', alignItems: 'center' }}>
          {/* 좌측 버튼 그룹 */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onToggleDone}
              style={{ background: '#ffffff', border: '1px solid #d1d5db', color: '#4b5563', padding: '8px 16px', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>
              {ev.is_done ? '완료취소' : '완료처리'}
            </button>
            <button
              style={{ background: '#ffffff', border: '1px solid #d1d5db', color: '#4b5563', padding: '8px 16px', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>
              ERP 복사용
            </button>
          </div>
          
          {/* 우측 버튼 그룹 */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose}
              style={{ background: '#ffffff', border: '1px solid #d1d5db', color: '#4b5563', padding: '8px 16px', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>
              닫기
            </button>
            <button onClick={onEdit}
              style={{ background: '#4f46e5', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
              상세정보(수정)
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
