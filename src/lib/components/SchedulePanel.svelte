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
    e.stopPropagation();
    draggedIndex = index;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('application/x-noah-schedule', String(index));
      e.dataTransfer.setData('text/plain', String(index));
    }
  }

  function handleDragOver(e: DragEvent, index: number) {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
    const target = e.currentTarget as HTMLElement | null;
    if (target) {
      const rect = target.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      dropPosition = e.clientY < mid ? 'before' : 'after';
      dragOverIndex = index;
    }
  }

  function handleDragEnter(e: DragEvent, index: number) {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
    dragOverIndex = index;
  }

  function handleDragLeave(e: DragEvent, index: number) {
    e.stopPropagation();
    const related = e.relatedTarget as Node | null;
    const current = e.currentTarget as Node | null;
    if (current && related && current.contains(related)) {
      return;
    }
    if (dragOverIndex === index) {
      dragOverIndex = null;
      dropPosition = null;
    }
  }

  function handleDrop(e: DragEvent, index: number) {
    e.preventDefault();
    e.stopPropagation();
    let from = draggedIndex;
    if (from === null && e.dataTransfer) {
      const stored = e.dataTransfer.getData('application/x-noah-schedule') || e.dataTransfer.getData('text/plain');
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed)) from = parsed;
      }
    }
    if (from !== null && from !== index) {
      presentation.reorderSchedule(from, index, dropPosition ?? 'after');
    }
    draggedIndex = null;
    dragOverIndex = null;
    dropPosition = null;
  }

  function handleDragEnd(e: DragEvent) {
    e.stopPropagation();
    draggedIndex = null;
    dragOverIndex = null;
    dropPosition = null;
  }
</script>

<aside
  class="w-64 md:w-72 lg:w-80 border-r flex flex-col h-full shrink-0 transition-colors {presentation.theme === 'dark'
    ? 'border-neutral-800 bg-neutral-950/90 text-neutral-100'
    : presentation.uiMode === 'classic'
      ? 'border-neutral-300 bg-white text-neutral-900'
      : 'border-slate-200 bg-slate-50/70 text-slate-900'}"
>
  <!-- Header -->
  <div
    class="px-3 py-2 border-b flex items-center justify-between {presentation.theme === 'dark'
      ? 'border-neutral-800/80 bg-neutral-900/40 text-neutral-200'
      : presentation.uiMode === 'classic'
        ? 'border-neutral-300 bg-[#e0dfd8] text-neutral-800'
        : 'border-slate-200 bg-white text-slate-800'}"
  >
    <div class="flex items-center gap-2">
      <span class="text-xs font-bold uppercase tracking-wider">{t('schedule.title')}</span>
      <span
        class="px-1.5 py-0.2 rounded text-[10px] font-bold {presentation.theme === 'dark'
          ? 'bg-neutral-800 text-neutral-400 border border-neutral-700'
          : 'bg-neutral-200 text-neutral-700 border border-neutral-300'}"
      >
        {presentation.schedule.length}
      </span>
    </div>
  </div>

  <!-- Item List -->
  <div
    role="region"
    aria-label="Schedule items"
    class="flex-1 overflow-y-auto {presentation.uiMode === 'classic' ? 'p-0.5 space-y-0.5' : 'p-2 space-y-1.5'}"
    ondragover={(e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'move';
      }
    }}
  >
    {#if presentation.schedule.length === 0}
      <div class="p-6 text-center text-xs text-neutral-500">
        {t('schedule.empty')}
      </div>
    {:else}
      {#each presentation.schedule as item, idx}
        {@const isActive = presentation.activeScheduleIndex === idx}
        {@const isDragging = draggedIndex === idx}
        {@const isDropTarget = dragOverIndex === idx && draggedIndex !== idx}

        <div
          role="button"
          tabindex="0"
          draggable="true"
          class="w-full text-left transition cursor-pointer flex items-center gap-2 group relative select-none {isDragging ? 'opacity-30 border-dashed border-amber-500' : ''} {isDropTarget ? (dropPosition === 'before' ? 'border-t-2 !border-t-amber-400' : 'border-b-2 !border-b-amber-400') : ''} {presentation.uiMode === 'classic'
            ? `px-2 py-1 border-b last:border-b-0 ${
                isActive
                  ? presentation.theme === 'dark'
                    ? 'bg-neutral-800 text-sky-300 font-bold border-neutral-700'
                    : 'bg-[#b8cfe5] text-[#000080] font-bold border-neutral-300'
                  : presentation.theme === 'dark'
                    ? 'hover:bg-neutral-900 text-neutral-200 border-neutral-800/80'
                    : 'hover:bg-neutral-100 text-[#0000cc] border-neutral-200/60'
              }`
            : `px-3 py-2 rounded-xl border ${
                isActive
                  ? presentation.theme === 'dark'
                    ? 'bg-neutral-800/95 border-sky-500/80 shadow ring-1 ring-sky-500/40 text-sky-200'
                    : 'bg-white border-blue-500 shadow-sm ring-1 ring-blue-500/20 text-slate-900 font-bold'
                  : presentation.theme === 'dark'
                    ? 'bg-neutral-900/60 hover:bg-neutral-800/60 border-neutral-800/70 text-neutral-300'
                    : 'bg-white/80 hover:bg-white border-slate-200/90 text-slate-700 hover:text-slate-900 shadow-xs'
              }`}"
          onclick={() => handleSelect(idx)}
          onkeydown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleSelect(idx);
            }
          }}
          ondragstart={(e) => handleDragStart(e, idx)}
          ondragover={(e) => handleDragOver(e, idx)}
          ondragenter={(e) => handleDragEnter(e, idx)}
          ondragleave={(e) => handleDragLeave(e, idx)}
          ondrop={(e) => handleDrop(e, idx)}
          ondragend={handleDragEnd}
        >
          <!-- Drag handle indicator -->
          <span
            class="text-[11px] opacity-40 group-hover:opacity-80 cursor-grab shrink-0 select-none pointer-events-none {presentation.uiMode === 'classic' ? 'text-neutral-500' : 'text-slate-400'}"
            title="Drag to reorder"
          >
            ⠿
          </span>

          <!-- Item Type Icon (Pointer events none so drag doesn't drop target) -->
          <span class="text-sm select-none shrink-0 pointer-events-none">
            {getItemIcon(item)}
          </span>

          <!-- Item Title (Pointer events none so drag doesn't drop target) -->
          <span
            class="truncate flex-1 select-none pointer-events-none {presentation.uiMode === 'classic'
              ? 'text-xs'
              : 'text-sm font-medium'}"
          >
            {item.title}
          </span>
        </div>
      {/each}
    {/if}
  </div>
</aside>
