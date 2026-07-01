import React, { useState, useEffect } from 'react';
import { axiosClient } from '../../api/axiosClient.js';
import { useUIStore } from '../../store/uiStore.js';
import { formatVND } from '../../utils/currency';
import { 
  TrendingUp, CreditCard, ArrowDownToLine, Wallet, 
  Calendar, RefreshCw, AlertCircle, Sparkles, Tag, Camera
} from 'lucide-react';

interface FinanceStats {
  revenue: number;
  expenses: number;
  imports: number;
  profit: number;
}

interface DashboardData {
  banmayfilm: FinanceStats;
  muonmaychut: FinanceStats;
}

export const DashboardHome: React.FC = () => {
  const { addToast } = useUIStore();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);

  // Default to current month and year
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<string>(String(now.getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState<string>(String(now.getFullYear()));

  const months = Array.from({ length: 12 }, (_, i) => String(i + 1));
  const years = ['2024', '2025', '2026', '2027', '2028'];

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get(`/reports/consolidated-dashboard?month=${selectedMonth}&year=${selectedYear}`);
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err: any) {
      addToast(err.message || 'Lỗi khi tải dữ liệu báo cáo trang chủ', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedMonth, selectedYear]);

  const renderKPIBlock = (
    title: string,
    stats: FinanceStats,
    theme: 'gold-red' | 'teal-green',
    IconHeader: any
  ) => {
    const isProfitNegative = stats.profit < 0;

    // Theme styles - change to light theme with gold accents
    const bgGradient = 'bg-vintage-sepia-100/60 border-2 border-vintage-gold shadow-md';
    
    const iconHeaderBg = theme === 'gold-red' 
      ? 'bg-vintage-gold text-vintage-sepia-900' 
      : 'bg-muted-green-600 text-white';

    return (
      <div className={`p-6 rounded-2xl border backdrop-blur-md transition-all duration-300 hover:shadow-xl hover:scale-[1.01] ${bgGradient} space-y-6`}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-vintage-sepia-200 pb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl font-bold ${iconHeaderBg} shadow-md`}>
              <IconHeader size={20} />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold uppercase tracking-wider text-vintage-sepia-900">
                {title}
              </h3>
              <p className="text-[10px] text-warm-gray-600 uppercase tracking-widest font-mono">
                Số liệu tháng {selectedMonth}/{selectedYear}
              </p>
            </div>
          </div>
          <Sparkles className="text-vintage-gold h-5 w-5 animate-pulse" />
        </div>

        {/* 4 KPIs grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Revenue */}
          <div className="p-4 rounded-xl bg-white border border-vintage-sepia-200 flex flex-col justify-between hover:border-vintage-gold transition-all duration-300 shadow-sm">
            <div className="flex items-center justify-between text-warm-gray-600 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider">Doanh thu</span>
              <TrendingUp size={14} className="text-vintage-gold" />
            </div>
            <span className="text-xl font-serif font-black tracking-tight text-vintage-sepia-900 truncate" title={formatVND(stats.revenue)}>
              {formatVND(stats.revenue)}
            </span>
          </div>

          {/* Expenses */}
          <div className="p-4 rounded-xl bg-white border border-vintage-sepia-200 flex flex-col justify-between hover:border-vintage-gold transition-all duration-300 shadow-sm">
            <div className="flex items-center justify-between text-warm-gray-600 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider">Phát sinh</span>
              <CreditCard size={14} className="text-film-red" />
            </div>
            <span className="text-xl font-serif font-black tracking-tight text-vintage-sepia-900 truncate" title={formatVND(stats.expenses)}>
              {formatVND(stats.expenses)}
            </span>
          </div>

          {/* Imports */}
          <div className="p-4 rounded-xl bg-white border border-vintage-sepia-200 flex flex-col justify-between hover:border-vintage-gold transition-all duration-300 shadow-sm">
            <div className="flex items-center justify-between text-warm-gray-600 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider">Nhập kho</span>
              <ArrowDownToLine size={14} className="text-amber-500" />
            </div>
            <span className="text-xl font-serif font-black tracking-tight text-vintage-sepia-900 truncate" title={formatVND(stats.imports)}>
              {formatVND(stats.imports)}
            </span>
          </div>

          {/* Profit */}
          <div className={`p-4 rounded-xl border flex flex-col justify-between transition-all duration-300 shadow-sm ${
            isProfitNegative ? 'border-red-300 bg-red-50/70' : 'border-emerald-300 bg-emerald-50/70'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-warm-gray-600">Lợi nhuận</span>
              <Wallet size={14} className={isProfitNegative ? 'text-film-red' : 'text-emerald-600'} />
            </div>
            <span className={`text-2xl font-serif font-black tracking-tight ${
              isProfitNegative ? 'text-film-red' : 'text-emerald-600'
            } truncate`} title={formatVND(stats.profit)}>
              {formatVND(stats.profit)}
            </span>
          </div>
        </div>

        {/* Warning Alert if negative profit */}
        {isProfitNegative && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-film-red text-[11px] font-semibold animate-pulse-slow">
            <AlertCircle size={14} className="shrink-0" />
            <span>Mảng này hiện đang ghi nhận mức lợi nhuận âm trong tháng.</span>
          </div>
        )}
      </div>
    );
  };

  const dummyStats: FinanceStats = { revenue: 0, expenses: 0, imports: 0, profit: 0 };

  return (
    <div className="py-4 space-y-8 font-medium">
      {/* Top Header */}
      <div className="border-b border-vintage-sepia-200 pb-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="font-serif font-extrabold text-3xl text-vintage-sepia-900 flex items-center gap-2">
            <Sparkles className="text-vintage-gold" /> Trang chủ
          </h1>
          <p className="text-sm text-warm-gray-700 mt-1">
            Tổng hợp các chỉ số kinh doanh cốt lõi của hai mảng sản phẩm trong tháng.
          </p>
        </div>
        <button
          onClick={fetchDashboardData}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-vintage-sepia-200 bg-vintage-sepia-100 hover:bg-vintage-gold/15 text-xs text-warm-gray-800 transition-all cursor-pointer font-bold disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Tải lại số liệu
        </button>
      </div>

      {/* Date Picker Filter Bar */}
      <div className="bg-vintage-sepia-100 p-5 rounded-2xl border border-vintage-sepia-200 flex items-center gap-4 text-xs font-bold shadow-sm">
        <div className="p-2 rounded-lg bg-vintage-sepia-900 text-vintage-gold">
          <Calendar size={16} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-vintage-sepia-950 uppercase tracking-wider text-[10px]">Thời gian đối soát:</span>
          <div className="flex gap-2">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg focus:outline-none focus:border-vintage-gold cursor-pointer"
            >
              {months.map(m => (
                <option key={m} value={m}>Tháng {m}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg focus:outline-none focus:border-vintage-gold cursor-pointer"
            >
              {years.map(y => (
                <option key={y} value={y}>Năm {y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Dashboard KPI cards container */}
      <div className="grid grid-cols-1 gap-8">
        {renderKPIBlock(
          'MUONMAYCHUT', 
          data?.muonmaychut || dummyStats, 
          'teal-green', 
          Camera
        )}
      </div>
    </div>
  );
};

export default DashboardHome;
