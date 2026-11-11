/* ════════════════════════════════════════════════════════════════════
   PIMS · Liniensicht U1 — Musik pausieren / fortsetzen. React 18 + MUI v5, no build step.

   Ignat, 2026-11-09: FGI may pause the music at one station from the line view.
   · a second action next to "Stummschaltung": MUSIK PAUSIEREN / MUSIK FORTSETZEN,
     shown only when music is playing / paused; no music → no button
   · pausing needs a reason; starting does not
   · always the whole station (music is per station); no end time
   · a reminder after 3 h (the backend triggers it — here only a preview)
   · a muted station mutes its music too; after unmute paused music stays paused
   Two options behind the switcher:
     1 · a separate button and its own dialog (recommended)
     2 · one STUMMSCHALTUNG button, the choice of what to silence inside the dialog
   The line, the event table and the mute dialog recreate his production screenshots.
   Names, reasons, times are SAMPLE data.
   ════════════════════════════════════════════════════════════════════ */
const { useState } = React;
const html = htm.bind(React.createElement);
const {
  ThemeProvider, createTheme, CssBaseline, Box, Button, IconButton, Typography, TextField, Chip,
  Popover, Radio, RadioGroup, FormControlLabel, Checkbox, Divider, Snackbar, Stack, Paper, Tooltip, Badge, Avatar,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions, Menu, MenuItem, Popper, Drawer, ListItemText,
} = MaterialUI;

/* Ignat, 2026-11-10: the DE switch in the top bar works — every UI string in both languages.
   User-written texts (reasons) and station names stay as entered. EN strings are my translations. */
let LANG = 'de';
const L = (de, en) => LANG === 'de' ? de : en;

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
  { c: 'Go',      name: 'Gleisdreieck',      tracks: [1, 2],    xfer: ['U2', 'U3'] },
  { c: 'Mo',      name: 'Möckernbrücke',     tracks: [1, 2],    xfer: ['U3', 'U7'] },
  { c: 'Ho',      name: 'Hallesches Tor',    tracks: [1, 2],    xfer: ['U3', 'U6'] },
  { c: 'Pr',      name: 'Prinzenstraße',     tracks: [1, 2],    xfer: ['U3'] },
  { c: 'Kbo',     name: 'Kottbusser Tor',    tracks: [1, 2],    xfer: ['U3', 'U8'] },
  { c: 'Gr',      name: 'Görlitzer Bahnhof', tracks: [1, 2],    xfer: ['U3'] },
  { c: 'S',       name: 'Schlesisches Tor',  tracks: [1, 2],    xfer: ['U3'] },
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
SEED.U.music = 'paused';
// Ignat, 2026-11-10: more stations paused by default, to walk the flow
SEED.S.music = 'paused';   SEED.S.pause  = { reason: 'Außenbahnhof: Nachtruhe', by: 'S. Weber', at: '10.11.2026 22:00' };
SEED.Go.music = 'paused';  SEED.Go.pause  = { reason: 'Gottesdienst in der Nähe', by: 'M. Krüger', at: '10.11.2026 07:55' };
SEED.Gr.music = 'paused';  SEED.Gr.pause  = { reason: 'Reinigungsarbeiten', by: 'S. Weber', at: '10.11.2026 06:30' };
SEED['Nu / Nm'].music = 'paused'; SEED['Nu / Nm'].pause = { reason: 'Durchsagen schlecht verständlich', by: 'T. Yilmaz', at: '10.11.2026 08:15' };
SEED.U.pause = { reason: 'Veranstaltung im Bahnhof', by: 'T. Yilmaz', at: '09.11.2026 12:10' };

const now = () => { const d = new Date(), p = x => String(x).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`; };
/* what the music actually does right now */
const musicNow = (s, st) => st.mute ? 'muted' : st.music === 'none' ? 'none'
  : st.music;   // Ignat, 2026-11-11: no schedule on this screen — paused or playing

/* ── chrome ───────────────────────────────────────────────────────── */
function VariantBar({ v, setV, role, setRole }) {
  const seg = (items, val, set, idp) => html`<${Box} sx=${{ display: 'flex', gap: .5, bgcolor: 'rgba(255,255,255,.1)', borderRadius: '6px', p: '3px' }}>
    ${items.map(([k, l]) => html`<${Box} key=${k} component="button" id=${idp + k} onClick=${() => set(k)}
      sx=${{ all: 'unset', cursor: 'pointer', px: 1.5, py: .6, borderRadius: '4px', fontSize: 14,
             color: val === k ? '#2B2B2B' : 'rgba(255,255,255,.8)', bgcolor: val === k ? '#fff' : 'transparent' }}>${l}<//>`)}<//>`;
  const lab = t => html`<${Box} component="span" sx=${{ opacity: .75, textTransform: 'uppercase', fontSize: 14 }}>${t}<//>`;
  return html`<${Box} className="variant-switch" sx=${{ display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: '#2B2B2B', color: '#fff', px: 2.5, py: 1 }}>
    ${lab(L('Variante', 'Variant'))}${seg([[1, L('1 · Eigener Button', '1 · Own button')], [2, L('2 · Auswahl im Dialog', '2 · Choice in dialog')]], v, setV, 'vs-')}
    <${Box} sx=${{ width: 16 }} />
    ${lab(L('Rolle', 'Role'))}${seg([['fgi', 'FGI'], ['admin', 'Admin Jukebox'], ['other', L('Andere', 'Other')]], role, setRole, 'role-')}
  <//>`;
}

function TopBar({ lang, setLang, unread, onBell }) {
  const [anchor, setAnchor] = useState(null);
  const item = (l, active, menu) => html`<${Box} key=${l} sx=${{ px: 1.75, height: 52, display: 'flex', alignItems: 'center', fontSize: 14, fontWeight: 500,
    color: active ? 'primary.main' : 'text.primary', borderBottom: '2px solid', borderColor: active ? 'primary.main' : 'transparent' }}>
    ${l}${menu ? html`<${Icon} sx=${{ fontSize: 18 }}>expand_more<//>` : null}<//>`;
  return html`<${Box} id="topBar" sx=${{ display: 'flex', alignItems: 'center', height: 52, bgcolor: '#fff', borderBottom: '1px solid #E0E0E0', px: 2 }}>
    <${Box} sx=${{ width: 30, height: 30, bgcolor: '#FFCC00', borderRadius: '50% 50% 50% 0', transform: 'rotate(-45deg)', mr: 2.5,
      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <${Box} component="span" sx=${{ transform: 'rotate(45deg)', fontSize: 9, fontWeight: 700 }}>BVG<//><//>
    ${item(L('Ereignissicht', 'Event view'))}${item(L('Liniensicht', 'Line view'), true)}${item(L('Meldungssicht', 'Message view'), false, true)}${item(L('Dauermeldungen', 'Permanent messages'), false, true)}${item(L('Konfiguration', 'Configuration'), false, true)}
    <${Box} sx=${{ flex: 1 }} />
    <${Box} sx=${{ color: 'primary.main', fontSize: 14, fontWeight: 500, mr: 3 }}>VIRTUAL DAISY & ELA<//>
    <${Box} sx=${{ color: 'primary.main', fontSize: 14, fontWeight: 500, mr: 3 }}>TN I, TN II, TN III<//>
    <${IconButton} id="btnBell" aria-label=${L('Benachrichtigungen', 'Notifications')} onClick=${onBell}
      sx=${{ mr: 2, ...(unread ? { bgcolor: '#F6D5D5', color: '#C62828', '&:hover': { bgcolor: '#F1C4C4' } } : { color: '#616161' }) }}>
      <${Icon} sx=${{ fontSize: 22 }}>notifications<//><//>
    <${Button} id="langBtn" color="inherit" onClick=${e => setAnchor(e.currentTarget)} aria-haspopup="menu"
      sx=${{ minWidth: 0, fontSize: 14, fontWeight: 400, mr: 2, color: 'text.primary' }}>${lang.toUpperCase()}<//>
    <${Menu} anchorEl=${anchor} open=${!!anchor} onClose=${() => setAnchor(null)} id="langMenu">
      ${[['de', 'Deutsch'], ['en', 'English']].map(([k, l]) => html`<${MenuItem} key=${k} data-lang=${k} selected=${lang === k}
        onClick=${() => { setLang(k); setAnchor(null); }}>${l}<//>`)}
    <//>
    <${Avatar} sx=${{ width: 32, height: 32, mr: 1 }} />
    <${Box} sx=${{ fontSize: 14 }}>BVG BVG<//>
  <//>`;
}

/* ── the line ─────────────────────────────────────────────────────── */
const MUTE_ORANGE = '#E8792E';
function TrackBox({ s, st, i, onClick, onLeave, layers }) {
  const muted = st.mute && st.mute.tracks.includes(i);
  // Ignat, 2026-11-09: paused music shows inside the track square, like the mute — but grey, and only
  // on a track with no event and no mute
  const m = musicNow(s, st), musicOff = layers.music && !muted && !s.ev && m === 'paused';   // low priority: events and the mute win
  const n = s.tracks[i];
  const base = { width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14, borderRadius: '2px' };
  const box = html`<${Box} component="button" className=${'track' + (muted ? ' muted' : '') + (musicOff ? ' music-off' : '')} data-st=${s.c} data-track=${i}
    aria-label=${s.name + L(' Gleis ', ' track ') + n} onClick=${e => onClick(e, s.c, i)} onMouseEnter=${e => onClick(e, s.c, i)} onMouseLeave=${onLeave}
    sx=${{ all: 'unset', ...base, ...(muted ? { bgcolor: '#FBE3D2', border: '2px solid ' + MUTE_ORANGE, color: MUTE_ORANGE }
      : musicOff ? { bgcolor: '#EEEEEE', border: '2px solid #757575', color: '#757575' }
      : s.ev ? { bgcolor: '#7C4DFF', color: '#fff' } : { bgcolor: '#E0E0E0', border: '1px solid #616161', color: '#000' }) }}>
    ${muted ? html`<${Icon} sx=${{ fontSize: 18 }}>volume_off<//>` : musicOff ? html`<${Icon} sx=${{ fontSize: 18 }}>music_off<//>` : n}<//>`;
  return box;
}

/* Ignat, 2026-11-11: secondary layers the user can hide from the gear — SAMPLE positions.
   Meldungen: the bar on a track square (active DAISY/ELA message); Züge: the pill between stations. */
const MSG_BARS = { U: [0], Kfo: [0, 1], Wt: [1], Kus: [0], Mo: [0, 1], Ho: [1], Kbo: [0], WA: [0, 1] };
const TRAINS = [['U', 0, '#4CAF50'], ['Wt', 1, '#FBC02D'], ['Go', 0, '#4CAF50'], ['Pr', 1, '#E53935'], ['Gr', 0, '#FBC02D'], ['S', 1, '#4CAF50']];
function LineDiagram({ state, onTrack, onLeave, layers }) {
  return html`<${Box} id="lineDiagram" sx=${{ display: 'grid', gridTemplateColumns: `repeat(${STATIONS.length}, 1fr)`, mx: 2 }}>
    ${STATIONS.map(s => html`<${Box} key=${s.c} sx=${{ bgcolor: '#8FA963', color: '#fff', fontWeight: 700, fontSize: 14, textAlign: 'center',
        height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'pre-line' }}>${s.c.replace(' / ', ' /\n')}<//>`)}
    ${STATIONS.map(s => {
      const st = state[s.c], m = musicNow(s, st);
      return html`<${Box} key=${s.c} className="st-col" data-st=${s.c} data-music=${m}
        sx=${{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, pt: 2, pb: 2, borderTop: '1px solid #8A94A6' }}>
        ${s.tracks.map((_, i) => html`<${Box} key=${i} sx=${{ position: 'relative' }}>
          ${layers.msgs && (MSG_BARS[s.c] || []).includes(i) ? html`<${Box} className="msg-bar" sx=${{ position: 'absolute', left: 0, right: 0, height: 4,
            bgcolor: '#7FD3EA', borderRadius: '1px', [i === 0 ? 'top' : 'bottom']: -6 }} />` : null}
          <${TrackBox} s=${s} st=${st} i=${i} onClick=${onTrack} onLeave=${onLeave} layers=${layers} />
        <//>`)}
        ${layers.trains ? TRAINS.filter(t => t[0] === s.c).map(([, i, col]) => html`<${Box} key=${'t' + i} className="train"
          sx=${{ position: 'absolute', right: -9, top: i === 0 ? 22 : 54, width: 18, height: 7, borderRadius: '4px', bgcolor: col }} />`) : null}
        <${Stack} spacing=${.5} alignItems="center" sx=${{ mt: .5 }}>${s.xfer.map(l => html`<${LineBadge} key=${l} line=${l} />`)}<//>
      <//>`; })}
  <//>`;
}

/* ── the popover on a track ───────────────────────────────────────── */
function MusicInfo({ s, st }) {
  const m = musicNow(s, st);
  const line = (t, cls) => html`<${Typography} className=${cls} sx=${{ fontSize: 16 }}>${t}<//>`;
  if (m === 'paused') return html`<${Box} className="music-info" sx=${{ mt: 1.5 }}>
    ${line(html`<b>${L('Musik pausiert', 'Music paused')}</b> · ${st.pause.by} · ${st.pause.at}`, 'music-paused-by')}
    ${line(html`<b>${L('Grund', 'Reason')}:</b> ${st.pause.reason}`, 'music-reason')}<//>`;
  if (m === 'muted') return html`<${Box} className="music-info" sx=${{ mt: 1.5 }}>${line(html`<b>${L('Musik stumm', 'Music off')}</b> ${L('(Stummschaltung aktiv)', '(station muted)')}`)}<//>`;
  return null;
}

function TrackPopover({ pop, state, variant, role, onClose, open, hold, release }) {
  if (!pop) return null;
  const s = BY[pop.c], st = state[pop.c], m = musicNow(s, st);
  // Ignat, 2026-11-11: pausing works despite the schedule — at night FGI can pause for the next day
  const canMusic = role === 'fgi' && (m === 'playing' || m === 'paused' || m === 'schedule');
  // Ignat, 2026-11-11: as in production — the full card with its buttons opens on hover
  return html`<${Popper} open=${true} anchorEl=${pop.el} placement="bottom" id="trackPopover" sx=${{ zIndex: 1200 }}
    modifiers=${[{ name: 'offset', options: { offset: [0, 4] } }]}>
    <${Paper} onMouseEnter=${hold} onMouseLeave=${release}
      sx=${{ p: 2, width: 340, boxShadow: '0 4px 16px rgba(0,0,0,.18)', border: '1px solid #E0E0E0', borderRadius: 1 }}>
    <${Typography} sx=${{ fontWeight: 700, fontSize: 16, mb: 1 }} id="popTitle">${s.name} (${s.c}) · ${L('Gleis', 'Track')} ${s.tracks[pop.i]}<//>
    ${s.ev ? html`<${Box} className="event-card" sx=${{ bgcolor: '#E8F5E9', borderRadius: 1, p: 1.5, mb: 1.5, '& p': { fontSize: 16 } }}>
      <${Typography}><b>Dano / Name:</b><//>
      <${Typography}><b>${L('Grund', 'Reason')}:</b> ${L('Baumaßnahme', 'Construction work')}<//>
      <${Typography}><b>${L('Startdatum', 'Start date')}:</b> 09.11.2026 03:30<//>
      <${Typography}><b>${L('Plantyp', 'Plan type')}:</b> ${L('Geplant', 'Planned')}<//>
      <${Typography} component="div"><b>Status:</b> <${Chip} label=${L('Aktiv', 'Active')} sx=${{ bgcolor: '#CDE6CB', color: '#2E6930', fontSize: 14, ml: .5 }} /><//>
      <${Button} variant="outlined" fullWidth sx=${{ mt: 1.5 }}>${L('Ereignis anzeigen', 'View event')}<//>
    <//>` : null}
    ${st.mute ? html`<${Typography} className="mute-reason" sx=${{ fontSize: 16 }}><b>${L('Grund', 'Reason')}:</b> ${st.mute.reason}<//>` : null}
    ${role !== 'other' ? html`<${MusicInfo} s=${s} st=${st} />` : null}
    <${Stack} spacing=${1} sx=${{ mt: 2 }}>
      <${Button} variant="outlined" id="btnMute" onClick=${() => open(st.mute ? 'unmute' : variant === 2 ? 'combo' : 'mute')}
        sx=${{ color: MUTE_ORANGE, borderColor: '#F0B58D', '&:hover': { borderColor: MUTE_ORANGE, bgcolor: '#FFF6EF' } }}>${L('Stummschaltung', 'Mute')}<//>
      ${variant === 1 && canMusic ? html`<${Button} variant="outlined" id="btnMusic"
        startIcon=${html`<${Icon} sx=${{ fontSize: 20 }}>${m === 'paused' ? 'music_note' : 'music_off'}<//>`}
        onClick=${() => open(m === 'paused' ? 'musicStart' : 'musicPause')}
        sx=${{ color: '#424242', borderColor: '#BDBDBD', '&:hover': { borderColor: '#757575', bgcolor: '#F5F5F5' } }}>
        ${m === 'paused' ? L('Musik fortsetzen', 'Resume music') : L('Musik pausieren', 'Pause music')}<//>` : null}
    <//>
  <//><//>`;
}

/* ── dialogs ──────────────────────────────────────────────────────── */
const MUTE_OPTS = () => [['Bahnhof', L('Bahnhof stummschalten', 'Mute station')], ['Bahnsteig', L('Bahnsteig/e stummschalten', 'Mute platform(s)')], ['Gleis', L('Gleis stummschalten', 'Mute track')]];
function ActionDialog({ dlg, state, role, onClose, onApply }) {
  const [opt, setOpt] = useState('');
  const [reason, setReason] = useState('');
  React.useEffect(() => { setOpt(''); setReason(''); }, [dlg && dlg.kind, dlg && dlg.c]);
  if (!dlg) return html`<${Dialog} open=${false} />`;
  const s = BY[dlg.c], st = state[dlg.c], m = musicNow(s, st);
  const MUTE_T = L('Stummschaltung', 'Mute');
  const title = { mute: MUTE_T, combo: MUTE_T, unmute: MUTE_T, musicPause: L('Musik pausieren', 'Pause music'),
                  musicStart: L('Musik fortsetzen', 'Resume music') }[dlg.kind];
  const T = t => html`<${Typography} sx=${{ fontSize: 16, mb: 2 }} className="dlg-text">${t}<//>`;
  const reasonField = html`<${TextField} id="dlgReason" label=${L('Grund', 'Reason')} required fullWidth value=${reason} autoFocus
    onChange=${e => setReason(e.target.value)} sx=${{ mt: 1 }} />`;
  const radio = (v, l) => html`<${FormControlLabel} key=${v} value=${v} control=${html`<${Radio} />`} label=${l} data-opt=${v} />`;
  let body, applyOk = true, applyLabel = L('Anwenden', 'Apply'), cancelLabel = L('Abbrechen', 'Cancel'), apply = () => onApply(dlg.kind, { opt, reason });

  if (dlg.kind === 'unmute') body = T(L('Alle Ansagen aus PIMS wieder aktivieren', 'Re-enable all PIMS announcements'));
  else if (dlg.kind === 'musicStart') body = T(L(`Musik an ${s.name} (${s.c}) wieder starten`, `Start the music at ${s.name} (${s.c}) again`));
  else if (dlg.kind === 'musicPause') { body = html`${T(L(`Musik an ${s.name} (${s.c}) pausieren, bis sie manuell fortgesetzt wird.`, `Pause the music at ${s.name} (${s.c}) until it is resumed manually.`))}${reasonField}`; applyOk = !!reason.trim(); }
  else {
    // mute (production) — and in variant 2 the music choice joins the same list
    const musicOpt = dlg.kind === 'combo' && role === 'fgi' && (m === 'playing' || m === 'paused' || m === 'schedule') ? (m === 'paused' ? 'musicStart' : 'musicPause') : null;
    const isMusic = opt === 'musicPause' || opt === 'musicStart';
    body = html`
      ${T(opt === 'musicPause' ? L('Nur die Musik am Bahnhof wird pausiert. Ansagen laufen weiter.', 'Only the music at the station is paused. Announcements keep playing.')
        : opt === 'musicStart' ? L(`Musik an ${s.name} (${s.c}) wieder starten`, `Start the music at ${s.name} (${s.c}) again`)
        : L('Alle Ansagen aus PIMS werden stummgeschaltet, bis sie manuell wieder aktiviert werden.', 'All PIMS announcements are muted until they are re-enabled manually.'))}
      <${RadioGroup} value=${opt} onChange=${e => setOpt(e.target.value)} id="dlgOpts">
        ${MUTE_OPTS().map(([v, l]) => radio(v, l))}
        ${musicOpt ? html`<${Divider} sx=${{ my: 1 }} />${radio(musicOpt, musicOpt === 'musicPause' ? L('Nur Musik pausieren', 'Pause music only') : L('Musik fortsetzen', 'Resume music'))}` : null}
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

/* ── notifications side sheet (production pattern: chip, text, text button) ──
   Ignat, 2026-11-11: the 3-h reminder lives here. The backend raises it; the
   prototype shows one per station paused by someone else. Schichtwechsel items are SAMPLE. */
const SHIFT = [['U6, Mic'], ['U7, Jt'], ['U3, K - Os']];
function NotificationSheet({ open, onClose, items, onResume, onKeep }) {
  const chip = (label, sx) => html`<${Chip} label=${label} sx=${{ fontSize: 14, height: 28, ...sx }} />`;
  const btn = (label, onClick, id) => html`<${Button} onClick=${onClick} className=${id} sx=${{ display: 'block', mx: 'auto', mt: .5 }}>${label}<//>`;
  return html`<${Drawer} anchor="right" open=${open} onClose=${onClose} id="notifSheet" PaperProps=${{ sx: { width: 480 } }}>
    <${Box} sx=${{ display: 'flex', alignItems: 'center', px: 3, py: 2 }}>
      <${Typography} sx=${{ fontSize: 22, flex: 1 }}>${L('Benachrichtigungen', 'Notifications')} <${Icon} sx=${{ color: '#616161', verticalAlign: 'middle' }}>help_outline<//><//>
      <${IconButton} aria-label=${L('Schließen', 'Close')} onClick=${onClose}><${Icon}>close<//><//>
    <//>
    <${Box} sx=${{ px: 3, pb: 3 }}>
      ${items.map(n => html`<${Box} key=${n.c} className="notif notif-music" data-st=${n.c} sx=${{ py: 1.5 }}>
        <${Box} sx=${{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <${Typography} sx=${{ flex: 1, fontSize: 14, color: 'text.secondary' }}>${L('vor 3 Std.', '3 h ago')}<//>
          ${chip(L('Musik pausiert', 'Music paused'), { bgcolor: '#E0E0E0', color: '#212121' })}
        <//>
        <${Typography} sx=${{ fontSize: 16 }}>U1, ${n.c}, ${n.at}, ${L('Musik seit 3 Std. pausiert. Wieder starten?', 'Music paused for 3 h. Start it again?')} ${L('Grund', 'Reason')}: ${n.reason}<//>
        <${Stack} direction="row" justifyContent="center" spacing=${2}>
          ${btn(L('Pausiert lassen', 'Keep paused'), () => onKeep(n.c), 'notif-keep')}
          ${btn(L('Musik fortsetzen', 'Resume music'), () => onResume(n.c), 'notif-resume')}
        <//>
      <//>`)}
      ${SHIFT.map(([w]) => html`<${Box} key=${w} className="notif" sx=${{ py: 1.5 }}>
        <${Box} sx=${{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>${chip(L('Schichtwechsel', 'Shift change'), { bgcolor: '#EEF3B5', color: '#6B6B1E' })}<//>
        <${Typography} sx=${{ fontSize: 16 }}>${w}, 11.11, 14:00, ${L('Bitte überprüfen Sie vor Schichtende alle aktiven Ereignisse.', 'Please check all active events before the end of your shift.')}<//>
        ${btn(L('Ereignis öffnen', 'Open event'), () => {})}
      <//>`)}
    <//>
  <//>`;
}

/* ── events tables (production, static) ───────────────────────────── */
const EV_ROWS = () => [
  ['09.11, 03:30 - 24.11, 01:30', L('Baumaßnahme / Kein Halt - beidseitig', 'Construction work / No stop - both sides'), '', 'TN 1', 'Kfo - Kus', ['U2', 'U3', 'U4', 'U9'], L('Hauptmeldung', 'Main announcement'), L('Geplant', 'Planned'), L('Aktiv', 'Active'), 'on'],
  ['21.09, 02:30 - 06.10, 00:30', L('Baumaßnahme / Kein Halt - beidseitig', 'Construction work / No stop - both sides'), '', 'TN 1', 'Go', ['U2', 'U3', 'U7'], '--', L('Geplant', 'Planned'), L('Pausiert', 'Paused'), 'off'],
];
function EventTables() {
  const head = LANG === 'de' ? ['Zeitraum', 'Grund / Typ', 'Dano / Name', 'Zuständigkeit', 'Bahnhöfe', 'Kreuzende Linien', 'Aktuelle Meldungen', 'Plantyp', 'Status', 'Aktionen']
    : ['Period', 'Reason / Type', 'Dano / Name', 'Responsibility', 'Stations', 'Crossing lines', 'Current messages', 'Plan type', 'Status', 'Actions'];
  const H = cols => html`<${TableHead}><${TableRow}>${cols.map(h => html`<${TableCell} key=${h} sx=${{ fontWeight: 700 }}>${h}<//>`)}<//><//>`;
  return html`<${Box} sx=${{ mt: 3 }}>
    <${Box} sx=${{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
      <${Typography} sx=${{ fontSize: 24, fontWeight: 400 }}>${L('Ereignisse', 'Events')}<//><${Icon} sx=${{ color: '#616161', marginLeft: 8 }}>help_outline<//>
      <${Box} sx=${{ flex: 1 }} /><${Button} variant="contained">${L('Ereignis erstellen', 'Create event')}<//>
    <//>
    <${TableContainer} component=${Paper} sx=${{ border: '1px solid #E0E0E0' }}><${Table} size="small">${H(head)}
      <${TableBody}>${EV_ROWS().map((r, i) => html`<${TableRow} key=${i}>
        ${r.slice(0, 5).map((c, k) => html`<${TableCell} key=${k}>${c}<//>`)}
        <${TableCell}><${Stack} direction="row" spacing=${.5}>${r[5].map(l => html`<${LineBadge} key=${l} line=${l} />`)}<//><//>
        <${TableCell}>${r[6]}<//><${TableCell}>${r[7]}<//>
        <${TableCell}><${Chip} label=${r[8]} sx=${{ fontSize: 14, ...(r[9] === 'on' ? { bgcolor: '#CDE6CB', color: '#2E6930' } : { bgcolor: '#E0E0E0' }) }} /><//>
        <${TableCell}><${IconButton} color="primary" aria-label=${L('Bearbeiten', 'Edit')}><${Icon}>edit<//><//><//>
      <//>`)}<//>
    <//><//>
    <${Typography} sx=${{ fontSize: 24, mt: 4, mb: 1.5 }}>${L('Ereignisse anderer Linien', 'Events on other lines')}<//>
    <${TableContainer} component=${Paper} sx=${{ border: '1px solid #E0E0E0' }}><${Table} size="small">${H([L('Linie', 'Line'), ...head])}
      <${TableBody}><${TableRow}><${TableCell} colSpan=${11} align="center" sx=${{ py: 8 }}>${L('Es gibt keine Ereignisse', 'There are no events')}<//><//><//>
    <//><//>
  <//>`;
}

/* ── the page ─────────────────────────────────────────────────────── */
function App() {
  // Ignat, 2026-11-11: two buttons it is (option 1), and every user may manage the music —
  // no variant switch, no roles
  const variant = 1;
  const [lang, setLangRaw] = useState(() => localStorage.getItem('pims-lang') || 'de');
  LANG = lang;
  const setLang = l => { localStorage.setItem('pims-lang', l); document.documentElement.lang = l; setLangRaw(l); };
  const role = 'fgi';
  // the gear's layers, saved per user (here: in the browser)
  const [layers, setLayers] = useState(() => ({ music: true, trains: true, msgs: true, ...JSON.parse(localStorage.getItem('pims-layers') || '{}') }));
  const toggleLayer = k => setLayers(x => { const n = { ...x, [k]: !x[k] }; localStorage.setItem('pims-layers', JSON.stringify(n)); return n; });
  const [layerMenu, setLayerMenu] = useState(null);
  const anyHidden = !layers.music || !layers.trains || !layers.msgs;
  const [state, setState] = useState(SEED);
  const [pop, setPop] = useState(null);
  const [dlg, setDlg] = useState(null);
  const [toast, setToast] = useState('');
  const patch = (c, f) => setState(S => ({ ...S, [c]: f({ ...S[c] }) }));
  const [kept, setKept] = useState([]);
  const [sheet, setSheet] = useState(false);
  const [seen, setSeen] = useState(false);
  // 3-h reminders: stations paused by someone else and not yet answered
  const reminders = role === 'fgi' ? Object.keys(state).filter(c => state[c].music === 'paused' && state[c].pause && state[c].pause.by !== ME && !kept.includes(c))
    .map(c => ({ c, ...state[c].pause })) : [];
  const timer = React.useRef(null);
  const hold = () => clearTimeout(timer.current);
  const release = () => { clearTimeout(timer.current); timer.current = setTimeout(() => setPop(null), 250); };
  React.useEffect(() => { const k = e => { if (e.key === 'Escape') setPop(null); }; addEventListener('keydown', k); return () => removeEventListener('keydown', k); }, []);

  const onApply = (kind, { opt, reason }) => {
    const c = dlg.c, s = BY[c];
    if (kind === 'unmute') { patch(c, x => ({ ...x, mute: null })); setToast(L('Ansagen wieder aktiviert.', 'Announcements re-enabled.')); }
    else if (kind === 'musicPause') { patch(c, x => ({ ...x, music: 'paused', pause: { reason: reason.trim(), by: ME, at: now() } })); setToast(L(`Musik an ${s.name} pausiert.`, `Music at ${s.name} paused.`)); }
    else if (kind === 'musicStart') { patch(c, x => ({ ...x, music: 'playing', pause: null })); setToast(L(`Musik an ${s.name} fortgesetzt.`, `Music at ${s.name} resumed.`)); }
    else {   // a mute scope; announcement mute silences the station's music too
      const tracks = opt === 'Bahnhof' ? s.tracks.map((_, i) => i) : [dlg.i];
      patch(c, x => ({ ...x, mute: { scope: opt, tracks, reason: reason.trim(), by: ME } })); setToast(L('Stummschaltung aktiviert.', 'Mute activated.'));
    }
    setDlg(null); setPop(null);
  };

  return html`<${Box} sx=${{ minHeight: '100vh', bgcolor: 'background.default' }}>
    <${TopBar} lang=${lang} setLang=${setLang} unread=${reminders.length > 0 && !seen} onBell=${() => { setPop(null); setSheet(true); setSeen(true); }} />
    <${Box} sx=${{ display: 'flex' }}>
      <${Box} id="lineRail" sx=${{ width: 56, bgcolor: '#fff', borderRight: '1px solid #E0E0E0', py: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.25 }}>
        ${['U1', 'U2', 'U3', 'U4', 'U5', 'U6', 'U7', 'U8', 'U9'].map(l => html`<${Box} key=${l} sx=${{ p: .5, borderRadius: 1, bgcolor: l === 'U1' ? '#E3E8EF' : 'transparent' }}>
          <${LineBadge} line=${l} big /><//>`)}
      <//>
      <${Box} component="main" sx=${{ flex: 1, minWidth: 0, p: 2 }}>
        <${Paper} sx=${{ border: '1px solid #E0E0E0', pt: 2, pb: 1 }}>
          <${Box} sx=${{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <${LineBadge} line="U1" big /><${Typography} sx=${{ fontSize: 22 }} id="lineTitle">U Uhlandstraße - S+U Warschauer Straße<//>
            <${Box} sx=${{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)' }}>
              <${Badge} variant="dot" color="primary" invisible=${!anyHidden} overlap="circular" id="gearDot">
                <${IconButton} id="btnLayers" aria-label=${L('Anzeige', 'Display')} aria-haspopup="menu" onClick=${e => setLayerMenu(e.currentTarget)}
                  sx=${{ color: anyHidden ? 'primary.main' : '#616161' }}><${Icon} sx=${{ fontSize: 24 }}>settings<//><//>
              <//>
              <${Menu} anchorEl=${layerMenu} open=${!!layerMenu} onClose=${() => setLayerMenu(null)} id="layerMenu"
                anchorOrigin=${{ vertical: 'bottom', horizontal: 'right' }} transformOrigin=${{ vertical: 'top', horizontal: 'right' }}>
                ${[['music', L('Musik', 'Music')], ['trains', L('Züge', 'Trains')], ['msgs', L('Meldungen', 'Messages')]].map(([k, l]) => html`
                  <${MenuItem} key=${k} data-layer=${k} onClick=${() => toggleLayer(k)} sx=${{ pr: 3 }}>
                    <${Checkbox} checked=${layers[k]} sx=${{ p: .5, mr: 1 }} /><${ListItemText} primary=${l} /><//>`)}
              <//>
            <//>
          <//>
          <${LineDiagram} state=${state} layers=${layers} onTrack=${(e, c, i) => { hold(); setPop({ c, i, el: e.currentTarget }); }} onLeave=${release} />
        <//>
        <${EventTables} />
      <//>
    <//>
    <${TrackPopover} pop=${pop} state=${state} variant=${variant} role=${role} onClose=${() => setPop(null)} hold=${hold} release=${release}
      open=${kind => { setDlg({ kind, c: pop.c, i: pop.i }); setPop(null); }} />
    <${NotificationSheet} open=${sheet} onClose=${() => setSheet(false)} items=${reminders}
      onKeep=${c => setKept(k => [...k, c])}
      onResume=${c => { patch(c, x => ({ ...x, music: 'playing', pause: null })); setToast(L(`Musik an ${BY[c].name} fortgesetzt.`, `Music at ${BY[c].name} resumed.`)); }} />
    <${ActionDialog} dlg=${dlg} state=${state} role=${role} onClose=${() => setDlg(null)} onApply=${onApply} />
    <${Snackbar} open=${!!toast} autoHideDuration=${2400} message=${toast}
      onClose=${(e, why) => { if (why !== 'clickaway') setToast(''); }} anchorOrigin=${{ vertical: 'bottom', horizontal: 'center' }} />
  <//>`;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  html`<${ThemeProvider} theme=${theme}><${CssBaseline} /><${App} /><//>`);
