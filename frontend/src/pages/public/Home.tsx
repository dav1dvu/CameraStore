import React from 'react';
import { Camera, Calendar, Award, ChevronRight } from 'lucide-react';

interface HomeProps {
  onNavigate: (path: string) => void;
}

export const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-16 py-4">
      {/* Cinematic Hero Segment */}
      <div className="relative rounded-2xl overflow-hidden shadow-2xl h-[520px] bg-matte-black flex items-center px-8 sm:px-12 lg:px-16">
        {/* Background Image overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1495707902641-75cac588d2e9?auto=format&fit=crop&q=80&w=1600"
            alt="Vintage Film Background"
            className="w-full h-full object-cover opacity-35"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-matte-black via-transparent to-transparent"></div>
        </div>

        {/* Hero Copy */}
        <div className="relative z-10 max-w-xl space-y-6 text-vintage-sepia-50">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-vintage-gold/50 bg-vintage-gold/10 text-xs font-bold text-vintage-gold uppercase tracking-wider">
            <Camera size={12} /> Sự Trở Lại Của Kỷ Nguyên Analog
          </span>
          <h1 className="font-serif font-extrabold text-4xl sm:text-5xl lg:text-6xl tracking-tight leading-tight">
            Nâng Niu Từng <span className="text-vintage-gold italic">Hạt Grain</span> Thời Gian
          </h1>
          <p className="text-sm sm:text-base text-warm-gray-300 leading-relaxed font-sans font-medium">
            Thuê hoặc sở hữu những chiếc máy ảnh analog cổ điển mang tính biểu tượng từ bộ sưu tập retro tinh tế của TheFilmery. Tất cả máy đều được kiểm tra tỉ mỉ, căn chỉnh đo sáng hoàn hảo và sẵn sàng cho khung hình tiếp theo của bạn.
          </p>
          <div className="flex gap-4 pt-2">
            <button
              onClick={() => onNavigate('/products')}
              className="px-6 py-3 rounded-lg bg-vintage-gold hover:bg-vintage-gold-light text-matte-black font-bold text-sm transition-all flex items-center gap-1 cursor-pointer"
            >
              Khám Phá Danh Mục <ChevronRight size={16} />
            </button>
            <button
              onClick={() => onNavigate('/auth/register')}
              className="px-6 py-3 rounded-lg border border-white/20 hover:border-white text-white font-bold text-sm transition-all cursor-pointer"
            >
              Tham Gia Ngay
            </button>
          </div>
        </div>
      </div>

      {/* Feature stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-vintage-sepia-100 p-6 rounded-xl border border-vintage-sepia-200 flex gap-4 items-start">
          <div className="p-3 bg-vintage-sepia-200 text-vintage-gold rounded-lg">
            <Camera size={24} />
          </div>
          <div>
            <h3 className="font-serif font-bold text-lg text-vintage-sepia-900">Căn chỉnh máy tỉ mỉ</h3>
            <p className="text-xs text-warm-gray-700 mt-1 leading-relaxed">
              Mọi thân máy và ống kính đều trải qua bài kiểm tra tốc độ màn trập nghiêm ngặt, căn chỉnh đo sáng quang học và dán lại xốp buồng film.
            </p>
          </div>
        </div>

        <div className="bg-vintage-sepia-100 p-6 rounded-xl border border-vintage-sepia-200 flex gap-4 items-start">
          <div className="p-3 bg-vintage-sepia-200 text-vintage-gold rounded-lg">
            <Calendar size={24} />
          </div>
          <div>
            <h3 className="font-serif font-bold text-lg text-vintage-sepia-900">Hợp đồng thuê linh hoạt</h3>
            <p className="text-xs text-warm-gray-700 mt-1 leading-relaxed">
              Thời hạn thuê linh động từ 1 ngày tới 1 tháng. Thuê máy dài ngày sẽ được tính chiết khấu giảm giá ngày cực lớn.
            </p>
          </div>
        </div>

        <div className="bg-vintage-sepia-100 p-6 rounded-xl border border-vintage-sepia-200 flex gap-4 items-start">
          <div className="p-3 bg-vintage-sepia-200 text-vintage-gold rounded-lg">
            <Award size={24} />
          </div>
          <div>
            <h3 className="font-serif font-bold text-lg text-vintage-sepia-900">Đảm bảo tiền đặt cọc</h3>
            <p className="text-xs text-warm-gray-700 mt-1 leading-relaxed">
              Hóa đơn điện tử rõ ràng cùng cổng phong tỏa cọc minh bạch. Hoàn trả lại cọc ngay lập tức khi hoàn trả máy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
