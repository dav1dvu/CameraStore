import React, { useState, useEffect } from 'react';
import { axiosClient } from '../../api/axiosClient.js';
import { useUIStore } from '../../store/uiStore.js';
import { formatVND } from '../../utils/currency';
import { 
  ArrowDownToLine, Plus, Trash2, Edit2, X, Loader2, DollarSign
} from 'lucide-react';

interface ImportRecord {
  id: number;
  import_date: string;
  total_value: number;
  product_name: string;
  quantity: number;
  received_by: string;
  notes?: string;
  created_at: string;
}

interface Employee {
  id: number;
  full_name: string;
  staff_code: string;
}

interface Product {
  id: string | number;
  name: string;
  brand: string;
  availableStock: number;
  totalStock: number;
  type?: string;
}

interface Category {
  id: string | number;
  name: string;
}

export const RentalImport: React.FC = () => {
  const { addToast } = useUIStore();
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  
  const [records, setRecords] = useState<ImportRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<string>(String(now.getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState<string>(String(now.getFullYear()));
  const [monthlyTotal, setMonthlyTotal] = useState<number>(0);

  // Pagination
  const [offset, setOffset] = useState(0);
  const limit = 10;
  const [hasMore, setHasMore] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ImportRecord | null>(null);
  
  const [selectedProductId, setSelectedProductId] = useState<string>('new');
  const [newProductDetails, setNewProductDetails] = useState({
    brand: '',
    categoryId: ''
  });

  const [formData, setFormData] = useState({
    importDate: now.toISOString().substring(0, 10),
    totalValue: 0,
    productName: '',
    quantity: 1,
    receivedBy: 'Doanh nghiệp',
    notes: ''
  });

  const months = Array.from({ length: 12 }, (_, i) => String(i + 1));
  const years = ['2024', '2025', '2026', '2027', '2028'];

  const loadInitialData = async () => {
    try {
      const empRes = await axiosClient.get('/employees');
      if (empRes.data.success) {
        setEmployees(empRes.data.data || []);
      }
      const prodRes = await axiosClient.get('/products?limit=1000');
      if (prodRes.data.success) {
        // Filter out non-rental if we want, but since rental warehouse contains all products/camera-models, let's keep all
        const rawProducts = prodRes.data.data.products || prodRes.data.data || [];
        setProducts(rawProducts);
      }
      const catRes = await axiosClient.get('/categories');
      if (catRes.data.success) {
        setCategories(catRes.data.data || []);
      }
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu cấu hình:', err);
    }
  };

  const fetchRecords = async (reset = false, monthVal = selectedMonth, yearVal = selectedYear) => {
    if (reset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    const currentOffset = reset ? 0 : offset;
    try {
      const res = await axiosClient.get(`/rental-imports?limit=${limit}&offset=${currentOffset}&month=${monthVal}&year=${yearVal}`);
      if (res.data.success) {
        const fetched = res.data.data || [];
        if (reset) {
          setRecords(fetched);
          setOffset(limit);
        } else {
          setRecords([...records, ...fetched]);
          setOffset(currentOffset + limit);
        }

        if (fetched.length < limit) {
          setHasMore(false);
        } else {
          setHasMore(true);
        }
      }

      // Fetch summary
      const sumRes = await axiosClient.get(`/rental-imports/summary?month=${monthVal}&year=${yearVal}`);
      if (sumRes.data.success) {
        setMonthlyTotal(sumRes.data.data?.totalImportValue || 0);
      }
    } catch (err: any) {
      addToast(err.message || 'Lỗi khi tải nhật ký nhập kho', 'error');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadInitialData();
    fetchRecords(true);
  }, [selectedMonth, selectedYear]);

  const handleLoadMore = () => {
    fetchRecords(false);
  };

  const handleProductSelectionChange = (prodId: string) => {
    setSelectedProductId(prodId);
    if (prodId === 'new') {
      setFormData(prev => ({ ...prev, productName: '' }));
    } else {
      const selectedProd = products.find(p => String(p.id) === prodId);
      if (selectedProd) {
        setFormData(prev => ({ ...prev, productName: selectedProd.name }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalProductName = selectedProductId === 'new' ? formData.productName : (products.find(p => String(p.id) === selectedProductId)?.name || '');
    if (!formData.importDate || formData.totalValue <= 0 || !finalProductName.trim() || formData.quantity <= 0 || !formData.receivedBy) {
      addToast('Vui lòng điền đầy đủ các thông tin bắt buộc', 'error');
      return;
    }

    try {
      const payload: any = {
        importDate: formData.importDate,
        totalValue: Number(formData.totalValue),
        productName: finalProductName.trim(),
        quantity: Number(formData.quantity),
        receivedBy: formData.receivedBy,
        notes: formData.notes
      };

      if (selectedProductId !== 'new') {
        payload.productId = Number(selectedProductId);
      } else if (!editingRecord) {
        payload.brand = newProductDetails.brand;
        payload.categoryId = newProductDetails.categoryId ? Number(newProductDetails.categoryId) : undefined;
      }

      if (editingRecord) {
        const res = await axiosClient.put(`/rental-imports/${editingRecord.id}`, payload);
        if (res.data.success) {
          addToast('Cập nhật bản ghi nhập kho thành công', 'success');
          fetchRecords(true);
        }
      } else {
        const res = await axiosClient.post('/rental-imports', payload);
        if (res.data.success) {
          addToast('Thêm bản ghi nhập kho và cập nhật kho sản phẩm thành công!', 'success');
          fetchRecords(true);
          // Refresh products
          const prodRes = await axiosClient.get('/products?limit=1000');
          if (prodRes.data.success) {
            setProducts(prodRes.data.data.products || prodRes.data.data || []);
          }
        }
      }
      setIsModalOpen(false);
    } catch (err: any) {
      addToast(err.response?.data?.message || err.message || 'Lỗi lưu thông tin nhập kho', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bản ghi nhập kho này? Hành động này sẽ tự động giảm tồn kho tương ứng.')) return;
    try {
      const res = await axiosClient.delete(`/rental-imports/${id}`);
      if (res.data.success) {
        addToast('Xóa bản ghi và hoàn trả tồn kho thành công', 'success');
        fetchRecords(true);
        // Refresh products
        const prodRes = await axiosClient.get('/products?limit=1000');
        if (prodRes.data.success) {
          setProducts(prodRes.data.data.products || prodRes.data.data || []);
        }
      }
    } catch (err: any) {
      addToast(err.message || 'Không thể xóa bản ghi', 'error');
    }
  };

  const handleEditClick = (record: ImportRecord) => {
    setEditingRecord(record);
    const matchedProduct = products.find(p => p.name === record.product_name);
    setSelectedProductId(matchedProduct ? String(matchedProduct.id) : 'new');
    setFormData({
      importDate: record.import_date.substring(0, 10),
      totalValue: record.total_value,
      productName: record.product_name,
      quantity: record.quantity,
      receivedBy: record.received_by,
      notes: record.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleCreateClick = () => {
    setEditingRecord(null);
    setSelectedProductId('new');
    setNewProductDetails({ brand: '', categoryId: '' });
    setFormData({
      importDate: new Date().toISOString().substring(0, 10),
      totalValue: 0,
      productName: '',
      quantity: 1,
      receivedBy: 'Doanh nghiệp',
      notes: ''
    });
    setIsModalOpen(true);
  };

  return (
    <div className="py-4 space-y-8 font-medium">
      {/* Header */}
      <div className="border-b border-vintage-sepia-200 pb-4 flex justify-between items-end">
        <div>
          <h1 className="font-serif font-extrabold text-3xl text-vintage-sepia-900 flex items-center gap-2">
            <ArrowDownToLine className="text-vintage-gold" /> Nhập kho
          </h1>
          <p className="text-sm text-warm-gray-700 mt-1">
            Quản lý các đợt nhập thiết bị và máy ảnh vào kho cho thuê.
          </p>
        </div>
        <button
          onClick={handleCreateClick}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-vintage-sepia-900 hover:bg-vintage-gold text-vintage-sepia-50 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
        >
          <Plus size={16} /> Nhập kho
        </button>
      </div>

      {/* Control Bar & Filter */}
      <div className="bg-vintage-sepia-100 p-4 rounded-xl border border-vintage-sepia-200 flex flex-wrap items-center justify-between gap-4 text-xs font-bold">
        <div className="flex items-center gap-2">
          <span className="text-vintage-sepia-950 uppercase tracking-wider text-[10px]">Lọc theo thời gian nhập:</span>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg focus:outline-none"
          >
            {months.map(m => (
              <option key={m} value={m}>Tháng {m}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg focus:outline-none"
          >
            {years.map(y => (
              <option key={y} value={y}>Năm {y}</option>
            ))}
          </select>
        </div>

        {/* Dynamic summary */}
        <div className="bg-white px-4 py-2 rounded-lg border border-vintage-sepia-200 flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-warm-gray-600">Tổng giá trị nhập kho:</span>
          <span className="font-mono font-extrabold text-vintage-gold text-sm">{formatVND(monthlyTotal)}</span>
        </div>
      </div>

      {/* Main Table */}
      {loading && records.length === 0 ? (
        <div className="text-center py-12"><Loader2 className="animate-spin h-8 w-8 text-vintage-gold mx-auto" /></div>
      ) : records.length === 0 ? (
        <p className="text-center py-8 text-xs text-warm-gray-700 italic">Không có bản ghi nhập kho nào trong tháng này.</p>
      ) : (
        <div className="space-y-6">
          <div className="bg-vintage-sepia-100 border border-vintage-sepia-200 rounded-xl overflow-hidden shadow-sm text-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-vintage-sepia-900/10 border-b border-vintage-sepia-200 text-vintage-sepia-900 font-bold uppercase tracking-wider">
                  <th className="p-4 w-32">Ngày nhập</th>
                  <th className="p-4">Tên sản phẩm nhập</th>
                  <th className="p-4 w-24 text-center">Số lượng</th>
                  <th className="p-4 w-36 text-right">Tổng giá trị nhập</th>
                  <th className="p-4 w-40">Người nhận máy</th>
                  <th className="p-4">Ghi chú</th>
                  <th className="p-4 text-center w-28">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-vintage-sepia-200 font-medium">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-vintage-sepia-50/50">
                    <td className="p-4 font-mono">{r.import_date.substring(0, 10)}</td>
                    <td className="p-4 text-vintage-sepia-900 font-semibold">{r.product_name}</td>
                    <td className="p-4 text-center font-bold font-mono">{r.quantity}</td>
                    <td className="p-4 text-right font-mono font-bold text-vintage-gold">{formatVND(r.total_value)}</td>
                    <td className="p-4 text-warm-gray-800 font-bold">{r.received_by}</td>
                    <td className="p-4 text-warm-gray-600 truncate max-w-xs">{r.notes || '-'}</td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEditClick(r)}
                          className="p-2 rounded bg-vintage-gold/10 hover:bg-vintage-gold text-vintage-gold hover:text-vintage-sepia-900 cursor-pointer"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(r.id)}
                          className="p-2 rounded bg-film-red/10 hover:bg-film-red text-film-red hover:text-white cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Load More */}
          {hasMore && records.length >= limit && (
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
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-vintage-sepia-100 border border-vintage-sepia-200 rounded-xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
            <div className="p-5 border-b border-vintage-sepia-200 flex items-center justify-between">
              <h3 className="font-serif font-bold text-lg text-vintage-sepia-900">
                {editingRecord ? 'Chỉnh sửa chứng từ nhập kho' : 'Ghi chép chứng từ nhập kho mới'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-lg hover:bg-vintage-sepia-200"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs font-bold text-warm-gray-700">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1">Ngày nhập hàng *</label>
                  <input
                    type="date"
                    required
                    value={formData.importDate}
                    onChange={(e) => setFormData({ ...formData, importDate: e.target.value })}
                    className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg text-warm-gray-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block mb-1">Người nhận máy / Chi trả *</label>
                  <select
                    required
                    value={formData.receivedBy}
                    onChange={(e) => setFormData({ ...formData, receivedBy: e.target.value })}
                    className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg text-warm-gray-900 focus:outline-none"
                  >
                    <option value="Doanh nghiệp">Doanh nghiệp (Chi trả chung)</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.full_name}>{emp.full_name} ({emp.staff_code})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block mb-1">Liên kết sản phẩm trong kho *</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => handleProductSelectionChange(e.target.value)}
                  className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg text-warm-gray-900 focus:outline-none"
                  disabled={!!editingRecord}
                >
                  <option value="new">-- Thêm sản phẩm mới hoàn toàn (Nhập tay bên dưới) --</option>
                  {products.map(p => (
                    <option key={p.id} value={String(p.id)}>{p.brand} {p.name} (Tồn: {p.availableStock})</option>
                  ))}
                </select>
              </div>

              {selectedProductId === 'new' ? (
                <>
                  <div>
                    <label className="block mb-1">Tên sản phẩm nhập mới *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: Canon AE-1, Kodak Gold 200..."
                      value={formData.productName}
                      onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                      className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg text-warm-gray-900 focus:outline-none"
                      disabled={!!editingRecord}
                    />
                  </div>

                  {!editingRecord && (
                    <div className="grid grid-cols-2 gap-2 bg-vintage-sepia-50 p-3 rounded-lg border border-vintage-sepia-200/60 text-xs">
                      <div>
                        <label className="block mb-1 text-[10px] uppercase text-warm-gray-600">Hãng *</label>
                        <input
                          type="text"
                          required
                          placeholder="Canon..."
                          value={newProductDetails.brand}
                          onChange={(e) => setNewProductDetails({ ...newProductDetails, brand: e.target.value })}
                          className="w-full px-2 py-1.5 border border-vintage-sepia-200 bg-white rounded text-warm-gray-900 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block mb-1 text-[10px] uppercase text-warm-gray-600">Danh mục *</label>
                        <select
                          required
                          value={newProductDetails.categoryId}
                          onChange={(e) => setNewProductDetails({ ...newProductDetails, categoryId: e.target.value })}
                          className="w-full px-2 py-1.5 border border-vintage-sepia-200 bg-white rounded text-warm-gray-900 focus:outline-none"
                        >
                          <option value="">-- Chọn danh mục --</option>
                          {categories.map(cat => (
                            <option key={cat.id} value={String(cat.id)}>{cat.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div>
                  <label className="block mb-1">Tên sản phẩm liên kết (Tự động)</label>
                  <input
                    type="text"
                    disabled
                    value={products.find(p => String(p.id) === selectedProductId)?.name || ''}
                    className="w-full px-3 py-2 border border-vintage-sepia-200 bg-vintage-sepia-50/50 rounded-lg text-warm-gray-600 font-bold"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1">Số lượng nhập *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg text-warm-gray-900 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block mb-1">Tổng giá trị nhập (₫) *</label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.totalValue}
                      onChange={(e) => setFormData({ ...formData, totalValue: Number(e.target.value) })}
                      className="w-full pl-8 pr-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg text-warm-gray-900 focus:outline-none font-mono"
                    />
                    <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block mb-1">Ghi chú thêm</label>
                <textarea
                  rows={2}
                  placeholder="Chi tiết nhà cung cấp, tình trạng máy..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg text-warm-gray-900 focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-vintage-sepia-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-vintage-sepia-200 hover:bg-vintage-sepia-200 cursor-pointer font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-vintage-sepia-900 text-vintage-sepia-50 hover:bg-vintage-gold cursor-pointer font-bold"
                >
                  Lưu chứng từ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
