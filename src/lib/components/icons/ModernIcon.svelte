<script lang="ts">
  type IconName =
    | 'slide-text'
    | 'slide-clear'
    | 'screen-black'
    | 'screen-close'
    | 'logo'
    | 'freeze'
    | 'projector'
    | 'monitors'
    | 'aspect-ratio'
    | 'chords'
    | 'search'
    | 'settings'
    | 'sun'
    | 'moon'
    | 'play'
    | 'prev'
    | 'next'
    | 'close';

  let { name, size = 18, class: className = '' }: { name: IconName; size?: number; class?: string } = $props();
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="1.8"
  stroke-linecap="round"
  stroke-linejoin="round"
  class="shrink-0 {className}"
  aria-hidden="true"
>
  {#if name === 'slide-text'}
    <!-- Slide with text lines -->
    <rect x="2" y="3" width="20" height="15" rx="3" />
    <line x1="6" y1="8" x2="18" y2="8" />
    <line x1="6" y1="11" x2="18" y2="11" />
    <line x1="6" y1="14" x2="13" y2="14" />
    <path d="M9 21h6" />
  {:else if name === 'slide-clear'}
    <!-- Slide without text (clear / background only) -->
    <rect x="2" y="3" width="20" height="15" rx="3" />
    <path d="M9 21h6" />
    <circle cx="12" cy="10.5" r="2.5" stroke-dasharray="2 2" opacity="0.6" />
  {:else if name === 'screen-black'}
    <!-- Solid black / blank screen -->
    <rect x="2" y="3" width="20" height="15" rx="3" fill="currentColor" fill-opacity="0.9" />
    <path d="M9 21h6" />
  {:else if name === 'screen-close'}
    <!-- Screen with X (close / release presentation screen) -->
    <rect x="2" y="3" width="20" height="15" rx="3" fill="#000000" fill-opacity="0.75" />
    <path d="M9 21h6" />
    <line x1="8" y1="7" x2="16" y2="14" stroke="#ef4444" stroke-width="2.2" />
    <line x1="16" y1="7" x2="8" y2="14" stroke="#ef4444" stroke-width="2.2" />
  {:else if name === 'logo'}
    <!-- Noah emblem -->
    <path d="M12 2L2 7l10 5 10-5-10-5z" />
    <path d="M2 17l10 5 10-5" />
    <path d="M2 12l10 5 10-5" />
  {:else if name === 'freeze'}
    <!-- Snowflake / Freeze -->
    <line x1="12" y1="2" x2="12" y2="22" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="m19 19-3.5-3.5M5 5l3.5 3.5M19 5l-3.5 3.5M5 19l3.5-3.5" />
  {:else if name === 'projector'}
    <!-- Modern projector -->
    <rect x="2" y="7" width="16" height="10" rx="2" />
    <circle cx="14" cy="12" r="2" />
    <path d="M18 10l4-3v10l-4-3" />
  {:else if name === 'monitors'}
    <!-- Dual monitors -->
    <rect x="2" y="4" width="14" height="10" rx="1.5" />
    <path d="M9 14v4M6 18h6" />
    <path d="M18 8h2a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-4" />
  {:else if name === 'aspect-ratio'}
    <!-- Aspect ratio frame -->
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M8 9h2v2M16 15h-2v-2" />
  {:else if name === 'chords'}
    <!-- Musical chord / guitar fret -->
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  {:else if name === 'search'}
    <!-- Search lens -->
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  {:else if name === 'settings'}
    <!-- Settings gear -->
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  {:else if name === 'sun'}
    <!-- Sun -->
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
  {:else if name === 'moon'}
    <!-- Moon -->
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  {:else if name === 'play'}
    <!-- Play -->
    <polygon points="5 3 19 12 5 21 5 3" />
  {:else if name === 'prev'}
    <!-- Previous -->
    <polyline points="15 18 9 12 15 6" />
  {:else if name === 'next'}
    <!-- Next -->
    <polyline points="9 18 15 12 9 6" />
  {:else if name === 'close'}
    <!-- Close -->
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  {/if}
</svg>
