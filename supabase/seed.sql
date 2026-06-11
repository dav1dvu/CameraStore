-- Seed categories
INSERT INTO oltp_store.categories (id, name, slug, description) VALUES
('a1111111-1111-1111-1111-111111111111', 'Máy ảnh SLR (Cơ học)', 'slr-cameras', 'Máy ảnh cơ SLR phản xạ ống kính đơn với ống kính có thể tháo rời'),
('b2222222-2222-2222-2222-222222222222', 'Máy ảnh Rangefinder (Trắc cự)', 'rangefinder-cameras', 'Máy ảnh cơ Rangefinder nhỏ gọn, lấy nét tay thủ công'),
('c3333333-3333-3333-3333-333333333333', 'Máy ảnh Medium Format', 'medium-format', 'Máy ảnh cơ Medium Format chuyên nghiệp');

-- Seed products (For SALE)
INSERT INTO oltp_store.products (id, name, slug, brand, description, category_id, price, sale_price, stock_quantity, images, specs) VALUES
('d4444444-4444-4444-4444-444444444444', 'Canon AE-1 Program (Mua đứt)', 'canon-ae1-program-buy', 'Canon', 'Dòng máy ảnh cơ huyền thoại, lý tưởng cho cả người mới bắt đầu lẫn người chụp chuyên nghiệp. Hỗ trợ chế độ Program AE tiện lợi.', 'a1111111-1111-1111-1111-111111111111', 6250000, 6250000, 5, ARRAY['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=800'], '{"Ngàm ống kính": "Canon FD", "Tốc độ màn trập": "1/1000s đến 2s", "Trọng lượng": "590g"}'::jsonb),
('e5555555-5555-5555-5555-555555555555', 'Nikon FM2 (Mua đứt)', 'nikon-fm2-buy', 'Nikon', 'Chiến thần cơ học hoàn toàn bằng cơ khí, nổi tiếng với độ bền bỉ vượt trội hoạt động không cần pin.', 'a1111111-1111-1111-1111-111111111111', 9750000, 9750000, 3, ARRAY['https://images.unsplash.com/photo-1508921912186-1d1a45ebb3c1?auto=format&fit=crop&q=80&w=800'], '{"Ngàm ống kính": "Nikon F", "Tốc độ màn trập": "1/4000s đến 1s", "Trọng lượng": "540g"}'::jsonb);

-- Seed camera_models (For RENTAL)
INSERT INTO oltp_store.camera_models (id, model_name, slug, brand, description, category_id, rent_price_per_day, deposit_amount, images, specs) VALUES
('d4444444-4444-4444-4444-44444444444a', 'Canon AE-1 Program (Thuê)', 'canon-ae1-program-rent', 'Canon', 'Dòng máy ảnh cơ huyền thoại cho thuê.', 'a1111111-1111-1111-1111-111111111111', 375000, 6250000, ARRAY['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=800'], '{"Ngàm ống kính": "Canon FD", "Tốc độ màn trập": "1/1000s", "Trọng lượng": "590g"}'::jsonb),
('f6666666-6666-6666-6666-666666666666', 'Leica M6 Classic (Thuê)', 'leica-m6-classic-rent', 'Leica', 'Tuyệt tác máy ảnh cơ rangefinder cổ điển với hệ thống đo sáng tích hợp cực kỳ chính xác và độ hoàn thiện đỉnh cao.', 'b2222222-2222-2222-2222-222222222222', 1875000, 75000000, ARRAY['https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&q=80&w=800'], '{"Ngàm ống kính": "Leica M", "Tốc độ màn trập": "1/1000s", "Trọng lượng": "585g"}'::jsonb),
('a7777777-7777-7777-7777-777777777777', 'Hasselblad 500C/M (Thuê)', 'hasselblad-500cm-rent', 'Hasselblad', 'Biểu tượng máy ảnh Medium Format dạng mô-đun.', 'c3333333-3333-3333-3333-333333333333', 1500000, 45000000, ARRAY['https://images.unsplash.com/photo-1495707902641-75cac588d2e9?auto=format&fit=crop&q=80&w=800'], '{"Định dạng": "6x6", "Ngàm ống kính": "Hasselblad V", "Trọng lượng": "1500g"}'::jsonb);

-- Seed price configs (For RENTAL Models)
INSERT INTO oltp_store.price_configs (model_id, min_days, max_days, price_per_day, deposit_percentage) VALUES
('d4444444-4444-4444-4444-44444444444a', 1, 3, 375000, 100.00),
('d4444444-4444-4444-4444-44444444444a', 4, 7, 300000, 80.00),
('d4444444-4444-4444-4444-44444444444a', 8, 30, 250000, 50.00),
('f6666666-6666-6666-6666-666666666666', 1, 7, 1875000, 100.00),
('f6666666-6666-6666-6666-666666666666', 8, 30, 1625000, 80.00);

-- Seed equipments (Physical renting units, linked to camera_models)
INSERT INTO oltp_store.equipments (id, model_id, serial_number, status, condition_notes, purchase_date) VALUES
('e1111111-1111-1111-1111-111111111111', 'd4444444-4444-4444-4444-44444444444a', 'CANON-FD-89271', 'AVAILABLE', 'Hoạt động hoàn hảo, xước xát nhẹ theo thời gian', '2023-01-15'),
('e2222222-2222-2222-2222-222222222222', 'd4444444-4444-4444-4444-44444444444a', 'CANON-FD-90184', 'AVAILABLE', 'Ngoại hình như mới, hệ thống đo sáng đã được cân chỉnh', '2023-03-10'),
('e4444444-4444-4444-4444-444444444444', 'f6666666-6666-6666-6666-666666666666', 'LEICA-M6-39182', 'AVAILABLE', 'Căn chỉnh khoảng cách trắc cự hoàn hảo, da bọc nguyên bản đẹp mắt', '2024-02-05'),
('e5555555-5555-5555-5555-555555555555', 'a7777777-7777-7777-7777-777777777777', 'HASSEL-500-1129', 'AVAILABLE', 'Đã kèm ống kính Carl Zeiss Planar 80mm f/2.8 và back phim A12', '2021-08-14');
