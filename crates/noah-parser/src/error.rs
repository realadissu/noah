//! Error types for `SongBeamer` (.sng) and `ChordPro` parsing.

use thiserror::Error;

/// Typified parse error for `.sng` file operations.
#[derive(Debug, Error, PartialEq, Eq)]
pub enum SngParseError {
    #[error("Empty input: the provided .sng content contains no data")]
    EmptyInput,

    #[error("Missing title tag: song header must contain a non-empty #Title= tag")]
    MissingTitle,

    #[error("Character decoding failure: {0}")]
    DecodingFailure(String),

    #[error("Malformed header line: {0}")]
    MalformedHeader(String),

    #[error("Invalid slide structure: {0}")]
    InvalidSlide(String),

    #[error("File I/O error: {0}")]
    Io(String),
}
