SET search_path TO oltp_store;

-- 1. Xóa toàn bộ user và các dữ liệu liên quan để làm sạch hệ thống
TRUNCATE oltp_store.users CASCADE;

-- 2. Drop check constraint cũ và tạo check constraint mới cho role
DO $$
DECLARE
    conname_val text;
BEGIN
    SELECT con.conname INTO conname_val
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'oltp_store'
      AND rel.relname = 'users'
      AND con.contype = 'c'
      AND con.consrc LIKE '%role%';
      
    IF conname_val IS NOT NULL THEN
        EXECUTE 'ALTER TABLE oltp_store.users DROP CONSTRAINT ' || quote_ident(conname_val);
    END IF;
END $$;

ALTER TABLE oltp_store.users ADD CONSTRAINT users_role_check CHECK (role IN ('ADMIN', 'NHANVIENBAN', 'NHANVIENTHUE'));
ALTER TABLE oltp_store.users ALTER COLUMN role SET DEFAULT 'NHANVIENBAN';

-- 3. Cập nhật trigger handle_new_user
CREATE OR REPLACE FUNCTION oltp_store.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO oltp_store.users (id, role, first_name, last_name, email, phone_number, password_hash, identity_number, is_active)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'role', 'NHANVIENBAN'),
    COALESCE(new.raw_user_meta_data->>'first_name', 'Staff'),
    COALESCE(new.raw_user_meta_data->>'last_name', substr(new.id::text, 1, 6)),
    COALESCE(new.email, ''),
    new.raw_user_meta_data->>'phone_number',
    'SUPABASE_AUTH_MANAGED',
    NULL,
    TRUE
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Tạo lại các user mặc định theo yêu cầu của hệ thống mới
-- Admin: admin / admin123
INSERT INTO oltp_store.users (id, role, first_name, last_name, email, phone_number, password_hash, identity_number, is_active)
VALUES (
  'd4444444-4444-4444-4444-444444444444',
  'ADMIN',
  'Admin',
  'Developer',
  'admin@camera.com',
  '0901234567',
  'SUPABASE_AUTH_MANAGED',
  '123456789',
  TRUE
);

-- Nhân viên bán: banmayfilm / bmf123
INSERT INTO oltp_store.users (id, role, first_name, last_name, email, phone_number, password_hash, identity_number, is_active)
VALUES (
  'ba111111-1111-1111-1111-111111111111',
  'NHANVIENBAN',
  'Nhân viên',
  'Bán Máy Film',
  'banmayfilm@camera.com',
  '0901111111',
  'SUPABASE_AUTH_MANAGED',
  '111111111',
  TRUE
);

-- Nhân viên thuê: muonmaychut / mmc123
INSERT INTO oltp_store.users (id, role, first_name, last_name, email, phone_number, password_hash, identity_number, is_active)
VALUES (
  'ba222222-2222-2222-2222-222222222222',
  'NHANVIENTHUE',
  'Nhân viên',
  'Mượn Máy Chút',
  'muonmaychut@camera.com',
  '0902222222',
  'SUPABASE_AUTH_MANAGED',
  '222222222',
  TRUE
);
