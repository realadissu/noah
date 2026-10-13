//! Filesystem scanner and song indexer for NOAH.
//!
//! Provides recursive scanning of `SongBeamer` `.sng` directories,
//! raw byte loading, encoding detection, and WAL SQLite indexing.

use std::path::{Path, PathBuf};
use noah_core::models::Song;
use noah_core::storage::SongDatabase;
use noah_parser::{parse_sng_bytes_with_info, DetectedEncoding};
use serde::{Deserialize, Serialize};

/// Summary report returned after scanning a song directory.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ScanSummary {
    pub total_scanned: usize,
    pub indexed_count: usize,
    pub error_count: usize,
    pub directory: String,
}

/// Result of loading a single `.sng` file from disk.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileLoadResult {
    pub song: Song,
    pub encoding: String,
    pub file_path: String,
}

/// Reads and parses a single `.sng` file from disk.
///
/// Guaranteed panic-free; returns a descriptive error if the file
/// is missing, unreadable, or invalid.
///
/// # Errors
/// Returns an error string if file I/O fails or parsing fails.
pub fn load_sng_file_from_disk(path: &Path) -> Result<FileLoadResult, String> {
    if !path.is_file() {
        return Err(format!("File does not exist or is not a file: {}", path.display()));
    }

    let bytes = std::fs::read(path)
        .map_err(|e| format!("Failed to read file {}: {e}", path.display()))?;

    let result = parse_sng_bytes_with_info(&bytes)
        .map_err(|e| format!("Failed to parse .sng in {}: {e}", path.display()))?;

    let encoding_name = match result.detected_encoding {
        DetectedEncoding::Utf8WithBom => "UTF-8 (BOM)",
        DetectedEncoding::Utf8 => "UTF-8",
        DetectedEncoding::Windows1252 => "Windows-1252",
    };

    Ok(FileLoadResult {
        song: result.song,
        encoding: encoding_name.to_string(),
        file_path: path.to_string_lossy().to_string(),
    })
}

/// Recursively scans a directory for `.sng` files and indexes them into the SQLite database.
///
/// Fault-tolerant: Malformed or unreadable files increment `error_count`
/// without terminating or aborting the overall batch scan.
///
/// # Errors
/// Returns an error string if the root path is not a valid directory.
pub fn scan_and_index_directory(dir: &Path, db: &SongDatabase) -> Result<ScanSummary, String> {
    if !dir.is_dir() {
        return Err(format!("Directory does not exist: {}", dir.display()));
    }

    let mut total_scanned = 0usize;
    let mut indexed_count = 0usize;
    let mut error_count = 0usize;

    let mut stack: Vec<PathBuf> = vec![dir.to_path_buf()];

    while let Some(current_dir) = stack.pop() {
        let entries = match std::fs::read_dir(&current_dir) {
            Ok(e) => e,
            Err(err) => {
                tracing::warn!("Cannot read directory {}: {err}", current_dir.display());
                error_count = error_count.saturating_add(1);
                continue;
            }
        };

        for entry_res in entries {
            let entry = match entry_res {
                Ok(e) => e,
                Err(err) => {
                    tracing::warn!("Error accessing directory entry: {err}");
                    error_count = error_count.saturating_add(1);
                    continue;
                }
            };

            let path = entry.path();
            if path.is_dir() {
                // Ignore hidden directories like .git
                if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                    if !name.starts_with('.') {
                        stack.push(path);
                    }
                }
            } else if path.is_file() {
                if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
                    if ext.eq_ignore_ascii_case("sng") {
                        total_scanned = total_scanned.saturating_add(1);
                        match std::fs::read(&path) {
                            Ok(bytes) => match parse_sng_bytes_with_info(&bytes) {
                                Ok(parsed) => {
                                    if let Err(e) = db.upsert_song(&parsed.song, Some(&path)) {
                                        tracing::warn!("Failed to index song {}: {e}", path.display());
                                        error_count = error_count.saturating_add(1);
                                    } else {
                                        indexed_count = indexed_count.saturating_add(1);
                                    }
                                }
                                Err(e) => {
                                    tracing::warn!("Failed to parse .sng file {}: {e}", path.display());
                                    error_count = error_count.saturating_add(1);
                                }
                            },
                            Err(e) => {
                                tracing::warn!("Failed to read .sng file {}: {e}", path.display());
                                error_count = error_count.saturating_add(1);
                            }
                        }
                    }
                }
            }
        }
    }

    Ok(ScanSummary {
        total_scanned,
        indexed_count,
        error_count,
        directory: dir.to_string_lossy().to_string(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_scan_and_index_directory_with_sample_files() {
        let temp_dir = std::env::temp_dir().join(format!("noah_test_scan_{}", uuid::Uuid::new_v4()));
        let _ = std::fs::create_dir_all(&temp_dir);

        // 1. Valid UTF-8 sng
        let valid_sng_1 = "#Title=Lobe den Herrn\n#Author=Joachim Neander\n---\nLobe den Herrn, meine Seele!";
        let _ = std::fs::write(temp_dir.join("song1.sng"), valid_sng_1);

        // 2. Valid nested folder with another sng
        let sub_dir = temp_dir.join("subfolder");
        let _ = std::fs::create_dir_all(&sub_dir);
        let valid_sng_2 = "#Title=Amazing Grace\n#Author=John Newton\n---\nAmazing grace! How sweet the sound";
        let _ = std::fs::write(sub_dir.join("song2.sng"), valid_sng_2);

        // 3. Deliberately corrupt file (Fault injection)
        let corrupt_sng = vec![0xFF, 0xFE, 0x00, 0x12, 0x34];
        let _ = std::fs::write(temp_dir.join("corrupt.sng"), corrupt_sng);

        // 4. Non-sng file (should be ignored)
        let _ = std::fs::write(temp_dir.join("notes.txt"), "Not a song file");

        let db = SongDatabase::open_in_memory().expect("In-memory SQLite should initialize");

        let summary = scan_and_index_directory(&temp_dir, &db).expect("Scan should succeed");
        assert_eq!(summary.total_scanned, 3);
        assert_eq!(summary.indexed_count, 2);
        assert_eq!(summary.error_count, 1);

        // Check search works on indexed database
        let results = db.search("Lobe den Herrn", 10).expect("Search should succeed");
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].title, "Lobe den Herrn");

        // Clean up
        let _ = std::fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_load_sng_file_from_disk_negative_nonexistent() {
        let fake_path = Path::new("/path/that/does/not/exist/song.sng");
        let result = load_sng_file_from_disk(fake_path);
        assert!(result.is_err());
    }
}
