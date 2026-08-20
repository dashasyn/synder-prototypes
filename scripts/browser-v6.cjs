// Reworked variant 6 in a real browser. Asserts visibility/clickability, not
// element state — and covers the two panel-staging bugs fixed 2026-08-20.
const { chromium } = require('/home/ubuntu/.openclaw/workspace/node_modules/playwright');
const FILE='file:///home/ubuntu/.openclaw/workspace/filtering-options/index.html';
let pass=0,fail=0;
const ok=(n,c,x)=>{if(c){pass++;console.log('  ok   '+n)}else{fail++;console.log('  FAIL '+n+(x!==undefined?'  -> '+x:''))}};
const eq=(n,a,e)=>ok(n+' (= '+JSON.stringify(e)+')',a===e,'got '+JSON.stringify(a));
(async()=>{
  const b=await chromium.launch();
  const p=await b.newPage({viewport:{width:1440,height:1000}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto(FILE);
  const rows=()=>p.locator('#recTable tbody tr').count();
  const f=k=>'#recFilterBar [data-field-key="'+k+'"]';
  const seg=k=>'#recSegments [data-segment="'+k+'"]';

  await p.click('.nav-tab[data-variant="rec"]');
  console.log('-- the three requested changes');
  ok('no baseline chip', await p.locator('#recFilterBar .baseline-chip').count()===0);
  ok('date is a normal filter chip', await p.locator(f('date')+' .filter-chip').isVisible());
  // Same component, so the only class difference should be `active` (date has
  // a value on load, status doesn't). Compare structure and rendered geometry.
  ok('date and status use the same chip component',
     (await p.locator(f('date')+' span.filter-chip > button.chip-trigger').count()) === 1 &&
     (await p.locator(f('status')+' span.filter-chip > button.chip-trigger').count()) === 1);
  const geo = sel => p.locator(sel+' .chip-trigger').evaluate(e => {
    const c = getComputedStyle(e), r = e.getBoundingClientRect();
    return [Math.round(r.height), c.fontSize, c.fontFamily, c.paddingLeft].join('|');
  });
  ok('and render identically', (await geo(f('date'))) === (await geo(f('status'))),
     (await geo(f('date'))) + '  vs  ' + (await geo(f('status'))));
  ok('date chip class differs only by `active`',
     (await p.locator(f('date')+' .filter-chip').evaluate(e=>e.className)).replace(' active','') ===
     (await p.locator(f('status')+' .filter-chip').evaluate(e=>e.className)).replace(' active',''));
  ok('status chip visible with all 8 statuses', await p.locator(f('status')).isVisible());
  await p.click(f('status')+' [data-field-trigger]');
  eq('8 checkboxes', await p.locator(f('status')+' [data-check-value]').count(), 8);
  await p.keyboard.press('Escape');
  ok('no count line', await p.locator('#recCount').count()===0);
  ok('no "Showing N of" text',
     !/Showing\s*\d+\s*of/.test(await p.locator('#variant-rec .mock-page').innerText()));

  console.log('-- layout: filters above segments, segments against the table');
  const bar=await p.locator('#recFilterBar').boundingBox();
  const sg =await p.locator('#recSegments').boundingBox();
  const tb =await p.locator('#recTable').boundingBox();
  ok('bar above segments', bar.y < sg.y);
  ok('segments above table', sg.y < tb.y);

  console.log('-- BUG FIX 1: a single-select pick stages and keeps its panel open');
  await p.click(f('date')+' [data-field-trigger]');
  ok('date panel visible', await p.locator(f('date')+' [data-field-panel]').isVisible());
  const before = await rows();
  await p.click(f('date')+' [data-pick-value="30d"]');
  ok('panel STILL VISIBLE after the pick', await p.locator(f('date')+' [data-field-panel]').isVisible());
  ok('a different option is still clickable', await p.locator(f('date')+' [data-pick-value="7d"]').isVisible());
  eq('table untouched — staged', await rows(), before);
  ok('Apply reachable in the panel', await p.locator(f('date')+' [data-panel-apply]').isVisible());
  await p.click(f('date')+' [data-panel-apply]');
  ok('panel closed after Apply', !(await p.locator(f('date')+' [data-field-panel]').isVisible()));
  eq('date committed', await rows(), 19);
  ok('chip shows the applied value',
     /Last 30 days/.test(await p.locator(f('date')+' .chip-label-text').innerText()));

  console.log('-- BUG FIX 2: a chip x commits, it does not leave the list lying');
  await p.click('#recFilterBar [data-rec-add]');
  await p.click('#recFilterBar [data-rec-add-key="platform"]');
  await p.click(f('platform')+' label:has([data-check-value="Stripe"])');
  ok('platform panel survives the toggle', await p.locator(f('platform')+' [data-field-panel]').isVisible());
  await p.click(f('platform')+' [data-panel-apply]');
  const withStripe = await rows();
  ok('Stripe applied', withStripe < 19, withStripe);
  await p.click(f('platform')+' [data-remove-field]');
  ok('platform chip gone from the bar', await p.locator(f('platform')).count()===0);
  eq('and the list stopped filtering by it', await rows(), 19);

  console.log('-- the two status controls stay in step');
  await p.click(seg('attention'));
  ok('attention segment active', await p.locator(seg('attention')+'.active').count()===1);
  ok('status chip followed it',
     /Status:/.test(await p.locator(f('status')+' .chip-label-text').innerText()),
     await p.locator(f('status')+' .chip-label-text').innerText());
  await p.click(f('status')+' [data-field-trigger]');
  for (const v of ['Failed','Rollback failed','Synced with warnings'])
    await p.click(f('status')+' label:has([data-check-value="'+v+'"])');
  ok('status panel STILL VISIBLE after three toggles',
     await p.locator(f('status')+' [data-field-panel]').isVisible());
  await p.click(f('status')+' [data-panel-apply]');
  ok('segment drops to dashed partial',
     await p.locator(seg('attention')+'.partial').count()===1 &&
     await p.locator(seg('attention')+'.active').count()===0);
  ok('segments row still fully clickable',
     await p.locator(seg('ready')).isVisible() && await p.locator(seg('synced')).isVisible());

  console.log('-- deep-link tag');
  await p.click('#recDeepLinkBtn');
  ok('From dashboard tag visible', await p.locator('#recFilterBar [data-deeplink-tag]').isVisible());
  ok('no old deeplink chip', await p.locator('#recFilterBar .deeplink-chip').count()===0);
  ok('status chip carries the value',
     /Rule failed/.test(await p.locator(f('status')+' .chip-label-text').innerText()));
  await p.click(seg('synced'));
  ok('tag gone after a segment click', await p.locator('#recFilterBar [data-deeplink-tag]').count()===0);

  console.log('-- V7 and V8 unaffected');
  await p.click('.nav-tab[data-variant="sheetbtn"]');
  ok('V7 segments row is back', await p.locator('#sheetbtnSegments .status-segment').first().isVisible());
  ok('V7 count line is back', await p.locator('#sheetbtnCount').isVisible());
  await p.click('#sheetbtnFiltersBtn');
  await p.waitForTimeout(400);
  eq('V7 sheet has 5 fields (no status)', await p.locator('#sheetbtnContent [data-field-key]').count(), 5);
  await p.click('#sheetbtnCloseBtn');
  await p.click('.nav-tab[data-variant="groups"]');
  ok('V8 tabs visible', await p.locator('#groupsTabs .status-segment').first().isVisible());
  await p.click('#groupsFilterBar [data-field-key="date"] [data-field-trigger]');
  await p.click('#groupsFilterBar [data-field-key="date"] [data-pick-value="7d"]');
  ok('V8 date panel also stays open on pick (same fix)',
     await p.locator('#groupsFilterBar [data-field-key="date"] [data-field-panel]').isVisible());
  await p.click('#groupsFilterBar [data-field-key="date"] [data-panel-apply]');
  eq('V8 date commits', await rows.call && await p.locator('#groupsTable tbody tr').count(), 6);

  console.log('-- screenshots');
  await p.addStyleTag({content:'.page-header{position:static !important}'});
  await p.click('.nav-tab[data-variant="rec"]');
  await p.locator('#variant-rec .mock-page').screenshot({path:'/tmp/v6-page.png'});
  await p.click(f('status')+' [data-field-trigger]');
  await p.locator('#variant-rec .mock-page').screenshot({path:'/tmp/v6-status.png'});
  console.log('  wrote /tmp/v6-page.png /tmp/v6-status.png');

  ok('no uncaught JS errors', errs.length===0, errs.join(' | '));
  console.log('\n'+pass+' passed, '+fail+' failed');
  await b.close();
  process.exit(fail?1:0);
})();
