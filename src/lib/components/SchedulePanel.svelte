<script lang="ts">
  import { t } from '$lib/i18n';
  import { presentation } from '$lib/stores/presentation.svelte';
  import type { ScheduleItem } from '$lib/types/models';

  let draggingIndex = $state<number | null>(null);
  let targetIndex = $state<number | null>(null);
  let targetPosition = $state<'before' | 'after'>('after');
  let isPointerDown = false;
  let startY = 0;
  let hasMoved = false;

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
    if (!hasMoved) {
      presentation.selectScheduleItem(index);
    }
  }

  let startIndex = $state<number | null>(null);

  function handlePointerDown(e: PointerEvent, index: number) {
    if (e.button !== 0) return;
    isPointerDown = true;
    hasMoved = false;
    startY = e.clientY;
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

  function handlePointerMove(e: PointerEvent, _index: number) {
    if (!isPointerDown) return;

    if (!hasMoved && Math.abs(e.clientY - startY) > 5) {
      hasMoved = true;
      draggingIndex = startIndex;
    }

    if (draggingIndex !== null) {
      const items = Array.from(document.querySelectorAll<HTMLElement>('[data-schedule-idx]'));
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
            const idx = parseInt(itemEl.getAttribute('data-schedule-idx') ?? '0', 10);
            targetIndex = idx;
            targetPosition = e.clientY < (rect.top + rect.height / 2) ? 'before' : 'after';
            break;
          }
        }
      }
    }
  }

  function handlePointerUp(_e: PointerEvent) {
    if (!isPointerDown) return;
    isPointerDown = false;

    if (hasMoved && draggingIndex !== null && targetIndex !== null && draggingIndex !== targetIndex) {
      presentation.reorderSchedule(draggingIndex, targetIndex, targetPosition);
    }

    draggingIndex = null;
    targetIndex = null;
    startIndex = null;
    setTimeout(() => {
      hasMoved = false;
    }, 50);
  }

  function handlePointerCancel() {
    isPointerDown = false;
    draggingIndex = null;
    targetIndex = null;
    startIndex = null;
    hasMoved = false;
  }
</script>

<aside
  class="w-64 md:w-72 lg:w-80 border-r flex flex-col h-full shrink-0 transition-colors select-none {presentation.theme === 'dark'
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
  >
    {#if presentation.schedule.length === 0}
      <div class="p-6 text-center text-xs text-neutral-500">
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
          data-schedule-idx={idx}
          class="w-full text-left transition flex items-center gap-2 group relative select-none touch-none {isDragging ? 'opacity-40 border-dashed border-amber-500 scale-[0.98]' : ''} {isDropTarget ? (targetPosition === 'before' ? 'border-t-2 !border-t-amber-400' : 'border-b-2 !border-b-amber-400') : ''} {draggingIndex !== null ? 'cursor-grabbing' : 'cursor-grab'} {presentation.uiMode === 'classic'
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
          onpointerdown={(e) => handlePointerDown(e, idx)}
          onpointermove={(e) => handlePointerMove(e, idx)}
          onpointerup={handlePointerUp}
          onpointercancel={handlePointerCancel}
          onclick={() => handleSelect(idx)}
          onkeydown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleSelect(idx);
            }
          }}
        >
          <!-- Drag handle indicator -->
          <span
            class="text-[11px] opacity-40 group-hover:opacity-80 shrink-0 select-none pointer-events-none {presentation.uiMode === 'classic' ? 'text-neutral-500' : 'text-slate-400'}"
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
