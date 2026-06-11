-- Migration v2: Banmayfilm and Muonmaychut additions
-- Run this script in your Supabase SQL Editor

CREATE SCHEMA IF NOT EXISTS oltp_store;
SET search_path TO oltp_store;

-- 1. expenses table (general expenses for both business types)
CREATE TABLE IF NOT EXISTS oltp_store.expenses (
    id SERIAL PRIMARY KEY,
    business_type VARCHAR(50) NOT NULL CHECK (business_type IN ('MUONMAYCHUT', 'BANMAYFILM')),
    expense_date DATE NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    paid_by VARCHAR(255) NOT NULL, -- Name of staff or "Doanh nghiệp"
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. sale_employees table (separate employees list for Banmayfilm)
CREATE TABLE IF NOT EXISTS oltp_store.sale_employees (
    id SERIAL PRIMARY KEY,
    staff_code VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. sale_customers table (separate customers list for Banmayfilm)
CREATE TABLE IF NOT EXISTS oltp_store.sale_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    address TEXT,
    email VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. sale_products table (separate products list for Banmayfilm - sales only)
CREATE TABLE IF NOT EXISTS oltp_store.sale_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(100) NOT NULL DEFAULT '',
    category_name VARCHAR(255) NOT NULL,
    sale_price NUMERIC(12,2) NOT NULL CHECK (sale_price >= 0),
    total_stock INT NOT NULL DEFAULT 0 CHECK (total_stock >= 0),
    available_stock INT NOT NULL DEFAULT 0 CHECK (available_stock >= 0),
    description TEXT,
    images JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. sale_orders table (sales orders for Banmayfilm)
CREATE TABLE IF NOT EXISTS oltp_store.sale_orders (
    id SERIAL PRIMARY KEY,
    customer_id UUID NOT NULL REFERENCES oltp_store.sale_customers(id) ON DELETE RESTRICT,
    product_id UUID NOT NULL REFERENCES oltp_store.sale_products(id) ON DELETE RESTRICT,
    sale_price NUMERIC(12,2) NOT NULL CHECK (sale_price >= 0),
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    sold_by INT REFERENCES oltp_store.sale_employees(id) ON DELETE SET NULL,
    notes TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('PENDING', 'COMPLETED', 'CANCELLED')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. sale_imports table (product imports history for Banmayfilm)
CREATE TABLE IF NOT EXISTS oltp_store.sale_imports (
    id SERIAL PRIMARY KEY,
    import_date DATE NOT NULL,
    total_value NUMERIC(12,2) NOT NULL CHECK (total_value >= 0),
    product_name VARCHAR(255) NOT NULL, -- Free text (nhập tay)
    quantity INT NOT NULL CHECK (quantity > 0),
    received_by VARCHAR(255) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_expenses_date ON oltp_store.expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_business_type ON oltp_store.expenses(business_type);
CREATE INDEX IF NOT EXISTS idx_sale_customers_phone ON oltp_store.sale_customers(phone);
CREATE INDEX IF NOT EXISTS idx_sale_products_name ON oltp_store.sale_products(name);
CREATE INDEX IF NOT EXISTS idx_sale_orders_customer ON oltp_store.sale_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_sale_orders_product ON oltp_store.sale_orders(product_id);
CREATE INDEX IF NOT EXISTS idx_sale_orders_sold_by ON oltp_store.sale_orders(sold_by);
CREATE INDEX IF NOT EXISTS idx_sale_imports_date ON oltp_store.sale_imports(import_date);
