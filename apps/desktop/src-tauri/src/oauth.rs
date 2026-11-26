use crate::{database_error, db, entry, AppState};
use aes_gcm::{
    aead::{Aead, Payload},
    Aes256Gcm, KeyInit, Nonce,
};
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use jsonwebtoken::{decode, decode_header, jwk::JwkSet, Algorithm, DecodingKey, Validation};
use rusqlite::{params, OptionalExtension};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::{
    collections::{HashMap, HashSet},
    sync::Arc,
    time::Duration,
};
use tauri::{AppHandle, State};
use tauri_plugin_opener::OpenerExt;
use tokio::{
    io::{AsyncReadExt, AsyncWriteExt},
    net::TcpListener,
    sync::watch,
};

const OPENAI_AUTH: &str = "https://auth.openai.com/api/accounts/authorize";
const OPENAI_TOKEN: &str = "https://auth.openai.com/api/accounts/oauth/token";
const GOOGLE_AUTH: &str = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN: &str = "https://oauth2.googleapis.com/token";
const OPENAI_SCOPE: &str =
    "openid profile email offline_access resource.invoke chatgpt.tokens.use.direct";
const GOOGLE_SCOPE:&str="openid profile email https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/generative-language.retriever";

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct LoginInput {
    provider: String,
    connection_id: Option<String>,
    client_id: Option<String>,
    client_secret: Option<String>,
    quota_project: Option<String>,
}
// Secret-bearing records are serialized only for authenticated local encryption.
// Deliberately no Debug implementation and never sent through IPC or the outbox.
#[derive(Serialize, Deserialize, Clone)]
struct Tokens {
    access_token: String,
    refresh_token: Option<String>,
    id_token: String,
    expires_at: i64,
    scopes: Vec<String>,
    client_secret: Option<String>,
}
#[derive(Deserialize)]
struct TokenResponse {
    access_token: String,
    refresh_token: Option<String>,
    id_token: Option<String>,
    expires_in: Option<i64>,
    scope: Option<String>,
    token_type: Option<String>,
}
// Registered JWT fields are checked by jsonwebtoken's Validation before these claims are accepted.
#[allow(dead_code)]
#[derive(Deserialize, Clone)]
struct Claims {
    sub: String,
    nonce: Option<String>,
    email: Option<String>,
    email_verified: Option<bool>,
    exp: u64,
    iss: String,
    aud: Value,
    azp: Option<String>,
}
struct Registration {
    provider: String,
    client_id: String,
    subject: String,
    email: Option<String>,
    quota_project: Option<String>,
    needs_reauth: bool,
}
pub struct Credential {
    pub token: String,
    pub auth_mode: String,
    pub quota_project: Option<String>,
}

fn key_entry(id: &str) -> Result<keyring::Entry, String> {
    db::valid_id(id)?;
    keyring::Entry::new("com.hufng24.unifiedai.oauth-key", id)
        .map_err(|_| "Không mở được kho khóa mã hóa phiên.")
        .map_err(str::to_string)
}
pub fn has_key(id: &str, mode: &str) -> bool {
    let entry = if mode == "api_key" {
        entry(id)
    } else {
        key_entry(id)
    };
    entry
        .and_then(|e| e.get_password().map_err(|_| String::new()))
        .is_ok()
}
pub fn delete_keys(id: &str) -> Result<(), String> {
    for vault in [entry(id)?, key_entry(id)?] {
        match vault.delete_credential() {
            Ok(()) | Err(keyring::Error::NoEntry) => {}
            Err(_) => {
                return Err(
                    "Không xóa được thông tin xác thực. Hãy mở khóa kho bí mật OS rồi thử lại."
                        .into(),
                )
            }
        }
    }
    Ok(())
}

fn encryption_key(id: &str, create: bool) -> Result<([u8; 32], bool), String> {
    match key_entry(id)?.get_password() {
        Ok(encoded) => {
            let bytes = URL_SAFE_NO_PAD
                .decode(encoded)
                .map_err(|_| "Khóa bảo vệ phiên không hợp lệ. Hãy đăng nhập lại.")?;
            let key: [u8; 32] = bytes
                .try_into()
                .map_err(|_| "Khóa bảo vệ phiên không hợp lệ.")?;
            Ok((key, false))
        }
        Err(keyring::Error::NoEntry) if create => {
            let mut key = [0u8; 32];
            getrandom::fill(&mut key).map_err(|_| "Không tạo được khóa bảo mật.")?;
            key_entry(id)?
                .set_password(&URL_SAFE_NO_PAD.encode(key))
                .map_err(|_| "Không lưu được khóa mã hóa vào kho bí mật OS.")?;
            Ok((key, true))
        }
        Err(_) => Err("Không đọc được khóa bảo vệ phiên trong kho bí mật OS.".into()),
    }
}
fn seal(key: &[u8; 32], id: &str, plaintext: &str) -> Result<String, String> {
    let cipher = Aes256Gcm::new_from_slice(key).map_err(|_| "Không tạo được bộ mã hóa.")?;
    let mut nonce = [0u8; 12];
    getrandom::fill(&mut nonce).map_err(|_| "Không tạo được nonce bảo mật.")?;
    let ciphertext = cipher
        .encrypt(
            Nonce::from_slice(&nonce),
            Payload {
                msg: plaintext.as_bytes(),
                aad: id.as_bytes(),
            },
        )
        .map_err(|_| "Không mã hóa được phiên đăng nhập.")?;
    let mut value = nonce.to_vec();
    value.extend(ciphertext);
    Ok(URL_SAFE_NO_PAD.encode(value))
}
fn unseal(key: &[u8; 32], id: &str, encoded: &str) -> Result<String, String> {
    let bytes = URL_SAFE_NO_PAD
        .decode(encoded)
        .map_err(|_| "Phiên mã hóa không hợp lệ.")?;
    if bytes.len() < 28 || bytes.len() > 128 * 1024 {
        return Err("Phiên mã hóa không hợp lệ.".into());
    }
    let cipher = Aes256Gcm::new_from_slice(key).map_err(|_| "Khóa phiên không hợp lệ.")?;
    let plain = cipher
        .decrypt(
            Nonce::from_slice(&bytes[..12]),
            Payload {
                msg: &bytes[12..],
                aad: id.as_bytes(),
            },
        )
        .map_err(|_| "Không giải mã được phiên của kết nối này. Hãy đăng nhập lại.")?;
    String::from_utf8(plain).map_err(|_| "Nội dung phiên không hợp lệ.".into())
}
fn load_tokens(state: &AppState, id: &str) -> Result<Tokens, String> {
    let (key, _) = encryption_key(id, false)?;
    let encrypted: String = state
        .lock()?
        .query_row(
            "SELECT ciphertext FROM local_oauth_tokens WHERE connection_id=?",
            [id],
            |r| r.get(0),
        )
        .map_err(|_| "Máy này không còn phiên đăng nhập. Hãy kết nối lại tài khoản.")?;
    serde_json::from_str(&unseal(&key, id, &encrypted)?)
        .map_err(|_| "Phiên đăng nhập không hợp lệ. Hãy đăng nhập lại.".to_string())
}

fn http() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .timeout(Duration::from_secs(20))
        .redirect(reqwest::redirect::Policy::none())
        .build()
        .map_err(|_| "Không tạo được kết nối xác thực.".into())
}
fn random() -> String {
    format!("{}{}", db::id().replace('-', ""), db::id().replace('-', ""))
}
fn challenge(verifier: &str) -> String {
    URL_SAFE_NO_PAD.encode(Sha256::digest(verifier.as_bytes()))
}
fn secure_equal(a: &str, b: &str) -> bool {
    a.len() == b.len()
        && a.bytes()
            .zip(b.bytes())
            .fold(0u8, |acc, (x, y)| acc | (x ^ y))
            == 0
}
fn safe_model(id: &str) -> bool {
    !id.is_empty()
        && id.len() <= 120
        && id
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || "._:-".contains(c))
}
fn validate_google_client(id: &str, project: &str) -> Result<(), String> {
    if !id.ends_with(".apps.googleusercontent.com")
        || id.len() > 256
        || id.chars().any(char::is_whitespace)
    {
        return Err("Cần OAuth Client ID loại Desktop app do Google Cloud cấp.".into());
    }
    if !(5..=63).contains(&project.len())
        || !project.starts_with(|c: char| c.is_ascii_lowercase())
        || !project
            .chars()
            .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-')
    {
        return Err("Google Cloud Project ID không hợp lệ.".into());
    }
    Ok(())
}
fn registration(state: &AppState, id: &str) -> Result<Option<Registration>, String> {
    db::valid_id(id)?;
    state.lock()?.query_row("SELECT r.provider,r.client_id,r.subject,r.email,r.quota_project,r.needs_reauth FROM local_oauth_registrations r JOIN ai_connections c ON c.id=r.connection_id WHERE r.connection_id=? AND c.deleted_at IS NULL",[id],|r|Ok(Registration{provider:r.get(0)?,client_id:r.get(1)?,subject:r.get(2)?,email:r.get(3)?,quota_project:r.get(4)?,needs_reauth:r.get::<_,i64>(5)?!=0})).optional().map_err(database_error)
}
async fn body_json<T: serde::de::DeserializeOwned>(
    response: reqwest::Response,
) -> Result<T, String> {
    if !response.status().is_success() {
        return Err("Nhà cung cấp từ chối xác thực. Kiểm tra quyền của ứng dụng và tài khoản rồi đăng nhập lại.".into());
    }
    if response.content_length().unwrap_or(0) > 1024 * 1024 {
        return Err("Phản hồi xác thực không hợp lệ.".into());
    }
    let bytes = response
        .bytes()
        .await
        .map_err(|_| "Không nhận được phản hồi xác thực.")?;
    if bytes.len() > 1024 * 1024 {
        return Err("Phản hồi xác thực quá lớn.".into());
    }
    serde_json::from_slice(&bytes).map_err(|_| "Định dạng phản hồi xác thực không hợp lệ.".into())
}
fn validate_signed(
    token: &str,
    keys: &JwkSet,
    provider: &str,
    client_id: &str,
    nonce: Option<&str>,
    subject: Option<&str>,
) -> Result<Claims, String> {
    if token.len() > 32768 {
        return Err("ID token quá lớn.".into());
    }
    let header = decode_header(token).map_err(|_| "ID token không hợp lệ.")?;
    if header.alg != Algorithm::RS256 {
        return Err("Thuật toán ID token không được hỗ trợ.".into());
    }
    let kid = header.kid.ok_or("ID token thiếu mã khóa ký.")?;
    let jwk = keys
        .keys
        .iter()
        .find(|k| k.common.key_id.as_deref() == Some(&kid))
        .ok_or("Không tìm thấy khóa ký của nhà cung cấp.")?;
    let key = DecodingKey::from_jwk(jwk).map_err(|_| "Khóa ký không hợp lệ.")?;
    let mut validation = Validation::new(Algorithm::RS256);
    validation.set_audience(&[client_id]);
    if provider == "openai" {
        validation.set_issuer(&["https://auth.openai.com"])
    } else {
        validation.set_issuer(&["https://accounts.google.com", "accounts.google.com"])
    }
    validation.set_required_spec_claims(&["exp", "iss", "sub", "aud"]);
    validation.validate_nbf = true;
    validation.leeway = 30;
    let claims = decode::<Claims>(token, &key, &validation)
        .map_err(|_| "Không xác minh được chữ ký, thời hạn hoặc tài khoản của ID token.")?
        .claims;
    if claims.azp.as_deref().is_some_and(|v| v != client_id)
        || (claims.aud.as_array().is_some_and(|a| a.len() > 1)
            && claims.azp.as_deref() != Some(client_id))
    {
        return Err("ID token không thuộc ứng dụng đang đăng nhập.".into());
    }
    validate_identity(&claims, nonce, subject)?;
    Ok(claims)
}
fn validate_identity(
    claims: &Claims,
    nonce: Option<&str>,
    subject: Option<&str>,
) -> Result<(), String> {
    if claims.sub.is_empty() || claims.email_verified == Some(false) {
        return Err("Danh tính tài khoản chưa được xác minh.".into());
    }
    if let Some(nonce) = nonce {
        if !claims
            .nonce
            .as_deref()
            .is_some_and(|v| secure_equal(v, nonce))
        {
            return Err("Phiên đăng nhập không khớp nonce. Hãy bắt đầu lại.".into());
        }
    }
    if let Some(subject) = subject {
        if !secure_equal(subject, &claims.sub) {
            return Err(
                "Bạn đã chọn tài khoản khác với kết nối đang đăng nhập lại. Hãy thêm kết nối mới."
                    .into(),
            );
        }
    }
    Ok(())
}
async fn verify_token(
    client: &reqwest::Client,
    token: &str,
    provider: &str,
    client_id: &str,
    nonce: Option<&str>,
    subject: Option<&str>,
) -> Result<Claims, String> {
    let url = if provider == "openai" {
        "https://auth.openai.com/.well-known/jwks.json"
    } else {
        "https://www.googleapis.com/oauth2/v3/certs"
    };
    let keys: JwkSet = body_json(
        client
            .get(url)
            .send()
            .await
            .map_err(|_| "Không tải được khóa xác minh của nhà cung cấp.")?,
    )
    .await?;
    validate_signed(token, &keys, provider, client_id, nonce, subject)
}
fn merge_tokens(
    response: TokenResponse,
    old: Option<&Tokens>,
    provider: &str,
    client_secret: Option<String>,
) -> Result<Tokens, String> {
    if response.access_token.is_empty()
        || response.access_token.len() > 8192
        || response
            .token_type
            .as_deref()
            .is_some_and(|v| !v.eq_ignore_ascii_case("bearer"))
    {
        return Err("Access token không hợp lệ.".into());
    }
    let scopes: Vec<String> = if let Some(scope) = response.scope {
        scope.split_whitespace().map(str::to_string).collect()
    } else if let Some(old) = old {
        old.scopes.clone()
    } else if provider == "google" {
        GOOGLE_SCOPE
            .split_whitespace()
            .map(str::to_string)
            .collect()
    } else {
        return Err("Nhà cung cấp chưa cấp quyền dùng hạn mức ChatGPT cho ứng dụng này.".into());
    };
    if provider == "openai"
        && !(["chatgpt.tokens.use.direct", "resource.invoke"]
            .iter()
            .all(|s| scopes.iter().any(|v| v == s)))
    {
        return Err(
            "Đã xác thực tài khoản nhưng chưa được cấp quyền dùng ChatGPT trong app này.".into(),
        );
    }
    if provider == "google"
        && !scopes.iter().any(|s| {
            s == "https://www.googleapis.com/auth/cloud-platform"
                || s == "https://www.googleapis.com/auth/generative-language.retriever"
        })
    {
        return Err("Tài khoản chưa cấp quyền Gemini API.".into());
    }
    let id_token = response
        .id_token
        .or_else(|| old.map(|v| v.id_token.clone()))
        .filter(|v| !v.is_empty())
        .ok_or("Nhà cung cấp không trả ID token để xác minh danh tính.")?;
    let expires = response
        .expires_in
        .filter(|n| *n > 0 && *n <= 864000)
        .ok_or("Thiếu thời hạn của access token.")?;
    Ok(Tokens {
        access_token: response.access_token,
        refresh_token: response
            .refresh_token
            .or_else(|| old.and_then(|v| v.refresh_token.clone())),
        id_token,
        expires_at: chrono::Utc::now().timestamp() + expires,
        scopes,
        client_secret: client_secret.or_else(|| old.and_then(|v| v.client_secret.clone())),
    })
}
// Reject duplicated parameters and unrelated HTTP requests. CSRF failures do not consume a login.
fn callback_parameters(
    target: &str,
    state: &str,
    issued: Option<&str>,
) -> Result<(String, String), String> {
    let url = reqwest::Url::parse(&format!("http://127.0.0.1{target}"))
        .map_err(|_| "Callback không hợp lệ.")?;
    if url.path() != "/auth/callback" {
        return Err("Callback sai đường dẫn.".into());
    }
    let mut values = HashMap::new();
    let mut seen = HashSet::new();
    for (k, v) in url.query_pairs() {
        if !seen.insert(k.to_string()) {
            return Err("Callback có tham số lặp.".into());
        }
        values.insert(k.to_string(), v.to_string());
    }
    if !values.get("state").is_some_and(|v| secure_equal(v, state)) {
        return Err("Callback không khớp phiên đăng nhập.".into());
    }
    if values.contains_key("error") {
        return Err("OAUTH_DENIED".into());
    }
    let code = values
        .get("code")
        .filter(|v| !v.is_empty() && v.len() <= 4096)
        .ok_or("Callback thiếu mã xác thực.")?
        .clone();
    let client = match issued {
        Some(expected) => {
            if values.get("client_id").is_some_and(|v| v != expected) {
                return Err("Callback đổi client ID của tài khoản đã chọn.".into());
            }
            expected.to_string()
        }
        None => values
            .get("client_id")
            .filter(|v| v.starts_with("oaiapp_") && v.len() <= 256)
            .ok_or("Đăng ký ChatGPT chưa hoàn tất: thiếu client ID được cấp.")?
            .clone(),
    };
    Ok((code, client))
}
async fn wait_callback(
    listener: &TcpListener,
    state: &str,
    issued: Option<&str>,
) -> Result<(String, String), String> {
    let expected_host = listener
        .local_addr()
        .map_err(|_| "Không mở được callback.")?
        .to_string();
    loop {
        let (mut stream, peer) = listener
            .accept()
            .await
            .map_err(|_| "Không nhận được callback đăng nhập.")?;
        if !peer.ip().is_loopback() {
            continue;
        }
        let request = tokio::time::timeout(Duration::from_secs(5), async {
            let mut bytes = Vec::new();
            let mut chunk = [0u8; 1024];
            while !bytes.windows(4).any(|v| v == b"\r\n\r\n") {
                let n = stream.read(&mut chunk).await?;
                if n == 0 {
                    break;
                }
                bytes.extend_from_slice(&chunk[..n]);
                if bytes.len() > 8192 {
                    break;
                }
            }
            Ok::<_, std::io::Error>(bytes)
        })
        .await;
        let parsed = match request {
            Ok(Ok(bytes)) if bytes.len() <= 8192 => String::from_utf8(bytes).ok().and_then(|s| {
                let mut lines = s.lines();
                let first = lines.next()?;
                let parts: Vec<_> = first.split_whitespace().collect();
                if parts.len() != 3
                    || parts[0] != "GET"
                    || !lines.any(|h| {
                        h.split_once(':').is_some_and(|(k, v)| {
                            k.eq_ignore_ascii_case("host") && v.trim() == expected_host
                        })
                    })
                {
                    return None;
                }
                Some(callback_parameters(parts[1], state, issued))
            }),
            _ => None,
        };
        let (status, body) = if matches!(&parsed, Some(Ok(_))) {
            (
                "200 OK",
                "Đã nhận xác thực. Bạn có thể quay lại Unified AI Workspace để chờ xác minh.",
            )
        } else {
            ("400 Bad Request","Không nhận được xác thực hợp lệ. Quay lại ứng dụng hoặc hoàn tất đăng nhập trong đúng cửa sổ đã mở.")
        };
        let html=format!("<!doctype html><html lang=vi><meta charset=utf-8><title>Unified AI Workspace</title><p>{body}</p></html>");
        let response=format!("HTTP/1.1 {status}\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nCache-Control: no-store\r\nContent-Security-Policy: default-src 'none'\r\nConnection: close\r\n\r\n{html}",html.len());
        let _ = stream.write_all(response.as_bytes()).await;
        let _ = stream.shutdown().await;
        match parsed {
            Some(Ok(result)) => return Ok(result),
            Some(Err(e)) if e == "OAUTH_DENIED" => {
                return Err("Bạn đã hủy hoặc từ chối quyền đăng nhập.".into())
            }
            _ => continue,
        }
    }
}
async fn models(
    client: &reqwest::Client,
    provider: &str,
    token: &str,
    project: Option<&str>,
) -> Result<Vec<Value>, String> {
    let mut request = client
        .get(if provider == "openai" {
            "https://api.openai.com/v1/models"
        } else {
            "https://generativelanguage.googleapis.com/v1beta/models"
        })
        .bearer_auth(token);
    if let Some(project) = project {
        request = request.header("x-goog-user-project", project)
    }
    let data: Value = body_json(request.send().await.map_err(|_| {
        "Không tải được danh sách model. Kiểm tra mạng và quyền API của tài khoản."
    })?)
    .await?;
    let mut choices = Vec::new();
    if let Some(list) = data["models"].as_array() {
        for item in list.iter().take(300) {
            let model = if provider == "openai" {
                if item["visibility"] != "list" {
                    continue;
                }
                item["slug"].as_str()
            } else {
                if !item["supportedGenerationMethods"]
                    .as_array()
                    .is_some_and(|v| {
                        v.iter()
                            .any(|s| s == "generateContent" || s == "streamGenerateContent")
                    })
                {
                    continue;
                }
                item["name"]
                    .as_str()
                    .and_then(|v| v.strip_prefix("models/"))
            };
            if let Some(id) = model.filter(|v| safe_model(v)) {
                let name = item[if provider == "openai" {
                    "display_name"
                } else {
                    "displayName"
                }]
                .as_str()
                .unwrap_or(id);
                choices.push(json!({"id":id,"name":name}));
            }
        }
    }
    if choices.is_empty() {
        return Err("Tài khoản đã xác thực nhưng chưa có model dùng được cho kết nối này. Kiểm tra quyền và cấu hình API.".into());
    }
    Ok(choices)
}

#[tauri::command]
pub fn account_auth_config() -> Value {
    json!({"google_client_id":std::env::var("UAI_GOOGLE_CLIENT_ID").ok(),"google_quota_project":std::env::var("UAI_GOOGLE_QUOTA_PROJECT").ok()})
}
#[tauri::command]
pub fn account_auth_cancel(state: State<Arc<AppState>>) -> Result<(), String> {
    if let Some(tx) = state
        .oauth_login
        .lock()
        .map_err(|_| "Không đọc được trạng thái đăng nhập.")?
        .as_ref()
    {
        let _ = tx.send(true);
    }
    Ok(())
}
#[tauri::command]
pub async fn account_connect(
    app: AppHandle,
    state: State<'_, Arc<AppState>>,
    input: LoginInput,
) -> Result<Value, String> {
    if !["openai", "google"].contains(&input.provider.as_str()) {
        return Err("Chưa có luồng đăng nhập tài khoản cá nhân được hỗ trợ cho provider này. Với Claude, dùng API Key hoặc Claude Platform được phê duyệt.".into());
    }
    let (tx, mut cancel) = watch::channel(false);
    {
        let mut active = state
            .oauth_login
            .lock()
            .map_err(|_| "Trạng thái đăng nhập đang bận.")?;
        if active.is_some() {
            return Err("Một phiên đăng nhập đang chạy. Hoàn tất hoặc hủy phiên đó trước.".into());
        }
        *active = Some(tx);
    }
    let result = tokio::select! {_ = cancel.changed()=>Err("Đã hủy phiên đăng nhập.".into()), r=tokio::time::timeout(Duration::from_secs(600),connect_inner(&app,&state,input))=>r.unwrap_or_else(|_|Err("Hết thời gian đăng nhập. Hãy thử lại.".into()))};
    if let Ok(mut active) = state.oauth_login.lock() {
        *active = None;
    }
    result
}
async fn connect_inner(
    app: &AppHandle,
    state: &AppState,
    input: LoginInput,
) -> Result<Value, String> {
    let existing = if let Some(id) = &input.connection_id {
        registration(state, id)?
            .ok_or("Không tìm thấy đăng ký OAuth để kết nối lại.")
            .map(Some)?
    } else {
        None
    };
    if existing
        .as_ref()
        .is_some_and(|r| r.provider != input.provider)
    {
        return Err("Provider không khớp kết nối đã chọn.".into());
    }
    let connection_id = input.connection_id.clone().unwrap_or_else(db::id);
    let google_id = input
        .client_id
        .filter(|v| !v.trim().is_empty())
        .or_else(|| existing.as_ref().map(|r| r.client_id.clone()))
        .or_else(|| std::env::var("UAI_GOOGLE_CLIENT_ID").ok());
    let quota = input
        .quota_project
        .filter(|v| !v.trim().is_empty())
        .or_else(|| existing.as_ref().and_then(|r| r.quota_project.clone()))
        .or_else(|| std::env::var("UAI_GOOGLE_QUOTA_PROJECT").ok());
    let client_secret = input
        .client_secret
        .filter(|v| !v.is_empty())
        .or_else(|| std::env::var("UAI_GOOGLE_CLIENT_SECRET").ok())
        .or_else(|| {
            existing
                .as_ref()
                .and_then(|_| load_tokens(state, &connection_id).ok())
                .and_then(|v| v.client_secret)
        });
    if client_secret
        .as_ref()
        .is_some_and(|v| v.len() > 4096 || v.contains(['\r', '\n']))
    {
        return Err("Client secret không hợp lệ.".into());
    }
    let initial_client = if input.provider == "google" {
        let id = google_id
            .ok_or("Cần cấu hình Google OAuth Client ID loại Desktop app trước khi đăng nhập.")?;
        validate_google_client(
            &id,
            quota
                .as_deref()
                .ok_or("Cần Google Cloud Project ID để dùng Gemini API.")?,
        )?;
        id
    } else {
        existing
            .as_ref()
            .map(|r| r.client_id.clone())
            .unwrap_or_else(|| "dynamic_agent_client".into())
    };
    let host = {
        let db = state.lock()?;
        db.query_row(
            "SELECT value FROM local_meta WHERE key='device_id'",
            [],
            |r| r.get::<_, String>(0),
        )
        .map_err(database_error)?
    };
    let listener = TcpListener::bind((std::net::Ipv4Addr::LOCALHOST, 0))
        .await
        .map_err(|_| "Không mở được cổng callback cục bộ.")?;
    let redirect = format!(
        "http://127.0.0.1:{}/auth/callback",
        listener
            .local_addr()
            .map_err(|_| "Không đọc được callback.")?
            .port()
    );
    let state_nonce = random();
    let nonce = random();
    let verifier = random();
    let pkce = challenge(&verifier);
    let mut authorize = reqwest::Url::parse(if input.provider == "openai" {
        OPENAI_AUTH
    } else {
        GOOGLE_AUTH
    })
    .map_err(|_| "URL xác thực không hợp lệ.")?;
    {
        let mut q = authorize.query_pairs_mut();
        q.append_pair("client_id", &initial_client)
            .append_pair("redirect_uri", &redirect)
            .append_pair("response_type", "code")
            .append_pair(
                "scope",
                if input.provider == "openai" {
                    OPENAI_SCOPE
                } else {
                    GOOGLE_SCOPE
                },
            )
            .append_pair("state", &state_nonce)
            .append_pair("nonce", &nonce)
            .append_pair("code_challenge_method", "S256")
            .append_pair("code_challenge", &pkce);
        if input.provider == "openai" {
            q.append_pair("resource", "https://api.openai.com/v1")
                .append_pair("ext_agent_host_id", &format!("urn:uuid:{host}"));
            if existing.is_none() {
                q.append_pair("agent_name_hint", "Unified AI Workspace");
            } else if let Some(email) = existing.as_ref().and_then(|v| v.email.as_deref()) {
                q.append_pair("login_hint", email);
            }
        } else {
            q.append_pair("access_type", "offline")
                .append_pair("prompt", "consent select_account");
        }
    }
    app.opener()
        .open_url(authorize.as_str(), None::<&str>)
        .map_err(|_| "Không mở được trình duyệt để đăng nhập.")?;
    let issued = if input.provider == "google" || existing.is_some() {
        Some(initial_client.as_str())
    } else {
        None
    };
    let (code, client_id) = wait_callback(&listener, &state_nonce, issued).await?;
    drop(listener);
    let client = http()?;
    let mut form = vec![
        ("grant_type", "authorization_code"),
        ("client_id", client_id.as_str()),
        ("code", code.as_str()),
        ("code_verifier", verifier.as_str()),
        ("redirect_uri", redirect.as_str()),
    ];
    if input.provider == "openai" {
        form.push(("resource", "https://api.openai.com/v1"))
    } else if let Some(secret) = client_secret.as_deref() {
        form.push(("client_secret", secret))
    }
    let response: TokenResponse = body_json(
        client
            .post(if input.provider == "openai" {
                OPENAI_TOKEN
            } else {
                GOOGLE_TOKEN
            })
            .form(&form)
            .send()
            .await
            .map_err(|_| "Không đổi được mã xác thực. Hãy thử đăng nhập lại.")?,
    )
    .await?;
    let claims = verify_token(
        &client,
        response
            .id_token
            .as_deref()
            .ok_or("Không nhận được ID token.")?,
        &input.provider,
        &client_id,
        Some(&nonce),
        existing.as_ref().map(|v| v.subject.as_str()),
    )
    .await?;
    let tokens = merge_tokens(
        response,
        None,
        &input.provider,
        if input.provider == "google" {
            client_secret
        } else {
            None
        },
    )?;
    let choices = models(
        &client,
        &input.provider,
        &tokens.access_token,
        if input.provider == "google" {
            quota.as_deref()
        } else {
            None
        },
    )
    .await?;
    let model = choices[0]["id"].as_str().ok_or("Model không hợp lệ.")?;
    let mode = if input.provider == "openai" {
        "chatgpt"
    } else {
        "google_oauth"
    };
    let name = format!(
        "{} · {} · {}",
        if input.provider == "openai" {
            "ChatGPT"
        } else {
            "Google Gemini API"
        },
        claims.email.as_deref().unwrap_or("Tài khoản đã xác minh"),
        &connection_id[..6]
    );
    let (key, new_key) = encryption_key(&connection_id, true)?;
    let encrypted = seal(
        &key,
        &connection_id,
        &serde_json::to_string(&tokens).map_err(|_| "Không tạo được phiên bảo mật.")?,
    )?;
    let saved = (|| -> Result<(), String> {
        let mut db = state.lock()?;
        let (owner, _) = db::identity(&db).map_err(database_error)?;
        let tx = db.transaction().map_err(database_error)?;
        tx.execute("INSERT INTO ai_connections(id,owner_id,provider,name,default_model,auth_mode,local_revision) VALUES (?,?,?,?,?,?,1) ON CONFLICT(id) DO UPDATE SET name=excluded.name,default_model=excluded.default_model,auth_mode=excluded.auth_mode,updated_at=excluded.updated_at,local_revision=ai_connections.local_revision+1",params![connection_id,owner,input.provider,name,model,mode]).map_err(database_error)?;
        tx.execute("INSERT INTO local_oauth_registrations(connection_id,provider,client_id,subject,email,quota_project,needs_reauth) VALUES (?,?,?,?,?,?,0) ON CONFLICT(connection_id) DO UPDATE SET client_id=excluded.client_id,subject=excluded.subject,email=excluded.email,quota_project=excluded.quota_project,needs_reauth=0",params![connection_id,input.provider,client_id,claims.sub,claims.email,if input.provider=="google"{quota.clone()}else{None}]).map_err(database_error)?;
        tx.execute("INSERT INTO local_secrets(connection_id,keychain_ref) VALUES (?,?) ON CONFLICT(connection_id) DO UPDATE SET keychain_ref=excluded.keychain_ref",params![connection_id,connection_id]).map_err(database_error)?;
        tx.execute("INSERT INTO local_oauth_tokens(connection_id,ciphertext) VALUES (?,?) ON CONFLICT(connection_id) DO UPDATE SET ciphertext=excluded.ciphertext",params![connection_id,encrypted]).map_err(database_error)?;
        tx.execute("INSERT INTO local_meta(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",params![format!("oauth_models:{connection_id}"),json!(choices).to_string()]).map_err(database_error)?;
        db::outbox(
            &tx,
            "ai_connections",
            &connection_id,
            json!({"provider":input.provider,"name":name,"default_model":model,"auth_mode":mode}),
            "upsert",
        )
        .map_err(database_error)?;
        tx.commit().map_err(database_error)?;
        Ok(())
    })();
    if let Err(error) = saved {
        if new_key {
            let _ = key_entry(&connection_id)?.delete_credential();
        }
        return Err(error);
    }
    Ok(json!({"connection_id":connection_id,"models":choices}))
}

pub async fn credential(state: &AppState, id: &str) -> Result<Credential, String> {
    db::valid_id(id)?;
    let mode: String = state
        .lock()?
        .query_row(
            "SELECT auth_mode FROM ai_connections WHERE id=? AND deleted_at IS NULL",
            [id],
            |r| r.get(0),
        )
        .map_err(|_| "Kết nối không tồn tại hoặc đã bị xóa.")?;
    let reg = registration(state, id)?;
    if mode == "api_key" {
        if reg.is_some() {
            return Err("Phương thức xác thực không khớp đăng ký tài khoản.".into());
        }
        let token = entry(id)?
            .get_password()
            .map_err(|_| "Máy này chưa có API Key. Hãy thêm kết nối trước.")?;
        return Ok(Credential {
            token,
            auth_mode: "api_key".into(),
            quota_project: None,
        });
    }
    let reg = reg.ok_or("Cần đăng nhập lại tài khoản trên thiết bị này.")?;
    if reg.needs_reauth {
        return Err("Phiên tài khoản cần được đăng nhập lại trước khi gửi yêu cầu AI.".into());
    }
    let _lock = state.oauth_refresh.lock().await;
    let mut tokens = load_tokens(state, id)?;
    if tokens.expires_at <= chrono::Utc::now().timestamp() + 90 {
        let refresh = tokens
            .refresh_token
            .as_deref()
            .ok_or("Phiên hết hạn. Hãy đăng nhập lại tài khoản.")?;
        let client = http()?;
        let mut form = vec![
            ("grant_type", "refresh_token"),
            ("client_id", reg.client_id.as_str()),
            ("refresh_token", refresh),
        ];
        if reg.provider == "openai" {
            form.push(("resource", "https://api.openai.com/v1"))
        } else if let Some(secret) = tokens.client_secret.as_deref() {
            form.push(("client_secret", secret))
        }
        let response = client
            .post(if reg.provider == "openai" {
                OPENAI_TOKEN
            } else {
                GOOGLE_TOKEN
            })
            .form(&form)
            .send()
            .await
            .map_err(|_| "Chưa làm mới được phiên. Kiểm tra mạng rồi thử lại.")?;
        if !response.status().is_success() {
            let _ = state.lock()?.execute(
                "UPDATE local_oauth_registrations SET needs_reauth=1 WHERE connection_id=?",
                [id],
            );
            return Err(
                "Phiên đăng nhập đã hết hạn hoặc bị thu hồi. Hãy kết nối lại tài khoản.".into(),
            );
        }
        let response: TokenResponse = body_json(response).await?;
        if let Some(id_token) = response.id_token.as_deref() {
            verify_token(
                &client,
                id_token,
                &reg.provider,
                &reg.client_id,
                None,
                Some(&reg.subject),
            )
            .await?;
        }
        tokens = merge_tokens(response, Some(&tokens), &reg.provider, None)?;
        let (key, _) = encryption_key(id, false)?;
        let encrypted = seal(
            &key,
            id,
            &serde_json::to_string(&tokens).map_err(|_| "Không lưu được phiên mới.")?,
        )?;
        let mut db = state.lock()?;
        let tx = db.transaction().map_err(database_error)?;
        tx.execute(
            "UPDATE local_oauth_tokens SET ciphertext=? WHERE connection_id=?",
            params![encrypted, id],
        )
        .map_err(database_error)?;
        tx.execute(
            "UPDATE local_oauth_registrations SET needs_reauth=0 WHERE connection_id=?",
            [id],
        )
        .map_err(database_error)?;
        tx.commit().map_err(database_error)?;
    }
    Ok(Credential {
        token: tokens.access_token,
        auth_mode: if reg.provider == "openai" {
            "chatgpt"
        } else {
            "google_oauth"
        }
        .into(),
        quota_project: reg.quota_project,
    })
}
pub fn require_local_gateway(base: &str, mode: &str) -> Result<(), String> {
    if mode != "api_key" {
        let url = reqwest::Url::parse(base).map_err(|_| "Gateway không hợp lệ.")?;
        if ![Some("127.0.0.1"), Some("localhost")].contains(&url.host_str()) {
            return Err("Token tài khoản chỉ được chuyển qua Gateway localhost, không gửi tới Gateway Cloud.".into());
        }
    }
    Ok(())
}
pub async fn revoke(state: &AppState, id: &str) -> Result<bool, String> {
    let Some(reg) = registration(state, id)? else {
        return Ok(true);
    };
    let _lock = state.oauth_refresh.lock().await;
    let tokens = match load_tokens(state, id) {
        Ok(tokens) => tokens,
        Err(_) => return Ok(false),
    };
    let token = tokens
        .refresh_token
        .as_deref()
        .unwrap_or(&tokens.access_token);
    let mut form = vec![("token", token)];
    if reg.provider == "openai" {
        form.push(("client_id", reg.client_id.as_str()));
        form.push((
            "token_type_hint",
            if tokens.refresh_token.is_some() {
                "refresh_token"
            } else {
                "access_token"
            },
        ));
    }
    let response = http()?
        .post(if reg.provider == "openai" {
            "https://auth.openai.com/api/accounts/oauth/revoke"
        } else {
            "https://oauth2.googleapis.com/revoke"
        })
        .form(&form)
        .send()
        .await;
    Ok(response.is_ok_and(|r| r.status().is_success()))
}
#[tauri::command]
pub async fn account_models(
    state: State<'_, Arc<AppState>>,
    connection_id: String,
) -> Result<Vec<Value>, String> {
    let reg = registration(&state, &connection_id)?.ok_or("Kết nối này không dùng OAuth.")?;
    let credentials = credential(&state, &connection_id).await?;
    let choices = models(
        &http()?,
        &reg.provider,
        &credentials.token,
        credentials.quota_project.as_deref(),
    )
    .await?;
    state.lock()?.execute("INSERT INTO local_meta(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",params![format!("oauth_models:{connection_id}"),json!(choices).to_string()]).map_err(database_error)?;
    Ok(choices)
}
#[tauri::command]
pub fn account_select_model(
    state: State<Arc<AppState>>,
    connection_id: String,
    model: String,
) -> Result<(), String> {
    db::valid_id(&connection_id)?;
    if !safe_model(&model) {
        return Err("Model ID không hợp lệ.".into());
    }
    let mut db = state.lock()?;
    let cache: String = db
        .query_row(
            "SELECT value FROM local_meta WHERE key=?",
            [format!("oauth_models:{connection_id}")],
            |r| r.get(0),
        )
        .map_err(database_error)?;
    let choices: Vec<Value> =
        serde_json::from_str(&cache).map_err(|_| "Cần tải lại danh sách model.")?;
    if !choices.iter().any(|m| m["id"].as_str() == Some(&model)) {
        return Err("Model không nằm trong danh sách của tài khoản đã xác thực.".into());
    }
    let tx = db.transaction().map_err(database_error)?;
    tx.execute("UPDATE ai_connections SET default_model=?,local_revision=local_revision+1,updated_at=? WHERE id=? AND deleted_at IS NULL",params![model,db::now(),connection_id]).map_err(database_error)?;
    db::outbox(
        &tx,
        "ai_connections",
        &connection_id,
        json!({"default_model":model}),
        "upsert",
    )
    .map_err(database_error)?;
    tx.commit().map_err(database_error)?;
    Ok(())
}
#[tauri::command]
pub fn account_help(app: AppHandle, provider: String) -> Result<(), String> {
    let url = match provider.as_str() {
        "openai" => "https://developers.openai.com/siwc/quickstart",
        "google" => "https://aistudio.google.com/docs/oauth",
        "anthropic" => "https://platform.claude.com/docs/en/manage-claude/oauth-apps/overview",
        _ => return Err("Provider không hợp lệ.".into()),
    };
    app.opener()
        .open_url(url, None::<&str>)
        .map_err(|_| "Không mở được hướng dẫn chính thức.".into())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[tokio::test]
    async fn loopback_callback_ignores_csrf_then_accepts_only_the_valid_attempt() {
        let listener = TcpListener::bind((std::net::Ipv4Addr::LOCALHOST, 0))
            .await
            .unwrap();
        let address = listener.local_addr().unwrap();
        let waiter = tokio::spawn(async move {
            wait_callback(&listener, "expected", Some("saved-client")).await
        });
        let client = reqwest::Client::new();
        let wrong = client
            .get(format!(
                "http://{address}/auth/callback?state=wrong&code=bad"
            ))
            .send()
            .await
            .unwrap();
        assert_eq!(wrong.status().as_u16(), 400);
        let good = client
            .get(format!(
                "http://{address}/auth/callback?state=expected&code=accepted"
            ))
            .send()
            .await
            .unwrap();
        assert!(good.status().is_success());
        let result = tokio::time::timeout(Duration::from_secs(3), waiter)
            .await
            .unwrap()
            .unwrap()
            .unwrap();
        assert_eq!(result, ("accepted".to_string(), "saved-client".to_string()));
    }
    fn claims() -> Claims {
        Claims {
            sub: "user-a".into(),
            nonce: Some("expected".into()),
            email: Some("test@example.invalid".into()),
            email_verified: Some(true),
            exp: 9999999999,
            iss: "test".into(),
            aud: json!("client"),
            azp: None,
        }
    }
    #[test]
    fn pkce_matches_rfc7636() {
        assert_eq!(
            challenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"),
            "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
        );
    }
    #[test]
    fn callback_rejects_wrong_state_duplicate_and_changed_client() {
        assert!(callback_parameters(
            "/auth/callback?code=c&state=wrong&client_id=oaiapp_123",
            "expected",
            None
        )
        .is_err());
        assert!(callback_parameters(
            "/auth/callback?code=c&state=s&state=s&client_id=oaiapp_123",
            "s",
            None
        )
        .is_err());
        assert!(callback_parameters(
            "/auth/callback?code=c&state=s&client_id=other",
            "s",
            Some("saved")
        )
        .is_err());
    }
    #[test]
    fn registration_requires_issued_id_and_keeps_returning_id() {
        assert!(callback_parameters(
            "/auth/callback?code=c&state=s&client_id=dynamic_agent_client",
            "s",
            None
        )
        .is_err());
        assert_eq!(
            callback_parameters("/auth/callback?code=c&state=s", "s", Some("saved")).unwrap(),
            ("c".into(), "saved".into())
        );
    }
    #[test]
    fn nonce_and_account_switch_are_rejected() {
        assert!(validate_identity(&claims(), Some("wrong"), None).is_err());
        assert!(validate_identity(&claims(), Some("expected"), Some("user-b")).is_err());
        assert!(validate_identity(&claims(), Some("expected"), Some("user-a")).is_ok());
    }
    #[test]
    fn id_only_scope_does_not_enable_inference() {
        let response = TokenResponse {
            access_token: "test".into(),
            refresh_token: None,
            id_token: Some("test".into()),
            expires_in: Some(3600),
            scope: Some("openid email".into()),
            token_type: Some("Bearer".into()),
        };
        assert!(merge_tokens(response, None, "openai", None).is_err());
    }
    #[test]
    fn refresh_keeps_prior_refresh_token_if_not_rotated() {
        let old = Tokens {
            access_token: "old".into(),
            refresh_token: Some("refresh".into()),
            id_token: "id".into(),
            expires_at: 0,
            scopes: vec!["chatgpt.tokens.use.direct".into(), "resource.invoke".into()],
            client_secret: None,
        };
        let response = TokenResponse {
            access_token: "new".into(),
            refresh_token: None,
            id_token: None,
            expires_in: Some(3600),
            scope: None,
            token_type: Some("Bearer".into()),
        };
        let new = merge_tokens(response, Some(&old), "openai", None).unwrap();
        assert_eq!(new.refresh_token.as_deref(), Some("refresh"));
        assert_eq!(new.access_token, "new");
    }
    #[test]
    fn account_tokens_never_go_to_cloud_gateway() {
        assert!(require_local_gateway("https://api.example.invalid", "chatgpt").is_err());
        assert!(require_local_gateway("http://127.0.0.1:8787", "chatgpt").is_ok());
        assert!(require_local_gateway("https://api.example.invalid", "api_key").is_ok());
    }
    #[test]
    fn encrypted_token_storage_is_bound_to_connection_and_detects_tampering() {
        let key = [7u8; 32];
        let value = seal(
            &key,
            "connection-a",
            "access-token refresh-token tiếng Việt",
        )
        .unwrap();
        assert!(!value.contains("access-token"));
        assert_eq!(
            unseal(&key, "connection-a", &value).unwrap(),
            "access-token refresh-token tiếng Việt"
        );
        assert!(unseal(&key, "connection-b", &value).is_err());
        let mut bytes = URL_SAFE_NO_PAD.decode(value).unwrap();
        bytes[15] ^= 1;
        assert!(unseal(&key, "connection-a", &URL_SAFE_NO_PAD.encode(bytes)).is_err());
    }
}
