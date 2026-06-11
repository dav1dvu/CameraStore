import React, { useState, useEffect, useRef } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';

interface ProductFilterProps {
  categories: any[];
  onFilterChange: (filters: {
    q: string;
    category: string;
    brand: string;
    minPrice?: number;
    maxPrice?: number;
  }) => void;
}

export const ProductFilter: React.FC<ProductFilterProps> = ({ categories, onFilterChange }) => {
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [minPrice, setMinPrice] = useState<number | undefined>(undefined);
  const [maxPrice, setMaxPrice] = useState<number | undefined>(undefined);

  const debounceTimeout = useRef<any | null>(null);

  // Debounced search text trigger
  useEffect(() => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(() => {
      onFilterChange({
        q,
        category,
        brand,
        minPrice,
        maxPrice
      });
    }, 300);

    return () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    };
  }, [q, category, brand, minPrice, maxPrice]);

  return (
    <div className="w-full bg-vintage-sepia-100 rounded-xl p-6 border border-vintage-sepia-200">
      <div className="flex items-center gap-2 mb-6 pb-4 border-b border-vintage-sepia-200">
        <SlidersHorizontal size={18} className="text-vintage-gold" />
        <h3 className="font-serif font-bold text-lg text-vintage-sepia-900">Bộ lọc Tìm kiếm</h3>
      </div>

      <div className="space-y-5">
        {/* Search bar */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-warm-gray-700 mb-2">Tìm kiếm thiết bị</label>
          <div className="relative">
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ví dụ: Canon, SLR, 35mm..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-vintage-sepia-200 bg-vintage-sepia-50 focus:outline-none focus:border-vintage-gold text-sm text-warm-gray-900 transition-colors"
            />
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-400" />
          </div>
        </div>

        {/* Categories select */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-warm-gray-700 mb-2">Danh mục</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-vintage-sepia-200 bg-vintage-sepia-50 focus:outline-none focus:border-vintage-gold text-sm text-warm-gray-900 transition-colors"
          >
            <option value="">Tất cả danh mục</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Brands selector */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-warm-gray-700 mb-2">Thương hiệu</label>
          <select
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-vintage-sepia-200 bg-vintage-sepia-50 focus:outline-none focus:border-vintage-gold text-sm text-warm-gray-900 transition-colors"
          >
            <option value="">Tất cả thương hiệu</option>
            <option value="Canon">Canon</option>
            <option value="Nikon">Nikon</option>
            <option value="Leica">Leica</option>
            <option value="Hasselblad">Hasselblad</option>
            <option value="Pentax">Pentax</option>
            <option value="Olympus">Olympus</option>
          </select>
        </div>

        {/* Price limits */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-warm-gray-700 mb-2">Ngân sách tối đa (₫)</label>
          <input
            type="number"
            value={maxPrice || ''}
            onChange={(e) => setMaxPrice(e.target.value ? Number(e.target.value) : undefined)}
            placeholder="Giá tối đa..."
            className="w-full px-3 py-2.5 rounded-lg border border-vintage-sepia-200 bg-vintage-sepia-50 focus:outline-none focus:border-vintage-gold text-sm text-warm-gray-900 transition-colors"
          />
        </div>

        {/* Reset button */}
        <button
          onClick={() => {
            setQ('');
            setCategory('');
            setBrand('');
            setMinPrice(undefined);
            setMaxPrice(undefined);
          }}
          className="w-full py-2.5 rounded-lg border border-dashed border-vintage-gold/50 hover:border-vintage-gold text-xs font-bold text-vintage-gold bg-transparent hover:bg-vintage-sepia-50 transition-colors cursor-pointer"
        >
          Thiết lập lại bộ lọc
        </button>
      </div>
    </div>
  );
};
