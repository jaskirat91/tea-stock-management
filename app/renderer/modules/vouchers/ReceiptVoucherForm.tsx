import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useIpc } from '../../hooks/useIpc';
import { useHotkeys } from '../../hooks/useHotkeys';
import { SearchableSelect } from '../../components/SearchableSelect';
import { Plus, Trash2, Save, X, Calculator, ArrowLeft, ArrowUp, ArrowDown } from 'lucide-react';
import { KbdBadge } from '../../components/KbdBadge';
import { useConfirmationStore } from '../../store/confirmationStore';
import { QuickCreateMasterModal } from '../masters/QuickCreateMasterModal';

interface ReceiptVoucherFormProps {
  onClose: () => void;
  onSaved: () => void;
  initialData?: any;
}

const MASTER_CONFIGS: Record<string, any> = {
  firm: {
    entityName: 'firm',
    title: 'Firm',
    fields: [
      { name: 'name', label: 'Firm Name', required: true },
      { name: 'code', label: 'Firm Code', required: true },
      { name: 'gstin', label: 'GSTIN' },
      { name: 'phone', label: 'Phone Number' },
      { name: 'address', label: 'Address' },
    ]
  },
  garden: {
    entityName: 'garden',
    title: 'Garden',
    fields: [
      { name: 'name', label: 'Garden Name', required: true },
    ]
  },
  party: {
    entityName: 'party',
    title: 'Party',
    fields: [
      { name: 'name', label: 'Party Name', required: true },
      { name: 'gstin', label: 'GSTIN' },
      { name: 'address', label: 'Address' },
    ]
  },
  grade: {
    entityName: 'grade',
    title: 'Grade',
    fields: [
      { name: 'name', label: 'Grade Name', required: true },
    ]
  },
  transport: {
    entityName: 'transport',
    title: 'Transport',
    fields: [
      { name: 'name', label: 'Transport Name', required: true },
    ]
  }
};

const ReceiptVoucherForm: React.FC<ReceiptVoucherFormProps> = ({ onClose, onSaved, initialData }) => {
  const { invoke, loading } = useIpc();
  const { openConfirmation } = useConfirmationStore();
  const isMac = window.navigator.platform.toLowerCase().includes('mac');
  
  const [formData, setFormData] = useState({
    voucher_no: '',
    firm_id: '',
    party_id: '',
    bill_no: '',
    bill_date: new Date().toISOString().split('T')[0],
    transport_id: '',
    frieght_amount: 0,
    gr_no: '',
    gr_date: '',
    receipt_no: '',
    receipt_date: '',
    total_bags: 0,
    total_weight: 0,
    lots: [
      { id: Date.now().toString(), lot_no: '', garden_id: '', grade: '', total_bags: 0, weight_per_bag: 0, shortage_weight: 0, net_weight: 0, remarks: '' }
    ]
  });

  const [masters, setMasters] = useState({
    firms: [],
    parties: [],
    transports: [],
    gardens: [],
    grades: []
  });

  const [quickCreate, setQuickCreate] = useState<{
    isOpen: boolean;
    type: string;
    inputId: string;
    callback?: (newItem: any) => void;
  }>({
    isOpen: false,
    type: 'firm',
    inputId: ''
  });

  // Navigation order for header
  const fieldOrder = [
    'voucher_no', 'firm_id', 'party_id', 'bill_no', 'bill_date', 
    'transport_id', 'gr_no', 'gr_date', 'frieght_amount', 
    'receipt_no', 'receipt_date'
  ];

  const fetchMasters = useCallback(async () => {
    try {
      const [firms, parties, transports, gardens, grades] = await Promise.all([
        invoke('firm:get-all'),
        invoke('party:get-all'),
        invoke('transport:get-all'),
        invoke('garden:get-all'),
        invoke('grade:get-all')
      ]);
      setMasters({ firms, parties, transports, gardens, grades });
    } catch (err) {
      console.error('Failed to fetch masters:', err);
    }
  }, [invoke]);

  useEffect(() => {
    fetchMasters();
    if (initialData) setFormData(initialData);
    
    // Auto-focus the first element
    setTimeout(() => document.getElementById('voucher_no')?.focus(), 100);
  }, [fetchMasters, initialData]);

  const calculateLotNetWeight = (bags: number, wpb: number, shortage: number) => {
    return (bags * wpb) - shortage;
  };

  const updateTotals = (lots: any[]) => {
    const totalBags = lots.reduce((acc, lot) => acc + (Number(lot.total_bags) || 0), 0);
    const totalWeight = lots.reduce((acc, lot) => acc + (Number(lot.net_weight) || 0), 0);
    return { totalBags, totalWeight };
  };

  const handleLotChange = (index: number, field: string, value: any) => {
    const newLots = [...formData.lots];
    newLots[index] = { ...newLots[index], [field]: value };

    if (['total_bags', 'weight_per_bag', 'shortage_weight'].includes(field)) {
      const lot = newLots[index];
      lot.net_weight = calculateLotNetWeight(Number(lot.total_bags) || 0, Number(lot.weight_per_bag) || 0, Number(lot.shortage_weight) || 0);
    }

    const { totalBags, totalWeight } = updateTotals(newLots);
    setFormData(prev => ({ ...prev, lots: newLots, total_bags: totalBags, total_weight: totalWeight }));
  };

  const handleFirmChange = async (firmId: string) => {
    setFormData(prev => ({ ...prev, firm_id: firmId }));
    try {
      const nextNo = await invoke('receipt-voucher:get-next-no', firmId);
      setFormData(prev => ({ ...prev, voucher_no: nextNo }));
    } catch (err) {
      console.error('Failed to generate voucher no:', err);
    }
  };

  const handleQuickCreateSuccess = (newItem: any) => {
    const type = quickCreate.type;
    const masterKey = type === 'party' ? 'parties' : type === 'firm' ? 'firms' : `${type}s`;
    
    setMasters(prev => ({
      ...prev,
      [masterKey]: [...(prev as any)[masterKey], newItem]
    }));

    if (quickCreate.callback) {
      quickCreate.callback(newItem);
    }

    setQuickCreate({ isOpen: false, type: quickCreate.type, inputId: quickCreate.inputId });
    
    document.getElementById(quickCreate.inputId)?.focus();
     
  };

  const openQuickCreate = (type: string, inputId: string, callback: (newItem: any) => void) => {
    setQuickCreate({
      isOpen: true,
      type,
      inputId,
      callback
    });
  };

  const handleCloseQuickCreate = () => {
    setQuickCreate({ isOpen: false, type: quickCreate.type, inputId: quickCreate.inputId });
    document.getElementById(quickCreate.inputId)?.focus();
  };

  const addLot = () => {
    const newLot = { id: Date.now().toString(), lot_no: '', garden_id: '', grade: '', total_bags: 0, weight_per_bag: 0, shortage_weight: 0, net_weight: 0, remarks: '' };
    setFormData(prev => ({ ...prev, lots: [...prev.lots, newLot] }));
    // Focus the new lot no field after render
    setTimeout(() => {
      document.getElementById(`lot-${formData.lots.length}-lot_no`)?.focus();
    }, 50);
  };

  const removeLot = (index: number) => {
    if (formData.lots.length === 1) {
      alert('Voucher must have at least one lot.');
      return;
    }
    openConfirmation({
      title: 'Remove Lot',
      message: 'Are you sure you want to remove this lot line item?',
      onConfirm: () => {
        const newLots = formData.lots.filter((_, i) => i !== index);
        const { totalBags, totalWeight } = updateTotals(newLots);
        setFormData(prev => ({ ...prev, lots: newLots, total_bags: totalBags, total_weight: totalWeight }));
      }
    });
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (formData.lots.length === 0 || !formData.lots[0].garden_id) {
      alert('Please add at least one lot with a garden.');
      return;
    }
    try {
      await invoke('receipt-voucher:save', formData);
      onSaved();
    } catch (err) {
      alert('Failed to save voucher: ' + err);
    }
  };

  const moveFocus = (currentId: string, direction: 'next' | 'prev') => {
    // 1. Check if in header
    const headerIdx = fieldOrder.indexOf(currentId);
    if (headerIdx !== -1) {
      if (direction === 'next') {
        if (headerIdx < fieldOrder.length - 1) {
          const nextId = fieldOrder[headerIdx + 1];
          document.getElementById(nextId)?.focus();
          // If it's a select, it will have a focusable child
          const selectChild = document.getElementById(nextId)?.querySelector('[tabindex="0"]') as HTMLElement;
          selectChild?.focus();
        } else {
          // Move to first lot
          document.getElementById('lot-0-lot_no')?.focus();
        }
      } else if (headerIdx > 0) {
        const prevId = fieldOrder[headerIdx - 1];
        document.getElementById(prevId)?.focus();
        const selectChild = document.getElementById(prevId)?.querySelector('[tabindex="0"]') as HTMLElement;
        selectChild?.focus();
      }
      return;
    }

    const lotMatch = currentId.match(/lot-(\d+)-(.+)/);
    if (lotMatch) {
      const rowIdx = parseInt(lotMatch[1]);
      const fieldName = lotMatch[2];
      const lotFields = ['lot_no', 'garden_id', 'grade', 'total_bags', 'weight_per_bag', 'shortage_weight', 'remarks'];
      const fieldIdx = lotFields.indexOf(fieldName);

      if (direction === 'next') {
        if (fieldIdx < lotFields.length - 1) {
          const nextId = `lot-${rowIdx}-${lotFields[fieldIdx + 1]}`;
          const el = document.getElementById(nextId);
          el?.focus();
          (el?.querySelector('[tabindex="0"]') as HTMLElement)?.focus();
        } else if (rowIdx < formData.lots.length - 1) {
          const nextId = `lot-${rowIdx + 1}-${lotFields[0]}`;
          const el = document.getElementById(nextId);
          el?.focus();
          (el?.querySelector('[tabindex="0"]') as HTMLElement)?.focus();
        }
      } else {
        if (fieldIdx > 0) {
          const prevId = `lot-${rowIdx}-${lotFields[fieldIdx - 1]}`;
          const el = document.getElementById(prevId);
          el?.focus();
          (el?.querySelector('[tabindex="0"]') as HTMLElement)?.focus();
        } else if (rowIdx > 0) {
          const prevId = `lot-${rowIdx - 1}-${lotFields[lotFields.length - 1]}`;
          const el = document.getElementById(prevId);
          el?.focus();
        } else {
          // Move back to header
          const lastHeaderId = fieldOrder[fieldOrder.length - 1];
          document.getElementById(lastHeaderId)?.focus();
        }
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      moveFocus(id, 'next');
    }
  };

  useHotkeys({
    'Cmd+Enter': () => addLot(),
    'Cmd+S': () => handleSubmit(),
    'Cmd+B': () => onClose(),
    'Cmd+Backspace': () => {
      const activeEl = document.activeElement;
      const lotMatch = activeEl?.closest('tr')?.id || activeEl?.id;
      const match = lotMatch?.match(/lot-row-(\d+)/);
      if (match) removeLot(parseInt(match[1]));
    },
    'Cmd+Delete': () => {
      const activeEl = document.activeElement;
      const lotMatch = activeEl?.closest('tr')?.id || activeEl?.id;
      const match = lotMatch?.match(/lot-row-(\d+)/);      
      if (match) removeLot(parseInt(match[1]));
    }
  });

  const handleLotArrowNav = (e: React.KeyboardEvent, rowIndex: number, fieldName: string) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextRow = rowIndex + 1;
      if (nextRow < formData.lots.length) {
        const nextId = `lot-${nextRow}-${fieldName}`;
        const el = document.getElementById(nextId);
        el?.focus();
        (el?.querySelector('[tabindex="0"]') as HTMLElement)?.focus();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevRow = rowIndex - 1;
      if (prevRow >= 0) {
        const prevId = `lot-${prevRow}-${fieldName}`;
        const el = document.getElementById(prevId);
        el?.focus();
        (el?.querySelector('[tabindex="0"]') as HTMLElement)?.focus();
      } else {
        document.getElementById(fieldName)?.focus();
      }
    }
  };

  return (
    <div className="flex flex-col space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition-colors"
            title="Back to List (Esc)"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              {initialData ? 'Edit' : 'New'} Receipt Voucher
            </h2>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mt-0.5">
              Voucher Entry System
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            Cancel
            <KbdBadge keys="⌘B" className="bg-black/20 border-black/10 ml-2" />
          </button>
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 bg-primary hover:bg-primary-dark text-black font-bold rounded-xl transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
          >
            <Save size={18} />
            <span>Save Voucher</span>
            <KbdBadge keys="⌘S" className="bg-black/20 border-black/10 text-black/60 ml-2" />
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Voucher Details</label>
              <input 
                id="voucher_no"
                type="text" 
                placeholder="Voucher No" 
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-lg outline-none focus:ring-2 focus:ring-primary text-sm font-medium transition-all"
                value={formData.voucher_no}
                onChange={e => setFormData(p => ({ ...p, voucher_no: e.target.value }))}
                onKeyDown={e => handleKeyDown(e, 'voucher_no')}
                required
              />
              <SearchableSelect 
                id="firm_id"
                options={masters.firms} 
                value={formData.firm_id} 
                onChange={handleFirmChange} 
                onSelect={() => moveFocus('firm_id', 'next')}
                onAddNew={() => openQuickCreate('firm', 'firm_id', (item) => handleFirmChange(item.id))}
                placeholder="Select Firm" 
                masterRoute="Firm Master"
                required
              />
            </div>
            
            <div className="space-y-4">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Party & Bill</label>
              <SearchableSelect 
                id="party_id"
                options={masters.parties} 
                value={formData.party_id} 
                onChange={id => setFormData(p => ({ ...p, party_id: id }))} 
                onSelect={() => moveFocus('party_id', 'next')}
                onAddNew={() => openQuickCreate('party', 'party_id', (item) => setFormData(p => ({ ...p, party_id: item.id })))}
                placeholder="Select Party" 
                masterRoute="Party Master"
                required
              />
              <div className="flex gap-2">
                <input 
                  id="bill_no"
                  type="text" 
                  placeholder="Bill No" 
                  className="w-[50%] flex-1 px-4 py-2.5 bg-slate-50 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-lg outline-none focus:ring-2 focus:ring-primary text-sm font-medium transition-all"
                  value={formData.bill_no}
                  onChange={e => setFormData(p => ({ ...p, bill_no: e.target.value }))}
                  onKeyDown={e => handleKeyDown(e, 'bill_no')}
                />
                <input 
                  id="bill_date"
                  type="date" 
                  className="w-[50%] px-4 py-2.5 bg-slate-50 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-lg outline-none focus:ring-2 focus:ring-primary text-sm font-medium transition-all"
                  value={formData.bill_date}
                  onChange={e => setFormData(p => ({ ...p, bill_date: e.target.value }))}
                  onKeyDown={e => handleKeyDown(e, 'bill_date')}
                />
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Transport & GR</label>
              <SearchableSelect 
                id="transport_id"
                options={masters.transports} 
                value={formData.transport_id} 
                onChange={id => setFormData(p => ({ ...p, transport_id: id }))} 
                onSelect={() => moveFocus('transport_id', 'next')}
                onAddNew={() => openQuickCreate('transport', 'transport_id', (item) => setFormData(p => ({ ...p, transport_id: item.id })))}
                placeholder="Select Transport" 
                masterRoute="Transport Master"
              />
              <div className="flex gap-2">
                <input 
                  id="gr_no"
                  type="text" 
                  placeholder="GR No" 
                  className="w-[50%] flex-1 px-4 py-2.5 bg-slate-50 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-lg outline-none focus:ring-2 focus:ring-primary text-sm font-medium transition-all"
                  value={formData.gr_no}
                  onChange={e => setFormData(p => ({ ...p, gr_no: e.target.value }))}
                  onKeyDown={e => handleKeyDown(e, 'gr_no')}
                />
                <input 
                  id="gr_date"
                  type="date" 
                  className="w-[50%] px-4 py-2.5 bg-slate-50 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-lg outline-none focus:ring-2 focus:ring-primary text-sm font-medium transition-all"
                  value={formData.gr_date}
                  onChange={e => setFormData(p => ({ ...p, gr_date: e.target.value }))}
                  onKeyDown={e => handleKeyDown(e, 'gr_date')}
                />
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Receipt Details</label>
              <input 
                id="frieght_amount"
                type="number" 
                placeholder="Freight Amount" 
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-lg outline-none focus:ring-2 focus:ring-primary text-sm font-medium transition-all"
                value={formData.frieght_amount}
                onChange={e => setFormData(p => ({ ...p, frieght_amount: Number(e.target.value) }))}
                onKeyDown={e => handleKeyDown(e, 'frieght_amount')}
              />
              <div className="flex gap-2">
                <input 
                  id="receipt_no"
                  type="text" 
                  placeholder="Receipt No" 
                  className="w-[50%] px-4 py-2.5 bg-slate-50 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-lg outline-none focus:ring-2 focus:ring-primary text-sm font-medium transition-all"
                  value={formData.receipt_no}
                  onChange={e => setFormData(p => ({ ...p, receipt_no: e.target.value }))}
                  onKeyDown={e => handleKeyDown(e, 'receipt_no')}
                />
                <input 
                  id="receipt_date"
                  type="date" 
                  className="w-[50%] px-4 py-2.5 bg-slate-50 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-lg outline-none focus:ring-2 focus:ring-primary text-sm font-medium transition-all"
                  value={formData.receipt_date}
                  onChange={e => setFormData(p => ({ ...p, receipt_date: e.target.value }))}
                  onKeyDown={e => handleKeyDown(e, 'receipt_date')}
                />
              </div>
            </div>
          </div>

          <div className="pt-4 space-y-4">
            <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-4">
              <label className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Calculator size={20} className="text-primary" />
                Lot Wise Entry
              </label>
              <button 
                type="button" 
                onClick={addLot}
                className="flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg text-sm font-bold transition-all"
              >
                <Plus size={16} /> Add Line (⌘+Enter)
              </button>
            </div>

            <div className="overflow-x-auto min-h-[35vh]">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="text-[10px] uppercase tracking-widest font-bold text-slate-500">
                  <tr>
                    <th className="px-2 py-2 w-12">#</th>
                    <th className="px-2 py-2 w-32">Lot No</th>
                    <th className="px-2 py-2 min-w-[200px]">Garden</th>
                    <th className="px-2 py-2 min-w-[150px]">Grade</th>
                    <th className="px-2 py-2 w-32">Bags</th>
                    <th className="px-2 py-2 w-32">WPB (Kg)</th>
                    <th className="px-2 py-2 w-32">Shortage</th>
                    <th className="px-2 py-2 w-36 text-right">Net Weight</th>
                    <th className="px-2 py-2">Remarks</th>
                    <th className="px-2 py-2 w-12 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/5">
                  {formData.lots.map((lot, idx) => (
                    <tr key={lot.id} id={`lot-row-${idx}`} className="group transition-colors">
                      <td className="px-4 py-2 text-center font-mono text-slate-400">{idx + 1}</td>
                      <td className="px-2 py-2">
                        <input 
                          id={`lot-${idx}-lot_no`}
                          type="text" 
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-black/20 border border-transparent hover:border-black/10 dark:hover:border-white/10 focus:border-primary focus:bg-white dark:focus:bg-white/5 outline-none rounded-lg transition-all font-mono" 
                          value={lot.lot_no}
                          onChange={e => handleLotChange(idx, 'lot_no', e.target.value)}
                          onKeyDown={e => {
                            handleKeyDown(e, `lot-${idx}-lot_no`);
                            handleLotArrowNav(e, idx, 'lot_no');
                          }}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <SearchableSelect 
                          id={`lot-${idx}-garden_id`}
                          options={masters.gardens} 
                          value={lot.garden_id} 
                          onChange={id => handleLotChange(idx, 'garden_id', id)} 
                          onSelect={() => moveFocus(`lot-${idx}-garden_id`, 'next')}
                          onAddNew={() => openQuickCreate('garden', `lot-${idx}-garden_id`, (item) => handleLotChange(idx, `lot-${idx}-garden_id`, item.id))}
                          placeholder="Garden" 
                          masterRoute="Garden Master"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <SearchableSelect 
                          id={`lot-${idx}-grade`}
                          options={masters.grades.map((g: any) => ({id: g.name, name: g.name}))}
                          value={lot.grade} 
                          onChange={name => handleLotChange(idx, 'grade', name)} 
                          onSelect={() => moveFocus(`lot-${idx}-grade`, 'next')}
                          onAddNew={() => openQuickCreate('grade', `lot-${idx}-grade`, (item) => handleLotChange(idx, `lot-${idx}-grade`, item.id))}
                          placeholder="Grade" 
                          masterRoute="Grade Master"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input 
                          id={`lot-${idx}-total_bags`}
                          type="number" 
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-black/20 border border-transparent hover:border-black/10 dark:hover:border-white/10 focus:border-primary focus:bg-white dark:focus:bg-white/5 outline-none rounded-lg transition-all text-right font-mono" 
                          value={lot.total_bags || ''}
                          onChange={e => handleLotChange(idx, 'total_bags', Number(e.target.value))}
                          onKeyDown={e => {
                            handleKeyDown(e, `lot-${idx}-total_bags`);
                            handleLotArrowNav(e, idx, 'total_bags');
                          }}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input 
                          id={`lot-${idx}-weight_per_bag`}
                          type="number" 
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-black/20 border border-transparent hover:border-black/10 dark:hover:border-white/10 focus:border-primary focus:bg-white dark:focus:bg-white/5 outline-none rounded-lg transition-all text-right font-mono" 
                          value={lot.weight_per_bag || ''}
                          onChange={e => handleLotChange(idx, 'weight_per_bag', Number(e.target.value))}
                          onKeyDown={e => {
                            handleKeyDown(e, `lot-${idx}-weight_per_bag`);
                            handleLotArrowNav(e, idx, 'weight_per_bag');
                          }}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input 
                          id={`lot-${idx}-shortage_weight`}
                          type="number" 
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-black/20 border border-transparent hover:border-black/10 dark:hover:border-white/10 focus:border-primary focus:bg-white dark:focus:bg-white/5 outline-none rounded-lg transition-all text-right font-mono" 
                          value={lot.shortage_weight || ''}
                          onChange={e => handleLotChange(idx, 'shortage_weight', Number(e.target.value))}
                          onKeyDown={e => {
                            handleKeyDown(e, `lot-${idx}-shortage_weight`);
                            handleLotArrowNav(e, idx, 'shortage_weight');
                          }}
                        />
                      </td>
                      <td className="px-2 py-2 font-bold text-right text-slate-700 dark:text-slate-300 font-mono text-base">
                        {lot.net_weight.toFixed(3)}
                      </td>
                      <td className="px-2 py-2">
                        <input 
                          id={`lot-${idx}-remarks`}
                          type="text" 
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-black/20 border border-transparent hover:border-black/10 dark:hover:border-white/10 focus:border-primary focus:bg-white dark:focus:bg-white/5 outline-none rounded-lg transition-all" 
                          placeholder="..."
                          value={lot.remarks}
                          onChange={e => handleLotChange(idx, 'remarks', e.target.value)}
                          onKeyDown={e => {
                            handleKeyDown(e, `lot-${idx}-remarks`);
                            handleLotArrowNav(e, idx, 'remarks');
                          }}
                        />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button 
                          type="button"
                          onClick={() => removeLot(idx)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50/50 dark:bg-white/5 font-bold">
                  <tr className="text-slate-900 dark:text-white border-t border-black/10 dark:border-white/10">
                    <td colSpan={4} className="px-2 py-5 text-right text-xs uppercase tracking-widest text-slate-500 whitespace-nowrap">Consolidated Totals</td>
                    <td className="px-2 py-5 text-right font-mono text-xl text-primary">{formData.total_bags}</td>
                    <td colSpan={2}></td>
                    <td className="px-2 py-5 text-right font-mono text-xl text-primary">{formData.total_weight.toFixed(3)} Kg</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </form>
        {quickCreate.isOpen && (
          <QuickCreateMasterModal
            isOpen={quickCreate.isOpen}
            onClose={handleCloseQuickCreate}
            onSuccess={handleQuickCreateSuccess}
            entityName={quickCreate.type}
            title={quickCreate.type}
            fields={MASTER_CONFIGS[quickCreate.type].fields}
          />
        )}
      </div>

      <div className="flex items-center gap-6 text-[10px] text-slate-500 font-bold uppercase tracking-widest px-2">
        <div className="flex items-center gap-2"><KbdBadge keys="ENTER" /> Next Field</div>
        <div className="flex items-center gap-2"><KbdBadge keys="⌘+ENTER" /> New Lot</div>
        <div className="flex items-center gap-2"><KbdBadge keys="↑" /><KbdBadge keys="↓" /> Row Nav</div>
        <div className="flex items-center gap-2">
          <KbdBadge keys={isMac ? "⌘+DEL" : "⌘+⌫"} /> Delete Lot
        </div>
        <div className="flex items-center gap-2"><KbdBadge keys="⌘S" /> Save Voucher</div>
        <div className="flex items-center gap-2"><KbdBadge keys="⌘B" /> Back</div>
      </div>
    </div>    
  );
};

export default ReceiptVoucherForm;
