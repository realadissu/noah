use noah_core::models::{
    LyricLine, LyricToken, SectionType, Slide, SlideIndex, Song, SongMetadata,
};
use noah_core::storage::SongDatabase;
use std::time::Instant;

fn build_sample_song(title: &str, author: &str, lyrics: &str) -> Song {
    let mut meta = SongMetadata::new(title);
    meta.author = Some(author.to_string());
    meta.musical_key = Some("G".to_string());

    let line = LyricLine::new(
        vec![LyricToken::text(lyrics)],
        lyrics.to_string(),
        0,
    );
    let slide = Slide::new(
        SlideIndex::new(0),
        Some(SectionType::Chorus(None)),
        "Chorus".to_string(),
        vec![line],
        lyrics.to_string(),
    );

    Song::new(meta, vec![slide])
}

#[test]
fn test_database_initialization_and_crud() {
    let db = SongDatabase::open_in_memory().expect("In-memory SQLite should initialize");

    assert_eq!(db.count().expect("Count should succeed"), 0);

    let song1 = build_sample_song(
        "10,000 Reasons",
        "Matt Redman",
        "Bless the Lord, O my soul, worship His holy name.",
    );
    let song1_id = song1.id;

    db.upsert_song(&song1, None).expect("Song insertion should succeed");
    assert_eq!(db.count().expect("Count should be 1"), 1);

    // Search by title
    let hits = db.search("Reasons", 10).expect("Search should succeed");
    assert_eq!(hits.len(), 1);
    assert_eq!(hits[0].id, song1_id);
    assert_eq!(hits[0].title, "10,000 Reasons");

    // Search by lyric snippet
    let lyric_hits = db.search("worship", 10).expect("FTS search should succeed");
    assert_eq!(lyric_hits.len(), 1);
    assert_eq!(lyric_hits[0].title, "10,000 Reasons");

    // Search by author
    let author_hits = db.search("Redman", 10).expect("Author search should succeed");
    assert_eq!(author_hits.len(), 1);

    // Delete
    let deleted = db.delete_song(&song1_id).expect("Delete should succeed");
    assert!(deleted);
    assert_eq!(db.count().expect("Count after delete should be 0"), 0);
}

#[test]
fn test_database_sub_10ms_search_latency() {
    let db = SongDatabase::open_in_memory().expect("In-memory SQLite should initialize");

    // Seed 100 sample songs
    for i in 0..100 {
        let song = build_sample_song(
            &format!("Hymn Number {i}"),
            "Christian Author",
            &format!("Verse content for hymn number {i} singing hallelujah"),
        );
        db.upsert_song(&song, None).expect("Seed song should insert");
    }

    assert_eq!(db.count().expect("Count should be 100"), 100);

    // Benchmark search execution latency
    let start = Instant::now();
    let hits = db.search("hallelujah", 10).expect("Search should execute");
    let elapsed = start.elapsed();

    assert!(!hits.is_empty(), "Should find seeded songs matching hallelujah");
    assert!(
        elapsed.as_millis() < 10,
        "Search latency must be sub-10ms! Actual: {elapsed:?}"
    );
}
