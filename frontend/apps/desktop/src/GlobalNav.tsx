import React from 'react';
import { 
  Headphones, 
  Cpu, 
  Calendar, 
  Mic, 
  CheckCircle2,
  BookOpen
} from 'lucide-react';

export type NavTab = 'counsel-v2' | 'counsel-compare' | 'schedule' | 'stt-legacy';

interface GlobalNavProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenGuides?: () => void;
}

export const GlobalNav: React.FC<GlobalNavProps> = ({ currentTab, onSelectTab, onOpenGuides }) => {
  const tabs: { id: NavTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    {
      id: 'counsel-v2' as NavTab,
      label: '상담 지원',
      icon: <Headphones size={15} />,
    },
    {
      id: 'counsel-compare' as NavTab,
      label: '임베딩 모델 비교',
      icon: <Cpu size={15} />,
    },
    {
      id: 'schedule' as NavTab,
      label: '일정 관리',
      icon: <Calendar size={15} />,
    },
    {
      id: 'stt-legacy' as NavTab,
      label: '통화 녹음 및 전사',
      icon: <Mic size={15} />,
    },
  ];

  return (
    <header style={{
      background: '#0f172a',
      color: '#f8fafc',
      height: 48,
      display: 'flex',
      alignItems: 'center',
      padding: '0 20px',
      gap: 16,
      borderBottom: '1px solid #1e293b',
      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      userSelect: 'none'
    }}>
      {/* 브랜드 타이틀 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-0.3px', color: '#fff', whiteSpace: 'nowrap' }}>
          Space Advisor
        </span>
        <span style={{ 
          fontSize: 10, 
          padding: '2px 6px', 
          borderRadius: 4, 
          background: '#1e293b', 
          color: '#94a3b8', 
          fontWeight: 600,
          whiteSpace: 'nowrap'
        }}>
          상담 지원
        </span>
      </div>

      <div style={{ width: 1, height: 20, background: '#334155' }} />

      {/* 탭 버튼군 */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#ffffff' : '#94a3b8',
                background: isActive ? '#2563eb' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.background = '#1e293b';
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.background = 'transparent';
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge && (
                <span style={{
                  fontSize: 9,
                  fontWeight: 700,
                  padding: '1px 5px',
                  borderRadius: 10,
                  background: isActive ? '#1d4ed8' : '#334155',
                  color: isActive ? '#bfdbfe' : '#cbd5e1',
                  marginLeft: 2,
                }}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* 상황별 수칙 바로가기 버튼 */}
      {onOpenGuides && (
        <button
          onClick={onOpenGuides}
          data-uia="global-nav-special-guides"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 12px',
            borderRadius: 6,
            backgroundColor: '#4338ca',
            color: '#ffffff',
            border: '1px solid #6366f1',
            fontSize: 12,
            fontWeight: 800,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
            boxShadow: '0 2px 6px rgba(67, 56, 202, 0.4)'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#3730a3'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#4338ca'; }}
        >
          <BookOpen size={13} />
          <span>상황별 수칙</span>
        </button>
      )}

      {/* 우측 시스템 상태 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, fontSize: 11, color: '#64748b' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#22c55e' }}>
          <CheckCircle2 size={12} />
          <span style={{ fontWeight: 600, color: '#94a3b8', whiteSpace: 'nowrap' }}>포트 8000 연결</span>
        </div>
      </div>
    </header>
  );
};

export default GlobalNav;
