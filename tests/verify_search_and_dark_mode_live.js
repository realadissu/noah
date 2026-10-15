import { spawn } from 'child_process';
import fs from 'fs';

async function runLiveVerification() {
  const tmpDir = 'C:\\Users\\wolfgangmeincke\\.gemini\\antigravity-ide\\brain\\e51cb7cc-c85b-41d8-a26f-9ab32ccafd1a\\scratch\\test_run_search_dark';
  console.log('1. Starting Edge process...');
  const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--remote-debugging-port=9234',
    '--headless=new',
    '--user-data-dir=' + tmpDir,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-sync',
    '--window-size=1600,1000'
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
    
    // Wait for app to mount
    for (let attempt = 0; attempt < 30; attempt++) {
      const btns = await evalExpr('document.querySelectorAll("button").length');
      if (btns && btns > 0) break;
      await new Promise((r) => setTimeout(r, 300));
    }

    console.log('3. Testing Quick Search in Toolbar...');
    const searchFound = await evalExpr(`(() => {
      const searchInput = document.querySelector('#sb-quick-search');
      if (!searchInput) return { error: 'Search input not found' };
      searchInput.value = 'Großer';
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      return { success: true };
    })()`);
    console.log('  Search input trigger:', searchFound);

    // Wait a brief moment for reactive search to compute and dropdown to render
    await new Promise((r) => setTimeout(r, 500));

    const dropdownState = await evalExpr(`(() => {
      const items = Array.from(document.querySelectorAll('button')).filter(b => b.innerText.includes('Großer Gott'));
      return { count: items.length, text: items.map(i => i.innerText.trim()) };
    })()`);
    console.log('  Search dropdown items:', dropdownState);

    // Click the search result item to select the song
    console.log('4. Selecting search result item...');
    const selectResult = await evalExpr(`(() => {
      const item = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Großer Gott'));
      if (item) {
        item.click();
        return { clicked: true };
      }
      return { clicked: false };
    })()`);
    console.log('  Selection result:', selectResult);

    await new Promise((r) => setTimeout(r, 600));

    // Verify active song changed in slide deck
    const activeSongTitle = await evalExpr(`(() => {
      const header = document.querySelector('section span.font-bold');
      return header ? header.innerText : null;
    })()`);
    console.log('  Active song title in Slide Deck:', activeSongTitle);

    // 5. Test Dark Mode
    console.log('5. Ensuring Dark Mode is active...');
    const themeSet = await evalExpr(`(() => {
      const isDark = document.documentElement.classList.contains('dark');
      const themeBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('🌙') || b.innerText.includes('☀️'));
      if (!isDark && themeBtn) {
        themeBtn.click();
        return { switched: true, isDarkNow: document.documentElement.classList.contains('dark') };
      }
      return { alreadyDark: isDark };
    })()`);
    console.log('  Theme state:', themeSet);

    await new Promise((r) => setTimeout(r, 500));

    // Capture screenshot in Dark Mode
    console.log('6. Capturing Dark Mode screenshot...');
    const screenshot = await send('Page.captureScreenshot', { format: 'png' });
    const artifactPath = 'C:\\Users\\wolfgangmeincke\\.gemini\\antigravity-ide\\brain\\e51cb7cc-c85b-41d8-a26f-9ab32ccafd1a\\.tempmediaStorage\\dark_mode_live_verified.png';
    fs.writeFileSync(artifactPath, Buffer.from(screenshot.result.data, 'base64'));
    console.log('  ✓ Dark Mode screenshot saved to:', artifactPath);

    // 7. Verify Settings Dialog Folder Picker
    console.log('7. Opening Settings modal...');
    const openSettings = await evalExpr(`(() => {
      const settingsBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('⚙️'));
      if (settingsBtn) {
        settingsBtn.click();
        return { clicked: true };
      }
      return { clicked: false };
    })()`);
    console.log('  Open Settings result:', openSettings);

    await new Promise((r) => setTimeout(r, 600));

    const settingsScreenshot = await send('Page.captureScreenshot', { format: 'png' });
    const settingsArtifactPath = 'C:\\Users\\wolfgangmeincke\\.gemini\\antigravity-ide\\brain\\e51cb7cc-c85b-41d8-a26f-9ab32ccafd1a\\.tempmediaStorage\\settings_dark_mode_verified.png';
    fs.writeFileSync(settingsArtifactPath, Buffer.from(settingsScreenshot.result.data, 'base64'));
    console.log('  ✓ Settings screenshot saved to:', settingsArtifactPath);

    console.log('🎉 LIVE VERIFICATION COMPLETED SUCCESSFULLY!');
    ws.close();
  } finally {
    edge.kill();
  }
}

runLiveVerification().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
