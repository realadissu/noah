# ROADMAP_PHASES.md — Phased Implementation Roadmap for NOAH

Each phase represents a deployable milestone. **Agents must complete all Acceptance Criteria and pass the verification test suite of a phase before advancing to the next.**

---

## Phase 1: Robust Core, Domain Models & SNG Parser

### Objectives
Establish the Rust domain model, error architecture, and an infallible parser for SongBeamer `.sng` files with automated encoding detection and chord extraction.

### Tasks
- [ ] Setup cargo workspace: `crates/noah-core`, `crates/noah-parser`, `src-tauri`.
- [ ] Implement `Song`, `Slide`, `ChordPro`, and `Schedule` models with `serde` serialization.
- [ ] Implement `noah-parser::sng` with encoding detection (Windows-1252 vs. UTF-8).
- [ ] Implement chord transposition engine (`noah-core::chords`).
- [ ] Write exhaustive unit and property tests.

### Acceptance Criteria & Verification
1. **Parser Resilience:** Parser handles 1,000+ `.sng` files from diverse legacy archives without a single panic or unhandled error.
2. **Corrupted File Fuzzing:** Corrupted, truncated, or binary files fed into `parse_sng()` return structured `Err(ParseError)` results.
3. **Transposition Invariant:** Transposing chord strings up by 12 semitones returns enharmonically equivalent original chords.

---

## Phase 2: Tauri v2 Dual-Window & Display Routing

### Objectives
Initialize Tauri v2 with isolated `control` and `beamer` windows, IPC communication, and hardware display detection.

### Tasks
- [ ] Setup Tauri v2 with multi-window configuration in `tauri.conf.json`.
- [ ] Implement display enumeration service (`noah-core::display`) identifying primary and secondary monitors.
- [ ] Build window manager routing the borderless fullscreen Beamer view to the secondary display (or a floating preview window if only one monitor exists).
- [ ] Implement bidirectional state synchronization via Tauri IPC events.

### Acceptance Criteria & Verification
1. **Window Placement:** Beamer window automatically positions on Screen 2 with 0px borders and no OS window decorations.
2. **Latency Guarantee:** Triggering a slide change in the Control window reflects in the Beamer window in $\le 16\text{ ms}$ (under 1 frame at 60 Hz).
3. **Single-Screen Fallback:** Running on a laptop with a single monitor creates a scalable preview canvas without crashing.

---

## Phase 3: Typography, Dynamic Font Scaling & Presentation Engine

### Objectives
Build the high-fidelity presentation renderer with dynamic text scaling, outlines, shadows, and smooth transitions.

### Tasks
- [ ] Implement HTML5 Canvas / WebGL slide renderer in the Beamer window.
- [ ] Implement binary-search dynamic text scaling ensuring text fills available canvas without edge clipping.
- [ ] Implement CSS/WebGL text outline, glow, and shadow rendering.
- [ ] Implement transition effects (Cut, Crossfade $0\text{--}1000\text{ ms}$).
- [ ] Implement Blanking modes (Black, Clear Text, Logo, Freeze).

### Acceptance Criteria & Verification
1. **Text Containment:** Text scaling test runs across 50 extreme text lengths on resolutions from $800 \times 600$ to $3840 \times 2160$; zero text cutoffs occur.
2. **Smooth Transitions:** 60 FPS maintained during crossfade transitions between slides with high-res background images.

---

## Phase 4: Order of Service (Ablaufplan) & Scripture Module

### Objectives
Implement the complete schedule management workflow and offline Bible search engine.

### Tasks
- [ ] Build drag-and-drop Schedule manager in Svelte 5 (`.col` / `.noah-schedule` format).
- [ ] Implement SQLite-backed scripture engine with full-text search (FTS5).
- [ ] Implement smart reference parser (`Joh 3:16`, `1. Mose 1, 1-5`).
- [ ] Implement quick search modal for songs with keyboard navigation.

### Acceptance Criteria & Verification
1. **Scripture Search Speed:** Search for any verse across a 31,000-verse Bible database executes in $\le 15\text{ ms}$.
2. **Reordering Integrity:** Dragging items in the schedule updates presentation order without affecting currently live slide index.

---

## Phase 5: Dual UI Skins & Stage Monitor

### Objectives
Deliver the dual-skin interface (Classic SongBeamer vs. Modern Studio) and dedicated confidence monitor output.

### Tasks
- [ ] Implement `ClassicSkin.svelte` matching SongBeamer layout, toolbars, and color hierarchy.
- [ ] Implement `ModernSkin.svelte` with dark mode, collapsibles, and responsive sizing.
- [ ] Add skin toggle in preferences and top header.
- [ ] Implement Stage Monitor window showing chords, next-slide preview, time, and alerts.
- [ ] Map legacy SongBeamer shortcuts globally across both skins.

### Acceptance Criteria & Verification
1. **Shortcut Parity:** Pressing `Space`, `PageDown`, `F5`, `F6`, `F7` performs identical operations in both Classic and Modern modes.
2. **Skin Swap Test:** Toggling between Classic and Modern modes retains exact application state, selection, and live projection without flickering.