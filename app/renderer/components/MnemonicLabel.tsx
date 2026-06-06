import React, { useEffect, useState } from 'react';

interface MnemonicLabelProps {
  label: string;
  mnemonic: string;
  className?: string;
}

export const MnemonicLabel: React.FC<MnemonicLabelProps> = ({ label, mnemonic, className }) => {
  const [showMnemonic, setShowMnemonic] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey) setShowMnemonic(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.altKey) setShowMnemonic(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const index = label.toLowerCase().indexOf(mnemonic.toLowerCase());
  if (index === -1) return <span className={className}>{label}</span>;

  return (
    <span className={className}>
      {label.substring(0, index)}
      <span className={showMnemonic ? "underline decoration-primary underline-offset-2" : ""}>
        {label.substring(index, index + 1)}
      </span>
      {label.substring(index + 1)}
    </span>
  );
};
