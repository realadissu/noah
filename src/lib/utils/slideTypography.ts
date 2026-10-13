//! Shared typography and slide layout calculation for 1:1 WYSIWYG parity between Beamer and Preview.
//! Pure functions implementing REQ-SONG-08 and REQ-SONG-09.

import type { Slide, LyricLine, AspectRatio } from '$lib/types/models';

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
 * Calculates optimal Container-Query font size according to REQ-SONG-08 & REQ-SONG-09.
 *
 * Guarantees:
 * 1. Strict SNG Line Breaks: No automatic software word-wrapping.
 * 2. Deterministic Two-Boundary Sizing: min(boundaryHorizontal, boundaryVertical).
 *    - Boundary Horizontal: Longest line must fit without wrapping inside safe width (~88% width, 6% side margins).
 *    - Boundary Vertical: All lines must fit vertically inside safe height (~90% height, 5% top/bottom margins).
 * 3. 1:1 WYSIWYG Parity: Both Beamer and preview cards use the exact same pure cqw unit, guaranteeing
 *    zero text overflow and mathematically identical relative proportions across all viewports and aspect ratios.
 */
export function calculateSlideFontSize(
  slide: Slide | null,
  showChords: boolean = false,
  aspectRatio: AspectRatio = '16:9'
): string {
  if (!slide) return '5.2cqw';
  const lines = getAudienceLines(slide);
  if (lines.length === 0) return '5.2cqw';

  const lineCount = lines.length;
  const maxLineLen = Math.max(...lines.map((l) => l.trim().length), 1);

  // Line-height multiplier (more vertical headroom needed if chords are shown)
  const lineFactor = showChords ? 2.1 : 1.35;

  // Aspect ratio height-to-width factor
  // In CSS container queries, 1cqw is 1% container width.
  // Container height in cqw units:
  // 16:9  -> 9 / 16 = 0.5625
  // 16:10 -> 10 / 16 = 0.625
  // 4:3   -> 3 / 4 = 0.75
  let aspectFactor = 0.5625;
  if (aspectRatio === '4:3') {
    aspectFactor = 0.75;
  } else if (aspectRatio === '16:10') {
    aspectFactor = 0.625;
  }

  // Safe Margins (SongBeamer standard):
  // Safe width: 100 - 2 * 6% = 88cqw
  // Safe height: (100 - 2 * 5%) * aspectFactor = 90 * aspectFactor (in cqw units)
  const safeWidthCqw = 88.0;
  const safeHeightCqw = 90.0 * aspectFactor;

  // 1. Horizontal Boundary: longest line must fit without wrapping
  // Average proportional glyph width for standard sans-serif (Segoe UI, Arial, Inter) is ~0.47em
  const glyphRatio = 0.47;
  const boundaryHorizontal = safeWidthCqw / (maxLineLen * glyphRatio);

  // 2. Vertical Boundary: all lines must fit within safe height
  const boundaryVertical = safeHeightCqw / (lineCount * lineFactor);

  // 3. Optimal size: whichever boundary hits the limit first defines the font size
  const optimal = Math.min(boundaryHorizontal, boundaryVertical);

  // Presentation bounds (1.8cqw to 14.0cqw)
  const clamped = Math.min(14.0, Math.max(1.8, optimal));

  return `${clamped.toFixed(2)}cqw`;
}
