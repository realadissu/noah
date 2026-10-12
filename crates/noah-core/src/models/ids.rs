//! Strongly-typed identifiers ensuring compile-time safety across NOAH domain entities.

use serde::{Deserialize, Serialize};
use std::fmt;
use std::str::FromStr;
use uuid::Uuid;

use crate::error::NoahError;

/// Type-safe identifier for a Song entity.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(transparent)]
pub struct SongId(pub Uuid);

impl SongId {
    /// Generates a new random `SongId` (v4).
    #[must_use]
    pub fn new() -> Self {
        Self(Uuid::new_v4())
    }
}

impl Default for SongId {
    fn default() -> Self {
        Self::new()
    }
}

impl fmt::Display for SongId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl FromStr for SongId {
    type Err = NoahError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Uuid::parse_str(s)
            .map(Self)
            .map_err(|e| NoahError::InvalidIdentifier(format!("Invalid SongId '{s}': {e}")))
    }
}

/// Type-safe identifier for a Slide entity.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(transparent)]
pub struct SlideId(pub Uuid);

impl SlideId {
    /// Generates a new random `SlideId` (v4).
    #[must_use]
    pub fn new() -> Self {
        Self(Uuid::new_v4())
    }
}

impl Default for SlideId {
    fn default() -> Self {
        Self::new()
    }
}

impl fmt::Display for SlideId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl FromStr for SlideId {
    type Err = NoahError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Uuid::parse_str(s)
            .map(Self)
            .map_err(|e| NoahError::InvalidIdentifier(format!("Invalid SlideId '{s}': {e}")))
    }
}

/// Type-safe index for slide positions within a presentation or song.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Default, Serialize, Deserialize)]
#[serde(transparent)]
pub struct SlideIndex(pub usize);

impl SlideIndex {
    #[must_use]
    pub const fn new(index: usize) -> Self {
        Self(index)
    }

    #[must_use]
    pub const fn value(self) -> usize {
        self.0
    }
}

impl fmt::Display for SlideIndex {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

/// Type-safe identifier for an item in a schedule (order of service).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(transparent)]
pub struct ScheduleItemId(pub Uuid);

impl ScheduleItemId {
    /// Generates a new random `ScheduleItemId` (v4).
    #[must_use]
    pub fn new() -> Self {
        Self(Uuid::new_v4())
    }
}

impl Default for ScheduleItemId {
    fn default() -> Self {
        Self::new()
    }
}

impl fmt::Display for ScheduleItemId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl FromStr for ScheduleItemId {
    type Err = NoahError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Uuid::parse_str(s)
            .map(Self)
            .map_err(|e| NoahError::InvalidIdentifier(format!("Invalid ScheduleItemId '{s}': {e}")))
    }
}

/// Type-safe identifier for an entire Schedule (service plan).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(transparent)]
pub struct ScheduleId(pub Uuid);

impl ScheduleId {
    /// Generates a new random `ScheduleId` (v4).
    #[must_use]
    pub fn new() -> Self {
        Self(Uuid::new_v4())
    }
}

impl Default for ScheduleId {
    fn default() -> Self {
        Self::new()
    }
}

impl fmt::Display for ScheduleId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl FromStr for ScheduleId {
    type Err = NoahError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Uuid::parse_str(s)
            .map(Self)
            .map_err(|e| NoahError::InvalidIdentifier(format!("Invalid ScheduleId '{s}': {e}")))
    }
}
