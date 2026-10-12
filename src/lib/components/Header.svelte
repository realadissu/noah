<script lang="ts">
  import { t } from '$lib/i18n';
  import { presentation } from '$lib/stores/presentation.svelte';
  import type { DisplayMode, AspectRatio, SongSearchResult } from '$lib/types/models';

  let searchQuery = $state<string>('');
  let searchResults = $state<SongSearchResult[]>([]);
  let showSearchResults = $state<boolean>(false);
  let isMobileSearchOpen = $state<boolean>(false);

  function setMode(mode: DisplayMode) {
    presentation.setDisplayMode(mode);
  }

  function handleAspectRatioChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    presentation.setAspectRatio(target.value as 'auto' | AspectRatio);
  }

  async function handleSearch(e: Event) {
    const val = (e.target as HTMLInputElement).value;
    searchQuery = val;
    if (val.trim().length >= 2) {
      if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
        try {
          const { invoke } = await import('@tauri-apps/api/core');
          const res = await invoke<SongSearchResult[]>('search_songs', { query: val });
          searchResults = res || [];
          showSearchResults = true;
        } catch {
          searchResults = [];
        }
      }
    } else {
      searchResults = [];
      showSearchResults = false;
    }
  }

  function selectSearchResult(result: SongSearchResult) {
    if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
      import('@tauri-apps/api/core').then(({ invoke }) => {
        invoke<{ song: any; encoding: string }>('parse_sng', { content: result.preview_snippet }).then(
          (res) => {
            if (res && res.song) {
              presentation.setSong(res.song, res.encoding);
            }
          }
        );
      });
    }
    showSearchResults = false;
    isMobileSearchOpen = false;
    searchQuery = '';
  }
</script>

<!-- Classic SongBeamer Menubar (Only shown in Classic UI Mode) -->
{#if presentation.uiMode === 'classic'}
  <nav class="h-6 px-2 text-xs flex items-center space-x-3 select-none border-b font-sans {presentation.theme === 'dark' ? 'bg-[#2d3139] border-neutral-700 text-neutral-300' : 'bg-[#f0f0f0] border-neutral-300 text-neutral-800'}">
    <button type="button" class="px-1.5 py-0.5 hover:bg-black/10 rounded cursor-pointer">{t('menu.file')}</button>
    <button type="button" class="px-1.5 py-0.5 hover:bg-black/10 rounded cursor-pointer">{t('menu.edit')}</button>
    <button type="button" class="px-1.5 py-0.5 hover:bg-black/10 rounded cursor-pointer">{t('menu.insert')}</button>
    <button type="button" class="px-1.5 py-0.5 hover:bg-black/10 rounded cursor-pointer" onclick={() => presentation.toggleBeamer()}>{t('menu.presentation')}</button>
    <button type="button" class="px-1.5 py-0.5 hover:bg-black/10 rounded cursor-pointer" onclick={() => presentation.toggleSettings()}>{t('menu.tools')}</button>
    <button type="button" class="px-1.5 py-0.5 hover:bg-black/10 rounded cursor-pointer" onclick={() => presentation.toggleSettings()}>{t('menu.help')}</button>
  </nav>
{/if}

<header
  class="h-12 px-2.5 flex items-center justify-between select-none gap-2 shrink-0 border-b transition-colors {presentation.theme === 'dark'
    ? 'bg-neutral-900/95 border-neutral-800 text-neutral-100'
    : presentation.uiMode === 'classic'
      ? 'bg-[#e4e4e7] border-neutral-300 text-neutral-900'
      : 'bg-white border-neutral-200 text-neutral-900'}"
>
  <!-- Left: Brand Logo & Status Indicator -->
  <div class="flex items-center space-x-2 shrink-0">
    <div class="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center font-black text-neutral-950 text-sm shadow">
      N
    </div>
    <span class="font-extrabold tracking-tight text-sm hidden sm:inline">
      {t('app.title')}
    </span>

    <!-- Compact Live indicator -->
    <div
      class="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold {presentation.displayMode === 'normal'
        ? 'bg-red-500/15 text-red-500 border border-red-500/30'
        : presentation.theme === 'dark'
          ? 'bg-neutral-800 text-neutral-400 border border-neutral-700'
          : 'bg-neutral-200 text-neutral-600 border border-neutral-300'}"
    >
      <span class="w-1.5 h-1.5 rounded-full {presentation.displayMode === 'normal' ? 'bg-red-500 animate-pulse' : 'bg-neutral-400'}"></span>
      <span class="hidden md:inline">{presentation.displayMode === 'normal' ? t('status.live') : t('status.offline')}</span>
    </div>
  </div>

  <!-- Center-Left: Compact Blanking Controls (Icons with Tooltips) -->
  <div class="flex items-center space-x-1 shrink-0">
    <button
      type="button"
      class="w-7 h-7 sm:w-8 sm:h-8 rounded flex items-center justify-center text-sm transition border {presentation.displayMode === 'normal'
        ? 'bg-emerald-500/25 border-emerald-500/60 text-emerald-400 ring-1 ring-emerald-500/40'
        : presentation.theme === 'dark'
          ? 'bg-neutral-800/80 hover:bg-neutral-700 border-neutral-700 text-neutral-300'
          : 'bg-neutral-100 hover:bg-neutral-200 border-neutral-300 text-neutral-700'}"
      onclick={() => setMode('normal')}
      title={t('toolbar.normal')}
    >
      ▶️
    </button>
    <button
      type="button"
      class="w-7 h-7 sm:w-8 sm:h-8 rounded flex items-center justify-center text-sm transition border {presentation.displayMode === 'black'
        ? 'bg-neutral-950 border-neutral-500 text-white ring-1 ring-neutral-400'
        : presentation.theme === 'dark'
          ? 'bg-neutral-800/80 hover:bg-neutral-700 border-neutral-700 text-neutral-300'
          : 'bg-neutral-100 hover:bg-neutral-200 border-neutral-300 text-neutral-700'}"
      onclick={() => setMode('black')}
      title={t('toolbar.black')}
    >
      ⬛
    </button>
    <button
      type="button"
      class="w-7 h-7 sm:w-8 sm:h-8 rounded flex items-center justify-center text-sm transition border {presentation.displayMode === 'clear_text'
        ? 'bg-sky-500/25 border-sky-500/60 text-sky-400 ring-1 ring-sky-500/40'
        : presentation.theme === 'dark'
          ? 'bg-neutral-800/80 hover:bg-neutral-700 border-neutral-700 text-neutral-300'
          : 'bg-neutral-100 hover:bg-neutral-200 border-neutral-300 text-neutral-700'}"
      onclick={() => setMode('clear_text')}
      title={t('toolbar.clear')}
    >
      📄
    </button>
    <button
      type="button"
      class="w-7 h-7 sm:w-8 sm:h-8 rounded flex items-center justify-center text-sm transition border {presentation.displayMode === 'logo'
        ? 'bg-amber-500/25 border-amber-500/60 text-amber-400 ring-1 ring-amber-500/40'
        : presentation.theme === 'dark'
          ? 'bg-neutral-800/80 hover:bg-neutral-700 border-neutral-700 text-neutral-300'
          : 'bg-neutral-100 hover:bg-neutral-200 border-neutral-300 text-neutral-700'}"
      onclick={() => setMode('logo')}
      title={t('toolbar.logo')}
    >
      🏛️
    </button>
    <button
      type="button"
      class="w-7 h-7 sm:w-8 sm:h-8 rounded flex items-center justify-center text-sm transition border {presentation.displayMode === 'frozen'
        ? 'bg-blue-500/25 border-blue-500/60 text-blue-400 ring-1 ring-blue-500/40'
        : presentation.theme === 'dark'
          ? 'bg-neutral-800/80 hover:bg-neutral-700 border-neutral-700 text-neutral-300'
          : 'bg-neutral-100 hover:bg-neutral-200 border-neutral-300 text-neutral-700'}"
      onclick={() => setMode('frozen')}
      title={t('toolbar.freeze')}
    >
      ❄️
    </button>
  </div>

  <!-- Center: Quick Search (Responsive: hidden on very narrow, button toggleable) -->
  <div class="relative flex items-center text-xs">
    <div class="hidden md:flex items-center gap-1.5">
      <input
        type="text"
        bind:value={searchQuery}
        oninput={handleSearch}
        onfocus={() => { if (searchResults.length > 0) showSearchResults = true; }}
        onblur={() => setTimeout(() => { showSearchResults = false; }, 200)}
        placeholder={t('search.placeholder')}
        class="w-32 lg:w-44 px-2 py-1 rounded text-xs border transition focus:outline-none {presentation.theme === 'dark'
          ? 'bg-neutral-950 border-neutral-700 text-neutral-100 placeholder-neutral-500 focus:border-amber-500'
          : 'bg-white border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-amber-500'}"
      />
    </div>

    <!-- Search icon for narrow screens -->
    <button
      type="button"
      class="md:hidden w-7 h-7 rounded flex items-center justify-center text-xs border {presentation.theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-neutral-300' : 'bg-neutral-100 border-neutral-300 text-neutral-700'}"
      onclick={() => { isMobileSearchOpen = !isMobileSearchOpen; }}
      title={t('search.label')}
    >
      🔍
    </button>

    {#if isMobileSearchOpen}
      <div class="absolute left-0 top-full mt-1 z-50 p-2 rounded-lg border shadow-xl {presentation.theme === 'dark' ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-neutral-300'}">
        <input
          type="text"
          bind:value={searchQuery}
          oninput={handleSearch}
          placeholder={t('search.placeholder')}
          class="w-48 px-2 py-1 rounded text-xs border focus:outline-none {presentation.theme === 'dark' ? 'bg-neutral-950 border-neutral-700 text-white' : 'bg-white border-neutral-300 text-neutral-900'}"
        />
      </div>
    {/if}

    {#if (showSearchResults || isMobileSearchOpen) && searchResults.length > 0}
      <div class="absolute left-0 top-full mt-1 w-60 rounded-md border shadow-2xl z-50 overflow-hidden max-h-56 overflow-y-auto {presentation.theme === 'dark' ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-white border-neutral-300 text-neutral-900'}">
        {#each searchResults as res}
          <button
            type="button"
            class="w-full text-left px-3 py-1.5 text-xs hover:bg-neutral-500/10 border-b border-neutral-500/20 last:border-0"
            onclick={() => selectSearchResult(res)}
          >
            <div class="font-semibold">{res.title}</div>
            {#if res.author}
              <div class="text-[10px] opacity-70">{res.author}</div>
            {/if}
          </button>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Right: Auxiliary & Settings Tools -->
  <div class="flex items-center space-x-1 shrink-0">
    <!-- Aspect Ratio Selector (Responsive: hidden on narrow, accessible in Settings) -->
    <div class="hidden sm:flex items-center gap-1 border rounded px-1.5 py-0.5 text-xs {presentation.theme === 'dark' ? 'bg-neutral-950 border-neutral-700 text-neutral-300' : 'bg-neutral-100 border-neutral-300 text-neutral-800'}">
      <span class="text-[10px] font-medium opacity-70">📐</span>
      <select
        value={presentation.aspectRatioMode === 'auto' ? 'auto' : presentation.aspectRatio}
        onchange={handleAspectRatioChange}
        class="bg-transparent text-xs focus:outline-none cursor-pointer"
        title={t('aspectRatio.label')}
      >
        <option value="auto" class="bg-neutral-900 text-white">{t('aspectRatio.auto')}</option>
        <option value="16:9" class="bg-neutral-900 text-white">16:9</option>
        <option value="16:10" class="bg-neutral-900 text-white">16:10</option>
        <option value="4:3" class="bg-neutral-900 text-white">4:3</option>
      </select>
    </div>

    <!-- Toggle Right Monitors Panel Button -->
    <button
      type="button"
      class="w-7 h-7 sm:w-auto sm:px-2 sm:py-1 rounded text-xs font-semibold flex items-center gap-1 transition border {presentation.isRightPanelOpen
        ? 'bg-sky-500/20 text-sky-400 border-sky-500/50'
        : presentation.theme === 'dark'
          ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border-neutral-700'
          : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border-neutral-300'}"
      onclick={() => presentation.toggleRightPanel()}
      title={t('toolbar.toggleMonitors')}
    >
      <span>🖥️</span>
      <span class="hidden xl:inline">{t('toolbar.toggleMonitors')}</span>
    </button>

    <!-- Beamer Output Launch Button (Always Visible) -->
    <button
      type="button"
      class="px-2 py-1 rounded text-xs font-bold flex items-center gap-1 transition shadow-sm border {presentation.isBeamerActive
        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
        : presentation.theme === 'dark'
          ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-700'
          : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border-neutral-300'}"
      onclick={() => presentation.toggleBeamer()}
      title={presentation.isBeamerActive ? t('toolbar.closeBeamer') : t('toolbar.openBeamer')}
    >
      <span class="w-2 h-2 rounded-full {presentation.isBeamerActive ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-400'}"></span>
      <span>📽️</span>
      <span class="hidden md:inline">{presentation.isBeamerActive ? t('toolbar.beamerActive') : t('toolbar.openBeamer')}</span>
    </button>

    <!-- Chords Toggle (Hidden on small screens) -->
    <button
      type="button"
      class="hidden lg:flex w-7 h-7 sm:w-auto sm:px-2 sm:py-1 rounded text-xs font-medium items-center gap-1 border transition {presentation.showChords
        ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
        : presentation.theme === 'dark'
          ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border-neutral-700'
          : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border-neutral-300'}"
      onclick={() => presentation.toggleChords()}
      title={t('toolbar.toggleChords')}
    >
      <span>🎸</span>
      <span class="hidden xl:inline">{t('toolbar.toggleChords')}</span>
    </button>

    <!-- Theme Switcher (Dark / Light Mode) -->
    <button
      type="button"
      class="w-7 h-7 sm:w-8 sm:h-8 rounded flex items-center justify-center text-xs border transition {presentation.theme === 'dark'
        ? 'bg-neutral-800 hover:bg-neutral-700 text-amber-300 border-neutral-700'
        : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border-neutral-300'}"
      onclick={() => presentation.toggleTheme()}
      title={t('toolbar.toggleTheme')}
    >
      {presentation.theme === 'dark' ? '🌙' : '☀️'}
    </button>

    <!-- UI Mode Switcher (SongBeamer Classic / Modern Studio) -->
    <button
      type="button"
      class="w-7 h-7 sm:w-8 sm:h-8 rounded flex items-center justify-center text-xs border transition {presentation.uiMode === 'classic'
        ? 'bg-sky-500/20 text-sky-400 border-sky-500/50'
        : presentation.theme === 'dark'
          ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border-neutral-700'
          : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border-neutral-300'}"
      onclick={() => presentation.toggleUiMode()}
      title="{t('toolbar.toggleUiMode')}: {presentation.uiMode === 'classic' ? 'SongBeamer' : 'Modern'}"
    >
      🎛️
    </button>

    <!-- App Settings Modal (Point 7) -->
    <button
      type="button"
      class="w-7 h-7 sm:w-8 sm:h-8 rounded flex items-center justify-center text-xs border transition {presentation.isSettingsOpen
        ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
        : presentation.theme === 'dark'
          ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border-neutral-700'
          : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border-neutral-300'}"
      onclick={() => presentation.toggleSettings()}
      title={t('toolbar.settings')}
    >
      ⚙️
    </button>
  </div>
</header>

