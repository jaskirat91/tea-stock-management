import { create } from 'zustand';

interface ConfirmationState {
  isOpen: boolean;
  title?: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  openConfirmation: (params: { title?: string; message: string; onConfirm: () => void; onCancel?: () => void }) => void;
  closeConfirmation: () => void;
}

export const useConfirmationStore = create<ConfirmationState>((set) => ({
  isOpen: false,
  title: '',
  message: '',
  onConfirm: () => {},
  onCancel: () => {},
  openConfirmation: ({ title, message, onConfirm, onCancel }) => set({
    isOpen: true,
    title,
    message,
    onConfirm,
    onCancel: onCancel || (() => {}),
  }),
  closeConfirmation: () => set({ isOpen: false }),
}));
