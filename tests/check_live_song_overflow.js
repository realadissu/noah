import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { parseSng } from '../src/lib/utils/sngParser.ts';

const dir = 'Z:/Users/wolfgangmeincke/Documents/SongBeamer/Songs';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.sng'));

async function main() {
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

    // Parse all songs
    const parsedSongs = [];
    for (const f of files) {
      try {
        const bytes = fs.readFileSync(path.join(dir, f));
        const song = parseSng(new Uint8Array(bytes), f);
        parsedSongs.push({ filename: f, song });
      } catch (err) {}
    }

    const result = await send('Runtime.evaluate', {
      expression: `(() => {
        const songsData = ${JSON.stringify(parsedSongs)};
        const reports = [];

        for (const { filename, song } of songsData) {
          for (let sIdx = 0; sIdx < song.slides.length; sIdx++) {
            const slide = song.slides[sIdx];
            const lines = slide.lines
              .map(l => l.tokens.filter(t => t.kind !== 'Chord').map(t => t.text).join('').trim())
              .filter(l => l.length > 0);

            if (lines.length === 0) continue;

            const maxLineLen = Math.max(...lines.map(l => l.length), 1);
            const lineCount = lines.length;

            const glyphRatio = 0.47;
            const lineFactor = 1.35;
            const aspectFactor = 0.5625;
            const safeWidthCqw = 88.0;
            const safeHeightCqw = 90.0 * aspectFactor;

            const bH = safeWidthCqw / (maxLineLen * glyphRatio);
            const bV = safeHeightCqw / (lineCount * lineFactor);
            const fsCqw = Math.min(14.0, Math.max(1.8, Math.min(bH, bV)));

            const container = document.createElement('div');
            container.style.cssText = 'width: 400px; aspect-ratio: 16/9; container-type: size; position: relative; overflow: hidden;';

            const inner = document.createElement('div');
            inner.style.cssText = 'position: absolute; inset: 0; padding: 5cqh 6cqw; display: flex; align-items: center; justify-content: center; text-align: center; overflow: hidden;';

            const textDiv = document.createElement('div');
            textDiv.className = 'w-full text-center font-bold px-1';
            textDiv.style.cssText = 'font-size: ' + fsCqw.toFixed(2) + 'cqw; line-height: 1.35;';

            lines.forEach(text => {
              const p = document.createElement('p');
              p.className = 'leading-snug whitespace-nowrap overflow-visible';
              p.innerText = text;
              textDiv.appendChild(p);
            });

            inner.appendChild(textDiv);
            container.appendChild(inner);
            document.body.appendChild(container);

            const containerRect = container.getBoundingClientRect();
            const safeInnerWidth = containerRect.width * 0.88;
            const safeInnerHeight = containerRect.height * 0.90;

            const paragraphs = Array.from(textDiv.querySelectorAll('p'));
            let maxActualTextWidth = 0;
            let worstLine = '';

            for (const p of paragraphs) {
              // Measure actual text inline width using Range
              const range = document.createRange();
              range.selectNodeContents(p);
              const textWidth = range.getBoundingClientRect().width;
              if (textWidth > maxActualTextWidth) {
                maxActualTextWidth = textWidth;
                worstLine = p.innerText;
              }
            }

            const textDivRect = textDiv.getBoundingClientRect();

            const overflowSafeWidth = maxActualTextWidth - safeInnerWidth;
            const overflowCardWidth = maxActualTextWidth - containerRect.width;
            const overflowSafeHeight = textDivRect.height - safeInnerHeight;
            const overflowCardHeight = textDivRect.height - containerRect.height;

            if (overflowSafeWidth > 1.0 || overflowSafeHeight > 1.0) {
              reports.push({
                file: filename,
                slideIndex: sIdx + 1,
                label: slide.label,
                linesCount: lineCount,
                maxLineLen,
                fsCqw: fsCqw.toFixed(2) + 'cqw',
                maxTextWidth: maxActualTextWidth.toFixed(1),
                safeInnerWidth: safeInnerWidth.toFixed(1),
                containerWidth: containerRect.width,
                overflowSafeWidth: overflowSafeWidth.toFixed(1),
                overflowCardWidth: overflowCardWidth.toFixed(1),
                textHeight: textDivRect.height.toFixed(1),
                safeInnerHeight: safeInnerHeight.toFixed(1),
                overflowSafeHeight: overflowSafeHeight.toFixed(1),
                worstLine
              });
            }

            container.remove();
          }
        }

        return {
          totalSlidesChecked: songsData.reduce((acc, s) => acc + s.song.slides.length, 0),
          overflowCount: reports.length,
          reports: reports.slice(0, 30)
        };
      })()`,
      returnByValue: true
    });

    console.log('REAL Text Width Overflow Results:', JSON.stringify(result.result.value, null, 2));

    ws.close();
  } finally {
    edge.kill();
  }
}

main().catch(console.error);
