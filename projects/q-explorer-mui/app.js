/* ════════════════════════════════════════════════════════════════════
   Q-Explorer — React 18 + MUI v5.

   Ignat approved the full port 2026-09-15 ("It looks great. Time to apply
   it to the whole prototype"). This file is the foundation the remaining
   views slot into: i18n, routing, the app shell, and the theme.

   The theme carries MUI v5 defaults plus exactly four deviations measured
   off ETC's own screenshots (scripts/sample-etc-screenshots.cjs), and
   Ignat's spec as defaultProps. Nothing here is a guess.
   ════════════════════════════════════════════════════════════════════ */
const { useState, useMemo, useContext, createContext } = React;
const html = htm.bind(React.createElement);
const M = MaterialUI;
const {
  ThemeProvider, createTheme, CssBaseline, AppBar, Toolbar, Box, Button, IconButton,
  Typography, Menu, MenuItem, Breadcrumbs, Link, Card, CardContent, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip,
  Stack, FormControl, InputLabel, Select, InputAdornment, Alert, Tooltip,
} = M;

const Icon = ({ children, sx }) =>
  html`<span className="material-icons" style=${{ fontSize: 20, ...(sx || {}) }}>${children}</span>`;

/* ── i18n ─────────────────────────────────────────────────────────────
   The 462 EN + 462 DE strings are lifted verbatim from the vanilla
   prototype (i18n.js). Re-translating them would have been a way to
   introduce drift for no benefit. */
const I18n = createContext({ t: k => k, lang: 'en', setLang: () => {} });
const useT = () => useContext(I18n);

const NAVY = '#1C2848';

const theme = createTheme({
  palette: {
    primary: { main: '#2196F3', dark: '#1769AA', light: '#64B5F6' },
    background: { default: '#FAFAFA' },
  },
  shape: { borderRadius: 4 },
  components: {
    // Ignat, 2026-09-14: "We usually use small. Buttons without shadows."
    MuiButton:      { defaultProps: { size: 'small', disableElevation: true } },
    MuiIconButton:  { defaultProps: { size: 'small' } },
    MuiTextField:   { defaultProps: { size: 'small', variant: 'filled' } },
    MuiFormControl: { defaultProps: { size: 'small', variant: 'filled' } },
    MuiTable:       { defaultProps: { size: 'small' } },
    MuiAppBar:      { defaultProps: { elevation: 0 } },
    MuiToolbar:     { defaultProps: { variant: 'dense' } },
    // measured: TableHead carries a band; MUI's own is transparent
    MuiTableHead:   { styleOverrides: { root: { backgroundColor: '#F4F4F4' } } },
    // measured: cards are a 1px #E7E7E7 hairline, no shadow
    MuiCard:        { defaultProps: { variant: 'outlined' },
                      styleOverrides: { root: { borderColor: '#E7E7E7' } } },
    // measured: the selected menu row is primary 12%, not action.selected grey
    MuiMenuItem:    { styleOverrides: { root: {
                        '&.Mui-selected': { backgroundColor: 'rgba(33,150,243,0.12)' },
                        '&.Mui-selected:hover': { backgroundColor: 'rgba(33,150,243,0.12)' },
                      } } },
  },
});

const TYPE_KEYS = ['punctuality', 'raw_data', 'data_quality', 'connection', 'trip_failures', 'line_analysis'];

const ROWS = [
  { group: 'punctuality', name: 'Pünktlichkeit – Letzte 7 Tage, Solothurn', period: '19.05–25.05.2026', created: '25.05.2026', status: 'in_progress' },
  { group: 'punctuality', name: 'Pünktlichkeit – Letzter Monat, alle TU',   period: '01.04–30.04.2026', created: '03.05.2026', status: 'done' },
  { group: 'punctuality', name: 'Pünktlichkeit – Letzte 30 Tage, Bern',     period: '26.04–25.05.2026', created: '26.05.2026', status: 'done' },
  { group: 'punctuality', name: 'Pünktlichkeit – Aktuelles Jahr, Zürich',   period: '01.01–26.05.2026', created: '24.05.2026', status: 'failed', note: 'Data source was unreachable' },
  { group: 'raw_data',    name: 'Rohdaten Export – Gestern',                period: '24.05.2026',       created: '25.05.2026', status: 'done' },
  { group: 'raw_data',    name: 'Rohdaten Export – SBB Vollexport',         period: '01.05–23.05.2026', created: '25.05.2026', status: 'in_progress' },
  { group: 'raw_data',    name: 'Rohdaten Export – Letzte Woche',           period: '11.05–17.05.2026', created: '20.05.2026', status: 'done' },
  { group: 'trip_failures', name: 'Fahrtausfälle – Letzter Monat, alle Linien', period: '01.04–30.04.2026', created: '02.05.2026', status: 'done' },
  { group: 'data_quality',  name: 'DQI – Aktuelles Quartal',                period: '01.04–30.06.2026', created: '01.07.2026', status: 'done' },
];

const SCHEDULES = [
  { name: 'Pünktlichkeit – wöchentlich', type: 'punctuality',   freq: 'weekly',  next: '01.06.2026 06:00', status: 'active' },
  { name: 'Rohdaten – täglich',          type: 'raw_data',      freq: 'daily',   next: '26.05.2026 06:00', status: 'active' },
  { name: 'Fahrtausfälle – monatlich',   type: 'trip_failures', freq: 'monthly', next: '01.06.2026 07:00', status: 'paused' },
];

const STATUS_COLOUR = { done: 'success', in_progress: 'warning', failed: 'error', active: 'success', paused: 'default' };
const STATUS_KEY = { done: 'filter_done', in_progress: 'filter_in_progress', failed: 'filter_failed' };

/* ── A filter select. No All option — an empty value IS all, the label
      names the field, and the ✕ clears it. Ignat, 2026-09-15. ───────── */
function FilterSelect({ label, value, onChange, options, minWidth = 180, id }) {
  return html`
    <${FormControl} sx=${{ minWidth }} id=${id}>
      <${InputLabel}>${label}<//>
      <${Select} value=${value} label=${label} onChange=${e => onChange(e.target.value)}
        endAdornment=${value ? html`
          <${InputAdornment} position="end" sx=${{ mr: 3 }}>
            <${IconButton} aria-label=${'Clear ' + label} onClick=${() => onChange('')}>
              <${Icon} sx=${{ fontSize: 18 }}>close<//>
            <//>
          <//>` : null}>
        ${options.map(o => html`<${MenuItem} key=${o.value} value=${o.value}>${o.label}<//>`)}
      <//>
    <//>`;
}

/* ── Page header: breadcrumb, title, action in the corner ─────────── */
function PageHeader({ crumbs, title, subtitle, action }) {
  return html`
    <${Box} sx=${{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                    px: 3, py: 2.5, bgcolor: '#fff', borderBottom: '1px solid #E7E7E7' }}>
      <${Box}>
        ${crumbs && html`
          <${Breadcrumbs} separator=${html`<${Icon} sx=${{ fontSize: 16 }}>chevron_right<//>`} sx=${{ mb: .5 }}>
            ${crumbs.map((c, i) => c.onClick
              ? html`<${Link} key=${i} underline="hover" color="text.secondary" href="#"
                              onClick=${e => { e.preventDefault(); c.onClick(); }}>${c.label}<//>`
              : html`<${Typography} key=${i} color="text.primary" variant="body2">${c.label}<//>`)}
          <//>`}
        <${Typography} variant="h5">${title}<//>
        ${subtitle && html`<${Typography} variant="body2" color="text.secondary">${subtitle}<//>`}
      <//>
      <${Box}>${action}<//>
    <//>`;
}

/* ── Screen: Evaluations ──────────────────────────────────────────── */
function EvaluationsList({ go }) {
  const { t } = useT();
  const [status, setStatus] = useState('');
  const [period, setPeriod] = useState('');
  const [q, setQ] = useState('');

  const rows = useMemo(() => ROWS.filter(r =>
    (!status || r.status === status) &&
    (!q || r.name.toLowerCase().includes(q.toLowerCase()))), [status, q]);
  const groups = [...new Set(rows.map(r => r.group))];

  return html`
    <${Box}>
      <${PageHeader} title=${t('page_evaluations')}
        subtitle=${`${rows.length} ${t('nav_evaluations').toLowerCase()}`}
        action=${html`<${Button} variant="contained" id="new-eval-btn"
                        startIcon=${html`<${Icon} sx=${{ fontSize: 18 }}>add<//>`}
                        onClick=${() => go('new')}>${t('btn_new_eval')}<//>`} />

      <${Box} sx=${{ p: 3 }}>
        <${Stack} direction="row" spacing=${2} sx=${{ mb: 3 }}>
          <${TextField} label=${t('search_placeholder')} value=${q}
            onChange=${e => setQ(e.target.value)} sx=${{ minWidth: 280 }} id="f-search" />
          <${FilterSelect} id="f-status" label=${t('sel_status')} value=${status} onChange=${setStatus}
            options=${['done', 'in_progress', 'failed'].map(s => ({ value: s, label: t(STATUS_KEY[s]) }))} />
          <${FilterSelect} id="f-period" label=${t('sel_period')} value=${period} onChange=${setPeriod}
            options=${['last_7', 'cur_month', 'last_month', 'last_year']
              .map(p => ({ value: p, label: t('preset_' + p) }))} />
        <//>

        ${rows.length === 0 && html`
          <${Alert} severity="info" id="empty-state">${t('no_results')}<//>`}

        ${groups.map(g => html`
          <${Box} key=${g} sx=${{ mb: 4 }}>
            <${Typography} variant="subtitle2" sx=${{ mb: 1, textTransform: 'uppercase',
                             color: 'text.secondary', letterSpacing: '.08em' }}>
              ${t('type_' + g)} · ${rows.filter(r => r.group === g).length}
            <//>
            <${TableContainer} component=${Paper} variant="outlined" sx=${{ borderColor: '#E7E7E7' }}>
              <${Table}>
                <${TableHead}>
                  <${TableRow}>
                    <${TableCell}>${t('col_name')}<//>
                    <${TableCell}>${t('col_period')}<//>
                    <${TableCell}>${t('col_created')}<//>
                    <${TableCell}>${t('col_status')}<//>
                    <${TableCell} align="right">${t('col_actions')}<//>
                  <//>
                <//>
                <${TableBody}>
                  ${rows.filter(r => r.group === g).map(r => html`
                    <${TableRow} key=${r.name} hover>
                      <${TableCell}>
                        <${Link} href="#" underline="hover"
                          onClick=${e => { e.preventDefault(); go('report', r); }}>${r.name}<//>
                        ${r.note && html`<${Typography} variant="caption" color="error" display="block">${r.note}<//>`}
                      <//>
                      <${TableCell}>${r.period}<//>
                      <${TableCell}>${r.created}<//>
                      <${TableCell}>
                        <${Chip} size="small" variant="outlined"
                                 label=${t(STATUS_KEY[r.status])} color=${STATUS_COLOUR[r.status]} />
                      <//>
                      <${TableCell} align="right">
                        <${Tooltip} title=${t('rpt_action_chart') || 'View'}>
                          <${IconButton} aria-label="view" onClick=${() => go('report', r)}>
                            <${Icon}>visibility<//>
                          <//>
                        <//>
                        <${Tooltip} title=${t('btn_delete') || 'Delete'}>
                          <${IconButton} aria-label="delete"><${Icon}>delete_outline<//><//>
                        <//>
                      <//>
                    <//>`)}
                <//>
              <//>
            <//>
          <//>`)}
      <//>
    <//>`;
}

/* ── Screen: Scheduled reports ────────────────────────────────────── */
function ScheduledReports({ go }) {
  const { t } = useT();
  const [freq, setFreq] = useState('');
  const rows = SCHEDULES.filter(s => !freq || s.freq === freq);

  return html`
    <${Box}>
      <${PageHeader} title=${t('page_scheduled')}
        subtitle=${`${rows.length} ${t('scheduled_subtitle') ? '' : ''}`.trim() || undefined}
        action=${html`<${Button} variant="contained"
                        startIcon=${html`<${Icon} sx=${{ fontSize: 18 }}>add<//>`}
                        onClick=${() => go('new')}>${t('btn_schedule')}<//>`} />
      <${Box} sx=${{ p: 3 }}>
        <${Stack} direction="row" spacing=${2} sx=${{ mb: 3 }}>
          <${FilterSelect} id="f-freq" label=${t('sel_frequency')} value=${freq} onChange=${setFreq}
            options=${['daily', 'weekly', 'monthly'].map(f => ({ value: f, label: t('freq_' + f) }))} />
        <//>
        <${TableContainer} component=${Paper} variant="outlined" sx=${{ borderColor: '#E7E7E7' }}>
          <${Table}>
            <${TableHead}>
              <${TableRow}>
                <${TableCell}>${t('col_name')}<//>
                <${TableCell}>${t('sel_eval_type')}<//>
                <${TableCell}>${t('sel_frequency')}<//>
                <${TableCell}>${t('col_next_run')}<//>
                <${TableCell}>${t('col_status')}<//>
                <${TableCell} align="right">${t('col_actions')}<//>
              <//>
            <//>
            <${TableBody}>
              ${rows.map(s => html`
                <${TableRow} key=${s.name} hover>
                  <${TableCell}><${Link} href="#" underline="hover"
                    onClick=${e => e.preventDefault()}>${s.name}<//><//>
                  <${TableCell}>${t('type_' + s.type)}<//>
                  <${TableCell}>${t('freq_' + s.freq)}<//>
                  <${TableCell}>${s.next}<//>
                  <${TableCell}>
                    <${Chip} size="small" variant="outlined" label=${s.status}
                             color=${STATUS_COLOUR[s.status]} />
                  <//>
                  <${TableCell} align="right">
                    <${IconButton} aria-label="edit"><${Icon}>edit<//><//>
                    <${IconButton} aria-label="delete"><${Icon}>delete_outline<//><//>
                  <//>
                <//>`)}
            <//>
          <//>
        <//>
      <//>
    <//>`;
}

/* ── Screen: New evaluation ───────────────────────────────────────── */
function NewEvaluation({ go }) {
  const { t } = useT();
  const [type, setType] = useState('');
  const [name, setName] = useState('');
  const [touched, setTouched] = useState(false);
  const locked = !type;
  const nameError = touched && !name.trim();

  return html`
    <${Box}>
      <${PageHeader}
        crumbs=${[{ label: t('nav_evaluations'), onClick: () => go('list') }, { label: t('new_eval_title') }]}
        title=${t('new_eval_title')}
        action=${html`<${Button} variant="contained" id="run-btn" disabled=${locked}
                        startIcon=${html`<${Icon} sx=${{ fontSize: 18 }}>play_arrow<//>`}
                        onClick=${() => setTouched(true)}>${t('btn_run_now')}<//>`} />

      <${Box} sx=${{ p: 3, maxWidth: 1100 }}>
        <${Card} sx=${{ mb: 3 }}>
          <${CardContent}>
            <${Stack} direction="row" spacing=${2}>
              <${TextField} required label=${t('label_eval_name')} sx=${{ flex: 1 }}
                id="eval-name" value=${name} error=${nameError}
                helperText=${nameError ? t('err_name_required') : ' '}
                onChange=${e => setName(e.target.value)} />
              <${FormControl} required sx=${{ flex: 1 }}>
                <${InputLabel}>${t('sel_eval_type')}<//>
                <${Select} id="eval-type" value=${type} label=${t('sel_eval_type')}
                           onChange=${e => setType(e.target.value)}>
                  ${TYPE_KEYS.map(k => html`<${MenuItem} key=${k} value=${k}>${t('type_' + k)}<//>`)}
                <//>
              <//>
            <//>
          <//>
        <//>

        <${Box} id="needs-type" sx=${{ opacity: locked ? .5 : 1, pointerEvents: locked ? 'none' : 'auto' }}>
          <${Card} sx=${{ mb: 3 }}>
            <${CardContent}>
              <${Typography} variant="h6" gutterBottom>${t('step_time_period')}<//>
              <${Typography} variant="body2" color="text.secondary" sx=${{ mb: 2 }}>
                ${locked ? t('hint_pick_type_first') : t('step1_subtitle')}
              <//>
              <${Stack} direction="row" spacing=${1} sx=${{ mb: 2 }}>
                ${['last_7', 'cur_month', 'last_month', 'last_year', 'custom'].map((p, i) =>
                  html`<${Chip} key=${p} label=${t('preset_' + p)} clickable
                                color=${i === 1 ? 'primary' : 'default'}
                                variant=${i === 1 ? 'filled' : 'outlined'} />`)}
              <//>
              <${Stack} direction="row" spacing=${2}>
                <${TextField} label=${t('label_from')} type="date" InputLabelProps=${{ shrink: true }} />
                <${TextField} label=${t('label_to')} type="date" InputLabelProps=${{ shrink: true }} />
              <//>
            <//>
          <//>

          <${Card}>
            <${CardContent}>
              <${Typography} variant="h6" gutterBottom>${t('step_scope')}<//>
              <${Typography} variant="body2" color="text.secondary" sx=${{ mb: 2 }}>
                ${t('step2_subtitle')}
              <//>
              <${Stack} direction="row" spacing=${2} flexWrap="wrap" useFlexGap>
                ${[['filter_transport_assoc', 'rpv'], ['filter_tu', 'tu'],
                   ['chip_cantons', 'canton'], ['filter_lines', 'line'], ['filter_stops', 'stop']]
                  .map(([k, id]) => html`
                    <${FormControl} key=${id} sx=${{ minWidth: 200 }}>
                      <${InputLabel}>${t(k)}<//>
                      <${Select} label=${t(k)} value="">
                        <${MenuItem} value="a">SBB<//>
                        <${MenuItem} value="b">BLS<//>
                      <//>
                    <//>`)}
              <//>
            <//>
          <//>
        <//>
      <//>
    <//>`;
}

/* ── Screen: a report view that has not been ported yet ───────────── */
function NotPorted({ go, row }) {
  const { t } = useT();
  return html`
    <${Box}>
      <${PageHeader}
        crumbs=${[{ label: t('nav_evaluations'), onClick: () => go('list') },
                  { label: row ? row.name : t('page_evaluations') }]}
        title=${row ? row.name : ''} />
      <${Box} sx=${{ p: 3, maxWidth: 800 }}>
        <${Alert} severity="info" id="not-ported">
          This report view has not been ported to React + MUI yet. It is live in
          the vanilla prototype; the port is running view by view.
        <//>
      <//>
    <//>`;
}

/* ── Shell ────────────────────────────────────────────────────────── */
function TopBar({ go }) {
  const { t, lang, setLang } = useT();
  const [anchor, setAnchor] = useState(null);
  const [langAnchor, setLangAnchor] = useState(null);
  return html`
    <${AppBar} position="static" sx=${{ bgcolor: NAVY }}>
      <${Toolbar} sx=${{ gap: 0.5 }}>
        <${Box} sx=${{ width: 24, height: 24, bgcolor: '#E30613', color: '#fff', mr: 3,
                        display: 'grid', placeItems: 'center', borderRadius: '2px',
                        fontWeight: 700, fontSize: 16, lineHeight: 1 }}>+<//>
        <${Button} color="inherit" sx=${{ opacity: .75 }}>Startseite<//>
        <${Button} color="inherit" id="qx-nav-trigger" aria-haspopup="menu"
                   onClick=${e => setAnchor(e.currentTarget)}
                   endIcon=${html`<${Icon}>expand_more<//>`}
                   sx=${{ borderBottom: '2px solid #fff', borderRadius: 0 }}>Q-Explorer<//>
        <${Menu} anchorEl=${anchor} open=${!!anchor} onClose=${() => setAnchor(null)}
                 anchorOrigin=${{ vertical: 'bottom', horizontal: 'left' }}
                 transformOrigin=${{ vertical: 'top', horizontal: 'left' }}>
          <${MenuItem} onClick=${() => { setAnchor(null); go('list'); }}>${t('nav_evaluations')}<//>
          <${MenuItem} onClick=${() => { setAnchor(null); go('scheduled'); }}>${t('nav_scheduled')}<//>
        <//>
        <${Button} color="inherit" sx=${{ opacity: .75 }}>Q.Reports<//>
        <${Button} color="inherit" sx=${{ opacity: .75 }}>Fotoalbum<//>
        <${Button} color="inherit" sx=${{ opacity: .75 }}>Q-Messungen<//>
        <${Box} sx=${{ flex: 1 }} />
        <${Button} color="inherit" variant="outlined" id="lang-trigger"
                   onClick=${e => setLangAnchor(e.currentTarget)}
                   sx=${{ borderColor: 'rgba(255,255,255,.4)' }}>${lang.toUpperCase()}<//>
        <${Menu} anchorEl=${langAnchor} open=${!!langAnchor} onClose=${() => setLangAnchor(null)}>
          ${['en', 'de'].map(l => html`
            <${MenuItem} key=${l} selected=${l === lang}
              onClick=${() => { setLang(l); setLangAnchor(null); }}>${l.toUpperCase()}<//>`)}
        <//>
        <${Button} color="inherit" startIcon=${html`<${Icon}>logout<//>`}>${t('btn_logout')}<//>
      <//>
    <//>`;
}

function App() {
  const [lang, setLang] = useState('de');
  const [route, setRoute] = useState({ name: 'list' });
  const t = useMemo(() => k => (translations[lang] || translations.en)[k] || k, [lang]);
  const go = (name, row) => setRoute({ name, row });

  const screen =
    route.name === 'list'      ? html`<${EvaluationsList} go=${go} />` :
    route.name === 'scheduled' ? html`<${ScheduledReports} go=${go} />` :
    route.name === 'new'       ? html`<${NewEvaluation} go=${go} />` :
                                 html`<${NotPorted} go=${go} row=${route.row} />`;

  return html`
    <${I18n.Provider} value=${{ t, lang, setLang }}>
      <${ThemeProvider} theme=${theme}>
        <${CssBaseline} />
        <${Box} sx=${{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 36px)' }}>
          <${TopBar} go=${go} />
          <${Box} sx=${{ flex: 1 }}>${screen}<//>
          <${Box} component="footer" sx=${{ display: 'flex', justifyContent: 'flex-end', gap: 1,
                   px: 3, py: .5, bgcolor: '#fff', borderTop: '1px solid #E7E7E7' }}>
            ${['util_impressum', 'util_dokumente', 'util_support', 'util_kontakt'].map(k =>
              html`<${Button} key=${k} size="small" color="inherit"
                              sx=${{ color: 'text.secondary', fontSize: 12 }}>${t(k)}<//>`)}
          <//>
        <//>
      <//>
    <//>`;
}

ReactDOM.createRoot(document.getElementById('root')).render(html`<${App} />`);
