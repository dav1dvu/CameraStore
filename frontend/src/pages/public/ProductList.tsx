import React, { useState, useEffect } from 'react';
import { ProductFilter } from '../../components/product/ProductFilter.js';
import { ProductCard } from '../../components/product/ProductCard.js';
import { axiosClient } from '../../api/axiosClient.js';
import { HelpCircle } from 'lucide-react';
import { Skeleton } from '../../components/ui/Skeleton';

interface Product {
  id: string;
  name: string;
  slug: string;
  brand: string;
  salePrice?: number;
  rentalPricePerDay?: number;
  images: string[];
  availableStock: number;
  totalStock: number;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface FilterOptions {
  q: string;
  category: string;
  brand: string;
  maxPrice?: number;
}

interface ProductListProps {
  onNavigate: (path: string) => void;
}

export const ProductList: React.FC<ProductListProps> = ({ onNavigate }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Search filter options
  const [filters, setFilters] = useState<FilterOptions>({
    q: '',
    category: '',
    brand: '',
    maxPrice: undefined
  });

  // Fetch initial categories
  useEffect(() => {
    axiosClient.get('/products/categories')
      .then((res) => {
        if (res.data.success) setCategories(res.data.data);
      })
      .catch((err) => console.error('Error fetching categories list', err));
  }, []);

  // Fetch products when filters parameters update
  useEffect(() => {
    setLoading(true);
    
    // Construct search queries
    const params = new URLSearchParams();
    if (filters.q) params.append('q', filters.q);
    if (filters.category) params.append('category', filters.category);
    if (filters.brand) params.append('brand', filters.brand);
    if (filters.maxPrice) params.append('maxPrice', filters.maxPrice.toString());

    axiosClient.get(`/products?${params.toString()}`)
      .then((res) => {
        if (res.data.success) {
          setProducts(res.data.data);
        }
      })
      .catch((err) => {
        console.warn('API error, serving fallback product list', err);
        // Load fallback mockup items if API is completely offline to avoid breaking UI demo
        setProducts([
          {
            id: 'd4444444-4444-4444-4444-444444444444',
            name: 'Canon AE-1 Program',
            slug: 'canon-ae1-program',
            brand: 'Canon',
            salePrice: 5500000,
            rentalPricePerDay: 250000,
            images: ['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=800'],
            availableStock: 2,
            totalStock: 2
          },
          {
            id: 'f6666666-6666-6666-6666-666666666666',
            name: 'Leica M6 Classic',
            slug: 'leica-m6-classic',
            brand: 'Leica',
            salePrice: 68000000,
            rentalPricePerDay: 1200000,
            images: ['https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&q=80&w=800'],
            availableStock: 1,
            totalStock: 1
          },
          {
            id: 'a7777777-7777-7777-7777-777777777777',
            name: 'Hasselblad 500C/M',
            slug: 'hasselblad-500cm',
            brand: 'Hasselblad',
            salePrice: 45000000,
            rentalPricePerDay: 950000,
            images: ['https://images.unsplash.com/photo-1495707902641-75cac588d2e9?auto=format&fit=crop&q=80&w=800'],
            availableStock: 1,
            totalStock: 1
          }
        ]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [filters]);

  const handleFilterChange = (newFilters: FilterOptions) => {
    setFilters(newFilters);
  };

  return (
    <div className="py-4 space-y-6">
      <div className="border-b border-vintage-sepia-200 pb-4">
        <h1 className="font-serif font-extrabold text-3xl tracking-tight text-vintage-sepia-900">Danh mục Mua &amp; Thuê máy ảnh</h1>
        <p className="text-sm text-warm-gray-700 mt-1">Thuê những mẫu máy ảnh film huyền thoại theo ngày, hoặc mua đứt để lưu giữ chất ảnh grain mãi mãi.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Left Filters column */}
        <div className="lg:col-span-1">
          <ProductFilter categories={categories} onFilterChange={handleFilterChange} />
        </div>

        {/* Right Products list */}
        <div className="lg:col-span-3">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((n) => (
                <Skeleton key={n} className="h-96 border border-vintage-sepia-200 shadow-sm" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 text-center bg-vintage-sepia-100 rounded-xl border border-vintage-sepia-200 border-dashed">
              <HelpCircle className="h-12 w-12 text-warm-gray-300 mb-2" />
              <h3 className="font-serif font-bold text-lg text-vintage-sepia-900">Không tìm thấy kết quả phù hợp</h3>
              <p className="text-xs text-warm-gray-700 max-w-xs mt-1">Hãy thử thiết lập lại bộ lọc hoặc nhập thông số tìm kiếm khác.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  onClick={() => onNavigate(`/products/${p.slug}`)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
