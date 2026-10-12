//! Robust encoding detection for legacy and modern `SongBeamer` (.sng) files.

/// UTF-8 Byte Order Mark (BOM).
pub const UTF8_BOM: [u8; 3] = [0xEF, 0xBB, 0xBF];

/// Encoding classification detected for the input.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DetectedEncoding {
    Utf8WithBom,
    Utf8,
    Windows1252,
}

/// Decodes raw bytes into a UTF-8 Rust `String` according to the `SNG_SPECIFICATION`:
/// 1. Check for UTF-8 BOM (`0xEF, 0xBB, 0xBF`). If present, strip BOM and parse as UTF-8.
/// 2. Attempt strict UTF-8 validation. If valid, parse as UTF-8.
/// 3. If UTF-8 validation fails (contains invalid UTF-8 byte sequences), decode using `encoding_rs::WINDOWS_1252`.
/// 4. Replace unmappable characters with `\u{FFFD}` without throwing errors.
#[must_use]
pub fn decode_sng_bytes(bytes: &[u8]) -> (String, DetectedEncoding) {
    if bytes.is_empty() {
        return (String::new(), DetectedEncoding::Utf8);
    }

    // Step 1: Check for UTF-8 BOM
    if bytes.starts_with(&UTF8_BOM) {
        if let Some(payload) = bytes.get(3..) {
            let (decoded, _) = encoding_rs::UTF_8.decode_without_bom_handling(payload);
            return (decoded.into_owned(), DetectedEncoding::Utf8WithBom);
        }
    }

    // Step 2: Attempt strict UTF-8 validation
    if let Ok(utf8_str) = std::str::from_utf8(bytes) {
        return (utf8_str.to_string(), DetectedEncoding::Utf8);
    }

    // Step 3 & 4: Decode as Windows-1252, replacing unmappable bytes with \u{FFFD}
    let (decoded, _) = encoding_rs::WINDOWS_1252.decode_without_bom_handling(bytes);
    (decoded.into_owned(), DetectedEncoding::Windows1252)
}
