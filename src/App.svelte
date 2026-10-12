<script lang="ts">
  import { onMount } from 'svelte';
  import { t } from '$lib/i18n';
  import { presentation } from '$lib/stores/presentation.svelte';
  import Header from '$lib/components/Header.svelte';
  import SchedulePanel from '$lib/components/SchedulePanel.svelte';
  import SlideDeck from '$lib/components/SlideDeck.svelte';
  import BeamerView from '$lib/components/BeamerView.svelte';
  import type { Song, Slide, LyricLine } from '$lib/types/models';

  let windowLabel = $state<string>('main');
  let currentTime = $state<string>('');

  const nextSlide = $derived<Slide | null>(
    presentation.activeSong && presentation.activeSlideIndex + 1 < presentation.activeSong.slides.length
      ? presentation.activeSong.slides[presentation.activeSlideIndex + 1]
      : null
  );

  function getAudienceText(line: LyricLine): string {
    return line.tokens
      .map((t) => (t.kind === 'Chord' ? '' : t.text))
      .join('');
  }

  // Sample SNG content from SNG_SPECIFICATION.md
  const SAMPLE_SNG = `#Title=Lobe den Herrn, meine Seele
#Author=Norbert Kissel
#Key=D
#Format=Refrain,Vers 1,Refrain,Vers 2
---
$$M=Refrain
[D]Lobe den Herrn, [G]meine Seele,
und [A]alles in mir seinen [D]heiligen Namen.
[D]Lobe den Herrn, [G]meine Seele,
und [A]vergiss nicht, was er dir [D]Gutes getan.
---
$$M=Vers 1
Der dir [Em]alle deine [A]Sünden vergibt
und [F#m]heilet alle deine [Bm]Gebrechen,
der dein [Em]Leben vom Ver[A]derben erlöst,
der dich [G]krönet mit Gnade und [A]Barmherzigkeit.
---
$$M=Vers 2
Der deinen [Em]Mund fröhlich [A]macht,
und du wieder [F#m]jung wirst wie ein [Bm]Adler.
Der Herr [Em]schafft Ge[A]rechtigkeit
und Ge[G]richt allen, die Ge[A]walt leiden.
`;

  // Parse SNG text in frontend (for instant web preview / offline test) or via Tauri IPC
  async function loadSampleSong() {
    try {
      // In Tauri environment, attempt IPC command
      if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
        const { invoke } = await import('@tauri-apps/api/core');
        const res = await invoke<{ song: Song; encoding: string }>('parse_sng', { content: SAMPLE_SNG });
        presentation.setSong(res.song, res.encoding);
        return;
      }
    } catch {
      // Fallback to client-side model parsing
    }

    // Direct client fallback
    const song: Song = {
      id: 'song-sample-1',
      metadata: {
        title: 'Lobe den Herrn, meine Seele',
        author: 'Norbert Kissel',
        musical_key: 'D',
        verse_order: ['Refrain', 'Vers 1', 'Refrain', 'Vers 2'],
        lang_count: 1,
        custom_tags: {},
      },
      slides: [
        {
          id: 'slide-1',
          index: 0,
          label: 'Chorus',
          section: { type: 'Chorus' },
          raw_content: '[D]Lobe den Herrn, [G]meine Seele,\nund [A]alles in mir seinen [D]heiligen Namen.\n[D]Lobe den Herrn, [G]meine Seele,\nund [A]vergiss nicht, was er dir [D]Gutes getan.',
          lines: [
            {
              raw_text: '[D]Lobe den Herrn, [G]meine Seele,',
              language_index: 0,
              tokens: [
                { kind: 'ChordAndText', chord: 'D', text: 'Lobe den Herrn, ' },
                { kind: 'ChordAndText', chord: 'G', text: 'meine Seele,' },
              ],
            },
            {
              raw_text: 'und [A]alles in mir seinen [D]heiligen Namen.',
              language_index: 0,
              tokens: [
                { kind: 'Text', text: 'und ' },
                { kind: 'ChordAndText', chord: 'A', text: 'alles in mir seinen ' },
                { kind: 'ChordAndText', chord: 'D', text: 'heiligen Namen.' },
              ],
            },
            {
              raw_text: '[D]Lobe den Herrn, [G]meine Seele,',
              language_index: 0,
              tokens: [
                { kind: 'ChordAndText', chord: 'D', text: 'Lobe den Herrn, ' },
                { kind: 'ChordAndText', chord: 'G', text: 'meine Seele,' },
              ],
            },
            {
              raw_text: 'und [A]vergiss nicht, was er dir [D]Gutes getan.',
              language_index: 0,
              tokens: [
                { kind: 'Text', text: 'und ' },
                { kind: 'ChordAndText', chord: 'A', text: 'vergiss nicht, was er dir ' },
                { kind: 'ChordAndText', chord: 'D', text: 'Gutes getan.' },
              ],
            },
          ],
        },
        {
          id: 'slide-2',
          index: 1,
          label: 'Verse 1',
          section: { type: 'Verse', value: 1 },
          raw_content: 'Der dir [Em]alle deine [A]Sünden vergibt\nund [F#m]heilet alle deine [Bm]Gebrechen,\nder dein [Em]Leben vom Ver[A]derben erlöst,\nder dich [G]krönet mit Gnade und [A]Barmherzigkeit.',
          lines: [
            {
              raw_text: 'Der dir [Em]alle deine [A]Sünden vergibt',
              language_index: 0,
              tokens: [
                { kind: 'Text', text: 'Der dir ' },
                { kind: 'ChordAndText', chord: 'Em', text: 'alle deine ' },
                { kind: 'ChordAndText', chord: 'A', text: 'Sünden vergibt' },
              ],
            },
            {
              raw_text: 'und [F#m]heilet alle deine [Bm]Gebrechen,',
              language_index: 0,
              tokens: [
                { kind: 'Text', text: 'und ' },
                { kind: 'ChordAndText', chord: 'F#m', text: 'heilet alle deine ' },
                { kind: 'ChordAndText', chord: 'Bm', text: 'Gebrechen,' },
              ],
            },
            {
              raw_text: 'der dein [Em]Leben vom Ver[A]derben erlöst,',
              language_index: 0,
              tokens: [
                { kind: 'Text', text: 'der dein ' },
                { kind: 'ChordAndText', chord: 'Em', text: 'Leben vom Ver' },
                { kind: 'ChordAndText', chord: 'A', text: 'derben erlöst,' },
              ],
            },
            {
              raw_text: 'der dich [G]krönet mit Gnade und [A]Barmherzigkeit.',
              language_index: 0,
              tokens: [
                { kind: 'Text', text: 'der dich ' },
                { kind: 'ChordAndText', chord: 'G', text: 'krönet mit Gnade und ' },
                { kind: 'ChordAndText', chord: 'A', text: 'Barmherzigkeit.' },
              ],
            },
          ],
        },
        {
          id: 'slide-3',
          index: 2,
          label: 'Verse 2',
          section: { type: 'Verse', value: 2 },
          raw_content: 'Der deinen [Em]Mund fröhlich [A]macht,\nund du wieder [F#m]jung wirst wie ein [Bm]Adler.\nDer Herr [Em]schafft Ge[A]rechtigkeit\nund Ge[G]richt allen, die Ge[A]walt leiden.',
          lines: [
            {
              raw_text: 'Der deinen [Em]Mund fröhlich [A]macht,',
              language_index: 0,
              tokens: [
                { kind: 'Text', text: 'Der deinen ' },
                { kind: 'ChordAndText', chord: 'Em', text: 'Mund fröhlich ' },
                { kind: 'ChordAndText', chord: 'A', text: 'macht,' },
              ],
            },
            {
              raw_text: 'und du wieder [F#m]jung wirst wie ein [Bm]Adler.',
              language_index: 0,
              tokens: [
                { kind: 'Text', text: 'und du wieder ' },
                { kind: 'ChordAndText', chord: 'F#m', text: 'jung wirst wie ein ' },
                { kind: 'ChordAndText', chord: 'Bm', text: 'Adler.' },
              ],
            },
            {
              raw_text: 'Der Herr [Em]schafft Ge[A]rechtigkeit',
              language_index: 0,
              tokens: [
                { kind: 'Text', text: 'Der Herr ' },
                { kind: 'ChordAndText', chord: 'Em', text: 'schafft Ge' },
                { kind: 'ChordAndText', chord: 'A', text: 'rechtigkeit' },
              ],
            },
            {
              raw_text: 'und Ge[G]richt allen, die Ge[A]walt leiden.',
              language_index: 0,
              tokens: [
                { kind: 'Text', text: 'und Ge' },
                { kind: 'ChordAndText', chord: 'G', text: 'richt allen, die Ge' },
                { kind: 'ChordAndText', chord: 'A', text: 'walt leiden.' },
              ],
            },
          ],
        },
      ],
    };

    presentation.setSong(song, 'UTF-8');
  }

  // Handle global keyboard shortcuts matching SongBeamer muscle memory
  function handleKeyDown(e: KeyboardEvent) {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    switch (e.key) {
      case ' ':
      case 'PageDown':
      case 'ArrowDown':
      case 'ArrowRight':
        e.preventDefault();
        presentation.nextSlide();
        break;
      case 'PageUp':
      case 'ArrowUp':
      case 'ArrowLeft':
        e.preventDefault();
        presentation.prevSlide();
        break;
      case 'F4':
        e.preventDefault();
        presentation.setDisplayMode('normal');
        break;
      case 'F5':
      case 'b':
      case 'B':
        e.preventDefault();
        presentation.setDisplayMode(presentation.displayMode === 'black' ? 'normal' : 'black');
        break;
      case 'F6':
      case 'c':
      case 'C':
        e.preventDefault();
        presentation.setDisplayMode(presentation.displayMode === 'clear_text' ? 'normal' : 'clear_text');
        break;
      case 'F7':
      case 'l':
      case 'L':
        e.preventDefault();
        presentation.setDisplayMode(presentation.displayMode === 'logo' ? 'normal' : 'logo');
        break;
      case 'F8':
      case 'f':
      case 'F':
        e.preventDefault();
        presentation.setDisplayMode(presentation.displayMode === 'frozen' ? 'normal' : 'frozen');
        break;
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
      case '7':
      case '8':
      case '9': {
        const index = parseInt(e.key, 10) - 1;
        if (presentation.activeSong && index < presentation.activeSong.slides.length) {
          e.preventDefault();
          presentation.selectSlide(index);
        }
        break;
      }
    }
  }

  async function handleFileDrop(e: DragEvent) {
    e.preventDefault();
    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (file && (file.name.endsWith('.sng') || file.name.endsWith('.txt') || file.name.endsWith('.pro'))) {
      const content = await file.text();
      try {
        if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
          const { invoke } = await import('@tauri-apps/api/core');
          const res = await invoke<{ song: Song; encoding: string }>('parse_sng', { content });
          presentation.setSong(res.song, res.encoding);
          return;
        }
      } catch (err) {
        console.warn('Failed to parse dropped file via IPC:', err);
      }
    }
  }

  onMount(() => {
    async function init() {
      // Detect whether running in secondary 'beamer' window or main control window
      if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
        try {
          const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow');
          windowLabel = getCurrentWebviewWindow().label;
        } catch {
          windowLabel = 'main';
        }
      } else {
        const params = new URLSearchParams(window.location.search);
        windowLabel = params.get('window') || 'main';
      }

      if (windowLabel === 'main') {
        presentation.refreshDisplays();
      }
    }

    init();

    const timer = setInterval(() => {
      const now = new Date();
      currentTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }, 1000);

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearInterval(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  });
</script>

{#if windowLabel === 'beamer'}
  <BeamerView />
{:else}
  <div
    class="flex flex-col h-screen w-screen overflow-hidden bg-neutral-950 text-neutral-100 font-sans"
    role="region"
    aria-label="Noah Presentation Control Studio"
    ondragover={(e) => e.preventDefault()}
    ondrop={handleFileDrop}
  >
    <Header onLoadSample={loadSampleSong} />

    <!-- SongBeamer Workspace: Ablaufplan + Folien + Optional Output Monitors -->
    <main class="flex-1 flex overflow-hidden">
      <!-- 1. Left Column: Ablaufplan (Order of Service) -->
      <SchedulePanel />

      <!-- 2. Center Column: Folien-Deck (SongBeamer 2-Column Aspect-Ratio Slide Deck) -->
      <SlideDeck />

      <!-- 3. Right Column: Output Monitors & Quick Controls (Collapsible, default closed) -->
      {#if presentation.isRightPanelOpen}
        <section class="w-80 lg:w-96 border-l border-neutral-800 bg-neutral-950/95 p-3 flex flex-col gap-3 overflow-hidden select-none shrink-0 transition-all">
          <!-- Top Half: Live Audience Beamer Preview (Exact Output Replica) -->
          <div class="flex-1 flex flex-col rounded-xl border border-neutral-800 bg-black overflow-hidden relative shadow-xl">
            <div class="bg-neutral-900/90 border-b border-neutral-800 px-3 py-1.5 flex items-center justify-between text-[11px] font-medium text-neutral-400">
              <span class="flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full {presentation.displayMode === 'normal' ? 'bg-red-500 animate-pulse' : 'bg-neutral-600'}"></span>
                {t('slide.audienceView')}
              </span>
              <span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-neutral-800 text-neutral-300">
                {presentation.activeSlide ? `${presentation.activeSlide.label} (${presentation.activeSlideIndex + 1}/${presentation.activeSong?.slides.length ?? 0})` : ''}
              </span>
            </div>

            <!-- Audience Screen Content -->
            <div class="flex-1 flex items-center justify-center p-4 relative overflow-hidden text-center">
              {#if presentation.displayMode === 'black'}
                <div class="absolute inset-0 bg-black flex items-center justify-center">
                  <span class="text-[10px] font-mono text-neutral-700 tracking-widest uppercase">BLACK OUT</span>
                </div>
              {:else if presentation.displayMode === 'clear_text'}
                <div class="absolute inset-0 bg-neutral-950 flex items-center justify-center">
                  <span class="text-[10px] font-mono text-neutral-600 tracking-widest uppercase">TEXT CLEARED</span>
                </div>
              {:else if presentation.displayMode === 'logo'}
                <div class="absolute inset-0 bg-neutral-950 flex flex-col items-center justify-center">
                  <div class="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 text-lg font-bold mb-1 shadow">
                    N
                  </div>
                  <span class="text-[10px] font-semibold text-neutral-400 tracking-wider">Noah</span>
                </div>
              {:else if presentation.activeSlide}
                <div class="text-center space-y-1.5 font-semibold text-sm md:text-base leading-snug text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] max-w-full">
                  {#each presentation.activeSlide.lines as line}
                    <p class="tracking-wide">{getAudienceText(line)}</p>
                  {/each}
                </div>
              {/if}
            </div>
          </div>

          <!-- Bottom Half: Stage Confidence Monitor with Next Slide Preview & Clock -->
          <div class="h-60 rounded-xl border border-neutral-800 bg-neutral-950 flex flex-col overflow-hidden shadow-md">
            <div class="bg-neutral-900/90 border-b border-neutral-800 px-3 py-1.5 flex items-center justify-between text-[11px] font-medium text-amber-400/90">
              <span class="flex items-center gap-1.5 font-semibold">
                {t('slide.stageView')}
              </span>
              <span class="font-mono text-[11px] text-neutral-400 font-semibold">{currentTime}</span>
            </div>

            <div class="flex-1 p-3 overflow-y-auto flex flex-col justify-between">
              <!-- Active Slide Chords -->
              {#if presentation.activeSlide}
                <div class="space-y-1 text-center font-mono">
                  {#each presentation.activeSlide.lines as line}
                    <div class="text-xs">
                      {#each line.tokens as token}
                        {#if token.kind === 'ChordAndText'}
                          <span class="inline-flex flex-col align-top mx-1">
                            <span class="text-[10px] font-bold text-amber-400 leading-none">{token.chord}</span>
                            <span class="text-neutral-200">{token.text}</span>
                          </span>
                        {:else if token.kind === 'Chord'}
                          <span class="inline-block text-[10px] font-bold text-amber-400 mx-1 leading-none">{token.chord}</span>
                        {:else if token.kind === 'Text'}
                          <span class="text-neutral-200 mx-1">{token.text}</span>
                        {/if}
                      {/each}
                    </div>
                  {/each}
                </div>
              {/if}

              <!-- Next Slide Preview Hint -->
              {#if nextSlide}
                <div class="mt-2 pt-2 border-t border-neutral-800/80 text-[11px] text-neutral-400 truncate flex items-center gap-1.5">
                  <span class="text-amber-500/80 font-semibold shrink-0">{t('deck.nextSlideHint')}</span>
                  <span class="text-neutral-300 truncate">
                    {nextSlide.lines.map(l => getAudienceText(l)).join(' / ')}
                  </span>
                </div>
              {/if}
            </div>

            <!-- Stage Navigation Controls -->
            <div class="bg-neutral-900/80 border-t border-neutral-800 p-2 flex items-center justify-between gap-2">
              <button
                type="button"
                class="flex-1 py-1.5 rounded text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition"
                onclick={() => presentation.prevSlide()}
              >
                ← {t('slide.prev')}
              </button>
              <button
                type="button"
                class="flex-1 py-1.5 rounded text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow transition font-bold"
                onclick={() => presentation.nextSlide()}
              >
                {t('slide.next')} →
              </button>
            </div>
          </div>
        </section>
      {/if}
    </main>
  </div>

{/if}
