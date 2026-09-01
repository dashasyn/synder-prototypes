const { chromium } = require('playwright');
const path = require('path');

const URL = 'file://' + path.join(__dirname, 'index.html');
const out = n => path.join('/tmp', n);
const ok = [], bad = [];
const check = (name, cond, extra = '') => (cond ? ok : bad).push(name + (extra ? ' — ' + extra : ''));

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1120, height: 1150 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  const dialogs = [];
  page.on('dialog', d => { dialogs.push(d.message()); d.accept(); });

  await page.goto(URL);
  await page.waitForTimeout(350);

  // ── structure matches the screenshot ────────────────────────
  const secs = await page.locator('.sec-t, .sub-t').allTextContents();
  check('sections in screenshot order',
    secs.join('|') === 'Daisy|ELA|Meldungen|Stationen|Geplant', secs.join('|'));
  const meta = await page.locator('#metaRow').textContent();
  check('meta row has Mitteilungen/Typ/Stationen', /Mitteilungen.*Typ.*Stationen/s.test(meta));
  check('meta row has no Gleis', !/Gleis/.test(meta), meta.replace(/\s+/g, ' '));
  check('no Actual stations anywhere',
    !/Actual|Tatsächlich/i.test(await page.locator('.panel').textContent()));
  check('meta Stationen mirrors the Planned selects', /Rp - No/.test(meta), meta.replace(/\s+/g,' '));
  await page.selectOption('#stBis', 'Gleisdreieck (Gu)');
  await page.waitForTimeout(200);
  check('changing Planned updates the meta row',
    /Rp - Gu/.test(await page.locator('#metaRow').textContent()));
  await page.selectOption('#stBis', 'Nollendorfplatz (No)');

  check('DAISY read-only', await page.locator('#daisy').getAttribute('readonly') !== null);
  check('DAISY counter live', (await page.locator('#daisyCount').textContent()) !== '0');
  check('prompt read-only', await page.locator('#prompt').getAttribute('readonly') !== null);
  check('prompt built from the event',
    /U2/.test(await page.locator('#prompt').inputValue())
    && /Stadtmitte/.test(await page.locator('#prompt').inputValue()));
  check('default tone is Neutral', (await page.locator('#tonfall').inputValue()) === 'neutral');
  check('two intervals, independent',
    (await page.locator('#intDaisy').inputValue()) === '5 min'
    && (await page.locator('#intEla').inputValue()) === '5 min');
  await page.selectOption('#intDaisy', '10 min');
  check('Daisy interval does not move the ELA interval',
    (await page.locator('#intEla').inputValue()) === '5 min');
  await page.selectOption('#intDaisy', '5 min');
  check('one audio pair only, no per-box play button',
    (await page.locator('#audioActs button').count()) === 2);
  check('state line present under both boxes and audio',
    await page.locator('#state-de').isVisible() && await page.locator('#state-en').isVisible()
    && await page.locator('#state-audio').isVisible());
  check('initial state lines say "no text"',
    (await page.locator('#state-de').textContent()).includes('Kein Text'));
  await page.screenshot({ path: out('mg-1-initial.png'), fullPage: true });

  // ── generate: EN is a real translation, station name verbatim ──
  await page.click('#btnGen');
  await page.waitForTimeout(1400);
  const de1 = await page.locator('#ta-de').inputValue();
  const en1 = await page.locator('#ta-en').inputValue();
  check('DE generated', de1.length > 30, de1);
  check('EN generated', en1.length > 30, en1);
  check('EN keeps the station name verbatim', en1.includes('Stadtmitte'), en1);
  check('EN never says "city center"', !/city cent/i.test(en1), en1);
  check('EN keeps the line name verbatim', en1.includes('U2'));
  check('state line shows Generiert + tone',
    /Generiert.*Neutral/s.test(await page.locator('#state-de').textContent()),
    (await page.locator('#state-de').textContent()).trim());

  // ── Erstmeldung vs Hauptmeldung detail level ────────────────
  check('Erstmeldung has no alternative or duration',
    !/M41/.test(de1) && !/23:30/.test(de1), de1);
  await page.click('#pTyp');
  await page.waitForTimeout(250);
  check('changing the event type is not called a manual edit',
    (await page.locator('#state-de').textContent()).includes('Ereignis geändert'),
    (await page.locator('#state-de').textContent()).trim());
  check('no overwrite confirm for text nobody touched', dialogs.length === 0, dialogs.join(' | '));
  await page.click('#btnGen');
  await page.waitForTimeout(1400);
  const de2 = await page.locator('#ta-de').inputValue();
  const en2 = await page.locator('#ta-en').inputValue();
  check('Hauptmeldung adds reason, alternative and duration',
    /Notarzteinsatz/.test(de2) && /M41/.test(de2) && /23:30/.test(de2), de2);
  check('EN Hauptmeldung is the matching translation',
    /M41/.test(en2) && /23:30/.test(en2) && /Stadtmitte/.test(en2), en2);
  check('DAISY stays short while ELA grows',
    (await page.locator('#daisy').inputValue()).length < de2.length);

  // ── tone changes wording ───────────────────────────────────
  await page.selectOption('#tonfall', 'berliner');
  await page.click('#btnGen');
  await page.waitForTimeout(1400);
  const de3 = await page.locator('#ta-de').inputValue();
  check('tone changes the wording', de3 !== de2, de3);
  check('tone preset shown in the state line',
    (await page.locator('#state-de').textContent()).includes('Berlinerin'));
  check('history captured earlier versions',
    (await page.locator('#ta-de').inputValue()) !== de1);

  // ── audio: one combined file, stale on edit ────────────────
  await page.locator('#audioActs').getByText('AUDIO ERZEUGEN').click();
  await page.waitForTimeout(1400);
  let aud = await page.locator('#state-audio').textContent();
  check('audio ready, one file DE + EN', /Audio erzeugt/.test(aud) && /DE \+ EN/.test(aud),
    aud.replace(/\s+/g, ' '));
  check('listen enabled', await page.locator('#audioActs').getByText('ANHÖREN').isEnabled());
  check('save warns audio not listened to yet',
    (await page.locator('#state-save').textContent()).includes('angehört'));

  await page.locator('#audioActs').getByText('ANHÖREN').click();
  await page.waitForTimeout(400);
  check('listened is recorded',
    (await page.locator('#state-audio').textContent()).includes('angehört'));

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
    (await page.locator('#state-save').textContent()).includes('passt nicht zum Text'));
  check('button after edit still works first time (no blur re-render)',
    await page.locator('#audioActs').getByText('AUDIO ERZEUGEN').isEnabled());
  await page.locator('#audioActs').getByText('AUDIO ERZEUGEN').click();
  await page.waitForTimeout(1400);
  check('first click after editing actually regenerated the audio',
    /Audio erzeugt/.test(await page.locator('#state-audio').textContent()),
    (await page.locator('#state-audio').textContent()).replace(/\s+/g,' '));
  await page.screenshot({ path: out('mg-2-generated.png'), fullPage: true });

  // ── Zusatz: known phrase is bilingual, free text is DE only ──
  await page.locator('#zusatz').fill('Viel Spaß beim Konzert!');
  await page.click('#btnGen');
  await page.waitForTimeout(1400);
  check('known Zusatz lands in DE',
    (await page.locator('#ta-de').inputValue()).includes('Viel Spaß beim Konzert!'));
  check('known Zusatz lands translated in EN',
    (await page.locator('#ta-en').inputValue()).includes('Enjoy the concert!'),
    await page.locator('#ta-en').inputValue());
  check('no translation warning for a known phrase',
    !(await page.locator('#state-en').textContent()).includes('nur auf Deutsch'));

  await page.locator('#zusatz').fill('Der Kiosk am Ausgang Nord ist geschlossen.');
  await page.click('#btnGen');
  await page.waitForTimeout(1400);
  check('free-text Zusatz lands in DE',
    (await page.locator('#ta-de').inputValue()).includes('Kiosk am Ausgang Nord'));
  check('free-text Zusatz is NOT invented in EN',
    !(await page.locator('#ta-en').inputValue()).includes('Kiosk'));
  check('EN state line warns the note is German only',
    (await page.locator('#state-en').textContent()).includes('nur auf Deutsch'),
    (await page.locator('#state-en').textContent()).trim());
  check('prompt shows the Zusatz',
    (await page.locator('#prompt').inputValue()).includes('Kiosk'));
  await page.screenshot({ path: out('mg-3-zusatz.png'), fullPage: true });
  await page.locator('#zusatz').fill('');

  // ── Source: Library ────────────────────────────────────────
  await page.selectOption('#source', 'library');
  await page.waitForTimeout(250);
  check('Library hides prompt and tone', !(await page.locator('#blkStandard').isVisible()));
  check('Library block visible', await page.locator('#blkLibrary').isVisible());
  await page.selectOption('#library', 'l1');
  await page.waitForTimeout(300);
  check('library fills DE + EN',
    (await page.locator('#ta-de').inputValue()).includes('Aufzug')
    && (await page.locator('#ta-en').inputValue()).includes('lift'),
    await page.locator('#ta-en').inputValue());
  check('library text is marked as such',
    (await page.locator('#state-de').textContent()).includes('Aus Bibliothek'));
  check('library brings its own audio',
    (await page.locator('#state-audio').textContent()).includes('Audio erzeugt'));

  // ── Source: voice recording ────────────────────────────────
  await page.selectOption('#source', 'voice');
  await page.waitForTimeout(250);
  check('voice block visible', await page.locator('#blkVoice').isVisible());
  await page.selectOption('#rec', 'r1');
  await page.waitForTimeout(300);
  check('recording marks the text as a transcript',
    (await page.locator('#state-de').textContent()).includes('Mitschrift'));
  check('transcript is read-only',
    await page.locator('#ta-de').evaluate(el => el.readOnly));
  check('GENERATE AUDIO disabled for a human recording',
    await page.locator('#audioActs').getByText('AUDIO ERZEUGEN').isDisabled());
  check('recording is playable',
    await page.locator('#audioActs').getByText('ANHÖREN').isEnabled());
  await page.screenshot({ path: out('mg-4-voice.png'), fullPage: true });

  // ── failure path keeps the previous text ───────────────────
  await page.selectOption('#source', 'standard');
  await page.click('#btnGen');
  await page.waitForTimeout(1400);
  const keep = await page.locator('#ta-de').inputValue();
  await page.click('#pFail');
  await page.click('#btnGen');
  await page.waitForTimeout(1400);
  check('failure is reported on the state line',
    (await page.locator('#state-de').textContent()).includes('fehlgeschlagen'));
  check('failure does not wipe the previous text',
    (await page.locator('#ta-de').inputValue()) === keep);
  await page.click('#pFail');

  // ── UI language switcher ───────────────────────────────────
  await page.click('#uiEn');
  await page.waitForTimeout(300);
  const secsEn = await page.locator('.sec-t, .sub-t').allTextContents();
  check('UI switches to English', secsEn.join('|') === 'Daisy|ELA|Messages|Stations|Planned',
    secsEn.join('|'));
  check('buttons relabel', (await page.locator('#btnSave').textContent()) === 'SAVE');
  check('meta row relabels', /Notices.*Type.*Stations/s.test(await page.locator('#metaRow').textContent()));
  check('html lang follows the switcher',
    (await page.locator('html').getAttribute('lang')) === 'en');
  check('message content is untouched by the UI switcher',
    (await page.locator('#ta-de').inputValue()) === keep);
  check('tone options translate',
    (await page.locator('#tonfall option').allTextContents()).join('|').includes('Berlin (easy-going)'));
  await page.screenshot({ path: out('mg-5-english.png'), fullPage: true });
  await page.click('#uiDe');

  // ── history + restore ──────────────────────────────────────
  await page.click('#btnHist');
  await page.waitForTimeout(400);
  check('history drawer opens', await page.locator('#drawer.open').isVisible());
  check('history lists earlier versions',
    await page.locator('#drBody').getByText('Wiederherstellen').first().isVisible());
  await page.locator('#drBody').getByText('Wiederherstellen').first().click();
  await page.waitForTimeout(400);
  check('restore closes the drawer',
    !(await page.locator('#drawer').evaluate(el => el.classList.contains('open'))));
  check('restore changed the text', (await page.locator('#ta-de').inputValue()) !== keep);

  check('no console/page errors', errors.length === 0, errors.join(' | '));

  console.log('\n── PASS (' + ok.length + ') ──');
  ok.forEach(o => console.log('  ✓ ' + o));
  if (bad.length) { console.log('\n── FAIL (' + bad.length + ') ──'); bad.forEach(b => console.log('  ✗ ' + b)); }
  else console.log('\nAll checks passed.');
  await browser.close();
  process.exit(bad.length ? 1 : 0);
})();
