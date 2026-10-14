import { spawn } from 'child_process';
import fs from 'fs';

async function runTest() {
  console.log('Starting Edge process on port 9222...');
  const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--remote-debugging-port=9222',
    '--headless=new',
    '--window-size=1600,1000',
    'http://localhost:5173'
  ]);

  await new Promise((r) => setTimeout(r, 2000));

  let ws;
  try {
    const res = await fetch('http://localhost:9222/json');
    const targets = await res.json();
    const page = targets.find((t) => t.type === 'page' && t.url.includes('5173'));
    if (!page) throw new Error('No page target found on 5173');

    ws = new WebSocket(page.webSocketDebuggerUrl);
    let id = 1;
    const callbacks = new Map();
    ws.onmessage = (e) => {
      const d = JSON.parse(e.data);
      if (d.id && callbacks.has(d.id)) callbacks.get(d.id)(d.result);
    };
    await new Promise((r) => (ws.onopen = r));
    const send = (method, params = {}) =>
      new Promise((r) => {
        const i = id++;
        callbacks.set(i, r);
        ws.send(JSON.stringify({ id: i, method, params }));
      });
    const evalExpr = async (expr) =>
      (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }))?.result?.value;

    await new Promise((r) => setTimeout(r, 1200));

    console.log('1. Opening Song Editor...');
    await evalExpr(`(() => {
      const btn = document.querySelector('button[title*="bearbeiten"], button[title*="Bearbeiten"], button[title*="Edit"]');
      if (btn) btn.click();
    })()`);
    await new Promise((r) => setTimeout(r, 800));

    // Capture screenshot of Text tab
    const initialTextShot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('tests/editor_text_tab_updated.png', Buffer.from(initialTextShot.data, 'base64'));
    console.log('Saved tests/editor_text_tab_updated.png');

    console.log('2. Checking modal dimensions on Text tab...');
    const getModalSize = async () => {
      return await evalExpr(`(() => {
        const modal = document.querySelector('[role="dialog"] > div');
        if (!modal) return null;
        const rect = modal.getBoundingClientRect();
        return {
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        };
      })()`);
    };

    const textSize = await getModalSize();
    console.log('Text tab modal size:', textSize);
    if (!textSize) throw new Error('Modal not found');

    const tabsToTest = ['format', 'background', 'categories', 'media', 'copyrights'];
    for (const tabName of tabsToTest) {
      console.log('3. Switching to tab: ' + tabName + '...');
      await evalExpr(`(() => {
        const btns = Array.from(document.querySelectorAll('[role="dialog"] button'));
        const tabBtn = btns.find(b => b.innerText.toLowerCase().includes('${tabName}'.toLowerCase()) || b.onclick?.toString().includes('${tabName}'));
        if (tabBtn) tabBtn.click();
      })()`);
      await new Promise((r) => setTimeout(r, 400));

      const tabSize = await getModalSize();
      console.log('Modal size on ' + tabName + ' tab:', tabSize);
      if (Math.abs(tabSize.height - textSize.height) > 4) {
        throw new Error('Modal height changed on tab ' + tabName + '! Expected ~ ' + textSize.height + ', got ' + tabSize.height);
      }
    }

    // Switch back to Text tab
    console.log('4. Switching back to Text tab...');
    await evalExpr(`(() => {
      const btns = Array.from(document.querySelectorAll('[role="dialog"] button'));
      const textBtn = btns.find(b => b.innerText.trim() === 'Text');
      if (textBtn) textBtn.click();
    })()`);
    await new Promise((r) => setTimeout(r, 500));

    const finalShot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('tests/final_verified_editor.png', Buffer.from(finalShot.data, 'base64'));
    console.log('Saved tests/final_verified_editor.png');

    console.log('5. Verifying absence of Marke, ---Folie, --Umbruch, and presence of authentic guidelines...');
    const domCheck = await evalExpr(`(() => {
      const textEditor = document.querySelector('#song-text-editor');
      const dialog = document.querySelector('[role="dialog"]');
      const textContent = dialog.innerText;
      return {
        hasMarke: textContent.includes('Marke'),
        hasSlideBreakBtn: textContent.includes('--- Folie'),
        hasLineBreakBtn: textContent.includes('-- Umbruch'),
        hasEigenerTeil: textContent.includes('Eigener Teil'),
        hasVerticalGuide: !!dialog.querySelector('[style*="50ch"]'),
        hasEndOfTextMark: !!dialog.querySelector('.border-red-600')
      };
    })()`);
    console.log('DOM check results:', domCheck);

    if (domCheck.hasMarke) throw new Error('Marke button is still present!');
    if (domCheck.hasSlideBreakBtn) throw new Error('--- Folie button is still present!');
    if (domCheck.hasLineBreakBtn) throw new Error('-- Umbruch button is still present!');
    if (domCheck.hasEigenerTeil) throw new Error('Eigener Teil is still present!');
    if (!domCheck.hasVerticalGuide) throw new Error('Vertical guideline (50ch) should be present!');
    if (!domCheck.hasEndOfTextMark) throw new Error('EndOfTextMark (red line) should be present!');

    console.log('ALL MODAL REQUIREMENTS VERIFIED PERFECTLY!');
  } finally {
    if (ws) ws.close();
    edge.kill();
  }
}

runTest().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
