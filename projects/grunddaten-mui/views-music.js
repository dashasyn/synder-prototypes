/* ════════════════════════════════════════════════════════════════════
   PIMS Grunddaten — Everrunning Musik, the event list.

   VIEWS.music / VIEWS.musicEvent — one list of music events, each event
   carrying its own stations, source and validity.

   The station-schedule variant ("Zeitpläne pro Station", V2 in the vanilla)
   is deliberately NOT carried: Ignat, 2026-09-16 — "Remove var 1 —
   schedules per station. We need only events." It is still live in the
   vanilla prototype at projects/grunddaten-editor/.

   Every rule — overlaps, validity, week ranges, status, search, the line
   grouping — comes from data.js, extracted from the vanilla. One function is
   ported rather than called: evValidate() reads state.evDraft directly in the
   vanilla, so it never made it into data.js. It is carried across line for
   line below, taking the draft as an argument, and calls the extracted
   helpers for every comparison it makes.

   evLineChips() and evSourceChip() are the other exception: they emit HTML
   strings bound to the vanilla's stylesheet, which this port does not have.
   Their *data* functions (evLineGroups, sourceName, srcLabel, dayHasSlots,
   entryTimes, validityLabel, DAYS/dayLabel) are called here and only the
   markup is MUI.
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
      ${/* Ignat, 2026-09-23: the heading is the same name the top-bar dropdown
            uses, so it reads as one place rather than two. Pointing both at
            t('evrMusic') is what keeps them equal. */ ''}
      <${PageHeader} title=${t('evrMusic')}
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
                      ${/* the tooltip names the action; the question belongs to the confirm */ ''}
                      <${Tooltip} title=${state.lang === 'de' ? 'Löschen' : 'Delete'}>
                        <${IconButton} color="error"
                          aria-label=${(state.lang === 'de' ? 'Löschen: ' : 'Delete: ') + ev.name}
                          onClick=${() => setDelEv(ev)}><${Icon} sx=${{ fontSize: 18 }}>delete_outline<//><//>
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
        crumbs=${[{ label: t('evrMusic'), onClick: cancel }, { label: title }]}
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

/* ── registry ───────────────────────────────────────────────────── */
VIEWS.music      = MusicEventsView;     // event list
VIEWS.musicEvent = MusicEventEditView;  // event editor
