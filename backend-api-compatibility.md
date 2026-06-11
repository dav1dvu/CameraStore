# Backend - Frontend API Compatibility

## Tổng quan
Frontend và backend của dự án đã tương thích tốt với nhiều route chính, đặc biệt trong các phần:
- Auth quản trị
- Quản lý sản phẩm / danh mục / camera model
- Quản lý feedback
- Quản lý bookings và transactions
- Quản lý reports
- Quản lý profile và xác thực role

Tuy nhiên, còn 4 route frontend đang gọi mà backend chưa hỗ trợ.

## Các endpoint frontend đang dùng nhưng backend chưa có

1. `GET /api/bookings/my`
   - Dùng ở: `frontend/src/pages/customer/CustomerDashboard.tsx`
   - Mục đích: lấy danh sách booking của user hiện tại.

2. `POST /api/profiles/me/verify-identity`
   - Dùng ở: `frontend/src/pages/customer/CustomerDashboard.tsx`
   - Mục đích: gửi thông tin xác minh CCCD/CMND.

3. `GET /api/transactions/:id/invoice`
   - Dùng ở: `frontend/src/pages/admin/Finance.tsx`
   - Mục đích: lấy invoice/QR code thanh toán cho giao dịch.

4. `GET /api/products/categories`
   - Dùng ở: `frontend/src/pages/public/ProductList.tsx`
   - Mục đích: lấy danh sách category cho bộ lọc sản phẩm.

## Các endpoint frontend đã khớp với backend

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/users`
- `POST /api/auth/register`
- `POST /api/bookings`
- `POST /api/bookings/:id/checkin`
- `POST /api/bookings/:id/return-accessories`
- `POST /api/bookings/:id/preview-cancel`
- `POST /api/bookings/:id/cancel`
- `POST /api/bookings/:id/extend`
- `POST /api/transactions/settle`
- `POST /api/transactions/:id/confirm`
- `GET /api/transactions/:id/receipt`
- `POST /api/orders`
- `GET /api/profiles/me`
- `PUT /api/profiles/me`
- `GET /api/profiles/me/logs`
- `GET /api/profiles/verifications`
- `POST /api/profiles/verifications/:id/review`
- `GET /api/reports/top-rentals`
- `GET /api/reports/equipment-status`
- `GET /api/products`
- `GET /api/products/:slug`
- `GET /api/categories`
- `GET /api/camera-models`
- `GET /api/customers`
- `GET /api/customers/:id/history`
- `GET /api/feedbacks`
- `POST /api/feedbacks`
- `POST /api/feedbacks/:id/resolve`

## Đề xuất giải pháp

### Giải pháp 1: Bổ sung backend
- Thêm `GET /api/bookings/my`
- Thêm `POST /api/profiles/me/verify-identity`
- Thêm `GET /api/transactions/:id/invoice`
- Thêm `GET /api/products/categories`

### Giải pháp 2: Sửa frontend thay thế
- Dùng `GET /api/categories` thay cho `GET /api/products/categories`
- Dùng `GET /api/bookings` và lọc theo user nếu backend không muốn mở route riêng
- Gỡ hoặc đổi chức năng xác minh CCCD nếu backend không hỗ trợ `/profiles/me/verify-identity`
- Dùng `GET /api/transactions/:id/qr` thay cho `/transactions/:id/invoice` nếu backend chỉ cung cấp route QR

## Kết luận
Frontend và backend tương thích cao, nhưng vẫn còn 4 route cần chú ý để ứng dụng hoạt động ổn định.
