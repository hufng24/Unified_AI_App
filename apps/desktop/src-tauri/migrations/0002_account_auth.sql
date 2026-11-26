BEGIN IMMEDIATE;
ALTER TABLE ai_connections ADD COLUMN auth_mode TEXT NOT NULL DEFAULT 'api_key'
 CHECK(auth_mode IN ('api_key','chatgpt','google_oauth'));
CREATE TABLE local_oauth_registrations (
 connection_id TEXT PRIMARY KEY REFERENCES ai_connections(id),
 provider TEXT NOT NULL CHECK(provider IN ('openai','google')),
 client_id TEXT NOT NULL,
 subject TEXT NOT NULL,
 email TEXT,
 quota_project TEXT,
 needs_reauth INTEGER NOT NULL DEFAULT 0 CHECK(needs_reauth IN (0,1))
);
CREATE TABLE local_oauth_tokens (
 connection_id TEXT PRIMARY KEY REFERENCES ai_connections(id),
 ciphertext TEXT NOT NULL
);
PRAGMA user_version=2;
COMMIT;
