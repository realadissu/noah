<script lang="ts">
  import { onMount } from 'svelte';
  import { t } from '$lib/i18n';
  import { presentation } from '$lib/stores/presentation.svelte';
  import type { SongFormatOptions, TextStyleFormat, TextAlignment } from '$lib/types/format';
  import { DEFAULT_FORMAT_OPTIONS } from '$lib/types/format';

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
        const fonts = await (window as unknown as { queryLocalFonts: () => Promise<Array<{ family: string }>> }).queryLocalFonts();
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

  function resetAllColors() {
    formatOptions.titleFormat.color = DEFAULT_FORMAT_OPTIONS.titleFormat.color;
    formatOptions.lang1Format.color = DEFAULT_FORMAT_OPTIONS.lang1Format.color;
    formatOptions.lang2Format.color = DEFAULT_FORMAT_OPTIONS.lang2Format.color;
    formatOptions.lang3Format.color = DEFAULT_FORMAT_OPTIONS.lang3Format.color;
    formatOptions.lang4Format.color = DEFAULT_FORMAT_OPTIONS.lang4Format.color;
    formatOptions.chordColor = DEFAULT_FORMAT_OPTIONS.chordColor;
    formatOptions.copyrightColor = DEFAULT_FORMAT_OPTIONS.copyrightColor;
    formatOptions.tpLeftColor = DEFAULT_FORMAT_OPTIONS.tpLeftColor;
    formatOptions.tpRightColor = DEFAULT_FORMAT_OPTIONS.tpRightColor;
    formatOptions.outlineColor = DEFAULT_FORMAT_OPTIONS.outlineColor;
    formatOptions.shadowColor = DEFAULT_FORMAT_OPTIONS.shadowColor;
    if (onResetColors) onResetColors();
  }

  function toggleAlign(fmt: TextStyleFormat, align: TextAlignment) {
    if (fmt.align === align) {
      fmt.align = 'center';
    } else {
      fmt.align = align;
    }
  }
</script>

<div class="flex-1 flex flex-col gap-4 overflow-y-auto select-none p-1">
  <!-- 1. GroupBox: Schriftart und -größe (GroupBox5) -->
  <fieldset
    class="rounded-lg border p-4 flex flex-col gap-3.5 {presentation.theme === 'dark'
      ? 'bg-neutral-900/60 border-neutral-700'
      : 'bg-white border-neutral-400'}"
  >
    <legend class="px-2 font-bold text-xs uppercase tracking-wider text-blue-600 dark:text-amber-400">
      {t('editor.format.fontGroupTitle')}
    </legend>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
      <!-- Sprache 1 Schriftart (FontCombo) -->
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
          <option value="Arial">{t('editor.format.defaultFontOption')} (Arial)</option>
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

      <!-- Sprache 2-4 Schriftart (FontComboLang24) -->
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
        </select>
      </div>
    </div>

    <!-- Schriftgröße (FontsizeSpin) & Hinweistext -->
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

  <!-- 2. GroupBox: Formatierung (ImageTextPropertiesGroup - Colors & Styles) -->
  <fieldset
    class="rounded-lg border p-4 flex flex-col gap-3 {presentation.theme === 'dark'
      ? 'bg-neutral-900/60 border-neutral-700'
      : 'bg-white border-neutral-400'}"
  >
    <div class="flex items-center justify-between">
      <legend class="px-2 font-bold text-xs uppercase tracking-wider text-blue-600 dark:text-amber-400">
        {t('editor.format.stylesGroupTitle')}
      </legend>
      <button
        type="button"
        onclick={resetAllColors}
        class="text-xs px-2.5 py-1 rounded border hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer font-semibold text-neutral-600 dark:text-neutral-300"
        title={t('editor.format.resetColors')}
      >
        ↺ {t('editor.format.resetColors')}
      </button>
    </div>

    <!-- Color & Style Matrix matching SongBeamer layout -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2.5 text-xs">
      <!-- Row: Titel -->
      <div class="flex items-center justify-between gap-2 py-1 border-b border-neutral-200 dark:border-neutral-800">
        <span class="font-bold text-neutral-800 dark:text-neutral-200 w-28 truncate">{t('editor.format.elemTitle')}</span>
        <div class="flex items-center gap-1.5">
          <!-- Color Picker Button -->
          <label class="relative w-7 h-7 rounded border border-neutral-400 dark:border-neutral-600 cursor-pointer shadow-2xs overflow-hidden shrink-0" style="background-color: {formatOptions.titleFormat.color};">
            <input type="color" bind:value={formatOptions.titleFormat.color} class="opacity-0 absolute inset-0 cursor-pointer w-full h-full" />
          </label>
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

      <!-- Row: Sprache 1 -->
      <div class="flex items-center justify-between gap-2 py-1 border-b border-neutral-200 dark:border-neutral-800">
        <span class="font-bold text-neutral-800 dark:text-neutral-200 w-28 truncate">{t('editor.format.elemLang1')}</span>
        <div class="flex items-center gap-1.5">
          <label class="relative w-7 h-7 rounded border border-neutral-400 dark:border-neutral-600 cursor-pointer shadow-2xs overflow-hidden shrink-0" style="background-color: {formatOptions.lang1Format.color};">
            <input type="color" bind:value={formatOptions.lang1Format.color} class="opacity-0 absolute inset-0 cursor-pointer w-full h-full" />
          </label>
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

      <!-- Row: Sprache 2 -->
      <div class="flex items-center justify-between gap-2 py-1 border-b border-neutral-200 dark:border-neutral-800 {langCount < 2 ? 'opacity-40' : ''}">
        <span class="font-bold text-neutral-800 dark:text-neutral-200 w-28 truncate">{t('editor.format.elemLang2')}</span>
        <div class="flex items-center gap-1.5">
          <label class="relative w-7 h-7 rounded border border-neutral-400 dark:border-neutral-600 cursor-pointer shadow-2xs overflow-hidden shrink-0" style="background-color: {formatOptions.lang2Format.color};">
            <input type="color" bind:value={formatOptions.lang2Format.color} class="opacity-0 absolute inset-0 cursor-pointer w-full h-full" />
          </label>
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

      <!-- Row: Akkorde -->
      <div class="flex items-center justify-between gap-2 py-1 border-b border-neutral-200 dark:border-neutral-800">
        <span class="font-bold text-neutral-800 dark:text-neutral-200 w-28 truncate">{t('editor.format.elemChords')}</span>
        <div class="flex items-center gap-1.5">
          <label class="relative w-7 h-7 rounded border border-neutral-400 dark:border-neutral-600 cursor-pointer shadow-2xs overflow-hidden shrink-0" style="background-color: {formatOptions.chordColor};">
            <input type="color" bind:value={formatOptions.chordColor} class="opacity-0 absolute inset-0 cursor-pointer w-full h-full" />
          </label>
        </div>
      </div>

      <!-- Row: Copyright -->
      <div class="flex items-center justify-between gap-2 py-1 border-b border-neutral-200 dark:border-neutral-800">
        <span class="font-bold text-neutral-800 dark:text-neutral-200 w-28 truncate">{t('editor.format.elemCopyright')}</span>
        <div class="flex items-center gap-1.5">
          <label class="relative w-7 h-7 rounded border border-neutral-400 dark:border-neutral-600 cursor-pointer shadow-2xs overflow-hidden shrink-0" style="background-color: {formatOptions.copyrightColor};">
            <input type="color" bind:value={formatOptions.copyrightColor} class="opacity-0 absolute inset-0 cursor-pointer w-full h-full" />
          </label>
        </div>
      </div>

      <!-- Row: Rand (Outline) -->
      <div class="flex items-center justify-between gap-2 py-1 border-b border-neutral-200 dark:border-neutral-800">
        <span class="font-bold text-neutral-800 dark:text-neutral-200 w-28 truncate">{t('editor.format.elemOutline')}</span>
        <div class="flex items-center gap-2">
          <input
            type="checkbox"
            id="outline-toggle"
            bind:checked={formatOptions.outline}
            class="rounded cursor-pointer accent-blue-600 w-4 h-4"
          />
          <label class="relative w-7 h-7 rounded border border-neutral-400 dark:border-neutral-600 cursor-pointer shadow-2xs overflow-hidden shrink-0" style="background-color: {formatOptions.outlineColor};">
            <input type="color" bind:value={formatOptions.outlineColor} class="opacity-0 absolute inset-0 cursor-pointer w-full h-full" />
          </label>
        </div>
      </div>

      <!-- Row: Schatten (Shadow) -->
      <div class="flex items-center justify-between gap-2 py-1 border-b border-neutral-200 dark:border-neutral-800">
        <span class="font-bold text-neutral-800 dark:text-neutral-200 w-28 truncate">{t('editor.format.elemShadow')}</span>
        <div class="flex items-center gap-2">
          <input
            type="checkbox"
            id="shadow-toggle"
            bind:checked={formatOptions.shadow}
            class="rounded cursor-pointer accent-blue-600 w-4 h-4"
          />
          <label class="relative w-7 h-7 rounded border border-neutral-400 dark:border-neutral-600 cursor-pointer shadow-2xs overflow-hidden shrink-0" style="background-color: {formatOptions.shadowColor};">
            <input type="color" bind:value={formatOptions.shadowColor} class="opacity-0 absolute inset-0 cursor-pointer w-full h-full" />
          </label>
        </div>
      </div>

      <!-- Checkbox: SongUseOwnBGProfilCheck -->
      <div class="md:col-span-2 pt-2 flex items-center gap-2">
        <input
          type="checkbox"
          id="own-bg-profile-check"
          bind:checked={formatOptions.useOwnBackgroundProfile}
          class="rounded cursor-pointer accent-blue-600 w-4 h-4"
        />
        <label for="own-bg-profile-check" class="font-bold text-xs cursor-pointer text-neutral-800 dark:text-neutral-200">
          {t('editor.format.useOwnProfile')}
        </label>
      </div>
    </div>
  </fieldset>

  <!-- 3. GroupBox: Spezialformatierung (TntGroupBox3) -->
  <fieldset
    class="rounded-lg border p-4 flex flex-col gap-3 {presentation.theme === 'dark'
      ? 'bg-neutral-900/60 border-neutral-700'
      : 'bg-white border-neutral-400'}"
  >
    <legend class="px-2 font-bold text-xs uppercase tracking-wider text-blue-600 dark:text-amber-400">
      {t('editor.format.specialGroupTitle')}
    </legend>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
      <div class="flex flex-col gap-1.5">
        <label for="pre-line-input" class="font-semibold text-neutral-700 dark:text-neutral-300">
          {t('editor.format.preLineLabel')}
        </label>
        <input
          id="pre-line-input"
          type="text"
          bind:value={formatOptions.formatPreLine}
          placeholder={t('editor.format.preLinePlaceholder')}
          class="px-2.5 py-1.5 rounded border font-mono text-xs focus:outline-none {presentation.theme === 'dark'
            ? 'bg-neutral-950 border-neutral-700 text-neutral-200 focus:border-amber-500'
            : 'bg-white border-neutral-400 text-neutral-900 focus:border-blue-600'}"
        />
      </div>

      <div class="flex flex-col gap-1.5">
        <label for="pre-page-input" class="font-semibold text-neutral-700 dark:text-neutral-300">
          {t('editor.format.prePageLabel')}
        </label>
        <input
          id="pre-page-input"
          type="text"
          bind:value={formatOptions.formatPrePage}
          placeholder={t('editor.format.prePagePlaceholder')}
          class="px-2.5 py-1.5 rounded border font-mono text-xs focus:outline-none {presentation.theme === 'dark'
            ? 'bg-neutral-950 border-neutral-700 text-neutral-200 focus:border-amber-500'
            : 'bg-white border-neutral-400 text-neutral-900 focus:border-blue-600'}"
        />
      </div>
    </div>
  </fieldset>
</div>
