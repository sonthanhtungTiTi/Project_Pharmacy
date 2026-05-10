# Pharmacy Consultation Booking Implementation

## 🎯 Mục tiêu
Hoàn thiện tính năng **Consultation Booking** (Đặt lịch tư vấn) và luồng gọi 1:1, khớp hoàn toàn với kiến trúc hiện tại của dự án. Không thêm tính năng phức tạp như lập lịch theo slot, sức chứa dược sĩ hay bảng Pharmacist riêng.

## 🧠 Các ràng buộc cốt lõi (Domain Constraints)
- Consultation là một lịch hẹn tại một thời điểm cụ thể, không phải slot.
- Staff là User có role (pharmacist/admin/manager/sales_staff).
- Gọi điện video sử dụng Socket.IO + PeerJS. Không lưu lịch sử gọi/tin nhắn vào CSDL.

## 🚀 Các bước đã hoàn thành
- [x] **Backend**: Cập nhật `backend/src/routes/admin/consultation.route.js`
  - Thêm middleware `validate(updateConsultationStatusSchema)` để đảm bảo tính nhất quán dữ liệu khi cập nhật trạng thái (`confirmed` phải có `meetingLink`, `cancelled` phải có `cancellationReason`).
- [x] **Client Frontend (`frontend-client`)**: 
  - Tạo service gọi API: `frontend-client/src/services/consultation.service.ts`
  - Tạo UI cho trang Tư vấn: `frontend-client/src/pages/ConsultPharmacy.tsx`
    - Form đặt lịch với xác thực phía client.
    - Danh sách lịch sử tư vấn ("My Consultations") với phân trang và lọc trạng thái.
    - Giao diện xem chi tiết lịch, hủy lịch, và hiển thị trạng thái động.
  - Tích hợp trang Tư vấn vào hệ thống route của ứng dụng và Home page (qua `App.tsx` và `HomePage.tsx`).
- [x] **Admin Frontend (`frontend-admin`)**: 
  - Tạo service quản lý API: `frontend-admin/src/services/admin-consultation.service.ts`. Đã fix lỗi import thừa `apiPost`.
  - Tạo UI Quản lý lịch: `frontend-admin/src/pages/Consultations.tsx`
    - Có 2 view: Admin View (Bảng dashboard tổng quan, chức năng gán staff, đổi trạng thái) và Staff View (Danh sách lịch của nhân viên, cho phép ghi chú).
  - Tích hợp vào sidebar `AdminLayout.tsx` và route hệ thống `App.tsx`.

## ⏭️ Các bước tiếp theo
- [ ] **Tích hợp PeerJS Hook-in**: Cập nhật cả 2 panel chi tiết lịch (Client và Admin) để trigger event gọi điện (ví dụ: `client:open-call-selector`) khi lịch hẹn có trạng thái `confirmed`.
- [ ] **Notification / Alerts**: Tích hợp thông báo realtime qua web socket cho staff khi có lịch đặt mới hoặc cập nhật trạng thái.
- [ ] **Deployment Verification**: Test toàn trình một luồng (Đặt lịch -> Admin gán -> Staff ghi chú -> Hoàn thành).

## Ghi chú
Hệ thống hiện tại đã tích hợp xong UI, backend logic, xác thực và chuẩn bị sẵn sàng để test toàn trình và kết nối với PeerJS.
