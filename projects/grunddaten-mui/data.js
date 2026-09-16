/* ══════════════════════════════════════════════════════════════════
   GENERATED — do not edit. Run: node scripts/gd-extract-shared.cjs

   Extracted from projects/grunddaten-editor/index.html so the React/MUI port
   and the vanilla prototype share one source of truth for the domain model.
   Re-run to resync; the vanilla file is never modified.

   22 domain constants · 51 pure functions
   Depends on i18n.js for t() and state.lang — load it first.
   ══════════════════════════════════════════════════════════════════ */

var lineColor = {
  'U1':'#6EB53B', 'U2':'#D4262A', 'U3':'#007A3D',
  'U4':'#F7D100', 'U5':'#6E3008', 'U6':'#8B0057',
  'U7':'#1265A8', 'U8':'#224F9F', 'U9':'#FA911C',
  'U12':'#E3000F',
};

var soundFiles = [
  { id:'SND-001', name:'Alexanderplatz',       filename:'alexanderplatz.mp3',      type:'station-name', lang:'de', size:'52 KB', uploaded:'02.11.2025' },
  { id:'SND-002', name:'Hauptbahnhof',         filename:'hauptbahnhof.mp3',        type:'station-name', lang:'de', size:'61 KB', uploaded:'02.11.2025' },
  { id:'SND-003', name:'Potsdamer Platz',      filename:'potsdamer_platz.mp3',     type:'station-name', lang:'de', size:'58 KB', uploaded:'02.11.2025' },
  { id:'SND-004', name:'Brandenburger Tor',    filename:'brandenburger_tor.mp3',   type:'station-name', lang:'de', size:'72 KB', uploaded:'02.11.2025' },
  { id:'SND-005', name:'Friedrichstraße',      filename:'friedrichstrasse.mp3',    type:'station-name', lang:'de', size:'68 KB', uploaded:'02.11.2025' },
  { id:'SND-006', name:'Zoologischer Garten',  filename:'zoologischer_garten.mp3', type:'station-name', lang:'de', size:'74 KB', uploaded:'02.11.2025' },
  { id:'SND-007', name:'Nollendorfplatz',      filename:'nollendorfplatz.mp3',     type:'station-name', lang:'de', size:'55 KB', uploaded:'10.11.2025' },
  { id:'SND-010', name:'Umstieg U2/U5/U8',     filename:'umstieg_u2_u5_u8.mp3',    type:'transfer',     lang:'de', size:'89 KB', uploaded:'15.11.2025' },
  { id:'SND-011', name:'Umstieg U1/U3',        filename:'umstieg_u1_u3.mp3',       type:'transfer',     lang:'de', size:'72 KB', uploaded:'15.11.2025' },
  { id:'SND-012', name:'Umstieg S-Bahn',       filename:'umstieg_sbahn.mp3',       type:'transfer',     lang:'de', size:'68 KB', uploaded:'15.11.2025' },
  { id:'SND-013', name:'Umstieg Regional',     filename:'umstieg_regional.mp3',    type:'transfer',     lang:'de', size:'81 KB', uploaded:'20.11.2025' },
  { id:'SND-030', name:'Sommerfest 2026',      filename:'event_sommerfest.mp3',    type:'event',        lang:'de', size:'112 KB', uploaded:'01.07.2026' },
  { id:'SND-031', name:'Silvester Nacht',      filename:'event_silvester.mp3',     type:'event',        lang:'de', size:'98 KB',  uploaded:'12.12.2025' },
  { id:'SND-040', name:'Vivaldi — Frühling',              filename:'vivaldi_fruehling.mp3',   type:'music', lang:'—', size:'4.8 MB', uploaded:'03.08.2026', duration:'3:22' },
  { id:'SND-041', name:'Bach — Air',                      filename:'bach_air.mp3',            type:'music', lang:'—', size:'6.7 MB', uploaded:'03.08.2026', duration:'4:48' },
  { id:'SND-042', name:'Debussy — Clair de Lune',         filename:'debussy_clair.mp3',       type:'music', lang:'—', size:'7.1 MB', uploaded:'03.08.2026', duration:'5:02' },
  { id:'SND-043', name:'Satie — Gymnopédie Nr. 1',        filename:'satie_gymnopedie.mp3',    type:'music', lang:'—', size:'5.0 MB', uploaded:'03.08.2026', duration:'3:35' },
  { id:'SND-044', name:'Grieg — Morgenstimmung',          filename:'grieg_morgen.mp3',        type:'music', lang:'—', size:'5.7 MB', uploaded:'03.08.2026', duration:'4:05' },
  { id:'SND-045', name:'Stille Nacht (Instrumental)',     filename:'stille_nacht.mp3',        type:'music', lang:'—', size:'4.1 MB', uploaded:'12.08.2026', duration:'2:58' },
  { id:'SND-046', name:'Jingle Bells (Big Band)',         filename:'jingle_bells.mp3',        type:'music', lang:'—', size:'3.8 MB', uploaded:'12.08.2026', duration:'2:41' },
  { id:'SND-047', name:'O Tannenbaum (Streichquartett)',  filename:'o_tannenbaum.mp3',        type:'music', lang:'—', size:'4.4 MB', uploaded:'12.08.2026', duration:'3:12' },
  { id:'SND-048', name:'Madonna — Like a Prayer',         filename:'madonna_prayer.mp3',      type:'music', lang:'—', size:'7.9 MB', uploaded:'20.08.2026', duration:'5:39' },
  { id:'SND-049', name:'Madonna — Vogue',                 filename:'madonna_vogue.mp3',       type:'music', lang:'—', size:'6.8 MB', uploaded:'20.08.2026', duration:'4:52' },
];

var playlists = [
  { id:'PL-001', name:'Klassik Vormittag',  mode:'order',   trackIds:['SND-040','SND-041','SND-042','SND-043','SND-044'] },
  { id:'PL-002', name:'Weihnachten 2026',   mode:'order',   trackIds:['SND-045','SND-046','SND-047'] },
  { id:'PL-003', name:'Madonna Warm-up',    mode:'shuffle', trackIds:['SND-048','SND-049'] },
  { id:'PL-004', name:'Oktoberfest 2026',   mode:'shuffle', trackIds:['SND-044','SND-040','SND-043'] },
];

var radioStreams = [
  { id:'RS-001', name:'Klassik Radio Berlin', genre:'Klassik',  url:'https://stream.klassikradio.de/berlin/mp3-192' },
  { id:'RS-002', name:'radioeins',            genre:'Pop/Rock', url:'https://radioeins.de/stream/live.mp3' },
  { id:'RS-003', name:'Jazzradio 106.8',      genre:'Jazz',     url:'https://stream.jazzradio.net/live/mp3-128' },
];

var DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

var musicEvents = [
  { id:'EV-001', name:'Klassik-Radio Vormittag',
    dateFrom:'2026-06-10', dateTo:'',
    source:{ kind:'radio', refId:'RS-001',
      days:wk(['Mon','Tue','Wed','Thu','Fri'], [{start:'09:00',end:'12:00'},{start:'15:00',end:'16:00'}]) },
    stationIds:['AL','FR','PO','ZO','HA'] },
  /* Morning classic and evening jazz are two events now — one source each. */
  { id:'EV-002', name:'Jazz am Abend',
    dateFrom:'2026-06-10', dateTo:'',
    source:{ kind:'radio', refId:'RS-003',
      days:wk(['Mon','Tue','Wed','Thu','Fri'], [{start:'18:00',end:'22:00'}]) },
    stationIds:['AL','FR','PO','ZO','HA'] },
  { id:'EV-003', name:'Weihnachtsmusik',
    dateFrom:'2026-12-01', dateTo:'2026-12-26',
    source:{ kind:'playlist', refId:'PL-002', days:wk(DAYS, [{start:'16:00',end:'20:00'}]) },
    stationIds:['AL','PO','ZO','KU','WI'] },
  { id:'EV-004', name:'Madonna — Celebration Tour',
    dateFrom:'2026-09-18', dateTo:'2026-09-20',
    source:{ kind:'track', refId:'SND-048', days:wk(DAYS, [{start:'15:00',end:'18:00'}]) },
    stationIds:['WI','NO','ZO','KU'] },
  { id:'EV-005', name:'Sommerradio 2026',
    dateFrom:'2026-06-01', dateTo:'2026-08-31',
    /* Different times per day — Fri and Sat run into the evening. */
    source:{ kind:'radio', refId:'RS-002', days:[
      { day:'Mon', slots:[{start:'10:00',end:'18:00'}] },
      { day:'Tue', slots:[{start:'10:00',end:'18:00'}] },
      { day:'Wed', slots:[{start:'10:00',end:'18:00'}] },
      { day:'Thu', slots:[{start:'10:00',end:'18:00'}] },
      { day:'Fri', slots:[{start:'18:00',end:'23:00'}] },
      { day:'Sat', slots:[{start:'12:00',end:'23:00'}] },
      { day:'Sun', slots:[] },
    ] },
    stationIds:['KA','WA'] },
];

var stationSchedules = [
  { stationId:'AL', lineId:'U2', active:true, entries:[
    { id:'SE-1', source:{ kind:'radio', refId:'RS-001' }, validFrom:'', validTo:'',
      repeat:{ mode:'loop', intervalMin:15 },
      days:[{ day:'Mon', slots:[{start:'09:00',end:'12:00'}] },
            { day:'Tue', slots:[{start:'09:00',end:'12:00'}] },
            { day:'Wed', slots:[{start:'09:00',end:'12:00'}] },
            { day:'Thu', slots:[{start:'09:00',end:'12:00'}] },
            { day:'Fri', slots:[{start:'09:00',end:'12:00'}] }] },
    { id:'SE-2', source:{ kind:'playlist', refId:'PL-004' }, validFrom:'2026-10-01', validTo:'2026-10-31',
      repeat:{ mode:'loop', intervalMin:15 },
      days:[{ day:'Sat', slots:[{start:'16:00',end:'20:00'}] },
            { day:'Sun', slots:[{start:'16:00',end:'20:00'}] }] },
  ]},
  { stationId:'AL', lineId:'U5', active:true, entries:[
    { id:'SE-1', source:{ kind:'radio', refId:'RS-002' }, validFrom:'', validTo:'',
      repeat:{ mode:'loop', intervalMin:15 },
      days:[{ day:'Fri', slots:[{start:'17:00',end:'21:00'}] },
            { day:'Sat', slots:[{start:'12:00',end:'21:00'}] }] },
  ]},
  { stationId:'ZO', lineId:'U2', active:true, entries:[
    { id:'SE-1', source:{ kind:'playlist', refId:'PL-001' }, validFrom:'', validTo:'',
      repeat:{ mode:'loop', intervalMin:15 },
      days:[{ day:'Mon', slots:[{start:'09:00',end:'12:00'}] }] },
    { id:'SE-2', source:{ kind:'radio', refId:'RS-003' }, validFrom:'', validTo:'',
      repeat:{ mode:'loop', intervalMin:15 },
      days:[{ day:'Tue', slots:[{start:'10:00',end:'15:00'},{start:'16:00',end:'20:00'}] },
            { day:'Wed', slots:[{start:'10:00',end:'15:00'},{start:'16:00',end:'20:00'}] }] },
  ]},
  { stationId:'WI', lineId:'U1', active:true, entries:[
    { id:'SE-1', source:{ kind:'track', refId:'SND-048' }, validFrom:'2026-09-18', validTo:'2026-09-20',
      repeat:{ mode:'interval', intervalMin:20 },
      days:DAYS.map(d => ({ day:d, slots:[{start:'15:00',end:'18:00'}] })) },
  ]},
  { stationId:'NO', lineId:'U4', active:false, entries:[
    { id:'SE-1', source:{ kind:'radio', refId:'RS-002' }, validFrom:'', validTo:'',
      repeat:{ mode:'loop', intervalMin:15 },
      days:[{ day:'Fri', slots:[{start:'18:00',end:'23:00'}] },
            { day:'Sat', slots:[{start:'12:00',end:'23:00'}] }] },
  ]},
];

var esc = v => String(v == null ? '' : v)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

var specialSoundFiles = [
  { id:'SND-020', filename:'weiterfahrt_verzoegert.mp3',     type:'special',      size:'95 KB', uploaded:'01.12.2025' },
  { id:'SND-021', filename:'naechste_station_gesperrt.mp3',  type:'special',      size:'88 KB', uploaded:'01.12.2025' },
  { id:'SND-022', filename:'bitte_zuruecktreten.mp3',        type:'special',      size:'67 KB', uploaded:'01.12.2025' },
  { id:'SND-023', filename:'tuer_schliesst.mp3',             type:'special',      size:'44 KB', uploaded:'01.12.2025' },
];

var specialAnnouncements = [
  { id:'SPC-001', fileId:'SND-020', label:'Weiterfahrt verzögert sich' },
  { id:'SPC-002', fileId:'SND-021', label:'Nächste Station gesperrt' },
  { id:'SPC-003', fileId:'SND-022', label:'Bitte zurücktreten' },
  { id:'SPC-004', fileId:'SND-023', label:'Tür schließt' },
];

var displayTexts = [
  { id:'TXT-001', text:'Nicht einsteigen' },
  { id:'TXT-002', text:'Sonderfahrt' },
  { id:'TXT-003', text:'Winterzug' },
  { id:'TXT-004', text:'Außer Betrieb' },
  { id:'TXT-005', text:'Weiterfahrt' },
  { id:'TXT-006', text:'Bitte zurückbleiben' },
  { id:'TXT-007', text:'Zug endet hier' },
  { id:'TXT-008', text:'Kein Ausstieg' },
  { id:'TXT-009', text:'Ersatzverkehr' },
  { id:'TXT-010', text:'Betriebsfahrt' },
  { id:'TXT-011', text:'Nur Ausstieg' },
  { id:'TXT-012', text:'Zug fällt aus' },
  { id:'TXT-013', text:'Verspätung' },
  { id:'TXT-014', text:'Umleitung' },
  { id:'TXT-015', text:'Fahrer wechselt' },
  { id:'TXT-016', text:'Zug wird gereinigt' },
  { id:'TXT-017', text:'Einsatzfahrt' },
  { id:'TXT-018', text:'Werkstattfahrt' },
  { id:'TXT-019', text:'Schulungsfahrt' },
  { id:'TXT-020', text:'Messsonderfahrt' },
  { id:'TXT-021', text:'Verstärkerzug' },
  { id:'TXT-022', text:'Kurzzug' },
  { id:'TXT-023', text:'Langzug' },
  { id:'TXT-024', text:'Bitte Türen freihalten' },
  { id:'TXT-025', text:'Kein Zugang' },
  { id:'TXT-026', text:'Feiertagsfahrplan' },
  { id:'TXT-027', text:'Nachtverkehr' },
  { id:'TXT-028', text:'Ende der Fahrt' },
];

var lineData = [
  { id:'U1',  fullName:'U1 Uhlandstraße – Warschauer Straße',      shortName:'U1',  longName:'U-Bahn Linie 1',           nameFile:'', ttsText:'U eins',   schedules:[] },
  { id:'U2',  fullName:'U2 Ruhleben – Pankow',                    shortName:'U2',  longName:'U-Bahn Linie 2',           nameFile:'', ttsText:'U zwei',   schedules:[] },
  { id:'U3',  fullName:'U3 Nollendorfplatz – Krumme Lanke',       shortName:'U3',  longName:'U-Bahn Linie 3',           nameFile:'', ttsText:'U drei',   schedules:[] },
  { id:'U4',  fullName:'U4 Nollendorfplatz – Innsbrucker Platz',  shortName:'U4',  longName:'U-Bahn Linie 4',           nameFile:'', ttsText:'U vier',   schedules:[] },
  { id:'U5',  fullName:'U5 Hauptbahnhof – Hönow',                 shortName:'U5',  longName:'U-Bahn Linie 5',           nameFile:'', ttsText:'U fünf',   schedules:[] },
  { id:'U6',  fullName:'U6 Alt-Tegel – Alt-Mariendorf',           shortName:'U6',  longName:'U-Bahn Linie 6',           nameFile:'', ttsText:'U sechs',  schedules:[] },
  { id:'U7',  fullName:'U7 Spandau – Rudow',                      shortName:'U7',  longName:'U-Bahn Linie 7',           nameFile:'', ttsText:'U sieben', schedules:[] },
  { id:'U8',  fullName:'U8 Wittenau – Hermannstraße',             shortName:'U8',  longName:'U-Bahn Linie 8',           nameFile:'', ttsText:'U acht',   schedules:[] },
  { id:'U9',  fullName:'U9 Osloer Straße – Rathaus Steglitz',     shortName:'U9',  longName:'U-Bahn Linie 9',           nameFile:'', ttsText:'U neun',   schedules:[] },
  { id:'U12', fullName:'U12 Ruhleben – Warschauer Straße',        shortName:'U12', longName:'U-Bahn Linie 12 (Express)',nameFile:'', ttsText:'U zwölf',  schedules:[
    { dateFrom:'2026-07-26', timeFrom:'01:00', dateTo:'2026-07-31', timeTo:'03:00', reason:'Sonderbetrieb Sommerfest' },
  ]},
];

var stations = [
  { id:'AL', name:'Alexanderplatz', shortName:'Alex', longName:'Bahnhof Berlin Alexanderplatz',
    coords:{ lat: 52.521992, lon: 13.413244 },
    lines: ['U2','U5','U8'],
    nameChanges:[{date:'2026-09-01', fullName:'Alexanderplatz (Umbau)', shortName:'Alex (U)', fileId:''}],
    directions:[{name:'Richtung Ruhleben'},{name:'Richtung Pankow'}],
    tracks:[
      {num:'1',exits:['left','right']},
      {num:'2',exits:['right','left']},
      {num:'3',exits:['left','left']},
      {num:'4',exits:['right','right']},
      {num:'5',exits:['left','right']},
    ],
    stationNameFile:'SND-001',
    transferAnnouncements:[
      { fileId:'SND-010', label:'Standard', isMain: true, scheduleSlots: null },
      { fileId:'SND-012', label:'S-Bahn Nacht', isMain: false, scheduleSlots:[
        { day:'Mon', slots:[{start:'22:00',end:'01:00'}] },
        { day:'Tue', slots:[{start:'22:00',end:'01:00'}] },
        { day:'Wed', slots:[{start:'22:00',end:'01:00'}] },
        { day:'Thu', slots:[{start:'22:00',end:'01:00'}] },
        { day:'Fri', slots:[{start:'22:00',end:'03:00'}] },
        { day:'Sat', slots:[{start:'00:00',end:'03:00'},{start:'22:00',end:'23:59'}] },
        { day:'Sun', slots:[{start:'00:00',end:'01:00'}] },
      ]},
    ],
    triggerArrival:150, triggerDeparture:80,
    neighborDist:{ prev:{name:'Klosterstraße', dist:370}, next:{name:'Schillingstraße', dist:420} } },

  { id:'BR', name:'Brandenburger Tor', shortName:'Brand. Tor', longName:'U-Bahnhof Brandenburger Tor',
    coords:{ lat: 52.516275, lon: 13.381741 },
    lines: ['U5'],
    nameChanges:[],
    directions:[{name:'Richtung Hönow'},{name:'Richtung Hauptbahnhof'}],
    tracks:[{num:'1',exits:['right','left']},{num:'2',exits:['left','right']}],
    stationNameFile:'SND-004',
    transferAnnouncements:[],
    triggerArrival:120, triggerDeparture:80,
    neighborDist:{ prev:{name:'Bundestag', dist:350}, next:{name:'Unter den Linden', dist:400} } },

  { id:'BU', name:'Bundestag', shortName:'Bundestag', longName:'U-Bahnhof Bundestag',
    coords:{ lat: 52.520556, lon: 13.375278 },
    lines: ['U5'],
    nameChanges:[],
    directions:[{name:'Richtung Hönow'},{name:'Richtung Hauptbahnhof'}],
    tracks:[{num:'1',exits:['left','left']},{num:'2',exits:['left','left']}],
    stationNameFile:'',
    transferAnnouncements:[],
    triggerArrival:0, triggerDeparture:0,
    neighborDist:{ prev:{name:'Hauptbahnhof', dist:500}, next:{name:'Brandenburger Tor', dist:350} } },

  { id:'HA', name:'Hauptbahnhof', shortName:'Hbf', longName:'U-Bahnhof Berlin Hauptbahnhof',
    coords:{ lat: 52.525592, lon: 13.369545 },
    lines: ['U5'],
    nameChanges:[],
    directions:[{name:'Richtung Hönow'},{name:'Richtung Spandau'}],
    tracks:[{num:'1',exits:['right','right']},{num:'2',exits:['right','right']}],
    stationNameFile:'SND-002',
    transferAnnouncements:[
      { fileId:'SND-012', label:'S-Bahn', isMain: true, scheduleSlots: null },
      { fileId:'SND-013', label:'Regional', isMain: false, scheduleSlots: null },
    ],
    triggerArrival:180, triggerDeparture:100,
    neighborDist:{ prev:{name:'Turmstraße', dist:680}, next:{name:'Bundestag', dist:500} } },

  { id:'FR', name:'Friedrichstraße', shortName:'Friedrichstr.', longName:'U-Bahnhof Friedrichstraße',
    coords:{ lat: 52.519696, lon: 13.387571 },
    lines: ['U5','U6'],
    nameChanges:[],
    directions:[{name:'Richtung Hönow'},{name:'Richtung Spandau'}],
    tracks:[{num:'1',exits:['left','right']},{num:'2',exits:['right','left']}],
    stationNameFile:'SND-005',
    transferAnnouncements:[
      { fileId:'SND-011', label:'U1/U3', isMain: true, scheduleSlots: null },
      { fileId:'SND-012', label:'S-Bahn', isMain: false, scheduleSlots: null },
    ],
    triggerArrival:150, triggerDeparture:80,
    neighborDist:{ prev:{name:'Unter den Linden', dist:380}, next:{name:'Stadtmitte', dist:420} } },

  { id:'PO', name:'Potsdamer Platz', shortName:'Potsd. Platz', longName:'U-Bahnhof Potsdamer Platz',
    coords:{ lat: 52.509167, lon: 13.376389 },
    lines: ['U2'],
    nameChanges:[{date:'2027-01-15', fullName:'Potsdamer Platz (ERP)', shortName:'Potsd. (ERP)', fileId:'SND-003'}],
    directions:[{name:'Richtung Ruhleben'},{name:'Richtung Pankow'}],
    tracks:[{num:'1',exits:['right','left']},{num:'2',exits:['left','right']}],
    stationNameFile:'SND-003',
    transferAnnouncements:[
      { fileId:'SND-012', label:'S-Bahn', isMain: true, scheduleSlots: null },
    ],
    triggerArrival:130, triggerDeparture:80,
    neighborDist:{ prev:{name:'Mendelssohn-Bartholdy-Park', dist:450}, next:{name:'Mohrenstraße', dist:350} } },

  { id:'ZO', name:'Zoologischer Garten', shortName:'Zoo', longName:'U-Bahnhof Zoologischer Garten',
    coords:{ lat: 52.506944, lon: 13.332778 },
    lines: ['U2','U9'],
    nameChanges:[],
    directions:[{name:'Richtung Ruhleben'},{name:'Richtung Pankow'}],
    tracks:[{num:'1',exits:['left','right']},{num:'2',exits:['right','left']}],
    stationNameFile:'SND-006',
    transferAnnouncements:[
      { fileId:'SND-011', label:'U1/U3', isMain: true, scheduleSlots: null },
    ],
    triggerArrival:140, triggerDeparture:80,
    neighborDist:{ prev:{name:'Uhlandstraße', dist:390}, next:{name:'Wittenbergplatz', dist:480} } },

  { id:'KU', name:'Kurfürstendamm', shortName:'Kudamm', longName:'U-Bahnhof Kurfürstendamm',
    coords:{ lat: 52.503611, lon: 13.329167 },
    lines: ['U9'],
    nameChanges:[],
    directions:[{name:'Richtung Osloer Str.'},{name:'Richtung Rathaus Steglitz'}],
    tracks:[{num:'1',exits:['left','right']},{num:'2',exits:['right','left']}],
    stationNameFile:'',
    transferAnnouncements:[],
    triggerArrival:0, triggerDeparture:0,
    neighborDist:{ prev:{name:'Zoologischer Garten', dist:320}, next:{name:'Uhlandstraße', dist:280} } },

  { id:'WI', name:'Wittenbergplatz', shortName:'Wittenberg.', longName:'U-Bahnhof Wittenbergplatz',
    coords:{ lat: 52.500833, lon: 13.341111 },
    lines: ['U1','U2','U3'],
    nameChanges:[],
    directions:[{name:'Richtung Uhlandstraße'},{name:'Richtung Warschauer Str.'}],
    tracks:[{num:'1',exits:['right','left']},{num:'2',exits:['left','right']}],
    stationNameFile:'',
    transferAnnouncements:[],
    triggerArrival:120, triggerDeparture:80,
    neighborDist:{ prev:{name:'Kurfürstendamm', dist:480}, next:{name:'Zoologischer Garten', dist:490} } },

  { id:'NO', name:'Nollendorfplatz', shortName:'Nollendorf.', longName:'U-Bahnhof Nollendorfplatz',
    coords:{ lat: 52.499167, lon: 13.353889 },
    lines: ['U1','U2','U3','U4'],
    nameChanges:[],
    directions:[{name:'Richtung Uhlandstraße'},{name:'Richtung Warschauer Str.'}],
    tracks:[{num:'1',exits:['left','right']},{num:'2',exits:['right','left']},{num:'3',exits:['both','both']}],
    stationNameFile:'SND-007',
    transferAnnouncements:[],
    triggerArrival:0, triggerDeparture:0,
    neighborDist:{ prev:{name:'Wittenbergplatz', dist:320}, next:{name:'Kleistpark', dist:450} } },

  { id:'WA', name:'Warschauer Straße', shortName:'Warschauer Str.', longName:'U-Bahnhof Warschauer Straße',
    coords:{ lat: 52.505556, lon: 13.448611 },
    lines: ['U12'],
    nameChanges:[],
    directions:[{name:'Richtung Ruhleben'},{name:'Richtung Uhlandstraße'}],
    tracks:[{num:'1',exits:['left','right']},{num:'2',exits:['right','left']}],
    stationNameFile:'',
    transferAnnouncements:[],
    triggerArrival:120, triggerDeparture:80,
    neighborDist:{ prev:{name:'Schlesisches Tor', dist:560}, next:{name:'Ostkreuz', dist:780} } },

  { id:'KA', name:'Kaiserdamm', shortName:'Kaiserdamm', longName:'U-Bahnhof Kaiserdamm',
    coords:{ lat: 52.516667, lon: 13.294722 },
    lines: ['U12'],
    nameChanges:[],
    directions:[{name:'Richtung Ruhleben'},{name:'Richtung Uhlandstraße'}],
    tracks:[{num:'1',exits:['right','left']},{num:'2',exits:['left','right']}],
    stationNameFile:'',
    transferAnnouncements:[],
    triggerArrival:100, triggerDeparture:80,
    neighborDist:{ prev:{name:'Theodor-Heuss-Platz', dist:480}, next:{name:'Sophie-Charlotte-Platz', dist:410} } },
];

var GD_VIEWS = ['stations','detail','sounds','spc','texts','lines','lineDetail','lineMgmt','playlistDetail'];

var EVR_VIEWS = ['music','musicEvent','musicStations','musicStation'];

var DAY_LABELS_DE = { Mon:'Mo', Tue:'Di', Wed:'Mi', Thu:'Do', Fri:'Fr', Sat:'Sa', Sun:'So' };

var DAY_LABELS_EN = { Mon:'Mon', Tue:'Tue', Wed:'Wed', Thu:'Thu', Fri:'Fri', Sat:'Sat', Sun:'Sun' };

var RANK = { track: 1, playlist: 2, radio: 3 };

var MONTHS_DE = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];

var MONTHS_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

var MUSIC_KINDS = ['playlist','track'];

var RADIO_KINDS = ['radio'];

function lineBadge(line) {
  const bg = lineColor[line] || '#666';
  const color = (line === 'U4') ? '#000' : '#fff';
  return `<span class="line-badge" style="background:${bg};color:${color}">${line}</span>`;
}

function getPlaylist(id) { return playlists.find(pl => pl.id === id); }

function getRadio(id) { return radioStreams.find(rs => rs.id === id); }

function wk(dayIds, slots) {
  return DAYS.map(d => ({ day: d, slots: dayIds.includes(d) ? slots.map(sl => ({ ...sl })) : [] }));
}

function getEvent(id) { return musicEvents.find(ev => ev.id === id); }

function getSchedule(stationId, lineId) {
  return stationSchedules.find(sc => sc.stationId === stationId && sc.lineId === lineId);
}

function schedKey(stationId, lineId) { return stationId + '|' + lineId; }

function musicTracks() { return soundFiles.filter(f => f.type === 'music'); }

function plDuration(pl) {
  const secs = pl.trackIds.reduce((sum, id) => {
    const f = soundFiles.find(x => x.id === id);
    if (!f || !f.duration) return sum;
    const [m, sec] = f.duration.split(':').map(Number);
    return sum + m * 60 + sec;
  }, 0);
  return Math.round(secs / 60) + ' ' + t('minShort');
}

function eventsUsing(kind, refId) {
  return musicEvents.filter(ev => ev.source.kind === kind && ev.source.refId === refId).length;
}

function getLine(id) { return lineData.find(l => l.id === id); }

function allSoundFiles() { return [...soundFiles, ...specialSoundFiles]; }

function snd(id) { return allSoundFiles().find(f => f.id === id); }

function sndName(id) { const f = snd(id); return f ? f.filename : '—'; }

function getStation(id) { return stations.find(s => s.id === id); }

function findStationsUsingSound(id) {
  return stations.filter(s =>
    s.stationNameFile === id ||
    s.transferAnnouncements.some(ta => ta.fileId === id)
  );
}

function schedSummary(ann) {
  if (ann.isMain)
    return `<span class="xfer-sched-tag always">${t('alwaysActive')}</span>`;
  if (ann.scheduleSlots)
    return `<span class="xfer-sched-tag has-sched">&#128344; ${t('scheduleSet')}</span>`;
  return `<span class="xfer-sched-tag no-sched">&#9888; ${t('schedMissing')}</span>`;
}

function fmtLineSchedule(sch) {
  const fmtDate = (d) => {
    if (!d) return '—';
    const [y, m, day] = d.split('-');
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const mDe = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
    const arr = state.lang === 'de' ? mDe : months;
    return `${arr[parseInt(m)-1]} ${parseInt(day)}`;
  };
  return `${fmtDate(sch.dateFrom)}, ${sch.timeFrom||'—'} – ${fmtDate(sch.dateTo)}, ${sch.timeTo||'—'}`;
}

function dayLabel(d) { return state.lang === 'de' ? DAY_LABELS_DE[d] : DAY_LABELS_EN[d]; }

function moveText(i, dir) {}

function moveSpc(i, dir) {}

function trackUsage(id) {
  const inPl = playlists.filter(pl => pl.trackIds.includes(id)).length;
  const inEv = eventsUsing('track', id);
  const parts = [];
  if (inPl) parts.push(inPl + ' ' + (inPl === 1 ? t('colPlaylist') : t('tabPlaylists')));
  if (inEv) parts.push(t('usedInEvents', inEv));
  return parts.length ? parts.join(' · ') : '—';
}

function fmtD(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return state.lang === 'de' ? `${d}.${m}.${y}` : `${y}-${m}-${d}`;
}

function fmtDMY(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  const mon = (state.lang === 'de' ? MONTHS_DE : MONTHS_EN)[parseInt(m, 10) - 1];
  return state.lang === 'de' ? `${parseInt(d, 10)}. ${mon} ${y}` : `${parseInt(d, 10)} ${mon} ${y}`;
}

function evPeriod(ev) {
  return fmtDMY(ev.dateFrom) + ' – ' + (ev.dateTo ? fmtDMY(ev.dateTo) : t('evOpenEnd'));
}

function evStatus(ev) {
  const today = new Date().toISOString().slice(0, 10);
  if (ev.dateTo   && ev.dateTo   < today) return { cls: 'chip-past',    label: t('stEvPast') };
  if (ev.dateFrom && ev.dateFrom > today) return { cls: 'chip-planned', label: t('stEvPlanned') };
  return { cls: 'chip-on', label: t('stEvActive') };
}

function srcLabel(kind) { return kind === 'radio' ? t('srcRadio') : kind === 'playlist' ? t('srcPlaylist') : t('srcTrack'); }

function evKind(ev) { return ev.source.kind; }

function srcRefName(kind, refId) {
  if (!refId) return '—';
  if (kind === 'radio')    { const r = getRadio(refId);    return r ? r.name : '—'; }
  if (kind === 'playlist') { const p = getPlaylist(refId); return p ? p.name : '—'; }
  const f = soundFiles.find(x => x.id === refId); return f ? f.name : '—';
}

function sourceName(src) { return srcRefName(src.kind, src.refId); }

function evLineGroups(ev) {
  const map = [];
  ev.stationIds.forEach(id => {
    const st = getStation(id);
    if (!st) return;
    st.lines.forEach(l => {
      let g = map.find(x => x.line === l);
      if (!g) { g = { line: l, names: [] }; map.push(g); }
      if (!g.names.includes(st.name)) g.names.push(st.name);
    });
  });
  const order = lineData.map(l => l.id);
  return map.sort((a, b) => order.indexOf(a.line) - order.indexOf(b.line));
}

function evLineChips(ev) {
  const groups = evLineGroups(ev);
  if (!groups.length) return `<span class="ms-none">—</span>`;
  return `<div class="lc-wrap">${groups.map(g =>
    `<span class="lc" tabindex="0">${lineBadge(g.line)}<span class="lc-n">${g.names.length}</span>
       <span class="lc-tip">${g.names.map(n => esc(n)).join('<br>')}</span></span>`).join('')}</div>`;
}

function evSourceChip(ev) {
  if (!ev.source.refId) return `<span class="ms-none">—</span>`;
  return `<span class="chip chip-${ev.source.kind}">${esc(srcRefName(ev.source.kind, ev.source.refId))}</span>`;
}

function evMatches(ev, q) {
  if (!q) return true;
  const needle = q.toLowerCase();
  if (ev.name.toLowerCase().includes(needle)) return true;
  return ev.stationIds.some(id => {
    const st = getStation(id);
    return st && (st.name.toLowerCase().includes(needle)
      || st.lines.some(l => l.toLowerCase().includes(needle)));
  });
}

function periodsOverlap(a, b) {
  if (a.dateTo && b.dateFrom && a.dateTo < b.dateFrom) return false;
  if (b.dateTo && a.dateFrom && b.dateTo < a.dateFrom) return false;
  return true;
}

function sourcesClash(sa, sb) {
  const ra = entryRanges(sa), rb = entryRanges(sb);
  for (const x of ra) for (const y of rb) {
    if (rangesOverlap(x.r, y.r)) return { day: x.day, slot: x.slot };
  }
  return null;
}

function evConflicts(draft) {
  const out = [];
  musicEvents.forEach(other => {
    if (other.id === draft.id) return;
    if (RANK[evKind(draft)] !== RANK[evKind(other)]) return;
    if (!periodsOverlap(draft, other)) return;
    const shared = draft.stationIds.filter(id => other.stationIds.includes(id))
      .map(id => (getStation(id) || {}).name).filter(Boolean);
    if (!shared.length) return;
    const clash = sourcesClash(draft.source, other.source);
    if (clash) out.push({ name: other.name, stations: shared, day: clash.day,
                          win: clash.slot.start + '–' + clash.slot.end });
  });
  return out;
}

function cloneEvent(ev) { return ev ? JSON.parse(JSON.stringify(ev)) : null; }

function blankSource(kind) {
  return { kind: kind || 'radio', refId: '',
           days: DAYS.map(d => ({ day: d, slots: [] })) };   // starts empty, as in V2
}

function blankEvent() {
  return { id: null, name: '', dateFrom: new Date().toISOString().slice(0, 10), dateTo: '',
           source: blankSource('radio'), stationIds: [] };
}

function toMin(hhmm) { const [h, m] = (hhmm || '0:0').split(':'); return (+h) * 60 + (+m); }

function slotRanges(dayIdx, slot) {
  const s0 = toMin(slot.start), e0 = toMin(slot.end);
  const start = dayIdx * 1440 + s0;
  const len = e0 > s0 ? e0 - s0 : 1440 - s0 + e0;
  const end = start + len;
  return end <= 10080 ? [[start, end]] : [[start, 10080], [0, end - 10080]];
}

function entryRanges(entry) {
  const out = [];
  (entry.days || []).forEach(d => {
    const di = DAYS.indexOf(d.day);
    if (di === -1) return;
    (d.slots || []).forEach(sl => slotRanges(di, sl).forEach(r => out.push({ r, day: d.day, slot: sl })));
  });
  return out;
}

function rangesOverlap(a, b) { return a[0] < b[1] && b[0] < a[1]; }

function validityOverlap(a, b) {
  if (a.validTo && b.validFrom && a.validTo < b.validFrom) return false;
  if (b.validTo && a.validFrom && b.validTo < a.validFrom) return false;
  return true;
}

function dayHasSlots(entry, day) {
  const d = (entry.days || []).find(x => x.day === day);
  return !!(d && d.slots && d.slots.length);
}

function entryTimes(entry) {
  const seen = [];
  (entry.days || []).forEach(d => (d.slots || []).forEach(sl => {
    const label = sl.start + '–' + sl.end;
    if (!seen.includes(label)) seen.push(label);
  }));
  return seen.join(', ') || t('msNoPlayback');
}

function validityLabel(entry) {
  if (!entry.validFrom && !entry.validTo) return t('msPermanent');
  return fmtD(entry.validFrom) + ' – ' + fmtD(entry.validTo);
}

function schedCell(sc, kinds) {
  const entries = sc.entries.filter(e => kinds.includes(e.source.kind));
  if (!entries.length) return `<span class="ms-none">—</span>`;
  return entries.map(e => `
    <div class="ms-item">
      <div class="ms-src">${sourceName(e.source)}
        <span class="chip chip-${e.source.kind}">${srcLabel(e.source.kind)}</span></div>
      <div class="dayrow">${DAYS.map(d =>
        `<span class="dayc ${dayHasSlots(e, d) ? 'on' : ''}">${dayLabel(d)}</span>`).join('')}</div>
      <div class="fhint">${entryTimes(e)} · ${validityLabel(e)}</div>
    </div>`).join('');
}

function blankEntry(kind) {
  return { id: 'SE-' + Date.now().toString(36), source: { kind: kind || 'playlist', refId: '' },
    validFrom: '', validTo: '', repeat: { mode: 'loop', intervalMin: 15 },
    days: DAYS.map(d => ({ day: d, slots: [] })) };   // starts empty, as agreed
}

function normaliseDays(entry) {
  entry.days = DAYS.map(d => {
    const cur = (entry.days || []).find(x => x.day === d);
    return { day: d, slots: cur ? cur.slots.map(sl => ({ ...sl })) : [] };
  });
  return entry;
}
