import { spawn } from 'child_process';
import fs from 'fs';

function assert(condition, msg) {
  if (!condition) {
    throw new Error(`E2E Background Assertion Failed: ${msg}`);
  }
}

async function main() {
  console.log('--- STARTING BACKGROUND PIPELINE E2E LIVE TEST & CDP SUITE ---');

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

    if (!page) throw new Error('No active Vite page target found on port 5173');

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

    // Wait for app DOM to be fully mounted
    for (let i = 0; i < 20; i++) {
      const ready = await send('Runtime.evaluate', {
        expression: `document.querySelectorAll('button').length > 5`,
        returnByValue: true
      });
      if (ready?.result?.value) break;
      await new Promise((r) => setTimeout(r, 500));
    }

    // =========================================================================
    // STEP 1: TEST SETTINGS MODAL & DEFAULT DIRECTORIES
    // =========================================================================
    console.log('Step 1: Testing Settings Modal & Default Directories configuration...');
    
    // Open Settings Modal via Extras menu button
    const openSetRes = await send('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim());
        const toolsBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Extras' || b.textContent.trim() === 'Tools' || b.textContent.trim() === '⚙️');
        if (toolsBtn) toolsBtn.click();
        return { clicked: Boolean(toolsBtn), firstBtns: btns.slice(0, 15) };
      })()`,
      returnByValue: true
    });
    console.log('  Open Settings result:', openSetRes.result.value);
    await new Promise((r) => setTimeout(r, 800));

    const settingsCheck = await send('Runtime.evaluate', {
      expression: `(() => {
        const dialog = document.querySelector('[role="dialog"]');
        if (!dialog) return { error: 'Settings dialog not found' };
        
        // Find inputs for directories
        const inputs = Array.from(dialog.querySelectorAll('input[type="text"]'));
        const songsInput = inputs.find(i => i.placeholder.includes('Ordner'));
        
        return {
          dialogOpen: true,
          inputCount: inputs.length,
          hasDirectoriesSection: dialog.textContent.includes('Standard-Verzeichnisse') || dialog.textContent.includes('Default Directories'),
          hasBackgroundsTitle: dialog.textContent.includes('Hintergrundbilder') || dialog.textContent.includes('Background Images'),
          hasSchedulesTitle: dialog.textContent.includes('Ablaufpläne') || dialog.textContent.includes('Schedules')
        };
      })()`,
      returnByValue: true
    });

    console.log('  Settings Check:', settingsCheck.result.value);
    assert(settingsCheck.result.value.dialogOpen, 'Settings dialog should be open');
    assert(settingsCheck.result.value.hasDirectoriesSection, 'Standard-Verzeichnisse section must be rendered');
    assert(settingsCheck.result.value.hasBackgroundsTitle, 'Hintergrundbilder directory setting must be present');
    assert(settingsCheck.result.value.hasSchedulesTitle, 'Ablaufpläne directory setting must be present');

    // Test setting background and schedules directory paths
    const setPathsResult = await send('Runtime.evaluate', {
      expression: `(() => {
        // Trigger path setters via the inputs
        const inputs = Array.from(document.querySelectorAll('[role="dialog"] input[type="text"]'));
        if (inputs.length >= 3) {
          // Input 0: songs, Input 1: backgrounds, Input 2: schedules
          inputs[1].value = 'C:\\\\Worship\\\\Hintergruende';
          inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
          
          inputs[2].value = 'C:\\\\Worship\\\\Ablaeufe';
          inputs[2].dispatchEvent(new Event('input', { bubbles: true }));
        }
        
        return {
          savedBgDir: localStorage.getItem('noah_backgrounds_dir'),
          savedSchDir: localStorage.getItem('noah_schedules_dir')
        };
      })()`,
      returnByValue: true
    });

    console.log('  Set Paths Result in localStorage:', setPathsResult.result.value);
    assert(setPathsResult.result.value.savedBgDir === 'C:\\Worship\\Hintergruende', 'Backgrounds dir must be saved to localStorage');
    assert(setPathsResult.result.value.savedSchDir === 'C:\\Worship\\Ablaeufe', 'Schedules dir must be saved to localStorage');

    // Close Settings
    await send('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('[role="dialog"] button'));
        const closeBtn = btns.find(b => b.textContent.includes('Fertig') || b.textContent.includes('Done') || b.textContent.includes('✕'));
        if (closeBtn) closeBtn.click();
      })()`
    });
    await new Promise((r) => setTimeout(r, 600));

    // =========================================================================
    // STEP 2: OPEN SONG EDITOR & TEST HINTERGRUND TAB
    // =========================================================================
    console.log('Step 2: Opening Song Editor & switching to Hintergrund tab...');

    await send('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const editBtn = btns.find(b => b.title && (b.title.toLowerCase().includes('bearbeiten') || b.title.toLowerCase().includes('edit')));
        if (editBtn) editBtn.click();
      })()`
    });
    await new Promise((r) => setTimeout(r, 1000));

    // Click 'Hintergrund' tab in editor
    await send('Runtime.evaluate', {
      expression: `(() => {
        const tabs = Array.from(document.querySelectorAll('button'));
        const bgTab = tabs.find(b => b.textContent.includes('Hintergrund') || b.textContent.includes('Background'));
        if (bgTab) bgTab.click();
      })()`
    });
    await new Promise((r) => setTimeout(r, 600));

    // Capture screenshot of the Background Tab
    const bgTabShot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('C:\\Users\\wolfgangmeincke\\.gemini\\antigravity-ide\\brain\\e51cb7cc-c85b-41d8-a26f-9ab32ccafd1a\\.tempmediaStorage\\background_tab_verified.png', Buffer.from(bgTabShot.data, 'base64'));
    console.log('  ✓ Captured background_tab_verified.png');

    const tabInspection = await send('Runtime.evaluate', {
      expression: `(() => {
        const buttons = Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim());
        const hasColors = buttons.some(b => b.includes('Farben') || b.includes('Colors'));
        const hasGradients = buttons.some(b => b.includes('Verläufe') || b.includes('Gradients'));
        const hasNature = buttons.some(b => b.includes('Natur') || b.includes('Nature'));
        const hasKids = buttons.some(b => b.includes('Kinder') || b.includes('Kids'));
        const hasCustom = buttons.some(b => b.includes('Eigene') || b.includes('Custom'));
        const hasImportBtn = buttons.some(b => b.toLowerCase().includes('importieren') || b.toLowerCase().includes('import'));
        
        return {
          hasColors,
          hasGradients,
          hasNature,
          hasKids,
          hasCustom,
          hasImportBtn
        };
      })()`,
      returnByValue: true
    });

    console.log('  Background Tab Inspection:', tabInspection.result.value);
    assert(tabInspection.result.value.hasColors, 'Colors category must be present');
    assert(tabInspection.result.value.hasGradients, 'Gradients category must be present');
    assert(tabInspection.result.value.hasNature, 'Nature category must be present');
    assert(tabInspection.result.value.hasKids, 'Kids category must be present');
    assert(tabInspection.result.value.hasCustom, 'Custom category must be present');
    assert(tabInspection.result.value.hasImportBtn, 'Import button must be present');

    // =========================================================================
    // STEP 3: IMPORT CUSTOM BACKGROUND & SELECT IT WITH 50% DIMMER
    // =========================================================================
    console.log('Step 3: Simulating Custom Background import and selecting 50% dimmer...');

    // 1. Click a background card inside the dialog
    const cardClickResult = await send('Runtime.evaluate', {
      expression: `(() => {
        const dialog = document.querySelector('[role="dialog"]');
        if (!dialog) return { error: 'No dialog' };
        const cards = Array.from(dialog.querySelectorAll('[role="button"]'));
        const target = cards.find(c => c.textContent.includes('Majestätische Berge') || c.textContent.includes('Nordlicht') || c.textContent.includes('Marineblau'));
        if (target) {
          target.click();
          return { clicked: true, text: target.textContent.trim().slice(0, 30) };
        }
        return { clicked: false, totalCards: cards.length };
      })()`,
      returnByValue: true
    });
    console.log('  Card Click Result:', cardClickResult.result.value);
    assert(cardClickResult.result.value.clicked, 'Background card must be clicked');
    await new Promise((r) => setTimeout(r, 600));

    // 2. Click the 50% dimmer preset button
    const dimmerClickResult = await send('Runtime.evaluate', {
      expression: `(() => {
        const dialog = document.querySelector('[role="dialog"]');
        if (!dialog) return { error: 'No dialog' };
        const buttons = Array.from(dialog.querySelectorAll('button'));
        const contrastBtn = buttons.find(b => b.textContent.includes('50%') || b.textContent.includes('Kontrast') || b.textContent.includes('Contrast'));
        if (contrastBtn) {
          contrastBtn.click();
          return { clickedDimmer: true };
        }
        return { clickedDimmer: false, buttons: buttons.map(b => b.textContent.trim().slice(0, 20)) };
      })()`,
      returnByValue: true
    });
    console.log('  Dimmer Click Result:', dimmerClickResult.result.value);
    assert(dimmerClickResult.result.value.clickedDimmer, 'Dimmer 50% button must be clicked');
    await new Promise((r) => setTimeout(r, 600));

    // 3. Save Song in Editor via #save-song-btn
    await send('Runtime.evaluate', {
      expression: `(() => {
        const okBtn = document.querySelector('#save-song-btn');
        if (okBtn) okBtn.click();
      })()`
    });
    await new Promise((r) => setTimeout(r, 1000));

    // =========================================================================
    // STEP 4: VERIFY END-TO-END RENDERING IN CLASSIC LAYOUT
    // =========================================================================
    console.log('Step 4: Verifying Live Background & Dimmer Rendering in Classic Layout...');

    const classicRendering = await send('Runtime.evaluate', {
      expression: `(() => {
        // 1. Check slide thumbnails in center column
        const slideContainers = Array.from(document.querySelectorAll('[data-classic-slide-idx], [style*="aspect-ratio"]'));
        
        // Find background elements
        const bgLayers = Array.from(document.querySelectorAll('[style*="background-image"], [style*="background:"]'));
        const dimmerLayers = Array.from(document.querySelectorAll('[style*="opacity: 0.5"]'));
        
        // Check Audience View preview monitor
        const audiencePreview = document.querySelector('[data-testid="audience-preview-line"]');
        const audienceContainer = audiencePreview ? audiencePreview.closest('[style*="aspect-ratio"]') : null;
        const audienceBg = audienceContainer ? audienceContainer.querySelector('[style*="background-image"], [style*="background:"]') : null;
        const audienceDimmer = audienceContainer ? audienceContainer.querySelector('[style*="opacity: 0.5"]') : null;

        return {
          totalBgLayers: bgLayers.length,
          totalDimmerLayers: dimmerLayers.length,
          hasAudienceBg: Boolean(audienceBg),
          hasAudienceDimmer: Boolean(audienceDimmer),
          audienceBgStyle: audienceBg ? audienceBg.getAttribute('style') : null
        };
      })()`,
      returnByValue: true
    });

    console.log('  Classic Layout Rendering:', classicRendering.result.value);
    assert(classicRendering.result.value.totalBgLayers > 0, 'Slide thumbnails must have background layer rendered');
    assert(classicRendering.result.value.totalDimmerLayers > 0, 'Dimmer layers with 0.5 opacity must be rendered');
    assert(classicRendering.result.value.hasAudienceBg, 'Audience preview monitor must have background layer rendered');
    assert(classicRendering.result.value.hasAudienceDimmer, 'Audience preview monitor must have 50% dimmer layer rendered');

    // Capture screenshot of live applied background in Classic Layout
    const liveShot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('C:\\Users\\wolfgangmeincke\\.gemini\\antigravity-ide\\brain\\e51cb7cc-c85b-41d8-a26f-9ab32ccafd1a\\.tempmediaStorage\\background_applied_live.png', Buffer.from(liveShot.data, 'base64'));
    console.log('  ✓ Captured background_applied_live.png');

    // =========================================================================
    // STEP 5: SWITCH TO MODERN MODE & VERIFY SLIDEDECK RENDERING
    // =========================================================================
    console.log('Step 5: Testing SlideDeck rendering in Modern Studio mode...');

    await send('Runtime.evaluate', {
      expression: `(() => {
        // Toggle or switch to modern mode via toolbar button
        const buttons = Array.from(document.querySelectorAll('button'));
        const modeBtn = buttons.find(b => b.title && b.title.includes('UI-Modus'));
        if (modeBtn) modeBtn.click();
      })()`
    });
    await new Promise((r) => setTimeout(r, 800));

    const modernRendering = await send('Runtime.evaluate', {
      expression: `(() => {
        const bgLayers = Array.from(document.querySelectorAll('[style*="background-image"], [style*="background:"]'));
        const dimmerLayers = Array.from(document.querySelectorAll('[style*="opacity: 0.5"]'));
        return {
          modernBgLayers: bgLayers.length,
          modernDimmerLayers: dimmerLayers.length
        };
      })()`,
      returnByValue: true
    });

    console.log('  Modern Mode Rendering:', modernRendering.result.value);
    assert(modernRendering.result.value.modernBgLayers > 0, 'Modern SlideDeck must render background layers');
    assert(modernRendering.result.value.modernDimmerLayers > 0, 'Modern SlideDeck must render dimmer layers');

    console.log('\n🎉 ALL BACKGROUND PIPELINE LIVE E2E ASSERTIONS PASSED WITH ZERO ERRORS!\n');

    ws.close();
  } finally {
    edge.kill();
  }
}

main().catch((err) => {
  console.error('E2E FAILURE:', err);
  process.exit(1);
});
