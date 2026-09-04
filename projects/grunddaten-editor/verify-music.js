/* Everrunning music — station schedules (V2) and the trigger removal (V1).
   Real Chromium: jsdom passes while the UI is unusable. */
const { chromium } = require('playwright');
const path = require('path');

const URL = 'file://' + path.join(__dirname, 'index.html');
const out = n => path.join('/tmp', n);
const ok = [], bad = [];
const check = (name, cond, extra = '') => (cond ? ok : bad).push(name + (extra ? ' — ' + extra : ''));

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 1100 } });
  page.setDefaultTimeout(15000);
  const errors = [], dialogs = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('dialog', d => { dialogs.push(d.message()); d.accept(); });

  const openMusic = async () => {
    await page.click('#nav-evr');
    await page.click('#nav-evr-music');
    await page.waitForTimeout(250);
  };
  const rowByStation = name => page.locator('.ms-row', { hasText: name }).first();

  await page.goto(URL);
  await page.waitForTimeout(300);
  await openMusic();

  // ── the new version is the default, and the switcher offers both ──
  check('Everrunning → Music opens the station version',
    (await page.locator('.ms-row').count()) > 0);
  const verBtns = (await page.locator('.ver-sw .seg button').allTextContents()).map(x => x.trim());
  check('version switcher offers exactly two versions',
    verBtns.length === 2 && verBtns[0] === 'Zeitpläne pro Station' && verBtns[1] === 'Eventliste (V1)',
    verBtns.join(' | '));
  check('the station version is the active one',
    await page.locator('.ver-sw .seg button.on').first().textContent() === 'Zeitpläne pro Station');

  // ── columns are exactly the four asked for ──
  const heads = (await page.locator('.tbl-wrap th').allTextContents()).map(x => x.trim());
  check('four columns: station, line, music, radio',
    heads.join('|') === 'Name|Linie|Musik|Radio', heads.join('|'));

  // ── only stations that have a schedule ──
  const rowCount = await page.locator('.ms-row').count();
  const stationTotal = await page.evaluate(() => stations.length);
  check('only stations with a schedule are listed, not all of Berlin',
    rowCount === 4 && rowCount < stationTotal, rowCount + ' of ' + stationTotal + ' stations');
  const names = await page.locator('.ms-row td:first-child').allTextContents();
  check('the listed stations are the ones holding schedules',
    ['Alexanderplatz', 'Zoologischer Garten', 'Wittenbergplatz', 'Nollendorfplatz']
      .every(n => names.some(x => x.includes(n))), names.map(n => n.trim()).join(', '));

  // ── Ignat's example row: music Monday, radio Tue+Wed with two periods ──
  const zo = rowByStation('Zoologischer Garten');
  const zoMusic = await zo.locator('td').nth(2).textContent();
  const zoRadio = await zo.locator('td').nth(3).textContent();
  check('music cell shows the playlist and its single Monday period',
    /Playlist/.test(zoMusic) && /09:00–12:00/.test(zoMusic), zoMusic.replace(/\s+/g, ' ').trim());
  check('radio cell shows both periods of the day',
    /Radio/.test(zoRadio) && /10:00–15:00/.test(zoRadio) && /16:00–20:00/.test(zoRadio),
    zoRadio.replace(/\s+/g, ' ').trim());
  const zoRadioDays = await zo.locator('td').nth(3).locator('.dayc').evaluateAll(
    els => els.map(e => e.textContent + (e.classList.contains('on') ? '+' : '-')));
  check('day chips mark exactly the active weekdays',
    zoRadioDays.join('') === 'Mo-Di+Mi+Do-Fr-Sa-So-', zoRadioDays.join(''));
  check('a limited validity is shown, an open one reads "dauerhaft"',
    /dauerhaft/.test(zoRadio)
    && /01\.10\.2026 – 31\.10\.2026/.test(await rowByStation('Alexanderplatz').locator('td').nth(2).textContent()),
    (await rowByStation('Alexanderplatz').locator('td').nth(2).textContent()).replace(/\s+/g, ' ').trim());
  check('an inactive schedule is marked on the station',
    (await rowByStation('Nollendorfplatz').locator('td').first().textContent()).includes('Inaktiv'));
  await page.screenshot({ path: out('mu-1-list.png'), fullPage: true });

  // ── row click opens a full-screen detail, not an expander ──
  await zo.click();
  await page.waitForTimeout(300);
  check('clicking a row opens the full detail page with a breadcrumb',
    await page.locator('.breadcrumb .bc-current').textContent() === 'Zoologischer Garten'
    && (await page.locator('.ms-row').count()) === 0);
  check('no expander was used in the list',
    (await page.locator('.tbl-wrap').count()) === 0);
  check('both entries are on the page as cards',
    (await page.locator('.card-title').allTextContents()).filter(x => /Eintrag/.test(x)).length === 2,
    (await page.locator('.card-title').allTextContents()).join(' | '));
  check('the weekly grid is on the page, one per entry',
    (await page.locator('table.sched-table').count()) === 2);
  check('a day without a period says so instead of showing empty inputs',
    (await page.locator('#ms-week-0').textContent()).includes('keine Wiedergabe'));
  check('single-track repetition is hidden for a playlist entry',
    !(await page.locator('.card').nth(1).textContent()).includes('Wiederholung'));
  await page.screenshot({ path: out('mu-2-detail.png'), fullPage: true });

  // ── editing a time keeps focus (no re-render on input) ──
  const t0 = page.locator('#ms-1-1-0-s');
  await t0.click();
  await t0.fill('11:00');
  const focusId = await page.evaluate(() => document.activeElement && document.activeElement.id);
  check('editing a period keeps the focus in the field', focusId === 'ms-1-1-0-s',
    'activeElement=' + focusId);
  check('the edited value is in the draft',
    await page.evaluate(() => state.msDraft.entries[1].days[1].slots[0].start) === '11:00');

  // ── add / remove / copy a period, asserting the control is really usable ──
  await page.click('#ms-week-0 button[title="Slot hinzufügen"]');
  await page.waitForTimeout(150);
  // Monday already has a period here, so the first "+" appends a second one to Monday.
  const newSlot = page.locator('#ms-0-0-1-s');
  check('adding a period yields a visible, editable field',
    await newSlot.isVisible() && await newSlot.isEditable());
  await page.locator('#ms-week-0 .sched-icon-btn.remove').nth(1).click();
  await page.waitForTimeout(150);
  check('removing that period leaves the day empty again',
    (await page.locator('#ms-week-0').textContent()).match(/keine Wiedergabe/g).length === 6,
    (await page.locator('#ms-week-0').textContent()).replace(/\s+/g, ' ').slice(0, 90));

  // ── overlap is refused ──
  await page.evaluate(() => {
    // Radio Tuesday 10:00–15:00 already exists; put music on top of it.
    state.msDraft.entries[0].days[1].slots = [{ start: '11:00', end: '12:00' }];
    render();
  });
  dialogs.length = 0;
  await page.click('button:has-text("Zeitplan speichern")');
  await page.waitForTimeout(250);
  check('an overlap between music and radio is refused on save',
    dialogs.length === 1 && /Überlappung/.test(dialogs[0]), dialogs.join(' | '));
  check('the refusal names the day and both sources',
    dialogs[0] && /Di/.test(dialogs[0]) && /Jazzradio/.test(dialogs[0]),
    dialogs[0]);
  check('nothing was written while the schedule was invalid',
    await page.evaluate(() => getSchedule('ZO').entries[0].days[1].slots.length) === 0);

  // ── music and radio may share a day when they do not overlap ──
  await page.evaluate(() => {
    state.msDraft.entries[0].days[1].slots = [{ start: '08:00', end: '09:30' }];
    render();
  });
  dialogs.length = 0;
  await page.click('button:has-text("Zeitplan speichern")');
  await page.waitForTimeout(300);
  check('music and radio on the same day are accepted when they do not overlap',
    dialogs.length === 0 && (await page.locator('.ms-row').count()) === 4, dialogs.join(' | '));
  check('the new period is in the saved schedule',
    await page.evaluate(() => getSchedule('ZO').entries[0].days[1].slots[0].start) === '08:00');
  check('the day chip for Tuesday is now on in the music column',
    (await rowByStation('Zoologischer Garten').locator('td').nth(2)
      .locator('.dayc').evaluateAll(els => els.map(e => e.classList.contains('on') ? '+' : '-'))).join('')
      === '++-----');

  // ── a new schedule starts from the station picker, and starts empty ──
  await page.click('button:has-text("Neuer Zeitplan")');
  await page.waitForTimeout(250);
  check('the picker lists stations and marks the ones that already have a schedule',
    (await page.locator('#modal-content').textContent()).includes('Zeitplan vorhanden'));
  await page.fill('#modal-content input.search-input', 'Kurf');
  await page.waitForTimeout(200);
  const picked = await page.locator('#ms-pick-grid .pick-stn').allTextContents();
  check('the picker search narrows the list', picked.length === 1 && /Kurfürstendamm/.test(picked[0]),
    picked.join(' | '));
  await page.locator('#ms-pick-grid .pick-stn').first().click();
  await page.waitForTimeout(300);
  check('picking a station opens an empty new schedule',
    (await page.locator('h1').textContent()).includes('Neuer Zeitplan')
    && (await page.locator('table.sched-table').count()) === 0
    && (await page.locator('#modal-overlay').isHidden()));
  check('the empty schedule says what to do next',
    (await page.locator('.sect-note').textContent()).includes('Noch kein Eintrag'));

  // ── an entry needs a source and at least one period ──
  await page.click('button:has-text("+ Eintrag hinzufügen")');
  await page.waitForTimeout(200);
  check('a new entry starts with an empty week',
    (await page.locator('#ms-week-0').textContent()).match(/keine Wiedergabe/g).length === 7);
  dialogs.length = 0;
  await page.click('button:has-text("Zeitplan speichern")');
  await page.waitForTimeout(200);
  check('saving without a source is refused', /Quelle/.test(dialogs[0] || ''), dialogs.join(' | '));
  await page.selectOption('.card select', { index: 1 });
  await page.waitForTimeout(200);
  dialogs.length = 0;
  await page.click('button:has-text("Zeitplan speichern")');
  await page.waitForTimeout(200);
  check('saving without a single period is refused',
    /Zeitraum/.test(dialogs[0] || ''), dialogs.join(' | '));

  // ── single track: loop, or a fixed interval ──
  await page.click('.card .seg button:has-text("Einzeltrack")');
  await page.waitForTimeout(200);
  check('a single track offers repetition', await page.locator('.card:has-text("Wiederholung")').count() > 0);
  await page.click('.seg button:has-text("Alle")');
  await page.waitForTimeout(200);
  check('the interval field appears with a minute unit',
    await page.locator('input[type=number]').isVisible()
    && (await page.locator('.card').nth(1).textContent()).includes('Min.'));
  await page.locator('input[type=number]').fill('0');
  await page.selectOption('.card select', { index: 1 });
  await page.click('#ms-week-0 button[title="Slot hinzufügen"]');
  await page.waitForTimeout(150);
  dialogs.length = 0;
  await page.click('button:has-text("Zeitplan speichern")');
  await page.waitForTimeout(200);
  check('an interval of zero minutes is refused',
    /Intervall/.test(dialogs[0] || ''), dialogs.join(' | '));
  await page.locator('input[type=number]').fill('20');
  await page.waitForTimeout(150);

  // ── apply to other stations: copy, overwriting the target ──
  await page.click('button:has-text("Auf andere Stationen anwenden")');
  await page.waitForTimeout(250);
  check('the apply dialog excludes the source station itself',
    (await page.locator('#modal-content').textContent()).includes('Quelle des Zeitplans'));
  await page.locator('#modal-content label.pick-stn', { hasText: 'Brandenburger Tor' }).locator('input').first().click();
  await page.waitForTimeout(200);
  check('no overwrite warning for a station without a schedule',
    (await page.locator('.ms-warn').count()) === 0);
  await page.locator('#modal-content label.pick-stn', { hasText: 'Alexanderplatz' }).locator('input').first().click();
  await page.waitForTimeout(200);
  const alBoxes = await page.locator('#modal-content label.pick-stn', { hasText: 'Alexanderplatz' })
    .locator('input').evaluateAll(els => els.map(e => e.checked));
  check('a station on several lines stays in sync across the line groups',
    alBoxes.length === 3 && alBoxes.every(Boolean), JSON.stringify(alBoxes));
  check('a target that already has a schedule raises an overwrite warning',
    (await page.locator('.ms-warn').textContent()).includes('überschrieben'),
    (await page.locator('.ms-warn').textContent()).trim());
  const warnBox = await page.locator('.ms-warn').boundingBox();
  check('the overwrite warning cannot scroll away from the apply button',
    await page.locator('.ms-warn').isVisible()
    && warnBox.y + warnBox.height <= page.viewportSize().height + 1,
    'warn bottom=' + Math.round(warnBox.y + warnBox.height));
  const applyBox = await page.locator('#ms-apply-btn').boundingBox();
  const vp = page.viewportSize();
  check('the apply button is visible without scrolling the dialog',
    await page.locator('#ms-apply-btn').isVisible()
    && applyBox.y + applyBox.height <= vp.height + 1,
    'btn bottom=' + Math.round(applyBox.y + applyBox.height) + ' viewport=' + vp.height);
  check('the apply button counts the targets',
    (await page.locator('#ms-apply-btn').textContent()).includes('2 Station'),
    (await page.locator('#ms-apply-btn').textContent()).trim());
  await page.screenshot({ path: out('mu-3-apply.png'), fullPage: true });
  await page.click('#ms-apply-btn');
  await page.waitForTimeout(350);

  check('applying copied the schedule to both targets and saved the source station',
    (await page.locator('.ms-row').count()) === 6, await page.locator('.ms-row').count() + ' rows');
  const applied = await page.evaluate(() => {
    const src = getSchedule('KU'), a = getSchedule('AL'), b = getSchedule('BR');
    const strip = sc => JSON.stringify(sc.entries);
    return { same: strip(src) === strip(a) && strip(src) === strip(b),
             alEntries: a.entries.length, srcEntries: src.entries.length };
  });
  check('the copies are identical to the source', applied.same,
    JSON.stringify(applied));
  check('the overwritten station lost its two old entries',
    applied.alEntries === 1 && applied.srcEntries === 1, JSON.stringify(applied));
  check('a copy is independent of its source afterwards',
    await page.evaluate(() => {
      getSchedule('KU').entries[0].repeat.intervalMin = 99;
      return getSchedule('BR').entries[0].repeat.intervalMin === 20;
    }));

  // ── delete a schedule ──
  await rowByStation('Brandenburger Tor').click();
  await page.waitForTimeout(250);
  dialogs.length = 0;
  await page.click('button:has-text("Zeitplan löschen")');
  await page.waitForTimeout(300);
  check('deleting asks first and names the station',
    /Brandenburger Tor/.test(dialogs[0] || ''), dialogs.join(' | '));
  check('the station is gone from the list after deleting',
    (await page.locator('.ms-row').count()) === 5
    && !(await page.locator('.tbl-wrap').textContent()).includes('Brandenburger Tor'));

  // ── the trigger is gone, in both versions ──
  const bodyDe = await page.locator('body').textContent();
  check('no train number anywhere in the station version', !/Zugnummer|W-2412/.test(bodyDe));
  await page.click('.ver-sw .seg button:has-text("Eventliste")');
  await page.waitForTimeout(250);
  const evHeads = (await page.locator('.tbl-wrap th').allTextContents()).map(x => x.trim());
  check('the V1 event list no longer has a playback-mode column',
    !evHeads.includes('Auslösung') && evHeads.length === 6, evHeads.join('|'));
  check('the Christmas event is now a plain date range',
    (await page.locator('.tbl-wrap').textContent()).includes('Weihnachtsmusik Dezember')
    && !(await page.locator('.tbl-wrap').textContent()).includes('Zugnummer'));
  await page.locator('.tbl-wrap a.bc-link').first().click();
  await page.waitForTimeout(300);
  const evBody = await page.locator('body').textContent();
  check('the V1 editor has no trigger controls left',
    !/Auslöser|Zugnummer|vor Ankunft/.test(evBody));
  check('the V1 editor still has its schedule fields',
    evBody.includes('Datum von – bis') && evBody.includes('Zeitfenster'));
  check('the V1 per-station override survived',
    (await page.locator('body').textContent()).includes('Zeitfenster'));

  // ── back to V2 and switch the interface language ──
  await page.click('.breadcrumb .bc-link');
  await page.waitForTimeout(200);
  await page.click('.ver-sw .seg button:has-text("Zeitpläne")');
  await page.waitForTimeout(250);
  await page.click('#lang-en');
  await page.waitForTimeout(300);
  const headsEn = (await page.locator('.tbl-wrap th').allTextContents()).map(x => x.trim());
  check('the new screen relabels in English',
    headsEn.join('|') === 'Name|Line|Music|Radio', headsEn.join('|'));
  check('the version switcher relabels too',
    (await page.locator('.ver-sw .seg button').allTextContents()).join('|')
      === 'Schedules per station|Event list (V1)',
    (await page.locator('.ver-sw .seg button').allTextContents()).join('|'));
  check('day chips relabel in English',
    (await page.locator('.ms-row .dayc').first().textContent()) === 'Mon');
  check('"ongoing" is used for an open validity',
    (await page.locator('.tbl-wrap').textContent()).includes('ongoing'));
  await rowByStation('Zoologischer Garten').click();
  await page.waitForTimeout(250);
  check('the detail page relabels in English',
    (await page.locator('h1').textContent()).includes('Schedule —')
    && (await page.locator('body').textContent()).includes('Weekly schedule'));
  await page.screenshot({ path: out('mu-4-english.png'), fullPage: true });
  await page.click('#lang-de');
  await page.waitForTimeout(200);

  check('no console/page errors', errors.length === 0, errors.join(' | '));

  console.log('\n── PASS (' + ok.length + ') ──');
  ok.forEach(o => console.log('  ✓ ' + o));
  if (bad.length) { console.log('\n── FAIL (' + bad.length + ') ──'); bad.forEach(b => console.log('  ✗ ' + b)); }
  else console.log('\nAll checks passed.');
  await browser.close();
  process.exit(bad.length ? 1 : 0);
})();
