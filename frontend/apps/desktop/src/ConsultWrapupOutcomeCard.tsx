import React from 'react';
import { CheckSquare, Square, FileText, Package, Trash2 } from 'lucide-react';
import {
  OUTCOME_META,
  type WrapupOutcomeFields,
  type WrapupOutcomeItem,
} from './consultWrapupTypes';

export interface WrapupOutcomeCardProps {
  item: WrapupOutcomeItem;
  onToggle: (id: string) => void;
  onUpdateTitle: (id: string, title: string) => void;
  onUpdateField: (id: string, key: keyof WrapupOutcomeFields, value: any) => void;
  onRemove: (id: string) => void;
  onOpenPartsQuote: () => void;
  onOpenDispatchDoc: () => void;
}

export const WrapupOutcomeCard: React.FC<WrapupOutcomeCardProps> = ({
  item,
  onToggle,
  onUpdateTitle,
  onUpdateField,
  onRemove,
  onOpenPartsQuote,
  onOpenDispatchDoc,
}) => {
  const meta = OUTCOME_META[item.outcomeType];
  return (
    <div
      key={item.id}
      style={{
        backgroundColor: '#ffffff',
        border: item.checked ? `2px solid ${meta.borderColor}` : '1px solid #cbd5e1',
        borderRadius: '8px',
        padding: '12px 14px',
        opacity: item.checked ? 1 : 0.6,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        flexShrink: 0,
      }}
    >
      {/* 카드 상단 헤더 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
          <button
            onClick={() => onToggle(item.id)}
            style={{
              background: 'none',
              border: 'none',
              color: item.checked ? '#2563eb' : '#94a3b8',
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
            }}
          >
            {item.checked ? <CheckSquare size={18} /> : <Square size={18} />}
          </button>

          <span
            style={{
              padding: '3px 8px',
              borderRadius: '4px',
              backgroundColor: meta.badgeBg,
              color: meta.badgeColor,
              border: `1px solid ${meta.borderColor}`,
              fontSize: '12px',
              fontWeight: 800,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {meta.label}
          </span>

          <input
            type="text"
            value={item.title}
            onChange={(e) => onUpdateTitle(item.id, e.target.value)}
            style={{
              flex: 1,
              padding: '5px 8px',
              fontSize: '13.5px',
              fontWeight: 800,
              color: '#0f172a',
              border: '1px solid #e2e8f0',
              borderRadius: '4px',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <span
            style={{
              fontSize: '11.5px',
              fontWeight: 700,
              color: '#475569',
              whiteSpace: 'nowrap',
            }}
          >
            일정분류: <strong>{item.worktype}</strong>
          </span>

          {item.outcomeType === 'SALES_QUOTE' && (
            <button
              onClick={onOpenPartsQuote}
              style={{
                padding: '4px 8px',
                borderRadius: '4px',
                border: '1px solid #f59e0b',
                backgroundColor: '#fffbeb',
                color: '#92400e',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                whiteSpace: 'nowrap',
              }}
            >
              <Package size={12} />
              <span>부품 견적서 열기</span>
            </button>
          )}

          {item.outcomeType === 'AS_SCHEDULE' && (
            <button
              onClick={onOpenDispatchDoc}
              style={{
                padding: '4px 8px',
                borderRadius: '4px',
                border: '1px solid #3b82f6',
                backgroundColor: '#eff6ff',
                color: '#1d4ed8',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                whiteSpace: 'nowrap',
              }}
            >
              <FileText size={12} />
              <span>출장 안내문 조립</span>
            </button>
          )}

          <button
            onClick={() => onRemove(item.id)}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '2px',
              display: 'flex',
            }}
            title="결론 카드 삭제"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* 카테고리별 맞춤 필드 그리드 (상하 세로 스택 레이아웃 준수) */}
      {item.outcomeType === 'TECH_COUNSEL' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 1.5fr 1.5fr', gap: '10px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
              증상 분류 (복합어 우선)
            </label>
            <input
              type="text"
              value={item.fields.symptomCategory || ''}
              onChange={(e) => onUpdateField(item.id, 'symptomCategory', e.target.value)}
              style={{ padding: '6px 8px', fontSize: '12.5px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
              처리 상태
            </label>
            <select
              value={item.fields.resolutionStatus || '자가조치완료'}
              onChange={(e) => onUpdateField(item.id, 'resolutionStatus', e.target.value)}
              style={{ padding: '6px 8px', fontSize: '12.5px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
            >
              <option value="자가조치완료">자가조치완료</option>
              <option value="경과관찰">경과관찰</option>
              <option value="출장전환">출장전환</option>
              <option value="견적전환">견적전환</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
              수행 완료 점검 단계
            </label>
            <input
              type="text"
              value={item.fields.checkedStepsSummary || ''}
              onChange={(e) => onUpdateField(item.id, 'checkedStepsSummary', e.target.value)}
              style={{ padding: '6px 8px', fontSize: '12.5px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
              상담 이력 저장 메모
            </label>
            <input
              type="text"
              value={item.fields.actionMemo || ''}
              onChange={(e) => onUpdateField(item.id, 'actionMemo', e.target.value)}
              style={{ padding: '6px 8px', fontSize: '12.5px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
            />
          </div>
        </div>
      )}

      {item.outcomeType === 'SALES_QUOTE' && (
        <div style={{ display: 'grid', gridTemplateColumns: '0.9fr 1.6fr 0.9fr 1.6fr', gap: '10px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
              문의 유형
            </label>
            <select
              value={item.fields.quoteType || '부품·소모품 견적'}
              onChange={(e) => onUpdateField(item.id, 'quoteType', e.target.value)}
              style={{ padding: '6px 8px', fontSize: '12.5px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
            >
              <option value="부품·소모품 견적">부품·소모품 견적</option>
              <option value="신규 렌탈 견적">신규 렌탈 견적</option>
              <option value="장비 구매 견적">장비 구매 견적</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
              요청 품목 / 모델명
            </label>
            <input
              type="text"
              value={(item.fields.requestedItems || []).map((r) => `${r.name} (${r.qty}개)`).join(', ')}
              onChange={(e) =>
                onUpdateField(item.id, 'requestedItems', [
                  { name: e.target.value, qty: 1, note: '' },
                ])
              }
              style={{ padding: '6px 8px', fontSize: '12.5px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
              발송 목표 일시
            </label>
            <input
              type="datetime-local"
              value={item.fields.requestedDateIso || ''}
              onChange={(e) => onUpdateField(item.id, 'requestedDateIso', e.target.value)}
              style={{ padding: '5px 8px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
              견적 전달 메모
            </label>
            <input
              type="text"
              value={item.fields.actionMemo || ''}
              onChange={(e) => onUpdateField(item.id, 'actionMemo', e.target.value)}
              style={{ padding: '6px 8px', fontSize: '12.5px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
            />
          </div>
        </div>
      )}

      {item.outcomeType === 'DEMO_REQUEST' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 0.9fr 1.1fr 1.4fr', gap: '10px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
              현장 업종
            </label>
            <input
              type="text"
              value={item.fields.industry || ''}
              onChange={(e) => onUpdateField(item.id, 'industry', e.target.value)}
              style={{ padding: '6px 8px', fontSize: '12.5px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
              바닥 면적 / 재질
            </label>
            <input
              type="text"
              value={item.fields.floorSpec || ''}
              onChange={(e) => onUpdateField(item.id, 'floorSpec', e.target.value)}
              style={{ padding: '6px 8px', fontSize: '12.5px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
              시연 장비 모델
            </label>
            <input
              type="text"
              value={item.fields.recommendedModel || ''}
              onChange={(e) => onUpdateField(item.id, 'recommendedModel', e.target.value)}
              style={{ padding: '6px 8px', fontSize: '12.5px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
              시연 희망 일시
            </label>
            <input
              type="datetime-local"
              value={item.fields.requestedDateIso || ''}
              onChange={(e) => onUpdateField(item.id, 'requestedDateIso', e.target.value)}
              style={{ padding: '5px 8px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
              시연 특이사항 메모
            </label>
            <input
              type="text"
              value={item.fields.actionMemo || ''}
              onChange={(e) => onUpdateField(item.id, 'actionMemo', e.target.value)}
              style={{ padding: '6px 8px', fontSize: '12.5px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
            />
          </div>
        </div>
      )}

      {item.outcomeType === 'DELIVERY_ADJUST' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.8fr 1fr 2.1fr', gap: '10px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
              변경 납품 일시
            </label>
            <input
              type="datetime-local"
              value={item.fields.requestedDateIso || ''}
              onChange={(e) => onUpdateField(item.id, 'requestedDateIso', e.target.value)}
              style={{ padding: '5px 8px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
              출고 방식
            </label>
            <select
              value={item.fields.shipMethod || '직배송'}
              onChange={(e) => onUpdateField(item.id, 'shipMethod', e.target.value)}
              style={{ padding: '6px 8px', fontSize: '12.5px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
            >
              <option value="직배송">직배송</option>
              <option value="화물">화물</option>
              <option value="택배">택배</option>
              <option value="내방">내방</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
              기존 일정 참고
            </label>
            <input
              type="text"
              value={item.fields.originalDateText || '기존 예정일'}
              onChange={(e) => onUpdateField(item.id, 'originalDateText', e.target.value)}
              style={{ padding: '6px 8px', fontSize: '12.5px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
              납품 조정 사유 및 수령자 메모
            </label>
            <input
              type="text"
              value={item.fields.actionMemo || ''}
              onChange={(e) => onUpdateField(item.id, 'actionMemo', e.target.value)}
              style={{ padding: '6px 8px', fontSize: '12.5px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
            />
          </div>
        </div>
      )}

      {item.outcomeType === 'AS_SCHEDULE' && (
        <div style={{ display: 'grid', gridTemplateColumns: '0.8fr 1.1fr 1.1fr 1.1fr 1.4fr', gap: '10px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
              접수 구분
            </label>
            <select
              value={item.fields.isReschedule ? 'RESCHEDULE' : 'NEW'}
              onChange={(e) =>
                onUpdateField(item.id, 'isReschedule', e.target.value === 'RESCHEDULE')
              }
              style={{ padding: '6px 8px', fontSize: '12.5px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
            >
              <option value="NEW">신규 출장접수</option>
              <option value="RESCHEDULE">방문일정 변경</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
              방문 희망 일시
            </label>
            <input
              type="datetime-local"
              value={item.fields.requestedDateIso || ''}
              onChange={(e) => onUpdateField(item.id, 'requestedDateIso', e.target.value)}
              style={{ padding: '5px 8px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
              배정 정비기사
            </label>
            <input
              type="text"
              value={item.fields.assignedEngineer || ''}
              onChange={(e) => onUpdateField(item.id, 'assignedEngineer', e.target.value)}
              style={{ padding: '6px 8px', fontSize: '12.5px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
              지참 필요 부품
            </label>
            <input
              type="text"
              value={item.fields.nextVisitParts || ''}
              onChange={(e) => onUpdateField(item.id, 'nextVisitParts', e.target.value)}
              style={{ padding: '6px 8px', fontSize: '12.5px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
              기사 전달 메모
            </label>
            <input
              type="text"
              value={item.fields.actionMemo || ''}
              onChange={(e) => onUpdateField(item.id, 'actionMemo', e.target.value)}
              style={{ padding: '6px 8px', fontSize: '12.5px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
