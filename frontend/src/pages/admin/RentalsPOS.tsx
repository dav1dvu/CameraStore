import React, { useState, useEffect } from 'react';
import { axiosClient } from '../../api/axiosClient.js';
import { useUIStore } from '../../store/uiStore.js';
import { 
  CheckSquare, Search, Plus, ShieldAlert, Award, Loader2, DollarSign
} from 'lucide-react';
import { formatVND } from '../../utils/currency';

interface Customer {
  id: string;
  full_name: string;
  phone_number?: string;
}

interface CameraModel {
  id: string;
  model_name: string;
  brand: string;
  rent_price_per_day: number;
}

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

export const RentalsPOS: React.FC = () => {
  const { addToast } = useUIStore();
  const [activeSubTab, setActiveSubTab] = useState<'checkin-out' | 'create-booking' | 'check-availability'>('checkin-out');

  // Checkin/out state
  const [bookingIdInput, setBookingIdInput] = useState('');
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loadingSearch, setLoadingSearch] = useState(false);

  // Settlement parameters
  const [isDamaged, setIsDamaged] = useState(false);
  const [damageCharge, setDamageCharge] = useState(0);
  const [notes, setNotes] = useState('');
  const [settlementResult, setSettlementResult] = useState<any | null>(null);

  // Today's checklists states
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [fetchingList, setFetchingList] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);

  const fetchEmployees = async () => {
    try {
      const res = await axiosClient.get('/employees');
      if (res.data.success) {
        setEmployees(res.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching employees:', err);
    }
  };

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
    fetchEmployees();
  }, []);

  // Date formatting helpers with Asia/Ho_Chi_Minh timezone
  const toLocalDateStr = (isoString: string) => {
    if (!isoString) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(isoString)) return isoString;
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

  const getSevenDaysLaterStr = () => {
    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    try {
      const formatter = new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      return formatter.format(sevenDaysLater);
    } catch {
      const year = sevenDaysLater.getFullYear();
      const month = String(sevenDaysLater.getMonth() + 1).padStart(2, '0');
      const day = String(sevenDaysLater.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  };

  const sevenDaysLaterStr = getSevenDaysLaterStr();

  // Delivery: start_date === today, status PENDING or CONFIRMED
  const todayDeliveryList = allBookings.filter((b: any) => {
    const bStartLocal = toLocalDateStr(b.start_date);
    return bStartLocal === todayStr && (b.status === 'PENDING' || b.status === 'CONFIRMED');
  });

  // Upcoming Delivery: start_date > today and <= 7 days, status PENDING or CONFIRMED
  const upcomingDeliveryList = allBookings.filter((b: any) => {
    const bStartLocal = toLocalDateStr(b.start_date);
    return bStartLocal > todayStr && bStartLocal <= sevenDaysLaterStr && (b.status === 'PENDING' || b.status === 'CONFIRMED');
  });

  // Return: status CHECKED_IN, end_date <= today
  const todayReturnList = allBookings.filter((b: any) => {
    const bEndLocal = toLocalDateStr(b.end_date);
    return b.status === 'CHECKED_IN' && bEndLocal <= todayStr;
  });

  // Upcoming Return: status CHECKED_IN, end_date > today and <= 7 days
  const upcomingReturnList = allBookings.filter((b: any) => {
    const bEndLocal = toLocalDateStr(b.end_date);
    return b.status === 'CHECKED_IN' && bEndLocal > todayStr && bEndLocal <= sevenDaysLaterStr;
  });

  const handleSelectBooking = async (id: string) => {
    setBookingIdInput(id);
    setLoadingSearch(true);
    setBooking(null);
    setSettlementResult(null);
    setIsEditingDates(false);
    try {
      const res = await axiosClient.get(`/bookings/${id}`);
      if (res.data.success) {
        const bData = res.data.data;
        setBooking(bData);
        addToast('Lấy chi tiết đơn đặt thành công', 'success');
      }
    } catch (err: any) {
      addToast(err.message || 'Không tìm thấy Mã đặt máy này', 'error');
    } finally {
      setLoadingSearch(false);
    }
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

  // Create Booking State
  const [loadingPOS, setLoadingPOS] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cameraModels, setCameraModels] = useState<CameraModel[]>([]);
  const [batteries, setBatteries] = useState<any[]>([]);
  const [selectedBatteryId, setSelectedBatteryId] = useState<string>('');
  const [batteryQty, setBatteryQty] = useState<number>(1);
  const [posForm, setPosForm] = useState({
    customerId: '',
    cameraModelId: '',
    startDate: '',
    endDate: '',
    depositAmount: '' as string
  });

  // Hour tracking state
  const [deliveredHour, setDeliveredHour] = useState('');
  const [returnedHour, setReturnedHour] = useState('');
  const [checkinDeposit, setCheckinDeposit] = useState('');

  const openCheckinModal = () => {
    setSelectedDeliveredBy('');
    setCheckinDeposit('');
    const now = new Date();
    const currentHourStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setDeliveredHour(currentHourStr);
    setShowCheckinModal(true);
  };

  const openCheckoutModal = () => {
    setSelectedReceivedBy('');
    const now = new Date();
    const currentHourStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setReturnedHour(currentHourStr);
    setShowCheckoutModal(true);
  };

  // Keyboard customer input + autocomplete states
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [showCustSuggestions, setShowCustSuggestions] = useState(false);
  const [suggestedCustomers, setSuggestedCustomers] = useState<Customer[]>([]);

  const handleCustomerNameChange = (val: string) => {
    setCustomerName(val);
    if (val.trim()) {
      const filtered = customers.filter(c => 
        c.full_name.toLowerCase().includes(val.toLowerCase()) || 
        c.phone_number?.includes(val)
      );
      setSuggestedCustomers(filtered.slice(0, 5));
      setShowCustSuggestions(true);
    } else {
      setSuggestedCustomers([]);
      setShowCustSuggestions(false);
    }
  };

  const handleSelectSuggestion = (c: any) => {
    setCustomerName(c.full_name);
    setCustomerPhone(c.phone_number || '');
    setCustomerAddress(c.address || '');
    setShowCustSuggestions(false);
  };

  // Check Availability State & Handler
  const [availForm, setAvailForm] = useState({
    modelId: '',
    startDate: '',
    endDate: ''
  });
  const [availLoading, setAvailLoading] = useState(false);
  const [availResult, setAvailResult] = useState<any | null>(null);

  const handleCheckAvailabilitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!availForm.modelId || !availForm.startDate || !availForm.endDate) {
      addToast('Vui lòng chọn đầy đủ thông tin mẫu máy và ngày', 'error');
      return;
    }

    setAvailLoading(true);
    setAvailResult(null);
    try {
      const res = await axiosClient.get(`/camera-models/${availForm.modelId}/availability`, {
        params: {
          start: availForm.startDate,
          end: availForm.endDate
        }
      });
      if (res.data.success) {
        setAvailResult(res.data.data);
      }
    } catch (err: any) {
      addToast(err.message || 'Lỗi khi kiểm tra tính khả dụng', 'error');
    } finally {
      setAvailLoading(false);
    }
  };

  const lookupBooking = async () => {
    if (!bookingIdInput) return;
    setLoadingSearch(true);
    setBooking(null);
    setSettlementResult(null);
    try {
      const res = await axiosClient.get(`/bookings/${bookingIdInput}`);
      if (res.data.success) {
        const bData = res.data.data;
        setBooking(bData);
        addToast('Lấy chi tiết đơn đặt thành công', 'success');
      }
    } catch (err: any) {
      addToast(err.message || 'Không tìm thấy Mã đặt máy này', 'error');
    } finally {
      setLoadingSearch(false);
    }
  };

  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [selectedDeliveredBy, setSelectedDeliveredBy] = useState<number | ''>('');

  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [selectedReceivedBy, setSelectedReceivedBy] = useState<number | ''>('');

  const handleCheckin = async (deliveredBy: number) => {
    if (!booking) return;
    try {
      const res = await axiosClient.post(`/bookings/${booking.id}/checkin`, {
        accessories: [],
        deliveredBy,
        gioNhan: deliveredHour,
        depositAmount: checkinDeposit
      });
      if (res.data.success) {
        addToast('Bàn giao máy thành công. Thiết bị chuyển sang trạng thái ĐANG THUÊ', 'success');
        setBooking({ 
          ...booking, 
          status: 'CHECKED_IN',
          deposit_amount: checkinDeposit || booking.deposit_amount,
          accessories_out: [] 
        });
        fetchAllBookings();
        setShowCheckinModal(false);
      }
    } catch (err: any) {
      addToast(err.message || 'Thao tác nhận máy thất bại', 'error');
    }
  };

  const handleSettleCheckout = async (receivedBy: number) => {
    if (!booking) return;
    try {
      // Financial checkout settlement
      const res = await axiosClient.post('/transactions/settle', {
        bookingId: booking.id,
        isDamaged,
        damageCharge,
        notes: 'Hoàn trả máy sạch sẽ',
        receivedBy,
        gioTra: returnedHour
      });

      if (res.data.success) {
        addToast('Quyết toán đặt cọc thành công. Ghi nhận trả máy.', 'success');
        setSettlementResult(res.data.data);
        setBooking({ 
          ...booking, 
          status: 'CHECKED_OUT',
          accessories_in: [] 
        });
        fetchAllBookings();
        setShowCheckoutModal(false);
      }
    } catch (err: any) {
      addToast(err.message || 'Quyết toán cọc thất bại', 'error');
    }
  };

  const handleCancelBooking = async () => {
    if (!booking) return;
    if (!window.confirm('Bạn có chắc chắn muốn hủy đơn đặt thuê này?')) return;
    try {
      const res = await axiosClient.post(`/bookings/${booking.id}/cancel`);
      if (res.data.success) {
        addToast('Hủy đơn hàng thành công', 'success');
        setBooking({ 
          ...booking, 
          status: 'CANCELED' 
        });
        fetchAllBookings();
      }
    } catch (err: any) {
      addToast(err.response?.data?.error || err.message || 'Hủy đơn hàng thất bại', 'error');
    }
  };

  // Fetch data for POS form
  const loadPOSData = async () => {
    setLoadingPOS(true);
    
    const now = new Date();
    const formatDateTimeLocal = (d: Date) => {
      const pad = (num: number) => String(num).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    setPosForm(prev => ({
      ...prev,
      startDate: formatDateTimeLocal(now),
      endDate: formatDateTimeLocal(tomorrow)
    }));

    try {
      const customersRes = await axiosClient.get('/customers');
      if (customersRes.data.success) {
        setCustomers(customersRes.data.data || []);
      }
      const modelsRes = await axiosClient.get('/camera-models');
      if (modelsRes.data.success) {
        // Deduplicate camera models by id to prevent extra dropdown entries
        const rawModels = modelsRes.data.data || [];
        const seenIds = new Set<string>();
        const uniqueModels = rawModels.filter((m: any) => {
          const id = String(m.id);
          if (seenIds.has(id)) return false;
          seenIds.add(id);
          return true;
        });
        setCameraModels(uniqueModels);
      }
      const productsRes = await axiosClient.get('/products?limit=1000');
      if (productsRes.data.success) {
        const rawProds = productsRes.data.data.products || productsRes.data.data || [];
        const batteryProds = rawProds.filter((p: any) => p.category?.name?.toLowerCase() === 'pin');
        setBatteries(batteryProds);
      }
    } catch (err: any) {
      console.warn('POS data load error, using fallbacks');
      setCustomers([{ id: 'c111-2222', full_name: 'Nguyễn Văn A' }]);
      setCameraModels([{ id: 'm111-2222', model_name: 'Canon AE-1', brand: 'Canon', rent_price_per_day: 150000 }]);
    } finally {
      setLoadingPOS(false);
    }
  };

  const handleCreateBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !posForm.cameraModelId || !posForm.startDate || !posForm.endDate) {
      addToast('Vui lòng nhập đầy đủ các trường bắt buộc', 'error');
      return;
    }

    try {
      setLoadingPOS(true);
      // 1. Find or create customer
      const custRes = await axiosClient.post('/customers/find-or-create', {
        fullName: customerName.trim(),
        phone: customerPhone ? customerPhone.trim() : undefined,
        address: customerAddress ? customerAddress.trim() : undefined
      });

      if (!custRes.data.success || !custRes.data.data) {
        throw new Error('Không thể đăng ký thông tin khách hàng');
      }

      const customerId = custRes.data.data.id;

      // 2. Create booking
      const res = await axiosClient.post('/bookings', {
        userId: customerId,
        cameraModelId: posForm.cameraModelId,
        startDate: posForm.startDate,
        endDate: posForm.endDate,
        batteryProductId: selectedBatteryId ? Number(selectedBatteryId) : undefined,
        batteryQuantity: selectedBatteryId ? Number(batteryQty) : undefined
      });
      if (res.data.success) {
        addToast('Tạo đơn đặt thuê máy ảnh thành công!', 'success');
        setCustomerName('');
        setCustomerPhone('');
        setCustomerAddress('');
        setSelectedBatteryId('');
        setBatteryQty(1);
        // Switch to lookup list & auto populate
        setBookingIdInput(res.data.data.id);
        setActiveSubTab('checkin-out');
        fetchAllBookings();
        // trigger reload lookup
        setTimeout(() => {
          document.getElementById('lookupBtn')?.click();
        }, 300);
      }
    } catch (err: any) {
      addToast(err.message || 'Lỗi khi tạo đơn đặt thuê máy', 'error');
    } finally {
      setLoadingPOS(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'create-booking' || activeSubTab === 'check-availability') {
      loadPOSData();
    }
  }, [activeSubTab]);

  return (
    <div className="py-4 space-y-8 font-medium">
      {/* Header */}
      <div className="border-b border-vintage-sepia-200 pb-4">
        <h1 className="font-serif font-extrabold text-3xl text-vintage-sepia-900 flex items-center gap-2">
          <CheckSquare className="text-vintage-gold" /> Lập đơn
        </h1>
        <p className="text-sm text-warm-gray-700 mt-1">
          Tạo và quản lý các đơn thuê thiết bị trực tiếp tại quầy.
        </p>
      </div>

      {/* Sub Tabs */}
      <div className="flex gap-2 border-b border-vintage-sepia-200 pb-px">
        <button
          onClick={() => setActiveSubTab('checkin-out')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-serif text-sm font-bold transition-all cursor-pointer ${
            activeSubTab === 'checkin-out'
              ? 'border-vintage-gold text-vintage-gold bg-vintage-sepia-100/50'
              : 'border-transparent text-warm-gray-700 hover:text-vintage-gold'
          }`}
        >
          <CheckSquare size={16} /> Nhận &amp; Trả máy (Check-in / Out)
        </button>
        <button
          onClick={() => setActiveSubTab('create-booking')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-serif text-sm font-bold transition-all cursor-pointer ${
            activeSubTab === 'create-booking'
              ? 'border-vintage-gold text-vintage-gold bg-vintage-sepia-100/50'
              : 'border-transparent text-warm-gray-700 hover:text-vintage-gold'
          }`}
        >
          <Plus size={16} /> Lập đơn đặt thuê tại quầy (POS)
        </button>

        <button
          onClick={() => setActiveSubTab('check-availability')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-serif text-sm font-bold transition-all cursor-pointer ${
            activeSubTab === 'check-availability'
              ? 'border-vintage-gold text-vintage-gold bg-vintage-sepia-100/50'
              : 'border-transparent text-warm-gray-700 hover:text-vintage-gold'
          }`}
        >
          <Loader2 size={16} className={availLoading ? 'animate-spin' : ''} /> Check ngày máy trống
        </button>
      </div>

      {/* SUBTAB 1: CHECK-IN / CHECK-OUT */}
      {activeSubTab === 'checkin-out' && (
        <div className="bg-vintage-sepia-100 p-6 rounded-xl border border-vintage-sepia-200 shadow-sm max-w-4xl mx-auto text-xs space-y-6">
          <div className="flex items-center gap-3 border-b border-vintage-sepia-200 pb-3">
            <Search className="text-vintage-gold h-5 w-5" />
            <h2 className="font-serif font-bold text-base text-vintage-sepia-900">Quét tìm kiếm đơn đặt thuê máy ảnh</h2>
          </div>

          <div className="flex gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={bookingIdInput}
                onChange={(e) => setBookingIdInput(e.target.value)}
                placeholder="Nhập mã Booking ID (định dạng UUID)..."
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-vintage-sepia-200 bg-vintage-sepia-50 focus:outline-none focus:border-vintage-gold text-sm text-warm-gray-900 font-mono"
              />
              <Search className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-gray-400" />
            </div>
            <button
              id="lookupBtn"
              onClick={lookupBooking}
              disabled={loadingSearch}
              className="px-6 py-3 rounded-lg bg-vintage-sepia-900 text-vintage-sepia-50 font-bold hover:bg-vintage-gold text-sm cursor-pointer disabled:opacity-50"
            >
              {loadingSearch ? 'Đang tìm...' : 'Tìm kiếm'}
            </button>
          </div>

          {/* Side-by-side delivery & return checklists */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-2">
            {/* Column 1: Today's and Upcoming Delivery Checklist */}
            <div className="bg-white p-4 rounded-lg border border-vintage-sepia-200 shadow-sm space-y-3">
              <h3 className="font-serif font-bold text-sm text-vintage-sepia-900 flex items-center gap-2 border-b border-vintage-sepia-150 pb-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                Đơn cần bàn giao (Hôm nay + Sắp tới)
              </h3>
              {fetchingList ? (
                <div className="text-center py-4 text-warm-gray-600">Đang tải danh sách...</div>
              ) : (
                <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
                  {/* Today */}
                  <div>
                    <div className="text-[10px] uppercase font-bold tracking-wider text-warm-gray-500 mb-1 border-b border-vintage-sepia-100 pb-0.5">Hôm nay ({todayDeliveryList.length})</div>
                    {todayDeliveryList.length === 0 ? (
                      <p className="text-xs text-warm-gray-400 italic pl-2 py-1">Không có đơn nào cần giao hôm nay.</p>
                    ) : (
                      <div className="divide-y divide-vintage-sepia-100">
                        {todayDeliveryList.map((b: any) => (
                          <div 
                            key={b.id} 
                            onClick={() => handleSelectBooking(b.id)}
                            className={`py-2 cursor-pointer hover:bg-vintage-sepia-50/50 rounded px-2 transition-colors flex justify-between items-center text-xs ${
                              bookingIdInput === b.id ? 'bg-vintage-sepia-100/70 border border-vintage-gold/30 font-bold' : ''
                            }`}
                          >
                            <div className="flex-1 min-w-0 pr-2">
                              <p className="font-bold text-vintage-sepia-900 truncate">{b.profiles?.full_name || 'Khách thuê'}</p>
                              <p className="text-[10px] text-warm-gray-600 truncate">
                                {b.equipment?.products?.name || 'Mẫu thiết bị'}
                              </p>
                            </div>
                            <div className="px-3 text-center border-x border-vintage-sepia-200/40">
                              <p className="text-base font-extrabold text-vintage-sepia-900 font-mono">
                                {b.gio_nhan || toLocalTimeStr(b.start_date)}
                              </p>
                            </div>
                            <div className="text-right flex-shrink-0 pl-2">
                              <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded uppercase">
                                {b.status}
                              </span>
                              <p className="text-[9px] text-warm-gray-500 font-mono mt-0.5">{toLocalDateStr(b.start_date)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Upcoming */}
                  <div>
                    <div className="text-[10px] uppercase font-bold tracking-wider text-warm-gray-500 mb-1 border-b border-vintage-sepia-100 pb-0.5">Sắp tới (7 ngày tới) ({upcomingDeliveryList.length})</div>
                    {upcomingDeliveryList.length === 0 ? (
                      <p className="text-xs text-warm-gray-400 italic pl-2 py-1">Không có đơn nào sắp tới.</p>
                    ) : (
                      <div className="divide-y divide-vintage-sepia-100">
                        {upcomingDeliveryList.map((b: any) => (
                          <div 
                            key={b.id} 
                            onClick={() => handleSelectBooking(b.id)}
                            className={`py-2 cursor-pointer hover:bg-vintage-sepia-50/50 rounded px-2 transition-colors flex justify-between items-center text-xs ${
                              bookingIdInput === b.id ? 'bg-vintage-sepia-100/70 border border-vintage-gold/30 font-bold' : ''
                            }`}
                          >
                            <div className="flex-1 min-w-0 pr-2">
                              <p className="font-bold text-vintage-sepia-900 truncate">{b.profiles?.full_name || 'Khách thuê'}</p>
                              <p className="text-[10px] text-warm-gray-600 truncate">
                                {b.equipment?.products?.name || 'Mẫu thiết bị'}
                              </p>
                            </div>
                            <div className="px-3 text-center border-x border-vintage-sepia-200/40">
                              <p className="text-base font-extrabold text-vintage-sepia-900 font-mono">
                                {b.gio_nhan || toLocalTimeStr(b.start_date)}
                              </p>
                            </div>
                            <div className="text-right flex-shrink-0 pl-2">
                              <span className="text-[9px] bg-blue-150 text-blue-800 font-bold px-1.5 py-0.5 rounded uppercase">
                                Sắp tới
                              </span>
                              <p className="text-[9px] text-warm-gray-500 font-mono mt-0.5">{toLocalDateStr(b.start_date)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Column 2: Today's & Upcoming Return Checklist */}
            <div className="bg-white p-4 rounded-lg border border-vintage-sepia-200 shadow-sm space-y-3">
              <h3 className="font-serif font-bold text-sm text-vintage-sepia-900 flex items-center gap-2 border-b border-vintage-sepia-150 pb-2">
                <span className="w-2.5 h-2.5 rounded-full bg-film-red" />
                Đơn cần nhận lại (Hôm nay/Trễ hạn + Sắp tới)
              </h3>
              {fetchingList ? (
                <div className="text-center py-4 text-warm-gray-600">Đang tải danh sách...</div>
              ) : (
                <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
                  {/* Today / Overdue */}
                  <div>
                    <div className="text-[10px] uppercase font-bold tracking-wider text-warm-gray-500 mb-1 border-b border-vintage-sepia-100 pb-0.5">Trễ hạn / Hôm nay ({todayReturnList.length})</div>
                    {todayReturnList.length === 0 ? (
                      <p className="text-xs text-warm-gray-400 italic pl-2 py-1">Không có đơn cần nhận lại hôm nay.</p>
                    ) : (
                      <div className="divide-y divide-vintage-sepia-100">
                        {todayReturnList.map((b: any) => {
                          const isOverdue = toLocalDateStr(b.end_date) < todayStr;
                          return (
                            <div 
                              key={b.id} 
                              onClick={() => handleSelectBooking(b.id)}
                              className={`py-2 cursor-pointer hover:bg-vintage-sepia-50/50 rounded px-2 transition-colors flex justify-between items-center text-xs ${
                                bookingIdInput === b.id ? 'bg-vintage-sepia-100/70 border border-vintage-gold/30 font-bold' : ''
                              }`}
                            >
                              <div className="flex-1 min-w-0 pr-2">
                                <p className="font-bold text-vintage-sepia-900 truncate">{b.profiles?.full_name || 'Khách thuê'}</p>
                                <p className="text-[10px] text-warm-gray-600 truncate">
                                  {b.equipment?.products?.name || 'Mẫu thiết bị'}
                                </p>
                              </div>
                              <div className="px-3 text-center border-x border-vintage-sepia-200/40">
                                <p className="text-base font-extrabold text-vintage-sepia-900 font-mono">
                                  {b.gio_tra || toLocalTimeStr(b.end_date)}
                                </p>
                              </div>
                              <div className="text-right flex-shrink-0 pl-2">
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                  isOverdue ? 'bg-red-150 text-film-red animate-pulse' : 'bg-vintage-gold/15 text-vintage-gold'
                                }`}>
                                  {isOverdue ? 'Trễ hạn' : 'Đang thuê'}
                                </span>
                                <p className="text-[9px] text-warm-gray-500 font-mono mt-0.5">{toLocalDateStr(b.end_date)}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Upcoming */}
                  <div>
                    <div className="text-[10px] uppercase font-bold tracking-wider text-warm-gray-500 mb-1 border-b border-vintage-sepia-100 pb-0.5">Sắp tới (7 ngày tới) ({upcomingReturnList.length})</div>
                    {upcomingReturnList.length === 0 ? (
                      <p className="text-xs text-warm-gray-400 italic pl-2 py-1">Không có đơn nào sắp trả lại.</p>
                    ) : (
                      <div className="divide-y divide-vintage-sepia-100">
                        {upcomingReturnList.map((b: any) => (
                          <div 
                            key={b.id} 
                            onClick={() => handleSelectBooking(b.id)}
                            className={`py-2 cursor-pointer hover:bg-vintage-sepia-50/50 rounded px-2 transition-colors flex justify-between items-center text-xs ${
                              bookingIdInput === b.id ? 'bg-vintage-sepia-100/70 border border-vintage-gold/30 font-bold' : ''
                            }`}
                          >
                            <div className="flex-1 min-w-0 pr-2">
                              <p className="font-bold text-vintage-sepia-900 truncate">{b.profiles?.full_name || 'Khách thuê'}</p>
                              <p className="text-[10px] text-warm-gray-600 truncate">
                                {b.equipment?.products?.name || 'Mẫu thiết bị'}
                              </p>
                            </div>
                            <div className="px-3 text-center border-x border-vintage-sepia-200/40">
                              <p className="text-base font-extrabold text-vintage-sepia-900 font-mono">
                                {b.gio_tra || toLocalTimeStr(b.end_date)}
                              </p>
                            </div>
                            <div className="text-right flex-shrink-0 pl-2">
                              <span className="text-[9px] bg-blue-150 text-blue-800 font-bold px-1.5 py-0.5 rounded uppercase">
                                Đang thuê
                              </span>
                              <p className="text-[9px] text-warm-gray-500 font-mono mt-0.5">{toLocalDateStr(b.end_date)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {booking && (
            <div className="space-y-6 pt-4">
              {/* Info panel */}
              <div className="grid grid-cols-2 gap-6 bg-vintage-sepia-50 p-5 rounded-lg border border-vintage-sepia-200">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-vintage-gold">Khách hàng</span>
                  <p className="font-serif font-semibold text-base text-vintage-sepia-900">{booking.profiles.full_name}</p>
                  <p className="text-xs text-warm-gray-700">{booking.profiles.phone}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-vintage-gold">Thiết bị cho thuê</span>
                  <p className="font-serif font-semibold text-base text-vintage-sepia-900">
                    {booking.equipment.products.brand} {booking.equipment.products.name}
                  </p>
                  <p className="text-xs text-warm-gray-700 font-mono">S/N: {booking.equipment.serial_number}</p>
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
                    <p className="text-xs font-semibold text-warm-gray-950 mt-0.5">
                      {booking.deposit_amount ? (isNaN(Number(booking.deposit_amount)) ? booking.deposit_amount : formatVND(Number(booking.deposit_amount))) : 'Không có'}
                    </p>
                  </div>
                )}
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-vintage-gold">Trạng thái</span>
                  <p className="text-sm mt-0.5">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      booking.status === 'PENDING' || booking.status === 'CONFIRMED' ? 'bg-amber-100 text-amber-800' :
                      booking.status === 'CHECKED_IN' ? 'bg-muted-green-200 text-muted-green-800' :
                      booking.status === 'CANCELED' || booking.status === 'CANCELLED' ? 'bg-red-100 text-red-800' : 'bg-gray-150 text-gray-700'
                    }`}>
                      {booking.status === 'PENDING' || booking.status === 'CONFIRMED' ? 'Chờ giao máy' :
                       booking.status === 'CHECKED_IN' ? 'Đang thuê' :
                       booking.status === 'CANCELED' || booking.status === 'CANCELLED' ? 'Đã hủy' : 'Đã hoàn trả'}
                    </span>
                  </p>
                </div>
              </div>

              {/* Handover Checkin Ghi Chú panel */}
              {(booking.status === 'CONFIRMED' || booking.status === 'PENDING') && (
                <div className="bg-vintage-sepia-50 p-5 rounded-lg border border-vintage-sepia-200 flex justify-end gap-3">
                  <button
                    onClick={handleCancelBooking}
                    className="px-5 py-2.5 rounded bg-red-600 hover:bg-red-700 text-white font-bold cursor-pointer transition-colors text-xs"
                  >
                    Hủy đơn
                  </button>
                  <button
                    onClick={openCheckinModal}
                    className="px-5 py-2.5 rounded bg-muted-green-600 hover:bg-muted-green-800 text-white font-bold cursor-pointer text-xs"
                  >
                    Xác nhận giao máy
                  </button>
                </div>
              )}

              {/* Checkout return & penalty panel */}
              {booking.status === 'CHECKED_IN' && !settlementResult && (
                <div className="border-t border-vintage-sepia-200 pt-6 space-y-5">
                  <h3 className="font-serif font-bold text-base text-vintage-sepia-900 flex items-center gap-2">
                    <ShieldAlert className="text-film-red" /> Nhận trả thiết bị &amp; Quyết toán cọc
                  </h3>

                  <div className="flex items-center gap-3 bg-vintage-sepia-50 p-4 rounded-lg">
                    <input
                      type="checkbox"
                      id="isDamaged"
                      checked={isDamaged}
                      onChange={(e) => setIsDamaged(e.target.checked)}
                      className="h-4 w-4 text-vintage-gold rounded focus:ring-vintage-gold"
                    />
                    <label htmlFor="isDamaged" className="text-sm font-semibold text-warm-gray-900 cursor-pointer">
                      Thiết bị trả về bị hư hỏng / trầy xước
                    </label>
                  </div>

                  {isDamaged && (
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-warm-gray-700 mb-1">
                        Chi phí đền bù hư hại (₫)
                      </label>
                      <input
                        type="number"
                        value={damageCharge}
                        onChange={(e) => setDamageCharge(Number(e.target.value))}
                        min="0"
                        placeholder="Vui lòng nhập chi phí đền bù..."
                        className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg text-xs"
                      />
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        openCheckoutModal();
                      }}
                      className="px-5 py-2.5 rounded bg-film-red text-white font-bold hover:bg-film-red-light text-xs uppercase cursor-pointer"
                    >
                      Xác nhận nhận máy
                    </button>
                  </div>
                </div>
              )}

              {/* Settle results */}
              {settlementResult && (
                <div className="border-t border-vintage-sepia-200 pt-6 space-y-4">
                  <h3 className="font-serif font-bold text-base text-vintage-sepia-900 flex items-center gap-2">
                    <Award className="text-muted-green-600" /> Kết quả quyết toán cọc
                  </h3>
                  <div className="bg-muted-green-50 p-5 rounded-lg border border-muted-green-200 text-xs space-y-2 max-w-md">
                    <div className="flex justify-between">
                      <span>Số ngày trễ hạn:</span>
                      <span className="font-bold">{settlementResult.overdue_days || 0} ngày</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tiền phạt trễ hạn:</span>
                      <span className="font-bold">{formatVND(settlementResult.overdue_charge || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Khấu trừ đền bù hỏng hóc:</span>
                      <span className="font-bold">{formatVND(settlementResult.damage_charge || 0)}</span>
                    </div>
                    <hr className="border-muted-green-200" />
                    <div className="flex justify-between text-sm font-bold text-muted-green-950">
                      <span>Hoàn trả lại cho khách:</span>
                      <span>{formatVND(settlementResult.refund_amount || 0)}</span>
                    </div>
                    {settlementResult.penalty_owed > 0 && (
                      <div className="flex justify-between text-film-red font-bold text-sm">
                        <span>Số tiền khách nợ thêm:</span>
                        <span>{formatVND(settlementResult.penalty_owed)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {showCheckinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-vintage-sepia-200 space-y-4 text-xs text-left">
            <h3 className="font-serif font-bold text-lg text-vintage-sepia-900">Chọn nhân viên bàn giao máy</h3>
            <p className="text-warm-gray-700">
              Vui lòng chọn nhân viên thực hiện quy trình bàn giao máy ảnh cho khách hàng:
            </p>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-warm-gray-700 mb-1">
                Nhân viên bàn giao
              </label>
              <select
                value={selectedDeliveredBy}
                onChange={e => setSelectedDeliveredBy(Number(e.target.value))}
                className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg text-xs"
              >
                <option value="">-- Chọn nhân viên --</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.staff_code} - {emp.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-warm-gray-700 mb-1">
                Giờ giao máy
              </label>
              <input
                type="time"
                value={deliveredHour}
                onChange={e => setDeliveredHour(e.target.value)}
                className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-warm-gray-700 mb-1">
                Đặt cọc (Có thể điền số hoặc chữ tùy ý, ví dụ: 1.500.000 hoặc Giữ CCCD)
              </label>
              <input
                type="text"
                placeholder="Nhập giá trị đặt cọc..."
                value={checkinDeposit}
                onChange={e => setCheckinDeposit(e.target.value)}
                className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg text-xs font-bold"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowCheckinModal(false)}
                className="px-4 py-2 rounded-lg border border-vintage-sepia-200 hover:bg-vintage-sepia-100 font-semibold text-warm-gray-800 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={() => {
                  if (!selectedDeliveredBy) {
                    addToast('Vui lòng chọn nhân viên bàn giao', 'error');
                    return;
                  }
                  handleCheckin(Number(selectedDeliveredBy));
                }}
                className="px-4 py-2 rounded-lg bg-muted-green-600 hover:bg-muted-green-800 text-white font-semibold transition-colors cursor-pointer"
              >
                Xác nhận bàn giao
              </button>
            </div>
          </div>
        </div>
      )}

      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-vintage-sepia-200 space-y-4 text-xs text-left">
            <h3 className="font-serif font-bold text-lg text-vintage-sepia-900">Chọn nhân viên nhận lại máy</h3>
            <p className="text-warm-gray-700">
              Vui lòng chọn nhân viên tiếp nhận lại thiết bị và làm thủ tục quyết toán cọc:
            </p>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-warm-gray-700 mb-1">
                Nhân viên nhận lại
              </label>
              <select
                value={selectedReceivedBy}
                onChange={e => setSelectedReceivedBy(Number(e.target.value))}
                className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg text-xs"
              >
                <option value="">-- Chọn nhân viên --</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.staff_code} - {emp.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-warm-gray-700 mb-1">
                Giờ nhận máy
              </label>
              <input
                type="time"
                value={returnedHour}
                onChange={e => setReturnedHour(e.target.value)}
                className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg text-xs"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowCheckoutModal(false)}
                className="px-4 py-2 rounded-lg border border-vintage-sepia-200 hover:bg-vintage-sepia-100 font-semibold text-warm-gray-800 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={() => {
                  if (!selectedReceivedBy) {
                    addToast('Vui lòng chọn nhân viên tiếp nhận', 'error');
                    return;
                  }
                  handleSettleCheckout(Number(selectedReceivedBy));
                }}
                className="px-4 py-2 rounded-lg bg-film-red hover:bg-film-red-light text-white font-semibold transition-colors cursor-pointer"
              >
                Xác nhận nhận máy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: CREATE BOOKING (POS DESK) */}
      {activeSubTab === 'create-booking' && (
        <div className="bg-vintage-sepia-100 p-6 rounded-xl border border-vintage-sepia-200 shadow-sm max-w-xl mx-auto">
          <div className="flex items-center gap-3 border-b border-vintage-sepia-200 pb-3 mb-6">
            <Plus className="text-vintage-gold h-5 w-5" />
            <h2 className="font-serif font-bold text-base text-vintage-sepia-900">Lập phiếu đặt thuê máy ảnh tại quầy</h2>
          </div>

          {loadingPOS ? (
            <div className="text-center py-8"><Loader2 className="animate-spin h-6 w-6 text-vintage-gold mx-auto" /></div>
          ) : (
            <form onSubmit={handleCreateBookingSubmit} className="space-y-4 text-xs">
              <div className="relative">
                <label className="block font-bold text-warm-gray-700 mb-1">Họ tên khách hàng *</label>
                <input
                  type="text"
                  required
                  placeholder="Nhập tên khách hàng..."
                  value={customerName}
                  onChange={(e) => handleCustomerNameChange(e.target.value)}
                  onFocus={() => setShowCustSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowCustSuggestions(false), 250)}
                  className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg focus:outline-none focus:border-vintage-gold"
                />
                {showCustSuggestions && suggestedCustomers.length > 0 && (
                  <div className="absolute z-10 w-full bg-white border border-vintage-sepia-200 rounded-lg mt-1 shadow-lg max-h-40 overflow-y-auto">
                    {suggestedCustomers.map(c => (
                      <div
                        key={c.id}
                        onMouseDown={() => handleSelectSuggestion(c)}
                        className="px-3 py-2 hover:bg-vintage-sepia-50 cursor-pointer text-left"
                      >
                        <span className="font-bold">{c.full_name}</span>
                        {c.phone_number && <span className="text-warm-gray-500 ml-2">({c.phone_number})</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-warm-gray-700 mb-1">Số điện thoại khách hàng (tùy chọn)</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: 0901234567"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg focus:outline-none focus:border-vintage-gold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-warm-gray-700 mb-1">Địa chỉ khách hàng (tùy chọn)</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: 123 Điện Biên Phủ, Quận 1"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg focus:outline-none focus:border-vintage-gold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-warm-gray-700 mb-1">Thiết bị / Mẫu máy thuê *</label>
                <select
                  required
                  value={posForm.cameraModelId}
                  onChange={(e) => setPosForm({ ...posForm, cameraModelId: e.target.value })}
                  className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg focus:outline-none focus:border-vintage-gold"
                >
                  <option value="">-- Chọn mẫu máy ảnh --</option>
                  {cameraModels.map(m => (
                    <option key={m.id} value={m.id}>{m.brand} {m.model_name} ({formatVND(m.rent_price_per_day)}/ngày)</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-warm-gray-700 mb-1">Ngày bắt đầu thuê *</label>
                  <div className="relative">
                    <input
                      type="datetime-local"
                      required
                      value={posForm.startDate}
                      onChange={(e) => setPosForm({ ...posForm, startDate: e.target.value })}
                      className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-bold text-warm-gray-700 mb-1">Ngày kết thúc thuê *</label>
                  <div className="relative">
                    <input
                      type="datetime-local"
                      required
                      value={posForm.endDate}
                      onChange={(e) => setPosForm({ ...posForm, endDate: e.target.value })}
                      className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-warm-gray-700 mb-1">Kèm thêm Pin (Tùy chọn)</label>
                  <select
                    value={selectedBatteryId}
                    onChange={(e) => {
                      setSelectedBatteryId(e.target.value);
                      if (!e.target.value) setBatteryQty(1);
                    }}
                    className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg focus:outline-none focus:border-vintage-gold"
                  >
                    <option value="">-- Không kèm pin --</option>
                    {batteries.map(b => (
                      <option key={b.id} value={b.id} disabled={b.availableStock <= 0}>
                        {b.brand} {b.name} (Tồn: {b.availableStock})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-warm-gray-700 mb-1">Số lượng pin</label>
                  <input
                    type="number"
                    min="1"
                    max={selectedBatteryId ? (batteries.find(b => String(b.id) === selectedBatteryId)?.availableStock || 1) : 1}
                    value={batteryQty}
                    onChange={(e) => setBatteryQty(Number(e.target.value))}
                    disabled={!selectedBatteryId}
                    className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              {/* Removed deposit input field as per requirement */}

              <div className="pt-4 border-t border-vintage-sepia-200 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded bg-vintage-sepia-900 text-vintage-sepia-50 font-bold hover:bg-vintage-gold cursor-pointer"
                >
                  Tạo đơn đặt &amp; Chuyển sang Check-in
                </button>
              </div>
            </form>
          )}
        </div>
      )}



      {/* SUBTAB 4: CHECK AVAILABILITY */}
      {activeSubTab === 'check-availability' && (
        <div className="bg-vintage-sepia-100 p-6 rounded-xl border border-vintage-sepia-200 shadow-sm max-w-xl mx-auto text-xs space-y-6">
          <div className="flex items-center gap-3 border-b border-vintage-sepia-200 pb-3">
            <Loader2 className="text-vintage-gold h-5 w-5" />
            <h2 className="font-serif font-bold text-base text-vintage-sepia-900">Kiểm tra số lượng máy ảnh trống</h2>
          </div>

          <form onSubmit={handleCheckAvailabilitySubmit} className="space-y-4">
            <div>
              <label className="block font-bold text-warm-gray-700 mb-1">Thiết bị / Mẫu máy thuê *</label>
              <select
                required
                value={availForm.modelId}
                onChange={(e) => setAvailForm({ ...availForm, modelId: e.target.value })}
                className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg focus:outline-none focus:border-vintage-gold"
              >
                <option value="">-- Chọn mẫu máy ảnh --</option>
                {cameraModels.map(m => (
                  <option key={m.id} value={m.id}>{m.brand} {m.model_name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-warm-gray-700 mb-1">Ngày bắt đầu thuê *</label>
                <input
                  type="date"
                  required
                  value={availForm.startDate}
                  onChange={(e) => setAvailForm({ ...availForm, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg focus:outline-none focus:border-vintage-gold"
                />
              </div>
              <div>
                <label className="block font-bold text-warm-gray-700 mb-1">Ngày kết thúc thuê *</label>
                <input
                  type="date"
                  required
                  value={availForm.endDate}
                  onChange={(e) => setAvailForm({ ...availForm, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-vintage-sepia-200 bg-white rounded-lg focus:outline-none focus:border-vintage-gold"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={availLoading}
                className="px-6 py-2.5 rounded bg-vintage-sepia-900 text-vintage-sepia-50 font-bold hover:bg-vintage-gold cursor-pointer flex items-center gap-2"
              >
                {availLoading && <Loader2 className="animate-spin h-3.5 w-3.5" />}
                Kiểm tra khả dụng
              </button>
            </div>
          </form>

          {availResult !== null && (
            <div className="bg-white p-5 rounded-lg border border-vintage-sepia-200 space-y-3">
              <h3 className="font-serif font-bold text-sm text-vintage-sepia-900 border-b border-vintage-sepia-150 pb-2">
                Kết quả kiểm tra khả dụng
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-bold text-warm-gray-500 uppercase">Tổng số máy trong kho:</span>
                  <p className="text-lg font-bold text-vintage-sepia-900">{availResult.totalEquipments || 0}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-warm-gray-500 uppercase">Số máy đang bận:</span>
                  <p className="text-lg font-bold text-film-red">{availResult.bookedCount || 0}</p>
                </div>
              </div>
              <div className="pt-2 border-t border-vintage-sepia-100 flex justify-between items-center">
                <span className="text-xs font-bold text-warm-gray-900 uppercase">Khả dụng cho thuê:</span>
                <span className={`text-xl font-extrabold px-3 py-1 rounded ${
                  availResult.availableCount > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {availResult.availableCount || 0} máy
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
export default RentalsPOS;
