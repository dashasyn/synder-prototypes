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
    ok('8 reconciliation rows', (await p.locator('#list-body tr').count())===8);
    ok('status chips render all three values', await p.evaluate(()=>{
      const s=[...document.querySelectorAll('#list-body .st')].map(e=>e.textContent.trim());
      return s.includes('Reconciled')&&s.includes('Not reconciled')&&s.includes('N/A');}));
    ok('no horizontal overflow on the list', await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));

    /* ---- row opens the preview ---- */
    await p.locator('#list-body tr[data-rc="rc2"]').click(); await p.waitForTimeout(250);
    ok('row click opens the reconciliation preview', await vis('#screen-results'));
    ok('list hidden while previewing', !(await p.locator('#screen-list').isVisible()));
    ok('preview header reflects the clicked row', (await txt('#r-sub')).includes('Mar 20, 2025 – Mar 23, 2025'));
    ok('Missing source tab selected', (await p.locator('.tab[data-tab="miss"]').getAttribute('aria-selected'))==='true');
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
    await p.locator('#nav-je').click(); await p.waitForTimeout(200);
    ok('sidebar Journal entries opens it too', await vis('#jel-sheet'));
    await p.locator('#jel-close').click(); await p.waitForTimeout(200);

    /* ---- create flow ---- */
    await p.locator('#list-body tr[data-rc="rc2"]').click(); await p.waitForTimeout(250);
    await p.locator('#miss-body tr[data-row="r3"] .kebab').click(); await p.waitForTimeout(150);
    ok('ineligible row: Create journal entry disabled', await p.locator('#rowmenu .mi[disabled]').isVisible());
    ok('row menu is hittable on the results page', await hittable('#rowmenu .mi'));
    ok('reason stated in the menu', (await txt('#rowmenu .why')).includes('primary and secondary IDs are missing'));
    await p.keyboard.press('Escape'); await p.waitForTimeout(150);
    ok('focus returns to kebab', (await active()).includes('kebab'));

    await p.locator('#sel-all').check(); await p.waitForTimeout(200);
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
    ok('sent toast', (await txt('.toast')).includes('Journal entry sent to your books.'));
    await p.waitForTimeout(1300);
    ok('created+matched toast', /5 rows moved to Matched\./.test((await p.locator('.toast').allInnerTexts()).join(' | ')));
    ok('rows left Missing in accounting', (await p.locator('#miss-body tr').count())===3);
    ok('Journal entry tab appears', await p.locator('#tab-je').isVisible());
    await p.locator('.tab[data-tab="matched"]').click(); await p.waitForTimeout(200);
    ok('DocNumber in Matched Description', (await txt('#matched-body')).includes('SYN-TXNRECON-12345678'));
    ok('matched count incremented', (await txt('#c-matched'))==='100,005');

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
