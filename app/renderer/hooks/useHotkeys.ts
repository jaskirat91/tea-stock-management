import { useEffect, useRef } from 'react';

type KeyCombo = string;

export function useHotkeys(hotkeys: Record<KeyCombo, () => void>) {
  const hotkeysRef = useRef(hotkeys);
  hotkeysRef.current = hotkeys;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const { ctrlKey, metaKey, altKey, shiftKey, code, key } = event;
      const isCmd = ctrlKey || metaKey;
      
      // Build a physical combo string based on event.code
      let physicalCombo = '';
      if (isCmd) physicalCombo += 'Cmd+';
      if (altKey) physicalCombo += 'Alt+';
      if (shiftKey) physicalCombo += 'Shift+';
      
      // Use code for letters/numbers to avoid OS-specific key character mapping (e.g. Alt+M -> µ on Mac)
      const codePart = code.replace('Key', '').replace('Digit', '');
      physicalCombo += codePart;

      // Also support character-based combos for symbols
      let charCombo = '';
      if (isCmd) charCombo += 'Cmd+';
      if (altKey) charCombo += 'Alt+';
      if (shiftKey) charCombo += 'Shift+';
      charCombo += key.toUpperCase();

      const matchedCombo = hotkeysRef.current[physicalCombo] || hotkeysRef.current[charCombo];

      if (matchedCombo) {
        event.preventDefault();
        event.stopImmediatePropagation();
        matchedCombo();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true); // Use capture phase
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, []);
}
