//! Presentation state store using Svelte 5 runes.

import type {
  DisplayMode,
  Song,
  Slide,
  DisplayInfo,
  ScheduleItem,
  AspectRatio,
} from '$lib/types/models';

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
const DEFAULT_SONG: Song = {
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

  // Appearance & Themes
  theme = $state<'dark' | 'light'>('dark');
  uiMode = $state<'classic' | 'modern'>('classic');
  isSettingsOpen = $state<boolean>(false);

  // Right Column Drawer visibility (hidden by default per user requirement)
  isRightPanelOpen = $state<boolean>(false);

  // Aspect ratio for slide containers (16:9, 16:10, 4:3, Auto)
  aspectRatio = $state<AspectRatio>('16:9');
  aspectRatioMode = $state<'auto' | AspectRatio>('auto');

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
      const savedUiMode = localStorage.getItem('noah_ui_mode');
      if (savedUiMode === 'classic' || savedUiMode === 'modern') {
        this.uiMode = savedUiMode;
      }
    }

    // Automatically sync initial active song to Tauri backend so Beamer immediately has the song
    if (this.activeSong) {
      invokeTauri('sync_active_song', {
        song: this.activeSong,
        slideIndex: this.activeSlideIndex,
      });
      invokeTauri('set_display_mode', { mode: this.displayMode });
    }
  }

  toggleTheme() {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('noah_theme', this.theme);
    }
  }

  setTheme(theme: 'dark' | 'light') {
    this.theme = theme;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('noah_theme', theme);
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
    }
  }

  recalculateAutoAspectRatio() {
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
  }

  setSong(song: Song, encoding: string = 'UTF-8') {
    this.activeSong = song;
    this.activeSlideIndex = 0;
    this.detectedEncoding = encoding;

    invokeTauri('sync_active_song', {
      song,
      slideIndex: 0,
    });
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
    if (this.activeSong && this.activeSlideIndex + 1 < this.activeSong.slides.length) {
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
      if (this.activeSong && this.activeSong.slides.length > 0) {
        this.selectSlide(this.activeSong.slides.length - 1);
      }
    }
  }

  selectSlide(index: number) {
    if (this.activeSong && index >= 0 && index < this.activeSong.slides.length) {
      this.activeSlideIndex = index;
      // Selecting a slide brings it live on screen
      this.displayMode = 'normal';
      const slide = this.activeSong.slides[index];
      if (slide) {
        invokeTauri('change_slide', {
          slideId: slide.id,
          slideIndex: index,
          transitionMs: 300,
        });
      }
    }
  }

  setDisplayMode(mode: DisplayMode) {
    this.displayMode = mode;
    invokeTauri('set_display_mode', { mode });
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
      }
    } else {
      await invokeTauri('set_display_mode', { mode: this.displayMode });
    }
  }

  async closeBeamer() {
    if (this.isBeamerActive) {
      await invokeTauri('close_beamer_window');
      this.isBeamerActive = false;
    }
  }

  async toggleBeamer(displayId?: string) {
    if (this.isBeamerActive) {
      await this.closeBeamer();
    } else {
      await this.startBeamer(displayId);
    }
  }
}

export const presentation = new PresentationStore();
