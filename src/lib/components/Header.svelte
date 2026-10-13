<script lang="ts">
  import { t } from '$lib/i18n';
  import { presentation } from '$lib/stores/presentation.svelte';
  import type { DisplayMode, AspectRatio, SongSearchResult } from '$lib/types/models';
  import ModernIcon from '$lib/components/icons/ModernIcon.svelte';
  import SongBeamerIcon from '$lib/components/icons/SongBeamerIcon.svelte';

  let searchQuery = $state<string>('');
  let searchResults = $state<SongSearchResult[]>([]);
  let showSearchResults = $state<boolean>(false);
  let isMobileSearchOpen = $state<boolean>(false);

  async function setMode(mode: DisplayMode) {
    if (!presentation.isBeamerActive) {
      await presentation.startBeamer(undefined, mode);
    } else {
      presentation.setDisplayMode(mode);
    }
  }

  async function handleCloseBeamer() {
    await presentation.closeBeamer();
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

{#if presentation.uiMode === 'classic'}
  <!-- 1. SongBeamer Classic Menubar -->
  <nav
    class="h-6 px-2 text-xs flex items-center space-x-3 select-none border-b font-sans {presentation.theme === 'dark'
      ? 'bg-[#2d3139] border-neutral-700 text-neutral-300'
      : 'bg-[#f0f0f0] border-neutral-300 text-neutral-800'}"
  >
    <button type="button" class="px-1.5 py-0.5 hover:bg-black/10 rounded cursor-pointer">{t('menu.file')}</button>
    <button type="button" class="px-1.5 py-0.5 hover:bg-black/10 rounded cursor-pointer">{t('menu.edit')}</button>
    <button type="button" class="px-1.5 py-0.5 hover:bg-black/10 rounded cursor-pointer">{t('menu.insert')}</button>
    <button
      type="button"
      class="px-1.5 py-0.5 hover:bg-black/10 rounded cursor-pointer"
      onclick={() => presentation.toggleBeamer()}
    >
      {t('menu.presentation')}
    </button>
    <button
      type="button"
      class="px-1.5 py-0.5 hover:bg-black/10 rounded cursor-pointer"
      onclick={() => presentation.toggleSettings()}
    >
      {t('menu.tools')}
    </button>
    <button
      type="button"
      class="px-1.5 py-0.5 hover:bg-black/10 rounded cursor-pointer"
      onclick={() => presentation.toggleSettings()}
    >
      {t('menu.help')}
    </button>
  </nav>

  <!-- 2. SongBeamer Classic Toolbar (Replicating SongBeamer 3.00 toolbar authentically) -->
  <header
    class="h-11 px-2.5 flex items-center justify-between select-none gap-1 border-b overflow-x-auto {presentation.theme === 'dark'
      ? 'bg-[#1f2228] border-neutral-700 text-neutral-200'
      : 'bg-[#ece9d8] border-neutral-300 text-neutral-900'}"
  >
    <div class="flex items-center space-x-0.5 shrink-0">
      <!-- File Tools -->
      <button type="button" class="p-1 hover:bg-black/10 rounded transition" title="Neu">
        <SongBeamerIcon name="new" size={21} />
      </button>
      <button type="button" class="p-1 hover:bg-black/10 rounded transition" title="Öffnen">
        <SongBeamerIcon name="open" size={21} />
      </button>
      <button type="button" class="p-1 hover:bg-black/10 rounded transition" title="Speichern">
        <SongBeamerIcon name="save" size={21} />
      </button>
      <button type="button" class="p-1 hover:bg-black/10 rounded transition" title="Drucken">
        <SongBeamerIcon name="print" size={21} />
      </button>
      <button type="button" class="p-1 hover:bg-black/10 rounded transition" title="Bearbeiten">
        <SongBeamerIcon name="edit" size={21} />
      </button>
      <div class="w-px h-6 bg-neutral-400/40 mx-0.5"></div>

      <!-- Media Insertion Tools -->
      <button type="button" class="p-1 hover:bg-black/10 rounded transition" title="Bibelstelle">
        <SongBeamerIcon name="bible" size={21} />
      </button>
      <button type="button" class="p-1 hover:bg-black/10 rounded transition" title="Video">
        <SongBeamerIcon name="video" size={21} />
      </button>
      <button type="button" class="p-1 hover:bg-black/10 rounded transition" title="Audio">
        <SongBeamerIcon name="audio" size={21} />
      </button>
      <button type="button" class="p-1 hover:bg-black/10 rounded transition" title="Lied">
        <SongBeamerIcon name="song" size={21} />
      </button>
      <button
        type="button"
        class="p-1 hover:bg-black/10 rounded transition {presentation.showChords ? 'bg-amber-500/20' : ''}"
        onclick={() => presentation.toggleChords()}
        title={t('toolbar.toggleChords')}
      >
        <SongBeamerIcon name="chords" size={21} />
      </button>
      <button
        type="button"
        class="p-1 hover:bg-black/10 rounded transition opacity-80 hover:opacity-100"
        title="Live-Video (Kamera-Eingang)"
      >
        <SongBeamerIcon name="camera" size={21} />
      </button>
      <div class="w-px h-6 bg-neutral-400/40 mx-1"></div>

      <!-- THE 4 PRESENTATION CONTROL BUTTONS -->
      <!-- 1. Folie mit Text anzeigen (F4) - Startet Beamer automatisch -->
      <button
        type="button"
        class="px-1.5 py-0.5 rounded flex items-center gap-1 border transition {presentation.isBeamerActive && presentation.displayMode === 'normal'
          ? 'bg-blue-600/25 border-blue-600 ring-1 ring-blue-500/50 shadow-inner'
          : 'border-transparent hover:bg-black/10'}"
        onclick={() => setMode('normal')}
        title="{t('toolbar.normal')} (F4)"
      >
        <SongBeamerIcon name="slide-text" size={23} />
      </button>

      <!-- 2. Folie ohne Text anzeigen (F6) - Startet Beamer automatisch -->
      <button
        type="button"
        class="px-1.5 py-0.5 rounded flex items-center gap-1 border transition {presentation.isBeamerActive && presentation.displayMode === 'clear_text'
          ? 'bg-blue-600/25 border-blue-600 ring-1 ring-blue-500/50 shadow-inner'
          : 'border-transparent hover:bg-black/10'}"
        onclick={() => setMode('clear_text')}
        title="{t('toolbar.clear')} (F6)"
      >
        <SongBeamerIcon name="slide-clear" size={23} />
      </button>

      <!-- 3. Schwarzes Bild (F5) - Startet Beamer automatisch -->
      <button
        type="button"
        class="px-1.5 py-0.5 rounded flex items-center gap-1 border transition {presentation.isBeamerActive && presentation.displayMode === 'black'
          ? 'bg-neutral-900 border-neutral-600 text-white ring-1 ring-neutral-500 shadow-inner'
          : 'border-transparent hover:bg-black/10'}"
        onclick={() => setMode('black')}
        title="{t('toolbar.black')} (F5)"
      >
        <SongBeamerIcon name="screen-black" size={23} />
      </button>

      <!-- 4. Bildschirm freigeben (Beamer beenden) -->
      <button
        type="button"
        class="px-1.5 py-0.5 rounded flex items-center gap-1 border transition {presentation.isBeamerActive
          ? 'border-red-500/50 bg-red-500/10 hover:bg-red-500/20 text-red-600 ring-1 ring-red-500/40'
          : 'border-transparent opacity-40 cursor-not-allowed'}"
        onclick={() => handleCloseBeamer()}
        disabled={!presentation.isBeamerActive}
        title={presentation.isBeamerActive ? "Zweiten Bildschirm freigeben (Beamer beenden)" : "Keine Präsentation aktiv"}
      >
        <SongBeamerIcon name="screen-close" size={23} />
      </button>

      <div class="w-px h-6 bg-neutral-400/40 mx-1"></div>

      <!-- Play & Slide Navigation -->
      <button
        type="button"
        class="p-1 hover:bg-black/10 rounded transition"
        onclick={() => presentation.nextSlide()}
        title="Weiter / Play"
      >
        <SongBeamerIcon name="play" size={19} />
      </button>
      <button
        type="button"
        class="p-1 hover:bg-black/10 rounded transition"
        onclick={() => presentation.prevSlide()}
        title="Vorherige Folie"
      >
        <SongBeamerIcon name="prev" size={19} />
      </button>
      <button
        type="button"
        class="p-1 hover:bg-black/10 rounded transition"
        onclick={() => presentation.nextSlide()}
        title="Nächste Folie"
      >
        <SongBeamerIcon name="next" size={19} />
      </button>
    </div>

    <!-- Right: Search + Settings -->
    <div class="flex items-center space-x-1.5 shrink-0 text-xs">
      <span class="text-[11px] font-medium hidden sm:inline">{t('search.label')}</span>
      <input
        type="text"
        bind:value={searchQuery}
        oninput={handleSearch}
        placeholder={t('search.placeholder')}
        class="w-28 sm:w-36 px-1.5 py-0.5 rounded text-xs border focus:outline-none {presentation.theme === 'dark'
          ? 'bg-neutral-900 border-neutral-700 text-white'
          : 'bg-white border-neutral-400 text-neutral-900'}"
      />

      <!-- Settings / UI Mode / Theme toggles -->
      <button
        type="button"
        class="p-1 hover:bg-black/10 rounded transition"
        onclick={() => presentation.toggleTheme()}
        title={t('toolbar.toggleTheme')}
      >
        {presentation.theme === 'dark' ? '🌙' : '☀️'}
      </button>
      <button
        type="button"
        class="p-1 hover:bg-black/10 rounded transition"
        onclick={() => presentation.toggleSettings()}
        title={t('toolbar.settings')}
      >
        ⚙️
      </button>
    </div>
  </header>
{:else}
  <!-- 2. Modern Studio Toolbar (Consistent modern vector icons & responsive layout) -->
  <header
    class="h-12 px-3 flex items-center justify-between select-none gap-2 shrink-0 border-b transition-colors {presentation.theme === 'dark'
      ? 'bg-neutral-900/90 border-neutral-800 text-neutral-100'
      : 'bg-white/95 border-slate-200 text-slate-900 shadow-xs'}"
  >
    <!-- Left: Brand Logo & Status Indicator -->
    <div class="flex items-center space-x-2.5 shrink-0">
      <div class="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center font-black text-neutral-950 text-xs shadow-sm">
        N
      </div>
      <span class="font-bold tracking-tight text-sm hidden sm:inline">
        {t('app.title')}
      </span>

      <!-- Live indicator -->
      <div
        class="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold {presentation.displayMode === 'normal'
          ? 'bg-red-500/15 text-red-500 border border-red-500/30'
          : presentation.theme === 'dark'
            ? 'bg-neutral-800 text-neutral-400 border border-neutral-700'
            : 'bg-slate-100 text-slate-600 border border-slate-200'}"
      >
        <span class="w-1.5 h-1.5 rounded-full {presentation.displayMode === 'normal' ? 'bg-red-500 animate-pulse' : 'bg-slate-400'}"></span>
        <span class="hidden md:inline">{presentation.displayMode === 'normal' ? t('status.live') : t('status.offline')}</span>
      </div>
    </div>

    <!-- Center-Left: Modern Vector Buttons for Projection Modes -->
    <div class="flex items-center space-x-1 shrink-0">
      <!-- 1. Folie mit Text (F4) -->
      <button
        type="button"
        class="w-8 h-8 rounded-lg flex items-center justify-center transition border {presentation.displayMode === 'normal'
          ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-400 ring-2 ring-emerald-500/30'
          : presentation.theme === 'dark'
            ? 'bg-neutral-800/80 hover:bg-neutral-700 border-neutral-700 text-neutral-300'
            : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'}"
        onclick={() => setMode('normal')}
        title={t('toolbar.normal')}
      >
        <ModernIcon name="slide-text" size={17} />
      </button>

      <!-- 2. Folie ohne Text (F6) -->
      <button
        type="button"
        class="w-8 h-8 rounded-lg flex items-center justify-center transition border {presentation.displayMode === 'clear_text'
          ? 'bg-sky-500/20 border-sky-500/60 text-sky-400 ring-2 ring-sky-500/30'
          : presentation.theme === 'dark'
            ? 'bg-neutral-800/80 hover:bg-neutral-700 border-neutral-700 text-neutral-300'
            : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'}"
        onclick={() => setMode('clear_text')}
        title={t('toolbar.clear')}
      >
        <ModernIcon name="slide-clear" size={17} />
      </button>

      <!-- 3. Schwarzes Bild (F5) -->
      <button
        type="button"
        class="w-8 h-8 rounded-lg flex items-center justify-center transition border {presentation.displayMode === 'black'
          ? 'bg-neutral-950 border-neutral-500 text-white ring-2 ring-neutral-400'
          : presentation.theme === 'dark'
            ? 'bg-neutral-800/80 hover:bg-neutral-700 border-neutral-700 text-neutral-300'
            : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'}"
        onclick={() => setMode('black')}
        title={t('toolbar.black')}
      >
        <ModernIcon name="screen-black" size={17} />
      </button>

      <!-- 4. Bildschirm freigeben (Beamer beenden) - Neben den 3 Modi-Buttons -->
      <button
        type="button"
        class="w-8 h-8 rounded-lg flex items-center justify-center transition border {presentation.isBeamerActive
          ? 'bg-red-500/15 border-red-500/60 hover:bg-red-500/25 text-red-400 ring-2 ring-red-500/30'
          : presentation.theme === 'dark'
            ? 'opacity-30 border-neutral-800 text-neutral-500 cursor-not-allowed'
            : 'opacity-30 border-slate-200 text-slate-400 cursor-not-allowed'}"
        onclick={() => handleCloseBeamer()}
        disabled={!presentation.isBeamerActive}
        title={presentation.isBeamerActive ? "Zweiten Bildschirm freigeben (Beamer beenden)" : "Keine Präsentation aktiv"}
      >
        <ModernIcon name="screen-close" size={17} />
      </button>

      <div class="w-px h-5 bg-neutral-300/40 dark:bg-neutral-700 mx-0.5"></div>

      <!-- 5. Logo (F7) -->
      <button
        type="button"
        class="w-8 h-8 rounded-lg flex items-center justify-center transition border {presentation.displayMode === 'logo'
          ? 'bg-amber-500/20 border-amber-500/60 text-amber-400 ring-2 ring-amber-500/30'
          : presentation.theme === 'dark'
            ? 'bg-neutral-800/80 hover:bg-neutral-700 border-neutral-700 text-neutral-300'
            : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'}"
        onclick={() => setMode('logo')}
        title={t('toolbar.logo')}
      >
        <ModernIcon name="logo" size={17} />
      </button>

      <!-- 6. Freeze (F8) -->
      <button
        type="button"
        class="w-8 h-8 rounded-lg flex items-center justify-center transition border {presentation.displayMode === 'frozen'
          ? 'bg-blue-500/20 border-blue-500/60 text-blue-400 ring-2 ring-blue-500/30'
          : presentation.theme === 'dark'
            ? 'bg-neutral-800/80 hover:bg-neutral-700 border-neutral-700 text-neutral-300'
            : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'}"
        onclick={() => setMode('frozen')}
        title={t('toolbar.freeze')}
      >
        <ModernIcon name="freeze" size={17} />
      </button>
    </div>

    <!-- Center: Modern Search Box -->
    <div class="relative flex items-center text-xs">
      <div class="hidden md:flex items-center gap-1.5 relative">
        <span class="absolute left-2.5 text-neutral-400 pointer-events-none">
          <ModernIcon name="search" size={14} />
        </span>
        <input
          type="text"
          bind:value={searchQuery}
          oninput={handleSearch}
          onfocus={() => { if (searchResults.length > 0) showSearchResults = true; }}
          onblur={() => setTimeout(() => { showSearchResults = false; }, 200)}
          placeholder={t('search.placeholder')}
          class="w-36 lg:w-48 pl-7 pr-2.5 py-1.5 rounded-lg text-xs border transition focus:outline-none {presentation.theme === 'dark'
            ? 'bg-neutral-950 border-neutral-700 text-neutral-100 placeholder-neutral-500 focus:border-amber-500'
            : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500'}"
        />
      </div>

      <!-- Small-screen Search Toggle -->
      <button
        type="button"
        class="md:hidden w-8 h-8 rounded-lg flex items-center justify-center text-xs border {presentation.theme === 'dark'
          ? 'bg-neutral-800 border-neutral-700 text-neutral-300'
          : 'bg-slate-100 border-slate-200 text-slate-700'}"
        onclick={() => { isMobileSearchOpen = !isMobileSearchOpen; }}
        title={t('search.label')}
      >
        <ModernIcon name="search" size={16} />
      </button>

      {#if isMobileSearchOpen}
        <div class="absolute left-0 top-full mt-1 z-50 p-2 rounded-xl border shadow-xl {presentation.theme === 'dark' ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-slate-200'}">
          <input
            type="text"
            bind:value={searchQuery}
            oninput={handleSearch}
            placeholder={t('search.placeholder')}
            class="w-48 px-2 py-1 rounded-lg text-xs border focus:outline-none {presentation.theme === 'dark' ? 'bg-neutral-950 border-neutral-700 text-white' : 'bg-white border-slate-300 text-slate-900'}"
          />
        </div>
      {/if}

      {#if (showSearchResults || isMobileSearchOpen) && searchResults.length > 0}
        <div class="absolute left-0 top-full mt-1 w-64 rounded-xl border shadow-2xl z-50 overflow-hidden max-h-56 overflow-y-auto {presentation.theme === 'dark' ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-white border-slate-200 text-slate-900'}">
          {#each searchResults as res}
            <button
              type="button"
              class="w-full text-left px-3 py-2 text-xs hover:bg-neutral-500/10 border-b border-neutral-500/10 last:border-0"
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
      <!-- Aspect Ratio Selector -->
      <div class="hidden sm:flex items-center gap-1 border rounded-lg px-2 py-1 text-xs {presentation.theme === 'dark' ? 'bg-neutral-950 border-neutral-700 text-neutral-300' : 'bg-slate-50 border-slate-200 text-slate-700'}">
        <ModernIcon name="aspect-ratio" size={14} class="opacity-70" />
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
        class="w-8 h-8 sm:w-auto sm:px-2.5 sm:py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border {presentation.isRightPanelOpen
          ? 'bg-sky-500/20 text-sky-400 border-sky-500/50'
          : presentation.theme === 'dark'
            ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border-neutral-700'
            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'}"
        onclick={() => presentation.toggleRightPanel()}
        title={t('toolbar.toggleMonitors')}
      >
        <ModernIcon name="monitors" size={16} />
        <span class="hidden xl:inline">{t('toolbar.toggleMonitors')}</span>
      </button>



      <!-- Chords Toggle -->
      <button
        type="button"
        class="hidden lg:flex w-8 h-8 sm:w-auto sm:px-2.5 sm:py-1 rounded-lg text-xs font-medium items-center gap-1.5 border transition {presentation.showChords
          ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
          : presentation.theme === 'dark'
            ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border-neutral-700'
            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'}"
        onclick={() => presentation.toggleChords()}
        title={t('toolbar.toggleChords')}
      >
        <ModernIcon name="chords" size={16} />
        <span class="hidden xl:inline">{t('toolbar.toggleChords')}</span>
      </button>

      <!-- Theme Switcher (Dark / Light Mode) -->
      <button
        type="button"
        class="w-8 h-8 rounded-lg flex items-center justify-center text-xs border transition {presentation.theme === 'dark'
          ? 'bg-neutral-800 hover:bg-neutral-700 text-amber-300 border-neutral-700'
          : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'}"
        onclick={() => presentation.toggleTheme()}
        title={t('toolbar.toggleTheme')}
      >
        {#if presentation.theme === 'dark'}
          <ModernIcon name="sun" size={16} />
        {:else}
          <ModernIcon name="moon" size={16} />
        {/if}
      </button>

      <!-- App Settings Modal -->
      <button
        type="button"
        class="w-8 h-8 rounded-lg flex items-center justify-center text-xs border transition {presentation.isSettingsOpen
          ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
          : presentation.theme === 'dark'
            ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border-neutral-700'
            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'}"
        onclick={() => presentation.toggleSettings()}
        title={t('toolbar.settings')}
      >
        <ModernIcon name="settings" size={16} />
      </button>
    </div>
  </header>
{/if}
