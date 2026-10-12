use noah_core::models::LyricToken;
use noah_parser::{parse_lyric_line, parse_sng_bytes, parse_sng_str, SngParseError};

#[test]
fn test_negative_empty_inputs() {
    assert_eq!(parse_sng_bytes(&[]), Err(SngParseError::EmptyInput));
    assert_eq!(parse_sng_str(""), Err(SngParseError::EmptyInput));
    assert_eq!(parse_sng_str("   \r\n  \t \n  "), Err(SngParseError::EmptyInput));
}

#[test]
fn test_negative_missing_title_tag() {
    let header_without_title = "#Author=Unknown\n#Key=C\n---\nSome lyrics without title";
    assert_eq!(
        parse_sng_str(header_without_title),
        Err(SngParseError::MissingTitle)
    );

    let empty_title = "#Title=   \n#Author=Test\n---\nLyrics";
    assert_eq!(
        parse_sng_str(empty_title),
        Err(SngParseError::MissingTitle)
    );

    let only_separators = "---\n---\n---";
    assert_eq!(
        parse_sng_str(only_separators),
        Err(SngParseError::MissingTitle)
    );
}

#[test]
fn test_corrupt_chord_brackets_never_panics() {
    // Unclosed bracket
    let unclosed = parse_lyric_line("This is an unclosed [Am bracket line", 0);
    assert_eq!(unclosed.tokens.len(), 2);
    assert_eq!(unclosed.tokens[0], LyricToken::text("This is an unclosed "));
    assert_eq!(unclosed.tokens[1], LyricToken::text("[Am bracket line"));

    // Empty bracket
    let empty_b = parse_lyric_line("Empty [] bracket", 0);
    assert_eq!(empty_b.to_audience_string(), "Empty  bracket");

    // Consecutive and nested brackets
    let nested = parse_lyric_line("[[C]]Double brackets", 0);
    // Should parse cleanly without panic
    assert!(!nested.tokens.is_empty());

    // Unmatched closing bracket
    let unmatched_close = parse_lyric_line("Text without open ] but with text", 0);
    assert_eq!(unmatched_close.to_audience_string(), "Text without open ] but with text");
}

#[test]
fn test_corrupt_metadata_tags_graceful_degradation() {
    let corrupt_tags = r#"#Title=Resilience Anthem
#Transpose=NotAnInteger
#Speed=ImpossibleBpm
#FontSize=-999999999999999999999999999999999999
#CustomTag=RetainedValue
#NoEqualsTag
---
Slide 1 content
"#;

    let song = parse_sng_str(corrupt_tags).expect("Parser should gracefully ignore invalid numeric tags");
    assert_eq!(song.metadata.title, "Resilience Anthem");
    assert_eq!(song.metadata.transpose, None);
    assert_eq!(song.metadata.speed, None);
    assert_eq!(song.metadata.font_size, None);
    assert_eq!(
        song.metadata.custom_tags.get("CustomTag").map(String::as_str),
        Some("RetainedValue")
    );
    assert!(song.metadata.custom_tags.contains_key("NoEqualsTag"));
}

#[test]
fn test_consecutive_separators_and_trailing_whitespace() {
    let file = "#Title=Separator Test\n---\n---\nLine 1\n---\n---\n---\nLine 2\n---\n";
    let song = parse_sng_str(file).expect("Consecutive separators must not cause indexing panics");
    assert_eq!(song.slides.len(), 2);
    assert_eq!(song.slides[0].lines[0].to_audience_string(), "Line 1");
    assert_eq!(song.slides[1].lines[0].to_audience_string(), "Line 2");
}

#[test]
fn test_fault_injection_random_binary_fuzzing() {
    // Generate deterministic pseudo-random binary inputs with chaotic byte distributions
    let mut seed: u64 = 0xDEAD_BEEF_CAFE_BABE;
    let mut rng = move || {
        seed = seed.wrapping_mul(6364136223846793005).wrapping_add(1442695040888963407);
        (seed >> 32) as u32
    };

    for test_idx in 0..100 {
        let len = (rng() % 512) as usize;
        let mut noise = Vec::with_capacity(len);
        for _ in 0..len {
            noise.push((rng() % 256) as u8);
        }

        // Must never panic!
        let result = parse_sng_bytes(&noise);
        // Either parses if title accidentally matched or cleanly returns Err
        match result {
            Ok(song) => {
                assert!(!song.metadata.title.is_empty(), "Iter {test_idx}: If OK, title must not be empty");
            }
            Err(err) => {
                assert!(
                    err == SngParseError::EmptyInput || err == SngParseError::MissingTitle,
                    "Iter {test_idx}: Unexpected error variant: {err:?}"
                );
            }
        }
    }
}

#[test]
fn test_oversized_stress_input() {
    // Construct a large input with 10,000 lines
    let mut large = String::from("#Title=Stress Test Song\n---\n");
    for i in 0..10_000 {
        large.push_str(&format!("[G]Line {i} with some lyrics and chords [D]\n"));
    }

    let song = parse_sng_str(&large).expect("Stress test must parse without stack overflow");
    assert_eq!(song.slides.len(), 1);
    assert_eq!(song.slides[0].lines.len(), 10_000);
}
