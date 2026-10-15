<script lang="ts">
  import { onMount } from 'svelte';
  import { t } from '$lib/i18n';
  import { presentation } from '$lib/stores/presentation.svelte';
  import Header from '$lib/components/Header.svelte';
  import SchedulePanel from '$lib/components/SchedulePanel.svelte';
  import SlideDeck from '$lib/components/SlideDeck.svelte';
  import ClassicLayout from '$lib/components/ClassicLayout.svelte';
  import BeamerView from '$lib/components/BeamerView.svelte';
  import SettingsModal from '$lib/components/SettingsModal.svelte';
  import SongEditorModal from '$lib/components/SongEditorModal.svelte';
  import type { Song, Slide, LyricLine } from '$lib/types/models';
  import { parseSng } from '$lib/utils/sngParser';

  function getInitialWindowLabel(): string {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlLabel = params.get('window');
      if (urlLabel) return urlLabel;

      const internals = (window as unknown as {
        __TAURI_INTERNALS__?: {
          metadata?: {
            currentWebview?: { label?: string };
            currentWindow?: { label?: string };
          };
        };
      }).__TAURI_INTERNALS__;

      const webviewLabel = internals?.metadata?.currentWebview?.label ?? internals?.metadata?.currentWindow?.label;
      if (webviewLabel) return webviewLabel;
    }
    return 'main';
  }

  let windowLabel = $state<string>(getInitialWindowLabel());
  let currentTime = $state<string>('');

  const nextSlide = $derived<Slide | null>(
    presentation.activeSong && presentation.activeSlideIndex + 1 < presentation.activeSlides.length
      ? presentation.activeSlides[presentation.activeSlideIndex + 1]
      : null
  );

  function getAudienceText(line: LyricLine): string {
    return line.tokens
      .map((t) => (t.kind === 'Chord' ? '' : t.text))
      .join('');
  }

  // Handle global keyboard shortcuts matching SongBeamer muscle memory
  function handleKeyDown(e: KeyboardEvent) {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    if ((e.ctrlKey || e.metaKey) && (e.key === 'o' || e.key === 'O')) {
      e.preventDefault();
      presentation.openSongFileDialog();
      return;
    }

    if ((e.ctrlKey || e.metaKey) && (e.key === 'e' || e.key === 'E')) {
      e.preventDefault();
      presentation.openSongEditor();
      return;
    }

    if ((e.ctrlKey || e.metaKey) && (e.key === 'n' || e.key === 'N')) {
      e.preventDefault();
      if (e.shiftKey) {
        presentation.createNewSong();
      } else {
        presentation.newSchedule();
      }
      return;
    }

    if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '=')) {
      e.preventDefault();
      presentation.zoomIn();
      return;
    }

    if ((e.ctrlKey || e.metaKey) && (e.key === '-' || e.key === '_')) {
      e.preventDefault();
      presentation.zoomOut();
      return;
    }

    if ((e.ctrlKey || e.metaKey) && (e.key === '0')) {
      e.preventDefault();
      presentation.resetZoom();
      return;
    }

    switch (e.key) {
      case 'F7':
        e.preventDefault();
        presentation.openSongEditor();
        break;
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
        if (!presentation.isBeamerActive) {
          presentation.startBeamer(undefined, 'normal');
        } else {
          presentation.setDisplayMode('normal');
        }
        break;
      case 'F5':
      case 'b':
      case 'B':
        e.preventDefault();
        if (!presentation.isBeamerActive) {
          presentation.startBeamer(undefined, 'black');
        } else {
          presentation.setDisplayMode(presentation.displayMode === 'black' ? 'normal' : 'black');
        }
        break;
      case 'F6':
      case 'c':
      case 'C':
        e.preventDefault();
        if (!presentation.isBeamerActive) {
          presentation.startBeamer(undefined, 'clear_text');
        } else {
          presentation.setDisplayMode(presentation.displayMode === 'clear_text' ? 'normal' : 'clear_text');
        }
        break;
      case 'F12':
      case 'Escape':
        if (presentation.isBeamerActive) {
          e.preventDefault();
          presentation.closeBeamer();
        }
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
        if (presentation.activeSong && index < presentation.activeSlides.length) {
          e.preventDefault();
          presentation.selectSlide(index);
        }
        break;
      }
    }
  }

  async function handleFileDrop(e: DragEvent) {
    if (e.dataTransfer?.types.includes('application/x-noah-schedule')) {
      return;
    }
    e.preventDefault();
    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      if (file && (file.name.endsWith('.sng') || file.name.endsWith('.txt') || file.name.endsWith('.pro'))) {
        try {
          if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
            const content = await file.text();
            const { invoke } = await import('@tauri-apps/api/core');
            const res = await invoke<{ song: Song; encoding: string }>('parse_sng', { content });
            presentation.addSongToSchedule(res.song);
            continue;
          }
          const buffer = await file.arrayBuffer();
          const song = parseSng(new Uint8Array(buffer), file.name);
          presentation.addSongToSchedule(song);
        } catch (err) {
          console.warn('Failed to parse dropped file:', file.name, err);
        }
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
        presentation.init();
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

  $effect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', presentation.theme === 'dark');
    }
  });
</script>

{#if windowLabel === 'beamer'}
  <BeamerView />
{:else if presentation.uiMode === 'classic'}
  <div class="h-screen w-screen overflow-hidden relative {presentation.theme === 'dark' ? 'dark bg-[#181a1f] text-neutral-100' : 'light bg-neutral-100 text-neutral-900'}">
    <div
      class="flex flex-col h-full w-full font-sans select-none"
      role="region"
      aria-label="Noah Presentation Control Studio (Classic)"
      ondragover={(e) => {
        if (e.dataTransfer?.types.includes('application/x-noah-schedule')) {
          return;
        }
        e.preventDefault();
      }}
      ondrop={handleFileDrop}
    >
      <ClassicLayout />
    </div>

    {#if presentation.isSettingsOpen}
      <SettingsModal />
    {/if}

    {#if presentation.isSongEditorOpen}
      <SongEditorModal />
    {/if}
  </div>
{:else}
  <div
    class="flex flex-col h-screen w-screen overflow-hidden font-sans transition-colors {presentation.theme === 'dark'
      ? 'bg-neutral-950 text-neutral-100 dark'
      : 'bg-slate-100 text-slate-900 light'}"
    role="region"
    aria-label="Noah Presentation Control Studio"
    ondragover={(e) => {
      if (e.dataTransfer?.types.includes('application/x-noah-schedule')) {
        return;
      }
      e.preventDefault();
    }}
    ondrop={handleFileDrop}
  >
    <div class="relative z-50 shrink-0">
      <Header />
    </div>

    <!-- SongBeamer Workspace: Ablaufplan + Folien + Optional Output Monitors -->
    <main class="relative z-10 flex-1 flex overflow-hidden">
      <!-- 1. Left Column: Ablaufplan (Order of Service) -->
      <SchedulePanel />

      <!-- 2. Center Column: Folien-Deck (SongBeamer 2-Column Aspect-Ratio Slide Deck) -->
      <SlideDeck />

      <!-- 3. Right Column: Output Monitors & Quick Controls (Collapsible, default closed) -->
      {#if presentation.isRightPanelOpen}
        <section
          class="w-80 lg:w-96 border-l p-3 flex flex-col gap-3 overflow-hidden select-none shrink-0 transition-all {presentation.theme === 'dark'
            ? 'border-neutral-800 bg-neutral-950/95 text-neutral-100'
            : 'border-slate-200 bg-white/95 text-slate-900'}"
        >
          <!-- Top Half: Live Audience Beamer Preview (Exact Output Replica) -->
          <div
            class="flex-1 flex flex-col rounded-xl border bg-black overflow-hidden relative shadow-xl {presentation.theme === 'dark'
              ? 'border-neutral-800'
              : 'border-slate-300'}"
          >
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
                  <span class="text-[10px] font-mono text-neutral-500 tracking-widest uppercase">{t('status.black')}</span>
                </div>
              {:else if presentation.displayMode === 'clear_text'}
                <div class="absolute inset-0 bg-neutral-950 flex items-center justify-center">
                  <span class="text-[10px] font-mono text-neutral-500 tracking-widest uppercase">{t('status.clear')}</span>
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

    {#if presentation.isSettingsOpen}
      <SettingsModal />
    {/if}

    {#if presentation.isSongEditorOpen}
      <SongEditorModal />
    {/if}
  </div>

{/if}
