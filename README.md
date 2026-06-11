# Film Camera Store - Full Stack Application

Ứng dụng quản lý cửa hàng cho thuê & bán máy ảnh film với Backend API (Express.js) và Frontend (React + Vite).

## 📋 Yêu cầu hệ thống

- **Node.js**: v20+ (khuyến nghị v20.12.x)
- **npm**: v10+
- **Git**: để clone project (nếu cần)

## 🚀 Hướng dẫn khởi động nhanh

### Lần đầu tiên - Cài đặt dependencies

```bash
# Cài đặt backend
cd backend-v2
npm install

# Cài đặt frontend (trong terminal khác)
cd frontend
npm install
```

### Khởi động dịch vụ

Bạn cần **2 terminal riêng biệt** chạy đồng thời:

#### Terminal 1: Backend
```bash
cd backend-v2
npm run dev
```
✅ Backend sẽ chạy tại: **http://0.0.0.0:3002**

#### Terminal 2: Frontend
```bash
cd frontend
npm run dev
```
✅ Frontend sẽ chạy tại: **http://localhost:3000**

---

## 📁 Cấu trúc Project

```
Backend/
├── backend-v2/              # Backend API (Express + TypeScript)
│   ├── src/
│   │   ├── app.ts          # Express app config
│   │   ├── server.ts       # Server entry point
│   │   ├── config/         # Environment & Supabase config
│   │   ├── middlewares/    # Auth, Error, Validation
│   │   └── modules/        # Business logic (Customer, Inventory, etc.)
│   ├── .env                # Environment variables (đã có)
│   └── package.json
├── frontend/                # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/     # Reusable React components
│   │   ├── pages/          # Page components
│   │   ├── store/          # Zustand state management
│   │   ├── api/            # Axios client config
│   │   └── utils/          # Helper functions
│   ├── .env                # API base URL config
│   └── package.json
└── supabase/               # Database migrations & seed data
```

---

## ⚙️ Cấu hình môi trường

### Backend (.env)
```env
PORT=3002
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_SECRET=super-secret-jwt-key
NODE_ENV=development
# Production only:
# FRONTEND_URL=https://thefilmery.vercel.app
```

### Frontend (.env)
```env
VITE_API_BASE_URL=http://localhost:3002/api
```

⚠️ **Lưu ý**: Thay `localhost` bằng IP thực tế của máy chạy backend nếu truy cập từ máy khác.

---

## 📝 Các lệnh hữu ích

### Backend
```bash
npm run dev      # Chạy development (hot reload)
npm run build    # Compile TypeScript
npm start        # Chạy từ compiled code
```

### Frontend
```bash
npm run dev      # Chạy dev server
npm run build    # Build production
npm run preview  # Preview build trên local
```

---

## 🚀 Deploy lên Production

### Kiến trúc deploy

```
GitHub Monorepo (CameraStore-main)
├── frontend/  ──→  Vercel (thefilmery.vercel.app)
└── backend-v2/ ──→  Render (thefilmery-api.onrender.com)
                         └──→  Supabase (PostgreSQL Database)
```

### Bước 1: Push lên GitHub

```bash
git init  # nếu chưa có
git remote add origin https://github.com/YOUR_USERNAME/CameraStore.git
git add .
git commit -m "Initial commit"
git push -u origin main
```

### Bước 2: Deploy Backend lên Render

1. Vào [render.com](https://render.com) → New Web Service
2. Connect GitHub repo `CameraStore`
3. Cấu hình:
   - **Root Directory**: `backend-v2`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
4. Thêm Environment Variables:
   - `NODE_ENV` = `production`
   - `PORT` = `3002`
   - `SUPABASE_URL` = `https://tysjqtdolonsfgzdmxvw.supabase.co`
   - `SUPABASE_ANON_KEY` = (key từ Supabase dashboard)
   - `SUPABASE_SERVICE_ROLE_KEY` = (key từ Supabase dashboard)
   - `JWT_SECRET` = (tạo chuỗi ngẫu nhiên mạnh)
   - `FRONTEND_URL` = (URL frontend Vercel, set sau bước 3)

### Bước 3: Deploy Frontend lên Vercel

1. Vào [vercel.com](https://vercel.com) → Import Project
2. Connect GitHub repo `CameraStore`
3. Vercel sẽ tự detect `vercel.json` config
4. Thêm Environment Variable:
   - `VITE_API_BASE_URL` = `https://thefilmery-api.onrender.com/api`

### Bước 4: Kết nối cross-domain

Sau khi cả hai đã deploy, cập nhật:
- **Render**: Thêm `FRONTEND_URL` = URL Vercel frontend (ví dụ: `https://thefilmery.vercel.app`)
- **Vercel**: Đảm bảo `VITE_API_BASE_URL` = URL Render backend (ví dụ: `https://thefilmery-api.onrender.com/api`)

---

## 🔗 API Endpoints

API Base URL: `http://0.0.0.0:3002/api`

**Các module chính**:
- `GET /api/customers` - Danh sách khách hàng
- `GET /api/products` - Danh sách sản phẩm
- `GET /api/bookings` - Danh sách đơn cho thuê
- `GET /api/orders` - Danh sách đơn hàng
- Xem chi tiết tại `backend-v2/src/modules/*/`

**📖 Hướng dẫn chi tiết**: Xem [API_GUIDE.md](./API_GUIDE.md) để biết cách tạo customers, lập đơn cho thuê và bán hàng

---

## ⚠️ Vấn đề: Không thể lập đơn cho khách hàng?

**Nguyên nhân**: Không có khách hàng trong hệ thống hoặc ID khách hàng không chính xác.

**Giải pháp**:
1. **Tạo khách hàng trước** (xem [API_GUIDE.md](./API_GUIDE.md) - Bước 2)
2. **Đảm bảo bạn có token JWT** (đăng nhập trước - Bước 1)
3. **Kiểm tra `customerId` chính xác** khi lập đơn

---

## 🐛 Troubleshooting

### Port 3002 hoặc 3000 đã bị sử dụng
```bash
# Windows - Tìm process sử dụng port
netstat -ano | findstr :3002

# Hoặc dùng port khác bằng cách thay đổi .env
PORT=3003  # Backend
# và cập nhật frontend/.env VITE_API_BASE_URL
```

### Node modules bị lỗi
```bash
rm -r node_modules package-lock.json
npm install
```

### Frontend không kết nối được backend
- Kiểm tra IP trong `frontend/.env` `VITE_API_BASE_URL`
- Đảm bảo backend đang chạy
- Kiểm tra firewall cho port 3002

### Supabase connection error
- Kiểm tra `.env` có đầy đủ `SUPABASE_URL` và `SUPABASE_ANON_KEY`
- Kiểm tra kết nối internet

---

## 🔐 Bảo mật

- Không commit `.env` file (đã có trong `.gitignore`)
- Không chia sẻ JWT_SECRET, API keys trên công khai
- Mock admin login (`admin@camera.com`) chỉ hoạt động trong môi trường development
- CORS được cấu hình whitelist chỉ cho phép frontend domain
- Kiểm tra `.env.example` để biết các biến cần thiết

---

## 📚 Tài liệu tham khảo

- Backend: [Express.js Docs](https://expressjs.com/)
- Frontend: [React Docs](https://react.dev/), [Vite Docs](https://vitejs.dev/)
- Database: [Supabase Docs](https://supabase.com/docs)
- State Management: [Zustand Docs](https://github.com/pmndrs/zustand)
- Deploy: [Vercel Docs](https://vercel.com/docs), [Render Docs](https://render.com/docs)

---

## 📞 Hỗ trợ

Nếu gặp vấn đề:
1. Kiểm tra console backend và frontend (xem log error)
2. Kiểm tra file `.env` có đầy đủ các biến không
3. Đảm bảo Node.js phiên bản đúng: `node --version`
4. Xóa node_modules và cài lại: `npm install`

---

**Cập nhật lần cuối**: 2026-06-11

