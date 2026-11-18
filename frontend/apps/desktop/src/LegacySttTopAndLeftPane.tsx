import type { Dispatch, MutableRefObject, RefObject, SetStateAction } from 'react';
import {
  CheckCircle2,
  Clock,
  FileText,
  Mic,
  MicOff,
  Package,
  PhoneCall,
  Search,
  Upload,
  Volume2,
  Wrench,
} from 'lucide-react';
import type { KeywordEntity } from './keywordRegistryData';
import type { CustomerInfo, MatchedDiagnosis } from './store';
import { formatTimer, type ConfirmedSlotsState } from './sttAudioDsp';

export interface LegacySttTopStripProps {
  selectedCustomer: CustomerInfo | null;
  confirmedSlots: ConfirmedSlotsState;
  cleanModelCode: string;
  activeKeywordEntity: KeywordEntity | null;
  matchedDiagnosis: MatchedDiagnosis | null;
  isCallActive: boolean;
  callSeconds: number;
  tempoBadgeText: string;
  recognitionRef: MutableRefObject<any>;
  sttEngine: 'whisper_large_v3' | 'naver_clova' | 'web_speech';
  setSttEngine: (engine: 'whisper_large_v3' | 'naver_clova' | 'web_speech') => void;
  setInterimSttText: (text: string) => void;
  isAudioPlaying: boolean;
  isRecording: boolean;
  toggleManualStt: () => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
  setIsArchiveModalOpen: Dispatch<SetStateAction<boolean>>;
  setIsMicTestOpen: Dispatch<SetStateAction<boolean>>;
}

export function LegacySttTopStrip({
  selectedCustomer,
  confirmedSlots,
  cleanModelCode,
  activeKeywordEntity,
  matchedDiagnosis,
  isCallActive,
  callSeconds,
  tempoBadgeText,
  recognitionRef,
  sttEngine,
  setSttEngine,
  setInterimSttText,
  isAudioPlaying,
  isRecording,
  toggleManualStt,
  fileInputRef,
  setIsArchiveModalOpen,
  setIsMicTestOpen,
}: LegacySttTopStripProps) {
  return (
    <div style={{
      height: '44px',
      borderBottom: '1px solid var(--hairline)',
      backgroundColor: 'var(--surface-1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 12px',
      gap: '10px',
      flexShrink: 0,
      overflowX: 'auto'
    }}>
      {/* Left: 5 Auto-Confirmed Information Slots */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, whiteSpace: 'nowrap' }}>
        <span style={{
          fontSize: '12px',
          fontWeight: 800,
          color: confirmedSlots.confirmedCount === 5 ? '#047857' : '#1d4ed8',
          backgroundColor: confirmedSlots.confirmedCount === 5 ? '#d1fae5' : '#dbeafe',
          padding: '3px 8px',
          borderRadius: '4px',
          whiteSpace: 'nowrap'
        }}>
          자동확인 {confirmedSlots.confirmedCount}/5
        </span>

        {[
          { key: 'customer', label: '고객사', value: selectedCustomer?.name ? selectedCustomer.name.replace(/\s*\(.*?\)/g, '') : '대기', ok: confirmedSlots.customer },
          { key: 'phone', label: '연락처', value: selectedCustomer?.phone || '대기', ok: confirmedSlots.phone },
          { key: 'address', label: '현장위치', value: (selectedCustomer?.addressDetail?.split('/')[0]?.trim() || selectedCustomer?.address) || '대기', ok: confirmedSlots.address },
          { key: 'model', label: '모델', value: cleanModelCode || '대기', ok: confirmedSlots.model },
          { key: 'symptom', label: '증상', value: activeKeywordEntity?.keyword || matchedDiagnosis?.category || '대기', ok: confirmedSlots.symptom },
        ].map((slot) => (
          <div
            key={slot.key}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '3px 8px',
              borderRadius: '4px',
              backgroundColor: slot.ok ? '#f0fdf4' : 'var(--surface-2)',
              border: `1px solid ${slot.ok ? '#86efac' : 'var(--hairline)'}`,
              fontSize: '12px',
              whiteSpace: 'nowrap'
            }}
          >
            <span style={{
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              backgroundColor: slot.ok ? '#10b981' : '#cbd5e1',
              color: '#fff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '9px',
              fontWeight: 800,
              flexShrink: 0
            }}>
              {slot.ok ? '✓' : '·'}
            </span>
            <span style={{ color: 'var(--ink-muted)', fontWeight: 600 }}>{slot.label}</span>
            <strong style={{
              color: slot.ok ? '#065f46' : 'var(--ink-subtle)',
              fontWeight: 700,
              maxWidth: '125px',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {slot.value}
            </strong>
          </div>
        ))}
      </div>

      {/* Right: Unified Audio / STT / Timer Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, whiteSpace: 'nowrap' }}>
        {/* Call Timer */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '4px 9px',
          borderRadius: '5px',
          backgroundColor: isCallActive ? '#fef2f2' : 'var(--surface-2)',
          border: `1px solid ${isCallActive ? '#fca5a5' : 'var(--hairline)'}`,
          color: isCallActive ? '#dc2626' : 'var(--ink-muted)',
          fontSize: '12.5px',
          fontWeight: 700,
          whiteSpace: 'nowrap'
        }}>
          <PhoneCall size={12} className={isCallActive ? "animate-pulse" : ""} />
          <span className="font-mono">{formatTimer(callSeconds)}</span>
        </div>

        {/* Adaptive Speaker Tempo Status Pill */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '4px 8px',
          borderRadius: '5px',
          backgroundColor: tempoBadgeText.startsWith('박자 빠름')
            ? '#eff6ff'
            : tempoBadgeText.startsWith('박자 느림')
            ? '#fefce8'
            : 'var(--surface-2)',
          border: `1px solid ${
            tempoBadgeText.startsWith('박자 빠름')
              ? '#93c5fd'
              : tempoBadgeText.startsWith('박자 느림')
              ? '#fde047'
              : 'var(--hairline)'
          }`,
          color: tempoBadgeText.startsWith('박자 빠름')
            ? '#1d4ed8'
            : tempoBadgeText.startsWith('박자 느림')
            ? '#854d0e'
            : 'var(--ink-muted)',
          fontSize: '11.5px',
          fontWeight: 700,
          whiteSpace: 'nowrap'
        }}>
          <Clock size={11} />
          <span>{tempoBadgeText}</span>
        </div>

        {/* Engine Selector */}
        <div style={{
          display: 'inline-flex',
          backgroundColor: '#e2e8f0',
          padding: '2px',
          borderRadius: '5px',
          border: '1px solid #cbd5e1',
          gap: '2px'
        }}>
          <button
            title="Groq Whisper (whisper-large-v3-turbo): LPU 기반 초고속 한국어 음성 인식 및 직전문맥·도메인 단어 프롬프트 지원"
            onClick={() => {
              if (recognitionRef.current) {
                try { recognitionRef.current.stop(); } catch {}
              }
              setSttEngine('whisper_large_v3');
            }}
            style={{
              padding: '3px 8px',
              fontSize: '11.5px',
              fontWeight: 700,
              color: sttEngine === 'whisper_large_v3' ? '#fff' : '#334155',
              backgroundColor: sttEngine === 'whisper_large_v3' ? '#ea580c' : 'transparent',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            Groq Whisper
          </button>
          <button
            title="웹 음성 STT (Web Speech API): 브라우저 내장 실시간 스트리밍 음성 인식"
            onClick={() => {
              setSttEngine('web_speech');
              setInterimSttText('');
              if (isAudioPlaying && recognitionRef.current) {
                try { recognitionRef.current.start(); } catch {}
              }
            }}
            style={{
              padding: '3px 8px',
              fontSize: '11.5px',
              fontWeight: 700,
              color: sttEngine === 'web_speech' ? '#fff' : '#334155',
              backgroundColor: sttEngine === 'web_speech' ? '#1d4ed8' : 'transparent',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            웹 음성 STT
          </button>
          <button
            disabled
            title="클로바 STT: 응답 속도 및 정확도 이슈로 현재 비활성화됨"
            style={{
              padding: '3px 8px',
              fontSize: '11.5px',
              fontWeight: 700,
              color: '#94a3b8',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '4px',
              cursor: 'not-allowed',
              opacity: 0.55,
              whiteSpace: 'nowrap'
            }}
          >
            클로바 STT
          </button>
        </div>

        {/* STT Toggle */}
        <button
          onClick={toggleManualStt}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 10px',
            borderRadius: '5px',
            border: 'none',
            backgroundColor: isRecording ? '#dc2626' : '#059669',
            color: '#fff',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          {isRecording ? <MicOff size={12} /> : <Mic size={12} />}
          <span>{isRecording ? 'STT 중지' : 'STT 시작'}</span>
        </button>

        {/* Open Audio File */}
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 10px',
            borderRadius: '5px',
            border: '1px solid var(--hairline)',
            backgroundColor: 'var(--surface-2)',
            color: 'var(--ink)',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          <Upload size={12} />
          <span>음성파일 열기</span>
        </button>

        {/* STT & AI Archive History */}
        <button
          onClick={() => setIsArchiveModalOpen(true)}
          title="열어본 음성파일 · STT 추출텍스트 · AI 결론 DB 기록 보관함"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 10px',
            borderRadius: '5px',
            border: '1px solid #93c5fd',
            backgroundColor: '#eff6ff',
            color: '#1e3a8a',
            fontSize: '12px',
            fontWeight: 800,
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          <FileText size={12} />
          <span>파일·STT 기록</span>
        </button>

        {/* Mic Check */}
        <button
          onClick={() => setIsMicTestOpen(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 8px',
            borderRadius: '5px',
            border: '1px solid var(--hairline)',
            backgroundColor: 'var(--surface-2)',
            color: 'var(--ink-muted)',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          <Volume2 size={12} />
          <span>마이크</span>
        </button>
      </div>
    </div>
  );
}

export interface LegacySttPanelAProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchDropdownOpen: boolean;
  setSearchDropdownOpen: Dispatch<SetStateAction<boolean>>;
  selectedSearchIndex: number;
  setSelectedSearchIndex: Dispatch<SetStateAction<number>>;
  customerList: CustomerInfo[];
  selectedCustomer: CustomerInfo | null;
  selectCustomer: (c: CustomerInfo | null) => void;
  setConfirmedSlotFlags: Dispatch<
    SetStateAction<{ customer: boolean; phone: boolean; address: boolean; model: boolean }>
  >;
  cleanModelCode: string;
  setSelectedCustomerModel: (modelName: string) => void;
  recommendedClosingAction: 'NONE' | 'PARTS_QUOTE' | 'DISPATCH' | 'RESOLVED';
  setIsManualModalOpen: Dispatch<SetStateAction<boolean>>;
  setIsSelfGuideModalOpen: Dispatch<SetStateAction<boolean>>;
  setIsPartsQuoteModalOpen: Dispatch<SetStateAction<boolean>>;
  setIsDispatchDocModalOpen: Dispatch<SetStateAction<boolean>>;
}

export function LegacySttPanelA({
  searchQuery,
  setSearchQuery,
  searchDropdownOpen,
  setSearchDropdownOpen,
  selectedSearchIndex,
  setSelectedSearchIndex,
  customerList,
  selectedCustomer,
  selectCustomer,
  setConfirmedSlotFlags,
  cleanModelCode,
  setSelectedCustomerModel,
  recommendedClosingAction,
  setIsManualModalOpen,
  setIsSelfGuideModalOpen,
  setIsPartsQuoteModalOpen,
  setIsDispatchDocModalOpen,
}: LegacySttPanelAProps) {
  return (
    <section style={{
      width: '25%',
      minHeight: 0,
      backgroundColor: 'var(--surface-1)',
      border: '1px solid var(--hairline)',
      borderRadius: '8px',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Customer Search */}
      <div style={{ padding: '10px', borderBottom: '1px solid var(--hairline)', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--ink-muted)', whiteSpace: 'nowrap' }}>
          고객사·현장 검색
        </label>
        <div style={{ position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: '9px', top: '9px', color: 'var(--ink-subtle)' }} />
          <input
            type="text"
            placeholder="고객사, 담당자, 연락처, 주소 검색"
            value={searchQuery}
            onFocus={() => {
              setSearchDropdownOpen(true);
              setSelectedSearchIndex(-1);
            }}
            onKeyDown={(e) => {
              if (!searchDropdownOpen || customerList.length === 0) return;
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedSearchIndex((prev) => (prev < customerList.length - 1 ? prev + 1 : 0));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedSearchIndex((prev) => (prev > 0 ? prev - 1 : customerList.length - 1));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                const targetCust = selectedSearchIndex >= 0 ? customerList[selectedSearchIndex] : customerList[0];
                if (targetCust) {
                  selectCustomer(targetCust);
                  setConfirmedSlotFlags({ customer: true, phone: true, address: true, model: true });
                  setSearchDropdownOpen(false);
                  setSelectedSearchIndex(-1);
                }
              } else if (e.key === 'Escape') {
                setSearchDropdownOpen(false);
                setSelectedSearchIndex(-1);
              }
            }}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSelectedSearchIndex(-1);
            }}
            style={{
              width: '100%',
              padding: '6px 8px 6px 28px',
              backgroundColor: 'var(--surface-2)',
              border: '1px solid var(--hairline)',
              borderRadius: '5px',
              color: 'var(--ink)',
              fontSize: '13px',
              outline: 'none'
            }}
          />
          {searchDropdownOpen && (
            <div style={{
              position: 'absolute',
              top: '36px',
              left: 0,
              right: 0,
              backgroundColor: 'var(--surface-1)',
              border: '1px solid var(--hairline)',
              borderRadius: '6px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
              zIndex: 50,
              maxHeight: '210px',
              overflowY: 'auto'
            }}>
              {customerList.map((cust, idx) => (
                <div
                  key={cust.id}
                  onClick={() => {
                    selectCustomer(cust);
                    setConfirmedSlotFlags({ customer: true, phone: true, address: true, model: true });
                    setSearchDropdownOpen(false);
                    setSelectedSearchIndex(-1);
                  }}
                  style={{
                    padding: '7px 10px',
                    borderBottom: '1px solid var(--hairline)',
                    cursor: 'pointer',
                    fontSize: '12.5px',
                    backgroundColor: idx === selectedSearchIndex ? 'var(--surface-hover)' : 'transparent'
                  }}
                  onMouseEnter={() => setSelectedSearchIndex(idx)}
                >
                  <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{cust.name}</div>
                  <div style={{ color: 'var(--ink-muted)', fontSize: '11.5px' }}>{cust.manager} · {cust.phone} · {cust.assetModel.split(' ')[0]}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Customer + Equipment Consolidated Dossier */}
      <div style={{ flex: 1, minHeight: 0, padding: '10px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ backgroundColor: 'var(--surface-2)', padding: '10px', borderRadius: '6px', border: '1px solid var(--hairline)', display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontWeight: 800, fontSize: '14px', color: selectedCustomer?.name ? 'var(--ink)' : 'var(--ink-subtle)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {selectedCustomer?.name || '고객사 미선택'}
            </span>
            {selectedCustomer?.salesType && selectedCustomer.salesType !== '미확인' && (
              <span style={{ fontSize: '11.5px', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'var(--badge-bg)', color: 'var(--badge-text)', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
                {selectedCustomer.salesType}
              </span>
            )}
          </div>

          <div style={{ fontSize: '12.5px', color: 'var(--ink-muted)', display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              <span style={{ color: 'var(--ink-subtle)', marginRight: 6 }}>담당자</span>
              <strong style={{ color: selectedCustomer?.manager ? 'var(--ink)' : 'var(--ink-subtle)' }}>
                {selectedCustomer?.manager || '-'}
              </strong>
              {selectedCustomer?.phone ? ` (${selectedCustomer.phone})` : ''}
            </div>
            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              <span style={{ color: 'var(--ink-subtle)', marginRight: 6 }}>도로명</span>
              <span style={{ color: selectedCustomer?.address ? 'var(--ink)' : 'var(--ink-subtle)' }}>
                {selectedCustomer?.address || '-'}
              </span>
            </div>
            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              <span style={{ color: 'var(--ink-subtle)', marginRight: 6 }}>상세위치</span>
              <strong style={{ color: selectedCustomer?.addressDetail ? '#b45309' : 'var(--ink-subtle)' }}>
                {selectedCustomer?.addressDetail || '-'}
              </strong>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--hairline)', paddingTop: '6px', marginTop: '2px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
              <span style={{ fontSize: '11px', color: 'var(--ink-subtle)', fontWeight: 600 }}>보유 장비 · 보증</span>
              <strong style={{ fontSize: '13px', color: selectedCustomer?.assetModel ? 'var(--ink)' : 'var(--ink-subtle)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {selectedCustomer?.assetModel || '장비 미선택'}
              </strong>
              {selectedCustomer?.serialNumber && (
                <span style={{ fontSize: '11.5px', color: 'var(--accent-warning)', fontWeight: 700 }}>
                  {selectedCustomer.warrantyRemaining} · {selectedCustomer.serialNumber}
                </span>
              )}
            </div>
            <select
              value={cleanModelCode}
              onChange={(e) => {
                setSelectedCustomerModel(e.target.value);
                setConfirmedSlotFlags(prev => ({ ...prev, model: Boolean(e.target.value) }));
              }}
              title="장비 모델 선택"
              style={{
                padding: '4px 6px',
                fontSize: '12px',
                fontWeight: 700,
                borderRadius: '4px',
                border: '1px solid var(--hairline)',
                backgroundColor: 'var(--surface-1)',
                color: 'var(--ink)',
                cursor: 'pointer',
                flexShrink: 0
              }}
            >
              <option value="">모델 선택</option>
              {['J600T', 'J800', 'S12', 'S12L', 'S7P', 'S7', 'S5', 'S3', 'S2', 'S1', 'R3', 'W12', 'W15', 'XD80', 'XD60', 'S800', 'M100', 'Q45'].map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 1-Click Model-Matched Visual Document Assembly Bar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--ink-muted)', whiteSpace: 'nowrap' }}>
              모델 맞춤 사진 문서 발송{cleanModelCode ? ` (${cleanModelCode})` : ''}
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <button
              onClick={() => setIsManualModalOpen(true)}
              style={{
                padding: '8px 8px',
                borderRadius: '6px',
                border: '1px solid var(--hairline)',
                backgroundColor: 'var(--surface-2)',
                color: 'var(--ink)',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                whiteSpace: 'nowrap'
              }}
            >
              <FileText size={13} style={{ color: '#2563eb', flexShrink: 0 }} />
              <span>카탈로그·매뉴얼</span>
            </button>

            <button
              onClick={() => setIsSelfGuideModalOpen(true)}
              style={{
                padding: '8px 8px',
                borderRadius: '6px',
                border: recommendedClosingAction === 'RESOLVED' ? '1.5px solid #10b981' : '1px solid var(--hairline)',
                backgroundColor: recommendedClosingAction === 'RESOLVED' ? '#ecfdf5' : 'var(--surface-2)',
                color: 'var(--ink)',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                whiteSpace: 'nowrap'
              }}
            >
              <CheckCircle2 size={13} style={{ color: '#059669', flexShrink: 0 }} />
              <span>자가조치 사진</span>
            </button>

            <button
              onClick={() => setIsPartsQuoteModalOpen(true)}
              style={{
                padding: '8px 8px',
                borderRadius: '6px',
                border: recommendedClosingAction === 'PARTS_QUOTE' ? '1.5px solid #f59e0b' : '1px solid var(--hairline)',
                backgroundColor: recommendedClosingAction === 'PARTS_QUOTE' ? '#fffbeb' : 'var(--surface-2)',
                color: 'var(--ink)',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                whiteSpace: 'nowrap'
              }}
            >
              <Package size={13} style={{ color: '#d97706', flexShrink: 0 }} />
              <span>소모품 견적서</span>
            </button>

            <button
              onClick={() => setIsDispatchDocModalOpen(true)}
              style={{
                padding: '8px 8px',
                borderRadius: '6px',
                border: recommendedClosingAction === 'DISPATCH' ? '1.5px solid #ef4444' : '1px solid var(--hairline)',
                backgroundColor: recommendedClosingAction === 'DISPATCH' ? '#fef2f2' : 'var(--surface-2)',
                color: 'var(--ink)',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                whiteSpace: 'nowrap'
              }}
            >
              <Wrench size={13} style={{ color: '#dc2626', flexShrink: 0 }} />
              <span>출장 문서 패키지</span>
            </button>
          </div>
        </div>

        {/* Compact History Timeline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1, minHeight: '90px' }}>
          <label style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--ink-muted)', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
            <Clock size={12} /> 최근 정비·상담 이력
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {selectedCustomer && selectedCustomer.historyTimeline.length > 0 ? (
              selectedCustomer.historyTimeline.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '6px 8px',
                    borderRadius: '5px',
                    backgroundColor: item.isWarning ? 'rgba(245, 158, 11, 0.12)' : 'var(--surface-2)',
                    border: item.isWarning ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid var(--hairline)',
                    fontSize: '12px'
                  }}
                >
                  <div style={{ color: item.isWarning ? 'var(--accent-warning)' : 'var(--ink-muted)', fontWeight: 700, fontSize: '11px' }}>
                    {item.date}
                  </div>
                  <div style={{ color: item.isWarning ? 'var(--accent-warning)' : 'var(--ink)', fontWeight: item.isWarning ? 700 : 500, marginTop: '1px' }}>
                    {item.title}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: '12px 8px', fontSize: '12px', color: 'var(--ink-subtle)' }}>
                고객사 선택 시 이력 표시
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
