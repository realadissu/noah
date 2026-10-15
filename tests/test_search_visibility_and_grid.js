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
    // TEST 2: Active Slide Calibrated Red Border (Etwas Dazwischen)
    // -------------------------------------------------------------
    console.log('4. Testing Active Slide Calibrated Red Border (Etwas Dazwischen)...');
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
        cardIsRed: classes.includes('border-[#cc0000]'),
        thumbHasBorder: thumbClasses.includes('border'),
        thumbHasRing2: thumbClasses.includes('ring-2')
      };
    })()`);

    console.log('  Active border metrics:', borderMetrics);
    assert.ok(borderMetrics.cardHasBorder2, 'Active slide card must have border-2 (clean 2px thickness)');
    assert.ok(borderMetrics.cardIsRed, 'Active slide card must have #cc0000 red border');
    assert.strictEqual(borderMetrics.cardHasRing2, false, 'Active slide card must NOT have ring-2 (avoids excessive thickness)');
    assert.strictEqual(borderMetrics.thumbHasRing2, false, 'Thumbnail must NOT have ring-2');
    console.log('  ✓ Active slide has calibrated 2px red border without overblown rings!');

    // -------------------------------------------------------------
    // TEST 3: Stepped Slider (Folien pro Zeile, 2 to 6) & UI Cleanup
    // -------------------------------------------------------------
    console.log('5. Testing Stepped Slider for Folien pro Zeile in Song Titlebar...');
    const sliderInfo = await evalExpr(`(() => {
      const slider = document.querySelector('#sb-slides-per-row');
      const label = document.querySelector('label[for="sb-slides-per-row"]');
      const valueBadge = document.querySelector('#sb-slides-per-row-value');
      const headerText = slider?.closest('div[style*="height"]')?.innerText || '';

      if (!slider) return { error: 'Slider not found' };
      return {
        isRangeInput: slider.type === 'range',
        min: slider.min,
        max: slider.max,
        step: slider.step,
        currentVal: slider.value,
        labelText: label ? label.innerText.trim() : null,
        labelHasLargerFont: label ? (label.className.includes('text-xs') && label.className.includes('font-semibold')) : false,
        valueBadgeText: valueBadge ? valueBadge.innerText.trim() : null,
        hasSlideCountText: /\\d+\\s*(Folien|slides)/i.test(headerText)
      };
    })()`);
    console.log('  Slider info:', sliderInfo);
    assert.strictEqual(sliderInfo.isRangeInput, true, 'Input must be type="range"');
    assert.strictEqual(sliderInfo.min, '2', 'Slider min must be 2');
    assert.strictEqual(sliderInfo.max, '6', 'Slider max must be 6');
    assert.strictEqual(sliderInfo.step, '1', 'Slider step must be 1 (gerastet)');
    assert.ok(
      sliderInfo.labelText === 'Folien pro Zeile' || sliderInfo.labelText === 'Slides per row',
      `Label must be 'Folien pro Zeile' or 'Slides per row', got: ${sliderInfo.labelText}`
    );
    assert.ok(sliderInfo.labelHasLargerFont, 'Label font must be larger (text-xs font-semibold)');
    assert.strictEqual(sliderInfo.hasSlideCountText, false, 'Slide count text must be completely removed');

    // Change to 5 columns on the fly via slider
    console.log('  Changing to 5 slides per row via slider input event...');
    await evalExpr(`(() => {
      const slider = document.querySelector('#sb-slides-per-row');
      slider.value = '5';
      slider.dispatchEvent(new Event('input', { bubbles: true }));
    })()`);
    await new Promise((r) => setTimeout(r, 300));

    const check5 = await evalExpr(`(() => {
      const grid = document.querySelector('#sb-slide-deck-grid');
      const savedInStorage = localStorage.getItem('noah_slides_per_row');
      const valueBadge = document.querySelector('#sb-slides-per-row-value');
      return {
        gridColsStyle: grid ? grid.style.gridTemplateColumns : null,
        savedInStorage,
        badgeText: valueBadge ? valueBadge.innerText.trim() : null
      };
    })()`);
    console.log('  Grid and badge after change to 5:', check5);
    assert.strictEqual(check5.savedInStorage, '5', 'Storage must persist 5');
    assert.strictEqual(check5.badgeText, '5', 'Value badge must display 5');
    assert.ok(check5.gridColsStyle.includes('repeat(5,'), 'Grid must have repeat(5, ...)');
    console.log('  ✓ 5 slides per row verified on the fly');

    // Change to 3 columns on the fly via slider
    console.log('  Changing to 3 slides per row via slider input event...');
    await evalExpr(`(() => {
      const slider = document.querySelector('#sb-slides-per-row');
      slider.value = '3';
      slider.dispatchEvent(new Event('input', { bubbles: true }));
    })()`);
    await new Promise((r) => setTimeout(r, 300));

    const check3 = await evalExpr(`(() => {
      const grid = document.querySelector('#sb-slide-deck-grid');
      const savedInStorage = localStorage.getItem('noah_slides_per_row');
      const valueBadge = document.querySelector('#sb-slides-per-row-value');
      return {
        gridColsStyle: grid ? grid.style.gridTemplateColumns : null,
        savedInStorage,
        badgeText: valueBadge ? valueBadge.innerText.trim() : null
      };
    })()`);
    console.log('  Grid and badge after change to 3:', check3);
    assert.strictEqual(check3.savedInStorage, '3', 'Storage must persist 3');
    assert.strictEqual(check3.badgeText, '3', 'Value badge must display 3');
    assert.ok(check3.gridColsStyle.includes('repeat(3,'), 'Grid must have repeat(3, ...)');
    console.log('  ✓ 3 slides per row verified on the fly');

    // Capture screenshot with calibrated border and slider
    const finalScreenshot = await send('Page.captureScreenshot', { format: 'png' });
    const finalArtifactPath = 'C:\\Users\\wolfgangmeincke\\.gemini\\antigravity-ide\\brain\\e51cb7cc-c85b-41d8-a26f-9ab32ccafd1a\\.tempmediaStorage\\slides_per_row_and_border_verified.png';
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
