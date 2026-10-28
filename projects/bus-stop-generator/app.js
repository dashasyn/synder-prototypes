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
  if (!infoWS) throw new Error(`Лист "Маршрут" не найден`);

  const schedWS = wb.Sheets['Расклад'];
  if (!schedWS) throw new Error(`Лист "Расклад" не найден`);

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
  const map = {};
  (hourData || []).forEach(h => { map[h.hour] = h.minutes; });

  let rows = '';
  for (let i = 0; i < MAX_ROWS; i++) {
    const edgeFirst = i === 0 ? `<td class="td-edge">${timeParts(first)}</td>` : '<td class="td-edge"></td>';
    const edgeLast  = i === 0 ? `<td class="td-edge">${timeParts(last)}</td>`  : '<td class="td-edge"></td>';

    const bandCells = BANDS.map(band => {
      const hour = band.hours[i];
      if (hour === undefined) return '<td class="td-exact"></td>';
      const mins = map[hour];
      if (!mins || mins.length === 0) return `<td class="td-exact"></td>`;

      const minsHtml = mins
        .map(m => `<span class="mn">${String(m).padStart(2, '0')}</span>`)
        .join('');

      return `<td class="td-exact">
        <div class="hour-row">
          <span class="ha">${String(hour).padStart(2, '0')}</span>
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
      ${BANDS.map(b => `<td>${b.label}</td>`).join('')}
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
    ['Нумар',          '10'],
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
  XLSX.writeFile(makeWB(info, sched), 'маршрут_10_тралейбус.xlsx');
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

  const showStopNameToggle = document.getElementById('show-stop-name');
  const toggleLabel = document.querySelector('.toggle-label');
  const stopNameField = document.getElementById('stop-name-field');
  showStopNameToggle.addEventListener('change', () => {
    toggleLabel.classList.toggle('checked', showStopNameToggle.checked);
    stopNameField.style.display = showStopNameToggle.checked ? '' : 'none';
  });

  previewBtn.addEventListener('click', generatePreview);
  printBtn.addEventListener('click', () => {
    const ZOOM = 2.3;
    const CM_PER_PX = 2.54 / 96;
    const preview = document.getElementById('preview');
    const heightCm = (preview.scrollHeight * ZOOM * CM_PER_PX + 1).toFixed(1);
    let s = document.getElementById('_print_size');
    if (!s) { s = document.createElement('style'); s.id = '_print_size'; document.head.appendChild(s); }
    s.textContent = `@media print { @page { size: 40cm ${heightCm}cm; margin: 0; } }`;
    window.print();
  });

  document.getElementById('dl-exact').addEventListener('click', dlExact);
  document.getElementById('dl-interval').addEventListener('click', dlInterval);
  document.getElementById('dl-troll').addEventListener('click', dlTroll);
}

async function handleFiles(files) {
  const xlsxFiles = files.filter(f => f.name.endsWith('.xlsx'));
  if (xlsxFiles.length === 0) {
    showError('Только файлы .xlsx');
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
  const showStopName = document.getElementById('show-stop-name').checked;

  const routes = Array.from(uploadedFiles.values()).sort((a, b) => {
    if (a.type !== b.type) return a.type === 'bus' ? -1 : 1;
    const nA = parseInt(a.number), nB = parseInt(b.number);
    if (!isNaN(nA) && !isNaN(nB)) return nA - nB;
    return a.number.localeCompare(b.number);
  });

  const preview = document.getElementById('preview');
  preview.innerHTML = renderStop(stopName, routes, showStopName);
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
