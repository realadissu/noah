//! NOAH Tauri backend application entry and command routing.

#![warn(clippy::all, clippy::pedantic, clippy::nursery)]
#![allow(clippy::module_name_repetitions)]

pub mod models;

use models::{DisplayMode, PresentationState, SngLoadResponse};
use noah_parser::{parse_sng_bytes_with_info, DetectedEncoding};
use tauri::State;
use tokio::sync::Mutex;

/// Live application state managed inside Tauri runtime.
pub struct AppState {
    pub presentation: Mutex<PresentationState>,
}

#[tauri::command]
fn parse_sng(content: &str) -> Result<SngLoadResponse, String> {
    let bytes = content.as_bytes();
    let result = parse_sng_bytes_with_info(bytes).map_err(|e| e.to_string())?;

    let encoding_name = match result.detected_encoding {
        DetectedEncoding::Utf8WithBom => "UTF-8 (BOM)",
        DetectedEncoding::Utf8 => "UTF-8",
        DetectedEncoding::Windows1252 => "Windows-1252",
    };

    Ok(SngLoadResponse {
        song: result.song,
        encoding: encoding_name.to_string(),
    })
}

#[tauri::command]
async fn get_presentation_state(state: State<'_, AppState>) -> Result<PresentationState, String> {
    let lock = state.presentation.lock().await;
    Ok(lock.clone())
}

#[tauri::command]
async fn set_display_mode(
    mode: DisplayMode,
    state: State<'_, AppState>,
) -> Result<PresentationState, String> {
    let mut lock = state.presentation.lock().await;
    lock.display_mode = mode;
    Ok(lock.clone())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let initial_state = AppState {
        presentation: Mutex::new(PresentationState::default()),
    };

    if let Err(err) = tauri::Builder::default()
        .manage(initial_state)
        .invoke_handler(tauri::generate_handler![
            parse_sng,
            get_presentation_state,
            set_display_mode
        ])
        .run(tauri::generate_context!())
    {
        tracing::error!("Error occurred while running NOAH Tauri application: {err}");
    }
}
