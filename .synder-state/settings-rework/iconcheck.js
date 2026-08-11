const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: 1400, height: 950 }, deviceScaleFactor: 2 })).newPage();
  await p.goto('file://' + path.resolve('projects/settings-rework/organization.html'));
  await p.waitForTimeout(900);
  const bad = await p.evaluate(() => {
    const out = [];
    document.querySelectorAll('.gi, .ic, .ai').forEach(e => {
      const t = e.textContent.trim();
      if (/[\u{1F300}-\u{1FAFF}\u{FE0F}]/u.test(t)) out.push(t);
    });
    return out;
  });
  console.log('emoji-range glyphs still present:', bad.length ? bad.join(' ') : 'none');
  await p.click('#tabs button[data-t="addons"]'); await p.waitForTimeout(500);
  await p.screenshot({ path: '.synder-state/settings-rework/org/n2-addons.png', fullPage: true });
  await p.click('#tabs button[data-t="billing"]'); await p.waitForTimeout(400);
  await p.screenshot({ path: '.synder-state/settings-rework/org/n1-billing.png', fullPage: true });
  await b.close();
})();
