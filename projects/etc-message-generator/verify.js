const { chromium } = require('playwright');
const path = require('path');

const URL = 'file://' + path.join(__dirname, 'index.html');
const out = n => path.join('/tmp', n);
const ok = [], bad = [];
const check = (name, cond, extra = '') => (cond ? ok : bad).push(name + (extra ? ' — ' + extra : ''));

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1120, height: 1150 } });
  /* A click on a control that never becomes actionable is a finding, not a
     reason to hang the run. */
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  const dialogs = [];
  page.on('dialog', d => { dialogs.push(d.message()); d.accept(); });

  await page.goto(URL);
  await page.waitForTimeout(350);

  const genEla   = () => page.locator('#btnGen');
  const genAudio = () => page.locator('#btnAudio');
  const listen   = () => page.locator('#btnPlay');
  /* Playback is simulated, so the end state is reachable without sitting out a
     20-second announcement. One full real-time playthrough is checked further
     down on the shortest file; everywhere else the run is cut short here. */
  const finishPlayback = async () => {
    await page.evaluate(() => endPlay());
    await page.waitForTimeout(150);
  };
  const useEmpathetic = async () => {
    await page.selectOption('#source', 'empathetic');
    await page.waitForTimeout(250);
  };

  // ── side sheet, not a centred panel ──────────────────────────
  const box = await page.locator('#sheet').boundingBox();
  const vw = page.viewportSize().width;
  check('sheet is anchored to the right edge', Math.abs((box.x + box.width) - vw) < 2,
    'right=' + Math.round(box.x + box.width) + ' vw=' + vw);
  check('sheet leaves the left side uncovered', box.x > 120, 'x=' + Math.round(box.x));
  check('scrim behind it carries no fake content',
    (await page.locator('.scrim').textContent()).trim() === '');
  check('no history button', (await page.locator('.foot').textContent()).toLowerCase().indexOf('verlauf') === -1,
    (await page.locator('.foot').textContent()).replace(/\s+/g,' '));
  check('no history drawer in the DOM', (await page.locator('#drawer').count()) === 0);

  const secs = await page.locator('.sec-t, .sub-t').allTextContents();
  check('sections in screenshot order',
    secs.join('|') === 'Daisy|ELA|Meldungen|Stationen|Geplant', secs.join('|'));
  const meta = await page.locator('#metaRow').textContent();
  check('meta row has Mitteilungen/Typ/Stationen', /Mitteilungen.*Typ.*Stationen/s.test(meta));
  check('meta row has no Gleis', !/Gleis/.test(meta), meta.replace(/\s+/g, ' '));
  check('no Actual stations anywhere',
    !/Actual|Tatsächlich/i.test(await page.locator('#sheet').textContent()));
  check('meta Stationen mirrors the Planned selects', /Rp - No/.test(meta), meta.replace(/\s+/g,' '));
  await page.selectOption('#stBis', 'Gleisdreieck (Gu)');
  await page.waitForTimeout(200);
  check('changing Planned updates the meta row',
    /Rp - Gu/.test(await page.locator('#metaRow').textContent()));
  await page.selectOption('#stBis', 'Nollendorfplatz (No)');

  // ── source dropdown: four points ────────────────────────────
  const srcOpts = await page.locator('#source option').allTextContents();
  check('source has four points in order Standard · Bibliothek · Aufnahme · Empathisch',
    srcOpts.join('|') === 'Standard|Bibliothek|Aufnahme|Empathisch', srcOpts.join('|'));
  check('source defaults to Standard', (await page.locator('#source').inputValue()) === 'standard');
  check('no tone-of-voice selector anywhere', (await page.locator('#tonfall').count()) === 0);
  check('no DEFAULT/STANDARD reset button', (await page.locator('#btnDefault').count()) === 0);

  // ── Standard = predefined system message, nothing generated ──
  const std1 = await page.locator('#ta-de').inputValue();
  check('Standard loads a predefined system message', std1.length > 30, std1);
  check('predefined message is named on the state line',
    (await page.locator('#state-de').textContent()).includes('Vordefinierter Systemtext'),
    (await page.locator('#state-de').textContent()).trim());
  check('predefined EN is a real translation, station name verbatim',
    (await page.locator('#ta-en').inputValue()).includes('Stadtmitte')
    && !/city cent/i.test(await page.locator('#ta-en').inputValue()),
    await page.locator('#ta-en').inputValue());
  check('prompt block hidden for Standard', !(await page.locator('#blkEmpathetic').isVisible()));
  check('GENERATE ELA disabled outside Empathetic', await genEla().isDisabled());
  check('predefined text is editable by hand',
    await page.locator('#ta-de').evaluate(el => !el.readOnly));
  check('Standard follows the event: Erstmeldung has no alternative or duration',
    !/M41/.test(std1) && !/23:30/.test(std1), std1);
  await page.click('#pTyp');
  await page.waitForTimeout(300);
  const std2 = await page.locator('#ta-de').inputValue();
  check('untouched system text follows the event type instead of going stale',
    /Notarzteinsatz/.test(std2) && /M41/.test(std2)
    && (await page.locator('#state-de').textContent()).includes('Vordefinierter Systemtext'),
    std2);
  check('no overwrite confirm for text nobody touched', dialogs.length === 0, dialogs.join(' | '));
  await page.click('#pTyp');
  await page.waitForTimeout(250);
  await page.screenshot({ path: out('mg-1-standard.png'), fullPage: true });

  // ── DAISY is editable ───────────────────────────────────────
  check('DAISY editable', await page.locator('#daisy').getAttribute('readonly') === null);
  check('DAISY counter live', (await page.locator('#daisyCount').textContent()) !== '0');
  await page.locator('#daisy').click();
  await page.locator('#daisy').press('Control+End');
  await page.keyboard.type(' Zusatz.');
  check('typing into DAISY updates the counter',
    (await page.locator('#daisyCount').textContent()) === String((await page.locator('#daisy').inputValue()).length));
  await page.locator('#daisy').fill('x'.repeat(170));
  await page.waitForTimeout(150);
  check('DAISY over 160 is flagged',
    await page.locator('#daisyCounter').evaluate(el => el.classList.contains('over')));
  check('over-length DAISY warns on the save line',
    (await page.locator('#saveWarns').textContent()).includes('160 Zeichen'));
  await page.locator('#daisy').fill('{U2}: Kein Halt {Stadtmitte} aufgrund {Störung}. Weitere Informationen folgen in Kürze. ***');
  await page.waitForTimeout(150);

  // ── Empathetic: read-only prompt + Additional details ───────
  await useEmpathetic();
  check('Empathetic shows the prompt block', await page.locator('#blkEmpathetic').isVisible());
  check('prompt is not editable', await page.locator('#prompt').evaluate(el => el.readOnly));
  check('prompt is still readable, not collapsed',
    await page.locator('#prompt').isVisible()
    && (await page.locator('#prompt').boundingBox()).height > 14,
    'h=' + Math.round((await page.locator('#prompt').boundingBox()).height));
  check('prompt built from the event',
    /U2/.test(await page.locator('#prompt').inputValue())
    && /Stadtmitte/.test(await page.locator('#prompt').inputValue()));
  const promptBefore = await page.locator('#prompt').inputValue();
  await page.locator('#prompt').click();
  await page.keyboard.type('XXX');
  await page.waitForTimeout(150);
  check('typing cannot change the prompt',
    (await page.locator('#prompt').inputValue()) === promptBefore);
  check('Additional details field is present and editable',
    await page.locator('#zusatz').isVisible()
    && await page.locator('#zusatz').evaluate(el => !el.readOnly));
  check('changing the stations rewrites the read-only prompt',
    await (async () => {
      await page.selectOption('#stVon', 'Zoologischer Garten (Zo)');
      await page.waitForTimeout(200);
      const p = await page.locator('#prompt').inputValue();
      await page.selectOption('#stVon', 'Ernst-Reuter-Platz (Rp)');
      await page.waitForTimeout(200);
      return p.includes('Zoologischer Garten');
    })());

  // ── all three ELA buttons sit together ──────────────────────
  const actLabels = (await page.locator('#audioActs button').allTextContents()).map(x => x.trim());
  check('ELA buttons are one row of three: generate text, render, play',
    actLabels.length === 3
    && actLabels[0] === 'ELA GENERIEREN'
    && actLabels[1] === 'AUDIO ERZEUGEN'
    && /ANHÖREN/.test(actLabels[2]),
    actLabels.join(' | '));
  check('no generate button left up in the ELA section',
    (await page.locator('#blkEmpathetic button').count()) === 0);
  check('state line present under both boxes and audio',
    await page.locator('#state-de').isVisible() && await page.locator('#state-en').isVisible()
    && await page.locator('#state-audio').isVisible());
  check('two intervals, independent',
    (await page.locator('#intDaisy').inputValue()) === '5 min'
    && (await page.locator('#intEla').inputValue()) === '5 min');
  await page.selectOption('#intDaisy', '10 min');
  check('Daisy interval does not move the ELA interval',
    (await page.locator('#intEla').inputValue()) === '5 min');
  await page.selectOption('#intDaisy', '5 min');

  // ── generate: EN is a real translation, station name verbatim ──
  check('generate button is called GENERATE ELA',
    (await genEla().textContent()).trim() === 'ELA GENERIEREN',
    (await genEla().textContent()).trim());
  check('GENERATE ELA enabled in Empathetic', await genEla().isEnabled());

  const sheetBox = await page.locator('#sheet').boundingBox();
  const footBox = await page.locator('.sheet-foot').boundingBox();
  check('save footer is pinned to the bottom of the sheet',
    Math.abs((footBox.y + footBox.height) - (sheetBox.y + sheetBox.height)) < 2);
  await page.locator('#sheetBody').evaluate(el => el.scrollTop = el.scrollHeight);
  await page.waitForTimeout(250);
  const footAfter = await page.locator('.sheet-foot').boundingBox();
  check('save footer stays put when the body is scrolled',
    Math.abs(footAfter.y - footBox.y) < 2 && await page.locator('#btnSave').isVisible());
  await page.locator('#sheetBody').evaluate(el => el.scrollTop = 0);
  await page.waitForTimeout(200);

  await page.locator('#zusatz').click();
  await page.keyboard.type('Viel Spaß beim Konzert!');
  await genEla().click();
  await page.waitForTimeout(1400);
  const de1 = await page.locator('#ta-de').inputValue();
  const en1 = await page.locator('#ta-en').inputValue();
  check('DE generated', de1.length > 30, de1);
  check('EN generated', en1.length > 30, en1);
  check('generated wording differs from the predefined system text', de1 !== std1);
  check('EN keeps the station name verbatim', en1.includes('Stadtmitte'), en1);
  check('EN never says "city center"', !/city cent/i.test(en1), en1);
  check('EN keeps the line name verbatim', en1.includes('U2'));
  check('state line shows Generiert + variant, no tone',
    /Generiert.*empathisch.*Variante 1\/3/s.test(await page.locator('#state-de').textContent()),
    (await page.locator('#state-de').textContent()).trim());
  check('additional details landed in DE', de1.includes('Viel Spaß beim Konzert!'), de1);
  check('known phrase landed translated in EN', en1.includes('Enjoy the concert!'), en1);

  // ── each click gives a genuinely different variant ──────────
  const seen = [de1];
  for (let i = 0; i < 3; i++) {
    await genEla().click();
    await page.waitForTimeout(1200);
    seen.push(await page.locator('#ta-de').inputValue());
  }
  check('three distinct variants, then it cycles',
    new Set(seen.slice(0, 3)).size === 3 && seen[3] === seen[0],
    seen.map((x, i) => i + ':' + x.slice(0, 26)).join(' | '));
  check('variant number shown in the state line',
    /Variante \d\/3/.test(await page.locator('#state-de').textContent()));

  // generation goes busy and shows progress (UX corroborated 3/3)
  await genEla().click();
  await page.waitForTimeout(200);
  check('generate button is disabled while generating', await genEla().isDisabled());
  check('generate button says GENERIERT while busy',
    (await genEla().textContent()).includes('GENERIERT'));
  check('generation shows a progress bar', await page.locator('#genBar').isVisible());
  await page.waitForTimeout(1300);
  check('generate button is usable again afterwards', await genEla().isEnabled());
  check('progress bar hidden when idle', (await page.locator('#genBar').count()) === 0);

  // ── Erstmeldung vs Hauptmeldung detail level ────────────────
  check('Erstmeldung has no alternative or duration',
    !/M41/.test(de1) && !/23:30/.test(de1), de1);
  await page.click('#pTyp');
  await page.waitForTimeout(250);
  check('changing the event type is not called a manual edit',
    (await page.locator('#state-de').textContent()).includes('Ereignis geändert'),
    (await page.locator('#state-de').textContent()).trim());
  check('no overwrite confirm raised by the event change', dialogs.length === 0, dialogs.join(' | '));
  await genEla().click();
  await page.waitForTimeout(1400);
  const de2 = await page.locator('#ta-de').inputValue();
  const en2 = await page.locator('#ta-en').inputValue();
  check('Hauptmeldung adds reason, alternative and duration',
    /Notarzteinsatz/.test(de2) && /M41/.test(de2) && /23:30/.test(de2), de2);
  check('EN Hauptmeldung is the matching translation',
    /M41/.test(en2) && /23:30/.test(en2) && /Stadtmitte/.test(en2), en2);
  check('DAISY stays short while ELA grows',
    (await page.locator('#daisy').inputValue()).length < de2.length);
  await page.screenshot({ path: out('mg-2-empathetic.png'), fullPage: true });

  // ── audio: one combined file, stale on edit ────────────────
  await genAudio().click();
  await page.waitForTimeout(1400);
  let aud = await page.locator('#state-audio').textContent();
  check('audio ready, one file DE + EN', /Audio erzeugt/.test(aud) && /DE \+ EN/.test(aud),
    aud.replace(/\s+/g, ' '));
  check('listen enabled', await listen().isEnabled());
  check('save warns audio not listened to yet',
    (await page.locator('#saveWarns').textContent()).includes('angehört'));

  await listen().click();
  await page.waitForTimeout(600);
  check('playback shows an elapsed position, not just a label flip',
    /läuft \d:\d\d \/ \d:\d\d/.test(await page.locator('#state-audio').textContent()),
    (await page.locator('#state-audio').textContent()).trim());
  check('pressing play alone does NOT satisfy the listened check',
    (await page.locator('#saveWarns').textContent()).includes('angehört'),
    (await page.locator('#saveWarns').textContent()).trim());
  await finishPlayback();
  check('listened is recorded once playback reaches the end',
    (await page.locator('#state-audio').textContent()).includes('angehört'),
    (await page.locator('#state-audio').textContent()).trim());

  // switching source alone must not invalidate a current file
  await page.selectOption('#source', 'record');
  await page.waitForTimeout(250);
  check('changing Quelle without touching a word keeps the audio current',
    !/veraltet/i.test(await page.locator('#state-audio').textContent()),
    (await page.locator('#state-audio').textContent()).replace(/\s+/g,' '));
  await useEmpathetic();

  // typing must keep focus, and must invalidate the audio
  const before = await page.locator('#ta-de').inputValue();
  await page.locator('#ta-de').click();
  // Control+End, not End — the text soft-wraps, so End stops at the visual line
  await page.locator('#ta-de').press('Control+End');
  await page.keyboard.type(' Bitte beachten Sie die Aushänge.', { delay: 20 });
  const focused = await page.evaluate(() => document.activeElement && document.activeElement.id);
  check('textarea keeps focus while typing', focused === 'ta-de', 'activeElement=' + focused);
  check('whole typed string landed',
    (await page.locator('#ta-de').inputValue()) === before + ' Bitte beachten Sie die Aushänge.');
  check('state line switches to edited',
    (await page.locator('#state-de').textContent()).includes('Manuell bearbeitet'));
  check('EN flagged as out-of-date translation',
    (await page.locator('#state-en').textContent()).includes('Übersetzung nicht aktuell'));
  check('EN box carries the warning outline',
    await page.locator('#mbox-en').evaluate(el => el.classList.contains('warn')));
  aud = await page.locator('#state-audio').textContent();
  check('audio goes stale after a text edit', /veraltet/i.test(aud), aud.replace(/\s+/g,' '));
  check('save warns the audio no longer matches',
    (await page.locator('#saveWarns').textContent()).includes('passt nicht zum Text'));
  check('button after edit still works first time (no blur re-render)',
    await genAudio().isEnabled());
  await genAudio().click();
  await page.waitForTimeout(1400);
  check('first click after editing actually regenerated the audio',
    /Audio erzeugt/.test(await page.locator('#state-audio').textContent()),
    (await page.locator('#state-audio').textContent()).replace(/\s+/g,' '));

  // ── free text in Additional details is German only, and says so ──
  await page.locator('#zusatz').fill('Der Kiosk am Ausgang Nord ist geschlossen.');
  await genEla().click();
  await page.waitForTimeout(1300);
  check('free-text detail lands in DE',
    (await page.locator('#ta-de').inputValue()).includes('Kiosk am Ausgang Nord'));
  check('free-text detail is NOT invented in EN',
    !(await page.locator('#ta-en').inputValue()).includes('Kiosk'));
  check('EN state line warns the addition is German only',
    (await page.locator('#state-en').textContent()).includes('nur auf Deutsch'),
    (await page.locator('#state-en').textContent()).trim());
  await page.locator('#zusatz').fill('');
  await genEla().click(); await page.waitForTimeout(1300);
  check('clearing Additional details clears the German-only warning',
    !(await page.locator('#state-en').textContent()).includes('nur auf Deutsch'));
  await page.screenshot({ path: out('mg-3-prompt.png'), fullPage: true });

  // a hand-edit in EN must not make an unreconciled pair look fine (UX 2/3)
  await page.locator('#ta-de').click(); await page.locator('#ta-de').press('Control+End');
  await page.keyboard.type(' DE ZUSATZ.'); await page.waitForTimeout(200);
  check('EN flagged out of date after a DE edit',
    (await page.locator('#state-en').textContent()).includes('nicht aktuell'));
  await page.locator('#ta-en').click(); await page.locator('#ta-en').press('Control+End');
  await page.keyboard.type(' EN edit.'); await page.waitForTimeout(200);
  check('editing EN does NOT clear the divergence signal',
    (await page.locator('#state-en').textContent()).includes('nicht abgeglichen'),
    (await page.locator('#state-en').textContent()).trim());
  check('EN box still carries the warning outline',
    await page.locator('#mbox-en').evaluate(el => el.classList.contains('warn')));
  await genEla().click(); await page.waitForTimeout(1300);
  check('regenerating clears the divergence signal',
    !(await page.locator('#state-en').textContent()).includes('nicht abgeglichen'));

  // ── Source: Library ────────────────────────────────────────
  await page.selectOption('#source', 'library');
  await page.waitForTimeout(250);
  check('Library hides the prompt block', !(await page.locator('#blkEmpathetic').isVisible()));
  check('Library block visible', await page.locator('#blkLibrary').isVisible());
  check('GENERATE ELA disabled for Library', await genEla().isDisabled());
  await page.selectOption('#library', 'l1');
  await page.waitForTimeout(300);
  check('library fills DE + EN',
    (await page.locator('#ta-de').inputValue()).includes('Aufzug')
    && (await page.locator('#ta-en').inputValue()).includes('lift'),
    await page.locator('#ta-en').inputValue());
  check('library text is marked as such',
    (await page.locator('#state-de').textContent()).includes('Aus Bibliothek'));
  check('picker keeps the chosen entry selected',
    (await page.locator('#library').inputValue()) === 'l1',
    'value=' + await page.locator('#library').inputValue());
  check('state line names the loaded library entry',
    (await page.locator('#state-de').textContent()).includes('Aufzug'),
    (await page.locator('#state-de').textContent()).trim());
  check('library brings its own audio',
    (await page.locator('#state-audio').textContent()).includes('Audio erzeugt'));

  /* One full real-time playthrough, on the shortest file in the prototype:
     proves the simulated player reaches the end on its own, not only when the
     checks call endPlay(). */
  /* The state line carries two clock-shaped numbers — "erzeugt 21:47" is the
     time of day, the second one is the file length. Take the second. */
  const times = (await page.locator('#state-audio').textContent()).match(/\d+:\d\d/g) || [];
  const durParts = (times[1] || '0:12').split(':');
  const durSecs = +durParts[0] * 60 + +durParts[1];
  await listen().click();
  await page.waitForTimeout(durSecs * 1000 + 1500);
  check('simulated playback finishes on its own and records "angehört"',
    (await page.locator('#state-audio').textContent()).includes('angehört')
    && !(await page.locator('#state-audio').textContent()).includes('läuft'),
    (await page.locator('#state-audio').textContent()).trim());

  await page.selectOption('#library', '');
  await page.waitForTimeout(250);
  check('clearing the library picker empties the boxes',
    (await page.locator('#state-de').textContent()).includes('Kein Text'));

  // ── Source: Record ─────────────────────────────────────────
  await page.selectOption('#source', 'record');
  await page.waitForTimeout(250);
  check('record block visible', await page.locator('#blkRecord').isVisible());
  await page.selectOption('#rec', 'r1');
  await page.waitForTimeout(300);
  check('recording marks the text as a transcript',
    (await page.locator('#state-de').textContent()).includes('Mitschrift'));
  check('recording picker keeps its selection',
    (await page.locator('#rec').inputValue()) === 'r1');
  check('state line names the loaded recording',
    (await page.locator('#state-de').textContent()).includes('Notarzteinsatz_Stadtmitte'));
  check('transcript is read-only',
    await page.locator('#ta-de').evaluate(el => el.readOnly));
  check('GENERATE AUDIO disabled for a human recording', await genAudio().isDisabled());
  check('recording is playable', await listen().isEnabled());
  await page.screenshot({ path: out('mg-4-record.png'), fullPage: true });

  // ── back to Standard reloads the predefined message ────────
  await page.selectOption('#source', 'standard');
  await page.waitForTimeout(300);
  check('choosing Standard again reloads the predefined system message',
    (await page.locator('#state-de').textContent()).includes('Vordefinierter Systemtext')
    && (await page.locator('#ta-de').inputValue()).includes('Notarzteinsatz'),
    (await page.locator('#ta-de').inputValue()));
  check('transcript read-only state is lifted again',
    await page.locator('#ta-de').evaluate(el => !el.readOnly));

  // ── failure path keeps the previous text ───────────────────
  await useEmpathetic();
  await genEla().click();
  await page.waitForTimeout(1400);
  const keep = await page.locator('#ta-de').inputValue();
  await page.click('#pFail');
  await genEla().click();
  await page.waitForTimeout(1400);
  check('failure is reported on the state line',
    (await page.locator('#state-de').textContent()).includes('fehlgeschlagen'));
  check('failure line offers an inline retry',
    await page.locator('#state-de').getByText('Wiederholen').isVisible());
  check('failure does not wipe the previous text',
    (await page.locator('#ta-de').inputValue()) === keep);
  await page.click('#pFail');

  // ── UI language switcher ───────────────────────────────────
  await page.click('#uiEn');
  await page.waitForTimeout(300);
  const secsEn = await page.locator('.sec-t, .sub-t').allTextContents();
  check('UI switches to English', secsEn.join('|') === 'Daisy|ELA|Messages|Stations|Planned',
    secsEn.join('|'));
  check('buttons relabel',
    (await page.locator('#btnSave').textContent()) === 'SAVE'
    && (await genEla().textContent()).trim() === 'GENERATE ELA'
    && (await genAudio().textContent()).trim() === 'GENERATE AUDIO');
  check('source options translate',
    (await page.locator('#source option').allTextContents()).join('|')
      === 'Standard|Library|Record|Empathetic',
    (await page.locator('#source option').allTextContents()).join('|'));
  check('Additional details label translates',
    (await page.locator('#tZusatz').textContent()) === 'Additional details',
    await page.locator('#tZusatz').textContent());
  check('meta row relabels', /Notices.*Type.*Stations/s.test(await page.locator('#metaRow').textContent()));
  check('html lang follows the switcher',
    (await page.locator('html').getAttribute('lang')) === 'en');
  check('message content is untouched by the UI switcher',
    (await page.locator('#ta-de').inputValue()) === keep);
  await page.screenshot({ path: out('mg-5-english.png'), fullPage: true });
  await page.click('#uiDe');

  // ── the pre-save area lists every warning, not just the first ──
  await page.click('button.pbtn:has-text("ZUR")');
  await page.waitForTimeout(300);
  check('reset returns to the predefined system message',
    (await page.locator('#source').inputValue()) === 'standard'
    && (await page.locator('#state-de').textContent()).includes('Vordefinierter Systemtext'));
  await genAudio().click();
  await page.waitForTimeout(1500);
  await listen().click();
  await page.waitForTimeout(300);
  await finishPlayback();
  check('clean state shows a single ready line',
    (await page.locator('#saveWarns .state').count()) === 1
    && (await page.locator('#saveWarns').textContent()).includes('Bereit zum Speichern'),
    (await page.locator('#saveWarns').textContent()).replace(/\s+/g,' '));
  await page.locator('#ta-de').click(); await page.locator('#ta-de').press('Control+End');
  await page.keyboard.type(' STALE'); await page.waitForTimeout(250);
  await page.locator('#daisy').fill('z'.repeat(175)); await page.waitForTimeout(250);
  const warns = await page.locator('#saveWarns').textContent();
  check('stale audio is still shown alongside the DAISY length warning',
    /passt nicht zum Text/.test(warns) && /160 Zeichen/.test(warns),
    warns.replace(/\s+/g, ' ').slice(0, 150));
  check('audio warning is listed before the DAISY warning',
    warns.indexOf('passt nicht zum Text') < warns.indexOf('160 Zeichen'));
  await page.locator('#daisy').fill('{U2}: Kein Halt {Stadtmitte}. ***'); await page.waitForTimeout(200);
  await page.click('#pTyp'); await page.waitForTimeout(300);
  const warns2 = await page.locator('#saveWarns').textContent();
  check('event change reaches the pre-save area',
    /Ereignis geändert/.test(warns2), warns2.replace(/\s+/g, ' ').slice(0, 150));
  check('save toast names the warning instead of claiming success',
    await (async () => { await page.click('#btnSave'); await page.waitForTimeout(300);
      return (await page.locator('#toast').textContent()).includes('mit Warnung'); })(),
    (await page.locator('#toast').textContent()));

  // ── prototype, not a speech engine ─────────────────────────
  check('no browser speech synthesis is used anywhere',
    await page.evaluate(() => !/speechSynthesis|SpeechSynthesisUtterance/.test(
      document.documentElement.innerHTML)));

  check('no console/page errors', errors.length === 0, errors.join(' | '));

  console.log('\n── PASS (' + ok.length + ') ──');
  ok.forEach(o => console.log('  ✓ ' + o));
  if (bad.length) { console.log('\n── FAIL (' + bad.length + ') ──'); bad.forEach(b => console.log('  ✗ ' + b)); }
  else console.log('\nAll checks passed.');
  await browser.close();
  process.exit(bad.length ? 1 : 0);
})();
