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
function StationDetailView() {
  const { s, set, nav, t, bump, toast } = useApp();
  const st = getStation(s.selectedId);
  const [draft, setDraft] = useState(() => JSON.parse(JSON.stringify(st)));
  const [addXfer, setAddXfer] = useState(null);   // pending file id, or null when closed
  const [addXferErr, setAddXferErr] = useState(false);
  const [schedIdx, setSchedIdx] = useState(null); // transfer announcement being scheduled
  const [schedDays, setSchedDays] = useState(null);

  // re-seed when the route changes to a different station
  useEffect(() => { setDraft(JSON.parse(JSON.stringify(getStation(s.selectedId)))); },
    [s.selectedId, s.selectedLine]);

  if (!st) return html`<${PageBody}><${Alert} severity="error">${s.selectedId}<//><//>`;

  const d = draft;
  const patch = fn => setDraft(prev => { const n = JSON.parse(JSON.stringify(prev)); fn(n); return n; });

  const nameFileOptions = soundFiles.filter(f => f.type === 'station-name')
    .map(f => ({ value: f.id, label: f.filename }));

  const save = () => {
    // write the draft back onto the real record, in place, like the vanilla
    st.name = (d.name || '').trim() || st.name;
    st.shortName = (d.shortName || '').trim();
    st.longName = (d.longName || '').trim();
    st.coords = { lat: d.coords && d.coords.lat !== '' ? parseFloat(d.coords.lat) : null,
                  lon: d.coords && d.coords.lon !== '' ? parseFloat(d.coords.lon) : null };
    st.nameChanges = d.nameChanges.filter(nc => nc.date || nc.fullName)
      .map(nc => ({ date: nc.date, fullName: nc.fullName, shortName: nc.shortName, fileId: nc.fileId }));
    st.stationNameFile = d.stationNameFile;
    st.tracks.forEach((tr, ti) => { tr.exits = d.tracks[ti].exits.slice(); });
    st.triggerArrival = parseInt(d.triggerArrival, 10) || 0;
    st.triggerDeparture = parseInt(d.triggerDeparture, 10) || 0;
    st.neighborDist.prev.dist = parseInt(d.neighborDist.prev.dist, 10) || 0;
    st.neighborDist.next.dist = parseInt(d.neighborDist.next.dist, 10) || 0;
    st.transferAnnouncements = d.transferAnnouncements.map(a => ({ ...a }));
    bump();
    toast(t('savedMsg'));
  };

  const openMap = () => {
    const { lat, lon } = d.coords || {};
    if (!lat || !lon) return;
    window.open(`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}&zoom=17`, '_blank');
  };

  /* schedSummary() in the vanilla returns an HTML string, so the rule is
     ported rather than called — the three states and their strings are the
     vanilla's own. */
  const schedChip = ann => ann.isMain
    ? html`<${Chip} size="small" color="success" variant="outlined" label=${t('alwaysActive')} />`
    : ann.scheduleSlots
      ? html`<${Chip} size="small" variant="outlined" label=${t('scheduleSet')} />`
      : html`<${Chip} size="small" color="warning" variant="outlined" label=${t('schedMissing')} />`;

  const setMain = i => patch(n => n.transferAnnouncements.forEach((a, j) => { a.isMain = j === i; }));

  const openSchedule = i => {
    const ann = d.transferAnnouncements[i];
    // all seven days, each with at least one period — the vanilla's own seeding
    setSchedDays(DAYS.map(day => {
      const ex = ann.scheduleSlots && ann.scheduleSlots.find(x => x.day === day);
      return { day, slots: ex ? ex.slots.map(sl => ({ ...sl })) : [{ start: '09:00', end: '23:00' }] };
    }));
    setSchedIdx(i);
  };

  const transferOptions = soundFiles.filter(f => f.type === 'transfer')
    .map(f => ({ value: f.id, label: f.filename }));

  return html`
    <${React.Fragment}>
      <${PageHeader}
        crumbs=${[{ label: t('stations'), onClick: () => nav('stations') }, { label: st.name }]}
        title=${d.name}
        titleAfter=${html`<${LineBadge} line=${s.selectedLine} />`}
        subtitle=${`${st.id} · ${t('identifier')}`}
        action=${html`<${Button} variant="contained" onClick=${save}>${t('saveBtn')}<//>`} />

      <${PageBody}>
        ${/* ── Station name ── */ ''}
        <${SectionCard} title=${t('stationName')}>
          <${Stack} direction="row" spacing=${2} flexWrap="wrap" useFlexGap>
            <${TextField} label=${t('fullName')} required value=${d.name} sx=${{ width: 280 }}
              onChange=${e => patch(n => { n.name = e.target.value; })} />
            <${TextField} label=${t('shortName')} value=${d.shortName || ''} sx=${{ width: 180 }}
              placeholder=${state.lang === 'de' ? 'z.B. Alex' : 'e.g. Alex'}
              onChange=${e => patch(n => { n.shortName = e.target.value; })} />
            <${TextField} label=${t('longName')} value=${d.longName || ''} sx=${{ width: 340 }}
              placeholder=${state.lang === 'de' ? 'z.B. Bahnhof Berlin Alexanderplatz'
                                                : 'e.g. Berlin Alexanderplatz station'}
              onChange=${e => patch(n => { n.longName = e.target.value; })} />
          <//>

          <${Typography} variant="overline" color="text.secondary" sx=${{ display: 'block', mt: 3, mb: 1 }}>
            ${t('coordinates')}<//>
          <${Stack} direction="row" spacing=${2} alignItems="center" flexWrap="wrap" useFlexGap>
            <${TextField} type="number" label=${t('coordLat')} sx=${{ width: 170 }} placeholder="52.521992"
              inputProps=${{ step: 0.000001 }} value=${d.coords ? (d.coords.lat ?? '') : ''}
              onChange=${e => patch(n => { n.coords = { ...(n.coords || {}), lat: e.target.value }; })} />
            <${TextField} type="number" label=${t('coordLon')} sx=${{ width: 170 }} placeholder="13.413244"
              inputProps=${{ step: 0.000001 }} value=${d.coords ? (d.coords.lon ?? '') : ''}
              onChange=${e => patch(n => { n.coords = { ...(n.coords || {}), lon: e.target.value }; })} />
            ${/* the prerequisite disables what depends on it — brief §3 */ ''}
            <${Button} onClick=${openMap} disabled=${!(d.coords && d.coords.lat && d.coords.lon)}
              startIcon=${html`<${Icon} sx=${{ fontSize: 18 }}>place<//>`}>${t('coordPreview')}<//>
          <//>

          <${Typography} variant="overline" color="text.secondary" sx=${{ display: 'block', mt: 3, mb: 1 }}>
            ${t('scheduledChanges')}<//>
          <${Stack} spacing=${1.5}>
            ${d.nameChanges.map((nc, i) => html`
              <${Card} key=${i} sx=${{ bgcolor: '#FAFAFA' }}>
                <${Box} sx=${{ p: 1.5 }}>
                  <${Stack} direction="row" spacing=${2} alignItems="center" flexWrap="wrap" useFlexGap>
                    <${TextField} type="date" label=${state.lang === 'de' ? 'Datum' : 'Date'}
                      InputLabelProps=${{ shrink: true }} value=${nc.date || ''} sx=${{ width: 190 }}
                      onChange=${e => patch(n => { n.nameChanges[i].date = e.target.value; })} />
                    <${TextField} label=${t('fullName')} value=${nc.fullName || ''} sx=${{ width: 240 }}
                      onChange=${e => patch(n => { n.nameChanges[i].fullName = e.target.value; })} />
                    <${TextField} label=${t('shortName')} value=${nc.shortName || ''} sx=${{ width: 170 }}
                      onChange=${e => patch(n => { n.nameChanges[i].shortName = e.target.value; })} />
                    <${FilterSelect} label=${t('stationNameFile')} value=${nc.fileId || ''}
                      options=${nameFileOptions} minWidth=${240}
                      onChange=${v => patch(n => { n.nameChanges[i].fileId = v; })} />
                    <${Box} sx=${{ flexGrow: 1 }} />
                    <${IconButton} color="error" aria-label=${`remove name change ${i}`}
                      onClick=${() => patch(n => { n.nameChanges.splice(i, 1); })}>
                      <${Icon} sx=${{ fontSize: 18 }}>close<//><//>
                  <//>
                <//>
              <//>`)}
            <${Box}>
              <${Button} startIcon=${html`<${Icon} sx=${{ fontSize: 18 }}>add<//>`}
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
                    <${Typography} variant="overline" color="text.disabled" sx=${{ display: 'block', lineHeight: 1.2 }}>
                      ${t('direction')} ${di + 1}<//>
                    ${dir.name}
                  <//>`)}
              <//><//>
              <${TableBody}>
                ${d.tracks.map((tr, ti) => html`
                  <${TableRow} key=${ti}>
                    <${TableCell} sx=${{ fontWeight: 500 }}>${state.lang === 'de' ? 'Gleis' : 'Track'} ${tr.num}<//>
                    ${d.directions.map((dir, di) => html`
                      <${TableCell} key=${di}>
                        <${FormControl} sx=${{ minWidth: 150 }}>
                          <${InputLabel}>${dir.name}<//>
                          <${Select} label=${dir.name} value=${tr.exits[di]}
                            inputProps=${{ id: `te-${ti}-${di}` }}
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
          <${FilterSelect} label=${t('stationNameFile')} value=${d.stationNameFile || ''}
            options=${nameFileOptions} minWidth=${300}
            onChange=${v => patch(n => { n.stationNameFile = v; })} />

          <${Typography} variant="overline" color="text.secondary" sx=${{ display: 'block', mt: 3, mb: 1 }}>
            ${t('transferFiles')}<//>
          ${d.transferAnnouncements.length ? html`
            <${Stack} spacing=${1} sx=${{ mb: 1.5 }}>
              ${d.transferAnnouncements.map((ann, i) => html`
                <${Stack} key=${i} direction="row" spacing=${1.5} alignItems="center" flexWrap="wrap" useFlexGap
                  sx=${{ border: '1px solid #E7E7E7', borderRadius: 1, px: 1.5, py: 1 }}>
                  ${ann.isMain ? html`<${Chip} size="small" color="primary" label=${t('mainAnn')} />` : null}
                  <${Typography} variant="body2" sx=${{ fontFamily: 'monospace' }}>${sndName(ann.fileId)}<//>
                  <${Typography} variant="body2" color="text.secondary">${ann.label || '—'}<//>
                  ${schedChip(ann)}
                  <${Box} sx=${{ flexGrow: 1 }} />
                  ${ann.isMain ? null : html`
                    <${Button} onClick=${() => setMain(i)}>${t('setAsMain')}<//>`}
                  <${Button} onClick=${() => openSchedule(i)}>${t('editSchedule')}<//>
                  <${IconButton} color="error" aria-label=${`remove transfer ${i}`}
                    onClick=${() => patch(n => { n.transferAnnouncements.splice(i, 1); })}>
                    <${Icon} sx=${{ fontSize: 18 }}>close<//><//>
                <//>`)}
            <//>` : html`
            <${Typography} variant="body2" color="text.disabled" sx=${{ fontStyle: 'italic', mb: 1.5 }}>
              ${t('noneAssigned')}<//>`}
          <${Button} startIcon=${html`<${Icon} sx=${{ fontSize: 18 }}>add<//>`}
            onClick=${() => { setAddXfer(''); setAddXferErr(false); }}>${t('addTransfer')}<//>

          <${Divider} sx=${{ my: 2.5 }} />
          <${Typography} variant="overline" color="text.secondary" sx=${{ display: 'block', mb: 1 }}>
            ${t('triggerPoints')}<//>
          <${Stack} direction="row" spacing=${2} flexWrap="wrap" useFlexGap>
            <${TextField} type="number" label=${t('departureFromPrev')} sx=${{ width: 320 }}
              inputProps=${{ min: 0, max: 999 }} value=${d.triggerDeparture}
              InputProps=${{ endAdornment: html`<${InputAdornment} position="end">m<//>` }}
              onChange=${e => patch(n => { n.triggerDeparture = e.target.value; })} />
            <${TextField} type="number" label=${t('arrivalToCurrent')} sx=${{ width: 320 }}
              inputProps=${{ min: 0, max: 999 }} value=${d.triggerArrival}
              InputProps=${{ endAdornment: html`<${InputAdornment} position="end">m<//>` }}
              onChange=${e => patch(n => { n.triggerArrival = e.target.value; })} />
          <//>
        <//>

        ${/* ── Neighbours ── */ ''}
        <${SectionCard} title=${t('neighbors')} subtitle=${t('neighborsSubtitle')}>
          <${Stack} spacing=${2}>
            ${[['prev', '←'], ['next', '→']].map(([k, arrow]) => html`
              <${Stack} key=${k} direction="row" spacing=${2} alignItems="center">
                <${Typography} sx=${{ color: 'text.disabled', width: 20 }}>${arrow}<//>
                <${Typography} variant="body2" sx=${{ width: 220 }}>${d.neighborDist[k].name}<//>
                <${TextField} type="number" label=${state.lang === 'de' ? 'Abstand' : 'Distance'}
                  sx=${{ width: 170 }} inputProps=${{ min: 0, max: 9999 }} value=${d.neighborDist[k].dist}
                  InputProps=${{ endAdornment: html`<${InputAdornment} position="end">m<//>` }}
                  onChange=${e => patch(n => { n.neighborDist[k].dist = e.target.value; })} />
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
            <${Select} label=${t('selectFile')} value=${addXfer || ''}
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
              n.transferAnnouncements.push({ fileId: addXfer, label: sndName(addXfer),
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
