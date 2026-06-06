import { create } from 'zustand';

interface NavigationState {
  currentModule: string;
  setModule: (module: string) => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  currentModule: 'Dashboard',
  setModule: (module) => set({ currentModule: module }),
}));
