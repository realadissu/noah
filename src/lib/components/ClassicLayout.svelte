<script lang="ts">
  import { t } from '$lib/i18n';
  import { presentation } from '$lib/stores/presentation.svelte';
  import SongBeamerIcon from '$lib/components/icons/SongBeamerIcon.svelte';
  import type { ScheduleItem, Slide, LyricLine } from '$lib/types/models';

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
    presentation.activeSong && presentation.activeSlideIndex + 1 < presentation.activeSong.slides.length
      ? presentation.activeSong.slides[presentation.activeSlideIndex + 1]
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

    const el = e.currentTarget as HTMLElement | null;
    if (el) {
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        // Fallback
      }
    }
  }

  function handleSchedulePointerMove(e: PointerEvent) {
    if (!isPointerDown) return;
    pointerX = e.clientX;
    pointerY = e.clientY;

    if (!hasMoved && Math.abs(e.clientY - startY) > 5) {
      hasMoved = true;
      draggingIndex = startIndex;
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

  function handleSchedulePointerUp() {
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
    }

    draggingIndex = null;
    targetIndex = null;
    startIndex = null;
    hasMoved = false;
  }

  function handleSchedulePointerCancel() {
    isPointerDown = false;
    draggingIndex = null;
    targetIndex = null;
    startIndex = null;
    hasMoved = false;
  }

  // --- Dynamic Search Filter ---
  let searchQuery = $state('');

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
</script>

<!-- Outer Container: SongBeamer Classic Layout -->
<div
  class="flex flex-col h-full w-full select-none overflow-hidden font-sans text-xs rounded-none {presentation.theme === 'dark'
    ? 'bg-[#1e2227] text-neutral-200'
    : 'bg-[#ece9d8] text-neutral-900'}"
>
  <!-- 1. Menubar: Compact 24px Win32 Classic Menu -->
  <nav
    class="h-6 px-1 flex items-center space-x-1 border-b rounded-none shrink-0 text-xs {presentation.theme === 'dark'
      ? 'bg-[#282c34] border-neutral-700 text-neutral-300'
      : 'bg-[#f4f4f4] border-[#d0d0d0] text-neutral-900'}"
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

  <!-- 2. Toolbar: Fixed 26px Toolbar with 22x22px Buttons & 1px Separators -->
  <header
    class="h-[26px] px-1.5 flex items-center justify-between border-b rounded-none shrink-0 gap-1 overflow-x-auto {presentation.theme === 'dark'
      ? 'bg-[#21252b] border-neutral-700'
      : 'bg-[#ece9d8] border-[#b0b0b0]'}"
  >
    <div class="flex items-center space-x-0.5 shrink-0">
      <!-- Docking Grip Dots -->
      <div class="flex flex-col gap-0.5 px-0.5 cursor-grab opacity-40 hover:opacity-80">
        <div class="w-0.5 h-0.5 bg-black dark:bg-white"></div>
        <div class="w-0.5 h-0.5 bg-black dark:bg-white"></div>
        <div class="w-0.5 h-0.5 bg-black dark:bg-white"></div>
      </div>

      <!-- File Actions -->
      <button
        type="button"
        class="w-[22px] h-[22px] p-0.5 flex items-center justify-center rounded-none border border-transparent hover:border-[#7f9db9] hover:bg-[#e0edf9] active:bg-[#c2d5e8]"
        title={t('toolbar.newSchedule')}
        onclick={() => { presentation.schedule = []; }}
      >
        <SongBeamerIcon name="new" size={16} />
      </button>
      <button
        type="button"
        class="w-[22px] h-[22px] p-0.5 flex items-center justify-center rounded-none border border-transparent hover:border-[#7f9db9] hover:bg-[#e0edf9] active:bg-[#c2d5e8]"
        title={t('toolbar.openSchedule')}
      >
        <SongBeamerIcon name="open" size={16} />
      </button>
      <button
        type="button"
        class="w-[22px] h-[22px] p-0.5 flex items-center justify-center rounded-none border border-transparent hover:border-[#7f9db9] hover:bg-[#e0edf9] active:bg-[#c2d5e8]"
        title={t('toolbar.saveSchedule')}
      >
        <SongBeamerIcon name="save" size={16} />
      </button>

      <!-- 1px Separator -->
      <div class="w-px h-4 bg-[#c0c0c0] dark:bg-neutral-600 mx-1"></div>

      <!-- Song Actions -->
      <button
        type="button"
        class="w-[22px] h-[22px] p-0.5 flex items-center justify-center rounded-none border border-transparent hover:border-[#7f9db9] hover:bg-[#e0edf9] active:bg-[#c2d5e8]"
        title={t('toolbar.newSong')}
        onclick={() => presentation.openSongEditor()}
      >
        <SongBeamerIcon name="song" size={16} />
      </button>
      <button
        type="button"
        class="w-[22px] h-[22px] p-0.5 flex items-center justify-center rounded-none border border-transparent hover:border-[#7f9db9] hover:bg-[#e0edf9] active:bg-[#c2d5e8]"
        title={t('toolbar.openSong')}
        onclick={() => presentation.openSongFileDialog()}
      >
        <SongBeamerIcon name="open" size={16} />
      </button>
      <button
        type="button"
        class="w-[22px] h-[22px] p-0.5 flex items-center justify-center rounded-none border border-transparent hover:border-[#7f9db9] hover:bg-[#e0edf9] active:bg-[#c2d5e8]"
        title={t('toolbar.editSong')}
        onclick={() => presentation.openSongEditor()}
      >
        <SongBeamerIcon name="edit" size={16} />
      </button>

      <!-- 1px Separator -->
      <div class="w-px h-4 bg-[#c0c0c0] dark:bg-neutral-600 mx-1"></div>

      <!-- Media & Scripture -->
      <button
        type="button"
        class="w-[22px] h-[22px] p-0.5 flex items-center justify-center rounded-none border border-transparent hover:border-[#7f9db9] hover:bg-[#e0edf9] active:bg-[#c2d5e8]"
        title={t('toolbar.bible')}
      >
        <SongBeamerIcon name="bible" size={16} />
      </button>
      <button
        type="button"
        class="w-[22px] h-[22px] p-0.5 flex items-center justify-center rounded-none border border-transparent hover:border-[#7f9db9] hover:bg-[#e0edf9] active:bg-[#c2d5e8]"
        title={t('toolbar.media')}
      >
        <SongBeamerIcon name="video" size={16} />
      </button>

      <!-- 1px Separator -->
      <div class="w-px h-4 bg-[#c0c0c0] dark:bg-neutral-600 mx-1"></div>

      <!-- Beamer Direct Controls in Toolbar -->
      <button
        type="button"
        class="w-[22px] h-[22px] p-0.5 flex items-center justify-center rounded-none border {presentation.displayMode === 'normal'
          ? 'border-[#316ac5] bg-[#c2d5e8]'
          : 'border-transparent hover:border-[#7f9db9] hover:bg-[#e0edf9] active:bg-[#c2d5e8]'}"
        title={t('toolbar.normal')}
        onclick={() => presentation.setDisplayMode('normal')}
      >
        <SongBeamerIcon name="slide-text" size={16} />
      </button>
      <button
        type="button"
        class="w-[22px] h-[22px] p-0.5 flex items-center justify-center rounded-none border {presentation.displayMode === 'clear_text'
          ? 'border-[#316ac5] bg-[#c2d5e8]'
          : 'border-transparent hover:border-[#7f9db9] hover:bg-[#e0edf9] active:bg-[#c2d5e8]'}"
        title={t('toolbar.clear')}
        onclick={() => presentation.setDisplayMode('clear_text')}
      >
        <SongBeamerIcon name="slide-clear" size={16} />
      </button>
      <button
        type="button"
        class="w-[22px] h-[22px] p-0.5 flex items-center justify-center rounded-none border {presentation.displayMode === 'black'
          ? 'border-[#316ac5] bg-[#c2d5e8]'
          : 'border-transparent hover:border-[#7f9db9] hover:bg-[#e0edf9] active:bg-[#c2d5e8]'}"
        title={t('toolbar.black')}
        onclick={() => presentation.setDisplayMode('black')}
      >
        <SongBeamerIcon name="screen-black" size={16} />
      </button>
      <button
        type="button"
        class="w-[22px] h-[22px] p-0.5 flex items-center justify-center rounded-none border {presentation.displayMode === 'logo'
          ? 'border-[#316ac5] bg-[#c2d5e8]'
          : 'border-transparent hover:border-[#7f9db9] hover:bg-[#e0edf9] active:bg-[#c2d5e8]'}"
        title={t('toolbar.logo')}
        onclick={() => presentation.setDisplayMode('logo')}
      >
        <span class="font-bold text-[11px] text-amber-600">N</span>
      </button>

      <!-- 1px Separator -->
      <div class="w-px h-4 bg-[#c0c0c0] dark:bg-neutral-600 mx-1"></div>

      <!-- Chords Toggle Button -->
      <button
        type="button"
        class="w-[22px] h-[22px] p-0.5 flex items-center justify-center rounded-none border {presentation.showChords
          ? 'border-[#316ac5] bg-[#c2d5e8]'
          : 'border-transparent hover:border-[#7f9db9] hover:bg-[#e0edf9] active:bg-[#c2d5e8]'}"
        title={t('toolbar.toggleChords')}
        onclick={() => presentation.toggleChords()}
      >
        <SongBeamerIcon name="chords" size={16} />
      </button>

      <!-- 1px Separator -->
      <div class="w-px h-4 bg-[#c0c0c0] dark:bg-neutral-600 mx-1"></div>

      <!-- Quick Search Bar: "Song suchen:" -->
      <div class="flex items-center gap-1 pl-1">
        <label for="sb-quick-search" class="text-[11px] font-normal text-neutral-700 dark:text-neutral-300 shrink-0">
          {t('search.label')}
        </label>
        <input
          id="sb-quick-search"
          type="text"
          bind:value={searchQuery}
          class="h-5 w-28 px-1 text-[11px] border border-[#7f9db9] bg-white dark:bg-neutral-900 rounded-none focus:outline-none focus:border-[#316ac5]"
        />
      </div>

      <!-- 1px Separator -->
      <div class="w-px h-4 bg-[#c0c0c0] dark:bg-neutral-600 mx-1"></div>

      <!-- Languages Toolbar ("Sprachen" / "Alle" / "1" / "2") -->
      <div class="flex items-center space-x-0.5">
        <span class="text-[11px] font-normal text-neutral-600 dark:text-neutral-400 px-1">
          {t('toolbar.languages')}
        </span>
        <button
          type="button"
          class="h-5 px-1.5 text-[11px] rounded-none border border-[#316ac5] bg-[#c2d5e8] text-neutral-900 font-semibold"
        >
          {t('toolbar.langAll')}
        </button>
        <button
          type="button"
          class="h-5 px-1 text-[11px] rounded-none border border-transparent hover:border-[#7f9db9] text-neutral-800 dark:text-neutral-200"
        >
          1
        </button>
        <button
          type="button"
          class="h-5 px-1 text-[11px] rounded-none border border-transparent hover:border-[#7f9db9] text-neutral-800 dark:text-neutral-200"
        >
          2
        </button>
      </div>
    </div>

    <!-- Right-aligned System & Mode Toggles -->
    <div class="flex items-center space-x-1 shrink-0">
      <button
        type="button"
        class="h-5 px-2 text-[11px] font-semibold border border-[#7f9db9] bg-[#f0f0f0] dark:bg-neutral-800 hover:bg-[#e0edf9] rounded-none flex items-center gap-1"
        title={t('toolbar.toggleTheme')}
        onclick={() => presentation.toggleTheme()}
      >
        {presentation.theme === 'dark' ? '☀️' : '🌙'}
      </button>
      <button
        type="button"
        class="h-5 px-2 text-[11px] font-semibold border border-[#7f9db9] bg-[#f0f0f0] dark:bg-neutral-800 hover:bg-[#e0edf9] rounded-none"
        title={t('toolbar.settings')}
        onclick={() => presentation.toggleSettings()}
      >
        ⚙️ {t('toolbar.settings')}
      </button>
    </div>
  </header>

  <!-- 3. Main Workspace: 3-Column SongBeamer Classic Layout -->
  <main class="flex-1 flex overflow-hidden">
    <!-- COLUMN 1: Ablaufplan (Schedule) - Fixed 250px Width, Dense Table View -->
    <aside
      class="w-[250px] shrink-0 border-r flex flex-col h-full rounded-none overflow-hidden {presentation.theme === 'dark'
        ? 'border-neutral-700 bg-[#1e2227]'
        : 'border-[#b0b0b0] bg-[#f4f4f4]'}"
    >
      <!-- Schedule Items Table -->
      <div
        role="region"
        aria-label="Ablaufplan"
        class="flex-1 overflow-y-auto"
      >
        {#if presentation.schedule.length === 0}
          <div class="p-4 text-center text-xs text-neutral-500">
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
              class="w-full h-6 px-1.5 flex items-center justify-center border-b border-[#d6d6d6] dark:border-neutral-700 rounded-none cursor-pointer transition-none select-none relative {isDragging
                ? 'opacity-40 bg-amber-100'
                : ''} {getItemColorClass(item, isActive)}"
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
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  presentation.selectScheduleItem(idx);
                }
              }}
            >
              <!-- Drop indicator line -->
              {#if isDropTarget && targetPosition === 'before'}
                <div class="absolute -top-px left-0 right-0 h-[2px] bg-[#316ac5] z-30 pointer-events-none"></div>
              {/if}
              {#if isDropTarget && targetPosition === 'after'}
                <div class="absolute -bottom-px left-0 right-0 h-[2px] bg-[#316ac5] z-30 pointer-events-none"></div>
              {/if}

              <!-- Centered Bold Title (Exact SongBeamer Look) -->
              <span class="truncate text-[12px] font-bold text-center pointer-events-none">
                {item.title}
              </span>
            </div>
          {/each}
        {/if}
      </div>
    </aside>

    <!-- COLUMN 2: Folienübersicht (Slide Deck) - 2-Column Aspect-Ratio Slide Grid -->
    <section
      class="flex-1 min-w-0 flex flex-col h-full overflow-hidden rounded-none {presentation.theme === 'dark'
        ? 'bg-[#181a1f]'
        : 'bg-[#f0f0f0]'}"
    >
      <div class="flex-1 overflow-y-auto p-2">
        {#if presentation.activeSong && presentation.activeSong.slides.length > 0}
          <div class="grid grid-cols-2 gap-2 max-w-6xl mx-auto">
            {#each presentation.activeSong.slides as slide, idx}
              {@const isLive = presentation.activeSlideIndex === idx}
              <div
                role="button"
                tabindex="0"
                class="flex flex-col cursor-pointer rounded-none"
                onclick={() => presentation.selectSlide(idx)}
                onkeydown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    presentation.selectSlide(idx);
                  }
                }}
              >
                <!-- Slide Header: Blue Section Label on Left, Red Slide Number on Right -->
                <div class="flex items-center justify-between px-1 py-0.5 text-xs font-bold">
                  <span class="text-[#0000cc] dark:text-[#70a0ff] font-bold tracking-tight">
                    {slide.label}
                  </span>
                  <div class="flex items-center gap-1.5">
                    {#if isLive}
                      <span class="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        ● LIVE
                      </span>
                    {/if}
                    <span class="text-[#cc0000] font-bold font-mono text-xs">
                      {idx + 1}
                    </span>
                  </div>
                </div>

                <!-- Slide Thumbnail Container: 16:9 Aspect Ratio with 1px Border -->
                <div
                  class="w-full aspect-video border rounded-none relative overflow-hidden flex items-center justify-center text-center p-3 {isLive
                    ? 'border-[#0000cc] dark:border-emerald-500 ring-2 ring-[#0000cc]/30 bg-black text-white'
                    : 'border-[#999999] dark:border-neutral-700 bg-neutral-900 text-white'}"
                >
                  <!-- Lyrics Text Preview -->
                  <div class="w-full text-center space-y-1 font-semibold text-xs leading-snug drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                    {#each slide.lines as line}
                      <p class="truncate">{getAudienceText(line)}</p>
                    {/each}
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
      class="w-[280px] border-l flex flex-col h-full rounded-none shrink-0 overflow-hidden select-none {presentation.theme === 'dark'
        ? 'border-neutral-700 bg-[#1e2227]'
        : 'border-[#b0b0b0] bg-[#ece9d8]'}"
    >
      <!-- Top Half: Live Audience Beamer Preview (Exact Replica) -->
      <div class="p-2 border-b border-[#b0b0b0] dark:border-neutral-700 flex flex-col gap-1.5">
        <div class="flex items-center justify-between text-[11px] font-bold text-neutral-700 dark:text-neutral-300">
          <span>{t('slide.audienceView')}</span>
          <span class="text-[10px] text-neutral-500">
            {presentation.activeSlide ? `${presentation.activeSlide.label} (${presentation.activeSlideIndex + 1}/${presentation.activeSong?.slides.length ?? 0})` : ''}
          </span>
        </div>

        <div class="w-full aspect-video bg-black border border-[#7f9db9] rounded-none flex items-center justify-center p-2 text-center text-white relative">
          {#if presentation.displayMode === 'black'}
            <div class="absolute inset-0 bg-black flex items-center justify-center">
              <span class="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">BLACK</span>
            </div>
          {:else if presentation.displayMode === 'clear_text'}
            <div class="absolute inset-0 bg-neutral-950 flex items-center justify-center">
              <span class="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">CLEAR</span>
            </div>
          {:else if presentation.displayMode === 'logo'}
            <div class="absolute inset-0 bg-neutral-900 flex flex-col items-center justify-center">
              <span class="text-xl font-bold text-amber-500">Noah</span>
            </div>
          {:else if presentation.activeSlide}
            <div class="text-center font-bold text-xs space-y-0.5 leading-tight">
              {#each presentation.activeSlide.lines as line}
                <p class="truncate">{getAudienceText(line)}</p>
              {/each}
            </div>
          {/if}
        </div>
      </div>

      <!-- Center Control Buttons: Primary Beamer Controls (Black, Clear, Logo, Normal) -->
      <div class="p-2 border-b border-[#b0b0b0] dark:border-neutral-700 flex flex-col gap-1.5">
        <div class="text-[11px] font-bold text-neutral-700 dark:text-neutral-300">
          {t('toolbar.quickControls')}
        </div>
        <div class="grid grid-cols-2 gap-1">
          <button
            type="button"
            class="h-7 px-2 border rounded-none font-semibold text-xs flex items-center justify-center gap-1 transition-none {presentation.displayMode === 'normal'
              ? 'border-[#316ac5] bg-[#c2d5e8] text-neutral-900'
              : 'border-[#7f9db9] bg-[#f0f0f0] dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 hover:bg-[#e0edf9]'}"
            onclick={() => presentation.setDisplayMode('normal')}
          >
            <SongBeamerIcon name="slide-text" size={14} />
            <span>F4 Text</span>
          </button>
          <button
            type="button"
            class="h-7 px-2 border rounded-none font-semibold text-xs flex items-center justify-center gap-1 transition-none {presentation.displayMode === 'black'
              ? 'border-[#316ac5] bg-[#c2d5e8] text-neutral-900'
              : 'border-[#7f9db9] bg-[#f0f0f0] dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 hover:bg-[#e0edf9]'}"
            onclick={() => presentation.setDisplayMode('black')}
          >
            <SongBeamerIcon name="screen-black" size={14} />
            <span>F5 Black</span>
          </button>
          <button
            type="button"
            class="h-7 px-2 border rounded-none font-semibold text-xs flex items-center justify-center gap-1 transition-none {presentation.displayMode === 'clear_text'
              ? 'border-[#316ac5] bg-[#c2d5e8] text-neutral-900'
              : 'border-[#7f9db9] bg-[#f0f0f0] dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 hover:bg-[#e0edf9]'}"
            onclick={() => presentation.setDisplayMode('clear_text')}
          >
            <SongBeamerIcon name="slide-clear" size={14} />
            <span>F6 Clear</span>
          </button>
          <button
            type="button"
            class="h-7 px-2 border rounded-none font-semibold text-xs flex items-center justify-center gap-1 transition-none {presentation.displayMode === 'logo'
              ? 'border-[#316ac5] bg-[#c2d5e8] text-neutral-900'
              : 'border-[#7f9db9] bg-[#f0f0f0] dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 hover:bg-[#e0edf9]'}"
            onclick={() => presentation.setDisplayMode('logo')}
          >
            <span class="font-bold text-amber-600">N</span>
            <span>F7 Logo</span>
          </button>
        </div>
      </div>

      <!-- Bottom Half: Stage Confidence Monitor (Next Slide + Clock) -->
      <div class="flex-1 p-2 flex flex-col justify-between overflow-hidden">
        <div>
          <div class="flex items-center justify-between text-[11px] font-bold text-neutral-700 dark:text-neutral-300 mb-1">
            <span>{t('toolbar.stageConfidence')}</span>
            <span class="font-mono text-[11px] text-neutral-500">{currentTime}</span>
          </div>

          {#if nextSlide}
            <div class="border border-[#7f9db9] bg-white dark:bg-neutral-900 p-2 text-xs rounded-none">
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
            class="flex-1 h-7 border border-[#7f9db9] bg-[#f0f0f0] dark:bg-neutral-800 font-bold text-xs rounded-none hover:bg-[#e0edf9]"
            onclick={() => presentation.prevSlide()}
          >
            ← {t('slide.prev')}
          </button>
          <button
            type="button"
            class="flex-1 h-7 border border-[#7f9db9] bg-[#f0f0f0] dark:bg-neutral-800 font-bold text-xs rounded-none hover:bg-[#e0edf9]"
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
    class="h-5 px-2 flex items-center justify-between border-t rounded-none shrink-0 text-[11px] {presentation.theme === 'dark'
      ? 'bg-[#181a1f] border-neutral-700 text-neutral-400'
      : 'bg-[#f0f0f0] border-[#b0b0b0] text-neutral-700'}"
  >
    <div class="flex items-center gap-3">
      <span class="flex items-center gap-1">
        <span class="w-2 h-2 rounded-none {presentation.isBeamerActive ? 'bg-emerald-500' : 'bg-neutral-400'}"></span>
        {presentation.isBeamerActive ? t('status.beamerReady') : t('status.beamerDisconnected')}
      </span>
      {#if presentation.activeSong}
        <span class="border-l border-neutral-400 pl-3 font-semibold text-neutral-800 dark:text-neutral-200">
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
