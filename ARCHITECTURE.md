# ARCHITECTURE.md — NOAH Internal System Architecture

## 1. High-Level Architectural Model

NOAH uses an asynchronous **Decoupled Core-Renderer Architecture** powered by **Tauri v2**. The application separates business logic, file I/O, and hardware discovery from rendering presentation surfaces.

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                            OPERATING SYSTEM                                 │
│  (Displays, File System, GPU acceleration, WebKitGTK / WebView2 / WebKit)    │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                            NOAH RUST CORE                                   │
│                                                                             │
│  ┌────────────────────┐  ┌────────────────────┐  ┌───────────────────────┐  │
│  │ State Orchestrator │  │  Schedule Manager  │  │   File/DB Engine      │  │
│  │ (Active Slide,     │  │  (Order of Service,│  │   - .sng Parser       │  │
│  │  Black/Logo/Freeze)│  │   Runtime Items)   │  │   - SQLite Scripture  │  │
│  └─────────┬──────────┘  └─────────┬──────────┘  └───────────┬───────────┘  │
│            │                       │                         │              │
│            └───────────────────────┼─────────────────────────┘              │
│                                    │                                        │
│                           Tauri v2 IPC Router                               │
│                      (Typed JSON Events / Channels)                         │
└────────────┬───────────────────────┬──────────────────────────┬─────────────┘
             │                       │                          │
             ▼                       ▼                          ▼
 ┌──────────────────────┐ ┌──────────────────────┐  ┌──────────────────────┐
 │   Control Window     │ │    Beamer Window     │  │ Stage Monitor Window │
 │   (Operator UI)      │ │  (Audience Screen)   │  │ (Confidence Monitor) │
 │                      │ │                      │  │                      │
 │ - Svelte 5 / Runes   │ │ - Fullscreen Window  │  │ - High-contrast text │
 │ - Classic/Modern Skin│ │ - Hardware Canvas    │  │ - ChordPro notation  │
 │ - Search, Edit, Drag │ │ - Crossfade Renderer │  │ - Countdown / Clock  │
 └──────────────────────┘ └──────────────────────┘  └──────────────────────┘
```

---

## 2. Core Subsystems (Rust Backend)

### 2.1 State Orchestrator (`noah-core::state`)
The state orchestrator owns the canonical state of the live show. It runs in an asynchronous actor-like loop using `tokio::sync::watch` and `tokio::sync::broadcast`.
* `PresentationState`:
  * `active_item: Option<ScheduleItemId>`
  * `active_slide_index: usize`
  * `display_mode: DisplayMode` (`Normal`, `Black`, `ClearText`, `Logo`, `Frozen`)
  * `overlay_alert: Option<AlertMessage>`
* **Immutability & Snapshots:** Frontends receive read-only state snapshots. Any modification sends a typed command (`Command::SelectSlide { index }`) through Tauri IPC.

### 2.2 SNG & Media Engine (`noah-core::parser`)
* Implements the custom `.sng` format specification with automated character encoding detection (`encoding_rs`).
* Translates legacy SongBeamer tags into typed AST models (`Song`, `Slide`, `Metadata`).
* ChordPro parser converts inline brackets `[Am]` into tokenized lyric-chord pairs.

### 2.3 Display Supervisor (`noah-core::display`)
* Uses Tauri v2 multi-window APIs and native display enumeration.
* Maps display monitors to target window configurations:
  * Ensures the Audience Beamer window opens without frame, menu bar, or OS docks, exactly matching the target monitor's bounds.
  * Prevents OS screensavers or power-saving sleeps during active presentations using OS-level keep-awake hooks (e.g., `windows::Win32::System::Power` or macOS `IOPMAssertionCreateWithName`).

---

## 3. Frontend Architecture (Svelte 5 & TypeScript)

### 3.1 Reactive State with Svelte 5 Runes
The UI leverages `$state`, `$derived`, and `$effect` runes for instant updates with zero virtual DOM overhead:

```typescript
// src/lib/stores/presentation.svelte.ts
class PresentationStore {
  activeItem = $state<ScheduleItem | null>(null);
  activeSlideIndex = $state<number>(0);
  displayMode = $state<DisplayMode>('Normal');

  activeSlide = $derived(
    this.activeItem?.slides[this.activeSlideIndex] ?? null
  );
}

export const presentation = new PresentationStore();
```

### 3.2 Dual-Skin UI Switcher
The visual skin is completely decoupled from state and control hooks:
* `src/components/skins/ClassicSkin.svelte`: Replicates SongBeamer's toolbar structure, table density, and standard button order.
* `src/components/skins/ModernSkin.svelte`: Provides a customizable dark-mode layout with responsive panels.
* Shared presentation actions are bound to global hotkey providers (`src/lib/services/hotkeys.ts`).

---

## 4. Crash-Resilience & IPC Fallback Protocol

1. **Deadlock-Free IPC:** Command handlers in Rust return immediately after updating state or offload heavy work (file writing, DB searching) to `tokio::task::spawn_blocking`.
2. **Beamer Process Independence:**
   * If the Control Window crashes, the Beamer Window remains visible with its GPU framebuffer intact.
   * If the Beamer Window terminates, Rust's `on_window_event` detects destruction and triggers an automatic window recreation sequence.
3. **Graceful Asset Failure:** Missing background video or broken image files automatically fall back to the default background color without raising an error dialog over the audience display.