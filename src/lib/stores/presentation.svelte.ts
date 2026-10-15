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
import { parseSng, parseSngText, serializeSng, expandSlidesByVerseOrder } from '$lib/utils/sngParser';
import { EMBEDDED_SONGS_ARCHIVE } from '$lib/data/songsArchive';
import { i18n } from '$lib/i18n';
import { type BackgroundItem } from '$lib/data/backgrounds';
import { convertSongSelectToSong, generateSngFromSongSelect, type SongSelectSong } from '$lib/services/ccli';

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

  // Dedicated Song Search Modal State
  isSongSearchModalOpen = $state<boolean>(false);
  songSearchInitialTab = $state<'local' | 'songselect'>('local');

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
  localArchiveSongs = $state<Array<{ song: Song; filePath: string; fileName: string }>>([]);

  activeSlide = $derived<Slide | null>(
    this.activeSong?.slides[this.activeSlideIndex] ?? null
  );

  activeScheduleItem = $derived<ScheduleItem | null>(
    this.schedule[this.activeScheduleIndex] ?? null
  );

  init() {
    // 1. Populate embedded song archive immediately for instant offline search & preview
    const initialArchive: Array<{ song: Song; filePath: string; fileName: string }> = [];
    for (const item of EMBEDDED_SONGS_ARCHIVE) {
      try {
        const parsed = parseSngText(item.sngContent, item.fileName);
        initialArchive.push({
          song: parsed,
          filePath: item.path,
          fileName: item.fileName,
        });
      } catch (err) {
        console.warn('Failed to parse embedded song:', item.fileName, err);
      }
    }
    this.localArchiveSongs = initialArchive;

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
      } else {
        // Auto-detect default SongBeamer Songs directory
        this.songsDirectory = 'Z:/Users/wolfgangmeincke/Documents/SongBeamer/Songs';
      }
      this.loadLocalArchive();

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

  async pickFolder(_title?: string): Promise<string | null> {
    try {
      const picked = await invokeTauri<string>('pick_folder', { title: _title });
      if (picked) return picked;
    } catch {
      // Browser or unhandled
    }
    return null;
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

  async loadLocalArchive() {
    // 1. If running in native desktop Tauri, scan the directory
    if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
      if (this.songsDirectory) {
        await this.scanSongsDirectory(this.songsDirectory);
      }
      return;
    }

    // 2. If running in browser / Vite dev server, fetch live repertoire from /api/songs
    if (typeof fetch !== 'undefined') {
      try {
        const queryDir = this.songsDirectory || '';
        const url = `/api/songs${queryDir ? `?folder=${encodeURIComponent(queryDir)}` : ''}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.songs) && data.songs.length > 0) {
            const liveParsed: Array<{ song: Song; filePath: string; fileName: string }> = [];
            for (const item of data.songs) {
              try {
                const s = parseSngText(item.sngContent, item.fileName);
                liveParsed.push({
                  song: s,
                  filePath: item.path,
                  fileName: item.fileName,
                });
              } catch (e) {
                console.warn('Failed parsing song from /api/songs:', item.fileName, e);
              }
            }
            if (liveParsed.length > 0) {
              this.localArchiveSongs = liveParsed;
            }
            if (data.folder && !this.songsDirectory) {
              this.songsDirectory = data.folder;
            }
          }
        }
      } catch (err) {
        console.debug('Dev server /api/songs not available, using embedded archive:', err);
      }
    }
  }

  async searchSongs(query = '', limit = 50, subfolderFilter?: string): Promise<SongSearchResult[]> {
    const q = query.trim().toLowerCase();
    if (q.length < 2) {
      return [];
    }

    // 1. Try native Tauri database search first if running inside desktop app
    const backendResults = await invokeTauri<SongSearchResult[]>('search_songs', { query: q, limit });
    if (backendResults && backendResults.length > 0) {
      if (subfolderFilter && subfolderFilter !== 'all') {
        return backendResults.filter((r) => r.file_path?.toLowerCase().includes(subfolderFilter.toLowerCase()));
      }
      return backendResults;
    }

    // 2. Comprehensive client-side search across Schedule + Local Archive + Sample Library
    const results: SongSearchResult[] = [];
    const seenTitles = new Set<string>();

    // German diacritic / umlaut normalizer (e.g. "Staerke" matches "Stärke", "Grosser" matches "Großer")
    const normalize = (str: string) =>
      str
        .toLowerCase()
        .replace(/ä/g, 'ae')
        .replace(/ö/g, 'oe')
        .replace(/ü/g, 'ue')
        .replace(/ß/g, 'ss')
        .replace(/[\.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    // Secondary diacritic folding (e.g. "Starke" matches "Stärke", "Furchten" matches "Fürchten")
    const fold = (str: string) =>
      str
        .toLowerCase()
        .replace(/ä/g, 'a')
        .replace(/ö/g, 'o')
        .replace(/ü/g, 'u')
        .replace(/ß/g, 's')
        .replace(/[\.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const terms = q ? q.split(/\s+/).filter(Boolean) : [];
    const normTerms = terms.map(normalize);
    const foldTerms = terms.map(fold);

    // Helper to evaluate multi-term search
    const matchesQuery = (
      title: string,
      author: string,
      lyrics: string,
      fileName?: string
    ): { matches: boolean; snippet?: string } => {
      if (terms.length === 0) return { matches: true };

      const tLow = title.toLowerCase();
      const aLow = author.toLowerCase();
      const lLow = lyrics.toLowerCase();
      const fLow = (fileName || '').toLowerCase();

      const tNorm = normalize(title);
      const aNorm = normalize(author);
      const lNorm = normalize(lyrics);
      const fNorm = normalize(fileName || '');

      const tFold = fold(title);
      const aFold = fold(author);
      const lFold = fold(lyrics);
      const fFold = fold(fileName || '');

      const allMatch = terms.every((term, idx) => {
        const nTerm = normTerms[idx];
        const fTerm = foldTerms[idx];
        return (
          tLow.includes(term) ||
          tNorm.includes(nTerm) ||
          tFold.includes(fTerm) ||
          aLow.includes(term) ||
          aNorm.includes(nTerm) ||
          aFold.includes(fTerm) ||
          fLow.includes(term) ||
          fNorm.includes(nTerm) ||
          fFold.includes(fTerm) ||
          lLow.includes(term) ||
          lNorm.includes(nTerm) ||
          lFold.includes(fTerm)
        );
      });
      if (!allMatch) return { matches: false };

      // Find best match line in lyrics if title didn't match directly
      let snippet: string | undefined;
      const titleMatchesAll = terms.every((term) => tLow.includes(term) || tNorm.includes(normalize(term)));
      if (!titleMatchesAll) {
        const lines = lyrics.split('\n').map((l) => l.trim()).filter(Boolean);
        for (const line of lines) {
          const lineLow = line.toLowerCase();
          const lineNorm = normalize(line);
          if (terms.some((term, idx) => lineLow.includes(term) || lineNorm.includes(normTerms[idx]))) {
            snippet = line.length > 55 ? line.slice(0, 52) + '...' : line;
            break;
          }
        }
      }
      return { matches: true, snippet };
    };

    // A. Current worship schedule items
    for (const item of this.schedule) {
      if (item.item_type.kind === 'Song') {
        const s = item.item_type.payload;
        const lyrics = s.slides.map((sl) => sl.raw_content).join('\n');
        const { matches, snippet } = matchesQuery(s.metadata.title, s.metadata.author || '', lyrics);

        if (matches) {
          const normTitle = s.metadata.title.toLowerCase();
          if (!seenTitles.has(normTitle)) {
            seenTitles.add(normTitle);
            const path = (s as unknown as { filePath?: string }).filePath || 'Ablaufplan/' + s.metadata.title + '.sng';
            if (!subfolderFilter || subfolderFilter === 'all' || path.toLowerCase().includes(subfolderFilter.toLowerCase())) {
              results.push({
                id: s.id,
                title: s.metadata.title,
                author: s.metadata.author || '',
                musical_key: s.metadata.musical_key || '',
                file_path: path,
                slide_count: s.slides.length,
                snippet: snippet ? `Im Liedtext: „${snippet}“` : undefined,
              });
            }
          }
        }
      }
    }

    // B. Real songs from local archive (disk repertoire)
    for (const entry of this.localArchiveSongs) {
      const s = entry.song;
      const lyrics = s.slides.map((sl) => sl.raw_content).join('\n');
      const { matches, snippet } = matchesQuery(s.metadata.title, s.metadata.author || '', lyrics, entry.fileName);

      if (matches) {
        const normTitle = s.metadata.title.toLowerCase();
        if (!seenTitles.has(normTitle)) {
          seenTitles.add(normTitle);
          if (!subfolderFilter || subfolderFilter === 'all' || entry.filePath.toLowerCase().includes(subfolderFilter.toLowerCase())) {
            results.push({
              id: s.id,
              title: s.metadata.title,
              author: s.metadata.author || '',
              musical_key: s.metadata.musical_key || '',
              file_path: entry.filePath,
              slide_count: s.slides.length,
              snippet: snippet ? `Im Liedtext: „${snippet}“` : undefined,
            });
          }
        }
      }
    }

    // C. Built-in Worship Song Repertoire across multiple subfolders
    const sampleLibrary: Array<{ song: Song; subfolderPath: string }> = [
      {
        song: DEFAULT_SONG,
        subfolderPath: 'Lobpreis/Lobe den Herrn, meine Seele.sng',
      },
      {
        song: {
          id: 'lib-grosser-gott',
          metadata: {
            title: 'Großer Gott, wir loben dich',
            author: 'Ignaz Franz',
            musical_key: 'F',
            ccli: '2151670',
            verse_order: ['Vers 1', 'Vers 2'],
            lang_count: 1,
            custom_tags: { CCLI: '2151670' },
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
            {
              id: 'sl-gg-2',
              index: 1,
              label: 'Vers 2',
              section: { type: 'Verse', value: 2 },
              raw_content: 'Alles, was dich preisen kann,\nCherubim und Seraphinen,\nstimmen dir ein Loblied an;\nalle Engel, die dir dienen.',
              lines: [],
            },
          ],
        },
        subfolderPath: 'Traditionell/Großer Gott, wir loben dich.sng',
      },
      {
        song: {
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
            {
              id: 'sl-hik-2',
              index: 1,
              label: 'Refrain',
              section: { type: 'Chorus' },
              raw_content: 'Jesus, Herr, ich danke dir,\ndu vergibst und heilst mein Herz.\nDeine Gnade reicht für mich.',
              lines: [],
            },
          ],
        },
        subfolderPath: 'Lobpreis/Herr, ich komme zu dir.sng',
      },
      {
        song: {
          id: 'lib-abba-vater',
          metadata: {
            title: 'Abba, Vater, du bist heilig',
            author: 'Worship Team',
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
              raw_content: 'Abba, Vater, du bist heilig,\ndein Name sei erhöht in Ewigkeit.\nWir beugen uns vor deiner Herrlichkeit.',
              lines: [],
            },
          ],
        },
        subfolderPath: 'Lobpreis/Abba, Vater, du bist heilig.sng',
      },
      {
        song: {
          id: 'lib-mutig-komm-ich',
          metadata: {
            title: 'Mutig komm ich vor den Thron',
            author: 'Rend Collective, dt. Daniel Jakobi',
            musical_key: 'D',
            ccli: '7084128',
            verse_order: ['Vers 1', 'Refrain', 'Vers 2'],
            lang_count: 1,
            custom_tags: { CCLI: '7084128' },
          },
          slides: [
            {
              id: 'sl-mk-1',
              index: 0,
              label: 'Vers 1',
              section: { type: 'Verse', value: 1 },
              raw_content: 'Die Gnade fließt wie ein breiter Strom,\ndie reinwäscht und vergibt.\nSie tilgt die Schuld, bricht der Sünde Macht,\ndamit mein Herz aufblüht.',
              lines: [],
            },
            {
              id: 'sl-mk-2',
              index: 1,
              label: 'Refrain',
              section: { type: 'Chorus' },
              raw_content: 'Mutig komm ich vor den Thron,\nfreigesprochen durch den Sohn.\nGnade tilgt die ganze Schuld,\nGott schenkt Liebe und Geduld.',
              lines: [],
            },
          ],
        },
        subfolderPath: 'Jugend/Mutig komm ich vor den Thron.sng',
      },
      {
        song: {
          id: 'lib-in-christus',
          metadata: {
            title: 'In Christus ist mein Glaube fest',
            author: 'Keith Getty, Stuart Townend',
            musical_key: 'D',
            ccli: '3350395',
            verse_order: ['Vers 1', 'Vers 2'],
            lang_count: 1,
            custom_tags: { CCLI: '3350395' },
          },
          slides: [
            {
              id: 'sl-ic-1',
              index: 0,
              label: 'Vers 1',
              section: { type: 'Verse', value: 1 },
              raw_content: 'In Christus ist mein Glaube fest,\nEr ist mein Licht, mein Lied, mein Halt.\nDer Eckstein und das Fundament,\ndas Sturm und Flut gewaltig trotzt.',
              lines: [],
            },
          ],
        },
        subfolderPath: 'Glaubenslieder/In Christus ist mein Glaube fest.sng',
      },
      {
        song: {
          id: 'lib-von-guten-maechten',
          metadata: {
            title: 'Von guten Mächten wunderbar geborgen',
            author: 'Dietrich Bonhoeffer, Siegfried Fietz',
            musical_key: 'Eb',
            verse_order: ['Vers 1', 'Refrain'],
            lang_count: 1,
            custom_tags: {},
          },
          slides: [
            {
              id: 'sl-vgm-1',
              index: 0,
              label: 'Vers 1',
              section: { type: 'Verse', value: 1 },
              raw_content: 'Von guten Mächten treu und still umgeben,\nbehütet und getröstet wunderbar,\nso will ich diese Tage mit euch leben\nund mit euch gehen in ein neues Jahr.',
              lines: [],
            },
            {
              id: 'sl-vgm-2',
              index: 1,
              label: 'Refrain',
              section: { type: 'Chorus' },
              raw_content: 'Von guten Mächten wunderbar geborgen,\nerwarten wir getrost, was kommen mag.\nGott ist bei uns am Abend und am Morgen\nund ganz gewiss an jedem neuen Tag.',
              lines: [],
            },
          ],
        },
        subfolderPath: 'Klassiker/Von guten Mächten wunderbar geborgen.sng',
      },
    ];

    for (const item of sampleLibrary) {
      const s = item.song;
      const lyrics = s.slides.map((sl) => sl.raw_content).join('\n');
      const { matches, snippet } = matchesQuery(s.metadata.title, s.metadata.author || '', lyrics);

      if (matches) {
        const normTitle = s.metadata.title.toLowerCase();
        if (!seenTitles.has(normTitle)) {
          seenTitles.add(normTitle);
          if (!subfolderFilter || subfolderFilter === 'all' || item.subfolderPath.toLowerCase().includes(subfolderFilter.toLowerCase())) {
            results.push({
              id: s.id,
              title: s.metadata.title,
              author: s.metadata.author || '',
              musical_key: s.metadata.musical_key || '',
              file_path: item.subfolderPath,
              slide_count: s.slides.length,
              snippet: snippet ? `Im Liedtext: „${snippet}“` : undefined,
            });
          }
        }
      }
    }

    return results.slice(0, limit);
  }

  async getSongDetails(item: SongSearchResult): Promise<Song | null> {
    // 1. In schedule?
    const inSchedule = this.schedule.find(
      (s) => s.item_type.kind === 'Song' && (s.item_type.payload.id === item.id || s.title.toLowerCase() === item.title.toLowerCase())
    );
    if (inSchedule && inSchedule.item_type.kind === 'Song') {
      return inSchedule.item_type.payload;
    }

    // 2. In local archive repertoire?
    const inArchive = this.localArchiveSongs.find(
      (entry) =>
        entry.song.id === item.id ||
        (item.file_path && entry.filePath.toLowerCase() === item.file_path.toLowerCase()) ||
        entry.song.metadata.title.toLowerCase() === item.title.toLowerCase()
    );
    if (inArchive) {
      return inArchive.song;
    }

    // 3. Load from file if running native desktop
    if (item.file_path && (item.file_path.includes(':') || item.file_path.startsWith('/'))) {
      const loaded = await invokeTauri<FileLoadResult>('load_sng_file', { path: item.file_path });
      if (loaded?.song) {
        return loaded.song;
      }
    }

    // 3. Match from local sample library
    const res = await this.searchSongs(item.title, 5);
    const target = res.find((r) => r.title.toLowerCase() === item.title.toLowerCase()) || item;

    // Build complete Song model
    return {
      id: target.id || 'song-' + Date.now(),
      metadata: {
        title: target.title,
        author: target.author || '',
        musical_key: target.musical_key || '',
        verse_order: ['Vers 1', 'Refrain'],
        lang_count: 1,
        custom_tags: {
          FilePath: target.file_path || '',
        },
      },
      slides: [
        {
          id: 'preview-slide-1',
          index: 0,
          label: 'Vers 1',
          section: { type: 'Verse', value: 1 },
          raw_content: target.snippet ? target.snippet.replace(/^Im Liedtext: „?|“?$/g, '') : `${target.title}\n(${target.author || 'Liedtext'})`,
          lines: [
            {
              raw_text: target.title,
              language_index: 0,
              tokens: [{ kind: 'Text', text: target.title }],
            },
          ],
        },
      ],
    };
  }

  async importAndAddCcliSong(ccliSong: SongSelectSong, customFilePath?: string): Promise<Song> {
    const song = convertSongSelectToSong(ccliSong);
    const sngContent = generateSngFromSongSelect(ccliSong);

    // 1. Determine destination path in configured songs directory
    const songsDir = this.songsDirectory || 'C:/Songs';
    const cleanTitle = ccliSong.title.replace(/[\\/:*?"<>|]/g, '');
    const fullPath = customFilePath || `${songsDir}/${cleanTitle}.sng`;

    // 2. Try saving to disk via Tauri
    await invokeTauri('save_song_to_disk', { song, filePath: fullPath, sngContent });

    // 3. Add to schedule and select
    this.addSongToSchedule(song);
    return song;
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

    // 2. Try loading from local archive songs
    const inArchive = this.localArchiveSongs.find(
      (entry) =>
        entry.song.id === item.id ||
        (item.file_path && entry.filePath.toLowerCase() === item.file_path.toLowerCase()) ||
        entry.song.metadata.title.toLowerCase() === item.title.toLowerCase()
    );
    if (inArchive) {
      this.addSongToSchedule(inArchive.song);
      return;
    }

    // 3. Try loading from file path if running in native desktop
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

  openSongSearchModal(initialTab: 'local' | 'songselect' = 'local') {
    this.songSearchInitialTab = initialTab;
    this.isSongSearchModalOpen = true;
  }

  closeSongSearchModal() {
    this.isSongSearchModalOpen = false;
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

    // 3. Save to disk via Tauri backend or Dev Server API
    const nativeSaved = await invokeTauri('save_song_to_disk', { song, filePath: path });
    if (!nativeSaved && path && typeof fetch !== 'undefined') {
      try {
        const sngText = serializeSng(song);
        await fetch('/api/save-song', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filePath: path, content: sngText }),
        });
      } catch (err) {
        console.warn('Failed saving song via dev server API:', err);
      }
    }

    // 4. Update in-memory localArchiveSongs
    if (path) {
      const fileName = path.split(/[\\/]/).pop() || `${song.metadata.title}.sng`;
      const idx = this.localArchiveSongs.findIndex((s) => s.filePath === path || s.song.id === song.id);
      if (idx >= 0) {
        this.localArchiveSongs[idx] = { song, filePath: path, fileName };
      } else {
        this.localArchiveSongs.unshift({ song, filePath: path, fileName });
      }
    }

    // 5. Synchronize live beamer if active
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
