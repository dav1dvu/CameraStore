# 🔧 API Hướng Dẫn - Cập nhật

## ✅ Đã Sửa

Backend đã được cập nhật để:
- ✅ Query bảng `customers` từ schema `oltp_store`
- ✅ Thêm endpoint `GET /api/customers` (list all)
- ✅ Sửa field `firstName`, `lastName` thay vì `fullName`

---

## 📋 Hướng dẫn Tạo Customer & Lập Đơn

### Bước 1: Đăng nhập lấy Token

```bash
POST http://localhost:3002/api/auth/login
Content-Type: application/json

{
  "email": "staff@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user-id-xxx",
      "email": "staff@example.com"
    }
  }
}
```

💾 **Lưu `accessToken` để dùng cho request sau!**

---

### Bước 2: Tạo Customer Mới

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

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "first_name": "Nguyễn",
    "last_name": "Văn A",
    "email": "customer1@example.com",
    "phone_number": "0912345678",
    "identity_number": "123456789012",
    "is_active": true,
    "created_at": "2026-06-05T12:00:00Z"
  }
}
```

💾 **Lưu `id` - đây là `customerId`!**

---

### Bước 3: Xem Danh Sách Customers

```bash
GET http://localhost:3002/api/customers
Authorization: Bearer {accessToken}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "first_name": "Nguyễn",
      "last_name": "Văn A",
      "email": "customer1@example.com",
      ...
    }
  ]
}
```

---

### Bước 4: Lập Đơn Cho Thuê (Booking)

```bash
POST http://localhost:3002/api/bookings
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "customerId": "550e8400-e29b-41d4-a716-446655440000",
  "productId": "model-id-xxx",
  "startDate": "2026-06-10",
  "endDate": "2026-06-15"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "bookingId": "booking-id-xxx",
    "equipmentId": "equipment-id-xxx",
    "totalRentalFee": 300000,
    "depositAmount": 200000,
    "rentalDays": 6
  }
}
```

✅ **Đơn cho thuê đã tạo thành công!**

---

## 🔍 Kiểm Tra Lịch Sử Customer

```bash
GET http://localhost:3002/api/customers/{customerId}/history
Authorization: Bearer {accessToken}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "bookings": [
      {
        "id": "booking-id-xxx",
        "customer_id": "550e8400-e29b-41d4-a716-446655440000",
        "start_date": "2026-06-10",
        "end_date": "2026-06-15",
        "total_rental_fee": 300000,
        "booking_status": "PENDING"
      }
    ],
    "orders": []
  }
}
```

---

## 🔧 Cấu hình Postman/Thunder Client

### Headers cần có:
```
Authorization: Bearer {accessToken}
Content-Type: application/json
```

### Base URL:
```
http://localhost:3002/api
```

---

## ⚠️ Lỗi thường gặp

### 404 Not Found
- Kiểm tra URL chính xác
- Endpoint phải là `/api/customers` (không phải `/customers`)

### 400 Bad Request: "Missing required fields"
- Kiểm tra body có đầy đủ: `email`, `phoneNumber`, `identityNumber`
- `identityNumber` phải là 12 chữ số

### 401 Unauthorized
- Token hết hạn hoặc sai
- Hãy đăng nhập lại để lấy token mới

### 404 Customer not found
- `customerId` không tồn tại
- Kiểm tra ID chính xác

---

## ✅ Test Flow Đầy Đủ

1. **Đăng nhập** → Lấy `accessToken`
2. **Tạo Customer** → Lấy `customerId`
3. **Xem danh sách Customers** → Kiểm tra customer vừa tạo
4. **Xem Camera Models** → Lấy `productId`
5. **Lập Đơn Cho Thuê** → Dùng `customerId` + `productId`
6. **Xem Lịch Sử Customer** → Kiểm tra booking vừa tạo
