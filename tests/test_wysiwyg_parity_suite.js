import { spawn } from 'child_process';
import assert from 'assert';

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

    // Test the proposed layout architecture in DOM
    const evalResult = await send('Runtime.evaluate', {
      expression: `(() => {
        // Setup 3 test viewports:
        // 1. Column 2 Card (450px x 253px)
        // 2. Column 3 Preview (260px x 146px)
        // 3. Beamer (1920px x 1080px)

        function createSlideDom(width, fontSizeCqw) {
          const wrapper = document.createElement('div');
          wrapper.style.cssText = 'width: ' + width + 'px; aspect-ratio: 16/9; container-type: size; position: relative; overflow: hidden; background: black;';

          const inner = document.createElement('div');
          inner.style.cssText = 'position: absolute; inset: 0; padding: 5cqh 6cqw; display: flex; align-items: center; justify-content: center; text-align: center;';

          const textContainer = document.createElement('div');
          textContainer.style.cssText = 'font-size: ' + fontSizeCqw + '; line-height: 1.35; width: 100%; font-weight: bold; color: white;';

          const lines = [
            'Lobe den Herrn, meine Seele,',
            'und alles in mir seinen heiligen Namen.',
            'Lobe den Herrn, meine Seele,',
            'und vergiss nicht, was er dir Gutes getan.'
          ];

          lines.forEach(l => {
            const p = document.createElement('p');
            p.style.cssText = 'white-space: nowrap; overflow: visible;';
            p.innerText = l;
            textContainer.appendChild(p);
          });

          inner.appendChild(textContainer);
          wrapper.appendChild(inner);
          document.body.appendChild(wrapper);

          const r = wrapper.getBoundingClientRect();
          const pRect = textContainer.querySelector('p').getBoundingClientRect();
          const tRect = textContainer.getBoundingClientRect();
          const fs = parseFloat(window.getComputedStyle(textContainer).fontSize);
          const padL = parseFloat(window.getComputedStyle(inner).paddingLeft);
          const padT = parseFloat(window.getComputedStyle(inner).paddingTop);

          wrapper.remove();

          return {
            containerWidth: r.width,
            containerHeight: r.height,
            fontSizePx: fs,
            fontSizeRatio: fs / r.width,
            paddingLeftRatio: padL / r.width,
            paddingTopRatio: padT / r.height,
            textBlockHeightRatio: tRect.height / r.height,
            longestLineWidthRatio: pRect.width / r.width,
          };
        }

        const cqw = '5.0cqw';
        return {
          col2: createSlideDom(450, cqw),
          col3: createSlideDom(260, cqw),
          beamer: createSlideDom(1920, cqw)
        };
      })()`,
      returnByValue: true
    });

    const m = evalResult.result.value;
    console.log('Parity Test Metrics:', JSON.stringify(m, null, 2));

    // Assert 1:1 mathematical proportionality
    assert.strictEqual(m.col2.fontSizeRatio.toFixed(4), m.col3.fontSizeRatio.toFixed(4), 'Col2 and Col3 font size ratio must match!');
    assert.strictEqual(m.col2.fontSizeRatio.toFixed(4), m.beamer.fontSizeRatio.toFixed(4), 'Col2 and Beamer font size ratio must match!');
    assert.strictEqual(m.col2.paddingLeftRatio.toFixed(4), m.beamer.paddingLeftRatio.toFixed(4), 'Padding left ratio must match!');
    assert.strictEqual(m.col2.paddingTopRatio.toFixed(4), m.beamer.paddingTopRatio.toFixed(4), 'Padding top ratio must match!');
    assert.strictEqual(m.col2.textBlockHeightRatio.toFixed(3), m.beamer.textBlockHeightRatio.toFixed(3), 'Text block height ratio must match!');

    console.log('✓ All 5 WYSIWYG mathematical parity assertions PASSED!');

    ws.close();
  } finally {
    edge.kill();
  }
}

main().catch(console.error);
