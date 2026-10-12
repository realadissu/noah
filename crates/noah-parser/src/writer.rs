//! Serialization and export of `Song` models back to `SongBeamer` (.sng) format.

use std::fmt::Write;

use noah_core::models::{LyricToken, SectionType, Song};

/// Serializes a `Song` domain model into standard `SongBeamer` .sng format.
#[must_use]
pub fn serialize_sng(song: &Song) -> String {
    let mut out = String::new();

    // 1. Mandatory & standard metadata header tags
    let _ = writeln!(out, "#Title={}", song.metadata.title);

    if let Some(author) = &song.metadata.author {
        let _ = writeln!(out, "#Author={author}");
    }

    if let Some(key) = &song.metadata.musical_key {
        let _ = writeln!(out, "#Key={key}");
    }

    if let Some(ccli) = &song.metadata.ccli {
        let _ = writeln!(out, "#CCLI={ccli}");
    }

    if let Some(copyright) = &song.metadata.copyright {
        let _ = writeln!(out, "#Copyright={copyright}");
    }

    if let Some(transpose) = song.metadata.transpose {
        let _ = writeln!(out, "#Transpose={transpose}");
    }

    if let Some(speed) = song.metadata.speed {
        let _ = writeln!(out, "#Speed={speed}");
    }

    if let Some(font_size) = song.metadata.font_size {
        let _ = writeln!(out, "#FontSize={font_size}");
    }

    if !song.metadata.verse_order.is_empty() {
        let _ = writeln!(out, "#Format={}", song.metadata.verse_order.join(","));
    }

    if song.metadata.lang_count > 1 {
        let _ = writeln!(out, "#LangCount={}", song.metadata.lang_count);
    }

    if let Some(lang2) = &song.metadata.title_lang2 {
        let _ = writeln!(out, "#TitleLang2={lang2}");
    }

    // Custom / additional metadata tags
    for (k, v) in &song.metadata.custom_tags {
        if v.is_empty() {
            let _ = writeln!(out, "#{k}");
        } else {
            let _ = writeln!(out, "#{k}={v}");
        }
    }

    // 2. Slides
    for slide in &song.slides {
        out.push_str("---\n");

        // Section tag (e.g. $$M=Refrain or $$M=Vers 1)
        if let Some(section) = &slide.section {
            let section_str = match section {
                SectionType::Verse(n) => format!("$$M=Vers {n}"),
                SectionType::Chorus(Some(n)) => format!("$$M=Refrain {n}"),
                SectionType::Chorus(None) => "$$M=Refrain".to_string(),
                SectionType::PreChorus(Some(n)) => format!("$$M=Pre-Chorus {n}"),
                SectionType::PreChorus(None) => "$$M=Pre-Chorus".to_string(),
                SectionType::Bridge(Some(n)) => format!("$$M=Bridge {n}"),
                SectionType::Bridge(None) => "$$M=Bridge".to_string(),
                SectionType::Intro => "$$M=Intro".to_string(),
                SectionType::Outro => "$$M=Outro".to_string(),
                SectionType::Coda => "$$M=Coda".to_string(),
                SectionType::Interlude => "$$M=Interlude".to_string(),
                SectionType::Ending => "$$M=Ending".to_string(),
                SectionType::Custom(c) => format!("$$M={c}"),
            };
            let _ = writeln!(out, "{section_str}");
        }

        // Slide lines
        for line in &slide.lines {
            if line.tokens.is_empty() {
                let _ = writeln!(out, "{}", line.raw_text);
            } else {
                let mut line_str = String::new();
                for token in &line.tokens {
                    match token {
                        LyricToken::Text { text } => line_str.push_str(text),
                        LyricToken::Chord { chord } => {
                            let _ = write!(line_str, "[{chord}]");
                        }
                        LyricToken::ChordAndText { chord, text } => {
                            let _ = write!(line_str, "[{chord}]{text}");
                        }
                    }
                }
                let _ = writeln!(out, "{line_str}");
            }
        }
    }

    out
}

/// Serializes a `Song` into UTF-8 bytes with an optional UTF-8 BOM.
#[must_use]
pub fn serialize_sng_utf8(song: &Song, include_bom: bool) -> Vec<u8> {
    let s = serialize_sng(song);
    let mut bytes = Vec::new();
    if include_bom {
        bytes.extend_from_slice(&crate::encoding::UTF8_BOM);
    }
    bytes.extend_from_slice(s.as_bytes());
    bytes
}
