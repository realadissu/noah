import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const dir = 'Z:/Users/wolfgangmeincke/Documents/SongBeamer/Songs';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.sng'));

// Enhanced parser supporting -- split
function parseSngTextWithDoubleDash(content, fileName) {
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const slideBlocks = [];
  let currentSlideLines = [];
  let inHeader = true;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (inHeader) {
      if (trimmed === '---') {
        inHeader = false;
        continue;
      }
      if (trimmed.startsWith('#')) continue;
      if (trimmed.length > 0) {
        inHeader = false;
        currentSlideLines.push(rawLine);
      }
    } else {
      if (trimmed === '---' || trimmed === '--') {
        if (currentSlideLines.length > 0) {
          slideBlocks.push({ lines: [...currentSlideLines], isContinuation: trimmed === '--' });
          currentSlideLines = [];
        }
      } else {
        currentSlideLines.push(rawLine);
      }
    }
  }

  if (currentSlideLines.length > 0) {
    slideBlocks.push({ lines: currentSlideLines, isContinuation: false });
  }

  const slides = [];
  let lastLabel = 'Slide 1';

  for (let idx = 0; idx < slideBlocks.length; idx++) {
    const block = slideBlocks[idx];
    let textLines = block.lines;

    // Clean empty lines
    while (textLines.length > 0 && textLines[0].trim().length === 0) textLines.shift();
    while (textLines.length > 0 && textLines[textLines.length - 1].trim().length === 0) textLines.pop();
    if (textLines.length === 0) continue;

    const firstLine = textLines[0].trim();
    let label = '';

    // Check section header
    if (/^(refrain|chorus)/i.test(firstLine)) {
      label = 'Refrain';
      textLines = textLines.slice(1);
    } else if (/^(?:vers|verse|strophe)\s*(\d+)?/i.test(firstLine)) {
      const match = firstLine.match(/^(?:vers|verse|strophe)\s*(\d+)?/i);
      label = match[1] ? `Vers ${match[1]}` : 'Vers 1';
      textLines = textLines.slice(1);
    } else if (/^bridge/i.test(firstLine)) {
      label = 'Bridge';
      textLines = textLines.slice(1);
    } else if (block.isContinuation) {
      label = lastLabel;
    } else {
      label = `Slide ${idx + 1}`;
    }

    lastLabel = label;

    // Clean empty lines after header removal
    while (textLines.length > 0 && textLines[0].trim().length === 0) textLines.shift();
    while (textLines.length > 0 && textLines[textLines.length - 1].trim().length === 0) textLines.pop();
    if (textLines.length === 0) continue;

    // Audience lines (strip chords)
    const audienceLines = textLines.map(line =>
      line.replace(/\[[^\]]*\]/g, '').trim()
    ).filter(l => l.length > 0);

    slides.push({
      label,
      lines: audienceLines
    });
  }

  return { title: fileName.replace(/\.sng$/, ''), slides };
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

    const songs = [];
    for (const f of files) {
      try {
        const content = fs.readFileSync(path.join(dir, f), 'utf8');
        const song = parseSngTextWithDoubleDash(content, f);
        songs.push(song);
      } catch (err) {}
    }

    const testWidths = [260, 450, 1920];

    const result = await send('Runtime.evaluate', {
      expression: `(() => {
        const songs = ${JSON.stringify(songs)};
        const testWidths = ${JSON.stringify(testWidths)};
        const failures = [];
        let totalChecks = 0;

        // Optimized parameters:
        // glyphRatio: 0.54
        // lineFactor: 1.38
        // safeWidthCqw: 88.0
        // safeHeightCqw: 88.0 * aspectFactor
        function calcFs(lines, aspectRatio) {
          const lineCount = lines.length;
          const maxLineLen = Math.max(...lines.map(l => l.length), 1);
          const aspectFactor = aspectRatio === '4:3' ? 0.75 : aspectRatio === '16:10' ? 0.625 : 0.5625;

          const safeWidthCqw = 88.0;
          const safeHeightCqw = 88.0 * aspectFactor;

          const glyphRatio = 0.54;
          const lineFactor = 1.38;

          const bH = safeWidthCqw / (maxLineLen * glyphRatio);
          const bV = safeHeightCqw / (lineCount * lineFactor);
          const optimal = Math.min(bH, bV);
          return Math.min(14.0, Math.max(1.8, optimal));
        }

        for (const song of songs) {
          for (let sIdx = 0; sIdx < song.slides.length; sIdx++) {
            const slide = song.slides[sIdx];
            const lines = slide.lines;
            if (lines.length === 0) continue;

            const fsCqw = calcFs(lines, '16:9');

            for (const width of testWidths) {
              totalChecks++;
              const container = document.createElement('div');
              container.style.cssText = 'width: ' + width + 'px; aspect-ratio: 16/9; container-type: size; position: relative; overflow: hidden;';

              const inner = document.createElement('div');
              inner.style.cssText = 'position: absolute; inset: 0; padding: 5cqh 6cqw; display: flex; align-items: center; justify-content: center; text-align: center; overflow: hidden;';

              const textDiv = document.createElement('div');
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
              const safeInnerWidth = containerRect.width * 0.88;
              const safeInnerHeight = containerRect.height * 0.90;

              const paragraphs = Array.from(textDiv.querySelectorAll('p'));
              let maxTextW = 0;
              let worstLine = '';

              for (const p of paragraphs) {
                const range = document.createRange();
                range.selectNodeContents(p);
                const w = range.getBoundingClientRect().width;
                if (w > maxTextW) {
                  maxTextW = w;
                  worstLine = p.innerText;
                }
              }

              const textDivRect = textDiv.getBoundingClientRect();

              // Check if actual text exceeds safe inner width (with 0.5px tolerance for subpixel rounding)
              if (maxTextW > safeInnerWidth + 0.5) {
                failures.push({
                  song: song.title,
                  slide: sIdx + 1,
                  label: slide.label,
                  width,
                  type: 'horizontal_overflow',
                  maxTextW: maxTextW.toFixed(1),
                  safeInnerWidth: safeInnerWidth.toFixed(1),
                  diff: (maxTextW - safeInnerWidth).toFixed(1),
                  worstLine
                });
              }

              // Check if text div exceeds safe inner height (with 0.5px tolerance)
              if (textDivRect.height > safeInnerHeight + 0.5) {
                failures.push({
                  song: song.title,
                  slide: sIdx + 1,
                  label: slide.label,
                  width,
                  type: 'vertical_overflow',
                  textHeight: textDivRect.height.toFixed(1),
                  safeInnerHeight: safeInnerHeight.toFixed(1),
                  diff: (textDivRect.height - safeInnerHeight).toFixed(1)
                });
              }

              container.remove();
            }
          }
        }

        return {
          totalSongs: songs.length,
          totalChecks,
          failuresCount: failures.length,
          failures
        };
      })()`,
      returnByValue: true
    });

    console.log('Zero Overflow Verification Results:', JSON.stringify(result.result.value, null, 2));

    ws.close();
  } finally {
    edge.kill();
  }
}

main().catch(console.error);
