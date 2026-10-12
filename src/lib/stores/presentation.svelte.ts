//! Presentation state store using Svelte 5 runes.

import type { DisplayMode, Song, Slide } from '$lib/types/models';

class PresentationStore {
  activeSong = $state<Song | null>(null);
  activeSlideIndex = $state<number>(0);
  displayMode = $state<DisplayMode>('normal');
  showChords = $state<boolean>(true);
  detectedEncoding = $state<string>('UTF-8');

  activeSlide = $derived<Slide | null>(
    this.activeSong?.slides[this.activeSlideIndex] ?? null
  );

  setSong(song: Song, encoding: string = 'UTF-8') {
    this.activeSong = song;
    this.activeSlideIndex = 0;
    this.detectedEncoding = encoding;
  }

  nextSlide() {
    if (this.activeSong && this.activeSlideIndex + 1 < this.activeSong.slides.length) {
      this.activeSlideIndex += 1;
    }
  }

  prevSlide() {
    if (this.activeSlideIndex > 0) {
      this.activeSlideIndex -= 1;
    }
  }

  selectSlide(index: number) {
    if (this.activeSong && index >= 0 && index < this.activeSong.slides.length) {
      this.activeSlideIndex = index;
    }
  }

  setDisplayMode(mode: DisplayMode) {
    this.displayMode = mode;
  }

  toggleChords() {
    this.showChords = !this.showChords;
  }
}

export const presentation = new PresentationStore();
