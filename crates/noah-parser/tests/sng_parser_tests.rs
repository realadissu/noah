use noah_core::models::{LyricToken, SectionType, SlideIndex};
use noah_parser::{
    parse_sng_bytes_with_info, parse_sng_str, transpose_chord, DetectedEncoding, UTF8_BOM,
};

const REFERENCE_SNG: &str = r#"#Title=Lobe den Herrn, meine Seele
#Author=Norbert Kissel
#Key=D
#Format=Refrain,Vers 1,Refrain,Vers 2
---
$$M=Refrain
[D]Lobe den Herrn, [G]meine Seele,
und [A]alles in mir seinen [D]heiligen Namen.
[D]Lobe den Herrn, [G]meine Seele,
und [A]vergiss nicht, was er dir [D]Gutes getan.
---
$$M=Vers 1
Der dir [Em]alle deine [A]Sünden vergibt
und [F#m]heilet alle deine [Bm]Gebrechen,
der dein [Em]Leben vom Ver[A]derben erlöst,
der dich [G]krönet mit Gnade und [A]Barmherzigkeit.
---
$$M=Vers 2
Der deinen [Em]Mund fröhlich [A]macht,
und du wieder [F#m]jung wirst wie ein [Bm]Adler.
Der Herr [Em]schafft Ge[A]rechtigkeit
und Ge[G]richt allen, die Ge[A]walt leiden.
"#;

#[test]
fn test_parse_reference_sng_file() {
    let song = parse_sng_str(REFERENCE_SNG).expect("Valid reference SNG should parse successfully");

    // Verify metadata
    assert_eq!(song.metadata.title, "Lobe den Herrn, meine Seele");
    assert_eq!(song.metadata.author, Some("Norbert Kissel".to_string()));
    assert_eq!(song.metadata.musical_key, Some("D".to_string()));
    assert_eq!(
        song.metadata.verse_order,
        vec!["Refrain", "Vers 1", "Refrain", "Vers 2"]
    );

    // Verify slides
    assert_eq!(song.slides.len(), 3);

    // Slide 1: Refrain
    let refrain = &song.slides[0];
    assert_eq!(refrain.index, SlideIndex::new(0));
    assert_eq!(refrain.section, Some(SectionType::Chorus(None)));
    assert_eq!(refrain.label, "Chorus");
    assert_eq!(refrain.lines.len(), 4);

    // Check first line tokenization: [D]Lobe den Herrn, [G]meine Seele,
    let first_line = &refrain.lines[0];
    assert_eq!(
        first_line.tokens,
        vec![
            LyricToken::chord_and_text("D", "Lobe den Herrn, "),
            LyricToken::chord_and_text("G", "meine Seele,"),
        ]
    );

    // Audience projection text should strip chords
    assert_eq!(
        first_line.to_audience_string(),
        "Lobe den Herrn, meine Seele,"
    );

    // Slide 2: Vers 1
    let vers1 = &song.slides[1];
    assert_eq!(vers1.index, SlideIndex::new(1));
    assert_eq!(vers1.section, Some(SectionType::Verse(1)));
    assert_eq!(vers1.label, "Verse 1");

    // Slide 3: Vers 2
    let vers2 = &song.slides[2];
    assert_eq!(vers2.index, SlideIndex::new(2));
    assert_eq!(vers2.section, Some(SectionType::Verse(2)));
    assert_eq!(vers2.label, "Verse 2");
}

#[test]
fn test_utf8_with_bom_handling() {
    let mut bom_bytes = Vec::new();
    bom_bytes.extend_from_slice(&UTF8_BOM);
    bom_bytes.extend_from_slice(b"#Title=Gott ist gro\xC3\x9F\n---\nRefrain\n[G]Halleluja");

    let output = parse_sng_bytes_with_info(&bom_bytes)
        .expect("UTF-8 with BOM should be detected and parsed");

    assert_eq!(output.detected_encoding, DetectedEncoding::Utf8WithBom);
    assert_eq!(output.song.metadata.title, "Gott ist groß");
    assert_eq!(output.song.slides.len(), 1);
    assert_eq!(output.song.slides[0].lines[0].to_audience_string(), "Halleluja");
}

#[test]
fn test_windows_1252_legacy_encoding_with_umlauts() {
    // In Windows-1252 / ISO-8859-1:
    // 'ä' = 0xE4, 'ö' = 0xF6, 'ü' = 0xFC, 'ß' = 0xDF
    let raw_win1252: Vec<u8> = vec![
        0x23, 0x54, 0x69, 0x74, 0x6C, 0x65, 0x3D, 0x47, 0x72, 0x6F, 0xDF, 0x20, // #Title=Groß
        0x69, 0x73, 0x74, 0x20, 0x75, 0x6E, 0x73, 0x65, 0x72, 0x20, 0x47, 0x6F, 0x74, 0x74, 0x0A, // ist unser Gott\n
        0x2D, 0x2D, 0x2D, 0x0A, // ---\n
        0x24, 0x24, 0x4D, 0x3D, 0x56, 0x65, 0x72, 0x73, 0x20, 0x31, 0x0A, // $$M=Vers 1\n
        0x46, 0xFC, 0x72, 0x77, 0x61, 0x68, 0x72, 0x2C, 0x20, 0x65, 0x72, 0x20, 0x74, 0x72, 0x75, 0x67, // Fürwahr, er trug
    ];

    let output = parse_sng_bytes_with_info(&raw_win1252)
        .expect("Windows-1252 input must decode cleanly without errors");

    assert_eq!(output.detected_encoding, DetectedEncoding::Windows1252);
    assert_eq!(output.song.metadata.title, "Groß ist unser Gott");
    assert_eq!(output.song.slides[0].lines[0].to_audience_string(), "Fürwahr, er trug");
}

#[test]
fn test_transposition_invariant_12_semitones() {
    let test_chords = vec![
        "C", "C#", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B",
        "Am", "F#m7", "Gsus4", "Cmaj7", "Bb/D", "F#/A#",
    ];

    for chord in test_chords {
        // Transposing by 12 semitones up must return enharmonically equivalent original chord
        let transposed_12 = transpose_chord(chord, 12);
        let back_12 = transpose_chord(&transposed_12, -12);
        assert_eq!(
            back_12, chord,
            "12-semitone roundtrip invariant failed for chord: {chord}"
        );
    }
}

#[test]
fn test_sng_serialization_roundtrip() {
    let original = parse_sng_str(REFERENCE_SNG).expect("Original SNG should parse");
    let serialized = noah_parser::serialize_sng(&original);

    let reparsed = parse_sng_str(&serialized).expect("Serialized SNG should parse cleanly");

    assert_eq!(reparsed.metadata.title, original.metadata.title);
    assert_eq!(reparsed.metadata.author, original.metadata.author);
    assert_eq!(reparsed.metadata.musical_key, original.metadata.musical_key);
    assert_eq!(reparsed.metadata.verse_order, original.metadata.verse_order);
    assert_eq!(reparsed.slides.len(), original.slides.len());

    for (s_rep, s_orig) in reparsed.slides.iter().zip(original.slides.iter()) {
        assert_eq!(s_rep.label, s_orig.label);
        assert_eq!(s_rep.lines.len(), s_orig.lines.len());
        for (l_rep, l_orig) in s_rep.lines.iter().zip(s_orig.lines.iter()) {
            assert_eq!(l_rep.to_audience_string(), l_orig.to_audience_string());
        }
    }
}
