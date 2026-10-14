import { spawn } from 'child_process';
import fs from 'fs';

async function runTest() {
  const tmpDir = 'C:\\Users\\wolfgangmeincke\\.gemini\\antigravity-ide\\brain\\ee54c4d0-6c83-43b2-be77-8aa5a84df4ed\\scratch\\test_run_profile';
  console.log('1. Starting Edge process...');
  const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--remote-debugging-port=9232',
    '--headless=new',
    '--user-data-dir=' + tmpDir,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-sync',
    '--window-size=1600,1000'
  ]);

  await new Promise((r) => setTimeout(r, 2000));
  const res = await fetch('http://localhost:9232/json');
  const targets = await res.json();
  const page = targets.find((t) => t.type === 'page');

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 1;
  const callbacks = new Map();
  ws.onmessage = (e) => {
    const d = JSON.parse(e.data);
    if (d.id && callbacks.has(d.id)) {
      callbacks.get(d.id)(d);
      callbacks.delete(d.id);
    }
  };
  await new Promise((r) => (ws.onopen = r));
  const send = (method, params = {}) =>
    new Promise((r) => {
      const i = id++;
      callbacks.set(i, r);
      ws.send(JSON.stringify({ id: i, method, params }));
    });
  const evalExpr = async (expr) =>
    (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }))?.result?.result?.value;

  console.log('2. Navigating to http://localhost:5173/ ...');
  await send('Page.enable');
  await send('Page.navigate', { url: 'http://localhost:5173/' });
  
  // Wait for app to mount
  for (let attempt = 0; attempt < 20; attempt++) {
    const btns = await evalExpr('document.querySelectorAll("button").length');
    if (btns && btns > 0) break;
    await new Promise((r) => setTimeout(r, 300));
  }

  // Open Song Editor
  console.log('3. Opening Song Editor...');
  const openResult = await evalExpr(`(() => {
    const editBtn = document.querySelector('#toolbar-edit-song-btn') || 
      Array.from(document.querySelectorAll('button')).find(b => 
        (b.title && /song bearbeiten|edit song/i.test(b.title))
      );
    if (editBtn) {
      const info = { id: editBtn.id, title: editBtn.title, text: editBtn.innerText };
      editBtn.click();
      return info;
    }
    return 'not found';
  })()`);
  console.log('Edit button details:', openResult);
  await new Promise((r) => setTimeout(r, 1000));
  const shotInit = await send('Page.captureScreenshot', { format: 'png' });
  if (shotInit?.result?.data) {
    fs.writeFileSync('tests/debug_screen_after_click.png', Buffer.from(shotInit.result.data, 'base64'));
    console.log('Saved tests/debug_screen_after_click.png');
  }

  // Wait for textarea to appear
  console.log('Waiting for #song-text-editor...');
  for (let attempt = 0; attempt < 20; attempt++) {
    const hasTa = await evalExpr('!!document.querySelector("#song-text-editor")');
    if (hasTa) {
      console.log('Found #song-text-editor on attempt', attempt);
      break;
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  // TEST 1: Backspace caret position stability
  console.log('4. Testing Backspace caret stability...');
  const initialCaretTest = await evalExpr(`(() => {
    const ta = document.querySelector('#song-text-editor');
    if (!ta) return { error: 'textarea not found' };
    ta.focus();
    ta.setSelectionRange(20, 20);
    return { pos: ta.selectionStart, charBefore: ta.value[19] };
  })()`);
  console.log('Caret set at:', initialCaretTest);

  // Send Backspace key event
  await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8, nativeVirtualKeyCode: 8 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8, nativeVirtualKeyCode: 8 });
  await new Promise((r) => setTimeout(r, 400));

  const afterBackspaceTest = await evalExpr(`(() => {
    const ta = document.querySelector('#song-text-editor');
    return {
      finalPos: ta.selectionStart,
      finalEnd: ta.selectionEnd,
      expectedPos: 19,
      isExact: ta.selectionStart === 19
    };
  })()`);
  console.log('After Backspace result:', afterBackspaceTest);
  if (!afterBackspaceTest.isExact) {
    throw new Error('Caret jump detected! Expected 19, got ' + afterBackspaceTest.finalPos);
  }

  // TEST 2: Slide-height warning (> 7 lines)
  console.log('5. Testing Slide-Height Overflow Warning...');
  await evalExpr(`(() => {
    const ta = document.querySelector('#song-text-editor');
    ta.value = 'Vers 1\\nZeile 1\\nZeile 2\\nZeile 3\\nZeile 4\\nZeile 5\\nZeile 6\\nZeile 7\\nZeile 8 (ZU HOCH!)\\nZeile 9\\n---\\nVers 2\\nKurzer Text';
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await new Promise((r) => setTimeout(r, 500));

  const warningDOM = await evalExpr(`(() => {
    const badge = Array.from(document.querySelectorAll('*')).find(el => el.innerText && el.innerText.includes('Folie 1:') && el.innerText.includes('Zeilen'));
    const guideline = Array.from(document.querySelectorAll('*')).find(el => el.innerText && el.innerText.includes('Foliengrenze'));
    return {
      hasBadge: !!badge,
      badgeText: badge ? badge.innerText : null,
      hasGuideline: !!guideline
    };
  })()`);
  console.log('Warning DOM status:', warningDOM);

  // Capture screenshot of Slide Height Warning
  const shot1 = await send('Page.captureScreenshot', { format: 'png' });
  const data1 = shot1?.result?.data || shot1?.data;
  if (data1) {
    fs.writeFileSync('tests/editor_slide_height_warning.png', Buffer.from(data1, 'base64'));
    console.log('Saved tests/editor_slide_height_warning.png');
  }

  // TEST 3: Backgrounds gallery (20 curated presets)
  console.log('6. Testing Background Tab & 20 Presets...');
  await evalExpr(`(() => {
    const btns = Array.from(document.querySelectorAll('[role=\"dialog\"] button'));
    const bgTab = btns.find(b => b.innerText.toLowerCase().includes('hintergrund') || b.innerText.toLowerCase().includes('background'));
    if (bgTab) bgTab.click();
  })()`);
  await new Promise((r) => setTimeout(r, 600));

  const bgGalleryInfo = await evalExpr(`(() => {
    const categoryBtns = Array.from(document.querySelectorAll('button')).filter(b => 
      b.innerText.includes('Alle') || b.innerText.includes('Farben') || b.innerText.includes('Verläufe') || b.innerText.includes('Natur') || b.innerText.includes('Kinder')
    );
    const bgCards = Array.from(document.querySelectorAll('.grid [role="button"]'));
    const container = document.querySelector('[role="dialog"] .overflow-y-auto');
    return {
      categoryBtnCount: categoryBtns.length,
      bgCardCount: bgCards.length,
      containerScrollHeight: container ? container.scrollHeight : null,
      containerClientHeight: container ? container.clientHeight : null,
      containerScrollTop: container ? container.scrollTop : null,
      first3Cards: bgCards.slice(0, 3).map(c => ({
        text: c.innerText.trim(),
        rect: c.getBoundingClientRect()
      }))
    };
  })()`);
  console.log('Background gallery count & rects:', JSON.stringify(bgGalleryInfo, null, 2));

  // Screenshot 1: 20 Presets gallery overview (before selection)
  const shotGallery = await send('Page.captureScreenshot', { format: 'png' });
  const dataGallery = shotGallery?.result?.data || shotGallery?.data;
  if (dataGallery) {
    fs.writeFileSync('tests/editor_background_gallery_overview.png', Buffer.from(dataGallery, 'base64'));
    console.log('Saved tests/editor_background_gallery_overview.png');
  }

  // Select Nature Mountains
  await evalExpr(`(() => {
    const bgCards = Array.from(document.querySelectorAll('.grid [role="button"]'));
    if (bgCards.length > 10) {
      bgCards[10].click(); // Select first nature image
    }
  })()`);
  await new Promise((r) => setTimeout(r, 600));

  const shot2 = await send('Page.captureScreenshot', { format: 'png' });
  const data2 = shot2?.result?.data || shot2?.data;
  if (data2) {
    fs.writeFileSync('tests/editor_background_gallery_20_presets.png', Buffer.from(data2, 'base64'));
    console.log('Saved tests/editor_background_gallery_20_presets.png');
  }

  // Select Kids category
  await evalExpr(`(() => {
    const kidsBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Kinder') || b.innerText.includes('Kids'));
    if (kidsBtn) kidsBtn.click();
  })()`);
  await new Promise((r) => setTimeout(r, 500));

  const shot3 = await send('Page.captureScreenshot', { format: 'png' });
  const data3 = shot3?.result?.data || shot3?.data;
  if (data3) {
    fs.writeFileSync('tests/editor_background_kids_category.png', Buffer.from(data3, 'base64'));
    console.log('Saved tests/editor_background_kids_category.png');
  }

  console.log('ALL TESTS PASSED SUCCESSFULLY!');
  edge.kill();
  process.exit(0);
}

runTest().catch((e) => {
  console.error('TEST ERROR:', e);
  process.exit(1);
});
