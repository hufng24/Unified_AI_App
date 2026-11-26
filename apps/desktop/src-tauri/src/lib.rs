mod chat;
mod db;

use rusqlite::{params, Connection};
use serde::Deserialize;
use serde_json::{json, Value};
use std::{
    collections::HashMap,
    sync::{Arc, Mutex},
};
use tauri::{Manager, State};
use tauri_plugin_dialog::DialogExt;

pub struct AppState {
    pub db: Mutex<Connection>,
    pub data_path: String,
    pub active: Mutex<HashMap<String, tokio::sync::watch::Sender<bool>>>,
}
pub fn database_error(_: rusqlite::Error) -> String {
    "Không ghi hoặc đọc được dữ liệu cục bộ. Kiểm tra ổ đĩa và thử lại.".into()
}
impl AppState {
    pub fn lock(&self) -> Result<std::sync::MutexGuard<'_, Connection>, String> {
        self.db.lock().map_err(|_| "Database đang bận.".into())
    }
}
pub fn entry(id: &str) -> Result<keyring::Entry, String> {
    db::valid_id(id)?;
    keyring::Entry::new("com.hufng24.unifiedai", id)
        .map_err(|_| "Không mở được kho bí mật của hệ điều hành.".into())
}

#[tauri::command]
fn snapshot(state: State<Arc<AppState>>) -> Result<Value, String> {
    let db = state.lock()?;
    let mut v = db::snapshot(&db, &state.data_path).map_err(database_error)?;
    for c in v["connections"]
        .as_array_mut()
        .ok_or("Dữ liệu kết nối không hợp lệ.")?
    {
        let id = c["id"].as_str().unwrap_or_default();
        c["has_key"] = json!(entry(id)
            .and_then(|e| e.get_password().map_err(|_| String::new()))
            .is_ok());
    }
    Ok(v)
}
#[tauri::command]
fn conversation_new(
    state: State<Arc<AppState>>,
    project_id: Option<String>,
) -> Result<String, String> {
    let mut db = state.lock()?;
    let (owner, workspace) = db::identity(&db).map_err(database_error)?;
    if let Some(p) = &project_id {
        db::valid_id(p)?;
        let exists: i64 = db
            .query_row(
                "SELECT count(*) FROM projects WHERE id=? AND owner_id=? AND deleted_at IS NULL",
                params![p, owner],
                |r| r.get(0),
            )
            .map_err(database_error)?;
        if exists == 0 {
            return Err("Dự án không tồn tại.".into());
        }
    }
    let id = db::id();
    let tx = db.transaction().map_err(database_error)?;
    tx.execute("INSERT INTO conversations(id,owner_id,workspace_id,project_id,title,local_revision) VALUES (?,?,?,?,'Cuộc trò chuyện mới',1)",params![id,owner,workspace,project_id]).map_err(database_error)?;
    db::outbox(
        &tx,
        "conversations",
        &id,
        json!({"workspace_id":workspace,"project_id":project_id,"title":"Cuộc trò chuyện mới"}),
        "upsert",
    )
    .map_err(database_error)?;
    tx.commit().map_err(database_error)?;
    Ok(id)
}
#[tauri::command]
fn conversation_messages(
    state: State<Arc<AppState>>,
    conversation_id: String,
) -> Result<Vec<Value>, String> {
    db::valid_id(&conversation_id)?;
    db::messages(&*state.lock()?, &conversation_id).map_err(database_error)
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct ProjectInput {
    id: Option<String>,
    name: String,
    description: String,
    instructions: String,
}
#[tauri::command]
fn project_save(state: State<Arc<AppState>>, input: ProjectInput) -> Result<String, String> {
    let name = db::text(&input.name, 120)?;
    if input.instructions.chars().count() > 16000 || input.description.chars().count() > 2000 {
        return Err("Instructions hoặc mô tả quá dài.".into());
    }
    let mut db = state.lock()?;
    let (owner, workspace) = db::identity(&db).map_err(database_error)?;
    let id = input.id.unwrap_or_else(db::id);
    db::valid_id(&id)?;
    let tx = db.transaction().map_err(database_error)?;
    tx.execute("INSERT INTO projects(id,owner_id,workspace_id,name,description,instructions,local_revision) VALUES (?,?,?,?,?,?,1) ON CONFLICT(id) DO UPDATE SET name=excluded.name,description=excluded.description,instructions=excluded.instructions,updated_at=excluded.updated_at,local_revision=projects.local_revision+1",params![id,owner,workspace,name,input.description,input.instructions]).map_err(database_error)?;
    db::outbox(&tx,"projects",&id,json!({"workspace_id":workspace,"name":name,"description":input.description,"instructions":input.instructions}),"upsert").map_err(database_error)?;
    tx.commit().map_err(database_error)?;
    Ok(id)
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct ConnectionInput {
    provider: String,
    name: String,
    model: String,
    api_key: String,
}
#[tauri::command]
fn connection_save(state: State<Arc<AppState>>, input: ConnectionInput) -> Result<String, String> {
    if !["openai", "anthropic", "google"].contains(&input.provider.as_str()) {
        return Err("Provider chưa được hỗ trợ.".into());
    }
    let name = db::text(&input.name, 80)?;
    let model = db::text(&input.model, 120)?;
    if !model
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || "._:-".contains(c))
    {
        return Err("Model ID không hợp lệ.".into());
    }
    if input.api_key.trim().is_empty()
        || input.api_key.len() > 4096
        || input.api_key.contains(['\r', '\n'])
    {
        return Err("API Key không hợp lệ.".into());
    }
    let id = db::id();
    let secret = entry(&id)?;
    secret
        .set_password(input.api_key.trim())
        .map_err(|_| "Không lưu được Key vào Keychain hoặc Credential Manager.")?;
    let result = (|| {
        let mut db = state.lock()?;
        let (owner, _) = db::identity(&db).map_err(database_error)?;
        let tx = db.transaction().map_err(database_error)?;
        tx.execute("INSERT INTO ai_connections(id,owner_id,provider,name,default_model,local_revision) VALUES (?,?,?,?,?,1)",params![id,owner,input.provider,name,model]).map_err(database_error)?;
        tx.execute(
            "INSERT INTO local_secrets(connection_id,keychain_ref) VALUES (?,?)",
            params![id, id],
        )
        .map_err(database_error)?;
        db::outbox(
            &tx,
            "ai_connections",
            &id,
            json!({"provider":input.provider,"name":name,"default_model":model}),
            "upsert",
        )
        .map_err(database_error)?;
        tx.commit().map_err(database_error)?;
        Ok(id.clone())
    })();
    if result.is_err() {
        let _ = secret.delete_credential();
    }
    result
}
#[tauri::command]
async fn connection_test(
    state: State<'_, Arc<AppState>>,
    connection_id: String,
) -> Result<(), String> {
    db::valid_id(&connection_id)?;
    let (provider, model): (String, String) = {
        let db = state.lock()?;
        db.query_row(
            "SELECT provider,default_model FROM ai_connections WHERE id=? AND deleted_at IS NULL",
            [&connection_id],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .map_err(database_error)?
    };
    let key = entry(&connection_id)?
        .get_password()
        .map_err(|_| "Máy này chưa có API Key.")?;
    let (base, token) = chat::gateway()?;
    let r = reqwest::Client::new()
        .post(format!("{base}/v1/connections/test"))
        .bearer_auth(token)
        .header("X-Provider-Key", key)
        .timeout(std::time::Duration::from_secs(15))
        .json(&json!({"provider":provider,"model":model}))
        .send()
        .await
        .map_err(|_| "Chưa kết nối được Gateway. Hãy chạy pnpm dev.")?;
    if r.status().is_success() {
        Ok(())
    } else {
        Err("Không truy cập được model. Kiểm tra API Key, model ID và hạn mức provider.".into())
    }
}
#[tauri::command]
fn connection_delete(state: State<Arc<AppState>>, connection_id: String) -> Result<(), String> {
    db::valid_id(&connection_id)?;
    match entry(&connection_id)?.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => {}
        Err(_) => return Err("Không xóa được Key. Hãy mở khóa kho bí mật và thử lại.".into()),
    }
    let mut db = state.lock()?;
    let tx = db.transaction().map_err(database_error)?;
    tx.execute(
        "UPDATE ai_connections SET deleted_at=?,local_revision=local_revision+1 WHERE id=?",
        params![db::now(), connection_id],
    )
    .map_err(database_error)?;
    tx.execute(
        "DELETE FROM local_secrets WHERE connection_id=?",
        [&connection_id],
    )
    .map_err(database_error)?;
    db::outbox(&tx, "ai_connections", &connection_id, json!({}), "delete")
        .map_err(database_error)?;
    tx.commit().map_err(database_error)?;
    Ok(())
}
#[tauri::command]
fn memory_save(
    state: State<Arc<AppState>>,
    content: String,
    project_id: Option<String>,
) -> Result<String, String> {
    let content = db::text(&content, 2000)?;
    let mut db = state.lock()?;
    let (owner, _) = db::identity(&db).map_err(database_error)?;
    if let Some(p) = &project_id {
        db::valid_id(p)?;
        let n: i64 = db
            .query_row(
                "SELECT count(*) FROM projects WHERE id=? AND deleted_at IS NULL",
                [p],
                |r| r.get(0),
            )
            .map_err(database_error)?;
        if n == 0 {
            return Err("Dự án không tồn tại.".into());
        }
    }
    let id = db::id();
    let scope = if project_id.is_some() {
        "project"
    } else {
        "user"
    };
    let tx = db.transaction().map_err(database_error)?;
    let patch = json!({"scope":scope,"project_id":project_id,"category":"manual","content":content,"status":"active","memory_revision":1,"dedupe_key":id});
    tx.execute("INSERT INTO memories(id,owner_id,scope,project_id,category,content,status,dedupe_key,local_revision) VALUES (?,?,?,?,'manual',?,'active',?,1)",params![id,owner,scope,project_id,content,id]).map_err(database_error)?;
    let version_id = db::id();
    let vp = json!({"memory_id":id,"memory_revision":1,"snapshot":patch,"reason":"manual"});
    tx.execute("INSERT INTO memory_versions(id,owner_id,memory_id,memory_revision,snapshot,reason,local_revision) VALUES (?,?,?,1,?,'manual',1)",params![version_id,owner,id,patch.to_string()]).map_err(database_error)?;
    db::outbox(&tx, "memories", &id, patch, "upsert").map_err(database_error)?;
    db::outbox(&tx, "memory_versions", &version_id, vp, "upsert").map_err(database_error)?;
    tx.commit().map_err(database_error)?;
    Ok(id)
}
#[tauri::command]
fn memory_delete(state: State<Arc<AppState>>, memory_id: String) -> Result<(), String> {
    db::valid_id(&memory_id)?;
    let mut db = state.lock()?;
    let tx = db.transaction().map_err(database_error)?;
    tx.execute(
        "UPDATE memories SET deleted_at=?,local_revision=local_revision+1 WHERE id=?",
        params![db::now(), memory_id],
    )
    .map_err(database_error)?;
    db::outbox(&tx, "memories", &memory_id, json!({}), "delete").map_err(database_error)?;
    tx.commit().map_err(database_error)?;
    Ok(())
}
#[tauri::command]
fn conversation_select_leaf(
    state: State<Arc<AppState>>,
    conversation_id: String,
    leaf_id: String,
) -> Result<(), String> {
    db::valid_id(&conversation_id)?;
    db::valid_id(&leaf_id)?;
    let db = state.lock()?;
    let exists: i64 = db
        .query_row(
            "SELECT count(*) FROM messages WHERE id=? AND conversation_id=? AND deleted_at IS NULL",
            params![leaf_id, conversation_id],
            |r| r.get(0),
        )
        .map_err(database_error)?;
    if exists == 0 {
        return Err("Tin nhắn không thuộc cuộc trò chuyện.".into());
    }
    let leaf_id = db::latest_leaf(
        &db::messages(&db, &conversation_id).map_err(database_error)?,
        &leaf_id,
    )?;
    db.execute(
        "UPDATE conversations SET selected_leaf_id=? WHERE id=?",
        params![leaf_id, conversation_id],
    )
    .map_err(database_error)?;
    Ok(())
}
#[tauri::command]
fn draft_get(state: State<Arc<AppState>>, conversation_id: String) -> Result<String, String> {
    db::valid_id(&conversation_id)?;
    let db = state.lock()?;
    Ok(db
        .query_row(
            "SELECT value FROM local_meta WHERE key=?",
            [format!("draft:{conversation_id}")],
            |r| r.get(0),
        )
        .unwrap_or_default())
}
#[tauri::command]
fn draft_save(
    state: State<Arc<AppState>>,
    conversation_id: String,
    text: String,
) -> Result<(), String> {
    db::valid_id(&conversation_id)?;
    if text.len() > 128000 {
        return Err("Bản nháp quá dài.".into());
    }
    state.lock()?.execute("INSERT INTO local_meta(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",params![format!("draft:{conversation_id}"),text]).map_err(database_error)?;
    Ok(())
}
#[tauri::command]
async fn document_import(
    app: tauri::AppHandle,
    state: State<'_, Arc<AppState>>,
    project_id: Option<String>,
) -> Result<bool, String> {
    if let Some(p) = &project_id {
        db::valid_id(p)?;
    }
    let Some(path) = app
        .dialog()
        .file()
        .add_filter("Văn bản", &["txt", "md"])
        .blocking_pick_file()
    else {
        return Ok(false);
    };
    let path = path.into_path().map_err(|_| "Đường dẫn không hợp lệ.")?;
    let meta = std::fs::metadata(&path).map_err(|_| "Không mở được file.")?;
    if meta.len() > 2 * 1024 * 1024 {
        return Err("Bản nội bộ hỗ trợ file text tối đa 2 MiB.".into());
    }
    let ext = path
        .extension()
        .and_then(|x| x.to_str())
        .unwrap_or("")
        .to_lowercase();
    if !["md", "txt"].contains(&ext.as_str()) {
        return Err("Chỉ nhận TXT hoặc Markdown trong bản nội bộ.".into());
    }
    let text = std::fs::read_to_string(&path).map_err(|_| "File cần là văn bản UTF-8.")?;
    if text.contains('\0') {
        return Err("File không phải văn bản thuần.".into());
    }
    use sha2::{Digest, Sha256};
    let hash = hex::encode(Sha256::digest(text.as_bytes()));
    let id = db::id();
    let relative = format!("files/{id}.{ext}");
    let destination = std::path::Path::new(&state.data_path).join(&relative);
    std::fs::create_dir_all(destination.parent().unwrap())
        .map_err(|_| "Không tạo được thư mục dữ liệu.")?;
    std::fs::write(&destination, text.as_bytes()).map_err(|_| "Không lưu được file cục bộ.")?;
    let name = path
        .file_name()
        .and_then(|x| x.to_str())
        .unwrap_or("document.txt")
        .to_string();
    let mut db = state.lock()?;
    let (owner, workspace) = db::identity(&db).map_err(database_error)?;
    let tx = db.transaction().map_err(database_error)?;
    tx.execute("INSERT INTO documents(id,owner_id,workspace_id,project_id,name,mime,byte_size,sha256,processing_status,local_revision) VALUES (?,?,?,?,?,'text/plain',?,?,'ready_keyword_only',1)",params![id,owner,workspace,project_id,name,meta.len() as i64,hash]).map_err(database_error)?;
    tx.execute("INSERT INTO local_files(document_id,relative_path,download_status,verified_hash) VALUES (?,?,'local',?)",params![id,relative,hash]).map_err(database_error)?;
    db::outbox(&tx,"documents",&id,json!({"workspace_id":workspace,"project_id":project_id,"name":name,"mime":"text/plain","byte_size":meta.len(),"sha256":hash,"processing_status":"ready_keyword_only"}),"upsert").map_err(database_error)?;
    let chars: Vec<char> = text.chars().collect();
    for (ordinal, start) in (0..chars.len()).step_by(2000).enumerate() {
        let end = (start + 2400).min(chars.len());
        let chunk: String = chars[start..end].iter().collect();
        let cid = db::id();
        let chunk_hash = hex::encode(Sha256::digest(chunk.as_bytes()));
        tx.execute("INSERT INTO document_chunks(id,owner_id,document_id,ordinal,text,source_locator,content_hash,local_revision) VALUES (?,?,?,?,?,?,?,1)",params![cid,owner,id,ordinal as i64,chunk,json!({"start":start,"end":end}).to_string(),chunk_hash]).map_err(database_error)?;
        tx.execute("INSERT INTO search_index(entity_type,entity_id,project_id,text) VALUES ('document',?,?,?)",params![cid,project_id,chunk]).map_err(database_error)?;
        db::outbox(&tx,"document_chunks",&cid,json!({"document_id":id,"ordinal":ordinal,"text":chunk,"source_locator":{"start":start,"end":end},"content_hash":chunk_hash}),"upsert").map_err(database_error)?;
    }
    tx.commit().map_err(database_error)?;
    Ok(true)
}
#[tauri::command]
async fn data_export(
    app: tauri::AppHandle,
    state: State<'_, Arc<AppState>>,
) -> Result<bool, String> {
    let Some(path) = app
        .dialog()
        .file()
        .set_file_name("unified-ai-export.json")
        .add_filter("JSON", &["json"])
        .blocking_save_file()
    else {
        return Ok(false);
    };
    let export = {
        let db = state.lock()?;
        let mut data = db::snapshot(&db, "").map_err(database_error)?;
        let mut histories = Vec::new();
        for c in data["conversations"]
            .as_array()
            .ok_or("Dữ liệu không hợp lệ.")?
        {
            histories.extend(
                db::messages(&db, c["id"].as_str().unwrap_or_default()).map_err(database_error)?,
            )
        }
        data["messages"] = json!(histories);
        data["schema_version"] = json!(1);
        data["exported_at"] = json!(db::now());
        data.as_object_mut().unwrap().remove("data_path");
        data
    };
    std::fs::write(
        path.into_path().map_err(|_| "Đường dẫn không hợp lệ.")?,
        serde_json::to_vec_pretty(&export).map_err(|_| "Không tạo được bản xuất.")?,
    )
    .map_err(|_| "Không ghi được file xuất.")?;
    Ok(true)
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let path = app.path().app_data_dir()?;
            std::fs::create_dir_all(&path)?;
            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                std::fs::set_permissions(&path, std::fs::Permissions::from_mode(0o700))?;
            }
            let mut db = Connection::open(path.join("workspace.sqlite"))?;
            db::initialize(&mut db)?;
            app.manage(Arc::new(AppState {
                db: Mutex::new(db),
                data_path: path.to_string_lossy().to_string(),
                active: Mutex::new(HashMap::new()),
            }));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            snapshot,
            conversation_new,
            conversation_messages,
            project_save,
            connection_save,
            connection_test,
            connection_delete,
            memory_save,
            memory_delete,
            conversation_select_leaf,
            draft_get,
            draft_save,
            document_import,
            data_export,
            chat::chat_send,
            chat::chat_cancel
        ])
        .run(tauri::generate_context!())
        .expect("Không khởi động được Unified AI Workspace");
}
