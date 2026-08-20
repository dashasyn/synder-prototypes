// Reworked variant 7 in a real browser: radio rows, status in the sheet,
// no segments, no count line. Asserts visibility/clickability, not state.
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
  const rows=()=>p.locator('#sheetbtnTable tbody tr').count();
  const f=k=>'#sheetbtnContent [data-field-key="'+k+'"]';

  await p.click('.nav-tab[data-variant="sheetbtn"]');
  ok('no segments row on the page', await p.locator('#sheetbtnSegments').count()===0);
  ok('no count line on the page', await p.locator('#sheetbtnCount').count()===0);
  ok('no "Showing N of" text visible',
     !/Showing\s*\d+\s*of/.test(await p.locator('#variant-sheetbtn .mock-page').innerText()));
  ok('table sits directly under the toolbar', await p.locator('#sheetbtnTable table').isVisible());

  await p.click('#sheetbtnFiltersBtn');
  await p.waitForTimeout(400);
  eq('6 fields in the sheet', await p.locator('#sheetbtnContent [data-field-key]').count(), 6);
  ok('status field visible', await p.locator(f('status')).isVisible());

  console.log('\n-- radio rows render and are reachable');
  for (const k of ['date','amount','customer']) {
    await p.click(f(k)+' [data-field-trigger]');
    ok(k+': radio panel visible', await p.locator(f(k)+' .dropdown-radio-item input[type="radio"]').first().isVisible());
    eq(k+': zero checkmark rows', await p.locator(f(k)+' .dropdown-item').count(), 0);
    ok(k+': radio is focusable',
       await p.locator(f(k)+' .dropdown-radio-item input').first().evaluate(e=>{e.focus();return document.activeElement===e;}));
    await p.keyboard.press('Escape');
  }
  for (const k of ['status','platform','type']) {
    await p.click(f(k)+' [data-field-trigger]');
    ok(k+': checkbox panel visible', await p.locator(f(k)+' [data-check-value]').first().isVisible());
    await p.keyboard.press('Escape');
  }

  console.log('\n-- picking a date radio stages, does not re-query');
  const before = await rows();
  await p.click(f('date')+' [data-field-trigger]');
  await p.click(f('date')+' .dropdown-radio-item[data-pick-value="30d"]');
  eq('table untouched', await rows(), before);
  ok('trigger reads the new value',
     /Last 30 days/.test(await p.locator(f('date')+' .field-trigger-text').innerText()));
  ok('sheet still open', await p.locator('#sheetbtnSheet').isVisible());

  console.log('\n-- status in the sheet: stages, survives toggles, commits');
  await p.click(f('status')+' [data-field-trigger]');
  await p.click(f('status')+' label:has([data-check-value="Failed"])');
  ok('panel STILL VISIBLE after first toggle', await p.locator(f('status')+' [data-field-panel]').isVisible());
  ok('next checkbox still clickable', await p.locator(f('status')+' [data-check-value="Pending"]').isVisible());
  await p.click(f('status')+' label:has([data-check-value="Pending"])');
  ok('panel STILL VISIBLE after second toggle', await p.locator(f('status')+' [data-field-panel]').isVisible());
  eq('table untouched before Apply', await rows(), before);
  ok('Apply reachable in the footer', await p.locator('#sheetbtnApplyBtn').isVisible());
  ok('Apply names 3 filters', /Apply 3 filters/.test(await p.locator('#sheetbtnApplyBtn').innerText()),
     await p.locator('#sheetbtnApplyBtn').innerText());
  await p.click('#sheetbtnApplyBtn');
  await p.waitForTimeout(400);
  ok('sheet closed', !(await p.locator('#sheetbtnSheet').isVisible()));
  eq('table re-queried', await rows(), 5);
  ok('status chip visible', await p.locator('#sheetbtnChips [data-drop="status"]').isVisible());
  ok('badge shows 3', (await p.locator('#sheetbtnBadge').innerText()) === '3');

  console.log('\n-- chip x commits, Clear all resets status too');
  await p.click('#sheetbtnChips [data-drop="status"]');
  await p.waitForTimeout(200);
  ok('status chip gone', await p.locator('#sheetbtnChips [data-drop="status"]').count()===0);
  ok('date chip still there', await p.locator('#sheetbtnChips [data-drop="date"]').isVisible());
  await p.click('#sheetbtnChips [data-clear]');
  await p.waitForTimeout(200);
  ok('chips bar hidden', !(await p.locator('#sheetbtnChips').isVisible()));
  eq('all rows back', await rows(), 26);

  console.log('\n-- variant 8 untouched by the shared radio change');
  await p.click('.nav-tab[data-variant="groups"]');
  ok('V8 tabs still visible', await p.locator('#groupsTabs .status-segment').first().isVisible());
  ok('V8 count line still there', await p.locator('#groupsCount').isVisible());
  await p.click('#groupsFilterBar [data-field-key="date"] [data-field-trigger]');
  ok('V8 date panel still uses checkmark rows, not radios',
     (await p.locator('#groupsFilterBar [data-field-key="date"] .dropdown-item').count()) > 0 &&
     (await p.locator('#groupsFilterBar [data-field-key="date"] .dropdown-radio-item').count()) === 0);
  await p.keyboard.press('Escape');

  console.log('\n-- screenshots');
  await p.addStyleTag({content:'.page-header{position:static !important}'});
  await p.click('.nav-tab[data-variant="sheetbtn"]');
  await p.locator('#variant-sheetbtn .mock-page').screenshot({path:'/tmp/v7b-page.png'});
  await p.click('#sheetbtnFiltersBtn');
  await p.waitForTimeout(450);
  await p.locator('#sheetbtnSheet').screenshot({path:'/tmp/v7b-sheet.png'});
  await p.click('#sheetbtnContent [data-field-key="date"] [data-field-trigger]');
  await p.locator('#sheetbtnSheet').screenshot({path:'/tmp/v7b-radio.png'});
  console.log('  wrote /tmp/v7b-page.png /tmp/v7b-sheet.png /tmp/v7b-radio.png');

  ok('no uncaught JS errors', errs.length===0, errs.join(' | '));
  console.log('\n'+pass+' passed, '+fail+' failed');
  await b.close();
  process.exit(fail?1:0);
})();
