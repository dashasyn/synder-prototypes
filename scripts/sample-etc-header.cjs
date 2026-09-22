#!/usr/bin/env node
/**
 * sample-etc-header.cjs — measure ETC's real page headers from screenshots.
 *
 * Ignat, 2026-09-22: "page header size / paddings and margins / breadcrumbs /
 * button sizes and positions ... In your current version headers are very wide
 * and take a lot of space."
 *
 * Same method as scripts/sample-etc-screenshots.cjs on 2026-09-14: read the
 * pixels rather than eyeball the picture. Rows are classified by how much
 * non-background ink they carry, which gives the vertical rhythm; columns of
 * the accent-blue button give its box.
 */
const sharp = require('sharp');

const near = (p, c, tol = 26) =>
  Math.abs(p[0] - c[0]) <= tol && Math.abs(p[1] - c[1]) <= tol && Math.abs(p[2] - c[2]) <= tol;

(async () => {
  for (const file of process.argv.slice(2)) {
    const img = sharp(file);
    const { width, height } = await img.metadata();
    const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
    const ch = info.channels;
    const at = (x, y) => { const i = (y * info.width + x) * ch; return [data[i], data[i + 1], data[i + 2]]; };

    // background = the most common colour in the right-hand third, below the bar
    const tally = new Map();
    for (let y = 40; y < height; y += 2)
      for (let x = Math.floor(width * 0.55); x < width - 4; x += 2) {
        const k = at(x, y).join(','); tally.set(k, (tally.get(k) || 0) + 1);
      }
    const bg = [...tally.entries()].sort((a, b) => b[1] - a[1])[0][0].split(',').map(Number);

    // ink profile per row (ignoring the far-right chrome)
    const ink = [];
    for (let y = 0; y < height; y++) {
      let n = 0;
      for (let x = 24; x < width - 24; x++) if (!near(at(x, y), bg, 18)) n++;
      ink.push(n);
    }
    // bands of consecutive inked rows
    const bands = [];
    let start = null;
    for (let y = 0; y < height; y++) {
      const on = ink[y] > 4;
      if (on && start === null) start = y;
      if (!on && start !== null) { bands.push([start, y - 1]); start = null; }
    }
    if (start !== null) bands.push([start, height - 1]);

    // the accent button: find the bluest run
    let btn = null;
    for (let y = 0; y < height; y++) {
      for (let x = width - 1; x > width * 0.6; x--) {
        const p = at(x, y);
        if (p[2] > 150 && p[2] - p[0] > 60 && p[1] < p[2]) {
          if (!btn) btn = { x0: x, x1: x, y0: y, y1: y };
          btn.x0 = Math.min(btn.x0, x); btn.x1 = Math.max(btn.x1, x);
          btn.y0 = Math.min(btn.y0, y); btn.y1 = Math.max(btn.y1, y);
        }
      }
    }
    // leftmost ink per band = the gutter
    const leftOf = ([a, b]) => {
      for (let x = 0; x < width; x++)
        for (let y = a; y <= b; y++) if (!near(at(x, y), bg, 18)) return x;
      return -1;
    };

    console.log(`\n=== ${file.split('/').pop()}  ${width}x${height} ===`);
    console.log('background', bg.join(','));
    bands.forEach(([a, b]) => {
      console.log(`  band y ${String(a).padStart(3)}–${String(b).padStart(3)}  h=${String(b - a + 1).padStart(3)}  left=${leftOf([a, b])}  peakInk=${Math.max(...ink.slice(a, b + 1))}`);
    });
    if (btn) console.log(`  accent button  x ${btn.x0}–${btn.x1} (w=${btn.x1 - btn.x0 + 1})  y ${btn.y0}–${btn.y1} (h=${btn.y1 - btn.y0 + 1})  rightGap=${width - 1 - btn.x1}`);
  }
})();
