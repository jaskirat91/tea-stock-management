import React, { useState, useEffect, useRef } from 'react';
import { useNavigationStore } from '../store/navigationStore';
import { useHotkeys } from '../hooks/useHotkeys';
import { ChevronDown, Search } from 'lucide-react';

interface Option {
  id: string;
  name: string;
  [key: string]: any;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (id: string) => void;
  onSelect?: () => void; // Triggered after an item is selected
  placeholder: string;
  masterRoute: string; // The route to navigate to on F2
  label?: string;
  required?: boolean;
  className?: string;
  id?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  onSelect,
  placeholder,
  masterRoute,
  label,
  required,
  className,
  id
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setFocusIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { setModule } = useNavigationStore();

  const filteredOptions = options.filter(opt => 
    opt.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedOption = options.find(opt => opt.id === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'F2') {
      e.preventDefault();
      setModule(masterRoute);
      return;
    }

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusIndex(prev => (prev + 1) % filteredOptions.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusIndex(prev => (prev - 1 + filteredOptions.length) % filteredOptions.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredOptions[highlightedIndex]) {
          onChange(filteredOptions[highlightedIndex].id);
          setIsOpen(false);
          setSearchTerm('');
          onSelect?.(); // Trigger next field focus
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      <div 
        id={id}
        tabIndex={0}
        className={`flex items-center justify-between px-4 py-2 bg-white dark:bg-black/20 border ${isOpen ? 'border-primary ring-2 ring-primary/20' : 'border-black/10 dark:border-white/10'} rounded-lg cursor-pointer transition-all text-sm outline-none focus:ring-2 focus:ring-primary`}
        onClick={() => {
          setIsOpen(!isOpen);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
        onKeyDown={handleKeyDown}
      >
        <span className={selectedOption ? 'text-slate-900 dark:text-white' : 'text-slate-400'}>
          {selectedOption ? selectedOption.name : placeholder}
        </span>
        <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#0f172a] border border-black/10 dark:border-white/10 rounded-lg shadow-2xl z-[60] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-2 border-b border-black/10 dark:border-white/10 flex items-center gap-2">
            <Search size={14} className="text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              className="w-full bg-transparent outline-none text-sm text-slate-900 dark:text-white"
              placeholder="Type to search... (F2 for new)"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setFocusIndex(0);
              }}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          </div>
          <div className="max-h-60 overflow-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, index) => (
                <div
                  key={opt.id}
                  className={`px-4 py-2.5 text-sm cursor-pointer transition-colors ${
                    index === highlightedIndex 
                      ? 'bg-primary text-black font-semibold' 
                      : 'text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                  onClick={() => {
                    onChange(opt.id);
                    setIsOpen(false);
                    setSearchTerm('');
                    onSelect?.();
                  }}
                  onMouseEnter={() => setFocusIndex(index)}
                >
                  {opt.name}
                </div>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-xs text-slate-400 italic">
                No results found. Press F2 to add.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
