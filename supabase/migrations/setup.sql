-- Create ENUMs
CREATE TYPE user_role AS ENUM ('ADMIN', 'STAFF', 'CUSTOMER');
CREATE TYPE item_status AS ENUM ('AVAILABLE', 'RENTED', 'MAINTENANCE', 'DAMAGED');
CREATE TYPE order_status AS ENUM ('PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED');
CREATE TYPE booking_status AS ENUM ('PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'OVERDUE');
CREATE TYPE transaction_type AS ENUM ('DEPOSIT', 'RENTAL_PAYMENT', 'PURCHASE', 'REFUND', 'PENALTY', 'SURCHARGE');
CREATE TYPE verification_status AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');
CREATE TYPE payment_method AS ENUM ('CASH', 'BANK_TRANSFER', 'MOMO', 'VNPAY', 'CREDIT_CARD');

-- 1. Profiles Table (Linked to auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'CUSTOMER',
    full_name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Identity Verifications Table
CREATE TABLE identity_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    id_number TEXT NOT NULL,
    front_image_url TEXT NOT NULL,
    back_image_url TEXT NOT NULL,
    selfie_url TEXT NOT NULL,
    status verification_status NOT NULL DEFAULT 'PENDING',
    verifier_id UUID REFERENCES profiles(id),
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Categories Table
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Products Table (Catalog)
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    brand TEXT NOT NULL,
    description TEXT,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    sale_price NUMERIC(12,2), -- NULL if not for sale
    rental_price_per_day NUMERIC(12,2), -- NULL if not for rent
    images TEXT[] NOT NULL DEFAULT '{}',
    specs JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Price Configs Table (UC 3.3)
CREATE TABLE price_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    min_days INTEGER NOT NULL DEFAULT 1,
    max_days INTEGER NOT NULL,
    price_per_day NUMERIC(12,2) NOT NULL,
    deposit_percentage NUMERIC(5,2) NOT NULL DEFAULT 100.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT check_days CHECK (min_days <= max_days)
);

-- 6. Equipment Table (Physical items for renting/selling)
CREATE TABLE equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    serial_number TEXT NOT NULL UNIQUE,
    status item_status NOT NULL DEFAULT 'AVAILABLE',
    condition_notes TEXT NOT NULL DEFAULT 'Good',
    purchase_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Cart Items Table
CREATE TABLE cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    type TEXT NOT NULL CHECK (type IN ('BUY', 'RENT')),
    rental_days INTEGER CHECK (rental_days > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Orders Table (Purchases)
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status order_status NOT NULL DEFAULT 'PENDING',
    total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount >= 0),
    shipping_address TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Order Items Table
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    equipment_id UUID REFERENCES equipment(id) ON DELETE SET NULL, -- specific physical item sold
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0)
);

-- 10. Bookings Table (Rentals)
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
    status booking_status NOT NULL DEFAULT 'PENDING',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    checkin_date TIMESTAMP WITH TIME ZONE,
    checkout_date TIMESTAMP WITH TIME ZONE,
    total_rental_fee NUMERIC(12,2) NOT NULL CHECK (total_rental_fee >= 0),
    deposit_amount NUMERIC(12,2) NOT NULL CHECK (deposit_amount >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT check_dates CHECK (start_date <= end_date)
);

-- 11. Transactions Table
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type transaction_type NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    payment_method payment_method NOT NULL DEFAULT 'BANK_TRANSFER',
    status TEXT NOT NULL CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT check_reference CHECK (booking_id IS NOT NULL OR order_id IS NOT NULL)
);

-- 12. Activity Logs Table (For audits)
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =========================================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- =========================================================================
CREATE INDEX idx_products_search ON products USING gin(to_tsvector('simple', name || ' ' || brand || ' ' || description));
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_brand ON products(brand);
CREATE INDEX idx_equipment_product ON equipment(product_id);
CREATE INDEX idx_equipment_status ON equipment(status);
CREATE INDEX idx_bookings_dates ON bookings(start_date, end_date);
CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_equipment ON bookings(equipment_id);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_transactions_booking ON transactions(booking_id);
CREATE INDEX idx_transactions_order ON transactions(order_id);
CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);

-- Enable pg_trgm extension for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_products_name_trgm ON products USING gin (name gin_trgm_ops);
CREATE INDEX idx_products_brand_trgm ON products USING gin (brand gin_trgm_ops);

-- =========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to check role in RLS
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins have full access on profiles" ON profiles FOR ALL USING (current_user_role() = 'ADMIN');

-- Identity Verifications Policies
CREATE POLICY "Users can view their own identity proofs" ON identity_verifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can upload their own identity proofs" ON identity_verifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Staff and Admins can view all verifications" ON identity_verifications FOR SELECT USING (current_user_role() IN ('ADMIN', 'STAFF'));
CREATE POLICY "Staff and Admins can update verifications" ON identity_verifications FOR UPDATE USING (current_user_role() IN ('ADMIN', 'STAFF'));

-- Categories Policies
CREATE POLICY "Categories are readable by everyone" ON categories FOR SELECT USING (true);
CREATE POLICY "Admins/Staff can write categories" ON categories FOR ALL USING (current_user_role() IN ('ADMIN', 'STAFF'));

-- Products Policies
CREATE POLICY "Products are readable by everyone" ON products FOR SELECT USING (true);
CREATE POLICY "Admins/Staff can write products" ON products FOR ALL USING (current_user_role() IN ('ADMIN', 'STAFF'));

-- Price Configs Policies
CREATE POLICY "Price configs are readable by everyone" ON price_configs FOR SELECT USING (true);
CREATE POLICY "Admins can manage price configs" ON price_configs FOR ALL USING (current_user_role() = 'ADMIN');

-- Equipment Policies
CREATE POLICY "Equipment status available is readable by everyone" ON equipment FOR SELECT USING (status = 'AVAILABLE' OR current_user_role() IN ('ADMIN', 'STAFF'));
CREATE POLICY "Admins/Staff can manage equipment" ON equipment FOR ALL USING (current_user_role() IN ('ADMIN', 'STAFF'));

-- Cart Items Policies
CREATE POLICY "Users can manage their own cart" ON cart_items FOR ALL USING (auth.uid() = user_id);

-- Orders & Order Items Policies
CREATE POLICY "Users can view their own orders" ON orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own orders" ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins/Staff can view all orders" ON orders FOR SELECT USING (current_user_role() IN ('ADMIN', 'STAFF'));
CREATE POLICY "Admins/Staff can update all orders" ON orders FOR UPDATE USING (current_user_role() IN ('ADMIN', 'STAFF'));

CREATE POLICY "Users can view their own order items" ON order_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
);
CREATE POLICY "Users can insert their own order items" ON order_items FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
);
CREATE POLICY "Admins/Staff can view all order items" ON order_items FOR SELECT USING (current_user_role() IN ('ADMIN', 'STAFF'));

-- Bookings Policies
CREATE POLICY "Users can view their own bookings" ON bookings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create bookings" ON bookings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can cancel their own bookings" ON bookings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins/Staff can view and update bookings" ON bookings FOR ALL USING (current_user_role() IN ('ADMIN', 'STAFF'));

-- Transactions Policies
CREATE POLICY "Users can view their own transactions" ON transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins/Staff can manage transactions" ON transactions FOR ALL USING (current_user_role() IN ('ADMIN', 'STAFF'));

-- Activity Logs Policies
CREATE POLICY "Users can view their own activity logs" ON activity_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all logs" ON activity_logs FOR SELECT USING (current_user_role() = 'ADMIN');

-- =========================================================================
-- TRIGGERS & FUNCTIONS
-- =========================================================================

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name, phone, avatar_url)
  VALUES (
    new.id,
    'CUSTOMER',
    COALESCE(new.raw_user_meta_data->>'full_name', 'Customer_' || substr(new.id::text, 1, 6)),
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON equipment FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Reusable Activity Log helper function
CREATE OR REPLACE FUNCTION log_user_activity(
    p_user_id UUID,
    p_action TEXT,
    p_entity_type TEXT,
    p_entity_id UUID,
    p_details JSONB,
    p_ip TEXT
) RETURNS VOID AS $$
BEGIN
    INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details, ip_address)
    VALUES (p_user_id, p_action, p_entity_type, p_entity_id, p_details, p_ip);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update equipment status on checkin/checkout
CREATE OR REPLACE FUNCTION sync_equipment_status_on_booking()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'CHECKED_IN' THEN
        UPDATE equipment SET status = 'RENTED' WHERE id = NEW.equipment_id;
        -- Log activity
        INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
        VALUES (NEW.user_id, 'CHECKIN', 'equipment', NEW.equipment_id, json_build_object('booking_id', NEW.id));
    ELSIF NEW.status = 'CHECKED_OUT' THEN
        UPDATE equipment SET status = 'AVAILABLE' WHERE id = NEW.equipment_id;
        -- Log activity
        INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
        VALUES (NEW.user_id, 'CHECKOUT', 'equipment', NEW.equipment_id, json_build_object('booking_id', NEW.id));
    ELSIF NEW.status = 'CANCELLED' THEN
        UPDATE equipment SET status = 'AVAILABLE' WHERE id = NEW.equipment_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_booking_status_change
    AFTER UPDATE OF status ON bookings
    FOR EACH ROW EXECUTE FUNCTION sync_equipment_status_on_booking();

-- =========================================================================
-- REMOTE PROCEDURE CALL (RPC) FUNCTIONS (UC 5.1, 5.4, 6.2)
-- =========================================================================

-- RPC 1: Serializable Check Booking Availability & Create Booking
CREATE OR REPLACE FUNCTION create_booking_safe(
    p_user_id UUID,
    p_product_id UUID,
    p_start_date DATE,
    p_end_date DATE,
    p_total_fee NUMERIC(12,2),
    p_deposit NUMERIC(12,2)
) RETURNS JSONB AS $$
DECLARE
    v_equipment_id UUID;
    v_booking_id UUID;
    v_result JSONB;
BEGIN
    -- Set Transaction Isolation Level to Serializable inside this execution
    -- Select an available equipment item that does not conflict with target dates
    SELECT eq.id INTO v_equipment_id
    FROM equipment eq
    WHERE eq.product_id = p_product_id
      AND eq.status <> 'DAMAGED'
      AND eq.status <> 'MAINTENANCE'
      AND NOT EXISTS (
          SELECT 1 FROM bookings b
          WHERE b.equipment_id = eq.id
            AND b.status IN ('PENDING', 'CONFIRMED', 'CHECKED_IN')
            AND (
                (p_start_date BETWEEN b.start_date AND b.end_date) OR
                (p_end_date BETWEEN b.start_date AND b.end_date) OR
                (b.start_date BETWEEN p_start_date AND p_end_date)
            )
      )
    LIMIT 1;

    IF v_equipment_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'No available equipment of this product model for the selected dates');
    END IF;

    -- Create booking
    INSERT INTO bookings (user_id, equipment_id, status, start_date, end_date, total_rental_fee, deposit_amount)
    VALUES (p_user_id, v_equipment_id, 'PENDING', p_start_date, p_end_date, p_total_fee, p_deposit)
    RETURNING id INTO v_booking_id;

    -- Create initial pending deposit transaction
    INSERT INTO transactions (booking_id, user_id, type, amount, payment_method, status, notes)
    VALUES (v_booking_id, p_user_id, 'DEPOSIT', p_deposit, 'BANK_TRANSFER', 'PENDING', 'Initial security deposit for rental');

    RETURN json_build_object('success', true, 'booking_id', v_booking_id, 'equipment_id', v_equipment_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC 2: Calculate Cancellation Fee (UC 5.4)
CREATE OR REPLACE FUNCTION calculate_cancellation_fee(
    p_booking_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_start_date DATE;
    v_deposit NUMERIC(12,2);
    v_days_diff INTEGER;
    v_fee NUMERIC(12,2);
    v_refund NUMERIC(12,2);
BEGIN
    SELECT start_date, deposit_amount INTO v_start_date, v_deposit
    FROM bookings WHERE id = p_booking_id;

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

-- RPC 3: Deposit Settlement with Surcharge (UC 6.2)
CREATE OR REPLACE FUNCTION settle_deposit_on_checkout(
    p_booking_id UUID,
    p_is_damaged BOOLEAN,
    p_damage_charge NUMERIC(12,2),
    p_notes TEXT
) RETURNS JSONB AS $$
DECLARE
    v_booking bookings%ROWTYPE;
    v_overdue_days INTEGER;
    v_overdue_charge NUMERIC(12,2) := 0;
    v_total_deduction NUMERIC(12,2) := 0;
    v_refund_amount NUMERIC(12,2) := 0;
    v_penalty_amount NUMERIC(12,2) := 0;
    v_surcharge_amount NUMERIC(12,2) := 0;
BEGIN
    SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id;
    IF v_booking.id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Booking not found');
    END IF;

    -- Calculate overdue charge (1.5x daily rent fee per overdue day)
    IF CURRENT_DATE > v_booking.end_date THEN
        v_overdue_days := CURRENT_DATE - v_booking.end_date;
        -- Daily rent fee estimate
        v_overdue_charge := (v_booking.total_rental_fee / (v_booking.end_date - v_booking.start_date + 1)) * 1.5 * v_overdue_days;
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
    UPDATE bookings
    SET status = 'CHECKED_OUT', checkout_date = now()
    WHERE id = p_booking_id;

    -- If damaged, set equipment status to DAMAGED
    IF p_is_damaged THEN
        UPDATE equipment SET status = 'DAMAGED', condition_notes = p_notes WHERE id = v_booking.equipment_id;
    ELSE
        UPDATE equipment SET status = 'AVAILABLE' WHERE id = v_booking.equipment_id;
    END IF;

    -- Create refund or penalty transactions
    IF v_refund_amount > 0 THEN
        INSERT INTO transactions (booking_id, user_id, type, amount, status, notes)
        VALUES (p_booking_id, v_booking.user_id, 'REFUND', v_refund_amount, 'COMPLETED', 'Refund of security deposit after checkout deduction');
    END IF;

    IF v_overdue_charge > 0 THEN
        INSERT INTO transactions (booking_id, user_id, type, amount, status, notes)
        VALUES (p_booking_id, v_booking.user_id, 'PENALTY', v_overdue_charge, 'COMPLETED', 'Overdue penalty charge');
    END IF;

    IF p_is_damaged AND p_damage_charge > 0 THEN
        INSERT INTO transactions (booking_id, user_id, type, amount, status, notes)
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
