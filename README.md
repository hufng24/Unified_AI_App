# Unified AI Workspace

Ứng dụng desktop nhiều AI với lịch sử, dự án và bộ nhớ dùng chung. Stack dự kiến: Tauri 2, React, TypeScript, Rust, SQLite và Supabase.

Repository hiện chứa tài liệu để bắt đầu triển khai. Chưa có source ứng dụng hoặc bộ cài.

## Tài liệu chính

- [Đặc tả triển khai chi tiết bằng Word](docs/Unified-AI-Workspace-Dac-ta-trien-khai.docx)
- [Bản nguồn đặc tả để đọc và review trên GitHub](docs/Unified-AI-Workspace-Implementation-Spec.md)
- [PRD gốc do chủ sản phẩm cung cấp](Unified-AI-Workspace-PRD.md)
- [SQL Cloud nền tảng](docs/sql/0001_cloud_baseline.sql)
- [SQL Local nền tảng](docs/sql/0001_local_baseline.sql)
- [Trạng thái kiểm tra và phần còn phải xác minh](docs/verification.md)

Đặc tả gồm UI/UX, database, API/IPC, tích hợp OpenAI/Claude/Gemini, Memory và Knowledge, Local–Cloud Sync, bảo mật, kiểm thử, vận hành và phát hành. Phụ lục SQL cũng được đưa trong file Word.

## Thứ tự triển khai

Đọc chương 1–3 để thống nhất phạm vi và ADR. Làm F01–F07 trong chương 13 trước: monorepo, contracts, SQLite/outbox, giao diện, kho bí mật, Gateway một provider và chat bền vững. Sau khi luồng này đạt nghiệm thu, thêm hai provider còn lại, handover, Memory, Knowledge, Auth và Sync.

Không chạy SQL Cloud vào production. Bản Cloud chưa được thực thi trên PostgreSQL/Supabase; cần chạy trên staging mới, kiểm RLS và các bất biến của Mutation Service. Schema chưa cài đặt đồng bộ, OAuth, AI Gateway hoặc quản lý file.

## Kiểm tra schema Local

Yêu cầu Python 3 có SQLite và FTS5:

```bash
python3 scripts/check_local_schema.py
```

Bài kiểm tra dùng database trong bộ nhớ, không tạo hoặc sửa dữ liệu người dùng.

## Nguyên tắc dữ liệu

Local-first; API Key nằm trong kho bí mật của từng thiết bị. Phương án Gateway MVP chuyển Key tạm thời và context qua TLS, nên cần công khai luồng này trong chính sách dữ liệu. Không lưu Key trong Git, SQLite, queue, export hoặc log. Mọi mutation đồng bộ phải có version, idempotency và authorization.
