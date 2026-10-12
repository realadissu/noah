//! Presentation state store using Svelte 5 runes.

import type { DisplayMode, Song, Slide, DisplayInfo } from '$lib/types/models';

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

class PresentationStore {
  activeSong = $state<Song | null>(null);
  activeSlideIndex = $state<number>(0);
  displayMode = $state<DisplayMode>('normal');
  showChords = $state<boolean>(true);
  detectedEncoding = $state<string>('UTF-8');

  // Display & Dual-window state
  isBeamerActive = $state<boolean>(false);
  connectedDisplays = $state<DisplayInfo[]>([]);
  activeDisplay = $state<DisplayInfo | null>(null);

  activeSlide = $derived<Slide | null>(
    this.activeSong?.slides[this.activeSlideIndex] ?? null
  );

  setSong(song: Song, encoding: string = 'UTF-8') {
    this.activeSong = song;
    this.activeSlideIndex = 0;
    this.detectedEncoding = encoding;

    invokeTauri('sync_active_song', {
      song,
      slideIndex: 0,
    });
  }

  nextSlide() {
    if (this.activeSong && this.activeSlideIndex + 1 < this.activeSong.slides.length) {
      this.selectSlide(this.activeSlideIndex + 1);
    }
  }

  prevSlide() {
    if (this.activeSlideIndex > 0) {
      this.selectSlide(this.activeSlideIndex - 1);
    }
  }

  selectSlide(index: number) {
    if (this.activeSong && index >= 0 && index < this.activeSong.slides.length) {
      this.activeSlideIndex = index;
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

  async refreshDisplays() {
    const list = await invokeTauri<DisplayInfo[]>('list_displays');
    if (list) {
      this.connectedDisplays = list;
    }
  }

  async toggleBeamer(displayId?: string) {
    if (this.isBeamerActive) {
      await invokeTauri('close_beamer_window');
      this.isBeamerActive = false;
    } else {
      const target = await invokeTauri<DisplayInfo>('open_beamer_window', { displayId });
      if (target) {
        this.activeDisplay = target;
        this.isBeamerActive = true;
        // Synchronize state immediately
        if (this.activeSong) {
          await invokeTauri('sync_active_song', {
            song: this.activeSong,
            slideIndex: this.activeSlideIndex,
          });
        }
        await invokeTauri('set_display_mode', { mode: this.displayMode });
      }
    }
  }
}

export const presentation = new PresentationStore();
