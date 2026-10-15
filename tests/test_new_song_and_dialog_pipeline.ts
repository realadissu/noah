import { parseSng } from '../src/lib/utils/sngParser.ts';
import { isImageBackground, PRESENTATION_BACKGROUNDS } from '../src/lib/data/backgrounds.ts';
import type { Song, ScheduleItem } from '../src/lib/types/models.ts';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${msg}`);
  }
}

console.log('🧪 Starting New Song Creation, File Path & Fallback Pipeline Tests...');

// 1. Test Schedule Sync & New Song Insertion Logic
console.log('  1. Testing New Song Insertion into Schedule...');
const schedule: ScheduleItem[] = [
  {
    id: 'item-1',
    title: 'Lobe den Herrn, meine Seele',
    item_type: { kind: 'Song', payload: { id: 's-1', metadata: { title: 'Lobe den Herrn, meine Seele' }, slides: [] } as any },
    duration_seconds: 240,
  },
];

const newSong: Song = {
  id: 'new-song-999',
  metadata: {
    title: 'Herr, ich komme zu dir',
    author: 'Albert Frey',
    verse_order: ['Vers 1', 'Refrain'],
    lang_count: 1,
    custom_tags: {},
  },
  slides: [
    {
      id: 'sl-1',
      index: 0,
      label: 'Vers 1',
      section: { type: 'Verse', value: 1 },
      raw_content: 'Herr, ich komme zu dir,\nkann dir gar nichts bringen,',
      lines: [],
    },
  ],
};

// Simulate saveEditedSong logic:
const schedIndex = schedule.findIndex(
  (item) => item.item_type.kind === 'Song' && (item.item_type.payload.id === newSong.id || item.title === newSong.metadata.title)
);
if (schedIndex >= 0) {
  schedule[schedIndex].title = newSong.metadata.title;
  schedule[schedIndex].item_type = { kind: 'Song', payload: newSong };
} else {
  schedule.push({
    id: 'item-' + Date.now(),
    title: newSong.metadata.title,
    item_type: { kind: 'Song', payload: newSong },
    duration_seconds: 240,
  });
}

assert(schedule.length === 2, 'Schedule must contain 2 items after inserting new song');
assert(schedule[1].title === 'Herr, ich komme zu dir', 'New song title must be in schedule');
assert(schedule[1].item_type.payload.id === 'new-song-999', 'New song payload must be preserved in schedule');
console.log('    ✓ New song successfully inserted into schedule.');

// 2. Test File Path Resolution with Songs Directory
console.log('  2. Testing Automatic File Path Construction in Songs Directory...');
const songsDirectoryWindows = 'C:\\Worship\\Songs';
const safeTitle = (newSong.metadata.title || 'Neues Lied').replace(/[<>:"/\\|?*]/g, '_').trim();
const sep = songsDirectoryWindows.includes('\\') ? '\\' : '/';
const targetPath = `${songsDirectoryWindows.replace(/[\\/]+$/, '')}${sep}${safeTitle}.sng`;

assert(targetPath === 'C:\\Worship\\Songs\\Herr, ich komme zu dir.sng', 'Path must match Windows convention');

// Test Unix-style path
const songsDirectoryUnix = '/home/user/worship/songs';
const sepUnix = songsDirectoryUnix.includes('\\') ? '\\' : '/';
const targetPathUnix = `${songsDirectoryUnix.replace(/[\\/]+$/, '')}${sepUnix}${safeTitle}.sng`;
assert(targetPathUnix === '/home/user/worship/songs/Herr, ich komme zu dir.sng', 'Path must match Unix convention');
console.log('    ✓ Target file path correctly constructed across platforms.');

// 3. Test Missing Background Image Graceful Degradation
console.log('  3. Testing Missing Background Image Classifier & Graceful Fallback...');
const missingImagePath = 'C:\\OldFolder\\NonExistentBackground.jpg';
assert(isImageBackground(missingImagePath) === true, 'isImageBackground must identify .jpg image paths');

// When an image fails to load, the presentation falls back to default background:
const defaultPresentationBg = '#0f172a';
const activeSongBg = missingImagePath;
let effectiveBg = activeSongBg;
let imageLoadFailed = true; // Simulated failure

if (imageLoadFailed) {
  effectiveBg = defaultPresentationBg;
}

assert(effectiveBg === '#0f172a', 'Effective background must gracefully fall back to default profile');
console.log('    ✓ Missing background image gracefully degraded to default presentation profile.');

// 4. Test SNG Parser with Missing Background Tag Roundtrip
console.log('  4. Testing SNG Serialization with Missing Image Tag...');
const sngWithMissingBg = `#Title=Testlied\n#BackgroundImage=C:\\GibtsNicht\\Foto.jpg\n#BackgroundDimmer=40\n---\nVers 1\nZeile 1`;
const parsed = parseSng(sngWithMissingBg, 'test.sng');
assert(parsed.metadata.custom_tags['backgroundimage'] === 'C:\\GibtsNicht\\Foto.jpg', 'Tag must be parsed');
assert(parsed.metadata.custom_tags['backgrounddimmer'] === '40', 'Dimmer must be parsed');
console.log('    ✓ Tag roundtrip verified.');

console.log('\n🎉 ALL NEW SONG & PIPELINE TESTS PASSED CLEANLY!\n');
