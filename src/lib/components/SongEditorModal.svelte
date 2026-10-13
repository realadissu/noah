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

  // UI state
  let isChordModalOpen = $state<boolean>(false);
  let newOrderPartInput = $state<string>('');
  let viewMode = $state<'banners' | 'raw'>('banners');

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
    }
  });

  // Check if song currently contains bracketed guitar chords
  const hasChords = $derived<boolean>(/\[[A-Ha-h][b#]?[^\]]*\]/.test(editorText));

  // Determine section banner color matching SongBeamer authenticity
  function getSectionColor(label: string): { bg: string; text: string; hex: string } {
    const l = label.toLowerCase();
    if (l.startsWith('vers') || l.startsWith('strophe') || l.startsWith('verse')) {
      return { bg: 'bg-[#0078d7]', text: 'text-white', hex: '#0078d7' }; // Windows/SongBeamer Blue
    }
    if (l.startsWith('refrain') || l.startsWith('chorus') || l == 'chor') {
      return { bg: 'bg-[#7e12d4]', text: 'text-white', hex: '#7e12d4' }; // SongBeamer Purple
    }
    if (l.startsWith('bridge')) {
      return { bg: 'bg-[#cc0000]', text: 'text-white', hex: '#cc0000' }; // SongBeamer Crimson Red
    }
    if (l.startsWith('pre-chorus') || l.startsWith('prechorus')) {
      return { bg: 'bg-[#008080]', text: 'text-white', hex: '#008080' }; // Teal
    }
    if (l.startsWith('intro') || l.startsWith('outro') || l.startsWith('coda')) {
      return { bg: 'bg-[#475569]', text: 'text-white', hex: '#475569' }; // Slate
    }
    return { bg: 'bg-[#1e40af]', text: 'text-white', hex: '#1e40af' };
  }

  interface ParsedSlideBlock {
    id: number;
    section: string;
    lyrics: string;
  }

  // Parse editorText into distinct slide blocks for visual banner rendering
  const parsedBlocks = $derived<ParsedSlideBlock[]>(
    editorText.split('\n---\n').map((block, id) => {
      const lines = block.split('\n');
      const firstLine = lines[0]?.trim() ?? '';
      const isHeader =
        firstLine.startsWith('$$M=') ||
        /^(vers|verse|strophe|refrain|chorus|bridge|pre-chorus|intro|outro|coda|zwischenspiel|schluss)/i.test(firstLine);

      if (isHeader) {
        const cleanTag = firstLine.replace(/^\$\$M=/, '').trim();
        return {
          id,
          section: cleanTag,
          lyrics: lines.slice(1).join('\n'),
        };
      }
      return {
        id,
        section: id === 0 ? 'Vers 1' : `Folie ${id + 1}`,
        lyrics: block,
      };
    })
  );

  function updateBlockLyrics(id: number, newLyrics: string) {
    const blocks = [...parsedBlocks];
    if (blocks[id]) {
      blocks[id].lyrics = newLyrics;
      editorText = blocks.map((b) => `${b.section}\n${b.lyrics}`.trim()).join('\n---\n');
    }
  }

  function updateBlockSection(id: number, newSection: string) {
    const blocks = [...parsedBlocks];
    if (blocks[id]) {
      blocks[id].section = newSection;
      editorText = blocks.map((b) => `${b.section}\n${b.lyrics}`.trim()).join('\n---\n');
    }
  }

  function addSlideBlock(afterId: number) {
    const blocks = [...parsedBlocks];
    const newBlock: ParsedSlideBlock = {
      id: blocks.length,
      section: 'Refrain',
      lyrics: '',
    };
    blocks.splice(afterId + 1, 0, newBlock);
    editorText = blocks.map((b) => `${b.section}\n${b.lyrics}`.trim()).join('\n---\n');
  }

  function deleteSlideBlock(id: number) {
    if (parsedBlocks.length <= 1) return;
    const blocks = parsedBlocks.filter((_, idx) => idx !== id);
    editorText = blocks.map((b) => `${b.section}\n${b.lyrics}`.trim()).join('\n---\n');
  }

  // Lightning button: automatically deduce verse order from section banners in text
  function autoPopulateVerseOrder() {
    const detected: string[] = [];
    for (const b of parsedBlocks) {
      if (b.section && !detected.includes(b.section)) {
        detected.push(b.section);
      }
    }
    // If standard Verse + Chorus detected, populate common flow
    if (detected.some((s) => s.toLowerCase().startsWith('vers 1')) && detected.some((s) => s.toLowerCase().startsWith('refrain'))) {
      const order: string[] = [];
      const verses = detected.filter((s) => s.toLowerCase().startsWith('vers'));
      const chorus = detected.find((s) => s.toLowerCase().startsWith('refrain')) || 'Refrain';
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

  function addOrderPart(part: string) {
    if (!part.trim()) return;
    verseOrder = [...verseOrder, part.trim()];
    newOrderPartInput = '';
  }

  function removeOrderPart(idx: number) {
    verseOrder = verseOrder.filter((_, i) => i !== idx);
  }

  // Chord tools
  async function transposeBy(semitones: number) {
    editorText = await presentation.transposeLyrics(editorText, semitones);
    transpose += semitones;
  }

  async function stripAllChords() {
    editorText = await presentation.stripChords(editorText);
  }

  function insertSlideSeparator() {
    if (viewMode === 'raw') {
      editorText += '\n---\n';
    } else {
      addSlideBlock(parsedBlocks.length - 1);
    }
  }

  // Save changes
  async function handleSave() {
    if (!title.trim()) {
      alert('Bitte geben Sie einen Songtitel ein.');
      return;
    }

    // Convert editor text and metadata into full SNG string
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

    // Parse via backend to guarantee robust tokenization & AST creation
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
          <!-- 1. Song Title Input & Top Control Buttons -->
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

            <!-- Top Right Action Buttons: OK, Abbrechen, Akkorde, Hintergrund -->
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

          <!-- Formatting & Insertion Toolbar above editor -->
          <div
            class="h-8 px-2 flex items-center justify-between border rounded text-xs shrink-0 select-none {presentation.theme === 'dark'
              ? 'bg-neutral-900/70 border-neutral-700'
              : 'bg-[#f4f2ec] border-neutral-300'}"
          >
            <div class="flex items-center gap-1">
              <!-- Quick part insertion -->
              <span class="text-[11px] font-bold opacity-75">Teil einfügen:</span>
              <button
                type="button"
                class="px-1.5 py-0.5 rounded bg-[#0078d7] text-white font-bold text-[10px] hover:opacity-90 cursor-pointer"
                onclick={() => {
                  const num = parsedBlocks.filter((b) => b.section.toLowerCase().startsWith('vers')).length + 1;
                  addOrderPart(`Vers ${num}`);
                  if (viewMode === 'raw') editorText += `\n---\nVers ${num}\n`;
                  else addSlideBlock(parsedBlocks.length - 1);
                }}
              >
                + Vers
              </button>
              <button
                type="button"
                class="px-1.5 py-0.5 rounded bg-[#7e12d4] text-white font-bold text-[10px] hover:opacity-90 cursor-pointer"
                onclick={() => {
                  addOrderPart('Refrain');
                  if (viewMode === 'raw') editorText += '\n---\nRefrain\n';
                  else addSlideBlock(parsedBlocks.length - 1);
                }}
              >
                + Refrain
              </button>
              <button
                type="button"
                class="px-1.5 py-0.5 rounded bg-[#cc0000] text-white font-bold text-[10px] hover:opacity-90 cursor-pointer"
                onclick={() => {
                  addOrderPart('Bridge');
                  if (viewMode === 'raw') editorText += '\n---\nBridge\n';
                  else addSlideBlock(parsedBlocks.length - 1);
                }}
              >
                + Bridge
              </button>
              <button
                type="button"
                class="px-1.5 py-0.5 rounded bg-[#475569] text-white font-bold text-[10px] hover:opacity-90 cursor-pointer"
                onclick={() => {
                  addOrderPart('Intro');
                  if (viewMode === 'raw') editorText += '\n---\nIntro\n';
                  else addSlideBlock(parsedBlocks.length - 1);
                }}
              >
                + Intro
              </button>
            </div>

            <!-- View mode toggle: SongBeamer Banner View vs Raw Text View -->
            <div class="flex items-center gap-1 text-[11px]">
              <span class="opacity-70">Ansicht:</span>
              <button
                type="button"
                class="px-2 py-0.5 rounded font-bold transition cursor-pointer {viewMode === 'banners'
                  ? 'bg-blue-600 text-white'
                  : 'hover:bg-black/10'}"
                onclick={() => (viewMode = 'banners')}
              >
                Banner
              </button>
              <button
                type="button"
                class="px-2 py-0.5 rounded font-bold transition cursor-pointer {viewMode === 'raw'
                  ? 'bg-blue-600 text-white'
                  : 'hover:bg-black/10'}"
                onclick={() => (viewMode = 'raw')}
              >
                SNG-Text
              </button>
            </div>
          </div>

          <!-- 2. Dual Column: Left = Main Editor, Right = Versreihenfolge & Options -->
          <div class="flex-1 flex flex-col md:flex-row gap-3 min-h-[320px] overflow-hidden">
            <!-- Left Column: Song Text Editor with SongBeamer Colored Banners -->
            <div
              class="flex-1 flex flex-col rounded-lg border overflow-hidden relative {presentation.theme === 'dark'
                ? 'bg-neutral-950 border-neutral-700'
                : 'bg-white border-neutral-400'}"
            >
              {#if viewMode === 'banners'}
                <!-- Visual Banner Mode (Matching SongBeamer Screenshot Authentically) -->
                <div class="flex-1 overflow-y-auto p-2 flex flex-col gap-2 relative">
                  <!-- Subtle center guideline -->
                  <div
                    class="absolute inset-y-0 left-1/2 border-r border-dotted border-neutral-300 dark:border-neutral-800 pointer-events-none"
                    aria-hidden="true"
                  ></div>

                  {#each parsedBlocks as block, idx (block.id)}
                    {@const color = getSectionColor(block.section)}
                    <div class="flex flex-col rounded border shadow-2xs overflow-hidden {presentation.theme === 'dark' ? 'border-neutral-800' : 'border-neutral-300'}">
                      <!-- Section Title Banner (Full Width Solid Colored Bar) -->
                      <div class="h-6 px-2.5 {color.bg} {color.text} flex items-center justify-between text-xs font-bold select-none">
                        <div class="flex items-center gap-2">
                          <span>{block.section}</span>
                        </div>
                        <div class="flex items-center gap-1.5 opacity-90 text-[10px]">
                          <select
                            value={block.section}
                            onchange={(e) => updateBlockSection(idx, (e.target as HTMLSelectElement).value)}
                            class="bg-black/30 text-white rounded px-1 py-0.2 focus:outline-none cursor-pointer"
                          >
                            <option value="Vers 1">Vers 1</option>
                            <option value="Vers 2">Vers 2</option>
                            <option value="Vers 3">Vers 3</option>
                            <option value="Vers 4">Vers 4</option>
                            <option value="Refrain">Refrain</option>
                            <option value="Refrain 2">Refrain 2</option>
                            <option value="Bridge">Bridge</option>
                            <option value="Pre-Chorus">Pre-Chorus</option>
                            <option value="Intro">Intro</option>
                            <option value="Outro">Outro</option>
                            <option value="Zwischenspiel">Zwischenspiel</option>
                          </select>
                          <button
                            type="button"
                            class="hover:text-red-200 transition cursor-pointer font-bold px-1"
                            onclick={() => deleteSlideBlock(idx)}
                            title="Folie entfernen"
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      <!-- Slide Lyrics Textarea -->
                      <textarea
                        value={block.lyrics}
                        oninput={(e) => updateBlockLyrics(idx, (e.target as HTMLTextAreaElement).value)}
                        placeholder="Liedtext für diese Folie..."
                        rows={Math.max(3, block.lyrics.split('\n').length)}
                        class="w-full p-2.5 text-xs font-mono leading-relaxed resize-none focus:outline-none transition {presentation.theme === 'dark'
                          ? 'bg-neutral-900 text-neutral-100 placeholder-neutral-600'
                          : 'bg-white text-neutral-900 placeholder-neutral-400'}"
                      ></textarea>
                    </div>

                    <!-- Slide divider separator if not last -->
                    {#if idx < parsedBlocks.length - 1}
                      <div class="flex items-center justify-center my-0.5 select-none">
                        <span class="text-red-500 font-mono text-xs font-bold tracking-widest">---</span>
                      </div>
                    {/if}
                  {/each}

                  <!-- Bottom border line matching SongBeamer -->
                  <div class="w-full h-0.5 bg-red-500 mt-2"></div>
                </div>
              {:else}
                <!-- Raw SNG Textarea -->
                <textarea
                  bind:value={editorText}
                  placeholder="Songtext mit Vers 1, Refrain und Folientrennung mit --- ..."
                  class="flex-1 w-full p-3 text-xs font-mono leading-relaxed resize-none focus:outline-none {presentation.theme === 'dark'
                    ? 'bg-neutral-950 text-neutral-100'
                    : 'bg-white text-neutral-900'}"
                ></textarea>
              {/if}
            </div>

            <!-- Right Column: Versreihenfolge & Language / Slide Controls -->
            <div class="w-full md:w-64 flex flex-col gap-3 shrink-0 text-xs">
              <!-- Versreihenfolge Box -->
              <div
                class="flex-1 flex flex-col rounded-lg border p-2.5 {presentation.theme === 'dark'
                  ? 'bg-neutral-900/60 border-neutral-700'
                  : 'bg-white border-neutral-400'}"
              >
                <div class="flex items-center justify-between font-bold mb-1.5">
                  <span>Versreihenfolge:</span>
                  <button
                    type="button"
                    class="p-1 rounded hover:bg-black/10 transition cursor-pointer font-bold text-amber-500"
                    onclick={autoPopulateVerseOrder}
                    title="Versreihenfolge automatisch aus Text generieren (Blitz)"
                  >
                    ⚡ Auto
                  </button>
                </div>

                <!-- Sequence list with colored text matching SongBeamer -->
                <div
                  class="flex-1 min-h-[120px] max-h-48 overflow-y-auto border rounded p-1 space-y-0.5 {presentation.theme === 'dark'
                    ? 'bg-neutral-950 border-neutral-800'
                    : 'bg-white border-neutral-300'}"
                >
                  {#if verseOrder.length === 0}
                    <div class="text-[11px] text-neutral-400 p-2 text-center">
                      Keine Reihenfolge festgelegt. Klicke ⚡ für Auto.
                    </div>
                  {:else}
                    {#each verseOrder as item, idx}
                      {@const color = getSectionColor(item)}
                      <div
                        class="px-2 py-0.5 rounded text-xs font-bold flex items-center justify-between group {presentation.theme === 'dark'
                          ? 'hover:bg-neutral-800'
                          : 'hover:bg-neutral-100'}"
                        style="color: {color.hex};"
                      >
                        <span>{item}</span>
                        <button
                          type="button"
                          class="opacity-0 group-hover:opacity-100 text-red-500 text-[10px] hover:font-black cursor-pointer"
                          onclick={() => removeOrderPart(idx)}
                          title="Entfernen"
                        >
                          ✕
                        </button>
                      </div>
                    {/each}
                  {/if}
                </div>

                <!-- Add Part to order -->
                <div class="flex items-center gap-1 mt-2">
                  <input
                    type="text"
                    bind:value={newOrderPartInput}
                    placeholder="Teil hinzufügen..."
                    class="flex-1 px-2 py-0.5 text-xs rounded border focus:outline-none {presentation.theme === 'dark'
                      ? 'bg-neutral-900 border-neutral-700 text-white'
                      : 'bg-white border-neutral-300 text-neutral-900'}"
                    onkeydown={(e) => {
                      if (e.key === 'Enter') addOrderPart(newOrderPartInput);
                    }}
                  />
                  <button
                    type="button"
                    class="w-6 h-6 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center cursor-pointer transition"
                    onclick={() => addOrderPart(newOrderPartInput)}
                    title="Zur Versreihenfolge hinzufügen"
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

              <!-- Yellow Button: Folien mit --- trennen -->
              <button
                type="button"
                class="w-full py-2 px-3 rounded-lg border font-bold text-xs shadow-xs transition cursor-pointer text-center {presentation.theme === 'dark'
                  ? 'bg-amber-400 hover:bg-amber-300 text-neutral-950 border-amber-500'
                  : 'bg-[#ffff99] hover:bg-[#ffff77] text-neutral-900 border-neutral-400'}"
                onclick={insertSlideSeparator}
              >
                Folien mit --- trennen
              </button>

              <!-- Chord status notice -->
              {#if hasChords}
                <div class="text-red-600 font-bold text-xs text-center">
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
