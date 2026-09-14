#!/usr/bin/env node
/**
 * Samples the real ETC/ITCS screenshots Ignat sent (2026-09-14) so the
 * Q-Explorer MUI restyle uses measured values, not eyeballed ones.
 *
 * Prints a dominant-colour report per named region plus the modal row
 * pitch of the tables, which is what tells us small vs medium density.
 */
const sharp = require('sharp');
const path = require('path');

const DIR = path.resolve(__dirname,
  '../media/inbound/openclaw-staged-70cf2361-379a-446d-9954-6bde4ac838e1');

const SHOTS = {
  events:   'input-2cdfde5b-7ba3-4330-aa9a-e9a0e23144f7.jpg',
  journeys: 'input-414aef02-b65b-4387-9842-95892a8b3bf9.jpg',
  device:   'input-8b605eca-6d0c-4cf5-a447-79aea0aeafe5.jpg',
};

const hex = (r, g, b) => '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();

async function dominant(file, left, top, width, height) {
  const { data, info } = await sharp(path.join(DIR, file))
    .extract({ left, top, width, height })
    .raw().toBuffer({ resolveWithObject: true });
  const counts = new Map();
  for (let i = 0; i < data.length; i += info.channels) {
    // quantise to kill JPEG noise
    const k = `${data[i] >> 2 << 2},${data[i + 1] >> 2 << 2},${data[i + 2] >> 2 << 2}`;
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  const sorted = [...counts].sort((a, b) => b[1] - a[1]);
  const total = sorted.reduce((s, [, n]) => s + n, 0);
  return sorted.slice(0, 3).map(([k, n]) => {
    const [r, g, b] = k.split(',').map(Number);
    return { hex: hex(r, g, b), pct: Math.round(n / total * 100) };
  });
}

/** Row pitch: scan a vertical strip, find y positions of horizontal rules. */
async function rowPitch(file, x, yFrom, yTo) {
  const img = sharp(path.join(DIR, file));
  const { width } = await img.metadata();
  const { data, info } = await sharp(path.join(DIR, file))
    .extract({ left: x, top: yFrom, width: 1, height: yTo - yFrom })
    .raw().toBuffer({ resolveWithObject: true });
  const lum = [];
  for (let i = 0; i < data.length; i += info.channels) {
    lum.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
  }
  const lines = [];
  for (let i = 1; i < lum.length - 1; i++) {
    if (lum[i] < 242 && lum[i] < lum[i - 1] && lum[i] <= lum[i + 1]) {
      if (!lines.length || i - lines[lines.length - 1] > 6) lines.push(i);
    }
  }
  const gaps = lines.slice(1).map((v, i) => v - lines[i]).filter(g => g > 10 && g < 90);
  gaps.sort((a, b) => a - b);
  return { lines: lines.length, medianGap: gaps.length ? gaps[gaps.length >> 1] : null, gaps: gaps.slice(0, 12), imgWidth: width };
}

(async () => {
  const regions = [
    ['events',   'AppBar (navy)',            300,   4, 200,  20],
    ['events',   'page background',           640, 690, 300,   8],
    ['events',   'ADD EVENT button',         1105,  52,  60,  14],
    ['events',   'filled field fill',         360,  62, 120,  10],
    ['events',   'table header band',         600,  92, 200,  10],
    ['events',   'chip Expired',              872, 128,  28,   9],
    ['events',   'chip Finished',             874, 474,  26,   9],
    ['events',   'notification pill',        1076,   9,  22,  12],
    ['device',   'card surface',              600, 120, 200,  10],
    ['device',   'area outside card',          20, 450, 300,  10],
    ['device',   'SAVE button',              1146,  62,  22,  12],
    ['device',   'COPY DEVICE URL outline',  1020,  61,   4,  14],
    ['device',   'disabled field fill',       120, 366, 180,  10],
    ['device',   'enabled field fill',        120, 143, 180,  10],
    ['journeys', 'listbox surface',           380, 200, 120,  10],
  ];

  // Regions were read off the 1200x688 render; the files are 1280x734.
  const S = 1280 / 1200;
  const sc = v => Math.round(v * S);

  console.log('=== Sampled colours (top 3 per region) ===');
  for (const [shot, name, l0, t0, w0, h0] of regions) {
    const [l, t, w, h] = [sc(l0), sc(t0), sc(w0), sc(h0)];
    try {
      const d = await dominant(SHOTS[shot], l, t, w, h);
      console.log(`${name.padEnd(26)} ${d.map(x => `${x.hex} ${x.pct}%`).join('  ')}`);
    } catch (e) {
      console.log(`${name.padEnd(26)} (out of bounds: ${e.message.slice(0, 40)})`);
    }
  }

  console.log('\n=== Table row pitch ===');
  for (const [shot, x, a, b] of [['events', 700, 110, 640], ['journeys', 700, 110, 630]]) {
    const r = await rowPitch(SHOTS[shot], sc(x), sc(a), sc(b));
    console.log(`${shot.padEnd(10)} img ${r.imgWidth}px wide · ${r.lines} rules · median row pitch ${r.medianGap}px · ${JSON.stringify(r.gaps)}`);
  }
})();
