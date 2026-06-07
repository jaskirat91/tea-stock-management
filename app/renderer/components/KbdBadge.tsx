import React from 'react';

interface KbdBadgeProps {
  keys: string;
  className?: string;
}

export const KbdBadge: React.FC<KbdBadgeProps> = ({ keys, className }) => {
  return (
    <kbd className={`px-1 py-0.5 text-sm font-light text-center tracking-[3px] bg-white/10 border border-white/20 rounded-md select-none ${className}`}>
      {keys}
    </kbd>
  );
};
