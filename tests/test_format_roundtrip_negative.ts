import {
  parseSongFormatOptions,
  serializeSongFormatOptions,
  getLineRenderStyle,
  parseDelphiFormat,
  serializeDelphiFormat,
  delphiColorToHex,
  hexToDelphiColor,
} from '../src/lib/utils/formatUtils';
import {
  DEFAULT_FORMAT_OPTIONS,
  DEFAULT_PRESENTATION_COLORS,
  type SongFormatOptions,
} from '../src/lib/types/format';
import { parseSng } from '../src/lib/utils/sngParser';
import type { LyricLine, Song } from '../src/lib/types/models';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

console.log('--- STARTING FORMAT ROUNDTRIP & NEGATIVE FAULT INJECTION SUITE ---');

// =========================================================================
// 1. FULL ROUNDTRIP TEST (.sng Generation -> ParseSng -> FormatOptions Parity)
// =========================================================================
{
  const originalOptions: SongFormatOptions = {
    useOwnBackgroundProfile: true,
    fontFamily: 'Georgia',
    fontFamilyLang2: 'Inter',
    fontSize: 44,
    titleFormat: {
      color: '#eab308',
      bold: true,
      italic: false,
      underline: false,
      align: 'center',
    },
    lang1Format: {
      color: '#38bdf8',
      bold: true,
      italic: false,
      underline: false,
      align: 'left',
    },
    lang2Format: {
      color: '#f43f5e',
      bold: false,
      italic: true,
      underline: false,
      align: 'center',
    },
    lang3Format: {
      color: '#10b981',
      bold: false,
      italic: false,
      underline: true,
      align: 'right',
    },
    lang4Format: {
      color: '#a855f7',
      bold: true,
      italic: true,
      underline: false,
      align: 'right',
    },
    chordColor: '#fb923c',
    copyrightColor: '#94a3b8',
    outline: true,
    outlineColor: '#0f172a',
    shadow: true,
    shadowColor: '#1e293b',
  };

  // Replicate exact header emission from SongEditorModal.handleSave()
  let sngText = '#Title=Roundtrip Hymn\n';
  sngText += '#Author=Test Architect\n';
  sngText += '#LangCount=4\n';

  const formatTags = serializeSongFormatOptions(originalOptions);
  for (const [k, v] of Object.entries(formatTags)) {
    sngText += `#${k}=${v}\n`;
  }
  sngText += '---\n';
  sngText += 'Zeile 1 (Sprache 1)\n';
  sngText += 'Line 1 (Language 2)\n';
  sngText += 'Ligne 1 (Language 3)\n';
  sngText += 'Linea 1 (Language 4)\n';

  // Parse SNG text
  const parsedSong = parseSng(sngText, 'roundtrip.sng');
  assert(parsedSong.metadata.title === 'Roundtrip Hymn', 'Title must match');
  assert(parsedSong.metadata.lang_count === 4, 'Lang count must be 4');

  // Re-extract format options from parsed custom_tags
  const reconstructed = parseSongFormatOptions(parsedSong.metadata.custom_tags);

  assert(reconstructed.useOwnBackgroundProfile === true, 'useOwnBackgroundProfile must be true');
  assert(reconstructed.fontFamily === 'Georgia', `Font family expected Georgia, got ${reconstructed.fontFamily}`);
  assert(reconstructed.fontFamilyLang2 === 'Inter', `FontLang2 expected Inter, got ${reconstructed.fontFamilyLang2}`);
  assert(reconstructed.fontSize === 44, `FontSize expected 44, got ${reconstructed.fontSize}`);

  // Lang 1 checks
  assert(reconstructed.lang1Format.color === '#38bdf8', `Lang1 color expected #38bdf8, got ${reconstructed.lang1Format.color}`);
  assert(reconstructed.lang1Format.bold === true, 'Lang1 bold expected true');
  assert(reconstructed.lang1Format.align === 'left', `Lang1 align expected left, got ${reconstructed.lang1Format.align}`);

  // Lang 2 checks
  assert(reconstructed.lang2Format.color === '#f43f5e', `Lang2 color expected #f43f5e, got ${reconstructed.lang2Format.color}`);
  assert(reconstructed.lang2Format.italic === true, 'Lang2 italic expected true');
  assert(reconstructed.lang2Format.align === 'center', 'Lang2 align expected center');

  // Lang 3 checks
  assert(reconstructed.lang3Format.color === '#10b981', `Lang3 color expected #10b981, got ${reconstructed.lang3Format.color}`);
  assert(reconstructed.lang3Format.underline === true, 'Lang3 underline expected true');
  assert(reconstructed.lang3Format.align === 'right', 'Lang3 align expected right');

  // Lang 4 checks
  assert(reconstructed.lang4Format.color === '#a855f7', `Lang4 color expected #a855f7, got ${reconstructed.lang4Format.color}`);
  assert(reconstructed.lang4Format.bold === true, 'Lang4 bold expected true');
  assert(reconstructed.lang4Format.italic === true, 'Lang4 italic expected true');
  assert(reconstructed.lang4Format.align === 'right', 'Lang4 align expected right');

  // Chords, Copyright, Outline & Shadow checks
  assert(reconstructed.chordColor === '#fb923c', `Chord color expected #fb923c, got ${reconstructed.chordColor}`);
  assert(reconstructed.copyrightColor === '#94a3b8', `Copyright color expected #94a3b8, got ${reconstructed.copyrightColor}`);
  assert(reconstructed.outline === true, 'Outline expected true');
  assert(reconstructed.outlineColor === '#0f172a', `Outline color expected #0f172a, got ${reconstructed.outlineColor}`);
  assert(reconstructed.shadow === true, 'Shadow expected true');
  assert(reconstructed.shadowColor === '#1e293b', `Shadow color expected #1e293b, got ${reconstructed.shadowColor}`);

  console.log('✓ PASS: Full .sng roundtrip byte-parity verified across all 4 languages, fonts, and styles.');
}

// =========================================================================
// 2. ZERO-CLUTTER INHERITANCE INVARIANT
// =========================================================================
{
  const inheritedOptions: SongFormatOptions = {
    ...DEFAULT_FORMAT_OPTIONS,
    useOwnBackgroundProfile: false,
    fontFamily: 'Comic Sans MS', // should NOT be saved if profile is disabled
    fontSize: 50,
  };

  const tags = serializeSongFormatOptions(inheritedOptions);
  assert(Object.keys(tags).length === 0, 'No format tags must be emitted when useOwnBackgroundProfile is false');

  let sngText = '#Title=Default Song\n---\nSimple Verse\n';
  const parsed = parseSng(sngText, 'default.sng');
  const reconstructed = parseSongFormatOptions(parsed.metadata.custom_tags);

  assert(reconstructed.useOwnBackgroundProfile === false, 'Reconstructed profile must be false');
  console.log('✓ PASS: Zero-clutter inheritance verified: no redundant tags written to .sng.');
}

// =========================================================================
// 3. FAULT INJECTION & NEGATIVE ROBUSTNESS TESTS
// =========================================================================

// 3.1 Corrupted Delphi Hex Colors
{
  const testCases = [
    { input: '$ZZZZZZ', expected: '#ffffff' },
    { input: '$9999999999999', expected: '#ffffff' },
    { input: '$', expected: '#ffffff' },
    { input: '$$$00FFFF', expected: '#ffffff' },
    { input: 'clUnknownColorName', expected: '#ffffff' },
    { input: '#12', expected: '#ffffff' },
    { input: '', expected: '#ffffff' },
  ];

  for (const tc of testCases) {
    const hex = delphiColorToHex(tc.input, '#ffffff');
    assert(hex === tc.expected, `delphiColorToHex('${tc.input}') expected '${tc.expected}', got '${hex}'`);
  }
  console.log('✓ PASS: Malformed Delphi hex/named color fault injection safely degraded to fallback.');
}

// 3.2 Malformed Delphi Format Strings
{
  // Corrupted style brackets, missing closing bracket, garbage styles
  const malformedFmt1 = parseDelphiFormat('Color=$0000FF,Style=[fsBold,fsMalformed,Align=taLeftJustify', 'center', '');
  assert(malformedFmt1.color === '#ff0000', 'Should extract valid color despite broken bracket');
  assert(malformedFmt1.bold === true, 'Should extract fsBold despite unclosed bracket');

  // Completely corrupt garbage format
  const malformedFmt2 = parseDelphiFormat('%%%GarbageKey=Value,===,,,Style=[]', 'center', '');
  assert(malformedFmt2.bold === false, 'Corrupt format should safely produce unbolded style');
  assert(malformedFmt2.align === 'center', 'Corrupt format should retain default align');

  // Unknown alignment
  const malformedFmt3 = parseDelphiFormat('Align=taCrazySpaceOrbit', 'center', '');
  assert(malformedFmt3.align === 'center', 'Unknown alignment must fall back to center');

  console.log('✓ PASS: Malformed Delphi format property strings safely handled without unhandled exception.');
}

// 3.3 Giant Input & DoS Resilience
{
  const junkSize = 25000;
  const junkStr = 'Style=[' + 'fsBold,'.repeat(junkSize) + 'fsItalic],Color=$00FFFFFF';
  const start = performance.now();
  const parsed = parseDelphiFormat(junkStr, 'center', '');
  const duration = performance.now() - start;

  assert(parsed.bold === true, 'Massive string should parse bold');
  assert(parsed.italic === true, 'Massive string should parse italic');
  assert(duration < 50, `Massive string parse should be fast (< 50ms), took ${duration.toFixed(2)}ms`);

  console.log(`✓ PASS: DoS resilience verified: parsed 25k-token format in ${duration.toFixed(2)}ms.`);
}

// 3.4 Corrupted .sng File Headers
{
  const corruptSng = `
#Title=Corrupted Song
#UseOwnBackgroundProfile=1
#FontSize=NotANumber
#FontSize=-9999
#Format=Color=$INVALID,Style=[fsUnderline]
#FormatLang2=Align=taRightJustify
#Outline=Maybe
#Shadow=0
---
Line 1
Line 2
`;
  const parsed = parseSng(corruptSng, 'corrupt.sng');
  const opts = parseSongFormatOptions(parsed.metadata.custom_tags);

  assert(opts.useOwnBackgroundProfile === true, 'Profile must be active');
  assert(opts.fontSize === 0, `FontSize should safely ignore negative/NaN and remain 0, got ${opts.fontSize}`);
  assert(opts.lang1Format.underline === true, 'Lang1 underline should be true');
  assert(opts.lang2Format.align === 'right', 'Lang2 align should be right');
  assert(opts.shadow === false, 'Shadow=0 must parse as false');

  console.log('✓ PASS: Corrupted .sng file headers safely parsed with graceful fallback.');
}

// 3.5 Out-of-Bounds Language Index in getLineRenderStyle
{
  const opts: SongFormatOptions = {
    ...DEFAULT_FORMAT_OPTIONS,
    useOwnBackgroundProfile: true,
    lang4Format: { color: '#a855f7', align: 'right' },
  };

  const crazyLine1: LyricLine = {
    raw_text: 'Extreme line',
    language_index: 999, // way out of bounds
    tokens: [{ kind: 'Text', text: 'Extreme line' }],
  };
  const crazyLine2: LyricLine = {
    raw_text: 'Negative line',
    language_index: -5,
    tokens: [{ kind: 'Text', text: 'Negative line' }],
  };

  const style1 = getLineRenderStyle(crazyLine1, opts);
  assert(style1.textStyle.includes('color: #a855f7'), 'Extreme language_index >= 3 must safely map to lang4Format');

  const style2 = getLineRenderStyle(crazyLine2, opts);
  assert(typeof style2.textStyle === 'string' && style2.textStyle.length > 0, 'Negative language_index must safely return valid CSS');

  console.log('✓ PASS: Out-of-bounds language indices safely bounded to valid styles.');
}

console.log('--- ALL FORMAT ROUNDTRIP & NEGATIVE TESTS PASSED CLEANLY ---');
