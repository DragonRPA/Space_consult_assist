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
    return (
      <div style={{ border: `1px solid ${engine === 'nomic' ? '#ede9fe' : '#dbeafe'}`, borderRadius: 8, padding: '10px 12px', background: engine === 'nomic' ? '#faf5ff' : '#f8faff', display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: accent }}>{Math.round(r.similarity * 100)}%</span>
          {r.equipment_model && r.equipment_model !== 'null' && (
            <span style={{ fontSize: 11, color: '#475569', whiteSpace: 'nowrap' }}>{r.equipment_model}</span>
          )}
          {r.urgency && (
            <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, whiteSpace: 'nowrap', ...urgencyColor(r.urgency) }}>{r.urgency}</span>
          )}
          <div style={{ flex: 1 }} />
          <button onClick={() => handleExclude(r.id)} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#94a3b8', background: 'none', border: '1px solid #e2e8f0', borderRadius: 4, padding: '2px 6px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <X size={10} /> 제외
          </button>
        </div>
        {r.summary && <p style={{ fontSize: 12, color: '#334155', margin: 0, lineHeight: 1.5 }}>{r.summary}</p>}
        {r.symptoms?.filter(Boolean).length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {r.symptoms.filter(Boolean).map((s, i) => (
              <span key={i} style={{ fontSize: 11, background: engine === 'nomic' ? '#ede9fe' : '#eff6ff', color: engine === 'nomic' ? '#6d28d9' : '#1d4ed8', borderRadius: 4, padding: '1px 6px', whiteSpace: 'nowrap' }}>{s}</span>
            ))}
          </div>
        )}
        {r.action_items?.filter(Boolean).length > 0 && (
          <div style={{ borderTop: `1px solid ${engine === 'nomic' ? '#ede9fe' : '#dbeafe'}`, marginTop: 3, paddingTop: 3 }}>
            {r.action_items.filter(Boolean).slice(0, 3).map((a, i) => (
              <div key={i} style={{ fontSize: 11, color: engine === 'nomic' ? '#5b21b6' : '#1e40af', display: 'flex', alignItems: 'flex-start', gap: 3 }}>
                <ChevronRight size={11} style={{ marginTop: 2, flexShrink: 0 }} />
                <span>{a}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ fontFamily: "'Apple SD Gothic Neo','Malgun Gothic',sans-serif", minHeight: '100vh', background: '#f5f6f8' }}>
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 24, zIndex: 9999, background: '#1e293b', color: '#fff', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 500, boxShadow: '0 4px 16px rgba(0,0,0,0.18)' }}>{toast}</div>
      )}

      {/* 헤더 */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '0 24px', display: 'flex', alignItems: 'center', height: 48, gap: 12 }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: '#1e293b', whiteSpace: 'nowrap' }}>임베딩 비교</span>
        <div style={{ width: 1, height: 16, background: '#e2e8f0' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: '#ede9fe', color: '#6d28d9', whiteSpace: 'nowrap' }}>bge-m3 · 1024차원</span>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>vs</span>
          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: '#dbeafe', color: '#1d4ed8', whiteSpace: 'nowrap' }}>OpenAI · 1536차원</span>
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={() => { setQueryText(''); setResult(null); }} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: '1px solid #e2e8f0', borderRadius: 6, padding: '4px 10px', fontSize: 12, color: '#64748b', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          <RotateCcw size={12} /> 초기화
        </button>
      </div>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ① 쿼리 입력 (좌상단 Start) */}
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap' }}>검색 쿼리</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={queryText}
                onChange={e => setQueryText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="비교할 증상을 입력하세요 (Enter)"
                style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 14, outline: 'none', height: 40, boxSizing: 'border-box' }}
              />
              <button
                onClick={handleSearch}
                disabled={isLoading || !queryText.trim()}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1e293b', color: '#fff', border: 'none', borderRadius: 8, padding: '0 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', height: 40, opacity: isLoading || !queryText.trim() ? 0.5 : 1 }}
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
            <div style={{ background: '#faf5ff', border: '1px solid #ede9fe', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: result.nomic_ready ? '#7c3aed' : '#cbd5e1' }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap' }}>bge-m3 (BAAI)</div>
                <div style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap' }}>1024차원 · 로컬 Ollama · {result.nomic_count.toLocaleString()}건 임베딩</div>
              </div>
              {!result.nomic_ready && <span style={{ fontSize: 11, color: '#f59e0b', whiteSpace: 'nowrap' }}>준비 중</span>}
            </div>
            <div style={{ background: '#f8faff', border: '1px solid #dbeafe', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: result.openai_ready ? '#2563eb' : '#cbd5e1' }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap' }}>OpenAI text-embedding-3-small</div>
                <div style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap' }}>1536차원 · 클라우드 · {result.openai_count.toLocaleString()}건 임베딩</div>
              </div>
              {!result.openai_ready && <span style={{ fontSize: 11, color: '#f59e0b', whiteSpace: 'nowrap' }}>준비 중</span>}
            </div>
          </div>
        )}

        {/* ③ 비교 결과 (Body) */}
        {result && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {/* bge-m3 결과 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed', whiteSpace: 'nowrap' }}>bge-m3 결과</label>
                <span style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap' }}>{result.nomic_results.length}건</span>
              </div>
              {result.nomic_ready ? (
                result.nomic_results.length > 0 ? (
                  result.nomic_results.map(r => <ResultCard key={r.id} r={r} engine="nomic" />)
                ) : (
                  <div style={{ padding: 20, textAlign: 'center', color: '#cbd5e1', fontSize: 13 }}>일치 결과 없음</div>
                )
              ) : (
                <div style={{ padding: 20, textAlign: 'center', color: '#c4b5fd', fontSize: 13, background: '#faf5ff', borderRadius: 8, border: '1px dashed #ede9fe' }}>임베딩 배치 완료 후 활성화</div>
              )}
            </div>

            {/* OpenAI 결과 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#2563eb', whiteSpace: 'nowrap' }}>OpenAI 결과</label>
                <span style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap' }}>{result.openai_results.length}건</span>
              </div>
              {result.openai_ready ? (
                result.openai_results.length > 0 ? (
                  result.openai_results.map(r => <ResultCard key={r.id} r={r} engine="openai" />)
                ) : (
                  <div style={{ padding: 20, textAlign: 'center', color: '#cbd5e1', fontSize: 13 }}>일치 결과 없음</div>
                )
              ) : (
                <div style={{ padding: 20, textAlign: 'center', color: '#93c5fd', fontSize: 13, background: '#f8faff', borderRadius: 8, border: '1px dashed #dbeafe' }}>OpenAI 임베딩 배치 완료 후 활성화</div>
              )}
            </div>
          </div>
        )}

        {!result && !isLoading && (
          <div style={{ padding: 40, textAlign: 'center', color: '#cbd5e1', fontSize: 14 }}>증상을 입력하고 비교 검색을 실행하세요</div>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input:focus { border-color: #93c5fd !important; box-shadow: 0 0 0 3px rgba(59,130,246,0.12); }
      `}</style>
    </div>
  );
}
