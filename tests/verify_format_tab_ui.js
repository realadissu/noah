import { spawn } from 'child_process';
import fs from 'fs';

async function main() {
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

    if (!page) {
      throw new Error('Could not find active Vite page target in Edge CDP');
    }

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

    // Open Song Editor Modal via evaluate
    const openRes = await send('Runtime.evaluate', {
      expression: `(() => {
        // Find edit song button or trigger through presentation store
        const editBtn = document.querySelector('button[title*="bearbeiten"], button[aria-label*="bearbeiten"]') ||
                        Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('bearbeiten') || b.textContent.includes('Edit'));
        if (editBtn) {
          editBtn.click();
          return 'clicked edit button';
        }
        return 'no edit button found';
      })()`,
      returnByValue: true
    });
    console.log('Open editor action:', openRes.result?.value);

    await new Promise((r) => setTimeout(r, 800));

    // Switch to Formatierung Tab
    const tabRes = await send('Runtime.evaluate', {
      expression: `(() => {
        const tabs = Array.from(document.querySelectorAll('button'));
        const formatTab = tabs.find(b => b.textContent.trim() === 'Formatierung' || b.textContent.trim() === 'Formatting');
        if (formatTab) {
          formatTab.click();
          return 'switched to format tab';
        }
        return 'format tab not found';
      })()`,
      returnByValue: true
    });
    console.log('Switch tab action:', tabRes.result?.value);

    await new Promise((r) => setTimeout(r, 800));

    // Toggle "Song-spezifische Anpassungen aktivieren" to ON so all controls are active and visible
    const toggleRes = await send('Runtime.evaluate', {
      expression: `(() => {
        const masterCheck = document.getElementById('master-use-own-profile');
        if (masterCheck && !masterCheck.checked) {
          masterCheck.click();
          return 'enabled master check';
        }
        return 'master check already enabled or not found';
      })()`,
      returnByValue: true
    });
    console.log('Toggle master check:', toggleRes.result?.value);

    await new Promise((r) => setTimeout(r, 800));

    // Verify all 4 languages and controls exist
    const verifyDom = await send('Runtime.evaluate', {
      expression: `(() => {
        const text = document.body.innerText;
        return {
          hasMasterCheck: !!document.getElementById('master-use-own-profile'),
          hasFont1: !!document.getElementById('font-family-lang1'),
          hasFont2: !!document.getElementById('font-family-lang2'),
          hasLang1: text.includes('Sprache 1:') || text.includes('Language 1:'),
          hasLang2: text.includes('Sprache 2:') || text.includes('Language 2:'),
          hasLang3: text.includes('Sprache 3:') || text.includes('Language 3:'),
          hasLang4: text.includes('Sprache 4:') || text.includes('Language 4:'),
          hasChords: text.includes('Akkorde:') || text.includes('Chords:'),
          hasOutline: !!document.getElementById('outline-toggle'),
          hasShadow: !!document.getElementById('shadow-toggle'),
          noSpezialformatierung: !text.includes('Spezialformatierung') && !text.includes('Pre-Line'),
        };
      })()`,
      returnByValue: true
    });
    console.log('Format Tab DOM Verification:', JSON.stringify(verifyDom.result?.value, null, 2));

    const v = verifyDom.result?.value;
    if (!v.hasMasterCheck || !v.hasFont1 || !v.hasLang1 || !v.hasLang2 || !v.hasLang3 || !v.hasLang4 || !v.noSpezialformatierung) {
      throw new Error('Format Tab DOM verification failed: ' + JSON.stringify(v));
    }

    // Capture screenshot
    const screenshot = await send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(screenshot.data, 'base64');
    const outDir = 'C:/Users/wolfgangmeincke/.gemini/antigravity-ide/brain/e51cb7cc-c85b-41d8-a26f-9ab32ccafd1a/.tempmediaStorage';
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = `${outDir}/format_tab_verified.png`;
    fs.writeFileSync(outPath, buffer);
    console.log(`Saved screenshot to ${outPath}`);

    ws.close();
  } finally {
    edge.kill();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
