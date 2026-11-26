# Kết nối tài khoản AI — Accounts Alpha 0.2.0

Cập nhật ngày 26/11/2026. Đây là kết nối để gọi AI, chưa phải đăng nhập tài khoản Unified Workspace hoặc đồng bộ Cloud. Không nhập mật khẩu tài khoản vào ứng dụng; đăng nhập và đồng ý quyền diễn ra trên trình duyệt hệ thống.

## Khả năng của từng nhà cung cấp

| Nhà cung cấp | Phương thức trong app | Điều kiện |
| --- | --- | --- |
| OpenAI | Continue with ChatGPT hoặc API Key | Sign in with ChatGPT dành cho ứng dụng nguồn mở đủ điều kiện hoặc ứng dụng được OpenAI chấp thuận. Provider quyết định quyền, quota và model. |
| Google | Google OAuth cho Gemini API hoặc API Key | Cần Google Cloud project, Desktop OAuth client và quyền/quota Gemini API. Không dùng hạn mức gói Gemini cá nhân. |
| Anthropic | Claude API Key | Chưa triển khai đăng nhập gói Claude Pro/Max. Claude Platform OAuth là chương trình riêng, cần đăng ký/được cấp quyền; không tương đương đăng nhập claude.ai. |

Ứng dụng không nhập lịch sử ChatGPT/Claude/Gemini từ website. Không đọc cookie trình duyệt hoặc dùng lại token của CLI. Danh sách model từ provider không bảo đảm tài khoản được phép inference từng model; lỗi quyền/quota được hiển thị khi kiểm tra hoặc gửi chat.

## Chạy và kết nối ChatGPT

1. Cài dependencies, build native và chạy bằng `pnpm start:local` như README. Đóng phiên cũ trước khi mở bản mới.
2. Vào **Kết nối AI**, chọn **Continue with ChatGPT** và đọc điều kiện sử dụng.
3. Tiếp tục trên trình duyệt, chọn tài khoản/workspace và cấp quyền cho **Unified AI Workspace**. Quay lại app sau khi trình duyệt báo hoàn tất.
4. App chỉ lưu kết nối sau khi xác minh danh tính, phạm vi token và lấy được model catalog. Chọn model rồi dùng kết nối trong chat.
5. Nếu tài khoản/app không được cấp quyền, app giữ trạng thái thất bại. Có thể dùng phương thức API Key với tài khoản API có quyền phù hợp.

Mỗi thiết bị có host ID ổn định. Đăng ký mới dùng dynamic registration; app lưu issued client ID riêng theo kết nối và dùng lại khi đăng nhập lại. Đăng nhập lại không được đổi subject của kết nối cũ; thêm kết nối mới khi muốn dùng tài khoản khác. Không có client ID hoặc secret OpenAI giả định được đóng gói trong app.

## Chuẩn bị Google OAuth

1. Tạo/chọn Google Cloud project; bật **Generative Language API**. Kiểm tra billing, quota và quyền sử dụng project theo yêu cầu của tài khoản.
2. Cấu hình OAuth consent trong Google Auth Platform. Trong giai đoạn thử nghiệm, thêm email dùng thử vào **Test users**; nếu phát hành rộng cần hoàn thành yêu cầu xác minh của Google.
3. Tạo OAuth client loại **Desktop app**. Lấy Client ID, Client secret nếu được cấp và **Project ID** (không dùng tên hiển thị hoặc project number).
4. Trong app chọn Google OAuth, nhập ba trường tương ứng. App mở trình duyệt để người dùng tự hoàn tất đồng ý quyền.
5. App yêu cầu `openid email profile`, `https://www.googleapis.com/auth/cloud-platform` và `https://www.googleapis.com/auth/generative-language.retriever`. Chỉ cấp quyền cho ứng dụng và project bạn quản lý/tin cậy.
6. Chọn model sau khi kết nối được xác minh. Gemini API sử dụng bearer token kèm `x-goog-user-project`; lỗi quota/billing/quyền project cần xử lý trong Google Cloud.

Có thể cấu hình mặc định trong `.env` tại gốc repo, được launcher nạp khi khởi động:

```dotenv
UAI_GOOGLE_CLIENT_ID=your-client.apps.googleusercontent.com
UAI_GOOGLE_CLIENT_SECRET=your-desktop-client-secret
UAI_GOOGLE_QUOTA_PROJECT=your-project-id
```

Đây là ví dụ, không phải credential dùng được. Không đưa `.env`, client JSON hoặc token lên Git. Trường secret không được đọc ngược về UI từ môi trường. Desktop client secret không phải bí mật đủ để định danh một ứng dụng đã phân phối; PKCE vẫn bắt buộc. Có thể nhập cấu hình trực tiếp trên UI thay cho `.env`.

## Vòng đời và lưu trữ

- Rust mở listener loopback `127.0.0.1` ở cổng ngẫu nhiên, đường dẫn `/auth/callback`; mỗi lần dùng PKCE S256, state và nonce mới. Có hủy và timeout 10 phút.
- Kiểm chữ ký JWT RS256 bằng JWKS chính thức, issuer, audience, hạn dùng, nonce và subject. Callback sai state/host hoặc tham số trùng bị từ chối.
- Access/refresh/ID token và Google client secret được mã hóa AES-256-GCM trong SQLite. Khóa mã hóa ngẫu nhiên nằm trong kho bí mật OS, namespace riêng với API Key; ciphertext gắn với connection ID.
- Token không trả về React, export JSON hoặc outbox. Gateway local nhận access token tạm thời để gọi provider; không có E2EE giữa app và provider. Chỉ cho kết nối OAuth dùng Gateway loopback, không chuyển tới Gateway Cloud.
- Tự refresh gần hết hạn, giữ refresh token cũ khi provider không trả token mới; token xoay được lưu cùng transaction. Khi grant không còn hợp lệ, yêu cầu đăng nhập lại.
- **Xóa kết nối** thử revoke ở provider rồi xóa credential local và đánh dấu xóa metadata. Nếu revoke không được xác nhận, app thông báo để người dùng gỡ quyền trong trang quản lý tài khoản provider.
- Migration local 1 → 2 tạo bản sao `.before-v2.backup` khi nâng DB có sẵn, giữ dự án và kết nối API Key. Bản sao DB không chứa khóa giải mã trong OS vault. Không coi bản sao SQLite đơn lẻ là backup tài khoản có thể chuyển máy.

## Kiểm chứng và giới hạn

Có test fixture cho request adapter, model catalog, lỗi và redaction; test UI chỉ bật kết nối sau xác minh native, lỗi và hủy; test Rust cho PKCE, CSRF, nonce, account binding, refresh, mã hóa, loopback callback và nâng cấp DB. Chưa đăng nhập bằng tài khoản thật hoặc gọi inference live trong lần bàn giao này. Test không bảo đảm provider sẽ cấp quyền cho app/tài khoản cụ thể. Bản macOS debug chưa ký/notarize; Windows chưa kiểm runtime thực tế.

Claude consumer login còn thiếu do cần quyền triển khai từ Anthropic, không phải do thiếu nút giao diện. Khi có quyền chính thức cần thêm adapter OAuth Platform, quản lý client/server credentials và billing connection riêng trước khi bật.

## Tài liệu chính thức

- [OpenAI SIWC quickstart](https://developers.openai.com/siwc/quickstart)
- [OpenAI registration và sign-in](https://developers.openai.com/siwc/token-sharing-open-source/sign-in.md)
- [OpenAI models và inference](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference.md)
- [OpenAI sessions và refresh](https://developers.openai.com/siwc/token-sharing-open-source/profiles-and-sessions.md)
- [Gemini API OAuth](https://aistudio.google.com/docs/oauth)
- [Claude Agent SDK](https://code.claude.com/docs/en/agent-sdk/overview)
- [Claude legal/compliance](https://code.claude.com/docs/en/legal-and-compliance)
- [Claude Platform OAuth apps](https://platform.claude.com/docs/en/manage-claude/oauth-apps/overview)
