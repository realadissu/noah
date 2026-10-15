<script lang="ts">
  import { onMount } from 'svelte';
  import { t } from '$lib/i18n';
  import { presentation } from '$lib/stores/presentation.svelte';
  import type { SongFormatOptions, TextStyleFormat, TextAlignment } from '$lib/types/format';
  import { DEFAULT_FORMAT_OPTIONS, DEFAULT_PRESENTATION_COLORS } from '$lib/types/format';

  interface Props {
    formatOptions: SongFormatOptions;
    langCount?: number;
    onResetColors?: () => void;
  }

  let { formatOptions = $bindable(), langCount = 1, onResetColors }: Props = $props();

  // Curated Favorite fonts
  const FAVORITE_FONTS = [
    'Arial',
    'Segoe UI',
    'Calibri',
    'Inter',
    'Roboto',
    'Montserrat',
    'Georgia',
    'Times New Roman',
    'Open Sans',
  ];

  // Standard Windows/Cross-platform system fonts
  const SYSTEM_FONTS = [
    'Aptos',
    'Bahnschrift',
    'Candara',
    'Comic Sans MS',
    'Consolas',
    'Constantia',
    'Corbel',
    'Courier New',
    'Franklin Gothic Medium',
    'Gabriola',
    'Garamond',
    'Impact',
    'Lucida Console',
    'Lucida Sans Unicode',
    'Palatino Linotype',
    'Sitka',
    'Sylfaen',
    'Tahoma',
    'Trebuchet MS',
    'Verdana',
  ];

  let localFonts = $state<string[]>([]);

  onMount(async () => {
    // If browser supports Window.queryLocalFonts, query all available system fonts
    try {
      if ('queryLocalFonts' in window && typeof window.queryLocalFonts === 'function') {
        const fonts = await (
          window as unknown as { queryLocalFonts: () => Promise<Array<{ family: string }>> }
        ).queryLocalFonts();
        const names = Array.from(new Set(fonts.map((f) => f.family))).sort();
        // Filter out fonts already in favorites or system list
        localFonts = names.filter(
          (name) => !FAVORITE_FONTS.includes(name) && !SYSTEM_FONTS.includes(name)
        );
      }
    } catch {
      // Graceful degradation when permissions not granted or running headless
      localFonts = [];
    }
  });

  function resetAllToDefaults() {
    formatOptions.titleFormat = { ...DEFAULT_FORMAT_OPTIONS.titleFormat };
    formatOptions.lang1Format = { ...DEFAULT_FORMAT_OPTIONS.lang1Format };
    formatOptions.lang2Format = { ...DEFAULT_FORMAT_OPTIONS.lang2Format };
    formatOptions.lang3Format = { ...DEFAULT_FORMAT_OPTIONS.lang3Format };
    formatOptions.lang4Format = { ...DEFAULT_FORMAT_OPTIONS.lang4Format };
    formatOptions.chordColor = '';
    formatOptions.copyrightColor = '';
    formatOptions.outline = true;
    formatOptions.outlineColor = '#000000';
    formatOptions.shadow = true;
    formatOptions.shadowColor = '#000000';
    formatOptions.fontFamily = '';
    formatOptions.fontFamilyLang2 = '';
    formatOptions.fontSize = 0;
    if (onResetColors) onResetColors();
  }

  function toggleAlign(fmt: TextStyleFormat, align: TextAlignment) {
    if (fmt.align === align) {
      fmt.align = 'center';
    } else {
      fmt.align = align;
    }
  }

  function resetColor(fmt: TextStyleFormat) {
    fmt.color = '';
  }
</script>

<div class="flex-1 flex flex-col gap-3.5 overflow-y-auto select-none p-1">
  <!-- Master Checkbox: Song-spezifische Anpassungen aktivieren (Opt-In) -->
  <div
    class="p-3.5 rounded-xl border flex items-center justify-between transition-colors shadow-2xs {formatOptions.useOwnBackgroundProfile
      ? presentation.theme === 'dark'
        ? 'bg-blue-950/30 border-blue-600/50'
        : 'bg-blue-50/70 border-blue-300'
      : presentation.theme === 'dark'
        ? 'bg-neutral-900/60 border-neutral-700'
        : 'bg-neutral-100 border-neutral-300'}"
  >
    <div class="flex items-center gap-3">
      <input
        type="checkbox"
        id="master-use-own-profile"
        bind:checked={formatOptions.useOwnBackgroundProfile}
        class="w-5 h-5 rounded accent-blue-600 cursor-pointer"
      />
      <div>
        <label
          for="master-use-own-profile"
          class="font-bold text-sm cursor-pointer block {formatOptions.useOwnBackgroundProfile
            ? 'text-blue-600 dark:text-amber-400'
            : 'text-neutral-700 dark:text-neutral-200'}"
        >
          {t('editor.format.useOwnProfile')}
        </label>
        <p class="text-xs text-neutral-500 dark:text-neutral-400">
          {t('editor.format.useOwnProfileHint')}
        </p>
      </div>
    </div>

    {#if formatOptions.useOwnBackgroundProfile}
      <button
        type="button"
        onclick={resetAllToDefaults}
        class="text-xs px-2.5 py-1 rounded border font-semibold hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer text-neutral-600 dark:text-neutral-300 shrink-0"
        title={t('editor.format.resetColors')}
      >
        ↺ {t('editor.format.resetColors')}
      </button>
    {/if}
  </div>

  <!-- Settings Area (Dimmed and disabled when custom formatting is off) -->
  <div
    class="flex flex-col gap-3.5 transition-opacity duration-200 {formatOptions.useOwnBackgroundProfile
      ? 'opacity-100'
      : 'opacity-40 pointer-events-none'}"
  >
    <!-- 1. GroupBox: Schriftart und -größe -->
    <fieldset
      class="rounded-lg border p-4 flex flex-col gap-3.5 {presentation.theme === 'dark'
        ? 'bg-neutral-900/60 border-neutral-700'
        : 'bg-white border-neutral-400'}"
    >
      <legend class="px-2 font-bold text-xs uppercase tracking-wider text-blue-600 dark:text-amber-400">
        {t('editor.format.fontGroupTitle')}
      </legend>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <!-- Sprache 1 Schriftart -->
        <div class="flex flex-col gap-1.5">
          <label for="font-family-lang1" class="font-semibold text-xs text-neutral-700 dark:text-neutral-300">
            {t('editor.format.fontLang1Label')}
          </label>
          <select
            id="font-family-lang1"
            bind:value={formatOptions.fontFamily}
            class="px-3 py-1.5 rounded border text-sm focus:outline-none {presentation.theme === 'dark'
              ? 'bg-neutral-950 border-neutral-700 text-white focus:border-amber-500'
              : 'bg-white border-neutral-400 text-neutral-900 focus:border-blue-600'}"
          >
            <option value="">{t('editor.format.defaultFontOption')} (Global Standard)</option>
            <optgroup label={t('editor.format.favoritesFontsGroup')}>
              {#each FAVORITE_FONTS as f}
                <option value={f} style="font-family: '{f}';">{f}</option>
              {/each}
            </optgroup>
            <optgroup label={t('editor.format.systemFontsGroup')}>
              {#each SYSTEM_FONTS as f}
                <option value={f} style="font-family: '{f}';">{f}</option>
              {/each}
            </optgroup>
            {#if localFonts.length > 0}
              <optgroup label="System">
                {#each localFonts as f}
                  <option value={f}>{f}</option>
                {/each}
              </optgroup>
            {/if}
          </select>
        </div>

        <!-- Sprache 2-4 Schriftart -->
        <div class="flex flex-col gap-1.5">
          <label for="font-family-lang2" class="font-semibold text-xs text-neutral-700 dark:text-neutral-300">
            {t('editor.format.fontLang2Label')}
          </label>
          <select
            id="font-family-lang2"
            bind:value={formatOptions.fontFamilyLang2}
            class="px-3 py-1.5 rounded border text-sm focus:outline-none {presentation.theme === 'dark'
              ? 'bg-neutral-950 border-neutral-700 text-white focus:border-amber-500'
              : 'bg-white border-neutral-400 text-neutral-900 focus:border-blue-600'}"
          >
            <option value="">{t('editor.format.likeLang1FontOption')}</option>
            <optgroup label={t('editor.format.favoritesFontsGroup')}>
              {#each FAVORITE_FONTS as f}
                <option value={f} style="font-family: '{f}';">{f}</option>
              {/each}
            </optgroup>
            <optgroup label={t('editor.format.systemFontsGroup')}>
              {#each SYSTEM_FONTS as f}
                <option value={f} style="font-family: '{f}';">{f}</option>
              {/each}
            </optgroup>
            {#if localFonts.length > 0}
              <optgroup label="System">
                {#each localFonts as f}
                  <option value={f}>{f}</option>
                {/each}
              </optgroup>
            {/if}
          </select>
        </div>
      </div>

      <!-- Schriftgröße & Hinweistext -->
      <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-1 border-t border-neutral-200 dark:border-neutral-800">
        <div class="flex items-center gap-2">
          <label for="font-size-spin" class="font-semibold text-xs text-neutral-700 dark:text-neutral-300 shrink-0">
            {t('editor.format.fontSizeLabel')}
          </label>
          <input
            id="font-size-spin"
            type="number"
            min="0"
            max="120"
            bind:value={formatOptions.fontSize}
            class="w-20 px-2.5 py-1 rounded border text-sm font-mono text-center focus:outline-none {presentation.theme === 'dark'
              ? 'bg-neutral-950 border-neutral-700 text-white focus:border-amber-500'
              : 'bg-white border-neutral-400 text-neutral-900 focus:border-blue-600'}"
          />
          <span class="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
            {t('editor.format.fontSizeAutoHint')}
          </span>
        </div>

        <div class="text-[11px] text-neutral-500 dark:text-neutral-400 leading-tight italic flex-1 sm:text-right">
          {t('editor.format.fontSizeRecommendation')}
        </div>
      </div>
    </fieldset>

    <!-- 2. GroupBox: Formatierung (Colors, Typography & Alignment) -->
    <fieldset
      class="rounded-lg border p-4 flex flex-col gap-3 {presentation.theme === 'dark'
        ? 'bg-neutral-900/60 border-neutral-700'
        : 'bg-white border-neutral-400'}"
    >
      <legend class="px-2 font-bold text-xs uppercase tracking-wider text-blue-600 dark:text-amber-400">
        {t('editor.format.stylesGroupTitle')}
      </legend>

      <!-- Matrix matching all 4 languages, title, chords, copyright, outline, shadow -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs">
        <!-- 1. Titel -->
        <div class="flex items-center justify-between gap-2 py-1 border-b border-neutral-200 dark:border-neutral-800">
          <span class="font-bold text-neutral-800 dark:text-neutral-200 w-28 truncate">{t('editor.format.elemTitle')}</span>
          <div class="flex items-center gap-1.5">
            <!-- Color Picker with Standard Indicator -->
            <div class="flex items-center gap-1">
              <label
                class="relative w-7 h-7 rounded border border-neutral-400 dark:border-neutral-600 cursor-pointer shadow-2xs overflow-hidden shrink-0 flex items-center justify-center {formatOptions.titleFormat.color ? '' : 'bg-neutral-200 dark:bg-neutral-800'}"
                style={formatOptions.titleFormat.color ? `background-color: ${formatOptions.titleFormat.color};` : ''}
                title={formatOptions.titleFormat.color || t('editor.format.colorDefault')}
              >
                {#if !formatOptions.titleFormat.color}
                  <span class="text-[9px] font-bold text-neutral-500">STD</span>
                {/if}
                <input
                  type="color"
                  value={formatOptions.titleFormat.color || DEFAULT_PRESENTATION_COLORS.title}
                  oninput={(e) => (formatOptions.titleFormat.color = (e.target as HTMLInputElement).value)}
                  class="opacity-0 absolute inset-0 cursor-pointer w-full h-full"
                />
              </label>
              {#if formatOptions.titleFormat.color}
                <button
                  type="button"
                  onclick={() => resetColor(formatOptions.titleFormat)}
                  class="w-4 h-4 rounded text-[10px] text-neutral-400 hover:text-red-500 cursor-pointer"
                  title={t('editor.format.colorResetTooltip')}
                >✕</button>
              {/if}
            </div>
            <!-- B / I / U -->
            <button
              type="button"
              class="w-6 h-6 rounded border font-extrabold text-xs cursor-pointer {formatOptions.titleFormat.bold ? 'bg-blue-600 text-white border-blue-600' : 'bg-transparent border-neutral-300 dark:border-neutral-700'}"
              onclick={() => (formatOptions.titleFormat.bold = !formatOptions.titleFormat.bold)}
              title={t('editor.format.bold')}
            >B</button>
            <button
              type="button"
              class="w-6 h-6 rounded border italic font-serif text-xs cursor-pointer {formatOptions.titleFormat.italic ? 'bg-blue-600 text-white border-blue-600' : 'bg-transparent border-neutral-300 dark:border-neutral-700'}"
              onclick={() => (formatOptions.titleFormat.italic = !formatOptions.titleFormat.italic)}
              title={t('editor.format.italic')}
            >I</button>
            <button
              type="button"
              class="w-6 h-6 rounded border underline text-xs cursor-pointer {formatOptions.titleFormat.underline ? 'bg-blue-600 text-white border-blue-600' : 'bg-transparent border-neutral-300 dark:border-neutral-700'}"
              onclick={() => (formatOptions.titleFormat.underline = !formatOptions.titleFormat.underline)}
              title={t('editor.format.underline')}
            >U</button>
            <!-- Alignment -->
            <button
              type="button"
              class="w-6 h-6 rounded border text-[10px] cursor-pointer {formatOptions.titleFormat.align === 'left' ? 'bg-blue-600 text-white border-blue-600' : 'bg-transparent border-neutral-300 dark:border-neutral-700'}"
              onclick={() => toggleAlign(formatOptions.titleFormat, 'left')}
              title={t('editor.format.alignLeft')}
            >⇤</button>
            <button
              type="button"
              class="w-6 h-6 rounded border text-[10px] cursor-pointer {formatOptions.titleFormat.align === 'center' ? 'bg-blue-600 text-white border-blue-600' : 'bg-transparent border-neutral-300 dark:border-neutral-700'}"
              onclick={() => toggleAlign(formatOptions.titleFormat, 'center')}
              title={t('editor.format.alignCenter')}
            >≡</button>
            <button
              type="button"
              class="w-6 h-6 rounded border text-[10px] cursor-pointer {formatOptions.titleFormat.align === 'right' ? 'bg-blue-600 text-white border-blue-600' : 'bg-transparent border-neutral-300 dark:border-neutral-700'}"
              onclick={() => toggleAlign(formatOptions.titleFormat, 'right')}
              title={t('editor.format.alignRight')}
            >⇥</button>
          </div>
        </div>

        <!-- 2. Sprache 1 -->
        <div class="flex items-center justify-between gap-2 py-1 border-b border-neutral-200 dark:border-neutral-800">
          <span class="font-bold text-neutral-800 dark:text-neutral-200 w-28 truncate">{t('editor.format.elemLang1')}</span>
          <div class="flex items-center gap-1.5">
            <div class="flex items-center gap-1">
              <label
                class="relative w-7 h-7 rounded border border-neutral-400 dark:border-neutral-600 cursor-pointer shadow-2xs overflow-hidden shrink-0 flex items-center justify-center {formatOptions.lang1Format.color ? '' : 'bg-neutral-200 dark:bg-neutral-800'}"
                style={formatOptions.lang1Format.color ? `background-color: ${formatOptions.lang1Format.color};` : ''}
                title={formatOptions.lang1Format.color || t('editor.format.colorDefault')}
              >
                {#if !formatOptions.lang1Format.color}
                  <span class="text-[9px] font-bold text-neutral-500">STD</span>
                {/if}
                <input
                  type="color"
                  value={formatOptions.lang1Format.color || DEFAULT_PRESENTATION_COLORS.lang1}
                  oninput={(e) => (formatOptions.lang1Format.color = (e.target as HTMLInputElement).value)}
                  class="opacity-0 absolute inset-0 cursor-pointer w-full h-full"
                />
              </label>
              {#if formatOptions.lang1Format.color}
                <button
                  type="button"
                  onclick={() => resetColor(formatOptions.lang1Format)}
                  class="w-4 h-4 rounded text-[10px] text-neutral-400 hover:text-red-500 cursor-pointer"
                  title={t('editor.format.colorResetTooltip')}
                >✕</button>
              {/if}
            </div>
            <button
              type="button"
              class="w-6 h-6 rounded border font-extrabold text-xs cursor-pointer {formatOptions.lang1Format.bold ? 'bg-blue-600 text-white border-blue-600' : 'bg-transparent border-neutral-300 dark:border-neutral-700'}"
              onclick={() => (formatOptions.lang1Format.bold = !formatOptions.lang1Format.bold)}
              title={t('editor.format.bold')}
            >B</button>
            <button
              type="button"
              class="w-6 h-6 rounded border italic font-serif text-xs cursor-pointer {formatOptions.lang1Format.italic ? 'bg-blue-600 text-white border-blue-600' : 'bg-transparent border-neutral-300 dark:border-neutral-700'}"
              onclick={() => (formatOptions.lang1Format.italic = !formatOptions.lang1Format.italic)}
              title={t('editor.format.italic')}
            >I</button>
            <button
              type="button"
              class="w-6 h-6 rounded border underline text-xs cursor-pointer {formatOptions.lang1Format.underline ? 'bg-blue-600 text-white border-blue-600' : 'bg-transparent border-neutral-300 dark:border-neutral-700'}"
              onclick={() => (formatOptions.lang1Format.underline = !formatOptions.lang1Format.underline)}
              title={t('editor.format.underline')}
            >U</button>
            <button
              type="button"
              class="w-6 h-6 rounded border text-[10px] cursor-pointer {formatOptions.lang1Format.align === 'left' ? 'bg-blue-600 text-white border-blue-600' : 'bg-transparent border-neutral-300 dark:border-neutral-700'}"
              onclick={() => toggleAlign(formatOptions.lang1Format, 'left')}
              title={t('editor.format.alignLeft')}
            >⇤</button>
            <button
              type="button"
              class="w-6 h-6 rounded border text-[10px] cursor-pointer {formatOptions.lang1Format.align === 'center' ? 'bg-blue-600 text-white border-blue-600' : 'bg-transparent border-neutral-300 dark:border-neutral-700'}"
              onclick={() => toggleAlign(formatOptions.lang1Format, 'center')}
              title={t('editor.format.alignCenter')}
            >≡</button>
            <button
              type="button"
              class="w-6 h-6 rounded border text-[10px] cursor-pointer {formatOptions.lang1Format.align === 'right' ? 'bg-blue-600 text-white border-blue-600' : 'bg-transparent border-neutral-300 dark:border-neutral-700'}"
              onclick={() => toggleAlign(formatOptions.lang1Format, 'right')}
              title={t('editor.format.alignRight')}
            >⇥</button>
          </div>
        </div>

        <!-- 3. Sprache 2 -->
        <div class="flex items-center justify-between gap-2 py-1 border-b border-neutral-200 dark:border-neutral-800 {langCount < 2 ? 'opacity-50' : ''}">
          <span class="font-bold text-neutral-800 dark:text-neutral-200 w-28 truncate">{t('editor.format.elemLang2')}</span>
          <div class="flex items-center gap-1.5">
            <div class="flex items-center gap-1">
              <label
                class="relative w-7 h-7 rounded border border-neutral-400 dark:border-neutral-600 cursor-pointer shadow-2xs overflow-hidden shrink-0 flex items-center justify-center {formatOptions.lang2Format.color ? '' : 'bg-neutral-200 dark:bg-neutral-800'}"
                style={formatOptions.lang2Format.color ? `background-color: ${formatOptions.lang2Format.color};` : ''}
                title={formatOptions.lang2Format.color || t('editor.format.colorDefault')}
              >
                {#if !formatOptions.lang2Format.color}
                  <span class="text-[9px] font-bold text-neutral-500">STD</span>
                {/if}
                <input
                  type="color"
                  value={formatOptions.lang2Format.color || DEFAULT_PRESENTATION_COLORS.lang2}
                  oninput={(e) => (formatOptions.lang2Format.color = (e.target as HTMLInputElement).value)}
                  class="opacity-0 absolute inset-0 cursor-pointer w-full h-full"
                />
              </label>
              {#if formatOptions.lang2Format.color}
                <button
                  type="button"
                  onclick={() => resetColor(formatOptions.lang2Format)}
                  class="w-4 h-4 rounded text-[10px] text-neutral-400 hover:text-red-500 cursor-pointer"
                  title={t('editor.format.colorResetTooltip')}
                >✕</button>
              {/if}
            </div>
            <button
              type="button"
              class="w-6 h-6 rounded border font-extrabold text-xs cursor-pointer {formatOptions.lang2Format.bold ? 'bg-blue-600 text-white border-blue-600' : 'bg-transparent border-neutral-300 dark:border-neutral-700'}"
              onclick={() => (formatOptions.lang2Format.bold = !formatOptions.lang2Format.bold)}
              title={t('editor.format.bold')}
            >B</button>
            <button
              type="button"
              class="w-6 h-6 rounded border italic font-serif text-xs cursor-pointer {formatOptions.lang2Format.italic ? 'bg-blue-600 text-white border-blue-600' : 'bg-transparent border-neutral-300 dark:border-neutral-700'}"
              onclick={() => (formatOptions.lang2Format.italic = !formatOptions.lang2Format.italic)}
              title={t('editor.format.italic')}
            >I</button>
            <button
              type="button"
              class="w-6 h-6 rounded border underline text-xs cursor-pointer {formatOptions.lang2Format.underline ? 'bg-blue-600 text-white border-blue-600' : 'bg-transparent border-neutral-300 dark:border-neutral-700'}"
              onclick={() => (formatOptions.lang2Format.underline = !formatOptions.lang2Format.underline)}
              title={t('editor.format.underline')}
            >U</button>
            <button
              type="button"
              class="w-6 h-6 rounded border text-[10px] cursor-pointer {formatOptions.lang2Format.align === 'left' ? 'bg-blue-600 text-white border-blue-600' : 'bg-transparent border-neutral-300 dark:border-neutral-700'}"
              onclick={() => toggleAlign(formatOptions.lang2Format, 'left')}
              title={t('editor.format.alignLeft')}
            >⇤</button>
            <button
              type="button"
              class="w-6 h-6 rounded border text-[10px] cursor-pointer {formatOptions.lang2Format.align === 'center' ? 'bg-blue-600 text-white border-blue-600' : 'bg-transparent border-neutral-300 dark:border-neutral-700'}"
              onclick={() => toggleAlign(formatOptions.lang2Format, 'center')}
              title={t('editor.format.alignCenter')}
            >≡</button>
            <button
              type="button"
              class="w-6 h-6 rounded border text-[10px] cursor-pointer {formatOptions.lang2Format.align === 'right' ? 'bg-blue-600 text-white border-blue-600' : 'bg-transparent border-neutral-300 dark:border-neutral-700'}"
              onclick={() => toggleAlign(formatOptions.lang2Format, 'right')}
              title={t('editor.format.alignRight')}
            >⇥</button>
          </div>
        </div>

        <!-- 4. Sprache 3 -->
        <div class="flex items-center justify-between gap-2 py-1 border-b border-neutral-200 dark:border-neutral-800 {langCount < 3 ? 'opacity-50' : ''}">
          <span class="font-bold text-neutral-800 dark:text-neutral-200 w-28 truncate">{t('editor.format.elemLang3')}</span>
          <div class="flex items-center gap-1.5">
            <div class="flex items-center gap-1">
              <label
                class="relative w-7 h-7 rounded border border-neutral-400 dark:border-neutral-600 cursor-pointer shadow-2xs overflow-hidden shrink-0 flex items-center justify-center {formatOptions.lang3Format.color ? '' : 'bg-neutral-200 dark:bg-neutral-800'}"
                style={formatOptions.lang3Format.color ? `background-color: ${formatOptions.lang3Format.color};` : ''}
                title={formatOptions.lang3Format.color || t('editor.format.colorDefault')}
              >
                {#if !formatOptions.lang3Format.color}
                  <span class="text-[9px] font-bold text-neutral-500">STD</span>
                {/if}
                <input
                  type="color"
                  value={formatOptions.lang3Format.color || DEFAULT_PRESENTATION_COLORS.lang3}
                  oninput={(e) => (formatOptions.lang3Format.color = (e.target as HTMLInputElement).value)}
                  class="opacity-0 absolute inset-0 cursor-pointer w-full h-full"
                />
              </label>
              {#if formatOptions.lang3Format.color}
                <button
                  type="button"
                  onclick={() => resetColor(formatOptions.lang3Format)}
                  class="w-4 h-4 rounded text-[10px] text-neutral-400 hover:text-red-500 cursor-pointer"
                  title={t('editor.format.colorResetTooltip')}
                >✕</button>
              {/if}
            </div>
            <button
              type="button"
              class="w-6 h-6 rounded border font-extrabold text-xs cursor-pointer {formatOptions.lang3Format.bold ? 'bg-blue-600 text-white border-blue-600' : 'bg-transparent border-neutral-300 dark:border-neutral-700'}"
              onclick={() => (formatOptions.lang3Format.bold = !formatOptions.lang3Format.bold)}
              title={t('editor.format.bold')}
            >B</button>
            <button
              type="button"
              class="w-6 h-6 rounded border italic font-serif text-xs cursor-pointer {formatOptions.lang3Format.italic ? 'bg-blue-600 text-white border-blue-600' : 'bg-transparent border-neutral-300 dark:border-neutral-700'}"
              onclick={() => (formatOptions.lang3Format.italic = !formatOptions.lang3Format.italic)}
              title={t('editor.format.italic')}
            >I</button>
            <button
              type="button"
              class="w-6 h-6 rounded border underline text-xs cursor-pointer {formatOptions.lang3Format.underline ? 'bg-blue-600 text-white border-blue-600' : 'bg-transparent border-neutral-300 dark:border-neutral-700'}"
              onclick={() => (formatOptions.lang3Format.underline = !formatOptions.lang3Format.underline)}
              title={t('editor.format.underline')}
            >U</button>
            <button
              type="button"
              class="w-6 h-6 rounded border text-[10px] cursor-pointer {formatOptions.lang3Format.align === 'left' ? 'bg-blue-600 text-white border-blue-600' : 'bg-transparent border-neutral-300 dark:border-neutral-700'}"
              onclick={() => toggleAlign(formatOptions.lang3Format, 'left')}
              title={t('editor.format.alignLeft')}
            >⇤</button>
            <button
              type="button"
              class="w-6 h-6 rounded border text-[10px] cursor-pointer {formatOptions.lang3Format.align === 'center' ? 'bg-blue-600 text-white border-blue-600' : 'bg-transparent border-neutral-300 dark:border-neutral-700'}"
              onclick={() => toggleAlign(formatOptions.lang3Format, 'center')}
              title={t('editor.format.alignCenter')}
            >≡</button>
            <button
              type="button"
              class="w-6 h-6 rounded border text-[10px] cursor-pointer {formatOptions.lang3Format.align === 'right' ? 'bg-blue-600 text-white border-blue-600' : 'bg-transparent border-neutral-300 dark:border-neutral-700'}"
              onclick={() => toggleAlign(formatOptions.lang3Format, 'right')}
              title={t('editor.format.alignRight')}
            >⇥</button>
          </div>
        </div>

        <!-- 5. Sprache 4 -->
        <div class="flex items-center justify-between gap-2 py-1 border-b border-neutral-200 dark:border-neutral-800 {langCount < 4 ? 'opacity-50' : ''}">
          <span class="font-bold text-neutral-800 dark:text-neutral-200 w-28 truncate">{t('editor.format.elemLang4')}</span>
          <div class="flex items-center gap-1.5">
            <div class="flex items-center gap-1">
              <label
                class="relative w-7 h-7 rounded border border-neutral-400 dark:border-neutral-600 cursor-pointer shadow-2xs overflow-hidden shrink-0 flex items-center justify-center {formatOptions.lang4Format.color ? '' : 'bg-neutral-200 dark:bg-neutral-800'}"
                style={formatOptions.lang4Format.color ? `background-color: ${formatOptions.lang4Format.color};` : ''}
                title={formatOptions.lang4Format.color || t('editor.format.colorDefault')}
              >
                {#if !formatOptions.lang4Format.color}
                  <span class="text-[9px] font-bold text-neutral-500">STD</span>
                {/if}
                <input
                  type="color"
                  value={formatOptions.lang4Format.color || DEFAULT_PRESENTATION_COLORS.lang4}
                  oninput={(e) => (formatOptions.lang4Format.color = (e.target as HTMLInputElement).value)}
                  class="opacity-0 absolute inset-0 cursor-pointer w-full h-full"
                />
              </label>
              {#if formatOptions.lang4Format.color}
                <button
                  type="button"
                  onclick={() => resetColor(formatOptions.lang4Format)}
                  class="w-4 h-4 rounded text-[10px] text-neutral-400 hover:text-red-500 cursor-pointer"
                  title={t('editor.format.colorResetTooltip')}
                >✕</button>
              {/if}
            </div>
            <button
              type="button"
              class="w-6 h-6 rounded border font-extrabold text-xs cursor-pointer {formatOptions.lang4Format.bold ? 'bg-blue-600 text-white border-blue-600' : 'bg-transparent border-neutral-300 dark:border-neutral-700'}"
              onclick={() => (formatOptions.lang4Format.bold = !formatOptions.lang4Format.bold)}
              title={t('editor.format.bold')}
            >B</button>
            <button
              type="button"
              class="w-6 h-6 rounded border italic font-serif text-xs cursor-pointer {formatOptions.lang4Format.italic ? 'bg-blue-600 text-white border-blue-600' : 'bg-transparent border-neutral-300 dark:border-neutral-700'}"
              onclick={() => (formatOptions.lang4Format.italic = !formatOptions.lang4Format.italic)}
              title={t('editor.format.italic')}
            >I</button>
            <button
              type="button"
              class="w-6 h-6 rounded border underline text-xs cursor-pointer {formatOptions.lang4Format.underline ? 'bg-blue-600 text-white border-blue-600' : 'bg-transparent border-neutral-300 dark:border-neutral-700'}"
              onclick={() => (formatOptions.lang4Format.underline = !formatOptions.lang4Format.underline)}
              title={t('editor.format.underline')}
            >U</button>
            <button
              type="button"
              class="w-6 h-6 rounded border text-[10px] cursor-pointer {formatOptions.lang4Format.align === 'left' ? 'bg-blue-600 text-white border-blue-600' : 'bg-transparent border-neutral-300 dark:border-neutral-700'}"
              onclick={() => toggleAlign(formatOptions.lang4Format, 'left')}
              title={t('editor.format.alignLeft')}
            >⇤</button>
            <button
              type="button"
              class="w-6 h-6 rounded border text-[10px] cursor-pointer {formatOptions.lang4Format.align === 'center' ? 'bg-blue-600 text-white border-blue-600' : 'bg-transparent border-neutral-300 dark:border-neutral-700'}"
              onclick={() => toggleAlign(formatOptions.lang4Format, 'center')}
              title={t('editor.format.alignCenter')}
            >≡</button>
            <button
              type="button"
              class="w-6 h-6 rounded border text-[10px] cursor-pointer {formatOptions.lang4Format.align === 'right' ? 'bg-blue-600 text-white border-blue-600' : 'bg-transparent border-neutral-300 dark:border-neutral-700'}"
              onclick={() => toggleAlign(formatOptions.lang4Format, 'right')}
              title={t('editor.format.alignRight')}
            >⇥</button>
          </div>
        </div>

        <!-- 6. Akkorde -->
        <div class="flex items-center justify-between gap-2 py-1 border-b border-neutral-200 dark:border-neutral-800">
          <span class="font-bold text-neutral-800 dark:text-neutral-200 w-28 truncate">{t('editor.format.elemChords')}</span>
          <div class="flex items-center gap-1.5">
            <div class="flex items-center gap-1">
              <label
                class="relative w-7 h-7 rounded border border-neutral-400 dark:border-neutral-600 cursor-pointer shadow-2xs overflow-hidden shrink-0 flex items-center justify-center {formatOptions.chordColor ? '' : 'bg-neutral-200 dark:bg-neutral-800'}"
                style={formatOptions.chordColor ? `background-color: ${formatOptions.chordColor};` : ''}
                title={formatOptions.chordColor || t('editor.format.colorDefault')}
              >
                {#if !formatOptions.chordColor}
                  <span class="text-[9px] font-bold text-neutral-500">STD</span>
                {/if}
                <input
                  type="color"
                  value={formatOptions.chordColor || DEFAULT_PRESENTATION_COLORS.chord}
                  oninput={(e) => (formatOptions.chordColor = (e.target as HTMLInputElement).value)}
                  class="opacity-0 absolute inset-0 cursor-pointer w-full h-full"
                />
              </label>
              {#if formatOptions.chordColor}
                <button
                  type="button"
                  onclick={() => (formatOptions.chordColor = '')}
                  class="w-4 h-4 rounded text-[10px] text-neutral-400 hover:text-red-500 cursor-pointer"
                  title={t('editor.format.colorResetTooltip')}
                >✕</button>
              {/if}
            </div>
            <span class="text-xs text-neutral-500 italic pl-1">(in [G] Text)</span>
          </div>
        </div>

        <!-- 7. Copyright -->
        <div class="flex items-center justify-between gap-2 py-1 border-b border-neutral-200 dark:border-neutral-800">
          <span class="font-bold text-neutral-800 dark:text-neutral-200 w-28 truncate">{t('editor.format.elemCopyright')}</span>
          <div class="flex items-center gap-1.5">
            <div class="flex items-center gap-1">
              <label
                class="relative w-7 h-7 rounded border border-neutral-400 dark:border-neutral-600 cursor-pointer shadow-2xs overflow-hidden shrink-0 flex items-center justify-center {formatOptions.copyrightColor ? '' : 'bg-neutral-200 dark:bg-neutral-800'}"
                style={formatOptions.copyrightColor ? `background-color: ${formatOptions.copyrightColor};` : ''}
                title={formatOptions.copyrightColor || t('editor.format.colorDefault')}
              >
                {#if !formatOptions.copyrightColor}
                  <span class="text-[9px] font-bold text-neutral-500">STD</span>
                {/if}
                <input
                  type="color"
                  value={formatOptions.copyrightColor || DEFAULT_PRESENTATION_COLORS.copyright}
                  oninput={(e) => (formatOptions.copyrightColor = (e.target as HTMLInputElement).value)}
                  class="opacity-0 absolute inset-0 cursor-pointer w-full h-full"
                />
              </label>
              {#if formatOptions.copyrightColor}
                <button
                  type="button"
                  onclick={() => (formatOptions.copyrightColor = '')}
                  class="w-4 h-4 rounded text-[10px] text-neutral-400 hover:text-red-500 cursor-pointer"
                  title={t('editor.format.colorResetTooltip')}
                >✕</button>
              {/if}
            </div>
          </div>
        </div>

        <!-- 8. Rand (Outline) -->
        <div class="flex items-center justify-between gap-2 py-1 border-b border-neutral-200 dark:border-neutral-800">
          <span class="font-bold text-neutral-800 dark:text-neutral-200 w-28 truncate">{t('editor.format.elemOutline')}</span>
          <div class="flex items-center gap-2">
            <input
              type="checkbox"
              id="outline-toggle"
              bind:checked={formatOptions.outline}
              class="rounded cursor-pointer accent-blue-600 w-4 h-4"
            />
            <label
              class="relative w-7 h-7 rounded border border-neutral-400 dark:border-neutral-600 cursor-pointer shadow-2xs overflow-hidden shrink-0"
              style="background-color: {formatOptions.outlineColor};"
            >
              <input
                type="color"
                bind:value={formatOptions.outlineColor}
                class="opacity-0 absolute inset-0 cursor-pointer w-full h-full"
              />
            </label>
          </div>
        </div>

        <!-- 9. Schatten (Shadow) -->
        <div class="flex items-center justify-between gap-2 py-1 border-b border-neutral-200 dark:border-neutral-800">
          <span class="font-bold text-neutral-800 dark:text-neutral-200 w-28 truncate">{t('editor.format.elemShadow')}</span>
          <div class="flex items-center gap-2">
            <input
              type="checkbox"
              id="shadow-toggle"
              bind:checked={formatOptions.shadow}
              class="rounded cursor-pointer accent-blue-600 w-4 h-4"
            />
            <label
              class="relative w-7 h-7 rounded border border-neutral-400 dark:border-neutral-600 cursor-pointer shadow-2xs overflow-hidden shrink-0"
              style="background-color: {formatOptions.shadowColor};"
            >
              <input
                type="color"
                bind:value={formatOptions.shadowColor}
                class="opacity-0 absolute inset-0 cursor-pointer w-full h-full"
              />
            </label>
          </div>
        </div>
      </div>
    </fieldset>
  </div>
</div>
