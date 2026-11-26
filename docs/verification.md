# Trạng thái xác minh tài liệu

Ngày kiểm tra: 26 tháng 11 năm 2026.

## Đã thực hiện

- Đọc PRD gốc và tạo đặc tả bổ sung cho bảy module người dùng yêu cầu.
- Tạo file Word có mục lục liên kết, số trang, bảng đặc tả và phụ lục SQL.
- Render file Word thành ảnh để kiểm tra bố cục; bản PDF và ảnh dùng nội bộ, không phải deliverable của repository.
- Chạy migration SQLite bằng runtime tạo tài liệu, tạo account và workspace, kiểm FK từ chối parent không tồn tại.
- Có script kiểm tra schema Local độc lập trong `scripts/check_local_schema.py`.

## Chưa thực hiện

- Chưa chạy SQL Cloud trên PostgreSQL hoặc Supabase.
- Chưa có source app để kiểm thử UI, IPC, OAuth, provider, sync hoặc bảo mật khi chạy thực tế.
- Chưa triển khai Mutation Service, Storage policies, background worker, TTL cleanup hoặc cơ chế release.
- Chưa xác nhận model, SDK/API revision, chi phí hoặc hiệu năng trên thiết bị thật.

Các giá trị thời gian, giới hạn và chỉ số trong tài liệu là mục tiêu hoặc cấu hình đề xuất. SQL là schema nền tảng, không phải hệ thống production đã kiểm chứng. Chương 12 và 13 quy định các bằng chứng phải có trước beta và release.
