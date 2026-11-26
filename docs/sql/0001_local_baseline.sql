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
