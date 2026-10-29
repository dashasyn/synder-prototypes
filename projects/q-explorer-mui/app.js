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
  Tabs, Tab, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  Snackbar, Checkbox, ListItemText, OutlinedInput, ToggleButton, ToggleButtonGroup,
  FormControlLabel, Divider, Autocomplete, createFilterOptions, Pagination, Radio, RadioGroup,
} = M;
const Fragment = React.Fragment;

const Icon = ({ children, sx }) =>
  html`<span className="material-icons" style=${{ fontSize: 20, ...(sx || {}) }}>${children}</span>`;

/* ── i18n ─────────────────────────────────────────────────────────────
   The 462 EN + 462 DE strings are lifted verbatim from the vanilla
   prototype (i18n.js). Re-translating them would have been a way to
   introduce drift for no benefit. */
const I18n = createContext({ t: k => k, lang: 'en', setLang: () => {} });
const useT = () => useContext(I18n);

const NAVY = '#1C2848';

// the icon each utility link carries in the vanilla's login bar
const UTIL_ICON = {
  util_impressum: 'gavel', util_dokumente: 'folder_open',
  util_kontakt: 'contact_page', util_support: 'support_agent',
};

const theme = createTheme({
  palette: {
    primary: { main: '#2196F3', dark: '#1769AA', light: '#64B5F6' },
    background: { default: '#FAFAFA' },
  },
  shape: { borderRadius: 4 },
  // Ignat, 2026-10-01: "the minimum font size is 14 px. Don't use 12px or
  // 13px!!!" MUI's caption, helper text, tooltip, chip and small button all
  // sit below it by default, so the floor is set here, once, for all of them.
  typography: { caption: { fontSize: '0.875rem' }, overline: { fontSize: '0.875rem' } },
  components: {
    // Ignat, 2026-09-14: "We usually use small. Buttons without shadows."
    MuiButton:      { defaultProps: { size: 'small', disableElevation: true },
                      styleOverrides: { sizeSmall: { fontSize: 14 } } },
    MuiChip:        { styleOverrides: { root: { fontSize: 14 } } },
    MuiFormHelperText: { styleOverrides: { root: { fontSize: 14 } } },
    MuiTooltip:     { styleOverrides: { tooltip: { fontSize: 14 } } },
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

// The six types and their icons come from the extracted EVAL_TYPES now; this
// used to be a hand-typed copy of the keys with no icons at all.
const TYPE_KEYS = EVAL_TYPES.map(x => x.key);
const TYPE_ICON = Object.fromEntries(EVAL_TYPES.map(x => [x.key, x.icon]));

/* The evaluations come from data.js, extracted straight out of the vanilla
   prototype (scripts/qx-extract-shared.cjs). Ignat, 2026-09-15: "Now you
   lost almost all logic" — he was right, the first pass retyped a handful
   of sample rows. Nothing here is retyped now; re-run the extractor to
   resync. Schedules now come across the same way — they were three rows I
   typed by hand against the vanilla's six until 2026-09-17. */
/* Ignat, 2026-10-06: what matters is that "you click here, and you get
   there". The vanilla gave 5 finished evaluations (all Line Analysis, two
   Trip Failures) delete as their only action, so their result could not be
   opened. Every finished report row offers the eye now; Raw Data keeps its
   download, because its result is a file. */
const ROWS = EVALUATIONS.map(r => r.status === 'done' && r.group !== 'raw_data' && !r.actions.includes('visibility')
  ? { ...r, actions: ['visibility', ...r.actions] } : r);


// The real data carries a `running` status my invented sample rows never had —
// which is exactly the kind of gap retyping data hides.
const STATUS_KEY = { done: 'status_done', in_progress: 'status_in_progress',
                     running: 'status_running', failed: 'status_failed' };

/* Ignat, 2026-10-07: "make status colourful as we have on other pages" —
   his other products use a FILLED pill: tinted background, dark text of the
   same hue, no border (Aktiv green, Beendet blue, Entwurf/Pausiert grey,
   Erstellt purple). One component, so the list and the schedules agree. */
const STATUS_TINT = {
  active:      ['#C8E6C9', '#1B5E20'],
  done:        ['#BBDEFB', '#0D47A1'],
  paused:      ['#E0E0E0', 'rgba(0,0,0,0.87)'],
  in_progress: ['#FFE0B2', '#BF360C'],
  running:     ['#FFE0B2', '#BF360C'],
  failed:      ['#FFCDD2', '#B71C1C'],
};
function StatusChip({ status, label, sx }) {
  const [bg, fg] = STATUS_TINT[status] || STATUS_TINT.paused;
  return html`<${Chip} size="small" label=${label} data-status=${status} className="status-chip"
    sx=${{ bgcolor: bg, color: fg, border: 'none', ...(sx || {}) }} />`;
}

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
  // A11Y round 1: the InputLabel had no id and the Select no labelId, so both
  // filters reported an EMPTY accessible name — visually labelled, unnamed to
  // a screen reader. MUI wires this only if you give it the pair.
  const labelId = (id || 'sel') + '-label';
  return html`
    <${FormControl} sx=${{ minWidth }} id=${id}>
      <${InputLabel} id=${labelId}>${label}<//>
      <${Select} value=${value} label=${label} labelId=${labelId}
        onChange=${e => onChange(e.target.value)}
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

/**
 * Row actions, and what each one does.
 *
 * The icon names come from the vanilla's own markup via the extractor, so the
 * port cannot offer an action the original does not — and cannot miss one.
 */
/* The vanilla annotates rows at RUNTIME, after the markup is in the DOM:
   annotateFailedRows() and markUnavailableActions(). My extractor reads the
   static markup, so neither was ever visible to it — the port shipped without
   both and the parity checker agreed, because the control census matched.
   Fidelity validator, round 1, FID-1 and FID-2. */
const FAIL_REASON_OF = row => {
  const failed = EVALUATIONS.filter(r => r.status === 'failed');
  const i = failed.findIndex(r => r.name === row.name);
  return i < 0 ? null : FAIL_REASONS[i % FAIL_REASONS.length];
};
const IS_RUNNING = st => st === 'in_progress' || st === 'running';

const ROW_ACTIONS = {
  visibility: { key: 'act_preview', aria: 'view' },
  download:   { key: 'rd_download', aria: 'download' },
  delete:     { key: 'act_delete',  aria: 'delete', color: 'error' },
  refresh:    { key: 'act_retry',   aria: 'retry' },
};

/**
 * Delete-with-confirm, an undo toast, and plain notifications — the vanilla's
 * cfAsk() / showUndoToast() / showRptApplyToast(), none of which existed in
 * the port. Its delete icon was rendered and wired to nothing.
 */
function useListActions(t, deletedToastKey) {
  const [removed, setRemoved] = useState([]);
  const [pending, setPending] = useState(null);
  const [undoable, setUndoable] = useState(null);
  const [note, setNote] = useState('');

  const confirm = () => {
    setRemoved(r => [...r, pending]);
    setUndoable(pending);
    setPending(null);
  };
  const undo = () => {
    setRemoved(r => r.filter(n => n !== undoable));
    setUndoable(null);
  };

  const ui = html`
    <${Fragment}>
      <${Dialog} open=${!!pending} onClose=${() => setPending(null)} id="confirm-dialog">
        <${DialogTitle}>${t('cf_del_eval_title')}<//>
        <${DialogContent}><${DialogContentText}>${t('cf_del_eval_body')}<//><//>
        <${DialogActions}>
          <${Button} onClick=${() => setPending(null)} id="confirm-cancel">${t('cf_cancel')}<//>
          <${Button} color="error" variant="contained" onClick=${confirm}
            id="confirm-delete">${t('cf_delete')}<//>
        <//>
      <//>
      <${Snackbar} open=${!!undoable} autoHideDuration=${6000} id="undo-toast"
        onClose=${() => setUndoable(null)} message=${t(deletedToastKey)}
        action=${html`<${Button} size="small" id="undo-btn" onClick=${undo}>${t('undo')}<//>`} />
      <${Snackbar} open=${!!note} autoHideDuration=${4000} id="note-toast"
        onClose=${() => setNote('')} message=${note} />
    <//>`;

  return { removed, askDelete: setPending, notify: setNote, ui };
}

/* ── Page header: breadcrumb, title, action in the corner ─────────── */
/**
 * Page header — breadcrumb, title, primary action in the corner.
 *
 * Ignat, 2026-09-22, with two screenshots of ETC's own pages: "page header
 * size / paddings and margins / breadcrumbs / button sizes and positions ...
 * In your current version headers are very wide and take a lot of space."
 *
 * Measured off those screenshots rather than guessed (scripts/sample-etc-header.cjs).
 * The scale falls out of the ratios: breadcrumb ink 11px to title ink 16px is
 * 1.45, which is body2 14 over h6 20 (caption/h6 would be 1.67) — so the
 * capture is at 0.835, and at that scale their primary button is 30px, exactly
 * MUI small. Their header runs 74px from the app bar to the first content row;
 * mine ran 100px.
 *
 *   theirs            was            now
 *   title      20px   24px (h5)      20px (h6)
 *   breadcrumb 14px   16px           14px
 *   padding    12px   20px           12px
 *   crumb→title 0     4px            0
 *   total      74px   100px          76px
 *
 * The subtitle moves onto the title's own line: it was a third row costing
 * ~20px, and none of their headers has one.
 */
function PageHeader({ crumbs, title, subtitle, action }) {
  return html`
    ${/* Ignat, 2026-10-29: the header stays put while the report scrolls —
          sticky under the 48px top bar, on every screen that has one */''}
    <${Box} id="page-header"
      sx=${{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 2, px: 3, py: 1.5, bgcolor: '#fff',
              position: 'sticky', top: 48, zIndex: 150, borderBottom: '1px solid #E7E7E7' }}>
      <${Box} sx=${{ minWidth: 0 }}>
        ${crumbs && html`
          <${Breadcrumbs} sx=${{ fontSize: 14 }}
            separator=${html`<${Icon} sx=${{ fontSize: 16 }}>chevron_right<//>`}>
            ${crumbs.map((c, i) => c.onClick
              ? html`<${Link} key=${i} underline="hover" color="text.secondary" href="#"
                              sx=${{ fontSize: 14 }}
                              onClick=${e => { e.preventDefault(); c.onClick(); }}>${c.label}<//>`
              : html`<${Typography} key=${i} color="text.primary" variant="body2">${c.label}<//>`)}
          <//>`}
        <${Box} sx=${{ display: 'flex', alignItems: 'baseline', gap: 1, minWidth: 0 }}>
          <${Typography} variant="h6" noWrap>${title}<//>
          ${subtitle && html`
            <${Typography} variant="body2" color="text.secondary" noWrap>${subtitle}<//>`}
        <//>
      <//>
      <${Box} sx=${{ flexShrink: 0 }}>${action}<//>
    <//>`;
}

/* ── Screen: Evaluations ──────────────────────────────────────────── */
// Name · Period · Created · Status · Actions (room for four icons)
const EVAL_COL_W = ['auto', 240, 140, 150, 184];

function EvaluationsList({ go }) {
  const { t, lang } = useT();
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const { removed, askDelete, notify, ui: actionUi } = useListActions(t, 'toast_eval_deleted');
  const { openPicker, pickerUi } = useTypePicker(go);
  const [collapsed, setCollapsed] = useState([]);
  // retryEvaluation(): a failed row flips to in_progress, loses its reason and
  // its retry button, and its remaining actions go dead while it runs.
  const [retried, setRetried] = useState([]);
  // initSortableHeaders()/sortByColumn(): every header except Actions sorts the
  // group's rows, ascending then descending, with an indicator. Another runtime
  // feature the markup never showed. (Fidelity round 1, FID-3.)
  // Ignat, 2026-09-17: "normally it should be sorted descending for column
  // Erstellt". That is the default now, and the first click on a column starts
  // descending for dates, ascending for text — newest-first is what you want
  // from a date, A-Z from a name.
  const [sort, setSort] = useState({ col: 'col_created', dir: 'desc' });
  const COLS = ['col_name', 'col_period', 'col_created', 'col_status'];
  const DATE_COLS = ['col_period', 'col_created'];
  // dd.mm.yyyy sorts wrong as text — "03.05.2026" lands before "08.01.2026".
  // The vanilla's sortByColumn() compares the cell text and has that bug; a
  // date column that sorts by its day-of-month is worse than no sorting.
  const swissDate = v => {
    const m = String(v).match(/(\d{2})\.(\d{2})\.(\d{4})\s*$/);
    return m ? `${m[3]}${m[2]}${m[1]}` : String(v);
  };
  const sortValue = (r, col) =>
    col === 'col_name' ? r.name
    : col === 'col_period' ? swissDate(r.period)
    : col === 'col_created' ? swissDate(r.created)
    : t(STATUS_KEY[retried.includes(r.name) ? 'in_progress' : r.status]);
  const sorted = list => {
    if (!sort.col) return list;
    return [...list].sort((a, b) => {
      const c = String(sortValue(a, sort.col)).localeCompare(String(sortValue(b, sort.col)), 'de');
      return sort.dir === 'asc' ? c : -c;
    });
  };
  const toggleSort = col =>
    setSort(s2 => s2.col === col
      ? { col, dir: s2.dir === 'asc' ? 'desc' : 'asc' }
      : { col, dir: DATE_COLS.includes(col) ? 'desc' : 'asc' });
  const statusOf = r => (retried.includes(r.name) ? 'in_progress' : r.status);
  const toggleGroup = g =>
    setCollapsed(c => c.includes(g) ? c.filter(x => x !== g) : [...c, g]);

  // Matching on the LABEL, not the raw value, so selecting "In Progress"
  // returns the `running` rows too rather than silently dropping them.
  //
  // The PERIOD clause was missing entirely until 2026-09-17: the state was
  // set and read by nothing, so picking a period changed the look of the
  // field and not one row. Ignat: "the filters are wrong."
  const rows = useMemo(() => ROWS.filter(r =>
    !removed.includes(r.name) &&
    (!status || t(STATUS_KEY[retried.includes(r.name) ? 'in_progress' : r.status] || r.status)
                  === t(STATUS_KEY[status] || status)) &&
    (!q || r.name.toLowerCase().includes(q.toLowerCase()))), [status, q, t, removed, retried]);
  const groups = [...new Set(rows.map(r => r.group))];
  const dirty = !!(q || status);
  const clearAll = () => { setQ(''); setStatus(''); };
  // Ignat, 2026-09-17: "I think we dont need the Filter Zeitraum." Dropped.
  // The Period column is still there and now sorts, which is the thing people
  // actually used that filter for. periodKey stays in the extracted data so
  // re-running the extractor does not have to know about this decision.

  return html`
    <${Box}>
      <${PageHeader} title=${t('page_evaluations')}
        action=${html`<${Button} variant="contained" id="new-eval-btn"
                        startIcon=${html`<${Icon} sx=${{ fontSize: 18 }}>add<//>`}
                        onClick=${openPicker}>${t('btn_new_eval')}<//>`} />

      <${Box} sx=${{ p: 3 }}>
        <${Stack} direction="row" spacing=${2} sx=${{ mb: 3 }} alignItems="center">
          <${TextField} label=${t('search_placeholder')} value=${q}
            onChange=${e => setQ(e.target.value)} sx=${{ minWidth: 280 }} id="f-search"
            InputProps=${q ? { endAdornment: html`
              <${InputAdornment} position="end">
                <${IconButton} aria-label=${t('clear_filters')} id="f-search-clear"
                  onClick=${() => setQ('')}><${Icon} sx=${{ fontSize: 18 }}>close<//><//>
              <//>` } : undefined} />
          <${FilterSelect} id="f-status" label=${t('sel_status')} value=${status} onChange=${setStatus}
            options=${statusOptions(t)} />
          ${dirty && html`
            <${Button} id="f-clear-all" onClick=${clearAll}>${t('clear_filters')}<//>`}
        <//>

        ${rows.length === 0 && html`
          <${Alert} severity="info" id="empty-state">${t('empty_no_evals')}<//>`}

        ${/* Each type is an accordion in the vanilla — a clickable group-header
              with a rotating chevron and aria-expanded, collapsing its table.
              Mine was a static heading. Controls and tables both matched, which
              is why the parity checker had nothing to say. */''}
        ${groups.map(g => html`
          <${Box} key=${g} className="report-group" sx=${{ mb: 1 }}>
            <${Box} className="group-header" role="button" tabIndex=${0}
              id=${'group-' + g} aria-expanded=${!collapsed.includes(g)}
              onClick=${() => toggleGroup(g)}
              onKeyDown=${e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleGroup(g); } }}
              sx=${{ display: 'flex', alignItems: 'center', gap: 1, py: '10px 8px',
                      cursor: 'pointer', userSelect: 'none' }}>
              <${Icon} sx=${{ fontSize: 16, color: 'text.disabled',
                               transition: 'transform .15s',
                               transform: collapsed.includes(g) ? 'rotate(-90deg)' : 'none' }}>
                expand_more<//>
              <${Typography} variant="subtitle2" sx=${{ textTransform: 'uppercase',
                               color: 'text.secondary', letterSpacing: '.05em' }}>
                ${t('type_' + g)}
              <//>
              <${Typography} variant="body2" sx=${{ color: 'text.disabled' }}>
                ${rows.filter(r => r.group === g).length} ${t('evaluations_word')}
              <//>
            <//>
            ${!collapsed.includes(g) && html`
            <${TableContainer} component=${Paper} variant="outlined" sx=${{ borderColor: '#E7E7E7' }}>
              ${/* Ignat, 2026-10-27: one grid for every group — a fixed layout
                    with set widths, so Period, Created, Status and Actions line
                    up from table to table and only Name takes the rest. */''}
              <${Table} className="eval-table" sx=${{ tableLayout: 'fixed' }}>
                <colgroup>
                  ${EVAL_COL_W.map((w, i) => html`<col key=${i} style=${{ width: w }} />`)}
                </colgroup>
                <${TableHead}>
                  <${TableRow}>
                    ${COLS.map(c => html`
                      <${TableCell} key=${c} sortDirection=${sort.col === c ? sort.dir : false}>
                        <${M.TableSortLabel} active=${sort.col === c}
                          direction=${sort.col === c ? sort.dir : 'asc'}
                          onClick=${() => toggleSort(c)}>${t(c)}<//>
                      <//>`)}
                    <${TableCell} align="right">${t('col_actions')}<//>
                  <//>
                <//>
                <${TableBody}>
                  ${sorted(rows.filter(r => r.group === g)).map(r => html`
                    <${TableRow} key=${r.name} hover>
                      ${/* Plain text, as in the vanilla. It was a Link here, which
                            opened a report for failed and in-progress rows that
                            have none — the report is reached by the preview
                            action, and only rows that carry one have it. */''}
                      <${TableCell} sx=${{ overflowWrap: 'anywhere' }}>
                        ${r.name}
                        ${statusOf(r) === 'failed' && FAIL_REASON_OF(r) && html`
                          <${Typography} variant="caption" color="error" display="block"
                            className="fail-reason">${t(FAIL_REASON_OF(r))}<//>`}
                      <//>
                      <${TableCell}>${fmtPeriod(r.period, lang)}<//>
                      <${TableCell}>${fmtDate(r.created, lang)}<//>
                      <${TableCell}>
                        <${Tooltip} title=${statusOf(r) === 'failed' && FAIL_REASON_OF(r)
                                             ? t(FAIL_REASON_OF(r)) : ''}>
                          <${StatusChip} status=${statusOf(r)}
                                   sx=${statusOf(r) === 'failed' ? { cursor: 'help' } : undefined}
                                   label=${t(STATUS_KEY[statusOf(r)])} />
                        <//>
                      <//>
                      <${TableCell} align="right">
                        ${(statusOf(r) === 'failed' ? r.actions
                            : r.actions.filter(a => a !== 'refresh')).map(a => {
                          const spec = ROW_ACTIONS[a];
                          if (!spec) return null;
                          const off = IS_RUNNING(statusOf(r));
                          const onClick =
                            a === 'visibility' ? () => go('report', r)
                          : a === 'download'   ? () => notify(t('rd_download_started').replace('{name}', r.name))
                          : a === 'delete'     ? () => askDelete(r.name)
                          : a === 'refresh'    ? () => setRetried(x => [...x, r.name])
                          : undefined;
                          // A11Y round 1: "view"/"delete" alone never said WHICH
                          // evaluation. The name goes in the accessible name.
                          const aria = `${t(spec.key)}: ${r.name}`;
                          const btn = html`
                            ${/* aria-label carries the row identity for screen
                                  readers; data-act is the stable hook the
                                  checkers select on, so naming and testing do
                                  not fight over the same attribute. */''}
                            <${IconButton} aria-label=${aria} data-act=${a} color=${spec.color}
                              disabled=${off} aria-disabled=${off || undefined}
                              onClick=${off ? undefined : onClick}><${Icon}>${a}<//><//>`;
                          return html`
                            <${Tooltip} key=${a}
                              title=${off ? t('act_unavailable_running') : t(spec.key)}>
                              <span>${btn}</span>
                            <//>`;
                        })}
                      <//>
                    <//>`)}
                <//>
              <//>
            <//>`}
          <//>`)}
      <//>
      ${actionUi}
      ${pickerUi}
    <//>`;
}

/* ── Screen: Scheduled reports ────────────────────────────────────── */
/**
 * Rebuilt 2026-09-17 against the vanilla rather than against memory.
 * It had three schedules I typed by hand (the real file has six), a Type
 * column the original does not show, no Last run column that it does, and
 * one filter out of three. Pause/resume was missing entirely — the only
 * action on this screen that changes anything.
 */
function ScheduledReports({ go }) {
  const { t, lang } = useT();
  const [freq, setFreq] = useState('');
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [paused, setPaused] = useState({});          // name -> overridden status
  const { removed, askDelete, ui: actionUi } = useListActions(t, 'toast_sched_deleted');
  const { openPicker, pickerUi } = useTypePicker(go);

  const statusOf = s => paused[s.name] || s.status;
  const rows = SCHEDULES.filter(s =>
    !removed.includes(s.name) &&
    (!freq || s.freq === freq) &&
    (!status || statusOf(s) === status) &&
    (!q || s.name.toLowerCase().includes(q.toLowerCase())));
  const dirty = !!(q || freq || status);

  const toggle = s => setPaused(p => ({
    ...p, [s.name]: statusOf(s) === 'active' ? 'paused' : 'active' }));

  return html`
    <${Box}>
      <${PageHeader} title=${t('page_scheduled')}
        subtitle=${t('scheduled_subtitle')}
        action=${html`<${Button} variant="contained" id="new-sched-btn"
                        startIcon=${html`<${Icon} sx=${{ fontSize: 18 }}>add<//>`}
                        onClick=${openPicker}>${t('btn_schedule')}<//>`} />
      <${Box} sx=${{ p: 3 }}>
        <${Stack} direction="row" spacing=${2} sx=${{ mb: 3 }} alignItems="center">
          <${TextField} label=${t('sched_search_placeholder')} value=${q} id="s-search"
            onChange=${e => setQ(e.target.value)} sx=${{ minWidth: 280 }} />
          <${FilterSelect} id="s-freq" label=${t('sel_frequency')} value=${freq} onChange=${setFreq}
            options=${['daily', 'weekly', 'monthly', 'yearly']
              .map(f => ({ value: f, label: t('freq_' + f) }))} />
          <${FilterSelect} id="s-status" label=${t('sel_status')} value=${status} onChange=${setStatus}
            options=${['active', 'paused'].map(v => ({ value: v, label: t('status_' + v) }))} />
          ${dirty && html`<${Button} id="s-clear-all"
            onClick=${() => { setQ(''); setFreq(''); setStatus(''); }}>${t('clear_filters')}<//>`}
        <//>

        ${rows.length === 0 && html`
          <${Alert} severity="info" id="sched-empty">${t('empty_no_schedules')}<//>`}

        <${TableContainer} component=${Paper} variant="outlined" sx=${{ borderColor: '#E7E7E7' }}>
          <${Table} id="sched-table">
            <${TableHead}>
              <${TableRow}>
                <${TableCell}>${t('col_name')}<//>
                <${TableCell}>${t('col_frequency')}<//>
                <${TableCell}>${t('col_next_run')}<//>
                <${TableCell}>${t('col_last_run')}<//>
                <${TableCell}>${t('col_status')}<//>
                <${TableCell} align="right">${t('col_actions')}<//>
              <//>
            <//>
            <${TableBody}>
              ${rows.map(s => html`
                <${TableRow} key=${s.name} hover>
                  <${TableCell}>${s.name}<//>
                  ${/* the badge carries its own wording — "Weekly (Monday)",
                        "Monthly (1st)" — not just the raw frequency */''}
                  ${/* Ignat, 2026-10-07: "make frequency a plain text" */''}
                  <${TableCell} className="sched-freq">${t(s.freqKey)}<//>
                  <${TableCell}>${fmtDate(s.next, lang)}<//>
                  <${TableCell}>${fmtDate(s.last, lang)}<//>
                  <${TableCell}>
                    <${StatusChip} status=${statusOf(s)} label=${t('status_' + statusOf(s))} />
                  <//>
                  <${TableCell} align="right">
                    <${Tooltip} title=${t(statusOf(s) === 'active' ? 'sched_pause' : 'sched_resume')}>
                      <${IconButton} aria-label=${statusOf(s) === 'active' ? 'pause' : 'resume'}
                        onClick=${() => toggle(s)}>
                        <${Icon}>${statusOf(s) === 'active' ? 'pause_circle' : 'play_circle'}<//>
                      <//>
                    <//>
                    <${Tooltip} title=${t('sched_edit')}>
                      ${/* editSchedule(): the type comes from the name prefix,
                            through the extracted SCHED_TYPE_MAP — a schedule row
                            carries no type of its own. */''}
                      <${IconButton} aria-label="edit" onClick=${() => {
                        const key = Object.keys(SCHED_TYPE_MAP)
                          .find(k => s.name.startsWith(k));
                        const ty = key ? SCHED_TYPE_MAP[key] : 'punctuality';
                        if (ty === 'raw_data') { go('rohdaten'); return; }
                        go('new', null, { evalType: ty, schedName: s.name });
                      }}>
                        <${Icon}>edit<//><//>
                    <//>
                    <${Tooltip} title=${t('act_delete')}>
                      <${IconButton} aria-label="delete" color="error"
                        onClick=${() => askDelete(s.name)}><${Icon}>delete<//><//>
                    <//>
                  <//>
                <//>`)}
            <//>
          <//>
        <//>
      <//>
      ${actionUi}
      ${pickerUi}
    <//>`;
}

/* ── Screen: New evaluation ───────────────────────────────────────── */
/**
 * A scope filter: multi-select with checkboxes, a summary line, and a clear ✕.
 *
 * Ignat, 2026-09-17: "Filters don't work." They did not — every one of the five
 * scope filters was a Select with two hardcoded options, SBB and BLS, and no
 * state behind it. So Cantons, Lines and Stops all offered transport-company
 * names, which is also DOM-1 from this morning's validator round. The options
 * come from the extracted DATA now, and Lines/Stops cascade off the chosen TU
 * exactly as renderLinesOptions() does.
 */
/* buildScheduleDateSelects(): German writes "3.", English "3rd". MONTH_NAMES,
   DAY_CHOICES and ORDINAL_EN all come from the extracted data. */
const dayOrdinal = (n, lang) => (lang === 'de' ? n + '.' : ORDINAL_EN(n));

/**
 * Dates, with a short month name.
 *
 * Ignat, 2026-09-22: "Update all dates and dates periods to use short month
 * name. 1 Aug 2026 - it is easier to understand." The data carries dd.mm.yyyy
 * and ranges as dd.mm–dd.mm.yyyy, so this is a render-time formatter — the
 * extracted values stay exactly as the vanilla wrote them, and re-running the
 * extractor cannot undo the decision.
 *
 * Month names come from the extracted MONTH_NAMES; the first three characters
 * are the correct abbreviation in both languages (März→Mär, Oktober→Okt,
 * September→Sep), so there is no second list to keep in step.
 */
const shortMonth = (m, lang) =>
  ((MONTH_NAMES[lang] || MONTH_NAMES.en)[m - 1] || '').slice(0, 3);

/** "25.05.2026" → "25 May 2026"; leaves anything it does not recognise alone. */
const fmtDate = (v, lang) => {
  const m = String(v).match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(.*)$/);
  return m ? `${+m[1]} ${shortMonth(+m[2], lang)} ${m[3]}${m[4] || ''}` : v;
};

/** "19.05–25.05.2026" → "19 May – 25 May 2026". Falls through to fmtDate. */
const fmtPeriod = (v, lang) => {
  const r = String(v).match(/^(\d{1,2})\.(\d{1,2})\s*[–-]\s*(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (r) return `${+r[1]} ${shortMonth(+r[2], lang)} – ${+r[3]} ${shortMonth(+r[4], lang)} ${r[5]}`;
  return fmtDate(v, lang);
};

/** yyyy-mm-dd (what <input type=date> gives) → dd.mm.yyyy, as the vanilla shows it. */
const fmtSwiss = v => {
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : v;
};

/* Ignat, 2026-09-24: "Filters should have autocomplete." Type to narrow,
   tick several, each choice a chip. Search matches the code and the name, as
   the vanilla's canton search does (code.includes(q) || name.includes(q)).
   `chip` is the short form shown once chosen — "SBB", "ZH" — so two choices
   still fit the field. */
const scopeFilter = createFilterOptions({ stringify: o => o.id + ' ' + o.label });

function ScopeSelect({ id, label, values, options, onChange, renderLabel }) {
  const { t } = useT();
  const byId = useMemo(() => new Map(options.map(o => [o.id, o])), [options]);
  const value = values.map(v => byId.get(v)).filter(Boolean);
  return html`
    <${Autocomplete} multiple disableCloseOnSelect id=${id} size="small"
      options=${options} value=${value} limitTags=${2}
      filterOptions=${scopeFilter}
      isOptionEqualToValue=${(o, v) => o.id === v.id}
      getOptionLabel=${o => o.chip || o.label}
      noOptionsText=${options.length ? t('no_matches') : t('no_options')}
      onChange=${(e, v) => onChange(v.map(o => o.id))}
      ListboxProps=${{ style: { maxHeight: 320 } }}
      renderOption=${(props, o, { selected }) => {
        const { key, ...rest } = props;
        return html`
          <li key=${o.id} ...${rest}>
            <${Checkbox} size="small" checked=${selected} sx=${{ mr: 1, ml: -1 }} />
            ${renderLabel ? renderLabel(o) : o.label}
          </li>`;
      }}
      renderInput=${params => html`
        <${TextField} ...${params} variant="filled" label=${label} />`} />`;
}

/* A single-choice filter — production's TU on Line Analysis and Raw Data,
   and the base line, take one value, never several. Same autocomplete. */
function SingleScope({ id, label, value, options, onChange, required }) {
  const byId = useMemo(() => new Map(options.map(o => [o.id, o])), [options]);
  return html`
    <${Autocomplete} id=${id} size="small" disableClearable=${!!required}
      options=${options} value=${byId.get(value) || null}
      filterOptions=${scopeFilter}
      isOptionEqualToValue=${(o, v) => o.id === v.id}
      getOptionLabel=${o => o.chip || o.label}
      renderOption=${(props, o) => {
        const { key, ...rest } = props;
        return html`<li key=${o.id} ...${rest}>${o.label}</li>`;
      }}
      onChange=${(e, v) => onChange(v ? v.id : '')}
      renderInput=${params => html`
        <${TextField} ...${params} variant="filled" label=${label} required=${!!required} />`} />`;
}

/* A section production has and whose options we have never seen (its
   dropdown was closed in every screenshot). It is shown so the structure is
   right, and says plainly that it is empty rather than offering made-up
   values that would read as real ones. */
function NotCaptured({ id, label }) {
  const { t } = useT();
  return html`
    <${TextField} id=${id} label=${label} disabled
      helperText=${t('opts_not_captured')} />`;
}

/* ── Per-type filter sets ─────────────────────────────────────────────
   Ignat, 2026-09-28: "The filters are still the same for all 'New
   evaluation'. Please update them to repeat the real structure." The
   vanilla had one set for every type; these come from six production
   creation masks (reference/production-2026-09-28/create-*.jpg), each in
   production's own section order. */
const SCOPE_BY_TYPE = {
  punctuality:   ['trafficTimes', 'rpv', 'modes', 'konz', 'tu', 'regions', 'cantons', 'lines', 'stops',
                  'directions', 'threshold', 'rpvCat', 'bundles'],
  connection:    ['rpv', 'modes', 'konz', 'tu', 'regions', 'cantons', 'lines', 'stops'],
  trip_failures: ['rpv', 'modes', 'konz', 'tu', 'regions', 'cantons', 'lines', 'stops'],
  data_quality:  ['rpv', 'modes', 'konz', 'tu', 'regions', 'cantons', 'lines', 'stops'],
  line_analysis: ['laTu', 'baseLine', 'quantiles'],
};
// Punctuality alone carries "Verkehrszeiten". Production has one strip of
// sections, and it sits right after Zeitraum — so it leads the Filters card.
// (It was in the Time Period card; Ignat, 2026-09-29: "Not part of the filters?")
const THRESHOLD_KEYS = ['rd_thr_1', 'rd_thr_2', 'rd_thr_3', 'rd_thr_4', 'rd_thr_5'];
// "Regionen (nur PAG und SBB)": regions exist only for these two operators.
const REGION_TUS = ['SBB', 'PostAuto'];
// Line Analysis and Raw Data pick from the operator list their masks show
// (AAGL first); the base lines are that operator's lines from its bundles.
const tuLinesFromBundles = code => RD_LINE_GROUPS
  .filter(g => g.bundle.split(' ')[0] === code)
  .flatMap(g => g.lines.map(([id, name]) => ({ id, label: id + ' · ' + name, chip: id, bundle: g.bundle })));

/**
 * The evaluation-type popup.
 *
 * Ignat, 2026-09-17: "Popup should appear over the Evaluations page." It did
 * not — it opened on top of the already-navigated New evaluation page, so the
 * half-dead form was visible behind it and Cancel had to undo a navigation.
 * It belongs to the list; only picking a type navigates.
 */
function TypeDialog({ open, onClose, onPick }) {
  const { t } = useT();
  return html`
    <${Dialog} open=${open} id="type-dialog" maxWidth="sm" fullWidth onClose=${onClose}>
      <${DialogTitle}>${t('dlg_pick_type')}<//>
      <${DialogContent} dividers>
        ${EVAL_TYPES.map(x => html`
          <${Box} key=${x.key} role="button" tabIndex=${0}
            id=${'type-option-' + x.key}
            onClick=${() => onPick(x.key)}
            onKeyDown=${e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(x.key); } }}
            sx=${{ display: 'flex', gap: 1.5, alignItems: 'flex-start', p: 1.5, mx: -1,
                    borderRadius: 1, cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' } }}>
            <${Icon} sx=${{ fontSize: 22, color: 'primary.main' }}>${x.icon}<//>
            <${Box}>
              <${Typography} variant="body2" sx=${{ fontWeight: 500 }}>${t('type_' + x.key)}<//>
              <${Typography} variant="body2" color="text.secondary">
                ${t('type_' + x.key + '_desc')}<//>
            <//>
          <//>`)}
      <//>
      <${DialogActions}>
        ${/* cf_cancel, not btn_cancel: the vanilla's markup asks for btn_cancel
              and that key exists in neither dictionary, so its own button
              literally renders the string "btn_cancel". */''}
        <${Button} id="type-dialog-cancel" onClick=${onClose}>${t('cf_cancel')}<//>
      <//>
    <//>`;
}

/** Shared by the two screens that can start an evaluation. */
function useTypePicker(go) {
  const [open, setOpen] = useState(false);
  const pick = k => {
    setOpen(false);
    // Raw Data Export has never used the details page — its own config form.
    if (k === 'raw_data') { go('rohdaten'); return; }
    go('new', null, { evalType: k });
  };
  const ui = html`<${TypeDialog} open=${open} onClose=${() => setOpen(false)} onPick=${pick} />`;
  return { openPicker: () => setOpen(true), pickerUi: ui };
}

/**
 * Screen: New evaluation.
 *
 * Ignat, 2026-09-17: "bring back the popup with evaluation types and icons. I
 * prefer the popup." That settles Q7 from 2026-09-15, where I built both
 * variants in the vanilla and he picked neither at the time. This is variant 1:
 * the type is chosen in a dialog first, then the full-screen details page
 * opens with it already set. The type stays a field on the page so it can be
 * changed without starting over — that is what openEvaluationPage() does.
 */
function NewEvaluation({ go, initialType }) {
  const { t, lang } = useT();
  const [type, setType] = useState(initialType || '');
  const [touched, setTouched] = useState(false);

  /* The creation flow's real state — the vanilla's `state` object. */
  const [period, setPeriod] = useState('cur_month');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  // The vanilla's day buttons all start .active — every weekday included.
  const [days, setDays] = useState([...ALL_DAYS]);
  const [rpv, setRpv] = useState([]);
  const [modes, setModes] = useState([]);
  const [tu, setTu] = useState([]);
  const [cantons, setCantons] = useState([]);
  const [lines, setLines] = useState([]);
  const [stops, setStops] = useState([]);
  const [konz, setKonz] = useState('konz');   // production's default reads "konzessioniert"
  const [regions, setRegions] = useState([]);
  const [directions, setDirections] = useState([]);
  const [threshold, setThreshold] = useState('');
  const [bundles, setBundles] = useState([]);
  const [laTu, setLaTu] = useState(RD_TU[0][0]);
  const [baseLine, setBaseLine] = useState('');
  const [quantiles, setQuantiles] = useState([]);
  const [name, setName] = useState('');
  const [nameEdited, setNameEdited] = useState(false);
  const [notify, setNotify] = useState(true);
  const [email, setEmail] = useState('analyst@company.ch');
  const [scheduled, setScheduled] = useState(false);
  const [freq, setFreq] = useState('monthly');
  const [schedDays, setSchedDays] = useState(['Wed']);
  const [monthDay, setMonthDay] = useState('3');
  const [yearMonth, setYearMonth] = useState('1');
  const [yearDay, setYearDay] = useState('1');
  const [dailyTime, setDailyTime] = useState('08:00');

  const locked = !type;
  const nameError = touched && !name.trim();
  // validateCustomRange(): the end date must not precede the start.
  const rangeReversed = period === 'custom' && !!from && !!to && from > to;

  /* The cascade — Ignat, 2026-09-24: "Filters depend on each other. If you
     select something in the first, the possible options in the second will
     change." That is the vanilla's updateCascade(), and the port had only its
     last link (TU → lines). It also never had the first filter at all: the
     Transport Association (RPV), which is what the rest of the chain hangs off.

       RPV · mode     → TU             (updateCascade: intersection)
       RPV · TU       → cantons        (DATA.rpv[r].cantons, DATA.cantonTU)
       TU             → regions        (only SBB / PostAuto have any)
       TU             → lines          (renderLinesOptions: DATA.tuLines)

     Stops depend on nothing, because the vanilla has no line→stop data — only
     a flat DATA.allStops. Narrowing them would mean inventing that mapping. */
  const rpvOptions = Object.keys(DATA.rpv).map(x => ({ id: x, label: x }));
  const modeOptions = FLAT_MODES.map(m => ({ id: m.id, label: m.label }));
  /* Production puts Transportunternehmen BEFORE Kantone, so the arrow the
     vanilla had (canton → TU) now points the other way: a TU narrows the
     cantons to the ones it serves, read from the same DATA.cantonTU table. */
  const tuOptions = useMemo(() => {
    let allowed = new Set(ALL_TU.map(x => x.id));
    const keep = ids => { allowed = new Set([...allowed].filter(id => ids.has(id))); };
    if (rpv.length) keep(new Set(rpv.flatMap(r => (DATA.rpv[r] || { tu: [] }).tu)));
    if (modes.length) {
      const casc = new Set(FLAT_MODES.filter(m => modes.includes(m.id)).map(m => m.cascade));
      keep(new Set([...casc].flatMap(m => DATA.modes[m] || [])));
    }
    return ALL_TU.filter(x => allowed.has(x.id)).map(x => ({ id: x.id, label: x.label, chip: x.id }));
  }, [rpv, modes]);
  const cantonOptions = useMemo(() => {
    const byRpv = rpv.length ? new Set(rpv.flatMap(r => (DATA.rpv[r] || { cantons: [] }).cantons)) : null;
    const byTu = tu.length
      ? new Set(ALL_CANTONS.filter(c => (DATA.cantonTU[c] || []).some(x => tu.includes(x))))
      : null;
    return ALL_CANTONS.filter(c => (!byRpv || byRpv.has(c)) && (!byTu || byTu.has(c)))
      .map(c => ({ id: c, label: CANTON_NAMES[c] || c, chip: c }));
  }, [rpv, tu]);
  // "nur PAG und SBB": with TUs chosen and neither of those among them, there are no regions
  const regionsOff = tu.length > 0 && !tu.some(x => REGION_TUS.includes(x));
  const regionOptions = PUNCT_REGIONS.map(x => ({ id: x, label: x }));
  const konzOptions = [{ id: 'konz', label: t('fa_mask_licensed') },
                       { id: 'fahr', label: t('concession_operating') }];
  const dirOptions = [{ id: 'hin', label: t('rd_dir_hin') }, { id: 'rueck', label: t('rd_dir_rueck') }];
  const thresholdOptions = THRESHOLD_KEYS.map(k => ({ id: k, label: t(k) }));
  const bundleOptions = useMemo(() =>
    [...new Set(PUNCT_RECORDS.map(r => r.linienbuendel))].map(x => ({ id: x, label: x })), []);
  const laTuOptions = RD_TU.map(([id, n]) => ({ id, label: id + ' · ' + n, chip: id }));
  const baseLineOptions = useMemo(() => tuLinesFromBundles(laTu), [laTu]);
  const lineOptions = useMemo(() => {
    const src = tu.length ? tu.flatMap(id => DATA.tuLines[id] || [])
                          : Object.values(DATA.tuLines).flat();
    return [...new Set(src)].sort().map(x => ({ id: x, label: x }));
  }, [tu]);
  const stopOptions = useMemo(() =>
    [...(DATA.allStops || [])].sort().map(x => ({ id: x, label: x })), []);

  /* updateAutoName(): "<type> – <period>, <filters>", and it stops following
     the form the moment the name is edited by hand. */
  const periodLabel = period === 'custom'
    ? (from && to ? `${fmtDate(fmtSwiss(from), lang)} – ${fmtDate(fmtSwiss(to), lang)}`
                  : t('preset_custom'))
    : t('preset_' + period);
  const autoName = useMemo(() => {
    if (!type) return '';
    const parts = [];
    if (type === 'line_analysis') {
      const dayPart = days.length && days.length < 7 ? ', ' + days.join('/') : '';
      return `${t('type_' + type)} – ${periodLabel}, ${[laTu, baseLine].filter(Boolean).join(' ')}${dayPart}`;
    }
    if (tu.length) parts.push(tu.join(', '));
    if (cantons.length) parts.push(t('canton_label') + ' ' + cantons.join(', '));
    if (lines.length) parts.push(t('filter_lines') + ': ' + lines.join(', '));
    if (stops.length) parts.push(t('filter_stops') + ': ' + stops.join(', '));
    const base = parts.length ? ', ' + parts.join(', ') : ', ' + t('all_lines');
    const dayPart = days.length && days.length < 7 ? ', ' + days.join('/') : '';
    return `${t('type_' + type)} – ${periodLabel}${base}${dayPart}`;
  }, [type, tu, cantons, lines, stops, days, periodLabel, laTu, baseLine, t]);

  // The generated name lands in the field; typing in it takes over.
  React.useEffect(() => { if (!nameEdited) setName(autoName); }, [autoName, nameEdited]);

  /* A choice that falls out of its list is dropped, all the way down: pick
     an RPV and a canton outside it goes, then the TUs that only served it,
     then their lines. The vanilla does this for TUs ("auto-uncheck TUs that
     became disallowed") and lines; for cantons it only hid them and kept them
     selected, so a hidden canton went on filtering. Dropped here too. */
  const prune = (set, opts) => set(v => {
    const next = v.filter(x => opts.some(o => o.id === x));
    return next.length === v.length ? v : next;
  });
  React.useEffect(() => prune(setCantons, cantonOptions), [cantonOptions]);
  React.useEffect(() => prune(setTu, tuOptions), [tuOptions]);
  React.useEffect(() => prune(setLines, lineOptions), [lineOptions]);
  React.useEffect(() => { if (regionsOff) setRegions(v => v.length ? [] : v); }, [regionsOff]);
  // the base line belongs to the TU: a new TU starts on its first line, as the mask shows
  React.useEffect(() => {
    if (!baseLineOptions.some(o => o.id === baseLine))
      setBaseLine(baseLineOptions.length ? baseLineOptions[0].id : '');
  }, [baseLineOptions]);

  const scopeKeys = SCOPE_BY_TYPE[type] || SCOPE_BY_TYPE.connection;
  const cantonLabel = o => html`
    <${Box} component="span" sx=${{ fontWeight: 500, minWidth: 32 }}>${o.id}<//>
    <${Box} component="span" sx=${{ color: 'text.secondary' }}>${o.label}<//>`;
  const FILTERS = {
    rpv:        () => html`<${ScopeSelect} id="f-rpv" label=${t('filter_transport_assoc')}
                  values=${rpv} options=${rpvOptions} onChange=${setRpv} />`,
    modes:      () => html`<${ScopeSelect} id="f-modes" label=${t('filter_transport_mode')}
                  values=${modes} options=${modeOptions} onChange=${setModes} />`,
    konz:       () => html`<${SingleScope} id="f-konz" label=${t('fa_mask_konz')} required
                  value=${konz} options=${konzOptions} onChange=${setKonz} />`,
    tu:         () => html`<${ScopeSelect} id="f-tu" label=${t('filter_tu')}
                  values=${tu} options=${tuOptions} onChange=${setTu} />`,
    regions:    () => regionsOff
                  ? html`<${TextField} id="f-regions" label=${t('filter_regions')} disabled
                      helperText=${t('regions_only_pag_sbb')} />`
                  : html`<${ScopeSelect} id="f-regions" label=${t('filter_regions')}
                      values=${regions} options=${regionOptions} onChange=${setRegions} />`,
    cantons:    () => html`<${ScopeSelect} id="f-cantons" label=${t('filter_cantons')}
                  values=${cantons} options=${cantonOptions} onChange=${setCantons}
                  renderLabel=${cantonLabel} />`,
    lines:      () => html`<${ScopeSelect} id="f-lines" label=${t('filter_lines')}
                  values=${lines} options=${lineOptions} onChange=${setLines} />`,
    stops:      () => html`<${ScopeSelect} id="f-stops" label=${t('filter_stops')}
                  values=${stops} options=${stopOptions} onChange=${setStops} />`,
    directions: () => html`<${ScopeSelect} id="f-directions" label=${t('rd_step_directions')}
                  values=${directions} options=${dirOptions} onChange=${setDirections} />`,
    threshold:  () => html`<${SingleScope} id="f-threshold" label=${t('rd_step_threshold')}
                  value=${threshold} options=${thresholdOptions} onChange=${setThreshold} />`,
    rpvCat:     () => html`<${NotCaptured} id="f-rpv-category" label=${t('filter_rpv_category')} />`,
    bundles:    () => html`<${ScopeSelect} id="f-bundles" label=${t('filter_line_bundles')}
                  values=${bundles} options=${bundleOptions} onChange=${setBundles} />`,
    laTu:       () => html`<${SingleScope} id="f-la-tu" label=${t('filter_tu')} required
                  value=${laTu} options=${laTuOptions} onChange=${setLaTu} />`,
    baseLine:   () => html`<${SingleScope} id="f-base-line" label=${t('filter_base_line')} required
                  value=${baseLine} options=${baseLineOptions} onChange=${setBaseLine} />`,
    quantiles:  () => html`<${NotCaptured} id="f-quantiles" label=${t('filter_quantiles')} />`,
    trafficTimes: () => html`<${NotCaptured} id="f-traffic-times" label=${t('filter_traffic_times')} />`,
  };


  return html`
    <${Box}>
      <${PageHeader}
        crumbs=${[{ label: t('nav_evaluations'), onClick: () => go('list') }, { label: t('new_eval_title') }]}
        title=${t('new_eval_title')}
        ${/* Ignat, 2026-09-22: "remove evaluation type from the first block".
              Gone from the identity card — but the page still has to say which
              type it is, so it moves to the header subtitle where it costs no
              height. Say if you would rather it were nowhere. */''}
        subtitle=${type ? t('type_' + type) : ''}
        action=${html`<${Button} variant="contained" id="run-btn" disabled=${locked}
                        startIcon=${html`<${Icon} sx=${{ fontSize: 18 }}>play_arrow<//>`}
                        onClick=${() => setTouched(true)}>${t('btn_run_now')}<//>`} />

      <${Box} sx=${{ p: 3, maxWidth: 1100, mx: 'auto' }}>
        <${Card} sx=${{ mb: 3 }}>
          <${CardContent}>
            <${Stack} direction="row" spacing=${2}>
              <${TextField} required label=${t('label_eval_name')} sx=${{ flex: 1 }}
                id="eval-name" value=${name} error=${nameError}
                helperText=${nameError ? t('err_name_required') : ' '}
                ${/* nameManuallyEdited: once it is typed in, the generator
                      stops overwriting it. I had the flag and the effect but
                      nothing ever set it, so a hand-written name was wiped by
                      the next filter change. */''}
                onChange=${e => { setNameEdited(true); setName(e.target.value); }}
                ${/* Ignat, 2026-09-24: "If the user manually changes the name, we
                      should show reset... a button which will return the default
                      name." Shown only once the name has left the generated one;
                      clicking hands the field back to the generator, which then
                      follows the filters again. */''}
                InputProps=${{ endAdornment: nameEdited && name !== autoName ? html`
                  <${InputAdornment} position="end">
                    <${Tooltip} title=${t('name_reset')}>
                      <${IconButton} id="name-reset" aria-label=${t('name_reset')} edge="end"
                        onClick=${() => { setNameEdited(false); setName(autoName); }}>
                        <${Icon}>restart_alt<//>
                      <//>
                    <//>
                  <//>` : null }} />
            <//>
          <//>
        <//>

        <${Box} id="needs-type" sx=${{ opacity: locked ? .5 : 1, pointerEvents: locked ? 'none' : 'auto' }}>
          <${Card} sx=${{ mb: 3 }}>
            <${CardContent}>
              <${Typography} variant="h6" gutterBottom>${t('step_time_period')}<//>
              <${Typography} variant="body2" color="text.secondary" sx=${{ mb: 2 }}>
                ${t('step1_subtitle')}
              <//>
              ${/* selectPreset(): the vanilla's six presets, one of them custom */''}
              <${Stack} direction="row" spacing=${1} sx=${{ mb: 2 }} flexWrap="wrap" useFlexGap
                        id="preset-group">
                ${['last_7', 'last_week', 'cur_month', 'last_month', 'cur_year', 'last_year', 'custom'].map(p =>
                  html`<${Chip} key=${p} id=${'preset-' + p} clickable
                                title=${p === 'last_week' ? t('preset_last_week_hint') : ''}
                                label=${t('preset_' + p)}
                                onClick=${() => setPeriod(p)}
                                color=${period === p ? 'primary' : 'default'}
                                variant=${period === p ? 'filled' : 'outlined'} />`)}
              <//>

              ${period === 'custom' && html`
                <${Stack} direction="row" spacing=${2} sx=${{ mb: 2 }} id="custom-dates">
                  <${TextField} label=${t('label_from')} type="date" id="date-from"
                    InputLabelProps=${{ shrink: true }} value=${from}
                    onChange=${e => setFrom(e.target.value)} />
                  <${TextField} label=${t('label_to')} type="date" id="date-to"
                    InputLabelProps=${{ shrink: true }} value=${to}
                    onChange=${e => setTo(e.target.value)}
                    error=${rangeReversed}
                    helperText=${rangeReversed ? t('err_range_reversed') : ' '} />
                <//>`}

              <${Typography} variant="body2" color="text.secondary" sx=${{ mb: 1 }}>
                ${t('label_days_of_week')}<//>
              <${Stack} direction="row" spacing=${1} id="days-row" flexWrap="wrap" useFlexGap>
                ${ALL_DAYS.map(d => html`
                  <${Chip} key=${d} id=${'day-' + d} clickable size="small"
                    label=${(DAY_LABELS[lang] || DAY_LABELS.en)[d] || d}
                    color=${days.includes(d) ? 'primary' : 'default'}
                    variant=${days.includes(d) ? 'filled' : 'outlined'}
                    onClick=${() => setDays(x => x.includes(d) ? x.filter(y => y !== d) : [...x, d])} />`)}
              <//>
            <//>
          <//>

          <${Card}>
            <${CardContent}>
              <${Typography} variant="h6" gutterBottom>${t('step_scope')}<//>
              ${/* "All filters are optional" is false for Line Analysis, whose
                    TU and base line are required — so it is not said there. */''}
              ${type !== 'line_analysis' && html`
                <${Typography} variant="body2" color="text.secondary" sx=${{ mb: 2 }} id="scope-subtitle">
                  ${t('step2_subtitle')}
                <//>`}
              ${type === 'line_analysis' && html`<${Box} sx=${{ mb: 2 }} />`}
              ${/* Production's order for this type, which is also the order of
                    the cascade: each filter narrows the ones after it. */''}
              <${Box} id="scope-filters" data-type=${type} sx=${{ display: 'grid', gap: 2,
                        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
                ${scopeKeys.map(k => html`<${Fragment} key=${k}>${FILTERS[k]()}<//>`)}
              <//>

              ${/* the vanilla's summary-filters row: what the run will cover */''}
              <${Divider} sx=${{ my: 2 }} />
              <${Typography} variant="body2" color="text.secondary" id="summary-filters">
                ${periodLabel}${type === 'line_analysis' ? ' · ' + laTu + (baseLine ? ' · ' + baseLine : '') : ''}
                ${rpv.length ? ' · RPV: ' + rpv.join(', ') : ''}
                ${modes.length ? ' · ' + FLAT_MODES.filter(m => modes.includes(m.id)).map(m => m.label).join(', ') : ''}
                ${tu.length ? ' · ' + tu.join(', ') : ''}
                ${cantons.length ? ' · ' + t('canton_label') + ' ' + cantons.join(', ') : ''}
                ${lines.length ? ' · ' + lines.length + ' ' + t('filter_lines') : ''}
                ${stops.length ? ' · ' + stops.length + ' ' + t('filter_stops') : ''}
                ${type !== 'line_analysis' && !rpv.length && !modes.length && !tu.length && !cantons.length && !lines.length && !stops.length
                  ? ' · ' + t('all_lines') : ''}
              <//>
            <//>
          <//>

          ${/* ── Step 3: Run — notification and scheduling ──────────────
                Ignat, 2026-09-17: "You lost notification block", "you lost
                Setup scheduled report part". Both were simply never ported;
                the port stopped after Time Period and Scope. */''}
          ${/* Ignat, 2026-09-22: "I don't like 'Run' block. Schedule is very
                small. It is an important checkbox. Users really need it... maybe
                details, additional, schedule and notification? I want
                notification to be a checkbox too, not a toggle."

                So: the card says what it holds rather than "Run"; SCHEDULE comes
                first and carries the weight, because it is the decision people
                come here to make; and notification is a checkbox like it. */''}
          <${Card} sx=${{ mt: 3 }} id="run-card">
            <${CardContent}>
              <${Typography} variant="h6" gutterBottom>${t('step_schedule_notify')}<//>

              ${/* Ignat, 2026-09-24: "Remove grey background from Setup
                    schedule." Schedule still leads the card; it is the order
                    and the heading that carry it, not a tint. */''}
              <${Box} id="schedule-block" sx=${{ mb: 2 }}>
                <${FormControlLabel} sx=${{ alignItems: 'flex-start', m: 0 }}
                  control=${html`<${Checkbox} id="schedule-checkbox" checked=${scheduled}
                    disabled=${period === 'custom'}
                    onChange=${e => setScheduled(e.target.checked)} />`}
                  label=${html`
                    ${/* Ignat, 2026-09-24: "These texts are very small. Please make
                          the smallest font size 14px (body2)." The label steps up to
                          body1 so it still reads above its note. */''}
                    <${Box} sx=${{ pt: 1 }}>
                      <${Typography} variant="body1" sx=${{ fontWeight: 500 }}>${t('schedule_label')}<//>
                      <${Typography} variant="body2" color="text.secondary">
                        ${t('schedule_note')}<//>
                    <//>`} />

                ${/* A custom range cannot be scheduled: every run would return
                      the same fixed period. The vanilla says so and offers the
                      way out rather than just disabling the box. */''}
                ${period === 'custom' && html`
                  <${Alert} severity="info" id="schedule-blocked-note" sx=${{ mt: 1 }}
                    action=${html`<${Button} size="small" id="schedule-blocked-link"
                      onClick=${() => setPeriod('cur_month')}>${t('schedule_blocked_link')}<//>`}>
                    ${t('schedule_blocked')}
                  <//>`}
              ${scheduled && period !== 'custom' && html`
                <${Box} id="schedule-fields" sx=${{ mt: 2 }}>
                  <${Stack} direction="row" spacing=${2} flexWrap="wrap" useFlexGap
                            alignItems="flex-start">
                    <${FormControl} sx=${{ minWidth: 180 }} id="freq-select">
                      <${InputLabel} id="freq-select-label">${t('schedule_frequency')}<//>
                      <${Select} labelId="freq-select-label" label=${t('schedule_frequency')}
                        value=${freq} onChange=${e => setFreq(e.target.value)}>
                        ${['daily', 'weekly', 'monthly', 'yearly'].map(f =>
                          html`<${MenuItem} key=${f} value=${f}>${t('freq_' + f)}<//>`)}
                      <//>
                    <//>

                    ${freq === 'weekly' && html`
                      <${Box} id="freq-options-weekly">
                        <${Typography} variant="body2" color="text.secondary"
                          sx=${{ mb: .5 }}>${t('schedule_run_on')}<//>
                        <${Stack} direction="row" spacing=${1} id="sched-days-row"
                                  flexWrap="wrap" useFlexGap>
                          ${ALL_DAYS.map(d => html`
                            <${Chip} key=${d} size="small" clickable
                              id=${'sched-day-' + d}
                              label=${(DAY_LABELS[lang] || DAY_LABELS.en)[d] || d}
                              color=${schedDays.includes(d) ? 'primary' : 'default'}
                              variant=${schedDays.includes(d) ? 'filled' : 'outlined'}
                              onClick=${() => setSchedDays(x => x.includes(d)
                                ? x.filter(y => y !== d) : [...x, d])} />`)}
                        <//>
                      <//>`}

                    ${freq === 'monthly' && html`
                      <${Box} id="freq-options-monthly" sx=${{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <${FormControl} sx=${{ minWidth: 100 }}>
                          <${InputLabel} id="month-day-label">${t('sel_day')}<//>
                          <${Select} labelId="month-day-label" label=${t('sel_day')} id="month-day-select"
                            value=${monthDay} onChange=${e => setMonthDay(e.target.value)}>
                            ${DAY_CHOICES.map(n => html`
                              <${MenuItem} key=${n} value=${String(n)}>${dayOrdinal(n, lang)}<//>`)}
                          <//>
                        <//>
                        <${Typography} variant="body2" color="text.secondary">${t('of_month')}<//>
                      <//>`}

                    ${freq === 'yearly' && html`
                      <${Box} id="freq-options-yearly" sx=${{ display: 'flex', gap: 1 }}>
                        <${FormControl} sx=${{ minWidth: 140 }}>
                          <${InputLabel} id="year-month-label">${t('sel_month')}<//>
                          <${Select} labelId="year-month-label" label=${t('sel_month')} id="yearly-month-select"
                            value=${yearMonth} onChange=${e => setYearMonth(e.target.value)}>
                            ${(MONTH_NAMES[lang] || MONTH_NAMES.en).map((m, k) => html`
                              <${MenuItem} key=${m} value=${String(k + 1)}>${m}<//>`)}
                          <//>
                        <//>
                        <${FormControl} sx=${{ minWidth: 100 }}>
                          <${InputLabel} id="year-day-label">${t('sel_day')}<//>
                          <${Select} labelId="year-day-label" label=${t('sel_day')} id="yearly-day-select"
                            value=${yearDay} onChange=${e => setYearDay(e.target.value)}>
                            ${DAY_CHOICES.map(n => html`
                              <${MenuItem} key=${n} value=${String(n)}>${dayOrdinal(n, lang)}<//>`)}
                          <//>
                        <//>
                      <//>`}

                    ${freq === 'daily' && html`
                      <${FormControl} sx=${{ minWidth: 140 }} id="freq-options-daily">
                        <${InputLabel} id="daily-time-label">${t('sel_time')}<//>
                        <${Select} labelId="daily-time-label" label=${t('sel_time')} id="daily-time-select"
                          value=${dailyTime} onChange=${e => setDailyTime(e.target.value)}>
                          ${['06:00', '07:00', '08:00', '09:00', '12:00', '18:00'].map(x =>
                            html`<${MenuItem} key=${x} value=${x}>${x}<//>`)}
                        <//>
                      <//>`}
                  <//>

                  <${Stack} direction="row" spacing=${.75} alignItems="center" sx=${{ mt: 1.5 }}
                            id="freq-hint">
                    <${Icon} sx=${{ fontSize: 18, color: 'text.secondary' }}>info<//>
                    <${Typography} variant="body2" color="text.secondary">
                      ${t('hint_' + freq)}<//>
                  <//>
                <//>`}
              <//>

              <${Divider} sx=${{ my: 2 }} />

              ${/* Ignat, 2026-09-24: "Let's make the same logic as for
                    schedules: if checked show input, if unchecked hide input."
                    It used to stay on screen, disabled. The address is kept in
                    state, so unticking and ticking again brings it back. */''}
              <${Box} id="notify-section">
                <${FormControlLabel} sx=${{ alignItems: 'flex-start', m: 0 }}
                  control=${html`<${Checkbox} id="notify-checkbox" checked=${notify}
                    onChange=${e => setNotify(e.target.checked)} />`}
                  label=${html`
                    <${Box} sx=${{ pt: 1 }}>
                      <${Typography} variant="body1" sx=${{ fontWeight: 500 }}>${t('notify_label')}<//>
                    <//>`} />
                ${notify && html`
                  <${Box} id="notify-fields" sx=${{ mt: 2 }}>
                    <${TextField} id="notify-email" type="email"
                      sx=${{ minWidth: 280 }} value=${email}
                      onChange=${e => setEmail(e.target.value)} />
                  <//>`}
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
// production's eleven (2026-10-26); Kanton is mock, derived from the region
const PUNCT_DIMS = ['betriebstag', 'linienbuendel', 'linie', 'haltestelle',
                    'monat', 'kw', 'tu_konz', 'tu_fahr', 'vm', 'kanton', 'region'];
const REGION_KANTON = { Nordwestschweiz: 'BL', Mittelland: 'BE', Ostschweiz: 'SG', Zentralschweiz: 'LU', Ticino: 'TI' };
PUNCT_RECORDS.forEach(r => { if (!r.kanton) r.kanton = REGION_KANTON[r.region] || 'ZH'; });
PUNCT_DIM_LABELS.kanton = 'fa_opt_kanton';
PUNCT_DIM_LABELS.linienbuendel = 'fa_opt_lb';   // production's label, not "Name / Line bundle"

/* The vanilla formats numbers with its OWN helpers, and they differ per
   report: fmtN gives "764.942" for punctuality, faNum gives "953'278" for trip
   failures, and percentages carry a decimal COMMA. Mine used toLocaleString
   and a decimal point, so every figure in the port read differently from the
   same figure in the vanilla — qx-content-parity.cjs, 2026-09-22. Both come
   from the extracted data, so there is one implementation, not two. */
function fmtInt(n) {
  return (n === null || n === undefined) ? '—' : fmtN(Math.round(n));
}
function fmtPct(v) {
  return (v === null || v === undefined) ? '—' : v.toFixed(2).replace('.', ',') + '%';
}

/**
 * The KPI row above a report's table — renderPunctKpi() in the vanilla.
 *
 * Ignat, 2026-09-22: "I need you to repeat all functions, big numbers, small
 * numbers, graphs, tables." The big numbers were missing outright: the port
 * went straight from the breakdown selects to the table, so four figures that
 * the vanilla puts at the top of the page — overall punctuality against the
 * threshold, planned, actual, delta — existed nowhere. qx-content-parity.cjs
 * is what found them; the affordance checker counted a card and a table on
 * both sides and said ok.
 */
/**
 * Apply an evaluation's own scale before reading any punctuality figure.
 *
 * showPunctReport() sets `_punctScale = evalScale(row, period)` and
 * `_punctPctShift = evalPctShift(row)` before it renders, so EVERY punctuality
 * evaluation shows different numbers — the scale is a pure function of the
 * row's name and the length of its period. The port ignored that and showed
 * one set of figures for all six, which is why its Gesamt read 2.101.488
 * against the vanilla's 764.942 for the same row.
 *
 * Both functions and the two scale variables come from the extracted data, so
 * this sets the same globals the extracted getters read.
 */
function applyPunctScale(row) {
  /* rowPeriod() prefers the row's OWN von/bis and counts the days between
     them; only when those are absent does it fall back to periodFromKey().
     Using the key alone gave 30 days where the row spans 31 — a 3.3% error
     that put every figure slightly wrong while the percentage still matched,
     which is exactly the kind of near-miss a content diff catches and an eye
     does not. */
  const period = rowPeriod({ dataset: {
    von: (row && row.von) || '', bis: (row && row.bis) || '',
    period: (row && row.periodKey) || '',
  } });
  _punctScale = evalScale({ dataset: { name: (row && row.name) || '' } }, period);
  _punctPctShift = evalPctShift({ dataset: { name: (row && row.name) || '' } });
}

function KpiRow({ cards }) {
  return html`
    <${Stack} direction="row" spacing=${2} sx=${{ mb: 3 }} flexWrap="wrap" useFlexGap
              id="kpi-row">
      ${cards.map((c, i) => html`
        <${Card} key=${i} sx=${{ flex: '1 1 200px', minWidth: 200 }}>
          <${CardContent} sx=${{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
            <${Typography} variant="caption" color="text.secondary"
              sx=${{ textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 600 }}>
              ${c.label}<//>
            <${Typography} variant="h5" sx=${{ my: .25,
              color: c.tone === 'good' ? 'success.main' : c.tone === 'bad' ? 'error.main' : 'text.primary' }}>
              ${c.value}<//>
            <${Stack} direction="row" spacing=${.5} alignItems="center">
              ${c.icon && html`<${Icon} sx=${{ fontSize: 13,
                color: c.tone === 'good' ? 'success.main' : 'error.main' }}>${c.icon}<//>`}
              <${Typography} variant="caption" color="text.secondary">${c.foot}<//>
            <//>
          <//>
        <//>`)}
    <//>`;
}

function PunctRow({ node, depth, t, onChart, onRaw, open0 }) {
  const [open, setOpen] = useState(!!open0);
  const kids = node.children || [];
  return html`
    <${React.Fragment}>
      <${TableRow} hover data-depth=${depth} className="punct-row">
        <${TableCell} sx=${{ pl: `${8 + depth * 20}px`, fontWeight: depth === 0 ? 500 : 400 }}>
          ${kids.length > 0 ? html`
            <${IconButton} aria-label=${open ? 'collapse' : 'expand'} aria-expanded=${open}
                           onClick=${() => setOpen(o => !o)} sx=${{ mr: .5 }}>
              <${Icon} sx=${{ fontSize: 18 }}>${open ? 'expand_more' : 'chevron_right'}<//>
            <//>` : html`<${Box} component="span" sx=${{ display: 'inline-block', width: 30 }} />`}
          ${node.label}
        <//>
        <${TableCell} align="right">${fmtInt(node.agg.soll)}<//>
        <${TableCell} align="right">${fmtInt(node.agg.ist)}<//>
        <${TableCell} align="right">${fmtInt(node.agg.punkt)}<//>
        <${TableCell} align="right">${fmtInt(node.agg.delta)}<//>
        ${/* production prints Wert bold and uncoloured */''}
        <${TableCell} align="right" sx=${{ fontWeight: 700 }}>${fmtPct(node.agg.wert)}<//>
        <${TableCell} align="right" sx=${{ whiteSpace: 'nowrap' }}>
          ${/* production: the chart only where there is something to chart */''}
          ${kids.length > 0 && html`<${Tooltip} title=${t('rpt_action_chart')}>
            <${IconButton} aria-label="chart" onClick=${() => onChart && onChart(node)}>
              <${Icon}>bar_chart<//><//><//>`}
          <${Tooltip} title=${t('rpt_action_raw')}>
            <${IconButton} aria-label="raw" onClick=${() => onRaw && onRaw(node)}>
              <${Icon}>table_chart<//><//><//>
        <//>
      <//>
      ${open && kids.map((k, i) =>
        html`<${PunctRow} key=${k.label + i} node=${k} depth=${depth + 1} t=${t}
               onChart=${onChart} onRaw=${onRaw} />`)}
    <//>`;
}

// production's grid for Pünktlichkeit: Verkehrszeiten after Wochentage
const punctParamFields = (t, lang, row) => {
  const f = faParamFields(t, lang, row);
  f.splice(3, 0, [t('filter_traffic_times'), t('fa_mask_unlimited'), true]);
  f[5] = [t('fa_mask_vm'), t('fa_mask_unlimited'), true];
  return f;
};

function ReportPunctuality({ go, row }) {
  const { t, lang } = useT();
  // The vanilla's punct-auf-1/2 carry selected="linienbuendel" and
  // selected="linie", so the report opens TWO levels deep. Mine opened one,
  // which is a quieter version of "the report is missing rows".
  const [dims, setDims] = useState(['linienbuendel', 'linie', '']);

  const active = dims.filter(Boolean);
  // the scale must be set BEFORE anything reads a record — the rows are getters
  const tree = useMemo(() => {
    applyPunctScale(row);
    return punctBuildTree(PUNCT_RECORDS, active.length ? active : ['linienbuendel']);
  }, [dims.join('|'), row && row.name]);
  /* renderPunctReport(): the Gesamt row is PUNCT_DATA.gesamt through scl()/
     sclPunkt() — "the whole network, not the sum of the rows below it", as the
     vanilla's own comment puts it. I had been using punctAggregate over the
     displayed records, which is a different and smaller number: 152.727
     against the network's 764.942. qx-content-parity.cjs, 2026-09-22. */
  const total = useMemo(() => {
    applyPunctScale(row);
    const g = PUNCT_DATA.gesamt;
    const soll = scl(g.soll), ist = scl(g.ist), punkt = sclPunkt(g.punkt, g.ist);
    return { soll, ist, punkt, delta: soll - ist, wert: ist > 0 ? (punkt / ist) * 100 : null };
  }, [row && row.name]);

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
        ${/* production 2026-10-26: the parameter grid, no KPI cards */''}
        <${ParamGrid} id="punct-params" fields=${punctParamFields(t, lang, row)} />
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
              ${/* Gesamt is the tree's open root, the network-wide figure, as
                    production draws it */''}
              <${PunctRow} open0 depth=${0} t=${t}
                node=${{ label: t('rpt_gesamt'), agg: total, children: tree }}
                onChart=${node => go('chart', row, { chart: {
                  title: node.label, backLabel: t('type_punctuality'),
                  format: v => v.toFixed(2).replace('.', ',') + '%',
                  items: (node.children && node.children.length ? node.children : [node])
                    .map(c => ({ label: c.label, value: c.agg.wert || 0 })),
                } })}
                onRaw=${node => go('raw', row, { node })} />
            <//>
          <//>
        <//>
      <//>
    <//>`;
}


/* ── Screen: Connection Punctuality ───────────────────────────────────
   Same shape as Punctuality, different model: rptBuildTree / rptAggregate
   over RPT_RECORDS, both from data.js. The value columns come from
   RPT_DATA.gesamt's own length, so adding a metric upstream adds a column
   here rather than silently dropping one. */
/* ── Screen: Connection punctuality (Anschlusspünktlichkeit) ───────────
   Rebuilt 2026-10-20 from nine production screens (reference/production-
   2026-10-20-ap/, local only), simplified as agreed: parameter grid; one
   control card with the three-level breakdown (production's eight options,
   default Haltestelle → Linie Zubringer → Linie Abbringer) and the two
   calculation checkboxes, which really move the figures; one header row of
   seven named columns, tinted 4 + 3; Gesamt as the open root; red below 95%
   as production colours it; chart only where a row has children, the
   individual connections on every row, both at the row end. */
const CONN_DIMS = ['tu_abb', 'haltestelle_abb', 'verkehrsmittel_abb', 'linienbuendel_abb',
                   'linie_abb', 'linie_zub', 'betriebstag', 'kw'];
const CONN_RED = 95;   // read off production: 95.83 black, 94.53 red
const CONN_TINT = ['rgba(33,150,243,0.07)', 'rgba(139,195,74,0.12)'];
const CONN_COLS = ['rpt_time_all_day', 'rpt_time_hvz_morning', 'rpt_time_hvz_evening', 'rpt_time_last_trip',
                   'rpt_time_all_day', 'rpt_time_hvz_morning', 'rpt_time_hvz_evening'];
// the two checkboxes act on the connection rates (the first four columns)
const connAdjust = (v, reduce, strict) => v.map((x, i) => {
  if (x === null || x === undefined || i > 3) return x;
  let y = x;
  if (reduce) y = Math.min(100, y + (100 - y) * 0.3);
  if (strict) y = y * 0.985;
  return y;
});
const connTree = (recs, dims, path = []) => {
  if (!dims.length) return [];
  const [dim, ...rest] = dims;
  const map = new Map();
  recs.forEach(r => { if (!map.has(r[dim])) map.set(r[dim], []); map.get(r[dim]).push(r); });
  return [...map.entries()].map(([label, g]) => {
    const p = [...path, [dim, label]];
    return { label, path: p, recs: g, v: rptAggregate(g), kids: connTree(g, rest, p) };
  });
};
// mock individual connections behind a row: as many "nein" as its rate implies
const connRows = node => {
  const seed = node.path.map(p => String(p[1])).join('|');
  let h = 0; for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const rate = (node.v[0] === null || node.v[0] === undefined ? 95 : node.v[0]) / 100;
  const pick = dim => (node.path.find(p => p[0] === dim) || [])[1];
  const r0 = node.recs[0] || {};
  const stop = pick('haltestelle_abb') || r0.haltestelle_abb || 'Aarau';
  const zub = (pick('linie_zub') || r0.linie_zub || '').match(/^(\S+)/);
  const abb = (pick('linie_abb') || r0.linie_abb || '').match(/\(([^)]+)\)/);
  const n = 24 + h % 30;
  return Array.from({ length: n }, (_, k) => {
    const rnd = laRand(h + k * 7);
    const made = rnd < rate;
    const def = 120 + (h % 3) * 60;
    const meas = made ? def + Math.round(laRand(h + k) * 200) : Math.round(def * (0.5 + laRand(h + k + 1) * 0.45));
    const arr = 360 + k * 45 + (h % 20);
    const sec = s => `${String(Math.floor(s / 3600) % 24).padStart(2, '0')}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    const day = `${String(30 - (k % 14 > 0 ? 0 : 0)).padStart(2, '0')}.09.2026`;
    return [`${String(((k % 14) + 30 - 1) % 30 + 1).padStart(2, '0')}.${k % 14 < 1 ? '09' : '10'}.2026`.replace(/^30\.10/, '30.09'),
      zub ? (/^\d+$/.test(zub[1]) ? '50.' + zub[1].padStart(3, '0') : zub[1]) : '50.201', `(85${String(h % 100000).padStart(5, '0')}) ${stop}`,
      abb ? abb[1] : '5.IR37', `(85${String((h + 7) % 100000).padStart(5, '0')}) ${stop}`,
      sec(arr * 60), sec(arr * 60 + Math.round((laRand(h + k + 3) - .3) * 120)),
      sec(arr * 60 + def + 240), sec(arr * 60 + def + 240 + Math.round(laRand(h + k + 4) * 90)),
      sec(meas), sec(def), made ? 'ja' : 'nein', made || meas >= def * 0.75 ? 'ja' : 'nein'];
  });
};

function ConnRow({ node, depth, t, val, adj, onChart, onRows, open0 }) {
  const [open, setOpen] = useState(!!open0);
  const kids = node.kids || [];
  const v = adj(node.v);
  return html`
    <${React.Fragment}>
      <${TableRow} hover data-depth=${depth} className="conn-row">
        <${TableCell} sx=${{ pl: `${8 + depth * 20}px`, whiteSpace: 'nowrap', fontWeight: depth === 0 ? 500 : 400 }}>
          ${kids.length ? html`<${IconButton} className="conn-expand" onClick=${() => setOpen(o => !o)}
              aria-label=${open ? 'collapse' : 'expand'} aria-expanded=${open}>
              <${Icon} sx=${{ fontSize: 18 }}>${open ? 'expand_more' : 'chevron_right'}<//><//>`
            : html`<${Box} component="span" sx=${{ display: 'inline-block', width: 30 }} />`}
          ${node.label}
        <//>
        ${v.map((x, i) => html`<${TableCell} key=${i} align="right" sx=${{ bgcolor: CONN_TINT[i < 4 ? 0 : 1] }}>${val(x)}<//>`)}
        <${TableCell} align="right" sx=${{ whiteSpace: 'nowrap' }}>
          ${kids.length > 0 && html`<${Tooltip} title=${t('rpt_action_chart')}>
            <${IconButton} aria-label="chart" className="conn-chart-btn" onClick=${() => onChart(node)}><${Icon}>bar_chart<//><//><//>`}
          <${Tooltip} title=${t('rpt_action_raw')}>
            <${IconButton} aria-label="raw" className="conn-rows-btn" onClick=${() => onRows(node)}><${Icon}>table_chart<//><//><//>
        <//>
      <//>
      ${open && kids.map((k, i) => html`<${ConnRow} key=${k.label + i} node=${k} depth=${depth + 1} t=${t}
        val=${val} adj=${adj} onChart=${onChart} onRows=${onRows} />`)}
    <//>`;
}

function ReportConnection({ go, row }) {
  const { t, lang } = useT();
  const [dims, setDims] = useState(['haltestelle_abb', 'linie_zub', 'linie_abb']);
  const [reduce, setReduce] = useState(false);
  const [strict, setStrict] = useState(false);
  const active = dims.filter(Boolean);
  const kids = useMemo(() => connTree(RPT_RECORDS, active.length ? active : ['haltestelle_abb']), [dims.join('|')]);
  const root = { label: t('rpt_gesamt'), path: [], recs: RPT_RECORDS, v: RPT_DATA.gesamt, kids };
  const adj = v => connAdjust(v, reduce, strict);
  const setLevel = (i, v) => setDims(d => { const n = [...d]; n[i] = v; for (let j = i + 1; j < 3; j++) n[j] = ''; return n; });
  const val = v => v === null || v === undefined
    ? html`<${Typography} variant="body2" component="span" color="text.secondary">n/a<//>`
    : html`<${Typography} variant="body2" component="span" color=${v < CONN_RED ? 'error.main' : 'text.primary'}>
        ${v.toFixed(2).replace('.', ',')}%<//>`;
  const fields = connParamFields(t, lang, row);
  return html`
    <${Box}>
      <${PageHeader}
        crumbs=${[{ label: t('nav_evaluations'), onClick: () => go('list') }, { label: row ? row.name : t('type_connection') }]}
        title=${row ? row.name : t('type_connection')} subtitle=${t('type_connection')}
        action=${html`<${Stack} direction="row" spacing=${1} alignItems="center">
          <${Tooltip} title=${t('fa_infoblatt')}><${IconButton} aria-label=${t('fa_infoblatt')} id="conn-infoblatt">
            <${Icon}>description<//><//><//>
          <${Button} variant="outlined" startIcon=${html`<${Icon} sx=${{ fontSize: 18 }}>download<//>`}>${t('export_csv')}<//><//>`} />
      <${Box} sx=${{ p: 3 }}>
        <${ParamGrid} id="conn-params" fields=${fields} />
        <${Card} sx=${{ mb: 2 }} id="conn-controls"><${CardContent} sx=${{ '&:last-child': { pb: 2 } }}>
          <${Box} sx=${{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <${Box}>
              <${Typography} variant="subtitle2" sx=${{ mb: 1 }}>${t('fa_aufschluss_label')}<//>
              <${Stack} direction="row" spacing=${1}>
                ${[0, 1, 2].map(i => html`<${FilterSelect} key=${i} id=${'rpt-auf-' + (i + 1)} minWidth=${220}
                  label=${t(['sel_breakdown_1', 'sel_breakdown_2', 'sel_breakdown_3'][i])}
                  value=${dims[i]} onChange=${v => setLevel(i, i === 0 ? (v || 'haltestelle_abb') : v)}
                  options=${CONN_DIMS.filter(d => !dims.some((x, j) => x === d && j !== i))
                    .map(d => ({ value: d, label: t(RPT_DIM_LABELS[d]) }))} />`)}
              <//>
            <//>
            <${Box}>
              <${Typography} variant="subtitle2" sx=${{ mb: .5 }}>${t('conn_calc')}<//>
              <${Stack}>
                <${FormControlLabel} control=${html`<${Checkbox} id="conn-reduce" checked=${reduce}
                  onChange=${e => setReduce(e.target.checked)} />`} label=${t('conn_reduce')} />
                <${FormControlLabel} control=${html`<${Checkbox} id="conn-strict" checked=${strict}
                  onChange=${e => setStrict(e.target.checked)} />`} label=${t('conn_strict')} />
              <//>
            <//>
          <//>
        <//><//>
        <${TableContainer} component=${Paper} variant="outlined" sx=${{ borderColor: '#E7E7E7' }}>
          <${Table} id="rpt-table">
            <${TableHead}><${TableRow}>
              <${TableCell}>${t(RPT_DIM_LABELS[active[0] || 'haltestelle_abb'])}<//>
              ${CONN_COLS.map((k, i) => html`<${TableCell} key=${i} align="right" sx=${{ bgcolor: CONN_TINT[i < 4 ? 0 : 1] }}>
                ${t(i < 4 ? 'rpt_col_apcq' : 'rpt_col_punct_zub')} ${t(k)}<//>`)}
              <${TableCell} align="right">${t('col_actions')}<//>
            <//><//>
            <${TableBody}>
              <${ConnRow} node=${root} depth=${0} t=${t} val=${val} adj=${adj} open0
                onChart=${node => go('conn-chart', row, { node, reduce, strict })}
                onRows=${node => go('conn-rows', row, { node, reduce })} />
            <//>
          <//>
        <//>
      <//>
    <//>`;
}

function ConnChart({ go, row, node, reduce, strict }) {
  const { t, lang } = useT();
  const p = rowPeriod({ dataset: { von: (row && row.von) || '', bis: (row && row.bis) || '', period: (row && row.periodKey) || '' } });
  const kids = node.kids.length ? node.kids : [node];
  const SER = ['#3B78B5', '#6A9F38', '#B5452A', '#F28E2B'];
  const W = 900, H = 360, L = 80, B = 70, plotH = H - B - 20, plotW = W - L - 20;
  const gw = plotW / kids.length, bw = Math.min(22, gw / 5);
  const pct = n => n.toFixed(2).replace('.', lang === 'de' ? ',' : '.') + '%';
  const sub = node.path.length ? node.path.map(x => x[1]).join(', ') : t('rpt_gesamt');
  return html`
    <${Box}>
      <${PageHeader} crumbs=${[{ label: t('nav_evaluations'), onClick: () => go('list') },
          { label: row ? row.name : t('type_connection'), onClick: () => go('report', row) }, { label: t('rpt_action_chart') }]}
        title=${t('rpt_action_chart')} subtitle=${sub} />
      <${Box} sx=${{ p: 3 }}>
        <${ParamGrid} id="conn-chart-params" fields=${[...connParamFields(t, lang, row).slice(0, 7),
          ...node.path.map(([d, v]) => [t(RPT_DIM_LABELS[d]), v, false, true])]} />
        <${Card}><${CardContent}>
        <${Typography} variant="h6" align="center" id="conn-chart-title">${t('fa_chart_period')}: ${fmtDate(p.von, lang)} - ${fmtDate(p.bis, lang)}<//>
        <${Typography} variant="body1" align="center" sx=${{ mb: 2 }}>${sub}<//>
        <${Box} sx=${{ display: 'flex', gap: 3 }}>
          <svg viewBox=${`0 0 ${W} ${H}`} width="100%" id="conn-chart-svg" style=${{ flex: 1 }}>
            ${[0, .2, .4, .6, .8, 1].map(f => html`<g key=${f}>
              <line x1=${L} x2=${W - 20} y1=${20 + plotH * (1 - f)} y2=${20 + plotH * (1 - f)} stroke="#E7E7E7" />
              <text x=${L - 8} y=${20 + plotH * (1 - f)} text-anchor="end" dominant-baseline="middle" font-size="14" fill="rgba(0,0,0,0.6)">${pct(100 * f)}</text></g>`)}
            ${kids.map((k, i) => { const v = connAdjust(k.v, reduce, strict); return html`<g key=${i} className="conn-chart-group">
              ${[0, 1, 2, 3].map(j => { const h = plotH * (v[j] || 0) / 100;
                return html`<rect key=${j} className="conn-chart-bar" x=${L + gw * i + gw / 2 - bw * 2 + bw * j} y=${20 + plotH - h}
                  width=${bw - 2} height=${h} fill=${SER[j]}><title>${pct(v[j] || 0)}</title></rect>`; })}
              <text x=${L + gw * i + gw / 2} y=${H - B + 22} text-anchor="middle" font-size="14" fill="rgba(0,0,0,0.87)">
                ${String(k.label).slice(0, 26)}</text></g>`; })}
          </svg>
          <${Stack} spacing=${1} id="conn-chart-legend" sx=${{ minWidth: 260, pt: 2 }}>
            ${[0, 1, 2, 3].map(j => html`<${Stack} key=${j} direction="row" spacing=${1} alignItems="center">
              <${Box} sx=${{ width: 14, height: 14, bgcolor: SER[j] }} />
              <${Typography} variant="body2">${t('rpt_col_apcq')} ${t(CONN_COLS[j])}<//><//>`)}
          <//>
        <//>
      <//><//><//>
    <//>`;
}

const CONN_ROW_COLS = ['rpt_raw_col_trip_date', 'rpt_raw_col_feeder_line', 'rpt_raw_col_feeder_stop',
  'rpt_raw_col_conn_line', 'rpt_raw_col_conn_stop', 'rpt_raw_col_sched_arr', 'rpt_raw_col_actual_arr',
  'rpt_raw_col_sched_dep', 'rpt_raw_col_actual_dep', 'rpt_raw_col_measured', 'rpt_raw_col_defined',
  'rpt_raw_col_conn_made', 'rpt_raw_col_reduced'];

/* The table icon's page: the individual connections behind a row. The row
   you came from is the highlighted field in the parameter grid — production
   frames it in red; here it is primary, the selection colour. */
function ConnRows({ go, row, node, reduce }) {
  const { t, lang } = useT();
  const all = useMemo(() => connRows(node), [node]);
  const [f, setF] = useState(Array(13).fill(''));
  const [pp, setPp] = useState(10);
  const [page, setPage] = useState(1);
  const rows = all.filter(r => r.every((c, i) => !f[i] || (i >= 11 ? c === f[i] : String(c).toLowerCase().includes(f[i].toLowerCase()))));
  const pages = Math.max(1, Math.ceil(rows.length / pp));
  const shown = rows.slice((page - 1) * pp, page * pp);
  const setFilter = (i, v) => { setF(x => { const n = [...x]; n[i] = v; return n; }); setPage(1); };
  const base = connParamFields(t, lang, row);
  const sel = node.path.map(([d, v]) => [t(RPT_DIM_LABELS[d]), v, false, true]);
  const fields = [...base.slice(0, 7), ...sel];
  return html`
    <${Box}>
      <${PageHeader} crumbs=${[{ label: t('nav_evaluations'), onClick: () => go('list') },
          { label: row ? row.name : t('type_connection'), onClick: () => go('report', row) }, { label: t('conn_rows_title') }]}
        title=${t('conn_rows_title')} subtitle=${node.path.length ? node.path.map(x => x[1]).join(' · ') : t('rpt_gesamt')} />
      <${Box} sx=${{ p: 3 }}>
        <${ParamGrid} id="conn-rows-params" hotClass="conn-hot" fields=${fields} />
        <${Stack} direction="row" alignItems="center" sx=${{ mb: 1 }}>
          <${LaSelect} id="conn-rows-pp" label=${t('fa_mask_entries')} value=${pp} minWidth=${170}
            onChange=${v => { setPp(v); setPage(1); }} options=${[10, 25, 50, 100].map(n => ({ value: n, label: String(n) }))} />
        <//>
        <${TableContainer} component=${Paper} variant="outlined" sx=${{ borderColor: '#E7E7E7' }}>
          <${Table} id="conn-rows-table">
            <${TableHead}>
              <${TableRow}>${CONN_ROW_COLS.map((k, i) => html`<${TableCell} key=${k} align=${i >= 5 ? 'right' : 'left'}
                sx=${i === 12 && reduce ? { color: 'primary.main' } : undefined}>${t(k)}<//>`)}<//>
              <${TableRow} className="conn-filter-row">${CONN_ROW_COLS.map((k, i) => html`<${TableCell} key=${k} sx=${{ py: .5 }}>
                ${i >= 11 ? html`<${Select} variant="standard" fullWidth value=${f[i]} displayEmpty id=${'conn-f-' + i}
                    onChange=${e => setFilter(i, e.target.value)} inputProps=${{ 'aria-label': t(k) }}>
                    <${MenuItem} value="">${t('la_all')}<//><${MenuItem} value="ja">ja<//><${MenuItem} value="nein">nein<//><//>`
                  : html`<${TextField} variant="standard" size="small" fullWidth value=${f[i]} id=${'conn-f-' + i}
                    inputProps=${{ 'aria-label': t(k) }} onChange=${e => setFilter(i, e.target.value)} />`}
              <//>`)}<//>
            <//>
            <${TableBody}>
              ${shown.map((r, k) => html`<${TableRow} key=${k} hover>
                ${r.map((c, i) => html`<${TableCell} key=${i} align=${i >= 5 ? 'right' : 'left'}
                  sx=${(i === 11 || i === 12) && c === 'nein' ? { color: 'error.main' } : undefined}>${i === 0 ? fmtDate(c, lang) : c}<//>`)}
              <//>`)}
            <//>
          <//>
        <//>
        <${Stack} direction="row" alignItems="center" sx=${{ mt: 2 }}>
          <${Typography} variant="body2" color="text.secondary" id="conn-rows-info">
            ${t('fa_pager_info').replace('{start}', rows.length ? (page - 1) * pp + 1 : 0)
              .replace('{end}', Math.min(page * pp, rows.length)).replace('{total}', rows.length)}<//>
          <${Box} sx=${{ flex: 1 }} />
          <${Pagination} count=${pages} page=${Math.min(page, pages)} onChange=${(e, v) => setPage(v)}
            showFirstButton showLastButton shape="rounded" id="conn-rows-pager" />
        <//>
      <//>
    <//>`;
}

/* ── Screen: Trip Failures DPM (Fahrtausfälle) ────────────────────────
   Rebuilt 2026-10-06 from eight production screens (reference/production-
   2026-10-06-fa/, local only). Production supersedes the vanilla here: a
   parameter grid instead of chips, Übersicht and Tabelle tabs, a flow chart
   of cancelled journey time by cause, one header row of nine named columns
   tinted by group, and Gesamt as the tree root. The row icons stay at the END,
   as agreed for every report (Ignat, 2026-10-06), though production puts them first. The vanilla's KPI cards and rate badges are not in
   production and are gone. */

// The grid production puts above the report and above the mask.
/* One parameter block for every report and drill-in. A 4th element marks the
   field the drill-in came from: framed in primary, the selection colour. */
function ParamGrid({ id, fields, hotClass = 'param-hot' }) {
  return html`
    <${Card} sx=${{ mb: 2 }} id=${id}><${CardContent} sx=${{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
      ${/* a long value (the transport-mode list) gets a wider column, as in production */''}
      <${Box} sx=${{ display: 'grid', columnGap: 0, gridTemplateColumns: fields
                      .map(f => `minmax(0, ${String(f[1]).length > 40 ? 2.6 : 1}fr)`).join(' ') }}>
        ${fields.map(([label, value, dim, hot], i) => html`
          <${Box} key=${i} className=${hot ? hotClass : ''}
            sx=${hot ? { px: 1.5, mx: .5, border: '1px solid', borderColor: 'primary.main', borderRadius: 1,
                         bgcolor: 'rgba(33,150,243,0.06)' }
                     : { px: 1.5, borderLeft: i ? '1px solid #E7E7E7' : 'none' }}>
            <${Typography} variant="body2" sx=${{ fontWeight: 500 }}>${label}<//>
            <${Typography} variant="body2" color=${dim ? 'text.secondary' : 'text.primary'}>${value}<//>
          <//>`)}
      <//>
    <//><//>`;
}

const faParamFields = (t, lang, row, tuValue) => {
  const p = rowPeriod({ dataset: { von: (row && row.von) || '', bis: (row && row.bis) || '',
                                    period: (row && row.periodKey) || '' } });
  const un = t('fa_mask_unlimited');
  return [
    [lang === 'de' ? 'von' : 'from', fmtDate(p.von, lang)],
    [lang === 'de' ? 'bis' : 'to', fmtDate(p.bis, lang)],
    [t('fa_mask_wochentage'), un, true],
    [t('fa_mask_rpv'), 'RPV'],
    [t('fa_mask_vm'), t('fa_vm_modes')],
    [t('fa_mask_konz'), t('fa_mask_licensed')],
    [t('fa_mask_tus'), tuValue || un, !tuValue],
    [t('fa_mask_regionen'), un, true],
    [t('fa_mask_kantone'), un, true],
    [t('fa_mask_linien'), un, true],
  ];
};

const connParamFields = (t, lang, row) => {
  const f = faParamFields(t, lang, row);
  f[3] = [t('fa_mask_rpv'), 'RPV + OV'];
  f[4] = [t('fa_mask_vm'), t('fa_mask_unlimited'), true];
  return f;
};
const laParamFields = (t, lang, row) => {
  const p = rowPeriod({ dataset: { von: (row && row.von) || '', bis: (row && row.bis) || '', period: (row && row.periodKey) || '' } });
  const un = t('fa_mask_unlimited');
  return [
    [lang === 'de' ? 'von' : 'from', fmtDate(p.von, lang)], [lang === 'de' ? 'bis' : 'to', fmtDate(p.bis, lang)],
    [t('fa_mask_wochentage'), un, true], [t('la_time_from'), un, true], [t('la_time_to'), un, true],
    ['TU', 'AAGL'], [t('filter_base_line'), '50.070']];
};

// Group tints, as production's columns are tinted: trips / journey time / stops
const FA_TINT = ['rgba(139,195,74,0.14)', 'rgba(126,87,194,0.10)', 'rgba(255,152,0,0.13)'];
const faRate = (a, b) => faPct(a, b).toFixed(2) + '%';

/* ── Mock data for Trip Failures ─────────────────────────────────────
   Ignat, 2026-10-06: "all data should be mock. At the moment it is more
   important to show the connections between screens: you click here, and
   you get there." The vanilla had cancelled trips for AAGL only and causes
   for three TUs, so most icons led to an empty mask. Every TU and day now has
   trips, generated deterministically from FA_DATA (same counts, same days),
   and the Übersicht shares are computed FROM those trips — so the overview,
   the table and the mask describe the same cancellations. The cancellation
   types are production's own labels. */
const FA_ARTEN = [
  ['6. Teilstrecke einer Fahrt hat Status Unbekannt', '#A5E28F'],
  ['3. Ganze Fahrt hat Status Unbekannt', '#D2EE9A'],
  ['11. Teilstrecke als Ausfall gemeldet', '#A3A0EE'],
  ['2. Keine Echtzeitdaten für ganze Fahrt', '#EF9A9A'],
  ['4. Ganze Fahrt über Takt', '#7986CB'],
];
const FA_TU_MODE = (() => {
  const m = {};
  PUNCT_RECORDS.forEach(r => { if (!m[r.tu_konz]) m[r.tu_konz] = r.vm; });
  return m;
})();
const faModeOf = (tu, i) => FA_TU_MODE[tu] || ['Bus', 'Bahn', 'Tram'][i % 3];
// replacement transport per day: mock, mostly none
const faErsatzOf = (ti, di) => (di % 5 === 3 ? 'fa_ersatz_teil' : (ti + di) % 7 === 5 ? 'fa_ersatz_komplett' : 'fa_kein_ersatz');
const ERSATZ_KEY = { fa_kein_ersatz: 'kein', fa_ersatz_teil: 'teil', fa_ersatz_komplett: 'komplett' };
const hhmm = m => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}:00`;
const FA_MASK_ROWS = (() => {
  const out = [];
  FA_DATA.tus.forEach((tu, ti) => {
    // a TU with cancellations but no daily breakdown still gets its trips,
    // on the evaluation's last day, so its mask is never empty
    const days = (tu.tage || []).some(d => d.v[1]) ? tu.tage
      : tu.v[1] ? [{ d: '23.06.2026', v: tu.v }] : [];
    days.forEach((d, di) => {
    const n = Math.min(d.v[1] || 0, 8);
    for (let k = 0; k < n; k++) {
      const seed = ti * 97 + di * 31 + k * 7;
      const a = RD_STOPS[seed % RD_STOPS.length], b = RD_STOPS[(seed + 3) % RD_STOPS.length];
      const from = 300 + (seed * 37) % 1100, dur = 6 + seed % 34;
      const art = (k + ti) % 6 === 4 ? 2 : (k + di) % 4 === 1 ? 1 : (ti % 5 === 3 && k % 2) ? 3 : 0;
      out.push({
        r: [d.d, tu.id, String(800 + ti), `${tu.id} BusÜ ${1 + k % 2}`, `${50 + ti}.0${70 + k % 4}`,
            String(70000 + ti * 1000 + di * 10 + k), `ch:1:sjyid:1000${ti}:${15000 + seed}-001`,
            `(${a[0]}) ${a[1]}`, hhmm(from), `(${b[0]}) ${b[1]}`, hhmm(from + dur),
            String(2 + seed % 15), FA_ARTEN[art][0]],
        dur, mode: faModeOf(tu.id, ti),
        ersatz: ERSATZ_KEY[faErsatzOf(ti, di)],
        cause: seed % 9 === 4 ? 'tech' : seed % 13 === 7 ? 'ktu' : 'none',
      });
    }
    });
  });
  return out.map((x, i) => ({ ...x, i }));
})();
// the Übersicht for one entity: totals from FA_DATA, shares from its trips
const faUbData = (dim, ent) => {
  const tus = dim === 'vm'
    ? FA_DATA.tus.filter((tu, i) => faModeOf(tu.id, i) === ent)
    : ent === 'GESAMT' ? FA_DATA.tus : FA_DATA.tus.filter(tu => tu.id === ent);
  const v = ent === 'GESAMT' && dim !== 'vm' ? FA_DATA.gesamt
    : tus.reduce((s, tu) => s.map((x, i) => x + tu.v[i]), [0, 0, 0, 0, 0, 0]);
  const ids = new Set(tus.map(tu => tu.id));
  const rows = FA_MASK_ROWS.filter(x => ids.has(x.r[1]));
  const tot = rows.reduce((s, x) => s + x.dur, 0) || 1;
  const causes = FA_ARTEN.map(([label, color]) => ({ label, color,
    pct: rows.filter(x => x.r[12] === label).reduce((s, x) => s + x.dur, 0) / tot * 100 }))
    .filter(c => c.pct > 0);
  return { totalMin: v[2], ausMin: v[3], causes };
};
const FA_UB_MODES = [...new Set(FA_DATA.tus.map((tu, i) => faModeOf(tu.id, i)))].sort();

/* Production's flow chart: one bar for the cancelled time on the left, one
   per cause on the right, each flow as wide as that cause's share. */
function FaSankey({ causes }) {
  const W = 1000, H = 300, NODE = 20, GAP = 10;
  const list = [...causes].sort((a, b) => b.pct - a.pct);
  const usable = H - GAP * Math.max(0, list.length - 1);
  // a right-hand node is never thinner than its 14px label: small causes get
  // MIN, the rest share what is left in proportion. The left side stays exact.
  const MIN = 24;
  const raw = list.map(c => usable * c.pct / 100);
  const small = raw.filter(h => h < MIN).length;
  const bigSum = raw.filter(h => h >= MIN).reduce((s, h) => s + h, 0) || 1;
  const scale = (usable - small * MIN) / bigSum;
  let yl = 0, yr = 0;
  const flows = list.map((c, i) => {
    const h = raw[i] < MIN ? MIN : raw[i] * scale;
    const f = { c, h, r0: yr, lTop: yl, lH: H * c.pct / 100 };
    yl += f.lH; yr += h + GAP;
    return f;
  });
  return html`
    <svg viewBox=${`0 0 ${W} ${H}`} width="100%" role="img" id="fa-ub-sankey"
         style=${{ display: 'block', maxHeight: 320 }}>
      <rect x="0" y="0" width=${NODE} height=${H} fill="#2B5F8E" />
      ${flows.map((f, i) => {
        const x0 = NODE, x1 = W - NODE, mx = (x0 + x1) / 2;
        const a0 = f.lTop, a1 = f.lTop + f.lH, b0 = f.r0, b1 = f.r0 + f.h;
        const d = `M${x0},${a0} C${mx},${a0} ${mx},${b0} ${x1},${b0} L${x1},${b1} C${mx},${b1} ${mx},${a1} ${x0},${a1} Z`;
        return html`
          <g key=${i} className="fa-ub-flow">
            <path d=${d} fill=${f.c.color} fill-opacity="0.75" />
            <rect x=${W - NODE} y=${b0} width=${NODE} height=${Math.max(f.h, 1)} fill="#2B5F8E" />
            <text x=${W - NODE - 8} y=${b0 + f.h / 2} text-anchor="end" dominant-baseline="middle"
                  font-size="14" fill="rgba(0,0,0,0.87)">
              ${f.c.label} <tspan font-weight="700">${f.c.pct.toFixed(2)}%</tspan>
            </text>
          </g>`;
      })}
    </svg>`;
}

function FaOverview({ t, lang }) {
  const [dim, setDim] = useState('tu');
  const modes = FA_UB_MODES;
  const entities = dim === 'vm' ? modes : ['GESAMT', ...FA_DATA.tus.map(x => x.id)];
  const [ent, setEnt] = useState(FA_DATA.tus[0].id);
  React.useEffect(() => { if (!entities.includes(ent)) setEnt(entities[0]); }, [dim]);
  const d = entities.includes(ent) ? faUbData(dim, ent) : null;
  const entLabel = k => k === 'GESAMT' ? t('fa_mask_all') : k;
  const [snap, setSnap] = useState(false);
  return html`
    <${Box} id="fa-overview">
      <${Stack} direction="row" spacing=${2} alignItems="flex-start" sx=${{ mb: 2 }}>
        <${FilterSelect} id="fa-ub-dim" label=${t('sel_dimension')} value=${dim} minWidth=${180}
          onChange=${v => setDim(v || 'tu')}
          options=${[{ value: 'tu', label: t('fa_opt_tu') },
                     ...(modes.length ? [{ value: 'vm', label: t('fa_opt_vm') }] : [])]} />
        <${FilterSelect} id="fa-ub-tu-sel" label=${t('sel_entity')} value=${ent} minWidth=${180}
          onChange=${v => setEnt(v || entities[0])}
          options=${entities.map(k => ({ value: k, label: entLabel(k) }))} />
        <${Box} sx=${{ flex: 1 }} />
        <${Link} href="#" onClick=${e => e.preventDefault()} id="fa-ub-infoblatt"
          sx=${{ display: 'inline-flex', alignItems: 'center', gap: .5, pt: 1.5 }}>
          ${t('fa_infoblatt')} <${Icon} sx=${{ fontSize: 16 }}>open_in_new<//><//>
      <//>
      ${d && html`
        <${Card} id="fa-ub-card"><${CardContent} sx=${{ position: 'relative' }}>
          <${Tooltip} title=${t('fa_ub_camera')}>
            <${IconButton} aria-label=${t('fa_ub_camera')} id="fa-ub-camera"
              onClick=${() => setSnap(true)} sx=${{ position: 'absolute', top: 8, right: 8 }}>
              <${Icon}>photo_camera<//><//>
          <//>
          <${Typography} variant="h6" align="center" id="fa-ub-title" sx=${{ mb: 2 }}>
            ${t('fa_ub_title_prefix')} - ${dim === 'vm' ? t('fa_opt_vm') : 'TU'}: ${entLabel(ent)}<//>
          <${Typography} variant="body1" id="fa-ub-summary" sx=${{ mb: 1.5 }}>
            <b>${t('fa_ub_rate')}: ${(d.ausMin / d.totalMin * 100).toFixed(2)}%</b>
            ${' '}(${t('fa_ub_summary_from')} ${fmtHM(d.totalMin)}${t('fa_ub_summary_sind') === ',' ? ',' : ' ' + t('fa_ub_summary_sind')} ${fmtHM(d.ausMin)} ${t('fa_ub_summary_gefallen')})
          <//>
          ${d.causes.length > 0 && html`<${FaSankey} causes=${d.causes} />`}
        <//><//>`}
      <${Snackbar} open=${snap} autoHideDuration=${2500} onClose=${() => setSnap(false)}
        message=${t('chart_snapshot_done')} />
    <//>`;
}

/* One table row. The tree is Gesamt → TU → Betriebstag → Ersatzverkehr,
   each level present only when its breakdown is chosen. */
function FaRow({ node, depth, t, onChart, onMask, hideZero, startOpen }) {
  const { lang } = useT();
  const [open, setOpen] = useState(!!startOpen);
  const v = node.v;
  const kids = (node.kids || []).filter(k => !hideZero || k.v[1] || k.v[3] || k.v[5]);
  const cell = (g, content, bold) => html`
    <${TableCell} align="right" sx=${{ bgcolor: FA_TINT[g], fontWeight: bold ? 700 : 400 }}>${content}<//>`;
  return html`
    <${React.Fragment}>
      <${TableRow} hover data-depth=${depth} className="fa-row">
        <${TableCell} sx=${{ pl: `${8 + depth * 20}px`, whiteSpace: 'nowrap' }}>
          ${kids.length ? html`
            <${IconButton} onClick=${() => setOpen(o => !o)} className="fa-expand"
              aria-label=${open ? 'collapse' : 'expand'} aria-expanded=${open}>
              <${Icon} sx=${{ fontSize: 18 }}>${open ? 'expand_more' : 'chevron_right'}<//>
            <//>` : html`<${Box} component="span" sx=${{ display: 'inline-block', width: 30 }} />`}
          <${Box} component="span" sx=${{ ml: .5, fontWeight: depth === 0 ? 500 : 400 }}>${fmtDate(node.label, lang)}<//>
        <//>
        ${cell(0, v[0])}${cell(0, v[1])}${cell(0, faRate(v[1], v[0]), true)}
        ${cell(1, fmtMin(v[2]))}${cell(1, fmtMin(v[3]))}${cell(1, faRate(v[3], v[2]), true)}
        ${cell(2, v[4])}${cell(2, v[5])}${cell(2, faRate(v[5], v[4]), true)}
        ${/* Ignat, 2026-10-06: "previously we agreed to have all icons at the
              end of the rows. Check Pünktlichkeit." Production puts them first;
              the agreement wins. Same icons and order as PunctRow. */''}
        <${TableCell} align="right" sx=${{ whiteSpace: 'nowrap' }}>
          ${node.chart !== false && html`
            <${Tooltip} title=${t('rpt_action_chart')}>
              <${IconButton} aria-label="chart" className="fa-chart-btn" onClick=${() => onChart(node)}>
                <${Icon}>bar_chart<//><//><//>
            <${Tooltip} title=${t('fa_mask_title')}>
              <${IconButton} aria-label="mask" className="fa-mask-btn" onClick=${() => onMask(node)}>
                <${Icon}>table_chart<//><//><//>`}
        <//>
      <//>
      ${open && kids.map((k, i) => html`
        <${FaRow} key=${k.id + i} node=${k} depth=${depth + 1} t=${t} hideZero=${hideZero}
          onChart=${onChart} onMask=${onMask} />`)}
    <//>`;
}

function ReportTripFailures({ go, row }) {
  const { t, lang } = useT();
  const [tab, setTab] = useState(0);
  // production's defaults: TU · Betriebstag · none, and additionally Ersatzverkehr
  const [dims, setDims] = useState(['tu', 'betriebstag', '']);
  const [add, setAdd] = useState(['ersatz', '']);
  const [netto, setNetto] = useState(false);
  const [hideZero, setHideZero] = useState(false);

  const FA_DIMS = ['tu', 'betriebstag', 'linie', 'vm', 'region'];
  const ADD_DIMS = ['ersatz', 'betriebstag', 'linie', 'vm'];
  const dimLabel = d => d === 'ersatz' ? t('fa_opt_ersatz') : t(PUNCT_DIM_LABELS[d] || 'fa_opt_' + d);
  const setLevel = setArr => (i, v) => setArr(d => {
    const n = [...d]; n[i] = v;
    for (let j = i + 1; j < n.length; j++) n[j] = '';
    return n;
  });

  // the tree the chosen breakdown produces, from FA_DATA
  const withDays = dims.includes('betriebstag');
  const withErsatz = add.includes('ersatz');
  const tree = useMemo(() => ({
    id: 'GESAMT', label: t('fa_row_gesamt'), v: FA_DATA.gesamt,
    kids: FA_DATA.tus.map(tu => ({
      id: tu.id, label: tu.label, v: tu.v, tu: tu.id,
      kids: withDays ? (tu.tage || []).map((d, di) => ({
        id: tu.id + '/' + d.d, label: d.d, v: d.v, tu: tu.id, day: d.d,
        kids: withErsatz && (d.v[1] || d.v[3] || d.v[5]) ? [{
          id: tu.id + '/' + d.d + '/e', label: t(faErsatzOf(FA_DATA.tus.indexOf(tu), di)), v: d.v,
          tu: tu.id, day: d.d, chart: false, kids: [] }] : [],
      })) : [],
    })),
  }), [withDays, withErsatz, t]);

  const onChart = node => go('fa-chart', row, { node });
  const onMask = node => go('mask', row, { tuId: node.tu || 'GESAMT', day: node.day });

  return html`
    <${Box}>
      <${PageHeader}
        crumbs=${[{ label: t('nav_evaluations'), onClick: () => go('list') },
                  { label: row ? row.name : t('type_trip_failures') }]}
        title=${row ? row.name : t('type_trip_failures')} subtitle=${t('type_trip_failures')}
        action=${html`<${Button} variant="outlined"
                        startIcon=${html`<${Icon} sx=${{ fontSize: 18 }}>download<//>`}>${t('export_csv')}<//>`} />
      <${Box} sx=${{ p: 3 }}>
        <${ParamGrid} id="fa-params" fields=${faParamFields(t, lang, row)} />
        <${Tabs} value=${tab} onChange=${(e, v) => setTab(v)} sx=${{ mb: 2 }} id="fa-tabs">
          <${Tab} label=${t('fa_tab_ubersicht')} id="fa-tab-ub" />
          <${Tab} label=${t('fa_tab_tabelle')} id="fa-tab-tab" />
        <//>

        ${tab === 0 ? html`<${FaOverview} t=${t} lang=${lang} />` : html`
          <${Box} id="fa-tabelle">
            <${Card} sx=${{ mb: 2 }}><${CardContent}>
              <${Box} sx=${{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <${Box}>
                  <${Typography} variant="subtitle2" sx=${{ mb: 1 }}>${t('fa_aufschluss_label')}<//>
                  <${Stack} direction="row" spacing=${1}>
                    ${[0, 1, 2].map(i => html`
                      <${FilterSelect} key=${i} id=${'fa-auf-' + (i + 1)} minWidth=${170}
                        label=${t(['sel_breakdown_1', 'sel_breakdown_2', 'sel_breakdown_3'][i])}
                        value=${dims[i]} onChange=${v => setLevel(setDims)(i, i === 0 ? (v || 'tu') : v)}
                        options=${FA_DIMS.filter(d => !dims.some((x, j) => x === d && j !== i))
                          .map(d => ({ value: d, label: dimLabel(d) }))} />`)}
                  <//>
                <//>
                <${Box}>
                  <${Typography} variant="subtitle2" sx=${{ mb: 1 }}>${t('fa_add_aufschluss_label')}<//>
                  <${Stack} direction="row" spacing=${1}>
                    ${[0, 1].map(i => html`
                      <${FilterSelect} key=${i} id=${'fa-add-' + (i + 1)} minWidth=${i === 0 ? 300 : 170}
                        label=${t(i === 0 ? 'sel_additional_1' : 'sel_additional_2')}
                        value=${add[i]} onChange=${v => setLevel(setAdd)(i, v)}
                        options=${ADD_DIMS.filter(d => !add.some((x, j) => x === d && j !== i))
                          .map(d => ({ value: d, label: dimLabel(d) }))} />`)}
                  <//>
                <//>
                <${Box}>
                  <${Typography} variant="subtitle2" sx=${{ mb: .5 }}>${t('fa_netto_label')}<//>
                  <${FormControlLabel} control=${html`<${Checkbox} id="fa-netto"
                      checked=${netto} onChange=${e => setNetto(e.target.checked)} />`}
                    label=${t('fa_ersatz_cb')} />
                <//>
                <${Box}>
                  <${Typography} variant="subtitle2" sx=${{ mb: .5 }}>${t('fa_filter_label')}<//>
                  <${FormControlLabel} control=${html`<${Checkbox} id="fa-hide-zero"
                      checked=${hideZero} onChange=${e => setHideZero(e.target.checked)} />`}
                    label=${t('fa_filter_hide_cb')} />
                <//>
                <${Box} sx=${{ flex: 1 }} />
                <${Link} href="#" onClick=${e => e.preventDefault()} sx=${{ pt: 1 }}>${t('fa_infoblatt')}<//>
              <//>
            <//><//>

            <${TableContainer} component=${Paper} variant="outlined" sx=${{ borderColor: '#E7E7E7' }}>
              <${Table} id="fa-table">
                <${TableHead}>
                  <${TableRow}>
                    <${TableCell} />
                    ${['fa_col_fahrten_ges', 'fa_col_fahrten_aus', 'fa_col_fahrten_q',
                       'fa_col_fahrtzeit_ges', 'fa_col_fahrtzeit_aus', 'fa_col_fahrtzeit_q',
                       'fa_col_halt_ges', 'fa_col_halt_aus', 'fa_col_halt_q'].map((k, i) => html`
                      <${TableCell} key=${k} align="right"
                        sx=${{ bgcolor: FA_TINT[Math.floor(i / 3)] }}>${t(k)}<//>`)}
                    <${TableCell} align="right">${t('col_actions')}<//>
                  <//>
                <//>
                <${TableBody}>
                  <${FaRow} node=${tree} depth=${0} t=${t} hideZero=${hideZero} startOpen
                    onChart=${onChart} onMask=${onMask} />
                <//>
              <//>
            <//>
          <//>`}
      <//>
    <//>`;
}

/* The chart icon's view: the three cancellation rates of each child of the
   row, grouped, as production's popup draws them. It stays a page with a
   breadcrumb — Ignat's rule from 2026-08-28 for row drill-ins. */
function FaChart({ go, row, node }) {
  const { t, lang } = useT();
  const p = rowPeriod({ dataset: { von: (row && row.von) || '', bis: (row && row.bis) || '',
                                    period: (row && row.periodKey) || '' } });
  const kids = (node.kids || []).length ? node.kids : [node];
  const SER = [['fa_chart_quot_fahrten', 1, 0, '#3B78B5'], ['fa_chart_quot_fahrtzeit', 3, 2, '#F28E2B'],
               ['fa_chart_quot_halt', 5, 4, '#59A14F']];
  const vals = kids.map(k => SER.map(([, a, b]) => faPct(k.v[a], k.v[b])));
  const max = Math.max(1, ...vals.flat());
  const top = max > 50 ? 100 : Math.ceil(max / 5) * 5;
  const W = 900, H = 360, L = 80, B = 50, plotW = W - L - 20, plotH = H - B - 20;
  const groupW = plotW / kids.length, barW = Math.min(24, groupW / 4);
  const pct = n => n.toFixed(2).replace('.', lang === 'de' ? ',' : '.') + '%';
  const sub = [node.tu || '', node.day ? fmtDate(node.day, lang) : ''].filter(Boolean).join(', ')
    || node.label;
  return html`
    <${Box}>
      <${PageHeader}
        crumbs=${[{ label: t('nav_evaluations'), onClick: () => go('list') },
                  { label: row ? row.name : t('type_trip_failures'), onClick: () => go('report', row) },
                  { label: t('rpt_action_chart') }]}
        title=${t('rpt_action_chart')} subtitle=${sub} />
      <${Box} sx=${{ p: 3 }}>
        <${ParamGrid} id="fa-chart-params" fields=${[...faParamFields(t, lang, row, node.tu)
            .map((f, i) => i === 6 && node.tu && !node.day ? [f[0], f[1], false, true] : f),
          ...(node.day ? [[t('fa_opt_tag'), fmtDate(node.day, lang), false, true]] : [])]} />
        <${Card}><${CardContent}>
          <${Typography} variant="h6" align="center" id="fa-chart-title">
            ${t('fa_chart_period')}: ${fmtDate(p.von, lang)} - ${fmtDate(p.bis, lang)}<//>
          <${Typography} variant="body1" align="center" sx=${{ mb: 2 }} id="fa-chart-sub">${sub}<//>
          <${Box} sx=${{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>
            <svg viewBox=${`0 0 ${W} ${H}`} width="100%" id="fa-chart-svg" style=${{ flex: 1 }}>
              ${[0, .2, .4, .6, .8, 1].map(f => {
                const y = 20 + plotH * (1 - f);
                return html`<g key=${f}>
                  <line x1=${L} x2=${W - 20} y1=${y} y2=${y} stroke="#E7E7E7" />
                  <text x=${L - 8} y=${y} text-anchor="end" dominant-baseline="middle" font-size="14"
                        fill="rgba(0,0,0,0.6)">${pct(top * f)}</text></g>`;
              })}
              ${kids.map((k, i) => html`<g key=${i} className="fa-chart-group">
                ${SER.map((s, j) => {
                  const v = vals[i][j], h = plotH * Math.min(v, top) / top;
                  const x = L + groupW * i + groupW / 2 - barW * 1.5 + barW * j;
                  return html`<rect key=${j} className="fa-chart-bar" x=${x} y=${20 + plotH - h}
                    width=${barW - 2} height=${h} fill=${s[3]}><title>${t(s[0])}: ${pct(v)}</title></rect>`;
                })}
                <text x=${L + groupW * i + groupW / 2} y=${H - B + 22} text-anchor="middle" font-size="14"
                      fill="rgba(0,0,0,0.87)">${fmtDate(k.label, lang)}</text>
              </g>`)}
            </svg>
            <${Stack} spacing=${1} id="fa-chart-legend" sx=${{ minWidth: 220, pt: 2 }}>
              ${SER.map(s => html`<${Stack} key=${s[0]} direction="row" spacing=${1} alignItems="center">
                <${Box} sx=${{ width: 14, height: 14, bgcolor: s[3] }} />
                <${Typography} variant="body2">${t(s[0])}<//><//>`)}
            <//>
          <//>
        <//><//>
      <//>
    <//>`;
}

/* ── Screen: Data Quality Index DPM ───────────────────────────────────
   Ten indicators across transport companies and cantons. dqiBand() —
   extracted — gives each indicator's observed min/max, which is what the
   colouring is relative to; a fixed scale would make every column look
   identical because they all sit in the high nineties. */
/**
 * Screen: Data Quality Index.
 *
 * Ignat, 2026-09-22, with his screen beside mine: "tables have different names,
 * different structure... I need same data." Everything below is read off
 * renderDqiTable()/renderDqiParams() rather than designed:
 *   · the ten columns are named "<n>. <indicator>", not numbered 1–10
 *   · a Swiss-average (RPV) row sits above the entities
 *   · a value BELOW the national average is red, and each cell carries its
 *     detail button
 *   · every row has chart / by-day / LOG actions
 *   · the Table tab breaks down through three cascading levels and can show
 *     only below-average entries — Show/Entity belong to OVERVIEW, and I had
 *     them on the wrong tab
 *   · the params chip row and the scope note were missing entirely
 */
function ReportDQI({ go, row }) {
  const { t, lang } = useT();
  const [tab, setTab] = useState('overview');
  const [scope, setScope] = useState('tu');
  const [entity, setEntity] = useState('');
  const [dims, setDims] = useState(['', '', '']);
  const [onlyBelow, setOnlyBelow] = useState(false);
  const [open, setOpen] = useState([]);
  const [note, setNote] = useState('');

  const rows = scope === 'tu' ? DQI_TU : DQI_KANTON;          // dqiEntities()
  const bands = useMemo(() => DQI_INDICATORS.map((_, i) => dqiBand(i)), []);
  const entities = rows.filter(r => !r.total);
  // renderDqiOverview() falls back to entities[1], then [0], when none is picked
  const sel = entities.find(e => e.label === entity) || rows[1] || rows[0];
  const dqiPct = v => v.toFixed(2).replace('.', ',') + '%';   // the vanilla's own

  const anyBelow = e => e.v.some((v, i) => v < DQI_NATIONAL[i]);
  const visible = rows.filter(r => r.total || !onlyBelow || anyBelow(r));
  const hiddenCount = rows.filter(r => !r.total && onlyBelow && !anyBelow(r)).length;

  // the cascade: a level never offers what a level above it already took
  const DIM_LEVELS = [
    [['tu', 'dqi_dim_tu'], ['go', 'dqi_dim_go'], ['region', 'fa_opt_region']],
    [['go', 'dqi_dim_go'], ['region', 'fa_opt_region'], ['betriebstag', 'fa_opt_tag']],
    [['region', 'fa_opt_region'], ['betriebstag', 'fa_opt_tag']],
  ];
  const setLevel = (i, v) => setDims(d => {
    const n = [...d]; n[i] = v;
    for (let k = i + 1; k < 3; k++) if (n[k] === v) n[k] = '';
    return n;
  });

  return html`
    <${Box}>
      <${PageHeader}
        crumbs=${[{ label: t('nav_evaluations'), onClick: () => go('list') },
                  { label: row ? row.name : t('type_data_quality') }]}
        title=${row ? row.name : t('type_data_quality')}
        subtitle=${t('type_data_quality')}
        action=${html`<${Stack} direction="row" spacing=${1} alignItems="center">
          <${Tooltip} title=${t('dqi_infoblatt')}><${IconButton} aria-label=${t('dqi_infoblatt')} id="dqi-infoblatt">
            <${Icon}>description<//><//><//>
          <${Button} variant="outlined"
            startIcon=${html`<${Icon} sx=${{ fontSize: 18 }}>download<//>`}>${t('export_csv')}<//><//>`} />

      <${Box} sx=${{ p: 3 }}>
        <${ParamGrid} id="dqi-params" fields=${faParamFields(t, lang, row)} />
        <${Tabs} value=${tab} onChange=${(e, v) => setTab(v)} id="dqi-tabs" sx=${{ mb: 2 }}>
          <${Tab} value="overview" label=${t('dqi_tab_overview')} />
          <${Tab} value="table" label=${t('dqi_tab_table')} />
        <//>

        ${tab === 'overview' && html`
          <${Box} id="dqi-overview">
            ${/* "Anzeigen" — Show/Entity live on THIS tab in the vanilla */''}
            <${Card} sx=${{ mb: 3 }}><${CardContent}>
              <${Typography} variant="subtitle2" sx=${{ mb: 1.5 }}>${t('dqi_show')}<//>
              <${Stack} direction="row" spacing=${2} flexWrap="wrap" useFlexGap>
                <${FilterSelect} id="dqi-dim" label=${t('sel_dimension')} value=${scope}
                  onChange=${v => { setScope(v || 'tu'); setEntity(''); }} minWidth=${240}
                  options=${[{ value: 'tu', label: t('dqi_dim_tu') },
                             { value: 'kanton', label: t('dqi_dim_kanton') }]} />
                <${FilterSelect} id="dqi-entity" label=${t('sel_entity')} value=${entity}
                  onChange=${setEntity} minWidth=${240}
                  options=${entities.map(e => ({ value: e.label, label: e.label }))} />
              <//>
            <//><//>

            ${/* renderDqiOverview(): one ROW per indicator — a 12-month spark,
                  a 14-day spark, the indicator's name, and a 0–100 track
                  carrying the national band, the national average and this
                  entity. I had built a grid of ten cards instead, which was my
                  invention and had never been compared to anything. */''}
            <${Card} id="dqi-chart-card"><${CardContent}>
              <${Typography} variant="subtitle2" id="dqi-chart-title" sx=${{ mb: 2 }}>
                ${`${t('dqi_overview_of')} ${t(scope === 'kanton' ? 'dqi_dim_kanton' : 'dqi_word_tu')}: ${sel.label}`}
              <//>

              <${Box} sx=${{ display: 'grid', gap: 1, alignItems: 'center',
                              gridTemplateColumns: '110px 110px minmax(200px, 1fr) minmax(220px, 2fr)' }}>
                <${Typography} variant="caption" color="text.secondary">${t('dqi_trend_12m')}<//>
                <${Typography} variant="caption" color="text.secondary">${t('dqi_trend_14d')}<//>
                <${Box} /><${Box} />

                ${DQI_INDICATORS.map((ind, i) => {
                  const band = bands[i];
                  const v = sel.v[i], avg = DQI_NATIONAL[i];
                  const left = band.min, width = Math.max(0.6, band.max - band.min);
                  return html`
                    <${React.Fragment} key=${ind.n}>
                      <${Box} dangerouslySetInnerHTML=${{ __html: dqiSpark(sel.label, i, 12) }} />
                      <${Box} dangerouslySetInnerHTML=${{ __html: dqiSpark(sel.label, i, 14) }} />
                      <${Typography} variant="caption">
                        <strong>${ind.n}.</strong> ${t(ind.key)}<//>
                      <${Tooltip} title=${`${t('dqi_lg_avg')} ${dqiPct(avg)} · ${sel.label} ${dqiPct(v)}`}>
                        <${Box} className="dqi-track"
                          sx=${{ position: 'relative', height: 18, bgcolor: '#F4F4F4',
                                  borderRadius: 1 }}>
                          <${Box} sx=${{ position: 'absolute', top: 6, height: 6, borderRadius: 3,
                                          bgcolor: 'rgba(33,150,243,.25)',
                                          left: `${left}%`, width: `${width}%` }} />
                          <${Box} sx=${{ position: 'absolute', top: 4, width: 10, height: 10,
                                          transform: 'rotate(45deg)', bgcolor: 'text.disabled',
                                          left: `calc(${avg}% - 5px)` }} />
                          <${Box} sx=${{ position: 'absolute', top: 4, width: 10, height: 10,
                                          transform: 'rotate(45deg)', bgcolor: 'primary.main',
                                          left: `calc(${v}% - 5px)` }} />
                        <//>
                      <//>
                    <//>`;
                })}
              <//>

              ${/* the 0–100 axis under the track column */''}
              <${Box} sx=${{ display: 'grid', mt: .5,
                              gridTemplateColumns: '110px 110px minmax(200px, 1fr) minmax(220px, 2fr)' }}>
                <${Box} /><${Box} /><${Box} />
                <${Stack} direction="row" justifyContent="space-between" id="dqi-axis">
                  ${[0, 20, 40, 60, 80, 100].map(n => html`
                    <${Typography} key=${n} variant="caption" color="text.secondary">${n}<//>`)}
                <//>
              <//>

              <${Stack} direction="row" spacing=${3} sx=${{ mt: 2 }} flexWrap="wrap" useFlexGap
                        id="dqi-legend">
                <${Stack} direction="row" spacing=${.75} alignItems="center">
                  <${Box} sx=${{ width: 18, height: 6, borderRadius: 3, bgcolor: 'rgba(33,150,243,.25)' }} />
                  <${Typography} variant="caption" color="text.secondary">${t('dqi_lg_band')}<//>
                <//>
                <${Stack} direction="row" spacing=${.75} alignItems="center">
                  <${Box} sx=${{ width: 9, height: 9, transform: 'rotate(45deg)', bgcolor: 'text.disabled' }} />
                  <${Typography} variant="caption" color="text.secondary">${t('dqi_lg_avg')}<//>
                <//>
                <${Stack} direction="row" spacing=${.75} alignItems="center">
                  <${Box} sx=${{ width: 9, height: 9, transform: 'rotate(45deg)', bgcolor: 'primary.main' }} />
                  <${Typography} variant="caption" color="text.secondary" id="dqi-legend-entity">
                    ${sel.label}<//>
                <//>
              <//>
            <//><//>
          <//>`}

        ${tab === 'table' && html`
          <${Box} id="dqi-table-panel">
            <${Card} sx=${{ mb: 3 }}><${CardContent}>
              <${Stack} direction="row" spacing=${4} flexWrap="wrap" useFlexGap alignItems="flex-start">
                <${Box}>
                  <${Typography} variant="subtitle2" sx=${{ mb: 1.5 }}>${t('rpt_aufschluss_label')}<//>
                  <${Stack} direction="row" spacing=${2} flexWrap="wrap" useFlexGap>
                    ${[0, 1, 2].map(i => html`
                      <${FilterSelect} key=${i} id=${'dqi-auf-' + (i + 1)} minWidth=${200}
                        label=${t(i === 0 ? 'sel_breakdown_1' : i === 1 ? 'sel_breakdown_2' : 'sel_breakdown_3')}
                        value=${dims[i]} onChange=${v => setLevel(i, v)}
                        options=${DIM_LEVELS[i]
                          .filter(([d]) => !dims.some((x, k) => x === d && k !== i))
                          .map(([d, key]) => ({ value: d, label: t(key) }))} />`)}
                  <//>
                <//>
                <${Box}>
                  <${Typography} variant="subtitle2" sx=${{ mb: 1 }}>${t('dqi_filter')}<//>
                  <${FormControlLabel}
                    control=${html`<${Checkbox} id="dqi-only-below" checked=${onlyBelow}
                      onChange=${e => setOnlyBelow(e.target.checked)} />`}
                    label=${html`<${Typography} variant="body2">${t('dqi_only_below')}<//>`} />
                <//>
              <//>
            <//><//>

            <${TableContainer} component=${Paper} variant="outlined" sx=${{ borderColor: '#E7E7E7' }}>
              <${Table} id="dqi-table">
                <${TableHead}><${TableRow}>
                  <${TableCell}>${t('rpt_col_name')}<//>
                  ${DQI_INDICATORS.map(ind => html`
                    <${TableCell} key=${ind.n} align="right" sx=${{ verticalAlign: 'bottom' }}>
                      <${Tooltip} title=${t(ind.key)}>
                        <${Box} sx=${{ display: 'flex', gap: .5, alignItems: 'flex-start',
                                        maxWidth: 130, ml: 'auto' }}>
                          <${Icon} sx=${{ fontSize: 14, color: 'text.disabled' }}>info<//>
                          <${Typography} variant="caption">${ind.n}. ${t(ind.key)}<//>
                        <//>
                      <//>
                    <//>`)}
                  <${TableCell} align="right">${t('col_actions')}<//>
                <//><//>
                <${TableBody}>
                  ${/* the Swiss average (RPV) row the vanilla puts above the
                        entities — every value below it is what turns red */''}
                  <${TableRow} id="dqi-row-avg" sx=${{ '& td': { fontWeight: 600, bgcolor: '#FAFAFA' } }}>
                    <${TableCell}>${t('dqi_lg_avg')}<//>
                    ${DQI_NATIONAL.map((v, i) => html`
                      <${TableCell} key=${i} align="right">${dqiPct(v)}<//>`)}
                    <${TableCell} />
                  <//>
                  ${visible.map((r, ri) => html`
                    <${TableRow} key=${r.label + ri} hover>
                      <${TableCell} sx=${r.total ? { fontWeight: 600 } : undefined}>${r.label}<//>
                      ${r.v.map((v, i) => html`
                        <${TableCell} key=${i} align="right"
                          sx=${{ color: v < DQI_NATIONAL[i] ? 'error.main' : 'text.primary' }}>
                          <${Box} sx=${{ display: 'inline-flex', alignItems: 'center', gap: .25 }}>
                            ${dqiPct(v)}
                            <${IconButton} aria-label="detail" size="small"
                              onClick=${() => setNote(t('dqi_open_detail') + ' · ' + r.label)}>
                              <${Icon} sx=${{ fontSize: 14 }}>list<//><//>
                          <//>
                        <//>`)}
                      <${TableCell} align="right">
                        <${Tooltip} title=${t('rpt_action_chart')}>
                          <${IconButton} aria-label="chart" onClick=${() => go('chart', row, { chart: {
                            title: r.label, backLabel: t('type_data_quality'),
                            format: v => v.toFixed(2) + '%',
                            items: DQI_INDICATORS.map((ind, i) => ({ label: String(ind.n), value: r.v[i] })),
                          } })}><${Icon}>bar_chart<//><//>
                        <//>
                        <${Tooltip} title=${t('dqi_by_day')}>
                          <${IconButton} aria-label="by-day"
                            onClick=${() => setNote(t('dqi_by_day_toast'))}>
                            <${Icon}>calendar_today<//><//>
                        <//>
                        <${Button} size="small" aria-label="log"
                          onClick=${() => setNote(t('dqi_log_toast'))}>LOG<//>
                      <//>
                    <//>`)}
                <//>
              <//>
            <//>

            <${Stack} direction="row" spacing=${.75} alignItems="center" sx=${{ mt: 1.5 }}
                      id="dqi-table-note">
              <${Icon} sx=${{ fontSize: 14, color: 'text.secondary' }}>info<//>
              <${Typography} variant="caption" color="text.secondary">
                ${t('dqi_note_red').replace('{n}', String(visible.filter(r => !r.total).length))}
                ${onlyBelow ? ' ' + t('dqi_note_filtered').replace('{n}', String(hiddenCount)) : ''}
              <//>
            <//>
          <//>`}
      <//>
      <${Snackbar} open=${!!note} autoHideDuration=${3000} message=${note}
        onClose=${() => setNote('')} id="dqi-toast" />
    <//>`;
}

/* ── Screen: raw data ─────────────────────────────────────────────────
   One component for both raw sets — PUNCT_RAW is 4 950 x 18, RPT_RAW is
   140 x 13 — with per-column filters and paging. Every column filter is
   an ordinary text field: a Select would need MUI X Pro for multi-column
   filtering, which the licence question has not settled. */
/* The raw table's eighteen columns are NAMED in the vanilla's markup; the port
   numbered them 1…18, which tells a reader nothing about what they are looking
   at. Ignat, 2026-09-22: "tables have different names". The vanilla's
   punct-raw-pp also starts at 10 rows, not 25. */
const RAW_COLS = ['punct_raw_col_tag', 'punct_raw_col_bavlinie', 'punct_raw_col_qualrel',
  'punct_raw_col_tulinie', 'punct_raw_col_fahrtid', 'punct_raw_col_richtung',
  'punct_raw_col_lfdnr', 'punct_raw_col_messpunkt', 'punct_raw_col_soll_bav_an',
  'punct_raw_col_soll_tu_an', 'punct_raw_col_ist_tu_an', 'punct_raw_col_delta_bav_an',
  'punct_raw_col_delta_tu_an', 'punct_raw_col_soll_bav_ab', 'punct_raw_col_soll_tu_ab',
  'punct_raw_col_ist_tu_ab', 'punct_raw_col_delta_bav_ab', 'punct_raw_col_delta_tu_ab'];

/* Two of the eighteen filters are SELECTS in the vanilla, not free text —
   quality-relevant (ja/nein) and direction. Everything else is a search box.
   Enumerated columns get a list; that is a per-column decision, not the MUI X
   Pro multi-column feature the licence question is about. */
const RAW_ENUM = { 2: ['ja', 'nein'], 5: ['Hinrichtung', 'Rückrichtung'] };

function RawDataTable({ go, row, rows: allRows, title, onBack, backLabel, node }) {
  const { t, lang } = useT();
  /* production 2026-10-26: the table icon opens the data of THAT row — a
     line's measurements, a bundle's lines — under the parameter grid, with
     the row you came from as the highlighted field. Mock: matched on the
     TU line number at the start of each leaf label. */
  const leafLines = n => !n ? [] : (n.children && n.children.length ? n.children.flatMap(leafLines)
    : [String(n.label).match(/^(\d+)\s/)].filter(Boolean).map(m => m[1]));
  let lineSet = new Set(node && node.dim ? leafLines(node) : []);
  // a leaf with no line number of its own (Sammelposition, a stop, a day)
  // still gets a definite subset: one mock line, chosen from its label
  if (node && node.dim && !lineSet.size) {
    const all = [...new Set(allRows.map(r => String(r[3])))];
    let h = 0; for (const ch of String(node.label)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    lineSet = new Set([all[h % all.length]]);
  }
  const rows = useMemo(() => lineSet.size ? allRows.filter(r => lineSet.has(String(r[3]))) : allRows,
    [node, allRows]);
  const hot = node && node.dim ? [t(PUNCT_DIM_LABELS[node.dim] || node.dim), node.label] : null;
  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(10);

  const filtered = useMemo(() => {
    const active = Object.entries(filters).filter(([, v]) => v && v.trim());
    if (!active.length) return rows;
    return rows.filter(r => active.every(([i, q]) =>
      String(r[i] ?? '').toLowerCase().includes(q.trim().toLowerCase())));
  }, [filters, rows]);

  const shown = filtered.slice(page * perPage, page * perPage + perPage);
  const pages = Math.max(1, Math.ceil(filtered.length / perPage));

  return html`
    <${Box}>
      <${PageHeader}
        crumbs=${[{ label: t('nav_evaluations'), onClick: () => go('list') },
                   ...(onBack ? [{ label: backLabel, onClick: onBack }] : []),
                   { label: title }]}
        title=${title}
        subtitle=${`${filtered.length.toLocaleString('de-CH')} / ${rows.length.toLocaleString('de-CH')}`} />
      <${Box} sx=${{ p: 3 }}>
        ${row && html`<${ParamGrid} id="raw-params" hotClass="raw-hot"
          fields=${[...punctParamFields(t, lang, row).slice(0, 8), ...(hot ? [[hot[0], hot[1], false, true]] : [])]} />`}
        <${Stack} direction="row" spacing=${1} alignItems="center" sx=${{ mb: 2 }}>
          <${FilterSelect} id="raw-pp" label=${t('sel_rows_per_page')} minWidth=${110}
            value=${String(perPage)}
            onChange=${v => { setPerPage(Number(v) || 10); setPage(0); }}
            options=${['10', '25', '50'].map(v => ({ value: v, label: v }))} />
          <${Typography} variant="body2" color="text.secondary">${t('fa_mask_entries')}<//>
        <//>
        <${TableContainer} component=${Paper} variant="outlined" sx=${{ borderColor: '#E7E7E7', overflowX: 'auto' }}>
          <${Table} id="raw-table">
            <${TableHead}>
              <${TableRow}>
                ${rows[0].map((_, i) => html`
                  <${TableCell} key=${i} sx=${{ whiteSpace: 'nowrap' }}>
                    ${RAW_COLS[i] ? t(RAW_COLS[i]) : String(i + 1)}<//>`)}
              <//>
              <${TableRow}>
                ${rows[0].map((_, i) => html`
                  <${TableCell} key=${i} sx=${{ p: .5 }}>
                    ${RAW_ENUM[i] ? html`
                      <${FilterSelect} id=${'raw-f-' + i} minWidth=${120}
                        label=${t(RAW_COLS[i])} value=${filters[i] || ''}
                        onChange=${v => { setPage(0); setFilters(f => ({ ...f, [i]: v })); }}
                        options=${RAW_ENUM[i].map(o => ({ value: o, label: o }))} />`
                    : html`
                      <${TextField} variant="standard" size="small" placeholder="…"
                        value=${filters[i] || ''}
                        onChange=${e => { setPage(0); setFilters(f => ({ ...f, [i]: e.target.value })); }}
                        sx=${{ minWidth: 70 }} />`}
                  <//>`)}
              <//>
            <//>
            <${TableBody}>
              ${shown.map((r, ri) => html`
                <${TableRow} key=${ri} hover>
                  ${r.map((c, ci) => html`<${TableCell} key=${ci}>${c}<//>`)}
                <//>`)}
              ${shown.length === 0 && html`
                <${TableRow}><${TableCell} colSpan=${rows[0].length}>
                  <${Alert} severity="info" id="raw-empty">${t('raw_no_match')}<//>
                <//><//>`}
            <//>
          <//>
        <//>
        <${Stack} direction="row" spacing=${1} alignItems="center" sx=${{ mt: 2 }}>
          <${Button} disabled=${page === 0} onClick=${() => setPage(p => p - 1)}>${t('rpt_pager_prev')}<//>
          <${Typography} variant="body2">${page + 1} / ${pages}<//>
          <${Button} disabled=${page + 1 >= pages} onClick=${() => setPage(p => p + 1)}>${t('rpt_pager_next')}<//>
        <//>
      <//>
    <//>`;
}


/* ── Chart view ───────────────────────────────────────────────────────
   One component for all three chart screens. The vanilla draws these as
   hand-built SVG; so does this, because a chart library would be a fourth
   dependency for five bars. Values come from the same aggregates the
   tables use, so a chart and its table can never disagree. */
function BarChart({ items, max, format }) {
  const H = 220, W = 900, pad = 48;
  const bw = items.length ? (W - pad * 2) / items.length : 0;
  const top = max || Math.max(1, ...items.map(i => i.value || 0));
  return html`
    <${Box} component="svg" viewBox=${`0 0 ${W} ${H + 60}`} id="chart-svg"
            sx=${{ width: '100%', height: 'auto' }} role="img">
      ${[0, .25, .5, .75, 1].map(f => html`
        <${React.Fragment} key=${f}>
          <line x1=${pad} x2=${W - pad} y1=${H - f * H + 20} y2=${H - f * H + 20}
                stroke="#E7E7E7" strokeWidth="1" />
          <text x=${pad - 8} y=${H - f * H + 24} textAnchor="end"
                fontSize="11" fill="rgba(0,0,0,0.6)">${format(top * f)}</text>
        <//>`)}
      ${items.map((it, i) => {
        const h = top ? ((it.value || 0) / top) * H : 0;
        return html`
          <${React.Fragment} key=${it.label + i}>
            <rect x=${pad + i * bw + bw * 0.15} y=${H - h + 20}
                  width=${bw * 0.7} height=${Math.max(0, h)} fill="#2196F3" rx="2">
              <title>${it.label}: ${format(it.value)}</title>
            </rect>
            <text x=${pad + i * bw + bw / 2} y=${H + 38} textAnchor="middle"
                  fontSize="11" fill="rgba(0,0,0,0.6)">
              ${String(it.label).slice(0, 14)}
            </text>
          <//>`;
      })}
    <//>`;
}

function ChartView({ go, row, title, items, format, backLabel, onBack }) {
  const { t, lang } = useT();
  return html`
    <${Box}>
      <${PageHeader}
        crumbs=${[{ label: t('nav_evaluations'), onClick: () => go('list') },
                  { label: backLabel, onClick: onBack },
                  { label: t('rpt_action_chart') }]}
        title=${title} subtitle=${t('rpt_action_chart')} />
      <${Box} sx=${{ p: 3 }}>
        ${row && html`<${ParamGrid} id="chart-params" fields=${row.group === 'punctuality'
          ? punctParamFields(t, lang, row) : faParamFields(t, lang, row)} />`}
        <${Card}><${CardContent}>
          ${items.length
            ? html`<${BarChart} items=${items} format=${format} />`
            : html`<${Alert} severity="info">${t('raw_no_match')}<//>`}
        <//><//>
      <//>
    <//>`;
}

/* ── Screen: Rohdaten Export config ───────────────────────────────────
   The export form: period, transport company, lines, stops, direction and
   the punctuality threshold, then Run. The threshold is required — the
   vanilla blocks the run without it, and that is the one validation this
   form has, so it is reproduced rather than left as decoration. */
function RohdatenConfig({ go, row }) {
  const { t } = useT();
  /* Production's Rohdaten Export DPM mask (reference/production-2026-09-28/
     create-raw-data.jpg): Zeitraum · Pünktlichkeitsgrenzwert · Transport-
     unternehmen · Richtungen · Linien · Haltestellen, in that order. The TU is
     one value, and the mask opens on the first one (AAGL). This form used to
     print each TU as "AAGL,Autobus AG Liestal…" — String() of the [code,
     name] pair — and had no Lines or Stops at all. */
  const [tu, setTu] = useState(RD_TU[0][0]);
  const [threshold, setThreshold] = useState('');
  const [dirs, setDirs] = useState([]);
  const [lines, setLines] = useState([]);
  const [stops, setStops] = useState([]);
  const [touched, setTouched] = useState(false);
  const missing = touched && !threshold;

  const tuOptions = RD_TU.map(([id, n]) => ({ id, label: id + ' · ' + n, chip: id }));
  // Lines come grouped by bundle in the mask; the TU picks the bundles.
  const lineOptions = useMemo(() => tuLinesFromBundles(tu), [tu]);
  React.useEffect(() => {
    setLines(v => { const n = v.filter(x => lineOptions.some(o => o.id === x)); return n.length === v.length ? v : n; });
  }, [lineOptions]);
  const stopOptions = RD_STOPS.map(([id, n]) => ({ id, label: id + ' · ' + n, chip: n }));
  const dirOptions = [{ id: 'hin', label: t('rd_dir_hin') }, { id: 'rueck', label: t('rd_dir_rueck') }];

  return html`
    <${Box}>
      <${PageHeader}
        crumbs=${[{ label: t('nav_evaluations'), onClick: () => go('list') },
                  { label: row ? row.name : t('type_raw_data') }]}
        title=${row ? row.name : t('type_raw_data')} subtitle=${t('type_raw_data')}
        action=${html`<${Button} variant="contained" id="rd-run-btn"
                        startIcon=${html`<${Icon} sx=${{ fontSize: 18 }}>play_arrow<//>`}
                        onClick=${() => setTouched(true)}>${t('rd_run')}<//>`} />
      <${Box} sx=${{ p: 3, maxWidth: 1100, mx: 'auto' }}>
        <${Card} sx=${{ mb: 3 }}><${CardContent}>
          <${Typography} variant="h6" gutterBottom>${t('rd_step_period')}<//>
          <${Stack} direction="row" spacing=${2}>
            <${TextField} label=${t('label_from')} type="date" InputLabelProps=${{ shrink: true }} />
            <${TextField} label=${t('label_to')} type="date" InputLabelProps=${{ shrink: true }} />
          <//>
        <//><//>

        <${Card}><${CardContent}>
          <${Typography} variant="h6" gutterBottom>${t('step_scope')}<//>
          <${Typography} variant="body2" color="text.secondary" sx=${{ mb: 2 }}>
            ${t('rd_section_subtitle')}
          <//>
          <${Box} id="rd-filters" sx=${{ display: 'grid', gap: 2,
                    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
            <${FormControl} required error=${missing} id="rd-threshold">
              <${InputLabel}>${t('rd_step_threshold')}<//>
              <${Select} value=${threshold} label=${t('rd_step_threshold')}
                         onChange=${e => setThreshold(e.target.value)}>
                ${THRESHOLD_KEYS.map(k => html`<${MenuItem} key=${k} value=${k}>${t(k)}<//>`)}
              <//>
              ${missing && html`
                <${Typography} variant="body2" color="error" id="rd-threshold-error"
                               sx=${{ mt: .5, ml: 1.75 }}>${t('err_threshold_required')}<//>`}
            <//>
            <${SingleScope} id="rd-tu" label=${t('rd_step_tu')} required
              value=${tu} options=${tuOptions} onChange=${setTu} />
            <${ScopeSelect} id="rd-dir" label=${t('rd_step_directions')}
              values=${dirs} options=${dirOptions} onChange=${setDirs} />
            <${ScopeSelect} id="rd-lines" label=${t('rd_step_lines')}
              values=${lines} options=${lineOptions} onChange=${setLines} />
            <${ScopeSelect} id="rd-stops" label=${t('rd_step_stops')}
              values=${stops} options=${stopOptions} onChange=${setStops} />
          <//>
        <//><//>
      <//>
    <//>`;
}

/* ── Screen: Ausfallmaske (FA mask) ───────────────────────────────────
   Rebuilt 2026-10-06 from production (reference/production-2026-10-06-fa/
   5–7): the parameter grid, a pie of cancellation CAUSES whose legend filters
   the table, the Ausfall von/bis window, rows you can tick, expand and
   collapse, and an editable Ersatzverkehr per row with Abbrechen / Speichern.
   The vanilla's bars here were the Übersicht's causes — a different thing. */
const MASK_COLS = ['fa_mask_col_tag', 'fa_mask_col_tu', 'fa_mask_col_go', 'fa_mask_col_lb',
  'fa_mask_col_linie', 'fa_mask_col_fahrt_id', 'fa_mask_col_fahrt_tu', 'fa_mask_col_halt_von',
  'fa_mask_col_aus_von', 'fa_mask_col_halt_bis', 'fa_mask_col_aus_bis', 'fa_mask_col_anz_halt',
  'fa_mask_col_ausfallart', 'fa_mask_col_ersatz'];
// Production's three causes and its colours; which mock trip carries which
// is set in FA_MASK_ROWS — most have none recorded, as most of production's 5'270 do.
const MASK_CAUSES = [['none', 'fa_mask_no_cause', '#E8473A'], ['tech', 'fa_cause_tech', '#D9862E'],
                     ['ktu', 'fa_cause_ktu', '#C2702A']];
const ERSATZ = [['kein', 'fa_kein_ersatz'], ['teil', 'fa_ersatz_teil'], ['komplett', 'fa_ersatz_komplett']];

function MaskPie({ counts }) {
  const total = counts.reduce((s, c) => s + c.n, 0) || 1;
  let a = -Math.PI / 2;
  const R = 90, C = 100;
  return html`
    <svg viewBox="0 0 200 200" width="200" height="200" id="fa-mask-pie" role="img">
      ${counts.filter(c => c.n).map(c => {
        const span = 2 * Math.PI * c.n / total;
        if (span >= 2 * Math.PI - 1e-6)
          return html`<circle key=${c.key} cx=${C} cy=${C} r=${R} fill=${c.color} className="fa-pie-slice" />`;
        const x0 = C + R * Math.cos(a), y0 = C + R * Math.sin(a);
        a += span;
        const x1 = C + R * Math.cos(a), y1 = C + R * Math.sin(a);
        return html`<path key=${c.key} className="fa-pie-slice" fill=${c.color} stroke="#fff" stroke-width="1"
          d=${`M${C},${C} L${x0},${y0} A${R},${R} 0 ${span > Math.PI ? 1 : 0} 1 ${x1},${y1} Z`} />`;
      })}
    </svg>`;
}

function Ausfallmaske({ go, row, tuId, day }) {
  const { t, lang } = useT();
  const key = tuId || 'GESAMT';
  // every demo trip, its cause and its saved Ersatzverkehr
  const base = useMemo(() => FA_MASK_ROWS
    .filter(x => key === 'GESAMT' || x.r[1] === key)
    .filter(x => !day || x.r[0] === day), [key, day]);
  const [saved, setSaved] = useState(() => Object.fromEntries(base.map(x => [x.i, x.ersatz])));
  const [ersatz, setErsatz] = useState(saved);
  const [cause, setCause] = useState('');
  const [von, setVon] = useState(''), [bis, setBis] = useState('');
  const [range, setRange] = useState({ von: '', bis: '' });
  const [pp, setPp] = useState(10);
  const [page, setPage] = useState(1);
  const [ticked, setTicked] = useState(new Set());
  const [wrap, setWrap] = useState(true);
  const [toast, setToast] = useState('');

  // the window is a datetime, compared against the trip's day + cancelled-from time
  const stamp = x => { const m = String(x.r[0]).match(/(\d+)\.(\d+)\.(\d+)/);
    return m ? `${m[3]}-${m[2]}-${m[1]}T${(x.r[8] || '00:00').slice(0, 5)}` : ''; };
  const inWindow = base.filter(x => (!range.von || stamp(x) >= range.von) && (!range.bis || stamp(x) <= range.bis));
  const counts = MASK_CAUSES.map(([k, lbl, color]) => ({ key: k, label: t(lbl), color,
    n: inWindow.filter(x => x.cause === k).length }));
  const rows = cause ? inWindow.filter(x => x.cause === cause) : inWindow;
  const pages = Math.max(1, Math.ceil(rows.length / pp));
  const shown = rows.slice((page - 1) * pp, page * pp);
  const dirty = Object.keys(ersatz).some(k => ersatz[k] !== saved[k]);
  const allTicked = shown.length > 0 && shown.every(x => ticked.has(x.i));

  return html`
    <${Box}>
      <${PageHeader}
        crumbs=${[{ label: t('nav_evaluations'), onClick: () => go('list') },
                  { label: row ? row.name : t('type_trip_failures'), onClick: () => go('report', row) },
                  { label: t('fa_mask_title') }]}
        title=${t('fa_mask_title')} subtitle=${[key === 'GESAMT' ? '' : key, day ? fmtDate(day, lang) : '']
          .filter(Boolean).join(' · ')} />
      <${Box} sx=${{ p: 3 }}>
        <${ParamGrid} id="fa-mask-header" fields=${faParamFields(t, lang, row, key === 'GESAMT' ? '' : key)} />

        <${Card} sx=${{ mb: 2 }} id="fa-mask-causes"><${CardContent}>
          <${Box} sx=${{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
            <${MaskPie} counts=${counts} />
            <${Stack} spacing=${1} id="fa-mask-legend" sx=${{ minWidth: 300 }}>
              ${counts.map(c => html`
                <${Box} key=${c.key} role="button" tabIndex=${0} className="fa-legend-item"
                  data-cause=${c.key} aria-pressed=${cause === c.key}
                  onClick=${() => { setCause(x => x === c.key ? '' : c.key); setPage(1); }}
                  onKeyDown=${e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault();
                    setCause(x => x === c.key ? '' : c.key); setPage(1); } }}
                  sx=${{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 1, borderRadius: 1,
                         cursor: 'pointer', bgcolor: cause === c.key ? 'rgba(33,150,243,0.12)' : 'transparent',
                         '&:hover': { bgcolor: cause === c.key ? 'rgba(33,150,243,0.16)' : 'action.hover' } }}>
                  <${Box} sx=${{ width: 16, height: 12, bgcolor: c.color, flexShrink: 0 }} />
                  <${Typography} variant="body2" sx=${{ flex: 1 }}>${c.label}<//>
                  <${Typography} variant="body2" sx=${{ fontWeight: 500, minWidth: 32, textAlign: 'right' }}>${c.n}<//>
                <//>`)}
            <//>
            <${Box} sx=${{ flex: 1 }} />
            <${Stack} spacing=${1.5} sx=${{ width: 240 }}>
              <${TextField} label=${t('fa_mask_ausfall_von')} id="fa-mask-von" type="datetime-local"
                InputLabelProps=${{ shrink: true }} value=${von} onChange=${e => setVon(e.target.value)} />
              <${TextField} label=${t('fa_mask_ausfall_bis')} id="fa-mask-bis" type="datetime-local"
                InputLabelProps=${{ shrink: true }} value=${bis} onChange=${e => setBis(e.target.value)} />
              <${Stack} direction="row" spacing=${1}>
                <${Button} variant="contained" id="fa-mask-apply"
                  onClick=${() => { setRange({ von, bis }); setPage(1); }}>${t('fa_mask_apply')}<//>
                <${Button} id="fa-mask-reset"
                  onClick=${() => { setVon(''); setBis(''); setRange({ von: '', bis: '' }); setPage(1); }}>
                  ${t('fa_mask_reset')}<//>
              <//>
            <//>
          <//>
        <//><//>

        <${Stack} direction="row" spacing=${1} alignItems="center" sx=${{ mb: 1 }}>
          <${FilterSelect} id="fa-mask-pp" label=${t('fa_mask_entries')} minWidth=${170}
            value=${String(pp)} onChange=${v => { setPp(Number(v) || 10); setPage(1); }}
            options=${['10', '25', '50', '100'].map(v => ({ value: v, label: v }))} />
          <${Box} sx=${{ flex: 1 }} />
          <${Button} variant="outlined" id="fa-mask-expand" onClick=${() => setWrap(true)}>${t('fa_mask_expand_all')}<//>
          <${Button} variant="outlined" id="fa-mask-collapse" onClick=${() => setWrap(false)}>${t('fa_mask_collapse_all')}<//>
        <//>

        ${rows.length === 0 ? html`
          <${Alert} severity="info" id="fa-mask-empty">${t('fa_mask_no_match')}<//>` : html`
          <${TableContainer} component=${Paper} variant="outlined" sx=${{ borderColor: '#E7E7E7' }}>
            <${Table} id="fa-mask-table" sx=${{ '& td': { whiteSpace: wrap ? 'normal' : 'nowrap' } }}>
              <${TableHead}>
                <${TableRow}>
                  <${TableCell} padding="checkbox">
                    <${Checkbox} id="fa-mask-all" checked=${allTicked}
                      inputProps=${{ 'aria-label': t('fa_mask_select_all') }}
                      onChange=${e => setTicked(s => { const n = new Set(s);
                        shown.forEach(x => e.target.checked ? n.add(x.i) : n.delete(x.i)); return n; })} />
                  <//>
                  ${MASK_COLS.map(c => html`<${TableCell} key=${c}>${t(c)}<//>`)}
                <//>
              <//>
              <${TableBody}>
                ${shown.map(x => html`
                  <${TableRow} key=${x.i} hover selected=${ticked.has(x.i)} data-cause=${x.cause}>
                    <${TableCell} padding="checkbox">
                      <${Checkbox} checked=${ticked.has(x.i)} inputProps=${{ 'aria-label': x.r[5] }}
                        onChange=${() => setTicked(s => { const n = new Set(s);
                          n.has(x.i) ? n.delete(x.i) : n.add(x.i); return n; })} />
                    <//>
                    ${x.r.slice(0, 13).map((c, k) => html`
                      <${TableCell} key=${k} align=${k === 11 ? 'right' : 'left'}>${k === 0 ? fmtDate(c, lang) : c}<//>`)}
                    <${TableCell} sx=${{ minWidth: 230 }}>
                      <${Select} value=${ersatz[x.i] || 'kein'} variant="standard" fullWidth
                        className="fa-ersatz" inputProps=${{ 'aria-label': t('fa_mask_col_ersatz') }}
                        onChange=${e => setErsatz(s => ({ ...s, [x.i]: e.target.value }))}>
                        ${ERSATZ.map(([k, lbl]) => html`<${MenuItem} key=${k} value=${k}>${t(lbl)}<//>`)}
                      <//>
                    <//>
                  <//>`)}
              <//>
            <//>
          <//>`}

        <${Stack} direction="row" spacing=${1} alignItems="center" sx=${{ mt: 2 }}>
          <${Typography} variant="body2" color="text.secondary" id="fa-mask-info">
            ${t('fa_pager_info')
                .replace('{start}', rows.length === 0 ? 0 : (page - 1) * pp + 1)
                .replace('{end}', Math.min(page * pp, rows.length))
                .replace('{total}', rows.length)}
          <//>
          <${Box} sx=${{ flex: 1 }} />
          <${Pagination} count=${pages} page=${Math.min(page, pages)} id="fa-mask-pager"
            onChange=${(e, v) => setPage(v)} showFirstButton showLastButton shape="rounded" />
        <//>
        <${Stack} direction="row" spacing=${1} alignItems="center" sx=${{ mt: 2 }}>
          <${Button} variant="outlined" id="fa-mask-cancel" disabled=${!dirty}
            startIcon=${html`<${Icon} sx=${{ fontSize: 18 }}>undo<//>`}
            onClick=${() => setErsatz(saved)}>${t('cf_cancel')}<//>
          <${Button} variant="contained" id="fa-mask-save" disabled=${!dirty}
            startIcon=${html`<${Icon} sx=${{ fontSize: 18 }}>save<//>`}
            onClick=${() => { setSaved(ersatz); setToast(t('fa_mask_saved')); }}>${t('fa_mask_save')}<//>
          <${Box} sx=${{ flex: 1 }} />
          <${Tooltip} title=${t('fa_export_pdf')}>
            <${IconButton} aria-label=${t('fa_export_pdf')}><${Icon}>picture_as_pdf<//><//><//>
          <${Tooltip} title=${t('fa_export_xls')}>
            <${IconButton} aria-label=${t('fa_export_xls')}><${Icon}>grid_on<//><//><//>
        <//>
      <//>
      <${Snackbar} open=${!!toast} autoHideDuration=${2500} onClose=${() => setToast('')} message=${toast} />
    <//>`;
}

/* ── Screen: Line Analysis DPM (Linienanalyse) ────────────────────────
   Built 2026-10-15 from seven production screens (reference/production-
   2026-10-15-la/, local only). Four tabs — Übersicht, Heatmap nach
   Abfahrtszeit, Heatmap nach Zeitintervall, Tabelle — under one control bar
   (Richtung, Linienverlauf, Modus, Ankunft/Abfahrt, Abfahrtszeit) and the
   quantile switch. The stop names and line names are production's; every
   number is mock, generated deterministically so the four tabs, the stop
   heatmap and the parameter grid describe the same measurements. */
const LA_STOPS = [['8572212', 'Liestal, Bahnhof'], ['8578320', 'Liestal, Törli'], ['8500859', 'Liestal, Stadion'],
  ['8510616', 'Liestal, Gräubern'], ['8500855', 'Bubendorf, Bad'], ['8578323', 'Bubendorf, Unterdorf'],
  ['8500850', 'Bubendorf, Zentrum'], ['8578324', 'Bubendorf, Steingasse'], ['8589400', 'Bubendorf, Industrie Süd'],
  ['8510216', 'Ziefen, Untertal'], ['8578325', 'Ziefen, Diegmatt'], ['8500851', 'Ziefen, Zentrum'],
  ['8578326', 'Ziefen, Mühlegasse'], ['8578327', 'Ziefen, Hofmatt'], ['8578329', 'Reigoldswil, Bütschen'],
  ['8578330', 'Reigoldswil, Linde'], ['8578331', 'Reigoldswil, Gemeindezentrum'], ['8500852', 'Reigoldswil, Dorfplatz']];
// "Weitere Haltestellen": stops only some trips serve (mock), each with the
// base-route stop it follows — so they slot into the route in order
const LA_EXTRA = [['8572219', 'Liestal, Kantonsspital', 0], ['8578328', 'Ziefen, Schulhaus', 11]];
const LA_ALL = [...LA_STOPS, ...LA_EXTRA.map(([id, n]) => [id, n])];
const laRoute = dir => {
  const out = [];
  LA_STOPS.forEach((s, i) => { out.push(s); LA_EXTRA.filter(e => e[2] === i).forEach(e => out.push([e[0], e[1]])); });
  return dir ? out.reverse() : out;
};
const LA_SEG_MIN = [1, 2, 2, 3, 2, 2, 1, 1, 1, 1, 1, 1, 0, 3, 1, 1, 2];
// base line first; the others serve only the stops listed
const LA_LINES = [
  { id: '50.070', name: '70 Liestal - Bubendorf - Ziefen - Reigoldswil', n: 792, color: '#A93226', stops: null },
  { id: '50.111', name: '111 Laufen - Breitenbach - Nunningen - Liestal', n: 408, color: '#B9913A', stops: [0] },
  { id: '5.R1', name: '19 Waldenburg - Liestal', n: 844, color: '#8DB33A', stops: [0] },
  { id: '50.071', name: '71 Liestal - Bubendorf - Arboldswil - Reigoldswil', n: 285, color: '#52A852', stops: [0, 4, 17] },
  { id: '50.072', name: '72 Augst - Arisdorf - Liestal - Seltisberg - Lupsingen', n: 488, color: '#4FA3A6', stops: [0] },
  { id: '50.077', name: '77 Dornach - Gempen - Nuglar - Liestal', n: 398, color: '#3248B0', stops: [0] },
  { id: '50.080', name: '80 Liestal - Pratteln - Basel Aeschenplatz', n: 352, color: '#5B2C8F', stops: [0] },
  { id: '50.081', name: '81 Liestal - Augst - Basel Aeschenplatz', n: 496, color: '#8E44AD', stops: [0] },
];
const LA_QS = ['q5', 'q50', 'q95', 'avg'];
const laRand = k => { const x = Math.sin(k * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
// one stop's figures for one line, kind ('arr'|'dep'), direction and mode — seconds
const laStat = (li, stop, kind, dir, mode, seed = 0) => {
  const k = li * 101 + stop * 7 + (kind === 'dep' ? 3 : 0) + (dir ? 500 : 0) + seed * 13;
  let avg = 55 + 60 * Math.sin(stop * 0.7 + li) - 12 * li + (kind === 'dep' ? 6 : 0) + 30 * (laRand(k) - .5);
  if (mode === 'headway') avg = avg * 0.55 - 12;
  avg = Math.round(avg);
  const q50 = Math.round(avg - 8 - 10 * laRand(k + 1));
  return { avg, q50, q5: Math.round(q50 - 50 - 40 * laRand(k + 2)), q95: Math.round(avg + 110 + 70 * laRand(k + 3)),
           q25: Math.round(q50 - 25), q65: Math.round(q50 + 12), q80: Math.round(q50 + 40) };
};
// which kinds a line has at a stop: first stop departs only, last arrives only
const laKinds = (line, pos, last) => (line.stops ? ['dep'] : pos === 0 ? ['dep'] : pos === last ? ['arr'] : ['arr', 'dep']);
const laTrips = (() => { const out = [0, 65, 130]; for (let m = 300; m <= 1410; m += 30) out.push(m); return out; })();
const hm = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const laHms = s => { const a = Math.abs(s); return `${s < 0 ? '-' : ''}${String(Math.floor(a / 3600)).padStart(2, '0')}:${String(Math.floor(a / 60) % 60).padStart(2, '0')}:${String(a % 60).padStart(2, '0')}`; };
const laMs = s => { const a = Math.abs(s); return `${s < 0 ? '-' : ''}${String(Math.floor(a / 60)).padStart(2, '0')}:${String(a % 60).padStart(2, '0')}`; };
// diverging colour: blue below zero, grey at zero, brown above
const laDiv = (v, lo, hi) => {
  const mix = (a, b, f) => `rgb(${a.map((x, i) => Math.round(x + (b[i] - x) * f)).join(',')})`;
  return v < 0 ? mix([226, 226, 226], [125, 163, 196], Math.min(1, v / lo)) : mix([226, 226, 226], [196, 136, 88], Math.min(1, v / hi));
};
const laSeq = (v, hi) => `rgb(${[201, 201, 201].map((x, i) => Math.round(x + ([200, 105, 42][i] - x) * Math.min(1, v / hi))).join(',')})`;

function LaQuantiles({ value, onChange, keys = LA_QS }) {
  const { t } = useT();
  return html`
    <${ToggleButtonGroup} exclusive size="small" value=${value} id="la-quantile"
      onChange=${(e, v) => v && onChange(v)}>
      ${keys.map(k => html`<${ToggleButton} key=${k} value=${k} data-q=${k}
        sx=${{ fontSize: 14, textTransform: 'none', px: 1.5 }}>${t('la_' + k)}<//>`)}
    <//>`;
}

/* Ignat, 2026-10-15: the overlay was "a weird filter". Line route is a
   multi-select like the New evaluation filters: stops in route order, the stops
   only some trips serve grouped under "Weitere Haltestellen", and Most common
   route / All / None at the top. 2026-10-29: a plain checkbox list — no route
   line, no heading over the main stops. */
function LaRouteSelect({ route, selected, setSelected }) {
  const { t } = useT();
  const extra = new Set(LA_EXTRA.map(e => e[0]));
  const opts = route.map(([id, name]) => ({ id, label: `${id} ${name}`, chip: name, extra: extra.has(id) }));
  const ordered = [...opts.filter(o => !o.extra), ...opts.filter(o => o.extra)];
  const value = ordered.filter(o => selected.includes(o.id));
  const quick = (k, ids) => html`<${Button} size="small" id=${'la-route-' + k}
    onMouseDown=${e => e.preventDefault()} onClick=${() => setSelected(ids)}>${t(k === 'common' ? 'la_most_common' : 'la_' + k)}<//>`;
  const Paper2 = React.useCallback(props => html`<${Paper} ...${props}>
    <${Stack} direction="row" spacing=${.5} sx=${{ px: 1, pt: 1 }} id="la-route-quick">
      ${quick('common', LA_STOPS.map(s => s[0]))}${quick('all', LA_ALL.map(s => s[0]))}${quick('none', [])}
    <//>${props.children}<//>`, []);
  return html`<${Autocomplete} multiple disableCloseOnSelect id="la-route" size="small" sx=${{ width: 280 }}
    options=${ordered} value=${value} filterOptions=${scopeFilter}
    groupBy=${o => o.extra ? t('la_more_stops') : ''}
    renderGroup=${p => html`<li key=${p.key}>
      ${p.group && html`<${M.ListSubheader} className="la-route-group">${p.group}<//>`}
      <ul style=${{ padding: 0 }}>${p.children}</ul></li>`}
    isOptionEqualToValue=${(o, v) => o.id === v.id} getOptionLabel=${o => o.label}
    onChange=${(e, v) => setSelected(v.map(o => o.id))}
    PaperComponent=${Paper2} ListboxProps=${{ style: { maxHeight: 420 } }}
    componentsProps=${{ popper: { placement: 'bottom-start', style: { width: 420 } } }}
    renderTags=${() => html`<${Typography} variant="body2" id="la-route-count" sx=${{ pl: 1 }}>
      ${t('la_stops_of').replace('{n}', value.length).replace('{total}', opts.length)}<//>`}
    renderOption=${(props, o, { selected: on }) => { const { key, ...rest } = props;
      return html`<li key=${o.id} ...${rest} className=${(rest.className || '') + ' la-route-stop'} data-stop=${o.id}>
        <${Checkbox} size="small" checked=${on} sx=${{ mr: 1 }} />${o.label}</li>`; }}
    renderInput=${params => html`<${TextField} ...${params} variant="filled" label=${t('la_route')} />`} />`;
}

// a single required choice — no clear ✕, unlike the filters
function LaSelect({ id, label, value, onChange, options, minWidth = 200, disabled, tip }) {
  const field = html`<${FormControl} id=${id} sx=${{ minWidth }} disabled=${!!disabled}>
    <${InputLabel} id=${id + '-label'}>${label}<//>
    <${Select} labelId=${id + '-label'} label=${label} value=${value} onChange=${e => onChange(e.target.value)}>
      ${options.map(o => html`<${MenuItem} key=${o.value} value=${o.value} disabled=${!!o.disabled}>${o.label}<//>`)}
    <//><//>`;
  return tip ? html`<${Tooltip} title=${tip}><span>${field}</span><//>` : field;
}

function LaOverviewChart({ stops, rows, q, kinds }) {
  const { t } = useT();
  const [hover, setHover] = useState(-1);
  const W = 1100, H = 430, L = 80, R = 150, T = 20, B = 140;
  const pw = W - L - R, ph = H - T - B;
  const xs = i => L + (stops.length < 2 ? pw / 2 : pw * i / (stops.length - 1));
  const vals = rows.flatMap(r => r.points.map(p => p.v[q]));
  const lim = Math.max(60, ...vals.map(Math.abs));
  const y = v => T + ph / 2 - (v / lim) * (ph / 2);
  return html`
    <${Box} sx=${{ display: 'flex', gap: 2 }}>
      <${Box} sx=${{ position: 'relative', flex: 1 }}>
        <svg viewBox=${`0 0 ${W} ${H}`} width="100%" id="la-overview-svg" onMouseLeave=${() => setHover(-1)}>
          ${[-1, -.5, 0, .5, 1].map(f => html`<g key=${f}>
            <line x1=${L} x2=${W - R} y1=${y(lim * f)} y2=${y(lim * f)} stroke=${f === 0 ? '#9E9E9E' : '#EEE'} />
            <text x=${L - 8} y=${y(lim * f)} text-anchor="end" dominant-baseline="middle" font-size="14" fill="rgba(0,0,0,0.6)">
              ${laHms(Math.round(lim * f))}</text></g>`)}
          ${stops.map((s, i) => html`<g key=${s[0]}>
            <line x1=${xs(i)} x2=${xs(i)} y1=${T} y2=${T + ph} stroke=${hover === i ? '#757575' : '#F2F2F2'}
                  stroke-dasharray=${hover === i ? '4 3' : ''} />
            <text transform=${`translate(${xs(i)},${T + ph + 14}) rotate(40)`} font-size="14" fill="rgba(0,0,0,0.75)">
              <tspan x="0" font-weight=${i === 0 || i === stops.length - 1 ? 700 : 400}>${s[0]}</tspan>
              <tspan x="0" dy="16">${s[1]}</tspan></text>
            <rect x=${xs(i) - pw / Math.max(1, stops.length - 1) / 2} y=${T} width=${pw / Math.max(1, stops.length - 1)} height=${ph}
                  fill="transparent" className="la-hover-col" data-i=${i} onMouseEnter=${() => setHover(i)} />
          </g>`)}
          ${rows.map(r => {
            const pts = r.points.filter(p => kinds.includes(p.kind));
            const d = pts.map((p, j) => `${j ? 'L' : 'M'}${xs(p.pos)},${y(p.v[q])}`).join(' ');
            return html`<g key=${r.line.id} className="la-series" data-line=${r.line.id}>
              <path d=${d} fill="none" stroke=${r.line.color} stroke-width="2" style=${{ pointerEvents: 'none' }} />
              ${pts.map((p, j) => html`<circle key=${j} cx=${xs(p.pos)} cy=${y(p.v[q])} r="4" fill=${r.line.color}
                style=${{ pointerEvents: 'none' }} />`)}
            </g>`;
          })}
        </svg>
        ${hover >= 0 && stops[hover] && html`
          <${Paper} variant="outlined" id="la-tooltip" sx=${{ position: 'absolute', top: 40, p: 1.5, pointerEvents: 'none', zIndex: 2,
              left: `${Math.min(70, (xs(hover) / W) * 100 + 1)}%` }}>
            <${Typography} variant="body2" sx=${{ fontWeight: 700 }}>${stops[hover][0]} ${stops[hover][1]}<//>
            ${rows.map((r, ri) => {
              const ps = r.points.filter(p => p.pos === hover && kinds.includes(p.kind));
              if (!ps.length) return null;
              return html`<${Box} key=${r.line.id} sx=${{ mt: .5 }}>
                ${ri === 1 && html`<${Typography} variant="body2" color="text.secondary">${t('la_more_lines')}<//>`}
                <${Typography} variant="body2" sx=${{ color: r.line.color }}>${r.line.id}<//>
                ${ps.map(p => html`<${Typography} key=${p.kind} variant="body2">
                  ${t(p.kind === 'arr' ? 'la_arr' : 'la_dep')}: ${laHms(p.v[q])} (${t('la_measurements')}: ${r.line.n})<//>`)}
              <//>`;
            })}
          <//>`}
      <//>
      <${Stack} spacing=${.75} id="la-legend" sx=${{ minWidth: 150, pt: 4 }}>
        ${rows.map((r, i) => html`<${React.Fragment} key=${r.line.id}>
          ${i === 1 && html`<${Typography} variant="body2" color="text.secondary" sx=${{ pt: 1 }}>${t('la_more_lines')}<//>`}
          <${Stack} direction="row" spacing=${1} alignItems="center">
            <${Box} sx=${{ width: 18, height: 3, bgcolor: r.line.color }} />
            <${Typography} variant="body2">${r.line.id}<//>
          <//><//>`)}
      <//>
    <//>`;
}

function LaHeatmap({ rowsLabels, cols, colLabel, cell, colour, legendTitle, legend, xTitle, id }) {
  const CW = 40, CH = 26, LW = 310;
  return html`
    <${Box} sx=${{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
      <${Box} sx=${{ overflowX: 'auto', flex: 1 }}>
        <svg id=${id} width=${LW + cols.length * CW + 10} height=${rowsLabels.length * CH + 90}>
          ${rowsLabels.map((lab, r) => html`<g key=${r}>
            <text x=${LW - 8} y=${r * CH + CH / 2} text-anchor="end" dominant-baseline="middle" font-size="14"
                  fill="rgba(0,0,0,0.75)">${lab}</text>
            ${cols.map((c, ci) => {
              const v = cell(r, ci);
              if (v === null) return null;
              return html`<g key=${ci} className="la-hm-cell">
                <rect x=${LW + ci * CW} y=${r * CH} width=${CW - 1} height=${CH - 1} fill=${colour(v.v)}><title>${v.tip}</title></rect>
                <text x=${LW + ci * CW + CW / 2} y=${r * CH + CH / 2} text-anchor="middle" dominant-baseline="middle"
                      font-size="14" fill="rgba(0,0,0,0.8)" style=${{ pointerEvents: 'none' }}>${v.label}</text></g>`;
            })}
          </g>`)}
          ${cols.map((c, ci) => colLabel(ci) && html`<text key=${ci}
            transform=${`translate(${LW + ci * CW + CW / 2},${rowsLabels.length * CH + 8}) rotate(-90)`}
            text-anchor="end" dominant-baseline="middle" font-size="14" fill="rgba(0,0,0,0.75)">${colLabel(ci)}</text>`)}
        </svg>
        <${Typography} variant="body2" color="text.secondary" align="center">${xTitle}<//>
      <//>
      <${Box} sx=${{ minWidth: 110 }} id=${id + '-legend'}>
        <${Typography} variant="body2" sx=${{ mb: 1 }}>${legendTitle}<//>
        <${Box} sx=${{ display: 'flex', gap: 1 }}>
          <${Box} sx=${{ width: 20, height: 240, background: legend.gradient }} />
          <${Stack} justifyContent="space-between" sx=${{ height: 240 }}>
            ${legend.ticks.map(tk => html`<${Typography} key=${tk} variant="body2">${tk}<//>`)}
          <//>
        <//>
      <//>
    <//>`;
}

function ReportLineAnalysis({ go, row }) {
  const { t, lang } = useT();
  const [tab, setTab] = useState(0);
  const [dir, setDir] = useState(0);
  const [mode, setMode] = useState('delay');
  const [arrdep, setArrdep] = useState('both');
  const [deptime, setDeptime] = useState('all');
  const [q, setQ] = useState('q50');
  const [selected, setSelected] = useState(LA_STOPS.map(s => s[0]));
  const [snap, setSnap] = useState(false);
  const seed = deptime !== 'all' ? laTrips.indexOf(Number(deptime)) + 1 : 0;
  const ordered = laRoute(dir);
  const stops = ordered.filter(s => selected.includes(s[0]));
  const last = stops.length - 1;
  // heatmaps show one of arrival / departure, as production's select does there
  const hmKind = arrdep === 'dep' ? 'dep' : 'arr';
  const kinds = arrdep === 'both' ? ['arr', 'dep'] : [arrdep];
  const rows = LA_LINES.map((line, li) => ({
    line,
    points: stops.flatMap((s, pos) => {
      const idx = LA_ALL.findIndex(x => x[0] === s[0]);
      if (line.stops && !line.stops.includes(idx)) return [];
      if (idx >= LA_STOPS.length && li > 0) return [];   // variant stops: base line only
      return laKinds(line, pos, last).map(kind => ({ pos, kind, v: laStat(li, idx, kind, dir, mode, seed) }));
    }),
  })).filter(r => r.points.length);
  const fields = laParamFields(t, lang, row);
  const showDeptime = tab === 0 || tab === 3;
  const qKeys = LA_QS;

  return html`
    <${Box}>
      <${PageHeader}
        crumbs=${[{ label: t('nav_evaluations'), onClick: () => go('list') },
                  { label: row ? row.name : t('type_line_analysis') }]}
        title=${row ? row.name : t('type_line_analysis')} subtitle=${t('la_title_ext')}
        action=${html`<${Stack} direction="row" spacing=${1} alignItems="center">
          <${Tooltip} title=${t('la_tutorial')}>
            <${IconButton} aria-label=${t('la_tutorial')} id="la-tutorial"><${Icon}>ondemand_video<//><//><//>
          <${Button} variant="outlined"
            startIcon=${html`<${Icon} sx=${{ fontSize: 18 }}>download<//>`}>${t('export_csv')}<//><//>`} />
      <${Box} sx=${{ p: 3 }}>
        <${ParamGrid} id="la-params" fields=${fields} />
        ${/* Ignat, 2026-10-15: the filters change every tab, so they sit ABOVE
              the tabs, and they are all dropdowns of one size. Departure time
              and "both" do not apply to a heatmap, so there they are disabled
              with the reason, not hidden — the bar never jumps between tabs. */''}
        <${Card} sx=${{ mb: 2 }} id="la-controls"><${CardContent} sx=${{ '&:last-child': { pb: 2 } }}>
          <${Box} sx=${{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <${LaSelect} id="la-dir" label=${t('la_direction')} value=${dir} onChange=${setDir} minWidth=${300}
              options=${[0, 1].map(d => { const r = laRoute(d);
                return { value: d, label: `${t(d ? 'la_dir_back' : 'la_dir_out')} (${r[0][1].split(',')[0]} → ${r[r.length - 1][1].split(',')[0]})` }; })} />
            <${LaRouteSelect} route=${ordered} selected=${selected} setSelected=${setSelected} />
            <${LaSelect} id="la-mode" label=${t('la_mode')} value=${mode} onChange=${setMode}
              options=${[{ value: 'delay', label: t('la_mode_delay') }, { value: 'headway', label: t('la_mode_headway') }]} />
            <${LaSelect} id="la-arrdep" label=${t('la_arrdep')} value=${showDeptime ? arrdep : hmKind}
              onChange=${setArrdep}
              options=${[['both', 'la_arrdep_both'], ['arr', 'la_arr'], ['dep', 'la_dep']]
                .map(([v, k]) => ({ value: v, label: t(k), disabled: v === 'both' && !showDeptime }))} />
            <${LaSelect} id="la-deptime" label=${t('la_deptime')} value=${showDeptime ? deptime : 'all'}
              onChange=${setDeptime} disabled=${!showDeptime} tip=${showDeptime ? '' : t('la_deptime_hm')}
              options=${[{ value: 'all', label: t('la_deptime_all') }, ...laTrips.map(m => ({ value: String(m), label: hm(m) }))]} />
          <//>
        <//><//>

        <${Tabs} value=${tab} onChange=${(e, v) => setTab(v)} sx=${{ mb: 2 }} id="la-tabs">
          ${['la_tab_overview', 'la_tab_hm_time', 'la_tab_hm_interval', 'la_tab_table'].map((k, i) =>
            html`<${Tab} key=${k} label=${t(k)} id=${'la-tab-' + i} />`)}
        <//>

        ${/* Ignat, 2026-10-29: tables sit edge to edge on every report. The
              Table tab has no view settings, so it drops the panel's frame and
              padding; charts and heatmaps keep theirs. */''}
        <${Card} id="la-panel" sx=${tab === 3 ? { border: 'none', bgcolor: 'transparent' } : undefined}>
          <${CardContent} sx=${tab === 3 ? { p: 0, '&:last-child': { pb: 0 } } : undefined}>
          ${stops.length === 0 ? html`<${Alert} severity="info" id="la-empty">${t('la_no_stops')}<//>` : html`
            ${tab !== 3 && html`<${Stack} direction="row" spacing=${1} alignItems="center" sx=${{ mb: 2 }}>
              <${Box} sx=${{ flex: 1 }} />
              <${LaQuantiles} value=${q} onChange=${setQ} />
              ${(tab === 1 || tab === 2) && html`<${Tooltip} title=${t('la_outliers')}>
                <${IconButton} aria-label=${t('la_outliers')} id="la-outliers"><${Icon}>info_outline<//><//><//>`}
              <${Tooltip} title=${t('fa_ub_camera')}>
                <${IconButton} aria-label=${t('fa_ub_camera')} onClick=${() => setSnap(true)}><${Icon}>photo_camera<//><//><//>
            <//>`}

            ${tab === 0 && html`<${LaOverviewChart} stops=${stops} rows=${rows} q=${q} kinds=${kinds} />`}

            ${tab === 1 && html`<${LaHeatmap} id="la-hm-time"
              rowsLabels=${stops.map(s => `${s[0]} ${s[1]}`)} cols=${laTrips}
              colLabel=${ci => hm(laTrips[ci])}
              cell=${(r, ci) => {
                const idx = LA_ALL.findIndex(x => x[0] === stops[r][0]);
                if ((r === 0 && hmKind === 'arr') || laRand(idx * 31 + ci * 7) < 0.04) return null;   // first stop: no arrival
                const base = laStat(0, idx, hmKind, dir, mode, 0)[q];
                const v = Math.round(base + 70 * (laRand(idx * 17 + ci * 3 + dir) - .5) + (laTrips[ci] > 420 && laTrips[ci] < 540 ? 40 : 0));
                const soll = laTrips[ci] + LA_SEG_MIN.slice(0, idx).reduce((a, b) => a + b, 0);
                return { v, label: String(v), tip: `${hm(laTrips[ci])}\n${stops[r][0]} ${stops[r][1]}\nSoll ${t(hmKind === 'arr' ? 'la_arr' : 'la_dep')}: ${hm(soll % 1440)}:00\n${t('la_' + q)}: ${laMs(v)}\nFahrtnummer: ${70001 + ci}` };
              }}
              colour=${v => laDiv(v, -44, 179)} legendTitle="min:sec" xTitle=${t('la_x_deptimes')}
              legend=${{ gradient: 'linear-gradient(to bottom, rgb(196,136,88), rgb(226,226,226) 80%, rgb(125,163,196))',
                         ticks: ['02:59', '02:00', '01:00', '00:00', '-00:44'] }} />`}

            ${tab === 2 && html`<${LaHeatmap} id="la-hm-interval"
              rowsLabels=${stops.map(s => `${s[0]} ${s[1]}`)} cols=${Array.from({ length: 30 }, (_, i) => -180 + i * 10)}
              colLabel=${ci => ci % 6 === 0 ? laMs(-180 + ci * 10) : ''}
              cell=${(r, ci) => {
                const idx = LA_ALL.findIndex(x => x[0] === stops[r][0]);
                const mu = laStat(0, idx, hmKind, dir, mode, 0)[q];
                const x = -180 + ci * 10 + 5;
                const n = Math.max(0, Math.round(18 * Math.exp(-((x - mu) ** 2) / (2 * 35 ** 2)) - 2 * laRand(idx + ci)));
                return { v: n, label: String(n), tip: `${stops[r][0]} ${stops[r][1]}\n${laMs(x - 5)} – ${laMs(x + 5)}: ${n}` };
              }}
              colour=${v => laSeq(v, 18)} legendTitle=${t('la_cb_interval')} xTitle=${t('la_x_intervals')}
              legend=${{ gradient: 'linear-gradient(to bottom, rgb(200,105,42), rgb(201,201,201))', ticks: ['18', '12', '6', '0'] }} />`}

            ${tab === 3 && html`
              <${TableContainer} component=${Paper} variant="outlined" sx=${{ borderColor: '#E7E7E7' }}>
                <${Table} id="la-table">
                  <${TableHead}><${TableRow}>
                    ${['la_col_line', 'la_col_stop', 'la_arrdep', 'la_avg', 'la_q5', 'la_q50', 'la_q95', 'la_col_count']
                      .map((k, i) => html`<${TableCell} key=${k} align=${i > 2 ? 'right' : 'left'}>${t(k)}<//>`)}
                    <${TableCell} align="right">${t('col_actions')}<//>
                  <//><//>
                  <${TableBody}>
                    ${stops.flatMap((s, pos) => rows.flatMap(r => r.points.filter(pt => pt.pos === pos && kinds.includes(pt.kind))
                      .map(pt => html`<${TableRow} key=${r.line.id + s[0] + pt.kind} hover data-line=${r.line.id}>
                        <${TableCell} sx=${{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          (${r.line.id}) ${r.line.name}<//>
                        <${TableCell}>${s[0]} ${s[1]}<//>
                        <${TableCell}>${t(pt.kind === 'arr' ? 'la_arr' : 'la_dep')}<//>
                        ${['avg', 'q5', 'q50', 'q95'].map(k => html`<${TableCell} key=${k} align="right">${laHms(pt.v[k])}<//>`)}
                        <${TableCell} align="right">${r.line.n}<//>
                        <${TableCell} align="right">
                          ${r.line.stops === null && html`<${Tooltip} title=${t('la_stop_heatmap')}>
                            <${IconButton} aria-label=${t('la_stop_heatmap')} className="la-stop-hm-btn"
                              onClick=${() => go('la-stop', row, { stop: s, kind: pt.kind, dir, mode })}>
                              <${Icon}>calendar_view_month<//><//><//>`}
                        <//>
                      <//>`)))}
                  <//>
                <//>
              <//>`}
          `}
        <//><//>
      <//>
      <${Snackbar} open=${snap} autoHideDuration=${2500} onClose=${() => setSnap(false)} message=${t('chart_snapshot_done')} />
    <//>`;
}

/* The Tabelle icon's view: one stop's figures by weekday and hour. Production
   opens it in a separate window; here it is a page with a breadcrumb, the rule
   for row drill-ins since 2026-08-28. */
function LaStopHeatmap({ go, row, stop, kind, dir, mode }) {
  const { t, lang } = useT();
  const [q, setQ] = useState('q5');
  const idx = LA_ALL.findIndex(x => x[0] === stop[0]);
  const base = laStat(0, idx, kind, dir, mode, 0);
  const days = [1, 2, 3, 4, 5, 6, 7].map(d => t('la_day_' + d));
  const title = `${stop[0]} ${stop[1]} [${t(dir ? 'la_dir_back' : 'la_dir_out')}, ${t(mode === 'delay' ? 'la_eval_delay' : 'la_eval_headway')}, ${t(kind === 'arr' ? 'la_arr' : 'la_dep')}]`;
  const keys = ['q5', 'q25', 'q50', 'q65', 'q80', 'q95', 'avg'];
  return html`
    <${Box}>
      <${PageHeader}
        crumbs=${[{ label: t('nav_evaluations'), onClick: () => go('list') },
                  { label: row ? row.name : t('type_line_analysis'), onClick: () => go('report', row) },
                  { label: `${stop[0]} ${stop[1]}` }]}
        title=${t('la_stop_heatmap')} subtitle=${`${stop[0]} ${stop[1]}`} />
      <${Box} sx=${{ p: 3 }}>
        <${ParamGrid} id="la-stop-params" fields=${[...laParamFields(t, lang, row),
          [t('la_col_stop'), `${stop[0]} ${stop[1]}`, false, true]]} />
        <${Card}><${CardContent}>
          <${Typography} variant="h6" align="center" id="la-stop-title" sx=${{ mb: 2 }}>${title}<//>
          <${Box} sx=${{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <${LaQuantiles} value=${q} onChange=${setQ} keys=${keys} />
          <//>
          <${LaHeatmap} id="la-stop-hm" rowsLabels=${days} cols=${Array.from({ length: 24 }, (_, h) => h)}
            colLabel=${h => String(h)}
            cell=${(d, h) => {
              if (h >= 2 && h <= 4 && !(d === 4 && h === 2)) return null;
              const v = Math.max(0, Math.round(base[q] + 70 + 60 * (laRand(idx * 7 + d * 24 + h) - .3) + (h >= 7 && h <= 8 ? 50 : 0)));
              return { v, label: String(v), tip: `${days[d]} ${String(h).padStart(2, '0')}:00\n${t('la_' + q)}: ${laMs(v)}` };
            }}
            colour=${v => laSeq(v, 221)} legendTitle="min:sec" xTitle=${t('la_hours')}
            legend=${{ gradient: 'linear-gradient(to bottom, rgb(200,105,42), rgb(201,201,201))', ticks: ['03:41', '02:30', '01:30', '00:30'] }} />
        <//><//>
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
/* ── Info: documents, contacts, support, imprint ─────────────────────
   Ignat, 2026-10-26: in the top bar, not behind a "?" (that reads as help);
   dialogs, so a report underneath keeps its state; on the sign-in page only
   Support. Document titles, organisations and imprint come from production's
   home page; contact names and the support address are mock. */
const SUPPORT_MAIL = 'support@etc-consult.ch';
const INFO_DOCS = [
  ['2026-09-22', 'Tools: QMS RPV CH Assessment-relevant stops – Guidelines'],
  ['2025-10-25', 'QMS RPV Overview: FAQ'],
  ['2025-10-25', 'Assessment Guidelines: MSS Survey Assessment Guidelines 2026'],
  ['2025-10-25', 'Assessment Guidelines: Survey MSS Assessment Guidelines 2025 and 2026 (Comparison)'],
  ['2025-10-25', 'Training materials: Information for employees'],
  ['2025-10-25', 'Training materials: Quick guide QMS RPV CH'],
  ['2025-10-25', 'Training materials: Instructions QMS RPV CH'],
  ['2025-10-25', 'Training materials: Tutorial Line Analysis DPM'],
  ['2025-10-25', 'Tools: Controlling process for the QMS RPV CH from 2020 onwards'],
  ['2025-10-25', 'Tools: Checklist network map'],
];
const INFO_CONTACTS = [
  { role: 'ct_data', org: 'ETC Solutions GmbH', name: 'Anna Muster', unit: 'Operational Project Management ETC',
    addr: ['Ringstrasse 17', 'CH-4600 Olten'], phone: '+41 62 000 00 01', mail: 'anna.muster@etc-consult.ch' },
  { role: 'ct_pm', org: 'Federal Office of Transport (BAV)', name: 'Lea Beispiel', unit: 'Market Access Section',
    addr: ['Mühlestrasse 6', 'CH-3063 Ittigen'], phone: '+41 58 000 00 02', fax: '+41 58 000 00 09', mail: 'lea.beispiel@bav.admin.ch' },
  { role: 'ct_pm', org: 'Federal Office of Transport (BAV)', name: 'Marco Muster', unit: 'Passenger Transport Section',
    addr: ['Mühlestrasse 6', 'CH-3063 Ittigen'], phone: '+41 58 000 00 03', fax: '+41 58 000 00 09', mail: 'marco.muster@bav.admin.ch' },
];
const INFO_IMPRINT = [
  ['imp_g_company', [['imp_name', 'ETC Solutions GmbH'], ['imp_main', 'Martin-Hoffmann-Str. 18, D-12435 Berlin'],
    ['info_phone', '+49 30 25465-0'], ['info_fax', '+49 30 25465-101'], ['imp_branch', 'Ringstrasse 17, CH-4600 Olten'],
    ['info_phone', '+41 62 216 42 25'], ['info_fax', '+41 62 216 40 18'],
    ['imp_md', 'Helge Haugk, Dipl.Inf.(FH) · Holger Schaufu, Dipl.-Wirt.-Ing.(FH)']]],
  ['imp_g_cert', [['imp_iso', 'imp_iso_v']]],
  ['imp_g_tax', [['imp_vat', 'DE 165533279'], ['imp_tax', '37/280/3077'], ['imp_reg', 'AG Charlottenburg HRB 8866']]],
];

function InfoDialog({ which, onClose }) {
  const { t, lang } = useT();
  const [toast, setToast] = useState('');
  const download = title => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([title + '\n(prototype placeholder)'], { type: 'text/plain' }));
    a.download = title.replace(/[^\w\-]+/g, '_') + '.txt';
    a.click();
    setToast(t('info_download_started').replace('{name}', title));
  };
  const iso = d => { const [y, m, dd] = d.split('-'); return fmtDate(`${dd}.${m}.${y}`, lang); };
  return html`
    <${Dialog} open=${!!which} onClose=${onClose} maxWidth=${which === 'contacts' ? 'lg' : 'md'} fullWidth
      id=${'info-' + which}>
      <${DialogTitle} sx=${{ display: 'flex', alignItems: 'center' }}>
        ${which && t('info_' + which)}<${Box} sx=${{ flex: 1 }} />
        <${IconButton} aria-label=${t('info_close')} onClick=${onClose} id="info-close"><${Icon}>close<//><//>
      <//>
      <${DialogContent} dividers>
        ${which === 'documents' && html`<${Table} id="info-doc-table"><${TableBody}>
          ${[...INFO_DOCS].sort((a, b) => b[0].localeCompare(a[0])).map(([d, title]) => html`
            <${TableRow} key=${title} hover>
              <${TableCell} sx=${{ whiteSpace: 'nowrap', color: 'text.secondary', width: 130 }}>${iso(d)}<//>
              ${/* Ignat, 2026-10-26: files, not links — plain title, download
                    icon at the row end, as every row action in the app */''}
              <${TableCell}>${title}<//>
              <${TableCell} align="right" sx=${{ width: 56 }}>
                <${Tooltip} title=${t('la_download')}>
                  <${IconButton} className="info-doc" aria-label=${t('la_download') + ': ' + title}
                    onClick=${() => download(title)}><${Icon}>download<//><//><//><//>
            <//>`)}
        <//><//>`}
        ${which === 'contacts' && html`
          <${Box} sx=${{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 2 }}>
            ${INFO_CONTACTS.map((c, i) => html`<${Card} key=${i} className="info-contact"><${CardContent}>
              <${Typography} variant="subtitle1" sx=${{ fontWeight: 500 }}>${t(c.role)}<//>
              <${Typography} variant="body2" sx=${{ mb: 1 }}>${c.org}<//>
              <${Typography} variant="body2" sx=${{ fontWeight: 500 }}>${c.name}<//>
              ${[c.unit, ...c.addr].map(x => html`<${Typography} key=${x} variant="body2" color="text.secondary">${x}<//>`)}
              <${Typography} variant="body2" color="text.secondary" sx=${{ mt: 1 }}>${t('info_phone')}: ${c.phone}<//>
              ${c.fax && html`<${Typography} variant="body2" color="text.secondary">${t('info_fax')}: ${c.fax}<//>`}
              <${Link} href=${'mailto:' + c.mail} className="info-mail"
                sx=${{ display: 'inline-flex', gap: .75, alignItems: 'center', mt: 1 }}>
                <${Icon} sx=${{ fontSize: 18 }}>mail_outline<//>${c.mail}<//>
            <//><//>`)}
          <//>`}
        ${which === 'imprint' && html`<${Table} id="info-imprint-table"><${TableBody}>
          ${INFO_IMPRINT.map(([g, rows]) => html`<${React.Fragment} key=${g}>
            <${TableRow}><${TableCell} colSpan=${2} sx=${{ fontWeight: 500, bgcolor: '#F4F4F4' }}>${t(g)}<//><//>
            ${rows.map(([k, v], i) => html`<${TableRow} key=${k + i}>
              <${TableCell} sx=${{ width: 280, color: 'text.secondary' }}>${t(k)}<//>
              <${TableCell}>${v.startsWith('imp_') ? t(v) : v}<//><//>`)}
          <//>`)}
        <//><//>`}
      <//>
      <${Snackbar} open=${!!toast} autoHideDuration=${2500} onClose=${() => setToast('')} message=${toast} />
    <//>`;
}

function TopBar({ go, onLogout }) {
  const { t, lang, setLang } = useT();
  const [anchor, setAnchor] = useState(null);
  const [langAnchor, setLangAnchor] = useState(null);
  const [infoAnchor, setInfoAnchor] = useState(null);
  const [info, setInfo] = useState(null);
  const openInfo = k => { setInfoAnchor(null); setInfo(k); };
  return html`
    ${/* The vanilla's #topbar is position:fixed, height 48, z-index 200, and
          #main carries a matching margin-top:48px. Ignat removed the prototype
          banner on 2026-09-17; the bar sat at top:36 only to clear it, which
          is what left it looking broken once the banner went. */''}
    <${AppBar} position="fixed" sx=${{ bgcolor: NAVY, zIndex: 200, top: 0 }}>
      <${Toolbar} sx=${{ gap: 0.5 }}>
        ${/* The same extracted lockup the login screen uses — flag plus the
              QMS RPV CH wordmark — instead of the red "+" placeholder I had
              here. The wordmark's paths carry no fill, so they render black by
              default and would be invisible on the navy bar; they are forced
              white here rather than in the SVG, which stays as the vanilla
              wrote it. Scaled to the 48px dense toolbar. */''}
        <${Box} id="topbar-logo" aria-label="QMS RPV CH · Q-Explorer" role="img"
          sx=${{ display: 'flex', alignItems: 'center', gap: '10px', mr: 3,
                  '& .login-flag': { width: 25, height: 28, display: 'block' },
                  '& .login-name': { width: 98, height: 28, display: 'block' },
                  '& .login-name path': { fill: '#fff' } }}
          dangerouslySetInnerHTML=${{ __html: LOGIN_LOGO_SVG }} />
        <${Button} color="inherit" sx=${{ opacity: .75 }}>Startseite<//>
        <${Button} color="inherit" id="qx-nav-trigger" aria-haspopup="menu"
                   aria-expanded=${!!anchor}
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
        <${Tooltip} title=${t('info_menu')}>
          <${IconButton} color="inherit" id="info-trigger" aria-label=${t('info_menu')} aria-haspopup="menu"
            aria-expanded=${!!infoAnchor} onClick=${e => setInfoAnchor(e.currentTarget)} sx=${{ mr: .5 }}>
            <${Icon}>info_outline<//><//><//>
        <${Menu} anchorEl=${infoAnchor} open=${!!infoAnchor} onClose=${() => setInfoAnchor(null)} id="info-menu"
                 anchorOrigin=${{ vertical: 'bottom', horizontal: 'right' }}
                 transformOrigin=${{ vertical: 'top', horizontal: 'right' }}>
          <${MenuItem} onClick=${() => openInfo('documents')} id="info-m-documents">
            ${t('info_documents')}<//>
          <${MenuItem} onClick=${() => openInfo('contacts')} id="info-m-contacts">
            ${t('info_contacts')}<//>
          <${MenuItem} component="a" href=${'mailto:' + SUPPORT_MAIL} onClick=${() => setInfoAnchor(null)} id="info-m-support">
            ${t('info_support')}<//>
          <${Divider} />
          <${MenuItem} onClick=${() => openInfo('imprint')} id="info-m-imprint">
            ${t('info_imprint')}<//>
        <//>
        <${Button} color="inherit" variant="outlined" id="lang-trigger"
                   aria-haspopup="menu" aria-expanded=${!!langAnchor}
                   onClick=${e => setLangAnchor(e.currentTarget)}
                   sx=${{ borderColor: 'rgba(255,255,255,.4)' }}>${lang.toUpperCase()}<//>
        <${Menu} anchorEl=${langAnchor} open=${!!langAnchor} onClose=${() => setLangAnchor(null)}>
          ${['en', 'de'].map(l => html`
            <${MenuItem} key=${l} selected=${l === lang}
              onClick=${() => { setLang(l); setLangAnchor(null); }}>${l.toUpperCase()}<//>`)}
        <//>
        <${Button} color="inherit" id="logout-btn" onClick=${onLogout}
                   startIcon=${html`<${Icon}>logout<//>`}>${t('btn_logout')}<//>
      <//>
    <//>
    <${InfoDialog} which=${info} onClose=${() => setInfo(null)} />`;
}

/**
 * Screen: Login.
 *
 * Ignat, 2026-09-17: "There is no sign in." Correct — the port had no login
 * screen at all, and neither of my two checkers could see it: the assertion
 * suite has no login step, and the parity checker signs in on its first line
 * and then walks views by id, so the one view it dismissed is the one view it
 * never compared. Same failure as 2026-09-14, when the vanilla's own login
 * shipped broken for exactly this reason.
 *
 * Validation is the vanilla's doLogin(): each field owns its own message,
 * which is MUI's error + helperText unmodified.
 */
function Login({ onLogin }) {
  const { t } = useT();
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState({});

  const submit = () => {
    const next = {
      email: email.trim() ? '' : t('err_email_required'),
      pass: pass.trim() ? '' : t('err_password_required'),
    };
    setErr(next);
    if (!next.email && !next.pass) onLogin();
  };
  const onKey = e => { if (e.key === 'Enter') submit(); };

  const util = k => html`
    <${Box} component="a" key=${k} href=${'mailto:' + SUPPORT_MAIL} id="login-support"
      sx=${{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'none',
              border: 'none', p: 0, font: 'inherit', fontSize: 14, cursor: 'pointer',
              color: 'primary.dark' }}>
      <${Icon} sx=${{ fontSize: 18 }}>${UTIL_ICON[k]}<//>
      ${t(k)}
      <${Icon} sx=${{ fontSize: 14 }}>open_in_new<//>
    <//>`;

  return html`
    <${Box} id="view-login" sx=${{ position: 'fixed', inset: 0, bgcolor: '#FAFAFA', zIndex: 500,
             display: 'flex', flexDirection: 'column', alignItems: 'center',
             justifyContent: 'center' }}>

      ${/* flag 56x62 + the QMS RPV CH wordmark 210x61, extracted verbatim from
            the vanilla rather than redrawn — see LOGIN_LOGO_SVG in data.js */''}
      <${Box} className="login-logo" id="login-logo"
        sx=${{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
                mb: 4, '& .login-flag': { width: 56, height: 62 },
                '& .login-name': { width: 210, height: 61 } }}
        dangerouslySetInnerHTML=${{ __html: LOGIN_LOGO_SVG }} />

      <${Paper} variant="outlined" id="login-card"
        sx=${{ width: 380, p: '36px 40px', borderColor: '#E7E7E7', boxShadow: 'none' }}>
        <${Typography} component="h2" sx=${{ fontSize: 22, fontWeight: 700, mb: .5 }}>
          ${t('login_title')}<//>
        <${Typography} sx=${{ fontSize: 14, color: 'text.secondary', mb: 3.5 }}>
          ${t('login_subtitle')}<//>

        <${TextField} fullWidth id="login-email" type="email" label=${t('login_email')}
          placeholder="name@organisation.ch" value=${email} sx=${{ mb: err.email ? 0 : 2.25 }}
          onChange=${e => setEmail(e.target.value)} onKeyDown=${onKey}
          error=${!!err.email} helperText=${err.email || ''} />
        <${TextField} fullWidth id="login-password" type="password" label=${t('login_password')}
          placeholder="••••••••" value=${pass} sx=${{ mb: err.pass ? 0 : 2.25 }}
          onChange=${e => setPass(e.target.value)} onKeyDown=${onKey}
          error=${!!err.pass} helperText=${err.pass || ''} />

        ${/* navy, not primary blue — the vanilla's .btn-login is --appbar-navy */''}
        ${/* the vanilla's .btn-login is taller than MUI's small button:
              padding 8/10 with line-height 1.75 gives 39px, not 31px */''}
        <${Button} fullWidth variant="contained" id="login-submit" onClick=${submit}
          sx=${{ mt: 1, bgcolor: NAVY, padding: '8px 10px', lineHeight: 1.75,
                  '&:hover': { bgcolor: '#141D36' } }}>
          ${t('login_submit')}<//>

        <${Link} href="#" id="login-forgot" underline="none"
          onClick=${e => e.preventDefault()}
          sx=${{ display: 'block', textAlign: 'center', mt: 2, fontSize: 14 }}>
          ${t('login_forgot')}<//>
      <//>

      ${/* the utility bar sits on the bottom edge of the viewport: the three
            document links left, Support right — Impressum is a legal
            requirement in CH/DE, so it is not decoration */''}
      <${Box} id="login-utility-bar"
        sx=${{ position: 'absolute', left: 0, right: 0, bottom: 0, display: 'flex',
                alignItems: 'center', justifyContent: 'flex-end', gap: 2, p: '14px 24px' }}>
        ${/* Ignat, 2026-10-26: before sign-in only Support; documents,
              contacts and imprint are for signed-in users, in the top bar */''}
        ${util('util_support')}
      <//>
    <//>`;
}

function App() {
  // The vanilla prototype starts in English (index.html: `let lang = 'en'`).
  // This defaulted to German and my own suite asserted that as correct — a
  // test that enshrined my invention rather than checking the original.
  const [lang, setLang] = useState('en');
  const [route, setRoute] = useState({ name: 'list' });
  const [authed, setAuthed] = useState(false);
  // data.js owns t() and its lang binding, because the extracted record sets
  // call it while they build. Duplicating the lookup here would give two
  // implementations that can disagree.
  const t = useMemo(() => { setDataLang(lang); return k => window.t(k); }, [lang]);
  const go = (name, row, extra) => setRoute({ name, row, ...(extra || {}) });

  const screen =
    route.name === 'list'      ? html`<${EvaluationsList} go=${go} />` :
    route.name === 'scheduled' ? html`<${ScheduledReports} go=${go} />` :
    route.name === 'new'       ? html`<${NewEvaluation} go=${go} initialType=${route.evalType} />` :
    (route.name === 'report' && route.row && route.row.group === 'punctuality')
                               ? html`<${ReportPunctuality} go=${go} row=${route.row} />` :
    (route.name === 'report' && route.row && route.row.group === 'connection')
                               ? html`<${ReportConnection} go=${go} row=${route.row} />` :
    (route.name === 'report' && route.row && route.row.group === 'trip_failures')
                               ? html`<${ReportTripFailures} go=${go} row=${route.row} />` :
    (route.name === 'report' && route.row && route.row.group === 'data_quality')
                               ? html`<${ReportDQI} go=${go} row=${route.row} />` :
    (route.name === 'report' && route.row && route.row.group === 'line_analysis')
                               ? html`<${ReportLineAnalysis} go=${go} row=${route.row} />` :
    route.name === 'la-stop'   ? html`<${LaStopHeatmap} go=${go} row=${route.row} stop=${route.stop}
                                   kind=${route.kind} dir=${route.dir} mode=${route.mode} />` :
    route.name === 'chart'     ? html`<${ChartView} go=${go} row=${route.row}
                                   title=${route.chart.title} items=${route.chart.items}
                                   format=${route.chart.format}
                                   backLabel=${route.chart.backLabel}
                                   onBack=${() => go('report', route.row)} />` :
    route.name === 'mask'      ? html`<${Ausfallmaske} go=${go} row=${route.row} tuId=${route.tuId} day=${route.day} />` :
    route.name === 'fa-chart'  ? html`<${FaChart} go=${go} row=${route.row} node=${route.node} />` :
    route.name === 'conn-chart' ? html`<${ConnChart} go=${go} row=${route.row} node=${route.node} reduce=${route.reduce} strict=${route.strict} />` :
    route.name === 'conn-rows' ? html`<${ConnRows} go=${go} row=${route.row} node=${route.node} reduce=${route.reduce} />` :
    route.name === 'raw'       ? html`<${RawDataTable} go=${go} row=${route.row} rows=${PUNCT_RAW} node=${route.node}
                                        title=${t('rpt_action_raw')}
                                        backLabel=${route.row ? route.row.name : ''}
                                        onBack=${() => go('report', route.row)} />` :
    route.name === 'rohdaten'  ? html`<${RohdatenConfig} go=${go} row=${route.row} />` :
    (route.name === 'report' && route.row && route.row.group === 'raw_data')
                               ? html`<${RawDataTable} go=${go} row=${route.row} rows=${PUNCT_RAW}
                                        title=${route.row.name} />` :
                                 html`<${NotPorted} go=${go} row=${route.row} />`;

  if (!authed) return html`
    <${I18n.Provider} value=${{ t, lang, setLang }}>
      <${ThemeProvider} theme=${theme}>
        <${CssBaseline} />
        <${Login} onLogin=${() => { setAuthed(true); setRoute({ name: 'list' }); }} />
      <//>
    <//>`;

  return html`
    <${I18n.Provider} value=${{ t, lang, setLang }}>
      <${ThemeProvider} theme=${theme}>
        <${CssBaseline} />
        <${Box} sx=${{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <${TopBar} go=${go} onLogout=${() => setAuthed(false)} />
          <${Box} sx=${{ flex: 1, mt: '48px' }}>${screen}<//>
        <//>
      <//>
    <//>`;
}

ReactDOM.createRoot(document.getElementById('root')).render(html`<${App} />`);
