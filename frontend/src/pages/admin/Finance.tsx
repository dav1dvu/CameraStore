import React, { useState, useEffect } from 'react';
import { axiosClient } from '../../api/axiosClient.js';
import { useUIStore } from '../../store/uiStore.js';
import { useAuthStore } from '../../store/authStore.js';
import { 
  DollarSign, Check, RefreshCw, Eye, Printer, X, Loader2 
} from 'lucide-react';
import { formatVND } from '../../utils/currency';

interface Transaction {
  id: string;
  booking_id?: string;
  order_id?: string;
  amount: number;
  type: string;
  status: string;
  payment_method?: string;
  created_at: string;
  invoice_url?: string;
}

interface ReceiptDetails {
  id: string;
  amount: number;
  type: string;
  status: string;
  payment_method?: string;
  created_at: string;
  profiles?: {
    full_name: string;
    phone: string;
    email: string;
  };
  bookings?: {
    start_date: string;
    end_date: string;
    total_rental_fee: number;
    deposit_amount: number;
  };
}

export const Finance: React.FC = () => {
  const { addToast } = useUIStore();
  const { user: currentUser } = useAuthStore();

  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Invoice / Receipt detail modals
  const [activeReceipt, setActiveReceipt] = useState<ReceiptDetails | null>(null);
  const [qrInvoiceUrl, setQrInvoiceUrl] = useState<string | null>(null);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      let query = '';
      const params = [];
      if (filterType) params.push(`type=${filterType}`);
      if (filterStatus) params.push(`status=${filterStatus}`);
      if (params.length > 0) query = '?' + params.join('&');

      const res = await axiosClient.get(`/transactions${query}`);
      if (res.data.success) {
        setTransactions(res.data.data || []);
      }
    } catch (err: any) {
      addToast(err.message || 'Lỗi khi tải danh sách giao dịch tài chính', 'error');
      // Fallback stub list
      setTransactions([
        {
          id: 't111-2222',
          booking_id: 'b111-2222',
          amount: 5000000,
          type: 'DEPOSIT_RECEIPT',
          status: 'SUCCESS',
          payment_method: 'BANK_TRANSFER',
          created_at: '2026-06-01T10:00:00Z'
        },
        {
          id: 't222-3333',
          booking_id: 'b111-2222',
          amount: 1500000,
          type: 'RENTAL_FEE',
          status: 'PENDING',
          payment_method: 'BANK_TRANSFER',
          created_at: '2026-06-01T10:15:00Z',
          invoice_url: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=simulate-vietqr-payment'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPayment = async (id: string) => {
    if (!window.confirm('Xác nhận đã nhận đủ tiền và đánh dấu Giao dịch thành công?')) return;
    try {
      const res = await axiosClient.post(`/transactions/${id}/confirm`);
      if (res.data.success) {
        addToast('Xác nhận thanh toán thành công!', 'success');
        fetchTransactions();
      }
    } catch (err: any) {
      addToast(err.message || 'Không thể xác nhận giao dịch này', 'error');
    }
  };

  const handleViewReceipt = async (id: string) => {
    setActiveReceipt(null);
    setQrInvoiceUrl(null);
    try {
      const res = await axiosClient.get(`/transactions/${id}/receipt`);
      if (res.data.success) {
        setActiveReceipt(res.data.data.receipt);
        // If it's pending, let's fetch QR invoice
        if (res.data.data.receipt.status === 'PENDING') {
          const invRes = await axiosClient.get(`/transactions/${id}/invoice`);
          if (invRes.data.success) {
            setQrInvoiceUrl(invRes.data.data.qrCodeUrl || invRes.data.data.invoiceUrl);
          }
        }
      }
    } catch (err: any) {
      addToast(err.message || 'Không thể lấy thông tin biên lai', 'error');
      // stub fallback
      setActiveReceipt({
        id,
        amount: 1500000,
        type: 'RENTAL_FEE',
        status: 'PENDING',
        payment_method: 'BANK_TRANSFER',
        created_at: new Date().toISOString(),
        profiles: { full_name: 'Nguyễn Văn A', phone: '0901234567', email: 'a@gmail.com' },
        bookings: { start_date: '2026-06-01', end_date: '2026-06-05', total_rental_fee: 1500000, deposit_amount: 5000000 }
      });
      setQrInvoiceUrl('https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=simulate-vietqr-payment');
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [filterType, filterStatus]);

  return (
    <div className="py-4 space-y-8 font-medium">
      {/* Header */}
      <div className="border-b border-vintage-sepia-200 pb-4">
        <h1 className="font-serif font-extrabold text-3xl text-vintage-sepia-900 flex items-center gap-2">
          <DollarSign className="text-vintage-gold" /> Quản lý Giao dịch &amp; Tài chính (finance)
        </h1>
        <p className="text-sm text-warm-gray-700 mt-1">
          Theo dõi dòng tiền ra vào hệ thống, tiền đặt cọc giữ máy, quyết toán doanh thu thuê và phê duyệt thanh toán hóa đơn.
        </p>
      </div>

      {/* Control Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 bg-vintage-sepia-100 p-4 rounded-xl border border-vintage-sepia-200 justify-between items-center text-xs">
        <div className="flex flex-wrap gap-4 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <span className="font-bold text-warm-gray-700">Loại giao dịch:</span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 rounded-lg border border-vintage-sepia-200 bg-white"
            >
              <option value="">-- Tất cả --</option>
              <option value="DEPOSIT_RECEIPT">Nhận đặt cọc (Deposit)</option>
              <option value="DEPOSIT_REFUND">Hoàn trả đặt cọc</option>
              <option value="RENTAL_FEE">Tiền thuê máy ảnh</option>
              <option value="OVERDUE_CHARGE">Phạt trễ hạn</option>
              <option value="DAMAGE_PENALTY">Đền bù hỏng hóc</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-bold text-warm-gray-700">Trạng thái:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 rounded-lg border border-vintage-sepia-200 bg-white"
            >
              <option value="">-- Tất cả --</option>
              <option value="PENDING">Chờ thanh toán (Pending)</option>
              <option value="SUCCESS">Thành công (Success)</option>
              <option value="FAILED">Thất bại (Failed)</option>
            </select>
          </div>
        </div>

        <button
          onClick={fetchTransactions}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-vintage-sepia-900 text-vintage-sepia-50 font-bold hover:bg-vintage-gold cursor-pointer"
        >
          <RefreshCw size={14} /> Làm mới
        </button>
      </div>

      {/* Transaction Table */}
      {loading ? (
        <div className="text-center py-12"><Loader2 className="animate-spin h-8 w-8 text-vintage-gold mx-auto" /></div>
      ) : transactions.length === 0 ? (
        <p className="text-center py-8 text-xs text-warm-gray-700 italic">Không có giao dịch nào phù hợp với bộ lọc.</p>
      ) : (
        <div className="bg-vintage-sepia-100 border border-vintage-sepia-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-vintage-sepia-900/10 border-b border-vintage-sepia-200 text-vintage-sepia-900 font-bold uppercase tracking-wider">
                <th className="p-4">Mã giao dịch</th>
                <th className="p-4">Thời gian</th>
                <th className="p-4">Loại hình</th>
                <th className="p-4">Số tiền</th>
                <th className="p-4">Phương thức</th>
                <th className="p-4 text-center">Trạng thái</th>
                <th className="p-4 text-center w-40">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-vintage-sepia-200">
              {transactions.map(t => (
                <tr key={t.id} className="hover:bg-vintage-sepia-50/50">
                  <td className="p-4 font-mono font-bold text-vintage-sepia-900">{t.id.substring(0, 13)}...</td>
                  <td className="p-4 font-mono text-gray-500">{new Date(t.created_at).toLocaleString('vi-VN')}</td>
                  <td className="p-4 font-bold">
                    <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      t.type.includes('DEPOSIT') ? 'bg-amber-100 text-amber-850' : 'bg-muted-green-100 text-muted-green-800'
                    }`}>
                      {t.type}
                    </span>
                  </td>
                  <td className="p-4 font-bold text-warm-gray-900">{formatVND(t.amount)}</td>
                  <td className="p-4 font-bold text-warm-gray-700">{t.payment_method || 'CASH'}</td>
                  <td className="p-4 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                      t.status === 'SUCCESS' ? 'bg-muted-green-150 text-muted-green-800' :
                      t.status === 'PENDING' ? 'bg-amber-150 text-amber-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleViewReceipt(t.id)}
                        title="Xem biên lai"
                        className="p-1.5 rounded bg-vintage-gold/10 hover:bg-vintage-gold text-vintage-gold hover:text-vintage-sepia-900 cursor-pointer"
                      >
                        <Eye size={13} />
                      </button>
                      {t.status === 'PENDING' && currentUser?.role === 'ADMIN' && (
                        <button
                          onClick={() => handleConfirmPayment(t.id)}
                          title="Xác nhận thanh toán"
                          className="p-1.5 rounded bg-muted-green-600/10 hover:bg-muted-green-600 text-muted-green-600 hover:text-white cursor-pointer"
                        >
                          <Check size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Invoice Details Modal */}
      {activeReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-vintage-sepia-100 border border-vintage-sepia-200 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-vintage-sepia-200 flex items-center justify-between">
              <h3 className="font-serif font-bold text-lg text-vintage-sepia-900">Chi tiết biên lai thanh toán</h3>
              <button onClick={() => setActiveReceipt(null)} className="p-1 rounded-lg hover:bg-vintage-sepia-200"><X size={18} /></button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6 text-xs" id="invoice-receipt-print">
              {/* Receipt Header Style */}
              <div className="text-center border-b border-dashed border-vintage-sepia-300 pb-4 space-y-1">
                <h2 className="font-serif font-extrabold text-xl text-vintage-sepia-900 tracking-wider">THEFILMERY ERP RECEIPT</h2>
                <p className="text-[10px] text-warm-gray-700">Mã hóa đơn: {activeReceipt.id}</p>
                <p className="text-[10px] text-warm-gray-700 font-mono">Thời gian: {new Date(activeReceipt.created_at).toLocaleString('vi-VN')}</p>
              </div>

              {/* Client information */}
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-vintage-gold uppercase tracking-wider">Khách hàng</span>
                <p className="font-bold text-vintage-sepia-900">{activeReceipt.profiles?.full_name || 'N/A'}</p>
                <p className="text-warm-gray-750">SĐT: {activeReceipt.profiles?.phone || 'N/A'} | Email: {activeReceipt.profiles?.email || 'N/A'}</p>
              </div>

              {/* Booking period information */}
              {activeReceipt.bookings && (
                <div className="space-y-1 bg-vintage-sepia-50 p-3 rounded border border-vintage-sepia-200">
                  <span className="text-[9px] font-bold text-vintage-gold uppercase tracking-wider block">Thời hạn thuê máy liên kết</span>
                  <p className="font-medium text-warm-gray-900">Từ {activeReceipt.bookings.start_date} đến {activeReceipt.bookings.end_date}</p>
                  <div className="flex justify-between mt-2 font-mono text-[10px]">
                    <span>Phí thuê gốc: {formatVND(activeReceipt.bookings.total_rental_fee)}</span>
                    <span>Tiền đặt cọc: {formatVND(activeReceipt.bookings.deposit_amount)}</span>
                  </div>
                </div>
              )}

              {/* Line Items */}
              <div className="border-t border-b border-dashed border-vintage-sepia-300 py-3 space-y-2">
                <div className="flex justify-between font-bold text-sm text-vintage-sepia-900">
                  <span>Khoản mục thanh toán:</span>
                  <span>{activeReceipt.type}</span>
                </div>
                <div className="flex justify-between text-warm-gray-800">
                  <span>Phương thức:</span>
                  <span>{activeReceipt.payment_method || 'CASH'}</span>
                </div>
                <div className="flex justify-between text-warm-gray-800">
                  <span>Trạng thái giao dịch:</span>
                  <span className="font-bold">{activeReceipt.status}</span>
                </div>
              </div>

              {/* Total money details */}
              <div className="flex justify-between text-base font-extrabold text-vintage-sepia-900 bg-vintage-sepia-900/5 p-3 rounded">
                <span>TỔNG TIỀN GIAO DỊCH:</span>
                <span>{formatVND(activeReceipt.amount)}</span>
              </div>

              {/* QR payment simulator if pending */}
              {activeReceipt.status === 'PENDING' && qrInvoiceUrl && (
                <div className="bg-white p-4 rounded-lg border border-vintage-sepia-200 text-center space-y-2">
                  <p className="font-bold text-vintage-gold text-[10px] uppercase">Quét mã VietQR để thanh toán nhanh</p>
                  <img src={qrInvoiceUrl} alt="VietQR Invoice" className="w-48 h-48 mx-auto object-contain border rounded p-1 bg-white" />
                  <p className="text-[9px] text-gray-500">Sau khi khách chuyển khoản thành công, nhấn "Xác nhận thanh toán" để duyệt đơn.</p>
                </div>
              )}

              {/* Print actions */}
              <div className="flex gap-3 justify-end pt-4 border-t border-vintage-sepia-200/50">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-4 py-2 border border-vintage-sepia-200 rounded hover:bg-vintage-sepia-200 font-bold"
                >
                  <Printer size={13} /> In hóa đơn
                </button>
                {activeReceipt.status === 'PENDING' && currentUser?.role === 'ADMIN' && (
                  <button
                    onClick={() => {
                      handleConfirmPayment(activeReceipt.id);
                      setActiveReceipt(null);
                    }}
                    className="px-5 py-2 bg-muted-green-600 hover:bg-muted-green-800 text-white rounded font-bold"
                  >
                    Duyệt thanh toán
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Finance;
