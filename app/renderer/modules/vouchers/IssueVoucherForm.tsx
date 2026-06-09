import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useIpc } from '../../hooks/useIpc';
import { useHotkeys } from '../../hooks/useHotkeys';
import { SearchableSelect } from '../../components/SearchableSelect';
import { ArrowLeft, Save } from 'lucide-react';
import { KbdBadge } from '../../components/KbdBadge';
import { useConfirmationStore } from '../../store/confirmationStore';
import { useNavigationStore } from '../../store/navigationStore';

interface IssueVoucherFormProps {
  onClose: () => void;
  onSaved: () => void;
  initialData?: any;
}

const IssueVoucherForm: React.FC<IssueVoucherFormProps> = ({ onClose, onSaved, initialData }) => {
  const { invoke, loading } = useIpc();
  const { openConfirmation } = useConfirmationStore();
  const { setModule } = useNavigationStore();
  const isMac = window.navigator.platform.toLowerCase().includes('mac');
  
  const [formData, setFormData] = useState({
    voucher_no: '',
    firm_id: '',
    party_id: '',
    receipt_voucher_lot_id: '',
    challan_no: '',
    no_of_bags: 0,
    weight_per_bag: 0,
    shortage_weight: 0,
    net_weight: 0,
    issue_date: new Date().toISOString().split('T')[0],
    remarks: ''
  });
  const [masters, setMasters] = useState({ firms: [], parties: [], availableLots: [] });
  const [selectedGarden, setSelectedGarden] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');

  // Header navigation order
  const fieldOrder = [
    'firm_id', 'voucher_no', 'party_id', 'challan_no', 'issue_date',
    'garden_id', 'grade', 'receipt_voucher_lot_id', 
    'no_of_bags', 'weight_per_bag', 'shortage_weight', 'remarks'
  ];

  const fetchMasters = useCallback(async () => {
    try {      
      const [firms, parties, availableLots] = await Promise.all([
        invoke('firm:get-all'),
        invoke('party:get-all'),
        invoke('stock:get-available', initialData?.id)
      ]);
      setMasters({ firms, parties, availableLots });
    } catch (err) {
      console.error('Failed to fetch masters:', err);
    }
  }, [invoke, initialData]);

  useEffect(() => {
    fetchMasters();
    if (initialData) {
        setFormData(initialData);
        if (initialData.lot) {
            setSelectedGarden(initialData.lot.garden.name);
            setSelectedGrade(initialData.lot.grade);
        }
    }
    setTimeout(() => document.getElementById('firm_id')?.focus(), 100);
  }, [fetchMasters, initialData]);

  const gardens = Array.from(new Set(masters.availableLots.map((l: any) => l.garden_name))).map((name: any) => ({ id: name, name }));
  const grades = Array.from(new Set(masters.availableLots.filter((l: any) => l.garden_name === selectedGarden).map((l: any) => l.grade))).map((name: any) => ({ id: name, name }));
  const filteredStock = masters.availableLots.filter((l: any) => l.garden_name === selectedGarden);
  const filteredLots = masters.availableLots.filter((l: any) => l.garden_name === selectedGarden && l.grade === selectedGrade);

  useEffect(() => {
    const net = (Number(formData.no_of_bags) * Number(formData.weight_per_bag)) - Number(formData.shortage_weight);
    setFormData(prev => ({ ...prev, net_weight: net }));
  }, [formData.no_of_bags, formData.weight_per_bag, formData.shortage_weight]);

  const handleFirmChange = async (firmId: string) => {
    setFormData(prev => ({ ...prev, firm_id: firmId }));
    try {
      const nextNo = await invoke('issue-voucher:get-next-no', firmId);
      setFormData(prev => ({ ...prev, voucher_no: nextNo }));
    } catch (err) {
      console.error('Failed to generate voucher no:', err);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    // Validate against available stock
    const selectedLot = masters.availableLots.find((l: any) => l.id === formData.receipt_voucher_lot_id) as any;
    if (!selectedLot) {
        alert('Please select a valid lot.');
        return;
    }

    if (formData.no_of_bags > selectedLot.available_bags) {
        alert(`Bags exceed available stock (${selectedLot.available_bags} available).`);
        return;
    }

    if (formData.net_weight > selectedLot.available_weight + 0.001) { // Adding small tolerance for float comparison
        alert(`Net weight exceeds available stock (${Number(selectedLot.available_weight).toFixed(3)} Kg available).`);
        return;
    }

    if (!formData.firm_id || formData.no_of_bags <= 0 || !formData.receipt_voucher_lot_id) {
      alert('Please fill in required fields (Firm, Lot, Bags).');
      return;
    }
    
    // Convert empty strings to null for optional fields
    const submissionData = {
      ...formData,
      party_id: formData.party_id || null,
      issue_date: formData.issue_date
    };

    try {
      await invoke('issue-voucher:save', submissionData);
      onSaved();
    } catch (err) {
      alert('Failed to save voucher: ' + err);
    }
  };

  const moveFocus = (currentId: string, direction: 'next' | 'prev') => {
    const currentIdx = fieldOrder.indexOf(currentId);
    if (currentIdx === -1) return;

    if (direction === 'next') {
        if (currentIdx < fieldOrder.length - 1) {
            const nextId = fieldOrder[currentIdx + 1];
            const el = document.getElementById(nextId);
            el?.focus();
            (el?.querySelector('[tabindex="0"]') as HTMLElement)?.focus();
        }
    } else if (currentIdx > 0) {
        const prevId = fieldOrder[currentIdx - 1];
        const el = document.getElementById(prevId);
        el?.focus();
        (el?.querySelector('[tabindex="0"]') as HTMLElement)?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      moveFocus(id, 'next');
    }
  };

  useHotkeys({
    'Cmd+S': () => handleSubmit(),
    'Cmd+B': () => onClose(),
  });

  return (
    <div className="flex gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex-1 space-y-6">
        <div className="flex items-center justify-between">
            <button onClick={onClose} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition-colors"><ArrowLeft size={24} /></button>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{initialData ? 'Edit' : 'New'} Issue Voucher</h2>
            <button onClick={() => handleSubmit()} className="flex items-center gap-2 px-6 py-2 bg-primary hover:bg-primary-dark text-black font-bold rounded-xl transition-all shadow-lg shadow-primary/20"><Save size={18}/>Save <KbdBadge keys="⌘S" className="bg-black/20 border-black/10 text-black/60 ml-1" /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6 bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl shadow-sm">
          <div className="grid grid-cols-2 gap-4">
             <SearchableSelect id="firm_id" options={masters.firms} value={formData.firm_id} onChange={handleFirmChange} onSelect={() => moveFocus('firm_id', 'next')} placeholder="Select Firm" masterRoute="Firm Master" label="Firm" />
             <div className="space-y-1.5"><label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Voucher No</label><input id="voucher_no" type="text" placeholder="Voucher No" value={formData.voucher_no} onChange={e => setFormData(p=>({...p, voucher_no: e.target.value}))} onKeyDown={e => handleKeyDown(e, 'voucher_no')} className="w-full px-4 py-2 bg-slate-50 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-lg outline-none text-sm" /></div>
             <SearchableSelect id="party_id" options={masters.parties} value={formData.party_id} onChange={id => setFormData(p=>({...p, party_id: id}))} onSelect={() => moveFocus('party_id', 'next')} placeholder="Select Party" masterRoute="Party Master" label="Party" />
             <div className="space-y-1.5"><label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Challan/DO Number</label><input id="challan_no" type="text" placeholder="Challan/DO Number" value={formData.challan_no} onChange={e => setFormData(p=>({...p, challan_no: e.target.value}))} onKeyDown={e => handleKeyDown(e, 'challan_no')} className="w-full px-4 py-2 bg-slate-50 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-lg outline-none text-sm" /></div>
             <div className="space-y-1.5"><label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Issue Date</label><input id="issue_date" type="date" value={formData.issue_date} onChange={e => setFormData(p=>({...p, issue_date: e.target.value}))} onKeyDown={e => handleKeyDown(e, 'issue_date')} className="w-full px-4 py-2 bg-slate-50 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-lg outline-none text-sm" /></div>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <SearchableSelect id="garden_id" options={gardens} value={selectedGarden} onChange={v => {setSelectedGarden(v); setSelectedGrade('');}} onSelect={() => moveFocus('garden_id', 'next')} placeholder="Select Garden" masterRoute="Garden Master" label="Garden" />
            <SearchableSelect id="grade" options={grades.map((g: any) => ({id: g.name, name: g.name}))} value={selectedGrade} onChange={v => setSelectedGrade(v)} onSelect={() => moveFocus('grade', 'next')} placeholder="Select Grade" masterRoute="Grade Master" label="Grade" />
            <SearchableSelect id="receipt_voucher_lot_id" options={filteredLots.map((l:any)=>({id: l.id, name: `${l.lot_no} (${l.grade})`}))} value={formData.receipt_voucher_lot_id} onChange={id => {
                const lot = filteredLots.find((l:any) => l.id === id) as any;
                setFormData(p => ({...p, receipt_voucher_lot_id: id, weight_per_bag: lot.weight_per_bag}))
            }} onSelect={() => moveFocus('receipt_voucher_lot_id', 'next')} placeholder="Select Lot" masterRoute="" label="Lot" />
          </div>
          
          <div className="grid grid-cols-4 gap-4">
             <div className="space-y-1.5"><label className="block text-sm font-bold text-slate-700 dark:text-slate-300">No. of Bags</label><input id="no_of_bags" type="number" placeholder="No. of Bags" value={formData.no_of_bags} onChange={e => setFormData(p=>({...p, no_of_bags: Number(e.target.value)}))} onKeyDown={e => handleKeyDown(e, 'no_of_bags')} className="w-full px-4 py-2 bg-slate-50 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-lg outline-none text-sm" /></div>
             <div className="space-y-1.5"><label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Wt/Bag</label><input id="weight_per_bag" type="number" placeholder="Wt/Bag" value={formData.weight_per_bag} onChange={e => setFormData(p=>({...p, weight_per_bag: Number(e.target.value)}))} onKeyDown={e => handleKeyDown(e, 'weight_per_bag')} className="w-full px-4 py-2 bg-slate-50 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-lg outline-none text-sm" /></div>
             <div className="space-y-1.5"><label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Shortage Wt</label><input id="shortage_weight" type="number" placeholder="Shortage Wt" value={formData.shortage_weight} onChange={e => setFormData(p=>({...p, shortage_weight: Number(e.target.value)}))} onKeyDown={e => handleKeyDown(e, 'shortage_weight')} className="w-full px-4 py-2 bg-slate-50 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-lg outline-none text-sm" /></div>
             <div className="space-y-1.5"><label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Net Weight</label><input type="number" placeholder="Net Weight" value={formData.net_weight.toFixed(3)} className="w-full px-4 py-2 bg-slate-50 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-lg outline-none text-sm" disabled /></div>
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Remarks</label>
            <textarea id="remarks" placeholder="Remarks" value={formData.remarks} onChange={e => setFormData(p=>({...p, remarks: e.target.value}))} className="w-full px-4 py-2 bg-slate-50 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-lg outline-none text-sm h-24" />
          </div>
        </form>
      </div>

      <div className="w-80 bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl p-4 shadow-sm h-fit">
        <h3 className="font-bold mb-4">Available Stock <br/>{selectedGarden && <small className="text-xs text-slate-600">({ selectedGarden })</small>}</h3>
        {selectedGarden ? (
        <table className="border w-full text-xs">
          <thead>
            <tr><th className="border text-left py-2 px-1">Grade</th><th className="border text-right py-2 px-1">Avail. Bags</th><th className="border text-right py-2 px-1">Avail. WT.</th></tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {filteredStock.map((lot: any) => (
              <tr key={lot.id}>
                <td className="border py-2 px-1">{lot.grade}</td>
                <td className="border text-right py-2 px-1">{lot.available_bags}</td>
                <td className="border py-2 px-1 text-right tracking-wider">{Number(lot.available_weight).toLocaleString('en-IN', {maximumFractionDigits: 3})}Kg</td>
              </tr>
            ))}
          </tbody>
        </table>
        ) : <p className='text-xs text-slate-400'>Select a garden to see stock.</p>}
      </div>
      
      {/* Fixed Keyboard Helper Footer */}
      <div className="fixed bottom-10 right-6 flex items-center gap-6 text-[10px] text-slate-500 font-bold uppercase tracking-widest px-2 bg-[#080e1a]/80 backdrop-blur p-2 rounded-lg border border-white/10">
        <div className="flex items-center gap-2"><KbdBadge keys="ENTER" /> Next Field</div>
        <div className="flex items-center gap-2"><KbdBadge keys="⌘S" /> Save Voucher</div>
        <div className="flex items-center gap-2"><KbdBadge keys="⌘B" /> Back</div>
      </div>
    </div>
  );
};

export default IssueVoucherForm;
