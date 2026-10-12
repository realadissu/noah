//! Display state, blanking modes, and live presentation IPC envelopes.

use serde::{Deserialize, Serialize};

use super::ids::{ScheduleItemId, SlideIndex};

/// Live display modes supported by NOAH (per REQ-DSP-02).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DisplayMode {
    #[default]
    Normal,
    Black,
    ClearText,
    Logo,
    Frozen,
}

/// Transition effect between slides.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum TransitionType {
    Cut,
    Crossfade { duration_ms: u32 },
}

impl Default for TransitionType {
    fn default() -> Self {
        Self::Crossfade { duration_ms: 300 }
    }
}

/// Target destination for operator alert banners.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AlertTarget {
    #[default]
    All,
    StageOnly,
    AudienceOnly,
}

/// Dynamic alert message overlaid on displays.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AlertMessage {
    pub message: String,
    pub duration_ms: u32,
    pub target: AlertTarget,
}

/// Canonical live presentation state snapshot sent to renderers and control UI.
#[derive(Debug, Clone, PartialEq, Eq, Default, Serialize, Deserialize)]
pub struct PresentationState {
    pub active_item: Option<ScheduleItemId>,
    pub active_slide_index: SlideIndex,
    pub display_mode: DisplayMode,
    pub overlay_alert: Option<AlertMessage>,
}

/// Typed IPC event envelope dispatched to Audience Beamer webview.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum BeamerEvent {
    #[serde(rename = "CHANGE_SLIDE")]
    ChangeSlide {
        #[serde(rename = "slideId")]
        slide_id: String,
        transition: TransitionType,
    },
    #[serde(rename = "SYNC_SONG")]
    SyncSong {
        song: Box<super::song::Song>,
        #[serde(rename = "slideIndex")]
        slide_index: SlideIndex,
    },
    #[serde(rename = "SET_BLANK")]
    SetBlank {
        mode: DisplayMode,
    },
    #[serde(rename = "ALERT_OVERLAY")]
    AlertOverlay {
        message: String,
        #[serde(rename = "durationMs")]
        duration_ms: u32,
    },
}

/// Information describing a connected physical screen or monitor.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DisplayInfo {
    pub id: String,
    pub name: String,
    pub width: u32,
    pub height: u32,
    pub scale_factor: f64,
    pub is_primary: bool,
    pub position_x: i32,
    pub position_y: i32,
}

/// Active display routing targets configured by the operator.
#[derive(Debug, Clone, PartialEq, Eq, Default, Serialize, Deserialize)]
pub struct DisplayConfiguration {
    pub control_display_id: Option<String>,
    pub beamer_display_id: Option<String>,
    pub stage_display_id: Option<String>,
}

