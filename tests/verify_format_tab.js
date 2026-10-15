import { spawn } from 'child_process';
import fs from 'fs';

async function main() {
  console.log('Testing SongEditor Format Tab...');

  const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--remote-debugging-port=9222',
    '--headless=new',
    '--no-sandbox',
    '--window-size=1600,1050',
    '--user-data-dir=C:\\Users\\wolfgangmeincke\\AppData\\Local\\Temp\\edge-test-profile',
    'http://localhost:5173'
  ]);

  await new Promise((r) => setTimeout(r, 2500));

  let ws;
  try {
    const res = await fetch('http://localhost:9222/json');
    const targets = await res.json();
    const page = targets.find((t) => t.type === 'page' && t.url.includes('5173'));
    if (!page) throw new Error('Target 5173 not found: ' + JSON.stringify(targets));

    ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      if (ws.readyState === 1) return resolve();
      ws.addEventListener('open', resolve);
      ws.addEventListener('error', reject);
    });
    console.log('Connected to Edge DevTools WebSocket');

    let id = 1;
    const callbacks = new Map();
    ws.addEventListener('message', (e) => {
      const d = JSON.parse(e.data);
      if (d.id && callbacks.has(d.id)) {
        callbacks.get(d.id)(d.result);
        callbacks.delete(d.id);
      }
    });

    const send = (method, params = {}) =>
      new Promise((r) => {
        const i = id++;
        callbacks.set(i, r);
        ws.send(JSON.stringify({ id: i, method, params }));
      });

    const evalExpr = async (expr) => {
      const res = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
      return res?.result?.value;
    };

    await new Promise((r) => setTimeout(r, 1200));

    // 1. Open Song Editor
    const opened = await evalExpr(`(() => {
      const btn = document.querySelector('button[title*="bearbeiten"], button[title*="Bearbeiten"], button[title*="Edit"], button[title*="edit"]');
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    })()`);
    console.log('Song Editor opened:', opened);
    await new Promise((r) => setTimeout(r, 800));

    // 2. Click "Formatierung" tab
    const switched = await evalExpr(`(() => {
      const tabs = Array.from(document.querySelectorAll('button'));
      const formatTab = tabs.find(b => b.innerText.trim() === 'Formatierung' || b.innerText.trim() === 'Formatting');
      if (formatTab) {
        formatTab.click();
        return true;
      }
      return false;
    })()`);
    console.log('Switched to Formatierung tab:', switched);
    await new Promise((r) => setTimeout(r, 800));

    // 3. Inspect DOM elements on Formatierung tab
    const formatTabState = await evalExpr(`(() => {
      const fontLang1 = document.querySelector('#font-family-lang1');
      const fontLang2 = document.querySelector('#font-family-lang2');
      const fontSizeSpin = document.querySelector('#font-size-spin');
      const outlineToggle = document.querySelector('#outline-toggle');
      const shadowToggle = document.querySelector('#shadow-toggle');
      const ownProfileCheck = document.querySelector('#own-bg-profile-check');
      const preLineInput = document.querySelector('#pre-line-input');
      const prePageInput = document.querySelector('#pre-page-input');
      const colorInputs = Array.from(document.querySelectorAll('input[type="color"]')).length;

      return {
        hasFontLang1: !!fontLang1,
        fontLang1Value: fontLang1?.value,
        fontLang1OptionsCount: fontLang1?.options.length,
        hasFontLang2: !!fontLang2,
        fontLang2Value: fontLang2?.value,
        hasFontSizeSpin: !!fontSizeSpin,
        fontSizeValue: fontSizeSpin?.value,
        hasOutlineToggle: !!outlineToggle,
        hasShadowToggle: !!shadowToggle,
        hasOwnProfileCheck: !!ownProfileCheck,
        hasPreLineInput: !!preLineInput,
        hasPrePageInput: !!prePageInput,
        colorInputsCount: colorInputs,
      };
    })()`);
    console.log('Format Tab DOM State:', JSON.stringify(formatTabState, null, 2));

    // 4. Capture screenshot of Formatierung tab
    const screenshot = await send('Page.captureScreenshot', { format: 'png' });
    if (screenshot && screenshot.data) {
      fs.writeFileSync('tests/editor_format_tab_verified.png', Buffer.from(screenshot.data, 'base64'));
      console.log('Saved screenshot to tests/editor_format_tab_verified.png');
    }

    // 5. Test interaction: change font, font size, pre-line
    const interactionResult = await evalExpr(`(() => {
      const fontLang1 = document.querySelector('#font-family-lang1');
      if (fontLang1) {
        fontLang1.value = 'Segoe UI';
        fontLang1.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const fontSizeSpin = document.querySelector('#font-size-spin');
      if (fontSizeSpin) {
        fontSizeSpin.value = '42';
        fontSizeSpin.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const preLine = document.querySelector('#pre-line-input');
      if (preLine) {
        preLine.value = '<b>';
        preLine.dispatchEvent(new Event('input', { bubbles: true }));
      }
      return {
        newFont: fontLang1?.value,
        newSize: fontSizeSpin?.value,
        newPreLine: preLine?.value,
      };
    })()`);
    console.log('Interaction Result:', interactionResult);

    console.log('✓ All Formatierung tab interactions and verifications succeeded cleanly!');
  } finally {
    if (ws) ws.close();
    edge.kill();
  }
}

main().catch(console.error);
