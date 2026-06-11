import React, { useState, useEffect } from 'react';
import { axiosClient } from '../../api/axiosClient.js';
import { useUIStore } from '../../store/uiStore.js';
import { CheckinStation } from '../../components/booking/CheckinStation.js';
import { UserCheck } from 'lucide-react';
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

export const AdminDashboard: React.FC = () => {
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useUIStore();

  const fetchVerifications = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get('/profiles/verifications');
      if (res.data.success) {
        setVerifications(res.data.data);
      }
    } catch (err: any) {
      console.warn('API error, serving fallback verification list');
      // serve stub verifications to allow interface testing offline
      setVerifications([
        {
          id: 'v111-2222',
          id_number: '079123456789',
          status: 'PENDING',
          front_image_url: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&q=80&w=800',
          back_image_url: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&q=80&w=800',
          selfie_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800',
          profiles: { full_name: 'Nguyễn Văn A', phone: '0901234567' }
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVerifications();
  }, []);

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
        addToast(status === 'VERIFIED' ? 'Đã duyệt xác minh danh tính khách hàng thành công' : 'Đã từ chối tài liệu xác minh danh tính khách hàng', 'success');
        fetchVerifications();
      }
    } catch (err: any) {
      addToast(err.message || 'Thao tác phê duyệt hồ sơ lỗi', 'error');
    }
  };

  return (
    <div className="py-4 space-y-12">
      {/* Top Header */}
      <div className="border-b border-vintage-sepia-200 pb-4">
        <h1 className="font-serif font-extrabold text-3xl text-vintage-sepia-900">Hệ thống Quản lý của Nhân viên</h1>
        <p className="text-sm text-warm-gray-700 mt-1">Kiểm soát quy trình nhận máy, trả máy quyết toán cọc và xét duyệt hồ sơ xác minh CCCD khách hàng.</p>
      </div>

      {/* Grid columns */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-12 items-start">
        {/* Left Column - Lookup desks */}
        <div className="xl:col-span-2 space-y-8">
          <CheckinStation />
        </div>

        {/* Right Column - Verify CCCDs */}
        <div className="xl:col-span-1 space-y-6">
          <div className="bg-vintage-sepia-100 p-6 rounded-xl border border-vintage-sepia-200 space-y-6">
            <h3 className="font-serif font-bold text-lg text-vintage-sepia-900 flex items-center gap-2 border-b border-vintage-sepia-200 pb-2">
              <UserCheck size={18} className="text-vintage-gold" /> Duyệt xác minh danh tính
            </h3>

            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 bg-vintage-sepia-50" />
              </div>
            ) : verifications.filter((v) => v.status === 'PENDING').length === 0 ? (
              <p className="text-xs text-warm-gray-700 italic">Không có hồ sơ nào đang chờ duyệt.</p>
            ) : (
              <div className="space-y-4">
                {verifications.filter((v) => v.status === 'PENDING').map((v) => (
                  <div
                    key={v.id}
                    className="p-4 bg-vintage-sepia-50 border border-vintage-sepia-200 rounded-lg space-y-3 text-xs"
                  >
                    <div>
                      <p className="font-bold text-sm text-vintage-sepia-900">{v.profiles.full_name}</p>
                      <p className="text-[10px] text-warm-gray-700">SĐT: {v.profiles.phone}</p>
                      <p className="text-[10px] text-warm-gray-700 font-mono">Số CCCD: {v.id_number}</p>
                    </div>

                    {/* View Proof Mock Box */}
                    <div className="flex gap-2 p-2 bg-white rounded border border-vintage-sepia-200/50">
                      <a href={v.front_image_url} target="_blank" rel="noreferrer" className="text-[9px] font-semibold text-vintage-gold underline">Mặt trước CCCD</a>
                      <a href={v.back_image_url} target="_blank" rel="noreferrer" className="text-[9px] font-semibold text-vintage-gold underline">Mặt sau CCCD</a>
                      <a href={v.selfie_url} target="_blank" rel="noreferrer" className="text-[9px] font-semibold text-vintage-gold underline">Ảnh selfie chân dung</a>
                    </div>

                    {/* Review Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleReviewVerification(v.id, 'VERIFIED')}
                        className="flex-1 py-2 px-3 rounded bg-muted-green-600 hover:bg-muted-green-800 text-white font-bold text-[10px] uppercase tracking-wider cursor-pointer"
                      >
                        Duyệt xác minh
                      </button>
                      <button
                        onClick={() => handleReviewVerification(v.id, 'REJECTED')}
                        className="flex-1 py-2 px-3 rounded bg-film-red hover:bg-film-red-light text-white font-bold text-[10px] uppercase tracking-wider cursor-pointer"
                      >
                        Từ chối hồ sơ
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
