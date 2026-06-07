import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useIpc } from '../../hooks/useIpc';
import { RotateCcw, Download } from 'lucide-react';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const StockReportModule: React.FC = () => {
  const { invoke } = useIpc();
  const [data, setData] = useState<any[]>([]);
  const [filters, setFilters] = useState({ garden: '', grade: '', lot_no: '', gr_no: '' });
  const [masters, setMasters] = useState({ gardens: [], grades: [] });

  const fetchData = useCallback(async () => {
    try {
      const allStock = await invoke('stock:get-available');
      setData(allStock);
    } catch (err) {
      console.error('Failed to fetch stock report:', err);
    }
  }, [invoke]);

  const fetchMasters = useCallback(async () => {
    try {
      const allStock = await invoke('stock:get-available');
      const gardens = Array.from(new Set(allStock.map((l: any) => l.garden_name))).map((name: any) => ({ id: name, name }));
      const grades = Array.from(new Set(allStock.map((l: any) => l.grade))).map((name: any) => ({ id: name, name }));
      setMasters({ gardens, grades } as any);
    } catch (err) {
      console.error('Failed to fetch masters:', err);
    }
  }, [invoke]);

  useEffect(() => { fetchData(); fetchMasters(); }, [fetchData, fetchMasters]);

  const filteredData = useMemo(() => {
    return data.filter(item => 
      (filters.garden === '' || item.garden_name === filters.garden) &&
      (filters.grade === '' || item.grade === filters.grade) &&
      (filters.lot_no === '' || item.lot_no.toLowerCase().includes(filters.lot_no.toLowerCase())) &&
      (filters.gr_no === '' || (item.gr_no && item.gr_no.toLowerCase().includes(filters.gr_no.toLowerCase())))
    );
  }, [data, filters]);

  const exportCSV = () => {
    const csv = Papa.unparse(filteredData.map(i => ({
        Garden: i.garden_name, Grade: i.grade, Lot: i.lot_no, 'GR No': i.gr_no || '-', 'Wt/Bag (Kg)': Number(i.weight_per_bag).toLocaleString('en-IN', {maximumFractionDigits: 3}), 'Bags Received': i.total_bags, 'Avail Bags': i.available_bags, 'Avail Wt (Kg)': i.available_weight
    })));
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'stock-report.csv';
    link.click();
  };

  const exportPDF = () => {
    try {
        const doc = new jsPDF();
        doc.text('Stock Report', 14, 15);
        autoTable(doc, {
            head: [['Garden', 'Grade', 'Lot No', 'GR No', 'Wt/Bag (Kg)', 'Bags Rec', 'Avail Bags', 'Avail Wt (Kg)']],
            body: filteredData.map(i => [i.garden_name, i.grade, i.lot_no, i.gr_no || '-', Number(i.weight_per_bag).toLocaleString('en-IN', {maximumFractionDigits: 3}), i.total_bags, i.available_bags, Number(i.available_weight).toLocaleString('en-IN', {maximumFractionDigits: 3})]),
            startY: 20
        });
        doc.save('stock-report.pdf');
    } catch (err) {
        console.error('PDF Export Error:', err);
        alert('PDF Export failed: ' + err);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-2 items-center">
          <select className="px-3 py-2 bg-slate-50 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-lg text-xs outline-none" value={filters.garden} onChange={e => setFilters(f=>({...f, garden: e.target.value}))}>
            <option value="">All Gardens</option>
            {masters.gardens.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <select className="px-3 py-2 bg-slate-50 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-lg text-xs outline-none" value={filters.grade} onChange={e => setFilters(f=>({...f, grade: e.target.value}))}>
            <option value="">All Grades</option>
            {masters.grades.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <input type="text" placeholder="Lot No" className="px-4 py-2 bg-slate-50 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-lg text-xs" value={filters.lot_no} onChange={e => setFilters(f=>({...f, lot_no: e.target.value}))} />
          <input type="text" placeholder="GR No" className="px-4 py-2 bg-slate-50 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-lg text-xs" value={filters.gr_no} onChange={e => setFilters(f=>({...f, gr_no: e.target.value}))} />
          <button onClick={() => setFilters({ garden: '', grade: '', lot_no: '', gr_no: '' })} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-xs font-bold rounded-lg flex items-center justify-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-700">
            <RotateCcw size={14} /> Reset
          </button>
          <button onClick={exportCSV} className="px-4 py-2 bg-primary text-black font-bold rounded-lg text-xs flex items-center justify-center gap-2 hover:bg-primary-dark">
            <Download size={14} /> CSV
          </button>
          <button onClick={exportPDF} className="px-4 py-2 bg-primary text-black font-bold rounded-lg text-xs flex items-center justify-center gap-2 hover:bg-primary-dark">
            <Download size={14} /> PDF
          </button>
        </div>
      </div>
      
      <div className="bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl shadow-sm text-xs">
        <table className="w-full text-left border-collapse">
            <thead>
                <tr className="bg-slate-50/50 dark:bg-white/5 border-b border-black/10 dark:border-white/10">
                    <th className="px-4 py-3">Garden</th>
                    <th className="px-4 py-3">Grade</th>
                    <th className="px-4 py-3">Lot No</th>
                    <th className="px-4 py-3">GR No</th>
                    <th className="px-4 py-3">Wt/Bag</th>
                    <th className="px-4 py-3 text-right">Bags Received</th>
                    <th className="px-4 py-3 text-right">Available Bags</th>
                    <th className="px-4 py-3 text-right">Available Wt</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {filteredData.map((item, idx) => (
                    <tr key={idx} className="hover:bg-black/[0.1] dark:hover:bg-white/[0.1] transition-colors">
                        <td className="px-4 py-3">{item.garden_name}</td>
                        <td className="px-4 py-3">{item.grade}</td>
                        <td className="px-4 py-3">{item.lot_no}</td>
                        <td className="px-4 py-3">{item.gr_no || '-'}</td>
                        <td className="px-4 py-3 tracking-widest">{Number(item.weight_per_bag).toLocaleString('en-IN', {maximumFractionDigits: 3})}Kg</td>
                        <td className="px-4 py-3 text-right tracking-widest">{item.total_bags} ({Number(item.net_weight).toLocaleString('en-IN', {maximumFractionDigits: 3})}Kg)</td>
                        <td className="px-4 py-3 text-right tracking-widest font-bold">{item.available_bags}</td>
                        <td className="px-4 py-3 text-right tracking-widest font-bold">{Number(item.available_weight).toLocaleString('en-IN', {maximumFractionDigits: 3})}Kg</td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>
    </div>
  );
};

export default StockReportModule;
