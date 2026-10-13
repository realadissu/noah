//! Integration tests for Display IPC events, serialization invariants, and fault injection.

use noah_core::models::{
    BeamerEvent, DisplayInfo, DisplayMode, SlideIndex, Song, SongId, SongMetadata, TransitionType,
};

#[test]
fn test_beamer_event_json_serialization_envelope_contract() {
    let change_event = BeamerEvent::ChangeSlide {
        slide_id: "slide-42".to_string(),
        transition: TransitionType::Crossfade { duration_ms: 300 },
    };

    let serialized = serde_json::to_string(&change_event).expect("Serialization failed");
    assert!(serialized.contains(r#""type":"CHANGE_SLIDE""#));
    assert!(serialized.contains(r#""slideId":"slide-42""#));
    assert!(serialized.contains(r#""duration_ms":300"#));

    let deserialized: BeamerEvent =
        serde_json::from_str(&serialized).expect("Deserialization failed");
    assert_eq!(change_event, deserialized);
}

#[test]
fn test_sync_song_envelope_with_boxed_payload() {
    let song = Song {
        id: SongId::new(),
        metadata: SongMetadata {
            title: "Großer Gott, wir loben dich".to_string(),
            title_lang2: None,
            author: Some("Ignaz Franz".to_string()),
            copyright: None,
            ccli: None,
            transpose: None,
            speed: None,
            musical_key: Some("F".to_string()),
            font_size: None,
            verse_order: vec!["Strophe 1".to_string()],
            lang_count: 1,
            custom_tags: std::collections::BTreeMap::new(),
        },
        slides: Vec::new(),
        raw_format: None,
    };

    let sync_event = BeamerEvent::SyncSong {
        song: Box::new(song),
        slide_index: SlideIndex::new(3),
    };

    let json = serde_json::to_string(&sync_event).expect("Must serialize");
    assert!(json.contains(r#""type":"SYNC_SONG""#));
    assert!(json.contains(r#""slideIndex":3"#));
    assert!(json.contains("Großer Gott, wir loben dich"));

    let deserialized: BeamerEvent = serde_json::from_str(&json).expect("Must deserialize");
    assert_eq!(sync_event, deserialized);
}

#[test]
fn test_blanking_display_modes_contract() {
    let modes = [
        (DisplayMode::Normal, "normal"),
        (DisplayMode::Black, "black"),
        (DisplayMode::ClearText, "clear_text"),
        (DisplayMode::Logo, "logo"),
        (DisplayMode::Frozen, "frozen"),
    ];

    for (mode, wire_name) in modes {
        let event = BeamerEvent::SetBlank { mode };
        let json = serde_json::to_string(&event).expect("Must serialize");
        assert!(json.contains(wire_name));

        let recovered: BeamerEvent = serde_json::from_str(&json).expect("Must deserialize");
        assert_eq!(event, recovered);
    }
}

#[test]
fn test_display_info_dimensions_and_scaling() {
    let info = DisplayInfo {
        id: "screen-1".to_string(),
        name: "Dell UltraSharp 4K".to_string(),
        width: 3840,
        height: 2160,
        scale_factor: 2.0,
        is_primary: false,
        position_x: 1920,
        position_y: 0,
    };

    let json = serde_json::to_string(&info).expect("Must serialize");
    let recovered: DisplayInfo = serde_json::from_str(&json).expect("Must deserialize");
    assert_eq!(info, recovered);
    assert!(!recovered.is_primary);
    assert_eq!(recovered.width, 3840);
}

#[test]
fn test_fault_injection_corrupt_ipc_envelopes() {
    // 1. Unknown event discriminant
    let invalid_type = r#"{"type":"EXPLODE_PROJECTOR","slideId":"abc"}"#;
    assert!(serde_json::from_str::<BeamerEvent>(invalid_type).is_err());

    // 2. Missing required field
    let missing_field = r#"{"type":"CHANGE_SLIDE"}"#;
    assert!(serde_json::from_str::<BeamerEvent>(missing_field).is_err());

    // 3. Truncated JSON
    let truncated = r#"{"type":"SET_BLANK","mode":"bla"#;
    assert!(serde_json::from_str::<BeamerEvent>(truncated).is_err());

    // 4. Corrupted data types
    let corrupt_types = r#"{"type":"ALERT_OVERLAY","message":12345,"durationMs":"infinite"}"#;
    assert!(serde_json::from_str::<BeamerEvent>(corrupt_types).is_err());
}

#[test]
fn test_resilient_arbitrary_string_identifiers_deserialization() {
    // Non-UUID string IDs from frontend samples or external imports must be gracefully converted
    let json_with_non_uuid = r#"{
        "id": "song-sample-1",
        "metadata": {
            "title": "Lobe den Herrn",
            "title_lang2": null,
            "author": null,
            "copyright": null,
            "ccli": null,
            "transpose": null,
            "speed": null,
            "musical_key": null,
            "font_size": null,
            "verse_order": [],
            "lang_count": 1,
            "custom_tags": {}
        },
        "slides": [
            {
                "id": "slide-sample-1",
                "index": 0,
                "section": null,
                "label": "Refrain",
                "lines": [],
                "raw_content": "Lobe den Herrn"
            }
        ],
        "raw_format": null
    }"#;

    let song: Result<Song, _> = serde_json::from_str(json_with_non_uuid);
    assert!(song.is_ok(), "Song with arbitrary string IDs must deserialize gracefully");
    let song = song.unwrap();
    assert_ne!(song.id.0, uuid::Uuid::nil());
    assert_eq!(song.slides.len(), 1);
    assert_ne!(song.slides[0].id.0, uuid::Uuid::nil());
}

