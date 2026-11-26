-- Companion schema for a future Cloud Sync deployment. Tokens stay device-local.
-- Run only after baseline 0001 has been validated on staging.
BEGIN;
ALTER TABLE ai_connections ADD COLUMN auth_mode text NOT NULL DEFAULT 'api_key'
 CHECK(auth_mode IN ('api_key','chatgpt','google_oauth'));
ALTER TABLE ai_connections ADD CONSTRAINT connection_auth_provider
 CHECK(auth_mode='api_key' OR
       (auth_mode='chatgpt' AND provider='openai') OR
       (auth_mode='google_oauth' AND provider='google'));
COMMIT;
