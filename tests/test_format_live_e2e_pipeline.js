import { spawn } from 'child_process';
import fs from 'fs';

function assert(condition, msg) {
  if (!condition) {
    throw new Error(`E2E Assertion Failed: ${msg}`);
  }
}

async function main() {
  console.log('--- STARTING E2E LIVE PIPELINE DOM & IPC ASSERTION SUITE ---');

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

    if (!page) throw new Error('No active Vite page target found');

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

    await new Promise((r) => setTimeout(r, 1500));

    // =========================================================================
    // STEP 1: INITIAL STATE VERIFICATION (Global Standard / Inherited Defaults)
    // =========================================================================
    const initialCheck = await send('Runtime.evaluate', {
      expression: `(() => {
        const slideLines = Array.from(document.querySelectorAll('[data-testid="slide-lyric-line"]'));
        if (slideLines.length === 0) return { error: 'No slide lines found with data-testid="slide-lyric-line"' };
        const firstLine = slideLines[0];
        const computed = window.getComputedStyle(firstLine);
        return {
          count: slideLines.length,
          textAlign: computed.textAlign,
          color: computed.color,
          fontFamily: computed.fontFamily,
          rawStyle: firstLine.getAttribute('style') || ''
        };
      })()`,
      returnByValue: true
    });

    const initData = initialCheck.result?.value;
    console.log('1. Initial SlideDeck State:', JSON.stringify(initData));
    assert(initData && !initData.error, 'Initial slides must be present in SlideDeck');
    assert(initData.textAlign === 'center', `Initial alignment must be center, got ${initData.textAlign}`);
    // Standard white color (rgb(255, 255, 255))
    assert(initData.color === 'rgb(255, 255, 255)', `Initial color must be rgb(255, 255, 255), got ${initData.color}`);
    console.log('✓ PASS: Initial slide deck renders with global standard styling (centered, white).');

    // =========================================================================
    // STEP 2: OPEN SONG EDITOR -> FORMAT TAB -> APPLY CUSTOM STYLES
    // =========================================================================
    await send('Runtime.evaluate', {
      expression: `(() => {
        const editBtn = document.querySelector('button[title*="bearbeiten"]') ||
                        Array.from(document.querySelectorAll('button')).find(b => b.title.includes('bearbeiten') || b.textContent.includes('bearbeiten'));
        if (editBtn) editBtn.click();
      })()`
    });

    await new Promise((r) => setTimeout(r, 800));

    // Switch to Formatierung tab
    await send('Runtime.evaluate', {
      expression: `(() => {
        const tabs = Array.from(document.querySelectorAll('button'));
        const fmtTab = tabs.find(b => b.textContent.trim() === 'Formatierung');
        if (fmtTab) fmtTab.click();
      })()`
    });

    await new Promise((r) => setTimeout(r, 800));

    // Activate custom profile, set Georgia font, set color #38bdf8, set align left
    const configureAction = await send('Runtime.evaluate', {
      expression: `(() => {
        // 1. Enable master toggle
        const masterCheck = document.getElementById('master-use-own-profile');
        if (masterCheck && !masterCheck.checked) {
          masterCheck.click();
        }

        // 2. Select Georgia font for Lang1
        const fontSelect = document.getElementById('font-family-lang1');
        if (fontSelect) {
          fontSelect.value = 'Georgia';
          fontSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // 3. Find and trigger Lang1 Left Alignment button
        const alignBtns = Array.from(document.querySelectorAll('button')).filter(b => b.title === 'Linksbündig' || b.textContent.trim() === '⇤');
        if (alignBtns.length >= 2) {
          alignBtns[1].click(); // second align left button corresponds to Sprache 1
        }

        // 4. Set Lang1 color to #38bdf8 (rgb(56, 189, 248))
        const colorInputs = Array.from(document.querySelectorAll('input[type="color"]'));
        if (colorInputs.length >= 2) {
          const lang1ColorInput = colorInputs[1];
          lang1ColorInput.value = '#38bdf8';
          lang1ColorInput.dispatchEvent(new Event('input', { bubbles: true }));
        }

        return {
          masterChecked: masterCheck?.checked,
          fontValue: fontSelect?.value
        };
      })()`,
      returnByValue: true
    });
    console.log('2. Custom Format Configuration:', JSON.stringify(configureAction.result?.value));

    await new Promise((r) => setTimeout(r, 600));

    // Click OK to save and close
    const saveAction = await send('Runtime.evaluate', {
      expression: `(() => {
        const okBtn = document.getElementById('song-editor-ok-btn') || document.getElementById('save-song-btn');
        if (okBtn) {
          okBtn.click();
          return 'ok_clicked';
        }
        return 'ok_not_found';
      })()`,
      returnByValue: true
    });
    assert(saveAction.result?.value === 'ok_clicked', 'OK button must be found and clicked');

    await new Promise((r) => setTimeout(r, 1200));

    // =========================================================================
    // STEP 3: VERIFY SLIDEDECK DOM MUTATION (Live Pipeline Effect)
    // =========================================================================
    const modifiedCheck = await send('Runtime.evaluate', {
      expression: `(() => {
        const slideLines = Array.from(document.querySelectorAll('[data-testid="slide-lyric-line"]'));
        if (slideLines.length === 0) return { error: 'No slide lines found' };
        const firstLine = slideLines[0];
        const computed = window.getComputedStyle(firstLine);

        // Also check BeamerView preview if present
        const beamerLines = Array.from(document.querySelectorAll('[data-testid="beamer-lyric-line"]'));
        const beamerComputed = beamerLines.length > 0 ? window.getComputedStyle(beamerLines[0]) : null;

        return {
          count: slideLines.length,
          textAlign: computed.textAlign,
          color: computed.color,
          fontFamily: computed.fontFamily,
          rawStyle: firstLine.getAttribute('style') || '',
          beamerCount: beamerLines.length,
          beamerTextAlign: beamerComputed?.textAlign,
          beamerColor: beamerComputed?.color,
        };
      })()`,
      returnByValue: true
    });

    const modData = modifiedCheck.result?.value;
    console.log('3. Modified SlideDeck State:', JSON.stringify(modData));

    assert(modData.textAlign === 'left', `Slide lines MUST now be left-aligned! Got: ${modData.textAlign}`);
    assert(modData.color === 'rgb(56, 189, 248)', `Slide lines MUST now render in custom color rgb(56, 189, 248)! Got: ${modData.color}`);
    assert(modData.fontFamily.toLowerCase().includes('georgia'), `Slide lines MUST now use Georgia font! Got: ${modData.fontFamily}`);

    if (modData.beamerCount > 0) {
      assert(modData.beamerTextAlign === 'left', `Beamer lines MUST now be left-aligned! Got: ${modData.beamerTextAlign}`);
      assert(modData.beamerColor === 'rgb(56, 189, 248)', `Beamer lines MUST now render in custom color rgb(56, 189, 248)! Got: ${modData.beamerColor}`);
      console.log('✓ PASS: Custom format verified on BeamerView canvas as well!');
    }

    console.log('✓ PASS: Custom format (Left align, #38bdf8 sky-blue, Georgia font) reactively applied to SlideDeck live stage!');

    // Capture screenshot of custom formatted slides
    const screenshot = await send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(screenshot.data, 'base64');
    const outDir = 'C:/Users/wolfgangmeincke/.gemini/antigravity-ide/brain/e51cb7cc-c85b-41d8-a26f-9ab32ccafd1a/.tempmediaStorage';
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(`${outDir}/e2e_live_custom_format_applied.png`, buffer);
    console.log('Saved screenshot to e2e_live_custom_format_applied.png');

    // =========================================================================
    // STEP 4: REVERT TO GLOBAL STANDARD & VERIFY ZERO-CLUTTER REVERSION
    // =========================================================================
    await send('Runtime.evaluate', {
      expression: `(() => {
        const editBtn = document.querySelector('button[title*="bearbeiten"]');
        if (editBtn) editBtn.click();
      })()`
    });

    await new Promise((r) => setTimeout(r, 800));

    await send('Runtime.evaluate', {
      expression: `(() => {
        const tabs = Array.from(document.querySelectorAll('button'));
        const fmtTab = tabs.find(b => b.textContent.trim() === 'Formatierung');
        if (fmtTab) fmtTab.click();
      })()`
    });

    await new Promise((r) => setTimeout(r, 800));

    // Uncheck master toggle
    await send('Runtime.evaluate', {
      expression: `(() => {
        const masterCheck = document.getElementById('master-use-own-profile');
        if (masterCheck && masterCheck.checked) {
          masterCheck.click();
        }
      })()`
    });

    await new Promise((r) => setTimeout(r, 500));

    // Click OK to save
    await send('Runtime.evaluate', {
      expression: `(() => {
        const okBtn = document.getElementById('song-editor-ok-btn');
        if (okBtn) okBtn.click();
      })()`
    });

    await new Promise((r) => setTimeout(r, 1200));

    // Verify slide deck reverted cleanly
    const revertedCheck = await send('Runtime.evaluate', {
      expression: `(() => {
        const slideLines = Array.from(document.querySelectorAll('[data-testid="slide-lyric-line"]'));
        const firstLine = slideLines[0];
        const computed = window.getComputedStyle(firstLine);
        return {
          textAlign: computed.textAlign,
          color: computed.color,
        };
      })()`,
      returnByValue: true
    });

    const revData = revertedCheck.result?.value;
    console.log('4. Reverted SlideDeck State:', JSON.stringify(revData));
    assert(revData.textAlign === 'center', `Reverted alignment must be center, got ${revData.textAlign}`);
    assert(revData.color === 'rgb(255, 255, 255)', `Reverted color must be white rgb(255, 255, 255), got ${revData.color}`);
    console.log('✓ PASS: Reverting custom adaptations cleanly restores global standard center alignment and white text.');

    ws.close();
  } finally {
    edge.kill();
  }

  console.log('--- ALL E2E LIVE PIPELINE ASSERTIONS PASSED WITH ZERO TOLERANCE ---');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
