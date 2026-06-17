import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useIpc } from '../../hooks/useIpc';
import { RotateCcw, Download, X, Trash2, FileText, Truck } from 'lucide-react';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Modal } from '../../components/Modal';

const StockReportModule: React.FC = () => {
  const { invoke } = useIpc();
  const [data, setData] = useState<any[]>([]);
  const getInitialFilters = () => {
    const now = new Date();
    const fyYear = now.getMonth() < 3 ? now.getFullYear() - 1 : now.getFullYear();
    return { 
      garden: '', 
      grade: '', 
      lot_no: '', 
      gr_no: '', 
      claim_status: '', 
      gr_date_from: `${fyYear}-04-01`, 
      gr_date_to: `${fyYear + 1}-03-31`, 
      transport: '',
      over_sold_only: 'no'
    };
  };

  const [filters, setFilters] = useState(getInitialFilters);
  const [masters, setMasters] = useState({ gardens: [], grades: [], firms: [], transports: [] });
  const [claimRates, setClaimRates] = useState<Record<string, string>>({});
  const debouncedTimeouts = useRef<Record<string, NodeJS.Timeout>>({});
  const firmSelectRef = useRef<HTMLSelectElement>(null);
  
  // Claim Report Modal State
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [claimFilters, setClaimFilters] = useState({
    firmId: '',
    transportId: '',
    fromDate: (() => {
      const now = new Date();
      const fyYear = now.getMonth() < 3 ? now.getFullYear() - 1 : now.getFullYear();
      return `${fyYear}-04-01`;
    })(),
    toDate: new Date().toISOString().split('T')[0]
  });

  const loadData = useCallback(async () => {
    try {
      // Fetch filtered stock from backend instead of pulling all and filtering in memory
      const filteredStock = await invoke('stock:get-available', undefined, true, filters);
      setData(filteredStock);
      console.log("data fetched", filteredStock);
    } catch (err) {
      console.error('Failed to fetch stock report:', err);
    }
  }, [invoke, filters]);

  const loadMasters = useCallback(async () => {
    try {
      // For populating garden and grade filters, we need the full available stock once
      const allStock = await invoke('stock:get-available', undefined, true);
      
      const gardens = Array.from(new Set(allStock.map((l: any) => l.garden_name)))
        .filter(Boolean)
        .map((name: any) => ({ id: name, name }))
        .sort((a, b) => a.name.localeCompare(b.name));
        
      const grades = Array.from(new Set(allStock.map((l: any) => l.grade)))
        .filter(Boolean)
        .map((name: any) => ({ id: name, name }))
        .sort((a, b) => a.name.localeCompare(b.name));
      
      const [firms, transports] = await Promise.all([
        invoke('firm:get-all'),
        invoke('transport:get-all')
      ]);
        
      setMasters({ gardens, grades, firms, transports } as any);
    } catch (err) {
      console.error('Failed to fetch masters:', err);
    }
  }, [invoke]);

  useEffect(() => {
    loadMasters();
  }, [loadMasters]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 300);
    return () => {
      clearTimeout(timer);
      Object.values(debouncedTimeouts.current).forEach(clearTimeout);
    };
  }, [loadData]);

  useEffect(() => {
    if (isClaimModalOpen) {
      // Small delay to ensure modal is rendered
      setTimeout(() => firmSelectRef.current?.focus(), 100);
      
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setIsClaimModalOpen(false);
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isClaimModalOpen]);

  const generateClaimReport = async () => {
    if (!claimFilters.firmId || !claimFilters.transportId || !claimFilters.fromDate || !claimFilters.toDate) {
      alert('Please fill all mandatory fields (Firm, Transport, and Dates)');
      return;
    }

    try {
      const reportData = await invoke('claim:report', claimFilters);
      console.log("Claim Data", reportData);
      const firm = masters.firms.find((f: any) => f.id === claimFilters.firmId) as any;
      const transport = masters.transports.find((t: any) => t.id === claimFilters.transportId) as any;
      
      if (!reportData || reportData.length === 0) {
        alert('No claim data found for selected criteria');
        return;
      }

      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(8);
      doc.text(`GSTIN :- ${firm.gstin || '---'}`, 14, 15);
      doc.text(`DATED :- ${new Date().toLocaleDateString('en-IN')}`, 196, 15, { align: 'right' });

      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text(firm.name.toUpperCase(), 105, 25, { align: 'center' });

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`${firm.address || ''} PH:- ${firm.phone || ''}`, 105, 32, { align: 'center' });

      doc.setLineWidth(0.5);
      doc.line(14, 35, 196, 35);
      doc.setLineWidth(0.1);
      doc.line(14, 37, 196, 37);

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`${transport.name.toUpperCase()}`, 105, 45, { align: 'center' });

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text("PLEASE SETTLE OUR CLAIM DETAIL AS FOLLOW :-", 105, 52, { align: 'center' });

      // Financial Year
      const fyDate = new Date(claimFilters.fromDate);
      const fy = fyDate.getMonth() < 3 
        ? `${fyDate.getFullYear() - 1}-${fyDate.getFullYear().toString().slice(-2)}`
        : `${fyDate.getFullYear()}-${(fyDate.getFullYear() + 1).toString().slice(-2)}`;
      
      doc.setFont('helvetica', 'bold');
      doc.text(fy, 105, 58, { align: 'center' });

      // Table
      autoTable(doc, {
        startY: 62,
        head: [['G.R. NO.', 'DATE', 'SHORTAGE (KG)', 'RATE', 'AMOUNT', 'NO. OF BAGS']],
        body: [
          ...reportData.map((row: any) => [
            row.gr_no,
            new Date(row.gr_date).toLocaleDateString('en-IN'),
              Number(row.available_weight).toLocaleString('en-IN', { maximumFractionDigits: 3 }),
              Number(row.avg_claim_rate).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
              Number(row.total_claim_amount).toLocaleString('en-IN', { maximumFractionDigits: 2 }),
              row.total_bags_received
          ]),
          [
            { content: 'TOTAL', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right' } },
              { content: Number(reportData.reduce((sum: number, r: any) => sum + r.available_weight, 0)).toLocaleString('en-IN', { maximumFractionDigits: 3 }), styles: { fontStyle: 'bold', halign: 'right' } },
            '',
              { content: Number(reportData.reduce((sum: number, r: any) => sum + r.total_claim_amount, 0)).toLocaleString('en-IN', { maximumFractionDigits: 2 }), styles: { fontStyle: 'bold', halign: 'right' } },
              // { content: byTransporter[transportName].reduce((sum: number, r: any) => sum + r.total_bags, 0).toString(), styles: { fontStyle: 'bold', halign: 'center' } }
          ]
        ],
        theme: 'grid',
        headStyles: { 
          fillColor: [240, 240, 240], 
          textColor: [0, 0, 0], 
          fontStyle: 'bold', 
          halign: 'center',
          lineWidth: 0.1,
          lineColor: [0, 0, 0]
        },
        styles: { 
          fontSize: 9, 
          cellPadding: 2,
          lineColor: [0, 0, 0],
          lineWidth: 0.1,
          textColor: [0, 0, 0]
        },
        columnStyles: {
          0: { halign: 'left' },
          1: { halign: 'center' },
          2: { halign: 'right' },
          3: { halign: 'right' },
          4: { halign: 'right' },
          5: { halign: 'center' }
        }
      });      

      doc.save(`claim-report-${firm.code}-${claimFilters.fromDate}-to-${claimFilters.toDate}.pdf`);
      setIsClaimModalOpen(false);
    } catch (err) {
      console.error('Failed to generate claim report:', err);
      alert('Error generating report: ' + err);
    }
  };

  const filteredData = data;

  const handleClaimRateChange = (id: string, value: string) => {
    setClaimRates(prev => ({ ...prev, [id]: value }));
    
    if (debouncedTimeouts.current[id]) {
      clearTimeout(debouncedTimeouts.current[id]);
    }

    debouncedTimeouts.current[id] = setTimeout(async () => {
      const rate = parseFloat(value);
      const item = data.find(i => i.id === id);
      if (item && !isNaN(rate)) {
        const amount = rate * item.available_weight;
        try {
          await invoke('receipt-voucher-lot:update-claim', {
            id,
            claim_raised: true,
            claim_rate: rate,
            claim_amount: amount
          });
          setData(prev => prev.map(i => i.id === id ? { ...i, claim_raised: true, claim_rate: rate, claim_amount: amount } : i));
        } catch (err) {
          console.error('Failed to update claim:', err);
        }
      }
    }, 2000);
  };

  const resetClaim = async (id: string) => {
    try {
      await invoke('receipt-voucher-lot:update-claim', {
        id,
        claim_raised: false,
        claim_rate: 0,
        claim_amount: 0
      });
      setData(prev => prev.map(i => i.id === id ? { ...i, claim_raised: false, claim_rate: 0, claim_amount: 0 } : i));
      setClaimRates(prev => {
        const { [id]: _, ...rest } = prev;
        return rest;
      });
    } catch (err) {
      console.error('Failed to reset claim:', err);
    }
  };

  const exportCSV = () => {
    const csv = Papa.unparse(filteredData.map(i => ({
        'GR Date': i.gr_date ? new Date(i.gr_date).toLocaleDateString('en-IN') : '-', 'Receipt Date': i.receipt_date ? new Date(i.receipt_date).toLocaleDateString('en-IN') : '-', 'Transport': i.transport_name, 'Garden': i.garden_name, 'Grade': i.grade, 'Lot': i.lot_no, 'GR No': i.gr_no || '-', 'Wt/Bag (Kg)': Number(i.weight_per_bag).toLocaleString('en-IN', {maximumFractionDigits: 3}), 'Bags Received': i.total_bags, 'Avail Bags': i.available_bags, 'Avail Wt (Kg)': i.available_weight, 'Claim Raised': i.claim_raised ? 'Yes' : 'No', 'Claim Rate': i.claim_rate, 'Claim Amount': i.claim_amount
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
        const doc = new jsPDF('landscape');
        doc.text('Stock Report', 14, 15);
        autoTable(doc, {
            head: [['GR Date', 'Receipt Date', 'Transport Name', 'Garden', 'Grade', 'Lot No', 'GR No', 'Wt/Bag', 'Bags Rec', 'Avail Bags', 'Avail Wt', 'Claim Raised', 'Claim Rate', 'Claim Amount']],
            body: filteredData.map(i => [
              i.gr_date ? new Date(i.gr_date).toLocaleDateString('en-IN') : '-',
              i.receipt_date ? new Date(i.receipt_date).toLocaleDateString('en-IN') : '-',
              i.transport_name,
              i.garden_name, 
              i.grade, 
              i.lot_no, 
              i.gr_no || '-', 
              Number(i.weight_per_bag).toLocaleString('en-IN', {maximumFractionDigits: 3}), 
              i.total_bags, 
              i.available_bags, 
              Number(i.available_weight).toLocaleString('en-IN', {maximumFractionDigits: 3}),
              i.claim_raised ? 'Yes' : 'No',
              Number(i.claim_rate).toLocaleString('en-IN', {maximumFractionDigits: 2}),
              Number(i.claim_amount).toLocaleString('en-IN', {maximumFractionDigits: 2})
            ]),
            startY: 20,
            styles: { fontSize: 8 }
        });
        doc.save('stock-report.pdf');
    } catch (err) {
        console.error('PDF Export Error:', err);
        alert('PDF Export failed: ' + err);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl p-4 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-2 items-center">
          <select className="px-3 py-2 bg-slate-50 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary" value={filters.garden} onChange={e => setFilters(f=>({...f, garden: e.target.value}))}>
            <option value="">All Gardens</option>
            {masters.gardens.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <select className="px-3 py-2 bg-slate-50 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary" value={filters.grade} onChange={e => setFilters(f=>({...f, grade: e.target.value}))}>
            <option value="">All Grades</option>
            {masters.grades.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <input type="text" placeholder="Lot No" className="px-4 py-2 bg-slate-50 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary" value={filters.lot_no} onChange={e => setFilters(f=>({...f, lot_no: e.target.value}))} />
          <input type="text" placeholder="GR No" className="px-4 py-2 bg-slate-50 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary" value={filters.gr_no} onChange={e => setFilters(f=>({...f, gr_no: e.target.value}))} />
          <select className="px-3 py-2 bg-slate-50 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary" value={filters.claim_status} onChange={e => setFilters(f=>({...f, claim_status: e.target.value}))}>
            <option value="">All Records</option>
            <option value="yes">Claim Applied</option>
            <option value="no">Claim Not Applied</option>
          </select>
          <select className="px-3 py-2 bg-slate-50 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary" value={filters.transport} onChange={e => setFilters(f=>({...f, transport: e.target.value}))}>
            <option value="">All Transports</option>
            {masters.transports.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <div className="flex items-center gap-1 col-span-1 xl:col-span-2">
            <input type="date" className="w-full px-2 py-2 bg-slate-50 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-lg text-[10px] outline-none focus:ring-2 focus:ring-primary" value={filters.gr_date_from} onChange={e => setFilters(f=>({...f, gr_date_from: e.target.value}))} />
            <span className="text-xs opacity-50">to</span>
            <input type="date" className="w-full px-2 py-2 bg-slate-50 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-lg text-[10px] outline-none focus:ring-2 focus:ring-primary" value={filters.gr_date_to} onChange={e => setFilters(f=>({...f, gr_date_to: e.target.value}))} />
          </div>
        </div>

        <div className='flex flex-wrap gap-2'>
          <select 
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-xs font-bold rounded-lg outline-none focus:ring-2 focus:ring-primary transition-colors"
            value={filters.over_sold_only}
            onChange={e => setFilters(f => ({ ...f, over_sold_only: e.target.value }))}
          >
            <option value="no">Over Sold Stock Only</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
          <button onClick={() => setFilters(getInitialFilters())} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-xs font-bold rounded-lg flex items-center justify-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
            <RotateCcw size={14} /> Reset Filters
          </button>
          <div className="h-8 w-[1px] bg-black/10 dark:bg-white/10 mx-1" />
          <button onClick={exportCSV} className="px-4 py-2 bg-primary font-bold rounded-lg text-xs flex items-center justify-center gap-2 hover:bg-primary-dark outline-none focus:ring-2 focus:ring-primary transition-all">
            <Download size={14} /> Export CSV
          </button>
          <button onClick={exportPDF} className="px-4 py-2 bg-primary font-bold rounded-lg text-xs flex items-center justify-center gap-2 hover:bg-primary-dark outline-none focus:ring-2 focus:ring-primary transition-all">
            <Download size={14} /> Export PDF
          </button>
          <button onClick={() => setIsClaimModalOpen(true)} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors whitespace-nowrap">
            <FileText size={14} /> Generate Claim Report
          </button>
        </div>
      </div>
      
      <div className="bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl shadow-sm text-xs overflow-x-auto">
        <table className="w-full text-left border-collapse">
            <thead>
                <tr className="bg-slate-50/50 dark:bg-white/5 border-b border-black/10 dark:border-white/10">
                    <th className="px-4 py-3">GR Date</th>
                    <th className="px-4 py-3">Rec. Date</th>
                    <th className="px-4 py-3">Garden</th>
                    <th className="px-4 py-3">Grade</th>
                    <th className="px-4 py-3">Lot No</th>
                    <th className="px-4 py-3">GR No</th>
                    <th className="px-4 py-3">Wt/Bag</th>
                    <th className="px-4 py-3 text-right">Bags Received</th>
                    <th className="px-4 py-3 text-right">Available Bags</th>
                    <th className="px-4 py-3 text-right">Available Wt</th>
                    {/* <th className="px-4 py-3 text-right">Transport</th> */}
                    <th className="px-4 py-3 text-center text-blue-700 dark:text-blue-300">Claim</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {filteredData.map((item, idx) => (
                    <tr key={idx} className={`hover:bg-black/[0.1] dark:hover:bg-white/[0.1] transition-colors ${item.claim_raised ? 'bg-blue-500/30 dark:bg-slate-600/50' : ''}`}>
                        <td className="px-4 py-3 whitespace-nowrap">{item.gr_date ? new Date(item.gr_date).toLocaleDateString('en-IN') : '-'}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{item.receipt_date ? new Date(item.receipt_date).toLocaleDateString('en-IN') : '-'}</td>
                        <td className="px-4 py-3">{item.garden_name}</td>
                        <td className="px-4 py-3">{item.grade}</td>
                        <td className="px-4 py-3">{item.lot_no}</td>
                        <td className="px-4 py-3">{item.gr_no || '-'}<br/><span className='text-slate-500 flex gap-1 truncate'>
                          <Truck size={16}/>{item.transport_name}
                          </span></td>
                        <td className="px-4 py-3 tracking-widest">{Number(item.weight_per_bag).toLocaleString('en-IN', {maximumFractionDigits: 3})}Kg</td>
                        <td className="px-4 py-3 text-right tracking-widest">{item.total_bags} ({Number(item.net_weight).toLocaleString('en-IN', {maximumFractionDigits: 3})}Kg)</td>
                        <td className="px-4 py-3 text-right tracking-widest font-bold">{item.available_bags}</td>
                        <td className="px-4 py-3 text-right tracking-widest font-bold">{Number(item.available_weight).toLocaleString('en-IN', {maximumFractionDigits: 3})}Kg</td>
                        {/* <td className="px-4 py-3 text-right">{item.transport_name}</td> */}
                        <td className="px-4 py-3 text-right text-blue-700 dark:text-blue-300 tracking-widest">
                          {item.available_bags === 0 && item.available_weight > 0 ? (
                            <div className="flex items-center justify-end gap-2">
                              <div className="flex items-stretch rounded-lg overflow-hidden border border-black/10 dark:border-white/10 focus-within:border-primary transition-all">
                                <span className="flex items-center px-2 bg-slate-100 dark:bg-white/5 border-r border-black/10 dark:border-white/10 text-[10px] font-bold">₹</span>
                                <input 
                                  placeholder='Rate' 
                                  type="number" 
                                  value={claimRates[item.id] !== undefined ? claimRates[item.id] : (item.claim_rate || '')}
                                  onChange={e => handleClaimRateChange(item.id, e.target.value)}
                                  className="w-[60px] px-2 py-1 bg-white dark:bg-black/20 outline-none text-left font-mono text-[10px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                                />
                              </div>
                              <div className="flex items-center gap-1 min-w-max">
                                <span className='tracking-wide'>
                                  × {Number(item.available_weight).toLocaleString('en-IN', {maximumFractionDigits: 3})}Kg = 
                                </span>
                                <span className='font-bold text-[11px] min-w-[60px] text-right'>
                                  ₹{Number((claimRates[item.id] ? parseFloat(claimRates[item.id]) : (item.claim_rate || 0)) * item.available_weight).toLocaleString('en-IN', {maximumFractionDigits: 2})}
                                </span>
                                <Trash2 size={14} className='cursor-pointer hover:text-red-500 flex-shrink-0 ml-1 text-slate-600' onClick={() => resetClaim(item.id)} />
                              </div>
                            </div>
                          ) : (
                            item.claim_raised ? (
                              <div className="flex items-center justify-end gap-2">
                                <div className="flex items-center gap-1 text-[10px] opacity-70">
                                  <span>₹{item.claim_rate} / Kg</span>
                                </div>
                                <span className="font-bold">₹{Number(item.claim_amount).toLocaleString('en-IN', {maximumFractionDigits: 2})}</span>
                                <Trash2 size={14} className="cursor-pointer hover:text-red-500" onClick={() => resetClaim(item.id)} />
                              </div>
                            ) : '-'
                          )}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>

      <Modal 
        isOpen={isClaimModalOpen} 
        onClose={() => setIsClaimModalOpen(false)} 
        title="Generate Claim Report"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase">Select Firm *</label>
            <select 
              ref={firmSelectRef}
              className="w-full px-4 py-2 bg-slate-50 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              value={claimFilters.firmId}
              onChange={e => setClaimFilters(prev => ({ ...prev, firmId: e.target.value }))}
            >
              <option value="">Select Firm...</option>
              {masters.firms.map((f: any) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase">Select Transport *</label>
            <select 
              className="w-full px-4 py-2 bg-slate-50 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              value={claimFilters.transportId}
              onChange={e => setClaimFilters(prev => ({ ...prev, transportId: e.target.value }))}
            >
              <option value="">Select Transport...</option>
              {masters.transports.map((t: any) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase">From Date *</label>
              <input 
                type="date" 
                className="w-full px-4 py-2 bg-slate-50 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                value={claimFilters.fromDate}
                onChange={e => setClaimFilters(prev => ({ ...prev, fromDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase">To Date *</label>
              <input 
                type="date" 
                className="w-full px-4 py-2 bg-slate-50 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                value={claimFilters.toDate}
                onChange={e => setClaimFilters(prev => ({ ...prev, toDate: e.target.value }))}
              />
            </div>
          </div>

          <button 
            onClick={generateClaimReport}
            className="w-full mt-4 py-3 bg-primary text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-primary-dark focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-[#0f172a] outline-none transition-all"
          >
            <FileText size={18} /> Generate Claim Report
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default StockReportModule;
