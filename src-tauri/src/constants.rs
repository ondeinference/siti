use serde::{Deserialize, Serialize};

/// Chat model status, mirrored to the frontend via the
/// `chat_status_changed` event and the `chat_get_status` command.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ChatStatus {
    /// No model is loaded.
    Unloaded,
    /// Model is currently being downloaded / loaded into memory.
    Loading,
    /// Model is loaded and ready to chat.
    Ready,
    /// Model is actively generating a response.
    Generating,
    /// Model failed to load.
    Error,
}
