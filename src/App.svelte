<script lang="ts">
  import { onMount } from 'svelte';
  import { t } from '$lib/i18n';
  import { presentation } from '$lib/stores/presentation.svelte';
  import Header from '$lib/components/Header.svelte';
  import SlidePreview from '$lib/components/SlidePreview.svelte';
  import type { Song, LyricLine } from '$lib/types/models';

  function getAudienceText(line: LyricLine): string {
    return line.tokens
      .map((t) => (t.kind === 'Chord' ? '' : t.text))
      .join('');
  }

  // Sample SNG content from SNG_SPECIFICATION.md
  const SAMPLE_SNG = `#Title=Lobe den Herrn, meine Seele
#Author=Norbert Kissel
#Key=D
#Format=Refrain,Vers 1,Refrain,Vers 2
---
$$M=Refrain
[D]Lobe den Herrn, [G]meine Seele,
und [A]alles in mir seinen [D]heiligen Namen.
[D]Lobe den Herrn, [G]meine Seele,
und [A]vergiss nicht, was er dir [D]Gutes getan.
---
$$M=Vers 1
Der dir [Em]alle deine [A]Sünden vergibt
und [F#m]heilet alle deine [Bm]Gebrechen,
der dein [Em]Leben vom Ver[A]derben erlöst,
der dich [G]krönet mit Gnade und [A]Barmherzigkeit.
---
$$M=Vers 2
Der deinen [Em]Mund fröhlich [A]macht,
und du wieder [F#m]jung wirst wie ein [Bm]Adler.
Der Herr [Em]schafft Ge[A]rechtigkeit
und Ge[G]richt allen, die Ge[A]walt leiden.
`;

  // Parse SNG text in frontend (for instant web preview / offline test) or via Tauri IPC
  async function loadSampleSong() {
    try {
      // In Tauri environment, attempt IPC command
      if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
        const { invoke } = await import('@tauri-apps/api/core');
        const res = await invoke<{ song: Song; encoding: string }>('parse_sng', { content: SAMPLE_SNG });
        presentation.setSong(res.song, res.encoding);
        return;
      }
    } catch {
      // Fallback to client-side model parsing
    }

    // Direct client fallback
    const song: Song = {
      id: 'song-sample-1',
      metadata: {
        title: 'Lobe den Herrn, meine Seele',
        author: 'Norbert Kissel',
        musical_key: 'D',
        verse_order: ['Refrain', 'Vers 1', 'Refrain', 'Vers 2'],
        lang_count: 1,
        custom_tags: {},
      },
      slides: [
        {
          id: 'slide-1',
          index: 0,
          label: 'Chorus',
          section: { type: 'Chorus' },
          raw_content: '[D]Lobe den Herrn, [G]meine Seele,\nund [A]alles in mir seinen [D]heiligen Namen.\n[D]Lobe den Herrn, [G]meine Seele,\nund [A]vergiss nicht, was er dir [D]Gutes getan.',
          lines: [
            {
              raw_text: '[D]Lobe den Herrn, [G]meine Seele,',
              language_index: 0,
              tokens: [
                { kind: 'ChordAndText', chord: 'D', text: 'Lobe den Herrn, ' },
                { kind: 'ChordAndText', chord: 'G', text: 'meine Seele,' },
              ],
            },
            {
              raw_text: 'und [A]alles in mir seinen [D]heiligen Namen.',
              language_index: 0,
              tokens: [
                { kind: 'Text', text: 'und ' },
                { kind: 'ChordAndText', chord: 'A', text: 'alles in mir seinen ' },
                { kind: 'ChordAndText', chord: 'D', text: 'heiligen Namen.' },
              ],
            },
            {
              raw_text: '[D]Lobe den Herrn, [G]meine Seele,',
              language_index: 0,
              tokens: [
                { kind: 'ChordAndText', chord: 'D', text: 'Lobe den Herrn, ' },
                { kind: 'ChordAndText', chord: 'G', text: 'meine Seele,' },
              ],
            },
            {
              raw_text: 'und [A]vergiss nicht, was er dir [D]Gutes getan.',
              language_index: 0,
              tokens: [
                { kind: 'Text', text: 'und ' },
                { kind: 'ChordAndText', chord: 'A', text: 'vergiss nicht, was er dir ' },
                { kind: 'ChordAndText', chord: 'D', text: 'Gutes getan.' },
              ],
            },
          ],
        },
        {
          id: 'slide-2',
          index: 1,
          label: 'Verse 1',
          section: { type: 'Verse', value: 1 },
          raw_content: 'Der dir [Em]alle deine [A]Sünden vergibt\nund [F#m]heilet alle deine [Bm]Gebrechen,\nder dein [Em]Leben vom Ver[A]derben erlöst,\nder dich [G]krönet mit Gnade und [A]Barmherzigkeit.',
          lines: [
            {
              raw_text: 'Der dir [Em]alle deine [A]Sünden vergibt',
              language_index: 0,
              tokens: [
                { kind: 'Text', text: 'Der dir ' },
                { kind: 'ChordAndText', chord: 'Em', text: 'alle deine ' },
                { kind: 'ChordAndText', chord: 'A', text: 'Sünden vergibt' },
              ],
            },
            {
              raw_text: 'und [F#m]heilet alle deine [Bm]Gebrechen,',
              language_index: 0,
              tokens: [
                { kind: 'Text', text: 'und ' },
                { kind: 'ChordAndText', chord: 'F#m', text: 'heilet alle deine ' },
                { kind: 'ChordAndText', chord: 'Bm', text: 'Gebrechen,' },
              ],
            },
            {
              raw_text: 'der dein [Em]Leben vom Ver[A]derben erlöst,',
              language_index: 0,
              tokens: [
                { kind: 'Text', text: 'der dein ' },
                { kind: 'ChordAndText', chord: 'Em', text: 'Leben vom Ver' },
                { kind: 'ChordAndText', chord: 'A', text: 'derben erlöst,' },
              ],
            },
            {
              raw_text: 'der dich [G]krönet mit Gnade und [A]Barmherzigkeit.',
              language_index: 0,
              tokens: [
                { kind: 'Text', text: 'der dich ' },
                { kind: 'ChordAndText', chord: 'G', text: 'krönet mit Gnade und ' },
                { kind: 'ChordAndText', chord: 'A', text: 'Barmherzigkeit.' },
              ],
            },
          ],
        },
        {
          id: 'slide-3',
          index: 2,
          label: 'Verse 2',
          section: { type: 'Verse', value: 2 },
          raw_content: 'Der deinen [Em]Mund fröhlich [A]macht,\nund du wieder [F#m]jung wirst wie ein [Bm]Adler.\nDer Herr [Em]schafft Ge[A]rechtigkeit\nund Ge[G]richt allen, die Ge[A]walt leiden.',
          lines: [
            {
              raw_text: 'Der deinen [Em]Mund fröhlich [A]macht,',
              language_index: 0,
              tokens: [
                { kind: 'Text', text: 'Der deinen ' },
                { kind: 'ChordAndText', chord: 'Em', text: 'Mund fröhlich ' },
                { kind: 'ChordAndText', chord: 'A', text: 'macht,' },
              ],
            },
            {
              raw_text: 'und du wieder [F#m]jung wirst wie ein [Bm]Adler.',
              language_index: 0,
              tokens: [
                { kind: 'Text', text: 'und du wieder ' },
                { kind: 'ChordAndText', chord: 'F#m', text: 'jung wirst wie ein ' },
                { kind: 'ChordAndText', chord: 'Bm', text: 'Adler.' },
              ],
            },
            {
              raw_text: 'Der Herr [Em]schafft Ge[A]rechtigkeit',
              language_index: 0,
              tokens: [
                { kind: 'Text', text: 'Der Herr ' },
                { kind: 'ChordAndText', chord: 'Em', text: 'schafft Ge' },
                { kind: 'ChordAndText', chord: 'A', text: 'rechtigkeit' },
              ],
            },
            {
              raw_text: 'und Ge[G]richt allen, die Ge[A]walt leiden.',
              language_index: 0,
              tokens: [
                { kind: 'Text', text: 'und Ge' },
                { kind: 'ChordAndText', chord: 'G', text: 'richt allen, die Ge' },
                { kind: 'ChordAndText', chord: 'A', text: 'walt leiden.' },
              ],
            },
          ],
        },
      ],
    };

    presentation.setSong(song, 'UTF-8');
  }

  // Handle global keyboard shortcuts matching SongBeamer muscle memory
  function handleKeyDown(e: KeyboardEvent) {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    switch (e.key) {
      case ' ':
      case 'PageDown':
      case 'ArrowDown':
      case 'ArrowRight':
        e.preventDefault();
        presentation.nextSlide();
        break;
      case 'PageUp':
      case 'ArrowUp':
      case 'ArrowLeft':
        e.preventDefault();
        presentation.prevSlide();
        break;
      case 'F4':
        e.preventDefault();
        presentation.setDisplayMode('normal');
        break;
      case 'F5':
      case 'b':
      case 'B':
        e.preventDefault();
        presentation.setDisplayMode(presentation.displayMode === 'black' ? 'normal' : 'black');
        break;
      case 'F6':
      case 'c':
      case 'C':
        e.preventDefault();
        presentation.setDisplayMode(presentation.displayMode === 'clear_text' ? 'normal' : 'clear_text');
        break;
      case 'F7':
      case 'l':
      case 'L':
        e.preventDefault();
        presentation.setDisplayMode(presentation.displayMode === 'logo' ? 'normal' : 'logo');
        break;
      case 'F8':
      case 'f':
      case 'F':
        e.preventDefault();
        presentation.setDisplayMode(presentation.displayMode === 'frozen' ? 'normal' : 'frozen');
        break;
    }
  }

  onMount(() => {
    loadSampleSong();
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  });
</script>

<div class="flex flex-col h-screen w-screen overflow-hidden bg-neutral-950 text-neutral-100 font-sans">
  <Header onLoadSample={loadSampleSong} />

  <!-- Song Metadata Sub-Bar -->
  {#if presentation.activeSong}
    <div class="bg-neutral-900/60 border-b border-neutral-800/80 px-4 py-2 flex items-center justify-between text-xs text-neutral-300">
      <div class="flex items-center space-x-6 overflow-hidden text-ellipsis whitespace-nowrap">
        <div class="flex items-center gap-1.5 font-semibold text-neutral-100">
          <span class="text-neutral-500 font-normal">{t('song.title')}:</span>
          <span>{presentation.activeSong.metadata.title}</span>
        </div>

        {#if presentation.activeSong.metadata.author}
          <div class="flex items-center gap-1.5">
            <span class="text-neutral-500">{t('song.author')}:</span>
            <span>{presentation.activeSong.metadata.author}</span>
          </div>
        {/if}

        {#if presentation.activeSong.metadata.musical_key}
          <div class="flex items-center gap-1.5">
            <span class="text-neutral-500">{t('song.key')}:</span>
            <span class="font-mono text-amber-400 font-bold">{presentation.activeSong.metadata.musical_key}</span>
          </div>
        {/if}

        {#if presentation.activeSong.metadata.verse_order.length > 0}
          <div class="flex items-center gap-1.5">
            <span class="text-neutral-500">{t('song.verseOrder')}:</span>
            <span class="text-neutral-400">{presentation.activeSong.metadata.verse_order.join(' → ')}</span>
          </div>
        {/if}
      </div>

      <div class="flex items-center gap-3 text-[11px] text-neutral-400">
        <span class="px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700">
          {t('song.encoding')}: {presentation.detectedEncoding}
        </span>
      </div>
    </div>
  {/if}

  <!-- Main Content Grid -->
  <main class="flex-1 flex overflow-hidden">
    <!-- Left Column: Slide List -->
    <section class="w-80 md:w-96 border-r border-neutral-800 bg-neutral-950/80 p-3 overflow-y-auto space-y-2.5">
      {#if presentation.activeSong}
        {#each presentation.activeSong.slides as slide}
          <SlidePreview
            {slide}
            isActive={presentation.activeSlideIndex === slide.index}
            showChords={presentation.showChords}
            onSelect={() => presentation.selectSlide(slide.index)}
          />
        {/each}
      {:else}
        <div class="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-500">
          <p class="font-semibold text-neutral-300 mb-1">{t('song.noSongLoaded')}</p>
          <p class="text-xs">{t('song.loadHint')}</p>
        </div>
      {/if}
    </section>

    <!-- Right Column: Dual Stage & Audience Output View -->
    <section class="flex-1 flex flex-col p-4 bg-neutral-900/40 gap-4 overflow-hidden">
      <!-- Top Half: Audience Output Preview -->
      <div class="flex-1 flex flex-col rounded-xl border border-neutral-800 bg-black overflow-hidden relative shadow-2xl">
        <div class="bg-neutral-900/80 border-b border-neutral-800 px-3 py-1.5 flex items-center justify-between text-[11px] font-medium text-neutral-400">
          <span class="flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full {presentation.displayMode === 'normal' ? 'bg-red-500 animate-pulse' : 'bg-neutral-600'}"></span>
            {t('slide.audienceView')}
          </span>
          <span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-neutral-800 text-neutral-300">
            {presentation.activeSlide ? `${presentation.activeSlide.label} (${presentation.activeSlideIndex + 1}/${presentation.activeSong?.slides.length ?? 0})` : ''}
          </span>
        </div>

        <!-- Audience Screen Content / Blanking Overlays -->
        <div class="flex-1 flex items-center justify-center p-8 relative">
          {#if presentation.displayMode === 'black'}
            <div class="absolute inset-0 bg-black flex items-center justify-center">
              <span class="text-xs font-mono text-neutral-700 tracking-widest uppercase">BLACK OUT</span>
            </div>
          {:else if presentation.displayMode === 'clear_text'}
            <div class="absolute inset-0 bg-neutral-950/90 flex items-center justify-center">
              <span class="text-xs font-mono text-neutral-600 tracking-widest uppercase">TEXT CLEARED</span>
            </div>
          {:else if presentation.displayMode === 'logo'}
            <div class="absolute inset-0 bg-neutral-950 flex flex-col items-center justify-center">
              <div class="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 text-2xl font-bold mb-2 shadow-lg">
                NOAH
              </div>
              <span class="text-xs font-semibold text-neutral-400">NOT ONLY ANOTHER HYMNAL</span>
            </div>
          {:else if presentation.activeSlide}
            <div class="text-center max-w-3xl space-y-3 font-semibold text-2xl md:text-3xl lg:text-4xl leading-tight text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)]">
              {#each presentation.activeSlide.lines as line}
                <p class="tracking-wide">{getAudienceText(line)}</p>
              {/each}
            </div>
          {/if}
        </div>
      </div>

      <!-- Bottom Half: Musician / Stage Confidence Preview -->
      <div class="h-44 md:h-52 rounded-xl border border-neutral-800 bg-neutral-950 flex flex-col overflow-hidden shadow-md">
        <div class="bg-neutral-900/80 border-b border-neutral-800 px-3 py-1.5 flex items-center justify-between text-[11px] font-medium text-amber-400/90">
          <span class="flex items-center gap-1.5 font-semibold">
            {t('slide.stageView')}
          </span>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="px-2 py-0.5 rounded text-[10px] bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700"
              onclick={() => presentation.prevSlide()}
            >
              ← {t('slide.prev')}
            </button>
            <button
              type="button"
              class="px-2 py-0.5 rounded text-[10px] bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700"
              onclick={() => presentation.nextSlide()}
            >
              {t('slide.next')} →
            </button>
          </div>
        </div>

        <div class="flex-1 p-4 overflow-y-auto flex items-center justify-center">
          {#if presentation.activeSlide}
            <div class="space-y-1.5 text-center font-mono">
              {#each presentation.activeSlide.lines as line}
                <div class="text-sm">
                  {#each line.tokens as token}
                    {#if token.kind === 'ChordAndText'}
                      <span class="inline-flex flex-col align-top mx-1">
                        <span class="text-xs font-bold text-amber-400">{token.chord}</span>
                        <span class="text-neutral-200">{token.text}</span>
                      </span>
                    {:else if token.kind === 'Chord'}
                      <span class="inline-block text-xs font-bold text-amber-400 mx-1">{token.chord}</span>
                    {:else if token.kind === 'Text'}
                      <span class="text-neutral-200 mx-1">{token.text}</span>
                    {/if}
                  {/each}
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    </section>
  </main>
</div>
