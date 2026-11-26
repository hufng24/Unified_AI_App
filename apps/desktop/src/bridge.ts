import { Channel, invoke, isTauri } from "@tauri-apps/api/core";
import type {
  Snapshot,
  Message,
  SendInput,
  NormalizedEvent,
  Provider,
} from "@uai/contracts";
export const native = isTauri();
export type NativeEvent = Partial<Omit<NormalizedEvent, "type">> & {
  type: NormalizedEvent["type"] | "local.persisted";
  assistant_message_id?: string;
  status?: string;
  saved?: boolean;
};
const demo: Snapshot = {
  projects: [
    {
      id: "preview-design",
      name: "Thiết kế sản phẩm",
      description: "Nghiên cứu và thiết kế trải nghiệm",
      instructions: "Ưu tiên nội dung rõ ràng, có thể triển khai.",
    },
    {
      id: "preview-research",
      name: "Nghiên cứu & ý tưởng",
      description: "Ghi chú và tài liệu tham khảo",
      instructions: "",
    },
  ],
  conversations: [],
  connections: [],
  memories: [],
  documents: [],
  pending_mutations: 0,
  data_path: "Chế độ xem giao diện — dữ liệu chỉ tồn tại trong phiên này",
};
async function call<T>(
  name: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  if (native) return invoke<T>(name, args);
  if (name === "snapshot") return structuredClone(demo) as T;
  if (name === "conversation_messages") return [] as T;
  if (name === "conversation_new") {
    const id = crypto.randomUUID();
    demo.conversations.unshift({
      id,
      title: "Cuộc trò chuyện mới",
      project_id: (args.projectId as string) ?? null,
      selected_leaf_id: null,
      updated_at: new Date().toISOString(),
    });
    return id as T;
  }
  if (name === "project_save") {
    const p = args.input as {
      id?: string;
      name: string;
      description: string;
      instructions: string;
    };
    const id = p.id ?? crypto.randomUUID();
    demo.projects = [...demo.projects.filter((x) => x.id !== id), { ...p, id }];
    return id as T;
  }
  if (name === "memory_save") {
    const id = crypto.randomUUID();
    demo.memories.unshift({
      id,
      scope: args.projectId ? "project" : "user",
      project_id: (args.projectId as string) ?? null,
      content: args.content as string,
      category: "manual",
      status: "active",
    });
    return id as T;
  }
  if (name === "memory_delete") {
    demo.memories = demo.memories.filter((m) => m.id !== args.memoryId);
    return undefined as T;
  }
  if (name === "draft_get") return "" as T;
  if (name === "draft_save") return undefined as T;
  throw new Error(
    "Chức năng này cần bản desktop. Chạy pnpm dev để dùng SQLite và kho API Key an toàn.",
  );
}
export const bridge = {
  snapshot: () => call<Snapshot>("snapshot"),
  messages: (id: string) =>
    call<Message[]>("conversation_messages", { conversationId: id }),
  newConversation: (projectId?: string | null) =>
    call<string>("conversation_new", { projectId: projectId ?? null }),
  saveProject: (input: {
    id?: string;
    name: string;
    description: string;
    instructions: string;
  }) => call<string>("project_save", { input }),
  saveConnection: (input: {
    provider: Provider;
    name: string;
    model: string;
    api_key: string;
  }) => call<string>("connection_save", { input }),
  testConnection: (id: string) =>
    call<void>("connection_test", { connectionId: id }),
  deleteConnection: (id: string) =>
    call<void>("connection_delete", { connectionId: id }),
  saveMemory: (content: string, projectId?: string | null) =>
    call<string>("memory_save", { content, projectId: projectId ?? null }),
  deleteMemory: (id: string) => call<void>("memory_delete", { memoryId: id }),
  selectLeaf: (conversationId: string, leafId: string) =>
    call<void>("conversation_select_leaf", { conversationId, leafId }),
  draft: (conversationId: string) =>
    call<string>("draft_get", { conversationId }),
  saveDraft: (conversationId: string, text: string) =>
    call<void>("draft_save", { conversationId, text }),
  importDocument: (projectId?: string | null) =>
    call<boolean>("document_import", { projectId: projectId ?? null }),
  exportData: () => call<boolean>("data_export"),
  send: (input: SendInput, handler: (event: NativeEvent) => void) => {
    const channel = new Channel<NativeEvent>();
    channel.onmessage = handler;
    return call<{ request_id: string; assistant_message_id: string }>(
      "chat_send",
      { input, onEvent: channel },
    );
  },
  cancel: (requestId: string) => call<void>("chat_cancel", { requestId }),
};
export function branch(messages: Message[], leaf: string | null): Message[] {
  const byId = new Map(messages.map((m) => [m.id, m]));
  const path: Message[] = [];
  const seen = new Set<string>();
  let current = leaf;
  while (current && !seen.has(current)) {
    seen.add(current);
    const m = byId.get(current);
    if (!m) break;
    path.push(m);
    current = m.parent_id;
  }
  return path.reverse();
}
export function errorText(error: unknown) {
  return error instanceof Error
    ? error.message
    : typeof error === "string"
      ? error
      : "Có lỗi xảy ra. Vui lòng thử lại.";
}
