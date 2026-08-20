const { chromium } = require('/home/ubuntu/.openclaw/workspace/node_modules/playwright');
const FILE='file:///home/ubuntu/.openclaw/workspace/filtering-options/index.html';
let pass=0,fail=0;
const ok=(n,c,x)=>{if(c){pass++;console.log('  ok   '+n)}else{fail++;console.log('  FAIL '+n+(x!==undefined?'  -> '+x:''))}};
(async()=>{
  const b=await chromium.launch();
  const p=await b.newPage({viewport:{width:1340,height:1100}});
  await p.goto(FILE);
  await p.addStyleTag({content:'.page-header{position:static !important}'});
  // Apply must be inside the panel's own visible scrollport, not merely in the DOM.
  const inView = async (panel, btn) => p.evaluate(([ps,bs])=>{
    const pa=document.querySelector(ps), bt=document.querySelector(bs);
    const pr=pa.getBoundingClientRect(), br=bt.getBoundingClientRect();
    return br.bottom <= pr.bottom + 1 && br.top >= pr.top - 1;
  },[panel,btn]);

  await p.click('.nav-tab[data-variant="groups"]');
  await p.click('#groupsSub [data-sub-trigger]');
  ok('V8 All-tab dropdown: Apply inside the visible panel (8 options)',
     await inView('#groupsSub [data-sub-panel]','#groupsSub [data-sub-apply]'));
  await p.locator('#variant-groups .mock-page').screenshot({path:'/tmp/v8g-footer.png'});
  await p.keyboard.press('Escape');

  // the same component in variant 6 (customer = 9 options, single-select + Apply)
  await p.click('.nav-tab[data-variant="rec"]');
  await p.click('#recFilterBar [data-rec-add]');
  await p.click('#recFilterBar [data-rec-add-key="customer"]');
  ok('V6 customer dropdown: Apply inside the visible panel (9 options)',
     await inView('#recFilterBar [data-field-key="customer"] [data-field-panel]',
                  '#recFilterBar [data-field-key="customer"] [data-panel-apply]'));
  console.log('\n'+pass+' passed, '+fail+' failed');
  await b.close();
  process.exit(fail?1:0);
})();
