//! Chord token parsing and musical transposition engine.

use noah_core::models::{LyricLine, LyricToken};

/// Chromatic scale representations for pitch transposition.
const SHARP_NOTES: [&str; 12] = [
    "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
];
const FLAT_NOTES: [&str; 12] = [
    "C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B",
];

/// Normalizes note names (including German H/B notation).
#[must_use]
pub fn note_to_semitone(note: &str) -> Option<usize> {
    match note {
        "C" | "B#" => Some(0),
        "C#" | "Db" => Some(1),
        "D" => Some(2),
        "D#" | "Eb" => Some(3),
        "E" | "Fb" => Some(4),
        "F" | "E#" => Some(5),
        "F#" | "Gb" => Some(6),
        "G" => Some(7),
        "G#" | "Ab" => Some(8),
        "A" => Some(9),
        "A#" | "Bb" | "B" if note == "B" => Some(11), // In international notation, B is 11, Bb is 10
        "A#" | "Bb" | "Hb" => Some(10),
        "H" => Some(11), // German H is B natural (11)
        _ => None,
    }
}

/// Transposes a single musical root note by the given semitone offset.
#[must_use]
pub fn transpose_root_note(root: &str, semitones: i32, prefer_flats: bool) -> Option<String> {
    let current_semitone = note_to_semitone(root)?;
    let offset = usize::try_from(semitones.rem_euclid(12)).unwrap_or(0);
    let target_index = (current_semitone + offset) % 12;

    let target_table = if prefer_flats {
        &FLAT_NOTES
    } else {
        &SHARP_NOTES
    };

    target_table.get(target_index).map(|s| (*s).to_string())
}

/// Splits a chord into root note, qualifier/suffix (e.g., "m", "7", "sus4"), and optional bass slash (e.g., "/F#").
#[must_use]
pub fn parse_chord_parts(chord: &str) -> Option<(&str, &str, Option<&str>)> {
    let trimmed = chord.trim();
    if trimmed.is_empty() {
        return None;
    }

    let (main_part, bass_part) = match trimmed.split_once('/') {
        Some((m, b)) => (m.trim(), Some(b.trim())),
        None => (trimmed, None),
    };

    if main_part.is_empty() {
        return None;
    }

    // Identify root length (e.g. "C#" vs "C")
    let mut chars = main_part.chars();
    let first = chars.next()?;
    if !first.is_ascii_alphabetic() {
        return None;
    }

    let root_len = chars.next().map_or(1, |second| {
        if second == '#' || second == 'b' {
            2
        } else {
            1
        }
    });

    let root = main_part.get(..root_len)?;
    let suffix = main_part.get(root_len..)?;

    Some((root, suffix, bass_part))
}

/// Transposes an entire chord string (e.g., "D", "Am7", "F#/Bb") by `semitones`.
#[must_use]
pub fn transpose_chord(chord: &str, semitones: i32) -> String {
    if semitones == 0 {
        return chord.to_string();
    }

    let Some((root, suffix, bass_part)) = parse_chord_parts(chord) else {
        return chord.to_string();
    };

    let prefer_flats = root.contains('b') || bass_part.is_some_and(|b| b.contains('b'));

    let Some(new_root) = transpose_root_note(root, semitones, prefer_flats) else {
        return chord.to_string();
    };

    let new_bass = bass_part.map_or_else(String::new, |bass| {
        let bass_prefer_flats = bass.contains('b') || prefer_flats;
        transpose_root_note(bass, semitones, bass_prefer_flats)
            .map_or_else(|| format!("/{bass}"), |b| format!("/{b}"))
    });

    format!("{new_root}{suffix}{new_bass}")
}

/// Parses an inline lyric line with optional bracketed chords `[Am]Lyric text` into `LyricToken`s.
#[must_use]
pub fn parse_lyric_line(raw_line: &str, language_index: u8) -> LyricLine {
    let mut tokens = Vec::new();
    let mut cursor = 0;
    let bytes = raw_line.as_bytes();
    let len = bytes.len();

    while cursor < len {
        if let Some(open_rel) = raw_line.get(cursor..).and_then(|s| s.find('[')) {
            let open_pos = cursor + open_rel;
            // Preceding text before '['
            if open_pos > cursor {
                if let Some(preceding) = raw_line.get(cursor..open_pos) {
                    if !preceding.is_empty() {
                        tokens.push(LyricToken::text(preceding));
                    }
                }
            }

            // Find closing ']'
            if let Some(close_rel) = raw_line.get(open_pos..).and_then(|s| s.find(']')) {
                let close_pos = open_pos + close_rel;
                let chord_str = raw_line
                    .get(open_pos + 1..close_pos)
                    .unwrap_or("")
                    .trim();

                cursor = close_pos + 1;

                // Find text until next '[' or line end
                let next_open_rel = raw_line.get(cursor..).and_then(|s| s.find('['));
                let text_end = next_open_rel.map_or(len, |rel| cursor + rel);

                let attached_text = raw_line.get(cursor..text_end).unwrap_or("");
                cursor = text_end;

                if chord_str.is_empty() {
                    if !attached_text.is_empty() {
                        tokens.push(LyricToken::text(attached_text));
                    }
                } else if attached_text.is_empty() {
                    tokens.push(LyricToken::chord(chord_str));
                } else {
                    tokens.push(LyricToken::chord_and_text(chord_str, attached_text));
                }
            } else {
                // Malformed: unclosed '[': treat remaining slice as plain text safely
                if let Some(remaining) = raw_line.get(open_pos..) {
                    tokens.push(LyricToken::text(remaining));
                }
                break;
            }
        } else {
            // No brackets found, consume remaining line
            if let Some(remaining) = raw_line.get(cursor..) {
                if !remaining.is_empty() {
                    tokens.push(LyricToken::text(remaining));
                }
            }
            break;
        }
    }

    LyricLine::new(tokens, raw_line.to_string(), language_index)
}
