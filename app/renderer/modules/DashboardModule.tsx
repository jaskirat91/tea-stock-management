import React, { useEffect, useState, useMemo } from 'react';
import moment from 'moment';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { RefreshCw, Calendar } from 'lucide-react';
import { useIpc } from '@/hooks/useIpc';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const getFinancialYearDates = () => {
  const today = moment();
  const currentYear = today.year();
  const startMonth = 3; // April (0-indexed)
  
  let startDate;
  if (today.month() >= startMonth) {
    startDate = moment([currentYear, startMonth, 1]);
  } else {
    startDate = moment([currentYear - 1, startMonth, 1]);
  }
  
  return {
    startDate: startDate.format('YYYY-MM-DD'),
    endDate: today.format('YYYY-MM-DD')
  };
};

const DashboardModule: React.FC = () => {
  const { invoke } = useIpc();
  const [stockData, setStockData] = useState<any[]>([]);
  const [shortageData, setShortageData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const fyDates = useMemo(() => getFinancialYearDates(), []);
  const [dateRange, setDateRange] = useState({
    startDate: fyDates.startDate,
    endDate: fyDates.endDate
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [stock, shortage] = await Promise.all([
        invoke('dashboard:get-stock-by-garden-grade'),
        invoke('dashboard:get-shortage-stock', dateRange)
      ]);
      setStockData(stock);
      setShortageData(shortage);
      console.log("Stock Data", JSON.stringify(stock));
      console.log("Shortage Data", JSON.stringify(shortage));
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const stockChartData = useMemo(() => {
    const gardens = Array.from(new Set(stockData.map(d => d.garden_name)));
    const grades = Array.from(new Set(stockData.map(d => d.grade)));
    
    const colors = [
      'rgba(59, 130, 246, 0.8)', // blue-500
      'rgba(16, 185, 129, 0.8)', // emerald-500
      'rgba(245, 158, 11, 0.8)', // amber-500
      'rgba(239, 68, 68, 0.8)',  // red-500
      'rgba(139, 92, 246, 0.8)', // violet-500
      'rgba(236, 72, 153, 0.8)', // pink-500
      'rgba(20, 184, 166, 0.8)', // teal-500
      'rgba(249, 115, 22, 0.8)', // orange-500
    ];

    const datasets = grades.map((grade, index) => ({
      label: grade,
      data: gardens.map(garden => {
        const item = stockData.find(d => d.garden_name === garden && d.grade === grade);
        return item ? parseFloat(item.available_bags) : 0;
      }),
      backgroundColor: colors[index % colors.length],
    }));

    return {
      labels: gardens,
      datasets
    };
  }, [stockData]);

  const shortageChartData = useMemo(() => {
    return {
      labels: shortageData.map(d => d.transport_name),
      datasets: [
        {
          label: 'Shortage Weight (Kgs)',
          data: shortageData.map(d => parseFloat(d.shortage_weight)),
          backgroundColor: 'rgba(239, 68, 68, 0.7)',
          borderColor: 'rgba(239, 68, 68, 1)',
          borderWidth: 1,
        }
      ]
    };
  }, [shortageData]);

  if (loading && stockData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
          <Calendar size={18} />
          <span className="text-sm font-medium">Financial Year: {fyDates.startDate} to {fyDates.endDate}</span>
        </div>
        <button 
          onClick={fetchData}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 rounded-md transition-colors"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Garden & Grade Stock Chart */}
        <div className="p-6 rounded-xl bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              Garden & Grade wise In-hand Stock
            </h3>
            <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">Bags</span>
          </div>
          <div className="h-[400px]">
            <Bar 
              data={stockChartData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  x: { stacked: true, grid: { display: false } },
                  y: { stacked: true, grid: { color: 'rgba(0,0,0,0.05)' } }
                },
                plugins: {
                  legend: { position: 'bottom', labels: { boxWidth: 12, usePointStyle: true } },
                  tooltip: { mode: 'index', intersect: false }
                }
              }} 
            />
          </div>
        </div>

        {/* Transport Shortage Chart */}
        <div className="p-6 rounded-xl bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Transport wise Shortage Stock
            </h3>
            <div className="flex items-center gap-2 bg-black/5 dark:bg-white/5 p-1 rounded-lg border border-black/10 dark:border-white/10">
              <input 
                type="date" 
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="bg-transparent text-xs p-1 focus:outline-none dark:text-white"
              />
              <span className="text-slate-400">to</span>
              <input 
                type="date" 
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="bg-transparent text-xs p-1 focus:outline-none dark:text-white"
              />
            </div>
          </div>
          <div className="h-[400px]">
            <Bar 
              data={shortageChartData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  x: { grid: { display: false } },
                  y: { grid: { color: 'rgba(0,0,0,0.05)' } }
                },
                plugins: {
                  legend: { display: false },
                  tooltip: { mode: 'index', intersect: false }
                }
              }} 
            />
          </div>
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <p className="text-blue-500 text-xs font-bold uppercase mb-1">Total Gardens</p>
          <p className="text-2xl font-bold dark:text-white">{new Set(stockData.map(d => d.garden_name)).size}</p>
        </div>
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <p className="text-emerald-500 text-xs font-bold uppercase mb-1">Total In-hand Bags</p>
          <p className="text-2xl font-bold dark:text-white">
            {stockData.reduce((acc, curr) => acc + parseFloat(curr.available_bags), 0).toLocaleString()}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <p className="text-amber-500 text-xs font-bold uppercase mb-1">Total In-hand Weight</p>
          <p className="text-2xl font-bold dark:text-white">
            {stockData.reduce((acc, curr) => acc + parseFloat(curr.available_weight), 0).toLocaleString()} <span className="text-sm font-normal opacity-60">Kgs</span>
          </p>
        </div>
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <p className="text-red-500 text-xs font-bold uppercase mb-1">Total Shortage Weight</p>
          <p className="text-2xl font-bold dark:text-white">
            {shortageData.reduce((acc, curr) => acc + parseFloat(curr.shortage_weight), 0).toLocaleString()} <span className="text-sm font-normal opacity-60">Kgs</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default DashboardModule;
