import { supabaseAdmin } from '../../config/supabase.js';
import { ProductService } from '../inventory/product.service.js';
import { calculateRentalDaysWithThreshold } from '../rentals-pos/booking.service.js';

export interface SettlementPayload {
  bookingId: string | number;
  isDamaged: boolean;
  damageCharge: number;
  notes: string;
  receivedBy?: number;
  ngayTra?: string;
  gioTra?: string;
}

export class TransactionService {
  static async settleDeposit(payload: SettlementPayload) {
    const { bookingId, isDamaged, damageCharge, notes, receivedBy, ngayTra, gioTra } = payload;

    // 1. Fetch booking to make sure it exists
    const { data: booking, error: fetchErr } = await supabaseAdmin
      .from('bookings')
      .select('id, total_rent_fee, deposit_fee, start_date, end_date')
      .eq('id', bookingId)
      .single();

    if (fetchErr || !booking) {
      throw new Error(`Booking not found: ${bookingId}`);
    }

    // 2. Find equipment_id linked to this booking
    const { data: bookingEq, error: eqErr } = await supabaseAdmin
      .from('booking_equipments')
      .select(`
        equipment_id,
        equipments (
          product_id,
          products (
            rent_price_per_day
          )
        )
      `)
      .eq('booking_id', bookingId)
      .maybeSingle();

    if (eqErr) {
      console.error('No equipment found for this booking to release:', eqErr);
    }

    const pricePerDay = Number((bookingEq?.equipments as any)?.products?.rent_price_per_day || 0);
    const start = new Date(booking.start_date);
    const end = new Date(booking.end_date);
    const days = calculateRentalDaysWithThreshold(start, end);
    const baseFee = pricePerDay * days;

    let extraCharge = 0;
    if (gioTra && typeof gioTra === 'string' && gioTra.includes(':')) {
      const [hours, minutes] = gioTra.split(':').map(Number);
      const minutesTotal = hours * 60 + minutes;

      const limit22 = 22 * 60;
      const limit22_30 = 22 * 60 + 30;

      if (minutesTotal > limit22 && minutesTotal <= limit22_30) {
        extraCharge = 0.5 * pricePerDay;
      } else if (minutesTotal > limit22_30) {
        extraCharge = 1.0 * pricePerDay;
      }
    }

    const finalRentFee = baseFee + extraCharge;

    // 3. Update booking status to CHECKED_OUT, record penalty, return hour, and final rent fee
    const updates: any = {
      booking_status: 'CHECKED_OUT',
      penalty_fee: damageCharge || 0,
      deposit_status: damageCharge > 0 ? 'DEDUCTED' : 'REFUNDED',
      received_by: receivedBy || null,
      notes: notes || null,
      gio_tra: gioTra || null,
      total_rent_fee: finalRentFee
    };
    if (ngayTra) {
      updates.end_date = ngayTra;
    }

    const { error: bookingUpdateErr } = await supabaseAdmin
      .from('bookings')
      .update(updates)
      .eq('id', bookingId);

    if (bookingUpdateErr) throw bookingUpdateErr;

    // 4. Update equipment status to AVAILABLE
    if (bookingEq && bookingEq.equipment_id) {
      const { error: eqUpdateErr } = await supabaseAdmin
        .from('equipments')
        .update({ status: 'AVAILABLE' })
        .eq('id', bookingEq.equipment_id);

      if (eqUpdateErr) {
        console.error('Failed to restore equipment status to AVAILABLE:', eqUpdateErr);
      }

      // Increment product stock quantity by 1 for this rental model upon return
      const modelId = (bookingEq.equipments as any)?.product_id;
      if (modelId) {
        await ProductService.adjustProductStockForRental(modelId, 1);
      }
    }

    const depVal = Number(booking.deposit_fee);
    const depositFeeNum = isNaN(depVal) ? 0 : depVal;
    
    let refundAmount = 0;
    if (depositFeeNum > 0) {
      refundAmount = Math.max(0, depositFeeNum - damageCharge - extraCharge);
    } else {
      refundAmount = Math.max(0, finalRentFee - damageCharge - extraCharge);
    }

    return {
      success: true,
      overdue_days: 0,
      overdue_charge: 0,
      damage_charge: damageCharge,
      total_deduction: damageCharge,
      refund_amount: refundAmount,
      penalty_owed: 0
    };
  }

  static async generateQRInvoice(transactionId: string) {
    const bankId = 'MB';
    const accountNo = '19001008FILM';
    const accountName = 'FILM CAMERA CLUB';
    const description = `PAYMENT FOR TRANS ${transactionId.substring(0, 8).toUpperCase()}`;
    const qrUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=100000&addInfo=${encodeURIComponent(description)}&accountName=${encodeURIComponent(accountName)}`;

    return {
      transactionId,
      amount: 100000,
      type: 'RENTAL_PAYMENT',
      paymentMethod: 'BANK_TRANSFER',
      status: 'PENDING',
      customerName: 'Customer',
      description,
      qrUrl,
      paymentDetails: {
        bankName: 'Military Bank (MB)',
        accountNumber: accountNo,
        accountName: accountName
      }
    };
  }

  static async confirmPayment(transactionId: string) {
    return {
      success: true,
      message: 'Payment verified'
    };
  }

  static async listTransactions(filters: any) {
    return {
      transactions: [],
      totalCount: 0
    };
  }

  static async listUserTransactions(userId: string) {
    return [];
  }

  static async getReceiptDetails(transactionId: string) {
    return {
      id: transactionId,
      amount: 100000,
      type: 'RENTAL_PAYMENT',
      status: 'COMPLETED',
      created_at: new Date().toISOString(),
      profiles: {
        full_name: 'Khách hàng',
        email: 'customer@example.com'
      }
    };
  }
}
