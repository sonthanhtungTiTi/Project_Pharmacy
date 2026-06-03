# Sơ đồ Activity Diagram – 5 Use Cases

---

## 1. Activity Diagram – Đăng nhập bằng Face ID

```
[Bắt đầu]
    |
    v
[Khách hàng chọn "Đăng nhập bằng Face ID"]
    |
    v
[Hệ thống hiển thị giao diện camera + hướng dẫn]
    |
    v
[Camera kích hoạt – phát hiện khuôn mặt]
    |
    v
<Phát hiện khuôn mặt?>
   Không --> [Hiển thị "Không phát hiện khuôn mặt"] --> quay lại Camera
   Có
    |
    v
[Chụp frame 1: Nhìn thẳng – trích xuất descriptor]
    |
    v
[Chụp frame 2: Quay trái – trích xuất descriptor]
    |
    v
[Chụp frame 3: Quay phải – trích xuất descriptor]
    |
    v
[Gửi 3 descriptor lên API /face-auth/login]
    |
    v
<Liveness Check: minDist ≥ 0.18 và maxDist ≤ 0.55?>
   Thất bại --> [Hiển thị "Phát hiện ảnh tĩnh hoặc không nhất quán"] --> [Kết thúc thất bại]
   Thành công
    |
    v
[So khớp 1:N với toàn bộ user có faceIdEnabled = true]
    |
    v
<Tìm thấy user khớp (confidence ≠ fail)?>
   Không --> [Hiển thị "Khuôn mặt không khớp tài khoản nào"] --> [Kết thúc thất bại]
   Có
    |
    v
[Cập nhật lastLoginAt, tạo JWT Token]
    |
    v
[Trả token về Frontend, lưu localStorage]
    |
    v
[Chuyển đến trang chủ]
    |
    v
[Kết thúc]
```

---

## 2. Activity Diagram – Chat với AI

```
[Bắt đầu]
    |
    v
[Khách hàng mở Widget Chat]
    |
    v
[Hệ thống tải lịch sử hội thoại từ API]
    |
    v
[Khách hàng nhập tin nhắn]
    |
    v
<Gửi tin nhắn hay ảnh?>
   Ảnh --> [Upload ảnh lên server] --> [OCR trích xuất text từ ảnh]
           |
           v
           [Nội dung = text từ OCR]
   Text --> [Nội dung = text nhập trực tiếp]
    |
    v
[Gọi API POST /chat/send với nội dung]
    |
    v
[Backend lưu ChatMessage (senderType: user)]
    |
    v
[AI Service phân tích intent]
    |
    v
<Intent cần hỗ trợ con người?>
   Có --> [Phát socket chat:human-requested đến dược sĩ]
          [Đổi conversation.status = human_pending]
          [AI vẫn trả lời tạm thời]
   Không
    |
    v
[AI tra cứu database sản phẩm nếu cần]
    |
    v
[AI tổng hợp câu trả lời]
    |
    v
[Backend lưu ChatMessage (senderType: bot)]
    |
    v
[Phát Socket.IO: chat:message:new đến client]
    |
    v
[Giao diện hiển thị câu trả lời + danh sách sản phẩm]
    |
    v
<Khách hàng muốn tiếp tục?>
   Có --> quay lại [Khách hàng nhập tin nhắn]
   Không
    |
    v
[Kết thúc]
```

---

## 3. Activity Diagram – Tìm kiếm bằng hình ảnh (OCR Gemini)

```
[Bắt đầu]
    |
    v
[Khách hàng nhấn biểu tượng đính kèm ảnh]
    |
    v
[Hệ thống hiển thị tùy chọn: camera / thư viện]
    |
    v
[Khách hàng chọn ảnh toa thuốc / hộp thuốc]
    |
    v
<File hợp lệ (JPG/PNG < 5MB)?>
   Không --> [Hiển thị lỗi định dạng/kích thước] --> [Kết thúc thất bại]
   Có
    |
    v
[Upload ảnh lên Server → Cloudinary]
    |
    v
[Gửi ảnh đến Gemini Vision API với prompt OCR]
    |
    v
<Gemini nhận diện được tên thuốc?>
   Không --> [Thông báo "Không đọc được, chụp rõ hơn"] --> [Kết thúc thất bại]
   Có
    |
    v
[Nhận danh sách tên thuốc / hoạt chất từ Gemini]
    |
    v
[Tìm kiếm trong database Product theo tên thuốc]
    |
    v
<Tìm thấy sản phẩm?>
   Không --> [Hiển thị "Chưa có sản phẩm này trong nhà thuốc"]
   Có --> [Trả về danh sách sản phẩm: tên, giá, mô tả]
    |
    v
[Hiển thị ảnh đã upload + danh sách sản phẩm trong chat]
    |
    v
<Khách hàng chọn sản phẩm?>
   Có --> [Xem chi tiết hoặc Thêm vào giỏ hàng]
   Không
    |
    v
[Kết thúc]
```

---

## 4. Activity Diagram – Thanh toán bằng MoMo

```
[Bắt đầu]
    |
    v
[Khách hàng vào trang Checkout, chọn "Ví MoMo"]
    |
    v
[Hệ thống hiển thị tóm tắt đơn hàng]
    |
    v
[Khách hàng nhấn "Đặt hàng & Thanh toán MoMo"]
    |
    v
<Sản phẩm còn hàng?>
   Không --> [Thông báo "Sản phẩm hết hàng"] --> [Kết thúc thất bại]
   Có
    |
    v
[Backend tạo Order (paymentStatus: pending), trừ tồn kho]
    |
    v
[Backend tạo payload MoMo + ký HMAC-SHA256]
    |
    v
[Gửi request đến MoMo API]
    |
    v
<MoMo trả resultCode = 0?>
   Không (resultCode = 98) --> [Thử lại với payWithMethod]
                                |
                                v
                               <Thành công?>
                                  Không --> [Thông báo lỗi thanh toán] --> [Kết thúc thất bại]
                                  Có --> tiếp tục
   Có
    |
    v
[Redirect khách hàng đến trang thanh toán MoMo]
    |
    v
[Khách hàng xác nhận thanh toán (nhập PIN MoMo)]
    |
    v
<Khách hàng xác nhận hay hủy?>
   Hủy --> [MoMo redirect về với resultCode ≠ 0] --> [Hiển thị "Thanh toán bị hủy"] --> [Kết thúc]
   Xác nhận
    |
    v
[MoMo gọi IPN Webhook về backend]
    |
    v
<Chữ ký IPN hợp lệ?>
   Không --> [Từ chối, log lỗi bảo mật] --> [Kết thúc thất bại]
   Có
    |
    v
[Backend cập nhật Order: paymentStatus = paid, lưu transactionId]
    |
    v
[MoMo redirect về trang MomoResultPage]
    |
    v
[Hiển thị xác nhận thanh toán thành công]
    |
    v
[Kết thúc]
```

---

## 5. Activity Diagram – Quên mật khẩu (OTP Email)

```
[Bắt đầu]
    |
    v
[Khách hàng nhấn "Quên mật khẩu"]
    |
    v
[Hệ thống hiển thị form nhập email]
    |
    v
[Khách hàng nhập email và nhấn "Gửi OTP"]
    |
    v
<Email tồn tại trong hệ thống?>
   Không --> [Hiển thị "Tài khoản không tồn tại"] --> [Kết thúc thất bại]
   Có
    |
    v
<Tài khoản có mật khẩu local (không phải Google-only)?>
   Không --> [Hiển thị "Vui lòng đăng nhập bằng Google"] --> [Kết thúc thất bại]
   Có
    |
    v
[Xóa OTP cũ của email này]
    |
    v
[Sinh OTP 6 số, đặt thời hạn 10 phút]
    |
    v
[Lưu OTP vào DB (purpose: password_reset)]
    |
    v
[Gửi email HTML chứa mã OTP]
    |
    v
[Hiển thị form nhập OTP với maskedEmail]
    |
    v
[Khách hàng nhập mã OTP 6 số]
    |
    v
<OTP đúng và chưa hết hạn?>
   Sai OTP --> [Hiển thị "OTP không hợp lệ"] --> quay lại nhập OTP
   Hết hạn --> [Hiển thị "OTP đã hết hạn"]
              [Khách hàng nhấn "Gửi lại OTP"] --> quay lại [Xóa OTP cũ]
   Hợp lệ
    |
    v
[Hiển thị form nhập mật khẩu mới]
    |
    v
[Khách hàng nhập mật khẩu mới + xác nhận]
    |
    v
<Mật khẩu hợp lệ (≥ 6 ký tự) và 2 trường khớp nhau?>
   Không hợp lệ --> [Hiển thị lỗi tương ứng] --> quay lại nhập mật khẩu
   Hợp lệ
    |
    v
[Backend hash bcrypt (10 rounds), cập nhật password vào User]
    |
    v
[Xóa tất cả OTP password_reset của email]
    |
    v
[Hiển thị "Đặt lại mật khẩu thành công"]
    |
    v
[Chuyển về trang Đăng nhập]
    |
    v
[Kết thúc]
```
