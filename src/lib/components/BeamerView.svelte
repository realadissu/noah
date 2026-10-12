<script lang="ts">
  import { onMount } from 'svelte';
  import type { DisplayMode, Song, Slide, LyricLine, BeamerEvent, PresentationState } from '$lib/types';

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

  function handleBeamerEvent(event: BeamerEvent) {
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
        if (!activeSong) return;
        const found = activeSong.slides.find((s) => s.id === event.slideId);
        if (found) {
          updateSlideWithTransition(found);
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

    async function init() {
      if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
        try {
          const { listen } = await import('@tauri-apps/api/event');
          const { invoke } = await import('@tauri-apps/api/core');

          unlisten = await listen<BeamerEvent>('beamer-event', (e) => {
            handleBeamerEvent(e.payload);
          });

          // Fetch current presentation state
          const state = await invoke<PresentationState>('get_presentation_state');
          if (state) {
            displayMode = state.display_mode;
          }
        } catch (err) {
          console.warn('Beamer window IPC initialization error:', err);
        }
      }
    }

    init();

    return () => {
      if (unlisten) unlisten();
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
      <div class="w-28 h-28 md:w-36 md:h-36 rounded-3xl bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center shadow-2xl mb-4 backdrop-blur">
        <span class="text-amber-400 font-black text-5xl md:text-6xl tracking-wider">N</span>
      </div>
      <h1 class="text-2xl md:text-3xl font-extrabold tracking-widest text-neutral-200">NOAH</h1>
      <p class="text-xs md:text-sm font-medium text-neutral-500 tracking-wider mt-1">NOT ONLY ANOTHER HYMNAL</p>
    </div>
  {/if}

  <!-- Double-Buffered Slide Layers -->
  <!-- Layer A -->
  <div
    class="absolute inset-0 flex flex-col items-center justify-center p-12 md:p-16 text-center transition-opacity duration-300 pointer-events-none"
    style="opacity: {currentLayer === 'A' && displayMode === 'normal' ? '1' : '0'}; z-index: {currentLayer === 'A' ? '10' : '5'};"
  >
    {#if slideA}
      <div class="space-y-4 md:space-y-6 max-w-5xl">
        {#each getAudienceLines(slideA) as line}
          <p class="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-wide drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)]">
            {line}
          </p>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Layer B -->
  <div
    class="absolute inset-0 flex flex-col items-center justify-center p-12 md:p-16 text-center transition-opacity duration-300 pointer-events-none"
    style="opacity: {currentLayer === 'B' && displayMode === 'normal' ? '1' : '0'}; z-index: {currentLayer === 'B' ? '10' : '5'};"
  >
    {#if slideB}
      <div class="space-y-4 md:space-y-6 max-w-5xl">
        {#each getAudienceLines(slideB) as line}
          <p class="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-wide drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)]">
            {line}
          </p>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Operator Alert Banner Overlay (REQ-DSP-03) -->
  {#if alertMessage}
    <div class="absolute bottom-6 inset-x-12 z-50 animate-bounce">
      <div class="bg-amber-500/90 text-neutral-950 font-bold px-6 py-3 rounded-xl shadow-2xl backdrop-blur flex items-center justify-center text-lg md:text-xl border border-amber-300">
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
