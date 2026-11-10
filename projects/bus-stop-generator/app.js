'use strict';

// ═══════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════

// Interval format: fixed periods, keyed as in the file
const BANDS = [
  { key: '06-09', label: '06:00–09:00' },
  { key: '09-15', label: '09:00–15:00' },
  { key: '15-19', label: '15:00–19:00' },
  { key: '19-24', label: '19:00–24:00' },
];

// Exact format: default hour rows per band; hours found in the data are added
const EXACT_BANDS = [
  { from: 0,  to: 9,  hours: [6, 7, 8] },
  { from: 9,  to: 15, hours: [9, 10, 11, 12, 13, 14] },
  { from: 15, to: 19, hours: [15, 16, 17, 18] },
  { from: 19, to: 99, hours: [19, 20, 21, 22, 23, 0] },
];

// Hours 00–02 belong to the end of the service day
const svc = h => (h < 3 ? h + 24 : h);

const PAPERS = { A3: [297, 420], A2: [420, 594] };
const MARGIN_MM = 10;
const PX_PER_MM = 96 / 25.4;
const DIGIT_HEIGHT = 0.71; // DIN Pro figure height, share of the font size

const pad2 = n => String(n).padStart(2, '0');

// ═══════════════════════════════════════════════
// CELL READERS — Excel turns typed values into numbers and dates
// ═══════════════════════════════════════════════

function isEmpty(v) { return v === '' || v == null; }

// 05:20 · 5.20 · Excel time (0.2222) → '05:20'; null if unreadable
function readTime(v) {
  if (typeof v === 'number') {
    const total = Math.round((v % 1) * 1440);
    return `${pad2(Math.floor(total / 60) % 24)}:${pad2(total % 60)}`;
  }
  const m = String(v).trim().match(/^(\d{1,2})[:.](\d{2})$/);
  if (!m || +m[1] > 24 || +m[2] > 59) return null;
  return `${pad2(+m[1] % 24)}:${m[2]}`;
}

// 5 · '05' · Excel time 05:00 → 5; null if unreadable
function readHour(v) {
  let h = null;
  if (typeof v === 'number') h = Number.isInteger(v) ? v : Math.floor((v % 1) * 24 + 1e-9);
  else {
    const m = String(v).trim().match(/^(\d{1,2})(?::00)?$/);
    if (m) h = +m[1];
  }
  if (h === 24) h = 0;
  return h != null && h >= 0 && h <= 23 ? h : null;
}

// '03,12,27' → [3,12,27]. A comma-decimal Excel stores '03,10' as the number 3.1:
// the fraction is the second minute with its trailing zero lost.
function readMinutes(v) {
  const res = { mins: [], bad: [], recovered: null };
  if (typeof v === 'number') {
    if (Number.isInteger(v)) { res.mins = [v]; return res; }
    const [a, b] = String(v).split('.');
    const second = +b.slice(0, 2).padEnd(2, '0');
    res.mins = [+a, second];
    res.recovered = `${pad2(+a)}, ${pad2(second)}`;
    return res;
  }
  String(v).split(/[\s,;.\/]+/).filter(Boolean).forEach(t => {
    if (/^\d{1,2}$/.test(t)) res.mins.push(+t); else res.bad.push(t);
  });
  return res;
}

// Period key: '06-09', '06–09', '06:00-09:00', or a date Excel made of '06-09'
function readPeriod(v) {
  const known = BANDS.map(b => b.key);
  const key = (a, b) => `${pad2(a)}-${pad2(b === 0 ? 24 : b)}`;
  if (typeof v === 'number') {
    const d = XLSX.SSF.parse_date_code(v);
    if (!d) return null;
    for (const [a, b, order] of [[d.d, d.m, 'dm'], [d.m, d.d, 'md']]) {
      if (known.includes(key(a, b))) return { key: key(a, b), fromDate: true, order };
    }
    return null;
  }
  const m = String(v).trim().match(/^(\d{1,2})(?::00)?\s*[-–—]\s*(\d{1,2})(?::00)?$/);
  if (!m || !known.includes(key(+m[1], +m[2]))) return null;
  return { key: key(+m[1], +m[2]), fromDate: false };
}

// Interval value: '5–7', '5-7', 5, or a date Excel made of '5-7'
function readInterval(v, order) {
  if (typeof v === 'number' && v > 59) {
    const d = XLSX.SSF.parse_date_code(v);
    if (!d) return null;
    const [a, b] = order === 'md' ? [d.m, d.d] : [d.d, d.m];
    return a <= b ? { value: `${a}–${b}`, fromDate: true } : null;
  }
  const m = String(v).trim().match(/^(\d{1,2})(?:\s*[-–—]\s*(\d{1,2}))?$/);
  if (!m) return null;
  if (m[2] == null) return { value: String(+m[1]), fromDate: false };
  return +m[1] <= +m[2] ? { value: `${+m[1]}–${+m[2]}`, fromDate: false } : null;
}

// ═══════════════════════════════════════════════
// PARSER — returns the route plus every problem found
// ═══════════════════════════════════════════════

const TYPE_WORDS = { 'аўтобус': 'bus', 'автобус': 'bus', 'тралейбус': 'troll', 'троллейбус': 'troll' };
const FORMAT_WORDS = { 'дакладны': 'exact', 'інтэрвал': 'interval', 'интервал': 'interval' };

function parseWorkbook(wb, fileName) {
  const errors = [], warnings = [];
  const out = { fileName, errors, warnings, route: null };

  const infoWS = wb.Sheets['Маршрут'];
  const schedWS = wb.Sheets['Расклад'];
  if (!infoWS) errors.push('Няма ліста «Маршрут»');
  if (!schedWS) errors.push('Няма ліста «Расклад»');
  if (errors.length) return out;

  const info = {};
  XLSX.utils.sheet_to_json(infoWS, { header: 1, defval: '', raw: true }).forEach(row => {
    const k = String(row[0] || '').trim();
    if (k) info[k] = row[1];
  });

  const text = k => String(isEmpty(info[k]) ? '' : info[k]).trim();
  ['Нумар', 'Від', 'Адкуль', 'Куды', 'Фармат'].forEach(k => {
    if (!text(k)) errors.push(`Не запоўнена поле «${k}»`);
  });
  const type = TYPE_WORDS[text('Від').toLowerCase()];
  if (text('Від') && !type) errors.push(`Від «${text('Від')}» незразумелы — пішыце «аўтобус» або «тралейбус»`);
  const format = FORMAT_WORDS[text('Фармат').toLowerCase()];
  if (text('Фармат') && !format) errors.push(`Фармат «${text('Фармат')}» незразумелы — пішыце «дакладны» або «інтэрвал»`);
  if (errors.length) return out;

  const rows = XLSX.utils.sheet_to_json(schedWS, { header: 1, defval: '', raw: true });
  const schedule = format === 'exact'
    ? parseExact(rows, errors, warnings)
    : parseInterval(rows, errors, warnings);

  const times = {};
  [['firstWeekday', 'Першы будні'], ['lastWeekday', 'Апошні будні'],
   ['firstWeekend', 'Першы выходны'], ['lastWeekend', 'Апошні выходны']].forEach(([key, field]) => {
    if (isEmpty(info[field])) { times[key] = null; return; }
    const t = readTime(info[field]);
    if (!t) warnings.push(`Час «${info[field]}» у полі «${field}» незразумелы — пішыце ГГ:ХХ`);
    times[key] = t;
  });

  if (format === 'exact') {
    [['weekday', 'firstWeekday', 'lastWeekday', 'Першы будні', 'Апошні будні', 'будні'],
     ['weekend', 'firstWeekend', 'lastWeekend', 'Першы выходны', 'Апошні выходны', 'выходныя']]
      .forEach(([day, fk, lk, ff, lf, dayName]) => {
        const hours = schedule[day];
        if (!hours.length) { warnings.push(`Няма рэйсаў у ${dayName}`); return; }
        const first = `${pad2(hours[0].hour)}:${pad2(hours[0].minutes[0])}`;
        const lastH = hours[hours.length - 1];
        const last = `${pad2(lastH.hour)}:${pad2(lastH.minutes[lastH.minutes.length - 1])}`;
        if (!times[fk]) times[fk] = first;
        else if (times[fk] !== first) warnings.push(`Першы рэйс у табліцы — ${first}, а ў полі «${ff}» — ${times[fk]}`);
        if (!times[lk]) times[lk] = last;
        else if (times[lk] !== last) warnings.push(`Апошні рэйс у табліцы — ${last}, а ў полі «${lf}» — ${times[lk]}`);
      });
  }

  const trips = format === 'exact'
    ? ['weekday', 'weekend'].map(d => schedule[d].reduce((n, h) => n + h.minutes.length, 0))
    : null;
  if (format === 'exact' && trips[0] + trips[1] === 0) errors.push('Расклад пусты');
  if (format === 'interval' && !Object.keys(schedule.weekday).length && !Object.keys(schedule.weekend).length) {
    errors.push('Расклад пусты');
  }
  if (errors.length) return out;

  out.route = {
    number: text('Нумар'),
    type,
    from: text('Адкуль'),
    to: text('Куды'),
    via: text('Праз'),
    format,
    firstWeekday: times.firstWeekday || '—',
    lastWeekday:  times.lastWeekday  || '—',
    firstWeekend: times.firstWeekend || '—',
    lastWeekend:  times.lastWeekend  || '—',
    schedule,
    trips,
    fileName,
  };
  return out;
}

function parseExact(rows, errors, warnings) {
  // header: [Гадзіна, Будні, Выходныя]; rows: [hour, 'mm,mm,...', 'mm,mm,...']
  const maps = { weekday: new Map(), weekend: new Map() };
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i], n = i + 1;
    if (row.every(isEmpty)) continue;
    const hour = readHour(row[0]);
    if (hour == null) { errors.push(`Радок ${n}: гадзіна «${row[0]}» — павінна быць 0–23`); continue; }

    [['weekday', row[1]], ['weekend', row[2]]].forEach(([day, cell]) => {
      if (isEmpty(cell)) return;
      const { mins, bad, recovered } = readMinutes(cell);
      bad.forEach(t => errors.push(`Радок ${n}: незразумелае значэнне «${t}»`));
      if (recovered) warnings.push(`Радок ${n}: Excel ператварыў хвіліны ў лік ${cell} — прачытана як ${recovered}. Задайце ячэйкам тэкставы фармат.`);
      const ok = mins.filter(m => {
        if (m <= 59) return true;
        errors.push(`Радок ${n}: хвіліна ${m} — павінна быць 0–59`);
        return false;
      });
      const map = maps[day];
      if (map.has(hour)) warnings.push(`Радок ${n}: гадзіна ${pad2(hour)} паўтараецца — хвіліны аб'яднаны`);
      map.set(hour, (map.get(hour) || []).concat(ok));
    });
  }

  const toList = map => [...map.entries()]
    .map(([hour, mins]) => ({ hour, minutes: [...new Set(mins)].sort((a, b) => a - b) }))
    .filter(h => h.minutes.length)
    .sort((a, b) => svc(a.hour) - svc(b.hour));
  return { weekday: toList(maps.weekday), weekend: toList(maps.weekend) };
}

function parseInterval(rows, errors, warnings) {
  // header: [Перыяд, Будні, Выходныя]; rows: ['06-09', '5–7', '6–8']
  const weekday = {}, weekend = {};
  const periods = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i], n = i + 1;
    if (row.every(isEmpty)) continue;
    const p = readPeriod(row[0]);
    if (!p) { errors.push(`Радок ${n}: перыяд «${row[0]}» — чакаецца 06-09, 09-15, 15-19 або 19-24`); continue; }
    if (p.fromDate) warnings.push(`Радок ${n}: Excel ператварыў перыяд у дату — прачытана як ${p.key}. Задайце ячэйкам тэкставы фармат.`);
    periods.push({ ...p, row, n });
  }
  const order = (periods.find(p => p.fromDate) || { order: 'dm' }).order;

  periods.forEach(({ key, row, n }) => {
    [[weekday, row[1]], [weekend, row[2]]].forEach(([target, cell]) => {
      if (isEmpty(cell)) return;
      const v = readInterval(cell, order);
      if (!v) { errors.push(`Радок ${n}: інтэрвал «${cell}» — пішыце, напр., 5–7`); return; }
      if (v.fromDate) warnings.push(`Радок ${n}: Excel ператварыў інтэрвал у дату — прачытана як ${v.value}. Задайце ячэйкам тэкставы фармат.`);
      target[key] = v.value;
    });
  });

  [[weekday, 'будні'], [weekend, 'выходныя']].forEach(([sched, dayName]) => {
    BANDS.forEach(b => { if (!sched[b.key]) warnings.push(`Няма інтэрвалу на ${b.label} (${dayName})`); });
  });
  return { weekday, weekend };
}

async function parseFile(file) {
  const wb = XLSX.read(new Uint8Array(await file.arrayBuffer()), { type: 'array' });
  return parseWorkbook(wb, file.name);
}

// ═══════════════════════════════════════════════
// RENDERER
// ═══════════════════════════════════════════════

function renderStop(stopName, routes, showStopName = true) {
  const cards = routes.map((r, i) =>
    (i > 0 ? '<div class="route-separator"></div>' : '') + renderRoute(r)
  ).join('');
  const header = showStopName
    ? `<div class="stop-header"><div class="stop-name">${esc(stopName || 'Прыпынак')}</div></div>`
    : '';
  return `<div class="schedule-sign">${header}${cards}</div>`;
}

function renderRoute(r) {
  const badgeClass = r.type === 'troll' ? 'badge-troll' : 'badge-bus';
  return `
    <div class="route-card">
      <div class="route-header">
        <span class="badge ${badgeClass}">${esc(r.number)}</span>
        <div class="route-info">
          <div class="route-direction">${esc(r.from)} – ${esc(r.to)}</div>
          ${r.via ? `<div class="route-via">${esc(r.via)}</div>` : ''}
        </div>
      </div>
      <table class="sched-table">
        <colgroup>
          <col class="col-edge">
          <col class="col-band"><col class="col-band">
          <col class="col-band"><col class="col-band">
          <col class="col-edge">
        </colgroup>
        ${renderSection(r, 'weekday')}
        ${renderSection(r, 'weekend')}
      </table>
    </div>`;
}

// Band rows for one day type: default hours plus every hour that has departures
function exactBands(hourData) {
  const dataHours = new Set(hourData.map(h => h.hour));
  return EXACT_BANDS.map(b => {
    const hours = [...new Set([...b.hours, ...[...dataHours].filter(h => svc(h) >= b.from && svc(h) < b.to)])]
      .sort((x, y) => svc(x) - svc(y));
    const start = svc(hours[0]);
    const lastSvc = svc(hours[hours.length - 1]);
    // Last band keeps the "–24:00" label for the 00 row; later hours extend it
    const end = b.to !== 99 ? b.to : (lastSvc <= 24 ? 24 : lastSvc + 1);
    return { hours, label: `${pad2(start)}:00–${pad2(end > 24 ? end - 24 : end)}:00` };
  });
}

function renderSection(r, dayType) {
  const isWD  = dayType === 'weekday';
  const label = isWD ? 'Будні' : 'Выходныя';
  const first = isWD ? r.firstWeekday : r.firstWeekend;
  const last  = isWD ? r.lastWeekday  : r.lastWeekend;
  const sched = isWD ? r.schedule.weekday : r.schedule.weekend;

  return r.format === 'interval'
    ? renderIntervalSection(label, sched, first, last)
    : renderExactSection(label, sched, first, last);
}

function timeParts(t) {
  const m = String(t).match(/^(\d+):(\d+)$/);
  if (!m) return `<div class="td-edge-wrap"><span class="td-edge-hour">${esc(t)}</span></div>`;
  return `<div class="td-edge-wrap"><span class="td-edge-hour">${m[1]}:</span><span class="td-edge-min">${m[2]}</span></div>`;
}

function khvilinEnding(v) {
  const nums = String(v).match(/\d+/g);
  if (!nums) return 'хвілін';
  const n = parseInt(nums[nums.length - 1], 10);
  const d = n % 10, t = n % 100;
  if (d === 1 && t !== 11) return 'хвіліну';
  return (d >= 2 && d <= 4 && !(t >= 11 && t <= 14)) ? 'хвіліны' : 'хвілін';
}

function renderIntervalSection(label, sched, first, last) {
  const bandCells = BANDS.map(b => {
    const v = sched[b.key];
    if (!v) return `<td class="td-interval"><div class="int-wrap"><span class="int-value">—</span></div></td>`;
    return `<td class="td-interval">
      <div class="int-wrap">
        <span class="int-label">Кожныя</span>
        <span class="int-value">${esc(v)}</span>
        <span class="int-label">${khvilinEnding(v)}</span>
      </div>
    </td>`;
  }).join('');

  return `
    <tr class="tr-section"><td colspan="6">${label}</td></tr>
    <tr class="tr-bands">
      <td class="td-edge-hd">Перш.</td>
      ${BANDS.map(b => `<td>${b.label}</td>`).join('')}
      <td class="td-edge-hd">Апош.</td>
    </tr>
    <tr class="tr-data">
      <td class="td-edge">${timeParts(first)}</td>
      ${bandCells}
      <td class="td-edge">${timeParts(last)}</td>
    </tr>`;
}

function renderExactSection(label, hourData, first, last) {
  const bands = exactBands(hourData || []);
  const map = {};
  (hourData || []).forEach(h => { map[h.hour] = h.minutes; });
  const maxRows = Math.max(...bands.map(b => b.hours.length));

  let rows = '';
  for (let i = 0; i < maxRows; i++) {
    const edgeFirst = i === 0 ? `<td class="td-edge">${timeParts(first)}</td>` : '<td class="td-edge"></td>';
    const edgeLast  = i === 0 ? `<td class="td-edge">${timeParts(last)}</td>`  : '<td class="td-edge"></td>';

    const bandCells = bands.map(band => {
      const hour = band.hours[i];
      if (hour === undefined) return '<td class="td-exact"></td>';
      const mins = map[hour];
      if (!mins || mins.length === 0) return `<td class="td-exact"></td>`;

      const minsHtml = mins.map(m => `<span class="mn">${pad2(m)}</span>`).join('');
      return `<td class="td-exact">
        <div class="hour-row">
          <span class="ha">${pad2(hour)}</span>
          <div class="mins-wrap">${minsHtml}</div>
        </div>
      </td>`;
    }).join('');

    rows += `<tr class="tr-data${i % 2 === 1 ? ' alt' : ''}">${edgeFirst}${bandCells}${edgeLast}</tr>`;
  }

  return `
    <tr class="tr-section"><td colspan="6">${label}</td></tr>
    <tr class="tr-bands">
      <td class="td-edge-hd">Перш.</td>
      ${bands.map(b => `<td>${b.label}</td>`).join('')}
      <td class="td-edge-hd">Апош.</td>
    </tr>
    ${rows}`;
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ═══════════════════════════════════════════════
// SAMPLES  (download as .xlsx or load straight into the tool)
// ═══════════════════════════════════════════════

function makeWB(infoRows, schedRows) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(infoRows), 'Маршрут');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(schedRows), 'Расклад');
  return wb;
}

const EXACT_WEEKDAY = [
  [5,  '20,45'],
  [6,  '03,12,27,32,48,52'],
  [7,  '03,18,27,43,52'],
  [8,  '03,12,18,32,48'],
  [9,  '03,12,27,43'],
  [10, '03,12,18,27,32,43,48,52'],
  [11, '03,12,18,27'],
  [12, '03,12,18,27,32,52'],
  [13, '03,12,18,27'],
  [14, '03,12,18,27,32,43,48,52'],
  [15, '03,12,27,32,52'],
  [16, '03,12,27,32'],
  [17, '03,12,18,27,32,43,48,52'],
  [18, '03,12,18,27,32,43,48,52'],
  [19, '03,18,27,32,48,52'],
  [20, '03,12'],
  [21, '03,12,18,27,32,43'],
  [22, '03,18,32,48'],
  [23, '03,27'],
  [0,  '20'],
];
const EXACT_WEEKEND = [
  [6,  '10,40'],
  [7,  '10,30,50'],
  [8,  '10,30,50'],
  [9,  '05,25,45'],
  [10, '05,25,45'],
  [11, '05,25,45'],
  [12, '05,25,45'],
  [13, '05,25,45'],
  [14, '05,25,45'],
  [15, '05,25,45'],
  [16, '05,25,45'],
  [17, '05,25,45'],
  [18, '05,25,45'],
  [19, '10,40'],
  [20, '10,40'],
  [21, '10,40'],
  [22, '15'],
  [23, '15'],
];

const SAMPLES = {
  exact: {
    file: 'маршрут_100_аўтобус.xlsx',
    info: [
      ['Нумар',          '100'],
      ['Від',            'аўтобус'],
      ['Адкуль',         'ДС «Славінскага»'],
      ['Куды',           'Чыг. ст. «Мінск-Паўднёвы»'],
      ['Праз',           'Неміга – Пр-т Незалежнасці – Вул. Маскоўская'],
      ['Фармат',         'дакладны'],
      ['Першы будні',    '05:20'],
      ['Апошні будні',   '00:20'],
      ['Першы выходны',  '06:10'],
      ['Апошні выходны', '23:15'],
    ],
    sched: [['Гадзіна', 'Будні', 'Выходныя'],
      ...[...new Set([...EXACT_WEEKDAY, ...EXACT_WEEKEND].map(r => r[0]))]
        .sort((a, b) => svc(a) - svc(b))
        .map(h => [h,
          (EXACT_WEEKDAY.find(r => r[0] === h) || [h, ''])[1],
          (EXACT_WEEKEND.find(r => r[0] === h) || [h, ''])[1]])],
  },
  interval: {
    file: 'маршрут_21_аўтобус.xlsx',
    info: [
      ['Нумар',          '21'],
      ['Від',            'аўтобус'],
      ['Адкуль',         'ДС «Славінскага»'],
      ['Куды',           'Чыг. ст. «Мінск-Паўднёвы»'],
      ['Праз',           'Пр-т Незалежнасці – Вул. Маскоўская – раён Мінск-Мір'],
      ['Фармат',         'інтэрвал'],
      ['Першы будні',    '05:20'],
      ['Апошні будні',   '00:20'],
      ['Першы выходны',  '05:40'],
      ['Апошні выходны', '23:50'],
    ],
    sched: [
      ['Перыяд', 'Будні', 'Выходныя'],
      ['06-09',  '5–7',   '6–8'],
      ['09-15',  '3–5',   '7–10'],
      ['15-19',  '11–16', '11–13'],
      ['19-24',  '5–10',  '11–16'],
    ],
  },
  troll: {
    file: 'маршрут_10_тралейбус.xlsx',
    info: [
      ['Нумар',          '10'],
      ['Від',            'тралейбус'],
      ['Адкуль',         'д/с «Вяснянка»'],
      ['Куды',           'д/с «Малінаўка-4»'],
      ['Праз',           'Усход – Пр-т Незалежнасці – Неміга'],
      ['Фармат',         'інтэрвал'],
      ['Першы будні',    '06:03'],
      ['Апошні будні',   '23:37'],
      ['Першы выходны',  '06:25'],
      ['Апошні выходны', '23:10'],
    ],
    sched: [
      ['Перыяд', 'Будні', 'Выходныя'],
      ['06-09',  '6–11',  '15–18'],
      ['09-15',  '6–15',  '14–19'],
      ['15-19',  '4–16',  '14–20'],
      ['19-24',  '14–19', '18–20'],
    ],
  },
};

function sampleFile(key) {
  const s = SAMPLES[key];
  const buf = XLSX.write(makeWB(s.info, s.sched), { type: 'array', bookType: 'xlsx' });
  return new File([buf], s.file);
}

// ═══════════════════════════════════════════════
// UI
// ═══════════════════════════════════════════════

const uploaded = new Map(); // filename → parse result
const state = { paper: 'A3', custom: [360, 500] };

function init() {
  const dropZone  = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');

  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  ['dragleave', 'dragend'].forEach(ev => dropZone.addEventListener(ev, () => dropZone.classList.remove('drag-over')));
  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    handleFiles(Array.from(e.dataTransfer.files));
  });
  dropZone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    handleFiles(Array.from(fileInput.files));
    fileInput.value = '';
  });

  document.getElementById('stop-name').addEventListener('input', render);
  const toggle = document.getElementById('show-stop-name');
  toggle.addEventListener('change', () => {
    document.getElementById('stop-name-field').hidden = !toggle.checked;
    render();
  });

  const segs = [...document.querySelectorAll('.seg')];
  segs.forEach(seg => seg.addEventListener('click', () => setPaper(seg.dataset.paper)));
  document.querySelector('.segmented').addEventListener('keydown', e => {
    const i = segs.findIndex(s => s.dataset.paper === state.paper);
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const next = segs[(i + step + segs.length) % segs.length];
    setPaper(next.dataset.paper);
    next.focus();
  });
  ['custom-w', 'custom-h'].forEach(id => document.getElementById(id).addEventListener('input', readCustom));

  document.getElementById('print-btn').addEventListener('click', () => window.print());
  document.getElementById('load-sample').addEventListener('click', () =>
    handleFiles(['exact', 'interval', 'troll'].map(sampleFile)));
  document.querySelectorAll('[data-sample]').forEach(btn => btn.addEventListener('click', () => {
    const s = SAMPLES[btn.dataset.sample];
    XLSX.writeFile(makeWB(s.info, s.sched), s.file);
  }));

  window.addEventListener('resize', layoutSheet);
  setPaper('A3');
}

function setPaper(paper) {
  state.paper = paper;
  document.querySelectorAll('.seg').forEach(s => {
    const on = s.dataset.paper === paper;
    s.setAttribute('aria-checked', on);
    s.tabIndex = on ? 0 : -1;
  });
  document.getElementById('custom-size').hidden = paper !== 'custom';
  document.getElementById('custom-error').hidden = true;
  if (paper === 'custom') readCustom(); else layoutSheet();
}

function readCustom() {
  const w = +document.getElementById('custom-w').value;
  const h = +document.getElementById('custom-h').value;
  const ok = [w, h].every(v => v >= 200 && v <= 1000);
  document.getElementById('custom-error').hidden = ok;
  if (ok) { state.custom = [w, h]; layoutSheet(); }
}

function paperSize() { return state.paper === 'custom' ? state.custom : PAPERS[state.paper]; }

async function handleFiles(files) {
  const xlsx = files.filter(f => /\.xlsx$/i.test(f.name));
  files.filter(f => !/\.xlsx$/i.test(f.name)).forEach(f => {
    uploaded.set(f.name, { fileName: f.name, errors: ['Гэта не файл .xlsx'], warnings: [], route: null });
  });
  xlsx.forEach(f => uploaded.set(f.name, { fileName: f.name, loading: true, errors: [], warnings: [], route: null }));
  renderFileList();

  for (const file of xlsx) {
    let res;
    try { res = await parseFile(file); }
    catch (err) { res = { fileName: file.name, errors: ['Файл не адкрываецца — ці гэта сапраўды .xlsx?'], warnings: [], route: null }; }
    uploaded.set(file.name, res);
  }
  renderFileList();
  render();
}

function tripsWord(n) {
  const d = n % 10, t = n % 100;
  if (d === 1 && t !== 11) return 'рэйс';
  if (d >= 2 && d <= 4 && !(t >= 11 && t <= 14)) return 'рэйсы';
  return 'рэйсаў';
}

function renderFileList() {
  const list = document.getElementById('file-list');
  const seen = new Map();
  list.innerHTML = [...uploaded.values()].map(res => {
    const r = res.route;
    const warnings = res.warnings.slice();
    if (r) {
      const id = `${r.type}:${r.number}`;
      if (seen.has(id)) warnings.push(`Маршрут ${r.number} ужо ёсць у файле ${seen.get(id)} — на раскладзе будуць абодва`);
      else seen.set(id, res.fileName);
    }
    const status = res.loading ? 'is-loading' : res.errors.length ? 'is-error' : warnings.length ? 'is-warn' : 'is-ok';
    const badge = r
      ? `<span class="badge-sm ${r.type === 'troll' ? 'badge-troll' : 'badge-bus'}">${esc(r.number)}</span>`
      : `<span class="badge-sm badge-none">?</span>`;
    let sub;
    if (res.loading) sub = 'Чытаю…';
    else if (res.errors.length) sub = 'Не трапіць на расклад — выпраўце файл';
    else if (r.format === 'exact') sub = `Дакладны · будні ${r.trips[0]} ${tripsWord(r.trips[0])}, выходныя ${r.trips[1]} ${tripsWord(r.trips[1])}`;
    else sub = 'Інтэрвал';
    const issues = [
      ...res.errors.map(t => `<li class="issue-err">${esc(t)}</li>`),
      ...warnings.map(t => `<li class="issue-warn">${esc(t)}</li>`),
    ].join('');
    return `<div class="file-card ${status}" data-file="${esc(res.fileName)}">
      <div class="file-card-head">
        ${badge}
        <div class="file-card-text">
          <div class="file-card-name" title="${esc(res.fileName)}">${esc(res.fileName)}</div>
          <div class="file-card-sub">${esc(sub)}</div>
        </div>
        <button class="file-card-remove" aria-label="Выдаліць ${esc(res.fileName)}">×</button>
      </div>
      ${issues ? `<ul class="file-card-issues">${issues}</ul>` : ''}
    </div>`;
  }).join('');

  list.querySelectorAll('.file-card-remove').forEach(btn => btn.addEventListener('click', () => {
    uploaded.delete(btn.closest('.file-card').dataset.file);
    renderFileList();
    render();
  }));
}

function validRoutes() {
  return [...uploaded.values()].filter(r => r.route && !r.errors.length).map(r => r.route).sort((a, b) => {
    if (a.type !== b.type) return a.type === 'bus' ? -1 : 1;
    const nA = parseInt(a.number), nB = parseInt(b.number);
    if (!isNaN(nA) && !isNaN(nB) && nA !== nB) return nA - nB;
    return a.number.localeCompare(b.number);
  });
}

function render() {
  const routes = validRoutes();
  const has = routes.length > 0;
  document.getElementById('preview-empty').hidden = has;
  document.getElementById('sheet-meta').hidden = !has;
  document.getElementById('sheet-frame').hidden = !has;
  document.getElementById('print-btn').disabled = !has;
  document.getElementById('print-reason').hidden = has;
  if (!has) { document.getElementById('sheet-sign').innerHTML = ''; return; }

  const stopName = document.getElementById('stop-name').value.trim();
  const showStop = document.getElementById('show-stop-name').checked;
  document.getElementById('sheet-sign').innerHTML = renderStop(stopName, routes, showStop);
  layoutSheet();
  document.fonts.ready.then(layoutSheet);
}

// Fit the sign onto the sheet, then fit the sheet into the preview column
function layoutSheet() {
  const sign = document.getElementById('sheet-sign');
  if (!sign.firstElementChild) return;
  const [wMm, hMm] = paperSize();
  const W = wMm * PX_PER_MM, H = hMm * PX_PER_MM, M = MARGIN_MM * PX_PER_MM;

  const sheet = document.getElementById('sheet');
  sheet.style.width = `${wMm}mm`;
  sheet.style.height = `${hMm}mm`;

  const sw = sign.offsetWidth, sh = sign.offsetHeight;
  const fitW = (W - 2 * M) / sw, fitH = (H - 2 * M) / sh;
  const f = Math.min(fitW, fitH);
  sign.style.transform = `scale(${f})`;
  sign.style.left = `${(W - sw * f) / 2}px`;
  sign.style.top = `${M}px`;

  const frame = document.getElementById('sheet-frame');
  const s = Math.min(1, document.getElementById('preview').clientWidth / W);
  frame.style.width = `${W * s}px`;
  frame.style.height = `${H * s}px`;
  sheet.style.transform = `scale(${s})`;

  const mm = px => (px * f / PX_PER_MM).toFixed(1).replace('.', ',');
  const paperName = state.paper === 'custom' ? 'Свой памер' : state.paper;
  const limit = fitH < fitW ? 'упісана па вышыні аркуша' : 'упісана па шырыні аркуша';
  document.getElementById('sheet-meta').innerHTML =
    `<span><b>${paperName}</b> · ${wMm}×${hMm} мм</span>` +
    `<span>Маштаб ×${f.toFixed(2).replace('.', ',')} — ${limit}</span>` +
    `<span>Вышыня лічбаў: хвіліны ≈ ${mm(12 * DIGIT_HEIGHT)} мм, гадзіны ≈ ${mm(17 * DIGIT_HEIGHT)} мм, нумар маршруту ≈ ${mm(50 * DIGIT_HEIGHT)} мм</span>`;

  document.getElementById('print-size').textContent =
    `@media print { @page { size: ${wMm}mm ${hMm}mm; margin: 0; } }`;
}

document.addEventListener('DOMContentLoaded', init);
