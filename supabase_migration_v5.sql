-- Migration v5: Create film_developments table for MUONMAYCHUT Refinements
-- Run this script in your Supabase SQL Editor
SET search_path TO oltp_store;

CREATE TABLE IF NOT EXISTS oltp_store.film_developments (
    id SERIAL PRIMARY KEY,
    ngay_trang DATE NOT NULL DEFAULT CURRENT_DATE,
    ten_khach VARCHAR(255),
    sdt_khach VARCHAR(50),
    cuon_film VARCHAR(255) NOT NULL,
    lab VARCHAR(255),
    ngay_tra DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
