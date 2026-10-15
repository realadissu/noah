<script lang="ts">
  import { t, i18n, type SupportedLocale } from '$lib/i18n';
  import { presentation } from '$lib/stores/presentation.svelte';
  import type { AspectRatio } from '$lib/types/models';

  function handleLanguageChange(lang: SupportedLocale) {
    i18n.setLocale(lang);
  }

  function handleThemeChange(theme: 'dark' | 'light') {
    presentation.setTheme(theme);
  }

  function handleUiModeChange(mode: 'classic' | 'modern') {
    presentation.setUiMode(mode);
  }

  function handleAspectRatioChange(e: Event) {
    const val = (e.target as HTMLSelectElement).value as 'auto' | AspectRatio;
    presentation.setAspectRatio(val);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      presentation.isSettingsOpen = false;
    }
  }
</script>

<svelte:window onkeydown={handleKeyDown} />

<!-- Modal Backdrop Container -->
<div class="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
  <!-- Backdrop button -->
  <button
    type="button"
    class="fixed inset-0 bg-black/70 backdrop-blur-sm -z-10 cursor-default border-0"
    onclick={() => { presentation.isSettingsOpen = false; }}
    tabindex="-1"
    aria-label="Close modal backdrop"
  ></button>

  <!-- Dialog Window -->
  <div
    role="dialog"
    aria-modal="true"
    aria-labelledby="settings-title"
    tabindex="-1"
    class="w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden flex flex-col transition-all {presentation.theme === 'dark'
      ? 'bg-neutral-900 border-neutral-700 text-neutral-100 shadow-neutral-950/80'
      : 'bg-white border-neutral-300 text-neutral-900 shadow-xl'}"
  >
    <!-- Modal Header -->
    <div
      class="px-6 py-4 border-b flex items-center justify-between {presentation.theme === 'dark'
        ? 'border-neutral-800 bg-neutral-900/90'
        : 'border-neutral-200 bg-neutral-100/80'}"
    >
      <div class="flex items-center gap-2">
        <span class="text-xl">⚙️</span>
        <h2 id="settings-title" class="text-lg font-bold">
          {t('settings.title')}
        </h2>
      </div>
      <button
        type="button"
        class="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition {presentation.theme === 'dark'
          ? 'hover:bg-neutral-800 text-neutral-400 hover:text-white'
          : 'hover:bg-neutral-200 text-neutral-600 hover:text-black'}"
        onclick={() => { presentation.isSettingsOpen = false; }}
        title={t('settings.closeTitle')}
      >
        ✕
      </button>
    </div>

    <!-- Modal Content -->
    <div class="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
      <!-- 1. Language Selection (Point 7) -->
      <div>
        <div class="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
          🌐 {t('settings.language')}
        </div>
        <div class="grid grid-cols-2 gap-3">
          <button
            type="button"
            class="p-3 rounded-xl border text-left font-semibold text-sm flex items-center justify-between transition {i18n.locale === 'de'
              ? 'border-amber-500 bg-amber-500/15 text-amber-500 ring-2 ring-amber-500/30'
              : presentation.theme === 'dark' ? 'border-neutral-800 bg-neutral-950/60 hover:bg-neutral-800/60 text-neutral-300' : 'border-neutral-300 bg-neutral-50 hover:bg-neutral-100 text-neutral-700'}"
            onclick={() => handleLanguageChange('de')}
          >
            <span>🇩🇪 Deutsch</span>
            {#if i18n.locale === 'de'}<span>✓</span>{/if}
          </button>
          <button
            type="button"
            class="p-3 rounded-xl border text-left font-semibold text-sm flex items-center justify-between transition {i18n.locale === 'en'
              ? 'border-amber-500 bg-amber-500/15 text-amber-500 ring-2 ring-amber-500/30'
              : presentation.theme === 'dark' ? 'border-neutral-800 bg-neutral-950/60 hover:bg-neutral-800/60 text-neutral-300' : 'border-neutral-300 bg-neutral-50 hover:bg-neutral-100 text-neutral-700'}"
            onclick={() => handleLanguageChange('en')}
          >
            <span>🇬🇧 English</span>
            {#if i18n.locale === 'en'}<span>✓</span>{/if}
          </button>
        </div>
      </div>

      <!-- 2. UI Style / Mode (Point 3) -->
      <div>
        <div class="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
          🎛️ {t('settings.uiMode')}
        </div>
        <div class="grid grid-cols-2 gap-3">
          <button
            type="button"
            class="p-3 rounded-xl border text-left font-semibold text-sm flex items-center justify-between transition {presentation.uiMode === 'classic'
              ? 'border-sky-500 bg-sky-500/15 text-sky-400 ring-2 ring-sky-500/30'
              : presentation.theme === 'dark' ? 'border-neutral-800 bg-neutral-950/60 hover:bg-neutral-800/60 text-neutral-300' : 'border-neutral-300 bg-neutral-50 hover:bg-neutral-100 text-neutral-700'}"
            onclick={() => handleUiModeChange('classic')}
          >
            <div>
              <div class="font-bold">{t('settings.uiClassic')}</div>
              <div class="text-[11px] opacity-70">SongBeamer 3.0 Look & Feel</div>
            </div>
            {#if presentation.uiMode === 'classic'}<span>✓</span>{/if}
          </button>
          <button
            type="button"
            class="p-3 rounded-xl border text-left font-semibold text-sm flex items-center justify-between transition {presentation.uiMode === 'modern'
              ? 'border-sky-500 bg-sky-500/15 text-sky-400 ring-2 ring-sky-500/30'
              : presentation.theme === 'dark' ? 'border-neutral-800 bg-neutral-950/60 hover:bg-neutral-800/60 text-neutral-300' : 'border-neutral-300 bg-neutral-50 hover:bg-neutral-100 text-neutral-700'}"
            onclick={() => handleUiModeChange('modern')}
          >
            <div>
              <div class="font-bold">{t('settings.uiModern')}</div>
              <div class="text-[11px] opacity-70">Fluid Studio Aesthetics</div>
            </div>
            {#if presentation.uiMode === 'modern'}<span>✓</span>{/if}
          </button>
        </div>
      </div>

      <!-- 3. Theme / Dark & Light Mode (Point 5) -->
      <div>
        <div class="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
          🎨 {t('settings.theme')}
        </div>
        <div class="grid grid-cols-2 gap-3">
          <button
            type="button"
            class="p-3 rounded-xl border text-left font-semibold text-sm flex items-center justify-between transition {presentation.theme === 'dark'
              ? 'border-amber-500 bg-amber-500/15 text-amber-400 ring-2 ring-amber-500/30'
              : 'border-neutral-300 bg-neutral-50 text-neutral-700 hover:bg-neutral-100'}"
            onclick={() => handleThemeChange('dark')}
          >
            <span>🌙 {t('settings.themeDark')}</span>
            {#if presentation.theme === 'dark'}<span>✓</span>{/if}
          </button>
          <button
            type="button"
            class="p-3 rounded-xl border text-left font-semibold text-sm flex items-center justify-between transition {presentation.theme === 'light'
              ? 'border-amber-500 bg-amber-500/15 text-amber-600 ring-2 ring-amber-500/30'
              : 'border-neutral-800 bg-neutral-950/60 text-neutral-300 hover:bg-neutral-800/60'}"
            onclick={() => handleThemeChange('light')}
          >
            <span>☀️ {t('settings.themeLight')}</span>
            {#if presentation.theme === 'light'}<span>✓</span>{/if}
          </button>
        </div>
      </div>

      <!-- 4. Default Projection Aspect Ratio (Point 3) -->
      <div>
        <label for="aspect-ratio-select" class="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
          📐 {t('settings.aspectRatio')}
        </label>
        <select
          id="aspect-ratio-select"
          value={presentation.aspectRatioMode === 'auto' ? 'auto' : presentation.aspectRatio}
          onchange={handleAspectRatioChange}
          class="w-full p-2.5 rounded-xl border text-sm font-semibold transition focus:outline-none {presentation.theme === 'dark'
            ? 'bg-neutral-950 border-neutral-700 text-neutral-100'
            : 'bg-white border-neutral-300 text-neutral-900'}"
        >
          <option value="auto">{t('aspectRatio.auto')}</option>
          <option value="16:9">16:9 (Widescreen)</option>
          <option value="16:10">16:10 (Widescreen PC)</option>
          <option value="4:3">4:3 (Classic)</option>
        </select>
      </div>

      <!-- 5. Chords Toggle Option -->
      <div class="flex items-center justify-between pt-2 border-t {presentation.theme === 'dark' ? 'border-neutral-800' : 'border-neutral-200'}">
        <div>
          <div class="text-sm font-semibold">🎸 {t('settings.showChords')}</div>
        </div>
        <button
          type="button"
          aria-label={t('settings.showChords')}
          class="w-12 h-6 rounded-full transition-colors p-0.5 relative {presentation.showChords
            ? 'bg-amber-500'
            : presentation.theme === 'dark' ? 'bg-neutral-700' : 'bg-neutral-300'}"
          onclick={() => presentation.toggleChords()}
        >
          <div
            class="w-5 h-5 rounded-full bg-white shadow-md transition-transform {presentation.showChords ? 'translate-x-6' : 'translate-x-0'}"
          ></div>
        </button>
      </div>

      <!-- 6. Default Directories / Standard-Verzeichnisse (Songs, Backgrounds, Schedules) -->
      <div class="pt-4 border-t {presentation.theme === 'dark' ? 'border-neutral-800' : 'border-neutral-200'} space-y-4">
        <div class="block text-xs font-bold uppercase tracking-wider text-neutral-400">
          📁 {t('settings.defaultDirectoriesTitle')}
        </div>

        <!-- 6.1 Songs Archive Directory -->
        <div class="p-3.5 rounded-xl border space-y-2 {presentation.theme === 'dark' ? 'bg-neutral-950/40 border-neutral-800' : 'bg-neutral-50 border-neutral-200'}">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-neutral-700 dark:text-neutral-300">
              🎵 {t('settings.songsDirectoryTitle')}
            </span>
            <span class="text-[11px] text-neutral-400">
              {t('settings.songsDirectoryDesc')}
            </span>
          </div>
          <div class="flex items-center gap-2">
            <input
              type="text"
              value={presentation.songsDirectory}
              placeholder={t('settings.folderPlaceholder')}
              oninput={(e) => presentation.setSongsDirectory((e.target as HTMLInputElement).value)}
              class="flex-1 p-2 rounded-lg border text-xs font-mono {presentation.theme === 'dark' ? 'bg-neutral-900 border-neutral-700 text-neutral-200 placeholder-neutral-600' : 'bg-white border-neutral-300 text-neutral-800 placeholder-neutral-400'}"
            />
            <button
              type="button"
              class="px-3 py-2 rounded-lg text-xs font-bold transition border cursor-pointer shrink-0 {presentation.theme === 'dark'
                ? 'bg-neutral-800 hover:bg-neutral-700 border-neutral-600 text-white'
                : 'bg-white hover:bg-neutral-100 border-neutral-300 text-neutral-800 shadow-xs'}"
              onclick={() => presentation.openSongFolderDialog()}
            >
              {t('settings.chooseFolder')}
            </button>
            {#if presentation.songsDirectory}
              <button
                type="button"
                title={t('settings.clearFolderTooltip')}
                class="px-2.5 py-2 rounded-lg text-xs font-bold transition border cursor-pointer text-red-500 hover:bg-red-500/10 border-red-500/30"
                onclick={() => presentation.setSongsDirectory('')}
              >
                ✕
              </button>
            {/if}
          </div>

          {#if presentation.songsDirectory}
            <div class="flex items-center justify-between text-xs pt-1">
              <span class="text-neutral-400">
                {#if presentation.isScanning}
                  <span class="inline-flex items-center gap-1.5 text-amber-500 font-semibold animate-pulse">
                    <span>⏳</span> {t('settings.indexingArchive')}
                  </span>
                {:else if presentation.scanSummary}
                  <span class="text-emerald-500 font-semibold">
                    ✓ {t('settings.songsIndexed', { count: presentation.scanSummary.indexed_count })}
                  </span>
                  <span class="opacity-70">
                    {t('settings.scannedDetails', { total: presentation.scanSummary.total_scanned, errors: presentation.scanSummary.error_count > 0 ? t('settings.errorCount', { count: presentation.scanSummary.error_count }) : '' })}
                  </span>
                {:else}
                  <span>{t('settings.searchIndexReady')}</span>
                {/if}
              </span>

              <button
                type="button"
                disabled={presentation.isScanning}
                class="px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition cursor-pointer {presentation.theme === 'dark'
                  ? 'border-neutral-700 hover:bg-neutral-800 text-neutral-300'
                  : 'border-neutral-300 hover:bg-neutral-100 text-neutral-700'}"
                onclick={() => presentation.scanSongsDirectory()}
              >
                {t('settings.rescan')}
              </button>
            </div>
          {/if}
        </div>

        <!-- 6.2 Backgrounds Directory -->
        <div class="p-3.5 rounded-xl border space-y-2 {presentation.theme === 'dark' ? 'bg-neutral-950/40 border-neutral-800' : 'bg-neutral-50 border-neutral-200'}">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-neutral-700 dark:text-neutral-300">
              🖼️ {t('settings.backgroundsDirectoryTitle')}
            </span>
            <span class="text-[11px] text-neutral-400">
              {t('settings.backgroundsDirectoryDesc')}
            </span>
          </div>
          <div class="flex items-center gap-2">
            <input
              type="text"
              value={presentation.backgroundsDirectory}
              placeholder={t('settings.folderPlaceholder')}
              oninput={(e) => presentation.setBackgroundsDirectory((e.target as HTMLInputElement).value)}
              class="flex-1 p-2 rounded-lg border text-xs font-mono {presentation.theme === 'dark' ? 'bg-neutral-900 border-neutral-700 text-neutral-200 placeholder-neutral-600' : 'bg-white border-neutral-300 text-neutral-800 placeholder-neutral-400'}"
            />
            <button
              type="button"
              class="px-3 py-2 rounded-lg text-xs font-bold transition border cursor-pointer shrink-0 {presentation.theme === 'dark'
                ? 'bg-neutral-800 hover:bg-neutral-700 border-neutral-600 text-white'
                : 'bg-white hover:bg-neutral-100 border-neutral-300 text-neutral-800 shadow-xs'}"
              onclick={() => presentation.openBackgroundsFolderDialog()}
            >
              {t('settings.chooseFolder')}
            </button>
            {#if presentation.backgroundsDirectory}
              <button
                type="button"
                title={t('settings.clearFolderTooltip')}
                class="px-2.5 py-2 rounded-lg text-xs font-bold transition border cursor-pointer text-red-500 hover:bg-red-500/10 border-red-500/30"
                onclick={() => presentation.setBackgroundsDirectory('')}
              >
                ✕
              </button>
            {/if}
          </div>
        </div>

        <!-- 6.3 Schedules Directory -->
        <div class="p-3.5 rounded-xl border space-y-2 {presentation.theme === 'dark' ? 'bg-neutral-950/40 border-neutral-800' : 'bg-neutral-50 border-neutral-200'}">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-neutral-700 dark:text-neutral-300">
              📋 {t('settings.schedulesDirectoryTitle')}
            </span>
            <span class="text-[11px] text-neutral-400">
              {t('settings.schedulesDirectoryDesc')}
            </span>
          </div>
          <div class="flex items-center gap-2">
            <input
              type="text"
              value={presentation.schedulesDirectory}
              placeholder={t('settings.folderPlaceholder')}
              oninput={(e) => presentation.setSchedulesDirectory((e.target as HTMLInputElement).value)}
              class="flex-1 p-2 rounded-lg border text-xs font-mono {presentation.theme === 'dark' ? 'bg-neutral-900 border-neutral-700 text-neutral-200 placeholder-neutral-600' : 'bg-white border-neutral-300 text-neutral-800 placeholder-neutral-400'}"
            />
            <button
              type="button"
              class="px-3 py-2 rounded-lg text-xs font-bold transition border cursor-pointer shrink-0 {presentation.theme === 'dark'
                ? 'bg-neutral-800 hover:bg-neutral-700 border-neutral-600 text-white'
                : 'bg-white hover:bg-neutral-100 border-neutral-300 text-neutral-800 shadow-xs'}"
              onclick={() => presentation.openSchedulesFolderDialog()}
            >
              {t('settings.chooseFolder')}
            </button>
            {#if presentation.schedulesDirectory}
              <button
                type="button"
                title={t('settings.clearFolderTooltip')}
                class="px-2.5 py-2 rounded-lg text-xs font-bold transition border cursor-pointer text-red-500 hover:bg-red-500/10 border-red-500/30"
                onclick={() => presentation.setSchedulesDirectory('')}
              >
                ✕
              </button>
            {/if}
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Footer -->
    <div
      class="px-6 py-4 border-t flex justify-end {presentation.theme === 'dark'
        ? 'border-neutral-800 bg-neutral-900/60'
        : 'border-neutral-200 bg-neutral-100/60'}"
    >
      <button
        type="button"
        class="px-5 py-2 rounded-xl text-sm font-bold bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow transition"
        onclick={() => { presentation.isSettingsOpen = false; }}
      >
        {t('settings.close')}
      </button>
    </div>
  </div>
</div>
