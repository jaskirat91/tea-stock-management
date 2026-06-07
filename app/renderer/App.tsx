import React, { useEffect, useRef } from 'react';
import { useNavigationStore } from './store/navigationStore';
import { useThemeStore } from './store/themeStore';
import { useHotkeys } from './hooks/useHotkeys';
import { MnemonicLabel } from './components/MnemonicLabel';
import { ThemeToggle } from './components/ThemeToggle';
import MasterModule from './modules/masters/MasterModule';
import ReceiptVoucherModule from './modules/vouchers/ReceiptVoucherModule';
import IssueVoucherModule from './modules/vouchers/IssueVoucherModule';
import StockReportModule from './modules/reports/StockReportModule';
import { ConfirmationDialog } from './components/ConfirmationDialog';
import { 
  LayoutDashboard, 
  Box, 
  Users, 
  Settings, 
  ChevronDown, 
  Building2, 
  Leaf, 
  Truck, 
  UserCircle,
  FileText,
  Receipt,
  ClipboardList
} from 'lucide-react';

interface NavItem {
  name: string;
  icon: any;
  mnemonic: string;
  route: string;
}

interface NavMenu {
  name: string;
  icon: any;
  mnemonic: string;
  route?: string;
  items?: NavItem[];
}

const navConfig: NavMenu[] = [
  { name: 'Dashboard', icon: LayoutDashboard, mnemonic: 'D', route: 'Dashboard' },
  { name: 'Inventory', icon: Box, mnemonic: 'I', route: 'Inventory' },
  { 
    name: 'Masters', 
    icon: Users, 
    mnemonic: 'M',
    items: [
      { name: 'Firm Master', icon: Building2, mnemonic: 'F', route: 'Firm Master' },
      { name: 'Garden Master', icon: Leaf, mnemonic: 'G', route: 'Garden Master' },
      { name: 'Party Master', icon: UserCircle, mnemonic: 'P', route: 'Party Master' },
      { name: 'Grade Master', icon: Box, mnemonic: 'A', route: 'Grade Master' },
      { name: 'Transport Master', icon: Truck, mnemonic: 'T', route: 'Transport Master' },
    ]
  },
  {
    name: 'Vouchers',
    icon: FileText,
    mnemonic: 'V',
    items: [
      { name: 'Receipt Voucher', icon: Receipt, mnemonic: 'R', route: 'Receipt Voucher' },
      { name: 'Issue Voucher', icon: ClipboardList, mnemonic: 'U', route: 'Issue Voucher' },
    ]
  },
  {
    name: 'Reports',
    icon: FileText,
    mnemonic: 'O',
    items: [
      { name: 'Stock Report', icon: Box, mnemonic: 'S', route: 'Stock Report' },
    ]
  },
  { name: 'Settings', icon: Settings, mnemonic: 'S', route: 'Settings' },
];

const App: React.FC = () => {
  const { currentModule, setModule, activeDropdown, setActiveDropdown, toggleDropdown } = useNavigationStore();
  const { theme } = useThemeStore();
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // Handle clicks outside dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setActiveDropdown]);

  // Unified two-step mnemonic listener
  useEffect(() => {
    const handleMnemonic = (e: KeyboardEvent) => {
      // Don't trigger if modifiers are held (except Alt which is the first step)
      if (e.ctrlKey || e.metaKey) return;

      const key = e.key.toUpperCase();
      
      // Step 2: If a dropdown is open, look for sub-item mnemonics
      if (activeDropdown) {
        if (e.altKey) return; // Ignore if Alt is still held (could be trying to switch top-level)
        
        const activeMenu = navConfig.find(m => m.name === activeDropdown);
        const subItem = activeMenu?.items?.find(item => item.mnemonic === key);
        
        if (subItem) {
          e.preventDefault();
          e.stopImmediatePropagation();
          setModule(subItem.route);
          return;
        }
      }
    };

    window.addEventListener('keydown', handleMnemonic, true);
    return () => window.removeEventListener('keydown', handleMnemonic, true);
  }, [activeDropdown, setModule]);

  // Global hotkeys for top-level menus and Cmd+Number shortcuts
  const hotkeyConfig: Record<string, () => void> = {
    'Cmd+T': () => { /* Theme handled in component */ },
  };

  // Dynamically build Alt+Mnemonic for top level
  navConfig.forEach((menu, index) => {
    hotkeyConfig[`Alt+${menu.mnemonic}`] = () => {
      if (menu.items) {
        toggleDropdown(menu.name);
      } else if (menu.route) {
        setModule(menu.route);
      }
    };
    // Also add Cmd+1, Cmd+2 etc.
    hotkeyConfig[`Cmd+${index + 1}`] = () => {
      if (menu.route) setModule(menu.route);
    };
  });

  useHotkeys(hotkeyConfig);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50 dark:bg-background-dark text-slate-900 dark:text-slate-200">
      {/* Top Bar / Module Switcher */}
      <header className="h-12 flex items-center justify-between px-4 border-b border-black/10 dark:border-white/10 bg-white/80 dark:bg-black/20 backdrop-blur-md drag relative z-50">
        <div className="flex items-center gap-6 no-drag" ref={navRef}>
          <div className="text-primary font-bold tracking-tight text-lg mr-4">
            TEA STOCK
          </div>
          <nav className="flex items-center gap-1">
            {navConfig.map((menu) => (
              <div key={menu.name} className="relative">
                <button
                  onClick={() => {
                    if (menu.items) toggleDropdown(menu.name);
                    else if (menu.route) setModule(menu.route);
                  }}
                  className={`px-3 py-1.5 rounded-md flex items-center gap-2 transition-all ${
                    (menu.route === currentModule || (menu.items && menu.items.some(i => i.route === currentModule)))
                      ? 'bg-primary/20 text-primary ring-1 ring-primary/30'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  <menu.icon size={16} />
                  <MnemonicLabel label={menu.name} mnemonic={menu.mnemonic} className="text-sm font-medium" />
                  {menu.items && (
                    <ChevronDown size={14} className={`transition-transform ${activeDropdown === menu.name ? 'rotate-180' : ''}`} />
                  )}
                </button>

                {/* Dropdown Menu */}
                {menu.items && activeDropdown === menu.name && (
                  <div className="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-[#0f172a] border border-black/10 dark:border-white/10 rounded-lg shadow-xl py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    {menu.items.map((item) => (
                      <button
                        key={item.name}
                        onClick={() => setModule(item.route)}
                        className="w-full px-4 py-2 flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 hover:text-primary dark:hover:text-primary transition-colors text-left"
                      >
                        <item.icon size={16} />
                        <MnemonicLabel label={item.name} mnemonic={item.mnemonic} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
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
        <div className="max-w-8xl mx-auto">
          <h1 className="text-2xl font-semibold mb-6 text-slate-900 dark:text-white">{currentModule}</h1>
          
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {currentModule === 'Dashboard' && (
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
            )}
            
            {currentModule === 'Firm Master' && (
              <MasterModule 
                entityName="firm"
                title="Firm"
                columns={['name', 'code', 'gstin', 'phone', 'is_active']}
                fields={[
                  { name: 'name', label: 'Firm Name', required: true },
                  { name: 'code', label: 'Firm Code', required: true },
                  { name: 'gstin', label: 'GSTIN' },
                  { name: 'phone', label: 'Phone Number' },
                  { name: 'address', label: 'Address' },
                  { name: 'is_active', label: 'Status', type: 'boolean' },
                ]}
              />
            )}

            {currentModule === 'Garden Master' && (
              <MasterModule 
                entityName="garden"
                title="Garden"
                columns={['name', 'is_active']}
                fields={[
                  { name: 'name', label: 'Garden Name', required: true },
                  { name: 'is_active', label: 'Status', type: 'boolean' },
                ]}
              />
            )}

            {currentModule === 'Party Master' && (
              <MasterModule 
                entityName="party"
                title="Party"
                columns={['name', 'gstin', 'is_active']}
                fields={[
                  { name: 'name', label: 'Party Name', required: true },
                  { name: 'gstin', label: 'GSTIN' },
                  { name: 'address', label: 'Address' },
                  { name: 'is_active', label: 'Status', type: 'boolean' },
                ]}
              />
            )}

            {currentModule === 'Grade Master' && (
              <MasterModule 
                entityName="grade"
                title="Grade"
                columns={['name', 'is_active']}
                fields={[
                  { name: 'name', label: 'Grade Name', required: true },
                  { name: 'is_active', label: 'Status', type: 'boolean' },
                ]}
              />
            )}

            {currentModule === 'Transport Master' && (
              <MasterModule 
                entityName="transport"
                title="Transport"
                columns={['name', 'is_active']}
                fields={[
                  { name: 'name', label: 'Transport Name', required: true },
                  { name: 'is_active', label: 'Status', type: 'boolean' },
                ]}
              />
            )}

            {currentModule === 'Receipt Voucher' && (
              <ReceiptVoucherModule />
            )}

            {currentModule === 'Issue Voucher' && (
              <IssueVoucherModule />
            )}

            {currentModule === 'Stock Report' && (
              <StockReportModule />
            )}
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
      <ConfirmationDialog />
    </div>
  );
};

export default App;
