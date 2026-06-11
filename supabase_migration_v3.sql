-- Migration v3: DB Optimization & Consolidation with Compatibility Layer
-- Run this script in your Supabase SQL Editor

CREATE SCHEMA IF NOT EXISTS oltp_store;
SET search_path TO oltp_store;

-- ==========================================
-- 1. DỌN DẸP AN TOÀN CÁC BẢNG CŨ VÀ VIEW CŨ (DÙNG KHỐI LỆNH ĐỘNG)
-- ==========================================
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT table_name, table_type 
        FROM information_schema.tables 
        WHERE table_schema = 'oltp_store' 
          AND table_name IN (
            'feedbacks', 'maintenance_logs', 'transactions', 'expenses', 
            'product_imports', 'sale_imports', 'rental_imports', 'sale_orders', 
            'order_items', 'orders', 'booking_equipments', 'bookings', 
            'customers', 'sale_customers', 'users', 'employees', 
            'sale_employees', 'sale_products', 'equipments', 'products', 
            'camera_models', 'categories', 'reviews'
          )
    LOOP
        IF r.table_type = 'VIEW' THEN
            EXECUTE 'DROP VIEW IF EXISTS oltp_store.' || quote_ident(r.table_name) || ' CASCADE';
        ELSE
            EXECUTE 'DROP TABLE IF EXISTS oltp_store.' || quote_ident(r.table_name) || ' CASCADE';
        END IF;
    END LOOP;
END $$;

-- ==========================================
-- 2. THIẾT LẬP THƯ VIỆN
-- ==========================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- 3. DANH MỤC & KHO CHO THUÊ (MUONMAYCHUT)
-- ==========================================
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

-- Gộp camera_models + products
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    categories_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    name VARCHAR(200) NOT NULL,
    brand VARCHAR(100),
    price BIGINT DEFAULT 0 CHECK (price >= 0),
    rent_price_per_day NUMERIC DEFAULT 0 CHECK (rent_price_per_day >= 0),
    deposit_amount NUMERIC DEFAULT 0 CHECK (deposit_amount >= 0),
    stock_quantity INTEGER DEFAULT 0 CHECK (stock_quantity >= 0),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE equipments (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    serial_number VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'AVAILABLE'
        CHECK (status IN ('AVAILABLE', 'RENTED', 'MAINTENANCE', 'DAMAGED')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 4. KHO BÁN MÁY FILM (BANMAYFILM)
-- ==========================================
CREATE TABLE sale_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(100) NOT NULL DEFAULT '',
    category_name VARCHAR(255) NOT NULL,
    sale_price NUMERIC(12,2) NOT NULL CHECK (sale_price >= 0),
    total_stock INTEGER NOT NULL DEFAULT 0 CHECK (total_stock >= 0),
    available_stock INTEGER NOT NULL DEFAULT 0 CHECK (available_stock >= 0),
    description TEXT,
    images JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 5. CON NGƯỜI (NHÂN VIÊN & KHÁCH HÀNG THỐNG NHẤT)
-- ==========================================
-- Gộp users + employees + sale_employees
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id SERIAL UNIQUE, -- ID số tự tăng phục vụ tương thích ngược
    role VARCHAR(30) NOT NULL DEFAULT 'NHANVIENBAN'
        CHECK (role IN ('ADMIN', 'NHANVIENBAN', 'NHANVIENTHUE')),
    staff_code VARCHAR(50) UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE, -- nullable để tạo staff ko cần credentials
    phone_number VARCHAR(20) UNIQUE,
    password_hash VARCHAR(500), -- nullable
    identity_number VARCHAR(50) UNIQUE,
    address TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Gộp customers + sale_customers
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    phone_number VARCHAR(20),
    identity_number VARCHAR(50),
    address TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 6. ĐƠN HÀNG & GIAO DỊCH
-- ==========================================
CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL CONSTRAINT check_dates CHECK (end_date >= start_date),
    total_rent_fee BIGINT NOT NULL DEFAULT 0 CHECK (total_rent_fee >= 0),
    deposit_fee BIGINT NOT NULL DEFAULT 0 CHECK (deposit_fee >= 0),
    deposit_status VARCHAR(20) DEFAULT 'UNPAID'
        CHECK (deposit_status IN ('UNPAID', 'HELD', 'REFUNDED', 'DEDUCTED')),
    booking_status VARCHAR(20) DEFAULT 'PENDING'
        CHECK (booking_status IN ('PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELED', 'OVERDUE')),
    penalty_fee BIGINT NOT NULL DEFAULT 0 CHECK (penalty_fee >= 0),
    checkin_date TIMESTAMP,
    checkout_date TIMESTAMP,
    delivered_by INTEGER,
    received_by INTEGER,
    notes TEXT,
    battery_product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
    battery_quantity INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE booking_equipments (
    booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    equipment_id INTEGER NOT NULL REFERENCES equipments(id) ON DELETE RESTRICT,
    condition_out TEXT,
    condition_in TEXT,
    accessories_out TEXT[] DEFAULT '{}',
    accessories_in TEXT[] DEFAULT '{}',
    PRIMARY KEY (booking_id, equipment_id)
);

CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    total_price BIGINT NOT NULL DEFAULT 0 CHECK (total_price >= 0),
    status VARCHAR(20) DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'PAID', 'COMPLETED', 'CANCELED')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price BIGINT NOT NULL CHECK (unit_price >= 0)
);

CREATE TABLE sale_orders (
    id SERIAL PRIMARY KEY,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    product_id UUID NOT NULL REFERENCES sale_products(id) ON DELETE RESTRICT,
    sale_price NUMERIC(12,2) NOT NULL CHECK (sale_price >= 0),
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    sold_by UUID REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'COMPLETED'
        CHECK (status IN ('PENDING', 'COMPLETED', 'CANCELLED')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 7. CHI PHÍ, NHẬP KHO & THANH TOÁN
-- ==========================================
-- Gộp rental_imports + sale_imports
CREATE TABLE product_imports (
    id SERIAL PRIMARY KEY,
    import_date DATE NOT NULL,
    total_value NUMERIC(12,2) NOT NULL CHECK (total_value >= 0),
    product_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    received_by VARCHAR(255) NOT NULL,
    business_type VARCHAR(30) NOT NULL
        CHECK (business_type IN ('MUONMAYCHUT', 'BANMAYFILM')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE expenses (
    id SERIAL PRIMARY KEY,
    business_type VARCHAR(50) NOT NULL CHECK (business_type IN ('MUONMAYCHUT', 'BANMAYFILM')),
    expense_date DATE NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    paid_by VARCHAR(255) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
    order_id INTEGER REFERENCES orders(order_id) ON DELETE CASCADE,
    sale_order_id INTEGER REFERENCES sale_orders(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL
        CHECK (type IN ('DEPOSIT','RENTAL_PAYMENT','PURCHASE','REFUND','PENALTY','SURCHARGE')),
    amount NUMERIC(12,2) NOT NULL,
    payment_method VARCHAR(30) NOT NULL DEFAULT 'BANK_TRANSFER',
    status VARCHAR(20) NOT NULL
        CHECK (status IN ('PENDING','COMPLETED','FAILED','REFUNDED')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_reference CHECK (
        booking_id IS NOT NULL OR order_id IS NOT NULL OR sale_order_id IS NOT NULL
    )
);

-- ==========================================
-- 8. BẢNG PHỤ
-- ==========================================
CREATE TABLE maintenance_logs (
    id SERIAL PRIMARY KEY,
    equipment_id INTEGER NOT NULL REFERENCES equipments(id) ON DELETE CASCADE,
    reported_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    issue_description TEXT NOT NULL,
    repair_cost BIGINT NOT NULL DEFAULT 0 CHECK (repair_cost >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE feedbacks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id),
    booking_id INTEGER REFERENCES bookings(id),
    order_id INTEGER REFERENCES orders(order_id),
    type VARCHAR(20) NOT NULL DEFAULT 'FEEDBACK'
        CHECK (type IN ('FEEDBACK', 'COMPLAINT', 'SUGGESTION')),
    content TEXT NOT NULL,
    staff_id UUID NOT NULL REFERENCES users(id),
    resolved BOOLEAN DEFAULT FALSE,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 9. LỚP TƯƠNG THÍCH NGƯỢC (COMPATIBILITY VIEWS & TRIGGERS)
-- ==========================================

-- A. VIEW camera_models
CREATE OR REPLACE VIEW oltp_store.camera_models AS
SELECT 
    id,
    categories_id AS catgories_id,
    name AS model_name,
    rent_price_per_day,
    deposit_amount,
    is_active,
    price AS sale_price,
    brand
FROM oltp_store.products;

CREATE OR REPLACE FUNCTION oltp_store.trg_camera_models_io()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO oltp_store.products (id, categories_id, name, brand, price, rent_price_per_day, deposit_amount, is_active)
        VALUES (COALESCE(NEW.id, nextval('oltp_store.products_id_seq')), NEW.catgories_id, NEW.model_name, NEW.brand, COALESCE(NEW.sale_price, 0), COALESCE(NEW.rent_price_per_day, 0), COALESCE(NEW.deposit_amount, 0), COALESCE(NEW.is_active, true))
        RETURNING id INTO NEW.id;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE oltp_store.products SET
            categories_id = NEW.catgories_id,
            name = NEW.model_name,
            brand = NEW.brand,
            price = NEW.sale_price,
            rent_price_per_day = NEW.rent_price_per_day,
            deposit_amount = NEW.deposit_amount,
            is_active = NEW.is_active
        WHERE id = OLD.id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        DELETE FROM oltp_store.products WHERE id = OLD.id;
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER camera_models_io_trigger
INSTEAD OF INSERT OR UPDATE OR DELETE
ON oltp_store.camera_models
FOR EACH ROW EXECUTE FUNCTION oltp_store.trg_camera_models_io();

-- B. VIEW employees
CREATE OR REPLACE VIEW oltp_store.employees AS
SELECT 
    employee_id AS id,
    staff_code,
    (first_name || ' ' || last_name) AS full_name,
    phone_number AS phone,
    address,
    notes,
    created_at
FROM oltp_store.users;

CREATE OR REPLACE FUNCTION oltp_store.trg_employees_io()
RETURNS TRIGGER AS $$
DECLARE
    f_name VARCHAR(100);
    l_name VARCHAR(100);
    names TEXT[];
BEGIN
    IF TG_OP = 'INSERT' THEN
        names := string_to_array(trim(NEW.full_name), ' ');
        IF array_length(names, 1) > 1 THEN
            l_name := names[array_length(names, 1)];
            f_name := array_to_string(names[1:array_length(names, 1)-1], ' ');
        ELSE
            f_name := NEW.full_name;
            l_name := '';
        END IF;

        INSERT INTO oltp_store.users (role, staff_code, first_name, last_name, phone_number, address, notes, email, password_hash)
        VALUES ('STAFF', NEW.staff_code, f_name, l_name, NEW.phone, NEW.address, NEW.notes, NEW.staff_code || '@camera.store', 'mock-password-hash')
        RETURNING employee_id INTO NEW.id;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        names := string_to_array(trim(NEW.full_name), ' ');
        IF array_length(names, 1) > 1 THEN
            l_name := names[array_length(names, 1)];
            f_name := array_to_string(names[1:array_length(names, 1)-1], ' ');
        ELSE
            f_name := NEW.full_name;
            l_name := '';
        END IF;

        UPDATE oltp_store.users SET
            staff_code = NEW.staff_code,
            first_name = f_name,
            last_name = l_name,
            phone_number = NEW.phone,
            address = NEW.address,
            notes = NEW.notes
        WHERE employee_id = OLD.id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        DELETE FROM oltp_store.users WHERE employee_id = OLD.id;
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER employees_io_trigger
INSTEAD OF INSERT OR UPDATE OR DELETE
ON oltp_store.employees
FOR EACH ROW EXECUTE FUNCTION oltp_store.trg_employees_io();

-- C. VIEW sale_employees
CREATE OR REPLACE VIEW oltp_store.sale_employees AS
SELECT 
    employee_id AS id,
    staff_code,
    (first_name || ' ' || last_name) AS full_name,
    phone_number AS phone,
    address,
    notes,
    created_at
FROM oltp_store.users;

CREATE TRIGGER sale_employees_io_trigger
INSTEAD OF INSERT OR UPDATE OR DELETE
ON oltp_store.sale_employees
FOR EACH ROW EXECUTE FUNCTION oltp_store.trg_employees_io();

-- D. VIEW sale_customers
CREATE OR REPLACE VIEW oltp_store.sale_customers AS
SELECT 
    id,
    (first_name || ' ' || last_name) AS full_name,
    phone_number AS phone,
    address,
    email,
    notes,
    created_at
FROM oltp_store.customers;

CREATE OR REPLACE FUNCTION oltp_store.trg_sale_customers_io()
RETURNS TRIGGER AS $$
DECLARE
    f_name VARCHAR(100);
    l_name VARCHAR(100);
    names TEXT[];
BEGIN
    IF TG_OP = 'INSERT' THEN
        names := string_to_array(trim(NEW.full_name), ' ');
        IF array_length(names, 1) > 1 THEN
            l_name := names[array_length(names, 1)];
            f_name := array_to_string(names[1:array_length(names, 1)-1], ' ');
        ELSE
            f_name := NEW.full_name;
            l_name := '';
        END IF;

        INSERT INTO oltp_store.customers (id, first_name, last_name, phone_number, address, email, notes)
        VALUES (COALESCE(NEW.id, gen_random_uuid()), f_name, l_name, NEW.phone, NEW.address, NEW.email, NEW.notes)
        RETURNING id INTO NEW.id;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        names := string_to_array(trim(NEW.full_name), ' ');
        IF array_length(names, 1) > 1 THEN
            l_name := names[array_length(names, 1)];
            f_name := array_to_string(names[1:array_length(names, 1)-1], ' ');
        ELSE
            f_name := NEW.full_name;
            l_name := '';
        END IF;

        UPDATE oltp_store.customers SET
            first_name = f_name,
            last_name = l_name,
            phone_number = NEW.phone,
            address = NEW.address,
            email = NEW.email,
            notes = NEW.notes
        WHERE id = OLD.id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        DELETE FROM oltp_store.customers WHERE id = OLD.id;
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sale_customers_io_trigger
INSTEAD OF INSERT OR UPDATE OR DELETE
ON oltp_store.sale_customers
FOR EACH ROW EXECUTE FUNCTION oltp_store.trg_sale_customers_io();

-- E. VIEW rental_imports & sale_imports
CREATE OR REPLACE VIEW oltp_store.rental_imports AS
SELECT 
    id,
    import_date,
    total_value,
    product_name,
    quantity,
    received_by,
    notes,
    created_at
FROM oltp_store.product_imports
WHERE business_type = 'MUONMAYCHUT';

CREATE OR REPLACE VIEW oltp_store.sale_imports AS
SELECT 
    id,
    import_date,
    total_value,
    product_name,
    quantity,
    received_by,
    notes,
    created_at
FROM oltp_store.product_imports
WHERE business_type = 'BANMAYFILM';

CREATE OR REPLACE FUNCTION oltp_store.trg_rental_imports_io()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO oltp_store.product_imports (id, import_date, total_value, product_name, quantity, received_by, business_type, notes)
        VALUES (COALESCE(NEW.id, nextval('oltp_store.product_imports_id_seq')), NEW.import_date, NEW.total_value, NEW.product_name, NEW.quantity, NEW.received_by, 'MUONMAYCHUT', NEW.notes)
        RETURNING id INTO NEW.id;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE oltp_store.product_imports SET
            import_date = NEW.import_date,
            total_value = NEW.total_value,
            product_name = NEW.product_name,
            quantity = NEW.quantity,
            received_by = NEW.received_by,
            notes = NEW.notes
        WHERE id = OLD.id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        DELETE FROM oltp_store.product_imports WHERE id = OLD.id;
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER rental_imports_io_trigger
INSTEAD OF INSERT OR UPDATE OR DELETE
ON oltp_store.rental_imports
FOR EACH ROW EXECUTE FUNCTION oltp_store.trg_rental_imports_io();

CREATE OR REPLACE FUNCTION oltp_store.trg_sale_imports_io()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO oltp_store.product_imports (id, import_date, total_value, product_name, quantity, received_by, business_type, notes)
        VALUES (COALESCE(NEW.id, nextval('oltp_store.product_imports_id_seq')), NEW.import_date, NEW.total_value, NEW.product_name, NEW.quantity, NEW.received_by, 'BANMAYFILM', NEW.notes)
        RETURNING id INTO NEW.id;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE oltp_store.product_imports SET
            import_date = NEW.import_date,
            total_value = NEW.total_value,
            product_name = NEW.product_name,
            quantity = NEW.quantity,
            received_by = NEW.received_by,
            notes = NEW.notes
        WHERE id = OLD.id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        DELETE FROM oltp_store.product_imports WHERE id = OLD.id;
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sale_imports_io_trigger
INSTEAD OF INSERT OR UPDATE OR DELETE
ON oltp_store.sale_imports
FOR EACH ROW EXECUTE FUNCTION oltp_store.trg_sale_imports_io();

-- ==========================================
-- 10. KHỞI TẠO INDEX TỐI ƯU HÓA HÀM TÌM KIẾM
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_sale_products_name ON sale_products(name);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone_number);
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON bookings(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_transactions_booking ON transactions(booking_id);
CREATE INDEX IF NOT EXISTS idx_transactions_order ON transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_transactions_sale_order ON transactions(sale_order_id);

-- ==========================================
-- 11. ĐỒNG BỘ AUTH.USERS & OLTP_STORE.USERS
-- ==========================================

-- A. Trigger khi có User mới đăng ký ở Auth.Users -> Tự động thêm vào oltp_store.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    full_name_meta TEXT;
    names TEXT[];
    f_name VARCHAR(100);
    l_name VARCHAR(100);
BEGIN
    -- Lấy thông tin họ tên từ metadata của Supabase Auth
    full_name_meta := COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name');
    f_name := COALESCE(new.raw_user_meta_data->>'first_name', '');
    l_name := COALESCE(new.raw_user_meta_data->>'last_name', '');
    
    IF f_name = '' AND l_name = '' AND full_name_meta IS NOT NULL THEN
        names := string_to_array(trim(full_name_meta), ' ');
        IF array_length(names, 1) > 1 THEN
            l_name := names[array_length(names, 1)];
            f_name := array_to_string(names[1:array_length(names, 1)-1], ' ');
        ELSE
            f_name := full_name_meta;
            l_name := '';
        END IF;
    END IF;
    
    IF f_name = '' THEN
        f_name := 'Staff';
    END IF;

    INSERT INTO oltp_store.users (
        id, 
        email, 
        password_hash, 
        first_name, 
        last_name, 
        role, 
        staff_code,
        is_active
    )
    VALUES (
        new.id, 
        new.email, 
        COALESCE(new.encrypted_password, '$2a$10$dummyhashplaceholder'), 
        f_name, 
        l_name, 
        COALESCE(new.raw_user_meta_data->>'role', 'STAFF'),
        COALESCE(new.raw_user_meta_data->>'staff_code', 'STAFF-' || substring(new.id::text from 1 for 8)),
        true
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Đăng ký trigger trên auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- B. Trigger khi xóa User bên oltp_store.users -> Tự động xóa tài khoản bên auth.users
CREATE OR REPLACE FUNCTION public.handle_deleted_user()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM auth.users WHERE id = old.id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Đăng ký trigger trên oltp_store.users
DROP TRIGGER IF EXISTS on_oltp_user_deleted ON oltp_store.users;
CREATE TRIGGER on_oltp_user_deleted
  AFTER DELETE ON oltp_store.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_deleted_user();

