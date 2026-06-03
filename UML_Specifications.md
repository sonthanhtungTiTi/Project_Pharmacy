# TÀI LIỆU THIẾT KẾ VÀ ĐẶC TẢ HỆ THỐNG - PROJECT PHARMACY

## 1. ĐẶC TẢ USE CASE (Use Case Specification)

### 1.1. Use case Đăng nhập bằng Face ID

| Tên UC | Đăng nhập bằng Face ID |
| :--- | :--- |
| **Mô tả ngắn gọn** | Chức năng giúp người dùng (khách hàng/admin) đăng nhập vào hệ thống thông qua nhận diện khuôn mặt thay vì dùng mật khẩu. |
| **Actor chính** | Người dùng (Khách hàng) |
| **Actor phụ** | Không |
| **Tiền điều kiện** | Hệ thống có quyền truy cập camera thiết bị. Người dùng đã đăng ký khuôn mặt trên hệ thống. |
| **Hậu điều kiện** | Đăng nhập thành công và chuyển hướng đến trang chủ. |
| **Luồng sự kiện chính** | **Khách hàng** | **Hệ thống** |
| | 1. Nhấn nút "Đăng nhập bằng Face ID" | 2. Hệ thống yêu cầu quyền truy cập camera và bật luồng video. |
| | 3. Quét khuôn mặt trước camera | 4. Hệ thống trích xuất đặc trưng khuôn mặt và gửi lên server. |
| | | 5. So sánh đặc trưng với dữ liệu khuôn mặt đã lưu. |
| | | 6. Trả về token đăng nhập và chuyển hướng sang trang chủ. |
| **Luồng sự kiện thay thế** | 4.1 Không tìm thấy khuôn mặt | 4.2 Hiển thị thông báo "Không nhận diện được khuôn mặt, vui lòng thử lại". |
| | 5.1 Khuôn mặt không khớp dữ liệu | 5.2 Thông báo "Khuôn mặt không khớp" và yêu cầu thử lại hoặc đăng nhập bằng mật khẩu. |

---

### 1.2. Use case Chat với AI

| Tên UC | Chat với AI |
| :--- | :--- |
| **Mô tả ngắn gọn** | Chức năng giúp khách hàng trò chuyện với trợ lý AI để hỏi đáp thông tin thuốc, tư vấn sức khỏe. |
| **Actor chính** | Khách hàng |
| **Actor phụ** | AI Engine |
| **Tiền điều kiện** | Khách hàng đã đăng nhập hoặc hệ thống cho phép chat khách (guest). |
| **Hậu điều kiện** | Lưu lịch sử chat, cung cấp câu trả lời hữu ích cho khách hàng. |
| **Luồng sự kiện chính** | **Khách hàng** | **Hệ thống** |
| | 1. Nhấn vào biểu tượng Chat và chọn "Chat với AI" | 2. Hệ thống mở cửa sổ giao diện Chat, tải tin nhắn chào mừng. |
| | 3. Nhập câu hỏi và nhấn Gửi | 4. Nhận đoạn chat, phân tích ngữ cảnh, gọi API đến AI Engine. |
| | | 5. AI Engine xử lý và trả về phản hồi thích hợp. |
| | | 6. Hệ thống hiển thị câu trả lời của AI lên màn hình chat và lưu `chatMessage`. |
| **Luồng sự kiện thay thế** | 5.1 Lỗi kết nối AI Engine | 5.2 Hệ thống thông báo "Hệ thống AI đang bận, vui lòng thử lại sau". |

---

### 1.3. Use case Tìm kiếm bằng hình ảnh (OCR)

| Tên UC | Tìm kiếm bằng hình ảnh (OCR API Gemini) |
| :--- | :--- |
| **Mô tả ngắn gọn** | Khách hàng tải ảnh đơn thuốc hoặc vỏ thuốc lên, hệ thống dùng OCR để đọc chữ và đối chiếu tìm kiếm sản phẩm. |
| **Actor chính** | Khách hàng |
| **Actor phụ** | Gemini OCR API |
| **Tiền điều kiện** | Thiết bị khách hàng có ảnh hoặc thiết bị có camera để chụp. |
| **Hậu điều kiện** | Trả về danh sách sản phẩm khớp với văn bản trích xuất từ hình ảnh. |
| **Luồng sự kiện chính** | **Khách hàng** | **Hệ thống** |
| | 1. Chọn chức năng "Tìm kiếm bằng hình ảnh" | 2. Yêu cầu tải lên hình ảnh hoặc chụp ảnh mới. |
| | 3. Chọn/chụp ảnh và xác nhận | 4. Hệ thống tải ảnh lên server, gọi API Gemini OCR. |
| | | 5. Nhận kết quả text (tên thuốc, thành phần) từ API. |
| | | 6. Hệ thống query DB `product.model` để tìm các sản phẩm matching với text. |
| | | 7. Hiển thị danh sách sản phẩm kết quả cho người dùng. |
| **Luồng sự kiện thay thế** | 5.1 Hình ảnh mờ, không trích xuất được chữ | 5.2 Hiển thị thông báo "Không nhận diện được chữ thập trên ảnh, vui lòng thử lại ảnh nét hơn". |
| | 6.1 Không có sản phẩm nào khớp | 6.2 Thông báo "Không tìm thấy sản phẩm phù hợp với tìm kiếm". |

---

### 1.4. Use case Thanh toán bằng MoMo

| Tên UC | Thanh toán bằng MoMo |
| :--- | :--- |
| **Mô tả ngắn gọn** | Cho phép khách hàng thanh toán đơn hàng bằng ví điện tử MoMo. |
| **Actor chính** | Khách hàng |
| **Actor phụ** | MoMo Gateway |
| **Tiền điều kiện** | Khách hàng đã thêm sản phẩm vào giỏ hàng, đã nhập thông tin giao hàng và chọn phương thức thanh toán MoMo. |
| **Hậu điều kiện** | Đơn hàng chuyển sang trạng thái "Đã thanh toán" nếu giao dịch thành công. |
| **Luồng sự kiện chính** | **Khách hàng** | **Hệ thống** |
| | 1. Nhấn nút "Thanh toán giao dịch" | 2. Hệ thống kiểm tra giỏ hàng, tổng tiền, tạo Order với trạng thái "Pending". |
| | | 3. Gửi yêu cầu khởi tạo thanh toán tới MoMo Gateway. |
| | | 4. Nhận URL thanh toán và mã QR từ MoMo, điều hướng khách hàng. |
| | 5. Quét QR hoặc xác nhận trên ví MoMo | 6. Đợi IPN/Webhook từ MoMo phản hồi kết quả trả về server. |
| | | 7. Server nhận phản hồi thành công, cập nhật state đơn hàng sang "Paid". |
| | | 8. Chuyển hướng người dùng về trang "Thành công". |
| **Luồng sự kiện thay thế** | 6.1 Khách hàng huỷ thanh toán | 6.2 MoMo trả về trạng thái huỷ, hệ thống giữ trạng thái "Pending" hoặc "Cancelled" tuỳ logic. |
| | 6.3 Hết hạn thanh toán | 6.4 Cập nhật Order "Cancelled" và thông báo thanh toán thất bại. |

---

### 1.5. Use case Quên mật khẩu (Gửi OTP qua Email)

| Tên UC | Quên mật khẩu |
| :--- | :--- |
| **Mô tả ngắn gọn** | Khách hàng lấy lại quyền truy cập thẻ bằng cách sử dụng mã OTP gửi qua email. |
| **Actor chính** | Khách hàng |
| **Actor phụ** | Email Service (SMTP/SendGrid) |
| **Tiền điều kiện** | Khách hàng quên mật khẩu và có email đã đăng ký. |
| **Hậu điều kiện** | Mật khẩu tài khoản được cập nhật và đăng nhập lại bình thường. |
| **Luồng sự kiện chính** | **Khách hàng** | **Hệ thống** |
| | 1. Chọn "Quên mật khẩu" | 2. Hiển thị form yêu cầu nhập Email. |
| | 3. Nhập Email và nhấn Tiếp tục | 4. Kiểm tra Email có tồn tại trong CSDL `user`. |
| | | 5. Tạo mã OTP, lưu vào DB và gửi Email cho khách hàng. |
| | | 6. Hiển thị form nhập OTP & mật khẩu mới. |
| | 7. Nhập OTP và mật khẩu mới, nhấn Xác nhận | 8. Kiểm tra OTP có hợp lệ và còn hạn không. |
| | | 9. Mã hóa mật khẩu mới và cập nhật vô DB, hủy OTP cũ. |
| | | 10. Thông báo thành công và điều hướng sang Đăng nhập. |
| **Luồng sự kiện thay thế** | 4.1 Email Không tồn tại | 4.2 Thông báo "Email không chưa được đăng ký". |
| | 8.1 OTP sai hoặc quá hạn | 8.2 Hiển thị lỗi thông báo "Mã OTP không hợp lệ hoặc đã hết hạn". |

---

## 2. SƠ ĐỒ ACTIVITY (Activity Diagrams)

### 2.1. Đăng nhập bằng Face ID
```mermaid
flowchart TD
    A((Bắt đầu)) --> B[Khách hàng: Chọn Đăng nhập Face ID]
    B --> C[Hệ thống: Yêu cầu quyền Camera & Mở luồng video]
    C --> D[Khách hàng: Quét khuôn mặt trước Camera]
    D --> E[Hệ thống: Trích xuất đặc trưng khuôn mặt]
    E --> F{Có nhận diện \nđược mặt?}
    F -- Không --> G[Hệ thống: Thông báo lỗi thử lại] --> C
    F -- Có --> H[Hệ thống: Gửi data lên Server & So chiếu]
    H --> I{Dữ liệu \nkhớp?}
    I -- Không --> J[Hệ thống: Hiển thị lỗi, fallback về Password] --> K((Kết thúc))
    I -- Có --> L[Hệ thống: Trả token xác thực tài khoản]
    L --> M[Chuyển hướng trang chủ] --> K((Kết thúc))
```

### 2.2. Chat với AI
```mermaid
flowchart TD
    A((Bắt đầu)) --> B[Khách hàng: Mở cửa sổ Chat AI]
    B --> C[Khách hàng: Nhập nội dung cần hỏi]
    C --> D[Khách hàng: Nhấn Gửi]
    D --> E[Trình duyệt: Gửi Request text lên Backend]
    E --> F[Backend: Lưu tin nhắn & forward tới AI Service]
    F --> G{Kết nối \nthành công?}
    G -- Không --> H[Backend: Trả về lỗi kết nối] --> I[Browser: Hiện thông báo lỗi]
    G -- Có --> J[AI: Trả về phản hồi]
    J --> K[Backend: Lưu phản hồi AI & Trả về Client]
    K --> L[Browser: Hiển thị tin nhắn AI]
    I --> M((Kết thúc))
    L --> C
```

### 2.3. Tìm kiếm bằng hình ảnh (OCR)
```mermaid
flowchart TD
    A((Bắt đầu)) --> B[Khách hàng: Chọn Tìm kiếm bằng hình ảnh]
    B --> C[Khách hàng: Tải lên/chụp ảnh]
    C --> D[Trình duyệt: Gửi file ảnh lên Backend]
    D --> E[Backend: Gọi Gemini OCR API]
    E --> F{OCR trích xuất \nđược text?}
    F -- Không --> G[Hiển thị thông báo ảnh mờ/Không nhận diện] --> M((Kết thúc))
    F -- Có --> H[Backend: Query Database Product bằng nội dung OCR]
    H --> I{Tìm thấy \nsản phẩm?}
    I -- Không --> J[Trả về UI: Không có kết quả phù hợp] --> M
    I -- Có --> K[Trả về UI: Danh sách Sản phẩm]
    K --> L[Hiển thị UI danh sách] --> M
```

### 2.4. Thanh toán bằng MoMo
```mermaid
flowchart TD
    A((Bắt đầu)) --> B[Khách hàng: Checkout & Chọn MoMo]
    B --> C[Backend: Tạo Order "Pending"]
    C --> D[Backend: Cấu hình payload request Send to MoMo Gateway]
    D --> E[MoMo: Trả về `payUrl`]
    E --> F[Client: Redirect sang trang thanh toán MoMo]
    F --> G[Khách hàng: Xác nhận thanh toán (App/Web)]
    G --> H{KH Thanh Toán?}
    H -- Hủy --> I[MoMo: Redirect về callback lỗi] --> J[Backend: Order Cancelled]
    H -- Thành Công --> K[MoMo: Gửi IPN/Webhook + Redirect callback]
    K --> L[Backend: Xác nhận chữ ký IPN]
    L --> M[Backend: Cập nhật Order "Paid"]
    M --> N[Client: Hiện trang thanh toán Thành công]
    J --> O((Kết thúc))
    N --> O

```

### 2.5. Quên mật khẩu
```mermaid
flowchart TD
    A((Bắt đầu)) --> B[Khách hàng: Nhấn Quên mật khẩu]
    B --> C[Nhập Email cần khôi phục]
    C --> D[Backend: Kiểm tra Email]
    D --> E{Email \ntồn tại?}
    E -- Không --> F[Thông báo: Email không đúng] --> C
    E -- Có --> G[Backend: Tạo OTP, lưu DB, cấu hình SMTP]
    G --> H[Mail Server: Gửi mail chứa OTP]
    H --> I[Client: Hiển thị form OTP]
    I --> J[Khách hàng: Nhập OTP + Mật khẩu mới]
    J --> K[Backend: Kiểm tra OTP + Hạn OTP]
    K --> L{Xác thực?}
    L -- Sai/Hết hạn --> M[Thông báo OTP lỗi] --> I
    L -- Đúng --> N[Backend: Cập nhật Hash Pass mới]
    N --> O[Thông báo thành công, Chuyển sang Đăng Nhập] --> P((Kết thúc))
```

---

## 3. SƠ ĐỒ SEQUENCE (Sequence Diagrams)

### 3.1. Đăng nhập bằng Face ID
```plantuml
@startuml
hide footbox
actor "Khách hàng" as User
boundary "Giao diện (Boundary)" as UI
control "AuthController" as AuthCtrl
entity "UserModel (Entity)" as Model
control "Face Recognition Service" as FaceAPI

User -> UI: Mở cam, quét khuôn mặt
activate UI
UI -> AuthCtrl: POST /auth/face-login (Tọa độ/Ảnh khuôn mặt)
activate AuthCtrl
AuthCtrl -> FaceAPI: Trích xuất đặc trưng (Embeddings)
activate FaceAPI
FaceAPI --> AuthCtrl: Trả về Face Vector
deactivate FaceAPI
AuthCtrl -> Model: Kiểm tra vector với DB
activate Model
Model --> AuthCtrl: Khớp / Không khớp
deactivate Model

alt Không Khớp
    AuthCtrl --> UI: Lỗi đăng nhập (401)
    UI --> User: Hiển thị "Không nhận diện được khuôn mặt"
else Khớp
    AuthCtrl --> UI: Trả về Tokens (Access, Refresh) (200)
    UI --> User: Điều hướng vào Trang chủ
end
deactivate AuthCtrl
deactivate UI
@enduml
```

### 3.2. Chat với AI
```plantuml
@startuml
hide footbox
actor "Khách hàng" as User
boundary "Giao diện Chat" as UI
control "ChatController" as ChatCtrl
entity "ChatMessage (Entity)" as Model
control "Gemini AI Service" as Gemini

User -> UI: Nhập và Gửi text
activate UI
UI -> ChatCtrl: Gửi Message (Socket / REST)
activate ChatCtrl
ChatCtrl -> Model: create(userMessage)
activate Model
Model --> ChatCtrl: Lưu thành công
deactivate Model

ChatCtrl -> Gemini: Request Prompt (nội dung + context)
activate Gemini
Gemini --> ChatCtrl: Answer Text
deactivate Gemini

ChatCtrl -> Model: create(aiMessage)
activate Model
Model --> ChatCtrl: Lưu thành công
deactivate Model

ChatCtrl --> UI: Dữ liệu Message Output AI
deactivate ChatCtrl
UI --> User: Hiển thị câu trả lời
deactivate UI
@enduml
```

### 3.3. Tìm kiếm bằng hình ảnh (OCR)
```plantuml
@startuml
hide footbox
actor "Khách hàng" as User
boundary "Tìm Kiếm UI" as UI
control "ProductController" as SearchCtrl
control "Gemini Vision/OCR (API)" as GeminiOCR
entity "Product Model (Entity)" as DB

User -> UI: Upload hình ảnh đơn thuốc
activate UI
UI -> SearchCtrl: POST /products/search-ocr (FormData: Image)
activate SearchCtrl

SearchCtrl -> GeminiOCR: Upload hình, trích xuất text
activate GeminiOCR
GeminiOCR --> SearchCtrl: Return Text (Thành phần, tên)
deactivate GeminiOCR

SearchCtrl -> DB: Query LIKE / Full-text match
activate DB
DB --> SearchCtrl: Mảng danh sách sản phẩm khớp
deactivate DB

SearchCtrl --> UI: Trả JSON products array
deactivate SearchCtrl
UI --> User: Render danh sách kết quả lên màn hình
deactivate UI
@enduml
```

### 3.4. Thanh toán MoMo
```plantuml
@startuml
hide footbox
actor "Khách hàng" as User
boundary "Giao diện Thanh Toán" as UI
control "OrderController" as OrderCtrl
entity "Order Model (Entity)" as OrderDB
control "MoMo API" as MoMo

User -> UI: Click "Thanh Toán MoMo"
activate UI
UI -> OrderCtrl: POST /payment/momo (Cart Details)
activate OrderCtrl
OrderCtrl -> OrderDB: Tạo Order "Pending"
activate OrderDB
OrderDB --> OrderCtrl: Order ID
deactivate OrderDB

OrderCtrl -> MoMo: Yêu cầu khởi tạo thanh toán (Create Payment)
activate MoMo
MoMo --> OrderCtrl: Respond (payUrl)
deactivate MoMo

OrderCtrl --> UI: Redirect Link
deactivate OrderCtrl

UI -> User: Mở App/Web MoMo
deactivate UI
User -> MoMo: Xác nhận thanh toán & Nhập PIN
activate MoMo
MoMo --> User: Thanh toán thành công (redirect UI)
deactivate MoMo

MoMo -> OrderCtrl: Nhắn IPN Server-to-Server
activate OrderCtrl
OrderCtrl -> OrderDB: Update Order Status = "Paid"
activate OrderDB
OrderDB --> OrderCtrl: Success
deactivate OrderDB
OrderCtrl --> MoMo: HTTP 200 OK (Xác nhận đã nhận IPN)
deactivate OrderCtrl
@enduml
```

### 3.5. Quên mật khẩu
```plantuml
@startuml
hide footbox
actor "Khách hàng" as User
boundary "Quên Mật Khẩu UI" as UI
control "AuthController" as AuthCtrl
entity "OTP Model (Entity)" as OTPModel
entity "User Model (Entity)" as UserDB
control "Dịch vụ Email (SMTP)" as Mailer

User -> UI: Nhập Email và xác nhận
activate UI
UI -> AuthCtrl: POST /auth/forgot-password {email}
activate AuthCtrl
AuthCtrl -> UserDB: checkExists(email)
activate UserDB
UserDB --> AuthCtrl: Tồn tại
deactivate UserDB

AuthCtrl -> OTPModel: Generate OTP & Save
activate OTPModel
OTPModel --> AuthCtrl: OTP Generated
deactivate OTPModel

AuthCtrl -> Mailer: Send Email (OTP content)
activate Mailer
Mailer --> AuthCtrl: Success
deactivate Mailer
AuthCtrl --> UI: Yêu cầu Client nhập OTP
deactivate AuthCtrl
UI --> User: Mở form xác nhận OTP
deactivate UI

User -> UI: Nhập mã OTP + Password mới
activate UI
UI -> AuthCtrl: POST /auth/reset-password {otp, newPass}
activate AuthCtrl

AuthCtrl -> OTPModel: Find OTP record
activate OTPModel
OTPModel --> AuthCtrl: Return record
deactivate OTPModel

alt Hợp lệ
    AuthCtrl -> UserDB: Update hashed Password
    AuthCtrl -> OTPModel: Delete used OTP
    AuthCtrl --> UI: Thành công!
    UI --> User: Chuyển trang đăng nhập
else Quá Hạn/Sai
    AuthCtrl --> UI: Lỗi OTP Invalid
    UI --> User: Hiển thị Alert báo lỗi
end
deactivate AuthCtrl
deactivate UI
@enduml
```

---

## 4. SƠ ĐỒ LỚP (Class Diagram)

*Lưu ý: Đây là sơ đồ lớp Model (Entity) cho toàn bộ hệ thống dự án Project_Pharmacy.*

```mermaid
classDiagram
    class User {
        +ObjectId _id
        +String name
        +String email
        +String password
        +String role
        +String phone
        +String avatar
    }

    class Product {
        +ObjectId _id
        +String name
        +Number price
        +String description
        +Array images
    }

    class Category {
        +ObjectId _id
        +String name
        +String description
    }

    class Cart {
        +ObjectId _id
        +Array items
        +Number totalPrice
    }

    class Order {
        +ObjectId _id
        +Number totalAmount
        +String status
        +String paymentMethod
        +Date createdAt
    }

    class Address {
        +ObjectId _id
        +String street
        +String city
        +String province
        +Boolean isDefault
    }

    class ChatConversation {
        +ObjectId _id
        +String status
        +Date createdAt
    }

    class ChatMessage {
        +ObjectId _id
        +String message
        +String senderType
        +Date timestamp
    }

    class CallHistory {
        +ObjectId _id
        +Date startTime
        +Date endTime
        +String status
    }

    class Consultation {
        +ObjectId _id
        +String symptoms
        +String diagnosis
        +String status
    }

    class DoctorAppointment {
        +ObjectId _id
        +Date appointmentDate
        +String status
        +String notes
    }

    class FamilyMedicine {
        +ObjectId _id
        +String medicineName
        +String dosage
        +String frequency
    }

    class Event {
        +ObjectId _id
        +String title
        +Date startDate
        +Date endDate
        +Number discountPercent
    }

    class OTP {
        +ObjectId _id
        +String otp
        +Date expiresAt
        +Boolean isUsed
    }

    class Authenticity {
        +ObjectId _id
        +String serialNumber
        +Boolean isVerified
    }

    class PartnerRequest {
        +ObjectId _id
        +String companyName
        +String contactInfo
        +String status
    }

    class PrescriptionRequest {
        +ObjectId _id
        +String prescriptionImage
        +String status
        +String notes
    }

    User "1" --> "0..*" Order : places
    User "1" --> "1" Cart : owns
    User "1" --> "0..*" Address : has
    User "1..*" --> "1..*" ChatConversation : participates
    ChatConversation "1" *-- "0..*" ChatMessage : contains
    User "1" --> "0..*" ChatMessage : sends
    User "1" --> "0..*" CallHistory : caller/receiver
    User "1" --> "0..*" Consultation : doctor/patient
    User "1" --> "0..*" DoctorAppointment : doctor/patient
    User "1" --> "0..*" FamilyMedicine : tracks
    User "1" --> "0..*" OTP : requests
    User "1" --> "0..*" Authenticity : verifies
    User "1" --> "0..*" PartnerRequest : submits
    User "1" --> "0..*" PrescriptionRequest : uploads

    Product "0..*" --> "1" Category : belongs to
    Order "1" *-- "1..*" Product : contains
    Cart "1" *-- "0..*" Product : contains
    Authenticity "1" --> "1" Product : authenticates
    Event "1" --> "1..*" Product : applies to
    PrescriptionRequest "1" --> "1..*" Product : prescribed

    ChatConversation "1" --> "1" PrescriptionRequest : relates to
    Order "1" --> "1" Address : ships to
```

---
*Tài liệu được sinh tự động dựa trên mã nguồn Project_Pharmacy*
