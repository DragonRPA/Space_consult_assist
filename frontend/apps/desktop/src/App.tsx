import { lazy, Suspense, useEffect, useState } from 'react';
import GlobalNav, { type NavTab } from './GlobalNav';
import './index.css';

const CounselAssistV2 = lazy(() => import('./CounselAssistV2'));
const CounselAssistV3 = lazy(() => import('./CounselAssistV3'));
const CounselCompare = lazy(() => import('./CounselCompare'));
const SchedulePage = lazy(() => import('./SchedulePage'));
const LegacySttView = lazy(() => import('./LegacySttView'));

function getInitialTab(): NavTab {
  const path = window.location.pathname;
  if (path.startsWith('/counsel3') || path.startsWith('/v3')) return 'counsel-v3';
  if (path.startsWith('/schedule')) return 'schedule';
  if (path.startsWith('/counsel-compare')) return 'counsel-compare';
  if (path.startsWith('/stt') || path.startsWith('/legacy')) return 'stt-legacy';
  // 기본 진입 화면: CounselAssistV2
  return 'counsel-v2';
}

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>(getInitialTab);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentTab(getInitialTab());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleSelectTab = (tab: NavTab) => {
    setCurrentTab(tab);
    const pathMap: Record<NavTab, string> = {
      'counsel-v2': '/',
      'counsel-v3': '/counsel3',
      'counsel-compare': '/counsel-compare',
      'schedule': '/schedule',
      'stt-legacy': '/stt',
    };
    window.history.pushState(null, '', pathMap[tab]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--bg-app)', backgroundImage: 'var(--paper-texture)', backgroundRepeat: 'repeat' }}>
      <GlobalNav currentTab={currentTab} onSelectTab={handleSelectTab} />
      <main style={{ flex: 1, position: 'relative' }}>
        <Suspense fallback={<div style={{ padding: 24, color: 'var(--ink-muted, #64748b)', fontSize: 13 }}>화면 로딩 중...</div>}>
          {currentTab === 'counsel-v2' && <CounselAssistV2 />}
          {currentTab === 'counsel-v3' && <CounselAssistV3 />}
          {currentTab === 'counsel-compare' && <CounselCompare />}
          {currentTab === 'schedule' && <SchedulePage />}
          {currentTab === 'stt-legacy' && <LegacySttView />}
        </Suspense>
      </main>
    </div>
  );
}
