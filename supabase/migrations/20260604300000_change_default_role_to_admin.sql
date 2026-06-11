SET search_path TO oltp_store;

-- 1. Thay đổi default value của cột role trong bảng users thành 'ADMIN'
ALTER TABLE oltp_store.users ALTER COLUMN role SET DEFAULT 'ADMIN';

-- 2. Cập nhật trigger handle_new_user để mặc định role là 'ADMIN' khi không truyền role trong metadata
CREATE OR REPLACE FUNCTION oltp_store.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO oltp_store.users (id, role, first_name, last_name, email, phone_number, password_hash, identity_number)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'role', 'ADMIN'),  -- Mặc định là ADMIN nếu không có metadata
    COALESCE(new.raw_user_meta_data->>'first_name', 'Staff'),
    COALESCE(new.raw_user_meta_data->>'last_name', substr(new.id::text, 1, 6)),
    COALESCE(new.email, ''),
    new.raw_user_meta_data->>'phone_number',
    'SUPABASE_AUTH_MANAGED',
    NULL
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
