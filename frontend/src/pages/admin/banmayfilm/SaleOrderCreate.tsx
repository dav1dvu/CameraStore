import React, { useState, useEffect } from 'react';
import { axiosClient } from '../../../api/axiosClient.js';
import { useUIStore } from '../../../store/uiStore.js';
import { formatVND } from '../../../utils/currency';
import { 
  ShoppingCart, Loader2, DollarSign
} from 'lucide-react';

interface Customer {
  id: string;
  full_name: string;
  phone: string;
  address?: string;
}

interface Product {
  id: string;
  name: string;
  brand: string;
  category_name: string;
  sale_price: number;
  available_stock: number;
}

interface Employee {
  id: number;
  full_name: string;
  staff_code: string;
}

export const SaleOrderCreate: React.FC = () => {
  const { addToast } = useUIStore();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Form states
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [salePrice, setSalePrice] = useState<number>(0);
  const [selectedSoldBy, setSelectedSoldBy] = useState<number | ''>('');
  const [notes, setNotes] = useState('');

  // Customer Autocomplete states
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [showCustSuggestions, setShowCustSuggestions] = useState(false);
  const [suggestedCustomers, setSuggestedCustomers] = useState<Customer[]>([]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const prodRes = await axiosClient.get('/sale-products');
      if (prodRes.data.success) {
        setProducts(prodRes.data.data || []);
      }
      const empRes = await axiosClient.get('/sale-employees');
      if (empRes.data.success) {
        setEmployees(empRes.data.data || []);
      }
      const custRes = await axiosClient.get('/sale-customers');
      if (custRes.data.success) {
        setCustomers(custRes.data.data || []);
      }
    } catch (err: any) {
      addToast(err.message || 'Lỗi khi tải dữ liệu khởi tạo', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleProductChange = (productId: string) => {
    setSelectedProductId(productId);
    const prod = products.find(p => p.id === productId);
    if (prod) {
      setSalePrice(prod.sale_price);
    }
  };

  const handleCustomerNameChange = (val: string) => {
    setCustomerName(val);
    if (val.trim()) {
      const filtered = customers.filter(c => 
        c.full_name.toLowerCase().includes(val.toLowerCase()) || 
        c.phone?.includes(val)
      );
      setSuggestedCustomers(filtered.slice(0, 5));
      setShowCustSuggestions(true);
    } else {
      setSuggestedCustomers([]);
      setShowCustSuggestions(false);
    }
  };

  const handleSelectSuggestion = (c: Customer) => {
    setCustomerName(c.full_name);
    setCustomerPhone(c.phone);
    setCustomerAddress(c.address || '');
    setShowCustSuggestions(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim() || !selectedProductId || quantity <= 0 || !selectedSoldBy) {
      addToast('Vui lòng nhập đầy đủ các trường thông tin bắt buộc', 'error');
      return;
    }

    const selectedProduct = products.find(p => p.id === selectedProductId);
    if (selectedProduct && selectedProduct.available_stock < quantity) {
      addToast(`Sản phẩm ${selectedProduct.name} không đủ tồn kho. Còn lại: ${selectedProduct.available_stock}`, 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await axiosClient.post('/sale-orders', {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerAddress: customerAddress.trim() || undefined,
        productId: selectedProductId,
        salePrice: Number(salePrice),
        quantity: Number(quantity),
        soldBy: Number(selectedSoldBy),
        notes
      });

      if (res.data.success) {
        addToast('Lên đơn bán máy film thành công!', 'success');
        // Reset form
        setCustomerName('');
        setCustomerPhone('');
        setCustomerAddress('');
        setSelectedProductId('');
        setQuantity(1);
        setSalePrice(0);
        setSelectedSoldBy('');
        setNotes('');
        loadInitialData(); // Refresh list to get updated stock
      }
    } catch (err: any) {
      addToast(err.response?.data?.message || err.message || 'Lỗi khi lên đơn bán hàng', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-4 space-y-8 font-medium">
      {/* Header */}
      <div className="border-b border-vintage-sepia-200 pb-4">
        <h1 className="font-serif font-extrabold text-3xl text-vintage-sepia-900 flex items-center gap-2">
          <ShoppingCart className="text-vintage-gold" /> Lập đơn
        </h1>
        <p className="text-sm text-warm-gray-700 mt-1">
          Tạo đơn bán máy ảnh, ống kính và phụ kiện trực tiếp tại quầy.
        </p>
      </div>

      <div className="bg-vintage-sepia-100 p-6 rounded-xl border border-vintage-sepia-200 shadow-sm max-w-xl mx-auto text-xs space-y-6">
        <div className="flex items-center gap-3 border-b border-vintage-sepia-200 pb-3 mb-4">
          <ShoppingCart className="text-vintage-gold h-5 w-5" />
          <h2 className="font-serif font-bold text-base text-vintage-sepia-900">Thông tin đơn bán hàng trực tiếp</h2>
        </div>

        {loading && products.length === 0 ? (
          <div className="text-center py-8"><Loader2 className="animate-spin h-8 w-8 text-vintage-gold mx-auto" /></div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Customer Name */}
            <div className="relative">
              <label className="block font-bold text-warm-gray-700 mb-1">Họ tên khách hàng *</label>
              <input
                type="text"
                required
                placeholder="Nhập tên khách hàng để tìm kiếm hoặc tạo mới..."
                value={customerName}
                onChange={(e) => handleCustomerNameChange(e.target.value)}
                onFocus={() => setShowCustSuggestions(true)}
                onBlur={() => setTimeout(() => setShowCustSuggestions(false), 250)}
                className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg focus:outline-none focus:border-vintage-gold text-warm-gray-900"
              />
              {showCustSuggestions && suggestedCustomers.length > 0 && (
                <div className="absolute z-10 w-full bg-white border border-vintage-sepia-200 rounded-lg mt-1 shadow-lg max-h-40 overflow-y-auto">
                  {suggestedCustomers.map(c => (
                    <div
                      key={c.id}
                      onMouseDown={() => handleSelectSuggestion(c)}
                      className="px-3 py-2 hover:bg-vintage-sepia-50 cursor-pointer text-left"
                    >
                      <span className="font-bold">{c.full_name}</span>
                      <span className="text-warm-gray-500 ml-2">({c.phone})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Customer Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-warm-gray-700 mb-1">Số điện thoại khách hàng *</label>
                <input
                  type="text"
                  required
                  placeholder="Nhập số điện thoại khách..."
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg focus:outline-none focus:border-vintage-gold"
                />
              </div>
              <div>
                <label className="block font-bold text-warm-gray-700 mb-1">Địa chỉ khách hàng (tùy chọn)</label>
                <input
                  type="text"
                  placeholder="Ví dụ: 123 Điện Biên Phủ, Q.1"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg focus:outline-none focus:border-vintage-gold"
                />
              </div>
            </div>

            {/* Product selection */}
            <div>
              <label className="block font-bold text-warm-gray-700 mb-1">Chọn sản phẩm trong kho *</label>
              <select
                required
                value={selectedProductId}
                onChange={(e) => handleProductChange(e.target.value)}
                className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg focus:outline-none focus:border-vintage-gold"
              >
                <option value="">-- Chọn sản phẩm bán lẻ --</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.brand} {p.name} ({formatVND(p.sale_price)}) - Tồn khả dụng: {p.available_stock}
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity and Custom Sale Price */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-warm-gray-700 mb-1">Số lượng mua *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                  className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg focus:outline-none focus:border-vintage-gold font-bold text-warm-gray-900"
                />
              </div>
              <div>
                <label className="block font-bold text-warm-gray-700 mb-1">Giá bán thực tế (₫) *</label>
                <div className="relative">
                  <input
                    type="number"
                    required
                    min="0"
                    value={salePrice}
                    onChange={(e) => setSalePrice(Number(e.target.value))}
                    className="w-full pl-8 pr-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg font-bold text-warm-gray-900"
                  />
                  <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                </div>
              </div>
            </div>

            {/* Sold By (Employee dropdown) */}
            <div>
              <label className="block font-bold text-warm-gray-700 mb-1">Nhân viên bán đơn hàng này *</label>
              <select
                required
                value={selectedSoldBy}
                onChange={(e) => setSelectedSoldBy(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg focus:outline-none focus:border-vintage-gold"
              >
                <option value="">-- Chọn nhân viên bán --</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.staff_code})</option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block font-bold text-warm-gray-700 mb-1">Ghi chú đơn hàng</label>
              <textarea
                rows={2}
                placeholder="Ghi chú thêm tình trạng phụ kiện đi kèm hoặc khuyến mãi..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg focus:outline-none focus:border-vintage-gold"
              />
            </div>

            <div className="pt-4 border-t border-vintage-sepia-200 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded bg-vintage-sepia-900 text-vintage-sepia-50 font-bold hover:bg-vintage-gold cursor-pointer disabled:opacity-50 flex items-center gap-2 text-xs uppercase tracking-wider"
              >
                {loading && <Loader2 className="animate-spin h-3.5 w-3.5" />}
                Lên đơn bán lẻ &amp; Trừ kho
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
export default SaleOrderCreate;
