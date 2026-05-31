# Setup Socket.IO Realtime Chat - Hướng Dẫn Chi Tiết

## 🔴 Vấn Đề Hiện Tại
- Socket WebSocket lỗi: `Invalid frame header`
- Admin phải load lại trang mới nhắn được tin
- Client không nhận tin realtime từ admin
- Backend exit code 1 (khả năng không chạy được)

## ✅ Các Bước Đã Fix

### 1. **Frontend-Client (App.tsx)**
- ✓ Thay đổi transports: `['polling', 'websocket']` (polling trước để fallback)
- ✓ Thêm `upgrade: true` để nâng cấp lên websocket nếu có thể
- ✓ Tăng `reconnectionAttempts` từ 5 → 10
- ✓ Thêm verbose logging để debug

### 2. **Frontend-Admin (Support.tsx)**
- ✓ Thay đổi transports: `['polling', 'websocket']`
- ✓ Thêm `upgrade: true` 
- ✓ Tăng `reconnectionAttempts` từ 5 → 10
- ✓ Thêm verbose logging
- ✓ Thêm `handleUpgrade` event listener

### 3. **Backend (index.js)**
- ✓ Thay đổi transports: `['polling', 'websocket']`
- ✓ Thêm CORS settings hoàn chỉnh
- ✓ Thêm `maxHttpBufferSize: 10e6` (10MB cho upload hình)
- ✓ Thêm debug logging ở server.listen
- ✓ Thêm Socket.IO middleware logging

### 4. **Frontend-Admin .env**
- ✓ Thêm `VITE_SOCKET_URL=http://localhost:3000`

## 🚀 Cách Chạy Để Test

### Terminal 1: Backend
```bash
cd backend
npm install  # Nếu chưa cài dependencies
npm run dev
```

**Chờ đến khi thấy:**
```
✅ Server is running on port 3000
✅ Socket.IO server is running on path /socket.io
✅ Socket.IO transports: polling, websocket
✅ MongoDB connected
```

### Terminal 2: Frontend-Admin
```bash
cd frontend-admin
npm install  # Nếu chưa cài
npm run dev
```

**Chờ đến khi thấy:**
```
  VITE v8.0.0  ready in XX ms

  ➜  Local:   http://localhost:5174/
  ➜  press h to show help
```

### Terminal 3: Frontend-Client
```bash
cd frontend-client
npm install  # Nếu chưa cài
npm run dev
```

**Chờ đến khi thấy:**
```
  VITE v8.0.0  ready in XX ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

## 🔍 Debug Console Logs

### Browser - Client (http://localhost:5173)
Mở Developer Tools (F12) → Console, khi admin nhắn tin, bạn sẽ thấy:
```
✅ Socket connected: xxxx transport: polling
📊 Socket upgraded to: websocket
```

### Browser - Admin (http://localhost:5174)
Khi mở Support page, sẽ thấy:
```
[Socket] Connected! xxxx transport: polling
📊 Socket upgraded to: websocket
```

### Backend Terminal
Khi client/admin kết nối:
```
[Socket.IO] Attempting connection from ::1
✅ Khách kết nối: xxxx (User: Tên - ID: xxx)
```

## 📝 Test Chat Realtime

### Step 1: Login
1. Mở http://localhost:5173 (client)
   - Đăng nhập bằng tài khoản customer
   - Mở chat widget (góc phải)

2. Mở http://localhost:5174 (admin)
   - Đăng nhập bằng tài khoản admin
   - Vào trang Support (Trung Tâm Hỗ Trợ Khách Hàng)

### Step 2: Gửi Tin Từ Client
- Client gửi tin trong chat widget
- **Kiểm tra**: Admin có thấy tin ngay mà không cần load lại không?

### Step 3: Admin Nhận & Gửi Tin
1. Admin click "Nhận hỗ trợ" ở conversation
2. Admin gửi tin nhắn
3. **Kiểm tra**: Client có nhận tin ngay trong chat widget không?

### Step 4: Client Thấy Tin Ngay
- **✅ Nếu client thấy tin ngay**: Socket realtime hoạt động!
- **❌ Nếu phải load lại**: Có thể vẫn còn lỗi socket hoặc event listeners chưa đúng

## ⚙️ Cấu Hình Quan Trọng

### Backend (.env)
```
PORT=3000
MONGO_URL=...
NODE_ENV=development
```

### Frontend-Admin (.env)
```
VITE_API_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
```

### Frontend-Client (.env)
```
VITE_API_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
```

## 🐛 Troubleshooting

### 1. Backend không start
```
❌ Exit code 1
```
**Cách fix:**
- Kiểm tra MongoDB có chạy không
- Kiểm tra MONGO_URL trong .env
- Xem error message trên terminal

### 2. Socket connection lỗi: "websocket error"
**Nguyên nhân:** Websocket không hoạt động, sẽ dùng polling
**Kỳ vọng:** Client sẽ tự fallback sang polling (HTTP polling)
```
✅ Socket connected: xxxx transport: polling
```

### 3. Admin gửi tin nhưng client không nhận
**Kiểm tra:**
- Mở browser DevTools → Console
- Xem có error không?
- Xem socket.connected === true?
- Xem backend logs có "chat:message:send" không?

### 4. Chat chậm/Delay
**Cách fix:**
- Thử clear browser cache (`Ctrl+Shift+Delete`)
- Restart tất cả terminal
- Kiểm tra network tab xem polling request time bao lâu

## 📊 Socket.IO Connection Flow

```
Frontend (Client/Admin)
    ↓
io() - Khởi tạo connection
    ↓
auth: { token } - Gửi JWT token
    ↓
transports: ['polling', 'websocket']
    ├─ Thử polling trước (HTTP POST)
    └─ Nếu tốt, nâng cấp (upgrade) lên WebSocket
    ↓
Backend socket.io middleware
    ├─ Verify JWT token
    ├─ socket.userId = ...
    └─ socket.userRole = ...
    ↓
registerChatHandlers({ io, socket, onlineUsers })
    ├─ socket.on('chat:message:send')
    ├─ socket.on('chat:admin:join')
    └─ ...
```

## 🎯 Kết Quả Mong Muốn

✅ **Polling Mode:**
- Admin gửi tin → Client thấy trong ~1 giây (HTTP polling)
- Client gửi tin → Admin thấy ngay

✅ **Upgraded to WebSocket:**
- Admin gửi tin → Client thấy ngay (realtime)
- Client gửi tin → Admin thấy ngay (realtime)

## 📞 Hỗ Trợ Thêm

Nếu vẫn lỗi sau khi làm hết các bước:
1. Ghi lại error message từ console
2. Ghi lại backend logs
3. Chụp screenshot Network tab
4. Kiểm tra MONGO_URL, PORT có đúng không

---

**Last Updated:** 30-May-2026
**Status:** ✅ Socket.IO configured for realtime chat (polling + websocket)
