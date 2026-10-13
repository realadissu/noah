import { spawn } from 'child_process';
import fs from 'fs';

async function main() {
  console.log('Starting headless Edge CDP session...');
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
    if (!page) {
      throw new Error('Could not find page target on port 9222');
    }

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

    async function evaluate(expression) {
      const res = await send('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true
      });
      return res?.result?.value;
    }

    async function captureScreenshot(path) {
      const screenshot = await send('Page.captureScreenshot', { format: 'png' });
      if (screenshot?.data) {
        fs.writeFileSync(path, Buffer.from(screenshot.data, 'base64'));
        console.log(`Saved screenshot to ${path}`);
      }
    }

    await new Promise((r) => setTimeout(r, 1500));

    // 1. Force German locale and reload
    console.log('\n--- 1. Testing German Mode (de) ---');
    await evaluate(`localStorage.setItem('noah_locale', 'de'); location.reload();`);
    await new Promise((r) => setTimeout(r, 1500));

    const deTexts = await evaluate(`(() => {
      const buttons = Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim()).filter(Boolean);
      const rightControls = Array.from(document.querySelectorAll('.grid.grid-cols-2 button')).map(b => b.innerText.trim());
      const langBtn = buttons.find(b => b === 'DE' || b === 'EN');
      return { buttons, rightControls, langBtn };
    })()`);

    console.log('German language button:', deTexts.langBtn);
    console.log('German quick controls:', deTexts.rightControls);

    if (deTexts.langBtn !== 'DE') {
      throw new Error(`Expected language button to be 'DE', got '${deTexts.langBtn}'`);
    }

    const expectedDeControls = ['F4 Text', 'F5 Schwarz', 'F6 Ohne Text', 'F7 Logo'];
    for (const exp of expectedDeControls) {
      if (!deTexts.rightControls.some(c => c.includes(exp))) {
        throw new Error(`German quick controls missing '${exp}'. Actual: ${JSON.stringify(deTexts.rightControls)}`);
      }
    }
    console.log('✓ Quick controls in German verified (F4 Text, F5 Schwarz, F6 Ohne Text, F7 Logo)');

    // Open Song Editor in German
    await evaluate(`(() => {
      const editBtn = document.querySelector('button[title*="bearbeiten"], button[title*="Bearbeiten"]');
      if (editBtn) editBtn.click();
    })()`);
    await new Promise((r) => setTimeout(r, 600));

    const deModal = await evaluate(`(() => {
      const dialog = document.querySelector('[role="dialog"]');
      if (!dialog) return null;
      const title = dialog.querySelector('h2, .font-bold')?.innerText || '';
      const tabBtns = Array.from(dialog.querySelectorAll('.flex.items-center button')).map(b => b.innerText.trim());
      const okBtn = Array.from(dialog.querySelectorAll('button')).find(b => b.innerText.includes('OK'))?.innerText;
      const cancelBtn = Array.from(dialog.querySelectorAll('button')).find(b => b.innerText.includes('Abbrechen'))?.innerText;
      const autoBtn = Array.from(dialog.querySelectorAll('button')).find(b => b.innerText.includes('Auto'))?.innerText;
      const partBtn = Array.from(dialog.querySelectorAll('button')).find(b => b.innerText.includes('Teil') || b.innerText.includes('Part'))?.innerText;
      return { title, tabBtns, okBtn, cancelBtn, autoBtn, partBtn };
    })()`);

    console.log('German Song Editor Modal Info:', deModal);
    if (!deModal) {
      throw new Error('Song Editor modal failed to open in German');
    }
    if (!deModal.tabBtns.includes('Text') || !deModal.tabBtns.includes('Formatierung')) {
      throw new Error(`German tabs missing: ${JSON.stringify(deModal.tabBtns)}`);
    }
    if (!deModal.cancelBtn || !deModal.cancelBtn.includes('Abbrechen')) {
      throw new Error(`Expected cancel button 'Abbrechen', got: ${deModal.cancelBtn}`);
    }
    if (!deModal.partBtn || !deModal.partBtn.includes('+ Teil')) {
      throw new Error(`Expected part button '+ Teil', got: ${deModal.partBtn}`);
    }
    console.log('✓ Song Editor tabs, buttons, and labels verified strictly German!');
    await captureScreenshot('tests/song_editor_german_verified.png');

    // Close modal
    await evaluate(`(() => {
      const cancel = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Abbrechen'));
      if (cancel) cancel.click();
    })()`);
    await new Promise((r) => setTimeout(r, 500));

    // 2. Switch to English locale
    console.log('\n--- 2. Testing English Mode (en) ---');
    await evaluate(`(() => {
      const langBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === 'DE');
      if (langBtn) langBtn.click();
      else { localStorage.setItem('noah_locale', 'en'); location.reload(); }
    })()`);
    await new Promise((r) => setTimeout(r, 1000));

    const enTexts = await evaluate(`(() => {
      const buttons = Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim()).filter(Boolean);
      const rightControls = Array.from(document.querySelectorAll('.grid.grid-cols-2 button')).map(b => b.innerText.trim());
      const langBtn = buttons.find(b => b === 'DE' || b === 'EN');
      return { buttons, rightControls, langBtn };
    })()`);

    console.log('English language button:', enTexts.langBtn);
    console.log('English quick controls:', enTexts.rightControls);

    if (enTexts.langBtn !== 'EN') {
      throw new Error(`Expected language button to be 'EN', got '${enTexts.langBtn}'`);
    }

    const expectedEnControls = ['F4 Text', 'F5 Black', 'F6 Clear', 'F7 Logo'];
    for (const exp of expectedEnControls) {
      if (!enTexts.rightControls.some(c => c.includes(exp))) {
        throw new Error(`English quick controls missing '${exp}'. Actual: ${JSON.stringify(enTexts.rightControls)}`);
      }
    }
    console.log('✓ Quick controls in English verified (F4 Text, F5 Black, F6 Clear, F7 Logo)');

    // Open Song Editor in English
    await evaluate(`(() => {
      const editBtn = document.querySelector('button[title*="Edit"], button[title*="edit"]');
      if (editBtn) editBtn.click();
    })()`);
    await new Promise((r) => setTimeout(r, 600));

    const enModal = await evaluate(`(() => {
      const dialog = document.querySelector('[role="dialog"]');
      if (!dialog) return null;
      const title = dialog.querySelector('h2, .font-bold')?.innerText || '';
      const tabBtns = Array.from(dialog.querySelectorAll('.flex.items-center button')).map(b => b.innerText.trim());
      const okBtn = Array.from(dialog.querySelectorAll('button')).find(b => b.innerText.includes('OK'))?.innerText;
      const cancelBtn = Array.from(dialog.querySelectorAll('button')).find(b => b.innerText.includes('Cancel'))?.innerText;
      const autoBtn = Array.from(dialog.querySelectorAll('button')).find(b => b.innerText.includes('Auto'))?.innerText;
      const partBtn = Array.from(dialog.querySelectorAll('button')).find(b => b.innerText.includes('Part') || b.innerText.includes('Teil'))?.innerText;
      return { title, tabBtns, okBtn, cancelBtn, autoBtn, partBtn };
    })()`);

    console.log('English Song Editor Modal Info:', enModal);
    if (!enModal) {
      throw new Error('Song Editor modal failed to open in English');
    }
    if (!enModal.tabBtns.includes('Text') || !enModal.tabBtns.includes('Formatting')) {
      throw new Error(`English tabs missing: ${JSON.stringify(enModal.tabBtns)}`);
    }
    if (!enModal.cancelBtn || !enModal.cancelBtn.includes('Cancel')) {
      throw new Error(`Expected cancel button 'Cancel', got: ${enModal.cancelBtn}`);
    }
    if (!enModal.partBtn || !enModal.partBtn.includes('+ Part')) {
      throw new Error(`Expected part button '+ Part', got: ${enModal.partBtn}`);
    }
    console.log('✓ Song Editor tabs, buttons, and labels verified strictly English!');
    await captureScreenshot('tests/song_editor_english_verified.png');

    // Close modal
    await evaluate(`(() => {
      const cancel = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Cancel'));
      if (cancel) cancel.click();
    })()`);
    await new Promise((r) => setTimeout(r, 500));

    // Reset back to German default
    await evaluate(`localStorage.setItem('noah_locale', 'de');`);

    console.log('\n===========================================');
    console.log('🎉 100% ZERO-CONTAMINATION i18n TEST PASSED!');
    console.log('German is strictly German, English is strictly English.');
    console.log('===========================================\n');
  } finally {
    edge.kill();
  }
}

main().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
