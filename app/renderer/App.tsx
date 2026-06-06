import React, { useEffect } from 'react';
import { useNavigationStore } from './store/navigationStore';
import { useThemeStore } from './store/themeStore';
import { useHotkeys } from './hooks/useHotkeys';
import { MnemonicLabel } from './components/MnemonicLabel';
import { ThemeToggle } from './components/ThemeToggle';
import { LayoutDashboard, Box, Users, Settings } from 'lucide-react';

const App: React.FC = () => {
  const { currentModule, setModule } = useNavigationStore();
  const { theme } = useThemeStore();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useHotkeys({
    'Alt+D': () => setModule('Dashboard'),
    'Alt+I': () => setModule('Inventory'),
    'Alt+P': () => setModule('Parties'),
    'Alt+S': () => setModule('Settings'),
    'Cmd+1': () => setModule('Dashboard'),
    'Cmd+2': () => setModule('Inventory'),
    'Cmd+3': () => setModule('Parties'),
    'Cmd+4': () => setModule('Settings'),
  });

  const modules = [
    { name: 'Dashboard', icon: LayoutDashboard, mnemonic: 'D' },
    { name: 'Inventory', icon: Box, mnemonic: 'I' },
    { name: 'Parties', icon: Users, mnemonic: 'P' },
    { name: 'Settings', icon: Settings, mnemonic: 'S' },
  ];

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50 dark:bg-background-dark text-slate-900 dark:text-slate-200">
      {/* Top Bar / Module Switcher */}
      <header className="h-12 flex items-center justify-between px-4 border-b border-black/10 dark:border-white/10 bg-white/80 dark:bg-black/20 backdrop-blur-md drag">
        <div className="flex items-center gap-6 no-drag">
          <div className="text-primary font-bold tracking-tight text-lg mr-4">
            TEA STOCK
          </div>
          <nav className="flex items-center gap-1">
            {modules.map((m) => (
              <button
                key={m.name}
                onClick={() => setModule(m.name)}
                className={`px-3 py-1.5 rounded-md flex items-center gap-2 transition-all ${
                  currentModule === m.name
                    ? 'bg-primary/20 text-primary ring-1 ring-primary/30'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <m.icon size={16} />
                <MnemonicLabel label={m.name} mnemonic={m.mnemonic} className="text-sm font-medium" />
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2 no-drag">
          <ThemeToggle />
          <div className="w-px h-4 bg-black/10 dark:bg-white/10 mx-2" />
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-[10px] text-slate-500">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            SYSTEM ONLINE
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-6 bg-slate-50 dark:bg-background-dark">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-semibold mb-6 text-slate-900 dark:text-white">{currentModule}</h1>
          
          {/* Mock Content for Demo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 shadow-sm dark:shadow-none backdrop-blur-sm">
              <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Total Stock</h3>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">1,240 <span className="text-sm font-normal text-slate-400 dark:text-slate-500">Kgs</span></p>
            </div>
            <div className="p-6 rounded-xl bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 shadow-sm dark:shadow-none backdrop-blur-sm">
              <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Active Batches</h3>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">12</p>
            </div>
            <div className="p-6 rounded-xl bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 shadow-sm dark:shadow-none backdrop-blur-sm">
              <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Low Stock Alerts</h3>
              <p className="text-3xl font-bold text-primary">3</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer / Status Bar */}
      <footer className="h-8 flex items-center justify-between px-4 border-t border-black/10 dark:border-white/10 bg-white/80 dark:bg-black/20 text-[10px] text-slate-500 uppercase tracking-widest font-medium">
        <div className="flex items-center gap-4">
          <span>Powered by Supreme Software Solutions</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <kbd className="bg-black/5 dark:bg-white/5 px-1 rounded border border-black/10 dark:border-white/10 text-slate-400">ALT</kbd>
            <span>Mnemonics</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="bg-black/5 dark:bg-white/5 px-1 rounded border border-black/10 dark:border-white/10 text-slate-400">CMD+T</kbd>
            <span>Theme</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
