<script lang="ts">
  import { presentation } from '$lib/stores/presentation.svelte';
  import { t } from '$lib/i18n';
  import SongBeamerIcon from '$lib/components/icons/SongBeamerIcon.svelte';
  import type { Song, SongSearchResult } from '$lib/types/models';
  import {
    getCcliSession,
    loginCcli,
    logoutCcli,
    searchSongSelect,
    type SongSelectSong,
    type CcliSession,
  } from '$lib/services/ccli';

  let activeTab = $state<'local' | 'songselect'>(presentation.songSearchInitialTab || 'local');
  let searchQuery = $state<string>('');
  let isSearching = $state<boolean>(false);

  // Local Search State
  let localResults = $state<SongSearchResult[]>([]);
  let selectedLocalIndex = $state<number>(0);
  let selectedLocalSong = $state<Song | null>(null);
  let isLoadingDetails = $state<boolean>(false);

  // CCLI SongSelect State
  let ccliSession = $state<CcliSession | null>(getCcliSession());
  let isLoginBrowserOpen = $state<boolean>(false);
  let ccliEmail = $state<string>('worship@church.org');
  let ccliPassword = $state<string>('••••••••');
  let ccliLicense = $state<string>('7482910');
  let isLoggingIn = $state<boolean>(false);
  let loginError = $state<string>('');
  let ccliResults = $state<SongSelectSong[]>([]);
  let selectedCcliIndex = $state<number>(0);

  // Save Destination Prompt State (When importing from SongSelect)
  let isSavePromptOpen = $state<boolean>(false);
  let targetFolder = $state<string>(presentation.songsDirectory || 'C:/Songs');
  let targetFileName = $state<string>('');
  let isImporting = $state<boolean>(false);

  let searchInputEl: HTMLInputElement | null = null;

  // Selected song getter depending on active tab
  const currentCcliSong = $derived<SongSelectSong | null>(
    activeTab === 'songselect' && ccliResults.length > selectedCcliIndex
      ? ccliResults[selectedCcliIndex]
      : null
  );

  // Continuous song lyrics text (no boxes, no labels, just natural stanzas)
  let continuousLyrics = $derived.by(() => {
    if (activeTab === 'local') {
      if (!selectedLocalSong) return '';
      return selectedLocalSong.slides
        .map((s) => s.raw_content.trim())
        .filter(Boolean)
        .join('\n\n');
    } else {
      if (!currentCcliSong) return '';
      return currentCcliSong.sections
        .map((sec) => sec.lines.join('\n').trim())
        .filter(Boolean)
        .join('\n\n');
    }
  });

  // Load initial results when modal mounts
  $effect(() => {
    if (activeTab === 'songselect' && !ccliSession?.connected) {
      isLoginBrowserOpen = true;
    }
    executeSearch();
    if (searchInputEl) {
      setTimeout(() => searchInputEl?.focus(), 50);
    }
  });

  async function executeSearch(queryOverride?: string) {
    if (queryOverride !== undefined) {
      searchQuery = queryOverride;
    }
    const q = searchQuery.trim();
    if (q.length < 2) {
      localResults = [];
      ccliResults = [];
      selectedLocalSong = null;
      selectedLocalIndex = 0;
      selectedCcliIndex = 0;
      isSearching = false;
      return;
    }

    isSearching = true;
    try {
      if (activeTab === 'local') {
        const res = await presentation.searchSongs(q, 200);
        localResults = res;
        selectedLocalIndex = 0;
        if (res.length > 0) {
          await loadSelectedLocalDetails(res[0]);
        } else {
          selectedLocalSong = null;
        }
      } else {
        const res = await searchSongSelect(q);
        ccliResults = res;
        selectedCcliIndex = 0;
      }
    } finally {
      isSearching = false;
    }
  }

  async function handleTabChange(tab: 'local' | 'songselect') {
    activeTab = tab;
    if (tab === 'songselect' && !ccliSession?.connected) {
      isLoginBrowserOpen = true;
    }
    await executeSearch();
    setTimeout(() => searchInputEl?.focus(), 50);
  }

  async function handleSelectLocal(idx: number) {
    selectedLocalIndex = idx;
    const target = localResults[idx];
    if (target) {
      await loadSelectedLocalDetails(target);
    }
  }

  async function loadSelectedLocalDetails(item: SongSearchResult) {
    isLoadingDetails = true;
    try {
      const details = await presentation.getSongDetails(item);
      selectedLocalSong = details;
    } finally {
      isLoadingDetails = false;
    }
  }

  // Key navigation
  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      if (isSavePromptOpen) {
        isSavePromptOpen = false;
        return;
      }
      if (isLoginBrowserOpen) {
        isLoginBrowserOpen = false;
        return;
      }
      presentation.closeSongSearchModal();
      return;
    }

    if (activeTab === 'local') {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (selectedLocalIndex < localResults.length - 1) {
          handleSelectLocal(selectedLocalIndex + 1);
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (selectedLocalIndex > 0) {
          handleSelectLocal(selectedLocalIndex - 1);
        }
      } else if (e.key === 'Enter' && !isSavePromptOpen && !isLoginBrowserOpen) {
        e.preventDefault();
        if (selectedLocalSong) {
          addSelectedLocalToSchedule();
        }
      }
    } else {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (selectedCcliIndex < ccliResults.length - 1) {
          selectedCcliIndex++;
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (selectedCcliIndex > 0) {
          selectedCcliIndex--;
        }
      } else if (e.key === 'Enter' && !isSavePromptOpen && !isLoginBrowserOpen) {
        e.preventDefault();
        if (currentCcliSong) {
          openSavePromptForCcli();
        }
      }
    }
  }

  function addSelectedLocalToSchedule() {
    if (!selectedLocalSong) return;
    presentation.addSongToSchedule(selectedLocalSong);
    presentation.closeSongSearchModal();
  }

  function editSelectedLocalSong() {
    if (!selectedLocalSong) return;
    presentation.openSongEditor(selectedLocalSong);
    presentation.closeSongSearchModal();
  }

  function presentSelectedLocalDirectly() {
    if (!selectedLocalSong) return;
    presentation.setSong(selectedLocalSong);
    if (!presentation.isBeamerActive) {
      presentation.toggleBeamer();
    }
    presentation.closeSongSearchModal();
  }

  // CCLI Login Actions
  async function performCcliLogin() {
    isLoggingIn = true;
    loginError = '';
    try {
      if (!ccliEmail.includes('@')) {
        loginError = 'Bitte eine gültige E-Mail-Adresse angeben.';
        return;
      }
      const session = await loginCcli(ccliEmail, ccliPassword, ccliLicense);
      ccliSession = session;
      isLoginBrowserOpen = false;
      await executeSearch();
    } catch (err) {
      loginError = 'CCLI-Anmeldung fehlgeschlagen: ' + String(err);
    } finally {
      isLoggingIn = false;
    }
  }

  function performCcliLogout() {
    logoutCcli();
    ccliSession = null;
  }

  // CCLI Import & Save Workflow
  function openSavePromptForCcli() {
    if (!currentCcliSong) return;
    targetFolder = presentation.songsDirectory || 'C:/Songs';
    const cleanTitle = currentCcliSong.title.replace(/[\\/:*?"<>|]/g, '');
    targetFileName = `${cleanTitle}.sng`;
    isSavePromptOpen = true;
  }

  async function handleBrowseFolder() {
    const picked = await presentation.pickFolder(t('songSearch.saveLocationTitle'));
    if (picked) {
      targetFolder = picked;
    }
  }

  async function confirmSaveAndImportCcli() {
    if (!currentCcliSong) return;
    isImporting = true;
    try {
      const folder = targetFolder.trim().replace(/[\\/]$/, '');
      const file = targetFileName.trim().endsWith('.sng') ? targetFileName.trim() : `${targetFileName.trim()}.sng`;
      const fullPath = `${folder}/${file}`;

      await presentation.importAndAddCcliSong(currentCcliSong, fullPath);

      // Re-scan local archive so the new file is immediately indexed
      presentation.loadLocalArchive().catch(console.error);

      isSavePromptOpen = false;
      presentation.closeSongSearchModal();
    } finally {
      isImporting = false;
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- Modal Backdrop -->
<div
  id="sb-song-search-modal"
  class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none"
  role="dialog"
  aria-modal="true"
  aria-labelledby="sb-song-search-title"
>
  <!-- Window Container: Fixed Size (880px x 580px), Never Resizes -->
  <div
    class="flex flex-col w-[880px] h-[580px] max-w-[95vw] max-h-[90vh] bg-[#f0f0f0] dark:bg-[#1e2227] text-neutral-900 dark:text-neutral-100 border-2 border-blue-600 dark:border-neutral-600 shadow-2xl rounded-none overflow-hidden relative"
    style="width: 880px; height: 580px;"
  >
    <!-- Modal Titlebar (Height: 36px, Rich Blue Header with pure white text) -->
    <div
      class="h-9 flex items-center justify-between px-3 text-white font-bold text-sm shrink-0 select-none"
      style="background-color: #2563eb; color: #ffffff;"
    >
      <div class="flex items-center gap-2">
        <SongBeamerIcon name={activeTab === 'local' ? 'song-search' : 'ccli'} size={16} />
        <span id="sb-song-search-title">
          {activeTab === 'local' ? t('songSearch.title') : 'SongSelect (CCLI) - Liedersuche & Import'}
        </span>
      </div>
      <button
        type="button"
        id="sb-song-search-close-x"
        class="w-6 h-6 flex items-center justify-center hover:bg-red-600 active:bg-red-700 text-white font-mono text-sm leading-none cursor-pointer"
        onclick={() => presentation.closeSongSearchModal()}
        title={t('songSearch.close')}
        aria-label={t('songSearch.close')}
      >
        ✕
      </button>
    </div>

    <!-- Modal Header Toolbar: Unified Search Input + Source Mode Tabs -->
    <div
      class="p-2.5 bg-neutral-200 dark:bg-neutral-800 border-b border-neutral-300 dark:border-neutral-700 flex items-center justify-between gap-3 shrink-0"
    >
      <!-- Same Search Input for both Local and SongSelect -->
      <div class="relative flex-1">
        <input
          id="sb-song-search-input"
          bind:this={searchInputEl}
          type="text"
          bind:value={searchQuery}
          oninput={(e) => executeSearch((e.target as HTMLInputElement).value)}
          placeholder={activeTab === 'local' ? t('songSearch.placeholder') : 'SongSelect: Titel, Liedtext, Autor oder CCLI-Nummer...'}
          class="w-full h-9 px-3 pr-8 border border-neutral-400 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 rounded-none text-sm font-medium focus:outline-none focus:border-blue-600"
        />
        {#if searchQuery}
          <button
            type="button"
            class="absolute right-2.5 top-2 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 text-sm font-bold cursor-pointer"
            onclick={() => {
              searchQuery = '';
              executeSearch('');
            }}
          >
            ✕
          </button>
        {/if}
      </div>

      <!-- Mode Switch: Lokales Archiv vs. SongSelect (CCLI) -->
      <div class="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          id="sb-tab-local"
          class="h-9 px-3.5 flex items-center gap-1.5 text-sm font-semibold border transition-colors cursor-pointer {activeTab === 'local'
            ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
            : 'bg-white dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-600'}"
          style={activeTab === 'local' ? 'background-color: #2563eb; color: #ffffff;' : ''}
          onclick={() => handleTabChange('local')}
        >
          <span>📁</span>
          <span>{t('songSearch.tabLocal')}</span>
        </button>

        <button
          type="button"
          id="sb-tab-songselect"
          class="h-9 px-3.5 flex items-center gap-1.5 text-sm font-semibold border transition-colors cursor-pointer {activeTab === 'songselect'
            ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
            : 'bg-white dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-600'}"
          style={activeTab === 'songselect' ? 'background-color: #2563eb; color: #ffffff;' : ''}
          onclick={() => handleTabChange('songselect')}
        >
          <SongBeamerIcon name="ccli" size={15} />
          <span>{t('songSearch.tabSongSelect')}</span>
          {#if ccliSession?.connected}
            <span class="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title={t('songSearch.ccliConnected')}></span>
          {/if}
        </button>

        {#if ccliSession?.connected}
          <button
            type="button"
            id="sb-btn-disconnect-ccli"
            class="h-9 px-2 text-xs text-neutral-500 hover:text-red-600 underline cursor-pointer"
            onclick={performCcliLogout}
            title={t('songSearch.ccliLogout')}
          >
            {t('songSearch.ccliLogout')}
          </button>
        {/if}
      </div>
    </div>

    <!-- Main Two-Column Body: Fixed Height, Independent Scroll -->
    <div class="flex-1 flex min-h-0 overflow-hidden">
      <!-- ======================================================== -->
      <!-- LEFT COLUMN: Search Results (Width: 380px)               -->
      <!-- ======================================================== -->
      <div
        id="sb-song-search-results-list"
        class="border-r border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#181a1f] flex flex-col overflow-hidden shrink-0"
        style="width: 380px; min-width: 380px;"
      >
        <!-- Sub-header: Count -->
        <div class="px-3 py-2 bg-neutral-100 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 text-sm font-semibold text-neutral-700 dark:text-neutral-300 flex items-center justify-between shrink-0">
          <span>
            {#if activeTab === 'local'}
              {localResults.length > 0
                ? t('songSearch.songsFound', { count: localResults.length })
                : t('songSearch.tabLocal')}
            {:else}
              {ccliResults.length > 0
                ? `SongSelect: ${ccliResults.length} Lieder`
                : 'SongSelect'}
            {/if}
          </span>
          {#if isSearching}
            <span class="text-blue-600 animate-pulse text-sm">...</span>
          {/if}
        </div>

        <!-- Results List Scroll Area -->
        <div class="flex-1 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800">
          {#if activeTab === 'local'}
            {#if localResults.length === 0}
              <div class="p-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
                {searchQuery.trim().length >= 2 ? t('songSearch.noSongsFound', { query: searchQuery }) : t('songSearch.searchPrompt')}
              </div>
            {:else}
              {#each localResults as item, idx}
                {@const isSelected = selectedLocalIndex === idx}
                <div
                  role="button"
                  tabindex="0"
                  data-search-result-idx={idx}
                  style={isSelected ? 'background-color: #2563eb; color: #ffffff;' : ''}
                  class="px-3 py-2 text-left cursor-pointer transition-colors {isSelected
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'bg-white dark:bg-[#181a1f] text-neutral-900 dark:text-neutral-100 hover:bg-slate-100 dark:hover:bg-neutral-800'}"
                  onclick={() => handleSelectLocal(idx)}
                  ondblclick={addSelectedLocalToSchedule}
                  onkeydown={(e) => {
                    if (e.key === 'Enter') addSelectedLocalToSchedule();
                  }}
                >
                  <!-- Title only, with composer in parentheses if present; no folders, no key badges -->
                  <span class="text-sm select-none break-words">
                    {item.title}{item.author ? ` (${item.author})` : ''}
                  </span>
                </div>
              {/each}
            {/if}
          {:else}
            <!-- SongSelect Results List -->
            {#if ccliResults.length === 0}
              <div class="p-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
                {searchQuery.trim().length >= 2 ? t('songSearch.noSongsFound', { query: searchQuery }) : t('songSearch.searchPrompt')}
              </div>
            {:else}
              {#each ccliResults as ccliItem, idx}
                {@const isSelected = selectedCcliIndex === idx}
                <div
                  role="button"
                  tabindex="0"
                  data-ccli-result-idx={idx}
                  style={isSelected ? 'background-color: #2563eb; color: #ffffff;' : ''}
                  class="px-3 py-2 text-left cursor-pointer transition-colors {isSelected
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'bg-white dark:bg-[#181a1f] text-neutral-900 dark:text-neutral-100 hover:bg-slate-100 dark:hover:bg-neutral-800'}"
                  onclick={() => (selectedCcliIndex = idx)}
                  ondblclick={openSavePromptForCcli}
                  onkeydown={(e) => {
                    if (e.key === 'Enter') openSavePromptForCcli();
                  }}
                >
                  <div class="flex items-start justify-between gap-1">
                    <span class="text-sm select-none break-words font-medium">
                      {ccliItem.title}{ccliItem.authors ? ` (${ccliItem.authors})` : ''}
                    </span>
                  </div>
                  <div class="text-xs {isSelected ? 'text-blue-100' : 'text-neutral-500 dark:text-neutral-400'} font-mono mt-0.5">
                    CCLI #{ccliItem.ccliNumber} {#if ccliItem.titleSecondary}• {ccliItem.titleSecondary}{/if}
                  </div>
                </div>
              {/each}
            {/if}
          {/if}
        </div>
      </div>

      <!-- ======================================================== -->
      <!-- RIGHT COLUMN: Continuous Text Preview                    -->
      <!-- ======================================================== -->
      <div
        id="sb-song-search-preview"
        class="flex-1 flex flex-col bg-white dark:bg-[#21252b] overflow-hidden min-w-0"
      >
        {#if (activeTab === 'local' && selectedLocalSong) || (activeTab === 'songselect' && currentCcliSong)}
          <!-- Metadata Bar: Clean title & composer -->
          <div class="px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-300 dark:border-neutral-700 shrink-0 flex items-center justify-between gap-2">
            <div class="truncate">
              <h3 class="text-sm font-bold text-neutral-900 dark:text-white truncate">
                {activeTab === 'local' ? selectedLocalSong?.metadata.title : currentCcliSong?.title}
              </h3>
              <div class="text-sm text-neutral-600 dark:text-neutral-400 truncate">
                {activeTab === 'local' ? selectedLocalSong?.metadata.author : currentCcliSong?.authors}
              </div>
            </div>
            {#if isLoadingDetails}
              <span class="text-xs text-blue-500 animate-pulse">Lade...</span>
            {:else if activeTab === 'songselect' && currentCcliSong}
              <span class="text-xs font-mono px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                CCLI #{currentCcliSong.ccliNumber}
              </span>
            {/if}
          </div>

          <!-- Continuous Lyrics Text: Light background, no boxes, no Folie labels -->
          <div
            id="sb-song-search-preview-text"
            class="flex-1 p-6 bg-white dark:bg-[#21252b] text-neutral-900 dark:text-neutral-100 overflow-y-auto whitespace-pre-wrap font-sans text-sm leading-relaxed select-text"
          >
            {continuousLyrics}
          </div>
        {:else}
          <!-- Empty State -->
          <div class="flex-1 flex flex-col items-center justify-center p-8 text-neutral-400 dark:text-neutral-500 text-center select-none">
            <span class="text-4xl mb-2">🎵</span>
            <p class="text-sm">
              {searchQuery.trim().length >= 2
                ? t('songSearch.selectSongToPreview')
                : t('songSearch.searchPrompt')}
            </p>
          </div>
        {/if}
      </div>
    </div>

    <!-- Modal Footer: Spans full width under both columns -->
    <div
      class="h-12 px-3 bg-neutral-200 dark:bg-neutral-800 border-t border-neutral-300 dark:border-neutral-700 flex items-center justify-between shrink-0 select-none"
    >
      <div class="flex items-center gap-2">
        {#if activeTab === 'local'}
          <button
            type="button"
            id="sb-btn-add-schedule"
            style="background-color: #2563eb; color: #ffffff;"
            class="h-8 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold rounded-none shadow-xs cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
            disabled={!selectedLocalSong}
            onclick={addSelectedLocalToSchedule}
          >
            <span>✓</span>
            <span>{t('songSearch.addToSchedule')}</span>
          </button>
          <button
            type="button"
            id="sb-btn-edit-song"
            class="h-8 px-4 bg-white dark:bg-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-600 border border-neutral-300 dark:border-neutral-600 text-neutral-800 dark:text-neutral-200 text-sm font-semibold cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
            disabled={!selectedLocalSong}
            onclick={editSelectedLocalSong}
          >
            <span>✏️</span>
            <span>{t('songSearch.editSong')}</span>
          </button>
          <button
            type="button"
            id="sb-btn-present-live"
            class="h-8 px-4 bg-white dark:bg-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-600 border border-neutral-300 dark:border-neutral-600 text-neutral-800 dark:text-neutral-200 text-sm font-semibold cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
            disabled={!selectedLocalSong}
            onclick={presentSelectedLocalDirectly}
          >
            <span>▶</span>
            <span>{t('songSearch.presentLive')}</span>
          </button>
        {:else}
          <!-- SongSelect Import Action: Asks where to save and inserts into schedule -->
          <button
            type="button"
            id="sb-btn-import-ccli"
            style="background-color: #2563eb; color: #ffffff;"
            class="h-8 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold rounded-none shadow-xs cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
            disabled={!currentCcliSong}
            onclick={openSavePromptForCcli}
          >
            <span>✓</span>
            <span>In Ablauf importieren...</span>
          </button>
        {/if}
      </div>

      <button
        type="button"
        id="sb-btn-close-search"
        class="h-8 px-5 bg-white dark:bg-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-600 border border-neutral-300 dark:border-neutral-600 text-neutral-800 dark:text-neutral-200 text-sm font-semibold cursor-pointer flex items-center justify-center"
        onclick={() => presentation.closeSongSearchModal()}
      >
        {t('songSearch.close')}
      </button>
    </div>

    <!-- ======================================================== -->
    <!-- POPUP 1: Small Browser Window for CCLI Login             -->
    <!-- Opens when user switches to SongSelect if not logged in  -->
    <!-- Closes automatically upon successful login               -->
    <!-- ======================================================== -->
    {#if isLoginBrowserOpen}
      <div
        id="sb-ccli-browser-window-backdrop"
        class="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
      >
        <!-- Browser Window Container -->
        <div
          id="sb-ccli-browser-window"
          class="w-[490px] bg-white dark:bg-neutral-900 border-2 border-blue-600 shadow-2xl flex flex-col overflow-hidden text-neutral-900 dark:text-neutral-100"
        >
          <!-- Browser Window Titlebar -->
          <div
            class="h-8 bg-neutral-800 text-white px-3 flex items-center justify-between text-xs font-semibold shrink-0"
          >
            <div class="flex items-center gap-2">
              <span class="text-amber-400">🔑</span>
              <span>CCLI SongSelect® - Anmeldung</span>
            </div>
            <button
              type="button"
              id="sb-btn-ccli-browser-close"
              class="w-5 h-5 flex items-center justify-center hover:bg-red-600 text-white font-mono text-xs cursor-pointer"
              onclick={() => (isLoginBrowserOpen = false)}
            >
              ✕
            </button>
          </div>

          <!-- Browser Address Bar -->
          <div class="px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 border-b border-neutral-300 dark:border-neutral-700 flex items-center gap-2 shrink-0">
            <span class="text-xs">🔒</span>
            <div
              id="sb-ccli-browser-address-bar"
              class="flex-1 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-600 px-2 py-0.5 text-xs font-mono text-neutral-600 dark:text-neutral-400 select-all truncate"
            >
              https://profile.ccli.com/account/login
            </div>
          </div>

          <!-- Browser Webpage Content Area -->
          <div class="p-6 space-y-4">
            <div class="text-center pb-2 border-b border-neutral-200 dark:border-neutral-700">
              <h2 class="text-base font-bold text-neutral-900 dark:text-white">
                CCLI SongSelect® Anmelden
              </h2>
              <p class="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                Geben Sie Ihre Zugangsdaten ein. Nach erfolgreicher Anmeldung schließt sich dieses Fenster automatisch.
              </p>
            </div>

            {#if loginError}
              <div class="p-2.5 bg-red-100 dark:bg-red-950/60 border border-red-300 text-red-700 dark:text-red-300 text-xs font-medium">
                {loginError}
              </div>
            {/if}

            <div class="space-y-3">
              <div>
                <label for="sb-ccli-email" class="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  {t('songSearch.ccliEmail')}
                </label>
                <input
                  id="sb-ccli-email"
                  type="email"
                  bind:value={ccliEmail}
                  class="w-full h-8 px-2.5 border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label for="sb-ccli-pwd" class="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  {t('songSearch.ccliPassword')}
                </label>
                <input
                  id="sb-ccli-pwd"
                  type="password"
                  bind:value={ccliPassword}
                  class="w-full h-8 px-2.5 border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label for="sb-ccli-lic" class="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  {t('songSearch.ccliLicense')}
                </label>
                <input
                  id="sb-ccli-lic"
                  type="text"
                  bind:value={ccliLicense}
                  class="w-full h-8 px-2.5 border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <!-- Browser Footer Action Buttons -->
            <div class="pt-3 border-t border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
              <button
                type="button"
                id="sb-btn-ccli-demo-login"
                class="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                onclick={() => {
                  ccliEmail = 'worship@church.org';
                  ccliLicense = '7482910';
                  performCcliLogin();
                }}
              >
                {t('songSearch.ccliDemoLoginBtn')}
              </button>

              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="h-8 px-3 border border-neutral-300 dark:border-neutral-600 text-xs font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                  onclick={() => (isLoginBrowserOpen = false)}
                >
                  {t('songSearch.cancel')}
                </button>
                <button
                  type="button"
                  id="sb-btn-ccli-submit-login"
                  style="background-color: #2563eb; color: #ffffff;"
                  class="h-8 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                  disabled={isLoggingIn}
                  onclick={performCcliLogin}
                >
                  {isLoggingIn ? 'Anmelden...' : t('songSearch.ccliLoginBtn')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    {/if}

    <!-- ======================================================== -->
    <!-- POPUP 2: Save Destination Dialog                         -->
    <!-- Asks where to save the .sng file before adding to Ablauf -->
    <!-- ======================================================== -->
    {#if isSavePromptOpen && currentCcliSong}
      <div
        id="sb-save-prompt-backdrop"
        class="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
      >
        <div
          id="sb-save-prompt-dialog"
          class="w-[520px] bg-white dark:bg-neutral-900 border-2 border-blue-600 shadow-2xl flex flex-col overflow-hidden text-neutral-900 dark:text-neutral-100"
        >
          <!-- Save Dialog Titlebar -->
          <div
            class="h-8 bg-blue-600 text-white px-3 flex items-center justify-between text-xs font-bold shrink-0 select-none"
            style="background-color: #2563eb; color: #ffffff;"
          >
            <span>{t('songSearch.saveLocationTitle')}</span>
            <button
              type="button"
              class="w-5 h-5 flex items-center justify-center hover:bg-red-600 text-white font-mono text-xs cursor-pointer"
              onclick={() => (isSavePromptOpen = false)}
            >
              ✕
            </button>
          </div>

          <!-- Save Dialog Form -->
          <div class="p-5 space-y-4">
            <p class="text-xs text-neutral-600 dark:text-neutral-400">
              Das Lied <strong>{currentCcliSong.title}</strong> wird als .sng-Datei gespeichert und direkt in Ihren Ablaufplan eingefügt.
            </p>

            <div class="space-y-3">
              <div>
                <label for="sb-save-target-folder" class="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  {t('songSearch.saveLocationFolder')}
                </label>
                <div class="flex items-center gap-2">
                  <input
                    id="sb-save-target-folder"
                    type="text"
                    bind:value={targetFolder}
                    class="flex-1 h-8 px-2.5 border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm font-mono focus:outline-none focus:border-blue-600"
                  />
                  <button
                    type="button"
                    class="h-8 px-3 border border-neutral-300 dark:border-neutral-600 bg-neutral-100 dark:bg-neutral-700 text-xs font-medium hover:bg-neutral-200 dark:hover:bg-neutral-600 cursor-pointer shrink-0"
                    onclick={handleBrowseFolder}
                  >
                    📁 {t('songSearch.browseFolder')}
                  </button>
                </div>
              </div>

              <div>
                <label for="sb-save-target-file" class="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  {t('songSearch.saveLocationFile')}
                </label>
                <input
                  id="sb-save-target-file"
                  type="text"
                  bind:value={targetFileName}
                  class="w-full h-8 px-2.5 border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm font-mono focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <!-- Save Dialog Buttons -->
            <div class="pt-3 border-t border-neutral-200 dark:border-neutral-700 flex items-center justify-end gap-2">
              <button
                type="button"
                class="h-8 px-4 border border-neutral-300 dark:border-neutral-600 text-xs font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                onclick={() => (isSavePromptOpen = false)}
              >
                {t('songSearch.cancel')}
              </button>
              <button
                type="button"
                id="sb-btn-confirm-save-import"
                style="background-color: #2563eb; color: #ffffff;"
                class="h-8 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                disabled={isImporting || !targetFileName.trim()}
                onclick={confirmSaveAndImportCcli}
              >
                <span>✓</span>
                <span>{isImporting ? 'Speichern...' : t('songSearch.saveAndImportBtn')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>
