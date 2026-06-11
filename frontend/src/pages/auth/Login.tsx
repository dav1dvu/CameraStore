import React, { useState } from 'react';
import { axiosClient } from '../../api/axiosClient.js';
import { useAuthStore } from '../../store/authStore.js';
import { useUIStore } from '../../store/uiStore.js';
import { LogIn, Key, User, Shield } from 'lucide-react';

interface LoginProps {
  onNavigate: (path: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onNavigate }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const setAuth = useAuthStore((s) => s.setAuth);
  const { addToast } = useUIStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axiosClient.post('/auth/login', { email: username, password });
      if (res.data.success) {
        const { user, session } = res.data.data;
        setAuth(user, session);
        addToast(`Chào mừng trở lại, ${user.fullName}!`, 'success');
        
        if (user.role === 'ADMIN') {
          onNavigate('/home');
        } else if (user.role === 'NHANVIENBAN') {
          onNavigate('/sale-order-create');
        } else if (user.role === 'NHANVIENTHUE') {
          onNavigate('/rentals-pos');
        } else {
          onNavigate('/home');
        }
      }
    } catch (err: any) {
      const rawError = err.response?.data?.error;
      let errorMessage = 'Không thể kết nối với máy chủ. Vui lòng kiểm tra lại đường truyền!';
      if (err.response) {
        if (rawError === 'Invalid login credentials' || rawError === 'Invalid credentials') {
          errorMessage = 'Tài khoản hoặc mật khẩu không chính xác!';
        } else if (rawError) {
          errorMessage = rawError;
        }
      }
      addToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12 font-medium">
      <div className="bg-vintage-sepia-100 p-8 rounded-xl border border-vintage-sepia-200 shadow-xl space-y-6">
        {/* Header Title */}
        <div className="text-center">
          <LogIn className="mx-auto h-12 w-12 text-vintage-gold" />
          <h2 className="font-serif font-extrabold text-2xl text-vintage-sepia-900 mt-2">Đăng nhập thành viên</h2>
          {(import.meta as any).env.DEV ? (
            <p className="text-xs text-warm-gray-700 mt-1">Đăng nhập với <b>admin</b>, <b>banmayfilm</b>, hoặc <b>muonmaychut</b></p>
          ) : (
            <p className="text-xs text-warm-gray-700 mt-1">Vui lòng đăng nhập để truy cập hệ thống quản lý</p>
          )}
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-warm-gray-700 mb-1">Tên tài khoản</label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="Nhập tên tài khoản"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-vintage-sepia-250 bg-vintage-sepia-50 text-sm focus:outline-none focus:border-vintage-gold text-warm-gray-900"
              />
              <User className="absolute left-3 top-3 h-4.5 w-4.5 text-gray-400" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-warm-gray-700 mb-1">Mật khẩu</label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-vintage-sepia-250 bg-vintage-sepia-50 text-sm focus:outline-none focus:border-vintage-gold text-warm-gray-900"
              />
              <Key className="absolute left-3 top-3.5 h-4.5 w-4.5 text-gray-400" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-vintage-sepia-900 hover:bg-vintage-gold text-vintage-sepia-50 font-bold text-xs uppercase tracking-widest cursor-pointer disabled:opacity-50 transition-colors"
          >
            {loading ? 'Đang xác thực phiên...' : 'Đăng nhập'}
          </button>
        </form>
      </div>
    </div>
  );
};
