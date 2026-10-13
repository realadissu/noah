//! Strongly-typed identifiers ensuring compile-time safety across NOAH domain entities.

use serde::{Deserialize, Serialize};
use std::fmt;
use std::str::FromStr;
use uuid::Uuid;

use crate::error::NoahError;

fn deterministic_uuid_from_str(s: &str) -> Uuid {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};

    let mut h1 = DefaultHasher::new();
    s.hash(&mut h1);
    let part1 = h1.finish();

    let mut h2 = DefaultHasher::new();
    (s, "noah-deterministic-salt").hash(&mut h2);
    let part2 = h2.finish();

    let combined = (u128::from(part1) << 64) | u128::from(part2);
    Uuid::from_u128(combined)
}

/// Type-safe identifier for a Song entity.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize)]
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
        match Uuid::parse_str(s) {
            Ok(uuid) => Ok(Self(uuid)),
            Err(_) => Ok(Self(deterministic_uuid_from_str(s))),
        }
    }
}

impl<'de> Deserialize<'de> for SongId {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let s = String::deserialize(deserializer)?;
        match Uuid::parse_str(&s) {
            Ok(uuid) => Ok(Self(uuid)),
            Err(_) => Ok(Self(deterministic_uuid_from_str(&s))),
        }
    }
}

/// Type-safe identifier for a Slide entity.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize)]
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
        match Uuid::parse_str(s) {
            Ok(uuid) => Ok(Self(uuid)),
            Err(_) => Ok(Self(deterministic_uuid_from_str(s))),
        }
    }
}

impl<'de> Deserialize<'de> for SlideId {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let s = String::deserialize(deserializer)?;
        match Uuid::parse_str(&s) {
            Ok(uuid) => Ok(Self(uuid)),
            Err(_) => Ok(Self(deterministic_uuid_from_str(&s))),
        }
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
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize)]
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
        match Uuid::parse_str(s) {
            Ok(uuid) => Ok(Self(uuid)),
            Err(_) => Ok(Self(deterministic_uuid_from_str(s))),
        }
    }
}

impl<'de> Deserialize<'de> for ScheduleItemId {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let s = String::deserialize(deserializer)?;
        match Uuid::parse_str(&s) {
            Ok(uuid) => Ok(Self(uuid)),
            Err(_) => Ok(Self(deterministic_uuid_from_str(&s))),
        }
    }
}

/// Type-safe identifier for an entire Schedule (service plan).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize)]
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
        match Uuid::parse_str(s) {
            Ok(uuid) => Ok(Self(uuid)),
            Err(_) => Ok(Self(deterministic_uuid_from_str(s))),
        }
    }
}

impl<'de> Deserialize<'de> for ScheduleId {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let s = String::deserialize(deserializer)?;
        match Uuid::parse_str(&s) {
            Ok(uuid) => Ok(Self(uuid)),
            Err(_) => Ok(Self(deterministic_uuid_from_str(&s))),
        }
    }
}
