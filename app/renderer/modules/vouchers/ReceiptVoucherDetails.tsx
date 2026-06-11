import React, { useState, useEffect } from 'react';
import { useIpc } from '../../hooks/useIpc';
import { 
  ArrowLeft, 
  FileText, 
  Calendar, 
  Building, 
  User, 
  Truck, 
  Hash, 
  Package, 
  Info,
  AlertCircle,
  IndianRupee,
  ShieldAlert
} from 'lucide-react';

interface ReceiptVoucherDetailsProps {
  id: string;
  onClose: () => void;
}

const ReceiptVoucherDetails: React.FC<ReceiptVoucherDetailsProps> = ({ id, onClose }) => {
  const { invoke } = useIpc();
  const [voucher, setVoucher] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const data = await invoke('receipt-voucher:get-details', id);
        setVoucher(data);
      } catch (err) {
        console.error('Failed to fetch voucher details:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [id, invoke]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400 italic text-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          Loading voucher details...
        </div>
      </div>
    );
  }

  if (!voucher) {
    return (
      <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 p-10 rounded-2xl text-center max-w-md mx-auto mt-10">
        <AlertCircle className="mx-auto text-red-500 mb-4" size={32} />
        <h3 className="text-red-900 dark:text-red-400 font-bold mb-2">Voucher Not Found</h3>
        <button 
          onClick={onClose}
          className="px-6 py-2 bg-red-600 text-white rounded-lg font-bold text-sm hover:bg-red-700 transition-colors inline-flex items-center gap-2"
        >
          <ArrowLeft size={16} /> Back to List
        </button>
      </div>
    );
  }

  const totalShortage = voucher.lots?.reduce((sum: number, lot: any) => {
    const issuedWeight = lot.issues?.reduce((s: number, i: any) => s + Number(i.net_weight || 0), 0) || 0;
    const issuedBags = lot.issues?.reduce((s: number, i: any) => s + Number(i.no_of_bags || 0), 0) || 0;
    if (issuedBags == lot.total_bags) {
      return sum + (Number(lot.net_weight || 0) - issuedWeight);
    }
    return sum;
  }, 0) || 0;
  const totalClaim = voucher.lots?.reduce((sum: number, lot: any) => sum + Number(lot.claim_amount || 0), 0) || 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-12">
      {/* Top Header Section */}
      <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 transition-all"
            title="Go Back"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-3">
              <FileText className="text-primary" size={24} />
              {voucher.voucher_no}
            </h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Receipt Voucher Details</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Voucher Total</p>
            <p className="text-lg font-black text-primary font-mono">{Number(voucher.total_weight).toFixed(3)} <span className="text-xs">Kg</span></p>
          </div>
          <div className="h-10 w-px bg-black/10 dark:bg-white/10 mx-2" />
          <div className="text-right">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Total Bags</p>
             <p className="text-lg font-black text-slate-900 dark:text-white">{voucher.total_bags} <span className="text-xs text-slate-400 font-bold font-sans">Bags</span></p>
          </div>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: Basic Info */}
        <div className="bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-start gap-3">
             <div className="p-2 rounded-lg bg-slate-50 dark:bg-white/5 text-slate-400"><Building size={18} /></div>
             <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Firm Name</p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{voucher.firm?.name}</p>
             </div>
          </div>
          <div className="flex items-start gap-3">
             <div className="p-2 rounded-lg bg-slate-50 dark:bg-white/5 text-slate-400"><User size={18} /></div>
             <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Party Name</p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{voucher.party?.name}</p>
             </div>
          </div>
        </div>

        {/* Center: Bill & GR */}
        <div className="bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl p-5 shadow-sm">
          <div className="grid grid-cols-2 gap-y-4 gap-x-6">
             <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Bill Number</p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{voucher.bill_no || '-'}</p>
             </div>
             <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Bill Date</p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{voucher.bill_date ? new Date(voucher.bill_date).toLocaleDateString('en-IN') : '-'}</p>
             </div>
             <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">GR Number</p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{voucher.gr_no || '-'}</p>
             </div>
             <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">GR Date</p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{voucher.gr_date ? new Date(voucher.gr_date).toLocaleDateString('en-IN') : '-'}</p>
             </div>
          </div>
        </div>

        {/* Right: Transport, Receipt & Freight */}
        <div className="bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl p-5 shadow-sm space-y-4">
           <div className="flex items-start gap-3">
             <div className="p-2 rounded-lg bg-slate-50 dark:bg-white/5 text-slate-400"><Truck size={18} /></div>
             <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Transport</p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{voucher.transport?.name || '-'}</p>
             </div>
          </div>
          <div className="grid grid-cols-3 gap-y-4 gap-x-6 ml-11">
             <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Receipt No</p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{voucher.receipt_no || '-'}</p>
             </div>
             <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Receipt Date</p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{voucher.receipt_date ? new Date(voucher.receipt_date).toLocaleDateString('en-IN') : '-'}</p>
             </div>
             <div className="">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 text-right">Freight</p>
                <p className="text-sm font-bold flex items-center justify-end">
                  <IndianRupee size={16} />
                  {Number(voucher.frieght_amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </p>
             </div>
          </div>
        </div>
      </div>

      {/* Lots & Issues Section */}
      <div className="space-y-8 mt-8">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
              <Package size={20} />
            </div>
            <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white uppercase">Lots & Distribution</h2>
          </div>
          <div className="flex items-center gap-6">
             <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total Shortage</p>
                <p className="text-sm font-black text-red-500 font-mono">{totalShortage.toLocaleString('en-IN', { maximumFractionDigits: 3 })} <span className="text-[10px] font-sans">Kg</span></p>
             </div>
             {totalClaim > 0 && (
               <div className="text-right border-l border-black/10 dark:border-white/10 pl-6">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total Claim</p>
                  <p className="text-sm font-black text-amber-600 dark:text-amber-500 flex items-center justify-end gap-1">
                    <IndianRupee size={14} />
                    {totalClaim.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </p>
               </div>
             )}
          </div>
        </div>

        {voucher.lots?.map((lot: any) => (
          <div key={lot.id} className="bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm transition-all hover:shadow-md">
            {/* Lot Header */}
            <div className="p-5 bg-slate-50/50 dark:bg-white/5 border-b border-black/5 dark:border-white/5">
              <div className="flex flex-wrap items-center justify-between gap-6">
                <div className="flex items-center gap-4 min-w-[300px]">
                  <div className="h-12 w-12 rounded-2xl bg-primary flex flex-col items-center justify-center text-black shadow-lg shadow-primary/20">
                    <span className="text-[10px] font-black leading-none opacity-60 uppercase">Lot</span>
                    <span className="text-base font-black leading-none mt-1">{lot.lot_no}</span>
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight leading-tight">
                      {lot.garden?.name}
                    </h3>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="px-2 py-0.5 rounded-md bg-primary/20 text-primary font-black text-[10px] uppercase border border-primary/20">{lot.grade}</span>
                      <span className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">
                        Total: <span className="text-slate-800 dark:text-slate-200">{lot.total_bags} Bags</span>
                      </span>
                      <span className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">
                        WT/Bag: <span className="text-slate-800 dark:text-slate-200">{lot.weight_per_bag} Kg</span>
                      </span>
                      <span className="text-[11px] text-slate-400 font-bold uppercase tracking-widest border-l border-black/10 dark:border-white/10 pl-3">
                        Net: <span className="text-slate-800 dark:text-slate-200">{Number(lot.net_weight).toLocaleString('en-IN', { maximumFractionDigits: 2 })} Kg</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Receipt Shortage</p>
                  <p className="text-base font-black text-red-500 font-mono tracking-tighter">{Number(lot.shortage_weight).toLocaleString('en-IN', { maximumFractionDigits: 2 })} <span className="text-[10px]">Kg</span></p>
                </div>
              </div>
              
              {lot.remarks && (
                <div className="mt-4 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 bg-black/[0.03] dark:bg-white/[0.03] px-3 py-2 rounded-xl italic border border-black/5 dark:border-white/5">
                  <Info size={14} className="text-slate-400" />
                  <span className="font-medium">Remarks:</span> {lot.remarks}
                </div>
              )}
            </div>

            {/* Issues Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-slate-50/30 dark:bg-white/5 border-b border-black/5 dark:border-white/5">
                    <th className="px-6 py-3 uppercase tracking-widest font-black text-[10px] text-slate-400">Date & Voucher</th>
                    <th className="px-6 py-3 uppercase tracking-widest font-black text-[10px] text-slate-400">Firm / Party</th>
                    <th className="px-6 py-3 uppercase tracking-widest font-black text-[10px] text-slate-400 text-center">Bags Issued</th>
                    <th className="px-6 py-3 uppercase tracking-widest font-black text-[10px] text-slate-400 text-right">Shortage</th>
                    <th className="px-6 py-3 uppercase tracking-widest font-black text-[10px] text-slate-400 text-right">Net Weight</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/5">
                  {lot.issues?.length > 0 ? (
                    lot.issues.map((issue: any) => (
                      <tr key={issue.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4 text-sm">
                           <div className="flex flex-col gap-0.5">
                             <span className="font-black text-slate-800 dark:text-slate-200">{issue.voucher_no}</span>
                             <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                                <Calendar size={10} /> {new Date(issue.issue_date).toLocaleDateString('en-IN')}
                                <span className="opacity-30">|</span>
                                <span className="text-slate-500">CH: {issue.challan_no}</span>
                             </div>
                           </div>
                        </td>
                        <td className="px-6 py-4">
                           <div className="flex flex-col gap-0.5">
                             <span className="font-bold text-slate-600 dark:text-slate-400 text-xs flex items-center gap-1.5"><Building size={12} /> {issue.firm?.name}</span>
                             <span className="text-[11px] text-slate-400 ml-4.5 font-medium italic flex items-center gap-1.5"><User size={12} /> {issue.party?.name || '-'}</span>
                           </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center justify-center text-slate-800 dark:text-slate-200 font-black text-sm">
                            {issue.no_of_bags}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-mono text-red-400 text-sm font-bold">{Number(issue.shortage_weight).toLocaleString('en-IN', { maximumFractionDigits: 2 })} <span className="text-[10px] font-sans font-bold">Kg</span></span>
                        </td>
                        <td className="px-6 py-4 text-right text-sm">
                          <span className="font-mono font-black text-slate-800 dark:text-slate-200">{Number(issue.net_weight).toLocaleString('en-IN', { maximumFractionDigits: 2 })} <span className="text-[10px] font-sans font-bold text-slate-400">Kg</span></span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-slate-400 italic font-medium text-sm">
                        No issue vouchers recorded for this lot yet.
                      </td>
                    </tr>
                  )}
                </tbody>
                {lot.issues?.length > 0 && (
                  <tfoot className="border-t-2 border-slate-100 dark:border-white/5">
                    <tr className="bg-slate-50/50 dark:bg-white/5">
                      <td colSpan={2} className="px-6 py-4 text-right uppercase tracking-widest font-black text-[11px] text-slate-400">Accumulated Totals</td>
                      <td className="px-6 py-4 text-center">
                        <span className="font-black text-slate-900 dark:text-white text-base">
                          {lot.issues.reduce((sum: number, i: any) => sum + i.no_of_bags, 0)}
                        </span>
                      </td>
                      <td colSpan={1}></td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-mono font-black text-slate-900 dark:text-white text-base">
                          {lot.issues.reduce((sum: number, i: any) => sum + Number(i.net_weight), 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })} <span className="text-[10px] font-sans font-bold text-slate-400">Kg</span>
                        </span>
                      </td>
                    </tr>
                    {lot.total_bags - lot.issues.reduce((sum: number, i: any) => sum + i.no_of_bags, 0) === 0 &&
                    Number(lot.net_weight) - lot.issues.reduce((sum: number, i: any) => sum + Number(i.net_weight), 0) > 0 && (
                      <tr className="bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 border-t border-red-500/20">
                        <td colSpan={2} className="px-3 py-2 text-right uppercase tracking-[0.2em] font-black text-[12px]">Short Stock</td>
                        <td className="px-3 py-2 text-center">
                          <span className="font-black text-xl leading-none">
                            {lot.total_bags - lot.issues.reduce((sum: number, i: any) => sum + i.no_of_bags, 0)}
                          </span>
                          {/* <span className="text-[10px] block mt-1 font-bold uppercase opacity-60">Bags Available</span> */}
                        </td>
                        
                        <td className="px-6 py-4 text-right">
                          <span className="font-black text-xl leading-none">
                            {(Number(lot.net_weight) - lot.issues.reduce((sum: number, i: any) => sum + Number(i.net_weight), 0)).toLocaleString('en-IN', { maximumFractionDigits: 2 })} <span className="text-[10px] font-sans font-bold">Kg</span>
                          </span>
                          {/* <span className="text-[10px] block mt-1 font-bold uppercase opacity-60 font-sans tracking-widest">Kg Balance</span> */}
                        </td>
                        <td colSpan={1}></td>
                      </tr>
                    )}
                    {lot.claim_raised && (
                      <tr className="bg-amber-500/[0.07] dark:bg-amber-500/10 text-amber-600 dark:text-amber-500 border-t border-amber-500/10">
                        <td colSpan={2} className="px-3 py-2 text-right uppercase tracking-[0.2em] font-black text-[12px]">
                           <span className="flex justify-end gap-1.5"><ShieldAlert size={16} /> Claim Details</span>
                        </td>
                        <td colSpan={4} className="px-8 py-4 text-left">
                           <span className="text-base font-black tracking-tight">
                              ₹{Number(lot.claim_amount).toLocaleString('en-IN')} 
                              <span className="text-xs font-bold opacity-60 ml-2">@ ₹{lot.claim_rate}/kg</span>
                           </span>
                        </td>
                      </tr>
                    )}
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReceiptVoucherDetails;
