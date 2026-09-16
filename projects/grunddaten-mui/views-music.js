/* ════════════════════════════════════════════════════════════════════
   PIMS Grunddaten — Everrunning Musik, both prototype variants.

   V2 "Zeitpläne pro Station"  → VIEWS.musicStations / VIEWS.musicStation
   V1 "Eventliste"             → VIEWS.music         / VIEWS.musicEvent

   The variant switcher lives in the black prototype bar (app.js) and drives
   s.musicVer; there is no in-page switch.

   Every rule — overlaps, validity, week ranges, status, search, the line
   grouping — comes from data.js, extracted from the vanilla. Two functions
   are ported rather than called: evValidate() and msValidate() read
   state.evDraft / state.msDraft directly in the vanilla, so they never made
   it into data.js. They are carried across line for line below, taking the
   draft as an argument, and they call the extracted helpers for every
   comparison they make.

   schedCell(), evLineChips() and evSourceChip() are the other exception:
   they emit HTML strings bound to the vanilla's stylesheet, which this port
   does not have. Their *data* functions (evLineGroups, sourceName, srcLabel,
   dayHasSlots, entryTimes, validityLabel, DAYS/dayLabel) are called here and
   only the markup is MUI.
   ════════════════════════════════════════════════════════════════════ */

/* ── chips ──────────────────────────────────────────────────────────
   Colours are the vanilla's own .chip-* rules, carried over as sx so the
   two prototypes still read alike. Nothing here is a new colour. */
const MUS_CHIP_SX = { height: 20, fontWeight: 500, '& .MuiChip-label': { px: 1, fontSize: 11 } };

const MUS_KIND_SX = {
  radio:    { bgcolor: '#E8F5E9', color: '#2E7D32' },   // .chip-radio
  playlist: { bgcolor: '#E3F2FD', color: '#115293' },   // .chip-playlist
  track:    { bgcolor: '#F3E5F5', color: '#6A1B9A' },   // .chip-track
};

const MUS_STATE_SX = {
  'chip-on':      { bgcolor: '#E8F5E9',          color: '#2E7D32' },
  'chip-planned': { bgcolor: '#FFF8E1',          color: '#E65100' },
  'chip-past':    { bgcolor: 'rgba(0,0,0,0.07)', color: 'rgba(0,0,0,0.38)' },
  'chip-off':     { bgcolor: 'rgba(0,0,0,0.07)', color: 'rgba(0,0,0,0.6)' },
  'chip-custom':  { bgcolor: '#FFF8E1',          color: '#E65100' },
};

/** A source chip: the kind gives the colour, the caller gives the text. */
function MusKindChip({ kind, label }) {
  return html`<${Chip} size="small" label=${label}
    sx=${{ ...MUS_CHIP_SX, ...(MUS_KIND_SX[kind] || MUS_KIND_SX.track) }} />`;
}

/** evStatus() / "Inaktiv" / "Zeitplan vorhanden" — same chip, other palette. */
function MusStateChip({ cls, label }) {
  return html`<${Chip} size="small" label=${label}
    sx=${{ ...MUS_CHIP_SX, ...(MUS_STATE_SX[cls] || MUS_STATE_SX['chip-off']) }} />`;
}

/* ── small typographic helpers ──────────────────────────────────────
   The 200px label column is gone (brief §3), but a group of controls —
   a segmented kind switch, a pair of date fields, the weekly grid — still
   needs the name the vanilla gave it. */
function MusFieldLabel({ text, required, sx }) {
  return html`
    <${Typography} variant="caption" color="text.secondary"
      sx=${{ display: 'block', mb: .75, ...(sx || {}) }}>${text}${required ? ' *' : ''}<//>`;
}

function MusHint({ text, sx }) {
  return html`
    <${Typography} variant="caption" color="text.disabled"
      sx=${{ display: 'block', mt: 1, ...(sx || {}) }}>${text}<//>`;
}

function MusDash() {
  return html`<${Typography} variant="body2" color="text.disabled" component="span">—<//>`;
}

/* ── the line-grouped station picker, shared by three places ────────
   The event editor, the "new schedule" dialog and the "apply to other
   stations" dialog all group stations by line the same way; the filter is
   the vanilla's, character for character. */
function musLineGroups(q) {
  const needle = (q || '').toLowerCase();
  return lineData
    .filter(l => stations.some(st => st.lines.includes(l.id)))
    .map(l => ({
      line: l.id,
      stations: stations.filter(st => st.lines.includes(l.id))
        .filter(st => !needle || st.name.toLowerCase().includes(needle)
                   || l.id.toLowerCase().includes(needle)),
    }))
    .filter(g => g.stations.length);
}

function MusPickGrid({ children, empty }) {
  const kids = React.Children.toArray(children);
  if (!kids.length) {
    return html`<${Typography} variant="body2" color="text.disabled"
      sx=${{ fontStyle: 'italic', py: 1 }}>${empty || '—'}<//>`;
  }
  return html`
    <${Box} sx=${{ display: 'grid', gap: 1.5,
                   gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>${kids}<//>`;
}

function MusPickLine({ line, count, action, children }) {
  return html`
    <${Box} sx=${{ border: '1px solid #E7E7E7', borderRadius: 1, px: 1.5, py: 1.25 }}>
      <${Stack} direction="row" spacing=${1} alignItems="center"
        sx=${{ mb: 1, pb: 1, borderBottom: '1px solid #E7E7E7' }}>
        <${LineBadge} line=${line} />
        <${Typography} variant="caption" color="text.disabled">${count}<//>
        <${Box} sx=${{ flexGrow: 1 }} />
        ${action}
      <//>
      ${children}
    <//>`;
}

/** One checkbox row in a picker. */
function MusPickStation({ checked, onToggle, name, after, id }) {
  return html`
    <${FormControlLabel} sx=${{ display: 'flex', ml: -1, mr: 0, my: -.25 }}
      control=${html`<${Checkbox} size="small" checked=${!!checked} id=${id}
        onChange=${onToggle} inputProps=${{ 'aria-label': name }} />`}
      label=${html`
        <${Stack} direction="row" spacing=${.75} alignItems="center" component="span">
          <${Typography} variant="body2" component="span"
            sx=${{ fontWeight: checked ? 500 : 400, color: checked ? 'primary.dark' : 'text.primary' }}>
            ${name}
          <//>
          ${after}
        <//>`} />`;
}

/* ── source options for the "Quelle auswählen" select ───────────────
   Same three lists and the same label text the vanilla builds. */
function musSourceOptions(kind, t) {
  if (kind === 'radio')
    return radioStreams.map(r => ({ value: r.id, label: r.name + (r.genre ? ' · ' + r.genre : '') }));
  if (kind === 'playlist')
    return playlists.map(pl => ({ value: pl.id,
      label: `${pl.name} · ${pl.trackIds.length} ${t('colTracks')} · ${plDuration(pl)}` }));
  return musicTracks().map(f => ({ value: f.id, label: `${f.name} · ${f.duration}` }));
}

/** Radio · Playlist · Einzeltrack — the vanilla's .seg, as a toggle group. */
function MusKindToggle({ value, onChange, idPrefix }) {
  const { t } = useApp();
  return html`
    <${ToggleButtonGroup} exclusive size="small" value=${value}
      onChange=${(e, v) => { if (v) onChange(v); }}>
      ${['radio', 'playlist', 'track'].map(k => html`
        <${ToggleButton} key=${k} value=${k} id=${idPrefix ? `${idPrefix}-${k}` : undefined}
          sx=${{ textTransform: 'none', px: 1.5 }}>${srcLabel(k)}<//>`)}
    <//>`;
}

/* ════════════════════════════════════════════════════════════════════
   V1 — events
   ════════════════════════════════════════════════════════════════════ */

/** evLineChips(), as chips: the line badge, the station count, the names
    on hover. */
function MusLineChips({ ev }) {
  const groups = evLineGroups(ev);
  if (!groups.length) return html`<${MusDash} />`;
  return html`
    <${Stack} direction="row" spacing=${1} flexWrap="wrap" useFlexGap>
      ${groups.map(g => html`
        <${Tooltip} key=${g.line}
          title=${html`<${Box}>${g.names.map(n => html`<${Box} key=${n}>${n}<//>`)}<//>`}>
          <${Stack} direction="row" spacing=${.5} alignItems="center" component="span"
            tabIndex=${0} sx=${{ cursor: 'default' }}>
            <${LineBadge} line=${g.line} />
            <${Typography} variant="caption" color="text.secondary">${g.names.length}<//>
          <//>
        <//>`)}
    <//>`;
}

/** evSourceChip(). */
function MusSourceChip({ ev }) {
  if (!ev.source.refId) return html`<${MusDash} />`;
  return html`<${MusKindChip} kind=${ev.source.kind}
    label=${srcRefName(ev.source.kind, ev.source.refId)} />`;
}

/* evValidate(), ported: it reads state.evDraft in the vanilla, so it could
   not be extracted. Same order, same messages, same helpers. */
function musEvValidate(d) {
  if (!d.name.trim())    return t('evNoName');
  if (!d.dateFrom)       return t('evNoDate');
  if (d.dateTo && d.dateTo < d.dateFrom) return t('evBadDate');
  if (!d.source.refId)   return t('evNoSource');
  const slots = d.source.days.reduce((acc, day) => acc + day.slots.length, 0);
  if (!slots) return t('evSrcNoWin');
  for (const day of d.source.days) {
    for (const sl of day.slots) {
      if (toMin(sl.start) === toMin(sl.end)) return t('evSrcSameTime', dayLabel(day.day));
    }
  }
  if (!d.stationIds.length) return t('evNoStationsErr');
  return null;
}

function MusicEventsView() {
  const { s, set, nav, t, bump } = useApp();
  const [delEv, setDelEv] = useState(null);

  const q = s.evSearch || '';
  const list = musicEvents.filter(ev => evMatches(ev, q));

  const newEvent = () => set({ view: 'musicEvent', evId: null,
                               evDraft: blankEvent(), evPickSearch: '' });

  const doDelete = () => {
    const ev = delEv && getEvent(delEv.id);
    setDelEv(null);
    if (!ev) return;
    musicEvents.splice(musicEvents.indexOf(ev), 1);
    bump();
    nav('music');
  };

  return html`
    <${Box}>
      <${PageHeader} title=${t('musicTitle')} subtitle=${t('evIntro')}
        action=${html`<${Button} variant="contained" id="ev-new" onClick=${newEvent}>${t('newEvent')}<//>`} />
      <${PageBody}>
        <${Stack} direction="row" spacing=${2} alignItems="center" sx=${{ mb: 2 }}>
          <${TextField} id="ev-search" label=${t('evSearchPh')} value=${q}
            onChange=${e => set({ evSearch: e.target.value })} sx=${{ minWidth: 320 }} />
          ${q ? html`<${Typography} variant="caption" color="text.disabled">
            ${t('evFound', list.length, musicEvents.length)}<//>` : null}
        <//>

        <${TableContainer} component=${Paper} variant="outlined" sx=${{ borderColor: '#E7E7E7' }}>
          <${Table} id="ev-table">
            <${TableHead}><${TableRow}>
              <${TableCell}>${t('colEvent')}<//>
              <${TableCell}>${t('colSource')}<//>
              <${TableCell}>${t('colStationsCnt')}<//>
              <${TableCell}>${t('colWhen')}<//>
              <${TableCell}>${t('colStatus')}<//>
              <${TableCell} sx=${{ width: 150 }} />
            <//><//>
            <${TableBody}>
              ${list.length ? list.map(ev => {
                const st = evStatus(ev);
                return html`
                  <${TableRow} key=${ev.id} hover>
                    <${TableCell} sx=${{ fontWeight: 500 }}>${ev.name}<//>
                    <${TableCell}><${MusSourceChip} ev=${ev} /><//>
                    <${TableCell}><${MusLineChips} ev=${ev} /><//>
                    <${TableCell} sx=${{ color: 'text.secondary', whiteSpace: 'nowrap' }}>${evPeriod(ev)}<//>
                    <${TableCell}><${MusStateChip} cls=${st.cls} label=${st.label} /><//>
                    <${TableCell} align="right" sx=${{ whiteSpace: 'nowrap' }}>
                      <${Button} onClick=${() => nav('musicEvent', ev.id)}>${t('msEdit')}<//>
                      <${Tooltip} title=${t('evDelConfirm', ev.name)}>
                        <${IconButton} color="error" aria-label=${'delete ' + ev.name}
                          onClick=${() => setDelEv(ev)}><${Icon} sx=${{ fontSize: 18 }}>close<//><//>
                      <//>
                    <//>
                  <//>`;
              }) : html`<${EmptyRow} colSpan=${6} label=${q ? t('evNoMatch') : t('noEvents')} />`}
            <//>
          <//>
        <//>
      <//>

      ${/* Not t('deleteAnyway') — "Trotzdem löschen" promises a warning that
            this dialog does not carry; that key belongs to the "this file is
            still in use" case in the audio library. There is no generic delete
            string in the vanilla's table, so the literal it inlines elsewhere
            is what comes across, as in views-audio and views-lines-texts. */ ''}
      <${ConfirmDialog} open=${!!delEv} title=${delEv ? t('evDelConfirm', delEv.name) : ''}
        confirmLabel=${state.lang === 'de' ? 'Löschen' : 'Delete'}
        onConfirm=${doDelete} onClose=${() => setDelEv(null)} />
    <//>`;
}

function MusicEventEditView() {
  const { s, set, nav, t, bump, toast } = useApp();
  const [err, setErr] = useState('');
  const [overlapText, setOverlapText] = useState('');

  const d = s.evDraft;
  if (!d) return html`<${MusicEventsView} />`;

  const isNew = !d.id;
  const kind = evKind(d);
  const title = isNew ? t('evNewTitle') : d.name;

  const edit = fn => {
    const next = cloneEvent(d);
    fn(next);
    setErr('');
    set({ evDraft: next });
  };

  const cancel = () => { set({ evDraft: null }); nav('music'); };

  /* The draft is only written back on save — Cancel discards it. */
  const commit = () => {
    if (d.id) Object.assign(getEvent(d.id), cloneEvent(d));
    else {
      const nextNum = musicEvents.reduce((m, ev) => Math.max(m, parseInt(ev.id.slice(3), 10) || 0), 0) + 1;
      const saved = cloneEvent(d);
      saved.id = 'EV-' + String(nextNum).padStart(3, '0');
      musicEvents.push(saved);
    }
    setOverlapText('');
    set({ evDraft: null });
    bump();
    toast(t('savedMsg'));
    nav('music');
  };

  /* An equal-rank overlap warns and asks; it never blocks. */
  const clashes = evConflicts(d);
  const save = () => {
    const e = musEvValidate(d);
    if (e) { setErr(e); return; }
    setErr('');
    if (clashes.length) {
      setOverlapText(t('evOverlapConfirm', clashes.map(c =>
        `„${c.name}“ — ${dayLabel(c.day)} ${c.win} · ${c.stations.join(', ')}`).join('\n')));
      return;
    }
    commit();
  };

  const toggleStation = id => edit(n => {
    const i = n.stationIds.indexOf(id);
    if (i === -1) n.stationIds.push(id); else n.stationIds.splice(i, 1);
  });

  const toggleLine = lineId => edit(n => {
    const ids = stations.filter(st => st.lines.includes(lineId)).map(st => st.id);
    const allSel = ids.every(id => n.stationIds.includes(id));
    ids.forEach(id => {
      const i = n.stationIds.indexOf(id);
      if (allSel && i !== -1) n.stationIds.splice(i, 1);
      else if (!allSel && i === -1) n.stationIds.push(id);
    });
  });

  const groups = musLineGroups(s.evPickSearch);

  return html`
    <${Box}>
      <${PageHeader}
        crumbs=${[{ label: t('musicTitle'), onClick: cancel }, { label: title }]}
        title=${title}
        action=${html`
          <${Stack} direction="row" spacing=${1}>
            <${Button} variant="outlined" onClick=${cancel}>${t('cancel')}<//>
            <${Button} variant="contained" id="ev-save" onClick=${save}>${t('evSave')}<//>
          <//>`} />

      <${PageBody}>
        ${err ? html`<${Alert} severity="error" sx=${{ mb: 2 }}>${err}<//>` : null}

        ${clashes.length ? html`
          <${Alert} severity="warning" sx=${{ mb: 2 }} id="ev-overlap">
            <b>${t('evOverlapTitle')}</b>
            ${clashes.map((c, i) => html`
              <${Box} key=${i}>${t('evOverlapLine', c.name, dayLabel(c.day), c.win, c.stations.join(', '))}<//>`)}
            <${Typography} variant="caption" sx=${{ display: 'block', mt: .5 }}>${t('evOverlapNote')}<//>
          <//>` : null}

        <${SectionCard} title=${t('evBasics')}>
          <${TextField} id="ev-name" label=${t('evName')} required value=${d.name}
            sx=${{ minWidth: 320, mb: 2 }}
            placeholder=${state.lang === 'de' ? 'z.B. Klassik-Radio Vormittag' : 'e.g. Classical radio mornings'}
            onChange=${e => edit(n => { n.name = e.target.value; })} />
          <${MusFieldLabel} text=${t('evDateRange')} required />
          <${Stack} direction="row" spacing=${2} alignItems="center" flexWrap="wrap" useFlexGap>
            <${TextField} id="ev-from" type="date" label=${t('dateFrom')} required value=${d.dateFrom}
              InputLabelProps=${{ shrink: true }}
              onChange=${e => edit(n => { n.dateFrom = e.target.value; })} />
            <${Typography} color="text.secondary">–<//>
            <${TextField} id="ev-to" type="date" label=${t('dateTo')} value=${d.dateTo}
              InputLabelProps=${{ shrink: true }}
              onChange=${e => edit(n => { n.dateTo = e.target.value; })} />
          <//>
          <${MusHint} text=${t('evOpenEndHint')} />
        <//>

        <${SectionCard} title=${t('evSource')}>
          <${MusFieldLabel} text=${t('evKind')} required />
          <${MusKindToggle} value=${kind} idPrefix="ev-kind"
            onChange=${k => { if (k !== kind) edit(n => { n.source.kind = k; n.source.refId = ''; }); }} />
          <${MusHint} text=${t('evKindNote')} sx=${{ mb: 2 }} />

          <${FilterSelect} id="ev-ref" label=${t('evSourceSel')} required minWidth=${340}
            value=${d.source.refId} options=${musSourceOptions(kind, t)}
            onChange=${v => edit(n => { n.source.refId = v; })} />

          <${MusFieldLabel} text=${t('msWeek')} sx=${{ mt: 2.5, mb: 0 }} />
          <${Box} sx=${{ maxWidth: 560 }}>
            <${WeekGrid} days=${d.source.days} allowEmpty=${true} idPrefix="evw"
              onChange=${days => edit(n => { n.source.days = days; })} />
          <//>
          <${MusHint} text=${t('msWeekNote')} />
        <//>

        <${SectionCard} title=${`${t('evStations')} (${d.stationIds.length})`}>
          <${Typography} variant="body2" color="text.secondary" sx=${{ mb: 2 }}>${t('evStationsNote')}<//>
          <${Stack} direction="row" spacing=${2} alignItems="center" sx=${{ mb: 2 }}>
            <${TextField} id="ev-pick-search" label=${t('evPickSearch')} value=${s.evPickSearch}
              onChange=${e => set({ evPickSearch: e.target.value })} sx=${{ flex: 1, minWidth: 240 }} />
            ${d.stationIds.length ? html`
              <${Button} onClick=${() => edit(n => { n.stationIds = []; })}>${t('evClearAll')}<//>` : null}
          <//>
          <${MusPickGrid}>
            ${groups.map(g => {
              const allSel = g.stations.every(st => d.stationIds.includes(st.id));
              return html`
                <${MusPickLine} key=${g.line} line=${g.line} count=${g.stations.length}
                  action=${html`<${Button} size="small" sx=${{ minWidth: 0, px: .5 }}
                    onClick=${() => toggleLine(g.line)}>${allSel ? t('twReset') : t('evSelectAll')}<//>`}>
                  ${g.stations.map(st => html`
                    <${MusPickStation} key=${st.id} id=${`ev-pick-${g.line}-${st.id}`} name=${st.name}
                      checked=${d.stationIds.includes(st.id)} onToggle=${() => toggleStation(st.id)} />`)}
                <//>`;
            })}
          <//>
        <//>
      <//>

      ${/* The vanilla asks through confirm(), and evOverlapConfirm carries its
            own heading line — a DialogTitle would repeat it word for word, so
            the string stands alone and only the accessible name is added. */ ''}
      <${Dialog} open=${!!overlapText} onClose=${() => setOverlapText('')}
        PaperProps=${{ 'aria-label': t('evOverlapTitle') }}>
        <${DialogContent} sx=${{ pt: 3 }}>
          <${DialogContentText} sx=${{ whiteSpace: 'pre-line' }}>${overlapText}<//>
        <//>
        <${DialogActions}>
          <${Button} onClick=${() => setOverlapText('')}>${t('cancel')}<//>
          <${Button} variant="contained" onClick=${commit}>${t('evSave')}<//>
        <//>
      <//>
    <//>`;
}

/* ════════════════════════════════════════════════════════════════════
   V2 — one schedule per station and line
   ════════════════════════════════════════════════════════════════════ */

/** schedCell(), as MUI: one block per entry of the given kinds. */
function MusSchedCell({ sc, kinds }) {
  const entries = sc.entries.filter(e => kinds.includes(e.source.kind));
  if (!entries.length) return html`<${MusDash} />`;
  return html`
    <${Box}>
      ${entries.map((e, i) => html`
        <${Box} key=${e.id || i} sx=${i ? { mt: 1.25, pt: 1.25, borderTop: '1px solid #E7E7E7' } : null}>
          <${Stack} direction="row" spacing=${.75} alignItems="center" flexWrap="wrap" useFlexGap>
            <${Typography} variant="body2" sx=${{ fontWeight: 500 }}>${sourceName(e.source)}<//>
            <${MusKindChip} kind=${e.source.kind} label=${srcLabel(e.source.kind)} />
          <//>
          <${Stack} direction="row" spacing=${.4} sx=${{ my: .5 }}>
            ${DAYS.map(day => {
              const on = dayHasSlots(e, day);
              return html`
                <${Box} key=${day} sx=${{ minWidth: 21, textAlign: 'center', borderRadius: '3px',
                  px: .5, py: .375, fontSize: 11, lineHeight: 1, fontWeight: on ? 500 : 400,
                  bgcolor: on ? '#E3F2FD' : 'rgba(0,0,0,0.04)',
                  color: on ? '#115293' : 'text.disabled' }}>${dayLabel(day)}<//>`;
            })}
          <//>
          <${Typography} variant="caption" color="text.disabled">
            ${entryTimes(e)} · ${validityLabel(e)}
          <//>
        <//>`)}
    <//>`;
}

/* msValidate(), ported: it reads state.msDraft in the vanilla. Music and
   radio may share a day but must never overlap in time — refused on save. */
function musMsValidate(d) {
  if (!d.entries.length) return t('msErrNoEntries');
  for (let i = 0; i < d.entries.length; i++) {
    const e = d.entries[i], n = i + 1;
    if (!e.source.refId) return t('msErrNoSource', n);
    const slots = e.days.reduce((acc, day) => acc + day.slots.length, 0);
    if (!slots) return t('msErrNoSlots', n);
    for (const day of e.days) {
      for (const sl of day.slots) {
        if (toMin(sl.start) === toMin(sl.end)) return t('msErrSameTime', n, dayLabel(day.day));
      }
    }
    if (e.source.kind === 'track' && e.repeat.mode === 'interval' && e.repeat.intervalMin < 1)
      return t('msErrInterval', n);
  }
  for (let a = 0; a < d.entries.length; a++) {
    for (let b = a + 1; b < d.entries.length; b++) {
      const ea = d.entries[a], eb = d.entries[b];
      if (!validityOverlap(ea, eb)) continue;
      const ra = entryRanges(ea), rb = entryRanges(eb);
      for (const x of ra) for (const y of rb) {
        if (rangesOverlap(x.r, y.r))
          return t('msErrOverlap', dayLabel(x.day),
            sourceName(ea.source) + ' ' + x.slot.start + '–' + x.slot.end,
            sourceName(eb.source) + ' ' + y.slot.start + '–' + y.slot.end);
      }
    }
  }
  return null;
}

/** loadScheduleDraft(): a working copy, all seven days present. */
function musScheduleDraft(stationId, lineId) {
  const existing = getSchedule(stationId, lineId);
  const draft = existing
    ? JSON.parse(JSON.stringify(existing))
    : { stationId, lineId, active: true, entries: [] };
  draft.entries.forEach(normaliseDays);
  return draft;
}

/** Pick the station a new schedule is for. Stations that already have one
    for that line are marked, and picking one opens it for editing. */
function MusStationPickerDialog({ open, onClose, onPick }) {
  const { s, set, t } = useApp();
  const groups = musLineGroups(s.msPickSearch);
  return html`
    <${Dialog} open=${!!open} onClose=${onClose} fullWidth
      PaperProps=${{ sx: { maxWidth: 680 } }}>
      <${DialogTitle}>${t('msPickTitle')}<//>
      <${DialogContent}>
        <${DialogContentText} variant="caption">${t('msPickHint')}<//>
        <${TextField} id="ms-pick-search" label=${t('evPickSearch')} fullWidth
          value=${s.msPickSearch} sx=${{ my: 2 }}
          onChange=${e => set({ msPickSearch: e.target.value })} />
        <${MusPickGrid}>
          ${groups.map(g => html`
            <${MusPickLine} key=${g.line} line=${g.line} count=${g.stations.length}>
              ${g.stations.map(st => html`
                <${Button} key=${st.id} fullWidth color="inherit"
                  id=${`ms-pick-${g.line}-${st.id}`}
                  onClick=${() => onPick(st.id, g.line)}
                  sx=${{ justifyContent: 'flex-start', textTransform: 'none', fontWeight: 400, px: .5 }}>
                  <${Stack} direction="row" spacing=${.75} alignItems="center" component="span">
                    <span>${st.name}</span>
                    ${getSchedule(st.id, g.line)
                      ? html`<${MusStateChip} cls="chip-on" label=${t('msHasSched')} />` : null}
                  <//>
                <//>`)}
            <//>`)}
        <//>
      <//>
      <${DialogActions}>
        <${Button} onClick=${onClose}>${t('cancel')}<//>
      <//>
    <//>`;
}

/** "Auf andere Stationen anwenden": the whole schedule is copied onto every
    selected station+line. Targets that already have one are chipped and
    counted into the overwrite warning, which rides in the action bar. */
function MusApplyDialog({ open, onClose }) {
  const { s, set, t, nav, bump, toast } = useApp();
  const d = s.msDraft;
  if (!open || !d) return null;

  const sel = s.msApplySel || [];
  const self = schedKey(s.msStationId, s.msLineId);
  const groups = musLineGroups(s.msApplySearch);

  const toggle = key => {
    const next = sel.slice();
    const i = next.indexOf(key);
    if (i === -1) next.push(key); else next.splice(i, 1);
    set({ msApplySel: next });
  };

  const toggleLine = lineId => {
    const keys = stations.filter(st => st.lines.includes(lineId))
      .map(st => schedKey(st.id, lineId))
      .filter(k => k !== self);
    const allSel = keys.every(k => sel.includes(k));
    const next = sel.slice();
    keys.forEach(k => {
      const i = next.indexOf(k);
      if (allSel && i !== -1) next.splice(i, 1);
      else if (!allSel && i === -1) next.push(k);
    });
    set({ msApplySel: next });
  };

  const overwrite = sel.filter(k => getSchedule(k.split('|')[0], k.split('|')[1])).length;

  const run = () => {
    if (!sel.length) return;
    // Save the source station first, so the copies and the original match.
    const src = JSON.parse(JSON.stringify(d));
    const own = getSchedule(src.stationId, src.lineId);
    if (own) Object.assign(own, src); else stationSchedules.push(JSON.parse(JSON.stringify(src)));
    sel.forEach(key => {
      const [stationId, lineId] = key.split('|');
      const copy = JSON.parse(JSON.stringify(src));
      copy.stationId = stationId; copy.lineId = lineId;
      // one schedule per station and line — an existing one is overwritten
      const existing = getSchedule(stationId, lineId);
      if (existing) Object.assign(existing, copy);
      else stationSchedules.push(copy);
    });
    set({ msApplySel: [], msDraft: null });
    bump();
    onClose();
    toast(t('savedMsg'));
    nav('musicStations');
  };

  return html`
    <${Dialog} open=${true} onClose=${onClose} fullWidth PaperProps=${{ sx: { maxWidth: 680 } }}>
      <${DialogTitle}>${t('msApplyTitle')}<//>
      <${DialogContent}>
        <${DialogContentText} variant="caption">${t('msApplyNote')}<//>
        <${TextField} id="ms-apply-search" label=${t('evPickSearch')} fullWidth
          value=${s.msApplySearch} sx=${{ my: 2 }}
          onChange=${e => set({ msApplySearch: e.target.value })} />
        <${MusPickGrid}>
          ${groups.map(g => {
            const targets = g.stations.filter(st => schedKey(st.id, g.line) !== self);
            const allSel = targets.length && targets.every(st => sel.includes(schedKey(st.id, g.line)));
            return html`
              <${MusPickLine} key=${g.line} line=${g.line} count=${g.stations.length}
                action=${targets.length ? html`
                  <${Button} size="small" sx=${{ minWidth: 0, px: .5 }}
                    onClick=${() => toggleLine(g.line)}>${allSel ? t('twReset') : t('evSelectAll')}<//>` : null}>
                ${g.stations.map(st => {
                  const key = schedKey(st.id, g.line);
                  if (key === self) return html`
                    <${Stack} key=${key} direction="row" spacing=${.75} alignItems="center"
                      sx=${{ opacity: .5, py: .5 }}>
                      <${Typography} variant="body2">${st.name}<//>
                      <${Typography} variant="caption" color="text.disabled">${t('msApplySelf')}<//>
                    <//>`;
                  return html`
                    <${MusPickStation} key=${key} id=${'ms-apply-' + key.replace('|', '-')}
                      name=${st.name} checked=${sel.includes(key)} onToggle=${() => toggle(key)}
                      after=${getSchedule(st.id, g.line)
                        ? html`<${MusStateChip} cls="chip-custom" label=${t('msHasSched')} />` : null} />`;
                })}
              <//>`;
          })}
        <//>
      <//>
      <${DialogActions}>
        ${overwrite ? html`
          <${Typography} variant="caption" sx=${{ mr: 'auto', maxWidth: '60%', color: '#E65100' }}>
            ${t('msApplyOverwrite', overwrite)}<//>` : null}
        <${Button} onClick=${onClose}>${t('cancel')}<//>
        <${Button} variant="contained" id="ms-apply-btn" disabled=${!sel.length} onClick=${run}>
          ${sel.length ? t('msApplyBtn', sel.length) : t('msApplyNone')}
        <//>
      <//>
    <//>`;
}

/** The ⋮ menu at the end of every row. */
function MusRowMenu({ sc, onEdit, onApply, onDelete }) {
  const { t } = useApp();
  const [anchor, setAnchor] = useState(null);
  const close = () => setAnchor(null);
  const run = fn => { close(); fn(); };
  return html`
    <${React.Fragment}>
      <${Tooltip} title=${t('msRowActions')}>
        <${IconButton} aria-label=${t('msRowActions')} aria-haspopup="true"
          aria-expanded=${!!anchor} id=${'ms-menu-' + schedKey(sc.stationId, sc.lineId)}
          onClick=${e => setAnchor(e.currentTarget)}><${Icon}>more_vert<//><//>
      <//>
      <${Menu} anchorEl=${anchor} open=${!!anchor} onClose=${close}>
        <${MenuItem} onClick=${() => run(onEdit)}>${t('msEdit')}<//>
        <${MenuItem} onClick=${() => run(onApply)}>${t('msApplyTo')}<//>
        <${MenuItem} onClick=${() => run(onDelete)} sx=${{ color: 'error.main' }}>${t('msDelete')}<//>
      <//>
    <//>`;
}

function MusicStationsView() {
  const { s, set, nav, t, bump } = useApp();
  const [pickOpen, setPickOpen] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [del, setDel] = useState(null);
  const [err, setErr] = useState('');

  const lineOrder = lineData.map(l => l.id);
  const sorted = stationSchedules.slice().sort((a, b) => {
    const diff = lineOrder.indexOf(a.lineId) - lineOrder.indexOf(b.lineId);
    if (diff) return diff;
    return (getStation(a.stationId) || {}).name < (getStation(b.stationId) || {}).name ? -1 : 1;
  });

  const open = (stationId, lineId) => {
    set({ msStationId: stationId, msLineId: lineId, msDraft: musScheduleDraft(stationId, lineId),
          msApplySel: [], msApplySearch: '' });
    nav('musicStation');
  };

  const applyFromList = (stationId, lineId) => {
    const draft = musScheduleDraft(stationId, lineId);
    const e = musMsValidate(draft);
    if (e) { setErr(e); return; }
    setErr('');
    set({ msStationId: stationId, msLineId: lineId, msDraft: draft,
          msApplySel: [], msApplySearch: '' });
    setApplyOpen(true);
  };

  const doDelete = () => {
    const sc = del && getSchedule(del.stationId, del.lineId);
    setDel(null);
    if (sc) { stationSchedules.splice(stationSchedules.indexOf(sc), 1); bump(); }
    nav('musicStations');
  };

  const delStation = del ? getStation(del.stationId) : null;

  return html`
    <${Box}>
      <${PageHeader} title=${t('musicTitle')} subtitle=${t('msIntro')}
        action=${html`<${Button} variant="contained" id="ms-new"
          onClick=${() => { set({ msPickSearch: '' }); setPickOpen(true); }}>${t('newSchedule')}<//>`} />
      <${PageBody}>
        ${err ? html`<${Alert} severity="error" sx=${{ mb: 2 }}>${err}<//>` : null}
        <${TableContainer} component=${Paper} variant="outlined" sx=${{ borderColor: '#E7E7E7' }}>
          <${Table} id="ms-table">
            <${TableHead}><${TableRow}>
              <${TableCell}>${t('colName')}<//>
              <${TableCell}>${t('colLine')}<//>
              <${TableCell} sx=${{ width: '30%' }}>${t('colMusic')}<//>
              <${TableCell} sx=${{ width: '30%' }}>${t('colRadio')}<//>
              <${TableCell} sx=${{ width: 44 }} />
            <//><//>
            <${TableBody}>
              ${sorted.length ? sorted.map(sc => {
                const st = getStation(sc.stationId);
                if (!st) return null;
                const key = schedKey(sc.stationId, sc.lineId);
                return html`
                  <${TableRow} key=${key} hover sx=${{ cursor: 'pointer' }}
                    onClick=${() => open(sc.stationId, sc.lineId)}>
                    <${TableCell} sx=${{ fontWeight: 500 }}>
                      <${Stack} direction="row" spacing=${1} alignItems="center">
                        <span>${st.name}</span>
                        ${sc.active ? null : html`<${MusStateChip} cls="chip-off" label=${t('stEvOff')} />`}
                      <//>
                    <//>
                    <${TableCell}><${LineBadge} line=${sc.lineId} /><//>
                    <${TableCell}><${MusSchedCell} sc=${sc} kinds=${MUSIC_KINDS} /><//>
                    <${TableCell}><${MusSchedCell} sc=${sc} kinds=${RADIO_KINDS} /><//>
                    <${TableCell} align="right" onClick=${e => e.stopPropagation()}>
                      <${MusRowMenu} sc=${sc}
                        onEdit=${() => open(sc.stationId, sc.lineId)}
                        onApply=${() => applyFromList(sc.stationId, sc.lineId)}
                        onDelete=${() => setDel({ stationId: sc.stationId, lineId: sc.lineId })} />
                    <//>
                  <//>`;
              }) : html`
                <${EmptyRow} colSpan=${5} label=${html`
                  <${Box}>
                    <${Typography} variant="body2" color="text.disabled">${t('noSchedules')}<//>
                    <${Typography} variant="caption" color="text.disabled">${t('noSchedulesHint')}<//>
                  <//>`} />`}
            <//>
          <//>
        <//>
      <//>

      ${pickOpen ? html`
        <${MusStationPickerDialog} open=${true} onClose=${() => setPickOpen(false)}
          onPick=${(stationId, lineId) => { setPickOpen(false); open(stationId, lineId); }} />` : null}

      ${applyOpen ? html`
        <${MusApplyDialog} open=${true} onClose=${() => setApplyOpen(false)} />` : null}

      <${ConfirmDialog} open=${!!del}
        title=${del ? t('msDelConfirm', delStation ? delStation.name : del.stationId, del.lineId) : ''}
        confirmLabel=${t('msDelete')} onConfirm=${doDelete} onClose=${() => setDel(null)} />
    <//>`;
}

/** One entry of a station schedule: one source, its own validity, its own
    repeat mode and its own weekly grid. */
function MusEntryCard({ entry, index, onChange, onRemove }) {
  const { t } = useApp();
  const e = entry;
  const edit = fn => { const next = JSON.parse(JSON.stringify(e)); fn(next); onChange(next); };
  const isTrack = e.source.kind === 'track';

  return html`
    <${SectionCard} title=${t('msEntry', index + 1)}
      action=${html`<${Button} color="error" onClick=${onRemove}>${t('msRemoveEntry')}<//>`}>
      <${MusFieldLabel} text=${t('evSource')} required />
      <${MusKindToggle} value=${e.source.kind} idPrefix=${`ms-kind-${index}`}
        onChange=${k => { if (k !== e.source.kind) edit(n => { n.source.kind = k; n.source.refId = ''; }); }} />

      <${Box} sx=${{ mt: 2 }}>
        <${FilterSelect} id=${`ms-ref-${index}`} label=${t('evSourceSel')} minWidth=${340}
          value=${e.source.refId} options=${musSourceOptions(e.source.kind, t)}
          onChange=${v => edit(n => { n.source.refId = v; })} />
      <//>

      <${MusFieldLabel} text=${t('msValidity')} sx=${{ mt: 2.5 }} />
      <${Stack} direction="row" spacing=${2} alignItems="center" flexWrap="wrap" useFlexGap>
        <${TextField} id=${`ms-valid-from-${index}`} type="date" label=${t('dateFrom')}
          value=${e.validFrom} InputLabelProps=${{ shrink: true }}
          onChange=${ev => edit(n => { n.validFrom = ev.target.value; })} />
        <${Typography} color="text.secondary">–<//>
        <${TextField} id=${`ms-valid-to-${index}`} type="date" label=${t('dateTo')}
          value=${e.validTo} InputLabelProps=${{ shrink: true }}
          onChange=${ev => edit(n => { n.validTo = ev.target.value; })} />
      <//>
      <${MusHint} text=${t('msValidityNote')} />

      ${isTrack ? html`
        <${Box} sx=${{ mt: 2.5 }}>
          <${MusFieldLabel} text=${t('msRepeat')} />
          <${Stack} direction="row" spacing=${2} alignItems="center" flexWrap="wrap" useFlexGap>
            <${ToggleButtonGroup} exclusive size="small" value=${e.repeat.mode}
              onChange=${(ev, v) => { if (v) edit(n => { n.repeat.mode = v; }); }}>
              <${ToggleButton} value="loop" sx=${{ textTransform: 'none', px: 1.5 }}>${t('msLoop')}<//>
              <${ToggleButton} value="interval" sx=${{ textTransform: 'none', px: 1.5 }}>${t('msInterval')} …<//>
            <//>
            ${e.repeat.mode === 'interval' ? html`
              <${TextField} id=${`ms-interval-${index}`} type="number" label=${t('msIntervalUnit')}
                value=${e.repeat.intervalMin} sx=${{ width: 110 }}
                inputProps=${{ min: 1, step: 1 }}
                onChange=${ev => edit(n => { n.repeat.intervalMin = parseInt(ev.target.value, 10) || 0; })} />`
              : null}
          <//>
          <${MusHint} text=${t('msRepeatNote')} />
        <//>` : null}

      <${MusFieldLabel} text=${t('msWeek')} sx=${{ mt: 2.5, mb: 0 }} />
      <${Box} sx=${{ maxWidth: 560 }}>
        <${WeekGrid} days=${e.days} allowEmpty=${true} idPrefix=${`msw-${index}`}
          onChange=${days => edit(n => { n.days = days; })} />
      <//>
      <${MusHint} text=${t('msWeekNote')} />
    <//>`;
}

function MusicStationEditView() {
  const { s, set, nav, t, bump, toast } = useApp();
  const [err, setErr] = useState('');
  const [applyOpen, setApplyOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);

  const d = s.msDraft;
  if (!d) return html`<${MusicStationsView} />`;

  const st = getStation(d.stationId);
  const name = st ? st.name : d.stationId;
  const isNew = !getSchedule(d.stationId, d.lineId);

  const edit = fn => {
    const next = JSON.parse(JSON.stringify(d));
    fn(next);
    setErr('');
    set({ msDraft: next });
  };

  const cancel = () => { set({ msDraft: null }); nav('musicStations'); };

  const save = () => {
    const e = musMsValidate(d);
    if (e) { setErr(e); return; }
    const saved = JSON.parse(JSON.stringify(d));
    const existing = getSchedule(saved.stationId, saved.lineId);
    if (existing) Object.assign(existing, saved);
    else stationSchedules.push(saved);
    set({ msDraft: null });
    bump();
    toast(t('savedMsg'));
    nav('musicStations');
  };

  const doDelete = () => {
    setDelOpen(false);
    const existing = getSchedule(d.stationId, d.lineId);
    if (existing) { stationSchedules.splice(stationSchedules.indexOf(existing), 1); bump(); }
    set({ msDraft: null });
    nav('musicStations');
  };

  /* The vanilla validates before it opens the apply dialog: a schedule that
     cannot be saved must not be copied onto other stations either. */
  const openApply = () => {
    const e = musMsValidate(d);
    if (e) { setErr(e); return; }
    setErr('');
    setApplyOpen(true);
  };

  return html`
    <${Box}>
      <${PageHeader}
        crumbs=${[{ label: t('musicTitle'), onClick: cancel }, { label: `${name} · ${d.lineId}` }]}
        title=${isNew ? t('msNewFor', name, d.lineId) : t('msSchedFor', name, d.lineId)}
        titleAfter=${html`<${LineBadge} line=${d.lineId} />`}
        action=${html`
          <${Stack} direction="row" spacing=${1}>
            ${isNew ? null : html`
              <${Button} color="error" onClick=${() => setDelOpen(true)}>${t('msDelete')}<//>`}
            <${Button} variant="outlined" id="ms-apply" onClick=${openApply}>${t('msApplyTo')}<//>
            <${Button} variant="outlined" onClick=${cancel}>${t('cancel')}<//>
            <${Button} variant="contained" id="ms-save" onClick=${save}>${t('msSave')}<//>
          <//>`} />

      <${PageBody}>
        ${err ? html`<${Alert} severity="error" sx=${{ mb: 2 }}>${err}<//>` : null}

        <${SectionCard} title=${t('evBasics')}>
          <${MusFieldLabel} text=${t('colStatus')} />
          <${FormControlLabel} sx=${{ ml: -1 }}
            control=${html`<${Checkbox} size="small" id="ms-active" checked=${!!d.active}
              onChange=${e => edit(n => { n.active = e.target.checked; })} />`}
            label=${html`<${Typography} variant="body2">${t('msActive')}<//>`} />
        <//>

        ${d.entries.length ? d.entries.map((e, i) => html`
          <${MusEntryCard} key=${e.id || i} entry=${e} index=${i}
            onChange=${next => edit(n => { n.entries[i] = next; })}
            onRemove=${() => edit(n => { n.entries.splice(i, 1); })} />`)
          : html`
            <${SectionCard}>
              <${Typography} variant="body2" color="text.secondary">${t('msNoEntries')}<//>
            <//>`}

        <${Box} sx=${{ mt: .5, mb: 3 }}>
          <${Button} variant="outlined" id="ms-add-entry"
            onClick=${() => edit(n => { n.entries.push(blankEntry('playlist')); })}>${t('msAddEntry')}<//>
        <//>
      <//>

      ${applyOpen ? html`
        <${MusApplyDialog} open=${true} onClose=${() => setApplyOpen(false)} />` : null}

      <${ConfirmDialog} open=${delOpen} title=${t('msDelConfirm', name, d.lineId)}
        confirmLabel=${t('msDelete')} onConfirm=${doDelete} onClose=${() => setDelOpen(false)} />
    <//>`;
}

/* ── registry ───────────────────────────────────────────────────── */
VIEWS.music         = MusicEventsView;        // V1 · event list
VIEWS.musicEvent    = MusicEventEditView;     // V1 · event editor
VIEWS.musicStations = MusicStationsView;      // V2 · one row per station + line
VIEWS.musicStation  = MusicStationEditView;   // V2 · station schedule editor
