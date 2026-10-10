import { useState } from 'react';
import { Search, X, ChevronRight, Loader2, RotateCcw } from 'lucide-react';

const API = 'http://127.0.0.1:8000/api/v1';

interface KbResult {
  id: string;
  summary: string;
  equipment_model: string;
  symptoms: string[];
  parts_mentioned: string[];
  action_items: string[];
  urgency: string;
  similarity: number;
}

interface CompareResult {
  query: string;
  nomic_results: KbResult[];
  openai_results: KbResult[];
  nomic_ready: boolean;
  openai_ready: boolean;
  nomic_count: number;
  openai_count: number;
}

export default function CounselCompare() {
  const [queryText, setQueryText] = useState('');
  const [result, setResult] = useState<CompareResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleSearch = async () => {
    if (!queryText.trim()) return;
    setIsLoading(true);
    setResult(null);
    try {
      const res = await fetch(`${API}/counsel/kb-compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: queryText, limit: 5 }),
      });
      if (res.ok) {
        setResult(await res.json());
      } else {
        showToast('검색 실패');
      }
    } catch {
      showToast('서버 연결 실패');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExclude = async (id: string) => {
    try {
      await fetch(`${API}/counsel/knowledge/${id}/exclude`, { method: 'PATCH' });
      setExcludedIds(prev => new Set([...prev, id]));
      showToast('제외 처리됨');
    } catch {
      showToast('제외 실패');
    }
  };

  const urgencyColor = (u: string) => {
    if (u === '긴급') return { bg: '#fee2e2', color: '#b91c1c' };
    if (u === '보통') return { bg: '#fef3c7', color: '#92400e' };
    return { bg: '#f1f5f9', color: '#64748b' };
  };

  const ResultCard = ({ r, engine }: { r: KbResult; engine: 'nomic' | 'openai' }) => {
    if (excludedIds.has(r.id)) return null;
    const accent = engine === 'nomic' ? '#7c3aed' : '#2563eb';
    const borderColor = engine === 'nomic' ? '#e9d5ff' : '#dbeafe';
    const bgColor = engine === 'nomic' ? '#faf5ff' : '#f8faff';
    return (
      <div style={{ border: `1px solid ${borderColor}`, borderRadius: 8, padding: '12px 14px', background: bgColor, display: 'flex', flexDirection: 'column', gap: 6, boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: accent }}>{Math.round(r.similarity * 100)}%</span>
          {r.equipment_model && r.equipment_model !== 'null' && (
            <span style={{ fontSize: 13.5, fontWeight: 600, color: '#334155', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 4, padding: '2px 8px', whiteSpace: 'nowrap' }}>{r.equipment_model}</span>
          )}
          {r.urgency && (
            <span style={{ fontSize: 13.5, fontWeight: 600, padding: '2px 8px', borderRadius: 4, whiteSpace: 'nowrap', ...urgencyColor(r.urgency) }}>{r.urgency}</span>
          )}
          <div style={{ flex: 1 }} />
          <button onClick={() => handleExclude(r.id)} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13.5, fontWeight: 500, color: '#64748b', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 4, padding: '3px 10px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <X size={12} /> 제외
          </button>
        </div>
        {r.summary && <p style={{ fontSize: 14, color: '#1e293b', margin: 0, lineHeight: 1.5, fontWeight: 500 }}>{r.summary}</p>}
        {r.symptoms?.filter(Boolean).length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {r.symptoms.filter(Boolean).map((s, i) => (
              <span key={i} style={{ fontSize: 13.5, background: engine === 'nomic' ? '#ede9fe' : '#eff6ff', color: engine === 'nomic' ? '#6d28d9' : '#1d4ed8', border: `1px solid ${engine === 'nomic' ? '#ddd6fe' : '#bfdbfe'}`, borderRadius: 4, padding: '2px 8px', whiteSpace: 'nowrap' }}>{s}</span>
            ))}
          </div>
        )}
        {r.action_items?.filter(Boolean).length > 0 && (
          <div style={{ borderTop: `1px solid ${borderColor}`, marginTop: 4, paddingTop: 6 }}>
            {r.action_items.filter(Boolean).slice(0, 3).map((a, i) => (
              <div key={i} style={{ fontSize: 13.5, color: engine === 'nomic' ? '#5b21b6' : '#1e40af', display: 'flex', alignItems: 'flex-start', gap: 4, lineHeight: 1.4 }}>
                <ChevronRight size={13} style={{ marginTop: 2, flexShrink: 0 }} />
                <span>{a}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ fontFamily: "Pretendard, -apple-system, sans-serif", minHeight: 'calc(100vh - 48px)', background: '#f8fafc', color: '#0f172a' }}>
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 24, zIndex: 9999, background: '#0f172a', color: '#ffffff', borderRadius: 6, padding: '8px 16px', fontSize: 13.5, fontWeight: 600, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>{toast}</div>
      )}

      {/* 헤더 */}
      <div style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '0 24px', display: 'flex', alignItems: 'center', height: 48, gap: 12 }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', whiteSpace: 'nowrap' }}>임베딩 모델 비교</span>
        <div style={{ width: 1, height: 16, background: '#e2e8f0' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13.5, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: '#f3e8ff', color: '#7e22ce', border: '1px solid #e9d5ff', whiteSpace: 'nowrap' }}>bge-m3 · 1024차원</span>
          <span style={{ fontSize: 13.5, color: '#94a3b8' }}>대</span>
          <span style={{ fontSize: 13.5, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #dbeafe', whiteSpace: 'nowrap' }}>OpenAI · 1536차원</span>
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={() => { setQueryText(''); setResult(null); }} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 6, padding: '4px 10px', fontSize: 13.5, fontWeight: 500, color: '#475569', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          <RotateCcw size={13} /> 초기화
        </button>
      </div>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ① 쿼리 입력 (좌상단 Start) */}
        <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13.5, fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>비교 증상 검색어</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={queryText}
                onChange={e => setQueryText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="비교할 증상 또는 키워드를 입력하세요 (Enter)"
                style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: 6, padding: '8px 12px', fontSize: 14, outline: 'none', height: 38, boxSizing: 'border-box' }}
              />
              <button
                onClick={handleSearch}
                disabled={isLoading || !queryText.trim()}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#2563eb', color: '#ffffff', border: 'none', borderRadius: 6, padding: '0 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', height: 38, opacity: isLoading || !queryText.trim() ? 0.5 : 1, transition: 'background-color 0.15s' }}
                onMouseEnter={(e) => { if (!isLoading && queryText.trim()) e.currentTarget.style.backgroundColor = '#1d4ed8'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#2563eb'; }}
              >
                {isLoading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Search size={14} />}
                비교 검색
              </button>
            </div>
          </div>
        </div>

        {/* ② 임베딩 현황 카드 */}
        {result && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: result.nomic_ready ? '#7c3aed' : '#cbd5e1' }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>bge-m3 (BAAI)</div>
                <div style={{ fontSize: 13.5, color: '#64748b', whiteSpace: 'nowrap' }}>1024차원 · 로컬 Ollama · {result.nomic_count.toLocaleString()}건 임베딩</div>
              </div>
              {!result.nomic_ready && <span style={{ fontSize: 13.5, fontWeight: 600, color: '#f59e0b', whiteSpace: 'nowrap' }}>준비 중</span>}
            </div>
            <div style={{ background: '#f8faff', border: '1px solid #dbeafe', borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: result.openai_ready ? '#2563eb' : '#cbd5e1' }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>OpenAI text-embedding-3-small</div>
                <div style={{ fontSize: 13.5, color: '#64748b', whiteSpace: 'nowrap' }}>1536차원 · 클라우드 · {result.openai_count.toLocaleString()}건 임베딩</div>
              </div>
              {!result.openai_ready && <span style={{ fontSize: 13.5, fontWeight: 600, color: '#f59e0b', whiteSpace: 'nowrap' }}>준비 중</span>}
            </div>
          </div>
        )}

        {/* ③ 비교 결과 (Body) */}
        {result && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {/* bge-m3 결과 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 2px' }}>
                <label style={{ fontSize: 13.5, fontWeight: 700, color: '#7c3aed', whiteSpace: 'nowrap' }}>bge-m3 결과</label>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap' }}>{result.nomic_results.length}건</span>
              </div>
              {result.nomic_ready ? (
                result.nomic_results.length > 0 ? (
                  result.nomic_results.map(r => <ResultCard key={r.id} r={r} engine="nomic" />)
                ) : (
                  <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 14, background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0' }}>일치 결과 없음</div>
                )
              ) : (
                <div style={{ padding: 24, textAlign: 'center', color: '#7c3aed', fontSize: 14, background: '#faf5ff', borderRadius: 8, border: '1px dashed #e9d5ff' }}>임베딩 배치 완료 후 활성화</div>
              )}
            </div>

            {/* OpenAI 결과 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 2px' }}>
                <label style={{ fontSize: 13.5, fontWeight: 700, color: '#2563eb', whiteSpace: 'nowrap' }}>OpenAI 결과</label>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap' }}>{result.openai_results.length}건</span>
              </div>
              {result.openai_ready ? (
                result.openai_results.length > 0 ? (
                  result.openai_results.map(r => <ResultCard key={r.id} r={r} engine="openai" />)
                ) : (
                  <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 14, background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0' }}>일치 결과 없음</div>
                )
              ) : (
                <div style={{ padding: 24, textAlign: 'center', color: '#2563eb', fontSize: 14, background: '#f8faff', borderRadius: 8, border: '1px dashed #dbeafe' }}>OpenAI 임베딩 배치 완료 후 활성화</div>
              )}
            </div>
          </div>
        )}

        {!result && !isLoading && (
          <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8', fontSize: 14, background: '#ffffff', borderRadius: 8, border: '1px dashed #cbd5e1' }}>비교할 증상을 입력하고 비교 검색을 실행하세요</div>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input:focus { border-color: #2563eb !important; box-shadow: 0 0 0 2px rgba(37,99,235,0.15); }
      `}</style>
    </div>
  );
}
