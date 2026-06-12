import React from 'react';
import { useAuthStore } from '../../store/authStore.js';
import { 
  Users, ClipboardList, Package, ShieldAlert,
  BarChart2, CheckSquare, UserCheck, LogOut,
  Camera, Tag, ChevronDown, ChevronRight, ChevronLeft, CreditCard,
  ShoppingCart, ArrowDownToLine
} from 'lucide-react';

interface SidebarProps {
  onNavigate: (path: string) => void;
  currentPath: string;
  isHidden: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onNavigate, currentPath, isHidden, onToggle }) => {
  const { user, logout } = useAuthStore();

  const isMuonPath = ['/rentals-pos', '/inventory', '/customer-crm', '/reporting', '/muon-expenses', '/staff-management', '/rental-import'].includes(currentPath);
  const isBanPath = ['/sale-order-create', '/sale-order-history', '/sale-inventory', '/sale-import', '/sale-expenses', '/sale-staff', '/sale-customers'].includes(currentPath);

  const [muonExpanded, setMuonExpanded] = React.useState(true);
  const [banExpanded, setBanExpanded] = React.useState(true);

  // Auto-expand matching group on mount / path change
  React.useEffect(() => {
    if (isMuonPath) setMuonExpanded(true);
    if (isBanPath) setBanExpanded(true);
  }, [currentPath]);

  const role = user?.role;

  const hasAccess = (path: string) => {
    if (role === 'ADMIN') return true;
    
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

  const muonItems = [
    { name: 'Lập đơn', path: '/rentals-pos', icon: CheckSquare },
    { name: 'Kho máy', path: '/inventory', icon: Package },
    { name: 'Nhập kho', path: '/rental-import', icon: ArrowDownToLine },
    { name: 'Khách hàng', path: '/customer-crm', icon: Users },
    { name: 'Lịch sử', path: '/reporting', icon: BarChart2 },
    { name: 'Chi phí', path: '/muon-expenses', icon: CreditCard },
    { name: 'Nhân sự', path: '/staff-management', icon: UserCheck },
  ];

  const banItems = [
    { name: 'Lập đơn', path: '/sale-order-create', icon: ShoppingCart },
    { name: 'Kho máy', path: '/sale-inventory', icon: Package },
    { name: 'Nhập kho', path: '/sale-import', icon: ArrowDownToLine },
    { name: 'Khách hàng', path: '/sale-customers', icon: Users },
    { name: 'Lịch sử', path: '/sale-order-history', icon: BarChart2 },
    { name: 'Chi phí', path: '/sale-expenses', icon: CreditCard },
    { name: 'Nhân sự', path: '/sale-staff', icon: UserCheck },
  ];

  const renderNavGroup = (
    title: string,
    isExpanded: boolean,
    toggleExpanded: () => void,
    items: typeof muonItems,
    GroupIcon: any
  ) => {
    return (
      <div className="space-y-1 select-none">
        <button
          onClick={toggleExpanded}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold uppercase tracking-wider text-vintage-gold hover:text-vintage-gold/80 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <GroupIcon size={14} className="text-vintage-gold" />
            <span>{title}</span>
          </div>
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        {isExpanded && (
          <div className="pl-2.5 space-y-1 border-l border-vintage-sepia-800/60 ml-2.5">
            {items.map((item) => {
              if (!hasAccess(item.path)) return null;
              const Icon = item.icon;
              const isActive = currentPath === item.path;

              return (
                <button
                  key={item.path}
                  onClick={() => onNavigate(item.path)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-vintage-gold text-vintage-sepia-900 font-bold shadow-md shadow-vintage-gold/10'
                      : 'text-vintage-sepia-300 hover:text-vintage-gold hover:bg-vintage-sepia-800/40'
                  }`}
                >
                  <Icon size={15} className={isActive ? 'text-vintage-sepia-900' : 'text-vintage-sepia-400'} />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className={`bg-vintage-sepia-900 text-vintage-sepia-100 flex flex-col h-screen sticky top-0 border-r border-vintage-sepia-800 shrink-0 transition-all duration-300 ${
      isHidden ? 'w-0 border-r-0 overflow-hidden opacity-0' : 'w-64 opacity-100'
    }`}>
      {/* Title */}
      <div 
        className={`h-20 flex items-center justify-between border-b border-vintage-sepia-800 px-6 select-none`}
      >
        <h2 
          onClick={() => {
            if (role === 'ADMIN') {
              onNavigate('/home');
            }
          }}
          className={`font-serif text-lg font-bold tracking-wider text-vintage-gold uppercase ${
            role === 'ADMIN' ? 'cursor-pointer hover:text-vintage-gold/80 transition-all' : ''
          }`}
        >
          THEFILMERY
        </h2>
        <button 
          onClick={onToggle}
          title="Ẩn thanh công cụ"
          className="p-1.5 rounded-md hover:bg-vintage-sepia-800 text-vintage-sepia-400 hover:text-vintage-gold transition-all cursor-pointer"
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-4 px-4 space-y-4 overflow-y-auto">
        {(role === 'ADMIN' || role === 'NHANVIENBAN') && renderNavGroup('BANMAYFILM', banExpanded, () => setBanExpanded(!banExpanded), banItems, Tag)}
        {(role === 'ADMIN' || role === 'NHANVIENTHUE') && renderNavGroup('MUONMAYCHUT', muonExpanded, () => setMuonExpanded(!muonExpanded), muonItems, Camera)}
        
        <div className="pt-2 border-t border-vintage-sepia-800/40">
          <button
            onClick={() => onNavigate('/profile-logs')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer ${
              currentPath === '/profile-logs'
                ? 'bg-vintage-gold text-vintage-sepia-900 font-bold shadow-md shadow-vintage-gold/10'
                : 'text-vintage-sepia-300 hover:text-vintage-gold hover:bg-vintage-sepia-800/40'
            }`}
          >
            <ClipboardList size={15} className={currentPath === '/profile-logs' ? 'text-vintage-sepia-900' : 'text-vintage-sepia-400'} />
            <span>Quản trị hệ thống</span>
          </button>
        </div>
      </nav>

      {/* User profile & logout */}
      <div className="p-4 border-t border-vintage-sepia-800 bg-vintage-sepia-950/40 space-y-3">
        {/* User Card */}
        <div className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border border-vintage-sepia-800 bg-vintage-sepia-900/60">
          <div className="flex items-center gap-2 overflow-hidden">
            {role === 'ADMIN' ? (
              <ShieldAlert size={16} className="text-vintage-gold shrink-0" />
            ) : (
              <ShieldAlert size={16} className="text-muted-green-500 shrink-0" />
            )}
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-vintage-sepia-100 truncate">
                {user?.fullName}
              </span>
              <span className="text-[10px] text-vintage-sepia-400 font-mono">
                {role === 'ADMIN' ? 'Admin' : role === 'NHANVIENBAN' ? 'NV Bán Máy' : 'NV Cho Thuê'}
              </span>
            </div>
          </div>
          <button 
            onClick={() => {
              logout();
              onNavigate('/auth/login');
            }}
            title="Đăng xuất"
            className="p-1.5 rounded-md hover:bg-red-950/30 text-vintage-sepia-400 hover:text-film-red transition-all cursor-pointer shrink-0"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* Footer info */}
      <div className="p-3 border-t border-vintage-sepia-800 text-[10px] text-vintage-sepia-400 text-center font-mono">
        v2.0.0-beta • 2026
      </div>
    </aside>
  );
};
