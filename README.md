# Unified AI Workspace

Accounts Alpha 0.2.0 của ứng dụng desktop nhiều AI, phát triển từ [đặc tả triển khai](docs/Unified-AI-Workspace-Implementation-Spec.md). React, TypeScript, Tauri 2, Rust, SQLite và Fastify.

Đã có source và bản build macOS chạy nội bộ. Đây chưa phải toàn bộ MVP; xem [phần đã làm và còn thiếu](docs/implementation-status.md) cùng [kết quả kiểm tra](docs/verification.md).

## Chạy trên máy phát triển

Yêu cầu Node.js 24 trở lên, pnpm 11.25.0, Rust stable và bộ công cụ build của hệ điều hành. Trên Mac cần Apple Command Line Tools; trên Windows cần Visual Studio Build Tools C++ và WebView2.

```bash
pnpm install --frozen-lockfile
pnpm dev
```

`pnpm dev` mở Gateway ở `127.0.0.1:8787`, Vite ở `127.0.0.1:1420` và cửa sổ Tauri. Launcher cấp token phát triển ngẫu nhiên cho hai process, không in token hoặc API Key. Đóng các phiên dev cũ nếu hai cổng này đang được dùng.

Trong app có **Continue with ChatGPT**, Google OAuth cho Gemini API và API Key cho cả ba provider. Xem [hướng dẫn kết nối tài khoản và điều kiện sử dụng](docs/account-connections.md). Claude consumer login chưa được cấp quyền; Google OAuth cần Cloud project/Desktop client, không dùng quota gói Gemini cá nhân. Chưa xác minh OAuth live bằng tài khoản thật.

Với API Key, vào **Kết nối AI → Thêm kết nối**, chọn provider, nhập model ID bạn có quyền sử dụng và API Key. Key được lưu trong kho bí mật OS. Bấm **Kiểm tra**, sau đó tạo hội thoại và gửi prompt. Khi dùng Gateway, Key và context được chuyển tạm thời qua Gateway tới provider; chưa có E2EE toàn bộ.

Không cần API Key để tạo dự án, ghi Memory, nhập TXT/Markdown hoặc xem dữ liệu local. Chat thật cần Internet và Key hợp lệ; chưa có kiểm thử live bằng tài khoản API trong lần bàn giao này.

## Build và chạy bản đóng gói

Trên macOS:

```bash
pnpm --filter @uai/desktop tauri build --debug --bundles app
pnpm start:local
```

`start:local` chạy Gateway và bản native đã build cùng một token, không dùng Vite. Đóng phiên app cũ trước khi chạy. Mở riêng file `.app` chỉ dùng được chức năng local nếu chưa được cấp Gateway runtime. Bản debug chưa có notarization hoặc chữ ký phát hành.

Trên Windows dùng `pnpm --filter @uai/desktop tauri build --debug --no-bundle`, sau đó `pnpm start:local`. Workflow native có cấu hình Windows nhưng cần kiểm kết quả CI và chạy thử trên máy Windows thực tế trước khi công bố hỗ trợ.

Chỉ xem giao diện trong trình duyệt:

```bash
pnpm dev:web
```

Bản web hiển thị nhãn **XEM TRƯỚC UI**, dữ liệu mẫu chỉ giữ trong bộ nhớ của phiên; không gọi provider và không cho lưu API Key. Dữ liệu thật được lưu qua Rust/SQLite trong bản desktop.

## Các chức năng đã triển khai

- Giao diện ba vùng, dự án và chỉ dẫn theo dự án.
- Chat lưu local, streaming, stop, giữ partial, regenerate và sửa prompt thành nhánh mới.
- Adapter OpenAI Responses, Claude Messages và Gemini native; một conversation có thể đổi kết nối giữa các lượt.
- OAuth ChatGPT/Google qua trình duyệt, PKCE/OIDC, token mã hóa, refresh, hủy, đăng nhập lại và chọn model từ catalog.
- Kho bí mật OS, test kết nối, xác thực Gateway, idempotency ledger và lỗi được che nội dung nhạy cảm.
- Memory nhập thủ công đúng phạm vi; TXT/Markdown UTF-8, chunk và context theo từ khóa.
- Bản nháp autosave và flush khi rời màn hình; export JSON không có Key.
- Local outbox ghi cùng transaction; **chưa có Cloud Sync**.

Đăng nhập tài khoản Cloud Workspace, Sync hai máy và resolver, semantic search, Memory tự trích xuất, PDF, model registry, backup import, CRUD đầy đủ và phát hành có chữ ký là các mốc tiếp theo. Không đặt dịch vụ local này lên Internet như một bản production đã hoàn thiện.

## Kiểm tra

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm test:rust
cargo clippy --manifest-path apps/desktop/src-tauri/Cargo.toml --all-targets -- -D warnings
python3 scripts/check_local_schema.py
```

CI kiểm tra TypeScript trên Linux và build/test native trên macOS/Windows. API Keys và credentials không được đưa vào CI của pull request.

## Tài liệu

- [File Word 48 trang](docs/Unified-AI-Workspace-Dac-ta-trien-khai.docx)
- [Đặc tả có thể review diff](docs/Unified-AI-Workspace-Implementation-Spec.md)
- [PRD gốc](Unified-AI-Workspace-PRD.md)
- [Schema Cloud](docs/sql/0001_cloud_baseline.sql) và [schema Local](docs/sql/0001_local_baseline.sql)
- [Trạng thái triển khai](docs/implementation-status.md)

SQL Cloud chưa được chạy trên PostgreSQL/Supabase. Schema Local được app sử dụng và có smoke test. Không chạy baseline Cloud vào production hoặc coi file SQL là Sync Service đã được cài đặt.
