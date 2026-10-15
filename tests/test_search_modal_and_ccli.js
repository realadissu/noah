import { spawn } from 'child_process';
import fs from 'fs';
import assert from 'node:assert';

async function runTest() {
  const tmpDir = 'C:\\Users\\wolfgangmeincke\\.gemini\\antigravity-ide\\brain\\e51cb7cc-c85b-41d8-a26f-9ab32ccafd1a\\scratch\\test_run_search_ccli';
  console.log('1. Starting Edge process...');
  const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--remote-debugging-port=9235',
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
    const res = await fetch('http://localhost:9235/json');
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
    await new Promise((r) => setTimeout(r, 2000));

    // Wait for app to mount
    for (let attempt = 0; attempt < 30; attempt++) {
      const btns = await evalExpr('document.querySelectorAll("button").length');
      if (btns && btns > 0) break;
      await new Promise((r) => setTimeout(r, 300));
    }

    // -----------------------------------------------------------------
    // TEST 1: Open Search Dialog via "Search Song" Toolbar Button
    // -----------------------------------------------------------------
    console.log('3. Testing Search Modal Opening via Search Song Button...');
    const clickRes = await evalExpr(`(() => {
      const btn = document.querySelector('#sb-btn-search-song');
      if (!btn) return { error: 'Search song button not found' };
      btn.click();
      return { clicked: true };
    })()`);
    console.log('  Button click result:', clickRes);
    await new Promise((r) => setTimeout(r, 400));

    const modalState = await evalExpr(`(() => {
      const modal = document.querySelector('#sb-song-search-modal');
      const input = document.querySelector('#sb-song-search-input');
      const list = document.querySelector('#sb-song-search-results-list');
      const listRect = list ? list.getBoundingClientRect() : null;
      return {
        isOpen: !!modal,
        inputFocused: document.activeElement === input,
        listWidth: listRect ? listRect.width : 0
      };
    })()`);
    console.log('  Modal state:', modalState);
    assert.strictEqual(modalState.isOpen, true, 'Search modal must be open');
    assert.ok(modalState.listWidth >= 380, `Left column width must be at least 380px for readable song titles! Got: ${modalState.listWidth}px`);
    console.log('  ✓ Search modal opened and left column has generous width (>=380px)');

    // -----------------------------------------------------------------
    // TEST 2: Multi-Keyword Search across Titles, Lyrics, and Subfolders
    // -----------------------------------------------------------------
    console.log('4. Testing Keyword Search across Title and Lyrics...');
    // Search for lyric word 'Erdkreis' (which is in 'Großer Gott, wir loben dich')
    await evalExpr(`(() => {
      const input = document.querySelector('#sb-song-search-input');
      input.value = 'Erdkreis';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    })()`);
    await new Promise((r) => setTimeout(r, 400));

    const lyricsSearchResult = await evalExpr(`(() => {
      const items = Array.from(document.querySelectorAll('[data-search-result-idx]'));
      return items.map(el => ({
        text: el.innerText,
        hasSnippet: el.innerText.includes('Im Liedtext')
      }));
    })()`);
    console.log('  Search results for "Erdkreis":', lyricsSearchResult);
    assert.ok(lyricsSearchResult.length > 0, 'Must find at least 1 song for lyric keyword "Erdkreis"');
    assert.ok(lyricsSearchResult[0].text.includes('Großer Gott'), 'Must find "Großer Gott, wir loben dich"');
    assert.ok(lyricsSearchResult[0].hasSnippet, 'Must display snippet indicating match in lyrics');
    console.log('  ✓ Found song by lyric keyword with highlighted lyrics snippet');

    // Multi-keyword search across subfolders
    await evalExpr(`(() => {
      const input = document.querySelector('#sb-song-search-input');
      input.value = 'Glaube fest';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    })()`);
    await new Promise((r) => setTimeout(r, 400));

    const multiTermResult = await evalExpr(`(() => {
      const items = Array.from(document.querySelectorAll('[data-search-result-idx]'));
      return items.map(el => el.innerText);
    })()`);
    console.log('  Search results for "Glaube fest":', multiTermResult);
    assert.ok(multiTermResult.some(t => t.includes('In Christus ist mein Glaube fest')), 'Must match "In Christus ist mein Glaube fest"');
    console.log('  ✓ Multi-keyword search across subfolders works smoothly');

    // -----------------------------------------------------------------
    // TEST 3: Subfolder Filter & Recursive Navigation
    // -----------------------------------------------------------------
    console.log('5. Testing Subfolder Filter...');
    await evalExpr(`(() => {
      const input = document.querySelector('#sb-song-search-input');
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    })()`);
    await new Promise((r) => setTimeout(r, 300));

    const allSongsCount = await evalExpr(`document.querySelectorAll('[data-search-result-idx]').length`);
    console.log('  Total songs across all subfolders:', allSongsCount);
    assert.ok(allSongsCount >= 5, 'Must list all songs in all subfolders when query is empty');

    // Filter to 'Jugend'
    await evalExpr(`(() => {
      const sel = document.querySelector('#sb-subfolder-filter');
      sel.value = 'Jugend';
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    })()`);
    await new Promise((r) => setTimeout(r, 300));

    const jugendCount = await evalExpr(`(() => {
      const items = Array.from(document.querySelectorAll('[data-search-result-idx]')).map(el => el.innerText);
      return items;
    })()`);
    console.log('  Jugend subfolder results:', jugendCount);
    assert.ok(jugendCount.some(t => t.includes('Mutig komm ich vor den Thron')), 'Jugend subfolder must contain Mutig komm ich vor den Thron');

    // Reset filter to 'all'
    await evalExpr(`(() => {
      const sel = document.querySelector('#sb-subfolder-filter');
      sel.value = 'all';
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    })()`);
    await new Promise((r) => setTimeout(r, 300));

    // -----------------------------------------------------------------
    // TEST 4: Song Selection & Right Column Preview
    // -----------------------------------------------------------------
    console.log('6. Testing Song Selection & Right Column Preview...');
    // Click on first item
    await evalExpr(`(() => {
      const item = document.querySelector('[data-search-result-idx="0"]');
      if (item) item.click();
    })()`);
    await new Promise((r) => setTimeout(r, 400));

    const previewState = await evalExpr(`(() => {
      const preview = document.querySelector('#sb-song-search-preview');
      const title = preview ? preview.querySelector('h3')?.innerText : null;
      const slides = preview ? preview.querySelectorAll('pre').length : 0;
      const addBtn = document.querySelector('#sb-btn-add-schedule');
      return {
        hasPreview: !!preview,
        previewTitle: title,
        slideBoxesCount: slides,
        hasAddButton: !!addBtn
      };
    })()`);
    console.log('  Preview state:', previewState);
    assert.strictEqual(previewState.hasPreview, true, 'Right column preview must be present');
    assert.ok(previewState.slideBoxesCount > 0, 'Must show formatted preview of slides');
    assert.strictEqual(previewState.hasAddButton, true, 'Must have Add to Schedule button');
    console.log('  ✓ Right column displays live song details and slide deck preview');

    // Capture screenshot of Local Archive Search View
    const searchModalScreenshot = await send('Page.captureScreenshot', { format: 'png' });
    const modalArtifactPath = 'C:\\Users\\wolfgangmeincke\\.gemini\\antigravity-ide\\brain\\e51cb7cc-c85b-41d8-a26f-9ab32ccafd1a\\.tempmediaStorage\\song_search_modal_verified.png';
    fs.writeFileSync(modalArtifactPath, Buffer.from(searchModalScreenshot.result.data, 'base64'));
    console.log('  ✓ Search modal screenshot saved to:', modalArtifactPath);

    // -----------------------------------------------------------------
    // TEST 5: CCLI SongSelect Tab, Login Flow, and Song Import
    // -----------------------------------------------------------------
    console.log('7. Testing CCLI SongSelect Tab & Import Flow...');
    // Switch to SongSelect tab
    await evalExpr(`document.querySelector('#sb-tab-songselect').click()`);
    await new Promise((r) => setTimeout(r, 400));

    // Open CCLI login modal
    await evalExpr(`document.querySelector('#sb-btn-connect-ccli').click()`);
    await new Promise((r) => setTimeout(r, 300));

    // Click demo quick login
    await evalExpr(`document.querySelector('#sb-btn-ccli-demo-login').click()`);
    await new Promise((r) => setTimeout(r, 400));

    const ccliStatus = await evalExpr(`(() => {
      const disconnectBtn = document.querySelector('#sb-btn-disconnect-ccli');
      const items = Array.from(document.querySelectorAll('[data-ccli-result-idx]')).map(el => el.innerText);
      return {
        isConnected: !!disconnectBtn,
        catalogCount: items.length,
        firstItem: items[0]
      };
    })()`);
    console.log('  CCLI status after login:', ccliStatus);
    assert.strictEqual(ccliStatus.isConnected, true, 'CCLI must be connected');
    assert.ok(ccliStatus.catalogCount > 0, 'SongSelect catalog must be displayed');

    // Search inside CCLI catalog for 'Reasons'
    await evalExpr(`(() => {
      const input = document.querySelector('#sb-song-search-input');
      input.value = 'Reasons';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    })()`);
    await new Promise((r) => setTimeout(r, 400));

    const ccliSearchResult = await evalExpr(`(() => {
      const items = Array.from(document.querySelectorAll('[data-ccli-result-idx]')).map(el => el.innerText);
      return items;
    })()`);
    console.log('  SongSelect search results for "Reasons":', ccliSearchResult);
    assert.ok(ccliSearchResult.some(t => t.includes('10,000 Reasons') && t.includes('6016350')), 'Must find 10,000 Reasons CCLI #6016350');

    // Click first CCLI result to preview
    await evalExpr(`document.querySelector('[data-ccli-result-idx="0"]').click()`);
    await new Promise((r) => setTimeout(r, 300));

    // Import and add to schedule!
    const scheduleCountBefore = await evalExpr(`document.querySelectorAll('[data-classic-schedule-idx], [data-schedule-idx]').length`);
    console.log('  Schedule count before import:', scheduleCountBefore);

    await evalExpr(`document.querySelector('#sb-btn-import-and-add-ccli').click()`);
    await new Promise((r) => setTimeout(r, 600));

    // Verify modal closed and schedule has 1 new item
    const scheduleStateAfter = await evalExpr(`(() => {
      const modal = document.querySelector('#sb-song-search-modal');
      const items = Array.from(document.querySelectorAll('[data-classic-schedule-idx], [data-schedule-idx]')).map(el => el.innerText);
      return {
        modalClosed: !modal,
        scheduleItems: items
      };
    })()`);
    console.log('  Schedule after CCLI import:', scheduleStateAfter);
    assert.strictEqual(scheduleStateAfter.modalClosed, true, 'Modal should close after import & add');
    assert.ok(scheduleStateAfter.scheduleItems.some(t => t.includes('10,000 Reasons')), 'Imported CCLI song must be in schedule!');
    console.log('  ✓ CCLI SongSelect song imported and successfully added to worship schedule!');

    // Capture screenshot of Main window with imported song active
    const finalScreenshot = await send('Page.captureScreenshot', { format: 'png' });
    const finalArtifactPath = 'C:\\Users\\wolfgangmeincke\\.gemini\\antigravity-ide\\brain\\e51cb7cc-c85b-41d8-a26f-9ab32ccafd1a\\.tempmediaStorage\\ccli_imported_live_verified.png';
    fs.writeFileSync(finalArtifactPath, Buffer.from(finalScreenshot.result.data, 'base64'));
    console.log('  ✓ Final verified screenshot saved to:', finalArtifactPath);

    console.log('🎉 ALL REQUIREMENTS TESTED AND VERIFIED WITH 100% SUCCESS!');
    ws.close();
  } finally {
    edge.kill();
  }
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
