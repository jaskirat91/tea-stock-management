import React, { useState, useEffect, useCallback } from 'react';
import { useIpc } from '../../hooks/useIpc';
import { useHotkeys } from '../../hooks/useHotkeys';
import { useConfirmationStore } from '../../store/confirmationStore';
import IssueVoucherForm from './IssueVoucherForm';
import { 
  Plus, Search, Edit2, Trash2, RotateCcw, ChevronLeft, ChevronRight, FileText, Calendar, User, Building, Leaf, Box
} from 'lucide-react';
import { KbdBadge } from '../../components/KbdBadge';

const IssueVoucherModule: React.FC = () => {
  const { invoke, loading } = useIpc();
  const { openConfirmation } = useConfirmationStore();
  const [data, setData] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [filters, setFilters] = useState({
    voucher_no: '',
    firm_id: '',
    party_id: '',
    lot_no: '',
    challan_no: '',
    garden_id: '',
    grade: ''
  });
  
  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  const [editingVoucher, setEditingVoucher] = useState<any>(null);
  const [masters, setMasters] = useState({ firms: [], parties: [], gardens: [], grades: [] });

  const fetchData = useCallback(async (page = 1) => {
    try {
      const result = await invoke('issue-voucher:get-paginated', { page, limit: 20, filters });
      setData(result.items);
      setPagination({ page: result.page, totalPages: result.totalPages, total: result.total });
    } catch (err) {
      console.error('Failed to fetch vouchers:', err);
    }
  }, [invoke, filters]);

  const fetchMasters = useCallback(async () => {
    try {
      const [firms, parties, gardens, grades] = await Promise.all([
        invoke('firm:get-all'), 
        invoke('party:get-all'),
        invoke('garden:get-all'),
        invoke('grade:get-all')
      ]);
      setMasters({ firms, parties, gardens, grades });
    } catch (err) {
      console.error('Failed to fetch masters:', err);
    }
  }, [invoke]);

  useEffect(() => {
    if (viewMode === 'list') {
      fetchData();
      fetchMasters();
    }
  }, [viewMode, fetchData, fetchMasters]);

  const handleAdd = () => {
    setEditingVoucher(null);
    setViewMode('form');
  };

  const handleEdit = (voucher: any) => {
    setEditingVoucher(voucher);
    setViewMode('form');
  };

  const handleDelete = (id: string) => {
    openConfirmation({
      title: 'Delete Voucher',
      message: 'Are you sure you want to delete this issue voucher?',
      onConfirm: async () => {
        try {
          await invoke('issue-voucher:delete', id);
          fetchData(pagination.page);
        } catch (err) {
          alert('Delete failed: ' + err);
        }
      }
    });
  };

  useHotkeys({
    'Cmd+N': () => viewMode === 'list' && handleAdd(),
    'Cmd+F': () => viewMode === 'list' && document.getElementById('issue-voucher-search')?.focus(),
  });

  if (viewMode === 'form') {
    return (
      <IssueVoucherForm 
        initialData={editingVoucher}
        onClose={() => setViewMode('list')}
        onSaved={() => {
          setViewMode('list');
          fetchData(1);
        }}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <div className="relative flex">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              id="issue-voucher-search"
              type="text"
              placeholder="Voucher No"
              className="w-full pl-9 px-4 py-2 bg-slate-50 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary transition-all"
              value={filters.voucher_no}
              onChange={e => setFilters(f => ({ ...f, voucher_no: e.target.value }))}
            />
          </div>
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
          <div className="relative flex">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Lot No"
              className="w-full pl-9 px-4 py-2 bg-slate-50 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary transition-all"
              value={filters.lot_no}
              onChange={e => setFilters(f => ({ ...f, lot_no: e.target.value }))}
            />
          </div>
          <select
            className="w-full px-3 py-2 bg-slate-50 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary transition-all font-medium"
            value={filters.garden_id}
            onChange={e => setFilters(f => ({ ...f, garden_id: e.target.value }))}
          >
            <option value="">All Gardens</option>
            {masters.gardens.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <select
            className="w-full px-3 py-2 bg-slate-50 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary transition-all font-medium"
            value={filters.grade}
            onChange={e => setFilters(f => ({ ...f, grade: e.target.value }))}
          >
            <option value="">All Grades</option>
            {masters.grades.map((g: any) => <option key={g.name} value={g.name}>{g.name}</option>)}
          </select>
          <button 
            onClick={() => setFilters({ voucher_no: '', firm_id: '', party_id: '', lot_no: '', challan_no: '', garden_id: '', grade: '' })}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-lg text-xs flex items-center justify-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
          >
            <RotateCcw size={14} /> Reset
          </button>
          <button
            onClick={handleAdd}
            className="px-4 py-2 bg-primary text-black font-bold rounded-lg text-xs flex items-center justify-center gap-2 hover:bg-primary-dark transition-all shadow-lg shadow-primary/20"
          >
            <Plus size={14} /> New <KbdBadge keys="⌘N" className="bg-black/10 border-black/10 text-black/60 ml-1" />
          </button>
        </div>
      </div>
      
      <div className="bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm text-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-white/5 border-b border-black/10 dark:border-white/10">
                <th className="px-3 py-2 uppercase tracking-wider font-bold">Voucher Details</th>
                <th className="px-3 py-2 uppercase tracking-wider font-bold">Firm / Party</th>
                <th className="px-3 py-2 uppercase tracking-wider font-bold">Garden / Grade</th>
                <th className="px-3 py-2 uppercase tracking-wider font-bold">Lot / Challan</th>
                <th className="px-3 py-2 uppercase tracking-wider font-bold text-center">Bags</th>
                <th className="px-3 py-2 uppercase tracking-wider font-bold text-center">Shortage WT.</th>
                <th className="px-3 py-2 uppercase tracking-wider font-bold text-right">Net Weight</th>
                <th className="px-3 py-2 uppercase tracking-wider font-bold text-right">Bill Issued</th>
                <th className="px-3 py-2 uppercase tracking-wider font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5 text-[12px]">
              {data.length > 0 ? (
                data.map((v) => (
                  <tr key={v.id} className="hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-colors group">
                    <td className="px-3 py-2">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <FileText size={14} className="text-primary" /> {v.voucher_no}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                          {v.firm?.name || '-'}
                        </span>
                        <span className="text-xs text-slate-500 mt-1">
                          {v.party?.name || '-'}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                          <Leaf size={12} className="inline mr-1 text-slate-400" /> {v.lot?.garden?.name || '-'}
                        </span>
                        <span className="text-xs text-slate-500 mt-1">
                          <Box size={12} className="inline mr-1 text-slate-400" /> Grade: {v.lot?.grade || '-'}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Lot: {v.lot?.lot_no || '-'}</span>
                        <span className="text-xs text-slate-500 mt-1">Challan: {v.challan_no}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className="px-3 py-1 rounded-full bg-primary/10 text-primary font-bold text-xs">
                        {v.no_of_bags}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className="px-3 py-1 rounded-full bg-red-500/10 text-red-500 font-bold text-xs">
                        {v.shortage_weight}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-slate-700 dark:text-slate-300">
                      {Number(v.net_weight).toFixed(3)} Kg
                    </td>
                    <td className="px-3 py-2 text-right">
                      {v.remarks}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-2">
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
                  <td colSpan={7} className="px-6 py-24 text-center text-slate-400 italic text-sm">
                    {loading ? 'Fetching data...' : 'No issue vouchers found.'}
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

export default IssueVoucherModule;
