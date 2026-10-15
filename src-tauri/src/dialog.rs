//! Native file and folder dialogs for NOAH.
//!
//! Provides native dialog integration across Windows (PowerShell WinForms),
//! macOS (AppleScript), and Linux (zenity/kdialog), with safe error handling.

/// Opens a native file picker dialog for selecting one or more `.sng` files.
/// Returns a list of absolute paths, or an empty list if canceled.
pub fn pick_sng_files_native(default_path: Option<&str>) -> Result<Vec<String>, String> {
    #[cfg(target_os = "windows")]
    {
        let initial_dir = default_path.unwrap_or("").replace('\'', "''");
        let script = format!(
            "Add-Type -AssemblyName System.Windows.Forms; \
             $d = New-Object System.Windows.Forms.OpenFileDialog; \
             $d.Title = 'Wähle SongBeamer-Lieder (.sng)'; \
             $d.Filter = 'SongBeamer Lieder (*.sng)|*.sng|Alle Dateien (*.*)|*.*'; \
             $d.Multiselect = $true; \
             if ('{initial_dir}' -ne '' -and (Test-Path '{initial_dir}')) {{ $d.InitialDirectory = '{initial_dir}' }}; \
             if ($d.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {{ \
                 $d.FileNames | ForEach-Object {{ Write-Output $_ }} \
             }}"
        );

        let output = std::process::Command::new("powershell")
            .args(["-NoProfile", "-NonInteractive", "-Command", &script])
            .output()
            .map_err(|e| format!("Failed to launch file picker on Windows: {e}"))?;

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

    #[cfg(target_os = "linux")]
    {
        if let Ok(output) = std::process::Command::new("zenity")
            .args([
                "--file-selection",
                "--multiple",
                "--separator=\n",
                "--file-filter=SongBeamer (*.sng) | *.sng",
                "--title=Wähle SongBeamer-Lieder (.sng)",
            ])
            .output()
        {
            if output.status.success() {
                let stdout = String::from_utf8_lossy(&output.stdout);
                let paths: Vec<String> = stdout
                    .lines()
                    .map(str::trim)
                    .filter(|s| !s.is_empty())
                    .map(String::from)
                    .collect();
                return Ok(paths);
            }
        }
        Ok(Vec::new())
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        let _ = default_path;
        Ok(Vec::new())
    }
}

/// Opens a native file picker dialog for selecting image files (`.jpg`, `.jpeg`, `.png`, `.webp`, `.bmp`).
/// Returns a list of absolute paths, or an empty list if canceled.
pub fn pick_image_files_native(default_path: Option<&str>) -> Result<Vec<String>, String> {
    #[cfg(target_os = "windows")]
    {
        let initial_dir = default_path.unwrap_or("").replace('\'', "''");
        let script = format!(
            "Add-Type -AssemblyName System.Windows.Forms; \
             $d = New-Object System.Windows.Forms.OpenFileDialog; \
             $d.Title = 'Hintergrundbilder auswählen'; \
             $d.Filter = 'Bilder (*.jpg;*.jpeg;*.png;*.webp;*.bmp)|*.jpg;*.jpeg;*.png;*.webp;*.bmp|Alle Dateien (*.*)|*.*'; \
             $d.Multiselect = $true; \
             if ('{initial_dir}' -ne '' -and (Test-Path '{initial_dir}')) {{ $d.InitialDirectory = '{initial_dir}' }}; \
             if ($d.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {{ \
                 $d.FileNames | ForEach-Object {{ Write-Output $_ }} \
             }}"
        );

        let output = std::process::Command::new("powershell")
            .args(["-NoProfile", "-NonInteractive", "-Command", &script])
            .output()
            .map_err(|e| format!("Failed to launch image picker on Windows: {e}"))?;

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

    #[cfg(target_os = "macos")]
    {
        let script = r#"
            try
                set chosenFiles to choose file of type {"public.image"} with prompt "Wähle Hintergrundbilder:" with multiple selections allowed
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
            .map_err(|e| format!("Failed to launch image picker: {e}"))?;

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

    #[cfg(target_os = "linux")]
    {
        if let Ok(output) = std::process::Command::new("zenity")
            .args([
                "--file-selection",
                "--multiple",
                "--separator=\n",
                "--file-filter=Bilder (*.jpg, *.png, *.webp) | *.jpg *.jpeg *.png *.webp *.bmp",
                "--title=Wähle Hintergrundbilder",
            ])
            .output()
        {
            if output.status.success() {
                let stdout = String::from_utf8_lossy(&output.stdout);
                let paths: Vec<String> = stdout
                    .lines()
                    .map(str::trim)
                    .filter(|s| !s.is_empty())
                    .map(String::from)
                    .collect();
                return Ok(paths);
            }
        }
        Ok(Vec::new())
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        let _ = default_path;
        Ok(Vec::new())
    }
}

/// Opens a native folder picker dialog.
/// Returns the absolute path, or None if canceled.
pub fn pick_folder_native(prompt: &str, default_path: Option<&str>) -> Result<Option<String>, String> {
    #[cfg(target_os = "windows")]
    {
        let initial_dir = default_path.unwrap_or("").replace('\'', "''");
        let escaped_prompt = prompt.replace('\'', "''");
        let script = format!(
            "Add-Type -AssemblyName System.Windows.Forms; \
             $d = New-Object System.Windows.Forms.FolderBrowserDialog; \
             $d.Description = '{escaped_prompt}'; \
             $d.ShowNewFolderButton = $true; \
             if ('{initial_dir}' -ne '' -and (Test-Path '{initial_dir}')) {{ $d.SelectedPath = '{initial_dir}' }}; \
             if ($d.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {{ \
                 Write-Output $d.SelectedPath \
             }}"
        );

        let output = std::process::Command::new("powershell")
            .args(["-NoProfile", "-NonInteractive", "-Command", &script])
            .output()
            .map_err(|e| format!("Failed to launch folder picker on Windows: {e}"))?;

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

    #[cfg(target_os = "macos")]
    {
        let escaped_prompt = prompt.replace('"', "\\\"");
        let script = format!(
            r#"
            try
                set chosenFolder to choose folder with prompt "{escaped_prompt}"
                return POSIX path of chosenFolder
            on error number -128
                return ""
            end try
            "#
        );
        let output = std::process::Command::new("osascript")
            .arg("-e")
            .arg(&script)
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

    #[cfg(target_os = "linux")]
    {
        if let Ok(output) = std::process::Command::new("zenity")
            .args(["--file-selection", "--directory", "--title", prompt])
            .output()
        {
            if output.status.success() {
                let stdout = String::from_utf8_lossy(&output.stdout);
                let path = stdout.trim();
                if !path.is_empty() {
                    return Ok(Some(path.to_string()));
                }
            }
        }
        Ok(None)
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        let _ = prompt;
        let _ = default_path;
        Ok(None)
    }
}

/// Opens a native folder picker dialog specifically for the `SongBeamer` songs directory.
pub fn pick_songs_folder_native() -> Result<Option<String>, String> {
    pick_folder_native("Wähle SongBeamer Lieder-Verzeichnis:", None)
}
