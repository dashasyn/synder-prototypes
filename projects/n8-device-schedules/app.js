/* ════════════════════════════════════════════════════════════════════
   N8 · Output device schedules — DATNETISR-264 (design task)
   React 18 + MUI v5, no build step.

   Ignat, 2026-10-02: "Please read the description. Tell me shortly what
   should be done and create a prototype as you see it."

   One place to manage schedules: Systems › Output device schedules.
   Station details and Device details only *show* the schedules that reach
   them and link into that one editor — no second editor.

   Two variants, swapped in place by the bar at the top:
   1 · Target — the full DATNETISR-264 workflow.
   2 · Phase 1 — the same screens, limited to what ETC can do today on top of
       the PaxLife API (one weekly schedule per device, read + replace).
   "Show gaps" pins every API / requirement gap where it bites (G1–G11).

   Copy sources:
   · captured — N8 chrome, Systems menu, Stations list rows, Device list
                columns, Device details cards: Ignat's screenshots,
                2026-09-28 / 09-29 (kept in ~/.openclaw/reference/etc/).
   · proposed — everything about schedules.
   · sample   — station groups, schedules, ELA / Barix devices, volumes.
   Minimum text size 14px (Ignat, 2026-10-01).
   ════════════════════════════════════════════════════════════════════ */
const { useState, useEffect, useRef, useContext, createContext, useCallback } = React;
const html = htm.bind(React.createElement);
const M = MaterialUI;
const {
  ThemeProvider, createTheme, CssBaseline, AppBar, Toolbar, Box, Button, IconButton,
  Typography, Menu, MenuItem, Breadcrumbs, Link, Card, CardContent, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip,
  Stack, FormControl, InputLabel, Select, InputAdornment, Tooltip, Alert, AlertTitle,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Snackbar,
  Switch, Radio, RadioGroup, FormControlLabel, Slider, ToggleButton, ToggleButtonGroup,
  Autocomplete, Skeleton, LinearProgress, Tabs, Tab, Divider, Collapse,
} = M;

/* Box, not a bare span, so sx spacing (mr, ml) and palette colours resolve. */
const Icon = ({ children, sx }) =>
  html`<${Box} component="span" className="material-icons" aria-hidden="true" sx=${{ fontSize: 20, ...(sx || {}) }}>${children}<//>`;

const NAVY = '#1C2848';

/* The ETC theme (projects/etc-optics-devices-mui), plus the 14px floor:
   helper text, chips and tooltips are raised from MUI's 11–13px. */
const theme = createTheme({
  palette: { primary: { main: '#2196F3', dark: '#1769AA', light: '#64B5F6' }, background: { default: '#FAFAFA' } },
  shape: { borderRadius: 4 },
  components: {
    MuiButton:      { defaultProps: { size: 'small', disableElevation: true }, styleOverrides: { root: { fontSize: 14 } } },
    MuiIconButton:  { defaultProps: { size: 'small' } },
    MuiTextField:   { defaultProps: { size: 'small', variant: 'filled' } },
    MuiFormControl: { defaultProps: { size: 'small', variant: 'filled' } },
    MuiFormHelperText: { styleOverrides: { root: { fontSize: 14, lineHeight: 1.45 } } },
    MuiChip:        { styleOverrides: { root: { fontSize: 14 }, sizeSmall: { height: 24 } } },
    MuiTooltip:     { styleOverrides: { tooltip: { fontSize: 14 } } },
    MuiToggleButton:{ styleOverrides: { root: { fontSize: 14, textTransform: 'none', padding: '5px 12px' } } },
    MuiTablePagination: { styleOverrides: { root: { fontSize: 14 } } },
    MuiTable:       { defaultProps: { size: 'small' } },
    MuiAppBar:      { defaultProps: { elevation: 0 } },
    MuiToolbar:     { defaultProps: { variant: 'dense' } },
    MuiTableHead:   { styleOverrides: { root: { backgroundColor: '#F4F4F4' } } },
    MuiTableCell:   { styleOverrides: { root: { fontSize: 14 }, head: {
                        fontWeight: 500, position: 'relative', whiteSpace: 'nowrap',
                        '&:not(:last-of-type)::after': {
                          content: '""', position: 'absolute', right: 0, top: '25%',
                          height: '50%', width: '1px', backgroundColor: 'rgba(224,224,224,1)',
                        },
                      } } },
    MuiCard:        { defaultProps: { variant: 'outlined' }, styleOverrides: { root: { borderColor: '#E7E7E7' } } },
    MuiAlert:       { styleOverrides: { message: { fontSize: 14 } } },
  },
});

/* ── Data ──────────────────────────────────────────────────────────── */
/* Stations — the rows captured from N8's Stations list. */
const STATIONS = [
  ['AFA', 'Afula', 'Afula', 'עפולה', 'عفولا', 'Afula', '17112', 6, 2, 4],
  ['AHI', 'Ahihud', 'Ahihud', 'Test', 'Test', 'Ahihud', '17116', 1, 1, 1],
  ['AKO', 'Akko', 'Akko', 'עכו', 'عكا', 'Akko', '17012', 0, 1, 1],
  ['ADA', 'Ashdod Ad Halom', 'Ashdod', 'אשדוד', 'أشدود', 'Ashdod Ad Halom', '17070', 1, 0, 0],
  ['ASK', 'Ashkelon', 'Ashkelon', 'אשקלון', 'أشكلون', 'Ashkelon', '17072', 0, 0, 0],
  ['ATL', 'Atlit', 'Atlit', 'עתלית', 'عتليت', 'Atlit', '17022', 0, 0, 0],
  ['NTBG', 'Ben Gurion Airport', 'TLV-Airport', 'נתב"ג', 'المطار', 'Ben Gurion Airport', '17090', 2, 0, 0],
  ['SMS', 'Bet Shemesh', 'Bet Shemesh', 'בית שמש', 'بيت شيمش', 'Bet Shemesh', '17074', 0, 0, 1],
  ['BS', 'B. Sheva Uni', 'B. Sheva Uni', "באר שבע-אונ'", 'جامعة ب شيفع', 'B. Sheva Uni', '17082', 1, 0, 0],
  ['BIN', 'Binyamina', 'Binyamina', 'בנימינה', 'بنيامينا', 'Binyamina', '17024', 0, 0, 0],
].map(([code, name, en, he, ar, mot, motId, halls, corridors, platforms]) => ({ code, name, en, he, ar, mot, motId, halls, corridors, platforms }));
const stName = c => (STATIONS.find(s => s.code === c) || {}).name || c;
const stLabel = c => `${c} - ${stName(c)}`;

/* Station groups — sample; N8's real predefined groups weren't captured. */
var GROUPS = [
  { id: 'north', name: 'North line', stations: ['AKO', 'ATL', 'BIN', 'AHI', 'AFA'] },
  { id: 'south', name: 'South line', stations: ['ADA', 'ASK', 'BS'] },
  { id: 'airport', name: 'Airport', stations: ['NTBG'] },
  { id: 'jlm', name: 'Jerusalem corridor', stations: ['SMS'] },
];
const groupName = id => (GROUPS.find(g => g.id === id) || {}).name || id;

/* Devices. kind: display | barix | ela. Displays are captured rows where the
   station is known; Barix and ELA devices are sample. */
var DEVICES = [
  ['Platfrom HGA Display 2', 'hga-plat-2', 'Platform TFT', 'display', 'SMS', '2', '1111'],
  ['Device', 'device-11001', 'Corridor TFT', 'display', 'AFA', 'TP100926', '1111.1111'],
  ['device 1', 'device-1', 'Platform 1 LED', 'display', 'NTBG', 'Airport Hall', '190.168.1.1'],
  ['test 08031', 'test-08031', 'HTML TEST test test', 'display', 'BS', 'Beer Sheva Platform', '4.3.2.1'],
  ['AKO Platform 1 TFT', 'ako-plat-1', 'Platform TFT', 'display', 'AKO', 'Platform 1', '10.12.0.21'],
  ['AHI Platform TFT', 'ahi-plat-1', 'Platform TFT', 'display', 'AHI', 'Platform 1', '10.12.4.21'],
  ['BIN Concourse TFT', 'bin-conc-1', 'Concourse TFT', 'display', 'BIN', 'Concourse', '10.12.6.21'],
  ['ASK Platform LED', 'ask-plat-1', 'Passenger Hall LED', 'display', 'ASK', 'Platform 1', '10.14.2.21'],
  ['AKO Barix PH1', 'ako-barix-1', 'Barix audio', 'barix', 'AKO', 'Platform 1', '10.12.0.40'],
  ['ATL Barix PH1', 'atl-barix-1', 'Barix audio', 'barix', 'ATL', 'Platform 1', '10.12.2.40'],
  ['AFA Barix Hall', 'afa-barix-1', 'Barix audio', 'barix', 'AFA', 'Passenger hall', '10.12.8.40'],
  ['NTBG Barix Hall', 'ntbg-barix-1', 'Barix audio', 'barix', 'NTBG', 'Airport Hall', '10.16.0.40'],
  ['ASK Barix PH1', 'ask-barix-1', 'Barix audio', 'barix', 'ASK', 'Platform 1', '10.14.2.40'],
  ['AKO ELA zone 1', 'ako-ela-1', 'ELA speaker', 'ela', 'AKO', 'Platform 1', '10.12.0.60'],
  ['BIN ELA zone 1', 'bin-ela-1', 'ELA speaker', 'ela', 'BIN', 'Platform 1', '10.12.6.60'],
  ['ADA ELA hall', 'ada-ela-1', 'ELA speaker', 'ela', 'ADA', 'Passenger hall', '10.14.0.60'],
].map(([name, id, type, kind, station, zone, net]) => ({
  name, id, type, kind, station, zone, net, status: 'Active',
  // Volume lives on the station now (Ignat, 2026-10-05); only the Barix equalizer stays on the device.
  base: kind === 'barix' ? { eq: 'Speech' } : null,
}));
const devById = id => DEVICES.find(d => d.id === id);

/* Default volume per station (Ignat, 2026-10-05: "it should be per station. so
   all audio devices have 50 % volume"). A schedule sets a volume level from 0
   (silent) to 100 (Ignat, same day) instead of 264's −100…+100 relative
   adjustment — flagged as G4. */
var STATION_AUDIO = Object.fromEntries(STATIONS.map(s => [s.code, { volume: 50 }]));
const stAudio = code => STATION_AUDIO[code] || { volume: 50 };

/* What a device type can do. Display power only on displays; PA only on audio.
   ELA support is unconfirmed (G8). */
const CAN = {
  display: { pa: false, display: true },
  barix:   { pa: true,  display: false },
  ela:     { pa: true,  display: false, unconfirmed: true },
};

const DAYS = [['sun', 'Sun'], ['mon', 'Mon'], ['tue', 'Tue'], ['wed', 'Wed'], ['thu', 'Thu'], ['fri', 'Fri'], ['sat', 'Sat']];

var SCHEDULES = [
  { id: 's1', name: 'Night mode — North line', active: true, groups: ['north'], stations: [],
    days: ['sun', 'mon', 'tue', 'wed', 'thu'], holidays: false, start: '23:30', end: '05:00',
    pa: 'adjust', paPct: 30, display: 'darken', apply: { at: '2 Oct 2026, 03:00', failed: [] } },
  { id: 's2', name: 'Shabbat quiet — Akko, Binyamina', active: true, groups: [], stations: ['AKO', 'BIN'],
    days: ['fri', 'sat'], holidays: true, start: '16:00', end: '20:00',
    pa: 'adjust', paPct: 0, display: 'none',
    apply: { at: '2 Oct 2026, 03:00', failed: [{ id: 'bin-ela-1', reason: 'PaxLife rejected the schedule — field "volume" not supported on this device type' }] } },
  { id: 's3', name: 'Airport late night', active: false, groups: ['airport'], stations: [],
    days: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'], holidays: true, start: '01:00', end: '04:30',
    pa: 'none', paPct: 50, display: 'darken', apply: null },
  { id: 's4', name: 'South line evening', active: true, groups: ['south'], stations: [],
    days: ['sun', 'mon', 'tue', 'wed', 'thu'], holidays: false, start: '21:00', end: '23:00',
    pa: 'adjust', paPct: 40, display: 'none', apply: { at: '30 Sep 2026, 03:00', failed: [],
      stale: { on: '1 Oct 2026', added: [{ group: 'south', station: 'BS' }], removed: [{ name: 'ASK Barix PH2', station: 'ASK', why: 'removed from the station' }] } } },
];

/* ── Pure logic ────────────────────────────────────────────────────── */
const toMin = t => { const m = String(t || '').trim().match(/^([01]\d|2[0-3]):([0-5]\d)$/); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };
const overnight = s => toMin(s.start) != null && toMin(s.end) != null && toMin(s.end) < toMin(s.start);

function daysText(s) {
  const idx = s.days.map(d => DAYS.findIndex(x => x[0] === d)).sort((a, b) => a - b);
  let t = '';
  if (idx.length === 7) t = 'Every day';
  else if (idx.length > 2 && idx[idx.length - 1] - idx[0] === idx.length - 1) t = `${DAYS[idx[0]][1]}–${DAYS[idx[idx.length - 1]][1]}`;
  else t = idx.map(i => DAYS[i][1]).join(', ');
  if (s.holidays) t = t ? t + ', Holidays' : 'Holidays';
  return t || '–';
}
const timeText = s => `${s.start}–${s.end}${overnight(s) ? ' (+1 day)' : ''}`;
const paText = s => s.pa === 'adjust' ? (Number(s.paPct) === 0 ? 'Mute' : `Volume ${s.paPct}%`) : 'No action';
const displayText = s => s.display === 'darken' ? 'Darken all displays' : 'No action';
/* Targets: groups and individual stations together in one field, as on N8's
   Event details screen (Ignat, 2026-10-05). The schedule reaches the union. */
const groupSize = id => ((GROUPS.find(g => g.id === id) || {}).stations || []).length;
const targetText = s => {
  const parts = [...s.groups.map(g => `${groupName(g)} (${groupSize(g)})`), ...s.stations.map(stName)];
  return parts.length ? (parts.length <= 2 ? parts.join(', ') : `${parts.slice(0, 2).join(', ')} +${parts.length - 2}`) : '–';
};
const targetStations = s => [...new Set([...s.groups.flatMap(g => (GROUPS.find(x => x.id === g) || {}).stations || []), ...s.stations])];
/** How a schedule reaches one station: through which group(s), or directly. */
const viaText = (s, code) => {
  const gs = s.groups.filter(g => ((GROUPS.find(x => x.id === g) || {}).stations || []).includes(code)).map(g => 'Group · ' + groupName(g));
  return [...gs, ...(s.stations.includes(code) ? ['This station'] : [])].join(', ');
};
/** Devices a schedule reaches that can carry at least one of its actions. */
function reach(s) {
  const st = targetStations(s);
  return DEVICES.filter(d => st.includes(d.station)).map(d => {
    const can = CAN[d.kind];
    const pa = can.pa && s.pa === 'adjust';
    const disp = can.display && s.display === 'darken';
    return { d, pa, disp, useful: pa || disp };
  });
}
/** Absolute volume a relative adjustment gives on one device (G4). */
const absVolume = (d, level) => Math.max(0, Math.min(100, Math.round(Number(level) || 0)));
function onDevice(s, d) {
  const parts = [];
  if (CAN[d.kind].display && s.display === 'darken') parts.push('Darken');
  if (CAN[d.kind].pa && s.pa === 'adjust') parts.push(Number(s.paPct) === 0 ? 'Mute' : `Volume ${stAudio(d.station).volume}% → ${absVolume(d, s.paPct)}%`);
  return parts.join(' · ') || '–';
}

/** Week intervals in minutes [a, b) — overnight runs spill into the next day. */
function intervals(s) {
  const a = toMin(s.start), b = toMin(s.end);
  if (a == null || b == null || a === b) return [];
  const W = 7 * 1440, out = [];
  s.days.forEach(day => {
    const i = DAYS.findIndex(x => x[0] === day);
    const st = i * 1440 + a, en = b > a ? i * 1440 + b : (i + 1) * 1440 + b;
    if (en <= W) out.push([st, en]); else { out.push([st, W]); out.push([0, en - W]); }
  });
  return out;
}
/** Do two daily windows share any minute? (Holidays have no weekday.) */
function clockOverlap(x, y) {
  const span = s => { const a = toMin(s.start), b = toMin(s.end); return b > a ? [[a, b]] : [[a, 1440], [0, b]]; };
  return span(x).some(([a, b]) => span(y).some(([c, e]) => a < e && c < b));
}
/** Other active schedules that act on the same devices at the same time (G5). */
function overlapsWith(draft) {
  const mine = intervals(draft);
  const myDev = new Set(reach(draft).filter(r => r.useful).map(r => r.d.id));
  return SCHEDULES.filter(o => o.id !== draft.id && o.active).map(o => {
    const shared = reach(o).filter(r => r.useful && myDev.has(r.d.id)).length;
    const hit = intervals(o).some(([a, b]) => mine.some(([c, e]) => a < e && c < b)) || (draft.holidays && o.holidays && clockOverlap(draft, o));
    return shared && hit ? { s: o, shared } : null;
  }).filter(Boolean);
}

/** The per-device weekly entries ETC writes through the PaxLife API (G3). */
function weeklyEntries(d) {
  const rows = [];
  SCHEDULES.filter(s => s.active && reach(s).some(r => r.d.id === d.id && r.useful)).forEach(s => {
    const on = {}, off = {};
    if (CAN[d.kind].display && s.display === 'darken') { on.screen_on = 'false'; off.screen_on = 'true'; }
    if (CAN[d.kind].pa && s.pa === 'adjust') {
      if (Number(s.paPct) === 0) { on.muted = 'true'; off.muted = 'false'; }
      else { on.volume = absVolume(d, s.paPct) + '%'; off.volume = stAudio(d.station).volume + '%'; }
    }
    s.days.forEach(day => {
      const i = DAYS.findIndex(x => x[0] === day);
      rows.push({ day: i, t: s.start, ...on, edge: 'start', from: s.name });
      rows.push({ day: overnight(s) ? (i + 1) % 7 : i, t: s.end, ...off, edge: 'end', from: s.name });
    });
  });
  return rows.sort((a, b) => a.day - b.day || a.t.localeCompare(b.t));
}

/** The same entries in operator words, one row per time + action, days merged.
    `api` keeps the raw PaxLife fields for the gaps view. */
function plainEntries(d) {
  const say = e => {
    const parts = [];
    if (e.screen_on) parts.push(e.screen_on === 'false' ? 'Turn display off' : 'Turn display on');
    if (e.muted) parts.push(e.muted === 'true' ? 'Mute' : 'Unmute');
    if (e.volume) parts.push(e.edge === 'end' ? `Set volume back to ${e.volume} (default)` : `Set volume to ${e.volume}`);
    return parts.join(' · ');
  };
  const api = e => ['screen_on', 'muted', 'volume'].filter(k => e[k]).map(k => `${k}=${String(e[k]).replace('%', '')}`).join(', ');
  const map = new Map();
  weeklyEntries(d).forEach(e => {
    const key = [e.t, say(e), e.from].join('|');
    if (!map.has(key)) map.set(key, { t: e.t, action: say(e), api: api(e), from: e.from, days: [] });
    map.get(key).days.push(e.day);
  });
  return [...map.values()].map(r => ({ ...r, dayText: daysText({ days: r.days.map(i => DAYS[i][0]), holidays: false }) }))
    .sort((a, b) => Math.min(...a.days) - Math.min(...b.days) || a.t.localeCompare(b.t));
}

/* ── App state ─────────────────────────────────────────────────────── */
const App = createContext(null);
const useApp = () => useContext(App);

/* ── Shared components ─────────────────────────────────────────────── */
function PageHeader({ crumbs, title, action, titleId }) {
  return html`
    <${Box} sx=${{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 2, mb: 2 }}>
      <${Box} sx=${{ minWidth: 0 }}>
        ${crumbs ? html`<${Breadcrumbs} sx=${{ mb: .5 }} separator=${html`<${Icon} sx=${{ fontSize: 16 }}>chevron_right<//>`}>
          ${crumbs.map((c, i) => c.onClick
            ? html`<${Link} key=${i} component="button" underline="hover" color="text.secondary" variant="body2" onClick=${c.onClick}>${c.label}<//>`
            : html`<${Typography} key=${i} variant="body2" color="text.primary">${c.label}<//>`)}
        <//>` : null}
        <${Typography} variant="h6" id=${titleId} noWrap>${title}<//>
      <//>
      <${Stack} direction="row" spacing=${1} sx=${{ flexShrink: 0 }}>${action}<//>
    <//>`;
}

function SectionCard({ title, note, children, id, chip, action }) {
  return html`
    <${Card} id=${id} sx=${{ mb: 2 }}>
      <${CardContent} sx=${{ '&:last-child': { pb: 2 } }}>
        ${title ? html`<${Box} sx=${{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <${Typography} variant="h6" sx=${{ fontSize: 18 }}>${title}<//>${chip}
          ${action ? html`<${Box} sx=${{ ml: 'auto' }}>${action}<//>` : null}
        <//>` : null}
        ${note ? html`<${Typography} variant="body2" color="text.secondary" sx=${{ mt: -1, mb: 2 }}>${note}<//>` : null}
        ${children}
      <//>
    <//>`;
}

const FieldGrid = ({ children, cols = 4 }) => html`
  <${Box} sx=${{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: `repeat(${cols}, minmax(0, 1fr))` } }}>${children}<//>`;

const RowIcon = ({ icon, label, onClick }) => html`
  <${Tooltip} title=${label}>
    <${IconButton} aria-label=${label} onClick=${e => { e.stopPropagation(); onClick(); }}><${Icon}>${icon}<//><//>
  <//>`;

/** A radio option with a one-line description under it. */
const Opt = (value, title, desc, extra) => html`
  <${FormControlLabel} value=${value} disabled=${value === 'more'} control=${html`<${Radio} />`}
    sx=${{ alignItems: 'flex-start', mb: .5 }}
    label=${html`<${Box} sx=${{ pt: '9px' }}>
      <span>${title}</span>${extra || null}
      <${Typography} variant="body2" color="text.secondary">${desc}<//>
    <//>`} />`;

/** A gap, pinned where it bites. Hidden unless "Show gaps" is on. */
const GAP_TEXT = {
  G1: 'Named, central schedules don\'t exist in the PaxLife API — it stores one weekly schedule per device. ETC must own the schedule list and push the result to each device.',
  G2: 'Holidays: N8 keeps a central, system-wide list of holiday dates (DATNETISR-264), but the PaxLife API is weekly only, with no dates. ETC has to write dated changes onto each device around every holiday — or holidays can\'t reach the devices.',
  G3: 'Start/End ranges: the API takes weekday/time entries, not ranges. ETC writes an "on" entry at the start and an "off" entry at the end; overnight ranges put the off entry on the next day.',
  G4: 'Volume scale: DATNETISR-264 specifies a relative adjustment, −100…+100% against the station\'s default volume (+100% = maximum configured amplification). This prototype sets an absolute level, 0–100% (0 = silent), as Ignat asked on 5 Oct. Confirm with ETC — the API takes an absolute volume, so this version needs no conversion.',
  G5: 'Overlaps: a device holds one weekly schedule. When two schedules act on the same device at the same time, which one wins?',
  G6: 'Membership changes: proposed rule — ETC updates the devices automatically when a group gains/loses a station or a device is added/moved, and marks the schedule Out of date if that fails. Needs agreement with ETC.',
  G7: 'Display actions beyond "Darken all displays" — confirm the list with Tuan before this control is final.',
  G8: 'ELA speakers: confirm with PaxLife whether ELA devices accept schedules at all, and which fields.',
  G9: 'Partial failures: is the per-device replace atomic? A device that fails keeps its old schedule — confirm with PaxLife.',
  G10: 'Active/Inactive: map to the API\'s per-device "enabled" flag, or remove the entries? A device can carry several schedules, so "enabled" can\'t mean one of them.',
  G11: 'Equalizer: the API supports a scheduled equalizer, DATNETISR-264 doesn\'t ask for it. Left out — the equalizer stays a base audio setting.',
};
function Gap({ id }) {
  const { gaps } = useApp();
  if (!gaps) return null;
  return html`
    <${Alert} severity="warning" icon=${false} className="gap" data-gap=${id} sx=${{ mt: 1.5, py: .25 }}>
      <b>${id} · API / requirement gap. </b>${GAP_TEXT[id]}
    <//>`;
}
const PhaseChip = ({ label = 'Not in phase 1' }) => html`<${Chip} size="small" label=${label} className="phase-chip" sx=${{ bgcolor: '#FFF3E0', color: '#E65100' }} />`;
const ActiveChip = ({ s }) => html`<${Chip} size="small" label=${s.active ? 'Active' : 'Inactive'}
  sx=${{ bgcolor: s.active ? '#E8F5E9' : '#F5F5F5', color: s.active ? '#2E7D32' : 'rgba(0,0,0,.6)' }} />`;

/** Device rollout state for one schedule — the list's "Devices" column. */
function applyState(s, phase) {
  const r = reach(s).filter(x => x.useful);
  const skipped = phase === 2 ? r.filter(x => x.d.kind === 'ela').length : 0;
  const total = r.length - skipped;
  if (!s.active || !s.apply) return { kind: 'off', text: '0 devices', total };
  if (s.apply.stale) return { kind: 'stale', text: 'Out of date', total };
  const failed = s.apply.failed.filter(f => !(phase === 2 && (devById(f.id) || {}).kind === 'ela')).length;
  if (failed) return { kind: 'partial', text: `${total - failed} of ${total} devices · ${failed} failed`, total };
  return { kind: 'ok', text: `${total} of ${total} devices${skipped ? ` · ${skipped} ELA skipped` : ''}`, total };
}
const STATE_STYLE = { ok: ['#E8F5E9', '#2E7D32', 'check_circle'], partial: ['#FDECEA', '#C62828', 'error'],
                      stale: ['#FFF3E0', '#E65100', 'sync_problem'], off: ['#F5F5F5', 'rgba(0,0,0,.6)', 'remove_circle_outline'] };
const StateChip = ({ st }) => {
  const [bg, fg, ic] = STATE_STYLE[st.kind];
  return html`<${Chip} size="small" className="apply-chip" data-state=${st.kind} label=${st.text}
    icon=${html`<${Icon} sx=${{ fontSize: 18, color: fg, ml: '6px' }}>${ic}<//>`} sx=${{ bgcolor: bg, color: fg }} />`;
};

/* ── Chrome: N8's navy bar and icon rail ───────────────────────────── */
function TopBar() {
  const { go, screen } = useApp();
  const [anchor, setAnchor] = useState(null);
  const drop = l => html`<${Button} key=${l} color="inherit" sx=${{ textTransform: 'none', fontSize: 14, opacity: .85 }}
                          endIcon=${html`<${Icon} sx=${{ fontSize: 18 }}>expand_more<//>`}>${l}<//>`;
  const sub = html`<${Icon} sx=${{ ml: 'auto', pl: 3 }}>chevron_right<//>`;
  const pick = s => { setAnchor(null); go(s); };
  const sel = (...s) => s.includes(screen);
  /* The Systems menu as captured, plus one proposed line below Devices.
     "Stations ›" and "Devices ›" open submenus in N8 (not captured); here
     they go straight to their lists. */
  return html`
    <${AppBar} position="static" sx=${{ bgcolor: NAVY }}>
      <${Toolbar} sx=${{ gap: .5, minHeight: 48 }}>
        <${Box} aria-label="Israel Railways" role="img" sx=${{ display: 'flex', alignItems: 'center', mr: 2 }}>
          <svg width="30" height="18" viewBox="0 0 40 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round">
            <path d="M3 17c6-11 16-13 25-8"/><path d="M8 21c5-8 13-9.5 20-5.5"/>
          </svg>
        <//>
        ${drop('Maps')}
        ${['Station view', 'Events'].map(l => html`<${Button} key=${l} color="inherit" sx=${{ textTransform: 'none', fontSize: 14, opacity: .85 }}>${l}<//>`)}
        ${drop('Journeys')}
        <${Button} color="inherit" id="nav-systems" aria-haspopup="menu" aria-expanded=${!!anchor}
          onClick=${e => setAnchor(e.currentTarget)}
          endIcon=${html`<${Icon} sx=${{ fontSize: 18 }}>${anchor ? 'expand_less' : 'expand_more'}<//>`}
          sx=${{ textTransform: 'none', fontSize: 14, borderRadius: 0, borderBottom: '2px solid #fff', mb: '-2px' }}>Systems<//>
        <${Menu} anchorEl=${anchor} open=${!!anchor} onClose=${() => setAnchor(null)} id="systems-menu"
          anchorOrigin=${{ vertical: 'bottom', horizontal: 'left' }} MenuListProps=${{ sx: { minWidth: 250 } }}>
          <${MenuItem} disabled>Identity${sub}<//>
          <${MenuItem} data-nav="stations" selected=${sel('stations', 'station')} onClick=${() => pick('stations')}>Stations${sub}<//>
          <${MenuItem} data-nav="devices" selected=${sel('devices', 'device')} onClick=${() => pick('devices')}>Devices${sub}<//>
          <${MenuItem} data-nav="schedules" selected=${sel('schedules', 'schedule')} onClick=${() => pick('schedules')}>Output device schedules<//>
          <${MenuItem} data-nav="types" selected=${sel('types')} onClick=${() => pick('types')}>Device types<//>
          <${MenuItem} disabled>Timetables<//>
          <${MenuItem} disabled>Schema editor<//>
          <${MenuItem} disabled>Message templates<//>
        <//>
        ${drop('Content Management')}
        <${Box} sx=${{ flex: 1 }} />
        <${Box} sx=${{ display: 'flex', alignItems: 'center', gap: .5, bgcolor: 'error.main', color: '#fff',
                       px: 1, py: .25, borderRadius: 1, fontSize: 14, mr: 2 }} aria-label="8 notifications">
          <${Icon} sx=${{ fontSize: 16 }}>notifications<//>8
        <//>
        <${Box} sx=${{ display: 'flex', alignItems: 'center', gap: 1, fontSize: 14 }}>
          <${Icon} sx=${{ fontSize: 22 }}>account_circle<//>John Conar
        <//>
      <//>
    <//>`;
}

function Rail() {
  const icons = [['map', 'Maps'], ['show_chart', 'Analytics'], ['directions_railway', 'Trains'], ['event', 'Schedule'], ['compare_arrows', 'Transfers']];
  return html`
    <${Box} component="nav" aria-label="Sections"
      sx=${{ width: 56, flexShrink: 0, bgcolor: '#fff', borderRight: '1px solid #E7E7E7',
              display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 2, gap: 1.5 }}>
      ${icons.map(([ic, l]) => html`
        <${Tooltip} key=${ic} title=${l} placement="right">
          <${IconButton} aria-label=${l} sx=${{ color: 'text.secondary' }}><${Icon} sx=${{ fontSize: 22 }}>${ic}<//><//>
        <//>`)}
    <//>`;
}

/* The prototype frame, not product chrome: first element, full width, dark.
   Variant + demo states + the gaps toggle. */
function VariantSwitch() {
  const { phase, setPhase, listState, setListState, saveMode, setSaveMode, gaps, setGaps, layout, setLayout } = useApp();
  const btn = (id, on, label, onClick) => html`
    <button id=${id} className=${on ? 'on' : ''} onClick=${onClick}
      style=${{ background: on ? '#fff' : 'none', color: on ? 'rgba(0,0,0,.87)' : 'rgba(255,255,255,.75)',
                border: 'none', fontFamily: 'inherit', fontSize: 14, fontWeight: on ? 500 : 400,
                padding: '4px 10px', borderRadius: 4, cursor: 'pointer', whiteSpace: 'nowrap' }}>${label}</button>`;
  const group = (label, children) => html`
    <span style=${{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style=${{ opacity: .7, fontSize: 14 }}>${label}</span>
      <span style=${{ display: 'flex', gap: 2, background: 'rgba(255,255,255,.1)', borderRadius: 6, padding: 3 }}>${children}</span>
    </span>`;
  return html`
    <div className="variant-switch" id="variant-switch"
      style=${{ display: 'flex', alignItems: 'center', gap: 14, background: '#1b1b1b', color: '#fff', flexWrap: 'wrap',
                padding: '7px 20px', flexShrink: 0, fontSize: 14, fontFamily: 'Roboto, sans-serif' }}>
      ${group('Variant', html`${btn('vs-1', phase === 1, '1 · Target (264)', () => setPhase(1))}${btn('vs-2', phase === 2, '2 · Phase 1, per device', () => setPhase(2))}`)}
      ${group('Layout', html`${btn('lay-full', layout === 'full', 'A · Full page', () => setLayout('full'))}${btn('lay-split', layout === 'split', 'B · List + editor', () => setLayout('split'))}`)}
      ${group('List', ['data', 'empty', 'loading', 'error'].map(k => btn('ls-' + k, listState === k, k[0].toUpperCase() + k.slice(1), () => setListState(k))))}
      ${group('Save', [['ok', 'Succeeds'], ['partial', 'Partial failure'], ['error', 'Fails']].map(([k, l]) => btn('sv-' + k, saveMode === k, l, () => setSaveMode(k))))}
      <span style=${{ marginLeft: 'auto' }}>${btn('p-gaps', gaps, gaps ? 'Hide gaps' : 'Show gaps', () => setGaps(!gaps))}</span>
    </div>`;
}

/** Active switch, shared by the list table and the split rail. */
function listActions({ phase, bump, toast }) {
  return {
    toggle: s => {
      s.active = !s.active;
      const t = applyState(s, phase).total;
      if (s.active) s.apply = { at: 'just now', failed: [] };
      bump();
      toast(s.active ? `"${s.name}" is active — ${t} device${t === 1 ? '' : 's'} updated` : `"${s.name}" is inactive — removed from ${t} device${t === 1 ? '' : 's'}`);
    },
  };
}

/* ══ Screen: schedules list — the one place ════════════════════════════ */
function ScheduleList() {
  const { go, phase, listState, setListState, toast, bump, askDelete } = useApp();
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(listState === 'loading');
  useEffect(() => { setLoading(listState === 'loading'); }, [listState]);

  const n = q.trim().toLowerCase();
  const rows = listState === 'empty' ? [] : SCHEDULES.filter(s => !n || `${s.name} ${targetText(s)}`.toLowerCase().includes(n));
  const { toggle } = listActions(useApp());

  const add = html`<${Button} variant="contained" id="add-btn" startIcon=${html`<${Icon}>add<//>`} onClick=${() => go('schedule', { id: null })}>Add schedule<//>`;
  const cols = ['Name', 'Active', 'Stations', 'Days', 'Time', 'PA action', 'Display action', 'Devices'];

  let body;
  if (listState === 'error') body = html`
    <${Alert} severity="error" id="list-error" action=${html`<${Button} color="inherit" onClick=${() => setListState('data')}>Retry<//>`}>
      Couldn't load schedules. ETC didn't respond — nothing has changed on the devices.
    <//>`;
  else if (loading) body = html`
    <${Paper} variant="outlined" sx=${{ borderColor: '#E7E7E7' }} id="list-loading" aria-busy="true">
      <${Table}><${TableHead}><${TableRow}>${cols.map(c => html`<${TableCell} key=${c}>${c}<//>`)}<${TableCell} /><//><//>
        <${TableBody}>${[0, 1, 2, 3].map(i => html`<${TableRow} key=${i}>${cols.map(c => html`<${TableCell} key=${c}><${Skeleton} width=${c === 'Name' ? 180 : 80} /><//>`)}<${TableCell} /><//>`)}<//>
      <//>
    <//>`;
  else if (!rows.length && !n) body = html`
    <${Paper} variant="outlined" id="list-empty" sx=${{ borderColor: '#E7E7E7', py: 7, textAlign: 'center' }}>
      <${Icon} sx=${{ fontSize: 44, color: 'rgba(0,0,0,.38)' }}>event_repeat<//>
      <${Typography} variant="subtitle1" sx=${{ mt: 1, fontWeight: 500 }}>No schedules yet<//>
      <${Typography} variant="body2" color="text.secondary" sx=${{ mt: .5, mb: 2, maxWidth: 520, mx: 'auto' }}>
        A schedule darkens displays or changes PA volume at set times, for a station group or for the stations you choose.
      <//>
      ${add}
    <//>`;
  else body = html`
    <${Paper} variant="outlined" sx=${{ borderColor: '#E7E7E7' }}>
      <${TableContainer}>
        <${Table} id="s-table">
          <${TableHead}><${TableRow}>${cols.map(c => html`<${TableCell} key=${c}>${c}<//>`)}<${TableCell} align="right" aria-label="Actions" /><//><//>
          <${TableBody}>
            ${rows.length ? rows.map(s => {
              const st = applyState(s, phase);
              return html`
                <${TableRow} key=${s.id} hover data-schedule=${s.id} sx=${{ cursor: 'pointer' }} onClick=${() => go('schedule', { id: s.id })}>
                  <${TableCell} sx=${{ fontWeight: 500 }}>${s.name}<//>
                  <${TableCell} onClick=${e => e.stopPropagation()}>
                    <${Switch} size="small" checked=${s.active} inputProps=${{ 'aria-label': `Active: ${s.name}` }} data-toggle=${s.id} onChange=${() => toggle(s)} />
                  <//>
                  <${TableCell}>${targetText(s)}<//>
                  <${TableCell}>${daysText(s)}${phase === 2 && s.holidays ? html` <${PhaseChip} label="Holidays: phase 2" />` : null}<//>
                  <${TableCell} sx=${{ whiteSpace: 'nowrap' }}>${timeText(s)}<//>
                  <${TableCell} sx=${{ whiteSpace: 'nowrap' }}>${paText(s)}<//>
                  <${TableCell} sx=${{ whiteSpace: 'nowrap' }}>${displayText(s)}<//>
                  <${TableCell}>
                    <${StateChip} st=${st} />
                  <//>
                  <${TableCell} align="right" sx=${{ whiteSpace: 'nowrap', py: 0 }}>
                    <${RowIcon} icon="edit" label=${'Edit ' + s.name} onClick=${() => go('schedule', { id: s.id })} />
                    <${RowIcon} icon="delete" label=${'Delete ' + s.name} onClick=${() => askDelete(s)} />
                  <//>
                <//>`;
            }) : html`<${TableRow}><${TableCell} colSpan=${cols.length + 1} align="center" sx=${{ py: 4, color: 'text.secondary' }}>No schedules match "${q}".<//><//>`}
          <//>
        <//>
      <//>
    <//>`;

  return html`
    <${Box}>
      <${Box} sx=${{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <${Typography} variant="h6" id="page-title" sx=${{ mr: 1 }}>Output device schedules<//>
        <${TextField} id="q" hiddenLabel placeholder="Search" value=${q} sx=${{ width: 280 }}
          inputProps=${{ 'aria-label': 'Search schedules' }} onChange=${e => setQ(e.target.value)}
          InputProps=${{ endAdornment: html`<${InputAdornment} position="end"><${Icon} sx=${{ color: 'text.secondary' }}>search<//><//>` }} />
        <${Box} sx=${{ flex: 1 }} />
        ${add}
      <//>
      ${phase === 2 ? html`<${Typography} variant="body2" color="text.secondary" sx=${{ mt: -1, mb: 2 }} id="phase-line">
        Phase 1: ETC keeps these schedules, resolves each one to its devices and writes every device's weekly schedule through the PaxLife API.<//>` : null}
      ${body}
      <${Gap} id="G1" />
    <//>`;
}

/* ── Stations field — the visual of N8's Event details picker ──────────
   Groups first (tri-state checkbox, member count, chevron to see members),
   then single stations. A picked group is one chip "Name (n)". */
function StationPicker({ groups, stations, onChange, error }) {
  const [open, setOpen] = useState({});
  const value = [...groups.map(g => 'g:' + g), ...stations.map(c => 's:' + c)];
  const options = [];
  GROUPS.forEach(g => {
    options.push('g:' + g.id);
    if (open[g.id]) g.stations.forEach(c => options.push(`m:${g.id}:${c}`));
  });
  [...STATIONS].sort((a, b) => a.name.localeCompare(b.name)).forEach(st => options.push('s:' + st.code));
  const label = k => {
    const [t, a, b] = k.split(':');
    return t === 'g' ? groupName(a) : stName(t === 'm' ? b : a);
  };
  const toggle = k => {
    const [t, a, b] = k.split(':');
    if (t === 'g') onChange(groups.includes(a) ? groups.filter(x => x !== a) : [...groups, a], stations);
    else { const c = t === 'm' ? b : a; onChange(groups, stations.includes(c) ? stations.filter(x => x !== c) : [...stations, c]); }
  };
  const box = (checked, indeterminate, disabled) => html`<${M.Checkbox} size="small" checked=${checked} indeterminate=${indeterminate}
    disabled=${disabled} sx=${{ p: .5, mr: 1 }} tabIndex=${-1} />`;
  return html`
    <${Autocomplete} multiple id="ed-stations" options=${options} value=${value} disableCloseOnSelect
      getOptionLabel=${label} isOptionEqualToValue=${(o, v) => o === v}
      getOptionDisabled=${o => o.startsWith('m:') && groups.includes(o.split(':')[1])}
      filterOptions=${(opts, st) => { const q = st.inputValue.trim().toLowerCase(); return q ? opts.filter(o => label(o).toLowerCase().includes(q)) : opts; }}
      onChange=${(e, v, reason, det) => {
        if (reason === 'clear') { onChange([], []); return; }
        if (det && det.option) toggle(det.option);
      }}
      renderTags=${(v, getTagProps) => v.map((k, i) => {
        const { key, ...tp } = getTagProps({ index: i });
        const [t, a] = k.split(':');
        return html`<${Chip} key=${k} size="small" ...${tp} data-chip=${k} label=${t === 'g' ? `${groupName(a)} (${groupSize(a)})` : stName(a)} />`;
      })}
      renderOption=${(props, k) => {
        const { key, ...rest } = props;
        const [t, a, b] = k.split(':');
        if (t === 'g') {
          const g = GROUPS.find(x => x.id === a);
          const on = groups.includes(a);
          const some = !on && g.stations.some(c => stations.includes(c));
          return html`<li key=${k} ...${rest} data-opt=${k} style=${{ display: 'flex', alignItems: 'center' }}>
            ${box(on, some)}<b>${g.name}</b><${Typography} component="span" variant="body2" color="text.secondary" sx=${{ ml: .75 }}>(${g.stations.length})<//>
            <${IconButton} sx=${{ ml: 'auto' }} aria-label=${(open[a] ? 'Hide' : 'Show') + ' stations in ' + g.name} data-expand=${a}
              onMouseDown=${e => { e.preventDefault(); e.stopPropagation(); }}
              onClick=${e => { e.stopPropagation(); setOpen(o => ({ ...o, [a]: !o[a] })); }}>
              <${Icon}>${open[a] ? 'expand_less' : 'expand_more'}<//>
            <//>
          </li>`;
        }
        if (t === 'm') {
          const viaGroup = groups.includes(a);
          return html`<li key=${k} ...${rest} data-opt=${k} style=${{ paddingLeft: 48 }}>
            ${box(viaGroup || stations.includes(b), false, viaGroup)}${stName(b)}
          </li>`;
        }
        return html`<li key=${k} ...${rest} data-opt=${k}>${box(stations.includes(a), false)}${stName(a)}</li>`;
      }}
      renderInput=${p => html`<${TextField} ...${p} label="Stations" required error=${!!error}
        helperText=${error || ''} />`} />`;
}

/* ══ Layout B: list + editor on one page ════════════════════════════════
   From the manager's DATNETISR-1036 concept: the list stays in view while
   editing. Same editor, same guard — picking another schedule with unsaved
   changes asks first. */
function SplitSchedules() {
  const app = useApp();
  const { go, target, screen, phase, listState, setListState } = app;
  const { toggle } = listActions(app);
  const [q, setQ] = useState('');
  const [savedId, setSavedId] = useState(null);
  const all = listState === 'empty' ? [] : SCHEDULES;
  const n = q.trim().toLowerCase();
  const rows = all.filter(s => !n || `${s.name} ${targetText(s)}`.toLowerCase().includes(n));
  const sel = screen === 'schedule' && target ? target : (all[0] ? { id: all[0].id } : null);
  const selKey = sel ? (sel.id || 'new:' + JSON.stringify(sel.preset || {})) : 'none';
  useEffect(() => setSavedId(null), [selKey]);
  const current = (sel && sel.id) || savedId;
  const loading = listState === 'loading';
  const add = html`<${Button} variant="contained" id="add-btn" startIcon=${html`<${Icon}>add<//>`} onClick=${() => go('schedule', { id: null })}>Add schedule<//>`;

  return html`
    <${Box}>
      <${Box} sx=${{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <${Typography} variant="h6" id="page-title">Output device schedules<//>
        <${Box} sx=${{ flex: 1 }} />${add}
      <//>
      ${listState === 'error' ? html`
        <${Alert} severity="error" id="list-error" action=${html`<${Button} color="inherit" onClick=${() => setListState('data')}>Retry<//>`}>
          Couldn't load schedules. ETC didn't respond — nothing has changed on the devices.
        <//>` : html`
      <${Box} id="split" sx=${{ display: 'grid', gridTemplateColumns: '360px minmax(0, 1fr)', gap: 2, alignItems: 'start' }}>
        <${Paper} variant="outlined" id="rail" sx=${{ borderColor: '#E7E7E7', position: 'sticky', top: 16 }}>
          <${Box} sx=${{ p: 1.5, borderBottom: '1px solid #E7E7E7' }}>
            <${TextField} id="q" hiddenLabel placeholder="Search" value=${q} fullWidth
              inputProps=${{ 'aria-label': 'Search schedules' }} onChange=${e => setQ(e.target.value)}
              InputProps=${{ endAdornment: html`<${InputAdornment} position="end"><${Icon} sx=${{ color: 'text.secondary' }}>search<//><//>` }} />
          <//>
          ${loading ? html`<${Box} id="list-loading" aria-busy="true">${[0, 1, 2, 3].map(i => html`
              <${Box} key=${i} sx=${{ px: 2, py: 1.5, borderBottom: '1px solid #E7E7E7' }}><${Skeleton} width="70%" /><${Skeleton} width="90%" /><${Skeleton} width="40%" /><//>`)}<//>`
          : !all.length ? html`
            <${Box} id="list-empty" sx=${{ px: 2, py: 5, textAlign: 'center' }}>
              <${Icon} sx=${{ fontSize: 40, color: 'rgba(0,0,0,.38)' }}>event_repeat<//>
              <${Typography} variant="subtitle1" sx=${{ mt: 1, fontWeight: 500 }}>No schedules yet<//>
              <${Typography} variant="body2" color="text.secondary" sx=${{ mt: .5 }}>A schedule darkens displays or changes PA volume at set times, for a station group or for the stations you choose.<//>
            <//>`
          : rows.length ? rows.map(s => {
            const st = applyState(s, phase);
            const on = s.id === current;
            return html`
              <${Box} key=${s.id} data-rail=${s.id} role="button" tabIndex=${0} aria-current=${on ? 'true' : undefined}
                onClick=${() => go('schedule', { id: s.id })}
                onKeyDown=${e => { if (e.key === 'Enter') go('schedule', { id: s.id }); }}
                sx=${{ px: 2, py: 1.5, borderBottom: '1px solid #E7E7E7', cursor: 'pointer',
                       bgcolor: on ? '#E3F2FD' : '#fff', boxShadow: on ? 'inset 3px 0 #2196F3' : 'none',
                       '&:hover': { bgcolor: on ? '#E3F2FD' : '#F7F9FC' } }}>
                <${Box} sx=${{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <${Typography} variant="body2" sx=${{ fontWeight: 500, flex: 1, fontSize: 15 }}>${s.name}<//>
                  <${Box} onClick=${e => e.stopPropagation()}>
                    <${Switch} size="small" checked=${s.active} inputProps=${{ 'aria-label': `Active: ${s.name}` }} data-toggle=${s.id} onChange=${() => toggle(s)} />
                  <//>
                <//>
                <${Typography} variant="body2" color="text.secondary">${targetText(s)} · ${daysText(s)} · ${timeText(s)}<//>
                <${Typography} variant="body2" color="text.secondary">PA: ${paText(s)} · Displays: ${displayText(s)}<//>
                <${Box} sx=${{ mt: .75, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <${StateChip} st=${st} />
                <//>
              <//>`;
          }) : html`<${Typography} variant="body2" color="text.secondary" sx=${{ p: 2 }}>No schedules match "${q}".<//>`}
        <//>
        <${Box} id="split-editor" sx=${{ minWidth: 0 }}>
          ${loading ? null : sel
            ? html`<${ScheduleEditor} key=${selKey} tgt=${sel} embedded=${true} onSaved=${setSavedId} />`
            : html`<${Paper} variant="outlined" sx=${{ borderColor: '#E7E7E7', p: 4, textAlign: 'center' }}>
                <${Typography} variant="body2" color="text.secondary">Add a schedule to start.<//><//>`}
        <//>
      <//>`}
      <${Gap} id="G1" />
    <//>`;
}

/* ══ Screen: schedule editor — the only editor ═════════════════════════ */
const blank = preset => ({ id: null, name: '', active: true, groups: [],
  stations: preset && preset.station ? [preset.station] : [], days: [], holidays: false, start: '', end: '',
  pa: 'none', paPct: 50, display: 'none', apply: null });

function validate(d) {
  const e = {};
  if (!d.name.trim()) e.name = 'Name is required';
  else if (SCHEDULES.some(s => s.id !== d.id && s.name.trim().toLowerCase() === d.name.trim().toLowerCase())) e.name = 'A schedule with this name already exists';
  if (!d.groups.length && !d.stations.length) e.target = 'Choose at least one station or station group';
  if (!d.days.length && !d.holidays) e.days = 'Choose at least one day';
  if (toMin(d.start) == null) e.start = d.start.trim() ? 'Use 24-hour hh:mm, e.g. 23:30' : 'Start time is required';
  if (toMin(d.end) == null) e.end = d.end.trim() ? 'Use 24-hour hh:mm, e.g. 05:00' : 'End time is required';
  if (!e.start && !e.end && toMin(d.start) === toMin(d.end)) e.end = 'End time must differ from start time';
  if (d.pa === 'none' && d.display === 'none') e.action = 'Choose a PA or a display action — with both left unchanged, the schedule does nothing.';
  if (d.pa === 'adjust' && !(Number(d.paPct) >= 0 && Number(d.paPct) <= 100)) e.pa = 'Choose a volume from 0 to 100%';
  return e;
}

function ScheduleEditor({ tgt, embedded, onSaved }) {
  const ctx = useApp();
  const { go, phase, saveMode, toast, bump, askDelete, setDirty } = ctx;
  const target = tgt || ctx.target;
  const src = target.id ? SCHEDULES.find(s => s.id === target.id) : null;
  const [d, setD] = useState(() => src ? JSON.parse(JSON.stringify(src)) : blank(target.preset));
  const [saved, setSaved] = useState(() => JSON.stringify(src || blank(target.preset)));
  const [tried, setTried] = useState(false);
  const [run, setRun] = useState(null);         // { phase: 'applying'|'done'|'error', done, total, failed }
  const [showDev, setShowDev] = useState(false);
  const set = patch => setD(p => ({ ...p, ...patch }));
  const dirty = JSON.stringify({ ...d, apply: null }) !== JSON.stringify({ ...JSON.parse(saved), apply: null });
  useEffect(() => { setDirty(dirty); return () => setDirty(false); }, [dirty]);

  const errs = tried ? validate(d) : {};
  const nErr = Object.keys(errs).length;
  const r = reach(d);
  const useful = r.filter(x => x.useful);
  const skipped = phase === 2 ? useful.filter(x => x.d.kind === 'ela') : [];
  const applyTo = useful.filter(x => !skipped.includes(x));
  const ov = (d.days.length || d.holidays) && toMin(d.start) != null && toMin(d.end) != null ? overlapsWith(d) : [];
  const timer = useRef(null);
  useEffect(() => () => clearInterval(timer.current), []);

  const startApply = (devs, retry) => {
    const total = devs.length;
    setRun({ phase: 'applying', done: 0, total });
    let done = 0;
    clearInterval(timer.current);
    timer.current = setInterval(() => {
      done = Math.min(total, done + Math.max(1, Math.ceil(total / 6)));
      if (done < total) { setRun({ phase: 'applying', done, total }); return; }
      clearInterval(timer.current);
      let failed = [];
      if (saveMode === 'partial') {
        failed = devs.filter(x => x.d.kind === 'ela').map(x => ({ id: x.d.id, reason: 'PaxLife rejected the schedule — field "volume" not supported on this device type' }));
        const offline = devs.find(x => x.d.kind === 'barix');
        if (offline && !retry) failed.push({ id: offline.d.id, reason: 'Device offline — PaxLife didn\'t answer within 30 s' });
      }
      const rec = SCHEDULES.find(s => s.id === ddRef.current.id);
      if (rec) rec.apply = { at: 'just now', failed };
      bump();
      setRun({ phase: 'done', done: total, total, failed, retry });
    }, 260);
  };
  const ddRef = useRef(d);
  const save = () => {
    setTried(true);
    if (Object.keys(validate(d)).length) return;
    if (saveMode === 'error') {
      setRun({ phase: 'applying', done: 0, total: applyTo.length });
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setRun({ phase: 'error' }), 700);
      return;
    }
    const out = JSON.parse(JSON.stringify(d));
    if (!out.id) { out.id = 's' + Date.now(); SCHEDULES.push(out); if (onSaved) onSaved(out.id); }
    else Object.assign(SCHEDULES.find(s => s.id === out.id), out);
    ddRef.current = out;
    setD(out); setSaved(JSON.stringify(out)); setDirty(false);
    if (!out.active) { bump(); setRun({ phase: 'done', done: 0, total: 0, failed: [], inactive: true }); return; }
    startApply(applyTo);
  };
  const retry = () => { ddRef.current = d; startApply(applyTo.filter(x => run.failed.some(f => f.id === x.d.id)), true); };

  const isNew = !d.id || !SCHEDULES.some(s => s.id === d.id);
  const recNow = SCHEDULES.find(s => s.id === d.id);
  const stale = recNow && recNow.active && recNow.apply && recNow.apply.stale;
  const title = isNew ? 'New schedule' : (JSON.parse(saved).name || 'Schedule');
  const crumbs = [{ label: 'Output device schedules', onClick: () => go('schedules') }, { label: isNew ? 'New schedule' : 'Schedule details' }];
  const kinds = k => useful.filter(x => x.d.kind === k).length;

  return html`
    <${Box} sx=${{ minWidth: 0 }}>
      <${PageHeader} crumbs=${embedded ? null : crumbs} title=${title} titleId="ed-title"
        action=${html`
          ${!isNew ? html`<${Button} variant="outlined" color="error" id="ed-del" startIcon=${html`<${Icon}>delete<//>`}
            onClick=${() => askDelete(SCHEDULES.find(s => s.id === d.id), () => go('schedules'))}>Delete schedule<//>` : null}
          <${Button} variant="contained" id="ed-save" disabled=${run && run.phase === 'applying'} onClick=${save}>Save<//>`} />

      ${phase === 2 ? html`<${Typography} variant="body2" color="text.secondary" sx=${{ mt: -1, mb: 2 }} id="phase-line">
        Phase 1: on Save, ETC writes the result into each device's weekly schedule through the PaxLife API, replacing what was there.<//>` : null}

      <${Box} id="status-area">
        ${stale && !run ? html`
          <${Alert} severity="warning" id="stale-alert" sx=${{ mb: 2 }}>
            <${AlertTitle}>Out of date — stations changed since the last save (${stale.on})<//>
            ${stale.added.map(a => html`<div key=${'a' + a.station} data-stale="added">Added to ${groupName(a.group)}: <b>${stName(a.station)}</b> — ${DEVICES.filter(x => x.station === a.station).length} device${DEVICES.filter(x => x.station === a.station).length === 1 ? '' : 's'}</div>`)}
            ${stale.removed.map(r => html`<div key=${'r' + r.name} data-stale="removed">Removed: <b>${r.name}</b> (${stName(r.station)}) — ${r.why}</div>`)}
            <div style=${{ marginTop: 4 }}>Save to update the devices.</div>
          <//>` : null}
        ${nErr ? html`<${Alert} severity="error" id="err-summary" sx=${{ mb: 2 }}>Fix ${nErr} field${nErr > 1 ? 's' : ''} before saving — nothing has been sent to the devices.<//>` : null}
        ${run && run.phase === 'applying' ? html`
          <${Alert} severity="info" icon=${false} id="applying" sx=${{ mb: 2 }}>
            <b>Saving…</b> ${run.total ? `${run.done} of ${run.total} devices updated` : ''}
            <${LinearProgress} variant=${run.total ? 'determinate' : 'indeterminate'} value=${run.total ? run.done / run.total * 100 : 0} sx=${{ mt: 1 }} />
          <//>` : null}
        ${run && run.phase === 'error' ? html`
          <${Alert} severity="error" id="save-error" sx=${{ mb: 2 }} action=${html`<${Button} color="inherit" onClick=${save}>Try again<//>`}>
            <${AlertTitle}>Couldn't save the schedule<//>
            ETC didn't respond. Nothing was sent to the devices, and your changes are still here.
          <//>` : null}
        ${run && run.phase === 'done' && run.inactive ? html`
          <${Alert} severity="success" id="save-result" sx=${{ mb: 2 }}>Saved — inactive, removed from all devices.<//>` : null}
        ${run && run.phase === 'done' && !run.inactive ? (run.failed.length ? html`
          <${Alert} severity="warning" id="save-result" data-result="partial" sx=${{ mb: 2 }}
            action=${html`<${Button} color="inherit" id="retry-failed" onClick=${retry}>Retry failed<//>`}>
            <${AlertTitle}>Saved — ${run.total - run.failed.length} of ${run.total} devices updated, ${run.failed.length} failed<//>
            <${Box} component="ul" sx=${{ m: 0, pl: 2.5 }}>
              ${run.failed.map(f => html`<li key=${f.id} data-failed=${f.id}><b>${(devById(f.id) || {}).name}</b> (${stName((devById(f.id) || {}).station)}) — ${f.reason}<//>`)}
            <//>
            <${Typography} variant="body2" sx=${{ mt: .5 }}>The other devices already run the new schedule. A failed device keeps its previous schedule.<//>
          <//>` : html`
          <${Alert} severity="success" id="save-result" data-result="ok" sx=${{ mb: 2 }}>
            Saved — ${run.total} of ${run.total} device${run.total === 1 ? '' : 's'} updated${skipped.length ? ` · ${skipped.length} ELA speaker${skipped.length > 1 ? 's' : ''} skipped (phase 1)` : ''}.
          <//>`) : null}
        <${Gap} id="G9" />
      <//>

      ${/* Compact, like N8's Event details (Ignat's sketches, 2026-10-05):
            one field row on top, Stations | Schedule side by side, then Actions.
            No helper sentences — "highly professional software". */ ''}
      <${SectionCard} id="card-general">
        <${Box} sx=${{ display: 'flex', gap: 3, alignItems: 'center' }}>
          <${TextField} id="ed-name" label="Schedule name" required value=${d.name} sx=${{ flex: 1 }}
            error=${!!errs.name} helperText=${errs.name || ''} onChange=${e => set({ name: e.target.value })} />
          <${FormControlLabel} id="ed-active-label" sx=${{ flexShrink: 0, mr: 0 }}
            label="Schedule active"
            control=${html`<${Switch} id="ed-active" checked=${d.active} onChange=${e => set({ active: e.target.checked })} />`} />
        <//>
        <${Gap} id="G10" />
      <//>

      <${Box} sx=${{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 7fr) minmax(400px, 5fr)' }, gap: 2, alignItems: 'start' }}>
        <${SectionCard} title=${`Stations (${targetStations(d).length})`} id="card-targets"
          action=${html`<${Tooltip} title="Map view — not part of this prototype"><span>
            <${IconButton} disabled aria-label="Show on map"><${Icon}>map<//><//></span><//>`}>
          <${StationPicker} groups=${d.groups} stations=${d.stations} error=${errs.target}
            onChange=${(groups, stations) => set({ groups, stations })} />
          ${r.length ? html`
            <${Box} id="reach" sx=${{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <${Typography} variant="body2" color="text.secondary" id="reach-summary">
                Reaches <b>${applyTo.length} device${applyTo.length === 1 ? '' : 's'}</b>: ${kinds('display')} display${kinds('display') === 1 ? '' : 's'} · ${kinds('barix')} Barix · ${kinds('ela')} ELA${skipped.length ? ` (${skipped.length} skipped in phase 1)` : ''}
              <//>
              <${Button} size="small" id="toggle-devices" onClick=${() => setShowDev(!showDev)}>${showDev ? 'Hide devices' : 'Show devices'}<//>
            <//>
            <${Collapse} in=${showDev} unmountOnExit>
              <${Paper} variant="outlined" sx=${{ mt: 1, borderColor: '#E7E7E7' }}>
                <${Table} id="reach-table">
                  <${TableHead}><${TableRow}><${TableCell}>Device<//><${TableCell}>Type<//><${TableCell}>Station<//><${TableCell}>Gets<//><//><//>
                  <${TableBody}>
                    ${r.map(x => html`
                      <${TableRow} key=${x.d.id} data-reach=${x.d.id}>
                        <${TableCell}><${Link} component="button" underline="hover" onClick=${() => go('device', { id: x.d.id })}>${x.d.name}<//><//>
                        <${TableCell}>${x.d.type}<//>
                        <${TableCell}>${stName(x.d.station)}<//>
                        <${TableCell}>${phase === 2 && x.d.kind === 'ela' && x.useful
                          ? html`<${PhaseChip} label="Skipped — ELA not confirmed" />`
                          : x.useful ? onDevice(d, x.d) : '–'}
                          ${phase === 1 && x.d.kind === 'ela' && x.useful ? html` <${Chip} size="small" label="To confirm with PaxLife" variant="outlined" />` : null}<//>
                      <//>`)}
                  <//>
                <//>
              <//>
            <//>` : null}
          <${Gap} id="G6" />
          <${Gap} id="G8" />
        <//>

        <${SectionCard} title="Schedule" id="card-timing">
          <${Box} id="ed-days" sx=${{ display: 'flex', flexWrap: 'wrap', gap: .75 }} role="group" aria-label="Days">
            ${DAYS.map(([k, l]) => {
              const on = d.days.includes(k);
              return html`<${Chip} key=${k} data-day=${k} label=${l} aria-pressed=${on} clickable
                color=${on ? 'primary' : 'default'} onClick=${() => set({ days: on ? d.days.filter(x => x !== k) : [...d.days, k] })}
                sx=${{ borderRadius: 1, fontWeight: 500, minWidth: 46 }} />`;
            })}
            <${Chip} id="ed-holidays" label="Holidays" aria-pressed=${d.holidays && phase === 1} aria-disabled=${phase === 2} clickable disabled=${phase === 2}
              color=${d.holidays && phase === 1 ? 'primary' : 'default'} onClick=${() => set({ holidays: !d.holidays })}
              sx=${{ borderRadius: 1, fontWeight: 500 }} />
          <//>
          ${phase === 2 ? html`<${Box} sx=${{ mt: 1 }}><${PhaseChip} label="Holidays: not in phase 1" /><//>` : null}
          ${errs.days ? html`<${Typography} variant="body2" color="error" sx=${{ mt: .75 }} id="days-help">${errs.days}<//>` : null}
          <${Gap} id="G2" />
          <${Box} sx=${{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 2 }}>
            <${TextField} id="ed-start" label="Start time" required value=${d.start} placeholder="hh:mm"
              inputProps=${{ inputMode: 'numeric', maxLength: 5 }}
              InputProps=${{ endAdornment: html`<${InputAdornment} position="end"><${Icon} sx=${{ color: 'text.secondary' }}>schedule<//><//>` }}
              error=${!!errs.start} helperText=${errs.start || ''} onChange=${e => set({ start: e.target.value })} />
            <${TextField} id="ed-end" label="End time" required value=${d.end} placeholder="hh:mm"
              inputProps=${{ inputMode: 'numeric', maxLength: 5 }}
              InputProps=${{ endAdornment: html`<${InputAdornment} position="end"><${Icon} sx=${{ color: 'text.secondary' }}>schedule<//><//>` }}
              error=${!!errs.end} helperText=${errs.end || ''} onChange=${e => set({ end: e.target.value })} />
          <//>
          ${overnight(d) ? html`<${Chip} id="overnight" size="small" sx=${{ mt: 1.5, bgcolor: '#EDE7F6', color: '#4527A0' }}
            icon=${html`<${Icon} sx=${{ fontSize: 18, ml: '6px', color: '#4527A0' }}>bedtime<//>`} label=${`Overnight · ends next day ${d.end}`} />` : null}
          ${ov.length ? html`
            <${Alert} severity="warning" id="overlap" sx=${{ mt: 1.5 }}>
              Overlaps ${ov.map((o, i) => html`<span key=${o.s.id}>${i ? ', ' : ''}<b>${o.s.name}</b> (${o.shared} device${o.shared > 1 ? 's' : ''})</span>`)}
            <//>` : null}
          <${Gap} id="G3" />
          ${ov.length ? html`<${Gap} id="G5" />` : null}
        <//>
      <//>

      <${SectionCard} title="Actions" id="card-actions">
        ${errs.action ? html`<${Alert} severity="error" id="action-error" sx=${{ mb: 2 }}>${errs.action}<//>` : null}
        <${Box} sx=${{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, alignItems: 'start' }}>
          <${Box} id="pa-block">
            <${FormControl} fullWidth>
              <${InputLabel} id="ed-pa-label">PA action<//>
              <${Select} id="ed-pa" labelId="ed-pa-label" label="PA action" value=${d.pa} onChange=${e => set({ pa: e.target.value })}>
                <${MenuItem} value="none">No action<//>
                <${MenuItem} value="adjust">Set volume<//>
              <//>
            <//>
            ${d.pa === 'adjust' ? html`
              <${Box} sx=${{ mt: 2, px: 1 }}>
                <${Typography} variant="body2" id="vol-value">Volume <b>${Number(d.paPct) === 0 ? 'Mute (0%)' : d.paPct + '%'}</b><//>
                <${Slider} id="ed-vol" value=${Number(d.paPct) || 0} min=${0} max=${100} step=${5} aria-label="Volume"
                  valueLabelDisplay="auto" marks=${[{ value: 0, label: '0%' }, { value: 100, label: '100%' }]}
                  onChange=${(e, v) => set({ paPct: v })} sx=${{ '& .MuiSlider-markLabel': { fontSize: 14 } }} />
                ${errs.pa ? html`<${Typography} variant="body2" color="error">${errs.pa}<//>` : null}
              <//>` : null}
            <${Gap} id="G4" />
          <//>
          <${Box} id="display-block">
            <${FormControl} fullWidth>
              <${InputLabel} id="ed-display-label">Display action<//>
              <${Select} id="ed-display" labelId="ed-display-label" label="Display action" value=${d.display} onChange=${e => set({ display: e.target.value })}>
                <${MenuItem} value="none">No action<//>
                <${MenuItem} value="darken">Darken all displays<//>
              <//>
            <//>
            <${Gap} id="G7" />
          <//>
        <//>
        <${Gap} id="G11" />
      <//>
    <//>`;
}

/* ══ Screen: Device list (captured columns) + a Schedules column ═══════ */
function DeviceList() {
  const { go, phase } = useApp();
  const count = d => SCHEDULES.filter(s => s.active && reach(s).some(x => x.d.id === d.id && x.useful)).length;
  const cols = ['Device Name', 'Device ID', 'Device Type', 'Status', 'Network Address (Primary)', 'Station', 'Output Zone', 'Schedules'];
  return html`
    <${Box}>
      <${Box} sx=${{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <${Typography} variant="h6" id="page-title">Device list<//>
        <${Box} sx=${{ flex: 1 }} />
      <//>
      <${Paper} variant="outlined" sx=${{ borderColor: '#E7E7E7' }}>
        <${TableContainer}>
          <${Table} id="d-table">
            <${TableHead}><${TableRow}>${cols.map(c => html`<${TableCell} key=${c}>${c}<//>`)}<//><//>
            <${TableBody}>
              ${DEVICES.map(d => html`
                <${TableRow} key=${d.id} hover data-device=${d.id} sx=${{ cursor: 'pointer' }} onClick=${() => go('device', { id: d.id })}>
                  <${TableCell}>${d.name}<//><${TableCell}>${d.id}<//>
                  <${TableCell}><${Box} component="span" sx=${{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                    <${Icon} sx=${{ fontSize: 22, color: 'text.secondary' }}>${d.kind === 'display' ? 'desktop_windows' : 'speaker'}<//>${d.type}<//><//>
                  <${TableCell}><${Chip} size="small" label="Active" sx=${{ bgcolor: '#E8F5E9', color: '#2E7D32' }} /><//>
                  <${TableCell}>${d.net}<//><${TableCell}>${d.station}<//><${TableCell}>${d.zone}<//>
                  <${TableCell} data-count>${count(d) || '–'}<//>
                <//>`)}
            <//>
          <//>
        <//>
      <//>
    <//>`;
}

/* ══ Screen: Device details — device-level view, read-only schedules ════ */
function DeviceDetail() {
  const { go, target, phase, toast, bump, setDirty } = useApp();
  const d = devById(target.id);
  const [base, setBase] = useState(() => d.base ? { ...d.base } : null);
  const dirty = !!base && base.eq !== d.base.eq;
  const audio = d.kind !== 'display';
  const sa = stAudio(d.station);
  useEffect(() => { setDirty(dirty); return () => setDirty(false); }, [dirty]);
  const scheds = SCHEDULES.filter(s => reach(s).some(x => x.d.id === d.id && x.useful));
  const entries = plainEntries(d);
  const { gaps } = useApp();
  const save = () => { if (base) { d.base = { eq: base.eq }; } bump(); setDirty(false); toast('Device saved'); go('devices'); };
  const via = s => viaText(s, d.station).replace('This station', 'Station · ' + stName(d.station));

  return html`
    <${Box}>
      <${PageHeader} crumbs=${[{ label: 'Devices', onClick: () => go('devices') }, { label: 'Device details' }]} title=${d.name} titleId="dv-title"
        action=${html`
          <${Button} variant="outlined" startIcon=${html`<${Icon}>content_copy<//>`} onClick=${() => toast('Device URL copied')}>Copy device URL<//>
          <${Button} variant="contained" id="dv-save" onClick=${save}>Save<//>`} />
      <${SectionCard} title="General">
        <${FieldGrid}>
          <${TextField} label="Device Name" required value=${d.name} disabled />
          <${TextField} label="Device ID" required value=${d.id} disabled />
          <${TextField} label="Device Type" required value=${d.type} disabled />
          <${TextField} label="Version" value="" disabled />
        <//>
      <//>
      <${SectionCard} title="Hardware">
        <${FieldGrid} cols=${3}><${TextField} label="Network Address (Primary)" required value=${d.net} disabled /><${TextField} label="Network Address (Secondary)" value="" disabled /><//>
      <//>
      <${SectionCard} title="Location" note=${html`View only. You can apply location in <${Link} component="button" underline="hover" onClick=${() => go('station', { code: d.station })} sx=${{ verticalAlign: 'baseline' }}>Station details<//>.`}>
        <${FieldGrid} cols=${3}><${TextField} label="Station" value=${stLabel(d.station)} disabled /><${TextField} label="Output zone" value=${d.zone} disabled /><//>
      <//>

      ${audio ? html`
        <${SectionCard} title="Base audio settings" id="card-base"
          chip=${html`<${Chip} size="small" label="Persistent — not scheduled" icon=${html`<${Icon} sx=${{ fontSize: 18, ml: '6px' }}>push_pin<//>`} />`}
          note=${html`Default volume is set per station in <${Link} component="button" underline="hover" id="dv-station-audio" onClick=${() => go('station', { code: d.station, tab: 'audio' })} sx=${{ verticalAlign: 'baseline' }}>Station details<//>.`}>
          <${FieldGrid} cols=${3}>
            <${TextField} id="dv-vol" label=${`Default volume — station ${d.station}`} value=${sa.volume + '%'} disabled />
            ${d.kind === 'barix' ? html`
              <${FormControl}>
                <${InputLabel} id="dv-eq-label">Equalizer<//>
                <${Select} id="dv-eq" labelId="dv-eq-label" label="Equalizer" value=${base.eq} onChange=${e => setBase({ ...base, eq: e.target.value })}>
                  ${['Speech', 'Music', 'Flat'].map(x => html`<${MenuItem} key=${x} value=${x}>${x}<//>`)}
                <//>
              <//>` : null}
          <//>
        <//>` : null}

      <${SectionCard} title="Schedules" id="card-schedules"
        note=${html`Schedules that reach this device. They're edited in <${Link} component="button" underline="hover" onClick=${() => go('schedules')} sx=${{ verticalAlign: 'baseline' }}>Output device schedules<//> — one editor for every station and device.`}>
        ${d.kind === 'ela' ? html`<${Alert} severity="info" sx=${{ mb: 1.5 }} id="ela-note">ELA speaker: PA actions only${phase === 2 ? ' — skipped in phase 1 until PaxLife confirms ELA schedule support.' : ' — schedule support still to be confirmed with PaxLife.'}<//>` : null}
        ${scheds.length ? html`
          <${Paper} variant="outlined" sx=${{ borderColor: '#E7E7E7' }}>
            <${Table} id="dv-scheds">
              <${TableHead}><${TableRow}><${TableCell}>Schedule<//><${TableCell}>Via<//><${TableCell}>When<//><${TableCell}>On this device<//><${TableCell}>Status<//><//><//>
              <${TableBody}>
                ${scheds.map(s => {
                  const f = s.apply && s.apply.failed.find(x => x.id === d.id);
                  const skip = phase === 2 && d.kind === 'ela';
                  return html`
                    <${TableRow} key=${s.id} data-sched=${s.id}>
                      <${TableCell}><${Link} component="button" underline="hover" onClick=${() => go('schedule', { id: s.id })}>${s.name}<//><//>
                      <${TableCell}>${via(s)}<//>
                      <${TableCell}>${daysText(s)} · ${timeText(s)}<//>
                      <${TableCell}>${onDevice(s, d)}<//>
                      <${TableCell}>${!s.active ? html`<${ActiveChip} s=${s} />` : skip ? html`<${PhaseChip} label="Skipped in phase 1" />`
                        : f ? html`<${Tooltip} title=${f.reason}><span><${StateChip} st=${{ kind: 'partial', text: 'Failed' }} /></span><//>`
                        : html`<${StateChip} st=${{ kind: s.apply && s.apply.stale ? 'stale' : 'ok', text: s.apply && s.apply.stale ? 'Out of date' : `Updated ${s.apply ? s.apply.at : ''}` }} />`}<//>
                    <//>`;
                })}
              <//>
            <//>
          <//>` : html`<${Typography} variant="body2" color="text.secondary" id="dv-none">No schedule reaches this device.<//>`}

        ${entries.length && !(phase === 2 && d.kind === 'ela') ? html`
          <${Typography} variant="subtitle2" sx=${{ mt: 2.5, mb: .5 }}>Schedule on this device<//>
          <${Typography} variant="body2" color="text.secondary" sx=${{ mb: 1 }}>
            As written through the PaxLife API and read back from the device.
          <//>
          <${Paper} variant="outlined" sx=${{ borderColor: '#E7E7E7' }}>
            <${Table} id="dv-entries">
              <${TableHead}><${TableRow}><${TableCell}>Days<//><${TableCell}>Time<//><${TableCell}>Action<//><${TableCell}>From schedule<//><//><//>
              <${TableBody}>
                ${entries.map((e, i) => html`
                  <${TableRow} key=${i} data-entry>
                    <${TableCell}>${e.dayText}<//><${TableCell}>${e.t}<//>
                    <${TableCell}>${e.action}${gaps ? html`<${Typography} variant="body2" color="text.secondary" className="api-fields"
                      sx=${{ fontFamily: 'Roboto Mono, monospace' }}>API: ${e.api}<//>` : null}<//>
                    <${TableCell}>${e.from}<//>
                  <//>`)}
              <//>
            <//>
          <//>
          <${Gap} id="G3" />` : null}
      <//>
    <//>`;
}

/* ══ Screen: Device types — what each type can do in a schedule ═════════
   From the manager's DATNETISR-1036 concept (2026-10-02). Read from the same
   CAN table the editor uses, so the two can't disagree. */
function DeviceTypes() {
  const { phase } = useApp();
  const types = [...new Set(DEVICES.map(d => d.type))].map(t => {
    const d = DEVICES.find(x => x.type === t);
    return { t, kind: d.kind, n: DEVICES.filter(x => x.type === t).length };
  }).sort((a, b) => a.kind.localeCompare(b.kind) || a.t.localeCompare(b.t));
  const no = html`<${Typography} variant="body2" color="text.disabled">–<//>`;
  return html`
    <${Box}>
      <${Typography} variant="h6" id="page-title">Device types<//>
      <${Typography} variant="body2" color="text.secondary" sx=${{ mt: .5, mb: 2 }}>
        Schedule actions per device type.
      <//>
      <${Paper} variant="outlined" sx=${{ borderColor: '#E7E7E7' }}>
        <${Table} id="types-table">
          <${TableHead}><${TableRow}>
            ${['Device type', 'Category', 'Display action', 'PA action', 'Base audio settings', 'Devices', 'Notes'].map(c => html`<${TableCell} key=${c}>${c}<//>`)}
          <//><//>
          <${TableBody}>
            ${types.map(x => html`
              <${TableRow} key=${x.t} data-type=${x.t}>
                <${TableCell} sx=${{ fontWeight: 500 }}>${x.t}<//>
                <${TableCell}>${x.kind === 'display' ? 'Display' : 'Audio'}<//>
                <${TableCell} data-cap="display">${CAN[x.kind].display ? 'Darken all displays' : no}<//>
                <${TableCell} data-cap="pa">${CAN[x.kind].pa ? 'Set volume' : no}<//>
                <${TableCell}>${x.kind === 'barix' ? 'Equalizer (on the device) · volume per station' : x.kind === 'ela' ? 'Volume per station' : no}<//>
                <${TableCell}>${x.n}<//>
                <${TableCell}>${x.kind === 'ela'
                  ? (phase === 2 ? html`<${PhaseChip} label="Skipped in phase 1" />` : html`<${Chip} size="small" label="To confirm with PaxLife" variant="outlined" />`)
                  : x.kind === 'barix' ? 'Base settings are persistent — never changed by a schedule.' : ''}<//>
              <//>`)}
          <//>
        <//>
      <//>
      <${Gap} id="G7" />
      <${Gap} id="G8" />
    <//>`;
}

/* ══ Screen: Stations list (captured) → Station details › Schedules tab ═ */
function StationList() {
  const { go } = useApp();
  const cols = ['Name', 'Name (EN)', 'Name (HE)', 'Name (AR)', 'Station ID', 'MOT Station Name', 'MOT Station ID', 'Passenger halls', 'Corridors', 'Platforms', 'Schedules'];
  const count = c => SCHEDULES.filter(s => s.active && targetStations(s).includes(c)).length;
  return html`
    <${Box}>
      <${Typography} variant="h6" id="page-title" sx=${{ mb: 2 }}>Stations<//>
      <${Paper} variant="outlined" sx=${{ borderColor: '#E7E7E7' }}>
        <${TableContainer}>
          <${Table} id="st-table">
            <${TableHead}><${TableRow}>${cols.map(c => html`<${TableCell} key=${c}>${c}<//>`)}<//><//>
            <${TableBody}>
              ${STATIONS.map(s => html`
                <${TableRow} key=${s.code} hover data-station=${s.code} sx=${{ cursor: 'pointer' }} onClick=${() => go('station', { code: s.code })}>
                  <${TableCell}>${s.name}<//><${TableCell}>${s.en}<//><${TableCell}>${s.he}<//><${TableCell}>${s.ar}<//>
                  <${TableCell}>${s.code}<//><${TableCell}>${s.mot}<//><${TableCell}>${s.motId}<//>
                  <${TableCell}>${s.halls}<//><${TableCell}>${s.corridors}<//><${TableCell}>${s.platforms}<//>
                  <${TableCell} data-count>${count(s.code) || '–'}<//>
                <//>`)}
            <//>
          <//>
        <//>
      <//>
    <//>`;
}

function StationDetail() {
  const { go, target, toast, bump, setDirty } = useApp();
  const s = STATIONS.find(x => x.code === target.code);
  const [tab, setTab] = useState(3);
  const list = SCHEDULES.filter(x => targetStations(x).includes(s.code));
  const [au, setAu] = useState(() => ({ ...stAudio(s.code) }));
  const cur = stAudio(s.code);
  const dirty = String(au.volume) !== String(cur.volume);
  useEffect(() => { setDirty(dirty); return () => setDirty(false); }, [dirty]);
  const v = Number(au.volume);
  const auErr = !(au.volume !== '' && v >= 0 && v <= 100) ? { volume: 'Enter 0–100' } : {};
  const nAudio = DEVICES.filter(d => d.station === s.code && d.kind !== 'display').length;
  const save = () => {
    if (Object.keys(auErr).length) return;
    STATION_AUDIO[s.code] = { volume: v };
    SCHEDULES.filter(x => x.active && targetStations(x).includes(s.code) && x.pa === 'adjust' && x.apply).forEach(x => { x.apply = { ...x.apply, at: 'just now' }; });
    setDirty(false); bump(); toast(`${s.name}: default volume saved — ${nAudio} audio device${nAudio === 1 ? '' : 's'} updated`);
  };
  return html`
    <${Box}>
      <${PageHeader} crumbs=${[{ label: 'Stations', onClick: () => go('stations') }, { label: 'Station details' }]} title=${s.code} titleId="sd-title"
        action=${html`<${Button} variant="contained" id="sd-save" disabled=${!dirty || !!Object.keys(auErr).length} onClick=${save}>Save<//>`} />
      <${FieldGrid}>
        <${TextField} label="Full Name (English)" required value=${s.en} disabled />
        <${TextField} label="Full Name (Hebrew)" required value=${s.he} disabled />
        <${TextField} label="MOT Station Name" required value=${s.mot} disabled />
        <${TextField} label="MOT Station ID" required value=${s.motId} disabled />
      <//>
      <${Box} sx=${{ mt: 2 }}>
        <${SectionCard} title="Base audio settings" id="card-station-audio"
          chip=${html`<${Chip} size="small" label="Persistent — not scheduled" icon=${html`<${Icon} sx=${{ fontSize: 18, ml: '6px' }}>push_pin<//>`} />`}
          note=${`All ${nAudio} audio device${nAudio === 1 ? '' : 's'} at ${s.name}.`}>
          <${FieldGrid} cols=${3}>
            <${TextField} id="sd-vol" label="Default volume (%)" type="number" value=${au.volume} inputProps=${{ min: 0, max: 100 }}
              error=${!!auErr.volume} helperText=${auErr.volume || ''}
              onChange=${e => setAu({ ...au, volume: e.target.value })} />
          <//>
          <${Gap} id="G4" />
        <//>
      <//>
      <${Tabs} value=${tab} onChange=${(e, v) => setTab(v)} sx=${{ mt: 2, borderBottom: '1px solid #E7E7E7' }}>
        <${Tab} label="Devices" /><${Tab} label="Tracks" /><${Tab} label="GPS window" /><${Tab} label="Schedules" id="tab-schedules" />
      <//>
      <${Box} sx=${{ pt: 2 }}>
        ${tab < 3 ? html`<${Typography} variant="body2" color="text.secondary" className="not-captured">[live content not captured]<//>` : html`
          <${Box} id="station-schedules">
            <${Box} sx=${{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
              <${Typography} variant="body2" color="text.secondary" sx=${{ flex: 1 }}>
                Schedules that reach ${s.name}, directly or through a station group. They're edited in <${Link} component="button" underline="hover" onClick=${() => go('schedules')} sx=${{ verticalAlign: 'baseline' }}>Output device schedules<//>.
              <//>
              <${Button} variant="outlined" id="add-for-station" startIcon=${html`<${Icon}>add<//>`}
                onClick=${() => go('schedule', { id: null, preset: { station: s.code } })}>Add schedule for ${s.name}<//>
            <//>
            ${list.length ? html`
              <${Paper} variant="outlined" sx=${{ borderColor: '#E7E7E7' }}>
                <${Table}>
                  <${TableHead}><${TableRow}><${TableCell}>Schedule<//><${TableCell}>Via<//><${TableCell}>When<//><${TableCell}>Actions<//><${TableCell}>Active<//><//><//>
                  <${TableBody}>
                    ${list.map(x => html`
                      <${TableRow} key=${x.id} hover data-sched=${x.id} sx=${{ cursor: 'pointer' }} onClick=${() => go('schedule', { id: x.id })}>
                        <${TableCell} sx=${{ fontWeight: 500 }}>${x.name}<//>
                        <${TableCell}>${viaText(x, s.code)}<//>
                        <${TableCell}>${daysText(x)} · ${timeText(x)}<//>
                        <${TableCell}>${[x.pa === 'adjust' ? paText(x) : '', x.display === 'darken' ? 'Darken' : ''].filter(Boolean).join(' · ')}<//>
                        <${TableCell}><${ActiveChip} s=${x} /><//>
                      <//>`)}
                  <//>
                <//>
              <//>` : html`<${Typography} variant="body2" id="station-none">No schedule reaches ${s.name} yet.<//>`}
          <//>`}
      <//>
    <//>`;
}

/* ══ Root ═════════════════════════════════════════════════════════════ */
function Root() {
  const [phase, setPhase] = useState(1);
  const [listState, setListState] = useState('data');
  const [saveMode, setSaveMode] = useState('ok');
  const [gaps, setGaps] = useState(false);
  const [layout, setLayout] = useState('full');
  const [screen, setScreen] = useState('schedules');
  const [target, setTarget] = useState(null);
  const [rev, setRev] = useState(0);
  const [toastMsg, setToastMsg] = useState('');
  const [del, setDel] = useState(null);
  const [leave, setLeave] = useState(null);       // pending navigation while dirty
  const dirtyRef = useRef(false);

  const bump = useCallback(() => setRev(x => x + 1), []);
  const setDirty = useCallback(v => { dirtyRef.current = v; }, []);
  const doGo = (s, t) => { dirtyRef.current = false; setScreen(s); setTarget(t || null); window.scrollTo(0, 0); };
  const go = (s, t) => { if (dirtyRef.current) setLeave({ s, t }); else doGo(s, t); };
  useEffect(() => {
    const h = e => { if (dirtyRef.current) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', h); return () => window.removeEventListener('beforeunload', h);
  }, []);
  // A list-state demo applies to the list, so jump there.
  const pickList = k => { setListState(k); go('schedules'); };

  const askDelete = (s, after) => setDel({ s, after });
  const doDelete = () => {
    const i = SCHEDULES.indexOf(del.s);
    const n = applyState(del.s, phase).total;
    if (i >= 0) SCHEDULES.splice(i, 1);
    const after = del.after; setDel(null); bump();
    setToastMsg(`"${del.s.name}" deleted — removed from ${n} device${n === 1 ? '' : 's'}`);
    if (after) { dirtyRef.current = false; after(); }
  };

  // Switching layout swaps in place; with unsaved edits it asks first, as any navigation does.
  const pickLayout = k => { if (k === layout) return; if (dirtyRef.current) { setLeave({ layout: k }); return; } setLayout(k); };
  const value = { phase, setPhase, listState, setListState: pickList, saveMode, setSaveMode, gaps, setGaps, layout, setLayout: pickLayout,
                  screen, target, go, rev, bump, toast: setToastMsg, askDelete, setDirty };
  const split = layout === 'split' && (screen === 'schedules' || screen === 'schedule');
  const View = split ? SplitSchedules : { schedules: ScheduleList, schedule: ScheduleEditor, devices: DeviceList, device: DeviceDetail, types: DeviceTypes,
                 stations: StationList, station: StationDetail }[screen];

  return html`
    <${ThemeProvider} theme=${theme}>
      <${CssBaseline} />
      <${App.Provider} value=${value}>
        <${VariantSwitch} />
        <${Box} sx=${{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 46px)' }}>
          <${TopBar} />
          <${Box} sx=${{ display: 'flex', flex: 1, minHeight: 0 }}>
            <${Rail} />
            <${Box} component="main" data-screen=${screen} data-phase=${phase} sx=${{ flex: 1, minWidth: 0, px: 3, py: 2.5, bgcolor: '#fff' }}>
              <${View} key=${split ? 'split' : screen + ':' + JSON.stringify(target)} />
            <//>
          <//>
        <//>
        <${Dialog} open=${!!del} onClose=${() => setDel(null)}>
          <${DialogTitle}>Delete "${del ? del.s.name : ''}"?<//>
          <${DialogContent}><${DialogContentText}>
            ${del ? `ETC removes it from ${applyState(del.s, phase).total} device${applyState(del.s, phase).total === 1 ? '' : 's'}. This cannot be undone.` : ''}
          <//><//>
          <${DialogActions}>
            <${Button} onClick=${() => setDel(null)}>Cancel<//>
            <${Button} color="error" variant="contained" id="del-confirm" onClick=${doDelete}>Delete<//>
          <//>
        <//>
        <${Dialog} open=${!!leave} onClose=${() => setLeave(null)} PaperProps=${{ id: 'leave-dialog' }}>
          <${DialogTitle}>Leave without saving?<//>
          <${DialogContent}><${DialogContentText}>Your changes haven't been saved or sent to any device. If you leave, they're lost.<//><//>
          <${DialogActions}>
            <${Button} id="leave-stay" onClick=${() => setLeave(null)}>Keep editing<//>
            <${Button} color="error" id="leave-discard" onClick=${() => { const l = leave; setLeave(null); if (l.layout) { dirtyRef.current = false; setLayout(l.layout); } else doGo(l.s, l.t); }}>Discard changes<//>
          <//>
        <//>
        <${Snackbar} open=${!!toastMsg} autoHideDuration=${3200} onClose=${() => setToastMsg('')}
          message=${toastMsg} anchorOrigin=${{ vertical: 'bottom', horizontal: 'left' }} />
      <//>
    <//>`;
}

ReactDOM.createRoot(document.getElementById('root')).render(html`<${Root} />`);
