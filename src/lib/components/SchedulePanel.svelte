<script lang="ts">
  import { t } from '$lib/i18n';
  import { presentation } from '$lib/stores/presentation.svelte';
  import type { ScheduleItem } from '$lib/types/models';

  let draggedIndex = $state<number | null>(null);
  let dragOverIndex = $state<number | null>(null);
  let dropPosition = $state<'before' | 'after' | null>(null);

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

  function handleSelect(index: number) {
    presentation.selectScheduleItem(index);
  }

  function handleDragStart(e: DragEvent, index: number) {
    draggedIndex = index;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(index));
    }
  }

  function handleDragOver(e: DragEvent, index: number) {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
    const target = e.currentTarget as HTMLElement | null;
    if (target) {
      const rect = target.getBoundingClientRect();
      const isTop = e.clientY - rect.top < rect.height / 2;
      dropPosition = isTop ? 'before' : 'after';
      dragOverIndex = index;
    }
  }

  function handleDragLeave(_e: DragEvent, index: number) {
    if (dragOverIndex === index) {
      dragOverIndex = null;
      dropPosition = null;
    }
  }

  function handleDrop(e: DragEvent, index: number) {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      let targetIndex = index;
      if (dropPosition === 'after' && draggedIndex > index) {
        targetIndex = index + 1;
      } else if (dropPosition === 'before' && draggedIndex < index) {
        targetIndex = Math.max(0, index - 1);
      }
      presentation.moveScheduleItem(draggedIndex, targetIndex);
    }
    draggedIndex = null;
    dragOverIndex = null;
    dropPosition = null;
  }

  function handleDragEnd() {
    draggedIndex = null;
    dragOverIndex = null;
    dropPosition = null;
  }
</script>

<aside class="w-64 md:w-72 lg:w-80 border-r flex flex-col h-full select-none shrink-0 transition-colors {presentation.theme === 'dark' ? 'border-neutral-800 bg-neutral-950/90 text-neutral-100' : 'border-neutral-300 bg-neutral-50 text-neutral-900'}">
  <!-- Header -->
  <div class="px-3 py-2.5 border-b flex items-center justify-between {presentation.theme === 'dark' ? 'border-neutral-800/80 bg-neutral-900/40' : 'border-neutral-200 bg-neutral-100'}">
    <div class="flex items-center gap-2">
      <span class="text-sm font-bold">📋 {t('schedule.title')}</span>
      <span class="px-1.5 py-0.5 rounded text-[10px] font-semibold {presentation.theme === 'dark' ? 'bg-neutral-800 text-neutral-400 border border-neutral-700' : 'bg-neutral-200 text-neutral-700 border border-neutral-300'}">
        {presentation.schedule.length}
      </span>
    </div>
  </div>

  <!-- Item List (Clean live-focused SongBeamer list) -->
  <div class="flex-1 overflow-y-auto p-2 space-y-1">
    {#if presentation.schedule.length === 0}
      <div class="p-6 text-center text-xs text-neutral-500">
        {t('schedule.empty')}
      </div>
    {:else}
      {#each presentation.schedule as item, idx}
        {@const isActive = presentation.activeScheduleIndex === idx}
        {@const isDragging = draggedIndex === idx}

        <!-- Drop target line (Before) -->
        {#if dragOverIndex === idx && dropPosition === 'before' && draggedIndex !== idx}
          <div class="h-1 bg-amber-400 rounded-full shadow-md shadow-amber-500/50 my-1 animate-pulse"></div>
        {/if}

        <div
          role="button"
          tabindex="0"
          draggable="true"
          class="w-full text-left px-3 py-2 rounded border transition cursor-pointer flex items-center gap-2.5 group {isDragging ? 'opacity-40 border-dashed border-amber-500' : ''} {isActive
            ? presentation.theme === 'dark'
              ? 'bg-neutral-800/95 border-sky-500/80 shadow ring-1 ring-sky-500/40'
              : 'bg-sky-50 border-sky-400 shadow ring-1 ring-sky-300'
            : presentation.theme === 'dark'
              ? 'bg-neutral-900/60 hover:bg-neutral-800/60 border-neutral-800/70'
              : 'bg-white hover:bg-neutral-100 border-neutral-200'}"
          onclick={() => handleSelect(idx)}
          onkeydown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleSelect(idx);
            }
          }}
          ondragstart={(e) => handleDragStart(e, idx)}
          ondragover={(e) => handleDragOver(e, idx)}
          ondragleave={(e) => handleDragLeave(e, idx)}
          ondrop={(e) => handleDrop(e, idx)}
          ondragend={handleDragEnd}
        >
          <!-- Icon only + Title only (Requirements 4.1, 4.2, 4.3) -->
          <span class="text-base select-none shrink-0">{getItemIcon(item)}</span>
          <span class="text-xs md:text-sm font-semibold truncate flex-1 {isActive
            ? presentation.theme === 'dark' ? 'text-sky-300 font-bold' : 'text-blue-800 font-bold'
            : presentation.theme === 'dark'
              ? 'text-neutral-200 group-hover:text-sky-300'
              : presentation.uiMode === 'classic'
                ? 'text-[#0000cc] group-hover:underline'
                : 'text-neutral-800 group-hover:text-blue-600'}">
            {item.title}
          </span>
        </div>

        <!-- Drop target line (After) -->
        {#if dragOverIndex === idx && dropPosition === 'after' && draggedIndex !== idx}
          <div class="h-1 bg-amber-400 rounded-full shadow-md shadow-amber-500/50 my-1 animate-pulse"></div>
        {/if}
      {/each}
    {/if}
  </div>
</aside>
