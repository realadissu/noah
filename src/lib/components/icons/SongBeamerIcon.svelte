<script lang="ts">
  import { presentation } from '$lib/stores/presentation.svelte';

  export type SongBeamerIconName =
    | 'schedule-new'
    | 'schedule-open'
    | 'schedule-save'
    | 'song-new'
    | 'song-edit'
    | 'song-open'
    | 'song-search'
    | 'media-image'
    | 'media-bible'
    | 'media-video'
    | 'media-audio-cd'
    | 'media-mp3'
    | 'media-ppt'
    | 'media-camera'
    | 'bg-image'
    | 'slide-text'
    | 'slide-clear'
    | 'screen-black'
    | 'screen-close'
    | 'alert'
    | 'chords'
    | 'play'
    | 'ccli'
    | 'history'
    | 'prev'
    | 'next'
    | 'new'
    | 'open'
    | 'save'
    | 'print'
    | 'edit'
    | 'search'
    | 'bible'
    | 'video'
    | 'audio'
    | 'song'
    | 'camera'
    | 'beamer';

  let {
    name,
    size = 16,
    class: className = '',
  }: {
    name: SongBeamerIconName;
    size?: number;
    class?: string;
  } = $props();

  const isDark = $derived(presentation.theme === 'dark');
</script>

<span
  class="inline-flex items-center justify-center shrink-0 select-none {className}"
  style="width: {size}px; height: {size}px;"
  aria-hidden="true"
>
  {#if name === 'schedule-new'}
    <!-- Schedule New: White sheet with blue bullet list & empty corner -->
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="2" y="1" width="10" height="13" rx="0.5" fill="#ffffff" stroke={isDark ? '#60a5fa' : '#336699'} stroke-width="0.8" />
      <line x1="4" y1="4" x2="5.5" y2="4" stroke="#0055aa" stroke-width="1.2" />
      <line x1="7" y1="4" x2="10" y2="4" stroke="#555555" stroke-width="0.8" />
      <line x1="4" y1="7" x2="5.5" y2="7" stroke="#0055aa" stroke-width="1.2" />
      <line x1="7" y1="7" x2="10" y2="7" stroke="#555555" stroke-width="0.8" />
      <line x1="4" y1="10" x2="5.5" y2="10" stroke="#0055aa" stroke-width="1.2" />
      <line x1="7" y1="10" x2="10" y2="10" stroke="#555555" stroke-width="0.8" />
      <!-- Blank doc badge bottom-right -->
      <rect x="8" y="8" width="6" height="7" rx="0.5" fill="#f8fafc" stroke="#475569" stroke-width="0.8" />
    </svg>
  {:else if name === 'schedule-open'}
    <!-- Schedule Open: White sheet with bullet list + small yellow folder -->
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="2" y="1" width="10" height="13" rx="0.5" fill="#ffffff" stroke={isDark ? '#60a5fa' : '#336699'} stroke-width="0.8" />
      <line x1="4" y1="4" x2="5.5" y2="4" stroke="#0055aa" stroke-width="1.2" />
      <line x1="7" y1="4" x2="10" y2="4" stroke="#555555" stroke-width="0.8" />
      <line x1="4" y1="7" x2="5.5" y2="7" stroke="#0055aa" stroke-width="1.2" />
      <line x1="7" y1="7" x2="10" y2="7" stroke="#555555" stroke-width="0.8" />
      <!-- Small yellow folder bottom-right -->
      <path d="M7 8h3l1 1h4v5H7V8z" fill="#f59e0b" stroke="#d97706" stroke-width="0.6" />
    </svg>
  {:else if name === 'schedule-save'}
    <!-- Schedule Save: White sheet with bullet list + small blue floppy -->
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="2" y="1" width="10" height="13" rx="0.5" fill="#ffffff" stroke={isDark ? '#60a5fa' : '#336699'} stroke-width="0.8" />
      <line x1="4" y1="4" x2="5.5" y2="4" stroke="#0055aa" stroke-width="1.2" />
      <line x1="7" y1="4" x2="10" y2="4" stroke="#555555" stroke-width="0.8" />
      <line x1="4" y1="7" x2="5.5" y2="7" stroke="#0055aa" stroke-width="1.2" />
      <line x1="7" y1="7" x2="10" y2="7" stroke="#555555" stroke-width="0.8" />
      <!-- Small blue floppy disk bottom-right -->
      <rect x="8" y="8" width="7" height="7" rx="0.5" fill="#1e40af" stroke="#1d4ed8" stroke-width="0.6" />
      <rect x="9.5" y="8" width="4" height="2.5" fill="#ffffff" />
      <rect x="9.5" y="11.5" width="4" height="3" fill="#cbd5e1" />
    </svg>
  {:else if name === 'song-new' || name === 'new'}
    <!-- Song New: White sheet with blue text lines -->
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M2.5 1.5h7.5l3.5 3.5v9.5h-11v-13z" fill="#ffffff" stroke={isDark ? '#94a3b8' : '#64748b'} stroke-width="0.8" />
      <path d="M10 1.5v3.5h3.5" fill="#e2e8f0" stroke="#64748b" stroke-width="0.6" />
      <line x1="4.5" y1="6" x2="11.5" y2="6" stroke="#2563eb" stroke-width="0.9" />
      <line x1="4.5" y1="8" x2="11.5" y2="8" stroke="#2563eb" stroke-width="0.9" />
      <line x1="4.5" y1="10" x2="11.5" y2="10" stroke="#2563eb" stroke-width="0.9" />
      <line x1="4.5" y1="12" x2="9" y2="12" stroke="#2563eb" stroke-width="0.9" />
    </svg>
  {:else if name === 'song-edit' || name === 'edit'}
    <!-- Song Edit: Sheet with lines and yellow pencil -->
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="2" y="1" width="10" height="13.5" rx="0.5" fill="#ffffff" stroke={isDark ? '#94a3b8' : '#64748b'} stroke-width="0.8" />
      <line x1="4" y1="3.5" x2="9.5" y2="3.5" stroke="#2563eb" stroke-width="0.8" />
      <line x1="4" y1="6" x2="9.5" y2="6" stroke="#2563eb" stroke-width="0.8" />
      <line x1="4" y1="8.5" x2="9.5" y2="8.5" stroke="#2563eb" stroke-width="0.8" />
      <!-- Diagonal pencil -->
      <polygon points="8,14.5 9,11 13.5,6.5 15,8 10.5,12.5" fill="#eab308" stroke="#ca8a04" stroke-width="0.6" />
      <polygon points="8,14.5 9,13 7.5,13" fill="#1e293b" />
    </svg>
  {:else if name === 'song-open' || name === 'open'}
    <!-- Song Open: Folder with green plus / import arrow -->
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M1.5 3a1 1 0 0 1 1-1h3.5l1.5 1.5h6.5a1 1 0 0 1 1 1v2.5H2.5A1 1 0 0 0 1.5 8V3z" fill="#d97706" />
      <path d="M1.5 6.5h13l-1.8 7H2.5L1.5 6.5z" fill="#f59e0b" stroke="#b45309" stroke-width="0.7" />
      <!-- Green plus badge -->
      <circle cx="12" cy="11.5" r="3" fill="#16a34a" />
      <line x1="12" y1="10" x2="12" y2="13" stroke="#ffffff" stroke-width="0.9" stroke-linecap="round" />
      <line x1="10.5" y1="11.5" x2="13.5" y2="11.5" stroke="#ffffff" stroke-width="0.9" stroke-linecap="round" />
    </svg>
  {:else if name === 'song-search' || name === 'search'}
    <!-- Song Search: Magnifying glass -->
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="6.5" cy="6.5" r="4.5" fill={isDark ? '#0369a1' : '#f0f9ff'} stroke={isDark ? '#38bdf8' : '#0284c7'} stroke-width="1.3" />
      <line x1="10" y1="10" x2="14.5" y2="14.5" stroke="#78350f" stroke-width="2" stroke-linecap="round" />
      <line x1="10" y1="10" x2="14.5" y2="14.5" stroke="#f59e0b" stroke-width="1.2" stroke-linecap="round" />
    </svg>
  {:else if name === 'media-image'}
    <!-- Insert Image: Framed landscape with green hill and orange sun -->
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="1.5" y="2" width="13" height="12" rx="0.5" fill="#38bdf8" stroke={isDark ? '#94a3b8' : '#475569'} stroke-width="0.8" />
      <circle cx="10.5" cy="5.5" r="1.8" fill="#f59e0b" />
      <path d="M2 13.5l3.5-4 4 3.5 4.5-5.5v6.5H2z" fill="#15803d" />
      <path d="M2 13.5l4-3 3.5 2.5 4.5-4v4.5H2z" fill="#22c55e" />
    </svg>
  {:else if name === 'media-bible' || name === 'bible'}
    <!-- Insert Scripture / Bible: Brown book with golden cross -->
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="2.5" y="1.5" width="11" height="13" rx="1" fill="#713f12" stroke={isDark ? '#d97706' : '#451a03'} stroke-width="0.8" />
      <path d="M7.5 4.5v7M5.5 6.5h4" stroke="#facc15" stroke-width="1.5" stroke-linecap="square" />
      <line x1="2.5" y1="13" x2="13.5" y2="13" stroke="#f59e0b" stroke-width="0.8" />
    </svg>
  {:else if name === 'media-video' || name === 'video'}
    <!-- Insert Video: Filmstrip reel with blue tint -->
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="2.5" y="2" width="11" height="12" rx="1" fill="#60a5fa" stroke={isDark ? '#93c5fd' : '#1d4ed8'} stroke-width="0.8" />
      <rect x="3.5" y="3.5" width="1.5" height="1.5" fill="#ffffff" />
      <rect x="3.5" y="7" width="1.5" height="1.5" fill="#ffffff" />
      <rect x="3.5" y="10.5" width="1.5" height="1.5" fill="#ffffff" />
      <rect x="11" y="3.5" width="1.5" height="1.5" fill="#ffffff" />
      <rect x="11" y="7" width="1.5" height="1.5" fill="#ffffff" />
      <rect x="11" y="10.5" width="1.5" height="1.5" fill="#ffffff" />
      <rect x="6" y="4" width="4" height="8" rx="0.5" fill={isDark ? '#1e40af' : '#1e3a8a'} />
    </svg>
  {:else if name === 'media-audio-cd' || name === 'audio'}
    <!-- Insert Audio CD: Silvery compact disc -->
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6.5" fill="#e2e8f0" stroke={isDark ? '#cbd5e1' : '#64748b'} stroke-width="0.8" />
      <circle cx="8" cy="8" r="4.2" fill="#f8fafc" stroke="#cbd5e1" stroke-width="0.6" />
      <circle cx="8" cy="8" r="2" fill="#ffffff" stroke="#94a3b8" stroke-width="0.7" />
      <circle cx="8" cy="8" r="0.8" fill="#334155" />
    </svg>
  {:else if name === 'media-mp3' || name === 'song'}
    <!-- Insert Audio File / MP3: Green music notes -->
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M5.5 10.5V3.5l6-1.5v8.5" stroke={isDark ? '#4ade80' : '#15803d'} stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" />
      <line x1="5.5" y1="5.5" x2="11.5" y2="4" stroke={isDark ? '#4ade80' : '#15803d'} stroke-width="1.1" />
      <ellipse cx="4.5" cy="11.5" rx="2" ry="1.6" fill={isDark ? '#4ade80' : '#22c55e'} stroke={isDark ? '#15803d' : '#15803d'} stroke-width="0.8" />
      <ellipse cx="10.5" cy="10" rx="2" ry="1.6" fill={isDark ? '#4ade80' : '#22c55e'} stroke={isDark ? '#15803d' : '#15803d'} stroke-width="0.8" />
    </svg>
  {:else if name === 'media-ppt'}
    <!-- Insert PowerPoint: Orange presentation with "P" -->
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="2" y="2" width="12" height="12" rx="1" fill="#ea580c" stroke={isDark ? '#fdba74' : '#c2410c'} stroke-width="0.8" />
      <rect x="3.5" y="3.5" width="9" height="7" rx="0.5" fill="#ffffff" />
      <circle cx="6" cy="6" r="1.5" fill="#ea580c" />
      <path d="M8.5 5h3M8.5 7h2M8.5 9h3" stroke="#ea580c" stroke-width="0.8" />
    </svg>
  {:else if name === 'media-camera' || name === 'camera' || name === 'beamer'}
    <!-- Insert Camera / Live Video: Video camera -->
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="1.5" y="4.5" width="9" height="7" rx="1" fill={isDark ? '#94a3b8' : '#475569'} stroke={isDark ? '#e2e8f0' : '#1e293b'} stroke-width="0.8" />
      <circle cx="5" cy="8" r="1.5" fill="#ffffff" stroke="#0284c7" stroke-width="0.8" />
      <polygon points="10.5,6 14.5,4 14.5,12 10.5,10" fill={isDark ? '#cbd5e1' : '#64748b'} stroke={isDark ? '#e2e8f0' : '#334155'} stroke-width="0.7" />
    </svg>
  {:else if name === 'bg-image'}
    <!-- Background Image / Theme: Square landscape with beach & sky -->
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="1.5" y="1.5" width="13" height="13" rx="0.5" fill="#38bdf8" stroke={isDark ? '#93c5fd' : '#0284c7'} stroke-width="0.8" />
      <path d="M1.5 9.5l4-1.5 5 2 3.5-1v5H1.5v-4.5z" fill="#facc15" />
      <path d="M1.5 11l3-1 4 1.5 5.5-0.5v3H1.5V11z" fill="#0284c7" />
    </svg>
  {:else if name === 'slide-text'}
    <!-- Beamer Normal: Projection screen on tripod showing blue text lines (F4) -->
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="1.5" y="1.5" width="13" height="1.5" fill={isDark ? '#cbd5e1' : '#475569'} />
      <rect x="2" y="3" width="12" height="8.5" fill={isDark ? '#1e293b' : '#ffffff'} stroke={isDark ? '#94a3b8' : '#64748b'} stroke-width="0.7" />
      <line x1="3.5" y1="5" x2="12.5" y2="5" stroke={isDark ? '#60a5fa' : '#0000cc'} stroke-width="1.2" stroke-linecap="round" />
      <line x1="3.5" y1="7.2" x2="12.5" y2="7.2" stroke={isDark ? '#60a5fa' : '#0000cc'} stroke-width="1.2" stroke-linecap="round" />
      <line x1="3.5" y1="9.4" x2="8.5" y2="9.4" stroke={isDark ? '#60a5fa' : '#0000cc'} stroke-width="1.2" stroke-linecap="round" />
      <line x1="8" y1="11.5" x2="8" y2="13.5" stroke={isDark ? '#cbd5e1' : '#334155'} stroke-width="1.2" />
      <line x1="5.5" y1="15" x2="8" y2="13.5" stroke={isDark ? '#cbd5e1' : '#334155'} stroke-width="1.2" />
      <line x1="10.5" y1="15" x2="8" y2="13.5" stroke={isDark ? '#cbd5e1' : '#334155'} stroke-width="1.2" />
    </svg>
  {:else if name === 'slide-clear'}
    <!-- Beamer Clear: Projection screen with background landscape, no text (F6) -->
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="1.5" y="1.5" width="13" height="1.5" fill={isDark ? '#cbd5e1' : '#475569'} />
      <rect x="2" y="3" width="12" height="8.5" fill="#38bdf8" stroke={isDark ? '#94a3b8' : '#64748b'} stroke-width="0.7" />
      <circle cx="10" cy="5" r="1.2" fill="#f59e0b" />
      <path d="M2 11.5l3.5-3.5 3 2.5 3.5-3 2 4H2z" fill="#16a34a" />
      <line x1="8" y1="11.5" x2="8" y2="13.5" stroke={isDark ? '#cbd5e1' : '#334155'} stroke-width="1.2" />
      <line x1="5.5" y1="15" x2="8" y2="13.5" stroke={isDark ? '#cbd5e1' : '#334155'} stroke-width="1.2" />
      <line x1="10.5" y1="15" x2="8" y2="13.5" stroke={isDark ? '#cbd5e1' : '#334155'} stroke-width="1.2" />
    </svg>
  {:else if name === 'screen-black'}
    <!-- Beamer Black: Projection screen with solid black surface (F5) -->
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="1.5" y="1.5" width="13" height="1.5" fill={isDark ? '#cbd5e1' : '#475569'} />
      <rect x="2" y="3" width="12" height="8.5" fill="#000000" stroke={isDark ? '#cbd5e1' : '#334155'} stroke-width={isDark ? '1' : '0.6'} />
      <line x1="8" y1="11.5" x2="8" y2="13.5" stroke={isDark ? '#cbd5e1' : '#334155'} stroke-width="1.2" />
      <line x1="5.5" y1="15" x2="8" y2="13.5" stroke={isDark ? '#cbd5e1' : '#334155'} stroke-width="1.2" />
      <line x1="10.5" y1="15" x2="8" y2="13.5" stroke={isDark ? '#cbd5e1' : '#334155'} stroke-width="1.2" />
    </svg>
  {:else if name === 'alert'}
    <!-- Alert / Lauftext: Document with bold capital 'A' and text lines -->
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="2" y="2" width="12" height="12" rx="0.5" fill={isDark ? '#1e293b' : '#ffffff'} stroke={isDark ? '#38bdf8' : '#0284c7'} stroke-width="0.8" />
      <text x="3.5" y="9.5" font-family="Arial, sans-serif" font-size="7" font-weight="bold" fill={isDark ? '#ffffff' : '#000000'}>A</text>
      <line x1="8" y1="5" x2="12.5" y2="5" stroke={isDark ? '#38bdf8' : '#0284c7'} stroke-width="1" />
      <line x1="8" y1="7.5" x2="12.5" y2="7.5" stroke={isDark ? '#38bdf8' : '#0284c7'} stroke-width="1" />
      <line x1="8" y1="10" x2="12.5" y2="10" stroke={isDark ? '#38bdf8' : '#0284c7'} stroke-width="1" />
      <line x1="3.5" y1="12" x2="12.5" y2="12" stroke={isDark ? '#38bdf8' : '#0284c7'} stroke-width="1" />
    </svg>
  {:else if name === 'chords'}
    <!-- SongBeamer Chords: 'a c b' glyph in blue, green, red -->
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <text x="1.5" y="7.5" font-family="'Segoe UI', Arial, sans-serif" font-size="7" font-weight="bold" fill={isDark ? '#60a5fa' : '#0000cc'}>a</text>
      <text x="1.5" y="14.5" font-family="'Segoe UI', Arial, sans-serif" font-size="7" font-weight="bold" fill={isDark ? '#4ade80' : '#008000'}>c</text>
      <text x="8" y="11" font-family="'Segoe UI', Arial, sans-serif" font-size="8.5" font-weight="bold" fill={isDark ? '#f87171' : '#cc0000'}>b</text>
    </svg>
  {:else if name === 'play'}
    <!-- Play Presentation: Large green triangle -->
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <polygon points="3,2 14,8 3,14" fill="#22c55e" stroke={isDark ? '#4ade80' : '#16a34a'} stroke-width="1" stroke-linejoin="round" />
    </svg>
  {:else if name === 'ccli'}
    <!-- CCLI SongSelect: Brass key -->
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="5" cy="8" r="3.2" fill="#facc15" stroke="#ca8a04" stroke-width="0.8" />
      <circle cx="5" cy="8" r="1.3" fill="#ffffff" />
      <line x1="8" y1="8" x2="14" y2="8" stroke="#ca8a04" stroke-width="1.4" />
      <line x1="11.5" y1="8" x2="11.5" y2="10.5" stroke="#ca8a04" stroke-width="1.2" />
      <line x1="13.5" y1="8" x2="13.5" y2="11" stroke="#ca8a04" stroke-width="1.2" />
    </svg>
  {:else if name === 'history'}
    <!-- Song History: Clock over folder -->
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M1.5 4h4l1.5 1.5h6v7.5h-11.5V4z" fill="#60a5fa" stroke={isDark ? '#93c5fd' : '#2563eb'} stroke-width="0.7" />
      <circle cx="10" cy="10" r="4" fill="#ffffff" stroke="#475569" stroke-width="0.8" />
      <polyline points="10,7.5 10,10 12,10" stroke="#dc2626" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  {:else if name === 'screen-close'}
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="1.5" y="2" width="13" height="10" rx="1" fill={isDark ? '#0f172a' : '#1e1e1e'} stroke={isDark ? '#cbd5e1' : '#444444'} stroke-width="0.8" />
      <line x1="4.5" y1="4.5" x2="11.5" y2="9.5" stroke="#ef4444" stroke-width="1.8" stroke-linecap="round" />
      <line x1="11.5" y1="4.5" x2="4.5" y2="9.5" stroke="#ef4444" stroke-width="1.8" stroke-linecap="round" />
      <path d="M5.5 12h5M8 12v2.5M5 14.5h6" stroke={isDark ? '#cbd5e1' : '#555'} stroke-width="0.9" />
    </svg>
  {:else if name === 'save'}
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M2.5 2.5a1 1 0 0 1 1-1h7l2.5 2.5v9.5a1 1 0 0 1-1 1h-9.5a1 1 0 0 1-1-1v-11z" fill="#2563eb" />
      <rect x="5" y="1.5" width="6" height="4" rx="0.5" fill="#e2e8f0" />
      <rect x="4" y="8" width="8" height="6" rx="0.5" fill="#ffffff" />
      <line x1="5.5" y1="9.5" x2="10.5" y2="9.5" stroke="#94a3b8" stroke-width="0.8" />
      <line x1="5.5" y1="11.5" x2="10.5" y2="11.5" stroke="#94a3b8" stroke-width="0.8" />
    </svg>
  {:else if name === 'print'}
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="4" y="1.5" width="8" height="4" fill="#f8fafc" stroke="#94a3b8" stroke-width="0.8" />
      <rect x="2" y="4.5" width="12" height="6.5" rx="1" fill="#cbd5e1" stroke="#64748b" stroke-width="0.8" />
      <rect x="4" y="8.5" width="8" height="5.5" fill="#ffffff" stroke="#94a3b8" stroke-width="0.8" />
    </svg>
  {:else if name === 'prev'}
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <polygon points="11,2.5 4,8 11,13.5" fill="#dc2626" stroke="#b91c1c" stroke-width="0.8" />
    </svg>
  {:else if name === 'next'}
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <polygon points="5,2.5 12,8 5,13.5" fill="#2563eb" stroke="#1d4ed8" stroke-width="0.8" />
    </svg>
  {/if}
</span>
