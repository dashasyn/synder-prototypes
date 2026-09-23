const { chromium } = require('/home/ubuntu/.openclaw/workspace/node_modules/playwright');
const F = process.env.JE_URL || 'file:///home/ubuntu/.openclaw/workspace/projects/txnrecon-balancing-je/index.html';
let pass=0, fail=0;
const ok=(n,c,x)=>{c?(pass++,console.log('  ok   '+n)):(fail++,console.log('  FAIL '+n+(x!==undefined?'  -> '+x:'')))};
(async()=>{
  const b=await chromium.launch();
  for (const vp of [{width:1600,height:1000},{width:1360,height:820}]) {
    console.log('\n--- '+vp.width+'x'+vp.height);
    const p=await b.newPage({viewport:vp});
    const errs=[];p.on('pageerror',e=>errs.push(e.message));
    await p.goto(F);
    const vis=s=>p.locator(s).first().isVisible();
    const txt=async s=>(await p.locator(s).first().innerText()).trim();
    const hittable=async sel=>{const l=p.locator(sel).first();if(!(await l.count()))return false;
      if(!(await l.isVisible()))return false;
      return await l.evaluate(el=>{const r=el.getBoundingClientRect();if(!r.width||!r.height)return false;
        const t=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
        return !!t&&(el===t||el.contains(t)||t.contains(el));});};
    const active=()=>p.evaluate(()=>{const a=document.activeElement;return a?a.tagName.toLowerCase()+(a.id?'#'+a.id:'')+(typeof a.className==='string'&&a.className?'.'+a.className.trim().split(/\s+/)[0]:''):'none'});

    /* ---- landing is the list ---- */
    ok('lands on the reconciliations list', await vis('#screen-list'));
    ok('results screen not shown on load', !(await p.locator('#screen-results').isVisible()));
    ok('page title matches the frame', (await txt('#screen-list h1'))==='Transaction reconciliation');
    ok('Journal entries button present', await vis('#open-je-list'));
    ok('Add reconciliation button present', (await p.locator('#screen-list .acts .btn.primary').innerText()).trim()==='Add reconciliation');
    ok('Active / Deleted tabs', (await p.locator('#screen-list .tabs .tab').allInnerTexts()).join('/')==='Active/Deleted');
    ok('8 active reconciliation rows', (await p.locator('#list-body tr').count())===8);
    ok('status chips render all three values', await p.evaluate(()=>{
      const s=[...document.querySelectorAll('#list-body .st')].map(e=>e.textContent.trim());
      return s.includes('Reconciled')&&s.includes('Not reconciled')&&s.includes('N/A');}));
    ok('no horizontal overflow on the list', await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));

    /* ---- design-system conformance: values come from the kit, not from me ---- */
    const kit=n=>p.evaluate(v=>getComputedStyle(document.documentElement).getPropertyValue(v).trim(), n);
    const fs=s2=>p.locator(s2).first().evaluate(e=>getComputedStyle(e).fontSize);
    ok('the UI kit stylesheet is actually linked', await p.evaluate(()=>
      [...document.styleSheets].some(ss=>ss.href&&/synder-ui-kit\.css/.test(ss.href))));
    ok('base type is the kit Body_2, not a shrunken one', (await p.evaluate(()=>getComputedStyle(document.body).fontSize))===await kit('--font-body2'));
    ok('buttons use the kit button type', (await fs('#screen-list .btn.primary'))===await kit('--font-button'));
    ok('buttons use the kit button height', (await p.locator('#screen-list .btn.primary').first().evaluate(e=>Math.round(e.getBoundingClientRect().height)+'px'))===await kit('--btn-height'));
    ok('inputs use the kit input height', (await p.locator('#l-from').first().evaluate(e=>Math.round(e.getBoundingClientRect().height)+'px'))===await kit('--input-height'));
    ok('inputs use the kit body type', (await fs('#l-from'))===await kit('--font-body2'));
    ok('table cells use the kit body type', (await fs('#list-body td'))===await kit('--font-body2'));
    ok('table headers use the kit caption size (12px)', (await fs('#screen-list thead th'))==='12px');
    ok('table dividers use the kit border token', await p.evaluate(async()=>{
      const want=getComputedStyle(document.documentElement).getPropertyValue('--border-default').trim();
      const probe=document.createElement('span'); probe.style.color=want; document.body.appendChild(probe);
      const rgb=getComputedStyle(probe).color; probe.remove();
      return getComputedStyle(document.querySelector('#list-body td')).borderBottomColor===rgb;}));

    /* ---- deleted reconciliations ---- */
    ok('no deleted rows under Active', await p.evaluate(()=>
      ![...document.querySelectorAll('#list-body tr')].some(r=>/Aug 1, 2024|Jul 1, 2024/.test(r.textContent))));
    await p.locator('#screen-list .tab[data-ltab="deleted"]').click(); await p.waitForTimeout(250);
    ok('Deleted tab selected', (await p.locator('#screen-list .tab[data-ltab="deleted"]').getAttribute('aria-selected'))==='true');
    ok('Deleted tab lists only the deleted ones', (await p.locator('#list-body tr').count())===2);
    ok('a deleted reconciliation keeps its status', (await txt('#list-body')).includes('Reconciled'));
    await p.locator('#list-body tr').first().click(); await p.waitForTimeout(250);
    ok('deleted banner shows inside a deleted reconciliation', await vis('#del-banner'));
    ok('banner heading', (await txt('#del-banner b'))==='Deleted reconciliation');
    ok('banner body is the approved copy', (await txt('#del-banner span'))==="View only, and this can't be undone. The period is free to reconcile again.");
    ok('banner sits above the tabs', await p.evaluate(()=>
      document.getElementById('del-banner').getBoundingClientRect().bottom <=
      document.querySelector('#screen-results .tabs').getBoundingClientRect().top + 1));
    ok('banner is inside the viewport', await p.evaluate(()=>{
      const r=document.getElementById('del-banner').getBoundingClientRect();
      return r.top>=0 && r.bottom<=window.innerHeight && r.left>=0 && r.right<=window.innerWidth;}));
    ok('banner is neutral, not an error colour', await p.evaluate(()=>{
      const c=getComputedStyle(document.getElementById('del-banner')).backgroundColor;
      const m=c.match(/\d+/g).map(Number);
      return Math.abs(m[0]-m[1])<12 && Math.abs(m[1]-m[2])<12;}));
    ok('status chip still shown, not stripped', await vis('#screen-results .st-chip'));
    ok('Refresh data stays available on a deleted reconciliation', await hittable('#screen-results .topbar .btn:last-child'));
    await p.locator('#back-to-list').click(); await p.waitForTimeout(250);
    await p.locator('#screen-list .tab[data-ltab="active"]').click(); await p.waitForTimeout(250);
    ok('back on Active, 8 rows again', (await p.locator('#list-body tr').count())===8);
    await p.locator('#list-body tr[data-rc="rc1"]').click(); await p.waitForTimeout(250);
    ok('banner hidden on an active reconciliation', !(await p.locator('#del-banner').isVisible()));
    await p.locator('#back-to-list').click(); await p.waitForTimeout(250);

    /* ---- row opens the preview ---- */
    await p.locator('#list-body tr[data-rc="rc2"]').click(); await p.waitForTimeout(250);
    ok('row click opens the reconciliation preview', await vis('#screen-results'));
    ok('the list underneath is fully covered by the overlay', await p.evaluate(()=>{
      const ov=document.getElementById('screen-results');
      const probes=[document.querySelector('#screen-list h1'), document.querySelector('#list-body tr'), document.getElementById('open-je-list')];
      return probes.filter(Boolean).every(el=>{
        const r=el.getBoundingClientRect();
        if(!r.width||!r.height) return true;
        const hit=document.elementFromPoint(r.left+r.width/2, r.top+r.height/2);
        return !!hit && (ov===hit || ov.contains(hit));});}));
    ok('preview header reflects the clicked row', (await txt('#r-sub')).includes('Mar 20, 2025 – Mar 23, 2025'));
    ok('Missing source tab selected', (await p.locator('.tab[data-tab="miss"]').getAttribute('aria-selected'))==='true');
    ok('results overlay paints over the sidebar (occlusion, not visibility)', await p.evaluate(()=>{
      const sb=document.querySelector('.sidebar'), ov=document.getElementById('screen-results');
      const r=sb.getBoundingClientRect();
      const hit=document.elementFromPoint(r.left+r.width/2, r.top+Math.min(r.height/2,300));
      return !!hit && (ov===hit || ov.contains(hit));}));
    ok('overlay spans the whole stage', await p.evaluate(()=>{
      const r=document.getElementById('screen-results').getBoundingClientRect();
      const s=document.getElementById('stage').getBoundingClientRect();
      return Math.abs(r.left-s.left)<2 && Math.abs(r.top-s.top)<2 && Math.abs(r.width-s.width)<2;}));
    ok('nothing from the app shell is hittable behind the overlay', await p.evaluate(()=>{
      const a=document.querySelector('.sidebar a'); if(!a) return true;
      const r=a.getBoundingClientRect(); if(!r.width||!r.height) return true;
      const t=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
      return !a.contains(t)&&t!==a;}));
    ok('top blue block carries Match manually only', await p.evaluate(()=>
      [...document.querySelectorAll('.hintbar button')].map(b=>b.textContent.trim()).join('/')==='Match manually'));
    ok('no Create journal entry in the top block', await p.evaluate(()=>
      ![...document.querySelectorAll('.hintbar button')].some(b=>/journal entry/i.test(b.textContent))));
    ok('integration bulk bar never offers Create journal entry', await p.evaluate(()=>
      ![...document.querySelectorAll('#int-bulk button')].some(b=>/journal entry/i.test(b.textContent))));
    ok('close returns to the list', await (async()=>{await p.locator('#back-to-list').click();await p.waitForTimeout(200);return await vis('#screen-list')})());
    ok('focus returns to the row that was opened', (await active()).includes('rowlink'), await active());

    /* ---- another row opens the same preview ---- */
    await p.locator('#list-body tr[data-rc="rc5"] .rowlink').click(); await p.waitForTimeout(250);
    ok('a different row opens the preview too', await vis('#screen-results'));
    ok('header follows that row', (await txt('#r-sub')).includes('Dec 1, 2024 – Dec 31, 2024'));
    ok('same preview content underneath', (await p.locator('#miss-body tr').count())===8);

    /* ---- JE drawer from the list ---- */
    await p.locator('#back-to-list').click(); await p.waitForTimeout(200);
    await p.locator('#open-je-list').click(); await p.waitForTimeout(250);
    ok('Journal entries drawer opens from the list', await vis('#jel-sheet'));
    ok('drawer explains itself', (await txt('#jel-sheet .info')).includes('created to balance missing transactions'));
    ok('drawer seeded with existing entries', (await p.locator('#jel-body tr').count())===2);
    ok('Net on account column', (await txt('#jel-sheet th.num'))==='Net on account');
    ok('drawer takes focus', await p.evaluate(()=>document.getElementById('jel-sheet').contains(document.activeElement)));
    await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    ok('Escape closes the drawer', !(await p.locator('#jel-sheet').isVisible()));
    ok('focus returns to the Journal entries button', (await active()).includes('open-je-list'), await active());
    await p.locator('#open-je-list').click(); await p.waitForTimeout(200);
    ok('the list button re-opens the side sheet', await vis('#jel-sheet'));
    await p.locator('#jel-close').click(); await p.waitForTimeout(200);


    /* ---- SCREEN C · Journal entries page (sidebar) ---- */
    await p.locator('#nav-journals').click(); await p.waitForTimeout(250);
    ok('sidebar Manual Journals opens a separate page', await vis('#screen-journals'));
    ok('reconciliations list is hidden', !(await p.locator('#screen-list').isVisible()));
    ok('it is a page, not a drawer', !(await p.locator('#jel-sheet').isVisible()));
    ok('page title matches production', (await txt('#journals-h1'))==='Journal entries');
    ok('subtitle matches production', (await txt('#screen-journals .phead p')).startsWith('Adjust the summary amounts for a specific day'));
    ok('New entry button', (await txt('#screen-journals .acts .btn'))==='New entry');
    ok('summaries refresh note present', (await txt('#screen-journals .info')).includes('Refresh corresponding summaries manually'));
    ok('nav marks Manual Journals current', (await p.locator('#nav-journals').getAttribute('class')).includes('cur'));
    ok('columns match production plus Type', (await p.locator('#screen-journals thead th').allInnerTexts()).map(t=>t.trim()).slice(0,5).join('/')==='Date/Name/Type/Memo/Amount');
    ok('both manual journals listed', (await txt('#journals-body')).includes('Test 1234') && (await txt('#journals-body')).includes('tytbuyf'));
    ok('balancing entries listed alongside them', (await txt('#journals-body')).includes('SYN-TXNRECON-'));
    ok('4 rows with no filter', (await p.locator('#journals-body tr').count())===4);
    ok('amount formatted like production', (await txt('#journals-body tr:last-child td.num')).match(/^\$\d[\d,]*\.\d\d [A-Z]{3}$/)!==null, await txt('#journals-body tr:last-child td.num'));

    await p.selectOption('#j-type','manual'); await p.waitForTimeout(200);
    ok('Type=Manual filters to manual journals only', (await p.locator('#journals-body tr').count())===2);
    ok('no balancing rows under Manual', !(await txt('#journals-body')).includes('SYN-TXNRECON-'));
    ok('row count line updates', (await txt('#j-count'))==='1–2 of 2');
    await p.selectOption('#j-type','balancing'); await p.waitForTimeout(200);
    ok('Type=Balancing filters to balancing entries only', (await p.locator('#journals-body tr').count())===2);
    ok('no manual rows under Balancing', !(await txt('#journals-body')).includes('Test 1234'));

    ok('balancing row menu carries View reconciliation', await (async()=>{
      await p.locator('#journals-body tr:first-child .kebab').click(); await p.waitForTimeout(150);
      const r = await hittable('#rowmenu [data-je="recon"]'); await p.keyboard.press('Escape'); await p.waitForTimeout(150);
      return r;})());
    await p.selectOption('#j-type','manual'); await p.waitForTimeout(200);
    ok('manual row menu has no View reconciliation', await (async()=>{
      await p.locator('#journals-body tr:first-child .kebab').click(); await p.waitForTimeout(150);
      const n = await p.locator('#rowmenu [data-je="recon"]').count(); await p.keyboard.press('Escape'); await p.waitForTimeout(150);
      return n===0;})());
    await p.selectOption('#j-type','all'); await p.waitForTimeout(200);
    await p.locator('#j-reset').click(); await p.waitForTimeout(200);
    ok('Reset filters restores all rows', (await p.locator('#journals-body tr').count())===4);

    /* all three surfaces still exist */
    await p.locator('#nav-txnrecon').click(); await p.waitForTimeout(200);
    ok('back to the reconciliations list', await vis('#screen-list'));
    await p.locator('#open-je-list').click(); await p.waitForTimeout(250);
    ok('surface 3 — side sheet still opens from the list', await vis('#jel-sheet'));
    await p.locator('#jel-close').click(); await p.waitForTimeout(200);

    /* ---- create flow ---- */
    await p.locator('#list-body tr[data-rc="rc2"]').click(); await p.waitForTimeout(250);
    await p.locator('#miss-body tr[data-row="r3"] .kebab').click(); await p.waitForTimeout(150);
    ok('ineligible row: Create journal entry marked disabled', await p.locator('#rowmenu .mi[aria-disabled="true"]').isVisible());
    ok('row menu is hittable on the results page', await hittable('#rowmenu .mi'));
    ok('reason is NOT shown as a block under the item', !(await p.locator('#rowmenu .mi-tip').isVisible()));
    ok('reason appears on hover', await (async()=>{
      await p.locator('#rowmenu .mi-wrap').hover(); await p.waitForTimeout(250);
      return await p.locator('#rowmenu .mi-tip').isVisible();})());
    ok('hover reason names the cause', (await txt('#rowmenu .mi-tip')).includes('primary and secondary IDs are missing'));
    ok('tooltip sits clear of every viewport edge', await p.evaluate(()=>{
      const r=document.querySelector('#rowmenu .mi-tip').getBoundingClientRect();
      const m=4;
      return r.left>=m && r.top>=m && r.right<=window.innerWidth-m && r.bottom<=window.innerHeight-m;}));
    ok('reason hides again when the pointer leaves', await (async()=>{
      await p.mouse.move(5,5); await p.waitForTimeout(250);
      return !(await p.locator('#rowmenu .mi-tip').isVisible());})());
    ok('reason is reachable by keyboard, not mouse only', await (async()=>{
      await p.locator('#rowmenu .mi[aria-disabled="true"]').focus(); await p.waitForTimeout(250);
      return await p.locator('#rowmenu .mi-tip').isVisible();})());
    ok('aria-disabled is honoured as not-actionable', !(await p.locator('#rowmenu .mi[aria-disabled="true"]').isEnabled()));
    ok('forcing a click on it still opens nothing', await (async()=>{
      await p.locator('#rowmenu .mi[aria-disabled="true"]').dispatchEvent('click'); await p.waitForTimeout(250);
      return await p.locator('#je-sheet').isHidden();})());
    await p.keyboard.press('Escape'); await p.waitForTimeout(150);
    ok('focus returns to kebab', (await active()).includes('kebab'));

    await p.locator('#sel-all').check(); await p.waitForTimeout(200);
    ok('accounting bulk bar is Create journal entry + Ignore', (await p.locator('#bulk button').allInnerTexts()).map(t=>t.trim()).join('/')==='Create journal entry/Ignore');
    ok('Create journal entry sits next to Ignore', await p.evaluate(()=>{
      const b=[...document.querySelectorAll('#bulk button')];
      return b.length===2 && /journal entry/i.test(b[0].textContent) && /ignore/i.test(b[1].textContent);}));
    ok('Create journal entry is hittable in the bulk bar', await hittable('#bulk-create'));
    ok('integration column has a select-all', await p.locator('#int-sel-all').isVisible());
    await p.locator('#int-sel-all').check(); await p.waitForTimeout(200);
    ok('integration bulk bar appears', await p.locator('#int-bulk').isVisible());
    ok('integration bulk bar shows only Ignore', (await p.locator('#int-bulk button').allInnerTexts()).map(t=>t.trim()).join('/')==='Ignore');
    ok('integration bulk count', (await txt('#int-bulk-count'))==='4 selected');
    await p.locator('#int-bulk-ignore').click(); await p.waitForTimeout(300);
    ok('bulk ignore empties the integration column', await p.locator('#int-empty').isVisible());
    ok('integration bulk bar goes away', !(await p.locator('#int-bulk').isVisible()));
    await p.locator('#bulk-create').click(); await p.waitForTimeout(250);
    ok('partial-block modal', (await txt('#modal-title')).includes("Some transactions can"));
    ok('names the remaining count', (await txt('#modal-body')).includes('Proceed with the remaining 5 transactions?'));
    ok('modal takes focus', await p.evaluate(()=>document.getElementById('modal').contains(document.activeElement)));
    await p.locator('#modal-actions .btn.primary').click(); await p.waitForTimeout(300);

    ok('side sheet opens', await vis('#je-sheet'));
    ok('CTA reads Post to books', (await txt('#je-post'))==='Post to books');
    ok('number read-only', await p.locator('#je-num').evaluate(e=>e.readOnly));
    ok('currency locked', await p.locator('#je-cur').evaluate(e=>e.disabled));
    ok('date constrained to the period', await p.locator('#je-date').evaluate(e=>e.min==='2025-03-20'&&e.max==='2025-03-23'));
    ok('one-JE notice in the sheet', (await txt('#je-sheet .info')).includes('Only one journal entry can be created per reconciliation'));
    ok('5 locked lines + balancing line', (await p.locator('#lines-body tr').count())===6);
    ok('token description on locked line', (await p.locator('#lines-body tr:first-child input[readonly]').nth(1).inputValue()).startsWith('date:2024-03-15 p_id:ch_'));
    ok('row without a date omits the date token', await p.evaluate(()=>[...document.querySelectorAll('#lines-body tr')]
      .map(r=>r.querySelectorAll('input[readonly]')[1]).filter(Boolean).map(i=>i.value)
      .some(v=>v&&!v.includes('date:')&&v.includes('p_id:'))));
    ok('memo prefilled', (await p.locator('#je-memo').inputValue())==="Balancing journal entry created from Synder's Transaction Reconciliation");
    ok('balanced on open', (await p.locator('#je-totals').getAttribute('class')).includes('ok'));
    ok('totals 260.00', (await txt('#tot-d'))==='260.00 USD');
    const inc=p.locator('#lines-body tr:last-child input[data-f="credit"]');
    await inc.fill('200'); await p.waitForTimeout(200);
    ok('unbalanced turns red', (await p.locator('#je-totals').getAttribute('class')).includes('bad'));
    ok('gap named and visible', await vis('#je-oob') && (await txt('#je-oob')).includes('Out of balance by 60.00 USD'));
    ok('Post disabled while unbalanced', await p.locator('#je-post').isDisabled());
    await inc.fill('260'); await p.waitForTimeout(200);
    ok('rebalance re-enables Post', !(await p.locator('#je-post').isDisabled()));
    await p.locator('#add-line').click(); await p.waitForTimeout(150);
    ok('Add line works', (await p.locator('#lines-body tr').count())===7);
    await p.locator('#lines-body [data-rm]').last().click(); await p.waitForTimeout(150);
    await p.locator('#add-line').click(); await p.waitForTimeout(150);
    ok('Add line works a second time', (await p.locator('#lines-body tr').count())===7);
    ok('Add line still clickable', await p.locator('#add-line').isVisible());
    await p.locator('#lines-body [data-rm]').last().click(); await p.waitForTimeout(150);

    await p.locator('#je-post').click(); await p.waitForTimeout(400);
    ok('sheet closes on post', !(await p.locator('#je-sheet').isVisible()));
    ok('sent toast', (await p.locator('.toast').allInnerTexts()).some(t=>t.includes('Journal entry sent to your books.')));
    await p.waitForTimeout(1300);
    ok('created+matched toast', /5 rows moved to Matched\./.test((await p.locator('.toast').allInnerTexts()).join(' | ')));
    ok('rows left Missing in accounting', (await p.locator('#miss-body tr').count())===3);
    ok('Journal entry tab appears', await p.locator('#tab-je').isVisible());
    await p.locator('.tab[data-tab="matched"]').click(); await p.waitForTimeout(250);
    ok('matched count incremented', (await txt('#c-matched'))==='100,005');
    ok('match view columns follow the frame', (await p.locator('#panel-matched > table > thead th').allInnerTexts()).map(t=>t.trim()).slice(2).join('/')==='Matching ID/Total amount/Date/Types/Match type/Count');
    ok('match view has its own filters incl. Amount and Currency', await p.locator('#m-amt-a').isVisible() && await p.locator('#m-cur').isVisible());
    ok('5 JE matches + 2 pre-existing groups', (await p.locator('#matched-body tr[data-grp]').count())===7);
    ok('both Auto and Manual match types present', await p.evaluate(()=>{
      const t=[...document.querySelectorAll('#matched-body tr[data-grp]')].map(r=>r.children[6].textContent.trim());
      return t.includes('Auto')&&t.includes('Manual');}));
    ok('detail rows collapsed by default', !(await p.locator('#matched-body .detail-row').first().isVisible()));
    ok('expand control reports collapsed', (await p.locator('#matched-body [data-exp]').first().getAttribute('aria-expanded'))==='false');

    await p.locator('#matched-body [data-exp]').first().click(); await p.waitForTimeout(250);
    ok('expanding shows the detail', await p.locator('#matched-body .detail-row').first().isVisible());
    ok('aria-expanded flips', (await p.locator('#matched-body [data-exp]').first().getAttribute('aria-expanded'))==='true');
    ok('accounting and integration panels side by side', (await p.locator('#matched-body .detail-row').first().locator('.dtl').count())===2);
    ok('panel headings name their side', (await txt('#matched-body .detail-row .dtl h4')).startsWith('Accounting rows'));
    ok('sub-table columns match the frame', (await p.locator('#matched-body .detail-row table.sub thead th').allInnerTexts()).map(t=>t.trim()).slice(0,6).join('/')==='Primary ID/Secondary ID/Date/Transaction type/Amount/Description');
    ok('accounting side shows Journal entry as the type', (await txt('#matched-body .detail-row .dtl:first-child table.sub tbody')).includes('Journal entry'));
    ok('integration side keeps the original type', (await txt('#matched-body .detail-row .dtl:last-child table.sub tbody')).includes('Invoice payment'));

    ok('description tooltip hidden at rest', !(await p.locator('#matched-body .detail-row .info-tip').first().isVisible()));
    ok('description tooltip appears on hover', await (async()=>{
      await p.locator('#matched-body .detail-row .dtl:first-child .info-wrap').first().hover(); await p.waitForTimeout(250);
      return await p.locator('#matched-body .detail-row .dtl:first-child .info-tip').first().isVisible();})());
    ok('tooltip carries the journal entry number', (await txt('#matched-body .detail-row .dtl:first-child .info-tip')).includes('SYN-TXNRECON-12345678'));
    ok('tooltip carries the memo', (await txt('#matched-body .detail-row .dtl:first-child .info-tip')).includes("Balancing journal entry created from Synder's Transaction Reconciliation"));
    ok('description tooltip sits clear of every viewport edge', await p.evaluate(()=>{
      const r=document.querySelector('#matched-body .detail-row .dtl:first-child .info-tip').getBoundingClientRect();
      const m=4;
      return r.left>=m && r.top>=m && r.right<=window.innerWidth-m && r.bottom<=window.innerHeight-m;}));
    ok('tooltip reachable by keyboard', await (async()=>{
      await p.mouse.move(2,2); await p.waitForTimeout(200);
      await p.locator('#matched-body .detail-row .dtl:first-child .info-btn').first().focus(); await p.waitForTimeout(250);
      return await p.locator('#matched-body .detail-row .dtl:first-child .info-tip').first().isVisible();})());
    ok('a pre-existing match carries no entry number', await (async()=>{
      const last=p.locator('#matched-body tr[data-grp]').last();
      await last.locator('[data-exp]').click(); await p.waitForTimeout(250);
      const t=await p.locator('#matched-body .detail-row').last().innerText();
      return !t.includes('SYN-TXNRECON-');})());
    ok('collapsing again works', await (async()=>{
      await p.locator('#matched-body [data-exp]').first().click(); await p.waitForTimeout(250);
      return !(await p.locator('#matched-body .detail-row').first().isVisible());})());
    ok('expand button still hittable after two toggles', await hittable('#matched-body [data-exp]'));

    /* ---- one-JE rule ---- */
    await p.locator('.tab[data-tab="miss"]').click(); await p.waitForTimeout(150);
    await p.locator('#miss-body tr:first-child input[data-sel]').check(); await p.waitForTimeout(120);
    await p.locator('#bulk-create').click(); await p.waitForTimeout(250);
    ok('one-JE modal', (await txt('#modal-title'))==='You can have only one journal entry per reconciliation');
    await p.locator('#modal-actions .btn').click(); await p.waitForTimeout(150);

    /* ---- new JE reaches the org-wide drawer ---- */
    await p.locator('#back-to-list').click(); await p.waitForTimeout(200);
    await p.locator('#open-je-list').click(); await p.waitForTimeout(250);
    ok('new entry appears in the drawer', (await p.locator('#jel-body tr').count())===3);
    ok('new entry also reaches the Journal entries page', await (async()=>{
      await p.locator('#jel-close').click(); await p.waitForTimeout(200);
      await p.locator('#nav-journals').click(); await p.waitForTimeout(250);
      const n=(await p.locator('#journals-body tr').count());
      const hasNew=(await txt('#journals-body')).includes('SYN-TXNRECON-12345678');
      await p.locator('#nav-txnrecon').click(); await p.waitForTimeout(200);
      await p.locator('#open-je-list').click(); await p.waitForTimeout(250);
      return n===5 && hasNew;})());
    ok('new entry is first', (await txt('#jel-body tr:first-child')).includes('SYN-TXNRECON-12345678'));
    await p.locator('#jel-body tr:first-child .kebab').click(); await p.waitForTimeout(150);
    ok('drawer menu View reconciliation is hittable, not just visible', await hittable('#rowmenu [data-je="recon"]'));
    ok('drawer menu View in books is hittable', await hittable('#rowmenu [data-je="books"]'));
    await p.locator('#rowmenu [data-je="recon"]').click(); await p.waitForTimeout(300);
    ok('View reconciliation opens the recon on its Journal entry tab',
       await vis('#screen-results') && (await p.locator('.tab[data-tab="je"]').getAttribute('aria-selected'))==='true');
    ok('JE tab lists the entry', (await txt('#je-body')).includes('SYN-TXNRECON-12345678'));

    /* ---- delete ---- */
    await p.locator('#je-kebab').click(); await p.waitForTimeout(150);
    ok('View in books on the JE tab is hittable (FDD S5.4)', await hittable('#rowmenu [data-je="books"]'));
    await p.locator('#rowmenu [data-je="del"]').click(); await p.waitForTimeout(250);
    ok('delete copy matches the frame', (await txt('#modal-body')).includes('The journal entry will be deleted from your books and Synder. The reconciliation it belongs to will refresh. This cannot be undone.'));
    await p.locator('#modal-actions .btn.danger').click(); await p.waitForTimeout(300);
    ok('rows return to Missing in accounting', (await p.locator('#miss-body tr').count())===8);
    ok('Journal entry tab hidden again', !(await p.locator('#tab-je').isVisible()));
    await p.locator('#back-to-list').click(); await p.waitForTimeout(200);
    await p.locator('#open-je-list').click(); await p.waitForTimeout(250);
    ok('deleted entry gone from the drawer', (await p.locator('#jel-body tr').count())===2);

    /* ---- empty state through real use ---- */
    for (let i=0;i<2;i++){
      await p.locator('#jel-body tr:first-child .kebab').click(); await p.waitForTimeout(150);
      await p.locator('#rowmenu [data-je="del"]').click(); await p.waitForTimeout(200);
      await p.locator('#modal-actions .btn.danger').click(); await p.waitForTimeout(250);
    }
    ok('empty state reached by deleting everything', await vis('#jel-empty'));
    ok('empty copy matches the frame', (await txt('#jel-empty'))==='No journal entries here yet');

    ok('no horizontal overflow', await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));
    ok('no JS errors', errs.length===0, errs.join('; '));
    await p.close();
  }
  console.log('\n'+pass+' passed · '+fail+' failed');
  await b.close();
  process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
