//! IPC event envelopes matching AGENTS.md decoupled architecture.

import type { DisplayMode, Song, TransitionType } from './models';

export type BeamerEvent =
  | { type: 'CHANGE_SLIDE'; slideId: string; transition: TransitionType }
  | { type: 'SYNC_SONG'; song: Song; slideIndex: number }
  | { type: 'SET_BLANK'; mode: DisplayMode }
  | { type: 'ALERT_OVERLAY'; message: string; durationMs: number };
