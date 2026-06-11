-- Migration: Add rental_imports table and battery selection columns to bookings
-- Path: supabase/migrations/20260610000000_add_rental_imports_and_battery.sql

-- 1. Create rental_imports table in oltp_store schema
CREATE TABLE IF NOT EXISTS oltp_store.rental_imports (
    id SERIAL PRIMARY KEY,
    import_date DATE NOT NULL,
    total_value NUMERIC(12,2) NOT NULL CHECK (total_value >= 0),
    product_name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    received_by VARCHAR(255) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rental_imports_date ON oltp_store.rental_imports(import_date);

-- 2. Add columns to bookings for battery add-on
ALTER TABLE oltp_store.bookings
ADD COLUMN IF NOT EXISTS battery_product_id INT REFERENCES oltp_store.products(id) ON DELETE SET NULL;

ALTER TABLE oltp_store.bookings
ADD COLUMN IF NOT EXISTS battery_quantity INT DEFAULT 0;
