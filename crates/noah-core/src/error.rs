//! Typified error structures for NOAH core operations.

use thiserror::Error;

/// Canonical result type used across `noah-core`.
pub type NoahResult<T> = Result<T, NoahError>;

/// Domain-specific errors for NOAH.
#[derive(Debug, Error)]
pub enum NoahError {
    #[error("Identifier parse error: {0}")]
    InvalidIdentifier(String),

    #[error("Validation failed: {0}")]
    Validation(String),

    #[error("Item not found: {0}")]
    NotFound(String),

    #[error("Out of bounds access: index {index} is invalid for collection of length {length}")]
    OutOfBounds { index: usize, length: usize },

    #[error("Serialization error: {0}")]
    Serialization(String),

    #[error("Deserialization error: {0}")]
    Deserialization(String),

    #[error("I/O error: {0}")]
    Io(String),

    #[error("Parser error: {0}")]
    Parser(String),

    #[error("State conflict: {0}")]
    StateConflict(String),

    #[error("Database error: {0}")]
    Database(String),

    #[error("Unsupported operation: {0}")]
    Unsupported(String),
}
