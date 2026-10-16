import React from 'react';
import { 
  Headphones, 
  Cpu, 
  Calendar, 
  Mic, 
  Search
} from 'lucide-react';

export type NavTab = 'counsel-v2' | 'counsel-v3' | 'counsel-compare' | 'schedule' | 'stt-legacy';

interface GlobalNavProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const GlobalNav: React.FC<GlobalNavProps> = ({ currentTab, onSelectTab }) => {
  const tabs: { id: NavTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    {
      id: 'stt-legacy' as NavTab,
      label: '상담지원1',
      icon: <Mic size={15} />,
    },
    {
      id: 'counsel-v2' as NavTab,
      label: '상담지원2',
      icon: <Headphones size={15} />,
    },
    {
      id: 'counsel-v3' as NavTab,
      label: '상담지원3',
      icon: <Search size={15} />,
    },
    {
      id: 'counsel-compare' as NavTab,
      label: '임베딩 모델비교',
      icon: <Cpu size={15} />,
    },
    {
      id: 'schedule' as NavTab,
      label: '일정관리',
      icon: <Calendar size={15} />,
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
      {/* 브랜드 타이틀 (회사 공식 CI 로고 표출) */}
      <div
        onClick={() => onSelectTab('counsel-v3')}
        style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, cursor: 'pointer' }}
      >
        <img
          src="/SPACE_logo_white.png"
          alt="SPACE 로고"
          data-uia="global-brand-logo"
          style={{ height: 19, width: 'auto', objectFit: 'contain', display: 'block' }}
        />
        <span style={{ 
          fontSize: '10pt', 
          padding: '2px 8px', 
          borderRadius: 4, 
          background: '#1e293b', 
          color: '#cbd5e1', 
          fontWeight: 700,
          whiteSpace: 'nowrap'
        }}>
          상담 지원
        </span>
      </div>

      <div style={{ width: 1, height: 20, background: '#334155' }} />

      {/* 탭 버튼군 */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                padding: '6px 14px',
                borderRadius: 6,
                fontSize: 14,
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
                  fontSize: '10pt',
                  fontWeight: 700,
                  padding: '2px 6px',
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
    </header>
  );
};

export default GlobalNav;
