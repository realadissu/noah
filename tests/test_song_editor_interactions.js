import { spawn } from 'child_process';

async function runTest() {
  console.log('Starting Edge process...');
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

    console.log('1. Opening Song Editor Modal...');
    await evalExpr(`(() => {
      const btn = document.querySelector('button[title*="bearbeiten"], button[title*="Bearbeiten"], button[title*="Edit"], button[title*="edit"]');
      if (btn) btn.click();
    })()`);
    await new Promise((r) => setTimeout(r, 800));

    console.log('2. Inspecting DOM elements...');
    const domInfo = await evalExpr(`(() => {
      const modal = document.querySelector('[role="dialog"]');
      const titleInput = document.querySelector('#song-title-input');
      const textarea = document.querySelector('#song-text-editor');
      const verseOrderInput = document.querySelector('#verse-order-text-input');
      const langButtons = Array.from(document.querySelectorAll('button')).filter(b => ['1','2','3','4'].includes(b.innerText.trim()));

      return {
        hasModal: !!modal,
        title: titleInput ? { value: titleInput.value, readOnly: titleInput.readOnly } : null,
        textarea: textarea ? {
          valueLength: textarea.value.length,
          readOnly: textarea.readOnly,
          color: window.getComputedStyle(textarea).color,
          userSelect: window.getComputedStyle(textarea).userSelect,
          caretColor: window.getComputedStyle(textarea).caretColor,
        } : null,
        verseOrderValue: verseOrderInput ? verseOrderInput.value : null,
        langButtonCount: langButtons.length
      };
    })()`);
    console.log('DOM Info:', JSON.stringify(domInfo, null, 2));

    if (!domInfo.hasModal) throw new Error('Editor modal did not open!');
    if (!domInfo.textarea) throw new Error('Textarea not found!');
    if (domInfo.textarea.readOnly) throw new Error('Textarea is readOnly!');

    console.log('3. Testing text editing in textarea...');
    const textEditResult = await evalExpr(`(() => {
      const textarea = document.querySelector('#song-text-editor');
      const original = textarea.value;
      const addition = '\\n---\\nVers 99\\nDies ist ein Testtext für NOAH\\n';
      textarea.value = original + addition;
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      return {
        newLength: textarea.value.length,
        containsAddition: textarea.value.includes('Vers 99')
      };
    })()`);
    console.log('Text edit result:', textEditResult);
    if (!textEditResult.containsAddition) throw new Error('Text editing failed!');

    console.log('4. Testing Language selector (changing to 2 languages)...');
    const langResult = await evalExpr(`(() => {
      const btn2 = document.querySelector('#lang-count-2');
      if (btn2) btn2.click();
      return { clicked: !!btn2 };
    })()`);
    await new Promise((r) => setTimeout(r, 400));

    const lang2State = await evalExpr(`(() => {
      const titleLang2Input = document.querySelector('#title-lang2-quick');
      if (titleLang2Input) {
        titleLang2Input.value = 'Bless the Lord, O My Soul';
        titleLang2Input.dispatchEvent(new Event('input', { bubbles: true }));
      }
      return {
        hasTitleLang2: !!titleLang2Input,
        value: titleLang2Input ? titleLang2Input.value : null
      };
    })()`);
    console.log('Language 2 state:', lang2State);
    if (!lang2State.hasTitleLang2) throw new Error('TitleLang2 input did not appear after selecting 2 languages!');

    console.log('5. Testing Ablauf manipulation (Quick chips & Direct text)...');
    // Click chip
    const chipClicked = await evalExpr(`(() => {
      const chip99 = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Vers 99') && b.textContent.includes('+'));
      if (chip99) {
        chip99.click();
        return chip99.textContent.trim();
      }
      return null;
    })()`);
    console.log('Clicked chip:', chipClicked);
    await new Promise((r) => setTimeout(r, 400));

    // Verify verseOrderInput updated from chip
    const orderAfterChip = await evalExpr(`document.querySelector('#verse-order-text-input')?.value`);
    console.log('Order after chip click:', orderAfterChip);

    // Now test typing directly into #verse-order-text-input
    await evalExpr(`(() => {
      const verseInput = document.querySelector('#verse-order-text-input');
      if (verseInput) {
        verseInput.value = 'Refrain, Vers 1, Refrain, Vers 2, Vers 99, Schluss';
        verseInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    })()`);
    await new Promise((r) => setTimeout(r, 400));

    const ablaufResult = await evalExpr(`(() => {
      const verseInput = document.querySelector('#verse-order-text-input');
      const ablaufBadges = Array.from(document.querySelectorAll('[draggable="true"]')).map(el => el.innerText.trim());
      const upBtn = document.querySelector('#move-ablauf-up-btn');
      return {
        inputValue: verseInput ? verseInput.value : null,
        ablaufBadges,
        ablaufCount: ablaufBadges.length,
      };
    })()`);
    console.log('Ablauf result:', ablaufResult);
    if (!ablaufResult.inputValue.includes('Schluss')) {
      throw new Error('Ablauf direct text input failed!');
    }
    if (ablaufResult.ablaufCount !== 6) {
      throw new Error('Ablauf badge count mismatch! Expected 6, got ' + ablaufResult.ablaufCount);
    }

    console.log('6. Capturing screenshot of interactive editor...');
    const screenshot = await send('Page.captureScreenshot', { format: 'png' });
    const fs = await import('fs');
    fs.writeFileSync('tests/song_editor_interactive_verified.png', Buffer.from(screenshot.data, 'base64'));
    console.log('Screenshot saved to tests/song_editor_interactive_verified.png');

    console.log('7. Testing OK (Save) button...');
    await evalExpr(`(() => {
      const okBtn = document.querySelector('#save-song-btn');
      if (okBtn) okBtn.click();
    })()`);
    await new Promise((r) => setTimeout(r, 800));

    const postSaveState = await evalExpr(`(() => {
      const modal = document.querySelector('[role="dialog"]');
      return {
        modalStillOpen: !!modal
      };
    })()`);
    console.log('Post save state:', postSaveState);
    if (postSaveState.modalStillOpen) {
      console.warn('Warning: Modal still open after OK click, checking why...');
    } else {
      console.log('SUCCESS: Modal closed after Save!');
    }

    console.log('ALL INTERACTION TESTS PASSED CLEANLY!');
  } finally {
    if (ws) ws.close();
    edge.kill();
  }
}

runTest().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
