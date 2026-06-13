-- Migration v6: Add ghi_chu column to film_developments table for MUONMAYCHUT Refinements
-- Run this script in your Supabase SQL Editor
SET search_path TO oltp_store;

ALTER TABLE oltp_store.film_developments ADD COLUMN IF NOT EXISTS ghi_chu TEXT;
