//! Verification and negative tests for Delphi formatting parser & color converters.
import assert from 'node:assert';
import {
  delphiColorToHex,
  hexToDelphiColor,
  parseDelphiFormat,
  serializeDelphiFormat,
  parseSongFormatOptions,
  serializeSongFormatOptions,
} from '../src/lib/utils/formatUtils.ts';

console.log('Testing formatUtils...');

// Test 1: Delphi color names
assert.strictEqual(delphiColorToHex('clYellow'), '#ffff00');
assert.strictEqual(delphiColorToHex('clWhite'), '#ffffff');
assert.strictEqual(delphiColorToHex('clBlack'), '#000000');
assert.strictEqual(delphiColorToHex('clRed'), '#ff0000');
assert.strictEqual(delphiColorToHex('clSilver'), '#c0c0c0');
console.log('✓ Test 1 passed (Delphi standard color names)');

// Test 2: Delphi BGR hex format ($00BBGGRR) to RGB web hex (#RRGGBB)
// Pure Red in Delphi BGR: $0000FF -> #ff0000
assert.strictEqual(delphiColorToHex('$0000FF'), '#ff0000');
// Pure Blue in Delphi BGR: $FF0000 -> #0000ff
assert.strictEqual(delphiColorToHex('$FF0000'), '#0000ff');
// Pure Yellow in Delphi BGR: $00FFFF -> #ffff00
assert.strictEqual(delphiColorToHex('$00FFFF'), '#ffff00');
// White in Delphi BGR: $FFFFFF -> #ffffff
assert.strictEqual(delphiColorToHex('$FFFFFF'), '#ffffff');
// Black: $000000 -> #000000
assert.strictEqual(delphiColorToHex('$000000'), '#000000');
console.log('✓ Test 2 passed (Delphi BGR to RGB hex conversion)');

// Test 3: Hex to Delphi conversion
assert.strictEqual(hexToDelphiColor('#ffff00'), '$00FFFF');
assert.strictEqual(hexToDelphiColor('#ff0000'), '$0000FF');
assert.strictEqual(hexToDelphiColor('#0000ff'), '$FF0000');
assert.strictEqual(hexToDelphiColor('#ffffff'), '$FFFFFF');
console.log('✓ Test 3 passed (RGB hex to Delphi BGR conversion)');

// Test 4: Fault injection / invalid colors
assert.strictEqual(delphiColorToHex('invalid_color', '#123456'), '#123456');
assert.strictEqual(delphiColorToHex('', '#ffffff'), '#ffffff');
console.log('✓ Test 4 passed (Fault injection fallback)');

// Test 5: Format string parsing (TitleFormat, Format, FormatLang2)
const fmt1 = parseDelphiFormat('Color=$00FFFF,Style=[fsBold,fsItalic],Align=taCenter');
assert.strictEqual(fmt1.color, '#ffff00');
assert.strictEqual(fmt1.bold, true);
assert.strictEqual(fmt1.italic, true);
assert.strictEqual(fmt1.underline, false);
assert.strictEqual(fmt1.align, 'center');

const fmt2 = parseDelphiFormat('Color=$FFFFFF,Style=[fsUnderline],Align=taLeftJustify');
assert.strictEqual(fmt2.color, '#ffffff');
assert.strictEqual(fmt2.bold, false);
assert.strictEqual(fmt2.italic, false);
assert.strictEqual(fmt2.underline, true);
assert.strictEqual(fmt2.align, 'left');
console.log('✓ Test 5 passed (Delphi format string parsing)');

// Test 6: Serialization round-trip
const serialized = serializeDelphiFormat({
  color: '#ffff00',
  bold: true,
  italic: true,
  underline: false,
  align: 'center',
});
assert.ok(serialized.includes('Color=$00FFFF'));
assert.ok(serialized.includes('fsBold'));
assert.ok(serialized.includes('fsItalic'));
assert.ok(serialized.includes('Align=taCenter'));
console.log('✓ Test 6 passed (Format serialization)');

// Test 7: Full song custom tags parsing & serialization
const tags = {
  font: 'Segoe UI',
  fontlang2: 'Arial',
  fontsize: '42',
  titleformat: 'Color=$00FFFF,Style=[fsBold],Align=taCenter',
  format: 'Color=$FFFFFF,Style=[fsBold],Align=taCenter',
  chordcolor: '$0000FF',
  copyrightcolor: '$00FFFF',
  outlinecolor: '$000000',
  useownbackgroundprofile: '1',
  formatpreline: '<b>',
  formatprepage: '<slide>',
};

const opts = parseSongFormatOptions(tags);
assert.strictEqual(opts.fontFamily, 'Segoe UI');
assert.strictEqual(opts.fontFamilyLang2, 'Arial');
assert.strictEqual(opts.fontSize, 42);
assert.strictEqual(opts.titleFormat.color, '#ffff00');
assert.strictEqual(opts.chordColor, '#ff0000');
assert.strictEqual(opts.useOwnBackgroundProfile, true);
assert.strictEqual(opts.formatPreLine, '<b>');
assert.strictEqual(opts.formatPrePage, '<slide>');

const outTags = serializeSongFormatOptions(opts);
assert.strictEqual(outTags['Font'], 'Segoe UI');
assert.strictEqual(outTags['FontLang2'], 'Arial');
assert.strictEqual(outTags['FontSize'], '42');
assert.strictEqual(outTags['UseOwnBackgroundProfile'], '1');
assert.strictEqual(outTags['FormatPreLine'], '<b>');
assert.strictEqual(outTags['FormatPrePage'], '<slide>');
console.log('✓ Test 7 passed (Full SongFormatOptions tags round-trip)');

console.log('All formatUtils tests passed cleanly!');
