//! NOAH Tauri backend application entry and command routing.

#![warn(clippy::all, clippy::pedantic, clippy::nursery)]
#![allow(clippy::module_name_repetitions)]

pub mod models;

use std::sync::Arc;

use models::{
    BeamerEvent, BeamerStateResponse, DisplayInfo, DisplayMode, PresentationState, SngLoadResponse,
    Song, SongSearchResult,
};
use noah_core::storage::SongDatabase;
use noah_parser::{parse_sng_bytes_with_info, serialize_sng, DetectedEncoding};
use tauri::{AppHandle, Emitter, Manager, State};
use tokio::sync::Mutex;

/// Live application state managed inside Tauri runtime.
pub struct AppState {
    pub presentation: Mutex<PresentationState>,
    pub active_song: Mutex<Option<Song>>,
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
async fn open_beamer_window(
    app: AppHandle,
    display_id: Option<String>,
    state: State<'_, AppState>,
) -> Result<DisplayInfo, String> {
    {
        let mut lock = state.presentation.lock().await;
        lock.display_mode = DisplayMode::Black;
    }
    let _ = app.emit("beamer-event", BeamerEvent::SetBlank { mode: DisplayMode::Black });

    let monitors = app
        .available_monitors()
        .map_err(|e| format!("Failed to enumerate monitors: {e}"))?;

    if monitors.is_empty() {
        return Err("No monitors detected on system".to_string());
    }

    let primary = app.primary_monitor().ok().flatten();
    let primary_name = primary.as_ref().and_then(|m| m.name());

    let mut selected_idx = 0;
    let mut target_is_secondary = false;

    if let Some(ref target_id) = display_id {
        for (idx, m) in monitors.iter().enumerate() {
            let id = format!("screen-{idx}");
            if &id == target_id || m.name().is_some_and(|n| n == target_id) {
                selected_idx = idx;
                target_is_secondary = primary_name.map_or(idx > 0, |pn| m.name().is_some_and(|n| n != pn));
                break;
            }
        }
    } else {
        // Automatic selection: prefer secondary monitor
        for (idx, m) in monitors.iter().enumerate() {
            let is_primary = primary_name.map_or(idx == 0, |pn| m.name().is_some_and(|n| n == pn));
            if !is_primary {
                selected_idx = idx;
                target_is_secondary = true;
                break;
            }
        }
    }

    let target_monitor = monitors
        .get(selected_idx)
        .ok_or_else(|| "Selected monitor index out of bounds".to_string())?;

    let size = target_monitor.size();
    let pos = target_monitor.position();
    let scale = target_monitor.scale_factor();
    let name = target_monitor
        .name()
        .cloned()
        .unwrap_or_else(|| format!("Display {}", selected_idx + 1));
    let is_primary = primary_name.map_or(selected_idx == 0, |pn| pn == &name);

    let display_info = DisplayInfo {
        id: format!("screen-{selected_idx}"),
        name,
        width: size.width,
        height: size.height,
        scale_factor: scale,
        is_primary,
        position_x: pos.x,
        position_y: pos.y,
    };

    let beamer_window = app
        .get_webview_window("beamer")
        .ok_or_else(|| "Beamer window not configured in tauri.conf.json".to_string())?;

    if target_is_secondary {
        let _ = beamer_window.set_fullscreen(false);
        let _ = beamer_window.set_decorations(false);
        let _ = beamer_window.set_position(tauri::Position::Physical(tauri::PhysicalPosition {
            x: pos.x,
            y: pos.y,
        }));
        let _ = beamer_window.set_size(tauri::Size::Physical(tauri::PhysicalSize {
            width: size.width,
            height: size.height,
        }));
        let _ = beamer_window.set_fullscreen(true);
    } else {
        // Single-monitor fallback: preview window
        let _ = beamer_window.set_fullscreen(false);
        let _ = beamer_window.set_decorations(true);
        let _ = beamer_window.set_size(tauri::Size::Logical(tauri::LogicalSize {
            width: 800.0,
            height: 600.0,
        }));
        let _ = beamer_window.center();
    }

    beamer_window
        .show()
        .map_err(|e| format!("Failed to show beamer window: {e}"))?;

    Ok(display_info)
}

#[tauri::command]
#[allow(clippy::needless_pass_by_value)]
fn close_beamer_window(app: AppHandle) -> Result<(), String> {
    if let Some(beamer_window) = app.get_webview_window("beamer") {
        beamer_window
            .hide()
            .map_err(|e| format!("Failed to hide beamer window: {e}"))?;
    }
    Ok(())
}

#[tauri::command]
async fn get_beamer_state(state: State<'_, AppState>) -> Result<BeamerStateResponse, String> {
    let pres = state.presentation.lock().await;
    let song = state.active_song.lock().await;
    Ok(BeamerStateResponse {
        active_song: song.clone(),
        active_slide_index: pres.active_slide_index.value(),
        display_mode: pres.display_mode,
    })
}

#[tauri::command]
async fn sync_active_song(
    app: AppHandle,
    song: Song,
    slide_index: usize,
    state: State<'_, AppState>,
) -> Result<(), String> {
    {
        let mut song_lock = state.active_song.lock().await;
        *song_lock = Some(song.clone());
    }
    {
        let mut lock = state.presentation.lock().await;
        lock.active_slide_index = models::SlideIndex::new(slide_index);
    }

    let _ = app.emit(
        "beamer-event",
        BeamerEvent::SyncSong {
            song: Box::new(song),
            slide_index: models::SlideIndex::new(slide_index),
        },
    );

    Ok(())
}

#[tauri::command]
async fn change_slide(
    app: AppHandle,
    slide_id: String,
    slide_index: usize,
    transition_ms: Option<u32>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    {
        let mut lock = state.presentation.lock().await;
        lock.active_slide_index = models::SlideIndex::new(slide_index);
        lock.display_mode = DisplayMode::Normal;
    }

    let transition = transition_ms.map_or(
        noah_core::models::TransitionType::Cut,
        |ms| noah_core::models::TransitionType::Crossfade { duration_ms: ms },
    );

    let _ = app.emit(
        "beamer-event",
        BeamerEvent::ChangeSlide {
            slide_id,
            transition,
        },
    );
    let _ = app.emit(
        "beamer-event",
        BeamerEvent::SetBlank {
            mode: DisplayMode::Normal,
        },
    );

    Ok(())
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
        active_song: Mutex::new(None),
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
            get_beamer_state,
            set_display_mode,
            list_displays,
            open_beamer_window,
            close_beamer_window,
            sync_active_song,
            change_slide,
            set_beamer_visible,
            dispatch_beamer_event
        ])
        .run(tauri::generate_context!())
    {
        tracing::error!("Error occurred while running NOAH Tauri application: {err}");
    }
}
