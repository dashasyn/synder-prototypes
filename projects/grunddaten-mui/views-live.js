/* ════════════════════════════════════════════════════════════════════
   Stationssicht — what each station is doing right now (read-only).

   Ignat, 2026-10-07: "a place where the user can see what is actually
   happening right now on the station. What ELA is playing and what DAISY
   actually show … per station. Simple text is enough. No edit, no delete."
   His answers to the questions:
   · one simple table, one row per station; a station has 2–5 tracks and each
     track can show a different DAISY text — identical texts are listed once
   · ELA shows only what plays now; nothing playing is "–", not the last one
   · music shows as "Musik: …"
   · both languages — the user has to see the actual state
   · simulated live, with a "Stand" time; stations not reporting read
     "keine Daten"
   Ignat, 2026-10-08: "Each station is on one line … for BVG they are
   different stations with different short names" — so a row is a station
   on ONE line, with that line's own code (Alexanderplatz U2 / U5 / U8 are
   three rows). No "läuft" marker: the ELA column only ever shows what plays
   now, so the marker said nothing.

   All texts and the per-line codes here are SAMPLE data for the prototype.
   ════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── Sample content ─────────────────────────────────────────────── */
  const DAISY_POOL = [
    { de: 'U2: Kein Halt Stadtmitte aufgrund einer Störung.', en: 'U2: No stop at Stadtmitte due to a disruption.' },
    { de: 'Zug endet hier', en: 'This train terminates here' },
    { de: 'Verspätung ca. 5 Minuten', en: 'Delay approx. 5 minutes' },
    { de: 'Der Aufzug ist außer Betrieb. Bitte nutzen Sie die Festtreppe.', en: 'The lift is out of service. Please use the stairs.' },
    { de: 'Ersatzverkehr mit Bussen zwischen Gleisdreieck und Nollendorfplatz', en: 'Replacement buses between Gleisdreieck and Nollendorfplatz' },
    { de: 'Bitte zurückbleiben', en: 'Please stand back' },
    { de: 'Nicht einsteigen', en: 'Do not board' },
  ];
  /* Ignat, 2026-10-23: every ELA has a type. Events carry their real text;
     Playlist / Single track / Radio only say what is ASSIGNED (we can't know
     what is audible right now); Muted carries the reason the user had to give. */
  const ELA_POOL = [
    { type: 'unplanned', kind: 'ann', event: 'Störung U2 Stadtmitte',
      de: 'U2: Kein Halt Stadtmitte aufgrund einer Störung. Weitere Informationen folgen in Kürze.',
      en: 'U2: No stop at Stadtmitte due to a disruption. Further information will follow shortly.' },
    { type: 'playlist', kind: 'music', name: () => playlists[0].name },
    { type: 'planned', kind: 'ann', event: 'Bauarbeiten U2',
      de: 'Wegen Bauarbeiten fahren die Züge der U2 zwischen Gleisdreieck und Nollendorfplatz nur im 10-Minuten-Takt.',
      en: 'Due to construction work, U2 trains between Gleisdreieck and Nollendorfplatz run every 10 minutes only.' },
    { type: 'radio', kind: 'music', name: () => radioStreams[1].name },
    { type: 'muted', kind: 'muted', by: 'M. Krüger', reason: 'Bauarbeiten am Bahnsteig — Durchsagen stören die Arbeiten' },
    { type: 'single', kind: 'music', name: () => soundFiles.find(f => f.type === 'music').name },
    { type: 'unplanned', kind: 'ann', event: 'Aufzugsstörung',
      de: 'Der Aufzug ist außer Betrieb. Bitte nutzen Sie die Festtreppe.', en: 'The lift is out of service. Please use the stairs.' },
    { type: 'playlist', kind: 'music', name: () => playlists[3].name },
    { type: 'planned', kind: 'ann', event: 'Nachtbauarbeiten U6',
      de: 'In der Nacht fahren Ersatzbusse zwischen Stadtmitte und Kochstraße.', en: 'At night, replacement buses run between Stadtmitte and Kochstraße.' },
    { type: 'radio', kind: 'music', name: () => radioStreams[0].name },
    { type: 'muted', kind: 'muted', by: 'S. Weber', reason: 'Beschwerde der Anwohner, nachts stumm' },
  ];
  const ELA_TYPES = ['planned', 'unplanned', 'playlist', 'single', 'radio', 'muted', 'none'];
  const ELA_TYPE_LABEL = { planned: ['Geplantes Ereignis', 'Planned event'], unplanned: ['Ungeplantes Ereignis', 'Unplanned event'],
    playlist: ['Playlist', 'Playlist'], single: ['Einzeltitel', 'Single track'], radio: ['Radio', 'Radio'],
    muted: ['Stumm', 'Muted'], none: ['Keine', 'None'] };
  // Ignat, 2026-10-23: every type has its colour; the two events keep the Netzplan's
  const ELA_TYPE_CHIP = { planned: { bgcolor: '#7C4DFF', color: '#fff' }, unplanned: { bgcolor: '#63A3A6', color: '#fff' },
    playlist: { bgcolor: '#1976D2', color: '#fff' }, single: { bgcolor: '#00897B', color: '#fff' },
    radio: { bgcolor: '#EF6C00', color: '#fff' }, muted: { bgcolor: '#C62828', color: '#fff' }, none: { bgcolor: '#E0E0E0', color: '#000' } };

  /* ── One row per station AND line, each with its own short code ──── */
  // sample codes: the first line keeps the station's code in BVG style ("Al");
  // further lines get a different, unique one ("Ap", "A", …)
  const titleCase = c => c.charAt(0) + c.slice(1).toLowerCase();
  const USED_CODES = new Set();
  function buildRows() {
    const used = USED_CODES, rows = [];
    const take = c => { used.add(c); return c; };
    stations.forEach(st => st.lines.forEach((line, k) => {
      const base = titleCase(st.id);
      const letters = st.name.replace(/[^A-Za-zÄÖÜäöüß]/g, '');
      const ch = i => (letters[i] || '').toLowerCase();
      const cands = k === 0 ? [base] : [letters[0] + ch(k + 1), letters[0], letters[0] + ch(k + 2), base + (k + 1)];
      const code = take(cands.find(c => c && !used.has(c)) || base + line);
      rows.push({ key: st.id + '-' + line, name: st.name, code, line });
    }));
    return rows;
  }
  // 2 tracks is the norm; a few stations have more (sample)
  const TRACKS = { 'WA-U1': 3, 'HA-U5': 4, 'AL-U5': 3, 'ZO-U9': 4, 'WI-U2': 5 };
  // stations that do not report — "keine Daten"
  const NO_DATA = { 'BI-U2': { daisy: true }, 'TH-U12': { ela: true }, 'SE-U2': { daisy: true, ela: true } };

  /* deterministic start state, so the first screen is the same every time */
  const SEED_T0 = Date.now();
  const seedOne = (key, i) => {
      const n = TRACKS[key] || 2;
      const daisy = Array.from({ length: n }, (_, k) => {
        if ((i * 7 + k * 3) % 11 < 4) return null;
        if (i % 4 === 0) return DAISY_POOL[(i + 1) % DAISY_POOL.length];
        return DAISY_POOL[(i + k) % DAISY_POOL.length];
      });
      const e = i % 5;
      return { daisy, ela: e === 0 || e === 3 ? null : ELA_POOL[(i * 3) % ELA_POOL.length], changed: 0, since: SEED_T0 - ((i * 37) % 4000) * 60000 };
  };
  const seedState = rows => {
    const out = {};
    rows.forEach((r, i) => {
      const n = TRACKS[r.key] || 2;
      const daisy = Array.from({ length: n }, (_, k) => {
        if ((i * 7 + k * 3) % 11 < 4) return null;                      // most tracks show no message
        if (i % 4 === 0) return DAISY_POOL[(i + 1) % DAISY_POOL.length]; // whole station, same text
        return DAISY_POOL[(i + k) % DAISY_POOL.length];
      });
      const e = i % 5;
      out[r.key] = { daisy, ela: e === 0 ? null : ELA_POOL[(i * 3) % ELA_POOL.length], changed: 0, since: SEED_T0 - ((i * 37) % 4000) * 60000 };
    });
    return out;
  };

  const LIVE = { rows: null, state: null, tick: 0, at: new Date(), listeners: new Set() };
  const ensure = () => { if (!LIVE.rows) { LIVE.rows = buildRows(); LIVE.state = seedState(LIVE.rows); } };
  const notify = () => LIVE.listeners.forEach(fn => fn());

  /** One "something happened" step: three stations change, round-robin. */
  function liveTick() {
    ensure();
    const keys = LIVE.rows.map(r => r.key);
    LIVE.tick++;
    for (let j = 0; j < 3; j++) {
      const s = LIVE.state[keys[(LIVE.tick * 3 + j * 7) % keys.length]];
      if ((LIVE.tick + j) % 2) {
        s.ela = s.ela ? null : ELA_POOL[(LIVE.tick + j) % ELA_POOL.length]; s.since = Date.now();
      } else {
        const k = (LIVE.tick + j) % s.daisy.length;
        s.daisy = s.daisy.slice();
        s.daisy[k] = s.daisy[k] ? null : DAISY_POOL[(LIVE.tick + j) % DAISY_POOL.length];
      }
      s.changed = Date.now();
    }
    LIVE.at = new Date();
    notify();
    setTimeout(notify, 3100);   // let the highlight of the changed rows fade
  }
  window.__liveTick = liveTick;   // the checks drive it instead of waiting 10 s

  /* The Netzplan (views-live-map.js) reads the same live state. A map station
     outside the Grunddaten sample gets its own seeded state and a sample code,
     keyed by name + line, and from then on ticks along with the rest. */
  const hash = str => [...str].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  window.LIVE_API = {
    get(name, line) {
      ensure();
      const row = LIVE.rows.find(r => r.name === name && r.line === line);
      if (row) return { key: row.key, code: row.code, ...LIVE.state[row.key], noData: NO_DATA[row.key] || {} };
      const key = 'MAP-' + name + '-' + line;
      if (!LIVE.state[key]) {
        const letters = name.replace(/[^A-Za-zÄÖÜäöüß]/g, '');
        const cands = [letters[0] + (letters[1] || '').toLowerCase(), letters[0] + (letters[2] || '').toLowerCase(),
                       letters[0] + (letters[3] || '').toLowerCase(), letters[0] + (letters[4] || '').toLowerCase()];
        const code = cands.find(c => !USED_CODES.has(c)) || letters.slice(0, 3);
        USED_CODES.add(code);
        LIVE.state[key] = { ...seedOne(key, hash(key) % 97), code };
        LIVE.rows.push({ key, name, code, line, mapOnly: true });
      }
      return { key, code: LIVE.state[key].code, ...LIVE.state[key], noData: NO_DATA[key] || {} };
    },
    at: () => LIVE.at,
    subscribe(fn) { LIVE.listeners.add(fn); return () => LIVE.listeners.delete(fn); },
    pools: { DAISY_POOL, ELA_POOL }, ELA_TYPE_LABEL,
  };
  setInterval(() => { if (LIVE.listeners.size) liveTick(); }, 10000);

  const p2 = x => String(x).padStart(2, '0');
  const dateTime = ts => { const d = new Date(ts); return `${p2(d.getDate())}.${p2(d.getMonth() + 1)}.${d.getFullYear()} ${p2(d.getHours())}:${p2(d.getMinutes())}`; };
  const hhmmss = d => [d.getHours(), d.getMinutes(), d.getSeconds()].map(x => String(x).padStart(2, '0')).join(':');

  /* identical texts once: "Gleis 1, 2" … ; every track the same → "Alle Gleise" */
  function daisyGroups(daisy) {
    const groups = [];
    daisy.forEach((m, k) => {
      if (!m) return;
      const g = groups.find(x => x.m.de === m.de);
      if (g) g.tracks.push(k + 1); else groups.push({ m, tracks: [k + 1] });
    });
    return groups;
  }

  const Dash = () => html`<${Typography} variant="body2" color="text.secondary">–<//>`;
  const NoData = () => html`<${Typography} variant="body2" className="no-data" sx=${{ color: 'text.disabled', fontStyle: 'italic' }}>
    ${state.lang === 'de' ? 'keine Daten' : 'no data'}<//>`;
  const TwoLang = ({ de, en }) => html`
    <${Box}>
      <${Typography} variant="body2" lang="de">${de}<//>
      <${Typography} variant="body2" color="text.secondary" lang="en">${en}<//>
    <//>`;

  /* ELA live (Ignat, 2026-10-23): moved from Live-Daten to the Messages view.
     ELA only — no DAISY — one row per station (there is no ELA per track),
     Station · Linie · Typ · Inhalt · Seit, filtered by type. */
  const elaType = (L, nd) => nd.ela ? null : L.ela ? L.ela.type : 'none';
  function LiveView() {
    const { s, set, t, lang } = useApp();
    const [, force] = useState(0);
    useEffect(() => {
      const fn = () => force(x => x + 1);
      LIVE.listeners.add(fn);
      return () => LIVE.listeners.delete(fn);
    }, []);
    ensure();

    const de = lang === 'de', L_ = k => ELA_TYPE_LABEL[k][de ? 0 : 1];
    const q = (s.liveSearch || '').toLowerCase();
    const types = s.liveTypes || [];
    const base = LIVE.rows
      .filter(r => !r.mapOnly && (!s.liveLine || r.line === s.liveLine)
                && (!q || r.name.toLowerCase().includes(q) || r.code.toLowerCase() === q));
    const typeOf = r => elaType(LIVE.state[r.key], NO_DATA[r.key] || {});
    const count = k => base.filter(r => typeOf(r) === k).length;
    const rows = base.filter(r => !types.length || types.includes(typeOf(r)))
      .slice().sort((a, b) => a.name.localeCompare(b.name, 'de') || a.line.localeCompare(b.line, 'de', { numeric: true }));
    const lineOptions = lineData.map(l => ({ value: l.id, label: l.id }));
    const fresh = ts => ts && Date.now() - ts < 3000;

    const content = (L, ty) => {
      const e = L.ela;
      if (ty === 'none') return html`<${Dash} />`;
      if (e.kind === 'ann') return html`
        <${Box} className="ela-ann">
          <${TwoLang} de=${e.de} en=${e.en} />
        <//>`;
      if (e.kind === 'muted') return html`
        <${Box} className="ela-muted">
          <${Typography} variant="body2">${e.reason}<//>
          <${Typography} variant="body2" color="text.secondary">${de ? 'Stummgeschaltet von' : 'Muted by'} ${e.by}<//>
        <//>`;
      return html`<${Typography} variant="body2" className="ela-music">${de ? 'Zugewiesen' : 'Assigned'}: ${e.name()}<//>`;
    };

    return html`
      <${React.Fragment}>
        <${PageHeader} dense title="ELA live"
          titleAfter=${html`<${Typography} id="liveStand" variant="body2" color="text.secondary" sx=${{ ml: 1 }}>
            ${de ? 'Stand' : 'As of'} ${hhmmss(LIVE.at)}<//>`}
          action=${html`
            <${Stack} direction="row" spacing=${2} alignItems="center">
              <${TextField} id="liveSearch" label=${t('searchPlaceholder')} value=${s.liveSearch || ''} sx=${{ width: 280 }}
                onChange=${e => set({ liveSearch: e.target.value })}
                InputProps=${{ endAdornment: s.liveSearch ? html`
                  <${InputAdornment} position="end">
                    <${IconButton} aria-label="clear search" onClick=${() => set({ liveSearch: '' })}>
                      <${Icon} sx=${{ fontSize: 18 }}>close<//><//>
                  <//>` : null }} />
              <${FilterSelect} id="live-line-filter" label=${t('colLine')} value=${s.liveLine || ''}
                onChange=${v => set({ liveLine: v })} options=${lineOptions} minWidth=${160} />
              <${FormControl} sx=${{ minWidth: 240 }} id="live-type-filter">
                <${InputLabel} id="live-type-filter-label">${de ? 'Typ' : 'Type'}<//>
                <${Select} multiple labelId="live-type-filter-label" label=${de ? 'Typ' : 'Type'} value=${types}
                  onChange=${e => set({ liveTypes: e.target.value })}
                  renderValue=${v => v.map(L_).join(', ')}
                  endAdornment=${types.length ? html`
                    <${InputAdornment} position="end" sx=${{ mr: 3 }}>
                      <${IconButton} aria-label=${'Clear ' + (de ? 'Typ' : 'Type')} onClick=${() => set({ liveTypes: [] })}>
                        <${Icon} sx=${{ fontSize: 18 }}>close<//><//>
                    <//>` : null}>
                  ${ELA_TYPES.map(k => html`<${MenuItem} key=${k} value=${k} data-type=${k}>
                    <${Checkbox} checked=${types.includes(k)} sx=${{ p: .5, mr: 1 }} />
                    <${ListItemText} primary=${L_(k) + ' (' + count(k) + ')'} /><//>`)}
                <//>
              <//>
            <//>`} />
        <${PageBody}>
          <${TableContainer} component=${Paper} variant="outlined" sx=${{ borderColor: '#E7E7E7' }}>
            <${Table} id="live-table">
              <${TableHead}><${TableRow}>
                <${TableCell} sx=${{ width: 260 }}>Station<//>
                <${TableCell} sx=${{ width: 80 }}>${t('colLine')}<//>
                <${TableCell} sx=${{ width: 200 }}>${de ? 'Typ' : 'Type'}<//>
                <${TableCell}>${de ? 'Inhalt' : 'Content'}<//>
                <${TableCell} sx=${{ width: 160 }}>${de ? 'Seit' : 'Since'}<//>
                <${TableCell} sx=${{ width: 170 }} />
              <//><//>
              <${TableBody}>
                ${rows.length ? rows.map(r => {
                  const L = LIVE.state[r.key], nd = NO_DATA[r.key] || {}, ty = elaType(L, nd);
                  const flash = fresh(L.changed) ? { bgcolor: 'rgba(33,150,243,0.06)', transition: 'background-color .6s' } : { transition: 'background-color .6s' };
                  return html`
                    <${TableRow} key=${r.key} data-station=${r.key} data-type=${ty || 'nodata'} sx=${{ verticalAlign: 'top', '& td': flash }}>
                      <${TableCell}>
                        <${Typography} variant="body2" sx=${{ fontWeight: 500 }} className="live-name">${r.name} (${r.code})<//>
                      <//>
                      <${TableCell} className="live-line"><${LineBadge} line=${r.line} /><//>
                      <${TableCell} className="ela-type">
                        ${ty ? html`<${Chip} label=${L_(ty)} sx=${{ fontSize: 14, '& .MuiChip-label': { fontSize: 14 }, ...(ELA_TYPE_CHIP[ty] || {}) }} />` : html`<${Dash} />`}
                      <//>
                      <${TableCell} className="ela">${ty ? content(L, ty) : html`<${NoData} />`}<//>
                      <${TableCell} className="ela-since">
                        ${ty && ty !== 'none' ? html`<${Typography} variant="body2" sx=${{ whiteSpace: 'nowrap' }}>${dateTime(L.since)}<//>` : html`<${Dash} />`}
                      <//>
                      <${TableCell} align="right" className="ela-actions">
                        ${ty === 'planned' || ty === 'unplanned' ? html`<${Button} variant="outlined" className="ela-view-event"
                          aria-label=${(de ? 'Ereignis ansehen: ' : 'View event: ') + L.ela.event} sx=${{ whiteSpace: 'nowrap' }}
                          onClick=${() => {}}>${de ? 'Ereignis ansehen' : 'View event'}<//>` : null}
                      <//>
                    <//>`;
                }) : html`<${EmptyRow} colSpan=${6} />`}
              <//>
            <//>
          <//>
        <//>
      <//>`;
  }

  VIEWS.live = LiveView;
})();
