#[cfg_attr(mobile, tauri::mobile_entry_point)]
use tauri::Manager;
#[cfg(target_os = "linux")]
use webkit2gtk::{WebViewExt, SettingsExt};
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .on_permission_request(|_webview, kind| {
            use tauri::webview::{PermissionKind, PermissionResponse};
            match kind {
                PermissionKind::Microphone
                | PermissionKind::Camera
                | PermissionKind::Notifications
                | PermissionKind::ClipboardRead
                | PermissionKind::Geolocation => PermissionResponse::Allow,
                _ => PermissionResponse::Default,
            }
        })
        .setup(|app| {
            #[cfg(target_os = "linux")]
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.with_webview(|webview| {
                    let wk = webview.inner();
                    if let Some(settings) = wk.settings() {
                        settings.set_enable_media_stream(true);
                        settings.set_enable_webaudio(true);
                        settings.set_allow_modal_dialogs(true);
                    }
                });
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
