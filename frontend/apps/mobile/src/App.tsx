import { useEffect, useState, useRef } from 'react';
import { useMobileStore, type VisitItem } from './store';
import './index.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

interface EmployeeOption {
  id: string;
  name: string;
  phone?: string;
}

// usedPartsList 타입 정의 (any[] 제거)
interface UsedPart {
  id: string;
  part_name: string;
  quantity: number;
  unit_price?: number;
  timestamp?: string;
}

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
    setEngineerName,
  } = useMobileStore();

  const isMounted = useRef<boolean>(true); // 언마운트 후 setState 방지

  const [employeesList, setEmployeesList] = useState<EmployeeOption[]>([]);
  const [selectedPartId, setSelectedPartId] = useState<string>("");
  const [partSearchKeyword, setPartSearchKeyword] = useState<string>("");
  const [partQty, setPartQty] = useState<number>(1);
  const [usedPartsList, setUsedPartsList] = useState<UsedPart[]>([]); // 타입 명시
  const [workSummary, setWorkSummary] = useState<string>("");
  const [workPhotos, setWorkPhotos] = useState<string[]>([]);
  const [isCustomerSigned, setIsCustomerSigned] = useState<boolean>(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string>("");
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const showStatus = (text: string, isError = false) => {
    setStatusMessage({ text, isError });
    setTimeout(() => setStatusMessage(null), 3500);
  };


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

  // 캔버스 서명 드로잉 핸들러
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0f172a';
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    setIsCustomerSigned(true);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      setSignatureDataUrl(canvas.toDataURL('image/png'));
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsCustomerSigned(false);
    setSignatureDataUrl("");
  };

  // 사진 촬영 및 업로드 핸들러
  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setWorkPhotos((prev) => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
    showStatus("현장 정비 사진이 등록되었습니다.");
  };

  const handleRemovePhoto = (index: number) => {
    setWorkPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  // 목록, 부품, 기사 목록 조회
  const fetchVisits = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/visits`);
      if (res.ok) {
        const data = await res.json();
        if (isMounted.current) setVisits(data); // 언마운트 후 setState 방지
      }
    } catch (e) {
      console.error("출장 목록 조회 실패", e);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  const fetchParts = async () => {
    try {
      const res = await fetch(`${API_BASE}/parts?limit=500`); // 전체 부품 목록 조회
      if (res.ok) {
        const data = await res.json();
        if (isMounted.current) setParts(data); // 언마운트 후 setState 방지
      }
    } catch (e) {

      console.error("부품 목록 조회 실패", e);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch(`${API_BASE}/employees`);
      if (res.ok) {
        const data = await res.json();
        if (isMounted.current) {
          setEmployeesList(data);
          if (data.length > 0 && !engineerName) {
            setEngineerName(data[0].name);
          }
        }
      }
    } catch (e) {
      console.error("직원 목록 조회 실패", e);
    }
  };

  useEffect(() => {
    isMounted.current = true;
    fetchVisits();
    fetchParts();
    fetchEmployees();
    return () => {
      // 언마운트 시 플래그 해제 → 비동기 응답 후 setState 방지
      isMounted.current = false;
    };
  }, []);


  // 상세 보기 열기
  const handleOpenDetail = async (visit: VisitItem) => {
    setSelectedVisit(visit);
    setActiveTab('DETAIL');
    setIsCustomerSigned(false);
    setSignatureDataUrl("");
    setWorkPhotos([]);
    try {
      const res = await fetch(`${API_BASE}/visits/${visit.id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedVisit(data);
        if (data.parts) {
          setUsedPartsList(data.parts);
        }
      }
    } catch (e) {
      console.error("상세 조회 실패", e);
    }
  };

  // 상태 전이 (접수 -> 진행중)
  const handleStartWork = async () => {
    if (!selectedVisit || isSubmitting) return;
    setIsSubmitting(true);
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
        showStatus("작업 상태가 '진행중'으로 변경되었습니다.");
      }
    } catch (e) {
      console.error("작업 시작 실패", e);
      showStatus("작업 상태 변경 실패", true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 부품 사용 등록
  const handleAddPart = async () => {
    if (!selectedVisit || !selectedPartId || isSubmitting) {
      showStatus("사용 부품을 선택하십시오.", true);
      return;
    }
    if (partQty <= 0) {
      showStatus("부품 수량은 1개 이상이어야 합니다.", true);
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/visits/${selectedVisit.id}/parts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          part_id: selectedPartId,
          quantity: partQty,
          engineer_name: engineerName
        })
      });
      if (res.ok) {
        showStatus("부품 사용 등록 및 본사 재고 차감 완료");
        handleOpenDetail(selectedVisit);
        fetchParts();
        setPartQty(1);
        setSelectedPartId("");
      } else {
        const err = await res.json();
        showStatus(err.detail || "부품 등록 실패", true);
      }
    } catch (e) {
      console.error("부품 등록 실패", e);
      showStatus("부품 등록 통신 오류", true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 작업 완료 처리 (자필 캔버스 서명 연동)
  const handleCompleteWork = async () => {
    if (!selectedVisit || isSubmitting) return;
    if (!workSummary.trim()) {
      showStatus("수리 작업 요약 내용을 입력하십시오.", true);
      return;
    }
    if (!isCustomerSigned) {
      showStatus("고객 입회 확인 및 자필 서명이 필요합니다.", true);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/visits/${selectedVisit.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          engineer_name: engineerName,
          work_summary: workSummary,
          phone: selectedVisit.phone,
          customer_name: selectedVisit.customer_name,
          signature_data: signatureDataUrl || "SIGNED_VERIFIED_CANVAS",
          client_type: "mobile"
        })
      });
      if (res.ok) {
        showStatus("출장 완료 처리 및 알림톡 발송 완료");
        setActiveTab('FEED');
        fetchVisits();
      } else {
        const err = await res.json();
        showStatus(err.detail || "완료 처리 실패", true);
      }
    } catch (e) {
      console.error("작업 완료 실패", e);
      showStatus("완료 처리 통신 오류", true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 부품 검색 필터링
  const filteredParts = parts.filter(p => 
    !partSearchKeyword.trim() || 
    p.name.toLowerCase().includes(partSearchKeyword.toLowerCase())
  );

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif' }}>
      
      {/* 1. 모바일 헤더 (DB 연동 기사 목록) */}
      <header style={{ padding: '12px 16px', backgroundColor: '#0f172a', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>현장정비 관제 PWA</h2>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
            담당: <strong>{engineerName}</strong> | {isOnline ? '온라인 연결됨' : '오프라인 캐시 모드'}
          </div>
        </div>

        <select
          value={engineerName}
          onChange={(e) => setEngineerName(e.target.value)}
          style={{ padding: '6px 10px', borderRadius: '4px', backgroundColor: '#1e293b', color: '#fff', border: '1px solid #334155', fontSize: '13px' }}
        >
          {employeesList.length > 0 ? (
            employeesList.map((emp) => (
              <option key={emp.id} value={emp.name}>{emp.name}</option>
            ))
          ) : (
            <option value="김기사">김기사 (기본)</option>
          )}
        </select>
      </header>

      {/* 상태 알림 배너 */}
      {statusMessage && (
        <div style={{
          padding: '10px 16px',
          backgroundColor: statusMessage.isError ? '#fef2f2' : '#f0fdf4',
          color: statusMessage.isError ? '#991b1b' : '#166534',
          borderBottom: `1px solid ${statusMessage.isError ? '#fecaca' : '#bbf7d0'}`,
          fontSize: '13px',
          fontWeight: 600,
          textAlign: 'center'
        }}>
          {statusMessage.text}
        </div>
      )}

      {/* 2. 네비게이션 탭 바 */}
      <nav style={{ display: 'flex', backgroundColor: '#fff', borderBottom: '1px solid #e2e8f0' }}>
        <button
          onClick={() => setActiveTab('FEED')}
          style={{
            flex: 1, padding: '12px', border: 'none',
            borderBottom: activeTab === 'FEED' ? '3px solid #2563eb' : '3px solid transparent',
            backgroundColor: 'transparent',
            fontWeight: activeTab === 'FEED' ? 700 : 500,
            color: activeTab === 'FEED' ? '#2563eb' : '#64748b',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          출장 일정 ({visits.length})
        </button>

        {selectedVisit && (
          <button
            onClick={() => setActiveTab('DETAIL')}
            style={{
              flex: 1, padding: '12px', border: 'none',
              borderBottom: activeTab === 'DETAIL' ? '3px solid #2563eb' : '3px solid transparent',
              backgroundColor: 'transparent',
              fontWeight: activeTab === 'DETAIL' ? 700 : 500,
              color: activeTab === 'DETAIL' ? '#2563eb' : '#64748b',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            상세 작업
          </button>
        )}
      </nav>

      {/* 3. 본문 영역 */}
      <main style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
        {isLoading && <div style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>데이터 로딩 중...</div>}

        {/* [탭 1] 출장 일정 피드 */}
        {!isLoading && activeTab === 'FEED' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>오늘의 배정 출장</span>
              <button onClick={fetchVisits} style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                새로고침
              </button>
            </div>

            {visits.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 16px', backgroundColor: '#fff', borderRadius: '8px', color: '#94a3b8' }}>
                배정된 출장 일정이 없습니다.
              </div>
            ) : (
              visits.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleOpenDetail(item)}
                  tabIndex={0}
                  role="button"
                  aria-label={`출장 상세 보기: ${item.customer_name}`}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleOpenDetail(item); } }}
                  style={{
                    backgroundColor: '#fff',
                    padding: '16px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '16px', color: '#0f172a' }}>{item.customer_name}</span>

                    <span style={{
                      padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700,
                      backgroundColor: item.status === '완료' ? '#dcfce7' : item.status === '진행중' ? '#dbeafe' : '#fef3c7',
                      color: item.status === '완료' ? '#166534' : item.status === '진행중' ? '#1e40af' : '#92400e'
                    }}>
                      {item.status}
                    </span>
                  </div>

                  <div style={{ fontSize: '13px', color: '#475569' }}>📍 {item.address} {item.address_detail}</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>📞 {item.manager} ({item.phone})</div>
                  {item.request_note && (
                    <div style={{ fontSize: '12px', color: '#2563eb', backgroundColor: '#eff6ff', padding: '6px 8px', borderRadius: '4px', marginTop: '4px' }}>
                      {item.request_note}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* [탭 2] 상세 작업 화면 */}
        {!isLoading && activeTab === 'DETAIL' && selectedVisit && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* 고객 및 장비 기본 정보 카드 */}
            <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>{selectedVisit.customer_name}</h3>
                <span style={{
                  padding: '3px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 700,
                  backgroundColor: selectedVisit.status === '완료' ? '#dcfce7' : selectedVisit.status === '진행중' ? '#dbeafe' : '#fef3c7',
                  color: selectedVisit.status === '완료' ? '#166534' : selectedVisit.status === '진행중' ? '#1e40af' : '#92400e'
                }}>
                  {selectedVisit.status}
                </span>
              </div>

              <div style={{ fontSize: '13px', color: '#334155' }}>
                <div>📍 <strong>방문지:</strong> {selectedVisit.address} {selectedVisit.address_detail}</div>
                <div style={{ marginTop: '3px' }}>📞 <strong>고객 연락처:</strong> {selectedVisit.manager} ({selectedVisit.phone})</div>
                <div style={{ marginTop: '3px' }}>📋 <strong>접수 내용:</strong> {selectedVisit.request_note || '특이사항 없음'}</div>
              </div>

              <a
                href={`tel:${selectedVisit.phone}`}
                style={{
                  marginTop: '8px', padding: '10px', backgroundColor: '#0284c7', color: '#fff',
                  textAlign: 'center', borderRadius: '6px', textDecoration: 'none', fontWeight: 600, fontSize: '14px'
                }}
              >
                고객 전화 걸기 ({selectedVisit.phone})
              </a>
            </div>

            {/* 작업 상태별 액션 패널 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {selectedVisit.status === '접수' && (
                <button
                  onClick={handleStartWork}
                  disabled={isSubmitting}
                  style={{
                    width: '100%', padding: '14px', backgroundColor: '#2563eb', color: '#fff',
                    border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 700,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isSubmitting ? '처리 중...' : '현장 작업 시작'}
                </button>
              )}

              {selectedVisit.status === '진행중' && (
                <>
                  {/* 부품 사용 등록 카드 (검색 & 터치 Stepper 적용) */}
                  <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <h4 style={{ margin: '0', fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>부품 사용 등록</h4>
                    
                    {/* 부품 검색 필터 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>부품 품목 검색</label>
                      <input
                        type="text"
                        placeholder="부품명 또는 코드 입력 검색..."
                        value={partSearchKeyword}
                        onChange={(e) => setPartSearchKeyword(e.target.value)}
                        style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '16px', boxSizing: 'border-box' }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>부품 품목 선택</label>
                      <select
                        value={selectedPartId}
                        onChange={(e) => setSelectedPartId(e.target.value)}
                        style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '16px' }}
                      >
                        <option value="">부품 선택 (총 {filteredParts.length}개 품목)</option>
                        {filteredParts.map((p) => (
                          <option key={p.id} value={p.id}>{p.name} (재고: {p.stock}개)</option>
                        ))}
                      </select>
                    </div>

                    {/* 수량 터치 Stepper (장갑 착용 시 원터치 조작) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>사용 수량 (1개 이상)</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => setPartQty(Math.max(1, partQty - 1))}
                          style={{ width: '48px', height: '48px', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '6px', fontSize: '20px', fontWeight: 700, cursor: 'pointer' }}
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={partQty}
                          onChange={(e) => setPartQty(Math.max(1, parseInt(e.target.value) || 1))}
                          style={{ flex: 1, height: '48px', padding: '0 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '18px', textAlign: 'center', fontWeight: 700, boxSizing: 'border-box' }}
                        />
                        <button
                          type="button"
                          onClick={() => setPartQty(partQty + 1)}
                          style={{ width: '48px', height: '48px', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '6px', fontSize: '20px', fontWeight: 700, cursor: 'pointer' }}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={handleAddPart}
                      disabled={isSubmitting}
                      style={{ padding: '14px', backgroundColor: '#334155', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '15px', cursor: isSubmitting ? 'not-allowed' : 'pointer', marginTop: '4px' }}
                    >
                      {isSubmitting ? '등록 중...' : '부품 사용 내역 추가'}
                    </button>

                    {usedPartsList.length > 0 && (
                      <div style={{ fontSize: '13px', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>등록된 사용 부품:</span>
                        <ul style={{ paddingLeft: '20px', margin: '6px 0 0 0' }}>
                          {usedPartsList.map((up) => (
                            <li key={up.id} style={{ marginTop: '2px' }}>{up.part_name} × {up.quantity}개</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* 현장 정비 사진 등록 카드 (과제 8) */}
                  <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ margin: '0', fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>현장 사진 첨부 ({workPhotos.length}장)</h4>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        style={{ padding: '6px 12px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                      >
                        📷 사진 촬영 / 선택
                      </button>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      multiple
                      onChange={handlePhotoCapture}
                      style={{ display: 'none' }}
                    />

                    {workPhotos.length > 0 ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '6px' }}>
                        {workPhotos.map((photo, idx) => (
                          <div key={idx} style={{ position: 'relative', borderRadius: '6px', overflow: 'hidden', height: '80px', backgroundColor: '#e2e8f0' }}>
                            <img src={photo} alt={`현장사진-${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <button
                              type="button"
                              onClick={() => handleRemovePhoto(idx)}
                              style={{ position: 'absolute', top: '2px', right: '2px', backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', fontSize: '11px', cursor: 'pointer' }}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px dashed #cbd5e1', fontSize: '12px', color: '#64748b' }}>
                        등록된 현장 사진이 없습니다 (정비 전/후 사진 촬영 권장)
                      </div>
                    )}
                  </div>

                  {/* 작업 완료 보고 및 HTML5 자필 전자서명 캔버스 패드 */}
                  <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <h4 style={{ margin: '0', fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>작업 완료 보고 및 고객 서명</h4>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>수리/교체 작업 요약</label>
                      <textarea
                        placeholder="수리 및 부품 교체 완료 내역을 입력하십시오 (고객 알림톡에 기재됩니다)"
                        value={workSummary}
                        onChange={(e) => setWorkSummary(e.target.value)}
                        rows={3}
                        style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box', fontSize: '16px' }}
                      />
                    </div>

                    {/* HTML5 터치 자필 서명 패드 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>고객 입회 자필 서명</label>
                        <button
                          type="button"
                          onClick={clearSignature}
                          style={{ padding: '4px 8px', fontSize: '11px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          서명 지우기
                        </button>
                      </div>

                      <div style={{ border: '2px dashed #94a3b8', borderRadius: '6px', backgroundColor: '#f8fafc', overflow: 'hidden' }}>
                        <canvas
                          ref={canvasRef}
                          width={320}
                          height={120}
                          onMouseDown={startDrawing}
                          onMouseMove={draw}
                          onMouseUp={stopDrawing}
                          onMouseLeave={stopDrawing}
                          onTouchStart={startDrawing}
                          onTouchMove={draw}
                          onTouchEnd={stopDrawing}
                          style={{ width: '100%', height: '120px', display: 'block', touchAction: 'none', cursor: 'crosshair' }}
                        />
                      </div>
                      <span style={{ fontSize: '11px', color: isCustomerSigned ? '#16a34a' : '#64748b', textAlign: 'center', fontWeight: 600 }}>
                        {isCustomerSigned ? '✓ 고객 자필 서명 완료됨' : '위 사각 영역에 손가락으로 자필 서명하십시오.'}
                      </span>
                    </div>

                    <button
                      onClick={handleCompleteWork}
                      disabled={isSubmitting || !isCustomerSigned}
                      style={{
                        width: '100%', padding: '14px', backgroundColor: isCustomerSigned ? '#16a34a' : '#94a3b8', color: '#fff',
                        border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 700,
                        cursor: (isCustomerSigned && !isSubmitting) ? 'pointer' : 'not-allowed'
                      }}
                    >
                      {isSubmitting ? '처리 중...' : '출장 완료 및 알림톡 전송'}
                    </button>
                  </div>
                </>
              )}

              {selectedVisit.status === '완료' && (
                <div style={{ textAlign: 'center', padding: '24px', backgroundColor: '#f0fdf4', borderRadius: '8px', color: '#166534', fontWeight: 700 }}>
                  ✓ 본 출장 건은 정비 및 고객 확인이 정상 완료되었습니다.
                </div>
              )}
            </div>

          </div>
        )}
      </main>
    </div>
  );
}

export default App;
