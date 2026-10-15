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
  let subfolderFilter = $state<string>('all');
  let isSearching = $state<boolean>(false);

  // Results & Selection (Local)
  let localResults = $state<SongSearchResult[]>([]);
  let selectedLocalIndex = $state<number>(0);
  let selectedSong = $state<Song | null>(null);
  let isLoadingDetails = $state<boolean>(false);

  // SongSelect (CCLI) State
  let ccliSession = $state<CcliSession | null>(getCcliSession());
  let isCcliLoginModalOpen = $state<boolean>(false);
  let ccliEmail = $state<string>('worship@church.org');
  let ccliPassword = $state<string>('••••••••');
  let ccliLicense = $state<string>('7482910');
  let isLoggingIn = $state<boolean>(false);
  let loginError = $state<string>('');
  let ccliResults = $state<SongSelectSong[]>([]);
  let selectedCcliIndex = $state<number>(0);
  let isImportingCcli = $state<boolean>(false);
  let importSuccessMessage = $state<string>('');

  let searchInputEl: HTMLInputElement | null = null;

  // Available subfolders extracted from local archive
  let availableSubfolders = $derived.by(() => {
    const set = new Set<string>();
    for (const r of localResults) {
      if (r.file_path && r.file_path.includes('/')) {
        const parts = r.file_path.split('/');
        if (parts.length > 1) {
          set.add(parts[0]);
        }
      }
    }
    return Array.from(set).sort();
  });

  // Load initial results when modal mounts
  $effect(() => {
    executeSearch();
    if (searchInputEl) {
      setTimeout(() => searchInputEl?.focus(), 50);
    }
  });

  async function executeSearch() {
    isSearching = true;
    try {
      if (activeTab === 'local') {
        const res = await presentation.searchSongs(searchQuery, 100, subfolderFilter);
        localResults = res;
        selectedLocalIndex = 0;
        if (res.length > 0) {
          await loadSelectedSongDetails(res[0]);
        } else {
          selectedSong = null;
        }
      } else {
        const res = await searchSongSelect(searchQuery);
        ccliResults = res;
        selectedCcliIndex = 0;
      }
    } finally {
      isSearching = false;
    }
  }

  async function handleTabChange(tab: 'local' | 'songselect') {
    activeTab = tab;
    searchQuery = '';
    await executeSearch();
  }

  async function handleSelectLocal(idx: number) {
    selectedLocalIndex = idx;
    const target = localResults[idx];
    if (target) {
      await loadSelectedSongDetails(target);
    }
  }

  async function loadSelectedSongDetails(item: SongSearchResult) {
    isLoadingDetails = true;
    try {
      const details = await presentation.getSongDetails(item);
      selectedSong = details;
    } finally {
      isLoadingDetails = false;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      if (isCcliLoginModalOpen) {
        isCcliLoginModalOpen = false;
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
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedSong) {
          addSelectedToSchedule();
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
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const cur = ccliResults[selectedCcliIndex];
        if (cur) {
          importCcliSong(cur, true);
        }
      }
    }
  }

  function addSelectedToSchedule() {
    if (!selectedSong) return;
    presentation.addSongToSchedule(selectedSong);
    presentation.closeSongSearchModal();
  }

  function editSelectedSong() {
    if (!selectedSong) return;
    presentation.openSongEditor(selectedSong);
    presentation.closeSongSearchModal();
  }

  function presentSelectedDirectly() {
    if (!selectedSong) return;
    presentation.setSong(selectedSong);
    if (!presentation.isBeamerActive) {
      presentation.toggleBeamer();
    }
    presentation.closeSongSearchModal();
  }

  // CCLI Actions
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
      isCcliLoginModalOpen = false;
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

  async function importCcliSong(songSelectSong: SongSelectSong, addToSchedule = false) {
    isImportingCcli = true;
    try {
      const imported = await presentation.importAndAddCcliSong(songSelectSong);
      importSuccessMessage = t('songSearch.importedSuccess');
      setTimeout(() => (importSuccessMessage = ''), 4000);

      // Re-scan local archive so the imported song is immediately visible
      await presentation.searchSongs('');

      if (addToSchedule) {
        presentation.closeSongSearchModal();
      }
    } finally {
      isImportingCcli = false;
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
  <!-- Window Container: Classic SongBeamer Elegance + Modern Clean Lines -->
  <div
    class="flex flex-col w-full max-w-5xl h-[85vh] bg-[#f0f0f0] dark:bg-[#1e2227] text-neutral-900 dark:text-neutral-100 border-2 border-[#316ac5] dark:border-[#4b5263] shadow-2xl rounded-none overflow-hidden"
  >
    <!-- Modal Titlebar -->
    <div
      class="h-8 bg-[#2d62b3] dark:bg-[#21252b] border-b border-[#1f4a8a] dark:border-neutral-700 flex items-center justify-between px-3 text-white font-bold text-xs shrink-0"
    >
      <div class="flex items-center gap-2">
        <SongBeamerIcon name="song-search" size={14} />
        <span id="sb-song-search-title">{t('songSearch.title')}</span>
      </div>
      <button
        type="button"
        id="sb-song-search-close-x"
        class="w-5 h-5 flex items-center justify-center hover:bg-red-600 active:bg-red-700 text-white font-mono text-sm leading-none"
        onclick={() => presentation.closeSongSearchModal()}
        title={t('songSearch.close')}
        aria-label={t('songSearch.close')}
      >
        ✕
      </button>
    </div>

    <!-- Modal Header Toolbar: Search Input + Tabs + CCLI Status -->
    <div
      class="p-2.5 bg-[#e4e4e4] dark:bg-[#282c34] border-b border-[#b0b0b0] dark:border-neutral-700 flex flex-wrap items-center justify-between gap-2 shrink-0"
    >
      <!-- Search Input with Clear Button -->
      <div class="flex items-center gap-2 flex-1 min-w-[280px]">
        <div class="relative flex-1">
          <input
            id="sb-song-search-input"
            bind:this={searchInputEl}
            type="text"
            bind:value={searchQuery}
            oninput={() => executeSearch()}
            placeholder={activeTab === 'local' ? t('songSearch.placeholder') : 'SongSelect: Titel, CCLI # oder Text...'}
            class="w-full h-8 pl-8 pr-7 border border-[#7f9db9] dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 rounded-none text-xs font-medium focus:outline-none focus:border-[#316ac5] dark:focus:border-blue-400"
          />
          <span class="absolute left-2.5 top-2 text-neutral-400 pointer-events-none">
            🔍
          </span>
          {#if searchQuery}
            <button
              type="button"
              class="absolute right-2 top-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 text-xs font-bold"
              onclick={() => {
                searchQuery = '';
                executeSearch();
              }}
            >
              ✕
            </button>
          {/if}
        </div>

        <!-- Subfolder Filter (Local Mode) -->
        {#if activeTab === 'local'}
          <select
            id="sb-subfolder-filter"
            bind:value={subfolderFilter}
            onchange={() => executeSearch()}
            class="h-8 border border-[#7f9db9] dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 text-xs px-2 rounded-none cursor-pointer focus:outline-none"
          >
            <option value="all">📁 {t('songSearch.allSubfolders')}</option>
            {#each availableSubfolders as sf}
              <option value={sf}>📁 {sf}/</option>
            {/each}
          </select>
        {/if}
      </div>

      <!-- Mode Switch: Local Archive vs. CCLI SongSelect -->
      <div class="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          id="sb-tab-local"
          class="h-8 px-3 flex items-center gap-1.5 text-xs font-bold border transition-colors {activeTab === 'local'
            ? 'bg-[#316ac5] text-white border-[#1f4a8a]'
            : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 border-[#b0b0b0] dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-700'}"
          onclick={() => handleTabChange('local')}
        >
          <span>📁</span>
          <span>{t('songSearch.tabLocal')}</span>
          <span class="text-[10px] px-1 rounded-sm bg-black/20 text-white font-mono">
            {localResults.length}
          </span>
        </button>

        <button
          type="button"
          id="sb-tab-songselect"
          class="h-8 px-3 flex items-center gap-1.5 text-xs font-bold border transition-colors {activeTab === 'songselect'
            ? 'bg-[#316ac5] text-white border-[#1f4a8a]'
            : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 border-[#b0b0b0] dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-700'}"
          onclick={() => handleTabChange('songselect')}
        >
          <SongBeamerIcon name="ccli" size={14} />
          <span>{t('songSearch.tabSongSelect')}</span>
          {#if ccliSession?.connected}
            <span class="w-2 h-2 rounded-full bg-emerald-400" title={t('songSearch.ccliConnected')}></span>
          {/if}
        </button>

        <!-- CCLI Connection Button -->
        {#if !ccliSession?.connected}
          <button
            type="button"
            id="sb-btn-connect-ccli"
            class="h-8 px-2.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
            onclick={() => (isCcliLoginModalOpen = true)}
            title={t('songSearch.connectCcli')}
          >
            <SongBeamerIcon name="ccli" size={13} />
            <span>{t('songSearch.connectCcli')}</span>
          </button>
        {:else}
          <div class="flex items-center gap-1 pl-1">
            <span class="text-[10px] text-neutral-600 dark:text-neutral-400 font-mono hidden md:inline">
              #{ccliSession.licenseNumber}
            </span>
            <button
              type="button"
              id="sb-btn-disconnect-ccli"
              class="h-7 px-1.5 text-[10px] text-neutral-500 hover:text-red-500 underline"
              onclick={performCcliLogout}
            >
              {t('songSearch.ccliLogout')}
            </button>
          </div>
        {/if}
      </div>
    </div>

    <!-- Success notification banner for CCLI imports -->
    {#if importSuccessMessage}
      <div class="bg-emerald-600 text-white text-xs px-3 py-1 flex items-center justify-between font-bold">
        <span>✓ {importSuccessMessage}</span>
        <button type="button" onclick={() => (importSuccessMessage = '')}>✕</button>
      </div>
    {/if}

    <!-- Main Two-Column Body -->
    <div class="flex-1 flex min-h-0 overflow-hidden">
      <!-- ======================================================== -->
      <!-- LEFT COLUMN: Search Results (Generous Width for Parity) -->
      <!-- ======================================================== -->
      <div
        id="sb-song-search-results-list"
        class="border-r border-[#b0b0b0] dark:border-neutral-700 bg-white dark:bg-[#181a1f] flex flex-col overflow-hidden shrink-0"
        style="width: 420px; min-width: 400px;"
      >
        <!-- Sub-header: Count -->
        <div class="px-2.5 py-1.5 bg-[#f4f4f4] dark:bg-[#21252b] border-b border-[#d0d0d0] dark:border-neutral-700 text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 flex items-center justify-between">
          <span>
            {activeTab === 'local' ? t('songSearch.songsFound', { count: localResults.length }) : `CCLI SongSelect: ${ccliResults.length} Treffer`}
          </span>
          {#if isSearching}
            <span class="text-blue-500 animate-pulse text-[10px]">Suchvorgang läuft...</span>
          {/if}
        </div>

        <!-- Results List Scroll Area -->
        <div class="flex-1 overflow-y-auto divide-y divide-neutral-200 dark:divide-neutral-800">
          {#if activeTab === 'local'}
            {#if localResults.length === 0}
              <div class="p-6 text-center text-xs text-neutral-500 dark:text-neutral-400">
                {searchQuery ? t('songSearch.noSongsFound', { query: searchQuery }) : t('songSearch.searchPrompt')}
              </div>
            {:else}
              {#each localResults as item, idx}
                {@const isSelected = selectedLocalIndex === idx}
                <div
                  role="button"
                  tabindex="0"
                  data-search-result-idx={idx}
                  class="p-2.5 text-left cursor-pointer transition-colors {isSelected
                    ? 'bg-[#316ac5] text-white'
                    : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-900 dark:text-neutral-100'}"
                  onclick={() => handleSelectLocal(idx)}
                  ondblclick={addSelectedToSchedule}
                  onkeydown={(e) => {
                    if (e.key === 'Enter') addSelectedToSchedule();
                  }}
                >
                  <!-- Song Title (Full Width, No Truncation Risk) -->
                  <div class="font-bold text-xs leading-tight mb-1 flex items-start justify-between gap-1">
                    <span class="break-words">{item.title}</span>
                    {#if item.musical_key}
                      <span
                        class="text-[10px] font-mono px-1 rounded-xs shrink-0 {isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300'}"
                      >
                        {item.musical_key}
                      </span>
                    {/if}
                  </div>

                  <!-- Author & Subfolder details -->
                  <div class="flex items-center justify-between text-[11px] opacity-80 gap-2">
                    <span class="truncate">{item.author || '—'}</span>
                    {#if item.file_path}
                      <span class="text-[10px] font-mono opacity-70 shrink-0">
                        📁 {item.file_path.split('/')[0]}
                      </span>
                    {/if}
                  </div>

                  <!-- Match in Lyrics Snippet -->
                  {#if item.snippet}
                    <div
                      class="mt-1 text-[10px] italic px-1.5 py-0.5 rounded-xs {isSelected
                        ? 'bg-black/20 text-yellow-200'
                        : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'}"
                    >
                      {item.snippet}
                    </div>
                  {/if}
                </div>
              {/each}
            {/if}
          {:else}
            <!-- SongSelect (CCLI) Results List -->
            {#each ccliResults as ccliItem, idx}
              {@const isSelected = selectedCcliIndex === idx}
              <div
                role="button"
                tabindex="0"
                data-ccli-result-idx={idx}
                class="p-2.5 text-left cursor-pointer transition-colors {isSelected
                  ? 'bg-[#316ac5] text-white'
                  : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-900 dark:text-neutral-100'}"
                onclick={() => (selectedCcliIndex = idx)}
                ondblclick={() => importCcliSong(ccliItem, true)}
                onkeydown={(e) => {
                  if (e.key === 'Enter') importCcliSong(ccliItem, true);
                }}
              >
                <div class="font-bold text-xs leading-tight mb-1 flex items-start justify-between gap-1">
                  <span>{ccliItem.title}</span>
                  <span class="text-[9px] font-mono px-1 rounded-xs bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
                    CCLI #{ccliItem.ccliNumber}
                  </span>
                </div>
                {#if ccliItem.titleSecondary}
                  <div class="text-[10px] opacity-75 italic mb-0.5">
                    {ccliItem.titleSecondary}
                  </div>
                {/if}
                <div class="text-[10px] opacity-80 truncate">
                  {ccliItem.authors}
                </div>
                <div class="mt-1 text-[9px] opacity-60 truncate">
                  {ccliItem.copyright}
                </div>
              </div>
            {/each}
          {/if}
        </div>
      </div>

      <!-- ======================================================== -->
      <!-- RIGHT COLUMN: Song Content Preview & Actions             -->
      <!-- ======================================================== -->
      <div
        id="sb-song-search-preview"
        class="flex-1 flex flex-col bg-white dark:bg-[#181a1f] overflow-hidden"
      >
        {#if activeTab === 'local'}
          {#if selectedSong}
            <!-- Metadata Top Bar -->
            <div class="p-3 bg-[#f8f8f8] dark:bg-[#21252b] border-b border-[#b0b0b0] dark:border-neutral-700 shrink-0">
              <div class="flex items-center justify-between gap-2">
                <h3 class="text-sm font-bold text-neutral-900 dark:text-white truncate">
                  {selectedSong.metadata.title}
                </h3>
                {#if selectedSong.metadata.musical_key}
                  <span class="text-xs font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300">
                    Tonart: {selectedSong.metadata.musical_key}
                  </span>
                {/if}
              </div>
              <div class="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5">
                {#if selectedSong.metadata.author}
                  <span>Autor: <strong class="text-neutral-800 dark:text-neutral-200">{selectedSong.metadata.author}</strong></span>
                {/if}
                {#if selectedSong.metadata.ccli}
                  <span>CCLI: <strong class="text-neutral-800 dark:text-neutral-200">#{selectedSong.metadata.ccli}</strong></span>
                {/if}
                <span>Folien: <strong class="text-neutral-800 dark:text-neutral-200">{selectedSong.slides.length}</strong></span>
              </div>
            </div>

            <!-- Slide Deck Content Preview (Scrollable) -->
            <div class="flex-1 overflow-y-auto p-4 space-y-3 bg-[#e8e8e8] dark:bg-[#121418]">
              {#each selectedSong.slides as slide, sIdx}
                <div class="border border-[#b0b0b0] dark:border-neutral-700 bg-black text-white p-3 rounded-none shadow-sm">
                  <div class="flex items-center justify-between text-[11px] font-bold text-blue-400 mb-1.5 border-b border-neutral-800 pb-1">
                    <span>{slide.label}</span>
                    <span class="text-neutral-500 font-mono">Folie {sIdx + 1}</span>
                  </div>
                  <pre class="font-sans text-xs whitespace-pre-wrap leading-relaxed text-neutral-100">{slide.raw_content}</pre>
                </div>
              {/each}
            </div>

            <!-- Bottom Action Controls -->
            <div
              class="p-2.5 bg-[#f0f0f0] dark:bg-[#21252b] border-t border-[#b0b0b0] dark:border-neutral-700 flex items-center justify-between shrink-0"
            >
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  id="sb-btn-add-schedule"
                  class="h-7 px-3 bg-[#316ac5] hover:bg-[#24529c] active:bg-[#1a3e75] text-white text-xs font-bold rounded-none shadow-xs"
                  onclick={addSelectedToSchedule}
                >
                  ✓ {t('songSearch.addToSchedule')}
                </button>
                <button
                  type="button"
                  id="sb-btn-edit-song"
                  class="h-7 px-3 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-[#b0b0b0] dark:border-neutral-600 text-xs font-semibold"
                  onclick={editSelectedSong}
                >
                  ✏️ {t('songSearch.editSong')}
                </button>
                <button
                  type="button"
                  id="sb-btn-present-live"
                  class="h-7 px-3 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-[#b0b0b0] dark:border-neutral-600 text-xs font-semibold"
                  onclick={presentSelectedDirectly}
                >
                  ▶ {t('songSearch.presentLive')}
                </button>
              </div>

              <button
                type="button"
                class="h-7 px-3 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-[#b0b0b0] dark:border-neutral-600 text-xs"
                onclick={() => presentation.closeSongSearchModal()}
              >
                {t('songSearch.close')}
              </button>
            </div>
          {:else}
            <!-- Empty state when no song selected -->
            <div class="flex-1 flex flex-col items-center justify-center p-8 text-neutral-400 dark:text-neutral-500 text-center">
              <span class="text-4xl mb-2">🎵</span>
              <p class="text-xs">{t('songSearch.searchPrompt')}</p>
            </div>
          {/if}
        {:else}
          <!-- ======================================================== -->
          <!-- SongSelect (CCLI) Preview & Import View                 -->
          <!-- ======================================================== -->
          {@const selectedCcliSong = ccliResults[selectedCcliIndex]}
          {#if selectedCcliSong}
            <div class="p-3 bg-[#f8f8f8] dark:bg-[#21252b] border-b border-[#b0b0b0] dark:border-neutral-700 shrink-0">
              <div class="flex items-center justify-between gap-2">
                <div>
                  <h3 class="text-sm font-bold text-neutral-900 dark:text-white">
                    {selectedCcliSong.title}
                  </h3>
                  {#if selectedCcliSong.titleSecondary}
                    <div class="text-xs text-neutral-500 italic">{selectedCcliSong.titleSecondary}</div>
                  {/if}
                </div>
                <div class="flex items-center gap-1.5">
                  <span class="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400">
                    CCLI #{selectedCcliSong.ccliNumber}
                  </span>
                  {#if selectedCcliSong.musicalKey}
                    <span class="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300">
                      {selectedCcliSong.musicalKey}
                    </span>
                  {/if}
                </div>
              </div>
              <div class="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                Autoren: <strong>{selectedCcliSong.authors}</strong> | Copyright: <strong>{selectedCcliSong.copyright}</strong>
              </div>
            </div>

            <!-- Preview Sections -->
            <div class="flex-1 overflow-y-auto p-4 space-y-3 bg-[#e8e8e8] dark:bg-[#121418]">
              {#each selectedCcliSong.sections as section}
                <div class="border border-[#b0b0b0] dark:border-neutral-700 bg-black text-white p-3 rounded-none shadow-sm">
                  <div class="text-[11px] font-bold text-amber-400 mb-1 border-b border-neutral-800 pb-0.5">
                    {section.label}
                  </div>
                  <div class="font-sans text-xs whitespace-pre-wrap leading-relaxed text-neutral-100">
                    {section.lines.join('\n')}
                  </div>
                </div>
              {/each}
            </div>

            <!-- CCLI Bottom Action Controls -->
            <div
              class="p-2.5 bg-[#f0f0f0] dark:bg-[#21252b] border-t border-[#b0b0b0] dark:border-neutral-700 flex items-center justify-between shrink-0"
            >
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  id="sb-btn-import-and-add-ccli"
                  class="h-7 px-3 bg-[#316ac5] hover:bg-[#24529c] active:bg-[#1a3e75] text-white text-xs font-bold rounded-none shadow-xs disabled:opacity-50"
                  disabled={isImportingCcli}
                  onclick={() => importCcliSong(selectedCcliSong, true)}
                >
                  ✓ {t('songSearch.importAndAdd')}
                </button>
                <button
                  type="button"
                  id="sb-btn-import-ccli-sng"
                  class="h-7 px-3 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-[#b0b0b0] dark:border-neutral-600 text-xs font-semibold disabled:opacity-50"
                  disabled={isImportingCcli}
                  onclick={() => importCcliSong(selectedCcliSong, false)}
                >
                  ⬇ {t('songSearch.importSng')}
                </button>
              </div>

              <button
                type="button"
                class="h-7 px-3 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-[#b0b0b0] dark:border-neutral-600 text-xs"
                onclick={() => presentation.closeSongSearchModal()}
              >
                {t('songSearch.close')}
              </button>
            </div>
          {/if}
        {/if}
      </div>
    </div>
  </div>
</div>

<!-- CCLI SongSelect Login Modal (if opened) -->
{#if isCcliLoginModalOpen}
  <div class="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
    <div class="bg-white dark:bg-[#21252b] text-neutral-900 dark:text-neutral-100 border-2 border-amber-600 shadow-2xl w-full max-w-md p-4">
      <div class="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-700 pb-2 mb-3">
        <div class="flex items-center gap-2 font-bold text-sm text-amber-700 dark:text-amber-400">
          <SongBeamerIcon name="ccli" size={16} />
          <span>{t('songSearch.ccliLoginTitle')}</span>
        </div>
        <button type="button" onclick={() => (isCcliLoginModalOpen = false)}>✕</button>
      </div>

      <p class="text-xs text-neutral-600 dark:text-neutral-400 mb-3">
        {t('songSearch.ccliLoginDesc')}
      </p>

      {#if loginError}
        <div class="mb-3 p-2 bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 text-xs font-semibold">
          {loginError}
        </div>
      {/if}

      <div class="space-y-2.5 text-xs">
        <div>
          <label for="sb-ccli-email" class="block font-semibold mb-1">{t('songSearch.ccliEmail')}</label>
          <input
            id="sb-ccli-email"
            type="email"
            bind:value={ccliEmail}
            class="w-full h-7 px-2 border border-[#7f9db9] dark:border-neutral-600 bg-white dark:bg-neutral-900"
          />
        </div>
        <div>
          <label for="sb-ccli-pwd" class="block font-semibold mb-1">{t('songSearch.ccliPassword')}</label>
          <input
            id="sb-ccli-pwd"
            type="password"
            bind:value={ccliPassword}
            class="w-full h-7 px-2 border border-[#7f9db9] dark:border-neutral-600 bg-white dark:bg-neutral-900"
          />
        </div>
        <div>
          <label for="sb-ccli-lic" class="block font-semibold mb-1">{t('songSearch.ccliLicense')}</label>
          <input
            id="sb-ccli-lic"
            type="text"
            bind:value={ccliLicense}
            class="w-full h-7 px-2 border border-[#7f9db9] dark:border-neutral-600 bg-white dark:bg-neutral-900"
          />
        </div>
      </div>

      <div class="mt-4 flex items-center justify-between pt-2 border-t border-neutral-200 dark:border-neutral-700">
        <button
          type="button"
          id="sb-btn-ccli-demo-login"
          class="text-xs text-blue-600 dark:text-blue-400 hover:underline"
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
            class="h-7 px-3 border border-neutral-300 dark:border-neutral-600 text-xs"
            onclick={() => (isCcliLoginModalOpen = false)}
          >
            {t('songSearch.close')}
          </button>
          <button
            type="button"
            id="sb-btn-ccli-submit-login"
            class="h-7 px-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
            disabled={isLoggingIn}
            onclick={performCcliLogin}
          >
            {t('songSearch.ccliLoginBtn')}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
