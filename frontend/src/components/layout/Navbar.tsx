import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore.js';
import { 
  Camera, LogOut, ShieldAlert, Menu, X,
  Users, ClipboardList, Package, 
  BarChart2, CheckSquare
} from 'lucide-react';

interface NavbarProps {
  onNavigate: (path: string) => void;
  currentPath: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onNavigate, currentPath }) => {
  const { user, logout, isAuthenticated } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);

  const role = user?.role;

  // Helper to check if user has access to page
  const hasAccess = (path: string) => {
    if (role === 'ADMIN') return true;
    if (path === '/system-auth') return false;
    
    if (role === 'NHANVIENBAN') {
      const isBanPath = ['/sale-order-create', '/sale-order-history', '/sale-inventory', '/sale-import', '/sale-expenses', '/sale-staff', '/sale-customers', '/profile-logs'].includes(path);
      return isBanPath;
    }
    
    if (role === 'NHANVIENTHUE') {
      const isMuonPath = ['/rentals-pos', '/inventory', '/rental-import', '/customer-crm', '/reporting', '/muon-expenses', '/staff-management', '/profile-logs'].includes(path);
      return isMuonPath;
    }
    
    return false;
  };

  const getModules = () => {
    if (role === 'ADMIN') {
      return [
        { name: 'Lập đơn (Thuê)', path: '/rentals-pos', icon: CheckSquare },
        { name: 'Kho máy (Thuê)', path: '/inventory', icon: Package },
        { name: 'Khách hàng (Thuê)', path: '/customer-crm', icon: Users },
        { name: 'Lịch sử (Thuê)', path: '/reporting', icon: BarChart2 },
        { name: 'Nhân sự (Thuê)', path: '/staff-management', icon: Users },
        { name: 'Lập đơn (Bán)', path: '/sale-order-create', icon: CheckSquare },
        { name: 'Kho máy (Bán)', path: '/sale-inventory', icon: Package },
        { name: 'Nhập kho (Bán)', path: '/sale-import', icon: Package },
        { name: 'Khách hàng (Bán)', path: '/sale-customers', icon: Users },
        { name: 'Lịch sử (Bán)', path: '/sale-order-history', icon: BarChart2 },
        { name: 'Nhân sự (Bán)', path: '/sale-staff', icon: Users },
        { name: 'Quản trị hệ thống', path: '/profile-logs', icon: ClipboardList },
      ];
    }
    if (role === 'NHANVIENBAN') {
      return [
        { name: 'Lập đơn', path: '/sale-order-create', icon: CheckSquare },
        { name: 'Kho máy', path: '/sale-inventory', icon: Package },
        { name: 'Nhập kho', path: '/sale-import', icon: Package },
        { name: 'Khách hàng', path: '/sale-customers', icon: Users },
        { name: 'Lịch sử', path: '/sale-order-history', icon: BarChart2 },
        { name: 'Nhân sự', path: '/sale-staff', icon: Users },
        { name: 'Quản trị hệ thống', path: '/profile-logs', icon: ClipboardList },
      ];
    }
    if (role === 'NHANVIENTHUE') {
      return [
        { name: 'Lập đơn', path: '/rentals-pos', icon: CheckSquare },
        { name: 'Kho máy', path: '/inventory', icon: Package },
        { name: 'Nhập kho', path: '/rental-import', icon: Package },
        { name: 'Khách hàng', path: '/customer-crm', icon: Users },
        { name: 'Lịch sử', path: '/reporting', icon: BarChart2 },
        { name: 'Nhân sự', path: '/staff-management', icon: Users },
        { name: 'Quản trị hệ thống', path: '/profile-logs', icon: ClipboardList },
      ];
    }
    return [];
  };

  const modules = getModules();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-vintage-sepia-200 bg-vintage-sepia-50/90 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* LOGO */}
        <div 
          onClick={() => {
            if (isAuthenticated) {
              onNavigate(role === 'NHANVIENTHUE' ? '/rentals-pos' : role === 'NHANVIENBAN' ? '/sale-order-create' : '/home');
            } else {
              onNavigate('/auth/login');
            }
          }} 
          className="flex cursor-pointer items-center gap-2 text-vintage-sepia-900 group"
        >
          <Camera className="h-7 w-7 text-vintage-gold transition-transform group-hover:rotate-12" />
          <span className="font-serif text-2xl font-bold tracking-tight">THEFILMERY ERP</span>
        </div>

        {/* LEFT BRAND SECTION */}
        <div className="flex items-center gap-4">
        </div>

        {/* RIGHT CONTROL ACTIONS */}
        <div className="flex items-center gap-4">
          {/* User Section */}
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <div 
                className="flex items-center gap-2 px-4 py-2 rounded-full border border-vintage-sepia-200 bg-vintage-sepia-100 text-sm font-medium text-warm-gray-900"
              >
                <ShieldAlert size={16} className={role === 'ADMIN' ? "text-vintage-gold" : "text-muted-green-600"} />
                <span>
                  {role === 'ADMIN' ? `Admin: ${user?.fullName.split(' ')[0]}` : role === 'NHANVIENBAN' ? `NV Bán: ${user?.fullName.split(' ')[0]}` : `NV Thuê: ${user?.fullName.split(' ')[0]}`}
                </span>
              </div>
              <button 
                onClick={() => {
                  logout();
                  onNavigate('/auth/login');
                }}
                title="Đăng xuất"
                className="p-2.5 rounded-full hover:bg-red-50 text-warm-gray-700 hover:text-film-red transition-all cursor-pointer"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : null}

          {/* Hamburger Menu Toggle Button for mobile */}
          {isAuthenticated && (
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2.5 rounded-full border border-vintage-sepia-200 hover:border-vintage-gold text-warm-gray-700 hover:text-vintage-gold transition-all md:hidden cursor-pointer"
              aria-label="Toggle Menu"
            >
              {isOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {isOpen && isAuthenticated && (
        <div className="md:hidden border-t border-vintage-sepia-200 bg-vintage-sepia-50 px-4 py-4 space-y-2 font-medium text-sm text-warm-gray-700 shadow-lg transition-all duration-300 max-h-[80vh] overflow-y-auto">
          {modules.map(m => {
            if (!hasAccess(m.path)) return null;
            const Icon = m.icon;
            const isSelected = currentPath === m.path;
            return (
              <button
                key={m.path}
                onClick={() => {
                  onNavigate(m.path);
                  setIsOpen(false);
                }}
                className={`w-full text-left py-2.5 px-4 rounded-lg hover:bg-vintage-sepia-100 hover:text-vintage-gold transition-colors cursor-pointer flex items-center gap-2 ${
                  isSelected ? 'text-vintage-gold bg-vintage-sepia-100 font-bold' : ''
                }`}
              >
                <Icon size={16} />
                <span>{m.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
export default Navbar;
