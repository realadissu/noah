<script lang="ts">
  import { t } from '$lib/i18n';
  import { presentation } from '$lib/stores/presentation.svelte';
  import type { SectionType } from '$lib/types/models';

  function getSectionBadgeClass(section?: SectionType): string {
    if (!section) return 'bg-neutral-800 text-neutral-300 border-neutral-700';
    switch (section.type) {
      case 'Chorus':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold';
      case 'Verse':
        return 'bg-sky-500/20 text-sky-300 border-sky-500/40 font-semibold';
      case 'Bridge':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40 font-semibold';
      case 'PreChorus':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/40 font-semibold';
      case 'Intro':
      case 'Outro':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-semibold';
      default:
        return 'bg-neutral-800 text-neutral-300 border-neutral-700';
    }
  }

  function handleSlideClick(index: number) {
    presentation.selectSlide(index);
  }
</script>

<div class="flex-1 flex flex-col h-full bg-neutral-950 overflow-hidden select-none">
  <!-- Active Item Header & Metadata Bar -->
  <div class="bg-neutral-900/70 border-b border-neutral-800 px-5 py-2.5 flex items-center justify-between">
    <div class="flex items-center gap-4 overflow-hidden truncate">
      {#if presentation.activeSong}
        <h2 class="text-base font-bold text-neutral-100 flex items-center gap-2 truncate">
          <span>{presentation.activeSong.metadata.title}</span>
          {#if presentation.activeSong.metadata.musical_key}
            <span class="px-2 py-0.5 rounded text-xs font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">
              {presentation.activeSong.metadata.musical_key}
            </span>
          {/if}
        </h2>

        {#if presentation.activeSong.metadata.author}
          <span class="text-xs text-neutral-400 hidden sm:inline truncate">
            {presentation.activeSong.metadata.author}
          </span>
        {/if}

        {#if presentation.activeSong.metadata.verse_order.length > 0}
          <span class="text-xs text-neutral-500 hidden md:inline truncate">
            {presentation.activeSong.metadata.verse_order.join(' → ')}
          </span>
        {/if}
      {:else}
        <h2 class="text-sm font-semibold text-neutral-400">{t('song.noSongLoaded')}</h2>
      {/if}
    </div>

    <!-- Navigation & Hint -->
    <div class="flex items-center gap-3 text-xs text-neutral-400 font-mono">
      <span class="hidden lg:inline text-neutral-500 text-[11px]">
        {t('deck.jumpHint')}
      </span>
      <span class="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700 text-[11px]">
        {presentation.activeSlideIndex + 1} / {presentation.activeSong?.slides.length ?? 0}
      </span>
    </div>
  </div>

  <!-- Main Slide Tiles Grid (SongBeamer Style) -->
  <div class="flex-1 overflow-y-auto p-4 md:p-6">
    {#if presentation.activeSong && presentation.activeSong.slides.length > 0}
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {#each presentation.activeSong.slides as slide, idx}
          {@const isLive = presentation.activeSlideIndex === idx}
          <div
            role="button"
            tabindex="0"
            class="relative rounded-xl p-4 text-left border transition-all duration-150 cursor-pointer flex flex-col justify-between min-h-[160px] md:min-h-[180px] shadow-sm hover:shadow-md {isLive
              ? 'bg-neutral-900 border-emerald-500/90 ring-2 ring-emerald-500/40 shadow-emerald-950/40'
              : 'bg-neutral-900/60 hover:bg-neutral-900/90 border-neutral-800 hover:border-neutral-700 text-neutral-200'}"
            onclick={() => handleSlideClick(idx)}
            onkeydown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleSlideClick(idx);
              }
            }}
          >
            <!-- Card Header: Section Badge & Slide Number -->
            <div class="flex items-center justify-between mb-3 border-b border-neutral-800/60 pb-2">
              <div class="flex items-center gap-2">
                <span class="px-2 py-0.5 rounded text-[11px] border {getSectionBadgeClass(slide.section)}">
                  {slide.label}
                </span>
                <span class="text-xs font-mono font-semibold text-neutral-500">
                  #{idx + 1}
                </span>
              </div>

              {#if isLive}
                <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 animate-pulse">
                  <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
                  LIVE
                </span>
              {/if}
            </div>

            <!-- Card Body: Lyrics with optional ChordPro notation -->
            <div class="flex-1 space-y-1 font-sans text-sm md:text-base leading-snug overflow-hidden">
              {#each slide.lines as line}
                <div>
                  {#if presentation.showChords}
                    {#each line.tokens as token}
                      {#if token.kind === 'ChordAndText'}
                        <span class="inline-flex flex-col align-top mr-1">
                          <span class="text-[11px] font-mono font-bold text-amber-400 leading-none">{token.chord}</span>
                          <span class="{isLive ? 'text-white font-medium' : 'text-neutral-200'}">{token.text}</span>
                        </span>
                      {:else if token.kind === 'Chord'}
                        <span class="inline-block text-[11px] font-mono font-bold text-amber-400 mr-1 leading-none">{token.chord}</span>
                      {:else if token.kind === 'Text'}
                        <span class="{isLive ? 'text-white font-medium' : 'text-neutral-200'} mr-1">{token.text}</span>
                      {/if}
                    {/each}
                  {:else}
                    <p class="{isLive ? 'text-white font-medium' : 'text-neutral-200'}">
                      {line.tokens.filter(t => t.kind !== 'Chord').map(t => t.text).join('')}
                    </p>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <div class="h-full flex flex-col items-center justify-center text-center p-8 text-neutral-500">
        <p class="font-semibold text-neutral-300 mb-1">{t('song.noSongLoaded')}</p>
        <p class="text-xs">{t('song.loadHint')}</p>
      </div>
    {/if}
  </div>
</div>
