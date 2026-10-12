//! Core domain models for the NOAH Tauri backend.
//!
//! Re-exports canonical models from `noah_core::models` and defines IPC response structures.

pub use noah_core::models::*;
pub use noah_core::storage::SongSearchResult;

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

/// Snapshot response returned to the Beamer webview upon mounting or syncing.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct BeamerStateResponse {
    pub active_song: Option<Song>,
    pub active_slide_index: usize,
    pub display_mode: DisplayMode,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_beamer_state_response_serialization() {
        let resp = BeamerStateResponse {
            active_song: None,
            active_slide_index: 0,
            display_mode: DisplayMode::Black,
        };
        let serialized = serde_json::to_string(&resp).expect("Must serialize");
        assert!(serialized.contains(r#""display_mode":"black""#));
        assert!(serialized.contains(r#""active_slide_index":0"#));

        let deserialized: BeamerStateResponse =
            serde_json::from_str(&serialized).expect("Must deserialize");
        assert_eq!(resp, deserialized);
    }
}

