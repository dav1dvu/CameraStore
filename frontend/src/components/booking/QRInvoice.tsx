import React, { useState, useEffect } from 'react';
import { axiosClient } from '../../api/axiosClient.js';
import { useUIStore } from '../../store/uiStore.js';
import { QrCode, ClipboardCheck, Printer } from 'lucide-react';
import { formatVND } from '../../utils/currency';

interface QRInvoiceProps {
  transactionId: string;
  onPaymentConfirmed?: () => void;
}

export const QRInvoice: React.FC<QRInvoiceProps> = ({ transactionId, onPaymentConfirmed }) => {
  const [invoice, setInvoice] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const { addToast } = useUIStore();

  const fetchInvoice = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get(`/transactions/${transactionId}/qr`);
      if (res.data.success) {
        setInvoice(res.data.data);
      }
    } catch (err: any) {
      addToast(err.message || 'Lỗi sinh mã QR hóa đơn thanh toán', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (transactionId) {
      fetchInvoice();
    }
  }, [transactionId]);

  const handleSimulatePayment = async () => {
    setConfirming(true);
    try {
      const res = await axiosClient.post(`/transactions/${transactionId}/confirm`);
      if (res.data.success) {
        addToast('Xác thực thanh toán thành công!', 'success');
        if (onPaymentConfirmed) onPaymentConfirmed();
      }
    } catch (err: any) {
      addToast(err.message || 'Mô phỏng thanh toán thất bại', 'error');
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-vintage-sepia-50 border border-vintage-sepia-200 rounded-lg animate-pulse">
        <QrCode className="h-12 w-12 text-warm-gray-300 mb-2" />
        <div className="h-4 w-32 bg-warm-gray-200 rounded mb-2"></div>
        <div className="h-3 w-48 bg-warm-gray-200 rounded"></div>
      </div>
    );
  }

  if (!invoice) return null;

  return (
    <div className="bg-white p-6 rounded-xl border border-vintage-sepia-200 shadow-lg max-w-md mx-auto space-y-6">
      {/* Header */}
      <div className="text-center pb-4 border-b border-vintage-sepia-100">
        <span className="text-[10px] font-bold text-vintage-gold uppercase tracking-widest">Hóa đơn Thanh toán Kỹ thuật số</span>
        <h3 className="font-serif font-bold text-xl text-vintage-sepia-900 mt-1">Quét mã Thanh toán</h3>
        <p className="text-xs text-warm-gray-700 font-mono mt-1">Mã GD: {transactionId.substring(0, 16).toUpperCase()}</p>
      </div>

      {/* QR image */}
      <div className="flex justify-center p-4 bg-vintage-sepia-50 rounded-lg border border-vintage-sepia-200">
        <img
          src={invoice.qrUrl}
          alt="Payment QR Code"
          className="w-56 h-56 object-contain rounded"
        />
      </div>

      {/* Payment coordinates details */}
      <div className="bg-vintage-sepia-50 p-4 rounded-lg text-xs space-y-2 border border-vintage-sepia-100">
        <div className="flex justify-between">
          <span className="text-warm-gray-700">Ngân hàng thụ hưởng:</span>
          <span className="font-bold text-warm-gray-900">{invoice.paymentDetails.bankName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-warm-gray-700">Số tài khoản:</span>
          <span className="font-bold text-warm-gray-900 font-mono">{invoice.paymentDetails.accountNumber}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-warm-gray-700">Tên tài khoản:</span>
          <span className="font-bold text-warm-gray-900">{invoice.paymentDetails.accountName}</span>
        </div>
        <div className="flex justify-between border-t border-vintage-sepia-200 pt-2 text-sm font-bold">
          <span>Tổng tiền cần trả:</span>
          <span className="text-vintage-sepia-900 font-serif font-extrabold text-base">{formatVND(invoice.amount)}</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleSimulatePayment}
          disabled={confirming}
          className="flex-1 py-3 px-4 rounded-lg bg-vintage-sepia-900 hover:bg-vintage-gold text-vintage-sepia-50 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
        >
          <ClipboardCheck size={14} />
          {confirming ? 'Đang xác thực...' : 'Giả lập thanh toán (Bản thử nghiệm)'}
        </button>
        
        <button
          onClick={() => window.print()}
          className="p-3 rounded-lg border border-vintage-sepia-200 hover:bg-vintage-sepia-50 text-warm-gray-700 cursor-pointer"
          title="In Hóa đơn"
        >
          <Printer size={16} />
        </button>
      </div>
    </div>
  );
};
