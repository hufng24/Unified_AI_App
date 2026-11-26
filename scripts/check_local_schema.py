"""Check the baseline without touching user data; requires SQLite FTS5."""
from pathlib import Path
import sqlite3

root = Path(__file__).resolve().parents[1]
schema = (root / 'docs/sql/0001_local_baseline.sql').read_text()
db = sqlite3.connect(':memory:')
db.executescript(schema)
db.executescript((root / 'apps/desktop/src-tauri/migrations/0002_account_auth.sql').read_text())
assert db.execute('PRAGMA user_version').fetchone()[0] == 2
db.execute("INSERT INTO local_accounts VALUES ('user-a','A')")
db.execute("INSERT INTO local_accounts VALUES ('user-b','B')")
db.execute("INSERT INTO workspaces(id,owner_id,name) VALUES ('wa','user-a','A')")
db.execute("INSERT INTO workspaces(id,owner_id,name) VALUES ('wb','user-b','B')")
db.execute("INSERT INTO projects(id,owner_id,workspace_id,name) VALUES ('pa','user-a','wa','Project')")

def reject(sql, label):
    try:
        db.execute(sql)
    except sqlite3.IntegrityError:
        print('PASS', label)
    else:
        raise AssertionError(label)

reject("INSERT INTO projects(id,owner_id,workspace_id,name) VALUES ('bad1','user-a','missing','Bad')",
       'missing parent rejected')
reject("INSERT INTO projects(id,owner_id,workspace_id,name) VALUES ('bad2','user-a','wb','Bad')",
       'parent owned by another account rejected')
reject("INSERT INTO memories(id,owner_id,scope,category,content,status,dedupe_key) VALUES ('bad3','user-a','project','fact','Text','active','x')",
       'project memory without project rejected')
db.commit()
try:
    db.execute('BEGIN')
    db.execute("UPDATE projects SET name='Uncommitted' WHERE id='pa'")
    db.execute("INSERT INTO local_outbox(mutation_id,entity_type,entity_id,base_version,local_revision,payload_json,request_hash,created_at) VALUES ('m1','projects','pa',0,1,'{}','hash','2026-11-26T00:00:00Z')")
    raise RuntimeError('simulate failure before commit')
except RuntimeError:
    db.rollback()
assert db.execute("SELECT name FROM projects WHERE id='pa'").fetchone()[0] == 'Project'
assert db.execute('SELECT count(*) FROM local_outbox').fetchone()[0] == 0
print('PASS entity and outbox rollback together')
assert db.execute('PRAGMA foreign_key_check').fetchall() == []
assert db.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
print('PASS SQLite baseline schema and integrity checks')
print('Cloud migration and application behavior are not tested by this script.')
