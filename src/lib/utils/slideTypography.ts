//! Shared typography and slide layout calculation for 1:1 WYSIWYG parity between Beamer and Preview.
//! Pure functions working consistently across Windows, macOS, and Linux using CSS Container Queries.

import type { Slide, LyricLine } from '$lib/types/models';

/**
 * Extracts plain audience text lines (chords stripped) from a slide.
 */
export function getAudienceLines(slide: Slide | null): string[] {
  if (!slide) return [];

  // 1. Try parsed token lines first
  if (slide.lines && slide.lines.length > 0) {
    const fromTokens = slide.lines
      .map((line: LyricLine) =>
        line.tokens
          .filter((t) => t.kind !== 'Chord')
          .map((t) => t.text)
          .join('')
      )
      .filter((l) => l.trim().length > 0);

    if (fromTokens.length > 0) {
      return fromTokens;
    }
  }

  // 2. Fallback to raw_content
  if (slide.raw_content) {
    return slide.raw_content
      .replace(/\[[^\]]*\]/g, '') // Strip [Chord] tags
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
  }

  return [];
}

/**
 * Calculates optimal Container-Query font size for slides.
 *
 * Provides:
 * 1. Safe margins: ~4cqw left/right, ~3cqh top/bottom.
 * 2. Optimal space fill: 2-line verses scale up elegantly (~7-8cqw); 4-6 line verses fit comfortably (~4.5-5.5cqw).
 * 3. Legibility on thumbnails: preview cards use isThumbnail=true with a comfortable minimum floor (0.88rem / ~14px)
 *    so text on preview cards is bold, prominent, and comfortably readable, never tiny.
 * 4. Beamer prominence: full-screen audience output gets large, majestic presentation fonts.
 */
export function calculateSlideFontSize(
  slide: Slide | null,
  showChords: boolean = false,
  isThumbnail: boolean = false
): string {
  if (!slide) return isThumbnail ? 'clamp(0.88rem, 4.8cqw, 2.0rem)' : '5.6cqw';
  const lines = getAudienceLines(slide);
  if (lines.length === 0) return isThumbnail ? 'clamp(0.88rem, 4.8cqw, 2.0rem)' : '5.6cqw';

  const lineCount = lines.length;
  const maxLineLen = Math.max(...lines.map((l) => l.trim().length), 1);

  // Line-height multiplier
  const lineFactor = showChords ? 2.1 : 1.32;

  // Horizontal fitting: 92% available width with 0.46 proportional font glyph factor
  const horizontalCqw = Math.min(8.8, Math.max(3.2, 92 / (maxLineLen * 0.46)));

  // Vertical fitting: 86% available height converted to cqw equivalent (in 16:9, 1cqh = 0.5625cqw)
  const verticalCqw = Math.min(9.5, Math.max(3.4, (86 / (lineCount * lineFactor)) * 0.5625));

  const optimalCqw = Math.min(horizontalCqw, verticalCqw);

  if (isThumbnail) {
    return `clamp(0.88rem, ${optimalCqw.toFixed(2)}cqw, 2.0rem)`;
  }

  return `${optimalCqw.toFixed(2)}cqw`;
}
