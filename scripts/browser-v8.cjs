const { chromium } = require('/home/ubuntu/.openclaw/workspace/node_modules/playwright');
const FILE = 'file:///home/ubuntu/.openclaw/workspace/filtering-options/index.html';
let pass=0, fail=0;
const ok=(n,c,x)=>{if(c){pass++;console.log('  ok   '+n)}else{fail++;console.log('  FAIL '+n+(x!==undefined?'  -> '+x:''))}};
const eq=(n,a,e)=>ok(n+' (= '+JSON.stringify(e)+')', a===e, 'got '+JSON.stringify(a));

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  const errs=[]; p.on('pageerror', e=>errs.push(e.message));
  await p.goto(FILE);
  const rows = () => p.locator('#groupsTable tbody tr').count();

  await p.click('.nav-tab[data-variant="groups"]');
  ok('section visible', await p.locator('#variant-groups').isVisible());
  ok('scope bar visible', await p.locator('#groupsFilterBar').isVisible());
  ok('tab row visible', await p.locator('#groupsTabs').isVisible());
  ok('sub row visible on All', await p.locator('#groupsSub').isVisible());
  ok('table visible', await p.locator('#groupsTable table').isVisible());

  console.log('\n-- layout order: scope above the tabs, status below');
  const boxes = {};
  for (const id of ['groupsFilterBar','groupsTabs','groupsSub','groupsTable']) {
    boxes[id] = await p.locator('#'+id).boundingBox();
  }
  ok('scope bar above the tab row', boxes.groupsFilterBar.y < boxes.groupsTabs.y);
  ok('status row below the tab row', boxes.groupsSub.y > boxes.groupsTabs.y);
  ok('status row directly above the table', boxes.groupsSub.y < boxes.groupsTable.y);

  console.log('\n-- All tab uses a scoped dropdown, and it survives toggling');
  ok('dropdown trigger visible', await p.locator('#groupsSub [data-sub-trigger]').isVisible());
  await p.click('#groupsSub [data-sub-trigger]');
  ok('panel visible', await p.locator('#groupsSub [data-sub-panel]').isVisible());
  eq('8 scoped checkboxes', await p.locator('#groupsSub [data-sub-check]').count(), 8);
  const before = await rows();
  await p.click('#groupsSub [data-sub-check="Failed"]');
  // LIVENESS, not state: can the user still reach the next checkbox?
  ok('panel STILL VISIBLE after first toggle', await p.locator('#groupsSub [data-sub-panel]').isVisible());
  ok('second checkbox still clickable', await p.locator('#groupsSub [data-sub-check="Skipped"]').isVisible());
  await p.click('#groupsSub [data-sub-check="Skipped"]');
  ok('panel STILL VISIBLE after second toggle', await p.locator('#groupsSub [data-sub-panel]').isVisible());
  eq('table untouched before Apply', await rows(), before);
  ok('Apply visible in panel', await p.locator('#groupsSub [data-sub-apply]').isVisible());
  await p.click('#groupsSub [data-sub-apply]');
  ok('panel closed after Apply', !(await p.locator('#groupsSub [data-sub-panel]').isVisible()));
  eq('table re-queried on Apply', await rows(), 5);
  ok('breadcrumb visible', await p.locator('#groupsSub [data-breadcrumb]').isVisible());

  console.log('\n-- breadcrumb x is reachable and works');
  ok('crumb remove visible', await p.locator('#groupsSub [data-clear-crumb]').isVisible());
  await p.click('#groupsSub [data-clear-crumb]');
  ok('breadcrumb gone', !(await p.locator('#groupsSub [data-breadcrumb]').count()));
  eq('back to whole scope', await rows(), 26);

  console.log('\n-- pills row: every pill stays clickable after a pick');
  await p.click('#groupsTabs [data-group="attention"]');
  eq('5 pills', await p.locator('#groupsSub .sub-pill').count(), 5);
  ok('pills row visible', await p.locator('#groupsSub .sub-pills').isVisible());
  await p.click('#groupsSub [data-sub-status="Failed"]');
  ok('pills row STILL VISIBLE after picking', await p.locator('#groupsSub .sub-pills').isVisible());
  ok('no breadcrumb beside pills (no duplicate of the lit pill)',
     await p.locator('#groupsSub [data-breadcrumb]').count() === 0);
  for (const s of ['Rule failed','Rollback failed','Synced with warnings']) {
    ok('"'+s+'" still clickable after a pick', await p.locator('#groupsSub [data-sub-status="'+s+'"]').isVisible());
  }
  ok('All pill still clickable', await p.locator('#groupsSub [data-sub-all]').isVisible());
  eq('rows = Failed only', await rows(), 3);
  ok('tab shows dashed partial', await p.locator('#groupsTabs [data-group="attention"].partial').count() === 1);

  console.log('\n-- nested layers: scope dropdown opens BELOW the tab row and survives toggles');
  await p.click('#groupsFilterBar [data-groups-add]');
  ok('add-filter menu visible', await p.locator('#groupsFilterBar [data-groups-add-menu]').isVisible());
  await p.click('#groupsFilterBar [data-groups-add-key="platform"]');
  const pf = '#groupsFilterBar [data-field-key="platform"]';
  ok('platform chip visible', await p.locator(pf).isVisible());
  ok('its panel auto-opened', await p.locator(pf+' [data-field-panel]').isVisible());
  const beforeScope = await rows();
  await p.click(pf+' [data-check-value="Stripe"]');
  ok('panel STILL VISIBLE after toggle', await p.locator(pf+' [data-field-panel]').isVisible());
  ok('sibling checkbox still clickable', await p.locator(pf+' [data-check-value="Shopify"]').isVisible());
  eq('table untouched before panel Apply', await rows(), beforeScope);
  await p.click(pf+' [data-panel-apply]');
  ok('panel closed', !(await p.locator(pf+' [data-field-panel]').isVisible()));
  eq('rows = Failed + Stripe', await rows(), 1);

  console.log('\n-- scope survives a tab switch, and each tab keeps its own status');
  await p.click('#groupsTabs [data-group="ready"]');
  ok('platform chip STILL on the bar', await p.locator(pf).isVisible());
  ok('chip still reads Stripe', /Stripe/.test(await p.locator(pf+' .chip-label-text').textContent()));
  await p.click('#groupsSub [data-sub-status="Pending"]');
  await p.click('#groupsTabs [data-group="attention"]');
  ok('attention remembered Failed',
     await p.locator('#groupsSub [data-sub-status="Failed"].active').count() === 1);
  await p.click('#groupsTabs [data-group="ready"]');
  ok('ready remembered Pending',
     await p.locator('#groupsSub [data-sub-status="Pending"].active').count() === 1);

  console.log('\n-- outside click and Escape close panels, not the page');
  await p.click('#groupsSub [data-sub-status="Ready to sync"]');
  await p.click('#groupsFilterBar [data-field-key="platform"] [data-field-trigger]');
  ok('panel open', await p.locator(pf+' [data-field-panel]').isVisible());
  await p.click('#variant-groups .mock-title');
  ok('outside click closed it', !(await p.locator(pf+' [data-field-panel]').isVisible()));
  await p.click('#groupsFilterBar [data-field-key="platform"] [data-field-trigger]');
  await p.keyboard.press('Escape');
  ok('Escape closed it', !(await p.locator(pf+' [data-field-panel]').isVisible()));
  ok('pills row still live after all that', await p.locator('#groupsSub .sub-pills').isVisible());

  console.log('\n-- dashboard deep-link');
  await p.click('#groupsDeepLinkBtn');
  ok('deep-link menu visible', await p.locator('#groupsDeepLinkMenu').isVisible());
  await p.click('[data-deeplink="Rule failed"]');
  ok('landed on attention (partial)',
     await p.locator('#groupsTabs [data-group="attention"].partial').count() === 1);
  ok('Rule failed pill active',
     await p.locator('#groupsSub [data-sub-status="Rule failed"].active').count() === 1);
  const crumb = await p.locator('#groupsSub [data-breadcrumb]').textContent();
  ok('breadcrumb says From dashboard', /From dashboard/.test(crumb), crumb);
  ok('scope reset to the date baseline only',
     await p.locator('#groupsFilterBar [data-field-key]').count() === 1);
  eq('rows = Rule failed', await rows(), 1);

  await p.click('#groupsDeepLinkBtn');
  await p.click('[data-deeplink="Skipped"]');
  ok('single-status group renders no pills', await p.locator('#groupsSub .sub-pill').count() === 0);
  ok('and no dropdown', await p.locator('#groupsSub [data-sub-dropdown]').count() === 0);
  ok('but the breadcrumb still explains it',
     await p.locator('#groupsSub [data-breadcrumb]').isVisible());
  await p.click('#groupsTabs [data-group="synced"]');
  ok('clean single-status tab hides the whole sub row',
     !(await p.locator('#groupsSub').isVisible()));

  console.log('\n-- keyboard reachability');
  await p.click('#groupsTabs [data-group="attention"]');
  const tabbable = await p.evaluate(() => {
    const els = ['#groupsTabs [data-group="attention"]', '#groupsSub [data-sub-all]',
                 '#groupsSub [data-sub-status="Failed"]', '#groupsFilterBar [data-groups-add]'];
    return els.map(s => { const e = document.querySelector(s); if (!e) return s + ':MISSING';
      e.focus(); return document.activeElement === e ? 'ok' : s + ':NOT_FOCUSABLE'; });
  });
  tabbable.forEach((r, i) => ok('focusable #' + (i+1), r === 'ok', r));

  console.log('\n-- other variants still work');
  for (const v of ['current','popular','chips','button','quick','rec','sheetbtn']) {
    await p.click('.nav-tab[data-variant="'+v+'"]');
    ok(v + ' section visible', await p.locator('#variant-'+v).isVisible());
  }
  await p.click('.nav-tab[data-variant="rec"]');
  ok('V6 segments visible', await p.locator('#recSegments .status-segment').first().isVisible());

  console.log('\n-- screenshots');
  await p.click('.nav-tab[data-variant="groups"]');
  await p.click('#groupsTabs [data-group="all"]');
  await p.locator('#variant-groups .mock-page').screenshot({ path: '/tmp/v8-all.png' });
  await p.click('#groupsTabs [data-group="attention"]');
  await p.click('#groupsSub [data-sub-status="Rule failed"]');
  await p.locator('#variant-groups .mock-page').screenshot({ path: '/tmp/v8-narrowed.png' });
  await p.click('#groupsDeepLinkBtn');
  await p.click('[data-deeplink="Pending"]');
  await p.locator('#variant-groups .mock-page').screenshot({ path: '/tmp/v8-deeplink.png' });
  console.log('  wrote /tmp/v8-all.png, /tmp/v8-narrowed.png, /tmp/v8-deeplink.png');

  ok('no uncaught JS errors', errs.length === 0, errs.join(' | '));
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  await b.close();
  process.exit(fail ? 1 : 0);
})();
