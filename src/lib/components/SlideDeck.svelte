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

<div class="flex-1 flex flex-col h-full bg-neutral-950 overflow-hidden select-none">
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
            <!-- SongBeamer Header Bar: Blue Section Label on Left, Red Slide Number on Right -->
            <div class="flex items-center justify-between px-1.5 py-1 text-xs font-bold">
              <span class="text-blue-400 group-hover:text-blue-300 transition tracking-wide">
                {slide.label}
              </span>
              <div class="flex items-center gap-2">
                {#if isLive}
                  <span class="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/50">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    LIVE
                  </span>
                {/if}
                <span class="text-red-500 font-mono text-xs">
                  {idx + 1}
                </span>
              </div>
            </div>

            <!-- Slide Box matching connected/chosen aspect ratio (16:9, 16:10, 4:3) -->
            <div
              class="w-full {getAspectRatioClass(presentation.aspectRatio)} rounded-lg border-2 transition-all duration-150 overflow-hidden relative shadow-md flex items-center justify-center p-4 text-center {isLive
                ? 'border-emerald-400 ring-2 ring-emerald-500/50 shadow-emerald-950/60 bg-gradient-to-b from-sky-950/60 via-neutral-900 to-neutral-950'
                : 'border-neutral-700/80 hover:border-neutral-500 bg-gradient-to-b from-neutral-900 via-neutral-950 to-neutral-950 text-neutral-200'}"
            >
              <!-- Lyrics with bold white high-contrast text & black shadow (SongBeamer style) -->
              <div class="w-full max-w-full space-y-1.5 overflow-hidden font-sans">
                {#each slide.lines as line}
                  <div class="text-center">
                    {#if presentation.showChords}
                      <div class="inline-block text-xs md:text-sm font-semibold leading-relaxed">
                        {#each line.tokens as token}
                          {#if token.kind === 'ChordAndText'}
                            <span class="inline-flex flex-col align-top mx-1">
                              <span class="text-[10px] font-mono font-bold text-amber-400 leading-none">{token.chord}</span>
                              <span class="text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] drop-shadow-[0_1px_2px_rgba(0,0,0,1)]">{token.text}</span>
                            </span>
                          {:else if token.kind === 'Chord'}
                            <span class="inline-block text-[10px] font-mono font-bold text-amber-400 mx-1 leading-none">{token.chord}</span>
                          {:else if token.kind === 'Text'}
                            <span class="text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] drop-shadow-[0_1px_2px_rgba(0,0,0,1)] mx-0.5">{token.text}</span>
                          {/if}
                        {/each}
                      </div>
                    {:else}
                      <p class="font-bold text-sm md:text-base leading-snug text-white tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] drop-shadow-[0_1px_2px_rgba(0,0,0,1)]">
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
