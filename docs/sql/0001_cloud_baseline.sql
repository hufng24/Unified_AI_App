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
