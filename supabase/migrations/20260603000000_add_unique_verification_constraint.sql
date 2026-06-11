-- Ngăn chặn race condition tạo trùng lặp xác minh CCCD
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_verification
  ON identity_verifications (user_id)
  WHERE status IN ('PENDING', 'VERIFIED');
