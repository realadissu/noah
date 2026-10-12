//! NOAH Core library containing domain models, errors, and shared logic.

#![warn(clippy::all, clippy::pedantic, clippy::nursery)]
#![allow(clippy::module_name_repetitions)]

pub mod error;
pub mod models;
pub mod storage;

pub use error::{NoahError, NoahResult};
pub use models::*;
pub use storage::{SongDatabase, SongSearchResult};
