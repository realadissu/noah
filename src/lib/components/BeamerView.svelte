<script lang="ts">
  import { onMount } from 'svelte';
  import type { DisplayMode, Song, Slide, BeamerEvent, BeamerStateResponse, AspectRatio } from '$lib/types';
  import { getAudienceLines, calculateSlideFontSize } from '$lib/utils/slideTypography';
  import { DEFAULT_SONG } from '$lib/stores/presentation.svelte';

  // State managed inside the Beamer webview process
  let activeSong = $state<Song | null>(null);
  let displayMode = $state<DisplayMode>('normal');
  let aspectRatio = $state<AspectRatio>('16:9');
  let isFrozen = $state<boolean>(false);
  let alertMessage = $state<{ text: string; expiry: number } | null>(null);

  // Double buffering: layer A and layer B for zero-flicker GPU crossfades
  let currentLayer = $state<'A' | 'B'>('A');
  let slideA = $state<Slide | null>(null);
  let slideB = $state<Slide | null>(null);

  const beamerBg = $derived.by<string>(() => {
    const tags = activeSong?.metadata?.custom_tags;
    return tags?.['backgroundimage'] ?? tags?.['format.background'] ?? tags?.['background'] ?? '';
  });

  const beamerDimmer = $derived.by<number>(() => {
    const val = activeSong?.metadata?.custom_tags?.['backgrounddimmer'];
    return (val ? parseInt(val, 10) : 25) / 100;
  });

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
              slideA = slide;
              currentLayer = 'A';
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
        if (event.aspectRatio) {
          aspectRatio = event.aspectRatio;
        }
        const targetSlide = event.song.slides[event.slideIndex] ?? null;
        updateSlideWithTransition(targetSlide);
        break;
      }
      case 'SET_ASPECT_RATIO': {
        aspectRatio = event.aspectRatio;
        break;
      }
      case 'CHANGE_SLIDE': {
        displayMode = 'normal';
        isFrozen = false;
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
    let channel: BroadcastChannel | null = null;

    // 1. Cross-window BroadcastChannel for browser tabs / windows parity
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        channel = new BroadcastChannel('noah-beamer-channel');
        channel.onmessage = (e) => {
          if (e.data && e.data.type) {
            handleBeamerEvent(e.data as BeamerEvent);
          }
        };
        // Request immediate sync from control window
        channel.postMessage({ type: 'REQUEST_SYNC' });
      } catch (err) {
        console.warn('BroadcastChannel error:', err);
      }
    }

    // 2. LocalStorage storage event fallback for cross-window communication in browsers
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'noah_beamer_sync' && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          if (data && data.type) {
            handleBeamerEvent(data as BeamerEvent);
          }
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);

    // 3. Initial state restore from localStorage snapshot
    if (typeof localStorage !== 'undefined') {
      try {
        const snapRaw = localStorage.getItem('noah_beamer_snapshot');
        if (snapRaw) {
          const snap = JSON.parse(snapRaw);
          if (snap.song) {
            activeSong = snap.song;
            displayMode = snap.displayMode || 'normal';
            if (snap.aspectRatio) {
              aspectRatio = snap.aspectRatio;
            }
            const slide = snap.song.slides[snap.slideIndex ?? 0] ?? null;
            if (slide) {
              slideA = slide;
              currentLayer = 'A';
            }
          }
        }
      } catch {}
    }

    // Safe visual default if standalone or uninitialized
    if (!activeSong && DEFAULT_SONG) {
      activeSong = DEFAULT_SONG;
      slideA = DEFAULT_SONG.slides[0] ?? null;
      currentLayer = 'A';
    }

    // 4. Tauri IPC initialization
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
      if (channel) channel.close();
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleFocus);
    };
  });
</script>

<!-- Audience Display Canvas (Zero-border, GPU-accelerated) -->
<div class="h-screen w-screen bg-black text-white relative overflow-hidden select-none font-sans flex items-center justify-center" style="container-type: size;">
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

  <!-- Optional Song Background & Dimmer for Beamer Output -->
  {#if beamerBg && displayMode === 'normal'}
    {#if beamerBg.startsWith('/') || beamerBg.endsWith('.jpg') || beamerBg.endsWith('.png') || beamerBg.endsWith('.webp')}
      <div
        class="absolute inset-0 bg-cover bg-center pointer-events-none z-0 transition-opacity duration-300"
        style="background-image: url('{beamerBg}');"
      ></div>
    {:else}
      <div
        class="absolute inset-0 pointer-events-none z-0 transition-opacity duration-300"
        style="background: {beamerBg};"
      ></div>
    {/if}
    <div class="absolute inset-0 bg-black pointer-events-none z-0" style="opacity: {beamerDimmer};"></div>
  {/if}

  <!-- Double-Buffered Slide Layers with Shared Dynamic Auto-Font Sizing -->
  <!-- Layer A -->
  <div
    class="absolute inset-0 flex flex-col items-center justify-center text-center transition-opacity duration-300 pointer-events-none"
    style="opacity: {currentLayer === 'A' && displayMode === 'normal' ? '1' : '0'}; z-index: {currentLayer === 'A' ? '10' : '5'}; padding: 5cqh 6cqw;"
  >
    {#if slideA}
      <div
        class="w-full text-center font-bold"
        style="font-size: {calculateSlideFontSize(slideA, false, aspectRatio)}; line-height: 1.35;"
      >
        {#each getAudienceLines(slideA) as line}
          <p class="whitespace-nowrap overflow-visible m-0 p-0 text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.98)] drop-shadow-[0_2px_6px_rgba(0,0,0,1)]" style="line-height: inherit;">
            {line}
          </p>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Layer B -->
  <div
    class="absolute inset-0 flex flex-col items-center justify-center text-center transition-opacity duration-300 pointer-events-none"
    style="opacity: {currentLayer === 'B' && displayMode === 'normal' ? '1' : '0'}; z-index: {currentLayer === 'B' ? '10' : '5'}; padding: 5cqh 6cqw;"
  >
    {#if slideB}
      <div
        class="w-full text-center font-bold"
        style="font-size: {calculateSlideFontSize(slideB, false, aspectRatio)}; line-height: 1.35;"
      >
        {#each getAudienceLines(slideB) as line}
          <p class="whitespace-nowrap overflow-visible m-0 p-0 text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.98)] drop-shadow-[0_2px_6px_rgba(0,0,0,1)]" style="line-height: inherit;">
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
