import React, { useState } from 'react';
import { axiosClient } from '../../api/axiosClient.js';
import { useUIStore } from '../../store/uiStore.js';
import { UserPlus, Mail, Key, User, Phone } from 'lucide-react';

interface RegisterProps {
  onNavigate: (path: string) => void;
}

export const Register: React.FC<RegisterProps> = ({ onNavigate }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const { addToast } = useUIStore();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axiosClient.post('/auth/signup', {
        email,
        password,
        fullName,
        phone
      });

      if (res.data.success) {
        addToast('Đăng ký thành công! Vui lòng đăng nhập.', 'success');
        onNavigate('/auth/login');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Đăng ký tài khoản thất bại. Vui lòng kiểm tra lại!';
      addToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-8 font-medium">
      <div className="bg-vintage-sepia-100 p-8 rounded-xl border border-vintage-sepia-200 shadow-xl space-y-6">
        <div className="text-center">
          <UserPlus className="mx-auto h-12 w-12 text-vintage-gold" />
          <h2 className="font-serif font-extrabold text-2xl text-vintage-sepia-900 mt-2">Đăng ký tài khoản</h2>
          <p className="text-xs text-warm-gray-700 mt-1">Tham gia cộng đồng yêu thích nhiếp ảnh film cổ điển TheFilmery</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-warm-gray-700 mb-1">Họ và tên</label>
            <div className="relative">
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="Nguyễn Văn A"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-vintage-sepia-250 bg-vintage-sepia-50 text-sm focus:outline-none focus:border-vintage-gold text-warm-gray-900"
              />
              <User className="absolute left-3 top-3 h-4.5 w-4.5 text-gray-400" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-warm-gray-700 mb-1">Số điện thoại</label>
            <div className="relative">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                placeholder="Ví dụ: 0901234567"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-vintage-sepia-250 bg-vintage-sepia-50 text-sm focus:outline-none focus:border-vintage-gold text-warm-gray-900"
              />
              <Phone className="absolute left-3 top-3 h-4.5 w-4.5 text-gray-400" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-warm-gray-700 mb-1">Địa chỉ Email</label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-vintage-sepia-250 bg-vintage-sepia-50 text-sm focus:outline-none focus:border-vintage-gold text-warm-gray-900"
              />
              <Mail className="absolute left-3 top-3 h-4.5 w-4.5 text-gray-400" />
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
                placeholder="Tối thiểu 6 ký tự..."
                minLength={6}
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
            {loading ? 'Đang tạo thẻ thành viên...' : 'Đăng ký ngay'}
          </button>
        </form>

        <div className="text-center pt-2">
          <button
            onClick={() => onNavigate('/auth/login')}
            className="text-xs text-warm-gray-700 hover:text-vintage-gold transition-colors font-semibold cursor-pointer"
          >
            Đã là thành viên? <span className="font-bold underline">Đăng nhập tại đây</span>
          </button>
        </div>
      </div>
    </div>
  );
};
