import { supabaseAdmin } from '../../config/supabase.js';

export function startNotificationScheduler() {
  const INTERVAL_MS = 60 * 60 * 1000; // 60 minutes

  async function checkAndLogReminders() {
    try {
      console.log('[Scheduler] Running checkAndLogReminders at', new Date().toISOString());

      // 1. Fetch active bookings (using customer_id)
      const { data: bookings, error: fetchErr } = await supabaseAdmin
        .from('bookings')
        .select('id, start_date, end_date, booking_status, customer_id')
        .in('booking_status', ['PENDING', 'CONFIRMED', 'CHECKED_IN']);

      if (fetchErr) {
        console.error('[Scheduler Error] Failed to fetch bookings:', fetchErr);
        return;
      }

      if (!bookings || bookings.length === 0) {
        console.log('[Scheduler] No active bookings found.');
        return;
      }

      const now = new Date();
      const nowPlus24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      for (const booking of bookings) {
        const bStatus = booking.booking_status;

        if (bStatus === 'PENDING' || bStatus === 'CONFIRMED') {
          const start = new Date(booking.start_date);
          if (start >= now && start <= nowPlus24h) {
            console.log(`[Scheduler Reminder] [AUTO_REMINDER_CHECKIN] Booking ${booking.id} is due for check-in within 24h. Customer ID: ${booking.customer_id}, Start Date: ${booking.start_date}`);
          }
        } else if (bStatus === 'CHECKED_IN') {
          const end = new Date(booking.end_date);
          if (end >= now && end <= nowPlus24h) {
            console.log(`[Scheduler Reminder] [AUTO_REMINDER_CHECKOUT] Booking ${booking.id} is due for check-out within 24h. Customer ID: ${booking.customer_id}, End Date: ${booking.end_date}`);
          } else if (end < now) {
            const overdueHours = Math.round((now.getTime() - end.getTime()) / (1000 * 60 * 60));
            console.warn(`[Scheduler Alert] [AUTO_OVERDUE_ALERT] Booking ${booking.id} is OVERDUE by ${overdueHours} hours. Customer ID: ${booking.customer_id}, End Date: ${booking.end_date}`);
          }
        }
      }
    } catch (err) {
      console.error('[Scheduler Error] Unexpected error:', err);
    }
  }

  // Execute check immediately on startup
  checkAndLogReminders();

  // Set interval to run every 60 minutes
  const intervalId = setInterval(checkAndLogReminders, INTERVAL_MS);
  return intervalId;
}
