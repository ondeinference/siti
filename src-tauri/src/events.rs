//! Tauri event names emitted from Rust to the frontend.

/// Emitted whenever the chat model lifecycle status changes.
pub const EVENT_CHAT_STATUS_CHANGED: &str = "chat_status_changed";

/// Emitted once an inference request completes (or fails).
pub const EVENT_CHAT_REPLY: &str = "chat_reply";
