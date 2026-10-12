<script lang="ts">
  import { onMount } from 'svelte';
  import type { DisplayMode, Song, Slide, LyricLine, BeamerEvent, BeamerStateResponse } from '$lib/types';

  // State managed inside the Beamer webview process
  let activeSong = $state<Song | null>(null);
  let displayMode = $state<DisplayMode>('normal');
  let isFrozen = $state<boolean>(false);
  let alertMessage = $state<{ text: string; expiry: number } | null>(null);

  // Double buffering: layer A and layer B for zero-flicker GPU crossfades
  let currentLayer = $state<'A' | 'B'>('A');
  let slideA = $state<Slide | null>(null);
  let slideB = $state<Slide | null>(null);

  function getAudienceLines(slide: Slide | null): string[] {
    if (!slide) return [];
    return slide.lines.map((line: LyricLine) =>
      line.tokens
        .filter((t) => t.kind !== 'Chord')
        .map((t) => t.text)
        .join('')
    );
  }

  // Dynamic binary auto-font sizing (REQ-SONG-03)
  // Calculates optimal viewport-relative font size so text fills ~85% of screen without clipping
  function calculateDynamicFontSize(slide: Slide | null): string {
    if (!slide) return '5.5vw';
    const lines = getAudienceLines(slide);
    if (lines.length === 0) return '5.5vw';

    const lineCount = lines.length;
    const maxLineLen = Math.max(...lines.map((l) => l.trim().length), 1);

    // Horizontal limit: longest line must fit in 92vw safely
    const horizontalVw = Math.min(10.5, Math.max(2.8, 92 / (maxLineLen * 0.52)));

    // Vertical limit: all lines with line-height fit in 82vh safely
    const verticalVh = Math.min(13.0, Math.max(3.2, 82 / (lineCount * 1.35)));

    return `min(${horizontalVw.toFixed(2)}vw, ${verticalVh.toFixed(2)}vh)`;
  }

  async function refreshState() {
    if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const state = await invoke<BeamerStateResponse>('get_beamer_state');
        if (state) {
          displayMode = state.display_mode;
          if (state.active_song) {
            activeSong = state.active_song;
            const slide = state.active_song.slides[state.active_slide_index ?? 0] ?? null;
            if (slide) {
              if (currentLayer === 'A') {
                slideA = slide;
              } else {
                slideB = slide;
              }
            }
          }
        }
      } catch (err) {
        console.warn('Beamer window IPC state fetch error:', err);
      }
    }
  }

  async function handleBeamerEvent(event: BeamerEvent) {
    if (isFrozen && event.type !== 'SET_BLANK') {
      return;
    }

    switch (event.type) {
      case 'SYNC_SONG': {
        activeSong = event.song;
        const targetSlide = event.song.slides[event.slideIndex] ?? null;
        updateSlideWithTransition(targetSlide);
        break;
      }
      case 'CHANGE_SLIDE': {
        if (!activeSong) {
          await refreshState();
        }
        if (activeSong) {
          const found = activeSong.slides.find((s) => s.id === event.slideId);
          if (found) {
            updateSlideWithTransition(found);
          }
        }
        break;
      }
      case 'SET_BLANK': {
        displayMode = event.mode;
        isFrozen = event.mode === 'frozen';
        break;
      }
      case 'ALERT_OVERLAY': {
        alertMessage = {
          text: event.message,
          expiry: Date.now() + event.durationMs,
        };
        setTimeout(() => {
          if (alertMessage && Date.now() >= alertMessage.expiry) {
            alertMessage = null;
          }
        }, event.durationMs);
        break;
      }
    }
  }

  function updateSlideWithTransition(nextSlide: Slide | null) {
    if (currentLayer === 'A') {
      slideB = nextSlide;
      currentLayer = 'B';
    } else {
      slideA = nextSlide;
      currentLayer = 'A';
    }
  }

  onMount(() => {
    let unlisten: (() => void) | null = null;
    let pollInterval: ReturnType<typeof setInterval> | null = null;

    async function init() {
      if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
        try {
          const { listen } = await import('@tauri-apps/api/event');

          unlisten = await listen<BeamerEvent>('beamer-event', (e) => {
            handleBeamerEvent(e.payload);
          });

          await refreshState();

          // Auto-recovery polling until song is loaded
          pollInterval = setInterval(() => {
            if (!activeSong) {
              refreshState();
            } else if (pollInterval) {
              clearInterval(pollInterval);
              pollInterval = null;
            }
          }, 400);
        } catch (err) {
          console.warn('Beamer window IPC initialization error:', err);
        }
      }
    }

    init();

    const handleFocus = () => { refreshState(); };
    window.addEventListener('focus', handleFocus);

    return () => {
      if (unlisten) unlisten();
      if (pollInterval) clearInterval(pollInterval);
      window.removeEventListener('focus', handleFocus);
    };
  });
</script>

<!-- Audience Display Canvas (Zero-border, GPU-accelerated) -->
<div class="h-screen w-screen bg-black text-white relative overflow-hidden select-none font-sans flex items-center justify-center">
  <!-- Blanking Overlays -->
  {#if displayMode === 'black'}
    <div class="absolute inset-0 bg-black z-50"></div>
  {:else if displayMode === 'clear_text'}
    <div class="absolute inset-0 bg-neutral-950 z-40"></div>
  {:else if displayMode === 'logo'}
    <div class="absolute inset-0 bg-neutral-950 z-40 flex flex-col items-center justify-center p-8 animate-fade-in">
      <div class="w-32 h-32 md:w-44 md:h-44 rounded-3xl bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center shadow-2xl mb-6 backdrop-blur">
        <span class="text-amber-400 font-black text-6xl md:text-7xl tracking-wider">N</span>
      </div>
      <h1 class="text-3xl md:text-4xl font-extrabold tracking-widest text-neutral-200">Noah</h1>
      <p class="text-sm md:text-base font-medium text-neutral-500 tracking-widest mt-2">NOT ONLY ANOTHER HYMNAL</p>
    </div>
  {/if}

  <!-- Double-Buffered Slide Layers with Dynamic Auto-Font Sizing -->
  <!-- Layer A -->
  <div
    class="absolute inset-0 flex flex-col items-center justify-center text-center transition-opacity duration-300 pointer-events-none p-4"
    style="opacity: {currentLayer === 'A' && displayMode === 'normal' ? '1' : '0'}; z-index: {currentLayer === 'A' ? '10' : '5'};"
  >
    {#if slideA}
      <div
        class="w-full max-w-[95vw] text-center space-y-2 md:space-y-4"
        style="font-size: {calculateDynamicFontSize(slideA)};"
      >
        {#each getAudienceLines(slideA) as line}
          <p class="font-bold leading-snug tracking-wide text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.98)] drop-shadow-[0_2px_6px_rgba(0,0,0,1)]">
            {line}
          </p>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Layer B -->
  <div
    class="absolute inset-0 flex flex-col items-center justify-center text-center transition-opacity duration-300 pointer-events-none p-4"
    style="opacity: {currentLayer === 'B' && displayMode === 'normal' ? '1' : '0'}; z-index: {currentLayer === 'B' ? '10' : '5'};"
  >
    {#if slideB}
      <div
        class="w-full max-w-[95vw] text-center space-y-2 md:space-y-4"
        style="font-size: {calculateDynamicFontSize(slideB)};"
      >
        {#each getAudienceLines(slideB) as line}
          <p class="font-bold leading-snug tracking-wide text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.98)] drop-shadow-[0_2px_6px_rgba(0,0,0,1)]">
            {line}
          </p>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Operator Alert Banner Overlay (REQ-DSP-03) -->
  {#if alertMessage}
    <div class="absolute bottom-8 inset-x-16 z-50 animate-bounce">
      <div class="bg-amber-500/90 text-neutral-950 font-bold px-8 py-4 rounded-2xl shadow-2xl backdrop-blur flex items-center justify-center text-xl md:text-2xl border-2 border-amber-300">
        <span>⚠️ {alertMessage.text}</span>
      </div>
    </div>
  {/if}
</div>

<style>
  @keyframes fadeIn {
    from { opacity: 0; transform: scale(0.98); }
    to { opacity: 1; transform: scale(1); }
  }
  .animate-fade-in {
    animation: fadeIn 0.4s ease-out forwards;
  }
</style>
