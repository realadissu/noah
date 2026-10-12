<script lang="ts">
  import { t } from '$lib/i18n';
  import { presentation } from '$lib/stores/presentation.svelte';
  import type { ScheduleItem } from '$lib/types/models';

  function getItemIcon(item: ScheduleItem): string {
    switch (item.item_type.kind) {
      case 'Song':
        return '🎵';
      case 'Scripture':
        return '📖';
      case 'Media':
        return item.item_type.payload.media_type === 'Video' ? '🎬' : '🖼️';
      case 'Note':
        return '📝';
      default:
        return '📄';
    }
  }

  function getItemSubtext(item: ScheduleItem): string {
    switch (item.item_type.kind) {
      case 'Song': {
        const song = item.item_type.payload;
        const key = song.metadata.musical_key ? `[${song.metadata.musical_key}] ` : '';
        const author = song.metadata.author ? `${song.metadata.author} • ` : '';
        return `${key}${author}${t('schedule.slidesCount', { count: song.slides.length })}`;
      }
      case 'Scripture':
        return `${item.item_type.payload.translation}`;
      case 'Note':
        return item.item_type.payload.text;
      case 'Media':
        return item.item_type.payload.media_type;
      default:
        return '';
    }
  }

  function handleSelect(index: number) {
    presentation.selectScheduleItem(index);
  }

  function handleMoveUp(e: MouseEvent, index: number) {
    e.stopPropagation();
    if (index > 0) {
      presentation.moveScheduleItem(index, index - 1);
    }
  }

  function handleMoveDown(e: MouseEvent, index: number) {
    e.stopPropagation();
    if (index < presentation.schedule.length - 1) {
      presentation.moveScheduleItem(index, index + 1);
    }
  }

  function handleRemove(e: MouseEvent, index: number) {
    e.stopPropagation();
    presentation.removeScheduleItem(index);
  }
</script>

<aside class="w-72 md:w-80 border-r border-neutral-800 bg-neutral-950/90 flex flex-col h-full select-none">
  <!-- Header -->
  <div class="p-3 border-b border-neutral-800/80 flex items-center justify-between bg-neutral-900/40">
    <div class="flex items-center gap-2">
      <span class="text-sm font-bold text-neutral-200">📋 {t('schedule.title')}</span>
      <span class="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-neutral-800 text-neutral-400 border border-neutral-700">
        {presentation.schedule.length}
      </span>
    </div>
  </div>

  <!-- Item List -->
  <div class="flex-1 overflow-y-auto p-2 space-y-1.5">
    {#if presentation.schedule.length === 0}
      <div class="p-6 text-center text-xs text-neutral-500">
        {t('schedule.empty')}
      </div>
    {:else}
      {#each presentation.schedule as item, idx}
        {@const isActive = presentation.activeScheduleIndex === idx}
        <div
          role="button"
          tabindex="0"
          class="w-full text-left p-2.5 rounded-lg border transition cursor-pointer flex items-center justify-between group {isActive ? 'bg-neutral-800/90 border-amber-500/70 shadow-md ring-1 ring-amber-500/30' : 'bg-neutral-900/50 hover:bg-neutral-800/60 border-neutral-800/80 text-neutral-300'}"
          onclick={() => handleSelect(idx)}
          onkeydown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleSelect(idx);
            }
          }}
        >
          <div class="flex items-start gap-2.5 overflow-hidden flex-1 mr-2">
            <span class="text-base select-none mt-0.5">{getItemIcon(item)}</span>
            <div class="overflow-hidden flex-1">
              <div class="flex items-center gap-1.5">
                <span class="text-xs font-semibold truncate {isActive ? 'text-amber-300' : 'text-neutral-200'}">
                  {item.title}
                </span>
              </div>
              <p class="text-[11px] text-neutral-400 truncate mt-0.5 font-mono">
                {getItemSubtext(item)}
              </p>
            </div>
          </div>

          <!-- Quick Move & Delete Actions (Visible on hover/active) -->
          <div class="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition">
            <button
              type="button"
              class="w-5 h-5 rounded flex items-center justify-center text-[10px] bg-neutral-800 hover:bg-neutral-700 text-neutral-300 disabled:opacity-30"
              disabled={idx === 0}
              onclick={(e) => handleMoveUp(e, idx)}
              title={t('schedule.moveUp')}
            >
              ▲
            </button>
            <button
              type="button"
              class="w-5 h-5 rounded flex items-center justify-center text-[10px] bg-neutral-800 hover:bg-neutral-700 text-neutral-300 disabled:opacity-30"
              disabled={idx === presentation.schedule.length - 1}
              onclick={(e) => handleMoveDown(e, idx)}
              title={t('schedule.moveDown')}
            >
              ▼
            </button>
            <button
              type="button"
              class="w-5 h-5 rounded flex items-center justify-center text-[10px] bg-neutral-800 hover:bg-red-900/60 hover:text-red-300 text-neutral-400"
              onclick={(e) => handleRemove(e, idx)}
              title={t('schedule.remove')}
            >
              ✕
            </button>
          </div>
        </div>
      {/each}
    {/if}
  </div>
</aside>
