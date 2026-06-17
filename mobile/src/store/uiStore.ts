import { create } from 'zustand';

interface UiStore {
  profileSheetVisible: boolean;
  setProfileSheetVisible: (v: boolean) => void;
  reset: () => void;
}

export const useUiStore = create<UiStore>((set) => ({
  profileSheetVisible: false,
  setProfileSheetVisible: (profileSheetVisible) => set({ profileSheetVisible }),
  reset: () => set({ profileSheetVisible: false }),
}));
