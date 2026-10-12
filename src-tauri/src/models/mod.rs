//! Core domain models for the NOAH Tauri backend.
//!
//! Re-exports canonical models from `noah_core::models` and defines IPC response structures.

pub use noah_core::models::*;

use serde::{Deserialize, Serialize};

/// Payload returned to the frontend when loading an SNG file.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SngLoadResponse {
    pub song: Song,
    pub encoding: String,
}

/// Request payload to change active live presentation slide.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ChangeSlideRequest {
    pub slide_index: usize,
    pub transition_duration_ms: Option<u32>,
}
