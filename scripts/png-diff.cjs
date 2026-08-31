/* Pixel-diff two screenshot directories using Chromium's own canvas.
   Usage: node scripts/png-diff.cjs <dirA> <dirB> [outDir]
   Reports the share of pixels that changed and writes a red-highlight diff. */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const [dirA, dirB, outDir = '/tmp/txn-diff'] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });

const names = fs.readdirSync(dirA).filter(f => f.endsWith('.png'));

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('about:blank');

  for (const name of names) {
    const a = 'data:image/png;base64,' + fs.readFileSync(path.join(dirA, name)).toString('base64');
    const bPath = path.join(dirB, name);
    if (!fs.existsSync(bPath)) { console.log(`${name}: MISSING in B`); continue; }
    const b = 'data:image/png;base64,' + fs.readFileSync(bPath).toString('base64');

    const res = await page.evaluate(async ([a, b]) => {
      const load = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = src; });
      const [ia, ib] = await Promise.all([load(a), load(b)]);
      const w = Math.max(ia.width, ib.width), h = Math.max(ia.height, ib.height);
      const mk = img => { const c = document.createElement('canvas'); c.width = w; c.height = h;
        const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.drawImage(img, 0, 0);
        return x.getImageData(0, 0, w, h); };
      const da = mk(ia), db = mk(ib);
      const out = document.createElement('canvas'); out.width = w; out.height = h;
      const ox = out.getContext('2d');
      const od = ox.createImageData(w, h);
      let changed = 0;
      for (let i = 0; i < da.data.length; i += 4) {
        const d = Math.abs(da.data[i] - db.data[i]) + Math.abs(da.data[i+1] - db.data[i+1]) + Math.abs(da.data[i+2] - db.data[i+2]);
        if (d > 24) {
          changed++;
          od.data[i] = 255; od.data[i+1] = 0; od.data[i+2] = 0; od.data[i+3] = 255;
        } else {
          const g = 235;
          od.data[i] = g; od.data[i+1] = g; od.data[i+2] = g; od.data[i+3] = 255;
        }
      }
      ox.putImageData(od, 0, 0);
      return { w, h, changed, total: w * h, sizeMatch: ia.width === ib.width && ia.height === ib.height,
               dataUrl: out.toDataURL('image/png') };
    }, [a, b]);

    fs.writeFileSync(path.join(outDir, name.replace('.png', '-diff.png')),
      Buffer.from(res.dataUrl.split(',')[1], 'base64'));
    const pct = (res.changed / res.total * 100).toFixed(2);
    console.log(`${name.padEnd(18)} ${pct.padStart(6)}% pixels changed   ${res.sizeMatch ? '' : '(SIZE CHANGED)'}`);
  }
  await browser.close();
})();
