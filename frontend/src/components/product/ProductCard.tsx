import React from 'react';
import { Calendar, Tag } from 'lucide-react';
import { formatVND } from '../../utils/currency';

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    slug: string;
    brand: string;
    salePrice?: number;
    rentalPricePerDay?: number;
    images: string[];
    availableStock: number;
    totalStock: number;
  };
  onClick: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onClick }) => {
  const isOutOfStock = product.availableStock === 0;

  return (
    <div
      onClick={onClick}
      className="group flex flex-col overflow-hidden rounded-xl border border-vintage-sepia-200 bg-vintage-sepia-50 hover:border-vintage-gold shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer"
    >
      {/* Product Image */}
      <div className="relative h-60 w-full overflow-hidden bg-vintage-sepia-100">
        <img
          src={product.images[0] || 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=800'}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Stock tag */}
        <div className="absolute top-3 right-3">
          {isOutOfStock ? (
            <span className="inline-flex items-center rounded-full bg-film-red/10 px-2.5 py-0.5 text-xs font-semibold text-film-red border border-film-red/35">
              Hết hàng
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-muted-green-50 px-2.5 py-0.5 text-xs font-semibold text-muted-green-800 border border-muted-green-200">
              Còn lại {product.availableStock} máy
            </span>
          )}
        </div>
      </div>

      {/* Product Details */}
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-vintage-gold">{product.brand}</span>
          <h3 className="font-serif font-bold text-base text-vintage-sepia-900 group-hover:text-vintage-gold transition-colors line-clamp-1">{product.name}</h3>
        </div>

        {/* Dynamic Pricing options */}
        <div className="mt-auto pt-4 border-t border-vintage-sepia-100 flex items-center justify-between">
          {/* Rent Box */}
          {product.rentalPricePerDay && (
            <div className="flex flex-col">
              <span className="text-[9px] font-semibold text-warm-gray-700 uppercase flex items-center gap-1">
                <Calendar size={10} /> Thuê máy
              </span>
              <span className="text-sm font-bold text-warm-gray-900">
                {formatVND(product.rentalPricePerDay)}<span className="text-[10px] font-normal text-warm-gray-700">/ngày</span>
              </span>
            </div>
          )}

          {/* Buy Box */}
          {product.salePrice && (
            <div className="flex flex-col text-right">
              <span className="text-[9px] font-semibold text-warm-gray-700 uppercase flex items-center gap-1 justify-end">
                <Tag size={10} /> Mua đứt
              </span>
              <span className="text-sm font-extrabold text-vintage-sepia-900">
                {formatVND(product.salePrice)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
