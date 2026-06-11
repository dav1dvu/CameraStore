-- ========================================
-- SUPABASE SQL - Chạy trên schema oltp_store
-- ========================================

SET search_path TO oltp_store;

-- 1. Tạo bảng customers
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    identity_number VARCHAR(50) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Thêm cột customer_id vào bookings (nếu chưa có)
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE CASCADE;

-- 3. Thêm cột customer_id vào orders (nếu chưa có)
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE CASCADE;

-- 4. Tạo indexes cho search nhanh
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone_number ON customers(phone_number);
CREATE INDEX IF NOT EXISTS idx_customers_identity_number ON customers(identity_number);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);

-- 5. Tạo view để lấy lịch sử customer (OPTIONAL)
CREATE OR REPLACE VIEW customer_history AS
SELECT 
  c.id as customer_id,
  c.first_name,
  c.last_name,
  c.email,
  c.phone_number,
  COUNT(DISTINCT b.id) as total_bookings,
  COUNT(DISTINCT o.id) as total_orders,
  SUM(b.total_rental_fee) as total_rental_spent,
  SUM(o.total_amount) as total_purchase_spent
FROM customers c
LEFT JOIN bookings b ON c.id = b.customer_id
LEFT JOIN orders o ON c.id = o.customer_id
GROUP BY c.id, c.first_name, c.last_name, c.email, c.phone_number;

-- ========================================
-- Kiểm tra (chạy lệnh sau để xác nhận)
-- ========================================
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'oltp_store' AND table_name = 'customers';

-- SELECT column_name FROM information_schema.columns 
-- WHERE table_schema = 'oltp_store' AND table_name = 'bookings' 
-- AND column_name = 'customer_id';
