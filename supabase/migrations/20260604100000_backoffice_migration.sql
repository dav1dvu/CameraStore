-- Migration to back-office v2
-- 20260604100000_backoffice_migration.sql

CREATE SCHEMA IF NOT EXISTS oltp_store;
SET search_path TO oltp_store;

-- 1a. Create customers table
CREATE TABLE IF NOT EXISTS oltp_store.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    phone_number TEXT,
    identity_number TEXT,            -- CCCD (nhân viên nhập khi khách thuê)
    email TEXT,
    address TEXT,
    notes TEXT,                      -- Ghi chú nội bộ về khách
    created_by UUID REFERENCES oltp_store.users(id),  -- Nhân viên tạo hồ sơ khách
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 1b. Add FK customer_id to bookings and orders
ALTER TABLE oltp_store.bookings
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES oltp_store.customers(id);

ALTER TABLE oltp_store.orders
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES oltp_store.customers(id);

-- 1c. Alter role default on users table and update check constraint
ALTER TABLE oltp_store.users ALTER COLUMN role SET DEFAULT 'STAFF';

-- Drop role check constraint safely
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT conname 
        FROM pg_constraint con
        JOIN pg_class cl ON cl.oid = con.conrelid
        JOIN pg_namespace ns ON ns.oid = cl.relnamespace
        WHERE ns.nspname = 'oltp_store' 
          AND cl.relname = 'users' 
          AND con.contype = 'c' 
          AND con.conname LIKE '%role%'
    LOOP
        EXECUTE 'ALTER TABLE oltp_store.users DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;
END $$;

ALTER TABLE oltp_store.users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('ADMIN', 'MANAGER', 'STAFF'));

-- 1d. Sửa trigger handle_new_user — gán role mặc định STAFF hoặc từ metadata
CREATE OR REPLACE FUNCTION oltp_store.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO oltp_store.users (id, role, first_name, last_name, email, phone_number, password_hash, identity_number)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'role', 'STAFF'),  -- Nhận role từ metadata
    COALESCE(new.raw_user_meta_data->>'first_name', 'Staff'),
    COALESCE(new.raw_user_meta_data->>'last_name', substr(new.id::text, 1, 6)),
    COALESCE(new.email, ''),
    new.raw_user_meta_data->>'phone_number',
    'SUPABASE_AUTH_MANAGED',
    NULL
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1e. Tạo bảng feedbacks
CREATE TABLE IF NOT EXISTS oltp_store.feedbacks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES oltp_store.customers(id),
    booking_id UUID REFERENCES oltp_store.bookings(id),
    order_id UUID REFERENCES oltp_store.orders(id),
    type VARCHAR(20) NOT NULL DEFAULT 'FEEDBACK'
      CHECK (type IN ('FEEDBACK', 'COMPLAINT', 'SUGGESTION')),
    content TEXT NOT NULL,
    staff_id UUID NOT NULL REFERENCES oltp_store.users(id), -- Nhân viên ghi nhận
    resolved BOOLEAN DEFAULT FALSE,
    resolved_by UUID REFERENCES oltp_store.users(id),
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trigger for update_updated_at on customers and feedbacks
DROP TRIGGER IF EXISTS update_customers_updated_at ON oltp_store.customers;
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON oltp_store.customers FOR EACH ROW EXECUTE FUNCTION oltp_store.update_updated_at_column();

DROP TRIGGER IF EXISTS update_feedbacks_updated_at ON oltp_store.feedbacks;
CREATE TRIGGER update_feedbacks_updated_at BEFORE UPDATE ON oltp_store.feedbacks FOR EACH ROW EXECUTE FUNCTION oltp_store.update_updated_at_column();

-- 1f. Redefine create_booking_safe RPC for back-office
CREATE OR REPLACE FUNCTION oltp_store.create_booking_safe(
    p_staff_id UUID,
    p_customer_id UUID,
    p_model_id UUID,
    p_start_date DATE,
    p_end_date DATE,
    p_total_fee NUMERIC(12,2),
    p_deposit NUMERIC(12,2)
) RETURNS JSONB AS $$
DECLARE
    v_equipment_id UUID;
    v_booking_id UUID;
BEGIN
    -- 1. Check if customer exists and has identity_number (CCCD)
    IF NOT EXISTS (
        SELECT 1 FROM oltp_store.customers
        WHERE id = p_customer_id AND identity_number IS NOT NULL AND identity_number <> ''
    ) THEN
        RETURN json_build_object('success', false, 'error', 'Khách hàng chưa có CCCD hoặc hồ sơ khách hàng không hợp lệ. Vui lòng cập nhật thông tin khách trước khi thuê.');
    END IF;

    -- 2. Find available equipment
    SELECT eq.id INTO v_equipment_id
    FROM oltp_store.equipments eq
    WHERE eq.model_id = p_model_id
      AND eq.status <> 'DAMAGED'
      AND eq.status <> 'MAINTENANCE'
      AND NOT EXISTS (
          SELECT 1 FROM oltp_store.booking_equipments be
          JOIN oltp_store.bookings b ON b.id = be.booking_id
          WHERE be.equipment_id = eq.id
            AND b.booking_status IN ('PENDING', 'CONFIRMED', 'CHECKED_IN')
            AND (
                (p_start_date BETWEEN b.start_date::date AND b.end_date::date) OR
                (p_end_date BETWEEN b.start_date::date AND b.end_date::date) OR
                (b.start_date::date BETWEEN p_start_date AND p_end_date)
            )
      )
    LIMIT 1;

    IF v_equipment_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Không còn thiết bị khả dụng cho khoảng thời gian đã chọn');
    END IF;

    -- 3. Create booking record with staff_id (user_id) and customer_id
    INSERT INTO oltp_store.bookings (user_id, customer_id, start_date, end_date, total_rent_fee, deposit_amount, deposit_status, booking_status)
    VALUES (p_staff_id, p_customer_id, p_start_date, p_end_date, p_total_fee, p_deposit, 'UNPAID', 'PENDING')
    RETURNING id INTO v_booking_id;

    -- 4. Create link to equipment
    INSERT INTO oltp_store.booking_equipments (booking_id, equipment_id)
    VALUES (v_booking_id, v_equipment_id);

    -- 5. Create deposit transaction
    INSERT INTO oltp_store.transactions (booking_id, user_id, type, amount, payment_method, status, notes)
    VALUES (v_booking_id, p_staff_id, 'DEPOSIT', p_deposit, 'BANK_TRANSFER', 'PENDING', 'Tiền cọc thuê thiết bị');

    RETURN json_build_object('success', true, 'booking_id', v_booking_id, 'equipment_id', v_equipment_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
