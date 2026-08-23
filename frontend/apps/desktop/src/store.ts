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
  setSttText: (text) => set({ sttText: text }),
  appendSttText: (text) => set((state) => ({ sttText: state.sttText + ' ' + text })),
  setClassificationResult: (keyword, partCode, actionScripts) => set({ keyword, partCode, actionScripts }),
  setRecording: (status) => set({ isRecording: status })
}));
