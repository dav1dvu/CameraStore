SET search_path TO oltp_store;

-- Add checkin_date and checkout_date columns to bookings table
ALTER TABLE oltp_store.bookings
ADD COLUMN IF NOT EXISTS checkin_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS checkout_date TIMESTAMP;
