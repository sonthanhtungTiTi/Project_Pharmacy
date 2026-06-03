MỤC LỤC

DANH MỤC HÌNH ẢNH
DANH MỤC BẢNG BIỂU
DANH MỤC CÁC THUẬT NGỮ VIẾT TẮT

Chương 1. TỔNG QUAN
1.1. Giới thiệu đề tài
1.1.1. Lý do thực hiện đề tài
1.1.2. Phạm vi đề tài
1.1.3. Mục tiêu đề tài
1.2. Công nghệ sử dụng
1.3. Cấu trúc khóa luận

Chương 2. CƠ SỞ LÝ THUYẾT
2.1. Tổng quan về Trí tuệ nhân tạo và Xác thực sinh trắc học
2.1.1. Ứng dụng AI trong y tế và thương mại điện tử
2.1.2. Công nghệ nhận diện khuôn mặt (Face Recognition)
2.1.3. Công nghệ nhận dạng ký tự quang học (OCR)
2.2. Các nền tảng và công nghệ phát triển Web
2.2.1. Kiến trúc hệ thống và MERN Stack (MongoDB, Express, ReactJS, Node.js)
2.2.2. Giao tiếp thời gian thực (WebSockets / Socket.IO)
2.2.3. Tích hợp cổng thanh toán trực tuyến (MoMo)
2.2.4. Lưu trữ đám mây (Cloudinary)

Chương 3. PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG
3.1. Tổng hợp yêu cầu hệ thống
3.1.1. Bảng tổng hợp thu thập yêu cầu
3.1.2. Quy định nghiệp vụ
3.1.3. Yêu cầu chức năng (Functional Requirement)
3.1.4. Yêu cầu phi chức năng (Non-Functional Requirement)
3.2. Mô hình hóa chức năng hệ thống
3.2.1. Xác định actor và chức năng từng actor
3.2.2. Sơ đồ Use Case hệ thống (Use Case Diagram)
3.2.3. Đặc tả Use Case (Use Case Specification)
3.2.4. Sơ đồ hoạt động (Activity Diagram)
3.2.5. Sơ đồ tuần tự (Sequence Diagram)

Chương 4. PHÂN TÍCH VÀ THIẾT KẾ CƠ SỞ DỮ LIỆU
4.1. Thiết kế cơ sở dữ liệu
4.1.1. Xác định các thực thể
4.1.2. Mô hình mối quan hệ-thực thể (Entity-relationship Diagram)
4.1.3. Mô tả chi tiết các mối quan hệ-thực thể
4.1.4. Xác định các thực thể kết hợp
4.1.5. Mô tả chi tiết các bảng dữ liệu
4.2. Mô hình dữ liệu vật lí (Physical Data Model)

Chương 5. HIỆN THỰC
5.1. Sơ đồ sitemap hệ thống
5.1.1. Sơ đồ sitemap tổng quát
5.1.2. Sơ đồ sitemap từng actor
5.2. Giao diện hệ thống
5.2.1. Giao diện dành cho khách hàng
5.2.2. Giao diện dành cho dược sĩ và nhân viên
5.2.3. Giao diện dành cho quản trị hệ thống (Admin)
5.3. Yêu cầu sử dụng hệ thống

Chương 6. KIỂM THỬ HỆ THỐNG
6.1. Test case Đăng ký tài khoản
6.2. Test case Đăng nhập và Đăng nhập bằng Face ID
6.3. Test case Đăng xuất
6.4. Test case Quên mật khẩu (Xác thực OTP)
6.5. Test case Tìm kiếm sản phẩm
6.6. Test case Tìm kiếm thuốc bằng hình ảnh (OCR)
6.7. Test case Chat tư vấn với AI (Dược sĩ ảo)
6.8. Test case Quản lý giỏ hàng
6.9. Test case Đặt hàng và Thanh toán qua MoMo
6.10. Test case Xem lịch sử đơn hàng
6.11. Test case Quản lý thông tin cá nhân và Hồ sơ sức khỏe
6.12. Test case Quản lý sản phẩm (Admin)
6.13. Test case Quản lý đơn hàng (Admin/Nhân viên)
6.14. Test case Xử lý hội thoại và tư vấn trực tiếp (Dược sĩ)
6.15. Test case Quản lý tài khoản người dùng (Admin)

Chương 7. KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN
7.1. Kết quả đạt được
7.2. Khó khăn và hạn chế
7.3. Hướng phát triển

TÀI LIỆU THAM KHẢO
PHỤ LỤC
NHẬT KÍ LÀM VIỆC

--------------------------------------------------

NỘI DUNG CHI TIẾT

Chương 1. TỔNG QUAN

1.1. Giới thiệu đề tài
1.1.1. Lý do thực hiện đề tài
    Mua sắm y tế trực tuyến đang trở thành xu hướng tất yếu trong kỷ nguyên số. Tuy nhiên, các nhà thuốc truyền thống gặp khó khăn trong việc tư vấn liên tục 24/7 và tự động hóa quy trình nhận diện toa thuốc viết tay hoặc toa giấy của khách hàng. Về mặt bảo mật, việc sử dụng mật khẩu truyền thống dễ bị rò rỉ, tiềm ẩn rủi ro lớn đối với các hệ thống có lưu trữ thông tin sức khỏe và lịch sử mua thuốc. Xuất phát từ nhu cầu cấp thiết đó, đề tài được thực hiện nhằm xây dựng một hệ thống website thương mại điện tử nhà thuốc thông minh. Hệ thống ứng dụng trí tuệ nhân tạo (AI) làm dược sĩ ảo để tư vấn, sử dụng công nghệ nhận dạng ký tự quang học (OCR) để đọc toa thuốc từ hình ảnh, và áp dụng xác thực khuôn mặt (Face ID) để tăng cường bảo mật đăng nhập.

1.1.2. Phạm vi đề tài
    Đối tượng người dùng của hệ thống bao gồm khách hàng, dược sĩ, nhân viên bán hàng và quản trị viên (Admin). Phạm vi chức năng tập trung vào quản lý sản phẩm và đơn hàng, cung cấp chatbot AI để tư vấn, hỗ trợ tìm kiếm thuốc qua hình ảnh bằng OCR, đăng nhập sinh trắc học bằng Face ID, thanh toán trực tuyến qua cổng MoMo và quản lý hồ sơ cá nhân. Về mặt nền tảng, dự án tập trung phát triển trên nền tảng ứng dụng Web bao gồm cả giao diện cho khách hàng và giao diện quản trị, không bao gồm việc phát triển ứng dụng di động độc lập (Mobile native).

1.1.3. Mục tiêu đề tài
    Mục tiêu cốt lõi của đề tài là hoàn thiện một website thương mại điện tử hoạt động mượt mà và thân thiện với người dùng. Đề tài hướng đến việc ứng dụng thành công trí tuệ nhân tạo vào quá trình tư vấn y tế cơ bản và nhận diện hình ảnh toa thuốc. Ngoài ra, một mục tiêu quan trọng khác là nâng cao tính bảo mật của toàn bộ hệ thống thông qua việc triển khai xác thực sinh trắc học và cơ chế khôi phục mật khẩu an toàn bằng mã OTP qua email.

1.2. Công nghệ sử dụng
    Dự án được xây dựng dựa trên ngăn xếp công nghệ MERN Stack. Phía giao diện người dùng (Frontend) sử dụng thư viện ReactJS kết hợp với Tailwind CSS và TypeScript để xây dựng giao diện tương tác. Phía máy chủ (Backend) được phát triển bằng môi trường NodeJS và framework ExpressJS. Cơ sở dữ liệu được quản lý bằng hệ quản trị NoSQL MongoDB. Các tính năng AI và sinh trắc học được tích hợp thông qua thư viện face-api.js với mô hình TinyFaceDetector cho Face ID, API Gemini Vision cho tính năng OCR và mô hình ngôn ngữ lớn (LLM) cho Chatbot. Hệ thống còn sử dụng Socket.IO để đảm bảo giao tiếp thời gian thực, Nodemailer để gửi email OTP và Cloudinary để lưu trữ hình ảnh trên đám mây.

1.3. Cấu trúc khóa luận
    Khóa luận được chia thành bảy chương chính. Chương 1 giới thiệu tổng quan về đề tài, bối cảnh và mục tiêu thực hiện. Chương 2 trình bày cơ sở lý thuyết về các công nghệ được sử dụng như AI, Face ID, OCR và MERN Stack. Chương 3 đi sâu vào phân tích và thiết kế hệ thống bao gồm các yêu cầu chức năng, phi chức năng và mô hình hóa. Chương 4 tập trung vào thiết kế cơ sở dữ liệu và mô hình thực thể. Chương 5 mô tả quá trình hiện thực hóa hệ thống, bao gồm giao diện và sơ đồ luồng. Chương 6 trình bày các kịch bản kiểm thử hệ thống. Chương 7 đưa ra kết luận và định hướng phát triển trong tương lai.

Chương 2. CƠ SỞ LÝ THUYẾT

2.1. Tổng quan về Trí tuệ nhân tạo và Xác thực sinh trắc học
2.1.1. Ứng dụng AI trong y tế và thương mại điện tử
    Trí tuệ nhân tạo, đặc biệt là các Mô hình ngôn ngữ lớn (LLM), đang đóng vai trò quan trọng trong việc tự động hóa và nâng cao chất lượng dịch vụ. Khả năng phân tích ngôn ngữ tự nhiên giúp AI có thể đóng vai trò như một trợ lý ảo, tự động hóa việc chăm sóc khách hàng và đưa ra các tư vấn thông tin thuốc cơ bản một cách chính xác, liên tục 24/7.

2.1.2. Công nghệ nhận diện khuôn mặt (Face Recognition)
    Nhận diện khuôn mặt dựa trên việc trích xuất đặc trưng (Face Descriptors) từ hình ảnh khuôn mặt người dùng thành các vector dữ liệu số. Điểm mấu chốt của công nghệ này trong dự án là việc kiểm tra tính thực thể (Liveness Check) bằng cách đo khoảng cách Euclidean giữa các góc mặt khác nhau, nhằm chống lại các cuộc tấn công giả mạo bằng hình ảnh tĩnh. Sau đó, hệ thống thực hiện cơ chế đối chiếu một nhiều (1:N) để xác định danh tính người dùng từ cơ sở dữ liệu.

2.1.3. Công nghệ nhận dạng ký tự quang học (OCR)
    OCR là công nghệ cho phép chuyển đổi văn bản trong hình ảnh thành định dạng văn bản có thể chỉnh sửa và tìm kiếm được bằng máy tính. Bằng cách sử dụng API Gemini Vision, hệ thống có khả năng nhận diện các dòng chữ như tên thuốc và hoạt chất từ hình ảnh toa thuốc do người dùng cung cấp, kể cả khi hình ảnh bị mờ hoặc có nhiễu, từ đó hỗ trợ tra cứu sản phẩm tự động.

2.2. Các nền tảng và công nghệ phát triển Web
2.2.1. Kiến trúc hệ thống và MERN Stack
    MERN Stack bao gồm MongoDB, Express, React và Node, cung cấp một kiến trúc liền mạch từ đầu đến cuối chỉ sử dụng một ngôn ngữ duy nhất là JavaScript. Sự kết hợp này mang lại ưu điểm vượt trội về hiệu suất, khả năng xử lý dữ liệu JSON linh hoạt và tính đồng bộ cao trong quá trình phát triển hệ thống quản lý dữ liệu lớn.

2.2.2. Giao tiếp thời gian thực (WebSockets / Socket.IO)
    Khác với giao thức HTTP truyền thống yêu cầu client phải liên tục gửi yêu cầu đến server, WebSockets tạo ra một kết nối hai chiều liên tục. Socket.IO được ứng dụng để xây dựng hệ thống Chat, giúp tin nhắn giữa khách hàng và dược sĩ hoặc trợ lý ảo được truyền tải và hiển thị ngay lập tức mà không cần làm mới trang.

2.2.3. Tích hợp cổng thanh toán trực tuyến (MoMo)
    Quá trình thanh toán trực tuyến đòi hỏi tính bảo mật tuyệt đối. Việc tích hợp MoMo sử dụng nguyên lý mã hóa chữ ký điện tử HMAC-SHA256 để đảm bảo tính toàn vẹn của gói tin giao dịch. Cơ chế IPN (Instant Payment Notification) Webhook được thiết lập để server nhận thông báo tức thời từ MoMo, giúp tự động cập nhật trạng thái đơn hàng ngay khi khách hàng hoàn tất thanh toán.

2.2.4. Lưu trữ đám mây (Cloudinary)
    Quản lý hình ảnh sản phẩm và ảnh chụp toa thuốc đòi hỏi dung lượng lớn và băng thông cao. Sử dụng nền tảng Cloudinary giúp quản lý ảnh tĩnh trên đám mây (CDN), tối ưu hóa việc phân phối nội dung, tăng tốc độ tải trang và giảm đáng kể tải trọng cho máy chủ backend nội bộ.

Chương 3. PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG

3.1. Tổng hợp yêu cầu hệ thống
3.1.1. Bảng tổng hợp thu thập yêu cầu
    Quá trình thu thập yêu cầu được tiến hành kỹ lưỡng và tổng hợp thành các nhóm chức năng chính. Nhóm quản lý tài khoản bao gồm các thao tác đăng ký, đăng nhập và khôi phục mật khẩu. Nhóm mua sắm và thanh toán định nghĩa các thao tác xem sản phẩm, quản lý giỏ hàng và thanh toán trực tuyến. Nhóm trợ lý ảo liên quan đến các tính năng trò chuyện và nhận diện hình ảnh. Nhóm quản trị tập trung vào việc quản lý sản phẩm, đơn hàng và người dùng của quản trị viên.

3.1.2. Quy định nghiệp vụ
    Hệ thống tuân thủ các quy định nghiệp vụ nghiêm ngặt để đảm bảo tính an toàn và tính chuyên môn. Đối với thuốc kê đơn, đơn hàng bắt buộc phải có toa thuốc đính kèm và phải được dược sĩ xét duyệt trước khi giao. Yêu cầu bảo mật cho mã OTP quy định thời gian hiệu lực tối đa là 10 phút. Thuật toán Liveness Check khi đăng nhập bằng Face ID phải thỏa mãn điều kiện khoảng cách Euclidean tối thiểu lớn hơn hoặc bằng 0.18 và tối đa nhỏ hơn hoặc bằng 0.55 để xác định khuôn mặt thật.

3.1.3. Yêu cầu chức năng (Functional Requirement)
    Yêu cầu chức năng của hệ thống được phân chia chi tiết theo từng đối tượng sử dụng. Khách hàng có khả năng quản lý hồ sơ cá nhân, tìm kiếm sản phẩm bằng văn bản hoặc hình ảnh OCR, mua hàng, thanh toán qua MoMo và trò chuyện với trợ lý ảo. Dược sĩ tiếp quản các phiên trò chuyện cần sự hỗ trợ của con người và kiểm duyệt các đơn thuốc. Nhân viên kho thực hiện việc đóng gói và cập nhật tình trạng giao hàng. Quản trị viên có toàn quyền kiểm soát danh mục, sản phẩm, doanh thu và cấp quyền truy cập cho các nhân sự khác.

3.1.4. Yêu cầu phi chức năng (Non-Functional Requirement)
    Hệ thống phải đảm bảo thời gian phản hồi API trung bình dưới 500ms và thời gian xử lý các tác vụ AI không vượt quá 7 giây để đảm bảo hiệu năng. Về mặt bảo mật, mọi mật khẩu phải được mã hóa bằng Bcrypt, các phiên làm việc được bảo vệ bằng JWT và chữ ký giao dịch thanh toán được xác thực chặt chẽ. Giao diện hệ thống phải đảm bảo tính khả dụng cao, tương thích với nhiều kích thước màn hình (Responsive) và tuân thủ các chuẩn trải nghiệm người dùng hiện đại. Cơ sở dữ liệu MongoDB cần được thiết kế với các chỉ mục hợp lý để duy trì tốc độ truy xuất khi dữ liệu hệ thống mở rộng.

3.2. Mô hình hóa chức năng hệ thống
3.2.1. Xác định actor và chức năng từng actor
    Hệ thống bao gồm bốn tác nhân chính. Khách hàng là người dùng cuối thực hiện các giao dịch mua sắm và nhận tư vấn. Dược sĩ là nhân sự chuyên môn phụ trách kiểm duyệt đơn thuốc và hỗ trợ y tế chuyên sâu. Nhân viên chịu trách nhiệm xử lý luân chuyển hàng hóa. Quản trị viên là người điều hành, giám sát hoạt động và quản lý toàn bộ cơ sở dữ liệu của hệ thống.

3.2.2. Sơ đồ Use Case hệ thống (Use Case Diagram)
    (Khu vực này dành để chèn sơ đồ Use Case tổng quát của toàn bộ hệ thống).

3.2.3. Đặc tả Use Case (Use Case Specification)
    Phần này mô tả chi tiết kịch bản tương tác của các Use Case cốt lõi. Đặc tả bao gồm tên chức năng, tác nhân, tiền điều kiện, luồng sự kiện chính và các luồng sự kiện thay thế hoặc ngoại lệ đối với các tính năng như Đăng nhập Face ID, Chat với AI, Tìm kiếm bằng hình ảnh (OCR), Thanh toán MoMo và Quên mật khẩu.

3.2.4. Sơ đồ hoạt động (Activity Diagram)
    (Khu vực này dành để chèn các sơ đồ Activity Diagram thể hiện luồng xử lý của từng chức năng).

3.2.5. Sơ đồ tuần tự (Sequence Diagram)
    (Khu vực này dành để chèn các sơ đồ Sequence Diagram mô phỏng quá trình trao đổi thông điệp giữa giao diện, controller, service và cơ sở dữ liệu).

Chương 4. PHÂN TÍCH VÀ THIẾT KẾ CƠ SỞ DỮ LIỆU

4.1. Thiết kế cơ sở dữ liệu
4.1.1. Xác định các thực thể
    Hệ thống được cấu thành từ các thực thể dữ liệu cơ bản bao gồm người dùng (User), sản phẩm (Product), danh mục (Category), đơn đặt hàng (Order), giỏ hàng (Cart), phiên hội thoại (ChatConversation), tin nhắn (ChatMessage) và mã xác thực (OTP).

4.1.2. Mô hình mối quan hệ-thực thể (Entity-relationship Diagram)
    (Khu vực này dành để chèn hình ảnh sơ đồ ERD hoặc Class Diagram biểu diễn mối liên kết logic).

4.1.3. Mô tả chi tiết các mối quan hệ-thực thể
    Mối quan hệ giữa các thực thể được xác định rõ ràng, ví dụ như một người dùng có thể tạo nhiều đơn hàng, hoặc một phiên hội thoại chứa nhiều tin nhắn lịch sử. Một sản phẩm có thể thuộc một danh mục cụ thể và xuất hiện trong nhiều đơn hàng khác nhau.

4.1.4. Xác định các thực thể kết hợp
    (Phân tích các bảng trung gian nếu có để giải quyết các mối quan hệ nhiều-nhiều trong cơ sở dữ liệu).

4.1.5. Mô tả chi tiết các bảng dữ liệu
    Cấu trúc của từng bảng dữ liệu được định nghĩa chi tiết bao gồm tên trường, kiểu dữ liệu, ràng buộc khóa chính và khóa ngoại. Ví dụ, bảng người dùng sẽ lưu trữ trường đặc trưng khuôn mặt dưới định dạng mảng số thực để phục vụ quá trình nhận diện sinh trắc học.

4.2. Mô hình dữ liệu vật lí (Physical Data Model)
    Mô hình dữ liệu vật lí mô tả phương pháp lưu trữ dữ liệu thực tế trên MongoDB. Dữ liệu được tổ chức thành các Collections với định dạng tài liệu BSON, sử dụng các khóa liên kết dạng ObjectId và áp dụng các cơ chế nâng cao như đánh chỉ mục thời gian sống (TTL) để tự động dọn dẹp các mã OTP đã hết hạn.

Chương 5. HIỆN THỰC

5.1. Sơ đồ sitemap hệ thống
5.1.1. Sơ đồ sitemap tổng quát
    Sơ đồ sitemap tổng quát mô tả kiến trúc phân nhánh của toàn bộ ứng dụng web. Cấu trúc được chia làm hai hệ thống chính hoạt động độc lập nhưng dùng chung một cơ sở dữ liệu. Nhánh thứ nhất là Frontend Client dành riêng cho người dùng phổ thông, bao gồm các cụm tính năng về tìm kiếm, mua sắm, tiện ích y tế và quản lý hồ sơ cá nhân. Nhánh thứ hai là Frontend Admin dành cho ban quản trị và đội ngũ y tế, tập trung vào bảng điều khiển thống kê, quản lý đơn hàng, kho hàng và hệ thống hỗ trợ trực tiếp.

5.1.2. Sơ đồ sitemap từng actor
    Đối với người dùng khách hàng, sitemap bắt đầu từ trang chủ và rẽ nhánh vào hai luồng chính là mua sắm và tiện ích y tế. Luồng mua sắm dẫn dắt người dùng qua trang danh mục, chi tiết sản phẩm, giỏ hàng, và kết thúc tại cổng thanh toán trực tuyến. Luồng tiện ích y tế cho phép truy cập vào các tính năng đặc thù như mua thuốc qua tư vấn, chat với dược sĩ ảo, đặt lịch khám và tra cứu nguồn gốc thuốc. Người dùng cũng có một không gian riêng để cấu hình bảo mật Face ID và theo dõi tình trạng đơn hàng. Đối với tác nhân Admin và dược sĩ, sitemap được phân quyền chặt chẽ ngay từ bước đăng nhập. Giao diện được cấu trúc xoay quanh một bảng điều khiển trung tâm (Dashboard). Từ đây, quản trị viên có thể truy cập vào các trang danh sách để quản lý người dùng, sản phẩm và kho hàng, đồng thời xem các báo cáo doanh thu chi tiết. Dược sĩ được cấp quyền truy cập riêng vào phân hệ hỗ trợ y tế để trực tiếp quản lý các phiên chat với khách hàng và phê duyệt các đơn thuốc được yêu cầu.

5.2. Giao diện hệ thống
5.2.1. Giao diện dành cho khách hàng
    Giao diện khách hàng được thiết kế theo hướng thân thiện và dễ điều hướng. Các trang chính bao gồm màn hình trang chủ trưng bày sản phẩm, trang chi tiết sản phẩm, cửa sổ tương tác Chat AI, giao diện quét khuôn mặt Face ID và các bước thanh toán đơn hàng.

5.2.2. Giao diện dành cho dược sĩ và nhân viên
    Giao diện này tối ưu cho việc xử lý nghiệp vụ, nổi bật với hệ thống bảng điều khiển hiển thị các khung chat đang chờ hỗ trợ trực tiếp và giao diện xác nhận trạng thái các đơn đặt hàng mới.

5.2.3. Giao diện dành cho quản trị hệ thống (Admin)
    Màn hình quản trị cung cấp góc nhìn tổng quan thông qua các Dashboard thống kê doanh thu bằng biểu đồ, cùng với các trang danh sách để thực hiện thao tác kiểm soát người dùng và sản phẩm.

5.3. Yêu cầu sử dụng hệ thống
    Để hệ thống hoạt động tối ưu, người dùng cần truy cập thông qua các trình duyệt web hiện đại như Google Chrome, Safari hoặc Microsoft Edge với kết nối internet ổn định. Đặc biệt, để sử dụng chức năng đăng nhập Face ID, thiết bị của người dùng bắt buộc phải được trang bị camera hoặc webcam đang hoạt động.

Chương 6. KIỂM THỬ HỆ THỐNG
    (Phần này liệt kê và mô tả chi tiết các Test Case cho từng chức năng của hệ thống. Mỗi Test Case bao gồm mục đích, các bước thực hiện, dữ liệu đầu vào, kết quả mong đợi và đánh giá tình trạng Pass/Fail thực tế).

6.1. Test case Đăng ký tài khoản
6.2. Test case Đăng nhập và Đăng nhập bằng Face ID
6.3. Test case Đăng xuất
6.4. Test case Quên mật khẩu (Xác thực OTP)
6.5. Test case Tìm kiếm sản phẩm
6.6. Test case Tìm kiếm thuốc bằng hình ảnh (OCR)
6.7. Test case Chat tư vấn với AI (Dược sĩ ảo)
6.8. Test case Quản lý giỏ hàng
6.9. Test case Đặt hàng và Thanh toán qua MoMo
6.10. Test case Xem lịch sử đơn hàng
6.11. Test case Quản lý thông tin cá nhân và Hồ sơ sức khỏe
6.12. Test case Quản lý sản phẩm (Admin)
6.13. Test case Quản lý đơn hàng (Admin/Nhân viên)
6.14. Test case Xử lý hội thoại và tư vấn trực tiếp (Dược sĩ)
6.15. Test case Quản lý tài khoản người dùng (Admin)

Chương 7. KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN

7.1. Kết quả đạt được
    Đề tài đã hoàn thành việc xây dựng một hệ thống website thương mại điện tử nhà thuốc thông minh hoạt động ổn định. Dự án đã ứng dụng thành công các công nghệ tiên tiến như nhận diện khuôn mặt sinh trắc học và trí tuệ nhân tạo để tự động hóa quy trình tư vấn, mang lại trải nghiệm tiện lợi, an toàn và hỗ trợ liên tục mọi lúc cho người dùng.

7.2. Khó khăn và hạn chế
    Trong quá trình triển khai, hệ thống vẫn còn một số giới hạn nhất định. Quá trình trích xuất đặc trưng khuôn mặt của Face ID có thể bị giảm độ chính xác nếu chất lượng camera kém hoặc người dùng đứng trong môi trường ánh sáng quá phức tạp. Tính năng OCR đôi khi chưa thể nhận diện chính xác tên thuốc nếu toa thuốc là chữ viết tay quá khó đọc hoặc hình ảnh cung cấp bị mờ.

7.3. Hướng phát triển
    Trong tương lai, hệ thống sẽ tiếp tục được nâng cấp thông qua việc huấn luyện mô hình AI để dự đoán bệnh lý chuyên sâu hơn dựa trên các triệu chứng phức tạp. Dự án cũng định hướng tích hợp tính năng Telemedicine để khách hàng có thể gọi video trực tiếp với bác sĩ hoặc dược sĩ, đồng thời mở rộng hỗ trợ thêm nhiều cổng thanh toán phổ biến khác như VNPay hay ZaloPay.

TÀI LIỆU THAM KHẢO
PHỤ LỤC
NHẬT KÍ LÀM VIỆC
