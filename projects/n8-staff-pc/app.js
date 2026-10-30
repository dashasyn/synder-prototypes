/* ════════════════════════════════════════════════════════════════════
   N8 · Staff PC — station departures board (ISR)
   React 18 + MUI v5, no build step.

   Ignat, 2026-10-30: "Can you recreate based on the screenshots?" — the
   earlier version was lost. Faithful copy of the staging screen
   (n8.isr.staging…/isr/staff-pc?station=TM): dark theme, controls LTR in
   English, the table RTL with Hebrew headers.

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
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
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

/* ── Stations — the dropdown rows captured, plus TM and the codes used in the table (sample names). */
const STATIONS = [
  ['AHI', 'Ahihud'], ['AKO', 'Akko'], ['ADA', 'Ashdod Ad Halom'], ['ASK', 'Ashkelon'], ['ATL', 'Atlit'],
  ['BS', 'B. Sheva Uni'], ['YOST', 'BY-Yoseftal'], ['KOM', 'Bat Yam - Komemiyyut'], ['BQV', "Be'er Ya'akov"],
  ['NTBG', 'Ben Gurion Airport'], ['YSA', 'Beit Yehoshua'], ['RZL', 'Herzliya'], ['HOL', 'Holon Junction'],
  ['JERU', 'Jerusalem - Yitzhak Navon'], ['NET', 'Netanya'], ['TM', 'TLV-Center'], ['HGA', 'TLV-HaHagana'],
  ['HSM', 'TLV-HaShalom'], ['UN', 'TLV-University'],
].map(([code, name]) => ({ code, name, label: `${code} - ${name}` }))
 .sort((a, b) => a.name.localeCompare(b.name));
const TYPES = ['Cargo', 'Empty', 'Passenger'];

/* ── Timetable — services repeat every day. min = minute past the hour; every = minutes.
   TM reproduces the captured rows (740 RZL 13:20, 745 JERU 13:35, 643 ASK 13:37, 518 NET 14:38 …). */
const TM_SERVICES = [
  { base: 740, step: 2, dest: 'RZL', via: ['UN'], first: '05:20', every: 30, type: 'Passenger' },
  { base: 745, step: 2, dest: 'JERU', via: ['HSM', 'HGA', 'NTBG'], first: '05:05', every: 30, type: 'Passenger' },
  { base: 643, step: 2, dest: 'ASK', via: ['HSM', 'HGA', 'HOL'], first: '05:07', every: 30, type: 'Passenger' },
  { base: 518, step: 450, dest: 'NET', via: ['UN', 'RZL', 'YSA'], first: '05:38', every: 30, type: 'Passenger' },
  { base: 6012, step: 2, dest: 'ADA', via: [], first: '05:52', every: 120, type: 'Cargo', passing: true },
  { base: 9301, step: 1, dest: 'BQV', via: [], first: '05:28', every: 180, type: 'Empty', passing: true },
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
      out.push({ no, type: s.type, dest: s.dest, via: s.via, min: t, passing: !!s.passing,
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

const cellSx = { color: '#fff', borderBottom: '1px solid #333', py: 1.1, whiteSpace: 'nowrap' };
const headSx = { color: 'rgba(0,0,0,.87)', bgcolor: '#F0F0F0', fontWeight: 700, borderBottom: 'none', py: 1.1, whiteSpace: 'nowrap',
  position: 'relative', '&:not(:last-of-type)::after': { content: '""', position: 'absolute', left: 0, top: '25%', height: '50%', width: '1px', bgcolor: '#BDBDBD' } };

function App() {
  const [now, setNow] = useState(() => new Date());
  const [updated, setUpdated] = useState(() => new Date());
  const [spin, setSpin] = useState(false);
  const [station, setStation] = useState('TM');
  const [types, setTypes] = useState([]);
  const [passing, setPassing] = useState(true);
  const [offset, setOffset] = useState(0);

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  const refresh = () => { setSpin(true); setTimeout(() => { setUpdated(new Date()); setSpin(false); }, 500); };
  useEffect(() => { refresh(); }, [station]);

  const viewing = new Date(now.getTime() + offset * 3600e3);
  const viewMin = minuteOfDay(now) + offset * 60;          // minutes relative to today 00:00

  const rows = useMemo(() => {
    const day = dayTrains(station);
    const all = [-1, 0, 1, 2].flatMap(d => day.map(t => ({ ...t, abs: t.min + d * 1440, key: `${d}-${t.no}-${t.min}` })));
    return all.filter(t => t.abs >= viewMin - BEFORE && t.abs <= viewMin + AFTER)
      .filter(t => !types.length || types.includes(t.type))
      .filter(t => passing || !t.passing)
      .sort((a, b) => a.abs - b.abs);
  }, [station, types, passing, Math.floor(viewMin)]);

  const pct = (offset + 12) / 36 * 100;
  const bubble = offset === 0
    ? { label: 'Now', bg: '#E8F5E9', fg: '#2E7D32' }
    : offset > 0 ? { label: `+${offset}h`, bg: '#E3F2FD', fg: '#1565C0' } : { label: `${offset}h`, bg: '#FFF3E0', fg: '#E65100' };

  const stationOptions = STATIONS;
  const head = ['רכבת', 'סוג רכבת', 'רציף', 'תחנות ביניים', 'יעד', 'עובר', 'שעה מתוכננת', 'שעה מעודכנת', 'הערות'];

  return html`
    <${Box} sx=${{ minHeight: '100vh', bgcolor: '#000', color: '#fff', px: 1.5, py: 2 }}>
      <${Box} id="toolbar" sx=${{ display: 'flex', alignItems: 'center', gap: 2, mb: 2.5, flexWrap: 'nowrap' }}>
        <${TextField} select id="station" label="Station" variant="filled" size="small" value=${station}
          onChange=${e => setStation(e.target.value)} sx=${{ width: 270 }}
          SelectProps=${{ MenuProps: { PaperProps: { sx: { bgcolor: '#fff', color: 'rgba(0,0,0,.87)', maxHeight: 420 } } },
                          IconComponent: p => html`<${Tooltip} title=${'Close'}><${Box} component="span" ...${p} className=${'material-icons ' + (p.className || '')} sx=${{ color: '#fff' }}>arrow_drop_down<//><//>` }}>
          ${stationOptions.map(s => html`<${MenuItem} key=${s.code} value=${s.code} data-station=${s.code} sx=${{ fontSize: 16 }}>${s.label}<//>`)}
        <//>
        <${FormControl} variant="filled" size="small" sx=${{ width: 270 }}>
          <${Select} id="types" multiple displayEmpty value=${types} onChange=${e => setTypes(e.target.value)}
            renderValue=${v => v.length ? v.join(', ') : 'All Train Types'}
            MenuProps=${{ PaperProps: { sx: { bgcolor: '#fff', color: 'rgba(0,0,0,.87)' } } }}
            sx=${{ '& .MuiSelect-select': { pt: '16px', pb: '15px' } }}>
            ${TYPES.map(t => html`<${MenuItem} key=${t} value=${t} data-type=${t}>
              <${Checkbox} size="small" checked=${types.includes(t)} sx=${{ color: 'rgba(0,0,0,.54)', p: .5, mr: 1 }} />
              <${ListItemText} primary=${t} primaryTypographyProps=${{ fontSize: 16 }} /><//>`)}
          <//>
        <//>
        <${FormControlLabel} id="passing-label" sx=${{ mr: 1, flexShrink: 0 }}
          control=${html`<${Checkbox} id="passing" checked=${passing} onChange=${e => setPassing(e.target.checked)} />`}
          label="Show passing trains" />

        <${Box} id="time" sx=${{ width: 300, flexShrink: 0, position: 'relative', pt: 3.5, mx: 1 }}>
          <${Chip} id="offset-chip" size="small" label=${bubble.label}
            sx=${{ position: 'absolute', top: 0, left: `${pct}%`, transform: 'translateX(-50%)', bgcolor: bubble.bg, color: bubble.fg, fontWeight: 500, height: 22 }} />
          <${Typography} id="viewing" sx=${{ position: 'absolute', top: 2, right: 0, fontSize: 15 }}>Viewing: ${fmtHM(viewing)} ${fmtDay(viewing)}<//>
          <${Slider} id="slider" value=${offset} min=${-12} max=${24} step=${1} marks aria-label="Time offset (hours)"
            onChange=${(e, v) => setOffset(v)} size="small" sx=${{ mt: .5, mb: -.5, '& .MuiSlider-mark': { bgcolor: '#fff', opacity: .6 } }} />
          <${Box} sx=${{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}><span>-12</span><span>+24</span><//>
        <//>
        ${offset !== 0 ? html`<${Button} id="reset" variant="outlined" onClick=${() => setOffset(0)}
          sx=${{ flexShrink: 0, lineHeight: 1.3, width: 110, borderColor: 'rgba(100,181,246,.5)' }}>Reset to now<//>` : null}

        <${Box} sx=${{ ml: 'auto', display: 'flex', alignItems: 'center', gap: .5, flexShrink: 0 }}>
          <${Typography} id="updated" sx=${{ fontSize: 15 }}>Last Updated: ${fmtHMS(updated)}<//>
          <${IconButton} id="refresh" aria-label="Refresh" color="primary" onClick=${refresh}>
            <${Icon} sx=${{ transition: 'transform .5s', transform: spin ? 'rotate(360deg)' : 'none' }}>sync<//>
          <//>
        <//>
      <//>

      <${TableContainer} component=${Paper} elevation=${0} sx=${{ bgcolor: '#000', border: '1px solid #333', borderRadius: '4px' }}>
        <${Table} id="board" dir="rtl" size="small">
          <${TableHead}><${TableRow}>${head.map(h => html`<${TableCell} key=${h} align="right" sx=${headSx}>${h}<//>`)}<//><//>
          <${TableBody}>
            ${rows.length ? rows.map(t => html`
              <${TableRow} key=${t.key} data-train=${t.no} data-type=${t.type} data-passing=${t.passing ? 1 : 0}>
                <${TableCell} align="right" sx=${cellSx}>${t.no}<//>
                <${TableCell} align="right" sx=${cellSx}>${t.type}<//>
                <${TableCell} align="right" sx=${cellSx}>--<//>
                <${TableCell} align="right" sx=${cellSx} data-col="via">
                  ${/* RTL cell, as captured: "HSM, HGA, NTBG" reads right to left, airport icon after NTBG */ ''}
                  ${t.via.length ? t.via.map((c, i) => html`${i ? ', ' : ''}${c}${c === 'NTBG' ? html`<${Icon} sx=${{ fontSize: 16, verticalAlign: 'middle', ml: .25 }}>flight_takeoff<//>` : ''}`) : '--'}
                <//>
                <${TableCell} align="right" sx=${cellSx}>${t.dest}<//>
                <${TableCell} align="right" sx=${cellSx} data-col="passing">${t.passing ? html`<${Icon} sx=${{ fontSize: 18 }}>check<//>` : ''}<//>
                <${TableCell} align="right" sx=${cellSx} data-col="planned">${mm(t.abs)}<//>
                <${TableCell} align="right" sx=${{ ...cellSx, color: t.delay ? '#FFB74D' : '#fff' }} data-col="updated">${t.delay ? mm(t.abs + t.delay) : '--'}<//>
                <${TableCell} align="right" sx=${cellSx}>--<//>
              <//>`) : html`<${TableRow}><${TableCell} colSpan=${9} align="center" sx=${{ ...cellSx, py: 4, color: 'rgba(255,255,255,.7)' }} id="empty">אין רכבות<//><//>`}
          <//>
        <//>
      <//>
    <//>`;
}

ReactDOM.createRoot(document.getElementById('root')).render(html`
  <${ThemeProvider} theme=${theme}><${CssBaseline} /><${App} /><//>`);
