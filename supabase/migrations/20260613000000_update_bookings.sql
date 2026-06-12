-- Migration: Update Bookings table for MUONMAYCHUT refinements
-- Path: supabase/migrations/20260613000000_update_bookings.sql
SET search_path TO oltp_store;

-- 1. Alter deposit_fee column to accept arbitrary text
-- Drop the check constraint on deposit_fee if it exists
ALTER TABLE oltp_store.bookings DROP CONSTRAINT IF EXISTS bookings_deposit_fee_check;

-- Alter the type of deposit_fee to VARCHAR(255)
ALTER TABLE oltp_store.bookings ALTER COLUMN deposit_fee TYPE VARCHAR(255) USING deposit_fee::text;
ALTER TABLE oltp_store.bookings ALTER COLUMN deposit_fee SET DEFAULT '0';

-- 2. Add new columns for Giờ giao (gio_nhan) and Giờ nhận (gio_tra)
ALTER TABLE oltp_store.bookings ADD COLUMN IF NOT EXISTS gio_nhan VARCHAR(50);
ALTER TABLE oltp_store.bookings ADD COLUMN IF NOT EXISTS gio_tra VARCHAR(50);

-- 3. Update booking_status check constraint to support both 'CANCELED' and 'CANCELLED'
ALTER TABLE oltp_store.bookings DROP CONSTRAINT IF EXISTS bookings_booking_status_check;
ALTER TABLE oltp_store.bookings ADD CONSTRAINT bookings_booking_status_check 
    CHECK (booking_status IN ('PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELED', 'CANCELLED', 'OVERDUE'));
