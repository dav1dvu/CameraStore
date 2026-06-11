import React, { useState, useEffect } from 'react';
import { axiosClient } from '../../../api/axiosClient.js';
import { useUIStore } from '../../../store/uiStore.js';
import { formatVND } from '../../../utils/currency';
import { 
  BarChart2, Trash2, Edit2, Save, X, Loader2, RefreshCw, AlertTriangle, TrendingUp
} from 'lucide-react';

interface SaleOrder {
  id: number;
  customer_id: string;
  product_id: string;
  sale_price: number;
  quantity: number;
  sold_by: number;
  notes?: string;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  created_at: string;
  sale_products?: { name: string; brand: string; category_name: string };
  sale_customers?: { full_name: string; phone: string; address?: string };
  sale_employees?: { full_name: string; staff_code: string };
}

interface Product {
  id: string;
  name: string;
  brand: string;
}

interface Employee {
  id: number;
  full_name: string;
  staff_code: string;
}

interface SummaryData {
  totalRevenue: number;
  productsSummary: { productName: string; revenue: number }[];
}

export const SaleOrderHistory: React.FC = () => {
  const { addToast } = useUIStore();
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  
  const [orders, setOrders] = useState<SaleOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Filters
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);

  // Pagination
  const [offset, setOffset] = useState(0);
  const limit = 10;
  const [hasMore, setHasMore] = useState(true);

  // Inline editing state
  const [editingRowId, setEditingRowId] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    productId: '',
    salePrice: 0,
    quantity: 1,
    soldBy: 0,
    status: 'COMPLETED' as 'PENDING' | 'COMPLETED' | 'CANCELLED',
    notes: ''
  });

  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const months = Array.from({ length: 12 }, (_, i) => String(i + 1));
  const years = ['2024', '2025', '2026', '2027'];

  const loadReferenceData = async () => {
    try {
      const prodRes = await axiosClient.get('/sale-products');
      if (prodRes.data.success) setProducts(prodRes.data.data || []);
      const empRes = await axiosClient.get('/sale-employees');
      if (empRes.data.success) setEmployees(empRes.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchOrders = async (reset = false, monthVal = selectedMonth, yearVal = selectedYear) => {
    if (reset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    const currentOffset = reset ? 0 : offset;
    try {
      let url = `/sale-orders?limit=${limit}&offset=${currentOffset}`;
      if (monthVal && yearVal) {
        url += `&month=${monthVal}&year=${yearVal}`;
      }

      const res = await axiosClient.get(url);
      if (res.data.success) {
        const fetchedOrders = res.data.data || [];
        if (reset) {
          setOrders(fetchedOrders);
          setOffset(limit);
        } else {
          setOrders([...orders, ...fetchedOrders]);
          setOffset(currentOffset + limit);
        }

        // If returned items are less than limit, we reached the end
        if (fetchedOrders.length < limit) {
          setHasMore(false);
        } else {
          setHasMore(true);
        }
      }

      // Fetch summary if filters are active
      if (monthVal && yearVal) {
        const sumRes = await axiosClient.get(`/sale-orders/summary?month=${monthVal}&year=${yearVal}`);
        if (sumRes.data.success) {
          setSummaryData(sumRes.data.data);
        }
      } else {
        setSummaryData(null);
      }
    } catch (err: any) {
      addToast(err.message || 'Lỗi khi tải lịch sử đơn bán', 'error');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadReferenceData();
    fetchOrders(true);
  }, []);

  const handleRefresh = () => {
    setEditingRowId(null);
    fetchOrders(true, selectedMonth, selectedYear);
  };

  const handleLoadMore = () => {
    fetchOrders(false, selectedMonth, selectedYear);
  };

  const handleFilterChange = (month: string, year: string) => {
    setSelectedMonth(month);
    setSelectedYear(year);
    if ((month && year) || (!month && !year)) {
      fetchOrders(true, month, year);
    } else {
      fetchOrders(true, '', '');
    }
  };

  const startEdit = (order: SaleOrder) => {
    setEditingRowId(order.id);
    setEditFormData({
      customerName: order.sale_customers?.full_name || '',
      customerPhone: order.sale_customers?.phone || '',
      customerAddress: order.sale_customers?.address || '',
      productId: order.product_id,
      salePrice: order.sale_price,
      quantity: order.quantity,
      soldBy: order.sold_by,
      status: order.status,
      notes: order.notes || ''
    });
  };

  const handleInlineSave = async (order: SaleOrder) => {
    if (!editFormData.customerName || !editFormData.customerPhone || !editFormData.productId || editFormData.quantity <= 0) {
      addToast('Vui lòng nhập đầy đủ thông tin đơn hàng', 'error');
      return;
    }

    try {
      setLoading(true);
      const res = await axiosClient.put(`/sale-orders/${order.id}`, {
        customerName: editFormData.customerName,
        customerPhone: editFormData.customerPhone,
        customerAddress: editFormData.customerAddress,
        productId: editFormData.productId,
        salePrice: Number(editFormData.salePrice),
        quantity: Number(editFormData.quantity),
        soldBy: Number(editFormData.soldBy),
        status: editFormData.status,
        notes: editFormData.notes
      });

      if (res.data.success) {
        addToast('Cập nhật đơn bán thành công', 'success');
        setEditingRowId(null);
        fetchOrders(true, selectedMonth, selectedYear);
      }
    } catch (err: any) {
      addToast(err.response?.data?.message || err.message || 'Lỗi cập nhật đơn hàng', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      setLoading(true);
      const res = await axiosClient.delete(`/sale-orders/${id}`);
      if (res.data.success) {
        addToast('Xóa đơn bán hàng thành công, đã hoàn trả lại tồn kho sản phẩm', 'success');
        setConfirmDeleteId(null);
        fetchOrders(true, selectedMonth, selectedYear);
      }
    } catch (err: any) {
      addToast(err.message || 'Lỗi khi xóa đơn hàng', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-4 space-y-8 font-medium">
      {/* Header */}
      <div className="border-b border-vintage-sepia-200 pb-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="font-serif font-extrabold text-3xl text-vintage-sepia-900 flex items-center gap-2">
            <BarChart2 className="text-vintage-gold" /> Lịch sử
          </h1>
          <p className="text-sm text-warm-gray-700 mt-1">
            Xem báo cáo lịch sử các đơn bán máy film.
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

      {/* Month/Year Filter Bar */}
      <div className="bg-vintage-sepia-100 p-4 rounded-xl border border-vintage-sepia-200 flex flex-wrap items-center gap-4 text-xs font-bold">
        <span className="text-vintage-sepia-950 uppercase tracking-wider text-[10px]">Lọc theo tháng/năm bán:</span>
        <div className="flex gap-2">
          <select
            value={selectedMonth}
            onChange={(e) => handleFilterChange(e.target.value, selectedYear)}
            className="px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg focus:outline-none focus:border-vintage-gold text-xs"
          >
            <option value="">Tất cả các tháng</option>
            {months.map(m => (
              <option key={m} value={m}>Tháng {m}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => handleFilterChange(selectedMonth, e.target.value)}
            className="px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg focus:outline-none focus:border-vintage-gold text-xs"
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

      {/* Monthly Summary */}
      {selectedMonth && selectedYear && summaryData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-vintage-sepia-900 text-vintage-sepia-50 p-6 rounded-xl border border-vintage-sepia-800 shadow-md flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-vintage-gold">Doanh thu bán máy</span>
              <TrendingUp className="text-vintage-gold h-5 w-5 animate-pulse" />
            </div>
            <div>
              <p className="text-3xl font-serif font-black tracking-tight text-white">
                {formatVND(summaryData.totalRevenue)}
              </p>
              <p className="text-[10px] text-vintage-sepia-300 mt-2 font-mono">
                Tổng doanh thu bán máy đứt (Banmayfilm) tháng {selectedMonth}/{selectedYear}
              </p>
            </div>
          </div>

          <div className="md:col-span-2 bg-white border border-vintage-sepia-200 rounded-xl p-5 shadow-sm space-y-3">
            <h3 className="font-serif font-bold text-sm text-vintage-sepia-900 border-b border-vintage-sepia-150 pb-2">
              Doanh số bán theo dòng máy ảnh
            </h3>
            <div className="max-h-40 overflow-y-auto pr-1">
              {summaryData.productsSummary.length === 0 ? (
                <p className="text-xs text-warm-gray-500 italic py-2">Không ghi nhận sản phẩm nào bán ra trong tháng này.</p>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-vintage-sepia-200 text-warm-gray-600 font-bold uppercase text-[9px] tracking-wider">
                      <th className="py-2">Tên sản phẩm</th>
                      <th className="py-2 text-right">Doanh thu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-vintage-sepia-100 font-medium">
                    {summaryData.productsSummary.map((m, idx) => (
                      <tr key={idx} className="hover:bg-vintage-sepia-50/50">
                        <td className="py-2 text-vintage-sepia-950 font-semibold">{m.productName}</td>
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

      {/* Main Table */}
      {loading && orders.length === 0 ? (
        <div className="text-center py-12"><Loader2 className="animate-spin h-8 w-8 text-vintage-gold mx-auto" /></div>
      ) : orders.length === 0 ? (
        <p className="text-center py-8 text-xs text-warm-gray-700 italic">Không tìm thấy đơn bán máy nào.</p>
      ) : (
        <div className="bg-vintage-sepia-100 border border-vintage-sepia-200 rounded-xl overflow-x-auto shadow-sm">
          <table className="w-full text-left text-[11px] border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-vintage-sepia-900/10 border-b border-vintage-sepia-200 text-vintage-sepia-900 font-bold uppercase tracking-wider">
                <th className="p-3 w-32">Ngày bán</th>
                <th className="p-3">Khách hàng</th>
                <th className="p-3 w-28">Số điện thoại</th>
                <th className="p-3 w-36">Địa chỉ</th>
                <th className="p-3">Sản phẩm</th>
                <th className="p-3 w-20 text-center">Số lượng</th>
                <th className="p-3 w-28 text-right">Đơn giá</th>
                <th className="p-3 w-32 text-right">Tổng thanh toán</th>
                <th className="p-3 w-32">Nhân viên bán</th>
                <th className="p-3 w-24">Trạng thái</th>
                <th className="p-3 text-center w-24">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-vintage-sepia-200">
              {orders.map(order => {
                const isEditing = editingRowId === order.id;
                const totalPayment = order.sale_price * order.quantity;
                return (
                  <tr key={order.id} className="hover:bg-vintage-sepia-50/50">
                    {/* Ngày bán */}
                    <td className="p-3 font-mono">{order.created_at.substring(0, 10)}</td>
                    
                    {/* Khách hàng */}
                    <td className="p-3 font-bold text-vintage-sepia-900">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editFormData.customerName}
                          onChange={e => setEditFormData({ ...editFormData, customerName: e.target.value })}
                          className="w-full px-1.5 py-1 rounded border border-vintage-sepia-200 bg-white text-xs font-bold"
                        />
                      ) : (
                        order.sale_customers?.full_name || 'Khách lẻ'
                      )}
                    </td>

                    {/* Số điện thoại */}
                    <td className="p-3 font-mono">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editFormData.customerPhone}
                          onChange={e => setEditFormData({ ...editFormData, customerPhone: e.target.value })}
                          className="w-full px-1.5 py-1 rounded border border-vintage-sepia-200 bg-white text-xs font-mono"
                        />
                      ) : (
                        order.sale_customers?.phone || '-'
                      )}
                    </td>

                    {/* Địa chỉ */}
                    <td className="p-3 text-warm-gray-700 truncate max-w-xs" title={order.sale_customers?.address}>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editFormData.customerAddress}
                          onChange={e => setEditFormData({ ...editFormData, customerAddress: e.target.value })}
                          className="w-full px-1.5 py-1 rounded border border-vintage-sepia-200 bg-white text-xs"
                        />
                      ) : (
                        order.sale_customers?.address || '-'
                      )}
                    </td>

                    {/* Sản phẩm */}
                    <td className="p-3 text-warm-gray-700 font-semibold truncate max-w-xs">
                      {isEditing ? (
                        <select
                          value={editFormData.productId}
                          onChange={e => setEditFormData({ ...editFormData, productId: e.target.value })}
                          className="w-full px-1 py-1 rounded border border-vintage-sepia-200 bg-white text-xs"
                        >
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.brand} {p.name}</option>
                          ))}
                        </select>
                      ) : (
                        order.sale_products?.name || 'Sản phẩm'
                      )}
                    </td>

                    {/* Số lượng */}
                    <td className="p-3 text-center font-mono font-bold">
                      {isEditing ? (
                        <input
                          type="number"
                          min="1"
                          value={editFormData.quantity}
                          onChange={e => setEditFormData({ ...editFormData, quantity: Number(e.target.value) })}
                          className="w-12 text-center px-1 py-1 rounded border border-vintage-sepia-200 bg-white text-xs font-mono font-bold"
                        />
                      ) : (
                        order.quantity
                      )}
                    </td>

                    {/* Đơn giá */}
                    <td className="p-3 text-right font-mono font-bold text-vintage-sepia-900">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editFormData.salePrice}
                          onChange={e => setEditFormData({ ...editFormData, salePrice: Number(e.target.value) })}
                          className="w-20 text-right px-1.5 py-1 rounded border border-vintage-sepia-200 bg-white text-xs font-mono font-bold"
                        />
                      ) : (
                        formatVND(order.sale_price)
                      )}
                    </td>

                    {/* Tổng tiền */}
                    <td className="p-3 text-right font-mono font-extrabold text-vintage-gold">
                      {formatVND(totalPayment)}
                    </td>

                    {/* Nhân viên bán */}
                    <td className="p-3">
                      {isEditing ? (
                        <select
                          value={editFormData.soldBy}
                          onChange={e => setEditFormData({ ...editFormData, soldBy: Number(e.target.value) })}
                          className="w-full px-1 py-1 rounded border border-vintage-sepia-200 bg-white text-xs"
                        >
                          {employees.map(emp => (
                            <option key={emp.id} value={emp.id}>{emp.staff_code}</option>
                          ))}
                        </select>
                      ) : (
                        order.sale_employees?.full_name || '-'
                      )}
                    </td>

                    {/* Trạng thái */}
                    <td className="p-3">
                      {isEditing ? (
                        <select
                          value={editFormData.status}
                          onChange={e => setEditFormData({ ...editFormData, status: e.target.value as any })}
                          className="w-full px-1 py-1 rounded border border-vintage-sepia-200 bg-white text-xs"
                        >
                          <option value="COMPLETED">Thành công</option>
                          <option value="PENDING">Chờ xử lý</option>
                          <option value="CANCELLED">Đã hủy</option>
                        </select>
                      ) : (
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          order.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                          order.status === 'PENDING' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {order.status === 'COMPLETED' ? 'Thành công' : order.status === 'PENDING' ? 'Chờ xử lý' : 'Đã hủy'}
                        </span>
                      )}
                    </td>

                    {/* Hành động */}
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => handleInlineSave(order)}
                              disabled={loading}
                              title="Lưu dòng"
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
                              onClick={() => startEdit(order)}
                              title="Chỉnh sửa đơn"
                              className="p-1.5 rounded bg-vintage-gold/10 hover:bg-vintage-gold text-vintage-gold hover:text-vintage-sepia-900 cursor-pointer"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(order.id)}
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

      {/* Pagination Load More */}
      {hasMore && orders.length >= limit && (
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

      {/* Delete Confirmation Modal */}
      {confirmDeleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-vintage-sepia-200 text-center space-y-4 text-xs font-medium">
            <AlertTriangle className="h-12 w-12 text-film-red mx-auto" />
            <h3 className="font-serif font-bold text-lg text-vintage-sepia-900">Xác nhận xóa đơn bán hàng</h3>
            <p className="text-sm text-warm-gray-700 text-center leading-relaxed">
              Bạn có chắc chắn muốn xóa đơn bán máy film này? Hệ thống sẽ tự động hoàn trả lại số lượng tồn kho sản phẩm tương ứng.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 rounded-lg border border-vintage-sepia-200 hover:bg-vintage-sepia-100 text-sm font-semibold text-warm-gray-800 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                className="px-4 py-2 rounded-lg bg-film-red hover:bg-film-red-light text-white text-sm font-semibold cursor-pointer"
              >
                Xác thực Xóa &amp; Hoàn kho
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default SaleOrderHistory;
