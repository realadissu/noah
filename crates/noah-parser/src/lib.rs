//! `SongBeamer` (.sng) and `ChordPro` parser for NOAH.

#![warn(clippy::all, clippy::pedantic, clippy::nursery)]
#![allow(clippy::module_name_repetitions)]

pub mod chordpro;
pub mod encoding;
pub mod error;
pub mod sng;
pub mod writer;

pub use chordpro::{parse_chord_parts, parse_lyric_line, transpose_chord, transpose_root_note};
pub use encoding::{decode_sng_bytes, DetectedEncoding, UTF8_BOM};
pub use error::SngParseError;
pub use sng::{parse_sng_bytes, parse_sng_bytes_with_info, parse_sng_str, SngParseOutput};
pub use writer::{serialize_sng, serialize_sng_utf8};
