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
  base: kind === 'barix' ? { volume: 60, eq: 'Speech' } : kind === 'ela' ? { volume: 70, eq: '' } : null,
}));
const devById = id => DEVICES.find(d => d.id === id);

/* What a device type can do. Display power only on displays; PA only on audio.
   ELA support is unconfirmed (G8). */
const CAN = {
  display: { pa: false, display: true },
  barix:   { pa: true,  display: false },
  ela:     { pa: true,  display: false, unconfirmed: true },
};

const DAYS = [['sun', 'Sun'], ['mon', 'Mon'], ['tue', 'Tue'], ['wed', 'Wed'], ['thu', 'Thu'], ['fri', 'Fri'], ['sat', 'Sat']];

var SCHEDULES = [
  { id: 's1', name: 'Night mode — North line', active: true, mode: 'group', group: 'north', stations: [],
    days: ['sun', 'mon', 'tue', 'wed', 'thu'], holidays: false, start: '23:30', end: '05:00',
    pa: 'adjust', paPct: -40, display: 'darken', apply: { at: '2 Oct 2026, 03:00', failed: [] } },
  { id: 's2', name: 'Shabbat quiet — Akko, Binyamina', active: true, mode: 'stations', group: '', stations: ['AKO', 'BIN'],
    days: ['fri', 'sat'], holidays: true, start: '16:00', end: '20:00',
    pa: 'adjust', paPct: -100, display: 'none',
    apply: { at: '2 Oct 2026, 03:00', failed: [{ id: 'bin-ela-1', reason: 'PaxLife rejected the schedule — field "volume" not supported on this device type' }] } },
  { id: 's3', name: 'Airport late night', active: false, mode: 'group', group: 'airport', stations: [],
    days: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'], holidays: true, start: '01:00', end: '04:30',
    pa: 'none', paPct: 0, display: 'darken', apply: null },
  { id: 's4', name: 'South line evening', active: true, mode: 'group', group: 'south', stations: [],
    days: ['sun', 'mon', 'tue', 'wed', 'thu'], holidays: false, start: '21:00', end: '23:00',
    pa: 'adjust', paPct: -20, display: 'none', apply: { at: '30 Sep 2026, 03:00', failed: [], stale: 'Group South line changed on 1 Oct — B. Sheva Uni was added' } },
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
const paText = s => s.pa === 'adjust' ? (s.paPct <= -100 ? 'Mute (−100%)' : `Volume ${s.paPct > 0 ? '+' : s.paPct < 0 ? '−' : ''}${Math.abs(s.paPct)}%`) : 'No action';
const displayText = s => s.display === 'darken' ? 'Darken all displays' : 'No action';
const targetText = s => s.mode === 'group' ? (s.group ? `Group · ${groupName(s.group)}` : '–')
  : s.stations.length ? (s.stations.length <= 2 ? s.stations.map(stName).join(', ') : `${s.stations.length} stations`) : '–';

const targetStations = s => s.mode === 'group' ? ((GROUPS.find(g => g.id === s.group) || {}).stations || []) : s.stations;
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
const absVolume = (d, pct) => Math.max(0, Math.min(100, Math.round(d.base.volume * (1 + pct / 100))));
function onDevice(s, d) {
  const parts = [];
  if (CAN[d.kind].display && s.display === 'darken') parts.push('Darken');
  if (CAN[d.kind].pa && s.pa === 'adjust') parts.push(s.paPct <= -100 ? 'Mute' : `Volume ${d.base.volume}% → ${absVolume(d, s.paPct)}%`);
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
      if (s.paPct <= -100) { on.muted = 'true'; off.muted = 'false'; }
      else { on.volume = absVolume(d, s.paPct) + '%'; off.volume = d.base.volume + '%'; }
    }
    s.days.forEach(day => {
      const i = DAYS.findIndex(x => x[0] === day);
      rows.push({ day: i, t: s.start, ...on, from: s.name });
      rows.push({ day: overnight(s) ? (i + 1) % 7 : i, t: s.end, ...off, from: s.name });
    });
  });
  return rows.sort((a, b) => a.day - b.day || a.t.localeCompare(b.t));
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

function SectionCard({ title, note, children, id, chip }) {
  return html`
    <${Card} id=${id} sx=${{ mb: 2 }}>
      <${CardContent} sx=${{ '&:last-child': { pb: 2 } }}>
        <${Box} sx=${{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <${Typography} variant="h6" sx=${{ fontSize: 18 }}>${title}<//>${chip}
        <//>
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

/** A gap, pinned where it bites. Hidden unless "Show gaps" is on. */
const GAP_TEXT = {
  G1: 'Named, central schedules don\'t exist in the PaxLife API — it stores one weekly schedule per device. ETC must own the schedule list and push the result to each device.',
  G2: 'Holidays: the API is weekly only, with no dates. Who supplies the holiday calendar, and does ETC write dated overrides around each holiday?',
  G3: 'Start/End ranges: the API takes weekday/time entries, not ranges. ETC writes an "on" entry at the start and an "off" entry at the end; overnight ranges put the off entry on the next day.',
  G4: 'Relative volume: the API takes an absolute volume. ETC converts −100…+100% against each device\'s default when applying — and must re-apply if that default changes.',
  G5: 'Overlaps: a device holds one weekly schedule. When two schedules act on the same device at the same time, which one wins?',
  G6: 'Membership changes: proposed rule — ETC re-applies automatically when a group gains/loses a station or a device is added/moved, and flags the schedule if that fails. Needs agreement with ETC.',
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
  if (!s.active) return { kind: 'off', text: 'Not applied', total };
  if (!s.apply) return { kind: 'off', text: 'Not applied yet', total };
  if (s.apply.stale) return { kind: 'stale', text: 'Needs re-apply', total, detail: s.apply.stale };
  const failed = s.apply.failed.filter(f => !(phase === 2 && (devById(f.id) || {}).kind === 'ela')).length;
  if (failed) return { kind: 'partial', text: `${total - failed} of ${total} · ${failed} failed`, total };
  return { kind: 'ok', text: `${total} of ${total} applied${skipped ? ` · ${skipped} ELA skipped` : ''}`, total };
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
  const { phase, setPhase, listState, setListState, saveMode, setSaveMode, gaps, setGaps } = useApp();
  const btn = (id, on, label, onClick) => html`
    <button id=${id} className=${on ? 'on' : ''} onClick=${onClick}
      style=${{ background: on ? '#fff' : 'none', color: on ? 'rgba(0,0,0,.87)' : 'rgba(255,255,255,.75)',
                border: 'none', fontFamily: 'inherit', fontSize: 14, fontWeight: on ? 500 : 400,
                padding: '4px 12px', borderRadius: 4, cursor: 'pointer', whiteSpace: 'nowrap' }}>${label}</button>`;
  const group = (label, children) => html`
    <span style=${{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style=${{ opacity: .7, fontSize: 14 }}>${label}</span>
      <span style=${{ display: 'flex', gap: 2, background: 'rgba(255,255,255,.1)', borderRadius: 6, padding: 3 }}>${children}</span>
    </span>`;
  return html`
    <div className="variant-switch" id="variant-switch"
      style=${{ display: 'flex', alignItems: 'center', gap: 20, background: '#1b1b1b', color: '#fff', flexWrap: 'wrap',
                padding: '7px 20px', flexShrink: 0, fontSize: 14, fontFamily: 'Roboto, sans-serif' }}>
      ${group('Variant', html`${btn('vs-1', phase === 1, '1 · Target (DATNETISR-264)', () => setPhase(1))}${btn('vs-2', phase === 2, '2 · Phase 1 — per device', () => setPhase(2))}`)}
      ${group('List', ['data', 'empty', 'loading', 'error'].map(k => btn('ls-' + k, listState === k, k[0].toUpperCase() + k.slice(1), () => setListState(k))))}
      ${group('Save', [['ok', 'Succeeds'], ['partial', 'Partial failure'], ['error', 'Fails']].map(([k, l]) => btn('sv-' + k, saveMode === k, l, () => setSaveMode(k))))}
      <span style=${{ marginLeft: 'auto' }}>${btn('p-gaps', gaps, gaps ? 'Hide gaps' : 'Show gaps', () => setGaps(!gaps))}</span>
    </div>`;
}

/* ══ Screen: schedules list — the one place ════════════════════════════ */
function ScheduleList() {
  const { go, phase, listState, setListState, toast, bump, askDelete } = useApp();
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(listState === 'loading');
  useEffect(() => { setLoading(listState === 'loading'); }, [listState]);

  const n = q.trim().toLowerCase();
  const rows = listState === 'empty' ? [] : SCHEDULES.filter(s => !n || `${s.name} ${targetText(s)}`.toLowerCase().includes(n));
  const toggle = s => {
    s.active = !s.active;
    const t = applyState(s, phase).total;
    if (s.active) s.apply = { at: 'just now', failed: [] };
    bump();
    toast(s.active ? `"${s.name}" is active — applied to ${t} device${t === 1 ? '' : 's'}` : `"${s.name}" is inactive — removed from ${t} device${t === 1 ? '' : 's'}`);
  };
  const reapply = s => { s.apply = { at: 'just now', failed: [] }; bump(); toast(`"${s.name}" re-applied to ${applyState(s, phase).total} devices`); };

  const add = html`<${Button} variant="contained" id="add-btn" startIcon=${html`<${Icon}>add<//>`} onClick=${() => go('schedule', { id: null })}>Add schedule<//>`;
  const cols = ['Name', 'Active', 'Targets', 'Days', 'Time', 'PA action', 'Display action', 'Devices'];

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
                    <${Tooltip} title=${st.detail || ''}><span><${StateChip} st=${st} /></span><//>
                    ${st.kind === 'stale' ? html`<${Button} size="small" sx=${{ ml: 1 }} data-reapply=${s.id} onClick=${e => { e.stopPropagation(); reapply(s); }}>Re-apply<//>` : null}
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

/* ══ Screen: schedule editor — the only editor ═════════════════════════ */
const blank = preset => ({ id: null, name: '', active: true, mode: preset && preset.station ? 'stations' : 'group', group: '',
  stations: preset && preset.station ? [preset.station] : [], days: [], holidays: false, start: '', end: '',
  pa: 'none', paPct: -30, display: 'none', apply: null });

function validate(d) {
  const e = {};
  if (!d.name.trim()) e.name = 'Name is required';
  else if (SCHEDULES.some(s => s.id !== d.id && s.name.trim().toLowerCase() === d.name.trim().toLowerCase())) e.name = 'A schedule with this name already exists';
  if (d.mode === 'group' && !d.group) e.target = 'Choose a station group';
  if (d.mode === 'stations' && !d.stations.length) e.target = 'Choose at least one station';
  if (!d.days.length && !d.holidays) e.days = 'Choose at least one day';
  if (toMin(d.start) == null) e.start = d.start.trim() ? 'Use 24-hour hh:mm, e.g. 23:30' : 'Start time is required';
  if (toMin(d.end) == null) e.end = d.end.trim() ? 'Use 24-hour hh:mm, e.g. 05:00' : 'End time is required';
  if (!e.start && !e.end && toMin(d.start) === toMin(d.end)) e.end = 'End time must differ from start time';
  if (d.pa === 'none' && d.display === 'none') e.action = 'Choose a PA or a display action — a schedule with no action does nothing.';
  if (d.pa === 'adjust' && (d.paPct === '' || !Number.isFinite(Number(d.paPct)) || d.paPct < -100 || d.paPct > 100)) e.pa = 'Enter a value from −100 to +100';
  return e;
}

function ScheduleEditor() {
  const { go, target, phase, saveMode, toast, bump, askDelete, setDirty } = useApp();
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
    if (!out.id) { out.id = 's' + Date.now(); SCHEDULES.push(out); }
    else Object.assign(SCHEDULES.find(s => s.id === out.id), out);
    ddRef.current = out;
    setD(out); setSaved(JSON.stringify(out)); setDirty(false);
    if (!out.active) { bump(); setRun({ phase: 'done', done: 0, total: 0, failed: [], inactive: true }); return; }
    startApply(applyTo);
  };
  const retry = () => { ddRef.current = d; startApply(applyTo.filter(x => run.failed.some(f => f.id === x.d.id)), true); };

  const isNew = !d.id || !SCHEDULES.some(s => s.id === d.id);
  const title = isNew ? 'New schedule' : (JSON.parse(saved).name || 'Schedule');
  const crumbs = [{ label: 'Output device schedules', onClick: () => go('schedules') }, { label: isNew ? 'New schedule' : 'Schedule details' }];
  const kinds = k => useful.filter(x => x.d.kind === k).length;
  const ex = DEVICES.find(x => x.kind === 'barix' && targetStations(d).includes(x.station)) || DEVICES.find(x => x.kind === 'barix');

  return html`
    <${Box} sx=${{ maxWidth: 1180 }}>
      <${PageHeader} crumbs=${crumbs} title=${title} titleId="ed-title"
        action=${html`
          ${!isNew ? html`<${Button} variant="outlined" color="error" id="ed-del" startIcon=${html`<${Icon}>delete<//>`}
            onClick=${() => askDelete(SCHEDULES.find(s => s.id === d.id), () => go('schedules'))}>Delete schedule<//>` : null}
          <${Button} variant="contained" id="ed-save" disabled=${run && run.phase === 'applying'} onClick=${save}>Save<//>`} />

      ${phase === 2 ? html`<${Typography} variant="body2" color="text.secondary" sx=${{ mt: -1, mb: 2 }} id="phase-line">
        Phase 1: on Save, ETC writes the result into each device's weekly schedule through the PaxLife API, replacing what was there.<//>` : null}

      <${Box} id="status-area">
        ${nErr ? html`<${Alert} severity="error" id="err-summary" sx=${{ mb: 2 }}>Fix ${nErr} field${nErr > 1 ? 's' : ''} before saving — nothing has been sent to the devices.<//>` : null}
        ${run && run.phase === 'applying' ? html`
          <${Alert} severity="info" icon=${false} id="applying" sx=${{ mb: 2 }}>
            <b>Saving and applying…</b> ${run.total ? `${run.done} of ${run.total} devices updated` : ''}
            <${LinearProgress} variant=${run.total ? 'determinate' : 'indeterminate'} value=${run.total ? run.done / run.total * 100 : 0} sx=${{ mt: 1 }} />
          <//>` : null}
        ${run && run.phase === 'error' ? html`
          <${Alert} severity="error" id="save-error" sx=${{ mb: 2 }} action=${html`<${Button} color="inherit" onClick=${save}>Try again<//>`}>
            <${AlertTitle}>Couldn't save the schedule<//>
            ETC didn't respond. Nothing was sent to the devices, and your changes are still here.
          <//>` : null}
        ${run && run.phase === 'done' && run.inactive ? html`
          <${Alert} severity="success" id="save-result" sx=${{ mb: 2 }}>Saved as inactive — it isn't applied to any device.<//>` : null}
        ${run && run.phase === 'done' && !run.inactive ? (run.failed.length ? html`
          <${Alert} severity="warning" id="save-result" data-result="partial" sx=${{ mb: 2 }}
            action=${html`<${Button} color="inherit" id="retry-failed" onClick=${retry}>Retry failed<//>`}>
            <${AlertTitle}>Saved. Applied to ${run.total - run.failed.length} of ${run.total} devices — ${run.failed.length} couldn't be updated<//>
            <${Box} component="ul" sx=${{ m: 0, pl: 2.5 }}>
              ${run.failed.map(f => html`<li key=${f.id} data-failed=${f.id}><b>${(devById(f.id) || {}).name}</b> (${stName((devById(f.id) || {}).station)}) — ${f.reason}<//>`)}
            <//>
            <${Typography} variant="body2" sx=${{ mt: .5 }}>The other devices already run the new schedule. A failed device keeps its previous schedule.<//>
          <//>` : html`
          <${Alert} severity="success" id="save-result" data-result="ok" sx=${{ mb: 2 }}>
            Saved. Applied to ${run.total} of ${run.total} device${run.total === 1 ? '' : 's'}${skipped.length ? ` · ${skipped.length} ELA speaker${skipped.length > 1 ? 's' : ''} skipped (phase 1)` : ''}.
          <//>`) : null}
        <${Gap} id="G9" />
      <//>

      <${SectionCard} title="General" id="card-general">
        <${Box} sx=${{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>
          <${TextField} id="ed-name" label="Schedule name" required value=${d.name} sx=${{ width: 420 }}
            error=${!!errs.name} helperText=${errs.name || 'Shown in this list and on every station and device it reaches.'}
            onChange=${e => set({ name: e.target.value })} />
          <${Box} sx=${{ pt: .5 }}>
            <${FormControlLabel} label="Active" control=${html`<${Switch} id="ed-active" checked=${d.active} onChange=${e => set({ active: e.target.checked })} />`} />
            <${Typography} variant="body2" color="text.secondary">${d.active ? 'Applied to its devices when saved.' : 'Kept here, not applied to any device.'}<//>
          <//>
        <//>
        <${Gap} id="G10" />
      <//>

      <${SectionCard} title="Targets" id="card-targets">
        <${RadioGroup} row value=${d.mode} onChange=${e => set({ mode: e.target.value })} id="ed-mode">
          <${FormControlLabel} value="group" control=${html`<${Radio} />`} label="Station group" />
          <${FormControlLabel} value="stations" control=${html`<${Radio} />`} label="Stations" />
        <//>
        <${Box} sx=${{ mt: 1, maxWidth: 640 }}>
          ${d.mode === 'group' ? html`
            <${FormControl} fullWidth error=${!!errs.target}>
              <${InputLabel} id="ed-group-label">Station group<//>
              <${Select} id="ed-group" labelId="ed-group-label" value=${d.group} label="Station group" onChange=${e => set({ group: e.target.value })}>
                ${GROUPS.map(g => html`<${MenuItem} key=${g.id} value=${g.id}>${g.name} — ${g.stations.length} station${g.stations.length > 1 ? 's' : ''}<//>`)}
              <//>
              <${M.FormHelperText}>${errs.target || (d.group ? (GROUPS.find(g => g.id === d.group) || {}).stations.map(stName).join(', ') : 'Predefined groups.')}<//>
            <//>` : html`
            <${Autocomplete} multiple id="ed-stations" options=${STATIONS.map(s => s.code)} value=${d.stations}
              getOptionLabel=${c => stLabel(c)} onChange=${(e, v) => set({ stations: v })} disableCloseOnSelect
              renderInput=${p => html`<${TextField} ...${p} label="Stations" error=${!!errs.target}
                helperText=${errs.target || 'One or more stations.'} />`} />`}
        <//>
        <${Typography} variant="body2" color="text.secondary" sx=${{ mt: 1 }}>
          Switching between a group and stations keeps both choices until you save — only the selected one is used.
        <//>

        ${useful.length || r.length ? html`
          <${Box} sx=${{ mt: 2, p: 1.5, bgcolor: '#F7F9FC', borderRadius: 1 }} id="reach">
            <${Box} sx=${{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <${Icon} sx=${{ color: 'text.secondary' }}>devices<//>
              <${Typography} variant="body2" id="reach-summary">
                Reaches <b>${applyTo.length} device${applyTo.length === 1 ? '' : 's'}</b> at ${targetStations(d).length} station${targetStations(d).length === 1 ? '' : 's'}:
                ${' '}${kinds('display')} display${kinds('display') === 1 ? '' : 's'} · ${kinds('barix')} Barix · ${kinds('ela')} ELA speaker${kinds('ela') === 1 ? '' : 's'}${skipped.length ? ` (${skipped.length} skipped in phase 1)` : ''}.
                ${r.length > useful.length ? ` ${r.length - useful.length} other device${r.length - useful.length > 1 ? 's' : ''} at these stations can't carry the chosen actions.` : ''}
              <//>
              <${Button} size="small" id="toggle-devices" onClick=${() => setShowDev(!showDev)}>${showDev ? 'Hide devices' : 'Show devices'}<//>
            <//>
            <${Collapse} in=${showDev} unmountOnExit>
              <${Paper} variant="outlined" sx=${{ mt: 1.5, borderColor: '#E7E7E7' }}>
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
                          : x.useful ? onDevice(d, x.d) : html`<${Typography} variant="body2" color="text.secondary">Nothing — ${CAN[x.d.kind].display ? 'no display action chosen' : 'no PA action chosen'}<//>`}
                          ${phase === 1 && x.d.kind === 'ela' && x.useful ? html` <${Chip} size="small" label="To confirm with PaxLife" variant="outlined" />` : null}<//>
                      <//>`)}
                  <//>
                <//>
              <//>
            <//>
          <//>` : null}
        <${Typography} variant="body2" color="text.secondary" sx=${{ mt: 1.5 }} id="membership-note">
          ${d.mode === 'group'
            ? 'Follows the group: when a station joins or leaves it, or a device is added, moved or removed, ETC re-applies the schedule. If that fails, the list shows "Needs re-apply".'
            : 'Follows these stations: devices added to or moved off them later are updated automatically. If that fails, the list shows "Needs re-apply".'}
        <//>
        <${Gap} id="G6" />
        <${Gap} id="G8" />
      <//>

      <${SectionCard} title="Timing" id="card-timing">
        <${Box} sx=${{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <${ToggleButtonGroup} id="ed-days" size="small" color="primary" value=${d.days}
            onChange=${(e, v) => set({ days: v })} aria-label="Weekdays">
            ${DAYS.map(([k, l]) => html`<${ToggleButton} key=${k} value=${k} data-day=${k} aria-label=${l}>${l}<//>`)}
          <//>
          <${ToggleButton} size="small" color="primary" value="hol" id="ed-holidays" selected=${d.holidays && phase === 1}
            disabled=${phase === 2} onChange=${() => set({ holidays: !d.holidays })}>
            <${Icon} sx=${{ fontSize: 18, mr: .75 }}>celebration<//>Holidays
          <//>
          ${phase === 2 ? html`<${PhaseChip} />` : null}
        <//>
        <${Typography} variant="body2" color=${errs.days ? 'error' : 'text.secondary'} sx=${{ mt: .75 }} id="days-help">
          ${errs.days || (phase === 2 ? 'Holidays need a dated calendar; the per-device API is weekly only.' : 'Holidays: the days in the Holidays category, whatever weekday they fall on.')}
        <//>
        <${Gap} id="G2" />
        <${Box} sx=${{ display: 'flex', gap: 2, mt: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          ${/* 24-hour text fields: a native time input follows the browser
                locale and showed AM/PM, which N8 users in Israel don't use. */ ''}
          <${TextField} id="ed-start" label="Start Time" value=${d.start} placeholder="hh:mm" sx=${{ width: 180 }}
            inputProps=${{ inputMode: 'numeric', maxLength: 5 }}
            InputProps=${{ endAdornment: html`<${InputAdornment} position="end"><${Icon} sx=${{ color: 'text.secondary' }}>schedule<//><//>` }}
            error=${!!errs.start} helperText=${errs.start || '24-hour, e.g. 23:30'} onChange=${e => set({ start: e.target.value })} />
          <${TextField} id="ed-end" label="End Time" value=${d.end} placeholder="hh:mm" sx=${{ width: 180 }}
            inputProps=${{ inputMode: 'numeric', maxLength: 5 }}
            InputProps=${{ endAdornment: html`<${InputAdornment} position="end"><${Icon} sx=${{ color: 'text.secondary' }}>schedule<//><//>` }}
            error=${!!errs.end} helperText=${errs.end || '24-hour, e.g. 05:00'} onChange=${e => set({ end: e.target.value })} />
          <${Box} sx=${{ pt: 1.25 }}>
            ${overnight(d) ? html`<${Chip} id="overnight" icon=${html`<${Icon} sx=${{ fontSize: 18, ml: '6px' }}>bedtime<//>`}
              label=${`Overnight — ends the next day at ${d.end}`} sx=${{ bgcolor: '#EDE7F6', color: '#4527A0' }} />` : null}
            <${Typography} variant="body2" color="text.secondary" sx=${{ mt: overnight(d) ? .75 : 0 }}>Israel time (Asia/Jerusalem). An end time earlier than the start runs overnight.<//>
          <//>
        <//>
        ${ov.length ? html`
          <${Alert} severity="warning" id="overlap" sx=${{ mt: 1 }}>
            Overlaps ${ov.map((o, i) => html`<span key=${o.s.id}>${i ? ', ' : ''}<b>${o.s.name}</b> on ${o.shared} device${o.shared > 1 ? 's' : ''}</span>`)} at the same time.
            ${' '}A device runs one weekly schedule, so only one action can win — the rule isn't decided yet.
          <//>` : null}
        <${Gap} id="G3" />
        ${ov.length ? html`<${Gap} id="G5" />` : null}
      <//>

      <${SectionCard} title="Scheduled actions" id="card-actions"
        note="What changes during the time window. Each device gets only the actions its type supports.">
        ${errs.action ? html`<${Alert} severity="error" id="action-error" sx=${{ mb: 2 }}>${errs.action}<//>` : null}
        <${Box} sx=${{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
          <${Box} id="pa-block">
            <${Typography} variant="subtitle2" sx=${{ mb: .5 }}>PA action <${Typography} component="span" variant="body2" color="text.secondary">· Barix, ELA<//><//>
            <${RadioGroup} value=${d.pa} onChange=${e => set({ pa: e.target.value })} id="ed-pa">
              <${FormControlLabel} value="none" control=${html`<${Radio} />`} label="No action" />
              <${FormControlLabel} value="adjust" control=${html`<${Radio} />`} label="Adjust volume" />
            <//>
            ${d.pa === 'adjust' ? html`
              <${Box} sx=${{ display: 'flex', alignItems: 'center', gap: 4, pl: 4, pr: 1 }}>
                <${Slider} value=${Number(d.paPct) || 0} min=${-100} max=${100} step=${5} aria-label="Volume adjustment"
                  marks=${[{ value: -100, label: '−100%' }, { value: 0, label: '0' }, { value: 100, label: '+100%' }]}
                  onChange=${(e, v) => set({ paPct: v })} sx=${{ flex: 1, mx: 2, '& .MuiSlider-markLabel': { fontSize: 14 } }} />
                <${TextField} id="ed-pct" label="%" type="number" value=${d.paPct} sx=${{ width: 96 }}
                  inputProps=${{ min: -100, max: 100, step: 5 }} error=${!!errs.pa}
                  onChange=${e => set({ paPct: e.target.value === '' ? '' : Number(e.target.value) })} />
              <//>
              <${Typography} variant="body2" color=${errs.pa ? 'error' : 'text.secondary'} sx=${{ pl: 4, mt: 1.5 }} id="pa-help">
                ${errs.pa || html`Relative to each device's configured default volume. −100% mutes.${ex && Number.isFinite(Number(d.paPct)) ? html` E.g. ${ex.name}: default ${ex.base.volume}% → <b>${absVolume(ex, Number(d.paPct))}%</b>.` : ''}`}
              <//>` : null}
            <${Gap} id="G4" />
          <//>
          <${Box} id="display-block">
            <${Typography} variant="subtitle2" sx=${{ mb: .5 }}>Display action <${Typography} component="span" variant="body2" color="text.secondary">· displays only<//><//>
            <${RadioGroup} value=${d.display} onChange=${e => set({ display: e.target.value })} id="ed-display">
              <${FormControlLabel} value="none" control=${html`<${Radio} />`} label="No action" />
              <${FormControlLabel} value="darken" control=${html`<${Radio} />`} label="Darken all displays" />
              <${FormControlLabel} value="more" disabled control=${html`<${Radio} />`}
                label=${html`<span>More display actions <${Chip} size="small" label="To confirm with Tuan" variant="outlined" sx=${{ ml: 1 }} /></span>`} />
            <//>
            <${Typography} variant="body2" color="text.secondary" sx=${{ mt: .5 }}>ELA speakers and Barix have no display, so they never get a display action.<//>
            <${Gap} id="G7" />
          <//>
        <//>

        <${Box} id="base-audio-note" sx=${{ mt: 2.5, p: 1.5, border: '1px dashed rgba(0,0,0,.26)', borderRadius: 1, bgcolor: '#FAFAFA', display: 'flex', gap: 1.5 }}>
          <${Icon} sx=${{ color: 'text.secondary' }}>tune<//>
          <${Box}>
            <${Typography} variant="body2" sx=${{ fontWeight: 500 }}>Base audio settings aren't part of a schedule<//>
            <${Typography} variant="body2" color="text.secondary">
              Default volume and equalizer are persistent Barix settings, set on each device (Device details › Base audio settings). A schedule only adjusts relative to them, and only inside its time window.
            <//>
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
  const dirty = !!base && (String(base.volume) !== String(d.base.volume) || base.eq !== d.base.eq);
  useEffect(() => { setDirty(dirty); return () => setDirty(false); }, [dirty]);
  const scheds = SCHEDULES.filter(s => reach(s).some(x => x.d.id === d.id && x.useful));
  const entries = weeklyEntries(d);
  const fields = d.kind === 'display' ? ['screen_on'] : ['muted', 'volume'];
  const save = () => { if (base) { d.base = { volume: Number(base.volume), eq: base.eq }; } bump(); setDirty(false); toast('Device saved'); go('devices'); };
  const via = s => s.mode === 'group' ? `Group · ${groupName(s.group)}` : `Station · ${stName(d.station)}`;

  return html`
    <${Box} sx=${{ maxWidth: 1180 }}>
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

      ${base ? html`
        <${SectionCard} title="Base audio settings" id="card-base"
          chip=${html`<${Chip} size="small" label="Persistent — not scheduled" icon=${html`<${Icon} sx=${{ fontSize: 18, ml: '6px' }}>push_pin<//>`} />`}
          note="Always in force on this device. Schedules adjust relative to the default volume, only inside their time window.">
          <${FieldGrid} cols=${3}>
            <${TextField} id="dv-vol" label="Default volume (%)" type="number" value=${base.volume} inputProps=${{ min: 0, max: 100 }}
              onChange=${e => setBase({ ...base, volume: e.target.value })} />
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
                        : html`<${StateChip} st=${{ kind: s.apply && s.apply.stale ? 'stale' : 'ok', text: s.apply && s.apply.stale ? 'Needs re-apply' : `Applied ${s.apply ? s.apply.at : ''}` }} />`}<//>
                    <//>`;
                })}
              <//>
            <//>
          <//>` : html`<${Typography} variant="body2" color="text.secondary" id="dv-none">No schedule reaches this device.<//>`}

        ${entries.length && !(phase === 2 && d.kind === 'ela') ? html`
          <${Typography} variant="subtitle2" sx=${{ mt: 2.5, mb: .5 }}>Weekly entries on the device<//>
          <${Typography} variant="body2" color="text.secondary" sx=${{ mb: 1 }}>
            What ETC wrote through the PaxLife API — read back from the device. Replaced on every apply; don't edit it on the device.
          <//>
          <${Paper} variant="outlined" sx=${{ borderColor: '#E7E7E7' }}>
            <${Table} id="dv-entries">
              <${TableHead}><${TableRow}><${TableCell}>Weekday<//><${TableCell}>Time<//>${fields.map(f => html`<${TableCell} key=${f} sx=${{ fontFamily: 'Roboto Mono, monospace' }}>${f}<//>`)}<${TableCell}>From schedule<//><//><//>
              <${TableBody}>
                ${entries.map((e, i) => html`
                  <${TableRow} key=${i}>
                    <${TableCell}>${DAYS[e.day][1]}<//><${TableCell}>${e.t}<//>
                    ${fields.map(f => html`<${TableCell} key=${f} sx=${{ fontFamily: 'Roboto Mono, monospace' }}>${e[f] || '–'}<//>`)}
                    <${TableCell}>${e.from}<//>
                  <//>`)}
              <//>
            <//>
          <//>
          <${Gap} id="G3" />` : null}
      <//>
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
  const { go, target } = useApp();
  const s = STATIONS.find(x => x.code === target.code);
  const [tab, setTab] = useState(3);
  const list = SCHEDULES.filter(x => targetStations(x).includes(s.code));
  return html`
    <${Box} sx=${{ maxWidth: 1180 }}>
      <${PageHeader} crumbs=${[{ label: 'Stations', onClick: () => go('stations') }, { label: 'Station details' }]} title=${s.code} titleId="sd-title"
        action=${html`<${Button} variant="contained" disabled>Save<//>`} />
      <${FieldGrid}>
        <${TextField} label="Full Name (English)" required value=${s.en} disabled />
        <${TextField} label="Full Name (Hebrew)" required value=${s.he} disabled />
        <${TextField} label="MOT Station Name" required value=${s.mot} disabled />
        <${TextField} label="MOT Station ID" required value=${s.motId} disabled />
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
                        <${TableCell}>${x.mode === 'group' ? 'Group · ' + groupName(x.group) : 'This station'}<//>
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

  const value = { phase, setPhase, listState, setListState: pickList, saveMode, setSaveMode, gaps, setGaps,
                  screen, target, go, rev, bump, toast: setToastMsg, askDelete, setDirty };
  const View = { schedules: ScheduleList, schedule: ScheduleEditor, devices: DeviceList, device: DeviceDetail,
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
              <${View} key=${screen + ':' + JSON.stringify(target)} />
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
            <${Button} color="error" id="leave-discard" onClick=${() => { const l = leave; setLeave(null); doGo(l.s, l.t); }}>Discard changes<//>
          <//>
        <//>
        <${Snackbar} open=${!!toastMsg} autoHideDuration=${3200} onClose=${() => setToastMsg('')}
          message=${toastMsg} anchorOrigin=${{ vertical: 'bottom', horizontal: 'left' }} />
      <//>
    <//>`;
}

ReactDOM.createRoot(document.getElementById('root')).render(html`<${Root} />`);
