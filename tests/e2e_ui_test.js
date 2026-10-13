import { spawn } from 'child_process';
import assert from 'assert';

async function runE2eTests() {
  console.log('--- Starting Comprehensive E2E UI Typography & WYSIWYG Parity Test Suite ---');

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
    assert(page, 'Edge page target on localhost:5173 must exist');

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

    // Wait for Svelte rendering
    await new Promise((r) => setTimeout(r, 1500));

    // TEST 1: Check initial slide (Refrain) metrics on Col 2 and Col 3
    console.log('Running Test 1: Verifying Col 2 and Col 3 live DOM typography metrics...');
    const test1Res = await send('Runtime.evaluate', {
      expression: `(() => {
        // Col 2: first slide thumbnail card
        const col2Card = document.querySelector('section .grid > div:nth-child(1) [style*="aspect-ratio"]');
        const col2Inner = col2Card ? col2Card.querySelector('div') : null;
        const col2Text = col2Inner ? col2Inner.querySelector('div') : null;
        const col2P = col2Text ? Array.from(col2Text.querySelectorAll('p')) : [];

        // Col 3: audience live preview card
        const col3Card = document.querySelector('aside [style*="aspect-ratio"]');
        const col3Inner = col3Card ? col3Card.querySelector('div') : null;
        const col3Text = col3Inner ? col3Inner.querySelector('div') : null;
        const col3P = col3Text ? Array.from(col3Text.querySelectorAll('p')) : [];

        const getMetrics = (card, inner, text, paragraphs) => {
          if (!card || !inner || !text) return null;
          const cr = card.getBoundingClientRect();
          const tr = text.getBoundingClientRect();
          const fs = parseFloat(window.getComputedStyle(text).fontSize);
          const cs = window.getComputedStyle(inner);
          const padL = parseFloat(cs.paddingLeft);
          const padT = parseFloat(cs.paddingTop);

          const lines = paragraphs.map(p => ({
            text: p.innerText,
            whiteSpace: window.getComputedStyle(p).whiteSpace,
            overflow: window.getComputedStyle(p).overflow,
            scrollWidth: p.scrollWidth,
            clientWidth: p.clientWidth,
            isOverflowing: p.scrollWidth > p.clientWidth + 2
          }));

          return {
            width: cr.width,
            height: cr.height,
            fontSizePx: fs,
            fontSizeRatio: fs / cr.width,
            paddingLeftRatio: padL / cr.width,
            paddingTopRatio: padT / cr.height,
            textHeightRatio: tr.height / cr.height,
            lines
          };
        };

        return {
          col2: getMetrics(col2Card, col2Inner, col2Text, col2P),
          col3: getMetrics(col3Card, col3Inner, col3Text, col3P)
        };
      })()`,
      returnByValue: true
    });

    const t1 = test1Res.result.value;
    console.log('Col 2 Metrics:', {
      width: t1.col2.width,
      height: t1.col2.height,
      fontSizePx: t1.col2.fontSizePx,
      fontSizeRatio: t1.col2.fontSizeRatio.toFixed(4),
      linesCount: t1.col2.lines.length
    });
    console.log('Col 3 Metrics:', {
      width: t1.col3.width,
      height: t1.col3.height,
      fontSizePx: t1.col3.fontSizePx,
      fontSizeRatio: t1.col3.fontSizeRatio.toFixed(4),
      linesCount: t1.col3.lines.length
    });

    // Assertions for Test 1
    assert(t1.col2.fontSizePx >= 15, `Col 2 font size must be legible (>=15px), got ${t1.col2.fontSizePx}px`);
    assert(t1.col3.fontSizePx >= 10, `Col 3 font size must be legible (>=10px), got ${t1.col3.fontSizePx}px`);
    assert.strictEqual(
      t1.col2.fontSizeRatio.toFixed(3),
      t1.col3.fontSizeRatio.toFixed(3),
      `Font-size-to-card-width ratio MUST match between Col2 (${t1.col2.fontSizeRatio.toFixed(4)}) and Col3 (${t1.col3.fontSizeRatio.toFixed(4)})!`
    );
    assert.strictEqual(
      t1.col2.paddingLeftRatio.toFixed(2),
      '0.06',
      'Horizontal safe margin must be exactly 6%'
    );
    assert.strictEqual(
      t1.col2.paddingTopRatio.toFixed(2),
      '0.05',
      'Vertical safe margin must be exactly 5%'
    );
    assert.strictEqual(t1.col2.lines.length, 4, 'Refrain slide must have 4 lines');
    assert.strictEqual(t1.col3.lines.length, 4, 'Col 3 preview must have 4 lines');

    // Strict SNG line break verification (No software auto-wrapping)
    for (const line of t1.col2.lines) {
      assert.strictEqual(line.whiteSpace, 'nowrap', 'Each line must have white-space: nowrap');
      assert(!line.isOverflowing, `Line "${line.text}" must not overflow`);
    }
    for (const line of t1.col3.lines) {
      assert.strictEqual(line.whiteSpace, 'nowrap', 'Each line must have white-space: nowrap');
      assert(!line.isOverflowing, `Line "${line.text}" must not overflow`);
    }
    console.log('✓ Test 1 PASSED: Strict SNG line breaks, legibility, and 1:1 mathematical ratio parity verified!');

    // TEST 2: Slide switching interactive test
    console.log('Running Test 2: Testing slide switching to Vers 1 and verifying live preview sync...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const slide2Btn = document.querySelectorAll('section .grid > div')[1];
        if (slide2Btn) slide2Btn.click();
      })()`
    });

    await new Promise((r) => setTimeout(r, 500));

    const test2Res = await send('Runtime.evaluate', {
      expression: `(() => {
        const col3Card = document.querySelector('aside [style*="aspect-ratio"]');
        const col3Inner = col3Card ? col3Card.querySelector('div') : null;
        const col3Text = col3Inner ? col3Inner.querySelector('div') : null;
        const col3P = col3Text ? Array.from(col3Text.querySelectorAll('p')) : [];

        return {
          firstLine: col3P[0] ? col3P[0].innerText : '',
          lineCount: col3P.length,
          fontSizePx: col3Text ? parseFloat(window.getComputedStyle(col3Text).fontSize) : 0,
          cardWidth: col3Card ? col3Card.getBoundingClientRect().width : 0
        };
      })()`,
      returnByValue: true
    });

    const t2 = test2Res.result.value;
    console.log('Slide 2 Preview in Col 3:', t2);
    assert(t2.firstLine.includes('Der dir alle deine Sünden vergibt'), 'Preview must show Slide 2 lyrics');
    assert.strictEqual(t2.lineCount, 4, 'Slide 2 must have 4 lines');
    assert(t2.fontSizePx >= 11, `Slide 2 font size in Col 3 must be >=11px, got ${t2.fontSizePx}px`);
    console.log('✓ Test 2 PASSED: Slide selection updates Audience preview with perfect sync and sizing!');

    // TEST 3: Slide switching to Vers 2
    console.log('Running Test 3: Testing slide switching to Vers 2...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const slide3Btn = document.querySelectorAll('section .grid > div')[2];
        if (slide3Btn) slide3Btn.click();
      })()`
    });

    await new Promise((r) => setTimeout(r, 500));

    const test3Res = await send('Runtime.evaluate', {
      expression: `(() => {
        const col3Card = document.querySelector('aside [style*="aspect-ratio"]');
        const col3Inner = col3Card ? col3Card.querySelector('div') : null;
        const col3Text = col3Inner ? col3Inner.querySelector('div') : null;
        const col3P = col3Text ? Array.from(col3Text.querySelectorAll('p')) : [];

        return {
          firstLine: col3P[0] ? col3P[0].innerText : '',
          lineCount: col3P.length,
          fontSizePx: col3Text ? parseFloat(window.getComputedStyle(col3Text).fontSize) : 0,
          cardWidth: col3Card ? col3Card.getBoundingClientRect().width : 0
        };
      })()`,
      returnByValue: true
    });

    const t3 = test3Res.result.value;
    console.log('Slide 3 Preview in Col 3:', t3);
    assert(t3.firstLine.includes('Der deinen Mund fröhlich macht'), 'Preview must show Slide 3 lyrics');
    assert.strictEqual(t3.lineCount, 4, 'Slide 3 must have 4 lines');
    assert(t3.fontSizePx >= 11, `Slide 3 font size in Col 3 must be >=11px, got ${t3.fontSizePx}px`);
    console.log('✓ Test 3 PASSED: Slide 3 preview verified!');

    console.log('=== ALL E2E UI TESTS PASSED SUCCESSFULLY! ===');
    ws.close();
  } finally {
    edge.kill();
  }
}

runE2eTests().catch((err) => {
  console.error('E2E TEST FAILURE:', err);
  process.exit(1);
});
