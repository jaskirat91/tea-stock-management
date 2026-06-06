import React from 'react';

interface KbdBadgeProps {
  keys: string;
  className?: string;
}

export const KbdBadge: React.FC<KbdBadgeProps> = ({ keys, className }) => {
  return (
    <kbd className={`px-1.5 py-0.5 text-[10px] font-medium bg-white/10 border border-white/20 rounded-md text-slate-400 select-none ${className}`}>
      {keys}
    </kbd>
  );
};
