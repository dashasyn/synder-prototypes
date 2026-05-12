'use strict';

// ═══════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════

const BANDS = [
  { key: '06-09', label: '06:00–09:00', hours: [6, 7, 8] },
  { key: '09-15', label: '09:00–15:00', hours: [9, 10, 11, 12, 13, 14] },
  { key: '15-19', label: '15:00–19:00', hours: [15, 16, 17, 18] },
  { key: '19-24', label: '19:00–24:00', hours: [19, 20, 21, 22, 23, 0] },
];

const MAX_ROWS = Math.max(...BANDS.map(b => b.hours.length)); // 6

// ═══════════════════════════════════════════════
// PARSER
// ═══════════════════════════════════════════════

async function parseFile(file) {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(new Uint8Array(buf), { type: 'array' });

  const infoWS = wb.Sheets['Маршрут'];
  if (!infoWS) throw new Error(`Ліст "Маршрут" не знойдзены`);

  const schedWS = wb.Sheets['Расклад'];
  if (!schedWS) throw new Error(`Ліст "Расклад" не знойдзены`);

  // Key-value info sheet
  const infoRows = XLSX.utils.sheet_to_json(infoWS, { header: 1, defval: '' });
  const info = {};
  infoRows.forEach(row => {
    const k = String(row[0] || '').trim();
    if (k) info[k] = row[1];
  });

  const format = String(info['Фармат'] || '').trim();
  const isExact = format === 'дакладны';

  const schedRows = XLSX.utils.sheet_to_json(schedWS, { header: 1, defval: '' });

  return {
    number:       String(info['Нумар'] || '?'),
    type:         String(info['Від'] || '').includes('тралейбус') ? 'troll' : 'bus',
    from:         String(info['Адкуль'] || ''),
    to:           String(info['Куды'] || ''),
    via:          String(info['Праз'] || ''),
    format:       isExact ? 'exact' : 'interval',
    firstWeekday: String(info['Першы будні'] || '—'),
    lastWeekday:  String(info['Апошні будні'] || '—'),
    firstWeekend: String(info['Першы выходны'] || '—'),
    lastWeekend:  String(info['Апошні выходны'] || '—'),
    schedule:     isExact ? parseExact(schedRows) : parseInterval(schedRows),
    fileName:     file.name,
  };
}

function parseExact(rows) {
  // header: [Гадзіна, Будні, Выходныя]
  // rows:   [hour,   'mm,mm,...', 'mm,mm,...']
  const toMins = v => v
    ? String(v).split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n))
    : [];

  const weekday = [], weekend = [];
  for (let i = 1; i < rows.length; i++) {
    const [h, wd, we] = rows[i];
    if (h === '' || h == null) continue;
    const hour = parseInt(h, 10);
    if (isNaN(hour)) continue;
    if (wd !== '' && wd != null) weekday.push({ hour, minutes: toMins(wd) });
    if (we !== '' && we != null) weekend.push({ hour, minutes: toMins(we) });
  }
  return { weekday, weekend };
}

function parseInterval(rows) {
  // header: [Перыяд, Будні, Выходныя]
  // rows:   ['06-09', '5–7', '6–8']
  const weekday = {}, weekend = {};
  for (let i = 1; i < rows.length; i++) {
    const [p, wd, we] = rows[i];
    if (!p) continue;
    const key = String(p).trim();
    if (wd !== '' && wd != null) weekday[key] = String(wd);
    if (we !== '' && we != null) weekend[key] = String(we);
  }
  return { weekday, weekend };
}

// ═══════════════════════════════════════════════
// RENDERER
// ═══════════════════════════════════════════════

function renderStop(stopName, routes) {
  const count = routes.length;
  const suffix = count === 1 ? 'маршрут' : count < 5 ? 'маршруты' : 'маршрутаў';
  return `
    <div class="schedule-sign">
      <div class="stop-header">
        <div class="stop-icon">А</div>
        <div>
          <div class="stop-name">${esc(stopName || 'Прыпынак')}</div>
          <div class="stop-meta">${count} ${suffix}</div>
        </div>
      </div>
      ${routes.map(renderRoute).join('')}
    </div>`;
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
        ${renderSection(r, 'weekday')}
        ${renderSection(r, 'weekend')}
      </table>
    </div>`;
}

function renderSection(r, dayType) {
  const isWD    = dayType === 'weekday';
  const label   = isWD ? 'Будні' : 'Выходныя';
  const first   = isWD ? r.firstWeekday : r.firstWeekend;
  const last    = isWD ? r.lastWeekday  : r.lastWeekend;
  const sched   = isWD ? r.schedule.weekday : r.schedule.weekend;

  return r.format === 'interval'
    ? renderIntervalSection(label, sched, first, last)
    : renderExactSection(label, sched, first, last);
}

function renderIntervalSection(label, sched, first, last) {
  const bandCells = BANDS.map(b => {
    const v = sched[b.key];
    if (!v) return `<td class="td-band"><span class="int-empty">—</span></td>`;
    return `<td class="td-band">
      <div class="int-wrap">
        <span class="int-prefix">Кожны</span>
        <span class="int-value">${esc(v)}</span>
        <span class="int-unit">хвіліны</span>
      </div>
    </td>`;
  }).join('');

  return `
    <tr class="tr-section"><td colspan="6">${label}</td></tr>
    <tr class="tr-bands">
      <td class="th-edge">Першы</td>
      ${BANDS.map(b => `<td>${b.label}</td>`).join('')}
      <td class="th-edge">Апошні</td>
    </tr>
    <tr class="tr-data">
      <td class="td-edge">${esc(first)}</td>
      ${bandCells}
      <td class="td-edge">${esc(last)}</td>
    </tr>`;
}

function renderExactSection(label, hourData, first, last) {
  // Build a map: hour → minutes[]
  const map = {};
  (hourData || []).forEach(h => { map[h.hour] = h.minutes; });

  // Each row = the nth hour across all 4 bands
  let rows = '';
  for (let i = 0; i < MAX_ROWS; i++) {
    const cells = BANDS.map(band => {
      const hour = band.hours[i];
      if (hour === undefined) return '<td class="td-exact"></td>';

      const mins = map[hour];
      if (!mins || mins.length === 0) {
        // Hour exists in timetable but no departures
        return `<td class="td-exact"><span class="ha">${hour}</span></td>`;
      }

      const minsHtml = mins
        .map(m => `<span class="mn">${String(m).padStart(2, '0')}</span>`)
        .join('');

      return `<td class="td-exact"><span class="ha">${hour}</span>${minsHtml}</td>`;
    }).join('');

    rows += `<tr class="tr-data${i % 2 === 1 ? ' odd' : ''}">${cells}</tr>`;
  }

  return `
    <tr class="tr-section"><td colspan="6">${label}</td></tr>
    <tr class="tr-bands">
      <td class="th-edge">Першы<span class="time-sub">${esc(first)}</span></td>
      ${BANDS.map(b => `<td>${b.label}</td>`).join('')}
      <td class="th-edge">Апошні<span class="time-sub">${esc(last)}</span></td>
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
// TEMPLATE GENERATORS  (download example .xlsx)
// ═══════════════════════════════════════════════

function makeWB(infoRows, schedRows, sheetName) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(infoRows), 'Маршрут');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(schedRows), 'Расклад');
  return wb;
}

function dlExact() {
  const info = [
    ['Нумар',          '100'],
    ['Від',            'аўтобус'],
    ['Адкуль',         'ДС «Славіскага»'],
    ['Куды',           'Чыг. ст. «Мінск-Паўднёвы»'],
    ['Праз',           'Неміга – Пр-т Незалежнасці – Вул. Маскоўская'],
    ['Фармат',         'дакладны'],
    ['Першы будні',    '05:20'],
    ['Апошні будні',   '00:20'],
    ['Першы выходны',  '05:20'],
    ['Апошні выходны', '00:20'],
  ];
  const sched = [
    ['Гадзіна', 'Будні', 'Выходныя'],
    [5,  '20',                     '20'],
    [6,  '03,12,27,32,48,52',      '03,12,27,32,48,52'],
    [7,  '03,18,27,43,52',         '03,18,27,43,52'],
    [8,  '03,12,18,32,48',         '03,12,18,32,48'],
    [9,  '03,12,27,43',            '03,12,27,43'],
    [10, '03,12,18,27,32,43,48,52','03,12,18,27,32,43,48,52'],
    [11, '03,12,18,27',            '03,12,18,27'],
    [12, '03,12,18,27,32,52',      '03,12,18,27,32,52'],
    [13, '03,12,18,27',            '03,12,18,27'],
    [14, '03,12,18,27,32,43,48,52','03,12,18,27,32,43,48,52'],
    [15, '03,12,27,32,52',         '03,12,27,32,52'],
    [16, '03,12,27,32',            '03,12,27,32'],
    [17, '03,12,18,27,32,43,48,52','03,12,18,27,32,43,48,52'],
    [18, '03,12,18,27,32,43,48,52','03,12,18,27,32,43,48,52'],
    [19, '03,18,27,32,48,52',      '03,18,27,32,48,52'],
    [20, '03,12',                  '03,12'],
    [21, '03,12,18,27,32,43,48,52','03,12,18,27,32,43,48,52'],
    [22, '03,12,18,27,32,43,48,52','03,12,18,27,32,43,48,52'],
    [23, '03,12,18,27',            '03,12,18,27'],
    [0,  '20',                     '20'],
  ];
  XLSX.writeFile(makeWB(info, sched), 'маршрут_100_аўтобус.xlsx');
}

function dlInterval() {
  const info = [
    ['Нумар',          '21'],
    ['Від',            'аўтобус'],
    ['Адкуль',         'ДС «Славіскага»'],
    ['Куды',           'Чыг. ст. «Мінск-Паўднёвы»'],
    ['Праз',           'Пр-т Незалежнасці – Вул. Маскоўская – раён Мінск-Мір'],
    ['Фармат',         'інтэрвал'],
    ['Першы будні',    '05:20'],
    ['Апошні будні',   '00:20'],
    ['Першы выходны',  '05:20'],
    ['Апошні выходны', '00:20'],
  ];
  const sched = [
    ['Перыяд', 'Будні', 'Выходныя'],
    ['06-09',  '5–7',   '6–8'],
    ['09-15',  '3–5',   '7–10'],
    ['15-19',  '11–16', '11–13'],
    ['19-24',  '5–10',  '11–16'],
  ];
  XLSX.writeFile(makeWB(info, sched), 'маршрут_21_аўтобус.xlsx');
}

function dlTroll() {
  const info = [
    ['Нумар',          'Т10'],
    ['Від',            'тралейбус'],
    ['Адкуль',         'д/с «Вяснянка»'],
    ['Куды',           'д/с «Малінаўка-4»'],
    ['Праз',           'Усход – Пр-т Незалежнасці – Неміга'],
    ['Фармат',         'інтэрвал'],
    ['Першы будні',    '06:03'],
    ['Апошні будні',   '23:37'],
    ['Першы выходны',  '06:03'],
    ['Апошні выходны', '23:37'],
  ];
  const sched = [
    ['Перыяд', 'Будні', 'Выходныя'],
    ['06-09',  '6–11',  '15–18'],
    ['09-15',  '6–15',  '14–19'],
    ['15-19',  '4–16',  '14–20'],
    ['19-24',  '14–19', '18–20'],
  ];
  XLSX.writeFile(makeWB(info, sched), 'маршрут_Т10_тралейбус.xlsx');
}

// ═══════════════════════════════════════════════
// UI
// ═══════════════════════════════════════════════

const uploadedFiles = new Map(); // filename → route object

function init() {
  const dropZone  = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const stopInput = document.getElementById('stop-name');
  const previewBtn = document.getElementById('preview-btn');
  const printBtn   = document.getElementById('print-btn');

  // Drag & drop
  dropZone.addEventListener('dragover', e => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });
  ['dragleave', 'dragend'].forEach(ev =>
    dropZone.addEventListener(ev, () => dropZone.classList.remove('drag-over'))
  );
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

  stopInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') generatePreview();
  });

  previewBtn.addEventListener('click', generatePreview);
  printBtn.addEventListener('click', () => window.print());

  document.getElementById('dl-exact').addEventListener('click', dlExact);
  document.getElementById('dl-interval').addEventListener('click', dlInterval);
  document.getElementById('dl-troll').addEventListener('click', dlTroll);
}

async function handleFiles(files) {
  const xlsxFiles = files.filter(f => f.name.endsWith('.xlsx'));
  if (xlsxFiles.length === 0) {
    showError('Толькі файлы .xlsx');
    return;
  }

  for (const file of xlsxFiles) {
    try {
      const route = await parseFile(file);
      uploadedFiles.set(file.name, route);
      renderFileTag(file.name, route);
    } catch (err) {
      showError(`${file.name}: ${err.message}`);
    }
  }

  syncButtons();
}

function renderFileTag(name, route) {
  const list = document.getElementById('file-list');
  const existing = list.querySelector(`[data-file="${CSS.escape(name)}"]`);
  if (existing) existing.remove();

  const tag = document.createElement('div');
  tag.className = 'file-tag';
  tag.dataset.file = name;

  const badgeClass = route.type === 'troll' ? 'badge-troll' : 'badge-bus';
  tag.innerHTML = `
    <span class="badge ${badgeClass}" style="font-size:11px;padding:1px 7px;">${esc(route.number)}</span>
    <span class="file-tag-name" title="${esc(name)}">${esc(name)}</span>
    <button class="file-tag-remove" data-remove="${esc(name)}">×</button>`;

  tag.querySelector('.file-tag-remove').addEventListener('click', () => {
    uploadedFiles.delete(name);
    tag.remove();
    syncButtons();
  });

  list.appendChild(tag);
}

function syncButtons() {
  const hasFiles = uploadedFiles.size > 0;
  document.getElementById('preview-btn').disabled = !hasFiles;
  document.getElementById('print-btn').disabled   = !hasFiles;
}

function generatePreview() {
  const stopName = document.getElementById('stop-name').value.trim();

  const routes = Array.from(uploadedFiles.values()).sort((a, b) => {
    if (a.type !== b.type) return a.type === 'bus' ? -1 : 1;
    const nA = parseInt(a.number), nB = parseInt(b.number);
    if (!isNaN(nA) && !isNaN(nB)) return nA - nB;
    return a.number.localeCompare(b.number);
  });

  const preview = document.getElementById('preview');
  preview.innerHTML = renderStop(stopName, routes);
  preview.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function showError(msg) {
  const el = document.createElement('div');
  el.className = 'error-toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

document.addEventListener('DOMContentLoaded', init);
