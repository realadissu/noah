<script lang="ts">
  import { t } from '$lib/i18n';
  import { presentation } from '$lib/stores/presentation.svelte';
  import LanguageSwitcher from './LanguageSwitcher.svelte';
  import type { DisplayMode, AspectRatio, SongSearchResult } from '$lib/types/models';

  interface Props {
    onLoadSample: () => void;
  }

  const { onLoadSample }: Props = $props();

  let searchQuery = $state<string>('');
  let searchResults = $state<SongSearchResult[]>([]);
  let showSearchResults = $state<boolean>(false);

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
    searchQuery = '';
  }
</script>

<header class="h-13 border-b border-neutral-800 bg-neutral-900/95 px-3 flex items-center justify-between select-none gap-2 shrink-0">
  <!-- Brand & Live Indicator -->
  <div class="flex items-center space-x-3 shrink-0">
    <div class="flex items-center space-x-2">
      <div class="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center font-black text-neutral-950 text-sm shadow">
        N
      </div>
      <div>
        <h1 class="text-sm font-bold tracking-tight text-neutral-100 flex items-center gap-1.5 leading-none">
          {t('app.title')}
          <span class="inline-flex items-center px-1 py-0.2 rounded text-[9px] font-semibold bg-neutral-800 text-neutral-400 border border-neutral-700">v0.1</span>
        </h1>
      </div>
    </div>

    <!-- Live indicator badge -->
    <div class="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold {presentation.displayMode === 'normal' ? 'bg-red-500/10 text-red-400 border border-red-500/30' : 'bg-neutral-800 text-neutral-400 border border-neutral-700'}">
      <span class="w-2 h-2 rounded-full {presentation.displayMode === 'normal' ? 'bg-red-500 animate-pulse' : 'bg-neutral-500'}"></span>
      {presentation.displayMode === 'normal' ? t('status.live') : t('status.offline')}
    </div>
  </div>

  <!-- SongBeamer Quick Search: "Song suchen: [ ]" -->
  <div class="relative flex items-center gap-1.5 text-xs text-neutral-300">
    <span class="font-medium text-neutral-400 whitespace-nowrap text-[11px]">{t('search.label')}</span>
    <input
      type="text"
      bind:value={searchQuery}
      oninput={handleSearch}
      onfocus={() => { if (searchResults.length > 0) showSearchResults = true; }}
      onblur={() => setTimeout(() => { showSearchResults = false; }, 200)}
      placeholder={t('search.placeholder')}
      class="w-36 lg:w-48 px-2 py-1 bg-neutral-950 border border-neutral-700 rounded text-xs text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-amber-500"
    />

    {#if showSearchResults && searchResults.length > 0}
      <div class="absolute left-0 top-full mt-1 w-64 bg-neutral-900 border border-neutral-700 rounded-md shadow-2xl z-50 overflow-hidden max-h-60 overflow-y-auto">
        {#each searchResults as res}
          <button
            type="button"
            class="w-full text-left px-3 py-1.5 text-xs hover:bg-neutral-800 border-b border-neutral-800/80 last:border-0"
            onclick={() => selectSearchResult(res)}
          >
            <div class="font-semibold text-neutral-200">{res.title}</div>
            {#if res.author}
              <div class="text-[10px] text-neutral-400">{res.author}</div>
            {/if}
          </button>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Output Blanking Controls (F4-F8) -->
  <div class="flex items-center space-x-1 shrink-0">
    <button
      type="button"
      class="px-2 py-1 rounded text-xs font-medium transition {presentation.displayMode === 'normal' ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 shadow-sm' : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700'}"
      onclick={() => setMode('normal')}
    >
      {t('toolbar.normal')}
    </button>
    <button
      type="button"
      class="px-2 py-1 rounded text-xs font-medium transition {presentation.displayMode === 'black' ? 'bg-neutral-950 text-white border border-neutral-600 shadow-inner' : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700'}"
      onclick={() => setMode('black')}
    >
      {t('toolbar.black')}
    </button>
    <button
      type="button"
      class="px-2 py-1 rounded text-xs font-medium transition {presentation.displayMode === 'clear_text' ? 'bg-sky-950 text-sky-300 border border-sky-600 shadow-inner' : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700'}"
      onclick={() => setMode('clear_text')}
    >
      {t('toolbar.clear')}
    </button>
    <button
      type="button"
      class="px-2 py-1 rounded text-xs font-medium transition {presentation.displayMode === 'logo' ? 'bg-amber-950 text-amber-300 border border-amber-600 shadow-inner' : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700'}"
      onclick={() => setMode('logo')}
    >
      {t('toolbar.logo')}
    </button>
    <button
      type="button"
      class="px-2 py-1 rounded text-xs font-medium transition {presentation.displayMode === 'frozen' ? 'bg-blue-950 text-blue-300 border border-blue-600 shadow-inner' : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700'}"
      onclick={() => setMode('frozen')}
    >
      {t('toolbar.freeze')}
    </button>
  </div>

  <!-- SongBeamer Language Switcher: Sprachen: [Alle] [1] [2] [3] -->
  <div class="hidden xl:flex items-center gap-1 text-[11px] text-neutral-400 bg-neutral-950/60 px-2 py-0.5 rounded border border-neutral-800">
    <span class="font-medium mr-1">{t('toolbar.languages')}:</span>
    <button
      type="button"
      class="px-1.5 py-0.2 rounded font-semibold {presentation.activeLanguageFilter === 'all' ? 'bg-sky-600 text-white' : 'text-neutral-400 hover:text-neutral-200'}"
      onclick={() => { presentation.activeLanguageFilter = 'all'; }}
    >
      {t('toolbar.langAll')}
    </button>
    <button
      type="button"
      class="px-1.5 py-0.2 rounded font-semibold {presentation.activeLanguageFilter === 1 ? 'bg-sky-600 text-white' : 'text-neutral-400 hover:text-neutral-200'}"
      onclick={() => { presentation.activeLanguageFilter = 1; }}
    >
      1
    </button>
    <button
      type="button"
      class="px-1.5 py-0.2 rounded font-semibold {presentation.activeLanguageFilter === 2 ? 'bg-sky-600 text-white' : 'text-neutral-400 hover:text-neutral-200'}"
      onclick={() => { presentation.activeLanguageFilter = 2; }}
    >
      2
    </button>
  </div>

  <!-- Aspect Ratio, Monitors Drawer Toggle, Beamer & Locale -->
  <div class="flex items-center space-x-1.5 shrink-0">
    <!-- Aspect Ratio Selector (Requirement 3) -->
    <div class="flex items-center gap-1 bg-neutral-950 border border-neutral-700 rounded px-1.5 py-0.5 text-xs text-neutral-300">
      <span class="text-[10px] text-neutral-400 font-medium">📐</span>
      <select
        value={presentation.aspectRatioMode === 'auto' ? 'auto' : presentation.aspectRatio}
        onchange={handleAspectRatioChange}
        class="bg-transparent text-xs text-neutral-200 focus:outline-none cursor-pointer"
        title={t('aspectRatio.label')}
      >
        <option value="auto" class="bg-neutral-900 text-neutral-200">{t('aspectRatio.auto')}</option>
        <option value="16:9" class="bg-neutral-900 text-neutral-200">16:9</option>
        <option value="16:10" class="bg-neutral-900 text-neutral-200">16:10</option>
        <option value="4:3" class="bg-neutral-900 text-neutral-200">4:3</option>
      </select>
    </div>

    <!-- Toggle Right Monitors Panel Button (Requirement 1) -->
    <button
      type="button"
      class="px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 transition {presentation.isRightPanelOpen ? 'bg-sky-500/20 text-sky-300 border border-sky-500/50' : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700'}"
      onclick={() => presentation.toggleRightPanel()}
      title={t('toolbar.toggleMonitors')}
    >
      <span>🖥️</span>
      <span class="hidden sm:inline">{t('toolbar.toggleMonitors')}</span>
    </button>

    <!-- Beamer Output Toggle Button -->
    <button
      type="button"
      class="px-2 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition shadow-sm {presentation.isBeamerActive ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/50' : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700'}"
      onclick={() => presentation.toggleBeamer()}
      title={presentation.isBeamerActive ? t('toolbar.closeBeamer') : t('toolbar.openBeamer')}
    >
      <span class="w-2 h-2 rounded-full {presentation.isBeamerActive ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-500'}"></span>
      <span>📽️ {presentation.isBeamerActive ? t('toolbar.beamerActive') : t('toolbar.openBeamer')}</span>
      {#if presentation.activeDisplay}
        <span class="text-[10px] text-emerald-400/80 font-normal hidden lg:inline">({presentation.activeDisplay.name})</span>
      {/if}
    </button>

    <button
      type="button"
      class="px-2 py-1 rounded text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition"
      onclick={() => presentation.toggleChords()}
    >
      {presentation.showChords ? `✓ ${t('toolbar.toggleChords')}` : t('toolbar.toggleChords')}
    </button>

    <button
      type="button"
      class="px-2.5 py-1 rounded text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-neutral-950 transition shadow"
      onclick={onLoadSample}
    >
      {t('toolbar.loadSample')}
    </button>

    <LanguageSwitcher />
  </div>
</header>
