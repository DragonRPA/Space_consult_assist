import { create } from 'zustand';

export interface VisitItem {
  id: string;
  customer_name: string;
  manager: string;
  phone: string;
  address: string;
  address_detail: string;
  request_note: string;
  status: string;
  timestamp: string;
}

export interface PartItem {
  id: string;
  name: string;
  stock: number;
  unit_price: number;
}

interface MobileState {
  visits: VisitItem[];
  parts: PartItem[];
  selectedVisit: VisitItem | null;
  isLoading: boolean;
  activeTab: 'FEED' | 'DETAIL';
  engineerName: string;
  
  setVisits: (visits: VisitItem[]) => void;
  setParts: (parts: PartItem[]) => void;
  setSelectedVisit: (visit: VisitItem | null) => void;
  setLoading: (loading: boolean) => void;
  setActiveTab: (tab: 'FEED' | 'DETAIL') => void;
  setEngineerName: (name: string) => void;
}

export const useMobileStore = create<MobileState>((set) => ({
  visits: [],
  parts: [],
  selectedVisit: null,
  isLoading: false,
  activeTab: 'FEED',
  engineerName: '김기사',

  setVisits: (visits: VisitItem[]) => set({ visits }),
  setParts: (parts: PartItem[]) => set({ parts }),
  setSelectedVisit: (visit: VisitItem | null) => set({ selectedVisit: visit }),
  setLoading: (isLoading: boolean) => set({ isLoading }),
  setActiveTab: (activeTab: 'FEED' | 'DETAIL') => set({ activeTab }),
  setEngineerName: (engineerName: string) => set({ engineerName }),
}));
