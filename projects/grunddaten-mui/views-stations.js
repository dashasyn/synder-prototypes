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
      ${/* Ignat, 2026-09-30: no "50 Haltestellen · BVG J/JK" line, a thinner top,
            and the filters on the title's row */ ''}
      <${PageHeader} dense title=${t('stations')} action=${html`
        <${Stack} direction="row" spacing=${2} alignItems="center">
          <${TextField} label=${t('searchPlaceholder')} value=${s.search} sx=${{ width: 280 }} id="stSearch"
            onChange=${e => set({ search: e.target.value })}
            InputProps=${{ endAdornment: s.search ? html`
              <${InputAdornment} position="end">
                <${IconButton} aria-label="clear search" onClick=${() => set({ search: '' })}>
                  <${Icon} sx=${{ fontSize: 18 }}>close<//><//>
              <//>` : null }} />
          <${FilterSelect} id="line-filter" label=${t('colLine')} value=${s.lineFilter}
            onChange=${v => set({ lineFilter: v })} options=${lineOptions} minWidth=${160} />
        <//>`} />
      <${PageBody}>
        <${TableContainer} component=${Paper} variant="outlined" sx=${{ borderColor: '#E7E7E7' }}>
          <${Table}>
            <${TableHead}><${TableRow}>
              <${TableCell} sx=${{ width: 90 }}>${t('colId')}<//>
              <${TableCell}>${t('colName')}<//>
              <${TableCell} sx=${{ width: 120 }}>${t('colLine')}<//>
              <${TableCell} sx=${{ width: 56 }} />
            <//><//>
            <${TableBody}>
              ${rows.length ? rows.map(r => {
                const st = r.station;
                const nc = st.nameChanges[0];
                // the whole row opens the station, with hover; the pen at the end says so (Ignat, 2026-09-30)
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
                    <${TableCell} align="right">
                      <${EditAction} name=${st.name + ' ' + r.line} onClick=${e => { e.stopPropagation(); nav('detail', st.id, r.line); }} /><//>
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

/* Ignat, 2026-09-30 — the staging build's cards and fields, brought in:
   Auslösepunkte is its own card with the four radii, and the station name
   gets a TTS fallback text. Radii and TTS text are seeded in data-extra.js. */
const RADII = [
  ['arrOuter', { de: 'Ankunft – äußerer Radius', en: 'Arrival – outer radius' }],
  ['depOuter', { de: 'Abfahrt – äußerer Radius', en: 'Departure – outer radius' }],
  ['depInner', { de: 'Abfahrt – innerer Radius', en: 'Departure – inner radius' }],
  ['station',  { de: 'Stationsradius',           en: 'Station radius' }],
];

/* The transfer-announcement priority (Ignat, 2026-09-30): row order IS the
   priority, 1 = highest, to settle overlapping schedules. The main one is
   always last — the lowest — and plays whenever nothing else does. */
const WHOLE_DAY = { start: '00:00', end: '23:59' };
const fmtIsoDate = iso => iso ? iso.split('-').reverse().join('.') : '';
const mainLast = list => [...list.filter(a => !a.isMain), ...list.filter(a => a.isMain)];

/* "Mo–Do 22:00–01:00; Fr 22:00–03:00" — consecutive days with the same
   periods are grouped, so a full week stays one short line. */
function schedPreview(slots, periods) {
  if (!slots) return '';
  const ps = (periods || []).filter(p => p.from || p.to);
  const range = ps.length ? ps.map(p => (p.from ? fmtIsoDate(p.from) : '…') + '–' + (p.to ? fmtIsoDate(p.to) : '…')).join(', ') + ' · ' : '';
  const days = DAYS.map(dd => {
    const x = slots.find(y => y.day === dd);
    return { day: dd, txt: x && x.slots.length ? x.slots.map(sl => sl.start + '–' + sl.end).join(', ') : '' };
  });
  const out = [];
  for (let k = 0; k < days.length; k++) {
    if (!days[k].txt) continue;
    let e = k;
    while (e + 1 < days.length && days[e + 1].txt === days[k].txt) e++;
    out.push((k === e ? dayLabel(days[k].day) : dayLabel(days[k].day) + '–' + dayLabel(days[e].day)) + ' ' + days[k].txt);
    k = e;
  }
  return out.length ? range + out.join('; ') : '';
}

function StationDetailView() {
  const { s, set, nav, t, bump, toast } = useApp();
  const st = getStation(s.selectedId);
  const seed = () => JSON.parse(JSON.stringify(getStation(s.selectedId)));
  const [draft, setDraft] = useState(seed);
  const [pristine, setPristine] = useState(() => JSON.stringify(seed()));
  const [addXfer, setAddXfer] = useState(null);   // pending file id, or null when closed
  const [addXferErr, setAddXferErr] = useState(false);
  const [addMain, setAddMain] = useState(false);
  const [schedIdx, setSchedIdx] = useState(null); // transfer announcement being scheduled
  const [schedDays, setSchedDays] = useState(null);
  const [schedPeriods, setSchedPeriods] = useState([{ from: '', to: '' }]);

  // re-seed when the route changes to a different station
  useEffect(() => { const n = seed(); setDraft(n); setPristine(JSON.stringify(n)); },
    [s.selectedId, s.selectedLine]);

  const d = draft;
  const patch = fn => setDraft(prev => { const n = JSON.parse(JSON.stringify(prev)); fn(n); return n; });
  // HTML5 drag between the non-main rows; the main one stays last
  const { rowProps, rowSx } = useRowDrag((from, to) => patch(n => {
    const L = n.transferAnnouncements;
    if (L[from].isMain || L[to].isMain) return;
    const [m] = L.splice(from, 1); L.splice(to, 0, m);
  }));

  if (!st) return html`<${PageBody}><${Alert} severity="error">${s.selectedId}<//><//>`;

  DETAIL_GUARD.dirty = JSON.stringify(d) !== pristine;
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

  // setting a main one moves it to the bottom; the old main keeps its place above it
  const setMain = i => patch(n => {
    n.transferAnnouncements.forEach((a, j) => { a.isMain = j === i; });
    n.transferAnnouncements = mainLast(n.transferAnnouncements);
  });
  // removing the main one hands "main" to the lowest one left — a station
  // with announcements but no main was saveable before (validator round 2)
  const removeXfer = i => patch(n => {
    const L = n.transferAnnouncements;
    const wasMain = L[i].isMain;
    L.splice(i, 1);
    if (wasMain && L.length) L[L.length - 1].isMain = true;
  });

  const openSchedule = i => {
    const ann = d.transferAnnouncements[i];
    // all seven days, each with at least one period — the vanilla's own seeding
    setSchedDays(DAYS.map(day => {
      const ex = ann.scheduleSlots && ann.scheduleSlots.find(x => x.day === day);
      // a new schedule is the whole day, every day (Ignat, 2026-10-01); a day saved empty stays empty
      return { day, slots: ex ? ex.slots.map(sl => ({ ...sl })) : (ann.scheduleSlots ? [] : [{ ...WHOLE_DAY }]) };
    }));
    // several date periods (Ignat, 2026-10-01); always at least one row on screen
    setSchedPeriods(ann.periods && ann.periods.length ? ann.periods.map(p => ({ ...p })) : [{ from: '', to: '' }]);
    setSchedIdx(i);
  };

  const badPeriod = p => !!(p.from && p.to && p.to < p.from);
  const schedBadRange = schedPeriods.some(badPeriod);
  const setPeriod = (k, f, v) => setSchedPeriods(L => L.map((p, j) => j === k ? { ...p, [f]: v } : p));
  // "−" deletes a period; on the only one left it clears it — the same rule as the week grid
  const removePeriod = k => setSchedPeriods(L => L.length > 1 ? L.filter((_, j) => j !== k) : [{ from: '', to: '' }]);
  const addPeriod = () => setSchedPeriods(L => [...L, { from: '', to: '' }]);

  // a file already on the station is not offered again
  const assigned = new Set(d.transferAnnouncements.map(a => a.fileId));
  const transferOptions = soundFiles.filter(f => f.type === 'transfer' && !assigned.has(f.id))
    .map(f => ({ value: f.id, label: f.filename }));
  const firstXfer = !d.transferAnnouncements.length;   // the first one is main, necessarily

  // a number field for a form row: no label inside, the unit after it
  const num = (label, value, onChange, bad, min, max, id) => html`
    <${TextField} type="number" hiddenLabel sx=${{ width: 160 }} value=${value ?? ''} id=${id}
      inputProps=${{ min, max, 'aria-label': label, style: { textAlign: 'right' } }}
      error=${bad} helperText=${bad ? rangeMsg(min, max, 'm') : ''}
      InputProps=${{ endAdornment: html`<${InputAdornment} position="end">m<//>` }}
      onChange=${e => onChange(e.target.value)} />`;
  const text = (id, value, onChange, extra) => html`
    <${TextField} id=${id} hiddenLabel fullWidth value=${value || ''} onChange=${e => onChange(e.target.value)} ...${extra || {}} />`;

  return html`
    <${React.Fragment}>
      ${/* Ignat, 2026-09-30: full-width header, fixed (sticky), with the station code
            next to the name; no "AL · Kennung · schreibgeschützt" line */ ''}
      <${PageHeader} sticky
        crumbs=${[{ label: t('stations'), onClick: () => nav('stations') }, { label: st.name }]}
        title=${`${d.name || st.name} (${st.id})`}
        titleAfter=${html`<${LineBadge} line=${s.selectedLine} />`}
        action=${html`<${Button} variant="contained" id="stSave" onClick=${save}>${t('saveBtn')}<//>`} />

      <${PageBody} narrow>
        ${/* Ignat, 2026-09-30: the card carries the coordinates too, so it is "Name and location" */ ''}
        <${SectionCard} title=${de ? 'Name und Standort' : 'Name and location'}>
          <${FormRow} label=${t('fullName') + ' *'} htmlFor="stName">
            ${text('stName', d.name, v => patch(n => { n.name = v; }),
              { required: true, error: err.name, helperText: err.name ? (de ? 'Pflichtfeld' : 'Required') : '' })}
          <//>
          <${FormRow} label=${t('shortName')} htmlFor="stShort">
            ${text('stShort', d.shortName, v => patch(n => { n.shortName = v; }), { placeholder: de ? 'z.B. Alex' : 'e.g. Alex' })}
          <//>
          <${FormRow} label=${t('longName')} htmlFor="stLong">
            ${text('stLong', d.longName, v => patch(n => { n.longName = v; }),
              { placeholder: de ? 'z.B. Bahnhof Berlin Alexanderplatz' : 'e.g. Berlin Alexanderplatz station' })}
          <//>
          ${/* two inputs share the row, so each keeps its small label inside — as on staging */ ''}
          <${FormRow} label=${t('coordinates')} htmlFor="stLat" top>
            <${Stack} direction="row" spacing=${2} alignItems="flex-start">
              <${TextField} type="number" label=${t('coordLat')} sx=${{ width: 170 }} placeholder="52.521992" id="stLat"
                inputProps=${{ step: 0.000001, min: -90, max: 90 }} value=${d.coords ? (d.coords.lat ?? '') : ''}
                error=${err.lat} helperText=${err.lat ? rangeMsg(-90, 90) : ''}
                onChange=${e => patch(n => { n.coords = { ...(n.coords || {}), lat: e.target.value }; })} />
              <${TextField} type="number" label=${t('coordLon')} sx=${{ width: 170 }} placeholder="13.413244" id="stLon"
                inputProps=${{ step: 0.000001, min: -180, max: 180 }} value=${d.coords ? (d.coords.lon ?? '') : ''}
                error=${err.lon} helperText=${err.lon ? rangeMsg(-180, 180) : ''}
                onChange=${e => patch(n => { n.coords = { ...(n.coords || {}), lon: e.target.value }; })} />
            <//>
          <//>
          <${FormRow} label=${t('scheduledChanges')} htmlFor="btnAddNc" top>
            <${Stack} spacing=${1.5} sx=${{ width: '100%' }}>
              ${d.nameChanges.map((nc, i) => html`
                <${Card} key=${i} sx=${{ bgcolor: '#FAFAFA' }}>
                  <${Box} sx=${{ p: 1.5 }}>
                    <${Stack} direction="row" spacing=${2} alignItems="flex-start" flexWrap="wrap" useFlexGap>
                      <${TextField} type="date" label=${de ? 'Datum' : 'Date'}
                        InputLabelProps=${{ shrink: true }} value=${nc.date || ''} sx=${{ width: 170 }}
                        onChange=${e => patch(n => { n.nameChanges[i].date = e.target.value; })} />
                      ${/* the future name, labelled as such */ ''}
                      <${TextField} label=${de ? 'Neuer Standardname' : 'New default name'} value=${nc.fullName || ''} sx=${{ width: 210 }}
                        id=${'ncName-' + i} error=${err.nc[i]} helperText=${err.nc[i] ? (de ? 'Pflichtfeld, wenn ein Datum gesetzt ist' : 'Required once a date is set') : ''}
                        onChange=${e => patch(n => { n.nameChanges[i].fullName = e.target.value; })} />
                      <${TextField} label=${de ? 'Neuer kurzer Name' : 'New short name'} value=${nc.shortName || ''} sx=${{ width: 150 }}
                        onChange=${e => patch(n => { n.nameChanges[i].shortName = e.target.value; })} />
                      <${FilterSelect} label=${t('stationNameFile')} value=${nc.fileId || ''}
                        options=${nameFileOptions} minWidth=${200}
                        onChange=${v => patch(n => { n.nameChanges[i].fileId = v; })} />
                      <${Box} sx=${{ flexGrow: 1 }} />
                      <${DeleteAction} remove name=${`${de ? 'Namensänderung' : 'name change'} ${i + 1}`}
                        onClick=${() => patch(n => { n.nameChanges.splice(i, 1); })} />
                    <//>
                  <//>
                <//>`)}
              <${Box} sx=${{ pt: d.nameChanges.length ? 0 : 0.5 }}>
                ${/* the string already starts with "+", so no add icon in front of it */ ''}
                <${Button} id="btnAddNc"
                  onClick=${() => patch(n => n.nameChanges.push({ date: '', fullName: '', shortName: '', fileId: '' }))}>
                  ${t('scheduleChange')}<//>
              <//>
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
          <${FormRow} label=${t('stationNameFile')}>
            <${FilterSelect} label=${t('stationNameFile')} hideLabel fullWidth value=${d.stationNameFile || ''}
              options=${nameFileOptions} minWidth=${300}
              onChange=${v => patch(n => { n.stationNameFile = v; })} />
          <//>
          ${/* staging's wording, verbatim (DE); the EN is mine */ ''}
          <${FormRow} label=${de ? 'TTS-Text (Fallback)' : 'TTS text (fallback)'} htmlFor="stTts" top>
            ${text('stTts', d.ttsText, v => patch(n => { n.ttsText = v; }), {
              helperText: de ? 'Wird als Text-to-Speech verwendet, wenn keine Audiodatei verfügbar ist.'
                             : 'Used as text-to-speech when no audio file is available.' })}
          <//>

          <${Typography} variant="subtitle2" sx=${{ fontWeight: 500, mt: 3, mb: 1 }}>${t('transferFiles')}<//>
          ${/* Ignat, 2026-09-30: priority by row order (drag), the main one last; active time
                previewed in the row; schedule and "main" as grey icons; no Typ column. */ ''}
          ${d.transferAnnouncements.length ? html`
            <${TableContainer} id="xferTable" sx=${{ border: '1px solid #E7E7E7', borderRadius: 1, mb: 1.5 }}>
              <${Table}>
                <${TableHead}><${TableRow}>
                  <${TableCell} sx=${{ width: 96, whiteSpace: 'nowrap' }}>${de ? 'Priorität' : 'Priority'}<//>
                  <${TableCell} sx=${{ width: 220 }}>${t('colName')}<//>
                  <${TableCell}>${de ? 'Aktivzeit' : 'Active time'}<//>
                  <${TableCell} align="right" sx=${{ width: 136, whiteSpace: 'nowrap' }} />
                <//><//>
                <${TableBody}>
                  ${d.transferAnnouncements.map((ann, i) => {
                    const drag = ann.isMain ? {} : rowProps(i);
                    const nm = sndName(ann.fileId);
                    return html`
                    <${TableRow} key=${ann.fileId} data-main=${ann.isMain ? 'true' : 'false'}
                      sx=${ann.isMain ? { bgcolor: '#FAFAFA' } : rowSx(i)} ...${drag}>
                      <${TableCell}>
                        <${Stack} direction="row" spacing=${1} alignItems="center">
                          ${ann.isMain ? html`<${Box} sx=${{ width: 18 }} />` : html`<${DragHandle} />`}
                          <span className="prio">${i + 1}</span>
                        <//>
                      <//>
                      <${TableCell} sx=${{ fontFamily: 'monospace', fontSize: 13 }}>${nm}<//>
                      <${TableCell} className="active-time" sx=${{ fontSize: 13 }}>
                        ${ann.isMain ? (de ? 'Immer' : 'Always')
                          : schedPreview(ann.scheduleSlots, ann.periods)
                          || html`<${Chip} size="small" color="warning" variant="outlined" label=${t('schedMissing')} />`}
                      <//>
                      <${TableCell} align="right" sx=${{ whiteSpace: 'nowrap' }}>
                        ${/* star = main (material "star" / "star_border") */ ''}
                        ${ann.isMain ? html`
                          <${Tooltip} title=${de ? 'Hauptansage – läuft immer, niedrigste Priorität' : 'Main announcement – always on, lowest priority'}>
                            <span><${IconButton} disabled aria-label=${(de ? 'Hauptansage' : 'Main announcement') + ': ' + nm}
                              sx=${{ '&.Mui-disabled': { color: 'text.secondary' } }}><${Icon} sx=${{ fontSize: 20 }}>star<//><//></span>
                          <//>` : html`
                          <${Tooltip} title=${t('setAsMain')}>
                            <${IconButton} aria-label=${t('setAsMain') + ': ' + nm} onClick=${() => setMain(i)}>
                              <${Icon} sx=${{ fontSize: 20 }}>star_border<//><//>
                          <//>`}
                        ${/* the main one always plays, so it has no schedule to edit */ ''}
                        ${ann.isMain ? html`<${Box} component="span" sx=${{ display: 'inline-block', width: 40 }} />` : html`
                          <${Tooltip} title=${t('editSchedule')}>
                            <${IconButton} aria-label=${t('editSchedule') + ': ' + nm} onClick=${() => openSchedule(i)}>
                              <${Icon} sx=${{ fontSize: 20 }}>edit<//><//>
                          <//>`}
                        <${DeleteAction} remove name=${`${de ? 'Umstiegsansage' : 'transfer announcement'} ${nm}`}
                          onClick=${() => removeXfer(i)} />
                      <//>
                    <//>`; })}
                <//>
              <//>
            <//>` : html`
            <${Typography} variant="body2" color="text.disabled" sx=${{ fontStyle: 'italic', mb: 1.5 }}>
              ${t('noneAssigned')}<//>`}
          <${Button} id="btnAddXfer" disabled=${!transferOptions.length}
            onClick=${() => { setAddXfer(''); setAddXferErr(false); setAddMain(false); }}>${t('addTransfer')}<//>
        <//>

        ${/* ── Trigger points — their own card, as on staging ── */ ''}
        <${SectionCard} title=${t('triggerPoints')}>
          <${Box} id="radii">
            ${RADII.map(([k, lbl]) => html`<${FormRow} key=${k} label=${lbl[state.lang]} htmlFor=${'rad-' + k} right>
              ${num(lbl[state.lang], d.radii[k], v => patch(n => { n.radii[k] = v; }), err.radii[k], 0, 999, 'rad-' + k)}<//>`)}
          <//>
        <//>

        ${/* ── Neighbours — the same rows as the trigger points ── */ ''}
        <${SectionCard} title=${t('neighbors')} subtitle=${t('neighborsSubtitle')}>
          ${[['prev', '←'], ['next', '→']].map(([k, arrow]) => html`
            <${FormRow} key=${k} label=${arrow + ' ' + d.neighborDist[k].name} htmlFor=${'nb-' + k} right>
              ${num((de ? 'Abstand zu ' : 'Distance to ') + d.neighborDist[k].name, d.neighborDist[k].dist,
                v => patch(n => { n.neighborDist[k].dist = v; }), err[k], 0, 9999, 'nb-' + k)}
            <//>`)}
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
          ${/* Ignat, 2026-09-30: "Mark as main" in the add dialog; the first one is main anyway */ ''}
          <${FormControlLabel} sx=${{ mt: 1 }} label=${de ? 'Als Haupt markieren' : 'Mark as main'}
            control=${html`<${Checkbox} id="addXferMain" checked=${firstXfer || addMain} disabled=${firstXfer}
              onChange=${e => setAddMain(e.target.checked)} />`} />
        <//>
        <${DialogActions}>
          <${Button} onClick=${() => setAddXfer(null)}>${t('cancel')}<//>
          <${Button} variant="contained" id="addXferSave" onClick=${() => {
            if (!addXfer) { setAddXferErr(true); return; }
            patch(n => {
              const L = n.transferAnnouncements;
              const asMain = !L.length || addMain;
              const f = snd(addXfer);
              const item = { fileId: addXfer, label: f ? f.name : sndName(addXfer), isMain: asMain, scheduleSlots: null };
              if (asMain) { L.forEach(a => { a.isMain = false; }); L.push(item); }
              else {
                // a new one joins as the lowest of the scheduled ones, just above the main
                const at = L.findIndex(a => a.isMain);
                L.splice(at < 0 ? L.length : at, 0, item);
              }
            });
            setAddXfer(null);
          }}>${t('saveEntry')}<//>
        <//>
      <//>

      ${/* ── Transfer announcement schedule — a side sheet (Ignat, 2026-09-30:
            "should be a side sheet instead of popup"), the shared weekly grid inside;
            header and footer stay put, only the week scrolls ── */ ''}
      <${Drawer} anchor="right" open=${schedIdx !== null} onClose=${() => setSchedIdx(null)} id="schedSheet"
        PaperProps=${{ sx: { width: 560, maxWidth: '100vw', display: 'flex', flexDirection: 'column' } }}>
        <${Box} sx=${{ display: 'flex', alignItems: 'flex-start', gap: 1, px: 3, py: 2, borderBottom: '1px solid #E7E7E7' }}>
          <${Box} sx=${{ flex: 1, minWidth: 0 }}>
            <${Typography} variant="h6" sx=${{ fontWeight: 500 }}>${t('scheduleTitle')}<//>
            <${Typography} variant="body2" color="text.secondary" sx=${{ fontFamily: 'monospace' }}>
              ${schedIdx !== null && d.transferAnnouncements[schedIdx] ? sndName(d.transferAnnouncements[schedIdx].fileId) : ''}<//>
          <//>
          <${IconButton} aria-label=${de ? 'Schließen' : 'Close'} onClick=${() => setSchedIdx(null)}><${Icon}>close<//><//>
        <//>
        <${Box} sx=${{ flex: 1, overflowY: 'auto', px: 3, py: 2 }}>
          ${/* the date period comes first: from when to when the weekly times apply (Ignat, 2026-10-01) */ ''}
          <${Stack} spacing=${1.5} sx=${{ mb: 2.5 }} id="schedDates">
            ${schedPeriods.map((p, k) => html`
              <${Box} key=${k} className="period-row">
                <${Stack} direction="row" spacing=${1.5} alignItems="center">
                  <${MusDateField} id=${'sc-from-' + k} label=${t('dateFrom')} value=${p.from} onChange=${v => setPeriod(k, 'from', v)} />
                  <${MusDateField} id=${'sc-to-' + k} label=${t('dateTo')} value=${p.to} onChange=${v => setPeriod(k, 'to', v)} />
                  <${Box} sx=${{ whiteSpace: 'nowrap' }}>
                    <${Tooltip} title=${de ? 'Entfernen' : 'Remove'}>
                      <${IconButton} aria-label=${`sc remove date period ${k}`} onClick=${() => removePeriod(k)}><${Icon} sx=${{ fontSize: 18 }}>remove<//><//>
                    <//>
                    ${k === schedPeriods.length - 1 ? html`
                      <${Tooltip} title=${de ? 'Zeitraum hinzufügen' : 'Add period'}>
                        <${IconButton} aria-label="sc add date period" onClick=${addPeriod}><${Icon} sx=${{ fontSize: 18 }}>add<//><//>
                      <//>` : null}
                  <//>
                <//>
                ${badPeriod(p) ? html`<${Typography} variant="caption" color="error" sx=${{ display: 'block', mt: .5 }} className="sc-range-err">
                  ${de ? '„Datum bis“ liegt vor „Datum von“.' : '"Date to" is before "Date from".'}<//>` : null}
              <//>`)}
          <//>
          ${schedDays ? html`<${WeekGrid} days=${schedDays} onChange=${setSchedDays} idPrefix="sc" allowEmpty=${true}
            emptyLabel=${de ? 'Kein Zeitplan' : 'No schedule'} slotDefault=${WHOLE_DAY} />` : null}
        <//>
        <${Box} sx=${{ display: 'flex', justifyContent: 'flex-end', gap: 1, px: 3, py: 1.5, borderTop: '1px solid #E7E7E7' }}>
          <${Button} onClick=${() => setSchedIdx(null)}>${t('cancel')}<//>
          <${Button} variant="contained" id="schedSave" disabled=${schedBadRange} onClick=${() => {
            const i = schedIdx;
            patch(n => { const a = n.transferAnnouncements[i];
              a.scheduleSlots = schedDays.map(dd => ({ day: dd.day, slots: dd.slots.map(sl => ({ ...sl })) }));
              a.periods = schedPeriods.filter(p => p.from || p.to).map(p => ({ ...p })); });
            setSchedIdx(null);
          }}>${t('saveSchedule')}<//>
        <//>
      <//>
    <//>`;
}

VIEWS.stations = StationsView;
VIEWS.detail = StationDetailView;
