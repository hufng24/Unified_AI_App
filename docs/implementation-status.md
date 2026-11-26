# Accounts Alpha 0.2.0

Triển khai ngày 26 tháng 11 năm 2026 dựa trên đặc tả 2.0. Đây là bản chạy nội bộ, chưa phải toàn bộ MVP hoặc bản phát hành production.

## Đã có source và chức năng

- Monorepo pnpm, React/TypeScript/Vite, Tauri 2/Rust, Fastify Gateway và contracts có validation.
- Giao diện ba vùng, màn hình chat, dự án, bộ nhớ, tài liệu, kết nối AI, tìm kiếm và cài đặt.
- SQLite từ schema trong tài liệu; UUID local, WAL, transaction ghi domain cùng outbox, khôi phục generation bị gián đoạn khi khởi động lại.
- Tạo/sửa dự án và project instructions; tạo hội thoại, lưu lịch sử theo nhánh, regenerate và sửa prompt tạo nhánh mới.
- Lưu API Key bằng Keychain macOS hoặc Credential Manager Windows; metadata được lưu riêng, không export Key.
- Adapter REST OpenAI Responses, Anthropic Messages và Gemini streamGenerateContent; model ID do người dùng cung cấp, không giả định quyền dùng model.
- Gateway xác thực token phát triển, giới hạn request, ledger SQLite chống replay, SSE chuẩn hóa, abort và redaction lỗi. Gateway local chỉ bind loopback.
- Native HTTP giữ Key ngoài React sau lưu, checkpoint phản hồi, dừng và giữ partial, usage token nếu provider trả.
- Context từ đúng ancestor path, project instructions, tối đa tám Memory đúng scope và ba đoạn tài liệu phù hợp từ khóa. Context quá dài được chặn, chưa tự tóm tắt.
- Memory nhập thủ công có version và soft delete; chưa tự trích xuất.
- Nhập TXT/Markdown UTF-8 tối đa 2 MiB, copy local, hash, chunk, index FTS và tìm nguồn theo từ khóa trong context.
- Tìm tiêu đề hội thoại, dự án, Memory; xuất JSON gồm metadata và nội dung hội thoại, không kèm Key hoặc file gốc.
- Browser preview dùng dữ liệu mẫu trong bộ nhớ, không phải kho dữ liệu thật và không cho lưu Key.
- CI đã khai báo cho TypeScript và native macOS/Windows; cần xem kết quả GitHub Actions sau khi push.

## Bổ sung kết nối tài khoản 0.2

- ChatGPT SIWC dynamic registration, Google Gemini API OAuth Desktop, PKCE/state/nonce, xác minh JWT và chọn model từ catalog.
- Token mã hóa AES-GCM trong SQLite với khóa trong OS vault riêng, tự refresh, hủy, đăng nhập lại và thử revoke khi xóa. Migration giữ dữ liệu v1.
- Claude vẫn dùng API Key, chưa có quyền triển khai consumer OAuth. Google cần Cloud project/OAuth client. Xem [cấu hình và giới hạn](account-connections.md). Chưa xác minh đăng nhập/inference live.

## Các mốc còn lại trong đặc tả

- Google Login cho tài khoản Workspace/Cloud, device registry và chuyển local identity sang tài khoản Cloud.
- Cloud Sync push/pull, receipt, conflict resolver, snapshot reset và file sync. Outbox hiện chỉ là local queue, chưa gửi Cloud.
- Model Registry có capability/token/pricing được kiểm chứng; manifest provider live và kiểm thử bằng API Key thực tế.
- Context preview chính xác từng nguồn, source drawer và token budget theo model, summary và compaction.
- Memory candidate tự trích xuất, review/edit/merge, suppression và semantic retrieval.
- PDF/DOCX, OCR, background jobs có lease/retry đầy đủ, citation có locator và xóa/reprocess tài liệu.
- Tìm kiếm toàn bộ nội dung message và semantic search; import backup và export ZIP đủ file gốc.
- Xóa/khôi phục đầy đủ project, conversation và subtree theo policy; hiện không được coi đã hoàn thiện toàn bộ CRUD của PRD.
- i18n tiếng Anh, virtualization quy mô lớn, benchmark, kiểm accessibility toàn diện.
- Phát hành Windows thực tế, macOS notarization, updater có chữ ký, chính sách dữ liệu và vận hành Cloud.

## Quyết định giới hạn cho bản nội bộ

Chưa có cấu hình Supabase/OAuth của chủ sản phẩm trong repository nên bản này dùng identity local riêng trên thiết bị. Không dùng identity local này để giả lập đăng nhập hoặc đồng bộ Cloud. Cần migration account linking trước khi mở Sync.

Không gửi Key hoặc prompt thật trong báo cáo lỗi. `pnpm dev` cấp cùng một token ngẫu nhiên cho Gateway và native process; token không được in log hoặc đóng gói vào frontend. Mở file .app độc lập chỉ dùng được chức năng local nếu chưa có Gateway runtime được cấp token. Gateway Cloud và app phân phối độc lập cần luồng Auth ở mốc tiếp theo.

API Anthropic pin compatibility header `2023-06-01`, OpenAI dùng Responses v1, Gemini dùng generateContent v1beta. Những adapter này đã có test fixture, chưa được chứng nhận bằng tài khoản API live. Kiểm tra tài liệu chính thức và quyền model tại thời điểm dùng; không suy ra từ tên gói ChatGPT/Claude/Gemini cá nhân.
