import { z } from "zod";
export { z };

export const providerSchema = z.enum(["openai", "anthropic", "google"]);
export type Provider = z.infer<typeof providerSchema>;
export const turnSchema = z
  .object({
    role: z.enum(["user", "assistant"]),
    content: z
      .array(
        z
          .object({ type: z.literal("text"), text: z.string().max(128000) })
          .strict(),
      )
      .min(1)
      .max(32),
  })
  .strict();
export const chatSchema = z
  .object({
    request_id: z.uuid(),
    conversation_id: z.uuid(),
    user_message_id: z.uuid(),
    assistant_message_id: z.uuid(),
    connection_id: z.uuid(),
    provider: providerSchema,
    model: z.string().regex(/^[a-zA-Z0-9._:-]{1,120}$/),
    context: z
      .object({
        schema_version: z.literal(1),
        instructions: z.string().max(32000),
        messages: z.array(turnSchema).min(1).max(200),
        sources: z
          .array(
            z
              .object({ id: z.string(), kind: z.enum(["memory", "document"]) })
              .strict(),
          )
          .max(20),
        snapshot_hash: z.string().max(64),
      })
      .strict(),
    max_output_tokens: z.number().int().min(1).max(8192),
    stream: z.literal(true),
  })
  .strict();
export type ChatRequest = z.infer<typeof chatSchema>;
export type NormalizedEvent = {
  request_id: string;
  seq: number;
  type:
    | "generation.started"
    | "text.delta"
    | "usage.updated"
    | "generation.completed"
    | "generation.cancelled"
    | "generation.failed";
  text?: string;
  input_tokens?: number;
  output_tokens?: number;
  finish_reason?: string;
  code?: string;
  message?: string;
};
export type Project = {
  id: string;
  name: string;
  description: string;
  instructions: string;
};
export type Conversation = {
  id: string;
  title: string;
  project_id: string | null;
  selected_leaf_id: string | null;
  updated_at: string;
};
export type Message = {
  id: string;
  parent_id: string | null;
  conversation_id: string;
  role: "user" | "assistant";
  text: string;
  status: string;
  provider: string | null;
  model: string | null;
  created_at: string;
};
export type Connection = {
  id: string;
  provider: Provider;
  name: string;
  default_model: string | null;
  has_key: boolean;
};
export type Memory = {
  id: string;
  scope: "user" | "project";
  project_id: string | null;
  content: string;
  category: string;
  status: string;
};
export type DocumentRecord = {
  id: string;
  project_id: string | null;
  name: string;
  byte_size: number;
  processing_status: string;
};
export type Snapshot = {
  projects: Project[];
  conversations: Conversation[];
  connections: Connection[];
  memories: Memory[];
  documents: DocumentRecord[];
  pending_mutations: number;
  data_path: string;
};
export type SendInput = {
  conversation_id: string;
  connection_id: string;
  text: string;
  parent_id?: string | null;
  regenerate_user_id?: string;
  edit_message_id?: string;
};
export { providerNames } from "./display";
