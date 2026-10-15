<script lang="ts">
  import { t } from '$lib/i18n';
  import { presentation } from '$lib/stores/presentation.svelte';
  import {
    PRESENTATION_BACKGROUNDS,
    type BackgroundItem,
    type BackgroundCategory,
    isImageBackground,
  } from '$lib/data/backgrounds';

  interface Props {
    selectedBg: string;
    bgDimmer: number;
    songTitle?: string;
  }

  let { selectedBg = $bindable(''), bgDimmer = $bindable(25), songTitle = '' }: Props = $props();

  let selectedBgCategory = $state<BackgroundCategory | 'all'>('all');

  // Master switch: song-specific background vs inheriting global presentation profile
  let useCustomBackground = $state<boolean>(Boolean(selectedBg));

  // Watch for external changes to selectedBg (e.g. when opening a new song)
  $effect(() => {
    useCustomBackground = Boolean(selectedBg);
  });

  // Combine standard presets with user's custom imported backgrounds
  const allBackgrounds = $derived.by<BackgroundItem[]>(() => {
    return [...presentation.customBackgrounds, ...PRESENTATION_BACKGROUNDS];
  });

  const filteredBackgrounds = $derived.by<BackgroundItem[]>(() => {
    if (selectedBgCategory === 'all') return allBackgrounds;
    if (selectedBgCategory === 'custom') return presentation.customBackgrounds;
    return PRESENTATION_BACKGROUNDS.filter((b) => b.category === selectedBgCategory);
  });

  function handleSelectBackground(bg: BackgroundItem) {
    useCustomBackground = true;
    selectedBg = bg.value;
  }

  let isImageMissing = $state<boolean>(false);

  $effect(() => {
    if (selectedBg && isImageBackground(selectedBg)) {
      if (typeof Image !== 'undefined' && !selectedBg.startsWith('data:') && !selectedBg.startsWith('blob:')) {
        const testImg = new Image();
        testImg.onload = () => {
          isImageMissing = false;
        };
        testImg.onerror = () => {
          isImageMissing = true;
        };
        testImg.src = selectedBg;
      } else {
        isImageMissing = false;
      }
    } else {
      isImageMissing = false;
    }
  });

  function handleToggleCustom(enabled: boolean) {
    useCustomBackground = enabled;
    if (!enabled) {
      selectedBg = '';
    } else if (!selectedBg) {
      // Default to classical navy if none selected yet
      selectedBg = '#0f172a';
    }
  }

  function handleClearBackground() {
    selectedBg = '';
    useCustomBackground = false;
  }

  function handleSetDimmerPreset(val: number) {
    bgDimmer = val;
  }

  function handleDeleteCustomBackground(e: MouseEvent, bgId: string, bgValue: string) {
    e.stopPropagation();
    presentation.removeCustomBackground(bgId);
    if (selectedBg === bgValue) {
      selectedBg = '';
      useCustomBackground = false;
    }
  }
</script>

<div
  class="flex-1 flex flex-col gap-4 rounded-lg border p-5 overflow-y-auto {presentation.theme === 'dark'
    ? 'bg-neutral-950 border-neutral-700'
    : 'bg-white border-neutral-300'}"
>
  <!-- 1. Header & Master Toggle (Song-specific override) -->
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3.5">
    <div>
      <div class="font-bold text-base flex items-center gap-2">
        <span>🖼️ {t('editor.bgTitle')}</span>
      </div>
      <p class="text-xs opacity-75 mt-0.5">{t('editor.bgDesc')}</p>
    </div>

    <div class="flex items-center gap-2">
      <!-- Master Opt-In Checkbox -->
      <label
        class="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg border cursor-pointer transition select-none {useCustomBackground
          ? 'bg-blue-600/10 border-blue-500/40 text-blue-500 dark:text-blue-400 font-bold'
          : 'bg-neutral-100 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400'}"
      >
        <input
          type="checkbox"
          checked={useCustomBackground}
          onchange={(e) => handleToggleCustom((e.target as HTMLInputElement).checked)}
          class="accent-blue-600 rounded"
        />
        <span>{t('editor.bgUseOwnProfile')}</span>
      </label>

      {#if selectedBg}
        <button
          type="button"
          class="px-3 py-1.5 rounded-lg border text-xs font-bold hover:bg-red-500/10 text-red-500 border-red-500/30 transition cursor-pointer"
          onclick={handleClearBackground}
          title={t('editor.bgNone')}
        >
          ✕ {t('editor.bgNone')}
        </button>
      {/if}
    </div>
  </div>

  {#if !useCustomBackground}
    <!-- Inherit Global Profile Notice Banner -->
    <div class="p-4 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-900/40 text-center space-y-2">
      <div class="text-2xl">✨</div>
      <div class="text-xs font-bold text-neutral-700 dark:text-neutral-300">
        {t('editor.bgUseOwnProfileHint')}
      </div>
      <p class="text-[11px] text-neutral-500 max-w-md mx-auto">
        Klicke oben auf "{t('editor.bgUseOwnProfile')}" oder wähle unten eine Vorlage aus, um diesem Lied ein eigenes Hintergrundbild zuzuweisen.
      </p>
    </div>
  {/if}

  <!-- 2. Category Filter Bar & Import Action Buttons -->
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
    <!-- Category Tabs -->
    <div class="flex items-center gap-1.5 flex-wrap">
      <button
        type="button"
        class="px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer {selectedBgCategory === 'all'
          ? 'bg-blue-600 text-white'
          : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-700'}"
        onclick={() => (selectedBgCategory = 'all')}
      >
        {t('editor.bgCategoryAll')} ({allBackgrounds.length})
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

      <button
        type="button"
        class="px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer {selectedBgCategory === 'custom'
          ? 'bg-blue-600 text-white'
          : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-700'}"
        onclick={() => (selectedBgCategory = 'custom')}
      >
        🖼️ {t('editor.bgCategoryCustom')} ({presentation.customBackgrounds.length})
      </button>
    </div>

    <!-- Import Button -->
    <div class="flex items-center gap-2 shrink-0">
      <button
        type="button"
        class="px-3.5 py-1.5 rounded-lg text-xs font-bold transition border cursor-pointer bg-blue-600 hover:bg-blue-500 text-white shadow-xs flex items-center gap-1.5"
        onclick={() => presentation.importCustomBackgroundFiles()}
      >
        <span>📁</span>
        <span>{t('editor.bgImportBtn')}</span>
      </button>
    </div>
  </div>

  <!-- 3. 16:9 Live Stage Preview & Dimmer Controls -->
  {#if selectedBg}
    <div class="flex flex-col sm:flex-row items-center gap-4 p-3.5 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 shadow-xs">
      <!-- 16:9 Stage Preview -->
      <div class="flex flex-col items-center">
        <div
          class="w-60 shrink-0 rounded-lg border border-neutral-700 shadow-md overflow-hidden relative flex flex-col items-center justify-center text-center p-2.5 bg-neutral-950"
          style="{isImageBackground(selectedBg)
            ? `background-image: url('${selectedBg}'); background-size: cover; background-position: center;`
            : `background: ${selectedBg};`}; aspect-ratio: 16/9; min-height: 90px;"
        >
          <!-- Real-time Dimmer Overlay -->
          <div class="absolute inset-0 bg-black pointer-events-none" style="opacity: {bgDimmer / 100};"></div>

          <div class="relative z-10 text-white font-bold text-xs leading-snug drop-shadow-[0_2px_4px_rgba(0,0,0,1)] px-1">
            <p class="m-0 truncate max-w-[210px]">{songTitle || 'Großer Gott, wir loben dich'}</p>
            <p class="m-0 text-[10px] font-normal opacity-90 truncate max-w-[210px]">Herr, wir preisen deine Stärke.</p>
          </div>
          <span class="absolute bottom-1 right-1 z-10 text-[8px] uppercase tracking-wider font-extrabold text-white/80 bg-black/60 px-1 py-0.5 rounded">16:9 Beamer</span>
        </div>

        {#if isImageMissing}
          <div class="w-60 mt-1.5 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-500 text-[10px] leading-tight flex items-center gap-1.5">
            <span class="shrink-0">⚠️</span>
            <span class="truncate" title={selectedBg}>
              {t('editor.bgImageNotFound')} {selectedBg}
            </span>
          </div>
        {/if}
      </div>

      <!-- Dimmer controls -->
      <div class="flex-1 flex flex-col gap-2 w-full">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-neutral-800 dark:text-neutral-200">
            {t('editor.bgDimmerLabel')}:
          </span>
          <span class="text-xs font-mono font-extrabold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
            {t('editor.bgDimmerPct', { pct: bgDimmer })}
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

        <!-- Dimmer Quick Preset Buttons -->
        <div class="grid grid-cols-4 gap-1.5 text-[10px] font-semibold">
          <button
            type="button"
            class="py-1 rounded border transition cursor-pointer {bgDimmer === 0
              ? 'bg-blue-600 text-white border-blue-600 font-bold'
              : 'border-neutral-300 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-800'}"
            onclick={() => handleSetDimmerPreset(0)}
          >
            {t('editor.bgQuickHell')}
          </button>
          <button
            type="button"
            class="py-1 rounded border transition cursor-pointer {bgDimmer === 25
              ? 'bg-blue-600 text-white border-blue-600 font-bold'
              : 'border-neutral-300 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-800'}"
            onclick={() => handleSetDimmerPreset(25)}
          >
            {t('editor.bgQuickStandard')}
          </button>
          <button
            type="button"
            class="py-1 rounded border transition cursor-pointer {bgDimmer === 50
              ? 'bg-blue-600 text-white border-blue-600 font-bold'
              : 'border-neutral-300 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-800'}"
            onclick={() => handleSetDimmerPreset(50)}
          >
            {t('editor.bgQuickContrast')}
          </button>
          <button
            type="button"
            class="py-1 rounded border transition cursor-pointer {bgDimmer === 80
              ? 'bg-blue-600 text-white border-blue-600 font-bold'
              : 'border-neutral-300 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-800'}"
            onclick={() => handleSetDimmerPreset(80)}
          >
            {t('editor.bgQuickDark')}
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- 4. Backgrounds Gallery Section -->
  <div class="flex items-center justify-between pt-1">
    <span class="text-xs font-bold text-neutral-700 dark:text-neutral-300">
      {t('editor.bgPresetsLabel', { count: filteredBackgrounds.length })}
    </span>
    <span class="text-[11px] text-neutral-400">
      {t('editor.bgPresetsDesc')}
    </span>
  </div>

  <!-- Empty state for custom category if none imported yet -->
  {#if selectedBgCategory === 'custom' && filteredBackgrounds.length === 0}
    <div class="p-8 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 text-center space-y-3 bg-neutral-50/50 dark:bg-neutral-900/30">
      <div class="text-3xl">🖼️</div>
      <p class="text-xs text-neutral-500 max-w-sm mx-auto">
        {t('editor.bgNoCustomHint')}
      </p>
      <button
        type="button"
        class="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition cursor-pointer shadow-xs"
        onclick={() => presentation.importCustomBackgroundFiles()}
      >
        {t('editor.bgImportBtn')}
      </button>
    </div>
  {:else}
    <!-- Backgrounds Gallery Grid -->
    <div
      class="max-h-[360px] overflow-y-auto p-2 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-neutral-50/50 dark:bg-neutral-900/50"
      style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px;"
    >
      {#each filteredBackgrounds as bg (bg.id)}
        {@const isSelected = selectedBg === bg.value}
        <div
          role="button"
          tabindex="0"
          class="group flex flex-col rounded-xl border-2 transition-all overflow-hidden text-left cursor-pointer hover:scale-[1.02] select-none shadow-xs relative {isSelected
            ? 'border-blue-600 ring-2 ring-blue-500/40 shadow-md'
            : 'border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500'}"
          style="min-height: 115px;"
          onclick={() => handleSelectBackground(bg)}
          onkeydown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleSelectBackground(bg);
            }
          }}
        >
          <!-- 16:9 Thumbnail -->
          <div
            class="w-full relative flex items-center justify-center p-2 overflow-hidden bg-cover bg-center shrink-0"
            style="{bg.previewStyle}; aspect-ratio: 16/9; min-height: 80px;"
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

            <!-- Delete button for custom imported backgrounds -->
            {#if bg.isCustom || bg.category === 'custom'}
              <button
                type="button"
                title={t('editor.bgDeleteCustomTooltip')}
                class="absolute top-1.5 left-1.5 z-20 w-5 h-5 rounded-full bg-red-600/90 hover:bg-red-600 text-white flex items-center justify-center text-[10px] font-bold shadow opacity-80 hover:opacity-100 transition cursor-pointer"
                onclick={(e) => handleDeleteCustomBackground(e, bg.id, bg.value)}
              >
                ✕
              </button>
            {/if}
          </div>

          <!-- Card Label -->
          <div class="h-8 px-2 bg-white dark:bg-neutral-800 border-t border-neutral-200 dark:border-neutral-700 flex items-center justify-between shrink-0">
            <span class="text-[11px] font-semibold truncate text-neutral-800 dark:text-neutral-200" title={bg.nameKey && t(bg.nameKey) !== bg.nameKey ? t(bg.nameKey) : bg.defaultName}>
              {bg.nameKey && t(bg.nameKey) !== bg.nameKey ? t(bg.nameKey) : bg.defaultName}
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
  {/if}
</div>
