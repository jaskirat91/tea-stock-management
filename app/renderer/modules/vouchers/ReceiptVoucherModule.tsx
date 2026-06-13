import React, { useState, useEffect, useCallback } from 'react';
import { useIpc } from '../../hooks/useIpc';
import { useHotkeys } from '../../hooks/useHotkeys';
import { useConfirmationStore } from '../../store/confirmationStore';
import ReceiptVoucherForm from './ReceiptVoucherForm';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Eye,
  RotateCcw, 
  ChevronLeft, 
  ChevronRight,
  FileText,
  Calendar,
  User,
  Building,
  Truck,
  Hash
} from 'lucide-react';
import { KbdBadge } from '../../components/KbdBadge';
import ReceiptVoucherDetails from './ReceiptVoucherDetails';

const ReceiptVoucherModule: React.FC = () => {
  const { invoke, loading } = useIpc();
  const { openConfirmation } = useConfirmationStore();
  const [data, setData] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [filters, setFilters] = useState({
    voucher_no: '',
    firm_id: '',
    party_id: '',
    bill_no: '',
    bill_date: '',
    gr_no: '',
    receipt_no: '',
    transport_id: '',
    garden_id: '',
    lot_no: ''
  });
  
  // viewMode: 'list' | 'form' | 'view'
  const [viewMode, setViewMode] = useState<'list' | 'form' | 'view'>('list');
  const [editingVoucher, setEditingVoucher] = useState<any>(null);
  const [selectedVoucherId, setSelectedVoucherId] = useState<string | null>(null);
  const [masters, setMasters] = useState({ firms: [], parties: [], transports: [], gardens: [] });
  const [availableLots, setAvailableLots] = useState<string[]>([]);

  const fetchData = useCallback(async (page = 1) => {
    try {
      const result = await invoke('receipt-voucher:get-paginated', { 
        page, 
        limit: 20, 
        filters 
      });
      setData(result.items);
      setPagination({ page: result.page, totalPages: result.totalPages, total: result.total });
    } catch (err) {
      console.error('Failed to fetch vouchers:', err);
    }
  }, [invoke, filters]);

  const fetchMasters = useCallback(async () => {
    try {
      const [firms, parties, transports, gardens] = await Promise.all([
        invoke('firm:get-all'),
        invoke('party:get-all'),
        invoke('transport:get-all'),
        invoke('garden:get-all')
      ]);
      setMasters({ firms, parties, transports, gardens });
    } catch (err) {
      console.error('Failed to fetch masters:', err);
    }
  }, [invoke]);

  const fetchLots = useCallback(async (gardenId: string) => {
    if (!gardenId) {
      setAvailableLots([]);
      return;
    }
    try {
      const result = await invoke('receipt-voucher-lot:get-unique-lots', gardenId);
      setAvailableLots(result);
    } catch (err) {
      console.error('Failed to fetch lots:', err);
    }
  }, [invoke]);

  useEffect(() => {
    if (viewMode === 'list') {
      fetchData();
      fetchMasters();
    }
  }, [viewMode, fetchData, fetchMasters]);

  useEffect(() => {
    if (filters.garden_id) {
      fetchLots(filters.garden_id);
    } else {
      setAvailableLots([]);
    }
  }, [filters.garden_id, fetchLots]);

  const handleAdd = () => {
    setEditingVoucher(null);
    setViewMode('form');
  };

  const handleEdit = (voucher: any) => {
    const voucherData = {
      id: voucher.id,
      voucher_no: voucher.voucher_no,
      firm_id: voucher.firm_id,
      party_id: voucher.party_id,
      bill_no: voucher.bill_no,
      bill_date: voucher.bill_date,
      transport_id: voucher.transport_id,
      frieght_amount: voucher.frieght_amount,
      gr_no: voucher.gr_no,
      gr_date: voucher.gr_date,
      receipt_no: voucher.receipt_no,
      receipt_date: voucher.receipt_date,
      total_bags: voucher.total_bags,
      total_weight: voucher.total_weight,
      createdAt: voucher.createdAt,
      updatedAt: voucher.updatedAt,
      lots: voucher.lots.map((lot: any) => ({
        id: lot.id,
        voucher_id: lot.voucher_id,
        lot_no: lot.lot_no,
        garden_id: lot.garden_id,
        grade: lot.grade,
        total_bags: lot.total_bags,
        weight_per_bag: lot.weight_per_bag,
        shortage_weight: lot.shortage_weight,
        net_weight: lot.net_weight,
        remarks: lot.remarks,
        claim_raised: lot.claim_raised,
        claim_rate: lot.claim_rate,
        claim_amount: lot.claim_amount,
        createdAt: lot.createdAt,
        updatedAt: lot.updatedAt        
      })),
    }
    setEditingVoucher(voucherData);
    setViewMode('form');
  };

  const handleView = (id: string) => {
    setSelectedVoucherId(id);
    setViewMode('view');
  };

  const handleDelete = (id: string) => {
    openConfirmation({
      title: 'Delete Voucher',
      message: 'Are you sure you want to delete this receipt voucher? This action cannot be undone.',
      onConfirm: async () => {
        try {
          await invoke('receipt-voucher:delete', id);
          fetchData(pagination.page);
        } catch (err) {
          alert('Delete failed: ' + err);
        }
      }
    });
  };

  useHotkeys({
    'Cmd+N': () => viewMode === 'list' && handleAdd(),
    'Cmd+F': () => viewMode === 'list' && document.getElementById('voucher-search')?.focus(),
  });

  if (viewMode === 'form') {
    return (
      <ReceiptVoucherForm 
        initialData={editingVoucher}
        onClose={() => setViewMode('list')}
        onSaved={() => {
          setViewMode('list');
          fetchData(1);
        }}
      />
    );
  }

  if (viewMode === 'view' && selectedVoucherId) {
    return (
      <ReceiptVoucherDetails 
        id={selectedVoucherId}
        onClose={() => setViewMode('list')}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Filters Bar */}
      <div className="bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl p-4 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <div className="relative flex">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              id="voucher-search"
              type="text"
              placeholder="Voucher No"
              className="w-full pl-9 px-4 py-2 bg-slate-50 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary transition-all"
              value={filters.voucher_no}
              onChange={e => setFilters(f => ({ ...f, voucher_no: e.target.value }))}
            />
          </div>
          
          <input
            type="text"
            placeholder="Bill No"
            className="w-full px-4 py-2 bg-slate-50 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary transition-all"
            value={filters.bill_no}
            onChange={e => setFilters(f => ({ ...f, bill_no: e.target.value }))}
          />
          <select
            className="w-full px-3 py-2 bg-slate-50 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary transition-all font-medium"
            value={filters.firm_id}
            onChange={e => setFilters(f => ({ ...f, firm_id: e.target.value }))}
          >
            <option value="">All Firms</option>
            {masters.firms.map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>

          <select
            className="w-full px-3 py-2 bg-slate-50 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary transition-all font-medium"
            value={filters.party_id}
            onChange={e => setFilters(f => ({ ...f, party_id: e.target.value }))}
          >
            <option value="">All Parties</option>
            {masters.parties.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input
            type="text"
            placeholder="GR No"
            className="w-full px-4 py-2 bg-slate-50 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary transition-all"
            value={filters.gr_no}
            onChange={e => setFilters(f => ({ ...f, gr_no: e.target.value }))}
          />
          <select
            className="w-full px-3 py-2 bg-slate-50 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary transition-all font-medium"
            value={filters.transport_id}
            onChange={e => setFilters(f => ({ ...f, transport_id: e.target.value }))}
          >
            <option value="">All Transports</option>
            {masters.transports.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>

          <select
            className="w-full px-3 py-2 bg-slate-50 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary transition-all font-medium"
            value={filters.garden_id}
            onChange={e => setFilters(f => ({ ...f, garden_id: e.target.value, lot_no: '' }))}
          >
            <option value="">All Gardens</option>
            {masters.gardens.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>

          <select
            className="w-full px-3 py-2 bg-slate-50 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary transition-all font-medium disabled:opacity-50"
            value={filters.lot_no}
            onChange={e => setFilters(f => ({ ...f, lot_no: e.target.value }))}
            disabled={!filters.garden_id}
          >
            <option value="">All Lots</option>
            {availableLots.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button 
            onClick={() => setFilters({ voucher_no: '', firm_id: '', party_id: '', bill_no: '', bill_date: '', gr_no: '', receipt_no: '', transport_id: '', garden_id: '', lot_no: '' })}
            className="px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-lg text-xs flex items-center justify-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
          >
            <RotateCcw size={14} /> Reset
          </button>

          <button
            onClick={handleAdd}
            className="px-4 py-2 bg-primary text-black font-bold rounded-lg text-xs flex items-center justify-center gap-2 hover:bg-primary-dark transition-all shadow-lg shadow-primary/20"
          >
            <Plus size={14} /> New <KbdBadge keys="⌘N" />
          </button>
        </div>
      </div>

      {/* List Table */}
      <div className="bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm  text-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-white/5 border-b border-black/10 dark:border-white/10">
                <th className="px-3 py-2 uppercase tracking-wider font-bold">Voucher Details</th>
                <th className="px-3 py-2 uppercase tracking-wider font-bold">Firm / Party</th>
                <th className="px-3 py-2 uppercase tracking-wider font-bold">Transport / GR</th>
                <th className="px-3 py-2 uppercase tracking-wider font-bold">Lot Details</th>
                <th className="px-3 py-2 uppercase tracking-wider font-bold text-center">Bags Qty</th>
                <th className="px-3 py-2 uppercase tracking-wider font-bold text-right">Net Weight</th>
                <th className="px-3 py-2 uppercase tracking-wider font-bold text-right">Freight</th>
                <th className="px-3 py-2 uppercase tracking-wider font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5 text-[12px]">
              {data.length > 0 ? (
                data.map((v) => (
                  <tr key={v.id} className="hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-colors group">
                    <td className="px-3 py-2">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <FileText size={14} className="text-primary" /> {v.voucher_no}
                        </span>
                        <span className="text-[10px] text-slate-600 dark:text-slate-400 flex items-center gap-1 font-medium">
                          <Calendar size={10} className='text-slate-400' /> Bill: {v.bill_no || '-'} ({v.bill_date ? new Date(v.bill_date).toLocaleDateString('en-IN') : 'N/A'})
                        </span>
                        {v.receipt_no && (
                          <span className="text-[10px] text-slate-600 dark:text-slate-400 flex items-center gap-1 font-medium">
                            <Hash size={10} className='text-slate-400' /> Receipt: {v.receipt_no} ({v.receipt_date ? new Date(v.receipt_date).toLocaleDateString('en-IN') : 'N/A'})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                          <Building size={12} className="text-slate-400" /> {v.firm?.name}
                        </span>
                        <span className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5 mt-1 font-medium">
                          <User size={12} className="text-slate-400" /> {v.party?.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                          <Truck size={12} className="text-slate-400" /> {v.transport?.name || '-'}
                        </span>
                        <span className="text-[10px] text-slate-600 dark:text-slate-400 mt-1 font-mono">
                          GR: {v.gr_no || '-'} ({v.gr_date ? new Date(v.gr_date).toLocaleDateString('en-IN') : '-'})
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-1">
                      <div className="flex flex-col min-w-[240px]">
                        {v.lots?.map((lot: any) => (
                          <div key={lot.id} className="flex items-center justify-between gap-2 py-0.5 border-b border-black/[0.03] dark:border-white/[0.03] last:border-0 text-[10px]">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[80px]" title={lot.garden?.name}>
                                {lot.garden?.name}
                              </span>
                              <span className="text-[9px] px-1 bg-primary/10 text-primary rounded-sm font-black uppercase shrink-0">
                                {lot.grade}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 font-medium text-slate-500 dark:text-slate-400">
                              <span>L: <span className="text-slate-800 dark:text-slate-200 font-bold">{lot.lot_no}</span></span>
                              <span>B: <span className="text-slate-800 dark:text-slate-200 font-bold">{lot.total_bags}</span></span>
                              <span className="text-red-500 font-bold">S: {Number(lot.shortage_weight).toLocaleString('en-IN', {maximumFractionDigits: 3})} kg</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className="px-3 py-1 rounded-full bg-primary/10 text-primary font-bold text-xs">
                        {v.total_bags}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-slate-700 dark:text-slate-300">
                      {Number(v.total_weight).toFixed(3)} Kg
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-slate-700 dark:text-slate-300">
                      ₹{Number(v.frieght_amount).toLocaleString('en-IN',{ maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleView(v.id)}
                          className="p-2 rounded-lg hover:bg-primary/20 text-slate-400 hover:text-primary transition-colors"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                        <button 
                          onClick={() => handleEdit(v)}
                          className="p-2 rounded-lg hover:bg-primary/20 text-slate-400 hover:text-primary transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(v.id)}
                          className="p-2 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-24 text-center text-slate-400 italic text-sm">
                    {loading ? 'Fetching data...' : 'No vouchers found matching your criteria.'}
                  </td>
                </tr>

              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-3 py-2 border-t border-black/10 dark:border-white/10 flex items-center justify-between bg-slate-50/50 dark:bg-white/5">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">
              Records: <span className="text-slate-900 dark:text-white">{pagination.total}</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page === 1}
                onClick={() => fetchData(pagination.page - 1)}
                className="p-2 rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 transition-all"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs font-black text-slate-900 dark:text-white px-4 py-1.5 bg-black/5 dark:bg-white/5 rounded-md">
                PAGE {pagination.page} / {pagination.totalPages}
              </span>
              <button
                disabled={pagination.page === pagination.totalPages}
                onClick={() => fetchData(pagination.page + 1)}
                className="p-2 rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 transition-all"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReceiptVoucherModule;
