-- 20260604000000_oltp_store_migration.sql
-- Migration to structure oltp_store schema for backend compatibility

CREATE SCHEMA IF NOT EXISTS oltp_store;
SET search_path TO oltp_store;

-- 1. Drop existing tables in oltp_store (if any) with CASCADE to start fresh with UUIDs
DROP TABLE IF EXISTS oltp_store.reviews CASCADE;
DROP TABLE IF EXISTS oltp_store.maintenance_logs CASCADE;
DROP TABLE IF EXISTS oltp_store.booking_equipments CASCADE;
DROP TABLE IF EXISTS oltp_store.bookings CASCADE;
DROP TABLE IF EXISTS oltp_store.order_items CASCADE;
DROP TABLE IF EXISTS oltp_store.orders CASCADE;
DROP TABLE IF EXISTS oltp_store.equipments CASCADE;
DROP TABLE IF EXISTS oltp_store.camera_models CASCADE;
DROP TABLE IF EXISTS oltp_store.products CASCADE;
DROP TABLE IF EXISTS oltp_store.categories CASCADE;
DROP TABLE IF EXISTS oltp_store.users CASCADE;
DROP TABLE IF EXISTS oltp_store.transactions CASCADE;
DROP TABLE IF EXISTS oltp_store.identity_verifications CASCADE;
DROP TABLE IF EXISTS oltp_store.activity_logs CASCADE;
DROP TABLE IF EXISTS oltp_store.price_configs CASCADE;

-- 2. Create tables with UUID PKs and all columns
CREATE TABLE oltp_store.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role VARCHAR(30) NOT NULL DEFAULT 'CUSTOMER' CHECK (role IN ('ADMIN', 'STAFF', 'CUSTOMER')),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone_number VARCHAR(20) UNIQUE,
    password_hash VARCHAR(500) NOT NULL,
    identity_number VARCHAR(50) UNIQUE,
    address TEXT,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE oltp_store.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES oltp_store.categories(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE oltp_store.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES oltp_store.categories(id) ON DELETE SET NULL,
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200) UNIQUE NOT NULL,
    brand VARCHAR(100) NOT NULL DEFAULT '',
    description TEXT,
    price BIGINT NOT NULL DEFAULT 0 CHECK (price >= 0),
    sale_price NUMERIC(12,2) DEFAULT 0.00,
    stock_quantity INT NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    images TEXT[] NOT NULL DEFAULT '{}',
    specs JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE oltp_store.camera_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES oltp_store.categories(id) ON DELETE SET NULL,
    model_name VARCHAR(300) NOT NULL,
    slug VARCHAR(300) UNIQUE,
    brand VARCHAR(100) NOT NULL DEFAULT '',
    description TEXT,
    images TEXT[] NOT NULL DEFAULT '{}',
    specs JSONB NOT NULL DEFAULT '{}'::jsonb,
    rent_price_per_day NUMERIC(12,2) NOT NULL CHECK (rent_price_per_day >= 0),
    deposit_amount NUMERIC(12,2) NOT NULL CHECK (deposit_amount >= 0),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE oltp_store.equipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID NOT NULL REFERENCES oltp_store.camera_models(id) ON DELETE CASCADE,
    serial_number VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'RENTED', 'MAINTENANCE', 'DAMAGED')),
    condition_notes TEXT NOT NULL DEFAULT 'Good',
    purchase_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE oltp_store.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES oltp_store.users(id) ON DELETE CASCADE,
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'CANCELED', 'RETURNED')),
    shipping_address TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE oltp_store.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES oltp_store.orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES oltp_store.products(id) ON DELETE CASCADE,
    equipment_id UUID REFERENCES oltp_store.equipments(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0)
);

CREATE TABLE oltp_store.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES oltp_store.users(id) ON DELETE CASCADE,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL CONSTRAINT check_dates CHECK (start_date <= end_date),
    checkin_date TIMESTAMP,
    checkout_date TIMESTAMP,
    total_rent_fee NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total_rent_fee >= 0),
    deposit_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (deposit_amount >= 0),
    deposit_status VARCHAR(20) DEFAULT 'UNPAID' CHECK (deposit_status IN ('UNPAID', 'HELD', 'REFUNDED', 'DEDUCTED')),
    booking_status VARCHAR(20) DEFAULT 'PENDING' CHECK (booking_status IN ('PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'CANCELED', 'OVERDUE')),
    penalty_fee NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (penalty_fee >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE oltp_store.booking_equipments (
    booking_id UUID NOT NULL REFERENCES oltp_store.bookings(id) ON DELETE CASCADE,
    equipment_id UUID NOT NULL REFERENCES oltp_store.equipments(id) ON DELETE CASCADE,
    condition_out TEXT,
    condition_in TEXT,
    PRIMARY KEY (booking_id, equipment_id)
);

CREATE TABLE oltp_store.maintenance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id UUID NOT NULL REFERENCES oltp_store.equipments(id) ON DELETE CASCADE,
    reported_by UUID NOT NULL REFERENCES oltp_store.users(id) ON DELETE CASCADE,
    issue_description TEXT NOT NULL,
    repair_cost NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (repair_cost >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE oltp_store.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES oltp_store.users(id) ON DELETE CASCADE,
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('PRODUCT', 'CAMERA_MODEL')),
    target_id UUID NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    reply_comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- New tables required by backend features
CREATE TABLE oltp_store.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES oltp_store.bookings(id) ON DELETE CASCADE,
    order_id UUID REFERENCES oltp_store.orders(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES oltp_store.users(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL CHECK (type IN ('DEPOSIT','RENTAL_PAYMENT','PURCHASE','REFUND','PENALTY','SURCHARGE')),
    amount NUMERIC(12,2) NOT NULL,
    payment_method VARCHAR(30) NOT NULL DEFAULT 'BANK_TRANSFER',
    status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING','COMPLETED','FAILED','REFUNDED')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_reference CHECK (booking_id IS NOT NULL OR order_id IS NOT NULL)
);

CREATE TABLE oltp_store.identity_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES oltp_store.users(id) ON DELETE CASCADE,
    id_number TEXT NOT NULL,
    front_image_url TEXT NOT NULL,
    back_image_url TEXT NOT NULL,
    selfie_url TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','VERIFIED','REJECTED')),
    verifier_id UUID REFERENCES oltp_store.users(id),
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE oltp_store.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES oltp_store.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE oltp_store.price_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID NOT NULL REFERENCES oltp_store.camera_models(id) ON DELETE CASCADE,
    min_days INTEGER NOT NULL DEFAULT 1,
    max_days INTEGER NOT NULL,
    price_per_day NUMERIC(12,2) NOT NULL,
    deposit_percentage NUMERIC(5,2) NOT NULL DEFAULT 100.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_days CHECK (min_days <= max_days)
);

-- Indexes for performance
CREATE INDEX idx_products_category ON oltp_store.products(category_id);
CREATE INDEX idx_products_brand ON oltp_store.products(brand);
CREATE INDEX idx_camera_models_category ON oltp_store.camera_models(category_id);
CREATE INDEX idx_equipments_model ON oltp_store.equipments(model_id);
CREATE INDEX idx_equipments_status ON oltp_store.equipments(status);
CREATE INDEX idx_bookings_dates ON oltp_store.bookings(start_date, end_date);
CREATE INDEX idx_bookings_user ON oltp_store.bookings(user_id);
CREATE INDEX idx_orders_user ON oltp_store.orders(user_id);
CREATE INDEX idx_transactions_booking ON oltp_store.transactions(booking_id);
CREATE INDEX idx_transactions_order ON oltp_store.transactions(order_id);
CREATE INDEX idx_activity_logs_user ON oltp_store.activity_logs(user_id);

-- 3. Create Triggers & RPC functions

-- Trigger: update_updated_at_column
CREATE OR REPLACE FUNCTION oltp_store.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON oltp_store.users FOR EACH ROW EXECUTE FUNCTION oltp_store.update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON oltp_store.products FOR EACH ROW EXECUTE FUNCTION oltp_store.update_updated_at_column();
CREATE TRIGGER update_camera_models_updated_at BEFORE UPDATE ON oltp_store.camera_models FOR EACH ROW EXECUTE FUNCTION oltp_store.update_updated_at_column();
CREATE TRIGGER update_equipments_updated_at BEFORE UPDATE ON oltp_store.equipments FOR EACH ROW EXECUTE FUNCTION oltp_store.update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON oltp_store.orders FOR EACH ROW EXECUTE FUNCTION oltp_store.update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON oltp_store.bookings FOR EACH ROW EXECUTE FUNCTION oltp_store.update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON oltp_store.transactions FOR EACH ROW EXECUTE FUNCTION oltp_store.update_updated_at_column();
CREATE TRIGGER update_identity_verifications_updated_at BEFORE UPDATE ON oltp_store.identity_verifications FOR EACH ROW EXECUTE FUNCTION oltp_store.update_updated_at_column();

-- Trigger to sync user from auth.users
CREATE OR REPLACE FUNCTION oltp_store.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO oltp_store.users (id, role, first_name, last_name, email, phone_number, password_hash, identity_number)
  VALUES (
    new.id,
    'CUSTOMER',
    COALESCE(new.raw_user_meta_data->>'first_name', 'Customer'),
    COALESCE(new.raw_user_meta_data->>'last_name', substr(new.id::text, 1, 6)),
    COALESCE(new.email, ''),
    new.raw_user_meta_data->>'phone_number',
    'SUPABASE_AUTH_MANAGED',
    'PENDING_' || substr(new.id::text, 1, 8)
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger on auth.users (dropping first to avoid conflicts)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION oltp_store.handle_new_user();

-- Trigger to sync equipment status on booking update
CREATE OR REPLACE FUNCTION oltp_store.sync_equipment_status_on_booking()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.booking_status = 'CHECKED_IN' THEN
        UPDATE oltp_store.equipments SET status = 'RENTED'
        WHERE id IN (SELECT equipment_id FROM oltp_store.booking_equipments WHERE booking_id = NEW.id);
        
        -- Log activity
        INSERT INTO oltp_store.activity_logs (user_id, action, entity_type, entity_id, details)
        VALUES (NEW.user_id, 'CHECKIN', 'booking', NEW.id, json_build_object('booking_id', NEW.id));
    ELSIF NEW.booking_status = 'CHECKED_OUT' THEN
        UPDATE oltp_store.equipments SET status = 'AVAILABLE'
        WHERE id IN (SELECT equipment_id FROM oltp_store.booking_equipments WHERE booking_id = NEW.id);
        
        -- Log activity
        INSERT INTO oltp_store.activity_logs (user_id, action, entity_type, entity_id, details)
        VALUES (NEW.user_id, 'CHECKOUT', 'booking', NEW.id, json_build_object('booking_id', NEW.id));
    ELSIF NEW.booking_status = 'CANCELLED' OR NEW.booking_status = 'CANCELED' THEN
        UPDATE oltp_store.equipments SET status = 'AVAILABLE'
        WHERE id IN (SELECT equipment_id FROM oltp_store.booking_equipments WHERE booking_id = NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_booking_status_change
    AFTER UPDATE OF booking_status ON oltp_store.bookings
    FOR EACH ROW EXECUTE FUNCTION oltp_store.sync_equipment_status_on_booking();

-- RPC: create_booking_safe
CREATE OR REPLACE FUNCTION oltp_store.create_booking_safe(
    p_user_id UUID,
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
    -- 1. Check if user is identity verified
    IF NOT EXISTS (
        SELECT 1 FROM oltp_store.identity_verifications
        WHERE user_id = p_user_id AND status = 'VERIFIED'
    ) THEN
        RETURN json_build_object('success', false, 'error', 'Bạn cần xác minh CCCD trước khi thuê thiết bị');
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

    -- 3. Create booking record
    INSERT INTO oltp_store.bookings (user_id, start_date, end_date, total_rent_fee, deposit_amount, deposit_status, booking_status)
    VALUES (p_user_id, p_start_date, p_end_date, p_total_fee, p_deposit, 'UNPAID', 'PENDING')
    RETURNING id INTO v_booking_id;

    -- 4. Create link to equipment
    INSERT INTO oltp_store.booking_equipments (booking_id, equipment_id)
    VALUES (v_booking_id, v_equipment_id);

    -- 5. Create deposit transaction
    INSERT INTO oltp_store.transactions (booking_id, user_id, type, amount, payment_method, status, notes)
    VALUES (v_booking_id, p_user_id, 'DEPOSIT', p_deposit, 'BANK_TRANSFER', 'PENDING', 'Tiền cọc thuê thiết bị');

    RETURN json_build_object('success', true, 'booking_id', v_booking_id, 'equipment_id', v_equipment_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: calculate_cancellation_fee
CREATE OR REPLACE FUNCTION oltp_store.calculate_cancellation_fee(
    p_booking_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_start_date DATE;
    v_deposit NUMERIC(12,2);
    v_days_diff INTEGER;
    v_fee NUMERIC(12,2);
    v_refund NUMERIC(12,2);
BEGIN
    SELECT start_date::date, deposit_amount INTO v_start_date, v_deposit
    FROM oltp_store.bookings WHERE id = p_booking_id;

    IF v_start_date IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Booking not found');
    END IF;

    v_days_diff := v_start_date - CURRENT_DATE;

    IF v_days_diff >= 2 THEN
        -- Full refund
        v_fee := 0;
        v_refund := v_deposit;
    ELSIF v_days_diff >= 1 THEN
        -- 50% deposit penalty
        v_fee := v_deposit * 0.5;
        v_refund := v_deposit * 0.5;
    ELSE
        -- 100% deposit penalty (no refund)
        v_fee := v_deposit;
        v_refund := 0;
    END IF;

    RETURN json_build_object(
        'success', true,
        'days_before_start', v_days_diff,
        'deposit_amount', v_deposit,
        'cancellation_fee', v_fee,
        'refund_amount', v_refund
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: settle_deposit_on_checkout
CREATE OR REPLACE FUNCTION oltp_store.settle_deposit_on_checkout(
    p_booking_id UUID,
    p_is_damaged BOOLEAN,
    p_damage_charge NUMERIC(12,2),
    p_notes TEXT
) RETURNS JSONB AS $$
DECLARE
    v_booking oltp_store.bookings%ROWTYPE;
    v_equipment_id UUID;
    v_overdue_days INTEGER;
    v_overdue_charge NUMERIC(12,2) := 0;
    v_total_deduction NUMERIC(12,2) := 0;
    v_refund_amount NUMERIC(12,2) := 0;
    v_penalty_amount NUMERIC(12,2) := 0;
BEGIN
    SELECT * INTO v_booking FROM oltp_store.bookings WHERE id = p_booking_id;
    IF v_booking.id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Booking not found');
    END IF;

    -- Get equipment ID for this booking
    SELECT equipment_id INTO v_equipment_id
    FROM oltp_store.booking_equipments
    WHERE booking_id = p_booking_id
    LIMIT 1;

    -- Calculate overdue charge (1.5x daily rent fee per overdue day)
    IF CURRENT_DATE > v_booking.end_date::date THEN
        v_overdue_days := CURRENT_DATE - v_booking.end_date::date;
        v_overdue_charge := (v_booking.total_rent_fee / (v_booking.end_date::date - v_booking.start_date::date + 1)) * 1.5 * v_overdue_days;
    END IF;

    v_total_deduction := v_overdue_charge;
    IF p_is_damaged THEN
        v_total_deduction := v_total_deduction + p_damage_charge;
    END IF;

    -- If total deductions are less than deposit, refund the rest
    IF v_booking.deposit_amount >= v_total_deduction THEN
        v_refund_amount := v_booking.deposit_amount - v_total_deduction;
    ELSE
        -- Deduction exceeds deposit, user owes additional penalty/surcharge
        v_penalty_amount := v_total_deduction - v_booking.deposit_amount;
        v_refund_amount := 0;
    END IF;

    -- Perform checkout state update
    UPDATE oltp_store.bookings
    SET booking_status = 'CHECKED_OUT', checkout_date = now()
    WHERE id = p_booking_id;

    -- If damaged, set equipment status to DAMAGED
    IF p_is_damaged THEN
        UPDATE oltp_store.equipments SET status = 'DAMAGED', condition_notes = p_notes WHERE id = v_equipment_id;
    ELSE
        UPDATE oltp_store.equipments SET status = 'AVAILABLE' WHERE id = v_equipment_id;
    END IF;

    -- Create refund or penalty transactions
    IF v_refund_amount > 0 THEN
        INSERT INTO oltp_store.transactions (booking_id, user_id, type, amount, status, notes)
        VALUES (p_booking_id, v_booking.user_id, 'REFUND', v_refund_amount, 'COMPLETED', 'Refund of security deposit after checkout deduction');
    END IF;

    IF v_overdue_charge > 0 THEN
        INSERT INTO oltp_store.transactions (booking_id, user_id, type, amount, status, notes)
        VALUES (p_booking_id, v_booking.user_id, 'PENALTY', v_overdue_charge, 'COMPLETED', 'Overdue penalty charge');
    END IF;

    IF p_is_damaged AND p_damage_charge > 0 THEN
        INSERT INTO oltp_store.transactions (booking_id, user_id, type, amount, status, notes)
        VALUES (p_booking_id, v_booking.user_id, 'SURCHARGE', p_damage_charge, 'COMPLETED', 'Damage surcharge fee');
    END IF;

    RETURN json_build_object(
        'success', true,
        'overdue_days', COALESCE(v_overdue_days, 0),
        'overdue_charge', v_overdue_charge,
        'damage_charge', CASE WHEN p_is_damaged THEN p_damage_charge ELSE 0 END,
        'total_deduction', v_total_deduction,
        'refund_amount', v_refund_amount,
        'penalty_owed', v_penalty_amount
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: decrement_stock
CREATE OR REPLACE FUNCTION oltp_store.decrement_stock(
    p_product_id UUID,
    p_quantity INTEGER
) RETURNS VOID AS $$
BEGIN
    UPDATE oltp_store.products
    SET stock_quantity = stock_quantity - p_quantity
    WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
