<script lang="ts">
  import { presentation } from '$lib/stores/presentation.svelte';
  import { t } from '$lib/i18n';
  import SongBeamerIcon from '$lib/components/icons/SongBeamerIcon.svelte';
  import type { Song, SongSearchResult } from '$lib/types/models';

  let searchQuery = $state<string>('');
  let isSearching = $state<boolean>(false);

  // Results & Selection (Local Search across all folders & subfolders)
  let localResults = $state<SongSearchResult[]>([]);
  let selectedLocalIndex = $state<number>(0);
  let selectedSong = $state<Song | null>(null);
  let isLoadingDetails = $state<boolean>(false);

  let searchInputEl: HTMLInputElement | null = null;

  // Continuous song lyrics text (no slide boxes, no labels, just natural stanzas)
  let continuousSongText = $derived.by(() => {
    if (!selectedSong) return '';
    return selectedSong.slides
      .map((s) => s.raw_content.trim())
      .filter(Boolean)
      .join('\n\n');
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
      const res = await presentation.searchSongs(searchQuery, 200);
      localResults = res;
      selectedLocalIndex = 0;
      if (res.length > 0) {
        await loadSelectedSongDetails(res[0]);
      } else {
        selectedSong = null;
      }
    } finally {
      isSearching = false;
    }
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
      presentation.closeSongSearchModal();
      return;
    }

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
  <!-- Window Container: Fixed Size (880px x 580px), Never Resizes Based on Results -->
  <div
    class="flex flex-col w-[880px] h-[580px] max-w-[95vw] max-h-[90vh] bg-[#f0f0f0] dark:bg-[#1e2227] text-neutral-900 dark:text-neutral-100 border-2 border-blue-600 dark:border-neutral-600 shadow-2xl rounded-none overflow-hidden"
    style="width: 880px; height: 580px;"
  >
    <!-- Modal Titlebar (Height: 36px, Rich Blue Header with pure white text) -->
    <div
      class="h-9 flex items-center justify-between px-3 text-white font-bold text-sm shrink-0 select-none"
      style="background-color: #2563eb; color: #ffffff;"
    >
      <div class="flex items-center gap-2">
        <SongBeamerIcon name="song-search" size={16} />
        <span id="sb-song-search-title">{t('songSearch.title')}</span>
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

    <!-- Modal Header Toolbar: Clean Search Field (No Magnifying Glass, No Folder Dropdown, No Mode Tabs) -->
    <div
      class="p-2.5 bg-neutral-200 dark:bg-neutral-800 border-b border-neutral-300 dark:border-neutral-700 flex items-center gap-2 shrink-0"
    >
      <div class="relative flex-1">
        <input
          id="sb-song-search-input"
          bind:this={searchInputEl}
          type="text"
          bind:value={searchQuery}
          oninput={() => executeSearch()}
          placeholder={t('songSearch.placeholder')}
          class="w-full h-9 px-3 pr-8 border border-neutral-400 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 rounded-none text-sm font-medium focus:outline-none focus:border-blue-600"
        />
        {#if searchQuery}
          <button
            type="button"
            class="absolute right-2.5 top-2 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 text-sm font-bold cursor-pointer"
            onclick={() => {
              searchQuery = '';
              executeSearch();
            }}
          >
            ✕
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
          <span>{t('songSearch.songsFound', { count: localResults.length })}</span>
          {#if isSearching}
            <span class="text-blue-600 animate-pulse text-sm">...</span>
          {/if}
        </div>

        <!-- Results List Scroll Area -->
        <div class="flex-1 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800">
          {#if localResults.length === 0}
            <div class="p-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
              {searchQuery ? t('songSearch.noSongsFound', { query: searchQuery }) : t('songSearch.searchPrompt')}
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
                ondblclick={addSelectedToSchedule}
                onkeydown={(e) => {
                  if (e.key === 'Enter') addSelectedToSchedule();
                }}
              >
                <!-- Title only, with composer in parentheses if present; no folders, no key badges -->
                <span class="text-sm select-none break-words">
                  {item.title}{item.author ? ` (${item.author})` : ''}
                </span>
              </div>
            {/each}
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
        {#if selectedSong}
          <!-- Metadata Bar: Clean title & composer -->
          <div class="px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-300 dark:border-neutral-700 shrink-0 flex items-center justify-between gap-2">
            <div class="truncate">
              <h3 class="text-sm font-bold text-neutral-900 dark:text-white truncate">
                {selectedSong.metadata.title}
              </h3>
              {#if selectedSong.metadata.author}
                <div class="text-sm text-neutral-600 dark:text-neutral-400 truncate">
                  {selectedSong.metadata.author}
                </div>
              {/if}
            </div>
            {#if isLoadingDetails}
              <span class="text-xs text-blue-500 animate-pulse">Lade...</span>
            {/if}
          </div>

          <!-- Continuous Lyrics Text: Light background, no boxes, no Folie labels -->
          <div
            id="sb-song-search-preview-text"
            class="flex-1 p-6 bg-white dark:bg-[#21252b] text-neutral-900 dark:text-neutral-100 overflow-y-auto whitespace-pre-wrap font-sans text-sm leading-relaxed select-text"
          >
            {continuousSongText}
          </div>
        {:else}
          <!-- Empty State -->
          <div class="flex-1 flex flex-col items-center justify-center p-8 text-neutral-400 dark:text-neutral-500 text-center select-none">
            <span class="text-4xl mb-2">🎵</span>
            <p class="text-sm">{t('songSearch.searchPrompt')}</p>
          </div>
        {/if}
      </div>
    </div>

    <!-- Modal Footer: Spans full width under both columns -->
    <div
      class="h-12 px-3 bg-neutral-200 dark:bg-neutral-800 border-t border-neutral-300 dark:border-neutral-700 flex items-center justify-between shrink-0 select-none"
    >
      <div class="flex items-center gap-2">
        <button
          type="button"
          id="sb-btn-add-schedule"
          style="background-color: #2563eb; color: #ffffff;"
          class="h-8 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold rounded-none shadow-xs cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
          disabled={!selectedSong}
          onclick={addSelectedToSchedule}
        >
          <span>✓</span>
          <span>{t('songSearch.addToSchedule')}</span>
        </button>
        <button
          type="button"
          id="sb-btn-edit-song"
          class="h-8 px-4 bg-white dark:bg-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-600 border border-neutral-300 dark:border-neutral-600 text-neutral-800 dark:text-neutral-200 text-sm font-semibold cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
          disabled={!selectedSong}
          onclick={editSelectedSong}
        >
          <span>✏️</span>
          <span>{t('songSearch.editSong')}</span>
        </button>
        <button
          type="button"
          id="sb-btn-present-live"
          class="h-8 px-4 bg-white dark:bg-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-600 border border-neutral-300 dark:border-neutral-600 text-neutral-800 dark:text-neutral-200 text-sm font-semibold cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
          disabled={!selectedSong}
          onclick={presentSelectedDirectly}
        >
          <span>▶</span>
          <span>{t('songSearch.presentLive')}</span>
        </button>
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
  </div>
</div>
