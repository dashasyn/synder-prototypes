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
   · no buttons; opens on hover (a click pins it, Escape / click outside
     closes it)
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
    const [hover, setHover] = useState(null);   // { name, anchor }
    const [pinned, setPinned] = useState(false);
    const closeT = useRef(null);
    useEffect(() => LIVE_API.subscribe(() => force(x => x + 1)), []);
    useEffect(() => {
      const esc = e => { if (e.key === 'Escape') { setPinned(false); setHover(null); } };
      window.addEventListener('keydown', esc); return () => window.removeEventListener('keydown', esc);
    }, []);

    const open = (name, el) => { clearTimeout(closeT.current); if (!pinned || (hover && hover.name === name)) setHover({ name, anchor: el }); };
    const leave = () => { if (pinned) return; clearTimeout(closeT.current); closeT.current = setTimeout(() => setHover(null), 200); };
    const stay = () => clearTimeout(closeT.current);
    const pin = (name, el) => { setHover({ name, anchor: el }); setPinned(true); };

    const at = LIVE_API.at();
    const hhmmss = [at.getHours(), at.getMinutes(), at.getSeconds()].map(x => String(x).padStart(2, '0')).join(':');

    // one polyline per line, offset sideways where U1/U3 run together
    const path = L => L.stops.map(n => `${ST[n].x},${ST[n].y + (L.off || 0)}`).join(' ');
    const lbl = (n, p) => {
      const two = p.l.endsWith('2'), side = p.l.replace('2', '');
      const d = { n: [0, -16, 'middle'], s: [0, 26, 'middle'], e: [14, 5, 'start'], w: [-14, 5, 'end'], ne: [10, -12, 'start'], se: [14, 28, 'start'], sw: [-14, 28, 'end'] }[side];
      const words = two ? n.split(' ') : [n];
      const half = two ? [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')] : [n];
      return html`<text x=${p.x + d[0]} y=${p.y + d[1] - (two && side === 'n' ? 16 : 0)} textAnchor=${d[2]} fontSize="14"
        fontFamily="Roboto, sans-serif" fill="#1d1d1d" style=${{ pointerEvents: 'none' }}>
        ${half.map((h, i) => html`<tspan key=${i} x=${p.x + d[0]} dy=${i ? 16 : 0}>${h}</tspan>`)}</text>`;
    };

    return html`
      <${React.Fragment}>
        <${PageHeader} dense title=${de ? 'Netzplan' : 'Network map'}
          titleAfter=${html`<${Typography} id="mapStand" variant="body2" color="text.secondary" sx=${{ ml: 1 }}>
            ${de ? 'Stand' : 'As of'} ${hhmmss}<//>`} />
        <${PageBody}>
          <${Paper} variant="outlined" sx=${{ borderColor: '#E7E7E7', p: 2, overflowX: 'auto' }}
            onClick=${e => { if (!e.target.closest('[data-st]')) { setPinned(false); setHover(null); } }}>
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
                const on = hover && hover.name === n;
                return html`<g key=${n} data-st=${n} style=${{ cursor: 'pointer' }}
                  onMouseEnter=${e => open(n, e.currentTarget)} onMouseLeave=${leave}
                  onClick=${e => { e.stopPropagation(); pin(n, e.currentTarget); }}>
                  <circle cx=${p.x} cy=${p.y} r=${many ? 12 : 7} fill="#fff" stroke=${dead(n) ? '#9e9e9e' : '#1d1d1d'}
                    strokeWidth=${on ? 4 : many ? 3 : 2} />
                  <circle className="hit" cx=${p.x} cy=${p.y} r="18" fill="transparent" />
                  ${lbl(n, p)}
                </g>`;
              })}
            </svg>
          <//>
        <//>

        <${M.Popper} open=${!!hover} anchorEl=${hover && hover.anchor} placement="right-start" style=${{ zIndex: 1200 }}
          modifiers=${[{ name: 'offset', options: { offset: [0, 12] } }, { name: 'flip', enabled: true }, { name: 'preventOverflow', options: { padding: 12 } }]}>
          <${Paper} id="mapCard" elevation=${0} onMouseEnter=${stay} onMouseLeave=${leave} onClick=${e => e.stopPropagation()}
            sx=${{ border: '1px solid #E0E0E0', borderRadius: 1, boxShadow: '0 4px 16px rgba(0,0,0,.12)',
                   width: 460, maxHeight: '75vh', overflowY: 'auto', px: 2 }}>
            ${hover ? (LINES_AT[hover.name] || []).slice().sort((a, b) => a.localeCompare(b, 'de', { numeric: true })).map(l => html`<${StationSection} key=${l} name=${hover.name} line=${l} de=${de} />`) : null}
          <//>
        <//>
      <//>`;
  }

  VIEWS.liveMap = LiveMapView;
})();
