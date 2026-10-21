/* ════════════════════════════════════════════════════════════════════
   PIMS · Geplantes Ereignis (Bauarbeiten) — React 18 + MUI v5, no build step.

   Ignat, 2026-10-21: "I need a new prototype … Please recreate a page with
   MUI elements as usual. We will make changes later. At the moment edit
   announcement is a popup but it will be sidesheet as you created previously
   for Emotional AI messages." The goal that comes next: copy one announcement
   onto the others of the event (Ortspunkt, Zulauf 1, 2, 3 …).

   So this is a RECREATION of his four production screenshots — same blocks,
   same order, same labels, same texts — with one change he asked for: the
   "Meldung bearbeiten" popup is a side sheet. The line diagram is a
   simplified drawing of the production one. All data is sample data taken
   from the screenshots.
   ════════════════════════════════════════════════════════════════════ */
const { useState } = React;
const html = htm.bind(React.createElement);
const M = MaterialUI;
const {
  ThemeProvider, createTheme, CssBaseline, Box, Button, IconButton, Typography, TextField, Chip,
  FormControl, InputLabel, Select, MenuItem, Drawer, Divider, Checkbox, FormControlLabel,
  ToggleButton, ToggleButtonGroup, Snackbar, Stack, Tabs, Tab, Paper, Tooltip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
} = M;

const Icon = ({ children, sx }) =>
  html`<span className="material-icons" aria-hidden="true" style=${{ fontSize: 20, ...(sx || {}) }}>${children}</span>`;

const theme = createTheme({
  palette: { primary: { main: '#2196F3', dark: '#1769AA', light: '#64B5F6' }, background: { default: '#F4F4F4' } },
  shape: { borderRadius: 4 },
  typography: { fontSize: 14 },
  components: {
    MuiButton:      { defaultProps: { disableElevation: true } },
    MuiIconButton:  { defaultProps: { size: 'small' } },
    MuiTextField:   { defaultProps: { size: 'small', variant: 'filled' } },
    MuiFormControl: { defaultProps: { size: 'small', variant: 'filled' } },
    MuiPaper:       { defaultProps: { elevation: 0 }, styleOverrides: { root: { border: '1px solid #E0E0E0' } } },
    MuiTableCell:   { styleOverrides: { root: { fontSize: 14 } } },
    MuiFormHelperText: { styleOverrides: { root: { fontSize: 14 } } },
    MuiTooltip:     { styleOverrides: { tooltip: { fontSize: 14 } } },
  },
});

/* ── BVG line colours ─────────────────────────────────────────────── */
const LINE_COLOR = { U1: '#7DAD4C', U2: '#DA421E', U3: '#16683D', U4: '#F0D722', U5: '#7E5330',
                     U6: '#8C6DAB', U7: '#528DBA', U8: '#224F86', U9: '#F3791D', S: '#008D4F' };
function LineBadge({ line, size = 'sm', dim }) {
  const big = size === 'lg';
  return html`<${Box} component="span" className="line-badge" data-line=${line}
    sx=${{ display: 'inline-block', bgcolor: dim ? '#E0E0E0' : LINE_COLOR[line] || '#666', color: line === 'U4' && !dim ? '#000' : '#fff',
           fontWeight: 700, borderRadius: '3px', px: big ? .75 : .5, lineHeight: big ? '30px' : '20px',
           fontSize: big ? 22 : 14, minWidth: big ? 40 : 30, textAlign: 'center' }}>${line}<//>`;
}
const SBadge = () => html`<${Box} component="span" sx=${{ display: 'inline-flex', width: 20, height: 20, borderRadius: '50%',
  bgcolor: LINE_COLOR.S, color: '#fff', fontWeight: 700, fontSize: 14, alignItems: 'center', justifyContent: 'center' }}>S<//>`;

/* ── The U2 line, as in the production diagram (simplified) ───────── */
const STATIONS = ['Rl', 'Sd', 'Nd', 'Th', 'Kd', 'So', 'Bmo', 'Obi', 'RP', 'Zo', 'Wt', 'No', 'Bs', 'Gu', 'MB', 'Pd', 'MH',
                  'Mi', 'Hv', 'Sp', 'Mk', 'Ko', 'A', 'Lu', 'Sz', 'EB', 'Sh', 'VIN', 'PA'];
const CLOSED = new Set(['Sd', 'No', 'Bs', 'Gu', 'MB']);           // "Kein Halt" — hatched
const AFFECTED = new Set(['MH', 'Mi', 'Hv', 'Sp', 'Mk', 'Ko']);   // the event's section — purple
const TRANSFERS = { Sd: ['S'], Kd: ['S'], Bmo: ['U7'], Zo: ['U9', 'S'], Wt: ['U1', 'U3'], No: ['U1', 'U3', 'U4'], Gu: ['U1', 'U3'],
                    Pd: ['S'], Mi: ['U6'], A: ['U5', 'U8', 'S'], Sh: ['S'], PA: ['S'] };
const LINES = ['U1', 'U2', 'U3', 'U4', 'U5', 'U6', 'U7', 'U8', 'U9'];
const LINES_WITH_MSG = new Set(['U2', 'U5', 'U6', 'U8']);

/* ── The event's announcements, verbatim from the screenshots ─────── */
const TYPE_COLOR = { 'Ortspunkt': '#66BB6A', 'Umstieg': '#FFA726', 'Kein Zugverkehr': '#EF5350', 'Zulauf': '#1A35B8' };
const TYPES = Object.keys(TYPE_COLOR);
const txt = place => ({
  daisy: `U2: Umsteigen nötig aufgrund in ${place}.***`,
  de: `U2: Umsteigen nötig aufgrund in ${place}.`,
  en: `U2: Due to a change is required in ${place}.`,
});
const AWA = 'Anton-Wilhelm-Amo-Straße', KL = 'Klosterstraße';
let nextId = 10;
const SEED = [
  { type: 'Ortspunkt',       line: 'U2', stations: 'Mk - Hv',            tracks: '--',  ...txt(AWA) },
  { type: 'Umstieg',         line: 'U2', stations: 'MH',                 tracks: '1,2', ...txt(AWA) },
  { type: 'Umstieg',         line: 'U2', stations: 'Ko',                 tracks: '1,2', ...txt(KL) },
  { type: 'Kein Zugverkehr', line: 'U2', stations: 'Hv - Mk',            tracks: '--',  daisy: 'kein Zugverkehr', de: '', en: '' },
  { type: 'Zulauf',          line: 'U2', stations: 'Rl - Pd',            tracks: '--',  ...txt(AWA) },
  { type: 'Zulauf',          line: 'U2', stations: 'PA - A',             tracks: '--',  ...txt(KL) },
  { type: 'Zulauf',          line: 'U5', stations: 'MUI - Al; Ff - Al',  tracks: '--',  ...txt(KL) },
  { type: 'Zulauf',          line: 'U6', stations: 'Ri - Mic; Ts - Mic', tracks: '--',  ...txt(AWA) },
  { type: 'Zulauf',          line: 'U8', stations: 'Pk - Ap; Mr - Ap',   tracks: '--',  ...txt(KL) },
].map((m, i) => ({ id: i + 1, phase: 'haupt', active: true, daisyInterval: 'endlos', elaInterval: '5', source: 'standard', ...m }));

const DAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const PHASES = [['vorab', 'Vorabmeldung'], ['alt', 'Alt. Hauptmeldung'], ['haupt', 'Hauptmeldung']];
const PHASE_LABEL = { vorab: 'Vorabmeldung', alt: 'Alternative Hauptmeldung', haupt: 'Hauptmeldung' };
const fmtDate = iso => iso ? iso.split('-').reverse().join('.') : '–';

/* ── Small parts ──────────────────────────────────────────────────── */
function DayChips({ value, onChange, disabled, idPrefix }) {
  return html`<${Stack} direction="row" spacing=${.75} className="day-chips">
    ${DAYS.map(d => {
      const on = value.includes(d);
      return html`<${Box} key=${d} component="button" type="button" id=${idPrefix + '-' + d} disabled=${disabled} aria-pressed=${on}
        onClick=${() => onChange(on ? value.filter(x => x !== d) : [...value, d])}
        sx=${{ all: 'unset', boxSizing: 'border-box', width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center',
               justifyContent: 'center', fontSize: 14, cursor: disabled ? 'default' : 'pointer',
               bgcolor: disabled ? '#E0E0E0' : on ? 'primary.main' : '#fff', color: disabled ? '#fff' : on ? '#fff' : 'primary.main',
               border: disabled || on ? 'none' : '1px solid', borderColor: 'primary.main',
               '&:focus-visible': { outline: '2px solid #1769AA', outlineOffset: 2 } }}>${d}<//>`; })}
  <//>`;
}

function Diagram() {
  const box = (st, n) => {
    const closed = CLOSED.has(st), aff = AFFECTED.has(st);
    return html`<${Box} className=${'track-box' + (closed ? ' closed' : aff ? ' affected' : '')}
      sx=${{ width: 20, height: 20, mx: 'auto', my: .5, border: '1px solid', borderColor: closed ? '#E65100' : '#424242',
             borderRadius: '2px', fontSize: 14, lineHeight: '18px', textAlign: 'center',
             bgcolor: aff ? '#7C4DFF' : '#fff', color: aff ? '#fff' : '#212121',
             backgroundImage: closed ? 'repeating-linear-gradient(45deg, #FFB74D 0 3px, #fff 3px 6px)' : 'none' }}>${closed ? '' : n}<//>`;
  };
  return html`<${Paper} id="diagram" sx=${{ display: 'flex', mb: 2 }}>
    <${Stack} sx=${{ borderRight: '1px solid #E0E0E0', p: 1, gap: .5 }} id="lineList">
      ${LINES.map(l => html`<${Box} key=${l} sx=${{ position: 'relative', p: .25, bgcolor: l === 'U2' ? '#F4F4F4' : 'transparent', borderRadius: 1 }}
          data-selected=${l === 'U2'}>
        <${LineBadge} line=${l} size="lg" dim=${l !== 'U2' && !LINES_WITH_MSG.has(l)} />
        ${LINES_WITH_MSG.has(l) ? html`<${Box} sx=${{ position: 'absolute', top: 0, right: -2, width: 10, height: 10, borderRadius: '50%',
          bgcolor: l === 'U2' ? 'primary.main' : '#BDBDBD', border: '2px solid #fff' }} />` : null}
      <//>`)}
    <//>
    <${Box} sx=${{ flex: 1, p: 2, overflowX: 'auto' }}>
      <${Stack} direction="row" spacing=${1.5} alignItems="center" justifyContent="center" sx=${{ mb: 2 }}>
        <${LineBadge} line="U2" size="lg" />
        <${Typography} sx=${{ fontSize: 22 }} id="lineTitle">U Ruhleben - S+U Pankow<//>
      <//>
      <${Box} sx=${{ display: 'grid', gridTemplateColumns: `repeat(${STATIONS.length}, minmax(36px, 1fr))`, minWidth: 1000 }}>
        ${STATIONS.map(st => html`<${Box} key=${st} className="station-col" data-st=${st} sx=${{ textAlign: 'center' }}>
          <${Box} sx=${{ bgcolor: LINE_COLOR.U2, color: '#fff', fontWeight: 700, fontSize: 14, py: .5 }}>${st}<//>
          ${box(st, 1)}${box(st, 2)}
          <${Stack} alignItems="center" spacing=${.25} sx=${{ mt: .5 }}>
            ${(TRANSFERS[st] || []).map(t => t === 'S' ? html`<${SBadge} key=${t} />` : html`<${LineBadge} key=${t} line=${t} />`)}
          <//>
        <//>`)}
      <//>
    <//>
  <//>`;
}

/* ── The announcement side sheet (was a popup in production) ─────── */
function MessageSheet({ open, msg, onClose, onSave, dates }) {
  const isNew = msg && !msg.id;
  const [d, setD] = useState(msg);
  const [err, setErr] = useState({});
  const [playing, setPlaying] = useState(false);
  React.useEffect(() => { setD(msg); setErr({}); setPlaying(false); }, [msg]);
  if (!d) return html`<${Drawer} anchor="right" open=${false} />`;
  const set = (k, v) => setD(x => ({ ...x, [k]: v }));
  const save = () => {
    const e = {};
    if (isNew && !d.type) e.type = true;
    if (isNew && !d.stations.trim()) e.stations = true;
    if (!d.daisy.trim() && !d.de.trim() && !d.en.trim()) e.text = true;
    setErr(e);
    if (Object.keys(e).length) return;
    onSave(d);
  };
  const listen = () => { if (playing) { setPlaying(false); return; } setPlaying(true); setTimeout(() => setPlaying(false), 2500); };
  const meta = [['Mitteilungen', d.type], ['Typ', PHASE_LABEL[d.phase]], ['Stationen', d.stations], ['Gleis', d.tracks],
                ['Datum von', fmtDate(dates.from)], ['Datum bis', fmtDate(dates.to)]];
  return html`<${Drawer} anchor="right" open=${open} onClose=${onClose} id="msgSheet"
    PaperProps=${{ sx: { width: 'min(760px, 66vw)', display: 'flex', flexDirection: 'column' } }}>
    <${Box} sx=${{ display: 'flex', alignItems: 'center', px: 3, py: 2, borderBottom: '1px solid #E0E0E0' }}>
      <${Typography} variant="h6" sx=${{ flex: 1, fontWeight: 500 }} id="sheetTitle">${isNew ? 'Meldung erstellen' : 'Meldung bearbeiten'}<//>
      <${IconButton} aria-label="Hilfe"><${Icon}>help_outline<//><//>
      <${IconButton} aria-label="Schließen" onClick=${onClose}><${Icon}>close<//><//>
    <//>
    <${Box} sx=${{ flex: 1, overflowY: 'auto', px: 3, py: 2.5 }}>
      ${isNew ? html`
        <${Stack} direction="row" spacing=${2} sx=${{ mb: 2.5 }}>
          <${FormControl} sx=${{ minWidth: 200 }} error=${!!err.type}>
            <${InputLabel} id="newType-label">Mitteilungen *<//>
            <${Select} labelId="newType-label" id="newType" value=${d.type} label="Mitteilungen *" onChange=${e => set('type', e.target.value)}>
              ${TYPES.map(t => html`<${MenuItem} key=${t} value=${t}>${t}<//>`)}
            <//>
          <//>
          <${FormControl} sx=${{ minWidth: 120 }}>
            <${InputLabel} id="newLine-label">Linie<//>
            <${Select} labelId="newLine-label" id="newLine" value=${d.line} label="Linie" onChange=${e => set('line', e.target.value)}>
              ${LINES.map(l => html`<${MenuItem} key=${l} value=${l}>${l}<//>`)}
            <//>
          <//>
          <${TextField} id="newStations" label="Stationen *" value=${d.stations} error=${!!err.stations}
            helperText=${err.stations ? 'Pflichtfeld' : ''} onChange=${e => set('stations', e.target.value)} />
          <${TextField} id="newTracks" label="Gleise" value=${d.tracks} sx=${{ width: 120 }} onChange=${e => set('tracks', e.target.value)} />
        <//>` : html`
        <${Stack} direction="row" spacing=${2.5} useFlexGap flexWrap="wrap" sx=${{ mb: 2.5 }} id="sheetMeta">
          ${meta.map(([k, v]) => html`<${Typography} key=${k} variant="body2"><b>${k}:</b> ${v}<//>`)}
        <//>`}

      <${Stack} direction="row" spacing=${2} alignItems="flex-start">
        <${TextField} id="fDaisy" label="DAISY" fullWidth value=${d.daisy} inputProps=${{ maxLength: 160 }}
          helperText=${d.daisy.length + ' / 160'} onChange=${e => set('daisy', e.target.value)} />
        <${FormControl} sx=${{ width: 180, flexShrink: 0 }}>
          <${InputLabel} id="fDaisyInt-label">Intervall<//>
          <${Select} labelId="fDaisyInt-label" id="fDaisyInt" value=${d.daisyInterval} label="Intervall" onChange=${e => set('daisyInterval', e.target.value)}>
            <${MenuItem} value="endlos">Endlostext<//><${MenuItem} value="1">1 min<//><${MenuItem} value="5">5 min<//><${MenuItem} value="10">10 min<//>
          <//>
        <//>
      <//>

      <${ToggleButtonGroup} id="source" exclusive fullWidth color="primary" value=${d.source}
        onChange=${(e, v) => v && set('source', v)} sx=${{ my: 2.5 }}>
        ${[['standard', 'description', 'Standard'], ['record', 'mic', 'Sprachaufzeichnung'], ['library', 'library_music', 'Bibliothek']].map(([v, ic, l]) => html`
          <${ToggleButton} key=${v} value=${v} sx=${{ gap: 1 }}><${Icon} sx=${{ fontSize: 18 }}>${ic}<//>${l}<//>`)}
      <//>

      <${Stack} direction="row" spacing=${2} alignItems="flex-start">
        <${TextField} id="fDe" label="ELA (DEU)" fullWidth multiline minRows=${2} value=${d.de} onChange=${e => set('de', e.target.value)} />
        <${TextField} id="fEn" label="ELA (ENG)" fullWidth multiline minRows=${2} value=${d.en} onChange=${e => set('en', e.target.value)} />
        <${FormControl} sx=${{ width: 180, flexShrink: 0 }}>
          <${InputLabel} id="fElaInt-label">Intervall<//>
          <${Select} labelId="fElaInt-label" id="fElaInt" value=${d.elaInterval} label="Intervall" onChange=${e => set('elaInterval', e.target.value)}>
            <${MenuItem} value="1">1 min<//><${MenuItem} value="5">5 min<//><${MenuItem} value="10">10 min<//><${MenuItem} value="15">15 min<//>
          <//>
        <//>
      <//>
      ${err.text ? html`<${Typography} color="error" variant="body2" sx=${{ mt: 1 }} id="textErr">DAISY- oder ELA-Text fehlt.<//>` : null}
      <${Button} variant="outlined" id="btnListen" sx=${{ mt: 2, minWidth: 190 }} disabled=${!d.de.trim() && !d.en.trim()}
        startIcon=${html`<${Icon} sx=${{ fontSize: 18 }}>${playing ? 'stop' : 'play_arrow'}<//>`} onClick=${listen}>
        ${playing ? 'Stop' : 'Anhören'}<//>
    <//>
    <${Box} sx=${{ display: 'flex', justifyContent: 'flex-end', gap: 1, px: 3, py: 1.5, borderTop: '1px solid #E0E0E0' }}>
      <${Button} variant="outlined" onClick=${onClose} id="sheetCancel">Abbrechen<//>
      <${Button} variant="contained" onClick=${save} id="sheetSave">Speichern<//>
    <//>
  <//>`;
}

/* ── The page ─────────────────────────────────────────────────────── */
function App() {
  const [status, setStatus] = useState('Aktiv');
  const [typ, setTyp] = useState('Kein Halt - einseitig');
  const [dano, setDano] = useState('');
  const [vorab, setVorab] = useState(false);
  const [vorabDates, setVorabDates] = useState({ from: '2026-10-21', to: '2026-10-28' });
  const [vorabDays, setVorabDays] = useState(DAYS.slice());
  const [haupt, setHaupt] = useState({ from: '2026-10-21', to: '2026-11-04' });
  const [hauptDays, setHauptDays] = useState(DAYS.slice());
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState([]);
  const [showComments, setShowComments] = useState(false);
  const [msgs, setMsgs] = useState(SEED);
  const [tab, setTab] = useState('haupt');
  const [sheet, setSheet] = useState(null);       // message being edited / created
  const [del, setDel] = useState(null);
  const [toast, setToast] = useState('');
  /* Copy mode (Ignat, 2026-10-21): the copy icon on a row turns the table itself into the
     target list — checkboxes on the other rows of the same tab, the source marked,
     quick picks per type, then "n Meldungen überschreiben". */
  const [copySrc, setCopySrc] = useState(null);   // id of the source announcement
  const [copySel, setCopySel] = useState([]);     // target ids
  const [flash, setFlash] = useState([]);         // rows just overwritten
  React.useEffect(() => {
    const esc = e => { if (e.key === 'Escape' && copySrc) { setCopySrc(null); setCopySel([]); } };
    window.addEventListener('keydown', esc); return () => window.removeEventListener('keydown', esc);
  }, [copySrc]);

  const count = p => msgs.filter(m => m.phase === p).length;
  const list = msgs.filter(m => m.phase === tab);
  const groups = [['AKTIV', list.filter(m => m.active)], ['PAUSIERT', list.filter(m => !m.active)]].filter(g => g[1].length);
  const src = copySrc ? msgs.find(m => m.id === copySrc) : null;
  const startCopy = m => { setCopySrc(m.id); setCopySel([]); };
  const cancelCopy = () => { setCopySrc(null); setCopySel([]); };
  const toggleSel = id => setCopySel(L => L.includes(id) ? L.filter(x => x !== id) : [...L, id]);
  const targets = src ? list.filter(m => m.id !== src.id) : [];
  const typeCounts = TYPES.map(t => [t, targets.filter(m => m.type === t)]).filter(x => x[1].length);
  // the line prefix follows the target's line: "U2: …" becomes "U5: …" on a U5 announcement
  const relabel = (text, line) => (text || '').replace(/^U\d+:/, line + ':');
  const applyCopy = () => {
    const ids = copySel.slice();
    setMsgs(L => L.map(x => ids.includes(x.id) ? { ...x, daisy: relabel(src.daisy, x.line), de: relabel(src.de, x.line), en: relabel(src.en, x.line),
      daisyInterval: src.daisyInterval, elaInterval: src.elaInterval, source: src.source } : x));
    setFlash(ids); setTimeout(() => setFlash([]), 2500);
    setToast(ids.length === 1 ? 'Text in 1 Meldung übernommen.' : `Text in ${ids.length} Meldungen übernommen.`);
    cancelCopy();
  };
  const newMsg = () => ({ id: null, phase: tab, active: true, type: '', line: 'U2', stations: '', tracks: '--',
                          daisy: '', de: '', en: '', daisyInterval: 'endlos', elaInterval: '5', source: 'standard' });
  const saveMsg = m => {
    if (m.id) setMsgs(L => L.map(x => x.id === m.id ? m : x));
    else setMsgs(L => [...L, { ...m, id: nextId++ }]);
    setSheet(null); setToast('Meldung gespeichert.');
  };
  const dateField = (id, label, value, onChange, disabled) => html`<${TextField} id=${id} type="date" label=${label} value=${value}
    disabled=${disabled} InputLabelProps=${{ shrink: true }} sx=${{ width: 170 }} onChange=${e => onChange(e.target.value)} />`;

  return html`
    <${Box} sx=${{ minHeight: '100vh', bgcolor: 'background.default' }}>
      ${/* ── top bar ── */ ''}
      <${Box} id="topBar" sx=${{ position: 'sticky', top: 0, zIndex: 1100, bgcolor: '#fff', borderBottom: '1px solid #E0E0E0',
                     display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1 }}>
        <${IconButton} aria-label="Schließen" onClick=${() => setToast('Schließen ist im Prototyp nicht verbunden.')}><${Icon}>close<//><//>
        <${LineBadge} line="U2" size="lg" />
        <${Typography} sx=${{ fontWeight: 500 }} id="eventTitle">Ereignis - Bauarbeiten<//>
        <${Chip} size="small" id="eventStatus" label=${status}
          sx=${{ bgcolor: status === 'Aktiv' ? '#E8F5E9' : status === 'Pausiert' ? '#FFF3E0' : '#EEEEEE',
                 color: status === 'Aktiv' ? '#1B5E20' : status === 'Pausiert' ? '#8A5A00' : '#616161', fontSize: 14 }} />
        <${Box} sx=${{ flex: 1 }} />
        <${Tooltip} title="Fortsetzen"><span><${IconButton} aria-label="Fortsetzen" disabled=${status === 'Aktiv'} onClick=${() => setStatus('Aktiv')}><${Icon}>play_circle_outline<//><//></span><//>
        <${Tooltip} title="Pausieren"><span><${IconButton} aria-label="Pausieren" disabled=${status !== 'Aktiv'} onClick=${() => setStatus('Pausiert')}><${Icon}>pause_circle_outline<//><//></span><//>
        <${Tooltip} title="Stoppen"><span><${IconButton} aria-label="Stoppen" disabled=${status === 'Beendet'} onClick=${() => setStatus('Beendet')}><${Icon}>stop_circle<//><//></span><//>
        <${Button} variant="outlined" id="btnReport" onClick=${() => setToast('Bericht wird erstellt.')}>Bericht generieren<//>
        <${Button} variant="outlined" color="error" id="btnEnd" disabled=${status === 'Beendet'} onClick=${() => setStatus('Beendet')}>Beenden<//>
        <${Button} variant="contained" id="btnSaveEvent" onClick=${() => setToast('Ereignis gespeichert.')}>Ereignis speichern<//>
      <//>

      ${/* Ignat, 2026-10-21: content full width */ ''}
      <${Box} sx=${{ p: 3 }}>
        <${Diagram} />

        ${/* ── event settings ── */ ''}
        <${Paper} id="settings" sx=${{ p: 2, mb: 2 }}>
          <${Box} sx=${{ display: 'grid', gridTemplateColumns: '220px 1fr 1fr', columnGap: 3 }}>
            <${Stack} spacing=${2}>
              <${FormControl}>
                <${InputLabel} id="typ-label">Typ<//>
                <${Select} labelId="typ-label" id="typ" value=${typ} label="Typ" onChange=${e => setTyp(e.target.value)}>
                  ${['Kein Halt - einseitig', 'Kein Halt - beidseitig', 'Kein Zugverkehr', 'Pendelverkehr'].map(o => html`<${MenuItem} key=${o} value=${o}>${o}<//>`)}
                <//>
              <//>
              <${TextField} id="dano" label="Dano / Name" value=${dano} onChange=${e => setDano(e.target.value)} />
            <//>
            <${Box} sx=${{ borderLeft: '1px solid #E0E0E0', pl: 3 }} id="vorabBlock">
              <${FormControlLabel} control=${html`<${Checkbox} id="vorab" checked=${vorab} onChange=${e => setVorab(e.target.checked)} />`}
                label=${html`<${Typography} sx=${{ fontWeight: 500 }}>Vorabmeldung<//>`} />
              <${Stack} direction="row" spacing=${2} sx=${{ my: 1.5 }}>
                ${dateField('vorabFrom', 'Datum von', vorabDates.from, v => setVorabDates(x => ({ ...x, from: v })), !vorab)}
                ${dateField('vorabTo', 'Datum bis', vorabDates.to, v => setVorabDates(x => ({ ...x, to: v })), !vorab)}
              <//>
              <${Stack} direction="row" spacing=${2} alignItems="center">
                <${DayChips} value=${vorabDays} onChange=${setVorabDays} disabled=${!vorab} idPrefix="vd" />
                <${Button} variant="contained" disabled=${!vorab} onClick=${() => setToast('Zeiträume einstellen ist im Prototyp nicht verbunden.')}>Zeiträume einstellen<//>
              <//>
            <//>
            <${Box} sx=${{ borderLeft: '1px solid #E0E0E0', pl: 3 }} id="hauptBlock">
              <${Typography} sx=${{ fontWeight: 500, mt: 1 }}>Hauptmeldung<//>
              <${Stack} direction="row" spacing=${2} sx=${{ my: 1.5 }}>
                ${dateField('hauptFrom', 'Datum von', haupt.from, v => setHaupt(x => ({ ...x, from: v })))}
                ${dateField('hauptTo', 'Datum bis', haupt.to, v => setHaupt(x => ({ ...x, to: v })))}
              <//>
              <${Stack} direction="row" spacing=${2} alignItems="center">
                <${DayChips} value=${hauptDays} onChange=${setHauptDays} idPrefix="hd" />
                <${Button} variant="contained" onClick=${() => setToast('Zeiträume einstellen ist im Prototyp nicht verbunden.')}>Zeiträume einstellen<//>
              <//>
            <//>
          <//>
          <${Typography} sx=${{ fontWeight: 500, mt: 3, mb: 1 }}>Alternative Hauptmeldung<//>
          <${DayChips} value=${[]} onChange=${() => {}} disabled idPrefix="ad" />
        <//>

        ${/* ── internal communication ── */ ''}
        <${Paper} id="comms" sx=${{ p: 2, mb: 2 }}>
          <${TextField} id="comment" label="Interne Kommunikation" fullWidth value=${comment} onChange=${e => setComment(e.target.value)} />
          <${Stack} direction="row" spacing=${2} sx=${{ mt: 2 }}>
            <${Button} variant="outlined" id="btnComment" disabled=${!comment.trim()}
              onClick=${() => { setComments(c => [...c, comment.trim()]); setComment(''); }}>Hinzufügen<//>
            <${Button} variant="outlined" id="btnAllComments" onClick=${() => setShowComments(true)}>Alles sehen (${comments.length})<//>
          <//>
        <//>

        ${/* ── announcements ── */ ''}
        <${Paper} id="messages" sx=${{ mb: 4 }}>
          <${Box} sx=${{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #E0E0E0', pr: 2 }}>
            <${Tabs} value=${tab} onChange=${(e, v) => { cancelCopy(); setTab(v); }} sx=${{ flex: 1 }}>
              ${PHASES.map(([v, l]) => html`<${Tab} key=${v} value=${v} data-phase=${v} label=${count(v) ? `${l} (${count(v)})` : l} />`)}
            <//>
            <${Button} variant="outlined" id="btnNewMsg" disabled=${!!src} onClick=${() => setSheet(newMsg())}>Meldung erstellen<//>
          <//>
          ${src ? html`<${Box} id="copyBar" sx=${{ position: 'sticky', top: 54, zIndex: 5, bgcolor: '#E3F2FD', borderBottom: '1px solid #BBDEFB',
                px: 2, py: 1.25, display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <${Icon} sx=${{ color: '#1769AA' }}>content_copy<//>
            <${Typography} sx=${{ fontWeight: 500 }} id="copyTitle">Text kopieren von ${src.type} · ${src.line} · ${src.stations}<//>
            <${Stack} direction="row" spacing=${1} id="copyQuick">
              ${typeCounts.map(([t, rows]) => {
                const all = rows.every(r => copySel.includes(r.id));
                return html`<${Chip} key=${t} clickable label=${`Alle ${t} (${rows.length})`} data-type=${t} sx=${{ fontSize: 14 }}
                  color=${all ? 'primary' : 'default'} variant=${all ? 'filled' : 'outlined'}
                  onClick=${() => setCopySel(L => all ? L.filter(id => !rows.some(r => r.id === id)) : [...new Set([...L, ...rows.map(r => r.id)])])} />`; })}
            <//>
            <${Box} sx=${{ flex: 1 }} />
            <${Button} onClick=${cancelCopy} id="copyCancel">Abbrechen<//>
            <${Button} variant="contained" id="copyApply" disabled=${!copySel.length} onClick=${applyCopy}>
              ${copySel.length === 1 ? '1 Meldung überschreiben' : `${copySel.length} Meldungen überschreiben`}<//>
          <//>` : null}
          <${TableContainer}>
            <${Table} id="msgTable">
              <${TableHead}><${TableRow}>
                ${src ? html`<${TableCell} padding="checkbox">
                  <${Checkbox} id="copyAll" checked=${targets.length > 0 && copySel.length === targets.length}
                    indeterminate=${copySel.length > 0 && copySel.length < targets.length}
                    inputProps=${{ 'aria-label': 'Alle auswählen' }}
                    onChange=${e => setCopySel(e.target.checked ? targets.map(t => t.id) : [])} /><//>` : null}
                ${['Mitteilungen', 'Linie', 'Stationen', 'Gleise', 'Text'].map(h => html`<${TableCell} key=${h} sx=${{ fontWeight: 500 }}>${h}<//>`)}
                <${TableCell} />
              <//><//>
              ${groups.length ? groups.map(([g, rows]) => html`<${TableBody} key=${g} className="msg-group" data-group=${g}>
                <${TableRow}><${TableCell} colSpan=${src ? 7 : 6} sx=${{ fontWeight: 500, py: 1, pl: 3, bgcolor: '#FAFAFA' }}>${g}<//><//>
                ${rows.map(m => {
                  const isSrc = src && m.id === src.id, sel = copySel.includes(m.id);
                  return html`<${TableRow} key=${m.id} className=${'msg-row' + (isSrc ? ' copy-src' : '') + (flash.includes(m.id) ? ' flash' : '')}
                    data-id=${m.id} data-type=${m.type} hover=${!src} selected=${sel}
                    onClick=${src && !isSrc ? () => toggleSel(m.id) : undefined}
                    sx=${{ opacity: m.active || src ? 1 : .6, cursor: src && !isSrc ? 'pointer' : 'default',
                           bgcolor: isSrc ? '#FFF8E1' : flash.includes(m.id) ? '#E8F5E9' : undefined, transition: 'background-color .6s' }}>
                  ${src ? html`<${TableCell} padding="checkbox">
                    ${isSrc ? html`<${Chip} size="small" label="Quelle" color="warning" sx=${{ fontSize: 14, ml: .5 }} />`
                      : html`<${Checkbox} checked=${sel} inputProps=${{ 'aria-label': 'Ziel: ' + m.type + ' ' + m.stations }}
                          onClick=${e => e.stopPropagation()} onChange=${() => toggleSel(m.id)} />`}<//>` : null}
                  <${TableCell} sx=${{ borderLeft: '4px solid', borderLeftColor: TYPE_COLOR[m.type] || '#9E9E9E', width: 120 }}>${m.type}<//>
                  <${TableCell} sx=${{ width: 70 }}><${LineBadge} line=${m.line} /><//>
                  <${TableCell} sx=${{ width: 140, whiteSpace: 'pre-line' }}>${m.stations.replace(/; /g, ';\n')}<//>
                  <${TableCell} sx=${{ width: 80 }}>${m.tracks}<//>
                  <${TableCell} className="msg-text">
                    ${m.daisy ? html`<div><b>DAISY</b>: ${m.daisy}</div>` : null}
                    ${m.de ? html`<div><b>ELA (DEU)</b>: ${m.de}</div>` : null}
                    ${m.en ? html`<div><b>ELA (ENG)</b>: ${m.en}</div>` : null}
                  <//>
                  <${TableCell} align="right" sx=${{ whiteSpace: 'nowrap', width: 170 }}>
                    ${src ? null : html`<${React.Fragment}>
                    <${Tooltip} title="Text kopieren nach …">
                      <${IconButton} aria-label=${'Kopieren: ' + m.type + ' ' + m.stations} onClick=${() => startCopy(m)}
                        disabled=${list.length < 2}><${Icon}>content_copy<//><//>
                    <//>
                    <${Tooltip} title=${m.active ? 'Pausieren' : 'Fortsetzen'}>
                      <${IconButton} aria-label=${(m.active ? 'Pausieren' : 'Fortsetzen') + ': ' + m.type + ' ' + m.stations}
                        onClick=${() => setMsgs(L => L.map(x => x.id === m.id ? { ...x, active: !x.active } : x))}>
                        <${Icon}>${m.active ? 'pause_circle_outline' : 'play_circle_outline'}<//><//>
                    <//>
                    <${Tooltip} title="Bearbeiten">
                      <${IconButton} aria-label=${'Bearbeiten: ' + m.type + ' ' + m.stations} onClick=${() => setSheet(m)}><${Icon}>edit<//><//>
                    <//>
                    <${Tooltip} title="Löschen">
                      <${IconButton} aria-label=${'Löschen: ' + m.type + ' ' + m.stations} onClick=${() => setDel(m)}><${Icon}>delete<//><//>
                    <//>
                    <//>`}
                  <//>
                <//>`; })}
              <//>`) : html`<${TableBody}><${TableRow}><${TableCell} colSpan=${src ? 7 : 6} sx=${{ color: 'text.secondary', py: 3, textAlign: 'center' }}
                  id="noMsgs">Keine Meldungen<//><//><//>`}
            <//>
          <//>
        <//>
      <//>

      <${MessageSheet} open=${!!sheet} msg=${sheet} onClose=${() => setSheet(null)} onSave=${saveMsg}
        dates=${tab === 'vorab' ? vorabDates : haupt} />

      <${Dialog} open=${!!del} onClose=${() => setDel(null)} id="delDialog">
        <${DialogTitle}>Meldung löschen?<//>
        <${DialogContent}><${DialogContentText}>${del ? `${del.type} · ${del.line} · ${del.stations}` : ''}<//><//>
        <${DialogActions}>
          <${Button} onClick=${() => setDel(null)}>Abbrechen<//>
          <${Button} color="error" variant="contained" id="delConfirm"
            onClick=${() => { setMsgs(L => L.filter(x => x.id !== del.id)); setDel(null); setToast('Meldung gelöscht.'); }}>Löschen<//>
        <//>
      <//>

      <${Dialog} open=${showComments} onClose=${() => setShowComments(false)} fullWidth maxWidth="sm" id="commentsDialog">
        <${DialogTitle}>Interne Kommunikation<//>
        <${DialogContent}>
          ${comments.length ? comments.map((c, i) => html`<${Typography} key=${i} sx=${{ py: 1, borderBottom: '1px solid #EEE' }}>${c}<//>`)
            : html`<${Typography} color="text.secondary">Keine Einträge<//>`}
        <//>
        <${DialogActions}><${Button} onClick=${() => setShowComments(false)}>Schließen<//><//>
      <//>

      <${Snackbar} open=${!!toast} autoHideDuration=${2400} message=${toast}
        onClose=${(e, why) => { if (why !== 'clickaway') setToast(''); }} anchorOrigin=${{ vertical: 'bottom', horizontal: 'center' }} />
    <//>`;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  html`<${ThemeProvider} theme=${theme}><${CssBaseline} /><${App} /><//>`);
