# ChatGPT trực tiếp trong Unified AI Workspace

Luồng hiện tại dùng Sign in with ChatGPT → Responses API → streaming vào khung chat React → lưu SQLite. Không mở website/cửa sổ ChatGPT riêng. Module nhúng web thử nghiệm đã gỡ vì không đúng trải nghiệm người dùng yêu cầu.

1. Trong **Kết nối AI**, đăng nhập bằng **Continue with ChatGPT**. Chỉ xác thực/đồng ý quyền diễn ra trên trình duyệt hệ thống.
2. Sau khi xác minh xong, app chọn tài khoản và chuyển về màn hình chat. Bấm **Chat với ChatGPT** ở sidebar nếu đang ở màn hình khác hoặc dùng provider khác.
3. Gõ vào ô Tin nhắn, gửi và nhận phản hồi trong cùng hội thoại của app. Giữ hỗ trợ streaming, stop, lịch sử, project instructions, regenerate và nhánh đã có.
4. Kết nối được chọn được ghi nhớ trên máy. Khi chưa chọn, ưu tiên phiên ChatGPT hợp lệ. Nhiều tài khoản vẫn chọn được trong danh sách kết nối dưới ô nhập. Phiên hết quyền yêu cầu đăng nhập lại.

Phạm vi: tài khoản ChatGPT cung cấp quyền inference/model theo SIWC, không đồng nghĩa toàn bộ tính năng của website. Tạo ảnh, file search, Code Interpreter và một số tool khác chưa được hỗ trợ qua SIWC theo giới hạn OpenAI. Chế độ ảnh bị vô hiệu hóa khi chọn ChatGPT để tránh request không được hỗ trợ; không tự chuyển sang API Key và tính phí API. Skill không mở thêm quyền provider.

Lịch sử thuộc SQLite của app, không tự đọc hoặc đồng bộ lịch sử chatgpt.com. Không dùng cookie website, backend nội bộ hoặc nhúng website để giả phản hồi native. Không cam kết voice/upload/chỉnh ảnh hoạt động như ChatGPT native.

Tài liệu: https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations.md
