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
 * 1. Generous fill: Text occupies ~60-70% of slide area with comfortable safety margins.
 * 2. 2-line verses scale up to ~8.5cqw; 4-line verses scale up to ~6.8-7.4cqw.
 * 3. Legibility on thumbnails: preview cards use isThumbnail=true with clamp(1.0rem, optimalCqw, 2.5rem)
 *    so preview text is bold, prominent, and fills the thumbnail cards.
 * 4. Audience preview thumbnail in Column 3 uses pure container query cqw to avoid text overflow.
 */
export function calculateSlideFontSize(
  slide: Slide | null,
  showChords: boolean = false,
  isThumbnail: boolean = false
): string {
  if (!slide) return isThumbnail ? 'clamp(1.0rem, 6.5cqw, 2.5rem)' : '6.8cqw';
  const lines = getAudienceLines(slide);
  if (lines.length === 0) return isThumbnail ? 'clamp(1.0rem, 6.5cqw, 2.5rem)' : '6.8cqw';

  const lineCount = lines.length;
  const maxLineLen = Math.max(...lines.map((l) => l.trim().length), 1);

  // Line-height multiplier
  const lineFactor = showChords ? 1.95 : 1.26;

  // Target vertical fill: ~60-68% of 16:9 slide height (56.25cqw total height)
  // Available vertical text height budget: ~36-38cqw
  const verticalTargetCqw = Math.min(8.6, Math.max(3.8, 36.5 / (lineCount * lineFactor)));

  // Horizontal fitting: allow natural wrapping for long lines (>36 chars) rather than shrinking all other lines
  const effectiveMaxLen = Math.min(maxLineLen, Math.max(26, maxLineLen > 36 ? maxLineLen * 0.65 : maxLineLen));
  const horizontalCqw = Math.min(8.6, Math.max(3.8, 94 / (effectiveMaxLen * 0.39)));

  const optimalCqw = Math.min(horizontalCqw, verticalTargetCqw);

  if (isThumbnail) {
    return `clamp(1.0rem, ${optimalCqw.toFixed(2)}cqw, 2.5rem)`;
  }

  return `${optimalCqw.toFixed(2)}cqw`;
}
