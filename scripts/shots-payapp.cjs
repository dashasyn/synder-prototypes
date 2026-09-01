const { chromium } = require('playwright');
const path='/home/ubuntu/.openclaw/workspace/projects/payment-application-engine/';
(async()=>{
  const b=await chromium.launch();
  const p=await b.newPage({viewport:{width:1440,height:1100}});
  await p.goto('file://'+path+'index.html');
  await p.click('#g-open'); await p.click('#c-engine');
  await p.click('#c-add');
  await p.selectOption('#cs-1','payment_meta'); await p.fill('#ck-1','order_id');
  await p.selectOption('#co-1','contains'); await p.selectOption('#ct-1','doc_number');
  await p.locator('.ov-b').evaluate(e=>e.scrollTop=0);
  await p.screenshot({path:path+'shot-scope.png', clip:{x:0,y:0,width:1440,height:1100}});
  // simulator
  const d=p.locator('#d-sim'); await d.locator('summary').click();
  await d.scrollIntoViewIfNeeded(); await p.waitForTimeout(150);
  await p.screenshot({path:path+'shot-sim.png'});
  await b.close();
})();
