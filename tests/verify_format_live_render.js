import { spawn } from 'child_process';
import fs from 'fs';

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

    if (!page) throw new Error('No active page');

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

    // 1. Open editor
    const openRes = await send('Runtime.evaluate', {
      expression: `(() => {
        const editBtn = document.querySelector('button[title*="bearbeiten"]') ||
                        Array.from(document.querySelectorAll('button')).find(b => b.title.includes('bearbeiten') || b.textContent.includes('bearbeiten'));
        if (editBtn) {
          editBtn.click();
          return 'clicked edit button';
        }
        return 'no edit button found';
      })()`,
      returnByValue: true
    });
    console.log('Open editor action:', openRes.result?.value);

    await new Promise((r) => setTimeout(r, 800));

    // 2. Switch to Formatierung tab
    await send('Runtime.evaluate', {
      expression: `(() => {
        const tabs = Array.from(document.querySelectorAll('button'));
        const fmtTab = tabs.find(b => b.textContent.trim() === 'Formatierung');
        if (fmtTab) fmtTab.click();
      })()`
    });

    await new Promise((r) => setTimeout(r, 800));

    // 3. Enable master check & set custom color (#38bdf8) and left align
    const customRes = await send('Runtime.evaluate', {
      expression: `(() => {
        const masterCheck = document.getElementById('master-use-own-profile');
        if (masterCheck && !masterCheck.checked) {
          masterCheck.click();
        }
        // Query the lang1 color input
        const lang1Inputs = Array.from(document.querySelectorAll('input[type="color"]'));
        // Find Lang1 align left button
        const alignBtns = Array.from(document.querySelectorAll('button')).filter(b => b.title === 'Linksbündig' || b.textContent.trim() === '⇤');
        if (alignBtns.length > 1) {
          alignBtns[1].click(); // second one is Lang1
        }
        return 'configured custom formatting';
      })()`,
      returnByValue: true
    });
    console.log('Custom config action:', customRes.result?.value);

    await new Promise((r) => setTimeout(r, 800));

    // 4. Click OK button to save
    const saveRes = await send('Runtime.evaluate', {
      expression: `(() => {
        const okBtn = document.getElementById('song-editor-ok-btn') || document.getElementById('save-song-btn');
        if (okBtn) {
          okBtn.click();
          return 'clicked OK';
        }
        return 'no OK button';
      })()`,
      returnByValue: true
    });
    console.log('Save action:', saveRes.result?.value);

    await new Promise((r) => setTimeout(r, 1200));

    // 5. Verify SlideDeck rendered lines
    const checkDeck = await send('Runtime.evaluate', {
      expression: `(() => {
        // Query active song format tags
        const pTags = window.presentation?.activeSong?.metadata?.custom_tags || {};
        const elementsWithAlign = Array.from(document.querySelectorAll('[style*="text-align"]'));
        return {
          customTags: pTags,
          alignElementsCount: elementsWithAlign.length,
          sampleStyles: elementsWithAlign.slice(0, 5).map(el => el.getAttribute('style')),
        };
      })()`,
      returnByValue: true
    });
    console.log('SlideDeck verification:', JSON.stringify(checkDeck.result?.value, null, 2));

    // 6. Capture screenshot
    const screenshot = await send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(screenshot.data, 'base64');
    const outPath = 'C:/Users/wolfgangmeincke/.gemini/antigravity-ide/brain/e51cb7cc-c85b-41d8-a26f-9ab32ccafd1a/.tempmediaStorage/format_applied_live_slidedeck.png';
    fs.writeFileSync(outPath, buffer);
    console.log(`Saved screenshot to ${outPath}`);

    ws.close();
  } finally {
    edge.kill();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
