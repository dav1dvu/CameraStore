-- Migration v7: Thêm cột transaction_type vào bảng expenses
-- Run this script in your Supabase SQL Editor
SET search_path TO oltp_store;

ALTER TABLE oltp_store.expenses ADD COLUMN IF NOT EXISTS transaction_type VARCHAR(3) DEFAULT 'CHI' CHECK (transaction_type IN ('CHI', 'THU'));
