/* ════════════════════════════════════════════════════════════════════
   Grunddatenversorgung — the stations list and the station detail.

   Ported from projects/grunddaten-editor/index.html (renderStations,
   renderDetail and their modals). Same sections, same order, same columns.
   What changed is the components, not the screens:

   · the 200px left label column is gone — filled fields carry the label
     floating inside (brief §3)
   · the line filter lost its "Alle Linien" option; empty means every line
     and the ✕ clears it, so the field needs the label that "All" used to be
   · native <select> became MUI Select; the schedule modal became a Dialog
     driving the shared WeekGrid
   ════════════════════════════════════════════════════════════════════ */

/* ── Stations list ──────────────────────────────────────────────── */
function StationsView() {
  const { s, set, nav, t } = useApp();

  // one row per station AND line, exactly as the vanilla builds it
  const allRows = [];
  stations.forEach(st => st.lines.forEach(line => allRows.push({ station: st, line })));
  const q = (s.search || '').toLowerCase();
  const rows = allRows.filter(r =>
    (!s.lineFilter || r.line === s.lineFilter) &&
    (!q || r.station.name.toLowerCase().includes(q) || r.line.toLowerCase().includes(q)));

  // Every line in the system, in lineData order — not only the lines that
  // happen to have a station row. Deriving them from the rows dropped U7, and
  // an absent option reads as a broken filter rather than an empty line.
  const lineOptions = lineData.map(l => ({ value: l.id, label: l.id }));

  return html`
    <${React.Fragment}>
      <${PageHeader} title=${t('stations')} subtitle=${`${t('stationsSuffix', rows.length)} · BVG J/JK`} />
      <${PageBody}>
        <${Stack} direction="row" spacing=${2} sx=${{ mb: 2 }}>
          <${TextField} label=${t('searchPlaceholder')} value=${s.search} sx=${{ width: 320 }}
            onChange=${e => set({ search: e.target.value })}
            InputProps=${{ endAdornment: s.search ? html`
              <${InputAdornment} position="end">
                <${IconButton} aria-label="clear search" onClick=${() => set({ search: '' })}>
                  <${Icon} sx=${{ fontSize: 18 }}>close<//><//>
              <//>` : null }} />
          <${FilterSelect} id="line-filter" label=${t('colLine')} value=${s.lineFilter}
            onChange=${v => set({ lineFilter: v })} options=${lineOptions} minWidth=${160} />
        <//>

        <${TableContainer} component=${Paper} variant="outlined" sx=${{ borderColor: '#E7E7E7' }}>
          <${Table}>
            <${TableHead}><${TableRow}>
              <${TableCell} sx=${{ width: 90 }}>${t('colId')}<//>
              <${TableCell}>${t('colName')}<//>
              <${TableCell} sx=${{ width: 120 }}>${t('colLine')}<//>
              <${TableCell} sx=${{ width: 48 }} />
            <//><//>
            <${TableBody}>
              ${rows.length ? rows.map(r => {
                const st = r.station;
                const nc = st.nameChanges[0];
                return html`
                  <${TableRow} hover key=${st.id + r.line} sx=${{ cursor: 'pointer' }}
                    onClick=${() => nav('detail', st.id, r.line)}>
                    <${TableCell}><${Chip} size="small" label=${st.id} variant="outlined" /><//>
                    <${TableCell}>
                      ${st.name}
                      ${nc ? html`<${Typography} component="span" variant="caption" color="text.secondary"
                        sx=${{ ml: 1 }}>→ ${nc.fullName} ${nc.date}<//>` : null}
                    <//>
                    <${TableCell}><${LineBadge} line=${r.line} /><//>
                    <${TableCell} sx=${{ color: 'text.disabled' }}>
                      <${Icon} sx=${{ fontSize: 18 }}>chevron_right<//><//>
                  <//>`;
              }) : html`<${EmptyRow} colSpan=${4} />`}
            <//>
          <//>
        <//>
      <//>
    <//>`;
}

/* ── Station detail ─────────────────────────────────────────────────
   The vanilla keeps edits in the DOM until Save reads them back out. The
   React port keeps them in a draft and writes the same fields back in
   place on Save — same semantics, so leaving the page still discards. */
/* Read by app.js's leave guard. The draft is local to the view, so the view
   reports whether it differs from what was last seeded — the event editor's
   guard, extended here (validator round 2: leaving silently lost edits). */
const DETAIL_GUARD = { dirty: false };

/* Ignat, 2026-09-30 — the staging build's cards and fields, brought in:
   Auslösepunkte is its own card with the four radii, and the station name
   gets a TTS fallback text. Radii and TTS text are seeded in data-extra.js. */
const RADII = [
  ['arrOuter', { de: 'Ankunft – äußerer Radius', en: 'Arrival – outer radius' }],
  ['depOuter', { de: 'Abfahrt – äußerer Radius', en: 'Departure – outer radius' }],
  ['depInner', { de: 'Abfahrt – innerer Radius', en: 'Departure – inner radius' }],
  ['station',  { de: 'Stationsradius',           en: 'Station radius' }],
];

function StationDetailView() {
  const { s, set, nav, t, bump, toast } = useApp();
  const st = getStation(s.selectedId);
  const seed = () => JSON.parse(JSON.stringify(getStation(s.selectedId)));
  const [draft, setDraft] = useState(seed);
  const [pristine, setPristine] = useState(() => JSON.stringify(seed()));
  const [addXfer, setAddXfer] = useState(null);   // pending file id, or null when closed
  const [addXferErr, setAddXferErr] = useState(false);
  const [schedIdx, setSchedIdx] = useState(null); // transfer announcement being scheduled
  const [schedDays, setSchedDays] = useState(null);

  // re-seed when the route changes to a different station
  useEffect(() => { const n = seed(); setDraft(n); setPristine(JSON.stringify(n)); },
    [s.selectedId, s.selectedLine]);

  if (!st) return html`<${PageBody}><${Alert} severity="error">${s.selectedId}<//><//>`;

  const d = draft;
  DETAIL_GUARD.dirty = JSON.stringify(d) !== pristine;
  const patch = fn => setDraft(prev => { const n = JSON.parse(JSON.stringify(prev)); fn(n); return n; });
  const de = state.lang === 'de';

  /* Range checks, live on the field, and Save refuses while any fails
     (validator round 2: 5000 m, −20 m and latitude 152.5 saved as success). */
  const outOf = (v, min, max, optional) => {
    if (v === '' || v === null || v === undefined) return !optional;
    const n = Number(v); return isNaN(n) || n < min || n > max;
  };
  const rangeMsg = (min, max, unit) => (de ? 'Erlaubt: ' : 'Allowed: ') + min + '–' + max + (unit ? ' ' + unit : '');
  const err = {
    name: !(d.name || '').trim(),
    lat: outOf(d.coords && d.coords.lat, -90, 90, true),
    lon: outOf(d.coords && d.coords.lon, -180, 180, true),
    nc: d.nameChanges.map(nc => !!nc.date && !(nc.fullName || '').trim()),
    radii: Object.fromEntries(RADII.map(([k]) => [k, outOf(d.radii && d.radii[k], 0, 999)])),
    prev: outOf(d.neighborDist.prev.dist, 0, 9999),
    next: outOf(d.neighborDist.next.dist, 0, 9999),
  };
  const hasErr = err.name || err.lat || err.lon || err.nc.some(Boolean) || err.prev || err.next
    || Object.values(err.radii).some(Boolean);

  const nameFileOptions = soundFiles.filter(f => f.type === 'station-name')
    .map(f => ({ value: f.id, label: f.filename }));

  const save = () => {
    if (hasErr) { toast(de ? 'Bitte die markierten Felder korrigieren.' : 'Please correct the marked fields.'); return; }
    // write the draft back onto the real record, in place, like the vanilla
    st.name = d.name.trim();
    st.shortName = (d.shortName || '').trim();
    st.longName = (d.longName || '').trim();
    st.coords = { lat: d.coords && d.coords.lat !== '' && d.coords.lat !== null ? parseFloat(d.coords.lat) : null,
                  lon: d.coords && d.coords.lon !== '' && d.coords.lon !== null ? parseFloat(d.coords.lon) : null };
    st.nameChanges = d.nameChanges.filter(nc => nc.date || nc.fullName)
      .map(nc => ({ date: nc.date, fullName: nc.fullName, shortName: nc.shortName, fileId: nc.fileId }));
    st.stationNameFile = d.stationNameFile;
    st.ttsText = (d.ttsText || '').trim();
    st.tracks.forEach((tr, ti) => { tr.exits = d.tracks[ti].exits.slice(); });
    st.radii = Object.fromEntries(RADII.map(([k]) => [k, parseInt(d.radii[k], 10)]));
    st.neighborDist.prev.dist = parseInt(d.neighborDist.prev.dist, 10);
    st.neighborDist.next.dist = parseInt(d.neighborDist.next.dist, 10);
    st.transferAnnouncements = d.transferAnnouncements.map(a => ({ ...a }));
    // re-seed from the record, so the page shows exactly what was stored —
    // a fully empty name-change card is dropped, not left on screen
    const n = seed(); setDraft(n); setPristine(JSON.stringify(n));
    bump();
    toast(t('savedMsg'));
  };

  /* schedSummary() in the vanilla returns an HTML string, so the rule is
     ported rather than called — the three states and their strings are the
     vanilla's own. Shown next to the Main radio: the main one is always
     active, every other one runs on its schedule. */
  const schedState = ann => ann.isMain
    ? html`<${Typography} variant="body2" color="text.secondary">${t('alwaysActive')}<//>`
    : ann.scheduleSlots
      ? html`<${Typography} variant="body2" color="text.secondary">${t('scheduleSet')}<//>`
      : html`<${Chip} size="small" color="warning" variant="outlined" label=${t('schedMissing')} />`;

  const setMain = i => patch(n => n.transferAnnouncements.forEach((a, j) => { a.isMain = j === i; }));
  // removing the main one hands "main" to the first that is left — a station
  // with announcements but no main was saveable before (validator round 2)
  const removeXfer = i => patch(n => {
    const wasMain = n.transferAnnouncements[i].isMain;
    n.transferAnnouncements.splice(i, 1);
    if (wasMain && n.transferAnnouncements.length) n.transferAnnouncements[0].isMain = true;
  });

  const openSchedule = i => {
    const ann = d.transferAnnouncements[i];
    // all seven days, each with at least one period — the vanilla's own seeding
    setSchedDays(DAYS.map(day => {
      const ex = ann.scheduleSlots && ann.scheduleSlots.find(x => x.day === day);
      return { day, slots: ex ? ex.slots.map(sl => ({ ...sl })) : [{ start: '09:00', end: '23:00' }] };
    }));
    setSchedIdx(i);
  };

  // a file already on the station is not offered again
  const assigned = new Set(d.transferAnnouncements.map(a => a.fileId));
  const transferOptions = soundFiles.filter(f => f.type === 'transfer' && !assigned.has(f.id))
    .map(f => ({ value: f.id, label: f.filename }));

  const num = (label, value, onChange, bad, min, max, id) => html`
    <${TextField} type="number" label=${label} sx=${{ width: 210 }} value=${value ?? ''} id=${id}
      inputProps=${{ min, max }} error=${bad} helperText=${bad ? rangeMsg(min, max, 'm') : ''}
      InputProps=${{ endAdornment: html`<${InputAdornment} position="end">m<//>` }}
      onChange=${e => onChange(e.target.value)} />`;

  return html`
    <${React.Fragment}>
      <${PageHeader} sticky
        crumbs=${[{ label: t('stations'), onClick: () => nav('stations') }, { label: st.name }]}
        title=${d.name}
        titleAfter=${html`<${LineBadge} line=${s.selectedLine} />`}
        subtitle=${`${st.id} · ${t('identifier')}`}
        action=${html`<${Button} variant="contained" id="stSave" onClick=${save}>${t('saveBtn')}<//>`} />

      <${PageBody}>
        ${/* Ignat, 2026-09-30: the card carries the coordinates too, so it is "Name and location" */ ''}
        <${SectionCard} title=${de ? 'Name und Standort' : 'Name and location'}>
          <${Stack} direction="row" spacing=${2} flexWrap="wrap" useFlexGap>
            <${TextField} label=${t('fullName')} required value=${d.name} sx=${{ width: 280 }} id="stName"
              error=${err.name} helperText=${err.name ? (de ? 'Pflichtfeld' : 'Required') : ''}
              onChange=${e => patch(n => { n.name = e.target.value; })} />
            <${TextField} label=${t('shortName')} value=${d.shortName || ''} sx=${{ width: 180 }}
              placeholder=${de ? 'z.B. Alex' : 'e.g. Alex'}
              onChange=${e => patch(n => { n.shortName = e.target.value; })} />
            <${TextField} label=${t('longName')} value=${d.longName || ''} sx=${{ width: 340 }}
              placeholder=${de ? 'z.B. Bahnhof Berlin Alexanderplatz' : 'e.g. Berlin Alexanderplatz station'}
              onChange=${e => patch(n => { n.longName = e.target.value; })} />
          <//>

          <${Typography} variant="overline" color="text.secondary" sx=${{ display: 'block', mt: 3, mb: 1 }}>
            ${t('coordinates')}<//>
          <${Stack} direction="row" spacing=${2} alignItems="flex-start" flexWrap="wrap" useFlexGap>
            <${TextField} type="number" label=${t('coordLat')} sx=${{ width: 170 }} placeholder="52.521992" id="stLat"
              inputProps=${{ step: 0.000001, min: -90, max: 90 }} value=${d.coords ? (d.coords.lat ?? '') : ''}
              error=${err.lat} helperText=${err.lat ? rangeMsg(-90, 90) : ''}
              onChange=${e => patch(n => { n.coords = { ...(n.coords || {}), lat: e.target.value }; })} />
            <${TextField} type="number" label=${t('coordLon')} sx=${{ width: 170 }} placeholder="13.413244" id="stLon"
              inputProps=${{ step: 0.000001, min: -180, max: 180 }} value=${d.coords ? (d.coords.lon ?? '') : ''}
              error=${err.lon} helperText=${err.lon ? rangeMsg(-180, 180) : ''}
              onChange=${e => patch(n => { n.coords = { ...(n.coords || {}), lon: e.target.value }; })} />
            ${/* no "Karte öffnen" link to a real map (Ignat, 2026-09-30) */ ''}
          <//>

          <${Typography} variant="overline" color="text.secondary" sx=${{ display: 'block', mt: 3, mb: 1 }}>
            ${t('scheduledChanges')}<//>
          <${Stack} spacing=${1.5}>
            ${d.nameChanges.map((nc, i) => html`
              <${Card} key=${i} sx=${{ bgcolor: '#FAFAFA' }}>
                <${Box} sx=${{ p: 1.5 }}>
                  <${Stack} direction="row" spacing=${2} alignItems="flex-start" flexWrap="wrap" useFlexGap>
                    <${TextField} type="date" label=${de ? 'Datum' : 'Date'}
                      InputLabelProps=${{ shrink: true }} value=${nc.date || ''} sx=${{ width: 190 }}
                      onChange=${e => patch(n => { n.nameChanges[i].date = e.target.value; })} />
                    ${/* the future name, labelled as such — the same labels as the current name read as the current name */ ''}
                    <${TextField} label=${de ? 'Neuer Standardname' : 'New default name'} value=${nc.fullName || ''} sx=${{ width: 240 }}
                      id=${'ncName-' + i} error=${err.nc[i]} helperText=${err.nc[i] ? (de ? 'Pflichtfeld, wenn ein Datum gesetzt ist' : 'Required once a date is set') : ''}
                      onChange=${e => patch(n => { n.nameChanges[i].fullName = e.target.value; })} />
                    <${TextField} label=${de ? 'Neuer kurzer Name' : 'New short name'} value=${nc.shortName || ''} sx=${{ width: 170 }}
                      onChange=${e => patch(n => { n.nameChanges[i].shortName = e.target.value; })} />
                    <${FilterSelect} label=${t('stationNameFile')} value=${nc.fileId || ''}
                      options=${nameFileOptions} minWidth=${240}
                      onChange=${v => patch(n => { n.nameChanges[i].fileId = v; })} />
                    <${Box} sx=${{ flexGrow: 1 }} />
                    <${DeleteAction} remove name=${`${de ? 'Namensänderung' : 'name change'} ${i + 1}`}
                      onClick=${() => patch(n => { n.nameChanges.splice(i, 1); })} />
                  <//>
                <//>
              <//>`)}
            <${Box}>
              ${/* the string already starts with "+", so no add icon in front of it */ ''}
              <${Button} id="btnAddNc"
                onClick=${() => patch(n => n.nameChanges.push({ date: '', fullName: '', shortName: '', fileId: '' }))}>
                ${t('scheduleChange')}<//>
            <//>
          <//>
        <//>

        ${/* ── Directions: exit side per direction, per track ── */ ''}
        <${SectionCard} title=${t('directions')} subtitle=${t('dirSubtitle')} disablePadding>
          <${TableContainer}>
            <${Table}>
              <${TableHead}><${TableRow}>
                <${TableCell} sx=${{ width: 120 }}>${t('track')}<//>
                ${d.directions.map((dir, di) => html`
                  <${TableCell} key=${di}>
                    <${Typography} variant="overline" color="text.secondary" sx=${{ display: 'block', lineHeight: 1.2 }}>
                      ${t('direction')} ${di + 1}<//>
                    ${dir.name}
                  <//>`)}
              <//><//>
              <${TableBody}>
                ${d.tracks.map((tr, ti) => html`
                  <${TableRow} key=${ti}>
                    <${TableCell} sx=${{ fontWeight: 500 }}>${de ? 'Gleis' : 'Track'} ${tr.num}<//>
                    ${d.directions.map((dir, di) => html`
                      <${TableCell} key=${di}>
                        ${/* the direction is named once, in the column header — staging's layout */ ''}
                        <${FormControl} sx=${{ minWidth: 150 }}>
                          <${Select} value=${tr.exits[di]} hiddenLabel
                            inputProps=${{ id: `te-${ti}-${di}`, 'aria-label': `${de ? 'Gleis' : 'Track'} ${tr.num}, ${dir.name}` }}
                            SelectDisplayProps=${{ 'aria-label': `${de ? 'Gleis' : 'Track'} ${tr.num}, ${dir.name}` }}
                            sx=${{ '& .MuiSelect-select': { py: 1.25 } }}
                            onChange=${e => patch(n => { n.tracks[ti].exits[di] = e.target.value; })}>
                            ${['left', 'right', 'both'].map(v => html`
                              <${MenuItem} key=${v} value=${v}>${t(v)}<//>`)}
                          <//>
                        <//>
                      <//>`)}
                  <//>`)}
              <//>
            <//>
          <//>
        <//>

        ${/* ── Announcements ── */ ''}
        <${SectionCard} title=${t('announcements')}>
          <${Stack} direction="row" spacing=${2} alignItems="flex-start" flexWrap="wrap" useFlexGap>
            <${FilterSelect} label=${t('stationNameFile')} value=${d.stationNameFile || ''}
              options=${nameFileOptions} minWidth=${300}
              onChange=${v => patch(n => { n.stationNameFile = v; })} />
            ${/* staging's wording, verbatim (DE); the EN is mine */ ''}
            <${TextField} id="stTts" label=${de ? 'TTS-Text (Fallback)' : 'TTS text (fallback)'} value=${d.ttsText || ''}
              sx=${{ width: 300 }}
              helperText=${de ? 'Wird als Text-to-Speech verwendet, wenn keine Audiodatei verfügbar ist.'
                              : 'Used as text-to-speech when no audio file is available.'}
              onChange=${e => patch(n => { n.ttsText = e.target.value; })} />
          <//>

          <${Typography} variant="overline" color="text.secondary" sx=${{ display: 'block', mt: 3, mb: 1 }}>
            ${t('transferFiles')}<//>
          ${/* Ignat, 2026-09-30: a table — Name / Type / Main / actions — instead of rows led by a "Haupt"
                chip. Main is a radio: exactly one is main, and picking another one replaces
                "Als Haupt festlegen". */ ''}
          ${d.transferAnnouncements.length ? html`
            <${TableContainer} id="xferTable" sx=${{ border: '1px solid #E7E7E7', borderRadius: 1, mb: 1.5 }}>
              <${Table}>
                <${TableHead}><${TableRow}>
                  <${TableCell}>${t('colName')}<//>
                  <${TableCell}>${t('colType')}<//>
                  <${TableCell}>${t('mainAnn')}<//>
                  <${TableCell} align="right" sx=${{ width: 1, whiteSpace: 'nowrap' }} />
                <//><//>
                <${TableBody}>
                  ${d.transferAnnouncements.map((ann, i) => html`
                    <${TableRow} key=${i}>
                      <${TableCell} sx=${{ fontFamily: 'monospace', fontSize: 13 }}>${sndName(ann.fileId)}<//>
                      <${TableCell}>${ann.label || '—'}<//>
                      <${TableCell}>
                        <${Stack} direction="row" spacing=${.5} alignItems="center">
                          <${Radio} size="small" checked=${!!ann.isMain} onChange=${() => setMain(i)}
                            inputProps=${{ 'aria-label': `${t('setAsMain')}: ${ann.label || sndName(ann.fileId)}` }} sx=${{ ml: -1 }} />
                          ${schedState(ann)}
                        <//>
                      <//>
                      <${TableCell} align="right" sx=${{ whiteSpace: 'nowrap' }}>
                        ${/* the main one always plays, so it has no schedule to edit */ ''}
                        ${ann.isMain ? null : html`<${Button} onClick=${() => openSchedule(i)}>${t('editSchedule')}<//>`}
                        <${DeleteAction} remove name=${`${de ? 'Umstiegsansage' : 'transfer announcement'} ${i + 1}`}
                          onClick=${() => removeXfer(i)} />
                      <//>
                    <//>`)}
                <//>
              <//>
            <//>` : html`
            <${Typography} variant="body2" color="text.disabled" sx=${{ fontStyle: 'italic', mb: 1.5 }}>
              ${t('noneAssigned')}<//>`}
          <${Button} id="btnAddXfer" disabled=${!transferOptions.length}
            onClick=${() => { setAddXfer(''); setAddXferErr(false); }}>${t('addTransfer')}<//>
        <//>

        ${/* ── Trigger points — their own card, as on staging ── */ ''}
        <${SectionCard} title=${t('triggerPoints')}>
          <${Stack} direction="row" spacing=${2} alignItems="flex-start" flexWrap="wrap" useFlexGap id="radii">
            ${RADII.map(([k, lbl]) => html`<${Box} key=${k}>${num(lbl[state.lang], d.radii[k],
              v => patch(n => { n.radii[k] = v; }), err.radii[k], 0, 999, 'rad-' + k)}<//>`)}
          <//>
        <//>

        ${/* ── Neighbours ── */ ''}
        <${SectionCard} title=${t('neighbors')} subtitle=${t('neighborsSubtitle')}>
          <${Stack} spacing=${2}>
            ${[['prev', '←'], ['next', '→']].map(([k, arrow]) => html`
              <${Stack} key=${k} direction="row" spacing=${2} alignItems="flex-start">
                <${Typography} sx=${{ color: 'text.secondary', width: 20, pt: 2 }}>${arrow}<//>
                <${Typography} variant="body2" sx=${{ width: 220, pt: 2 }}>${d.neighborDist[k].name}<//>
                ${num(de ? 'Abstand' : 'Distance', d.neighborDist[k].dist,
                  v => patch(n => { n.neighborDist[k].dist = v; }), err[k], 0, 9999, 'nb-' + k)}
              <//>`)}
          <//>
        <//>
      <//>

      ${/* ── Add transfer announcement ── */ ''}
      <${Dialog} open=${addXfer !== null} onClose=${() => setAddXfer(null)} fullWidth maxWidth="xs">
        <${DialogTitle}>${t('addTransferTitle')}<//>
        <${DialogContent}>
          <${FormControl} fullWidth required error=${addXferErr} sx=${{ mt: 1 }}>
            <${InputLabel}>${t('selectFile')}<//>
            <${Select} label=${t('selectFile')} value=${addXfer || ''} id="addXferFile"
              onChange=${e => { setAddXfer(e.target.value); setAddXferErr(false); }}>
              ${transferOptions.map(o => html`<${MenuItem} key=${o.value} value=${o.value}>${o.label}<//>`)}
            <//>
            ${addXferErr ? html`<${FormHelperText}>${t('selectFile')}<//>` : null}
          <//>
        <//>
        <${DialogActions}>
          <${Button} onClick=${() => setAddXfer(null)}>${t('cancel')}<//>
          <${Button} variant="contained" onClick=${() => {
            if (!addXfer) { setAddXferErr(true); return; }
            patch(n => {
              const hasMain = n.transferAnnouncements.some(a => a.isMain);
              // the type is the file's own name ("Umstieg Regional"), not its filename again
              const f = snd(addXfer);
              n.transferAnnouncements.push({ fileId: addXfer, label: f ? f.name : sndName(addXfer),
                                             isMain: !hasMain, scheduleSlots: null });
            });
            setAddXfer(null);
          }}>${t('saveEntry')}<//>
        <//>
      <//>

      ${/* ── Transfer announcement schedule — the shared weekly grid ── */ ''}
      <${Dialog} open=${schedIdx !== null} onClose=${() => setSchedIdx(null)} maxWidth="sm" fullWidth>
        <${DialogTitle}>
          ${t('scheduleTitle')}
          <${Typography} variant="body2" color="text.secondary">
            ${schedIdx !== null && d.transferAnnouncements[schedIdx]
              ? (d.transferAnnouncements[schedIdx].label || sndName(d.transferAnnouncements[schedIdx].fileId))
              : ''}<//>
        <//>
        <${DialogContent}>
          ${schedDays ? html`<${WeekGrid} days=${schedDays} onChange=${setSchedDays} idPrefix="sc" />` : null}
        <//>
        <${DialogActions}>
          <${Button} onClick=${() => setSchedIdx(null)}>${t('cancel')}<//>
          <${Button} variant="contained" onClick=${() => {
            const i = schedIdx;
            patch(n => { n.transferAnnouncements[i].scheduleSlots =
              schedDays.map(dd => ({ day: dd.day, slots: dd.slots.map(sl => ({ ...sl })) })); });
            setSchedIdx(null);
          }}>${t('saveSchedule')}<//>
        <//>
      <//>
    <//>`;
}

VIEWS.stations = StationsView;
VIEWS.detail = StationDetailView;
