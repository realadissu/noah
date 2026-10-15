//! Pure TypeScript SongBeamer (.sng) parser.
//! Works identically across Windows, macOS, Linux, and in pure browser mode without native backend dependencies.

import type { Song, Slide, LyricLine, LyricToken, SectionType } from '$lib/types/models';

/**
 * Parses raw .sng text or binary Uint8Array into a Song model.
 */
export function parseSng(input: string | Uint8Array, fileName?: string): Song {
  let text = '';
  if (typeof input === 'string') {
    text = input;
  } else {
    // Detect encoding: check for UTF-8 BOM (0xEF, 0xBB, 0xBF)
    if (input.length >= 3 && input[0] === 0xef && input[1] === 0xbb && input[2] === 0xbf) {
      text = new TextDecoder('utf-8').decode(input.subarray(3));
    } else {
      // Try UTF-8 first, fallback to windows-1252
      try {
        text = new TextDecoder('utf-8', { fatal: true }).decode(input);
      } catch {
        text = new TextDecoder('windows-1252').decode(input);
      }
    }
  }

  return parseSngText(text, fileName);
}

/**
 * Parses decoded .sng text into domain Song model.
 */
export function parseSngText(content: string, fileName?: string): Song {
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

  const metadata: Record<string, string> = {};
  const customTags: Record<string, string> = {};
  const slideBlocks: { lines: string[]; isContinuation: boolean }[] = [];
  let currentSlideLines: string[] = [];
  let inHeader = true;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    if (inHeader) {
      if (trimmed === '---') {
        inHeader = false;
        continue;
      }

      if (trimmed.startsWith('#')) {
        const withoutHash = trimmed.slice(1);
        const eqIdx = withoutHash.indexOf('=');
        if (eqIdx !== -1) {
          const key = withoutHash.slice(0, eqIdx).trim();
          const val = withoutHash.slice(eqIdx + 1).trim();
          metadata[key.toLowerCase()] = val;
          customTags[key] = val;
        }
        continue;
      }

      // If line is non-empty and doesn't start with '#', headers are implicitly done
      if (trimmed.length > 0) {
        inHeader = false;
        currentSlideLines.push(rawLine);
      }
    } else {
      if (trimmed === '---' || trimmed === '--') {
        if (currentSlideLines.length > 0) {
          slideBlocks.push({ lines: [...currentSlideLines], isContinuation: trimmed === '--' });
          currentSlideLines = [];
        }
      } else {
        currentSlideLines.push(rawLine);
      }
    }
  }

  if (currentSlideLines.length > 0) {
    slideBlocks.push({ lines: currentSlideLines, isContinuation: false });
  }

  // Derive title from #Title or fallback to filename or first line
  const rawTitle = metadata['title'] ?? (fileName ? fileName.replace(/\.[^/.]+$/, '') : 'Unbekannter Song');
  const title = rawTitle.trim() || 'Unbekannter Song';

  const author = metadata['author'] ?? metadata['artist'] ?? '';
  const musicalKey = metadata['key'] ?? metadata['tonart'] ?? '';
  const verseOrder = metadata['verseorder']
    ? metadata['verseorder'].split(',').map((v) => v.trim())
    : [];

  const songId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'song-' + Date.now();

  const slides: Slide[] = [];
  let lastLabel = 'Slide 1';
  let lastSection: SectionType | undefined = undefined;

  for (let idx = 0; idx < slideBlocks.length; idx++) {
    const block = slideBlocks[idx];
    if (block.lines.length === 0) continue;

    const firstLine = block.lines[0].trim();
    const sectionInfo = parseSectionTag(firstLine);

    let label: string;
    let section: SectionType | undefined;
    let textLines: string[];

    if (sectionInfo) {
      label = sectionInfo.label;
      section = sectionInfo.section;
      lastLabel = label;
      lastSection = section;
      textLines = block.lines.slice(1);
    } else if (block.isContinuation && lastSection) {
      label = lastLabel;
      section = lastSection;
      textLines = block.lines;
    } else {
      label = `Slide ${idx + 1}`;
      section = undefined;
      lastLabel = label;
      lastSection = undefined;
      textLines = block.lines;
    }

    // Clean empty lines at start and end
    while (textLines.length > 0 && textLines[0].trim().length === 0) {
      textLines.shift();
    }
    while (textLines.length > 0 && textLines[textLines.length - 1].trim().length === 0) {
      textLines.pop();
    }
    const langCount = metadata['langcount'] ? Math.max(1, parseInt(metadata['langcount'], 10)) : 1;
    const slideLines: LyricLine[] = textLines.map((line, lIdx) =>
      parseLyricLine(line, langCount > 1 ? lIdx % langCount : 0)
    );

    slides.push({
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `slide-${idx}-${Date.now()}`,
      index: idx,
      label,
      section,
      raw_content: textLines.join('\n'),
      lines: slideLines,
      is_continuation: block.isContinuation,
    });
  }

  // Preserve canonical slides (never drop verses unmentioned in verse_order)
  const canonicalSlides = slides.length > 0 ? slides : [
    {
      id: 'slide-fallback',
      index: 0,
      label: 'Slide 1',
      raw_content: title,
      lines: [parseLyricLine(title)],
      is_continuation: false,
    },
  ];

  return {
    id: songId,
    metadata: {
      title,
      title_lang2: metadata['titlelang2'] || undefined,
      author,
      musical_key: musicalKey || undefined,
      verse_order: verseOrder,
      lang_count: metadata['langcount'] ? Math.max(1, parseInt(metadata['langcount'], 10)) : 1,
      custom_tags: customTags,
    },
    slides: canonicalSlides,
    raw_content: content,
  };
}

/**
 * Normalizes a section name for resilient matching between verse order and slide labels.
 */
function normalizeSectionKey(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/^kehrvers/, 'chorus')
    .replace(/^refrain/, 'chorus')
    .replace(/^chor/, 'chorus')
    .replace(/^strophe/, 'vers')
    .replace(/^verse/, 'vers')
    .replace(/\s+/g, '');
}

/**
 * Expands presentation slides according to the song's verse_order.
 * If verse_order is empty or contains no matching sections, returns original slides.
 */
export function expandSlidesByVerseOrder(rawSlides: Slide[], verseOrder: string[]): Slide[] {
  if (!verseOrder || verseOrder.length === 0 || rawSlides.length === 0) {
    return rawSlides;
  }

  const expanded: Slide[] = [];

  for (let voIdx = 0; voIdx < verseOrder.length; voIdx++) {
    const item = verseOrder[voIdx].trim();
    if (!item) continue;
    const targetKey = normalizeSectionKey(item);

    // Find all slides matching this section (could be multiple if slide had page breaks)
    const matched = rawSlides.filter((slide) => {
      const slideKey = normalizeSectionKey(slide.label);
      if (slideKey === targetKey) return true;
      // Allow 'vers' to match 'vers1' and vice-versa
      if ((targetKey === 'vers' && slideKey === 'vers1') || (targetKey === 'vers1' && slideKey === 'vers')) return true;
      if ((targetKey === 'chorus' && slideKey === 'chorus1') || (targetKey === 'chorus1' && slideKey === 'chorus')) return true;
      return false;
    });

    if (matched.length > 0) {
      for (const m of matched) {
        expanded.push({
          ...m,
          id: `${m.id}-vo-${expanded.length}`,
          index: expanded.length,
        });
      }
    }
  }

  return expanded.length > 0 ? expanded : rawSlides;
}

/**
 * Parses section header strings like "Refrain", "Chorus", "Vers 1", "Verse 2", "Intro", "Bridge", etc.
 */
function parseSectionTag(firstLine: string): { label: string; section: SectionType } | null {
  const norm = firstLine.trim().toLowerCase();

  const chorusMatch = norm.match(/^(?:refrain|chorus|kehrvers)\s*(\d+)?/i);
  if (chorusMatch) {
    const num = chorusMatch[1] ? ` ${chorusMatch[1]}` : '';
    const isChorus = norm.startsWith('chorus');
    return {
      label: isChorus ? `Chorus${num}` : `Refrain${num}`,
      section: { type: 'Chorus' }
    };
  }

  const verseMatch = norm.match(/^(?:vers|verse|strophe)\s*(\d+)?/i);
  if (verseMatch) {
    const num = verseMatch[1] ? ` ${verseMatch[1]}` : '';
    const isVerse = norm.startsWith('verse');
    return {
      label: isVerse ? `Verse${num}` : (num ? `Vers${num}` : 'Vers'),
      section: { type: 'Verse', value: verseMatch[1] ? parseInt(verseMatch[1], 10) : 1 }
    };
  }

  const bridgeMatch = norm.match(/^bridge\s*(\d+)?/i);
  if (bridgeMatch) {
    const num = bridgeMatch[1] ? ` ${bridgeMatch[1]}` : '';
    return { label: `Bridge${num}`, section: { type: 'Bridge' } };
  }

  if (norm.startsWith('intro')) {
    return { label: 'Intro', section: { type: 'Intro' } };
  }

  if (norm.startsWith('outro') || norm.startsWith('ending')) {
    return { label: 'Outro', section: { type: 'Outro' } };
  }

  if (norm.startsWith('pre-chorus') || norm.startsWith('prechorus')) {
    return { label: 'Pre-Chorus', section: { type: 'PreChorus' } };
  }

  // If line contains section-like indicators
  if (/^(interlude|zwischenspiel|solo|coda)/i.test(norm)) {
    return { label: firstLine.trim(), section: { type: 'Custom', value: firstLine.trim() } };
  }

  return null;
}

/**
 * Parses chord brackets like "[D]Lobe den Herrn, [G]meine Seele" into structured LyricLine tokens.
 */
export function parseLyricLine(rawText: string, languageIndex = 0): LyricLine {
  // Strip SongBeamer inline formatting/color codes (e.g. #C1, #GF, #0, #r)
  const cleanedText = rawText.replace(/^#[A-Za-z0-9]+\s*/, '');
  const tokens: LyricToken[] = [];
  const regex = /\[([^\]]*)\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(cleanedText)) !== null) {
    const chord = match[1];
    const matchStart = match.index;

    // Any text preceding the chord
    if (matchStart > lastIndex) {
      const textBefore = cleanedText.slice(lastIndex, matchStart);
      tokens.push({ kind: 'Text', text: textBefore });
    }

    lastIndex = regex.lastIndex;

    // Look ahead to text following this chord until next chord or line end
    const nextMatch = cleanedText.slice(lastIndex);
    const nextBracket = nextMatch.indexOf('[');
    const textAfter = nextBracket === -1 ? nextMatch : nextMatch.slice(0, nextBracket);

    if (textAfter.length > 0) {
      tokens.push({ kind: 'ChordAndText', chord, text: textAfter });
      lastIndex += textAfter.length;
      regex.lastIndex = lastIndex;
    } else {
      tokens.push({ kind: 'Chord', chord });
    }
  }

  // Any remaining text after last chord
  if (lastIndex < cleanedText.length) {
    tokens.push({ kind: 'Text', text: cleanedText.slice(lastIndex) });
  }

  if (tokens.length === 0) {
    tokens.push({ kind: 'Text', text: cleanedText });
  }

  return {
    raw_text: rawText,
    language_index: languageIndex,
    tokens,
  };
}
