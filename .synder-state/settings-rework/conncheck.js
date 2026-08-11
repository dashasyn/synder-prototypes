const { chromium } = require('playwright');
const path = require('path');
const O = '.synder-state/settings-rework/org';
(async () => {
  const b = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: 1400, height: 950 }, deviceScaleFactor: 2 })).newPage();
  const errs = []; p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  p.on('console', m => { if (m.type()==='error') errs.push('CONSOLE ' + m.text()); });
  await p.goto('file://' + path.resolve('projects/settings-rework/organization.html'));
  await p.waitForTimeout(900);
  const T = s => p.locator(s).first().innerText().catch(()=>'?');

  await p.click('#tabs button[data-t="conn"]'); await p.waitForTimeout(600);
  console.log('accounting headers:', (await p.locator('#acctTable th').allInnerTexts()).filter(Boolean).join(' | '));
  console.log('integration headers:', (await p.locator('#integTable th').allInnerTexts()).filter(Boolean).join(' | '));
  console.log('integration rows:', await p.locator('#integTable tbody tr:not(.cfoot)').count());
  const rows = await p.locator('#integTable tbody tr:not(.cfoot)').allInnerTexts();
  rows.forEach((r,i) => console.log('  row' + (i+1) + ':', r.replace(/\s+/g,' ').trim()));
  console.log('broken row tinted amber:', await p.evaluate(() => {
    const tr = document.querySelector('#integTable tr.warn');
    return tr ? getComputedStyle(tr.querySelector('td')).backgroundColor : 'none'; }));
  console.log('cards gone:', await p.locator('.conn, .addconn').count() === 0);
  await p.screenshot({ path: `${O}/d1-connections.png`, fullPage: true });

  // RevRec toggle per integration
  await p.click('#integTable tbody tr:nth-child(3) a:has-text("enable")'); await p.waitForTimeout(500);
  console.log('\nafter enabling RevRec on Amazon:', (await p.locator('#integTable tbody tr').nth(2).innerText()).replace(/\s+/g,' ').slice(0,80));

  // reconnect the broken one
  await p.click('#integTable tr.warn button:has-text("Reconnect")'); await p.waitForTimeout(600);
  console.log('rows still 3:', await p.locator('#integTable tbody tr:not(.cfoot)').count() === 3);
  console.log('amber rows left:', await p.locator('#integTable tr.warn').count());
  await p.click('#tabs button[data-t="billing"]'); await p.waitForTimeout(400);
  const attn = await p.locator('#attn').innerText().catch(()=>'');
  console.log('banner after reconnect:', attn.trim() ? attn.split('\n')[0] : '(only QuickBooks left / empty)');
  await p.screenshot({ path: `${O}/d2-after-reconnect.png`, fullPage: true });

  // accounting reconnect
  await p.click('#tabs button[data-t="conn"]'); await p.waitForTimeout(400);
  await p.click('#acctTable button:has-text("Reconnect")'); await p.waitForTimeout(600);
  console.log('accounting row now:', (await p.locator('#acctTable tbody tr').first().innerText()).replace(/\s+/g,' ').slice(0,90));
  await p.screenshot({ path: `${O}/d3-all-connected.png`, fullPage: true });
  console.log('\nerrors:', errs.length ? errs.join('\n') : 'none');
  await b.close();
})();
