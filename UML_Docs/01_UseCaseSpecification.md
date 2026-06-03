# 3.2.3. Đặc Tả Use Case (Use Case Specification)

---

## 3.2.3.1. Use case Đăng nhập bằng Face ID

| **Tên UC** | Đăng nhập bằng Face ID |
|---|---|
| **Mô tả ngắn gọn** | Chức năng cho phép khách hàng xác thực danh tính và đăng nhập vào hệ thống bằng khuôn mặt thay vì mật khẩu truyền thống |
| **Actor chính** | Khách hàng |
| **Actor phụ** | Không |
| **Tiền điều kiện** | - Khách hàng đã có tài khoản và đã đăng ký Face ID (enroll) trong phần Hồ sơ<br>- Thiết bị có camera hoạt động<br>- Đã cài đặt thư viện face-api.js trên trình duyệt |
| **Hậu điều kiện** | Khách hàng đăng nhập thành công và được chuyển đến trang chủ với phiên đăng nhập hợp lệ (JWT token lưu localStorage) |

### Luồng sự kiện chính

| **Khách hàng** | **Hệ thống** |
|---|---|
| 1. Truy cập trang đăng nhập và chọn "Đăng nhập bằng Face ID" | |
| | 2. Hệ thống hiển thị giao diện camera và hướng dẫn quét 3 góc khuôn mặt (thẳng, trái, phải) |
| 3. Khách hàng cho phép truy cập camera | |
| | 4. Hệ thống kích hoạt camera và bắt đầu phát hiện khuôn mặt bằng TinyFaceDetector |
| 5. Khách hàng nhìn thẳng vào camera | |
| | 6. Hệ thống phát hiện khuôn mặt ổn định, chụp frame 1 (góc thẳng), trích xuất face descriptor 128 chiều |
| 7. Khách hàng quay mặt sang trái theo hướng dẫn | |
| | 8. Hệ thống phát hiện và chụp frame 2 (góc trái), trích xuất descriptor |
| 9. Khách hàng quay mặt sang phải | |
| | 10. Hệ thống phát hiện và chụp frame 3 (góc phải), trích xuất descriptor |
| | 11. Hệ thống gửi 3 face descriptor lên API POST /api/client/face-auth/login |
| | 12. Backend thực hiện Liveness Check: minDist ≥ 0.18 (chặn ảnh tĩnh) và maxDist ≤ 0.55 |
| | 13. Backend cross-check 1:N so sánh với tất cả user có faceIdEnabled = true |
| | 14. Backend tìm ra user khớp nhất (confidence = high hoặc marginal) |
| | 15. Backend cập nhật lastLoginAt, xóa chat cũ, tạo JWT token (7 ngày) |
| | 16. Hệ thống trả về accessToken và thông tin user |
| | 17. Frontend lưu token vào localStorage, chuyển người dùng đến trang chủ |

### Luồng sự kiện thay thế

| **Khách hàng** | **Hệ thống** |
|---|---|
| | **6.1** Camera không phát hiện khuôn mặt sau 10 giây → Hiển thị "Không phát hiện khuôn mặt. Hãy đảm bảo đủ ánh sáng" |
| **6.2** Khách hàng điều chỉnh vị trí và thử lại | |
| | **12.1** Liveness check thất bại (minDist < 0.18): Trả lỗi "Phát hiện ảnh tĩnh. Vui lòng dùng khuôn mặt thật" |
| **12.2** Khách hàng thực hiện lại từ bước 5 | |
| | **14.1** Không tìm thấy user khớp hoặc confidence = 'fail': Trả lỗi "Khuôn mặt không khớp với bất kỳ tài khoản nào" |
| **14.2** Khách hàng chọn đăng nhập bằng mật khẩu | |

---

## 3.2.3.2. Use case Chat với AI

| **Tên UC** | Chat với AI dược sĩ ảo |
|---|---|
| **Mô tả ngắn gọn** | Chức năng cho phép khách hàng tương tác với chatbot AI để được tư vấn thuốc, tra cứu sản phẩm và đặt hàng ngay trong giao diện chat |
| **Actor chính** | Khách hàng |
| **Actor phụ** | AI Service (DeepSeek/Gemini), Dược sĩ (khi AI chuyển sang hỗ trợ thủ công) |
| **Tiền điều kiện** | Khách hàng đã đăng nhập; backend đang hoạt động; AI API Key được cấu hình |
| **Hậu điều kiện** | Tin nhắn lưu vào ChatConversation và ChatMessage; AI trả lời đúng ngữ cảnh |

### Luồng sự kiện chính

| **Khách hàng** | **Hệ thống** |
|---|---|
| 1. Khách hàng nhấn biểu tượng chat trên trang web | |
| | 2. Hệ thống hiển thị widget chat, tải lịch sử hội thoại từ GET /api/client/chat/messages |
| 3. Khách hàng nhập câu hỏi và nhấn Gửi | |
| | 4. Hệ thống gọi POST /api/client/chat/send với nội dung tin nhắn |
| | 5. Backend xác thực user, lấy hoặc tạo mới ChatConversation |
| | 6. Backend lưu tin nhắn user vào ChatMessage (senderType: 'user') |
| | 7. AI Service phân tích intent (MEDICINE_INFO / SYMPTOM_SEARCH / ORDER_MEDICINE / GENERAL_FAQ) |
| | 8. AI tra cứu database sản phẩm nếu cần, tổng hợp câu trả lời |
| | 9. Backend lưu tin nhắn AI vào ChatMessage (senderType: 'bot') |
| | 10. Hệ thống phát sự kiện Socket.IO chat:message:new đến client |
| | 11. Giao diện hiển thị câu trả lời kèm danh sách sản phẩm nếu có |
| 12. Khách hàng xem kết quả hoặc nhấn "Thêm vào giỏ hàng" | |

### Luồng sự kiện thay thế

| **Khách hàng** | **Hệ thống** |
|---|---|
| | **7.1** AI nhận diện cần hỗ trợ con người: Phát sự kiện chat:human-requested đến dược sĩ online, đổi trạng thái sang human_pending |
| | **8.1** Không tìm thấy sản phẩm phù hợp: Trả lời "Vui lòng liên hệ dược sĩ để được tư vấn thêm" |
| **3.1** Khách hàng gửi ảnh thuốc thay vì text | |
| | **4.1** Hệ thống upload ảnh qua POST /api/client/chat/upload-image, OCR trích xuất text, AI xử lý |

---

## 3.2.3.3. Use case Tìm kiếm bằng hình ảnh (OCR - Gemini API)

| **Tên UC** | Tìm kiếm sản phẩm bằng hình ảnh (OCR) |
|---|---|
| **Mô tả ngắn gọn** | Khách hàng tải lên ảnh toa thuốc/hộp thuốc, hệ thống dùng Gemini Vision API nhận diện tên thuốc và tìm kiếm sản phẩm tương ứng |
| **Actor chính** | Khách hàng |
| **Actor phụ** | Gemini API (OCR), AI Service |
| **Tiền điều kiện** | GEMINI_API_KEY được cấu hình trong backend; khách hàng có ảnh toa hoặc hộp thuốc |
| **Hậu điều kiện** | Danh sách sản phẩm phù hợp với tên thuốc nhận diện được hiển thị cho khách hàng |

### Luồng sự kiện chính

| **Khách hàng** | **Hệ thống** |
|---|---|
| 1. Khách hàng nhấn biểu tượng đính kèm ảnh trong giao diện chat | |
| | 2. Hệ thống hiển thị tùy chọn: chụp ảnh từ camera hoặc chọn từ thư viện |
| 3. Khách hàng chọn ảnh toa thuốc / hộp thuốc | |
| | 4. Hệ thống gửi ảnh lên POST /api/client/chat/upload-image |
| | 5. Backend nhận file ảnh, upload lên Cloudinary, lấy URL |
| | 6. Backend gửi ảnh đến Gemini Vision API với prompt trích xuất tên thuốc |
| | 7. Gemini API phân tích ảnh, trả về danh sách tên thuốc/hoạt chất nhận diện được |
| | 8. Backend tìm kiếm trong database Product theo tên thuốc |
| | 9. AI Service tổng hợp kết quả: danh sách sản phẩm khớp, giá, mô tả |
| | 10. Hệ thống trả về tin nhắn chat với ảnh đã upload và danh sách thuốc tìm được |
| | 11. Giao diện hiển thị ảnh + danh sách sản phẩm kèm giá |
| 12. Khách hàng chọn sản phẩm để xem chi tiết hoặc thêm vào giỏ hàng | |

### Luồng sự kiện thay thế

| **Khách hàng** | **Hệ thống** |
|---|---|
| | **7.1** Gemini không nhận diện được text: Thông báo "Không thể đọc tên thuốc từ ảnh, vui lòng chụp rõ hơn" |
| **7.2** Khách hàng chụp lại ảnh | |
| | **8.1** Không tìm thấy sản phẩm khớp: Thông báo "Chưa có sản phẩm này trong nhà thuốc" |
| | **4.1** File sai định dạng hoặc quá lớn: Trả lỗi "Vui lòng chọn ảnh JPG/PNG nhỏ hơn 5MB" |

---

## 3.2.3.4. Use case Thanh toán bằng MoMo

| **Tên UC** | Thanh toán đơn hàng bằng ví MoMo |
|---|---|
| **Mô tả ngắn gọn** | Khách hàng thanh toán đơn hàng dược phẩm qua cổng thanh toán MoMo với bảo mật chữ ký HMAC-SHA256 |
| **Actor chính** | Khách hàng |
| **Actor phụ** | MoMo Payment Gateway |
| **Tiền điều kiện** | Khách hàng đã đăng nhập; giỏ hàng có sản phẩm; đã điền địa chỉ; MOMO_PARTNER_CODE và SECRET_KEY được cấu hình |
| **Hậu điều kiện** | Đơn hàng được tạo với paymentStatus: 'paid'; tồn kho được cập nhật; khách hàng nhận xác nhận |

### Luồng sự kiện chính

| **Khách hàng** | **Hệ thống** |
|---|---|
| 1. Vào trang Thanh toán, chọn phương thức "Ví MoMo" | |
| | 2. Hệ thống hiển thị tóm tắt đơn hàng: sản phẩm, tổng tiền, địa chỉ giao |
| 3. Nhấn "Đặt hàng & Thanh toán MoMo" | |
| | 4. Hệ thống gọi POST /api/client/orders/checkout với paymentMethod: 'momo' |
| | 5. Backend tạo Order trong DB với paymentStatus: 'pending', trừ tồn kho |
| | 6. Backend tạo payload MoMo: orderId, amount, redirectUrl, ipnUrl |
| | 7. Backend ký chữ ký HMAC-SHA256 theo đúng thứ tự field của MoMo |
| | 8. Backend gửi request tới MoMo API (captureWallet hoặc payWithMethod) |
| | 9. MoMo trả về payUrl |
| | 10. Hệ thống redirect khách hàng đến trang thanh toán MoMo |
| 11. Khách hàng xác nhận thanh toán trên MoMo (nhập mã PIN) | |
| | 12. MoMo gọi IPN Webhook POST /api/client/orders/momo/callback |
| | 13. Backend xác thực chữ ký IPN callback |
| | 14. Backend cập nhật Order: paymentStatus: 'paid', lưu transactionId, paymentDate |
| | 15. MoMo redirect khách hàng về redirectUrl (trang MomoResultPage) |
| | 16. Hệ thống hiển thị xác nhận thanh toán thành công |

### Luồng sự kiện thay thế

| **Khách hàng** | **Hệ thống** |
|---|---|
| | **8.1** MoMo trả resultCode = 98: Backend tự động thử lại với requestType payWithMethod |
| | **11.1** Khách hàng hủy trên MoMo: Redirect về với resultCode ≠ 0, hiển thị thông báo hủy |
| | **13.1** Chữ ký IPN không hợp lệ: Backend từ chối, Order giữ trạng thái pending |
| | **5.1** Sản phẩm hết hàng: Thông báo lỗi, không tạo đơn |

---

## 3.2.3.5. Use case Quên mật khẩu (OTP qua Email)

| **Tên UC** | Quên mật khẩu – Đặt lại qua OTP Email |
|---|---|
| **Mô tả ngắn gọn** | Khách hàng đặt lại mật khẩu khi quên thông qua mã OTP 6 số gửi về email đăng ký, có hiệu lực 10 phút |
| **Actor chính** | Khách hàng |
| **Actor phụ** | Email Service (Nodemailer + Gmail App Password) |
| **Tiền điều kiện** | Khách hàng có tài khoản local (không phải Google-only); email vẫn còn truy cập; SMTP được cấu hình |
| **Hậu điều kiện** | Mật khẩu mới được hash bcrypt lưu vào DB; OTP bị xóa; khách hàng đăng nhập được bằng mật khẩu mới |

### Luồng sự kiện chính

| **Khách hàng** | **Hệ thống** |
|---|---|
| 1. Nhấn "Quên mật khẩu" trên trang đăng nhập | |
| | 2. Hệ thống hiển thị form nhập email |
| 3. Nhập địa chỉ email và nhấn "Gửi OTP" | |
| | 4. Hệ thống gọi POST /api/client/password-reset/send-otp |
| | 5. Backend tìm kiếm user theo email trong database |
| | 6. Backend kiểm tra user có mật khẩu local (không phải Google-only) |
| | 7. Backend xóa OTP cũ (nếu có) của email này |
| | 8. Backend sinh OTP 6 số ngẫu nhiên, đặt thời hạn 10 phút |
| | 9. Backend lưu OTP vào collection Otp với purpose: 'password_reset' |
| | 10. Backend gửi email HTML chứa mã OTP qua Mail Service |
| | 11. Hệ thống trả về maskedEmail (ng***@gmail.com) và hiển thị form nhập OTP |
| 12. Khách hàng kiểm tra email và nhập mã OTP 6 số | |
| 13. Nhấn "Xác thực OTP" | |
| | 14. Hệ thống gọi POST /api/client/password-reset/verify-otp |
| | 15. Backend tìm OTP record theo email + mã + purpose |
| | 16. Backend kiểm tra OTP chưa hết hạn (expiresAt > now) |
| | 17. Hệ thống hiển thị form nhập mật khẩu mới (2 trường) |
| 18. Khách hàng nhập mật khẩu mới và xác nhận lại | |
| 19. Nhấn "Đặt lại mật khẩu" | |
| | 20. Hệ thống gọi POST /api/client/password-reset/reset |
| | 21. Backend kiểm tra mật khẩu ≥ 6 ký tự và 2 trường khớp nhau |
| | 22. Backend hash mật khẩu mới bằng bcrypt (10 rounds), lưu vào User |
| | 23. Backend xóa tất cả OTP password_reset của email này |
| | 24. Hệ thống hiển thị "Đặt lại mật khẩu thành công" và chuyển về trang đăng nhập |

### Luồng sự kiện thay thế

| **Khách hàng** | **Hệ thống** |
|---|---|
| | **5.1** Email không tồn tại: Hiển thị lỗi "Tài khoản không tồn tại" |
| **5.2** Khách hàng kiểm tra lại email đã nhập | |
| | **6.1** Tài khoản Google-only: Thông báo "Tài khoản này chỉ đăng nhập bằng Google" |
| | **16.1** OTP đã hết hạn (> 10 phút): Thông báo "OTP đã hết hạn" |
| **16.2** Khách hàng nhấn "Gửi lại OTP" | |
| | **16.3** Hệ thống gửi OTP mới, quay lại bước 7 |
| | **15.1** OTP không đúng: Thông báo "OTP không hợp lệ" |
| **15.2** Khách hàng nhập lại OTP | |
| | **21.1** Mật khẩu < 6 ký tự: Thông báo "Mật khẩu phải có ít nhất 6 ký tự" |
| | **21.2** Hai trường không khớp: Thông báo "Mật khẩu xác nhận không khớp" |
| **21.3** Khách hàng nhập lại | |
