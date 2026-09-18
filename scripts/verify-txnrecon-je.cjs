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
    const active=()=>p.evaluate(()=>{const a=document.activeElement;return a?a.tagName.toLowerCase()+(a.id?'#'+a.id:'')+(typeof a.className==='string'&&a.className?'.'+a.className.trim().split(/\s+/)[0]:''):'none';});

    // switcher contract
    ok('switcher first child of body', await p.evaluate(()=>document.body.firstElementChild.className==='variant-switch'));
    ok('switcher full width', await p.locator('.variant-switch').evaluate((e,w)=>Math.abs(e.getBoundingClientRect().width-w)<2, vp.width));
    ok('no intro screen — results page visible', await vis('#panel-miss'));
    ok('Missing source tab selected by default', (await p.locator('.tab[data-tab="miss"]').getAttribute('aria-selected'))==='true');
    ok('both side tables render', (await p.locator('.cols .col').count())===2);
    ok('8 open rows', (await p.locator('#miss-body tr').count())===8);
    ok('Journal entry tab hidden before a JE exists', !(await p.locator('#tab-je').isVisible()));

    // per-row menu: ineligible shows the reason
    await p.locator('#miss-body tr[data-row="r3"] .kebab').click(); await p.waitForTimeout(150);
    ok('row menu opens', await vis('#rowmenu'));
    ok('Create journal entry disabled for missing IDs', await p.locator('#rowmenu .mi[disabled]').isVisible());
    ok('the reason is stated, not just disabled', (await txt('#rowmenu .why')).includes('primary and secondary IDs are missing'));
    await p.keyboard.press('Escape'); await p.waitForTimeout(150);
    ok('Escape closes the menu', !(await p.locator('#rowmenu').isVisible()));
    ok('focus returns to the kebab on Escape', (await active()).includes('kebab'), await active());

    // currency reason
    await p.locator('#miss-body tr[data-row="r4"] .kebab').click(); await p.waitForTimeout(150);
    ok('currency reason stated', (await txt('#rowmenu .why')).includes("currency doesn't match account currency (USD)"));
    await p.keyboard.press('Escape');

    // all-blocked modal
    await p.locator('#miss-body tr[data-row="r3"] input[data-sel]').check();
    await p.locator('#miss-body tr[data-row="r4"] input[data-sel]').check();
    await p.waitForTimeout(120);
    ok('bulk bar appears', await vis('#bulk'));
    ok('bulk count correct', (await txt('#bulk-count'))==='2 selected');
    await p.locator('#bulk-create').click(); await p.waitForTimeout(200);
    ok('all-blocked modal shown', (await txt('#modal-title'))==='No transactions can be added');
    ok('all-blocked lists both reasons', (await txt('#modal-body')).includes('Primary and secondary IDs are missing') && (await txt('#modal-body')).includes("Currency doesn't match"));
    ok('modal takes focus', await p.evaluate(()=>document.getElementById('modal').contains(document.activeElement)));
    await p.locator('#modal-actions .btn').click(); await p.waitForTimeout(150);
    ok('modal closes', !(await p.locator('#modal-scrim').isVisible()));

    // partial-block modal
    await p.locator('#sel-all').check(); await p.waitForTimeout(200);
    await p.locator('#bulk-create').click(); await p.waitForTimeout(200);
    ok('partial-block modal shown', (await txt('#modal-title')).includes("Some transactions can"));
    ok('partial-block names the remaining count', (await txt('#modal-body')).includes('Proceed with the remaining 5 transactions?'));
    await p.locator('#modal-actions .btn.primary').click(); await p.waitForTimeout(300);

    // side sheet
    ok('side sheet opens', await vis('#je-sheet'));
    ok('sheet title', (await txt('#je-sheet-title'))==='Journal entry details');
    ok('post CTA reads Post to books', (await txt('#je-post'))==='Post to books');
    ok('journal entry number is read-only', await p.locator('#je-num').evaluate(e=>e.readOnly));
    ok('currency locked', await p.locator('#je-cur').evaluate(e=>e.disabled));
    ok('date constrained to the period', await p.locator('#je-date').evaluate(e=>e.min==='2025-03-20'&&e.max==='2025-03-23'));
    ok('one-JE notice present', (await txt('#je-sheet .oneje')).includes('Only one journal entry can be created per reconciliation'));
    ok('5 locked clearing lines + 1 income line', (await p.locator('#lines-body tr').count())===6);
    ok('clearing description is the token string', (await p.locator('#lines-body tr:first-child input[readonly]').nth(1).inputValue()).startsWith('date:2024-03-15 p_id:ch_'));
    ok('a row with no date omits the date token', await p.evaluate(()=>{
      const v=[...document.querySelectorAll('#lines-body tr')].map(r=>r.querySelectorAll('input[readonly]')[1]).filter(Boolean).map(i=>i.value);
      return v.some(x=>x&&!x.includes('date:')&&x.includes('p_id:'));
    }));
    ok('memo prefilled with the Figma copy', (await p.locator('#je-memo').inputValue())==="Balancing journal entry created from Synder's Transaction Reconciliation");
    ok('balanced on open', (await p.locator('#je-totals').getAttribute('class')).includes('ok'));
    ok('Post enabled when balanced', !(await p.locator('#je-post').isDisabled()));
    ok('totals read 260.00', (await txt('#tot-d'))==='260.00 USD' && (await txt('#tot-c'))==='260.00 USD');

    // unbalance it
    const inc=p.locator('#lines-body tr:last-child input[data-f="credit"]');
    await inc.fill('200'); await p.waitForTimeout(200);
    ok('unbalanced turns the totals box red', (await p.locator('#je-totals').getAttribute('class')).includes('bad'));
    ok('out-of-balance amount is named', (await txt('#je-oob')).includes('Out of balance by 60.00 USD'));
    ok('out-of-balance message is visible, not just disabled', await vis('#je-oob'));
    ok('Post disabled while out of balance', await p.locator('#je-post').isDisabled());
    await inc.fill('260'); await p.waitForTimeout(200);
    ok('rebalancing re-enables Post', !(await p.locator('#je-post').isDisabled()));

    // add/remove a line, twice
    await p.locator('#add-line').click(); await p.waitForTimeout(150);
    ok('Add line adds an editable row', (await p.locator('#lines-body tr').count())===7);
    ok('added line is not locked', await p.locator('#lines-body tr:last-child select[data-f="account"]').isVisible());
    await p.locator('#lines-body [data-rm]').last().click(); await p.waitForTimeout(150);
    ok('line removed', (await p.locator('#lines-body tr').count())===6);
    await p.locator('#add-line').click(); await p.waitForTimeout(150);
    ok('Add line still works a second time', (await p.locator('#lines-body tr').count())===7);
    ok('Add line still visible and clickable', await p.locator('#add-line').isVisible());
    await p.locator('#lines-body [data-rm]').last().click(); await p.waitForTimeout(150);

    // post
    await p.locator('#je-post').click(); await p.waitForTimeout(400);
    ok('sheet closes on post', !(await p.locator('#je-sheet').isVisible()));
    ok('first toast is the sent toast', (await txt('.toast')).includes('Journal entry sent to your books.'));
    await p.waitForTimeout(1300);
    const toasts=(await p.locator('.toast').allInnerTexts()).join(' | ');
    ok('second toast names rows moved', /Journal entry created in your books\. 5 rows moved to Matched\./.test(toasts), toasts);
    ok('rows left Missing in accounting', (await p.locator('#miss-body tr').count())===3);
    ok('Missing source count updated', (await txt('#c-miss'))==='3');
    ok('Journal entry tab now visible', await p.locator('#tab-je').isVisible());

    // matched tab carries the DocNumber
    await p.locator('.tab[data-tab="matched"]').click(); await p.waitForTimeout(200);
    ok('matched rows show the journal entry number in Description', (await txt('#matched-body')).includes('SYN-TXNRECON-12345678'));
    ok('matched count incremented', (await txt('#c-matched'))==='100,005');

    // one-JE modal
    await p.locator('.tab[data-tab="miss"]').click(); await p.waitForTimeout(150);
    ok('only ineligible rows remain after the post', (await p.locator('#miss-body tr.inelig').count())===3);
    await p.locator('#miss-body tr:first-child input[data-sel]').check(); await p.waitForTimeout(120);
    await p.locator('#bulk-create').click(); await p.waitForTimeout(250);
    ok('one-JE modal shown', (await txt('#modal-title'))==='You can have only one journal entry per reconciliation');
    ok('one-JE body matches Figma copy', (await txt('#modal-body')).includes('delete the existing entry first and create a new one'));
    await p.locator('#modal-actions .btn').click(); await p.waitForTimeout(150);

    // JE tab + delete
    await p.locator('.tab[data-tab="je"]').click(); await p.waitForTimeout(200);
    ok('JE tab lists the entry', (await txt('#je-body')).includes('SYN-TXNRECON-12345678'));
    ok('Net on account column present', (await txt('#panel-je th.num'))==='Net on account');
    await p.locator('#je-kebab').click(); await p.waitForTimeout(150);
    ok('View in books offered (FDD S5.4)', await p.locator('#rowmenu [data-je="books"]').isVisible());
    await p.locator('#rowmenu [data-je="del"]').click(); await p.waitForTimeout(250);
    ok('delete confirm uses the Figma copy', (await txt('#modal-body')).includes('The journal entry will be deleted from your books and Synder. The reconciliation it belongs to will refresh. This cannot be undone.'));
    await p.locator('#modal-actions .btn.danger').click(); await p.waitForTimeout(300);
    ok('rows return to Missing in accounting after delete', (await p.locator('#miss-body tr').count())===8);
    ok('Journal entry tab hidden again', !(await p.locator('#tab-je').isVisible()));

    // variant 2
    await p.locator('#vs-2').click(); await p.waitForTimeout(250);
    ok('variant 2 shows', await vis('#variant-2'));
    ok('journal entries drawer visible', await vis('#v2-sheet'));
    ok('drawer explains itself', (await txt('#v2-sheet .oneje')).includes('created to balance missing transactions'));
    ok('5 entries listed', (await p.locator('#v2-body tr').count())===5);
    await p.locator('#v2-toggle-empty').click(); await p.waitForTimeout(200);
    ok('empty state shows', await vis('#v2-empty'));
    ok('empty copy matches Figma', (await txt('#v2-empty'))==='No journal entries here yet');
    await p.locator('#v2-toggle-empty').click(); await p.waitForTimeout(200);
    ok('toggles back a second time', (await p.locator('#v2-body tr').count())===5);
    await p.locator('#vs-1').click(); await p.waitForTimeout(200);
    ok('switches back in place', await vis('#variant-1'));

    ok('no horizontal overflow', await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));
    ok('no JS errors', errs.length===0, errs.join('; '));
    await p.close();
  }
  console.log('\n'+pass+' passed · '+fail+' failed');
  await b.close();
  process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
