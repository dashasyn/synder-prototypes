/* ════════════════════════════════════════════════════════════════════
   PIMS Grunddaten — extra stations, port-only.

   Ignat, 2026-09-23: "add more stations to the station list, so it will
   look realistic." The vanilla ships 12 stations, which makes the event
   editor's line-grouped picker look like a stub.

   This file exists instead of editing data.js because data.js is GENERATED
   by scripts/gd-extract-shared.cjs straight out of the vanilla and is
   re-runnable to resync — anything written into it is lost on the next
   extract. The vanilla itself is never modified. So the port appends here,
   after data.js has loaded, and the extractor keeps working.

   These 18 are real BVG U-Bahn stations on the lines the prototype already
   carries, with the same field shape as the extracted ones: interchanges
   list several lines, so the picker still exercises the multi-line case.
   Coordinates are the real ones; tracks, trigger points and neighbour
   distances are plausible prototype values, like the vanilla's own.
   ════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const st = (id, name, longName, lat, lon, lines, dirs, prev, next, extra) =>
    Object.assign({
      id, name, shortName: name, longName,
      coords: { lat, lon },
      lines,
      nameChanges: [],
      directions: dirs.map(name => ({ name })),
      tracks: [{ num: '1', exits: ['right', 'left'] }, { num: '2', exits: ['left', 'right'] }],
      stationNameFile: '',
      transferAnnouncements: [],
      triggerArrival: 100,
      triggerDeparture: 80,
      neighborDist: { prev, next },
    }, extra || {});

  const EXTRA = [
    // ── U1 / U3 — the Kreuzberg and Schöneberg branch
    st('HT', 'Hallesches Tor', 'U-Bahnhof Hallesches Tor', 52.497778, 13.391389,
       ['U1', 'U3', 'U6'], ['Richtung Warschauer Straße', 'Richtung Uhlandstraße'],
       { name: 'Möckernbrücke', dist: 690 }, { name: 'Prinzenstraße', dist: 520 }),
    st('GN', 'Görlitzer Bahnhof', 'U-Bahnhof Görlitzer Bahnhof', 52.499167, 13.428611,
       ['U1'], ['Richtung Warschauer Straße', 'Richtung Uhlandstraße'],
       { name: 'Kottbusser Tor', dist: 640 }, { name: 'Schlesisches Tor', dist: 560 }),
    st('KT', 'Kottbusser Tor', 'U-Bahnhof Kottbusser Tor', 52.499167, 13.417778,
       ['U1', 'U8'], ['Richtung Warschauer Straße', 'Richtung Uhlandstraße'],
       { name: 'Prinzenstraße', dist: 570 }, { name: 'Görlitzer Bahnhof', dist: 640 }),
    st('MB', 'Möckernbrücke', 'U-Bahnhof Möckernbrücke', 52.498611, 13.383333,
       ['U1', 'U3', 'U7'], ['Richtung Warschauer Straße', 'Richtung Uhlandstraße'],
       { name: 'Gleisdreieck', dist: 610 }, { name: 'Hallesches Tor', dist: 690 }),
    st('GD', 'Gleisdreieck', 'U-Bahnhof Gleisdreieck', 52.499167, 13.374444,
       ['U1', 'U2', 'U3'], ['Richtung Warschauer Straße', 'Richtung Uhlandstraße'],
       { name: 'Kurfürstenstraße', dist: 700 }, { name: 'Möckernbrücke', dist: 610 }),
    st('UH', 'Uhlandstraße', 'U-Bahnhof Uhlandstraße', 52.503056, 13.325833,
       ['U1'], ['Richtung Warschauer Straße', 'Endstation'],
       { name: 'Kurfürstendamm', dist: 480 }, { name: '—', dist: 0 }),

    // ── U2 — Pankow to Ruhleben
    st('SE', 'Senefelderplatz', 'U-Bahnhof Senefelderplatz', 52.532222, 13.413056,
       ['U2'], ['Richtung Pankow', 'Richtung Ruhleben'],
       { name: 'Rosa-Luxemburg-Platz', dist: 620 }, { name: 'Eberswalder Straße', dist: 780 }),
    st('EB', 'Eberswalder Straße', 'U-Bahnhof Eberswalder Straße', 52.541389, 13.412222,
       ['U2'], ['Richtung Pankow', 'Richtung Ruhleben'],
       { name: 'Senefelderplatz', dist: 780 }, { name: 'Schönhauser Allee', dist: 690 }),
    st('SA', 'Schönhauser Allee', 'U-Bahnhof Schönhauser Allee', 52.549167, 13.412778,
       ['U2'], ['Richtung Pankow', 'Richtung Ruhleben'],
       { name: 'Eberswalder Straße', dist: 690 }, { name: 'Vinetastraße', dist: 830 }),
    st('ST', 'Stadtmitte', 'U-Bahnhof Stadtmitte', 52.511944, 13.389722,
       ['U2', 'U6'], ['Richtung Pankow', 'Richtung Ruhleben'],
       { name: 'Hausvogteiplatz', dist: 450 }, { name: 'Mohrenstraße', dist: 380 }),
    st('BI', 'Bismarckstraße', 'U-Bahnhof Bismarckstraße', 52.512222, 13.306944,
       ['U2', 'U7'], ['Richtung Pankow', 'Richtung Ruhleben'],
       { name: 'Deutsche Oper', dist: 640 }, { name: 'Sophie-Charlotte-Platz', dist: 720 }),

    // ── U6 / U8 — the north–south pair
    st('MO', 'Mohrenstraße', 'U-Bahnhof Mohrenstraße', 52.511667, 13.385278,
       ['U2'], ['Richtung Pankow', 'Richtung Ruhleben'],
       { name: 'Stadtmitte', dist: 380 }, { name: 'Potsdamer Platz', dist: 660 }),
    st('KO', 'Kochstraße', 'U-Bahnhof Kochstraße / Checkpoint Charlie', 52.506389, 13.390833,
       ['U6'], ['Richtung Alt-Tegel', 'Richtung Alt-Mariendorf'],
       { name: 'Stadtmitte', dist: 620 }, { name: 'Hallesches Tor', dist: 700 }),
    st('WE', 'Weinmeisterstraße', 'U-Bahnhof Weinmeisterstraße', 52.525556, 13.4025,
       ['U8'], ['Richtung Wittenau', 'Richtung Hermannstraße'],
       { name: 'Rosenthaler Platz', dist: 560 }, { name: 'Alexanderplatz', dist: 730 }),
    st('RO', 'Rosenthaler Platz', 'U-Bahnhof Rosenthaler Platz', 52.529722, 13.401389,
       ['U8'], ['Richtung Wittenau', 'Richtung Hermannstraße'],
       { name: 'Bernauer Straße', dist: 640 }, { name: 'Weinmeisterstraße', dist: 560 }),
    st('HE', 'Hermannplatz', 'U-Bahnhof Hermannplatz', 52.486944, 13.424722,
       ['U7', 'U8'], ['Richtung Wittenau', 'Richtung Hermannstraße'],
       { name: 'Schönleinstraße', dist: 810 }, { name: 'Boddinstraße', dist: 620 }),

    // ── U9 and the U12 prototype line
    st('BE', 'Berliner Straße', 'U-Bahnhof Berliner Straße', 52.482222, 13.334444,
       ['U7', 'U9'], ['Richtung Osloer Straße', 'Richtung Rathaus Steglitz'],
       { name: 'Bundesplatz', dist: 730 }, { name: 'Friedrich-Wilhelm-Platz', dist: 690 }),
    st('TH', 'Theodor-Heuss-Platz', 'U-Bahnhof Theodor-Heuss-Platz', 52.512222, 13.281944,
       ['U12'], ['Richtung Ruhleben', 'Richtung Uhlandstraße'],
       { name: 'Neu-Westend', dist: 820 }, { name: 'Kaiserdamm', dist: 480 }),
  ];

  // Append, never replace: data.js owns the extracted twelve.
  const have = new Set(stations.map(s => s.id));
  for (const s of EXTRA) if (!have.has(s.id)) stations.push(s);
})();
