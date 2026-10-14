import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { parseSng } from '../src/lib/utils/sngParser.ts';

const dir = 'Z:/Users/wolfgangmeincke/Documents/SongBeamer/Songs';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.sng'));

async function main() {
  console.log(`Testing all ${files.length} real SongBeamer songs for text overflow in browser DOM...`);

  const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--remote-debugging-port=9222',
    '--headless=new',
    '--window-size=1600,1000',
    'http://localhost:5173'
  ]);

  await new Promise((r) => setTimeout(r, 2000));

  try {
    const res = await fetch('http://localhost:9222/json');
    const targets = await res.json();
    const page = targets.find((t) => t.type === 'page' && t.url.includes('5173'));

    const ws = new WebSocket(page.webSocketDebuggerUrl);
    let msgId = 1;
    const callbacks = new Map();

    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.id && callbacks.has(data.id)) {
        callbacks.get(data.id)(data.result);
      }
    };

    await new Promise((r) => (ws.onopen = r));

    function send(method, params = {}) {
      const id = msgId++;
      return new Promise((resolve) => {
        callbacks.set(id, resolve);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    await new Promise((r) => setTimeout(r, 1500));

    // Load songs into memory
    const loadedSongs = [];
    for (const f of files) {
      try {
        const bytes = fs.readFileSync(path.join(dir, f));
        const song = parseSng(new Uint8Array(bytes), f);
        loadedSongs.push(song);
      } catch (err) {}
    }

    // Evaluate in browser DOM by testing each slide
    const evalResult = await send('Runtime.evaluate', {
      expression: `(() => {
        const songs = ${JSON.stringify(loadedSongs)};

        // Container widths to test:
        // 1. Foliendeck card: 450px
        // 2. Preview card: 260px
        // 3. Beamer output: 1920px

        const testWidths = [450, 260, 1920];
        const failures = [];

        // Dynamic font-size calculation helper mirroring slideTypography.ts
        function calcFs(lines, aspectRatio) {
          const lineCount = lines.length;
          const maxLineLen = Math.max(...lines.map(l => l.trim().length), 1);
          const lineFactor = 1.35;
          const aspectFactor = aspectRatio === '4:3' ? 0.75 : aspectRatio === '16:10' ? 0.625 : 0.5625;

          const safeWidthCqw = 88.0;
          const safeHeightCqw = 90.0 * aspectFactor;

          const glyphRatio = 0.47; // Current in slideTypography.ts
          const boundaryH = safeWidthCqw / (maxLineLen * glyphRatio);
          const boundaryV = safeHeightCqw / (lineCount * lineFactor);

          const optimal = Math.min(boundaryH, boundaryV);
          const clamped = Math.min(14.0, Math.max(1.8, optimal));
          return clamped + 'cqw';
        }

        for (const song of songs) {
          for (let sIdx = 0; sIdx < song.slides.length; sIdx++) {
            const slide = song.slides[sIdx];
            const lines = slide.lines
              .map(l => l.tokens.filter(t => t.kind !== 'Chord').map(t => t.text).join('').trim())
              .filter(l => l.length > 0);

            if (lines.length === 0) continue;

            const fsCqw = calcFs(lines, '16:9');

            for (const width of testWidths) {
              const wrapper = document.createElement('div');
              wrapper.style.cssText = 'width: ' + width + 'px; aspect-ratio: 16/9; container-type: size; position: relative; overflow: hidden;';

              const inner = document.createElement('div');
              inner.style.cssText = 'position: absolute; inset: 0; padding: 5cqh 6cqw; display: flex; align-items: center; justify-content: center; text-align: center;';

              const textDiv = document.createElement('div');
              textDiv.style.cssText = 'width: 100%; font-weight: bold; font-size: ' + fsCqw + '; line-height: 1.35;';

              lines.forEach(text => {
                const p = document.createElement('p');
                p.style.cssText = 'white-space: nowrap; overflow: visible; line-height: 1.35;';
                p.innerText = text;
                textDiv.appendChild(p);
              });

              inner.appendChild(textDiv);
              wrapper.appendChild(inner);
              document.body.appendChild(wrapper);

              // Check if any paragraph exceeds the container's clientWidth
              const innerRect = inner.getBoundingClientRect();
              const textRect = textDiv.getBoundingClientRect();
              const paragraphs = Array.from(textDiv.querySelectorAll('p'));

              for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
                const p = paragraphs[pIdx];
                const pRect = p.getBoundingClientRect();

                // Check horizontal overflow past inner container (which has 6cqw padding on each side)
                if (pRect.width > innerRect.width + 1.0) {
                  failures.push({
                    song: song.metadata.title,
                    slide: sIdx + 1,
                    width,
                    type: 'horizontal_overflow',
                    lineWidth: pRect.width,
                    allowedWidth: innerRect.width,
                    diff: pRect.width - innerRect.width,
                    line: lines[pIdx]
                  });
                  break;
                }
              }

              // Check vertical overflow past inner container
              if (textRect.height > innerRect.height + 1.0) {
                failures.push({
                  song: song.metadata.title,
                  slide: sIdx + 1,
                  width,
                  type: 'vertical_overflow',
                  textHeight: textRect.height,
                  allowedHeight: innerRect.height,
                  diff: textRect.height - innerRect.height
                });
              }

              wrapper.remove();
            }
          }
        }

        return {
          totalSongs: songs.length,
          failureCount: failures.length,
          failures: failures.slice(0, 15)
        };
      })()`,
      returnByValue: true
    });

    console.log('Real Songs Overflow Result:', JSON.stringify(evalResult.result.value, null, 2));

    ws.close();
  } finally {
    edge.kill();
  }
}

main().catch(console.error);
