<script lang="ts">
  import { t } from '$lib/i18n';
  import { presentation } from '$lib/stores/presentation.svelte';
  import type { AspectRatio } from '$lib/types/models';

  function getAspectRatioClass(ratio: AspectRatio): string {
    switch (ratio) {
      case '16:10':
        return 'aspect-[16/10]';
      case '4:3':
        return 'aspect-[4/3]';
      case '16:9':
      default:
        return 'aspect-video';
    }
  }

  function handleSlideClick(index: number) {
    presentation.selectSlide(index);
  }
</script>

<div class="flex-1 flex flex-col h-full overflow-hidden select-none {presentation.theme === 'dark' ? 'bg-neutral-950 text-neutral-100' : 'bg-neutral-100 text-neutral-900'}">
  <!-- Main Slide Tiles Grid (SongBeamer 2-Column Exact Layout) -->
  <div class="flex-1 overflow-y-auto p-3 lg:p-4">
    {#if presentation.activeSong && presentation.activeSong.slides.length > 0}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-4 max-w-7xl mx-auto">
        {#each presentation.activeSong.slides as slide, idx}
          {@const isLive = presentation.activeSlideIndex === idx}
          <div
            role="button"
            tabindex="0"
            class="flex flex-col group cursor-pointer"
            onclick={() => handleSlideClick(idx)}
            onkeydown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleSlideClick(idx);
              }
            }}
          >
            <!-- Header Bar: Blue Section Label on Left, Red Slide Number on Right -->
            <div class="flex items-center justify-between px-1.5 py-1 text-xs font-bold">
              <span class="{presentation.theme === 'dark' ? 'text-blue-400 group-hover:text-blue-300' : 'text-blue-700 group-hover:text-blue-800'} transition tracking-wide font-bold">
                {slide.label}
              </span>
              <div class="flex items-center gap-2">
                {#if isLive}
                  <span class="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-emerald-500/20 text-emerald-500 border border-emerald-500/50">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    LIVE
                  </span>
                {/if}
                <span class="text-red-500 font-mono text-xs font-bold">
                  {idx + 1}
                </span>
              </div>
            </div>

            <!-- Slide Box matching aspect ratio -->
            <div
              class="w-full {getAspectRatioClass(presentation.aspectRatio)} rounded-lg border-2 transition-all duration-150 overflow-hidden relative shadow-md flex items-center justify-center p-4 text-center {isLive
                ? 'border-emerald-500 ring-2 ring-emerald-500/50 shadow-emerald-950/40 bg-gradient-to-b from-sky-950/70 via-neutral-900 to-neutral-950 text-white'
                : presentation.uiMode === 'classic' && presentation.theme === 'light'
                  ? 'border-neutral-400 bg-gradient-to-b from-sky-200 via-sky-100 to-sky-200 text-white'
                  : presentation.theme === 'dark'
                    ? 'border-neutral-800 hover:border-neutral-700 bg-gradient-to-b from-neutral-900 via-neutral-950 to-neutral-950 text-neutral-200'
                    : 'border-neutral-300 hover:border-neutral-400 bg-white text-neutral-800'}"
            >
              <!-- Lyrics with accurate baseline alignment (Fixed chord layout) -->
              <div class="w-full max-w-full space-y-1.5 overflow-hidden font-sans">
                {#each slide.lines as line}
                  <div class="text-center">
                    {#if presentation.showChords}
                      <div class="inline-flex flex-wrap items-end justify-center leading-normal">
                        {#each line.tokens as token}
                          {#if token.kind === 'Chord'}
                            <span class="inline-flex flex-col items-center justify-end mr-1">
                              <span class="text-[11px] font-mono font-bold text-amber-400 leading-tight h-4 select-none">{token.chord}</span>
                              <span class="h-0 select-none">&nbsp;</span>
                            </span>
                          {:else}
                            <span class="inline-flex flex-col items-start justify-end">
                              <span class="text-[11px] font-mono font-bold text-amber-400 leading-tight h-4 select-none">
                                {token.kind === 'ChordAndText' ? token.chord : '\u00A0'}
                              </span>
                              <span class="font-bold text-sm md:text-base leading-snug whitespace-pre {presentation.theme === 'dark' || isLive || presentation.uiMode === 'classic' ? 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]' : 'text-neutral-900'}">
                                {token.text}
                              </span>
                            </span>
                          {/if}
                        {/each}
                      </div>
                    {:else}
                      <p class="font-bold text-sm md:text-base leading-snug tracking-wide {presentation.theme === 'dark' || isLive || presentation.uiMode === 'classic' ? 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] drop-shadow-[0_1px_2px_rgba(0,0,0,1)]' : 'text-neutral-900'}">
                        {line.tokens.filter((t) => t.kind !== 'Chord').map((t) => t.text).join('')}
                      </p>
                    {/if}
                  </div>
                {/each}
              </div>
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
