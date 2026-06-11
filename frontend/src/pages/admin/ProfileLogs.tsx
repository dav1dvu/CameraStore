import React, { useState, useEffect } from 'react';
import { axiosClient } from '../../api/axiosClient.js';
import { useUIStore } from '../../store/uiStore.js';
import { useAuthStore } from '../../store/authStore.js';
import { 
  User, ClipboardList, Key, Save, Loader2, UserCheck,
  Users, Plus, Search, ShieldAlert, X
} from 'lucide-react';
import { Skeleton } from '../../components/ui/Skeleton';

interface Verification {
  id: string;
  id_number: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  front_image_url: string;
  back_image_url: string;
  selfie_url: string;
  profiles: {
    full_name: string;
    phone: string;
  };
}

interface ActivityLog {
  id: string;
  action_type: string;
  table_name: string;
  record_id?: string;
  notes?: string;
  created_at: string;
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

export const ProfileLogs: React.FC = () => {
  const { addToast } = useUIStore();
  const { user: currentUser } = useAuthStore();
  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'logs' | 'verifications' | 'systemAuth'>('profile');

  // Loading States
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [loadingVerifs, setLoadingVerifs] = useState(false);
  const [loadingStaff, setLoadingStaff] = useState(false);

  // States
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    role: '',
    address: ''
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [verifications, setVerifications] = useState<Verification[]>([]);

  // SystemAuth states
  const [staffSearchTerm, setStaffSearchTerm] = useState('');
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [staffFormData, setStaffFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    phone: '',
    role: 'STAFF' as 'ADMIN' | 'MANAGER' | 'STAFF'
  });
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordTargetUser, setPasswordTargetUser] = useState<StaffUser | null>(null);
  const [newPassword, setNewPassword] = useState('');

  // Fetch Profile
  const fetchProfile = async () => {
    setLoadingProfile(true);
    try {
      const res = await axiosClient.get('/profiles/me');
      if (res.data.success) {
        const d = res.data.data;
        setProfileData({
          firstName: d.first_name || '',
          lastName: d.last_name || '',
          phone: d.phone_number || d.phone || '',
          email: d.email || '',
          role: d.role || '',
          address: d.address || ''
        });
      }
    } catch (err: any) {
      addToast(err.message || 'Lỗi khi tải thông tin hồ sơ', 'error');
    } finally {
      setLoadingProfile(false);
    }
  };

  // Update Profile
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingProfile(true);
    try {
      const res = await axiosClient.put('/profiles/me', {
        fullName: `${profileData.firstName} ${profileData.lastName}`.trim(),
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        phone: profileData.phone,
        address: profileData.address
      });
      if (res.data.success) {
        addToast('Cập nhật thông tin cá nhân thành công', 'success');
        fetchProfile();
      }
    } catch (err: any) {
      addToast(err.message || 'Cập nhật hồ sơ thất bại', 'error');
    } finally {
      setLoadingProfile(false);
    }
  };

  // Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      addToast('Mật khẩu xác nhận không khớp', 'error');
      return;
    }
    try {
      const res = await axiosClient.post('/profiles/me/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      if (res.data.success) {
        addToast('Đổi mật khẩu thành công', 'success');
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (err: any) {
      addToast(err.message || 'Không thể đổi mật khẩu', 'error');
    }
  };

  // Fetch Activity Logs
  const fetchActivityLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await axiosClient.get('/profiles/me/logs');
      if (res.data.success) {
        setActivityLogs(res.data.data || []);
      }
    } catch (err: any) {
      addToast(err.message || 'Lỗi khi tải nhật ký hoạt động', 'error');
    } finally {
      setLoadingLogs(false);
    }
  };

  // Fetch Customer Verifications
  const fetchVerifications = async () => {
    setLoadingVerifs(true);
    try {
      const res = await axiosClient.get('/profiles/verifications');
      if (res.data.success) {
        setVerifications(res.data.data || []);
      }
    } catch (err: any) {
      setVerifications([]);
    } finally {
      setLoadingVerifs(false);
    }
  };

  const handleReviewVerification = async (id: string, status: 'VERIFIED' | 'REJECTED') => {
    let rejectionReason = undefined;
    if (status === 'REJECTED') {
      rejectionReason = window.prompt('Nhập lý do từ chối phê duyệt hồ sơ:') || 'Ảnh tài liệu bị mờ/không hợp lệ';
    }

    try {
      const res = await axiosClient.post(`/profiles/verifications/${id}/review`, {
        status,
        rejectionReason
      });

      if (res.data.success) {
        addToast(status === 'VERIFIED' ? 'Đã duyệt xác minh danh tính khách hàng thành công' : 'Đã từ chối tài liệu xác minh danh tính', 'success');
        fetchVerifications();
      }
    } catch (err: any) {
      addToast(err.message || 'Thao tác phê duyệt hồ sơ lỗi', 'error');
    }
  };

  // Fetch Staff Users (System Auth)
  const fetchStaffUsers = async () => {
    setLoadingStaff(true);
    try {
      const res = await axiosClient.get('/auth/users');
      if (res.data.success) {
        setStaffUsers(res.data.data || []);
      }
    } catch (err: any) {
      addToast(err.message || 'Lỗi khi tải danh sách nhân sự', 'error');
      setStaffUsers([]);
    } finally {
      setLoadingStaff(false);
    }
  };

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

  useEffect(() => {
    if (activeSubTab === 'profile') fetchProfile();
    if (activeSubTab === 'logs') fetchActivityLogs();
    if (activeSubTab === 'verifications') fetchVerifications();
    if (activeSubTab === 'systemAuth') fetchStaffUsers();
  }, [activeSubTab]);

  const filteredStaff = staffUsers.filter(s => 
    s.fullName.toLowerCase().includes(staffSearchTerm.toLowerCase()) ||
    s.email.toLowerCase().includes(staffSearchTerm.toLowerCase())
  );

  return (
    <div className="py-4 space-y-8 font-medium">
      {/* Header */}
      <div className="border-b border-vintage-sepia-200 pb-4">
        <h1 className="font-serif font-extrabold text-3xl text-vintage-sepia-900 flex items-center gap-2">
          <User className="text-vintage-gold" /> Hồ sơ &amp; Quản trị hệ thống
        </h1>
        <p className="text-sm text-warm-gray-700 mt-1">
          Cấu hình tài khoản, phân quyền và nhật ký hoạt động hệ thống.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-vintage-sepia-200 pb-px">
        <button
          onClick={() => setActiveSubTab('profile')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-serif text-sm font-bold transition-all cursor-pointer ${
            activeSubTab === 'profile'
              ? 'border-vintage-gold text-vintage-gold bg-vintage-sepia-100/50'
              : 'border-transparent text-warm-gray-700 hover:text-vintage-gold'
          }`}
        >
          <User size={16} /> Thông tin hồ sơ
        </button>
        <button
          onClick={() => setActiveSubTab('logs')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-serif text-sm font-bold transition-all cursor-pointer ${
            activeSubTab === 'logs'
              ? 'border-vintage-gold text-vintage-gold bg-vintage-sepia-100/50'
              : 'border-transparent text-warm-gray-700 hover:text-vintage-gold'
          }`}
        >
          <ClipboardList size={16} /> Nhật ký hoạt động cá nhân
        </button>
        <button
          onClick={() => setActiveSubTab('verifications')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-serif text-sm font-bold transition-all cursor-pointer ${
            activeSubTab === 'verifications'
              ? 'border-vintage-gold text-vintage-gold bg-vintage-sepia-100/50'
              : 'border-transparent text-warm-gray-700 hover:text-vintage-gold'
          }`}
        >
          <UserCheck size={16} /> Duyệt xác minh danh tính
        </button>
        {currentUser?.role === 'ADMIN' && (
          <button
            onClick={() => setActiveSubTab('systemAuth')}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 font-serif text-sm font-bold transition-all cursor-pointer ${
              activeSubTab === 'systemAuth'
                ? 'border-vintage-gold text-vintage-gold bg-vintage-sepia-100/50'
                : 'border-transparent text-warm-gray-700 hover:text-vintage-gold'
            }`}
          >
            <ShieldAlert size={16} /> Quản trị hệ thống
          </button>
        )}
      </div>

      {/* Contents */}
      {activeSubTab === 'profile' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Details form */}
          <div className="bg-vintage-sepia-100 p-6 rounded-xl border border-vintage-sepia-200 space-y-4">
            <h3 className="font-serif font-bold text-lg text-vintage-sepia-900 border-b border-vintage-sepia-200 pb-2">
              Thông tin liên hệ
            </h3>
            {loadingProfile ? (
              <div className="text-center py-6"><Loader2 className="animate-spin h-8 w-8 text-vintage-gold mx-auto" /></div>
            ) : (
              <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-warm-gray-700 mb-1">Tên</label>
                    <input
                      type="text"
                      required
                      value={profileData.firstName}
                      onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                      className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-warm-gray-700 mb-1">Họ &amp; Tên đệm</label>
                    <input
                      type="text"
                      required
                      value={profileData.lastName}
                      onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                      className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-warm-gray-700 mb-1">Số điện thoại</label>
                  <input
                    type="text"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-bold text-warm-gray-700 mb-1">Địa chỉ</label>
                  <input
                    type="text"
                    value={profileData.address}
                    onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                    className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-warm-gray-700 mb-1">Vai trò</label>
                    <input
                      type="text"
                      disabled
                      value={profileData.role}
                      className="w-full px-3 py-2 border border-vintage-sepia-200 bg-vintage-sepia-50 rounded-lg text-vintage-gold font-bold animate-pulse-slow"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-warm-gray-700 mb-1">Email đăng nhập</label>
                    <input
                      type="text"
                      disabled
                      value={profileData.email}
                      className="w-full px-3 py-2 border border-vintage-sepia-200 bg-vintage-sepia-50 rounded-lg font-mono text-warm-gray-750"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-vintage-sepia-900 hover:bg-vintage-gold text-vintage-sepia-50 font-bold hover:text-vintage-sepia-900 transition-all duration-200 cursor-pointer"
                >
                  <Save size={16} /> Lưu thay đổi hồ sơ
                </button>
              </form>
            )}
          </div>

          {/* Change password form */}
          <div className="bg-vintage-sepia-100 p-6 rounded-xl border border-vintage-sepia-200 space-y-4">
            <h3 className="font-serif font-bold text-lg text-vintage-sepia-900 border-b border-vintage-sepia-200 pb-2">
              Đổi mật khẩu tài khoản
            </h3>
            <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-warm-gray-700 mb-1">Mật khẩu hiện tại *</label>
                <input
                  type="password"
                  required
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-warm-gray-700 mb-1">Mật khẩu mới * (Tối thiểu 6 ký tự)</label>
                <input
                  type="password"
                  required
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-warm-gray-700 mb-1">Xác nhận mật khẩu mới *</label>
                <input
                  type="password"
                  required
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg font-mono"
                />
              </div>

              <button
                type="submit"
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-vintage-sepia-900 hover:bg-vintage-gold text-vintage-sepia-50 font-bold hover:text-vintage-sepia-900 transition-all duration-200 cursor-pointer"
              >
                <Key size={16} /> Thay đổi mật khẩu
              </button>
            </form>
          </div>
        </div>
      )}

      {activeSubTab === 'logs' && (
        <div className="bg-vintage-sepia-100 p-6 rounded-xl border border-vintage-sepia-200 space-y-4">
          <h3 className="font-serif font-bold text-lg text-vintage-sepia-900 border-b border-vintage-sepia-200 pb-2 flex items-center gap-2">
            <ClipboardList size={18} className="text-vintage-gold" /> Nhật ký hoạt động Audit Trail (Của chính bạn)
          </h3>
          
          {loadingLogs ? (
            <div className="text-center py-6"><Loader2 className="animate-spin h-8 w-8 text-vintage-gold mx-auto" /></div>
          ) : activityLogs.length === 0 ? (
            <p className="text-xs text-warm-gray-700 italic">Không có lịch sử hoạt động được ghi lại.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-vintage-sepia-900/10 border-b border-vintage-sepia-200 font-bold uppercase">
                    <th className="p-3">Hành động</th>
                    <th className="p-3">Bảng dữ liệu</th>
                    <th className="p-3">Ghi chú chi tiết</th>
                    <th className="p-3">Thời gian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-vintage-sepia-200">
                  {activityLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-vintage-sepia-50/50">
                      <td className="p-3">
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          log.action_type === 'INSERT' ? 'bg-muted-green-100 text-muted-green-800' :
                          log.action_type === 'UPDATE' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {log.action_type}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-warm-gray-900 font-bold">{log.table_name}</td>
                      <td className="p-3 text-warm-gray-700">{log.notes || '-'}</td>
                      <td className="p-3 font-mono text-gray-500">{new Date(log.created_at).toLocaleString('vi-VN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeSubTab === 'verifications' && (
        <div className="bg-vintage-sepia-100 p-6 rounded-xl border border-vintage-sepia-200 space-y-6 max-w-4xl mx-auto">
          <h3 className="font-serif font-bold text-lg text-vintage-sepia-900 flex items-center gap-2 border-b border-vintage-sepia-200 pb-2">
            <UserCheck size={18} className="text-vintage-gold" /> Phê duyệt xác minh hồ sơ CCCD
          </h3>

          {loadingVerifs ? (
            <div className="space-y-3">
              <Skeleton className="h-16 bg-vintage-sepia-50" />
            </div>
          ) : verifications.filter((v) => v.status === 'PENDING').length === 0 ? (
            <p className="text-xs text-warm-gray-700 italic">Không có hồ sơ xác minh CCCD nào đang chờ duyệt.</p>
          ) : (
            <div className="space-y-4">
              {verifications.filter((v) => v.status === 'PENDING').map((v) => (
                <div
                  key={v.id}
                  className="p-4 bg-vintage-sepia-50 border border-vintage-sepia-200 rounded-lg space-y-3 text-xs"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-vintage-gold">Khách hàng</span>
                      <p className="font-bold text-sm text-vintage-sepia-900">{v.profiles.full_name}</p>
                      <p className="text-[10px] text-warm-gray-700">SĐT: {v.profiles.phone}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-vintage-gold">Thông tin CCCD</span>
                      <p className="text-xs text-warm-gray-900 font-mono font-bold">Số CCCD: {v.id_number}</p>
                    </div>
                  </div>

                  {/* Documents View Box */}
                  <div className="flex flex-wrap gap-4 p-3 bg-white rounded border border-vintage-sepia-200/50 justify-between items-center">
                    <span className="font-bold text-[10px] uppercase text-warm-gray-700">Tài liệu đính kèm:</span>
                    <div className="flex gap-4">
                      <a href={v.front_image_url} target="_blank" rel="noreferrer" className="text-xs font-bold text-vintage-gold hover:underline">Mặt trước CCCD ↗</a>
                      <a href={v.back_image_url} target="_blank" rel="noreferrer" className="text-xs font-bold text-vintage-gold hover:underline">Mặt sau CCCD ↗</a>
                      <a href={v.selfie_url} target="_blank" rel="noreferrer" className="text-xs font-bold text-vintage-gold hover:underline">Ảnh selfie đối chứng ↗</a>
                    </div>
                  </div>

                  {/* Review Actions */}
                  <div className="flex gap-4 pt-2 border-t border-vintage-sepia-200/50 justify-end">
                    <button
                      onClick={() => handleReviewVerification(v.id, 'REJECTED')}
                      className="px-4 py-2 rounded bg-film-red hover:bg-film-red-light text-white font-bold text-xs uppercase tracking-wider cursor-pointer font-bold"
                    >
                      Từ chối tài liệu
                    </button>
                    <button
                      onClick={() => handleReviewVerification(v.id, 'VERIFIED')}
                      className="px-4 py-2 rounded bg-muted-green-600 hover:bg-muted-green-800 text-white font-bold text-xs uppercase tracking-wider cursor-pointer font-bold"
                    >
                      Phê duyệt xác minh
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ADMIN SYSTEM AUTH TAB */}
      {activeSubTab === 'systemAuth' && currentUser?.role === 'ADMIN' && (
        <div className="space-y-6">
          {/* Sub Header */}
          <div className="border-b border-vintage-sepia-200 pb-3 flex justify-between items-center">
            <h3 className="font-serif font-bold text-lg text-vintage-sepia-900 flex items-center gap-2">
              <Users className="text-vintage-gold" /> Quản trị tài khoản nhân sự hệ thống
            </h3>
          </div>

          {/* Control Bar */}
          <div className="flex flex-col sm:flex-row gap-4 bg-vintage-sepia-100 p-4 rounded-xl border border-vintage-sepia-200 justify-between items-center text-xs">
            <div className="relative w-full sm:max-w-md">
              <input
                type="text"
                placeholder="Tìm kiếm nhân sự bằng họ tên hoặc email..."
                value={staffSearchTerm}
                onChange={(e) => setStaffSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-vintage-sepia-200 bg-vintage-sepia-50 focus:outline-none focus:border-vintage-gold text-xs text-warm-gray-900"
              />
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
            </div>

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
              <Plus size={16} /> Thêm nhân sự mới
            </button>
          </div>

          {/* Staff Table */}
          {loadingStaff ? (
            <div className="text-center py-12"><Loader2 className="animate-spin h-8 w-8 text-vintage-gold mx-auto" /></div>
          ) : filteredStaff.length === 0 ? (
            <p className="text-center py-8 text-xs text-warm-gray-700 italic">Không tìm thấy nhân sự nào.</p>
          ) : (
            <div className="bg-vintage-sepia-100 border border-vintage-sepia-200 rounded-xl overflow-hidden shadow-sm text-xs">
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

                            {/* Reset Password */}
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
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add Staff Modal */}
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

      {/* Reset Password Modal */}
      {isPasswordModalOpen && passwordTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 font-medium">
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
                  className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg font-mono text-warm-gray-900 focus:outline-none"
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
    </div>
  );
};
export default ProfileLogs;
