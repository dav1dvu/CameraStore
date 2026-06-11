-- ========================================
-- MIGRATION: ERP Overhaul - Employees, Booking Tracking, Customer Relaxation
-- Run on Supabase SQL editor (schema oltp_store)
-- ========================================

SET search_path TO oltp_store;

-- 1. Create employees table
CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
  staff_code VARCHAR(20) UNIQUE NOT NULL,
  full_name VARCHAR(200) NOT NULL,
  phone VARCHAR(20),
  address TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Add delivery/return tracking to bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS delivered_by INTEGER;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS received_by INTEGER;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS notes TEXT;

-- 3. Relax customer constraints (allow POS quick-create without email/CCCD)
ALTER TABLE customers ALTER COLUMN email DROP NOT NULL;
ALTER TABLE customers ALTER COLUMN phone_number DROP NOT NULL;
ALTER TABLE customers ALTER COLUMN identity_number DROP NOT NULL;

-- Drop unique constraints to allow null values
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_email_key;
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_phone_number_key;
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_identity_number_key;

-- Add address and notes columns to customers if not present
ALTER TABLE customers ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS notes TEXT;

-- 4. Indexes for employees
CREATE INDEX IF NOT EXISTS idx_employees_staff_code ON employees(staff_code);
