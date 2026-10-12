//! SQLite-backed song metadata and full-text search indexing engine.

use std::path::Path;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};

use crate::error::{NoahError, NoahResult};
use crate::models::{Song, SongId};

/// Search hit returned by song database queries.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SongSearchResult {
    pub id: SongId,
    pub title: String,
    pub author: Option<String>,
    pub musical_key: Option<String>,
    pub file_path: Option<String>,
    pub slide_count: usize,
    pub snippet: Option<String>,
}

/// Thread-safe SQLite storage engine for fast indexing and sub-10ms search queries.
pub struct SongDatabase {
    conn: Mutex<Connection>,
}

impl SongDatabase {
    /// Opens an in-memory SQLite database, primarily used for testing or transient sessions.
    ///
    /// # Errors
    /// Returns `NoahError::Database` if SQLite initialization fails.
    pub fn open_in_memory() -> NoahResult<Self> {
        let conn = Connection::open_in_memory()
            .map_err(|e| NoahError::Database(format!("Failed to open in-memory database: {e}")))?;
        let db = Self {
            conn: Mutex::new(conn),
        };
        db.init_schema()?;
        Ok(db)
    }

    /// Opens or creates an on-disk SQLite database at the specified path with WAL mode enabled.
    ///
    /// # Errors
    /// Returns `NoahError::Database` if opening or schema initialization fails.
    pub fn open<P: AsRef<Path>>(path: P) -> NoahResult<Self> {
        let conn = Connection::open(path)
            .map_err(|e| NoahError::Database(format!("Failed to open database file: {e}")))?;
        let db = Self {
            conn: Mutex::new(conn),
        };
        db.init_schema()?;
        Ok(db)
    }

    /// Initializes tables, FTS5 full-text indices, and sync triggers.
    fn init_schema(&self) -> NoahResult<()> {
        let conn = self
            .conn
            .lock()
            .map_err(|_| NoahError::StateConflict("Failed to acquire database lock".into()))?;

        // Enable Write-Ahead Logging (WAL) for high concurrency
        conn.execute_batch(
            "PRAGMA journal_mode = WAL;
             PRAGMA synchronous = NORMAL;
             PRAGMA foreign_keys = ON;

             CREATE TABLE IF NOT EXISTS songs (
                 id TEXT PRIMARY KEY NOT NULL,
                 title TEXT NOT NULL,
                 title_lang2 TEXT,
                 author TEXT,
                 musical_key TEXT,
                 ccli TEXT,
                 file_path TEXT,
                 slide_count INTEGER NOT NULL,
                 full_lyrics TEXT NOT NULL,
                 updated_at INTEGER NOT NULL
             );

             CREATE VIRTUAL TABLE IF NOT EXISTS songs_fts USING fts5(
                 title,
                 author,
                 full_lyrics,
                 content='songs',
                 content_rowid='rowid'
             );

             CREATE TRIGGER IF NOT EXISTS songs_ai AFTER INSERT ON songs BEGIN
                 INSERT INTO songs_fts(rowid, title, author, full_lyrics)
                 VALUES (new.rowid, new.title, new.author, new.full_lyrics);
             END;

             CREATE TRIGGER IF NOT EXISTS songs_ad AFTER DELETE ON songs BEGIN
                 INSERT INTO songs_fts(songs_fts, rowid, title, author, full_lyrics)
                 VALUES ('delete', old.rowid, old.title, old.author, old.full_lyrics);
             END;

             CREATE TRIGGER IF NOT EXISTS songs_au AFTER UPDATE ON songs BEGIN
                 INSERT INTO songs_fts(songs_fts, rowid, title, author, full_lyrics)
                 VALUES ('delete', old.rowid, old.title, old.author, old.full_lyrics);
                 INSERT INTO songs_fts(rowid, title, author, full_lyrics)
                 VALUES (new.rowid, new.title, new.author, new.full_lyrics);
             END;",
        )
        .map_err(|e| NoahError::Database(format!("Schema initialization failed: {e}")))?;
        drop(conn);

        Ok(())
    }

    /// Inserts or updates a song in the index.
    ///
    /// # Errors
    /// Returns `NoahError::Database` on failure.
    pub fn upsert_song(&self, song: &Song, file_path: Option<&Path>) -> NoahResult<()> {
        let conn = self
            .conn
            .lock()
            .map_err(|_| NoahError::StateConflict("Failed to acquire database lock".into()))?;

        let id_str = song.id.to_string();
        let path_str = file_path.and_then(|p| p.to_str()).map(String::from);
        let slide_count = i64::try_from(song.slide_count()).unwrap_or(0);

        let full_lyrics = song
            .slides
            .iter()
            .map(crate::models::Slide::audience_content)
            .collect::<Vec<_>>()
            .join("\n\n");

        let updated_at = i64::try_from(
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs(),
        )
        .unwrap_or(0);

        conn.execute(
            "INSERT INTO songs (
                 id, title, title_lang2, author, musical_key, ccli, file_path, slide_count, full_lyrics, updated_at
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
             ON CONFLICT(id) DO UPDATE SET
                 title = excluded.title,
                 title_lang2 = excluded.title_lang2,
                 author = excluded.author,
                 musical_key = excluded.musical_key,
                 ccli = excluded.ccli,
                 file_path = excluded.file_path,
                 slide_count = excluded.slide_count,
                 full_lyrics = excluded.full_lyrics,
                 updated_at = excluded.updated_at;",
            params![
                id_str,
                song.metadata.title,
                song.metadata.title_lang2,
                song.metadata.author,
                song.metadata.musical_key,
                song.metadata.ccli,
                path_str,
                slide_count,
                full_lyrics,
                updated_at,
            ],
        )
        .map_err(|e| NoahError::Database(format!("Failed to upsert song: {e}")))?;
        drop(conn);

        Ok(())
    }

    /// Performs sub-10ms full-text and title search.
    ///
    /// # Errors
    /// Returns `NoahError::Database` on query execution error.
    #[allow(clippy::too_many_lines, clippy::significant_drop_tightening)]
    pub fn search(&self, query: &str, limit: usize) -> NoahResult<Vec<SongSearchResult>> {
        let conn = self
            .conn
            .lock()
            .map_err(|_| NoahError::StateConflict("Failed to acquire database lock".into()))?;

        let trimmed = query.trim();
        let limit_i64 = i64::try_from(limit.max(1)).unwrap_or(1);

        if trimmed.is_empty() {
            // Return recent songs ordered by last update
            let mut stmt = conn
                .prepare(
                    "SELECT id, title, author, musical_key, file_path, slide_count
                     FROM songs
                     ORDER BY updated_at DESC
                     LIMIT ?1;",
                )
                .map_err(|e| NoahError::Database(format!("Query preparation failed: {e}")))?;

            let rows = stmt
                .query_map(params![limit_i64], |row| {
                    let id_str: String = row.get(0)?;
                    let title: String = row.get(1)?;
                    let author: Option<String> = row.get(2)?;
                    let musical_key: Option<String> = row.get(3)?;
                    let file_path: Option<String> = row.get(4)?;
                    let slide_count_i64: i64 = row.get(5)?;

                    Ok((id_str, title, author, musical_key, file_path, slide_count_i64))
                })
                .map_err(|e| NoahError::Database(format!("Query execution failed: {e}")))?;

            let mut results = Vec::new();
            for r in rows {
                let (id_str, title, author, musical_key, file_path, slide_count_i64) =
                    r.map_err(|e| NoahError::Database(e.to_string()))?;
                let id = id_str.parse::<SongId>()?;
                results.push(SongSearchResult {
                    id,
                    title,
                    author,
                    musical_key,
                    file_path,
                    slide_count: usize::try_from(slide_count_i64.max(0)).unwrap_or(0),
                    snippet: None,
                });
            }
            return Ok(results);
        }

        // Clean FTS query: format for prefix search (e.g. "lobe*")
        let clean_fts_term = trimmed.replace(['"', '*', '\''], "");
        let fts_query = format!("\"{clean_fts_term}\"*");

        // Attempt FTS5 MATCH
        let fts_attempt = conn.prepare(
            "SELECT s.id, s.title, s.author, s.musical_key, s.file_path, s.slide_count,
                    snippet(songs_fts, 2, '<b>', '</b>', '...', 10)
             FROM songs_fts
             JOIN songs s ON s.rowid = songs_fts.rowid
             WHERE songs_fts MATCH ?1
             ORDER BY rank
             LIMIT ?2;",
        );

        if let Ok(mut stmt) = fts_attempt {
            if let Ok(rows) = stmt.query_map(params![fts_query, limit_i64], |row| {
                let id_str: String = row.get(0)?;
                let title: String = row.get(1)?;
                let author: Option<String> = row.get(2)?;
                let musical_key: Option<String> = row.get(3)?;
                let file_path: Option<String> = row.get(4)?;
                let slide_count_i64: i64 = row.get(5)?;
                let snippet: Option<String> = row.get(6)?;

                Ok((id_str, title, author, musical_key, file_path, slide_count_i64, snippet))
            }) {
                let mut results = Vec::new();
                for r in rows.flatten() {
                    let (id_str, title, author, musical_key, file_path, slide_count_i64, snippet) = r;
                    if let Ok(id) = id_str.parse::<SongId>() {
                        results.push(SongSearchResult {
                            id,
                            title,
                            author,
                            musical_key,
                            file_path,
                            slide_count: usize::try_from(slide_count_i64.max(0)).unwrap_or(0),
                            snippet,
                        });
                    }
                }

                if !results.is_empty() {
                    return Ok(results);
                }
            }
        }

        // Fallback to substring LIKE if FTS yielded zero results or syntax was rejected
        let like_pattern = format!("%{trimmed}%");
        let mut stmt = conn
            .prepare(
                "SELECT id, title, author, musical_key, file_path, slide_count
                 FROM songs
                 WHERE title LIKE ?1 OR author LIKE ?1 OR full_lyrics LIKE ?1
                 ORDER BY updated_at DESC
                 LIMIT ?2;",
            )
            .map_err(|e| NoahError::Database(format!("Fallback query prep failed: {e}")))?;

        let rows = stmt
            .query_map(params![like_pattern, limit_i64], |row| {
                let id_str: String = row.get(0)?;
                let title: String = row.get(1)?;
                let author: Option<String> = row.get(2)?;
                let musical_key: Option<String> = row.get(3)?;
                let file_path: Option<String> = row.get(4)?;
                let slide_count_i64: i64 = row.get(5)?;

                Ok((id_str, title, author, musical_key, file_path, slide_count_i64))
            })
            .map_err(|e| NoahError::Database(format!("Fallback query execution failed: {e}")))?;

        let mut results = Vec::new();
        for r in rows {
            let (id_str, title, author, musical_key, file_path, slide_count_i64) =
                r.map_err(|e| NoahError::Database(e.to_string()))?;
            let id = id_str.parse::<SongId>()?;
            results.push(SongSearchResult {
                id,
                title,
                author,
                musical_key,
                file_path,
                slide_count: usize::try_from(slide_count_i64.max(0)).unwrap_or(0),
                snippet: None,
            });
        }

        Ok(results)
    }

    /// Deletes a song from the index by its ID.
    ///
    /// # Errors
    /// Returns `NoahError::Database` on failure.
    pub fn delete_song(&self, id: &SongId) -> NoahResult<bool> {
        let conn = self
            .conn
            .lock()
            .map_err(|_| NoahError::StateConflict("Failed to acquire database lock".into()))?;

        let id_str = id.to_string();
        let count = conn
            .execute("DELETE FROM songs WHERE id = ?1;", params![id_str])
            .map_err(|e| NoahError::Database(format!("Failed to delete song: {e}")))?;
        drop(conn);

        Ok(count > 0)
    }

    /// Returns the total count of songs in the library.
    ///
    /// # Errors
    /// Returns `NoahError::Database` on failure.
    pub fn count(&self) -> NoahResult<usize> {
        let conn = self
            .conn
            .lock()
            .map_err(|_| NoahError::StateConflict("Failed to acquire database lock".into()))?;

        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM songs;", [], |row| row.get(0))
            .map_err(|e| NoahError::Database(format!("Failed to count songs: {e}")))?;
        drop(conn);

        Ok(usize::try_from(count.max(0)).unwrap_or(0))
    }
}
