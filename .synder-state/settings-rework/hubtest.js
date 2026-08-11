const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: 1100, height: 1000 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const R = '/home/ubuntu/synder-prototypes';

  // old hub: every link must resolve to a file that exists
  await p.goto('file://' + R + '/manage-subscription/index.html');
  await p.waitForTimeout(500);
  const links = await p.$$eval('a.item', as => as.map(a => a.getAttribute('href')));
  console.log('old hub items:', links.length);
  const fs = require('fs');
  let bad = 0;
  for (const h of links) {
    const abs = path.resolve(R + '/manage-subscription', h);
    const target = abs.endsWith('/') ? abs + 'index.html' : abs;
    const ok = fs.existsSync(target);
    if (!ok) { console.log('  BROKEN:', h, '->', target); bad++; }
  }
  console.log('broken links:', bad);
  console.log('title:', await p.locator('.page-title').innerText());
  console.log('subtitle:', await p.locator('.page-sub').innerText());
  console.log('sections:', (await p.$$eval('.section-label', e => e.map(x => x.textContent))).join(' | '));
  await p.screenshot({ path: '.synder-state/settings-rework/hub-old.png', fullPage: true });

  // new hub back-link must resolve
  await p.goto('file://' + R + '/projects/settings-rework/index.html');
  await p.waitForTimeout(500);
  const backs = await p.$$eval('a[href*="manage-subscription"]', as => as.map(a => a.getAttribute('href')));
  console.log('\nnew hub back-links:', backs.length, backs.join(', '));
  for (const h of backs) {
    const abs = path.resolve(R + '/projects/settings-rework', h);
    const target = abs.endsWith('/') ? abs + 'index.html' : abs;
    console.log('  ', h, fs.existsSync(target) ? 'OK' : 'BROKEN -> ' + target);
  }
  console.log('errors:', errs.length ? errs : 'none');
  await b.close();
})();
