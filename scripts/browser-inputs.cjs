// The new typed controls in a real browser: amount operators, custom date
// range, customer search. Asserts visibility/clickability, not element state.
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
  await p.addStyleTag({content:'.page-header{position:static !important}'});
  const rows=()=>p.locator('#recTable tbody tr').count();
  const f=k=>'#recFilterBar [data-field-key="'+k+'"]';
  const add=async k=>{await p.click('#recFilterBar [data-rec-add]');await p.click('#recFilterBar [data-rec-add-key="'+k+'"]');};

  await p.click('.nav-tab[data-variant="rec"]');

  console.log('-- amount operators');
  await add('amount');
  ok('operator rows visible', await p.locator(f('amount')+' [data-amount-op="between"]').isVisible());
  // "Any amount" needs no number, so applying it is legitimate — it clears
  // the filter. Only an operator with no number typed blocks Apply.
  ok('Apply enabled on "Any amount" (it clears the filter)',
     await p.locator(f('amount')+' [data-panel-apply]').isEnabled());
  await p.click(f('amount')+' [data-amount-op="between"]');
  ok('panel STILL VISIBLE after choosing an operator',
     await p.locator(f('amount')+' [data-field-panel]').isVisible());
  ok('both number inputs visible and enabled',
     await p.locator(f('amount')+' [data-amount-a]').isVisible() &&
     await p.locator(f('amount')+' [data-amount-b]').isVisible() &&
     await p.locator(f('amount')+' [data-amount-b]').isEnabled());
  ok('Apply still disabled with both empty', await p.locator(f('amount')+' [data-panel-apply]').isDisabled());
  await p.locator(f('amount')+' [data-amount-a]').fill('100');
  ok('panel survives typing', await p.locator(f('amount')+' [data-field-panel]').isVisible());
  ok('focus stayed in the input after typing',
     await p.locator(f('amount')+' [data-amount-a]').evaluate(e=>document.activeElement===e));
  await p.locator(f('amount')+' [data-amount-b]').fill('500');
  ok('Apply now enabled', await p.locator(f('amount')+' [data-panel-apply]').isEnabled());
  // The inputs must be fully inside the panel's visible scrollport, not hidden
  // behind the sticky footer — isVisible() alone would not catch that.
  const inView = (panelSel, elSel) => p.evaluate(([ps, es]) => {
    const pa = document.querySelector(ps), el = document.querySelector(es);
    const pr = pa.getBoundingClientRect(), er = el.getBoundingClientRect();
    const ft = pa.querySelector('.dropdown-panel-footer');
    const top = ft ? ft.getBoundingClientRect().top : pr.bottom;
    return er.top >= pr.top - 1 && er.bottom <= top + 1;
  }, [panelSel, elSel]);
  ok('FROM input fully visible, not clipped by the footer',
     await inView(f('amount')+' [data-field-panel]', f('amount')+' [data-amount-a]'));
  ok('TO input fully visible, not clipped by the footer',
     await inView(f('amount')+' [data-field-panel]', f('amount')+' [data-amount-b]'));
  ok('the amount chip label tracks the typed numbers',
     /\$100\.00 – \$500\.00/.test(await p.locator(f('amount')+' .chip-label-text').innerText()),
     await p.locator(f('amount')+' .chip-label-text').innerText());
  await p.click(f('amount')+' [data-panel-apply]');
  eq('between 100 and 500 applied', await rows(), 14);
  ok('chip reads the range',
     /\$100\.00 – \$500\.00/.test(await p.locator(f('amount')+' .chip-label-text').innerText()),
     await p.locator(f('amount')+' .chip-label-text').innerText());
  await p.locator(f('amount')+' [data-field-panel]').screenshot({path:'/tmp/v6-amount.png'}).catch(()=>{});
  await p.click(f('amount')+' [data-field-trigger]');
  await p.locator('#variant-rec .mock-page').screenshot({path:'/tmp/v6-amount.png'});
  await p.click(f('amount')+' [data-amount-op="is"]');
  ok('switching operator keeps the first number',
     (await p.locator(f('amount')+' [data-amount-a]').inputValue()) === '100');
  ok('the second input is gone for a 1-arg operator',
     await p.locator(f('amount')+' [data-amount-b]').count() === 0);
  await p.keyboard.press('Escape');
  await p.click(f('amount')+' [data-remove-field]');

  console.log('-- custom date range');
  await p.click(f('date')+' [data-field-trigger]');
  ok('Custom range row visible', await p.locator(f('date')+' [data-option-value="custom"]').isVisible());
  ok('no date inputs yet', await p.locator(f('date')+' [data-range-from]').count()===0);
  await p.click(f('date')+' [data-option-value="custom"]');
  ok('two date inputs visible',
     await p.locator(f('date')+' [data-range-from]').isVisible() &&
     await p.locator(f('date')+' [data-range-to]').isVisible());
  ok('Apply disabled on an empty range', await p.locator(f('date')+' [data-panel-apply]').isDisabled());
  ok('panel is wide enough for two fields side by side', (async()=>true)() &&
     (await p.locator(f('date')+' [data-field-panel]').boundingBox()).width >= 250);
  await p.locator(f('date')+' [data-range-from]').fill('2026-03-01');
  await p.locator(f('date')+' [data-range-to]').fill('2026-03-31');
  ok('Apply enabled', await p.locator(f('date')+' [data-panel-apply]').isEnabled());
  ok('the chip label already reflects the typed range (not stale "Custom range")',
     /Mar 1, 2026 – Mar 31, 2026/.test(await p.locator(f('date')+' .chip-label-text').innerText()),
     await p.locator(f('date')+' .chip-label-text').innerText());
  ok('and focus is still in the date input',
     await p.locator(f('date')+' [data-range-to]').evaluate(e=>document.activeElement===e));
  await p.locator('#variant-rec .mock-page').screenshot({path:'/tmp/v6-daterange.png'});
  await p.click(f('date')+' [data-panel-apply]');
  eq('custom range applied', await rows(), 11);
  ok('chip reads both dates',
     /Mar 1, 2026 – Mar 31, 2026/.test(await p.locator(f('date')+' .chip-label-text').innerText()),
     await p.locator(f('date')+' .chip-label-text').innerText());
  await p.click(f('date')+' [data-field-trigger]');
  ok('reopening keeps the typed dates',
     (await p.locator(f('date')+' [data-range-from]').inputValue()) === '2026-03-01');
  await p.click(f('date')+' [data-pick-value="90d"]');
  await p.click(f('date')+' [data-panel-apply]');
  eq('back to a preset', await rows(), 43);

  console.log('-- customer search');
  await add('customer');
  ok('search box visible', await p.locator(f('customer')+' [data-panel-search]').isVisible());
  const shown=()=>p.locator(f('customer')+' [data-pick-value]:not(.row-hidden)').count();
  const all=await p.locator(f('customer')+' [data-pick-value]').count();
  eq('all rows visible initially', await shown(), all);
  await p.locator(f('customer')+' [data-panel-search]').type('ver');
  ok('panel STILL VISIBLE while typing', await p.locator(f('customer')+' [data-field-panel]').isVisible());
  ok('focus stayed in the search box',
     await p.locator(f('customer')+' [data-panel-search]').evaluate(e=>document.activeElement===e));
  ok('list narrowed', (await shown()) < all, await shown());
  // A chip has its own x, so there is no "All customers" row to keep visible.
  ok('no "All customers" row on a chip',
     await p.locator(f('customer')+' [data-option-value="all"]').count() === 0);
  ok('Vertex Supply is a visible match',
     await p.locator(f('customer')+' [data-pick-value="Vertex Supply"]').isVisible());
  await p.locator('#variant-rec .mock-page').screenshot({path:'/tmp/v6-search.png'});
  await p.locator(f('customer')+' [data-panel-search]').fill('zzz');
  ok('"No matches" visible', await p.locator(f('customer')+' [data-panel-empty]').isVisible());
  await p.locator(f('customer')+' [data-panel-search]').fill('vertex');
  await p.click(f('customer')+' [data-pick-value="Vertex Supply"]');
  await p.click(f('customer')+' [data-panel-apply]');
  eq('picked from a searched list', await rows(), 8);
  await p.click(f('customer')+' [data-field-trigger]');
  ok('search box empty on reopen',
     (await p.locator(f('customer')+' [data-panel-search]').inputValue()) === '');
  eq('all rows visible again', await shown(), all);
  await p.keyboard.press('Escape');

  console.log('-- the same controls work in a sheet (V7) and a popover (V4)');
  await p.click('.nav-tab[data-variant="sheetbtn"]');
  await p.click('#sheetbtnFiltersBtn');
  await p.waitForTimeout(400);
  await p.click('#sheetbtnContent [data-field-key="amount"] [data-field-trigger]');
  ok('V7 sheet: amount operators visible',
     await p.locator('#sheetbtnContent [data-field-key="amount"] [data-amount-op="between"]').isVisible());
  await p.keyboard.press('Escape');   // an open panel overlays the field below it
  await p.click('#sheetbtnContent [data-field-key="customer"] [data-field-trigger]');
  ok('V7 sheet: customer search visible',
     await p.locator('#sheetbtnContent [data-field-key="customer"] [data-panel-search]').isVisible());
  await p.click('#sheetbtnCloseBtn');
  await p.click('.nav-tab[data-variant="button"]');
  await p.click('#buttonFilterBar [data-filters-btn]').catch(async()=>{await p.click('#buttonFilterBar button');});
  await p.click('#popoverBody [data-field-key="date"] [data-field-trigger]');
  ok('V4 popover: Custom range visible',
     await p.locator('#popoverBody [data-field-key="date"] [data-option-value="custom"]').isVisible());

  console.log('  wrote /tmp/v6-amount.png /tmp/v6-daterange.png /tmp/v6-search.png');
  ok('no uncaught JS errors', errs.length===0, errs.join(' | '));
  console.log('\n'+pass+' passed, '+fail+' failed');
  await b.close();
  process.exit(fail?1:0);
})();
