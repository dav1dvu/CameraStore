import React, { useState, useEffect } from 'react';
import { axiosClient } from '../../api/axiosClient.js';
import { useUIStore } from '../../store/uiStore.js';
import { useAuthStore } from '../../store/authStore.js';
import { 
  MessageSquare, Plus, Check, X, Loader2, Calendar 
} from 'lucide-react';

interface FeedbackItem {
  id: string;
  customer_id?: string;
  booking_id?: string;
  order_id?: string;
  type: 'FEEDBACK' | 'COMPLAINT' | 'SUGGESTION';
  content: string;
  resolved: boolean;
  resolved_at?: string;
  created_at: string;
  profiles?: {
    full_name: string;
    phone: string;
  };
  staff?: {
    full_name: string;
  };
}

export const Feedback: React.FC = () => {
  const { addToast } = useUIStore();
  const { user: currentUser } = useAuthStore();

  const [loading, setLoading] = useState(false);
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'resolved'>('pending');

  // Create ticket states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ticketFormData, setTicketFormData] = useState({
    customerId: '',
    bookingId: '',
    orderId: '',
    type: 'FEEDBACK' as 'FEEDBACK' | 'COMPLAINT' | 'SUGGESTION',
    content: ''
  });

  const [customers, setCustomers] = useState<any[]>([]);
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const fetchCustomers = async () => {
    try {
      const res = await axiosClient.get('/customers');
      if (res.data.success) {
        setCustomers(res.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching customers list:', err);
    }
  };

  const fetchCustomerOrders = async (cId: string) => {
    if (!cId) {
      setCustomerOrders([]);
      return;
    }
    setLoadingOrders(true);
    try {
      const [bookingsRes, ordersRes] = await Promise.all([
        axiosClient.get(`/bookings?customerId=${cId}`),
        axiosClient.get(`/orders?customerId=${cId}`)
      ]);

      const formattedBookings = (bookingsRes.data.data || []).map((b: any) => ({
        type: 'BOOKING',
        id: b.id,
        date: b.start_date,
        label: `[Đơn thuê] ${b.equipment?.products?.name || 'Máy ảnh'} (Hạn: ${b.start_date} - ${b.end_date})`
      }));

      const formattedOrders = (ordersRes.data.data || []).map((o: any) => {
        const prodNames = (o.order_items || []).map((i: any) => i.products?.name).filter(Boolean).join(', ');
        return {
          type: 'ORDER',
          id: o.id,
          date: o.created_at,
          label: `[Đơn bán] ${prodNames || 'Sản phẩm lẻ'} (Mua ngày: ${new Date(o.created_at).toLocaleDateString('vi-VN')} - ${o.total_amount.toLocaleString()} ₫)`
        };
      });

      const combined = [...formattedBookings, ...formattedOrders].sort((a, b) => b.date.localeCompare(a.date));
      setCustomerOrders(combined);
    } catch (err) {
      console.error('Error fetching customer transaction history:', err);
      setCustomerOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleOrderSelectChange = (value: string) => {
    if (!value) {
      setTicketFormData(prev => ({ ...prev, bookingId: '', orderId: '' }));
      return;
    }
    try {
      const parsed = JSON.parse(value);
      if (parsed.type === 'BOOKING') {
        setTicketFormData(prev => ({ ...prev, bookingId: parsed.id, orderId: '' }));
      } else if (parsed.type === 'ORDER') {
        setTicketFormData(prev => ({ ...prev, bookingId: '', orderId: parsed.id }));
      }
    } catch {
      setTicketFormData(prev => ({ ...prev, bookingId: '', orderId: '' }));
    }
  };

  const fetchFeedbacks = async () => {
    setLoading(true);
    try {
      const resolvedParam = activeTab === 'resolved' ? 'true' : 'false';
      const res = await axiosClient.get(`/feedbacks?resolved=${resolvedParam}`);
      if (res.data.success) {
        setFeedbacks(res.data.data || []);
      }
    } catch (err: any) {
      addToast(err.message || 'Lỗi khi tải danh sách phản hồi', 'error');
      // Fallback stub
      setFeedbacks([
        {
          id: 'fb-1',
          type: 'COMPLAINT',
          content: 'Khách hàng phàn nàn máy ảnh cơ Nikon FM2 bị lọt sáng khi chụp cuộn film đầu tiên. Cần hỗ trợ kiểm tra buồng phim.',
          resolved: false,
          created_at: '2026-06-03T14:30:00Z',
          profiles: { full_name: 'Nguyễn Văn A', phone: '0901234567' },
          staff: { full_name: 'Nhân viên 1' }
        },
        {
          id: 'fb-2',
          type: 'SUGGESTION',
          content: 'Nên bổ sung thêm nhiều loại cuộn film 135/120 Kodak, Fuji ở quầy bán lẻ để khách tiện mua kèm khi thuê máy.',
          resolved: true,
          resolved_at: '2026-06-04T09:00:00Z',
          created_at: '2026-06-02T10:00:00Z',
          profiles: { full_name: 'Trần Thị B', phone: '0907654321' },
          staff: { full_name: 'Nhân viên 2' }
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (id: string) => {
    if (!window.confirm('Xác nhận đã xử lý xong khiếu nại/phản hồi này?')) return;
    try {
      const res = await axiosClient.post(`/feedbacks/${id}/resolve`);
      if (res.data.success) {
        addToast('Đã giải quyết yêu cầu phản hồi thành công!', 'success');
        fetchFeedbacks();
      }
    } catch (err: any) {
      addToast(err.message || 'Lỗi giải quyết khiếu nại', 'error');
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketFormData.content.trim()) {
      addToast('Vui lòng điền nội dung chi tiết phản hồi', 'error');
      return;
    }

    try {
      const res = await axiosClient.post('/feedbacks', {
        customerId: ticketFormData.customerId || undefined,
        bookingId: ticketFormData.bookingId || undefined,
        orderId: ticketFormData.orderId || undefined,
        type: ticketFormData.type,
        content: ticketFormData.content
      });

      if (res.data.success) {
        addToast('Ghi nhận phản hồi/khiếu nại thành công!', 'success');
        setIsModalOpen(false);
        fetchFeedbacks();
      }
    } catch (err: any) {
      addToast(err.message || 'Lỗi lưu phản hồi', 'error');
    }
  };

  useEffect(() => {
    fetchFeedbacks();
    fetchCustomers();
  }, [activeTab]);

  return (
    <div className="py-4 space-y-8 font-medium">
      {/* Header */}
      <div className="border-b border-vintage-sepia-200 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif font-extrabold text-3xl text-vintage-sepia-900 flex items-center gap-2">
            <MessageSquare className="text-vintage-gold" /> Ghi nhận &amp; Xử lý phản hồi (feedback)
          </h1>
          <p className="text-sm text-warm-gray-700 mt-1">
            Theo dõi ý kiến đóng góp, khiếu nại hư hỏng thiết bị từ phía khách hàng và ghi nhận biên bản xử lý sự cố.
          </p>
        </div>
      </div>

      {/* Tab controls */}
      <div className="flex flex-col sm:flex-row gap-4 bg-vintage-sepia-100 p-4 rounded-xl border border-vintage-sepia-200 justify-between items-center text-xs">
        <div className="flex gap-2 border-b border-transparent">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'pending'
                ? 'bg-vintage-sepia-900 text-vintage-sepia-50'
                : 'text-warm-gray-700 hover:text-vintage-gold'
            }`}
          >
            Đang xử lý (Pending)
          </button>
          <button
            onClick={() => setActiveTab('resolved')}
            className={`px-4 py-2 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'resolved'
                ? 'bg-vintage-sepia-900 text-vintage-sepia-50'
                : 'text-warm-gray-700 hover:text-vintage-gold'
            }`}
          >
            Đã giải quyết (Resolved)
          </button>
        </div>

        <button
          onClick={() => {
            setTicketFormData({
              customerId: '',
              bookingId: '',
              orderId: '',
              type: 'FEEDBACK',
              content: ''
            });
            setCustomerOrders([]);
            setIsModalOpen(true);
          }}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-vintage-sepia-900 text-vintage-sepia-50 font-bold hover:bg-vintage-gold cursor-pointer"
        >
          <Plus size={16} /> Ghi nhận phản hồi
        </button>
      </div>

      {/* Ticket List */}
      {loading ? (
        <div className="text-center py-12"><Loader2 className="animate-spin h-8 w-8 text-vintage-gold mx-auto" /></div>
      ) : feedbacks.length === 0 ? (
        <p className="text-center py-8 text-xs text-warm-gray-700 italic">Không có phiếu phản hồi nào ở mục này.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {feedbacks.map((item) => (
            <div 
              key={item.id}
              className="bg-vintage-sepia-100 p-5 rounded-xl border border-vintage-sepia-200 shadow-sm space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    item.type === 'COMPLAINT' ? 'bg-red-100 text-red-800' :
                    item.type === 'SUGGESTION' ? 'bg-amber-100 text-amber-850' : 'bg-muted-green-100 text-muted-green-800'
                  }`}>
                    {item.type === 'COMPLAINT' ? 'Khiếu nại / Lỗi' : item.type === 'SUGGESTION' ? 'Góp ý' : 'Đánh giá'}
                  </span>
                  <span className="font-mono text-[10px] text-gray-500 flex items-center gap-1">
                    <Calendar size={12} /> {new Date(item.created_at).toLocaleDateString('vi-VN')}
                  </span>
                </div>

                <p className="text-xs text-warm-gray-900 leading-relaxed font-semibold">
                  "{item.content}"
                </p>

                <div className="grid grid-cols-2 gap-4 text-[10px] pt-2 border-t border-vintage-sepia-200/60">
                  <div>
                    <span className="font-bold text-vintage-gold block uppercase">Khách hàng</span>
                    <span className="font-medium text-warm-gray-900">{item.profiles?.full_name || 'Khách vãng lai'}</span>
                    {item.profiles?.phone && <span className="text-gray-500 block">SĐT: {item.profiles.phone}</span>}
                  </div>
                  <div>
                    <span className="font-bold text-vintage-gold block uppercase">Nhân viên ghi nhận</span>
                    <span className="font-medium text-warm-gray-900">{item.staff?.full_name || 'Hệ thống'}</span>
                  </div>
                </div>

                {(item.booking_id || item.order_id) && (
                  <div className="flex gap-4 pt-1 font-mono text-[9px] text-gray-500">
                    {item.booking_id && <span>Đơn thuê: {item.booking_id.substring(0, 13)}...</span>}
                    {item.order_id && <span>Đơn bán: {item.order_id.substring(0, 13)}...</span>}
                  </div>
                )}
              </div>

              {/* Action resolve */}
              {!item.resolved && currentUser?.role === 'ADMIN' && (
                <div className="pt-4 border-t border-vintage-sepia-200/50 flex justify-end">
                  <button
                    onClick={() => handleResolve(item.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-muted-green-600 hover:bg-muted-green-800 text-white font-bold text-[10px] uppercase cursor-pointer"
                  >
                    <Check size={12} /> Đã giải quyết / Đóng ticket
                  </button>
                </div>
              )}

              {item.resolved && item.resolved_at && (
                <div className="pt-3 border-t border-vintage-sepia-200/50 text-right text-[9px] text-muted-green-800 font-bold uppercase">
                  ✓ Đã giải quyết xong vào {new Date(item.resolved_at).toLocaleDateString('vi-VN')}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Ticket Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-vintage-sepia-100 border border-vintage-sepia-200 rounded-xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
            <div className="p-5 border-b border-vintage-sepia-200 flex items-center justify-between">
              <h3 className="font-serif font-bold text-lg text-vintage-sepia-900">
                Ghi nhận ý kiến khách hàng mới
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-lg hover:bg-vintage-sepia-200"><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateTicket} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-warm-gray-700 mb-1">Loại hình ý kiến *</label>
                <select
                  value={ticketFormData.type}
                  onChange={(e) => setTicketFormData({ ...ticketFormData, type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg focus:outline-none focus:border-vintage-gold"
                >
                  <option value="FEEDBACK">Đánh giá chung (Feedback)</option>
                  <option value="COMPLAINT">Khiếu nại hư hỏng / Dịch vụ lỗi (Complaint)</option>
                  <option value="SUGGESTION">Góp ý cải tiến cửa hàng (Suggestion)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-warm-gray-700 mb-1">Khách hàng liên kết *</label>
                <select
                  value={ticketFormData.customerId}
                  onChange={(e) => {
                    const cId = e.target.value;
                    setTicketFormData({ ...ticketFormData, customerId: cId, bookingId: '', orderId: '' });
                    fetchCustomerOrders(cId);
                  }}
                  className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg focus:outline-none focus:border-vintage-gold"
                >
                  <option value="">-- Chọn khách hàng liên kết --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name} ({c.phone_number || 'Không có SĐT'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-warm-gray-700 mb-1">Đơn hàng liên quan (Tùy chọn)</label>
                <select
                  disabled={!ticketFormData.customerId || loadingOrders}
                  value={
                    ticketFormData.bookingId 
                      ? JSON.stringify({ type: 'BOOKING', id: ticketFormData.bookingId })
                      : ticketFormData.orderId 
                        ? JSON.stringify({ type: 'ORDER', id: ticketFormData.orderId })
                        : ''
                  }
                  onChange={(e) => handleOrderSelectChange(e.target.value)}
                  className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg focus:outline-none focus:border-vintage-gold disabled:opacity-50"
                >
                  <option value="">
                    {!ticketFormData.customerId 
                      ? '-- Vui lòng chọn khách hàng trước --' 
                      : loadingOrders 
                        ? 'Đang tải lịch sử giao dịch...' 
                        : customerOrders.length === 0 
                          ? 'Khách hàng này chưa có đơn thuê hay mua hàng nào' 
                          : '-- Chọn đơn hàng (Thuê/Mua) --'}
                  </option>
                  {customerOrders.map((o) => (
                    <option key={`${o.type}-${o.id}`} value={JSON.stringify({ type: o.type, id: o.id })}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-warm-gray-700 mb-1">Mô tả nội dung chi tiết phản hồi *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Ghi nhận rõ ràng chi tiết khiếu nại hoặc đóng góp của khách hàng..."
                  value={ticketFormData.content}
                  onChange={(e) => setTicketFormData({ ...ticketFormData, content: e.target.value })}
                  className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg focus:outline-none focus:border-vintage-gold"
                />
              </div>

              <div className="pt-4 border-t border-vintage-sepia-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-vintage-sepia-200 hover:bg-vintage-sepia-200 font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-vintage-sepia-900 text-vintage-sepia-50 font-bold hover:bg-vintage-gold cursor-pointer"
                >
                  Ghi nhận sự cố
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default Feedback;
