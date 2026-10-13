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
 * Calculates optimal Container-Query font size (min(Xcqw, Ycqh)) for 1:1 WYSIWYG parity.
 *
 * Guarantees:
 * 1. Safe margins: ~8cqw left/right, ~6cqh top/bottom.
 * 2. Optimal space fill: 2-line verses scale up elegantly; 6-line verses fit without wrapping.
 * 3. Identical rendering: 1cqw is 1% of the 16:9 slide on both Beamer and thumbnail preview cards.
 */
export function calculateSlideFontSize(slide: Slide | null, showChords: boolean = false): string {
  if (!slide) return '5.2cqw';
  const lines = getAudienceLines(slide);
  if (lines.length === 0) return '5.2cqw';

  const lineCount = lines.length;
  const maxLineLen = Math.max(...lines.map((l) => l.trim().length), 1);

  // Line-height multiplier (more vertical headroom needed if chords are shown)
  const lineFactor = showChords ? 2.2 : 1.35;

  // Horizontal boundary: longest line fits inside ~84cqw safe width (0.52 average glyph aspect ratio)
  const horizontalCqw = Math.min(8.2, Math.max(1.8, 84 / (maxLineLen * 0.52)));

  // Vertical boundary: lineCount lines fit inside ~76cqh safe height
  const verticalCqh = Math.min(13.0, Math.max(2.4, 76 / (lineCount * lineFactor)));

  return `min(${horizontalCqw.toFixed(2)}cqw, ${verticalCqh.toFixed(2)}cqh)`;
}
