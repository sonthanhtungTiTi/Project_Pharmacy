### 6.2. Bảng Test Case: Đăng nhập bằng Face ID

**Bảng 1: Test case Đăng nhập bằng Face ID (Khuôn mặt hợp lệ)**

| STT | Tên Test Case | Mục đích | Các bước thực hiện | Dữ liệu đầu vào | Kết quả mong đợi | Đánh giá |
|---|---|---|---|---|---|---|
| TC-01 | Đăng nhập Face ID thành công | Kiểm tra hệ thống nhận diện đúng khuôn mặt đã đăng ký và cho phép đăng nhập | 1. Chọn "Đăng nhập Face ID"<br>2. Cấp quyền truy cập Camera<br>3. Đưa khuôn mặt vào khung hình | Khuôn mặt thật của người dùng (đã đăng ký vào CSDL trước đó) | Hệ thống trích xuất đặc trưng khuôn mặt khớp với dữ liệu gốc, thông báo đăng nhập thành công và chuyển hướng vào trang chủ. | Pass |

**Bảng 2: Test case Đăng nhập bằng Face ID (Liveness Check / Chống giả mạo)**

| STT | Tên Test Case | Mục đích | Các bước thực hiện | Dữ liệu đầu vào | Kết quả mong đợi | Đánh giá |
|---|---|---|---|---|---|---|
| TC-02 | Chống giả mạo bằng ảnh tĩnh | Đảm bảo hệ thống từ chối đăng nhập nếu dùng hình ảnh tĩnh chụp sẵn | 1. Chọn "Đăng nhập Face ID"<br>2. Cấp quyền truy cập Camera<br>3. Đưa ảnh chụp khuôn mặt trên điện thoại khác vào Camera | Hình ảnh tĩnh của người dùng (không có cử động) | Thuật toán Liveness Check phát hiện không có sự thay đổi khoảng cách Euclidean giữa các khung hình, báo lỗi "Vui lòng cử động khuôn mặt" và từ chối đăng nhập. | Pass |

---

### 6.6. Bảng Test Case: Tìm kiếm bằng hình ảnh (OCR - Gemini API)

**Bảng 3: Test case Tìm kiếm bằng hình ảnh (OCR)**

| STT | Tên Test Case | Mục đích | Các bước thực hiện | Dữ liệu đầu vào | Kết quả mong đợi | Đánh giá |
|---|---|---|---|---|---|---|
| TC-03 | Quét và nhận diện toa thuốc hợp lệ | Kiểm tra khả năng đọc chữ từ ảnh của Gemini API để tự động tìm sản phẩm tương ứng | 1. Nhấn icon Camera ở thanh tìm kiếm<br>2. Tải lên ảnh toa thuốc hoặc chụp ảnh trực tiếp<br>3. Chờ hệ thống phân tích | File ảnh (.jpg, .png) chứa toa thuốc có chữ viết tay hoặc đánh máy rõ nét | Gemini Vision trích xuất thành công tên thuốc/hoạt chất. Hệ thống lấy dữ liệu văn bản đó tra cứu và hiển thị danh sách các sản phẩm thuốc tương ứng có trong cửa hàng. | Pass |

---

### 6.7. Bảng Test Case: Chat tư vấn với AI (Dược sĩ ảo)

**Bảng 4: Test case Chat tư vấn với AI**

| STT | Tên Test Case | Mục đích | Các bước thực hiện | Dữ liệu đầu vào | Kết quả mong đợi | Đánh giá |
|---|---|---|---|---|---|---|
| TC-04 | Hỏi đáp công dụng thuốc với AI | Kiểm tra phản hồi tự động của Mô hình LLM khi người dùng hỏi về kiến thức y tế | 1. Mở widget Chat AI ở góc phải màn hình<br>2. Nhập câu hỏi tư vấn<br>3. Nhấn gửi tin nhắn | Text: "Thuốc Panadol có tác dụng gì và liều dùng ra sao?" | Chatbot AI phân tích ngữ cảnh và phản hồi bằng ngôn ngữ tự nhiên, liệt kê công dụng giảm đau hạ sốt, liều lượng cơ bản và nhắc nhở đọc kỹ hướng dẫn sử dụng hoặc hỏi ý kiến bác sĩ. | Pass |

---

### 6.9. Bảng Test Case: Đặt hàng và Thanh toán qua MoMo

**Bảng 5: Test case Thanh toán MoMo**

| STT | Tên Test Case | Mục đích | Các bước thực hiện | Dữ liệu đầu vào | Kết quả mong đợi | Đánh giá |
|---|---|---|---|---|---|---|
| TC-05 | Thanh toán đơn hàng qua ví MoMo thành công | Đảm bảo luồng tạo giao dịch MoMo, mã hóa dữ liệu và cập nhật trạng thái tự động qua Webhook | 1. Vào giỏ hàng, chọn "Thanh toán"<br>2. Chọn phương thức thanh toán "MoMo"<br>3. Dùng ứng dụng MoMo quét mã QR trên màn hình và xác nhận chuyển tiền | Thông tin đơn hàng hợp lệ và tài khoản MoMo của khách hàng có đủ số dư thanh toán | Tiền bị trừ trên ví MoMo. MoMo IPN gửi tín hiệu về server qua Webhook. Trạng thái đơn hàng tự động chuyển sang "Đã thanh toán", hiển thị thông báo thành công và làm sạch giỏ hàng. | Pass |
