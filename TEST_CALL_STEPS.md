# 🧪 Test Call Flow - Chi Tiết Hướng Dẫn

## 🔥 Just Fixed

✅ **Removed:**
- `CallHistory.create()` crash (model file was empty)
- Unused `recordCallHistory()` function
- 6 calls to `recordCallHistory()` across all event handlers

✅ **Backend is now clean** - no more crashes when calling!

---

## 📋 Test Scenario: Client Calls Admin via Chat

### Setup (30 giây)

**Terminal 1: Backend**
```bash
cd backend
npm run dev
```

Wait for:
```
✅ Server is running on port 3000
✅ Socket.IO server is running on path /socket.io
✅ MongoDB connected
```

**Terminal 2: Frontend Admin**
```bash
cd frontend-admin
npm run dev
```

Visit: http://localhost:5174 → Login as admin

**Terminal 3: Frontend Client**
```bash
cd frontend-client
npm run dev
```

Visit: http://localhost:5173 → Login as customer

---

## 🎬 Test Steps

### Step 1: Open Chat
**On Client (5173):**
1. Click "Gọi Tư Vấn" or similar
2. Wait for chat widget to load
3. See chat history

**On Admin (5174):**
1. Go to "Trung Tâm Hỗ Trợ Khách Hàng" (Support)
2. Click on a conversation (or wait for one to appear)
3. See chat messages

---

### Step 2: Client Sends Message
**On Client (5173):**
```
Type: "Tôi muốn gọi video với bạn"
Press: Send
```

**Expected:**
- ✅ Message appears in client chat
- ✅ Admin sees message in Support page
- ✅ Message auto-scrolls down

---

### Step 3: Client Initiates Call
**On Client (5173):**
- Look for video call button in chat widget (or Support page)
- Click: "Gọi Video" or similar

**Backend logs should show:**
```
[CALL-DEBUG] 4. call:make received from: client_user_id
[CALL-DEBUG] 4b. payload: {
  "callId": "call_...",
  "targetUserId": "admin_id",
  "consultationId": "conversation_id",
  "callType": "video",
  ...
}
[CALL-DEBUG] 4c. permission: {
  "ok": true,
  "consultation": {...},
  ...
}
```

---

### Step 4: Admin Receives Call
**Expected on Admin (5174):**
```
┌─────────────────────────────────┐
│                                 │
│      D                          │
│      Thanh Tùng                 │
│                                 │
│   📹 Cuộc gọi video đến        │
│                                 │
│   • • •  (ringing animation)    │
│                                 │
│   [Từ chối]  [Trả lời]         │
│                                 │
└─────────────────────────────────┘
```

**Verify:**
- ✅ Modal shows caller name
- ✅ Call type shows (video/voice)
- ✅ Ringing animation plays
- ✅ Accept/Reject buttons present

---

### Step 5: Admin Accept Call
**On Admin (5174):**
- Click: "Trả lời" button

**Expected:**
1. ✅ Modal changes to "IN_CALL" state
2. ✅ Video streams appear
3. ✅ Mic/Video toggle buttons show
4. ✅ Can talk to client

**Client should see:**
1. ✅ Incoming call accepted
2. ✅ Transition to video call screen
3. ✅ See admin's video stream

---

### Step 6: End Call
**Either side can click "Hang up"**

**Expected:**
1. ✅ Streams stop
2. ✅ Both return to chat/support page
3. ✅ No errors in console

---

## 🔍 Debug Logs to Check

### Backend Terminal
Look for:
```
✅ Khách kết nối: socket_id (User: Name - ID: user_id)
[CALL-DEBUG] 4. call:make received from: user_id
[CALL-DEBUG] 4c. permission: { ok: true, ... }
```

### Client Browser Console (F12)
Look for:
```
✅ Socket connected: socket_id transport: polling
[Socket] Connected! socket_id
📊 Socket upgraded to: websocket
```

### Admin Browser Console (F12)
Look for:
```
[Socket] Connected! socket_id transport: polling
📊 Socket upgraded to: websocket
[call:incoming] received
```

---

## ❌ Troubleshooting

### Issue 1: Client clicks call but nothing happens
**Check:**
1. Backend logs - any [CALL-DEBUG] messages?
2. Client console - any errors?
3. Is consultationId being sent? (check payload)

**Fix:**
- Ensure ChatConversation exists with status: 'human'
- Ensure admin is online (check onlineUsers)

### Issue 2: Admin doesn't see incoming call modal
**Check:**
1. Admin is online (check backend logs)
2. Client browser console - was `call:make` emitted?
3. Admin browser console - any socket errors?

**Fix:**
- Verify socket.to(adminId) is sending (target user must be online)
- Check Network tab for socket.io message

### Issue 3: Video/Audio not working
**Check:**
1. Browser permissions for camera/microphone
2. PeerJS connection status
3. Check "peer is not defined" errors

### Issue 4: Backend crashes
**Check error:**
```
TypeError: X is not a function
```

**Should NOT see:**
- ❌ `CallHistory.create is not a function` (FIXED ✅)

---

## 📊 Success Indicators

| Indicator | Status | What it means |
|-----------|--------|---------------|
| Backend doesn't crash | ✅ Must pass | No `CallHistory.create` error |
| Socket connects | ✅ Must pass | Can see transport (polling/websocket) |
| Client call signal sends | ✅ Must pass | `[CALL-DEBUG]` in backend logs |
| Permission validation works | ✅ Must pass | `permission: { ok: true }` in logs |
| Admin sees incoming modal | ✅ Must pass | Modal appears on admin screen |
| Accept call works | ✅ Must pass | Can see video/audio streams |
| End call works | ✅ Must pass | Streams stop, clean disconnect |

---

## 🎯 Test Completion Criteria

✅ **Call works:**
- [ ] Backend doesn't crash
- [ ] Client can initiate call
- [ ] Admin receives call with proper info
- [ ] Admin can accept/reject
- [ ] Video/audio streams established
- [ ] Call can end cleanly

✅ **No errors:**
- [ ] Backend console clean
- [ ] Client console no errors
- [ ] Admin console no errors
- [ ] Network tab shows proper socket messages

---

## 📞 Quick Test (2 minutes)

```
1. Start all 3 terminals
2. Client login → chat
3. Admin login → support page
4. Client sends message → verify admin sees it
5. Client clicks call → backend logs show [CALL-DEBUG]
6. Admin sees modal → clicks accept
7. Verify video appears
8. Click hang up → clean exit
```

**Success = No crashes + video connects!**

---

## 🚨 If Still Issues

1. **Take screenshot** of error message
2. **Copy backend logs** around the error
3. **Check files:**
   - `backend/src/sockets/callHandler.js` (cleaned ✅)
   - `backend/index.js` (has Socket.IO config ✅)
   - `frontend-admin/src/pages/Support.tsx` (has socket listeners ✅)

---

**Ready to test? Start with Terminal 1 and work through the steps! 🚀**
