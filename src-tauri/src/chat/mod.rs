//! Chat feature module: fully on-device LLM inference for Siti AI.
//!
//! Each Tauri command lives in its own file (`command_*.rs`).  Shared types,
//! the cached engine instance, model/sampling configuration, and helpers are
//! kept here in `mod.rs` so every command file can `use super::*`.
//!
//! Model loading, inference, and history management are delegated to
//! [`onde::inference::ChatEngine`], the shared on-device inference engine
//! from the `onde` crate.  Siti runs the engine **fully offline**: it loads
//! the platform-default GGUF model directly (no operator-assigned model, no
//! app credentials) and pulse telemetry is disabled during app setup.

// ── Command submodules (one Tauri command per file) ──────────────────────────

pub mod command_clear_history;
pub mod command_get_history;
pub mod command_get_status;
pub mod command_list_models;
pub mod command_load_model;
pub mod command_send_message;
pub mod command_set_model;
pub mod command_unload_model;

// ── Re-exports so lib.rs can pull in commands with a flat path ───────────────

pub use command_clear_history::chat_clear_history;
pub use command_get_history::chat_get_history;
pub use command_get_status::chat_get_status;
pub use command_list_models::chat_list_models;
pub use command_load_model::chat_load_model;
pub use command_send_message::chat_send_message;
pub use command_set_model::chat_set_model;
pub use command_unload_model::chat_unload_model;

// ── Imports shared with submodules via `super::` ─────────────────────────────

use {
    crate::constants::ChatStatus,
    serde::{Deserialize, Serialize},
};

#[cfg(any(target_os = "macos", target_os = "ios", target_os = "android"))]
use {
    crate::events::{EVENT_CHAT_REPLY, EVENT_CHAT_STATUS_CHANGED},
    log::error,
    once_cell::sync::Lazy,
    onde::inference::{ChatEngine, GgufModelConfig, InferenceError, SamplingConfig},
    tauri::{AppHandle, Emitter},
};

// `IsqModelConfig` and the ISQ load path only exist on macOS (Metal). Gemma is
// offered exclusively there — see `ResolvedModel` below for the reasoning.
#[cfg(target_os = "macos")]
use onde::inference::IsqModelConfig;

// ── Response / payload types ─────────────────────────────────────────────────

/// Payload emitted with the `chat_status_changed` event.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatStatusPayload {
    pub status: ChatStatus,
    pub model_name: Option<String>,
    pub error: Option<String>,
}

/// A single message in the conversation, returned to the frontend.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessagePayload {
    pub role: String,
    pub content: String,
}

/// Event payload emitted as `chat_reply` once inference completes.
///
/// Using an event instead of a blocking command return prevents the WebView
/// from garbage-collecting the JS invoke-callback before the slow on-device
/// inference finishes.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatReplyPayload {
    /// The assistant's reply text, or `None` on error.
    pub reply: Option<String>,
    /// Human-readable inference duration, or `None` on error.
    pub duration: Option<String>,
    /// Error message if inference failed, or `None` on success.
    pub error: Option<String>,
}

/// Response returned by `chat_get_status`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatStatusResponse {
    pub status: ChatStatus,
    pub model_name: Option<String>,
    pub approx_memory: Option<String>,
    pub history_length: usize,
}

/// A selectable on-device model, returned by `chat_list_models` and rendered
/// in the Settings model dropdown.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelInfo {
    /// HuggingFace repo id; the value passed back to `chat_set_model`.
    pub id: String,
    /// Human-friendly display name, e.g. `"Qwen 2.5 1.5B (GGUF)"`.
    pub name: String,
    /// Publisher / organisation, e.g. `"Qwen / Alibaba"`.
    pub org: String,
    /// Short description of the model's purpose and footprint.
    pub description: String,
    /// Approximate memory footprint, e.g. `"~941 MB (GGUF Q4_K_M)"`.
    pub approx_memory: String,
    /// Approximate on-disk download size in bytes (for display).
    pub size_bytes: Option<u64>,
    /// Whether this model is the one currently selected for Siti.
    pub is_selected: bool,
}

// ── Shared ChatEngine instance ───────────────────────────────────────────────
//
// `ChatEngine` from `onde` handles all model lifecycle, history, and inference.
// It is `Send + Sync` and manages its own internal mutex.

#[cfg(any(target_os = "macos", target_os = "ios", target_os = "android"))]
pub(crate) static ENGINE: Lazy<ChatEngine> = Lazy::new(ChatEngine::new);

// ── Model selection & configuration ──────────────────────────────────────────
//
// The user can switch models from Settings (`chat_set_model`). The chosen
// HuggingFace repo id is held in `SELECTED_MODEL` and drives both the model
// config and the sampling config. When nothing has been chosen yet, Siti
// falls back to a general-purpose chat model appropriate for the platform:
//   - iOS / Android → Qwen 2.5 1.5B (~941 MB, fits mobile memory budgets)
//   - macOS         → Qwen 2.5 3B   (~1.93 GB, more headroom on desktop)
//
// `config_for_model_id` handles per-platform details (e.g. `tok_model_id` on
// Android) via the onde `GgufModelConfig` constructors.

/// The model id currently selected for Siti. Defaults to the platform-
/// appropriate general chat model; updated by `chat_set_model`.
#[cfg(any(target_os = "macos", target_os = "ios", target_os = "android"))]
pub(crate) static SELECTED_MODEL: Lazy<std::sync::Mutex<String>> =
    Lazy::new(|| std::sync::Mutex::new(siti_default_config().model_id));

/// Siti's default general-purpose chat model for the current platform.
#[cfg(any(target_os = "macos", target_os = "ios", target_os = "android"))]
pub(crate) fn siti_default_config() -> GgufModelConfig {
    if cfg!(any(target_os = "ios", target_os = "android")) {
        GgufModelConfig::qwen25_1_5b()
    } else {
        GgufModelConfig::qwen25_3b()
    }
}

/// Map a HuggingFace repo id to a loadable [`GgufModelConfig`], or `None` if
/// the id is not a model the onde engine knows how to load.
#[cfg(any(target_os = "macos", target_os = "ios", target_os = "android"))]
pub(crate) fn config_for_model_id(id: &str) -> Option<GgufModelConfig> {
    use crate::inference::models as m;
    let cfg = if id == m::BARTOWSKI_QWEN25_0_5B_INSTRUCT_GGUF {
        GgufModelConfig::qwen25_0_5b()
    } else if id == m::BARTOWSKI_QWEN25_1_5B_INSTRUCT_GGUF {
        GgufModelConfig::qwen25_1_5b()
    } else if id == m::BARTOWSKI_QWEN25_3B_INSTRUCT_GGUF {
        GgufModelConfig::qwen25_3b()
    } else if id == m::BARTOWSKI_QWEN25_CODER_1_5B_INSTRUCT_GGUF {
        GgufModelConfig::qwen25_coder_1_5b()
    } else if id == m::BARTOWSKI_QWEN25_CODER_3B_INSTRUCT_GGUF {
        GgufModelConfig::qwen25_coder_3b()
    } else if id == m::BARTOWSKI_QWEN25_CODER_7B_INSTRUCT_GGUF {
        GgufModelConfig::qwen25_coder_7b()
    } else if id == m::BARTOWSKI_QWEN3_0_6B_GGUF {
        GgufModelConfig::qwen3_0_6b()
    } else if id == m::BARTOWSKI_QWEN3_1_7B_GGUF {
        GgufModelConfig::qwen3_1_7b()
    } else if id == m::BARTOWSKI_QWEN3_4B_GGUF {
        GgufModelConfig::qwen3_4b()
    } else if id == m::BARTOWSKI_QWEN3_8B_GGUF {
        GgufModelConfig::qwen3_8b()
    } else if id == m::BARTOWSKI_QWEN3_14B_GGUF {
        GgufModelConfig::qwen3_14b()
    } else if id == m::BARTOWSKI_QWEN3_32B_GGUF {
        GgufModelConfig::qwen3_32b()
    } else if id == m::BARTOWSKI_QWEN3_4B_INSTRUCT_2507_GGUF {
        GgufModelConfig::qwen3_4b_instruct_2507()
    } else if id == m::BARTOWSKI_QWEN3_4B_THINKING_2507_GGUF {
        GgufModelConfig::qwen3_4b_thinking_2507()
    } else if id == m::BARTOWSKI_QWEN3_30B_A3B_INSTRUCT_2507_GGUF {
        GgufModelConfig::qwen3_30b_a3b_instruct_2507()
    } else if id == m::THEBLOKE_DEEPSEEK_CODER_6_7B_INSTRUCT_GGUF {
        GgufModelConfig::deepseek_coder_6_7b()
    } else {
        return None;
    };
    Some(cfg)
}

// ── Gemma (ISQ safetensors path, macOS only) ─────────────────────────────────
//
// Gemma cannot be loaded through the GGUF path Siti uses for every other model:
// mistral.rs's GGUF loader (`GGUFArchitecture`) only recognises Llama / Qwen2 /
// Qwen3 / Mistral3 / etc. — it has **no Gemma architecture**, so a Gemma GGUF
// file fails to load with "Unknown GGUF architecture `gemma2`". mistral.rs does
// support Gemma, but only via its plain safetensors loader, which onde exposes
// through the ISQ (in-situ quantise) path (`load_isq_model`).
//
// That path is Metal-only, so Gemma is offered on **macOS only** — never on
// iOS/Android, whose builds have no `IsqModelConfig` load path and far tighter
// memory budgets than an ISQ load (full bf16 weights downloaded, then quantised
// in memory) allows.

/// HuggingFace repo id for the Gemma 2 2B Instruct model, loaded via ISQ.
///
/// The `unsloth` re-upload is used instead of `google/gemma-2-2b-it` because the
/// official repo is gated (requires accepting Google's licence + an HF token),
/// which Siti's credential-free offline download cannot satisfy. This mirror
/// ships the same `Gemma2ForCausalLM` bf16 weights, ungated.
#[cfg(target_os = "macos")]
pub(crate) const GEMMA2_2B_IT_ISQ_ID: &str = "unsloth/gemma-2-2b-it";

/// ISQ config for Gemma 2 2B Instruct (4-bit, Metal). macOS only.
#[cfg(target_os = "macos")]
pub(crate) fn gemma2_2b_isq_config() -> IsqModelConfig {
    IsqModelConfig {
        model_id: GEMMA2_2B_IT_ISQ_ID.to_string(),
        isq_bits: 4,
        display_name: "Gemma 2 2B (ISQ 4-bit)".to_string(),
        approx_memory: "~1.6 GB (ISQ Q4K, Metal)".to_string(),
    }
}

/// A model selection resolved to the concrete engine config and load path it
/// needs. Most models are GGUF; Gemma is the sole ISQ model (macOS only).
#[cfg(any(target_os = "macos", target_os = "ios", target_os = "android"))]
pub(crate) enum ResolvedModel {
    Gguf(GgufModelConfig),
    #[cfg(target_os = "macos")]
    Isq(IsqModelConfig),
}

#[cfg(any(target_os = "macos", target_os = "ios", target_os = "android"))]
impl ResolvedModel {
    /// Human-friendly display name for the resolved model.
    pub(crate) fn display_name(&self) -> String {
        match self {
            ResolvedModel::Gguf(c) => c.display_name.clone(),
            #[cfg(target_os = "macos")]
            ResolvedModel::Isq(c) => c.display_name.clone(),
        }
    }

    /// Load the resolved model into the shared [`ENGINE`], dispatching to the
    /// GGUF or ISQ load path as appropriate.
    pub(crate) async fn load(
        self,
        system_prompt: Option<String>,
        sampling: Option<SamplingConfig>,
    ) -> Result<std::time::Duration, InferenceError> {
        match self {
            ResolvedModel::Gguf(c) => ENGINE.load_gguf_model(c, system_prompt, sampling).await,
            #[cfg(target_os = "macos")]
            ResolvedModel::Isq(c) => ENGINE.load_isq_model(c, system_prompt, sampling).await,
        }
    }
}

/// Resolve a HuggingFace repo id to a loadable [`ResolvedModel`], or `None` if
/// the id is not a model Siti can load on this platform.
#[cfg(any(target_os = "macos", target_os = "ios", target_os = "android"))]
pub(crate) fn resolve_model_id(id: &str) -> Option<ResolvedModel> {
    #[cfg(target_os = "macos")]
    if id == GEMMA2_2B_IT_ISQ_ID {
        return Some(ResolvedModel::Isq(gemma2_2b_isq_config()));
    }
    config_for_model_id(id).map(ResolvedModel::Gguf)
}

/// Return the resolved model (GGUF or ISQ) for the current selection, falling
/// back to the platform-default GGUF model if the selection is unknown.
#[cfg(any(target_os = "macos", target_os = "ios", target_os = "android"))]
pub(crate) fn resolved_model_config() -> ResolvedModel {
    let id = SELECTED_MODEL.lock().map(|g| g.clone()).unwrap_or_default();
    resolve_model_id(&id).unwrap_or_else(|| ResolvedModel::Gguf(siti_default_config()))
}

/// Return the sampling config for the currently selected model.
///
/// iOS and Android use conservative settings to bound KV cache memory and
/// keep worst-case latency reasonable on slower SoCs. Qwen 3 models get a
/// larger `max_tokens` budget because their `<think>…</think>` block can
/// consume hundreds of tokens before the visible reply begins, and too small
/// a budget yields empty replies.
#[cfg(any(target_os = "macos", target_os = "ios", target_os = "android"))]
pub(crate) fn sampling_config() -> SamplingConfig {
    let id = SELECTED_MODEL.lock().map(|g| g.clone()).unwrap_or_default();
    let is_qwen3 = id.contains("Qwen3") || id.contains("Qwen_Qwen3");
    let mobile = cfg!(any(target_os = "ios", target_os = "android"));

    let max_tokens = match (mobile, is_qwen3) {
        (true, true) => 1024,
        (true, false) => 256,
        (false, true) => 4096,
        (false, false) => 512,
    };

    if mobile {
        SamplingConfig {
            temperature: Some(0.7),
            top_p: Some(0.95),
            max_tokens: Some(max_tokens),
            ..SamplingConfig::mobile()
        }
    } else {
        SamplingConfig {
            temperature: Some(0.7),
            top_p: Some(0.95),
            max_tokens: Some(max_tokens),
            ..SamplingConfig::default()
        }
    }
}

/// Default system prompt for Siti, the private on-device personal assistant.
#[cfg(any(target_os = "macos", target_os = "ios", target_os = "android"))]
pub(crate) const CHAT_SYSTEM_PROMPT: &str = r#"You are Siti, a friendly and capable personal assistant that runs entirely on the user's device. Nothing the user says ever leaves the device.

You help with everyday things: answering questions, brainstorming, drafting and editing text, summarising, explaining ideas in plain terms, and planning.

Keep replies clear and concise, and prefer plain language. If a request is ambiguous, ask one short question instead of guessing. Use a short list only when it genuinely helps, and go easy on emoji.

You run locally, so you may not know about very recent events. When you are not sure, say so instead of inventing an answer."#;

// ── Helpers ──────────────────────────────────────────────────────────────────

/// Format a `Duration` as `Xm Ys` or just `Ys` when under a minute.
#[cfg(any(target_os = "macos", target_os = "ios", target_os = "android"))]
pub(crate) fn fmt_duration(d: std::time::Duration) -> String {
    let total_secs = d.as_secs_f64();
    let mins = (total_secs / 60.0).floor() as u64;
    let secs = total_secs - (mins as f64 * 60.0);
    if mins > 0 {
        format!("{}m {:.1}s", mins, secs)
    } else {
        format!("{:.1}s", secs)
    }
}

/// Emit a chat status event to the frontend.
#[cfg(any(target_os = "macos", target_os = "ios", target_os = "android"))]
pub(crate) fn emit_chat_status(
    app: &AppHandle,
    status: ChatStatus,
    model_name: Option<&str>,
    error_msg: Option<&str>,
) {
    let payload = ChatStatusPayload {
        status,
        model_name: model_name.map(|s| s.to_string()),
        error: error_msg.map(|s| s.to_string()),
    };
    if let Err(e) = app.emit(EVENT_CHAT_STATUS_CHANGED, &payload) {
        error!("Failed to emit chat status event: {:?}", e);
    }
}
