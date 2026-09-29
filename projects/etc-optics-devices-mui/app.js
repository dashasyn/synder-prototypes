/* ════════════════════════════════════════════════════════════════════
   ETC · Optics with one offset per device — two options.
   React 18 + MUI v5, no build step.

   Ignat, 2026-09-29: "After a discussion we decided to have a table of
   optics, where the user can add optic devices as now and for each optic
   device the user can add offset. This offset will be sent to other
   platform. So nothing per rule, one per the device. So I want 2 options:
   1. Optics table is a separate table  2. Optic devices as a part of usual
   devices table. But optic devices will have different details."
   And: "For 2 separate tables add a line below Devices. Optics list".

   Built from projects/etc-optic-timing-mui (theme, chrome, upload popup),
   simplified: no timing screen, no triggers, no rules, no lead times.

   Copy sources — so nothing invented reads as product copy:
   · captured  — Device list columns + rows, Device details cards and
                 labels, the Systems menu, the Stations codes: Ignat's
                 screenshots of ETC's product, 2026-09-28 / 09-29.
   · proposed  — everything about optics: the Optics list, the Optic type,
                 the Offset card, the upload popup, the Filters panel (its
                 real content was not captured).
   ════════════════════════════════════════════════════════════════════ */
const { useState, useContext, createContext, useCallback } = React;
const html = htm.bind(React.createElement);
const M = MaterialUI;
const {
  ThemeProvider, createTheme, CssBaseline, AppBar, Toolbar, Box, Button, IconButton,
  Typography, Menu, MenuItem, Breadcrumbs, Link, Card, CardContent, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination, Paper, Chip,
  Stack, FormControl, InputLabel, Select, InputAdornment, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Snackbar,
} = M;

const Icon = ({ children, sx }) =>
  html`<span className="material-icons" aria-hidden="true" style=${{ fontSize: 20, ...(sx || {}) }}>${children}</span>`;

const NAVY = '#1C2848';

/* The theme — verbatim from projects/etc-optic-timing-mui/app.js. */
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

/* ── Data ──────────────────────────────────────────────────────────── */
const LAST_IMPORT = '27 Aug 2026, 03:00';

/* Codes and names from the Stations screenshot. Codes seen only in the
   Device list have no name we know of. 1220 is from ticket 233, which gives
   no name; 1500 / 1820 are Akko / Ahihud per ticket 668 ("1500 (Acre)"). */
const STATIONS = [
  ['AFA', 'Afula'], ['AHI', 'Ahihud'], ['AKO', 'Akko'], ['ASK', 'Ashkelon'], ['BS', 'B. Sheva Uni'],
  ['NTBG', 'Ben Gurion Airport'], ['SMS', 'Bet Shemesh'], ['1220', ''],
  ['CRM', ''], ['HBD', ''], ['HGA', ''], ['HSM', ''], ['NET', ''], ['RZL', ''], ['TIA', ''],
].map(([code, name]) => ({ code, name }));
const stationLabel = c => { const s = STATIONS.find(x => x.code === c); return s && s.name ? `${c} - ${s.name}` : c; };

/* Device list rows, as captured (a truncated Output Zone row left out). */
var DEVICES = [
  ['Platfrom HGA Display 2', 'hga-plat-2', 'Platform TFT', '-', 'Active', '1111', 'SMS', '2'],
  ['Device', 'device-11001', 'Corridor TFT', '2222', 'Active', '1111.1111', 'AFA', 'TP100926'],
  ['device 1', 'device-1', 'Platform 1 LED', '1.0.0', 'Active', '190.168.1.1', 'NTBG', 'Airport Hall'],
  ['device 0803', 'device-0803', 'NewTest', '-', 'Active', '192.168.1.1', 'HGA', 'Corridor HGA 2'],
  ['NewPlatformDevice', 'NewPlatD', 'Platform TFT', '1', 'Active', '111.111.111', 'HBD', '3'],
  ['Display TM P1 A', 'dev-isr-001', '', '-', 'Inactive', '192.168.10.10', '', ''],
  ['Display TM P1 B', 'dev-isr-002', '', '-', 'Inactive', '192.168.10.11', '', ''],
  ['Dev testing 003', 'dev-testing-003', '', '-', 'Active', '1.1.1.1', 'HSM', 'HaShalom Platform 1'],
  ['Display TM P2', 'dev-isr-003', '', '-', 'Active', '192.168.10.12', 'CRM', 'crm-passenger-1'],
  ['Samsung Concourse TFT', 'html-isr-001', 'Concourse TFT', '-', 'Active', '192.168.10.21', 'HGA', 'East Passenger Hall'],
  ['Display HSM P1', 'dev-isr-004', '', '-', 'Active', '192.168.10.13', 'HSM', 'HaShalom Platform 1'],
  ['test 08031', 'test-08031', 'HTML TEST test test', '1', 'Active', '4.3.2.1', 'BS', 'Beer Sheva Platform'],
  ['testf3806', '38060409', 'HTML TEST test test', '3.0', 'Active', '192.168.255.2.2', 'TIA', 'PH 1'],
  ['Display Netanya P1', 'dev-isr-007', '', '-', 'Active', '192.168.10.16', 'NET', 'Netanya Platform 1'],
  ['RZL Plat 2', 'rzl-plat-2', 'Platform TFT', '1', 'Inactive', '191', '', ''],
  ['RZL Corridor 1-2', 'rzl-corr-12', 'Corridor TFT', '1', 'Inactive', '1191', '', ''],
  ['TP10092601', 'tp-100920-01', 'Passenger Hall LED', '1', 'Inactive', '1.1.1.1', '', ''],
  ['RZL-CDS2-01', '350000', 'Surtronic CDS2', '-', 'Active', '172.18.118.122', 'RZL', 'RZL-PH1-PA1'],
].map(([name, id, type, version, status, net, station, zone]) => ({ name, id, type, version, status, net, net2: '', station, zone }));

const DEVICE_TYPES = [...new Set(DEVICES.map(d => d.type).filter(Boolean))].sort();
const OPTIC = 'Optic';   // proposed: the new device type in option 2

/* Optics: HA2 pair from ticket 668, HA6 four from ticket 233's FMSILA
   example. Offsets are illustrative — the tickets give no numbers. */
var OPTICS = [
  ['HA2 14T87', 'AKO', '2', '14', '0:00'],
  ['HA2 24T45', 'AHI', '2', '24', '1:00'],
  ['HA6 131113', '1220', '1', '13', '0:00'],
  ['HA6 131111', '1220', '1', '13', '0:30'],
  ['HA6 131121', '1220', '2', '21', '0:00'],
  ['HA6 131124', '1220', '2', '21', '0:00'],
].map(([id, station, platform, track, offset]) => ({ id, station, platform, track, offset, status: 'Active' }));

/** m:ss → seconds; null if it doesn't parse. A leading minus parses, so it can be refused by name. */
function toSec(s) {
  const m = String(s || '').trim().match(/^([+-])?(\d{1,3}):([0-5]\d)$/);
  if (!m) return null;
  const v = Number(m[2]) * 60 + Number(m[3]);
  return m[1] === '-' ? -v : v;
}
const fmtSec = v => `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}`;
function offsetError(s) {
  if (String(s).trim().startsWith('-')) return "Can't be negative — the message can only come at or after the train triggers the optic.";
  return toSec(s) == null ? 'Use m:ss, e.g. 1:30.' : '';
}

/* ── App state ─────────────────────────────────────────────────────── */
const App = createContext(null);
const useApp = () => useContext(App);

/* ── Shared components ─────────────────────────────────────────────── */
function FilterSelect({ label, value, onChange, options, minWidth = 200, id, helperText, disabled, error, required }) {
  const labelId = (id || 'sel') + '-label';
  return html`
    <${FormControl} sx=${{ minWidth }} disabled=${!!disabled} error=${!!error} required=${!!required}>
      <${InputLabel} id=${labelId}>${label}<//>
      <${Select} id=${id} value=${value} label=${label} labelId=${labelId}
        onChange=${e => onChange(e.target.value)}
        endAdornment=${value && !disabled && !required ? html`
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

const RowIcon = ({ icon, label, onClick, id }) => html`
  <${Tooltip} title=${label}>
    <${IconButton} id=${id} aria-label=${label} onClick=${e => { e.stopPropagation(); onClick(); }}>
      <${Icon}>${icon}<//>
    <//>
  <//>`;

function PageHeader({ crumbs, title, action, titleId }) {
  return html`
    <${Box} sx=${{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 2, mb: 2 }}>
      <${Box} sx=${{ minWidth: 0 }}>
        <${Breadcrumbs} sx=${{ mb: .5 }} separator=${html`<${Icon} sx=${{ fontSize: 16 }}>chevron_right<//>`}>
          ${crumbs.map((c, i) => c.onClick
            ? html`<${Link} key=${i} component="button" underline="hover" color="text.secondary" variant="body2" onClick=${c.onClick}>${c.label}<//>`
            : html`<${Typography} key=${i} variant="body2" color="text.primary">${c.label}<//>`)}
        <//>
        <${Typography} variant="h6" id=${titleId} noWrap>${title}<//>
      <//>
      <${Stack} direction="row" spacing=${1} sx=${{ flexShrink: 0 }}>${action}<//>
    <//>`;
}

function SectionCard({ title, note, children, id }) {
  return html`
    <${Card} id=${id} sx=${{ mb: 2 }}>
      <${CardContent} sx=${{ '&:last-child': { pb: 2 } }}>
        <${Typography} variant="h6" sx=${{ fontSize: 18, mb: 2 }}>${title}<//>
        ${note ? html`<${Typography} variant="body2" sx=${{ mt: -1, mb: 2 }}>${note}<//>` : null}
        ${children}
      <//>
    <//>`;
}

const FieldGrid = ({ children, cols = 4 }) => html`
  <${Box} sx=${{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: `repeat(${cols}, minmax(0, 1fr))` } }}>
    ${children}
  <//>`;

const StatusChip = ({ status }) => html`
  <${Chip} size="small" label=${status} color=${status === 'Active' ? 'success' : 'error'}
    sx=${{ height: 18, fontSize: 10, bgcolor: status === 'Active' ? '#E8F5E9' : '#FDECEA',
           color: status === 'Active' ? '#2E7D32' : '#C62828' }} />`;

const TypeCell = ({ type }) => type ? html`
  <${Box} component="span" sx=${{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
    <${Icon} sx=${{ fontSize: 22, color: 'text.secondary' }}>${type === OPTIC ? 'sensors' : 'desktop_windows'}<//>${type}
  <//>` : '-';

/* ── Chrome: ETC's navy bar and icon rail ──────────────────────────── */
function TopBar() {
  const { go, screen, variant } = useApp();
  const [anchor, setAnchor] = useState(null);
  const drop = l => html`<${Button} key=${l} color="inherit" sx=${{ textTransform: 'none', fontSize: 14, opacity: .85 }}
                          endIcon=${html`<${Icon} sx=${{ fontSize: 18 }}>expand_more<//>`}>${l}<//>`;
  const sub = html`<${Icon} sx=${{ ml: 'auto', pl: 3 }}>chevron_right<//>`;
  const pick = s => { setAnchor(null); go(s); };
  const inDevices = screen === 'devices' || (screen === 'detail' && variant === 2);
  const inOptics = screen === 'optics' || (screen === 'detail' && variant === 1);
  /* The Systems menu as captured. "Devices ›" opens a submenu in the
     product; its items were not captured, so here it goes straight to the
     Device list. Option 1 adds "Optics list" below Devices (Ignat, 09-29). */
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
          anchorOrigin=${{ vertical: 'bottom', horizontal: 'left' }} MenuListProps=${{ sx: { minWidth: 230 } }}>
          <${MenuItem} disabled>Identity${sub}<//>
          <${MenuItem} disabled>Stations${sub}<//>
          <${MenuItem} data-nav="devices" selected=${inDevices} onClick=${() => pick('devices')}>Devices${sub}<//>
          ${variant === 1 ? html`<${MenuItem} data-nav="optics" selected=${inOptics} onClick=${() => pick('optics')}>Optics list<//>` : null}
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

/* The variant switcher — AGENTS.md canonical: first element, full width,
   dark, deliberately not product chrome. Swaps in place. */
function VariantSwitch() {
  const { variant, setVariant } = useApp();
  const btn = (n, label) => html`
    <button id=${'vs-' + n} className=${variant === n ? 'on' : ''} onClick=${() => setVariant(n)}
      style=${{ background: variant === n ? '#fff' : 'none', color: variant === n ? 'rgba(0,0,0,.87)' : 'rgba(255,255,255,.7)',
                border: 'none', fontFamily: 'inherit', fontSize: 13, fontWeight: variant === n ? 500 : 400,
                padding: '5px 12px', borderRadius: 4, cursor: 'pointer', whiteSpace: 'nowrap' }}>${label}</button>`;
  return html`
    <div className="variant-switch" id="variant-switch"
      style=${{ display: 'flex', alignItems: 'center', gap: 12, background: '#1b1b1b', color: '#fff',
                padding: '8px 20px', flexShrink: 0, fontSize: 13, fontFamily: 'Roboto, sans-serif' }}>
      <span style=${{ fontWeight: 500, letterSpacing: '.01em', opacity: .75, fontSize: 12, textTransform: 'uppercase' }}>Where optics live</span>
      <span style=${{ display: 'flex', gap: 4, background: 'rgba(255,255,255,.1)', borderRadius: 6, padding: 3 }}>
        ${btn(1, '1 · Separate optics list')}
        ${btn(2, '2 · Inside the Device list')}
      </span>
      <span id="vs-note" style=${{ marginLeft: 'auto', opacity: .6, fontSize: 12 }}>
        ${variant === 1 ? 'Systems › Optics list — its own table and details page' : 'Systems › Devices — optics are a device type with their own details'}
      </span>
    </div>`;
}

/* ── A list page: title, search, Filters, corner buttons, table ─────── */
function ListPage({ title, searchLabel, filters, active, actions, columns, rows, renderRow, empty, tableId }) {
  const [page, setPage] = useState(0);
  const [per, setPer] = useState(25);
  const [open, setOpen] = useState(active > 0);
  const shown = rows.slice(page * per, page * per + per);
  if (page > 0 && page * per >= rows.length) setPage(0);
  return html`
    <${Box}>
      <${Box} sx=${{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
        <${Typography} variant="h6" id="page-title" sx=${{ mr: 1 }}>${title}<//>
        <${TextField} id="q" hiddenLabel placeholder="Search" value=${searchLabel.value} sx=${{ width: 280 }}
          inputProps=${{ 'aria-label': searchLabel.aria }}
          onChange=${e => { searchLabel.set(e.target.value); setPage(0); }}
          InputProps=${{ endAdornment: html`<${InputAdornment} position="end"><${Icon} sx=${{ color: 'text.secondary' }}>search<//><//>` }} />
        <${Button} variant="outlined" id="filters-btn" aria-expanded=${open} startIcon=${html`<${Icon}>filter_list<//>`}
          onClick=${() => setOpen(!open)}>Filters${active ? ` (${active})` : ''}<//>
        <${Box} sx=${{ flex: 1 }} />
        ${actions}
      <//>
      ${open ? html`<${Box} id="filters" sx=${{ display: 'flex', gap: 2, mb: 1.5, flexWrap: 'wrap' }}>${filters(() => setPage(0))}<//>` : null}
      <${Paper} variant="outlined" sx=${{ borderColor: '#E7E7E7' }}>
        <${TableContainer}>
          <${Table} id=${tableId}>
            <${TableHead}><${TableRow}>
              ${columns.map(c => html`<${TableCell} key=${c}>${c}<//>`)}
              <${TableCell} align="right" aria-label="Actions" />
            <//><//>
            <${TableBody}>
              ${shown.length ? shown.map(renderRow) : html`
                <${TableRow}><${TableCell} colSpan=${columns.length + 1} align="center" sx=${{ py: 4, color: 'text.secondary' }}>${empty}<//><//>`}
            <//>
          <//>
        <//>
        <${TablePagination} component="div" count=${rows.length} page=${page} rowsPerPage=${per}
          rowsPerPageOptions=${[5, 25, 50]} showFirstButton showLastButton
          onPageChange=${(e, p) => setPage(p)}
          onRowsPerPageChange=${e => { setPer(parseInt(e.target.value, 10)); setPage(0); }} />
      <//>
    <//>`;
}

const rowActions = (label, onLink, onEdit, onDel) => html`
  <${TableCell} align="right" sx=${{ whiteSpace: 'nowrap', py: 0 }}>
    <${RowIcon} icon="link" label=${'Copy URL of ' + label} onClick=${onLink} />
    <${RowIcon} icon="edit" label=${'Edit ' + label} onClick=${onEdit} />
    <${RowIcon} icon="delete" label=${'Delete ' + label} onClick=${onDel} />
  <//>`;

/* ══ Option 1: Optics list ═══════════════════════════════════════════ */
function OpticsList() {
  const { go, askDelete, openUpload, toast } = useApp();
  const [q, setQ] = useState('');
  const [st, setSt] = useState('');
  const [pl, setPl] = useState('');
  const plats = [...new Set(OPTICS.map(o => o.platform))].sort();
  const n = q.trim().toLowerCase();
  const rows = OPTICS.filter(o =>
    (!st || o.station === st) && (!pl || o.platform === pl) &&
    (!n || `${o.id} ${stationLabel(o.station)} ${o.track}`.toLowerCase().includes(n)));
  const open = id => go('detail', { kind: 'optic', id });
  return html`
    <${ListPage} title="Optics list" tableId="o-table" empty="No optics match."
      searchLabel=${{ value: q, set: setQ, aria: 'Search optic ID, station or track' }}
      active=${[st, pl].filter(Boolean).length}
      filters=${reset => html`
        <${FilterSelect} id="f-station" label="Station" value=${st} onChange=${v => { setSt(v); reset(); }}
          options=${[...new Set(OPTICS.map(o => o.station))].map(c => ({ value: c, label: stationLabel(c) }))} />
        <${FilterSelect} id="f-plat" label="Platform" value=${pl} minWidth=${160} onChange=${v => { setPl(v); reset(); }}
          options=${plats.map(p => ({ value: p, label: 'Platform ' + p }))} />`}
      actions=${html`
        <${Button} variant="outlined" id="upload-btn" startIcon=${html`<${Icon}>upload<//>`} onClick=${openUpload}>Upload<//>
        <${Button} variant="contained" id="add-btn" startIcon=${html`<${Icon}>add<//>`} onClick=${() => go('detail', { kind: 'optic', id: null })}>Add optic<//>`}
      columns=${['Optic ID', 'Station', 'Platform', 'Aramis track', 'Offset', 'Status']}
      rows=${rows}
      renderRow=${o => html`
        <${TableRow} key=${o.id} hover data-optic=${o.id} sx=${{ cursor: 'pointer' }} onClick=${() => open(o.id)}>
          <${TableCell}>${o.id}<//>
          <${TableCell}>${o.station}<//>
          <${TableCell}>${o.platform}<//>
          <${TableCell}>${o.track || '-'}<//>
          <${TableCell} data-offset>${o.offset}<//>
          <${TableCell}><${StatusChip} status=${o.status} /><//>
          ${rowActions(o.id, () => toast('Optic URL copied'), () => open(o.id), () => askDelete('optic', o.id))}
        <//>`} />`;
}

/* ══ Device list — both options; option 2 carries the optics ═════════ */
function DeviceList() {
  const { go, askDelete, openUpload, toast, variant } = useApp();
  const withOptics = variant === 2;
  const [q, setQ] = useState('');
  const [ty, setTy] = useState('');
  const [st, setSt] = useState('');
  const [status, setStatus] = useState('');

  const all = [
    ...DEVICES.map(d => ({ ...d, kind: 'device' })),
    ...(withOptics ? OPTICS.map(o => ({ kind: 'optic', name: o.id, id: o.id, type: OPTIC, version: '-', status: o.status,
                                        net: '-', station: o.station, zone: '-', offset: o.offset })) : []),
  ];
  const n = q.trim().toLowerCase();
  const rows = all.filter(d =>
    (!ty || d.type === ty) && (!st || d.station === st) && (!status || d.status === status) &&
    (!n || `${d.name} ${d.id} ${d.type} ${d.station} ${d.zone}`.toLowerCase().includes(n)));
  const types = withOptics ? [...DEVICE_TYPES, OPTIC] : DEVICE_TYPES;
  const stations = [...new Set(all.map(d => d.station).filter(Boolean))].sort();
  const open = d => go('detail', { kind: d.kind, id: d.id });
  const columns = ['Device Name', 'Device ID', 'Device Type', 'Version', 'Status', 'Network Address (Primary)', 'Station', 'Output Zone'];

  return html`
    <${ListPage} title="Device list" tableId="d-table" empty="No devices match."
      searchLabel=${{ value: q, set: setQ, aria: 'Search devices' }}
      active=${[ty, st, status].filter(Boolean).length}
      filters=${reset => html`
        <${FilterSelect} id="f-type" label="Device Type" value=${ty} onChange=${v => { setTy(v); reset(); }}
          options=${types.map(t => ({ value: t, label: t }))} />
        <${FilterSelect} id="f-station" label="Station" value=${st} minWidth=${160} onChange=${v => { setSt(v); reset(); }}
          options=${stations.map(c => ({ value: c, label: stationLabel(c) }))} />
        <${FilterSelect} id="f-status" label="Status" value=${status} minWidth=${160} onChange=${v => { setStatus(v); reset(); }}
          options=${['Active', 'Inactive'].map(s => ({ value: s, label: s }))} />`}
      actions=${html`
        ${withOptics ? html`<${Button} variant="outlined" id="upload-btn" startIcon=${html`<${Icon}>upload<//>`} onClick=${openUpload}>Upload optics<//>` : null}
        <${Button} variant="contained" id="add-btn" startIcon=${html`<${Icon}>add<//>`} onClick=${() => go('detail', { kind: 'device', id: null })}>Add device<//>`}
      columns=${withOptics ? [...columns, 'Offset'] : columns}
      rows=${rows}
      renderRow=${d => html`
        <${TableRow} key=${d.kind + d.id} hover data-device=${d.id} data-kind=${d.kind} sx=${{ cursor: 'pointer' }} onClick=${() => open(d)}>
          <${TableCell}>${d.name}<//>
          <${TableCell}>${d.id}<//>
          <${TableCell}><${TypeCell} type=${d.type} /><//>
          <${TableCell}>${d.version}<//>
          <${TableCell}><${StatusChip} status=${d.status} /><//>
          <${TableCell}>${d.net}<//>
          <${TableCell}>${d.station || '-'}<//>
          <${TableCell} sx=${{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>${d.zone || '-'}<//>
          ${withOptics ? html`<${TableCell} data-offset>${d.kind === 'optic' ? d.offset : '–'}<//>` : null}
          ${rowActions(d.name, () => toast('Device URL copied'), () => open(d), () => askDelete(d.kind, d.id))}
        <//>`} />`;
}

/* ══ Details page — an optic (both options) or any other device ══════
   Option 1: an optic lives under "Optics list"; its page says "optic".
   Option 2: an optic is a device of type Optic; the page is Device details,
   and picking the type on a new device swaps the cards. */
function Detail() {
  const { go, target, variant, toast, bump, askDelete } = useApp();
  const inDevices = variant === 2 || target.kind === 'device';
  const src = target.id == null ? null
    : target.kind === 'optic' ? OPTICS.find(o => o.id === target.id) : DEVICES.find(d => d.id === target.id);
  const isNew = !src;
  const [d, setD] = useState(() => src
    ? (target.kind === 'optic' ? { ...src, type: OPTIC } : { ...src })
    : { type: target.kind === 'optic' ? OPTIC : '', name: '', id: '', version: '', net: '', net2: '',
        station: '', platform: '', track: '', offset: '0:00' });
  const [errs, setErrs] = useState({});
  const set = patch => { setD(p => ({ ...p, ...patch })); setErrs({}); };
  const isOptic = d.type === OPTIC;
  const noun = inDevices ? 'device' : 'optic';
  const Noun = inDevices ? 'Device' : 'Optic';
  const offErr = isOptic ? offsetError(d.offset) : '';

  const listScreen = inDevices ? 'devices' : 'optics';
  const idTaken = id => [...OPTICS, ...DEVICES].some(x => x.id.toLowerCase() === id.toLowerCase());

  const save = () => {
    const e = {};
    const id = d.id.trim();
    if (isNew) {
      if (!id) e.id = (isOptic ? 'Optic ID' : 'Device ID') + ' is required';
      else if (idTaken(id)) e.id = 'This ID already exists';
      if (inDevices && !d.type) e.type = 'Device Type is required';
    }
    if (isOptic) {
      if (isNew && !d.station) e.station = 'Station is required';
      if (isNew && !String(d.platform).trim()) e.platform = 'Platform is required';
      if (offErr) e.offset = offErr;
    } else {
      if (!d.name.trim()) e.name = 'Device Name is required';
      if (!d.net.trim()) e.net = 'Network Address (Primary) is required';
    }
    if (Object.keys(e).length) { setErrs(e); return; }
    const offset = isOptic ? fmtSec(toSec(d.offset)) : '';
    if (isOptic) {
      if (src) src.offset = offset;
      else OPTICS.push({ id, station: d.station, platform: String(d.platform).trim(), track: d.track.trim(), offset, status: 'Active' });
    } else {
      const out = { name: d.name.trim(), type: d.type, version: d.version.trim() || '-', net: d.net.trim(), net2: d.net2.trim() };
      if (src) Object.assign(src, out);
      else DEVICES.push({ ...out, id, status: 'Active', station: '', zone: '' });
    }
    bump(); go(listScreen);
    toast(isNew ? `${isOptic ? 'Optic' : 'Device'} ${id} created` : `${isOptic ? 'Optic' : 'Device'} saved`);
  };

  const title = isNew ? (inDevices ? 'New device' : 'New optic') : (isOptic ? src.id : src.name);
  const crumbs = [{ label: inDevices ? 'Devices' : 'Optics list', onClick: () => go(listScreen) },
                  { label: isNew ? (inDevices ? 'New device' : 'New optic') : `${Noun} details` }];
  const types = variant === 2 ? [...DEVICE_TYPES, OPTIC] : DEVICE_TYPES;
  const typeSelect = html`
    <${FilterSelect} id="dd-type" label="Device Type" required value=${d.type} minWidth=${0}
      disabled=${!isNew && isOptic} error=${errs.type} helperText=${errs.type}
      onChange=${v => set({ type: v })}
      options=${(isNew || isOptic ? types : DEVICE_TYPES).map(t => ({ value: t, label: t }))} />`;

  return html`
    <${Box}>
      <${PageHeader} crumbs=${crumbs} title=${title} titleId="dd-title"
        action=${html`
          ${src ? html`
            <${Button} variant="outlined" color="error" id="dd-del" startIcon=${html`<${Icon}>delete<//>`}
              onClick=${() => askDelete(target.kind, src.id, () => go(listScreen))}>Delete ${noun}<//>
            <${Button} variant="outlined" id="dd-copy" startIcon=${html`<${Icon}>content_copy<//>`}
              onClick=${() => toast(`${Noun} URL copied`)}>Copy ${noun} URL<//>` : null}
          <${Button} variant="contained" id="dd-save" disabled=${!!offErr} onClick=${save}>Save<//>`} />

      <${SectionCard} title="General" id="card-general">
        <${FieldGrid}>
          ${isOptic ? html`
            <${TextField} id="dd-id" label=${inDevices ? 'Device ID' : 'Optic ID'} required value=${d.id} disabled=${!isNew}
              placeholder="e.g. HA2 14T87" error=${!!errs.id}
              helperText=${errs.id || (inDevices ? 'The Optic ID from FMSILA. It is also the device name.' : '')}
              onChange=${e => set({ id: e.target.value })} />
            ${inDevices ? typeSelect : null}` : html`
            <${TextField} id="dd-name" label="Device Name" required value=${d.name} error=${!!errs.name} helperText=${errs.name || ''}
              onChange=${e => set({ name: e.target.value })} />
            <${TextField} id="dd-id" label="Device ID" required value=${d.id} disabled=${!isNew} error=${!!errs.id} helperText=${errs.id || ''}
              onChange=${e => set({ id: e.target.value })} />
            ${typeSelect}
            <${TextField} id="dd-version" label="Version" value=${d.version === '-' ? '' : d.version}
              onChange=${e => set({ version: e.target.value })} />`}
        <//>
      <//>

      ${isOptic ? html`
        <${SectionCard} title="Location" id="card-location"
          note=${isNew ? 'Enter it by hand for a new optic. The FMSILA.XML import keeps it up to date from then on.'
                       : `View only. Imported from FMSILA.XML — last import ${LAST_IMPORT}.`}>
          <${FieldGrid}>
            <${FilterSelect} id="dd-station" label="Station" required value=${d.station} minWidth=${0} disabled=${!isNew}
              error=${errs.station} helperText=${errs.station}
              onChange=${v => set({ station: v })} options=${STATIONS.map(s => ({ value: s.code, label: stationLabel(s.code) }))} />
            <${TextField} id="dd-platform" label="Platform" required=${isNew} value=${d.platform} disabled=${!isNew}
              error=${!!errs.platform} helperText=${errs.platform || ''} onChange=${e => set({ platform: e.target.value })} />
            <${TextField} id="dd-track" label="Aramis track" value=${d.track} disabled=${!isNew}
              onChange=${e => set({ track: e.target.value })} />
          <//>
        <//>
        <${SectionCard} title="Offset" id="card-offset">
          <${Box} sx=${{ maxWidth: 320 }}>
            <${TextField} id="dd-offset" label="Offset" value=${d.offset} placeholder="m:ss" fullWidth
              error=${!!offErr}
              helperText=${offErr || 'How long after the train triggers this optic the message is shown. One value for this optic, sent to the announcement platform.'}
              onChange=${e => set({ offset: e.target.value })} />
          <//>
        <//>` : html`
        <${SectionCard} title="Hardware" id="card-hardware">
          <${FieldGrid} cols=${3}>
            <${TextField} id="dd-net" label="Network Address (Primary)" required value=${d.net === '-' ? '' : d.net}
              error=${!!errs.net} helperText=${errs.net || ''} onChange=${e => set({ net: e.target.value })} />
            <${TextField} id="dd-net2" label="Network Address (Secondary)" value=${d.net2} onChange=${e => set({ net2: e.target.value })} />
          <//>
        <//>
        <${SectionCard} title="Location" id="card-location"
          note=${html`View only. You can apply location in <${Typography} component="span" variant="body2" color="primary">Station details<//>.`}>
          <${FieldGrid} cols=${3}>
            <${TextField} label="Station" value=${d.station ? stationLabel(d.station) : ''} disabled />
            <${TextField} label="Output zone" value=${d.zone || ''} disabled />
          <//>
        <//>`}
    <//>`;
}

/* ══ Dialog: upload optics ════════════════════════════════════════════
   Ignat, 09-28: no real upload logic — a popup that closes on UPLOAD, to
   show the logic. The file is a stand-in and the preview a fixed sample. */
const UPLOAD_SAMPLE = [
  { kind: 'new', icon: 'add_circle_outline', color: 'success.main', title: '1 new optic',
    lines: ['HA6 131130 — station 1220, platform 3, track 31. Offset starts at 0:00.'] },
  { kind: 'changed', icon: 'sync', color: 'primary.main', title: '1 optic changed',
    lines: ['HA6 131121 — Aramis track 21 → 22'] },
  { kind: 'unchanged', icon: 'check_circle_outline', color: 'text.secondary', title: '3 optics unchanged', lines: [] },
  { kind: 'missing', icon: 'help_outline', color: 'text.secondary', title: '2 optics not in the file',
    lines: ['HA2 14T87, HA2 24T45 — kept. Nothing is deleted.'] },
  { kind: 'skipped', icon: 'error_outline', color: 'error.main', title: '1 row skipped',
    lines: ['Line 42 — unknown station 9999'] },
];

function UploadDialog({ onClose }) {
  const { toast } = useApp();
  const [file, setFile] = useState(null);
  return html`
    <${Dialog} open=${true} onClose=${onClose} maxWidth="sm" fullWidth PaperProps=${{ id: 'up-dialog' }}>
      <${DialogTitle}>Upload optics<//>
      <${DialogContent}>
        <${DialogContentText} sx=${{ mb: 2, fontSize: 14 }}>
          Upload FMSILA.XML to update each optic's station, platform and Aramis track. Offsets are set here and never overwritten.
        <//>
        ${file ? html`
          <${Paper} variant="outlined" id="up-file" sx=${{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1, mb: 2, borderColor: '#E7E7E7' }}>
            <${Icon} sx=${{ color: 'text.secondary' }}>description<//>
            <${Box} sx=${{ flex: 1 }}>
              <${Typography} variant="body2" sx=${{ fontWeight: 500 }}>${file}<//>
              <${Typography} variant="caption" color="text.secondary">5 optics read · 1 row skipped<//>
            <//>
            <${IconButton} aria-label="Remove file" onClick=${() => setFile(null)}><${Icon}>close<//><//>
          <//>
          <${Typography} variant="subtitle2" sx=${{ mb: 1 }}>What will change<//>
          <${Stack} spacing=${1.25} id="up-preview">
            ${UPLOAD_SAMPLE.map(g => html`
              <${Box} key=${g.kind} data-up=${g.kind} sx=${{ display: 'flex', gap: 1.5 }}>
                <${Icon} sx=${{ color: g.color }}>${g.icon}<//>
                <${Box}>
                  <${Typography} variant="body2" sx=${{ fontWeight: 500 }}>${g.title}<//>
                  ${g.lines.map((l, k) => html`<${Typography} key=${k} variant="body2" color="text.secondary">${l}<//>`)}
                <//>
              <//>`)}
          <//>` : html`
          <${Box} id="up-drop" sx=${{ border: '1px dashed rgba(0,0,0,.23)', borderRadius: 1, py: 4, px: 2, textAlign: 'center', bgcolor: '#FAFAFA' }}>
            <${Icon} sx=${{ fontSize: 36, color: 'text.secondary' }}>upload_file<//>
            <${Typography} variant="body2" sx=${{ mt: 1, mb: 1.5 }}>Drag FMSILA.XML here, or<//>
            <${Button} variant="outlined" id="up-choose" onClick=${() => setFile('FMSILA.XML')}>Choose file<//>
            <${Typography} variant="caption" color="text.secondary" sx=${{ display: 'block', mt: 1.5 }}>XML only. The periodic import keeps running as well — last import ${LAST_IMPORT}.<//>
          <//>`}
      <//>
      <${DialogActions} sx=${{ px: 3, pb: 2 }}>
        <${Button} onClick=${onClose}>Cancel<//>
        <${Button} variant="contained" id="up-go" disabled=${!file} startIcon=${html`<${Icon}>upload<//>`}
          onClick=${() => { onClose(); toast(`${file} uploaded`); }}>Upload<//>
      <//>
    <//>`;
}

/* ══ Root ═════════════════════════════════════════════════════════════ */
function Root() {
  const [variant, setVariantRaw] = useState(1);
  const [screen, setScreen] = useState('optics');
  const [target, setTarget] = useState(null);
  const [rev, setRev] = useState(0);
  const [toastMsg, setToastMsg] = useState('');
  const [del, setDel] = useState(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  const bump = useCallback(() => setRev(x => x + 1), []);
  const go = useCallback((s, t) => { setScreen(s); setTarget(t || null); window.scrollTo(0, 0); }, []);
  const setVariant = n => { setVariantRaw(n); go(n === 1 ? 'optics' : 'devices'); };

  const askDelete = (kind, id, after) => setDel({ kind, id, after });
  const doDelete = () => {
    const arr = del.kind === 'optic' ? OPTICS : DEVICES;
    const i = arr.findIndex(x => x.id === del.id);
    if (i >= 0) arr.splice(i, 1);
    const after = del.after; setDel(null); bump(); setToastMsg(del.kind === 'optic' ? 'Optic deleted' : 'Device deleted'); if (after) after();
  };

  const value = { variant, setVariant, screen, target, go, rev, bump, toast: setToastMsg, askDelete,
                  openUpload: () => setUploadOpen(true) };
  const View = screen === 'detail' ? Detail : screen === 'devices' ? DeviceList : OpticsList;
  const delNoun = del && (del.kind === 'optic' && variant === 1 ? 'optic' : 'device');

  return html`
    <${ThemeProvider} theme=${theme}>
      <${CssBaseline} />
      <${App.Provider} value=${value}>
        <${VariantSwitch} />
        <${Box} sx=${{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 44px)' }}>
          <${TopBar} />
          <${Box} sx=${{ display: 'flex', flex: 1, minHeight: 0 }}>
            <${Rail} />
            <${Box} component="main" data-screen=${screen} data-variant=${variant} sx=${{ flex: 1, minWidth: 0, px: 3, py: 2.5, bgcolor: '#fff' }}>
              <${View} key=${variant + ':' + screen + ':' + (target ? target.kind + target.id : '')} />
            <//>
          <//>
        <//>
        ${uploadOpen ? html`<${UploadDialog} onClose=${() => setUploadOpen(false)} />` : null}
        <${Dialog} open=${!!del} onClose=${() => setDel(null)}>
          <${DialogTitle}>Delete ${delNoun} ${del ? del.id : ''}?<//>
          <${DialogContent}><${DialogContentText}>This cannot be undone.<//><//>
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
