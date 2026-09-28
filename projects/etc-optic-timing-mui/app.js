/* ════════════════════════════════════════════════════════════════════
   ETC · Aramis optics (DATNETISR-233) + Station announcements timing
   (DATNETISR-668) — React 18 + MUI v5, no build step.

   Ignat, 2026-09-28, with three screenshots of ETC's own product
   (Device details, Stations, Station details): "Please make the prototype
   look similar. We use MUI elements. But tables in your prototype look
   very different."

   Port of projects/etc-optic-timing/index.html, which stays live and is
   never modified. Data and pure logic come from data.js, generated out of
   it by scripts/eo-extract-shared.cjs — nothing here is retyped.
   ════════════════════════════════════════════════════════════════════ */
const { useState, useMemo, useContext, createContext, useCallback } = React;
const html = htm.bind(React.createElement);
const M = MaterialUI;
const {
  ThemeProvider, createTheme, CssBaseline, AppBar, Toolbar, Box, Button, IconButton,
  Typography, Menu, MenuItem, Breadcrumbs, Link, Card, CardContent, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination, Paper, Chip,
  Stack, FormControl, InputLabel, Select, InputAdornment, Alert, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  Snackbar, Drawer, Divider, ToggleButton, ToggleButtonGroup, Collapse, ListSubheader,
} = M;

/* Material Icons render as ligature text; aria-hidden keeps the glyph name out
   of the accessible name of whatever button holds it. */
const Icon = ({ children, sx }) =>
  html`<span className="material-icons" aria-hidden="true" style=${{ fontSize: 20, ...(sx || {}) }}>${children}</span>`;

const NAVY = '#1C2848';

/* ── The theme — copied verbatim from projects/q-explorer-mui/app.js ──
   MUI defaults plus the four deviations measured off ETC's own product
   (primary #2196F3 · navy dense AppBar · outlined #E7E7E7 cards · #F4F4F4
   TableHead band), and Ignat's spec as defaultProps.

   ONE ADDITION, from Ignat's screenshots of 2026-09-28: both ETC tables draw
   a short vertical divider between header cells (the Stations list and the
   Station details output-zone table). MUI's plain Table has none, so it is
   added on the head cells only — body rows stay divider-free, as in both
   screenshots. */
const theme = createTheme({
  palette: {
    primary: { main: '#2196F3', dark: '#1769AA', light: '#64B5F6' },
    background: { default: '#FAFAFA' },
  },
  shape: { borderRadius: 4 },
  components: {
    MuiButton:      { defaultProps: { size: 'small', disableElevation: true } },
    MuiIconButton:  { defaultProps: { size: 'small' } },
    MuiTextField:   { defaultProps: { size: 'small', variant: 'filled' } },
    MuiFormControl: { defaultProps: { size: 'small', variant: 'filled' } },
    MuiTable:       { defaultProps: { size: 'small' } },
    MuiAppBar:      { defaultProps: { elevation: 0 } },
    MuiToolbar:     { defaultProps: { variant: 'dense' } },
    MuiTableHead:   { styleOverrides: { root: { backgroundColor: '#F4F4F4' } } },
    MuiTableCell:   { styleOverrides: { head: {
                        fontWeight: 500, position: 'relative', whiteSpace: 'nowrap',
                        '&:not(:last-of-type)::after': {
                          content: '""', position: 'absolute', right: 0, top: '25%',
                          height: '50%', width: '1px', backgroundColor: 'rgba(224,224,224,1)',
                        },
                      } } },
    MuiCard:        { defaultProps: { variant: 'outlined' },
                      styleOverrides: { root: { borderColor: '#E7E7E7' } } },
    MuiMenuItem:    { styleOverrides: { root: {
                        '&.Mui-selected': { backgroundColor: 'rgba(33,150,243,0.12)' },
                        '&.Mui-selected:hover': { backgroundColor: 'rgba(33,150,243,0.12)' },
                      } } },
  },
});

const LAST_IMPORT = '27 Aug 2026, 03:00';

/* offsetPhrase() in the vanilla returns HTML (<b>…</b>); this is its logic,
   returning parts React can render. Same rules, same outputs. */
function offsetWords(off) {
  const t = String(off || '').trim();
  if (!t) return { lead: 'at', abs: '' };
  const abs = t.replace(/^[+-]/, '');
  if (abs === '0:00' || abs === '00:00' || abs === '0') return { lead: 'exactly at', abs: '' };
  return { lead: t.startsWith('-') ? 'before' : 'after', abs };
}
const OffsetPhrase = ({ off }) => {
  const w = offsetWords(off);
  return w.abs ? html`<b>${w.abs}</b> ${w.lead}` : w.lead;
};

/* ── App state ─────────────────────────────────────────────────────── */
const App = createContext(null);
const useApp = () => useContext(App);

/* ── Shared components ─────────────────────────────────────────────── */

/** No "All" option: empty means everything, the label names the field, ✕ clears. */
function FilterSelect({ label, value, onChange, options, minWidth = 200, id, helperText, disabled }) {
  const labelId = (id || 'sel') + '-label';
  return html`
    <${FormControl} sx=${{ minWidth }} disabled=${!!disabled}>
      <${InputLabel} id=${labelId}>${label}<//>
      <${Select} id=${id} value=${value} label=${label} labelId=${labelId}
        onChange=${e => onChange(e.target.value)}
        endAdornment=${value && !disabled ? html`
          <${InputAdornment} position="end" sx=${{ mr: 3 }}>
            <${IconButton} aria-label=${'Clear ' + label} onClick=${() => onChange('')}>
              <${Icon} sx=${{ fontSize: 18 }}>close<//>
            <//>
          <//>` : null}>
        ${options.map(o => html`<${MenuItem} key=${o.value} value=${o.value}>${o.label}<//>`)}
      <//>
      ${helperText ? html`<${M.FormHelperText}>${helperText}<//>` : null}
    <//>`;
}

/** Classic grey MUI row icons — the pattern in ETC's Stations list. */
const RowIcon = ({ icon, label, onClick, id }) => html`
  <${Tooltip} title=${label}>
    <${IconButton} id=${id} aria-label=${label} onClick=${e => { e.stopPropagation(); onClick(); }}>
      <${Icon}>${icon}<//>
    <//>
  <//>`;

/** Breadcrumbs, title, and the corner actions — ETC's Device details header. */
function PageHeader({ crumbs, title, action, titleId }) {
  return html`
    <${Box} sx=${{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 2, mb: 2 }}>
      <${Box} sx=${{ minWidth: 0 }}>
        ${crumbs && html`
          <${Breadcrumbs} sx=${{ mb: .5 }} separator=${html`<${Icon} sx=${{ fontSize: 16 }}>chevron_right<//>`}>
            ${crumbs.map((c, i) => c.onClick
              ? html`<${Link} key=${i} component="button" underline="hover" color="text.secondary" variant="body2"
                              onClick=${c.onClick}>${c.label}<//>`
              : html`<${Typography} key=${i} variant="body2" color="text.primary">${c.label}<//>`)}
          <//>`}
        <${Typography} variant="h6" id=${titleId} noWrap>${title}<//>
      <//>
      <${Stack} direction="row" spacing=${1} sx=${{ flexShrink: 0 }}>${action}<//>
    <//>`;
}

/** An outlined card with an h6-style title — ETC's "General" / "Hardware" cards. */
function SectionCard({ title, note, action, children, id }) {
  return html`
    <${Card} id=${id} sx=${{ mb: 2 }}>
      <${CardContent} sx=${{ '&:last-child': { pb: 2 } }}>
        <${Box} sx=${{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <${Typography} variant="h6" sx=${{ fontSize: 18 }}>${title}<//>
          <${Box} sx=${{ flex: 1 }} />
          ${action}
        <//>
        ${note ? html`<${Typography} variant="body2" color="text.secondary" sx=${{ mt: -1, mb: 2 }}>${note}<//>` : null}
        ${children}
      <//>
    <//>`;
}

/** Fields laid out like ETC's forms: an even grid, four to a row on desktop. */
const FieldGrid = ({ children, cols = 4 }) => html`
  <${Box} sx=${{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: `repeat(${cols}, minmax(0, 1fr))` } }}>
    ${children}
  <//>`;

/** Assumption notes — visible only with the presenter's "Show assumptions". */
function Assume({ children }) {
  const { assume } = useApp();
  if (!assume) return null;
  return html`<${Alert} severity="warning" className="assume" sx=${{ mt: 2 }}>${children}<//>`;
}

const DefaultChip = ({ override }) => html`
  <${Chip} size="small" label=${override ? 'Override' : 'Default'}
    color=${override ? 'primary' : 'default'} variant=${override ? 'filled' : 'outlined'}
    sx=${{ ml: 1, height: 20, fontSize: 11 }} />`;

/* ── Chrome: ETC's navy bar and icon rail ──────────────────────────── */
function TopBar() {
  const { go, screen } = useApp();
  const [anchor, setAnchor] = useState(null);
  const plain = ['Station view', 'Events'];
  const drop = l => html`<${Button} key=${l} color="inherit" sx=${{ textTransform: 'none', fontSize: 14, opacity: .85 }}
                          endIcon=${html`<${Icon} sx=${{ fontSize: 18 }}>expand_more<//>`}>${l}<//>`;
  return html`
    <${AppBar} position="static" sx=${{ bgcolor: NAVY }}>
      <${Toolbar} sx=${{ gap: .5, minHeight: 48 }}>
        <${Box} aria-label="Israel Railways" role="img" sx=${{ display: 'flex', alignItems: 'center', mr: 2 }}>
          <svg width="30" height="18" viewBox="0 0 40 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round">
            <path d="M3 17c6-11 16-13 25-8"/><path d="M8 21c5-8 13-9.5 20-5.5"/>
          </svg>
        <//>
        ${drop('Maps')}
        ${plain.map(l => html`<${Button} key=${l} color="inherit" sx=${{ textTransform: 'none', fontSize: 14, opacity: .85 }}>${l}<//>`)}
        ${drop('Journeys')}
        ${/* Optics and timing live under Systems, next to Stations and Devices
              in ETC's own nav. A guess: the tickets say "PIS Configuration
              module", and the product nav has no item by that name. */ ''}
        <${Button} color="inherit" id="nav-systems" aria-haspopup="menu" aria-expanded=${!!anchor}
          onClick=${e => setAnchor(e.currentTarget)}
          endIcon=${html`<${Icon} sx=${{ fontSize: 18 }}>expand_more<//>`}
          sx=${{ textTransform: 'none', fontSize: 14, borderRadius: 0, borderBottom: '2px solid #fff', mb: '-2px' }}>Systems<//>
        <${Menu} anchorEl=${anchor} open=${!!anchor} onClose=${() => setAnchor(null)}
          anchorOrigin=${{ vertical: 'bottom', horizontal: 'left' }}>
          <${MenuItem} disabled>Stations<//>
          <${MenuItem} disabled>Devices<//>
          <${MenuItem} data-nav="optics" selected=${screen === 'optics' || screen === 'optic'}
            onClick=${() => { setAnchor(null); go('optics'); }}>Aramis optics<//>
          <${MenuItem} data-nav="timing" selected=${screen === 'timing'}
            onClick=${() => { setAnchor(null); go('timing'); }}>Station announcements timing<//>
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
  const icons = [['map', 'Maps'], ['show_chart', 'Analytics'], ['directions_railway', 'Trains'],
                 ['event', 'Schedule'], ['compare_arrows', 'Transfers']];
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

/* The prototype frame, not product chrome: first element, full width, dark. */
function Presenter() {
  const { go, screen, assume, setAssume } = useApp();
  const tab = screen === 'timing' ? 'timing' : 'optics';
  const btn = (id, on, label, onClick) => html`
    <button id=${id} onClick=${onClick}
      style=${{ background: on ? '#fff' : 'none', color: on ? '#1b1b1b' : 'rgba(255,255,255,.75)', border: 'none',
                font: '500 13px Roboto, sans-serif', padding: '5px 12px', borderRadius: 4, cursor: 'pointer' }}>${label}</button>`;
  return html`
    <div id="presenter" style=${{ display: 'flex', alignItems: 'center', gap: 12, background: '#1b1b1b', color: '#fff',
                                  padding: '8px 20px', font: '400 13px Roboto, sans-serif' }}>
      <span style=${{ opacity: .75, fontSize: 12, textTransform: 'uppercase', fontWeight: 500 }}>Screen</span>
      <span style=${{ display: 'flex', gap: 4, background: 'rgba(255,255,255,.1)', borderRadius: 6, padding: 3 }}>
        ${btn('p-optics', tab === 'optics', 'Optics · 233', () => go('optics'))}
        ${btn('p-timing', tab === 'timing', 'Timing · 668', () => go('timing'))}
      </span>
      ${btn('p-assume', assume, assume ? 'Hide assumptions' : 'Show assumptions', () => setAssume(!assume))}
    </div>`;
}

/* ══ Screen: Aramis optics list (233) ═══════════════════════════════ */
function OpticsList() {
  const { go, rev, askDelete } = useApp();
  const [q, setQ] = useState('');
  const [st, setSt] = useState('');
  const [pl, setPl] = useState('');
  const [page, setPage] = useState(0);
  const [per, setPer] = useState(25);

  const plats = [...new Set(OPTICS.map(o => o.platform))].sort();
  const list = OPTICS.filter(o => {
    if (st && o.station !== st) return false;
    if (pl && o.platform !== pl) return false;
    const n = q.trim().toLowerCase();
    return !n || (o.id + ' ' + stationLabel(o.station) + ' ' + o.track + ' ' + o.loc + ' ' + o.dir).toLowerCase().includes(n);
  });
  const shown = list.slice(page * per, page * per + per);
  const reset = f => v => { f(v); setPage(0); };

  return html`
    <${Box}>
      <${Box} sx=${{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5, flexWrap: 'wrap' }}>
        <${Typography} variant="h6" id="page-title">Aramis optics<//>
        <${TextField} id="o-q" hiddenLabel placeholder="Search" value=${q} sx=${{ width: 280 }}
          inputProps=${{ 'aria-label': 'Search optic ID, station or track' }}
          onChange=${e => reset(setQ)(e.target.value)}
          InputProps=${{ endAdornment: html`<${InputAdornment} position="end"><${Icon} sx=${{ color: 'text.secondary' }}>search<//><//>` }} />
        <${FilterSelect} id="o-station" label="Station" value=${st} onChange=${reset(setSt)}
          options=${STATIONS.map(s => ({ value: s.id, label: stationLabel(s.id) }))} />
        <${FilterSelect} id="o-plat" label="Platform" value=${pl} minWidth=${160} onChange=${reset(setPl)}
          options=${plats.map(p => ({ value: p, label: 'Platform ' + p }))} />
        <${Box} sx=${{ flex: 1 }} />
        <${Button} variant="contained" id="o-add" startIcon=${html`<${Icon}>add<//>`} onClick=${() => go('optic', null)}>Add optic<//>
      <//>
      <${Typography} variant="body2" color="text.secondary" sx=${{ mb: 2 }}>
        Station, platform and Aramis track are imported from FMSILA.XML — last import ${LAST_IMPORT}. Location, direction and properties are maintained here and never overwritten.
      <//>

      <${Paper} variant="outlined" sx=${{ borderColor: '#E7E7E7' }}>
        <${TableContainer}>
          <${Table} id="o-table">
            <${TableHead}><${TableRow}>
              <${TableCell}>Optic ID<//><${TableCell}>Station<//><${TableCell}>Platform<//><${TableCell}>Aramis track<//>
              <${TableCell}>Location / direction<//><${TableCell}>Properties<//><${TableCell}>Status<//>
              <${TableCell}>Used by timing<//><${TableCell} align="right" aria-label="Actions" />
            <//><//>
            <${TableBody}>
              ${shown.length ? shown.map(o => {
                const used = opticsUsedBy(o.id).length;
                return html`
                  <${TableRow} key=${o.id} hover data-optic=${o.id} sx=${{ cursor: 'pointer' }} onClick=${() => go('optic', o.id)}>
                    <${TableCell} sx=${{ fontFamily: 'Roboto Mono, monospace' }}>${o.id}<//>
                    <${TableCell}>${stationLabel(o.station)}<//>
                    <${TableCell}>${o.platform || '–'}<//>
                    <${TableCell}>${o.track || '–'}<//>
                    <${TableCell}>${o.loc
                      ? `${o.loc}${o.dir ? ' · ' + o.dir : ''}`
                      : html`<${Typography} variant="body2" color="text.disabled">Not set<//>`}<//>
                    <${TableCell}>${o.props || '–'}<//>
                    <${TableCell}><${Chip} size="small" label="Active" color="success" variant="outlined" sx=${{ height: 20, fontSize: 11 }} /><//>
                    <${TableCell}>${used ? `${used} row${used > 1 ? 's' : ''}` : '–'}<//>
                    <${TableCell} align="right" sx=${{ whiteSpace: 'nowrap', py: 0 }}>
                      <${RowIcon} icon="edit" label=${'Edit ' + o.id} onClick=${() => go('optic', o.id)} />
                      <${RowIcon} icon="delete" label=${'Delete ' + o.id} onClick=${() => askDelete(o.id)} />
                    <//>
                  <//>`;
              }) : html`
                <${TableRow}><${TableCell} colSpan=${9} align="center" sx=${{ py: 4, color: 'text.secondary' }}>
                  No optics match these filters.<//><//>`}
            <//>
          <//>
        <//>
        <${TablePagination} component="div" count=${list.length} page=${page} rowsPerPage=${per}
          rowsPerPageOptions=${[5, 25, 50]} showFirstButton showLastButton
          onPageChange=${(e, p) => setPage(p)}
          onRowsPerPageChange=${e => { setPer(parseInt(e.target.value, 10)); setPage(0); }} />
      <//>
    <//>`;
}

/* ══ Screen: Optic details — full page (233) ═════════════════════════ */
function OpticDetail() {
  const { go, opticId, toast, bump, askDelete, openRow } = useApp();
  const existing = opticId ? OPTICS.find(x => x.id === opticId) : null;
  const blank = { id: '', station: '', platform: '', track: '', loc: '', dir: '', props: '' };
  const [d, setD] = useState(() => ({ ...(existing || blank) }));
  const [errs, setErrs] = useState({});
  const set = patch => { setD(prev => ({ ...prev, ...patch })); setErrs({}); };
  const used = existing ? opticsUsedBy(existing.id) : [];

  const save = () => {
    if (existing) {
      Object.assign(existing, { loc: d.loc.trim(), dir: d.dir, props: d.props.trim() });
      bump(); go('optics'); toast('Optic saved'); return;
    }
    // MUI's own error + helperText on the field that is wrong, not a toast
    const e = {};
    const id = d.id.trim();
    if (!id) e.id = 'Optic ID is required';
    else if (OPTICS.some(x => x.id.toLowerCase() === id.toLowerCase())) e.id = 'An optic with this ID already exists';
    if (!d.station) e.station = 'Station is required';
    if (!d.platform.trim()) e.platform = 'Platform is required';
    if (Object.keys(e).length) { setErrs(e); return; }
    OPTICS.push({ id, station: d.station, platform: d.platform.trim(), track: d.track.trim(),
                  loc: d.loc.trim(), dir: d.dir, props: d.props.trim() });
    bump(); go('optics'); toast(`Optic ${id} created`);
  };

  const crumbs = [{ label: 'Aramis optics', onClick: () => go('optics') }, { label: existing ? 'Optic details' : 'New optic' }];
  const imported = !!existing;

  return html`
    <${Box}>
      <${PageHeader} crumbs=${crumbs} title=${existing ? existing.id : 'New optic'} titleId="od-title"
        action=${html`
          ${existing ? html`<${Button} variant="outlined" id="od-copy" startIcon=${html`<${Icon}>content_copy<//>`}
                                onClick=${() => toast('Optic URL copied to clipboard')}>Copy optic URL<//>` : null}
          <${Button} variant="contained" id="od-save" onClick=${save}>Save<//>`} />

      <${SectionCard} title="Identity">
        <${FieldGrid}>
          <${TextField} id="od-id" label="Optic ID" required value=${d.id} disabled=${imported}
            placeholder="e.g. HA2 14T87" error=${!!errs.id}
            helperText=${errs.id || (imported ? 'Unique identifier. Not editable once created.'
                                              : 'No fixed format — both HA2 14T87 and HA6 131113 are valid.')}
            onChange=${e => set({ id: e.target.value })} />
          <${TextField} label="Source" value=${imported ? 'FMSILA import' : 'Manual entry'} disabled />
          <${TextField} label="Status" value="Active" disabled />
        <//>
      <//>

      <${SectionCard} title="Location in the network"
        note=${imported ? `View only — station, platform and Aramis track are imported from FMSILA.XML (last import ${LAST_IMPORT}) and refreshed on every import.`
                        : 'Entered by hand for a manually created optic, then kept in step by the import.'}>
        <${FieldGrid}>
          ${imported
            ? html`<${TextField} label="Station ID" value=${stationLabel(d.station)} disabled />`
            : html`<${FilterSelect} id="od-station" label="Station ID *" value=${d.station}
                     helperText=${errs.station} onChange=${v => set({ station: v })}
                     options=${STATIONS.map(s => ({ value: s.id, label: stationLabel(s.id) }))} />`}
          <${TextField} id="od-platform" label="Platform" required=${!imported} value=${d.platform} disabled=${imported}
            error=${!!errs.platform} helperText=${errs.platform || ''} onChange=${e => set({ platform: e.target.value })} />
          <${TextField} id="od-track" label="Aramis track" value=${d.track} disabled=${imported}
            onChange=${e => set({ track: e.target.value })} />
        <//>
        <${Box} sx=${{ mt: 2 }}>
          <${FieldGrid} cols=${2}>
            <${TextField} id="od-loc" label="Location on the network" value=${d.loc}
              placeholder="e.g. Approach, 420 m before platform" onChange=${e => set({ loc: e.target.value })} />
            <${FilterSelect} id="od-dir" label="Travel direction" value=${d.dir} onChange=${v => set({ dir: v })}
              options=${[{ value: 'Westbound', label: 'Westbound' }, { value: 'Eastbound', label: 'Eastbound' }]}
              helperText="Ticket 233 describes a track schematic — upper track westbound, lower eastbound. Until the image arrives this is a plain two-value choice." />
          <//>
        <//>
      <//>

      <${SectionCard} title="Properties">
        <${Box} sx=${{ maxWidth: 560 }}>
          <${TextField} id="od-props" label="Properties" fullWidth value=${d.props}
            placeholder="Attributes used by the business rules"
            helperText="Free text — ticket 233 lists the exact property set as TBD in the dev phase."
            onChange=${e => set({ props: e.target.value })} />
        <//>
        <${Assume}><b>Protected on re-import.</b> Location, direction and properties are never overwritten by FMSILA.XML — acceptance criterion 2 of DATNETISR-233.<//>
      <//>

      ${existing ? html`
        <${SectionCard} title="Announcement triggers using this optic" id="od-used"
          action=${html`<${Button} onClick=${() => go('timing')}>Open timing<//>`}>
          ${used.length ? html`
            <${Paper} variant="outlined" sx=${{ borderColor: '#E7E7E7' }}>
              <${Table}>
                <${TableHead}><${TableRow}>
                  <${TableCell}>Station<//><${TableCell}>Business rule<//><${TableCell}>Platform<//>
                  <${TableCell}>2806 type<//><${TableCell}>Offset<//>
                <//><//>
                <${TableBody}>
                  ${used.map((r, k) => html`
                    <${TableRow} key=${k} hover sx=${{ cursor: 'pointer' }} data-goto-row=${ROWS.indexOf(r)}
                      onClick=${() => { go('timing'); openRow(ROWS.indexOf(r)); }}>
                      <${TableCell}>${stationLabel(r.station)}<//>
                      <${TableCell}>${ruleLabel(r.rule)}<//>
                      <${TableCell}>${r.platform ? 'Platform ' + r.platform : 'All platforms'}<//>
                      <${TableCell}>${typeLabel(r.type)}<//>
                      <${TableCell} sx=${{ fontFamily: 'Roboto Mono, monospace' }}>${r.offset}<//>
                    <//>`)}
                <//>
              <//>
            <//>` : html`<${Typography} variant="body2" color="text.secondary">Not used by any timing row yet.<//>`}
        <//>
        <${Box}>
          <${Button} color="error" id="od-del" startIcon=${html`<${Icon}>delete<//>`}
            onClick=${() => askDelete(existing.id, () => go('optics'))}>Delete optic<//>
        <//>` : null}
    <//>`;
}

/* ══ Screen: Station announcements timing (668) ═══════════════════════ */
function TimingValue({ sid, k }) {
  const e = effective(sid, k);
  return html`<${Box} component="span" sx=${{ display: 'inline-flex', alignItems: 'center', fontFamily: 'Roboto Mono, monospace' }}>
    ${e.value}<${DefaultChip} override=${e.override} /><//>`;
}

function StationRows({ st }) {
  const { expanded, toggle, openRow, openStation, go } = useApp();
  const trig = triggersFor(st.id);
  const open = expanded.has(st.id);
  return html`
    <${React.Fragment}>
      <${TableRow} hover className="station-row" data-station-row=${st.id} sx=${{ cursor: 'pointer', '& > td': { borderBottom: open ? 'none' : undefined } }}
        onClick=${() => toggle(st.id)}>
        <${TableCell} sx=${{ width: 44, pr: 0 }}>
          <${IconButton} aria-label=${(open ? 'Collapse ' : 'Expand ') + stationLabel(st.id)} aria-expanded=${open}
            onClick=${e => { e.stopPropagation(); toggle(st.id); }}>
            <${Icon}>${open ? 'keyboard_arrow_down' : 'keyboard_arrow_right'}<//>
          <//>
        <//>
        <${TableCell} sx=${{ fontWeight: 500 }}>${stationLabel(st.id)}<//>
        <${TableCell}><${TimingValue} sid=${st.id} k="arrival" /><//>
        <${TableCell}><${TimingValue} sid=${st.id} k="departure" /><//>
        <${TableCell}><${TimingValue} sid=${st.id} k="repeat" /><//>
        <${TableCell}>${trig.length ? `${trig.length} trigger${trig.length > 1 ? 's' : ''}` : html`<${Typography} variant="body2" color="text.secondary">Estimated time only<//>`}<//>
        <${TableCell} align="right" sx=${{ py: 0 }}>
          <${RowIcon} icon="edit" id=${'edit-lead-' + st.id} label=${'Edit lead times for ' + stationLabel(st.id)} onClick=${() => openStation(st.id)} />
        <//>
      <//>
      <${TableRow}>
        <${TableCell} colSpan=${7} sx=${{ p: 0, borderBottom: open ? undefined : 'none' }}>
          <${Collapse} in=${open} timeout="auto" unmountOnExit>
            <${Box} sx=${{ pl: 7, pr: 2, py: 1.5, bgcolor: '#FCFCFC' }}>
              ${trig.length ? html`
                <${Paper} variant="outlined" sx=${{ borderColor: '#E7E7E7' }}>
                  <${Table} className="trigger-table">
                    <${TableHead}><${TableRow}>
                      <${TableCell}>Business rule<//><${TableCell}>Platform<//><${TableCell}>Based on<//>
                      <${TableCell}>Optic<//><${TableCell}>Offset<//><${TableCell} align="right">Actions<//>
                    <//><//>
                    <${TableBody}>
                      ${trig.map(({ r, i }) => html`
                        <${TableRow} key=${i} hover className="trigger-row" data-row=${i} sx=${{ cursor: 'pointer' }} onClick=${() => openRow(i)}>
                          <${TableCell}>${ruleLabel(r.rule)}<//>
                          <${TableCell}>${r.platform ? 'Platform ' + r.platform : html`<${Typography} variant="body2" color="text.secondary">All platforms<//>`}<//>
                          <${TableCell}><${Chip} size="small" sx=${{ height: 20, fontSize: 11 }}
                            color=${r.basis === 'optic' ? 'primary' : 'default'} variant=${r.basis === 'optic' ? 'filled' : 'outlined'}
                            label=${r.basis === 'optic' ? 'Optic (2806)' : 'Estimated ' + ruleKind(r.rule) + ' time'} /><//>
                          <${TableCell}>${r.basis === 'optic' ? html`
                            <${Link} component="button" underline="hover" data-goto-optic=${r.optic} sx=${{ fontFamily: 'Roboto Mono, monospace' }}
                              onClick=${e => { e.stopPropagation(); go('optic', r.optic); }}>${r.optic}<//>
                            <${Typography} component="span" variant="body2" color="text.secondary"> · type ${r.type}<//>` : '–'}<//>
                          <${TableCell} sx=${{ fontFamily: 'Roboto Mono, monospace' }}>${r.offset}<//>
                          <${TableCell} align="right" sx=${{ py: 0 }}>
                            <${RowIcon} icon="edit" label=${'Edit trigger ' + ruleLabel(r.rule)} onClick=${() => openRow(i)} />
                          <//>
                        <//>`)}
                    <//>
                  <//>
                <//>` : html`<${Typography} variant="body2" color="text.secondary" sx=${{ py: .5 }}>
                    No trigger configured — announcements use the estimated time with this station's lead times.<//>`}
              <${Button} sx=${{ mt: 1 }} startIcon=${html`<${Icon}>add<//>`} data-add-station=${st.id}
                onClick=${() => openRow(null, st.id)}>Add trigger at ${stationLabel(st.id)}<//>
            <//>
          <//>
        <//>
      <//>
    <//>`;
}

function Timing() {
  const { openRow, openDefaults, rev } = useApp();
  return html`
    <${Box}>
      <${PageHeader} title="Station announcements timing" titleId="page-title"
        action=${html`<${Button} variant="contained" id="t-add" startIcon=${html`<${Icon}>add<//>`} onClick=${() => openRow(null)}>Add trigger<//>`} />

      ${/* View-only values are disabled fields plus a sentence saying where to
            edit them — ETC's own Device details "Location" card. Read-only
            fields that still look editable were a trap. */ ''}
      <${SectionCard} title="System defaults" id="defaults-card"
        note="View only. Applied at every station unless overridden below — edit them with the pen."
        action=${html`<${RowIcon} icon="edit" id="d-edit" label="Edit system defaults" onClick=${openDefaults} />`}>
        <${FieldGrid} cols=${4}>
          <${TextField} label="Arrival lead time" value=${DEFAULTS.arrival} id="d-arr" disabled />
          <${TextField} label="Departure lead time" value=${DEFAULTS.departure} id="d-dep" disabled />
          <${TextField} label="Repeat interval" value=${DEFAULTS.repeat} id="d-rep" disabled />
        <//>
      <//>

      <${Paper} variant="outlined" sx=${{ borderColor: '#E7E7E7' }}>
        <${TableContainer}>
          <${Table} id="tm-table">
            <${TableHead}><${TableRow}>
              <${TableCell} sx=${{ width: 44 }} aria-label="Expand" />
              <${TableCell}>Station<//><${TableCell}>Arrival lead time<//><${TableCell}>Departure lead time<//>
              <${TableCell}>Repeat interval<//><${TableCell}>Triggers<//><${TableCell} align="right">Actions<//>
            <//><//>
            <${TableBody}>
              ${STATIONS.map(st => html`<${StationRows} key=${st.id} st=${st} />`)}
            <//>
          <//>
        <//>
      <//>

      <${Assume}>
        <b>Decided (Ignat, 2026-09-28):</b> lead time and repeat interval are set <b>per station</b>; an optic trigger counts from the <b>actual</b> train movement,
        never has a negative offset, and <b>always falls back</b> to the estimated time if the optic event never arrives.
        <b> Still open:</b> A4 (can type 50 trigger?), A5 (repeat interval per station or per announcement type), and whether the optic delay lives on the optic, on the trigger, or both.
      <//>
    <//>`;
}

/* ══ Side sheet: trigger editor — the shared "Based on" control ═══════ */
function TriggerDrawer({ idx, presetStation, onClose }) {
  const { bump, toast, expand } = useApp();
  const isNew = idx == null;
  const [r, setR] = useState(() => isNew
    ? { station: presetStation || '1500', rule: 'BR12', platform: '', basis: 'est', optic: '', type: '80', offset: '0:00' }
    : { ...ROWS[idx] });
  const set = patch => setR(prev => ({ ...prev, ...patch }));

  const plats = [...new Set(OPTICS.filter(o => o.station === r.station).map(o => o.platform))].sort();
  if (r.platform && !plats.includes(r.platform)) plats.push(r.platform);
  const optics = OPTICS.filter(o => o.station === r.station && (!r.platform || o.platform === r.platform));
  const opticValue = optics.some(o => o.id === r.optic) ? r.optic : (optics[0] ? optics[0].id : '');
  const type = TYPES.find(t => t.v === r.type) || {};
  const where = `${stationLabel(r.station)}${r.platform ? ', platform ' + r.platform : ', all platforms'}`;

  // Ignat, 2026-09-28: "Negative offset is impossible" for an optic trigger.
  const negative = r.basis === 'optic' && String(r.offset).trim().startsWith('-');
  const offsetHelp = negative
    ? "Can't be negative — an optic trigger fires on the actual train movement, so the message can only come at or after it."
    : r.basis === 'optic'
      ? 'Counted from the moment the train actually triggers the optic. Positive shows the message later.'
      : 'Counted from the estimated time. Negative announces before it, positive after.';

  const save = () => {
    if (negative) return;
    const out = { station: r.station, rule: r.rule, platform: r.platform, basis: r.basis,
                  optic: r.basis === 'optic' ? opticValue : '', type: r.basis === 'optic' ? r.type : '',
                  offset: String(r.offset).trim() || '0:00' };
    if (isNew) ROWS.push(out); else ROWS[idx] = out;
    expand(out.station); bump(); onClose(); toast(isNew ? 'Trigger added' : 'Trigger saved');
  };

  return html`
    <${Drawer} anchor="right" open=${true} onClose=${onClose} PaperProps=${{ id: 'dr-row', sx: { width: 460 } }}>
      <${Box} sx=${{ display: 'flex', alignItems: 'center', px: 3, py: 2 }}>
        <${Typography} variant="h6" id="dt-title" sx=${{ flex: 1 }}>${isNew ? 'Add trigger' : 'Edit trigger'}<//>
        <${IconButton} aria-label="Close" onClick=${onClose}><${Icon}>close<//><//>
      <//>
      <${Divider} />
      <${Box} sx=${{ px: 3, py: 2, flex: 1, overflowY: 'auto' }}>
        <${Typography} variant="subtitle2" color="text.secondary" sx=${{ mb: 1.5 }}>Applies to<//>
        <${Stack} spacing=${2}>
          <${FormControl} fullWidth required>
            <${InputLabel} id="r-station-label">Station<//>
            <${Select} id="r-station" labelId="r-station-label" value=${r.station} label="Station"
              onChange=${e => set({ station: e.target.value, platform: '' })}>
              ${STATIONS.map(s => html`<${MenuItem} key=${s.id} value=${s.id}>${stationLabel(s.id)}<//>`)}
            <//>
          <//>
          <${FormControl} fullWidth required>
            <${InputLabel} id="r-rule-label">Business rule<//>
            <${Select} id="r-rule" labelId="r-rule-label" value=${r.rule} label="Business rule" onChange=${e => set({ rule: e.target.value })}>
              ${RULES.map(x => html`<${MenuItem} key=${x.id} value=${x.id}>${ruleLabel(x.id)}<//>`)}
            <//>
          <//>
          <${FilterSelect} id="r-plat" label="Platform" value=${r.platform} onChange=${v => set({ platform: v })}
            helperText="Leave empty for all platforms."
            options=${plats.map(p => ({ value: p, label: 'Platform ' + p }))} />
        <//>

        <${Box} sx=${{ display: 'flex', alignItems: 'center', gap: 1, mt: 3, mb: 1.5 }}>
          <${Typography} variant="subtitle2" color="text.secondary">Based on<//>
          <${Chip} size="small" label="SHARED CONTROL · 233 + 668" variant="outlined" sx=${{ height: 20, fontSize: 10 }} />
        <//>
        <${ToggleButtonGroup} id="r-seg" exclusive size="small" color="primary" value=${r.basis}
          onChange=${(e, v) => v && set({ basis: v })}>
          <${ToggleButton} value="est">Estimated time<//>
          <${ToggleButton} value="optic">Optic (2806)<//>
        <//>

        ${r.basis === 'optic' ? html`
          <${Stack} spacing=${2} sx=${{ mt: 2 }} id="r-optic-block">
            <${FormControl} fullWidth>
              <${InputLabel} id="r-optic-label">Optic<//>
              <${Select} id="r-optic" labelId="r-optic-label" value=${opticValue} label="Optic" onChange=${e => set({ optic: e.target.value })}>
                ${optics.length ? optics.map(o => html`<${MenuItem} key=${o.id} value=${o.id}>${o.id} — track ${o.track}, platform ${o.platform}<//>`)
                                : html`<${MenuItem} value="">No optics at this station<//>`}
              <//>
              <${M.FormHelperText}>${optics.length > 1
                ? `${optics.length} optics match. A platform can have more than one — station 1220 platform 1 has two — so the track designation is shown to tell them apart.`
                : optics.length === 1 ? 'One optic matches this station and platform.' : 'This station has no optics in DATNETISR-233 yet.'}<//>
            <//>
            <${FormControl} fullWidth>
              <${InputLabel} id="r-type-label">2806 sub-message type<//>
              <${Select} id="r-type" labelId="r-type-label" value=${r.type} label="2806 sub-message type" onChange=${e => set({ type: e.target.value })}>
                ${TYPES.map(t => html`<${MenuItem} key=${t.v} value=${t.v}>${typeLabel(t.v)}<//>`)}
              <//>
              ${type.note ? html`<${M.FormHelperText} id="r-type-note">${type.note}<//>` : null}
            <//>
            <${Typography} variant="body2" color="text.secondary" id="r-fallback-note">
              If this optic event never arrives, the announcement falls back to the estimated time.
            <//>
          <//>` : null}

        <${Box} sx=${{ mt: 3, maxWidth: 240 }}>
          <${TextField} id="r-offset" label="Offset" value=${r.offset} placeholder="mm:ss" fullWidth
            error=${negative} helperText=${offsetHelp} onChange=${e => set({ offset: e.target.value })} />
        <//>

        <${Alert} severity="info" icon=${false} sx=${{ mt: 3 }}>
          <${Typography} variant="caption" sx=${{ display: 'block', fontWeight: 500, mb: .5 }}>What this row does<//>
          <span id="r-preview-txt">${r.basis === 'est'
            ? html`Announce <${OffsetPhrase} off=${r.offset} /> the estimated <b>${ruleKind(r.rule)}</b> time at ${where}.`
            : html`At ${where}, announce <${OffsetPhrase} off=${r.offset} /> the train actually triggers the <b>${type.label || r.type}</b> (type ${r.type}) event at optic <b>${opticValue || '—'}</b>. If that event never arrives, fall back to the estimated <b>${ruleKind(r.rule)}</b> time.`}</span>
        <//>
        ${r.basis === 'optic' && r.type === '50' ? html`<${Assume}><b>A4 —</b> ticket 233 calls type 50 "informational only", while 668's example rows use it as the trigger. Unresolved.<//>` : null}
      <//>
      <${Divider} />
      <${Stack} direction="row" spacing=${1} sx=${{ px: 3, py: 1.5 }}>
        <${Button} variant="contained" id="dt-save" disabled=${negative} onClick=${save}>Save<//>
        <${Button} onClick=${onClose}>Cancel<//>
      <//>
    <//>`;
}

/* ══ Side sheet: per-station lead times, or the system defaults ═══════ */
function StationDrawer({ sid, onClose }) {
  const { bump, toast } = useApp();
  const defaults = sid == null;
  const keys = [['arrival', 'Arrival lead time'], ['departure', 'Departure lead time'], ['repeat', 'Repeat interval']];
  const [v, setV] = useState(() => Object.fromEntries(keys.map(([k]) => [k, defaults ? DEFAULTS[k] : effective(sid, k).value])));
  const [ov, setOv] = useState(() => defaults ? {} : Object.fromEntries(keys.map(([k]) => [k, effective(sid, k).override])));

  const save = () => {
    if (defaults) { keys.forEach(([k]) => { DEFAULTS[k] = v[k].trim(); }); bump(); onClose(); toast('System defaults saved'); return; }
    keys.forEach(([k]) => {
      const val = v[k].trim();
      STATION_TIMING[sid][k] = (!ov[k] || val === '' || val === DEFAULTS[k]) ? null : val;
    });
    bump(); onClose(); toast('Station timing saved');
  };
  const reset = k => { STATION_TIMING[sid][k] = null; setV(p => ({ ...p, [k]: DEFAULTS[k] })); setOv(p => ({ ...p, [k]: false })); bump(); toast('Reset to system default'); };

  return html`
    <${Drawer} anchor="right" open=${true} onClose=${onClose} PaperProps=${{ id: 'dr-station', sx: { width: 420 } }}>
      <${Box} sx=${{ display: 'flex', alignItems: 'center', px: 3, py: 2 }}>
        <${Typography} variant="h6" id="ds-title" sx=${{ flex: 1 }}>${defaults ? 'System default timing' : 'Timing — ' + stationLabel(sid)}<//>
        <${IconButton} aria-label="Close" onClick=${onClose}><${Icon}>close<//><//>
      <//>
      <${Divider} />
      <${Stack} spacing=${2.5} sx=${{ px: 3, py: 2, flex: 1, overflowY: 'auto' }}>
        <${Typography} variant="subtitle2" color="text.secondary">${defaults ? 'Applied at every station unless overridden' : 'Lead times and repeat'}<//>
        ${keys.map(([k, label]) => html`
          <${Box} key=${k} sx=${{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
            <${TextField} id=${'st-' + k} label=${label} value=${v[k]} fullWidth
              helperText=${defaults ? 'Format ±mm:ss.' : `System default: ${DEFAULTS[k]}. Format ±mm:ss.`}
              InputProps=${defaults ? {} : { endAdornment: html`<${InputAdornment} position="end"><${DefaultChip} override=${ov[k]} /><//>` }}
              onChange=${e => { const x = e.target.value; setV(p => ({ ...p, [k]: x })); if (!defaults) setOv(p => ({ ...p, [k]: x.trim() !== DEFAULTS[k] })); }} />
            ${defaults ? null : html`<${Button} data-reset=${k} disabled=${!ov[k]} sx=${{ mt: 1 }} onClick=${() => reset(k)}>Reset<//>`}
          <//>`)}
        ${defaults ? html`<${Typography} variant="body2" color="text.secondary">Changing a default immediately changes every station that has not overridden it.<//>`
                   : html`<${Assume}><b>A5 —</b> one repeat interval per station. Ticket 668 says "allowing different repetition cadences", which could also mean one per announcement type.<//>`}
      <//>
      <${Divider} />
      <${Stack} direction="row" spacing=${1} sx=${{ px: 3, py: 1.5 }}>
        <${Button} variant="contained" id="ds-save" onClick=${save}>Save<//>
        <${Button} onClick=${onClose}>Cancel<//>
      <//>
    <//>`;
}

/* ══ Root ═════════════════════════════════════════════════════════════ */
function Root() {
  const [screen, setScreen] = useState('optics');
  const [opticId, setOpticId] = useState(null);
  const [rev, setRev] = useState(0);
  const [assume, setAssume] = useState(false);
  const [expanded, setExpanded] = useState(() => new Set(['1820']));   // 1820 has two triggers — open so the nesting shows
  const [drawer, setDrawer] = useState(null);
  const [toastMsg, setToastMsg] = useState('');
  const [del, setDel] = useState(null);

  const bump = useCallback(() => setRev(x => x + 1), []);
  const go = useCallback((s, id) => { setDrawer(null); setScreen(s); if (s === 'optic') setOpticId(id === undefined ? null : id); window.scrollTo(0, 0); }, []);
  const toggle = id => setExpanded(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const expand = id => setExpanded(p => new Set(p).add(id));

  // Delete is refused while a timing row still uses the optic — the vanilla's rule.
  const askDelete = (id, after) => {
    const rows = opticsUsedBy(id).length;
    if (rows) { setToastMsg(`Cannot delete — used by ${rows} timing row${rows > 1 ? 's' : ''}`); return; }
    setDel({ id, after });
  };
  const doDelete = () => {
    const i = OPTICS.findIndex(o => o.id === del.id);
    if (i >= 0) OPTICS.splice(i, 1);
    const after = del.after; setDel(null); bump(); setToastMsg('Optic deleted'); if (after) after();
  };

  const value = {
    screen, opticId, go, rev, bump, assume, setAssume, expanded, toggle, expand,
    toast: setToastMsg, askDelete,
    openRow: (idx, preset) => { if (idx != null) { const r = ROWS[idx]; if (r) expand(r.station); } setDrawer({ kind: 'row', idx, preset }); },
    openStation: sid => setDrawer({ kind: 'station', sid }),
    openDefaults: () => setDrawer({ kind: 'station', sid: null }),
  };

  const View = screen === 'timing' ? Timing : screen === 'optic' ? OpticDetail : OpticsList;
  return html`
    <${ThemeProvider} theme=${theme}>
      <${CssBaseline} />
      <${App.Provider} value=${value}>
        <${Presenter} />
        <${Box} sx=${{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 42px)' }}>
          <${TopBar} />
          <${Box} sx=${{ display: 'flex', flex: 1, minHeight: 0 }}>
            <${Rail} />
            <${Box} component="main" data-screen=${screen} sx=${{ flex: 1, minWidth: 0, px: 3, py: 2.5, bgcolor: '#fff' }}>
              <${View} key=${screen + ':' + (opticId || '')} />
            <//>
          <//>
        <//>
        ${drawer && drawer.kind === 'row' ? html`<${TriggerDrawer} key=${'r' + drawer.idx + drawer.preset} idx=${drawer.idx} presetStation=${drawer.preset} onClose=${() => setDrawer(null)} />` : null}
        ${drawer && drawer.kind === 'station' ? html`<${StationDrawer} key=${'s' + drawer.sid} sid=${drawer.sid} onClose=${() => setDrawer(null)} />` : null}
        <${Dialog} open=${!!del} onClose=${() => setDel(null)}>
          <${DialogTitle}>Delete optic ${del ? del.id : ''}?<//>
          <${DialogContent}><${DialogContentText}>It is not used by any timing row. This cannot be undone.<//><//>
          <${DialogActions}>
            <${Button} onClick=${() => setDel(null)}>Cancel<//>
            <${Button} color="error" variant="contained" id="del-confirm" onClick=${doDelete}>Delete<//>
          <//>
        <//>
        <${Snackbar} open=${!!toastMsg} autoHideDuration=${2800} onClose=${() => setToastMsg('')}
          message=${toastMsg} anchorOrigin=${{ vertical: 'bottom', horizontal: 'left' }} />
      <//>
    <//>`;
}

ReactDOM.createRoot(document.getElementById('root')).render(html`<${Root} />`);
