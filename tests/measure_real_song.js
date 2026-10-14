import { spawn } from 'child_process';
import fs from 'fs';
import { parseSng } from '../src/lib/utils/sngParser.ts';
import { calculateSlideFontSize, getAudienceLines } from '../src/lib/utils/slideTypography.ts';

const sngBytes = fs.readFileSync('Z:/Users/wolfgangmeincke/Documents/SongBeamer/Songs/Die auf den Herrn harren.sng');
const song = parseSng(new Uint8Array(sngBytes), 'Die auf den Herrn harren.sng');

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

    // Test measuring each slide of "Die auf den Herrn harren"
    const evalResult = await send('Runtime.evaluate', {
      expression: `(() => {
        const slides = ${JSON.stringify(song.slides)};

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        return slides.map((s, idx) => {
          const lines = s.lines.map(l => l.tokens.filter(t => t.kind !== 'Chord').map(t => t.text).join(''));
          const maxLineLen = Math.max(...lines.map(l => l.trim().length), 1);
          // Test on 1000px wide container (1cqw = 10px)
          const containerWidth = 1000;
          const containerHeight = 1000 * 9 / 16; // 562.5px

          // Let's test at 7.49cqw -> 74.9px
          // Or let's test what font size is calculated
          const safeWidth = containerWidth * 0.88; // 880px (6% margin each side)
          const safeHeight = containerHeight * 0.90; // 506.25px (5% margin top/bottom)

          return lines.map(line => {
            ctx.font = 'bold 100px sans-serif';
            const widthAt100 = ctx.measureText(line).width;
            return {
              slideIdx: idx + 1,
              line,
              len: line.length,
              widthAt100,
              emRatio: widthAt100 / 100 / line.length
            };
          });
        });
      })()`,
      returnByValue: true
    });

    console.log('Measurement:', JSON.stringify(evalResult.result.value, null, 2));

    ws.close();
  } finally {
    edge.kill();
  }
}

main().catch(console.error);
