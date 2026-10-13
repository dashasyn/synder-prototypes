/* ════════════════════════════════════════════════════════════════════
   Netzplan — the live DAISY / ELA state on a part of the U-Bahn map.

   Ignat, 2026-10-08: "create the whole berlin metro overview … On hover of
   the station we should show same ELA and Daisy actual data … per track …
   no need to recreate it all. Just a part as an example." His answers:
   · the centre of the network, drawn like BVG's own map (easier for the
     workers); its own page, in a "Live-Daten" menu next to Stationssicht
   · the card: ELA, then Gleis 1 DAISY, Gleis 2 DAISY … (ELA is per station,
     DAISY per track)
   · an interchange is several BVG stations (one per line): one card that
     scrolls, a section per line-station
   · no buttons; opens on hover. A click opens the same content in a
     side sheet (2026-10-13, consistent with the train schedule)
   The geometry is schematic, not to scale. Live data comes from
   window.LIVE_API (views-live.js), so map and table always agree.
   ════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── Stations: position, label placement ─────────────────────────── */
  // l: label side — 'n' above, 's' below, 'e' right, 'w' left; ln: two-line label
  const ST = {
    'Hauptbahnhof':             { x: 120, y: 200, l: 'n' },
    'Bundestag':                { x: 215, y: 200, l: 's' },
    'Brandenburger Tor':        { x: 315, y: 200, l: 'n' },
    'Unter den Linden':         { x: 430, y: 200, l: 'se2' },
    'Museumsinsel':             { x: 520, y: 200, l: 'n' },
    'Rotes Rathaus':            { x: 625, y: 200, l: 'n' },
    'Alexanderplatz':           { x: 720, y: 200, l: 'se' },
    'Schillingstraße':          { x: 825, y: 200, l: 'n' },
    'Strausberger Platz':       { x: 950, y: 200, l: 's' },

    'Oranienburger Tor':        { x: 430, y: 70,  l: 'w' },
    'Friedrichstraße':          { x: 430, y: 135, l: 'w' },
    'Stadtmitte':               { x: 430, y: 300, l: 'sw' },
    'Kochstraße':               { x: 430, y: 375, l: 'e' },
    'Hallesches Tor':           { x: 430, y: 460, l: 'ne' },
    'Mehringdamm':              { x: 430, y: 560, l: 'e' },

    'Gleisdreieck':             { x: 230, y: 460, l: 'w' },
    'Mendelssohn-Bartholdy-Park': { x: 230, y: 390, l: 'w' },
    'Potsdamer Platz':          { x: 230, y: 300, l: 'w' },
    'Mohrenstraße':             { x: 330, y: 300, l: 'n' },
    'Hausvogteiplatz':          { x: 510, y: 300, l: 'n' },
    'Spittelmarkt':             { x: 600, y: 300, l: 's' },
    'Märkisches Museum':        { x: 640, y: 260, l: 'w' },
    'Klosterstraße':            { x: 680, y: 230, l: 'w' },

    'Rosenthaler Platz':        { x: 720, y: 70,  l: 'e' },
    'Weinmeisterstraße':        { x: 720, y: 135, l: 'e' },
    'Jannowitzbrücke':          { x: 720, y: 290, l: 'e' },
    'Heinrich-Heine-Straße':    { x: 720, y: 345, l: 'e' },
    'Moritzplatz':              { x: 720, y: 400, l: 'e' },
    'Kottbusser Tor':           { x: 720, y: 460, l: 'ne' },
    'Schönleinstraße':          { x: 720, y: 530, l: 'e' },
    'Hermannplatz':             { x: 720, y: 600, l: 'e' },

    'Möckernbrücke':            { x: 330, y: 460, l: 's' },
    'Prinzenstraße':            { x: 575, y: 460, l: 's' },
    'Görlitzer Bahnhof':        { x: 830, y: 460, l: 's' },
    'Schlesisches Tor':         { x: 940, y: 460, l: 'n' },
  };

  /* ── Lines: the stations in running order (a part of each line) ──── */
  const LINES = [
    { id: 'U5', stops: ['Hauptbahnhof', 'Bundestag', 'Brandenburger Tor', 'Unter den Linden', 'Museumsinsel', 'Rotes Rathaus', 'Alexanderplatz', 'Schillingstraße', 'Strausberger Platz'] },
    { id: 'U6', stops: ['Oranienburger Tor', 'Friedrichstraße', 'Unter den Linden', 'Stadtmitte', 'Kochstraße', 'Hallesches Tor', 'Mehringdamm'] },
    { id: 'U2', stops: ['Gleisdreieck', 'Mendelssohn-Bartholdy-Park', 'Potsdamer Platz', 'Mohrenstraße', 'Stadtmitte', 'Hausvogteiplatz', 'Spittelmarkt', 'Märkisches Museum', 'Klosterstraße', 'Alexanderplatz'] },
    { id: 'U8', stops: ['Rosenthaler Platz', 'Weinmeisterstraße', 'Alexanderplatz', 'Jannowitzbrücke', 'Heinrich-Heine-Straße', 'Moritzplatz', 'Kottbusser Tor', 'Schönleinstraße', 'Hermannplatz'] },
    // U1 and U3 share the track here; drawn side by side, like BVG's map
    { id: 'U1', off: -4, stops: ['Gleisdreieck', 'Möckernbrücke', 'Hallesches Tor', 'Prinzenstraße', 'Kottbusser Tor', 'Görlitzer Bahnhof', 'Schlesisches Tor'] },
    { id: 'U3', off: 4,  stops: ['Gleisdreieck', 'Möckernbrücke', 'Hallesches Tor', 'Prinzenstraße', 'Kottbusser Tor', 'Görlitzer Bahnhof', 'Schlesisches Tor'] },
  ];
  // which lines stop where — an interchange is one BVG station per line
  const LINES_AT = {};
  LINES.forEach(L => L.stops.forEach(n => { (LINES_AT[n] = LINES_AT[n] || []).push(L.id); }));
  const NAMES = Object.keys(ST);

  /* ── DAISY as the platform display shows it (Ignat, 2026-10-09: the team's
     preview) — Linie · Ziel · Abfahrt, two departures, and the message as the
     running last row. A running row can't be read at once, so the full text
     sits under the board as well. Departures are sample data. ── */
  const TERMINI = {
    U1: ['Uhlandstraße', 'Warschauer Straße'], U2: ['Ruhleben', 'Pankow'], U3: ['Krumme Lanke', 'Warschauer Straße'],
    U5: ['Hauptbahnhof', 'Hönow'], U6: ['Alt-Tegel', 'Alt-Mariendorf'], U8: ['Wittenau', 'Hermannstraße'],
  };
  const SHORT = {   // a short-turning second train, per direction (sample)
    U1: ['Wittenbergplatz', 'Kottbusser Tor'], U2: ['Theodor-Heuss-Platz', 'Senefelderplatz'], U3: ['Nollendorfplatz', 'Wittenbergplatz'],
    U5: ['Alexanderplatz', 'Kaulsdorf-Nord'], U6: ['Kurt-Schumacher-Platz', 'Tempelhof'], U8: ['Paracelsus-Bad', 'Hermannplatz'],
  };
  const MONO = '"DejaVu Sans Mono", "Roboto Mono", Menlo, Consolas, monospace';
  function DaisyBoard({ name, line, track, msg, de }) {
    const dir = track % 2;                       // odd tracks one way, even the other
    const minute = Math.floor(LIVE_API.at().getTime() / 60000);
    const seed = [...(name + track)].reduce((h, c) => h + c.charCodeAt(0), 0);
    const m1 = (seed + minute) % 5 + 1, m2 = m1 + 3 + seed % 4;
    const rows = [[line, (TERMINI[line] || ['—', '—'])[dir], m1], [line, (SHORT[line] || ['—', '—'])[dir], m2]];
    const orange = '#F5A623', red = '#E2522E';
    const run = msg ? `${msg.de}   +++   ${msg.en}` : '';
    return html`
      <${Box} className="daisy-board" sx=${{ bgcolor: '#0b0b0b', borderRadius: 1, px: 1.75, py: 1.25, mt: .75, fontFamily: MONO, color: orange, overflow: 'hidden' }}>
        <${Box} sx=${{ display: 'flex', fontSize: 14, fontWeight: 700, pb: .5, borderBottom: '1px solid #262626' }}>
          <${Box} sx=${{ width: 56 }}>Linie<//><${Box} sx=${{ flex: 1 }}>Ziel<//><${Box}>Abfahrt<//>
        <//>
        ${rows.map((r, i) => html`
          <${Box} key=${i} className="daisy-dep" sx=${{ display: 'flex', alignItems: 'baseline', fontSize: 20, lineHeight: 1.35, mt: i ? 0 : .5 }}>
            <${Box} sx=${{ width: 56, color: red, fontWeight: 700 }}>${r[0]}<//>
            <${Box} sx=${{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'clip' }}>${r[1]}<//>
            <${Box} sx=${{ fontWeight: 700 }}>${r[2]}´<//>
          <//>`)}
        ${msg ? html`
          <${Box} className="daisy-run" sx=${{ mt: .5, fontSize: 18, whiteSpace: 'nowrap', overflow: 'hidden', position: 'relative', height: 26 }}>
            <${Box} component="span" sx=${{ position: 'absolute', left: 0, whiteSpace: 'nowrap',
              animation: `daisyRun ${Math.max(10, run.length * 0.22)}s linear infinite` }}>${run}<//>
          <//>` : null}
        <${Box} sx=${{ mt: .75, fontSize: 14, color: '#9a9a9a' }}>${name} · Gleis ${track}<//>
      <//>
      ${msg ? html`<${Box} className="daisy-full" sx=${{ mt: .75 }}>
        <${Typography} variant="body2" lang="de">${msg.de}<//>
        <${Typography} variant="body2" color="text.secondary" lang="en">${msg.en}<//>
      <//>` : null}`;
  }
  if (!document.getElementById('daisy-kf')) {
    const st = document.createElement('style'); st.id = 'daisy-kf';
    st.textContent = '@keyframes daisyRun { from { transform: translateX(0); } to { transform: translateX(-100%); } } .daisy-run > span { padding-left: 100%; }';
    document.head.appendChild(st);
  }

  /* ── Trains (Ignat, 2026-10-13) ─────────────────────────────────────
     · colour only, pointing the way it travels; positions as production
       knows them: at the station, just left, between, arriving
     · hover: number, line, last/next stop with times, delay as a white
       number on the status colour; click: the whole run in a side sheet,
       planned and estimated (= planned + delay) per stop
     · blue: more than 1:00 early · green: on time · orange: up to 3 min
       late · red: more than 3 min late
     · they move with the 10-second live tick
     Whole routes, terminus to terminus (real BVG stop order); train
     numbers, delays and times are SAMPLE data. ── */
  const ROUTE = {
    U1: ['Uhlandstraße', 'Kurfürstendamm', 'Wittenbergplatz', 'Nollendorfplatz', 'Kurfürstenstraße', 'Gleisdreieck', 'Möckernbrücke',
         'Hallesches Tor', 'Prinzenstraße', 'Kottbusser Tor', 'Görlitzer Bahnhof', 'Schlesisches Tor', 'Warschauer Straße'],
    U2: ['Ruhleben', 'Olympia-Stadion', 'Neu-Westend', 'Theodor-Heuss-Platz', 'Kaiserdamm', 'Sophie-Charlotte-Platz', 'Bismarckstraße',
         'Deutsche Oper', 'Ernst-Reuter-Platz', 'Zoologischer Garten', 'Wittenbergplatz', 'Nollendorfplatz', 'Bülowstraße', 'Gleisdreieck',
         'Mendelssohn-Bartholdy-Park', 'Potsdamer Platz', 'Mohrenstraße', 'Stadtmitte', 'Hausvogteiplatz', 'Spittelmarkt',
         'Märkisches Museum', 'Klosterstraße', 'Alexanderplatz', 'Rosa-Luxemburg-Platz', 'Senefelderplatz', 'Eberswalder Straße',
         'Schönhauser Allee', 'Vinetastraße', 'Pankow'],
    U3: ['Krumme Lanke', 'Onkel Toms Hütte', 'Oskar-Helene-Heim', 'Freie Universität (Thielplatz)', 'Dahlem-Dorf', 'Podbielskiallee',
         'Breitenbachplatz', 'Rüdesheimer Platz', 'Heidelberger Platz', 'Fehrbelliner Platz', 'Hohenzollernplatz', 'Spichernstraße',
         'Augsburger Straße', 'Wittenbergplatz', 'Nollendorfplatz', 'Kurfürstenstraße', 'Gleisdreieck', 'Möckernbrücke', 'Hallesches Tor',
         'Prinzenstraße', 'Kottbusser Tor', 'Görlitzer Bahnhof', 'Schlesisches Tor', 'Warschauer Straße'],
    U5: ['Hauptbahnhof', 'Bundestag', 'Brandenburger Tor', 'Unter den Linden', 'Museumsinsel', 'Rotes Rathaus', 'Alexanderplatz',
         'Schillingstraße', 'Strausberger Platz', 'Weberwiese', 'Frankfurter Tor', 'Samariterstraße', 'Frankfurter Allee',
         'Magdalenenstraße', 'Lichtenberg', 'Friedrichsfelde', 'Tierpark', 'Biesdorf-Süd', 'Elsterwerdaer Platz', 'Wuhletal',
         'Kaulsdorf-Nord', 'Kienberg (Gärten der Welt)', 'Cottbusser Platz', 'Hellersdorf', 'Louis-Lewin-Straße', 'Hönow'],
    U6: ['Alt-Tegel', 'Borsigwerke', 'Holzhauser Straße', 'Otisstraße', 'Scharnweberstraße', 'Kurt-Schumacher-Platz',
         'Afrikanische Straße', 'Rehberge', 'Seestraße', 'Leopoldplatz', 'Wedding', 'Reinickendorfer Straße', 'Schwartzkopffstraße',
         'Naturkundemuseum', 'Oranienburger Tor', 'Friedrichstraße', 'Unter den Linden', 'Stadtmitte', 'Kochstraße', 'Hallesches Tor',
         'Mehringdamm', 'Platz der Luftbrücke', 'Paradestraße', 'Tempelhof', 'Alt-Tempelhof', 'Kaiserin-Augusta-Straße',
         'Ullsteinstraße', 'Westphalweg', 'Alt-Mariendorf'],
    U8: ['Wittenau', 'Rathaus Reinickendorf', 'Karl-Bonhoeffer-Nervenklinik', 'Lindauer Allee', 'Paracelsus-Bad', 'Residenzstraße',
         'Franz-Neumann-Platz', 'Osloer Straße', 'Pankstraße', 'Gesundbrunnen', 'Voltastraße', 'Bernauer Straße', 'Rosenthaler Platz',
         'Weinmeisterstraße', 'Alexanderplatz', 'Jannowitzbrücke', 'Heinrich-Heine-Straße', 'Moritzplatz', 'Kottbusser Tor',
         'Schönleinstraße', 'Hermannplatz', 'Boddinstraße', 'Leinestraße', 'Hermannstraße'],
  };
  const SEG = 90 * 1000;                     // planned run per stop
  const T0 = Date.UTC(2026, 9, 13, 4, 0);    // sample timetable epoch
  const BASE_DELAY = [-95, 20, 75, 150, 230, -10, 40, 300, 5, 120, -70, 190];
  const DEPOT = ['WA', 'HA', 'KO', 'PA', 'SP', 'GR'];
  const TRAINS = [];
  Object.keys(ROUTE).forEach((line, li) => {
    const n = ROUTE[line].length, cyc = 2 * (n - 1);
    for (let k = 0, off = li * 1.7; off < cyc + li * 1.7; k++, off += 5) {
      TRAINS.push({ id: `${1100 + li * 120 + k * 7}${DEPOT[(li + k) % DEPOT.length]}_K__`, line, off: off % cyc,
                    base: BASE_DELAY[(li * 5 + k) % BASE_DELAY.length], seed: li * 13 + k * 7 });
    }
  });
  const now = () => LIVE_API.at().getTime() + (window.__trainShift || 0);
  const delayOf = tr => Math.round(tr.base + 15 * Math.sin(now() / 47000 + tr.seed));
  const statusOf = d => d < -60 ? 'ahead' : d < 60 ? 'ontime' : d <= 180 ? 'late' : 'verylate';
  const STATUS_BG = { ahead: '#1565C0', ontime: '#2E7D32', late: '#E65100', verylate: '#C62828' };
  window.__trainRules = { statusOf: d => statusOf(d), fmt: d => fmtDelay(d) };   // for the checks
  const fmtDelay = d => (d < 0 ? '-' : '+') + Math.floor(Math.abs(d) / 60) + ':' + String(Math.abs(d) % 60).padStart(2, '0');
  const hhmm = t => { const d = new Date(t); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
  /** where a train is now: route index (+ phase), direction, and its trip's timetable */
  function trainState(tr) {
    const r = ROUTE[tr.line], n = r.length, cyc = 2 * (n - 1);
    const d = delayOf(tr);
    const sAbs = (now() - d * 1000 - T0) / SEG + tr.off;
    const u = ((sAbs % cyc) + cyc) % cyc;
    const fwd = u < n - 1;                     // towards the route's last stop
    const step = fwd ? u : u - (n - 1);        // stops done on this trip
    const j = Math.floor(step), f = step - j;
    const phase = f < 0.2 ? 0 : f < 0.45 ? 0.25 : f < 0.7 ? 0.5 : 0.8;   // at · just left · between · arriving
    const idx = k => fwd ? k : n - 1 - k;      // trip step → route index
    const tripStart = T0 + (sAbs - step - tr.off) * SEG;
    const stops = Array.from({ length: n }, (_, k) => ({ name: r[idx(k)], plan: tripStart + k * SEG, est: tripStart + k * SEG + d * 1000 }));
    return { delay: d, status: statusOf(d), ziel: r[fwd ? n - 1 : 0], step: j, phase, stops,
             from: r[idx(j)], to: phase ? r[idx(j + 1)] : null };
  }

  /* ── Events at stations (sample) — purple planned, cyan unplanned,
     yellow service info (Ignat, 2026-10-13) ── */
  const EV_COLOR = { planned: '#7C4DFF', unplanned: '#63A3A6', info: '#FDF5A8' };
  const EV_LABEL = { planned: ['Geplant', 'Planned'], unplanned: ['Ungeplant', 'Unplanned'], info: ['Service-Info', 'Service info'] };
  const EVENTS = {
    'Alexanderplatz':    [{ type: 'unplanned', line: 'U2', de: 'Polizeieinsatz am Bahnsteig', en: 'Police operation on the platform', when: 'seit 12:31' },
                          { type: 'info', line: 'U8', de: 'Aufzug zum Bahnsteig U8 außer Betrieb', en: 'Lift to the U8 platform out of service', when: '13.10.–17.10.' }],
    'Kottbusser Tor':    [{ type: 'planned', line: 'U1', de: 'Bauarbeiten: Gleis 2 gesperrt', en: 'Construction: track 2 closed', when: '01.10.–31.10.' }],
    'Stadtmitte':        [{ type: 'planned', line: 'U6', de: 'Nachtbauarbeiten, Ersatzverkehr mit Bussen', en: 'Night works, replacement buses', when: '22:00–04:30' }],
    'Hermannplatz':      [{ type: 'unplanned', line: 'U8', de: 'Störung der Rolltreppe', en: 'Escalator fault', when: 'seit 11:52' }],
    'Potsdamer Platz':   [{ type: 'info', line: 'U2', de: 'Veranstaltung: erhöhtes Fahrgastaufkommen', en: 'Event: high passenger volume', when: '18:00–23:00' }],
    'Mehringdamm':       [{ type: 'planned', line: 'U6', de: 'Bahnsteigsanierung', en: 'Platform renovation', when: '06.10.–24.10.' }],
  };
  const EV_RANK = { unplanned: 0, planned: 1, info: 2 };
  const topEvent = n => (EVENTS[n] || []).slice().sort((a, b) => EV_RANK[a.type] - EV_RANK[b.type])[0];
  function EventList({ name, line, de }) {
    const evs = (EVENTS[name] || []).filter(e => !line || e.line === line);
    if (!evs.length) return null;
    return html`<${Box} className="map-events" sx=${{ mt: 1 }}>
      ${evs.map((e, i) => html`<${Box} key=${i} className="map-event" data-type=${e.type}
          sx=${{ display: 'flex', gap: 1, alignItems: 'flex-start', mt: i ? .75 : 0 }}>
        <${Box} component="span" sx=${{ flexShrink: 0, px: 1, borderRadius: 1, fontSize: 14, lineHeight: '22px', fontWeight: 500,
          bgcolor: EV_COLOR[e.type], color: e.type === 'planned' ? '#fff' : '#1d1d1d' }}>${EV_LABEL[e.type][de ? 0 : 1]}<//>
        <${Box}><${Typography} variant="body2">${de ? e.de : e.en}<//>
          <${Typography} variant="body2" color="text.secondary">${e.when}<//><//>
      <//>`)}
    <//>`;
  }

  function DelayChip({ d, id }) {
    return html`<${Box} component="span" className="delay-chip" id=${id} data-status=${statusOf(d)}
      sx=${{ display: 'inline-block', px: 1, borderRadius: 1, bgcolor: STATUS_BG[statusOf(d)], color: '#fff',
             fontWeight: 700, fontSize: 14, lineHeight: '22px', fontVariantNumeric: 'tabular-nums' }}>${fmtDelay(d)}<//>`;
  }

  /** hover card for a train */
  function TrainCard({ tr, de }) {
    const s = trainState(tr);
    const k = s.step, last = s.stops[k], next = s.phase ? s.stops[k + 1] : null;
    const row = (lbl, st) => st ? html`<${Box} sx=${{ display: 'flex', gap: 1, mt: .5 }}>
      <${Typography} variant="body2" sx=${{ fontWeight: 500, width: 112, flexShrink: 0 }}>${lbl}<//>
      <${Typography} variant="body2" sx=${{ flex: 1 }}>${st.name}<//>
      <${Typography} variant="body2" sx=${{ fontVariantNumeric: 'tabular-nums' }}>${hhmm(st.plan)}<//>
      <${Typography} variant="body2" sx=${{ fontVariantNumeric: 'tabular-nums', width: 70, textAlign: 'right' }}>${hhmm(st.est)}<//>
    <//>` : null;
    return html`<${Box} className="train-card" sx=${{ py: 1.5 }}>
      <${Stack} direction="row" spacing=${1} alignItems="center">
        <${LineBadge} line=${tr.line} />
        <${Typography} variant="body1" sx=${{ fontWeight: 500, flex: 1 }} className="train-no">${tr.id}<//>
        <${DelayChip} d=${s.delay} />
      <//>
      <${Typography} variant="body2" color="text.secondary" sx=${{ mt: .5 }}>${de ? 'Richtung' : 'To'} ${s.ziel}<//>
      <${Box} sx=${{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1 }}>
        <${Typography} variant="body2" color="text.secondary">${de ? 'Plan' : 'Planned'}<//>
        <${Typography} variant="body2" color="text.secondary" sx=${{ width: 70, textAlign: 'right' }}>${de ? 'Prognose' : 'Estimated'}<//>
      <//>
      ${row(next ? (de ? 'Letzter Halt' : 'Last stop') : (de ? 'Im Bahnhof' : 'At station'), last)}
      ${row(de ? 'Nächster Halt' : 'Next stop', next || s.stops[k + 1])}
    <//>`;
  }

  /** side sheet: the whole run */
  function TrainSchedule({ tr, de }) {
    const s = trainState(tr);
    const atRow = s.phase ? null : s.step;
    const cell = { fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };
    const marker = html`<${TableRow} key="here" className="train-here"><${TableCell} colSpan=${3}
      sx=${{ py: .5, borderLeft: '4px solid', borderLeftColor: STATUS_BG[s.status], color: STATUS_BG[s.status], fontWeight: 500 }}>
      ${de ? 'Zug ist hier' : 'Train is here'}<//><//>`;
    const rows = [];
    s.stops.forEach((st, k) => {
      const past = k < s.step || (k === s.step && s.phase);
      rows.push(html`<${TableRow} key=${k} className=${'sched-stop' + (past ? ' past' : '') + (k === atRow ? ' at' : '')}
          sx=${k === atRow ? { '& td': { fontWeight: 700 }, '& td:first-of-type': { borderLeft: '4px solid', borderLeftColor: STATUS_BG[s.status] } } : null}>
        <${TableCell} sx=${{ color: past ? 'text.disabled' : 'text.primary' }}>${st.name}<//>
        <${TableCell} sx=${{ ...cell, color: past ? 'text.disabled' : 'text.primary' }}>${hhmm(st.plan)}<//>
        <${TableCell} sx=${{ ...cell, color: past ? 'text.disabled' : s.delay >= 60 ? STATUS_BG[s.status] : 'text.primary' }}>${hhmm(st.est)}<//>
      <//>`);
      if (s.phase && k === s.step) rows.push(marker);
    });
    return html`<${TableContainer} component=${Paper} variant="outlined" sx=${{ borderColor: '#E7E7E7' }}>
      <${Table} id="trainSchedule" size="small">
        <${TableHead}><${TableRow}>
          <${TableCell}>${de ? 'Halt' : 'Stop'}<//><${TableCell}>${de ? 'Plan' : 'Planned'}<//><${TableCell}>${de ? 'Prognose' : 'Estimated'}<//>
        <//><//>
        <${TableBody}>${rows}<//>
      <//>
    <//>`;
  }

  /* ── The card: ELA first, then DAISY per track ───────────────────── */
  function StationSection({ name, line, de }) {
    const v = LIVE_API.get(name, line);
    const nd = v.noData || {};
    const label = { variant: 'body2', sx: { fontWeight: 500, mt: 1 } };
    const two = m => html`<${Box}><${Typography} variant="body2" lang="de">${m.de}<//>
      <${Typography} variant="body2" color="text.secondary" lang="en">${m.en}<//><//>`;
    const none = html`<${Typography} variant="body2" color="text.secondary">–<//>`;
    const noData = html`<${Typography} variant="body2" className="no-data" sx=${{ color: 'text.disabled', fontStyle: 'italic' }}>${de ? 'keine Daten' : 'no data'}<//>`;
    return html`
      <${Box} className="map-section" data-key=${v.key} sx=${{ py: 1.5, '& + &': { borderTop: '1px solid #E7E7E7' } }}>
        <${Stack} direction="row" spacing=${1} alignItems="center">
          <${Typography} variant="body1" sx=${{ fontWeight: 500 }} className="map-title">${name} (${v.code})<//>
          <${LineBadge} line=${line} />
        <//>
        <${EventList} name=${name} line=${line} de=${de} />
        <${Typography} ...${label} className="map-label">ELA<//>
        <${Box} className="map-ela">
          ${nd.ela ? noData : !v.ela ? none : v.ela.kind === 'music'
            ? html`<${Typography} variant="body2">${de ? 'Musik' : 'Music'}: ${v.ela.name()}<//>` : two(v.ela)}
        <//>
        ${v.daisy.map((m, k) => html`
          <${Box} key=${k} className="map-track">
            <${Typography} ...${label} className="map-label">${de ? 'Gleis' : 'Track'} ${k + 1} DAISY<//>
            ${nd.daisy ? noData : html`<${DaisyBoard} name=${name} line=${line} track=${k + 1} msg=${m} de=${de} />`}
          <//>`)}
      <//>`;
  }

  // no "something is active" dot: almost every station shows some DAISY text,
  // so it marked nearly all of them and told nothing. A station that is not
  // reporting gets a grey ring instead.
  const dead = n => (LINES_AT[n] || []).some(l => { const nd = LIVE_API.get(n, l).noData || {}; return nd.ela || nd.daisy; });

  function LiveMapView() {
    const { lang } = useApp();
    const de = lang === 'de';
    const [, force] = useState(0);
    const [hover, setHover] = useState(null);   // { kind: 'st' | 'train', id, anchor }
    const [sheet, setSheet] = useState(null);   // { kind, id } — click opens a side sheet (Ignat, 2026-10-13)
    const closeT = useRef(null);
    useEffect(() => LIVE_API.subscribe(() => force(x => x + 1)), []);
    useEffect(() => {
      const esc = e => { if (e.key === 'Escape') setHover(null); };
      window.addEventListener('keydown', esc); return () => window.removeEventListener('keydown', esc);
    }, []);
    useEffect(() => {   // the schedule opens on the train's position
      if (!sheet || sheet.kind !== 'train') return;
      setTimeout(() => { const el = document.querySelector('#mapSheet .train-here, #mapSheet .sched-stop.at'); if (el) el.scrollIntoView({ block: 'center' }); }, 250);
    }, [sheet && sheet.id]);

    const open = (kind, id, el) => { clearTimeout(closeT.current); setHover({ kind, id, anchor: el }); };
    const leave = () => { clearTimeout(closeT.current); closeT.current = setTimeout(() => setHover(null), 200); };
    const stay = () => clearTimeout(closeT.current);
    const click = (kind, id) => e => { e.stopPropagation(); setHover(null); setSheet({ kind, id }); };

    const at = LIVE_API.at();
    const hhmmss = [at.getHours(), at.getMinutes(), at.getSeconds()].map(x => String(x).padStart(2, '0')).join(':');

    // one polyline per line, offset sideways where U1/U3 run together
    const path = L => L.stops.map(n => `${ST[n].x},${ST[n].y + (L.off || 0)}`).join(' ');
    const lbl = (n, p) => {
      const two = p.l.endsWith('2'), side = p.l.replace('2', '');
      const d = { n: [0, -16, 'middle'], s: [0, 26, 'middle'], e: [14, 5, 'start'], w: [-14, 5, 'end'], ne: [10, -12, 'start'], se: [14, 28, 'start'], sw: [-14, 28, 'end'] }[side];
      const words = two ? n.split(' ') : [n];
      const half = two ? [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')] : [n];
      return html`<text key=${'l' + n} data-label=${n} x=${p.x + d[0]} y=${p.y + d[1] - (two && side === 'n' ? 16 : 0)} textAnchor=${d[2]} fontSize="14"
        fontFamily="Roboto, sans-serif" fill="#1d1d1d" stroke="#fff" strokeWidth="4" strokeLinejoin="round"
        style=${{ pointerEvents: 'none', paintOrder: 'stroke' }}>
        ${half.map((h, i) => html`<tspan key=${i} x=${p.x + d[0]} dy=${i ? 16 : 0}>${h}</tspan>`)}</text>`;
    };

    // trains on the drawn part: between two drawn neighbours, on the right-hand side of travel
    const drawn = {}; LINES.forEach(L => { drawn[L.id] = L; });
    const placed = TRAINS.map(tr => {
      const s = trainState(tr), L = drawn[tr.line];
      const iA = L.stops.indexOf(s.from);
      if (iA < 0) return null;
      let a = ST[s.from], b;
      if (s.to) { const iB = L.stops.indexOf(s.to); if (iB < 0 || Math.abs(iA - iB) !== 1) return null; b = ST[s.to]; }
      else {   // at the station: point along the way it is heading
        const r = ROUTE[tr.line], ri = r.indexOf(s.from), nx = s.ziel === r[r.length - 1] ? r[ri + 1] : r[ri - 1];
        const iN = L.stops.indexOf(nx);
        b = iN >= 0 ? ST[nx] : (() => { const pv = s.ziel === r[r.length - 1] ? r[ri - 1] : r[ri + 1]; const q = ST[pv] && L.stops.includes(pv) ? ST[pv] : { x: a.x - 1, y: a.y }; return { x: 2 * a.x - q.x, y: 2 * a.y - q.y }; })();
      }
      const t = s.to ? s.phase : 0;
      const off = L.off || 0;
      const x = a.x + (b.x - a.x) * t, y = a.y + off + (b.y - a.y) * t;
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      const side = s.to ? 10 : (LINES_AT[s.from] || []).length > 1 ? 18 : 12;   // right of travel; at a station, clear of its ring
      return { tr, s, x: x - Math.sin(ang) * side, y: y + Math.cos(ang) * side, deg: ang * 180 / Math.PI };
    }).filter(Boolean);

    const hTrain = hover && hover.kind === 'train' ? TRAINS.find(t => t.id === hover.id) : null;
    const sTrain = sheet && sheet.kind === 'train' ? TRAINS.find(t => t.id === sheet.id) : null;
    const linesAt = n => (LINES_AT[n] || []).slice().sort((a, b) => a.localeCompare(b, 'de', { numeric: true }));
    const stationBody = n => linesAt(n).map(l => html`<${StationSection} key=${l} name=${n} line=${l} de=${de} />`);

    return html`
      <${React.Fragment}>
        <${PageHeader} dense title=${de ? 'Netzplan' : 'Network map'}
          titleAfter=${html`<${Typography} id="mapStand" variant="body2" color="text.secondary" sx=${{ ml: 1 }}>
            ${de ? 'Stand' : 'As of'} ${hhmmss}<//>`} />
        <${PageBody}>
          <${Paper} variant="outlined" sx=${{ borderColor: '#E7E7E7', p: 2, overflowX: 'auto' }}>
            <svg id="netzplan" viewBox="0 0 1060 650" style=${{ width: '100%', minWidth: 900, maxWidth: 1300, display: 'block', margin: '0 auto' }}>
              ${LINES.map(L => html`<polyline key=${L.id} points=${path(L)} fill="none" stroke=${lineColor[L.id]}
                strokeWidth="7" strokeLinejoin="round" strokeLinecap="round" />`)}
              ${/* line badges at the drawn ends */ ''}
              ${LINES.map(L => {
                const a = ST[L.stops[0]], z = ST[L.stops[L.stops.length - 1]];
                const tag = (p, k) => {
                  const horiz = L.stops.every(n => ST[n].y === ST[L.stops[0]].y);
                  const dx = horiz ? (k ? 72 : -40) : 0, dy = horiz ? (L.off || 0) * 5 : (k ? 34 : -34);
                  return html`<g key=${k} transform=${`translate(${p.x + dx - 16},${p.y + dy - 10})`}>
                    <rect width="32" height="20" rx="3" fill=${lineColor[L.id]} />
                    <text x="16" y="15" textAnchor="middle" fontSize="14" fontWeight="700" fontFamily="Roboto, sans-serif" fill="#fff">${L.id}</text></g>`;
                };
                // U2 is tagged below Gleisdreieck (its drawn end), U1/U3 only at the east end — the west end is crowded
                const tags = L.id === 'U2' ? [tag(a, 1)] : (L.id === 'U1' || L.id === 'U3') ? [tag(z, 1)] : [tag(a, 0), tag(z, 1)];
                return html`<g key=${'b' + L.id} className="line-tag">${tags}</g>`;
              })}
              ${NAMES.map(n => {
                const p = ST[n], many = (LINES_AT[n] || []).length > 1;
                const on = (hover && hover.kind === 'st' && hover.id === n) || (sheet && sheet.kind === 'st' && sheet.id === n);
                const ev = topEvent(n), r = many ? 12 : 7;
                return html`<g key=${n} data-st=${n} data-event=${ev ? ev.type : null} style=${{ cursor: 'pointer' }}
                  onMouseEnter=${e => open('st', n, e.currentTarget)} onMouseLeave=${leave} onClick=${click('st', n)}>
                  ${ev ? html`<circle className="ev-halo" cx=${p.x} cy=${p.y} r=${r + 6} fill=${EV_COLOR[ev.type]}
                    stroke=${ev.type === 'info' ? '#C8B400' : 'none'} strokeWidth="1" />` : null}
                  <circle cx=${p.x} cy=${p.y} r=${r} fill="#fff" stroke=${dead(n) ? '#9e9e9e' : '#1d1d1d'}
                    strokeWidth=${on ? 4 : many ? 3 : 2} />
                  <circle className="hit" cx=${p.x} cy=${p.y} r="18" fill="transparent" />
                </g>`;
              })}
              ${placed.map(({ tr, s, x, y, deg }) => html`<g key=${tr.id} className="train" data-train=${tr.id} data-status=${s.status}
                  data-phase=${s.phase} transform=${`translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${deg.toFixed(1)})`}
                  style=${{ cursor: 'pointer', transition: 'transform 1.2s ease-in-out' }}
                  onMouseEnter=${e => open('train', tr.id, e.currentTarget)} onMouseLeave=${leave} onClick=${click('train', tr.id)}>
                <path d="M -7 -5.5 H 3 L 10 0 L 3 5.5 H -7 A 2.5 2.5 0 0 1 -9.5 3 V -3 A 2.5 2.5 0 0 1 -7 -5.5 Z"
                  fill=${STATUS_BG[s.status]} stroke="#fff" strokeWidth="1.5" />
                <rect className="hit" x="-13" y="-10" width="26" height="20" fill="transparent" />
              </g>`)}
              ${/* labels last, haloed, so a train passing under a name never hides it */ ''}
              <g className="labels">${NAMES.map(n => lbl(n, ST[n]))}</g>
            </svg>
          <//>
        <//>

        <${M.Popper} open=${!!hover} anchorEl=${hover && hover.anchor} placement="right-start" style=${{ zIndex: 1200 }}
          modifiers=${[{ name: 'offset', options: { offset: [0, 12] } }, { name: 'flip', enabled: true }, { name: 'preventOverflow', options: { padding: 12 } }]}>
          <${Paper} id="mapCard" elevation=${0} onMouseEnter=${stay} onMouseLeave=${leave}
            sx=${{ border: '1px solid #E0E0E0', borderRadius: 1, boxShadow: '0 4px 16px rgba(0,0,0,.12)',
                   width: hTrain ? 380 : 460, maxHeight: '75vh', overflowY: 'auto', px: 2 }}>
            ${hTrain ? html`<${TrainCard} tr=${hTrain} de=${de} />` : hover ? stationBody(hover.id) : null}
          <//>
        <//>

        <${Drawer} anchor="right" open=${!!sheet} onClose=${() => setSheet(null)} id="mapSheet"
          PaperProps=${{ sx: { width: 520, maxWidth: '100vw', display: 'flex', flexDirection: 'column' } }}>
          <${Box} sx=${{ display: 'flex', alignItems: 'flex-start', gap: 1, px: 3, py: 2, borderBottom: '1px solid #E7E7E7' }}>
            <${Box} sx=${{ flex: 1, minWidth: 0 }}>
              ${sTrain ? html`
                <${Stack} direction="row" spacing=${1} alignItems="center">
                  <${LineBadge} line=${sTrain.line} />
                  <${Typography} variant="h6" sx=${{ fontWeight: 500 }} id="sheetTitle">${sTrain.id}<//>
                  <${DelayChip} d=${trainState(sTrain).delay} id="sheetDelay" />
                <//>
                <${Typography} variant="body2" color="text.secondary">${de ? 'Richtung' : 'To'} ${trainState(sTrain).ziel}<//>`
              : sheet ? html`<${Typography} variant="h6" sx=${{ fontWeight: 500 }} id="sheetTitle">${sheet.id}<//>` : null}
            <//>
            <${IconButton} aria-label=${de ? 'Schließen' : 'Close'} onClick=${() => setSheet(null)}><${Icon}>close<//><//>
          <//>
          <${Box} sx=${{ flex: 1, overflowY: 'auto', px: 3, py: sTrain ? 2 : 0 }}>
            ${sTrain ? html`<${TrainSchedule} tr=${sTrain} de=${de} />` : sheet ? stationBody(sheet.id) : null}
          <//>
        <//>
      <//>`;
  }

  VIEWS.liveMap = LiveMapView;
})();
