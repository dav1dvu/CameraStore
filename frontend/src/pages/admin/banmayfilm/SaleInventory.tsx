import React, { useState, useEffect } from 'react';
import { axiosClient } from '../../../api/axiosClient.js';
import { useUIStore } from '../../../store/uiStore.js';
import { useAuthStore } from '../../../store/authStore.js';
import { formatVND } from '../../../utils/currency';
import { 
  Package, Plus, Edit2, Trash2, Search, X, Loader2 
} from 'lucide-react';

interface SaleProduct {
  id: string;
  name: string;
  brand: string;
  category_name: string;
  sale_price: number;
  total_stock: number;
  available_stock: number;
  description?: string;
  images: string[];
  created_at: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export const SaleInventory: React.FC = () => {
  const { user: currentUser } = useAuthStore();
  const { addToast } = useUIStore();
  
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'products' | 'categories'>('products');
  const [products, setProducts] = useState<SaleProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Category modal states
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    slug: '',
    description: '',
  });

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<SaleProduct | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    categoryName: '',
    salePrice: 0,
    totalStock: 0,
    availableStock: 0,
    description: ''
  });

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get('/sale-products');
      if (res.data.success) {
        setProducts(res.data.data || []);
      }
    } catch (err: any) {
      addToast(err.message || 'Lỗi khi tải danh sách sản phẩm bán', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await axiosClient.get('/categories');
      if (res.data.success) {
        setCategories(res.data.data || []);
      }
    } catch (err: any) {
      addToast(err.message || 'Lỗi khi tải danh mục', 'error');
      setCategories([]);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.brand || !formData.categoryName || formData.salePrice < 0) {
      addToast('Vui lòng điền đầy đủ các thông tin bắt buộc', 'error');
      return;
    }

    try {
      const payload = {
        name: formData.name,
        brand: formData.brand,
        categoryName: formData.categoryName,
        salePrice: Number(formData.salePrice),
        totalStock: Number(formData.totalStock),
        availableStock: Number(formData.availableStock),
        description: formData.description,
        images: ['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=800']
      };

      if (editingProduct) {
        const res = await axiosClient.put(`/sale-products/${editingProduct.id}`, payload);
        if (res.data.success) {
          addToast('Cập nhật sản phẩm bán lẻ thành công', 'success');
          fetchProducts();
        }
      } else {
        const res = await axiosClient.post('/sale-products', payload);
        if (res.data.success) {
          addToast('Thêm sản phẩm bán lẻ mới thành công', 'success');
          fetchProducts();
        }
      }
      setIsModalOpen(false);
    } catch (err: any) {
      addToast(err.message || 'Lỗi lưu thông tin sản phẩm', 'error');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa sản phẩm "${name}" khỏi kho?`)) return;
    try {
      const res = await axiosClient.delete(`/sale-products/${id}`);
      if (res.data.success) {
        addToast('Xóa sản phẩm thành công', 'success');
        fetchProducts();
      }
    } catch (err: any) {
      addToast(err.message || 'Không thể xóa sản phẩm', 'error');
    }
  };

  const handleEditClick = (p: SaleProduct) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      brand: p.brand,
      categoryName: p.category_name,
      salePrice: p.sale_price,
      totalStock: p.total_stock,
      availableStock: p.available_stock,
      description: p.description || ''
    });
    setIsModalOpen(true);
  };

  const handleCreateClick = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      brand: '',
      categoryName: '',
      salePrice: 1500000,
      totalStock: 5,
      availableStock: 5,
      description: ''
    });
    setIsModalOpen(true);
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryFormData.name) {
      addToast('Tên danh mục không được để trống', 'error');
      return;
    }

    const slug = categoryFormData.slug || categoryFormData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const payload = {
      name: categoryFormData.name,
      slug,
      description: categoryFormData.description
    };

    try {
      if (editingCategory) {
        const res = await axiosClient.put(`/categories/${editingCategory.id}`, payload);
        if (res.data.success) {
          addToast('Cập nhật danh mục thành công', 'success');
          await fetchCategories();
          await fetchProducts(); // Refresh products list
        }
      } else {
        const res = await axiosClient.post('/categories', payload);
        if (res.data.success) {
          addToast('Thêm danh mục mới thành công', 'success');
          await fetchCategories();
        }
      }
      setIsCategoryModalOpen(false);
    } catch (err: any) {
      addToast(err.message || 'Lỗi lưu danh mục', 'error');
    }
  };

  const handleCategoryDelete = async (id: string, name: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa danh mục "${name}"?`)) return;
    try {
      const res = await axiosClient.delete(`/categories/${id}`);
      if (res.data.success) {
        addToast('Xóa danh mục thành công', 'success');
        await fetchCategories();
        await fetchProducts();
      }
    } catch (err: any) {
      addToast(err.response?.data?.error || err.message || 'Không thể xóa danh mục', 'error');
    }
  };

  const handleCategoryEditClick = (cat: Category) => {
    setEditingCategory(cat);
    setCategoryFormData({
      name: cat.name,
      slug: cat.slug || '',
      description: cat.description || '',
    });
    setIsCategoryModalOpen(true);
  };

  const handleCategoryCreateClick = () => {
    setEditingCategory(null);
    setCategoryFormData({
      name: '',
      slug: '',
      description: '',
    });
    setIsCategoryModalOpen(true);
  };

  return (
    <div className="py-4 space-y-8 font-medium">
      {/* Header */}
      <div className="border-b border-vintage-sepia-200 pb-4">
        <h1 className="font-serif font-extrabold text-3xl text-vintage-sepia-900 flex items-center gap-2">
          <Package className="text-vintage-gold" /> Kho máy
        </h1>
        <p className="text-sm text-warm-gray-700 mt-1">
          Quản lý tồn kho máy ảnh và phụ kiện mảng bán lẻ.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-vintage-sepia-200 pb-px">
        <button
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-serif text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'products'
              ? 'border-vintage-gold text-vintage-gold bg-vintage-sepia-100/50'
              : 'border-transparent text-warm-gray-700 hover:text-vintage-gold'
          }`}
        >
          <Package size={16} /> Sản phẩm bán lẻ
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-serif text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'categories'
              ? 'border-vintage-gold text-vintage-gold bg-vintage-sepia-100/50'
              : 'border-transparent text-warm-gray-700 hover:text-vintage-gold'
          }`}
        >
          Danh mục sản phẩm
        </button>
      </div>

      {activeTab === 'products' ? (
        <>
          {/* Control Bar */}
          <div className="flex flex-col sm:flex-row gap-4 bg-vintage-sepia-100 p-4 rounded-xl border border-vintage-sepia-200 justify-between items-center text-xs">
            <div className="relative w-full sm:max-w-md">
              <input
                type="text"
                placeholder="Tìm kiếm sản phẩm bán lẻ theo tên, hãng hoặc danh mục..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-vintage-sepia-200 bg-vintage-sepia-50 focus:outline-none focus:border-vintage-gold text-sm text-warm-gray-900"
              />
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
            </div>

            {currentUser?.role === 'ADMIN' && (
              <button
                onClick={handleCreateClick}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-vintage-sepia-900 hover:bg-vintage-gold text-vintage-sepia-50 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                <Plus size={16} /> Thêm sản phẩm bán
              </button>
            )}
          </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12"><Loader2 className="animate-spin h-8 w-8 text-vintage-gold mx-auto" /></div>
      ) : filteredProducts.length === 0 ? (
        <p className="text-center py-8 text-xs text-warm-gray-700 italic">Không tìm thấy sản phẩm nào.</p>
      ) : (
        <div className="bg-vintage-sepia-100 border border-vintage-sepia-200 rounded-xl overflow-hidden shadow-sm text-xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-vintage-sepia-900/10 border-b border-vintage-sepia-200 text-vintage-sepia-900 font-bold uppercase tracking-wider">
                <th className="p-4 w-20">Ảnh</th>
                <th className="p-4">Tên sản phẩm</th>
                <th className="p-4">Danh mục</th>
                <th className="p-4 text-right">Giá bán đứt</th>
                <th className="p-4 text-center">Tồn kho (Sẵn có/Tổng)</th>
                <th className="p-4">Mô tả</th>
                {currentUser?.role === 'ADMIN' && <th className="p-4 text-center w-28">Hành động</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-vintage-sepia-200 font-medium">
              {filteredProducts.map(p => (
                <tr key={p.id} className="hover:bg-vintage-sepia-50/50">
                  <td className="p-4">
                    <img src={p.images[0] || 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=800'} alt={p.name} className="w-12 h-12 object-cover rounded-lg border border-vintage-sepia-200" />
                  </td>
                  <td className="p-4">
                    <span className="font-bold text-sm text-vintage-sepia-900 block">{p.name}</span>
                    <div className="flex gap-1.5 mt-1">
                      <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] bg-warm-gray-200 text-warm-gray-800 font-bold uppercase tracking-wider">{p.brand}</span>
                    </div>
                  </td>
                  <td className="p-4 font-bold text-warm-gray-850">{p.category_name}</td>
                  <td className="p-4 text-right font-mono font-bold text-vintage-gold">{formatVND(p.sale_price)}</td>
                  <td className="p-4 text-center font-bold font-mono">
                    <span className={p.available_stock > 0 ? 'text-green-700' : 'text-film-red'}>
                      {p.available_stock}
                    </span>
                    <span className="text-gray-400"> / {p.total_stock}</span>
                  </td>
                  <td className="p-4 text-warm-gray-650 max-w-xs truncate">{p.description || '-'}</td>
                  {currentUser?.role === 'ADMIN' && (
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEditClick(p)}
                          className="p-2 rounded bg-vintage-gold/10 hover:bg-vintage-gold text-vintage-gold hover:text-vintage-sepia-900 cursor-pointer"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id, p.name)}
                          className="p-2 rounded bg-film-red/10 hover:bg-film-red text-film-red hover:text-white cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  ) : (
        <>
          {/* Categories Control Bar */}
          <div className="flex flex-col sm:flex-row gap-4 bg-vintage-sepia-100 p-4 rounded-xl border border-vintage-sepia-200 justify-between items-center text-xs">
            <div className="text-sm font-bold text-vintage-sepia-900">
              Danh sách danh mục sản phẩm ({categories.length})
            </div>
            {currentUser?.role === 'ADMIN' && (
              <button
                onClick={handleCategoryCreateClick}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-vintage-sepia-900 hover:bg-vintage-gold text-vintage-sepia-50 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                <Plus size={16} /> Thêm danh mục
              </button>
            )}
          </div>

          {/* Categories Table */}
          {categories.length === 0 ? (
            <p className="text-center py-8 text-xs text-warm-gray-700 italic">Không có danh mục nào.</p>
          ) : (
            <div className="bg-vintage-sepia-100 border border-vintage-sepia-200 rounded-xl overflow-hidden shadow-sm text-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-vintage-sepia-900/10 border-b border-vintage-sepia-200 text-vintage-sepia-900 font-bold uppercase tracking-wider">
                    <th className="p-4 w-1/4">Tên danh mục</th>
                    <th className="p-4 w-1/4">Slug</th>
                    <th className="p-4">Mô tả</th>
                    {currentUser?.role === 'ADMIN' && <th className="p-4 text-center w-28">Hành động</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-vintage-sepia-200 font-medium">
                  {categories.map(c => (
                    <tr key={c.id} className="hover:bg-vintage-sepia-50/50">
                      <td className="p-4 font-bold text-vintage-sepia-900">{c.name}</td>
                      <td className="p-4 font-mono">{c.slug}</td>
                      <td className="p-4 text-warm-gray-750">{c.description || '-'}</td>
                      {currentUser?.role === 'ADMIN' && (
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleCategoryEditClick(c)}
                              className="p-2 rounded bg-vintage-gold/10 hover:bg-vintage-gold text-vintage-gold hover:text-vintage-sepia-900 cursor-pointer"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => handleCategoryDelete(c.id, c.name)}
                              className="p-2 rounded bg-film-red/10 hover:bg-film-red text-film-red hover:text-white cursor-pointer"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-vintage-sepia-100 border border-vintage-sepia-200 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-vintage-sepia-200 flex items-center justify-between">
              <h3 className="font-serif font-bold text-lg text-vintage-sepia-900">
                {editingProduct ? 'Chỉnh sửa sản phẩm bán lẻ' : 'Thêm sản phẩm bán lẻ mới'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-lg hover:bg-vintage-sepia-200"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div>
                <label className="block font-bold text-warm-gray-700 mb-1">Tên sản phẩm *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Kodak Gold 200, Canon QL17 GIII..."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-warm-gray-700 mb-1">Hãng sản xuất *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Kodak, Canon, Leica..."
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-warm-gray-700 mb-1">Tên danh mục *</label>
                  <select
                    required
                    value={formData.categoryName}
                    onChange={(e) => setFormData({ ...formData, categoryName: e.target.value })}
                    className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg focus:outline-none"
                  >
                    <option value="">-- Chọn danh mục --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-warm-gray-700 mb-1">Giá bán đứt (₫) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.salePrice}
                    onChange={(e) => setFormData({ ...formData, salePrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg focus:outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-warm-gray-700 mb-1">Tổng tồn kho *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.totalStock}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setFormData({ 
                        ...formData, 
                        totalStock: val,
                        availableStock: editingProduct ? formData.availableStock : val 
                      });
                    }}
                    className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-warm-gray-700 mb-1">Tồn khả dụng *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    max={formData.totalStock}
                    value={formData.availableStock}
                    onChange={(e) => setFormData({ ...formData, availableStock: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg focus:outline-none font-mono font-bold text-green-700"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-warm-gray-700 mb-1">Mô tả sản phẩm</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-vintage-sepia-200 flex justify-end gap-3 font-bold">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-vintage-sepia-200 hover:bg-vintage-sepia-200 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-vintage-sepia-900 text-vintage-sepia-50 hover:bg-vintage-gold cursor-pointer"
                >
                  Lưu sản phẩm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Modal (Inline) */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-vintage-sepia-100 border border-vintage-sepia-200 rounded-xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
            <div className="p-5 border-b border-vintage-sepia-200 flex items-center justify-between">
              <h3 className="font-serif font-bold text-lg text-vintage-sepia-900 font-medium">
                {editingCategory ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới'}
              </h3>
              <button onClick={() => setIsCategoryModalOpen(false)} className="p-1 rounded-lg hover:bg-vintage-sepia-200"><X size={18} /></button>
            </div>
            <form onSubmit={handleCategorySubmit} className="p-6 space-y-4 text-xs font-bold text-warm-gray-700">
              <div>
                <label className="block mb-1">Tên danh mục *</label>
                <input
                  type="text"
                  required
                  placeholder="Máy ảnh SLR, Ống kính vintage..."
                  value={categoryFormData.name}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg text-warm-gray-900 focus:outline-none"
                />
              </div>
              <div>
                <label className="block mb-1">Slug (Đường dẫn định danh - để trống tự tạo)</label>
                <input
                  type="text"
                  placeholder="slr-cameras"
                  value={categoryFormData.slug}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, slug: e.target.value })}
                  className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg text-warm-gray-900 focus:outline-none font-mono"
                />
              </div>
              <div>
                <label className="block mb-1">Mô tả ngắn</label>
                <textarea
                  rows={3}
                  value={categoryFormData.description}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg text-warm-gray-900 focus:outline-none font-medium"
                />
              </div>
              <div className="pt-4 border-t border-vintage-sepia-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-vintage-sepia-200 hover:bg-vintage-sepia-200 font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-vintage-sepia-900 text-vintage-sepia-50 font-bold hover:bg-vintage-gold cursor-pointer"
                >
                  Lưu danh mục
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default SaleInventory;
