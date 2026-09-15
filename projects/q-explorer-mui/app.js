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

/* The evaluations come from data.js, extracted straight out of the vanilla
   prototype (scripts/qx-extract-shared.cjs). Ignat, 2026-09-15: "Now you
   lost almost all logic" — he was right, the first pass retyped a handful
   of sample rows. Nothing here is retyped now; re-run the extractor to
   resync. Schedules are still local: the vanilla builds them in markup
   the same way, and they come across in the next pass. */
const ROWS = EVALUATIONS;

const SCHEDULES = [
  { name: 'Pünktlichkeit – wöchentlich', type: 'punctuality',   freq: 'weekly',  next: '01.06.2026 06:00', status: 'active' },
  { name: 'Rohdaten – täglich',          type: 'raw_data',      freq: 'daily',   next: '26.05.2026 06:00', status: 'active' },
  { name: 'Fahrtausfälle – monatlich',   type: 'trip_failures', freq: 'monthly', next: '01.06.2026 07:00', status: 'paused' },
];

// The real data carries a `running` status my invented sample rows never had —
// which is exactly the kind of gap retyping data hides.
const STATUS_COLOUR = { done: 'success', in_progress: 'warning', running: 'info',
                        failed: 'error', active: 'success', paused: 'default' };
const STATUS_KEY = { done: 'status_done', in_progress: 'status_in_progress',
                     running: 'status_running', failed: 'status_failed' };

/**
 * Status options, derived from the data rather than hardcoded.
 *
 * FINDING: the data carries four statuses but only three distinct labels —
 * `status_running` and `status_in_progress` are both "In Progress" /
 * "In Bearbeitung" (3 rows in_progress, 2 running). Offering both would put
 * two identical entries in the menu. They are merged here under the first
 * value, and the duplicate is flagged for Ignat: either they are meant to
 * read differently, or one of them is redundant.
 */
function statusOptions(t) {
  const seen = new Map();
  for (const s of [...new Set(ROWS.map(r => r.status))]) {
    const label = t(STATUS_KEY[s] || s);
    if (!seen.has(label)) seen.set(label, { value: s, label });
  }
  return [...seen.values()];
}

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

  // Matching on the LABEL, not the raw value, so selecting "In Progress"
  // returns the `running` rows too rather than silently dropping them.
  const rows = useMemo(() => ROWS.filter(r =>
    (!status || t(STATUS_KEY[r.status] || r.status) === t(STATUS_KEY[status] || status)) &&
    (!q || r.name.toLowerCase().includes(q.toLowerCase()))), [status, q, t]);
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
            options=${statusOptions(t)} />
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


/* ── Screen: Punctuality DPM report ───────────────────────────────────
   The first of the report views to come across. The breakdown itself is
   NOT reimplemented: punctBuildTree / punctAggregate come from data.js,
   extracted from the vanilla prototype, so the numbers are the same code
   producing them. What is written here is the rendering and the cascade.

   Aufschlüsseln cascade: three levels, each offering only the dimensions
   the levels above have not already taken, and clearing the levels below
   when it changes -- otherwise you can ask for "TU within TU". */
const PUNCT_DIMS = ['betriebstag', 'linienbuendel', 'linie', 'haltestelle',
                    'monat', 'kw', 'tu_konz', 'tu_fahr', 'vm', 'region'];

function fmtInt(n) {
  return (n === null || n === undefined) ? '—' : Math.round(n).toLocaleString('de-CH');
}
function fmtPct(v) {
  return (v === null || v === undefined) ? '—' : v.toFixed(2) + '%';
}

function PunctRow({ node, depth, t }) {
  const [open, setOpen] = useState(depth === 0);
  const kids = node.children || [];
  const pad = 16 + depth * 20;
  return html`
    <${React.Fragment}>
      <${TableRow} hover>
        <${TableCell} sx=${{ pl: `${pad}px` }}>
          ${kids.length > 0 && html`
            <${IconButton} aria-label=${open ? 'collapse' : 'expand'}
                           onClick=${() => setOpen(o => !o)} sx=${{ mr: .5 }}>
              <${Icon} sx=${{ fontSize: 18 }}>${open ? 'expand_more' : 'chevron_right'}<//>
            <//>`}
          ${node.label}
        <//>
        <${TableCell} align="right">${fmtInt(node.agg.soll)}<//>
        <${TableCell} align="right">${fmtInt(node.agg.ist)}<//>
        <${TableCell} align="right">${fmtInt(node.agg.punkt)}<//>
        <${TableCell} align="right">${fmtInt(node.agg.delta)}<//>
        <${TableCell} align="right">
          <${Typography} variant="body2" component="span"
            color=${node.agg.wert === null ? 'text.disabled'
                   : node.agg.wert >= 90 ? 'success.main'
                   : node.agg.wert >= 80 ? 'warning.main' : 'error.main'}>
            ${fmtPct(node.agg.wert)}
          <//>
        <//>
        <${TableCell} align="right">
          <${Tooltip} title=${t('rpt_action_chart')}>
            <${IconButton} aria-label="chart"><${Icon}>bar_chart<//><//>
          <//>
          <${Tooltip} title=${t('rpt_action_raw')}>
            <${IconButton} aria-label="raw"><${Icon}>table_view<//><//>
          <//>
        <//>
      <//>
      ${open && kids.map((k, i) =>
        html`<${PunctRow} key=${k.label + i} node=${k} depth=${depth + 1} t=${t} />`)}
    <//>`;
}

function ReportPunctuality({ go, row }) {
  const { t } = useT();
  const [dims, setDims] = useState(['linienbuendel', '', '']);

  const active = dims.filter(Boolean);
  const tree = useMemo(
    () => punctBuildTree(PUNCT_RECORDS, active.length ? active : ['linienbuendel']),
    [dims.join('|')]);
  const total = useMemo(() => punctAggregate(PUNCT_RECORDS), []);

  // each level offers only what the levels above have not taken
  const setLevel = (i, value) => setDims(d => {
    const next = [...d];
    next[i] = value;
    for (let j = i + 1; j < next.length; j++) next[j] = '';   // clear below
    return next;
  });
  const optionsFor = i => PUNCT_DIMS
    .filter(dim => !dims.some((d, j) => d === dim && j !== i))
    .map(dim => ({ value: dim, label: t(PUNCT_DIM_LABELS[dim] || dim) }));

  return html`
    <${Box}>
      <${PageHeader}
        crumbs=${[{ label: t('nav_evaluations'), onClick: () => go('list') },
                  { label: row ? row.name : t('type_punctuality') }]}
        title=${row ? row.name : t('type_punctuality')}
        subtitle=${t('type_punctuality')}
        action=${html`<${Button} variant="outlined"
                        startIcon=${html`<${Icon} sx=${{ fontSize: 18 }}>download<//>`}>
                        ${t('export_csv')}<//>`} />

      <${Box} sx=${{ p: 3 }}>
        <${Card} sx=${{ mb: 3 }}>
          <${CardContent}>
            <${Typography} variant="subtitle2" sx=${{ mb: 1.5 }}>
              ${t('punct_aufschluss_label')}
            <//>
            <${Stack} direction="row" spacing=${2} flexWrap="wrap" useFlexGap>
              ${[0, 1, 2].map(i => html`
                <${FilterSelect} key=${i} id=${'punct-auf-' + (i + 1)}
                  label=${t(i === 0 ? 'sel_breakdown_1' : i === 1 ? 'sel_breakdown_2' : 'sel_breakdown_3')}
                  value=${dims[i]} onChange=${v => setLevel(i, v)}
                  options=${optionsFor(i)}
                  minWidth=${210} />`)}
            <//>
          <//>
        <//>

        <${TableContainer} component=${Paper} variant="outlined" sx=${{ borderColor: '#E7E7E7' }}>
          <${Table} id="punct-table">
            <${TableHead}>
              <${TableRow}>
                <${TableCell}>${t('rpt_col_name')}<//>
                <${TableCell} align="right">${t('punct_col_soll')}<//>
                <${TableCell} align="right">${t('punct_col_ist')}<//>
                <${TableCell} align="right">${t('punct_col_punkt')}<//>
                <${TableCell} align="right">${t('punct_col_delta')}<//>
                <${TableCell} align="right">${t('punct_col_wert')}<//>
                <${TableCell} align="right">${t('col_actions')}<//>
              <//>
            <//>
            <${TableBody}>
              ${tree.map((n, i) => html`<${PunctRow} key=${n.label + i} node=${n} depth=${0} t=${t} />`)}
              <${TableRow} sx=${{ '& td': { fontWeight: 500, bgcolor: '#FAFAFA' } }}>
                <${TableCell}>${t('rpt_gesamt') || 'Gesamt'}<//>
                <${TableCell} align="right">${fmtInt(total.soll)}<//>
                <${TableCell} align="right">${fmtInt(total.ist)}<//>
                <${TableCell} align="right">${fmtInt(total.punkt)}<//>
                <${TableCell} align="right">${fmtInt(total.delta)}<//>
                <${TableCell} align="right">${fmtPct(total.wert)}<//>
                <${TableCell} />
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
  // data.js owns t() and its lang binding, because the extracted record sets
  // call it while they build. Duplicating the lookup here would give two
  // implementations that can disagree.
  const t = useMemo(() => { setDataLang(lang); return k => window.t(k); }, [lang]);
  const go = (name, row) => setRoute({ name, row });

  const screen =
    route.name === 'list'      ? html`<${EvaluationsList} go=${go} />` :
    route.name === 'scheduled' ? html`<${ScheduledReports} go=${go} />` :
    route.name === 'new'       ? html`<${NewEvaluation} go=${go} />` :
    (route.name === 'report' && route.row && route.row.group === 'punctuality')
                               ? html`<${ReportPunctuality} go=${go} row=${route.row} />` :
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
