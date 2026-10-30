/* ════════════════════════════════════════════════════════════════════
   N8 · Staff PC — station departures board (ISR)
   React 18 + MUI v5, no build step.

   Ignat, 2026-10-30: "Can you recreate based on the screenshots?" — the
   earlier version was lost. Faithful copy of the staging screen
   (n8.isr.staging…/isr/staff-pc?station=TM): dark theme, controls LTR in
   English, the table RTL with Hebrew headers.
   2026-10-30 (later): table restyled to the customer reference (608 · Feature 621) —
   8 columns, Hebrew names/types, pass-through and delay in הערות, platform change
   blinks 5 s then stays yellow until departure; demo bar on top drives live updates.

   Copy sources:
   · captured — every label, header, the station dropdown entries shown,
                train types, slider range/bubble/Reset, Last Updated
                (Ignat's 5 screenshots, 2026-10-30).
   · sample   — trains and timetable, station names not in the screenshots,
                the occasional delay, the passing-train mark in עובר.
   Minimum text size 14px.
   ════════════════════════════════════════════════════════════════════ */
const { useState, useEffect, useMemo } = React;
const html = htm.bind(React.createElement);
const {
  ThemeProvider, createTheme, CssBaseline, Box, Button, IconButton, Typography, TextField, MenuItem,
  Select, FormControl, InputLabel, Checkbox, ListItemText, FormControlLabel, Slider, Chip, Tooltip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, InputAdornment,
} = MaterialUI;

const Icon = ({ children, sx }) =>
  html`<${Box} component="span" className="material-icons" aria-hidden="true" sx=${{ fontSize: 20, ...(sx || {}) }}>${children}<//>`;

const theme = createTheme({
  palette: { mode: 'dark', primary: { main: '#64B5F6' }, background: { default: '#000', paper: '#000' } },
  typography: { fontSize: 14 },
  components: {
    MuiFilledInput: { styleOverrides: { root: { backgroundColor: '#424242', '&:hover': { backgroundColor: '#4a4a4a' }, '&.Mui-focused': { backgroundColor: '#424242' } } } },
    MuiTooltip: { styleOverrides: { tooltip: { fontSize: 14 } } },
    MuiTableCell: { styleOverrides: { root: { fontSize: 14 } } },
    MuiChip: { styleOverrides: { root: { fontSize: 14 } } },
  },
});

/* Hebrew station names for the table (customer reference 608 / Feature 621; names not in the
   reference are my translation — sample). */
const HE = {
  AHI: 'אחיהוד', AKO: 'עכו', ADA: 'אשדוד עד הלום', ASK: 'אשקלון', ATL: 'עתלית', BS: 'באר שבע-אוניברסיטה',
  YOST: 'בת ים-יוספטל', KOM: 'בת ים-קוממיות', BQV: 'באר יעקב', NTBG: 'נתב"ג', YSA: 'בית יהושע',
  RZL: 'הרצליה', HOL: 'חולון-צומת', JERU: 'ירושלים-נבון', NET: 'נתניה', TM: 'תל אביב-סבידור מרכז',
  HGA: 'תל אביב-ההגנה', HSM: 'תל אביב-השלום', UN: 'תל אביב-אוניברסיטה',
};
const heSt = c => HE[c] || c;
/* Train types in Hebrew — the reference leaves סוג empty, so these are my translation (sample). */
const TYPE_HE = { Passenger: 'נוסעים', Cargo: 'משא', Empty: 'ריק' };

/* ── Stations — the dropdown rows captured, plus TM and the codes used in the table (sample names). */
const STATIONS = [
  ['AHI', 'Ahihud'], ['AKO', 'Akko'], ['ADA', 'Ashdod Ad Halom'], ['ASK', 'Ashkelon'], ['ATL', 'Atlit'],
  ['BS', 'B. Sheva Uni'], ['YOST', 'BY-Yoseftal'], ['KOM', 'Bat Yam - Komemiyyut'], ['BQV', "Be'er Ya'akov"],
  ['NTBG', 'Ben Gurion Airport'], ['YSA', 'Beit Yehoshua'], ['RZL', 'Herzliya'], ['HOL', 'Holon Junction'],
  ['JERU', 'Jerusalem - Yitzhak Navon'], ['NET', 'Netanya'], ['TM', 'TLV-Center'], ['HGA', 'TLV-HaHagana'],
  ['HSM', 'TLV-HaShalom'], ['UN', 'TLV-University'],
].map(([code, name]) => ({ code, name, label: `${code} - ${name}`, he: HE[code] || name }))
 .sort((a, b) => a.name.localeCompare(b.name));
const TYPES = ['Cargo', 'Empty', 'Passenger'];

/* ── Timetable — services repeat every day. min = minute past the hour; every = minutes.
   TM reproduces the captured rows (740 RZL 13:20, 745 JERU 13:35, 643 ASK 13:37, 518 NET 14:38 …). */
const TM_SERVICES = [
  { base: 740, step: 2, dest: 'RZL', via: ['UN'], first: '05:20', every: 30, type: 'Passenger', pl: 3 },
  { base: 745, step: 2, dest: 'JERU', via: ['HSM', 'HGA', 'NTBG'], first: '05:05', every: 30, type: 'Passenger', pl: 1 },
  { base: 643, step: 2, dest: 'ASK', via: ['HSM', 'HGA', 'HOL'], first: '05:07', every: 30, type: 'Passenger', pl: 2 },
  { base: 518, step: 450, dest: 'NET', via: ['UN', 'RZL', 'YSA'], first: '05:38', every: 30, type: 'Passenger', pl: 4 },
  { base: 6012, step: 2, dest: 'ADA', via: [], first: '05:52', every: 120, type: 'Cargo', passing: true, pl: 5 },
  { base: 9301, step: 1, dest: 'BQV', via: [], first: '05:28', every: 180, type: 'Empty', passing: true, pl: 6 },
];
const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
/* Other stations: same shape, destinations and stops shifted so each board looks different. */
function servicesFor(code) {
  if (code === 'TM') return TM_SERVICES;
  const others = STATIONS.map(s => s.code).filter(c => c !== code);
  const seed = [...code].reduce((a, c) => a + c.charCodeAt(0), 0);
  const pick = (i) => others[(seed + i * 5) % others.length];
  return TM_SERVICES.map((s, i) => ({
    ...s, base: s.base + (seed % 40) * 2, dest: pick(i), via: s.via.map((_, j) => pick(i + j + 3)),
    first: `05:${String((toMin(s.first) + seed) % 60).padStart(2, '0')}`,
  }));
}
/* Trains of one service day (05:00–24:00). */
function dayTrains(code) {
  const out = [];
  servicesFor(code).forEach(s => {
    for (let t = toMin(s.first), i = 0; t < 24 * 60; t += s.every, i++) {
      const no = s.base + ((i * s.step) % 500);
      out.push({ no, type: s.type, dest: s.dest, via: s.via, min: t, passing: !!s.passing, platform: s.pl,
        // sample: a few trains run late
        delay: no % 11 === 0 ? 4 : no % 17 === 0 ? 7 : 0 });
    }
  });
  return out;
}

/* ── Time in Israel ─────────────────────────────────────────────── */
const TZ = 'Asia/Jerusalem';
const fmtHM = d => new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
const fmtHMS = d => new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(d);
const fmtDay = d => {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short' })
    .formatToParts(d).map(x => [x.type, x.value]));
  return `${p.weekday}, ${p.day} ${p.month}`;
};
const minuteOfDay = d => toMin(fmtHM(d));
const mm = m => { const x = ((m % 1440) + 1440) % 1440; return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`; };

/* Window shown around the viewing time — the capture at 14:08 lists 13:20 … 15:35. */
const BEFORE = 50, AFTER = 90;

/* Customer reference (608 · Feature 621): black header, rows alternating black / grey, all table
   text yellow. Red line removed and text enlarged at Ignat's request (2026-10-30). */
const YEL = '#FFFF4D', GREY = '#6E6E6E';
const cellSx = { color: YEL, borderBottom: 'none', py: .9, whiteSpace: 'nowrap', fontSize: 20, fontWeight: 500 };
const headSx = { color: '#fff', bgcolor: '#000', fontWeight: 700, borderBottom: 'none', py: 1, whiteSpace: 'nowrap', fontSize: 18 };
const BLINK_MS = 5000;
/* Delay minutes after the updated time, red, as in N8's current StaffPC: "10:52 (+6)". Times and
   numbers read left to right inside Hebrew text, so the bracket sits right of the time. To discuss. */
const FIELD_SX = { width: 270, '& .MuiInputBase-root': { height: 56 } };

function App() {
  const [now, setNow] = useState(() => new Date());
  const [updated, setUpdated] = useState(() => new Date());
  const [spin, setSpin] = useState(false);
  const [station, setStation] = useState('TM');
  const [types, setTypes] = useState([]);
  const [passing, setPassing] = useState(true);
  const [offset, setOffset] = useState(0);
  /* Live updates from the demo bar, per train row: { platform, platformAt, delay } */
  const [live, setLive] = useState({});
  const [note, setNote] = useState('');

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 250); return () => clearInterval(t); }, []);
  const refresh = () => { setSpin(true); setTimeout(() => { setUpdated(new Date()); setSpin(false); }, 500); };
  useEffect(() => { refresh(); setLive({}); setNote(''); }, [station]);

  const viewing = new Date(now.getTime() + offset * 3600e3);
  const nowMin = minuteOfDay(now);
  const viewMin = nowMin + offset * 60;          // minutes relative to today 00:00

  const base = useMemo(() => {
    const day = dayTrains(station);
    const all = [-1, 0, 1, 2].flatMap(d => day.map(t => ({ ...t, abs: t.min + d * 1440, key: `${d}-${t.no}-${t.min}` })));
    return all.filter(t => t.abs >= viewMin - BEFORE && t.abs <= viewMin + AFTER)
      .filter(t => !types.length || types.includes(t.type))
      .filter(t => passing || !t.passing)
      .sort((a, b) => a.abs - b.abs);
  }, [station, types, passing, Math.floor(viewMin)]);
  const rows = base.map(t => {
    const l = live[t.key] || {};
    return { ...t, ...(l.delay != null ? { delay: l.delay } : {}), oldPlatform: l.platform != null ? t.platform : null,
             platform: l.platform != null ? l.platform : t.platform, platformAt: l.platformAt };
  });

  /* Demo actions — a train that hasn't left yet changes platform / runs late. */
  const upcoming = () => rows.filter(t => t.abs + (t.delay || 0) >= nowMin && !t.passing);
  const rnd = a => a[Math.floor(Math.random() * a.length)];
  const changePlatform = () => {
    const t = rnd(upcoming().length ? upcoming() : rows); if (!t) return;
    const np = rnd([1, 2, 3, 4, 5, 6].filter(p => p !== t.platform));
    setLive(l => ({ ...l, [t.key]: { ...(l[t.key] || {}), platform: np, platformAt: Date.now() } }));
    setUpdated(new Date());
    setNote(`Train ${t.no}: platform ${t.platform} → ${np}`);
  };
  const delayTrain = () => {
    const pool = upcoming().filter(t => !t.delay); const t = rnd(pool.length ? pool : rows); if (!t) return;
    const d = rnd([3, 5, 8, 12]);
    setLive(l => ({ ...l, [t.key]: { ...(l[t.key] || {}), delay: d } }));
    setUpdated(new Date());
    setNote(`Train ${t.no}: ${d} min late`);
  };
  const resetDemo = () => { setLive({}); setNote(''); };

  const bubble = offset === 0
    ? { label: 'Now', bg: '#E8F5E9', fg: '#2E7D32' }
    : offset > 0 ? { label: `+${offset}h`, bg: '#E3F2FD', fg: '#1565C0' } : { label: `${offset}h`, bg: '#FFF3E0', fg: '#E65100' };

  /* Column order from the customer reference, right to left. */
  const head = ['רכבת', 'יעד', 'שעה', 'מעודכן', 'רציף', 'סוג', 'תחנות ביניים', 'הערות'];
  const remark = t => [t.passing ? 'חולפת' : '', t.delay ? 'איחור' : ''].filter(Boolean).join(', ');
  const demoBtn = (id, label, onClick) => html`<button id=${id} onClick=${onClick}
    style=${{ background: 'none', border: 'none', color: 'rgba(255,255,255,.85)', fontFamily: 'inherit', fontSize: 14,
              padding: '5px 12px', borderRadius: 4, cursor: 'pointer' }}>${label}</button>`;

  return html`
    <div className="variant-switch" id="demo-bar"
      style=${{ display: 'flex', alignItems: 'center', gap: 12, background: '#2B2B2B', color: '#fff', padding: '8px 20px',
                fontSize: 14, fontFamily: 'Roboto, sans-serif', borderBottom: '1px solid #444' }}>
      <span style=${{ opacity: .75, fontSize: 14, fontWeight: 500, textTransform: 'uppercase' }}>Demo</span>
      <span style=${{ display: 'flex', gap: 4, background: 'rgba(255,255,255,.1)', borderRadius: 6, padding: 3 }}>
        ${demoBtn('demo-platform', 'Change platform', changePlatform)}
        ${demoBtn('demo-delay', 'Delay a train', delayTrain)}
        ${demoBtn('demo-reset', 'Reset', resetDemo)}
      </span>
      <span id="demo-note" style=${{ opacity: .75 }}>${note}</span>
    </div>
    <${Box} sx=${{ minHeight: 'calc(100vh - 47px)', bgcolor: '#000', color: '#fff', px: 1.5, py: 2 }}>
      <${Box} id="toolbar" sx=${{ display: 'flex', alignItems: 'center', gap: 2, mb: 2.5, flexWrap: 'nowrap' }}>
        <${TextField} select id="station" label="Station" variant="filled" size="small" value=${station}
          onChange=${e => setStation(e.target.value)} sx=${FIELD_SX}
          SelectProps=${{ MenuProps: { PaperProps: { sx: { bgcolor: '#fff', color: 'rgba(0,0,0,.87)', maxHeight: 420 } } },
                          IconComponent: p => html`<${Tooltip} title=${'Close'}><${Box} component="span" ...${p} className=${'material-icons ' + (p.className || '')} sx=${{ color: '#fff' }}>arrow_drop_down<//><//>` }}>
          ${STATIONS.map(s => html`<${MenuItem} key=${s.code} value=${s.code} data-station=${s.code} sx=${{ fontSize: 16 }}>${s.label}<//>`)}
        <//>
        <${TextField} select id="types-field" label="Train types" variant="filled" size="small" value=${types} sx=${FIELD_SX}
          InputLabelProps=${{ shrink: true }}
          InputProps=${{ endAdornment: types.length ? html`<${InputAdornment} position="end" sx=${{ mr: 2.5 }}>
            <${IconButton} id="types-clear" size="small" aria-label="Clear train types"
              onMouseDown=${e => e.stopPropagation()} onClick=${e => { e.stopPropagation(); setTypes([]); }}>
              <${Icon} sx=${{ fontSize: 18, color: '#fff' }}>close<//><//><//>` : null }}
          SelectProps=${{ id: 'types', multiple: true, displayEmpty: true, onChange: e => setTypes(e.target.value),
                          renderValue: v => v.length ? v.join(', ') : 'All',
                          MenuProps: { PaperProps: { sx: { bgcolor: '#fff', color: 'rgba(0,0,0,.87)' } } } }}
          >
          ${TYPES.map(t => html`<${MenuItem} key=${t} value=${t} data-type=${t}>
            <${Checkbox} size="small" checked=${types.includes(t)} sx=${{ color: 'rgba(0,0,0,.54)', p: .5, mr: 1 }} />
            <${ListItemText} primary=${t} primaryTypographyProps=${{ fontSize: 16 }} /><//>`)}
        <//>
        <${FormControlLabel} id="passing-label" sx=${{ mr: 1, flexShrink: 0 }}
          control=${html`<${Checkbox} id="passing" checked=${passing} onChange=${e => setPassing(e.target.checked)} />`}
          label="Show passing trains" />

        ${/* Time block fits the 48px field row: chip · [Viewing … / -12 slider +24]. One text size (16px). */ ''}
        <${Chip} id="offset-chip" label=${bubble.label}
          sx=${{ flexShrink: 0, minWidth: 60, height: 28, fontSize: 16, bgcolor: bubble.bg, color: bubble.fg, fontWeight: 500 }} />
        <${Box} id="time" sx=${{ width: 330, flexShrink: 0, height: 48, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', mr: 1 }}>
          <${Typography} id="viewing" sx=${{ fontSize: 16, lineHeight: '20px' }}>Viewing: ${fmtHM(viewing)} ${fmtDay(viewing)}<//>
          <${Box} sx=${{ display: 'flex', alignItems: 'center', gap: 1.25, height: 24 }}>
            <${Typography} component="span" sx=${{ fontSize: 14, color: 'rgba(255,255,255,.7)', width: 24, textAlign: 'right' }}>-12<//>
            <${Slider} id="slider" value=${offset} min=${-12} max=${24} step=${1} marks aria-label="Time offset (hours)"
              onChange=${(e, v) => setOffset(v)} size="small" sx=${{ flex: 1, py: '10px', '& .MuiSlider-mark': { bgcolor: '#fff', opacity: .6 } }} />
            <${Typography} component="span" sx=${{ fontSize: 14, color: 'rgba(255,255,255,.7)', width: 24 }}>+24<//>
          <//>
        <//>
        ${offset !== 0 ? html`<${Button} id="reset" variant="outlined" onClick=${() => setOffset(0)}
          sx=${{ flexShrink: 0, whiteSpace: 'nowrap', height: 36, borderColor: 'rgba(100,181,246,.5)' }}>Reset to now<//>` : null}

        <${Box} sx=${{ ml: 'auto', display: 'flex', alignItems: 'center', gap: .5, flexShrink: 0 }}>
          <${Typography} id="updated" sx=${{ fontSize: 16 }}>Last Updated: ${fmtHMS(updated)}<//>
          <${IconButton} id="refresh" aria-label="Refresh" color="primary" onClick=${refresh}>
            <${Icon} sx=${{ transition: 'transform .5s', transform: spin ? 'rotate(360deg)' : 'none' }}>sync<//>
          <//>
        <//>
      <//>

      <${TableContainer} component=${Paper} elevation=${0} sx=${{ bgcolor: '#000', borderRadius: 0 }}>
        <${Table} id="board" dir="rtl" size="small"
          sx=${{ '@keyframes plBlink': { '0%, 49%': { backgroundColor: YEL, color: '#000' }, '50%, 100%': { backgroundColor: 'transparent', color: YEL } } }}>
          <${TableHead}><${TableRow}>${head.map(h => html`<${TableCell} key=${h} align="right" sx=${headSx}>${h}<//>`)}<//><//>
          <${TableBody}>
            ${rows.length ? rows.map((t, i) => {
              const changed = t.oldPlatform != null;
              const blinking = changed && now.getTime() - t.platformAt < BLINK_MS;
              // stays yellow until the train has left the station
              const marked = changed && (blinking || t.abs + (t.delay || 0) >= nowMin);
              const plSx = !marked ? cellSx : blinking
                ? { ...cellSx, animation: 'plBlink 1s steps(1) infinite', fontWeight: 700 }
                : { ...cellSx, bgcolor: YEL, color: '#000', fontWeight: 700 };
              return html`
              <${TableRow} key=${t.key} data-train=${t.no} data-type=${t.type} data-passing=${t.passing ? 1 : 0}
                sx=${{ bgcolor: i % 2 ? '#000' : GREY }}>
                <${TableCell} align="right" sx=${cellSx}>${t.no}<//>
                <${TableCell} align="right" sx=${cellSx} data-col="dest">${heSt(t.dest)}<//>
                <${TableCell} align="right" sx=${cellSx} data-col="planned">${mm(t.abs)}<//>
                <${TableCell} align="right" sx=${cellSx} data-col="updated">${t.delay ? html`<span dir="ltr">${mm(t.abs + t.delay)} <${Box} component="span" data-delay sx=${{ color: '#FF5A5A', fontWeight: 700 }}>(+${t.delay})<//></span>` : ''}<//>
                <${TableCell} align="right" sx=${plSx} data-col="platform" data-state=${blinking ? 'blink' : marked ? 'changed' : ''}>${t.platform}<//>
                <${TableCell} align="right" sx=${cellSx} data-col="type">${TYPE_HE[t.type]}<//>
                <${TableCell} align="right" sx=${cellSx} data-col="via">${t.via.map(heSt).join(', ')}<//>
                <${TableCell} align="right" sx=${cellSx} data-col="remark">${remark(t)}<//>
              <//>`; }) : html`<${TableRow}><${TableCell} colSpan=${8} align="center" sx=${{ ...cellSx, py: 4 }} id="empty">אין רכבות<//><//>`}
          <//>
        <//>
      <//>
    <//>`;
}

ReactDOM.createRoot(document.getElementById('root')).render(html`
  <${ThemeProvider} theme=${theme}><${CssBaseline} /><${App} /><//>`);
