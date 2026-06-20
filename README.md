<img width="930" height="528" alt="image" src="https://github.com/user-attachments/assets/e71dffdf-fad7-4cce-9214-53986b82e015" /><img width="941" height="556" alt="image" src="https://github.com/user-attachments/assets/cf9c5af8-6b92-4d77-9dd0-2722257d6b64" /># 🏥 Project Pharmacy - Hệ Thống Quản Lý Nhà Thuốc & Tư Vấn Trực Tuyến

Chào mừng bạn đến với **Project Pharmacy**! Đây là một hệ thống toàn diện được thiết kế để quản lý nhà thuốc, bán hàng trực tuyến và cung cấp dịch vụ tư vấn sức khỏe từ xa với dược sĩ/bác sĩ. 

Dự án được xây dựng theo kiến trúc **Monorepo**, chia thành 3 phân hệ chính:
- ⚙️ **Backend API**: Xử lý logic, database và realtime.
- 🛍️ **Frontend Client**: Giao diện dành cho khách hàng mua thuốc và nhận tư vấn.
- 📊 **Frontend Admin**: Giao diện quản trị dành cho nhân viên và quản lý.

---

## 🌟 Tính Năng Nổi Bật

### 🧑‍💻 Dành Cho Khách Hàng (Web Client)
- **Xác Thực Nâng Cao:** Đăng nhập/đăng ký cơ bản, bảo mật OTP qua email, đăng nhập Google, và đặc biệt là công nghệ **Đăng nhập bằng Face ID** (Nhận diện khuôn mặt).
- **Mua Sắm Tiện Lợi:** Xem danh mục thuốc, tìm kiếm sản phẩm, kiểm tra nguồn gốc chính hãng (Authenticity), giỏ hàng và theo dõi đơn hàng.
- **Thanh Toán Đa Dạng:** Tích hợp các cổng thanh toán trực tuyến hàng đầu: **Momo** và **VNPAY**.
- **Tư Vấn Sức Khỏe:** Đặt lịch tư vấn với dược sĩ, trò chuyện trực tiếp (Chat Realtime), và tham gia **Video Call** (WebRTC).
- **Quản Lý Cá Nhân:** Theo dõi lịch sử khám bệnh, quản lý địa chỉ giao hàng, sổ tay thuốc gia đình.

SƠ ĐỒ MÔ HÌNH HÁO CÁC YÊU CẦU:
![Uploading image.png…]()

### 💼 Dành Cho Nhân Viên & Quản Lý (Web Admin)
- **Phân Quyền Chi Tiết (RBAC):** Hệ thống roles linh hoạt (Admin, Pharmacist, Manager, Sales Staff, Warehouse Staff).
- **Quản Lý Bán Hàng:** Theo dõi và xử lý đơn hàng, quản lý danh mục, sản phẩm và tồn kho.
- **Quản Lý Tư Vấn:** Tiếp nhận lịch hẹn, phân công dược sĩ, gọi video trực tiếp và tạo đơn thuốc sau tư vấn.
- **Quản Trị Hệ Thống:** Quản lý người dùng (Staff/Customer), kiểm duyệt nội dung tin tức, sự kiện và mã chính hãng.

---

## 🛠️ Công Nghệ Sử Dụng

Dự án sử dụng các công nghệ hiện đại nhất (MERN Stack + WebRTC + AI):

- **Backend:** Node.js, Express, MongoDB (Mongoose), Socket.IO (Chat & Signaling WebRTC).
- **Frontend (Client/Admin):** React.js, TypeScript, Vite, Tailwind CSS.
- **AI & Nhận Diện Khuôn Mặt:** Tích hợp `@vladmandic/face-api` và **TensorFlow.js**.
- **Bảo Mật:** JWT Authentication, Joi Validation, Helmet, Winston Logging.
- **Triển Khai:** Docker & `docker-compose`.

---

## 🚀 Hướng Dẫn Cài Đặt & Khởi Chạy

### Yêu Cầu Cần Có
- **Node.js** (Phiên bản v16 trở lên khuyến nghị)
- **MongoDB** (Đang chạy local hoặc dùng Atlas)
- **Docker** (Nếu muốn chạy qua container)

### Chạy Dự Án Chế Độ Development

Dự án có cung cấp sẵn các file `*.bat` hoặc `*.sh` ở thư mục gốc để chạy nhanh. Hoặc bạn có thể chạy thủ công theo các bước sau:

**1. Khởi chạy Backend**
```bash
cd backend
npm install
# Cấu hình file .env dựa theo .env.example
npm run dev
# Hoặc click chạy file run-backend.bat
```

**2. Khởi chạy Frontend Client**
```bash
cd frontend-client
npm install
# Cấu hình file .env (chỉ định URL backend)
npm run dev
# Hoặc click chạy file run-frontend-client.bat
```

**3. Khởi chạy Frontend Admin**
```bash
cd frontend-admin
npm install
# Cấu hình file .env
npm run dev
# Hoặc click chạy file run-frontend-admin.bat
```

### Chạy Với Docker (Môi Trường Production)
Sử dụng docker-compose để chạy toàn bộ các dịch vụ:
```bash
docker-compose up -d --build
```

---

## 🧠 Hệ Thống Face ID
Điểm nhấn của dự án là tính năng **Face ID** giúp tăng cường trải nghiệm đăng nhập:
- Các model AI (`face-models`) được load trực tiếp khi backend khởi động để tăng tốc độ phản hồi.
- Hỗ trợ lưu trữ nhiều góc mặt (Face Descriptors) để tăng độ chính xác.
- So khớp 1:1 theo Email/Phone.
- Giới hạn tần suất quét (Rate Limit) để chống tấn công.

---

## 📱 Lộ Trình Phát Triển (Roadmap)
- Tối ưu hóa UI/UX và Performance cho nền tảng Web.
- Giai đoạn tiếp theo: Xây dựng ứng dụng **Mobile App** (React Native/Flutter) đồng bộ dữ liệu với Backend hiện tại.
- Tích hợp Push Notification, Offline Cache trên Mobile.
- Hoàn thiện hệ thống Dashboard thống kê tự động cho Admin.

---
*Được phát triển với ❤️ cho Đồ Án Tốt Nghiệp / Dự Án Nhà Thuốc.*
