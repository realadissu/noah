import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { parseSng } from '../src/lib/utils/sngParser.ts';

const dir = 'Z:/Users/wolfgangmeincke/Documents/SongBeamer/Songs';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.sng'));

const allLines = [];
for (const file of files) {
  try {
    const bytes = fs.readFileSync(path.join(dir, file));
    const song = parseSng(new Uint8Array(bytes), file);
    for (const slide of song.slides) {
      for (const line of slide.lines) {
        const text = line.tokens.filter(t => t.kind !== 'Chord').map(t => t.text).join('').trim();
        if (text.length > 0) {
          allLines.push({ file, text, len: text.length });
        }
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

    const evalResult = await send('Runtime.evaluate', {
      expression: `(() => {
        const lines = ${JSON.stringify(allLines)};
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.font = 'bold 100px sans-serif';

        let maxRatio = 0;
        let maxLineInfo = null;
        let sumRatio = 0;
        let count = 0;

        for (const item of lines) {
          const width = ctx.measureText(item.text).width;
          const ratio = width / 100 / item.len;
          sumRatio += ratio;
          count++;
          if (ratio > maxRatio) {
            maxRatio = ratio;
            maxLineInfo = { ...item, width, ratio };
          }
        }

        return {
          totalLines: count,
          avgRatio: sumRatio / count,
          maxRatio,
          maxLineInfo
        };
      })()`,
      returnByValue: true
    });

    console.log('Library Font Metrics Result:', JSON.stringify(evalResult.result.value, null, 2));

    ws.close();
  } finally {
    edge.kill();
  }
}

main().catch(console.error);
