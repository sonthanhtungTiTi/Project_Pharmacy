# Phân Tích: Routing Tin Nhắn vs Gọi Video

## 🎯 Vấn Đề Hiện Tại

Khi client gọi video qua khung chat, admin nhận được signaling nhưng:
- ❌ Không biết call từ conversation nào
- ❌ Không có thông báo trong chat
- ❌ Phải tìm kiếm manual "ai đang gọi?"

---

## 📊 So Sánh: Chat Message vs Call Signaling

### 1️⃣ **Chat Messages** - ✅ Routing Chính Xác

#### Flow:
```
Client gửi tin
    ↓
chatHandler.js: socket.on('chat:message:send', ...)
    ├─ Lấy conversationId từ payload
    ├─ Tạo message
    └─ **Gửi đến 2 điểm:**
        ├─ io.to(conversationRoom).emit(...)
        │  └─ Room: 'chat:conversation:{conversationId}'
        │     (Admin + Client trong conversation này nhận)
        └─ io.to(clientId).emit(...)
           └─ Chỉ client nhận tin
    ↓
Admin thấy tin trong khung chat của conversation
```

#### Backend Code (chatHandler.js):
```javascript
socket.on('chat:message:send', async (payload, callback) => {
  const { conversationId, content } = payload
  
  // ✅ Lấy clientId từ conversation
  const clientId = String(data.conversation?.client?.id || '')
  
  // ✅ Emit đến conversation room + client
  io.to(conversationRoom(conversationId))
    .to(clientId)
    .emit('chat:message:new', {
      conversationId,
      message: data.message
    })
  
  // ✅ Emit cho tất cả staff
  emitToSupportStaff(io, onlineUsers, 'chat:message:new', {
    conversationId,
    message: data.message
  })
})
```

#### **Key Points:**
- ✅ **conversationId** rõ ràng
- ✅ **clientId** được extract từ DB
- ✅ **Room-based** routing → tất cả trong conversation nhận
- ✅ **Admin biết:** Tin từ client nào, trong conversation nào
- ✅ **Broadcast:** Tất cả staff online nhận thông báo

---

### 2️⃣ **Call Signaling** - ❌ Routing Thiếu Context

#### Flow:
```
Admin click call qua khung chat
    ↓
useWebRTC.ts: initiateCall(peerId, type, consultationId)
    ├─ socket.emit('call:make', {
    │  targetUserId,
    │  callId,
    │  callType,
    │  consultationId,  ← ✅ Có
    │  callerPeerId,
    │  callerData
    └─ })
    ↓
callHandler.js: socket.on('call:make', ...)
    ├─ Kiểm tra permission dùng consultationId
    ├─ Nếu OK:
    └─ **Gửi đến target user:**
        └─ socket.to(targetUserId)
           .emit('call:incoming', {
              callId,
              callerId,
              callType,
              callerData
           })
    ↓
Client nhận signal nhưng ❌ KHÔNG CÓ thông báo trong chat
```

#### Backend Code (callHandler.js):
```javascript
socket.on('call:make', async (payload = {}, callback) => {
  const { targetUserId, callId, consultationId, callerPeerId } = payload
  
  // ❌ Không lấy conversationId
  // ❌ Không gửi đến conversation room
  // ❌ Chỉ gửi đến target user
  
  socket.to(targetUserId).emit('call:incoming', {
    callId,
    callerId: socket.userId.toString(),
    callType,
    callerPeerId,
    callerData: payload.callerData || {
      userId: socket.userId.toString(),
      name: socket.userName,  // ← Admin biết tên người gọi
      role: socket.userRole,
    },
  })
})
```

#### **Key Points:**
- ❌ **Chỉ gửi** đến targetUserId
- ❌ **Không gửi** đến conversation room
- ❌ **Không broadcast** cho staff (chỉ target user nhận)
- ❌ **Admin không biết:** Call này từ conversation nào
- ✅ **Nhưng có:** callerId, callerName (từ socket.userName)

---

## 🔄 Hiện Tại Admin Thấy Gì?

### Scenario: Client A gọi Admin qua khung chat

```
┌─────────────────────────────────────────────┐
│ Admin Support Page                          │
├─────────────────────────────────────────────┤
│ Conversations:                              │
│  ┌─ [Client A] - Tìm kiếm thuốc             │
│  ├─ [Client B] - Hỏi giá cả                 │
│  └─ [Client C] - Khác...                    │
│                                             │
│ Chat Messages (Client A):                   │
│  • Client: "Bạn ơi, tôi muốn gọi video"    │
│  • Admin: "Đồng ý"                          │
│                                             │
│ [Incoming Call Notification]  ← ❓ Ở đâu? │
│                                             │
│  "Cuộc gọi từ ai?"                         │
│  ← Admin không biết từ conversation nào!    │
└─────────────────────────────────────────────┘
```

### Vấn Đề:
1. ❓ **Admin không biết:** Cuộc gọi này từ Client A hay Client B?
2. ❌ **Thông báo ở ngoài:** Không tích hợp trong chat
3. 🔔 **Notification thiếu context:** Không có tên conversation

---

## ✅ Giải Pháp: Integration Call vào Chat

### Thay Đổi Cần Làm:

#### **1. Backend: callHandler.js**
```javascript
socket.on('call:make', async (payload = {}, callback) => {
  const { targetUserId, consultationId, conversationId } = payload
  
  // ✅ MỚI: Gửi thông báo đến conversation room
  io.to(conversationRoom(conversationId))
    .emit('chat:call:incoming', {
      callId,
      callerId: socket.userId.toString(),
      callerName: socket.userName,  // ← Admin biết tên người gọi
      conversationId,  // ← Biết từ conversation nào
      callType,
      callerPeerId,
      callerData: {
        userId: socket.userId.toString(),
        name: socket.userName,
        role: socket.userRole,
      }
    })
  
  // ✅ CŨ: Vẫn gửi signaling để establish call
  socket.to(targetUserId).emit('call:incoming', {
    callId,
    callerId: socket.userId.toString(),
    callType,
    callerPeerId,
    callerData: payload.callerData
  })
})
```

#### **2. Frontend Admin: Support.tsx**
```typescript
// Thêm listener cho call incoming
socket.on('chat:call:incoming', (payload) => {
  const { callId, callerName, conversationId, callType } = payload
  
  // ✅ Thêm thông báo call vào messages
  setMessages(prev => upsertMessages(prev, [
    {
      id: `call_${callId}`,
      senderType: 'system',
      senderName: 'System',
      content: `📞 ${callerName} đang gọi ${callType}...`,
      createdAt: new Date().toISOString(),
      meta: {
        type: 'call_incoming',
        callId,
        callerName
      }
    }
  ]))
  
  // ✅ Hiển thị accept/reject buttons
  // (Giống prescription approval)
})
```

#### **3. UI: Hiển Thị Call Notification**
```jsx
{isSystem && meta?.type === 'call_incoming' && (
  <div className="rounded-md bg-purple-50 text-purple-700 text-xs text-center px-3 py-2">
    <p>📞 {meta.callerName} đang gọi video...</p>
    <div className="flex gap-3 mt-2">
      <button onClick={() => acceptCall(meta.callId)}>
        ✓ Chấp nhận
      </button>
      <button onClick={() => rejectCall(meta.callId)}>
        ✗ Từ chối
      </button>
    </div>
  </div>
)}
```

---

## 🎯 Lợi Ích Khi Integration Call vào Chat

| Vấn Đề | Trước | Sau |
|--------|--------|------|
| **Admin biết call từ ai?** | ❌ Phải nhớ | ✅ Chat context |
| **Admin biết conversation nào?** | ❌ Không | ✅ Rõ ràng |
| **Tên người gọi** | ❓ Có nhưng riêng | ✅ Trong chat |
| **Notification** | 🔔 Riêng | ✅ Tích hợp |
| **Accept/Reject** | 📱 Pop-up | ✅ Trong chat |
| **Lịch sử call** | ❌ Không | ✅ Trong chat |

---

## 📋 Implementation Roadmap

### Phase 1: Backend (callHandler.js)
- [x] Thêm emit `chat:call:incoming` đến conversation room
- [x] Include: conversationId, callerName, callType

### Phase 2: Frontend (Support.tsx)
- [ ] Thêm listener `socket.on('chat:call:incoming')`
- [ ] Tạo system message type: 'call_incoming'
- [ ] Thêm buttons: Accept / Reject

### Phase 3: UI Component
- [ ] Render call notification như prescription approval
- [ ] Accept call → startCall(callId)
- [ ] Reject call → socket.emit('call:decline')

### Phase 4: Testing
- [ ] Client gọi admin từ khung chat
- [ ] Admin thấy notification với tên client
- [ ] Admin biết conversation nào
- [ ] Accept/Reject hoạt động

---

## 🔐 Security Check

```javascript
// ✅ Kiểm tra permission
const permission = await validateCallPermission({
  consultationId,     // ← Verify appointment booked
  callerId: caller,   // ← Admin user
  targetUserId: client, // ← Client user
  callType: 'video'
})

// ✅ Chỉ gửi nếu pass validation
if (permission.ok) {
  io.to(conversationRoom(conversationId))
    .emit('chat:call:incoming', ...)
}
```

---

## 📝 Comparison Table

### Routing Mechanism:

| Aspect | Chat Messages | Call Signaling | Improved Call |
|--------|---|---|---|
| **Routing** | Room + userId | userId only | ✅ Room + userId |
| **Context** | conversationId | ❌ implicit | ✅ explicit |
| **Broadcast** | ✅ All staff | ❌ Target only | ✅ All in conversation |
| **Notification** | ✅ In chat | ❌ Separate | ✅ In chat |
| **User name** | ✅ Yes | ✅ Yes | ✅ Yes + room |

---

## 💡 Key Insight

**Chat Messages** đã thiết kế tốt với:
1. Conversion Room routing → mọi người trong conversation nhận
2. User ID routing → client cụ thể nhận
3. Staff broadcast → tất cả staff online nhận
4. Context rõ ràng → admin biết từ ai, conversation nào

**Call Signaling** cần cải thiện:
1. ❌ Chỉ gửi đến user ID, không dùng room
2. ❌ Không broadcast cho staff
3. ❌ Mất context conversation
4. ✅ Nhưng có consultationId (có thể dùng để lookup)

**Giải pháp:** Apply chat messaging pattern vào call signaling!

---

**Status:** ✅ Analysis Complete - Ready to Implement
