import { spawn } from 'child_process';
import fs from 'fs';
import assert from 'node:assert';

async function runTest() {
  const tmpDir = 'C:\\Users\\wolfgangmeincke\\.gemini\\antigravity-ide\\brain\\e51cb7cc-c85b-41d8-a26f-9ab32ccafd1a\\scratch\\test_run_universal_search';
  console.log('1. Starting Edge process...');
  const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--remote-debugging-port=9238',
    '--headless=new',
    '--user-data-dir=' + tmpDir,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-sync',
    '--window-size=1600,1000',
    'http://localhost:5173/'
  ]);

  try {
    await new Promise((r) => setTimeout(r, 2000));
    const res = await fetch('http://localhost:9238/json');
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
    await new Promise((r) => setTimeout(r, 2500));

    // Wait for app to mount
    for (let attempt = 0; attempt < 30; attempt++) {
      const btns = await evalExpr('document.querySelectorAll("button").length');
      if (btns && btns > 0) break;
      await new Promise((r) => setTimeout(r, 300));
    }

    // -----------------------------------------------------------------
    // TEST 1: Open Search Dialog
    // -----------------------------------------------------------------
    console.log('3. Testing Search Modal Opening...');
    await evalExpr(`document.querySelector('#sb-btn-search-song').click()`);
    await new Promise((r) => setTimeout(r, 500));

    const modalMetrics = await evalExpr(`(() => {
      const modal = document.querySelector('#sb-song-search-modal');
      const dialog = modal ? modal.querySelector('div[style*="width: 880px"]') || modal.firstElementChild : null;
      const rect = dialog ? dialog.getBoundingClientRect() : null;
      const tabAll = document.querySelector('#sb-tab-all');
      const tabLocal = document.querySelector('#sb-tab-local');
      const tabSongSelect = document.querySelector('#sb-tab-songselect');
      const resultsText = document.querySelector('#sb-song-search-results-list')?.innerText;
      
      return {
        isOpen: !!modal,
        width: rect ? Math.round(rect.width) : 0,
        height: rect ? Math.round(rect.height) : 0,
        hasTabAll: !!tabAll,
        hasTabLocal: !!tabLocal,
        hasTabSongSelect: !!tabSongSelect,
        resultsText: resultsText || ''
      };
    })()`);
    console.log('  Modal Metrics:', modalMetrics);
    assert.strictEqual(modalMetrics.isOpen, true, 'Search modal must be open');
    assert.strictEqual(modalMetrics.width, 880, 'Modal dialog width must be fixed 880px');
    assert.strictEqual(modalMetrics.height, 580, 'Modal dialog height must be fixed 580px');
    assert.strictEqual(modalMetrics.hasTabAll, true, 'Must have Alle tab for unified search');
    assert.strictEqual(modalMetrics.hasTabLocal, true, 'Must have Lokal tab');
    assert.strictEqual(modalMetrics.hasTabSongSelect, true, 'Must have SongSelect tab');
    assert.ok(modalMetrics.resultsText.toLowerCase().includes('mindestens 2 zeichen'), 'Must be initially empty with search prompt');

    // -----------------------------------------------------------------
    // TEST 2: Search for local church songs (e.g. "Stärke" / "staerke" / "Baue")
    // -----------------------------------------------------------------
    console.log('4. Testing Local Song Search ("Stärke")...');
    await evalExpr(`(() => {
      const input = document.querySelector('#sb-song-search-input');
      input.value = 'Stärke';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    })()`);
    // Wait for debounce (250ms) + search
    await new Promise((r) => setTimeout(r, 600));

    const localSearchRes = await evalExpr(`(() => {
      const items = Array.from(document.querySelectorAll('#sb-song-search-results-list [data-search-result-idx]'));
      const previewTitle = document.querySelector('#sb-song-search-preview h3')?.innerText;
      const previewText = document.querySelector('#sb-song-search-preview-text')?.innerText;
      const btnAdd = document.querySelector('#sb-btn-add-schedule');
      const btnEdit = document.querySelector('#sb-btn-edit-song');
      const btnPresent = document.querySelector('#sb-btn-present-live');
      return {
        count: items.length,
        itemTexts: items.map(i => i.innerText),
        previewTitle,
        previewText: (previewText || '').slice(0, 100),
        hasAddBtn: !!btnAdd,
        hasEditBtn: !!btnEdit,
        hasPresentBtn: !!btnPresent
      };
    })()`);
    console.log('  "Stärke" Search Results:', localSearchRes.count, 'items');
    console.log('  First few:', localSearchRes.itemTexts.slice(0, 4));
    console.log('  Preview:', localSearchRes.previewTitle, '-->', localSearchRes.previewText);
    assert.ok(localSearchRes.count >= 1, 'Must find at least 1 song for "Stärke"');
    assert.ok(localSearchRes.itemTexts.some(t => t.includes('Ehre, Macht, und Stärke')), 'Must find "Ehre, Macht, und Stärke"');
    assert.strictEqual(localSearchRes.hasAddBtn, true, 'Must show "In Ablauf einfügen" button for local song');
    assert.strictEqual(localSearchRes.hasEditBtn, true, 'Must show "Lied bearbeiten" button for local song');

    // -----------------------------------------------------------------
    // TEST 3: Search for online worship songs on SongSelect ("Oceans")
    // -----------------------------------------------------------------
    console.log('5. Testing Live SongSelect Search ("Oceans")...');
    await evalExpr(`(() => {
      const input = document.querySelector('#sb-song-search-input');
      input.value = 'Oceans';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    })()`);
    await new Promise((r) => setTimeout(r, 800));

    const oceansSearchRes = await evalExpr(`(() => {
      const items = Array.from(document.querySelectorAll('#sb-song-search-results-list [data-search-result-idx]'));
      const previewTitle = document.querySelector('#sb-song-search-preview h3')?.innerText;
      const previewText = document.querySelector('#sb-song-search-preview-text')?.innerText;
      const btnImport = document.querySelector('#sb-btn-import-ccli');
      return {
        count: items.length,
        itemTexts: items.map(i => i.innerText),
        previewTitle,
        previewText: (previewText || '').slice(0, 100),
        hasImportBtn: !!btnImport
      };
    })()`);
    console.log('  "Oceans" Search Results:', oceansSearchRes.count, 'items');
    console.log('  First few:', oceansSearchRes.itemTexts.slice(0, 3));
    console.log('  Preview:', oceansSearchRes.previewTitle);
    assert.ok(oceansSearchRes.count >= 1, 'Must find live results for "Oceans"');
    assert.ok(oceansSearchRes.itemTexts.some(t => t.includes('Oceans')), 'Must include "Oceans" in results');
    assert.strictEqual(oceansSearchRes.hasImportBtn, true, 'Must show "In Ablauf importieren..." button for CCLI song');

    // -----------------------------------------------------------------
    // TEST 4: Search for any arbitrary song in the database ("Goodness of God")
    // -----------------------------------------------------------------
    console.log('6. Testing Live Arbitrary Song ("Goodness of God")...');
    await evalExpr(`(() => {
      const input = document.querySelector('#sb-song-search-input');
      input.value = 'Goodness of God';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    })()`);
    await new Promise((r) => setTimeout(r, 800));

    const goodnessRes = await evalExpr(`(() => {
      const items = Array.from(document.querySelectorAll('#sb-song-search-results-list [data-search-result-idx]'));
      const previewTitle = document.querySelector('#sb-song-search-preview h3')?.innerText;
      return {
        count: items.length,
        itemTexts: items.map(i => i.innerText),
        previewTitle
      };
    })()`);
    console.log('  "Goodness of God" Search Results:', goodnessRes.count, 'items');
    console.log('  First item:', goodnessRes.itemTexts[0]);
    assert.ok(goodnessRes.count >= 1, 'Must dynamically find results for "Goodness of God" from live CCLI database');

    // -----------------------------------------------------------------
    // TEST 5: Unified Search with both Local & CCLI ("Gott")
    // -----------------------------------------------------------------
    console.log('7. Testing Unified Search ("Gott")...');
    await evalExpr(`(() => {
      const input = document.querySelector('#sb-song-search-input');
      input.value = 'Gott';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    })()`);
    await new Promise((r) => setTimeout(r, 800));

    const gottRes = await evalExpr(`(() => {
      const items = Array.from(document.querySelectorAll('#sb-song-search-results-list [data-search-result-idx]'));
      const tabAllText = document.querySelector('#sb-tab-all')?.innerText;
      const tabLocalText = document.querySelector('#sb-tab-local')?.innerText;
      const tabCcliText = document.querySelector('#sb-tab-songselect')?.innerText;
      return {
        count: items.length,
        itemTexts: items.map(i => i.innerText).slice(0, 6),
        tabAllText,
        tabLocalText,
        tabCcliText
      };
    })()`);
    console.log('  "Gott" Total Results:', gottRes.count);
    console.log('  Tab badges:', { all: gottRes.tabAllText, local: gottRes.tabLocalText, ccli: gottRes.tabCcliText });
    assert.ok(gottRes.count > 5, 'Unified search should find both local and CCLI songs for "Gott"');

    // Filter to Local only
    console.log('8. Testing Filter to "Lokal" tab...');
    await evalExpr(`document.querySelector('#sb-tab-local').click()`);
    await new Promise((r) => setTimeout(r, 300));
    const localFilteredCount = await evalExpr(`document.querySelectorAll('#sb-song-search-results-list [data-search-result-idx]').length`);
    console.log('  Local filtered count:', localFilteredCount);
    assert.ok(localFilteredCount > 0 && localFilteredCount < gottRes.count, 'Local tab should filter to local songs only');

    // Filter to SongSelect only
    console.log('9. Testing Filter to "SongSelect" tab...');
    await evalExpr(`document.querySelector('#sb-tab-songselect').click()`);
    await new Promise((r) => setTimeout(r, 300));
    const ccliFilteredCount = await evalExpr(`document.querySelectorAll('#sb-song-search-results-list [data-search-result-idx]').length`);
    console.log('  SongSelect filtered count:', ccliFilteredCount);
    assert.ok(ccliFilteredCount > 0, 'SongSelect tab should show CCLI songs');

    // 10. Close login popup if opened during songselect tab click
    await evalExpr(`(() => {
      const closeBtn = document.querySelector('#sb-btn-ccli-browser-close');
      if (closeBtn) closeBtn.click();
    })()`);
    await new Promise((r) => setTimeout(r, 400));

    // Reset to "Alle" tab so both Local and CCLI songs are displayed together
    await evalExpr(`document.querySelector('#sb-tab-all').click()`);
    await new Promise((r) => setTimeout(r, 500));

    // Select the first local song in the list to showcase local song actions
    await evalExpr(`(() => {
      const firstItem = document.querySelector('#sb-song-search-results-list [data-search-result-idx="0"]');
      if (firstItem) firstItem.click();
    })()`);
    await new Promise((r) => setTimeout(r, 500));

    // Capture visual screenshot
    console.log('11. Capturing screenshot of Unified Search with Local song selected...');
    const screenshotRes = await send('Page.captureScreenshot', { format: 'png' });
    const b64 = screenshotRes.data || screenshotRes.result?.data;
    if (b64) {
      const screenshotPath = 'C:\\Users\\wolfgangmeincke\\.gemini\\antigravity-ide\\brain\\e51cb7cc-c85b-41d8-a26f-9ab32ccafd1a\\.tempmediaStorage\\unified_search_verified.png';
      fs.writeFileSync(screenshotPath, Buffer.from(b64, 'base64'));
      console.log('Screenshot saved to:', screenshotPath);
    }

    console.log('ALL TESTS PASSED WITH 100% SUCCESS!');
  } finally {
    edge.kill();
  }
}

runTest().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
