//! Song data structures and rich metadata model.

use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

use super::ids::SongId;
use super::slide::Slide;

/// Song metadata conforming to the `SongBeamer` .sng specification and NOAH extensions.
#[derive(Debug, Clone, PartialEq, Eq, Default, Serialize, Deserialize)]
pub struct SongMetadata {
    pub title: String,
    pub title_lang2: Option<String>,
    pub author: Option<String>,
    pub copyright: Option<String>,
    pub ccli: Option<String>,
    pub transpose: Option<i32>,
    pub speed: Option<u32>,
    pub musical_key: Option<String>,
    pub font_size: Option<u32>,
    pub verse_order: Vec<String>,
    pub lang_count: u32,
    pub custom_tags: BTreeMap<String, String>,
}

impl SongMetadata {
    #[must_use]
    pub fn new(title: impl Into<String>) -> Self {
        Self {
            title: title.into(),
            title_lang2: None,
            author: None,
            copyright: None,
            ccli: None,
            transpose: None,
            speed: None,
            musical_key: None,
            font_size: None,
            verse_order: Vec::new(),
            lang_count: 1,
            custom_tags: BTreeMap::new(),
        }
    }
}

/// A complete song entity containing metadata and ordered slides.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Song {
    pub id: SongId,
    pub metadata: SongMetadata,
    pub slides: Vec<Slide>,
    pub raw_format: Option<String>,
}

impl Song {
    #[must_use]
    pub fn new(metadata: SongMetadata, slides: Vec<Slide>) -> Self {
        Self {
            id: SongId::new(),
            metadata,
            slides,
            raw_format: None,
        }
    }

    /// Retrieve a slide by its 0-based index safely without panics.
    #[must_use]
    pub fn get_slide(&self, index: usize) -> Option<&Slide> {
        self.slides.get(index)
    }

    /// Total count of presentation slides.
    #[must_use]
    pub const fn slide_count(&self) -> usize {
        self.slides.len()
    }
}
