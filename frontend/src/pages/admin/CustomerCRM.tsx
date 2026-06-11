import React, { useState, useEffect } from 'react';
import { axiosClient } from '../../api/axiosClient.js';
import { useUIStore } from '../../store/uiStore.js';
import { 
  Users, Search, Plus, Edit2, History, X, Loader2, Save, Trash2 
} from 'lucide-react';
import { formatVND } from '../../utils/currency';

interface Customer {
  id: string;
  full_name: string;
  phone_number?: string;
  identity_number?: string;
  email?: string;
  address?: string;
  notes?: string;
  created_at: string;
}

interface BookingHistory {
  id: string;
  status: string;
  start_date: string;
  end_date: string;
  total_rental_fee: number;
  deposit_amount: number;
  equipment: {
    serial_number: string;
    products: {
      name: string;
      brand: string;
    }
  }
}

export const CustomerCRM: React.FC = () => {
  const { addToast } = useUIStore();
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Modals state
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerFormData, setCustomerFormData] = useState({
    fullName: '',
    phoneNumber: '',
    identityNumber: '',
    email: '',
    address: '',
    notes: ''
  });

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
  const [bookingHistory, setBookingHistory] = useState<BookingHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Delete customer state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCustomers = async (searchVal: string = '') => {
    setLoading(true);
    try {
      const url = searchVal ? `/customers?q=${encodeURIComponent(searchVal)}` : '/customers';
      const res = await axiosClient.get(url);
      if (res.data.success) {
        setCustomers(res.data.data || []);
      }
    } catch (err: any) {
      addToast(err.message || 'Lỗi khi tải danh sách khách hàng', 'error');
      // Fallback stub for local testing
      setCustomers([
        {
          id: 'c111-2222',
          full_name: 'Nguyễn Văn A',
          phone_number: '0901234567',
          identity_number: '079123456789',
          email: 'customer.a@gmail.com',
          address: '123 Điện Biên Phủ, Quận 1, TPHCM',
          notes: 'Khách VIP, thường xuyên thuê Leica M6',
          created_at: '2026-01-10T12:00:00Z'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers(searchTerm);
  }, [searchTerm]);

  const handleCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerFormData.fullName) {
      addToast('Vui lòng nhập họ và tên khách hàng', 'error');
      return;
    }

    try {
      if (editingCustomer) {
        const res = await axiosClient.put(`/customers/${editingCustomer.id}`, customerFormData);
        if (res.data.success) {
          addToast('Cập nhật hồ sơ khách hàng thành công', 'success');
          fetchCustomers(searchTerm);
        }
      } else {
        const res = await axiosClient.post('/customers', customerFormData);
        if (res.data.success) {
          addToast('Thêm hồ sơ khách hàng mới thành công', 'success');
          fetchCustomers(searchTerm);
        }
      }
      setIsCustomerModalOpen(false);
    } catch (err: any) {
      addToast(err.message || 'Lỗi lưu thông tin khách hàng', 'error');
    }
  };

  const handleOpenHistory = async (customer: Customer) => {
    setHistoryCustomer(customer);
    setBookingHistory([]);
    setIsHistoryModalOpen(true);
    setLoadingHistory(true);
    try {
      const res = await axiosClient.get(`/customers/${customer.id}/history`);
      if (res.data.success) {
        setBookingHistory(res.data.data.bookings || []);
      }
    } catch (err: any) {
      addToast(err.message || 'Không thể tải lịch sử thuê máy của khách hàng', 'error');
      // stub fallback
      setBookingHistory([
        {
          id: 'b999-8888',
          status: 'CHECKED_OUT',
          start_date: '2026-05-01',
          end_date: '2026-05-05',
          total_rental_fee: 1500000,
          deposit_amount: 5000000,
          equipment: {
            serial_number: 'SN-LEICA-M6-999',
            products: { name: 'M6 Classic', brand: 'Leica' }
          }
        }
      ]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleOpenDeleteConfirm = (customer: Customer) => {
    setCustomerToDelete(customer);
    setIsDeleteModalOpen(true);
  };

  const handleCustomerDelete = async () => {
    if (!customerToDelete) return;
    setDeleting(true);
    try {
      const res = await axiosClient.delete(`/customers/${customerToDelete.id}`);
      if (res.data.success) {
        addToast('Xóa khách hàng thành công', 'success');
        fetchCustomers(searchTerm);
      }
      setIsDeleteModalOpen(false);
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.message || 'Lỗi khi xóa khách hàng';
      addToast(errMsg, 'error');
    } finally {
      setDeleting(false);
      setCustomerToDelete(null);
    }
  };

  return (
    <div className="py-4 space-y-8 font-medium">
      {/* Header */}
      <div className="border-b border-vintage-sepia-200 pb-4">
        <h1 className="font-serif font-extrabold text-3xl text-vintage-sepia-900 flex items-center gap-2">
          <Users className="text-vintage-gold" /> Khách hàng
        </h1>
        <p className="text-sm text-warm-gray-700 mt-1">
          Quản lý thông tin khách hàng mảng cho thuê máy.
        </p>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row gap-4 bg-vintage-sepia-100 p-4 rounded-xl border border-vintage-sepia-200 justify-between items-center">
        <div className="relative w-full sm:max-w-md">
          <input
            type="text"
            placeholder="Tìm kiếm khách hàng bằng họ tên, SĐT hoặc số CCCD..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-vintage-sepia-200 bg-vintage-sepia-50 focus:outline-none focus:border-vintage-gold text-sm text-warm-gray-900"
          />
          <Search className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
        </div>

        <button
          onClick={() => {
            setEditingCustomer(null);
            setCustomerFormData({
              fullName: '',
              phoneNumber: '',
              identityNumber: '',
              email: '',
              address: '',
              notes: ''
            });
            setIsCustomerModalOpen(true);
          }}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-vintage-sepia-900 hover:bg-vintage-gold text-vintage-sepia-50 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
        >
          <Plus size={16} /> Đăng ký khách hàng
        </button>
      </div>

      {/* Customer List */}
      {loading ? (
        <div className="text-center py-12"><Loader2 className="animate-spin h-8 w-8 text-vintage-gold mx-auto" /></div>
      ) : customers.length === 0 ? (
        <p className="text-center py-8 text-xs text-warm-gray-700 italic">Không tìm thấy thông tin khách hàng nào.</p>
      ) : (
        <div className="bg-vintage-sepia-100 border border-vintage-sepia-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-vintage-sepia-900/10 border-b border-vintage-sepia-200 text-vintage-sepia-900 font-bold uppercase tracking-wider">
                <th className="p-4">Tên khách hàng</th>
                <th className="p-4">SĐT</th>
                <th className="p-4">Số CCCD</th>
                <th className="p-4">Instagram</th>
                <th className="p-4">Địa chỉ cư trú</th>
                <th className="p-4">Ghi chú nghiệp vụ</th>
                <th className="p-4 text-center w-36">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-vintage-sepia-200">
              {customers.map(c => (
                <tr key={c.id} className="hover:bg-vintage-sepia-50/50">
                  <td className="p-4">
                    <span className="font-bold text-sm text-vintage-sepia-900 block">{c.full_name}</span>
                  </td>
                  <td className="p-4 font-mono text-warm-gray-900">
                    {c.phone_number || 'Chưa cập nhật SĐT'}
                  </td>
                  <td className="p-4 font-mono font-bold text-warm-gray-800">{c.identity_number || 'Chưa xác thực CCCD'}</td>
                  <td className="p-4 font-mono text-warm-gray-700">{c.email || 'N/A'}</td>
                  <td className="p-4 text-warm-gray-700 max-w-xs truncate">{c.address || 'N/A'}</td>
                  <td className="p-4 text-warm-gray-700 italic max-w-xs truncate">{c.notes || '-'}</td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => {
                          setEditingCustomer(c);
                          setCustomerFormData({
                            fullName: c.full_name,
                            phoneNumber: c.phone_number || '',
                            identityNumber: c.identity_number || '',
                            email: c.email || '',
                            address: c.address || '',
                            notes: c.notes || ''
                          });
                          setIsCustomerModalOpen(true);
                        }}
                        title="Chỉnh sửa hồ sơ"
                        className="p-2 rounded bg-vintage-gold/10 hover:bg-vintage-gold text-vintage-gold hover:text-vintage-sepia-900 cursor-pointer"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleOpenHistory(c)}
                        title="Lịch sử thuê máy"
                        className="p-2 rounded bg-vintage-sepia-900/10 hover:bg-vintage-sepia-900 text-vintage-sepia-900 hover:text-vintage-sepia-50 cursor-pointer"
                      >
                        <History size={13} />
                      </button>
                      <button
                        onClick={() => handleOpenDeleteConfirm(c)}
                        title="Xóa khách hàng"
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
      )}

      {/* Register/Edit Customer Modal */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-vintage-sepia-100 border border-vintage-sepia-200 rounded-xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
            <div className="p-5 border-b border-vintage-sepia-200 flex items-center justify-between">
              <h3 className="font-serif font-bold text-lg text-vintage-sepia-900">
                {editingCustomer ? 'Cập nhật thông tin khách hàng' : 'Đăng ký hồ sơ khách hàng mới'}
              </h3>
              <button onClick={() => setIsCustomerModalOpen(false)} className="p-1 rounded-lg hover:bg-vintage-sepia-200"><X size={18} /></button>
            </div>
            <form onSubmit={handleCustomerSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-warm-gray-700 mb-1">Họ và tên khách hàng *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Nguyễn Văn B"
                  value={customerFormData.fullName}
                  onChange={(e) => setCustomerFormData({ ...customerFormData, fullName: e.target.value })}
                  className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg focus:outline-none focus:border-vintage-gold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-warm-gray-700 mb-1">Số điện thoại</label>
                  <input
                    type="tel"
                    placeholder="09..."
                    value={customerFormData.phoneNumber}
                    onChange={(e) => setCustomerFormData({ ...customerFormData, phoneNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg focus:outline-none focus:border-vintage-gold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-warm-gray-700 mb-1">Số định danh (CCCD)</label>
                  <input
                    type="text"
                    placeholder="12 chữ số..."
                    value={customerFormData.identityNumber}
                    onChange={(e) => setCustomerFormData({ ...customerFormData, identityNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg font-mono focus:outline-none focus:border-vintage-gold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-warm-gray-700 mb-1">Instagram</label>
                <input
                  type="text"
                  placeholder="@instagram_username"
                  value={customerFormData.email}
                  onChange={(e) => setCustomerFormData({ ...customerFormData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg font-mono focus:outline-none focus:border-vintage-gold"
                />
              </div>

              <div>
                <label className="block font-bold text-warm-gray-700 mb-1">Địa chỉ thường trú</label>
                <input
                  type="text"
                  placeholder="Số nhà, Tên đường, Quận, Thành phố..."
                  value={customerFormData.address}
                  onChange={(e) => setCustomerFormData({ ...customerFormData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg focus:outline-none focus:border-vintage-gold"
                />
              </div>

              <div>
                <label className="block font-bold text-warm-gray-700 mb-1">Ghi chú về khách hàng</label>
                <textarea
                  rows={3}
                  placeholder="Ghi chú nợ xấu, khách hàng VIP, hành vi thuê máy..."
                  value={customerFormData.notes}
                  onChange={(e) => setCustomerFormData({ ...customerFormData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg focus:outline-none focus:border-vintage-gold"
                />
              </div>

              <div className="pt-4 border-t border-vintage-sepia-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-vintage-sepia-200 hover:bg-vintage-sepia-200 font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-vintage-sepia-900 text-vintage-sepia-50 font-bold hover:bg-vintage-gold cursor-pointer"
                >
                  <Save size={14} /> Lưu hồ sơ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Booking History Modal */}
      {isHistoryModalOpen && historyCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-vintage-sepia-100 border border-vintage-sepia-200 rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-5 border-b border-vintage-sepia-200 flex items-center justify-between">
              <div>
                <h3 className="font-serif font-bold text-lg text-vintage-sepia-900">Lịch sử thuê máy ảnh</h3>
                <p className="text-xs text-warm-gray-700 mt-0.5">Khách hàng: <strong>{historyCustomer.full_name}</strong> ({historyCustomer.phone_number})</p>
              </div>
              <button onClick={() => setIsHistoryModalOpen(false)} className="p-1 rounded-lg hover:bg-vintage-sepia-200"><X size={18} /></button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 text-xs space-y-4">
              {loadingHistory ? (
                <div className="text-center py-8"><Loader2 className="animate-spin h-6 w-6 text-vintage-gold mx-auto" /></div>
              ) : bookingHistory.length === 0 ? (
                <p className="text-center py-6 text-warm-gray-700 italic">Không có lịch sử thuê máy ảnh nào được ghi nhận cho khách hàng này.</p>
              ) : (
                <div className="space-y-4">
                  {bookingHistory.map((item) => (
                    <div key={item.id} className="p-4 bg-white border border-vintage-sepia-200 rounded-lg grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[9px] font-bold text-vintage-gold uppercase tracking-wider block">Thiết bị đã thuê</span>
                        <span className="font-serif font-bold text-sm text-vintage-sepia-900">{item.equipment.products.brand} {item.equipment.products.name}</span>
                        <span className="text-[10px] text-warm-gray-700 block font-mono">S/N: {item.equipment.serial_number}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-vintage-gold uppercase tracking-wider block">Thời hạn &amp; Trạng thái</span>
                        <span className="font-medium text-warm-gray-900 block">{item.start_date} đến {item.end_date}</span>
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold mt-1 uppercase ${
                          item.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                          item.status === 'CONFIRMED' ? 'bg-amber-150 text-amber-900' :
                          item.status === 'CHECKED_IN' ? 'bg-muted-green-150 text-muted-green-800' :
                          item.status === 'CHECKED_OUT' ? 'bg-gray-100 text-gray-700' : 'bg-red-100 text-red-800'
                        }`}>
                          {item.status === 'PENDING' ? 'Chờ thanh toán' :
                           item.status === 'CONFIRMED' ? 'Đã xác nhận' :
                           item.status === 'CHECKED_IN' ? 'Đang thuê' :
                           item.status === 'CHECKED_OUT' ? 'Đã trả máy' : 'Đã hủy'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-vintage-gold uppercase tracking-wider block">Phí thuê đã trả</span>
                        <span className="font-bold text-warm-gray-900">{formatVND(item.total_rental_fee)}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-vintage-gold uppercase tracking-wider block">Số tiền đặt cọc</span>
                        <span className="font-bold text-warm-gray-900">{formatVND(item.deposit_amount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {isDeleteModalOpen && customerToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-vintage-sepia-100 border border-vintage-sepia-200 rounded-xl shadow-2xl max-w-sm w-full overflow-hidden flex flex-col">
            <div className="p-5 border-b border-vintage-sepia-200 flex items-center justify-between">
              <h3 className="font-serif font-bold text-lg text-vintage-sepia-900">Xác nhận xóa khách hàng</h3>
              <button 
                onClick={() => setIsDeleteModalOpen(false)} 
                className="p-1 rounded-lg hover:bg-vintage-sepia-200"
                disabled={deleting}
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <p className="text-warm-gray-800">
                Bạn có chắc chắn muốn xóa khách hàng <strong className="text-vintage-sepia-900">{customerToDelete.full_name}</strong>? Hành động này không thể hoàn tác và sẽ thất bại nếu khách hàng đã có lịch sử đơn hàng.
              </p>
              <div className="pt-4 border-t border-vintage-sepia-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-vintage-sepia-200 hover:bg-vintage-sepia-200 font-bold cursor-pointer"
                  disabled={deleting}
                >
                  Hủy
                </button>
                <button
                  onClick={handleCustomerDelete}
                  className="flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-film-red text-white font-bold hover:bg-red-700 cursor-pointer disabled:opacity-50"
                  disabled={deleting}
                >
                  {deleting ? <Loader2 className="animate-spin h-3.5 w-3.5" /> : null}
                  Xác nhận xóa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default CustomerCRM;
