import fs from 'fs';
import path from 'path';
import { parseSng } from '../src/lib/utils/sngParser.ts';
import { calculateSlideFontSize, getAudienceLines } from '../src/lib/utils/slideTypography.ts';

const dir = 'Z:/Users/wolfgangmeincke/Documents/SongBeamer/Songs';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.sng'));

console.log(`Found ${files.length} .sng files in SongBeamer library.\n`);

for (const file of files) {
  try {
    const bytes = fs.readFileSync(path.join(dir, file));
    const song = parseSng(new Uint8Array(bytes), file);

    for (let i = 0; i < song.slides.length; i++) {
      const slide = song.slides[i];
      const lines = getAudienceLines(slide);
      const fsCqw = parseFloat(calculateSlideFontSize(slide, false, '16:9'));
      const maxLen = Math.max(...lines.map(l => l.length), 0);

      // Check overflow:
      // If longest line * 0.52em * fsCqw > 88cqw -> horizontal overflow!
      const maxLineWidthCqw = maxLen * 0.52 * fsCqw;
      // If lineCount * 1.35 * fsCqw > (90 * 0.5625 = 50.625) -> vertical overflow!
      const totalHeightCqw = lines.length * 1.35 * fsCqw;

      if (maxLineWidthCqw > 88.5 || totalHeightCqw > 51.0) {
        console.log(`OVERFLOW in ${file} - Slide ${i + 1} (${slide.label}):`);
        console.log(`  Lines: ${lines.length}, MaxLen: ${maxLen}, Fs: ${fsCqw}cqw`);
        console.log(`  Width: ${maxLineWidthCqw.toFixed(1)}cqw (limit: 88.0cqw)`);
        console.log(`  Height: ${totalHeightCqw.toFixed(1)}cqw (limit: 50.6cqw)`);
      }
    }
  } catch (err) {
    console.error(`Error parsing ${file}:`, err);
  }
}

console.log('\nScan complete.');
