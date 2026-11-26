# Unified AI Workspace
## Đặc tả triển khai để hoàn thiện ứng dụng

Phiên bản 2.0 • Ngày 26 tháng 11 năm 2026 • Dành cho chủ sản phẩm và lập trình viên

Tài liệu này chuyển bản PRD do chủ sản phẩm cung cấp thành kế hoạch triển khai cho ứng dụng desktop trên Mac bằng Tauri 2, React, TypeScript và Rust, sau đó kiểm thử và phát hành trên Windows. Mục tiêu là hoàn thành một sản phẩm có thể dùng thực tế: chat với OpenAI, Claude và Gemini, giữ lịch sử khi đổi AI, quản lý dự án, bộ nhớ, tài liệu và đồng bộ nhiều máy.

Các lựa chọn được ghi là “chốt cho MVP” là đề xuất kỹ thuật bổ sung để đội phát triển có thể bắt đầu code. Chúng không phải tính năng đã tồn tại trong repository. Các chỉ tiêu hiệu năng và thời gian là mục tiêu nghiệm thu hoặc ước lượng, chưa phải kết quả đo. Tài liệu giúp giảm rủi ro triển khai; khả năng thành công thương mại còn cần được kiểm chứng với người dùng.

Đọc chương 1 đến 3 để nắm phạm vi và kiến trúc; chương 4 đến 10 để triển khai bảy module; chương 11 đến 14 để kiểm thử, vận hành và phát hành. Phụ lục chứa SQL nền tảng, hợp đồng kiểu dữ liệu và checklist bàn giao. Duy trì PRD gốc riêng trong repository để phân biệt yêu cầu ban đầu và các quyết định bổ sung ở bản này.

# 1 Phạm vi hoàn thiện sản phẩm

## 1.1 Giá trị cốt lõi

Một workspace sở hữu lịch sử, dự án, tài liệu và bộ nhớ; mô hình AI là bộ xử lý có thể thay đổi. Khi đổi provider, ứng dụng dựng lại context từ dữ liệu chuẩn của workspace. Không nhập hoặc đồng bộ tự động lịch sử từ tài khoản ChatGPT, Claude hay Gemini dành cho người tiêu dùng.

Người dùng mục tiêu đầu tiên là người làm việc cá nhân như designer, developer, marketer và researcher, thường sử dụng ít nhất hai AI. Hành trình cần tối ưu là tạo dự án, thêm instructions, kết nối API Key, chat, đổi AI, tìm lại thông tin và tiếp tục trên máy khác.

## 1.2 Các mức hoàn thiện

| Mức | Nội dung bắt buộc | Điều kiện chuyển mức |
| --- | --- | --- |
| A Bản chạy nội bộ | macOS, SQLite, một provider, chat streaming, Keychain, export | Mở lại app không mất lịch sử; dừng và lỗi stream an toàn |
| B Alpha | Ba provider, handover, project, Memory duyệt thủ công, tài liệu TXT Markdown PDF có text | Sáu chiều đổi provider vượt bộ test; nguồn Memory xem được |
| C Beta | Google Login, Cloud Sync hai máy, tìm kiếm, xử lý conflict, quyền riêng tư | Test offline, xóa, đăng xuất, tài khoản khác và restore đạt |
| D Phát hành MVP | macOS và Windows đã kiểm thử, ký bộ cài, cập nhật, hỗ trợ người dùng | Vượt toàn bộ release gate chương 13 |

Đây là các mốc nội bộ trong cùng phạm vi MVP, không loại bỏ các chức năng bắt buộc của PRD. Bản phát hành đầu tiên vẫn phải có ba AI, Memory, Knowledge cơ bản và Local–Cloud Sync. Team Workspace, agent, voice, mobile, marketplace, multi-model song song, billing tự động và E2EE toàn bộ để sau MVP.

## 1.3 Chốt phạm vi và giới hạn ban đầu

MVP hỗ trợ một workspace cá nhân trên mỗi tài khoản và nhiều project. Một conversation thuộc tối đa một project; không đổi project sau khi đã có tin nhắn trong MVP. Muốn chuyển, người dùng tạo bản sao để không vô tình đưa ngữ cảnh cũ vào phạm vi mới. User Memory có phạm vi toàn tài khoản; Project Memory chỉ được dùng trong đúng project.

Ngôn ngữ giao diện đầu tiên là tiếng Việt và tiếng Anh, dùng khóa i18n ngay từ đầu. Nội dung chat giữ Unicode, không tự đổi ngôn ngữ. Hỗ trợ Markdown và code; vô hiệu HTML thô. Thêm ảnh cho chat là tính năng mở rộng sau khi text ổn định; mọi khả năng đa phương thức phải được kiểm tra qua capability của model.

Các giới hạn dưới đây là cấu hình sản phẩm ban đầu, có thể điều chỉnh sau đo tải: prompt 32.000 ký tự; request context tối đa 1 MiB; file 20 MiB; PDF tối đa 200 trang; tối đa 20 tài liệu mỗi project trong beta; hai yêu cầu AI đang chạy mỗi tài khoản; 100 mutation hoặc 1 MiB mỗi sync batch; 200 change mỗi pull page. Vượt giới hạn phải báo rõ trước khi xử lý.

## 1.4 Chỉ số sản phẩm để quyết định tiếp tục đầu tư

Theo dõi cohort beta tối thiểu 20 người đồng ý tham gia. Mục tiêu thử nghiệm đề xuất: ít nhất 70% kết nối được AI và nhận câu trả lời đầu trong 10 phút; ít nhất 50% dùng lại trong tuần thứ hai; ít nhất 40% dùng hai provider trong cùng một project. Phỏng vấn các trường hợp thất bại để xác định vấn đề onboarding, chi phí API hay giá trị handover.

Không dùng số lượng token để suy ra doanh thu. BYOK nghĩa là chi phí AI do người dùng trả cho provider; phí workspace và phí AI cần hiển thị riêng. Free, Pro và Ultimate là định hướng thương mại, chưa chốt giá hoặc giới hạn trả phí. Beta chưa xây subscription engine; dùng feature flags và entitlement thủ công để kiểm chứng nhu cầu.

# 2 Quyết định kiến trúc cần thống nhất trước khi code

## 2.1 Luồng dữ liệu mặc định

Chốt cho MVP: React chỉ gọi các command có kiểu của Rust. Rust quản lý SQLite, file, session token và Keychain. Backend Fastify cung cấp AI Gateway, Sync API và dịch vụ Cloud; PostgreSQL và Storage trên Supabase lưu dữ liệu đồng bộ. React không truy vấn trực tiếp database và không giữ API Key sau khi lưu.

```text
React UI
  | typed IPC commands and events
Rust desktop core
  |-- SQLite and local files
  |-- OS secret store
  |-- context builder and local job queue
  |
  | HTTPS bearer session and transient provider key
Fastify API
  |-- AI Gateway --> provider APIs
  |-- Sync service --> PostgreSQL
  |-- File service --> private object storage
  |-- Operational worker --> cleanup and export jobs
```

AI Key mặc định chỉ lưu trong kho bí mật của thiết bị. Khi gọi AI Gateway, Rust đọc Key và gửi qua TLS trong header X-Provider-Key; Gateway dùng trong bộ nhớ cho đúng request, không lưu database, queue hay log. Hạ tầng proxy, tracing và crash reporting phải redact header này. Vì vậy Cloud vẫn tiếp nhận context và Key trong thời gian xử lý; không được quảng cáo chế độ này là “dữ liệu không rời thiết bị”.

Cloud Sync và gọi AI là hai quyền độc lập. Tắt Sync dừng upload lịch sử và file; yêu cầu chat vẫn gửi phần context được chọn qua Gateway tới AI. Onboarding và Privacy phải giải thích điều này. Nếu yêu cầu tương lai là Gateway không được thấy Key, bổ sung đường gọi provider trực tiếp từ Rust như một ADR riêng; chưa triển khai hai đường chạy song song trong MVP.

Không có mạng hoặc Gateway lỗi: xem, sửa metadata, tìm kiếm cục bộ, ghi nháp và export vẫn dùng được; không sinh câu trả lời AI. Không tự gửi các prompt đã soạn offline khi mạng trở lại. Gửi phải do người dùng chủ động để tránh phí phát sinh và câu trả lời ngoài ý muốn.

## 2.2 Ranh giới module

| Module | Sở hữu | Không sở hữu |
| --- | --- | --- |
| UI | Layout, tương tác, view model, hiển thị stream | Secret, SQL tùy ý, quyền truy cập file tùy ý |
| Desktop core | Local transaction, context, Keychain, outbox, file sandbox | Quyền đọc Cloud của tài khoản khác |
| AI Gateway | Validate, adapter, token budget, normalize stream, usage | Lưu lịch sử chat như nguồn chính |
| Sync service | Version, idempotency, cursor, tombstone, authorization | Tự giải quyết conflict nội dung quan trọng |
| Memory engine | Candidate, nguồn, phiên bản, retrieval | Biến mọi phát biểu thành sự thật lâu dài |
| Knowledge engine | Parse, chunk, index, citation | Thực thi lệnh hoặc macro trong tài liệu |

## 2.3 Stack và cấu trúc code

Dùng Tauri 2, React, TypeScript strict, Vite, Tailwind và bộ component phù hợp với shadcn/ui. Zustand giữ trạng thái UI ngắn hạn; TanStack Query quản lý dữ liệu đọc từ command layer và invalidation. Dữ liệu bền vững thuộc SQLite. Backend dùng Fastify và JSON Schema; sinh kiểu API và validator từ một nguồn hợp đồng. PostgreSQL dùng migration có version; không sửa schema trực tiếp trên production.

```text
apps/desktop/src/{app,components,modules,services,i18n}
apps/desktop/src-tauri/src/
  {commands,db,secrets,auth,context,sync,jobs,files}
apps/api/src/{routes,auth,sync,gateway,files,usage}
apps/worker/src/{cleanup,exports,maintenance}
packages/contracts/{http,ipc,events,schemas}
packages/ai-core/{adapters,registry,normalize}
packages/memory-core/{ranking,schemas,evaluation}
packages/design-system/
supabase/migrations/
tests/{fixtures,integration,e2e,security,evals}
docs/{adr,runbooks,release}
```

Không chia sẻ code TypeScript trực tiếp vào Rust. Chia sẻ JSON Schema và fixture; sinh type hoặc viết kiểu Rust tương ứng rồi chạy contract test hai phía. Adapter provider chạy TypeScript ở backend. Context builder desktop chạy Rust; Gateway kiểm tra lại giới hạn, không tự lấy thêm Memory ngoài snapshot client gửi.

## 2.4 Quyết định đã chốt và hệ quả

| ADR | Quyết định | Hệ quả triển khai |
| --- | --- | --- |
| ADR 01 | Local là nguồn thao tác tương tác | Ghi entity và outbox trong cùng transaction |
| ADR 02 | Key riêng trên mỗi thiết bị | Máy mới phải nhập lại Key; chỉ sync metadata kết nối |
| ADR 03 | Context có snapshot độc lập provider | Không dựa vào provider conversation ID để handover |
| ADR 04 | Tin nhắn phân nhánh và nội dung bất biến | Edit và regenerate tạo node mới, giữ node cũ |
| ADR 05 | Memory tự trích xuất phải chờ duyệt | Không tự đưa candidate chưa duyệt vào context |
| ADR 06 | Đồng bộ optimistic concurrency | Server version quyết định conflict; không tin đồng hồ client |
| ADR 07 | Không E2EE toàn bộ ở MVP | Cloud có thể đọc dữ liệu đồng bộ; công khai trong Privacy |
| ADR 08 | Xử lý tài liệu và jobs AI tại desktop | Không cất BYOK để worker Cloud chạy ngầm |

# 3 Yêu cầu phi chức năng và quy ước chung

Định danh là UUID v4 do client sinh; timestamp là UTC RFC 3339. Backend phân biệt created_at do server cấp và client_created_at chỉ để hiển thị thứ tự offline. Không dùng thời gian thiết bị để quyết định phiên bản mới nhất. Mọi record người dùng có owner_id; ownership được lấy từ session, không tin payload.

Mục tiêu đo trên Mac Apple Silicon 16 GB RAM và Windows 11 16 GB với 10.000 message, 100 project, 1.000 Memory: cold start dưới 3 giây ở p95; mở conversation đã có local dưới 300 ms; tìm keyword dưới 500 ms; ghi prompt local dưới 100 ms. Độ trễ provider được đo riêng. Gateway đặt mục tiêu overhead p95 dưới 400 ms, không bao gồm inference. Chưa coi các giá trị này là cam kết khi chưa benchmark.

Accessibility: bàn phím dùng được toàn bộ luồng chính; focus rõ; trạng thái không chỉ biểu thị bằng màu; chữ có thể phóng 200%; component tuân theo mục tiêu WCAG 2.2 AA và phải kiểm tra contrast thực tế. Danh sách dài cần virtualization; stream cập nhật UI theo nhịp 30–60 ms thay vì render mỗi token.

Mọi module phải có mã lỗi ổn định, log metadata đã che bí mật, test đường thành công và đường lỗi, tài liệu thao tác vận hành và migration khi thay đổi dữ liệu. Không ghi nội dung chat vào telemetry mặc định. Các thay đổi phá vỡ sync hoặc IPC yêu cầu nâng schema version và test nâng cấp.

# 4 Đặc tả UI và UX

## 4.1 Bố cục và token thiết kế

Giữ phong cách Midnight Intelligence từ PRD. Sidebar rộng 248 px, cho phép 200–320 px; panel context 320 px, có thể đóng. Vùng chat tối đa 880 px, căn giữa; composer cố định ở đáy vùng trung tâm. Cửa sổ tối thiểu 960 × 640; dưới 1.200 px mặc định đóng panel phải, sidebar chuyển dạng thu gọn theo lựa chọn người dùng. Không thu nhỏ chữ để nhét đủ ba cột.

| Token | Giá trị khởi điểm | Cách dùng |
| --- | --- | --- |
| background | #0B1020 | Mặt nền chính |
| surface và sidebar | #111A2E và #0D1425 | Panel và điều hướng |
| primary và accent | #3478F6 và #54A5FF | Nút gửi và trạng thái focus |
| text và muted | #F4F7FF và #A0AEC0 | Nội dung và metadata |
| border | #26334A | Phân vùng, input |
| success warning error | #22C58B #F5B942 #F06464 | Kèm icon và nhãn chữ |
| spacing | 4 8 12 16 24 32 px | Grid và khoảng cách component |
| type | 14 px UI, 16 px chat, 12 px metadata | Line height 1,45–1,6 |

```text
┌───────────────────┬────────────────────────────┬──────────────────┐
│ Workspace         │ Project / Conversation     │ Context          │
│ New Chat  Search  │ Provider  Model  Sync       │ Instructions     │
│ Conversations     ├────────────────────────────┤ Memory selected  │
│ Projects          │ User message               │ Sources          │
│ Knowledge         │ Assistant response         │ Token budget     │
│ Memory            │ Sources and actions        │                  │
│ Connections       ├────────────────────────────┤                  │
│ Settings Profile  │ Attach  Composer  Send Stop │                  │
└───────────────────┴────────────────────────────┴──────────────────┘
```

Đây là wireframe bố cục, chưa phải bản thiết kế pixel hoàn chỉnh. Trước mỗi module UI, dựng component trong Storybook hoặc trang dev nội bộ với fixture empty, loading, success, error, offline và dữ liệu dài.

## 4.2 Bản đồ màn hình

| ID và route | Thành phần và hành vi | Trạng thái cần có |
| --- | --- | --- |
| UI 01 /welcome | Lợi ích, Google Login, chính sách dữ liệu, mở hướng dẫn BYOK | Chờ, mở trình duyệt, callback timeout, hủy, lỗi |
| UI 02 /setup | Chọn provider, nhập Key, test, lưu; cho bỏ qua kết nối | Key trống, test đang chạy, hợp lệ, thiếu quyền, rate limit |
| UI 03 /chat/:id | Header model, message list, branch switcher, composer, context panel | Empty, streaming, stopped, partial, failed, offline |
| UI 04 /search | Ô tìm, filter project loại thời gian provider, kết quả có snippet | Debounce, không có kết quả, lỗi index, đang rebuild |
| UI 05 /projects | Grid hoặc list, tạo sửa archive; vào project có các tab | Empty, validation, archived, delete pending |
| UI 06 /memory | Tab user và project, candidates, search, editor, nguồn, lịch sử | Pending review, active, superseded, disabled, deleted |
| UI 07 /knowledge | Upload, danh sách, preview text, trạng thái parse và index | Queued, processing, ready, partial, failed, missing local |
| UI 08 /connections | Các kết nối, model mặc định, test và xóa Key | Configured local, missing key, invalid, unavailable |
| UI 09 /settings | Account, appearance, memory, privacy, storage, sync, devices, about | Saving, saved, failed, phiên hết hạn |
| UI 10 /sync | Outbox, last sync, conflict list, retry, resync | Syncing, idle, offline, auth required, conflict |
| UI 11 /conflicts/:id | Hai phiên bản, nguồn máy, thời gian server, chọn giữ hoặc copy | Chưa chọn, đang resolve, conflict mới, resolved |
| UI 12 /usage | Theo ngày provider model, token và chi phí ước tính | Usage thiếu, không có giá, đang tải, dữ liệu một máy |

## 4.3 Luồng gửi và dừng tin nhắn

Composer giữ draft theo conversation và branch, autosave sau 500 ms. Enter gửi; Shift Enter xuống dòng; đang IME composition không gửi. Cmd Enter trên Mac và Ctrl Enter trên Windows là phím gửi bổ sung. Cmd K hoặc Ctrl K mở Search; Cmd N hoặc Ctrl N tạo chat; Esc đóng modal trước, chỉ dừng stream khi focus trong vùng chat và có nút Stop rõ ràng.

Nút Send khả dụng khi có text hoặc attachment được hỗ trợ, Key tồn tại trên thiết bị, session còn hợp lệ và không có generation đang chạy trên branch. Bấm gửi ghi prompt local trước, sau đó dựng context và tạo assistant placeholder. Composer chuyển sang Stop. Nếu ghi local thất bại, giữ draft, không gọi AI. Khi stop, giữ nội dung đã nhận với nhãn “Đã dừng”; không đánh dấu complete.

Lỗi trước token đầu: hiển thị lỗi cạnh assistant placeholder và Retry. Lỗi giữa stream: giữ phần trả lời, nhãn “Phản hồi chưa hoàn tất”, cho Copy hoặc Generate again. Retry tạo generation mới; không ghép tiếp câu trả lời thiếu bằng một request mới. Khi đóng app giữa stream, lần mở sau đánh dấu interrupted và cho tạo lại.

## 4.4 Edit và regenerate

Edit prompt tạo message user mới có parent bằng parent của prompt cũ; các node cũ vẫn tồn tại. Regenerate tạo assistant sibling dưới cùng user message. UI hiển thị bộ chọn nhánh như 1/2, 2/2. Chỉ đường đi từ root tới node được chọn được đưa vào context; không đưa hai câu trả lời sibling vào cùng lịch sử.

Xóa message trong MVP là xóa mềm toàn subtree của branch được chọn. Dialog nêu số tin nhắn bị ảnh hưởng và ảnh hưởng đến nguồn Memory. Xóa conversation xóa mềm toàn conversation. Không có chức năng sửa trực tiếp nội dung assistant đã hoàn tất.

## 4.5 Đổi provider và kiểm tra context

Chọn provider hoặc model chỉ áp dụng lượt tiếp theo. Trong lúc đang stream, khóa thay đổi cho generation đang chạy. Trước khi gửi, panel context cho biết project instructions, các Memory đã chọn, tài liệu và ước tính token; người dùng có thể bỏ một nguồn cho lượt đó. Nếu model mới không hỗ trợ ảnh hoặc file, chặn gửi và cho chuyển sang text đã trích xuất hoặc bỏ file, không âm thầm mất nội dung.

Context lớn phải hiển thị “Đã dùng tóm tắt và bỏ bớt lịch sử cũ”, kèm danh sách phạm vi. Những tin nhắn cũ vẫn có trong lịch sử. Handover giữ thông tin đã chọn, không bảo đảm hai model suy luận hoặc trả lời giống nhau.

## 4.6 Các component cần xây

AppShell, SidebarNav, ConversationList, ProjectPicker, ProviderModelPicker, MessageBubble, MarkdownRenderer, CodeBlock, MessageActions, BranchNavigator, Composer, AttachmentChip, ContextPanel, SourceDrawer, MemoryEditor, ConnectionForm, FileDropzone, SyncIndicator, ConflictDiff, ConfirmDeleteDialog và ErrorState. Component dùng props có kiểu và callback; gọi IPC thông qua module service thay vì gọi trực tiếp rải rác.

Mọi modal trap focus, trả focus về nút mở, có nhãn cho screen reader. Toast chỉ dùng cho kết quả ngắn; lỗi cần hành động phải nằm tại nơi lỗi. Các hành động xóa Key, project, tài khoản và dữ liệu Cloud cần dialog cụ thể; các thao tác lưu bình thường không yêu cầu xác nhận lại.

# 5 Đặc tả cơ sở dữ liệu

## 5.1 Mô hình và quy ước

Chốt cho MVP dùng một bảng memories có scope thay cho hai bảng user_memories và project_memories trong PRD. conversation_summaries và document_chunks là dữ liệu dẫn xuất riêng. message_metadata được gộp vào messages.metadata JSONB; connection_credentials không tồn tại trên Cloud trong chế độ Key cục bộ. project_members, plans, subscriptions, licenses và billing_events để giai đoạn team và thương mại, không tạo bảng trống chỉ để đủ tên.

Mỗi bảng đồng bộ có id UUID, owner_id UUID, version BIGINT, created_at, updated_at, deleted_at và source_device_id. version do server tăng; SQLite lưu thêm server_version và local_revision riêng. Tạo local chưa sync có server_version bằng 0. Payload chỉ gửi các field allowlist; không cho client viết owner_id, version và timestamp server.

```text
auth.users 1 ── 1 profiles
auth.users 1 ── N devices, workspaces, ai_connections
workspace  1 ── N projects, conversations, documents
project    1 ── N conversations, memories, documents
conversation 1 ── N messages, generations, summaries
message    1 ── N messages as children
message    N ── N documents through message_attachments
memory     1 ── N memory_versions and memory_sources
document   1 ── N document_chunks
owner      1 ── N embeddings, sync_changes, sync_receipts
device     1 ── N sync_cursors
```

FK kép owner_id với parent id bảo đảm không gắn child vào đối tượng của tài khoản khác. Service kiểm tra thêm workspace và project khớp nhau, parent chưa bị xóa, branch không có chu trình và role theo đúng state machine. FK đơn thuần không đủ để thực thi tất cả các bất biến nghiệp vụ.

## 5.2 Từ điển dữ liệu nghiệp vụ

Các cột dưới đây là cột đặc thù, cộng với bộ cột chung đã nêu. NN là NOT NULL; dấu ? là nullable; J là JSONB. Phụ lục SQL ghi kiểu, default, constraint và index chính xác cho bản nền tảng.

| Bảng | Cột đặc thù và quy tắc |
| --- | --- |
| profiles | id tham chiếu auth.users; display_name text; locale text; settings J; không đồng bộ token |
| devices | name text NN; platform macos hoặc windows; last_seen_at timestamptz; revoked_at nullable |
| workspaces | name text NN; MVP một workspace cá nhân hoạt động mỗi owner |
| projects | workspace_id UUID NN; name text NN 1–120 ký tự; description text; instructions text; archived boolean |
| ai_connections | provider text NN; name text NN; default_model text?; không có cột Key; trạng thái Key theo thiết bị |
| conversations | workspace_id UUID NN; project_id UUID?; title text NN; selected_leaf_id UUID?; archived boolean |
| messages | conversation_id UUID NN; parent_id UUID?; role user hoặc assistant; content J array; status text; provider text?; model text?; metadata J; nội dung finalized bất biến |
| generations | conversation_id UUID; user_message_id UUID; assistant_message_id UUID; request_id UUID unique mỗi owner; status; input_tokens output_tokens nullable; finish_reason nullable; error_code nullable |
| message_attachments | message_id UUID; document_id UUID; vị trí attachment trong content do block tham chiếu |
| memories | scope user hoặc project; project_id UUID?; category; content; status pending active disabled superseded; confidence 0–1; dedupe_key; expires_at nullable |
| memory_versions | memory_id UUID; memory_revision integer; snapshot J; reason text; provenance và sửa thủ công lưu trong snapshot |
| memory_sources | memory_id UUID; message_id UUID?; document_id UUID?; excerpt text; đúng một nguồn; không lưu secret |
| conversation_summaries | conversation_id UUID; through_message_id UUID; path_hash text; summary text; source_hash text; chỉ dùng khi nguồn còn hợp lệ |
| documents | workspace_id UUID; project_id UUID?; name; mime; byte_size; sha256; storage_key nullable; processing_status; extraction_version; không lưu local absolute path trên Cloud |
| document_chunks | document_id UUID; extraction_version integer; ordinal integer; text; page_no nullable; source_locator J; content_hash; UNIQUE owner document version và ordinal |
| embeddings | memory_id UUID? hoặc chunk_id UUID?; vector_model text; dimensions integer; embedding vector không cố định dimension ở cột; source_hash text; đúng một nguồn |

selected_leaf_id chỉ là gợi ý UI đồng bộ; branch đang xem trên từng máy ưu tiên local. Không dùng selected_leaf_id để quyết định parent cho prompt sau mà không kiểm tra conversation_id. Cột này có thể trỏ vào node vừa xóa; service phải đưa về ancestor còn tồn tại.

## 5.3 Bảng vận hành Cloud và Local

| Bảng | Nội dung và vòng đời |
| --- | --- |
| sync_heads Cloud | owner_id PK, cursor BIGINT; khóa hàng trước mọi batch mutation |
| sync_changes Cloud | owner_id và cursor PK, entity_type, entity_id, version, op, snapshot J; phát sinh trong cùng transaction domain |
| sync_receipts Cloud | owner_id và mutation_id PK; request_hash, result J, created_at; giữ cùng cửa sổ dedupe |
| sync_cursors Cloud | owner_id và device_id PK; cursor đã ack, updated_at; hỗ trợ quan sát retention |
| usage_logs Cloud | request_id, provider, model, tokens nullable, estimated_cost nullable, price_version, duration_ms, status; không lưu prompt |
| audit_logs Cloud | event, actor, device, target, request_id, metadata đã redact; append only |
| generation_requests Cloud | Ledger request_id, request_hash, trạng thái và upstream_id; không chứa context hay Key |
| file_uploads Cloud | upload intent, expected hash, size, storage key, expiry và trạng thái; metadata file có thể chưa sync |
| cloud_jobs Cloud | Export và cleanup, lease, retry, result_storage_key; không nhận BYOK |
| sync_snapshots Cloud | Snapshot vật hóa theo owner, epoch và watermark, key blob và expiry |
| local_outbox SQLite | mutation_id PK, entity_type, entity_id, base_version, payload_json, state, attempts, next_retry_at, hash |
| local_conflicts SQLite | conflict_id, entity_type, entity_id, base, local, remote JSON, remote_version, resolved_at |
| local_jobs SQLite | id, kind, dedupe_key unique, payload, state, attempts, next_retry_at, lease_until, error_code |
| local_secrets SQLite | connection_id, opaque keychain_ref, last_test_status; không có giá trị Key |
| local_files SQLite | document_id, relative_path, download_status, verified_hash; path nằm trong app data |
| local_server_snapshots SQLite | Bản server đã ack cho từng entity, tách local overlay để rebase và diff |
| local_context_snapshots SQLite | request_id, source refs có revision, snapshot_hash và thời gian; không có Key |
| local_memory_suppressions SQLite | dedupe_key và expiry của thông tin đã quên, không có nội dung Memory |
| local_meta SQLite | account_id, schema_version, sync_cursor, device_id, last_backup_at; không lưu refresh token |

deleted_entities trong PRD được triển khai bằng deleted_at trên entity và bản ghi op=delete trong sync_changes. Không xóa vật lý tombstone khi vẫn còn nằm trong cửa sổ replay. Không coi Supabase Auth session là bảng app tự quản lý; token và session thuộc Auth, thiết bị app được quản lý trong devices.

## 5.4 Index và ràng buộc truy vấn

Index bắt buộc: conversations(owner_id, updated_at DESC); messages(owner_id, conversation_id, created_at, id); messages(owner_id, parent_id); projects(owner_id, workspace_id); memories(owner_id, scope, project_id, status); documents(owner_id, project_id, processing_status); document_chunks(owner_id, document_id, ordinal); sync_changes(owner_id,cursor); usage_logs(owner_id,created_at). Unique request_id theo owner ngăn ghi usage lặp.

Keyword search cục bộ dùng SQLite FTS5 trên text đã chuẩn hóa của message, memory và chunk. Lưu nguyên văn riêng, không bỏ dấu tiếng Việt trong nguồn. Có thể thêm một cột search không dấu để cải thiện tìm kiếm; không thay thế nội dung chuẩn. Cloud dùng tsvector cấu hình simple cho dữ liệu đa ngôn ngữ và GIN; chỉ bổ sung khi có chức năng tìm từ Cloud. Embedding beta khối lượng nhỏ có thể exact scan sau tenant filter; chỉ thêm HNSW theo model và dimension khi benchmark chứng minh cần.

## 5.5 Migration và dữ liệu cục bộ

Cloud chạy migration SQL trong phụ lục trên Supabase staging mới; SQL này là baseline cần integration test trước production. SQLite có migration riêng, không chạy nguyên SQL PostgreSQL. UUID, timestamp, JSON chuyển thành TEXT, boolean thành INTEGER với CHECK, vector lưu BLOB có version hoặc bỏ qua khi chưa bật semantic search. Bật foreign_keys, WAL và busy_timeout; SQLite WAL có yêu cầu vận hành riêng, xem nguồn S5.

Phụ lục có migration SQLite cho các bảng kỹ thuật local. Domain schema phải được sinh từ manifest chung và kiểm tra parity với Cloud, ngoại trừ dữ liệu server-only. Không viết một bảng local chứa toàn bộ entity trong JSON nếu cần FK và search. Ghi schema_version và checksum migration; trước nâng version tạo backup bằng SQLite backup API. Khi migration lỗi, rollback transaction và mở chế độ khôi phục, không xóa DB để “sửa nhanh”.

Không downgrade database tại chỗ khi rollback binary. Dùng expand rồi migrate rồi contract: thêm cột nullable, release code đọc cả hai, backfill, rồi mới bỏ cột ở release sau. Với field mới mà client cũ không hiểu, server không nhận mutation ghi đè toàn record; chỉ nhận patch allowlist có version.

# 6 Đặc tả API và IPC

## 6.1 Quy ước chung

Base URL trong ví dụ là https://api.example.invalid/v1, chỉ là placeholder cần thay khi triển khai. API Cloud dùng Bearer access token Supabase; server kiểm chữ ký, issuer, audience và expiry bằng thư viện JWT chuẩn và JWKS có cache. Lấy sub làm owner_id; nếu thiết bị bị revoke thì trả DEVICE_REVOKED. Token service role tuyệt đối không đóng gói trong app.

Request JSON reject unknown fields; giới hạn body trước parse; UUID chuẩn, tên đã trim, phân trang bằng cursor opaque. Các endpoint đọc trả data và next_cursor. Lỗi có error.code, message, request_id và retryable; details chỉ chứa field validation hoặc metadata không nhạy cảm. Không trả raw provider body hay SQL error cho client.

Mọi mutation domain từ desktop đi qua /sync/push. Các route tạo sửa xóa của PRD là thao tác logical tương ứng ở command layer; không mở thêm đường CRUD Cloud ghi thẳng mà bỏ qua change log. Nếu sau này có web client, các CRUD route phải gọi cùng Sync Mutation Service trong cùng transaction.

## 6.2 Hợp đồng endpoint MVP

| Method và route | Request và validation | Response hoặc lỗi chính |
| --- | --- | --- |
| GET /account | Bearer token | profile, workspace, entitlements; 401 |
| POST /devices | name 1–80, platform enum, id UUID | device; 409 id reused |
| GET /devices | cursor, limit 1–100 | devices; không trả token |
| DELETE /devices/:id | owner check | 204; revoke app device, không hứa thu hồi offline tức thì |
| GET /providers | registry version tùy chọn | providers và capabilities |
| GET /models | provider bắt buộc | registry, verified_at, limits, pricing_version nullable |
| POST /connections/test | provider, model?; Key trong header | valid, model_available, capabilities; lỗi 422 hoặc 429 |
| POST /chat/completions | contract chương 6.3, Idempotency-Key | SSE; 409 duplicate generation |
| POST /generations/:id/cancel | request_id thuộc owner | 202 stopping hoặc 200 already_terminal |
| GET /generations/:id | owner | trạng thái ngắn hạn, không phải nguồn lịch sử |
| POST /memory/extract | source messages đã chọn, scope, project_id? | candidates có source; không tự ghi active |
| POST /memory/search | query 1–2.000, project_id?, k 1–20 | kết quả Cloud đã lọc owner, chỉ dữ liệu đã sync |
| POST /embeddings | connection provider tương thích, texts, model | vectors, dimensions, usage; có consent riêng |
| POST /files/upload-intent | document_id, sha256, size, mime | upload_id, signed_url TTL 5 phút, storage_key |
| POST /files/:id/complete | upload_id, hash; kiểm quyền | stored hoặc checksum mismatch |
| GET /files/:id/download | owner, chưa deleted | signed URL TTL 60 giây; 404 |
| DELETE /files/:id/blob | tombstone domain đã commit | 202 cleanup queued; idempotent |
| POST /sync/push | schema_version, device_id, mutations | accepted hoặc conflict; chương 9 |
| GET /sync/pull | cursor, limit 1–200, device_id | changes, next_cursor, has_more; 410 reset required |
| POST /sync/ack | device_id, cursor không vượt head | cursor đã ghi nhận |
| GET /sync/snapshot | cursor phân trang của snapshot | batch dữ liệu chuẩn và watermark |
| GET /usage/summary | from và to UTC tối đa 90 ngày | theo provider, token nullable, cost estimated |
| POST /account/export | scope, include_files | job_id; ZIP qua signed URL khi xong |
| GET /jobs/:id | owner | queued running complete failed, result_url? |
| DELETE /account | xác thực mới, confirmation token ngắn hạn | 202 deletion_pending; không chạy ngay từ một click |
| GET /health/live | public | trạng thái process; không lộ cấu hình |
| GET /health/ready | internal hoặc bảo vệ | kết nối DB và queue; không tiết lộ cho public |

Đăng nhập, refresh và logout dùng API hoặc SDK chính thức của Supabase Auth từ Rust, không tự phát minh password flow. /auth/session, /auth/refresh và /auth/logout trong PRD là facade tùy chọn, không cần thêm một lớp lưu token ở backend MVP. /documents/process là command local vì parsing và index chạy trên desktop; Cloud chỉ giữ artifact đã kiểm tra.

## 6.3 Request sinh phản hồi

```json
{
  "request_id": "<uuid>",
  "conversation_id": "<uuid>",
  "user_message_id": "<uuid>",
  "assistant_message_id": "<uuid>",
  "connection_id": "<uuid>",
  "provider": "openai",
  "model": "<registry-model-id>",
  "context": {
    "schema_version": 1,
    "instructions": "Trả lời bằng tiếng Việt",
    "messages": [{"role":"user","content":[
      {"type":"text","text":"Tiếp tục phần thiết kế"}
    ]}],
    "sources": [],
    "snapshot_hash": "<sha256>"
  },
  "max_output_tokens": 2048,
  "stream": true
}
```

Các dấu <...> là placeholder, phải thay bằng giá trị thật trước khi validate. Header Idempotency-Key bằng request_id; X-Device-Id là thiết bị đã đăng ký; X-Provider-Key chỉ được native HTTP layer thêm vào. Không chấp nhận base_url tùy ý từ request MVP để tránh SSRF và gửi Key sai đích. Registry là allowlist endpoint và model.

Context là snapshot do người dùng chủ động gửi, có thể chứa dữ liệu chưa sync. Gateway không yêu cầu conversation đã tồn tại Cloud, không tự lưu snapshot vào Cloud history và không truy xuất thêm tài nguyên từ ID chưa kiểm quyền. Snapshot hash dùng cho kiểm tra nhất quán, không phải chữ ký bảo mật. Không tin một user_id nếu client gửi trong context.

## 6.4 Streaming và tính nhất quán

Dùng POST với fetch hoặc HTTP client Rust để đọc SSE; không dùng EventSource trình duyệt vì cần body, header và native secret. Content-Type text/event-stream; Cache-Control no-cache; tắt proxy buffering. Event có seq tăng trong một generation; heartbeat comment mỗi 15 giây; connect timeout 10 giây, first event timeout 60 giây, idle 60 giây, tổng request 300 giây, tất cả cấu hình được.

```text
event: generation.started
data: {"request_id":"...","seq":1}

event: text.delta
data: {"request_id":"...","seq":2,"text":"Xin chào"}

event: usage.updated
data: {"seq":3,"input_tokens":100,"output_tokens":20}

event: generation.completed
data: {"seq":4,"finish_reason":"stop"}
```

Terminal event duy nhất là completed, cancelled hoặc failed. Sau terminal bỏ qua delta đến muộn. seq trùng bỏ qua, seq thiếu đánh dấu stream lỗi; không hứa resumable stream trong MVP. Rust checkpoint buffer local mỗi 500 ms hoặc 4 KiB; finalized commit ngay khi terminal. Không sync từng token; chỉ sync message sau terminal, kể cả interrupted. Usage có thể đến sau text cuối; chỉ hiển thị “không có số liệu” khi provider không trả, không gán 0.

Gateway giữ ledger request_id với hash và trạng thái trong bảng generation_requests tối thiểu 24 giờ; không lưu Key hoặc context. Request trùng cùng hash đang chạy trả 409 GENERATION_IN_PROGRESS; đã terminal trả trạng thái để client không tự gọi provider lần nữa; khác hash trả 409 IDEMPOTENCY_KEY_REUSED. Ledger này không bảo đảm provider chưa tính tiền nếu process chết giữa lúc gọi API và ghi trạng thái. Trạng thái không rõ yêu cầu người dùng chủ động generate lại với ID mới.

## 6.5 Validation lỗi và rate limit

| HTTP | Code | Hành vi client |
| --- | --- | --- |
| 400 | VALIDATION_ERROR | Hiển thị field cụ thể, giữ draft |
| 401 | SESSION_EXPIRED | Refresh một lần; thất bại yêu cầu đăng nhập |
| 403 | DEVICE_REVOKED hoặc FORBIDDEN | Dừng sync và AI; không xóa local âm thầm |
| 404 | NOT_FOUND | Không phân biệt tài nguyên không tồn tại và không thuộc owner |
| 409 | VERSION_CONFLICT hoặc IDEMPOTENCY_KEY_REUSED | Mở resolver hoặc báo request không nhất quán |
| 410 | SYNC_RESET_REQUIRED | Quy trình snapshot không mất outbox |
| 413 | PAYLOAD_TOO_LARGE | Hướng dẫn giảm prompt, file hoặc context |
| 422 | MODEL_UNSUPPORTED hoặc CONTEXT_TOO_LARGE | Đổi model hoặc context, không tự đổi provider |
| 429 | RATE_LIMITED hoặc PROVIDER_QUOTA | Tôn trọng Retry-After; không retry vô hạn |
| 502 | PROVIDER_ERROR | Giữ partial; hiện retry chủ động |
| 503 | TEMPORARILY_UNAVAILABLE | Backoff cho sync; chat trước token có chính sách riêng |
| 504 | PROVIDER_TIMEOUT | Đánh dấu interrupted; không khẳng định không tính phí |

Giới hạn ban đầu: test connection 5 lần/phút/user, tạo generation 20 lần/phút/user và 2 stream đồng thời; sync 60 batch/phút/device; search 60 lần/phút/user. Dùng distributed limiter khi có nhiều API instance. Không coi IP là danh tính duy nhất. Retry tự động chat chỉ tối đa một lần trước khi request được chuyển upstream và chắc chắn chưa phát sinh generation; sau khi đã gửi provider không tự replay.

## 6.6 IPC contract desktop

```typescript
type NativeCommand =
  | {name:'conversation.create'; input:{projectId?:string}}
  | {name:'chat.send'; input:{conversationId:string;
      parentId?:string; text:string; attachmentIds:string[];
      connectionId:string; model:string}}
  | {name:'chat.cancel'; input:{requestId:string}}
  | {name:'connection.save'; input:{provider:string;
      name:string; apiKey:string}}
  | {name:'memory.approve'; input:{id:string; revision:number}}
  | {name:'sync.retry'; input:{}}
  | {name:'data.export'; input:{includeFiles:boolean}};
```

Trong code thật, mỗi command có schema riêng, kiểu provider enum và response rõ. apiKey chỉ xuất hiện trong input lưu Key, không xuất hiện response/event. Cho phép clipboard paste vào trường Key, xóa state ngay sau submit. Event chat chỉ gửi request_id, delta, status, usage; event sync gửi trạng thái và số lượng, không gửi secret.

# 7 Đặc tả tích hợp AI và chuyển context

## 7.1 Canonical model và interface adapter

```typescript
type Block =
  | {type:'text'; text:string}
  | {type:'image'; attachmentId:string; mime:string}
  | {type:'document'; attachmentId:string; extractedText:string};
type Turn = {id:string; role:'user'|'assistant'; content:Block[]};
type ModelCaps = {text:boolean; image:boolean; json:boolean;
  tools:boolean; contextWindow:number; maxOutput:number};
interface ProviderAdapter {
  validate(req:CanonicalRequest, caps:ModelCaps):void;
  countOrEstimate(req:CanonicalRequest):Promise<TokenEstimate>;
  stream(req:CanonicalRequest, secret:SecretHandle,
    signal:AbortSignal):AsyncIterable<NormalizedEvent>;
  normalizeError(error:unknown):AppError;
}
```

SecretHandle là reference trong process, không serialize. CanonicalRequest không chứa secret; chứa system instructions, messages, options, model và request_id. normalized event theo chương 6.4. provider_extensions chỉ lưu trường đã allowlist và version schema; không lưu raw response tùy ý, reasoning ẩn, credential hoặc tool state không dùng được ở provider khác.

## 7.2 Adapter từng provider

OpenAI Adapter dùng Responses API và ánh xạ event text delta cùng trạng thái hoàn tất về normalized event. Không phụ thuộc previous_response_id để giữ lịch sử. Các event thực tế và API cần theo tài liệu S1. Dùng model ID từ registry đã test bằng tài khoản triển khai, không hard-code tên model trong UI.

Claude Adapter dùng API Messages chính thức; tách instructions và hội thoại theo schema SDK đã pin. Chuẩn hóa role, content block, stop reason và usage. Không giả định endpoint tương thích OpenAI. Trang tham chiếu S2 có thể thay đổi version API; lock SDK và version header trong ADR, fixture và test live trước release.

Gemini Adapter dùng API hoặc SDK gốc của Google với version đã pin, ánh xạ system instruction và role assistant sang định dạng model tương ứng. Xử lý phản hồi bị chặn, không có candidate và usage thiếu. Tài liệu S3 hiện mô tả native text generation và streaming; không dựa vào một schema ví dụ cũ để suy ra schema đang dùng. Adapter phải có fixture đúng API revision đã chọn. Không dùng lớp OpenAI-compatible làm giao diện chung cho cả ba provider.

Trong milestone tích hợp, developer tạo manifest cho mỗi adapter gồm sdk_package, sdk_version, api_revision, endpoint_allowlist, model_ids và verified_at; chốt phiên bản sau spike thực tế, commit lockfile. Đây là việc cần làm trước viết parser, không phải trường cấu hình người dùng phải tự đoán. Không ghi tên model hay giá như cam kết lâu dài trong tài liệu này.

## 7.3 Xây dựng context có giới hạn

Context builder chạy trên branch được chọn. Thứ tự ưu tiên là quy tắc bảo mật ứng dụng, project instructions, prompt hiện tại, các lượt gần nhất, Memory đã duyệt, chunks tài liệu, rồi summary cho đoạn lịch sử đã lược bỏ. Dữ liệu truy xuất được bọc như nguồn tham khảo, không nâng thành system instruction. Người dùng luôn được xem loại nguồn và phạm vi đã gửi.

Ngân sách input B = min(context_window − reserved_output − safety_margin, product_input_cap). reserved_output bằng max_output_tokens nhưng không vượt maxOutput; safety_margin mặc định max(1.024 token, 10% context_window); product_input_cap khởi điểm 32.000 token. Đây là giới hạn sản phẩm, không phải giới hạn chung của provider. Nếu B không đủ cho rules, project instructions và prompt hiện tại, chặn gửi và yêu cầu rút ngắn.

Phân bổ phần còn lại khởi điểm: 55% lịch sử gần, 15% Memory, 20% tài liệu, 10% summary; phần chưa dùng được chia lại. Giữ nguyên cặp user/assistant, không cắt giữa content block hoặc cặp tool call. Chưa hỗ trợ tool execution trong MVP. Lịch sử bị thiếu phải có summary hoặc nhãn lược bỏ; không tự bịa nội dung để nối mạch.

Đếm token bằng phương thức phù hợp provider khi khả dụng; nếu chỉ estimate thì đánh dấu estimated và giữ margin lớn hơn. Khi provider báo context too large trước sinh output, giảm phần nguồn không bắt buộc theo thứ tự summary cũ, tài liệu ít liên quan, Memory ít liên quan, lịch sử xa; yêu cầu người dùng gửi lại sau preview nếu nội dung thay đổi đáng kể.

## 7.4 Thuật toán handover

1. Đóng băng selected branch, model capabilities và revision của instructions tại thời điểm gửi.
2. Lấy message finalized còn hiệu lực trên đường ancestor; không lấy sibling, pending hoặc message deleted.
3. Kiểm tra loại block; file không tương thích chỉ chuyển sang text khi người dùng đã đồng ý.
4. Lấy Memory và knowledge đúng owner, workspace và project, áp dụng ngân sách.
5. Thêm summary hợp lệ cho đoạn cũ; lưu context_snapshot gồm ID, revision và hash nguồn tại local.
6. Gateway kiểm tra request, dùng adapter tương ứng, stream về cùng generation state machine.
7. Finalize assistant với provider và model thực tế; không thay metadata của lượt cũ.

Đính kèm luôn tham chiếu ID nội bộ; không chuyển provider file_id sang provider khác. Nếu phải upload sang provider, thực hiện riêng theo chính sách retention của họ và lưu mapping có expiry. Tính năng này chỉ mở sau text và RAG; không âm thầm upload toàn bộ project để “giữ context”.

## 7.5 Registry và thay đổi API

Registry chứa provider, model_id, display_name, capabilities, context_window, max_output, status, verified_at và price_version nullable. Server phát hành registry có version; desktop cache 24 giờ và giữ bản cuối hợp lệ. Model bị retire vẫn hiện trong lịch sử nhưng không dùng cho lượt mới. Không tự chuyển sang model khác có chi phí cao hơn; gợi ý và để người dùng chọn.

Usage lưu input/output/cache/reasoning token khi provider trả được và schema hỗ trợ. Giá ước tính = tổng từng loại token nhân đơn giá đúng price_version; bỏ phần không biết và gắn nhãn thiếu dữ liệu. Không suy ra chi phí chính xác chỉ từ ký tự hoặc tổng token chung.

# 8 Đặc tả Memory và Knowledge Engine

## 8.1 Loại thông tin và quyền lưu

User Memory gồm sở thích, cách làm việc và quy tắc cá nhân được người dùng cho phép. Project Memory gồm mục tiêu, quyết định, ràng buộc và trạng thái công việc của một project. Conversation summary là cache có nguồn, không tự trở thành Memory lâu dài. Knowledge giữ tài liệu và chunks, không biến toàn bộ nội dung file thành sự thật về người dùng.

Mặc định auto extraction tắt trong onboarding; khi bật, hệ thống tạo candidate chờ duyệt. Lệnh rõ ràng “hãy nhớ” tạo candidate được preview và lưu sau thao tác xác nhận nguồn và scope. Manual add trực tiếp active vì chính người dùng nhập. Không lưu API Key, password, token hoặc cookie; dữ liệu cá nhân nhạy cảm chỉ cho lưu thủ công sau thông báo riêng phù hợp phạm vi.

## 8.2 Pipeline trích xuất và cập nhật

1. Sau một lượt assistant completed, job local lấy một cửa sổ hội thoại có hash và phạm vi cố định. Không chạy trên message partial hoặc từ project khác.
2. Bộ lọc trước loại secret pattern và đoạn người dùng không cho lưu. Chỉ gửi phần tối thiểu tới model đã chọn, với consent cho phân tích Memory.
3. Gateway trả JSON theo schema candidate: scope, category, content, confidence, source_message_ids, reason và proposed_action.
4. Validate JSON, độ dài 1–2.000 ký tự, nguồn phải thuộc cửa sổ đã gửi; reject ID không tồn tại. Confidence là tín hiệu của model, không phải xác suất đúng đã hiệu chuẩn.
5. Chuẩn hóa nội dung để tính dedupe_key theo owner, scope, project và category. Exact hash trùng bỏ qua; tương tự về nghĩa chỉ gợi ý hợp nhất, không tự ghi đè.
6. Candidate mới ở pending. Người dùng chọn approve, edit, merge hoặc discard. Approve ghi Memory cùng memory_versions và nguồn trong một local transaction.
7. Khi sửa, tăng memory_revision, giữ bản cũ và lý do. Với mâu thuẫn như công nghệ cũ và mới, tạo bản thay thế có liên kết trong snapshot và đánh dấu superseded sau duyệt.
8. Index embedding theo source_hash và model. Nếu nội dung đổi hoặc bị xóa, vector cũ không được retrieval; sync đúng policy.

Job có dedupe_key = kind + source_hash + pipeline_version, retry tối đa 3 lần có backoff, lease 60 giây. App mở lại reclaim lease hết hạn. Nếu Key không còn, trạng thái blocked_missing_key, chờ người dùng; không chuyển Key sang Cloud worker. Có nút hủy và xem lỗi; không vòng lặp tốn token vô hạn.

## 8.3 Retrieval đúng phạm vi

Trước ranking phải lọc owner và status=active và chưa hết hạn. Phạm vi hợp lệ gồm User Memory của owner và Project Memory đúng project hiện tại. Trong chat không project chỉ dùng User Memory. Không dùng project_id do model tự sinh. Tắt Memory ở conversation làm retrieval và extraction đều tắt cho conversation đó.

Tìm keyword cục bộ luôn khả dụng. Semantic search là tăng cường: chỉ khi có embedding cùng vector_model và dimensions; không trộn vector khác model trong cùng phép đo. Người dùng không có embedding provider vẫn chat và dùng Memory theo keyword hoặc pin. Chọn embedding connection riêng, thông báo phí và consent; không giả định mọi tài khoản dùng OpenAI.

Lấy tối đa 20 candidate keyword và 20 semantic, hợp nhất bằng reciprocal rank fusion với k=60, loại trùng nguồn, đưa về tối đa 8 Memory và 6 chunks trong budget. Ưu tiên pinned manual memory nhưng vẫn phải phù hợp scope và ngân sách. Điểm confidence không được thay thế permission. Nếu không có kết quả đạt điều kiện thì trả rỗng.

Lưu retrieval_trace cục bộ gồm query hash, source IDs, revisions, điểm, token estimate và exclusion reason; không lưu raw prompt trong telemetry. Panel context giải thích nguồn được chọn. Dataset đánh giá ban đầu 50 tình huống có expected sources, negative sources và câu hỏi nhiều project; mục tiêu đề xuất Recall@8 tối thiểu 0,85 và cross-project leakage bằng 0.

## 8.4 Summary và quên thông tin

Tạo summary khi context gần đầy hoặc sau 20 lượt completed, theo chính branch và through_message_id. Summary chứa mục tiêu, quyết định, việc đã làm, việc còn lại và phần chưa chắc; mỗi kết luận có nguồn. path_hash và source_hash giúp vô hiệu summary khi edit branch hoặc xóa nguồn. Summary cũ không dùng để tái sinh Memory vừa bị người dùng xóa.

Xóa Memory tạo tombstone, bỏ vector và cache retrieval ngay local; gửi tombstone Cloud, các máy khác loại khỏi context khi pull. Giữ dedupe suppression key không có nội dung trong 90 ngày để pipeline không tự đề xuất lại cùng thông tin đã quên; manual add vẫn được. Không hứa thu hồi nội dung đã gửi AI trước đó. Khi xóa nguồn message, Memory suy ra từ nguồn đó chuyển pending_review nếu không còn nguồn hợp lệ; Memory người dùng nhập thủ công giữ nguyên và đánh dấu nguồn không còn.

## 8.5 Knowledge ingestion và citation

MVP nhận TXT UTF-8, Markdown và PDF có text. DOCX không macro bổ sung sau parser sandbox; CSV ở dạng text có giới hạn hàng và cột. Ảnh và PDF scan cần OCR là giai đoạn sau; UI báo “chưa trích xuất được text”, không đánh dấu ready sai. Giữ lộ trình định dạng rộng trong PRD nhưng chốt tập hỗ trợ thực tế trước beta.

File được copy vào app data, tính SHA-256, kiểm magic bytes và size, rồi parser chạy background với timeout 60 giây/file và giới hạn bộ nhớ. Không chạy JS, macro hoặc command trong file. Tên file chỉ để hiển thị; đường dẫn lưu dùng UUID và extension allowlist, không ghép trực tiếp từ filename. Preview mặc định là text đã sanitize; link ngoài mở qua xác nhận hệ thống phù hợp.

Chunk khởi điểm 600 token, overlap 80; ưu tiên ranh giới heading và đoạn. Lưu page_no, heading, char offsets và extraction_version để citation có thể nhảy về nguồn. File hash giống chỉ dedupe trong cùng owner và cùng phạm vi; không dùng global dedupe tiết lộ sự tồn tại tài liệu của user khác.

State machine: queued → extracting → chunking → indexing → ready; có failed, cancelled và ready_keyword_only. Index embedding lỗi không được làm mất text search. Reprocess tạo generation dữ liệu dẫn xuất mới, switch active khi hoàn tất rồi dọn bản cũ; không trả chunks nửa cũ nửa mới.

Trong prompt gắn nhãn nguồn D1, D2 và locator; response chỉ render citation khi ID thuộc context snapshot và còn quyền. Không cho AI tạo URL signed tùy ý. Bấm nguồn mở viewer local hoặc tải qua API được kiểm quyền. Khi xóa document, tombstone metadata và chặn retrieval ngay; cleanup blob, chunks, embeddings chạy idempotent sau đó.

# 9 Đặc tả Sync Engine

## 9.1 Mô hình nhất quán

Đồng bộ ở mức entity, dùng optimistic concurrency theo server_version; không LWW theo đồng hồ thiết bị. Tin nhắn finalized là append-only, conflict chủ yếu ở metadata, project instructions và Memory. Stream partial không đồng bộ từng token. File blob đồng bộ riêng với metadata; không gửi file nhị phân trong /sync/push.

Local state gồm bản server đã ack và local overlay chưa ack. Mỗi thao tác UI tăng local_revision, cập nhật entity và thêm outbox trong cùng transaction SQLite. Với cùng entity, chỉ một mutation inflight; thao tác tiếp theo xếp sau và dùng version sau ack. Có thể coalesce các patch chưa gửi, nhưng không sửa payload hoặc hash của mutation đã gửi.

## 9.2 Push contract và transaction server

```json
{
  "schema_version": 1,
  "device_id": "<uuid>",
  "mutations": [{
    "mutation_id": "<uuid>",
    "entity_type": "projects",
    "entity_id": "<uuid>",
    "operation": "upsert",
    "base_version": 3,
    "patch": {"name":"Phiên bản mới"}
  }]
}
```

Một batch tối đa 100 mutation, thứ tự parent trước child. Trong MVP batch là atomic: một conflict rollback toàn batch; response 409 gồm mutation conflict và remote snapshot, không ack một phần. Client có thể tách batch nhỏ độc lập để không chặn các entity không liên quan. mutation_id có receipt trong cùng transaction; retry batch đã thành công trả cùng kết quả, không tăng version lần nữa. Trộn receipt cũ và mutation mới trong retry batch chỉ được xử lý theo từng receipt, với toàn phần mutation mới vẫn atomic.

Server xác thực owner và device; khóa sync_heads của owner bằng SELECT FOR UPDATE; kiểm receipt và request_hash; validate parent scope; so base_version với version hiện hành. Create yêu cầu base_version=0 và UUID chưa tồn tại; update yêu cầu bằng version; delete cũng phải có version đúng. Tăng version, ghi snapshot canonical, tăng cursor theo từng mutation, ghi sync_changes và sync_receipts, commit; chỉ trả ack sau commit.

Không dùng BIGSERIAL một mình làm watermark đồng bộ: thứ tự cấp sequence có thể khác thứ tự commit và khiến bỏ sót thay đổi. Khóa head theo owner giữ thứ tự cursor và commit thống nhất. Mọi đường ghi domain, kể cả thao tác admin hoặc job sửa dữ liệu, phải đi qua mutation service này hoặc ghi change cùng transaction và cùng lock.

Client nhận ack không được ghi đè các edit local xuất hiện sau khi gửi. Dùng local_revision đã chụp lúc send: nếu bằng revision hiện tại có thể thay canonical và bỏ overlay; nếu khác thì chỉ cập nhật bản server, rebase mutation kế tiếp hoặc đưa vào conflict. Xóa outbox và lưu ack trong cùng local transaction.

## 9.3 Pull và chống mất dữ liệu khi crash

GET /sync/pull?cursor=C lấy changes có cursor lớn hơn C, thứ tự tăng, giới hạn 200. Response chứa next_cursor bằng cursor cuối đã trả; trang rỗng giữ C hoặc trả head đã xác nhận không có gap. Client áp dụng entity và cursor trong cùng SQLite transaction. Nếu crash trước commit, lần pull sau lặp page và áp dụng idempotent theo entity version; nếu crash sau commit không mất cursor.

Khi có pending overlay trên entity, pull cập nhật bản server và giữ local; nếu khác base tạo local_conflict thay vì đè. Với change do chính máy vừa push, dùng version và mutation receipt để ack, không tạo bản sao. Pull không được tạo outbox mới, tránh vòng lặp đồng bộ.

Trigger sync khi app mở, mạng trở lại, thao tác local sau debounce 1 giây và khi app foreground mỗi 15 giây. Backoff lỗi mạng 1, 2, 4, 8, 16, 30 giây có jitter; 401 refresh một lần; 403 dừng; 409 chờ resolver; 413 tách batch. Chỉ một sync loop mỗi account trên thiết bị, có mutex và cancellation khi logout.

## 9.4 Conflict resolution

Giữ base snapshot, local snapshot và remote snapshot. UI hiển thị nội dung khác, tên thiết bị và server time. Chọn remote thì bỏ local overlay của entity sau cảnh báo; chọn local thì gửi mutation mới với base_version bằng remote_version hiện tại; giữ cả hai thì tạo UUID mới, tên có hậu tố và nguồn copy. Nếu remote tiếp tục đổi, conflict lại; không force overwrite bằng bỏ kiểm version.

Tự merge chỉ cho field độc lập có cùng base và chứng minh không giao nhau, ví dụ tên và archived. Project instructions, Memory content và deletion so với edit luôn yêu cầu quyết định. Không tạo CRDT text editor trong MVP. Khi nhiều máy chọn leaf khác nhau, giữ selection local; Cloud selected_leaf_id là gợi ý không chặn chat.

Delete so với update không tự hồi sinh entity. Nếu delete được server nhận trước, update stale nhận conflict; giữ local có thể tạo bản sao mới bằng UUID mới và parent hợp lệ. Xóa project phải tạo tombstone các conversation, message, document và Memory trong phạm vi theo job transaction có kiểm soát; trước khi hoàn tất đánh dấu project deleting để chặn ghi mới.

## 9.5 Tombstone retention và reset

Giữ change log và receipt 90 ngày theo cấu hình beta; thời hạn phải khớp nhau để retry không biến mutation cũ thành mới. Thiết bị không sync quá thời hạn nhận 410 SYNC_RESET_REQUIRED. Không xóa local database khi nhận lỗi này. Dừng push, backup local, snapshot outbox và conflict, tải snapshot vào DB staging, swap an toàn rồi replay các mutation pending qua kiểm version. Dữ liệu có parent đã xóa chuyển resolver hoặc bản sao riêng, không tự phục hồi parent.

Snapshot có watermark H. MVP tạo một snapshot logic nhất quán bằng transaction REPEATABLE READ hoặc snapshot job vật hóa; toàn bộ trang đều thuộc cùng H. Không phân trang trực tiếp trên bảng đang thay đổi rồi gán một head mới mỗi trang. Sau tải xong, client pull changes lớn hơn H rồi replay outbox.

## 9.6 File sync và khôi phục

Upload intent do server tạo key owner_id/document_id/hash; URL ký ngắn hạn, MIME và size được kiểm lại sau upload. complete xác thực object, checksum và metadata; chỉ khi confirmed mới cho thiết bị khác tải. Nếu upload xong nhưng app crash, job tìm lại upload_id và finalize idempotent; dọn orphan sau 24 giờ. Không đánh dấu tài liệu đã đồng bộ chỉ vì metadata đã lên Cloud.

Backup local bằng API backup SQLite và manifest file có hash; không copy riêng file .db khi WAL còn hoạt động. Export ZIP chứa manifest schema_version, projects, conversations, messages, memories, documents và tùy chọn file gốc; tuyệt đối không gồm Key hay session. Import kiểm kích thước giải nén, path traversal, checksum và schema; mặc định nhập bản sao với ID mapping để không ghi đè dữ liệu.

# 10 Đặc tả bảo mật và quyền riêng tư

## 10.1 Threat model và kiểm soát

| Mối đe dọa | Bề mặt | Kiểm soát và kiểm thử |
| --- | --- | --- |
| XSS lấy secret hoặc gọi command | Markdown, HTML, webview | Sanitize, không HTML thô, CSP, IPC allowlist, kiểm fixture độc hại |
| User A đọc dữ liệu B | REST, signed URL, vector search | JWT owner, FK kép, RLS, negative tenant test |
| Key rò log hoặc telemetry | Header, lỗi provider, crash dump | Redaction trước serialize, canary secret test toàn pipeline |
| OAuth callback bị chiếm | Deep link, verifier, state | PKCE, state, callback allowlist, TTL và one-time use |
| Tài liệu prompt injection | PDF và chunks | Phân biệt instruction và data, không tool execution, kiểm nguồn |
| File độc hại và zip bomb | Upload, parser, import | Magic bytes, size, timeout, sandbox, giới hạn giải nén |
| Update bị thay | Installer và manifest | Ký artifact, TLS, ký update, bảo vệ private key |
| Mất máy hoặc malware đặc quyền | Local DB và kho bí mật | Kho OS, quyền file, disk encryption khuyến nghị; nêu rõ giới hạn |

## 10.2 API Key và mã hóa local

macOS dùng Keychain; Windows dùng Windows Credential Manager hoặc vault native đã chọn và kiểm thử. Keychain reference gắn account_id, provider và connection_id. Một connection sync sang máy khác hiện “Cần nhập Key trên máy này”. Disconnect xóa Key cục bộ; xóa connection tạo tombstone metadata và yêu cầu các máy khác xóa Key khi nhận, nhưng không hứa xóa tức thì trên máy offline.

Sau khi lưu chỉ hiển thị nhãn và trạng thái, có thể hiển thị suffix nếu người dùng đồng ý; không giữ bản Key đã mask trong payload sync. Key chỉ ở bộ nhớ trong thời gian cần; không thể hứa zeroization hoàn toàn trong JavaScript backend do runtime và GC. Hạn chế bản sao và không cho job serialize secret.

SQLite thường không tự mã hóa chỉ vì dùng Tauri hoặc Keychain. MVP dùng app data permission và khóa bảo mật OS; bật FileVault hoặc BitLocker là khuyến nghị môi trường. Nếu thêm mã hóa DB, phải chọn SQLCipher tương thích license và kiểm build hai OS, khóa DB ngẫu nhiên lưu vault, có thiết kế backup/restore riêng. Không đánh dấu “encrypted local database” trước khi tính năng đó được thực hiện và test. File gốc cũng cần chính sách mã hóa tương ứng nếu mở chế độ này.

## 10.3 OAuth Google và quản lý phiên

App tạo verifier ngẫu nhiên an toàn, challenge S256, state một lần, lưu verifier trong vùng native có TTL 10 phút. Mở trình duyệt hệ thống, không nhúng form Google trong webview. Callback phải đúng allowlist và state gắn phiên bắt đầu trên cùng thiết bị; exchange code qua Auth chính thức và xóa verifier ngay sau kết thúc. PKCE yêu cầu verifier tương ứng để đổi code, xem S4.

Chọn một cơ chế callback cho từng OS sau spike: loopback listener bound 127.0.0.1 với port ngẫu nhiên nếu luồng Auth cho phép, hoặc deep link đã đăng ký đúng app và exact redirect allowlist. Không nhận URL callback bất kỳ qua một command mở. Test app đang mở, app đã đóng, callback lặp, state sai, code hết hạn, hủy đăng nhập và nhiều phiên login cạnh nhau.

Access token chỉ trong native memory, refresh token trong vault. Rust điều phối refresh single-flight; 401 chỉ retry refresh một lần. Logout hủy stream và sync, xóa token native và state UI, đóng DB của account; cho chọn giữ cache mã hóa/OS-protected hoặc xóa local sau cảnh báo. Tài khoản tiếp theo dùng thư mục và DB riêng, không reuse query cache.

Revoke thiết bị chặn request Cloud mới, nhưng không thu hồi được lịch sử đã tải trên thiết bị offline. Xóa thiết bị không tương đương xóa tài khoản. App cần thông báo rõ giới hạn này ở Settings, không trình bày remote wipe như một tính năng đã bảo đảm.

## 10.4 Backend authorization và RLS

Các bảng public bật RLS. JWT user chỉ được SELECT hàng owner_id=auth.uid(); không cấp ghi trực tiếp cho desktop trong kiến trúc Sync Service. Fastify kiểm token trước, thiết lập transaction context và sử dụng role server được cấp tối thiểu. Nếu dùng service role thì RLS có thể bị bypass, service phải lọc owner bắt buộc và kiểm đầy đủ scope. Không coi service role cộng RLS là tự động an toàn.

Storage bucket private. Đường dẫn object bắt đầu owner, nhưng chỉ đường dẫn không đủ để chứng minh quyền; API kiểm document owner và tombstone rồi mới ký URL. Vector search luôn tenant filter trong query và check kết quả trước trả. Audit các thao tác Key metadata, export, account deletion, revoke, resolve conflict; không ghi nội dung bí mật.

Capabilities của Tauri giới hạn command và plugin theo cửa sổ; không cấp shell, filesystem hoặc HTTP wildcard cho UI. CSP giới hạn script vào bundle nội bộ, chặn eval và remote script; allowlist URL mở ngoài. Cơ chế capabilities được mô tả tại S6, nhưng developer vẫn phải kiểm riêng custom command và command scope. Không tin nội dung webview là boundary đủ mạnh để giữ secret.

## 10.5 Retention xóa và sự cố

Chính sách đề xuất beta: operational log không có nội dung giữ 30 ngày; generation ledger 24 giờ; sync receipt và tombstone 90 ngày; blob orphan 24 giờ; backup Cloud theo gói hạ tầng được chọn và phải công bố thời hạn thật. Dữ liệu active giữ đến khi người dùng xóa. Xóa tài khoản khóa ghi, thu hồi phiên, xếp job xóa, gửi trạng thái qua UI; không hứa xóa khỏi backup ngay lập tức.

Runbook Key lộ: dừng log liên quan, cô lập bản phát hành, hướng dẫn người dùng thu hồi Key tại provider, rotate secret hạ tầng, xác định phạm vi và thời gian, sửa redaction, kiểm log đã purge theo khả năng, bổ sung canary test và phát hành bản sửa. Không gửi Key thật trong ticket. Thông báo sự cố cho người dùng dựa trên dữ liệu xác minh, không phỏng đoán.

# 11 Triển khai backend và vận hành

## 11.1 Môi trường và cấu hình

Tách dev, staging và production với Supabase project, storage bucket, OAuth client, API domain và secret riêng. File .env.example chỉ chứa tên biến và placeholder. Desktop public config gồm SUPABASE_URL, SUPABASE_PUBLIC_KEY và API_BASE_URL; server config có DB connection, Auth issuer/audience, service credential giới hạn quyền, CORS origin và limiter backend. Mọi biến bí mật không có prefix VITE và không xuất sang bundle.

Chạy API container với health probe, request size limit, graceful shutdown, stream timeout và trusted proxy đúng topology. Triển khai một instance trước để giảm phức tạp; trước scale nhiều instance cần ledger dùng chung, cancellation signal qua pub/sub, distributed rate limit và không phụ thuộc memory process. Worker Cloud chỉ cleanup, export và maintenance không cần BYOK; Memory, embedding, parsing AI jobs ở desktop.

## 11.2 CI và quality gate

Mỗi PR chạy format, TypeScript typecheck, Rust fmt và clippy, unit test, contract test, migration test PostgreSQL/SQLite và kiểm secret. Nhánh release chạy integration trên Supabase staging, adapter smoke test có quota nhỏ, build Mac và Windows. Live tests dùng tài khoản test riêng; không dùng Key người dùng hoặc gọi AI không giới hạn trong mọi PR.

Phát hành theo thứ tự migration tương thích ngược, backend hỗ trợ schema cũ, desktop beta, canary cohort, rồi stable. Server công bố min_supported_schema; client quá cũ chỉ đọc local và hướng dẫn cập nhật, không xóa hoặc ghi payload cũ gây mất field mới. Rollback backend phải đọc được dữ liệu đã tạo bởi version mới hoặc tắt mutation trong thời gian sửa.

## 11.3 Quan sát và cảnh báo

Metrics gồm tỷ lệ generation completed, time to first text, lỗi theo provider/code, sync lag, pending outbox, conflict rate, job failure, document indexing time và crash-free session. Metadata được phép: request_id, hash account có salt, model, duration, token usage và error code. Prompt, response, Key, file text và email không có trong telemetry mặc định.

Ngưỡng cảnh báo thử nghiệm: lỗi API nội bộ trên 2% trong 5 phút, p95 sync lag trên 60 giây khi online, tỷ lệ parse failure trên 10%, DB disk hoặc connection gần ngưỡng cấu hình. Tách lỗi provider khỏi lỗi app. Dashboard phải chỉ rõ missing data; không biến telemetry bị tắt thành zero error.

## 11.4 Backup và khôi phục dịch vụ

Mục tiêu vận hành beta đề xuất RPO Cloud 24 giờ, RTO 8 giờ, chỉ áp dụng sau khi gói backup và restore drill chứng minh đạt. Local-first giảm ảnh hưởng mất Cloud nhưng không thay thế backup file. Thử restore DB và storage vào staging mỗi tháng, kiểm hash file, số record, RLS và quyền tài khoản. Backup chứa dữ liệu nhạy cảm phải có quyền riêng và retention thực tế.

Sau restore Cloud về thời điểm cũ không dùng tiếp cursor cũ như chưa có gì xảy ra. Nâng sync_epoch, buộc reset snapshot, giữ local outbox và local bản sao, đối chiếu các record chỉ còn trên thiết bị; không tự đánh dấu dữ liệu chưa restore là đã xóa. Có runbook xử lý generation và usage bị mất ledger, không tự replay request AI.

# 12 Kế hoạch kiểm thử và tiêu chí nghiệm thu

## 12.1 Ma trận bắt buộc

| Test ID | Tình huống | Kết quả phải đạt |
| --- | --- | --- |
| AUTH 01 | Login và refresh hết hạn | Một phiên native hợp lệ, không lộ token ra React |
| AUTH 02 | State sai, callback lặp, code hết hạn | Từ chối, không thay account đang mở |
| TENANT 01 | User A gọi ID hoặc file B | 404 hoặc forbidden nhất quán; không trả nội dung |
| CHAT 01 | Gửi, streaming, hoàn tất, mở lại app | Nội dung và provider model giữ nguyên |
| CHAT 02 | Stop trước và sau token đầu | Terminal cancelled duy nhất; giữ partial |
| CHAT 03 | Mất mạng, kill app giữa stream | Khôi phục interrupted; không tự tính phí request mới |
| CHAT 04 | Edit và regenerate nhiều nhánh | Context chỉ chứa đúng ancestor path |
| AI 01 | Sáu chiều đổi giữa ba provider | Giữ project instructions, branch, Memory và nguồn đúng |
| AI 02 | Key sai, quota, model retire, context quá dài | Lỗi rõ, không âm thầm đổi model hoặc replay |
| MEM 01 | Thông tin thuộc project khác | Không bao giờ xuất hiện trong retrieval |
| MEM 02 | Candidate chưa duyệt hoặc Memory disabled | Không đưa vào context |
| MEM 03 | Sửa, xóa, nguồn bị xóa, summary cũ | Invalidate vector và summary; không tái sinh thông tin đã quên |
| DOC 01 | PDF text, scan, file quá lớn, parser lỗi | Trạng thái chính xác; UI không treo |
| DOC 02 | Citation lạ và link có script | Không render nguồn giả hoặc chạy script |
| SYNC 01 | Hai máy offline cùng sửa instructions | Conflict giữ đủ base local remote |
| SYNC 02 | Push thành công nhưng mất ack | Retry không tạo thêm record hoặc tăng version |
| SYNC 03 | Crash trước và sau commit pull | Không mất dữ liệu hoặc cursor |
| SYNC 04 | Edit local sau lúc push inflight | Ack không ghi đè edit mới |
| SYNC 05 | Xóa trên A, máy B online sau 90 ngày | Reset an toàn, không hồi sinh dữ liệu tự động |
| SYNC 06 | Đổi tài khoản khi đang sync | Request cũ bị hủy, cache không lẫn account |
| SEC 01 | Canary Key trong mọi đường lỗi | Không có trong log, export, DB, crash report |
| SEC 02 | Markdown XSS và IPC lạm quyền | Không thực thi hoặc truy cập file ngoài scope |
| DATA 01 | Export và import vào profile test | Đếm entity, branch và hash file khớp |
| DATA 02 | Migration thất bại hoặc đĩa đầy | Giữ DB cũ và draft; không tự xóa dữ liệu |
| REL 01 | Cài mới, update, uninstall hai OS | Ký hợp lệ, khởi động được, chính sách cache rõ |

## 12.2 Fixture và mức test

Unit test tập trung vào token budget, branch traversal, source filtering, normalization, conflict state, idempotency hash và mutation validation. Integration test chạy database thật để kiểm FK, RLS, lock sync head và transaction crash/retry. UI test dùng mock provider stream có delta, lỗi và delay xác định; không phụ thuộc AI live để so text từng chữ.

Adapter contract test dùng recording đã redact cho text, Unicode, safety block, usage thiếu, cancellation, malformed event và provider timeout. Live smoke mỗi provider tối thiểu một lượt text và streaming với output nhỏ trước release. Memory eval dùng expected sources, không dựa duy nhất vào đánh giá của một model khác. Test tính đúng sau khi đổi model hoặc pipeline_version.

## 12.3 Definition of Done cho một tính năng

Một tính năng hoàn thành khi route hoặc command có schema, UI có đủ trạng thái, dữ liệu bền vững sau restart, quyền owner và scope được kiểm, log không có secret, test acceptance tương ứng chạy đạt và runbook có cách xử lý lỗi thường gặp. “Giao diện hiện đẹp” hoặc “API trả 200” chưa đủ để đánh dấu hoàn tất.

# 13 Lộ trình thực hiện và release gate

## 13.1 Ước lượng có điều kiện

Với một developer có kinh nghiệm toàn thời gian, phạm vi này nên được lập kế hoạch khoảng 16–24 tuần gồm kiểm thử và buffer, thay vì mặc định tám sprint ngắn chắc chắn xong. Đây là ước lượng dự án, chưa có velocity thực tế. Nếu mới học Rust, OAuth, sync hoặc chưa có máy Windows, cần tăng thời gian. Sau mốc Alpha phải ước lượng lại bằng dữ liệu thực tế.

| Giai đoạn | Khoảng tuần tham khảo | Công việc và bằng chứng đầu ra |
| --- | --- | --- |
| 0 Spike và contracts | 1–2 | Keychain hai OS, OAuth callback, một stream mỗi provider, schema manifest và ADR |
| 1 Foundation | 3–4 | App shell, SQLite migrations, local project chat, mock stream, export |
| 2 AI hoàn chỉnh | 5–7 | Ba adapter, model registry, usage, cancel, branch, handover |
| 3 Memory và Knowledge | 8–10 | Review UI, source provenance, keyword search, PDF text, chunk và citation |
| 4 Auth và Cloud | 11–12 | Google PKCE, device registry, tenant tests, private storage |
| 5 Sync | 13–16 | Outbox, receipt, cursor, conflict, snapshot, hai máy và file sync |
| 6 Beta và bảo mật | 17–20 | Security tests, restore drill, beta cohort, performance và bug fixes |
| 7 Release | 21–24 | Installer ký, update signed, support docs, canary và stable |

Auth và Cloud được đưa sau local vertical slice để kiểm chứng chat và dữ liệu trước; spike OAuth vẫn thực hiện sớm để phát hiện blocker. Nếu có hai developer, có thể làm UI và backend song song sau khi chốt contract; không chia việc theo file mà không thống nhất state machine.

## 13.2 Backlog đầu tiên có thể giao việc

| ID | Công việc | Phụ thuộc | Tiêu chí hoàn thành |
| --- | --- | --- | --- |
| F01 | Monorepo, TypeScript strict, Rust, CI | Không | Build desktop và API skeleton trên CI |
| F02 | Contract JSON Schema và lỗi chuẩn | F01 | Fixture TS và Rust cùng pass hoặc cùng reject |
| F03 | SQLite domain và outbox migration | F02 | Tạo sửa project + crash transaction test |
| F04 | App shell và chat fixture | F01 | Keyboard, empty, offline, error đầy đủ |
| F05 | Vault API Key | F02 | Save, test, delete, không leak canary |
| F06 | Gateway một provider | F02 F05 | SSE, timeout, cancel, ledger và usage |
| F07 | Chat persistence và branch | F03 F04 F06 | Restart, edit, regenerate không mất history |
| F08 | Hai adapter còn lại | F06 | Shared contract tests và live smoke |
| F09 | Context và handover | F07 F08 | Sáu chiều handover, budget và unsupported block |
| F10 | Export và backup | F03 | Import thử nghiệm, không có secret |
| F11 | Memory review và retrieval | F07 F09 | Scope, sources, sửa xóa và eval đạt |
| F12 | Knowledge parse và citation | F03 F09 | PDF text, failure isolation, nguồn chính xác |
| F13 | Google Auth và tenant Cloud | F02 F05 | PKCE negative tests và user isolation |
| F14 | Sync protocol | F03 F13 | Hai máy, retry, inflight edit và conflict đạt |
| F15 | File sync và snapshot reset | F12 F14 | Upload resume, long-offline và restore drill |
| F16 | Release pipeline | F08 F11 F15 | Bộ cài hai OS và update signed |

Đợt code đầu tiên chỉ nhận F01 đến F07. Kết quả mong muốn là một lát cắt hoàn chỉnh từ UI tới AI và lưu local, không phải nhiều màn hình chưa có dữ liệu. Chỉ chuyển sang Sync đầy đủ khi local schema, branch và ownership không còn thay đổi liên tục.

## 13.3 Release gate bắt buộc

Không còn lỗi nghiêm trọng về mất dữ liệu, lộ secret hoặc đọc chéo tài khoản. Toàn bộ test chương 12 đạt trên cấu hình OS được công bố. Restore và export/import đã thực hành. Key sai, quota, offline, storage đầy và lỗi migration có hướng dẫn khôi phục. Policy dữ liệu mô tả đúng đường đi Gateway, Cloud và provider.

Build macOS Apple Silicon trước; Intel chỉ công bố khi build và test được. Windows 11 là nền tảng release bắt buộc; Windows 10 chỉ ghi supported khi xác minh phiên bản OS, WebView2 và bộ cài thực tế. Có CI Windows hoặc máy test Windows; build thành công trên Mac không chứng minh app chạy Windows.

macOS dùng code signing và notarization theo tài khoản Apple của chủ sản phẩm. Windows dùng phương án ký bộ cài đã chọn. Update dùng artifact được ký và khóa private nằm trong secret CI, không trong repo; public verification key đóng gói trong app. Cơ chế updater Tauri yêu cầu cấu hình và kiểm chữ ký, tham chiếu S7. Test update từ bản trước, manifest lỗi, signature sai, download ngắt và rollback khả thi.

# 14 Chi phí rủi ro và công việc sau MVP

## 14.1 Ngân sách để vận hành được

Tách bốn nhóm chi phí: tài khoản phát hành và ký app; Cloud DB storage egress cùng backup; API test và embedding do nhà phát triển dùng; hỗ trợ bảo trì. Chi phí BYOK của người dùng không cộng vào doanh thu workspace. Không chốt mức tiền cố định từ thông tin chưa kiểm chứng; lấy báo giá hiện hành trước khi mua gói và đưa vào bảng ngân sách riêng.

Khi có 50 người dùng beta, đo dung lượng trung bình conversation, file, vector và lưu lượng sync mỗi ngày. Dự báo chi phí Cloud bằng active_users × average_usage × unit_cost cộng phần cố định và buffer. Theo dõi ít nhất một chu kỳ 30 ngày trước chốt gói Pro. Quyền dùng model phụ thuộc Key, quota và provider, không phụ thuộc việc mua Pro của app.

## 14.2 Rủi ro ưu tiên

Rủi ro lớn nhất là mất hoặc lẫn dữ liệu khi sync; giảm bằng scope nhỏ, protocol có receipt, head lock và reset an toàn. Rủi ro tiếp theo là Key rò qua log; giảm bằng native vault, transient forwarding, redaction và canary test. Rủi ro về giá trị sản phẩm là người dùng không thấy lợi ích handover; kiểm bằng cohort và quan sát dùng thực tế trước xây team hoặc agent.

API và model thay đổi phải được khoanh trong adapter và registry. Parser tài liệu cần xử lý lỗi độc lập để không khóa UI. Memory sai cần provenance và duyệt để người dùng sửa được. Lịch phát triển vượt dự kiến thì giữ các gate dữ liệu và bảo mật, cắt phần OCR, multi-model, billing và automation trước; không bỏ conflict handling để kịp demo.

## 14.3 Các khả năng sau MVP

Sau khi cohort và reliability đạt mục tiêu, lần lượt đánh giá semantic search nâng cao, OCR, DOCX/CSV đầy đủ, multimodal, local direct-provider mode, nhiều kết nối cùng provider, team workspace, RBAC, billing và license. Multi-model compare, agent tools, MCP, voice, mobile, plugin system và E2EE cần ADR riêng vì thay đổi permission, chi phí hoặc khả năng xử lý dữ liệu.

Không thêm team bằng cách chỉ bỏ filter owner_id. Cần membership, role, shared resource ownership và audit. Không thêm E2EE bằng cách chỉ mã hóa một cột trong DB; phải thiết kế key distribution, recovery, search và xử lý Memory trên thiết bị phù hợp.

# 15 Checklist bàn giao và cách dùng tài liệu

Trước code: đọc ADR, xác nhận phạm vi định dạng file, chọn môi trường staging, tạo API test keys và chốt model manifest qua spike. Trong code: triển khai từng ticket với contract và acceptance test, cập nhật migration trong PR cùng thay đổi. Trước beta: chạy hai thiết bị, dùng tài khoản khác để kiểm tenant, restore backup, export dữ liệu và kiểm Key canary. Trước stable: hoàn tất signing, update, policy và kênh hỗ trợ.

Repository nên giữ PRD gốc, tài liệu Word này và bản nguồn Markdown có thể review diff. Các file SQL trong phụ lục là nền tảng schema, không đồng nghĩa Sync Service đã được cài đặt. Những phần pseudocode và type minh họa phải chuyển thành code và integration test; không gán trạng thái “production ready” chỉ vì tài liệu đã đủ chương.

Khi giao việc cho một AI coding agent, giới hạn một ticket, yêu cầu đọc contract liên quan và mô tả evidence đầu ra. Ví dụ: “Triển khai F03 theo chương 5 và 9, viết migration SQLite, transaction ghi project cùng outbox, test crash rollback; chưa xây sync network.” Mỗi lần hoàn tất phải có diff, test result và phần còn thiếu để reviewer kiểm được.

# 16 Nguồn tham chiếu và trạng thái xác minh

Tài liệu sản phẩm đầu vào là bản văn bản Unified AI Workspace PRD phiên bản 1.0 do chủ sản phẩm cung cấp. Bản này giữ mục tiêu và stack gốc, bổ sung các quyết định MVP, hợp đồng và kế hoạch triển khai. Nguồn dưới đây đã được mở kiểm tra ngày 26 tháng 11 năm 2026; khi bắt đầu từng adapter hoặc release cần kiểm lại version thực tế.

S1 OpenAI Streaming API responses — https://developers.openai.com/api/docs/guides/streaming-responses — hỗ trợ quyết định chuẩn hóa event streaming trong chương 7.2. Các giới hạn và thuật toán context trong tài liệu là thiết kế đề xuất của app.

S2 Claude API Messages reference — https://platform.claude.com/docs/en/api/messages — tham chiếu hợp đồng provider và versioning. Không cố định schema hoặc model ID ngoài manifest đã test.

S3 Gemini Text generation — https://aistudio.google.com/docs/text-generation — tham chiếu native API và streaming. Hợp đồng nội bộ vẫn độc lập với tên endpoint provider.

S4 Supabase PKCE flow — https://supabase.com/docs/guides/auth/sessions/pkce-flow — tham chiếu cơ chế code và verifier. Lựa chọn callback OS là quyết định triển khai phải được spike riêng.

S5 SQLite Write Ahead Logging — https://www.sqlite.org/wal.html — tham chiếu chế độ WAL và hạn chế vận hành. Chọn bản SQLite còn được hỗ trợ, kiểm release notes khi pin dependency.

S6 Tauri Capabilities — https://v2.tauri.app/security/capabilities/ — tham chiếu cấp quyền theo capability và scope. Không thay thế validation custom command.

S7 Tauri Updater — https://v2.tauri.app/plugin/updater/ — tham chiếu update có chữ ký và cấu hình nền tảng.

S8 Supabase Row Level Security — https://supabase.com/docs/guides/database/postgres/row-level-security — tham chiếu policy dữ liệu. Quyết định chỉ ghi qua server của tài liệu bổ sung lớp kiểm soát và change log.



# 17 Phụ lục SQL Cloud nền tảng

Migration sau dành cho Supabase PostgreSQL mới trên staging, có auth.users và các role anon, authenticated. Dùng extension pgvector. Không chạy vào database đã có bảng trùng tên. Đây là migration schema, chưa chứa code Mutation Service, TTL cleanup, Storage policies, trigger bất biến hoặc procedure phân quyền của backend. Không cấp ghi trực tiếp cho desktop. Phiên bản PostgreSQL và extension phải được pin trong môi trường triển khai.

Trạng thái kiểm tra trong lần bàn giao này: SQL Cloud được rà soát cấu trúc và tạo từ manifest; chưa chạy trên Supabase hoặc PostgreSQL. Bắt buộc chạy clean migration, migration rollback thử nghiệm, kiểm RLS hai user và transaction sync trên staging trước khi coi sẵn sàng vận hành. Index vector nâng cao chỉ thêm sau benchmark theo model và dimension.

```sql
-- 0001_cloud_baseline.sql
-- Run on a new Supabase staging database. No production claim.
BEGIN;
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions;
CREATE TABLE profiles (
 id uuid PRIMARY KEY REFERENCES auth.users(id),
 display_name text NOT NULL DEFAULT '',
 locale text NOT NULL DEFAULT 'vi',
 settings jsonb NOT NULL DEFAULT '{}',
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE devices (
 id uuid PRIMARY KEY,
 owner_id uuid NOT NULL REFERENCES auth.users(id),
 name text NOT NULL,
 platform text NOT NULL CHECK(platform IN ('macos','windows')),
 last_seen_at timestamptz NOT NULL DEFAULT now(),
 revoked_at timestamptz,
 UNIQUE(owner_id,id)
);

CREATE TABLE workspaces (
id uuid PRIMARY KEY,
owner_id uuid NOT NULL REFERENCES auth.users(id),
version bigint NOT NULL DEFAULT 1 CHECK(version > 0),
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now(),
deleted_at timestamptz,
source_device_id uuid,
name text NOT NULL CHECK(length(name) BETWEEN 1 AND 120),
UNIQUE(owner_id,id)
);

CREATE TABLE projects (
id uuid PRIMARY KEY,
owner_id uuid NOT NULL REFERENCES auth.users(id),
version bigint NOT NULL DEFAULT 1 CHECK(version > 0),
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now(),
deleted_at timestamptz,
source_device_id uuid,
workspace_id uuid NOT NULL,
name text NOT NULL CHECK(length(name) BETWEEN 1 AND 120),
description text NOT NULL DEFAULT '',
instructions text NOT NULL DEFAULT '',
archived boolean NOT NULL DEFAULT false,
FOREIGN KEY(owner_id,workspace_id) REFERENCES workspaces(owner_id,id),
UNIQUE(owner_id,id)
);

CREATE TABLE ai_connections (
id uuid PRIMARY KEY,
owner_id uuid NOT NULL REFERENCES auth.users(id),
version bigint NOT NULL DEFAULT 1 CHECK(version > 0),
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now(),
deleted_at timestamptz,
source_device_id uuid,
provider text NOT NULL CHECK(provider IN ('openai','anthropic','google')),
name text NOT NULL,
default_model text,
UNIQUE(owner_id,id)
);

CREATE TABLE conversations (
id uuid PRIMARY KEY,
owner_id uuid NOT NULL REFERENCES auth.users(id),
version bigint NOT NULL DEFAULT 1 CHECK(version > 0),
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now(),
deleted_at timestamptz,
source_device_id uuid,
workspace_id uuid NOT NULL,
project_id uuid,
title text NOT NULL DEFAULT 'New chat',
selected_leaf_id uuid,
archived boolean NOT NULL DEFAULT false,
FOREIGN KEY(owner_id,workspace_id) REFERENCES workspaces(owner_id,id),
FOREIGN KEY(owner_id,project_id) REFERENCES projects(owner_id,id),
UNIQUE(owner_id,id)
);

CREATE TABLE messages (
id uuid PRIMARY KEY,
owner_id uuid NOT NULL REFERENCES auth.users(id),
version bigint NOT NULL DEFAULT 1 CHECK(version > 0),
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now(),
deleted_at timestamptz,
source_device_id uuid,
conversation_id uuid NOT NULL,
parent_id uuid,
role text NOT NULL CHECK(role IN ('user','assistant')),
content jsonb NOT NULL DEFAULT '[]',
status text NOT NULL CHECK(status IN
 ('pending','streaming','completed','cancelled','failed','interrupted')),
provider text,
model text,
client_created_at timestamptz NOT NULL,
metadata jsonb NOT NULL DEFAULT '{}',
FOREIGN KEY(owner_id,conversation_id) REFERENCES conversations(owner_id,id),
FOREIGN KEY(owner_id,parent_id) REFERENCES messages(owner_id,id),
UNIQUE(owner_id,id)
);

CREATE TABLE generations (
id uuid PRIMARY KEY,
owner_id uuid NOT NULL REFERENCES auth.users(id),
version bigint NOT NULL DEFAULT 1 CHECK(version > 0),
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now(),
deleted_at timestamptz,
source_device_id uuid,
conversation_id uuid NOT NULL,
user_message_id uuid NOT NULL,
assistant_message_id uuid NOT NULL,
request_id uuid NOT NULL,
status text NOT NULL,
input_tokens bigint CHECK(input_tokens >= 0),
output_tokens bigint CHECK(output_tokens >= 0),
finish_reason text,
error_code text,
UNIQUE(owner_id,request_id),
FOREIGN KEY(owner_id,conversation_id) REFERENCES conversations(owner_id,id),
FOREIGN KEY(owner_id,user_message_id) REFERENCES messages(owner_id,id),
FOREIGN KEY(owner_id,assistant_message_id) REFERENCES messages(owner_id,id),
UNIQUE(owner_id,id)
);

CREATE TABLE memories (
id uuid PRIMARY KEY,
owner_id uuid NOT NULL REFERENCES auth.users(id),
version bigint NOT NULL DEFAULT 1 CHECK(version > 0),
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now(),
deleted_at timestamptz,
source_device_id uuid,
scope text NOT NULL CHECK(scope IN ('user','project')),
project_id uuid,
category text NOT NULL,
content text NOT NULL CHECK(length(content) BETWEEN 1 AND 2000),
status text NOT NULL CHECK(status IN
 ('pending','active','disabled','superseded','pending_review')),
confidence real CHECK(confidence BETWEEN 0 AND 1),
memory_revision integer NOT NULL DEFAULT 1,
dedupe_key text NOT NULL,
expires_at timestamptz,
CHECK((scope='user' AND project_id IS NULL) OR
 (scope='project' AND project_id IS NOT NULL)),
FOREIGN KEY(owner_id,project_id) REFERENCES projects(owner_id,id),
UNIQUE(owner_id,id)
);

CREATE TABLE memory_versions (
id uuid PRIMARY KEY,
owner_id uuid NOT NULL REFERENCES auth.users(id),
version bigint NOT NULL DEFAULT 1 CHECK(version > 0),
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now(),
deleted_at timestamptz,
source_device_id uuid,
memory_id uuid NOT NULL,
memory_revision integer NOT NULL,
snapshot jsonb NOT NULL,
reason text NOT NULL,
UNIQUE(owner_id,memory_id,memory_revision),
FOREIGN KEY(owner_id,memory_id) REFERENCES memories(owner_id,id),
UNIQUE(owner_id,id)
);

CREATE TABLE documents (
id uuid PRIMARY KEY,
owner_id uuid NOT NULL REFERENCES auth.users(id),
version bigint NOT NULL DEFAULT 1 CHECK(version > 0),
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now(),
deleted_at timestamptz,
source_device_id uuid,
workspace_id uuid NOT NULL,
project_id uuid,
name text NOT NULL,
mime text NOT NULL,
byte_size bigint NOT NULL CHECK(byte_size BETWEEN 0 AND 20971520),
sha256 text NOT NULL CHECK(length(sha256)=64),
storage_key text,
processing_status text NOT NULL DEFAULT 'queued',
extraction_version integer NOT NULL DEFAULT 1,
FOREIGN KEY(owner_id,workspace_id) REFERENCES workspaces(owner_id,id),
FOREIGN KEY(owner_id,project_id) REFERENCES projects(owner_id,id),
UNIQUE(owner_id,id)
);

CREATE TABLE message_attachments (
id uuid PRIMARY KEY,
owner_id uuid NOT NULL REFERENCES auth.users(id),
version bigint NOT NULL DEFAULT 1 CHECK(version > 0),
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now(),
deleted_at timestamptz,
source_device_id uuid,
message_id uuid NOT NULL,
document_id uuid NOT NULL,
UNIQUE(owner_id,message_id,document_id),
FOREIGN KEY(owner_id,message_id) REFERENCES messages(owner_id,id),
FOREIGN KEY(owner_id,document_id) REFERENCES documents(owner_id,id),
UNIQUE(owner_id,id)
);

CREATE TABLE memory_sources (
id uuid PRIMARY KEY,
owner_id uuid NOT NULL REFERENCES auth.users(id),
version bigint NOT NULL DEFAULT 1 CHECK(version > 0),
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now(),
deleted_at timestamptz,
source_device_id uuid,
memory_id uuid NOT NULL,
message_id uuid,
document_id uuid,
excerpt text NOT NULL DEFAULT '',
CHECK((message_id IS NULL) <> (document_id IS NULL)),
FOREIGN KEY(owner_id,memory_id) REFERENCES memories(owner_id,id),
FOREIGN KEY(owner_id,message_id) REFERENCES messages(owner_id,id),
FOREIGN KEY(owner_id,document_id) REFERENCES documents(owner_id,id),
UNIQUE(owner_id,id)
);

CREATE TABLE conversation_summaries (
id uuid PRIMARY KEY,
owner_id uuid NOT NULL REFERENCES auth.users(id),
version bigint NOT NULL DEFAULT 1 CHECK(version > 0),
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now(),
deleted_at timestamptz,
source_device_id uuid,
conversation_id uuid NOT NULL,
through_message_id uuid NOT NULL,
path_hash text NOT NULL,
summary text NOT NULL,
source_hash text NOT NULL,
FOREIGN KEY(owner_id,conversation_id) REFERENCES conversations(owner_id,id),
FOREIGN KEY(owner_id,through_message_id) REFERENCES messages(owner_id,id),
UNIQUE(owner_id,id)
);

CREATE TABLE document_chunks (
id uuid PRIMARY KEY,
owner_id uuid NOT NULL REFERENCES auth.users(id),
version bigint NOT NULL DEFAULT 1 CHECK(version > 0),
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now(),
deleted_at timestamptz,
source_device_id uuid,
document_id uuid NOT NULL,
extraction_version integer NOT NULL DEFAULT 1,
ordinal integer NOT NULL CHECK(ordinal >= 0),
text text NOT NULL,
page_no integer,
source_locator jsonb NOT NULL DEFAULT '{}',
content_hash text NOT NULL,
UNIQUE(owner_id,document_id,extraction_version,ordinal),
FOREIGN KEY(owner_id,document_id) REFERENCES documents(owner_id,id),
UNIQUE(owner_id,id)
);

CREATE TABLE embeddings (
id uuid PRIMARY KEY,
owner_id uuid NOT NULL REFERENCES auth.users(id),
version bigint NOT NULL DEFAULT 1 CHECK(version > 0),
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now(),
deleted_at timestamptz,
source_device_id uuid,
memory_id uuid,
chunk_id uuid,
vector_model text NOT NULL,
dimensions integer NOT NULL CHECK(dimensions > 0),
embedding vector NOT NULL,
source_hash text NOT NULL,
CHECK((memory_id IS NULL) <> (chunk_id IS NULL)),
CHECK(vector_dims(embedding)=dimensions),
FOREIGN KEY(owner_id,memory_id) REFERENCES memories(owner_id,id),
FOREIGN KEY(owner_id,chunk_id) REFERENCES document_chunks(owner_id,id),
UNIQUE(owner_id,id)
);

CREATE INDEX idx_projects_workspace ON projects (owner_id,workspace_id);

CREATE INDEX idx_conversations_updated ON conversations (owner_id,updated_at DESC);

CREATE INDEX idx_messages_path ON messages (owner_id,conversation_id,client_created_at,id);

CREATE INDEX idx_messages_parent ON messages (owner_id,parent_id);

CREATE INDEX idx_memory_scope ON memories (owner_id,scope,project_id,status);

CREATE INDEX idx_memory_dedupe ON memories (owner_id,dedupe_key);

CREATE INDEX idx_documents_project ON documents (owner_id,project_id,processing_status);

CREATE INDEX idx_chunks_document ON document_chunks (owner_id,document_id,ordinal);

CREATE INDEX idx_embeddings_memory ON embeddings (owner_id,memory_id,vector_model);

CREATE INDEX idx_embeddings_chunk ON embeddings (owner_id,chunk_id,vector_model);

CREATE UNIQUE INDEX one_workspace_per_owner
 ON workspaces(owner_id) WHERE deleted_at IS NULL;
CREATE TABLE sync_heads (
 owner_id uuid PRIMARY KEY REFERENCES auth.users(id),
 epoch uuid NOT NULL,
 cursor bigint NOT NULL DEFAULT 0
);
CREATE TABLE sync_changes (
 owner_id uuid NOT NULL REFERENCES auth.users(id),
 cursor bigint NOT NULL,
 entity_type text NOT NULL,
 entity_id uuid NOT NULL,
 version bigint NOT NULL,
 operation text NOT NULL CHECK(operation IN ('upsert','delete')),
 snapshot jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(owner_id,cursor)
);
CREATE TABLE sync_receipts (
 owner_id uuid NOT NULL REFERENCES auth.users(id),
 mutation_id uuid NOT NULL,
 request_hash text NOT NULL,
 result jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(owner_id,mutation_id)
);
CREATE INDEX receipt_retention ON sync_receipts(created_at);
CREATE TABLE sync_cursors (
 owner_id uuid NOT NULL,
 device_id uuid NOT NULL,
 cursor bigint NOT NULL DEFAULT 0,
 epoch uuid NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(owner_id,device_id),
 FOREIGN KEY(owner_id,device_id) REFERENCES devices(owner_id,id)
);
CREATE TABLE generation_requests (
 owner_id uuid NOT NULL REFERENCES auth.users(id),
 request_id uuid NOT NULL,
 request_hash text NOT NULL,
 device_id uuid NOT NULL,
 status text NOT NULL,
 upstream_id text,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(owner_id,request_id),
 FOREIGN KEY(owner_id,device_id) REFERENCES devices(owner_id,id)
);
CREATE TABLE usage_logs (
 id uuid PRIMARY KEY,
 owner_id uuid NOT NULL REFERENCES auth.users(id),
 request_id uuid NOT NULL,
 provider text NOT NULL,
 model text NOT NULL,
 input_tokens bigint CHECK(input_tokens >= 0),
 output_tokens bigint CHECK(output_tokens >= 0),
 estimated_cost numeric(18,8),
 price_version text,
 duration_ms integer,
 status text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(owner_id,request_id)
);
CREATE INDEX usage_owner_time ON usage_logs(owner_id,created_at DESC);
CREATE TABLE audit_logs (
 id uuid PRIMARY KEY,
 owner_id uuid NOT NULL REFERENCES auth.users(id),
 device_id uuid,
 event text NOT NULL,
 target_id uuid,
 request_id uuid,
 metadata jsonb NOT NULL DEFAULT '{}',
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_owner_time ON audit_logs(owner_id,created_at DESC);
CREATE TABLE file_uploads (
 id uuid PRIMARY KEY,
 owner_id uuid NOT NULL REFERENCES auth.users(id),
 document_id uuid NOT NULL,
 storage_key text NOT NULL,
 expected_sha256 text NOT NULL,
 byte_size bigint NOT NULL,
 status text NOT NULL DEFAULT 'pending',
 expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE cloud_jobs (
 id uuid PRIMARY KEY,
 owner_id uuid NOT NULL REFERENCES auth.users(id),
 kind text NOT NULL,
 status text NOT NULL DEFAULT 'queued',
 dedupe_key text NOT NULL,
 payload jsonb NOT NULL DEFAULT '{}',
 result_storage_key text,
 attempts integer NOT NULL DEFAULT 0,
 lease_until timestamptz,
 error_code text,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(owner_id,dedupe_key)
);
CREATE TABLE sync_snapshots (
 id uuid PRIMARY KEY,
 owner_id uuid NOT NULL REFERENCES auth.users(id),
 epoch uuid NOT NULL,
 watermark bigint NOT NULL,
 storage_key text NOT NULL,
 expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON profiles FROM anon, authenticated;
CREATE POLICY profile_self_read ON profiles FOR SELECT
 TO authenticated USING(id=auth.uid());
GRANT SELECT ON profiles TO authenticated;

ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON devices FROM anon, authenticated;
GRANT SELECT ON devices TO authenticated;
CREATE POLICY owner_read ON devices FOR SELECT TO authenticated
 USING(owner_id=auth.uid());

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON workspaces FROM anon, authenticated;
GRANT SELECT ON workspaces TO authenticated;
CREATE POLICY owner_read ON workspaces FOR SELECT TO authenticated
 USING(owner_id=auth.uid());

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON projects FROM anon, authenticated;
GRANT SELECT ON projects TO authenticated;
CREATE POLICY owner_read ON projects FOR SELECT TO authenticated
 USING(owner_id=auth.uid());

ALTER TABLE ai_connections ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ai_connections FROM anon, authenticated;
GRANT SELECT ON ai_connections TO authenticated;
CREATE POLICY owner_read ON ai_connections FOR SELECT TO authenticated
 USING(owner_id=auth.uid());

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON conversations FROM anon, authenticated;
GRANT SELECT ON conversations TO authenticated;
CREATE POLICY owner_read ON conversations FOR SELECT TO authenticated
 USING(owner_id=auth.uid());

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON messages FROM anon, authenticated;
GRANT SELECT ON messages TO authenticated;
CREATE POLICY owner_read ON messages FOR SELECT TO authenticated
 USING(owner_id=auth.uid());

ALTER TABLE generations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON generations FROM anon, authenticated;
GRANT SELECT ON generations TO authenticated;
CREATE POLICY owner_read ON generations FOR SELECT TO authenticated
 USING(owner_id=auth.uid());

ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON memories FROM anon, authenticated;
GRANT SELECT ON memories TO authenticated;
CREATE POLICY owner_read ON memories FOR SELECT TO authenticated
 USING(owner_id=auth.uid());

ALTER TABLE memory_versions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON memory_versions FROM anon, authenticated;
GRANT SELECT ON memory_versions TO authenticated;
CREATE POLICY owner_read ON memory_versions FOR SELECT TO authenticated
 USING(owner_id=auth.uid());

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON documents FROM anon, authenticated;
GRANT SELECT ON documents TO authenticated;
CREATE POLICY owner_read ON documents FOR SELECT TO authenticated
 USING(owner_id=auth.uid());

ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON message_attachments FROM anon, authenticated;
GRANT SELECT ON message_attachments TO authenticated;
CREATE POLICY owner_read ON message_attachments FOR SELECT TO authenticated
 USING(owner_id=auth.uid());

ALTER TABLE memory_sources ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON memory_sources FROM anon, authenticated;
GRANT SELECT ON memory_sources TO authenticated;
CREATE POLICY owner_read ON memory_sources FOR SELECT TO authenticated
 USING(owner_id=auth.uid());

ALTER TABLE conversation_summaries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON conversation_summaries FROM anon, authenticated;
GRANT SELECT ON conversation_summaries TO authenticated;
CREATE POLICY owner_read ON conversation_summaries FOR SELECT TO authenticated
 USING(owner_id=auth.uid());

ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON document_chunks FROM anon, authenticated;
GRANT SELECT ON document_chunks TO authenticated;
CREATE POLICY owner_read ON document_chunks FOR SELECT TO authenticated
 USING(owner_id=auth.uid());

ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON embeddings FROM anon, authenticated;
GRANT SELECT ON embeddings TO authenticated;
CREATE POLICY owner_read ON embeddings FOR SELECT TO authenticated
 USING(owner_id=auth.uid());

ALTER TABLE sync_heads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON sync_heads FROM anon, authenticated;
GRANT SELECT ON sync_heads TO authenticated;
CREATE POLICY owner_read ON sync_heads FOR SELECT TO authenticated
 USING(owner_id=auth.uid());

ALTER TABLE sync_changes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON sync_changes FROM anon, authenticated;
GRANT SELECT ON sync_changes TO authenticated;
CREATE POLICY owner_read ON sync_changes FOR SELECT TO authenticated
 USING(owner_id=auth.uid());

ALTER TABLE sync_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON sync_receipts FROM anon, authenticated;
GRANT SELECT ON sync_receipts TO authenticated;
CREATE POLICY owner_read ON sync_receipts FOR SELECT TO authenticated
 USING(owner_id=auth.uid());

ALTER TABLE sync_cursors ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON sync_cursors FROM anon, authenticated;
GRANT SELECT ON sync_cursors TO authenticated;
CREATE POLICY owner_read ON sync_cursors FOR SELECT TO authenticated
 USING(owner_id=auth.uid());

ALTER TABLE generation_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON generation_requests FROM anon, authenticated;
GRANT SELECT ON generation_requests TO authenticated;
CREATE POLICY owner_read ON generation_requests FOR SELECT TO authenticated
 USING(owner_id=auth.uid());

ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON usage_logs FROM anon, authenticated;
GRANT SELECT ON usage_logs TO authenticated;
CREATE POLICY owner_read ON usage_logs FOR SELECT TO authenticated
 USING(owner_id=auth.uid());

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON audit_logs FROM anon, authenticated;
GRANT SELECT ON audit_logs TO authenticated;
CREATE POLICY owner_read ON audit_logs FOR SELECT TO authenticated
 USING(owner_id=auth.uid());

ALTER TABLE file_uploads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON file_uploads FROM anon, authenticated;
GRANT SELECT ON file_uploads TO authenticated;
CREATE POLICY owner_read ON file_uploads FOR SELECT TO authenticated
 USING(owner_id=auth.uid());

ALTER TABLE cloud_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON cloud_jobs FROM anon, authenticated;
GRANT SELECT ON cloud_jobs TO authenticated;
CREATE POLICY owner_read ON cloud_jobs FOR SELECT TO authenticated
 USING(owner_id=auth.uid());

ALTER TABLE sync_snapshots ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON sync_snapshots FROM anon, authenticated;
GRANT SELECT ON sync_snapshots TO authenticated;
CREATE POLICY owner_read ON sync_snapshots FOR SELECT TO authenticated
 USING(owner_id=auth.uid());

-- Domain writes MUST use authorized backend mutation service.
-- RLS does not protect a service role that can bypass RLS.
-- Updated timestamps and versions are assigned by that service.
COMMIT;
```

# 18 Phụ lục SQL Local nền tảng

Migration SQLite được tạo cùng manifest domain với Cloud. Các bảng server-only không có tại local. owner_id tham chiếu local_accounts, mỗi tài khoản một DB riêng; server_version và local_revision tách biệt. Không lưu Key, access token hoặc refresh token trong SQL này. FK source_device và selected_leaf chưa được ép tại DB; service kiểm phạm vi và tính hợp lệ trước ghi.

Trạng thái kiểm tra trong lần bàn giao này: migration đã chạy bằng SQLite trong bộ runtime tạo tài liệu, tạo account và workspace thành công, đồng thời một project trỏ parent không tồn tại bị FK từ chối. Đây là smoke test schema, chưa phải test toàn bộ transaction, sync, crash hay app thật. Kiểu BLOB cho embedding yêu cầu encoder có version và dimension được kiểm ở service.

```sql
-- 0001_local_baseline.sql
PRAGMA foreign_keys=ON;
PRAGMA journal_mode=WAL;
PRAGMA busy_timeout=5000;
BEGIN IMMEDIATE;
CREATE TABLE local_accounts (
 id TEXT PRIMARY KEY,
 display_name TEXT NOT NULL DEFAULT ''
);

CREATE TABLE workspaces (
id TEXT PRIMARY KEY,
owner_id TEXT NOT NULL REFERENCES local_accounts(id),
server_version INTEGER NOT NULL DEFAULT 0 CHECK(server_version >= 0),
local_revision INTEGER NOT NULL DEFAULT 0,
created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
deleted_at TEXT,
source_device_id TEXT,
name text NOT NULL CHECK(length(name) BETWEEN 1 AND 120),
UNIQUE(owner_id,id)
);

CREATE TABLE projects (
id TEXT PRIMARY KEY,
owner_id TEXT NOT NULL REFERENCES local_accounts(id),
server_version INTEGER NOT NULL DEFAULT 0 CHECK(server_version >= 0),
local_revision INTEGER NOT NULL DEFAULT 0,
created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
deleted_at TEXT,
source_device_id TEXT,
workspace_id TEXT NOT NULL,
name text NOT NULL CHECK(length(name) BETWEEN 1 AND 120),
description text NOT NULL DEFAULT '',
instructions text NOT NULL DEFAULT '',
archived INTEGER NOT NULL DEFAULT 0,
FOREIGN KEY(owner_id,workspace_id) REFERENCES workspaces(owner_id,id),
UNIQUE(owner_id,id)
);

CREATE TABLE ai_connections (
id TEXT PRIMARY KEY,
owner_id TEXT NOT NULL REFERENCES local_accounts(id),
server_version INTEGER NOT NULL DEFAULT 0 CHECK(server_version >= 0),
local_revision INTEGER NOT NULL DEFAULT 0,
created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
deleted_at TEXT,
source_device_id TEXT,
provider text NOT NULL CHECK(provider IN ('openai','anthropic','google')),
name text NOT NULL,
default_model text,
UNIQUE(owner_id,id)
);

CREATE TABLE conversations (
id TEXT PRIMARY KEY,
owner_id TEXT NOT NULL REFERENCES local_accounts(id),
server_version INTEGER NOT NULL DEFAULT 0 CHECK(server_version >= 0),
local_revision INTEGER NOT NULL DEFAULT 0,
created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
deleted_at TEXT,
source_device_id TEXT,
workspace_id TEXT NOT NULL,
project_id TEXT,
title text NOT NULL DEFAULT 'New chat',
selected_leaf_id TEXT,
archived INTEGER NOT NULL DEFAULT 0,
FOREIGN KEY(owner_id,workspace_id) REFERENCES workspaces(owner_id,id),
FOREIGN KEY(owner_id,project_id) REFERENCES projects(owner_id,id),
UNIQUE(owner_id,id)
);

CREATE TABLE messages (
id TEXT PRIMARY KEY,
owner_id TEXT NOT NULL REFERENCES local_accounts(id),
server_version INTEGER NOT NULL DEFAULT 0 CHECK(server_version >= 0),
local_revision INTEGER NOT NULL DEFAULT 0,
created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
deleted_at TEXT,
source_device_id TEXT,
conversation_id TEXT NOT NULL,
parent_id TEXT,
role text NOT NULL CHECK(role IN ('user','assistant')),
content TEXT NOT NULL DEFAULT '[]',
status text NOT NULL CHECK(status IN
 ('pending','streaming','completed','cancelled','failed','interrupted')),
provider text,
model text,
client_created_at TEXT NOT NULL,
metadata TEXT NOT NULL DEFAULT '{}',
FOREIGN KEY(owner_id,conversation_id) REFERENCES conversations(owner_id,id),
FOREIGN KEY(owner_id,parent_id) REFERENCES messages(owner_id,id),
UNIQUE(owner_id,id)
);

CREATE TABLE generations (
id TEXT PRIMARY KEY,
owner_id TEXT NOT NULL REFERENCES local_accounts(id),
server_version INTEGER NOT NULL DEFAULT 0 CHECK(server_version >= 0),
local_revision INTEGER NOT NULL DEFAULT 0,
created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
deleted_at TEXT,
source_device_id TEXT,
conversation_id TEXT NOT NULL,
user_message_id TEXT NOT NULL,
assistant_message_id TEXT NOT NULL,
request_id TEXT NOT NULL,
status text NOT NULL,
input_tokens INTEGER CHECK(input_tokens >= 0),
output_tokens INTEGER CHECK(output_tokens >= 0),
finish_reason text,
error_code text,
UNIQUE(owner_id,request_id),
FOREIGN KEY(owner_id,conversation_id) REFERENCES conversations(owner_id,id),
FOREIGN KEY(owner_id,user_message_id) REFERENCES messages(owner_id,id),
FOREIGN KEY(owner_id,assistant_message_id) REFERENCES messages(owner_id,id),
UNIQUE(owner_id,id)
);

CREATE TABLE memories (
id TEXT PRIMARY KEY,
owner_id TEXT NOT NULL REFERENCES local_accounts(id),
server_version INTEGER NOT NULL DEFAULT 0 CHECK(server_version >= 0),
local_revision INTEGER NOT NULL DEFAULT 0,
created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
deleted_at TEXT,
source_device_id TEXT,
scope text NOT NULL CHECK(scope IN ('user','project')),
project_id TEXT,
category text NOT NULL,
content text NOT NULL CHECK(length(content) BETWEEN 1 AND 2000),
status text NOT NULL CHECK(status IN
 ('pending','active','disabled','superseded','pending_review')),
confidence REAL CHECK(confidence BETWEEN 0 AND 1),
memory_revision INTEGER NOT NULL DEFAULT 1,
dedupe_key text NOT NULL,
expires_at TEXT,
CHECK((scope='user' AND project_id IS NULL) OR
 (scope='project' AND project_id IS NOT NULL)),
FOREIGN KEY(owner_id,project_id) REFERENCES projects(owner_id,id),
UNIQUE(owner_id,id)
);

CREATE TABLE memory_versions (
id TEXT PRIMARY KEY,
owner_id TEXT NOT NULL REFERENCES local_accounts(id),
server_version INTEGER NOT NULL DEFAULT 0 CHECK(server_version >= 0),
local_revision INTEGER NOT NULL DEFAULT 0,
created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
deleted_at TEXT,
source_device_id TEXT,
memory_id TEXT NOT NULL,
memory_revision INTEGER NOT NULL,
snapshot TEXT NOT NULL,
reason text NOT NULL,
UNIQUE(owner_id,memory_id,memory_revision),
FOREIGN KEY(owner_id,memory_id) REFERENCES memories(owner_id,id),
UNIQUE(owner_id,id)
);

CREATE TABLE documents (
id TEXT PRIMARY KEY,
owner_id TEXT NOT NULL REFERENCES local_accounts(id),
server_version INTEGER NOT NULL DEFAULT 0 CHECK(server_version >= 0),
local_revision INTEGER NOT NULL DEFAULT 0,
created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
deleted_at TEXT,
source_device_id TEXT,
workspace_id TEXT NOT NULL,
project_id TEXT,
name text NOT NULL,
mime text NOT NULL,
byte_size INTEGER NOT NULL CHECK(byte_size BETWEEN 0 AND 20971520),
sha256 text NOT NULL CHECK(length(sha256)=64),
storage_key text,
processing_status text NOT NULL DEFAULT 'queued',
extraction_version INTEGER NOT NULL DEFAULT 1,
FOREIGN KEY(owner_id,workspace_id) REFERENCES workspaces(owner_id,id),
FOREIGN KEY(owner_id,project_id) REFERENCES projects(owner_id,id),
UNIQUE(owner_id,id)
);

CREATE TABLE message_attachments (
id TEXT PRIMARY KEY,
owner_id TEXT NOT NULL REFERENCES local_accounts(id),
server_version INTEGER NOT NULL DEFAULT 0 CHECK(server_version >= 0),
local_revision INTEGER NOT NULL DEFAULT 0,
created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
deleted_at TEXT,
source_device_id TEXT,
message_id TEXT NOT NULL,
document_id TEXT NOT NULL,
UNIQUE(owner_id,message_id,document_id),
FOREIGN KEY(owner_id,message_id) REFERENCES messages(owner_id,id),
FOREIGN KEY(owner_id,document_id) REFERENCES documents(owner_id,id),
UNIQUE(owner_id,id)
);

CREATE TABLE memory_sources (
id TEXT PRIMARY KEY,
owner_id TEXT NOT NULL REFERENCES local_accounts(id),
server_version INTEGER NOT NULL DEFAULT 0 CHECK(server_version >= 0),
local_revision INTEGER NOT NULL DEFAULT 0,
created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
deleted_at TEXT,
source_device_id TEXT,
memory_id TEXT NOT NULL,
message_id TEXT,
document_id TEXT,
excerpt text NOT NULL DEFAULT '',
CHECK((message_id IS NULL) <> (document_id IS NULL)),
FOREIGN KEY(owner_id,memory_id) REFERENCES memories(owner_id,id),
FOREIGN KEY(owner_id,message_id) REFERENCES messages(owner_id,id),
FOREIGN KEY(owner_id,document_id) REFERENCES documents(owner_id,id),
UNIQUE(owner_id,id)
);

CREATE TABLE conversation_summaries (
id TEXT PRIMARY KEY,
owner_id TEXT NOT NULL REFERENCES local_accounts(id),
server_version INTEGER NOT NULL DEFAULT 0 CHECK(server_version >= 0),
local_revision INTEGER NOT NULL DEFAULT 0,
created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
deleted_at TEXT,
source_device_id TEXT,
conversation_id TEXT NOT NULL,
through_message_id TEXT NOT NULL,
path_hash text NOT NULL,
summary text NOT NULL,
source_hash text NOT NULL,
FOREIGN KEY(owner_id,conversation_id) REFERENCES conversations(owner_id,id),
FOREIGN KEY(owner_id,through_message_id) REFERENCES messages(owner_id,id),
UNIQUE(owner_id,id)
);

CREATE TABLE document_chunks (
id TEXT PRIMARY KEY,
owner_id TEXT NOT NULL REFERENCES local_accounts(id),
server_version INTEGER NOT NULL DEFAULT 0 CHECK(server_version >= 0),
local_revision INTEGER NOT NULL DEFAULT 0,
created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
deleted_at TEXT,
source_device_id TEXT,
document_id TEXT NOT NULL,
extraction_version INTEGER NOT NULL DEFAULT 1,
ordinal INTEGER NOT NULL CHECK(ordinal >= 0),
text text NOT NULL,
page_no INTEGER,
source_locator TEXT NOT NULL DEFAULT '{}',
content_hash text NOT NULL,
UNIQUE(owner_id,document_id,extraction_version,ordinal),
FOREIGN KEY(owner_id,document_id) REFERENCES documents(owner_id,id),
UNIQUE(owner_id,id)
);

CREATE TABLE embeddings (
id TEXT PRIMARY KEY,
owner_id TEXT NOT NULL REFERENCES local_accounts(id),
server_version INTEGER NOT NULL DEFAULT 0 CHECK(server_version >= 0),
local_revision INTEGER NOT NULL DEFAULT 0,
created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
deleted_at TEXT,
source_device_id TEXT,
memory_id TEXT,
chunk_id TEXT,
vector_model text NOT NULL,
dimensions INTEGER NOT NULL CHECK(dimensions > 0),
embedding BLOB NOT NULL,
source_hash text NOT NULL,
CHECK((memory_id IS NULL) <> (chunk_id IS NULL)),
FOREIGN KEY(owner_id,memory_id) REFERENCES memories(owner_id,id),
FOREIGN KEY(owner_id,chunk_id) REFERENCES document_chunks(owner_id,id),
UNIQUE(owner_id,id)
);

CREATE INDEX idx_projects_workspace ON projects (owner_id,workspace_id);

CREATE INDEX idx_conversations_updated ON conversations (owner_id,updated_at DESC);

CREATE INDEX idx_messages_path ON messages (owner_id,conversation_id,client_created_at,id);

CREATE INDEX idx_messages_parent ON messages (owner_id,parent_id);

CREATE INDEX idx_memory_scope ON memories (owner_id,scope,project_id,status);

CREATE INDEX idx_memory_dedupe ON memories (owner_id,dedupe_key);

CREATE INDEX idx_documents_project ON documents (owner_id,project_id,processing_status);

CREATE INDEX idx_chunks_document ON document_chunks (owner_id,document_id,ordinal);

CREATE INDEX idx_embeddings_memory ON embeddings (owner_id,memory_id,vector_model);

CREATE INDEX idx_embeddings_chunk ON embeddings (owner_id,chunk_id,vector_model);

CREATE TABLE local_outbox (
 mutation_id TEXT PRIMARY KEY,
 entity_type TEXT NOT NULL,
 entity_id TEXT NOT NULL,
 base_version INTEGER NOT NULL,
 local_revision INTEGER NOT NULL,
 payload_json TEXT NOT NULL,
 request_hash TEXT NOT NULL,
 state TEXT NOT NULL DEFAULT 'pending',
 attempts INTEGER NOT NULL DEFAULT 0,
 next_retry_at TEXT,
 created_at TEXT NOT NULL
);
CREATE INDEX outbox_ready ON local_outbox(state,next_retry_at);
CREATE TABLE local_server_snapshots (
 entity_type TEXT NOT NULL,
 entity_id TEXT NOT NULL,
 server_version INTEGER NOT NULL,
 snapshot_json TEXT NOT NULL,
 PRIMARY KEY(entity_type,entity_id)
);
CREATE TABLE local_conflicts (
 id TEXT PRIMARY KEY,
 entity_type TEXT NOT NULL,
 entity_id TEXT NOT NULL,
 base_json TEXT NOT NULL,
 local_json TEXT NOT NULL,
 remote_json TEXT NOT NULL,
 remote_version INTEGER NOT NULL,
 resolved_at TEXT
);
CREATE TABLE local_jobs (
 id TEXT PRIMARY KEY,
 kind TEXT NOT NULL,
 dedupe_key TEXT NOT NULL UNIQUE,
 payload_json TEXT NOT NULL,
 state TEXT NOT NULL DEFAULT 'pending',
 attempts INTEGER NOT NULL DEFAULT 0,
 next_retry_at TEXT,
 lease_until TEXT,
 error_code TEXT
);
CREATE TABLE local_secrets (
 connection_id TEXT PRIMARY KEY,
 keychain_ref TEXT NOT NULL,
 last_test_status TEXT
);
CREATE TABLE local_files (
 document_id TEXT PRIMARY KEY,
 relative_path TEXT NOT NULL,
 download_status TEXT NOT NULL,
 verified_hash TEXT
);
CREATE TABLE local_meta (key TEXT PRIMARY KEY,value TEXT NOT NULL);
CREATE TABLE local_context_snapshots (
 request_id TEXT PRIMARY KEY,
 source_refs_json TEXT NOT NULL,
 snapshot_hash TEXT NOT NULL,
 created_at TEXT NOT NULL
);
CREATE TABLE local_memory_suppressions (
 dedupe_key TEXT PRIMARY KEY,
 expires_at TEXT NOT NULL
);
CREATE VIRTUAL TABLE search_index USING fts5(
 entity_type UNINDEXED,entity_id UNINDEXED,project_id UNINDEXED,text,
 tokenize='unicode61'
);
PRAGMA user_version=1;
COMMIT;
```

# 19 Phụ lục state machine và thuật toán đồng bộ

## 19.1 Generation state machine

queued → validating → connecting → streaming → completed. Các nhánh terminal khác là cancelled, failed và interrupted. Khi app bị kill, mọi generation local còn nonterminal chuyển interrupted khi khởi động. Cancel là yêu cầu bất đồng bộ; nếu terminal completed đã được commit trước cancel thì giữ completed. Không sửa finalized content sau terminal, ngoại trừ soft delete theo quyền người dùng.

## 19.2 Pseudocode push server

Pseudocode dưới đây mô tả hợp đồng chương 9, không phải hàm SQL đã cài đặt. entity_type phải ánh xạ qua allowlist repository có kiểu; không nội suy table name hoặc JSON field tùy ý vào SQL. Giá trị patch luôn parameterized.

```text
authenticate JWT and check active device
validate schema version and request size
BEGIN transaction
  create owner sync_head if absent
  SELECT owner sync_head FOR UPDATE
  for mutation in dependency order:
    if receipt exists:
      verify request_hash and reuse result
      continue
    load row by owner_id and entity_id
    verify base_version and allowed field patch
    verify parent scope and no deleted ancestors
    if conflict: ROLLBACK and return 409
    apply patch, server timestamps and next version
    increment owner head cursor
    append sync_change canonical snapshot
    write sync_receipt with same mutation_id
COMMIT
return ack only after commit
```

## 19.3 Pseudocode ghi Local

```text
BEGIN IMMEDIATE
  read entity and current local_revision
  apply validated patch to local entity
  increase local_revision
  insert outbox mutation with base server_version
COMMIT
notify UI after successful commit
schedule sync without blocking UI
```

Đối với một entity có nhiều mutation pending, base_version cuối cùng được gắn khi mutation đứng đầu đủ điều kiện gửi, sau ack của mutation trước; UUID và hash của mutation đã inflight giữ nguyên. Mỗi lần resolve conflict tạo mutation_id mới. Pull write không tạo outbox; UI update không được tự động biến thành mutation thứ hai.
