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

  /* The vanilla's position box (moveToPos / PosInput) and the multi-row block
     move (txtMoveBlock) are gone: Ignat, 2026-09-30 — "Remove input for the row
     number, just show number" and "remove bulk actions". Drag is the one way
     to reorder, as it already was on the playlist tracks. */

  /* ════════════════════════════════════════════════════════════════
     Lines list — vanilla renderLines(), index.html 1721-1750
     ════════════════════════════════════════════════════════════════ */
  function LinesView() {
    const { t, nav, lang } = useApp();
    return html`
      <${Box}>
        ${/* Ignat, 2026-09-30: no "10 Linien · BVG J/JK" line */ ''}
        <${PageHeader} dense title=${t('lines')} />
        <${PageBody}>
          <${TableContainer} component=${Paper} variant="outlined" sx=${{ borderColor: '#E7E7E7' }}>
            <${Table} id="lines-table">
              <${TableHead}>
                <${TableRow}>
                  <${TableCell} sx=${{ width: 60 }}>${t('colLine')}<//>
                  <${TableCell}>${t('colName')}<//>
                  <${TableCell}>${t('lineNameFile')}<//>
                  <${TableCell} sx=${{ width: 56 }} />
                <//>
              <//>
              <${TableBody}>
                ${lineData.map(l => html`
                  <${TableRow} key=${l.id} hover sx=${{ cursor: 'pointer' }}
                    onClick=${() => nav('lineDetail', l.id)}>
                    <${TableCell}><${LineBadge} line=${l.id} /><//>
                    <${TableCell}>
                      ${/* no grey "U-Bahn Linie n" under the name (Ignat, 2026-09-30) */ ''}
                      <${Typography} variant="body2" sx=${{ fontWeight: 500 }}>${l.fullName}<//>
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
                    <${TableCell} align="right">
                      <${EditAction} name=${l.fullName} onClick=${e => { e.stopPropagation(); nav('lineDetail', l.id); }} />
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
                <${EditAction} name=${`${lang === 'de' ? 'Zeitraum' : 'period'} ${i + 1}`}
                  onClick=${() => openEdit(i)} />
                <${DeleteAction} name=${`${lang === 'de' ? 'Zeitraum' : 'period'} ${i + 1}`}
                  onClick=${() => remove(i)} />
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
    const [pristine, setPristine] = useState(() => JSON.stringify(draftOf(line)));

    // the router keeps one instance across lines, so resync on the id
    useEffect(() => { const n = draftOf(getLine(s.selectedLineId)); setD(n); setPristine(JSON.stringify(n)); }, [s.selectedLineId]);

    if (!line) return html`<${PageHeader} title="—" />`;
    if (!d) return null;

    // Ignat, 2026-09-30: "similar to station details" — the same leave guard,
    // the same required-name rule, the same rows
    DETAIL_GUARD.dirty = JSON.stringify(d) !== pristine;
    const de = lang === 'de';
    const put = (k, v) => setD(prev => ({ ...prev, [k]: v }));
    const nameErr = !d.fullName.trim();

    const save = () => {
      if (nameErr) { toast(de ? 'Bitte die markierten Felder korrigieren.' : 'Please correct the marked fields.'); return; }
      line.fullName  = d.fullName.trim();
      line.shortName = d.shortName.trim();
      line.longName  = d.longName.trim();
      line.nameFile  = d.nameFile;
      line.ttsText   = d.ttsText.trim();
      const n = draftOf(line); setD(n); setPristine(JSON.stringify(n));
      bump();
      toast(t('savedMsg'));
    };

    const nameFileOpts = soundFiles
      .filter(f => f.type === 'station-name')
      .map(f => ({ value: f.id, label: f.filename }));
    const text = (id, k, extra) => html`
      <${TextField} id=${id} hiddenLabel fullWidth value=${d[k]} onChange=${e => put(k, e.target.value)} ...${extra || {}} />`;

    return html`
      <${Box}>
        <${PageHeader}
          crumbs=${[{ label: t('lines'), onClick: () => nav('lines') }, { label: line.fullName }]}
          title=${d.fullName.trim() || line.fullName}
          titleAfter=${html`<${LineBadge} line=${line.id} />`}
          action=${html`<${Button} variant="contained" id="line-save" onClick=${save}>${t('saveBtn')}<//>`} />

        <${PageBody} narrow>
          <${SectionCard} title=${t('lineName')}>
            <${FormRow} label=${t('fullName') + ' *'} htmlFor="line-full-input">
              ${text('line-full-input', 'fullName', { required: true, error: nameErr, helperText: nameErr ? (de ? 'Pflichtfeld' : 'Required') : '' })}
            <//>
            <${FormRow} label=${t('shortName')} htmlFor="line-short-input">${text('line-short-input', 'shortName')}<//>
            <${FormRow} label=${t('longName')} htmlFor="line-long-input">${text('line-long-input', 'longName')}<//>
          <//>

          <${SectionCard} title=${t('announcements')}>
            ${/* the vanilla's "— nicht zugewiesen —" option is gone: empty IS
                  unassigned and the ✕ clears it — brief §3 */ ''}
            <${FormRow} label=${t('lineNameFile')}>
              <${FilterSelect} id="line-name-file" label=${t('lineNameFile')} hideLabel fullWidth
                value=${d.nameFile} onChange=${v => put('nameFile', v)}
                options=${nameFileOpts} minWidth=${280} />
            <//>
            <${FormRow} label=${t('ttsText')} htmlFor="line-tts-input" top>
              ${text('line-tts-input', 'ttsText', { placeholder: de ? 'z.B. U eins' : 'e.g. U one', helperText: t('ttsHint') })}
            <//>
          <//>

          ${/* The activation-schedule card belongs to Line management, not
                here: the vanilla's line detail has exactly two cards, Linienname
                and Ansagen. */ ''}
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
        <${PageHeader} title=${t('lineMgmt')} />
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
    const [dlg, setDlg] = useState(null);      // { idx, value, err } — idx null = new
    const [del, setDel] = useState(null);      // { kind:'one', idx }

    const total = displayTexts.length;
    const per = s.txtPerPage;
    const lastPage = Math.max(0, Math.ceil(total / per) - 1);
    const page = Math.min(s.txtPage, lastPage);
    useEffect(() => { if (s.txtPage !== page) set({ txtPage: page }); });

    const start = page * per;
    const pageRows = displayTexts.slice(start, start + per);

    /* Ignat, 2026-09-30: "remove bulk actions" — no selection, no bulk bar */
    /* deleteText(i) */
    const deleteOne = i => {
      displayTexts.splice(i, 1);
      setDel(null);
      bump();
    };

    /* listDrop('txt', …) — one row at a time now that there is no selection */
    const { rowProps, rowSx } = useRowDrag((from, to) => {
      const [item] = displayTexts.splice(from, 1);
      displayTexts.splice(to, 0, item);
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
        <${PageHeader} title=${t('displayTexts')}
          action=${html`<${Button} variant="contained" id="txt-add" onClick=${openNew}>${t('addText')}<//>`} />

        <${PageBody}>
          <${TableContainer} component=${Paper} variant="outlined" sx=${{ borderColor: '#E7E7E7' }}>
            <${Table} id="texts-table">
              <${TableHead}>
                <${TableRow}>
                  <${TableCell} sx=${{ width: 32, pr: 0 }} />
                  <${TableCell} sx=${{ width: 64 }}>${t('colPos')}<//>
                  <${TableCell}>${textLabel}<//>
                  <${TableCell} />
                <//>
              <//>
              <${TableBody}>
                ${pageRows.length ? pageRows.map((tx, pi) => {
                  const gi = start + pi;   // global index — position and actions use this
                  return html`
                    <${TableRow} key=${tx.id} sx=${rowSx(gi)} ...${rowProps(gi)}>
                      <${TableCell} sx=${{ width: 32, pr: 0 }}><${DragHandle} /><//>
                      ${/* the position is shown, not typed — drag changes it (Ignat, 2026-09-30) */ ''}
                      <${TableCell} className="pos" sx=${{ color: 'text.secondary' }}>${gi + 1}<//>
                      <${TableCell} sx=${{ fontWeight: 500 }}>${tx.text}<//>
                      <${TableCell} align="right" sx=${{ whiteSpace: 'nowrap' }}>
                        <${EditAction} name=${tx.text} onClick=${() => openEdit(gi)} />
                        <${DeleteAction} name=${tx.text} onClick=${() => setDel({ kind: 'one', idx: gi })} />
                      <//>
                    <//>`;
                }) : html`<${EmptyRow} colSpan=${4} />`}
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

        ${/* deleteText() — confirm() becomes a Dialog */ ''}
        <${ConfirmDialog} open=${!!del}
          title=${`${lang === 'de' ? 'Löschen' : 'Delete'}: "${delOne ? delOne.text : ''}"?`}
          confirmLabel=${lang === 'de' ? 'Löschen' : 'Delete'}
          onClose=${() => setDel(null)}
          onConfirm=${() => deleteOne(del.idx)} />
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
        <${PageHeader} title=${t('spcPage')}
          action=${html`<${Button} variant="contained" id="spc-add" onClick=${() => open(-1)}>${t('addSpc')}<//>`} />

        <${PageBody}>
          <${TableContainer} component=${Paper} variant="outlined" sx=${{ borderColor: '#E7E7E7' }}>
            <${Table} id="spc-table">
              <${TableHead}>
                <${TableRow}>
                  <${TableCell} sx=${{ width: 32, pr: 0 }} />
                  <${TableCell} sx=${{ width: 64 }}>${t('colPos')}<//>
                  <${TableCell}>${t('colLabel')}<//>
                  <${TableCell}>${t('colFilename')}<//>
                  <${TableCell} />
                <//>
              <//>
              <${TableBody}>
                ${total ? specialAnnouncements.map((sp, i) => html`
                  <${TableRow} key=${sp.id} sx=${rowSx(i)} ...${rowProps(i)}>
                    <${TableCell} sx=${{ width: 32, pr: 0 }}><${DragHandle} /><//>
                    ${/* the number sits right after the grip, shown not typed (Ignat, 2026-09-30) */ ''}
                    <${TableCell} className="pos" sx=${{ color: 'text.secondary' }}>${i + 1}<//>
                    <${TableCell} sx=${{ fontWeight: 500 }}>${sp.label}<//>
                    <${TableCell} sx=${{ fontFamily: 'monospace', fontSize: 12, color: 'text.secondary' }}>
                      ${sndName(sp.fileId)}
                    <//>
                    <${TableCell} align="right">
                      <${Stack} direction="row" spacing=${.75} alignItems="center" justifyContent="flex-end">
                        <${EditAction} name=${sp.label} onClick=${() => open(i)} />
                        <${DeleteAction} name=${sp.label} onClick=${() => setDel(i)} />
                      <//>
                    <//>
                  <//>`) : html`<${EmptyRow} colSpan=${5} />`}
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
