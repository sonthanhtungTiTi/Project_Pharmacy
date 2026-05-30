# Project Pharmacy — Mo ta du an

## 1) Tong quan
Project Pharmacy la he thong quan ly nha thuoc va tu van duoc si, gom 3 phan he chinh: backend API, web client cho khach hang va web admin cho nhan vien. Du an tap trung vao mua thuoc, quan ly don hang, thanh toan, tu van truc tuyen, chat va Face ID dang nhap.

## 2) Kien truc va cong nghe
- Monorepo gom: backend, frontend-client, frontend-admin.
- Backend: Node.js + Express, MongoDB (Mongoose), Socket.IO, JWT, Multer, Joi, Helmet, Winston.
- AI/Face: @vladmandic/face-api + TensorFlow.js, luu face descriptor trong User.
- Frontend: React + TypeScript + Vite + Tailwind (client va admin).
- Thanh toan: Momo, VNPAY.
- Ha tang: docker-compose o root.

## 3) Nguoi dung va vai tro
- Customer: khach hang mua thuoc, tu van, dat lich, thanh toan.
- Staff roles: admin, pharmacist, manager, sales_staff, warehouse_staff.
- Doctor role co trong model (dung cho he thong tu van/hen kham neu mo rong).

## 4) Chuc nang phia khach hang (frontend-client + /api/client)
- Xac thuc tai khoan: dang ky/dang nhap, quen mat khau OTP qua email, login Google.
- Face ID: enroll, disable, login bang hinh anh (co rate limit).
- San pham va danh muc: xem danh muc, san pham, thong tin thuoc.
- Gio hang & don hang: them gio, dat hang, theo doi don.
- Thanh toan: tich hop Momo va VNPAY.
- Tu van duoc si: dat lich tu van, xem lich su, huy lich, xem chi tiet.
- Chat: nhan tin voi staff/tu van.
- Tin tuc suc khoe, su kien, family medicines.
- Kiem tra chinh hang (authenticity check), lich hen, doi tac.
- Ho so ca nhan: cap nhat thong tin, avatar, dia chi.

## 5) Chuc nang phia admin/nhan vien (frontend-admin + /api/admin)
- Dang nhap staff/admin, phan quyen theo role.
- Quan ly don hang, san pham, danh muc.
- Quan ly nguoi dung (staff/customer).
- Quan ly ton kho, bao cao/analytics.
- Quan ly tu van: danh sach lich, gan staff, cap nhat trang thai, ghi chu, meeting link.
- Quan ly chat, don thuoc.
- Quan ly su kien, authenticity codes, lich hen, doi tac.

## 6) AI Face ID
- Mo hinh face duoc load khi backend khoi dong; models dat o backend/face-models.
- Enroll: luu nhieu face descriptors cho user.
- Login: compare descriptor de xac thuc 1:1 theo email/phone.
- Bao mat: gioi han tan suat login face, luu faceDescriptors o user va co the disable.

## 7) Realtime, call va jobs
- Socket.IO dung cho realtime va signaling goi (PeerJS).
- Chat cleanup job tu dong don du lieu chat cu.
- Co co che online users tu callHandler.

## 8) He thong du lieu (MongoDB)
Cac collection chinh: user, product, category, cart, order, address, consultation, appointment, chatConversation/chatMessage, healthNews, event, familyMedicine, prescription, partner, authenticity, payment (momo/vnpay), callSession/callMessage.

## 9) Bao mat va kiem soat
- JWT cho client/admin, middleware auth + authorize.
- Joi validate request, helmet + compression.
- Rate limit cho Face ID login.

## 10) Hien trang va ke hoach gan
- Tu van da co UI + API day du; con tich hop goi realtime (PeerJS) va thong bao realtime.
- Tham khao cac viec dang lam trong TODO.md (consultation booking, thong bao, kiem thu).

## 11) Roadmap chuyen sang mobile client
- Giai doan 0: Dinh nghia pham vi mobile (MVP) va mapping chuc nang web -> mobile (dang nhap, san pham, gio hang, don hang, tu van, chat).
- Giai doan 1: Chuan hoa API response va tai lieu endpoint can dung cho mobile; chot flow auth (OTP, Google, Face ID neu co).
- Giai doan 2: Xay dung bo UI/UX mobile va components dung chung; thong nhat style guide va asset.
- Giai doan 3: Phat trien core features (auth, catalog, cart, order, payment) + tracking don hang.
- Giai doan 4: Tu van duoc si, chat realtime, thong bao push (FCM) va lich su tu van.
- Giai doan 5: Offline cache (san pham, lich su), toi uu performance, logging va crashlytics.
- Giai doan 6: Release beta, thu thap feedback, hardening bao mat va scale.
