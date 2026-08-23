import { useEffect, useState } from 'react';
import { useMobileStore, type VisitItem } from './store';
import './index.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

function App() {
  const {
    visits,
    parts,
    selectedVisit,
    isLoading,
    activeTab,
    engineerName,
    setVisits,
    setParts,
    setSelectedVisit,
    setLoading,
    setActiveTab,
  } = useMobileStore();

  const [selectedPartId, setSelectedPartId] = useState<string>("");
  const [partQty, setPartQty] = useState<number>(1);
  const [usedPartsList, setUsedPartsList] = useState<any[]>([]);
  const [workSummary, setWorkSummary] = useState<string>("");
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 목록 및 부품 조회
  const fetchVisits = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/visits`);
      if (res.ok) {
        const data = await res.json();
        setVisits(data);
      }
    } catch (e) {
      console.error("출장 목록 조회 실패", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchParts = async () => {
    try {
      const res = await fetch(`${API_BASE}/parts`);
      if (res.ok) {
        const data = await res.json();
        setParts(data);
      }
    } catch (e) {
      console.error("부품 목록 조회 실패", e);
    }
  };

  useEffect(() => {
    fetchVisits();
    fetchParts();
  }, []);

  // 상세 이동
  const handleOpenDetail = async (visit: VisitItem) => {
    setSelectedVisit(visit);
    setActiveTab('DETAIL');
    try {
      const res = await fetch(`${API_BASE}/visits/${visit.id}`);
      if (res.ok) {
        const data = await res.json();
        setUsedPartsList(data.used_parts || []);
      }
    } catch (e) {
      console.error("상세 조회 실패", e);
    }
  };

  // 상태 전이 (접수 -> 진행중)
  const handleStartWork = async () => {
    if (!selectedVisit) return;
    try {
      const res = await fetch(`${API_BASE}/visits/${selectedVisit.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "진행중",
          client_type: "mobile",
          changed_by_name: engineerName
        })
      });
      if (res.ok) {
        setSelectedVisit({ ...selectedVisit, status: "진행중" });
        fetchVisits();
      }
    } catch (e) {
      console.error("작업 시작 실패", e);
    }
  };

  // 부품 사용 등록
  const handleAddPart = async () => {
    if (!selectedVisit || !selectedPartId) return;
    try {
      const res = await fetch(`${API_BASE}/visits/${selectedVisit.id}/parts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          part_id: selectedPartId,
          quantity: partQty
        })
      });
      if (res.ok) {
        alert("부품이 등록되고 재고가 자동 차감되었습니다.");
        handleOpenDetail(selectedVisit);
        fetchParts();
      } else {
        const err = await res.json();
        alert(err.detail || "부품 등록 실패");
      }
    } catch (e) {
      console.error("부품 등록 실패", e);
    }
  };

  // 작업 완료 처리
  const handleCompleteWork = async () => {
    if (!selectedVisit) return;
    if (!workSummary.trim()) {
      alert("작업 완료 내용을 입력해 주세요.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/visits/${selectedVisit.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          engineer_name: engineerName,
          work_summary: workSummary,
          phone: selectedVisit.phone,
          customer_name: selectedVisit.customer_name,
          client_type: "mobile"
        })
      });
      if (res.ok) {
        alert("작업 완료 처리 및 고객 알림톡이 발송되었습니다.");
        setActiveTab('FEED');
        fetchVisits();
      }
    } catch (e) {
      console.error("작업 완료 실패", e);
    }
  };

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', minHeight: '100vh', backgroundColor: '#f9fafb', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column' }}>
      
      {/* 모바일 상단 헤더 */}
      <header style={{ padding: '16px', backgroundColor: '#1e293b', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>스페이스 정비 출장 포털</h1>
          <span style={{ fontSize: '12px', color: isOnline ? '#4ade80' : '#f87171' }}>
            ● {isOnline ? "온라인 연결됨" : "오프라인 모드"}
          </span>
        </div>
        <div style={{ fontSize: '14px', backgroundColor: '#334155', padding: '4px 10px', borderRadius: '16px' }}>
          {engineerName}
        </div>
      </header>

      {/* 탭 네비게이션 */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', backgroundColor: '#fff' }}>
        <button
          onClick={() => setActiveTab('FEED')}
          style={{
            flex: 1, padding: '12px', border: 'none', backgroundColor: 'transparent',
            fontWeight: activeTab === 'FEED' ? 'bold' : 'normal',
            borderBottom: activeTab === 'FEED' ? '2px solid #2563eb' : 'none',
            color: activeTab === 'FEED' ? '#2563eb' : '#64748b'
          }}
        >
          출장 피드
        </button>
        {selectedVisit && (
          <button
            onClick={() => setActiveTab('DETAIL')}
            style={{
              flex: 1, padding: '12px', border: 'none', backgroundColor: 'transparent',
              fontWeight: activeTab === 'DETAIL' ? 'bold' : 'normal',
              borderBottom: activeTab === 'DETAIL' ? '2px solid #2563eb' : 'none',
              color: activeTab === 'DETAIL' ? '#2563eb' : '#64748b'
            }}
          >
            현장 작업
          </button>
        )}
      </div>

      {/* 메인 컨텐츠 영역 */}
      <main style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
        {activeTab === 'FEED' ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#334155' }}>배정된 출장 목록 ({visits.length}건)</span>
              <button onClick={fetchVisits} style={{ padding: '4px 8px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#fff' }}>새로고침</button>
            </div>

            {isLoading ? (
              <p style={{ textAlign: 'center', color: '#64748b' }}>목록 조회 중...</p>
            ) : visits.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                배정된 출장 업무가 없습니다.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {visits.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleOpenDetail(item)}
                    style={{
                      backgroundColor: '#fff', padding: '16px', borderRadius: '8px',
                      border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '16px' }}>{item.customer_name}</span>
                      <span style={{
                        fontSize: '12px', padding: '2px 8px', borderRadius: '12px',
                        backgroundColor: item.status === '완료' ? '#dcfce7' : item.status === '진행중' ? '#fef3c7' : '#e0e7ff',
                        color: item.status === '완료' ? '#166534' : item.status === '진행중' ? '#854d0e' : '#3730a3',
                        fontWeight: 'bold'
                      }}>
                        {item.status}
                      </span>
                    </div>

                    <div style={{ fontSize: '13px', color: '#475569', marginBottom: '6px' }}>
                      📍 {item.address} {item.address_detail}
                    </div>

                    <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '10px' }}>
                      💬 {item.request_note || "요청 증상 없음"}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                      <a
                        href={`tel:${item.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        style={{ fontSize: '13px', color: '#2563eb', textDecoration: 'none', fontWeight: 'bold' }}
                      >
                        📞 전화걸기 ({item.phone})
                      </a>
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>{item.timestamp?.slice(5, 16)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* 상세 / 현장 작업 탭 */
          selectedVisit && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* 고객 기본 정보 */}
              <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '18px' }}>{selectedVisit.customer_name}</h3>
                  <span style={{ fontWeight: 'bold', color: '#2563eb' }}>{selectedVisit.status}</span>
                </div>
                <p style={{ margin: '4px 0', fontSize: '14px', color: '#475569' }}>📍 {selectedVisit.address} {selectedVisit.address_detail}</p>
                <p style={{ margin: '4px 0', fontSize: '14px', color: '#475569' }}>📞 {selectedVisit.phone}</p>
                <p style={{ margin: '8px 0 0 0', padding: '8px', backgroundColor: '#f8fafc', borderRadius: '4px', fontSize: '13px', color: '#334155' }}>
                  <strong>접수 증상:</strong> {selectedVisit.request_note}
                </p>
              </div>

              {/* 진행 상태 컨트롤 */}
              {selectedVisit.status === '접수' && (
                <button
                  onClick={handleStartWork}
                  style={{
                    padding: '14px', backgroundColor: '#2563eb', color: '#fff',
                    border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  🚀 현장 작업 시작
                </button>
              )}

              {selectedVisit.status === '진행중' && (
                <>
                  {/* 부품 사용 등록 카드 */}
                  <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '15px' }}>🔧 사용 부품 등록</h4>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                      <select
                        value={selectedPartId}
                        onChange={(e) => setSelectedPartId(e.target.value)}
                        style={{ flex: 2, padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                      >
                        <option value="">부품 선택 (현재고)</option>
                        {parts.map((p) => (
                          <option key={p.id} value={p.id}>{p.name} ({p.stock}개 남음)</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="1"
                        value={partQty}
                        onChange={(e) => setPartQty(parseInt(e.target.value) || 1)}
                        style={{ width: '60px', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                      />
                      <button
                        onClick={handleAddPart}
                        style={{ padding: '8px 12px', backgroundColor: '#475569', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}
                      >
                        추가
                      </button>
                    </div>

                    {usedPartsList.length > 0 && (
                      <div style={{ fontSize: '13px', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                        <span style={{ fontWeight: 'bold' }}>등록된 부품 내역:</span>
                        <ul style={{ paddingLeft: '20px', margin: '4px 0 0 0' }}>
                          {usedPartsList.map((up) => (
                            <li key={up.id}>{up.part_name} × {up.quantity}개</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* 작업 완료 및 알림톡 발송 폼 */}
                  <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '15px' }}>✅ 작업 완료 보고</h4>
                    <textarea
                      placeholder="수리/교체 작업 요약 내용을 입력하세요 (고객 완료 알림톡에 포함됩니다)"
                      value={workSummary}
                      onChange={(e) => setWorkSummary(e.target.value)}
                      rows={3}
                      style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box', marginBottom: '12px' }}
                    />
                    <button
                      onClick={handleCompleteWork}
                      style={{
                        width: '100%', padding: '14px', backgroundColor: '#16a34a', color: '#fff',
                        border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      출장 완료 및 알림톡 전송
                    </button>
                  </div>
                </>
              )}

              {selectedVisit.status === '완료' && (
                <div style={{ textAlign: 'center', padding: '24px', backgroundColor: '#f0fdf4', borderRadius: '8px', color: '#166534' }}>
                  <h4 style={{ margin: 0, fontSize: '18px' }}>🎉 수리 작업이 완료되었습니다</h4>
                  <p style={{ margin: '8px 0 0 0', fontSize: '13px' }}>고객 완료 알림톡이 정상 발송되었습니다.</p>
                </div>
              )}
            </div>
          )
        )}
      </main>
    </div>
  );
}

export default App;
