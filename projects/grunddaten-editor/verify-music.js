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
  /* One handler for the run; `dialogMode` decides whether a confirm is accepted
     or dismissed, since a second listener would race this one. */
  let dialogMode = 'accept';
  page.on('dialog', d => { dialogs.push(d.message()); dialogMode === 'accept' ? d.accept() : d.dismiss(); });

  const openMusic = async () => {
    await page.click('#nav-evr');
    await page.click('#nav-evr-music');
    await page.waitForTimeout(250);
  };
  const rowByStation = name => page.locator('.ms-row', { hasText: name }).first();

  await page.goto(URL);
  await page.waitForTimeout(300);
  await openMusic();

  // ── the variant switcher sits in the black bar above everything ──
  check('Everrunning → Music opens the station version',
    (await page.locator('.ms-row').count()) > 0);
  const protoBox = await page.locator('.proto-bar').boundingBox();
  const bannerBox = await page.locator('.staging-banner').boundingBox();
  const navBox = await page.locator('.topnav').boundingBox();
  check('the prototype bar is the very top strip, above the staging banner and the product nav',
    protoBox.y === 0 && protoBox.y + protoBox.height <= bannerBox.y + 1 && bannerBox.y < navBox.y,
    'proto=' + Math.round(protoBox.y) + '..' + Math.round(protoBox.y + protoBox.height)
      + ' banner=' + Math.round(bannerBox.y) + ' nav=' + Math.round(navBox.y));
  check('the prototype bar is black',
    await page.locator('.proto-bar').evaluate(el => getComputedStyle(el).backgroundColor)
      === 'rgb(27, 27, 27)',
    await page.locator('.proto-bar').evaluate(el => getComputedStyle(el).backgroundColor));
  const verBtns = (await page.locator('.proto-seg button').allTextContents()).map(x => x.trim());
  check('the variant switcher offers exactly two variants',
    verBtns.length === 2 && verBtns[0] === 'Zeitpläne pro Station' && verBtns[1] === 'Eventliste (V1)',
    verBtns.join(' | '));
  check('the station variant is the active one',
    await page.locator('.proto-seg button.on').first().textContent() === 'Zeitpläne pro Station');
  check('no switcher is left above the table',
    (await page.locator('.ver-sw').count()) === 0);
  check('the prototype bar is visible on the other pages too, not only on Music',
    await (async () => {
      await page.click('#nav-cfg'); await page.click('#nav-stations');
      await page.waitForTimeout(250);
      const on = await page.locator('.proto-seg button.on').count();
      await openMusic();
      return on === 1;
    })());

  // ── columns are the four asked for, plus the actions cell ──
  const heads = (await page.locator('.tbl-wrap th').allTextContents()).map(x => x.trim());
  check('four columns: station, line, music, radio (plus the actions cell)',
    heads.join('|') === 'Name|Linie|Musik|Radio|', heads.join('|'));

  // ── only stations that have a schedule ──
  const rowCount = await page.locator('.ms-row').count();
  const stationTotal = await page.evaluate(() => stations.length);
  check('only stations with a schedule are listed, not all of Berlin',
    rowCount === 5 && rowCount < stationTotal, rowCount + ' rows, ' + stationTotal + ' stations');
  const names = await page.locator('.ms-row td:first-child').allTextContents();
  check('the listed stations are the ones holding schedules',
    ['Alexanderplatz', 'Zoologischer Garten', 'Wittenbergplatz', 'Nollendorfplatz']
      .every(n => names.some(x => x.includes(n))), names.map(n => n.trim()).join(', '));

  // ── a station belongs to one line per row ──
  const lineCells = await page.locator('.ms-row td:nth-child(2)').evaluateAll(
    tds => tds.map(td => td.querySelectorAll('.line-badge, .lbadge, span').length + ':' + td.textContent.trim()));
  check('every row carries exactly one line chip',
    lineCells.every(c => /^1:/.test(c)), lineCells.join(' | '));
  const alRows = await page.locator('.ms-row', { hasText: 'Alexanderplatz' }).count();
  const alLines = await page.locator('.ms-row', { hasText: 'Alexanderplatz' })
    .locator('td:nth-child(2)').allTextContents();
  check('Alexanderplatz appears once per line, not once with three chips',
    alRows === 2 && alLines.map(x => x.trim()).sort().join(',') === 'U2,U5',
    alRows + ' rows: ' + alLines.map(x => x.trim()).join(', '));

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
  check('the two Alexanderplatz rows hold different schedules',
    await page.evaluate(() => JSON.stringify(getSchedule('AL','U2').entries)
                           !== JSON.stringify(getSchedule('AL','U5').entries)));
  check('an inactive schedule is marked on the station',
    (await rowByStation('Nollendorfplatz').locator('td').first().textContent()).includes('Inaktiv'));
  await page.screenshot({ path: out('mu-1-list.png'), fullPage: true });

  // ── row click opens a full-screen detail, not an expander ──
  await zo.click();
  await page.waitForTimeout(300);
  check('clicking a row opens the full detail page with a breadcrumb',
    await page.locator('.breadcrumb .bc-current').textContent() === 'Zoologischer Garten · U2'
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
    await page.evaluate(() => getSchedule('ZO','U2').entries[0].days[1].slots.length) === 0);

  // ── music and radio may share a day when they do not overlap ──
  await page.evaluate(() => {
    state.msDraft.entries[0].days[1].slots = [{ start: '08:00', end: '09:30' }];
    render();
  });
  dialogs.length = 0;
  await page.click('button:has-text("Zeitplan speichern")');
  await page.waitForTimeout(300);
  check('music and radio on the same day are accepted when they do not overlap',
    dialogs.length === 0 && (await page.locator('.ms-row').count()) === 5, dialogs.join(' | '));
  check('the new period is in the saved schedule',
    await page.evaluate(() => getSchedule('ZO','U2').entries[0].days[1].slots[0].start) === '08:00');
  check('the day chip for Tuesday is now on in the music column',
    (await rowByStation('Zoologischer Garten').locator('td').nth(2)
      .locator('.dayc').evaluateAll(els => els.map(e => e.classList.contains('on') ? '+' : '-'))).join('')
      === '++-----');

  // ── the ⋮ row menu ──
  const zoRow = rowByStation('Zoologischer Garten');
  await zoRow.locator('.kebab').click();
  await page.waitForTimeout(200);
  const menuItems = (await page.locator('.row-menu-item').allTextContents()).map(x => x.trim());
  check('the row menu offers edit, apply to stations and delete',
    menuItems.join('|') === 'Bearbeiten|Auf andere Stationen anwenden|Zeitplan löschen',
    menuItems.join('|'));
  check('the menu is visible and does not open the detail page',
    await page.locator('.row-menu').isVisible() && (await page.locator('.ms-row').count()) === 5);
  await page.locator('body').click({ position: { x: 5, y: 400 } });
  await page.waitForTimeout(200);
  check('clicking away closes the row menu', (await page.locator('.row-menu').count()) === 0);

  // menu → edit
  await zoRow.locator('.kebab').click();
  await page.waitForTimeout(150);
  await page.locator('.row-menu-item', { hasText: 'Bearbeiten' }).click();
  await page.waitForTimeout(300);
  check('menu → Bearbeiten opens that station and line',
    await page.locator('.breadcrumb .bc-current').textContent() === 'Zoologischer Garten · U2');
  await page.click('.breadcrumb .bc-link');
  await page.waitForTimeout(250);

  // menu → apply to, straight from the list
  await rowByStation('Wittenbergplatz').locator('.kebab').click();
  await page.waitForTimeout(150);
  await page.locator('.row-menu-item', { hasText: 'anwenden' }).click();
  await page.waitForTimeout(300);
  check('menu → apply to opens the dialog for the row it was opened from',
    (await page.locator('#modal-content .modal-title').textContent()).includes('anwenden')
    && await page.evaluate(() => state.msStationId === 'WI' && state.msLineId === 'U1'));
  await page.click('#modal-content button:has-text("Abbrechen")');
  await page.waitForTimeout(200);

  // menu → delete asks first, and a cancelled delete keeps the row
  dialogs.length = 0;
  dialogMode = 'dismiss';
  await rowByStation('Nollendorfplatz').locator('.kebab').click();
  await page.waitForTimeout(150);
  await page.locator('.row-menu-item', { hasText: 'löschen' }).click();
  await page.waitForTimeout(300);
  check('menu → delete asks first and names the station and line',
    /Nollendorfplatz/.test(dialogs[0] || '') && /U4/.test(dialogs[0] || ''), dialogs.join(' | '));
  check('a dismissed delete keeps the row',
    (await page.locator('.ms-row').count()) === 5
    && (await page.locator('.tbl-wrap').textContent()).includes('Nollendorfplatz'));
  dialogMode = 'accept';
  await page.screenshot({ path: out('mu-5-menu.png'), fullPage: true });

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
  check('picking a station opens an empty new schedule for that line',
    (await page.locator('h1').textContent()).includes('Neuer Zeitplan')
    && (await page.locator('h1').textContent()).includes('U9')
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
  check('a station on several lines is a separate target per line, not one synced entry',
    alBoxes.length === 3 && alBoxes[0] === true && alBoxes.slice(1).every(x => x === false),
    JSON.stringify(alBoxes));
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
    (await page.locator('.ms-row').count()) === 7, await page.locator('.ms-row').count() + ' rows');
  const applied = await page.evaluate(() => {
    const src = getSchedule('KU','U9'), a = getSchedule('AL','U2'), b = getSchedule('BR','U5');
    const strip = sc => JSON.stringify(sc.entries);
    return { same: strip(src) === strip(a) && strip(src) === strip(b),
             alEntries: a.entries.length, srcEntries: src.entries.length,
             otherAl: getSchedule('AL','U5').entries[0].source.refId };
  });
  check('the copies are identical to the source', applied.same, JSON.stringify(applied));
  check('the overwritten station+line lost its two old entries',
    applied.alEntries === 1 && applied.srcEntries === 1, JSON.stringify(applied));
  check('the same station on another line was left alone',
    applied.otherAl === 'RS-002', JSON.stringify(applied));
  check('a copy is independent of its source afterwards',
    await page.evaluate(() => {
      getSchedule('KU','U9').entries[0].repeat.intervalMin = 99;
      return getSchedule('BR','U5').entries[0].repeat.intervalMin === 20;
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
    (await page.locator('.ms-row').count()) === 6
    && !(await page.locator('.tbl-wrap').textContent()).includes('Brandenburger Tor'));

  // ══ V1: the event list, now schedule-first ══════════════════
  const bodyDe = await page.locator('body').textContent();
  check('no train number anywhere in the station version', !/Zugnummer|W-2412/.test(bodyDe));
  await page.click('.proto-seg button:has-text("Eventliste")');
  await page.waitForTimeout(300);

  check('the event list runs full width',
    await page.locator('#content').evaluate(el => el.classList.contains('wide'))
    && (await page.locator('.tbl-wrap').boundingBox()).width > page.viewportSize().width - 120,
    'table width=' + Math.round((await page.locator('.tbl-wrap').boundingBox()).width)
      + ' viewport=' + page.viewportSize().width);
  const evHeads = (await page.locator('.tbl-wrap th').allTextContents()).map(x => x.trim());
  check('columns are Event · Quelle · Stationen · Zeitraum · Status (+ actions)',
    evHeads.join('|') === 'Event|Quelle|Stationen|Zeitraum|Status|', evHeads.join('|'));
  check('the event name is no longer a link',
    (await page.locator('.tbl-wrap tbody td:first-child a').count()) === 0);

  const klassik = page.locator('tbody tr', { hasText: 'Klassik-Radio Vormittag' }).first();
  const srcChips = await klassik.locator('td').nth(1).locator('.chip').allTextContents();
  check('the source is one chip carrying its name, no subname line',
    srcChips.length === 1 && srcChips[0].includes('Klassik Radio Berlin'), srcChips.join(' | '));
  check('every event carries exactly one source chip',
    await page.locator('tbody tr').evaluateAll(
      trs => trs.every(tr => tr.querySelectorAll('td:nth-child(2) .chip').length === 1)));
  check('morning classic and evening jazz are two separate events',
    (await page.locator('tbody tr', { hasText: 'Jazz am Abend' }).count()) === 1);

  const lineChips = await klassik.locator('td').nth(2).locator('.lc').evaluateAll(
    els => els.map(e => e.querySelector('.line-badge').textContent.trim()
                      + ':' + e.querySelector('.lc-n').textContent.trim()));
  check('stations are line chips with the number of stations on that line',
    lineChips.length === 5 && lineChips[0] === 'U2:3' && lineChips.includes('U5:3'),
    lineChips.join(' | '));
  await klassik.locator('td').nth(2).locator('.lc').first().hover();
  await page.waitForTimeout(250);
  const tip = klassik.locator('td').nth(2).locator('.lc-tip').first();
  check('hovering a line chip reveals the station names',
    await tip.isVisible() && /Alexanderplatz/.test(await tip.textContent()),
    (await tip.textContent()).replace(/\s+/g, ' ').trim());
  const tipBox = await tip.boundingBox();
  check('the hover card is not clipped by the table header',
    tipBox.y >= 0 && tipBox.y + tipBox.height <= page.viewportSize().height,
    'tip y=' + Math.round(tipBox.y));

  check('the period is dates only, with an open end where there is none',
    (await klassik.locator('td').nth(3).textContent()).trim() === '10. Jun 2026 – offen',
    (await klassik.locator('td').nth(3).textContent()).trim());
  check('a closed period shows both dates and no time',
    (await page.locator('tbody tr', { hasText: 'Weihnachtsmusik' }).locator('td').nth(3).textContent()).trim()
      === '1. Dez 2026 – 26. Dez 2026',
    (await page.locator('tbody tr', { hasText: 'Weihnachtsmusik' }).locator('td').nth(3).textContent()).trim());
  const statuses = (await page.locator('tbody .chip-on, tbody .chip-planned, tbody .chip-past').allTextContents())
    .map(x => x.trim());
  check('status is derived from the period: active, planned and expired all appear',
    statuses.includes('Aktiv') && statuses.includes('Geplant') && statuses.includes('Abgelaufen'),
    statuses.join(', '));
  await page.screenshot({ path: out('mu-7-v1-list.png'), fullPage: true });

  // ── search by station name ──
  await page.fill('.search-input', 'Kaiserdamm');
  await page.waitForTimeout(250);
  check('search by station name narrows the list to the events on it',
    (await page.locator('tbody tr').count()) === 1
    && (await page.locator('tbody').textContent()).includes('Sommerradio'),
    (await page.locator('tbody').textContent()).replace(/\s+/g, ' ').slice(0, 60));
  await page.fill('.search-input', 'Madonna');
  await page.waitForTimeout(250);
  check('search also matches the event name',
    (await page.locator('tbody tr').count()) === 1
    && (await page.locator('tbody').textContent()).includes('Madonna'));
  await page.fill('.search-input', 'zzz');
  await page.waitForTimeout(250);
  check('a search with no hits says so',
    (await page.locator('tbody').textContent()).includes('Kein Event passt'));
  await page.fill('.search-input', '');
  await page.waitForTimeout(250);

  // ── the editor ──
  await page.locator('tbody tr', { hasText: 'Klassik-Radio Vormittag' }).locator('button:has-text("Bearbeiten")').click();
  await page.waitForTimeout(300);
  const evBody = await page.locator('body').textContent();
  check('the editor opens from the Bearbeiten button',
    (await page.locator('h1').textContent()).includes('Klassik-Radio Vormittag'));
  check('no trigger controls anywhere', !/Auslöser|Zugnummer|vor Ankunft/.test(evBody));
  check('the active checkbox is gone',
    !evBody.includes('Event aktiv') && (await page.locator('.card input[type=checkbox]:not(.pick-grid input)').count()) >= 0
    && !/Event aktiv/.test(evBody));
  check('the selected-stations table at the bottom is gone',
    !/Ausgewählte Stationen|Selected stations/.test(evBody)
    && (await page.locator('.card table:not(.sched-table)').count()) === 0);
  check('no per-station time override is offered',
    !/Individuell|Standard\)/.test(evBody));
  check('the period keeps an optional end',
    (await page.locator('input[type=date]').count()) === 2
    && evBody.includes('läuft unbefristet weiter'));

  // one source per event, with the detailed weekly grid from the station variant
  check('the event carries exactly one source and one weekly grid',
    (await page.locator('table.sched-table').count()) === 1
    && (await page.locator('.card select').count()) === 1);
  check('nothing offers to add or remove a source',
    (await page.locator('button:has-text("Quelle hinzufügen")').count()) === 0
    && (await page.locator('button:has-text("Quelle entfernen")').count()) === 0);
  const gridDays = await page.locator('#evw .sched-day-label').allTextContents();
  check('the grid lists all seven days',
    gridDays.map(x => x.trim()).join('') === 'MoDiMiDoFrSaSo', gridDays.join(''));
  check('Monday holds both of its periods',
    (await page.locator('#evw #evs-0-0-s').inputValue()) === '09:00'
    && (await page.locator('#evw #evs-0-1-s').inputValue()) === '15:00');
  check('the weekend reads "no playback" instead of showing empty fields',
    (await page.locator('#evw').textContent()).match(/keine Wiedergabe/g).length === 2);

  // a time edit must not steal focus
  const w0 = page.locator('#evs-0-0-s');
  await w0.click();
  await w0.fill('08:00');
  check('editing a period keeps the focus in the field',
    (await page.evaluate(() => document.activeElement && document.activeElement.id)) === 'evs-0-0-s');
  check('the edited time is in the draft',
    await page.evaluate(() => state.evDraft.source.days[0].slots[0].start) === '08:00');
  await w0.fill('09:00');

  // add, then remove a period — asserting the control is really usable
  await page.locator('#evw tr').filter({ hasText: 'Sa' }).locator('.sched-icon-btn').first().click();
  await page.waitForTimeout(200);
  check('adding a period to an empty day yields a visible, editable field',
    await page.locator('#evs-5-0-s').isVisible() && await page.locator('#evs-5-0-s').isEditable());
  check('that day is now in the draft',
    await page.evaluate(() => state.evDraft.source.days[5].slots.length) === 1);
  await page.locator('#evw .sched-icon-btn.remove').last().click();
  await page.waitForTimeout(200);
  check('removing it makes the day empty again',
    (await page.locator('#evw').textContent()).match(/keine Wiedergabe/g).length === 2);

  /* Copy a day onto the next. The day label sits on the day's first slot row,
     so a text filter would land on that row rather than the one carrying the
     copy button — address the buttons by title instead. Mon–Fri have one
     each, so Friday's is index 4. */
  await page.locator('#evw button[title="Auf nächsten Tag kopieren"]').nth(4).click();
  await page.waitForTimeout(200);
  check('the copy button carries a day over to the next',
    await page.evaluate(() => JSON.stringify(state.evDraft.source.days[5].slots)
                           === JSON.stringify(state.evDraft.source.days[4].slots)));
  await page.locator('#evw .sched-icon-btn.remove').last().click();
  await page.waitForTimeout(150);
  await page.locator('#evw .sched-icon-btn.remove').last().click();
  await page.waitForTimeout(200);
  check('Saturday is empty again after undoing the copy',
    await page.evaluate(() => state.evDraft.source.days[5].slots.length) === 0);

  // switching the kind re-lists the picker and clears the pick
  await page.click('.seg button:has-text("Playlist")');
  await page.waitForTimeout(250);
  check('switching the kind clears the picked source',
    await page.evaluate(() => state.evDraft.source.kind === 'playlist' && !state.evDraft.source.refId));
  const optTexts = await page.locator('.card select').first().locator('option').allTextContents();
  check('the source picker now lists playlists, not streams',
    optTexts.some(o => /Weihnachten 2026/.test(o)) && !optTexts.some(o => /Klassik Radio Berlin/.test(o)),
    optTexts.join(' | ').slice(0, 90));
  dialogs.length = 0;
  await page.click('button:has-text("Event speichern")');
  await page.waitForTimeout(250);
  check('saving without a source is refused',
    /Audioquelle/.test(dialogs[0] || ''), dialogs.join(' | '));
  await page.click('.seg button:has-text("Radio")');
  await page.waitForTimeout(250);
  await page.locator('.card select').first().selectOption('RS-001');
  await page.waitForTimeout(200);
  await page.screenshot({ path: out('mu-8-v1-editor.png'), fullPage: true });

  // ── validation ──
  const nameInput = page.locator('.card input[type=text]').first();
  await nameInput.fill('');
  dialogs.length = 0;
  await page.click('button:has-text("Event speichern")');
  await page.waitForTimeout(200);
  check('an event without a name is refused', /Eventname/.test(dialogs[0] || ''), dialogs.join(' | '));
  await nameInput.fill('Klassik-Radio Vormittag');
  await page.locator('#evs-0-0-e').fill('09:00');
  dialogs.length = 0;
  await page.click('button:has-text("Event speichern")');
  await page.waitForTimeout(200);
  check('a period whose start and end are identical is refused, naming the day',
    /identisch/.test(dialogs[0] || '') && /Mo/.test(dialogs[0] || ''), dialogs.join(' | '));
  await page.locator('#evs-0-0-e').fill('12:00');
  await page.waitForTimeout(150);

  // ── overlap warning: same rank only ──
  check('no warning while nothing collides', (await page.locator('.ev-warn').count()) === 0);
  await page.click('button:has-text("Abbrechen")');
  await page.waitForTimeout(250);
  await page.click('button:has-text("Neues Event")');
  await page.waitForTimeout(250);
  await page.locator('.card input[type=text]').first().fill('Test-Überschneidung');
  await page.locator('.card select').first().selectOption('RS-002');
  check('a brand-new event starts with an empty week',
    (await page.locator('#evw').textContent()).match(/keine Wiedergabe/g).length === 7);
  await page.locator('#evw tr').filter({ hasText: 'Mo' }).locator('.sched-icon-btn').first().click();
  await page.waitForTimeout(200);
  await page.locator('#evs-0-0-s').fill('10:00');
  await page.locator('#evs-0-0-e').fill('11:00');
  await page.locator('.pick-stn', { hasText: 'Alexanderplatz' }).first().locator('input').click();
  await page.waitForTimeout(300);
  check('two radio events on one station at the same time raise a warning',
    (await page.locator('.ev-warn').count()) === 1
    && (await page.locator('.ev-warn').textContent()).includes('Klassik-Radio Vormittag'),
    (await page.locator('.ev-warn').textContent() || '').replace(/\s+/g, ' ').slice(0, 120));
  check('the warning names the day, the window and the station',
    /Mo/.test(await page.locator('.ev-warn').textContent())
    && /10:00–11:00/.test(await page.locator('.ev-warn').textContent())
    && /Alexanderplatz/.test(await page.locator('.ev-warn').textContent()));
  check('the warning explains that saving is still possible',
    (await page.locator('.ev-warn').textContent()).includes('Speichern ist möglich'));
  await page.screenshot({ path: out('mu-9-v1-overlap.png'), fullPage: true });

  // saving through a conflict asks once, so the warning cannot be scrolled past
  dialogMode = 'dismiss';
  dialogs.length = 0;
  await page.click('button:has-text("Event speichern")');
  await page.waitForTimeout(300);
  check('saving into an equal-rank overlap asks first and names the conflict',
    /Trotzdem speichern/.test(dialogs[0] || '') && /Klassik-Radio Vormittag/.test(dialogs[0] || ''),
    (dialogs[0] || '').replace(/\s+/g, ' ').slice(0, 110));
  check('declining keeps the editor open and saves nothing',
    (await page.locator('.ev-warn').count()) === 1
    && await page.evaluate(() => !musicEvents.some(e => e.name === 'Test-Überschneidung')));
  dialogMode = 'accept';

  await page.click('.seg button:has-text("Playlist")');
  await page.waitForTimeout(250);
  await page.locator('.card select').first().selectOption('PL-001');
  await page.waitForTimeout(300);
  check('a playlist over the same radio does not warn — different rank, priority decides',
    (await page.locator('.ev-warn').count()) === 0);

  // ── saving, with an open end ──
  await page.locator('input[type=date]').nth(1).fill('');
  dialogs.length = 0;
  await page.click('button:has-text("Event speichern")');
  await page.waitForTimeout(350);
  check('the new event saved and is in the list',
    dialogs.length === 0
    && (await page.locator('tbody').textContent()).includes('Test-Überschneidung'), dialogs.join(' | '));
  check('the saved event shows an open period',
    (await page.locator('tbody tr', { hasText: 'Test-Überschneidung' }).locator('td').nth(3).textContent())
      .includes('– offen'));
  check('the saved event shows its single playlist chip',
    (await page.locator('tbody tr', { hasText: 'Test-Überschneidung' }).locator('.chip-playlist').count()) === 1);

  // ── delete ──
  dialogs.length = 0;
  await page.locator('tbody tr', { hasText: 'Test-Überschneidung' }).locator('.btn-danger-ghost').click();
  await page.waitForTimeout(300);
  check('deleting asks first and names the event',
    /Test-Überschneidung/.test(dialogs[0] || ''), dialogs.join(' | '));
  check('the event is gone after confirming',
    !(await page.locator('tbody').textContent()).includes('Test-Überschneidung'));

  // ── back to V2 and switch the interface language ──
  await page.click('.proto-seg button:has-text("Zeitpläne")');
  await page.waitForTimeout(250);
  await page.click('#lang-en');
  await page.waitForTimeout(300);
  const headsEn = (await page.locator('.tbl-wrap th').allTextContents()).map(x => x.trim());
  check('the new screen relabels in English',
    headsEn.join('|') === 'Name|Line|Music|Radio|', headsEn.join('|'));
  check('the variant switcher relabels too',
    (await page.locator('.proto-seg button').allTextContents()).join('|')
      === 'Schedules per station|Event list (V1)',
    (await page.locator('.proto-seg button').allTextContents()).join('|'));
  check('the prototype bar label relabels',
    (await page.locator('#proto-label').textContent()) === 'Prototype variant',
    await page.locator('#proto-label').textContent());
  check('day chips relabel in English',
    (await page.locator('.ms-row .dayc').first().textContent()) === 'Mon');
  check('"ongoing" is used for an open validity',
    (await page.locator('.tbl-wrap').textContent()).includes('ongoing'));
  await rowByStation('Zoologischer Garten').click();
  await page.waitForTimeout(250);
  check('the detail page relabels in English',
    (await page.locator('h1').textContent()).includes('Schedule — Zoologischer Garten · U2')
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
