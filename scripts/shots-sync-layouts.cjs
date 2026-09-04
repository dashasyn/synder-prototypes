const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 1100 } });
  await p.goto('file://' + path.resolve('reports/sync-details-layouts/index.html'), { waitUntil: 'networkidle' });
  for (const [l, s, name] of [['1','deleted','l1-deleted'],['2','deleted','l2-deleted'],
                              ['3','deleted','l3-deleted'],['2','warnings','l2-warnings']]) {
    await p.click(`[data-layout="${l}"]`); await p.click(`[data-state="${s}"]`);
    await p.waitForTimeout(250);
    await p.screenshot({ path: `/tmp/${name}.png`, fullPage: true });
  }
  await b.close();
})();
