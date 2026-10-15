<script lang="ts">
  import { t, i18n } from '$lib/i18n';
  import { presentation } from '$lib/stores/presentation.svelte';
  import SongBeamerIcon from '$lib/components/icons/SongBeamerIcon.svelte';
  import type { ScheduleItem, Slide, LyricLine, SongSearchResult } from '$lib/types/models';
  import { getAudienceLines, calculateSlideFontSize } from '$lib/utils/slideTypography';
  import { parseSongFormatOptions, getLineRenderStyle } from '$lib/utils/formatUtils';
  import { isImageBackground } from '$lib/data/backgrounds';

  const formatOpts = $derived.by(() => {
    const tags = presentation.activeSong?.metadata?.custom_tags;
    return tags ? parseSongFormatOptions(tags) : null;
  });

  const activeSongBg = $derived.by<string>(() => {
    const tags = presentation.activeSong?.metadata?.custom_tags;
    return tags?.['backgroundimage'] ?? tags?.['format.background'] ?? tags?.['background'] ?? '';
  });

  const activeSongDimmer = $derived.by<number>(() => {
    const val = presentation.activeSong?.metadata?.custom_tags?.['backgrounddimmer'];
    return (val ? parseInt(val, 10) : 25) / 100;
  });

  // --- Clock ---
  let currentTime = $state<string>('');
  $effect(() => {
    const updateTime = () => {
      currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  });

  // --- Helper to extract plain text without chords ---
  function getAudienceText(line: LyricLine): string {
    return line.tokens
      .map((tok) => (tok.kind === 'Chord' ? '' : tok.text))
      .join('');
  }

  const nextSlide = $derived<Slide | null>(
    presentation.activeSong && presentation.activeSlideIndex + 1 < presentation.activeSlides.length
      ? presentation.activeSlides[presentation.activeSlideIndex + 1]
      : null
  );

  // --- Schedule Drag & Drop State ---
  let draggingIndex = $state<number | null>(null);
  let targetIndex = $state<number | null>(null);
  let targetPosition = $state<'before' | 'after'>('after');
  let isPointerDown = false;
  let startY = 0;
  let hasMoved = $state(false);
  let startIndex = $state<number | null>(null);
  let pointerX = $state<number>(0);
  let pointerY = $state<number>(0);

  const draggedItem = $derived<ScheduleItem | null>(
    draggingIndex !== null ? presentation.schedule[draggingIndex] ?? null : null
  );

  function handleSchedulePointerDown(e: PointerEvent, index: number) {
    if (e.button !== 0) return;
    isPointerDown = true;
    hasMoved = false;
    startY = e.clientY;
    pointerX = e.clientX;
    pointerY = e.clientY;
    startIndex = index;
    draggingIndex = null;
    targetIndex = null;
  }

  function handleSchedulePointerMove(e: PointerEvent) {
    if (!isPointerDown) return;
    pointerX = e.clientX;
    pointerY = e.clientY;

    if (!hasMoved && Math.abs(e.clientY - startY) > 5) {
      hasMoved = true;
      draggingIndex = startIndex;
      const el = e.currentTarget as HTMLElement | null;
      if (el) {
        try {
          el.setPointerCapture(e.pointerId);
        } catch {}
      }
    }

    if (draggingIndex !== null) {
      const items = Array.from(document.querySelectorAll<HTMLElement>('[data-classic-schedule-idx]'));
      if (items.length === 0) return;

      const firstRect = items[0].getBoundingClientRect();
      const lastRect = items[items.length - 1].getBoundingClientRect();

      if (e.clientY < firstRect.top) {
        targetIndex = 0;
        targetPosition = 'before';
      } else if (e.clientY > lastRect.bottom) {
        targetIndex = items.length - 1;
        targetPosition = 'after';
      } else {
        for (const itemEl of items) {
          const rect = itemEl.getBoundingClientRect();
          if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
            const idx = parseInt(itemEl.getAttribute('data-classic-schedule-idx') ?? '0', 10);
            targetIndex = idx;
            targetPosition = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
            break;
          }
        }
      }
    }
  }

  function handleSchedulePointerUp(e: PointerEvent) {
    if (!isPointerDown) return;
    isPointerDown = false;

    if (hasMoved && draggingIndex !== null && targetIndex !== null) {
      const fromIdx = draggingIndex;
      let toIdx = targetIndex;
      if (targetPosition === 'after' && fromIdx > toIdx) {
        toIdx += 1;
      } else if (targetPosition === 'before' && fromIdx < toIdx) {
        toIdx -= 1;
      }
      if (fromIdx !== toIdx) {
        presentation.reorderSchedule(fromIdx, toIdx);
      }
    } else if (!hasMoved && startIndex !== null) {
      // Normal click: select item immediately
      presentation.selectScheduleItem(startIndex);
    }

    const el = e.currentTarget as HTMLElement | null;
    if (el) {
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {}
    }

    draggingIndex = null;
    targetIndex = null;
    startIndex = null;
    hasMoved = false;
  }

  function handleSchedulePointerCancel(e: PointerEvent) {
    isPointerDown = false;
    const el = e.currentTarget as HTMLElement | null;
    if (el) {
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {}
    }
    draggingIndex = null;
    targetIndex = null;
    startIndex = null;
    hasMoved = false;
  }

  // --- Dynamic Search Filter ---
  let searchQuery = $state('');
  let searchResults = $state<SongSearchResult[]>([]);
  let isSearchDropdownOpen = $state(false);

  async function handleSearchInput(e: Event) {
    const val = (e.target as HTMLInputElement).value;
    searchQuery = val;
    if (val.trim().length >= 1) {
      searchResults = await presentation.searchSongs(val);
      isSearchDropdownOpen = searchResults.length > 0;
    } else {
      searchResults = [];
      isSearchDropdownOpen = false;
    }
  }

  async function selectSearchResult(res: SongSearchResult) {
    await presentation.addSongFromSearch(res);
    isSearchDropdownOpen = false;
    searchQuery = '';
  }

  function getItemColorClass(item: ScheduleItem, isActive: boolean): string {
    if (isActive) {
      return presentation.theme === 'dark'
        ? 'bg-[#3b4252] text-white font-bold'
        : 'bg-[#dcdcdc] text-[#0000cc] font-bold';
    }
    if (item.item_type.kind === 'Note' || item.item_type.kind === 'Scripture') {
      return presentation.theme === 'dark' ? 'text-[#ff70ff] font-bold' : 'text-[#c800c8] font-bold';
    }
    return presentation.theme === 'dark' ? 'text-[#88b0ff] font-bold' : 'text-[#0000cc] font-bold';
  }

  const iconPx = $derived(Math.max(14, Math.round(16 * presentation.uiScale)));
</script>

<!-- Outer Container: SongBeamer Classic Layout with Scalable UI Token -->
<div
  class="flex flex-col h-full w-full select-none overflow-hidden font-sans rounded-none {presentation.theme === 'dark'
    ? 'bg-[#1e2227] text-neutral-200'
    : 'bg-[#f0f0f0] text-neutral-900'}"
  style="--ui-scale: {presentation.uiScale};"
>
  <!-- 1. Menubar: Compact 24px Win32 Classic Menu -->
  <nav
    class="px-1 flex items-center space-x-1 border-b rounded-none shrink-0 text-xs {presentation.theme === 'dark'
      ? 'bg-[#282c34] border-neutral-700 text-neutral-300'
      : 'bg-[#f4f4f4] border-[#d0d0d0] text-neutral-900'}"
    style="height: calc(24px * var(--ui-scale)); font-size: calc(12px * var(--ui-scale));"
  >
    <!-- Docking Grip Dots -->
    <div class="flex flex-col gap-0.5 px-0.5 cursor-grab opacity-40 hover:opacity-80">
      <div class="w-0.5 h-0.5 bg-black dark:bg-white"></div>
      <div class="w-0.5 h-0.5 bg-black dark:bg-white"></div>
      <div class="w-0.5 h-0.5 bg-black dark:bg-white"></div>
    </div>

    <button type="button" class="px-1.5 py-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-none cursor-pointer">
      {t('menu.file')}
    </button>
    <button type="button" class="px-1.5 py-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-none cursor-pointer">
      {t('menu.edit')}
    </button>
    <button type="button" class="px-1.5 py-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-none cursor-pointer">
      {t('menu.insert')}
    </button>
    <button
      type="button"
      class="px-1.5 py-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-none cursor-pointer"
      onclick={() => presentation.toggleBeamer()}
    >
      {t('menu.presentation')}
    </button>
    <button
      type="button"
      class="px-1.5 py-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-none cursor-pointer"
      onclick={() => presentation.toggleSettings()}
    >
      {t('menu.tools')}
    </button>
    <button
      type="button"
      class="px-1.5 py-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-none cursor-pointer"
      onclick={() => presentation.toggleSettings()}
    >
      {t('menu.help')}
    </button>
  </nav>

  <!-- 2. Toolbar: SongBeamer 6.16f Toolbar with Exact Parity Icons & 1px Separators -->
  <header
    class="px-1 flex items-center justify-between border-b rounded-none shrink-0 gap-1 overflow-x-auto {presentation.theme === 'dark'
      ? 'bg-[#21252b] border-neutral-700'
      : 'bg-[#f4f4f4] border-[#d0d0d0]'}"
    style="height: calc(28px * var(--ui-scale));"
  >
    <div class="flex items-center space-x-0.5 shrink-0">
      <!-- Docking Grip Dots -->
      <div class="flex flex-col gap-0.5 px-0.5 cursor-grab opacity-40 hover:opacity-80">
        <div class="w-0.5 h-0.5 bg-black dark:bg-white"></div>
        <div class="w-0.5 h-0.5 bg-black dark:bg-white"></div>
        <div class="w-0.5 h-0.5 bg-black dark:bg-white"></div>
      </div>

      <!-- Schedule Tools -->
      <button
        type="button"
        class="flex items-center justify-center rounded-none border border-transparent hover:border-[#7f9db9] hover:bg-[#e0edf9] active:bg-[#c2d5e8]"
        style="width: calc(22px * var(--ui-scale)); height: calc(22px * var(--ui-scale));"
        title={t('toolbar.newSchedule')}
        onclick={() => presentation.newSchedule()}
      >
        <SongBeamerIcon name="schedule-new" size={iconPx} />
      </button>
      <button
        type="button"
        class="flex items-center justify-center rounded-none border border-transparent hover:border-[#7f9db9] hover:bg-[#e0edf9] active:bg-[#c2d5e8]"
        style="width: calc(22px * var(--ui-scale)); height: calc(22px * var(--ui-scale));"
        title={t('toolbar.openSchedule')}
        onclick={() => presentation.openSongFileDialog()}
      >
        <SongBeamerIcon name="schedule-open" size={iconPx} />
      </button>
      <button
        type="button"
        class="flex items-center justify-center rounded-none border border-transparent hover:border-[#7f9db9] hover:bg-[#e0edf9] active:bg-[#c2d5e8]"
        style="width: calc(22px * var(--ui-scale)); height: calc(22px * var(--ui-scale));"
        title={t('toolbar.saveSchedule')}
      >
        <SongBeamerIcon name="schedule-save" size={iconPx} />
      </button>

      <!-- 1px Separator -->
      <div class="w-px h-4 bg-[#c0c0c0] dark:bg-neutral-600 mx-0.5"></div>

      <!-- Song Tools -->
      <button
        type="button"
        class="flex items-center justify-center rounded-none border border-transparent hover:border-[#7f9db9] hover:bg-[#e0edf9] active:bg-[#c2d5e8]"
        style="width: calc(22px * var(--ui-scale)); height: calc(22px * var(--ui-scale));"
        title={t('toolbar.newSong')}
        onclick={() => presentation.createNewSong()}
      >
        <SongBeamerIcon name="song-new" size={iconPx} />
      </button>
      <button
        id="toolbar-edit-song-btn"
        type="button"
        class="flex items-center justify-center rounded-none border border-transparent hover:border-[#7f9db9] hover:bg-[#e0edf9] active:bg-[#c2d5e8]"
        style="width: calc(22px * var(--ui-scale)); height: calc(22px * var(--ui-scale));"
        title={t('toolbar.editSong')}
        onclick={() => presentation.openSongEditor()}
      >
        <SongBeamerIcon name="song-edit" size={iconPx} />
      </button>
      <button
        type="button"
        class="flex items-center justify-center rounded-none border border-transparent hover:border-[#7f9db9] hover:bg-[#e0edf9] active:bg-[#c2d5e8]"
        style="width: calc(22px * var(--ui-scale)); height: calc(22px * var(--ui-scale));"
        title={t('toolbar.openSong')}
        onclick={() => presentation.openSongFileDialog()}
      >
        <SongBeamerIcon name="song-open" size={iconPx} />
      </button>
      <button
        type="button"
        class="flex items-center justify-center rounded-none border border-transparent hover:border-[#7f9db9] hover:bg-[#e0edf9] active:bg-[#c2d5e8]"
        style="width: calc(22px * var(--ui-scale)); height: calc(22px * var(--ui-scale));"
        title={t('toolbar.search')}
        onclick={() => {
          const el = document.getElementById('sb-quick-search');
          if (el) el.focus();
        }}
      >
        <SongBeamerIcon name="song-search" size={iconPx} />
      </button>

      <!-- 1px Separator -->
      <div class="w-px h-4 bg-[#c0c0c0] dark:bg-neutral-600 mx-0.5"></div>

      <!-- Media & Scripture Tools -->
      <button
        type="button"
        class="flex items-center justify-center rounded-none border border-transparent hover:border-[#7f9db9] hover:bg-[#e0edf9] active:bg-[#c2d5e8]"
        style="width: calc(22px * var(--ui-scale)); height: calc(22px * var(--ui-scale));"
        title={t('toolbar.mediaImage')}
      >
        <SongBeamerIcon name="media-image" size={iconPx} />
      </button>
      <button
        type="button"
        class="flex items-center justify-center rounded-none border border-transparent hover:border-[#7f9db9] hover:bg-[#e0edf9] active:bg-[#c2d5e8]"
        style="width: calc(22px * var(--ui-scale)); height: calc(22px * var(--ui-scale));"
        title={t('toolbar.bible')}
      >
        <SongBeamerIcon name="media-bible" size={iconPx} />
      </button>
      <button
        type="button"
        class="flex items-center justify-center rounded-none border border-transparent hover:border-[#7f9db9] hover:bg-[#e0edf9] active:bg-[#c2d5e8]"
        style="width: calc(22px * var(--ui-scale)); height: calc(22px * var(--ui-scale));"
        title={t('toolbar.mediaVideo')}
      >
        <SongBeamerIcon name="media-video" size={iconPx} />
      </button>
      <button
        type="button"
        class="flex items-center justify-center rounded-none border border-transparent hover:border-[#7f9db9] hover:bg-[#e0edf9] active:bg-[#c2d5e8]"
        style="width: calc(22px * var(--ui-scale)); height: calc(22px * var(--ui-scale));"
        title={t('toolbar.mediaAudioCd')}
      >
        <SongBeamerIcon name="media-audio-cd" size={iconPx} />
      </button>
      <button
        type="button"
        class="flex items-center justify-center rounded-none border border-transparent hover:border-[#7f9db9] hover:bg-[#e0edf9] active:bg-[#c2d5e8]"
        style="width: calc(22px * var(--ui-scale)); height: calc(22px * var(--ui-scale));"
        title={t('toolbar.mediaMp3')}
      >
        <SongBeamerIcon name="media-mp3" size={iconPx} />
      </button>
      <button
        type="button"
        class="flex items-center justify-center rounded-none border border-transparent hover:border-[#7f9db9] hover:bg-[#e0edf9] active:bg-[#c2d5e8]"
        style="width: calc(22px * var(--ui-scale)); height: calc(22px * var(--ui-scale));"
        title={t('toolbar.mediaPpt')}
      >
        <SongBeamerIcon name="media-ppt" size={iconPx} />
      </button>
      <button
        type="button"
        class="flex items-center justify-center rounded-none border border-transparent hover:border-[#7f9db9] hover:bg-[#e0edf9] active:bg-[#c2d5e8]"
        style="width: calc(22px * var(--ui-scale)); height: calc(22px * var(--ui-scale));"
        title={t('toolbar.mediaCamera')}
      >
        <SongBeamerIcon name="media-camera" size={iconPx} />
      </button>

      <!-- 1px Separator -->
      <div class="w-px h-4 bg-[#c0c0c0] dark:bg-neutral-600 mx-0.5"></div>

      <!-- Beamer Direct Controls in Toolbar -->
      <button
        type="button"
        class="flex items-center justify-center rounded-none border border-transparent hover:border-[#7f9db9] hover:bg-[#e0edf9] active:bg-[#c2d5e8]"
        style="width: calc(22px * var(--ui-scale)); height: calc(22px * var(--ui-scale));"
        title={t('toolbar.bgImage')}
      >
        <SongBeamerIcon name="bg-image" size={iconPx} />
      </button>
      <button
        type="button"
        class="flex items-center justify-center rounded-none border {presentation.displayMode === 'normal'
          ? 'border-[#316ac5] bg-[#c2d5e8]'
          : 'border-transparent hover:border-[#7f9db9] hover:bg-[#e0edf9] active:bg-[#c2d5e8]'}"
        style="width: calc(22px * var(--ui-scale)); height: calc(22px * var(--ui-scale));"
        title={t('toolbar.normal')}
        onclick={() => presentation.setDisplayMode('normal')}
      >
        <SongBeamerIcon name="slide-text" size={iconPx} />
      </button>
      <button
        type="button"
        class="flex items-center justify-center rounded-none border {presentation.displayMode === 'clear_text'
          ? 'border-[#316ac5] bg-[#c2d5e8]'
          : 'border-transparent hover:border-[#7f9db9] hover:bg-[#e0edf9] active:bg-[#c2d5e8]'}"
        style="width: calc(22px * var(--ui-scale)); height: calc(22px * var(--ui-scale));"
        title={t('toolbar.clear')}
        onclick={() => presentation.setDisplayMode('clear_text')}
      >
        <SongBeamerIcon name="slide-clear" size={iconPx} />
      </button>
      <button
        type="button"
        class="flex items-center justify-center rounded-none border {presentation.displayMode === 'black'
          ? 'border-[#316ac5] bg-[#c2d5e8]'
          : 'border-transparent hover:border-[#7f9db9] hover:bg-[#e0edf9] active:bg-[#c2d5e8]'}"
        style="width: calc(22px * var(--ui-scale)); height: calc(22px * var(--ui-scale));"
        title={t('toolbar.black')}
        onclick={() => presentation.setDisplayMode('black')}
      >
        <SongBeamerIcon name="screen-black" size={iconPx} />
      </button>
      <button
        type="button"
        class="flex items-center justify-center rounded-none border border-transparent hover:border-[#7f9db9] hover:bg-[#e0edf9] active:bg-[#c2d5e8]"
        style="width: calc(22px * var(--ui-scale)); height: calc(22px * var(--ui-scale));"
        title={t('toolbar.alert')}
      >
        <SongBeamerIcon name="alert" size={iconPx} />
      </button>
      <button
        type="button"
        class="flex items-center justify-center rounded-none border {presentation.showChords
          ? 'border-[#316ac5] bg-[#c2d5e8]'
          : 'border-transparent hover:border-[#7f9db9] hover:bg-[#e0edf9] active:bg-[#c2d5e8]'}"
        style="width: calc(22px * var(--ui-scale)); height: calc(22px * var(--ui-scale));"
        title={t('toolbar.toggleChords')}
        onclick={() => presentation.toggleChords()}
      >
        <SongBeamerIcon name="chords" size={iconPx} />
      </button>

      <!-- 1px Separator -->
      <div class="w-px h-4 bg-[#c0c0c0] dark:bg-neutral-600 mx-0.5"></div>

      <!-- Play Presentation Button -->
      <button
        type="button"
        class="flex items-center justify-center rounded-none border border-transparent hover:border-[#7f9db9] hover:bg-[#e0edf9] active:bg-[#c2d5e8]"
        style="width: calc(22px * var(--ui-scale)); height: calc(22px * var(--ui-scale));"
        title={t('toolbar.openBeamer')}
        onclick={() => presentation.toggleBeamer()}
      >
        <SongBeamerIcon name="play" size={iconPx} />
      </button>

      <!-- 1px Separator -->
      <div class="w-px h-4 bg-[#c0c0c0] dark:bg-neutral-600 mx-0.5"></div>

      <!-- Quick Search Bar: "Song suchen:" -->
      <div class="flex items-center gap-1 pl-0.5 relative">
        <label for="sb-quick-search" class="font-normal text-neutral-700 dark:text-neutral-300 shrink-0" style="font-size: calc(11px * var(--ui-scale));">
          {t('search.label')}
        </label>
        <input
          id="sb-quick-search"
          type="text"
          bind:value={searchQuery}
          oninput={handleSearchInput}
          class="border border-[#7f9db9] bg-white dark:bg-neutral-900 rounded-none focus:outline-none focus:border-[#316ac5] px-1"
          style="height: calc(20px * var(--ui-scale)); width: calc(110px * var(--ui-scale)); font-size: calc(11px * var(--ui-scale));"
        />

        <!-- Search Autocomplete Dropdown -->
        {#if isSearchDropdownOpen && searchResults.length > 0}
          <div
            class="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-neutral-900 border border-[#7f9db9] shadow-lg max-h-60 overflow-y-auto"
            style="width: calc(240px * var(--ui-scale)); font-size: calc(11px * var(--ui-scale));"
          >
            {#each searchResults as res}
              <button
                type="button"
                class="w-full text-left px-2 py-1 hover:bg-[#316ac5] hover:text-white flex items-center justify-between border-b border-neutral-200 dark:border-neutral-700"
                onclick={() => selectSearchResult(res)}
              >
                <span class="font-semibold truncate">{res.title}</span>
                {#if res.author}
                  <span class="text-[10px] opacity-70 truncate ml-1">{res.author}</span>
                {/if}
              </button>
            {/each}
          </div>
        {/if}

        <button
          type="button"
          class="flex items-center justify-center rounded-none border border-transparent hover:border-[#7f9db9] hover:bg-[#e0edf9]"
          style="width: calc(20px * var(--ui-scale)); height: calc(20px * var(--ui-scale));"
          title={t('toolbar.ccli')}
        >
          <SongBeamerIcon name="ccli" size={iconPx} />
        </button>
        <button
          type="button"
          class="flex items-center justify-center rounded-none border border-transparent hover:border-[#7f9db9] hover:bg-[#e0edf9]"
          style="width: calc(20px * var(--ui-scale)); height: calc(20px * var(--ui-scale));"
          title={t('toolbar.history')}
        >
          <SongBeamerIcon name="history" size={iconPx} />
        </button>
      </div>

      <!-- 1px Separator -->
      <div class="w-px h-4 bg-[#c0c0c0] dark:bg-neutral-600 mx-0.5"></div>

      <!-- Languages Toolbar ("Sprachen" / "Alle" / "1" / "2" / "3" / "4") -->
      <div class="flex items-center space-x-0.5">
        <span class="font-normal text-neutral-600 dark:text-neutral-400 px-0.5" style="font-size: calc(11px * var(--ui-scale));">
          {t('toolbar.languages')}
        </span>
        <button
          type="button"
          class="px-1 text-[11px] rounded-none border {presentation.activeLanguageFilter === 'all'
            ? 'border-[#316ac5] bg-[#c2d5e8] font-bold text-neutral-900'
            : 'border-transparent hover:border-[#7f9db9] text-neutral-800 dark:text-neutral-200'}"
          style="height: calc(20px * var(--ui-scale)); font-size: calc(11px * var(--ui-scale));"
          onclick={() => (presentation.activeLanguageFilter = 'all')}
        >
          {t('toolbar.langAll')}
        </button>
        {#each [1, 2, 3, 4] as langIdx}
          <button
            type="button"
            class="px-1 text-[11px] rounded-none border {presentation.activeLanguageFilter === langIdx
              ? 'border-[#316ac5] bg-[#c2d5e8] font-bold text-neutral-900'
              : 'border-transparent hover:border-[#7f9db9] text-neutral-800 dark:text-neutral-200'}"
            style="height: calc(20px * var(--ui-scale)); font-size: calc(11px * var(--ui-scale));"
            onclick={() => (presentation.activeLanguageFilter = langIdx)}
          >
            {langIdx}
          </button>
        {/each}
      </div>
    </div>

    <!-- Right-aligned UI Scale / Zoom, Theme & Mode Controls -->
    <div class="flex items-center space-x-0.5 shrink-0">
      <!-- High-DPI UI Scale Zoom Controls -->
      <button
        type="button"
        class="px-1 border border-[#7f9db9] bg-[#f0f0f0] dark:bg-neutral-800 hover:bg-[#e0edf9] rounded-none font-bold"
        style="height: calc(20px * var(--ui-scale)); font-size: calc(11px * var(--ui-scale));"
        title={t('toolbar.zoomOut')}
        onclick={() => presentation.zoomOut()}
      >
        −
      </button>
      <button
        type="button"
        class="px-1 border border-[#7f9db9] bg-[#f0f0f0] dark:bg-neutral-800 hover:bg-[#e0edf9] rounded-none font-mono font-semibold"
        style="height: calc(20px * var(--ui-scale)); font-size: calc(10px * var(--ui-scale));"
        title={presentation.uiScaleMode === 'auto' ? t('toolbar.zoomAuto') : t('toolbar.zoomReset')}
        onclick={() => presentation.toggleZoomMode()}
      >
        {presentation.uiScaleMode === 'auto' ? 'Auto' : `${Math.round(presentation.uiScale * 100)}%`}
      </button>
      <button
        type="button"
        class="px-1 border border-[#7f9db9] bg-[#f0f0f0] dark:bg-neutral-800 hover:bg-[#e0edf9] rounded-none font-bold"
        style="height: calc(20px * var(--ui-scale)); font-size: calc(11px * var(--ui-scale));"
        title={t('toolbar.zoomIn')}
        onclick={() => presentation.zoomIn()}
      >
        +
      </button>

      <!-- 1px Separator -->
      <div class="w-px h-4 bg-[#c0c0c0] dark:bg-neutral-600 mx-0.5"></div>

      <button
        type="button"
        class="px-1.5 font-semibold border border-[#7f9db9] bg-[#f0f0f0] dark:bg-neutral-800 hover:bg-[#e0edf9] rounded-none flex items-center"
        style="height: calc(20px * var(--ui-scale)); font-size: calc(11px * var(--ui-scale));"
        title={t('toolbar.toggleTheme')}
        onclick={() => presentation.toggleTheme()}
      >
        {presentation.theme === 'dark' ? '☀️' : '🌙'}
      </button>
      <button
        type="button"
        class="px-1.5 font-bold border border-[#7f9db9] bg-[#f0f0f0] dark:bg-neutral-800 hover:bg-[#e0edf9] rounded-none cursor-pointer"
        style="height: calc(20px * var(--ui-scale)); font-size: calc(10px * var(--ui-scale));"
        title={i18n.locale === 'de' ? t('toolbar.switchToEnglish') : t('toolbar.switchToGerman')}
        onclick={() => i18n.setLocale(i18n.locale === 'de' ? 'en' : 'de')}
      >
        {i18n.locale.toUpperCase()}
      </button>
      <button
        type="button"
        class="px-1.5 font-semibold border border-[#7f9db9] bg-[#f0f0f0] dark:bg-neutral-800 hover:bg-[#e0edf9] rounded-none"
        style="height: calc(20px * var(--ui-scale)); font-size: calc(11px * var(--ui-scale));"
        title={t('toolbar.settings')}
        onclick={() => presentation.toggleSettings()}
      >
        ⚙️
      </button>
    </div>
  </header>

  <!-- 3. Main Workspace: 3-Column SongBeamer Classic Layout -->
  <main class="flex-1 flex overflow-hidden">
    <!-- COLUMN 1: Ablaufplan (Schedule) - Fixed 250px Width, Dense Table View -->
    <aside
      class="shrink-0 border-r flex flex-col h-full rounded-none overflow-hidden {presentation.theme === 'dark'
        ? 'border-neutral-700 bg-[#1e2227]'
        : 'border-[#b0b0b0] bg-[#f4f4f4]'}"
      style="width: calc(250px * var(--ui-scale));"
    >
      <!-- Schedule Items Table -->
      <div
        role="region"
        aria-label="Ablaufplan"
        class="flex-1 overflow-y-auto"
      >
        {#if presentation.schedule.length === 0}
          <div class="p-4 text-center text-neutral-500" style="font-size: calc(11px * var(--ui-scale));">
            {t('schedule.empty')}
          </div>
        {:else}
          {#each presentation.schedule as item, idx}
            {@const isActive = presentation.activeScheduleIndex === idx}
            {@const isDragging = draggingIndex === idx}
            {@const isDropTarget = targetIndex === idx && draggingIndex !== null && draggingIndex !== idx}

            <div
              role="button"
              tabindex="0"
              data-classic-schedule-idx={idx}
              class="w-full px-1.5 flex items-center justify-center border-b border-[#d6d6d6] dark:border-neutral-700 rounded-none cursor-pointer transition-none select-none relative {isDragging
                ? 'opacity-40 bg-amber-100'
                : ''} {getItemColorClass(item, isActive)}"
              style="height: calc(24px * var(--ui-scale)); font-size: calc(12px * var(--ui-scale));"
              onpointerdown={(e) => handleSchedulePointerDown(e, idx)}
              onpointermove={handleSchedulePointerMove}
              onpointerup={handleSchedulePointerUp}
              onpointercancel={handleSchedulePointerCancel}
              onclick={() => presentation.selectScheduleItem(idx)}
              ondblclick={() => {
                if (item.item_type.kind === 'Song') {
                  presentation.openSongEditor(item.item_type.payload);
                }
              }}
              onkeydown={(e) => {
                if (e.key === 'Enter') presentation.selectScheduleItem(idx);
              }}
            >
              {#if isDropTarget}
                <div
                  class="absolute left-0 right-0 h-0.5 bg-blue-600 pointer-events-none z-10 {targetPosition === 'before'
                    ? 'top-0'
                    : 'bottom-0'}"
                ></div>
              {/if}

              <span class="truncate text-center w-full select-none">
                {item.title}
              </span>
            </div>
          {/each}
        {/if}
      </div>

      <!-- Schedule Toolbar (Bottom of column 1) -->
      <div
        class="border-t border-[#b0b0b0] dark:border-neutral-700 px-1.5 flex items-center justify-between shrink-0 {presentation.theme === 'dark'
          ? 'bg-[#21252b]'
          : 'bg-[#f4f4f4]'}"
        style="height: calc(24px * var(--ui-scale)); font-size: calc(11px * var(--ui-scale));"
      >
        <span class="text-neutral-500 font-mono">
          {presentation.schedule.length === 1 ? t('schedule.itemCountOne') : t('schedule.itemCount', { count: presentation.schedule.length })}
        </span>
        <div class="flex items-center space-x-1">
          <button
            type="button"
            class="px-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-none"
            title={t('schedule.moveUp')}
            onclick={() => {
              if (presentation.activeScheduleIndex > 0) {
                presentation.reorderSchedule(
                  presentation.activeScheduleIndex,
                  presentation.activeScheduleIndex - 1
                );
              }
            }}
          >
            ▲
          </button>
          <button
            type="button"
            class="px-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-none"
            title={t('schedule.moveDown')}
            onclick={() => {
              if (presentation.activeScheduleIndex < presentation.schedule.length - 1) {
                presentation.reorderSchedule(
                  presentation.activeScheduleIndex,
                  presentation.activeScheduleIndex + 1
                );
              }
            }}
          >
            ▼
          </button>
          <button
            type="button"
            class="px-1 text-red-600 hover:bg-red-100 rounded-none"
            title={t('schedule.remove')}
            onclick={() => {
              if (presentation.activeScheduleIndex >= 0) {
                presentation.removeFromSchedule(presentation.activeScheduleIndex);
              }
            }}
          >
            ✕
          </button>
        </div>
      </div>
    </aside>

    <!-- COLUMN 2: Folien-Deck (SongBeamer 2-Column Aspect-Ratio Slide Deck) -->
    <section
      class="flex-1 min-w-0 flex flex-col h-full rounded-none overflow-hidden {presentation.theme === 'dark'
        ? 'bg-[#181a1f]'
        : 'bg-[#ffffff]'}"
    >
      <!-- Slide Deck Header -->
      <div
        class="px-2 border-b border-[#b0b0b0] dark:border-neutral-700 flex items-center justify-between shrink-0 {presentation.theme === 'dark'
          ? 'bg-[#21252b]'
          : 'bg-[#f4f4f4]'}"
        style="height: calc(24px * var(--ui-scale)); font-size: calc(11px * var(--ui-scale));"
      >
        <span class="font-bold text-neutral-800 dark:text-neutral-200 truncate">
          {presentation.activeSong?.metadata.title ?? t('song.noSongLoaded')}
        </span>
        <span class="font-mono text-neutral-500">
          {presentation.activeSong?.slides.length ?? 0} {presentation.activeSong?.slides.length === 1 ? t('section.slide') : t('section.slidePlural')}
        </span>
      </div>

      <!-- Slide Deck Scroll Area -->
      <div class="flex-1 overflow-y-auto p-2">
        {#if presentation.activeSong && presentation.activeSlides.length > 0}
          <div class="grid grid-cols-2 gap-2 max-w-full">
            {#each presentation.activeSlides as slide, idx}
              {@const isLive = presentation.activeSlideIndex === idx}

              <div
                role="button"
                tabindex="0"
                class="flex flex-col border rounded-none cursor-pointer transition-none select-none {isLive
                  ? 'border-[#cc0000] dark:border-[#e53935] bg-white dark:bg-[#21252b] shadow-sm'
                  : 'border-[#b0b0b0] dark:border-neutral-700 bg-white dark:bg-[#21252b] hover:bg-neutral-50 dark:hover:bg-[#282c34]'}"
                onclick={() => presentation.selectSlide(idx)}
                onkeydown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    presentation.selectSlide(idx);
                  }
                }}
              >
                <!-- Slide Header: Blue Section Label on Left, Red Slide Number on Right -->
                <div class="flex items-center justify-between px-1.5 py-0.5 font-bold" style="font-size: calc(11px * var(--ui-scale));">
                  <span class="text-[#0000cc] dark:text-[#70a0ff] tracking-tight">
                    {slide.label}
                  </span>
                  <div class="flex items-center gap-1.5">
                    {#if isLive}
                      <span class="text-[10px] font-bold text-[#cc0000] dark:text-[#e53935]">
                        ● LIVE
                      </span>
                    {/if}
                    <span class="text-[#cc0000] font-bold font-mono">
                      {idx + 1}
                    </span>
                  </div>
                </div>

                <!-- Slide Thumbnail Container: Dynamic Aspect Ratio with Container Query for 1:1 WYSIWYG parity -->
                <!-- Consistent black canvas matching Beamer exactly, with red border when selected -->
                <div
                  class="w-full relative overflow-hidden bg-black text-white {isLive
                    ? 'border border-[#cc0000] dark:border-[#e53935] ring-1 ring-[#cc0000] dark:ring-[#e53935] ring-inset'
                    : 'border border-[#7f9db9] dark:border-neutral-700'}"
                  style="aspect-ratio: {presentation.aspectRatio.replace(':', '/')}; container-type: size;"
                >
                  <!-- Optional Song Background & Dimmer Layer -->
                  {#if activeSongBg}
                    {#if isImageBackground(activeSongBg)}
                      <div
                        class="absolute inset-0 bg-cover bg-center pointer-events-none z-0"
                        style="background-image: url('{activeSongBg}');"
                      ></div>
                    {:else}
                      <div
                        class="absolute inset-0 pointer-events-none z-0"
                        style="background: {activeSongBg};"
                      ></div>
                    {/if}
                    <div class="absolute inset-0 bg-black pointer-events-none z-0" style="opacity: {activeSongDimmer};"></div>
                  {/if}

                  <div
                    class="absolute inset-0 flex items-center justify-center text-center overflow-hidden relative z-10"
                    style="padding: 5cqh 6cqw;"
                  >
                    <!-- Lyrics Text Preview (Prominent, bold, readable thumbnail parity) -->
                    <div
                      class="w-full font-bold"
                      style="font-size: {calculateSlideFontSize(slide, false, presentation.aspectRatio)}; line-height: 1.35;"
                    >
                      {#each slide.lines as line}
                        {@const renderStyle = getLineRenderStyle(line, formatOpts)}
                        {@const text = getAudienceText(line)}
                        <p
                          data-testid="slide-lyric-line"
                          class="whitespace-nowrap overflow-visible m-0 p-0"
                          style="line-height: inherit; text-align: {renderStyle.textAlign}; {renderStyle.textStyle}"
                        >
                          {text}
                        </p>
                      {/each}
                    </div>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <div class="h-full flex items-center justify-center text-neutral-500 text-xs">
            {t('song.noSongLoaded')}
          </div>
        {/if}
      </div>
    </section>

    <!-- COLUMN 3: Vorschau-Bereich & Beamer-Kontrollbuttons (Rechts / Unten) -->
    <aside
      class="border-l flex flex-col h-full rounded-none shrink-0 overflow-hidden select-none {presentation.theme === 'dark'
        ? 'border-neutral-700 bg-[#1e2227]'
        : 'border-[#b0b0b0] bg-[#f4f4f4]'}"
      style="width: calc(280px * var(--ui-scale));"
    >
      <!-- Top Half: Live Audience Beamer Preview (Exact Replica) -->
      <div class="p-2 border-b border-[#b0b0b0] dark:border-neutral-700 flex flex-col gap-1.5">
        <div class="flex items-center justify-between font-bold text-neutral-700 dark:text-neutral-300" style="font-size: calc(11px * var(--ui-scale));">
          <span>{t('slide.audienceView')}</span>
          <span class="text-[10px] text-neutral-500 font-mono">
            {presentation.activeSlide ? `${presentation.activeSlide.label} (${presentation.activeSlideIndex + 1}/${presentation.activeSong?.slides.length ?? 0})` : ''}
          </span>
        </div>

        <div
          class="w-full bg-black border border-[#7f9db9] rounded-none relative overflow-hidden text-white"
          style="aspect-ratio: {presentation.aspectRatio.replace(':', '/')}; container-type: size;"
        >
          {#if presentation.displayMode === 'black'}
            <div class="absolute inset-0 bg-black flex items-center justify-center">
              <span class="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">{t('status.black')}</span>
            </div>
          {:else if presentation.displayMode === 'clear_text'}
            <div class="absolute inset-0 bg-neutral-950 flex items-center justify-center">
              <span class="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">{t('status.clear')}</span>
            </div>
          {:else if presentation.displayMode === 'logo'}
            <div class="absolute inset-0 bg-neutral-900 flex flex-col items-center justify-center">
              <span class="text-xl font-bold text-amber-500">Noah</span>
            </div>
          {:else if presentation.activeSlide}
            <!-- Optional Song Background & Dimmer Layer for Live Audience Preview -->
            {#if activeSongBg && (presentation.displayMode === 'normal' || !presentation.displayMode)}
              {#if isImageBackground(activeSongBg)}
                <div
                  class="absolute inset-0 bg-cover bg-center pointer-events-none z-0"
                  style="background-image: url('{activeSongBg}');"
                ></div>
              {:else}
                <div
                  class="absolute inset-0 pointer-events-none z-0"
                  style="background: {activeSongBg};"
                ></div>
              {/if}
              <div class="absolute inset-0 bg-black pointer-events-none z-0" style="opacity: {activeSongDimmer};"></div>
            {/if}

            <div
              class="absolute inset-0 flex items-center justify-center text-center overflow-hidden relative z-10"
              style="padding: 5cqh 6cqw;"
            >
              <div
                class="w-full font-bold"
                style="font-size: {calculateSlideFontSize(presentation.activeSlide, false, presentation.aspectRatio)}; line-height: 1.35;"
              >
                {#each presentation.activeSlide.lines as line}
                  {@const renderStyle = getLineRenderStyle(line, formatOpts)}
                  {@const text = getAudienceText(line)}
                  <p
                    data-testid="audience-preview-line"
                    class="whitespace-nowrap overflow-visible m-0 p-0"
                    style="line-height: inherit; text-align: {renderStyle.textAlign}; {renderStyle.textStyle}"
                  >
                    {text}
                  </p>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      </div>

      <!-- Center Control Buttons: Primary Beamer Controls (Black, Clear, Logo, Normal) -->
      <div class="p-2 border-b border-[#b0b0b0] dark:border-neutral-700 flex flex-col gap-1.5">
        <div class="font-bold text-neutral-700 dark:text-neutral-300" style="font-size: calc(11px * var(--ui-scale));">
          {t('toolbar.quickControls')}
        </div>
        <div class="grid grid-cols-2 gap-1">
          <button
            type="button"
            class="border rounded-none font-semibold flex items-center justify-center gap-1 transition-none {presentation.displayMode === 'normal'
              ? 'border-[#316ac5] bg-[#c2d5e8] text-neutral-900'
              : 'border-[#7f9db9] bg-[#f0f0f0] dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 hover:bg-[#e0edf9]'}"
            style="height: calc(28px * var(--ui-scale)); font-size: calc(11px * var(--ui-scale));"
            onclick={() => presentation.setDisplayMode('normal')}
          >
            <SongBeamerIcon name="slide-text" size={iconPx} />
            <span>{t('toolbar.btnText')}</span>
          </button>
          <button
            type="button"
            class="border rounded-none font-semibold flex items-center justify-center gap-1 transition-none {presentation.displayMode === 'black'
              ? 'border-[#316ac5] bg-[#c2d5e8] text-neutral-900'
              : 'border-[#7f9db9] bg-[#f0f0f0] dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 hover:bg-[#e0edf9]'}"
            style="height: calc(28px * var(--ui-scale)); font-size: calc(11px * var(--ui-scale));"
            onclick={() => presentation.setDisplayMode('black')}
          >
            <SongBeamerIcon name="screen-black" size={iconPx} />
            <span>{t('toolbar.btnBlack')}</span>
          </button>
          <button
            type="button"
            class="border rounded-none font-semibold flex items-center justify-center gap-1 transition-none {presentation.displayMode === 'clear_text'
              ? 'border-[#316ac5] bg-[#c2d5e8] text-neutral-900'
              : 'border-[#7f9db9] bg-[#f0f0f0] dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 hover:bg-[#e0edf9]'}"
            style="height: calc(28px * var(--ui-scale)); font-size: calc(11px * var(--ui-scale));"
            onclick={() => presentation.setDisplayMode('clear_text')}
          >
            <SongBeamerIcon name="slide-clear" size={iconPx} />
            <span>{t('toolbar.btnClear')}</span>
          </button>
          <button
            type="button"
            class="border rounded-none font-semibold flex items-center justify-center gap-1 transition-none {presentation.displayMode === 'logo'
              ? 'border-[#316ac5] bg-[#c2d5e8] text-neutral-900'
              : 'border-[#7f9db9] bg-[#f0f0f0] dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 hover:bg-[#e0edf9]'}"
            style="height: calc(28px * var(--ui-scale)); font-size: calc(11px * var(--ui-scale));"
            onclick={() => presentation.setDisplayMode('logo')}
          >
            <span class="font-bold text-amber-600">N</span>
            <span>{t('toolbar.btnLogo')}</span>
          </button>
        </div>
      </div>

      <!-- Bottom Half: Stage Confidence Monitor (Next Slide + Clock) -->
      <div class="flex-1 p-2 flex flex-col justify-between overflow-hidden">
        <div>
          <div class="flex items-center justify-between font-bold text-neutral-700 dark:text-neutral-300 mb-1" style="font-size: calc(11px * var(--ui-scale));">
            <span>{t('toolbar.stageConfidence')}</span>
            <span class="font-mono text-neutral-500">{currentTime}</span>
          </div>

          {#if nextSlide}
            <div class="border border-[#7f9db9] bg-white dark:bg-neutral-900 p-2 rounded-none" style="font-size: calc(11px * var(--ui-scale));">
              <span class="text-[10px] font-bold text-amber-600 block mb-0.5">{t('deck.nextSlideHint')}</span>
              <p class="truncate text-neutral-800 dark:text-neutral-200">
                {nextSlide.lines.map((l) => getAudienceText(l)).join(' / ')}
              </p>
            </div>
          {/if}
        </div>

        <!-- Navigation Buttons -->
        <div class="flex items-center gap-1 mt-2">
          <button
            type="button"
            class="flex-1 border border-[#7f9db9] bg-[#f0f0f0] dark:bg-neutral-800 font-bold rounded-none hover:bg-[#e0edf9]"
            style="height: calc(28px * var(--ui-scale)); font-size: calc(11px * var(--ui-scale));"
            onclick={() => presentation.prevSlide()}
          >
            ← {t('slide.prev')}
          </button>
          <button
            type="button"
            class="flex-1 border border-[#7f9db9] bg-[#f0f0f0] dark:bg-neutral-800 font-bold rounded-none hover:bg-[#e0edf9]"
            style="height: calc(28px * var(--ui-scale)); font-size: calc(11px * var(--ui-scale));"
            onclick={() => presentation.nextSlide()}
          >
            {t('slide.next')} →
          </button>
        </div>
      </div>
    </aside>
  </main>

  <!-- 4. Status Bar: Compact 20px Win32 Status Bar -->
  <footer
    class="px-2 flex items-center justify-between border-t rounded-none shrink-0 {presentation.theme === 'dark'
      ? 'bg-[#181a1f] border-neutral-700 text-neutral-400'
      : 'bg-[#f0f0f0] border-[#b0b0b0] text-neutral-700'}"
    style="height: calc(20px * var(--ui-scale)); font-size: calc(11px * var(--ui-scale));"
  >
    <div class="flex items-center gap-3">
      <span class="flex items-center gap-1">
        <span class="w-2 h-2 rounded-none {presentation.isBeamerActive ? 'bg-emerald-500' : 'bg-neutral-400'}"></span>
        {presentation.isBeamerActive ? t('status.beamerReady') : t('status.beamerDisconnected')}
      </span>
      {#if presentation.activeSong}
        <span class="border-l border-neutral-400 pl-3 font-semibold text-neutral-800 dark:text-neutral-200 truncate">
          {presentation.activeSong.metadata.title}
        </span>
      {/if}
    </div>
    <div class="flex items-center gap-3 font-mono">
      <span>{presentation.aspectRatio}</span>
      <span>{presentation.uiMode.toUpperCase()}</span>
    </div>
  </footer>

  <!-- Floating Drag Ghost Badge following the pointer -->
  {#if hasMoved && draggingIndex !== null && draggedItem}
    <div
      class="fixed pointer-events-none z-50 px-2 py-1 rounded-none shadow-md border border-[#7f9db9] bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white flex items-center gap-1 select-none -translate-x-1/2 -translate-y-1/2 text-xs font-bold"
      style="left: {pointerX}px; top: {pointerY}px; max-width: 240px;"
    >
      <span class="truncate">{draggedItem.title}</span>
    </div>
  {/if}
</div>

<style>
  /* Dynamic container query font sizing for slide preview cards and confidence preview */
  .slide-lyrics-preview {
    font-size: clamp(0.7rem, 3.2cqw, 1.8rem);
    line-height: 1.35;
  }
</style>
