//! Tauri command `chat_remove_model`: deletes a downloaded model's weights.
//!
//! Removes the model's directory from the local HuggingFace cache to free disk
//! space. If the model being removed is the one currently loaded in memory, it
//! is unloaded first so the engine doesn't keep a now-orphaned model resident.

use tauri::AppHandle;

#[cfg(any(target_os = "macos", target_os = "ios", target_os = "android"))]
use {
    super::{emit_chat_status, resolved_model_config, ENGINE, SELECTED_MODEL},
    crate::constants::ChatStatus,
    log::{error, info},
};

/// Delete the locally cached weights for `model_id` (a HuggingFace repo id from
/// `chat_list_models`). Unloads the model first if it is currently loaded.
#[cfg(any(target_os = "macos", target_os = "ios", target_os = "android"))]
#[tauri::command]
pub async fn chat_remove_model(app: AppHandle, model_id: String) -> Result<String, String> {
    // If we're deleting the model that's currently loaded/selected, unload it
    // first so the engine isn't left holding weights we're about to remove.
    let is_selected = SELECTED_MODEL
        .lock()
        .map(|g| *g == model_id)
        .unwrap_or(false);

    if is_selected && ENGINE.is_loaded().await {
        let display_name = resolved_model_config().display_name();
        ENGINE.unload_model().await;
        info!("Unloaded {display_name} before removing its weights.");
        emit_chat_status(&app, ChatStatus::Unloaded, None, None);
    }

    onde::hf_cache::delete_local_hf_model(model_id.clone()).map_err(|e| {
        let msg = format!("Failed to remove model {model_id}: {e}");
        error!("{msg}");
        msg
    })?;

    let msg = format!("Removed downloaded weights for {model_id}.");
    info!("{msg}");
    Ok(msg)
}

#[cfg(not(any(target_os = "macos", target_os = "ios", target_os = "android")))]
#[tauri::command]
pub async fn chat_remove_model(_app: AppHandle, _model_id: String) -> Result<String, String> {
    log::debug!("Model management is only supported on macOS, iOS, and Android.");
    Err("Model management is only supported on macOS, iOS, and Android for now.".to_string())
}
