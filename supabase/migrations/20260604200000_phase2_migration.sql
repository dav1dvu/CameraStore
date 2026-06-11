SET search_path TO oltp_store;

-- 1. Bổ sung cột phụ kiện bàn giao cho booking_equipments
ALTER TABLE oltp_store.booking_equipments
  ADD COLUMN IF NOT EXISTS accessories_out TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS accessories_in TEXT[] DEFAULT '{}';

-- 2. Index bổ sung cho reporting queries
CREATE INDEX IF NOT EXISTS idx_transactions_status_type
  ON oltp_store.transactions(status, type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at
  ON oltp_store.transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_bookings_status
  ON oltp_store.bookings(booking_status);
