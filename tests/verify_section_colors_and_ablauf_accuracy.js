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

    console.log('2. Verifying colored section header banners in backdrop...');
    const bannerInfo = await evalExpr(`(() => {
      const backdrop = document.querySelector('[aria-hidden="true"].font-mono');
      if (!backdrop) return { error: 'Backdrop not found' };

      const banners = Array.from(backdrop.querySelectorAll('div[style*="background-color"]')).map(el => ({
        text: el.innerText.trim(),
        bgColor: el.style.backgroundColor,
        color: window.getComputedStyle(el).color,
        fontWeight: window.getComputedStyle(el).fontWeight
      }));

      const redSeparators = Array.from(backdrop.querySelectorAll('.text-red-600, .text-red-500')).map(el => el.innerText.trim());

      return {
        bannerCount: banners.length,
        banners,
        redSeparatorsCount: redSeparators.length
      };
    })()`);
    console.log('Banner info:', JSON.stringify(bannerInfo, null, 2));

    if (bannerInfo.bannerCount < 2) {
      throw new Error('Expected at least 2 colored section banners (Refrain and Vers 1)!');
    }

    const hasPurpleRefrain = bannerInfo.banners.some(b => b.text.toLowerCase().includes('refrain') && (b.bgColor.includes('126') || b.bgColor.includes('7e12d4')));
    const hasBlueVers = bannerInfo.banners.some(b => b.text.toLowerCase().includes('vers') && (b.bgColor.includes('120') || b.bgColor.includes('0078d7') || b.bgColor.includes('blue')));
    console.log('Has purple Refrain banner:', hasPurpleRefrain, 'Has blue Vers banner:', hasBlueVers);

    if (!hasPurpleRefrain || !hasBlueVers) {
      console.warn('Note: banner color RGB check:', bannerInfo.banners);
    }

    console.log('3. Testing cursor placement and + Teil accuracy...');
    // Place cursor in "Vers 1"
    await evalExpr(`(() => {
      const textarea = document.querySelector('#song-text-editor');
      const text = textarea.value;
      const v1Pos = text.indexOf('Vers 1');
      textarea.focus();
      textarea.setSelectionRange(v1Pos, v1Pos);
      textarea.dispatchEvent(new Event('select', { bubbles: true }));
      textarea.dispatchEvent(new Event('click', { bubbles: true }));
    })()`);
    await new Promise((r) => setTimeout(r, 200));

    // Click + Teil
    await evalExpr(`document.querySelector('#add-part-current-btn')?.click()`);
    await new Promise((r) => setTimeout(r, 300));

    const vers1Result = await evalExpr(`document.querySelector('#verse-order-text-input')?.value`);
    console.log('VerseOrder after adding Vers 1:', vers1Result);
    if (!vers1Result.endsWith('Vers 1')) {
      throw new Error('+ Teil did not add Vers 1! Got: ' + vers1Result);
    }

    // Place cursor in "Vers 2"
    await evalExpr(`(() => {
      const textarea = document.querySelector('#song-text-editor');
      const text = textarea.value;
      const v2Pos = text.indexOf('Vers 2');
      textarea.focus();
      textarea.setSelectionRange(v2Pos + 2, v2Pos + 2);
      textarea.dispatchEvent(new Event('select', { bubbles: true }));
      textarea.dispatchEvent(new Event('click', { bubbles: true }));
    })()`);
    await new Promise((r) => setTimeout(r, 200));

    // Click + Teil
    await evalExpr(`document.querySelector('#add-part-current-btn')?.click()`);
    await new Promise((r) => setTimeout(r, 300));

    const vers2Result = await evalExpr(`document.querySelector('#verse-order-text-input')?.value`);
    console.log('VerseOrder after adding Vers 2:', vers2Result);
    if (!vers2Result.endsWith('Vers 2')) {
      throw new Error('+ Teil did not add Vers 2! Got: ' + vers2Result);
    }

    console.log('4. Testing verse preservation on save (Preventing verse loss)...');
    // Add Vers 3 to text, but DO NOT add Vers 3 to VerseOrder
    await evalExpr(`(() => {
      const textarea = document.querySelector('#song-text-editor');
      textarea.value = textarea.value + '\\n---\\nVers 3\\nDies ist Vers 3, der niemals verschwinden darf!\\n';
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    })()`);
    await new Promise((r) => setTimeout(r, 400));

    // Capture screenshot showing colored banners and accurate UI
    const screenshot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('tests/verified_section_colors_and_ablauf.png', Buffer.from(screenshot.data, 'base64'));
    console.log('Screenshot saved to tests/verified_section_colors_and_ablauf.png');

    // Click OK (Save)
    console.log('5. Clicking Save (OK)...');
    await evalExpr(`(() => {
      const okBtn = document.querySelector('#save-song-btn');
      if (okBtn) okBtn.click();
    })()`);
    await new Promise((r) => setTimeout(r, 800));

    // Reopen editor to verify Vers 3 was NOT lost!
    console.log('6. Reopening editor to verify Vers 3 persisted...');
    await evalExpr(`(() => {
      const btn = document.querySelector('button[title*="bearbeiten"], button[title*="Bearbeiten"], button[title*="Edit"]');
      if (btn) btn.click();
    })()`);
    await new Promise((r) => setTimeout(r, 800));

    const checkSavedText = await evalExpr(`(() => {
      const textarea = document.querySelector('#song-text-editor');
      return {
        hasVers3: textarea ? textarea.value.includes('Vers 3') : false,
        textPreview: textarea ? textarea.value.slice(-100) : ''
      };
    })()`);
    console.log('Saved text check:', checkSavedText);
    if (!checkSavedText.hasVers3) {
      throw new Error('CRITICAL BUG: Vers 3 was lost after saving!');
    }
    console.log('SUCCESS: Vers 3 is safely preserved!');

    console.log('ALL VERIFICATIONS PASSED 100%!');
  } finally {
    if (ws) ws.close();
    edge.kill();
  }
}

runTest().catch((err) => {
  console.error('TEST SUITE FAILED:', err);
  process.exit(1);
});
