//! NOAH Tauri backend application entry and command routing.

#![warn(clippy::all, clippy::pedantic, clippy::nursery)]
#![allow(clippy::module_name_repetitions)]

pub mod models;

use std::sync::Arc;

use models::{
    BeamerEvent, DisplayInfo, DisplayMode, PresentationState, SngLoadResponse, Song,
    SongSearchResult,
};
use noah_core::storage::SongDatabase;
use noah_parser::{parse_sng_bytes_with_info, serialize_sng, DetectedEncoding};
use tauri::{AppHandle, Emitter, Manager, State};
use tokio::sync::Mutex;

/// Live application state managed inside Tauri runtime.
pub struct AppState {
    pub presentation: Mutex<PresentationState>,
    pub db: Arc<SongDatabase>,
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
#[allow(clippy::needless_pass_by_value)]
fn export_sng(song: Song) -> String {
    serialize_sng(&song)
}

#[tauri::command]
async fn search_songs(
    query: String,
    limit: Option<usize>,
    state: State<'_, AppState>,
) -> Result<Vec<SongSearchResult>, String> {
    let limit = limit.unwrap_or(20);
    state.db.search(&query, limit).map_err(|e| e.to_string())
}

#[tauri::command]
async fn index_song(
    song: Song,
    file_path: Option<String>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let path_ref = file_path.as_deref().map(std::path::Path::new);
    state
        .db
        .upsert_song(&song, path_ref)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_presentation_state(state: State<'_, AppState>) -> Result<PresentationState, String> {
    let lock = state.presentation.lock().await;
    Ok(lock.clone())
}

#[tauri::command]
async fn set_display_mode(
    mode: DisplayMode,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<PresentationState, String> {
    let mut lock = state.presentation.lock().await;
    lock.display_mode = mode;

    let _ = app.emit("beamer-event", BeamerEvent::SetBlank { mode });

    Ok(lock.clone())
}

#[tauri::command]
#[allow(clippy::needless_pass_by_value)]
fn list_displays(app: AppHandle) -> Result<Vec<DisplayInfo>, String> {
    let monitors = app
        .available_monitors()
        .map_err(|e| format!("Failed to enumerate monitors: {e}"))?;

    let primary = app.primary_monitor().ok().flatten();
    let primary_name = primary.as_ref().and_then(|m| m.name());

    let mut displays = Vec::new();
    for (idx, m) in monitors.into_iter().enumerate() {
        let name = m.name().cloned().unwrap_or_else(|| format!("Display {}", idx + 1));
        let size = m.size();
        let pos = m.position();
        let scale = m.scale_factor();
        let is_primary = primary_name.map_or(idx == 0, |pn| pn == &name);

        displays.push(DisplayInfo {
            id: format!("screen-{idx}"),
            name,
            width: size.width,
            height: size.height,
            scale_factor: scale,
            is_primary,
            position_x: pos.x,
            position_y: pos.y,
        });
    }

    Ok(displays)
}

#[tauri::command]
#[allow(clippy::needless_pass_by_value)]
fn set_beamer_visible(app: AppHandle, visible: bool) -> Result<(), String> {
    if let Some(beamer_window) = app.get_webview_window("beamer") {
        if visible {
            beamer_window
                .show()
                .map_err(|e| format!("Failed to show beamer window: {e}"))?;
            let _ = beamer_window.set_focus();
        } else {
            beamer_window
                .hide()
                .map_err(|e| format!("Failed to hide beamer window: {e}"))?;
        }
    }
    Ok(())
}

#[tauri::command]
#[allow(clippy::needless_pass_by_value)]
fn dispatch_beamer_event(app: AppHandle, event: BeamerEvent) -> Result<(), String> {
    app.emit("beamer-event", event)
        .map_err(|e| format!("Failed to emit beamer event: {e}"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let db = match SongDatabase::open_in_memory() {
        Ok(d) => Arc::new(d),
        Err(err) => {
            tracing::error!("Failed to initialize database: {err}");
            return;
        }
    };

    let initial_state = AppState {
        presentation: Mutex::new(PresentationState::default()),
        db,
    };

    if let Err(err) = tauri::Builder::default()
        .manage(initial_state)
        .invoke_handler(tauri::generate_handler![
            parse_sng,
            export_sng,
            search_songs,
            index_song,
            get_presentation_state,
            set_display_mode,
            list_displays,
            set_beamer_visible,
            dispatch_beamer_event
        ])
        .run(tauri::generate_context!())
    {
        tracing::error!("Error occurred while running NOAH Tauri application: {err}");
    }
}
