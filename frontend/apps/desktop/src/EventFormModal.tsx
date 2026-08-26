/**
 * EventFormModal.tsx
 * 업무 등록/수정 모달
 * - 카테고리 선택 → 탭 구조 + 동적 필드 렌더링
 * - space-dust의 category별 extra 필드를 JSONB로 저장
 */

import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import type { ScheduleEvent, ScheduleEventCreate, CategoryMeta } from './scheduleApi';
import { CATEGORY_SCHEMAS, WORKTYPE_OPTIONS } from './CategorySchema';
import type { FieldDef, TabDef } from './CategorySchema';

interface Props {
  event: ScheduleEvent | null;
  defaultDate?: string;
  cats: CategoryMeta[];
  onSave: (data: ScheduleEventCreate) => Promise<void>;
  onClose: () => void;
}

const OVERLAY: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)',
  display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
  zIndex: 1000, overflowY: 'auto', padding: '40px 16px',
};

const MODAL: React.CSSProperties = {
  background: '#ffffff', borderRadius: 12, width: '100%', maxWidth: 640,
  boxShadow: '0 20px 50px rgba(0,0,0,.4)', color: '#111827',
  fontFamily: "Pretendard, -apple-system, sans-serif",
};

const MODAL_HEAD: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '16px 20px', borderBottom: '1px solid #23334d',
};

const MODAL_BODY: React.CSSProperties = {
  padding: '16px 20px', maxHeight: '65vh', overflowY: 'auto',
};

const MODAL_FOOT: React.CSSProperties = {
  display: 'flex', gap: 8, padding: '14px 20px', borderTop: '1px solid #23334d', alignItems: 'center',
};

const FIELD: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12,
};

const LABEL: React.CSSProperties = {
  fontSize: 12.5, color: '#4b5563', fontWeight: 600, whiteSpace: 'nowrap',
};

const INPUT_STYLE: React.CSSProperties = {
  background: '#ffffff', border: '1px solid #23334d', borderRadius: 6,
  padding: '7px 9px', fontSize: 13, color: '#111827', fontFamily: 'inherit', width: '100%',
  boxSizing: 'border-box',
};

const BTN_PRIMARY: React.CSSProperties = {
  background: '#2563eb', color: '#fff', border: 'none', padding: '9px 18px',
  borderRadius: 7, fontWeight: 600, fontSize: 13.5, cursor: 'pointer',
};

const BTN_LINE: React.CSSProperties = {
  background: 'transparent', color: '#4b5563', border: '1px solid #23334d',
  padding: '8px 14px', borderRadius: 7, fontSize: 13, cursor: 'pointer',
};

// ─── 동적 필드 렌더러 ─────────────────────────────────────────────────────────

interface FieldRendererProps {
  fld: FieldDef;
  value: unknown;
  onChange: (key: string, val: unknown) => void;
  ctx?: Record<string, unknown>;
}

function FieldRenderer({ fld, value, onChange, ctx }: FieldRendererProps) {
  // enabledIf 체크
  if (fld.enabledIfKey && ctx) {
    const ctxVal = ctx[fld.enabledIfKey];
    if (ctxVal !== fld.enabledIfValue) return null;
  }

  const strVal = value !== undefined && value !== null ? String(value) : '';

  switch (fld.type) {
    case 'text':
    case 'datalist':
      return (
        <div style={FIELD}>
          <label style={LABEL}>{fld.label}</label>
          <input value={strVal} onChange={e => onChange(fld.key, e.target.value)} style={INPUT_STYLE} placeholder={fld.placeholder} />
        </div>
      );

    case 'textarea':
      return (
        <div style={FIELD}>
          <label style={LABEL}>{fld.label}</label>
          <textarea value={strVal} onChange={e => onChange(fld.key, e.target.value)}
            rows={3} style={{ ...INPUT_STYLE, resize: 'vertical' }} />
        </div>
      );

    case 'number':
      return (
        <div style={FIELD}>
          <label style={LABEL}>{fld.label}{fld.unit ? ` (${fld.unit})` : ''}</label>
          <input type="number" value={strVal} onChange={e => onChange(fld.key, e.target.value ? Number(e.target.value) : null)} style={INPUT_STYLE} />
        </div>
      );

    case 'date':
      return (
        <div style={FIELD}>
          <label style={LABEL}>{fld.label}</label>
          <input type="date" value={strVal} onChange={e => onChange(fld.key, e.target.value)} style={INPUT_STYLE} />
        </div>
      );

    case 'select':
      return (
        <div style={FIELD}>
          <label style={LABEL}>{fld.label}</label>
          <select value={strVal} onChange={e => onChange(fld.key, e.target.value)}
            style={{ ...INPUT_STYLE, cursor: 'pointer' }}>
            <option value="">-- 선택 --</option>
            {fld.options?.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      );

    case 'toggle': {
      const isOn = value === true;
      return (
        <div style={FIELD}>
          <label style={LABEL}>{fld.label}</label>
          <button type="button" onClick={() => onChange(fld.key, !isOn)}
            style={{
              border: 'none', borderRadius: 20, padding: '7px 14px', fontSize: 12.5, fontWeight: 600,
              cursor: 'pointer', width: 'auto', alignSelf: 'flex-start',
              background: isOn ? '#2563eb' : '#27354f', color: isOn ? '#fff' : '#4b5563',
            }}>
            {isOn ? fld.onText : fld.offText}
          </button>
        </div>
      );
    }

    case 'chips': {
      const sel: string[] = Array.isArray((value as { selected?: string[] })?.selected)
        ? (value as { selected: string[] }).selected
        : [];
      return (
        <div style={FIELD}>
          <label style={LABEL}>{fld.label}</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {fld.options?.map(o => {
              const isSel = sel.includes(o);
              return (
                <button key={o} type="button"
                  onClick={() => {
                    const next = isSel ? sel.filter(s => s !== o) : [...sel, o];
                    onChange(fld.key, { selected: next });
                  }}
                  style={{
                    border: `1px solid ${isSel ? '#2563eb' : '#e5e7eb'}`,
                    background: isSel ? '#2563eb22' : 'transparent',
                    color: isSel ? '#2563eb' : '#4b5563',
                    borderRadius: 16, padding: '5px 12px', fontSize: 12.5, cursor: 'pointer',
                  }}>
                  {o}
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    case 'photostatus': {
      const statusObj = (value as Record<string, boolean>) ?? {};
      return (
        <div style={FIELD}>
          <label style={LABEL}>{fld.label}</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {fld.statuses?.map(s => {
              const done = !!statusObj[s];
              return (
                <button key={s} type="button"
                  onClick={() => onChange(fld.key, { ...statusObj, [s]: !done })}
                  style={{
                    border: `1px solid ${done ? '#10b981' : '#e5e7eb'}`,
                    background: done ? '#10b98122' : 'transparent',
                    color: done ? '#10b981' : '#4b5563',
                    borderRadius: 16, padding: '5px 12px', fontSize: 12, cursor: 'pointer', fontWeight: done ? 700 : 400,
                  }}>
                  {s}{done ? ' ✓' : ''}
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    case 'parts': {
      const rows: { name: string; qty: number; price: number; note: string }[] =
        Array.isArray(value) && (value as unknown[]).length > 0
          ? value as { name: string; qty: number; price: number; note: string }[]
          : [{ name: '', qty: 1, price: 0, note: '' }];

      return (
        <div style={{ ...FIELD, marginBottom: 14 }}>
          <label style={LABEL}>{fld.label}</label>
          {rows.map((row, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4, alignItems: 'center' }}>
              <input placeholder="품목" value={row.name}
                onChange={e => { const nr = [...rows]; nr[i] = { ...nr[i], name: e.target.value }; onChange(fld.key, nr); }}
                style={{ ...INPUT_STYLE, flex: 3 }} />
              <input type="number" placeholder="수량" value={row.qty}
                onChange={e => { const nr = [...rows]; nr[i] = { ...nr[i], qty: Number(e.target.value) }; onChange(fld.key, nr); }}
                style={{ ...INPUT_STYLE, flex: 1 }} />
              {!fld.noPrice && (
                <input type="number" placeholder="단가" value={row.price}
                  onChange={e => { const nr = [...rows]; nr[i] = { ...nr[i], price: Number(e.target.value) }; onChange(fld.key, nr); }}
                  style={{ ...INPUT_STYLE, flex: 2 }} />
              )}
              <button type="button" onClick={() => onChange(fld.key, rows.filter((_, ri) => ri !== i))}
                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0 4px' }}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          <button type="button"
            onClick={() => onChange(fld.key, [...rows, { name: '', qty: 1, price: 0, note: '' }])}
            style={{ ...BTN_LINE, fontSize: 12, padding: '5px 10px', alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Plus size={12} /> 품목 추가
          </button>
        </div>
      );
    }

    default:
      return null;
  }
}

// ─── 메인 모달 ───────────────────────────────────────────────────────────────

export function EventFormModal({ event, defaultDate, cats, onSave, onClose }: Props) {
  const today = new Date().toISOString().slice(0, 16);
  const initDate = defaultDate
    ? `${defaultDate}T09:00`
    : event?.start_at?.slice(0, 16) ?? today;

  const [category, setCategory] = useState(event?.category ?? 'as-service');
  
  // Worktype 초기화
  const [worktype, setWorktype] = useState(() => {
    if (event?.worktype) return event.worktype;
    const opts = WORKTYPE_OPTIONS[event?.category ?? 'as-service'];
    return opts && opts.length > 0 ? opts[0] : '';
  });

  const [useCompany, setUseCompany] = useState(event?.use_company ?? '');
  const [contractCompany, setContractCompany] = useState(event?.contract_company ?? '');
  const [location, setLocation] = useState(event?.location ?? '');
  const [receiveStaff, setReceiveStaff] = useState(event?.receive_staff ?? '');
  const [processStaff, setProcessStaff] = useState<string[]>(event?.process_staff ?? ['']);
  const [startAt, setStartAt] = useState(initDate);
  const [endAt, setEndAt] = useState(event?.end_at?.slice(0, 16) ?? '');
  const [title, setTitle] = useState(event?.title ?? '');
  const [isAllday, setIsAllday] = useState(event?.is_allday ?? false);
  const [isImportant, setIsImportant] = useState(event?.is_important ?? false);
  const [callDone, setCallDone] = useState(event?.call_done ?? false);
  const [displayOrder, setDisplayOrder] = useState(event?.display_order ?? 0);
  const [extra, setExtra] = useState<Record<string, unknown>>(
    typeof event?.extra === 'object' && event.extra ? event.extra : {}
  );

  const schema = CATEGORY_SCHEMAS[category];
  const activeTabs: TabDef[] = schema?.tabs ?? [];
  const flatFields: FieldDef[] = schema?.fields ?? [];

  // 자동 탭 결정 함수
  const getAutoTab = (cat: string, wt: string, tabs: TabDef[]) => {
    if (!tabs || tabs.length === 0) return '';
    if (cat === 'sales-demo') return wt === '시연' ? 'post' : 'receive';
    if (cat === 'rental-ship') return (wt.includes('종료') || wt.includes('회수')) ? 'post' : 'pre';
    if (cat === 'as-service') return (wt === '수리입/출고' || wt === '수리입고') ? 'receive' : 'post';
    return tabs[0].key; // default
  };

  const [activeTab, setActiveTab] = useState(() => {
    if (event?.category && event?.worktype) {
      return getAutoTab(event.category, event.worktype, CATEGORY_SCHEMAS[event.category]?.tabs ?? []);
    }
    return activeTabs?.[0]?.key ?? '';
  });

  // 업무 변경 시 탭 자동 변경
  useEffect(() => {
    const nextTab = getAutoTab(category, worktype, activeTabs);
    if (nextTab && nextTab !== activeTab) {
      setActiveTab(nextTab);
    }
  }, [worktype, category]);

  function handleCategoryChange(newCat: string) {
    setCategory(newCat as ScheduleEventCreate['category']);
    const opts = WORKTYPE_OPTIONS[newCat];
    const newWt = opts && opts.length > 0 ? opts[0] : '';
    setWorktype(newWt);
    
    const tabs = CATEGORY_SCHEMAS[newCat]?.tabs ?? [];
    if (tabs.length > 0) {
      setActiveTab(getAutoTab(newCat, newWt, tabs));
    } else {
      setActiveTab('');
    }
  }

  function setExtraField(key: string, val: unknown) {
    setExtra(prev => ({ ...prev, [key]: val }));
  }

  const currentTabFields: FieldDef[] = activeTabs.find(t => t.key === activeTab)?.fields ?? flatFields;

  async function handleSubmit() {
    if (!startAt) { alert('처리일시(시작)을 입력해주세요.'); return; }
    const payload: ScheduleEventCreate = {
      category: category as ScheduleEventCreate['category'],
      worktype: worktype || undefined,
      use_company: useCompany || undefined,
      contract_company: contractCompany || undefined,
      location: location || undefined,
      site_managers: event?.site_managers ?? [],
      receive_staff: receiveStaff || undefined,
      process_staff: processStaff.filter(Boolean),
      display_order: displayOrder,
      call_done: callDone,
      is_allday: isAllday,
      is_done: false,
      is_important: isImportant,
      start_at: startAt,
      end_at: endAt || undefined,
      title: title || undefined,
      extra,
    };
    await onSave(payload);
  }

  return (
    <div style={OVERLAY} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={MODAL}>
        {/* 헤더 */}
        <div style={MODAL_HEAD}>
          <h3 style={{ margin: 0, fontSize: 16, color: '#111827' }}>{event ? '업무 수정' : '업무 등록'}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={18} /></button>
        </div>

        {/* 바디 */}
        <div style={MODAL_BODY}>
          {/* 공통 필드 — 2열 그리드 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>

            {/* 카테고리 */}
            <div style={FIELD}>
              <label style={LABEL}><span style={{ color: '#ef4444' }}>*</span> 업무카테고리</label>
              <select value={category} onChange={e => handleCategoryChange(e.target.value)}
                style={{
                  width: '100%', padding: '6px 10px', background: '#ffffff',
                  border: '1px solid #334155', color: '#111827', borderRadius: 6, fontSize: 13,
                }}
              >
                {cats.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>

            {/* 업무 (worktype) */}
            <div style={FIELD}>
              <label style={LABEL}><span style={{ color: '#ef4444' }}>*</span> 업무</label>
              <select value={worktype} onChange={e => setWorktype(e.target.value)}
                style={{
                  width: '100%', padding: '6px 10px', background: '#ffffff',
                  border: '1px solid #334155', color: '#111827', borderRadius: 6, fontSize: 13,
                }}
              >
                <option value="">업무를 선택하세요</option>
                {WORKTYPE_OPTIONS[category]?.map(o => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>

            {/* 계약업체 */}
            <div style={FIELD}>
              <label style={LABEL}>계약업체</label>
              <input value={contractCompany} onChange={e => setContractCompany(e.target.value)} style={INPUT_STYLE} placeholder="계약업체명" />
            </div>

            {/* 사용업체 */}
            <div style={FIELD}>
              <label style={LABEL}>사용업체</label>
              <input value={useCompany} onChange={e => setUseCompany(e.target.value)} style={INPUT_STYLE} placeholder="계약업체와 다를 경우 입력" />
            </div>

            {/* 주소 — 전체 열 */}
            <div style={{ ...FIELD, gridColumn: '1 / -1' }}>
              <label style={LABEL}>주소</label>
              <input value={location} onChange={e => setLocation(e.target.value)} style={INPUT_STYLE} placeholder="현장 주소" />
            </div>

            {/* 접수직원 */}
            <div style={FIELD}>
              <label style={LABEL}>접수직원</label>
              <input value={receiveStaff} onChange={e => setReceiveStaff(e.target.value)} style={INPUT_STYLE} placeholder="접수 직원명" />
            </div>

            {/* 업무순서 */}
            <div style={FIELD}>
              <label style={LABEL}>업무순서</label>
              <input type="number" value={displayOrder} onChange={e => setDisplayOrder(Number(e.target.value))} min={0} style={INPUT_STYLE} />
            </div>

            {/* 처리일시(시작) */}
            <div style={FIELD}>
              <label style={LABEL}><span style={{ color: '#ef4444' }}>*</span> 처리일시(시작)</label>
              <input type="datetime-local" value={startAt} onChange={e => setStartAt(e.target.value)} style={INPUT_STYLE} />
            </div>

            {/* 처리일시(종료) */}
            <div style={FIELD}>
              <label style={LABEL}>처리일시(종료)</label>
              <input type="datetime-local" value={endAt} onChange={e => setEndAt(e.target.value)} style={INPUT_STYLE} />
            </div>

            {/* 제목 — 전체 열 */}
            <div style={{ ...FIELD, gridColumn: '1 / -1' }}>
              <label style={LABEL}>제목</label>
              <input value={title} onChange={e => setTitle(e.target.value)} style={INPUT_STYLE} placeholder="자동생성되거나 직접 입력" />
            </div>

            {/* 토글 3개 */}
            <div style={{ ...FIELD, gridColumn: '1 / -1', flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {[
                { label: '종일', val: isAllday, set: setIsAllday },
                { label: '중요', val: isImportant, set: setIsImportant },
                { label: '통화완료', val: callDone, set: setCallDone },
              ].map(({ label, val, set }) => (
                <button key={label} type="button" onClick={() => set(!val)}
                  style={{
                    border: 'none', borderRadius: 20, padding: '6px 14px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                    background: val ? '#2563eb' : '#27354f', color: val ? '#fff' : '#4b5563',
                  }}>
                  {label}
                </button>
              ))}
            </div>

            {/* 처리직원 다중 */}
            <div style={{ ...FIELD, gridColumn: '1 / -1' }}>
              <label style={LABEL}>처리직원</label>
              {processStaff.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                  <input value={s} onChange={e => { const n = [...processStaff]; n[i] = e.target.value; setProcessStaff(n); }}
                    style={{ ...INPUT_STYLE, flex: 1 }} placeholder="직원명" />
                  {processStaff.length > 1 && (
                    <button type="button" onClick={() => setProcessStaff(processStaff.filter((_, ri) => ri !== i))}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={13} /></button>
                  )}
                </div>
              ))}
              <button type="button" onClick={() => setProcessStaff([...processStaff, ''])}
                style={{ ...BTN_LINE, fontSize: 12, padding: '4px 8px', alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Plus size={12} /> 직원 추가
              </button>
            </div>
          </div>

          {/* ─ 카테고리/업무별 동적 필드 ─ */}
          <div style={{ marginTop: 16 }}>
            {/* 탭 버튼 */}
            {activeTabs.length > 0 && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 14, borderBottom: '2px solid #23334d' }}>
                {activeTabs.map(t => (
                  <button key={t.key} type="button" onClick={() => setActiveTab(t.key)}
                    style={{
                      background: activeTab === t.key ? '#ffffff' : 'transparent',
                      border: '1px solid #23334d', borderBottom: 'none',
                      borderRadius: '8px 8px 0 0', padding: '8px 16px', marginBottom: -2,
                      fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
                      color: activeTab === t.key ? '#2563eb' : '#64748b',
                    }}>
                    {t.label}
                  </button>
                ))}
              </div>
            )}

            {/* 현재 탭(또는 단일 필드셋)의 필드들 */}
            {currentTabFields.map(fld => (
              <FieldRenderer
                key={fld.key}
                fld={fld}
                value={extra[fld.key]}
                onChange={setExtraField}
                ctx={extra}
              />
            ))}
          </div>
        </div>

        {/* 푸터 */}
        <div style={MODAL_FOOT}>
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={BTN_LINE}>취소</button>
          <button onClick={handleSubmit} style={BTN_PRIMARY}>저장</button>
        </div>
      </div>
    </div>
  );
}
