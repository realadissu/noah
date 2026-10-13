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
    if note_to_semitone(root).is_none() {
        return None;
    }

    let suffix = main_part.get(root_len..)?;
    if !suffix.is_empty() && !is_valid_chord_suffix(suffix) {
        return None;
    }

    Some((root, suffix, bass_part))
}

fn is_valid_chord_suffix(suffix: &str) -> bool {
    let s = suffix.trim();
    if s.is_empty() || s.len() > 8 {
        return false;
    }
    let lower = s.to_ascii_lowercase();
    matches!(
        lower.as_str(),
        "m" | "min"
            | "maj"
            | "maj7"
            | "maj9"
            | "maj11"
            | "maj13"
            | "sus"
            | "sus2"
            | "sus4"
            | "dim"
            | "dim7"
            | "aug"
            | "add"
            | "add9"
            | "add2"
            | "add4"
            | "7"
            | "9"
            | "11"
            | "13"
            | "2"
            | "4"
            | "5"
            | "6"
            | "m7"
            | "m9"
            | "m11"
            | "m6"
            | "m7b5"
            | "7sus4"
            | "7b5"
            | "7#9"
            | "7b9"
            | "7#5"
            | "+"
            | "-"
            | "o"
            | "ø"
            | "°"
    ) || lower.starts_with('m')
        || lower.starts_with("maj")
        || lower.starts_with("sus")
        || lower.starts_with("dim")
        || lower.starts_with("aug")
        || lower.starts_with("add")
        || (lower.starts_with(|c: char| c.is_ascii_digit()) && lower.chars().all(|c| c.is_ascii_alphanumeric() || c == '#' || c == 'b' || c == '+' || c == '-'))
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

/// Transposes all bracketed chords (e.g. `[D]`, `[Am7/G]`) in `text` by `semitones`.
#[must_use]
pub fn transpose_text(text: &str, semitones: i32) -> String {
    if semitones == 0 {
        return text.to_string();
    }

    let mut result = String::with_capacity(text.len());
    let mut cursor = 0;
    let len = text.len();

    while cursor < len {
        if let Some(open_rel) = text.get(cursor..).and_then(|s| s.find('[')) {
            let open_pos = cursor + open_rel;
            if open_pos > cursor {
                if let Some(preceding) = text.get(cursor..open_pos) {
                    result.push_str(preceding);
                }
            }

            if let Some(close_rel) = text.get(open_pos..).and_then(|s| s.find(']')) {
                let close_pos = open_pos + close_rel;
                let chord_str = text.get(open_pos + 1..close_pos).unwrap_or("").trim();
                if !chord_str.is_empty() {
                    let transposed = transpose_chord(chord_str, semitones);
                    result.push('[');
                    result.push_str(&transposed);
                    result.push(']');
                } else {
                    result.push_str("[]");
                }
                cursor = close_pos + 1;
            } else {
                // Malformed / unclosed bracket: keep remaining
                if let Some(remaining) = text.get(open_pos..) {
                    result.push_str(remaining);
                }
                break;
            }
        } else {
            if let Some(remaining) = text.get(cursor..) {
                result.push_str(remaining);
            }
            break;
        }
    }

    result
}

/// Strips all bracketed chords (e.g. `[D]`) from `text`, leaving clean lyrics.
#[must_use]
pub fn strip_chords_from_text(text: &str) -> String {
    let mut result = String::with_capacity(text.len());
    let mut cursor = 0;
    let len = text.len();

    while cursor < len {
        if let Some(open_rel) = text.get(cursor..).and_then(|s| s.find('[')) {
            let open_pos = cursor + open_rel;
            if open_pos > cursor {
                if let Some(preceding) = text.get(cursor..open_pos) {
                    result.push_str(preceding);
                }
            }

            if let Some(close_rel) = text.get(open_pos..).and_then(|s| s.find(']')) {
                let close_pos = open_pos + close_rel;
                let inner = text.get(open_pos + 1..close_pos).unwrap_or("").trim();
                if parse_chord_parts(inner).is_some() {
                    // Skip chord
                } else {
                    // Non-chord bracket: keep as is
                    result.push('[');
                    result.push_str(inner);
                    result.push(']');
                }
                cursor = close_pos + 1;
            } else {
                if let Some(remaining) = text.get(open_pos..) {
                    result.push_str(remaining);
                }
                break;
            }
        } else {
            if let Some(remaining) = text.get(cursor..) {
                result.push_str(remaining);
            }
            break;
        }
    }

    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_transpose_text_basic_and_slash() {
        let input = "Jesus [D]deine Liebe [G/B]zieht uns [A]hin";
        let transposed = transpose_text(input, 2);
        assert_eq!(transposed, "Jesus [E]deine Liebe [A/C#]zieht uns [B]hin");
    }

    #[test]
    fn test_transpose_text_negative_semitones() {
        let input = "[C]Grosser [F]Gott [G]wir loben";
        let transposed = transpose_text(input, -2);
        assert_eq!(transposed, "[A#]Grosser [D#]Gott [F]wir loben");
    }

    #[test]
    fn test_transpose_text_zero_semitones_identity() {
        let input = "No change [Em7]here";
        assert_eq!(transpose_text(input, 0), input);
    }

    #[test]
    fn test_transpose_text_malformed_unclosed_bracket() {
        let input = "Text with [broken bracket and no end";
        assert_eq!(transpose_text(input, 2), input);
    }

    #[test]
    fn test_strip_chords_from_text() {
        let input = "Jesus, [D]deine Liebe [G]zieht uns hin zur [A]dir";
        assert_eq!(
            strip_chords_from_text(input),
            "Jesus, deine Liebe zieht uns hin zur dir"
        );
    }

    #[test]
    fn test_strip_chords_preserves_non_chord_brackets() {
        let input = "[Denn] heute [D]ist der Tag [1]";
        assert_eq!(strip_chords_from_text(input), "[Denn] heute ist der Tag [1]");
    }
}
