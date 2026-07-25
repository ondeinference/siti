//! Tauri command `chat_load_model`: loads the on-device chat model.
//!
//! Siti is fully offline: it loads the platform-default GGUF model directly.
//! There is no operator-assigned model and no app credentials involved. The
//! only network access is the one-time HuggingFace download of the model
//! weights into the shared App Group cache.

use tauri::AppHandle;

#[cfg(any(target_os = "macos", target_os = "ios", target_os = "android"))]
use {
    super::{
        emit_chat_status, fmt_duration, resolved_model_config, sampling_config, CHAT_SYSTEM_PROMPT,
    },
    crate::constants::ChatStatus,
    log::{error, info},
};

/// Load the platform-default chat model into memory.
#[cfg(any(target_os = "macos", target_os = "ios", target_os = "android"))]
#[tauri::command]
pub async fn chat_load_model(app: AppHandle) -> Result<String, String> {
    let config = resolved_model_config();
    let display_name = config.display_name();
    info!("chat_load_model: loading on-device model {}", display_name);
    emit_chat_status(&app, ChatStatus::Loading, Some(&display_name), None);

    let elapsed = config
        .load(
            Some(CHAT_SYSTEM_PROMPT.to_string()),
            Some(sampling_config()),
        )
        .await
        .map_err(|e| {
            let msg = format!("Failed to load chat model: {}", e);
            error!("{}", msg);
            emit_chat_status(&app, ChatStatus::Error, Some(&display_name), Some(&msg));
            msg
        })?;

    let msg = format!(
        "Chat model {} loaded in {}",
        display_name,
        fmt_duration(elapsed)
    );
    info!("{}", msg);
    emit_chat_status(&app, ChatStatus::Ready, Some(&display_name), None);
    Ok(msg)
}

#[cfg(not(any(target_os = "macos", target_os = "ios", target_os = "android")))]
#[tauri::command]
pub async fn chat_load_model(_app: AppHandle) -> Result<String, String> {
    log::debug!("Chat model is only supported on macOS, iOS, and Android for now.");
    Err("Chat model is only supported on macOS, iOS, and Android for now.".to_string())
}
