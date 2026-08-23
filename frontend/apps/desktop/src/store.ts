import { create } from 'zustand';

interface CounselState {
  sttText: string;
  keyword: string;
  partCode: string;
  actionScripts: string[];
  isRecording: boolean;
  setSttText: (text: string) => void;
  appendSttText: (text: string) => void;
  setClassificationResult: (keyword: string, partCode: string, actionScripts: string[]) => void;
  setRecording: (status: boolean) => void;
}

export const useCounselStore = create<CounselState>((set) => ({
  sttText: '',
  keyword: '',
  partCode: '',
  actionScripts: [],
  isRecording: false,
  setSttText: (text: string) => set({ sttText: text }),
  appendSttText: (text: string) => set((state) => ({ sttText: state.sttText + ' ' + text })),
  setClassificationResult: (keyword: string, partCode: string, actionScripts: string[]) => set({ keyword, partCode, actionScripts }),
  setRecording: (status: boolean) => set({ isRecording: status })
}));
