/* ════════════════════════════════════════════════════════════════════
   PIMS Grunddaten — Lines, Line management, Display texts, Special
   announcements. React 18 + MUI v5, ported from the vanilla prototype
   projects/grunddaten-editor/index.html (never modified).

   Registers: VIEWS.lines · VIEWS.lineDetail · VIEWS.lineMgmt
              VIEWS.texts · VIEWS.spc

   Everything lives inside one IIFE: the vanilla's list helpers
   (listFor / moveToPos / the drag context) are DOM-coupled — they end in
   render() — so they are NOT in the generated data.js and have to be
   ported here. Keeping them file-local means a sibling views-*.js can
   port the same helper for its own lists without two top-level consts
   colliding and taking the page down.

   The domain arrays are mutated IN PLACE exactly as the vanilla does;
   bump() is what makes the mutation show up.
   ════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── Ported list helpers ────────────────────────────────────────────
     Vanilla: listFor() / moveToPos() / dragCtx, index.html 2846-2897.
     The playlist branch of listFor('pl') is not carried here — no view in
     this file owns a playlist — so the list is passed in directly. */

  /** Moves list[currentIdx] to the 1-based position rawVal. In place. */
  function moveToPos(list, currentIdx, rawVal) {
    // same order of operations as the vanilla: NaN survives the clamp and
    // is caught by the isNaN test, so a blank input is a no-op
    const newIdx = Math.max(0, Math.min(list.length - 1, parseInt(rawVal, 10) - 1));
    if (isNaN(newIdx) || newIdx === currentIdx) return false;
    const [item] = list.splice(currentIdx, 1);
    list.splice(newIdx, 0, item);
    return true;
  }

  /** Extracts the selected rows and re-inserts them at targetIdx as one
      block, keeping their relative order. Returns the landing index. */
  function txtMoveBlock(selIds, targetIdx) {
    const picked = displayTexts.filter(tx => selIds.includes(tx.id));
    if (!picked.length) return 0;
    const rest = displayTexts.filter(tx => !selIds.includes(tx.id));
    const at = Math.max(0, Math.min(rest.length, targetIdx));
    displayTexts.length = 0;
    displayTexts.push(...rest.slice(0, at), ...picked, ...rest.slice(at));
    return at;
  }

  /* ── Small shared pieces ────────────────────────────────────────── */

  /**
   * The position box. The vanilla commits on `change` (blur / Enter), not
   * on every keystroke, so this keeps its own value and commits the same
   * way — otherwise typing "12" would first move the row to position 1.
   */
  function PosInput({ value, max, onCommit, ariaLabel }) {
    const [v, setV] = useState(String(value));
    useEffect(() => { setV(String(value)); }, [value]);
    return html`
      <${TextField} type="number" value=${v} hiddenLabel
        inputProps=${{ min: 1, max, 'aria-label': ariaLabel }}
        onChange=${e => setV(e.target.value)}
        onBlur=${() => { if (v !== String(value)) onCommit(v); }}
        onKeyDown=${e => { if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); } }}
        sx=${{ width: 72, '& input': { textAlign: 'center', py: .75 } }} />`;
  }

  /* ════════════════════════════════════════════════════════════════
     Lines list — vanilla renderLines(), index.html 1721-1750
     ════════════════════════════════════════════════════════════════ */
  function LinesView() {
    const { t, nav, lang } = useApp();
    return html`
      <${Box}>
        <${PageHeader} title=${t('lines')}
          subtitle=${`${t('linesSuffix', lineData.length)} · BVG J/JK`} />
        <${PageBody}>
          <${TableContainer} component=${Paper} variant="outlined" sx=${{ borderColor: '#E7E7E7' }}>
            <${Table} id="lines-table">
              <${TableHead}>
                <${TableRow}>
                  <${TableCell} sx=${{ width: 60 }}>${t('colLine')}<//>
                  <${TableCell}>${t('colName')}<//>
                  <${TableCell}>${t('lineNameFile')}<//>
                  <${TableCell} sx=${{ width: 32 }} />
                <//>
              <//>
              <${TableBody}>
                ${lineData.map(l => html`
                  <${TableRow} key=${l.id} hover sx=${{ cursor: 'pointer' }}
                    onClick=${() => nav('lineDetail', l.id)}>
                    <${TableCell}><${LineBadge} line=${l.id} /><//>
                    <${TableCell}>
                      <${Typography} variant="body2" sx=${{ fontWeight: 500 }}>${l.fullName}<//>
                      <${Typography} variant="caption" color="text.secondary">${l.longName}<//>
                    <//>
                    <${TableCell}>
                      ${l.nameFile ? html`
                        <${Stack} direction="row" spacing=${.5} alignItems="center">
                          <${Icon} sx=${{ fontSize: 16, color: 'primary.main' }}>music_note<//>
                          <${Typography} variant="caption" color="primary.main">${t('lineNameFile')}<//>
                        <//>`
                        : html`${/* the vanilla has no i18n key here — it inlines the
                                    literal, so the literal is what comes across */ ''}
                        <${Typography} variant="caption" color="text.disabled">
                          ${lang === 'de' ? '— keine Audiodatei' : '— no audio file'}
                        <//>`}
                    <//>
                    <${TableCell} sx=${{ color: 'text.disabled' }}>
                      <${Icon} sx=${{ fontSize: 18, display: 'block' }}>chevron_right<//>
                    <//>
                  <//>`)}
              <//>
            <//>
          <//>
        <//>
      <//>`;
  }

  /* ════════════════════════════════════════════════════════════════
     Scheduled line changes — vanilla lineScheduleModalHtml /
     showAddLineScheduleModal / showEditLineScheduleModal /
     deleteLineSchedule / the list inside renderLineMgmt, 1845-1972.

     Shared by the line detail and the line management page, because both
     edit the same l.schedules array with the same rules.
     ════════════════════════════════════════════════════════════════ */
  function LineSchedules({ line }) {
    const { t, lang, bump } = useApp();
    const [dlg, setDlg] = useState(null);   // { idx, f, err } — idx -1 = new
    const REQUIRED = lang === 'de' ? 'Dieses Feld ist erforderlich.' : 'This field is required.';
    const blank = { dateFrom: '', timeFrom: '', dateTo: '', timeTo: '', reason: '' };

    const openAdd  = () => setDlg({ idx: -1, f: { ...blank }, err: {} });
    const openEdit = i => setDlg({ idx: i, f: { ...line.schedules[i] }, err: {} });
    const field = (k, v) => setDlg(d => ({ ...d, f: { ...d.f, [k]: v }, err: { ...d.err, [k]: '' } }));

    const save = () => {
      const f = dlg.f, err = {};
      ['dateFrom', 'timeFrom', 'dateTo', 'timeTo'].forEach(k => { if (!f[k]) err[k] = REQUIRED; });
      if (!String(f.reason || '').trim()) err.reason = REQUIRED;
      if (Object.keys(err).some(k => err[k])) { setDlg(d => ({ ...d, err })); return; }
      const rec = { dateFrom: f.dateFrom, timeFrom: f.timeFrom, dateTo: f.dateTo,
                    timeTo: f.timeTo, reason: f.reason.trim() };
      if (dlg.idx === -1) line.schedules.push(rec); else line.schedules[dlg.idx] = rec;
      setDlg(null);
      bump();
    };

    const remove = i => { line.schedules.splice(i, 1); bump(); };

    const dateField = (k, label) => html`
      <${TextField} type="date" label=${label} required fullWidth
        InputLabelProps=${{ shrink: true }} id=${'ls-' + k}
        value=${dlg.f[k] || ''} onChange=${e => field(k, e.target.value)}
        error=${!!dlg.err[k]} helperText=${dlg.err[k] || ''} />`;
    const timeField = (k, label) => html`
      <${TextField} type="time" label=${label} required fullWidth
        InputLabelProps=${{ shrink: true }} id=${'ls-' + k}
        value=${dlg.f[k] || ''} onChange=${e => field(k, e.target.value)}
        error=${!!dlg.err[k]} helperText=${dlg.err[k] || ''} />`;

    return html`
      <${Box}>
        ${line.schedules.length ? html`
          <${Box} sx=${{ mb: 1.5 }}>
            <${Typography} variant="caption" color="text.secondary"
              sx=${{ fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.05em' }}>
              ${t('activationSchedule')}:
            <//>
            ${line.schedules.map((sch, i) => html`
              <${Stack} key=${i} direction="row" spacing=${1.25} alignItems="center"
                sx=${{ py: .75, borderBottom: '1px solid #E7E7E7' }}>
                <${Typography} variant="body2" sx=${{ flex: 1 }}>${fmtLineSchedule(sch)}<//>
                ${sch.reason ? html`
                  <${Typography} variant="caption" color="text.secondary" sx=${{ fontStyle: 'italic' }}>
                    ${sch.reason}
                  <//>` : null}
                <${Tooltip} title=${lang === 'de' ? 'Bearbeiten' : 'Edit'}>
                  <${IconButton} aria-label=${`edit schedule ${i}`} onClick=${() => openEdit(i)}>
                    <${Icon} sx=${{ fontSize: 18 }}>edit<//>
                  <//>
                <//>
                <${Tooltip} title=${lang === 'de' ? 'Löschen' : 'Delete'}>
                  <${IconButton} color="error" aria-label=${`delete schedule ${i}`}
                    onClick=${() => remove(i)}>
                    <${Icon} sx=${{ fontSize: 18 }}>delete<//>
                  <//>
                <//>
              <//>`)}
          <//>` : null}

        <${Button} variant="contained" onClick=${openAdd} id=${'add-schedule-' + line.id}>
          ${t('addSchedule')}
        <//>

        <${Dialog} open=${!!dlg} onClose=${() => setDlg(null)} fullWidth maxWidth="sm">
          ${dlg ? html`
            <${React.Fragment}>
              <${DialogTitle}>
                ${dlg.idx === -1 ? t('lineScheduleTitle', line.id) : t('lineScheduleEdit', line.id)}
              <//>
              <${DialogContent}>
                <${DialogContentText} sx=${{ mb: 2 }}>${t('lineScheduleDesc', line.id)}<//>
                <${Box} sx=${{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
                  ${dateField('dateFrom', t('dateFrom'))}
                  ${timeField('timeFrom', t('timeFrom'))}
                  ${dateField('dateTo', t('dateTo'))}
                  ${timeField('timeTo', t('timeTo'))}
                <//>
                <${TextField} label=${t('reason')} required fullWidth id="ls-reason"
                  placeholder=${lang === 'de' ? 'z.B. Sonderbetrieb' : 'e.g. Special service'}
                  value=${dlg.f.reason || ''} onChange=${e => field('reason', e.target.value)}
                  error=${!!dlg.err.reason} helperText=${dlg.err.reason || ''} />
              <//>
              <${DialogActions}>
                <${Button} onClick=${() => setDlg(null)}>${t('cancel')}<//>
                <${Button} variant="contained" onClick=${save}>${t('saveEntry')}<//>
              <//>
            <//>` : null}
        <//>
      <//>`;
  }

  /* ════════════════════════════════════════════════════════════════
     Line detail — vanilla renderLineDetail() / saveLineData(), 1752-1843
     ════════════════════════════════════════════════════════════════ */
  function LineDetailView() {
    const { t, s, nav, lang, bump, toast } = useApp();
    const line = getLine(s.selectedLineId);
    const [d, setD] = useState(() => draftOf(line));

    // the router keeps one instance across lines, so resync on the id
    useEffect(() => { setD(draftOf(getLine(s.selectedLineId))); }, [s.selectedLineId]);

    if (!line) return html`<${PageHeader} title="—" />`;
    if (!d) return null;

    const put = (k, v) => setD(prev => ({ ...prev, [k]: v }));

    // saveLineData(): trims, and an emptied full name falls back to the old one
    const save = () => {
      line.fullName  = d.fullName.trim() || line.fullName;
      line.shortName = d.shortName.trim();
      line.longName  = d.longName.trim();
      line.nameFile  = d.nameFile;
      line.ttsText   = d.ttsText.trim();
      setD(draftOf(line));
      bump();
      toast(t('savedMsg'));
    };

    const nameFileOpts = soundFiles
      .filter(f => f.type === 'station-name')
      .map(f => ({ value: f.id, label: f.filename }));

    return html`
      <${Box}>
        <${PageHeader}
          crumbs=${[{ label: t('lines'), onClick: () => nav('lines') }, { label: line.fullName }]}
          title=${line.fullName}
          titleAfter=${html`<${LineBadge} line=${line.id} />`}
          subtitle=${t('identifier')}
          action=${html`<${Button} variant="contained" id="line-save" onClick=${save}>${t('saveBtn')}<//>`} />

        <${PageBody}>
          <${SectionCard} title=${t('lineName')}>
            <${Stack} direction="row" spacing=${2} flexWrap="wrap" useFlexGap>
              <${TextField} id="line-full-input" label=${t('fullName')} sx=${{ width: 340 }}
                value=${d.fullName} onChange=${e => put('fullName', e.target.value)} />
              <${TextField} id="line-short-input" label=${t('shortName')} sx=${{ width: 120 }}
                value=${d.shortName} onChange=${e => put('shortName', e.target.value)} />
              <${TextField} id="line-long-input" label=${t('longName')} sx=${{ width: 340 }}
                value=${d.longName} onChange=${e => put('longName', e.target.value)} />
            <//>
          <//>

          <${SectionCard} title=${t('announcements')}>
            <${Stack} direction="row" spacing=${2} alignItems="flex-start" flexWrap="wrap" useFlexGap>
              ${/* the vanilla's "— nicht zugewiesen —" option is gone: empty IS
                    unassigned and the ✕ clears it — brief §3 */ ''}
              <${FilterSelect} id="line-name-file" label=${t('lineNameFile')}
                value=${d.nameFile} onChange=${v => put('nameFile', v)}
                options=${nameFileOpts} minWidth=${280} />
              <${TextField} id="line-tts-input" label=${t('ttsText')} sx=${{ width: 280 }}
                placeholder=${lang === 'de' ? 'z.B. U eins' : 'e.g. U one'}
                helperText=${t('ttsHint')}
                value=${d.ttsText} onChange=${e => put('ttsText', e.target.value)} />
            <//>
          <//>

          ${/* The activation-schedule card belongs to Line management, not
                here: the vanilla's line detail has exactly two cards, Linienname
                and Ansagen. It was added during the port and taken back out —
                porting the components is the job, adding a feature area is not. */ ''}
        <//>
      <//>`;
  }

  function draftOf(l) {
    if (!l) return null;
    return { fullName: l.fullName || '', shortName: l.shortName || '', longName: l.longName || '',
             nameFile: l.nameFile || '', ttsText: l.ttsText || '' };
  }

  /* ════════════════════════════════════════════════════════════════
     Line management — vanilla renderLineMgmt(), 1943-1980.
     The vanilla lists only U12, the line that carries a schedule; that
     filter is the page, so it comes across as written.
     ════════════════════════════════════════════════════════════════ */
  function LineMgmtView() {
    const { t, lang } = useApp();
    return html`
      <${Box}>
        <${PageHeader} title=${t('lineMgmt')}
          subtitle=${lang === 'de'
            ? 'Aktivieren und deaktivieren Sie Linien nach Zeitplan.'
            : 'Activate and deactivate lines by schedule.'} />
        <${PageBody}>
          ${lineData.filter(l => l.id === 'U12').map(l => html`
            <${Card} key=${l.id} sx=${{ mb: 2 }}>
              <${Box} sx=${{ p: 2, display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                <${Box} sx=${{ flex: '0 0 auto', pt: .25 }}><${LineBadge} line=${l.id} /><//>
                <${Box} sx=${{ flex: 1, minWidth: 0 }}>
                  <${Typography} variant="body2" color="text.secondary" sx=${{ mb: 1.5 }}>
                    ${t('lineScheduleCard', l.id)}
                  <//>
                  <${LineSchedules} line=${l} />
                <//>
              <//>
            <//>`)}
        <//>
      <//>`;
  }

  /* ════════════════════════════════════════════════════════════════
     Display texts — vanilla renderTexts() + the selection / bulk /
     pagination block, 2624-2801, and openTextModal(), 4185-4212.

     Selection is stored by id so it survives paging and reordering.
     s.txtSel is an array here (the vanilla used a Set) and s.txtPage is
     0-based (the vanilla's was 1-based) because TablePagination is.
     ════════════════════════════════════════════════════════════════ */
  function DisplayTextsView() {
    const { t, s, set, lang, bump } = useApp();
    const [bulkPos, setBulkPos] = useState('');
    const [dlg, setDlg] = useState(null);      // { idx, value, err } — idx null = new
    const [del, setDel] = useState(null);      // { kind:'one', idx } | { kind:'bulk' }

    const total = displayTexts.length;
    const per = s.txtPerPage;
    const lastPage = Math.max(0, Math.ceil(total / per) - 1);
    const page = Math.min(s.txtPage, lastPage);
    useEffect(() => { if (s.txtPage !== page) set({ txtPage: page }); });

    const start = page * per;
    const pageRows = displayTexts.slice(start, start + per);

    const sel = s.txtSel;
    const isSel = id => sel.includes(id);
    const selCount = sel.length;
    const pageAllSel = pageRows.length > 0 && pageRows.every(tx => isSel(tx.id));
    const pageSomeSel = pageRows.some(tx => isSel(tx.id));

    /* txtToggle() — shift-click selects the whole range between the two clicks */
    const toggle = (id, shift) => {
      const ids = displayTexts.map(tx => tx.id);
      let next = sel.slice();
      if (shift && s.txtLastSel && s.txtLastSel !== id) {
        const a = ids.indexOf(s.txtLastSel), b = ids.indexOf(id);
        for (let i = Math.min(a, b); i <= Math.max(a, b); i++) {
          if (!next.includes(ids[i])) next.push(ids[i]);
        }
      } else if (next.includes(id)) {
        next = next.filter(x => x !== id);
      } else {
        next.push(id);
      }
      set({ txtSel: next, txtLastSel: id });
    };

    /* txtTogglePage() */
    const togglePage = () => {
      const allSel = pageRows.length > 0 && pageRows.every(tx => isSel(tx.id));
      const ids = pageRows.map(tx => tx.id);
      const next = allSel ? sel.filter(id => !ids.includes(id))
                          : sel.concat(ids.filter(id => !sel.includes(id)));
      set({ txtSel: next });
    };

    const clearSel = () => set({ txtSel: [], txtLastSel: null });

    /* txtBulkMove() — the block lands on the page it moved to */
    const bulkMove = () => {
      const target = parseInt(bulkPos, 10);
      if (!selCount || isNaN(target)) return;
      const moved = txtMoveBlock(sel, target - 1);
      set({ txtPage: Math.floor(moved / per) });
      setBulkPos('');
      bump();
    };

    /* txtBulkDelete() */
    const bulkDelete = () => {
      for (let i = displayTexts.length - 1; i >= 0; i--) {
        if (sel.includes(displayTexts[i].id)) displayTexts.splice(i, 1);
      }
      set({ txtSel: [], txtLastSel: null });
      setDel(null);
      bump();
    };

    /* deleteText(i) */
    const deleteOne = i => {
      const id = displayTexts[i].id;
      displayTexts.splice(i, 1);
      set({ txtSel: sel.filter(x => x !== id) });
      setDel(null);
      bump();
    };

    /* listDrop('txt', …) — dragging one row of a multi-selection moves
       the whole block, keeping its relative order */
    const { rowProps, rowSx } = useRowDrag((from, to) => {
      if (selCount > 1 && isSel(displayTexts[from].id)) {
        const before = displayTexts.slice(0, to + 1)
          .filter(tx => isSel(tx.id) && displayTexts.indexOf(tx) < to).length;
        txtMoveBlock(sel, to - before);
      } else {
        const [item] = displayTexts.splice(from, 1);
        displayTexts.splice(to, 0, item);
      }
      bump();
    });

    /* openTextModal() */
    const openNew  = () => setDlg({ idx: null, value: '', err: '' });
    const openEdit = i => setDlg({ idx: i, value: displayTexts[i].text, err: '' });
    const saveText = () => {
      const val = dlg.value.trim();
      if (!val) {
        setDlg(d => ({ ...d, err: lang === 'de' ? 'Dieses Feld ist erforderlich.' : 'This field is required.' }));
        return;
      }
      if (dlg.idx === null) {
        const nextNum = displayTexts.reduce((m, tx) => Math.max(m, parseInt(tx.id.slice(4), 10) || 0), 0) + 1;
        displayTexts.push({ id: 'TXT-' + String(nextNum).padStart(3, '0'), text: val });
      } else {
        displayTexts[dlg.idx].text = val;
      }
      setDlg(null);
      bump();
    };

    const textLabel = lang === 'de' ? 'Text' : 'Display text';
    const delOne = del && del.kind === 'one' ? displayTexts[del.idx] : null;

    return html`
      <${Box}>
        <${PageHeader} title=${t('displayTexts')} subtitle=${t('textsIntro')}
          action=${html`<${Button} variant="contained" id="txt-add" onClick=${openNew}>${t('addText')}<//>`} />

        <${PageBody}>
          ${selCount ? html`
            <${Paper} variant="outlined" sx=${{ mb: 2, p: 1.25, borderColor: '#E7E7E7' }}>
              <${Stack} direction="row" spacing=${1.5} alignItems="center" flexWrap="wrap" useFlexGap>
                <${Typography} variant="body2" sx=${{ fontWeight: 500 }}>
                  ${selCount} ${t('selected')}
                <//>
                <${Divider} orientation="vertical" flexItem />
                <${Typography} variant="body2" color="text.secondary">${t('moveToPosLbl')}<//>
                <${TextField} id="bulk-pos" type="number" hiddenLabel value=${bulkPos}
                  inputProps=${{ min: 1, max: total, 'aria-label': t('moveToPosLbl') }}
                  onChange=${e => setBulkPos(e.target.value)}
                  onKeyDown=${e => { if (e.key === 'Enter') { e.preventDefault(); bulkMove(); } }}
                  sx=${{ width: 90, '& input': { py: .75 } }} />
                <${Button} variant="contained" onClick=${bulkMove}>${t('moveBtn')}<//>
                <${Divider} orientation="vertical" flexItem />
                <${Button} color="error" onClick=${() => setDel({ kind: 'bulk' })}>${t('deleteSelBtn')}<//>
                <${Button} onClick=${clearSel}>${t('clearSelBtn')}<//>
                <${Box} sx=${{ flexGrow: 1 }} />
                <${Typography} variant="caption" color="text.secondary">${t('blockDragHint')}<//>
              <//>
            <//>` : null}

          <${TableContainer} component=${Paper} variant="outlined" sx=${{ borderColor: '#E7E7E7' }}>
            <${Table} id="texts-table">
              <${TableHead}>
                <${TableRow}>
                  <${TableCell} sx=${{ width: 32, pr: 0 }} />
                  <${TableCell} padding="checkbox">
                    <${Checkbox} checked=${pageAllSel} indeterminate=${!pageAllSel && pageSomeSel}
                      onChange=${togglePage}
                      inputProps=${{ 'aria-label': lang === 'de'
                        ? 'Alle auf dieser Seite auswählen' : 'Select all on this page' }} />
                  <//>
                  <${TableCell} sx=${{ width: 96 }}>${t('colPos')}<//>
                  <${TableCell}>${textLabel}<//>
                  <${TableCell} />
                <//>
              <//>
              <${TableBody}>
                ${pageRows.length ? pageRows.map((tx, pi) => {
                  const gi = start + pi;   // global index — position and actions use this
                  const rowSel = isSel(tx.id);
                  return html`
                    <${TableRow} key=${tx.id} selected=${rowSel} sx=${rowSx(gi)} ...${rowProps(gi)}>
                      <${TableCell} sx=${{ width: 32, pr: 0 }}><${DragHandle} /><//>
                      <${TableCell} padding="checkbox">
                        <${Checkbox} checked=${rowSel} onChange=${() => {}}
                          onClick=${e => toggle(tx.id, e.shiftKey)}
                          inputProps=${{ 'aria-label': `${lang === 'de' ? 'Zeile auswählen' : 'Select row'}: ${tx.text}` }} />
                      <//>
                      <${TableCell}>
                        <${PosInput} value=${gi + 1} max=${total}
                          ariaLabel=${lang === 'de' ? 'Position eingeben' : 'Enter position'}
                          onCommit=${v => { if (moveToPos(displayTexts, gi, v)) bump(); }} />
                      <//>
                      <${TableCell} sx=${{ fontWeight: 500 }}>${tx.text}<//>
                      <${TableCell} align="right" sx=${{ whiteSpace: 'nowrap' }}>
                        <${Button} onClick=${() => openEdit(gi)}>
                          ${lang === 'de' ? 'Bearbeiten' : 'Edit'}
                        <//>
                        <${Tooltip} title=${lang === 'de' ? 'Löschen' : 'Delete'}>
                          <${IconButton} color="error" aria-label=${`delete ${tx.id}`}
                            onClick=${() => setDel({ kind: 'one', idx: gi })}>
                            <${Icon} sx=${{ fontSize: 18 }}>close<//>
                          <//>
                        <//>
                      <//>
                    <//>`;
                }) : html`<${EmptyRow} colSpan=${5} />`}
              <//>
            <//>
            <${TablePagination} component="div" count=${total} page=${page} rowsPerPage=${per}
              rowsPerPageOptions=${[10, 25, 50]}
              labelRowsPerPage=${t('rowsPerPage')}
              labelDisplayedRows=${({ from, to, count }) => `${count === 0 ? 0 : from}–${to} ${t('ofTotal')} ${count}`}
              onPageChange=${(e, p) => set({ txtPage: p })}
              onRowsPerPageChange=${e => set({ txtPerPage: parseInt(e.target.value, 10) || 10, txtPage: 0 })} />
          <//>
        <//>

        ${/* add / edit — vanilla openTextModal() */ ''}
        <${Dialog} open=${!!dlg} onClose=${() => setDlg(null)} fullWidth maxWidth="sm">
          ${dlg ? html`
            <${React.Fragment}>
              <${DialogTitle}>
                ${dlg.idx === null
                  ? (lang === 'de' ? 'Neuer Anzeigetext' : 'New display text')
                  : (lang === 'de' ? 'Anzeigetext bearbeiten' : 'Edit display text')}
              <//>
              <${DialogContent}>
                <${TextField} id="m-txt-value" label=${textLabel} required fullWidth autoFocus
                  sx=${{ mt: 1 }}
                  placeholder=${lang === 'de' ? 'z.B. Bitte zurücktreten' : 'e.g. Please stand back'}
                  value=${dlg.value} onChange=${e => setDlg(d => ({ ...d, value: e.target.value, err: '' }))}
                  error=${!!dlg.err} helperText=${dlg.err || ''} />
              <//>
              <${DialogActions}>
                <${Button} onClick=${() => setDlg(null)}>${t('cancel')}<//>
                <${Button} variant="contained" onClick=${saveText}>${t('saveEntry')}<//>
              <//>
            <//>` : null}
        <//>

        ${/* deleteText() / txtBulkDelete() — confirm() becomes a Dialog */ ''}
        <${ConfirmDialog} open=${!!del}
          title=${del && del.kind === 'bulk'
            ? (lang === 'de'
                ? `${selCount} ${selCount === 1 ? 'Anzeigetext' : 'Anzeigetexte'} löschen?`
                : `Delete ${selCount} display text${selCount === 1 ? '' : 's'}?`)
            : `${lang === 'de' ? 'Löschen' : 'Delete'}: "${delOne ? delOne.text : ''}"?`}
          confirmLabel=${lang === 'de' ? 'Löschen' : 'Delete'}
          onClose=${() => setDel(null)}
          onConfirm=${() => { if (del.kind === 'bulk') bulkDelete(); else deleteOne(del.idx); }} />
      <//>`;
  }

  /* ════════════════════════════════════════════════════════════════
     Special announcements — vanilla renderSpcPage(), 2803-2844,
     deleteSpcEntry(), 2899-2904, and showSpcEdit(), 4143-4182
     ════════════════════════════════════════════════════════════════ */
  function SpecialAnnouncementsView() {
    const { t, lang, bump } = useApp();
    const [dlg, setDlg] = useState(null);   // { idx, label, fileId, err } — idx -1 = new
    const [del, setDel] = useState(null);   // index

    const total = specialAnnouncements.length;

    const { rowProps, rowSx } = useRowDrag((from, to) => {
      const [item] = specialAnnouncements.splice(from, 1);
      specialAnnouncements.splice(to, 0, item);
      bump();
    });

    const open = idx => {
      const sp = idx === -1 ? { label: '', fileId: '' } : specialAnnouncements[idx];
      setDlg({ idx, label: sp.label, fileId: sp.fileId || '', err: '' });
    };

    const save = () => {
      const label = dlg.label.trim();
      if (!label) {
        setDlg(d => ({ ...d, err: lang === 'de' ? 'Dieses Feld ist erforderlich.' : 'This field is required.' }));
        return;
      }
      if (dlg.idx === -1) {
        const id = 'SPC-' + String(specialAnnouncements.length + 1).padStart(3, '0');
        specialAnnouncements.push({ id, label, fileId: dlg.fileId });
      } else {
        specialAnnouncements[dlg.idx].label = label;
        specialAnnouncements[dlg.idx].fileId = dlg.fileId;
      }
      setDlg(null);
      bump();
    };

    const remove = i => { specialAnnouncements.splice(i, 1); setDel(null); bump(); };

    const soundOpts = specialSoundFiles.map(f => ({ value: f.id, label: f.filename }));
    const delSp = del === null ? null : specialAnnouncements[del];

    return html`
      <${Box}>
        <${PageHeader} title=${t('spcPage')} subtitle=${t('spcIntro')}
          action=${html`<${Button} variant="contained" id="spc-add" onClick=${() => open(-1)}>${t('addSpc')}<//>`} />

        <${PageBody}>
          <${TableContainer} component=${Paper} variant="outlined" sx=${{ borderColor: '#E7E7E7' }}>
            <${Table} id="spc-table">
              <${TableHead}>
                <${TableRow}>
                  <${TableCell} sx=${{ width: 32, pr: 0 }} />
                  <${TableCell}>${t('colLabel')}<//>
                  <${TableCell}>${t('colFilename')}<//>
                  <${TableCell} />
                <//>
              <//>
              <${TableBody}>
                ${total ? specialAnnouncements.map((sp, i) => html`
                  <${TableRow} key=${sp.id} sx=${rowSx(i)} ...${rowProps(i)}>
                    <${TableCell} sx=${{ width: 32, pr: 0 }}><${DragHandle} /><//>
                    <${TableCell} sx=${{ fontWeight: 500 }}>${sp.label}<//>
                    <${TableCell} sx=${{ fontFamily: 'monospace', fontSize: 12, color: 'text.secondary' }}>
                      ${sndName(sp.fileId)}
                    <//>
                    <${TableCell} align="right">
                      <${Stack} direction="row" spacing=${.75} alignItems="center" justifyContent="flex-end">
                        <${PosInput} value=${i + 1} max=${total}
                          ariaLabel=${lang === 'de' ? 'Position eingeben' : 'Enter position'}
                          onCommit=${v => { if (moveToPos(specialAnnouncements, i, v)) bump(); }} />
                        <${Button} onClick=${() => open(i)}>
                          ${lang === 'de' ? 'Bearbeiten' : 'Edit'}
                        <//>
                        <${Tooltip} title=${lang === 'de' ? 'Löschen' : 'Delete'}>
                          <${IconButton} color="error" aria-label=${`delete ${sp.id}`}
                            onClick=${() => setDel(i)}>
                            <${Icon} sx=${{ fontSize: 18 }}>close<//>
                          <//>
                        <//>
                      <//>
                    <//>
                  <//>`) : html`<${EmptyRow} colSpan=${4} />`}
              <//>
            <//>
          <//>
          <${Typography} variant="caption" color="text.disabled" sx=${{ display: 'block', mt: 1.75 }}>
            ${t('spcNote')}
          <//>
        <//>

        <${Dialog} open=${!!dlg} onClose=${() => setDlg(null)} fullWidth maxWidth="sm">
          ${dlg ? html`
            <${React.Fragment}>
              <${DialogTitle}>${dlg.idx === -1 ? t('spcNewTitle') : t('spcEditTitle')}<//>
              <${DialogContent}>
                <${Stack} spacing=${2} sx=${{ mt: 1 }}>
                  <${TextField} id="m-spc-label" label=${t('spcLabel')} required fullWidth autoFocus
                    placeholder=${lang === 'de' ? 'z.B. Weiterfahrt verzögert sich' : 'e.g. Service delayed'}
                    value=${dlg.label} onChange=${e => setDlg(d => ({ ...d, label: e.target.value, err: '' }))}
                    error=${!!dlg.err} helperText=${dlg.err || ''} />
                  ${/* "— keine Tondatei —" is gone: empty IS no file and the ✕
                        clears it — brief §3 */ ''}
                  <${FilterSelect} id="m-spc-sound" label=${t('spcSound')}
                    value=${dlg.fileId} onChange=${v => setDlg(d => ({ ...d, fileId: v }))}
                    options=${soundOpts} minWidth=${280} />
                <//>
              <//>
              <${DialogActions}>
                <${Button} onClick=${() => setDlg(null)}>${t('cancel')}<//>
                <${Button} variant="contained" onClick=${save}>${t('saveEntry')}<//>
              <//>
            <//>` : null}
        <//>

        <${ConfirmDialog} open=${del !== null}
          title=${`${lang === 'de' ? 'Löschen' : 'Delete'}: "${delSp ? delSp.label : ''}"?`}
          confirmLabel=${lang === 'de' ? 'Löschen' : 'Delete'}
          onClose=${() => setDel(null)}
          onConfirm=${() => remove(del)} />
      <//>`;
  }

  /* ── Register ─────────────────────────────────────────────────── */
  VIEWS.lines      = LinesView;
  VIEWS.lineDetail = LineDetailView;
  VIEWS.lineMgmt   = LineMgmtView;
  VIEWS.texts      = DisplayTextsView;
  VIEWS.spc        = SpecialAnnouncementsView;
})();
