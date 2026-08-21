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
  ok('date and platform use the same chip component',
     (await p.locator(f('date')+' span.filter-chip > button.chip-trigger').count()) === 1 &&
     (await p.locator(f('platform')+' span.filter-chip > button.chip-trigger').count()) === 1);
  const geo = sel => p.locator(sel+' .chip-trigger').evaluate(e => {
    const c = getComputedStyle(e), r = e.getBoundingClientRect();
    return [Math.round(r.height), c.fontSize, c.fontFamily, c.paddingLeft].join('|');
  });
  ok('and render identically', (await geo(f('date'))) === (await geo(f('platform'))),
     (await geo(f('date'))) + '  vs  ' + (await geo(f('platform'))));

  console.log('-- default bar is Date range + Platform');
  eq('two chips on the bar', await p.locator('#recFilterBar [data-field-key]').count(), 2);
  ok('platform chip visible', await p.locator(f('platform')).isVisible());
  ok('status not on the bar', await p.locator(f('status')).count() === 0);
  await p.click('#recFilterBar [data-rec-add]');
  ok('status is offered in Add filter',
     await p.locator('#recFilterBar [data-rec-add-key="status"]').isVisible());
  await p.click('#recFilterBar [data-rec-add-key="status"]');
  ok('status chip visible after adding', await p.locator(f('status')).isVisible());
  eq('19 checkboxes', await p.locator(f('status')+' [data-check-value]').count(), 19);
  eq('5 group headers', await p.locator(f('status')+' .dropdown-group-label').count(), 5);
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
  eq('date committed', await rows(), 31);
  ok('chip shows the applied value',
     /Last 30 days/.test(await p.locator(f('date')+' .chip-label-text').innerText()));

  console.log('-- BUG FIX 2: a chip x commits, it does not leave the list lying');
  await p.click(f('platform')+' [data-field-trigger]');
  await p.click(f('platform')+' label:has([data-check-value="Stripe"])');
  ok('platform panel survives the toggle', await p.locator(f('platform')+' [data-field-panel]').isVisible());
  await p.click(f('platform')+' [data-panel-apply]');
  const withStripe = await rows();
  ok('Stripe applied', withStripe < 19, withStripe);
  await p.click(f('platform')+' [data-remove-field]');
  // Platform is PINNED: its x clears the value and leaves the chip in place.
  ok('pinned platform chip stays on the bar', await p.locator(f('platform')).isVisible());
  eq('but the list stopped filtering by it', await rows(), 31);
  ok('Clear filters is on the bar while the date filter is applied',
     await p.locator('#recFilterBar [data-rec-clear]').isVisible());
  await p.click('#recFilterBar [data-rec-clear]');
  eq('Clear filters clears everything', await rows(), 45);
  ok('and then removes itself', await p.locator('#recFilterBar [data-rec-clear]').count()===0);

  console.log('-- the two status controls stay in step');
  // Clear filters emptied the bar back to the pinned pair, so put status back.
  await p.click('#recFilterBar [data-rec-add]');
  await p.click('#recFilterBar [data-rec-add-key="status"]');
  await p.keyboard.press('Escape');
  await p.click(seg('needs-attention'));
  ok('attention segment active', await p.locator(seg('needs-attention')+'.active').count()===1);
  ok('status chip followed it',
     /Status:/.test(await p.locator(f('status')+' .chip-label-text').innerText()),
     await p.locator(f('status')+' .chip-label-text').innerText());
  await p.click(f('status')+' [data-field-trigger]');
  for (const v of ['Failed','Rollback failed','Synced with warnings','Canceled','Not parsed'])
    await p.click(f('status')+' label:has([data-check-value="'+v+'"])');
  ok('status panel STILL VISIBLE after three toggles',
     await p.locator(f('status')+' [data-field-panel]').isVisible());
  await p.click(f('status')+' [data-panel-apply]');
  ok('segment drops to dashed partial',
     await p.locator(seg('needs-attention')+'.partial').count()===1 &&
     await p.locator(seg('needs-attention')+'.active').count()===0);
  ok('segments row still fully clickable',
     await p.locator(seg('ready-to-sync')).isVisible() && await p.locator(seg('successful')).isVisible());

  console.log('-- deep-link renders as a plain status chip');
  await p.click('#recDeepLinkBtn');
  ok('no attribution marker at all',
     await p.locator('#recFilterBar [data-deeplink-tag]').count()===0 &&
     await p.locator('#recFilterBar .deeplink-chip').count()===0 &&
     !/From dashboard/.test(await p.locator('#variant-rec .mock-page').innerText()));
  ok('status chip carries the value',
     /Synced with rule failed/.test(await p.locator(f('status')+' .chip-label-text').innerText()));
  ok('and it has a working remove button',
     await p.locator(f('status')+' [data-remove-field]').isVisible());
  await p.click(seg('successful'));
  ok('segment click replaces the value',
     /selected|Synced/.test(await p.locator(f('status')+' .chip-label-text').innerText()));

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
  eq('V8 date commits', await p.locator('#groupsTable tbody tr').count(), 8);

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
