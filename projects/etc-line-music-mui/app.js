/* ════════════════════════════════════════════════════════════════════
   PIMS · Liniensicht U1 — Musik pausieren / fortsetzen. React 18 + MUI v5, no build step.

   Ignat, 2026-11-09: FGI may pause the music at one station from the line view.
   · a second action next to "Stummschaltung": MUSIK PAUSIEREN / MUSIK FORTSETZEN,
     shown only when music is playing / paused; no music → no button
   · pausing needs a reason; starting does not
   · always the whole station (music is per station); no end time
   · a reminder after 3 h (the backend triggers it — here only a preview)
   · a muted station mutes its music too; after unmute paused music stays paused
   · outdoor stations with mute times: music is silent during that window
   Two options behind the switcher:
     1 · a separate button and its own dialog (recommended)
     2 · one STUMMSCHALTUNG button, the choice of what to silence inside the dialog
   The line, the event table and the mute dialog recreate his production screenshots.
   Names, reasons, times and the outdoor schedule are SAMPLE data.
   ════════════════════════════════════════════════════════════════════ */
const { useState } = React;
const html = htm.bind(React.createElement);
const {
  ThemeProvider, createTheme, CssBaseline, Box, Button, IconButton, Typography, TextField, Chip,
  Popover, Radio, RadioGroup, FormControlLabel, Divider, Snackbar, Stack, Paper, Tooltip, Badge, Avatar,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions,
} = MaterialUI;

const Icon = ({ children, sx }) =>
  html`<span className="material-icons" aria-hidden="true" style=${{ fontSize: 20, ...(sx || {}) }}>${children}</span>`;

const theme = createTheme({
  palette: { primary: { main: '#3A7BD5' }, background: { default: '#F4F5F7' } },
  typography: { fontSize: 14 },
  components: {
    MuiButton:      { defaultProps: { disableElevation: true } },
    MuiTextField:   { defaultProps: { variant: 'filled' } },
    MuiPaper:       { defaultProps: { elevation: 0 } },
    MuiTableCell:   { styleOverrides: { root: { fontSize: 14 } } },
    MuiTooltip:     { styleOverrides: { tooltip: { fontSize: 14 } } },
    MuiFormControlLabel: { styleOverrides: { label: { fontSize: 16 } } },
  },
});

const LINE_COLOR = { U1: '#7DAD4C', U2: '#DA421E', U3: '#16683D', U4: '#F0D722', U5: '#7E5330',
                     U6: '#8C6DAB', U7: '#528DBA', U8: '#224F86', U9: '#F3791D', S: '#008D4F' };
const LineBadge = ({ line, big }) => line === 'S'
  ? html`<${Box} component="span" sx=${{ display: 'inline-flex', width: 20, height: 20, borderRadius: '50%', bgcolor: LINE_COLOR.S,
      color: '#fff', fontWeight: 700, fontSize: 14, alignItems: 'center', justifyContent: 'center' }}>S<//>`
  : html`<${Box} component="span" className="line-badge" sx=${{ display: 'inline-block', bgcolor: LINE_COLOR[line], color: line === 'U4' ? '#000' : '#fff',
      fontWeight: 700, borderRadius: '3px', px: .5, minWidth: big ? 40 : 30, textAlign: 'center',
      fontSize: big ? 22 : 14, lineHeight: big ? '32px' : '20px' }}>${line}<//>`;

/* ── U1, as in the production screenshot ──────────────────────────── */
const STATIONS = [
  { c: 'U',       name: 'Uhlandstraße',      tracks: [1, 2],    xfer: [] },
  { c: 'Kfo',     name: 'Kurfürstendamm',    tracks: [1, 2],    xfer: ['U9'], ev: true },
  { c: 'Wt',      name: 'Wittenbergplatz',   tracks: [1, 6],    xfer: ['U2', 'U3'], ev: true },
  { c: 'Nu / Nm', name: 'Nollendorfplatz',   tracks: [1, 2],    xfer: ['U2', 'U3', 'U4'], ev: true },
  { c: 'Kus',     name: 'Kurfürstenstraße',  tracks: [1, 2],    xfer: ['U3'], ev: true },
  { c: 'Go',      name: 'Gleisdreieck',      tracks: [1, 2],    xfer: ['U2', 'U3'], ev: true },
  { c: 'Mo',      name: 'Möckernbrücke',     tracks: [1, 2],    xfer: ['U3', 'U7'], ev: true },
  { c: 'Ho',      name: 'Hallesches Tor',    tracks: [1, 2],    xfer: ['U3', 'U6'], ev: true },
  { c: 'Pr',      name: 'Prinzenstraße',     tracks: [1, 2],    xfer: ['U3'], ev: true },
  { c: 'Kbo',     name: 'Kottbusser Tor',    tracks: [1, 2],    xfer: ['U3', 'U8'], ev: true },
  { c: 'Gr',      name: 'Görlitzer Bahnhof', tracks: [1, 2],    xfer: ['U3'], ev: true },
  { c: 'S',       name: 'Schlesisches Tor',  tracks: [1, 2],    xfer: ['U3'], outdoor: { from: '22:00', to: '06:00' } },
  { c: 'WA',      name: 'Warschauer Straße', tracks: [1, 2, 3], xfer: ['U3', 'S'] },
];
const BY = Object.fromEntries(STATIONS.map(s => [s.c, s]));
const ME = 'M. Krüger';   // the signed-in FGI user (sample)

/* station state: the existing mute (announcements) and the music, kept apart */
const SEED = Object.fromEntries(STATIONS.map(s => [s.c, { mute: null, music: 'playing', pause: null }]));
SEED.Mo.mute  = { scope: 'Bahnhof', tracks: [0, 1], reason: 'Bauarbeiten am Bahnsteig', by: 'S. Weber' };
SEED.Pr.mute  = { scope: 'Bahnhof', tracks: [0, 1], reason: 'Polizeieinsatz', by: 'T. Yilmaz' };
SEED.Kbo.music = 'paused';
SEED.Kbo.pause = { reason: 'Beschwerde von Anwohnern', by: 'S. Weber', at: '09.11.2026 13:40' };
SEED.Ho.music = 'none';

const now = () => { const d = new Date(), p = x => String(x).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`; };
/* what the music actually does right now */
const musicNow = (s, st) => st.mute ? 'muted' : st.music === 'none' ? 'none'
  : s.outdoor ? 'schedule' : st.music;     // the sample outdoor window is treated as active now

/* ── chrome ───────────────────────────────────────────────────────── */
function VariantBar({ v, setV, role, setRole, onReminder, reminderOk }) {
  const seg = (items, val, set, idp) => html`<${Box} sx=${{ display: 'flex', gap: .5, bgcolor: 'rgba(255,255,255,.1)', borderRadius: '6px', p: '3px' }}>
    ${items.map(([k, l]) => html`<${Box} key=${k} component="button" id=${idp + k} onClick=${() => set(k)}
      sx=${{ all: 'unset', cursor: 'pointer', px: 1.5, py: .6, borderRadius: '4px', fontSize: 14,
             color: val === k ? '#2B2B2B' : 'rgba(255,255,255,.8)', bgcolor: val === k ? '#fff' : 'transparent' }}>${l}<//>`)}<//>`;
  const lab = t => html`<${Box} component="span" sx=${{ opacity: .75, textTransform: 'uppercase', fontSize: 14 }}>${t}<//>`;
  return html`<${Box} className="variant-switch" sx=${{ display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: '#2B2B2B', color: '#fff', px: 2.5, py: 1 }}>
    ${lab('Variante')}${seg([[1, '1 · Eigener Button'], [2, '2 · Auswahl im Dialog']], v, setV, 'vs-')}
    <${Box} sx=${{ width: 16 }} />
    ${lab('Rolle')}${seg([['fgi', 'FGI'], ['admin', 'Admin Jukebox'], ['other', 'Andere']], role, setRole, 'role-')}
    <${Box} sx=${{ flex: 1 }} />
    <${Box} component="button" id="btnReminder" onClick=${onReminder} disabled=${!reminderOk}
      sx=${{ all: 'unset', cursor: reminderOk ? 'pointer' : 'default', opacity: reminderOk ? 1 : .4, fontSize: 14,
             border: '1px solid rgba(255,255,255,.4)', borderRadius: '4px', px: 1.5, py: .5 }}>3-h-Erinnerung zeigen<//>
  <//>`;
}

function TopBar() {
  const item = (l, active, menu) => html`<${Box} key=${l} sx=${{ px: 1.75, height: 52, display: 'flex', alignItems: 'center', fontSize: 14, fontWeight: 500,
    color: active ? 'primary.main' : 'text.primary', borderBottom: '2px solid', borderColor: active ? 'primary.main' : 'transparent' }}>
    ${l}${menu ? html`<${Icon} sx=${{ fontSize: 18 }}>expand_more<//>` : null}<//>`;
  return html`<${Box} id="topBar" sx=${{ display: 'flex', alignItems: 'center', height: 52, bgcolor: '#fff', borderBottom: '1px solid #E0E0E0', px: 2 }}>
    <${Box} sx=${{ width: 30, height: 30, bgcolor: '#FFCC00', borderRadius: '50% 50% 50% 0', transform: 'rotate(-45deg)', mr: 2.5,
      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <${Box} component="span" sx=${{ transform: 'rotate(45deg)', fontSize: 9, fontWeight: 700 }}>BVG<//><//>
    ${item('Ereignissicht')}${item('Liniensicht', true)}${item('Meldungssicht', false, true)}${item('Dauermeldungen', false, true)}${item('Konfiguration', false, true)}
    <${Box} sx=${{ flex: 1 }} />
    <${Box} sx=${{ color: 'primary.main', fontSize: 14, fontWeight: 500, mr: 3 }}>VIRTUAL DAISY & ELA<//>
    <${Box} sx=${{ color: 'primary.main', fontSize: 14, fontWeight: 500, mr: 3 }}>TN I, TN II, TN III<//>
    <${Icon} sx=${{ color: '#616161', marginRight: 24 }}>notifications<//>
    <${Box} sx=${{ fontSize: 14, mr: 3 }}>DE<//>
    <${Avatar} sx=${{ width: 32, height: 32, mr: 1 }} />
    <${Box} sx=${{ fontSize: 14 }}>BVG BVG<//>
  <//>`;
}

/* ── the line ─────────────────────────────────────────────────────── */
const MUTE_ORANGE = '#E8792E';
function TrackBox({ s, st, i, onClick }) {
  const muted = st.mute && st.mute.tracks.includes(i);
  // Ignat, 2026-11-09: paused music shows inside the track square, like the mute — but grey
  const m = musicNow(s, st), musicOff = !muted && (m === 'paused' || m === 'schedule');
  const n = s.tracks[i];
  const base = { width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14, borderRadius: '2px' };
  const box = html`<${Box} component="button" className=${'track' + (muted ? ' muted' : '') + (musicOff ? ' music-off' : '')} data-st=${s.c} data-track=${i}
    aria-label=${s.name + ' Gleis ' + n} onClick=${e => onClick(e, s.c, i)}
    sx=${{ all: 'unset', ...base, ...(muted ? { bgcolor: '#FBE3D2', border: '2px solid ' + MUTE_ORANGE, color: MUTE_ORANGE }
      : musicOff ? { bgcolor: '#EEEEEE', border: '2px solid #757575', color: '#757575' }
      : s.ev ? { bgcolor: '#7C4DFF', color: '#fff' } : { bgcolor: '#E0E0E0', border: '1px solid #616161', color: '#000' }) }}>
    ${muted ? html`<${Icon} sx=${{ fontSize: 18 }}>volume_off<//>` : musicOff ? html`<${Icon} sx=${{ fontSize: 18 }}>music_off<//>` : n}<//>`;
  return musicOff ? html`<${Tooltip} title=${m === 'paused' ? 'Musik pausiert' : `Musik stumm ${s.outdoor.from}–${s.outdoor.to} (Zeitplan)`}>${box}<//>` : box;
}

function LineDiagram({ state, onTrack }) {
  return html`<${Box} id="lineDiagram" sx=${{ display: 'grid', gridTemplateColumns: `repeat(${STATIONS.length}, 1fr)`, mx: 2 }}>
    ${STATIONS.map(s => html`<${Box} key=${s.c} sx=${{ bgcolor: '#8FA963', color: '#fff', fontWeight: 700, fontSize: 14, textAlign: 'center',
        height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'pre-line' }}>${s.c.replace(' / ', ' /\n')}<//>`)}
    ${STATIONS.map(s => {
      const st = state[s.c], m = musicNow(s, st);
      return html`<${Box} key=${s.c} className="st-col" data-st=${s.c} data-music=${m}
        sx=${{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, pt: 2, pb: 2, borderTop: '1px solid #8A94A6' }}>
        ${s.tracks.map((_, i) => html`<${TrackBox} key=${i} s=${s} st=${st} i=${i} onClick=${onTrack} />`)}
        <${Stack} spacing=${.5} alignItems="center" sx=${{ mt: .5 }}>${s.xfer.map(l => html`<${LineBadge} key=${l} line=${l} />`)}<//>
      <//>`; })}
  <//>`;
}

/* ── the popover on a track ───────────────────────────────────────── */
function MusicInfo({ s, st }) {
  const m = musicNow(s, st);
  const line = (t, cls) => html`<${Typography} className=${cls} sx=${{ fontSize: 16 }}>${t}<//>`;
  if (m === 'paused') return html`<${Box} className="music-info" sx=${{ mt: 1.5 }}>
    ${line(html`<b>Musik pausiert</b> · ${st.pause.by} · ${st.pause.at}`, 'music-paused-by')}
    ${line(html`<b>Grund:</b> ${st.pause.reason}`, 'music-reason')}<//>`;
  if (m === 'muted') return html`<${Box} className="music-info" sx=${{ mt: 1.5 }}>${line(html`<b>Musik stumm</b> (Stummschaltung aktiv)`)}<//>`;
  if (m === 'schedule') return html`<${Box} className="music-info" sx=${{ mt: 1.5 }}>${line(html`<b>Musik stumm</b> bis ${s.outdoor.to} (Zeitplan ${s.outdoor.from}–${s.outdoor.to})`)}<//>`;
  return null;
}

function TrackPopover({ pop, state, variant, role, onClose, open }) {
  if (!pop) return html`<${Popover} open=${false} />`;
  const s = BY[pop.c], st = state[pop.c], m = musicNow(s, st);
  const canMusic = role === 'fgi' && (m === 'playing' || m === 'paused');
  return html`<${Popover} open=${true} anchorEl=${pop.el} onClose=${onClose} id="trackPopover"
    anchorOrigin=${{ vertical: 'bottom', horizontal: 'center' }} transformOrigin=${{ vertical: 'top', horizontal: 'center' }}
    PaperProps=${{ sx: { p: 2, width: 340, boxShadow: '0 4px 16px rgba(0,0,0,.18)', border: '1px solid #E0E0E0' } }}>
    <${Typography} sx=${{ fontWeight: 700, fontSize: 16, mb: 1 }} id="popTitle">${s.name} (${s.c}) · Gleis ${s.tracks[pop.i]}<//>
    ${s.ev ? html`<${Box} className="event-card" sx=${{ bgcolor: '#E8F5E9', borderRadius: 1, p: 1.5, mb: 1.5, '& p': { fontSize: 16 } }}>
      <${Typography}><b>Dano / Name:</b><//>
      <${Typography}><b>Grund:</b> Baumaßnahme<//>
      <${Typography}><b>Startdatum:</b> 09.11.2026 03:30<//>
      <${Typography}><b>Plantyp:</b> Geplant<//>
      <${Typography} component="div"><b>Status:</b> <${Chip} label="Aktiv" sx=${{ bgcolor: '#CDE6CB', color: '#2E6930', fontSize: 14, ml: .5 }} /><//>
      <${Button} variant="outlined" fullWidth sx=${{ mt: 1.5 }}>Ereignis anzeigen<//>
    <//>` : null}
    ${st.mute ? html`<${Typography} className="mute-reason" sx=${{ fontSize: 16 }}><b>Grund:</b> ${st.mute.reason}<//>` : null}
    ${role !== 'other' ? html`<${MusicInfo} s=${s} st=${st} />` : null}
    <${Stack} spacing=${1} sx=${{ mt: 2 }}>
      <${Button} variant="outlined" id="btnMute" onClick=${() => open(st.mute ? 'unmute' : variant === 2 ? 'combo' : 'mute')}
        sx=${{ color: MUTE_ORANGE, borderColor: '#F0B58D', '&:hover': { borderColor: MUTE_ORANGE, bgcolor: '#FFF6EF' } }}>Stummschaltung<//>
      ${variant === 1 && canMusic ? html`<${Button} variant="outlined" id="btnMusic"
        startIcon=${html`<${Icon} sx=${{ fontSize: 20 }}>${m === 'paused' ? 'music_note' : 'music_off'}<//>`}
        onClick=${() => open(m === 'paused' ? 'musicStart' : 'musicPause')}
        sx=${{ color: '#424242', borderColor: '#BDBDBD', '&:hover': { borderColor: '#757575', bgcolor: '#F5F5F5' } }}>
        ${m === 'paused' ? 'Musik fortsetzen' : 'Musik pausieren'}<//>` : null}
    <//>
  <//>`;
}

/* ── dialogs ──────────────────────────────────────────────────────── */
const MUTE_OPTS = [['Bahnhof', 'Bahnhof stummschalten'], ['Bahnsteig', 'Bahnsteig/e stummschalten'], ['Gleis', 'Gleis stummschalten']];
function ActionDialog({ dlg, state, role, onClose, onApply }) {
  const [opt, setOpt] = useState('');
  const [reason, setReason] = useState('');
  React.useEffect(() => { setOpt(''); setReason(''); }, [dlg && dlg.kind, dlg && dlg.c]);
  if (!dlg) return html`<${Dialog} open=${false} />`;
  const s = BY[dlg.c], st = state[dlg.c], m = musicNow(s, st);
  const title = { mute: 'Stummschaltung', combo: 'Stummschaltung', unmute: 'Stummschaltung', musicPause: 'Musik pausieren',
                  musicStart: 'Musik fortsetzen', reminder: 'Musik seit 3 Std. pausiert' }[dlg.kind];
  const T = t => html`<${Typography} sx=${{ fontSize: 16, mb: 2 }} className="dlg-text">${t}<//>`;
  const reasonField = html`<${TextField} id="dlgReason" label="Grund" required fullWidth value=${reason} autoFocus
    onChange=${e => setReason(e.target.value)} sx=${{ mt: 1 }} />`;
  const radio = (v, l) => html`<${FormControlLabel} key=${v} value=${v} control=${html`<${Radio} />`} label=${l} data-opt=${v} />`;
  let body, applyOk = true, applyLabel = 'Anwenden', cancelLabel = 'Abbrechen', apply = () => onApply(dlg.kind, { opt, reason });

  if (dlg.kind === 'unmute') body = T('Alle Ansagen aus PIMS wieder aktivieren');
  else if (dlg.kind === 'musicStart') body = T(`Musik an ${s.name} (${s.c}) wieder starten`);
  else if (dlg.kind === 'musicPause') { body = html`${T(`Musik an ${s.name} (${s.c}) pausieren, bis sie manuell fortgesetzt wird.`)}${reasonField}`; applyOk = !!reason.trim(); }
  else if (dlg.kind === 'reminder') {
    body = html`${T(`${s.name} (${s.c}) · pausiert von ${st.pause.by} am ${st.pause.at}`)}
      <${Typography} sx=${{ fontSize: 16 }}><b>Grund:</b> ${st.pause.reason}<//>`;
    applyLabel = 'Musik fortsetzen'; cancelLabel = 'Pausiert lassen';
  } else {
    // mute (production) — and in variant 2 the music choice joins the same list
    const musicOpt = dlg.kind === 'combo' && role === 'fgi' && (m === 'playing' || m === 'paused') ? (m === 'paused' ? 'musicStart' : 'musicPause') : null;
    const isMusic = opt === 'musicPause' || opt === 'musicStart';
    body = html`
      ${T(opt === 'musicPause' ? 'Nur die Musik am Bahnhof wird pausiert. Ansagen laufen weiter.'
        : opt === 'musicStart' ? `Musik an ${s.name} (${s.c}) wieder starten`
        : 'Alle Ansagen aus PIMS werden stummgeschaltet, bis sie manuell wieder aktiviert werden.')}
      <${RadioGroup} value=${opt} onChange=${e => setOpt(e.target.value)} id="dlgOpts">
        ${MUTE_OPTS.map(([v, l]) => radio(v, l))}
        ${musicOpt ? html`<${Divider} sx=${{ my: 1 }} />${radio(musicOpt, musicOpt === 'musicPause' ? 'Nur Musik pausieren' : 'Musik fortsetzen')}` : null}
      <//>
      ${opt && opt !== 'musicStart' ? reasonField : null}`;
    applyOk = !!opt && (opt === 'musicStart' || !!reason.trim());
    if (isMusic) apply = () => onApply(opt, { reason });
  }
  return html`<${Dialog} open=${true} onClose=${onClose} id="actionDialog" data-kind=${dlg.kind} PaperProps=${{ sx: { width: 520, borderRadius: 2 } }}>
    <${DialogTitle} sx=${{ textAlign: 'center', fontSize: 22, fontWeight: 500, pt: 3 }} id="dlgTitle">${title}<//>
    <${DialogContent} sx=${{ px: 3.5 }}>${body}<//>
    <${DialogActions} sx=${{ px: 3, pb: 2.5 }}>
      <${Button} onClick=${onClose} id="dlgCancel">${cancelLabel}<//>
      <${Button} variant="contained" id="dlgApply" disabled=${!applyOk} onClick=${apply}>${applyLabel}<//>
    <//>
  <//>`;
}

/* ── events tables (production, static) ───────────────────────────── */
const EV_ROWS = [
  ['09.11, 03:30 - 24.11, 01:30', 'Baumaßnahme / Kein Halt - beidseitig', '', 'TN 1', 'Kfo - Gr', ['U2', 'U3', 'U4', 'U6', 'U7', 'U8', 'U9'], 'Hauptmeldung', 'Geplant', 'Aktiv'],
  ['21.09, 02:30 - 06.10, 00:30', 'Baumaßnahme / Kein Halt - beidseitig', '', 'TN 1', 'Go', ['U2', 'U3', 'U7'], '--', 'Geplant', 'Pausiert'],
];
function EventTables() {
  const head = ['Zeitraum', 'Grund / Typ', 'Dano / Name', 'Zuständigkeit', 'Bahnhöfe', 'Kreuzende Linien', 'Aktuelle Meldungen', 'Plantyp', 'Status', 'Aktionen'];
  const H = cols => html`<${TableHead}><${TableRow}>${cols.map(h => html`<${TableCell} key=${h} sx=${{ fontWeight: 700 }}>${h}<//>`)}<//><//>`;
  return html`<${Box} sx=${{ mt: 3 }}>
    <${Box} sx=${{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
      <${Typography} sx=${{ fontSize: 24, fontWeight: 400 }}>Ereignisse<//><${Icon} sx=${{ color: '#616161', marginLeft: 8 }}>help_outline<//>
      <${Box} sx=${{ flex: 1 }} /><${Button} variant="contained">Ereignis erstellen<//>
    <//>
    <${TableContainer} component=${Paper} sx=${{ border: '1px solid #E0E0E0' }}><${Table} size="small">${H(head)}
      <${TableBody}>${EV_ROWS.map((r, i) => html`<${TableRow} key=${i}>
        ${r.slice(0, 5).map((c, k) => html`<${TableCell} key=${k}>${c}<//>`)}
        <${TableCell}><${Stack} direction="row" spacing=${.5}>${r[5].map(l => html`<${LineBadge} key=${l} line=${l} />`)}<//><//>
        <${TableCell}>${r[6]}<//><${TableCell}>${r[7]}<//>
        <${TableCell}><${Chip} label=${r[8]} sx=${{ fontSize: 14, ...(r[8] === 'Aktiv' ? { bgcolor: '#CDE6CB', color: '#2E6930' } : { bgcolor: '#E0E0E0' }) }} /><//>
        <${TableCell}><${IconButton} color="primary" aria-label="Bearbeiten"><${Icon}>edit<//><//><//>
      <//>`)}<//>
    <//><//>
    <${Typography} sx=${{ fontSize: 24, mt: 4, mb: 1.5 }}>Ereignisse anderer Linien<//>
    <${TableContainer} component=${Paper} sx=${{ border: '1px solid #E0E0E0' }}><${Table} size="small">${H(['Linie', ...head])}
      <${TableBody}><${TableRow}><${TableCell} colSpan=${11} align="center" sx=${{ py: 8 }}>Es gibt keine Ereignisse<//><//><//>
    <//><//>
  <//>`;
}

/* ── the page ─────────────────────────────────────────────────────── */
function App() {
  const [variant, setVRaw] = useState(() => location.hash === '#v2' ? 2 : 1);
  const setV = n => { setVRaw(n); history.replaceState(null, '', '#v' + n); setPop(null); };
  const [role, setRole] = useState('fgi');
  const [state, setState] = useState(SEED);
  const [pop, setPop] = useState(null);
  const [dlg, setDlg] = useState(null);
  const [toast, setToast] = useState('');
  const patch = (c, f) => setState(S => ({ ...S, [c]: f({ ...S[c] }) }));
  const pausedLong = Object.keys(state).find(c => state[c].music === 'paused' && !state[c].mute);

  const onApply = (kind, { opt, reason }) => {
    const c = dlg.c, s = BY[c];
    if (kind === 'unmute') { patch(c, x => ({ ...x, mute: null })); setToast('Ansagen wieder aktiviert.'); }
    else if (kind === 'musicPause') { patch(c, x => ({ ...x, music: 'paused', pause: { reason: reason.trim(), by: ME, at: now() } })); setToast(`Musik an ${s.name} pausiert.`); }
    else if (kind === 'musicStart' || kind === 'reminder') { patch(c, x => ({ ...x, music: 'playing', pause: null })); setToast(`Musik an ${s.name} fortgesetzt.`); }
    else {   // a mute scope; announcement mute silences the station's music too
      const tracks = opt === 'Bahnhof' ? s.tracks.map((_, i) => i) : [dlg.i];
      patch(c, x => ({ ...x, mute: { scope: opt, tracks, reason: reason.trim(), by: ME } })); setToast('Stummschaltung aktiviert.');
    }
    setDlg(null); setPop(null);
  };

  return html`<${Box} sx=${{ minHeight: '100vh', bgcolor: 'background.default' }}>
    <${VariantBar} v=${variant} setV=${setV} role=${role} setRole=${r => { setRole(r); setPop(null); }}
      reminderOk=${role === 'fgi' && !!pausedLong} onReminder=${() => { setPop(null); setDlg({ kind: 'reminder', c: pausedLong }); }} />
    <${TopBar} />
    <${Box} sx=${{ display: 'flex' }}>
      <${Box} id="lineRail" sx=${{ width: 56, bgcolor: '#fff', borderRight: '1px solid #E0E0E0', py: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.25 }}>
        ${['U1', 'U2', 'U3', 'U4', 'U5', 'U6', 'U7', 'U8', 'U9'].map(l => html`<${Box} key=${l} sx=${{ p: .5, borderRadius: 1, bgcolor: l === 'U1' ? '#E3E8EF' : 'transparent' }}>
          <${LineBadge} line=${l} big /><//>`)}
      <//>
      <${Box} component="main" sx=${{ flex: 1, minWidth: 0, p: 2 }}>
        <${Paper} sx=${{ border: '1px solid #E0E0E0', pt: 2, pb: 1 }}>
          <${Box} sx=${{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <${LineBadge} line="U1" big /><${Typography} sx=${{ fontSize: 22 }} id="lineTitle">U Uhlandstraße - S+U Warschauer Straße<//>
          <//>
          <${LineDiagram} state=${state} onTrack=${(e, c, i) => setPop({ c, i, el: e.currentTarget })} />
        <//>
        <${EventTables} />
      <//>
    <//>
    <${TrackPopover} pop=${pop} state=${state} variant=${variant} role=${role} onClose=${() => setPop(null)}
      open=${kind => setDlg({ kind, c: pop.c, i: pop.i })} />
    <${ActionDialog} dlg=${dlg} state=${state} role=${role} onClose=${() => setDlg(null)} onApply=${onApply} />
    <${Snackbar} open=${!!toast} autoHideDuration=${2400} message=${toast}
      onClose=${(e, why) => { if (why !== 'clickaway') setToast(''); }} anchorOrigin=${{ vertical: 'bottom', horizontal: 'center' }} />
  <//>`;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  html`<${ThemeProvider} theme=${theme}><${CssBaseline} /><${App} /><//>`);
