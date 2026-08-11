const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: 1440, height: 950 } })).newPage();
  for (const f of ['projects/settings-rework/proto-a.html','projects/settings-rework/manage-subscription-v2.html','manage-subscription/concepts-v1v2v3.html','reports/manage-subscription/v1-unified.html']) {
    await p.goto('file:///home/ubuntu/synder-prototypes/' + f);
    await p.waitForTimeout(900);
    const r = await p.evaluate(() => {
      const bad = {}; const off = {};
      const PAL = new Set(['#0053cc','#0047b3','#80a9e5','#ccddf5','#e0ebfd','#f2f6fc','#e8f0fc','#ffffff','#f7f8fa','#eff1f5','#dfe4ec','#b4bbcb','#6b778c','#1a1b24','#1a1a2e','#1f8940','#ecfddc','#cc2929','#ffece8','#cb7515','#fff1dd','#3c4eac','#d6ebff','#310bb0','#e2d7ff','#f9fafb','#e5e7eb','#6b7280','#9ca3af','#dc2626','#d97706','#16a34a','#c8c7cc','#dddddd','#f6f6f6','#000000']);
      const norm = c => { const m = (c||'').match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/); return m ? '#'+[1,2,3].map(i=>(+m[i]).toString(16).padStart(2,'0')).join('') : (c||'').toLowerCase(); };
      for (const el of Array.from(document.querySelectorAll('*')).slice(0,2500)) {
        const s = getComputedStyle(el);
        const fam = (s.fontFamily||'').split(',')[0].replace(/["']/g,'').trim();
        if (fam && !/^(Roboto|ui-monospace|monospace)$/i.test(fam)) {
          const k = fam + ' :: <' + el.tagName.toLowerCase() + (el.className? '.'+String(el.className).split(' ')[0]:'') + '>';
          bad[k] = (bad[k]||0)+1;
        }
        for (const c of [s.color, s.backgroundColor, s.borderTopColor]) {
          const n = norm(c);
          if (n && n !== '#000000' && !PAL.has(n) && !/rgba\(0, 0, 0, 0\)/.test(c)) {
            const k = n + ' :: <' + el.tagName.toLowerCase() + (el.className? '.'+String(el.className).split(' ')[0]:'') + '>';
            off[k] = (off[k]||0)+1;
          }
        }
      }
      return { bad: Object.entries(bad).sort((a,b)=>b[1]-a[1]).slice(0,6), off: Object.entries(off).sort((a,b)=>b[1]-a[1]).slice(0,8) };
    });
    console.log('\n### ' + f);
    console.log(' non-Roboto:', r.bad.map(x=>x[0]+' ×'+x[1]).join('  |  ') || 'none');
    console.log(' off-palette:', r.off.map(x=>x[0]+' ×'+x[1]).join('  |  ') || 'none');
  }
  await b.close();
})();
