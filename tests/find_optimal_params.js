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

    // Test different glyph ratios (0.50, 0.52, 0.54, 0.55, 0.56) and line factors (1.35, 1.38, 1.40)
    const testCases = [
      { glyphRatio: 0.52, lineFactor: 1.38, safeW: 88, safeH: 88 },
      { glyphRatio: 0.54, lineFactor: 1.38, safeW: 88, safeH: 88 },
      { glyphRatio: 0.55, lineFactor: 1.38, safeW: 88, safeH: 88 },
      { glyphRatio: 0.55, lineFactor: 1.40, safeW: 86, safeH: 86 },
      { glyphRatio: 0.56, lineFactor: 1.40, safeW: 86, safeH: 86 }
    ];

    const result = await send('Runtime.evaluate', {
      expression: `(() => {
        const songsData = ${JSON.stringify(parsedSongs)};
        const testCases = ${JSON.stringify(testCases)};
        const caseResults = [];

        for (const tc of testCases) {
          let hOverflowCount = 0;
          let vOverflowCount = 0;
          let worstH = 0;
          let worstV = 0;
          let worstHDetails = null;

          for (const { filename, song } of songsData) {
            for (let sIdx = 0; sIdx < song.slides.length; sIdx++) {
              const slide = song.slides[sIdx];
              const lines = slide.lines
                .map(l => l.tokens.filter(t => t.kind !== 'Chord').map(t => t.text).join('').trim())
                .filter(l => l.length > 0);

              if (lines.length === 0) continue;

              const maxLineLen = Math.max(...lines.map(l => l.length), 1);
              const lineCount = lines.length;

              const aspectFactor = 0.5625;
              const safeWidthCqw = tc.safeW;
              const safeHeightCqw = tc.safeH * aspectFactor;

              const bH = safeWidthCqw / (maxLineLen * tc.glyphRatio);
              const bV = safeHeightCqw / (lineCount * tc.lineFactor);
              const fsCqw = Math.min(14.0, Math.max(1.8, Math.min(bH, bV)));

              const container = document.createElement('div');
              container.style.cssText = 'width: 400px; aspect-ratio: 16/9; container-type: size; position: relative; overflow: hidden;';

              const inner = document.createElement('div');
              // Note: using 6cqw margin means inner target width is 88%
              inner.style.cssText = 'position: absolute; inset: 0; padding: 5cqh 6cqw; display: flex; align-items: center; justify-content: center; text-align: center; overflow: hidden;';

              const textDiv = document.createElement('div');
              // REMOVE px-1 and use line-height: 1.35
              textDiv.className = 'w-full text-center font-bold';
              textDiv.style.cssText = 'font-size: ' + fsCqw.toFixed(2) + 'cqw; line-height: 1.35;';

              lines.forEach(text => {
                const p = document.createElement('p');
                p.className = 'whitespace-nowrap overflow-visible m-0 p-0';
                p.style.cssText = 'line-height: inherit;';
                p.innerText = text;
                textDiv.appendChild(p);
              });

              inner.appendChild(textDiv);
              container.appendChild(inner);
              document.body.appendChild(container);

              const containerRect = container.getBoundingClientRect();
              // Inner boundary limit is container width minus 2 * 6% = 88%
              const safeInnerWidth = containerRect.width * (tc.safeW / 100);
              const safeInnerHeight = containerRect.height * (tc.safeH / 100);

              const paragraphs = Array.from(textDiv.querySelectorAll('p'));
              let maxActualTextWidth = 0;
              let worstLineText = '';

              for (const p of paragraphs) {
                const range = document.createRange();
                range.selectNodeContents(p);
                const textWidth = range.getBoundingClientRect().width;
                if (textWidth > maxActualTextWidth) {
                  maxActualTextWidth = textWidth;
                  worstLineText = p.innerText;
                }
              }

              const textDivRect = textDiv.getBoundingClientRect();

              const overflowW = maxActualTextWidth - safeInnerWidth;
              const overflowH = textDivRect.height - safeInnerHeight;

              if (overflowW > 0.5) {
                hOverflowCount++;
                if (overflowW > worstH) {
                  worstH = overflowW;
                  worstHDetails = { file: filename, slide: sIdx + 1, worstLineText, maxLineLen, overflowW };
                }
              }
              if (overflowH > 0.5) {
                vOverflowCount++;
                if (overflowH > worstV) worstV = overflowH;
              }

              container.remove();
            }
          }

          caseResults.push({
            tc,
            hOverflowCount,
            vOverflowCount,
            totalOverflows: hOverflowCount + vOverflowCount,
            worstH: worstH.toFixed(2),
            worstV: worstV.toFixed(2),
            worstHDetails
          });
        }

        return caseResults;
      })()`,
      returnByValue: true
    });

    console.log('Optimization Results:', JSON.stringify(result.result.value, null, 2));

    ws.close();
  } finally {
    edge.kill();
  }
}

main().catch(console.error);
