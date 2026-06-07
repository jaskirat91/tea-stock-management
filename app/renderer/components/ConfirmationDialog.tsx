import React, { useEffect, useRef, useState } from 'react';
import { useConfirmationStore } from '../store/confirmationStore';
import { Modal } from './Modal';
import { AlertCircle } from 'lucide-react';

export const ConfirmationDialog: React.FC = () => {
  const { isOpen, title, message, onConfirm, onCancel, closeConfirmation } = useConfirmationStore();
  const [focusIndex, setFocusIndex] = useState(1); // 0: Cancel, 1: Confirm
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      setFocusIndex(1); // Default focus on Confirm
      // Small delay to ensure modal is mounted before focusing
      setTimeout(() => confirmRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const nextIndex = focusIndex === 0 ? 1 : 0;
        setFocusIndex(nextIndex);
        if (nextIndex === 0) cancelRef.current?.focus();
        else confirmRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, focusIndex]);

  const handleConfirm = () => {
    onConfirm();
    closeConfirmation();
  };

  const handleCancel = () => {
    onCancel();
    closeConfirmation();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleCancel} title={title}>
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="p-3 bg-red-500/10 rounded-full text-red-500">
          <AlertCircle size={32} />
        </div>
        <p className="text-slate-600 dark:text-slate-300">
          {message}
        </p>
        
        <div className="flex items-center justify-center gap-3 w-full mt-6">
          <button
            ref={cancelRef}
            onClick={handleCancel}
            onFocus={() => setFocusIndex(0)}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              focusIndex === 0 
                ? 'bg-black/10 dark:bg-white/10 text-slate-900 dark:text-white ring-2 ring-primary' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            onClick={handleConfirm}
            onFocus={() => setFocusIndex(1)}
            className={`flex-1 px-4 py-2 text-sm font-bold rounded-lg transition-all shadow-lg ${
              focusIndex === 1 
                ? 'bg-primary text-black ring-2 ring-primary ring-offset-2 dark:ring-offset-[#0f172a] shadow-primary/20' 
                : 'bg-primary/80 text-black/80'
            }`}
          >
            OK
          </button>
        </div>
      </div>
    </Modal>
  );
};
