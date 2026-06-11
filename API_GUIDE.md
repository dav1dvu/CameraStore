# API Guide - Tạo Customer & Lập Đơn

## 🔐 Bước 1: Đăng nhập (Lấy JWT Token)

### Request
```bash
POST http://localhost:3002/api/auth/login
Content-Type: application/json

{
  "email": "staff@example.com",
  "password": "password123"
}
```

### Response
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user-id-here",
      "email": "staff@example.com",
      "role": "admin"
    }
  }
}
```

**Lưu token này để dùng cho các request tiếp theo!**

---

## 👥 Bước 2: Tạo Customer

### Request
```bash
POST http://localhost:3002/api/customers
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "firstName": "Nguyễn",
  "lastName": "Văn A",
  "email": "customer1@example.com",
  "phoneNumber": "0912345678",
  "identityNumber": "123456789012"
}
```

### Response
```json
{
  "success": true,
  "data": {
    "id": "customer-id-here",
    "first_name": "Nguyễn",
    "last_name": "Văn A",
    "email": "customer1@example.com",
    "phone_number": "0912345678",
    "identity_number": "123456789012",
    "is_active": true,
    "created_at": "2026-06-05T10:00:00Z"
  }
}
```

**Lưu `customer-id-here` để tạo đơn!**

---

## 📸 Bước 3: Xem danh sách Camera Models (để biết productId)

### Request
```bash
GET http://localhost:3002/api/camera-models
Authorization: Bearer {accessToken}
```

### Response
```json
{
  "success": true,
  "data": [
    {
      "id": "model-id-1",
      "model_name": "Canon AE-1",
      "rent_price_per_day": 50000,
      "deposit_amount": 200000,
      ...
    },
    ...
  ]
}
```

**Lưu `model-id-1` để lập đơn cho thuê!**

---

## 🎫 Bước 4: Lập Đơn Cho Thuê (Booking)

### Request
```bash
POST http://localhost:3002/api/bookings
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "customerId": "customer-id-here",
  "productId": "model-id-1",
  "startDate": "2026-06-10",
  "endDate": "2026-06-15"
}
```

### Response
```json
{
  "success": true,
  "data": {
    "bookingId": "booking-id-here",
    "equipmentId": "equipment-id-here",
    "totalRentalFee": 300000,
    "depositAmount": 200000,
    "rentalDays": 6
  }
}
```

✅ **Đơn cho thuê đã được tạo thành công!**

---

## 🛍️ Bước 5: Lập Đơn Bán Hàng (Order) - TÙYCHỌN

### Request
```bash
POST http://localhost:3002/api/orders
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "customerId": "customer-id-here",
  "shippingAddress": "123 Đường ABC, Quận XYZ, TP HCM",
  "items": [
    {
      "productId": "product-id-1",
      "quantity": 2
    },
    {
      "productId": "product-id-2",
      "quantity": 1
    }
  ]
}
```

### Response
```json
{
  "success": true,
  "data": {
    "orderId": "order-id-here",
    "totalAmount": 500000,
    "status": "PENDING",
    "createdAt": "2026-06-05T10:05:00Z"
  }
}
```

---

## 🔍 Kiểm tra Lịch sử Customer

### Request
```bash
GET http://localhost:3002/api/customers/{customer-id}/history
Authorization: Bearer {accessToken}
```

### Response
```json
{
  "success": true,
  "data": {
    "bookings": [
      {
        "id": "booking-id-here",
        "start_date": "2026-06-10",
        "end_date": "2026-06-15",
        "total_rental_fee": 300000,
        "booking_status": "PENDING"
      }
    ],
    "orders": [
      {
        "id": "order-id-here",
        "total_amount": 500000,
        "status": "PENDING"
      }
    ]
  }
}
```

---

## ⚠️ Lỗi thường gặp

### Error: "Customer not found"
- Đảm bảo `customerId` chính xác
- Tạo customer trước khi lập đơn

### Error: "No available equipment items found"
- Không có thiết bị nào trống để cho thuê
- Kiểm tra kho hàng hoặc tạo thêm equipment

### Error: "End date must be on or after start date"
- Ngày trả phải >= ngày nhận
- Kiểm tra lại `startDate` và `endDate`

### Error: "Product not found" (khi lập order)
- Sản phẩm không tồn tại hoặc không bán
- Kiểm tra `productId` chính xác

---

## 🧪 Test nhanh bằng Postman/Thunder Client

File này cung cấp các ví dụ curl. Bạn có thể:
1. Import vào Postman/Thunder Client
2. Thay `{accessToken}`, `{customer-id}`, `{model-id}` bằng giá trị thực tế
3. Chạy từng request theo thứ tự

---

## 📚 Tài liệu thêm

- Xem tất cả endpoints: `backend-v2/src/modules/*/`
- Database schema: `supabase/migrations/`
- Xem log backend: Terminal 1 (Backend)
