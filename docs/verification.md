# Kết quả kiểm tra Foundation Alpha

Ngày 26 tháng 11 năm 2026. Môi trường thực hiện: macOS Apple Silicon, Node 25.6.0, Rust 1.99.0. Tài liệu Word đã render và kiểm bố cục 48 trang.

## Kết quả đã có

- TypeScript build và typecheck cho contracts, Fastify API và React frontend.
- 12 test TypeScript/Gateway/UI: validation, Unicode SSE chia tại từng byte, stream thiếu terminal, mapping provider, safety block, không lộ thoughts, unauthorized request, replay, Key redaction, draft flush, Unicode draft và IME.
- 4 Rust unit tests: ancestor path, phát hiện cycle, chọn lại nhánh có descendant và khởi tạo SQLite.
- Rust clippy với `-D warnings`.
- Migration SQLite và smoke test: parent không tồn tại, parent khác owner, Project Memory thiếu project, rollback entity/outbox và integrity check.
- Build Tauri thành `.app` debug macOS thành công; đã mở app, tạo project và conversation bằng UI native, xác nhận hiển thị dữ liệu SQLite.
- Đã phát hiện lỗi mất draft khi rời màn hình trước 500 ms, sửa bằng flush khi unmount và có regression test.
- Preview UI đã render ở 1440 × 980; chế độ web được đánh dấu rõ là dữ liệu mẫu.

## Chưa xác minh hoặc chưa triển khai

- Chưa gọi provider bằng API Key thật. Test adapter dùng fixture và mocked upstream; quyền model và tương thích API live cần kiểm trên tài khoản người dùng.
- Chưa kiểm Keychain/Credential Manager bằng Key thật. Không có credential thật trong test, Git hoặc báo cáo.
- Chưa chạy app thực tế trên Windows; workflow đã khai báo, kết quả cần kiểm trên GitHub Actions và máy Windows.
- Chưa có Supabase Auth/PKCE và Cloud Sync, nên không có kết quả RLS, conflict, push/pull hoặc multi-device.
- Chưa chạy SQL Cloud trên PostgreSQL/Supabase.
- Chưa ký/notarize bộ cài, chưa có updater hoặc release gate production.

Các giới hạn, thời gian và chỉ số trong đặc tả vẫn là mục tiêu; không phải benchmark đã đo. Xem `implementation-status.md` để tránh nhầm bản Alpha với toàn bộ MVP.
