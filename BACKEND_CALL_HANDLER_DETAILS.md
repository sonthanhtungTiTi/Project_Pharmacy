# Backend Call Handler - Chi Tiết Luồng Xử Lý

## 📋 Backend (callHandler.js) Làm Được Gì?

### ✅ **1. Nhận Tín Hiệu Gọi Từ Client**

```javascript
socket.on('call:make', async (payload = {}, callback) => {
```

**Nhận từ client:**
```javascript
{
  callId: "call_1716829473_abc123",
  targetUserId: "admin_user_id",          // AI gọi
  consultationId: "chat_conversation_id", // Từ conversation nào
  callType: "video",                      // Loại cuộc gọi
  callerPeerId: "client_peer_id",
  callerData: {
    userId: "client_id",
    name: "Thanh Tùng",
    avatar: "https://..."
  }
}
```

**Log backend:**
```
[CALL-DEBUG] 4. call:make received from: client_user_id
[CALL-DEBUG] 4b. payload: { callId: "call_...", targetUserId: "...", ... }
```

---

### ✅ **2. Validate Quyền Gọi & Xác Nhận Cuộc Tư Vấn**

```javascript
const permission = await validateCallPermission({
  consultationId,
  callerId: callerUserId,
  targetUserId,
  callType,
})
```

**Kiểm tra:**
```
✅ Consultation hoặc ChatConversation tồn tại?
   └─ Try: Consultation.findById(consultationId)
   └─ If not found → Fallback: ChatConversation.findById(consultationId)

✅ Status = 'confirmed' (Consultation) hoặc 'human' (ChatConversation)?
   └─ Nếu không → Reject: CONSULTATION_NOT_CONFIRMED

✅ Có nhân viên được gán chưa?
   └─ Consultation.assignedStaff hoặc ChatConversation.assignedStaffId
   └─ Nếu không → Reject: CONSULTATION_NOT_ASSIGNED

✅ Thời gian hợp lệ?
   └─ isWithinCallWindow(consultationDate)
   └─ Mặc định: 60 phút trước/sau thời gian tư vấn
   └─ Nếu không → Reject: CONSULTATION_OUT_OF_WINDOW

✅ Loại cuộc gọi hợp lệ?
   └─ Consultation.consultationType = 'phone' → chỉ voice call
   └─ Nếu không → Reject: CALL_TYPE_NOT_ALLOWED

✅ Người gọi & người nhận có khớp với tư vấn?
   └─ isClientCallingStaff: client → admin ✅
   └─ isStaffCallingClient: admin → client ✅
   └─ Nếu không → Reject: CONSULTATION_CALL_FORBIDDEN
```

**Log backend:**
```
[CALL-DEBUG] 4c. permission: {
  ok: true,
  consultation: {...},
  consultationUserId: "client_id",
  consultationStaffId: "admin_id"
}
```

**Nếu fail:**
```javascript
// Gửi lại client lý do từ chối
socket.emit('call:unavailable', {
  callId,
  targetUserId,
  reason: 'CONSULTATION_NOT_CONFIRMED' // hoặc lý do khác
})
callback({ ok: false, reason: permission.reason })
return
```

---

### ✅ **3. Kiểm Tra Trạng Thái User Online**

```javascript
if (!isUserOnline(targetUserId)) {
  socket.emit('call:unavailable', {
    callId,
    targetUserId,
    reason: 'TARGET_OFFLINE',
  })
  callback({ ok: false, reason: 'TARGET_OFFLINE' })
  return
}
```

**Kiểm tra:**
```
Admin có đang online không?
└─ onlineUsers.get(adminId)?.socketIds.size > 0
└─ Nếu không → Reject: TARGET_OFFLINE
```

---

### ✅ **4. Kiểm Tra Người Dùng Busy**

```javascript
if (busyUsers.has(targetUserId) || busyUsers.has(callerUserId)) {
  socket.emit('user-busy', {
    callId,
    targetUserId,
    reason: 'USER_BUSY',
  })
  callback({ ok: false, reason: 'USER_BUSY' })
  return
}
```

**Kiểm tra:**
```
Admin đang trong cuộc gọi khác?
└─ busyUsers.has(adminId)
└─ Nếu có → Reject: USER_BUSY (mà vẫn trong call)

Client đang trong cuộc gọi khác?
└─ busyUsers.has(clientId)
└─ Nếu có → Reject: USER_BUSY
```

---

### ✅ **5. Tạo Call Session**

```javascript
callSessions.set(callId, {
  callId,
  callerId: callerUserId,      // Client ID
  calleeId: targetUserId,       // Admin ID
  consultationId,               // Chat conversation ID
  accepted: false,
  callType,                     // 'video' hoặc 'voice'
})

setUserBusy(callerUserId, true)
setUserBusy(targetUserId, true)
```

**Lưu trữ:**
```
callSessions: Map {
  'call_xxx' => {
    callId: 'call_xxx',
    callerId: 'client_id',
    calleeId: 'admin_id',
    consultationId: 'chat_id',  // ← Biết từ conversation nào
    accepted: false,
    callType: 'video'
  }
}

busyUsers: Set { 'client_id', 'admin_id' }
```

---

### ✅ **6. Gửi Thông Báo Cuộc Gọi Đến Admin**

```javascript
socket.to(targetUserId).emit('call:incoming', {
  callId,
  callerId: socket.userId.toString(),
  callType,
  callerPeerId: normalizeUserId(payload.callerPeerId || socket.userId),
  callerData: payload.callerData || {
    userId: socket.userId.toString(),
    name: socket.userName,        // ← Tên người gọi
    role: socket.userRole,
  },
})
```

**Gửi đến admin:**
```
socket.to(admin_id).emit('call:incoming', {
  callId: 'call_xxx',
  callerId: 'client_id',
  callType: 'video',
  callerPeerId: 'client_peer_id',
  callerData: {
    userId: 'client_id',
    name: 'Thanh Tùng',           // ← Admin biết tên người gọi
    role: 'customer'
  }
})
```

**Admin browser nhận (useWebRTC.ts: handleIncoming):**
```typescript
setIncomingCall({
  callId: 'call_xxx',
  callerId: 'client_id',
  callerName: 'Thanh Tùng',       // ← Hiển thị tên
  callerAvatarUrl: 'https://...',
  callType: 'video'
})
setCallPhase('RINGING')
setRingingDirection('incoming')
// ✅ Show modal
```

---

### ✅ **7. Xác Nhận Callback Cho Client**

```javascript
if (typeof callback === 'function') {
  callback({ ok: true })
}
```

**Client nhận:**
```javascript
// Frontend: useWebRTC.ts
socket.emit('call:make', {...}, (response) => {
  if (response?.ok) {
    // ✅ Cuộc gọi được gửi thành công
    // ✅ Chuyển sang RINGING state
    startOutgoingTimeout(callId, targetUserId) // Timeout 30s chờ trả lời
  } else {
    // ❌ Cuộc gọi bị từ chối
    // Hiển thị lý do: TARGET_OFFLINE, USER_BUSY, etc.
  }
})
```

---

### ✅ **8. Xử Lý Accept/Decline/End Call**

#### **A. Admin Accept: socket.on('call:accept')**

```javascript
socket.on('call:accept', (payload = {}) => {
  const targetUserId = normalizeUserId(payload.targetUserId)
  const callId = payload.callId
  
  // ✅ Update session
  const session = callSessions.get(callId)
  if (session) {
    session.accepted = true
    session.acceptedAt = new Date()  // ← Record lúc accept
  }

  // ✅ Gửi signal back to client
  socket.to(targetUserId).emit('call:accepted', {
    callId,
    calleeId: socket.userId.toString(),
    calleePeerId: payload.calleePeerId,
    calleeData: {
      userId: socket.userId.toString(),
      name: socket.userName,
      role: socket.userRole,
    },
  })
})
```

#### **B. Admin Decline: socket.on('call:decline')**

```javascript
socket.on('call:decline', (payload = {}) => {
  // ✅ Release session
  const session = releaseCallSession(callId)
  // └─ Delete từ callSessions
  // └─ Release busy status

  // ✅ Gửi signal to client
  socket.to(targetUserId).emit('call:declined', {
    callId,
    senderId: socket.userId.toString(),
  })
})
```

#### **C. End Call: socket.on('call:end')**

```javascript
socket.on('call:end', (payload = {}) => {
  // ✅ Release session
  const session = releaseCallSession(callId)
  
  if (session) {
    // ✅ Auto-complete consultation nếu là scheduled booking
    void completeConsultationIfNeeded(session)
  }

  // ✅ Gửi signal to other side
  socket.to(targetUserId).emit('call:end', {
    callId,
    senderId: socket.userId.toString(),
  })
})
```

---

### ✅ **9. Xử Lý Timeout (No Answer)**

```javascript
socket.on('call-timeout', (payload = {}) => {
  // ✅ Admin không trả lời sau 30s
  const session = releaseCallSession(callId)

  // ✅ Thông báo cho client
  socket.to(targetUserId).emit('call-timeout', {
    callId,
    senderId: socket.userId.toString(),
    reason: 'NO_ANSWER',
  })
})
```

---

### ✅ **10. Xử Lý Disconnect**

```javascript
socket.on('disconnect', () => {
  // ✅ Tìm tất cả active call sessions của user này
  callSessions.forEach((session, sessionId) => {
    if (session.callerId === disconnectedUserId || 
        session.calleeId === disconnectedUserId) {
      // ✅ Release call
      const sessionSnapshot = releaseCallSession(sessionId)
      
      // ✅ Notify other side
      socket.to(otherUserId).emit('call:end', {
        callId: sessionId,
        senderId: disconnectedUserId,
        reason: 'USER_DISCONNECTED',
      })
      
      // ✅ Auto-complete consultation
      void completeConsultationIfNeeded(sessionSnapshot)
    }
  })

  // ✅ Remove from online users
  onlineUsers.delete(socket.userId)
  io.emit('online-users:update', serializeOnlineUsers())
})
```

---

## 📊 Data Flow Summary

```
┌─ CLIENT ─────────────────────────────────────────── BACKEND ──────────────────────────────────── ADMIN ─┐
│                                                                                                          │
│ initiateCall()                                                                                          │
│   ↓                                                                                                      │
│   socket.emit('call:make', {                                                                           │
│     callId,                                                                                             │
│     targetUserId: admin_id,                                                                             │
│     consultationId: chat_id,  ──────────────→ socket.on('call:make')                                   │
│     callType: 'video',                         ├─ validateCallPermission()                             │
│     callerData                                 │  └─ ChatConversation.findById(consultationId)        │
│   })                                           ├─ callSessions.set(callId, {...})                      │
│                                                ├─ setUserBusy(client, admin)                          │
│                                                └─ socket.to(admin).emit('call:incoming', {             │
│                                                     callId,                                             │
│                                                     callerId,                                           │
│ setCallPhase('RINGING')                            callerData: { name, avatar, ... }  ─────────────→ handleIncoming()
│ setRingingDirection('outgoing')                 })                                                      ├─ setIncomingCall(...)
│ startOutgoingTimeout(30s)                                                                              ├─ setCallPhase('RINGING')
│                    ↕                                                                                    └─ Show modal
│                  (wait)                                                                                  │
│                                                                                                          │ (Admin clicks Accept)
│                                                                                                          │
│                                            ← socket.emit('call:accept') ←
│ socket.on('call:accepted')                                                                             
│   ├─ setCallPhase('IN_CALL')                socket.on('call:accept')                                  
│   ├─ initializeUserMedia()                  └─ socket.to(client).emit('call:accepted', {...})        
│   └─ attachMediaCall()                                                                                 
│                                                                                                          │
│   ✅ Connect PeerJS ──────────────────────────────────────────────────────────────────────→ Connect PeerJS
│   ✅ Video/Audio Stream                                                                      ✅ Video/Audio
│                                                                                                          │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## ✅ Tóm Tắt: Backend Xử Lý Được Gì

| Chức Năng | Có? | Chi Tiết |
|-----------|-----|---------|
| **Nhận call signal từ client** | ✅ | `socket.on('call:make')` |
| **Validate quyền gọi** | ✅ | Check ChatConversation/Consultation, status, assigned staff |
| **Check admin online** | ✅ | `isUserOnline(adminId)` |
| **Check admin busy** | ✅ | `busyUsers.has(adminId)` |
| **Create call session** | ✅ | Track callId, client, admin, consultationId |
| **Send call notification to admin** | ✅ | `socket.to(adminId).emit('call:incoming', {...})` |
| **Send caller name/avatar** | ✅ | In callerData: { name, avatar, userId } |
| **Handle admin accept** | ✅ | `socket.on('call:accept')` → update session + notify client |
| **Handle admin decline** | ✅ | `socket.on('call:decline')` → release session + notify client |
| **Handle timeout (no answer)** | ✅ | `socket.on('call-timeout')` after 30s |
| **Handle end call** | ✅ | Release session, notify other side, auto-complete booking |
| **Handle disconnect** | ✅ | Clean up active calls, notify other side |

---

## 🎯 Chi Tiết: Thông Tin Gọi Gửi Đến Admin

**Backend gửi:**
```javascript
socket.to(admin_id).emit('call:incoming', {
  callId: 'call_xxx',           // ← ID cuộc gọi (dùng cho tracking)
  callerId: 'client_id',        // ← ID của client
  callType: 'video',            // ← Loại cuộc gọi
  callerPeerId: 'peer_id',      // ← PeerJS ID (dùng kết nối)
  callerData: {                 // ← Thông tin người gọi
    userId: 'client_id',
    name: 'Thanh Tùng',         // ← Tên người gọi ✅
    role: 'customer'
  }
})
```

**Admin thấy modal:**
```
┌─────────────────────────────┐
│                             │
│          Avatar/Initial     │
│       Thanh Tùng            │ ← Tên từ callerData.name
│                             │
│  📹 Cuộc gọi video đến      │
│                             │
│  • • •                      │
│                             │
│  [Từ chối]  [Trả lời]      │
│                             │
└─────────────────────────────┘
```

---

## 🔄 Luồng Hoàn Chỉnh: Client → Backend → Admin

```
1. Client: initiateCall(admin_id, consultationId)
   └─ socket.emit('call:make', {...})

2. Backend: socket.on('call:make')
   ├─ validateCallPermission()
   │  └─ Find ChatConversation(consultationId)
   ├─ Check admin online + not busy
   ├─ Create callSession
   └─ socket.to(admin_id).emit('call:incoming', {
        callId, callerId, callerData: { name, ... }
      })

3. Admin: socket.on('call:incoming')
   ├─ handleIncoming() in useWebRTC.ts
   ├─ setIncomingCall({ callerName, ... })
   └─ Show modal with caller info

4. Admin clicks [Trả lời]
   └─ socket.emit('call:accept', {...})

5. Backend: socket.on('call:accept')
   ├─ Update session.accepted = true
   └─ socket.to(client_id).emit('call:accepted', {...})

6. Client: socket.on('call:accepted')
   └─ PeerJS connects video/audio

7. Both: Video/Audio stream established
   ├─ setCallPhase('IN_CALL')
   └─ Can see each other's video + hear audio

8. One side clicks hang up
   ├─ socket.emit('call:end', {...})
   └─ Both disconnect, clean up
```

---

## ✨ Status

✅ **Backend xử lý TOÀN BỘ call flow:**
- Nhận signal từ client
- Validate quyền
- Gửi notification đến admin với tên + avatar
- Xử lý accept/decline/end
- Auto-cleanup khi disconnect

✅ **Admin nhận được:**
- Tên người gọi
- Avatar (nếu có)
- Call type (video/voice)
- Buttons: Accept/Reject

✅ **Sẵn sàng test!**
