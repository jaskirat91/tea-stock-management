import { create } from 'zustand';

interface NavigationState {
  currentModule: string;
  activeDropdown: string | null; // Name of the currently open dropdown menu
  setModule: (module: string) => void;
  setActiveDropdown: (menuName: string | null) => void;
  toggleDropdown: (menuName: string) => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  currentModule: 'Dashboard',
  activeDropdown: null,
  setModule: (module) => set({ currentModule: module, activeDropdown: null }),
  setActiveDropdown: (menuName) => set({ activeDropdown: menuName }),
  toggleDropdown: (menuName) => set((state) => ({ 
    activeDropdown: state.activeDropdown === menuName ? null : menuName 
  })),
}));
