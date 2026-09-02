/* Step 3 recon + Step 4 deterministic checks, for one target per run.
   Produces statemap.json (conformant with validator-check.js statemap) and
   auto-findings.json in the round directory.

   Usage: node scripts/recon-payapp-r2.cjs v4|ig26

   Why generic enumeration: hand-listing controls is how RECON-2 happened — the
   list said "date panel opens" because that is what the author remembered
   doing. This walks the live DOM instead, and every select gets picked twice.
*/
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const WHICH = process.argv[2];
if (!['v4', 'ig26'].includes(WHICH)) { console.error('usage: recon-payapp-r2.cjs v4|ig26'); process.exit(2); }

const T = {
  v4: {
    dir: 'reports/payment-application-v4/review/round-1',
    url: 'file://' + path.resolve(__dirname, '../projects/payment-application-v4/gsp.html'),
    name: 'projects/payment-application-v4/ (gsp.html + overlay.html)',
    framed: true,
    root: 'body',
  },
  ig26: {
    dir: 'reports/payment-application-ignat-v26/review/round-1',
    url: 'file://' + path.resolve(__dirname, '../reports/payment-application-ignat-v26/review/round-1/target.html'),
    name: "Ignat's prototype v2.6 (single file)",
    framed: false,
    // the entry button ships disabled: the feature toggle is its prerequisite
    prereq: '#gspApply',
    // the configurator only — the hosting page's own settings are exercised
    // separately, because driving them blindly turns the feature back off
    root: '#backdrop',
  },
}[WHICH];

const OUT = path.resolve(__dirname, '..', T.dir);
const jsErrors = [];
const controls = [];
const notExercised = [];
const auto = [];
let A = 0;
const addAuto = (severity, element, finding, impact, fix, evidence) =>
  auto.push({ id: 'AUTO-' + (++A), severity, element, finding, user_impact: impact, suggested_fix: fix, evidence });

function lum(rgb) {
  const [r, g, b] = rgb.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1]; return (hi + 0.05) / (lo + 0.05); };
const parseCol = s => {
  const n = (s.match(/-?\d+(\.\d+)?/g) || []).slice(0, 3).map(Number);
  return /^color\(/.test(s.trim()) ? n.map(v => v * 255) : n;
};

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', e => jsErrors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') jsErrors.push('console: ' + m.text()); });
  await page.goto(T.url);
  await page.waitForTimeout(500);

  // scope() returns the frame or page that holds the configurator
  const inner = () => (T.framed ? page.frameLocator('#ovf') : page);
  const q = sel => inner().locator(sel);

  /* ---------- open the configurator ------------------------------------- */
  const opener = T.framed ? '#pa-open' : '#openRules';
  const disabledAtRest = await page.locator(opener).evaluate(el => el.disabled === true || el.getAttribute('aria-disabled') === 'true');
  const isOpen = async () => (T.framed
    ? await page.locator('#ovh').isVisible().catch(() => false)
    : await page.locator('#backdrop').evaluate(e => e.classList.contains('open')).catch(() => false));
  async function openConfigurator() {
    if (await isOpen()) return;            // an overlay that would not close still covers the opener
    if (T.prereq) { await page.locator(T.prereq).evaluate(el => { if (!el.checked) el.click(); }).catch(() => {}); await page.waitForTimeout(200); }
    await page.click(opener);
    await page.waitForTimeout(600);
  }
  controls.push({
    zone: 'gsp settings', label: 'Configure / Set up matching (entry button)', type: 'button',
    after_interaction: (disabledAtRest
      ? 'ships disabled; enabled only once its prerequisite toggle is on'
      : 'visible and enabled at rest') + '; opens the configurator',
  });
  if (T.prereq) {
    // the input is visually hidden off-viewport, so a pointer click cannot reach
    // it; drive it in the DOM and confirm the state moved before judging anything
    const flip = async () => page.locator(T.prereq).evaluate(el => { el.click(); return el.checked; });
    const off = await flip();
    await page.waitForTimeout(250);
    const gated = await page.locator(opener).evaluate(el => el.disabled === true || el.getAttribute('aria-disabled') === 'true');
    controls.push({
      zone: 'gsp settings', label: 'Apply payments to open invoices (feature toggle)', type: 'switch',
      after_interaction: off === false
        ? `turned off → the entry button becomes unavailable: ${gated}`
        : 'could not be turned off in the DOM; state stayed on',
    });
    if (off === false && !gated) addAuto('Medium', 'feature toggle', 'Turning the feature off leaves its configure entry live',
      'The user can edit rules for something that is switched off', 'Gate the entry on the toggle',
      { action: 'turned the feature toggle off', observed: 'the configure entry stayed enabled' });
    if (off === false) { await flip(); await page.waitForTimeout(200); }
  }
  await openConfigurator();

  // choose custom rules so the whole rule surface exists
  const customRadio = T.framed ? '#m-custom' : '#modeCustom';
  await q(customRadio).check().catch(() => {});
  await page.waitForTimeout(500);

  /* ---------- enumerate every live control in the configurator ----------- */
  const enumerateControls = () => inner().locator(T.root).evaluate(root => {
    const vis = el => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
    };
    // accessible-name order, not convenience order: aria-* wins over a wrapping
    // label, and a wrapping label with no text is not a name at all
    const nameOf = el => {
      if (el.getAttribute('aria-label')) return el.getAttribute('aria-label').trim();
      if (el.getAttribute('aria-labelledby')) {
        const l = document.getElementById(el.getAttribute('aria-labelledby'));
        if (l && l.textContent.trim()) return l.textContent.trim();
      }
      if (el.labels && el.labels.length && el.labels[0].textContent.trim()) return el.labels[0].textContent.trim();
      if (el.tagName === 'BUTTON' || el.tagName === 'SUMMARY') return el.textContent.trim();
      if (el.placeholder) return 'field: ' + el.placeholder;
      return '(no accessible name) ' + (el.id || el.tagName.toLowerCase());
    };
    const zoneOf = el => {
      if (el.closest('#protobar, .protobar, .sheet-foot')) return 'prototype chrome';
      if (el.closest('.bar, .sheet-chrome')) return 'overlay chrome';
      if (el.closest('.o, .option-card')) return 'outcomes';
      if (el.closest('#right, .right, .plain-rail')) return 'read-out';
      if (el.closest('#narrowSection, #scopeRows')) return 'narrow the search';
      if (el.closest('#refineSection, #refineRows')) return 'then refine';
      const grp = el.closest('.grp, .group, fieldset');
      if (grp) {
        const t = (grp.querySelector('.grp-t, legend, .group-title') || {}).textContent || '';
        if (/narrow/i.test(t)) return 'narrow the search';
        if (/refine/i.test(t)) return 'then refine';
        if (t.trim()) return t.trim().toLowerCase().slice(0, 28);
      }
      if (el.closest('.mode-body')) return 'rules body';
      if (el.closest('.mode, .mode-radios')) return 'how to match';
      return 'rules body';
    };
    // id-less controls still have to be driven, or coverage is a fiction
    const cssPath = el => {
      const parts = [];
      let n = el;
      while (n && n.nodeType === 1 && parts.length < 8) {
        if (n.id) { parts.unshift('#' + n.id); break; }
        const p = n.parentElement;
        if (!p) { parts.unshift(n.tagName.toLowerCase()); break; }
        const i = [...p.children].indexOf(n) + 1;
        parts.unshift(n.tagName.toLowerCase() + ':nth-child(' + i + ')');
        n = p;
      }
      return parts.join(' > ');
    };
    const out = [];
    root.querySelectorAll('select, input, button, summary, [role="switch"], [role="radio"]').forEach(el => {
      if (!vis(el)) return;
      if (el.type === 'hidden') return;
      const type = el.tagName === 'SELECT' ? 'select'
        : el.tagName === 'SUMMARY' ? 'accordion'
        : el.getAttribute('role') === 'switch' ? 'switch'
        : el.type === 'checkbox' ? 'checkbox'
        : el.type === 'radio' ? 'radio'
        : el.type === 'number' ? 'number field'
        : el.tagName === 'INPUT' ? 'text field'
        : 'button';
      out.push({
        id: el.id || null, sel: el.id ? '#' + el.id : cssPath(el),
        type, label: nameOf(el), zone: zoneOf(el),
        disabled: !!el.disabled,
        optionCount: el.tagName === 'SELECT' ? el.options.length : undefined,
      });
    });
    return out;
  });

  /* ---------- exercise them --------------------------------------------- */
  const primary = T.framed ? '#ov-save' : '#saveBtn';
  const applyReachable = async () => {
    try {
      const el = q(primary);
      return (await el.isVisible()) && (await el.evaluate(e => getComputedStyle(e).pointerEvents !== 'none'));
    } catch (e) { return false; }
  };

  const seen = new Set();
  async function exercise(found) {
  for (const c of found) {
    const key = (c.id || '') + '|' + c.label;
    if (seen.has(key)) continue;
    seen.add(key);
    const rec = { zone: c.zone, label: c.label, type: c.type };
    if (c.disabled) {
      rec.after_interaction = 'disabled — cannot be operated';
      // a disabled panel-opener still needs a declared reason, or the gate is right to fail
      if (/select|accordion|panel|menu/i.test(c.type)) notExercised.push({ control: c.label, reason: 'rendered disabled in this state' });
      controls.push(rec);
      continue;
    }
    if (!c.sel) {                      // genuinely unaddressable: record and excuse
      rec.after_interaction = 'no addressable selector; not driven programmatically';
      if (/select|accordion/i.test(c.type)) notExercised.push({ control: c.label, reason: 'no addressable selector' });
      controls.push(rec);
      continue;
    }
    const sel = c.sel;
    try {
      if (c.type === 'select') {
        const before = await q(sel).inputValue();
        const opts = await q(sel).evaluate(el => [...el.options].map(o => o.value));
        const first = opts.find(v => v !== before) || before;
        await q(sel).selectOption(first);
        await page.waitForTimeout(120);
        const mid = await q(sel).inputValue();
        const applyMid = await applyReachable();
        // second interaction: PROTO-2 only shows on the repeat
        const second = opts.find(v => v !== mid) || mid;
        await q(sel).selectOption(second);
        await page.waitForTimeout(120);
        const after = await q(sel).inputValue();
        const stillVisible = await q(sel).isVisible().catch(() => false);
        const stillClickable = stillVisible && await q(sel).evaluate(el => !el.disabled && getComputedStyle(el).pointerEvents !== 'none').catch(() => false);
        rec.commit_path = {
          picked: mid !== before || opts.length === 1,
          reached_apply: applyMid,
          second_interaction: after !== mid || opts.length < 3,
          still_visible: stillVisible,
          still_clickable: stillClickable,
        };
        rec.after_interaction = `value ${before} → ${mid} → ${after}; primary action reachable: ${applyMid}; still operable: ${stillClickable}`;
        if (!stillClickable) addAuto('High', c.label, 'Select is no longer operable after two changes',
          'The control silently stops responding', 'Keep the node alive across re-renders',
          { action: 'changed the value twice', observed: 'control not clickable afterwards' });
      } else if (c.type === 'accordion') {
        const d = q(sel);
        await d.click(); await page.waitForTimeout(150);
        const open1 = await d.evaluate(el => !!el.closest('details')?.open).catch(() => null);
        await d.click(); await page.waitForTimeout(150);
        const open2 = await d.evaluate(el => !!el.closest('details')?.open).catch(() => null);
        rec.commit_path = { toggled: open1 !== open2, reached_apply: await applyReachable(),
                            second_interaction: true, still_visible: await d.isVisible(), still_clickable: await d.isVisible() };
        rec.after_interaction = `open ${open1} then ${open2}`;
      } else if (c.type === 'switch' || c.type === 'checkbox' || c.type === 'radio') {
        const before = await q(sel).isChecked().catch(async () => await q(sel).evaluate(el => el.getAttribute('aria-checked') === 'true'));
        await q(sel).click();
        await page.waitForTimeout(150);
        const gone = (await q(sel).count()) === 0;
        const mid = gone ? null : await q(sel).isChecked().catch(async () => await q(sel).evaluate(el => el.getAttribute('aria-checked') === 'true'));
        let after = mid;
        if (!gone && c.type !== 'radio') { await q(sel).click(); await page.waitForTimeout(150); after = await q(sel).isChecked().catch(() => null); }
        rec.after_interaction = gone
          ? `checked ${before} → control removed from the DOM by the resulting re-render`
          : `checked ${before} → ${mid} → ${after}; still visible: ${!gone}`;
        if (!gone && mid === before) addAuto('Critical', c.label, 'Clicking this control does not change its state',
          'A control that does nothing', 'Bind a change handler or remove the control',
          { action: 'clicked it', observed: `state stayed ${before}` });
      } else if (c.type === 'number field') {
        const before = await q(sel).inputValue();
        await q(sel).fill('99999'); await q(sel).evaluate(el => el.blur()); await page.waitForTimeout(150);
        const big = await q(sel).inputValue();
        await q(sel).fill(''); await q(sel).evaluate(el => el.blur()); await page.waitForTimeout(150);
        const empty = await q(sel).inputValue();
        await q(sel).fill(before); await q(sel).evaluate(el => el.blur()); await page.waitForTimeout(120);
        rec.after_interaction = `typed 99999 → kept "${big}"; cleared → "${empty}"; restored ${before}`;
        const max = await q(sel).getAttribute('max');
        if (max && Number(big) > Number(max)) addAuto('High', c.label,
          `Accepts ${big}, above its own max of ${max}`, 'A value the product cannot honour is stored and echoed back',
          'Clamp on commit and say what limit was applied',
          { action: 'typed 99999 and blurred', observed: `field kept ${big}` });
      } else if (c.type === 'text field') {
        await q(sel).fill('recon');
        await page.waitForTimeout(120);
        const kept = await q(sel).inputValue();
        const focused = await q(sel).evaluate(el => document.activeElement === el).catch(() => false);
        rec.after_interaction = `typed "recon" → kept "${kept}"; still focused: ${focused}`;
        if (!focused) addAuto('High', c.label, 'Typing moves focus out of the field',
          'The field cannot be typed into normally', 'Do not re-render from an input handler',
          { action: 'typed into it', observed: 'focus left the field' });
        await q(sel).fill('');
      } else {
        // buttons: click only the safe, non-committing ones
        const isChrome = /overlay chrome|prototype chrome/.test(c.zone);
        if (/update|save|discard/i.test(c.label) || (isChrome && /^(close|✕|×)/i.test(c.label))) {
          rec.after_interaction = 'not clicked during enumeration — commits or closes; exercised separately below';
          notExercised.push({ control: c.label, reason: 'commits or closes the overlay; exercised in the dedicated pass' });
        } else {
          await q(sel).click(); await page.waitForTimeout(200);
          rec.after_interaction = `clicked; primary action reachable afterwards: ${await applyReachable()}`;
        }
      }
    } catch (e) {
      rec.after_interaction = 'could not be driven: ' + String(e).split('\n')[0].slice(0, 120);
      notExercised.push({ control: c.label, reason: 'driver error: ' + String(e).split('\n')[0].slice(0, 80) });
    }
    controls.push(rec);
  }
  }

  await exercise(await enumerateControls());

  /* second sweep: controls that only exist once a row asks for a key, and the
     row added by "+ Add condition" — a first sweep never sees either */
  try {
    if (T.framed) {
      await q('#c-msrc').selectOption('payment_meta');
    } else {
      if (await q('#refineRows .nl-row').count() === 0) { await q('#addCond').click(); await page.waitForTimeout(300); }
      const row = q('#refineRows .nl-row').first();
      const n = await row.locator('select').count();
      let done = false;
      for (let i = 0; i < n && !done; i++) {
        const opts = await row.locator('select').nth(i).evaluate(el => [...el.options].map(o => o.value));
        const meta = opts.find(v => /meta/i.test(v));
        if (meta) { await row.locator('select').nth(i).selectOption(meta); done = true; }
      }
      if (!done) throw new Error('no select offers a metadata source');
    }
    await page.waitForTimeout(300);
    await exercise(await enumerateControls());
  } catch (e) { notExercised.push({ control: 'metadata key field', reason: 'could not set a metadata source: ' + String(e).split('\n')[0].slice(0, 70) }); }

  /* ---------- the commit path that matters: Update with something missing */
  await page.reload(); await page.waitForTimeout(500);
  await openConfigurator();
  await q(customRadio).check().catch(() => {});
  await page.waitForTimeout(400);
  // put a metadata source in with no key, then press the primary action
  const srcSel = T.framed ? '#c-msrc' : null;
  let submitStory = 'not reachable';
  try {
    if (T.framed) {
      await q('#c-msrc').selectOption('payment_meta');
    } else {
      if (await q('#refineRows .nl-row').count() === 0) { await q('#addCond').click(); await page.waitForTimeout(300); }
      const row = q('#refineRows .nl-row').first();
      const n = await row.locator('select').count();
      let done = false;
      for (let i = 0; i < n && !done; i++) {
        const opts = await row.locator('select').nth(i).evaluate(el => [...el.options].map(o => o.value));
        const meta = opts.find(v => /meta/i.test(v));
        if (meta) { await row.locator('select').nth(i).selectOption(meta); done = true; }
      }
      if (!done) throw new Error('no select offers a metadata source');
    }
    await page.waitForTimeout(250);
    await q(primary).click();
    await page.waitForTimeout(400);
    const stillOpen = T.framed ? await page.locator('#ovh').isVisible() : await page.locator('#backdrop').evaluate(e => e.classList.contains('open'));
    const banner = T.framed
      ? (await q('.alert').count()) > 0
      : await q('#submitAlert').evaluate(e => e.offsetParent !== null && /show|open|vis/.test(e.className)).catch(() => false);
    submitStory = `pressed the primary action with a metadata source and no key → overlay still open: ${stillOpen}; a summary message shown: ${!!banner}`;
    controls.push({
      zone: 'overlay chrome', label: 'Update (primary action) with a required field empty', type: 'button',
      commit_path: { toggled: true, reached_apply: true, second_interaction: true, still_visible: true, still_clickable: true },
      after_interaction: submitStory,
    });
    if (!banner) addAuto('Critical', 'primary action', 'Pressing Update with a required field empty gives no message',
      'The user cannot tell why nothing happened', 'Show what is missing and where',
      { action: 'pressed Update with the Stripe field blank', observed: 'no summary message appeared' });
  } catch (e) { submitStory = 'driver error: ' + String(e).split('\n')[0].slice(0, 100); }

  /* ---------- exit paths: does an unsaved rule survive a close? ---------- */
  let discardStory;
  try {
    await page.reload(); await page.waitForTimeout(450);
    await openConfigurator();
    await q(customRadio).check().catch(() => {});
    await page.waitForTimeout(350);
    // make one real change, so closing has something to lose
    await q(T.framed ? '#n-cust' : '#addCond').click().catch(() => {});
    await page.waitForTimeout(300);
    const closeSel = T.framed ? '#ov-close' : '#closeX';
    await q(closeSel).click();
    await page.waitForTimeout(400);
    const prompt = T.framed ? await q('#cfm').isVisible().catch(() => false) : false;
    const closed = T.framed ? !(await page.locator('#ovh').isVisible()) : !(await page.locator('#backdrop').evaluate(e => e.classList.contains('open')));
    discardStory = `clicked close with unsaved changes → a discard prompt appeared: ${prompt}; overlay closed immediately: ${closed}`;
    controls.push({ zone: 'overlay chrome', label: 'Close (×) with unsaved changes', type: 'button', after_interaction: discardStory });
    if (!prompt && closed) addAuto('High', 'close control', 'Closing discards an unsaved rule with no confirmation',
      'A half-built rule is lost to one click', 'Ask before discarding when the draft differs from what is saved',
      { action: 'changed a control, then clicked ×', observed: 'closed immediately, changes gone' });
  } catch (e) { discardStory = 'driver error'; }

  /* ---------- Escape, focus, inert -------------------------------------- */
  await page.reload(); await page.waitForTimeout(400);
  await openConfigurator();
  const focusIn = await inner().locator('body').evaluate(() => document.activeElement && (document.activeElement.id || document.activeElement.tagName));
  const behindInert = await page.evaluate(() => {
    const el = document.querySelector('.gsp, .shell');
    return el ? el.inert === true : null;
  });
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  const escClosed = T.framed ? !(await page.locator('#ovh').isVisible()) : !(await page.locator('#backdrop').evaluate(e => e.classList.contains('open')));
  controls.push({ zone: 'overlay chrome', label: 'Escape key', type: 'button',
    after_interaction: `focus on open was ${focusIn}; page behind inert: ${behindInert}; Escape closed the overlay: ${escClosed}` });
  if (behindInert !== true) addAuto('High', 'overlay', 'The page behind the overlay stays reachable by Tab',
    'Keyboard focus leaves the dialog while it is open', 'Mark the page behind inert while the overlay is open',
    { action: 'opened the overlay and inspected the page behind', observed: 'inert is ' + behindInert });

  /* ---------- Step 4: deterministic checks ------------------------------ */
  await page.reload(); await page.waitForTimeout(400);
  await openConfigurator();
  await q(customRadio).check().catch(() => {});
  await page.waitForTimeout(600);

  const nodes = await inner().locator('body').evaluate(() => {
    const bgOf = el => {
      let n = el;
      while (n && n !== document.documentElement) {
        const c = getComputedStyle(n).backgroundColor;
        if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') return c;
        n = n.parentElement;
      }
      return 'rgb(255,255,255)';
    };
    const out = [];
    document.querySelectorAll('*').forEach(el => {
      if (el.offsetParent === null && el.tagName !== 'BODY') return;
      const t = [...el.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim()).map(n => n.textContent.trim()).join(' ');
      if (!t) return;
      const cs = getComputedStyle(el);
      // a SQL/JSON preview is meant to be monospaced; only product chrome is judged
      const codePanel = !!el.closest('pre, code, #sql-body, #sim-out, .mono, .code');
      out.push({ text: t.slice(0, 44), color: cs.color, bg: bgOf(el), size: parseFloat(cs.fontSize), weight: cs.fontWeight, font: cs.fontFamily, codePanel });
    });
    return out;
  });
  const cFail = nodes.map(c => ({ ...c, r: ratio(parseCol(c.color), parseCol(c.bg)) }))
    .filter(c => c.r < ((c.size >= 24 || (c.size >= 18.66 && Number(c.weight) >= 700)) ? 3 : 4.5));
  if (cFail.length) addAuto('High', 'text nodes', `${cFail.length} text node(s) below WCAG AA contrast`,
    'Small grey text is hard to read', 'Darken the token or raise the size',
    { quote: cFail.slice(0, 5).map(f => `"${f.text}" ${f.r.toFixed(2)}:1`).join(' · '), source: 'WCAG 2.1 AA 1.4.3' });

  const wrongFont = [...new Set(nodes.filter(n => !n.codePanel && !/Roboto/i.test(n.font)).map(n => n.font.split(',')[0]))];
  if (wrongFont.length) addAuto('Medium', 'typography', `Body text is not Roboto (${wrongFont.join(', ')})`,
    'Off-system typography', 'Use Roboto, the Synder React/MUI face',
    { quote: wrongFont.join(', '), source: 'DESIGN_RULES.md / synder-design-tokens.css — Roboto, not Inter' });

  const palette = await inner().locator('body').evaluate(() => {
    const want = ['rgb(0, 83, 204)'];
    const found = new Set();
    document.querySelectorAll('button, .btn, [class*="primary"]').forEach(el => {
      const bg = getComputedStyle(el).backgroundColor;
      if (/^rgb\(/.test(bg) && bg !== 'rgba(0, 0, 0, 0)') found.add(bg);
    });
    return { primaries: [...found], expected: want };
  });
  const offPalette = palette.primaries.filter(c => /rgb\((\d+), (\d+), (\d+)\)/.test(c))
    .filter(c => { const [r, g, b] = c.match(/\d+/g).map(Number); return b > 150 && r < 120 && !(r === 0 && g === 83 && b === 204); });
  if (offPalette.length) addAuto('Medium', 'colour', `Primary action colour is not Synder blue (${offPalette.join(', ')})`,
    'Off-brand primary', 'Use #0053CC', { quote: offPalette.join(', '), source: 'DESIGN_RULES.md — primary #0053CC' });

  const radii = await inner().locator('body').evaluate(() => {
    const bad = [];
    document.querySelectorAll('button, .btn').forEach(el => {
      const r = parseFloat(getComputedStyle(el).borderTopLeftRadius);
      if (r > 4) bad.push((el.textContent || el.id || 'button').trim().slice(0, 20) + ' r=' + r);
    });
    return [...new Set(bad)];
  });
  if (radii.length) addAuto('Medium', 'buttons', `${radii.length} action button(s) with radius over 4px`,
    'Off-system button shape', 'Use the 4px action radius',
    { quote: radii.slice(0, 4).join(', '), source: 'DESIGN_RULES.md — radius max 4px on action buttons' });

  // pointer-cursor candidates are only reported once a real click proves they do
  // nothing: handlers bound with addEventListener are invisible to DOM inspection
  const deadCandidates = await inner().locator('body').evaluate(() => {
    const cssPath = el => {
      const parts = []; let n = el;
      while (n && n.nodeType === 1 && parts.length < 8) {
        if (n.id) { parts.unshift('#' + n.id); break; }
        const p = n.parentElement;
        if (!p) { parts.unshift(n.tagName.toLowerCase()); break; }
        parts.unshift(n.tagName.toLowerCase() + ':nth-child(' + ([...p.children].indexOf(n) + 1) + ')');
        n = p;
      }
      return parts.join(' > ');
    };
    const out = [];
    document.querySelectorAll('*').forEach(el => {
      if (getComputedStyle(el).cursor !== 'pointer') return;
      if (/^(BUTTON|A|SELECT|INPUT|LABEL|SUMMARY|OPTION|TEXTAREA)$/.test(el.tagName)) return;
      if (el.closest('label,button,a,summary')) return;
      out.push({ sel: cssPath(el), desc: (el.className || el.tagName) + ' :: ' + (el.textContent || '').trim().slice(0, 26) });
    });
    return out;
  });
  const sig = () => inner().locator('body').evaluate(() =>
    [...document.querySelectorAll('input,select,textarea')].map(e => e.type === 'checkbox' || e.type === 'radio' ? e.checked : e.value).join('|')
    + '#' + document.body.innerText.length);
  const dead = [];
  for (const cand of deadCandidates) {
    try {
      const before = await sig();
      const box = await q(cand.sel).boundingBox();
      if (!box) continue;
      await page.mouse.click(box.x + box.width - 6, box.y + box.height - 6);
      await page.waitForTimeout(250);
      if (await sig() === before) dead.push(cand.desc);
    } catch (e) { /* unreachable candidate: not evidence of anything */ }
  }
  const unnamed = await inner().locator('body').evaluate(() => {
    const bad = [];
    document.querySelectorAll('select, input:not([type="hidden"]), button').forEach(el => {
      if (el.offsetParent === null) return;
      const named = (el.labels && el.labels.length) || el.getAttribute('aria-label') ||
        el.getAttribute('aria-labelledby') || (el.tagName === 'BUTTON' && el.textContent.trim());
      if (!named) bad.push(el.tagName + '#' + (el.id || '?'));
    });
    return bad;
  });
  if (unnamed.length) addAuto('Critical', 'form controls', `${unnamed.length} control(s) have no accessible name`,
    'A screen reader announces them as unlabelled', 'Give each a <label for> or an aria-label',
    { action: 'queried every visible control for an accessible name', observed: unnamed.slice(0, 8).join(', ') });

  const inertNow = await page.evaluate(() => { const el = document.querySelector('.gsp, .shell'); return el ? el.inert === true : null; });

  if (jsErrors.length) addAuto('Critical', 'runtime', `${jsErrors.length} JS error(s) during the recon pass`,
    'Broken behaviour', 'Fix the errors', { action: 'drove every control', observed: jsErrors.slice(0, 3).join(' | ') });

  await page.screenshot({ path: path.join(OUT, 'recon.png'), fullPage: false });

  /* ---------- write artifacts ------------------------------------------ */
  const map = {
    target: T.name,
    recorded: new Date().toISOString().slice(0, 10),
    primary_task: 'Set up, review and save the rule that decides which existing invoice a payment is applied to, for one integration.',
    zones: ['gsp settings', 'overlay chrome', 'how to match', 'narrow the search', 'then refine', 'outcomes', 'read-out', 'prototype chrome'],
    environment: { page_behind_inert_while_open: inertNow, js_errors: jsErrors.length },
    not_exercised: notExercised,
    controls,
  };
  fs.writeFileSync(path.join(OUT, 'statemap.json'), JSON.stringify(map, null, 2) + '\n');
  fs.writeFileSync(path.join(OUT, 'auto-findings.json'), JSON.stringify({ findings: auto }, null, 2) + '\n');
  console.log(`${WHICH}: ${controls.length} controls, ${notExercised.length} not exercised, ${auto.length} auto-findings, ${jsErrors.length} JS errors`);
  await browser.close();
})();
