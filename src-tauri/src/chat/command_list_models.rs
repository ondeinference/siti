//! Tauri command: `chat_list_models`
//!
//! Returns the on-device models the user can switch between, sourced from the
//! onde SDK's `SUPPORTED_MODEL_INFO` catalogue (filtered to the subset the
//! engine can actually load), with the currently selected model flagged.

use super::ModelInfo;

/// Normalise a model description for Apple builds.
///
/// The shared onde model catalogue is cross-platform and also names sibling
/// products, so its descriptions mention Android/Windows/Linux and "siGit Code".
/// Apple's App Store Review Guideline 2.3.10 (Accurate Metadata) forbids
/// referencing other platforms in an iOS/macOS app's UI or metadata, so on
/// Apple builds we drop those mentions before the text reaches Settings. We
/// also neutralise the cross-product reference, which would only confuse a Siti
/// user. Apple's own platforms (iOS, macOS, tvOS) are kept.
#[cfg(any(target_os = "macos", target_os = "ios"))]
fn sanitize_description(desc: &str) -> String {
    desc.replace("iOS & Android", "iOS")
        .replace("macOS & Android", "macOS")
        .replace("macOS, Linux, and Windows", "macOS")
        .replace(", Linux, and Windows", "")
        .replace(", Linux and Windows", "")
        .replace(" & Android", "")
        .replace(" and Android", "")
        .replace("siGit Code", "coding tasks")
}

/// On Android the catalogue text is already accurate, so pass it through.
#[cfg(target_os = "android")]
fn sanitize_description(desc: &str) -> String {
    desc.to_string()
}

/// List the supported on-device models, smallest first, with the currently
/// selected model marked. Used to populate the Settings model dropdown.
#[cfg(any(target_os = "macos", target_os = "ios", target_os = "android"))]
#[tauri::command]
pub async fn chat_list_models() -> Vec<ModelInfo> {
    use super::{config_for_model_id, SELECTED_MODEL};

    let selected = SELECTED_MODEL.lock().map(|g| g.clone()).unwrap_or_default();

    let mut models: Vec<ModelInfo> = crate::inference::models::SUPPORTED_MODEL_INFO
        .iter()
        // Only include models the engine can build a loadable config for.
        .filter_map(|info| {
            config_for_model_id(info.id).map(|cfg| ModelInfo {
                id: info.id.to_string(),
                name: info.name.to_string(),
                org: info.org.to_string(),
                description: sanitize_description(info.description),
                approx_memory: cfg.approx_memory,
                size_bytes: Some(info.expected_size_bytes),
                is_selected: info.id == selected,
            })
        })
        .collect();

    // Smallest (most device-friendly) first.
    models.sort_by_key(|m| m.size_bytes.unwrap_or(u64::MAX));
    models
}

#[cfg(not(any(target_os = "macos", target_os = "ios", target_os = "android")))]
#[tauri::command]
pub async fn chat_list_models() -> Vec<ModelInfo> {
    log::debug!("On-device models are only supported on macOS, iOS, and Android.");
    Vec::new()
}
