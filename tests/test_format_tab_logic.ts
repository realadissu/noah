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
import type { LyricLine } from '../src/lib/types/models';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

console.log('Running test_format_tab_logic.ts...');

// Test 1: Empty / Unassigned color handling
{
  const emptyFmt = parseDelphiFormat('Style=[fsBold],Align=taCenter', 'center', '');
  assert(emptyFmt.color === '', 'Expected color to remain empty string when not specified in Delphi format');
  assert(emptyFmt.bold === true, 'Expected fsBold to parse as bold = true');
  assert(emptyFmt.align === 'center', 'Expected align to be center');

  const serialized = serializeDelphiFormat(emptyFmt);
  assert(!serialized.includes('Color='), 'Expected serialized format to omit Color= when unassigned');
  assert(serialized.includes('Style=[fsBold]'), 'Expected Style=[fsBold] in serialized output');
  console.log('✓ Test 1 passed (Unassigned color preservation & serialization)');
}

// Test 2: Opt-out / Global profile inheritance (Zero clutter mandate)
{
  const defaultOpts: SongFormatOptions = {
    ...DEFAULT_FORMAT_OPTIONS,
    useOwnBackgroundProfile: false,
    fontFamily: 'Roboto',
    fontSize: 48,
  };

  const tags = serializeSongFormatOptions(defaultOpts);
  assert(Object.keys(tags).length === 0, 'Expected zero tags serialized when useOwnBackgroundProfile is false');
  console.log('✓ Test 2 passed (Zero clutter when song-specific overrides disabled)');
}

// Test 3: Opt-in / 4-Language tags serialization
{
  const customOpts: SongFormatOptions = {
    ...DEFAULT_FORMAT_OPTIONS,
    useOwnBackgroundProfile: true,
    fontFamily: 'Montserrat',
    fontSize: 42,
    lang1Format: { color: '#ffffff', bold: true, italic: false, underline: false, align: 'center' },
    lang2Format: { color: '#ffff00', bold: true, italic: true, underline: false, align: 'center' },
    lang3Format: { color: '#00ffff', bold: false, italic: false, underline: true, align: 'left' },
    lang4Format: { color: '#ff00ff', bold: false, italic: false, underline: false, align: 'right' },
    chordColor: '#f87171',
    outline: true,
    outlineColor: '#000000',
    shadow: true,
    shadowColor: '#000000',
  };

  const tags = serializeSongFormatOptions(customOpts);
  assert(tags['UseOwnBackgroundProfile'] === '1', 'Expected UseOwnBackgroundProfile=1');
  assert(tags['Font'] === 'Montserrat', 'Expected Font=Montserrat');
  assert(tags['FontSize'] === '42', 'Expected FontSize=42');
  assert(tags['Format'].includes('Color=$FFFFFF'), 'Expected Lang1 Format to include $FFFFFF');
  assert(tags['FormatLang2'].includes('Color=$00FFFF'), 'Expected Lang2 Format to include $00FFFF');
  assert(tags['FormatLang3'].includes('Align=taLeftJustify'), 'Expected Lang3 Format to include Align=taLeftJustify');
  assert(tags['FormatLang4'].includes('Align=taRightJustify'), 'Expected Lang4 Format to include Align=taRightJustify');
  assert(!!tags['ChordColor'], 'Expected ChordColor tag');
  console.log('✓ Test 3 passed (4-Language custom formatting serialization)');
}

// Test 4: End-to-end getLineRenderStyle with 4 Languages
{
  const dummyLineLang0: LyricLine = {
    raw_text: 'German line 1',
    language_index: 0,
    tokens: [{ kind: 'Text', text: 'German line 1' }],
  };
  const dummyLineLang1: LyricLine = {
    raw_text: 'English line 1',
    language_index: 1,
    tokens: [{ kind: 'Text', text: 'English line 1' }],
  };
  const dummyLineLang2: LyricLine = {
    raw_text: 'Spanish line 1',
    language_index: 2,
    tokens: [{ kind: 'Text', text: 'Spanish line 1' }],
  };
  const dummyLineLang3: LyricLine = {
    raw_text: 'French line 1',
    language_index: 3,
    tokens: [{ kind: 'Text', text: 'French line 1' }],
  };

  // When custom formatting is active:
  const activeOpts: SongFormatOptions = {
    ...DEFAULT_FORMAT_OPTIONS,
    useOwnBackgroundProfile: true,
    lang1Format: { color: '#ffffff', bold: true, italic: false, underline: false, align: 'center' },
    lang2Format: { color: '#fcd34d', bold: false, italic: true, underline: false, align: 'center' },
    lang3Format: { color: '#93c5fd', bold: false, italic: false, underline: false, align: 'left' },
    lang4Format: { color: '#86efac', bold: false, italic: false, underline: false, align: 'right' },
    chordColor: '#e11d48',
  };

  const style0 = getLineRenderStyle(dummyLineLang0, activeOpts);
  assert(style0.textStyle.includes('color: #ffffff'), 'Lang 0 should render white');
  assert(style0.textStyle.includes('font-weight: bold'), 'Lang 0 should render bold');

  const style1 = getLineRenderStyle(dummyLineLang1, activeOpts);
  assert(style1.textStyle.includes('color: #fcd34d'), 'Lang 1 should render warm amber');
  assert(style1.textStyle.includes('font-style: italic'), 'Lang 1 should render italic');

  const style2 = getLineRenderStyle(dummyLineLang2, activeOpts);
  assert(style2.textStyle.includes('color: #93c5fd'), 'Lang 2 should render light blue');
  assert(style2.textAlign === 'left', 'Lang 2 should align left');

  const style3 = getLineRenderStyle(dummyLineLang3, activeOpts);
  assert(style3.textStyle.includes('color: #86efac'), 'Lang 3 should render light green');
  assert(style3.textAlign === 'right', 'Lang 3 should align right');

  assert(style0.chordStyle.includes('color: #e11d48'), 'Chord style should use configured chordColor');
  console.log('✓ Test 4 passed (End-to-end getLineRenderStyle with 4 Languages)');
}

// Test 5: Fallback to standard presentation defaults when useOwnBackgroundProfile is false
{
  const disabledOpts: SongFormatOptions = {
    ...DEFAULT_FORMAT_OPTIONS,
    useOwnBackgroundProfile: false,
    lang1Format: { color: '#ff0000', bold: false },
  };

  const dummyLine: LyricLine = {
    raw_text: 'Fallback text',
    language_index: 0,
    tokens: [{ kind: 'Text', text: 'Fallback text' }],
  };

  const style = getLineRenderStyle(dummyLine, disabledOpts);
  assert(style.textStyle.includes('color: #ffffff'), 'When disabled, fallback should strictly be high-contrast white');
  assert(style.textStyle.includes('font-weight: bold'), 'When disabled, fallback should strictly be bold');
  console.log('✓ Test 5 passed (Safe presentation fallback when overrides disabled)');
}

console.log('All formatting tab unit tests passed successfully!');
