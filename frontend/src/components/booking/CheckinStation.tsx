import React, { useState, useEffect } from 'react';
import { ShieldAlert, CheckSquare, Search, Award, Plus, Check } from 'lucide-react';
import { axiosClient } from '../../api/axiosClient.js';
import { useUIStore } from '../../store/uiStore.js';
import { formatVND } from '../../utils/currency';

interface BookingDetail {
  id: string;
  status: string;
  start_date: string;
  end_date: string;
  deposit_amount: string | number;
  total_rental_fee: number;
  profiles: { full_name: string; phone: string };
  equipment: { serial_number: string; products: { name: string; brand: string } };
  accessories_out?: string[];
  accessories_in?: string[];
  gio_nhan?: string;
  gio_tra?: string;
}

export const CheckinStation: React.FC = () => {
  const [bookingId, setBookingId] = useState('');
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const { addToast } = useUIStore();

  // Handover Accessories (Check-in)
  const defaultAccessoriesList = ['Pin LP-E6', 'Sạc pin', 'Thẻ nhớ SD 32GB', 'Dây đeo máy', 'Bao da bảo vệ', 'Kính lọc UV'];
  const [selectedAccessories, setSelectedAccessories] = useState<string[]>(['Pin LP-E6', 'Sạc pin', 'Dây đeo máy']);
  const [customAccessory, setCustomAccessory] = useState('');
  const [checkinDeposit, setCheckinDeposit] = useState('');

  // Return Accessories (Check-out)
  const [returnedAccessories, setReturnedAccessories] = useState<string[]>([]);

  // Settlement Form parameters
  const [isDamaged, setIsDamaged] = useState(false);
  const [damageCharge, setDamageCharge] = useState(0);
  const [notes, setNotes] = useState('');
  const [settlementResult, setSettlementResult] = useState<any | null>(null);

  // Lists for daily delivery and return
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [fetchingList, setFetchingList] = useState(false);

  // Fetch all bookings for daily logs list
  const fetchAllBookings = async () => {
    setFetchingList(true);
    try {
      const res = await axiosClient.get('/bookings');
      if (res.data.success) {
        setAllBookings(res.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching bookings list:', err);
    } finally {
      setFetchingList(false);
    }
  };

  useEffect(() => {
    fetchAllBookings();
  }, []);

  const lookupBookingById = async (id: string) => {
    setLoading(true);
    setBooking(null);
    setSettlementResult(null);
    setCheckinDeposit('');
    try {
      const res = await axiosClient.get(`/bookings/${id}`);
      if (res.data.success) {
        const bData = res.data.data;
        setBooking(bData);
        if (bData.accessories_out) {
          setReturnedAccessories(bData.accessories_out);
        }
        addToast('Lấy chi tiết đơn đặt thành công', 'success');
      }
    } catch (err: any) {
      addToast(err.message || 'Không tìm thấy Mã đặt máy này', 'error');
    } finally {
      setLoading(false);
    }
  };

  const lookupBooking = async () => {
    if (!bookingId) return;
    await lookupBookingById(bookingId.trim());
  };

  const handleSelectBooking = (id: string) => {
    setBookingId(id);
    setIsEditingDates(false);
    lookupBookingById(id);
  };

  // Edit leasing duration states
  const [isEditingDates, setIsEditingDates] = useState(false);
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editGioNhan, setEditGioNhan] = useState('');
  const [editGioTra, setEditGioTra] = useState('');
  const [updatingDates, setUpdatingDates] = useState(false);

  const handleStartEditDates = () => {
    if (!booking) return;
    setEditStartDate(booking.start_date.substring(0, 10));
    setEditEndDate(booking.end_date.substring(0, 10));
    setEditGioNhan(booking.gio_nhan || toLocalTimeStr(booking.start_date));
    setEditGioTra(booking.gio_tra || toLocalTimeStr(booking.end_date));
    setIsEditingDates(true);
  };

  const handleSaveDates = async () => {
    if (!booking) return;
    if (!editStartDate || !editEndDate) {
      addToast('Vui lòng chọn đầy đủ ngày bắt đầu và kết thúc', 'error');
      return;
    }
    if (editStartDate > editEndDate) {
      addToast('Ngày kết thúc không được trước ngày bắt đầu', 'error');
      return;
    }

    setUpdatingDates(true);
    try {
      const res = await axiosClient.put(`/reports/order-history/booking/${booking.id}`, {
        startDate: editStartDate,
        endDate: editEndDate,
        gioNhan: editGioNhan,
        gioTra: editGioTra
      });

      if (res.data.success) {
        addToast('Cập nhật thời hạn thuê thành công', 'success');
        setIsEditingDates(false);
        // Refresh details
        const detailsRes = await axiosClient.get(`/bookings/${booking.id}`);
        if (detailsRes.data.success) {
          setBooking(detailsRes.data.data);
        }
        // Refresh lists
        fetchAllBookings();
      }
    } catch (err: any) {
      addToast(err.response?.data?.error || err.message || 'Lỗi khi cập nhật thời hạn thuê', 'error');
    } finally {
      setUpdatingDates(false);
    }
  };

  const handleToggleAccessory = (acc: string) => {
    if (selectedAccessories.includes(acc)) {
      setSelectedAccessories(selectedAccessories.filter((a) => a !== acc));
    } else {
      setSelectedAccessories([...selectedAccessories, acc]);
    }
  };

  const handleAddCustomAccessory = () => {
    if (customAccessory.trim() && !selectedAccessories.includes(customAccessory.trim())) {
      setSelectedAccessories([...selectedAccessories, customAccessory.trim()]);
      setCustomAccessory('');
    }
  };

  const handleToggleReturnAccessory = (acc: string) => {
    if (returnedAccessories.includes(acc)) {
      setReturnedAccessories(returnedAccessories.filter((a) => a !== acc));
    } else {
      setSelectedAccessories([...returnedAccessories, acc]);
    }
  };

  const handleCheckin = async () => {
    if (!booking) return;
    try {
      const res = await axiosClient.post(`/bookings/${booking.id}/checkin`, {
        accessories: selectedAccessories,
        depositAmount: checkinDeposit
      });
      if (res.data.success) {
        addToast('Nhận máy thành công. Thiết bị đã chuyển sang trạng thái ĐANG THUÊ', 'success');
        setBooking({ 
          ...booking, 
          status: 'CHECKED_IN',
          deposit_amount: checkinDeposit || booking.deposit_amount,
          accessories_out: selectedAccessories 
        });
        setReturnedAccessories(selectedAccessories);
        fetchAllBookings(); // Reload summary lists
      }
    } catch (err: any) {
      addToast(err.message || 'Thao tác nhận máy thất bại', 'error');
    }
  };

  const handleSettleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking) return;
    try {
      // 1. Record accessories return status first if there were accessories checked out
      if (booking.accessories_out && booking.accessories_out.length > 0) {
        if (returnedAccessories.length === 0) {
          if (!window.confirm('Cảnh báo: Khách hàng chưa trả bất kỳ phụ kiện nào. Bạn vẫn muốn tiếp tục quyết toán cọc?')) {
            return;
          }
        }
        await axiosClient.post(`/bookings/${booking.id}/return-accessories`, {
          accessories: returnedAccessories
        });
      }

      // 2. Perform financial settlement
      const res = await axiosClient.post('/transactions/settle', {
        bookingId: booking.id,
        isDamaged,
        damageCharge,
        notes: notes || 'Hoàn trả máy sạch sẽ'
      });

      if (res.data.success) {
        addToast('Quyết toán đặt cọc thành công. Đã ghi nhận trả máy.', 'success');
        setSettlementResult(res.data.data);
        setBooking({ 
          ...booking, 
          status: 'CHECKED_OUT',
          accessories_in: returnedAccessories 
        });
        fetchAllBookings(); // Reload summary lists
      }
    } catch (err: any) {
      addToast(err.message || 'Quyết toán cọc thất bại', 'error');
    }
  };

  // Date formatting helpers with Asia/Ho_Chi_Minh timezone
  const toLocalDateStr = (isoString: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    try {
      const formatter = new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      return formatter.format(date);
    } catch {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  };

  const toLocalTimeStr = (isoString: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    try {
      const formatter = new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Asia/Ho_Chi_Minh',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      return formatter.format(date);
    } catch {
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    }
  };

  const getTodayStr = () => {
    const now = new Date();
    try {
      const formatter = new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      return formatter.format(now);
    } catch {
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  };

  const todayStr = getTodayStr();

  // Delivery: start_date === today, status PENDING or CONFIRMED
  const todayDeliveryList = allBookings.filter((b: any) => {
    const bStartLocal = toLocalDateStr(b.start_date);
    return bStartLocal === todayStr && (b.status === 'PENDING' || b.status === 'CONFIRMED');
  });

  // Return: status CHECKED_IN, end_date <= today
  const todayReturnList = allBookings.filter((b: any) => {
    const bEndLocal = toLocalDateStr(b.end_date);
    return b.status === 'CHECKED_IN' && bEndLocal <= todayStr;
  });

  return (
    <div className="bg-vintage-sepia-50 p-6 rounded-xl border border-vintage-sepia-200 shadow-sm max-w-4xl mx-auto text-xs">
      <div className="flex items-center gap-3 border-b border-vintage-sepia-200 pb-4 mb-6">
        <CheckSquare className="text-vintage-gold h-6 w-6" />
        <h2 className="font-serif font-bold text-xl text-vintage-sepia-900">Quầy Nhận / Trả Máy Ảnh</h2>
      </div>

      {/* Booking Lookup */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <input
            type="text"
            value={bookingId}
            onChange={(e) => setBookingId(e.target.value)}
            placeholder="Quét hoặc nhập Mã đơn đặt máy ảnh (Booking ID UUID)..."
            className="w-full pl-10 pr-4 py-3 rounded-lg border border-vintage-sepia-200 bg-vintage-sepia-100 focus:outline-none focus:border-vintage-gold text-sm text-warm-gray-900 font-mono"
          />
          <Search className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-gray-400" />
        </div>
        <button
          onClick={lookupBooking}
          disabled={loading}
          className="px-6 py-3 rounded-lg bg-vintage-sepia-900 text-vintage-sepia-50 font-bold hover:bg-vintage-gold text-sm cursor-pointer disabled:opacity-50"
        >
          {loading ? 'Đang quét...' : 'Tìm kiếm'}
        </button>
      </div>

      {/* Side-by-side delivery & return checklists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Column 1: Today's Delivery Checklist */}
        <div className="bg-white p-4 rounded-lg border border-vintage-sepia-200 shadow-sm space-y-3">
          <h3 className="font-serif font-bold text-sm text-vintage-sepia-900 flex items-center gap-2 border-b border-vintage-sepia-150 pb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            Cần bàn giao hôm nay ({todayDeliveryList.length})
          </h3>
          {fetchingList ? (
            <div className="text-center py-4 text-warm-gray-600">Đang tải danh sách...</div>
          ) : todayDeliveryList.length === 0 ? (
            <p className="text-xs text-warm-gray-500 italic py-2">Không có đơn cần bàn giao hôm nay.</p>
          ) : (
            <div className="divide-y divide-vintage-sepia-100 max-h-60 overflow-y-auto pr-1">
              {todayDeliveryList.map((b: any) => (
                <div 
                  key={b.id} 
                  onClick={() => handleSelectBooking(b.id)}
                  className={`py-2.5 cursor-pointer hover:bg-vintage-sepia-50/50 rounded px-2 transition-colors flex justify-between items-center text-xs ${
                    bookingId === b.id ? 'bg-vintage-sepia-100/70 border border-vintage-gold/30' : ''
                  }`}
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="font-bold text-vintage-sepia-900 truncate">{b.profiles?.full_name || 'Khách thuê'}</p>
                    <p className="text-[10px] text-warm-gray-600 font-medium truncate">
                      {b.equipment?.products?.brand} {b.equipment?.products?.name}
                    </p>
                  </div>
                  <div className="px-3 text-center border-x border-vintage-sepia-200/40">
                    <p className="text-base font-extrabold text-vintage-sepia-900 font-mono">
                      {b.gio_nhan || toLocalTimeStr(b.start_date)}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 pl-2">
                    <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded uppercase">
                      {b.status}
                    </span>
                    <p className="text-[9px] text-warm-gray-500 mt-1 font-mono">{toLocalDateStr(b.start_date)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Column 2: Today's Return Checklist */}
        <div className="bg-white p-4 rounded-lg border border-vintage-sepia-200 shadow-sm space-y-3">
          <h3 className="font-serif font-bold text-sm text-vintage-sepia-900 flex items-center gap-2 border-b border-vintage-sepia-150 pb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-film-red" />
            Cần nhận lại hôm nay / trễ hạn ({todayReturnList.length})
          </h3>
          {fetchingList ? (
            <div className="text-center py-4 text-warm-gray-600">Đang tải danh sách...</div>
          ) : todayReturnList.length === 0 ? (
            <p className="text-xs text-warm-gray-500 italic py-2">Không có thiết bị cần nhận lại.</p>
          ) : (
            <div className="divide-y divide-vintage-sepia-100 max-h-60 overflow-y-auto pr-1">
              {todayReturnList.map((b: any) => {
                const isOverdue = toLocalDateStr(b.end_date) < todayStr;
                return (
                  <div 
                    key={b.id} 
                    onClick={() => handleSelectBooking(b.id)}
                    className={`py-2.5 cursor-pointer hover:bg-vintage-sepia-50/50 rounded px-2 transition-colors flex justify-between items-center text-xs ${
                      bookingId === b.id ? 'bg-vintage-sepia-100/70 border border-vintage-gold/30' : ''
                    }`}
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="font-bold text-vintage-sepia-900 truncate">{b.profiles?.full_name || 'Khách thuê'}</p>
                      <p className="text-[10px] text-warm-gray-600 font-medium truncate">
                        {b.equipment?.products?.brand} {b.equipment?.products?.name}
                      </p>
                    </div>
                    <div className="px-3 text-center border-x border-vintage-sepia-200/40">
                      <p className="text-base font-extrabold text-vintage-sepia-900 font-mono">
                        {b.gio_tra || toLocalTimeStr(b.end_date)}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 pl-2">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                        isOverdue ? 'bg-red-150 text-film-red animate-pulse' : 'bg-vintage-gold/15 text-vintage-gold'
                      }`}>
                        {isOverdue ? 'Trễ hạn' : 'Đang thuê'}
                      </span>
                      <p className="text-[9px] text-warm-gray-500 mt-1 font-mono">{toLocalDateStr(b.end_date)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {booking && (
        <div className="space-y-6">
          {/* Information summary */}
          <div className="grid grid-cols-2 gap-6 bg-vintage-sepia-100 p-5 rounded-lg border border-vintage-sepia-200">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-vintage-gold">Khách hàng</span>
              <p className="font-serif font-semibold text-lg text-vintage-sepia-900">{booking.profiles.full_name}</p>
              <p className="text-xs text-warm-gray-700">{booking.profiles.phone}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-vintage-gold">Thiết bị bàn giao</span>
              <p className="font-serif font-semibold text-base text-vintage-sepia-900">
                {booking.equipment.products.brand} {booking.equipment.products.name}
              </p>
              <p className="text-xs text-warm-gray-700 font-mono">Số S/N: {booking.equipment.serial_number}</p>
            </div>
            <div className="col-span-2 border-t border-vintage-sepia-200 pt-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-vintage-gold">Thời hạn thuê</span>
              {isEditingDates ? (
                <div className="space-y-3 mt-1.5 bg-vintage-sepia-100/30 p-3 rounded-lg border border-vintage-sepia-200/60">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                    <div>
                      <label className="block text-[10px] uppercase text-warm-gray-700 font-bold mb-1">Ngày &amp; Giờ bắt đầu</label>
                      <div className="flex gap-1.5">
                        <input
                          type="date"
                          value={editStartDate}
                          onChange={e => setEditStartDate(e.target.value)}
                          className="px-2.5 py-1.5 border border-vintage-sepia-200 bg-white rounded-lg text-xs w-full focus:outline-none focus:border-vintage-gold"
                        />
                        <input
                          type="time"
                          value={editGioNhan}
                          onChange={e => setEditGioNhan(e.target.value)}
                          className="px-2.5 py-1.5 border border-vintage-sepia-200 bg-white rounded-lg text-xs focus:outline-none focus:border-vintage-gold"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase text-warm-gray-700 font-bold mb-1">Ngày &amp; Giờ kết thúc</label>
                      <div className="flex gap-1.5">
                        <input
                          type="date"
                          value={editEndDate}
                          onChange={e => setEditEndDate(e.target.value)}
                          className="px-2.5 py-1.5 border border-vintage-sepia-200 bg-white rounded-lg text-xs w-full focus:outline-none focus:border-vintage-gold"
                        />
                        <input
                          type="time"
                          value={editGioTra}
                          onChange={e => setEditGioTra(e.target.value)}
                          className="px-2.5 py-1.5 border border-vintage-sepia-200 bg-white rounded-lg text-xs focus:outline-none focus:border-vintage-gold"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => setIsEditingDates(false)}
                      disabled={updatingDates}
                      className="px-3 py-1.5 rounded-lg border border-vintage-sepia-200 hover:bg-vintage-sepia-100 text-xs font-semibold text-warm-gray-800 transition-colors cursor-pointer"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveDates}
                      disabled={updatingDates}
                      className="px-3.5 py-1.5 rounded-lg bg-vintage-gold text-vintage-sepia-900 text-xs font-bold hover:bg-vintage-gold-light transition-colors cursor-pointer"
                    >
                      {updatingDates ? 'Đang lưu...' : 'Lưu'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between mt-1 bg-vintage-sepia-100/10 p-2 rounded border border-vintage-sepia-200/40">
                  <p className="text-xs font-semibold text-warm-gray-950 font-mono">
                    Từ {toLocalDateStr(booking.start_date)} ({booking.gio_nhan || toLocalTimeStr(booking.start_date)}) đến {toLocalDateStr(booking.end_date)} ({booking.gio_tra || toLocalTimeStr(booking.end_date)})
                  </p>
                  <button
                    type="button"
                    onClick={handleStartEditDates}
                    className="px-2.5 py-1 text-[10px] font-bold text-vintage-gold hover:text-vintage-sepia-950 border border-vintage-gold/50 rounded hover:bg-vintage-gold/15 transition-all cursor-pointer"
                  >
                    Chỉnh sửa
                  </button>
                </div>
              )}
            </div>
            {booking.status !== 'PENDING' && booking.status !== 'CONFIRMED' && (
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-vintage-gold">Đặt cọc</span>
                <p className="text-sm font-medium text-warm-gray-900 mt-0.5">
                  {booking.deposit_amount ? (isNaN(Number(booking.deposit_amount)) ? booking.deposit_amount : formatVND(Number(booking.deposit_amount))) : 'Không có'}
                </p>
              </div>
            )}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-vintage-gold">Trạng thái đơn</span>
              <p className="text-sm">
                <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                  booking.status === 'PENDING' || booking.status === 'CONFIRMED' ? 'bg-amber-100 text-amber-800' :
                  booking.status === 'CHECKED_IN' ? 'bg-muted-green-200 text-muted-green-855' :
                  'bg-gray-150 text-gray-700'
                }`}>
                  {booking.status === 'PENDING' || booking.status === 'CONFIRMED' ? 'Chờ nhận máy' :
                   booking.status === 'CHECKED_IN' ? 'Đang thuê' : 'Đã trả máy'}
                </span>
              </p>
            </div>
          </div>

          {/* Action modules depending on active status */}
          {(booking.status === 'CONFIRMED' || booking.status === 'PENDING') && (
            <div className="bg-vintage-sepia-100 p-5 rounded-lg border border-vintage-sepia-200 space-y-4">
              <h3 className="font-serif font-bold text-sm text-vintage-sepia-900 border-b border-vintage-sepia-200 pb-2">
                Danh sách phụ kiện bàn giao kèm máy
              </h3>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {defaultAccessoriesList.map((acc) => {
                  const isChecked = selectedAccessories.includes(acc);
                  return (
                    <label key={acc} className="flex items-center gap-2 p-2 bg-white rounded border border-vintage-sepia-250 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={isChecked}
                        onChange={() => handleToggleAccessory(acc)}
                        className="rounded text-vintage-gold focus:ring-vintage-gold h-3.5 w-3.5"
                      />
                      <span>{acc}</span>
                    </label>
                  );
                })}
              </div>

              {/* Custom accessory input */}
              <div className="flex gap-2 max-w-md">
                <input 
                  type="text" 
                  placeholder="Thêm phụ kiện khác (nhập tay)..."
                  value={customAccessory}
                  onChange={(e) => setCustomAccessory(e.target.value)}
                  className="flex-1 px-3 py-1.5 border border-vintage-sepia-200 bg-white rounded text-xs"
                />
                <button
                  type="button"
                  onClick={handleAddCustomAccessory}
                  className="px-3 py-1.5 rounded bg-vintage-gold text-vintage-sepia-900 font-bold hover:bg-vintage-gold-light cursor-pointer"
                >
                  <Plus size={14} />
                </button>
              </div>

              {/* Selected accessories tags summary */}
              {selectedAccessories.length > 0 && (
                <div className="pt-2">
                  <p className="text-[10px] font-bold text-warm-gray-700 uppercase">Phụ kiện bàn giao:</p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {selectedAccessories.map((acc) => (
                      <span key={acc} className="inline-flex items-center gap-1 bg-vintage-sepia-900 text-vintage-gold px-2 py-0.5 rounded font-bold text-[10px]">
                        <Check size={10} /> {acc}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-vintage-sepia-200/50 space-y-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-warm-gray-700 mb-1">
                    Đặt cọc (Có thể điền số hoặc chữ tùy ý, ví dụ: 1.500.000 hoặc Giữ CCCD)
                  </label>
                  <input
                    type="text"
                    placeholder="Nhập giá trị đặt cọc..."
                    value={checkinDeposit}
                    onChange={e => setCheckinDeposit(e.target.value)}
                    className="w-full max-w-md px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg text-xs font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleCheckin}
                  className="px-6 py-2.5 rounded bg-muted-green-600 hover:bg-muted-green-800 text-white font-bold cursor-pointer"
                >
                  Xác nhận Nhận máy (Bàn giao cho khách)
                </button>
              </div>
            </div>
          )}

          {booking.status === 'CHECKED_IN' && !settlementResult && (
            <form onSubmit={handleSettleCheckout} className="border-t border-vintage-sepia-200 pt-6 space-y-5">
              <h3 className="font-serif font-bold text-lg text-vintage-sepia-900 flex items-center gap-2">
                <ShieldAlert className="text-film-red" /> Trả máy &amp; Quyết toán tiền đặt cọc
              </h3>

              {/* Accessories return verification checklist */}
              {booking.accessories_out && booking.accessories_out.length > 0 && (
                <div className="bg-vintage-sepia-100 p-4 rounded-lg border border-vintage-sepia-200 space-y-3">
                  <p className="font-bold text-vintage-sepia-900">Đối chiếu danh sách phụ kiện khách trả:</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {booking.accessories_out.map((acc) => {
                      const isReturned = returnedAccessories.includes(acc);
                      return (
                        <label key={acc} className={`flex items-center gap-2 p-2 rounded border cursor-pointer ${
                          isReturned ? 'bg-muted-green-50 border-muted-green-200 text-muted-green-800' : 'bg-red-50 border-red-200 text-red-800'
                        }`}>
                          <input 
                            type="checkbox"
                            checked={isReturned}
                            onChange={() => handleToggleReturnAccessory(acc)}
                            className="rounded focus:ring-vintage-gold h-3.5 w-3.5"
                          />
                          <span className="font-medium">{acc}</span>
                        </label>
                      );
                    })}
                  </div>
                  {returnedAccessories.length < booking.accessories_out.length && (
                    <p className="text-[10px] text-film-red font-bold">
                      ⚠️ Cảnh báo: Có phụ kiện bị thiếu hụt! Vui lòng tính phụ phí đền bù hoặc ghi chú tình trạng bên dưới.
                    </p>
                  )}
                </div>
              )}

              <div className="flex items-center gap-3 bg-vintage-sepia-100 p-4 rounded-lg">
                <input
                  type="checkbox"
                  id="isDamaged"
                  checked={isDamaged}
                  onChange={(e) => setIsDamaged(e.target.checked)}
                  className="h-4 w-4 text-vintage-gold rounded focus:ring-vintage-gold"
                />
                <label htmlFor="isDamaged" className="text-sm font-semibold text-warm-gray-900 cursor-pointer">
                  Thiết bị có bị trầy xước, hỏng hóc hay không?
                </label>
              </div>

              {isDamaged && (
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-warm-gray-700 mb-1">
                    Phụ phí đền bù hư hại (₫)
                  </label>
                  <input
                    type="number"
                    value={damageCharge}
                    onChange={(e) => setDamageCharge(Number(e.target.value))}
                    min="0"
                    placeholder="Chi phí sửa chữa máy..."
                    className="w-full px-3 py-2 border border-vintage-sepia-200 bg-vintage-sepia-100 rounded-lg text-xs"
                  />
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-warm-gray-700 mb-1">
                  Biên bản ghi nhận tình trạng máy khi trả
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ghi chú vết xước thân vỏ, bụi kính ống kính, kết quả test màn trập cơ học..."
                  rows={3}
                  className="w-full px-3 py-2 border border-vintage-sepia-200 bg-vintage-sepia-100 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-3 rounded-lg bg-film-red text-white font-bold hover:bg-film-red-light text-sm cursor-pointer"
                >
                  Xác nhận Trả máy &amp; Khấu trừ tự động
                </button>
              </div>
            </form>
          )}

          {/* Settle results preview */}
          {settlementResult && (
            <div className="border-t border-vintage-sepia-200 pt-6 space-y-4">
              <h3 className="font-serif font-bold text-lg text-vintage-sepia-900 flex items-center gap-2">
                <Award className="text-muted-green-600" /> Báo cáo chi tiết quyết toán cọc
              </h3>
              <div className="bg-muted-green-50 p-5 rounded-lg border border-muted-green-200 text-xs space-y-2">
                <div className="flex justify-between">
                  <span>Số ngày trễ hạn:</span>
                  <span className="font-bold">{settlementResult.overdue_days} ngày</span>
                </div>
                <div className="flex justify-between">
                  <span>Phạt trả máy trễ hạn:</span>
                  <span className="font-bold">{formatVND(settlementResult.overdue_charge)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Phụ phí đền bù hỏng hóc:</span>
                  <span className="font-bold">{formatVND(settlementResult.damage_charge)}</span>
                </div>
                <hr className="border-muted-green-200" />
                <div className="flex justify-between text-base font-bold">
                  <span>Hoàn trả lại khách hàng:</span>
                  <span>{formatVND(settlementResult.refund_amount)}</span>
                </div>
                {settlementResult.penalty_owed > 0 && (
                  <div className="flex justify-between text-film-red font-bold">
                    <span>Số tiền khách cần đóng thêm:</span>
                    <span>{formatVND(settlementResult.penalty_owed)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
