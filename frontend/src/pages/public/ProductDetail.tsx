import React, { useState, useEffect } from 'react';
import { axiosClient } from '../../api/axiosClient.js';
import { BookingCalendar } from '../../components/booking/BookingCalendar.js';
import { useCartStore } from '../../store/cartStore.js';
import { useUIStore } from '../../store/uiStore.js';
import { useAuthStore } from '../../store/authStore.js';
import { ArrowLeft, ShoppingCart, CalendarRange, CheckCircle } from 'lucide-react';
import { formatVND } from '../../utils/currency';
import { Skeleton } from '../../components/ui/Skeleton';

interface Product {
  id: string;
  name: string;
  slug: string;
  brand: string;
  description: string;
  sale_price?: number;
  rental_price_per_day?: number;
  rentalPricePerDay: number;
  images: string[];
  specs: Record<string, string>;
  availableStock: number;
  price_configs?: Array<{
    min_days: number;
    max_days: number;
    price_per_day: number;
    deposit_percentage: number;
  }>;
}

interface BookingCalculation {
  isValid: boolean;
  startDate: string;
  endDate: string;
  rentalDays: number;
  pricePerDay: number;
  depositPercentage: number;
  depositAmount: number;
  totalRentalFee: number;
}

interface ProductDetailProps {
  slug: string;
  onNavigate: (path: string) => void;
}

export const ProductDetail: React.FC<ProductDetailProps> = ({ slug, onNavigate }) => {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'BUY' | 'RENT'>('RENT');
  
  // Zustand Stores
  const { isAuthenticated } = useAuthStore();
  const addItem = useCartStore((s) => s.addItem);
  const { addToast } = useUIStore();

  // Booking calculations state
  const [bookingCalc, setBookingCalc] = useState<BookingCalculation | null>(null);

  const fetchProduct = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get(`/products/${slug}`);
      if (res.data.success) {
        const prodData = res.data.data;
        setProduct({
          ...prodData,
          rentalPricePerDay: prodData.rental_price_per_day || prodData.rentalPricePerDay || 0
        });
      }
    } catch (err: any) {
      console.warn('API error, serving fallback product details', err);
      // Fallback model to allow dynamic local testing with realistic VNĐ prices
      setProduct({
        id: 'd4444444-4444-4444-4444-444444444444',
        name: 'Canon AE-1 Program',
        slug: 'canon-ae1-program',
        brand: 'Canon',
        description: 'Chiếc máy ảnh SLR cơ học huyền thoại, lý tưởng cho cả người mới bắt đầu và chuyên gia. Trang bị chế độ đo sáng Program AE tự động hoàn hảo.',
        sale_price: 5500000,
        rental_price_per_day: 250000,
        rentalPricePerDay: 250000,
        images: ['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=800'],
        specs: {
          'Ngàm ống kính': 'Canon FD',
          'Tốc độ màn trập': '1/1000s đến 2s',
          'Trọng lượng': '590g',
          'Khổ film': '35mm Film'
        },
        availableStock: 2,
        price_configs: [
          { min_days: 1, max_days: 3, price_per_day: 250000, deposit_percentage: 100 },
          { min_days: 4, max_days: 7, price_per_day: 200000, deposit_percentage: 80 },
          { min_days: 8, max_days: 30, price_per_day: 167500, deposit_percentage: 50 }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (slug) fetchProduct();
  }, [slug]);

  const handleBookingCalculated = (details: BookingCalculation) => {
    setBookingCalc(details);
  };

  const handleAddToCart = () => {
    if (!isAuthenticated) {
      addToast('Vui lòng đăng nhập để đặt hàng vào giỏ', 'info');
      onNavigate('/auth/login');
      return;
    }

    if (!product) return;

    if (activeTab === 'BUY') {
      addItem({
        productId: product.id,
        name: product.name,
        brand: product.brand,
        image: product.images[0],
        price: Number(product.sale_price),
        type: 'BUY',
        quantity: 1,
        availableStock: product.availableStock
      });
      addToast('Đã thêm sản phẩm mua đứt vào giỏ hàng!', 'success');
    } else {
      if (!bookingCalc || !bookingCalc.isValid) {
        addToast('Vui lòng chọn thời hạn đặt thuê hợp lệ trước', 'error');
        return;
      }

      addItem({
        productId: product.id,
        name: product.name,
        brand: product.brand,
        image: product.images[0],
        price: Number(bookingCalc.pricePerDay),
        type: 'RENT',
        quantity: 1,
        availableStock: product.availableStock,
        rentalDays: bookingCalc.rentalDays
      });

      // Cache booking configuration details locally for reference on checkout
      localStorage.setItem(`booking_config_${product.id}`, JSON.stringify({
        startDate: bookingCalc.startDate,
        endDate: bookingCalc.endDate
      }));

      addToast('Đã thêm đặt thuê máy ảnh vào giỏ hàng!', 'success');
    }
  };

  if (loading) {
    return <Skeleton className="h-[500px] border border-vintage-sepia-250 shadow-md" />;
  }

  if (!product) return <div>Không tìm thấy chi tiết thiết bị</div>;

  return (
    <div className="py-4 space-y-6">
      {/* Back button */}
      <button
        onClick={() => onNavigate('/products')}
        className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-warm-gray-700 hover:text-vintage-gold transition-colors cursor-pointer"
      >
        <ArrowLeft size={14} /> Quay lại Danh mục
      </button>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        {/* Left Side: Images & Tech Specs */}
        <div className="space-y-6">
          <div className="rounded-2xl overflow-hidden border border-vintage-sepia-200 bg-vintage-sepia-100 shadow-md">
            <img
              src={product.images[0] || 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=800'}
              alt={product.name}
              className="w-full h-[400px] object-cover"
            />
          </div>

          <div className="bg-vintage-sepia-100 p-6 rounded-xl border border-vintage-sepia-200 space-y-4">
            <h3 className="font-serif font-bold text-lg text-vintage-sepia-900 mb-4 pb-2 border-b border-vintage-sepia-200">Thông số Kỹ thuật</h3>

            {product.specs?.spec_url ? (
              <div className="pt-2">
                <a
                  href={product.specs.spec_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 w-full px-4 py-2.5 rounded-lg bg-vintage-gold text-vintage-sepia-900 hover:bg-vintage-sepia-900 hover:text-vintage-gold text-xs font-bold transition-all duration-300 shadow-sm cursor-pointer border border-vintage-gold"
                >
                  📄 Xem chi tiết thông số kỹ thuật (Bản gốc)
                </a>
              </div>
            ) : (
              <p className="text-xs text-warm-gray-700 italic">Chưa có thông tin thông số kỹ thuật.</p>
            )}
          </div>
        </div>

        {/* Right Side: Options and purchase module */}
        <div className="space-y-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-vintage-gold">{product.brand}</span>
            <h1 className="font-serif font-extrabold text-3xl text-vintage-sepia-900 mt-1">{product.name}</h1>
            <p className="text-sm text-warm-gray-700 mt-3 leading-relaxed font-sans font-medium">{product.description}</p>
          </div>

          {/* Tab selectors for BUY vs RENT */}
          <div className="flex rounded-lg p-1 bg-vintage-sepia-150 border border-vintage-sepia-200">
            {product.rental_price_per_day && (
              <button
                onClick={() => setActiveTab('RENT')}
                className={`flex-1 py-3 px-4 rounded-md text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'RENT'
                    ? 'bg-vintage-sepia-900 text-vintage-sepia-50 shadow'
                    : 'text-warm-gray-700 hover:text-vintage-sepia-900'
                }`}
              >
                <CalendarRange size={14} /> Thuê máy ảnh
              </button>
            )}

            {product.sale_price && (
              <button
                onClick={() => setActiveTab('BUY')}
                className={`flex-1 py-3 px-4 rounded-md text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'BUY'
                    ? 'bg-vintage-sepia-900 text-vintage-sepia-50 shadow'
                    : 'text-warm-gray-700 hover:text-vintage-sepia-900'
                }`}
              >
                <ShoppingCart size={14} /> Mua đứt máy
              </button>
            )}
          </div>

          {/* RENT OPTIONS VIEW */}
          {activeTab === 'RENT' && (
            <div className="bg-vintage-sepia-100 p-6 rounded-xl border border-vintage-sepia-200 space-y-6">
              <BookingCalendar product={product} onCalculate={handleBookingCalculated} />

              {bookingCalc && bookingCalc.isValid && (
                <div className="bg-vintage-sepia-50 p-4 rounded-lg border border-vintage-sepia-200/50 text-xs space-y-3">
                  <div className="flex justify-between">
                    <span className="text-warm-gray-700">Đơn giá ngày (mức chiết khấu):</span>
                    <span className="font-bold text-warm-gray-900">{formatVND(bookingCalc.pricePerDay)}/ngày</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-warm-gray-700">Số ngày thuê:</span>
                    <span className="font-bold text-warm-gray-900">{bookingCalc.rentalDays} ngày</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-warm-gray-700">Tiền đặt cọc (phong tỏa {bookingCalc.depositPercentage}%):</span>
                    <span className="font-bold text-warm-gray-900">{formatVND(bookingCalc.depositAmount)}</span>
                  </div>
                  <hr className="border-vintage-sepia-200" />
                  <div className="flex justify-between text-sm font-bold">
                    <span>Tổng tiền thuê tạm tính:</span>
                    <span className="text-vintage-gold text-base">{formatVND(bookingCalc.totalRentalFee)}</span>
                  </div>
                </div>
              )}

              {/* Rental tiers configurations guide (UC 3.3) */}
              <div className="text-[10px] text-warm-gray-700 space-y-1">
                <span className="font-bold uppercase tracking-wider block mb-1">Bảng chiết khấu thuê dài ngày</span>
                <p>• 1-3 Ngày: 100% đơn giá gốc &amp; 100% tiền đặt cọc máy</p>
                <p>• 4-7 Ngày: Chiết khấu giảm 20% đơn giá &amp; Chỉ cần cọc 80% trị giá</p>
                <p>• Từ 8 ngày trở lên: Chiết khấu giảm 33% đơn giá &amp; Chỉ cần cọc 50% trị giá</p>
              </div>
            </div>
          )}

          {/* BUY OPTIONS VIEW */}
          {activeTab === 'BUY' && (
            <div className="bg-vintage-sepia-100 p-6 rounded-xl border border-vintage-sepia-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-warm-gray-700 uppercase tracking-widest block">Nguyên bản đã căn chỉnh</span>
                <span className="font-serif font-extrabold text-2xl text-vintage-sepia-900 mt-1">{formatVND(product.sale_price)}</span>
              </div>
              <div className="text-xs text-warm-gray-700 font-medium">
                <span className="flex items-center gap-1 text-muted-green-800 font-bold bg-muted-green-50 px-2.5 py-1 rounded border border-muted-green-200">
                  <CheckCircle size={14} /> Đo sáng hoàn hảo &amp; Sẵn sàng
                </span>
              </div>
            </div>
          )}

          {/* General Actions */}
          <button
            onClick={handleAddToCart}
            disabled={product.availableStock === 0}
            className="w-full py-4 rounded-xl bg-vintage-sepia-900 hover:bg-vintage-gold text-vintage-sepia-50 font-bold text-xs uppercase tracking-widest shadow-lg cursor-pointer disabled:opacity-50 transition-colors"
          >
            {product.availableStock === 0 ? 'Hết hàng' : activeTab === 'BUY' ? 'Thêm máy ảnh vào Giỏ hàng' : 'Đặt thuê máy ngay'}
          </button>
        </div>
      </div>
    </div>
  );
};
