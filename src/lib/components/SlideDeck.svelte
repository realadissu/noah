<script lang="ts">
  import { t } from '$lib/i18n';
  import { presentation } from '$lib/stores/presentation.svelte';
  import type { AspectRatio } from '$lib/types/models';
  import { calculateSlideFontSize } from '$lib/utils/slideTypography';

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

            <!-- Slide Box matching aspect ratio with Container Query context -->
            <div
              style="container-type: size;"
              class="w-full {getAspectRatioClass(presentation.aspectRatio)} rounded-xl border-2 transition-all duration-150 overflow-hidden relative shadow-md flex items-center justify-center text-center {isLive
                ? 'border-emerald-500 ring-4 ring-emerald-500/25 shadow-lg shadow-emerald-500/15 bg-gradient-to-b from-sky-950 via-neutral-950 to-black text-white'
                : presentation.uiMode === 'classic' && presentation.theme === 'light'
                  ? 'border-neutral-400 bg-gradient-to-b from-[#608ebf] via-[#4a7aa8] to-[#3a6691] text-white'
                  : presentation.theme === 'dark'
                    ? 'border-neutral-800 hover:border-neutral-700 bg-gradient-to-b from-neutral-900 via-neutral-950 to-neutral-950 text-neutral-200'
                    : 'border-slate-300 hover:border-slate-400 bg-slate-950 text-white shadow-sm'}"
            >
              <!-- Lyrics with accurate baseline alignment and linear responsive typography -->
              <div
                class="w-full h-full flex flex-col items-center justify-center overflow-hidden font-sans select-none"
                style="padding: 5cqh 6cqw; font-size: {calculateSlideFontSize(slide, presentation.showChords, presentation.aspectRatio)}; line-height: 1.35;"
              >
                <div class="w-full flex flex-col items-center justify-center" style="gap: 0.2em;">
                  {#each slide.lines as line}
                    <div class="text-center w-full">
                      {#if presentation.showChords}
                        <div class="inline-flex flex-wrap items-end justify-center leading-normal">
                          {#each line.tokens as token}
                            {#if token.kind === 'Chord'}
                              <span class="inline-flex flex-col items-center justify-end mr-[0.3em]">
                                <span style="font-size: 0.72em;" class="font-mono font-bold text-amber-400 leading-none select-none">{token.chord}</span>
                                <span class="h-0 select-none">&nbsp;</span>
                              </span>
                            {:else}
                              <span class="inline-flex flex-col items-start justify-end">
                                <span style="font-size: 0.72em;" class="font-mono font-bold text-amber-400 leading-none select-none">
                                  {token.kind === 'ChordAndText' ? token.chord : '\u00A0'}
                                </span>
                                <span class="font-bold whitespace-pre text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
                                  {token.text}
                                </span>
                              </span>
                            {/if}
                          {/each}
                        </div>
                      {:else}
                        <p class="font-bold tracking-wide text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] drop-shadow-[0_1px_2px_rgba(0,0,0,1)] whitespace-nowrap overflow-visible">
                          {line.tokens.filter((t) => t.kind !== 'Chord').map((t) => t.text).join('')}
                        </p>
                      {/if}
                    </div>
                  {/each}
                </div>
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
