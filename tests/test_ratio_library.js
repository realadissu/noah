import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { parseSng } from '../src/lib/utils/sngParser.ts';

const dir = 'Z:/Users/wolfgangmeincke/Documents/SongBeamer/Songs';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.sng'));

const allSlides = [];
for (const file of files) {
  try {
    const bytes = fs.readFileSync(path.join(dir, file));
    const song = parseSng(new Uint8Array(bytes), file);
    for (let i = 0; i < song.slides.length; i++) {
      const slide = song.slides[i];
      const lines = slide.lines.map(l => l.tokens.filter(t => t.kind !== 'Chord').map(t => t.text).join('').trim()).filter(l => l.length > 0);
      if (lines.length > 0) {
        allSlides.push({ file, slideIdx: i + 1, label: slide.label, lines });
      }
    }
  } catch (err) {}
}

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

    // Test with glyphRatio = 0.54 on Canvas
    const evalResult = await send('Runtime.evaluate', {
      expression: `(() => {
        const slides = ${JSON.stringify(allSlides)};
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        const safeWidth = 88.0; // 88cqw
        const safeHeight = 50.625; // 90 * 0.5625 cqw

        const overflows = [];

        for (const s of slides) {
          const maxLineLen = Math.max(...s.lines.map(l => l.length), 1);
          const lineCount = s.lines.length;

          const boundaryH = safeWidth / (maxLineLen * 0.54);
          const boundaryV = safeHeight / (lineCount * 1.35);
          const optimal = Math.min(boundaryH, boundaryV);
          const clamped = Math.min(14.0, Math.max(1.8, optimal));

          // Measure actual width on canvas at this font size:
          ctx.font = 'bold ' + clamped + 'px sans-serif';
          for (const line of s.lines) {
            const actualLineWidth = ctx.measureText(line).width;
            if (actualLineWidth > 88.0) {
              overflows.push({
                file: s.file,
                slide: s.slideIdx,
                line,
                actualWidth: actualLineWidth,
                allowedWidth: 88.0
              });
            }
          }

          const actualHeight = lineCount * 1.35 * clamped;
          if (actualHeight > 50.625) {
            overflows.push({
              file: s.file,
              slide: s.slideIdx,
              type: 'vertical',
              actualHeight,
              allowedHeight: 50.625
            });
          }
        }

        return {
          totalSlides: slides.length,
          overflowCount: overflows.length,
          overflows: overflows.slice(0, 10)
        };
      })()`,
      returnByValue: true
    });

    console.log('0.54 Glyph Ratio Test Result:', JSON.stringify(evalResult.result.value, null, 2));

    ws.close();
  } finally {
    edge.kill();
  }
}

main().catch(console.error);
