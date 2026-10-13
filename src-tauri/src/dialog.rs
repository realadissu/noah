//! Native file and folder dialogs for NOAH.
//!
//! Provides native open panel integration for macOS via `AppleScript`,
//! with safe fallback handling when dialogs are dismissed or unsupported.

/// Opens a native file picker dialog for selecting one or more `.sng` files.
/// Returns a list of absolute POSIX paths, or an empty list if canceled.
///
/// # Errors
/// Returns an error string only if process invocation fatally fails.
pub fn pick_sng_files_native() -> Result<Vec<String>, String> {
    #[cfg(target_os = "macos")]
    {
        let script = r#"
            try
                set chosenFiles to choose file of type {"sng"} with prompt "Wähle SongBeamer-Lieder (.sng):" with multiple selections allowed
                set posixPaths to {}
                repeat with aFile in chosenFiles
                    set end of posixPaths to POSIX path of aFile
                end repeat
                set AppleScript's text item delimiters to linefeed
                return posixPaths as text
            on error number -128
                return ""
            end try
        "#;
        let output = std::process::Command::new("osascript")
            .arg("-e")
            .arg(script)
            .output()
            .map_err(|e| format!("Failed to launch file picker: {e}"))?;

        if !output.status.success() {
            return Ok(Vec::new());
        }

        let stdout = String::from_utf8_lossy(&output.stdout);
        let paths: Vec<String> = stdout
            .lines()
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .map(String::from)
            .collect();
        Ok(paths)
    }

    #[cfg(not(target_os = "macos"))]
    {
        // On non-macOS systems without extra dialog crates, returns empty to trigger web input fallback
        Ok(Vec::new())
    }
}

/// Opens a native folder picker dialog for selecting the `SongBeamer` songs root directory.
/// Returns the absolute path or None if canceled.
///
/// # Errors
/// Returns an error string only if process invocation fatally fails.
pub fn pick_songs_folder_native() -> Result<Option<String>, String> {
    #[cfg(target_os = "macos")]
    {
        let script = r#"
            try
                set chosenFolder to choose folder with prompt "Wähle SongBeamer Lieder-Verzeichnis:"
                return POSIX path of chosenFolder
            on error number -128
                return ""
            end try
        "#;
        let output = std::process::Command::new("osascript")
            .arg("-e")
            .arg(script)
            .output()
            .map_err(|e| format!("Failed to launch folder picker: {e}"))?;

        if !output.status.success() {
            return Ok(None);
        }

        let stdout = String::from_utf8_lossy(&output.stdout);
        let path = stdout.trim();
        if path.is_empty() {
            Ok(None)
        } else {
            Ok(Some(path.to_string()))
        }
    }

    #[cfg(not(target_os = "macos"))]
    {
        Ok(None)
    }
}
