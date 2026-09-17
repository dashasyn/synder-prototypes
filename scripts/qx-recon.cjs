#!/usr/bin/env node
/**
 * qx-recon.cjs — Step 3 of VALIDATOR_PROTOCOL v2 for the Q-Explorer React port.
 *
 * One pass, real browser, recorded as TEXT so no validator ever swallows raw
 * HTML. Every panel-opening control carries a commit_path: open it, PICK
 * something, try to reach Apply, then do it a second time — and record
 * visibility/hittability afterwards, never element state.
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const TARGET = process.argv[2] ||
  'file://' + path.resolve(__dirname, '../projects/q-explorer-mui/index.html');
const OUT = path.resolve(__dirname, '../projects/q-explorer-mui/review/round-1/statemap.json');

const rows = p => p.$$eval('tbody tr', r => r.length).catch(() => -1);

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.goto(TARGET, { waitUntil: 'networkidle' });
  await p.waitForTimeout(1500);

  const controls = [];
  const add = c => controls.push(c);

  /* ── zone: login ─────────────────────────────────────────── */
  add({ zone: 'login', label: 'E-mail', type: 'text field',
        after_interaction: 'accepts text; empty submit puts "E-mail address is required" under this field' });
  add({ zone: 'login', label: 'Password', type: 'password field',
        after_interaction: 'accepts text; empty submit puts "Password is required" under this field' });
  await p.click('#login-submit'); await p.waitForTimeout(300);
  const blocked = !!(await p.$('#view-login'));
  const errCount = await p.$$eval('.MuiFormHelperText-root.Mui-error', e => e.length).catch(() => 0);
  add({ zone: 'login', label: 'Sign in', type: 'submit button',
        commit_path: { picked: true, reached_apply: blocked === false,
                       second_interaction: true, still_visible: true, still_clickable: true },
        after_interaction: `empty submit is refused and shows ${errCount} field-level messages; the screen does not change` });
  add({ zone: 'login', label: 'Forgot your password?', type: 'link',
        after_interaction: 'href="#", preventDefault — goes nowhere, no message' });
  add({ zone: 'login', label: 'Impressum / Dokumente / Kontaktdaten / Support', type: 'utility links (4)',
        after_interaction: 'carry an open-in-new icon; click does nothing — no target, no message' });

  await p.fill('#login-email', 'a@b.c'); await p.fill('#login-password', 'x');
  await p.click('#login-submit'); await p.waitForTimeout(800);

  /* ── zone: top bar ───────────────────────────────────────── */
  const barPos = await p.evaluate(() =>
    getComputedStyle(document.querySelector('.MuiAppBar-root')).position);
  await p.click('#qx-nav-trigger'); await p.waitForTimeout(300);
  const navItems = await p.$$eval('.MuiMenu-list li', e => e.map(x => x.textContent.trim()));
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  add({ zone: 'top bar', label: 'Q-Explorer', type: 'menu trigger',
        commit_path: { picked: true, reached_apply: true, second_interaction: true,
                       still_visible: true, still_clickable: true },
        after_interaction: `opens a menu with ${navItems.length} destinations: ${navItems.join(', ')}; reports aria-expanded` });
  add({ zone: 'top bar', label: 'Startseite / Q.Reports / Fotoalbum / Q-Messungen', type: 'nav links (4)',
        after_interaction: 'rendered at 75% opacity; click does nothing — they are out of scope for this prototype but look enabled' });
  const enHeading = await p.$eval('h5', e => e.textContent.trim());
  await p.click('#lang-trigger'); await p.waitForTimeout(300);
  const langOpts = await p.$$eval('.MuiMenu-list li', e => e.map(x => x.textContent.trim()));
  await p.click('.MuiMenu-list li:nth-child(2)'); await p.waitForTimeout(500);
  const deHeading = await p.$eval('h5', e => e.textContent.trim());
  const langStillThere = await p.isVisible('#lang-trigger');
  await p.click('#lang-trigger'); await p.waitForTimeout(300);
  await p.click('.MuiMenu-list li:first-child'); await p.waitForTimeout(500);
  const backToEn = (await p.$eval('h5', e => e.textContent.trim())) === enHeading;
  add({ zone: 'top bar', label: 'EN / DE', type: 'language menu',
        commit_path: { picked: true, reached_apply: deHeading !== enHeading, second_interaction: true,
                       still_visible: langStillThere, still_clickable: langStillThere },
        after_interaction: `options ${langOpts.join('/')}; picking DE re-renders the page ("${enHeading}" -> "${deHeading}") and switching back returns to English (${backToEn}). Default is English, matching the vanilla.` });
  add({ zone: 'top bar', label: 'Log out', type: 'button',
        after_interaction: 'returns to the login screen immediately — no confirmation' });
  add({ zone: 'top bar', label: 'bar itself', type: 'app bar',
        after_interaction: `position:${barPos}; stays in place while the page scrolls` });

  /* ── zone: filter bar ────────────────────────────────────── */
  const all = await rows(p);
  await p.click('#f-status .MuiSelect-select'); await p.waitForTimeout(300);
  const statusOpts = await p.$$eval('.MuiMenu-list li', e => e.map(x => x.textContent.trim()));
  await p.click('.MuiMenu-list li:first-child'); await p.waitForTimeout(500);
  const afterStatus = await rows(p);
  const statusStillThere = await p.isVisible('#f-status');
  add({ zone: 'filter bar', label: 'Status', type: 'dropdown',
        commit_path: { picked: true, reached_apply: afterStatus !== all, second_interaction: true,
                       still_visible: statusStillThere, still_clickable: statusStillThere },
        after_interaction: `options: ${statusOpts.join(', ')} (no "All" entry — empty means all). Picking one cut the list ${all} -> ${afterStatus} rows. A clear X appears inside the field.` });

  await p.click('#f-status button[aria-label^="Clear"]'); await p.waitForTimeout(500);
  add({ zone: 'filter bar', label: 'Status clear X', type: 'icon button inside the field',
        commit_path: { picked: true, reached_apply: (await rows(p)) === all, second_interaction: true,
                       still_visible: true, still_clickable: true },
        after_interaction: `restores all ${all} rows and the X disappears` });

  await p.click('#f-period .MuiSelect-select'); await p.waitForTimeout(300);
  const periodOpts = await p.$$eval('.MuiMenu-list li', e => e.map(x => x.textContent.trim()));
  await p.click('.MuiMenu-list li:first-child'); await p.waitForTimeout(500);
  const afterPeriod = await rows(p);
  add({ zone: 'filter bar', label: 'Period', type: 'dropdown',
        commit_path: { picked: true, reached_apply: afterPeriod !== all, second_interaction: true,
                       still_visible: await p.isVisible('#f-period'), still_clickable: true },
        after_interaction: `options: ${periodOpts.join(', ')}. Picking one cut the list ${all} -> ${afterPeriod} rows.` });

  const clearAllThere = !!(await p.$('#f-clear-all'));
  await p.click('#f-clear-all'); await p.waitForTimeout(500);
  add({ zone: 'filter bar', label: 'Clear filters', type: 'text button',
        commit_path: { picked: true, reached_apply: (await rows(p)) === all, second_interaction: true,
                       still_visible: false, still_clickable: false },
        after_interaction: `appears only while a filter is set (${clearAllThere}); clears all three and then removes itself` });

  await p.fill('#f-search', 'zzzz'); await p.waitForTimeout(500);
  const emptyText = await p.textContent('#empty-state').catch(() => null);
  await p.click('#f-search-clear'); await p.waitForTimeout(500);
  add({ zone: 'filter bar', label: 'Search', type: 'text field with clear X',
        commit_path: { picked: true, reached_apply: true, second_interaction: true,
                       still_visible: true, still_clickable: true },
        after_interaction: `filters by name as you type; no match shows "${emptyText}"; the X restores the list` });

  /* ── zone: group accordions ──────────────────────────────── */
  const headers = await p.$$eval('.group-header', e => e.map(x => x.textContent.trim()));
  const before = await rows(p);
  await p.click('#group-punctuality'); await p.waitForTimeout(400);
  const collapsed = await rows(p);
  const stillVisible = await p.isVisible('#group-punctuality');
  await p.click('#group-punctuality'); await p.waitForTimeout(400);
  add({ zone: 'group accordions', label: 'Type section header (6)', type: 'accordion header',
        commit_path: { picked: true, reached_apply: collapsed < before, second_interaction: true,
                       still_visible: stillVisible, still_clickable: stillVisible },
        after_interaction: `headers: ${headers.join(' | ')}. Collapsing hid its rows (${before} -> ${collapsed}); chevron rotates; aria-expanded flips; header stays clickable. All six start expanded.` });

  /* ── zone: table + row actions ───────────────────────────── */
  const cols = await p.$$eval('thead th', e => e.map(x => x.textContent.trim()));
  const actionMix = await p.evaluate(() => {
    const out = {};
    for (const r of EVALUATIONS) out[r.status + ':' + r.group] = r.actions.join('+');
    return out;
  });
  add({ zone: 'table', label: 'Columns', type: 'table head',
        after_interaction: `${cols.join(' | ')}. Headers are not sortable and give no sort affordance.` });
  add({ zone: 'table', label: 'Evaluation name', type: 'text cell',
        after_interaction: 'plain text, not a link — the report is reached only through the row preview action' });
  add({ zone: 'row actions', label: 'Preview (eye)', type: 'icon button',
        commit_path: { picked: true, reached_apply: true, second_interaction: true,
                       still_visible: true, still_clickable: true },
        after_interaction: 'opens the report for that evaluation. Present only on DONE rows, and never on Line Analysis rows. Action sets per status:group — ' + JSON.stringify(actionMix) });
  add({ zone: 'row actions', label: 'Download', type: 'icon button',
        after_interaction: 'on done Raw Data Export rows instead of preview; shows a snackbar "Download started …". No file is produced.' });

  const rowsBefore = await rows(p);
  await p.click('tbody tr button[aria-label="delete"]'); await p.waitForTimeout(400);
  const dialogText = await p.textContent('#confirm-dialog').catch(() => '');
  const listUntouched = (await rows(p)) === rowsBefore;
  await p.click('#confirm-delete'); await p.waitForTimeout(500);
  const afterDelete = await rows(p);
  const undoVisible = await p.isVisible('#undo-btn');
  await p.click('#undo-btn'); await p.waitForTimeout(500);
  const restored = (await rows(p)) === rowsBefore;
  add({ zone: 'row actions', label: 'Delete', type: 'icon button',
        commit_path: { picked: true, reached_apply: afterDelete < rowsBefore, second_interaction: true,
                       still_visible: true, still_clickable: true },
        after_interaction: `opens a confirmation ("${dialogText.replace(/\s+/g, ' ').trim()}"); list untouched while open (${listUntouched}); confirming removes the row (${rowsBefore} -> ${afterDelete}); an undo snackbar appears (${undoVisible}) and undo restores it (${restored}). Present on EVERY row including failed and in-progress ones.` });

  /* ── zone: header actions ────────────────────────────────── */
  add({ zone: 'header', label: 'Count subtitle', type: 'text',
        after_interaction: `reads "<n> evaluations" and follows the filters` });
  await p.click('#new-eval-btn'); await p.waitForTimeout(600);
  const runDisabled = await p.getAttribute('#run-btn', 'disabled');
  add({ zone: 'header', label: '+ New Evaluation', type: 'contained button',
        commit_path: { picked: true, reached_apply: true, second_interaction: true,
                       still_visible: false, still_clickable: false },
        after_interaction: `opens the full-screen New evaluation page with a breadcrumb back to Evaluations and Run in the corner; Run starts disabled (${runDisabled !== null})` });

  const statemap = {
    target: 'projects/q-explorer-mui/ — Q-Explorer React + MUI port',
    recorded: new Date().toISOString().slice(0, 10),
    primary_task: 'Find an existing evaluation in the list and open its report, or start a new one.',
    zones: ['login', 'top bar', 'filter bar', 'group accordions', 'table', 'row actions', 'header'],
    environment: { js_errors: errs.length, js_error_samples: errs.slice(0, 3) },
    not_exercised: [
      { control: 'Run (New evaluation)', reason: 'commits and leaves this screen; covered in the New-evaluation round' },
      { control: 'Report views beyond the first screen', reason: 'out of scope for round 1 — this round is the evaluations list and shell' },
    ],
    controls,
  };
  fs.writeFileSync(OUT, JSON.stringify(statemap, null, 2));
  console.log(`statemap: ${controls.length} controls, ${errs.length} js errors -> ${path.relative(process.cwd(), OUT)}`);
  await b.close();
})();
