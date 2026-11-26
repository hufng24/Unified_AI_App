# Kết quả kiểm tra Foundation Alpha

Ngày 26 tháng 11 năm 2026. Môi trường thực hiện: macOS Apple Silicon, Node 25.6.0, Rust 1.99.0. Tài liệu Word đã render và kiểm bố cục 48 trang.

## Kết quả đã có

- TypeScript build và typecheck cho contracts, Fastify API và React frontend.
- 21 test TypeScript/Gateway/UI: validation, Unicode SSE chia tại từng byte, stream thiếu terminal, mapping provider, safety block, không lộ thoughts, unauthorized request, replay, Key redaction, draft flush, Unicode draft và IME.
- 14 Rust unit tests: ancestor path, phát hiện cycle, chọn lại nhánh có descendant và khởi tạo SQLite.
- Rust clippy với `-D warnings`.
- Migration SQLite và smoke test: parent không tồn tại, parent khác owner, Project Memory thiếu project, rollback entity/outbox và integrity check.
- Build Tauri thành `.app` debug macOS thành công; đã mở app, tạo project và conversation bằng UI native, xác nhận hiển thị dữ liệu SQLite.
- Đã phát hiện lỗi mất draft khi rời màn hình trước 500 ms, sửa bằng flush khi unmount và có regression test.
- Preview UI đã render ở 1440 × 980, bao gồm màn hình kết nối tài khoản 0.2; chế độ web được đánh dấu rõ là dữ liệu mẫu.

Các test 0.2 bổ sung kiểm tra OAuth adapter/header/catalog, UI xác minh/hủy/thất bại; Rust kiểm PKCE, callback CSRF qua loopback thật, nonce/account binding, scope, refresh, AES-GCM và migration v1 giữ dữ liệu.

## Chưa xác minh hoặc chưa triển khai

- Chưa đăng nhập OAuth ChatGPT/Google hoặc gọi inference bằng tài khoản thật.
- Chưa gọi provider bằng API Key thật. Test adapter dùng fixture và mocked upstream; quyền model và tương thích API live cần kiểm trên tài khoản người dùng.
- Chưa kiểm Keychain/Credential Manager bằng Key thật. Không có credential thật trong test, Git hoặc báo cáo.
- Chưa chạy app thực tế trên Windows; workflow đã khai báo, kết quả cần kiểm trên GitHub Actions và máy Windows.
- Chưa có Supabase Auth/PKCE và Cloud Sync, nên không có kết quả RLS, conflict, push/pull hoặc multi-device.
- Chưa chạy SQL Cloud trên PostgreSQL/Supabase.
- Chưa ký/notarize bộ cài, chưa có updater hoặc release gate production.

Các giới hạn, thời gian và chỉ số trong đặc tả vẫn là mục tiêu; không phải benchmark đã đo. Xem `implementation-status.md` để tránh nhầm bản Alpha với toàn bộ MVP.

## Hiển thị ảnh trong hội thoại

Bổ sung preview SVG hoàn chỉnh trong code block, giữ mã trong mục thu gọn và phóng to ảnh; cho phép ảnh raster nhúng dạng data URL, chặn tải ảnh remote tự động. SVG chạy trong image document, không chèn HTML vào DOM; từ chối script, event handler, foreignObject và tài nguyên bên ngoài. Ba test bổ sung kiểm render, phóng to và các trường hợp chặn, tổng 24 test TypeScript/UI. Chưa bổ sung tool tạo ảnh raster OpenAI hoặc lưu attachment riêng: thay đổi này hiển thị SVG như ví dụ người dùng gửi và ảnh data URL trong Markdown; không biến model text thành model tạo ảnh.

## Skill và công cụ tạo ảnh OpenAI

Đã bổ sung skill `image-generation` nạp ở native khi bật chế độ tạo ảnh; tool_choice bắt buộc, xử lý output ảnh hoàn chỉnh, lưu local trong message và chặn gửi base64 trở lại text context. 28 test TypeScript/UI và 15 test Rust đã qua; clippy all-targets không có warning. Có test request tool, payload ảnh sai định dạng và chặn provider không hỗ trợ. Chưa xác minh inference ảnh bằng credential thật. Skill validator Python hệ thống thiếu PyYAML; việc kiểm cấu trúc skill không thay thế kiểm thử hành vi của model.

## ChatGPT Web trong app

Đã build native và mở bằng nút sidebar, xác nhận trực quan trang chatgpt.com tải thành công trong cửa sổ native riêng, có các mục Ảnh, tải tệp, giọng nói và đăng nhập. Chưa đăng nhập/tạo ảnh hoặc kiểm tính năng sau đăng nhập. Không coi việc nhìn thấy nút là tính năng đã được kiểm thử. Xem chatgpt-web.md.

## Điều chỉnh ChatGPT chat native

Gỡ cửa sổ website và native command mở web. Nút Chat với ChatGPT chọn phiên đã xác minh và đưa về khung chat hiện tại. Test UI kiểm đúng account, phiên hết quyền/chưa đăng nhập và khóa chuyển khi đang generation. Tắt image tool với phiên ChatGPT. Giữ luồng OAuth/Responses đã có. Đã kiểm native live ngày 26/11/2026: chọn Chat với ChatGPT, gửi câu kiểm tra ngắn từ ô nhập, nhận đúng phản hồi hoàn chỉnh trong cùng hội thoại; không mở cửa sổ website. Tổng 32 test TypeScript/UI qua, build macOS thành công. Không công bố email/token tài khoản thử trong repository.
