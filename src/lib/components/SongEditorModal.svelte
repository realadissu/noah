<script lang="ts">
  import { t, i18n } from '$lib/i18n';
  import { presentation } from '$lib/stores/presentation.svelte';
  import type { Song } from '$lib/types/models';
  import { PRESENTATION_BACKGROUNDS, type BackgroundItem, type BackgroundCategory } from '$lib/data/backgrounds';
  import SongEditorFormatTab from './editor/SongEditorFormatTab.svelte';
  import { type SongFormatOptions, DEFAULT_FORMAT_OPTIONS } from '$lib/types/format';
  import { parseSongFormatOptions, serializeSongFormatOptions } from '$lib/utils/formatUtils';

  type EditorTab = 'text' | 'format' | 'background' | 'categories' | 'media' | 'copyrights';

  const song = $derived<Song | null>(presentation.editingSong);

  let activeTab = $state<EditorTab>('text');
  let title = $state<string>('');
  let editorText = $state<string>('');
  let verseOrder = $state<string[]>([]);
  let langCount = $state<number>(1);

  // Formatting state
  let formatOptions = $state<SongFormatOptions>({ ...DEFAULT_FORMAT_OPTIONS });

  // Background state (20 curated presets & custom tags)
  let selectedBgCategory = $state<BackgroundCategory | 'all'>('all');
  let selectedBg = $state<string>(''); // image URL, gradient, or hex
  let bgDimmer = $state<number>(25); // 0 to 80%

  const filteredBackgrounds = $derived.by<BackgroundItem[]>(() => {
    if (selectedBgCategory === 'all') return PRESENTATION_BACKGROUNDS;
    return PRESENTATION_BACKGROUNDS.filter((b) => b.category === selectedBgCategory);
  });

  // Copyrights metadata
  let author = $state<string>('');
  let copyright = $state<string>('');
  let ccli = $state<string>('');
  let musicalKey = $state<string>('');
  let speed = $state<number | undefined>(undefined);
  let transpose = $state<number>(0);
  let titleLang2 = $state<string>('');

  // Formatting metadata
  let fontSize = $state<number>(36);
  let fontFamily = $state<string>('Arial');

  // Categories metadata
  let categories = $state<string[]>([]);
  let newCategoryInput = $state<string>('');

  // Media metadata
  let audioFile = $state<string>('');
  let chordsheetFile = $state<string>('');

  // UI state
  let isChordModalOpen = $state<boolean>(false);
  let isMarkeDropdownOpen = $state<boolean>(false);
  let newOrderPartInput = $state<string>('');
  let verseOrderInput = $state<string>('');
  let selectedAblaufIdx = $state<number | null>(null);
  let lastLoadedSongId = $state<string | null>(null);

  // Editor DOM elements
  let textareaEl = $state<HTMLTextAreaElement | null>(null);
  let backdropEl = $state<HTMLDivElement | null>(null);
  let currentSection = $state<string>(i18n.locale === 'de' ? 'Vers 1' : 'Verse 1');

  // Drag & drop state for Ablauf box
  let draggedAblaufIdx = $state<number | null>(null);
  let targetAblaufIdx = $state<number | null>(null);

  // Marker options for quick insertion
  const MARKE_OPTIONS_DE = [
    'Vers 1',
    'Vers 2',
    'Vers 3',
    'Vers 4',
    'Vers 5',
    'Vers 6',
    'Vers 7',
    'Vers 8',
    'Refrain',
    'Chorus 1',
    'Chorus 2',
    'Bridge',
    'Pre-Chorus',
    'Intro',
    'Outro',
    'Zwischenspiel',
    'Schluss',
  ];

  const MARKE_OPTIONS_EN = [
    'Verse 1',
    'Verse 2',
    'Verse 3',
    'Verse 4',
    'Verse 5',
    'Verse 6',
    'Verse 7',
    'Verse 8',
    'Chorus',
    'Chorus 1',
    'Chorus 2',
    'Bridge',
    'Pre-Chorus',
    'Intro',
    'Outro',
    'Interlude',
    'Ending',
  ];

  const markeOptions = $derived<string[]>(i18n.locale === 'de' ? MARKE_OPTIONS_DE : MARKE_OPTIONS_EN);

  const STANDARD_CATEGORIES_DE = [
    'Lobpreis & Anbetung',
    'Dank',
    'Kreuz & Gnade',
    'Glaube',
    'Gemeinde',
    'Abendmahl',
    'Taufe',
    'Ostern',
    'Weihnachten',
    'Kinderlieder',
  ];

  const STANDARD_CATEGORIES_EN = [
    'Praise & Worship',
    'Thanksgiving',
    'Cross & Grace',
    'Faith',
    'Church',
    'Communion',
    'Baptism',
    'Easter',
    'Christmas',
    'Children',
  ];

  const standardCategories = $derived<string[]>(
    i18n.locale === 'de' ? STANDARD_CATEGORIES_DE : STANDARD_CATEGORIES_EN
  );

  // Multilingual section keyword map
  const SECTION_KEYWORD_MAP: Record<string, { kind: string; hex: string; defaultLabel: string }> = {
    // German
    vers: { kind: 'verse', hex: '#0078d7', defaultLabel: 'Vers' },
    strophe: { kind: 'verse', hex: '#0078d7', defaultLabel: 'Strophe' },
    refrain: { kind: 'chorus', hex: '#7e12d4', defaultLabel: 'Refrain' },
    kehrvers: { kind: 'chorus', hex: '#7e12d4', defaultLabel: 'Kehrvers' },
    chor: { kind: 'chorus', hex: '#7e12d4', defaultLabel: 'Chor' },
    bridge: { kind: 'bridge', hex: '#cc0000', defaultLabel: 'Bridge' },
    brücke: { kind: 'bridge', hex: '#cc0000', defaultLabel: 'Brücke' },
    'pre-chorus': { kind: 'prechorus', hex: '#008080', defaultLabel: 'Pre-Chorus' },
    prechorus: { kind: 'prechorus', hex: '#008080', defaultLabel: 'Pre-Chorus' },
    'vor-refrain': { kind: 'prechorus', hex: '#008080', defaultLabel: 'Vor-Refrain' },
    vorrefrain: { kind: 'prechorus', hex: '#008080', defaultLabel: 'Vor-Refrain' },
    intro: { kind: 'intro', hex: '#475569', defaultLabel: 'Intro' },
    einleitung: { kind: 'intro', hex: '#475569', defaultLabel: 'Einleitung' },
    outro: { kind: 'outro', hex: '#475569', defaultLabel: 'Outro' },
    schluss: { kind: 'outro', hex: '#475569', defaultLabel: 'Schluss' },
    coda: { kind: 'outro', hex: '#475569', defaultLabel: 'Coda' },
    zwischenspiel: { kind: 'other', hex: '#1e40af', defaultLabel: 'Zwischenspiel' },
    interlude: { kind: 'other', hex: '#1e40af', defaultLabel: 'Interlude' },
    instrumental: { kind: 'other', hex: '#1e40af', defaultLabel: 'Instrumental' },
    solo: { kind: 'other', hex: '#1e40af', defaultLabel: 'Solo' },
    teil: { kind: 'other', hex: '#1e40af', defaultLabel: 'Teil' },

    // English
    verse: { kind: 'verse', hex: '#0078d7', defaultLabel: 'Verse' },
    chorus: { kind: 'chorus', hex: '#7e12d4', defaultLabel: 'Chorus' },
    ending: { kind: 'outro', hex: '#475569', defaultLabel: 'Ending' },
    part: { kind: 'other', hex: '#1e40af', defaultLabel: 'Part' },

    // French
    couplet: { kind: 'verse', hex: '#0078d7', defaultLabel: 'Couplet' },
    pont: { kind: 'bridge', hex: '#cc0000', defaultLabel: 'Pont' },
    fin: { kind: 'outro', hex: '#475569', defaultLabel: 'Fin' },

    // Spanish / Portuguese / Italian
    estrofa: { kind: 'verse', hex: '#0078d7', defaultLabel: 'Estrofa' },
    estrofe: { kind: 'verse', hex: '#0078d7', defaultLabel: 'Estrofe' },
    coro: { kind: 'chorus', hex: '#7e12d4', defaultLabel: 'Coro' },
    refrán: { kind: 'chorus', hex: '#7e12d4', defaultLabel: 'Refrán' },
    refrão: { kind: 'chorus', hex: '#7e12d4', defaultLabel: 'Refrão' },
    puente: { kind: 'bridge', hex: '#cc0000', defaultLabel: 'Puente' },
    ponte: { kind: 'bridge', hex: '#cc0000', defaultLabel: 'Ponte' },
    ritornello: { kind: 'chorus', hex: '#7e12d4', defaultLabel: 'Ritornello' },
  };

  function getSectionHeaderInfo(rawLine: string): { isHeader: boolean; hex: string; label: string } | null {
    const line = rawLine.trim();
    if (!line || line.startsWith('//')) return null;

    // Support SongBeamer internal $$M= tag or plaintext
    const clean = line.replace(/^\$\$M=/, '').trim();
    const lower = clean.toLowerCase();

    // Extract first word (alphanumeric with hyphen)
    const match = lower.match(/^([a-zäöüéèáàíóúñãõç-]+)/i);
    if (!match) return null;

    const firstWord = match[1];
    const info = SECTION_KEYWORD_MAP[firstWord];
    if (info) {
      return {
        isHeader: true,
        hex: info.hex,
        label: clean,
      };
    }

    return null;
  }

  // Determine section color for Ablauf items
  function getSectionColor(label: string): { hex: string } {
    const info = getSectionHeaderInfo(label);
    if (info) return { hex: info.hex };
    return { hex: '#0078d7' };
  }

  // Strict check if song currently contains valid guitar chords
  function hasValidGuitarChords(text: string): boolean {
    const bracketMatches = text.match(/\[([^\]]+)\]/g);
    if (!bracketMatches) return false;

    const VALID_ROOTS = ['C', 'C#', 'DB', 'D', 'D#', 'EB', 'E', 'F', 'F#', 'GB', 'G', 'G#', 'AB', 'A', 'A#', 'BB', 'B', 'H'];

    for (const m of bracketMatches) {
      const inner = m.slice(1, -1).trim();
      const chordMatch = inner.match(/^([A-Ha-h][b#]?)(.*)$/);
      if (chordMatch) {
        const root = chordMatch[1].toUpperCase();
        if (VALID_ROOTS.includes(root)) {
          const suffix = chordMatch[2].trim().toLowerCase();
          if (
            suffix === '' ||
            /^(m|min|maj|dim|aug|sus|add|[0-9]|\+|\-|\/|[A-Ha-h][b#]?)+$/.test(suffix)
          ) {
            return true;
          }
        }
      }
    }
    return false;
  }

  const hasChords = $derived<boolean>(hasValidGuitarChords(editorText));

  // Lossless editor text from song slides, preserving continuations and every section
  function songToText(s: Song): string {
    const parts: string[] = [];

    for (const slide of s.slides) {
      let sectionTag = '';
      if (slide.label && !slide.label.startsWith('Slide ')) {
        sectionTag = slide.label;
      } else if (slide.section) {
        const isDe = i18n.locale === 'de';
        switch (slide.section.type) {
          case 'Verse':
            sectionTag = isDe ? `Vers ${slide.section.value}` : `Verse ${slide.section.value}`;
            break;
          case 'Chorus':
            sectionTag = isDe
              ? (slide.section.value ? `Refrain ${slide.section.value}` : 'Refrain')
              : (slide.section.value ? `Chorus ${slide.section.value}` : 'Chorus');
            break;
          case 'Bridge':
            sectionTag = slide.section.value ? `Bridge ${slide.section.value}` : 'Bridge';
            break;
          case 'PreChorus':
            sectionTag = slide.section.value ? `Pre-Chorus ${slide.section.value}` : 'Pre-Chorus';
            break;
          case 'Intro':
            sectionTag = 'Intro';
            break;
          case 'Outro':
            sectionTag = isDe ? 'Schluss' : 'Outro';
            break;
          case 'Coda':
            sectionTag = 'Coda';
            break;
          case 'Interlude':
            sectionTag = isDe ? 'Zwischenspiel' : 'Interlude';
            break;
          case 'Ending':
            sectionTag = isDe ? 'Schluss' : 'Ending';
            break;
          case 'Custom':
            sectionTag = slide.section.value;
            break;
        }
      }

      const lineStrings = slide.lines.map((line) => {
        if (line.tokens && line.tokens.length > 0) {
          return line.tokens
            .map((tok) => {
              if (tok.kind === 'Chord') return `[${tok.chord}]`;
              if (tok.kind === 'ChordAndText') return `[${tok.chord}]${tok.text}`;
              return tok.text;
            })
            .join('');
        }
        return line.raw_text;
      });

      const body = lineStrings.join('\n').trim();
      let block = '';
      if (!slide.is_continuation && sectionTag) {
        block += `${sectionTag}\n`;
      }
      block += body;

      if (slide.is_continuation && parts.length > 0) {
        parts[parts.length - 1] += `\n--\n${block.trim()}`;
      } else {
        parts.push(block.trim());
      }
    }
    return parts.join('\n---\n');
  }

  // Derive unique section headers from current editor text
  const detectedSections = $derived.by<string[]>(() => {
    const allLines = editorText.split('\n');
    const detected: string[] = [];
    for (const l of allLines) {
      const info = getSectionHeaderInfo(l);
      if (info && !detected.includes(info.label)) {
        detected.push(info.label);
      }
    }
    return detected;
  });

  // Slide line analysis for accurate 16:9 overflow warnings (> 7 lines per slide)
  interface AnalyzedLine {
    lineIndex: number;
    text: string;
    isHeader: boolean;
    headerInfo: { label: string; hex: string } | null;
    isSeparator: boolean;
    isContinuation: boolean;
    slideIndex: number;
    lineInSlide: number;
    isWarningThreshold: boolean; // line 8: show optical warning guideline
    isOverflow: boolean; // line 8+: text cramped on 16:9 projection
  }

  const analyzedLines = $derived.by<AnalyzedLine[]>(() => {
    const rawLines = editorText.split('\n');
    let currentSlide = 1;
    let lineInSlide = 0;
    const result: AnalyzedLine[] = [];

    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i];
      const trimmed = line.trim();
      const isSep = trimmed === '---';
      const isCont = trimmed === '--';

      if (isSep || isCont) {
        currentSlide++;
        lineInSlide = 0;
        result.push({
          lineIndex: i,
          text: line,
          isHeader: false,
          headerInfo: null,
          isSeparator: isSep,
          isContinuation: isCont,
          slideIndex: currentSlide,
          lineInSlide: 0,
          isWarningThreshold: false,
          isOverflow: false,
        });
      } else {
        lineInSlide++;
        const info = getSectionHeaderInfo(line);
        const isWarn = lineInSlide === 8;
        const isOver = lineInSlide >= 8;
        result.push({
          lineIndex: i,
          text: line,
          isHeader: !!info,
          headerInfo: info,
          isSeparator: false,
          isContinuation: false,
          slideIndex: currentSlide,
          lineInSlide,
          isWarningThreshold: isWarn,
          isOverflow: isOver,
        });
      }
    }
    return result;
  });

  // Summary of slide overflow warnings (> 7 lines)
  const slideOverflows = $derived.by<{ slideIndex: number; totalLines: number }[]>(() => {
    const overflows: { slideIndex: number; totalLines: number }[] = [];
    const counts = new Map<number, number>();
    for (const l of analyzedLines) {
      if (!l.isSeparator && !l.isContinuation) {
        counts.set(l.slideIndex, (counts.get(l.slideIndex) ?? 0) + 1);
      }
    }
    for (const [slideIdx, cnt] of counts.entries()) {
      if (cnt > 7) {
        overflows.push({ slideIndex: slideIdx, totalLines: cnt });
      }
    }
    return overflows;
  });

  // Initialize fields from active editing song (strictly guarded to never reset user edits)
  $effect(() => {
    const s = presentation.editingSong;
    if (presentation.isSongEditorOpen && s) {
      if (s.id !== lastLoadedSongId) {
        lastLoadedSongId = s.id;
        initFromSong(s);
      }
    } else {
      lastLoadedSongId = null;
    }
  });

  function initFromSong(s: Song) {
    title = s.metadata.title;
    if (s.raw_content) {
      const lines = s.raw_content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
      const bodyLines: string[] = [];
      let inHeader = true;
      for (const line of lines) {
        if (inHeader) {
          if (line.trim() === '---') {
            inHeader = false;
            continue;
          }
          if (!line.trim().startsWith('#') && line.trim().length > 0) {
            inHeader = false;
            bodyLines.push(line);
          }
        } else {
          bodyLines.push(line);
        }
      }
      editorText = bodyLines.length > 0 ? bodyLines.join('\n') : songToText(s);
    } else {
      editorText = songToText(s);
    }
    verseOrder = [...(s.metadata.verse_order ?? [])];
    verseOrderInput = verseOrder.join(', ');
    langCount = s.metadata.lang_count || 1;
    author = s.metadata.author ?? '';
    copyright = s.metadata.copyright ?? '';
    ccli = s.metadata.ccli ?? '';
    musicalKey = s.metadata.musical_key ?? '';
    speed = s.metadata.speed;
    transpose = s.metadata.transpose ?? 0;
    titleLang2 = s.metadata.title_lang2 ?? '';
    fontSize = s.metadata.font_size ?? 0;
    formatOptions = parseSongFormatOptions(s.metadata.custom_tags || {});
    if (s.metadata.font_size !== undefined && s.metadata.font_size > 0) {
      formatOptions.fontSize = s.metadata.font_size;
    }
    fontFamily = formatOptions.fontFamily;
    categories = s.metadata.custom_tags['category']
      ? s.metadata.custom_tags['category'].split(',').map((x) => x.trim())
      : [];
    audioFile = s.metadata.custom_tags['audiofile'] ?? '';
    chordsheetFile = s.metadata.custom_tags['chordsheet'] ?? '';
    
    // Background tags from song
    selectedBg = s.metadata.custom_tags['backgroundimage'] ?? s.metadata.custom_tags['format.background'] ?? s.metadata.custom_tags['background'] ?? '';
    const dimmerTag = s.metadata.custom_tags['backgrounddimmer'];
    bgDimmer = dimmerTag ? parseInt(dimmerTag, 10) : 25;
    if (isNaN(bgDimmer)) bgDimmer = 25;

    selectedAblaufIdx = verseOrder.length > 0 ? 0 : null;
    lastCursorPos = 0;
    updateCurrentSectionFromCursor();
  }

  // Synchronize verse order array and text line
  function updateVerseOrder(items: string[]) {
    verseOrder = items;
    verseOrderInput = items.join(', ');
  }

  function handleVerseOrderInput() {
    verseOrder = verseOrderInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (selectedAblaufIdx !== null && selectedAblaufIdx >= verseOrder.length) {
      selectedAblaufIdx = verseOrder.length > 0 ? 0 : null;
    }
  }

  // Jump to section in text editor on double-click
  function jumpToSection(sec: string) {
    if (!textareaEl) return;
    const cleanSec = sec.trim().toLowerCase();
    const lines = editorText.split('\n');
    let charOffset = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const info = getSectionHeaderInfo(line);
      if (info && info.label.trim().toLowerCase() === cleanSec) {
        textareaEl.focus();
        textareaEl.setSelectionRange(charOffset, charOffset + line.length);
        currentSection = info.label;
        lastCursorPos = charOffset;
        return;
      }
      charOffset += line.length + 1;
    }
  }

  let lastCursorPos = $state<number>(0);

  function handleTextareaCursorEvent() {
    if (textareaEl) {
      lastCursorPos = textareaEl.selectionStart ?? 0;
    }
    updateCurrentSectionFromCursor();
  }

  // High-precision section detection for cursor position
  function getSectionAtCursor(text: string, pos: number): string {
    if (!text) return i18n.locale === 'de' ? 'Vers 1' : 'Verse 1';
    const allLines = text.split('\n');

    let offset = 0;
    let targetLineIdx = 0;
    for (let i = 0; i < allLines.length; i++) {
      const lineLen = allLines[i].length;
      if (pos >= offset && pos <= offset + lineLen) {
        targetLineIdx = i;
        break;
      }
      offset += lineLen + 1;
    }

    // 1. If cursor is on the header line itself
    const currentLineInfo = getSectionHeaderInfo(allLines[targetLineIdx]);
    if (currentLineInfo) {
      return currentLineInfo.label;
    }

    // 2. Scan upwards to find enclosing section header
    for (let i = targetLineIdx - 1; i >= 0; i--) {
      const info = getSectionHeaderInfo(allLines[i]);
      if (info) {
        return info.label;
      }
    }

    // 3. Scan downwards if cursor was placed before first section
    for (let i = targetLineIdx + 1; i < allLines.length; i++) {
      const info = getSectionHeaderInfo(allLines[i]);
      if (info) {
        return info.label;
      }
    }

    return i18n.locale === 'de' ? 'Vers 1' : 'Verse 1';
  }

  // Determine section at cursor position
  function updateCurrentSectionFromCursor() {
    const pos = textareaEl ? (textareaEl.selectionStart ?? lastCursorPos) : lastCursorPos;
    currentSection = getSectionAtCursor(editorText, pos);
  }

  // Ablauf: add section currently under cursor to the end
  function addCurrentSectionToAblauf() {
    updateCurrentSectionFromCursor();
    if (currentSection) {
      updateVerseOrder([...verseOrder, currentSection]);
      selectedAblaufIdx = verseOrder.length - 1;
    }
  }

  function appendSectionToAblauf(sec: string) {
    if (!sec.trim()) return;
    updateVerseOrder([...verseOrder, sec.trim()]);
    selectedAblaufIdx = verseOrder.length - 1;
  }

  function addCustomOrderPart(part: string) {
    if (!part.trim()) return;
    updateVerseOrder([...verseOrder, part.trim()]);
    newOrderPartInput = '';
    selectedAblaufIdx = verseOrder.length - 1;
  }

  function removeOrderPart(idx: number) {
    updateVerseOrder(verseOrder.filter((_, i) => i !== idx));
    if (selectedAblaufIdx !== null) {
      if (selectedAblaufIdx === idx) {
        selectedAblaufIdx = verseOrder.length > 0 ? Math.min(idx, verseOrder.length - 1) : null;
      } else if (selectedAblaufIdx > idx) {
        selectedAblaufIdx -= 1;
      }
    }
  }

  function moveSelectedAblaufUp() {
    if (selectedAblaufIdx === null || selectedAblaufIdx <= 0) return;
    const items = [...verseOrder];
    const prev = items[selectedAblaufIdx - 1];
    items[selectedAblaufIdx - 1] = items[selectedAblaufIdx];
    items[selectedAblaufIdx] = prev;
    updateVerseOrder(items);
    selectedAblaufIdx -= 1;
  }

  function moveSelectedAblaufDown() {
    if (selectedAblaufIdx === null || selectedAblaufIdx >= verseOrder.length - 1) return;
    const items = [...verseOrder];
    const next = items[selectedAblaufIdx + 1];
    items[selectedAblaufIdx + 1] = items[selectedAblaufIdx];
    items[selectedAblaufIdx] = next;
    updateVerseOrder(items);
    selectedAblaufIdx += 1;
  }

  function removeSelectedAblauf() {
    if (selectedAblaufIdx === null || selectedAblaufIdx >= verseOrder.length) return;
    removeOrderPart(selectedAblaufIdx);
  }

  // Lightning Auto-populate Ablauf
  function autoPopulateAblauf() {
    const detected = detectedSections;
    if (detected.length === 0) return;

    if (
      detected.some((s) => s.toLowerCase().startsWith('vers') || s.toLowerCase().startsWith('strophe')) &&
      detected.some((s) => s.toLowerCase().startsWith('refrain') || s.toLowerCase().startsWith('chorus'))
    ) {
      const order: string[] = [];
      const verses = detected.filter((s) => s.toLowerCase().startsWith('vers') || s.toLowerCase().startsWith('strophe'));
      const chorus = detected.find((s) => s.toLowerCase().startsWith('refrain') || s.toLowerCase().startsWith('chorus')) || (i18n.locale === 'de' ? 'Refrain' : 'Chorus');
      const bridge = detected.find((s) => s.toLowerCase().startsWith('bridge'));

      for (const v of verses) {
        order.push(v);
        order.push(chorus);
      }
      if (bridge) {
        order.push(bridge);
        order.push(chorus);
      }
      updateVerseOrder(order);
    } else {
      updateVerseOrder([...detected]);
    }
    selectedAblaufIdx = verseOrder.length > 0 ? 0 : null;
  }

  // Ablauf Drag & Drop reordering
  function handleAblaufDragStart(e: DragEvent, idx: number) {
    draggedAblaufIdx = idx;
    selectedAblaufIdx = idx;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(idx));
    }
  }

  function handleAblaufDragOver(e: DragEvent, idx: number) {
    e.preventDefault();
    if (draggedAblaufIdx !== null && draggedAblaufIdx !== idx) {
      targetAblaufIdx = idx;
    }
  }

  function handleAblaufDrop(e: DragEvent, idx: number) {
    e.preventDefault();
    if (draggedAblaufIdx !== null && draggedAblaufIdx !== idx) {
      const items = [...verseOrder];
      const [moved] = items.splice(draggedAblaufIdx, 1);
      items.splice(idx, 0, moved);
      updateVerseOrder(items);
      selectedAblaufIdx = idx;
    }
    draggedAblaufIdx = null;
    targetAblaufIdx = null;
  }

  function handleAblaufDragEnd() {
    draggedAblaufIdx = null;
    targetAblaufIdx = null;
  }

  // Insertion helpers for markers, page breaks, and line breaks
  function insertMarker(markerName: string) {
    if (!textareaEl) {
      editorText += (editorText ? '\n---\n' : '') + `${markerName}\n`;
      isMarkeDropdownOpen = false;
      return;
    }
    const start = textareaEl.selectionStart;
    const end = textareaEl.selectionEnd;
    const text = editorText;
    const before = text.slice(0, start);
    const after = text.slice(end);

    const prefix = before.length === 0 ? '' : before.endsWith('\n') ? '---\n' : '\n---\n';
    const insertion = `${prefix}${markerName}\n`;
    const newText = before + insertion + after;
    const newCursorPos = start + insertion.length;

    editorText = newText;
    textareaEl.value = newText;
    textareaEl.focus();
    textareaEl.setSelectionRange(newCursorPos, newCursorPos);
    updateCurrentSectionFromCursor();
    isMarkeDropdownOpen = false;
  }

  function insertSlideSeparator() {
    if (!textareaEl) {
      editorText += '\n---\n';
      return;
    }

    const start = textareaEl.selectionStart;
    const end = textareaEl.selectionEnd;
    const text = editorText;

    const before = text.slice(0, start);
    const after = text.slice(end);

    const prefix = before.length === 0 || before.endsWith('\n') ? '' : '\n';
    const suffix = after.length === 0 || after.startsWith('\n') ? '' : '\n';

    const separator = `${prefix}---\n${suffix}`;
    const newText = before + separator + after;
    const newCursorPos = start + separator.length;

    editorText = newText;
    textareaEl.value = newText;
    textareaEl.focus();
    textareaEl.setSelectionRange(newCursorPos, newCursorPos);
    updateCurrentSectionFromCursor();
  }

  function insertContinuationBreak() {
    if (!textareaEl) {
      editorText += '\n--\n';
      return;
    }

    const start = textareaEl.selectionStart;
    const end = textareaEl.selectionEnd;
    const text = editorText;

    const before = text.slice(0, start);
    const after = text.slice(end);

    const prefix = before.length === 0 || before.endsWith('\n') ? '' : '\n';
    const suffix = after.length === 0 || after.startsWith('\n') ? '' : '\n';

    const separator = `${prefix}--\n${suffix}`;
    const newText = before + separator + after;
    const newCursorPos = start + separator.length;

    editorText = newText;
    textareaEl.value = newText;
    textareaEl.focus();
    textareaEl.setSelectionRange(newCursorPos, newCursorPos);
    updateCurrentSectionFromCursor();
  }

  function handleTextareaBeforeInput(e: InputEvent) {
    // Intercept macOS smart dash substitution (em-dash U+2014 or en-dash U+2013)
    if (e.data === '—' || e.data === '–') {
      e.preventDefault();
      if (!textareaEl) return;
      const start = textareaEl.selectionStart;
      const end = textareaEl.selectionEnd;
      const val = textareaEl.value;
      const nextVal = val.slice(0, start) + '---' + val.slice(end);
      textareaEl.value = nextVal;
      editorText = nextVal;
      textareaEl.setSelectionRange(start + 3, start + 3);
      updateCurrentSectionFromCursor();
    }
  }

  function handleTextareaKeyDown(e: KeyboardEvent) {
    if (e.key === '-' && textareaEl) {
      const start = textareaEl.selectionStart;
      if (start >= 2 && editorText.slice(start - 2, start) === '--') {
        // Prevent macOS text replacement hook
        e.preventDefault();
        const end = textareaEl.selectionEnd;
        const val = textareaEl.value;
        const nextVal = val.slice(0, start) + '-' + val.slice(end);
        textareaEl.value = nextVal;
        editorText = nextVal;
        textareaEl.setSelectionRange(start + 1, start + 1);
        updateCurrentSectionFromCursor();
      }
    }
  }

  function handleTextareaInput(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    const val = target.value;

    editorText = val;
    lastCursorPos = start;
    updateCurrentSectionFromCursor();

    // Critical fix: In Chromium/WebKit, Svelte's reactive reconciliation on bound elements
    // can reset the caret position to the end of the text on Backspace or deletion.
    // We immediately restore the exact cursor range on requestAnimationFrame.
    requestAnimationFrame(() => {
      if (document.activeElement === target && (target.selectionStart !== start || target.selectionEnd !== end)) {
        target.setSelectionRange(start, end);
      }
    });
  }

  function handleScroll(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    if (backdropEl) {
      backdropEl.scrollTop = target.scrollTop;
      backdropEl.scrollLeft = target.scrollLeft;
    }
  }

  // Chord tools
  async function transposeBy(semitones: number) {
    editorText = await presentation.transposeLyrics(editorText, semitones);
    transpose += semitones;
  }

  async function stripAllChords() {
    editorText = await presentation.stripChords(editorText);
  }

  // Save changes
  async function handleSave() {
    if (!title.trim()) {
      alert(t('editor.enterTitleAlert'));
      return;
    }

    let sngContent = `#Title=${title.trim()}\n`;
    if (author.trim()) sngContent += `#Author=${author.trim()}\n`;
    if (copyright.trim()) sngContent += `#Copyright=${copyright.trim()}\n`;
    if (ccli.trim()) sngContent += `#CCLI=${ccli.trim()}\n`;
    if (musicalKey.trim()) sngContent += `#Key=${musicalKey.trim()}\n`;
    if (speed) sngContent += `#Speed=${speed}\n`;
    if (transpose !== 0) sngContent += `#Transpose=${transpose}\n`;
    if (formatOptions.fontSize > 0) sngContent += `#FontSize=${formatOptions.fontSize}\n`;
    if (verseOrder.length > 0) sngContent += `#VerseOrder=${verseOrder.join(',')}\n`;
    if (langCount > 1) sngContent += `#LangCount=${langCount}\n`;
    if (titleLang2.trim()) sngContent += `#TitleLang2=${titleLang2.trim()}\n`;
    if (categories.length > 0) sngContent += `#category=${categories.join(',')}\n`;
    if (audioFile.trim()) sngContent += `#AudioFile=${audioFile.trim()}\n`;
    if (chordsheetFile.trim()) sngContent += `#Chordsheet=${chordsheetFile.trim()}\n`;

    // Save formatting options
    const formatTags = serializeSongFormatOptions(formatOptions);
    for (const [k, v] of Object.entries(formatTags)) {
      if (k.toLowerCase() !== 'fontsize') {
        sngContent += `#${k}=${v}\n`;
      }
    }

    // Preserve custom tags from original song (excluding managed tags)
    if (song?.metadata?.custom_tags) {
      for (const [k, v] of Object.entries(song.metadata.custom_tags)) {
        const lowerK = k.toLowerCase();
        if (
          lowerK !== 'title' &&
          lowerK !== 'author' &&
          lowerK !== 'artist' &&
          lowerK !== 'copyright' &&
          lowerK !== 'ccli' &&
          lowerK !== 'key' &&
          lowerK !== 'tonart' &&
          lowerK !== 'speed' &&
          lowerK !== 'transpose' &&
          lowerK !== 'fontsize' &&
          lowerK !== 'verseorder' &&
          lowerK !== 'langcount' &&
          lowerK !== 'titlelang2' &&
          lowerK !== 'category' &&
          lowerK !== 'audiofile' &&
          lowerK !== 'chordsheet' &&
          lowerK !== 'backgroundimage' &&
          lowerK !== 'backgrounddimmer' &&
          lowerK !== 'format.background' &&
          lowerK !== 'background' &&
          lowerK !== 'font' &&
          lowerK !== 'fontlang2' &&
          lowerK !== 'titleformat' &&
          lowerK !== 'format' &&
          lowerK !== 'formatlang2' &&
          lowerK !== 'formatlang3' &&
          lowerK !== 'formatlang4' &&
          lowerK !== 'chordcolor' &&
          lowerK !== 'copyrightcolor' &&
          lowerK !== 'tpleftcolor' &&
          lowerK !== 'tprightcolor' &&
          lowerK !== 'outlinecolor' &&
          lowerK !== 'outline' &&
          lowerK !== 'textstyleoutline' &&
          lowerK !== 'shadowcolor' &&
          lowerK !== 'shadow' &&
          lowerK !== 'textstyleshadow' &&
          lowerK !== 'useownbackgroundprofile' &&
          lowerK !== 'formatpreline' &&
          lowerK !== 'formatprepage'
        ) {
          sngContent += `#${k}=${v}\n`;
        }
      }
    }

    // Save chosen presentation background & dimmer
    if (selectedBg) {
      if (selectedBg.startsWith('/') || selectedBg.endsWith('.jpg') || selectedBg.endsWith('.png') || selectedBg.endsWith('.webp')) {
        sngContent += `#BackgroundImage=${selectedBg}\n`;
      } else {
        sngContent += `#Format.Background=${selectedBg}\n`;
      }
      sngContent += `#BackgroundDimmer=${bgDimmer}\n`;
    }

    sngContent += '---\n' + editorText.trim();

    const parsed = await presentation.parseSongContent(sngContent);
    if (parsed) {
      if (song) {
        parsed.id = song.id;
      }
      parsed.raw_content = sngContent;
      await presentation.saveEditedSong(parsed);
    } else {
      alert(t('editor.parseErrorAlert'));
    }
  }

  function handleCancel() {
    presentation.closeSongEditor();
  }
</script>

{#if presentation.isSongEditorOpen && song}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 font-sans"
    style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; width: 100vw; height: 100vh;"
    role="dialog"
    aria-modal="true"
    aria-label={t('editor.title')}
  >
    <!-- Modal Window (Replicating SongBeamer "Song bearbeiten" Window authentically) -->
    <div
      class="w-full max-w-5xl h-[88vh] min-h-[640px] max-h-[900px] flex flex-col rounded-xl border shadow-2xl overflow-hidden transition-all {presentation.theme === 'dark'
        ? 'bg-[#1e2229] border-neutral-700 text-neutral-100 shadow-black/80'
        : 'bg-[#ece9d8] border-neutral-400 text-neutral-900 shadow-2xl'}"
    >
      <!-- Title Bar -->
      <div
        class="h-10 px-3.5 flex items-center justify-between border-b shrink-0 font-bold text-sm select-none {presentation.theme === 'dark'
          ? 'bg-[#181a20] border-neutral-700 text-neutral-200'
          : 'bg-[#0055ea] border-[#0040b0] text-white'}"
      >
        <div class="flex items-center gap-2">
          <span>🎵</span>
          <span>{t('editor.editSong', { title: title || t('editor.newSong') })}</span>
        </div>
        <button
          type="button"
          class="w-7 h-7 rounded flex items-center justify-center hover:bg-red-600 hover:text-white transition cursor-pointer font-bold text-sm"
          onclick={handleCancel}
          title={t('settings.closeTitle')}
        >
          ✕
        </button>
      </div>

      <!-- Navigation Tabs (Text | Formatierung | Hintergrund | Kategorien | Medien | Copyrights) -->
      <div
        class="flex items-center px-3 pt-1 border-b gap-1.5 text-sm shrink-0 select-none {presentation.theme === 'dark'
          ? 'bg-[#252932] border-neutral-700'
          : 'bg-[#dfdbcf] border-neutral-400'}"
      >
        <button
          type="button"
          class="px-3.5 py-1.5 rounded-t-md font-semibold transition cursor-pointer border-t border-l border-r {activeTab === 'text'
            ? presentation.theme === 'dark'
              ? 'bg-[#1e2229] border-neutral-700 text-amber-400 border-b-transparent shadow-xs'
              : 'bg-[#ece9d8] border-neutral-400 text-neutral-900 border-b-transparent font-bold'
            : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300'}"
          onclick={() => (activeTab = 'text')}
        >
          {t('editor.tabs.text')}
        </button>
        <button
          type="button"
          class="px-3.5 py-1.5 rounded-t-md font-semibold transition cursor-pointer border-t border-l border-r {activeTab === 'format'
            ? presentation.theme === 'dark'
              ? 'bg-[#1e2229] border-neutral-700 text-amber-400 border-b-transparent shadow-xs'
              : 'bg-[#ece9d8] border-neutral-400 text-neutral-900 border-b-transparent font-bold'
            : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300'}"
          onclick={() => (activeTab = 'format')}
        >
          {t('editor.tabs.format')}
        </button>
        <button
          type="button"
          class="px-3.5 py-1.5 rounded-t-md font-semibold transition cursor-pointer border-t border-l border-r {activeTab === 'background'
            ? presentation.theme === 'dark'
              ? 'bg-[#1e2229] border-neutral-700 text-amber-400 border-b-transparent shadow-xs'
              : 'bg-[#ece9d8] border-neutral-400 text-neutral-900 border-b-transparent font-bold'
            : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300'}"
          onclick={() => (activeTab = 'background')}
        >
          {t('editor.tabs.background')}
        </button>
        <button
          type="button"
          class="px-3.5 py-1.5 rounded-t-md font-semibold transition cursor-pointer border-t border-l border-r {activeTab === 'categories'
            ? presentation.theme === 'dark'
              ? 'bg-[#1e2229] border-neutral-700 text-amber-400 border-b-transparent shadow-xs'
              : 'bg-[#ece9d8] border-neutral-400 text-neutral-900 border-b-transparent font-bold'
            : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300'}"
          onclick={() => (activeTab = 'categories')}
        >
          {t('editor.tabs.categories')}
        </button>
        <button
          type="button"
          class="px-3.5 py-1.5 rounded-t-md font-semibold transition cursor-pointer border-t border-l border-r {activeTab === 'media'
            ? presentation.theme === 'dark'
              ? 'bg-[#1e2229] border-neutral-700 text-amber-400 border-b-transparent shadow-xs'
              : 'bg-[#ece9d8] border-neutral-400 text-neutral-900 border-b-transparent font-bold'
            : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300'}"
          onclick={() => (activeTab = 'media')}
        >
          {t('editor.tabs.media')}
        </button>
        <button
          type="button"
          class="px-3.5 py-1.5 rounded-t-md font-semibold transition cursor-pointer border-t border-l border-r {activeTab === 'copyrights'
            ? presentation.theme === 'dark'
              ? 'bg-[#1e2229] border-neutral-700 text-amber-400 border-b-transparent shadow-xs'
              : 'bg-[#ece9d8] border-neutral-400 text-neutral-900 border-b-transparent font-bold'
            : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300'}"
          onclick={() => (activeTab = 'copyrights')}
        >
          {t('editor.tabs.copyrights')}
        </button>
      </div>

      <!-- Main Body Area -->
      <div class="flex-1 overflow-y-auto p-3.5 flex flex-col gap-3 min-h-0 select-text">
        {#if activeTab === 'text'}
          <!-- 1. Song Title Input & Top Action Buttons (OK, Abbrechen, Akkorde, Hintergrund) -->
          <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
            <div class="flex-1 flex items-center gap-2.5">
              <label for="song-title-input" class="text-sm font-bold shrink-0">{t('editor.titleLabel')}</label>
              <input
                id="song-title-input"
                type="text"
                bind:value={title}
                placeholder={t('editor.titlePlaceholder')}
                class="flex-1 px-3 py-1.5 text-base rounded border focus:outline-none {presentation.theme === 'dark'
                  ? 'bg-neutral-900 border-neutral-700 text-white focus:border-amber-500'
                  : 'bg-white border-neutral-400 text-neutral-900 focus:border-blue-600'}"
              />
            </div>

            <!-- Top Right Action Buttons -->
            <div class="flex items-center gap-2 shrink-0 justify-end">
              <button
                id="save-song-btn"
                type="button"
                class="px-3.5 py-1.5 rounded text-sm font-bold flex items-center gap-1.5 transition border cursor-pointer {presentation.theme === 'dark'
                  ? 'bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border-emerald-500/50'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 shadow-xs'}"
                onclick={handleSave}
              >
                <span>✓</span>
                <span>{t('editor.ok')}</span>
              </button>
              <button
                id="cancel-song-btn"
                type="button"
                class="px-3.5 py-1.5 rounded text-sm font-bold flex items-center gap-1.5 transition border cursor-pointer {presentation.theme === 'dark'
                  ? 'bg-red-600/30 hover:bg-red-600/50 text-red-300 border-red-500/50'
                  : 'bg-red-600 hover:bg-red-700 text-white border-red-700 shadow-xs'}"
                onclick={handleCancel}
              >
                <span>✕</span>
                <span>{t('editor.cancel')}</span>
              </button>
              <button
                type="button"
                class="px-3 py-1.5 rounded text-sm font-medium flex items-center gap-1.5 transition border cursor-pointer {presentation.theme === 'dark'
                  ? 'bg-neutral-800 hover:bg-neutral-700 text-emerald-400 border-neutral-700'
                  : 'bg-white hover:bg-neutral-100 text-emerald-700 border-neutral-400'}"
                onclick={() => (isChordModalOpen = !isChordModalOpen)}
                title={t('editor.chordsBtn')}
              >
                <span class="font-bold">C#</span>
                <span>{t('editor.chordsBtn')}</span>
              </button>
              <button
                type="button"
                class="px-3 py-1.5 rounded text-sm font-medium transition border cursor-pointer {presentation.theme === 'dark'
                  ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-700'
                  : 'bg-white hover:bg-neutral-100 text-neutral-800 border-neutral-400'}"
                onclick={() => (activeTab = 'background')}
              >
                {t('editor.bgBtn')}
              </button>
            </div>
          </div>

          <!-- Chord Tool Popover if opened -->
          {#if isChordModalOpen}
            <div
              class="p-3 rounded-lg border shadow-lg flex flex-wrap items-center gap-2 text-sm shrink-0 {presentation.theme === 'dark'
                ? 'bg-neutral-900 border-neutral-700 text-white'
                : 'bg-white border-neutral-400 text-neutral-900'}"
            >
              <span class="font-bold">{t('editor.transposeTitle')}</span>
              <button
                type="button"
                class="px-2.5 py-1 rounded border hover:bg-black/10 cursor-pointer font-bold"
                onclick={() => transposeBy(1)}
              >
                {t('editor.transposePlus1')}
              </button>
              <button
                type="button"
                class="px-2.5 py-1 rounded border hover:bg-black/10 cursor-pointer font-bold"
                onclick={() => transposeBy(-1)}
              >
                {t('editor.transposeMinus1')}
              </button>
              <button
                type="button"
                class="px-2.5 py-1 rounded border hover:bg-black/10 cursor-pointer font-bold"
                onclick={() => transposeBy(2)}
              >
                {t('editor.transposePlus2')}
              </button>
              <button
                type="button"
                class="px-2.5 py-1 rounded border hover:bg-black/10 cursor-pointer font-bold"
                onclick={() => transposeBy(-2)}
              >
                {t('editor.transposeMinus2')}
              </button>
              <div class="w-px h-6 bg-neutral-500/40 mx-1"></div>
              <button
                type="button"
                class="px-2.5 py-1 rounded border text-red-500 hover:bg-red-500/10 cursor-pointer font-bold"
                onclick={stripAllChords}
                title={t('editor.stripChordsTooltip')}
              >
                {t('editor.stripChordsFull')}
              </button>
              <button
                type="button"
                class="ml-auto text-xs opacity-60 hover:opacity-100 cursor-pointer font-semibold"
                onclick={() => (isChordModalOpen = false)}
              >
                {t('editor.done')}
              </button>
            </div>
          {/if}

          <!-- 2. Dual Column: Left = Main Text Editor with Toolbar, Right = Ablauf & Controls -->
          <div class="flex-1 flex flex-col md:flex-row gap-3 min-h-[340px] overflow-hidden">
            <!-- Left Column: Unified Text Editor with Automatic Header Banners -->
            <div
              class="flex-1 flex flex-col rounded-lg border overflow-hidden relative {presentation.theme === 'dark'
                ? 'bg-neutral-950 border-neutral-700'
                : 'bg-white border-neutral-400'}"
            >
              <!-- SongBeamer Editor Toolbar above text area -->
              <div
                class="h-9 px-3 border-b flex items-center justify-end gap-1.5 text-xs shrink-0 select-none {presentation.theme === 'dark'
                  ? 'bg-neutral-900 border-neutral-800'
                  : 'bg-[#f4f3ed] border-neutral-300'}"
              >
                <!-- Quick Chords buttons in toolbar -->
                <div class="flex items-center gap-1.5">
                  <button
                    type="button"
                    class="px-2 py-1 rounded border text-xs font-bold hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer {presentation.theme === 'dark'
                      ? 'border-neutral-700 text-emerald-400'
                      : 'border-neutral-300 text-emerald-700'}"
                    onclick={() => transposeBy(1)}
                    title={t('editor.transposeHalfUpTooltip')}
                  >
                    {t('editor.transposeHalfUp')}
                  </button>
                  <button
                    type="button"
                    class="px-2 py-1 rounded border text-xs font-bold hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer {presentation.theme === 'dark'
                      ? 'border-neutral-700 text-emerald-400'
                      : 'border-neutral-300 text-emerald-700'}"
                    onclick={() => transposeBy(-1)}
                    title={t('editor.transposeHalfDownTooltip')}
                  >
                    {t('editor.transposeHalfDown')}
                  </button>
                  <button
                    type="button"
                    class="px-2 py-1 rounded border text-xs text-red-500 hover:bg-red-500/10 cursor-pointer font-bold {presentation.theme === 'dark'
                      ? 'border-neutral-700'
                      : 'border-neutral-300'}"
                    onclick={stripAllChords}
                    title={t('editor.stripChordsTooltip')}
                  >
                    ✂️ {t('editor.stripChords')}
                  </button>
                </div>
              </div>

              <!-- Slide Overflow Warning Bar (Live warning when any slide has > 7 lines) -->
              {#if slideOverflows.length > 0}
                <div class="flex items-center justify-between gap-2 px-3 py-1.5 bg-amber-500/15 border-b border-amber-500/30 text-xs text-amber-800 dark:text-amber-200 font-medium">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    {#each slideOverflows as ovf}
                      <span class="inline-flex items-center gap-1 bg-amber-500/25 px-2 py-0.5 rounded font-bold text-amber-800 dark:text-amber-300">
                        {t('editor.slideOverflowBadge', { slide: ovf.slideIndex, count: ovf.totalLines })}
                      </span>
                    {/each}
                  </div>
                  <button
                    type="button"
                    class="px-2.5 py-0.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded text-[11px] cursor-pointer shrink-0 transition shadow-2xs"
                    onclick={insertSlideSeparator}
                    title={t('editor.splitSlideBtn')}
                  >
                    ✂️ {t('editor.splitSlideBtn')}
                  </button>
                </div>
              {/if}

              <!-- Main text area with syntax-highlighted section banners & guidelines -->
              <div class="relative flex-1 w-full h-full min-h-[300px] overflow-hidden flex flex-col bg-white dark:bg-neutral-950 font-mono text-[14px] leading-[26px]">
                <!-- Vertical guideline for recommended max line length (~50 characters, matching SongBeamer RightLinePen) -->
                <div
                  class="absolute inset-y-0 border-r border-dotted border-neutral-400/80 dark:border-neutral-600/80 pointer-events-none z-10"
                  style="left: calc(50ch + 14px);"
                  title={t('editor.lineLimitGuide')}
                  aria-hidden="true"
                ></div>

                <!-- Backdrop Layer: Automatic Section Header Banners, Red '---' / '--' styling, and Slide-Height 8-line Warning Marker -->
                <div
                  bind:this={backdropEl}
                  class="absolute inset-0 p-3.5 overflow-hidden pointer-events-none select-none z-0"
                  style="font-family: Consolas, 'Courier New', ui-monospace, monospace; font-size: 14px; line-height: 26px; tab-size: 4;"
                  aria-hidden="true"
                >
                  {#each analyzedLines as line (line.lineIndex)}
                    {#if line.headerInfo}
                      <div
                        style="background-color: {line.headerInfo.hex}; font-family: Consolas, 'Courier New', ui-monospace, monospace; line-height: 26px; height: 26px;"
                        class="w-full text-white font-bold px-1.5 rounded-xs h-[26px] leading-[26px] whitespace-pre text-[14px] overflow-hidden"
                      >
                        {line.text}
                      </div>
                    {:else if line.isSeparator}
                      <div
                        style="font-family: Consolas, 'Courier New', ui-monospace, monospace; line-height: 26px; height: 26px;"
                        class="text-red-600 font-bold h-[26px] leading-[26px] whitespace-pre text-[14px]"
                      >
                        {line.text}
                      </div>
                    {:else if line.isContinuation}
                      <div
                        style="font-family: Consolas, 'Courier New', ui-monospace, monospace; line-height: 26px; height: 26px;"
                        class="text-red-500 font-bold h-[26px] leading-[26px] whitespace-pre text-[14px]"
                      >
                        {line.text}
                      </div>
                    {:else}
                      <div
                        style="font-family: Consolas, 'Courier New', ui-monospace, monospace; line-height: 26px; height: 26px;"
                        class="h-[26px] leading-[26px] whitespace-pre overflow-hidden text-[14px] relative {line.isOverflow
                          ? 'bg-amber-500/15 text-amber-900 dark:text-amber-200 border-l-4 border-amber-500 pl-1'
                          : 'text-neutral-900 dark:text-neutral-100'}"
                      >
                        {line.text || ' '}
                        {#if line.isWarningThreshold}
                          <!-- Red dashed horizontal guideline right on top edge of line 8 -->
                          <div class="absolute inset-x-0 top-0 border-t-2 border-dashed border-red-500 pointer-events-none"></div>
                          <span
                            class="absolute right-2 top-0 -translate-y-1/2 text-[10px] font-sans font-bold bg-red-600 text-white px-2 py-0.5 rounded shadow-xs z-10 pointer-events-none tracking-normal"
                            title={t('editor.slideHeightWarning')}
                          >
                            ⚠️ {t('editor.slideHeightWarning')}
                          </span>
                        {/if}
                      </div>
                    {/if}
                  {/each}

                  <!-- SongBeamer authentic EndOfTextMark: Red line right below the last text line -->
                  {#if editorText.trim()}
                    <div class="w-full border-b-2 border-red-600 my-1 pointer-events-none" title="Textende (SongBeamer EndOfTextMark)"></div>
                  {/if}
                </div>

                <!-- Input Textarea: Pixel-perfect baseline & Consolas font alignment matching backdrop -->
                <textarea
                  id="song-text-editor"
                  bind:this={textareaEl}
                  bind:value={editorText}
                  oninput={handleTextareaInput}
                  onbeforeinput={handleTextareaBeforeInput}
                  onkeydown={handleTextareaKeyDown}
                  onscroll={handleScroll}
                  onclick={handleTextareaCursorEvent}
                  onkeyup={handleTextareaCursorEvent}
                  onselect={handleTextareaCursorEvent}
                  spellcheck="false"
                  autocomplete="off"
                  autocapitalize="off"
                  data-gramm="false"
                  placeholder={t('editor.textPlaceholder')}
                  style="font-family: Consolas, 'Courier New', ui-monospace, monospace; font-size: 14px; line-height: 26px; padding: 14px; tab-size: 4;"
                  class="absolute inset-0 w-full h-full resize-none focus:outline-none bg-transparent text-transparent caret-blue-600 dark:caret-amber-400 selection:bg-blue-500/35 selection:text-transparent select-text whitespace-pre overflow-y-auto z-20"
                ></textarea>
              </div>
            </div>

            <!-- Right Column: Ablauf (Order of Service) & Language / Slide Controls -->
            <div class="w-full md:w-72 flex flex-col gap-3 shrink-0 text-sm">
              <!-- Ablauf Box -->
              <div
                class="flex-1 flex flex-col rounded-lg border p-3 {presentation.theme === 'dark'
                  ? 'bg-neutral-900/60 border-neutral-700'
                  : 'bg-white border-neutral-400'}"
              >
                <!-- Ablauf Header with Actions -->
                <div class="flex items-center justify-between font-bold mb-2">
                  <span class="text-sm font-bold">{t('editor.verseOrder')}</span>
                  <div class="flex items-center gap-1.5">
                    <button
                      id="add-part-current-btn"
                      type="button"
                      class="w-7 h-7 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base flex items-center justify-center cursor-pointer transition shadow-2xs"
                      onclick={addCurrentSectionToAblauf}
                      title={t('editor.addPartCurrentTooltip')}
                    >
                      +
                    </button>
                    <button
                      id="auto-ablauf-btn"
                      type="button"
                      class="px-2 py-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition cursor-pointer font-bold text-xs text-amber-500 border border-amber-500/30"
                      onclick={autoPopulateAblauf}
                      title={t('editor.autoAblaufTooltip')}
                    >
                      {t('editor.autoAblauf')}
                    </button>
                  </div>
                </div>

                <!-- Sequence list with colored badges matching SongBeamer & Drag'n'Drop -->
                <div
                  class="flex-1 min-h-[140px] max-h-52 overflow-y-auto border rounded p-1 space-y-0.5 select-none {presentation.theme === 'dark'
                    ? 'bg-neutral-950 border-neutral-800'
                    : 'bg-white border-neutral-300'}"
                >
                  {#if verseOrder.length === 0}
                    <div class="text-xs text-neutral-400 p-2 text-center">
                      {t('editor.noVerseOrder')}
                    </div>
                  {:else}
                    {#each verseOrder as item, idx}
                      {@const color = getSectionColor(item)}
                      {@const isSelected = selectedAblaufIdx === idx}
                      {@const isDragging = draggedAblaufIdx === idx}
                      {@const isTarget = targetAblaufIdx === idx && draggedAblaufIdx !== null}

                      <div
                        role="button"
                        tabindex="0"
                        draggable="true"
                        onclick={() => (selectedAblaufIdx = idx)}
                        ondblclick={() => jumpToSection(item)}
                        onkeydown={(e) => {
                          if (e.key === 'Enter') selectedAblaufIdx = idx;
                        }}
                        ondragstart={(e) => handleAblaufDragStart(e, idx)}
                        ondragover={(e) => handleAblaufDragOver(e, idx)}
                        ondrop={(e) => handleAblaufDrop(e, idx)}
                        ondragend={handleAblaufDragEnd}
                        class="px-2.5 py-1.5 rounded text-sm font-bold flex items-center justify-between group cursor-grab active:cursor-grabbing transition relative {isSelected
                          ? presentation.theme === 'dark'
                            ? 'bg-blue-600/30 border border-blue-500'
                            : 'bg-blue-100 border border-blue-400'
                          : ''} {isDragging ? 'opacity-30 border border-dashed border-amber-500' : ''} {presentation.theme === 'dark'
                          ? 'hover:bg-neutral-800'
                          : 'hover:bg-neutral-100'}"
                        style="color: {color.hex};"
                      >
                        <!-- Drag drop indicator bar -->
                        {#if isTarget}
                          <div class="absolute -top-[2px] left-0 right-0 h-[2px] bg-amber-400 pointer-events-none"></div>
                        {/if}

                        <span class="truncate">{idx + 1}. {item}</span>
                        <button
                          type="button"
                          class="opacity-0 group-hover:opacity-100 text-red-500 text-xs hover:font-black cursor-pointer ml-1"
                          onclick={(e) => {
                            e.stopPropagation();
                            removeOrderPart(idx);
                          }}
                          title={t('schedule.remove')}
                        >
                          ✕
                        </button>
                      </div>
                    {/each}
                  {/if}
                </div>

                <!-- Up, Down, Remove buttons for selected item in Ablauf -->
                <div class="flex items-center justify-between mt-2 pt-1.5 border-t border-neutral-300 dark:border-neutral-800">
                  <div class="flex items-center gap-1">
                    <button
                      id="move-ablauf-up-btn"
                      type="button"
                      class="px-2.5 py-1 rounded border hover:bg-black/5 dark:hover:bg-white/10 font-bold text-xs disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed {presentation.theme === 'dark'
                        ? 'border-neutral-700 text-neutral-300'
                        : 'border-neutral-300 text-neutral-700'}"
                      onclick={moveSelectedAblaufUp}
                      disabled={selectedAblaufIdx === null || selectedAblaufIdx <= 0}
                      title={t('editor.movePartUp')}
                    >
                      ▲
                    </button>
                    <button
                      id="move-ablauf-down-btn"
                      type="button"
                      class="px-2.5 py-1 rounded border hover:bg-black/5 dark:hover:bg-white/10 font-bold text-xs disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed {presentation.theme === 'dark'
                        ? 'border-neutral-700 text-neutral-300'
                        : 'border-neutral-300 text-neutral-700'}"
                      onclick={moveSelectedAblaufDown}
                      disabled={selectedAblaufIdx === null || selectedAblaufIdx >= verseOrder.length - 1}
                      title={t('editor.movePartDown')}
                    >
                      ▼
                    </button>
                  </div>
                  <button
                    id="remove-ablauf-btn"
                    type="button"
                    class="px-2.5 py-1 rounded border text-red-500 hover:bg-red-500/10 font-bold text-xs disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed {presentation.theme === 'dark'
                      ? 'border-neutral-700'
                      : 'border-neutral-300'}"
                    onclick={removeSelectedAblauf}
                    disabled={selectedAblaufIdx === null || verseOrder.length === 0}
                    title={t('editor.removePart')}
                  >
                    {t('editor.removePart')}
                  </button>
                </div>

                <!-- Quick-Add Chips for detected sections in song -->
                {#if detectedSections.length > 0}
                  <div class="mt-2.5">
                    <span class="text-xs opacity-75 font-semibold block mb-1">{t('editor.availableParts')}</span>
                    <div class="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                      {#each detectedSections as sec}
                        {@const color = getSectionColor(sec)}
                        <button
                          type="button"
                          class="px-2 py-0.5 rounded text-xs font-bold border hover:opacity-80 transition cursor-pointer flex items-center gap-1"
                          style="border-color: {color.hex}; color: {color.hex};"
                          onclick={() => appendSectionToAblauf(sec)}
                          title={t('editor.appendSectionTooltip', { sec })}
                        >
                          <span>+</span>
                          <span>{sec}</span>
                        </button>
                      {/each}
                    </div>
                  </div>
                {/if}

                <!-- Direct VerseOrder text input line (matching SongBeamer AC_Edit line) -->
                <div class="mt-2.5 pt-1.5 border-t border-neutral-300 dark:border-neutral-800 flex flex-col gap-1">
                  <label for="verse-order-text-input" class="text-xs opacity-75 font-semibold block">
                    {t('editor.verseOrder')} (#VerseOrder):
                  </label>
                  <input
                    id="verse-order-text-input"
                    type="text"
                    bind:value={verseOrderInput}
                    oninput={handleVerseOrderInput}
                    placeholder="Refrain, Vers 1, Refrain, Vers 2..."
                    class="px-2.5 py-1.5 text-xs rounded border font-mono focus:outline-none {presentation.theme === 'dark'
                      ? 'bg-neutral-950 border-neutral-700 text-neutral-200 focus:border-amber-500'
                      : 'bg-white border-neutral-300 text-neutral-900 focus:border-blue-600'}"
                  />
                </div>
              </div>

              <!-- Anzahl Sprachen -->
              <div
                class="rounded-lg border p-3 flex flex-col gap-2 {presentation.theme === 'dark'
                  ? 'bg-neutral-900/60 border-neutral-700'
                  : 'bg-white border-neutral-400'}"
              >
                <div class="flex items-center justify-between">
                  <span class="font-bold text-sm">{t('editor.langCount')}</span>
                  <span class="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                    {langCount} {langCount === 1 ? 'Sprache' : 'Sprachen'}
                  </span>
                </div>
                <div class="grid grid-cols-4 gap-2 mt-0.5">
                  {#each [1, 2, 3, 4] as count}
                    <button
                      id="lang-count-{count}"
                      type="button"
                      class="py-2 rounded border text-center font-bold text-sm cursor-pointer transition {langCount === count
                        ? 'border-blue-500 bg-blue-500/20 text-blue-600 dark:text-blue-300 font-extrabold ring-1 ring-blue-500/40'
                        : presentation.theme === 'dark'
                          ? 'border-neutral-700 hover:bg-neutral-800 text-neutral-300'
                          : 'border-neutral-300 hover:bg-neutral-100 text-neutral-700'}"
                      onclick={() => (langCount = count)}
                    >
                      {count}
                    </button>
                  {/each}
                </div>
                <p class="text-xs opacity-70 leading-tight">
                  {t('editor.langCountHint')}
                </p>

                {#if langCount > 1}
                  <div class="mt-1 pt-1.5 border-t border-neutral-300 dark:border-neutral-700 flex flex-col gap-1">
                    <label for="title-lang2-quick" class="text-xs font-bold text-blue-600 dark:text-blue-400">
                      {t('editor.titleLang2Label')}
                    </label>
                    <input
                      id="title-lang2-quick"
                      type="text"
                      bind:value={titleLang2}
                      placeholder={t('editor.titleLang2Placeholder')}
                      class="px-2.5 py-1.5 text-xs rounded border focus:outline-none {presentation.theme === 'dark'
                        ? 'bg-neutral-950 border-neutral-700 text-white'
                        : 'bg-white border-neutral-300 text-neutral-900'}"
                    />
                  </div>
                {/if}
              </div>

              <!-- Yellow Button: Seiten mit --- trennen (at cursor position) -->
              <button
                type="button"
                class="w-full py-2.5 px-3 rounded-lg border font-bold text-sm shadow-xs transition cursor-pointer text-center {presentation.theme === 'dark'
                  ? 'bg-amber-400 hover:bg-amber-300 text-neutral-950 border-amber-500'
                  : 'bg-[#ffff99] hover:bg-[#ffff77] text-neutral-900 border-neutral-400'}"
                onclick={insertSlideSeparator}
                title={t('editor.splitSlideTooltip')}
              >
                {t('editor.splitSlideBtn')}
              </button>

              <!-- Chord status notice (strictly only when guitar chords exist) -->
              {#if hasChords}
                <div class="text-red-600 font-bold text-sm text-center">
                  {t('editor.hasChordsNotice')}
                </div>
              {/if}
            </div>
          </div>
        {:else if activeTab === 'copyrights'}
          <!-- 2. Copyrights & Song Data Tab -->
          <div
            class="flex-1 flex flex-col gap-4 rounded-lg border p-5 {presentation.theme === 'dark'
              ? 'bg-neutral-950 border-neutral-700'
              : 'bg-white border-neutral-300'}"
          >
            <div class="font-bold text-base border-b pb-1.5">{t('editor.copyrightsTitle')}</div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div class="flex flex-col gap-1.5">
                <label for="author-input" class="font-semibold text-sm">{t('editor.authorLabel')}</label>
                <input
                  id="author-input"
                  type="text"
                  bind:value={author}
                  placeholder={t('editor.authorPlaceholder')}
                  class="px-3 py-2 rounded border focus:outline-none text-sm {presentation.theme === 'dark'
                    ? 'bg-neutral-900 border-neutral-700 text-white'
                    : 'bg-white border-neutral-300'}"
                />
              </div>

              <div class="flex flex-col gap-1.5">
                <label for="ccli-input" class="font-semibold text-sm">{t('editor.ccliLabel')}</label>
                <input
                  id="ccli-input"
                  type="text"
                  bind:value={ccli}
                  placeholder={t('editor.ccliPlaceholder')}
                  class="px-3 py-2 rounded border focus:outline-none text-sm {presentation.theme === 'dark'
                    ? 'bg-neutral-900 border-neutral-700 text-white'
                    : 'bg-white border-neutral-300'}"
                />
              </div>

              <div class="flex flex-col gap-1.5">
                <label for="copyright-input" class="font-semibold text-sm">{t('editor.copyrightLabel')}</label>
                <input
                  id="copyright-input"
                  type="text"
                  bind:value={copyright}
                  placeholder={t('editor.copyrightPlaceholder')}
                  class="px-3 py-2 rounded border focus:outline-none text-sm {presentation.theme === 'dark'
                    ? 'bg-neutral-900 border-neutral-700 text-white'
                    : 'bg-white border-neutral-300'}"
                />
              </div>

              <div class="flex flex-col gap-1.5">
                <label for="key-input" class="font-semibold text-sm">{t('editor.keyLabel')}</label>
                <input
                  id="key-input"
                  type="text"
                  bind:value={musicalKey}
                  placeholder={t('editor.keyPlaceholder')}
                  class="px-3 py-2 rounded border focus:outline-none text-sm {presentation.theme === 'dark'
                    ? 'bg-neutral-900 border-neutral-700 text-white'
                    : 'bg-white border-neutral-300'}"
                />
              </div>

              <div class="flex flex-col gap-1.5">
                <label for="speed-input" class="font-semibold text-sm">{t('editor.speedLabel')}</label>
                <input
                  id="speed-input"
                  type="number"
                  bind:value={speed}
                  placeholder={t('editor.speedPlaceholder')}
                  class="px-3 py-2 rounded border focus:outline-none text-sm {presentation.theme === 'dark'
                    ? 'bg-neutral-900 border-neutral-700 text-white'
                    : 'bg-white border-neutral-300'}"
                />
              </div>

              <div class="flex flex-col gap-1.5">
                <label for="lang2-input" class="font-semibold text-sm">{t('editor.titleLang2Label')}</label>
                <input
                  id="lang2-input"
                  type="text"
                  bind:value={titleLang2}
                  placeholder={t('editor.titleLang2Placeholder')}
                  class="px-3 py-2 rounded border focus:outline-none text-sm {presentation.theme === 'dark'
                    ? 'bg-neutral-900 border-neutral-700 text-white'
                    : 'bg-white border-neutral-300'}"
                />
              </div>
            </div>
          </div>
        {:else if activeTab === 'format'}
          <!-- 3. Formatting Tab -->
          <div
            class="flex-1 flex flex-col gap-3 rounded-lg border p-4 overflow-y-auto {presentation.theme === 'dark'
              ? 'bg-neutral-950 border-neutral-700'
              : 'bg-white border-neutral-300'}"
          >
            <!-- Top Action Header on Format Tab (Title, OK, Cancel, Chords) -->
            <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0 pb-3 border-b border-neutral-200 dark:border-neutral-800">
              <div class="flex items-center gap-2">
                <span class="text-sm font-bold text-neutral-800 dark:text-neutral-200">{title || t('editor.newSong')}</span>
                <span class="text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-semibold">{t('editor.tabs.format')}</span>
              </div>
              <div class="flex items-center gap-2 shrink-0 justify-end">
                <button
                  type="button"
                  class="px-3.5 py-1.5 rounded text-sm font-bold flex items-center gap-1.5 transition border cursor-pointer {presentation.theme === 'dark'
                    ? 'bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border-emerald-500/50'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 shadow-xs'}"
                  onclick={handleSave}
                >
                  <span>✓</span>
                  <span>{t('editor.ok')}</span>
                </button>
                <button
                  type="button"
                  class="px-3.5 py-1.5 rounded text-sm font-bold flex items-center gap-1.5 transition border cursor-pointer {presentation.theme === 'dark'
                    ? 'bg-red-600/30 hover:bg-red-600/50 text-red-300 border-red-500/50'
                    : 'bg-red-600 hover:bg-red-700 text-white border-red-700 shadow-xs'}"
                  onclick={handleCancel}
                >
                  <span>✕</span>
                  <span>{t('editor.cancel')}</span>
                </button>
                <button
                  type="button"
                  class="px-3 py-1.5 rounded text-sm font-medium flex items-center gap-1.5 transition border cursor-pointer {presentation.theme === 'dark'
                    ? 'bg-neutral-800 hover:bg-neutral-700 text-emerald-400 border-neutral-700'
                    : 'bg-white hover:bg-neutral-100 text-emerald-700 border-neutral-400'}"
                  onclick={() => (isChordModalOpen = !isChordModalOpen)}
                  title={t('editor.chordsBtn')}
                >
                  <span class="font-bold">C#</span>
                  <span>{t('editor.chordsBtn')}</span>
                </button>
              </div>
            </div>

            <!-- Format Tab Controls -->
            <SongEditorFormatTab bind:formatOptions {langCount} />
          </div>
        {:else if activeTab === 'background'}
          <!-- 4. Background Tab: 20 Curated Presets across 4 Categories with Contrast Dimmer & Live Preview -->
          <div
            class="flex-1 flex flex-col gap-4 rounded-lg border p-5 overflow-y-auto {presentation.theme === 'dark'
              ? 'bg-neutral-950 border-neutral-700'
              : 'bg-white border-neutral-300'}"
          >
            <div class="flex items-center justify-between border-b pb-2">
              <div>
                <div class="font-bold text-base">{t('editor.bgTitle')}</div>
                <p class="text-xs opacity-75">{t('editor.bgDesc')}</p>
              </div>
              {#if selectedBg}
                <button
                  type="button"
                  class="px-3 py-1 rounded border text-xs font-bold hover:bg-red-500/10 text-red-500 transition cursor-pointer"
                  onclick={() => (selectedBg = '')}
                >
                  ✕ {t('editor.bgNone')}
                </button>
              {/if}
            </div>

            <!-- Category Filter Tabs -->
            <div class="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                class="px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer {selectedBgCategory === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-700'}"
                onclick={() => (selectedBgCategory = 'all')}
              >
                {t('editor.bgCategoryAll')}
              </button>
              <button
                type="button"
                class="px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer {selectedBgCategory === 'colors'
                  ? 'bg-blue-600 text-white'
                  : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-700'}"
                onclick={() => (selectedBgCategory = 'colors')}
              >
                🎨 {t('editor.bgCategoryColors')} (5)
              </button>
              <button
                type="button"
                class="px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer {selectedBgCategory === 'gradients'
                  ? 'bg-blue-600 text-white'
                  : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-700'}"
                onclick={() => (selectedBgCategory = 'gradients')}
              >
                🌈 {t('editor.bgCategoryGradients')} (5)
              </button>
              <button
                type="button"
                class="px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer {selectedBgCategory === 'nature'
                  ? 'bg-blue-600 text-white'
                  : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-700'}"
                onclick={() => (selectedBgCategory = 'nature')}
              >
                🏔️ {t('editor.bgCategoryNature')} (5)
              </button>
              <button
                type="button"
                class="px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer {selectedBgCategory === 'kids'
                  ? 'bg-blue-600 text-white'
                  : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-700'}"
                onclick={() => (selectedBgCategory = 'kids')}
              >
                🧸 {t('editor.bgCategoryKids')} (5)
              </button>
            </div>

            <!-- Compact 16:9 Live Stage Preview & Dimmer Controls -->
            {#if selectedBg}
              <div class="flex flex-col sm:flex-row items-center gap-4 p-3.5 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 shadow-xs">
                <!-- 16:9 Stage Preview -->
                <div
                  class="w-60 shrink-0 rounded-lg border border-neutral-700 shadow-md overflow-hidden relative flex flex-col items-center justify-center text-center p-2.5"
                  style="{selectedBg.startsWith('/') || selectedBg.endsWith('.jpg') || selectedBg.endsWith('.png') || selectedBg.endsWith('.webp')
                    ? `background-image: url('${selectedBg}'); background-size: cover; background-position: center;`
                    : `background: ${selectedBg};`}; aspect-ratio: 16/9; min-height: 90px;"
                >
                  <div class="absolute inset-0 bg-black pointer-events-none" style="opacity: {bgDimmer / 100};"></div>
                  <div class="relative z-10 text-white font-bold text-xs leading-snug drop-shadow-[0_2px_4px_rgba(0,0,0,1)] px-1">
                    <p class="m-0 truncate max-w-[210px]">{title || 'Großer Gott, wir loben dich'}</p>
                    <p class="m-0 text-[10px] font-normal opacity-90 truncate max-w-[210px]">Herr, wir preisen deine Stärke.</p>
                  </div>
                  <span class="absolute bottom-1 right-1 z-10 text-[8px] uppercase tracking-wider font-extrabold text-white/80 bg-black/60 px-1 py-0.5 rounded">16:9 Beamer</span>
                </div>

                <!-- Dimmer controls -->
                <div class="flex-1 flex flex-col gap-2 w-full">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                      {t('editor.bgDimmerLabel')}:
                    </span>
                    <span class="text-xs font-mono font-extrabold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                      {bgDimmer}% Abdunklung
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="80"
                    step="5"
                    bind:value={bgDimmer}
                    class="w-full accent-blue-600 cursor-pointer"
                  />
                  <div class="flex items-center justify-between text-[10px] text-neutral-500">
                    <span>0% (Hell)</span>
                    <span>25% (Ausgewogen)</span>
                    <span>50% (Hoher Kontrast)</span>
                    <span>80% (Dunkel)</span>
                  </div>
                </div>
              </div>
            {/if}

            <!-- 20 Backgrounds Gallery Section -->
            <div class="flex items-center justify-between pt-1">
              <span class="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                Vorlagen ({filteredBackgrounds.length} verfügbar):
              </span>
              <span class="text-[11px] text-neutral-400">
                Klick auf ein Bild übernimmt den Hintergrund für Beamer & Vorschau
              </span>
            </div>

            <!-- 20 Backgrounds Gallery Grid -->
            <div class="grid grid-cols-4 sm:grid-cols-5 gap-3.5 max-h-[360px] overflow-y-auto p-2 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-neutral-50/50 dark:bg-neutral-900/50">
              {#each filteredBackgrounds as bg (bg.id)}
                {@const isSelected = selectedBg === bg.value}
                <div
                  role="button"
                  tabindex="0"
                  class="group flex flex-col rounded-xl border-2 transition-all overflow-hidden text-left cursor-pointer hover:scale-[1.02] select-none shadow-xs {isSelected
                    ? 'border-blue-600 ring-2 ring-blue-500/40 shadow-md'
                    : 'border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500'}"
                  onclick={() => (selectedBg = bg.value)}
                  onkeydown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      selectedBg = bg.value;
                    }
                  }}
                >
                  <!-- 16:9 Thumbnail (96px fixed height for true widescreen proportions) -->
                  <div
                    class="w-full h-24 relative flex items-center justify-center p-2 overflow-hidden bg-cover bg-center shrink-0"
                    style="{bg.previewStyle}"
                  >
                    <!-- Built-in Dimmer Preview Layer -->
                    <div
                      class="absolute inset-0 bg-black pointer-events-none transition-opacity"
                      style="opacity: {isSelected ? bgDimmer / 100 : 0.25};"
                    ></div>

                    <!-- Lyric preview snippet showing high contrast legibility -->
                    <span class="relative z-10 text-[11px] font-bold text-white text-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] opacity-90 group-hover:opacity-100 transition">
                      Abba, Vater
                    </span>

                    {#if isSelected}
                      <span class="absolute top-1.5 right-1.5 z-20 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px] font-bold shadow">
                        ✓
                      </span>
                    {/if}
                  </div>

                  <!-- Card Label -->
                  <div class="h-8 px-2 bg-white dark:bg-neutral-800 border-t border-neutral-200 dark:border-neutral-700 flex items-center justify-between shrink-0">
                    <span class="text-[11px] font-semibold truncate text-neutral-800 dark:text-neutral-200" title={t(bg.nameKey) !== bg.nameKey ? t(bg.nameKey) : bg.defaultName}>
                      {t(bg.nameKey) !== bg.nameKey ? t(bg.nameKey) : bg.defaultName}
                    </span>
                    {#if isSelected}
                      <span class="text-[9px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 ml-1 shrink-0">
                        {t('editor.bgActiveBadge')}
                      </span>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {:else if activeTab === 'media'}
          <!-- 5. Medien Tab -->
          <div
            class="flex-1 flex flex-col gap-4 rounded-lg border p-5 {presentation.theme === 'dark'
              ? 'bg-neutral-950 border-neutral-700'
              : 'bg-white border-neutral-300'}"
          >
            <div class="font-bold text-base border-b pb-1.5">{t('editor.mediaTitle')}</div>
            <div class="flex flex-col gap-4 text-sm">
              <div class="flex flex-col gap-1.5">
                <label for="audio-file-input" class="font-semibold text-sm">{t('editor.audioFileLabel')}</label>
                <div class="flex items-center gap-2.5">
                  <input
                    id="audio-file-input"
                    type="text"
                    bind:value={audioFile}
                    placeholder={t('editor.audioFilePlaceholder')}
                    class="flex-1 px-3 py-2 rounded border focus:outline-none text-sm {presentation.theme === 'dark'
                      ? 'bg-neutral-900 border-neutral-700 text-white'
                      : 'bg-white border-neutral-300'}"
                  />
                  <button
                    type="button"
                    class="px-4 py-2 rounded border hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer font-semibold text-sm {presentation.theme === 'dark'
                      ? 'border-neutral-700'
                      : 'border-neutral-300'}"
                    onclick={() => alert(t('editor.audioBrowseAlert'))}
                  >
                    {t('editor.browseBtn')}
                  </button>
                </div>
              </div>

              <div class="flex flex-col gap-1.5">
                <label for="chordsheet-input" class="font-semibold text-sm">{t('editor.chordsheetLabel')}</label>
                <div class="flex items-center gap-2.5">
                  <input
                    id="chordsheet-input"
                    type="text"
                    bind:value={chordsheetFile}
                    placeholder={t('editor.chordsheetPlaceholder')}
                    class="flex-1 px-3 py-2 rounded border focus:outline-none text-sm {presentation.theme === 'dark'
                      ? 'bg-neutral-900 border-neutral-700 text-white'
                      : 'bg-white border-neutral-300'}"
                  />
                  <button
                    type="button"
                    class="px-4 py-2 rounded border hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer font-semibold text-sm {presentation.theme === 'dark'
                      ? 'border-neutral-700'
                      : 'border-neutral-300'}"
                    onclick={() => alert(t('editor.chordsheetBrowseAlert'))}
                  >
                    {t('editor.browseBtn')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        {:else if activeTab === 'categories'}
          <!-- 6. Categories Tab -->
          <div
            class="flex-1 flex flex-col gap-4 rounded-lg border p-5 {presentation.theme === 'dark'
              ? 'bg-neutral-950 border-neutral-700'
              : 'bg-white border-neutral-300'}"
          >
            <div class="font-bold text-base border-b pb-1.5">{t('editor.categoriesTitle')}</div>
            <div class="flex flex-wrap gap-2.5 text-sm">
              {#each standardCategories as tag}
                {@const isSelected = categories.includes(tag)}
                <button
                  type="button"
                  class="px-3.5 py-1.5 rounded-full border transition cursor-pointer font-medium {isSelected
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-black/5 dark:bg-white/5 border-neutral-300 dark:border-neutral-700'}"
                  onclick={() => {
                    if (isSelected) categories = categories.filter((c) => c !== tag);
                    else categories = [...categories, tag];
                  }}
                >
                  {tag}
                </button>
              {/each}
            </div>

            <div class="flex items-center gap-2.5 mt-3">
              <input
                type="text"
                bind:value={newCategoryInput}
                placeholder={t('editor.customCategoryPlaceholder')}
                class="px-3 py-2 text-sm rounded border focus:outline-none {presentation.theme === 'dark'
                  ? 'bg-neutral-900 border-neutral-700 text-white'
                  : 'bg-white border-neutral-300'}"
                onkeydown={(e) => {
                  if (e.key === 'Enter' && newCategoryInput.trim()) {
                    categories = [...categories, newCategoryInput.trim()];
                    newCategoryInput = '';
                  }
                }}
              />
              <button
                type="button"
                class="px-3.5 py-2 text-sm rounded bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer transition"
                onclick={() => {
                  if (newCategoryInput.trim()) {
                    categories = [...categories, newCategoryInput.trim()];
                    newCategoryInput = '';
                  }
                }}
              >
                {t('editor.addCategoryBtn')}
              </button>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
