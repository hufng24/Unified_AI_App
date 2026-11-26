use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_opener::OpenerExt;

// Remote content receives no native capability: capabilities/default.json covers
// only the local main window, with no remote URL permission or injected bridge.
#[tauri::command]
pub async fn chatgpt_open(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("chatgpt-web") {
        window
            .show()
            .map_err(|_| "Không hiện được cửa sổ ChatGPT.")?;
        return window
            .set_focus()
            .map_err(|_| "Không chọn được cửa sổ ChatGPT.".into());
    }
    let url = "https://chatgpt.com/"
        .parse()
        .map_err(|_| "Địa chỉ ChatGPT không hợp lệ.")?;
    WebviewWindowBuilder::new(&app, "chatgpt-web", WebviewUrl::External(url))
        .title("ChatGPT · chatgpt.com")
        .inner_size(1280.0, 900.0)
        .min_inner_size(800.0, 600.0)
        .on_navigation({
            let app = app.clone();
            move |url| {
                // Show the actual origin during login redirects. Never inject
                // credentials, read cookies or spoof an official ChatGPT client.
                if let Some(window) = app.get_webview_window("chatgpt-web") {
                    let _ = window.set_title(&format!(
                        "ChatGPT Web · {}",
                        url.host_str().unwrap_or("Trang web")
                    ));
                }
                url.scheme() == "https" || url.as_str() == "about:blank"
            }
        })
        .build()
        .map_err(|_| "Không mở được ChatGPT trong app. Hãy dùng nút mở trình duyệt.".to_string())?;
    Ok(())
}
#[tauri::command]
pub fn chatgpt_browser(app: AppHandle) -> Result<(), String> {
    app.opener()
        .open_url("https://chatgpt.com/", None::<&str>)
        .map_err(|_| "Không mở được ChatGPT trong trình duyệt.".into())
}
