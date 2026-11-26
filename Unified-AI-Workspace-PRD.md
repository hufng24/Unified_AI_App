# UNIFIED AI WORKSPACE
## PRODUCT REQUIREMENTS & TECHNICAL DESIGN DOCUMENT

**Tên sản phẩm:** Unified AI Workspace  
**Tên viết tắt:** UAI Workspace  
**Định vị:** All AI Models. One Workspace. One Memory.  
**Phiên bản tài liệu:** 1.0  
**Trạng thái:** Product Specification – Initial Development  
**Nền tảng:** macOS và Windows  
**Loại sản phẩm:** Desktop Application – Commercial Product  
**Kiến trúc lưu trữ:** Hybrid Local + Cloud  

---

# 1. TỔNG QUAN SẢN PHẨM

## 1.1. Giới thiệu

Unified AI Workspace là một ứng dụng Desktop tập trung, cho phép người dùng làm việc với nhiều nền tảng trí tuệ nhân tạo trong cùng một không gian.

Thay vì phải mở và quản lý nhiều ứng dụng riêng biệt như ChatGPT, Claude và Gemini, người dùng có thể kết nối các dịch vụ AI vào một ứng dụng duy nhất.

Điểm quan trọng nhất của sản phẩm không chỉ là tích hợp nhiều AI, mà là xây dựng một hệ thống dữ liệu và bộ nhớ dùng chung.

Người dùng có thể:
- Sử dụng nhiều AI trong cùng một ứng dụng.
- Chuyển đổi giữa các AI mà không phải bắt đầu lại cuộc trò chuyện.
- Lưu trữ toàn bộ lịch sử hội thoại.
- Xây dựng bộ nhớ cá nhân và bộ nhớ theo dự án.
- Đưa tài liệu, file và dữ liệu cá nhân vào hệ thống kiến thức.
- Tìm kiếm lại thông tin từ các cuộc trò chuyện cũ.
- Đồng bộ dữ liệu giữa nhiều thiết bị.
- Tiếp tục làm việc ngay cả khi mất kết nối Internet đối với dữ liệu đã lưu cục bộ.

## 1.2. Vấn đề cần giải quyết

Người dùng AI hiện nay thường gặp các vấn đề:

**Phân mảnh nền tảng**
- ChatGPT có lịch sử riêng.
- Claude có lịch sử riêng.
- Gemini có lịch sử riêng.
- Người dùng phải chuyển qua lại giữa nhiều ứng dụng.

**Mất ngữ cảnh**
- Mỗi nền tảng không tự động hiểu những gì người dùng đã làm ở nền tảng khác.
- Người dùng phải giải thích lại yêu cầu, sở thích và thông tin dự án.
- Khi chuyển AI, cuộc trò chuyện thường không giữ được đầy đủ ngữ cảnh.

**Dữ liệu khó quản lý**
- Lịch sử hội thoại phân tán.
- Tài liệu nằm ở nhiều nơi.
- Khó tìm lại câu trả lời cũ.
- Không có hệ thống kiến thức thống nhất.

**Phụ thuộc nền tảng**
- Người dùng khó chuyển đổi giữa các nhà cung cấp.
- Mỗi nền tảng có cách lưu trữ và quản lý dữ liệu khác nhau.

## 1.3. Giải pháp

Unified AI Workspace tạo ra một lớp quản lý trung tâm nằm giữa người dùng và các nhà cung cấp AI.

Ứng dụng quản lý:
1. Người dùng.
2. Các kết nối AI.
3. Hội thoại.
4. Lịch sử.
5. Bộ nhớ.
6. Dự án.
7. Tài liệu.
8. Kiến thức.
9. Đồng bộ dữ liệu.
10. Quyền riêng tư và bảo mật.

Các AI chỉ đóng vai trò là những nhà cung cấp mô hình xử lý. Dữ liệu và bộ nhớ thuộc về Workspace của người dùng.

## 1.4. Nguyên tắc cốt lõi

- Một tài khoản – nhiều nhà cung cấp AI.
- Một cuộc trò chuyện – có thể sử dụng nhiều AI.
- Một hệ thống bộ nhớ – dùng chung giữa các AI.
- Một kho dữ liệu – quản lý tập trung.
- Local-first – ưu tiên lưu dữ liệu trên thiết bị.
- Cloud-sync – đồng bộ dữ liệu giữa các thiết bị.
- Provider-independent – hạn chế phụ thuộc vào một nhà cung cấp.

---

# 2. ĐỐI TƯỢNG NGƯỜI DÙNG

## 2.1. Người dùng cá nhân

Nhu cầu:
- Sử dụng nhiều AI.
- Lưu trữ hội thoại.
- Quản lý thông tin cá nhân.
- Tìm kiếm lịch sử.
- Đồng bộ giữa máy tính và thiết bị khác trong tương lai.

## 2.2. Người làm việc chuyên môn

Ví dụ:
- Designer.
- Developer.
- Content Creator.
- Marketer.
- Researcher.
- Business Analyst.

Nhu cầu:
- Tạo nhiều dự án.
- Lưu tài liệu.
- Duy trì ngữ cảnh làm việc.
- Tìm kiếm kiến thức.
- Sử dụng AI phù hợp với từng nhiệm vụ.

## 2.3. Người dùng chuyên sâu

Nhu cầu:
- So sánh kết quả từ nhiều AI.
- Chuyển đổi mô hình linh hoạt.
- Sử dụng API Key cá nhân.
- Quản lý mức sử dụng.
- Kiểm soát dữ liệu và bộ nhớ.

## 2.4. Quản trị viên hệ thống

Nhu cầu:
- Quản lý tài khoản.
- Quản lý gói dịch vụ.
- Theo dõi tình trạng hệ thống.
- Quản lý giới hạn sử dụng.
- Xử lý báo cáo và sự cố.

---

# 3. PHẠM VI SẢN PHẨM

## 3.1. Nền tảng hỗ trợ

| Nền tảng | Hỗ trợ |
|---|---|
| macOS Apple Silicon | Có |
| macOS Intel | Theo khả năng tương thích và build |
| Windows 10 | Mục tiêu hỗ trợ, cần kiểm thử phiên bản cụ thể |
| Windows 11 | Có |
| Linux | Chưa thuộc MVP |
| Mobile | Định hướng tương lai |

Ứng dụng được phát triển như Desktop App thực thụ, không phải chỉ đóng gói một trang web trong cửa sổ ứng dụng.

## 3.2. AI Providers

| Provider | Chức năng |
|---|---|
| OpenAI | Chat, xử lý văn bản, hình ảnh và các khả năng API được hỗ trợ |
| Anthropic Claude | Chat, phân tích và xử lý tài liệu theo khả năng API |
| Google Gemini | Chat, đa phương thức và các khả năng API được hỗ trợ |

Hệ thống phải được thiết kế để có thể bổ sung nhà cung cấp AI mới mà không phải viết lại toàn bộ ứng dụng.

## 3.3. Phương thức kết nối

**Giai đoạn MVP:**
- Người dùng nhập API Key của từng nhà cung cấp.
- Kiểm tra API Key.
- Lưu thông tin kết nối an toàn.
- Chọn model để sử dụng.

**Giai đoạn mở rộng:**
- Hỗ trợ OAuth hoặc các phương thức ủy quyền chính thức nếu nhà cung cấp cho phép.
- Quản lý nhiều kết nối của cùng một nhà cung cấp.
- Quản lý kết nối cá nhân và kết nối tổ chức.

Lưu ý: Đăng nhập Google vào Unified AI Workspace không đồng nghĩa với việc đã có quyền sử dụng API Gemini. Tương tự, gói ChatGPT Plus hoặc Claude Pro không tự động cấp quyền API. Không sử dụng cookie hay cơ chế giả lập phiên đăng nhập dịch vụ tiêu dùng để thay thế API chính thức.

---

# 4. KIẾN TRÚC GIAO DIỆN

## 4.1. Định hướng thiết kế

Phong cách: Premium – Midnight Intelligence.

Mục tiêu:
- Hiện đại.
- Chuyên nghiệp.
- Tối giản.
- Có chiều sâu.
- Không gây rối mắt khi làm việc lâu.
- Tập trung vào nội dung hội thoại.

### Bảng màu đề xuất

| Thành phần | Màu |
|---|---|
| Main Background | #0B1020 |
| Secondary Background | #111A2E |
| Sidebar | #0D1425 |
| Primary Blue | #3478F6 |
| Accent Blue | #54A5FF |
| Primary Text | #F4F7FF |
| Secondary Text | #A0AEC0 |
| Border | #26334A |
| Success | #22C58B |
| Warning | #F5B942 |
| Error | #F06464 |

Màu sắc có thể được tinh chỉnh trong giai đoạn thiết kế UI.

## 4.2. Bố cục chính

Ứng dụng sử dụng giao diện ba khu vực:

**Sidebar trái**
- Logo và tên ứng dụng.
- New Chat.
- Search.
- Conversations.
- Projects.
- Knowledge Base.
- Memory.
- AI Connections.
- Settings.
- User Profile.

**Khu vực trung tâm**
- Nội dung hội thoại.
- Tin nhắn người dùng.
- Tin nhắn AI.
- Trình soạn thảo.
- File đính kèm.
- Thanh chọn AI và Model.

**Panel bên phải**
- Project Context.
- Memory Context.
- Tài liệu liên quan.
- Thông tin AI đang sử dụng.
- Thông tin model.
- Các nguồn ngữ cảnh được đưa vào yêu cầu hiện tại.

Panel bên phải có thể đóng/mở để tối ưu không gian.

## 4.3. Các màn hình chính

### A. Welcome / Onboarding

Chức năng:
- Giới thiệu sản phẩm.
- Đăng nhập Google.
- Tạo tài khoản.
- Giải thích cơ chế lưu trữ Local + Cloud.
- Hướng dẫn kết nối AI đầu tiên.

### B. Main Workspace

Chức năng:
- Tạo hội thoại.
- Xem lịch sử.
- Chọn AI.
- Chọn model.
- Gửi tin nhắn.
- Nhận phản hồi streaming.
- Chuyển AI.
- Truy cập Memory và Project Context.

### C. AI Connections

Hiển thị danh sách các nhà cung cấp:
- OpenAI.
- Anthropic.
- Google.

Mỗi provider có:
- Logo.
- Trạng thái kết nối.
- Tên kết nối.
- API Key status.
- Nút Add Connection.
- Nút Test Connection.
- Nút Edit.
- Nút Disconnect.

Không hiển thị API Key đầy đủ sau khi lưu.

### D. Projects

Quản lý công việc theo dự án.

Ví dụ:
- Website Development.
- Brand Identity.
- Marketing Campaign.
- Research.
- Personal Assistant.

Mỗi dự án có:
- Tên.
- Mô tả.
- Instructions.
- Conversations.
- Documents.
- Project Memory.
- Tài liệu tham khảo.
- Ngày tạo và cập nhật.

### E. Memory Center

Đây là một trong những chức năng quan trọng nhất của ứng dụng.

Cho phép người dùng:
- Xem bộ nhớ đã lưu.
- Tìm kiếm bộ nhớ.
- Chỉnh sửa bộ nhớ.
- Xóa bộ nhớ.
- Phân loại bộ nhớ.
- Quản lý bộ nhớ theo dự án.
- Xem nguồn tạo ra bộ nhớ.
- Kiểm tra lần cập nhật gần nhất.

### F. Knowledge Base

Quản lý tài liệu và kiến thức.

Hỗ trợ định hướng:
- PDF.
- DOCX.
- TXT.
- Markdown.
- CSV.
- Hình ảnh.
- Các định dạng khác được bổ sung sau.

Chức năng:
- Upload.
- Preview.
- Phân loại.
- Tìm kiếm.
- Trích xuất nội dung.
- Chia tài liệu thành các đoạn.
- Tạo embeddings.
- Tìm kiếm ngữ nghĩa.

### G. Settings

Các nhóm:
- General.
- Account.
- AI Providers.
- Models.
- Memory.
- Storage.
- Sync.
- Privacy.
- Security.
- Appearance.
- Notifications.
- About.

---

# 5. ĐẶC TẢ CHỨC NĂNG

## 5.1. Authentication – Đăng nhập

Mục tiêu: Quản lý danh tính người dùng trên toàn hệ thống.

Chức năng:
- Đăng nhập Google.
- Đăng xuất.
- Refresh session.
- Quản lý profile.
- Quản lý thiết bị.
- Quản lý phiên đăng nhập.
- Khôi phục phiên làm việc.

Luồng đăng nhập:

1. Người dùng mở ứng dụng.
2. Chọn Continue with Google.
3. Ứng dụng mở trình duyệt hệ thống.
4. Người dùng xác thực Google.
5. Hệ thống nhận callback.
6. Ứng dụng hoàn tất phiên đăng nhập.
7. Tải profile và workspace.
8. Đồng bộ dữ liệu cần thiết.

Thiết kế OAuth cần sử dụng Authorization Code + PKCE và cơ chế callback an toàn.

## 5.2. AI Provider Manager

Mục tiêu: Quản lý toàn bộ kết nối AI.

Chức năng:
- Thêm provider.
- Thêm API Key.
- Kiểm tra API Key.
- Lấy danh sách model được hỗ trợ.
- Chọn model mặc định.
- Chỉnh sửa kết nối.
- Ngắt kết nối.
- Xóa thông tin xác thực.
- Theo dõi lỗi.
- Theo dõi mức sử dụng nếu provider cung cấp dữ liệu.

Mỗi kết nối có các thuộc tính:
- Connection ID.
- User ID.
- Provider.
- Connection Name.
- Credential Reference.
- Status.
- Created At.
- Last Tested At.

API Key không được lưu dạng văn bản thuần trong cơ sở dữ liệu thông thường.

## 5.3. Unified Chat

Đây là chức năng trung tâm của sản phẩm.

### Các chức năng

- Tạo cuộc trò chuyện.
- Gửi tin nhắn.
- Nhận phản hồi.
- Streaming.
- Dừng phản hồi.
- Regenerate.
- Copy.
- Edit Prompt.
- Xóa tin nhắn.
- Đính kèm file.
- Chọn AI.
- Chọn Model.
- Xem thông tin model.
- Xem lịch sử.
- Tìm kiếm hội thoại.

### Quy tắc quan trọng

Một conversation không bị khóa vào một provider.

Ví dụ:

Conversation: Website Development

| Tin nhắn | Provider | Model |
|---|---|---|
| User | — | — |
| Assistant | OpenAI | Model A |
| User | — | — |
| Assistant | Claude | Model B |
| User | — | — |
| Assistant | Gemini | Model C |

Tất cả vẫn nằm trong cùng một cuộc trò chuyện.

Mỗi message phải lưu provider và model đã tạo ra phản hồi.

### Luồng xử lý tin nhắn

1. Người dùng nhập nội dung.
2. Ứng dụng lưu tin nhắn vào SQLite.
3. Context Builder lấy lịch sử cần thiết.
4. Memory Engine tìm kiếm bộ nhớ liên quan.
5. Project Engine lấy instructions và tài liệu liên quan.
6. AI Gateway xác định provider và model.
7. Provider Adapter chuyển đổi định dạng dữ liệu.
8. Gửi yêu cầu đến API.
9. Nhận kết quả streaming.
10. Hiển thị nội dung trên giao diện.
11. Lưu kết quả vào SQLite.
12. Đưa dữ liệu vào hàng đợi đồng bộ Cloud.

## 5.4. AI Handover – Chuyển đổi AI

Đây là chức năng tạo sự khác biệt cho sản phẩm.

Ví dụ:

Người dùng bắt đầu cuộc trò chuyện với OpenAI.

Sau đó muốn chuyển sang Claude.

Ứng dụng phải:
- Lấy lịch sử hội thoại.
- Lấy system instructions.
- Lấy bộ nhớ liên quan.
- Lấy thông tin dự án.
- Lấy tài liệu cần thiết.
- Xây dựng lại context theo định dạng Claude.
- Gửi yêu cầu đến Claude.

Khi chuyển tiếp sang Gemini, hệ thống tiếp tục làm tương tự.

### Yêu cầu kỹ thuật

Không gửi nguyên văn toàn bộ lịch sử một cách máy móc.

Context Builder phải:
- Kiểm tra giới hạn context của model.
- Ưu tiên các tin nhắn gần nhất.
- Giữ lại các thông tin quan trọng.
- Bổ sung conversation summary.
- Bổ sung memory liên quan.
- Bổ sung project instructions.
- Kiểm soát token và chi phí.

### Lưu ý

Không phải mọi khả năng giữa các provider đều tương đương. Ví dụ: tool calls, hình ảnh, tệp đính kèm, cấu trúc nội dung và trạng thái phản hồi có thể khác nhau.

Vì vậy, cần có lớp chuẩn hóa dữ liệu chung nhưng vẫn lưu được thông tin đặc thù của từng provider.

## 5.5. Central Memory System

Đây là lõi quan trọng nhất của Unified AI Workspace.

Mục tiêu: Xây dựng một hệ thống bộ nhớ độc lập với các nhà cung cấp AI.

### Các loại Memory

**User Memory**

Lưu thông tin người dùng có giá trị lâu dài:
- Sở thích.
- Phong cách làm việc.
- Quy tắc cá nhân.
- Các thông tin người dùng cho phép lưu.

**Project Memory**

Lưu thông tin theo từng dự án:
- Mục tiêu.
- Quyết định.
- Công nghệ.
- Quy chuẩn.
- Yêu cầu.
- Tiến độ.
- Các vấn đề đang xử lý.

**Conversation Memory**

Lưu:
- Tóm tắt cuộc trò chuyện.
- Các kết luận quan trọng.
- Những việc đã thực hiện.
- Những việc còn dang dở.

**Knowledge Memory**

Lưu:
- Tài liệu.
- Nội dung trích xuất.
- Các đoạn kiến thức.
- Embeddings.
- Nguồn tham chiếu.

### Memory Pipeline

1. Conversation được cập nhật.
2. Memory Processor phân tích nội dung.
3. Trích xuất thông tin có giá trị.
4. Kiểm tra thông tin trùng lặp.
5. Phân loại loại Memory.
6. Kiểm tra quyền lưu và phạm vi dữ liệu.
7. Lưu phiên bản mới.
8. Tạo embeddings nếu cần.
9. Đồng bộ lên Cloud theo chính sách của người dùng.

Không được mặc định lưu mọi nội dung trò chuyện thành User Memory. Hệ thống phải tránh lưu dữ liệu nhạy cảm hoặc thông tin không cần thiết.

### Memory Retrieval

Khi người dùng gửi câu hỏi:

1. Phân tích nội dung yêu cầu.
2. Xác định Project hiện tại.
3. Tìm User Memory liên quan.
4. Tìm Project Memory liên quan.
5. Tìm Conversation Summary.
6. Tìm tài liệu liên quan.
7. Xếp hạng mức độ phù hợp.
8. Chọn dữ liệu trong giới hạn context.
9. Đưa vào Context Builder.

### Memory Control

Người dùng phải có quyền:
- Xem.
- Sửa.
- Xóa.
- Xuất.
- Tạm dừng tạo Memory.
- Tắt Memory cho một dự án.
- Kiểm tra nguồn dữ liệu.

## 5.6. Project Management

Mỗi Project là một không gian làm việc độc lập.

Cấu trúc:

Project
- Project Information.
- Project Instructions.
- Conversations.
- Project Memory.
- Documents.
- Knowledge.
- Activity.

Một conversation có thể thuộc một project hoặc nằm trong khu vực cá nhân.

Khi mở conversation thuộc Project, hệ thống tự động lấy Project Context tương ứng.

## 5.7. Knowledge Base

Mục tiêu: Tạo kho kiến thức riêng của người dùng.

Luồng xử lý tài liệu:

1. Người dùng upload file.
2. Lưu file vào Local Storage.
3. Kiểm tra loại file và dung lượng.
4. Trích xuất nội dung.
5. Chuẩn hóa nội dung.
6. Chia thành các chunks.
7. Tạo embeddings.
8. Lưu metadata và nội dung.
9. Đồng bộ Cloud nếu được bật.

Khi AI trả lời:
- Tìm kiếm các chunks phù hợp.
- Đưa nội dung liên quan vào context.
- Lưu thông tin nguồn.
- Hiển thị nguồn tài liệu trong câu trả lời khi phù hợp.

Cần hỗ trợ xóa tài liệu và xử lý việc xóa các chunks, embeddings liên quan.

## 5.8. Search Center

Cho phép tìm kiếm trên toàn bộ Workspace.

Các phạm vi:
- Conversations.
- Messages.
- Projects.
- Memory.
- Documents.
- Knowledge.

Hỗ trợ định hướng:
- Tìm kiếm từ khóa.
- Tìm kiếm ngữ nghĩa.
- Bộ lọc theo thời gian.
- Bộ lọc theo project.
- Bộ lọc theo provider.
- Bộ lọc theo loại dữ liệu.

## 5.9. Hybrid Storage & Synchronization

Kiến trúc Local + Cloud.

### Local Storage

Lưu trên thiết bị:
- Profile cache.
- Projects.
- Conversations.
- Messages.
- Memories.
- Documents metadata.
- Local attachments.
- Settings.
- Sync Queue.

Cơ sở dữ liệu: SQLite.

### Cloud Storage

Lưu:
- Account.
- Profile.
- Devices.
- Projects.
- Conversations.
- Messages.
- Memories.
- Documents.
- Embeddings.
- Sync Metadata.

Công nghệ: Supabase PostgreSQL, Storage và pgvector.

### Quy trình đồng bộ

Local-first:

1. Người dùng thực hiện thao tác.
2. Ghi dữ liệu vào SQLite.
3. Đưa sự kiện vào Sync Outbox.
4. Kiểm tra trạng thái mạng.
5. Gửi dữ liệu lên Cloud.
6. Backend xác nhận.
7. Cập nhật trạng thái synced.
8. Lấy dữ liệu thay đổi từ Cloud.
9. Cập nhật Local Database.

### Xử lý xung đột

Ví dụ:
- Máy A sửa tên Project.
- Máy B cũng sửa tên Project.
- Cả hai cùng offline.
- Khi kết nối lại, hệ thống phát hiện xung đột.

Quy tắc:
- Không âm thầm ghi đè dữ liệu quan trọng.
- Dùng version và updated_at.
- Dùng device_id để theo dõi nguồn cập nhật.
- Dùng conflict records để lưu xung đột.
- Cho phép áp dụng phiên bản phù hợp hoặc yêu cầu người dùng quyết định.

Messages nên được quản lý theo hướng append-only để giảm xung đột.

Khi xóa dữ liệu, cần tombstone để thiết bị khác cũng nhận biết việc xóa.

## 5.10. File Management

Chức năng:
- Upload.
- Download.
- Preview.
- Rename.
- Delete.
- Quản lý thư mục.
- Tìm kiếm.
- Theo dõi dung lượng.
- Đồng bộ.

Tách biệt:
- File gốc.
- File preview.
- Nội dung trích xuất.
- Embeddings.
- Metadata.

## 5.11. Usage & Analytics

Theo dõi:
- Số lượng yêu cầu.
- Provider.
- Model.
- Token input.
- Token output.
- Thời gian phản hồi.
- Trạng thái.
- Lỗi.
- Chi phí ước tính nếu provider cung cấp dữ liệu cần thiết.

Không được hiển thị chi phí như số liệu chính xác nếu không có đủ dữ liệu giá và usage.

## 5.12. Notification

Các thông báo:
- API Key không hợp lệ.
- Provider lỗi.
- Hết giới hạn API.
- Đồng bộ thất bại.
- Tài liệu xử lý xong.
- Có bản cập nhật.
- Phiên đăng nhập hết hạn.

---

# 6. THIẾT KẾ KIẾN TRÚC HỆ THỐNG

## 6.1. Công nghệ chính

| Layer | Công nghệ |
|---|---|
| Desktop Framework | Tauri 2 |
| Frontend | React |
| Language | TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui |
| State Management | Zustand |
| Server State | TanStack Query |
| Native Layer | Rust |
| Local Database | SQLite |
| Backend | Node.js + Fastify |
| Cloud Database | Supabase PostgreSQL |
| Authentication | Supabase Auth |
| File Storage | Supabase Storage |
| Vector Database | pgvector |
| Monorepo | pnpm + Turborepo |
| CI/CD | GitHub Actions |

## 6.2. Sơ đồ kiến trúc

```text
                  USER
                   |
          UNIFIED AI DESKTOP
                   |
        +----------+-----------+
        |                      |
    React UI               Tauri / Rust
        |                      |
        |                  SQLite DB
        |                  Local Files
        |                  Secure Storage
        |                      |
        +----------+-----------+
                   |
               API CLIENT
                   |
             BACKEND API
             Fastify Server
                   |
       +-----------+------------+
       |           |            |
   Auth Service  Sync API   AI Gateway
       |           |            |
   Supabase     PostgreSQL   Provider
   Auth         Storage      Adapters
                  |             |
               pgvector    +----+----+
                           |    |    |
                         OpenAI Claude Gemini
```

## 6.3. Desktop Application

Trách nhiệm:
- Giao diện.
- Quản lý hội thoại.
- Ghi dữ liệu Local.
- Quản lý file.
- Kết nối Backend.
- Nhận streaming.
- Quản lý trạng thái đồng bộ.
- Giao tiếp với hệ điều hành.

## 6.4. Backend API

Trách nhiệm:
- Xác thực.
- Phân quyền.
- Quản lý dữ liệu Cloud.
- AI Gateway.
- Quản lý kết nối provider.
- Sync.
- Usage.
- Rate limiting.
- Logging.
- Security.

## 6.5. AI Gateway

AI Gateway là lớp trung gian độc lập.

Các thành phần:

- Provider Registry.
- Model Registry.
- Provider Adapters.
- Request Normalizer.
- Context Builder.
- Streaming Handler.
- Error Handler.
- Usage Tracker.

Mỗi provider có adapter riêng.

Ví dụ:

```text
AI Gateway
├── OpenAI Adapter
├── Anthropic Adapter
└── Gemini Adapter
```

Adapter chịu trách nhiệm chuyển đổi giữa định dạng chung của ứng dụng và định dạng API của từng nhà cung cấp.

## 6.6. Background Worker

Các tác vụ chạy nền:
- Tạo conversation summary.
- Phân tích Memory.
- Tạo embeddings.
- Xử lý tài liệu.
- Đồng bộ.
- Dọn dẹp dữ liệu tạm.
- Xử lý tác vụ retry.

Các tác vụ dài không nên làm nghẽn luồng xử lý chat.

---

# 7. THIẾT KẾ DATABASE

## 7.1. Nguyên tắc

- UUID cho định danh.
- Tách dữ liệu theo user_id.
- Có created_at và updated_at.
- Có version cho các thực thể cần kiểm soát xung đột.
- Có device_id khi cần theo dõi nguồn thay đổi.
- Hỗ trợ soft delete.
- Thiết lập Row Level Security trên dữ liệu Cloud.
- Không lưu API Key dạng plaintext.

## 7.2. Các bảng chính

### Authentication

- profiles
- devices
- user_sessions

### AI Connections

- providers
- models
- ai_connections
- connection_credentials
- usage_logs

### Workspace

- workspaces
- projects
- project_members
- project_instructions

### Conversations

- conversations
- messages
- message_attachments
- message_metadata

### Memory

- user_memories
- project_memories
- conversation_summaries
- memory_versions
- memory_embeddings

### Knowledge

- documents
- document_chunks
- document_embeddings
- document_folders

### Synchronization

- sync_events
- sync_cursors
- sync_conflicts
- deleted_entities

### Subscription

- plans
- subscriptions
- usage_limits
- licenses
- billing_events

## 7.3. Quan hệ dữ liệu tổng quan

```text
USER
 |
 +-- DEVICES
 |
 +-- AI_CONNECTIONS
 |      |
 |      +-- CONNECTION_CREDENTIALS
 |
 +-- PROJECTS
 |      |
 |      +-- CONVERSATIONS
 |      |      |
 |      |      +-- MESSAGES
 |      |
 |      +-- PROJECT_MEMORIES
 |      |
 |      +-- DOCUMENTS
 |             |
 |             +-- DOCUMENT_CHUNKS
 |
 +-- USER_MEMORIES
 |
 +-- CONVERSATION_SUMMARIES
 |
 +-- USAGE_LOGS
 |
 +-- SUBSCRIPTIONS
```

Đây là mô hình logic ban đầu. Cần hoàn thiện ERD và migration SQL trước khi triển khai production.

---

# 8. BẢO MẬT VÀ QUYỀN RIÊNG TƯ

## 8.1. Bảo vệ API Key

API Key của người dùng là dữ liệu bí mật.

Yêu cầu:
- Không lưu plaintext trong SQLite thông thường.
- Sử dụng Keychain trên macOS.
- Sử dụng Windows Credential Manager hoặc cơ chế lưu trữ bí mật tương đương.
- Có thể sử dụng Tauri Stronghold cho dữ liệu phù hợp.
- Cloud credential phải được mã hóa bằng cơ chế quản lý khóa an toàn.
- Không gửi API Key vào frontend logging.
- Không hiển thị đầy đủ API Key sau khi lưu.
- Không đưa API Key vào crash report.

## 8.2. Phân quyền

Mỗi người dùng chỉ được truy cập dữ liệu thuộc quyền của mình.

Backend phải xác thực user_id từ session, không tin user_id do client tự gửi.

Các bảng Cloud cần có Row Level Security phù hợp.

## 8.3. Bảo vệ dữ liệu

- HTTPS.
- Access token có thời hạn.
- Refresh token được bảo vệ.
- Rate limiting.
- Kiểm tra file upload.
- Giới hạn dung lượng.
- Kiểm soát truy cập file.
- Audit log cho thao tác quan trọng.
- Sao lưu dữ liệu.
- Chính sách xóa dữ liệu.

## 8.4. Quyền kiểm soát của người dùng

Người dùng có thể:
- Xuất dữ liệu.
- Xóa conversation.
- Xóa project.
- Xóa Memory.
- Xóa tài liệu.
- Ngắt kết nối provider.
- Xóa API Key.
- Tắt Cloud Sync.
- Xóa tài khoản.

## 8.5. Mô hình mã hóa

MVP:
- Mã hóa credential.
- Bảo vệ dữ liệu Local.
- Bảo vệ dữ liệu Cloud.
- Kiểm soát quyền truy cập.
- TLS khi truyền dữ liệu.

Định hướng sau MVP:
- End-to-end encryption cho các dữ liệu phù hợp.

Cần lưu ý: Nếu Cloud không thể đọc dữ liệu do mã hóa đầu cuối, việc tạo embeddings và xử lý Memory trên Cloud sẽ cần thay đổi kiến trúc. Có thể chuyển các tác vụ đó sang thiết bị người dùng hoặc thiết kế cơ chế chia sẻ khóa có kiểm soát.

---

# 9. API DESIGN

Base URL dự kiến:

`https://api.unifiedai.app/v1`

Các endpoint dưới đây là API nội bộ của Unified AI Workspace, không phải endpoint chính thức của các nhà cung cấp AI.

## 9.1. Authentication

- POST /auth/session
- GET /account
- POST /auth/logout
- POST /auth/refresh

## 9.2. Providers

- GET /providers
- GET /models
- GET /connections
- POST /connections
- POST /connections/test
- PATCH /connections/:id
- DELETE /connections/:id

## 9.3. Chat

- GET /conversations
- POST /conversations
- GET /conversations/:id
- PATCH /conversations/:id
- DELETE /conversations/:id
- GET /conversations/:id/messages
- POST /chat/completions

## 9.4. Memory

- GET /memory
- POST /memory/search
- POST /memory/update
- PATCH /memory/:id
- DELETE /memory/:id

## 9.5. Projects

- GET /projects
- POST /projects
- PATCH /projects/:id
- DELETE /projects/:id

## 9.6. Documents

- POST /documents/upload
- GET /documents
- GET /documents/:id
- DELETE /documents/:id
- POST /documents/:id/process

## 9.7. Synchronization

- POST /sync/push
- GET /sync/pull
- GET /sync/status
- POST /sync/resolve-conflict

## 9.8. Usage

- GET /usage
- GET /usage/summary
- GET /usage/providers

Các endpoint phải có schema validation, authentication, authorization, rate limiting và quy tắc xử lý lỗi thống nhất.

---

# 10. CẤU TRÚC SOURCE CODE

Đề xuất monorepo:

```text
unified-ai-workspace/
│
├── apps/
│   ├── desktop/
│   │   ├── src/
│   │   │   ├── app/
│   │   │   ├── components/
│   │   │   │   ├── layout/
│   │   │   │   ├── sidebar/
│   │   │   │   ├── chat/
│   │   │   │   ├── projects/
│   │   │   │   ├── memory/
│   │   │   │   ├── providers/
│   │   │   │   └── settings/
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   ├── conversations/
│   │   │   │   ├── ai-connections/
│   │   │   │   ├── memory/
│   │   │   │   ├── projects/
│   │   │   │   ├── knowledge/
│   │   │   │   └── sync/
│   │   │   ├── services/
│   │   │   ├── stores/
│   │   │   ├── hooks/
│   │   │   ├── types/
│   │   │   └── styles/
│   │   │
│   │   ├── src-tauri/
│   │   │   ├── src/
│   │   │   │   ├── commands/
│   │   │   │   ├── database/
│   │   │   │   ├── security/
│   │   │   │   ├── files/
│   │   │   │   └── sync/
│   │   │   └── capabilities/
│   │   │
│   │   └── package.json
│   │
│   ├── api/
│   │   └── src/
│   │       ├── routes/
│   │       ├── middleware/
│   │       ├── services/
│   │       ├── auth/
│   │       └── server.ts
│   │
│   └── worker/
│       └── src/
│           ├── memory/
│           ├── embeddings/
│           ├── document-processing/
│           ├── sync/
│           └── jobs/
│
├── packages/
│   ├── ai-core/
│   │   ├── adapters/
│   │   ├── orchestrator/
│   │   ├── context/
│   │   └── types/
│   ├── memory-core/
│   ├── database/
│   ├── shared-types/
│   ├── validators/
│   └── design-system/
│
├── supabase/
│   ├── migrations/
│   ├── seed.sql
│   └── config.toml
│
├── docs/
│   ├── architecture/
│   ├── database/
│   ├── sync-protocol/
│   ├── security/
│   ├── api/
│   └── deployment/
│
├── scripts/
├── tests/
├── .github/
│   └── workflows/
│
├── package.json
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── turbo.json
├── .env.example
└── README.md
```

---

# 11. MVP – PHIÊN BẢN ĐẦU TIÊN

MVP tập trung vào những tính năng cốt lõi, đủ để sản phẩm có thể được kiểm thử với người dùng thực tế.

## 11.1. Chức năng bắt buộc

| Nhóm | Chức năng |
|---|---|
| Authentication | Google Login |
| Desktop | macOS + Windows |
| AI | OpenAI, Claude, Gemini |
| Connection | BYOK API Key |
| Chat | Unified Chat |
| Model | Model Selector |
| Streaming | Real-time response |
| History | Conversation History |
| Handover | Chuyển AI trong cùng conversation |
| Memory | User + Project Memory |
| Project | Project Management |
| Knowledge | Upload và tìm kiếm tài liệu cơ bản |
| Local | SQLite |
| Cloud | Supabase |
| Sync | Local + Cloud Sync |
| Security | Secure Credential Storage |
| Export | Xuất dữ liệu cơ bản |

## 11.2. Chưa triển khai trong MVP

- Team Workspace.
- Chia sẻ project.
- Collaboration thời gian thực.
- Mobile App.
- Billing phức tạp.
- AI Marketplace.
- Tự động lựa chọn model nâng cao.
- Voice Assistant.
- Agent Automation.
- E2EE toàn bộ dữ liệu.
- OAuth provider connections nếu chưa có luồng chính thức phù hợp.

---

# 12. LỘ TRÌNH PHÁT TRIỂN

Dự kiến cho một người phát triển toàn thời gian, với điều kiện phạm vi được kiểm soát và không phát sinh yêu cầu lớn.

## Sprint 1 – Foundation

- Khởi tạo Tauri.
- React + TypeScript.
- Thiết kế UI cơ bản.
- SQLite.
- Sidebar.
- Main Workspace.
- Settings.

**Kết quả:** Chạy được Desktop App trên macOS.

## Sprint 2 – Authentication & Cloud

- Supabase.
- Google Login.
- User Profile.
- Device Management.
- Project Database.
- Conversation Database.

**Kết quả:** Người dùng có tài khoản và dữ liệu Cloud.

## Sprint 3 – AI Integration

- OpenAI Adapter.
- Claude Adapter.
- Gemini Adapter.
- API Key Management.
- Model Selector.
- Streaming.
- Unified Chat.

**Kết quả:** Sử dụng được ba AI trong một ứng dụng.

## Sprint 4 – Conversation & Handover

- Conversation History.
- Message Persistence.
- Provider Metadata.
- Context Builder.
- AI Handover.

**Kết quả:** Chuyển đổi AI trong cùng một cuộc trò chuyện.

## Sprint 5 – Memory & Knowledge

- User Memory.
- Project Memory.
- Conversation Summary.
- Document Upload.
- Embeddings.
- Semantic Search.

**Kết quả:** Có hệ thống bộ nhớ dùng chung.

## Sprint 6 – Synchronization

- Sync Outbox.
- Sync Pull.
- Sync Push.
- Conflict Detection.
- Retry.
- Offline Mode.

**Kết quả:** Đồng bộ dữ liệu giữa các thiết bị.

## Sprint 7 – Security & Testing

- Security Review.
- Permission Review.
- API Rate Limiting.
- Error Handling.
- Unit Tests.
- Integration Tests.
- Performance Tests.

**Kết quả:** Bản Beta có thể kiểm thử.

## Sprint 8 – Release

- macOS Build.
- Windows Build.
- Code Signing.
- Notarization cho macOS.
- Windows Installer.
- Auto Update.
- Release Pipeline.

**Kết quả:** Có bộ cài đặt để phát hành.

Thời gian thực tế có thể kéo dài hơn nếu cần xử lý các vấn đề về đồng bộ, bảo mật, OAuth, tương thích API hoặc trải nghiệm đa nền tảng.

---

# 13. KIỂM THỬ VÀ TIÊU CHUẨN NGHIỆM THU

## 13.1. Authentication

- Đăng nhập Google thành công.
- Đăng xuất đúng cách.
- Không truy cập được dữ liệu người dùng khác.
- Phiên đăng nhập được khôi phục an toàn.

## 13.2. AI Integration

- Kết nối thành công từng provider.
- API Key sai được thông báo chính xác.
- Model không khả dụng được xử lý đúng.
- Streaming hiển thị theo thời gian thực.
- Lỗi API không làm hỏng conversation.
- Người dùng có thể chuyển provider.

## 13.3. Handover

- Chuyển từ OpenAI sang Claude.
- Chuyển từ Claude sang Gemini.
- Không mất lịch sử.
- Giữ được Project Instructions.
- Bổ sung Memory phù hợp.
- Không vượt giới hạn context mà không có xử lý.

## 13.4. Memory

- Lưu được Memory.
- Tìm kiếm được Memory.
- Không tự động biến mọi câu chat thành Memory lâu dài.
- Có thể chỉnh sửa và xóa.
- Không đưa Memory của project này sang project khác ngoài phạm vi cho phép.

## 13.5. Local & Cloud Sync

- Dùng được lịch sử khi offline.
- Có thể đồng bộ sau khi online.
- Không tạo bản ghi trùng lặp.
- Phát hiện xung đột.
- Xóa dữ liệu được đồng bộ theo đúng chính sách.
- Không mất dữ liệu khi ứng dụng bị đóng đột ngột.

## 13.6. Desktop

- Chạy trên macOS.
- Chạy trên Windows.
- Không bị treo khi xử lý tài liệu lớn.
- Có cơ chế cập nhật.
- Lưu và khôi phục trạng thái cửa sổ.
- Cài đặt và gỡ cài đặt đúng cách.

---

# 14. MÔ HÌNH KINH DOANH

## 14.1. Định hướng

Sản phẩm bán giá trị của Workspace, không bán lại các gói thuê bao tiêu dùng của nhà cung cấp AI.

Mô hình phù hợp ban đầu là BYOK – Bring Your Own Key.

Người dùng:
- Mua gói Unified AI Workspace.
- Tự kết nối API Key.
- Thanh toán chi phí API trực tiếp với nhà cung cấp AI.

Điều này giúp tách chi phí phần mềm khỏi chi phí sử dụng mô hình AI.

## 14.2. Gói dịch vụ đề xuất

### Free

- Một số lượng project giới hạn.
- Chat cơ bản.
- Kết nối AI theo giới hạn sản phẩm.
- Local History.
- Memory cơ bản.

### Pro

- Nhiều project hơn.
- Cloud Sync.
- Memory nâng cao.
- Knowledge Base.
- AI Handover.
- Search nâng cao.
- Nhiều thiết bị.

### Ultimate

- Giới hạn sử dụng Workspace cao hơn.
- Quản lý dữ liệu nâng cao.
- Nhiều thiết bị.
- Công cụ quản lý chuyên sâu.
- Tính năng thử nghiệm mới.

Các gói và giới hạn cụ thể cần được kiểm chứng bằng chi phí hạ tầng và phản hồi người dùng.

## 14.3. Hệ thống thương mại tương lai

- Subscription Manager.
- Billing Provider.
- Plan Limits.
- Usage Metering.
- License Management.
- Device Limits.
- Referral System.
- Update Server.

---

# 15. RỦI RO VÀ PHƯƠNG ÁN XỬ LÝ

| Rủi ro | Phương án |
|---|---|
| API provider thay đổi | Adapter độc lập |
| Model bị ngừng hỗ trợ | Model Registry cập nhật |
| Mất mạng | Local-first |
| Xung đột dữ liệu | Version + Conflict Resolution |
| Rò rỉ API Key | Secure Storage + Encryption |
| Context quá lớn | Context Builder + Summary |
| Chi phí embeddings tăng | Giới hạn và tối ưu xử lý |
| Cloud lỗi | Local Data vẫn hoạt động |
| Dữ liệu trùng | UUID + Idempotency |
| Khác biệt API giữa provider | Canonical Data Model + Provider Extensions |
| OAuth không được hỗ trợ | BYOK và phương thức chính thức được phép |

---

# 16. NGUYÊN TẮC PHÁT TRIỂN

1. Không xây dựng toàn bộ ứng dụng trong một module lớn.
2. Không để frontend trực tiếp xử lý bí mật API.
3. Không phụ thuộc vào một AI Provider.
4. Không lưu API Key dạng plaintext.
5. Không để Cloud là nơi lưu dữ liệu duy nhất.
6. Không tự động xóa dữ liệu người dùng.
7. Không làm mất lịch sử khi chuyển AI.
8. Mọi tính năng quan trọng cần có kiểm thử.
9. Mọi thay đổi database cần migration.
10. Mọi API cần validation và authorization.
11. Các thao tác đồng bộ cần idempotency.
12. Phải có cơ chế backup và export dữ liệu.

---

# 17. ĐỊNH HƯỚNG PHÁT TRIỂN TƯƠNG LAI

Sau khi MVP ổn định, có thể mở rộng:

- Thêm nhiều AI Provider.
- AI Model Comparison.
- Multi-Model Parallel Chat.
- AI Agent.
- Voice Chat.
- Image Generation.
- Workflow Automation.
- MCP Integration.
- Plugin System.
- Team Workspace.
- Shared Knowledge Base.
- Collaboration.
- Mobile Application.
- Browser Extension.
- Advanced Analytics.

### Multi-Model Parallel Chat

Người dùng gửi một câu hỏi và nhận phản hồi từ nhiều AI cùng lúc.

Ví dụ:

```text
                  USER PROMPT
                       |
             +---------+---------+
             |         |         |
          OpenAI    Claude    Gemini
             |         |         |
             +---------+---------+
                       |
                RESPONSE VIEW
                       |
                Compare Results
```

### AI Agent

Cho phép AI thực hiện các nhiệm vụ nhiều bước:
- Phân tích yêu cầu.
- Tìm kiếm dữ liệu.
- Đọc tài liệu.
- Thực hiện công việc.
- Tổng hợp kết quả.
- Lưu kết quả vào Project.

---

# 18. TIÊU CHÍ THÀNH CÔNG CỦA SẢN PHẨM

Unified AI Workspace được xem là đạt mục tiêu khi người dùng có thể:

1. Đăng nhập một lần vào Workspace.
2. Kết nối OpenAI, Claude và Gemini.
3. Sử dụng các AI từ một giao diện.
4. Chuyển AI trong cùng một conversation.
5. Không phải giải thích lại toàn bộ bối cảnh khi chuyển AI.
6. Tìm kiếm lại hội thoại cũ.
7. Lưu và truy xuất Memory.
8. Quản lý dữ liệu theo Project.
9. Làm việc với tài liệu cá nhân.
10. Đồng bộ dữ liệu giữa nhiều thiết bị.
11. Tiếp tục truy cập lịch sử Local khi offline.
12. Kiểm soát dữ liệu và API Key của mình.

**Giá trị cốt lõi cuối cùng:**

Unified AI Workspace không đơn thuần là một ứng dụng tổng hợp chatbot. Đây là một môi trường làm việc AI độc lập, nơi dữ liệu, kiến thức, lịch sử và bộ nhớ thuộc về người dùng, còn các mô hình AI có thể thay đổi tùy theo nhu cầu.

**ONE WORKSPACE. EVERY AI. ONE MEMORY.**

---

# 19. TÀI LIỆU THAM KHẢO KỸ THUẬT

Các tài liệu chính thức cần dùng trong quá trình triển khai:

- Tauri Architecture: https://v2.tauri.app/concept/architecture/
- Tauri Plugins: https://v2.tauri.app/plugin/
- Supabase Auth: https://supabase.com/docs/guides/auth
- Supabase PKCE: https://supabase.com/docs/guides/auth/sessions/pkce-flow
- OpenAI API Reference: https://developers.openai.com/api/reference/overview
- OpenAI Streaming: https://developers.openai.com/api/docs/guides/streaming-responses
- Anthropic API: https://platform.claude.com/docs/en/api/messages
- Google Gemini API: https://ai.google.dev/gemini-api/docs

Tài liệu này là đặc tả định hướng sản phẩm và kiến trúc ban đầu. Trước khi phát hành, cần hoàn thiện ERD, schema API, threat model, chính sách dữ liệu, thiết kế UI chi tiết và các tiêu chí kiểm thử cho từng module.