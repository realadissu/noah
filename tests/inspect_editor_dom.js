import { spawn } from 'child_process';

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
    const ws = new WebSocket(page.webSocketDebuggerUrl);
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

    await new Promise((r) => setTimeout(r, 1000));
    // Open Song Editor
    await evalExpr(`(() => {
      const btn = document.querySelector('button[title*="bearbeiten"], button[title*="Bearbeiten"], button[title*="Edit"], button[title*="edit"]');
      if (btn) btn.click();
    })()`);
    await new Promise((r) => setTimeout(r, 800));

    // Inspect editor elements
    const inspection = await evalExpr(`(() => {
      const modal = document.querySelector('[role="dialog"]');
      if (!modal) return { error: 'Modal not found' };
      const titleInput = document.querySelector('#song-title-input');
      const textarea = document.querySelector('textarea');
      const backdrop = document.querySelector('[aria-hidden="true"].font-mono');
      const radios = Array.from(document.querySelectorAll('input[name="langCountRadio"]')).map((r) => ({
        value: r.value,
        checked: r.checked,
        disabled: r.disabled
      }));
      const ablaufItems = Array.from(document.querySelectorAll('[draggable="true"]')).map((el) => el.innerText);

      return {
        modalStyle: {
          pointerEvents: window.getComputedStyle(modal).pointerEvents,
          userSelect: window.getComputedStyle(modal).userSelect,
        },
        titleInput: titleInput
          ? {
              value: titleInput.value,
              readOnly: titleInput.readOnly,
              disabled: titleInput.disabled,
              pointerEvents: window.getComputedStyle(titleInput).pointerEvents,
            }
          : null,
        textarea: textarea
          ? {
              valueLength: textarea.value.length,
              readOnly: textarea.readOnly,
              disabled: textarea.disabled,
              color: window.getComputedStyle(textarea).color,
              caretColor: window.getComputedStyle(textarea).caretColor,
              pointerEvents: window.getComputedStyle(textarea).pointerEvents,
              userSelect: window.getComputedStyle(textarea).userSelect,
              zIndex: window.getComputedStyle(textarea).zIndex,
              rect: textarea.getBoundingClientRect(),
            }
          : null,
        backdrop: backdrop
          ? {
              rect: backdrop.getBoundingClientRect(),
              pointerEvents: window.getComputedStyle(backdrop).pointerEvents,
              zIndex: window.getComputedStyle(backdrop).zIndex,
            }
          : null,
        radios,
        ablaufItems,
      };
    })()`);
    console.log('Inspection Result:', JSON.stringify(inspection, null, 2));

    // Test real dispatch events
    const interactionTest = await evalExpr(`(() => {
      const titleInput = document.querySelector('#song-title-input');
      const textarea = document.querySelector('textarea');
      const radio2 = document.querySelector('input[name="langCountRadio"][value="2"]');

      return {
        titleFocused: document.activeElement === titleInput,
        hasTextarea: !!textarea,
        hasRadio: !!radio2,
      };
    })()`);
    console.log('Interaction initial state:', interactionTest);
  } finally {
    edge.kill();
  }
}

main().catch(console.error);
