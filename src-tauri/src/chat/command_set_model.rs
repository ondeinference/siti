//! Tauri command `chat_set_model`: switches the active on-device model.
//!
//! Updates the selected model, unloads any currently loaded model, and loads
//! the new one. Like `chat_send_message`, this returns `Ok(())` as soon as the
//! work is dispatched: switching can trigger a multi-gigabyte HuggingFace
//! download, so progress and completion are reported via the
//! `chat_status_changed` event (Loading → Ready, or Error) rather than a
//! blocking return that the WebView could GC out from under us.

use tauri::AppHandle;

#[cfg(any(target_os = "macos", target_os = "ios", target_os = "android"))]
use {
    super::{
        emit_chat_status, fmt_duration, resolve_model_id, resolved_model_config, sampling_config,
        CHAT_SYSTEM_PROMPT, ENGINE, SELECTED_MODEL,
    },
    crate::constants::ChatStatus,
    log::{error, info},
};

/// Switch Siti to the model identified by `model_id` (a HuggingFace repo id
/// from `chat_list_models`). The new model is loaded asynchronously; watch the
/// `chat_status_changed` event for `Loading` → `Ready`/`Error`.
#[cfg(any(target_os = "macos", target_os = "ios", target_os = "android"))]
#[tauri::command]
pub async fn chat_set_model(app: AppHandle, model_id: String) -> Result<(), String> {
    // ── 1. Validate & resolve the requested model ────────────────────────
    let display_name = resolve_model_id(&model_id)
        .ok_or_else(|| format!("Unknown or unsupported model id: {model_id}"))?
        .display_name();

    // ── 2. Persist the selection so resolved_model_config()/sampling_config() agree ─
    // NB: never hold the std Mutex guard across an `.await` (it would make this
    // command future `!Send`), so resolve the loaded-state first.
    let already_loaded = ENGINE.is_loaded().await;
    {
        let mut selected = SELECTED_MODEL
            .lock()
            .map_err(|e| format!("Failed to update selected model: {e}"))?;
        if *selected == model_id && already_loaded {
            info!("Model {display_name} is already selected and loaded; nothing to do.");
            return Ok(());
        }
        *selected = model_id.clone();
    }

    info!("chat_set_model: switching to {display_name} ({model_id})");
    emit_chat_status(&app, ChatStatus::Loading, Some(&display_name), None);

    // ── 3. Swap models off-thread; report progress via events ────────────
    // Re-resolve from the (now-persisted) selection inside the task so the
    // GGUF/ISQ dispatch matches exactly what `chat_send_message` would load.
    tokio::task::spawn(async move {
        if ENGINE.is_loaded().await {
            ENGINE.unload_model().await;
        }

        let result = resolved_model_config()
            .load(
                Some(CHAT_SYSTEM_PROMPT.to_string()),
                Some(sampling_config()),
            )
            .await;

        match result {
            Ok(elapsed) => {
                info!("Model {display_name} loaded in {}", fmt_duration(elapsed));
                emit_chat_status(&app, ChatStatus::Ready, Some(&display_name), None);
            }
            Err(e) => {
                let msg = format!("Failed to load model {display_name}: {e}");
                error!("{msg}");
                emit_chat_status(&app, ChatStatus::Error, Some(&display_name), Some(&msg));
            }
        }
    });

    Ok(())
}

#[cfg(not(any(target_os = "macos", target_os = "ios", target_os = "android")))]
#[tauri::command]
pub async fn chat_set_model(_app: AppHandle, _model_id: String) -> Result<(), String> {
    log::debug!("Model switching is only supported on macOS, iOS, and Android.");
    Err("Model switching is only supported on macOS, iOS, and Android for now.".to_string())
}
