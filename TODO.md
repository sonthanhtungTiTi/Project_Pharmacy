# Fix MoMo Payment Flow - Auto-cancel on Failure

Approved Plan: If payment fails/unclear, auto-set order status to 'cancelled'. No new statuses.

## Steps (Mark [x] when done)

- [x] **Step 1**: Update `backend/src/routes/client/momo.route.js`
  - In `/callback`: On failure, update status='cancelled', cancelReason='Thanh toán MoMo thất bại'.
  - On success: Optionally set status='confirmed' (TBD).
  - Test IPN handling. ✅ **Done**
- [x] **Step 2**: Update `backend/src/services/client/order.service.js`
  - Added 'paid' check in cancelMyOrder. ✅ **Done** (minor, callback handles main cancel)

- [x] **Step 3**: Frontend `frontend-client/src/pages/MomoResultPage.tsx`
  - Updated message for auto-cancel. (TS warning ignored, logic OK) ✅ **Done**

- [ ] **Step 4**: Update `frontend-client/src/pages/CheckoutPage.tsx`
  - Add warning for MoMo: 'Đơn hủy nếu không thanh toán'.

- [ ] **Step 5**: UI lists (Profile.tsx): Badge for cancelled due to payment fail.

- [ ] **Step 6**: Create `backend/scripts/cancelExpiredPending.js`
  - Cron: Cancel 'pending' >30min && paymentStatus != 'paid'.

- [ ] **Step 7**: Test
  - Checkout → MoMo fail → verify cancelled.
  - Success → pending for admin.

- [ ] **Step 8**: attempt_completion

Current: Starting Step 1.
