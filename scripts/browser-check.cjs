// Real-browser checks: nested layers, outside-click, and no table churn while staging.
const { chromium } = require('/home/ubuntu/.openclaw/workspace/node_modules/playwright');
const FILE = 'file:///home/ubuntu/.openclaw/workspace/filtering-options/index.html';

let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  ok   ' + n); } else { fail++; console.log('  FAIL ' + n + (x !== undefined ? '  → ' + x : '')); } };

(async () => {
    const b = await chromium.launch();
    const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
    await p.goto(FILE);
    const rows = t => p.locator('#' + t + ' tbody tr').count();
    const open = s => p.locator(s).evaluate(e => e.classList.contains('active'));

    console.log('\n— V4 popover: nested dropdowns —');
    await p.click('.nav-tab[data-variant="button"]');
    await p.click('#filtersBtn');
    ok('popover open', await open('#filterPopover'));
    await p.click('#popoverBody [data-field-key="status"] [data-field-trigger]');
    ok('popover stays open when a field dropdown opens', await open('#filterPopover'));
    ok('field panel is open', await open('#popoverBody [data-field-key="status"] [data-field-panel]'));
    await p.click('#popoverBody [data-field-key="status"] label:has([data-check-value="Failed"])');
    ok('popover survives a checkbox toggle', await open('#filterPopover'));
    ok('multiselect panel stays open across toggles', await open('#popoverBody [data-field-key="status"] [data-field-panel]'));
    await p.click('#popoverBody [data-field-key="status"] label:has([data-check-value="Pending"])');
    ok('popover survives a second toggle', await open('#filterPopover'));
    ok('table untouched while staging in the popover', (await rows('buttonTable')) === 26, await rows('buttonTable'));
    // The open Status panel physically overlays the fields below it, so close it
    // the way a user would (click the trigger again) before reaching for Amount.
    await p.click('#popoverBody [data-field-key="status"] [data-field-trigger]');
    ok('re-clicking a trigger closes just that panel', !(await open('#popoverBody [data-field-key="status"] [data-field-panel]')));
    ok('popover still open after closing a field panel', await open('#filterPopover'));
    await p.click('#popoverBody [data-field-key="amount"] [data-field-trigger]');
    ok('switching fields keeps the popover open', await open('#filterPopover'));
    await p.click('#popoverBody [data-field-key="amount"] [data-pick-value="gt500"]');
    ok('single-select pick closes only its own panel', await open('#filterPopover'));
    ok('picked panel closed', !(await open('#popoverBody [data-field-key="amount"] [data-field-panel]')));
    await p.click('#buttonFilterBar [data-popover-apply]');
    ok('Apply closes the popover', !(await open('#filterPopover')));
    // Failed (3) + Pending (2), of which 2 are over $500
  ok('Apply commits (Failed/Pending over $500 = 2)', (await rows('buttonTable')) === 2, await rows('buttonTable'));

    console.log('\n— Outside click / Escape still work —');
    await p.click('#filtersBtn');
    await p.click('#popoverBody [data-field-key="status"] [data-field-trigger]');
    await p.click('h1');
    ok('clicking the page closes popover + panel', !(await open('#filterPopover')));
    await p.click('#filtersBtn');
    await p.keyboard.press('Escape');
    ok('Escape closes the popover', !(await open('#filterPopover')));

    console.log('\n— V3 chips: add-filter auto-open survives —');
    await p.click('.nav-tab[data-variant="chips"]');
    await p.click('#chipsFilterBar [data-add-filter]');
    await p.click('#chipsFilterBar [data-add-key="customer"]');
    ok('new chip panel auto-opens and stays open',
        await open('#chipsFilterBar [data-field-key="customer"] [data-field-panel]'));
    ok('table untouched by adding a chip', (await rows('chipsTable')) === 26, await rows('chipsTable'));

    console.log('\n— Apply buttons are visible in every bar —');
    for (const [tab, sel] of [['current', '#currentFilterBar [data-apply]'],
                              ['popular', '#popularFilterBar [data-popular-apply]'],
                              ['chips',   '#chipsFilterBar [data-chips-apply]']]) {
        await p.click('.nav-tab[data-variant="' + tab + '"]');
        ok(tab + ' Apply visible', await p.locator(sel).isVisible());
    }

    console.log('\n— Screenshots —');
    for (const t of ['current', 'popular', 'chips', 'button']) {
        await p.click('.nav-tab[data-variant="' + t + '"]');
        await p.keyboard.press('Escape');
        const bar = { current: 'currentFilterBar', popular: 'popularFilterBar', chips: 'chipsFilterBar', button: 'buttonFilterBar' }[t];
        if (t === 'button') {
            await p.click('#filtersBtn');
            await p.click('#popoverBody [data-field-key="status"] [data-field-trigger]');
            await p.click('#popoverBody [data-field-key="status"] label:has([data-check-value="Failed"])');
            await p.keyboard.press('Escape');
        } else {
            await p.click('#' + bar + ' [data-field-key="status"] [data-field-trigger]');
            await p.click('#' + bar + ' [data-field-key="status"] label:has([data-check-value="Failed"])');
            await p.keyboard.press('Escape');
        }
        await p.waitForTimeout(150);
        await p.screenshot({ path: '/tmp/filters-' + t + '.png', clip: { x: 0, y: 0, width: 1440, height: 560 } });
        console.log('  saved /tmp/filters-' + t + '.png');
    }

    await b.close();
    console.log('\n' + pass + ' passed, ' + fail + ' failed');
    process.exit(fail ? 1 : 0);
})();
