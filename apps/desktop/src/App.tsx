import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { create } from "zustand";
import {
  ArrowUp,
  ArrowUpRight,
  BookOpen,
  BrainCircuit,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clipboard,
  Code2,
  Command,
  FileText,
  Folder,
  FolderPlus,
  Globe,
  Info,
  KeyRound,
  Layers3,
  LoaderCircle,
  MessageSquare,
  MoreHorizontal,
  PanelRightClose,
  PanelRightOpen,
  Pencil,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Square,
  Trash2,
  Upload,
  X,
  Download,
  Link2,
  RefreshCw,
} from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Project, Provider, Message, SendInput } from "@uai/contracts";
import { providerNames } from "@uai/contracts/display";
import { bridge, branch, errorText, native, type NativeEvent } from "./bridge";

type View =
  | "chat"
  | "projects"
  | "memory"
  | "knowledge"
  | "connections"
  | "settings"
  | "search";
const useUI = create<{
  view: View;
  conversation: string | null;
  project: string | null;
  panel: boolean;
  set: (
    v: Partial<{
      view: View;
      conversation: string | null;
      project: string | null;
      panel: boolean;
    }>,
  ) => void;
}>((set) => ({
  view: "chat",
  conversation: null,
  project: null,
  panel: true,
  set: (v) => set(v),
}));
function Brand({ small = false }: { small?: boolean }) {
  return (
    <div className={`brand ${small ? "small" : ""}`}>
      <div className="brand-mark">
        <Layers3 size={small ? 20 : 25} />
      </div>
      {!small && (
        <span>
          unified<span className="brand-light">ai</span>
          <small>WORKSPACE</small>
        </span>
      )}
    </div>
  );
}
function ProviderBadge({ provider }: { provider: Provider }) {
  return (
    <span className={`provider-badge ${provider}`}>
      {provider === "openai" ? (
        <Sparkles size={15} />
      ) : provider === "anthropic" ? (
        "A"
      ) : (
        <Sparkles size={15} />
      )}
    </span>
  );
}
function Modal({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const el = ref.current;
    el?.querySelector<HTMLElement>("input,textarea,select,button")?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      if (e.key === "Tab" && el) {
        const all = [
          ...el.querySelectorAll<HTMLElement>(
            'button:not([disabled]),input,textarea,select,[tabindex="0"]',
          ),
        ];
        const first = all[0],
          last = all.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-heading">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className="icon-button" aria-label="Đóng" onClick={onClose}>
            <X size={19} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
export default function App() {
  const ui = useUI();
  const qc = useQueryClient();
  const { data, error, isPending } = useQuery({
    queryKey: ["snapshot"],
    queryFn: bridge.snapshot,
  });
  const [notice, setNotice] = useState("");
  const [connectionId, setConnectionId] = useState("");
  const [busy, setBusy] = useState(false);
  const [requestId, setRequestId] = useState("");
  const [stream, setStream] = useState<Record<string, string>>({});
  const [projectModal, setProjectModal] = useState<Project | "new" | null>(
    null,
  );
  const [connectionModal, setConnectionModal] = useState(false);
  const [memoryModal, setMemoryModal] = useState(false);
  const [deleteConnection, setDeleteConnection] = useState<string | null>(null);
  const [deleteMemory, setDeleteMemory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editMessage, setEditMessage] = useState<Message | null>(null);
  const accumulated = useRef<Record<string, string>>({});
  const terminalSeen = useRef(false);
  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ["snapshot"] });
    await qc.invalidateQueries({ queryKey: ["messages"] });
  };
  const fail = (e: unknown) => setNotice(errorText(e));
  const run = async (action: () => Promise<unknown>, message?: string) => {
    try {
      const result = await action();
      await refresh();
      if (message && result !== false) setNotice(message);
    } catch (e) {
      fail(e);
    }
  };
  useEffect(() => {
    if (!connectionId && data?.connections[0])
      setConnectionId(data.connections[0].id);
  }, [data, connectionId]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 7000);
    return () => clearTimeout(t);
  }, [notice]);
  const newChat = async (project = ui.project) => {
    if (busy) return;
    try {
      const id = await bridge.newConversation(project);
      ui.set({ view: "chat", conversation: id, project });
      await refresh();
    } catch (e) {
      fail(e);
    }
  };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (!busy) ui.set({ view: "search" });
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault();
        void newChat();
      }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [ui.project, busy]);
  const conversation = data?.conversations.find(
    (c) => c.id === ui.conversation,
  );
  const currentProject = data?.projects.find(
    (p) => p.id === (conversation?.project_id ?? ui.project),
  );
  const currentConnection = data?.connections.find(
    (c) => c.id === connectionId,
  );
  const messagesQuery = useQuery({
    queryKey: ["messages", ui.conversation],
    queryFn: () => bridge.messages(ui.conversation!),
    enabled: !!ui.conversation,
  });
  const all = messagesQuery.data ?? [];
  const path = branch(
    all,
    conversation?.selected_leaf_id ?? all.at(-1)?.id ?? null,
  );
  const scopedMemories =
    data?.memories.filter(
      (m) => !m.project_id || m.project_id === currentProject?.id,
    ) ?? [];
  const scopedDocuments =
    data?.documents.filter(
      (d) => (d.project_id ?? null) === (currentProject?.id ?? null),
    ) ?? [];
  const onEvent = (event: NativeEvent) => {
    if (event.type === "text.delta" && event.assistant_message_id) {
      const id = event.assistant_message_id;
      accumulated.current[id] =
        (accumulated.current[id] ?? "") + (event.text ?? "");
      setStream({ ...accumulated.current });
    }
    if (event.type === "generation.failed" && event.message)
      setNotice(event.message);
    if (event.type === "local.persisted") {
      terminalSeen.current = true;
      setBusy(false);
      setRequestId("");
      if (event.code)
        setNotice(
          event.status === "cancelled"
            ? "Đã dừng và giữ phần nội dung nhận được."
            : `Phản hồi chưa hoàn tất (${event.code}). Bạn có thể tạo lại.`,
        );
      if (event.saved === false)
        setNotice(
          "Không lưu được phản hồi. Hãy sao chép nội dung trước khi đóng app.",
        );
      void refresh();
    }
  };
  const send = async (input: SendInput) => {
    setBusy(true);
    terminalSeen.current = false;
    try {
      const result = await bridge.send(input, onEvent);
      if (!terminalSeen.current) setRequestId(result.request_id);
      await refresh();
      return true;
    } catch (e) {
      setBusy(false);
      fail(e);
      return false;
    }
  };
  if (isPending)
    return (
      <div className="boot">
        <Brand />
        <LoaderCircle className="spin" />
        <p>Đang mở không gian làm việc…</p>
      </div>
    );
  if (error || !data)
    return (
      <div className="boot">
        <h2>Chưa mở được workspace</h2>
        <p>{errorText(error)}</p>
        <button onClick={() => void qc.invalidateQueries()}>Thử lại</button>
      </div>
    );
  const nav = [
    { id: "projects", label: "Dự án", icon: Folder },
    { id: "knowledge", label: "Kho kiến thức", icon: BookOpen },
    { id: "memory", label: "Bộ nhớ", icon: BrainCircuit },
    { id: "connections", label: "Kết nối AI", icon: Link2 },
  ] as const;
  const title = {
    chat: conversation?.title ?? "Không gian làm việc",
    projects: "Dự án",
    memory: "Bộ nhớ",
    knowledge: "Kho kiến thức",
    connections: "Kết nối AI",
    settings: "Cài đặt",
    search: "Tìm kiếm",
  }[ui.view];
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <button
          className="new-chat"
          disabled={busy}
          onClick={() => void newChat()}
        >
          <Plus size={17} /> Cuộc trò chuyện mới <span>⌘ N</span>
        </button>
        <button
          className={`nav-button ${ui.view === "search" ? "active" : ""}`}
          disabled={busy}
          onClick={() => ui.set({ view: "search" })}
        >
          <Search size={17} /> Tìm kiếm <kbd>⌘ K</kbd>
        </button>
        <div className="nav-group">KHÔNG GIAN LÀM VIỆC</div>
        <nav>
          {nav.map((n) => (
            <button
              disabled={busy}
              key={n.id}
              className={`nav-button ${ui.view === n.id ? "active" : ""}`}
              onClick={() => ui.set({ view: n.id })}
            >
              <n.icon size={17} />
              {n.label}
              {n.id === "connections" && (
                <span className="nav-count">{data.connections.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="nav-group group-action">
          DỰ ÁN CỦA BẠN
          <button
            className="icon-button"
            aria-label="Thêm dự án"
            onClick={() => setProjectModal("new")}
          >
            <Plus size={14} />
          </button>
        </div>
        <div className="project-nav">
          {data.projects.slice(0, 5).map((p, i) => (
            <button
              disabled={busy}
              className={`nav-button ${ui.project === p.id ? "selected-project" : ""}`}
              key={p.id}
              onClick={() =>
                ui.set({ view: "chat", project: p.id, conversation: null })
              }
            >
              <i className={`project-dot dot-${i % 3}`} />
              <span>{p.name}</span>
            </button>
          ))}
          {!data.projects.length && (
            <button
              className="subtle-link"
              onClick={() => setProjectModal("new")}
            >
              <FolderPlus size={15} /> Tạo dự án đầu tiên
            </button>
          )}
        </div>
        <div className="nav-group group-action">
          HỘI THOẠI GẦN ĐÂY <MessageSquare size={13} />
        </div>
        <div className="history">
          {data.conversations.slice(0, 25).map((c) => (
            <button
              disabled={busy}
              key={c.id}
              className={`history-button ${ui.conversation === c.id ? "active" : ""}`}
              onClick={() =>
                ui.set({
                  view: "chat",
                  conversation: c.id,
                  project: c.project_id,
                })
              }
            >
              <MessageSquare size={14} />
              <span>{c.title}</span>
            </button>
          ))}
          {!data.conversations.length && (
            <p className="sidebar-empty">
              Hội thoại của bạn sẽ xuất hiện ở đây.
            </p>
          )}
        </div>
        <div className="sidebar-bottom">
          <div className="local-status">
            <span className="status-dot" />
            <span>
              Lưu trên thiết bị
              <small>
                {native ? "SQLite · Bản nội bộ 0.1" : "Chế độ xem giao diện"}
              </small>
            </span>
            <ShieldCheck size={16} />
          </div>
          <button
            className={`profile ${ui.view === "settings" ? "active" : ""}`}
            disabled={busy}
            onClick={() => ui.set({ view: "settings" })}
          >
            <div className="avatar">U</div>
            <span>
              Không gian cá nhân<small>Local workspace</small>
            </span>
            <Settings2 size={16} />
          </button>
        </div>
      </aside>
      <main className="workspace">
        <header className="topbar">
          <div className="breadcrumbs">
            <span>Workspace</span>
            <ChevronRight size={14} />
            {currentProject && ui.view === "chat" ? (
              <>
                <Folder size={14} />
                <span>{currentProject.name}</span>
                <ChevronRight size={14} />
              </>
            ) : null}
            <strong>{title}</strong>
          </div>
          <div className="top-actions">
            <span className="version-pill">
              {native ? "BẢN NỘI BỘ" : "XEM TRƯỚC UI"}
            </span>
            <button
              className="icon-button"
              aria-label={ui.panel ? "Đóng bảng ngữ cảnh" : "Mở bảng ngữ cảnh"}
              onClick={() => ui.set({ panel: !ui.panel })}
            >
              {ui.panel ? (
                <PanelRightClose size={18} />
              ) : (
                <PanelRightOpen size={18} />
              )}
            </button>
          </div>
        </header>
        <div className="workspace-body">
          <section className="main-panel">
            {ui.view === "chat" && (
              <>
                {!ui.conversation ? (
                  <div className="welcome">
                    <div className="eyebrow">
                      <span /> MỘT KHÔNG GIAN. NHIỀU KHẢ NĂNG.
                    </div>
                    <div className="welcome-symbol">
                      <Layers3 size={35} />
                      <span className="orbit orbit-one" />
                      <span className="orbit orbit-two" />
                    </div>
                    <h1>
                      Ý tưởng lớn bắt đầu
                      <br />
                      từ một cuộc trò chuyện.
                    </h1>
                    <p>
                      Làm việc cùng các AI bạn yêu thích.
                      <br />
                      Giữ kiến thức và ngữ cảnh trong cùng một không gian.
                    </p>
                    <div className="provider-line">
                      <span>
                        <ProviderBadge provider="openai" />
                        OpenAI
                      </span>
                      <span>
                        <ProviderBadge provider="anthropic" />
                        Claude
                      </span>
                      <span>
                        <ProviderBadge provider="google" />
                        Gemini
                      </span>
                      <i>+ một bộ nhớ chung</i>
                    </div>
                    <div className="starter-grid">
                      {[
                        {
                          icon: Sparkles,
                          title: "Bắt đầu một ý tưởng",
                          body: "Khám phá, đặt câu hỏi và phát triển ý tưởng.",
                          action: () => newChat(),
                        },
                        {
                          icon: FolderPlus,
                          title: currentProject
                            ? "Làm việc trong dự án"
                            : "Tạo không gian dự án",
                          body:
                            currentProject?.name ??
                            "Tập trung hội thoại, tài liệu và chỉ dẫn.",
                          action: () =>
                            currentProject ? newChat() : setProjectModal("new"),
                        },
                        {
                          icon: Link2,
                          title: "Kết nối AI của bạn",
                          body: "Dùng API Key riêng, kiểm soát chi phí.",
                          action: () => ui.set({ view: "connections" }),
                        },
                        {
                          icon: BrainCircuit,
                          title: "Xây dựng bộ nhớ",
                          body: "Lưu những điều quan trọng cho công việc.",
                          action: () => ui.set({ view: "memory" }),
                        },
                      ].map((s) => (
                        <button
                          key={s.title}
                          className="starter-card"
                          onClick={() => void s.action()}
                        >
                          <s.icon size={20} />
                          <ArrowUpRight size={15} className="card-arrow" />
                          <strong>{s.title}</strong>
                          <span>{s.body}</span>
                        </button>
                      ))}
                    </div>
                    <div className="welcome-note">
                      <ShieldCheck size={14} /> Lịch sử thuộc về bạn. API Key
                      được bảo vệ trên thiết bị.
                    </div>
                  </div>
                ) : (
                  <div className="chat-scroll">
                    <div className="chat-path">
                      {messagesQuery.isPending ? (
                        <LoaderCircle className="spin" />
                      ) : path.length ? (
                        path.map((m) => {
                          const siblings = all.filter(
                            (s) =>
                              s.parent_id === m.parent_id && s.role === m.role,
                          );
                          return (
                            <article key={m.id} className={`message ${m.role}`}>
                              <div className="message-avatar">
                                {m.role === "user" ? (
                                  "U"
                                ) : (
                                  <ProviderBadge
                                    provider={
                                      (m.provider ?? "openai") as Provider
                                    }
                                  />
                                )}
                              </div>
                              <div className="message-body">
                                <div className="message-meta">
                                  <strong>
                                    {m.role === "user"
                                      ? "Bạn"
                                      : providerNames[
                                          (m.provider ?? "openai") as Provider
                                        ]}
                                  </strong>
                                  <span>{m.model ?? ""}</span>
                                  {m.status !== "completed" && (
                                    <span className="message-state">
                                      {(
                                        {
                                          pending: "Đang kết nối",
                                          streaming: "Đang trả lời",
                                          cancelled: "Đã dừng",
                                          interrupted: "Chưa hoàn tất",
                                          failed: "Lỗi",
                                        } as Record<string, string>
                                      )[m.status] ?? m.status}
                                    </span>
                                  )}
                                </div>
                                <div className="markdown">
                                  <Markdown
                                    remarkPlugins={[remarkGfm]}
                                    skipHtml
                                    components={{
                                      a: ({ children }) => (
                                        <span
                                          className="plain-link"
                                          title="Liên kết ngoài chưa mở trong bản nội bộ"
                                        >
                                          {children}
                                        </span>
                                      ),
                                      img: () => null,
                                    }}
                                  >
                                    {stream[m.id] ?? m.text ?? ""}
                                  </Markdown>
                                  {!m.text &&
                                    !stream[m.id] &&
                                    busy &&
                                    m.role === "assistant" && (
                                      <div className="typing">
                                        <i />
                                        <i />
                                        <i />
                                      </div>
                                    )}
                                </div>
                                <div className="message-actions">
                                  <button
                                    aria-label="Sao chép tin nhắn"
                                    onClick={() =>
                                      void navigator.clipboard
                                        .writeText(stream[m.id] ?? m.text)
                                        .then(() => setNotice("Đã sao chép."))
                                        .catch(fail)
                                    }
                                  >
                                    <Clipboard size={13} />
                                    Sao chép
                                  </button>
                                  {m.role === "user" && !busy && (
                                    <button onClick={() => setEditMessage(m)}>
                                      <Pencil size={13} />
                                      Sửa prompt
                                    </button>
                                  )}
                                  {m.role === "assistant" &&
                                    !busy &&
                                    currentConnection && (
                                      <button
                                        onClick={() =>
                                          void send({
                                            conversation_id: ui.conversation!,
                                            connection_id: connectionId,
                                            text: "",
                                            regenerate_user_id: m.parent_id!,
                                          })
                                        }
                                      >
                                        <RefreshCw size={13} />
                                        Tạo lại
                                      </button>
                                    )}
                                  {siblings.length > 1 && (
                                    <span className="branch-nav">
                                      <button
                                        disabled={
                                          busy || siblings.indexOf(m) === 0
                                        }
                                        aria-label="Nhánh trước"
                                        onClick={() =>
                                          void run(() =>
                                            bridge.selectLeaf(
                                              ui.conversation!,
                                              siblings[siblings.indexOf(m) - 1]!
                                                .id,
                                            ),
                                          )
                                        }
                                      >
                                        <ChevronLeft size={14} />
                                      </button>
                                      {siblings.indexOf(m) + 1}/
                                      {siblings.length}
                                      <button
                                        disabled={
                                          busy ||
                                          siblings.indexOf(m) ===
                                            siblings.length - 1
                                        }
                                        aria-label="Nhánh sau"
                                        onClick={() =>
                                          void run(() =>
                                            bridge.selectLeaf(
                                              ui.conversation!,
                                              siblings[siblings.indexOf(m) + 1]!
                                                .id,
                                            ),
                                          )
                                        }
                                      >
                                        <ChevronRight size={14} />
                                      </button>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </article>
                          );
                        })
                      ) : (
                        <div className="chat-empty">
                          <Sparkles size={28} />
                          <h2>Bạn muốn bắt đầu từ đâu?</h2>
                          <p>Chọn một kết nối AI và gửi câu hỏi đầu tiên.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <Composer
                  key={ui.conversation ?? "welcome"}
                  conversationId={ui.conversation}
                  connections={data.connections}
                  connectionId={connectionId}
                  onConnection={setConnectionId}
                  busy={busy}
                  onStop={() => void run(() => bridge.cancel(requestId))}
                  onConnect={() => ui.set({ view: "connections" })}
                  onSend={async (text) => {
                    let id = ui.conversation;
                    if (!id) {
                      try {
                        id = await bridge.newConversation(ui.project);
                        ui.set({ conversation: id });
                        await refresh();
                      } catch (e) {
                        fail(e);
                        return false;
                      }
                    }
                    return send({
                      conversation_id: id,
                      connection_id: connectionId,
                      text,
                    });
                  }}
                  onError={fail}
                />
              </>
            )}
            {ui.view === "projects" && (
              <div className="page">
                <PageHeading
                  eyebrow="KHÔNG GIAN CÓ TỔ CHỨC"
                  title="Mọi dự án, một nơi."
                  description="Giữ mục tiêu, hội thoại và kiến thức theo từng công việc."
                  action={
                    <button
                      className="primary-button"
                      onClick={() => setProjectModal("new")}
                    >
                      <Plus size={16} />
                      Tạo dự án
                    </button>
                  }
                />
                <div className="projects-grid">
                  {data.projects.map((p, i) => (
                    <div className="project-card" key={p.id}>
                      <div className={`project-icon dot-${i % 3}`}>
                        <Folder size={23} />
                      </div>
                      <button
                        className="icon-button card-edit"
                        aria-label={`Sửa ${p.name}`}
                        onClick={() => setProjectModal(p)}
                      >
                        <Pencil size={15} />
                      </button>
                      <h3>{p.name}</h3>
                      <p>{p.description || "Chưa có mô tả dự án."}</p>
                      <div className="project-card-footer">
                        <span>
                          {
                            data.conversations.filter(
                              (c) => c.project_id === p.id,
                            ).length
                          }{" "}
                          hội thoại
                        </span>
                        <button
                          onClick={() =>
                            ui.set({
                              view: "chat",
                              project: p.id,
                              conversation: null,
                            })
                          }
                        >
                          Mở dự án
                          <ArrowUpRight size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    className="project-card add-project"
                    onClick={() => setProjectModal("new")}
                  >
                    <FolderPlus size={25} />
                    <strong>Thêm dự án mới</strong>
                    <span>Một không gian cho ý tưởng tiếp theo</span>
                  </button>
                </div>
              </div>
            )}
            {ui.view === "connections" && (
              <div className="page">
                <PageHeading
                  eyebrow="AI THEO CÁCH CỦA BẠN"
                  title="Kết nối những khả năng."
                  description="Sử dụng API Key riêng. Key chỉ được lưu trong kho bí mật của thiết bị."
                  action={
                    <button
                      className="primary-button"
                      onClick={() => setConnectionModal(true)}
                    >
                      <Plus size={16} />
                      Thêm kết nối
                    </button>
                  }
                />
                <div className="info-strip">
                  <ShieldCheck size={18} />
                  <span>
                    Chat gửi Key tạm thời qua Gateway tới provider. Lịch sử chat
                    vẫn được lưu cục bộ.
                  </span>
                </div>
                <div className="connections-list">
                  {(["openai", "anthropic", "google"] as Provider[]).map(
                    (p) => (
                      <div className="connection-card" key={p}>
                        <div className="provider-heading">
                          <ProviderBadge provider={p} />
                          <div>
                            <h3>{providerNames[p]}</h3>
                            <span>
                              {p === "openai"
                                ? "OpenAI Responses API"
                                : p === "anthropic"
                                  ? "Anthropic Messages API"
                                  : "Google Gemini API"}
                            </span>
                          </div>
                        </div>
                        {data.connections
                          .filter((c) => c.provider === p)
                          .map((c) => (
                            <div className="saved-connection" key={c.id}>
                              <div>
                                <strong>{c.name}</strong>
                                <span>
                                  {c.default_model} ·{" "}
                                  {c.has_key
                                    ? "Key đã lưu trên máy"
                                    : "Cần nhập Key trên máy"}
                                </span>
                              </div>
                              <button
                                className="secondary-button"
                                onClick={() =>
                                  void run(
                                    () => bridge.testConnection(c.id),
                                    "Đã xác minh quyền truy cập model.",
                                  )
                                }
                              >
                                Kiểm tra
                              </button>
                              <button
                                className="icon-button danger"
                                aria-label={`Xóa kết nối ${c.name}`}
                                onClick={() => setDeleteConnection(c.id)}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}
                        {!data.connections.some((c) => c.provider === p) && (
                          <div className="connection-empty">
                            <span>Chưa có kết nối</span>
                            <button
                              className="secondary-button"
                              onClick={() => setConnectionModal(true)}
                            >
                              <Plus size={14} />
                              Kết nối
                            </button>
                          </div>
                        )}
                      </div>
                    ),
                  )}
                </div>
                <p className="fineprint">
                  Gói ChatGPT Plus, Claude Pro hay Gemini dành cho người dùng cá
                  nhân không tự cấp quyền API. Phí API thanh toán trực tiếp với
                  nhà cung cấp.
                </p>
              </div>
            )}
            {ui.view === "memory" && (
              <div className="page">
                <PageHeading
                  eyebrow="NGỮ CẢNH ĐƯỢC GIỮ LẠI"
                  title="Những điều đáng nhớ."
                  description="Bộ nhớ do bạn chủ động lưu. Dùng chung giữa các AI, đúng phạm vi dự án."
                  action={
                    <button
                      className="primary-button"
                      onClick={() => setMemoryModal(true)}
                    >
                      <Plus size={16} />
                      Thêm bộ nhớ
                    </button>
                  }
                />
                <div className="filter-row">
                  <span className="filter-chip active">
                    Tất cả <b>{data.memories.length}</b>
                  </span>
                  <span className="manual-label">
                    <ShieldCheck size={14} />
                    Lưu thủ công · Tự trích xuất chưa bật
                  </span>
                </div>
                {data.memories.length ? (
                  <div className="memory-list">
                    {data.memories.map((m) => (
                      <div className="memory-card" key={m.id}>
                        <BrainCircuit size={20} />
                        <div>
                          <span className="scope-label">
                            {m.project_id
                              ? (data.projects.find(
                                  (p) => p.id === m.project_id,
                                )?.name ?? "Dự án")
                              : "Bộ nhớ cá nhân"}
                          </span>
                          <p>{m.content}</p>
                          <small>Do bạn thêm · Đã duyệt</small>
                        </div>
                        <button
                          className="icon-button danger"
                          aria-label="Xóa bộ nhớ"
                          onClick={() => setDeleteMemory(m.id)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Empty
                    icon={<BrainCircuit size={34} />}
                    title="Bộ nhớ bắt đầu từ những điều quan trọng"
                    body="Lưu sở thích làm việc, quy tắc hoặc quyết định dự án để AI có thể dùng trong những lượt tiếp theo."
                  />
                )}
              </div>
            )}
            {ui.view === "knowledge" && (
              <div className="page">
                <PageHeading
                  eyebrow="KIẾN THỨC RIÊNG CỦA BẠN"
                  title="Tài liệu thành ngữ cảnh."
                  description="Nhập văn bản, tìm những đoạn liên quan và đưa vào hội thoại."
                  action={
                    <button
                      className="primary-button"
                      onClick={() =>
                        void run(
                          () => bridge.importDocument(ui.project),
                          "Đã nhập và lập chỉ mục tài liệu.",
                        )
                      }
                    >
                      <Upload size={16} />
                      Nhập tài liệu
                    </button>
                  }
                />
                <div className="info-strip">
                  <Info size={18} />
                  <span>
                    Bản nội bộ nhận TXT và Markdown UTF-8, tối đa 2 MiB. PDF và
                    embedding sẽ có ở mốc Knowledge tiếp theo.
                  </span>
                </div>
                <div className="document-table">
                  <div className="document-row document-head">
                    <span>TÊN TÀI LIỆU</span>
                    <span>PHẠM VI</span>
                    <span>TRẠNG THÁI</span>
                  </div>
                  {data.documents.map((d) => (
                    <div className="document-row" key={d.id}>
                      <span>
                        <FileText size={18} />
                        {d.name}
                        <small>{Math.ceil(d.byte_size / 1024)} KB</small>
                      </span>
                      <span>
                        {data.projects.find((p) => p.id === d.project_id)
                          ?.name ?? "Cá nhân"}
                      </span>
                      <span className="success-text">
                        <Check size={14} />
                        Keyword ready
                      </span>
                    </div>
                  ))}
                </div>
                {!data.documents.length && (
                  <Empty
                    icon={<BookOpen size={34} />}
                    title="Thêm nguồn kiến thức đầu tiên"
                    body="Các file được sao chép vào thư mục dữ liệu ứng dụng. Không tải toàn bộ tài liệu lên AI khi chưa cần."
                  />
                )}
              </div>
            )}
            {ui.view === "search" && (
              <div className="page">
                <PageHeading
                  eyebrow="TÌM LẠI MẠCH SUY NGHĨ"
                  title="Một nơi để tìm tất cả."
                  description="Tìm tiêu đề hội thoại, dự án và bộ nhớ đã lưu trên thiết bị."
                />
                <div className="search-field">
                  <Search size={20} />
                  <input
                    autoFocus
                    aria-label="Tìm trong workspace"
                    placeholder="Tìm trong workspace…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <kbd>ESC</kbd>
                </div>
                <div className="search-results">
                  {search.trim() && (
                    <>
                      {data.conversations
                        .filter((c) =>
                          c.title.toLowerCase().includes(search.toLowerCase()),
                        )
                        .map((c) => (
                          <button
                            key={c.id}
                            onClick={() =>
                              ui.set({
                                view: "chat",
                                conversation: c.id,
                                project: c.project_id,
                              })
                            }
                          >
                            <MessageSquare size={19} />
                            <span>
                              <small>HỘI THOẠI</small>
                              {c.title}
                            </span>
                            <ArrowUpRight size={16} />
                          </button>
                        ))}
                      {data.projects
                        .filter((p) =>
                          p.name.toLowerCase().includes(search.toLowerCase()),
                        )
                        .map((p) => (
                          <button
                            key={p.id}
                            onClick={() =>
                              ui.set({
                                view: "chat",
                                project: p.id,
                                conversation: null,
                              })
                            }
                          >
                            <Folder size={19} />
                            <span>
                              <small>DỰ ÁN</small>
                              {p.name}
                            </span>
                            <ArrowUpRight size={16} />
                          </button>
                        ))}
                      {data.memories
                        .filter((m) =>
                          m.content
                            .toLowerCase()
                            .includes(search.toLowerCase()),
                        )
                        .map((m) => (
                          <div key={m.id} className="search-memory">
                            <BrainCircuit size={19} />
                            <span>
                              <small>BỘ NHỚ</small>
                              {m.content}
                            </span>
                          </div>
                        ))}
                    </>
                  )}
                </div>
                {!search && (
                  <Empty
                    icon={<Search size={32} />}
                    title="Thông tin của bạn luôn trong tầm tay"
                    body="Nhập một từ khóa để bắt đầu tìm kiếm."
                  />
                )}
              </div>
            )}
            {ui.view === "settings" && (
              <div className="page settings-page">
                <PageHeading
                  eyebrow="KHÔNG GIAN DO BẠN KIỂM SOÁT"
                  title="Cài đặt workspace."
                  description="Thông tin lưu trữ, quyền riêng tư và trạng thái triển khai."
                />
                <div className="settings-block">
                  <h3>
                    <ShieldCheck size={18} />
                    Dữ liệu trên thiết bị
                  </h3>
                  <p>
                    Hội thoại, dự án và bộ nhớ lưu trong SQLite. API Key được
                    giữ riêng trong Keychain trên Mac hoặc Credential Manager
                    trên Windows.
                  </p>
                  <code className="data-path">{data.data_path}</code>
                  <button
                    className="secondary-button"
                    onClick={() =>
                      void run(
                        bridge.exportData,
                        "Đã xuất dữ liệu. File không chứa API Key hoặc session.",
                      )
                    }
                  >
                    <Download size={16} />
                    Xuất dữ liệu JSON
                  </button>
                </div>
                <div className="settings-block">
                  <h3>
                    <Globe size={18} />
                    Cloud Sync
                  </h3>
                  <div className="settings-status">
                    <span className="pending-dot" />
                    Chưa được cấu hình
                  </div>
                  <p>
                    {data.pending_mutations} thao tác đã được ghi trong outbox
                    cục bộ. Bản nội bộ chưa gửi dữ liệu lên Cloud. Đăng nhập
                    Google, xử lý xung đột và đồng bộ nhiều máy là các mốc tiếp
                    theo.
                  </p>
                </div>
                <div className="settings-block">
                  <h3>
                    <Info size={18} />
                    Unified AI Workspace
                  </h3>
                  <p>
                    Phiên bản 0.1.0 · Foundation Alpha · Phát triển theo đặc tả
                    phiên bản 2.0.
                  </p>
                  <p>
                    Bản hiện tại chưa có bộ cài được ký, tự động cập nhật hoặc
                    E2EE.
                  </p>
                </div>
              </div>
            )}
          </section>
          {ui.panel && ui.view === "chat" && (
            <aside className="context-panel">
              <div className="context-title">
                <Layers3 size={16} />
                <strong>Ngữ cảnh làm việc</strong>
                <span className="context-count">
                  {scopedMemories.length + scopedDocuments.length}
                </span>
              </div>
              <p className="context-intro">
                Thông tin đồng hành cùng cuộc trò chuyện của bạn.
              </p>
              <div className="context-section">
                <div className="context-label">
                  <Folder size={14} />
                  DỰ ÁN
                </div>
                <div className="context-project">
                  <span className="project-dot dot-0" />
                  {currentProject?.name ?? "Không gian cá nhân"}
                </div>
                {currentProject?.instructions ? (
                  <p className="instructions-preview">
                    {currentProject.instructions}
                  </p>
                ) : (
                  <p className="context-muted">
                    {currentProject
                      ? "Thêm chỉ dẫn để AI hiểu rõ cách làm việc."
                      : "Chọn một dự án ở sidebar để giữ ngữ cảnh theo công việc."}
                  </p>
                )}
              </div>
              <div className="context-section">
                <div className="context-label">
                  <BrainCircuit size={14} />
                  BỘ NHỚ<span>{scopedMemories.length}</span>
                </div>
                {scopedMemories.slice(0, 4).map((m) => (
                  <div className="context-memory" key={m.id}>
                    <i />
                    {m.content}
                  </div>
                ))}
                {!scopedMemories.length && (
                  <p className="context-muted">
                    Chưa có bộ nhớ. Lưu những điều bạn muốn AI ghi nhớ.
                  </p>
                )}
                <button
                  className="text-button"
                  onClick={() => ui.set({ view: "memory" })}
                >
                  Quản lý bộ nhớ
                  <ArrowUpRight size={13} />
                </button>
              </div>
              <div className="context-section">
                <div className="context-label">
                  <FileText size={14} />
                  TÀI LIỆU<span>{scopedDocuments.length}</span>
                </div>
                {scopedDocuments.slice(0, 3).map((d) => (
                  <div className="context-document" key={d.id}>
                    <FileText size={15} />
                    {d.name}
                  </div>
                ))}
                {!scopedDocuments.length && (
                  <button
                    className="context-upload"
                    onClick={() =>
                      void run(
                        () => bridge.importDocument(currentProject?.id),
                        "Đã nhập tài liệu.",
                      )
                    }
                  >
                    <Plus size={15} />
                    Thêm tài liệu tham khảo
                  </button>
                )}
              </div>
              <div className="context-footer">
                <ShieldCheck size={19} />
                <strong>Ngữ cảnh có chọn lọc</strong>
                <p>
                  Bộ nhớ đã duyệt và đoạn tài liệu liên quan được gửi khi bạn
                  đặt câu hỏi.
                </p>
                <span>
                  <span className="status-dot" />
                  Dữ liệu gốc lưu cục bộ
                </span>
              </div>
            </aside>
          )}
        </div>
      </main>
      {notice && (
        <div className="toast" role="status">
          <Info size={18} />
          <span>{notice}</span>
          <button aria-label="Đóng thông báo" onClick={() => setNotice("")}>
            <X size={16} />
          </button>
        </div>
      )}
      {editMessage && (
        <EditPromptForm
          message={editMessage}
          canSend={!!currentConnection}
          onClose={() => setEditMessage(null)}
          onSave={async (text) => {
            if (
              await send({
                conversation_id: editMessage.conversation_id,
                connection_id: connectionId,
                text,
                edit_message_id: editMessage.id,
              })
            )
              setEditMessage(null);
          }}
        />
      )}
      {projectModal && (
        <ProjectForm
          project={projectModal === "new" ? undefined : projectModal}
          onClose={() => setProjectModal(null)}
          onSave={async (input) => {
            try {
              await bridge.saveProject(input);
              setProjectModal(null);
              await refresh();
            } catch (e) {
              fail(e);
            }
          }}
        />
      )}
      {connectionModal && (
        <ConnectionForm
          onClose={() => setConnectionModal(false)}
          onSave={async (input) => {
            try {
              const id = await bridge.saveConnection(input);
              setConnectionId(id);
              setConnectionModal(false);
              await refresh();
              setNotice("Key đã lưu trong kho bí mật của thiết bị.");
            } catch (e) {
              fail(e);
            }
          }}
        />
      )}
      {memoryModal && (
        <MemoryForm
          projects={data.projects}
          selected={ui.project}
          onClose={() => setMemoryModal(false)}
          onSave={async (content, project) => {
            try {
              await bridge.saveMemory(content, project);
              setMemoryModal(false);
              await refresh();
            } catch (e) {
              fail(e);
            }
          }}
        />
      )}
      {deleteConnection && (
        <Confirm
          title="Xóa kết nối AI"
          body="API Key trên máy sẽ được xóa khỏi kho bí mật. Lịch sử hội thoại vẫn được giữ."
          onClose={() => setDeleteConnection(null)}
          onConfirm={() =>
            void run(async () => {
              await bridge.deleteConnection(deleteConnection);
              if (connectionId === deleteConnection) setConnectionId("");
              setDeleteConnection(null);
            })
          }
        />
      )}
      {deleteMemory && (
        <Confirm
          title="Xóa bộ nhớ"
          body="Bộ nhớ sẽ bị loại khỏi ngữ cảnh các lượt tiếp theo. Nội dung đã gửi tới AI trước đó không thể thu hồi."
          onClose={() => setDeleteMemory(null)}
          onConfirm={() =>
            void run(async () => {
              await bridge.deleteMemory(deleteMemory);
              setDeleteMemory(null);
            })
          }
        />
      )}
    </div>
  );
}
function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
function Empty({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="empty-state">
      <div>{icon}</div>
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
  );
}
export function Composer({
  conversationId,
  connections,
  connectionId,
  onConnection,
  busy,
  onStop,
  onConnect,
  onSend,
  onError,
}: {
  conversationId: string | null;
  connections: {
    id: string;
    name: string;
    provider: Provider;
    default_model: string | null;
  }[];
  connectionId: string;
  onConnection: (id: string) => void;
  busy: boolean;
  onStop: () => void;
  onConnect: () => void;
  onSend: (text: string) => Promise<boolean>;
  onError: (error: unknown) => void;
}) {
  const [text, setText] = useState("");
  const [loaded, setLoaded] = useState(!conversationId);
  const [submitting, setSubmitting] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);
  const draftRef = useRef({ text: "", loaded: !conversationId });
  draftRef.current = { text, loaded };
  useEffect(() => {
    if (conversationId)
      void bridge
        .draft(conversationId)
        .then((s) => {
          setText(s);
          setLoaded(true);
        })
        .catch(onError);
  }, []);
  useEffect(() => {
    if (!conversationId || !loaded) return;
    const t = setTimeout(
      () => void bridge.saveDraft(conversationId, text).catch(onError),
      500,
    );
    return () => clearTimeout(t);
  }, [text, loaded, conversationId]);
  useEffect(
    () => () => {
      if (conversationId && draftRef.current.loaded)
        void bridge
          .saveDraft(conversationId, draftRef.current.text)
          .catch(onError);
    },
    [conversationId],
  );
  useEffect(() => {
    if (area.current) {
      area.current.style.height = "auto";
      area.current.style.height =
        Math.min(area.current.scrollHeight, 180) + "px";
    }
  }, [text]);
  const submit = async () => {
    if (!text.trim() || busy || submitting) return;
    if (!connectionId) {
      onConnect();
      return;
    }
    setSubmitting(true);
    if (await onSend(text)) setText("");
    setSubmitting(false);
  };
  return (
    <div className="composer-area">
      <div className="composer">
        <textarea
          ref={area}
          aria-label="Tin nhắn"
          rows={2}
          maxLength={32000}
          placeholder="Hỏi, sáng tạo hoặc tiếp tục ý tưởng của bạn…"
          value={text}
          disabled={!loaded}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              !e.shiftKey &&
              !e.nativeEvent.isComposing
            ) {
              e.preventDefault();
              void submit();
            }
          }}
        />
        <div className="composer-tools">
          <div className="model-select">
            <Sparkles size={14} />
            {connections.length ? (
              <>
                <select
                  aria-label="Kết nối và model AI"
                  disabled={busy}
                  value={connectionId}
                  onChange={(e) => onConnection(e.target.value)}
                >
                  {connections.map((c) => (
                    <option key={c.id} value={c.id}>
                      {providerNames[c.provider]} · {c.default_model}
                    </option>
                  ))}
                </select>
                <ChevronDown size={12} />
              </>
            ) : (
              <button onClick={onConnect}>
                Chọn kết nối AI <ChevronDown size={12} />
              </button>
            )}
          </div>
          <span className="composer-hint">Shift Enter xuống dòng</span>
          {busy ? (
            <button
              className="send-button stop-button"
              aria-label="Dừng phản hồi"
              onClick={onStop}
            >
              <Square size={16} fill="currentColor" />
            </button>
          ) : (
            <button
              className="send-button"
              aria-label="Gửi tin nhắn"
              disabled={!text.trim() || submitting}
              onClick={() => void submit()}
            >
              {submitting ? (
                <LoaderCircle size={18} className="spin" />
              ) : (
                <ArrowUp size={19} />
              )}
            </button>
          )}
        </div>
      </div>
      <div className="composer-footer">
        <span>AI có thể mắc lỗi. Hãy kiểm tra thông tin quan trọng.</span>
        <span>
          <span className="status-dot" />
          {native ? "Lưu trên thiết bị" : "Xem trước giao diện"}
        </span>
      </div>
    </div>
  );
}
function ProjectForm({
  project,
  onClose,
  onSave,
}: {
  project?: Project;
  onClose: () => void;
  onSave: (input: {
    id?: string;
    name: string;
    description: string;
    instructions: string;
  }) => Promise<void>;
}) {
  const [name, setName] = useState(project?.name ?? ""),
    [description, setDescription] = useState(project?.description ?? ""),
    [instructions, setInstructions] = useState(project?.instructions ?? ""),
    [saving, setSaving] = useState(false);
  return (
    <Modal
      title={project ? "Chỉnh sửa dự án" : "Tạo dự án mới"}
      subtitle="Một không gian riêng cho hội thoại, tài liệu và chỉ dẫn."
      onClose={onClose}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setSaving(true);
          await onSave({ id: project?.id, name, description, instructions });
          setSaving(false);
        }}
      >
        <label>
          Tên dự án
          <input
            required
            maxLength={120}
            placeholder="Ví dụ: Thiết kế thương hiệu"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label>
          Mô tả
          <textarea
            rows={2}
            maxLength={2000}
            placeholder="Dự án này dành cho công việc gì?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label>
          Chỉ dẫn cho AI
          <textarea
            rows={5}
            maxLength={16000}
            placeholder="Mục tiêu, cách trả lời và các quy tắc cần tuân thủ…"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
          />
        </label>
        <div className="modal-footer">
          <button type="button" className="secondary-button" onClick={onClose}>
            Hủy
          </button>
          <button disabled={saving} className="primary-button">
            {saving ? "Đang lưu…" : "Lưu dự án"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
function ConnectionForm({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (input: {
    provider: Provider;
    name: string;
    model: string;
    api_key: string;
  }) => Promise<void>;
}) {
  const [provider, setProvider] = useState<Provider>("openai"),
    [name, setName] = useState(""),
    [model, setModel] = useState(""),
    [key, setKey] = useState(""),
    [saving, setSaving] = useState(false);
  return (
    <Modal
      title="Thêm kết nối AI"
      subtitle="API Key được giữ riêng trong kho bí mật của thiết bị."
      onClose={onClose}
    >
      <form
        autoComplete="off"
        onSubmit={async (e) => {
          e.preventDefault();
          setSaving(true);
          const secret = key;
          setKey("");
          await onSave({
            provider,
            name: name || providerNames[provider],
            model,
            api_key: secret,
          });
          setSaving(false);
        }}
      >
        <label>
          Nhà cung cấp
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as Provider)}
          >
            {Object.entries(providerNames).map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tên kết nối
          <input
            maxLength={80}
            value={name}
            placeholder={`${providerNames[provider]} cá nhân`}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label>
          Model ID
          <input
            required
            value={model}
            maxLength={120}
            placeholder="Nhập model ID chính xác từ provider"
            onChange={(e) => setModel(e.target.value)}
          />
        </label>
        <label>
          API Key
          <input
            required
            type="password"
            value={key}
            autoComplete="new-password"
            placeholder="Dán API Key của bạn"
            onChange={(e) => setKey(e.target.value)}
          />
        </label>
        <p className="form-note">
          <ShieldCheck size={16} />
          {native
            ? "Khi chat, Key được gửi tạm thời qua Gateway tới provider; không ghi vào lịch sử hoặc log."
            : "Bản xem giao diện không nhận API Key. Hãy mở ứng dụng desktop."}
        </p>
        <div className="modal-footer">
          <button type="button" className="secondary-button" onClick={onClose}>
            Hủy
          </button>
          <button disabled={saving || !native} className="primary-button">
            {saving ? "Đang lưu…" : "Lưu kết nối"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
function MemoryForm({
  projects,
  selected,
  onClose,
  onSave,
}: {
  projects: Project[];
  selected: string | null;
  onClose: () => void;
  onSave: (content: string, project: string | null) => Promise<void>;
}) {
  const [content, setContent] = useState(""),
    [project, setProject] = useState(selected ?? ""),
    [saving, setSaving] = useState(false);
  return (
    <Modal
      title="Thêm bộ nhớ"
      subtitle="Chỉ lưu thông tin bạn muốn AI dùng trong những lượt tiếp theo."
      onClose={onClose}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setSaving(true);
          await onSave(content, project || null);
          setSaving(false);
        }}
      >
        <label>
          Phạm vi
          <select value={project} onChange={(e) => setProject(e.target.value)}>
            <option value="">Cá nhân — dùng trong mọi dự án</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Nội dung
          <textarea
            required
            maxLength={2000}
            rows={5}
            placeholder="Ví dụ: Tôi thích câu trả lời ngắn, có ví dụ cụ thể."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </label>
        <p className="form-note">
          Không lưu password, API Key hoặc thông tin nhạy cảm vào bộ nhớ.
        </p>
        <div className="modal-footer">
          <button className="secondary-button" type="button" onClick={onClose}>
            Hủy
          </button>
          <button disabled={saving} className="primary-button">
            Lưu bộ nhớ
          </button>
        </div>
      </form>
    </Modal>
  );
}
function Confirm({
  title,
  body,
  onClose,
  onConfirm,
}: {
  title: string;
  body: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal title={title} onClose={onClose}>
      <p className="confirm-body">{body}</p>
      <div className="modal-footer">
        <button className="secondary-button" onClick={onClose}>
          Hủy
        </button>
        <button className="danger-button" onClick={onConfirm}>
          Xóa
        </button>
      </div>
    </Modal>
  );
}

function EditPromptForm({
  message,
  canSend,
  onClose,
  onSave,
}: {
  message: Message;
  canSend: boolean;
  onClose: () => void;
  onSave: (text: string) => Promise<void>;
}) {
  const [text, setText] = useState(message.text),
    [saving, setSaving] = useState(false);
  return (
    <Modal
      title="Sửa prompt và tạo nhánh mới"
      subtitle="Nhánh cũ được giữ nguyên trong lịch sử."
      onClose={onClose}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setSaving(true);
          await onSave(text);
          setSaving(false);
        }}
      >
        <label>
          Nội dung prompt
          <textarea
            autoFocus
            required
            maxLength={32000}
            rows={6}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </label>
        <div className="modal-footer">
          <button type="button" className="secondary-button" onClick={onClose}>
            Hủy
          </button>
          <button disabled={saving || !canSend} className="primary-button">
            {saving ? "Đang gửi…" : "Gửi nhánh mới"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
