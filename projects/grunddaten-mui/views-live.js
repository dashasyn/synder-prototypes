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
  const ELA_POOL = [
    { kind: 'ann', de: 'U2: Kein Halt Stadtmitte aufgrund einer Störung. Weitere Informationen folgen in Kürze.',
      en: 'U2: No stop at Stadtmitte due to a disruption. Further information will follow shortly.' },
    { kind: 'ann', de: 'Die Weiterfahrt verzögert sich um einige Minuten.', en: 'Departure is delayed by a few minutes.' },
    { kind: 'ann', de: 'Der Aufzug ist außer Betrieb. Bitte nutzen Sie die Festtreppe.', en: 'The lift is out of service. Please use the stairs.' },
    { kind: 'ann', de: 'Bitte zurücktreten, der Zug fährt ein.', en: 'Please stand back, the train is arriving.' },
    { kind: 'music', name: () => radioStreams[0].name },
    { kind: 'music', name: () => playlists[0].name },
    { kind: 'music', name: () => radioStreams[2].name },
  ];

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
  const seedOne = (key, i) => {
      const n = TRACKS[key] || 2;
      const daisy = Array.from({ length: n }, (_, k) => {
        if ((i * 7 + k * 3) % 11 < 4) return null;
        if (i % 4 === 0) return DAISY_POOL[(i + 1) % DAISY_POOL.length];
        return DAISY_POOL[(i + k) % DAISY_POOL.length];
      });
      const e = i % 5;
      return { daisy, ela: e === 0 || e === 3 ? null : ELA_POOL[(i * 3) % ELA_POOL.length], changed: 0 };
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
      out[r.key] = { daisy, ela: e === 0 || e === 3 ? null : ELA_POOL[(i * 3) % ELA_POOL.length], changed: 0 };
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
        s.ela = s.ela ? null : ELA_POOL[(LIVE.tick + j) % ELA_POOL.length];
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
    pools: { DAISY_POOL, ELA_POOL },
  };
  setInterval(() => { if (LIVE.listeners.size) liveTick(); }, 10000);

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

  function LiveView() {
    const { s, set, t, lang } = useApp();
    const [, force] = useState(0);
    useEffect(() => {
      const fn = () => force(x => x + 1);
      LIVE.listeners.add(fn);
      return () => LIVE.listeners.delete(fn);
    }, []);
    ensure();

    const de = lang === 'de';
    const q = (s.liveSearch || '').toLowerCase();
    const rows = LIVE.rows
      .filter(r => !r.mapOnly && (!s.liveLine || r.line === s.liveLine)
                && (!q || r.name.toLowerCase().includes(q) || r.code.toLowerCase() === q))
      .slice().sort((a, b) => a.name.localeCompare(b.name, 'de') || a.line.localeCompare(b.line, 'de', { numeric: true }));
    const lineOptions = lineData.map(l => ({ value: l.id, label: l.id }));
    const fresh = ts => ts && Date.now() - ts < 3000;

    return html`
      <${React.Fragment}>
        <${PageHeader} dense title=${de ? 'Stationssicht' : 'Station view'}
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
            <//>`} />
        <${PageBody}>
          <${TableContainer} component=${Paper} variant="outlined" sx=${{ borderColor: '#E7E7E7' }}>
            <${Table} id="live-table">
              <${TableHead}><${TableRow}>
                <${TableCell} sx=${{ width: 260 }}>Station<//>
                ${/* Ignat, 2026-10-08: the line in its own column, after the station name */ ''}
                <${TableCell} sx=${{ width: 80 }}>${t('colLine')}<//>
                <${TableCell}>DAISY<//>
                <${TableCell} sx=${{ width: '40%' }}>ELA<//>
              <//><//>
              <${TableBody}>
                ${rows.length ? rows.map(r => {
                  const L = LIVE.state[r.key], nd = NO_DATA[r.key] || {};
                  const groups = daisyGroups(L.daisy);
                  const flash = fresh(L.changed) ? { bgcolor: 'rgba(33,150,243,0.06)', transition: 'background-color .6s' } : { transition: 'background-color .6s' };
                  return html`
                    <${TableRow} key=${r.key} data-station=${r.key} data-tracks=${L.daisy.length} sx=${{ verticalAlign: 'top', '& td': flash }}>
                      <${TableCell}>
                        <${Typography} variant="body2" sx=${{ fontWeight: 500 }} className="live-name">${r.name} (${r.code})<//>
                      <//>
                      <${TableCell} className="live-line"><${LineBadge} line=${r.line} /><//>
                      <${TableCell} className="daisy">
                        ${nd.daisy ? html`<${NoData} />` : groups.length ? html`
                          <${Stack} spacing=${1.25}>
                            ${groups.map(g => html`
                              <${Box} key=${g.tracks.join()} className="daisy-group">
                                <${Typography} variant="body2" sx=${{ fontWeight: 500 }} className="daisy-tracks">
                                  ${g.tracks.length === L.daisy.length && L.daisy.length > 1
                                    ? (de ? 'Alle Gleise' : 'All tracks')
                                    : (de ? 'Gleis ' : 'Track ') + g.tracks.join(', ')}<//>
                                <${TwoLang} de=${g.m.de} en=${g.m.en} />
                              <//>`)}
                          <//>` : html`<${Dash} />`}
                      <//>
                      <${TableCell} className="ela">
                        ${nd.ela ? html`<${NoData} />` : !L.ela ? html`<${Dash} />` : L.ela.kind === 'music' ? html`
                          <${Typography} variant="body2" className="ela-music">${de ? 'Musik' : 'Music'}: ${L.ela.name()}<//>` : html`
                          <${Box} className="ela-ann"><${TwoLang} de=${L.ela.de} en=${L.ela.en} /><//>`}
                      <//>
                    <//>`;
                }) : html`<${EmptyRow} colSpan=${4} />`}
              <//>
            <//>
          <//>
        <//>
      <//>`;
  }

  VIEWS.live = LiveView;
})();
