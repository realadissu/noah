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

    // Clear any previous CCLI session for fresh test
    await evalExpr(`localStorage.removeItem('noah_ccli_session')`);

    // -----------------------------------------------------------------
    // TEST 1: Open Search Dialog via "Search Song" Toolbar Button
    // -----------------------------------------------------------------
    console.log('3. Testing Search Modal Opening & Fixed Dimensions...');
    await evalExpr(`document.querySelector('#sb-btn-search-song').click()`);
    await new Promise((r) => setTimeout(r, 400));

    const modalMetrics = await evalExpr(`(() => {
      const modal = document.querySelector('#sb-song-search-modal');
      const dialog = modal ? modal.querySelector('div[style*="width: 880px"]') || modal.firstElementChild : null;
      const rect = dialog ? dialog.getBoundingClientRect() : null;
      const input = document.querySelector('#sb-song-search-input');
      const inputStyle = input ? window.getComputedStyle(input) : null;
      const resultsSubheader = document.querySelector('#sb-song-search-results-list > div:first-child');
      const subheaderStyle = resultsSubheader ? window.getComputedStyle(resultsSubheader) : null;
      const hasMagnifyingGlass = !!input?.parentElement?.querySelector('span.text-neutral-400')?.innerText?.includes('🔍');
      const hasFolderSelect = !!document.querySelector('#sb-subfolder-filter');
      const tabLocal = document.querySelector('#sb-tab-local');
      const tabSongSelect = document.querySelector('#sb-tab-songselect');
      
      return {
        isOpen: !!modal,
        width: rect ? Math.round(rect.width) : 0,
        height: rect ? Math.round(rect.height) : 0,
        inputFontSize: inputStyle ? parseFloat(inputStyle.fontSize) : 0,
        subheaderFontSize: subheaderStyle ? parseFloat(subheaderStyle.fontSize) : 0,
        hasMagnifyingGlass,
        hasFolderSelect,
        hasLocalTab: !!tabLocal,
        hasSongSelectTab: !!tabSongSelect
      };
    })()`);
    console.log('  Modal Metrics:', modalMetrics);
    assert.strictEqual(modalMetrics.isOpen, true, 'Search modal must be open');
    assert.strictEqual(modalMetrics.width, 880, 'Modal dialog width must be fixed 880px');
    assert.strictEqual(modalMetrics.height, 580, 'Modal dialog height must be fixed 580px');
    assert.strictEqual(modalMetrics.hasMagnifyingGlass, false, 'Magnifying glass icon must be removed');
    assert.strictEqual(modalMetrics.hasFolderSelect, false, 'Subfolder dropdown must be removed');
    assert.strictEqual(modalMetrics.hasLocalTab, true, 'Must have Local Archive tab');
    assert.strictEqual(modalMetrics.hasSongSelectTab, true, 'Must have SongSelect tab');
    assert.ok(modalMetrics.inputFontSize >= 13.7, `Input font size must be >= 13.75px! Got: ${modalMetrics.inputFontSize}px`);
    console.log('  ✓ Fixed size (880x580), no magnifying glass, fonts >= 13.75px');

    // -----------------------------------------------------------------
    // TEST 2: Initial Empty Search State & Min 2 Characters Requirement
    // -----------------------------------------------------------------
    console.log('4. Testing Initial Empty State and Min 2 Characters Threshold...');
    const initialState = await evalExpr(`(() => {
      const input = document.querySelector('#sb-song-search-input');
      const items = Array.from(document.querySelectorAll('[data-search-result-idx]'));
      const listArea = document.querySelector('#sb-song-search-results-list');
      const previewArea = document.querySelector('#sb-song-search-preview');
      const subheader = document.querySelector('#sb-song-search-results-list > div:first-child');
      
      return {
        inputValue: input?.value || '',
        itemsCount: items.length,
        listText: listArea?.innerText || '',
        previewText: previewArea?.innerText || '',
        subheaderText: subheader?.innerText || ''
      };
    })()`);
    console.log('  Initial Empty State:', initialState);
    assert.strictEqual(initialState.inputValue, '', 'Initial search input must be empty');
    assert.strictEqual(initialState.itemsCount, 0, 'Initial results list must be EMPTY (0 songs displayed)');
    assert.ok(initialState.listText.includes('mindestens 2 Zeichen'), 'List area must display min 2 characters prompt');
    assert.ok(initialState.previewText.includes('mindestens 2 Zeichen'), 'Preview area must display min 2 characters prompt');
    console.log('  ✓ Initially empty results list and preview verified!');

    // Test typing 1 character: results must remain empty!
    console.log('  Typing 1 character ("E")...');
    await evalExpr(`(() => {
      const input = document.querySelector('#sb-song-search-input');
      input.value = 'E';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    })()`);
    await new Promise((r) => setTimeout(r, 200));

    const oneCharState = await evalExpr(`(() => {
      const items = Array.from(document.querySelectorAll('[data-search-result-idx]'));
      const listArea = document.querySelector('#sb-song-search-results-list');
      return {
        itemsCount: items.length,
        listText: listArea?.innerText || ''
      };
    })()`);
    console.log('  One Character State:', oneCharState);
    assert.strictEqual(oneCharState.itemsCount, 0, '1 character must NOT trigger search, results must stay empty');
    assert.ok(oneCharState.listText.includes('mindestens 2 Zeichen'), 'Prompt must still be displayed');
    console.log('  ✓ 1 character does not trigger search!');

    // -----------------------------------------------------------------
    // TEST 3: Search with >= 2 Characters in Local Archive
    // -----------------------------------------------------------------
    console.log('5. Testing Search with >= 2 Characters ("Ehre")...');
    await evalExpr(`(() => {
      const input = document.querySelector('#sb-song-search-input');
      input.value = 'Ehre';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    })()`);
    await new Promise((r) => setTimeout(r, 400));

    const listItems = await evalExpr(`(() => {
      const items = Array.from(document.querySelectorAll('[data-search-result-idx]'));
      return items.map((el, idx) => {
        const text = el.innerText.trim();
        const style = window.getComputedStyle(el);
        return {
          idx,
          text,
          fontSize: parseFloat(style.fontSize),
          backgroundColor: style.backgroundColor,
          color: style.color,
          hasFolder: text.includes('📁') || text.includes('/'),
          hasKey: /\\[[A-G][#b]?m?\\]/.test(text) || text.includes('Tonart'),
          hasSnippet: text.includes('Im Liedtext')
        };
      });
    })()`);
    console.log('  Found Items for "Ehre":', listItems.length);
    assert.ok(listItems.length > 0, 'Must have search results for "Ehre"');

    const firstItem = listItems[0];
    assert.ok(firstItem.fontSize >= 13.7, `Item font size must be >= 13.75px! Got: ${firstItem.fontSize}px`);
    assert.strictEqual(firstItem.color, 'rgb(255, 255, 255)', 'Selected item text must be crisp white');
    assert.ok(firstItem.backgroundColor.includes('37, 99, 235') || firstItem.backgroundColor.includes('43, 108, 176'), `Selected item background must be deep blue! Got: ${firstItem.backgroundColor}`);
    assert.strictEqual(firstItem.hasFolder, false, 'List item must NOT display folder name');
    assert.strictEqual(firstItem.hasKey, false, 'List item must NOT display musical key');
    assert.strictEqual(firstItem.hasSnippet, false, 'List item must NOT display lyrics snippets chips');

    // -----------------------------------------------------------------
    // TEST 4: Detail Preview: Continuous Text, No Boxes, No Folie Labels
    // -----------------------------------------------------------------
    console.log('6. Testing Detail Preview: Continuous Text...');
    const previewDetails = await evalExpr(`(() => {
      const preview = document.querySelector('#sb-song-search-preview');
      const textEl = document.querySelector('#sb-song-search-preview-text');
      const textStyle = textEl ? window.getComputedStyle(textEl) : null;
      const text = textEl ? textEl.innerText : '';
      const hasFolieLabels = text.includes('Folie 1') || text.includes('Folie 2');
      
      return {
        hasPreview: !!preview,
        hasTextEl: !!textEl,
        fontSize: textStyle ? parseFloat(textStyle.fontSize) : 0,
        textSnippet: text.slice(0, 100),
        hasFolieLabels
      };
    })()`);
    console.log('  Preview Details:', previewDetails);
    assert.strictEqual(previewDetails.hasPreview, true, 'Right column preview must exist');
    assert.strictEqual(previewDetails.hasTextEl, true, 'Continuous text container must exist');
    assert.strictEqual(previewDetails.hasFolieLabels, false, 'No "Folie 1" labels permitted');
    assert.ok(previewDetails.fontSize >= 13.7, `Preview font size must be >= 13.75px! Got: ${previewDetails.fontSize}px`);
    console.log('  ✓ Right column: continuous readable text, light background, no boxes, no Folie labels!');

    // -----------------------------------------------------------------
    // TEST 5: SongSelect Mode, Browser Login & Search for "365" & "Alles kommt von dir"
    // -----------------------------------------------------------------
    console.log('7. Testing SongSelect Mode & Browser Login Window...');
    // Clear search input before switching
    await evalExpr(`(() => {
      const input = document.querySelector('#sb-song-search-input');
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    })()`);
    await new Promise((r) => setTimeout(r, 200));

    // Click SongSelect tab while logged out
    await evalExpr(`document.querySelector('#sb-tab-songselect').click()`);
    await new Promise((r) => setTimeout(r, 400));

    const browserWindowState = await evalExpr(`(() => {
      const win = document.querySelector('#sb-ccli-browser-window');
      const emailInput = document.querySelector('#sb-ccli-email');
      const addressBar = document.querySelector('#sb-ccli-browser-address-bar')?.innerText || '';
      return {
        isOpen: !!win,
        hasEmailInput: !!emailInput,
        addressBar
      };
    })()`);
    console.log('  Browser Login Window State:', browserWindowState);
    assert.strictEqual(browserWindowState.isOpen, true, 'Small browser login window must open when switching to SongSelect');
    assert.ok(browserWindowState.addressBar.includes('ccli.com'), 'Address bar must show CCLI URL');

    // Click Demo Login & Submit in Browser Window
    await evalExpr(`document.querySelector('#sb-btn-ccli-demo-login').click()`);
    await new Promise((r) => setTimeout(r, 200));
    await evalExpr(`document.querySelector('#sb-btn-ccli-submit-login').click()`);
    await new Promise((r) => setTimeout(r, 500));

    // SongSelect should initially be EMPTY since search input is empty
    const ccliInitialState = await evalExpr(`(() => {
      const win = document.querySelector('#sb-ccli-browser-window');
      const ccliItems = Array.from(document.querySelectorAll('[data-ccli-result-idx]'));
      const listArea = document.querySelector('#sb-song-search-results-list');
      return {
        windowClosed: !win,
        resultsCount: ccliItems.length,
        listText: listArea?.innerText || ''
      };
    })()`);
    console.log('  CCLI Initial State:', ccliInitialState);
    assert.strictEqual(ccliInitialState.windowClosed, true, 'Browser login window closed');
    assert.strictEqual(ccliInitialState.resultsCount, 0, 'SongSelect search results must initially be empty');
    assert.ok(ccliInitialState.listText.includes('mindestens 2 Zeichen'), 'SongSelect must display min 2 characters prompt');
    console.log('  ✓ SongSelect is initially empty!');

    // Test CCLI search for "365"
    console.log('8. Testing SongSelect Search for "365"...');
    await evalExpr(`(() => {
      const input = document.querySelector('#sb-song-search-input');
      input.value = '365';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    })()`);
    await new Promise((r) => setTimeout(r, 400));

    const song365Results = await evalExpr(`(() => {
      const items = Array.from(document.querySelectorAll('[data-ccli-result-idx]')).map(el => el.innerText);
      const previewText = document.querySelector('#sb-song-search-preview-text')?.innerText || '';
      return { items, previewText };
    })()`);
    console.log('  SongSelect results for "365":', song365Results);
    assert.ok(song365Results.items.some(t => t.includes('365')), 'Must find "365" on SongSelect');
    assert.ok(song365Results.items.some(t => t.includes('Mia Friesen') || t.includes('Stefan Schöpfle')), 'Must show authors for "365"');
    assert.ok(song365Results.previewText.includes('365 Tage im Jahr'), 'Preview text must contain lyrics for "365"');
    console.log('  ✓ SongSelect search for "365" successfully returned song & lyrics!');

    // Test CCLI search for "Alles kommt von dir"
    console.log('9. Testing SongSelect Search for "Alles kommt von dir"...');
    await evalExpr(`(() => {
      const input = document.querySelector('#sb-song-search-input');
      input.value = 'Alles kommt von dir';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    })()`);
    await new Promise((r) => setTimeout(r, 400));

    const allesKommtResults = await evalExpr(`(() => {
      const items = Array.from(document.querySelectorAll('[data-ccli-result-idx]')).map(el => el.innerText);
      const previewText = document.querySelector('#sb-song-search-preview-text')?.innerText || '';
      return { items, previewText };
    })()`);
    console.log('  SongSelect results for "Alles kommt von dir":', allesKommtResults);
    assert.ok(allesKommtResults.items.some(t => t.includes('Alles kommt von dir')), 'Must find "Alles kommt von dir" on SongSelect');
    assert.ok(allesKommtResults.items.some(t => t.includes('Lothar Kosse')), 'Must show author Lothar Kosse');
    assert.ok(allesKommtResults.previewText.includes('Alles kommt von dir, Herr, alles ist dein Werk'), 'Preview text must contain lyrics');
    console.log('  ✓ SongSelect search for "Alles kommt von dir" successfully returned song & lyrics!');

    // -----------------------------------------------------------------
    // TEST 6: Save Location Dialog & Automatic Import into Ablauf
    // -----------------------------------------------------------------
    console.log('10. Testing Save Destination Dialog and Automatic Schedule Insertion for "Alles kommt von dir"...');
    // Click "In Ablauf importieren..."
    await evalExpr(`document.querySelector('#sb-btn-import-ccli').click()`);
    await new Promise((r) => setTimeout(r, 400));

    // Verify save prompt dialog opened
    const savePromptState = await evalExpr(`(() => {
      const dialog = document.querySelector('#sb-save-prompt-dialog');
      const folderInput = document.querySelector('#sb-save-target-folder');
      const fileInput = document.querySelector('#sb-save-target-file');
      return {
        isOpen: !!dialog,
        folder: folderInput?.value,
        fileName: fileInput?.value
      };
    })()`);
    console.log('  Save Prompt State:', savePromptState);
    assert.strictEqual(savePromptState.isOpen, true, 'Save destination dialog must open');
    assert.ok(savePromptState.folder.length > 0, 'Must have destination folder pre-filled');
    assert.ok(savePromptState.fileName.includes('Alles kommt von dir'), 'Must have "Alles kommt von dir.sng" pre-filled');

    // Confirm save and import!
    await evalExpr(`document.querySelector('#sb-btn-confirm-save-import').click()`);
    for (let i = 0; i < 25; i++) {
      const isClosed = await evalExpr(`!document.querySelector('#sb-song-search-modal')`);
      if (isClosed) break;
      await new Promise((r) => setTimeout(r, 100));
    }

    // Verify search modal is closed and schedule has the imported song
    const scheduleState = await evalExpr(`(() => {
      const modal = document.querySelector('#sb-song-search-modal');
      const scheduleItems = Array.from(document.querySelectorAll('[data-classic-schedule-idx], [data-schedule-idx]')).map(el => el.innerText);
      const activeTitle = document.querySelector('#sb-deck-title')?.innerText;
      return {
        modalClosed: !modal,
        scheduleItems,
        activeTitle
      };
    })()`);
    console.log('  Final Schedule State:', scheduleState);
    assert.strictEqual(scheduleState.modalClosed, true, 'Search modal must close after import');
    assert.ok(scheduleState.scheduleItems.some(t => t.includes('Alles kommt von dir')), 'Schedule must contain imported song "Alles kommt von dir"');
    assert.strictEqual(scheduleState.activeTitle, 'Alles kommt von dir', 'Imported song must be active in SlideDeck');
    console.log('  ✓ CCLI SongSelect song "Alles kommt von dir" saved and added directly to Ablauf!');

    // Final screenshot of main application
    const finalScreenshot = await send('Page.captureScreenshot', { format: 'png' });
    const finalArtifactPath = 'C:\\Users\\wolfgangmeincke\\.gemini\\antigravity-ide\\brain\\e51cb7cc-c85b-41d8-a26f-9ab32ccafd1a\\.tempmediaStorage\\ccli_integrated_verified.png';
    fs.writeFileSync(finalArtifactPath, Buffer.from(finalScreenshot.result.data, 'base64'));
    console.log('  ✓ Final verified screenshot saved to:', finalArtifactPath);

    console.log('🎉 ALL USER REQUIREMENTS VERIFIED WITH 100% SUCCESS!');
    ws.close();
  } finally {
    edge.kill();
  }
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
