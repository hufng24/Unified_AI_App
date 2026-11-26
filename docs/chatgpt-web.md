# ChatGPT Web trong Unified AI Workspace

Bấm **Mở ChatGPT trong app** ở sidebar để mở website chính thức https://chatgpt.com trong cửa sổ native riêng của ứng dụng. Cửa sổ đã mở sẽ được chọn lại thay vì tạo thêm. Người dùng tự đăng nhập trực tiếp vào website; phiên web khác với token Sign in with ChatGPT của Gateway.

Đã kiểm runtime macOS: cửa sổ mở thành công, tải giao diện ChatGPT tiếng Việt, hiển thị mục Ảnh, Plugin, nút tải tệp, giọng nói và đăng nhập. Chưa kiểm đăng nhập thực tế, tạo ảnh, tải xuống, upload, micro/camera, popup OAuth hay thanh toán. Chỉ các tính năng mà ChatGPT cung cấp cho tài khoản và WebKit hiện tại mới có thể sử dụng; không cam kết đầy đủ tính năng của ứng dụng ChatGPT native.

Nội dung và lịch sử của cửa sổ này do ChatGPT quản lý, không tự đồng bộ sang SQLite, dự án hoặc Memory của Unified Workspace. Đây là website thật, không phải API hoặc bản dựng lại giao diện. Để trở về Workspace, chọn cửa sổ Unified AI Workspace.

Cửa sổ remote không được cấp Tauri capability: file capabilities/default.json chỉ áp dụng cửa sổ local `main`, không khai báo remote permissions. Không chèn script vào ChatGPT, không đọc/chép cookie hoặc mật khẩu và không giả user-agent. Điều hướng chỉ cho HTTPS/about:blank; tiêu đề hiển thị hostname đang mở để thấy đích đăng nhập. Có nút **Mở bằng trình duyệt** nếu nhà cung cấp đăng nhập hoặc chức năng website không hỗ trợ WebView; phiên trình duyệt không tự chuyển sang cửa sổ nhúng.

Bản này chưa phải trình duyệt đầy đủ: không có thanh địa chỉ/back/reload riêng, nhiều tab hoặc cam kết xử lý đầy đủ popup/download/voice. Không bypass CAPTCHA, cảnh báo bảo mật hoặc chính sách đăng nhập của nhà cung cấp.
