import { supabaseAdmin } from '../../config/supabase.js';
import { calculateRentalDaysWithThreshold } from '../rentals-pos/booking.service.js';


function toHanoiDateStr(dateInput: Date | string): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '';
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
}

export class ReportingService {
  static async getRevenueReport(year: number, period: 'monthly' | 'quarterly') {
    const startOfYear = `${year}-01-01T00:00:00.000Z`;
    const endOfYear = `${year}-12-31T23:59:59.999Z`;

    // 1. Query Bookings (Rental + Penalty revenue)
    const { data: bookings, error: bookingsErr } = await supabaseAdmin
      .from('bookings')
      .select('total_rent_fee, penalty_fee, created_at')
      .gte('created_at', startOfYear)
      .lte('created_at', endOfYear);

    if (bookingsErr) throw bookingsErr;

    // 2. Query Orders (Purchase revenue)
    const { data: orders, error: ordersErr } = await supabaseAdmin
      .from('orders')
      .select('total_price, created_at')
      .not('status', 'in', '("CANCELLED","CANCELED")')
      .gte('created_at', startOfYear)
      .lte('created_at', endOfYear);

    if (ordersErr) throw ordersErr;

    const listBookings = bookings || [];
    const listOrders = orders || [];

    const initStats = () => ({
      purchase: 0,
      rental: 0,
      penalty: 0,
      surcharge: 0,
      refund: 0,
      netRevenue: 0
    });

    if (period === 'quarterly') {
      const quarters = {
        Q1: initStats(),
        Q2: initStats(),
        Q3: initStats(),
        Q4: initStats()
      };

      listBookings.forEach((b) => {
        const date = new Date(b.created_at);
        const month = date.getMonth(); // 0-11
        let qKey: 'Q1' | 'Q2' | 'Q3' | 'Q4' = 'Q1';
        if (month >= 3 && month <= 5) qKey = 'Q2';
        else if (month >= 6 && month <= 8) qKey = 'Q3';
        else if (month >= 9) qKey = 'Q4';

        quarters[qKey].rental += Number(b.total_rent_fee || 0);
        quarters[qKey].penalty += Number(b.penalty_fee || 0);
      });

      listOrders.forEach((o) => {
        const date = new Date(o.created_at);
        const month = date.getMonth(); // 0-11
        let qKey: 'Q1' | 'Q2' | 'Q3' | 'Q4' = 'Q1';
        if (month >= 3 && month <= 5) qKey = 'Q2';
        else if (month >= 6 && month <= 8) qKey = 'Q3';
        else if (month >= 9) qKey = 'Q4';

        quarters[qKey].purchase += Number(o.total_price || 0);
      });

      // Calculate net revenue
      Object.keys(quarters).forEach((key) => {
        const q = quarters[key as keyof typeof quarters];
        q.netRevenue = q.purchase + q.rental + q.penalty;
      });

      return quarters;
    } else {
      // Monthly by default
      const months: Record<string, any> = {};
      for (let m = 1; m <= 12; m++) {
        months[`Tháng ${m}`] = initStats();
      }

      listBookings.forEach((b) => {
        const date = new Date(b.created_at);
        const mIdx = date.getMonth() + 1; // 1-12
        const mKey = `Tháng ${mIdx}`;

        months[mKey].rental += Number(b.total_rent_fee || 0);
        months[mKey].penalty += Number(b.penalty_fee || 0);
      });

      listOrders.forEach((o) => {
        const date = new Date(o.created_at);
        const mIdx = date.getMonth() + 1; // 1-12
        const mKey = `Tháng ${mIdx}`;

        months[mKey].purchase += Number(o.total_price || 0);
      });

      Object.keys(months).forEach((key) => {
        const m = months[key];
        m.netRevenue = m.purchase + m.rental + m.penalty;
      });

      return months;
    }
  }

  static async getTopRentals(limit = 10) {
    const { data: bookingEqs, error } = await supabaseAdmin
      .from('booking_equipments')
      .select(`
        booking_id,
        equipments (
          product_id,
          camera_models (
            id,
            model_name
          )
        )
      `);

    if (error) throw error;

    const freqMap: Record<string, { model: any; count: number }> = {};

    (bookingEqs || []).forEach((be: any) => {
      const eq = be.equipments;
      if (eq && eq.camera_models) {
        const model = eq.camera_models;
        if (!freqMap[model.id]) {
          freqMap[model.id] = {
            model,
            count: 0
          };
        }
        freqMap[model.id].count += 1;
      }
    });

    const sortedList = Object.values(freqMap)
      .map((item) => ({
        id: item.model.id,
        modelName: item.model.model_name,
        brand: '', // Real camera_models schema has no brand
        rentalCount: item.count
      }))
      .sort((a, b) => b.rentalCount - a.rentalCount)
      .slice(0, limit);

    return sortedList;
  }

  static async getEquipmentConditionReport() {
    const { data: equipments, error } = await supabaseAdmin
      .from('equipments')
      .select('status');

    if (error) throw error;

    const total = equipments ? equipments.length : 0;
    const counts = {
      AVAILABLE: 0,
      RENTED: 0,
      MAINTENANCE: 0,
      DAMAGED: 0
    };

    (equipments || []).forEach((eq) => {
      const statusKey = eq.status as keyof typeof counts;
      if (counts[statusKey] !== undefined) {
        counts[statusKey] += 1;
      }
    });

    const totalVal = total || 1;
    const breakdownArray = Object.entries(counts).map(([status, count]) => ({
      status,
      count,
      percentage: Number(((count / totalVal) * 100).toFixed(1))
    }));

    return {
      totalEquipments: total,
      breakdown: breakdownArray
    };
  }

  static async getDailyHistory(daysLimit = 30) {
    // 1. Get Sales (Orders)
    const { data: orders, error: ordersErr } = await supabaseAdmin
      .from('orders')
      .select(`
        order_id,
        created_at,
        total_price,
        status,
        customers (
          first_name,
          last_name
        )
      `)
      .not('status', 'in', '("CANCELLED","CANCELED")');

    if (ordersErr) throw ordersErr;

    // 2. Get Order Items separately since foreign key constraint is missing in database schema cache
    const { data: orderItems, error: itemsErr } = await supabaseAdmin
      .from('order_items')
      .select(`
        id,
        order_id,
        quantity,
        unit_price,
        products (
          name,
          brand
        )
      `);

    if (itemsErr) throw itemsErr;

    const orderItemsMap: Record<number, any[]> = {};
    (orderItems || []).forEach((item: any) => {
      if (!orderItemsMap[item.order_id]) {
        orderItemsMap[item.order_id] = [];
      }
      orderItemsMap[item.order_id].push(item);
    });

    // 3. Get Rentals (Bookings) with checkin_date IS NOT NULL
    const { data: bookings, error: bookingsErr } = await supabaseAdmin
      .from('bookings')
      .select(`
        id,
        checkin_date,
        checkout_date,
        end_date,
        total_rent_fee,
        booking_status,
        customers (
          first_name,
          last_name
        ),
        booking_equipments (
          equipments (
            camera_models (
              model_name,
              brand
            )
          )
        )
      `)
      .not('booking_status', 'in', '("CANCELLED","CANCELED")')
      .not('checkin_date', 'is', null);

    if (bookingsErr) throw bookingsErr;

    // 4. Process daily grouping
    const dailyMap: Record<string, any[]> = {};
    const today = new Date();
    
    // Initialize days in range
    for (let i = 0; i < daysLimit; i++) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = toHanoiDateStr(d);
      dailyMap[dateStr] = [];
    }

    // Process Orders (Sale item appears only on created_at date)
    (orders || []).forEach((order: any) => {
      const dateStr = toHanoiDateStr(order.created_at);
      if (dailyMap[dateStr] !== undefined) {
        const items = orderItemsMap[order.order_id] || [];
        items.forEach((item: any) => {
          dailyMap[dateStr].push({
            id: `order-item-${item.id || Math.random()}`,
            type: 'SALE',
            customerName: `${order.customers?.last_name || ''} ${order.customers?.first_name || ''}`.trim() || 'Khách lẻ',
            productName: `${item.products?.brand || ''} ${item.products?.name || ''}`.trim(),
            quantity: item.quantity,
            amount: Number(item.unit_price) * item.quantity,
            status: order.status,
            dateInfo: `Bán đứt ngày ${dateStr}`
          });
        });
      }
    });

    // Process Bookings (Rental item appears on all days from checkin_date to checkout_date or today if not checked out)
    (bookings || []).forEach((booking: any) => {
      const checkin = new Date(booking.checkin_date);
      // If not checked out yet, use today as endpoint for historical display
      const checkout = booking.checkout_date ? new Date(booking.checkout_date) : today;
      
      const checkinStr = toHanoiDateStr(booking.checkin_date);
      const checkoutStr = toHanoiDateStr(booking.checkout_date || today);

      // Find equipment & model name
      const equipLink = booking.booking_equipments?.[0];
      const model = (equipLink?.equipments as any)?.camera_models;
      const productName = model ? `${model.brand || ''} ${model.model_name || ''}`.trim() : 'Thiết bị thuê';

      Object.keys(dailyMap).forEach(dateKey => {
        const currentDate = new Date(dateKey);
        
        const currentMs = currentDate.setHours(0, 0, 0, 0);
        const checkinMs = new Date(checkinStr).setHours(0, 0, 0, 0);
        const checkoutMs = new Date(checkoutStr).setHours(0, 0, 0, 0);

        if (currentMs >= checkinMs && currentMs <= checkoutMs) {
          dailyMap[dateKey].push({
            id: `booking-${booking.id}-${dateKey}`,
            type: 'RENTAL',
            customerName: `${(booking.customers as any)?.last_name || ''} ${(booking.customers as any)?.first_name || ''}`.trim() || 'Khách thuê',
            productName,
            quantity: 1,
            amount: Number(booking.total_rent_fee),
            status: booking.booking_status,
            dateInfo: `Thuê từ ${checkinStr} đến ${booking.checkout_date ? checkoutStr : 'Chưa trả'}`
          });
        }
      });
    });

    // Format list sorted by date descending
    return Object.entries(dailyMap)
      .map(([date, items]) => ({
        date,
        itemsCount: items.length,
        items
      }))
      .filter(day => day.items.length > 0)
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  static async getOrderHistory(limit: number = 10, offset: number = 0, month?: number, year?: number, requestorRole?: string, tab?: string) {
    // 1. Fetch bookings
    let bookingsQuery = supabaseAdmin
      .from('bookings')
      .select(`
        id,
        created_at,
        start_date,
        end_date,
        total_rent_fee,
        booking_status,
        delivered_by,
        received_by,
        notes,
        battery_product_id,
        battery_quantity,
        gio_nhan,
        gio_tra,
        deposit_fee,
        customers (
          id,
          first_name,
          last_name,
          phone_number,
          address
        ),
        booking_equipments (
          equipments (
            camera_models (
              model_name
            )
          )
        ),
        battery:products!battery_product_id (
          name
        )
      `);

    // 2. Fetch employees to map delivered_by/received_by (must be before conditional blocks)
    const { data: employees } = await supabaseAdmin
      .from('employees')
      .select('id, full_name, staff_code');
    const empMap = new Map();
    if (employees) {
      employees.forEach((emp: any) => {
        empMap.set(emp.id, emp);
      });
    }

    // 3. Initialize history array and order data
    const history: any[] = [];
    let orders: any[] = [];
    let orderItems: any[] = [];

    if (requestorRole !== 'NHANVIENTHUE') {
      let ordersQuery = supabaseAdmin
        .from('orders')
        .select(`
          order_id,
          created_at,
          total_price,
          status,
          customers (
            id,
            first_name,
            last_name,
            phone_number,
            address
          )
        `);

      if (month && year) {
        const startDateStr = `${year}-${String(month).padStart(2, '0')}-01T00:00:00.000Z`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}T23:59:59.999Z`;

        bookingsQuery = bookingsQuery.gte('start_date', startDateStr).lte('start_date', endDateStr);
        ordersQuery = ordersQuery.gte('created_at', startDateStr).lte('created_at', endDateStr);
      }

      if (tab === 'placement') {
        bookingsQuery = bookingsQuery.in('booking_status', ['PENDING', 'CONFIRMED']);
        ordersQuery = ordersQuery.in('status', ['PENDING']);
      } else if (tab === 'fulfillment') {
        bookingsQuery = bookingsQuery.not('booking_status', 'in', '("PENDING","CONFIRMED")');
        ordersQuery = ordersQuery.not('status', 'in', '("PENDING")');
      }

      const { data: bookingsData, error: bookingsErr } = await bookingsQuery.order('created_at', { ascending: false });
      if (bookingsErr) throw bookingsErr;

      const { data: ordersData, error: ordersErr } = await ordersQuery.order('created_at', { ascending: false });
      if (ordersErr) throw ordersErr;

      // Fetch order_items separately due to missing schema cache relationship
      const { data: orderItemsData, error: itemsErr } = await supabaseAdmin
        .from('order_items')
        .select(`
          id,
          order_id,
          quantity,
          unit_price,
          products (
            name,
            brand
          )
        `);

      if (itemsErr) throw itemsErr;

      orders = ordersData || [];
      orderItems = orderItemsData || [];
      // Keep bookings as is
      (bookingsData || []).forEach((b: any) => {
        const equipName = b.booking_equipments?.[0]?.equipments?.camera_models?.model_name || 'Thiết bị thuê';
        history.push({
          id: `booking-${b.id}`,
          dbId: b.id,
          type: 'RENTAL',
          startDate: b.start_date,
          endDate: b.end_date,
          customerName: `${b.customers?.last_name || ''} ${b.customers?.first_name || ''}`.trim() || 'Khách thuê',
          customerPhone: b.customers?.phone_number || '',
          customerAddress: b.customers?.address || '',
          productName: equipName,
          revenue: Number(b.total_rent_fee || 0),
          status: b.booking_status,
          deliveredBy: b.delivered_by || null,
          deliveredByDetails: empMap.get(b.delivered_by) || null,
          receivedBy: b.received_by || null,
          receivedByDetails: empMap.get(b.received_by) || null,
          notes: b.notes || '',
          batteryName: b.battery?.name || null,
          batteryQuantity: b.battery_quantity || 0,
          gioNhan: b.gio_nhan || '',
          gioTra: b.gio_tra || '',
          depositFee: b.deposit_fee || '0',
          createdAt: b.created_at
        });
      });
    } else {
      if (month && year) {
        const startDateStr = `${year}-${String(month).padStart(2, '0')}-01T00:00:00.000Z`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}T23:59:59.999Z`;

        bookingsQuery = bookingsQuery.gte('start_date', startDateStr).lte('start_date', endDateStr);
      }

      if (tab === 'placement') {
        bookingsQuery = bookingsQuery.in('booking_status', ['PENDING', 'CONFIRMED']);
      } else if (tab === 'fulfillment') {
        bookingsQuery = bookingsQuery.not('booking_status', 'in', '("PENDING","CONFIRMED")');
      }

      const { data: bookingsData, error: bookingsErr } = await bookingsQuery.order('created_at', { ascending: false });
      if (bookingsErr) throw bookingsErr;

      (bookingsData || []).forEach((b: any) => {
        const equipName = b.booking_equipments?.[0]?.equipments?.camera_models?.model_name || 'Thiết bị thuê';
        history.push({
          id: `booking-${b.id}`,
          dbId: b.id,
          type: 'RENTAL',
          startDate: b.start_date,
          endDate: b.end_date,
          customerName: `${b.customers?.last_name || ''} ${b.customers?.first_name || ''}`.trim() || 'Khách thuê',
          customerPhone: b.customers?.phone_number || '',
          customerAddress: b.customers?.address || '',
          productName: equipName,
          revenue: Number(b.total_rent_fee || 0),
          status: b.booking_status,
          deliveredBy: b.delivered_by || null,
          deliveredByDetails: empMap.get(b.delivered_by) || null,
          receivedBy: b.received_by || null,
          receivedByDetails: empMap.get(b.received_by) || null,
          notes: b.notes || '',
          batteryName: b.battery?.name || null,
          batteryQuantity: b.battery_quantity || 0,
          gioNhan: b.gio_nhan || '',
          gioTra: b.gio_tra || '',
          depositFee: b.deposit_fee || '0',
          createdAt: b.created_at
        });
      });
    }

    const orderItemsMap: Record<string | number, any[]> = {};
    (orderItems || []).forEach((item: any) => {
      const oid = item.order_id;
      if (!orderItemsMap[oid]) {
        orderItemsMap[oid] = [];
      }
      orderItemsMap[oid].push(item);
    });

    // 4. Combine orders into history

    (orders || []).forEach((o: any) => {
      const oItems = orderItemsMap[o.order_id] || [];
      const prodName = oItems[0]?.products?.name || 'Sản phẩm';
      history.push({
        id: `order-${o.order_id}`,
        dbId: o.order_id,
        type: 'SALE',
        startDate: o.created_at,
        endDate: o.created_at,
        customerName: `${o.customers?.last_name || ''} ${o.customers?.first_name || ''}`.trim() || 'Khách mua',
        customerPhone: o.customers?.phone_number || '',
        customerAddress: o.customers?.address || '',
        productName: prodName,
        revenue: Number(o.total_price || 0),
        status: o.status,
        deliveredBy: null,
        deliveredByDetails: null,
        receivedBy: null,
        receivedByDetails: null,
        notes: '',
        depositFee: '-',
        createdAt: o.created_at
      });
    });

    // Sort combined history by createdAt descending
    history.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Paginate
    const paginated = history.slice(offset, offset + limit);

    return {
      total: history.length,
      items: paginated
    };
  }

  static async getOrderHistorySummary(month: number, year: number, requestorRole?: string) {
    const startDateStr = `${year}-${String(month).padStart(2, '0')}-01T00:00:00.000Z`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}T23:59:59.999Z`;

    // 1. Fetch bookings in month based on start_date
    const { data: bookings, error: bookingsErr } = await supabaseAdmin
      .from('bookings')
      .select(`
        total_rent_fee,
        booking_status,
        booking_equipments (
          equipments (
            camera_models (
              model_name
            )
          )
        )
      `)
      .gte('start_date', startDateStr)
      .lte('start_date', endDateStr);

    if (bookingsErr) throw bookingsErr;

    // 2. Fetch orders in month based on created_at
    let orders: any[] = [];
    let orderItems: any[] = [];

    if (requestorRole !== 'NHANVIENTHUE') {
      const { data: ordersData, error: ordersErr } = await supabaseAdmin
        .from('orders')
        .select(`
          order_id,
          total_price,
          status
        `)
        .not('status', 'in', '("CANCELLED","CANCELED")')
        .gte('created_at', startDateStr)
        .lte('created_at', endDateStr);

      if (ordersErr) throw ordersErr;
      orders = ordersData || [];

      // Fetch order_items separately
      const { data: orderItemsData, error: itemsErr } = await supabaseAdmin
        .from('order_items')
        .select(`
          order_id,
          quantity,
          unit_price,
          products (
            name
          )
        `);

      if (itemsErr) throw itemsErr;
      orderItems = orderItemsData || [];
    }

    const orderItemsMap: Record<string | number, any[]> = {};
    (orderItems || []).forEach((item: any) => {
      const oid = item.order_id;
      if (!orderItemsMap[oid]) {
        orderItemsMap[oid] = [];
      }
      orderItemsMap[oid].push(item);
    });

    let totalRevenue = 0;
    const revenueByModel: Record<string, number> = {};

    (bookings || []).forEach((b: any) => {
      const rev = Number(b.total_rent_fee || 0);
      totalRevenue += rev;

      const modelName = b.booking_equipments?.[0]?.equipments?.camera_models?.model_name || 'Thiết bị thuê khác';
      revenueByModel[modelName] = (revenueByModel[modelName] || 0) + rev;
    });

    (orders || []).forEach((o: any) => {
      const rev = Number(o.total_price || 0);
      totalRevenue += rev;

      const items = orderItemsMap[o.order_id] || [];
      const modelName = items[0]?.products?.name || 'Sản phẩm mua khác';
      revenueByModel[modelName] = (revenueByModel[modelName] || 0) + rev;
    });

    const modelsSummary = Object.entries(revenueByModel).map(([modelName, revenue]) => ({
      modelName,
      revenue
    }));

    return {
      totalRevenue,
      modelsSummary
    };
  }

  static async updateOrderHistoryItem(type: string, id: string | number, fields: any) {
    if (type === 'booking') {
      const dbId = Number(id);

      // 1. Get the booking to find customer_id and get equipment rate
      const { data: booking, error: getErr } = await supabaseAdmin
        .from('bookings')
        .select(`
          customer_id,
          start_date,
          end_date,
          gio_nhan,
          gio_tra,
          total_rent_fee,
          booking_equipments (
            equipments (
              products (
                rent_price_per_day
              )
            )
          )
        `)
        .eq('id', dbId)
        .single();

      if (getErr) throw getErr;

      // 2. Update customer details if provided
      if (booking?.customer_id) {
        const custUpdates: any = {};
        if (fields.customerName) {
          const parts = fields.customerName.trim().split(/\s+/);
          if (parts.length === 1) {
            custUpdates.first_name = parts[0];
            custUpdates.last_name = '';
          } else {
            custUpdates.first_name = parts[parts.length - 1];
            custUpdates.last_name = parts.slice(0, -1).join(' ');
          }
        }
        if (fields.customerPhone !== undefined) {
          custUpdates.phone_number = fields.customerPhone || null;
        }
        if (Object.keys(custUpdates).length > 0) {
          await supabaseAdmin
            .from('customers')
            .update(custUpdates)
            .eq('id', booking.customer_id);
        }
      }

      // 3. Update booking details
      let finalStart = fields.startDate !== undefined ? fields.startDate : booking.start_date;
      let finalEnd = fields.endDate !== undefined ? fields.endDate : booking.end_date;
      const finalGioNhan = fields.gioNhan !== undefined ? fields.gioNhan : booking.gio_nhan;
      const finalGioTra = fields.gioTra !== undefined ? fields.gioTra : booking.gio_tra;

      // Normalize both dates by extracting YYYY-MM-DD and appending T00:00:00.000Z to prevent check_dates constraint violations due to timezone/time mismatches
      const startStr = finalStart.substring(0, 10);
      const endStr = finalEnd.substring(0, 10);
      finalStart = `${startStr}T00:00:00.000Z`;
      finalEnd = `${endStr}T00:00:00.000Z`;

      if (startStr > endStr) {
        throw new Error('Ngày trả không được trước ngày giao máy');
      }

      if (startStr === endStr && finalGioNhan && finalGioTra) {
        const parseTimeToMinutes = (timeStr: string): number | null => {
          if (!timeStr || !timeStr.includes(':')) return null;
          const [hours, minutes] = timeStr.split(':').map(Number);
          if (isNaN(hours) || isNaN(minutes)) return null;
          return hours * 60 + minutes;
        };

        const nhanMin = parseTimeToMinutes(finalGioNhan);
        const traMin = parseTimeToMinutes(finalGioTra);

        if (nhanMin !== null && traMin !== null && traMin <= nhanMin) {
          throw new Error('Nếu giao và trả trong cùng một ngày, giờ trả phải muộn hơn giờ giao');
        }
      }

      const bookingUpdates: any = {};
      if (fields.startDate !== undefined) bookingUpdates.start_date = finalStart;
      if (fields.endDate !== undefined) bookingUpdates.end_date = finalEnd;
      if (fields.status !== undefined) bookingUpdates.booking_status = fields.status;
      if (fields.deliveredBy !== undefined) bookingUpdates.delivered_by = fields.deliveredBy ? Number(fields.deliveredBy) : null;
      if (fields.receivedBy !== undefined) bookingUpdates.received_by = fields.receivedBy ? Number(fields.receivedBy) : null;
      if (fields.notes !== undefined) bookingUpdates.notes = fields.notes;
      if (fields.gioNhan !== undefined) bookingUpdates.gio_nhan = fields.gioNhan;
      if (fields.gioTra !== undefined) bookingUpdates.gio_tra = fields.gioTra;
      if (fields.depositFee !== undefined) bookingUpdates.deposit_fee = fields.depositFee;

      // Check if user manually updated the revenue
      const currentRevenue = Number(booking?.total_rent_fee || 0);
      if (fields.revenue !== undefined && Number(fields.revenue) !== currentRevenue) {
        bookingUpdates.total_rent_fee = Number(fields.revenue);
      } else {
        // Recalculate revenue based on date/hour changes
        const pricePerDay = Number((booking as any)?.booking_equipments?.[0]?.equipments?.products?.rent_price_per_day || 0);
        const start = new Date(finalStart);
        const end = new Date(finalEnd);
        const days = calculateRentalDaysWithThreshold(start, end);
        const baseFee = pricePerDay * days;

        let extraCharge = 0;
        if (finalGioTra && typeof finalGioTra === 'string' && finalGioTra.includes(':')) {
          const [hours, minutes] = finalGioTra.split(':').map(Number);
          const minutesTotal = hours * 60 + minutes;

          const limit22 = 22 * 60;
          const limit22_30 = 22 * 60 + 30;

          if (minutesTotal > limit22 && minutesTotal <= limit22_30) {
            extraCharge = 0.5 * pricePerDay;
          } else if (minutesTotal > limit22_30) {
            extraCharge = 1.0 * pricePerDay;
          }
        }

        const finalRevenue = baseFee + extraCharge;
        bookingUpdates.total_rent_fee = finalRevenue;
      }

      const { data, error } = await supabaseAdmin
        .from('bookings')
        .update(bookingUpdates)
        .eq('id', dbId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } else if (type === 'order') {
      const dbId = Number(id);

      // 1. Get the order to find customer_id
      const { data: order, error: getErr } = await supabaseAdmin
        .from('orders')
        .select('customer_id')
        .eq('order_id', dbId)
        .single();

      if (getErr) throw getErr;

      // 2. Update customer details if provided
      if (order?.customer_id) {
        const custUpdates: any = {};
        if (fields.customerName) {
          const parts = fields.customerName.trim().split(/\s+/);
          if (parts.length === 1) {
            custUpdates.first_name = parts[0];
            custUpdates.last_name = '';
          } else {
            custUpdates.first_name = parts[parts.length - 1];
            custUpdates.last_name = parts.slice(0, -1).join(' ');
          }
        }
        if (fields.customerPhone !== undefined) {
          custUpdates.phone_number = fields.customerPhone || null;
        }
        if (Object.keys(custUpdates).length > 0) {
          await supabaseAdmin
            .from('customers')
            .update(custUpdates)
            .eq('id', order.customer_id);
        }
      }

      // 3. Update order details
      const orderUpdates: any = {};
      if (fields.revenue !== undefined) orderUpdates.total_price = fields.revenue;
      if (fields.status !== undefined) orderUpdates.status = fields.status;

      const { data, error } = await supabaseAdmin
        .from('orders')
        .update(orderUpdates)
        .eq('order_id', dbId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } else {
      throw new Error('Loại đơn không hợp lệ');
    }
  }

  static async deleteOrderHistoryItem(type: string, id: string | number) {
    if (type === 'booking') {
      const dbId = Number(id);
      // Delete booking equipments first
      const { error: beErr } = await supabaseAdmin
        .from('booking_equipments')
        .delete()
        .eq('booking_id', dbId);

      if (beErr) throw beErr;

      // Delete transactions
      const { error: txErr } = await supabaseAdmin
        .from('transactions')
        .delete()
        .eq('booking_id', dbId);

      // Delete booking itself
      const { error: bErr } = await supabaseAdmin
        .from('bookings')
        .delete()
        .eq('id', dbId);

      if (bErr) throw bErr;
      return { success: true };
    } else if (type === 'order') {
      const dbId = Number(id);
      // Delete order items first
      const { error: oiErr } = await supabaseAdmin
        .from('order_items')
        .delete()
        .eq('order_id', dbId);

      if (oiErr) throw oiErr;

      // Delete transactions
      const { error: txErr } = await supabaseAdmin
        .from('transactions')
        .delete()
        .eq('order_id', dbId);

      // Delete order itself
      const { error: oErr } = await supabaseAdmin
        .from('orders')
        .delete()
        .eq('order_id', dbId);

      if (oErr) throw oErr;
      return { success: true };
    } else {
      throw new Error('Loại đơn không hợp lệ');
    }
  }

  static async getConsolidatedDashboard(month: number, year: number) {
    const startDateStr = `${year}-${String(month).padStart(2, '0')}-01T00:00:00.000Z`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}T23:59:59.999Z`;

    const startDateStrSimple = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDateStrSimple = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    // 1. MUONMAYCHUT Revenue: bookings start_date
    const { data: bookings, error: bookingsErr } = await supabaseAdmin
      .from('bookings')
      .select('total_rent_fee, penalty_fee')
      .gte('start_date', startDateStr)
      .lte('start_date', endDateStr);

    if (bookingsErr) throw bookingsErr;

    const muonRevenue = (bookings || []).reduce(
      (sum, b) => sum + (Number(b.total_rent_fee) || 0) + (Number(b.penalty_fee) || 0),
      0
    );

    // 2. BANMAYFILM Revenue: sale_orders created_at
    const { data: saleOrders, error: saleOrdersErr } = await supabaseAdmin
      .from('sale_orders')
      .select('sale_price, quantity')
      .not('status', 'in', '("CANCELLED","CANCELED")')
      .gte('created_at', startDateStr)
      .lte('created_at', endDateStr);

    if (saleOrdersErr) throw saleOrdersErr;

    const banRevenue = (saleOrders || []).reduce(
      (sum, o) => sum + (Number(o.sale_price) || 0) * (Number(o.quantity) || 1),
      0
    );

    // 3. Expenses: MUONMAYCHUT and BANMAYFILM
    const { data: expenses, error: expensesErr } = await supabaseAdmin
      .from('expenses')
      .select('business_type, amount')
      .gte('expense_date', startDateStrSimple)
      .lte('expense_date', endDateStrSimple);

    if (expensesErr) throw expensesErr;

    let muonExpenses = 0;
    let banExpenses = 0;
    (expenses || []).forEach((e) => {
      if (e.business_type === 'MUONMAYCHUT') {
        muonExpenses += Number(e.amount) || 0;
      } else if (e.business_type === 'BANMAYFILM') {
        banExpenses += Number(e.amount) || 0;
      }
    });

    // 4. Imports: MUONMAYCHUT and BANMAYFILM
    const { data: rentalImports, error: rentalImportsErr } = await supabaseAdmin
      .from('rental_imports')
      .select('total_value')
      .gte('import_date', startDateStrSimple)
      .lte('import_date', endDateStrSimple);

    if (rentalImportsErr) throw rentalImportsErr;

    const muonImports = (rentalImports || []).reduce(
      (sum, i) => sum + (Number(i.total_value) || 0),
      0
    );

    const { data: saleImports, error: saleImportsErr } = await supabaseAdmin
      .from('sale_imports')
      .select('total_value')
      .gte('import_date', startDateStrSimple)
      .lte('import_date', endDateStrSimple);

    if (saleImportsErr) throw saleImportsErr;

    const banImports = (saleImports || []).reduce(
      (sum, i) => sum + (Number(i.total_value) || 0),
      0
    );

    // 5. Compute Profit
    const muonProfit = muonRevenue - muonExpenses - muonImports;
    const banProfit = banRevenue - banExpenses - banImports;

    return {
      banmayfilm: {
        revenue: banRevenue,
        expenses: banExpenses,
        imports: banImports,
        profit: banProfit
      },
      muonmaychut: {
        revenue: muonRevenue,
        expenses: muonExpenses,
        imports: muonImports,
        profit: muonProfit
      }
    };
  }

  static async getFilmDevelopments() {
    const { data, error } = await supabaseAdmin
      .from('film_developments')
      .select('*')
      .order('ngay_trang', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async createFilmDevelopment(payload: {
    ngayTrang: string;
    tenKhach?: string | null;
    sdtKhach?: string | null;
    cuonFilm: string;
    lab?: string | null;
    ngayTra?: string | null;
    ghiChu?: string | null;
  }) {
    const { ngayTrang, tenKhach, sdtKhach, cuonFilm, lab, ngayTra, ghiChu } = payload;
    if (!ngayTrang || !cuonFilm) {
      throw new Error('Ngày tráng và Cuộn film là bắt buộc');
    }

    const { data, error } = await supabaseAdmin
      .from('film_developments')
      .insert({
        ngay_trang: ngayTrang,
        ten_khach: tenKhach || null,
        sdt_khach: sdtKhach || null,
        cuon_film: cuonFilm,
        lab: lab || null,
        ngay_tra: ngayTra || null,
        ghi_chu: ghiChu || null
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateFilmDevelopment(id: number, payload: {
    ngayTrang?: string;
    tenKhach?: string | null;
    sdtKhach?: string | null;
    cuonFilm?: string;
    lab?: string | null;
    ngayTra?: string | null;
    ghiChu?: string | null;
  }) {
    const { ngayTrang, tenKhach, sdtKhach, cuonFilm, lab, ngayTra, ghiChu } = payload;

    const updates: any = {};
    if (ngayTrang !== undefined) updates.ngay_trang = ngayTrang;
    if (tenKhach !== undefined) updates.ten_khach = tenKhach || null;
    if (sdtKhach !== undefined) updates.sdt_khach = sdtKhach || null;
    if (cuonFilm !== undefined) updates.cuon_film = cuonFilm;
    if (lab !== undefined) updates.lab = lab || null;
    if (ngayTra !== undefined) updates.ngay_tra = ngayTra || null;
    if (ghiChu !== undefined) updates.ghi_chu = ghiChu || null;

    const { data, error } = await supabaseAdmin
      .from('film_developments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteFilmDevelopment(id: number) {
    const { data, error } = await supabaseAdmin
      .from('film_developments')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
