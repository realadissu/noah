import fs from 'fs';
import { parseSng } from '../src/lib/utils/sngParser.ts';
import { calculateSlideFontSize, getAudienceLines } from '../src/lib/utils/slideTypography.ts';

const sngBytes = fs.readFileSync('Z:/Users/wolfgangmeincke/Documents/SongBeamer/Songs/Die auf den Herrn harren.sng');
const song = parseSng(new Uint8Array(sngBytes), 'Die auf den Herrn harren.sng');

console.log('Title:', song.metadata.title);
console.log('Slide count:', song.slides.length);

for (let i = 0; i < song.slides.length; i++) {
  const slide = song.slides[i];
  const lines = getAudienceLines(slide);
  const fontSize = calculateSlideFontSize(slide, false, '16:9');
  console.log(`\nSlide ${i + 1} (${slide.label}): font size = ${fontSize}`);
  console.log('Lines count:', lines.length);
  lines.forEach((l, idx) => console.log(`  Line ${idx + 1} (${l.length} chars): "${l}"`));
}
