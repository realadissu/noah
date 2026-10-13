//! `SongBeamer` (.sng) file format parser.

use std::collections::BTreeMap;

use noah_core::models::{
    LyricLine, SectionType, Slide, SlideIndex, Song, SongMetadata,
};

use crate::chordpro::parse_lyric_line;
use crate::encoding::{decode_sng_bytes, DetectedEncoding};
use crate::error::SngParseError;

/// Result of parsing an SNG file, including metadata on the detected encoding.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SngParseOutput {
    pub song: Song,
    pub detected_encoding: DetectedEncoding,
}

/// Parses raw `.sng` file bytes into a `Song` domain model.
///
/// Guaranteed panic-free on arbitrary binary, corrupt, or truncated input.
///
/// # Errors
/// Returns `SngParseError::EmptyInput` if the byte slice is empty.
/// Returns `SngParseError::MissingTitle` if no non-empty `#Title=` header tag is present.
pub fn parse_sng_bytes(bytes: &[u8]) -> Result<Song, SngParseError> {
    parse_sng_bytes_with_info(bytes).map(|out| out.song)
}

/// Parses raw `.sng` file bytes into a `Song` domain model and returns the detected encoding.
///
/// # Errors
/// Returns `SngParseError::EmptyInput` if input is empty or whitespace-only.
/// Returns `SngParseError::MissingTitle` if the title header is missing or empty.
pub fn parse_sng_bytes_with_info(bytes: &[u8]) -> Result<SngParseOutput, SngParseError> {
    if bytes.is_empty() {
        return Err(SngParseError::EmptyInput);
    }

    let (decoded, detected_encoding) = decode_sng_bytes(bytes);
    let song = parse_sng_str(&decoded)?;

    Ok(SngParseOutput {
        song,
        detected_encoding,
    })
}

/// Parses a decoded string into a `Song` domain model.
///
/// # Errors
/// Returns `SngParseError::EmptyInput` if input is empty or whitespace-only.
/// Returns `SngParseError::MissingTitle` if the title header is missing or empty.
pub fn parse_sng_str(content: &str) -> Result<Song, SngParseError> {
    let trimmed = content.trim();
    if trimmed.is_empty() {
        return Err(SngParseError::EmptyInput);
    }

    let lines: Vec<&str> = content
        .lines()
        .map(|l| l.trim_end_matches('\r'))
        .collect();

    let mut metadata = SongMetadata::default();
    let mut custom_tags = BTreeMap::new();
    let mut header_complete = false;
    let mut slide_blocks: Vec<Vec<&str>> = Vec::new();
    let mut current_slide_lines: Vec<&str> = Vec::new();

    for line in lines {
        let trimmed_line = line.trim();

        if header_complete {
            // In slide processing phase
            if trimmed_line == "---" || trimmed_line == "--" {
                if !current_slide_lines.is_empty() {
                    slide_blocks.push(std::mem::take(&mut current_slide_lines));
                }
            } else {
                current_slide_lines.push(line);
            }
        } else {
            if trimmed_line == "---" {
                // First separator indicates transition from header to slides
                header_complete = true;
                continue;
            }

            if let Some(stripped) = trimmed_line.strip_prefix('#') {
                if let Some((key, val)) = stripped.split_once('=') {
                    let key = key.trim();
                    let val = val.trim();
                    apply_header_tag(&mut metadata, &mut custom_tags, key, val);
                } else {
                    custom_tags.insert(stripped.trim().to_string(), String::new());
                }
                continue;
            }

            // If non-empty line doesn't start with '#', headers are implicitly done
            if !trimmed_line.is_empty() {
                header_complete = true;
                current_slide_lines.push(line);
            }
        }
    }

    if !current_slide_lines.is_empty() {
        slide_blocks.push(current_slide_lines);
    }

    metadata.custom_tags = custom_tags;

    if metadata.title.trim().is_empty() {
        return Err(SngParseError::MissingTitle);
    }

    // Convert slide blocks into Slide models
    let mut slides = Vec::new();
    for (idx, block) in slide_blocks.into_iter().enumerate() {
        if block.is_empty() {
            continue;
        }

        let mut block_iter = block.into_iter();
        let first_line = block_iter.next().unwrap_or("");

        let (section, label, remaining_lines) = if is_section_header(first_line) {
            let sec = SectionType::from_tag(first_line);
            let lbl = sec.display_label();
            (Some(sec), lbl, block_iter.collect::<Vec<_>>())
        } else {
            let mut all_lines = vec![first_line];
            all_lines.extend(block_iter);
            (None, format!("Slide {}", idx + 1), all_lines)
        };

        let lyric_lines: Vec<LyricLine> = remaining_lines
            .iter()
            .map(|l| parse_lyric_line(l, 0))
            .collect();

        let raw_content = remaining_lines.join("\n");

        slides.push(Slide::new(
            SlideIndex::new(idx),
            section,
            label,
            lyric_lines,
            raw_content,
        ));
    }

    let mut song = Song::new(metadata, slides);
    song.raw_format = Some("sng".to_string());

    Ok(song)
}

fn apply_header_tag(
    meta: &mut SongMetadata,
    custom: &mut BTreeMap<String, String>,
    key: &str,
    val: &str,
) {
    match key.to_ascii_lowercase().as_str() {
        "title" => meta.title = val.to_string(),
        "titlelang2" => meta.title_lang2 = Some(val.to_string()),
        "author" => meta.author = Some(val.to_string()),
        "copyright" => meta.copyright = Some(val.to_string()),
        "ccli" => meta.ccli = Some(val.to_string()),
        "transpose" => meta.transpose = val.parse::<i32>().ok(),
        "speed" => meta.speed = val.parse::<u32>().ok(),
        "key" => meta.musical_key = Some(val.to_string()),
        "fontsize" => meta.font_size = val.parse::<u32>().ok(),
        "format" => {
            meta.verse_order = val
                .split(',')
                .map(str::trim)
                .filter(|s| !s.is_empty())
                .map(String::from)
                .collect();
        }
        "langcount" => {
            if let Ok(c) = val.parse::<u32>() {
                meta.lang_count = c;
            }
        }
        _ => {
            custom.insert(key.to_string(), val.to_string());
        }
    }
}

fn is_section_header(line: &str) -> bool {
    let t = line.trim();
    if t.starts_with("$$M=") {
        return true;
    }

    let lower = t.to_lowercase();
    lower.starts_with("vers ")
        || lower.starts_with("verse ")
        || lower.starts_with("strophe ")
        || lower.starts_with("refrain")
        || lower.starts_with("chorus")
        || lower.starts_with("bridge")
        || lower.starts_with("pre-chorus")
        || lower.starts_with("intro")
        || lower.starts_with("outro")
        || lower.starts_with("coda")
}
