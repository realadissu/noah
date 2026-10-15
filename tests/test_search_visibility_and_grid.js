import { spawn } from 'child_process';
import fs from 'fs';
import assert from 'node:assert';

async function runTest() {
  const tmpDir = 'C:\\Users\\wolfgangmeincke\\.gemini\\antigravity-ide\\brain\\e51cb7cc-c85b-41d8-a26f-9ab32ccafd1a\\scratch\\test_run_search_dark';
  console.log('1. Starting Edge process...');
  const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--remote-debugging-port=9234',
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
    const res = await fetch('http://localhost:9234/json');
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

    // -------------------------------------------------------------
    // TEST 1: Search Dropdown Visibility & Layering (Zero-Clipping)
    // -------------------------------------------------------------
    console.log('3. Testing Search Dropdown Visibility & Stacking Context...');
    const triggerRes = await evalExpr(`(() => {
      const input = document.querySelector('#sb-quick-search');
      if (!input) return { error: 'input element not found' };
      input.focus();
      input.value = 'Großer';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return { success: true, val: input.value };
    })()`);
    console.log('  Trigger result:', triggerRes);

    await new Promise((r) => setTimeout(r, 800));

    const checkDom = await evalExpr(`(() => {
      const dropdown = document.querySelector('#sb-search-dropdown');
      const input = document.querySelector('#sb-quick-search');
      const allButtons = Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim()).filter(Boolean);
      return { hasDropdown: !!dropdown, inputValue: input?.value, sampleButtons: allButtons.slice(0, 10) };
    })()`);
    console.log('  DOM check after search:', checkDom);

    const dropdownMetrics = await evalExpr(`(() => {
      const dropdown = document.querySelector('#sb-search-dropdown');
      const header = document.querySelector('header');
      if (!dropdown) return { error: 'Dropdown not rendered' };
      
      const dropRect = dropdown.getBoundingClientRect();
      const headerRect = header.getBoundingClientRect();
      
      // Check topmost element under center of dropdown (ensures not hidden behind main)
      const centerX = dropRect.left + dropRect.width / 2;
      const centerY = dropRect.top + dropRect.height / 2;
      const topElement = document.elementFromPoint(centerX, centerY);
      const isInsideDropdown = dropdown.contains(topElement);
      
      const computedZ = window.getComputedStyle(dropdown).zIndex;
      const headerOverflow = window.getComputedStyle(header).overflow;

      return {
        rendered: true,
        dropTop: dropRect.top,
        dropBottom: dropRect.bottom,
        dropHeight: dropRect.height,
        headerBottom: headerRect.bottom,
        headerOverflow,
        computedZ,
        isInsideDropdown,
        topElementTag: topElement ? topElement.tagName : null,
        topElementClass: topElement ? topElement.className : null
      };
    })()`);

    console.log('  Dropdown metrics:', dropdownMetrics);
    assert.ok(dropdownMetrics.rendered, 'Dropdown must be rendered in DOM');
    assert.ok(dropdownMetrics.dropTop >= dropdownMetrics.headerBottom - 2, 'Dropdown must sit below or at header bottom');
    assert.ok(dropdownMetrics.dropHeight > 20, 'Dropdown must have measurable height (not clipped to 0)');
    assert.ok(dropdownMetrics.isInsideDropdown, `Dropdown must be the topmost element under pointer, not hidden behind main! Got: ${dropdownMetrics.topElementTag}`);
    console.log('  ✓ Search dropdown is 100% visible and unclipped above main window!');

    // Capture screenshot of search dropdown over main layout
    const searchScreenshot = await send('Page.captureScreenshot', { format: 'png' });
    const searchArtifactPath = 'C:\\Users\\wolfgangmeincke\\.gemini\\antigravity-ide\\brain\\e51cb7cc-c85b-41d8-a26f-9ab32ccafd1a\\.tempmediaStorage\\search_dropdown_unclipped_verified.png';
    fs.writeFileSync(searchArtifactPath, Buffer.from(searchScreenshot.result.data, 'base64'));
    console.log('  ✓ Search dropdown screenshot saved to:', searchArtifactPath);

    // -------------------------------------------------------------
    // TEST 2: Active Slide Thick Red Border
    // -------------------------------------------------------------
    console.log('4. Testing Active Slide Thick Red Border...');
    // Select first slide if not already selected
    await evalExpr(`(() => {
      const slide = document.querySelector('[data-classic-slide-idx="0"]');
      if (slide) slide.click();
    })()`);
    await new Promise((r) => setTimeout(r, 300));

    const borderMetrics = await evalExpr(`(() => {
      const activeSlide = document.querySelector('[data-classic-slide-idx="0"]');
      if (!activeSlide) return { error: 'Active slide not found' };
      const classes = activeSlide.className;
      const thumb = activeSlide.querySelector('div[style*="aspect-ratio"]');
      const thumbClasses = thumb ? thumb.className : '';
      return {
        cardHasBorder2: classes.includes('border-2'),
        cardHasRing2: classes.includes('ring-2'),
        thumbHasBorder2: thumbClasses.includes('border-2'),
        thumbHasRing2: thumbClasses.includes('ring-2')
      };
    })()`);

    console.log('  Active border metrics:', borderMetrics);
    assert.ok(borderMetrics.cardHasBorder2, 'Active slide card must have border-2');
    assert.ok(borderMetrics.cardHasRing2, 'Active slide card must have ring-2');
    assert.ok(borderMetrics.thumbHasBorder2, 'Active slide thumbnail must have border-2');
    assert.ok(borderMetrics.thumbHasRing2, 'Active slide thumbnail must have ring-2');
    console.log('  ✓ Active slide has thick red double-stroke border!');

    // -------------------------------------------------------------
    // TEST 3: Slides Per Row Dropdown (2 to 6 columns)
    // -------------------------------------------------------------
    console.log('5. Testing Slides Per Row Dropdown in Song Titlebar...');
    const selectExists = await evalExpr(`(() => {
      const sel = document.querySelector('#sb-slides-per-row');
      if (!sel) return { error: 'Select not found' };
      const options = Array.from(sel.querySelectorAll('option')).map(o => parseInt(o.value, 10));
      return { found: true, options, currentValue: parseInt(sel.value, 10) };
    })()`);
    console.log('  Slides per row select options:', selectExists);
    assert.deepStrictEqual(selectExists.options, [2, 3, 4, 5, 6], 'Options must be [2, 3, 4, 5, 6]');

    // Change to 4 columns
    console.log('  Changing to 4 slides per row...');
    await evalExpr(`(() => {
      const sel = document.querySelector('#sb-slides-per-row');
      sel.value = '4';
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    })()`);
    await new Promise((r) => setTimeout(r, 300));

    const check4 = await evalExpr(`(() => {
      const grid = document.querySelector('#sb-slide-deck-grid');
      const savedInStorage = localStorage.getItem('noah_slides_per_row');
      return {
        gridColsStyle: grid ? grid.style.gridTemplateColumns : null,
        savedInStorage
      };
    })()`);
    console.log('  Grid after change to 4:', check4);
    assert.strictEqual(check4.savedInStorage, '4', 'Storage must persist 4');
    assert.ok(check4.gridColsStyle.includes('repeat(4,'), 'Grid must have repeat(4, ...)');
    console.log('  ✓ 4 slides per row verified');

    // Change to 6 columns
    console.log('  Changing to 6 slides per row...');
    await evalExpr(`(() => {
      const sel = document.querySelector('#sb-slides-per-row');
      sel.value = '6';
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    })()`);
    await new Promise((r) => setTimeout(r, 300));

    const check6 = await evalExpr(`(() => {
      const grid = document.querySelector('#sb-slide-deck-grid');
      const savedInStorage = localStorage.getItem('noah_slides_per_row');
      return {
        gridColsStyle: grid ? grid.style.gridTemplateColumns : null,
        savedInStorage
      };
    })()`);
    console.log('  Grid after change to 6:', check6);
    assert.strictEqual(check6.savedInStorage, '6', 'Storage must persist 6');
    assert.ok(check6.gridColsStyle.includes('repeat(6,'), 'Grid must have repeat(6, ...)');
    console.log('  ✓ 6 slides per row verified');

    // Capture screenshot with 4 slides per row and thick border
    await evalExpr(`(() => {
      const sel = document.querySelector('#sb-slides-per-row');
      sel.value = '3';
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    })()`);
    await new Promise((r) => setTimeout(r, 400));

    const finalScreenshot = await send('Page.captureScreenshot', { format: 'png' });
    const finalArtifactPath = 'C:\\Users\\wolfgangmeincke\\.gemini\\antigravity-ide\\brain\\e51cb7cc-c85b-41d8-a26f-9ab32ccafd1a\\.tempmediaStorage\\slides_per_row_and_border_verified.png';
    fs.writeFileSync(finalArtifactPath, Buffer.from(finalScreenshot.result.data, 'base64'));
    console.log('  ✓ Final verified screenshot saved to:', finalArtifactPath);

    console.log('🎉 ALL 3 REQUESTS TESTED AND VERIFIED CLEANLY!');
    ws.close();
  } finally {
    edge.kill();
  }
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
