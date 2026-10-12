//! Schedule (order of service / Ablaufplan) domain models.

use serde::{Deserialize, Serialize};

use super::ids::{ScheduleId, ScheduleItemId};
use super::song::Song;

/// Categorization of media items in a presentation schedule.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum MediaType {
    Image,
    Video,
    Audio,
    LiveCamera,
}

/// The specific payload of an item in the order of service.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "kind", content = "payload")]
pub enum ScheduleItemType {
    Song(Box<Song>),
    Scripture {
        reference: String,
        text: String,
        translation: String,
    },
    Media {
        path: String,
        media_type: MediaType,
    },
    SlideDeck {
        title: String,
        slide_count: usize,
    },
    Note {
        text: String,
    },
}

/// A single scheduled item inside a service plan.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ScheduleItem {
    pub id: ScheduleItemId,
    pub title: String,
    pub item_type: ScheduleItemType,
    pub duration_seconds: Option<u32>,
    pub notes: Option<String>,
}

impl ScheduleItem {
    #[must_use]
    pub fn new(title: impl Into<String>, item_type: ScheduleItemType) -> Self {
        Self {
            id: ScheduleItemId::new(),
            title: title.into(),
            item_type,
            duration_seconds: None,
            notes: None,
        }
    }
}

/// An entire service order containing ordered schedule items.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Schedule {
    pub id: ScheduleId,
    pub title: String,
    pub items: Vec<ScheduleItem>,
    pub notes: Option<String>,
}

impl Schedule {
    #[must_use]
    pub fn new(title: impl Into<String>) -> Self {
        Self {
            id: ScheduleId::new(),
            title: title.into(),
            items: Vec::new(),
            notes: None,
        }
    }

    /// Appends an item to the schedule safely.
    pub fn add_item(&mut self, item: ScheduleItem) {
        self.items.push(item);
    }

    /// Access an item by index without panics.
    #[must_use]
    pub fn get_item(&self, index: usize) -> Option<&ScheduleItem> {
        self.items.get(index)
    }

    /// Safely remove an item by index if within bounds.
    pub fn remove_item(&mut self, index: usize) -> Option<ScheduleItem> {
        if index < self.items.len() {
            Some(self.items.remove(index))
        } else {
            None
        }
    }
}
