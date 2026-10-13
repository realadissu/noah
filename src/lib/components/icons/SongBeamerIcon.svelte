<script lang="ts">
  type SongBeamerIconName =
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
    | 'chords'
    | 'camera'
    | 'beamer'
    | 'slide-text'
    | 'slide-clear'
    | 'screen-black'
    | 'screen-close'
    | 'play'
    | 'prev'
    | 'next';

  let { name, size = 18, class: className = '' }: { name: SongBeamerIconName; size?: number; class?: string } = $props();
</script>

<span
  class="inline-flex items-center justify-center shrink-0 select-none {className}"
  style="width: {size}px; height: {size}px;"
  aria-hidden="true"
>
  {#if name === 'slide-text'}
    <!-- SongBeamer Folie mit Text: Blue monitor with white lines of text -->
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <rect x="1" y="2" width="18" height="14" rx="1.5" fill="#2b579a" stroke="#1d3b6a" stroke-width="1.2" />
      <rect x="2.5" y="3.5" width="15" height="11" fill="#3a80db" />
      <!-- White slide text lines -->
      <line x1="4.5" y1="6" x2="15.5" y2="6" stroke="#ffffff" stroke-width="1.3" stroke-linecap="round" />
      <line x1="4.5" y1="9" x2="15.5" y2="9" stroke="#ffffff" stroke-width="1.3" stroke-linecap="round" />
      <line x1="4.5" y1="12" x2="12.5" y2="12" stroke="#ffffff" stroke-width="1.3" stroke-linecap="round" />
      <!-- Base stand -->
      <path d="M7 16h6M10 16v2.5M6 18.5h8" stroke="#555" stroke-width="1" />
    </svg>
  {:else if name === 'slide-clear'}
    <!-- SongBeamer Folie ohne Text: Blue monitor without text (background only) -->
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <rect x="1" y="2" width="18" height="14" rx="1.5" fill="#2b579a" stroke="#1d3b6a" stroke-width="1.2" />
      <rect x="2.5" y="3.5" width="15" height="11" fill="#3a80db" />
      <!-- Subtle cloud / background icon indicating slide without text -->
      <path d="M6 10a2 2 0 0 1 3.5-1.2A2.5 2.5 0 0 1 14 9.5a1.8 1.8 0 0 1-1 3.5H6a2 2 0 0 1 0-4z" fill="#ffffff" fill-opacity="0.5" />
      <!-- Base stand -->
      <path d="M7 16h6M10 16v2.5M6 18.5h8" stroke="#555" stroke-width="1" />
    </svg>
  {:else if name === 'screen-black'}
    <!-- SongBeamer Schwarzes Bild: Monitor with solid black screen -->
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <rect x="1" y="2" width="18" height="14" rx="1.5" fill="#222222" stroke="#444444" stroke-width="1.2" />
      <rect x="2.5" y="3.5" width="15" height="11" fill="#000000" />
      <!-- Base stand -->
      <path d="M7 16h6M10 16v2.5M6 18.5h8" stroke="#555" stroke-width="1" />
    </svg>
  {:else if name === 'screen-close'}
    <!-- SongBeamer Bildschirm freigeben: Monitor with solid black screen and prominent red X -->
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <rect x="1" y="2" width="18" height="14" rx="1.5" fill="#1e1e1e" stroke="#444444" stroke-width="1.2" />
      <rect x="2.5" y="3.5" width="15" height="11" fill="#000000" />
      <line x1="5.5" y1="5.5" x2="14.5" y2="12.5" stroke="#ef4444" stroke-width="2.2" stroke-linecap="round" />
      <line x1="14.5" y1="5.5" x2="5.5" y2="12.5" stroke="#ef4444" stroke-width="2.2" stroke-linecap="round" />
      <!-- Base stand -->
      <path d="M7 16h6M10 16v2.5M6 18.5h8" stroke="#555" stroke-width="1" />
    </svg>
  {:else if name === 'open'}
    <!-- Yellow open folder -->
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <path d="M2 5a1 1 0 0 1 1-1h4l2 2h8a1 1 0 0 1 1 1v2H3a1 1 0 0 0-1 1V5z" fill="#f59e0b" />
      <path d="M2 9h16l-2 7H4L2 9z" fill="#fbbf24" stroke="#d97706" stroke-width="0.8" />
    </svg>
  {:else if name === 'save'}
    <!-- Floppy disk -->
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <path d="M3 3a1 1 0 0 1 1-1h10l3 3v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3z" fill="#2563eb" />
      <rect x="6" y="2" width="8" height="5" rx="0.5" fill="#e2e8f0" />
      <rect x="5" y="11" width="10" height="7" rx="0.5" fill="#ffffff" />
      <line x1="7" y1="13" x2="13" y2="13" stroke="#94a3b8" stroke-width="1" />
      <line x1="7" y1="15" x2="13" y2="15" stroke="#94a3b8" stroke-width="1" />
    </svg>
  {:else if name === 'new'}
    <!-- New file with star -->
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <path d="M4 2a1 1 0 0 1 1-1h7l4 4v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V2z" fill="#f8fafc" stroke="#64748b" stroke-width="1" />
      <polygon points="12,1 12,5 16,5" fill="#cbd5e1" />
      <polygon points="14,12 15,14 17,14 15.5,15.5 16,17.5 14,16 12,17.5 12.5,15.5 11,14 13,14" fill="#eab308" />
    </svg>
  {:else if name === 'print'}
    <!-- Printer -->
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <rect x="5" y="2" width="10" height="5" fill="#f8fafc" stroke="#94a3b8" stroke-width="1" />
      <rect x="2" y="6" width="16" height="8" rx="1.5" fill="#cbd5e1" stroke="#64748b" stroke-width="1" />
      <rect x="5" y="11" width="10" height="7" fill="#ffffff" stroke="#94a3b8" stroke-width="1" />
      <circle cx="15" cy="8.5" r="0.8" fill="#22c55e" />
    </svg>
  {:else if name === 'edit'}
    <!-- Sheet with pencil -->
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <rect x="3" y="2" width="12" height="16" rx="1" fill="#f8fafc" stroke="#64748b" stroke-width="1" />
      <line x1="5" y1="6" x2="11" y2="6" stroke="#94a3b8" stroke-width="1" />
      <line x1="5" y1="9" x2="11" y2="9" stroke="#94a3b8" stroke-width="1" />
      <polygon points="12,16 17,11 15,9 10,14" fill="#f59e0b" stroke="#d97706" stroke-width="0.7" />
    </svg>
  {:else if name === 'bible'}
    <!-- Bible with red cross -->
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <rect x="3" y="2" width="14" height="16" rx="1.5" fill="#78350f" stroke="#451a03" stroke-width="1" />
      <path d="M10 5v9M7 8h6" stroke="#ef4444" stroke-width="1.8" stroke-linecap="round" />
      <line x1="3" y1="16" x2="17" y2="16" stroke="#fbbf24" stroke-width="0.8" />
    </svg>
  {:else if name === 'video'}
    <!-- Video / film -->
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <rect x="2" y="4" width="16" height="12" rx="1.5" fill="#1e293b" stroke="#0f172a" stroke-width="1" />
      <polygon points="8,7 14,10 8,13" fill="#38bdf8" />
    </svg>
  {:else if name === 'audio'}
    <!-- CD disc -->
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="8" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1" />
      <circle cx="10" cy="10" r="2.5" fill="#ffffff" stroke="#64748b" stroke-width="1" />
      <circle cx="10" cy="10" r="0.8" fill="#475569" />
    </svg>
  {:else if name === 'song'}
    <!-- Green double music notes -->
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <path d="M7 13V5l8-2v10" stroke="#16a34a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      <ellipse cx="5.5" cy="14" rx="2.5" ry="2" fill="#22c55e" stroke="#16a34a" stroke-width="1" />
      <ellipse cx="13.5" cy="12" rx="2.5" ry="2" fill="#22c55e" stroke="#16a34a" stroke-width="1" />
    </svg>
  {:else if name === 'chords'}
    <!-- Red treble clef / chords -->
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <path d="M9 3v14M6 6h6M6 10h6M6 14h6" stroke="#dc2626" stroke-width="1.2" stroke-linecap="round" />
      <circle cx="7.5" cy="10" r="1.5" fill="#dc2626" />
      <circle cx="10.5" cy="6" r="1.5" fill="#dc2626" />
    </svg>
  {:else if name === 'camera' || name === 'beamer'}
    <!-- Blue camera: Live-Video / External Camera Input in SongBeamer -->
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <rect x="2" y="7" width="13" height="8" rx="1.5" fill="#2563eb" stroke="#1d4ed8" stroke-width="1" />
      <circle cx="6" cy="11" r="2" fill="#ffffff" />
      <polygon points="15,9 19,6 19,16 15,13" fill="#60a5fa" stroke="#2563eb" stroke-width="0.8" />
    </svg>
  {:else if name === 'play'}
    <!-- Green play triangle -->
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <polygon points="4,2 17,10 4,18" fill="#16a34a" stroke="#15803d" stroke-width="1" />
    </svg>
  {:else if name === 'prev'}
    <!-- Left arrow -->
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <polygon points="14,3 5,10 14,17" fill="#dc2626" stroke="#b91c1c" stroke-width="1" />
    </svg>
  {:else if name === 'next'}
    <!-- Right arrow -->
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <polygon points="6,3 15,10 6,17" fill="#2563eb" stroke="#1d4ed8" stroke-width="1" />
    </svg>
  {:else if name === 'search'}
    <!-- Search glass -->
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <circle cx="8.5" cy="8.5" r="5.5" stroke="#2563eb" stroke-width="1.6" />
      <line x1="13" y1="13" x2="18" y2="18" stroke="#1d4ed8" stroke-width="2" stroke-linecap="round" />
    </svg>
  {/if}
</span>
