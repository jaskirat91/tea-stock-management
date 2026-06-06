import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useThemeStore } from '../store/themeStore';
import { useHotkeys } from '../hooks/useHotkeys';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useThemeStore();

  useHotkeys({
    'Cmd+T': toggleTheme,
  });

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg transition-colors flex items-center gap-2 
        text-slate-500 dark:text-slate-400 
        hover:text-slate-900 dark:hover:text-white 
        hover:bg-black/5 dark:hover:bg-white/10"
      title="Toggle Theme (Cmd+T)"
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
};
