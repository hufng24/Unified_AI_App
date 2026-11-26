use rusqlite::{params, Connection, Transaction};
use serde_json::{json, Value};
use uuid::Uuid;

pub const SCHEMA: &str = include_str!("../../../../docs/sql/0001_local_baseline.sql");
pub fn id() -> String {
    Uuid::new_v4().to_string()
}
pub fn now() -> String {
    chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true)
}
pub fn valid_id(value: &str) -> Result<(), String> {
    Uuid::parse_str(value)
        .map(|_| ())
        .map_err(|_| "Mã định danh không hợp lệ.".into())
}
pub fn text(value: &str, max: usize) -> Result<String, String> {
    let s = value.trim();
    if s.is_empty() || s.chars().count() > max {
        return Err(format!("Nội dung cần từ 1 đến {max} ký tự."));
    }
    Ok(s.into())
}
pub fn initialize(db: &mut Connection) -> rusqlite::Result<()> {
    db.execute_batch("PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;")?;
    let version: i64 = db.query_row("PRAGMA user_version", [], |r| r.get(0))?;
    if version == 0 {
        db.execute_batch(SCHEMA)?;
    }
    if version > 2 {
        return Err(rusqlite::Error::InvalidQuery);
    }
    if version <= 1 {
        if version == 1 {
            if let Some(path) = db.path().filter(|p| !p.is_empty() && *p != ":memory:") {
                let backup = std::path::PathBuf::from(format!("{path}.before-v2.backup"));
                if !backup.exists() {
                    db.backup("main", &backup, None)?;
                }
            }
        }
        db.execute_batch(include_str!("../migrations/0002_account_auth.sql"))?;
    }
    let count: i64 = db.query_row("SELECT count(*) FROM local_accounts", [], |r| r.get(0))?;
    if count == 0 {
        let tx = db.transaction()?;
        let owner = id();
        let workspace = id();
        tx.execute(
            "INSERT INTO local_accounts(id,display_name) VALUES (?,'Local workspace')",
            [&owner],
        )?;
        tx.execute(
            "INSERT INTO workspaces(id,owner_id,name) VALUES (?,?,'Không gian cá nhân')",
            params![workspace, owner],
        )?;
        tx.execute(
            "INSERT INTO local_meta(key,value) VALUES ('device_id',?)",
            [id()],
        )?;
        tx.commit()?;
    }
    // Never replay interrupted upstream requests on restart.
    db.execute(
        "UPDATE messages SET status='interrupted' WHERE status IN ('streaming','pending')",
        [],
    )?;
    db.execute(
        "UPDATE generations SET status='interrupted' WHERE status IN ('streaming','pending')",
        [],
    )?;
    Ok(())
}
pub fn identity(db: &Connection) -> rusqlite::Result<(String, String)> {
    db.query_row(
        "SELECT owner_id,id FROM workspaces WHERE deleted_at IS NULL LIMIT 1",
        [],
        |r| Ok((r.get(0)?, r.get(1)?)),
    )
}
pub fn outbox(
    tx: &Transaction,
    table: &str,
    entity: &str,
    patch: Value,
    operation: &str,
) -> rusqlite::Result<()> {
    // All callers use fixed table identifiers; no user-controlled SQL identifiers.
    let (version, revision): (i64, i64) = tx.query_row(
        &format!("SELECT server_version,local_revision FROM {table} WHERE id=?"),
        [entity],
        |r| Ok((r.get(0)?, r.get(1)?)),
    )?;
    let payload = json!({"operation":operation,"patch":patch}).to_string();
    use sha2::{Digest, Sha256};
    let hash = hex::encode(Sha256::digest(payload.as_bytes()));
    tx.execute("INSERT INTO local_outbox(mutation_id,entity_type,entity_id,base_version,local_revision,payload_json,request_hash,state,created_at) VALUES (?,?,?,?,?,?,?,'pending',?)",params![id(),table,entity,version,revision,payload,hash,now()])?;
    Ok(())
}
pub fn rows(
    db: &Connection,
    sql: &str,
    mapper: impl Fn(&rusqlite::Row) -> rusqlite::Result<Value>,
) -> rusqlite::Result<Vec<Value>> {
    let mut s = db.prepare(sql)?;
    let result = s.query_map([], mapper)?.collect();
    result
}
pub fn snapshot(db: &Connection, path: &str) -> rusqlite::Result<Value> {
    let projects=rows(db,"SELECT id,name,description,instructions FROM projects WHERE deleted_at IS NULL ORDER BY updated_at DESC",|r|Ok(json!({"id":r.get::<_,String>(0)?,"name":r.get::<_,String>(1)?,"description":r.get::<_,String>(2)?,"instructions":r.get::<_,String>(3)?})))?;
    let conversations=rows(db,"SELECT id,title,project_id,selected_leaf_id,updated_at FROM conversations WHERE deleted_at IS NULL ORDER BY updated_at DESC",|r|Ok(json!({"id":r.get::<_,String>(0)?,"title":r.get::<_,String>(1)?,"project_id":r.get::<_,Option<String>>(2)?,"selected_leaf_id":r.get::<_,Option<String>>(3)?,"updated_at":r.get::<_,String>(4)?})))?;
    let connections=rows(db,"SELECT c.id,c.provider,c.name,c.default_model,c.auth_mode,r.email,COALESCE(r.needs_reauth,0),EXISTS(SELECT 1 FROM local_oauth_tokens t WHERE t.connection_id=c.id) FROM ai_connections c LEFT JOIN local_oauth_registrations r ON c.id=r.connection_id WHERE c.deleted_at IS NULL ORDER BY c.created_at",|r|Ok(json!({"id":r.get::<_,String>(0)?,"provider":r.get::<_,String>(1)?,"name":r.get::<_,String>(2)?,"default_model":r.get::<_,Option<String>>(3)?,"auth_mode":r.get::<_,String>(4)?,"account_email":r.get::<_,Option<String>>(5)?,"needs_reauth":r.get::<_,i64>(6)?!=0,"has_session":r.get::<_,i64>(7)?!=0})))?;
    let memories=rows(db,"SELECT id,scope,project_id,content,category,status FROM memories WHERE deleted_at IS NULL ORDER BY updated_at DESC",|r|Ok(json!({"id":r.get::<_,String>(0)?,"scope":r.get::<_,String>(1)?,"project_id":r.get::<_,Option<String>>(2)?,"content":r.get::<_,String>(3)?,"category":r.get::<_,String>(4)?,"status":r.get::<_,String>(5)?})))?;
    let documents=rows(db,"SELECT id,project_id,name,byte_size,processing_status FROM documents WHERE deleted_at IS NULL ORDER BY created_at DESC",|r|Ok(json!({"id":r.get::<_,String>(0)?,"project_id":r.get::<_,Option<String>>(1)?,"name":r.get::<_,String>(2)?,"byte_size":r.get::<_,i64>(3)?,"processing_status":r.get::<_,String>(4)?})))?;
    let pending: i64 = db.query_row("SELECT count(*) FROM local_outbox", [], |r| r.get(0))?;
    Ok(
        json!({"projects":projects,"conversations":conversations,"connections":connections,"memories":memories,"documents":documents,"pending_mutations":pending,"data_path":path}),
    )
}
pub fn messages(db: &Connection, conversation: &str) -> rusqlite::Result<Vec<Value>> {
    let mut s=db.prepare("SELECT id,parent_id,conversation_id,role,content,status,provider,model,client_created_at FROM messages WHERE conversation_id=? AND deleted_at IS NULL ORDER BY client_created_at,id")?;
    let result=s.query_map([conversation],|r|{
        let content:String=r.get(4)?;let blocks:Value=serde_json::from_str(&content).unwrap_or(json!([]));
        let text=blocks.as_array().map(|a|a.iter().filter_map(|b|b["text"].as_str()).collect::<Vec<_>>().join("\n")).unwrap_or_default();
        Ok(json!({"id":r.get::<_,String>(0)?,"parent_id":r.get::<_,Option<String>>(1)?,"conversation_id":r.get::<_,String>(2)?,"role":r.get::<_,String>(3)?,"text":text,"status":r.get::<_,String>(5)?,"provider":r.get::<_,Option<String>>(6)?,"model":r.get::<_,Option<String>>(7)?,"created_at":r.get::<_,String>(8)?}))
    })?.collect();
    result
}
pub fn branch(messages: &[Value], leaf: Option<&str>) -> Result<Vec<Value>, String> {
    let mut result = Vec::new();
    let mut current = leaf;
    let mut seen = std::collections::HashSet::new();
    while let Some(key) = current {
        if !seen.insert(key.to_string()) || seen.len() > 10000 {
            return Err("Nhánh hội thoại không hợp lệ.".into());
        }
        let m = messages
            .iter()
            .find(|m| m["id"].as_str() == Some(key))
            .ok_or("Không tìm thấy tin nhắn trong nhánh.")?;
        result.push(m.clone());
        current = m["parent_id"].as_str();
    }
    result.reverse();
    Ok(result)
}

pub fn latest_leaf(messages: &[Value], node: &str) -> Result<String, String> {
    let mut current = node.to_string();
    let mut seen = std::collections::HashSet::new();
    while seen.insert(current.clone()) {
        if let Some(child) = messages
            .iter()
            .rev()
            .find(|m| m["parent_id"].as_str() == Some(&current))
        {
            current = child["id"]
                .as_str()
                .ok_or("Tin nhắn không hợp lệ.")?
                .to_string();
        } else {
            return Ok(current);
        }
    }
    Err("Nhánh hội thoại có chu trình.".into())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn selecting_a_branch_restores_its_descendants() {
        let ms = vec![
            json!({"id":"root","parent_id":null}),
            json!({"id":"old","parent_id":"root"}),
            json!({"id":"followup","parent_id":"old"}),
            json!({"id":"new","parent_id":"root"}),
        ];
        assert_eq!(latest_leaf(&ms, "old").unwrap(), "followup");
        assert_eq!(latest_leaf(&ms, "new").unwrap(), "new");
    }
    #[test]
    fn branch_keeps_only_ancestors() {
        let ms = vec![
            json!({"id":"a","parent_id":null}),
            json!({"id":"b","parent_id":"a"}),
            json!({"id":"c","parent_id":"a"}),
        ];
        assert_eq!(
            branch(&ms, Some("c"))
                .unwrap()
                .iter()
                .map(|m| m["id"].as_str().unwrap())
                .collect::<Vec<_>>(),
            vec!["a", "c"]
        );
    }
    #[test]
    fn rejects_cycles() {
        let ms = vec![
            json!({"id":"a","parent_id":"b"}),
            json!({"id":"b","parent_id":"a"}),
        ];
        assert!(branch(&ms, Some("a")).is_err());
    }
    #[test]
    fn initializes_and_does_not_store_secrets() {
        let mut db = Connection::open_in_memory().unwrap();
        initialize(&mut db).unwrap();
        assert!(identity(&db).is_ok());
        let s = snapshot(&db, "test").unwrap().to_string();
        assert!(!s.contains("api_key"));
    }
    #[test]
    fn upgrades_v1_without_losing_projects_or_api_connections() {
        let mut db = Connection::open_in_memory().unwrap();
        db.execute_batch(SCHEMA).unwrap();
        db.execute("INSERT INTO local_accounts VALUES ('owner','Test')", [])
            .unwrap();
        db.execute(
            "INSERT INTO workspaces(id,owner_id,name) VALUES ('workspace','owner','Test')",
            [],
        )
        .unwrap();
        db.execute("INSERT INTO projects(id,owner_id,workspace_id,name) VALUES ('project','owner','workspace','Existing project')",[]).unwrap();
        db.execute("INSERT INTO ai_connections(id,owner_id,provider,name,default_model) VALUES ('connection','owner','openai','Existing key','test')",[]).unwrap();
        initialize(&mut db).unwrap();
        assert_eq!(
            db.query_row("PRAGMA user_version", [], |r| r.get::<_, i64>(0))
                .unwrap(),
            2
        );
        assert_eq!(
            db.query_row("SELECT name FROM projects WHERE id='project'", [], |r| {
                r.get::<_, String>(0)
            })
            .unwrap(),
            "Existing project"
        );
        assert_eq!(
            db.query_row(
                "SELECT auth_mode FROM ai_connections WHERE id='connection'",
                [],
                |r| r.get::<_, String>(0)
            )
            .unwrap(),
            "api_key"
        );
        initialize(&mut db).unwrap();
    }
}
