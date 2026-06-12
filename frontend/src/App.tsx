import React, { useState, useEffect } from 'react';
import { useAuthStore } from './store/authStore.js';
import { Navbar } from './components/layout/Navbar.js';
import { ToastNotification } from './components/ui/Toast.js';
import { useUIStore } from './store/uiStore.js';
import { axiosClient } from './api/axiosClient.js';
import { ChevronRight } from 'lucide-react';

// Import Custom Pages
import { Home } from './pages/public/Home';
import { ProductList } from './pages/public/ProductList';
import { ProductDetail } from './pages/public/ProductDetail';
import { CartPage } from './pages/public/CartPage';
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { CustomerDashboard } from './pages/customer/CustomerDashboard';
import { Sidebar } from './components/layout/Sidebar.js';

// Import Modular Pages
import { ProfileLogs } from './pages/admin/ProfileLogs';
import { Inventory } from './pages/admin/Inventory';
import { CustomerCRM } from './pages/admin/CustomerCRM';
import { RentalsPOS } from './pages/admin/RentalsPOS';
import { StaffManagement } from './pages/admin/StaffManagement';
import { Reporting } from './pages/admin/Reporting';
import { Expenses } from './pages/admin/Expenses';
import { SaleOrderCreate } from './pages/admin/banmayfilm/SaleOrderCreate';
import { SaleOrderHistory } from './pages/admin/banmayfilm/SaleOrderHistory';
import { SaleInventory } from './pages/admin/banmayfilm/SaleInventory';
import { SaleImport } from './pages/admin/banmayfilm/SaleImport';
import { RentalImport } from './pages/admin/RentalImport';
import { SaleStaffManagement } from './pages/admin/banmayfilm/SaleStaffManagement';
import { SaleCustomerCRM } from './pages/admin/banmayfilm/SaleCustomerCRM';
import { DashboardHome } from './pages/admin/DashboardHome';

export const App: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { addToast } = useUIStore();
  const [selectedProductSlug, setSelectedProductSlug] = useState<string | null>(null);

  const [isSidebarHidden, setIsSidebarHidden] = useState(() => {
    return localStorage.getItem('sidebar_hidden') === 'true';
  });

  const toggleSidebar = () => {
    setIsSidebarHidden(prev => {
      const next = !prev;
      localStorage.setItem('sidebar_hidden', String(next));
      return next;
    });
  };

  // Set default starting page based on role and auth state
  const getDefaultPath = () => {
    if (!isAuthenticated) return '/auth/login';
    if (user?.role === 'NHANVIENBAN') return '/sale-order-create';
    if (user?.role === 'NHANVIENTHUE') return '/rentals-pos';
    return '/home';
  };

  const [currentPath, setCurrentPath] = useState(getDefaultPath());

  const handleNavigate = (path: string) => {
    const authState = useAuthStore.getState();
    const isAuth = authState.isAuthenticated;
    const role = authState.user?.role;

    // Basic route auth guards
    if (!isAuth && path !== '/auth/login' && path !== '/auth/register') {
      setCurrentPath('/auth/login');
      return;
    }

    if (isAuth) {
      if (path === '/profile-logs') {
        setCurrentPath(path);
        return;
      }

      if (role === 'ADMIN') {
        setCurrentPath(path);
        return;
      }

      // BANMAYFILM routes
      const isBanPath = ['/sale-order-create', '/sale-order-history', '/sale-inventory', '/sale-import', '/sale-expenses', '/sale-staff', '/sale-customers'].includes(path);
      if (isBanPath && role !== 'NHANVIENBAN') {
        addToast('Từ chối truy cập: Quyền hạn không hợp lệ!', 'error');
        setCurrentPath(getDefaultPath());
        return;
      }

      // MUONMAYCHUT routes
      const isMuonPath = ['/rentals-pos', '/inventory', '/rental-import', '/customer-crm', '/reporting', '/muon-expenses', '/staff-management'].includes(path);
      if (isMuonPath && role !== 'NHANVIENTHUE') {
        addToast('Từ chối truy cập: Quyền hạn không hợp lệ!', 'error');
        setCurrentPath(getDefaultPath());
        return;
      }

      // Home/Dashboard is admin only
      if (path === '/home') {
        addToast('Từ chối truy cập: Quyền hạn không hợp lệ!', 'error');
        setCurrentPath(getDefaultPath());
        return;
      }
    }

    // Check query params manually (e.g. detailed view slug)
    if (path.startsWith('/products/')) {
      const slug = path.split('/')[2];
      setSelectedProductSlug(slug);
      setCurrentPath('/products/detail');
      return;
    }

    setCurrentPath(path);
  };

  // Redirect based on auth state changes
  useEffect(() => {
    if (!isAuthenticated) {
      setCurrentPath('/auth/login');
    } else {
      if (
        currentPath === '/auth/login' ||
        currentPath === '/' ||
        currentPath === '/products' ||
        currentPath === '/cart' ||
        currentPath === '/dashboard'
      ) {
        if (user?.role === 'NHANVIENBAN') {
          setCurrentPath('/sale-order-create');
        } else if (user?.role === 'NHANVIENTHUE') {
          setCurrentPath('/rentals-pos');
        } else if (user?.role === 'ADMIN') {
          setCurrentPath('/home');
        }
      }
    }
  }, [isAuthenticated, user]);

  // Listen for session expired events from axios interceptor
  useEffect(() => {
    const handleSessionExpired = () => {
      logout();
      setCurrentPath('/auth/login');
    };
    window.addEventListener('auth:session-expired', handleSessionExpired);
    return () => window.removeEventListener('auth:session-expired', handleSessionExpired);
  }, []);

  // Proactively verify server connection status on mount
  useEffect(() => {
    axiosClient.get('/health')
      .then(() => console.log('📡 Đã kết nối API thành công'))
      .catch(() => console.warn('📡 Máy chủ API đang ngoại tuyến.'));
  }, []);

  const isManagementPath = [
    '/home',
    '/rentals-pos',
    '/inventory',
    '/customer-crm',
    '/reporting',
    '/staff-management',
    '/profile-logs',
    '/muon-expenses',
    '/sale-order-create',
    '/sale-order-history',
    '/sale-inventory',
    '/sale-import',
    '/rental-import',
    '/sale-expenses',
    '/sale-staff',
    '/sale-customers'
  ].includes(currentPath);

  if (isAuthenticated && isManagementPath) {
    return (
      <div className="flex min-h-screen bg-vintage-sepia-50 relative">
        {isSidebarHidden && (
          <button
            onClick={toggleSidebar}
            title="Hiện thanh công cụ"
            className="fixed top-6 left-0 z-50 flex items-center justify-center bg-vintage-sepia-900 text-vintage-gold border-r border-y border-vintage-sepia-800 rounded-r-lg p-2.5 shadow-lg cursor-pointer hover:bg-vintage-gold hover:text-vintage-sepia-950 transition-all hover:scale-105 duration-200"
          >
            <ChevronRight size={18} />
          </button>
        )}
        <Sidebar
          onNavigate={handleNavigate}
          currentPath={currentPath}
          isHidden={isSidebarHidden}
          onToggle={toggleSidebar}
        />
        <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
          <main className="flex-1 w-full mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
            {currentPath === '/home' && <DashboardHome />}
            {currentPath === '/profile-logs' && <ProfileLogs />}
            {currentPath === '/inventory' && <Inventory />}
            {currentPath === '/customer-crm' && <CustomerCRM />}
            {currentPath === '/rentals-pos' && <RentalsPOS />}
            {currentPath === '/staff-management' && <StaffManagement />}
            {currentPath === '/reporting' && <Reporting />}
            {currentPath === '/muon-expenses' && <Expenses businessType="MUONMAYCHUT" />}
            {currentPath === '/sale-order-create' && <SaleOrderCreate />}
            {currentPath === '/sale-order-history' && <SaleOrderHistory />}
            {currentPath === '/sale-inventory' && <SaleInventory />}
            {currentPath === '/sale-import' && <SaleImport />}
            {currentPath === '/rental-import' && <RentalImport />}
            {currentPath === '/sale-expenses' && <Expenses businessType="BANMAYFILM" />}
            {currentPath === '/sale-staff' && <SaleStaffManagement />}
            {currentPath === '/sale-customers' && <SaleCustomerCRM />}
          </main>
          <ToastNotification />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-vintage-sepia-50">
      <Navbar onNavigate={handleNavigate} currentPath={currentPath} />

      <main className="flex-1 w-full mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {currentPath === '/' && (
          <Home onNavigate={handleNavigate} />
        )}

        {currentPath === '/products' && (
          <ProductList onNavigate={handleNavigate} />
        )}

        {currentPath === '/products/detail' && selectedProductSlug && (
          <ProductDetail slug={selectedProductSlug} onNavigate={handleNavigate} />
        )}

        {currentPath === '/cart' && (
          <CartPage onNavigate={handleNavigate} />
        )}

        {currentPath === '/auth/login' && (
          <Login onNavigate={handleNavigate} />
        )}

        {currentPath === '/auth/register' && (
          <Register onNavigate={handleNavigate} />
        )}

        {currentPath === '/dashboard' && (
          <CustomerDashboard onNavigate={handleNavigate} />
        )}
      </main>

      {/* Global Toast Drawer */}
      <ToastNotification />

      {/* Footer */}
      <footer className="border-t border-vintage-sepia-200 bg-vintage-sepia-100 text-warm-gray-800 py-12 text-sm font-medium">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Info */}
          <div className="space-y-4 text-left">
            <h3 className="font-serif text-lg font-bold tracking-tight text-vintage-sepia-900 uppercase">TheFilmery</h3>
            <p className="text-xs text-warm-gray-700 leading-relaxed">
              Cửa hàng uy tín hàng đầu cung cấp dịch vụ mua bán và cho thuê máy ảnh film cổ điển, ống kính vintage, và phụ kiện analog cao cấp tại Việt Nam.
            </p>
            <p className="font-serif italic text-xs text-vintage-gold">&ldquo;Ghi trọn hạt grain, đóng băng khoảnh khắc.&rdquo;</p>
          </div>

          {/* Quick Links */}
          <div className="space-y-3 text-left">
            <h4 className="text-xs font-bold text-vintage-sepia-900 uppercase tracking-wider">Đường dẫn nhanh</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={() => handleNavigate('/')} className="hover:text-vintage-gold transition-colors text-warm-gray-700 cursor-pointer">
                  Khám phá
                </button>
              </li>
              <li>
                <button onClick={() => handleNavigate('/products')} className="hover:text-vintage-gold transition-colors text-warm-gray-700 cursor-pointer">
                  Mua &amp; Thuê máy
                </button>
              </li>
              <li>
                <button onClick={() => handleNavigate('/cart')} className="hover:text-vintage-gold transition-colors text-warm-gray-700 cursor-pointer">
                  Giỏ hàng của bạn
                </button>
              </li>
            </ul>
          </div>

          {/* Contact details */}
          <div className="space-y-3 text-left">
            <h4 className="text-xs font-bold text-vintage-sepia-900 uppercase tracking-wider">Liên hệ với chúng tôi</h4>
            <ul className="space-y-2 text-xs text-warm-gray-700 leading-relaxed">
              <li>📍 Địa chỉ: 123 Đường Điện Biên Phủ, Quận 1, TP. Hồ Chí Minh</li>
              <li>📞 Hotline: 090 123 4567</li>
              <li>✉️ Email: contact@thefilmery.vn</li>
            </ul>
          </div>

          {/* Hours and social */}
          <div className="space-y-3 text-left">
            <h4 className="text-xs font-bold text-vintage-sepia-900 uppercase tracking-wider">Thời gian hoạt động</h4>
            <p className="text-xs text-warm-gray-700 leading-relaxed">
              Thứ Hai - Chủ Nhật: 08:30 - 21:00 <br />
              Hỗ trợ kỹ thuật 24/7 trực tuyến.
            </p>
            <div className="pt-2 flex gap-3 text-vintage-gold text-xs">
              <span className="cursor-pointer hover:text-vintage-sepia-900">Facebook</span>
              <span>•</span>
              <span className="cursor-pointer hover:text-vintage-sepia-900">Instagram</span>
              <span>•</span>
              <span className="cursor-pointer hover:text-vintage-sepia-900">Pinterest</span>
            </div>
          </div>
        </div>

        {/* Bottom footer bar */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-12 pt-6 border-t border-vintage-sepia-200/60 text-center text-xs text-warm-gray-700">
          <p className="font-mono">&copy; 2026 TheFilmery | CLB Nhiếp ảnh Analog Việt Nam. Bảo lưu mọi quyền.</p>
        </div>
      </footer>
    </div>
  );
};
export default App;
