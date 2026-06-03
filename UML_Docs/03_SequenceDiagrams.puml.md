# Sequence Diagrams – 5 Use Cases (PlantUML)
# Phân biệt rõ Actor: Boundary | Controller | Entity

---

## 1. Sequence Diagram – Đăng nhập bằng Face ID

```plantuml
@startuml UC01_FaceID_Login
title UC01 – Đăng nhập bằng Face ID
hide footbox

actor "Khách hàng" as User

' ===== BOUNDARY =====
boundary "LoginPage\n(Trang đăng nhập)" as LoginUI #LightBlue
boundary "FaceCamera\n(Camera Component)" as CameraUI #LightBlue

' ===== CONTROLLER =====
control "FaceAuthController\n/api/client/face-auth" as FaceCtrl #LightGreen
control "FaceAuthService" as FaceService #LightGreen
control "FaceAPIService\n(TinyFaceDetector)" as FaceAPI #LightGreen

' ===== ENTITY =====
entity "User\n(MongoDB)" as UserDB #LightYellow
entity "JWTToken\n(localStorage)" as JWT #LightYellow
entity "ChatConversation\n(MongoDB)" as ChatDB #LightYellow

== Bước 1: Khởi tạo ==
User -> LoginUI: Nhấn "Đăng nhập bằng Face ID"
LoginUI -> CameraUI: Mở giao diện camera
CameraUI -> FaceAPI: Khởi tạo TinyFaceDetector model
FaceAPI --> CameraUI: Model loaded

== Bước 2: Thu thập khuôn mặt ==
loop 3 lần (thẳng → trái → phải)
    User -> CameraUI: Nhìn vào camera theo hướng dẫn
    CameraUI -> FaceAPI: detectSingleFace(videoFrame)
    alt Không phát hiện khuôn mặt
        FaceAPI --> CameraUI: null
        CameraUI --> User: Hiển thị "Không phát hiện khuôn mặt"
    else Phát hiện ổn định
        FaceAPI --> CameraUI: FaceDetection + Landmarks
        CameraUI -> FaceAPI: computeFaceDescriptor()
        FaceAPI --> CameraUI: Float32Array[128]
        CameraUI -> CameraUI: Lưu descriptor vào mảng
    end
end

== Bước 3: Xác thực Backend ==
CameraUI -> FaceCtrl: POST /api/client/face-auth/login\n{ faceDescriptors: [d0, d1, d2] }
FaceCtrl -> FaceService: loginWithFaceId(faceDescriptors)

FaceService -> FaceService: Liveness Check\n(minDist, maxDist giữa 3 descriptor)
alt minDist < 0.18 (ảnh tĩnh)
    FaceService --> FaceCtrl: throw Error "Phát hiện ảnh tĩnh"
    FaceCtrl --> CameraUI: 401 - "Vui lòng dùng khuôn mặt thật"
    CameraUI --> User: Hiển thị lỗi liveness
else maxDist > 0.55 (không nhất quán)
    FaceService --> FaceCtrl: throw Error "Ảnh không nhất quán"
    FaceCtrl --> CameraUI: 400 - "Vui lòng thử lại"
    CameraUI --> User: Hiển thị lỗi
end

FaceService -> UserDB: User.find({ faceIdEnabled: true })
UserDB --> FaceService: Danh sách users có Face ID

FaceService -> FaceService: Cross-check 1:N\ntính bestAvgDist và confidence
alt Không tìm thấy (confidence = fail)
    FaceService --> FaceCtrl: throw Error "Không khớp tài khoản nào"
    FaceCtrl --> CameraUI: 401 - Thông báo lỗi
    CameraUI --> User: Hiển thị lỗi đăng nhập
end

FaceService -> UserDB: matchedUser.lastLoginAt = now(); save()
FaceService -> ChatDB: clearClientChat(matchedUser._id)
FaceService -> FaceService: jwt.sign(payload, secret, {expiresIn: '7d'})
FaceService --> FaceCtrl: { accessToken, user, faceConfidence }
FaceCtrl --> CameraUI: 200 OK – { accessToken, user }

== Bước 4: Hoàn tất ==
CameraUI -> JWT: localStorage.setItem('accessToken', token)
CameraUI --> LoginUI: Đăng nhập thành công
LoginUI --> User: Redirect đến Trang chủ

@enduml
```

---

## 2. Sequence Diagram – Chat với AI

```plantuml
@startuml UC02_AI_Chat
title UC02 – Chat với AI dược sĩ ảo
hide footbox

actor "Khách hàng" as User

' ===== BOUNDARY =====
boundary "ChatWidget\n(Giao diện Chat)" as ChatUI #LightBlue

' ===== CONTROLLER =====
control "ChatController\n/api/client/chat" as ChatCtrl #LightGreen
control "ChatService" as ChatService #LightGreen
control "AIService\n(DeepSeek/Gemini)" as AIService #LightGreen
control "SocketIO\n(Real-time)" as Socket #LightGreen

' ===== ENTITY =====
entity "ChatConversation\n(MongoDB)" as ConvDB #LightYellow
entity "ChatMessage\n(MongoDB)" as MsgDB #LightYellow
entity "Product\n(MongoDB)" as ProductDB #LightYellow
entity "User\n(MongoDB)" as UserDB #LightYellow

== Bước 1: Mở Chat ==
User -> ChatUI: Nhấn biểu tượng Chat
ChatUI -> ChatCtrl: GET /api/client/chat/messages
ChatCtrl -> ChatService: getClientConversationSnapshot(userId)
ChatService -> ConvDB: findOne({ clientId, status })
ChatService -> MsgDB: find({ conversationId })
MsgDB --> ChatService: Lịch sử tin nhắn
ChatService --> ChatCtrl: { conversation, messages }
ChatCtrl --> ChatUI: Hiển thị lịch sử hội thoại
ChatUI --> User: Hiển thị giao diện Chat

== Bước 2: Gửi tin nhắn ==
User -> ChatUI: Nhập câu hỏi và nhấn Gửi
ChatUI -> ChatCtrl: POST /api/client/chat/send\n{ message, conversationId }
ChatCtrl -> ChatService: handleClientMessage({ clientId, content, conversationId })

ChatService -> ConvDB: findOrCreate ChatConversation
ConvDB --> ChatService: conversation object

ChatService -> MsgDB: create ChatMessage\n{ senderType: 'user', content }
MsgDB --> ChatService: userMessage saved

== Bước 3: AI xử lý ==
ChatService -> AIService: processMessage(content, conversationHistory)
AIService -> AIService: Phân tích Intent\n(MEDICINE_INFO / SYMPTOM / ORDER / FAQ)

alt Intent = MEDICINE_INFO hoặc SYMPTOM_SEARCH
    AIService -> ProductDB: find({ productName: /keyword/ })
    ProductDB --> AIService: Danh sách sản phẩm
end

alt Intent = CALL_ADMIN (cần dược sĩ)
    AIService --> ChatService: requiresHuman = true
    ChatService -> ConvDB: update({ status: 'human_pending' })
    ChatService -> Socket: emit('chat:human-requested', { conversation })
    Socket --> UserDB: Thông báo đến dược sĩ online
end

AIService --> ChatService: { botReply, products, intent }
ChatService -> MsgDB: create ChatMessage\n{ senderType: 'bot', content: botReply }

== Bước 4: Trả kết quả ==
ChatService --> ChatCtrl: { userMessage, botMessage, conversation }
ChatCtrl -> Socket: emit('chat:message:new', { message })
Socket --> ChatUI: Real-time push tin nhắn mới
ChatUI --> User: Hiển thị câu trả lời AI + danh sách sản phẩm

@enduml
```

---

## 3. Sequence Diagram – Tìm kiếm bằng hình ảnh (OCR Gemini)

```plantuml
@startuml UC03_OCR_Search
title UC03 – Tìm kiếm sản phẩm bằng hình ảnh (OCR Gemini)
hide footbox

actor "Khách hàng" as User

' ===== BOUNDARY =====
boundary "ChatWidget\n(Giao diện Chat)" as ChatUI #LightBlue
boundary "ImagePicker\n(Chọn ảnh)" as ImgPicker #LightBlue

' ===== CONTROLLER =====
control "ChatController\n/api/client/chat" as ChatCtrl #LightGreen
control "UploadService\n(Cloudinary)" as UploadSvc #LightGreen
control "GeminiOCR\n(Vision API)" as GeminiOCR #LightGreen
control "ChatService\n(AI xử lý OCR)" as ChatService #LightGreen

' ===== ENTITY =====
entity "Product\n(MongoDB)" as ProductDB #LightYellow
entity "ChatMessage\n(MongoDB)" as MsgDB #LightYellow
entity "Cloudinary\n(Image Storage)" as Cloud #LightYellow

== Bước 1: Chọn ảnh ==
User -> ChatUI: Nhấn biểu tượng đính kèm ảnh
ChatUI -> ImgPicker: Mở dialog chọn ảnh
User -> ImgPicker: Chọn ảnh toa thuốc / hộp thuốc
ImgPicker --> ChatUI: File ảnh đã chọn

== Bước 2: Upload ảnh ==
ChatUI -> ChatCtrl: POST /api/client/chat/upload-image\n{ file: imageFile }
ChatCtrl -> UploadSvc: uploadToCloudinary(buffer, 'chat')

alt Cloudinary cấu hình đầy đủ
    UploadSvc -> Cloud: Upload ảnh
    Cloud --> UploadSvc: { url, publicId }
else Không có Cloudinary config
    UploadSvc -> UploadSvc: Chuyển sang Base64
    UploadSvc --> ChatCtrl: { url: 'data:image/jpeg;base64,...' }
end

ChatCtrl --> ChatUI: 200 OK – { url: imageUrl }

== Bước 3: Gửi ảnh kèm tin nhắn ==
ChatUI -> ChatCtrl: POST /api/client/chat/send\n{ message: '', meta: { imageUrl } }
ChatCtrl -> ChatService: handleClientMessage({ content:'', meta:{ imageUrl } })

== Bước 4: OCR xử lý ==
ChatService -> GeminiOCR: analyzeImage(imageUrl)\nPrompt: "Trích xuất tên thuốc, hoạt chất"

alt Gemini nhận diện được
    GeminiOCR --> ChatService: ["Paracetamol 500mg", "Vitamin C"]
else Không nhận diện được
    GeminiOCR --> ChatService: [] (empty)
    ChatService -> MsgDB: Lưu bot message "Không đọc được ảnh"
    ChatService --> ChatCtrl: botMessage = "Vui lòng chụp rõ hơn"
    ChatCtrl --> ChatUI: Hiển thị thông báo
    ChatUI --> User: Hiển thị lỗi OCR
end

== Bước 5: Tìm kiếm sản phẩm ==
ChatService -> ProductDB: find({ productName: { $in: ocrResults } })
ProductDB --> ChatService: Danh sách sản phẩm khớp

alt Tìm thấy sản phẩm
    ChatService -> MsgDB: Lưu bot message kèm danh sách sản phẩm
    ChatService --> ChatCtrl: { botMessage, products: [...] }
else Không tìm thấy
    ChatService -> MsgDB: Lưu bot message "Chưa có sản phẩm này"
    ChatService --> ChatCtrl: { botMessage: "Chưa có sản phẩm..." }
end

ChatCtrl --> ChatUI: Response với botMessage + products
ChatUI --> User: Hiển thị ảnh + danh sách thuốc tìm được

@enduml
```

---

## 4. Sequence Diagram – Thanh toán bằng MoMo

```plantuml
@startuml UC04_MoMo_Payment
title UC04 – Thanh toán đơn hàng bằng ví MoMo
hide footbox

actor "Khách hàng" as User
actor "MoMo Gateway" as MoMo

' ===== BOUNDARY =====
boundary "CheckoutPage\n(Trang Thanh toán)" as CheckoutUI #LightBlue
boundary "MomoResultPage\n(Kết quả thanh toán)" as ResultUI #LightBlue

' ===== CONTROLLER =====
control "OrderController\n/api/client/orders" as OrderCtrl #LightGreen
control "OrderService" as OrderService #LightGreen
control "MomoService" as MomoSvc #LightGreen

' ===== ENTITY =====
entity "Order\n(MongoDB)" as OrderDB #LightYellow
entity "Product\n(MongoDB)" as ProductDB #LightYellow
entity "Cart\n(MongoDB)" as CartDB #LightYellow

== Bước 1: Chọn phương thức thanh toán ==
User -> CheckoutUI: Chọn "Ví MoMo" và nhấn "Đặt hàng"
CheckoutUI -> OrderCtrl: POST /api/client/orders/checkout\n{ paymentMethod: 'momo', shippingAddress, ... }

== Bước 2: Tạo đơn hàng ==
OrderCtrl -> OrderService: checkoutFromCart(userId, orderData)
OrderService -> CartDB: Lấy giỏ hàng của user
CartDB --> OrderService: Cart items
OrderService -> ProductDB: Kiểm tra tồn kho từng sản phẩm

alt Sản phẩm hết hàng
    OrderService --> OrderCtrl: throw Error "Sản phẩm hết hàng"
    OrderCtrl --> CheckoutUI: 400 – Thông báo hết hàng
    CheckoutUI --> User: Hiển thị lỗi
end

OrderService -> ProductDB: Trừ tồn kho (inventory.baseQuantity)
OrderService -> OrderDB: Order.create({ status:'pending', paymentStatus:'pending', paymentMethod:'momo' })
OrderDB --> OrderService: { orderId, orderCode, totalAmount }

== Bước 3: Tạo link MoMo ==
OrderService -> MomoSvc: createMomoPayment({ orderId, amount, redirectUrl, ipnUrl })
MomoSvc -> MomoSvc: Tạo payload + ký HMAC-SHA256\n(accessKey, amount, extraData, ipnUrl, orderId,\norderInfo, partnerCode, redirectUrl, requestId, requestType)
MomoSvc -> MoMo: POST https://test-payment.momo.vn/v2/gateway/api/create

alt MoMo resultCode = 98 (captureWallet không hỗ trợ)
    MoMo --> MomoSvc: { resultCode: 98 }
    MomoSvc -> MoMo: Retry với requestType = 'payWithMethod'
end

MoMo --> MomoSvc: { resultCode: 0, payUrl }
MomoSvc --> OrderService: { payUrl, orderId, requestId }
OrderService --> OrderCtrl: { order, payUrl }
OrderCtrl --> CheckoutUI: 201 OK – { orderId, payUrl }

== Bước 4: Khách hàng thanh toán ==
CheckoutUI --> User: Redirect đến MoMo payUrl
User -> MoMo: Xác nhận thanh toán (nhập PIN)

alt Khách hàng hủy
    MoMo --> ResultUI: Redirect về redirectUrl?resultCode=49
    ResultUI --> User: Hiển thị "Thanh toán bị hủy"
end

MoMo -> OrderCtrl: POST /api/client/orders/momo/callback\n{ orderId, transId, resultCode, signature, ... }

== Bước 5: Xử lý callback ==
OrderCtrl -> MomoSvc: verifyMomoSignature(callbackData, signature)
alt Chữ ký không hợp lệ
    MomoSvc --> OrderCtrl: false
    OrderCtrl --> MoMo: 400 – Invalid signature
end

MomoSvc --> OrderCtrl: true (chữ ký hợp lệ)
OrderCtrl -> OrderService: Cập nhật đơn hàng

alt resultCode = 0 (Thành công)
    OrderService -> OrderDB: update({ paymentStatus:'paid', transactionId, paymentDate })
else resultCode ≠ 0 (Thất bại)
    OrderService -> OrderDB: update({ paymentStatus:'failed' })
    OrderService -> ProductDB: Hoàn trả tồn kho
end

OrderDB --> OrderService: Order updated
OrderService --> OrderCtrl: OK
OrderCtrl --> MoMo: 200 OK (IPN acknowledge)

MoMo --> ResultUI: Redirect về redirectUrl
ResultUI --> User: Hiển thị kết quả thanh toán

@enduml
```

---

## 5. Sequence Diagram – Quên mật khẩu (OTP Email)

```plantuml
@startuml UC05_ForgotPassword
title UC05 – Quên mật khẩu (OTP qua Email)
hide footbox

actor "Khách hàng" as User
actor "Email Service\n(Gmail SMTP)" as EmailSvc

' ===== BOUNDARY =====
boundary "LoginPage\n(Trang Đăng nhập)" as LoginUI #LightBlue
boundary "ForgotPasswordForm\n(Form quên mật khẩu)" as ForgotUI #LightBlue
boundary "OTPInputForm\n(Form nhập OTP)" as OtpUI #LightBlue
boundary "ResetPasswordForm\n(Form đặt mật khẩu mới)" as ResetUI #LightBlue

' ===== CONTROLLER =====
control "PasswordResetController\n/api/client/password-reset" as ResetCtrl #LightGreen
control "PasswordResetService" as ResetService #LightGreen
control "MailService\n(Nodemailer)" as MailService #LightGreen

' ===== ENTITY =====
entity "User\n(MongoDB)" as UserDB #LightYellow
entity "OTP\n(MongoDB)" as OtpDB #LightYellow

== Bước 1: Yêu cầu gửi OTP ==
User -> LoginUI: Nhấn "Quên mật khẩu"
LoginUI -> ForgotUI: Hiển thị form nhập email
User -> ForgotUI: Nhập email và nhấn "Gửi OTP"
ForgotUI -> ResetCtrl: POST /api/client/password-reset/send-otp\n{ email }
ResetCtrl -> ResetService: sendPasswordResetOTP({ email })

ResetService -> UserDB: findOne({ email })
alt Không tìm thấy email
    UserDB --> ResetService: null
    ResetService --> ResetCtrl: throw Error "Tài khoản không tồn tại" (404)
    ResetCtrl --> ForgotUI: 404 – Thông báo lỗi
    ForgotUI --> User: Hiển thị lỗi
end

UserDB --> ResetService: User object
ResetService -> ResetService: Kiểm tra user.password tồn tại\n(không phải Google-only)

alt Tài khoản Google-only
    ResetService --> ResetCtrl: throw Error "Chỉ đăng nhập bằng Google" (400)
    ResetCtrl --> ForgotUI: 400 – Thông báo lỗi
    ForgotUI --> User: Hiển thị lỗi
end

== Bước 2: Tạo và gửi OTP ==
ResetService -> OtpDB: deleteMany({ email, purpose: 'password_reset' })
ResetService -> ResetService: generateOTP() → 6 số ngẫu nhiên\nexpiresAt = now + 10 phút
ResetService -> OtpDB: OTP.create({ email, otp, expiresAt, purpose: 'password_reset' })
OtpDB --> ResetService: OTP saved

ResetService -> MailService: sendResetOtpEmail({ toEmail, fullName, otpCode })
MailService -> EmailSvc: SMTP send email HTML chứa mã OTP
EmailSvc --> MailService: Email sent

ResetService --> ResetCtrl: { maskedEmail: 'ng***@gmail.com' }
ResetCtrl --> ForgotUI: 200 OK – { maskedEmail }
ForgotUI --> User: Hiển thị form nhập OTP với maskedEmail

== Bước 3: Xác thực OTP ==
User -> OtpUI: Nhập mã OTP 6 số nhận được
User -> OtpUI: Nhấn "Xác thực OTP"
OtpUI -> ResetCtrl: POST /api/client/password-reset/verify-otp\n{ email, otp }
ResetCtrl -> ResetService: verifyPasswordResetOTP({ email, otp })
ResetService -> OtpDB: findOne({ email, otp, purpose: 'password_reset' })

alt OTP không tồn tại
    OtpDB --> ResetService: null
    ResetService --> ResetCtrl: throw Error "OTP không hợp lệ" (400)
    ResetCtrl --> OtpUI: 400 – Thông báo lỗi
    OtpUI --> User: Hiển thị "OTP không hợp lệ"
end

OtpDB --> ResetService: OTP record
ResetService -> ResetService: Kiểm tra expiresAt > now()

alt OTP hết hạn
    ResetService --> ResetCtrl: throw Error "OTP đã hết hạn" (400)
    ResetCtrl --> OtpUI: 400 – OTP hết hạn
    OtpUI --> User: Hiển thị lỗi + nút "Gửi lại OTP"
end

ResetService --> ResetCtrl: { verified: true, email }
ResetCtrl --> OtpUI: 200 OK – xác thực thành công
OtpUI --> ResetUI: Hiển thị form nhập mật khẩu mới

== Bước 4: Đặt lại mật khẩu ==
User -> ResetUI: Nhập mật khẩu mới + xác nhận
User -> ResetUI: Nhấn "Đặt lại mật khẩu"
ResetUI -> ResetCtrl: POST /api/client/password-reset/reset\n{ email, otp, newPassword, confirmPassword }
ResetCtrl -> ResetService: resetPasswordWithOTP({ email, otp, newPassword, confirmPassword })

ResetService -> ResetService: Kiểm tra newPassword.length ≥ 6
alt Mật khẩu quá ngắn
    ResetService --> ResetCtrl: throw Error "Mật khẩu ≥ 6 ký tự" (400)
    ResetCtrl --> ResetUI: 400 – Thông báo lỗi
end

ResetService -> ResetService: Kiểm tra newPassword === confirmPassword
alt Không khớp
    ResetService --> ResetCtrl: throw Error "Mật khẩu không khớp" (400)
    ResetCtrl --> ResetUI: 400 – Thông báo lỗi
end

ResetService -> OtpDB: Xác thực lại OTP (findOne + kiểm tra expiresAt)
ResetService -> ResetService: bcrypt.hash(newPassword, 10)
ResetService -> UserDB: user.password = hashedPassword; save()
ResetService -> OtpDB: deleteMany({ email, purpose: 'password_reset' })

ResetService --> ResetCtrl: { email, message: 'Đặt lại thành công' }
ResetCtrl --> ResetUI: 200 OK – Thành công
ResetUI --> LoginUI: Chuyển về trang Đăng nhập
LoginUI --> User: Hiển thị "Đặt lại mật khẩu thành công"

@enduml
```
