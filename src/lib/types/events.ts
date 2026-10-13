//! IPC event envelopes matching AGENTS.md decoupled architecture.

import type { DisplayMode, Song, TransitionType, AspectRatio } from './models';

export type BeamerEvent =
  | { type: 'CHANGE_SLIDE'; slideId: string; transition: TransitionType }
  | { type: 'SYNC_SONG'; song: Song; slideIndex: number; aspectRatio?: AspectRatio }
  | { type: 'SET_BLANK'; mode: DisplayMode }
  | { type: 'SET_ASPECT_RATIO'; aspectRatio: AspectRatio }
  | { type: 'ALERT_OVERLAY'; message: string; durationMs: number }
  | { type: 'REQUEST_SYNC' };
