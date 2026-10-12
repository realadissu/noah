//! IPC event envelopes matching AGENTS.md decoupled architecture.

import type { TransitionType } from './models';

export type BeamerEvent =
  | { type: 'CHANGE_SLIDE'; slideId: string; transition: TransitionType }
  | { type: 'SET_BLANK'; mode: 'black' | 'clear' | 'logo' }
  | { type: 'ALERT_OVERLAY'; message: string; durationMs: number };
