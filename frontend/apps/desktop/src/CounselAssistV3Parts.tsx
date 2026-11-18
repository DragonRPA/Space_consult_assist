import { ArrowRight, X } from 'lucide-react';
import type {
  Customer,
  OfficialErrorCode,
  ConsultSessionRecord,
  SymptomPreset,
} from './counselShared';
import type { OmniParsedResult } from './omniQueryParser';

// ─── 실시간 통합 자동완성 드롭다운 컴포넌트 ──────────────────────────────────
export function OmniSuggestDropdown({
  parsed,
  query,
  onExecuteComposite,
  onSelectCustomer,
  onSelectModel,
  onSelectSymptom
}: {
  parsed: OmniParsedResult;
  query: string;
  onExecuteComposite: () => void;
  onSelectCustomer: (c: Customer) => void;
  onSelectModel: (m: string) => void;
  onSelectSymptom: (p: SymptomPreset, errCode?: OfficialErrorCode) => void;
}) {
  const { matchedCustomers, matchedModels, matchedErrorCodes, matchedSymptoms, compositePreview } = parsed;

  return (
    <div
      data-uia="omni-suggest-dropdown"
      style={{
        position: 'absolute',
        top: 'calc(100% + 6px)',
        left: 0,
        right: 0,
        background: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: 14,
        boxShadow: '0 14px 36px rgba(15, 23, 42, 0.16)',
        zIndex: 3000,
        maxHeight: 440,
        overflowY: 'auto',
        padding: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }}
    >
      {/* 1. 복합 원클릭 실행 배너 */}
      {compositePreview && (
        <div
          onClick={onExecuteComposite}
          data-uia="omni-composite-action"
          style={{
            background: '#eff6ff',
            border: '1.5px solid #2563eb',
            borderRadius: 10,
            padding: '10px 14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span
              style={{
                background: '#2563eb',
                color: '#ffffff',
                fontSize: 13.5,
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: 4,
                whiteSpace: 'nowrap'
              }}
            >
              통합 즉시 전개 (Enter)
            </span>
            {compositePreview.customer && (
              <span style={{ fontSize: 13.5, fontWeight: 800, color: '#0f172a' }}>
                고객: {compositePreview.customer.name}
              </span>
            )}
            {compositePreview.model && (
              <span style={{ fontSize: 13.5, fontWeight: 800, color: '#1d4ed8' }}>
                모델: {compositePreview.model}
              </span>
            )}
            {compositePreview.errorCode && (
              <span style={{ fontSize: 13.5, fontWeight: 800, color: '#dc2626' }}>
                에러코드: [{compositePreview.errorCode.code}] {compositePreview.errorCode.name}
              </span>
            )}
            {compositePreview.symptom && (
              <span style={{ fontSize: 13.5, fontWeight: 800, color: '#059669' }}>
                증상: {compositePreview.symptom.title}
              </span>
            )}
          </div>
          <ArrowRight size={16} color="#2563eb" style={{ flexShrink: 0 }} />
        </div>
      )}

      {/* 2. 고객사 / 전화번호 매칭 결과 */}
      {matchedCustomers.length > 0 && (
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: '#64748b', padding: '2px 6px 4px' }}>
            고객사 및 전화번호 ({matchedCustomers.length}건)
          </div>
          {matchedCustomers.map(c => (
            <div
              key={c.id}
              onClick={() => onSelectCustomer(c)}
              style={{
                padding: '8px 10px',
                borderRadius: 8,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: 13.5
              }}
            >
              <div>
                <strong style={{ color: '#0f172a' }}>{c.name}</strong>{' '}
                <span style={{ color: '#64748b' }}>
                  ({c.siteWorkerName ? `${c.siteWorkerName} ${c.siteWorkerPhone || ''} / ` : ''}원청: {c.manager} {c.phone}
                  {c.address ? ` · ${c.address}` : ''}
                  {c.addressDetail ? ` (${c.addressDetail})` : ''})
                </span>
              </div>
              <span
                style={{
                  background: '#0f172a',
                  color: '#ffffff',
                  padding: '2px 8px',
                  borderRadius: 4,
                  fontWeight: 800,
                  fontSize: 13.5
                }}
              >
                {c.assetModel}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* 3. 장비 모델 매칭 결과 */}
      {matchedModels.length > 0 && (
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: '#64748b', padding: '2px 6px 4px' }}>
            장비 모델 선택
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: '0 6px' }}>
            {matchedModels.map(m => (
              <button
                key={m}
                type="button"
                onClick={() => onSelectModel(m)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 6,
                  background: '#0f172a',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: 13.5,
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                {m} 모델 적용
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 4. 계기판 에러코드 매칭 결과 */}
      {matchedErrorCodes.length > 0 && (
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: '#64748b', padding: '2px 6px 4px' }}>
            계기판 에러코드
          </div>
          {matchedErrorCodes.map(({ codeObj }) => (
            <div
              key={codeObj.code}
              onClick={() =>
                onSelectSymptom(
                  {
                    id: 'EXT_ERROR_CODE',
                    title: '계기판 에러코드 점멸 및 경고음',
                    symptom: `[${codeObj.code}] ${codeObj.name} - ${codeObj.meaning}`,
                    urgency: '긴급',
                    category: '에러코드'
                  },
                  codeObj
                )
              }
              style={{
                padding: '7px 10px',
                borderRadius: 8,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: 13.5
              }}
            >
              <div>
                <strong style={{ color: '#dc2626' }}>[{codeObj.code}]</strong>{' '}
                <strong style={{ color: '#0f172a' }}>{codeObj.name}</strong> —{' '}
                <span style={{ color: '#64748b' }}>{codeObj.meaning}</span>
              </div>
              <span style={{ color: '#2563eb', fontWeight: 700 }}>진단 열기</span>
            </div>
          ))}
        </div>
      )}

      {/* 5. 표준 장애 증상 매칭 결과 */}
      {matchedSymptoms.length > 0 && (
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: '#64748b', padding: '2px 6px 4px' }}>
            증상 키워드 진단 ({matchedSymptoms.length}건)
          </div>
          {matchedSymptoms.map(({ preset }) => (
            <div
              key={preset.title}
              onClick={() => onSelectSymptom(preset)}
              style={{
                padding: '8px 10px',
                borderRadius: 8,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: 13.5
              }}
            >
              <div>
                <strong style={{ color: '#0f172a' }}>{preset.title}</strong>{' '}
                <span style={{ color: '#64748b' }}>— {preset.symptom}</span>
              </div>
              <span
                style={{
                  color: preset.urgency === '긴급' ? '#dc2626' : '#059669',
                  fontWeight: 800,
                  whiteSpace: 'nowrap'
                }}
              >
                {preset.urgency}
              </span>
            </div>
          ))}
        </div>
      )}

      {matchedCustomers.length === 0 &&
        matchedModels.length === 0 &&
        matchedErrorCodes.length === 0 &&
        matchedSymptoms.length === 0 && (
          <div
            onClick={onExecuteComposite}
            style={{ padding: 12, fontSize: 13.5, color: '#475569', cursor: 'pointer' }}
          >
            Enter를 눌러 <strong>"{query}"</strong> 수동 증상 진단을 시작합니다.
          </div>
        )}
    </div>
  );
}

export function SimpleSessionListModal({
  title,
  records,
  onClose,
  onSelect
}: {
  title: string;
  records: ConsultSessionRecord[];
  onClose: () => void;
  onSelect: (rec: ConsultSessionRecord) => void;
}) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.55)',
        zIndex: 9500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#f5f2eb',
          borderRadius: 12,
          width: '100%',
          maxWidth: 680,
          maxHeight: '75vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid #cbd5e1'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div
          style={{
            padding: '14px 20px',
            background: '#0f172a',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 800 }}>{title}</span>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {records.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#64748b', fontSize: 14 }}>
              저장된 상담 내역이 없습니다.
            </div>
          ) : (
            records.map(r => (
              <div
                key={r.id}
                onClick={() => onSelect(r)}
                style={{
                  background: '#ffffff',
                  border: '1px solid #dcd5c9',
                  borderRadius: 8,
                  padding: '12px 16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontSize: 13.5,
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: 6,
                        background: r.status === 'in_progress' ? '#fffbeb' : '#ecfdf5',
                        color: r.status === 'in_progress' ? '#b45309' : '#047857',
                        border: r.status === 'in_progress' ? '1px solid #f59e0b' : '1px solid #10b981',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {r.status === 'in_progress'
                        ? `진행중 · ${r.currentStepSummary}`
                        : r.status === 'visit_required'
                        ? '상담완료 · AS 출장 접수'
                        : '상담완료 · 전화 조치 완료'}
                    </span>
                    <span style={{ fontSize: 14.5, fontWeight: 800, color: '#0f172a' }}>
                      {r.customerName} ({r.modelName})
                    </span>
                    <span style={{ fontSize: 13.5, color: '#64748b' }}>· {r.updatedAt.slice(0, 16).replace('T', ' ')}</span>
                  </div>
                  <div style={{ fontSize: 13.5, color: '#475569', marginTop: 4 }}>{r.summaryText}</div>
                </div>
                <span style={{ fontSize: 13.5, fontWeight: 800, color: '#2563eb', whiteSpace: 'nowrap' }}>불러오기 →</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
