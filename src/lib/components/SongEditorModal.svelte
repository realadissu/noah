<script lang="ts">
  import { presentation } from '$lib/stores/presentation.svelte';
  import type { Song } from '$lib/types/models';

  type EditorTab = 'text' | 'format' | 'background' | 'categories' | 'copyrights';

  const song = $derived<Song | null>(presentation.editingSong);

  let activeTab = $state<EditorTab>('text');
  let title = $state<string>('');
  let editorText = $state<string>('');
  let verseOrder = $state<string[]>([]);
  let langCount = $state<number>(1);

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

  // UI & Chord state
  let isChordModalOpen = $state<boolean>(false);
  let newOrderPartInput = $state<string>('');

  // Editor DOM elements
  let textareaEl = $state<HTMLTextAreaElement | null>(null);
  let backdropEl = $state<HTMLDivElement | null>(null);
  let currentSection = $state<string>('Vers 1');

  // Drag & drop state for Ablauf box
  let draggedAblaufIdx = $state<number | null>(null);
  let targetAblaufIdx = $state<number | null>(null);

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

  // Strict check if song currently contains valid guitar chords (avoiding false positives like [Denn] or [1])
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

  // Reconstruct initial editor text from song slides
  function songToText(s: Song): string {
    const parts: string[] = [];
    for (const slide of s.slides) {
      let sectionTag = '';
      if (slide.section) {
        switch (slide.section.type) {
          case 'Verse':
            sectionTag = `Vers ${slide.section.value}`;
            break;
          case 'Chorus':
            sectionTag = slide.section.value ? `Refrain ${slide.section.value}` : 'Refrain';
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
            sectionTag = 'Outro';
            break;
          case 'Coda':
            sectionTag = 'Coda';
            break;
          case 'Interlude':
            sectionTag = 'Zwischenspiel';
            break;
          case 'Ending':
            sectionTag = 'Schluss';
            break;
          case 'Custom':
            sectionTag = slide.section.value;
            break;
        }
      } else if (slide.label && slide.label !== `Slide ${slide.index + 1}`) {
        sectionTag = slide.label;
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

      let block = '';
      if (sectionTag) {
        block += `${sectionTag}\n`;
      }
      block += lineStrings.join('\n');
      parts.push(block.trim());
    }
    return parts.join('\n---\n');
  }

  // Initialize fields from active editing song
  $effect(() => {
    if (presentation.editingSong) {
      const s = presentation.editingSong;
      title = s.metadata.title;
      editorText = songToText(s);
      verseOrder = [...(s.metadata.verse_order ?? [])];
      langCount = s.metadata.lang_count || 1;
      author = s.metadata.author ?? '';
      copyright = s.metadata.copyright ?? '';
      ccli = s.metadata.ccli ?? '';
      musicalKey = s.metadata.musical_key ?? '';
      speed = s.metadata.speed;
      transpose = s.metadata.transpose ?? 0;
      titleLang2 = s.metadata.title_lang2 ?? '';
      fontSize = s.metadata.font_size ?? 36;
      categories = s.metadata.custom_tags['category']
        ? s.metadata.custom_tags['category'].split(',').map((x) => x.trim())
        : [];
      updateCurrentSectionFromCursor();
    }
  });

  // Determine section at cursor position
  function updateCurrentSectionFromCursor() {
    if (!textareaEl) return;
    const pos = textareaEl.selectionStart ?? 0;
    const before = editorText.slice(0, pos);
    const lines = before.split('\n');

    for (let i = lines.length - 1; i >= 0; i--) {
      const headerInfo = getSectionHeaderInfo(lines[i]);
      if (headerInfo) {
        currentSection = headerInfo.label;
        return;
      }
    }

    // Fallback: check first header in whole text
    const allLines = editorText.split('\n');
    for (const l of allLines) {
      const info = getSectionHeaderInfo(l);
      if (info) {
        currentSection = info.label;
        return;
      }
    }
    currentSection = 'Vers 1';
  }

  // Ablauf: add section currently under cursor to the end
  function addCurrentSectionToAblauf() {
    updateCurrentSectionFromCursor();
    if (currentSection) {
      verseOrder = [...verseOrder, currentSection];
    }
  }

  function addCustomOrderPart(part: string) {
    if (!part.trim()) return;
    verseOrder = [...verseOrder, part.trim()];
    newOrderPartInput = '';
  }

  function removeOrderPart(idx: number) {
    verseOrder = verseOrder.filter((_, i) => i !== idx);
  }

  // Lightning Auto-populate Ablauf
  function autoPopulateAblauf() {
    const allLines = editorText.split('\n');
    const detected: string[] = [];
    for (const l of allLines) {
      const info = getSectionHeaderInfo(l);
      if (info && !detected.includes(info.label)) {
        detected.push(info.label);
      }
    }

    if (
      detected.some((s) => s.toLowerCase().startsWith('vers 1')) &&
      detected.some((s) => s.toLowerCase().startsWith('refrain'))
    ) {
      const order: string[] = [];
      const verses = detected.filter((s) => s.toLowerCase().startsWith('vers') || s.toLowerCase().startsWith('strophe'));
      const chorus = detected.find((s) => s.toLowerCase().startsWith('refrain') || s.toLowerCase().startsWith('chorus')) || 'Refrain';
      const bridge = detected.find((s) => s.toLowerCase().startsWith('bridge'));

      for (const v of verses) {
        order.push(v);
        order.push(chorus);
      }
      if (bridge) {
        order.push(bridge);
        order.push(chorus);
      }
      verseOrder = order;
    } else {
      verseOrder = detected;
    }
  }

  // Ablauf Drag & Drop reordering
  function handleAblaufDragStart(e: DragEvent, idx: number) {
    draggedAblaufIdx = idx;
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
      verseOrder = items;
    }
    draggedAblaufIdx = null;
    targetAblaufIdx = null;
  }

  function handleAblaufDragEnd() {
    draggedAblaufIdx = null;
    targetAblaufIdx = null;
  }

  // Point 5 & 6: Insertion & macOS Smart Dash prevention
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
        // Prevent macOS text replacement system hook
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
    let val = target.value;
    // Fallback: replace any smart dashes that slipped through
    if (val.includes('—') || val.includes('–')) {
      const selStart = target.selectionStart;
      val = val.replaceAll('—', '---').replaceAll('–', '--');
      target.value = val;
      target.setSelectionRange(selStart, selStart);
    }
    editorText = val;
    updateCurrentSectionFromCursor();
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
      alert('Bitte geben Sie einen Songtitel ein.');
      return;
    }

    let sngContent = `#Title=${title.trim()}\n`;
    if (author.trim()) sngContent += `#Author=${author.trim()}\n`;
    if (copyright.trim()) sngContent += `#Copyright=${copyright.trim()}\n`;
    if (ccli.trim()) sngContent += `#CCLI=${ccli.trim()}\n`;
    if (musicalKey.trim()) sngContent += `#Key=${musicalKey.trim()}\n`;
    if (speed) sngContent += `#Speed=${speed}\n`;
    if (transpose !== 0) sngContent += `#Transpose=${transpose}\n`;
    if (fontSize) sngContent += `#FontSize=${fontSize}\n`;
    if (verseOrder.length > 0) sngContent += `#Format=${verseOrder.join(',')}\n`;
    if (langCount > 1) sngContent += `#LangCount=${langCount}\n`;
    if (titleLang2.trim()) sngContent += `#TitleLang2=${titleLang2.trim()}\n`;
    if (categories.length > 0) sngContent += `#category=${categories.join(',')}\n`;

    sngContent += '---\n' + editorText.trim();

    const parsed = await presentation.parseSongContent(sngContent);
    if (parsed) {
      if (song) {
        parsed.id = song.id;
      }
      await presentation.saveEditedSong(parsed);
    } else {
      alert('Fehler beim Analysieren des Songs.');
    }
  }

  function handleCancel() {
    presentation.closeSongEditor();
  }
</script>

{#if presentation.isSongEditorOpen && song}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 select-none font-sans"
    role="dialog"
    aria-modal="true"
    aria-label="Song bearbeiten"
  >
    <!-- Modal Window (Replicating SongBeamer "Song bearbeiten" Window authentically) -->
    <div
      class="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-xl border shadow-2xl overflow-hidden transition-all {presentation.theme === 'dark'
        ? 'bg-[#1e2229] border-neutral-700 text-neutral-100 shadow-black/80'
        : 'bg-[#ece9d8] border-neutral-400 text-neutral-900 shadow-2xl'}"
    >
      <!-- Title Bar -->
      <div
        class="h-9 px-3 flex items-center justify-between border-b shrink-0 font-bold text-xs select-none {presentation.theme === 'dark'
          ? 'bg-[#181a20] border-neutral-700 text-neutral-200'
          : 'bg-[#0055ea] border-[#0040b0] text-white'}"
      >
        <div class="flex items-center gap-2">
          <span>🎵</span>
          <span>Song bearbeiten</span>
        </div>
        <button
          type="button"
          class="w-6 h-6 rounded flex items-center justify-center hover:bg-red-600 hover:text-white transition cursor-pointer"
          onclick={handleCancel}
          title="Schließen"
        >
          ✕
        </button>
      </div>

      <!-- Navigation Tabs (Text | Formatierung | Hintergrund | Kategorien | Copyrights) -->
      <div
        class="flex items-center px-2 pt-1 border-b gap-1 text-xs shrink-0 select-none {presentation.theme === 'dark'
          ? 'bg-[#252932] border-neutral-700'
          : 'bg-[#dfdbcf] border-neutral-400'}"
      >
        <button
          type="button"
          class="px-3 py-1.5 rounded-t-md font-semibold transition cursor-pointer border-t border-l border-r {activeTab === 'text'
            ? presentation.theme === 'dark'
              ? 'bg-[#1e2229] border-neutral-700 text-amber-400 border-b-transparent shadow-xs'
              : 'bg-[#ece9d8] border-neutral-400 text-neutral-900 border-b-transparent font-bold'
            : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300'}"
          onclick={() => (activeTab = 'text')}
        >
          Text
        </button>
        <button
          type="button"
          class="px-3 py-1.5 rounded-t-md font-semibold transition cursor-pointer border-t border-l border-r {activeTab === 'format'
            ? presentation.theme === 'dark'
              ? 'bg-[#1e2229] border-neutral-700 text-amber-400 border-b-transparent shadow-xs'
              : 'bg-[#ece9d8] border-neutral-400 text-neutral-900 border-b-transparent font-bold'
            : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300'}"
          onclick={() => (activeTab = 'format')}
        >
          Formatierung
        </button>
        <button
          type="button"
          class="px-3 py-1.5 rounded-t-md font-semibold transition cursor-pointer border-t border-l border-r {activeTab === 'background'
            ? presentation.theme === 'dark'
              ? 'bg-[#1e2229] border-neutral-700 text-amber-400 border-b-transparent shadow-xs'
              : 'bg-[#ece9d8] border-neutral-400 text-neutral-900 border-b-transparent font-bold'
            : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300'}"
          onclick={() => (activeTab = 'background')}
        >
          Hintergrund
        </button>
        <button
          type="button"
          class="px-3 py-1.5 rounded-t-md font-semibold transition cursor-pointer border-t border-l border-r {activeTab === 'categories'
            ? presentation.theme === 'dark'
              ? 'bg-[#1e2229] border-neutral-700 text-amber-400 border-b-transparent shadow-xs'
              : 'bg-[#ece9d8] border-neutral-400 text-neutral-900 border-b-transparent font-bold'
            : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300'}"
          onclick={() => (activeTab = 'categories')}
        >
          Kategorien
        </button>
        <button
          type="button"
          class="px-3 py-1.5 rounded-t-md font-semibold transition cursor-pointer border-t border-l border-r {activeTab === 'copyrights'
            ? presentation.theme === 'dark'
              ? 'bg-[#1e2229] border-neutral-700 text-amber-400 border-b-transparent shadow-xs'
              : 'bg-[#ece9d8] border-neutral-400 text-neutral-900 border-b-transparent font-bold'
            : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300'}"
          onclick={() => (activeTab = 'copyrights')}
        >
          Copyrights
        </button>
      </div>

      <!-- Main Body Area -->
      <div class="flex-1 overflow-y-auto p-3 flex flex-col gap-3 min-h-0">
        {#if activeTab === 'text'}
          <!-- 1. Song Title Input & Top Action Buttons (OK, Abbrechen, Akkorde, Hintergrund) -->
          <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
            <div class="flex-1 flex items-center gap-2">
              <label for="song-title-input" class="text-xs font-bold shrink-0">Titel:</label>
              <input
                id="song-title-input"
                type="text"
                bind:value={title}
                placeholder="Songtitel eingeben..."
                class="flex-1 px-2.5 py-1 text-sm rounded border focus:outline-none {presentation.theme === 'dark'
                  ? 'bg-neutral-900 border-neutral-700 text-white focus:border-amber-500'
                  : 'bg-white border-neutral-400 text-neutral-900 focus:border-blue-600'}"
              />
            </div>

            <!-- Top Right Action Buttons -->
            <div class="flex items-center gap-1.5 shrink-0 justify-end">
              <button
                type="button"
                class="px-3 py-1 rounded text-xs font-bold flex items-center gap-1.5 transition border cursor-pointer {presentation.theme === 'dark'
                  ? 'bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border-emerald-500/50'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 shadow-xs'}"
                onclick={handleSave}
              >
                <span>✓</span>
                <span>OK</span>
              </button>
              <button
                type="button"
                class="px-3 py-1 rounded text-xs font-bold flex items-center gap-1.5 transition border cursor-pointer {presentation.theme === 'dark'
                  ? 'bg-red-600/30 hover:bg-red-600/50 text-red-300 border-red-500/50'
                  : 'bg-red-600 hover:bg-red-700 text-white border-red-700 shadow-xs'}"
                onclick={handleCancel}
              >
                <span>✕</span>
                <span>Abbrechen</span>
              </button>
              <button
                type="button"
                class="px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1 transition border cursor-pointer {presentation.theme === 'dark'
                  ? 'bg-neutral-800 hover:bg-neutral-700 text-emerald-400 border-neutral-700'
                  : 'bg-white hover:bg-neutral-100 text-emerald-700 border-neutral-400'}"
                onclick={() => (isChordModalOpen = !isChordModalOpen)}
                title="Akkorde bearbeiten & transponieren"
              >
                <span class="font-bold">C#</span>
                <span>Akkorde...</span>
              </button>
              <button
                type="button"
                class="px-2.5 py-1 rounded text-xs font-medium transition border cursor-pointer {presentation.theme === 'dark'
                  ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-700'
                  : 'bg-white hover:bg-neutral-100 text-neutral-800 border-neutral-400'}"
                onclick={() => (activeTab = 'background')}
              >
                Hintergrund...
              </button>
            </div>
          </div>

          <!-- Chord Tool Popover if opened -->
          {#if isChordModalOpen}
            <div
              class="p-2.5 rounded-lg border shadow-lg flex flex-wrap items-center gap-2 text-xs shrink-0 {presentation.theme === 'dark'
                ? 'bg-neutral-900 border-neutral-700 text-white'
                : 'bg-white border-neutral-400 text-neutral-900'}"
            >
              <span class="font-bold">Akkorde transponieren:</span>
              <button
                type="button"
                class="px-2 py-0.5 rounded border hover:bg-black/10 cursor-pointer"
                onclick={() => transposeBy(1)}
              >
                +1 Halbton
              </button>
              <button
                type="button"
                class="px-2 py-0.5 rounded border hover:bg-black/10 cursor-pointer"
                onclick={() => transposeBy(-1)}
              >
                -1 Halbton
              </button>
              <button
                type="button"
                class="px-2 py-0.5 rounded border hover:bg-black/10 cursor-pointer"
                onclick={() => transposeBy(2)}
              >
                +2 (Ganzton)
              </button>
              <button
                type="button"
                class="px-2 py-0.5 rounded border hover:bg-black/10 cursor-pointer"
                onclick={() => transposeBy(-2)}
              >
                -2 (Ganzton)
              </button>
              <div class="w-px h-5 bg-neutral-500/40 mx-1"></div>
              <button
                type="button"
                class="px-2 py-0.5 rounded border text-red-500 hover:bg-red-500/10 cursor-pointer"
                onclick={stripAllChords}
                title="Alle Akkorde aus dem Liedtext entfernen"
              >
                ✂️ Akkorde entfernen
              </button>
              <button
                type="button"
                class="ml-auto text-xs opacity-60 hover:opacity-100 cursor-pointer"
                onclick={() => (isChordModalOpen = false)}
              >
                Fertig
              </button>
            </div>
          {/if}

          <!-- 2. Dual Column: Left = Main Text Editor with Auto Section Banners, Right = Ablauf & Controls -->
          <div class="flex-1 flex flex-col md:flex-row gap-3 min-h-[320px] overflow-hidden">
            <!-- Left Column: Unified Text Editor with Automatic Header Banners -->
            <div
              class="flex-1 flex flex-col rounded-lg border overflow-hidden relative {presentation.theme === 'dark'
                ? 'bg-neutral-950 border-neutral-700'
                : 'bg-white border-neutral-400'}"
            >
              <!-- Container with center dotted guideline and red bottom border -->
              <div class="relative flex-1 w-full h-full overflow-hidden">
                <!-- Subtle center guideline down the middle -->
                <div
                  class="absolute inset-y-0 left-1/2 border-r border-dotted border-neutral-300 dark:border-neutral-800 pointer-events-none z-10"
                  aria-hidden="true"
                ></div>

                <!-- Backdrop Layer: Automatic Section Header Banners & Red '---' styling -->
                <div
                  bind:this={backdropEl}
                  class="absolute inset-0 p-3 overflow-hidden pointer-events-none font-mono text-xs leading-[22px] select-none z-0"
                  aria-hidden="true"
                >
                  {#each editorText.split('\n') as line}
                    {@const headerInfo = getSectionHeaderInfo(line)}
                    {#if headerInfo}
                      <div
                        style="background-color: {headerInfo.hex};"
                        class="w-full text-white font-bold px-2 rounded-xs h-[22px] flex items-center leading-none tracking-wide shadow-2xs"
                      >
                        {line}
                      </div>
                    {:else if line.trim() === '---' || line.trim() === '--'}
                      <div class="text-red-600 font-bold font-mono tracking-widest h-[22px] flex items-center">
                        {line}
                      </div>
                    {:else}
                      <div class="h-[22px] text-neutral-900 dark:text-neutral-100 flex items-center whitespace-pre overflow-hidden">
                        {line || ' '}
                      </div>
                    {/if}
                  {/each}
                </div>

                <!-- Input Textarea: Fully Native Typing, Selection & Scrolling on Top -->
                <textarea
                  bind:this={textareaEl}
                  value={editorText}
                  oninput={handleTextareaInput}
                  onbeforeinput={handleTextareaBeforeInput}
                  onkeydown={handleTextareaKeyDown}
                  onscroll={handleScroll}
                  onclick={updateCurrentSectionFromCursor}
                  onkeyup={updateCurrentSectionFromCursor}
                  onselect={updateCurrentSectionFromCursor}
                  spellcheck="false"
                  autocomplete="off"
                  autocapitalize="off"
                  data-gramm="false"
                  placeholder="Songtext hier eingeben... Überschriften wie Vers 1, Refrain, Bridge etc. werden automatisch als Banner erkannt. Folien mit --- trennen."
                  class="absolute inset-0 w-full h-full p-3 font-mono text-xs leading-[22px] resize-none focus:outline-none bg-transparent text-transparent caret-neutral-900 dark:caret-white selection:bg-blue-500/35 selection:text-transparent whitespace-pre overflow-y-auto z-20"
                ></textarea>
              </div>

              <!-- Red horizontal guideline at bottom matching SongBeamer -->
              <div class="w-full h-0.5 bg-red-500 shrink-0"></div>
            </div>

            <!-- Right Column: Ablauf (Order of Service) & Language / Slide Controls -->
            <div class="w-full md:w-64 flex flex-col gap-3 shrink-0 text-xs">
              <!-- Ablauf Box -->
              <div
                class="flex-1 flex flex-col rounded-lg border p-2.5 {presentation.theme === 'dark'
                  ? 'bg-neutral-900/60 border-neutral-700'
                  : 'bg-white border-neutral-400'}"
              >
                <div class="flex items-center justify-between font-bold mb-1.5">
                  <div class="flex items-center gap-1.5">
                    <span>Ablauf:</span>
                    {#if currentSection}
                      <span class="text-[10px] opacity-60 font-normal truncate max-w-[90px]" title="Aktiver Teil an Cursorposition">
                        ({currentSection})
                      </span>
                    {/if}
                  </div>
                  <div class="flex items-center gap-1">
                    <button
                      type="button"
                      class="px-1.5 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] cursor-pointer transition shadow-2xs"
                      onclick={addCurrentSectionToAblauf}
                      title="Aktuellen Teil ('{currentSection}') an Ablauf anhängen (+)"
                    >
                      + Teil
                    </button>
                    <button
                      type="button"
                      class="p-1 rounded hover:bg-black/10 transition cursor-pointer font-bold text-amber-500"
                      onclick={autoPopulateAblauf}
                      title="Ablauf automatisch aus Text generieren (Blitz)"
                    >
                      ⚡ Auto
                    </button>
                  </div>
                </div>

                <!-- Sequence list with colored text matching SongBeamer & Drag'n'Drop -->
                <div
                  class="flex-1 min-h-[120px] max-h-48 overflow-y-auto border rounded p-1 space-y-0.5 select-none {presentation.theme === 'dark'
                    ? 'bg-neutral-950 border-neutral-800'
                    : 'bg-white border-neutral-300'}"
                >
                  {#if verseOrder.length === 0}
                    <div class="text-[11px] text-neutral-400 p-2 text-center">
                      Kein Ablauf festgelegt. Klicke auf '+ Teil' oder '⚡ Auto'.
                    </div>
                  {:else}
                    {#each verseOrder as item, idx}
                      {@const color = getSectionColor(item)}
                      {@const isDragging = draggedAblaufIdx === idx}
                      {@const isTarget = targetAblaufIdx === idx && draggedAblaufIdx !== null}

                      <div
                        role="button"
                        tabindex="0"
                        draggable="true"
                        ondragstart={(e) => handleAblaufDragStart(e, idx)}
                        ondragover={(e) => handleAblaufDragOver(e, idx)}
                        ondrop={(e) => handleAblaufDrop(e, idx)}
                        ondragend={handleAblaufDragEnd}
                        class="px-2 py-1 rounded text-xs font-bold flex items-center justify-between group cursor-grab active:cursor-grabbing transition relative {isDragging ? 'opacity-30 border border-dashed border-amber-500' : ''} {presentation.theme === 'dark'
                          ? 'hover:bg-neutral-800'
                          : 'hover:bg-neutral-100'}"
                        style="color: {color.hex};"
                      >
                        <!-- Drag drop indicator bar -->
                        {#if isTarget}
                          <div class="absolute -top-[2px] left-0 right-0 h-[2px] bg-amber-400 pointer-events-none"></div>
                        {/if}

                        <span class="truncate">{item}</span>
                        <button
                          type="button"
                          class="opacity-0 group-hover:opacity-100 text-red-500 text-[10px] hover:font-black cursor-pointer ml-1"
                          onclick={() => removeOrderPart(idx)}
                          title="Entfernen"
                        >
                          ✕
                        </button>
                      </div>
                    {/each}
                  {/if}
                </div>

                <!-- Add custom part to order -->
                <div class="flex items-center gap-1 mt-2">
                  <input
                    type="text"
                    bind:value={newOrderPartInput}
                    placeholder="Teil hinzufügen..."
                    class="flex-1 px-2 py-0.5 text-xs rounded border focus:outline-none {presentation.theme === 'dark'
                      ? 'bg-neutral-900 border-neutral-700 text-white'
                      : 'bg-white border-neutral-300 text-neutral-900'}"
                    onkeydown={(e) => {
                      if (e.key === 'Enter') addCustomOrderPart(newOrderPartInput);
                    }}
                  />
                  <button
                    type="button"
                    class="w-6 h-6 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center cursor-pointer transition shadow-2xs"
                    onclick={() => addCustomOrderPart(newOrderPartInput)}
                    title="Zum Ablauf hinzufügen"
                  >
                    +
                  </button>
                </div>
              </div>

              <!-- Anzahl Sprachen -->
              <div
                class="rounded-lg border p-2.5 flex flex-col gap-1.5 {presentation.theme === 'dark'
                  ? 'bg-neutral-900/60 border-neutral-700'
                  : 'bg-white border-neutral-400'}"
              >
                <span class="font-bold">Anzahl Sprachen</span>
                <div class="flex items-center gap-3">
                  {#each [1, 2, 3, 4] as count}
                    <label class="flex items-center gap-1 text-xs cursor-pointer">
                      <input
                        type="radio"
                        name="langCountRadio"
                        value={count}
                        checked={langCount === count}
                        onchange={() => (langCount = count)}
                      />
                      <span>{count}</span>
                    </label>
                  {/each}
                </div>
                <p class="text-[10px] opacity-70 leading-tight">
                  Die einzelnen Sprachen werden im Text zeilenweise untereinander geschrieben.
                </p>
              </div>

              <!-- Yellow Button: Folien mit --- trennen (at cursor position) -->
              <button
                type="button"
                class="w-full py-2 px-3 rounded-lg border font-bold text-xs shadow-xs transition cursor-pointer text-center {presentation.theme === 'dark'
                  ? 'bg-amber-400 hover:bg-amber-300 text-neutral-950 border-amber-500'
                  : 'bg-[#ffff99] hover:bg-[#ffff77] text-neutral-900 border-neutral-400'}"
                onclick={insertSlideSeparator}
                title="Trennt die Folie an der aktuellen Cursorposition mit '---'"
              >
                Folien mit --- trennen
              </button>

              <!-- Chord status notice (strictly only when guitar chords exist) -->
              {#if hasChords}
                <div class="text-red-600 font-bold text-xs text-center mt-1">
                  Dieser Song besitzt Gitarrenakkorde.
                </div>
              {/if}
            </div>
          </div>
        {:else if activeTab === 'copyrights'}
          <!-- 2. Copyrights & Song Data Tab -->
          <div
            class="flex-1 flex flex-col gap-3 rounded-lg border p-4 {presentation.theme === 'dark'
              ? 'bg-neutral-950 border-neutral-700'
              : 'bg-white border-neutral-300'}"
          >
            <div class="font-bold text-sm border-b pb-1">Urheberrechte & Musikalische Daten</div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div class="flex flex-col gap-1">
                <label for="author-input" class="font-bold">Autor / Lieddichter / Komponist (#Author):</label>
                <input
                  id="author-input"
                  type="text"
                  bind:value={author}
                  placeholder="z.B. Albert Frey"
                  class="px-2.5 py-1.5 rounded border focus:outline-none {presentation.theme === 'dark'
                    ? 'bg-neutral-900 border-neutral-700 text-white'
                    : 'bg-white border-neutral-300'}"
                />
              </div>

              <div class="flex flex-col gap-1">
                <label for="ccli-input" class="font-bold">CCLI-Liednummer (#CCLI):</label>
                <input
                  id="ccli-input"
                  type="text"
                  bind:value={ccli}
                  placeholder="z.B. 1234567"
                  class="px-2.5 py-1.5 rounded border focus:outline-none {presentation.theme === 'dark'
                    ? 'bg-neutral-900 border-neutral-700 text-white'
                    : 'bg-white border-neutral-300'}"
                />
              </div>

              <div class="flex flex-col gap-1">
                <label for="copyright-input" class="font-bold">Copyright / Verlag (#Copyright):</label>
                <input
                  id="copyright-input"
                  type="text"
                  bind:value={copyright}
                  placeholder="z.B. © 2005 Gerth Medien"
                  class="px-2.5 py-1.5 rounded border focus:outline-none {presentation.theme === 'dark'
                    ? 'bg-neutral-900 border-neutral-700 text-white'
                    : 'bg-white border-neutral-300'}"
                />
              </div>

              <div class="flex flex-col gap-1">
                <label for="key-input" class="font-bold">Tonart (#Key):</label>
                <input
                  id="key-input"
                  type="text"
                  bind:value={musicalKey}
                  placeholder="z.B. D, Em, G, A"
                  class="px-2.5 py-1.5 rounded border focus:outline-none {presentation.theme === 'dark'
                    ? 'bg-neutral-900 border-neutral-700 text-white'
                    : 'bg-white border-neutral-300'}"
                />
              </div>

              <div class="flex flex-col gap-1">
                <label for="speed-input" class="font-bold">Tempo (BPM / #Speed):</label>
                <input
                  id="speed-input"
                  type="number"
                  bind:value={speed}
                  placeholder="z.B. 72"
                  class="px-2.5 py-1.5 rounded border focus:outline-none {presentation.theme === 'dark'
                    ? 'bg-neutral-900 border-neutral-700 text-white'
                    : 'bg-white border-neutral-300'}"
                />
              </div>

              <div class="flex flex-col gap-1">
                <label for="lang2-input" class="font-bold">Zweitsprachiger Titel (#TitleLang2):</label>
                <input
                  id="lang2-input"
                  type="text"
                  bind:value={titleLang2}
                  placeholder="z.B. Bless the Lord, O My Soul"
                  class="px-2.5 py-1.5 rounded border focus:outline-none {presentation.theme === 'dark'
                    ? 'bg-neutral-900 border-neutral-700 text-white'
                    : 'bg-white border-neutral-300'}"
                />
              </div>
            </div>
          </div>
        {:else if activeTab === 'format'}
          <!-- 3. Formatting Tab -->
          <div
            class="flex-1 flex flex-col gap-3 rounded-lg border p-4 {presentation.theme === 'dark'
              ? 'bg-neutral-950 border-neutral-700'
              : 'bg-white border-neutral-300'}"
          >
            <div class="font-bold text-sm border-b pb-1">Schriftart & Foliendarstellung</div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div class="flex flex-col gap-1">
                <label for="font-family-select" class="font-bold">Schriftart (#Font):</label>
                <select
                  id="font-family-select"
                  bind:value={fontFamily}
                  class="px-2.5 py-1.5 rounded border focus:outline-none {presentation.theme === 'dark'
                    ? 'bg-neutral-900 border-neutral-700 text-white'
                    : 'bg-white border-neutral-300'}"
                >
                  <option value="Arial">Arial (Standard)</option>
                  <option value="Segoe UI">Segoe UI</option>
                  <option value="Inter">Inter</option>
                  <option value="Roboto">Roboto</option>
                  <option value="Times New Roman">Times New Roman</option>
                  <option value="Georgia">Georgia</option>
                </select>
              </div>

              <div class="flex flex-col gap-1">
                <label for="font-size-input" class="font-bold">Schriftgröße ({fontSize}px / #FontSize):</label>
                <div class="flex items-center gap-2">
                  <input
                    id="font-size-input"
                    type="range"
                    min="14"
                    max="64"
                    bind:value={fontSize}
                    class="flex-1"
                  />
                  <span class="w-10 text-right font-mono">{fontSize}</span>
                </div>
              </div>
            </div>
          </div>
        {:else if activeTab === 'background'}
          <!-- 4. Background Tab -->
          <div
            class="flex-1 flex flex-col gap-3 rounded-lg border p-4 {presentation.theme === 'dark'
              ? 'bg-neutral-950 border-neutral-700'
              : 'bg-white border-neutral-300'}"
          >
            <div class="font-bold text-sm border-b pb-1">Hintergrundbild & Darstellung</div>
            <p class="text-xs opacity-75">
              Wähle ein Hintergrundbild oder eine Farbfläche für diesen Song aus.
            </p>
            <div class="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-2">
              <button
                type="button"
                class="aspect-video rounded-lg border-2 border-blue-500 bg-gradient-to-b from-[#608ebf] via-[#4a7aa8] to-[#3a6691] flex items-center justify-center text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Klassisch Blau
              </button>
              <button
                type="button"
                class="aspect-video rounded-lg border border-neutral-600 bg-black flex items-center justify-center text-white text-xs font-bold shadow-xs cursor-pointer hover:border-neutral-400"
              >
                Schwarz
              </button>
              <button
                type="button"
                class="aspect-video rounded-lg border border-neutral-600 bg-gradient-to-br from-indigo-950 via-slate-900 to-black flex items-center justify-center text-white text-xs font-bold shadow-xs cursor-pointer hover:border-neutral-400"
              >
                Modern Nacht
              </button>
            </div>
          </div>
        {:else if activeTab === 'categories'}
          <!-- 5. Categories Tab -->
          <div
            class="flex-1 flex flex-col gap-3 rounded-lg border p-4 {presentation.theme === 'dark'
              ? 'bg-neutral-950 border-neutral-700'
              : 'bg-white border-neutral-300'}"
          >
            <div class="font-bold text-sm border-b pb-1">Kategorien & Schlagwörter</div>
            <div class="flex flex-wrap gap-2 text-xs">
              {#each ['Lobpreis & Anbetung', 'Dank', 'Kreuz & Gnade', 'Glaube', 'Gemeinde', 'Abendmahl', 'Taufe', 'Ostern', 'Weihnachten', 'Kinderlieder'] as tag}
                {@const isSelected = categories.includes(tag)}
                <button
                  type="button"
                  class="px-2.5 py-1 rounded-full border transition cursor-pointer {isSelected
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

            <div class="flex items-center gap-2 mt-2">
              <input
                type="text"
                bind:value={newCategoryInput}
                placeholder="Eigene Kategorie..."
                class="px-2.5 py-1 text-xs rounded border focus:outline-none {presentation.theme === 'dark'
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
                class="px-2.5 py-1 text-xs rounded bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer transition"
                onclick={() => {
                  if (newCategoryInput.trim()) {
                    categories = [...categories, newCategoryInput.trim()];
                    newCategoryInput = '';
                  }
                }}
              >
                + Hinzufügen
              </button>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
