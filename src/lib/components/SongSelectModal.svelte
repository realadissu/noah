<script lang="ts">
  import { presentation } from '$lib/stores/presentation.svelte';
  import { t } from '$lib/i18n';
  import SongBeamerIcon from '$lib/components/icons/SongBeamerIcon.svelte';
  import { openSongSelectInBrowser } from '$lib/services/ccli';

  let browserOpenedMessage = $state<string>('');

  function handleOpenBrowser() {
    openSongSelectInBrowser('https://songselect.ccli.com/');
    browserOpenedMessage = 'Webbrowser wurde mit SongSelect geöffnet.';
    setTimeout(() => {
      browserOpenedMessage = '';
    }, 4000);
  }

  async function handleImportFile() {
    presentation.closeSongSelectModal();
    await presentation.openSongFileDialog();
  }

  async function handleImportClipboard() {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim().length > 0) {
          presentation.closeSongSelectModal();
          presentation.createNewSong(text.trim());
          return;
        }
      }
    } catch (err) {
      console.warn('Failed to read clipboard:', err);
    }
    // Fallback: open blank song editor
    presentation.closeSongSelectModal();
    presentation.createNewSong();
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      presentation.closeSongSelectModal();
    }
  }
</script>

<svelte:window onkeydown={handleKeyDown} />

<!-- Modal Backdrop -->
<div
  id="sb-songselect-modal"
  class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none"
  role="dialog"
  aria-modal="true"
  aria-labelledby="sb-songselect-title"
>
  <!-- Window Container: Fixed 640px Width, High Contrast -->
  <div
    class="flex flex-col w-[640px] max-w-[95vw] bg-[#f0f0f0] dark:bg-[#1e2227] text-neutral-900 dark:text-neutral-100 border-2 border-blue-600 dark:border-neutral-600 shadow-2xl rounded-none overflow-hidden"
    style="width: 640px;"
  >
    <!-- Modal Titlebar (Rich Blue Header) -->
    <div
      class="h-9 flex items-center justify-between px-3 text-white font-bold text-sm shrink-0 select-none"
      style="background-color: #2563eb; color: #ffffff;"
    >
      <div class="flex items-center gap-2">
        <SongBeamerIcon name="ccli" size={16} />
        <span id="sb-songselect-title">{t('ccliModal.title')}</span>
      </div>
      <button
        type="button"
        id="sb-songselect-close-x"
        class="w-6 h-6 flex items-center justify-center hover:bg-red-600 active:bg-red-700 text-white font-mono text-sm leading-none cursor-pointer"
        onclick={() => presentation.closeSongSelectModal()}
        title={t('ccliModal.close')}
        aria-label={t('ccliModal.close')}
      >
        ✕
      </button>
    </div>

    <!-- Modal Body Content -->
    <div class="p-6 space-y-4">
      <!-- CCLI Description & Notice -->
      <div class="flex items-start gap-3 bg-white dark:bg-neutral-800 p-4 border border-neutral-300 dark:border-neutral-700">
        <span class="text-2xl select-none">🌐</span>
        <div class="text-sm space-y-1.5">
          <p class="font-semibold text-neutral-900 dark:text-neutral-100">
            {t('ccliModal.desc')}
          </p>
          <p class="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
            {t('ccliModal.apiNotice')}
          </p>
        </div>
      </div>

      {#if browserOpenedMessage}
        <div class="p-3 bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-400 text-emerald-800 dark:text-emerald-200 text-sm font-semibold flex items-center justify-between">
          <span>✓ {browserOpenedMessage}</span>
          <button type="button" onclick={() => (browserOpenedMessage = '')}>✕</button>
        </div>
      {/if}

      <!-- Action Buttons -->
      <div class="space-y-3 pt-2">
        <!-- Button 1: Open Official CCLI Portal in Browser -->
        <button
          type="button"
          id="sb-btn-open-songselect-web"
          style="background-color: #2563eb; color: #ffffff;"
          class="w-full h-11 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
          onclick={handleOpenBrowser}
        >
          <SongBeamerIcon name="ccli" size={18} />
          <span>{t('ccliModal.openBrowser')} (https://songselect.ccli.com)</span>
        </button>

        <!-- Button 2: Import Downloaded File -->
        <button
          type="button"
          id="sb-btn-import-ccli-file"
          class="w-full h-10 px-4 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 text-neutral-900 dark:text-neutral-100 text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          onclick={handleImportFile}
        >
          <span>📁</span>
          <span>{t('ccliModal.importFile')}</span>
        </button>

        <!-- Button 3: Import from Clipboard -->
        <button
          type="button"
          id="sb-btn-import-ccli-clipboard"
          class="w-full h-10 px-4 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 text-neutral-900 dark:text-neutral-100 text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          onclick={handleImportClipboard}
        >
          <span>📋</span>
          <span>{t('ccliModal.importClipboard')}</span>
        </button>
      </div>
    </div>

    <!-- Modal Footer -->
    <div
      class="p-3 bg-neutral-200 dark:bg-neutral-800 border-t border-neutral-300 dark:border-neutral-700 flex justify-end shrink-0"
    >
      <button
        type="button"
        id="sb-btn-close-songselect-modal"
        class="h-8 px-5 bg-white dark:bg-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-600 border border-neutral-300 dark:border-neutral-600 text-neutral-800 dark:text-neutral-200 text-sm font-semibold cursor-pointer"
        onclick={() => presentation.closeSongSelectModal()}
      >
        {t('ccliModal.close')}
      </button>
    </div>
  </div>
</div>
