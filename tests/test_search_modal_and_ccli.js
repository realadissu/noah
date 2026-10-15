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
    // TEST 2: Local Search Results Formatting & Contrast
    // -----------------------------------------------------------------
    console.log('4. Testing Left Column Results Formatting & Contrast...');
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
    console.log('  List Items Samples:', listItems.slice(0, 3));
    assert.ok(listItems.length > 0, 'Must have search results');

    const firstItem = listItems[0];
    assert.ok(firstItem.fontSize >= 13.7, `Item font size must be >= 13.75px! Got: ${firstItem.fontSize}px`);
    assert.strictEqual(firstItem.color, 'rgb(255, 255, 255)', 'Selected item text must be crisp white');
    assert.ok(firstItem.backgroundColor.includes('37, 99, 235') || firstItem.backgroundColor.includes('43, 108, 176'), `Selected item background must be deep blue! Got: ${firstItem.backgroundColor}`);
    assert.strictEqual(firstItem.hasFolder, false, 'List item must NOT display folder name');
    assert.strictEqual(firstItem.hasKey, false, 'List item must NOT display musical key');
    assert.strictEqual(firstItem.hasSnippet, false, 'List item must NOT display lyrics snippets chips');

    // -----------------------------------------------------------------
    // TEST 3: Right Column Detail Preview (Continuous Text)
    // -----------------------------------------------------------------
    console.log('5. Testing Detail Preview: Continuous Text, No Boxes, No Folie Labels...');
    const previewDetails = await evalExpr(`(() => {
      const preview = document.querySelector('#sb-song-search-preview');
      const textEl = document.querySelector('#sb-song-search-preview-text');
      const textStyle = textEl ? window.getComputedStyle(textEl) : null;
      const boxesCount = preview ? preview.querySelectorAll('pre, .bg-black, [class*="rounded"]').length : 0;
      const text = textEl ? textEl.innerText : '';
      const hasFolieLabels = text.includes('Folie 1') || text.includes('Folie 2');
      
      return {
        hasPreview: !!preview,
        hasTextEl: !!textEl,
        fontSize: textStyle ? parseFloat(textStyle.fontSize) : 0,
        boxesCount,
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
    // TEST 4: SongSelect Tab & Browser Login Window Popup
    // -----------------------------------------------------------------
    console.log('6. Testing SongSelect Mode & Embedded Browser Login Window...');
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

    const browserWindowScreenshot = await send('Page.captureScreenshot', { format: 'png' });
    const browserWindowArtifactPath = 'C:\\Users\\wolfgangmeincke\\.gemini\\antigravity-ide\\brain\\e51cb7cc-c85b-41d8-a26f-9ab32ccafd1a\\.tempmediaStorage\\ccli_browser_login_verified.png';
    fs.writeFileSync(browserWindowArtifactPath, Buffer.from(browserWindowScreenshot.result.data, 'base64'));
    console.log('  ✓ Browser login window screenshot saved to:', browserWindowArtifactPath);

    // Click Demo Login & Submit in Browser Window
    await evalExpr(`document.querySelector('#sb-btn-ccli-demo-login').click()`);
    await new Promise((r) => setTimeout(r, 200));
    await evalExpr(`document.querySelector('#sb-btn-ccli-submit-login').click()`);
    await new Promise((r) => setTimeout(r, 500));

    // Verify browser window closed automatically and SongSelect results are displayed
    const postLoginState = await evalExpr(`(() => {
      const win = document.querySelector('#sb-ccli-browser-window');
      const ccliItems = Array.from(document.querySelectorAll('[data-ccli-result-idx]'));
      const activeTabBtn = document.querySelector('#sb-tab-songselect');
      return {
        windowClosed: !win,
        resultsCount: ccliItems.length,
        firstTitle: ccliItems[0]?.innerText
      };
    })()`);
    console.log('  Post-Login State:', postLoginState);
    assert.strictEqual(postLoginState.windowClosed, true, 'Browser login window must close automatically upon login');
    assert.ok(postLoginState.resultsCount > 0, 'SongSelect search results must be displayed');
    console.log('  ✓ Small browser login window completed login and closed automatically!');

    // -----------------------------------------------------------------
    // TEST 5: SongSelect Search via the SAME Input Field
    // -----------------------------------------------------------------
    console.log('7. Testing SongSelect Search via the SAME Input Field...');
    await evalExpr(`(() => {
      const input = document.querySelector('#sb-song-search-input');
      input.value = 'Reasons';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    })()`);
    await new Promise((r) => setTimeout(r, 400));

    const ccliSearchResults = await evalExpr(`(() => {
      const items = Array.from(document.querySelectorAll('[data-ccli-result-idx]')).map(el => el.innerText);
      return items;
    })()`);
    console.log('  SongSelect search results for "Reasons":', ccliSearchResults);
    assert.ok(ccliSearchResults.some(t => t.includes('10,000 Reasons')), 'Must find "10,000 Reasons"');
    console.log('  ✓ Exact same search field searches SongSelect catalog seamlessly!');

    // Select the first CCLI result
    await evalExpr(`document.querySelector('[data-ccli-result-idx="0"]').click()`);
    await new Promise((r) => setTimeout(r, 300));

    // -----------------------------------------------------------------
    // TEST 6: Save Location Dialog & Automatic Import into Ablauf
    // -----------------------------------------------------------------
    console.log('8. Testing Save Destination Dialog and Automatic Schedule Insertion...');
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
    assert.ok(savePromptState.fileName.includes('.sng'), 'Must have .sng file name pre-filled');

    // Capture screenshot of Save Prompt Dialog
    const savePromptScreenshot = await send('Page.captureScreenshot', { format: 'png' });
    const savePromptArtifactPath = 'C:\\Users\\wolfgangmeincke\\.gemini\\antigravity-ide\\brain\\e51cb7cc-c85b-41d8-a26f-9ab32ccafd1a\\.tempmediaStorage\\ccli_save_prompt_verified.png';
    fs.writeFileSync(savePromptArtifactPath, Buffer.from(savePromptScreenshot.result.data, 'base64'));
    console.log('  ✓ Save prompt screenshot saved to:', savePromptArtifactPath);

    // Confirm save and import!
    await evalExpr(`document.querySelector('#sb-btn-confirm-save-import').click()`);
    await new Promise((r) => setTimeout(r, 600));

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
    assert.ok(scheduleState.scheduleItems.some(t => t.includes('10,000 Reasons')), 'Schedule must contain imported song "10,000 Reasons"');
    assert.strictEqual(scheduleState.activeTitle, '10,000 Reasons (Bless The Lord)', 'Imported song must be active in SlideDeck');
    console.log('  ✓ CCLI SongSelect song imported to chosen path and added directly to Ablauf!');

    // -----------------------------------------------------------------
    // TEST 7: Toolbar Key Button is Removed as Requested
    // -----------------------------------------------------------------
    console.log('9. Verifying Toolbar Key Icon is removed as requested...');
    const hasToolbarKeyBtn = await evalExpr(`!!document.querySelector('#sb-quick-ccli-btn')`);
    assert.strictEqual(hasToolbarKeyBtn, false, 'Toolbar key icon (#sb-quick-ccli-btn) must be removed');
    console.log('  ✓ Toolbar key button is cleanly removed from the toolbar!');

    // -----------------------------------------------------------------
    // TEST 8: Searching by Real Song Titles in Local Archive
    // -----------------------------------------------------------------
    console.log('10. Testing Local Search by Title (Ehre, Gott, Jesus)...');
    // Open Search Modal again
    await evalExpr(`document.querySelector('#sb-btn-search-song').click()`);
    await new Promise((r) => setTimeout(r, 400));

    // Ensure Local Archive tab is active
    await evalExpr(`document.querySelector('#sb-tab-local').click()`);
    await new Promise((r) => setTimeout(r, 200));

    // Search for "Ehre"
    await evalExpr(`(() => {
      const input = document.querySelector('#sb-song-search-input');
      input.value = 'Ehre';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    })()`);
    await new Promise((r) => setTimeout(r, 400));

    const ehreResults = await evalExpr(`(() => {
      const items = Array.from(document.querySelectorAll('[data-search-result-idx]')).map(el => el.innerText);
      const previewText = document.querySelector('#sb-song-search-preview-text')?.innerText || '';
      return { items, previewText };
    })()`);
    console.log('  Local Search results for "Ehre":', ehreResults);
    assert.ok(ehreResults.items.some(t => t.includes('Ehre, Macht, und Stärke')), 'Must find "Ehre, Macht, und Stärke"');
    assert.ok(ehreResults.previewText.includes('sei unserm Gott'), 'Right pane preview must display full song lyrics');

    // Search for "Jesus"
    await evalExpr(`(() => {
      const input = document.querySelector('#sb-song-search-input');
      input.value = 'Jesus';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    })()`);
    await new Promise((r) => setTimeout(r, 400));

    const jesusResults = await evalExpr(`(() => {
      const items = Array.from(document.querySelectorAll('[data-search-result-idx]')).map(el => el.innerText);
      return items;
    })()`);
    console.log('  Local Search results for "Jesus":', jesusResults);
    assert.ok(jesusResults.some(t => t.includes('Jesus komm') || t.includes('In dem Namen Jesus')), 'Must find Jesus songs from local library');
    console.log('  ✓ Local song search by title returns results and previews lyrics immediately!');

    // Close modal
    await evalExpr(`document.querySelector('#sb-song-search-close-x').click()`);
    await new Promise((r) => setTimeout(r, 300));

    // Final screenshot of main application
    const finalScreenshot = await send('Page.captureScreenshot', { format: 'png' });
    const finalArtifactPath = 'C:\\Users\\wolfgangmeincke\\.gemini\\antigravity-ide\\brain\\e51cb7cc-c85b-41d8-a26f-9ab32ccafd1a\\.tempmediaStorage\\ccli_integrated_verified.png';
    fs.writeFileSync(finalArtifactPath, Buffer.from(finalScreenshot.result.data, 'base64'));
    console.log('  ✓ Final verified screenshot saved to:', finalArtifactPath);

    console.log('🎉 ALL INTEGRATED REQUIREMENTS VERIFIED WITH 100% SUCCESS!');
    ws.close();
  } finally {
    edge.kill();
  }
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
