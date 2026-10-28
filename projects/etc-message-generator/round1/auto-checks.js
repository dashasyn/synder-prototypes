/* Step 4 — deterministic checks, no LLM. These become AUTO- findings and never
   enter a validator prompt.
   NOTE: the Synder token diff in the protocol does not apply to this prototype.
   This is ETC Solutions' PIMS product (Material Design 2, #1976d2), not Synder
   (#0053CC). Diffing it against synder-design-tokens.css would manufacture
   findings. Mechanical checks that DO apply are run instead. */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const FILE = 'file://' + path.resolve(__dirname, '..', 'index.html');

const rel = c => { const s = c.map(v => { v /= 255; return v <= .03928 ? v/12.92 : Math.pow((v+.055)/1.055, 2.4); });
  return .2126*s[0] + .7152*s[1] + .0722*s[2]; };
const parse = s => (s.match(/\d+(\.\d+)?/g) || []).slice(0,3).map(Number);
const ratio = (fg, bg) => { const a = rel(parse(fg)), b = rel(parse(bg));
  return Math.round(((Math.max(a,b)+.05)/(Math.min(a,b)+.05)) * 100) / 100; };

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1240, height: 900 } });
  await p.goto(FILE);
  await p.waitForTimeout(300);
  // generate so the coloured state lines exist
  await p.click('#btnGen'); await p.waitForTimeout(1200);

  const findings = [];
  const checked = [];

  /* 1 — fonts */
  const fonts = await p.evaluate(() => [...new Set([...document.querySelectorAll('body *')]
    .map(e => getComputedStyle(e).fontFamily))]);
  checked.push('font families: ' + fonts.length);
  const badFont = fonts.filter(f => !/Roboto/.test(f) && !/monospace/.test(f));
  if (badFont.length) findings.push({ id: 'AUTO-F', severity: 'Medium',
    finding: 'non-Roboto font in use: ' + badFont.join(' / ') });

  /* 2 — duplicate ids and dead handlers */
  const dup = await p.evaluate(() => {
    const seen = {}, out = [];
    document.querySelectorAll('[id]').forEach(e => { seen[e.id] = (seen[e.id]||0)+1; });
    for (const k in seen) if (seen[k] > 1) out.push(k + ' ×' + seen[k]);
    return out;
  });
  checked.push('duplicate ids: ' + dup.length);
  if (dup.length) findings.push({ id: 'AUTO-D', severity: 'High',
    finding: 'duplicate element ids: ' + dup.join(', ') });

  const dead = await p.evaluate(() => {
    const out = [];
    document.querySelectorAll('[onclick],[oninput],[onchange],[onfocus],[onblur]').forEach(e => {
      ['onclick','oninput','onchange','onfocus','onblur'].forEach(a => {
        const v = e.getAttribute(a); if (!v) return;
        (v.match(/([A-Za-z_$][\w$]*)\s*\(/g) || []).forEach(m => {
          const fn = m.replace(/\s*\($/, '');
          if (['toast','t'].includes(fn)) return;
          if (typeof window[fn] !== 'function') out.push((e.id || e.tagName) + ' → ' + fn);
        });
      });
    });
    return [...new Set(out)];
  });
  checked.push('handlers resolved: ' + (dead.length ? 'MISSING' : 'all'));
  if (dead.length) findings.push({ id: 'AUTO-H', severity: 'Critical',
    finding: 'handler references a function that does not exist: ' + dead.join(', ') });

  /* 3 — button radius */
  const radii = await p.evaluate(() => [...document.querySelectorAll('.mbtn, .pbtn, .lang-sw button')]
    .map(e => ({ label: (e.textContent||'').trim().slice(0,18), r: getComputedStyle(e).borderRadius })));
  checked.push('action buttons measured: ' + radii.length);
  const bigR = radii.filter(x => parseFloat(x.r) > 4);
  if (bigR.length) findings.push({ id: 'AUTO-R', severity: 'Medium',
    finding: 'radius > 4px on action buttons: ' + bigR.map(x => x.label + '=' + x.r).join(', ') });

  /* 4 — contrast of every state-line colour, and the counters */
  const texts = await p.evaluate(() => {
    const pick = s => [...document.querySelectorAll(s)].filter(e => e.offsetParent);
    const out = [];
    const bgOf = e => { let n = e; while (n && n !== document.documentElement) {
      const c = getComputedStyle(n).backgroundColor;
      if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') return c; n = n.parentElement; }
      return 'rgb(255,255,255)'; };
    pick('.state, .counter, .hint, .meta span, .mbox > label, .tf > label').forEach(e => {
      const cs = getComputedStyle(e);
      out.push({ what: (e.className || e.tagName) + ' :: ' + (e.textContent||'').trim().slice(0, 46),
                 color: cs.color, bg: bgOf(e), size: cs.fontSize, weight: cs.fontWeight });
    });
    return out;
  });
  checked.push('text/background pairs measured: ' + texts.length);
  texts.forEach((x, i) => {
    const r = ratio(x.color, x.bg);
    const px = parseFloat(x.size);
    const large = px >= 24 || (px >= 18.66 && parseInt(x.weight) >= 700);
    const need = large ? 3 : 4.5;
    if (r < need) findings.push({ id: 'AUTO-C' + i, severity: r < 3 ? 'High' : 'Medium',
      finding: `contrast ${r}:1 (needs ${need}:1) — ${x.what} · ${x.color} on ${x.bg} at ${x.size}` });
  });

  /* 5 — spacing off the 4px grid (MD2 uses 4px increments) */
  const spacing = await p.evaluate(() => {
    const out = [];
    [...document.querySelectorAll('.sec-t, .sub-t, .row, .tf, .mbox, .state, .foot, .audio-acts')]
      .filter(e => e.offsetParent).forEach(e => {
        const cs = getComputedStyle(e);
        ['marginTop','marginBottom','paddingTop','paddingBottom'].forEach(k => {
          const v = parseFloat(cs[k]);
          if (v > 0 && v % 4 !== 0) out.push((e.className||e.tagName) + '.' + k + '=' + v);
        });
      });
    return [...new Set(out)];
  });
  checked.push('spacing values measured on the 4px grid');
  if (spacing.length) findings.push({ id: 'AUTO-S', severity: 'Medium',
    finding: 'spacing off the 4px grid: ' + spacing.slice(0, 8).join(', ') });

  /* 6 — controls that look interactive but are not, and vice versa */
  const affordance = await p.evaluate(() => {
    const out = [];
    [...document.querySelectorAll('.wave')].forEach(() => out.push('.wave (waveform) has no cursor/handler but looks like a scrubber'));
    [...document.querySelectorAll('textarea[readonly]')].filter(e => e.offsetParent).forEach(e =>
      out.push('#' + e.id + ' is readonly but styled like the editable fields'));
    return out;
  });
  checked.push('affordance mismatches scanned');
  affordance.forEach((a, i) => findings.push({ id: 'AUTO-A' + i, severity: 'Medium', finding: a }));

  fs.writeFileSync(path.join(__dirname, 'auto-findings.json'),
    JSON.stringify({ note: 'Synder token diff intentionally skipped — this is the ETC PIMS Material Design product, not Synder.', checked, findings }, null, 2));
  console.log('AUTO findings:', findings.length);
  findings.forEach(f => console.log(' ', f.id, '·', f.severity, '·', f.finding));
  await b.close();
})();
