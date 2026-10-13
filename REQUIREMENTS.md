# REQUIREMENTS.md — System Specifications for NOAH

## 1. Vision & Core Value Proposition
**NOAH** (*Not Only Another Hymnal*) is a fast, crash-resilient, open-source live presentation system for churches, worship teams, and events. It serves as a modern, cross-platform successor to legacy tools such as SongBeamer, running identically on **Windows 11, macOS (12+), and Linux (including Raspberry Pi 4/5)**, with zero proprietary vendor lock-in.

### Internationalization (i18n) & Code Conventions
- **Multi-Language UI**: The application interface must be fully localized from Day 1. It must support runtime language switching without requiring an app restart (initial support: English `en` and German `de`).
- **Separation of Concerns**: Hardcoding visible UI strings is strictly prohibited. All labels, tooltips, shortcuts descriptions, and system notifications must be queried via i18n keys.
- **Source Code Language**: The entire underlying codebase (Rust backend, TypeScript frontend, data models, comments, tests) is strictly authored and maintained in English.

---

## 2. Supported Platforms & Target Environments

| Platform | Minimum Version | Target Architectures | Notes |
| :--- | :--- | :--- | :--- |
| **Windows** | Windows 10 (1809+) & 11 | x86_64, aarch64 | WebView2 runtime |
| **macOS** | macOS 12 (Monterey) + | Apple Silicon (M1-M4), x86_64 | Native WebKit |
| **Linux** | Ubuntu 22.04 LTS, Debian 12, Fedora 39, Arch | x86_64, aarch64 (Raspberry Pi OS 64) | WebKitGTK 4.1+, Wayland & X11 |

---

## 3. Functional Requirements

### 3.1 Song Management & Typography
* **REQ-SONG-01 (Formats):** Native import/export of SongBeamer (`.sng`), OpenLyrics XML, ChordPro (`.cho`/`.chordpro`), and plain text.
* **REQ-SONG-02 (Storage):** Plain-file file system hierarchy for zero-lock-in portability, supplemented by an in-memory/SQLite index for sub-10ms full-text search.
* **REQ-SONG-03 (Auto-Font Sizing):** Algorithmic dynamic font-scaling calculating optimal size so text fills the designated safe area without overflowing or breaking words awkwardly.
* **REQ-SONG-04 (Legibility Engine):** Configurable drop-shadows, outlines/strokes, semi-transparent backing boxes, and line-height controls to maintain legibility over bright or high-contrast backgrounds.
* **REQ-SONG-05 (Multilingual Lyrics):** Support for multi-language verse pairs (e.g., German/English, Ukrainian/German) rendered in synchronized dual-line blocks or distinct colors.
* **REQ-SONG-06 (Chords & Transposition):** 
  * ChordPro inline chords rendered precisely above corresponding syllables.
  * Real-time transposition (+/- semitones, sharp/flat preference).
  * Chords visible on Stage Monitor / Musician View, automatically stripped from Audience Beamer View.
* **REQ-SONG-07 (Live Editing):** Real-time text corrections in the Control UI without interrupting the active projection.
* **REQ-SONG-08 (1:1 WYSIWYG Parity & Dynamic Aspect Ratio):**
  * Thumbnail cards in the Slide Deck and the Beamer Preview mirror the actual Beamer projection 1:1 in relative layout, font metrics, margins, and line breaks.
  * Preview card aspect ratios dynamically bind to the configured Beamer aspect ratio (16:9, 16:10, 4:3).
* **REQ-SONG-09 (Deterministic SNG Line Breaks & Two-Boundary Sizing):**
  * Line breaks are strictly dictated by the authored `.sng` file. The software never applies automatic word wrapping.
  * Slide font size is determined deterministically by `min(boundary_horizontal, boundary_vertical)`:
    - Horizontal boundary: longest line fits inside the safe width (~88% container width, 6% side margins).
    - Vertical boundary: total lines fit inside the safe height (~90% container height, 5% vertical margins).
    - No text overflow, no ellipsis (`...`) clipping, and no artificial clamp floors that violate container boundaries.

### 3.2 Scripture & Bible Module
* **REQ-BIB-01 (Public Domain Bibles):** Built-in support for open SQLite/XML Bible formats (e.g., Zefania XML, OpenSong Bibles, Luther 1912, Elberfelder 1905, King James Version, World English Bible).
* **REQ-BIB-02 (Rapid Book/Chapter/Verse Parser):** Smart address input parsing short codes (e.g., `Joh 3,16`, `1Kor 13 4-8`, `Gen 1:1`) in < 20 ms.
* **REQ-BIB-03 (Scripture Search):** Instant full-text search across whole translations with snippet preview.

### 3.3 Media, Video & Presentation Slides
* **REQ-MED-01 (Images):** Support for PNG, JPEG, WebP, SVG, GIF, PSD (flattened preview extraction).
* **REQ-MED-02 (Video Playback):** Hardware-accelerated local video (MP4, WebM, MKV) for background loops and foreground videos.
* **REQ-MED-03 (Live Camera Input):** WebRTC/DirectShow/V4L2 camera capture overlay to project live video behind song lyrics.
* **REQ-MED-04 (PPTX & LibreOffice):** 
  * Headless conversion of `.pptx`, `.odp`, and `.pdf` files to cached high-res vector/raster slide decks via local toolchain or headless LibreOffice.
  * Direct thumbnail extraction from `.pptx` ZIP container structures without requiring MS Office.

### 3.4 Multi-Display & Projection Routing
* **REQ-DSP-01 (Multi-Screen Management):** Automatic enumeration of connected screens. Configurable roles:
  * Primary: Control Console.
  * Secondary: Audience Projection (borderless full screen).
  * Tertiary: Stage Monitor / Confidence Display (chords, next slide preview, clock, timer).
* **REQ-DSP-02 (Disruption-Free Blanking):** Instant global shortcuts for:
  * `F5` / `B`: Black Screen (smooth fade to black).
  * `F6` / `C`: Clear Text (keep background, hide text).
  * `F7` / `L`: Logo Display.
  * `F8` / `F`: Freeze output frame.
* **REQ-DSP-03 (Stage Display):** Shows current slide, next slide preview, current time, countdown timer, and stage alerts (e.g., "Parent of Child #42 to Nursery").

### 3.5 Dual-UI Experience (Modern Studio vs. Classic SongBeamer)
* **REQ-UI-01 (Dual Skins):**
  * **Classic Mode:** Visual layout and iconography matching legacy SongBeamer (3-column layout, classic toolbars, standard dialogs, Windows 7/XP-style dense tables).
  * **Modern Mode:** Sleek dark studio design optimized for dim control booths, dockable panels, large touch-friendly buttons, and high-DPI scaling.
* **REQ-UI-02 (Shared Muscle Memory):** Standard SongBeamer keyboard shortcuts mapped globally in both modes (`Space`/`PageDown` for next, `PageUp` for prev, number keys for verse jumping).

### 3.6 Portability & Open Source Ecosystem
* **REQ-PRT-01 (USB-Stick Portable Mode):** Self-contained execution without system installation when a `noah_data/` directory exists next to the binary.
* **REQ-PRT-02 (Reporting):** CCLI SongSelect import and copy activity log generation for VG Musikedition / CCLI reporting.
* **REQ-PRT-03 (Broadcast Integration):** Local web server emitting HTML transparent overlays for OBS Studio and NDI output stream support.