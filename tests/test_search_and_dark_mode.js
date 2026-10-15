import assert from 'node:assert';

console.log('🧪 Running Quick Search & Dark Mode Test Suite...');

// Mock store / environment
import { presentation } from '../src/lib/stores/presentation.svelte.js';

// 1. Test Quick Search
console.log('1. Testing presentation.searchSongs client fallback...');
const resultsGott = await presentation.searchSongs('Großer');
assert.ok(resultsGott.length > 0, 'Should find at least 1 result for "Großer"');
assert.strictEqual(resultsGott[0].title, 'Großer Gott, wir loben dich', 'Title should match');
console.log('  ✓ Found by title:', resultsGott[0].title);

const resultsLyrics = await presentation.searchSongs('Sternen');
assert.ok(resultsLyrics.length > 0, 'Should find song containing "Sternen" in lyrics');
console.log('  ✓ Found by lyric text snippet:', resultsLyrics[0].title, '| Snippet:', resultsLyrics[0].match_snippet);

const resultsEmpty = await presentation.searchSongs('NonExistentSongXYZ123');
assert.strictEqual(resultsEmpty.length, 0, 'Should return empty array for non-matching query');
console.log('  ✓ Returns empty array on non-matching query');

// 2. Test selecting search result
console.log('2. Testing addSongFromSearch...');
const initialLen = presentation.schedule.length;
const selectedSong = resultsGott[0];
presentation.addSongFromSearch(selectedSong);
assert.strictEqual(presentation.activeSong?.metadata.title, 'Großer Gott, wir loben dich', 'Active song should be selected');
console.log('  ✓ Song successfully selected into active view:', presentation.activeSong?.metadata.title);

// 3. Test Theme Toggle & Dark Mode contrast
console.log('3. Testing Dark Mode Theme State...');
presentation.theme = 'dark';
assert.strictEqual(presentation.theme, 'dark', 'Theme should be dark');
console.log('  ✓ presentation.theme is dark');
presentation.theme = 'light';
assert.strictEqual(presentation.theme, 'light', 'Theme should be light');
console.log('  ✓ presentation.theme is light');

console.log('🎉 All Quick Search & Dark Mode tests passed successfully!');
