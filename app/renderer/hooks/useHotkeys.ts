import { useEffect, useRef } from 'react';

type KeyCombo = string;

export function useHotkeys(hotkeys: Record<KeyCombo, () => void>) {
  const hotkeysRef = useRef(hotkeys);
  hotkeysRef.current = hotkeys;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const { ctrlKey, metaKey, altKey, shiftKey, key } = event;
      const isCmd = ctrlKey || metaKey;
      
      let combo = '';
      if (isCmd) combo += 'Cmd+';
      if (altKey) combo += 'Alt+';
      if (shiftKey) combo += 'Shift+';
      
      // Handle Alt+Key mnemonics
      if (altKey && key.length === 1) {
        const mnemonicCombo = `Alt+${key.toUpperCase()}`;
        if (hotkeysRef.current[mnemonicCombo]) {
          event.preventDefault();
          hotkeysRef.current[mnemonicCombo]();
          return;
        }
      }

      combo += key.length === 1 ? key.toUpperCase() : key;

      if (hotkeysRef.current[combo]) {
        event.preventDefault();
        hotkeysRef.current[combo]();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
