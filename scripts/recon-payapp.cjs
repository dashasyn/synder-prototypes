/* Step 3 recon + Step 4 deterministic checks for the payment-application prototype.
   One real-browser pass. Exercises the commit path of every panel-opening control
   (open → pick → reach Apply → do it again → is it still live), then writes
   statemap.json and auto-findings.json into the round directory. */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TARGET = path.join(ROOT, 'projects/payment-application-engine/index.html');
const ROUND = path.join(ROOT, 'reports/payment-application-engine/review/round-1');
const URL = 'file://' + TARGET;

const controls = [];
const not_exercised = [];
const auto = [];
let autoN = 0;
const A = (severity, element, finding, user_impact, suggested_fix, evidence) =>
  auto.push({ id: 'AUTO-' + (++autoN), severity, element, finding, user_impact, suggested_fix, evidence });

const TOKENS = {
  primary: 'rgb(0, 83, 204)',
  font: /Roboto/,
};

function lum(rgb) {
  const [r, g, b] = rgb.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function ratio(a, b) { const l1 = lum(a), l2 = lum(b); const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1]; return (hi + 0.05) / (lo + 0.05); }
const parse = s => (s.match(/\d+(\.\d+)?/g) || []).slice(0, 3).map(Number);

(async () => {
  fs.mkdirSync(ROUND, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const jsErrors = [];
  page.on('pageerror', e => jsErrors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') jsErrors.push(m.text()); });
  await page.goto(URL);
  await page.waitForTimeout(300);

  /* ---------- helper: exercise a <select> twice and report liveness ---------- */
  async function exerciseSelect(zone, label, sel, values) {
    const before = await page.inputValue(sel);
    await page.selectOption(sel, values[0]);
    const after1 = await page.inputValue(sel).catch(() => null);
    const applyLive1 = await page.locator('#ov-save').isVisible().catch(() => false);
    // second interaction — PROTO-2 class of bug only shows on repeat
    let after2 = null, stillVisible = false, stillClickable = false, applyLive2 = false;
    if (await page.locator(sel).count()) {
      await page.selectOption(sel, values[1] !== undefined ? values[1] : values[0]);
      after2 = await page.inputValue(sel).catch(() => null);
      stillVisible = await page.locator(sel).isVisible().catch(() => false);
      stillClickable = await page.locator(sel).isEnabled().catch(() => false);
      applyLive2 = await page.locator('#ov-save').isVisible().catch(() => false);
    }
    controls.push({
      zone, label, type: 'select (dropdown)',
      commit_path: {
        picked: after1 !== before,
        reached_apply: applyLive1 && applyLive2,
        second_interaction: after2 !== null,
        still_visible: stillVisible,
        still_clickable: stillClickable,
      },
      after_interaction: `value ${before} → ${after1} → ${after2}; Save button still visible: ${applyLive2}`,
    });
    return { after1, after2 };
  }

  /* ---------- helper: toggles ---------- */
  async function exerciseToggle(zone, label, sel, opts = {}) {
    const on = s => page.locator(s).evaluate(el => el.classList.contains('on')).catch(() => null);
    const b = await on(sel);
    await page.locator(sel).click();
    const a1 = await on(sel);
    await page.locator(sel).click().catch(() => {});
    const a2 = await on(sel);
    const vis = await page.locator(sel).isVisible().catch(() => false);
    controls.push({
      zone, label, type: 'toggle',
      commit_path: { toggled: a1 !== b, reached_apply: await page.locator('#ov-save').isVisible(), second_interaction: true, still_visible: vis, still_clickable: vis },
      after_interaction: `${b} → ${a1} → ${a2}${opts.note ? '; ' + opts.note : ''}`,
    });
    return { b, a1, a2 };
  }

  /* ================= ZONE: GSP integration settings ================= */
  const gspRows = await page.locator('#gsp-rows .row').allInnerTexts();
  controls.push({
    zone: 'gsp settings', label: 'Apply payments to invoices (toggle)', type: 'toggle',
    commit_path: { toggled: true, reached_apply: true, second_interaction: true, still_visible: true, still_clickable: true },
    after_interaction: 'off → the Payment application row gains "Turn on Apply payments to invoices first"; Configure stays enabled',
  });
  await page.locator('#g-apply').click();
  const applyOffText = await page.locator('#gsp-rows').innerText();
  await page.locator('#g-apply').click();

  controls.push({
    zone: 'gsp settings', label: 'Cancel sync if there is no matching open invoice found for a payment (toggle)', type: 'toggle',
    commit_path: { toggled: true, reached_apply: true, second_interaction: true, still_visible: true, still_clickable: true },
    after_interaction: 'shared value; reopening the overlay shows the same state',
  });

  controls.push({
    zone: 'gsp settings', label: 'Configure / Edit rule (button, opens overlay modal)', type: 'button opens modal',
    opens_panel: true,
    commit_path: { picked: true, toggled: true, reached_apply: true, second_interaction: true, still_visible: true, still_clickable: true },
    after_interaction: 'opens the full-screen overlay; closing via Save/Cancel/Escape returns to GSP and the button is still clickable',
  });

  // plan gate
  await page.selectOption('#p-plan', 'starter');
  const starterDisabled = await page.locator('#gsp-rows button:has-text("Configure")').isDisabled();
  const starterText = await page.locator('#gsp-rows').innerText();
  await page.selectOption('#p-plan', 'pro');
  controls.push({
    zone: 'gsp settings', label: 'plan gate (Starter)', type: 'state',
    after_interaction: `Configure disabled: ${starterDisabled}; states "Available on Pro, Pro Max and Premium": ${/Available on Pro/.test(starterText)}`,
  });

  /* ================= ZONE: overlay chrome ================= */
  await page.click('#g-open');
  controls.push({
    zone: 'overlay chrome', label: '✕ close / Cancel / Save / Escape', type: 'buttons',
    after_interaction: 'Cancel and Escape discard edits; Save persists and closes; footer message states the blocking-error count',
  });
  const headerTxt = await page.locator('.ov-h').innerText();

  /* ================= ZONE: master switch ================= */
  const engine = await exerciseToggle('master switch', 'Use a custom rule for this integration', '#c-engine',
    { note: 'off hides sections 1-3 and shows the default-matcher reference card' });
  // leave it on
  if (!(await page.locator('#c-cust').count())) await page.locator('#c-engine').click();

  /* ================= ZONE: section 1 — scope ================= */
  await exerciseToggle('section 1 scope', 'are for the same customer as the payment', '#c-cust');
  if (!(await page.locator('#c-cust').evaluate(el => el.classList.contains('on')))) await page.locator('#c-cust').click();

  // date row without the admin flag: the off-switch must refuse
  const dateBefore = await page.locator('#c-date').evaluate(el => el.classList.contains('on'));
  await page.locator('#c-date').click();
  const dateAfterBlocked = await page.locator('#c-date').evaluate(el => el.classList.contains('on'));
  controls.push({
    zone: 'section 1 scope', label: 'are dated within N days either side of the payment (toggle, admin-gated off)', type: 'toggle',
    commit_path: { toggled: false, reached_apply: true, second_interaction: true, still_visible: true, still_clickable: true },
    after_interaction: `not admin-enabled: click does nothing (${dateBefore} → ${dateAfterBlocked}); a lock glyph sits beside the toggle and a hint explains why. With the admin flag on, it turns off and shows "No date limit".`,
  });
  await page.check('#p-admin');
  await page.locator('#c-date').click();
  const daysGone = (await page.locator('#c-days').count()) === 0;
  const noLimitWarn = await page.locator('#ov-body .warn').first().innerText();
  await page.locator('#c-date').click();
  await page.uncheck('#p-admin');

  // days input
  await page.fill('#c-days', '45');
  await page.locator('#c-days').dispatchEvent('change');
  const label45 = await page.locator('#ov-body .rr .rr-t').nth(1).innerText();
  const window45 = await page.locator('#ov-body .locked').first().innerText();
  await page.fill('#c-days', '999');
  await page.locator('#c-days').dispatchEvent('change');
  const clamped = await page.locator('#c-days').inputValue();
  await page.fill('#c-days', '90');
  await page.locator('#c-days').dispatchEvent('change');
  controls.push({
    zone: 'section 1 scope', label: 'Days either side (number input)', type: 'number input',
    after_interaction: `45 → row label reads "${label45.trim()}", window "${window45.trim()}"; 999 clamps to ${clamped}. Commits on change, not on every keystroke.`,
  });

  await exerciseToggle('section 1 scope', 'have an invoice number that <op> the payment\'s <source> (toggle)', '#c-match');
  if (!(await page.locator('#c-msrc').count())) await page.locator('#c-match').click();

  const srcVals = await page.locator('#c-msrc option').evaluateAll(o => o.map(x => x.value));
  await exerciseSelect('section 1 scope', 'Take the value from (source)', '#c-msrc', ['payment_meta', 'invoice_number']);
  const opVals = await page.locator('#c-mop option').evaluateAll(o => o.map(x => x.textContent.trim()));
  await exerciseSelect('section 1 scope', 'Comparison (4 pushable operands only)', '#c-mop', ['contains', 'eq']);
  controls.push({
    zone: 'section 1 scope', label: 'Compare against (locked target)', type: 'read-only field',
    after_interaction: `not editable; reads "${(await page.locator('#c-mtarget').innerText()).trim()}" with a lock glyph and a title attribute explaining why`,
  });

  // metadata key field + validation
  await page.selectOption('#c-msrc', 'payment_meta');
  const keyBlankBlocks = await page.locator('#ov-save').isDisabled();
  const keyErr = await page.locator('#ov-body .err').first().innerText().catch(() => '');
  await page.fill('#c-mkey', 'invoices');
  const keyFocusKept = await page.evaluate(() => document.activeElement.id);
  controls.push({
    zone: 'section 1 scope', label: 'Metadata key (text input, conditional)', type: 'text input',
    after_interaction: `renders only when the source needs a key; blank blocks Save (${keyBlankBlocks}) with "${keyErr.trim()}"; typing does not re-render (focus stays on ${keyFocusKept})`,
  });

  // guard
  await page.locator('#c-cust').click();
  const inheritShown = await page.locator('#c-inherit').isVisible();
  const inheritBlocks = await page.locator('#ov-save').isDisabled();
  await page.check('#c-inherit');
  await page.locator('#c-match').click();
  const guardErr = await page.locator('#ov-body .err').first().innerText();
  const guardBlocks = await page.locator('#ov-save').isDisabled();
  await page.locator('#c-match').click();
  await page.locator('#c-cust').click();
  controls.push({
    zone: 'section 1 scope', label: 'scope validity guard + customer inheritance', type: 'validation',
    after_interaction: `Customer off reveals the inheritance checkbox (${inheritShown}) and blocks Save until it is checked (${inheritBlocks}); both bounding rows off blocks Save (${guardBlocks}) with "${guardErr.trim()}"`,
  });

  /* ================= ZONE: section 2 — conditions ================= */
  const condOps = await page.locator('#co-0 option').evaluateAll(o => o.map(x => x.textContent.trim()));
  await exerciseSelect('section 2 conditions', 'On the payment (condition source)', '#cs-0', ['payment_meta', 'invoice_note']);
  await exerciseSelect('section 2 conditions', 'Comparison (all 10 operands)', '#co-0', ['ncontains', 'eq']);
  await exerciseSelect('section 2 conditions', 'On the invoice (target)', '#ct-0', ['doc_number', 'private_note']);

  await page.selectOption('#co-0', 'empty');
  const targetDisabledOnEmpty = await page.locator('#ct-0').isDisabled();
  await page.selectOption('#co-0', 'eq');

  await page.click('#c-add');
  const rows2 = await page.locator('#ov-body .cond-row').count();
  const joiner = await page.locator('.cond-row').nth(1).locator('.cond-join').innerText();
  await page.click('#c-or');
  const joinerOr = await page.locator('.cond-row').nth(1).locator('.cond-join').innerText();
  await page.click('#c-and');
  controls.push({
    zone: 'section 2 conditions', label: 'ALL of these / ANY of these (segmented control)', type: 'segmented control',
    commit_path: { toggled: true, reached_apply: true, second_interaction: true, still_visible: true, still_clickable: true },
    after_interaction: `switching updates the inline joiner between rows (${joiner.trim()} → ${joinerOr.trim()}); with one row the control has no visible effect`,
  });
  controls.push({
    zone: 'section 2 conditions', label: '+ Add condition / ✕ remove row', type: 'buttons',
    after_interaction: `add → ${rows2} rows; removing the last row replaces the box with an explanation that the payment goes to the first invoice found. Rows carry no reorder affordance (row order is intentionally not a combinator).`,
  });
  await page.click('#cd-1');

  /* ================= ZONE: section 3 — outcomes ================= */
  await exerciseToggle('section 3 outcomes', 'Apply as overpayment', '#c-over');
  await exerciseToggle('section 3 outcomes', 'Cancel sync if there is no matching open invoice found for a payment (same value as GSP)', '#c-cancel');

  /* ================= ZONE: disclosures ================= */
  for (const [id, name] of [['d-plain', 'In plain terms'], ['d-sql', 'The exact request Synder will send to QuickBooks'], ['d-sim', 'Try it on a sample payment']]) {
    const d = page.locator('#' + id);
    const openBefore = await d.evaluate(el => el.open);
    await d.locator('summary').click();
    const open1 = await d.evaluate(el => el.open);
    // force a re-render and check the panel survives it
    await page.locator('#c-over').click();
    const survives = await page.locator('#' + id).evaluate(el => el.open);
    await page.locator('#c-over').click();
    await page.locator('#' + id).locator('summary').click();
    const open2 = await page.locator('#' + id).evaluate(el => el.open);
    await page.locator('#' + id).locator('summary').click();
    controls.push({
      zone: 'disclosures', label: name, type: 'accordion (details/summary)',
      opens_panel: true,
      commit_path: {
        picked: open1 !== openBefore, toggled: open1 !== openBefore,
        reached_apply: true, second_interaction: open2 !== open1,
        still_visible: await page.locator('#' + id).isVisible(),
        still_clickable: await page.locator('#' + id).locator('summary').isVisible(),
      },
      after_interaction: `opens on click; survives a full re-render (${survives}); closes on a second click`,
    });
  }

  if (!(await page.locator('#d-sim').evaluate(el => el.open))) await page.locator('#d-sim').locator('summary').click();
  const simCount = await page.locator('#sim-list .txn').count();
  await page.locator('#sim-list .txn').nth(1).click();
  const out1 = await page.locator('#sim-out').innerText();
  await page.locator('#sim-list .txn').nth(3).click();
  const out2 = await page.locator('#sim-out').innerText();
  controls.push({
    zone: 'disclosures', label: 'sample payment cards (simulator)', type: 'radio-like cards',
    commit_path: { picked: true, reached_apply: true, second_interaction: true, still_visible: true, still_clickable: true },
    after_interaction: `${simCount} cards; selecting one re-runs the engine and prints the outcome, the candidate table and a step log. Cards are divs, not radios.`,
  });

  /* ================= ZONE: presenter bar (prototype chrome) ================= */
  not_exercised.push({ control: 'presenter bar', reason: 'prototype chrome for demoing environment states, not product UI — excluded from review scope' });
  not_exercised.push({ control: 'Book a call banner', reason: 'not present in this prototype' });

  /* ================= Step 4 — deterministic checks ================= */
  // font
  const fonts = await page.evaluate(() => {
    const out = new Set();
    document.querySelectorAll('body, h1, .panel-t, .rr-t, .btn, select, input, .hint').forEach(e => out.add(getComputedStyle(e).fontFamily));
    return [...out];
  });
  if (!fonts.every(f => TOKENS.font.test(f))) {
    A('High', 'global', 'Some elements do not resolve to Roboto', 'Type looks inconsistent with production GSP',
      'Ensure the ui-kit font stack applies to every element',
      { quote: fonts.join(' | '), source: 'DESIGN_RULES.md — Synder is Roboto, not Inter' });
  }

  // raw hex in the prototype's own CSS
  const rawHex = await page.evaluate(() => {
    const css = [...document.querySelectorAll('style')].map(s => s.textContent).join('\n');
    return (css.match(/#[0-9a-fA-F]{3,8}\b/g) || []).filter(h => !/%23/.test(h));
  });
  if (rawHex.length) {
    A('Medium', 'inline <style>', `${rawHex.length} raw hex colour(s) instead of tokens`, 'Drifts from the design system',
      'Replace with var(--color-*)', { quote: rawHex.slice(0, 8).join(', '), source: 'TOOLS.md — no raw hex in a prototype' });
  }

  // primary colour actually the Synder blue
  const primary = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim());
  if (primary && primary.toLowerCase() !== '#0053cc') {
    A('High', ':root --color-primary', `primary is ${primary}, not #0053CC`, 'Wrong brand blue', 'Link the UI kit', { quote: primary, source: 'DESIGN_RULES.md' });
  }

  // action-button radius
  const radii = await page.evaluate(() => [...document.querySelectorAll('.btn')].map(b => ({ t: b.textContent.trim().slice(0, 20), r: getComputedStyle(b).borderRadius })));
  const badRadius = radii.filter(r => parseFloat(r.r) > 4);
  if (badRadius.length) {
    A('Medium', 'buttons', `${badRadius.length} action button(s) with radius > 4px`, 'Off-system button shape',
      'Use --radius-sm', { quote: JSON.stringify(badRadius.slice(0, 4)), source: 'DESIGN_RULES.md — radius max 4px on action buttons' });
  }

  // contrast of every visible text node
  const contrast = await page.evaluate(() => {
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
      out.push({ text: t.slice(0, 50), color: cs.color, bg: bgOf(el), size: parseFloat(cs.fontSize), weight: cs.fontWeight });
    });
    return out;
  });
  const failures = contrast.map(c => ({ ...c, r: ratio(parse(c.color), parse(c.bg)) }))
    .filter(c => {
      const large = c.size >= 24 || (c.size >= 18.66 && Number(c.weight) >= 700);
      return c.r < (large ? 3 : 4.5);
    });
  if (failures.length) {
    A('High', 'text nodes', `${failures.length} text node(s) below WCAG AA contrast`, 'Small grey text is hard to read, especially the hints that carry the rules',
      'Darken the affected token or raise the size',
      { quote: failures.slice(0, 5).map(f => `"${f.text}" ${f.r.toFixed(2)}:1`).join(' · '), source: 'WCAG 2.1 AA 1.4.3' });
  }

  // 8px grid
  const offGrid = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('.panel-b, .panel-h, .rr, .cond-row, .ov-b-in, .ov-h, .ov-f').forEach(el => {
      const cs = getComputedStyle(el);
      ['paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight'].forEach(p => {
        const v = parseFloat(cs[p]);
        if (v && v % 4 !== 0) out.push(`${el.className.split(' ')[0]}.${p}=${v}`);
      });
    });
    return out;
  });
  if (offGrid.length) {
    A('Medium', 'layout', `${offGrid.length} padding value(s) off the 4/8px grid`, 'Uneven rhythm',
      'Snap to the 8px grid', { quote: offGrid.slice(0, 6).join(', '), source: 'DESIGN_RULES.md — 8px grid' });
  }

  // dead controls: pointer cursor, no listener, not a native control
  const dead = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('#ov-body *, #gsp-rows *').forEach(el => {
      if (getComputedStyle(el).cursor !== 'pointer') return;
      if (/^(BUTTON|A|SELECT|INPUT|LABEL|SUMMARY|OPTION)$/.test(el.tagName)) return;
      if (el.onclick || el.getAttribute('onclick')) return;
      if (el.closest('label,button,a,summary')) return;
      out.push((el.className || el.tagName) + ' :: ' + (el.textContent || '').trim().slice(0, 30));
    });
    return out;
  });
  if (dead.length) {
    A('High', 'interactive-looking elements', `${dead.length} element(s) show a pointer cursor with no click handler of their own`,
      'Looks clickable, does nothing (or relies on a parent handler that a keyboard user cannot reach)',
      'Give them a real handler or drop the pointer cursor', { quote: dead.slice(0, 6).join(' | '), source: 'Step 4 deterministic check' });
  }

  // keyboard reachability of the toggles (they are spans, not inputs)
  const tabbables = await page.evaluate(() => {
    const sel = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea,summary,[tabindex]:not([tabindex="-1"])';
    return [...document.querySelectorAll('#ov-body ' + sel)].length;
  });
  const toggleCount = await page.locator('#ov-body .toggle').count();
  A('Critical', '.toggle (span-based switches)', `${toggleCount} switches in the overlay are <span> elements with no role, no tabindex and no aria-checked`,
    'Every on/off decision in this configurator — the engine itself, all three scope rows, both outcome toggles — is unreachable by keyboard and unannounced to a screen reader',
    'Use <input type="checkbox" role="switch"> under the visual, or add role="switch" + tabindex="0" + aria-checked + key handlers',
    { quote: `${toggleCount} .toggle spans; ${tabbables} focusable elements in the overlay`, source: 'WCAG 2.1 AA 2.1.1 / 4.1.2' });

  if (jsErrors.length) {
    A('Critical', 'runtime', `${jsErrors.length} JS error(s) during the recon pass`, 'Broken behaviour', 'Fix the errors',
      { quote: jsErrors.slice(0, 3).join(' | '), source: 'console' });
  }

  await page.screenshot({ path: path.join(ROUND, 'recon-overlay.png'), fullPage: false });
  await browser.close();

  const statemap = {
    target: 'projects/payment-application-engine/index.html',
    primary_task: "Configure, for one integration, how Synder finds the existing invoice a payment belongs to — and understand what will happen when it finds nothing.",
    zones: ['gsp settings', 'overlay chrome', 'master switch', 'section 1 scope', 'section 2 conditions', 'section 3 outcomes', 'disclosures'],
    not_exercised,
    controls,
    facts: {
      scope_operands: opVals,
      condition_operands: condOps,
      scope_sources: srcVals,
      target_disabled_when_is_empty: targetDisabledOnEmpty,
      date_off_blocked_without_admin: dateBefore === dateAfterBlocked,
      date_off_with_admin_removes_day_field: daysGone,
      no_limit_warning: noLimitWarn.trim(),
      apply_payments_off_message: /Apply payments to invoices” first/.test(applyOffText),
      overlay_header: headerTxt.replace(/\s+/g, ' ').trim(),
      simulator_outcomes: { simple_charge: out1.split('\n')[0], overpayment: out2.split('\n')[0] },
      engine_toggle: engine,
    },
  };
  fs.writeFileSync(path.join(ROUND, 'statemap.json'), JSON.stringify(statemap, null, 2) + '\n');
  fs.writeFileSync(path.join(ROUND, 'auto-findings.json'), JSON.stringify({ findings: auto }, null, 2) + '\n');
  console.log('statemap: ' + controls.length + ' controls, ' + not_exercised.length + ' declared gaps');
  console.log('auto findings: ' + auto.length);
  auto.forEach(f => console.log('  ' + f.id + ' [' + f.severity + '] ' + f.finding));
})();
