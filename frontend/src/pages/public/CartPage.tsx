import React, { useState } from 'react';
import { useCartStore } from '../../store/cartStore.js';
import { useUIStore } from '../../store/uiStore.js';
import { axiosClient } from '../../api/axiosClient.js';
import { QRInvoice } from '../../components/booking/QRInvoice.js';
import { Trash2, ShoppingBag, Plus, Minus, ArrowRight, CheckCircle2 } from 'lucide-react';
import { formatVND } from '../../utils/currency';

interface CartPageProps {
  onNavigate: (path: string) => void;
}

export const CartPage: React.FC<CartPageProps> = ({ onNavigate }) => {
  const { items, removeItem, updateQuantity, clearCart, getTotal } = useCartStore();
  const { addToast } = useUIStore();

  const [address, setAddress] = useState('');
  const [checkingOut, setCheckingOut] = useState(false);
  const [activeTransactionId, setActiveTransactionId] = useState<string | null>(null);
  const [checkoutComplete, setCheckoutComplete] = useState(false);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;
    setCheckingOut(true);
    try {
      // Split items by checkout actions: BUY vs RENT
      const rentItems = items.filter((i) => i.type === 'RENT');
      const buyItems = items.filter((i) => i.type === 'BUY');

      let invoiceTransactionId = '';

      // 1. Process rentals bookings
      for (const item of rentItems) {
        const configStr = localStorage.getItem(`booking_config_${item.productId}`);
        if (!configStr) throw new Error(`Thiếu cấu hình ngày thuê cho sản phẩm ${item.name}`);
        const config = JSON.parse(configStr);

        const res = await axiosClient.post('/bookings', {
          productId: item.productId,
          startDate: config.startDate,
          endDate: config.endDate
        });

        if (res.data.success) {
          // Track booking's initial transaction ID to pay
          const { bookingId } = res.data.data;
          // Retrieve booking details to find initial transaction
          const bookingDetails = await axiosClient.get(`/bookings/${bookingId}`);
          const trans = bookingDetails.data.data.transactions?.[0];
          if (trans) invoiceTransactionId = trans.id;
        }
      }

      // 2. Process purchases orders
      if (buyItems.length > 0) {
        const orderPayload = {
          shippingAddress: address || 'Store Pick-up',
          items: buyItems.map((i) => ({
            productId: i.productId,
            quantity: i.quantity
          }))
        };

        const res = await axiosClient.post('/orders', orderPayload);
        if (res.data.success) {
          invoiceTransactionId = res.data.data.transactionId;
        }
      }

      addToast('Đặt hàng thành công!', 'success');
      clearCart();
      
      if (invoiceTransactionId) {
        setActiveTransactionId(invoiceTransactionId);
      } else {
        setCheckoutComplete(true);
      }
    } catch (err: any) {
      addToast(err.message || 'Đặt hàng thất bại do hết hàng hoặc trùng lịch đặt', 'error');
    } finally {
      setCheckingOut(false);
    }
  };

  const handlePaymentConfirmed = () => {
    setActiveTransactionId(null);
    setCheckoutComplete(true);
    addToast('Hoàn tất quy trình thanh toán đặt cọc!', 'success');
  };

  if (checkoutComplete) {
    return (
      <div className="max-w-md mx-auto text-center py-16 px-6 bg-vintage-sepia-50 border border-vintage-sepia-200 rounded-xl space-y-4">
        <div className="flex justify-center text-muted-green-600">
          <CheckCircle2 size={56} className="animate-bounce" />
        </div>
        <h2 className="font-serif font-extrabold text-2xl text-vintage-sepia-900">Hoàn tất đặt hàng!</h2>
        <p className="text-xs text-warm-gray-700 leading-relaxed font-medium">
          Đơn đặt hàng và lịch hẹn thuê máy của bạn đã được ghi nhận. Hãy kiểm tra Bảng điều khiển Cá nhân để lấy mã nhận máy hoặc theo dõi trạng thái xác thực CCCD.
        </p>
        <button
          onClick={() => onNavigate('/dashboard')}
          className="mt-6 px-6 py-3 rounded-lg bg-vintage-sepia-900 hover:bg-vintage-gold text-vintage-sepia-50 font-bold text-xs uppercase cursor-pointer transition-colors"
        >
          Xem Bảng điều khiển
        </button>
      </div>
    );
  }

  if (activeTransactionId) {
    return (
      <div className="py-6 space-y-6">
        <div className="text-center">
          <h2 className="font-serif font-bold text-2xl text-vintage-sepia-900">Cổng Thanh toán Bảo mật</h2>
          <p className="text-xs text-warm-gray-700 mt-1 font-medium">Vui lòng quét mã thanh toán để hoàn tất giữ lịch hẹn thuê máy.</p>
        </div>
        <QRInvoice transactionId={activeTransactionId} onPaymentConfirmed={handlePaymentConfirmed} />
      </div>
    );
  }

  return (
    <div className="py-4 space-y-6">
      <div className="border-b border-vintage-sepia-200 pb-4">
        <h1 className="font-serif font-extrabold text-3xl text-vintage-sepia-900">Giỏ hàng của bạn</h1>
        <p className="text-sm text-warm-gray-700 mt-1 font-medium">Xem lại danh sách lịch đặt thuê máy và ống kính film trước khi thanh toán.</p>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 text-center bg-vintage-sepia-100 rounded-xl border border-vintage-sepia-200 border-dashed">
          <ShoppingBag className="h-12 w-12 text-warm-gray-300 mb-2" />
          <h3 className="font-serif font-bold text-lg text-vintage-sepia-900">Giỏ hàng trống</h3>
          <p className="text-xs text-warm-gray-700 max-w-xs mt-1">Khám phá bộ sưu tập máy ảnh analog của chúng tôi để thuê hoặc mua đứt thân máy.</p>
          <button
            onClick={() => onNavigate('/products')}
            className="mt-4 px-5 py-2.5 rounded-lg bg-vintage-sepia-900 text-vintage-sepia-50 hover:bg-vintage-gold text-xs font-bold transition-all cursor-pointer"
          >
            Khám phá Danh mục
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
          {/* Items columns */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 bg-vintage-sepia-100 border border-vintage-sepia-200 rounded-xl gap-4"
              >
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-16 h-16 object-cover rounded-lg border border-vintage-sepia-250 bg-vintage-sepia-50"
                />

                <div className="flex-1 min-w-0">
                  <span className="text-[9px] font-bold text-vintage-gold uppercase tracking-wider">{item.brand}</span>
                  <h3 className="font-serif font-bold text-sm text-vintage-sepia-900 truncate">{item.name}</h3>
                  <div className="flex gap-2 items-center mt-1">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      item.type === 'RENT' ? 'bg-amber-100 text-amber-800' : 'bg-muted-green-50 text-muted-green-800'
                    }`}>
                      {item.type === 'RENT' ? `Thuê máy (${item.rentalDays} ngày)` : 'Mua đứt'}
                    </span>
                    <span className="text-xs text-warm-gray-700 font-medium">
                      {formatVND(item.price)}{item.type === 'RENT' && '/ngày'}
                    </span>
                  </div>
                </div>

                {/* Quantity Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="p-1 rounded bg-vintage-sepia-200 hover:bg-vintage-gold hover:text-white transition-colors cursor-pointer text-warm-gray-700"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="text-xs font-bold text-warm-gray-900 w-4 text-center">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="p-1 rounded bg-vintage-sepia-200 hover:bg-vintage-gold hover:text-white transition-colors cursor-pointer text-warm-gray-700"
                  >
                    <Plus size={12} />
                  </button>
                </div>

                {/* Delete */}
                <button
                  onClick={() => removeItem(item.id)}
                  className="p-2 text-warm-gray-700 hover:text-film-red hover:bg-red-50 rounded transition-colors cursor-pointer"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          {/* Checkout column form */}
          <div className="lg:col-span-1 bg-vintage-sepia-100 p-6 rounded-xl border border-vintage-sepia-200 space-y-6">
            <h3 className="font-serif font-bold text-lg text-vintage-sepia-900 border-b border-vintage-sepia-200 pb-2">Tóm tắt đơn hàng</h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-warm-gray-700">Tạm tính:</span>
                <span className="font-bold text-warm-gray-900">{formatVND(getTotal())}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-warm-gray-700">Thuế VAT:</span>
                <span className="font-bold text-warm-gray-900">0₫</span>
              </div>
              <hr className="border-vintage-sepia-200" />
              <div className="flex justify-between text-sm font-bold">
                <span>Tổng thanh toán:</span>
                <span className="text-vintage-gold text-base">{formatVND(getTotal())}</span>
              </div>
            </div>

            {/* Shipping details */}
            <form onSubmit={handleCheckout} className="space-y-4 pt-4 border-t border-vintage-sepia-200">
              {items.some((i) => i.type === 'BUY') && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-warm-gray-700 mb-1">
                    Địa chỉ nhận hàng (Cho sản phẩm mua đứt)
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    required
                    placeholder="Nhập địa chỉ giao hàng nhận máy..."
                    className="w-full px-3 py-2 border border-vintage-sepia-250 bg-vintage-sepia-50 rounded-lg text-sm"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={checkingOut}
                className="w-full py-3.5 rounded-lg bg-vintage-sepia-900 hover:bg-vintage-gold text-vintage-sepia-50 font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
              >
                {checkingOut ? 'Đang xử lý đặt hàng...' : 'Xác nhận Đặt hàng'} <ArrowRight size={14} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
