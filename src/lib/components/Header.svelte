<script lang="ts">
  import { t } from '$lib/i18n';
  import { presentation } from '$lib/stores/presentation.svelte';
  import LanguageSwitcher from './LanguageSwitcher.svelte';
  import type { DisplayMode } from '$lib/types/models';

  interface Props {
    onLoadSample: () => void;
  }

  const { onLoadSample }: Props = $props();

  function setMode(mode: DisplayMode) {
    presentation.setDisplayMode(mode);
  }
</script>

<header class="h-14 border-b border-neutral-800 bg-neutral-900/90 px-4 flex items-center justify-between select-none">
  <!-- Brand & Status -->
  <div class="flex items-center space-x-3">
    <div class="flex items-center space-x-2">
      <div class="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center font-black text-neutral-950 text-base shadow">
        N
      </div>
      <div>
        <h1 class="text-sm font-bold tracking-tight text-neutral-100 flex items-center gap-2">
          {t('app.title')}
          <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-neutral-800 text-neutral-400 border border-neutral-700">v0.1</span>
        </h1>
        <p class="text-[11px] text-neutral-400 leading-none">{t('app.subtitle')}</p>
      </div>
    </div>

    <!-- Live indicator badge -->
    <div class="ml-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold {presentation.displayMode === 'normal' ? 'bg-red-500/10 text-red-400 border border-red-500/30' : 'bg-neutral-800 text-neutral-400 border border-neutral-700'}">
      <span class="w-2 h-2 rounded-full {presentation.displayMode === 'normal' ? 'bg-red-500 animate-pulse' : 'bg-neutral-500'}"></span>
      {presentation.displayMode === 'normal' ? t('status.live') : t('status.offline')}
    </div>
  </div>

  <!-- Live Output Controls (Blanking & Display Modes) -->
  <div class="flex items-center space-x-1.5">
    <button
      type="button"
      class="px-2.5 py-1.5 rounded text-xs font-medium transition {presentation.displayMode === 'normal' ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 shadow-sm' : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700'}"
      onclick={() => setMode('normal')}
    >
      {t('toolbar.normal')}
    </button>
    <button
      type="button"
      class="px-2.5 py-1.5 rounded text-xs font-medium transition {presentation.displayMode === 'black' ? 'bg-neutral-950 text-white border border-neutral-600 shadow-inner' : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700'}"
      onclick={() => setMode('black')}
    >
      {t('toolbar.black')}
    </button>
    <button
      type="button"
      class="px-2.5 py-1.5 rounded text-xs font-medium transition {presentation.displayMode === 'clear_text' ? 'bg-sky-950 text-sky-300 border border-sky-600 shadow-inner' : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700'}"
      onclick={() => setMode('clear_text')}
    >
      {t('toolbar.clear')}
    </button>
    <button
      type="button"
      class="px-2.5 py-1.5 rounded text-xs font-medium transition {presentation.displayMode === 'logo' ? 'bg-amber-950 text-amber-300 border border-amber-600 shadow-inner' : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700'}"
      onclick={() => setMode('logo')}
    >
      {t('toolbar.logo')}
    </button>
    <button
      type="button"
      class="px-2.5 py-1.5 rounded text-xs font-medium transition {presentation.displayMode === 'frozen' ? 'bg-blue-950 text-blue-300 border border-blue-600 shadow-inner' : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700'}"
      onclick={() => setMode('frozen')}
    >
      {t('toolbar.freeze')}
    </button>
  </div>

  <!-- Auxiliary, Beamer & Language Controls -->
  <div class="flex items-center space-x-2">
    <!-- Beamer Output Toggle Button (Phase 2 Dual-Window) -->
    <button
      type="button"
      class="px-2.5 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition shadow-sm {presentation.isBeamerActive ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/50' : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700'}"
      onclick={() => presentation.toggleBeamer()}
      title={presentation.isBeamerActive ? t('toolbar.closeBeamer') : t('toolbar.openBeamer')}
    >
      <span class="w-2 h-2 rounded-full {presentation.isBeamerActive ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-500'}"></span>
      <span>📽️ {presentation.isBeamerActive ? t('toolbar.beamerActive') : t('toolbar.openBeamer')}</span>
      {#if presentation.activeDisplay}
        <span class="text-[10px] text-emerald-400/80 font-normal">({presentation.activeDisplay.name})</span>
      {/if}
    </button>

    <button
      type="button"
      class="px-2.5 py-1.5 rounded text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition"
      onclick={() => presentation.toggleChords()}
    >
      {presentation.showChords ? `✓ ${t('toolbar.toggleChords')}` : t('toolbar.toggleChords')}
    </button>

    <button
      type="button"
      class="px-3 py-1.5 rounded text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-neutral-950 transition shadow"
      onclick={onLoadSample}
    >
      {t('toolbar.loadSample')}
    </button>

    <LanguageSwitcher />
  </div>
</header>
