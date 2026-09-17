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
  FormControlLabel, Divider,
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
const ROWS = EVALUATIONS;


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
        subtitle=${`${rows.length} ${t(rows.length === 1 ? 'eval_count_one' : 'eval_count_many')}`}
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
              <${Table}>
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
                      <${TableCell}>
                        ${r.name}
                        ${statusOf(r) === 'failed' && FAIL_REASON_OF(r) && html`
                          <${Typography} variant="caption" color="error" display="block"
                            className="fail-reason">${t(FAIL_REASON_OF(r))}<//>`}
                      <//>
                      <${TableCell}>${r.period}<//>
                      <${TableCell}>${r.created}<//>
                      <${TableCell}>
                        <${Tooltip} title=${statusOf(r) === 'failed' && FAIL_REASON_OF(r)
                                             ? t(FAIL_REASON_OF(r)) : ''}>
                          <${Chip} size="small" variant="outlined"
                                   sx=${statusOf(r) === 'failed' ? { cursor: 'help' } : undefined}
                                   label=${t(STATUS_KEY[statusOf(r)])} color=${STATUS_COLOUR[statusOf(r)]} />
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
  const { t } = useT();
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
                  <${TableCell}><${Chip} size="small" variant="outlined"
                                         label=${t(s.freqKey)} /><//>
                  <${TableCell}>${s.next}<//>
                  <${TableCell}>${s.last}<//>
                  <${TableCell}>
                    <${Chip} size="small" variant="outlined" label=${t('status_' + statusOf(s))}
                             color=${statusOf(s) === 'active' ? 'success' : 'default'} />
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
/** yyyy-mm-dd (what <input type=date> gives) → dd.mm.yyyy, as the vanilla shows it. */
const fmtSwiss = v => {
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : v;
};

function ScopeSelect({ id, label, values, options, onChange, minWidth = 210 }) {
  const { t } = useT();
  const labelId = id + '-label';
  return html`
    <${FormControl} sx=${{ minWidth }} id=${id}>
      <${InputLabel} id=${labelId}>${label}<//>
      <${Select} multiple labelId=${labelId} label=${label} value=${values}
        onChange=${e => onChange(typeof e.target.value === 'string'
                                  ? e.target.value.split(',') : e.target.value)}
        renderValue=${v => v.length > 2 ? `${v.length} ${t('selected_word')}` : v.join(', ')}
        MenuProps=${{ PaperProps: { sx: { maxHeight: 320 } } }}>
        ${options.length === 0 && html`
          <${MenuItem} disabled value="">${t('no_options')}<//>`}
        ${options.map(o => html`
          <${MenuItem} key=${o.id} value=${o.id}>
            <${Checkbox} size="small" checked=${values.indexOf(o.id) > -1} />
            <${ListItemText} primary=${o.label} />
          <//>`)}
      <//>
    <//>`;
}

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
              <${Typography} variant="caption" color="text.secondary" display="block">
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
  const [days, setDays] = useState([]);
  const [modes, setModes] = useState([]);
  const [tu, setTu] = useState([]);
  const [cantons, setCantons] = useState([]);
  const [lines, setLines] = useState([]);
  const [stops, setStops] = useState([]);
  const [name, setName] = useState('');
  const [nameEdited, setNameEdited] = useState(false);

  const locked = !type;
  const nameError = touched && !name.trim();
  // validateCustomRange(): the end date must not precede the start.
  const rangeReversed = period === 'custom' && !!from && !!to && from > to;

  /* Lines and stops cascade off the chosen transport companies, as
     renderLinesOptions() does — with no TU picked it offers every line. */
  const lineOptions = useMemo(() => {
    const src = tu.length ? tu.flatMap(id => DATA.tuLines[id] || [])
                          : Object.values(DATA.tuLines).flat();
    return [...new Set(src)].sort().map(x => ({ id: x, label: x }));
  }, [tu]);
  const stopOptions = useMemo(() =>
    (DATA.allStops || []).map(x => ({ id: x, label: x })), []);
  const tuOptions = ALL_TU.map(x => ({ id: x.id, label: x.label }));
  const cantonOptions = ALL_CANTONS.map(c => ({ id: c, label: (CANTON_NAMES[c] || c) }));
  const modeOptions = FLAT_MODES.map(m => ({ id: m.id, label: m.label }));

  /* updateAutoName(): "<type> – <period>, <filters>", and it stops following
     the form the moment the name is edited by hand. */
  const periodLabel = period === 'custom'
    ? (from && to ? `${fmtSwiss(from)} – ${fmtSwiss(to)}` : t('preset_custom'))
    : t('preset_' + period);
  const autoName = useMemo(() => {
    if (!type) return '';
    const parts = [];
    if (tu.length) parts.push(tu.join(', '));
    if (cantons.length) parts.push(t('canton_label') + ' ' + cantons.join(', '));
    if (lines.length) parts.push(t('filter_lines') + ': ' + lines.join(', '));
    if (stops.length) parts.push(t('filter_stops') + ': ' + stops.join(', '));
    const base = parts.length ? ', ' + parts.join(', ') : ', ' + t('all_lines');
    const dayPart = days.length && days.length < 7 ? ', ' + days.join('/') : '';
    return `${t('type_' + type)} – ${periodLabel}${base}${dayPart}`;
  }, [type, tu, cantons, lines, stops, days, periodLabel, t]);

  // The generated name lands in the field; typing in it takes over.
  React.useEffect(() => { if (!nameEdited) setName(autoName); }, [autoName, nameEdited]);

  // Dropping a TU drops the lines that belonged only to it.
  React.useEffect(() => {
    setLines(l => l.filter(x => lineOptions.some(o => o.id === x)));
  }, [lineOptions]);


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
                ${/* nameManuallyEdited: once it is typed in, the generator
                      stops overwriting it. I had the flag and the effect but
                      nothing ever set it, so a hand-written name was wiped by
                      the next filter change. */''}
                onChange=${e => { setNameEdited(true); setName(e.target.value); }} />
              <${FormControl} required sx=${{ flex: 1 }}>
                <${InputLabel}>${t('sel_eval_type')}<//>
                <${Select} id="eval-type" value=${type} label=${t('sel_eval_type')}
                           onChange=${e => {
                             // Raw Data Export has its own config form rather
                             // than the period/scope cards — same as the vanilla.
                             if (e.target.value === 'raw_data') { go('rohdaten'); return; }
                             setType(e.target.value);
                           }}>
                  ${TYPE_KEYS.map(k => html`
                    <${MenuItem} key=${k} value=${k}>
                      <${Icon} sx=${{ fontSize: 18, mr: 1, color: 'primary.main' }}>${TYPE_ICON[k]}<//>
                      ${t('type_' + k)}
                    <//>`)}
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
                ${t('step1_subtitle')}
              <//>
              ${/* selectPreset(): the vanilla's six presets, one of them custom */''}
              <${Stack} direction="row" spacing=${1} sx=${{ mb: 2 }} flexWrap="wrap" useFlexGap
                        id="preset-group">
                ${['last_7', 'cur_month', 'last_month', 'cur_year', 'last_year', 'custom'].map(p =>
                  html`<${Chip} key=${p} id=${'preset-' + p} label=${t('preset_' + p)} clickable
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
              <${Typography} variant="body2" color="text.secondary" sx=${{ mb: 2 }}>
                ${t('step2_subtitle')}
              <//>
              <${Stack} direction="row" spacing=${2} flexWrap="wrap" useFlexGap>
                <${ScopeSelect} id="f-modes" label=${t('filter_transport_mode')}
                  values=${modes} options=${modeOptions} onChange=${setModes} />
                <${ScopeSelect} id="f-tu" label=${t('filter_tu')}
                  values=${tu} options=${tuOptions} onChange=${setTu} />
                <${ScopeSelect} id="f-cantons" label=${t('filter_cantons')}
                  values=${cantons} options=${cantonOptions} onChange=${setCantons} />
                <${ScopeSelect} id="f-lines" label=${t('filter_lines')}
                  values=${lines} options=${lineOptions} onChange=${setLines} />
                <${ScopeSelect} id="f-stops" label=${t('filter_stops')}
                  values=${stops} options=${stopOptions} onChange=${setStops} />
              <//>

              ${/* the vanilla's summary-filters row: what the run will cover */''}
              <${Divider} sx=${{ my: 2 }} />
              <${Typography} variant="body2" color="text.secondary" id="summary-filters">
                ${periodLabel}${tu.length ? ' · ' + tu.join(', ') : ''}
                ${cantons.length ? ' · ' + t('canton_label') + ' ' + cantons.join(', ') : ''}
                ${lines.length ? ' · ' + lines.length + ' ' + t('filter_lines') : ''}
                ${stops.length ? ' · ' + stops.length + ' ' + t('filter_stops') : ''}
                ${!tu.length && !cantons.length && !lines.length && !stops.length
                  ? ' · ' + t('all_lines') : ''}
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

function PunctRow({ node, depth, t, onChart, onRaw }) {
  const [open, setOpen] = useState(depth === 0);
  const kids = node.children || [];
  const pad = 16 + depth * 20;
  return html`
    <${React.Fragment}>
      <${TableRow} hover>
        <${TableCell} sx=${{ pl: `${pad}px` }}>
          ${kids.length > 0 && html`
            <${IconButton} aria-label=${open ? 'collapse' : 'expand'} aria-expanded=${open}
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
            <${IconButton} aria-label="chart" onClick=${() => onChart && onChart(node)}>
              <${Icon}>bar_chart<//>
            <//>
          <//>
          ${/* The vanilla gives every punctuality row TWO actions — chart and
                the raw data table (openPunctRaw). Only the chart was ported,
                which is why the 4 950-row table had no way in. */''}
          <${Tooltip} title=${t('rpt_action_raw')}>
            <${IconButton} aria-label="raw" onClick=${() => onRaw && onRaw(node)}>
              <${Icon}>table_chart<//>
            <//>
          <//>
        <//>
      <//>
      ${open && kids.map((k, i) =>
        html`<${PunctRow} key=${k.label + i} node=${k} depth=${depth + 1} t=${t}
               onChart=${onChart} onRaw=${onRaw} />`)}
    <//>`;
}

function ReportPunctuality({ go, row }) {
  const { t } = useT();
  // The vanilla's punct-auf-1/2 carry selected="linienbuendel" and
  // selected="linie", so the report opens TWO levels deep. Mine opened one,
  // which is a quieter version of "the report is missing rows".
  const [dims, setDims] = useState(['linienbuendel', 'linie', '']);

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
              ${tree.map((n, i) => html`
                <${PunctRow} key=${n.label + i} node=${n} depth=${0} t=${t}
                  onChart=${node => go('chart', row, { chart: {
                    title: node.label,
                    backLabel: t('type_punctuality'),
                    format: v => v.toFixed(1) + '%',
                    items: (node.children && node.children.length ? node.children : [node])
                      .map(c => ({ label: c.label, value: c.agg.wert || 0 })),
                  } })}
                  onRaw=${() => go('raw', row)} />`)}
              <${TableRow} sx=${{ '& td': { fontWeight: 500, bgcolor: '#FAFAFA' } }}>
                <${TableCell}>${t('rpt_gesamt')}<//>
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


/* ── Screen: Connection Punctuality ───────────────────────────────────
   Same shape as Punctuality, different model: rptBuildTree / rptAggregate
   over RPT_RECORDS, both from data.js. The value columns come from
   RPT_DATA.gesamt's own length, so adding a metric upstream adds a column
   here rather than silently dropping one. */
function RptRow({ node, depth, cols, onChart }) {
  const [open, setOpen] = useState(depth === 0);
  const kids = node.children || [];
  return html`
    <${React.Fragment}>
      <${TableRow} hover>
        <${TableCell} sx=${{ pl: `${16 + depth * 20}px` }}>
          ${kids.length > 0 && html`
            <${IconButton} onClick=${() => setOpen(o => !o)} aria-label=${open ? 'collapse' : 'expand'} aria-expanded=${open} sx=${{ mr: .5 }}>
              <${Icon} sx=${{ fontSize: 18 }}>${open ? 'expand_more' : 'chevron_right'}<//>
            <//>`}
          ${node.label}
        <//>
        ${cols.map((_, i) => html`
          <${TableCell} key=${i} align="right">
            ${node.v[i] === null || node.v[i] === undefined ? '—' : node.v[i].toFixed(2) + '%'}
          <//>`)}
        <${TableCell} align="right">
          <${IconButton} aria-label="chart" onClick=${() => onChart && onChart(node)}>
            <${Icon}>bar_chart<//>
          <//>
        <//>
      <//>
      ${open && kids.map((k, i) => html`
        <${RptRow} key=${k.label + i} node=${k} depth=${depth + 1} cols=${cols} onChart=${onChart} />`)}
    <//>`;
}

/**
 * The Connection report's parameter chips.
 *
 * Read-only by design: they carry a caret and a pointer cursor, so they read
 * as filters, and the vanilla answers that with a "read-only" footer inside
 * each dropdown rather than by removing the affordance. Reproduced, footer
 * and all — dropping the footer would leave the misleading half.
 */
function ParamChips() {
  const { t } = useT();
  const [open, setOpen] = useState(null);
  return html`
    <${Stack} direction="row" spacing=${1} sx=${{ mb: 2, flexWrap: 'wrap', gap: 1 }}
              id="rpt-param-row">
      ${CONNECTION_CHIPS.map((c, i) => html`
        <${Box} key=${i} sx=${{ position: 'relative' }}>
          <${Chip} size="small" variant="outlined" clickable
            id=${'chip-' + i} role="button" aria-expanded=${open === i}
            title=${t('chip_readonly_title')}
            onClick=${() => setOpen(o => (o === i ? null : i))}
            icon=${html`<${Icon} sx=${{ fontSize: 14 }}>${c.icon}<//>`}
            label=${c.label}
            deleteIcon=${html`<${Icon} sx=${{ fontSize: 14,
                                transition: 'transform .15s',
                                transform: open === i ? 'rotate(180deg)' : 'none' }}>expand_more<//>`}
            onDelete=${() => setOpen(o => (o === i ? null : i))} />
          ${open === i && html`
            <${Paper} variant="outlined" className="rpt-chip-dropdown"
              sx=${{ position: 'absolute', zIndex: 10, mt: .5, minWidth: 220,
                      maxHeight: 280, overflow: 'auto', borderColor: '#E7E7E7' }}>
              <${Typography} variant="caption" sx=${{ display: 'block', px: 1.5, pt: 1,
                               color: 'text.secondary', fontWeight: 500 }}>
                ${t(c.headerKey)}<//>
              ${c.items.map((it, k) => html`
                <${Typography} key=${k} variant="body2" sx=${{ px: 1.5, py: .5 }}>${it}<//>`)}
              <${Box} sx=${{ display: 'flex', alignItems: 'center', gap: .75, px: 1.5, py: 1,
                              borderTop: '1px solid #E7E7E7', color: 'text.secondary' }}>
                <${Icon} sx=${{ fontSize: 14 }}>visibility<//>
                <${Typography} variant="caption">${t('chip_readonly')}<//>
              <//>
            <//>`}
        <//>`)}
    <//>`;
}

function ReportConnection({ go, row }) {
  const { t } = useT();
  const DIMS = Object.keys(RPT_DIM_LABELS);
  const [dims, setDims] = useState(['linienbuendel_abb', '', '']);
  const active = dims.filter(Boolean);
  const tree = useMemo(
    () => rptBuildTree(RPT_RECORDS, active.length ? active : ['linienbuendel_abb']),
    [dims.join('|')]);
  const cols = RPT_DATA.gesamt;

  const setLevel = (i, v) => setDims(d => {
    const n = [...d]; n[i] = v;
    for (let j = i + 1; j < n.length; j++) n[j] = '';
    return n;
  });

  return html`
    <${Box}>
      <${PageHeader}
        crumbs=${[{ label: t('nav_evaluations'), onClick: () => go('list') },
                  { label: row ? row.name : t('type_connection') }]}
        title=${row ? row.name : t('type_connection')} subtitle=${t('type_connection')}
        action=${html`<${Button} variant="outlined"
                        startIcon=${html`<${Icon} sx=${{ fontSize: 18 }}>download<//>`}>${t('export_csv')}<//>`} />
      <${Box} sx=${{ p: 3 }}>
        <${ParamChips} />
        <${Card} sx=${{ mb: 3 }}><${CardContent}>
          <${Typography} variant="subtitle2" sx=${{ mb: 1.5 }}>${t('punct_aufschluss_label')}<//>
          <${Stack} direction="row" spacing=${2} flexWrap="wrap" useFlexGap>
            ${[0, 1, 2].map(i => html`
              <${FilterSelect} key=${i} id=${'rpt-auf-' + (i + 1)}
                label=${t(i === 0 ? 'sel_breakdown_1' : i === 1 ? 'sel_breakdown_2' : 'sel_breakdown_3')}
                value=${dims[i]} onChange=${v => setLevel(i, v)} minWidth=${210}
                options=${DIMS.filter(d => !dims.some((x, j) => x === d && j !== i))
                  .map(d => ({ value: d, label: t(RPT_DIM_LABELS[d]) }))} />`)}
          <//>
        <//><//>
        <${TableContainer} component=${Paper} variant="outlined" sx=${{ borderColor: '#E7E7E7' }}>
          <${Table} id="rpt-table">
            <${TableHead}><${TableRow}>
              <${TableCell}>${t('rpt_col_name')}<//>
              ${cols.map((_, i) => html`<${TableCell} key=${i} align="right">
                ${i === 0 ? t('rpt_col_apcq') : t('rpt_col_punct_zub') + ' ' + i}<//>`)}
              <${TableCell} align="right">${t('col_actions')}<//>
            <//><//>
            <${TableBody}>
              ${tree.map((n, i) => html`
                <${RptRow} key=${n.label + i} node=${n} depth=${0} cols=${cols}
                  onChart=${node => go('chart', row, { chart: {
                    title: node.label, backLabel: t('type_connection'),
                    format: v => v.toFixed(1) + '%',
                    items: (node.children && node.children.length ? node.children : [node])
                      .map(c => ({ label: c.label, value: c.v[0] || 0 })),
                  } })} />`)}
              <${TableRow} sx=${{ '& td': { fontWeight: 500, bgcolor: '#FAFAFA' } }}>
                <${TableCell}>${t('rpt_gesamt')}<//>
                ${cols.map((v, i) => html`<${TableCell} key=${i} align="right">${v === null ? '—' : v.toFixed(2) + '%'}<//>`)}
                <${TableCell} />
              <//>
            <//>
          <//>
        <//>
      <//>
    <//>`;
}

/* ── Screen: Trip Failures DPM (Fahrtausfälle) ────────────────────────
   Each TU carries six metrics and a list of Betriebstage. The failure-rate
   colouring uses faPct(), extracted, so the thresholds match the vanilla
   (0 / <2 / 2–5 / 5–50 / 50+) rather than being re-invented here. */
function FaRow({ tu, t, onMask, onChart }) {
  const [open, setOpen] = useState(false);
  const days = tu.tage || [];
  const rate = v => {
    const pct = faPct(v[1], v[0]);
    const colour = pct === 0 ? 'text.disabled' : pct >= 50 ? 'error.main'
                 : pct >= 5 ? 'warning.main' : pct >= 2 ? 'warning.light' : 'success.main';
    return html`<${Typography} variant="body2" component="span" color=${colour}>${pct.toFixed(2)}%<//>`;
  };
  return html`
    <${React.Fragment}>
      <${TableRow} hover>
        <${TableCell}>
          ${days.length > 0 && html`
            <${IconButton} onClick=${() => setOpen(o => !o)} aria-label=${open ? 'collapse' : 'expand'} aria-expanded=${open} sx=${{ mr: .5 }}>
              <${Icon} sx=${{ fontSize: 18 }}>${open ? 'expand_more' : 'chevron_right'}<//>
            <//>`}
          ${tu.label}
        <//>
        <${TableCell} align="right">${faNum(tu.v[0])}<//>
        <${TableCell} align="right">${faNum(tu.v[1])}<//>
        <${TableCell} align="right">${rate(tu.v)}<//>
        <${TableCell} align="right">${faNum(tu.v[2])}<//>
        <${TableCell} align="right">${faNum(tu.v[3])}<//>
        <${TableCell} align="right">
          <${Tooltip} title=${t('rpt_action_chart')}>
            <${IconButton} aria-label="chart" onClick=${() => onChart && onChart(tu)}>
              <${Icon}>bar_chart<//>
            <//>
          <//>
          <${Tooltip} title=${t('fa_mask_title')}>
            <${IconButton} aria-label="mask" onClick=${() => onMask && onMask(tu)}>
              <${Icon}>fact_check<//>
            <//>
          <//>
        <//>
      <//>
      ${open && days.map((d, i) => html`
        <${TableRow} key=${d.d + i} hover>
          <${TableCell} sx=${{ pl: '52px' }}>${d.d}<//>
          <${TableCell} align="right">${faNum(d.v[0])}<//>
          <${TableCell} align="right">${faNum(d.v[1])}<//>
          <${TableCell} align="right">${rate(d.v)}<//>
          <${TableCell} align="right">${faNum(d.v[2])}<//>
          <${TableCell} align="right">${faNum(d.v[3])}<//>
          <${TableCell} />
        <//>`)}
    <//>`;
}

function ReportTripFailures({ go, row }) {
  const { t } = useT();
  // The vanilla offers eight controls here and my first pass had none —
  // the parity check counted 8 -> 0. Show (which TU), Metric, and the same
  // three-level breakdown plus two "additionally by" levels.
  const [tu, setTu] = useState('');
  const [metric, setMetric] = useState('0');
  const [dims, setDims] = useState(['', '', '']);
  const [add, setAdd] = useState(['', '']);

  const all = FA_DATA.tus || [];
  const tus = tu ? all.filter(x => x.id === tu) : all;

  const METRICS = [
    { value: '0', key: 'fa_col_fahrtzeit' },
    { value: '1', key: 'fa_col_fahrten' },
    { value: '2', key: 'fa_col_haltestellen' },
  ];
  const FA_DIMS = ['betriebstag', 'linie', 'tu', 'vm', 'region'];
  const setLevel = (arr, setArr) => (i, v) => setArr(d => {
    const n = [...d]; n[i] = v;
    for (let j = i + 1; j < n.length; j++) n[j] = '';
    return n;
  });

  return html`
    <${Box}>
      <${PageHeader}
        crumbs=${[{ label: t('nav_evaluations'), onClick: () => go('list') },
                  { label: row ? row.name : t('type_trip_failures') }]}
        title=${row ? row.name : t('type_trip_failures')} subtitle=${t('type_trip_failures')}
        action=${html`<${Button} variant="outlined"
                        startIcon=${html`<${Icon} sx=${{ fontSize: 18 }}>download<//>`}>${t('export_csv')}<//>`} />
      <${Box} sx=${{ p: 3 }}>
        <${Card} sx=${{ mb: 3 }}><${CardContent}>
          <${Stack} direction="row" spacing=${2} flexWrap="wrap" useFlexGap sx=${{ mb: 2 }}>
            <${FilterSelect} id="fa-ub-tu-sel" label=${t('sel_show')} value=${tu}
              onChange=${setTu} minWidth=${200}
              options=${all.map(x => ({ value: x.id, label: x.label }))} />
            <${FilterSelect} id="fa-ub-metric-sel" label=${t('sel_metric')} value=${metric}
              onChange=${v => setMetric(v || '0')} minWidth=${200}
              options=${METRICS.map(m => ({ value: m.value, label: t(m.key) }))} />
          <//>
          <${Typography} variant="subtitle2" sx=${{ mb: 1.5 }}>${t('punct_aufschluss_label')}<//>
          <${Stack} direction="row" spacing=${2} flexWrap="wrap" useFlexGap sx=${{ mb: 2 }}>
            ${[0, 1, 2].map(i => html`
              <${FilterSelect} key=${i} id=${'fa-auf-' + (i + 1)}
                label=${t(i === 0 ? 'sel_breakdown_1' : i === 1 ? 'sel_breakdown_2' : 'sel_breakdown_3')}
                value=${dims[i]} onChange=${v => setLevel(dims, setDims)(i, v)} minWidth=${200}
                options=${FA_DIMS.filter(d => !dims.some((x, j) => x === d && j !== i))
                  .map(d => ({ value: d, label: t(PUNCT_DIM_LABELS[d] || 'fa_opt_' + d) }))} />`)}
          <//>
          <${Stack} direction="row" spacing=${2} flexWrap="wrap" useFlexGap>
            ${[0, 1].map(i => html`
              <${FilterSelect} key=${i} id=${'fa-add-' + (i + 1)}
                label=${t(i === 0 ? 'sel_additional_1' : 'sel_additional_2')}
                value=${add[i]} onChange=${v => setLevel(add, setAdd)(i, v)} minWidth=${200}
                options=${FA_DIMS.filter(d => !add.some((x, j) => x === d && j !== i))
                  .map(d => ({ value: d, label: t(PUNCT_DIM_LABELS[d] || 'fa_opt_' + d) }))} />`)}
          <//>
        <//><//>
        <${TableContainer} component=${Paper} variant="outlined" sx=${{ borderColor: '#E7E7E7' }}>
          <${Table} id="fa-table">
            <${TableHead}><${TableRow}>
              <${TableCell}>${t('fa_col_name')}<//>
              <${TableCell} align="right">${t('fa_col_gesamt')}<//>
              <${TableCell} align="right">${t('fa_col_ausgefallen')}<//>
              <${TableCell} align="right">${t('fa_col_ausfallquote')}<//>
              <${TableCell} align="right">${t('fa_col_fahrtzeit')}<//>
              <${TableCell} align="right">${t('fa_col_haltestellen')}<//>
              <${TableCell} align="right">${t('col_actions')}<//>
            <//><//>
            <${TableBody}>
              ${tus.map((tu, i) => html`
                <${FaRow} key=${tu.id + i} tu=${tu} t=${t}
                  onMask=${x => go('mask', row, { tuId: x.id })}
                  onChart=${x => go('chart', row, { chart: {
                    title: x.label, backLabel: t('type_trip_failures'),
                    format: v => faNum(Math.round(v)),
                    items: (x.tage || []).map(d => ({ label: d.d, value: d.v[1] || 0 })),
                  } })} />`)}
              <${TableRow} sx=${{ '& td': { fontWeight: 500, bgcolor: '#FAFAFA' } }}>
                <${TableCell}>${t('fa_col_gesamt')}<//>
                ${FA_DATA.gesamt.slice(0, 2).map((v, i) => html`<${TableCell} key=${i} align="right">${faNum(v)}<//>`)}
                <${TableCell} align="right">${faPct(FA_DATA.gesamt[1], FA_DATA.gesamt[0]).toFixed(2)}%<//>
                <${TableCell} align="right">${faNum(FA_DATA.gesamt[2])}<//>
                <${TableCell} align="right">${faNum(FA_DATA.gesamt[3])}<//>
                <${TableCell} />
              <//>
            <//>
          <//>
        <//>
      <//>
    <//>`;
}

/* ── Screen: Data Quality Index DPM ───────────────────────────────────
   Ten indicators across transport companies and cantons. dqiBand() —
   extracted — gives each indicator's observed min/max, which is what the
   colouring is relative to; a fixed scale would make every column look
   identical because they all sit in the high nineties. */
function ReportDQI({ go, row }) {
  const { t } = useT();
  // The vanilla has TWO tabs and I had only built the table — Ignat spotted
  // it, and scripts/qx-feature-parity.cjs now catches the whole class.
  const [tab, setTab] = useState('overview');
  const [scope, setScope] = useState('tu');
  const [entity, setEntity] = useState('');
  const rows = scope === 'tu' ? DQI_TU : DQI_KANTON;
  const bands = useMemo(() => DQI_INDICATORS.map((_, i) => dqiBand(i)), []);
  // Entity narrows the overview to one company or canton; empty is all of them.
  const entities = rows.filter(r => !r.total);
  const shown = entity ? entities.filter(e => e.label === entity) : entities;

  return html`
    <${Box}>
      <${PageHeader}
        crumbs=${[{ label: t('nav_evaluations'), onClick: () => go('list') },
                  { label: row ? row.name : t('type_data_quality') }]}
        title=${row ? row.name : t('type_data_quality')} subtitle=${t('type_data_quality')}
        action=${html`<${Button} variant="outlined"
                        startIcon=${html`<${Icon} sx=${{ fontSize: 18 }}>download<//>`}>${t('export_csv')}<//>`} />
      <${Tabs} value=${tab} onChange=${(e, v) => setTab(v)} id="dqi-tabs"
               sx=${{ px: 3, bgcolor: '#fff', borderBottom: '1px solid #E7E7E7' }}>
        <${Tab} value="overview" label=${t('dqi_tab_overview')} />
        <${Tab} value="table" label=${t('dqi_tab_table')} />
      <//>

      <${Box} sx=${{ p: 3 }}>
        <${Card} sx=${{ mb: 3 }}><${CardContent}>
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

        ${tab === 'overview' && html`
          <${Box} id="dqi-overview">
            <${Typography} variant="body2" color="text.secondary" sx=${{ mb: 2 }}>
              ${t('dqi_lg_band')}
            <//>
            <${Box} sx=${{ display: 'grid', gap: 2,
                            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
              ${DQI_INDICATORS.map((ind, i) => {
                const b = bands[i];
                return html`
                  <${Card} key=${ind.n} className="dqi-card">
                    <${CardContent}>
                      <${Typography} variant="subtitle2" gutterBottom>${ind.n}. ${t(ind.key)}<//>
                      <${Typography} variant="h5" sx=${{ mb: .5 }}>
                        ${typeof DQI_NATIONAL[i] === 'number' ? DQI_NATIONAL[i].toFixed(2) : '—'}
                      <//>
                      <${Typography} variant="caption" color="text.secondary" display="block" sx=${{ mb: 1 }}>
                        ${b.min.toFixed(2)} – ${b.max.toFixed(2)}
                      <//>
                      ${/* dqiSpark() is extracted from the vanilla, so the
                            sparkline is the same generator, not a lookalike */''}
                      <${Box} dangerouslySetInnerHTML=${{ __html: dqiSpark(shown[0] ? shown[0].label : 'CH', i, 12) }} />
                    <//>
                  <//>`;
              })}
            <//>
          <//>`}

        ${tab === 'table' && html`<${Box} id="dqi-table-panel">
        <${TableContainer} component=${Paper} variant="outlined" sx=${{ borderColor: '#E7E7E7' }}>
          <${Table} id="dqi-table">
            <${TableHead}><${TableRow}>
              <${TableCell}>${t('rpt_col_name')}<//>
              ${DQI_INDICATORS.map(ind => html`
                <${Tooltip} key=${ind.n} title=${t(ind.key)}>
                  <${TableCell} align="right">${ind.n}<//>
                <//>`)}
            <//><//>
            <${TableBody}>
              ${(entity ? rows.filter(r => r.total || r.label === entity) : rows).map((r, ri) => html`
                <${TableRow} key=${r.label + ri} hover
                             sx=${r.total ? { '& td': { fontWeight: 500, bgcolor: '#FAFAFA' } } : {}}>
                  <${TableCell}>${r.label}<//>
                  ${r.v.map((v, i) => {
                    const b = bands[i];
                    const low = typeof v === 'number' && b && v <= b.min + (b.max - b.min) * 0.25;
                    return html`<${TableCell} key=${i} align="right">
                      <${Typography} variant="body2" component="span"
                        color=${typeof v !== 'number' ? 'text.disabled' : low ? 'error.main' : 'text.primary'}>
                        ${typeof v === 'number' ? v.toFixed(2) : '—'}
                      <//>
                    <//>`;
                  })}
                <//>`)}
            <//>
          <//>
        <//>
        <//>`}
      <//>
    <//>`;
}

/* ── Screen: raw data ─────────────────────────────────────────────────
   One component for both raw sets — PUNCT_RAW is 4 950 x 18, RPT_RAW is
   140 x 13 — with per-column filters and paging. Every column filter is
   an ordinary text field: a Select would need MUI X Pro for multi-column
   filtering, which the licence question has not settled. */
function RawDataTable({ go, row, rows, title, onBack, backLabel }) {
  const { t } = useT();
  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(0);
  const perPage = 25;

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
        <${TableContainer} component=${Paper} variant="outlined" sx=${{ borderColor: '#E7E7E7', overflowX: 'auto' }}>
          <${Table} id="raw-table">
            <${TableHead}>
              <${TableRow}>
                ${rows[0].map((_, i) => html`<${TableCell} key=${i}>${i + 1}<//>`)}
              <//>
              <${TableRow}>
                ${rows[0].map((_, i) => html`
                  <${TableCell} key=${i} sx=${{ p: .5 }}>
                    <${TextField} variant="standard" size="small" placeholder="…"
                      value=${filters[i] || ''}
                      onChange=${e => { setPage(0); setFilters(f => ({ ...f, [i]: e.target.value })); }}
                      sx=${{ minWidth: 70 }} />
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
  const { t } = useT();
  return html`
    <${Box}>
      <${PageHeader}
        crumbs=${[{ label: t('nav_evaluations'), onClick: () => go('list') },
                  { label: backLabel, onClick: onBack },
                  { label: t('rpt_action_chart') }]}
        title=${title} subtitle=${t('rpt_action_chart')} />
      <${Box} sx=${{ p: 3 }}>
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
  const [tu, setTu] = useState('');
  const [threshold, setThreshold] = useState('');
  const [dir, setDir] = useState('');
  const [touched, setTouched] = useState(false);
  const missing = touched && !threshold;

  const THRESHOLDS = ['rd_thr_1', 'rd_thr_2', 'rd_thr_3', 'rd_thr_4', 'rd_thr_5'];

  return html`
    <${Box}>
      <${PageHeader}
        crumbs=${[{ label: t('nav_evaluations'), onClick: () => go('list') },
                  { label: row ? row.name : t('type_raw_data') }]}
        title=${row ? row.name : t('type_raw_data')} subtitle=${t('type_raw_data')}
        action=${html`<${Button} variant="contained" id="rd-run-btn"
                        startIcon=${html`<${Icon} sx=${{ fontSize: 18 }}>play_arrow<//>`}
                        onClick=${() => setTouched(true)}>${t('rd_run')}<//>`} />
      <${Box} sx=${{ p: 3, maxWidth: 1100 }}>
        <${Card} sx=${{ mb: 3 }}><${CardContent}>
          <${Typography} variant="h6" gutterBottom>${t('rd_section_title')}<//>
          <${Typography} variant="body2" color="text.secondary" sx=${{ mb: 2 }}>
            ${t('rd_section_subtitle')}
          <//>
          <${Stack} direction="row" spacing=${2} sx=${{ mb: 2 }}>
            <${TextField} label=${t('label_from')} type="date" InputLabelProps=${{ shrink: true }} />
            <${TextField} label=${t('label_to')} type="date" InputLabelProps=${{ shrink: true }} />
          <//>
          <${Stack} direction="row" spacing=${2} flexWrap="wrap" useFlexGap>
            <${FilterSelect} id="rd-tu" label=${t('filter_tu')} value=${tu}
              onChange=${setTu} minWidth=${220}
              options=${RD_TU.map(x => ({ value: String(x), label: String(x) }))} />
            <${FilterSelect} id="rd-dir" label=${t('rd_step_directions')} value=${dir}
              onChange=${setDir} minWidth=${220}
              options=${[{ value: 'hin', label: t('rd_dir_hin') },
                         { value: 'rueck', label: t('rd_dir_rueck') }]} />
          <//>
        <//><//>

        <${Card}><${CardContent}>
          <${Typography} variant="h6" gutterBottom>${t('rd_step_threshold')}<//>
          <${FormControl} required error=${missing} sx=${{ minWidth: 320 }} id="rd-threshold">
            <${InputLabel}>${t('rd_step_threshold')}<//>
            <${Select} value=${threshold} label=${t('rd_step_threshold')}
                       onChange=${e => setThreshold(e.target.value)}>
              ${THRESHOLDS.map(k => html`<${MenuItem} key=${k} value=${k}>${t(k)}<//>`)}
            <//>
            ${missing && html`
              <${Typography} variant="caption" color="error" id="rd-threshold-error"
                             sx=${{ mt: .5, ml: 1.75 }}>${t('err_threshold_required')}<//>`}
          <//>
        <//><//>
      <//>
    <//>`;
}

/* ── Screen: Ausfallmaske (FA mask) ───────────────────────────────────
   The per-TU failure breakdown: which causes account for the lost minutes.
   FA_UBERSICHT_DATA carries the cause list with its own colours and
   percentages, so the bars are the data's colours, not a palette I chose. */
// The 14 column headings, in the vanilla's own order and by its own keys.
const MASK_COLS = ['fa_mask_col_tag', 'fa_mask_col_tu', 'fa_mask_col_go', 'fa_mask_col_lb',
  'fa_mask_col_linie', 'fa_mask_col_fahrt_id', 'fa_mask_col_fahrt_tu', 'fa_mask_col_halt_von',
  'fa_mask_col_aus_von', 'fa_mask_col_halt_bis', 'fa_mask_col_aus_bis', 'fa_mask_col_anz_halt',
  'fa_mask_col_ausfallart', 'fa_mask_col_ersatz'];

function Ausfallmaske({ go, row, tuId }) {
  const { t } = useT();
  const key = tuId && FA_UBERSICHT_DATA[tuId] ? tuId : 'GESAMT';
  const d = FA_UBERSICHT_DATA[key] || { causes: [], totalMin: 0, ausMin: 0 };
  const [von, setVon] = useState('');
  const [bis, setBis] = useState('');
  const [range, setRange] = useState({ von: '', bis: '' });
  const [pp, setPp] = useState(10);
  const [page, setPage] = useState(0);

  // the vanilla's own date window, through its own faMaskStamp()
  const filtered = useMemo(() => {
    const from = faMaskStamp(range.von), to = faMaskStamp(range.bis);
    if (!from && !to) return FA_MASK_DATA;
    return FA_MASK_DATA.filter(r => {
      const st = faMaskStamp(r[0]);
      if (st === null) return false;
      return (!from || st >= from) && (!to || st <= to);
    });
  }, [range]);
  const shown = filtered.slice(page * pp, page * pp + pp);

  return html`
    <${Box}>
      <${PageHeader}
        crumbs=${[{ label: t('nav_evaluations'), onClick: () => go('list') },
                  { label: t('type_trip_failures'), onClick: () => go('report', row) },
                  { label: t('fa_mask_title') }]}
        title=${t('fa_mask_title')} subtitle=${key} />
      <${Box} sx=${{ p: 3, maxWidth: 1000 }}>
        <${Card} sx=${{ mb: 3 }}><${CardContent}>
          <${Stack} direction="row" spacing=${4}>
            <${Box}>
              <${Typography} variant="caption" color="text.secondary">${t('fa_col_fahrtzeit')}<//>
              <${Typography} variant="h5">${fmtHM(d.totalMin)}<//>
            <//>
            <${Box}>
              <${Typography} variant="caption" color="text.secondary">${t('fa_col_ausgefallen')}<//>
              <${Typography} variant="h5" color="error.main">${fmtHM(d.ausMin)}<//>
            <//>
            <${Box}>
              <${Typography} variant="caption" color="text.secondary">${t('fa_col_ausfallquote')}<//>
              <${Typography} variant="h5">${faPct(d.ausMin, d.totalMin).toFixed(2)}%<//>
            <//>
          <//>
        <//><//>
        <${Card} id="fa-mask-causes"><${CardContent}>
          <${Typography} variant="h6" gutterBottom>${t('fa_mask_title')}<//>
          ${(d.causes || []).map((c, i) => html`
            <${Box} key=${i} sx=${{ mb: 1.5 }}>
              <${Stack} direction="row" justifyContent="space-between" sx=${{ mb: .5 }}>
                <${Typography} variant="body2">${c.label}<//>
                <${Typography} variant="body2" color="text.secondary">${c.pct.toFixed(1)}%<//>
              <//>
              <${Box} sx=${{ height: 8, bgcolor: '#F0F0F0', borderRadius: 1, overflow: 'hidden' }}>
                <${Box} sx=${{ width: `${c.pct}%`, height: '100%', bgcolor: c.color }} />
              <//>
            <//>`)}
        <//><//>

        ${/* The trip table, its Ausfall von/bis filter and its rows-per-page
              select. All three were missing: the parity checker reported this
              view as "tables 1 -> 0" and I had read that as a formatting
              difference rather than a missing table. It is the only place the
              individual cancelled trips are listed. */''}
        <${Stack} direction="row" spacing=${2} sx=${{ mt: 3, mb: 2 }} alignItems="center">
          <${TextField} label=${t('fa_mask_ausfall_von')} id="fa-mask-von"
            placeholder="dd.mm.yyyy" value=${von} onChange=${e => setVon(e.target.value)} />
          <${TextField} label=${t('fa_mask_ausfall_bis')} id="fa-mask-bis"
            placeholder="dd.mm.yyyy" value=${bis} onChange=${e => setBis(e.target.value)} />
          <${Button} variant="contained" id="fa-mask-apply"
            onClick=${() => { setRange({ von, bis }); setPage(0); }}>${t('fa_mask_apply')}<//>
          <${Button} id="fa-mask-reset"
            onClick=${() => { setVon(''); setBis(''); setRange({ von: '', bis: '' }); setPage(0); }}>
            ${t('fa_mask_reset')}<//>
          <${Box} sx=${{ flex: 1 }} />
          <${FilterSelect} id="fa-mask-pp" label=${t('sel_rows_per_page')} minWidth=${110}
            value=${String(pp)} onChange=${v => { setPp(Number(v) || 10); setPage(0); }}
            options=${['10', '25', '50'].map(v => ({ value: v, label: v }))} />
        <//>

        ${filtered.length === 0 ? html`
          <${Alert} severity="info" id="fa-mask-empty" action=${html`
            <${Button} size="small" onClick=${() => { setVon(''); setBis(''); setRange({ von: '', bis: '' }); }}>
              ${t('raw_clear_filters')}<//>`}>${t('fa_mask_no_match')}<//>` : html`
          <${TableContainer} component=${Paper} variant="outlined" sx=${{ borderColor: '#E7E7E7' }}>
            <${Table} id="fa-mask-table">
              <${TableHead}>
                <${TableRow}>
                  ${MASK_COLS.map(c => html`<${TableCell} key=${c}>${t(c)}<//>`)}
                <//>
              <//>
              <${TableBody}>
                ${shown.map((r, i) => html`
                  <${TableRow} key=${i} hover>
                    ${r.map((c, k) => html`<${TableCell} key=${k}>${c}<//>`)}
                  <//>`)}
              <//>
            <//>
          <//>`}

        <${Stack} direction="row" spacing=${1} alignItems="center" sx=${{ mt: 2 }}>
          <${Typography} variant="body2" color="text.secondary" id="fa-mask-info">
            ${t('fa_pager_info')
                .replace('{start}', filtered.length === 0 ? 0 : page * pp + 1)
                .replace('{end}', Math.min((page + 1) * pp, filtered.length))
                .replace('{total}', filtered.length)}
          <//>
          <${Box} sx=${{ flex: 1 }} />
          <${Button} disabled=${page === 0} id="fa-mask-prev"
            onClick=${() => setPage(p => p - 1)}>${t('rpt_pager_prev')}<//>
          <${Button} disabled=${(page + 1) * pp >= filtered.length} id="fa-mask-next"
            onClick=${() => setPage(p => p + 1)}>${t('rpt_pager_next')}<//>
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
function TopBar({ go, onLogout }) {
  const { t, lang, setLang } = useT();
  const [anchor, setAnchor] = useState(null);
  const [langAnchor, setLangAnchor] = useState(null);
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
    <//>`;
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
    <${Box} component="button" key=${k} onClick=${e => e.preventDefault()}
      sx=${{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'none',
              border: 'none', p: 0, font: 'inherit', fontSize: 13, cursor: 'pointer',
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
          sx=${{ display: 'block', textAlign: 'center', mt: 2, fontSize: 13 }}>
          ${t('login_forgot')}<//>
      <//>

      ${/* the utility bar sits on the bottom edge of the viewport: the three
            document links left, Support right — Impressum is a legal
            requirement in CH/DE, so it is not decoration */''}
      <${Box} id="login-utility-bar"
        sx=${{ position: 'absolute', left: 0, right: 0, bottom: 0, display: 'flex',
                alignItems: 'center', justifyContent: 'space-between', gap: 2, p: '14px 24px' }}>
        <${Box} sx=${{ display: 'flex', alignItems: 'center', flexWrap: 'wrap',
                        gap: '8px 26px' }}>
          ${['util_impressum', 'util_dokumente', 'util_kontakt'].map(util)}
        <//>
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
                               ? html`<${ReportPunctuality} go=${go} row=${route.row} />` :
    route.name === 'chart'     ? html`<${ChartView} go=${go} row=${route.row}
                                   title=${route.chart.title} items=${route.chart.items}
                                   format=${route.chart.format}
                                   backLabel=${route.chart.backLabel}
                                   onBack=${() => go('report', route.row)} />` :
    route.name === 'mask'      ? html`<${Ausfallmaske} go=${go} row=${route.row} tuId=${route.tuId} />` :
    route.name === 'raw'       ? html`<${RawDataTable} go=${go} row=${route.row} rows=${PUNCT_RAW}
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
