//! Slide models and tokenized lyric representation.

use serde::{Deserialize, Serialize};

use super::ids::{SlideId, SlideIndex};

/// Structural section classification for song parts.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(tag = "type", content = "value")]
pub enum SectionType {
    Verse(u32),
    Chorus(Option<u32>),
    PreChorus(Option<u32>),
    Bridge(Option<u32>),
    Intro,
    Outro,
    Coda,
    Interlude,
    Ending,
    Custom(String),
}

impl SectionType {
    /// Helper to parse section markers typically found in `SongBeamer` or `ChordPro` headers/separators.
    #[must_use]
    pub fn from_tag(tag: &str) -> Self {
        let clean = tag
            .trim()
            .trim_start_matches("$$M=")
            .trim_start_matches('#')
            .trim();

        let lower = clean.to_lowercase();
        if lower.starts_with("vers ") || lower.starts_with("verse ") || lower.starts_with("strophe ") {
            let num_str = clean
                .split_whitespace()
                .nth(1)
                .unwrap_or_default();
            if let Ok(num) = num_str.parse::<u32>() {
                return Self::Verse(num);
            }
            return Self::Verse(1);
        } else if lower.starts_with("refrain") || lower.starts_with("chorus") || lower == "chor" {
            let num_str = clean.split_whitespace().nth(1);
            let num = num_str.and_then(|s| s.parse::<u32>().ok());
            return Self::Chorus(num);
        } else if lower.starts_with("pre-chorus") || lower.starts_with("prechorus") {
            let num_str = clean.split_whitespace().nth(1);
            let num = num_str.and_then(|s| s.parse::<u32>().ok());
            return Self::PreChorus(num);
        } else if lower.starts_with("bridge") {
            let num_str = clean.split_whitespace().nth(1);
            let num = num_str.and_then(|s| s.parse::<u32>().ok());
            return Self::Bridge(num);
        } else if lower == "intro" {
            return Self::Intro;
        } else if lower == "outro" {
            return Self::Outro;
        } else if lower == "coda" {
            return Self::Coda;
        } else if lower == "interlude" || lower == "zwischenspiel" {
            return Self::Interlude;
        } else if lower == "ending" || lower == "schluss" {
            return Self::Ending;
        }

        Self::Custom(clean.to_string())
    }

    /// User-friendly display label (in English).
    #[must_use]
    pub fn display_label(&self) -> String {
        match self {
            Self::Verse(n) => format!("Verse {n}"),
            Self::Chorus(Some(n)) => format!("Chorus {n}"),
            Self::Chorus(None) => "Chorus".to_string(),
            Self::PreChorus(Some(n)) => format!("Pre-Chorus {n}"),
            Self::PreChorus(None) => "Pre-Chorus".to_string(),
            Self::Bridge(Some(n)) => format!("Bridge {n}"),
            Self::Bridge(None) => "Bridge".to_string(),
            Self::Intro => "Intro".to_string(),
            Self::Outro => "Outro".to_string(),
            Self::Coda => "Coda".to_string(),
            Self::Interlude => "Interlude".to_string(),
            Self::Ending => "Ending".to_string(),
            Self::Custom(c) => c.clone(),
        }
    }
}

/// Tokenized element inside a line of lyrics.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "kind")]
pub enum LyricToken {
    Text { text: String },
    Chord { chord: String },
    ChordAndText { chord: String, text: String },
}

impl LyricToken {
    #[must_use]
    pub fn text(t: impl Into<String>) -> Self {
        Self::Text { text: t.into() }
    }

    #[must_use]
    pub fn chord(c: impl Into<String>) -> Self {
        Self::Chord { chord: c.into() }
    }

    #[must_use]
    pub fn chord_and_text(c: impl Into<String>, t: impl Into<String>) -> Self {
        Self::ChordAndText {
            chord: c.into(),
            text: t.into(),
        }
    }

    /// Returns the text content only (stripping chord notation), for presentation to congregation.
    #[must_use]
    pub const fn audience_text(&self) -> &str {
        match self {
            Self::Text { text } | Self::ChordAndText { text, .. } => text.as_str(),
            Self::Chord { .. } => "",
        }
    }

    /// Returns the chord if one exists.
    #[must_use]
    pub const fn chord_name(&self) -> Option<&str> {
        match self {
            Self::Chord { chord } | Self::ChordAndText { chord, .. } => Some(chord.as_str()),
            Self::Text { .. } => None,
        }
    }
}

/// A single rendered line within a slide, supporting chords and multi-language lyrics.
#[derive(Debug, Clone, PartialEq, Eq, Default, Serialize, Deserialize)]
pub struct LyricLine {
    pub tokens: Vec<LyricToken>,
    pub raw_text: String,
    pub language_index: u8,
}

impl LyricLine {
    #[must_use]
    pub const fn new(tokens: Vec<LyricToken>, raw_text: String, language_index: u8) -> Self {
        Self {
            tokens,
            raw_text,
            language_index,
        }
    }

    /// Assembles the plain audience text by joining token texts.
    #[must_use]
    pub fn to_audience_string(&self) -> String {
        let mut result = String::new();
        for token in &self.tokens {
            result.push_str(token.audience_text());
        }
        result
    }
}

/// A presentation slide containing formatted lines, section classification, and an index.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Slide {
    pub id: SlideId,
    pub index: SlideIndex,
    pub section: Option<SectionType>,
    pub label: String,
    pub lines: Vec<LyricLine>,
    pub raw_content: String,
}

impl Slide {
    #[must_use]
    pub fn new(
        index: SlideIndex,
        section: Option<SectionType>,
        label: String,
        lines: Vec<LyricLine>,
        raw_content: String,
    ) -> Self {
        Self {
            id: SlideId::new(),
            index,
            section,
            label,
            lines,
            raw_content,
        }
    }

    /// Extracts audience-safe text representation (joining lines with newlines, chords stripped).
    #[must_use]
    pub fn audience_content(&self) -> String {
        self.lines
            .iter()
            .map(LyricLine::to_audience_string)
            .collect::<Vec<_>>()
            .join("\n")
    }
}
