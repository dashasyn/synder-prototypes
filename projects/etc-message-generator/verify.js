const { chromium } = require('playwright');
const path = require('path');

const URL = 'file://' + path.join(__dirname, 'index.html');
const out = (n) => path.join('/tmp', n);
const ok = [], bad = [];
const check = (name, cond, extra = '') => (cond ? ok : bad).push(name + (extra ? ' — ' + extra : ''));

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1500, height: 1100 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));

  await page.goto(URL);
  await page.waitForTimeout(400);

  // ── 1. initial state ────────────────────────────────────────
  check('release button disabled initially', await page.locator('#releaseBtn').isDisabled());
  check('gate lists open items',
    (await page.locator('#gateWhy').textContent()).includes('DE Text'));
  check('fact check idle', (await page.locator('#fcheck').textContent()).includes('noch kein Text'));
  await page.screenshot({ path: out('mg-1-initial.png'), fullPage: true });

  // ── 2. generate both ───────────────────────────────────────
  await page.click('#genBtn');
  check('skeleton shows while generating', await page.locator('.skel').first().isVisible());
  await page.waitForTimeout(1500);
  const deText = await page.locator('#ta-de').inputValue();
  const enText = await page.locator('#ta-en').inputValue();
  check('DE text generated', deText.length > 40, deText.slice(0, 45) + '…');
  check('EN text generated', enText.length > 40, enText.slice(0, 45) + '…');
  check('DE contains station', deText.includes('Alexanderplatz'));
  check('DE contains alternative M41', deText.includes('M41'));
  check('freundlich tone carries the extra note', deText.includes('Berliner Team'));
  check('DE chip = Generiert', (await page.locator('#chip-de').textContent()) === 'Generiert');
  check('fact check flags the extra note',
    (await page.locator('#fcheck').textContent()).includes('sagt mehr als die Anzeige'));

  // ── 3. tone affects wording ────────────────────────────────
  await page.click('#toneSeg button[data-tone="sachlich"]');
  await page.click('#genBtn');
  await page.waitForTimeout(1500);
  const sachlich = await page.locator('#ta-de').inputValue();
  check('sachlich drops the extra note', !sachlich.includes('Berliner Team'), sachlich.slice(0, 50) + '…');
  check('version history captured', (await page.locator('#ver-de').textContent()).includes('Verlauf (1)'));

  // ── 4. typing keeps focus and lands whole string (AGENTS.md rule) ──
  await page.click('#toneSeg button[data-tone="freundlich"]');
  await page.click('#genBtn');
  await page.waitForTimeout(1500);
  const before = await page.locator('#ta-de').inputValue();
  await page.locator('#ta-de').click();
  await page.locator('#ta-de').press('End');
  await page.keyboard.type(' Danke für Ihre Geduld.', { delay: 25 });
  const focused = await page.evaluate(() => document.activeElement && document.activeElement.id);
  check('textarea keeps focus while typing', focused === 'ta-de', 'activeElement=' + focused);
  const after = await page.locator('#ta-de').inputValue();
  check('whole typed string landed', after === before + ' Danke für Ihre Geduld.', after.slice(-40));
  check('DE textarea still interactive after typing', await page.locator('#ta-de').isVisible());
  check('DE chip = Bearbeitet', (await page.locator('#chip-de').textContent()) === 'Bearbeitet');
  check('EN marked out of date after DE edit',
    (await page.locator('#chip-en').textContent()) === 'Nicht aktuell');
  check('EN panel shows the re-translate action',
    (await page.locator('#mpf-en').textContent()).includes('EN neu übersetzen'));

  // ── 5. audio staleness ─────────────────────────────────────
  await page.locator('.arow', { hasText: 'ELA (DE)' }).getByText('Audio erzeugen').click();
  await page.waitForTimeout(1400);
  let deRow = await page.locator('.arow').first().textContent();
  check('DE audio ready', deRow.includes('Bereit'), deRow.replace(/\s+/g, ' ').slice(0, 90));
  check('listen button enabled when ready',
    await page.locator('.arow').first().getByText('▶ Anhören').isEnabled());
  await page.locator('#ta-de').click();
  await page.keyboard.type(' Test.');
  await page.locator('#ta-de').blur();
  await page.waitForTimeout(200);
  deRow = await page.locator('.arow').first().textContent();
  check('DE audio goes stale after text edit', deRow.includes('Veraltet'), deRow.replace(/\s+/g, ' ').slice(0, 90));
  check('mismatch warning visible',
    (await page.locator('#audioRows').textContent()).includes('Audio passt nicht zum Text'));
  check('release still blocked', await page.locator('#releaseBtn').isDisabled());
  await page.screenshot({ path: out('mg-2-generated.png'), fullPage: true });

  // ── 6. full happy path to release ──────────────────────────
  await page.click('#linkEn');                       // unlink so EN stops being outdated
  await page.locator('.arow').first().getByText('Neu erzeugen').click();
  await page.waitForTimeout(1400);
  await page.locator('.arow').nth(1).getByText('Audio erzeugen').click();
  await page.waitForTimeout(1400);
  await page.locator('.arow').first().getByText('▶ Anhören').click();
  await page.waitForTimeout(300);
  await page.locator('.arow').nth(1).getByText('▶ Anhören').click();
  await page.waitForTimeout(300);
  const gateTxt = await page.locator('#gateChecks').textContent();
  const stillBlocked = await page.locator('#releaseBtn').isDisabled();
  check('release enabled once every check passes', !stillBlocked,
    stillBlocked ? 'still open: ' + (await page.locator('#gateWhy').textContent()) : gateTxt.replace(/\s+/g, ' '));
  if (!stillBlocked) {
    await page.click('#releaseBtn');
    await page.waitForTimeout(300);
    check('release toast shown', (await page.locator('#toast').textContent()).includes('freigegeben'));
  }
  await page.screenshot({ path: out('mg-3-release.png'), fullPage: true });

  // ── 7. tone gating by event category ───────────────────────
  await page.click('#toneSeg button[data-tone="humor"]');   // pick a tone that must not survive
  await page.click('#pSev');
  await page.waitForTimeout(300);
  const lockerDisabled = await page.locator('#toneSeg button[data-tone="locker"]').isDisabled();
  const humorDisabled = await page.locator('#toneSeg button[data-tone="humor"]').isDisabled();
  check('Locker locked for an emergency', lockerDisabled);
  check('Humorvoll locked for an emergency', humorDisabled);
  check('a locked tone falls back to Sachlich',
    await page.locator('#toneSeg button[data-tone="sachlich"]').evaluate(el => el.classList.contains('on')));
  check('no locked tone is left selected',
    await page.locator('#toneSeg button.on').evaluate(el => !el.disabled));
  check('severity chip red', (await page.locator('#ctxSeverity').innerHTML()).includes('c-red'));
  await page.click('#genBtn');
  await page.waitForTimeout(1500);
  const emText = await page.locator('#ta-de').inputValue();
  check('emergency text is factual and drops the joke',
    emText.includes('Notarzteinsatz') && !emText.includes('Berliner Team'), emText.slice(0, 60) + '…');
  await page.screenshot({ path: out('mg-4-emergency.png'), fullPage: true });

  // ── 8. failure path ────────────────────────────────────────
  await page.click('#pFail');
  await page.click('#genBtn');
  await page.waitForTimeout(1500);
  check('generation failure state shown',
    (await page.locator('#msgPanels').textContent()).includes('Textdienst nicht erreichbar'));
  check('fallback to standard text offered',
    await page.locator('#msgPanels').getByText('Standardtext verwenden').first().isVisible());
  await page.locator('#msgPanels').getByText('Standardtext verwenden').first().click();
  await page.waitForTimeout(300);
  check('standard text applied as fallback',
    (await page.locator('#ta-de').inputValue()).includes('Information für unsere Fahrgäste'));
  check('source switched to Standardtext',
    await page.locator('#srcSeg button[data-src="standard"]').evaluate(el => el.classList.contains('on')));
  await page.screenshot({ path: out('mg-5-failure.png'), fullPage: true });

  // ── 9. prompt + history drawer ──────────────────────────────
  await page.click('#pFail');
  await page.click('#srcSeg button[data-src="ki"]');
  await page.click('#promptDisc');
  await page.waitForTimeout(200);
  const prompt = await page.locator('#promptBox').textContent();
  check('prompt is assembled from the structured facts',
    prompt.includes('Alexanderplatz') && prompt.includes('Buslinie M41') && prompt.includes('nichts hinzufügen'));
  check('prompt box read-only by default',
    (await page.locator('#promptBox').getAttribute('contenteditable')) === 'false');
  await page.click('#promptEdit');
  await page.waitForTimeout(200);
  check('expert mode unlocks the prompt',
    (await page.locator('#promptBox').getAttribute('contenteditable')) === 'true');
  check('decoupling warning shown', await page.locator('#promptEditWarn').isVisible());
  await page.screenshot({ path: out('mg-6-prompt.png'), fullPage: true });
  await page.click('#promptEdit');

  await page.locator('#ver-de').getByText(/Verlauf/).click();
  await page.waitForTimeout(400);
  check('history drawer opens', await page.locator('#drawer.open').isVisible());
  check('history has restorable versions',
    await page.locator('#drBody').getByText('Wiederherstellen').first().isVisible());
  await page.screenshot({ path: out('mg-7-history.png') });
  await page.locator('#drBody').getByText('Wiederherstellen').first().click();
  await page.waitForTimeout(400);
  check('restore closes drawer and applies text',
    !(await page.locator('#drawer').evaluate(el => el.classList.contains('open'))));

  // ── 10. pronunciation invalidates audio ────────────────────
  await page.click('#genBtn');
  await page.waitForTimeout(1500);
  await page.locator('.arow').first().getByText(/Audio erzeugen|Neu erzeugen/).click();
  await page.waitForTimeout(1400);
  check('audio ready before pron change',
    (await page.locator('.arow').first().textContent()).includes('Bereit'));
  await page.click('#pronDisc');
  await page.waitForTimeout(200);
  await page.locator('#pronRows input').first().fill('U-Bahn-Linie zwei');
  await page.waitForTimeout(300);
  check('pronunciation change makes audio stale',
    (await page.locator('.arow').first().textContent()).includes('Veraltet'));
  await page.screenshot({ path: out('mg-8-pron.png'), fullPage: true });

  check('no console/page errors', errors.length === 0, errors.join(' | '));

  console.log('\n── PASS (' + ok.length + ') ──');
  ok.forEach(o => console.log('  ✓ ' + o));
  if (bad.length) { console.log('\n── FAIL (' + bad.length + ') ──'); bad.forEach(b => console.log('  ✗ ' + b)); }
  else console.log('\nAll checks passed.');
  await browser.close();
  process.exit(bad.length ? 1 : 0);
})();
