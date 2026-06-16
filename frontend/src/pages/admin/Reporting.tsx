import React, { useState, useEffect } from 'react';
import { axiosClient } from '../../api/axiosClient.js';
import { useUIStore } from '../../store/uiStore.js';
import { 
  BarChart2, Trash2, Edit2, Save, X, Loader2, RefreshCw, AlertTriangle, TrendingUp
} from 'lucide-react';
import { formatVND } from '../../utils/currency';

interface OrderHistoryItem {
  id: string; // combined: e.g. booking-1, order-5
  dbId: number;
  type: 'RENTAL' | 'SALE';
  startDate: string;
  endDate: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  productName: string;
  revenue: number;
  status: string;
  deliveredBy: number | null;
  deliveredByDetails: { id: number; full_name: string; staff_code: string } | null;
  receivedBy: number | null;
  receivedByDetails: { id: number; full_name: string; staff_code: string } | null;
  notes: string;
  createdAt: string;
  batteryName?: string | null;
  batteryQuantity?: number;
  gioNhan?: string;
  gioTra?: string;
  depositFee: string;
}

interface Employee {
  id: number;
  full_name: string;
  staff_code: string;
}

interface SummaryData {
  totalRevenue: number;
  modelsSummary: { modelName: string; revenue: number }[];
}

export const Reporting: React.FC = () => {
  const { addToast } = useUIStore();
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [historyItems, setHistoryItems] = useState<OrderHistoryItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Month & Year filter state
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);

  // Sub-tabs state
  const [activeSubTab, setActiveSubTab] = useState<'placement' | 'fulfillment'>('placement');

  // Pagination
  const [offset, setOffset] = useState(0);
  const limit = 10;

  // Inline Editing Row State
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({
    startDate: '',
    endDate: '',
    customerName: '',
    customerPhone: '',
    revenue: 0,
    status: '',
    deliveredBy: '',
    receivedBy: '',
    notes: '',
    gioNhan: '',
    gioTra: '',
    depositFee: ''
  });

  // Custom Confirm Delete State
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fetchEmployees = async () => {
    try {
      const res = await axiosClient.get('/employees');
      if (res.data.success) {
        setEmployees(res.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching employees:', err);
    }
  };

  const fetchOrderHistory = async (reset = false, monthVal = selectedMonth, yearVal = selectedYear, tabVal = activeSubTab) => {
    if (reset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    const currentOffset = reset ? 0 : offset;
    try {
      let url = `/reports/order-history?limit=${limit}&offset=${currentOffset}&tab=${tabVal}`;
      if (monthVal && yearVal) {
        url += `&month=${monthVal}&year=${yearVal}`;
      }

      const res = await axiosClient.get(url);
      if (res.data.success) {
        const fetchedItems = res.data.data.items || [];
        const total = res.data.data.total || 0;

        if (reset) {
          setHistoryItems(fetchedItems);
          setOffset(limit);
        } else {
          setHistoryItems([...historyItems, ...fetchedItems]);
          setOffset(currentOffset + limit);
        }
        setTotalItems(total);
      }

      // Fetch summary if both month and year are selected
      if (monthVal && yearVal) {
        const sumRes = await axiosClient.get(`/reports/order-history/summary?month=${monthVal}&year=${yearVal}`);
        if (sumRes.data.success) {
          setSummaryData(sumRes.data.data);
        }
      } else {
        setSummaryData(null);
      }
    } catch (err: any) {
      addToast(err.message || 'Lỗi khi tải lịch sử đơn hàng', 'error');
      setHistoryItems([]);
      setTotalItems(0);
      setSummaryData(null);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchOrderHistory(true);
    fetchEmployees();
  }, []);

  const handleRefresh = () => {
    setEditingRowId(null);
    fetchOrderHistory(true, selectedMonth, selectedYear, activeSubTab);
  };

  const handleLoadMore = () => {
    fetchOrderHistory(false, selectedMonth, selectedYear, activeSubTab);
  };

  const handleFilterChange = (month: string, year: string) => {
    setSelectedMonth(month);
    setSelectedYear(year);
    // If only one is selected and not the other, we can't filter yet (except if both empty/all)
    if ((month && year) || (!month && !year)) {
      fetchOrderHistory(true, month, year, activeSubTab);
    } else {
      // Just reset list for now or keep old list but fetch without filter
      fetchOrderHistory(true, '', '', activeSubTab);
    }
  };

  const handleTabChange = (tab: 'placement' | 'fulfillment') => {
    setActiveSubTab(tab);
    setEditingRowId(null);
    fetchOrderHistory(true, selectedMonth, selectedYear, tab);
  };

  const startEdit = (item: OrderHistoryItem) => {
    setEditingRowId(item.id);
    setEditFormData({
      startDate: item.startDate,
      endDate: item.endDate,
      customerName: item.customerName,
      customerPhone: item.customerPhone,
      revenue: item.revenue,
      status: item.status,
      deliveredBy: item.deliveredBy ? String(item.deliveredBy) : '',
      receivedBy: item.receivedBy ? String(item.receivedBy) : '',
      notes: item.notes || '',
      gioNhan: item.gioNhan || '',
      gioTra: item.gioTra || '',
      depositFee: item.depositFee || '0'
    });
  };

  const handleInlineSave = async (item: OrderHistoryItem) => {
    if (!editFormData.customerName) {
      addToast('Tên khách hàng không được để trống', 'error');
      return;
    }

    if (item.type === 'RENTAL') {
      const startStr = editFormData.startDate.substring(0, 10);
      const endStr = editFormData.endDate.substring(0, 10);

      if (startStr > endStr) {
        addToast('Ngày trả không được trước ngày giao máy', 'error');
        return;
      }

      if (startStr === endStr && editFormData.gioNhan && editFormData.gioTra) {
        const parseTimeToMinutes = (timeStr: string): number | null => {
          if (!timeStr || !timeStr.includes(':')) return null;
          const [hours, minutes] = timeStr.split(':').map(Number);
          if (isNaN(hours) || isNaN(minutes)) return null;
          return hours * 60 + minutes;
        };

        const nhanMin = parseTimeToMinutes(editFormData.gioNhan);
        const traMin = parseTimeToMinutes(editFormData.gioTra);

        if (nhanMin !== null && traMin !== null && traMin <= nhanMin) {
          addToast('Nếu giao và trả trong cùng một ngày, giờ trả phải muộn hơn giờ giao', 'error');
          return;
        }
      }
    }

    const type = item.type === 'RENTAL' ? 'booking' : 'order';
    try {
      setLoading(true);
      const res = await axiosClient.put(`/reports/order-history/${type}/${item.dbId}`, {
        startDate: editFormData.startDate,
        endDate: editFormData.endDate,
        customerName: editFormData.customerName,
        customerPhone: editFormData.customerPhone,
        revenue: editFormData.revenue,
        status: editFormData.status,
        deliveredBy: editFormData.deliveredBy ? Number(editFormData.deliveredBy) : null,
        receivedBy: editFormData.receivedBy ? Number(editFormData.receivedBy) : null,
        notes: editFormData.notes,
        gioNhan: editFormData.gioNhan,
        gioTra: editFormData.gioTra,
        depositFee: editFormData.depositFee
      });

      if (res.data.success) {
        addToast('Cập nhật thông tin đơn hàng thành công', 'success');
        setEditingRowId(null);
        fetchOrderHistory(true, selectedMonth, selectedYear, activeSubTab);
      }
    } catch (err: any) {
      addToast(err.message || 'Lỗi khi cập nhật đơn hàng', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (combinedId: string) => {
    const parts = combinedId.split('-');
    const type = parts[0]; // 'booking' or 'order'
    const dbId = parts[1];

    try {
      setLoading(true);
      const res = await axiosClient.delete(`/reports/order-history/${type}/${dbId}`);
      if (res.data.success) {
        addToast('Xóa đơn hàng thành công', 'success');
        setConfirmDeleteId(null);
        fetchOrderHistory(true, selectedMonth, selectedYear, activeSubTab);
      }
    } catch (err: any) {
      addToast(err.message || 'Lỗi khi xóa đơn hàng', 'error');
    } finally {
      setLoading(false);
    }
  };

  const mapStatusText = (item: OrderHistoryItem) => {
    if (item.type === 'RENTAL') {
      switch (item.status) {
        case 'PENDING':
        case 'CONFIRMED':
          return <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold uppercase text-[9px]">Chưa lấy</span>;
        case 'CHECKED_IN':
          return <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold uppercase text-[9px]">Đã lấy</span>;
        case 'CHECKED_OUT':
          return <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded font-bold uppercase text-[9px]">Đã trả</span>;
        case 'CANCELLED':
        case 'CANCELED':
          return <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded font-bold uppercase text-[9px]">Đã hủy</span>;
        default:
          return <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded font-bold uppercase text-[9px]">{item.status}</span>;
      }
    } else {
      switch (item.status) {
        case 'PENDING':
          return <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold uppercase text-[9px]">Chưa giao</span>;
        case 'DELIVERED':
          return <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold uppercase text-[9px]">Đã lấy</span>;
        case 'COMPLETED':
          return <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded font-bold uppercase text-[9px]">Hoàn tất</span>;
        case 'CANCELLED':
        case 'CANCELED':
          return <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded font-bold uppercase text-[9px]">Đã hủy</span>;
        default:
          return <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded font-bold uppercase text-[9px]">{item.status}</span>;
      }
    }
  };

  const months = Array.from({ length: 12 }, (_, i) => String(i + 1));
  const years = ['2024', '2025', '2026', '2027'];

  return (
    <div className="py-4 space-y-8 font-medium">
      {/* Header */}
      <div className="border-b border-vintage-sepia-200 pb-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="font-serif font-extrabold text-3xl text-vintage-sepia-900 flex items-center gap-2">
            <BarChart2 className="text-vintage-gold" /> Lịch sử
          </h1>
          <p className="text-sm text-warm-gray-700 mt-1">
            Xem báo cáo lịch sử các đơn đặt thuê thiết bị.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-vintage-sepia-200 bg-vintage-sepia-100 hover:bg-vintage-gold/15 text-xs text-warm-gray-800 transition-all cursor-pointer font-bold"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Tải lại
        </button>
      </div>

      {/* Sub-tabs for Order History & Delivery/Receive History */}
      <div className="flex gap-2 border-b border-vintage-sepia-200 pb-2 text-xs">
        <button
          onClick={() => handleTabChange('placement')}
          className={`px-4 py-2 rounded-lg font-bold transition-all cursor-pointer ${
            activeSubTab === 'placement'
              ? 'bg-vintage-sepia-900 text-vintage-sepia-50'
              : 'text-warm-gray-700 hover:text-vintage-gold'
          }`}
        >
          Lịch sử lên đơn
        </button>
        <button
          onClick={() => handleTabChange('fulfillment')}
          className={`px-4 py-2 rounded-lg font-bold transition-all cursor-pointer ${
            activeSubTab === 'fulfillment'
              ? 'bg-vintage-sepia-900 text-vintage-sepia-50'
              : 'text-warm-gray-700 hover:text-vintage-gold'
          }`}
        >
          Lịch sử giao/nhận
        </button>
      </div>

      {/* Monthly Filter Bar */}
      <div className="bg-vintage-sepia-100 p-4 rounded-xl border border-vintage-sepia-200 flex flex-wrap items-center gap-4 text-xs font-bold">
        <span className="text-vintage-sepia-950 uppercase tracking-wider text-[10px]">Lọc theo tháng/năm bắt đầu:</span>
        <div className="flex gap-2">
          <select
            value={selectedMonth}
            onChange={(e) => handleFilterChange(e.target.value, selectedYear)}
            className="px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg focus:outline-none focus:border-vintage-gold"
          >
            <option value="">Tất cả các tháng</option>
            {months.map(m => (
              <option key={m} value={m}>Tháng {m}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => handleFilterChange(selectedMonth, e.target.value)}
            className="px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg focus:outline-none focus:border-vintage-gold"
          >
            <option value="">Tất cả các năm</option>
            {years.map(y => (
              <option key={y} value={y}>Năm {y}</option>
            ))}
          </select>
        </div>
        {(selectedMonth || selectedYear) && (
          <button
            onClick={() => handleFilterChange('', '')}
            className="text-film-red hover:underline text-[10px] uppercase font-bold cursor-pointer"
          >
            ❌ Xóa lọc
          </button>
        )}
      </div>

      {/* Summary report details (shown only if both month and year are selected) */}
      {selectedMonth && selectedYear && summaryData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-vintage-sepia-900 text-vintage-sepia-50 p-6 rounded-xl border border-vintage-sepia-800 shadow-md flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-vintage-gold">Doanh thu trong tháng</span>
              <TrendingUp className="text-vintage-gold h-5 w-5 animate-pulse" />
            </div>
            <div>
              <p className="text-3xl font-serif font-black tracking-tight text-white">
                {formatVND(summaryData.totalRevenue)}
              </p>
              <p className="text-[10px] text-vintage-sepia-300 mt-2 font-mono">
                Tổng doanh thu cho thuê & bán (Muonmaychut) tháng {selectedMonth}/{selectedYear}
              </p>
            </div>
          </div>

          <div className="md:col-span-2 bg-white border border-vintage-sepia-200 rounded-xl p-5 shadow-sm space-y-3">
            <h3 className="font-serif font-bold text-sm text-vintage-sepia-900 border-b border-vintage-sepia-150 pb-2">
              Doanh thu chi tiết theo từng loại máy ảnh
            </h3>
            <div className="max-h-40 overflow-y-auto pr-1">
              {summaryData.modelsSummary.length === 0 ? (
                <p className="text-xs text-warm-gray-500 italic py-2">Không ghi nhận doanh thu máy ảnh trong tháng này.</p>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-vintage-sepia-200 text-warm-gray-600 font-bold uppercase text-[9px] tracking-wider">
                      <th className="py-2">Tên máy ảnh / Sản phẩm</th>
                      <th className="py-2 text-right">Doanh thu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-vintage-sepia-100 font-medium">
                    {summaryData.modelsSummary.map((m, idx) => (
                      <tr key={idx} className="hover:bg-vintage-sepia-50/50">
                        <td className="py-2 text-vintage-sepia-950 font-semibold">{m.modelName}</td>
                        <td className="py-2 text-right font-mono font-bold text-vintage-gold">{formatVND(m.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Table Container */}
      {loading && historyItems.length === 0 ? (
        <div className="text-center py-12"><Loader2 className="animate-spin h-8 w-8 text-vintage-gold mx-auto" /></div>
      ) : historyItems.length === 0 ? (
        <p className="text-center py-8 text-xs text-warm-gray-700 italic">Không tìm thấy đơn hàng nào trong hệ thống.</p>
      ) : (
        <div className="bg-vintage-sepia-100 border border-vintage-sepia-200 rounded-xl overflow-x-auto shadow-sm">
          <table className="w-full text-left text-[11px] border-collapse min-w-full [&_td]:!p-2 [&_th]:!p-2">
            <thead>
              <tr className="bg-vintage-sepia-900/10 border-b border-vintage-sepia-200 text-vintage-sepia-900 font-bold uppercase tracking-wider">
                <th className="p-3 w-14">Hình thức</th>
                <th className="p-3 w-20">Ngày giao</th>
                <th className="p-3 w-14">Giờ giao</th>
                <th className="p-3 w-20">Ngày trả</th>
                <th className="p-3 w-14">Giờ trả</th>
                <th className="p-3">Tên khách hàng</th>
                <th className="p-3 w-22">Số điện thoại</th>
                <th className="p-3 w-28">Địa chỉ</th>
                <th className="p-3 w-24">Cọc</th>
                <th className="p-3">Sản phẩm</th>
                <th className="p-3">Pin kèm theo</th>
                <th className="p-3 w-20">Doanh thu</th>
                <th className="p-3 w-20">Trạng thái</th>
                <th className="p-3 w-16">Người giao</th>
                <th className="p-3 w-16">Người nhận</th>
                <th className="p-3 w-24">Ghi chú</th>
                <th className="p-3 text-center w-16">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-vintage-sepia-200">
              {historyItems.map(item => {
                const isEditing = editingRowId === item.id;
                return (
                  <tr key={item.id} className="hover:bg-vintage-sepia-50/50">
                    {/* Hình thức */}
                    <td className="p-3 font-bold">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        item.type === 'RENTAL' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {item.type === 'RENTAL' ? 'Đơn thuê' : 'Đơn bán'}
                      </span>
                    </td>

                    {/* Ngày giao */}
                    <td className="p-3 font-mono">
                      {isEditing ? (
                        <input
                          type={item.type === 'RENTAL' ? 'date' : 'text'}
                          disabled={item.type !== 'RENTAL'}
                          value={editFormData.startDate.substring(0, 10)}
                          onChange={e => setEditFormData({ ...editFormData, startDate: e.target.value })}
                          className="w-full px-1.5 py-1 rounded border border-vintage-sepia-200 bg-white text-xs"
                        />
                      ) : (
                        item.startDate.substring(0, 10)
                      )}
                    </td>

                    {/* Giờ giao */}
                    <td className="p-3 font-mono">
                      {isEditing && item.type === 'RENTAL' ? (
                        <input
                          type="text"
                          value={editFormData.gioNhan}
                          onChange={e => setEditFormData({ ...editFormData, gioNhan: e.target.value })}
                          placeholder="e.g. 09:30"
                          className="w-full px-1.5 py-1 rounded border border-vintage-sepia-200 bg-white text-xs"
                        />
                      ) : (
                        item.type === 'RENTAL' ? (item.gioNhan || '-') : '-'
                      )}
                    </td>

                    {/* Ngày trả */}
                    <td className="p-3 font-mono">
                      {isEditing && item.type === 'RENTAL' ? (
                        <input
                          type="date"
                          value={editFormData.endDate.substring(0, 10)}
                          onChange={e => setEditFormData({ ...editFormData, endDate: e.target.value })}
                          className="w-full px-1.5 py-1 rounded border border-vintage-sepia-200 bg-white text-xs"
                        />
                      ) : (
                        item.type === 'RENTAL' ? item.endDate.substring(0, 10) : '-'
                      )}
                    </td>

                    {/* Giờ trả */}
                    <td className="p-3 font-mono">
                      {isEditing && item.type === 'RENTAL' ? (
                        <input
                          type="text"
                          value={editFormData.gioTra}
                          onChange={e => setEditFormData({ ...editFormData, gioTra: e.target.value })}
                          placeholder="e.g. 22:15"
                          className="w-full px-1.5 py-1 rounded border border-vintage-sepia-200 bg-white text-xs"
                        />
                      ) : (
                        item.type === 'RENTAL' ? (item.gioTra || '-') : '-'
                      )}
                    </td>

                    {/* Tên khách hàng */}
                    <td className="p-3 font-bold text-vintage-sepia-900">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editFormData.customerName}
                          onChange={e => setEditFormData({ ...editFormData, customerName: e.target.value })}
                          className="w-full px-1.5 py-1 rounded border border-vintage-sepia-200 bg-white text-xs font-bold"
                        />
                      ) : (
                        item.customerName
                      )}
                    </td>

                    {/* SĐT */}
                    <td className="p-3 font-mono">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editFormData.customerPhone}
                          onChange={e => setEditFormData({ ...editFormData, customerPhone: e.target.value })}
                          className="w-full px-1.5 py-1 rounded border border-vintage-sepia-200 bg-white text-xs font-mono"
                        />
                      ) : (
                        item.customerPhone || '-'
                      )}
                    </td>

                    {/* Địa chỉ */}
                    <td className="p-3 text-warm-gray-700 truncate max-w-xs" title={item.customerAddress}>
                      {item.customerAddress || '-'}
                    </td>

                    {/* Cọc */}
                    <td className="p-3 text-warm-gray-900 font-semibold truncate max-w-xs">
                      {isEditing && item.type === 'RENTAL' ? (
                        <input
                          type="text"
                          value={editFormData.depositFee}
                          onChange={e => setEditFormData({ ...editFormData, depositFee: e.target.value })}
                          className="w-full px-1.5 py-1 rounded border border-vintage-sepia-200 bg-white text-xs font-semibold"
                        />
                      ) : (
                        item.type === 'RENTAL' ? (item.depositFee || '0') : '-'
                      )}
                    </td>

                    {/* Sản phẩm */}
                    <td className="p-3 text-warm-gray-700 font-semibold truncate max-w-xs" title={item.productName}>
                      {item.productName}
                    </td>

                    {/* Pin kèm theo */}
                    <td className="p-3 text-warm-gray-700 font-semibold truncate max-w-xs font-mono" title={item.batteryName || ''}>
                      {item.batteryName ? `${item.batteryName} (x${item.batteryQuantity})` : '-'}
                    </td>

                    {/* Doanh thu */}
                    <td className="p-3 font-bold text-vintage-sepia-950 font-mono">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editFormData.revenue}
                          onChange={e => setEditFormData({ ...editFormData, revenue: Number(e.target.value) })}
                          className="w-full px-1.5 py-1 rounded border border-vintage-sepia-200 bg-white text-xs font-mono font-bold"
                        />
                      ) : (
                        formatVND(item.revenue)
                      )}
                    </td>

                    {/* Trạng thái */}
                    <td className="p-3">
                      {isEditing ? (
                        <select
                          value={editFormData.status}
                          onChange={e => setEditFormData({ ...editFormData, status: e.target.value })}
                          className="w-full px-1 py-1 rounded border border-vintage-sepia-200 bg-white text-xs"
                        >
                          {item.type === 'RENTAL' ? (
                            <>
                              <option value="CONFIRMED">Chưa lấy</option>
                              <option value="CHECKED_IN">Đã lấy</option>
                              <option value="CHECKED_OUT">Đã trả</option>
                              <option value="CANCELLED">Đã hủy</option>
                            </>
                          ) : (
                            <>
                              <option value="PENDING">Chưa giao</option>
                              <option value="COMPLETED">Hoàn tất</option>
                              <option value="CANCELLED">Đã hủy</option>
                            </>
                          )}
                        </select>
                      ) : (
                        mapStatusText(item)
                      )}
                    </td>

                    {/* Người giao */}
                    <td className="p-3">
                      {isEditing && item.type === 'RENTAL' ? (
                        <select
                          value={editFormData.deliveredBy}
                          onChange={e => setEditFormData({ ...editFormData, deliveredBy: e.target.value })}
                          className="w-full px-1 py-1 rounded border border-vintage-sepia-200 bg-white text-xs"
                        >
                          <option value="">-- Chưa chọn --</option>
                          {employees.map(emp => (
                            <option key={emp.id} value={emp.id}>{emp.staff_code}</option>
                          ))}
                        </select>
                      ) : (
                        item.type === 'RENTAL' ? (item.deliveredByDetails?.staff_code || '-') : '-'
                      )}
                    </td>

                    {/* Người nhận */}
                    <td className="p-3">
                      {isEditing && item.type === 'RENTAL' ? (
                        <select
                          value={editFormData.receivedBy}
                          onChange={e => setEditFormData({ ...editFormData, receivedBy: e.target.value })}
                          className="w-full px-1 py-1 rounded border border-vintage-sepia-200 bg-white text-xs"
                        >
                          <option value="">-- Chưa chọn --</option>
                          {employees.map(emp => (
                            <option key={emp.id} value={emp.id}>{emp.staff_code}</option>
                          ))}
                        </select>
                      ) : (
                        item.type === 'RENTAL' ? (item.receivedByDetails?.staff_code || '-') : '-'
                      )}
                    </td>

                    {/* Ghi chú */}
                    <td className="p-3 truncate max-w-xs">
                      {isEditing && item.type === 'RENTAL' ? (
                        <input
                          type="text"
                          value={editFormData.notes}
                          onChange={e => setEditFormData({ ...editFormData, notes: e.target.value })}
                          className="w-full px-1.5 py-1 rounded border border-vintage-sepia-200 bg-white text-xs"
                        />
                      ) : (
                        item.notes || '-'
                      )}
                    </td>

                    {/* Hành động */}
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => handleInlineSave(item)}
                              disabled={loading}
                              title="Lưu dòng này"
                              className="p-1.5 rounded bg-green-100 hover:bg-green-200 text-green-700 cursor-pointer"
                            >
                              <Save size={12} />
                            </button>
                            <button
                              onClick={() => setEditingRowId(null)}
                              title="Hủy bỏ"
                              className="p-1.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer"
                            >
                              <X size={12} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEdit(item)}
                              title="Chỉnh sửa đơn"
                              className="p-1.5 rounded bg-vintage-gold/10 hover:bg-vintage-gold text-vintage-gold hover:text-vintage-sepia-900 cursor-pointer"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(item.id)}
                              title="Xóa đơn hàng"
                              className="p-1.5 rounded bg-red-100 hover:bg-red-200 text-red-600 cursor-pointer"
                            >
                              <Trash2 size={12} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Load More button */}
      {historyItems.length < totalItems && (
        <div className="flex justify-center pt-2">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="flex items-center gap-2 px-6 py-3 rounded-lg border border-vintage-sepia-200 bg-vintage-sepia-100 hover:bg-vintage-gold hover:text-vintage-sepia-950 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
          >
            {loadingMore && <Loader2 className="animate-spin h-3.5 w-3.5" />}
            Xem thêm
          </button>
        </div>
      )}

      {/* Custom Confirmation Dialog Modal */}
      {confirmDeleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-vintage-sepia-200 text-center space-y-4 text-xs">
            <AlertTriangle className="h-12 w-12 text-film-red mx-auto" />
            <h3 className="font-serif font-bold text-lg text-vintage-sepia-900">Xác nhận xóa đơn hàng</h3>
            <p className="text-sm text-warm-gray-700">
              Bạn có chắc chắn muốn xóa đơn hàng/đơn đặt máy này? Hành động này sẽ xóa vĩnh viễn đơn hàng và các bản ghi liên quan (phân công thiết bị, giao dịch) khỏi hệ thống.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 rounded-lg border border-vintage-sepia-200 hover:bg-vintage-sepia-100 text-sm font-semibold text-warm-gray-800 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                className="px-4 py-2 rounded-lg bg-film-red hover:bg-film-red-light text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                Xác thực Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Reporting;
