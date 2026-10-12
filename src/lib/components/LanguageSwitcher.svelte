<script lang="ts">
  import { i18n, t, type SupportedLocale } from '$lib/i18n';

  function switchLocale(loc: SupportedLocale) {
    i18n.setLocale(loc);
  }
</script>

<div class="inline-flex rounded-lg bg-neutral-800/80 p-0.5 border border-neutral-700/60 shadow-inner">
  <button
    type="button"
    class="px-2.5 py-1 text-xs font-medium rounded-md transition-all duration-150 {i18n.locale === 'en' ? 'bg-amber-500 text-neutral-950 font-semibold shadow-sm' : 'text-neutral-400 hover:text-neutral-200'}"
    onclick={() => switchLocale('en')}
    title={t('language.en')}
  >
    EN
  </button>
  <button
    type="button"
    class="px-2.5 py-1 text-xs font-medium rounded-md transition-all duration-150 {i18n.locale === 'de' ? 'bg-amber-500 text-neutral-950 font-semibold shadow-sm' : 'text-neutral-400 hover:text-neutral-200'}"
    onclick={() => switchLocale('de')}
    title={t('language.de')}
  >
    DE
  </button>
</div>
