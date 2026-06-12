-- Migration v4: Bookings Table Updates for MUONMAYCHUT Refinements
-- Run this script in your Supabase SQL Editor
SET search_path TO oltp_store;

-- 1. Alter deposit_fee column to accept arbitrary text
ALTER TABLE oltp_store.bookings DROP CONSTRAINT IF EXISTS bookings_deposit_fee_check;
ALTER TABLE oltp_store.bookings ALTER COLUMN deposit_fee TYPE VARCHAR(255) USING deposit_fee::text;
ALTER TABLE oltp_store.bookings ALTER COLUMN deposit_fee SET DEFAULT '0';

-- 2. Add new columns for Giờ giao (gio_nhan) and Giờ nhận (gio_tra)
ALTER TABLE oltp_store.bookings ADD COLUMN IF NOT EXISTS gio_nhan VARCHAR(50);
ALTER TABLE oltp_store.bookings ADD COLUMN IF NOT EXISTS gio_tra VARCHAR(50);

-- 3. Update booking_status check constraint to support both 'CANCELED' and 'CANCELLED'
ALTER TABLE oltp_store.bookings DROP CONSTRAINT IF EXISTS bookings_booking_status_check;
ALTER TABLE oltp_store.bookings ADD CONSTRAINT bookings_booking_status_check 
    CHECK (booking_status IN ('PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELED', 'CANCELLED', 'OVERDUE'));
