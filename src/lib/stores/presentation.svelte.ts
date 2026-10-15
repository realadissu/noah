//! Presentation state store using Svelte 5 runes.

import type {
  DisplayMode,
  Song,
  Slide,
  DisplayInfo,
  ScheduleItem,
  AspectRatio,
  SongSearchResult,
  ScanSummary,
  FileLoadResult,
} from '$lib/types/models';
import { parseSng, expandSlidesByVerseOrder } from '$lib/utils/sngParser';
import { t, i18n } from '$lib/i18n';
import { PRESENTATION_BACKGROUNDS, type BackgroundItem, isImageBackground } from '$lib/data/backgrounds';

async function invokeTauri<T>(cmd: string, args?: Record<string, unknown>): Promise<T | null> {
  if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<T>(cmd, args);
    } catch (err) {
      console.warn(`IPC invoke failed for ${cmd}:`, err);
      return null;
    }
  }
  return null;
}

// Sample default song for instant preview
export const DEFAULT_SONG: Song = {
  id: '11111111-1111-1111-1111-111111111111',
  metadata: {
    title: 'Lobe den Herrn, meine Seele',
    author: 'Norbert Kissel',
    musical_key: 'D',
    verse_order: ['Refrain', 'Vers 1', 'Refrain', 'Vers 2'],
    lang_count: 1,
    custom_tags: {},
  },
  slides: [
    {
      id: '11111111-1111-1111-1111-111111111112',
      index: 0,
      label: 'Refrain',
      section: { type: 'Chorus' },
      raw_content: '[D]Lobe den Herrn, [G]meine Seele,\nund [A]alles in mir seinen [D]heiligen Namen.\n[D]Lobe den Herrn, [G]meine Seele,\nund [A]vergiss nicht, was er dir [D]Gutes getan.',
      lines: [
        {
          raw_text: '[D]Lobe den Herrn, [G]meine Seele,',
          language_index: 0,
          tokens: [
            { kind: 'ChordAndText', chord: 'D', text: 'Lobe den Herrn, ' },
            { kind: 'ChordAndText', chord: 'G', text: 'meine Seele,' },
          ],
        },
        {
          raw_text: 'und [A]alles in mir seinen [D]heiligen Namen.',
          language_index: 0,
          tokens: [
            { kind: 'Text', text: 'und ' },
            { kind: 'ChordAndText', chord: 'A', text: 'alles in mir seinen ' },
            { kind: 'ChordAndText', chord: 'D', text: 'heiligen Namen.' },
          ],
        },
        {
          raw_text: '[D]Lobe den Herrn, [G]meine Seele,',
          language_index: 0,
          tokens: [
            { kind: 'ChordAndText', chord: 'D', text: 'Lobe den Herrn, ' },
            { kind: 'ChordAndText', chord: 'G', text: 'meine Seele,' },
          ],
        },
        {
          raw_text: 'und [A]vergiss nicht, was er dir [D]Gutes getan.',
          language_index: 0,
          tokens: [
            { kind: 'Text', text: 'und ' },
            { kind: 'ChordAndText', chord: 'A', text: 'vergiss nicht, was er dir ' },
            { kind: 'ChordAndText', chord: 'D', text: 'Gutes getan.' },
          ],
        },
      ],
    },
    {
      id: '11111111-1111-1111-1111-111111111113',
      index: 1,
      label: 'Vers 1',
      section: { type: 'Verse', value: 1 },
      raw_content: 'Der dir [Em]alle deine [A]Sünden vergibt\nund [F#m]heilet alle deine [Bm]Gebrechen,\nder dein [Em]Leben vom Ver[A]derben erlöst,\nder dich [G]krönet mit Gnade und [A]Barmherzigkeit.',
      lines: [
        {
          raw_text: 'Der dir [Em]alle deine [A]Sünden vergibt',
          language_index: 0,
          tokens: [
            { kind: 'Text', text: 'Der dir ' },
            { kind: 'ChordAndText', chord: 'Em', text: 'alle deine ' },
            { kind: 'ChordAndText', chord: 'A', text: 'Sünden vergibt' },
          ],
        },
        {
          raw_text: 'und [F#m]heilet alle deine [Bm]Gebrechen,',
          language_index: 0,
          tokens: [
            { kind: 'Text', text: 'und ' },
            { kind: 'ChordAndText', chord: 'F#m', text: 'heilet alle deine ' },
            { kind: 'ChordAndText', chord: 'Bm', text: 'Gebrechen,' },
          ],
        },
        {
          raw_text: 'der dein [Em]Leben vom Ver[A]derben erlöst,',
          language_index: 0,
          tokens: [
            { kind: 'Text', text: 'der dein ' },
            { kind: 'ChordAndText', chord: 'Em', text: 'Leben vom Ver' },
            { kind: 'ChordAndText', chord: 'A', text: 'derben erlöst,' },
          ],
        },
        {
          raw_text: 'der dich [G]krönet mit Gnade und [A]Barmherzigkeit.',
          language_index: 0,
          tokens: [
            { kind: 'Text', text: 'der dich ' },
            { kind: 'ChordAndText', chord: 'G', text: 'krönet mit Gnade und ' },
            { kind: 'ChordAndText', chord: 'A', text: 'Barmherzigkeit.' },
          ],
        },
      ],
    },
    {
      id: '11111111-1111-1111-1111-111111111114',
      index: 2,
      label: 'Vers 2',
      section: { type: 'Verse', value: 2 },
      raw_content: 'Der deinen [Em]Mund fröhlich [A]macht,\nund du wieder [F#m]jung wirst wie ein [Bm]Adler.\nDer Herr [Em]schafft Ge[A]rechtigkeit\nund Ge[G]richt allen, die Ge[A]walt leiden.',
      lines: [
        {
          raw_text: 'Der deinen [Em]Mund fröhlich [A]macht,',
          language_index: 0,
          tokens: [
            { kind: 'Text', text: 'Der deinen ' },
            { kind: 'ChordAndText', chord: 'Em', text: 'Mund fröhlich ' },
            { kind: 'ChordAndText', chord: 'A', text: 'macht,' },
          ],
        },
        {
          raw_text: 'und du wieder [F#m]jung wirst wie ein [Bm]Adler.',
          language_index: 0,
          tokens: [
            { kind: 'Text', text: 'und du wieder ' },
            { kind: 'ChordAndText', chord: 'F#m', text: 'jung wirst wie ein ' },
            { kind: 'ChordAndText', chord: 'Bm', text: 'Adler.' },
          ],
        },
        {
          raw_text: 'Der Herr [Em]schafft Ge[A]rechtigkeit',
          language_index: 0,
          tokens: [
            { kind: 'Text', text: 'Der Herr ' },
            { kind: 'ChordAndText', chord: 'Em', text: 'schafft Ge' },
            { kind: 'ChordAndText', chord: 'A', text: 'rechtigkeit' },
          ],
        },
        {
          raw_text: 'und Ge[G]richt allen, die Ge[A]walt leiden.',
          language_index: 0,
          tokens: [
            { kind: 'Text', text: 'und Ge' },
            { kind: 'ChordAndText', chord: 'G', text: 'richt allen, die Ge' },
            { kind: 'ChordAndText', chord: 'A', text: 'walt leiden.' },
          ],
        },
      ],
    },
  ],
};

const SECOND_SAMPLE_SONG: Song = {
  id: '22222222-2222-2222-2222-222222222222',
  metadata: {
    title: 'Großer Gott, wir loben dich',
    author: 'Ignaz Franz',
    musical_key: 'F',
    verse_order: ['Strophe 1', 'Strophe 2'],
    lang_count: 1,
    custom_tags: {},
  },
  slides: [
    {
      id: '22222222-2222-2222-2222-222222222223',
      index: 0,
      label: 'Strophe 1',
      section: { type: 'Verse', value: 1 },
      raw_content: '[F]Großer Gott, wir [Bb]loben [F]dich,\n[C]Herr, wir preisen [F]deine Stärke.\n[F]Vor dir beugt die [Bb]Erde [F]sich\n[C]und bewundert [F]deine Werke.',
      lines: [
        {
          raw_text: '[F]Großer Gott, wir [Bb]loben [F]dich,',
          language_index: 0,
          tokens: [
            { kind: 'ChordAndText', chord: 'F', text: 'Großer Gott, wir ' },
            { kind: 'ChordAndText', chord: 'Bb', text: 'loben ' },
            { kind: 'ChordAndText', chord: 'F', text: 'dich,' },
          ],
        },
        {
          raw_text: '[C]Herr, wir preisen [F]deine Stärke.',
          language_index: 0,
          tokens: [
            { kind: 'ChordAndText', chord: 'C', text: 'Herr, wir preisen ' },
            { kind: 'ChordAndText', chord: 'F', text: 'deine Stärke.' },
          ],
        },
        {
          raw_text: '[F]Vor dir beugt die [Bb]Erde [F]sich',
          language_index: 0,
          tokens: [
            { kind: 'ChordAndText', chord: 'F', text: 'Vor dir beugt die ' },
            { kind: 'ChordAndText', chord: 'Bb', text: 'Erde ' },
            { kind: 'ChordAndText', chord: 'F', text: 'sich' },
          ],
        },
        {
          raw_text: '[C]und bewundert [F]deine Werke.',
          language_index: 0,
          tokens: [
            { kind: 'ChordAndText', chord: 'C', text: 'und bewundert ' },
            { kind: 'ChordAndText', chord: 'F', text: 'deine Werke.' },
          ],
        },
      ],
    },
    {
      id: '22222222-2222-2222-2222-222222222224',
      index: 1,
      label: 'Strophe 2',
      section: { type: 'Verse', value: 2 },
      raw_content: '[F]Wie du warst vor [Bb]aller [F]Zeit,\n[C]so bleibst du in [F]Ewigkeit.',
      lines: [
        {
          raw_text: '[F]Wie du warst vor [Bb]aller [F]Zeit,',
          language_index: 0,
          tokens: [
            { kind: 'ChordAndText', chord: 'F', text: 'Wie du warst vor ' },
            { kind: 'ChordAndText', chord: 'Bb', text: 'aller ' },
            { kind: 'ChordAndText', chord: 'F', text: 'Zeit,' },
          ],
        },
        {
          raw_text: '[C]so bleibst du in [F]Ewigkeit.',
          language_index: 0,
          tokens: [
            { kind: 'ChordAndText', chord: 'C', text: 'so bleibst du in ' },
            { kind: 'ChordAndText', chord: 'F', text: 'Ewigkeit.' },
          ],
        },
      ],
    },
  ],
};

class PresentationStore {
  activeSong = $state<Song | null>(DEFAULT_SONG);
  activeSlideIndex = $state<number>(0);
  displayMode = $state<DisplayMode>('normal');
  showChords = $state<boolean>(false);
  detectedEncoding = $state<string>('UTF-8');
  fontScale = $state<number>(1.0);
  uiScale = $state<number>(1.0);
  uiScaleMode = $state<'auto' | 'custom'>('auto');

  // Appearance & Themes
  theme = $state<'dark' | 'light'>('light');
  uiMode = $state<'classic' | 'modern'>('classic');
  isSettingsOpen = $state<boolean>(false);

  // Song Editor Modal State (SongBeamer parity)
  isSongEditorOpen = $state<boolean>(false);
  editingSong = $state<Song | null>(null);
  editingSongFilePath = $state<string | null>(null);

  // Right Column Drawer visibility (hidden by default per user requirement)
  isRightPanelOpen = $state<boolean>(false);

  // Number of slides per row in Slide Deck (2 to 6, per user request)
  slidesPerRow = $state<number>(2);

  // Aspect ratio for slide containers (16:9, 16:10, 4:3, Auto)
  aspectRatio = $state<AspectRatio>('16:9');
  aspectRatioMode = $state<'auto' | AspectRatio>('auto');

  // Presentation slides sequence expanded by verse_order if defined, while preserving song.slides canonical
  get activeSlides(): Slide[] {
    if (!this.activeSong) return [];
    if (this.activeSong.metadata.verse_order && this.activeSong.metadata.verse_order.length > 0) {
      return expandSlidesByVerseOrder(this.activeSong.slides, this.activeSong.metadata.verse_order);
    }
    return this.activeSong.slides;
  }

  // Cross-window channel for browser tabs / windows parity
  private beamerChannel: BroadcastChannel | null = null;

  constructor() {
    this.initCrossWindowSync();
  }

  private initCrossWindowSync() {
    if (typeof window === 'undefined') return;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        this.beamerChannel = new BroadcastChannel('noah-beamer-channel');
        this.beamerChannel.onmessage = (e) => {
          if (e.data?.type === 'REQUEST_SYNC') {
            this.syncAllToBeamer();
          }
        };
      }
      this.saveBeamerSnapshot();
    } catch {}
  }

  private emitBeamerEvent(event: Record<string, unknown>) {
    if (typeof window === 'undefined') return;
    try {
      if (!this.beamerChannel && typeof BroadcastChannel !== 'undefined') {
        this.beamerChannel = new BroadcastChannel('noah-beamer-channel');
      }
      this.beamerChannel?.postMessage(event);
    } catch {}

    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('noah_beamer_sync', JSON.stringify({ ...event, _t: Date.now() }));
      }
    } catch {}
  }

  saveBeamerSnapshot() {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(
        'noah_beamer_snapshot',
        JSON.stringify({
          song: this.activeSong,
          slideIndex: this.activeSlideIndex,
          displayMode: this.displayMode,
          aspectRatio: this.aspectRatio,
        })
      );
    } catch {}
  }

  syncAllToBeamer() {
    if (this.activeSong) {
      this.emitBeamerEvent({
        type: 'SYNC_SONG',
        song: this.activeSong,
        slideIndex: this.activeSlideIndex,
        aspectRatio: this.aspectRatio,
      });
      const slide = this.activeSlides[this.activeSlideIndex] ?? this.activeSong.slides[this.activeSlideIndex];
      if (slide) {
        this.emitBeamerEvent({
          type: 'CHANGE_SLIDE',
          slideId: slide.id,
          transition: 'Crossfade',
        });
      }
    }
    this.emitBeamerEvent({
      type: 'SET_BLANK',
      mode: this.displayMode,
    });
    this.emitBeamerEvent({
      type: 'SET_ASPECT_RATIO',
      aspectRatio: this.aspectRatio,
    });
    this.saveBeamerSnapshot();
  }

  // Multi-language filter (SongBeamer parity: 'all', 1, 2, 3)
  activeLanguageFilter = $state<number | 'all'>('all');

  // Ablaufplan (Order of Service)
  schedule = $state<ScheduleItem[]>([
    {
      id: '33333333-3333-3333-3333-333333333331',
      title: 'Lobe den Herrn, meine Seele',
      item_type: { kind: 'Song', payload: DEFAULT_SONG },
      duration_seconds: 240,
    },
    {
      id: '33333333-3333-3333-3333-333333333332',
      title: 'Schriftlesung: Psalm 103, 1-5',
      item_type: {
        kind: 'Scripture',
        payload: {
          reference: 'Psalm 103, 1-5',
          text: 'Lobe den HERRN, meine Seele, und was in mir ist, seinen heiligen Namen!',
          translation: 'Luther 2017',
        },
      },
      duration_seconds: 120,
    },
    {
      id: '33333333-3333-3333-3333-333333333333',
      title: 'Großer Gott, wir loben dich',
      item_type: { kind: 'Song', payload: SECOND_SAMPLE_SONG },
      duration_seconds: 300,
    },
    {
      id: '33333333-3333-3333-3333-333333333334',
      title: 'Gemeindenachrichten & Kollekte',
      item_type: { kind: 'Note', payload: { text: 'Informationen zum Gemeindefreizeit-Wochenende' } },
      duration_seconds: 180,
    },
  ]);
  activeScheduleIndex = $state<number>(0);

  // Display & Dual-window state
  isBeamerActive = $state<boolean>(false);
  connectedDisplays = $state<DisplayInfo[]>([]);
  activeDisplay = $state<DisplayInfo | null>(null);

  // Standard Directories & Library state
  songsDirectory = $state<string>('');
  backgroundsDirectory = $state<string>('');
  schedulesDirectory = $state<string>('');
  customBackgrounds = $state<BackgroundItem[]>([]);
  isScanning = $state<boolean>(false);
  scanSummary = $state<ScanSummary | null>(null);

  activeSlide = $derived<Slide | null>(
    this.activeSong?.slides[this.activeSlideIndex] ?? null
  );

  activeScheduleItem = $derived<ScheduleItem | null>(
    this.schedule[this.activeScheduleIndex] ?? null
  );

  init() {
    if (typeof localStorage !== 'undefined') {
      const savedTheme = localStorage.getItem('noah_theme');
      if (savedTheme === 'light' || savedTheme === 'dark') {
        this.theme = savedTheme;
      }
      if (typeof document !== 'undefined') {
        document.documentElement.classList.toggle('dark', this.theme === 'dark');
      }
      const savedUiMode = localStorage.getItem('noah_ui_mode');
      if (savedUiMode === 'classic' || savedUiMode === 'modern') {
        this.uiMode = savedUiMode;
      }
      const savedSongsDir = localStorage.getItem('noah_songs_dir');
      if (savedSongsDir) {
        this.songsDirectory = savedSongsDir;
        this.scanSongsDirectory(savedSongsDir);
      }
      const savedBackgroundsDir = localStorage.getItem('noah_backgrounds_dir');
      if (savedBackgroundsDir) {
        this.backgroundsDirectory = savedBackgroundsDir;
        this.scanBackgroundsDirectory(savedBackgroundsDir);
      }
      const savedSchedulesDir = localStorage.getItem('noah_schedules_dir');
      if (savedSchedulesDir) {
        this.schedulesDirectory = savedSchedulesDir;
      }
      const savedCustomBg = localStorage.getItem('noah_custom_backgrounds');
      if (savedCustomBg) {
        try {
          this.customBackgrounds = JSON.parse(savedCustomBg);
        } catch (e) {
          console.warn('Failed to parse saved custom backgrounds:', e);
        }
      }
      const savedScaleMode = localStorage.getItem('noah_ui_scale_mode');
      if (savedScaleMode === 'custom') {
        const savedUiScale = localStorage.getItem('noah_ui_scale');
        if (savedUiScale) {
          const parsed = parseFloat(savedUiScale);
          // If custom scale was set to exact 1.0 in older session, upgrade to responsive auto-scale
          if (!isNaN(parsed) && parsed !== 1.0 && parsed >= 0.75 && parsed <= 2.5) {
            this.uiScaleMode = 'custom';
            this.uiScale = parsed;
          } else {
            this.uiScaleMode = 'auto';
            this.updateAutoUiScale();
          }
        } else {
          this.uiScaleMode = 'auto';
          this.updateAutoUiScale();
        }
      } else {
        this.uiScaleMode = 'auto';
        this.updateAutoUiScale();
      }

      const savedCols = localStorage.getItem('noah_slides_per_row');
      if (savedCols) {
        const parsed = parseInt(savedCols, 10);
        if (parsed >= 2 && parsed <= 6) {
          this.slidesPerRow = parsed;
        }
      }
    } else {
      this.updateAutoUiScale();
    }

    // Dynamic resize listener to automatically adjust UI scaling in Auto mode
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', () => {
        if (this.uiScaleMode === 'auto') {
          this.updateAutoUiScale();
        }
      });

      // Cross-window BroadcastChannel listener
      if (typeof BroadcastChannel !== 'undefined') {
        try {
          this.beamerChannel = new BroadcastChannel('noah-beamer-channel');
          this.beamerChannel.onmessage = (e) => {
            if (e.data?.type === 'REQUEST_SYNC') {
              this.syncAllToBeamer();
            }
          };
        } catch {}
      }
    }

    // Automatically sync initial active song to Tauri backend and Beamer windows
    if (this.activeSong) {
      invokeTauri('sync_active_song', {
        song: this.activeSong,
        slideIndex: this.activeSlideIndex,
      });
      invokeTauri('set_display_mode', { mode: this.displayMode });
      this.syncAllToBeamer();
    }
  }

  updateAutoUiScale() {
    if (typeof window === 'undefined') return;
    const h = window.innerHeight;
    const w = window.innerWidth;
    const dpr = typeof window.devicePixelRatio === 'number' ? window.devicePixelRatio : 1;

    // Cross-platform ergonomic calibration (Windows, macOS, Linux):
    // Standard Win32 Delphi SongBeamer UI uses 11-12px fonts and 24-28px buttons.
    // In modern browser engines and high-density screens, 1.0x baseline makes 11px tiny.
    // We calibrate so that default desktop viewing gives a comfortable, natural, readable size:
    //
    // 4K UHD or UltraWide screens:
    // (w >= 2200 or h >= 1200 or (w >= 1600 && dpr >= 1.75)) -> 1.45x
    //
    // QHD or High-DPI laptops:
    // (w >= 1400 or h >= 800 or dpr >= 1.25) -> 1.25x
    //
    // Standard 1080p desktop browser:
    // (w >= 1100 or h >= 650) -> 1.18x
    //
    // Compact screens (w < 1100 or h < 650): -> 1.0x
    let target = 1.18;
    if (w >= 2200 || h >= 1200 || (w >= 1600 && dpr >= 1.75)) {
      target = 1.45;
    } else if (w >= 1400 || h >= 800 || dpr >= 1.25) {
      target = 1.25;
    } else if (w >= 1100 || h >= 650) {
      target = 1.18;
    } else {
      target = 1.0;
    }
    this.uiScale = target;
  }

  setUiScale(scale: number) {
    this.uiScaleMode = 'custom';
    this.uiScale = Math.min(2.5, Math.max(0.75, Math.round(scale * 100) / 100));
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('noah_ui_scale_mode', 'custom');
      localStorage.setItem('noah_ui_scale', this.uiScale.toString());
    }
  }

  zoomIn() {
    this.setUiScale(this.uiScale + 0.1);
  }

  zoomOut() {
    this.setUiScale(this.uiScale - 0.1);
  }

  resetZoom() {
    this.uiScaleMode = 'auto';
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('noah_ui_scale_mode', 'auto');
    }
    this.updateAutoUiScale();
  }

  toggleZoomMode() {
    if (this.uiScaleMode === 'auto') {
      this.setUiScale(1.0);
    } else {
      this.resetZoom();
    }
  }

  newSchedule() {
    this.schedule = [];
    this.activeScheduleIndex = -1;
    this.activeSong = null;
    this.activeSlideIndex = 0;
  }

  createNewSong() {
    const isDe = i18n.locale === 'de';
    const defaultLabel = isDe ? 'Vers 1' : 'Verse 1';
    const defaultText = isDe ? 'Text hier eingeben...' : 'Enter lyrics here...';
    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'song-' + Date.now();
    const newSong: Song = {
      id,
      metadata: {
        title: isDe ? 'Neues Lied' : 'New Song',
        author: '',
        verse_order: [defaultLabel],
        lang_count: 1,
        custom_tags: {},
      },
      slides: [
        {
          id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'slide-' + Date.now(),
          index: 0,
          label: defaultLabel,
          section: { type: 'Verse', value: 1 },
          raw_content: defaultText,
          lines: [
            {
              raw_text: defaultText,
              language_index: 0,
              tokens: [{ kind: 'Text', text: defaultText }],
            },
          ],
        },
      ],
    };
    this.openSongEditor(newSong);
  }

  toggleTheme() {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('noah_theme', this.theme);
    }
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', this.theme === 'dark');
    }
  }

  setTheme(theme: 'dark' | 'light') {
    this.theme = theme;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('noah_theme', theme);
    }
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', this.theme === 'dark');
    }
  }

  toggleUiMode() {
    this.uiMode = this.uiMode === 'classic' ? 'modern' : 'classic';
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('noah_ui_mode', this.uiMode);
    }
  }

  setUiMode(mode: 'classic' | 'modern') {
    this.uiMode = mode;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('noah_ui_mode', mode);
    }
  }

  setSlidesPerRow(count: number) {
    const clamped = Math.max(2, Math.min(6, Math.round(count)));
    this.slidesPerRow = clamped;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('noah_slides_per_row', String(clamped));
    }
  }

  toggleSettings() {
    this.isSettingsOpen = !this.isSettingsOpen;
  }

  toggleRightPanel() {
    this.isRightPanelOpen = !this.isRightPanelOpen;
  }

  setAspectRatio(mode: 'auto' | AspectRatio) {
    this.aspectRatioMode = mode;
    if (mode === 'auto') {
      this.recalculateAutoAspectRatio();
    } else {
      this.aspectRatio = mode;
      this.emitBeamerEvent({
        type: 'SET_ASPECT_RATIO',
        aspectRatio: this.aspectRatio,
      });
      this.saveBeamerSnapshot();
    }
  }

  recalculateAutoAspectRatio() {
    const prev = this.aspectRatio;
    if (this.activeDisplay && this.activeDisplay.width > 0 && this.activeDisplay.height > 0) {
      const ratio = this.activeDisplay.width / this.activeDisplay.height;
      if (ratio >= 1.7) {
        this.aspectRatio = '16:9';
      } else if (ratio >= 1.55) {
        this.aspectRatio = '16:10';
      } else {
        this.aspectRatio = '4:3';
      }
    } else {
      this.aspectRatio = '16:9';
    }
    if (this.aspectRatio !== prev) {
      this.emitBeamerEvent({
        type: 'SET_ASPECT_RATIO',
        aspectRatio: this.aspectRatio,
      });
      this.saveBeamerSnapshot();
    }
  }

  setSong(song: Song, encoding: string = 'UTF-8') {
    this.activeSong = song;
    this.activeSlideIndex = 0;
    this.detectedEncoding = encoding;

    invokeTauri('sync_active_song', {
      song,
      slideIndex: 0,
    });
    this.emitBeamerEvent({
      type: 'SYNC_SONG',
      song,
      slideIndex: 0,
    });
    const slide = this.activeSlides[0] ?? song.slides[0];
    if (slide) {
      this.emitBeamerEvent({
        type: 'CHANGE_SLIDE',
        slideId: slide.id,
        transition: 'Crossfade',
      });
    }
    this.saveBeamerSnapshot();
  }

  selectScheduleItem(index: number) {
    if (index >= 0 && index < this.schedule.length) {
      this.activeScheduleIndex = index;
      const item = this.schedule[index];
      if (item && item.item_type.kind === 'Song') {
        this.setSong(item.item_type.payload);
      }
    }
  }

  addScheduleItem(item: ScheduleItem) {
    this.schedule.push(item);
  }

  removeScheduleItem(index: number) {
    if (index >= 0 && index < this.schedule.length) {
      this.schedule.splice(index, 1);
      if (this.activeScheduleIndex >= this.schedule.length) {
        this.activeScheduleIndex = Math.max(0, this.schedule.length - 1);
      }
    }
  }

  removeFromSchedule(index: number) {
    this.removeScheduleItem(index);
  }

  reorderSchedule(fromIndex: number, toIndex: number, position: 'before' | 'after' = 'after') {
    if (
      fromIndex < 0 ||
      fromIndex >= this.schedule.length ||
      toIndex < 0 ||
      toIndex >= this.schedule.length
    ) {
      return;
    }
    if (fromIndex === toIndex) return;

    const [item] = this.schedule.splice(fromIndex, 1);
    if (!item) return;

    let target = toIndex;
    if (fromIndex < toIndex) {
      target = position === 'after' ? toIndex : toIndex - 1;
    } else {
      target = position === 'after' ? toIndex + 1 : toIndex;
    }

    target = Math.max(0, Math.min(this.schedule.length, target));
    this.schedule.splice(target, 0, item);
    this.activeScheduleIndex = target;
  }

  moveScheduleItem(fromIndex: number, toIndex: number) {
    if (
      fromIndex >= 0 &&
      fromIndex < this.schedule.length &&
      toIndex >= 0 &&
      toIndex < this.schedule.length
    ) {
      const [item] = this.schedule.splice(fromIndex, 1);
      if (item) {
        this.schedule.splice(toIndex, 0, item);
        this.activeScheduleIndex = toIndex;
      }
    }
  }

  moveScheduleItemUp(index: number) {
    if (index > 0 && index < this.schedule.length) {
      const [item] = this.schedule.splice(index, 1);
      if (item) {
        this.schedule.splice(index - 1, 0, item);
        this.activeScheduleIndex = index - 1;
      }
    }
  }

  moveScheduleItemDown(index: number) {
    if (index >= 0 && index < this.schedule.length - 1) {
      const [item] = this.schedule.splice(index, 1);
      if (item) {
        this.schedule.splice(index + 1, 0, item);
        this.activeScheduleIndex = index + 1;
      }
    }
  }

  nextSlide() {
    const slides = this.activeSlides;
    if (this.activeSong && this.activeSlideIndex + 1 < slides.length) {
      this.selectSlide(this.activeSlideIndex + 1);
    } else if (this.activeScheduleIndex + 1 < this.schedule.length) {
      // Advance to next item in schedule if at last slide
      this.selectScheduleItem(this.activeScheduleIndex + 1);
    }
  }

  prevSlide() {
    if (this.activeSlideIndex > 0) {
      this.selectSlide(this.activeSlideIndex - 1);
    } else if (this.activeScheduleIndex > 0) {
      // Go back to previous schedule item
      this.selectScheduleItem(this.activeScheduleIndex - 1);
      const slides = this.activeSlides;
      if (this.activeSong && slides.length > 0) {
        this.selectSlide(slides.length - 1);
      }
    }
  }

  selectSlide(index: number) {
    const slides = this.activeSlides;
    if (this.activeSong && index >= 0 && index < slides.length) {
      this.activeSlideIndex = index;
      // Selecting a slide brings it live on screen
      this.displayMode = 'normal';
      const slide = slides[index];
      if (slide) {
        invokeTauri('change_slide', {
          slideId: slide.id,
          slideIndex: index,
          transitionMs: 300,
        });
        this.emitBeamerEvent({
          type: 'CHANGE_SLIDE',
          slideId: slide.id,
          transition: 'Crossfade',
        });
        this.emitBeamerEvent({
          type: 'SET_BLANK',
          mode: 'normal',
        });
        this.saveBeamerSnapshot();
      }
    }
  }

  setDisplayMode(mode: DisplayMode) {
    this.displayMode = mode;
    invokeTauri('set_display_mode', { mode });
    this.emitBeamerEvent({
      type: 'SET_BLANK',
      mode,
    });
    this.saveBeamerSnapshot();
  }

  toggleChords() {
    this.showChords = !this.showChords;
  }

  setFontScale(scale: number) {
    this.fontScale = Math.max(0.6, Math.min(2.0, scale));
  }

  async refreshDisplays() {
    const list = await invokeTauri<DisplayInfo[]>('list_displays');
    if (list) {
      this.connectedDisplays = list;
      if (list.length > 1 && !this.activeDisplay) {
        const secondary = list.find((d) => !d.is_primary) ?? list[0];
        if (secondary) {
          this.activeDisplay = secondary;
          if (this.aspectRatioMode === 'auto') {
            this.recalculateAutoAspectRatio();
          }
        }
      }
    }
  }

  async startBeamer(displayId?: string, mode?: DisplayMode) {
    if (mode) {
      this.displayMode = mode;
    }
    if (!this.isBeamerActive) {
      const target = await invokeTauri<DisplayInfo>('open_beamer_window', { displayId });
      if (target) {
        this.activeDisplay = target;
        this.isBeamerActive = true;
        if (this.aspectRatioMode === 'auto') {
          this.recalculateAutoAspectRatio();
        }
        // Synchronize state immediately
        if (this.activeSong) {
          await invokeTauri('sync_active_song', {
            song: this.activeSong,
            slideIndex: this.activeSlideIndex,
          });
        }
        await invokeTauri('set_display_mode', { mode: this.displayMode });
        this.syncAllToBeamer();
      } else if (typeof window !== 'undefined' && !('__TAURI_INTERNALS__' in window)) {
        // Browser fallback: open secondary presentation window on external monitor
        this.isBeamerActive = true;
        window.open('/?window=beamer', 'NoahBeamer', 'popup=yes,width=1280,height=720,menubar=no,toolbar=no');
        this.syncAllToBeamer();
      }
    } else {
      await invokeTauri('set_display_mode', { mode: this.displayMode });
      this.emitBeamerEvent({ type: 'SET_BLANK', mode: this.displayMode });
    }
  }

  async closeBeamer() {
    if (this.isBeamerActive) {
      await invokeTauri('close_beamer_window');
      this.isBeamerActive = false;
      this.emitBeamerEvent({ type: 'SET_BLANK', mode: 'black' });
    }
  }

  async toggleBeamer(displayId?: string) {
    if (this.isBeamerActive) {
      await this.closeBeamer();
    } else {
      await this.startBeamer(displayId);
    }
  }

  setSongsDirectory(path: string) {
    this.songsDirectory = path;
    if (typeof localStorage !== 'undefined') {
      if (path) {
        localStorage.setItem('noah_songs_dir', path);
      } else {
        localStorage.removeItem('noah_songs_dir');
      }
    }
  }

  async scanSongsDirectory(path?: string): Promise<ScanSummary | null> {
    const dir = path ?? this.songsDirectory;
    if (!dir) return null;
    this.isScanning = true;
    try {
      const summary = await invokeTauri<ScanSummary>('scan_songs_directory', { dirPath: dir });
      if (summary) {
        this.scanSummary = summary;
      }
      return summary;
    } finally {
      this.isScanning = false;
    }
  }

  async searchSongs(query: string, limit = 20): Promise<SongSearchResult[]> {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    // 1. Try native Tauri database search first
    const backendResults = await invokeTauri<SongSearchResult[]>('search_songs', { query, limit });
    if (backendResults && backendResults.length > 0) {
      return backendResults;
    }

    // 2. Client-side Search across Schedule + Preset & Local Song Library
    const results: SongSearchResult[] = [];
    const seenTitles = new Set<string>();

    // A. Current worship schedule items
    for (const item of this.schedule) {
      if (item.item_type.kind === 'Song') {
        const s = item.item_type.payload;
        const titleMatch = s.metadata.title.toLowerCase().includes(q);
        const authorMatch = s.metadata.author?.toLowerCase().includes(q);
        const lyricsMatch = s.slides.some((sl) => sl.raw_content.toLowerCase().includes(q));

        if (titleMatch || authorMatch || lyricsMatch) {
          const normTitle = s.metadata.title.toLowerCase();
          if (!seenTitles.has(normTitle)) {
            seenTitles.add(normTitle);
            results.push({
              id: s.id,
              title: s.metadata.title,
              author: s.metadata.author || '',
              musical_key: s.metadata.musical_key || '',
              file_path: (s as unknown as { filePath?: string }).filePath || '',
              match_snippet: lyricsMatch && !titleMatch ? 'Im Liedtext gefunden' : undefined,
            });
          }
        }
      }
    }

    // B. Built-in Worship Song Repertoire
    const sampleLibrary: Song[] = [
      DEFAULT_SONG,
      {
        id: 'lib-grosser-gott',
        metadata: {
          title: 'Großer Gott, wir loben dich',
          author: 'Ignaz Franz',
          musical_key: 'F',
          verse_order: ['Vers 1', 'Vers 2'],
          lang_count: 1,
          custom_tags: {},
        },
        slides: [
          {
            id: 'sl-gg-1',
            index: 0,
            label: 'Vers 1',
            section: { type: 'Verse', value: 1 },
            raw_content: 'Großer Gott, wir loben dich;\nHerr, wir preisen deine Stärke.\nVor dir beugt der Erdkreis sich\nund bewundert deine Werke.',
            lines: [],
          },
        ],
      },
      {
        id: 'lib-herr-ich-komme',
        metadata: {
          title: 'Herr, ich komme zu dir',
          author: 'Albert Frey',
          musical_key: 'G',
          verse_order: ['Vers 1', 'Refrain'],
          lang_count: 1,
          custom_tags: {},
        },
        slides: [
          {
            id: 'sl-hik-1',
            index: 0,
            label: 'Vers 1',
            section: { type: 'Verse', value: 1 },
            raw_content: 'Herr, ich komme zu dir,\nkann dir gar nichts bringen,\nwas dich erfreuen könnt.\nDoch du kennst mein Herz.',
            lines: [],
          },
        ],
      },
      {
        id: 'lib-abba-vater',
        metadata: {
          title: 'Abba, Vater, du bist heilig',
          author: 'Worship',
          musical_key: 'E',
          verse_order: ['Refrain'],
          lang_count: 1,
          custom_tags: {},
        },
        slides: [
          {
            id: 'sl-av-1',
            index: 0,
            label: 'Refrain',
            section: { type: 'Chorus' },
            raw_content: 'Abba, Vater, du bist heilig,\ndein Name sei erhöht in Ewigkeit.',
            lines: [],
          },
        ],
      },
    ];

    for (const s of sampleLibrary) {
      const titleMatch = s.metadata.title.toLowerCase().includes(q);
      const authorMatch = s.metadata.author?.toLowerCase().includes(q);
      const lyricsMatch = s.slides.some((sl) => sl.raw_content.toLowerCase().includes(q));

      if (titleMatch || authorMatch || lyricsMatch) {
        const normTitle = s.metadata.title.toLowerCase();
        if (!seenTitles.has(normTitle)) {
          seenTitles.add(normTitle);
          results.push({
            id: s.id,
            title: s.metadata.title,
            author: s.metadata.author || '',
            musical_key: s.metadata.musical_key || '',
            file_path: '',
            match_snippet: lyricsMatch && !titleMatch ? 'Im Liedtext gefunden' : undefined,
          });
        }
      }
    }

    return results.slice(0, limit);
  }

  addSongToSchedule(song: Song) {
    const newItem: ScheduleItem = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'item-' + Date.now(),
      title: song.metadata.title,
      item_type: { kind: 'Song', payload: song },
      duration_seconds: 240,
    };
    this.schedule.push(newItem);
    this.activeScheduleIndex = this.schedule.length - 1;
    this.setSong(song);
  }

  async addSongFromSearch(item: SongSearchResult) {
    // 1. If song already exists in current schedule, simply select it!
    const existingIndex = this.schedule.findIndex(
      (s) =>
        s.item_type.kind === 'Song' &&
        (s.item_type.payload.id === item.id || s.title.toLowerCase() === item.title.toLowerCase())
    );
    if (existingIndex >= 0) {
      this.selectScheduleItem(existingIndex);
      return;
    }

    // 2. Try loading from file path if specified
    if (item.file_path) {
      const loaded = await invokeTauri<FileLoadResult>('load_sng_file', { path: item.file_path });
      if (loaded?.song) {
        this.addSongToSchedule(loaded.song);
        return;
      }
    }

    // 3. Fallback: construct Song object from search item
    const id = item.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'song-' + Date.now());
    const newSong: Song = {
      id,
      metadata: {
        title: item.title,
        author: item.author || '',
        musical_key: item.musical_key || '',
        verse_order: ['Vers 1'],
        lang_count: 1,
        custom_tags: {},
      },
      slides: [
        {
          id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'slide-' + Date.now(),
          index: 0,
          label: 'Vers 1',
          section: { type: 'Verse', value: 1 },
          raw_content: `${item.title}\n(${item.author || 'Liedtext'})`,
          lines: [
            {
              raw_text: item.title,
              language_index: 0,
              tokens: [{ kind: 'Text', text: item.title }],
            },
          ],
        },
      ],
    };

    this.addSongToSchedule(newSong);
  }

  async openSongFileDialog() {
    // 1. Try native dialog first
    const nativePaths = await invokeTauri<string[]>('pick_sng_files');
    if (nativePaths && nativePaths.length > 0) {
      for (const path of nativePaths) {
        const loaded = await invokeTauri<FileLoadResult>('load_sng_file', { path });
        if (loaded?.song) {
          this.addSongToSchedule(loaded.song);
        }
      }
      return;
    }

    // 2. Webview HTML5 input fallback (cross-platform browser and desktop)
    if (typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.sng,.txt,.pro';
      input.multiple = true;
      input.onchange = async () => {
        if (!input.files || input.files.length === 0) return;
        for (const file of Array.from(input.files)) {
          try {
            // First try native backend if available
            if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
              const buffer = await file.arrayBuffer();
              const bytes = Array.from(new Uint8Array(buffer));
              const path = (file as unknown as { path?: string }).path ?? file.name;
              const res = await invokeTauri<{ song: Song }>('parse_sng_bytes', { bytes, filePath: path });
              if (res?.song) {
                this.addSongToSchedule(res.song);
                continue;
              }
            }
            // Pure TypeScript fallback parser
            const buffer = await file.arrayBuffer();
            const song = parseSng(new Uint8Array(buffer), file.name);
            this.addSongToSchedule(song);
          } catch (err) {
            console.error('Failed to parse selected song file:', file.name, err);
          }
        }
      };
      input.click();
    }
  }

  private async selectFolderViaNativeOrBrowser(title: string, defaultPath?: string): Promise<string | null> {
    // 1. Try native Tauri dialog if running inside Tauri
    const native = await invokeTauri<string | null>('pick_folder', {
      title,
      defaultPath: defaultPath || undefined,
    });
    if (native) return native;

    // 2. Modern Browser File System Access API (Native Windows "Ordner auswählen" dialog in Edge / Chrome)
    if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
      try {
        const dirHandle = await (window as unknown as { showDirectoryPicker: (opts?: unknown) => Promise<{ name: string }> }).showDirectoryPicker({
          mode: 'read',
        });
        if (dirHandle?.name) {
          return dirHandle.name;
        }
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'name' in err && err.name === 'AbortError') {
          return null; // User cancelled dialog
        }
        console.warn('showDirectoryPicker error:', err);
      }
    }

    // 3. HTML5 Directory input fallback (pure folder selection without uploading files)
    if (typeof document !== 'undefined') {
      return new Promise<string | null>((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.setAttribute('webkitdirectory', '');
        input.onchange = () => {
          if (!input.files || input.files.length === 0) {
            resolve(null);
            return;
          }
          const rel = input.files[0].webkitRelativePath || '';
          const folderName = rel.split('/')[0] || input.files[0].name;
          resolve(folderName);
        };
        input.oncancel = () => resolve(null);
        input.click();
      });
    }

    return null;
  }

  async openSongFolderDialog() {
    const folder = await this.selectFolderViaNativeOrBrowser(
      'Wähle SongBeamer Lieder-Verzeichnis',
      this.songsDirectory
    );
    if (folder) {
      this.setSongsDirectory(folder);
      await this.scanSongsDirectory(folder);
    }
  }

  setBackgroundsDirectory(dir: string) {
    this.backgroundsDirectory = dir;
    if (typeof localStorage !== 'undefined') {
      if (dir) {
        localStorage.setItem('noah_backgrounds_dir', dir);
      } else {
        localStorage.removeItem('noah_backgrounds_dir');
      }
    }
    if (dir) {
      this.scanBackgroundsDirectory(dir);
    }
  }

  setSchedulesDirectory(dir: string) {
    this.schedulesDirectory = dir;
    if (typeof localStorage !== 'undefined') {
      if (dir) {
        localStorage.setItem('noah_schedules_dir', dir);
      } else {
        localStorage.removeItem('noah_schedules_dir');
      }
    }
  }

  async scanBackgroundsDirectory(dir?: string) {
    const targetDir = dir ?? this.backgroundsDirectory;
    if (!targetDir) return;
    try {
      const scanned = await invokeTauri<Array<{ id: string; name: string; path: string; category: string }>>(
        'scan_backgrounds_directory',
        { dirPath: targetDir }
      );
      if (scanned && scanned.length > 0) {
        const existingPaths = new Set(this.customBackgrounds.map((b) => b.value));
        for (const item of scanned) {
          if (!existingPaths.has(item.path)) {
            this.customBackgrounds.push({
              id: item.id,
              nameKey: '',
              defaultName: item.name,
              category: 'custom',
              type: 'image',
              value: item.path,
              previewStyle: `background-image: url('${item.path}'); background-size: cover; background-position: center;`,
              isCustom: true,
            });
            existingPaths.add(item.path);
          }
        }
        this.persistCustomBackgrounds();
      }
    } catch (err) {
      console.warn('Failed scanning backgrounds directory:', err);
    }
  }

  async openBackgroundsFolderDialog() {
    const folder = await this.selectFolderViaNativeOrBrowser(
      'Wähle Hintergrundbilder-Verzeichnis',
      this.backgroundsDirectory
    );
    if (folder) {
      this.setBackgroundsDirectory(folder);
    }
  }

  async openSchedulesFolderDialog() {
    const folder = await this.selectFolderViaNativeOrBrowser(
      'Wähle Ablaufpläne-Verzeichnis',
      this.schedulesDirectory
    );
    if (folder) {
      this.setSchedulesDirectory(folder);
    }
  }

  async importCustomBackgroundFiles() {
    // 1. Try native file dialog starting in backgroundsDirectory
    const nativeFiles = await invokeTauri<string[]>('pick_image_files', {
      defaultPath: this.backgroundsDirectory || undefined,
    });
    if (nativeFiles && nativeFiles.length > 0) {
      for (const filePath of nativeFiles) {
        const fileName = filePath.split(/[\\/]/).pop()?.replace(/\.[^/.]+$/, '') || 'Hintergrund';
        this.addCustomBackground({
          id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          category: 'custom',
          nameKey: '',
          defaultName: fileName,
          type: 'image',
          value: filePath,
          previewStyle: `background-image: url('${filePath}'); background-size: cover; background-position: center;`,
          isCustom: true,
        });
      }
      return;
    }

    // 2. Browser file picker fallback
    if (typeof document === 'undefined') return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp,image/bmp,.jpg,.jpeg,.png,.webp,.bmp';
    input.multiple = true;
    input.onchange = async () => {
      if (!input.files || input.files.length === 0) return;
      for (const file of Array.from(input.files)) {
        await this.addCustomBackgroundFromFile(file);
      }
    };
    input.click();
  }

  async addCustomBackgroundFromFile(file: File): Promise<void> {
    return new Promise<void>((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        if (dataUrl) {
          const name = file.name.replace(/\.[^/.]+$/, '');
          this.addCustomBackground({
            id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            category: 'custom',
            nameKey: '',
            defaultName: name,
            type: 'image',
            value: dataUrl,
            previewStyle: `background-image: url('${dataUrl}'); background-size: cover; background-position: center;`,
            isCustom: true,
          });
        }
        resolve();
      };
      reader.onerror = () => resolve();
      reader.readAsDataURL(file);
    });
  }

  addCustomBackground(item: BackgroundItem) {
    const exists = this.customBackgrounds.some((b) => b.value === item.value);
    if (!exists) {
      this.customBackgrounds.push(item);
      this.persistCustomBackgrounds();
    }
  }

  removeCustomBackground(id: string) {
    this.customBackgrounds = this.customBackgrounds.filter((b) => b.id !== id);
    this.persistCustomBackgrounds();
  }

  private persistCustomBackgrounds() {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('noah_custom_backgrounds', JSON.stringify(this.customBackgrounds));
      } catch (err) {
        console.warn('Failed to persist custom backgrounds to localStorage:', err);
      }
    }
  }

  openSongEditor(song?: Song, filePath?: string) {
    const target = song ?? this.activeSong;
    if (target) {
      this.editingSong = JSON.parse(JSON.stringify(target));
      this.editingSongFilePath = filePath ?? null;
      this.isSongEditorOpen = true;
    }
  }

  closeSongEditor() {
    this.isSongEditorOpen = false;
    this.editingSong = null;
    this.editingSongFilePath = null;
  }

  async parseSongContent(content: string): Promise<Song | null> {
    const res = await invokeTauri<{ song: Song }>('parse_sng', { content });
    if (res?.song) return res.song;
    try {
      return parseSng(content, 'edited.sng');
    } catch {
      return null;
    }
  }

  async transposeLyrics(text: string, semitones: number): Promise<string> {
    const res = await invokeTauri<string>('transpose_lyrics', { text, semitones });
    return res ?? text;
  }

  async stripChords(text: string): Promise<string> {
    const res = await invokeTauri<string>('strip_chords', { text });
    return res ?? text;
  }

  async saveEditedSong(song: Song, filePath?: string) {
    this.activeSong = song;

    // 1. Synchronize schedule item or insert new song into schedule
    const schedIndex = this.schedule.findIndex(
      (item) =>
        item.item_type.kind === 'Song' &&
        (item.item_type.payload.id === song.id || item.title === song.metadata.title)
    );
    if (schedIndex >= 0) {
      const existing = this.schedule[schedIndex];
      if (existing && existing.item_type.kind === 'Song') {
        existing.title = song.metadata.title;
        existing.item_type.payload = song;
      }
    } else {
      // Brand new song or not yet in schedule -> Add directly to schedule!
      this.addSongToSchedule(song);
    }

    // 2. Determine target file path
    let path = filePath ?? this.editingSongFilePath;
    if (!path && this.songsDirectory) {
      const safeTitle = (song.metadata.title || 'Neues Lied').replace(/[<>:"/\\|?*]/g, '_').trim();
      const sep = this.songsDirectory.includes('\\') ? '\\' : '/';
      path = `${this.songsDirectory.replace(/[\\/]+$/, '')}${sep}${safeTitle}.sng`;
    }

    // 3. Save to disk via Tauri backend
    await invokeTauri('save_song_to_disk', { song, filePath: path });

    // 4. Synchronize live beamer if active
    if (this.isBeamerActive) {
      await invokeTauri('sync_active_song', {
        song,
        slideIndex: this.activeSlideIndex < song.slides.length ? this.activeSlideIndex : 0,
      });
    }

    this.closeSongEditor();
  }
}

export const presentation = new PresentationStore();
