import React, { useState, useEffect } from 'react';
import { axiosClient } from '../../api/axiosClient.js';
import { useUIStore } from '../../store/uiStore.js';
import { useAuthStore } from '../../store/authStore.js';
import { formatVND } from '../../utils/currency';
import { 
  Plus, Edit2, Trash2, Search, X, Loader2, Package, 
  Layers, Camera, BarChart2, Users, Key, ShieldAlert,
  Calendar, ShoppingBag, ChevronLeft, ChevronRight, RefreshCw
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  slug: string;
  brand: string;
  salePrice: number;
  rentalPricePerDay: number;
  images: string[];
  availableStock: number;
  totalStock: number;
  description?: string;
  specs?: Record<string, string>;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

interface CameraModel {
  id: string;
  model_name: string;
  slug: string;
  brand: string;
  rent_price_per_day: number;
  category_id: string;
  images: string[];
  description?: string;
  specs?: Record<string, string>;
  availableStock?: number;
  totalStock?: number;
}

interface StaffUser {
  id: string;
  email: string;
  fullName: string;
  role: 'ADMIN' | 'MANAGER' | 'STAFF';
  isActive: boolean;
  phone?: string;
  createdAt: string;
}

export const ManagerDashboard: React.FC = () => {
  const { user: currentUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'models' | 'reports' | 'staff'>('products');
  const { addToast } = useUIStore();

  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // ----------------------------------------------------
  // DATA STATE
  // ----------------------------------------------------
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cameraModels, setCameraModels] = useState<CameraModel[]>([]);
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);

  // Reports state
  const [topRentals, setTopRentals] = useState<any[]>([]);
  const [equipmentStatus, setEquipmentStatus] = useState<any>({ totalEquipments: 0, breakdown: [] });
  const [dailyHistory, setDailyHistory] = useState<any[]>([]);
  // Calendar states (default to June 2026 to see mock data)
  const [currentMonth, setCurrentMonth] = useState<number>(5); // 0-11
  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [selectedDate, setSelectedDate] = useState<string>('2026-06-06');

  // ----------------------------------------------------
  // MODALS STATE
  // ----------------------------------------------------
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productFormData, setProductFormData] = useState({
    name: '',
    brand: '',
    salePrice: 0,
    images: '',
    totalStock: 1,
    description: '',
    specUrl: '',
  });

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    slug: '',
    description: '',
  });

  const [isModelModalOpen, setIsModelModalOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<CameraModel | null>(null);
  const [modelFormData, setModelFormData] = useState({
    model_name: '',
    brand: '',
    rent_price_per_day: 0,
    category_id: '',
    images: '',
    description: '',
    specUrl: '',
  });

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordTargetUser, setPasswordTargetUser] = useState<StaffUser | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [staffFormData, setStaffFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    phone: '',
    role: 'STAFF' as 'ADMIN' | 'MANAGER' | 'STAFF'
  });

  // ----------------------------------------------------
  // API ACTIONS
  // ----------------------------------------------------

  // Fetch Products
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get('/products');
      if (res.data.success) {
        // Response format may have { products, totalCount } or array
        const list = res.data.data.products || res.data.data || [];
        setProducts(list);
      }
    } catch (err: any) {
      addToast(err.message || 'Lỗi khi tải danh sách sản phẩm', 'error');
      setProducts([
        {
          id: 'd4444444-4444-4444-4444-444444444444',
          name: 'Canon AE-1 Program (Mua đứt)',
          slug: 'canon-ae1-program-buy',
          brand: 'Canon',
          salePrice: 6250000,
          rentalPricePerDay: 0,
          images: ['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=800'],
          availableStock: 5,
          totalStock: 5,
          description: 'Máy ảnh cơ SLR danh tiếng của Canon.'
        },
        {
          id: 'e5555555-5555-5555-5555-555555555555',
          name: 'Nikon FM2 (Mua đứt)',
          slug: 'nikon-fm2-buy',
          brand: 'Nikon',
          salePrice: 9750000,
          rentalPricePerDay: 0,
          images: ['https://images.unsplash.com/photo-1508921912186-1d1a45ebb3c1?auto=format&fit=crop&q=80&w=800'],
          availableStock: 3,
          totalStock: 3,
          description: 'Chiến thần cơ học cơ khí 100%.'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Categories
  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get('/categories');
      if (res.data.success) {
        setCategories(res.data.data || []);
      }
    } catch (err: any) {
      addToast(err.message || 'Lỗi khi tải danh mục', 'error');
      setCategories([
        { id: 'a1111111-1111-1111-1111-111111111111', name: 'Máy ảnh SLR (Cơ học)', slug: 'slr-cameras', description: 'Máy ảnh cơ SLR phản xạ ống kính đơn' },
        { id: 'b2222222-2222-2222-2222-222222222222', name: 'Máy ảnh Rangefinder (Trắc cự)', slug: 'rangefinder-cameras', description: 'Máy ảnh cơ Rangefinder nhỏ gọn' },
        { id: 'c3333333-3333-3333-3333-333333333333', name: 'Máy ảnh Medium Format', slug: 'medium-format', description: 'Máy ảnh cơ Medium Format chuyên nghiệp' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Camera Models
  const fetchCameraModels = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get('/camera-models');
      if (res.data.success) {
        setCameraModels(res.data.data || []);
      }
    } catch (err: any) {
      addToast(err.message || 'Lỗi khi tải danh sách mẫu máy cho thuê', 'error');
      setCameraModels([
        {
          id: 'd4444444-4444-4444-4444-44444444444a',
          model_name: 'Canon AE-1 Program (Thuê)',
          slug: 'canon-ae1-program-rent',
          brand: 'Canon',
          rent_price_per_day: 375000,
          category_id: 'a1111111-1111-1111-1111-111111111111',
          images: ['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=800'],
          description: 'Huyền thoại cơ học cho thuê.',
          availableStock: 2,
          totalStock: 2
        },
        {
          id: 'f6666666-6666-6666-6666-666666666666',
          model_name: 'Leica M6 Classic (Thuê)',
          slug: 'leica-m6-classic-rent',
          brand: 'Leica',
          rent_price_per_day: 1875000,
          category_id: 'b2222222-2222-2222-2222-222222222222',
          images: ['https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&q=80&w=800'],
          description: 'Tuyệt tác của Đức.',
          availableStock: 1,
          totalStock: 1
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Staff Users (Admin & Manager only)
  const fetchStaffUsers = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get('/auth/users');
      if (res.data.success) {
        setStaffUsers(res.data.data || []);
      }
    } catch (err: any) {
      addToast(err.message || 'Lỗi khi tải danh sách nhân sự', 'error');
      setStaffUsers([
        { id: 's111', email: 'admin@camera.com', fullName: 'Admin Developer', role: 'ADMIN', isActive: true, phone: '0901234567', createdAt: '2026-01-01' },
        { id: 's222', email: 'staff1@thefilmery.com', fullName: 'Nguyễn Văn Staff', role: 'STAFF', isActive: true, phone: '090111222', createdAt: '2026-01-01' },
        { id: 's333', email: 'manager1@thefilmery.com', fullName: 'Trần Thị Manager', role: 'MANAGER', isActive: true, phone: '090333444', createdAt: '2026-01-01' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Analytics reports
  const fetchReports = async () => {
    setLoading(true);
    try {
      const topRes = await axiosClient.get('/reports/top-rentals?limit=5');
      if (topRes.data.success) {
        setTopRentals(topRes.data.data || []);
      }

      const statusRes = await axiosClient.get('/reports/equipment-status');
      if (statusRes.data.success) {
        setEquipmentStatus(statusRes.data.data || { totalEquipments: 0, breakdown: [] });
      }

      const dailyRes = await axiosClient.get('/reports/daily-history');
      if (dailyRes.data.success) {
        setDailyHistory(dailyRes.data.data || []);
      }
    } catch (err: any) {
      addToast(err.message || 'Lỗi khi tải thống kê báo cáo', 'error');
      setTopRentals([
        { id: 'model-ae1', modelName: 'Canon AE-1 Program (Thuê)', brand: 'Canon', rentalCount: 28 },
        { id: 'model-m6', modelName: 'Leica M6 Classic (Thuê)', brand: 'Leica', rentalCount: 15 },
        { id: 'model-500cm', modelName: 'Hasselblad 500C/M (Thuê)', brand: 'Hasselblad', rentalCount: 8 }
      ]);
      setEquipmentStatus({
        totalEquipments: 8,
        breakdown: [
          { status: 'AVAILABLE', count: 4, percentage: 50 },
          { status: 'RENTED', count: 2, percentage: 25 },
          { status: 'MAINTENANCE', count: 1, percentage: 12.5 },
          { status: 'DAMAGED', count: 1, percentage: 12.5 }
        ]
      });
      setDailyHistory([
        {
          date: '2026-06-06',
          itemsCount: 2,
          items: [
            {
              id: 'mock-sale-1',
              type: 'SALE',
              customerName: 'Nguyễn Văn Anh',
              productName: 'Canon AE-1 Program (Mua đứt)',
              quantity: 1,
              amount: 6250000,
              status: 'COMPLETED',
              dateInfo: 'Bán đứt ngày 2026-06-06'
            },
            {
              id: 'mock-rental-1',
              type: 'RENTAL',
              customerName: 'Lê Hoàng Bách',
              productName: 'Leica M6 Classic (Thuê)',
              quantity: 1,
              amount: 1875000,
              status: 'CHECKED_IN',
              dateInfo: 'Thuê từ 2026-06-05 đến Chưa trả'
            }
          ]
        },
        {
          date: '2026-06-05',
          itemsCount: 1,
          items: [
            {
              id: 'mock-rental-1-day2',
              type: 'RENTAL',
              customerName: 'Lê Hoàng Bách',
              productName: 'Leica M6 Classic (Thuê)',
              quantity: 1,
              amount: 1875000,
              status: 'CHECKED_IN',
              dateInfo: 'Thuê từ 2026-06-05 đến Chưa trả'
            }
          ]
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Trigger loads based on active tab
  useEffect(() => {
    setSearchTerm('');
    if (activeTab === 'products') fetchProducts();
    if (activeTab === 'categories') fetchCategories();
    if (activeTab === 'models') {
      fetchCameraModels();
      fetchCategories();
    }
    if (activeTab === 'reports') fetchReports();
    if (activeTab === 'staff') fetchStaffUsers();
  }, [activeTab]);

  // ----------------------------------------------------
  // PRODUCT FORM SUBMIT
  // ----------------------------------------------------
  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productFormData.name || !productFormData.brand || !productFormData.specUrl) {
      addToast('Vui lòng nhập đầy đủ tên, hãng và URL thông số kỹ thuật', 'error');
      return;
    }

    const payload = {
      name: productFormData.name,
      slug: productFormData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
      brand: productFormData.brand,
      salePrice: Number(productFormData.salePrice),
      images: [productFormData.images || 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=800'],
      totalStock: Number(productFormData.totalStock),
      description: productFormData.description,
      specs: { spec_url: productFormData.specUrl }
    };

    try {
      if (editingProduct) {
        const res = await axiosClient.put(`/products/${editingProduct.id}`, payload);
        if (res.data.success) {
          addToast('Cập nhật sản phẩm thành công', 'success');
          fetchProducts();
        }
      } else {
        const res = await axiosClient.post('/products', payload);
        if (res.data.success) {
          addToast('Thêm sản phẩm mới thành công', 'success');
          fetchProducts();
        }
      }
      setIsProductModalOpen(false);
    } catch (err: any) {
      addToast(err.message || 'Lỗi lưu thông tin sản phẩm', 'error');
    }
  };

  const handleProductDelete = async (id: string, name: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa sản phẩm bán lẻ "${name}"?`)) return;
    try {
      const res = await axiosClient.delete(`/products/${id}`);
      if (res.data.success) {
        addToast('Xóa sản phẩm thành công', 'success');
        fetchProducts();
      }
    } catch (err: any) {
      addToast(err.message || 'Không thể xóa sản phẩm', 'error');
    }
  };

  // ----------------------------------------------------
  // CATEGORY FORM SUBMIT
  // ----------------------------------------------------
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
          fetchCategories();
        }
      } else {
        const res = await axiosClient.post('/categories', payload);
        if (res.data.success) {
          addToast('Thêm danh mục mới thành công', 'success');
          fetchCategories();
        }
      }
      setIsCategoryModalOpen(false);
    } catch (err: any) {
      addToast(err.message || 'Lỗi thao tác danh mục', 'error');
    }
  };

  const handleCategoryDelete = async (id: string, name: string) => {
    if (!window.confirm(`Xóa danh mục "${name}"? Thao tác này sẽ thất bại nếu danh mục có sản phẩm liên kết.`)) return;
    try {
      const res = await axiosClient.delete(`/categories/${id}`);
      if (res.data.success) {
        addToast('Xóa danh mục thành công', 'success');
        fetchCategories();
      }
    } catch (err: any) {
      addToast(err.message || 'Lỗi: Danh mục đang được sử dụng hoặc không tồn tại', 'error');
    }
  };

  // ----------------------------------------------------
  // CAMERA MODEL FORM SUBMIT
  // ----------------------------------------------------
  const handleModelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modelFormData.model_name || !modelFormData.brand || !modelFormData.category_id) {
      addToast('Vui lòng điền đầy đủ các trường bắt buộc (*)', 'error');
      return;
    }

    const payload = {
      model_name: modelFormData.model_name,
      slug: modelFormData.model_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
      brand: modelFormData.brand,
      rent_price_per_day: Number(modelFormData.rent_price_per_day),
      category_id: modelFormData.category_id,
      images: [modelFormData.images || 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=800'],
      description: modelFormData.description,
      specs: { spec_url: modelFormData.specUrl }
    };

    try {
      if (editingModel) {
        const res = await axiosClient.put(`/camera-models/${editingModel.id}`, payload);
        if (res.data.success) {
          addToast('Cập nhật mẫu máy ảnh thuê thành công', 'success');
          fetchCameraModels();
        }
      } else {
        const res = await axiosClient.post('/camera-models', payload);
        if (res.data.success) {
          addToast('Thêm mẫu máy ảnh thuê thành công', 'success');
          fetchCameraModels();
        }
      }
      setIsModelModalOpen(false);
    } catch (err: any) {
      addToast(err.message || 'Lỗi lưu thông tin mẫu máy', 'error');
    }
  };

  const handleModelDelete = async (id: string, name: string) => {
    if (!window.confirm(`Xóa mẫu máy ảnh cho thuê "${name}"? Chỉ khả dụng nếu không có máy vật lý serial liên kết.`)) return;
    try {
      const res = await axiosClient.delete(`/camera-models/${id}`);
      if (res.data.success) {
        addToast('Xóa mẫu máy ảnh thành công', 'success');
        fetchCameraModels();
      }
    } catch (err: any) {
      addToast(err.message || 'Không thể xóa mẫu máy (hạn chế phân quyền hoặc có thiết bị liên kết)', 'error');
    }
  };

  // ----------------------------------------------------
  // STAFF MANAGEMENT ACTIONS
  // ----------------------------------------------------
  const handleToggleUserStatus = async (staff: StaffUser) => {
    const nextStatus = !staff.isActive;
    if (!window.confirm(`Bạn có chắc chắn muốn ${nextStatus ? 'kích hoạt lại' : 'vô hiệu hóa'} tài khoản của ${staff.fullName}?`)) return;
    try {
      const res = await axiosClient.put(`/auth/users/${staff.id}/status`, { isActive: nextStatus });
      if (res.data.success) {
        addToast(`Đã thay đổi trạng thái tài khoản thành công`, 'success');
        fetchStaffUsers();
      }
    } catch (err: any) {
      addToast(err.message || 'Lỗi thay đổi trạng thái tài khoản', 'error');
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordTargetUser || newPassword.length < 6) {
      addToast('Mật khẩu mới phải có ít nhất 6 ký tự', 'error');
      return;
    }
    try {
      const res = await axiosClient.post(`/auth/users/${passwordTargetUser.id}/reset-password`, { newPassword });
      if (res.data.success) {
        addToast(`Đặt lại mật khẩu cho ${passwordTargetUser.fullName} thành công!`, 'success');
        setIsPasswordModalOpen(false);
      }
    } catch (err: any) {
      addToast(err.message || 'Không thể đặt lại mật khẩu', 'error');
    }
  };

  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffFormData.email || !staffFormData.password || !staffFormData.fullName) {
      addToast('Vui lòng nhập đầy đủ các trường bắt buộc', 'error');
      return;
    }
    try {
      const res = await axiosClient.post('/auth/register', staffFormData);
      if (res.data.success) {
        addToast('Tạo tài khoản nhân sự thành công', 'success');
        setIsStaffModalOpen(false);
        fetchStaffUsers();
      }
    } catch (err: any) {
      addToast(err.message || 'Lỗi đăng ký tài khoản nhân sự', 'error');
    }
  };

  // ----------------------------------------------------
  // FILTER UTILITIES
  // ----------------------------------------------------
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.brand.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredModels = cameraModels.filter(m => 
    m.model_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.brand.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredStaff = staffUsers.filter(s => 
    s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="py-4 space-y-8 font-medium">
      {/* Top Banner Header */}
      <div className="border-b border-vintage-sepia-200 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif font-extrabold text-3xl text-vintage-sepia-900 flex items-center gap-2">
            <Package className="text-vintage-gold" /> Bảng Điều Khiển Quản Lý
          </h1>
          <p className="text-sm text-warm-gray-700 mt-1">
            Quản trị kho hàng bán/thuê, danh mục sản phẩm, theo dõi báo cáo doanh thu và thiết lập tài khoản nhân viên.
          </p>
        </div>
      </div>

      {/* Elegant Vintage Tab Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-vintage-sepia-200 pb-px">
        <button
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-serif text-sm font-bold tracking-tight transition-all cursor-pointer ${
            activeTab === 'products'
              ? 'border-vintage-gold text-vintage-gold bg-vintage-sepia-100/50'
              : 'border-transparent text-warm-gray-700 hover:text-vintage-gold'
          }`}
        >
          <Package size={16} /> Sản phẩm bán
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-serif text-sm font-bold tracking-tight transition-all cursor-pointer ${
            activeTab === 'categories'
              ? 'border-vintage-gold text-vintage-gold bg-vintage-sepia-100/50'
              : 'border-transparent text-warm-gray-700 hover:text-vintage-gold'
          }`}
        >
          <Layers size={16} /> Danh mục
        </button>
        <button
          onClick={() => setActiveTab('models')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-serif text-sm font-bold tracking-tight transition-all cursor-pointer ${
            activeTab === 'models'
              ? 'border-vintage-gold text-vintage-gold bg-vintage-sepia-100/50'
              : 'border-transparent text-warm-gray-700 hover:text-vintage-gold'
          }`}
        >
          <Camera size={16} /> Mẫu máy thuê
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-serif text-sm font-bold tracking-tight transition-all cursor-pointer ${
            activeTab === 'reports'
              ? 'border-vintage-gold text-vintage-gold bg-vintage-sepia-100/50'
              : 'border-transparent text-warm-gray-700 hover:text-vintage-gold'
          }`}
        >
          <BarChart2 size={16} /> Lịch sử đơn hàng
        </button>
        <button
          onClick={() => setActiveTab('staff')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-serif text-sm font-bold tracking-tight transition-all cursor-pointer ${
            activeTab === 'staff'
              ? 'border-vintage-gold text-vintage-gold bg-vintage-sepia-100/50'
              : 'border-transparent text-warm-gray-700 hover:text-vintage-gold'
          }`}
        >
          <Users size={16} /> Quản trị nhân viên
        </button>
      </div>

      {/* Control Actions & Search Bar */}
      {activeTab !== 'reports' && (
        <div className="flex flex-col sm:flex-row gap-4 bg-vintage-sepia-100 p-4 rounded-xl border border-vintage-sepia-200 justify-between items-center">
          <div className="relative w-full sm:max-w-md">
            <input
              type="text"
              placeholder={`Tìm kiếm trong ${
                activeTab === 'products' ? 'sản phẩm...' :
                activeTab === 'categories' ? 'danh mục...' :
                activeTab === 'models' ? 'mẫu máy ảnh...' : 'nhân viên...'
              }`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-vintage-sepia-200 bg-vintage-sepia-50 focus:outline-none focus:border-vintage-gold text-sm text-warm-gray-900"
            />
            <Search className="absolute left-3 top-3 h-4.5 w-4.5 text-gray-400" />
          </div>

          {activeTab === 'products' && (
            <button
              onClick={() => {
                setEditingProduct(null);
                setProductFormData({
                  name: '',
                  brand: '',
                  salePrice: 2500000,
                  images: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=800',
                  totalStock: 5,
                  description: '',
                  specUrl: '',
                });
                setIsProductModalOpen(true);
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-vintage-sepia-900 hover:bg-vintage-gold text-vintage-sepia-50 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              <Plus size={16} /> Thêm sản phẩm
            </button>
          )}

          {activeTab === 'categories' && (
            <button
              onClick={() => {
                setEditingCategory(null);
                setCategoryFormData({ name: '', slug: '', description: '' });
                setIsCategoryModalOpen(true);
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-vintage-sepia-900 hover:bg-vintage-gold text-vintage-sepia-50 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              <Plus size={16} /> Thêm danh mục
            </button>
          )}

          {activeTab === 'models' && (
            <button
              onClick={() => {
                setEditingModel(null);
                setModelFormData({
                  model_name: '',
                  brand: '',
                  rent_price_per_day: 150000,
                  category_id: categories[0]?.id || '',
                  images: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=800',
                  description: '',
                  specUrl: '',
                });
                setIsModelModalOpen(true);
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-vintage-sepia-900 hover:bg-vintage-gold text-vintage-sepia-50 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              <Plus size={16} /> Thêm mẫu máy
            </button>
          )}

          {activeTab === 'staff' && currentUser?.role === 'ADMIN' && (
            <button
              onClick={() => {
                setStaffFormData({
                  email: '',
                  password: '',
                  fullName: '',
                  phone: '',
                  role: 'STAFF'
                });
                setIsStaffModalOpen(true);
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-vintage-sepia-900 hover:bg-vintage-gold text-vintage-sepia-50 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              <Plus size={16} /> Thêm nhân sự
            </button>
          )}
        </div>
      )}

      {/* ----------------------------------------------------
          TAB 1: PRODUCTS TABLE
      ---------------------------------------------------- */}
      {activeTab === 'products' && (
        loading ? (
          <div className="text-center py-12"><Loader2 className="animate-spin h-8 w-8 text-vintage-gold mx-auto" /></div>
        ) : filteredProducts.length === 0 ? (
          <p className="text-center py-8 text-xs text-warm-gray-700 italic">Không tìm thấy sản phẩm nào.</p>
        ) : (
          <div className="bg-vintage-sepia-100 border border-vintage-sepia-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-vintage-sepia-900/10 border-b border-vintage-sepia-200 text-vintage-sepia-900 font-bold uppercase tracking-wider">
                  <th className="p-4 w-20">Ảnh</th>
                  <th className="p-4">Tên sản phẩm</th>
                  <th className="p-4">Giá bán đứt</th>
                  <th className="p-4 text-center">Tồn kho</th>
                  <th className="p-4">Mô tả</th>
                  <th className="p-4 text-center w-28">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-vintage-sepia-200">
                {filteredProducts.map(p => (
                  <tr key={p.id} className="hover:bg-vintage-sepia-50/50">
                    <td className="p-4">
                      <img src={p.images[0]} alt={p.name} className="w-12 h-12 object-cover rounded-lg border border-vintage-sepia-200" />
                    </td>
                    <td className="p-4">
                      <span className="font-bold text-sm text-vintage-sepia-900 block">{p.name}</span>
                      <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] bg-vintage-gold/15 text-vintage-gold font-bold uppercase tracking-wider mt-1">{p.brand}</span>
                    </td>
                    <td className="p-4 font-bold text-warm-gray-900">{formatVND(p.salePrice)}</td>
                    <td className="p-4 text-center font-bold">{p.totalStock} sản phẩm</td>
                    <td className="p-4 text-warm-gray-700 max-w-xs truncate">{p.description || 'Chưa có mô tả.'}</td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setEditingProduct(p);
                            setProductFormData({
                              name: p.name,
                              brand: p.brand,
                              salePrice: p.salePrice,
                              images: p.images[0] || '',
                              totalStock: p.totalStock,
                              description: p.description || '',
                              specUrl: p.specs?.spec_url || '',
                            });
                            setIsProductModalOpen(true);
                          }}
                          className="p-2 rounded bg-vintage-gold/10 hover:bg-vintage-gold text-vintage-gold hover:text-vintage-sepia-900 cursor-pointer"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleProductDelete(p.id, p.name)}
                          className="p-2 rounded bg-film-red/10 hover:bg-film-red text-film-red hover:text-white cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ----------------------------------------------------
          TAB 2: CATEGORIES TABLE
      ---------------------------------------------------- */}
      {activeTab === 'categories' && (
        loading ? (
          <div className="text-center py-12"><Loader2 className="animate-spin h-8 w-8 text-vintage-gold mx-auto" /></div>
        ) : filteredCategories.length === 0 ? (
          <p className="text-center py-8 text-xs text-warm-gray-700 italic">Không tìm thấy danh mục nào.</p>
        ) : (
          <div className="bg-vintage-sepia-100 border border-vintage-sepia-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-vintage-sepia-900/10 border-b border-vintage-sepia-200 text-vintage-sepia-900 font-bold uppercase tracking-wider">
                  <th className="p-4">Tên danh mục</th>
                  <th className="p-4">Đường dẫn định danh (Slug)</th>
                  <th className="p-4">Mô tả danh mục</th>
                  <th className="p-4 text-center w-28">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-vintage-sepia-200">
                {filteredCategories.map(c => (
                  <tr key={c.id} className="hover:bg-vintage-sepia-50/50">
                    <td className="p-4 font-bold text-sm text-vintage-sepia-900">{c.name}</td>
                    <td className="p-4 font-mono text-warm-gray-700">{c.slug}</td>
                    <td className="p-4 text-warm-gray-700 max-w-sm truncate">{c.description || 'Chưa có mô tả.'}</td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setEditingCategory(c);
                            setCategoryFormData({
                              name: c.name,
                              slug: c.slug,
                              description: c.description || '',
                            });
                            setIsCategoryModalOpen(true);
                          }}
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ----------------------------------------------------
          TAB 3: CAMERA MODELS TABLE
      ---------------------------------------------------- */}
      {activeTab === 'models' && (
        loading ? (
          <div className="text-center py-12"><Loader2 className="animate-spin h-8 w-8 text-vintage-gold mx-auto" /></div>
        ) : filteredModels.length === 0 ? (
          <p className="text-center py-8 text-xs text-warm-gray-700 italic">Không tìm thấy mẫu máy ảnh nào.</p>
        ) : (
          <div className="bg-vintage-sepia-100 border border-vintage-sepia-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-vintage-sepia-900/10 border-b border-vintage-sepia-200 text-vintage-sepia-900 font-bold uppercase tracking-wider">
                  <th className="p-4 w-20">Ảnh</th>
                  <th className="p-4">Tên mẫu máy &amp; Hãng</th>
                  <th className="p-4">Giá thuê / ngày</th>
                  <th className="p-4 text-center">Tồn kho thiết bị</th>
                  <th className="p-4">Mô tả</th>
                  <th className="p-4 text-center w-28">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-vintage-sepia-200">
                {filteredModels.map(m => (
                  <tr key={m.id} className="hover:bg-vintage-sepia-50/50">
                    <td className="p-4">
                      <img src={m.images[0]} alt={m.model_name} className="w-12 h-12 object-cover rounded-lg border border-vintage-sepia-200" />
                    </td>
                    <td className="p-4">
                      <span className="font-bold text-sm text-vintage-sepia-900 block">{m.model_name}</span>
                      <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] bg-vintage-gold/15 text-vintage-gold font-bold uppercase tracking-wider mt-1">{m.brand}</span>
                    </td>
                    <td className="p-4 font-bold text-vintage-gold">{formatVND(m.rent_price_per_day)}</td>
                    <td className="p-4 text-center">
                      <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-muted-green-150 text-muted-green-800">
                        Sẵn sàng: {m.availableStock ?? 0} / Tổng: {m.totalStock ?? 0}
                      </span>
                    </td>
                    <td className="p-4 text-warm-gray-700 max-w-xs truncate">{m.description || 'Chưa có mô tả.'}</td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setEditingModel(m);
                            setModelFormData({
                              model_name: m.model_name,
                              brand: m.brand,
                              rent_price_per_day: m.rent_price_per_day,
                              category_id: m.category_id || '',
                              images: m.images[0] || '',
                              description: m.description || '',
                              specUrl: m.specs?.spec_url || '',
                            });
                            setIsModelModalOpen(true);
                          }}
                          className="p-2 rounded bg-vintage-gold/10 hover:bg-vintage-gold text-vintage-gold hover:text-vintage-sepia-900 cursor-pointer"
                        >
                          <Edit2 size={13} />
                        </button>
                        {currentUser?.role === 'ADMIN' && (
                          <button
                            onClick={() => handleModelDelete(m.id, m.model_name)}
                            className="p-2 rounded bg-film-red/10 hover:bg-film-red text-film-red hover:text-white cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ----------------------------------------------------
          TAB 4: REPORTS & ANALYTICS
      ---------------------------------------------------- */}
      {activeTab === 'reports' && (
        <div className="space-y-8 animate-fade-in">
          {/* Calendar Widget and order list details layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Calendar & Order Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Calendar Card */}
              <div className="bg-white p-6 rounded-xl border border-vintage-sepia-200 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-vintage-sepia-150 pb-3">
                  <h3 className="font-serif font-bold text-lg text-vintage-sepia-900 flex items-center gap-2">
                    <Calendar size={18} className="text-vintage-gold" />
                    Lịch duyệt đơn hàng
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (currentMonth === 0) {
                          setCurrentMonth(11);
                          setCurrentYear(prev => prev - 1);
                        } else {
                          setCurrentMonth(prev => prev - 1);
                        }
                      }}
                      className="p-1.5 rounded-lg border border-vintage-sepia-200 hover:bg-vintage-sepia-100 transition-colors cursor-pointer"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="font-serif font-bold text-sm text-vintage-sepia-950 px-2 min-w-[120px] text-center">
                      {[
                        'Tháng Một', 'Tháng Hai', 'Tháng Ba', 'Tháng Tư', 'Tháng Năm', 'Tháng Sáu',
                        'Tháng Bảy', 'Tháng Tám', 'Tháng Chín', 'Tháng Mười', 'Tháng Mười Một', 'Tháng Mười Hai'
                      ][currentMonth]}, {currentYear}
                    </span>
                    <button
                      onClick={() => {
                        if (currentMonth === 11) {
                          setCurrentMonth(0);
                          setCurrentYear(prev => prev + 1);
                        } else {
                          setCurrentMonth(prev => prev + 1);
                        }
                      }}
                      className="p-1.5 rounded-lg border border-vintage-sepia-200 hover:bg-vintage-sepia-100 transition-colors cursor-pointer"
                    >
                      <ChevronRight size={16} />
                    </button>
                    <button
                      onClick={fetchReports}
                      className="ml-2 p-1.5 rounded-lg border border-vintage-sepia-200 hover:bg-vintage-gold hover:text-vintage-sepia-900 transition-colors cursor-pointer"
                      title="Làm mới dữ liệu"
                    >
                      <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                    </button>
                  </div>
                </div>

                {/* Weekdays header */}
                <div className="grid grid-cols-7 gap-1 text-center font-bold text-[11px] text-warm-gray-700 py-1 bg-vintage-sepia-50/50 rounded-lg border border-vintage-sepia-100">
                  {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(day => (
                    <div key={day} className="py-1">{day}</div>
                  ))}
                </div>

                {/* Days grid */}
                <div className="grid grid-cols-7 gap-1">
                  {(() => {
                    const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
                    const getFirstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();

                    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
                    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
                    const prevMonthDays = getDaysInMonth(currentYear, currentMonth - 1);

                    const cells: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

                    for (let i = firstDay - 1; i >= 0; i--) {
                      const d = prevMonthDays - i;
                      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
                      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
                      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                      cells.push({ dateStr, dayNum: d, isCurrentMonth: false });
                    }

                    for (let d = 1; d <= daysInMonth; d++) {
                      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                      cells.push({ dateStr, dayNum: d, isCurrentMonth: true });
                    }

                    const totalCells = cells.length;
                    const nextMonthPadding = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
                    for (let d = 1; d <= nextMonthPadding; d++) {
                      const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
                      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
                      const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                      cells.push({ dateStr, dayNum: d, isCurrentMonth: false });
                    }

                    return cells.map((cell, idx) => {
                      const isSelected = cell.dateStr === selectedDate;
                      const dayRecord = dailyHistory.find(d => d.date === cell.dateStr);
                      const count = dayRecord ? dayRecord.itemsCount : 0;

                      return (
                        <div
                          key={`${cell.dateStr}-${idx}`}
                          onClick={() => cell.isCurrentMonth && setSelectedDate(cell.dateStr)}
                          className={`relative min-h-[60px] p-2 border rounded-lg transition-all flex flex-col justify-between select-none ${
                            !cell.isCurrentMonth
                              ? 'bg-vintage-sepia-50/10 border-vintage-sepia-100/50 text-warm-gray-300 cursor-not-allowed opacity-30 animate-pulse-none'
                              : isSelected
                                ? 'bg-vintage-sepia-900 border-vintage-sepia-900 text-vintage-gold font-bold shadow-md shadow-vintage-sepia-950/20 cursor-pointer'
                                : 'bg-white border-vintage-sepia-150 hover:border-vintage-gold hover:bg-vintage-sepia-50/40 text-vintage-sepia-900 cursor-pointer'
                          }`}
                        >
                          <span className="text-xs font-semibold">{cell.dayNum}</span>
                          
                          {count > 0 && cell.isCurrentMonth && (
                            <span className={`self-end text-[9px] font-extrabold px-1 py-0.5 rounded leading-none ${
                              isSelected
                                ? 'bg-vintage-gold text-vintage-sepia-950'
                                : 'bg-vintage-gold/20 text-vintage-gold'
                            }`}>
                              {count} đơn
                            </span>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Details Table */}
              <div className="bg-white p-6 rounded-xl border border-vintage-sepia-200 shadow-sm space-y-4">
                {(() => {
                  const selectedDayData = dailyHistory.find(d => d.date === selectedDate);
                  return (
                    <>
                      <div className="flex justify-between items-center border-b border-vintage-sepia-150 pb-3">
                        <h4 className="font-serif font-bold text-base text-vintage-sepia-900 flex items-center gap-2">
                          <ShoppingBag className="text-vintage-gold" size={16} />
                          Lịch sử hoạt động ngày {selectedDate.split('-').reverse().join('/')}
                        </h4>
                        {selectedDayData && (
                          <span className="text-xs bg-vintage-sepia-200 text-vintage-sepia-900 font-bold px-2 py-0.5 rounded">
                            {selectedDayData.itemsCount} giao dịch / hoạt động
                          </span>
                        )}
                      </div>

                      {loading ? (
                        <div className="text-center py-8">
                          <Loader2 className="animate-spin h-6 w-6 text-vintage-gold mx-auto" />
                        </div>
                      ) : !selectedDayData || selectedDayData.items.length === 0 ? (
                        <p className="text-sm text-warm-gray-700 italic text-center py-8">
                          Không ghi nhận hoạt động bán đứt hay thuê máy nào trong ngày này.
                        </p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="border-b border-vintage-sepia-100 text-warm-gray-700 font-bold bg-vintage-sepia-50/35">
                                <th className="p-4 w-28">Hình thức</th>
                                <th className="p-4">Tên thiết bị / sản phẩm</th>
                                <th className="p-4">Khách hàng</th>
                                <th className="p-4 text-center">Số lượng</th>
                                <th className="p-4 text-right">Tổng chi phí</th>
                                <th className="p-4 text-center w-24">Trạng thái</th>
                                <th className="p-4">Chi tiết chu kỳ</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-vintage-sepia-100">
                              {selectedDayData.items.map((item: any) => {
                                const isSale = item.type === 'SALE';
                                return (
                                  <tr key={item.id} className="hover:bg-vintage-sepia-50/30">
                                    <td className="p-4">
                                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                                        isSale
                                          ? 'bg-muted-green-100 text-muted-green-800'
                                          : 'bg-vintage-gold/15 text-vintage-gold'
                                      }`}>
                                        {isSale ? (
                                          <>
                                            <ShoppingBag size={10} />
                                            Bán đứt
                                          </>
                                        ) : (
                                          <>
                                            <Calendar size={10} />
                                            Đang thuê
                                          </>
                                        )}
                                      </span>
                                    </td>
                                    <td className="p-4 font-bold text-vintage-sepia-900">
                                      {item.productName}
                                    </td>
                                    <td className="p-4 text-warm-gray-900 font-medium">
                                      {item.customerName}
                                    </td>
                                    <td className="p-4 text-center font-bold">
                                      {item.quantity}
                                    </td>
                                    <td className="p-4 text-right font-bold text-warm-gray-900">
                                      {formatVND(item.amount)}
                                    </td>
                                    <td className="p-4 text-center">
                                      <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                        item.status === 'COMPLETED' || item.status === 'PAID' || item.status === 'RETURNED'
                                          ? 'bg-muted-green-150 text-muted-green-800'
                                          : item.status === 'CHECKED_IN'
                                            ? 'bg-amber-100 text-amber-800'
                                            : 'bg-warm-gray-100 text-warm-gray-700'
                                      }`}>
                                        {item.status}
                                      </span>
                                    </td>
                                    <td className="p-4 text-[10px] text-warm-gray-700 italic">
                                      {item.dateInfo}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Right Column: Widgets */}
            <div className="space-y-6">
              {/* Equipment status card */}
              <div className="bg-white p-6 rounded-xl border border-vintage-sepia-200 shadow-sm space-y-4">
                <h4 className="font-serif font-bold text-base text-vintage-sepia-900 border-b border-vintage-sepia-100 pb-2">
                  Trạng thái kho máy ({equipmentStatus.totalEquipments} thiết bị)
                </h4>
                <div className="space-y-3.5">
                  {(equipmentStatus.breakdown || []).map((b: any) => {
                    const statusColors: Record<string, string> = {
                      AVAILABLE: 'bg-muted-green-600 text-white',
                      RENTED: 'bg-vintage-gold text-white',
                      MAINTENANCE: 'bg-amber-500 text-white',
                      DAMAGED: 'bg-film-red text-white'
                    };
                    const statusLabel: Record<string, string> = {
                      AVAILABLE: 'Sẵn sàng thuê',
                      RENTED: 'Đang cho thuê',
                      MAINTENANCE: 'Đang bảo trì',
                      DAMAGED: 'Hỏng hóc/Lỗi vỏ'
                    };

                    return (
                      <div key={b.status} className="text-xs space-y-1">
                        <div className="flex justify-between font-bold">
                          <span className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${statusColors[b.status] || 'bg-gray-400'}`} />
                            {statusLabel[b.status] || b.status}
                          </span>
                          <span>{b.count} máy ({b.percentage}%)</span>
                        </div>
                        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${b.percentage}%` }}
                            className={`h-full ${statusColors[b.status] || 'bg-gray-400'}`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top rentals card */}
              <div className="bg-white p-6 rounded-xl border border-vintage-sepia-200 shadow-sm space-y-4">
                <h4 className="font-serif font-bold text-base text-vintage-sepia-900 border-b border-vintage-sepia-100 pb-2">Thiết bị thuê được ưa chuộng</h4>
                {topRentals.length === 0 ? (
                  <p className="text-xs text-warm-gray-700 italic">Chưa ghi nhận lượt đặt thuê nào.</p>
                ) : (
                  <div className="divide-y divide-vintage-sepia-100">
                    {topRentals.map((item, idx) => (
                      <div key={item.id} className="py-2.5 flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-serif italic font-bold text-vintage-gold text-sm">#{idx + 1}</span>
                          <div>
                            <p className="font-bold text-vintage-sepia-900">{item.modelName}</p>
                            <p className="text-[10px] text-warm-gray-700">{item.brand}</p>
                          </div>
                        </div>
                        <span className="font-bold bg-vintage-sepia-100 px-2 py-0.5 rounded text-[10px] text-vintage-sepia-900">
                          {item.rentalCount} lượt thuê
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          TAB 5: STAFF MANAGEMENT
      ---------------------------------------------------- */}
      {activeTab === 'staff' && (
        loading ? (
          <div className="text-center py-12"><Loader2 className="animate-spin h-8 w-8 text-vintage-gold mx-auto" /></div>
        ) : filteredStaff.length === 0 ? (
          <p className="text-center py-8 text-xs text-warm-gray-700 italic">Không tìm thấy nhân viên nào.</p>
        ) : (
          <div className="bg-vintage-sepia-100 border border-vintage-sepia-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-vintage-sepia-900/10 border-b border-vintage-sepia-200 text-vintage-sepia-900 font-bold uppercase tracking-wider">
                  <th className="p-4">Họ và tên</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Quyền hạn (Role)</th>
                  <th className="p-4">Số điện thoại</th>
                  <th className="p-4 text-center">Trạng thái</th>
                  <th className="p-4 text-center w-40">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-vintage-sepia-200">
                {filteredStaff.map(s => {
                  const isSelf = s.id === currentUser?.id;
                  return (
                    <tr key={s.id} className="hover:bg-vintage-sepia-50/50">
                      <td className="p-4 font-bold text-sm text-vintage-sepia-900">{s.fullName} {isSelf && '(Bạn)'}</td>
                      <td className="p-4 font-mono text-warm-gray-750">{s.email}</td>
                      <td className="p-4">
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          s.role === 'ADMIN' ? 'bg-film-red/10 text-film-red' :
                          s.role === 'MANAGER' ? 'bg-vintage-gold/15 text-vintage-gold' : 'bg-muted-green-100 text-muted-green-800'
                        }`}>
                          {s.role}
                        </span>
                      </td>
                      <td className="p-4 text-warm-gray-700">{s.phone || 'Chưa cập nhật'}</td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                          s.isActive ? 'bg-muted-green-150 text-muted-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {s.isActive ? 'Đang hoạt động' : 'Đã khóa'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {/* Toggle active status */}
                          {!isSelf && (
                            <button
                              onClick={() => handleToggleUserStatus(s)}
                              className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-colors cursor-pointer ${
                                s.isActive 
                                  ? 'bg-red-50 hover:bg-film-red text-film-red hover:text-white border border-film-red/20' 
                                  : 'bg-muted-green-50 hover:bg-muted-green-600 text-muted-green-800 hover:text-white border border-muted-green-600/20'
                              }`}
                            >
                              {s.isActive ? 'Khóa' : 'Mở khóa'}
                            </button>
                          )}

                          {/* Reset Password Modal trigger (Only ADMIN can reset) */}
                          {currentUser?.role === 'ADMIN' && (
                            <button
                              onClick={() => {
                                setPasswordTargetUser(s);
                                setNewPassword('');
                                setIsPasswordModalOpen(true);
                              }}
                              title="Reset Mật khẩu"
                              className="p-1.5 rounded bg-vintage-gold/10 hover:bg-vintage-gold text-vintage-gold hover:text-vintage-sepia-900 cursor-pointer"
                            >
                              <Key size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ----------------------------------------------------
          MODALS AREA
      ---------------------------------------------------- */}

      {/* 1. Add/Edit Product Modal */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-vintage-sepia-100 border border-vintage-sepia-200 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-vintage-sepia-200 flex items-center justify-between">
              <h3 className="font-serif font-bold text-lg text-vintage-sepia-900">
                {editingProduct ? 'Chỉnh sửa sản phẩm bán' : 'Thêm sản phẩm bán lẻ mới'}
              </h3>
              <button onClick={() => setIsProductModalOpen(false)} className="p-1 rounded-lg hover:bg-vintage-sepia-200"><X size={18} /></button>
            </div>
            <form onSubmit={handleProductSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div>
                <label className="block font-bold text-warm-gray-700 mb-1">Tên sản phẩm *</label>
                <input
                  type="text"
                  required
                  value={productFormData.name}
                  onChange={(e) => setProductFormData({ ...productFormData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-warm-gray-700 mb-1">Hãng sản xuất *</label>
                  <input
                    type="text"
                    required
                    value={productFormData.brand}
                    onChange={(e) => setProductFormData({ ...productFormData, brand: e.target.value })}
                    className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-warm-gray-700 mb-1">Số lượng tồn kho *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={productFormData.totalStock}
                    onChange={(e) => setProductFormData({ ...productFormData, totalStock: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-warm-gray-700 mb-1">Giá bán đứt (₫) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={productFormData.salePrice}
                    onChange={(e) => setProductFormData({ ...productFormData, salePrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-warm-gray-700 mb-1">Đường dẫn spec (URL) *</label>
                  <input
                    type="url"
                    required
                    placeholder="https://wikipedia.org/..."
                    value={productFormData.specUrl}
                    onChange={(e) => setProductFormData({ ...productFormData, specUrl: e.target.value })}
                    className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold text-warm-gray-700 mb-1">Ảnh sản phẩm (URL) *</label>
                <input
                  type="text"
                  required
                  value={productFormData.images}
                  onChange={(e) => setProductFormData({ ...productFormData, images: e.target.value })}
                  className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="block font-bold text-warm-gray-700 mb-1">Mô tả chi tiết</label>
                <textarea
                  rows={3}
                  value={productFormData.description}
                  onChange={(e) => setProductFormData({ ...productFormData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg"
                />
              </div>
              <div className="pt-4 border-t border-vintage-sepia-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-vintage-sepia-200 hover:bg-vintage-sepia-200 font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-vintage-sepia-900 text-vintage-sepia-50 font-bold hover:bg-vintage-gold cursor-pointer"
                >
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Add/Edit Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-vintage-sepia-100 border border-vintage-sepia-200 rounded-xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
            <div className="p-5 border-b border-vintage-sepia-200 flex items-center justify-between">
              <h3 className="font-serif font-bold text-lg text-vintage-sepia-900">
                {editingCategory ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới'}
              </h3>
              <button onClick={() => setIsCategoryModalOpen(false)} className="p-1 rounded-lg hover:bg-vintage-sepia-200"><X size={18} /></button>
            </div>
            <form onSubmit={handleCategorySubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-warm-gray-700 mb-1">Tên danh mục *</label>
                <input
                  type="text"
                  required
                  placeholder="Máy ảnh Film, Ống kính Vintage..."
                  value={categoryFormData.name}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg"
                />
              </div>
              <div>
                <label className="block font-bold text-warm-gray-700 mb-1">Slug (Đường dẫn định danh - để trống tự tạo)</label>
                <input
                  type="text"
                  placeholder="may-anh-film"
                  value={categoryFormData.slug}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, slug: e.target.value })}
                  className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="block font-bold text-warm-gray-700 mb-1">Mô tả ngắn</label>
                <textarea
                  rows={3}
                  value={categoryFormData.description}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg"
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
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Add/Edit Camera Model Modal */}
      {isModelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-vintage-sepia-100 border border-vintage-sepia-200 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-vintage-sepia-200 flex items-center justify-between">
              <h3 className="font-serif font-bold text-lg text-vintage-sepia-900">
                {editingModel ? 'Chỉnh sửa mẫu máy thuê' : 'Thêm mẫu máy ảnh thuê mới'}
              </h3>
              <button onClick={() => setIsModelModalOpen(false)} className="p-1 rounded-lg hover:bg-vintage-sepia-200"><X size={18} /></button>
            </div>
            <form onSubmit={handleModelSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-warm-gray-700 mb-1">Tên mẫu máy *</label>
                  <input
                    type="text"
                    required
                    value={modelFormData.model_name}
                    onChange={(e) => setModelFormData({ ...modelFormData, model_name: e.target.value })}
                    className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-warm-gray-700 mb-1">Hãng sản xuất *</label>
                  <input
                    type="text"
                    required
                    value={modelFormData.brand}
                    onChange={(e) => setModelFormData({ ...modelFormData, brand: e.target.value })}
                    className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-warm-gray-700 mb-1">Giá thuê / ngày (₫) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={modelFormData.rent_price_per_day}
                    onChange={(e) => setModelFormData({ ...modelFormData, rent_price_per_day: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-warm-gray-700 mb-1">Danh mục liên kết *</label>
                  <select
                    value={modelFormData.category_id}
                    onChange={(e) => setModelFormData({ ...modelFormData, category_id: e.target.value })}
                    className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg"
                  >
                    <option value="">-- Chọn danh mục --</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-warm-gray-700 mb-1">Ảnh đại diện (URL) *</label>
                  <input
                    type="text"
                    required
                    value={modelFormData.images}
                    onChange={(e) => setModelFormData({ ...modelFormData, images: e.target.value })}
                    className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-warm-gray-700 mb-1">URL thông số kỹ thuật</label>
                  <input
                    type="url"
                    value={modelFormData.specUrl}
                    onChange={(e) => setModelFormData({ ...modelFormData, specUrl: e.target.value })}
                    className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold text-warm-gray-700 mb-1">Mô tả ngắn</label>
                <textarea
                  rows={3}
                  value={modelFormData.description}
                  onChange={(e) => setModelFormData({ ...modelFormData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg"
                />
              </div>
              <div className="pt-4 border-t border-vintage-sepia-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModelModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-vintage-sepia-200 hover:bg-vintage-sepia-200 font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-vintage-sepia-900 text-vintage-sepia-50 font-bold hover:bg-vintage-gold cursor-pointer"
                >
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Reset Password Modal (Admin Only) */}
      {isPasswordModalOpen && passwordTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-vintage-sepia-100 border border-vintage-sepia-200 rounded-xl shadow-2xl max-w-sm w-full overflow-hidden flex flex-col">
            <div className="p-5 border-b border-vintage-sepia-200 flex items-center justify-between">
              <h3 className="font-serif font-bold text-base text-vintage-sepia-900 flex items-center gap-1.5">
                <ShieldAlert size={16} className="text-film-red" /> Đặt lại mật khẩu nhân viên
              </h3>
              <button onClick={() => setIsPasswordModalOpen(false)} className="p-1 rounded-lg hover:bg-vintage-sepia-200"><X size={18} /></button>
            </div>
            <form onSubmit={handleResetPasswordSubmit} className="p-6 space-y-4 text-xs">
              <p className="text-warm-gray-700">
                Bạn đang thực hiện thay đổi mật khẩu quản trị cho tài khoản của nhân sự: <strong className="text-vintage-sepia-900">{passwordTargetUser.fullName}</strong>.
              </p>
              <div>
                <label className="block font-bold text-warm-gray-700 mb-1">Mật khẩu mới (Tối thiểu 6 ký tự) *</label>
                <input
                  type="password"
                  required
                  placeholder="Nhập mật khẩu mới..."
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg font-mono"
                />
              </div>
              <div className="pt-4 border-t border-vintage-sepia-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-vintage-sepia-200 hover:bg-vintage-sepia-200 font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-film-red text-white font-bold hover:bg-film-red-light cursor-pointer"
                >
                  Đặt lại mật khẩu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Add Staff User Modal (Admin Only) */}
      {isStaffModalOpen && currentUser?.role === 'ADMIN' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-vintage-sepia-100 border border-vintage-sepia-200 rounded-xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
            <div className="p-5 border-b border-vintage-sepia-200 flex items-center justify-between">
              <h3 className="font-serif font-bold text-lg text-vintage-sepia-900 flex items-center gap-1.5">
                <Plus size={18} className="text-vintage-gold" /> Thêm tài khoản nhân sự mới
              </h3>
              <button onClick={() => setIsStaffModalOpen(false)} className="p-1 rounded-lg hover:bg-vintage-sepia-200"><X size={18} /></button>
            </div>
            <form onSubmit={handleStaffSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-warm-gray-700 mb-1">Họ và tên *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Nguyễn Văn A"
                  value={staffFormData.fullName}
                  onChange={(e) => setStaffFormData({ ...staffFormData, fullName: e.target.value })}
                  className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg text-warm-gray-900 focus:outline-none focus:border-vintage-gold"
                />
              </div>
              <div>
                <label className="block font-bold text-warm-gray-700 mb-1">Số điện thoại</label>
                <input
                  type="tel"
                  placeholder="Ví dụ: 0987654321"
                  value={staffFormData.phone}
                  onChange={(e) => setStaffFormData({ ...staffFormData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg text-warm-gray-900 focus:outline-none focus:border-vintage-gold"
                />
              </div>
              <div>
                <label className="block font-bold text-warm-gray-700 mb-1">Email đăng nhập *</label>
                <input
                  type="email"
                  required
                  placeholder="name@thefilmery.com"
                  value={staffFormData.email}
                  onChange={(e) => setStaffFormData({ ...staffFormData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg font-mono text-warm-gray-900 focus:outline-none focus:border-vintage-gold"
                />
              </div>
              <div>
                <label className="block font-bold text-warm-gray-700 mb-1">Mật khẩu khởi tạo * (Tối thiểu 6 ký tự)</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Nhập mật khẩu..."
                  value={staffFormData.password}
                  onChange={(e) => setStaffFormData({ ...staffFormData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg font-mono text-warm-gray-900 focus:outline-none focus:border-vintage-gold"
                />
              </div>
              <div>
                <label className="block font-bold text-warm-gray-700 mb-1">Vai trò (Role) *</label>
                <select
                  value={staffFormData.role}
                  onChange={(e) => setStaffFormData({ ...staffFormData, role: e.target.value as any })}
                  className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg text-warm-gray-900 focus:outline-none focus:border-vintage-gold"
                >
                  <option value="STAFF">Nhân viên (STAFF)</option>
                  <option value="MANAGER">Quản lý (MANAGER)</option>
                  <option value="ADMIN">Quản trị viên (ADMIN)</option>
                </select>
              </div>
              <div className="pt-4 border-t border-vintage-sepia-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsStaffModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-vintage-sepia-200 hover:bg-vintage-sepia-200 font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-vintage-sepia-900 text-vintage-sepia-50 font-bold hover:bg-vintage-gold cursor-pointer"
                >
                  Tạo tài khoản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default ManagerDashboard;
