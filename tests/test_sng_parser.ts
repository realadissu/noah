//! Verification test for pure TypeScript SNG parser.
import assert from 'node:assert';
import { parseSng, parseSngText } from '../src/lib/utils/sngParser.ts';

console.log('Testing parseSng...');

// Test 1: Standard SongBeamer .sng file
const standardSng = `#Title=Amazing Grace
#Author=John Newton
#Key=G
---
Vers 1
[G]Amazing [C]grace, how [G]sweet the sound,
that [G]saved a [D]wretch like me.
---
Vers 2
'Twas grace that taught my heart to fear,
and grace my fears relieved.
`;

const song1 = parseSngText(standardSng);
assert.strictEqual(song1.metadata.title, 'Amazing Grace');
assert.strictEqual(song1.metadata.author, 'John Newton');
assert.strictEqual(song1.metadata.musical_key, 'G');
assert.strictEqual(song1.slides.length, 2);
assert.strictEqual(song1.slides[0].label, 'Vers 1');
assert.strictEqual(song1.slides[1].label, 'Vers 2');
assert.strictEqual(song1.slides[0].lines[0].tokens.length, 3);
assert.strictEqual(song1.slides[0].lines[0].tokens[0].kind, 'ChordAndText');
console.log('✓ Test 1 passed (Standard SNG parsing)');

// Test 2: Chorus / Refrain section header detection
const chorusSng = `#Title=Test Song
---
Refrain
Lobe den Herrn, meine Seele!
`;
const song2 = parseSngText(chorusSng);
assert.strictEqual(song2.slides[0].label, 'Refrain');
assert.strictEqual(song2.slides[0].section?.type, 'Chorus');
console.log('✓ Test 2 passed (Refrain section detection)');

// Test 3: Binary input with UTF-8 BOM
const utf8WithBom = new Uint8Array([
  0xef, 0xbb, 0xbf,
  ...Buffer.from('#Title=BOM Test\n---\nVers 1\nHello world\n', 'utf-8'),
]);
const song3 = parseSng(utf8WithBom);
assert.strictEqual(song3.metadata.title, 'BOM Test');
assert.strictEqual(song3.slides.length, 1);
console.log('✓ Test 3 passed (UTF-8 BOM decoding)');

// Test 4: Fault injection / corrupted / empty input
const emptySong = parseSngText('', 'FallbackTitle.sng');
assert.strictEqual(emptySong.metadata.title, 'FallbackTitle');
assert.strictEqual(emptySong.slides.length, 1);
console.log('✓ Test 4 passed (Empty input degradation)');

// Test 5: Windows-1252 legacy encoding (SongBeamer default with German umlauts)
// 0xdc = 'Ü', 0xe4 = 'ä', 0xf6 = 'ö', 0xfc = 'ü', 0xdf = 'ß' in windows-1252
const win1252Bytes = new Uint8Array([
  0x23, 0x54, 0x69, 0x74, 0x6c, 0x65, 0x3d, 0xdc, 0x62, 0x65, 0x72, 0x20, 0x64, 0x65, 0x6e, 0x20, 0x57, 0x6f, 0x6c, 0x6b, 0x65, 0x6e, 0x0a,
  0x2d, 0x2d, 0x2d, 0x0a,
  0x56, 0x65, 0x72, 0x73, 0x20, 0x31, 0x0a,
  0x46, 0xfc, 0x72, 0x20, 0x69, 0x6d, 0x6d, 0x65, 0x72, 0x0a,
]);
const song5 = parseSng(win1252Bytes);
assert.strictEqual(song5.metadata.title, 'Über den Wolken');
assert.strictEqual(song5.slides[0].lines[0].raw_text, 'Für immer');
console.log('✓ Test 5 passed (Windows-1252 German umlauts decoding)');

console.log('All TypeScript SNG parser tests passed successfully!');
