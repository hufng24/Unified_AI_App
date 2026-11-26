import type { Connection } from "@uai/contracts";
export default function ChatGPTShortcut({
  connections,
  currentId,
  busy,
  onSelect,
  onConnect,
}: {
  connections: Connection[];
  currentId: string;
  busy: boolean;
  onSelect: (id: string) => void;
  onConnect: () => void;
}) {
  const accounts = connections.filter((c) => c.auth_mode === "chatgpt");
  const selected =
    accounts.find((c) => c.id === currentId) ??
    accounts.find((c) => c.has_key && !c.needs_reauth) ??
    accounts[0];
  const ready = selected?.has_key && !selected.needs_reauth;
  return (
    <section className="chatgpt-shortcut" aria-label="ChatGPT trong hội thoại">
      <button
        className="primary"
        disabled={busy}
        onClick={() => (ready ? onSelect(selected.id) : onConnect())}
      >
        {ready ? "Chat với ChatGPT" : "Kết nối ChatGPT"}
      </button>
      <p>
        {ready
          ? `Chat trực tiếp trong khung hội thoại · ${selected.account_email ?? selected.name}`
          : selected
            ? "Phiên ChatGPT cần đăng nhập lại."
            : "Đăng nhập tài khoản ChatGPT để chat ngay tại đây."}
      </p>
      <small>
        Lịch sử lưu trong app. Kết nối hiện hỗ trợ chat; tạo ảnh bằng gói
        ChatGPT chưa được hỗ trợ.
      </small>
    </section>
  );
}
