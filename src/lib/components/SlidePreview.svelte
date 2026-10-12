<script lang="ts">
  import type { Slide } from '$lib/types/models';

  interface Props {
    slide: Slide;
    isActive: boolean;
    showChords: boolean;
    onSelect: () => void;
  }

  const { slide, isActive, showChords, onSelect }: Props = $props();
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  onclick={onSelect}
  class="group relative rounded-lg p-3 cursor-pointer transition-all border {isActive ? 'bg-amber-500/10 border-amber-500 shadow-md ring-1 ring-amber-500/40' : 'bg-neutral-900 hover:bg-neutral-850 border-neutral-800 hover:border-neutral-700'}"
>
  <!-- Card Header -->
  <div class="flex items-center justify-between mb-2">
    <div class="flex items-center gap-2">
      <span class="px-2 py-0.5 rounded text-[11px] font-bold {isActive ? 'bg-amber-500 text-neutral-950' : 'bg-neutral-800 text-neutral-300'}">
        {slide.index + 1}
      </span>
      <span class="text-xs font-semibold {isActive ? 'text-amber-400' : 'text-neutral-200'}">
        {slide.label}
      </span>
    </div>

    {#if isActive}
      <span class="flex h-2 w-2 relative">
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
        <span class="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
      </span>
    {/if}
  </div>

  <!-- Slide Content Lines -->
  <div class="space-y-1.5 font-sans">
    {#each slide.lines as line}
      <div class="text-xs leading-relaxed text-neutral-200">
        {#each line.tokens as token}
          {#if token.kind === 'ChordAndText'}
            <span class="inline-flex flex-col align-top mr-1">
              {#if showChords}
                <span class="text-[10px] font-mono font-bold text-amber-400 leading-none">{token.chord}</span>
              {/if}
              <span class="text-neutral-100">{token.text}</span>
            </span>
          {:else if token.kind === 'Chord'}
            {#if showChords}
              <span class="inline-block text-[10px] font-mono font-bold text-amber-400 mr-1">{token.chord}</span>
            {/if}
          {:else if token.kind === 'Text'}
            <span class="text-neutral-100 mr-1">{token.text}</span>
          {/if}
        {/each}
      </div>
    {/each}
  </div>
</div>
