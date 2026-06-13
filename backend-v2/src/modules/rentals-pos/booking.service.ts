import { supabaseAdmin } from '../../config/supabase.js';
import { ProductService } from '../inventory/product.service.js';

export interface BookingPayload {
  staffId: string;
  customerId: string;
  productId: string; // This corresponds to model_id
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  batteryProductId?: number;
  batteryQuantity?: number;
  depositAmount?: string;
}

function safeJsonParse(str: string | null | undefined): string[] {
  if (!str) return [];
  try {
    const parsed = JSON.parse(str);
    if (Array.isArray(parsed)) return parsed;
    return [str]; // Fallback to raw string if it is not an array but exists
  } catch {
    return [str]; // Fallback to raw string
  }
}

export function calculateRentalDaysWithThreshold(start: Date, end: Date): number {
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());

  const diffTime = endDay.getTime() - startDay.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays > 0 ? diffDays : 1;
}


export class BookingService {
  static async createBooking(payload: BookingPayload) {
    const { customerId, productId, startDate, endDate, batteryProductId, batteryQuantity, depositAmount } = payload;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const rentalDays = calculateRentalDaysWithThreshold(start, end);

    if (rentalDays <= 0) {
      throw new Error('End date must be on or after start date');
    }

    // 1. Verify customer exists
    const { data: customer, error: customerErr } = await supabaseAdmin
      .from('customers')
      .select('id, first_name, last_name, email, phone_number, identity_number')
      .eq('id', customerId)
      .single();

    if (customerErr || !customer) {
      throw new Error('Customer not found');
    }

    // 2. Fetch camera model price
    const { data: model, error: modelErr } = await supabaseAdmin
      .from('camera_models')
      .select('id, rent_price_per_day, deposit_amount')
      .eq('id', productId)
      .single();

    if (modelErr || !model) {
      throw new Error('Camera model not found');
    }

    // Verify battery stock if requested
    if (batteryProductId && batteryQuantity && batteryQuantity > 0) {
      const { data: batteryProduct, error: batProdErr } = await supabaseAdmin
        .from('products')
        .select('id, name, stock_quantity')
        .eq('id', batteryProductId)
        .maybeSingle();

      if (batProdErr || !batteryProduct) {
        throw new Error('Không tìm thấy sản phẩm Pin đã chọn');
      }

      if (Number(batteryProduct.stock_quantity) < batteryQuantity) {
        throw new Error(`Sản phẩm pin "${batteryProduct.name}" không đủ số lượng trong kho (Còn lại: ${batteryProduct.stock_quantity})`);
      }
    }

    const pricePerDay = Number(model.rent_price_per_day);
    const totalRentalFee = pricePerDay * rentalDays;
    const finalDepositAmount = depositAmount !== undefined ? depositAmount : Number(model.deposit_amount);

    // 3. Find an AVAILABLE equipment of this model directly in Node.js by checking overlapping bookings
    const { data: allEquips, error: equipErr } = await supabaseAdmin
      .from('equipments')
      .select('id, serial_number, status')
      .eq('product_id', productId)
      .not('status', 'in', '("MAINTENANCE","DAMAGED")');

    if (equipErr) throw equipErr;
    if (!allEquips || allEquips.length === 0) {
      throw new Error('No available equipment items found for this camera model.');
    }

    const equipIds = allEquips.map(e => e.id);

    // Find all bookings mapped to these equipments that overlap with the requested date range and are active
    const { data: activeBookingsLink, error: activeBookingsErr } = await supabaseAdmin
      .from('booking_equipments')
      .select(`
        equipment_id,
        booking_id,
        bookings!inner (
          start_date,
          end_date,
          booking_status
        )
      `)
      .in('equipment_id', equipIds)
      .not('bookings.booking_status', 'in', '("CANCELED","CANCELLED","CHECKED_OUT")');

    if (activeBookingsErr) throw activeBookingsErr;

    const qStartStr = startDate.substring(0, 10);
    const qEndStr = endDate.substring(0, 10);

    const busyEquipIds = new Set<number>();
    if (activeBookingsLink) {
      for (const link of activeBookingsLink) {
        const bookingData = link.bookings as any;
        if (bookingData) {
          const bStartStr = bookingData.start_date.substring(0, 10);
          const bEndStr = bookingData.end_date.substring(0, 10);

          // Overlap check: booking start <= query end AND booking end >= query start
          if (bStartStr <= qEndStr && bEndStr >= qStartStr) {
            busyEquipIds.add(link.equipment_id);
          }
        }
      }
    }

    // Pick the first equipment that is not busy
    const availableEquipment = allEquips.find(e => !busyEquipIds.has(e.id));
    if (!availableEquipment) {
      throw new Error('No available equipment items found for this camera model.');
    }

    const equipment = availableEquipment;

    // 4. Create Booking record
    const { data: booking, error: bookingErr } = await supabaseAdmin
      .from('bookings')
      .insert({
        customer_id: customerId,
        start_date: startDate,
        end_date: endDate,
        total_rent_fee: totalRentalFee,
        deposit_fee: finalDepositAmount,
        booking_status: 'PENDING',
        battery_product_id: batteryProductId || null,
        battery_quantity: batteryQuantity || 0
      })
      .select()
      .single();


    if (bookingErr) throw bookingErr;

    // 5. Create booking_equipments link
    const { error: linkErr } = await supabaseAdmin
      .from('booking_equipments')
      .insert({
        booking_id: booking.id,
        equipment_id: equipment.id
      });

    if (linkErr) {
      // rollback booking on error
      await supabaseAdmin.from('bookings').delete().eq('id', booking.id);
      throw linkErr;
    }

    // 6. Mark equipment as RENTED
    const { error: updateEqErr } = await supabaseAdmin
      .from('equipments')
      .update({ status: 'RENTED' })
      .eq('id', equipment.id);

    if (updateEqErr) {
      console.error('Failed to update equipment status:', updateEqErr);
    }

    // Decrement product stock quantity immediately
    await ProductService.adjustProductStockForRental(productId, -1);

    // Decrement battery stock immediately if selected
    if (batteryProductId && batteryQuantity && batteryQuantity > 0) {
      const { data: batteryProduct } = await supabaseAdmin
        .from('products')
        .select('stock_quantity')
        .eq('id', batteryProductId)
        .maybeSingle();

      if (batteryProduct) {
        await supabaseAdmin
          .from('products')
          .update({
            stock_quantity: Math.max(0, (batteryProduct.stock_quantity || 0) - batteryQuantity)
          })
          .eq('id', batteryProductId);
      }
    }

    return {
      id: booking.id,
      bookingId: booking.id,
      equipmentId: equipment.id,
      totalRentalFee,
      depositAmount: finalDepositAmount,
      rentalDays
    };
  }

  static async getBookingDetails(bookingId: string | number) {
    const { data, error } = await supabaseAdmin
      .from('bookings')
      .select(`
        *,
        customers (
          id,
          first_name,
          last_name,
          phone_number,
          identity_number,
          email
        ),
        booking_equipments (
          condition_out,
          condition_in,
          equipments (
            id,
            serial_number,
            camera_models (
              id,
              model_name,
              rent_price_per_day
            )
          )
        ),
        battery:products!battery_product_id (
          id,
          name
        )
      `)
      .eq('id', bookingId)
      .single();

    if (error || !data) throw new Error('Booking not found');

    // Mappings for frontend/back-office compatibility
    if (data) {
      data.batteryName = data.battery?.name || null;
      data.batteryQuantity = data.battery_quantity || 0;
      if (data.customers) {
        data.profiles = {
          id: data.customers.id,
          full_name: `${data.customers.last_name} ${data.customers.first_name}`.trim(),
          phone: data.customers.phone_number,
          identity_number: data.customers.identity_number,
          email: data.customers.email,
          address: ''
        };
        // Fake staff data
        data.staff = {
          id: '00000000-0000-0000-0000-000000000000',
          full_name: 'Nhân viên Hệ thống',
          phone: ''
        };
      }

      if (data.booking_equipments && data.booking_equipments.length > 0) {
        const link = data.booking_equipments[0];
        data.accessories_out = safeJsonParse(link.condition_out);
        data.accessories_in = safeJsonParse(link.condition_in);
        
        const firstEq = link.equipments;
        if (firstEq) {
          data.equipment_id = firstEq.id;
          data.equipment = {
            id: firstEq.id,
            serial_number: firstEq.serial_number,
            products: firstEq.camera_models ? {
              id: firstEq.camera_models.id,
              name: firstEq.camera_models.model_name,
              rental_price_per_day: firstEq.camera_models.rent_price_per_day
            } : null
          };
        }
      }

      data.total_rental_fee = data.total_rent_fee;
      data.deposit_amount = data.deposit_fee;
      data.status = data.booking_status;
    }

    return data;
  }

  static async listAllBookings(filters?: { customerId?: string, status?: string }) {
    let query = supabaseAdmin
      .from('bookings')
      .select(`
        *,
        customers (
          id,
          first_name,
          last_name,
          phone_number
        ),
        booking_equipments (
          condition_out,
          condition_in,
          equipments (
            id,
            serial_number,
            camera_models (
              id,
              model_name,
              rent_price_per_day
            )
          )
        ),
        battery:products!battery_product_id (
          id,
          name
        )
      `);

    if (filters?.customerId) {
      query = query.eq('customer_id', filters.customerId);
    }
    if (filters?.status) {
      query = query.eq('booking_status', filters.status);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    if (data) {
      data.forEach((item: any) => {
        item.total_rental_fee = item.total_rent_fee;
        item.deposit_amount = item.deposit_fee;
        item.status = item.booking_status;
        item.batteryName = item.battery?.name || null;
        item.batteryQuantity = item.battery_quantity || 0;
        if (item.customers) {
          item.profiles = {
            id: item.customers.id,
            full_name: `${item.customers.last_name} ${item.customers.first_name}`.trim(),
            phone: item.customers.phone_number
          };
        }
        if (item.booking_equipments && item.booking_equipments.length > 0) {
          const link = item.booking_equipments[0];
          item.accessories_out = safeJsonParse(link.condition_out);
          item.accessories_in = safeJsonParse(link.condition_in);
          
          const firstEq = link.equipments;
          if (firstEq) {
            item.equipment_id = firstEq.id;
            item.equipment = {
              id: firstEq.id,
              serial_number: firstEq.serial_number,
              products: firstEq.camera_models ? {
                id: firstEq.camera_models.id,
                name: firstEq.camera_models.model_name,
                rental_price_per_day: firstEq.camera_models.rent_price_per_day
              } : null
            };
          }
        }
      });
    }

    return data;
  }

  static async checkInBooking(bookingId: string | number, accessories: string[], staffId: string, deliveredBy?: number, gioNhan?: string, depositAmount?: string) {
    const { data: booking, error: fetchErr } = await supabaseAdmin
      .from('bookings')
      .select('booking_status')
      .eq('id', bookingId)
      .single();

    if (fetchErr || !booking) throw new Error('Booking not found');
    const bStatus = booking.booking_status;
    if (bStatus !== 'PENDING' && bStatus !== 'CONFIRMED') {
      throw new Error(`Cannot check-in booking in ${bStatus} status`);
    }

    const updates: any = {
      booking_status: 'CHECKED_IN',
      checkin_date: new Date().toISOString(),
      delivered_by: deliveredBy || null,
      gio_nhan: gioNhan || null
    };
    if (depositAmount !== undefined) {
      updates.deposit_fee = depositAmount;
    }

    // 1. Update Booking status to CHECKED_IN and record checkin_date
    const { data, error } = await supabaseAdmin
      .from('bookings')
      .update(updates)
      .eq('id', bookingId)
      .select()
      .single();

    if (error) throw error;

    // 2. Save handover accessories list to booking_equipments condition_out
    const { data: bookingEq, error: eqErr } = await supabaseAdmin
      .from('booking_equipments')
      .select(`
        booking_id, 
        equipment_id,
        equipments (
          product_id
        )
      `)
      .eq('booking_id', bookingId);

    if (eqErr) throw eqErr;
    if (bookingEq && bookingEq.length > 0) {
      const accessoriesStr = JSON.stringify(accessories || []);
      const { error: beErr } = await supabaseAdmin
        .from('booking_equipments')
        .update({
          condition_out: accessoriesStr
        })
        .eq('booking_id', bookingId);
      if (beErr) throw beErr;
      
      // Update equipment status to RENTED
      await supabaseAdmin
        .from('equipments')
        .update({ status: 'RENTED' })
        .eq('id', bookingEq[0].equipment_id);
    }

    if (data) {
      data.status = data.booking_status;
      data.total_rental_fee = data.total_rent_fee;
      data.deposit_amount = data.deposit_fee;
    }
    return data;
  }

  static async recordAccessoriesReturn(bookingId: string | number, accessoriesIn: string[], staffId: string) {
    const { data: bookingEq, error: eqErr } = await supabaseAdmin
      .from('booking_equipments')
      .select('booking_id, equipment_id')
      .eq('booking_id', bookingId);

    if (eqErr) throw eqErr;
    if (!bookingEq || bookingEq.length === 0) {
      throw new Error('No equipment linked to this booking');
    }

    const accessoriesStr = JSON.stringify(accessoriesIn || []);
    const { data, error } = await supabaseAdmin
      .from('booking_equipments')
      .update({
        condition_in: accessoriesStr
      })
      .eq('booking_id', bookingId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async previewCancellation(bookingId: string | number) {
    const { data: booking, error: fetchErr } = await supabaseAdmin
      .from('bookings')
      .select('booking_status, total_rent_fee')
      .eq('id', bookingId)
      .single();

    if (fetchErr || !booking) throw new Error('Booking not found');
    if (booking.booking_status === 'CANCELED' || booking.booking_status === 'CANCELLED' || booking.booking_status === 'CHECKED_OUT') {
      throw new Error('Booking is already completed or cancelled');
    }

    // Dynamic cancellation fee calculation (e.g. 10% fee if cancelled)
    const cancellationFee = Math.round(Number(booking.total_rent_fee) * 0.1);
    const refundAmount = Math.max(0, Number(booking.total_rent_fee) - cancellationFee);

    return {
      success: true,
      cancellation_fee: cancellationFee,
      refund_amount: refundAmount
    };
  }

  static async cancelBooking(bookingId: string | number) {
    const preview = await this.previewCancellation(bookingId);
    const res = preview as { success: boolean; cancellation_fee: number; refund_amount: number; error?: string };
    
    if (!res.success) throw new Error(res.error || 'Failed to cancel booking');

    // Fetch booking details to get battery info BEFORE cancelling
    const { data: bookingInfo } = await supabaseAdmin
      .from('bookings')
      .select('battery_product_id, battery_quantity')
      .eq('id', bookingId)
      .maybeSingle();

    // 1. Update Booking status to CANCELLED
    const { error: cancelErr } = await supabaseAdmin
      .from('bookings')
      .update({ booking_status: 'CANCELED' })
      .eq('id', bookingId);

    if (cancelErr) throw cancelErr;

    // Restore battery stock if applicable
    if (bookingInfo && bookingInfo.battery_product_id && bookingInfo.battery_quantity > 0) {
      const { data: batteryProduct } = await supabaseAdmin
        .from('products')
        .select('stock_quantity')
        .eq('id', bookingInfo.battery_product_id)
        .maybeSingle();

      if (batteryProduct) {
        await supabaseAdmin
          .from('products')
          .update({
            stock_quantity: (batteryProduct.stock_quantity || 0) + bookingInfo.battery_quantity
          })
          .eq('id', bookingInfo.battery_product_id);
      }
    }

    // 2. Free up the equipment linked
    const { data: bookingEq } = await supabaseAdmin
      .from('booking_equipments')
      .select('equipment_id')
      .eq('booking_id', bookingId);

    if (bookingEq && bookingEq.length > 0) {
      await supabaseAdmin
        .from('equipments')
        .update({ status: 'AVAILABLE' })
        .eq('id', bookingEq[0].equipment_id);

      // Fetch model ID of the equipment to restore product stock
      const { data: eq } = await supabaseAdmin
        .from('equipments')
        .select('product_id')
        .eq('id', bookingEq[0].equipment_id)
        .single();
      if (eq?.product_id) {
        await ProductService.adjustProductStockForRental(eq.product_id, 1);
      }
    }

    return res;
  }

  static async extendBooking(bookingId: string | number, extensionEndDate: string) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(extensionEndDate)) {
      throw new Error('Invalid extension end date format. Expected YYYY-MM-DD');
    }

    const booking = await this.getBookingDetails(bookingId);
    if (booking.status !== 'CHECKED_IN') {
      throw new Error('Can only extend active, checked-in bookings');
    }

    const currentEnd = new Date(booking.end_date);
    const newEnd = new Date(extensionEndDate);
    
    if (newEnd <= currentEnd) {
      throw new Error('New extension end date must be after current end date');
    }

    const eqId = booking.equipment_id;
    if (!eqId) {
      throw new Error('No equipment linked to this booking');
    }

    // Calculate extra days and cost using threshold logic
    const extensionDays = Math.max(0, calculateRentalDaysWithThreshold(currentEnd, newEnd) - 1);
    
    const productRate = Number(booking.equipment?.products?.rental_price_per_day || 0);
    const additionalFee = productRate * extensionDays;

    // Update booking bounds
    const { data: updatedBooking, error: updateErr } = await supabaseAdmin
      .from('bookings')
      .update({
        end_date: extensionEndDate,
        total_rent_fee: Number(booking.total_rent_fee) + additionalFee
      })
      .eq('id', bookingId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    if (updatedBooking) {
      updatedBooking.status = updatedBooking.booking_status;
      updatedBooking.total_rental_fee = updatedBooking.total_rent_fee;
      updatedBooking.deposit_amount = updatedBooking.deposit_fee;
    }

    return {
      success: true,
      updatedBooking,
      additionalFee,
      extensionDays
    };
  }
}
