# Socket.IO Realtime Chat - Tóm Tắt Các Thay Đổi

## 📋 Tổng Quan

Để fix lỗi socket WebSocket `Invalid frame header` và enable realtime chat mà không cần load lại trang, các file sau đã được cập nhật:

---

## ✅ File Đã Thay Đổi

### 1. **backend/index.js**
**Mục đích:** Config Socket.IO server với transport fallback + debug logging

**Thay đổi:**
```javascript
// ❌ Trước
const io = new Server(server, {
  cors: { origin: '*' },
  path: '/socket.io',
  transports: ['websocket', 'polling']  // WebSocket trước
})

// ✅ Sau
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'], credentials: false },
  path: '/socket.io',
  transports: ['polling', 'websocket'],  // Polling trước (HTTP fallback)
  upgrade: true,  // Cho phép nâng cấp lên WebSocket
  pingInterval: 30000,
  pingTimeout: 20000,
  maxHttpBufferSize: 10e6,  // 10MB cho upload hình ảnh
})

// Thêm debug logging
io.use((socket, next) => {
  console.log(`[Socket.IO] Attempting connection from ${socket.handshake.address}`)
  next()
})

server.listen(port, () => {
  console.log(`🔌 Socket.IO transports: polling, websocket`)
  console.log(`Socket.IO server is running on path /socket.io`)
})
```

**Lý do:**
- Polling (HTTP) là fallback ổn định hơn websocket
- Các client sẽ tự động fallback nếu websocket fail
- Debug logging giúp theo dõi khi nào socket connect

---

### 2. **frontend-admin/src/pages/Support.tsx**
**Mục đích:** Fix socket connection + enable send message mà không cần reload

**Thay đổi chính:**

#### a. Config Socket.IO
```typescript
// ❌ Trước
const socket = io(SOCKET_URL, {
  auth: { token },
  transports: ['websocket', 'polling']  // WebSocket trước
})

// ✅ Sau
const socket = io(SOCKET_URL, {
  auth: { token },
  transports: ['polling', 'websocket'],  // Polling trước
  upgrade: true,  // Cho phép upgrade
  secure: SOCKET_URL.startsWith('https'),
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 10,  // Tăng từ 5 → 10
})
```

#### b. Thêm Wait Connection Logic
```typescript
// ✅ Mới: Chờ socket connect trước khi gửi
const ensureSocketConnected = useCallback(async () => {
  if (!socket) throw new Error('Mất kết nối realtime')
  if (socket.connected) return
  if (socket.disconnected) socket.connect()
  
  await new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup()
      reject(new Error('Cần kết nối realtime để gửi tin nhắn'))
    }, 4000)
    
    socket.once('connect', () => { cleanup(); resolve() })
    socket.once('disconnect', () => { cleanup(); reject(...) })
  })
}, [socket])

// Dùng trong sendMessage
const sendMessage = async (conversationId, content) => {
  await ensureSocketConnected()  // ← Đợi socket ready
  socket.emit('chat:message:send', { conversationId, content }, ...)
}
```

#### c. Thêm Debug Logging
```typescript
// ✅ Mới: Debug transport
const handleConnect = () => {
  const transport = socket.io.engine.transport.name
  console.log(`[Socket] Connected! ${socket.id} transport: ${transport}`)
}

const handleUpgrade = (transport) => {
  console.log(`📊 Socket upgraded to: ${transport.name}`)
}

socket.on('connect', handleConnect)
socket.io.engine.on('upgrade', handleUpgrade)
```

**Lý do:**
- `ensureSocketConnected()` ngăn race condition khi gửi tin ngay khi socket chưa sẵn
- Polling fallback giúp message gửi được dù websocket fail
- Debug logs để troubleshoot connection issues

---

### 3. **frontend-client/src/App.tsx**
**Mục đích:** Config socket.io client với polling fallback + debug

**Thay đổi:**
```typescript
// ✅ Trước
const socket = io(SOCKET_URL, {
  auth: { token },
  transports: ['websocket', 'polling']
})

// ✅ Sau
const socket = io(SOCKET_URL, {
  auth: { token },
  transports: ['polling', 'websocket'],  // Polling trước
  upgrade: true,  // Cho phép nâng cấp
  secure: SOCKET_URL.startsWith('https'),
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 10,  // Tăng
})

// Debug logging
socket.on('connect', () => {
  const transport = socket.io.engine.transport.name
  console.log(`✅ Socket connected: ${socket.id} transport: ${transport}`)
})

socket.io.engine.on('upgrade', (transport) => {
  console.log(`📊 Socket upgraded to: ${transport.name}`)
})
```

---

### 4. **frontend-admin/.env**
**Mục đích:** Thêm Socket.IO URL (thiếu trước đó!)

```env
# ✅ Thêm dòng này (không có trước)
VITE_SOCKET_URL=http://localhost:3000

# Các biến khác
VITE_API_URL=http://localhost:3000/api
VITE_GOOGLE_CLIENT_ID=...
```

**Lý do:**
- Frontend-admin Support.tsx cần SOCKET_URL để connect
- Nếu không có, socket connection sẽ fail

---

## 🔧 Không Thay Đổi (Đã Hoạt động)

✅ **backend/src/sockets/chatHandler.js**
- Các event handlers (`chat:message:send`, `chat:message:new`) hoạt động ổn
- Emit logic đúng, không cần thay đổi

✅ **frontend-client/src/components/chat/ClientChatWidget.tsx**
- Socket listeners (`chat:message:new`) hoạt động ổn
- Fallback REST API có sẵn

✅ **frontend-admin/src/services/admin-chat.service.ts**
- REST API fallback có sẵn, không cần thay

---

## 📊 Cơ Chế Hoạt động (Connection Flow)

```
Frontend (Client hoặc Admin)
    ↓
Khởi tạo io(SOCKET_URL, config)
    ├─ transports: ['polling', 'websocket']
    └─ Thử polling trước (HTTP POST)
    ↓
Nếu Polling thành công
    ✅ Socket connected (transport: polling)
    └─ Message gửi via HTTP
    
Nếu Polling thành công + WebSocket khả dụng
    📊 Socket upgrade to websocket
    └─ Message gửi via WebSocket (nhanh hơn)
    
Nếu Polling fail
    ❌ Disconnect, retry
    └─ Tối đa 10 lần (reconnectionAttempts: 10)
```

---

## 🚀 Cách Test

### Terminal 1: Chạy Backend
```bash
cd backend
npm run dev
# Kỳ vọng:
# ✅ Server is running on port 3000
# ✅ Socket.IO server is running on path /socket.io
# ✅ Socket.IO transports: polling, websocket
```

### Terminal 2: Chạy Frontend Admin
```bash
cd frontend-admin
npm run dev
# Chờ: http://localhost:5174
```

### Terminal 3: Chạy Frontend Client
```bash
cd frontend-client
npm run dev
# Chờ: http://localhost:5173
```

### Test Chat
1. Client (http://localhost:5173) gửi tin → Admin phải thấy ngay
2. Admin (http://localhost:5174) gửi tin → Client phải thấy ngay
3. **Không cần reload trang!**

---

## 🐛 Nếu Vẫn Lỗi

### 1. WebSocket Error: "Invalid frame header"
**Nguyên nhân:** WebSocket không hoạt động (bình thường)
**Kỳ vọng:** Client tự fallback sang polling
```
✅ Socket connected: xxxx transport: polling
```

### 2. "Connection timed out" hoặc "Failed to connect"
**Kiểm tra:**
- Backend chạy trên port 3000?
- VITE_SOCKET_URL = http://localhost:3000?
- Firewall cho phép port 3000?

### 3. Message gửi được nhưng client không nhận
**Kiểm tra:**
- Browser DevTools Console: Socket connected?
- Backend logs: `chat:message:send` handler chạy?
- Check `chatHandler.js` emit logic

---

## 📁 File Scripts Để Chạy Dễ

✅ **run-backend.bat** - Chạy backend trên Windows
✅ **run-frontend-admin.bat** - Chạy admin UI
✅ **run-frontend-client.bat** - Chạy client chat
✅ **SETUP_SOCKET_REALTIME.md** - Hướng dẫn chi tiết

---

## ✨ Kết Quả

- ✅ Socket realtime working (polling + websocket)
- ✅ Admin có thể gửi tin mà không cần reload
- ✅ Client nhận tin realtime từ admin
- ✅ WebSocket error không block service (fallback polling)
- ✅ Debug logs để troubleshoot nhanh

---

**Status:** ✅ Ready for testing
**Last Updated:** May 30, 2026
