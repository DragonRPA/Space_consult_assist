import React from 'react';
import { 
  Headphones, 
  Cpu, 
  Calendar, 
  Mic, 
  CheckCircle2,
  BookOpen,
  Search
} from 'lucide-react';

export type NavTab = 'counsel-v2' | 'counsel-v3' | 'counsel-compare' | 'schedule' | 'stt-legacy';

interface GlobalNavProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenGuides?: () => void;
}

export const GlobalNav: React.FC<GlobalNavProps> = ({ currentTab, onSelectTab, onOpenGuides }) => {
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
      {/* 브랜드 타이틀 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.3px', color: '#fff', whiteSpace: 'nowrap' }}>
          Space Advisor
        </span>
        <span style={{ 
          fontSize: '10pt', 
          padding: '2px 8px', 
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

      {/* 상황별 수칙 바로가기 버튼 */}
      {onOpenGuides && (
        <button
          onClick={onOpenGuides}
          data-uia="global-nav-special-guides"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 14px',
            borderRadius: 6,
            backgroundColor: '#1d4ed8',
            color: '#ffffff',
            border: '1px solid #2563eb',
            fontSize: 13.5,
            fontWeight: 800,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
            boxShadow: '0 2px 6px rgba(29, 78, 216, 0.3)'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1e40af'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#1d4ed8'; }}
        >
          <BookOpen size={14} />
          <span>상황별 수칙</span>
        </button>
      )}

      {/* 우측 시스템 상태 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, fontSize: '10pt', color: '#64748b' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#10b981' }}>
          <CheckCircle2 size={14} />
          <span style={{ fontWeight: 600, color: '#94a3b8', whiteSpace: 'nowrap' }}>포트 8000 연결</span>
        </div>
      </div>
    </header>
  );
};

export default GlobalNav;
