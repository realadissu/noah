# AGENTS.md — Operational Directives for NOAH Development

> **Role & Context:** You are an elite systems architect and live-production software engineer implementing **NOAH** (*Not Only Another Hymnal* / *NOAH's Our Alternative Hymnprojector*). NOAH is a cross-platform, mission-critical presentation software used in live worship and church services. Software failures during live events cause massive public disruptions. Zero-downtime tolerance for live outputs is the governing law of this project.

---
## 0. Language, Naming & i18n Conventions
- **Codebase Language**: 100% strictly **English**. All identifiers, variable names, functions, structs, interfaces, internal log messages, error strings, Rust/TypeScript documentation comments, and Git commit messages must be in English.
- **Agent Interaction**: Conversational interactions with the user may be conducted in German, but generated technical artifacts (code, config, commits, tests) remain strictly English.
- **UI Localization (i18n)**: No hardcoded user-facing strings in templates, components, or dialogs. All UI copy must be backed by a structured localization dictionary key system from Day 1 (primary default: `en`, alongside complete `de` translations).

## 1. Absolute Directives for Code Safety & Robustness

### 1.1 The Rust Core Panic-Free Law
* **STRICT PROHIBITION:** Never use `unwrap()`, `expect()`, `panic!()`, or unchecked indexing (`slice[i]`) in production code paths.
* **Typified Errors:** Every fallible operation must return `Result<T, NoahError>` with descriptive, domain-specific error variants using `thiserror`.
* **Graceful Degradation:** If an unrecoverable data corruption occurs (e.g., malformed image, corrupted song file), log the error with structured context (`tracing::error!`), emit a telemetry warning to the Control Window, and fall back to a safe visual state (e.g., black frame or static logo). **The process must never abort.**
* **Thread Boundaries:** Background tasks, file watchers, and hardware listeners must be isolated within `tokio` or thread boundaries with `std::panic::catch_unwind` guards if calling external C-bindings or dynamic loaders.

### 1.2 Anti-Greenwashing Testing Mandate (Zero AI Cheating)
AI coding agents often write tests that trivially pass (`assert!(true)`) or mock out the critical failure paths. This is strictly prohibited:

1. **Negative-First & Fault Injection:** Every component handling external data (parsers, IPC deserializers, file loaders) must have negative tests with deliberately invalid, truncated, oversized, and randomized binary inputs.
2. **No Mocking of Core Invariants:** State synchronization between the Control Window and the Presentation/Beamer Window must be tested using actual IPC message envelopes, not through bypassed direct memory mutations.
3. **No Flaky Timing Tests:** Never use arbitrary `sleep(100ms)` to verify race conditions. Use asynchronous deterministic channels (`tokio::sync::mpsc`, `tokio::sync::watch`), explicit event waiters, and barrier synchronization.
4. **Mandatory Failure Verification:** A newly introduced regression or parser test must fail against the broken scenario before the fix is applied.

### 1.3 Zero-Dead-UI & End-to-End Pipeline Mandate
- **STRICT PROHIBITION OF DEAD / UNTESTED UI:** Never implement or present user interface controls (inputs, checkboxes, color pickers, dropdowns, buttons, sliders) that are purely cosmetic, lack functionality, or are untested. Every single element rendered in any modal, dialog, settings tab, or editor must be fully functional, backed by state, and verified by tests.
- **NO DUMMY PLACEHOLDERS IN MODALS OR EDITORS:** If a feature or setting is not yet implemented or supported by the engine, DO NOT render dummy/placeholder controls for it in modals or dialogs. Only controls that have end-to-end functionality may be displayed.
- **END-TO-END WIRING MANDATE:** Every setting in an editor or configuration dialog must be wired through the entire pipeline:
  `UI Control -> Reactive State -> Persistence / Serialization (.sng / DB) -> SlideDeck Preview -> Live Beamer Output (BeamerView.svelte)`.
  It is strictly unacceptable for a user to change a font, toggle a style, or pick a color without an immediate, tangible effect on live projection and saved files.
- **EXCLUSIVE EXCEPTION (MAIN APPLICATION TOOLBAR):** The ONLY permitted exception to this rule is inactive buttons in the Main Application Shell toolbar/menu, which serve as visible placeholders and are systematically brought to life ("mit Leben füllen") step-by-step according to the project roadmap.
- **DEFAULT INHERITANCE RIGOR:** In worship presentation, songs inherit global style profiles by default. Song-specific overrides must always be explicit opt-ins (e.g. *"Song-spezifische Anpassungen aktivieren"*). If overrides are disabled or set to default/unassigned, no cluttering or redundant override tags may be emitted into the saved `.sng` file.

---

## 2. Window & State Decoupling Architecture

* **Presenter vs. Beamer Independence:** The Beamer Window (audience projection) is an isolated renderer. The Control UI can lag, freeze, re-index databases, or drop frames without impacting the Beamer output.
* **Double Buffering:** The Beamer View must keep the current slide rendered in the GPU frame buffer. New slides are rendered in a background layer and transitioned smoothly.
* **Crash Supervision:** If the Beamer Webview process terminates unexpectedly, the Rust Core lifecycle supervisor must detect the window termination and relaunch it within 300 ms, immediately pushing the cached `ActiveDisplayState`.

---

## 3. Technology Stack & Standard Constraints

* **Platform Target:** macOS 12+, Windows 10/11 (x64 & ARM64), Linux (X11 & Wayland, systemd & non-systemd, Raspberry Pi 4/5 64-bit OS).
* **Framework:** Tauri v2 (Rust backend, web-based frontends).
* **Frontend:** Svelte 5 (Runes mode) + TypeScript + Tailwind CSS.
* **Storage:** SQLite (via `sqlx` or `rusqlite` with WAL mode enabled) + plain text `.sng` / ChordPro files on disk.
* **Media Handling:** System hardware acceleration via OS WebViews, WebGL/Canvas for typography, HTML5 Video with GPU decoding.

---

## 4. Coding Standards

### Rust (Backend)
* Enable lints: `#![warn(clippy::all, clippy::pedantic, clippy::nursery)]`.
* Use explicit, strong typing for identifiers: `SongId(Uuid)`, `SlideIndex(usize)`, `ScheduleItemId(Uuid)`.
* File paths must always be handled with `std::path::PathBuf` and sanitized against directory traversal attacks.

### TypeScript / Svelte (Frontend)
* Strict mode enabled (`"strict": true` in `tsconfig.json`).
* No `any`. Use discriminated unions for all message types:
  ```typescript
  type BeamerEvent = 
    | { type: 'CHANGE_SLIDE'; slideId: string; transition: TransitionType }
    | { type: 'SET_BLANK'; mode: 'black' | 'clear' | 'logo' }
    | { type: 'ALERT_OVERLAY'; message: string; durationMs: number };
  ```
* Avoid expensive DOM re-renders inside slide transitions; leverage hardware-accelerated CSS transforms and opacity.

## 5. Version Control

### Git Commit & Version Control Standards
- **Frequent, Atomic Commits**: Commit early and often. Never accumulate multi-step or multi-feature changes in a single commit.
- **Commit Trigger Criteria**: Create a commit immediately after:
  1. A newly created module, struct, or interface compiles cleanly.
  2. A new test suite is written and passes.
  3. A specific refactoring step or bugfix is completed.
- **Conventional Commits**: Use structured English commit messages following the Conventional Commits specification:
  - Format: `<type>(<scope>): <short imperative description>`
  - Examples:
    - `feat(parser): implement windows-1252 fallback for .sng reader`
    - `test(models): add edge cases for corrupted slide tags`
    - `fix(ipc): handle display disconnect event without panic`
- **Clean Working Tree**: Ensure the working directory is in a compilable, test-passing state before committing. Never commit broken builds.