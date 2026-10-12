//! TypeScript domain models corresponding to Rust noah-core models.

export type SongId = string;
export type SlideId = string;
export type SlideIndex = number;
export type ScheduleItemId = string;
export type ScheduleId = string;

export type SectionType =
  | { type: 'Verse'; value: number }
  | { type: 'Chorus'; value?: number }
  | { type: 'PreChorus'; value?: number }
  | { type: 'Bridge'; value?: number }
  | { type: 'Intro' }
  | { type: 'Outro' }
  | { type: 'Coda' }
  | { type: 'Interlude' }
  | { type: 'Ending' }
  | { type: 'Custom'; value: string };

export type LyricToken =
  | { kind: 'Text'; text: string }
  | { kind: 'Chord'; chord: string }
  | { kind: 'ChordAndText'; chord: string; text: string };

export interface LyricLine {
  tokens: LyricToken[];
  raw_text: string;
  language_index: number;
}

export interface Slide {
  id: SlideId;
  index: SlideIndex;
  section?: SectionType;
  label: string;
  lines: LyricLine[];
  raw_content: string;
}

export interface SongMetadata {
  title: string;
  title_lang2?: string;
  author?: string;
  copyright?: string;
  ccli?: string;
  transpose?: number;
  speed?: number;
  musical_key?: string;
  font_size?: number;
  verse_order: string[];
  lang_count: number;
  custom_tags: Record<string, string>;
}

export interface Song {
  id: SongId;
  metadata: SongMetadata;
  slides: Slide[];
  raw_format?: string;
}

export type DisplayMode = 'normal' | 'black' | 'clear_text' | 'logo' | 'frozen';

export type TransitionType =
  | { type: 'Cut' }
  | { type: 'Crossfade'; duration_ms: number };

export interface AlertMessage {
  message: string;
  duration_ms: number;
  target: 'all' | 'stage_only' | 'audience_only';
}

export interface PresentationState {
  active_item: ScheduleItemId | null;
  active_slide_index: SlideIndex;
  display_mode: DisplayMode;
  overlay_alert: AlertMessage | null;
}

export type ScheduleItemType =
  | { kind: 'Song'; payload: Song }
  | { kind: 'Scripture'; payload: { reference: string; text: string; translation: string } }
  | { kind: 'Media'; payload: { path: string; media_type: 'Image' | 'Video' | 'Audio' | 'LiveCamera' } }
  | { kind: 'SlideDeck'; payload: { title: string; slide_count: number } }
  | { kind: 'Note'; payload: { text: string } };

export interface ScheduleItem {
  id: ScheduleItemId;
  title: string;
  item_type: ScheduleItemType;
  duration_seconds?: number;
  notes?: string;
}

export interface Schedule {
  id: ScheduleId;
  title: string;
  items: ScheduleItem[];
  notes?: string;
}

export interface DisplayInfo {
  id: string;
  name: string;
  width: number;
  height: number;
  scale_factor: number;
  is_primary: boolean;
  position_x: number;
  position_y: number;
}

