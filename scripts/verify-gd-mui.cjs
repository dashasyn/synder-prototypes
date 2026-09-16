#!/usr/bin/env node
/**
 * verify-gd-mui.cjs — the gates for the Grunddaten React/MUI port.
 *
 * Every gate here exists because the corresponding bug shipped once
 * (MUI_PORT_BRIEF.md §5). Run it against the local file or a published URL:
 *
 *   node scripts/verify-gd-mui.cjs
 *   node scripts/verify-gd-mui.cjs https://dashasyn.github.io/…/grunddaten-mui/
 *
 * The layout gate runs FIRST and stops the run: 183 assertions once passed
 * while the page was squeezed into a third of the window, because every one
 * of them checked a computed style and none checked the page was laid out.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const os = require('os');

// GD_DIR lets scripts/gd-prove-gates.cjs point the source gates at a
// deliberately broken copy, which is how each gate is proved to fire.
const DIR = path.resolve(process.env.GD_DIR || path.resolve(__dirname, '../projects/grunddaten-mui'));
const ARG = process.argv[2];
const URL = ARG || 'http://localhost:8777/projects/grunddaten-mui/index.html';
const CHROME = os.homedir() + '/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome';

let pass = 0; const fails = [];
const ok = (cond, label, detail) => {
  if (cond) { pass++; }
  else { fails.push(label + (detail !== undefined ? `  — got ${JSON.stringify(detail)}` : '')); }
};
const section = s => console.log(`\n── ${s}`);

/* Comments describe the port; they are not the port. A gate that reads them
   flags its own documentation — the first run failed on the line that says
   "native <select> became MUI Select". */
const stripComments = src => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:'"\\])\/\/.*$/gm, '$1');

/* ── source-level gates, no browser needed ─────────────────────────── */
function sourceGates() {
  section('source');
  const files = fs.readdirSync(DIR).filter(f => f.endsWith('.js'));
  const all = Object.fromEntries(files.map(f => [f, stripComments(fs.readFileSync(path.join(DIR, f), 'utf8'))]));

  // A key is truthy, so the fallback NEVER fires. This shipped three times.
  for (const [f, src] of Object.entries(all)) {
    const hit = src.match(/\bt\((['"`][^'"`]+['"`][^)]*)\)\s*\|\|/);
    ok(!hit, `${f}: no t('x') || 'fallback'`, hit && hit[0]);
  }

  // Native selects take no styling; the brief requires a real MUI Menu.
  for (const [f, src] of Object.entries(all)) {
    ok(!/<select[\s>]/i.test(src), `${f}: no native <select>`);
  }

  // The <style> block stays near-empty and styles no component.
  const idx = fs.readFileSync(path.join(DIR, 'index.html'), 'utf8');
  const style = (idx.match(/<style>([\s\S]*?)<\/style>/) || [, ''])[1];
  const selectors = [...style.matchAll(/^\s*([.#a-z][^{@\n]*)\{/gm)].map(m => m[1].trim());
  const nonSwitcher = selectors.filter(s => !/variant-switch|^html|^body|#root/.test(s));
  ok(nonSwitcher.length === 0, 'index.html: CSS styles nothing but the variant switcher', nonSwitcher);

  // A `style=` on a MUI component means MUI is being fought rather than used.
  for (const [f, src] of Object.entries(all)) {
    if (f === 'data.js' || f === 'i18n.js') continue;
    const hits = [...src.matchAll(/<\$\{[A-Z]\w*\}[^>]*?\sstyle=/g)];
    ok(hits.length === 0, `${f}: no style= on a MUI component`, hits.length);
  }

  // data.js and i18n.js are generated; nothing may hand-edit them. (The header
  // itself is a comment, so this one reads the file rather than the stripped copy.)
  for (const f of ['data.js', 'i18n.js']) {
    const raw = fs.readFileSync(path.join(DIR, f), 'utf8');
    ok(/GENERATED — do not edit/.test(raw), `${f}: still carries the generated header`);
  }

  // Every view the shell can route to is registered by some file.
  const registered = new Set();
  for (const src of Object.values(all)) {
    for (const m of src.matchAll(/\bVIEWS\.(\w+)\s*=\s*\w/g)) registered.add(m[1]);
  }
  const expected = ['stations', 'detail', 'sounds', 'spc', 'texts', 'lines', 'lineDetail',
                    'lineMgmt', 'playlistDetail', 'music', 'musicEvent', 'musicStations', 'musicStation'];
  const missing = expected.filter(v => !registered.has(v));
  ok(missing.length === 0, 'every vanilla view is registered', missing);
  return registered;
}

/* ── browser gates ─────────────────────────────────────────────────── */
const rawKeyLike = page => page.evaluate(() => {
  // t() returns the key on a miss, and a snake_case key looks like a label.
  // Material Icons ligatures are also snake_case, so they are excluded by
  // class, not by guessing which strings are icons.
  const out = [];
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    const el = n.parentElement;
    if (!el || el.closest('.material-icons')) continue;
    const s = (n.textContent || '').trim();
    if (/^[a-z][a-zA-Z0-9]*([A-Z][a-zA-Z0-9]*)+$/.test(s) && s.length > 3 && !s.includes(' ')) out.push(s);
    if (/^[a-z]+(_[a-z]+)+$/.test(s)) out.push(s);
  }
  return [...new Set(out)];
});

async function run() {
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const jsErrors = [];
  page.on('pageerror', e => jsErrors.push(e.message));
  // A console "Failed to load resource" carries no URL, so a missing script
  // reads the same as a missing favicon. Watch responses instead.
  page.on('response', r => {
    if (r.status() >= 400 && !/favicon/.test(r.url())) jsErrors.push(`${r.status()} ${r.url()}`);
  });
  page.on('console', m => {
    const txt = m.text();
    if (m.type() === 'error' && !/favicon|Failed to load resource/.test(txt)) jsErrors.push(txt);
  });

  await page.goto(URL, { waitUntil: 'networkidle' });
  // wait on a string that cannot exist in the vanilla prototype
  await page.waitForSelector('.MuiAppBar-root', { timeout: 15000 });
  await page.waitForTimeout(600);

  /* ── GATE 0 — layout. Runs first, and stops the run. ───────────── */
  section('layout gate');
  const failsBeforeLayout = fails.length;
  const layout = await page.evaluate(() => {
    const body = document.body;
    const sw = document.querySelector('.variant-switch');
    const bar = document.querySelector('.MuiAppBar-root');
    const main = document.querySelector('main');
    const bg = getComputedStyle(body).backgroundColor;
    return {
      vw: window.innerWidth,
      switcherW: sw ? Math.round(sw.getBoundingClientRect().width) : 0,
      switcherTop: sw ? Math.round(sw.getBoundingClientRect().top) : -1,
      switcherFirst: sw ? sw === document.getElementById('root').firstElementChild : false,
      barW: bar ? Math.round(bar.getBoundingClientRect().width) : 0,
      barH: bar ? Math.round(bar.getBoundingClientRect().height) : 0,
      mainW: main ? Math.round(main.getBoundingClientRect().width) : 0,
      mainH: main ? Math.round(main.getBoundingClientRect().height) : 0,
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      opaque: bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent',
      bodyTextLen: body.innerText.length,
    };
  });
  ok(layout.switcherW === layout.vw, 'variant switcher spans the full viewport width', layout);
  ok(layout.switcherTop === 0, 'variant switcher is at the very top', layout.switcherTop);
  ok(layout.switcherFirst, 'variant switcher is the first element rendered');
  ok(layout.barW === layout.vw, 'app bar spans the full viewport width', layout.barW);
  ok(layout.mainW === layout.vw, 'content fills the width', layout.mainW);
  ok(layout.mainH > 400, 'content fills the height', layout.mainH);
  ok(layout.overflow <= 0, 'no horizontal overflow at 1440', layout.overflow);
  ok(layout.opaque, 'page background is opaque (not an alpha overlay token)');
  ok(layout.bodyTextLen > 300, 'the page actually rendered text', layout.bodyTextLen);
  if (fails.length > failsBeforeLayout) {
    console.log('\nLAYOUT GATE FAILED — the rest of the run is meaningless.');
    fails.slice(failsBeforeLayout).forEach(f => console.log('  ✗ ' + f));
    await browser.close();
    process.exit(1);
  }
  console.log('  layout gate passes');

  /* ── theme: the four measured deviations, and the stock values ── */
  section('theme');
  // measure on the station detail, which carries every component at once
  await page.click('header button[data-nav="cfg"]');
  await page.waitForSelector('.MuiMenu-list');
  await page.click('.MuiMenu-list li[data-view="stations"]');
  await page.waitForTimeout(300);
  const theme0 = await page.evaluate(() => {
    const th = document.querySelector('.MuiTableHead-root');
    return { tableHead: th && getComputedStyle(th).backgroundColor };
  });
  await page.click('tbody tr:first-child');
  await page.waitForTimeout(400);
  const theme = await page.evaluate(() => {
    const cs = s => { const el = document.querySelector(s); return el ? getComputedStyle(el) : null; };
    const bar = cs('.MuiAppBar-root');
    const card = cs('.MuiCard-root');
    return {
      bar: bar && bar.backgroundColor, barShadow: bar && bar.boxShadow,
      toolbarH: document.querySelector('.MuiToolbar-root')?.getBoundingClientRect().height,
      card: card && card.borderColor, cardShadow: card && card.boxShadow,
      bodyFont: getComputedStyle(document.body).fontFamily,
    };
  });
  theme.tableHead = theme0.tableHead;
  ok(theme.bar === 'rgb(28, 40, 72)', 'AppBar is the measured navy #1C2848', theme.bar);
  ok(theme.barShadow === 'none', 'AppBar carries no shadow', theme.barShadow);
  ok(Math.round(theme.toolbarH) === 48, 'dense 48px toolbar, not 64', theme.toolbarH);
  ok(theme.card === 'rgb(231, 231, 231)', 'cards are a 1px #E7E7E7 hairline', theme.card);
  ok(theme.cardShadow === 'none', 'cards carry no shadow', theme.cardShadow);
  ok(theme.tableHead === 'rgb(244, 244, 244)', 'TableHead carries the #F4F4F4 band', theme.tableHead);
  ok(/Roboto/.test(theme.bodyFont), 'Roboto', theme.bodyFont);

  // primary, straight off a contained button
  const btn = await page.evaluate(() => {
    const b = [...document.querySelectorAll('.MuiButton-contained')][0];
    return b ? { bg: getComputedStyle(b).backgroundColor, sh: getComputedStyle(b).boxShadow,
                 h: Math.round(b.getBoundingClientRect().height) } : null;
  });
  ok(btn && btn.bg === 'rgb(33, 150, 243)', 'primary is the measured #2196F3', btn && btn.bg);
  ok(btn && btn.sh === 'none', 'buttons have no shadow (disableElevation)', btn && btn.sh);
  ok(btn && btn.h <= 32, 'buttons are size="small"', btn && btn.h);

  const field = await page.evaluate(() => {
    const f = document.querySelector('.MuiFilledInput-root');
    if (!f) return null;
    const label = f.parentElement.querySelector('label');
    return { bg: getComputedStyle(f).backgroundColor, h: Math.round(f.getBoundingClientRect().height),
             labelInside: label ? label.getBoundingClientRect().left >= f.getBoundingClientRect().left : null };
  });
  ok(field && /rgba\(0, 0, 0, 0\.06\)|rgb\(240, 240, 240\)/.test(field.bg),
     'filled field keeps the stock #F0F0F0 fill', field && field.bg);
  ok(field && field.labelInside, 'the label floats inside the field — no left label column');

  /* ── icons render as glyphs, not as the word ───────────────────── */
  section('icons');
  const icons = await page.evaluate(async () => {
    await document.fonts.ready;
    const els = [...document.querySelectorAll('.material-icons')];
    return { loaded: document.fonts.check('24px "Material Icons"'), n: els.length,
             widest: Math.max(0, ...els.map(e => Math.round(e.getBoundingClientRect().width))) };
  });
  ok(icons.loaded, 'the Material Icons font actually loaded');
  ok(icons.n > 0, 'the page uses icons', icons.n);
  // the literal word "chevron_right" is ~90px wide; a glyph is ~18-24px
  ok(icons.widest > 0 && icons.widest < 40,
     'every icon renders as a glyph, not as its ligature name', icons.widest);

  /* ── the i18n and selector gates run on EVERY view, in both languages.
        Both of them once passed against a deliberately broken build,
        because each looked at the one screen the run happened to be on:
        a raw key planted in the stations list is invisible from the station
        detail, and so is an "All" option in the line filter. A gate that
        only looks where the bug is not, is not a gate. ───────────────── */
  const rawKeys = [];
  const selects = [];
  const visited = [];

  const sweep = async () => {
    visited.push(await page.getAttribute('main[data-view]', 'data-view'));
    for (const k of await rawKeyLike(page)) rawKeys.push(k);
    for (const s of await page.evaluate(() => {
      const out = [];
      document.querySelectorAll('.MuiFormControl-root').forEach(fc => {
        const sel = fc.querySelector('.MuiSelect-select');
        if (!sel) return;
        const label = fc.querySelector('label');
        out.push({ view: document.querySelector('main').dataset.view,
                   label: label ? label.textContent.trim() : null,
                   value: sel.textContent.trim() });
      });
      return out;
    })) selects.push(s);
  };

  const clearOverlays = async () => {
    for (let i = 0; i < 3; i++) {
      if (!(await page.$('.MuiDialog-root, .MuiMenu-root'))) break;
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
    }
  };

  const walkEverything = async () => {
    const seeds = [['cfg', 'stations'], ['cfg', 'lines'], ['cfg', 'spc'],
                   ['cfg', 'texts'], ['cfg', 'sounds'], ['cfg', 'lineMgmt'],
                   ['evr', 'music']];
    for (const [menu, dv] of seeds) {
      await clearOverlays();
      await page.click(`header button[data-nav="${menu}"]`);
      await page.waitForSelector('.MuiMenu-list', { timeout: 5000 });
      await page.click(`.MuiMenu-list li[data-view="${dv}"]`);
      await page.waitForTimeout(400);
      await sweep();

      // the tabs on the audio library are views in their own right
      const tabs = await page.$$('[role=tab]');
      for (let i = 1; i < tabs.length; i++) {
        const fresh = await page.$$('[role=tab]');
        if (!fresh[i]) break;
        await fresh[i].click(); await page.waitForTimeout(300);
        await sweep();
      }

      // …and the detail behind the first row
      const before = await page.getAttribute('main[data-view]', 'data-view');
      for (const go of [() => page.click('tbody tr:first-child button:has-text("Bearbeiten")', { timeout: 1200 }),
                        () => page.click('tbody tr:first-child', { timeout: 1200 })]) {
        try {
          await go(); await page.waitForTimeout(500);
          if (await page.getAttribute('main[data-view]', 'data-view') !== before) { await sweep(); break; }
          await clearOverlays();
        } catch (e) { /* no such route here */ }
      }
    }
    // the variant switcher is the only route to the other music version
    for (const b of ['#vs-1', '#vs-2']) {
      await clearOverlays();
      await page.click(b);
      await page.waitForTimeout(450);
      await sweep();
      const before = await page.getAttribute('main[data-view]', 'data-view');
      try {
        await page.click('tbody tr:first-child button:has-text("Bearbeiten")', { timeout: 1200 });
      } catch (e) { try { await page.click('tbody tr:first-child', { timeout: 1200 }); } catch (e2) {} }
      await page.waitForTimeout(500);
      if (await page.getAttribute('main[data-view]', 'data-view') !== before) await sweep();
    }
  };

  section('i18n — every reachable view, both languages');
  await walkEverything();
  const deKeys = [...rawKeys];
  ok(deKeys.length === 0, `no raw i18n key on any of ${visited.length} German screens`, deKeys.slice(0, 6));

  await clearOverlays();
  await page.click('button[aria-label="English"]');
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => document.documentElement.lang) === 'en',
     '<html lang> follows the switcher, so native date inputs localise');
  rawKeys.length = 0; visited.length = 0;
  await walkEverything();
  ok(rawKeys.length === 0, `and none on any of ${visited.length} English screens`, rawKeys.slice(0, 6));

  await clearOverlays();
  await page.click('button[aria-label="Deutsch"]');
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => document.documentElement.lang) === 'de', 'and back to German');

  /* ── no "All" option in any dropdown, and every selector labelled ─ */
  section('selectors');
  ok(selects.length > 5, 'the walk found selectors to check', selects.length);
  const unlabelled = selects.filter(s => !s.label || !s.label.trim());
  ok(unlabelled.length === 0,
     'every selector carries a label — "All" was what named them before', unlabelled);
  const allish = selects.filter(s => /^(alle|all)\b/i.test(s.value));
  ok(allish.length === 0, 'no selector anywhere shows an "All" value', allish);

  return { browser, page, jsErrors };
}

module.exports = { run, ok, section, sourceGates, fails, CHROME, URL,
                   report: () => {
                     console.log(`\n${pass} passed, ${fails.length} failed`);
                     fails.forEach(f => console.log('  ✗ ' + f));
                     return fails.length;
                   } };

if (require.main === module) {
  (async () => {
    sourceGates();
    const { browser, jsErrors } = await run();
    section('runtime');
    ok(jsErrors.length === 0, 'no JS errors anywhere in the run', jsErrors.slice(0, 4));
    await browser.close();
    console.log(`\n${pass} passed, ${fails.length} failed`);
    fails.forEach(f => console.log('  ✗ ' + f));
    process.exit(fails.length ? 1 : 0);
  })();
}
