/* ══════════════════════════════════════════════════════════════════
   GENERATED — do not edit. Run: node scripts/qx-extract-shared.cjs

   Extracted from projects/q-explorer-prototype/index.html so the React
   port and the vanilla prototype share one source of truth for the domain
   model. Re-run to resync; the vanilla file is never modified.

   28 evaluation rows · 43 domain constants · 76 pure functions
   ══════════════════════════════════════════════════════════════════ */

/* The extracted code calls t() while building its record sets, and the
   vanilla's t() closes over a module-level lang. Rather than duplicate the
   lookup in the React app, that binding lives here and the app drives it
   through setDataLang() -- one implementation of t(), not two that can drift. */
var lang = 'de';
function setDataLang(l) { lang = l; }

/** The evaluations list, read out of the vanilla prototype's markup. */
var EVALUATIONS = [
  {
    "group": "punctuality",
    "name": "Pünktlichkeit – Letzte 7 Tage, SBB",
    "status": "in_progress",
    "periodKey": "last_7_days",
    "von": "",
    "bis": "",
    "period": "19.05–25.05.2026",
    "created": "25.05.2026",
    "actions": [
      "delete"
    ]
  },
  {
    "group": "punctuality",
    "name": "Pünktlichkeit – Letzter Monat, Kanton ZH",
    "status": "done",
    "periodKey": "last_month",
    "von": "01.04.2026",
    "bis": "30.04.2026",
    "period": "01.04–30.04.2026",
    "created": "03.05.2026",
    "actions": [
      "visibility",
      "delete"
    ]
  },
  {
    "group": "punctuality",
    "name": "Pünktlichkeit – Letzte 30 Tage, Tarifverbund A",
    "status": "done",
    "periodKey": "other",
    "von": "26.04.2026",
    "bis": "25.05.2026",
    "period": "26.04–25.05.2026",
    "created": "26.05.2026",
    "actions": [
      "visibility",
      "delete"
    ]
  },
  {
    "group": "punctuality",
    "name": "Pünktlichkeit – Aktuelles Jahr, BLS",
    "status": "failed",
    "periodKey": "other",
    "von": "",
    "bis": "",
    "period": "01.01–26.05.2026",
    "created": "24.05.2026",
    "actions": [
      "delete"
    ]
  },
  {
    "group": "punctuality",
    "name": "Pünktlichkeit – Letzte 7 Tage, ZVV, Bus",
    "status": "done",
    "periodKey": "last_7_days",
    "von": "19.05.2026",
    "bis": "25.05.2026",
    "period": "19.05–25.05.2026",
    "created": "25.05.2026",
    "actions": [
      "visibility",
      "delete"
    ]
  },
  {
    "group": "punctuality",
    "name": "Pünktlichkeit – Letztes Jahr, alle Kantone",
    "status": "done",
    "periodKey": "last_year",
    "von": "01.01.2025",
    "bis": "31.12.2025",
    "period": "01.01–31.12.2025",
    "created": "08.01.2026",
    "actions": [
      "visibility",
      "delete"
    ]
  },
  {
    "group": "raw_data",
    "name": "Rohdaten Export – Gestern",
    "status": "done",
    "periodKey": "other",
    "von": "",
    "bis": "",
    "period": "24.05.2026",
    "created": "25.05.2026",
    "actions": [
      "download",
      "delete"
    ]
  },
  {
    "group": "raw_data",
    "name": "Rohdaten Export – SBB Vollexport Mai 2026",
    "status": "running",
    "periodKey": "other",
    "von": "",
    "bis": "",
    "period": "01.05–23.05.2026",
    "created": "25.05.2026",
    "actions": [
      "delete"
    ]
  },
  {
    "group": "raw_data",
    "name": "Rohdaten Export – Letzte Woche",
    "status": "done",
    "periodKey": "last_7_days",
    "von": "",
    "bis": "",
    "period": "11.05–17.05.2026",
    "created": "20.05.2026",
    "actions": [
      "download",
      "delete"
    ]
  },
  {
    "group": "raw_data",
    "name": "Rohdaten Export – April 2026 komplett",
    "status": "done",
    "periodKey": "other",
    "von": "",
    "bis": "",
    "period": "01.04–30.04.2026",
    "created": "05.05.2026",
    "actions": [
      "download",
      "delete"
    ]
  },
  {
    "group": "line_analysis",
    "name": "Linienanalyse DPM – Letztes Jahr, Kanton BE",
    "status": "done",
    "periodKey": "last_year",
    "von": "",
    "bis": "",
    "period": "01.01–31.12.2025",
    "created": "24.05.2026",
    "actions": [
      "delete"
    ]
  },
  {
    "group": "line_analysis",
    "name": "Linienanalyse DPM – Letzter Monat, S 1, S 5",
    "status": "done",
    "periodKey": "last_month",
    "von": "",
    "bis": "",
    "period": "01.04–30.04.2026",
    "created": "03.05.2026",
    "actions": [
      "delete"
    ]
  },
  {
    "group": "line_analysis",
    "name": "Linienanalyse DPM – Letzte 30 Tage, IC 1, IC 5, IC 8",
    "status": "failed",
    "periodKey": "other",
    "von": "",
    "bis": "",
    "period": "26.04–25.05.2026",
    "created": "26.05.2026",
    "actions": [
      "delete"
    ]
  },
  {
    "group": "line_analysis",
    "name": "Linienanalyse DPM – Aktueller Monat, RE 7, BLS",
    "status": "done",
    "periodKey": "current_month",
    "von": "",
    "bis": "",
    "period": "01.05–26.05.2026",
    "created": "26.05.2026",
    "actions": [
      "delete"
    ]
  },
  {
    "group": "data_quality",
    "name": "Datenqualitätsindex DPM – Letzte 3 Monate",
    "status": "failed",
    "periodKey": "other",
    "von": "",
    "bis": "",
    "period": "01.02–30.04.2026",
    "created": "22.05.2026",
    "actions": [
      "delete"
    ]
  },
  {
    "group": "data_quality",
    "name": "Datenqualitätsindex DPM – Letzter Monat, alle TU",
    "status": "done",
    "periodKey": "last_month",
    "von": "",
    "bis": "",
    "period": "01.04–30.04.2026",
    "created": "03.05.2026",
    "actions": [
      "visibility",
      "delete"
    ]
  },
  {
    "group": "data_quality",
    "name": "Datenqualitätsindex DPM – Aktuelles Jahr, Tarifverbund B",
    "status": "in_progress",
    "periodKey": "other",
    "von": "",
    "bis": "",
    "period": "01.01–26.05.2026",
    "created": "26.05.2026",
    "actions": [
      "delete"
    ]
  },
  {
    "group": "data_quality",
    "name": "Datenqualitätsindex DPM – Letztes Jahr, SBB, BLS, ZVV",
    "status": "done",
    "periodKey": "last_year",
    "von": "",
    "bis": "",
    "period": "01.01–31.12.2025",
    "created": "12.01.2026",
    "actions": [
      "visibility",
      "delete"
    ]
  },
  {
    "group": "connection",
    "name": "Anschlusspünktlichkeit – Letzte 30 Tage",
    "status": "done",
    "periodKey": "other",
    "von": "01.04.2026",
    "bis": "30.04.2026",
    "period": "01.04–30.04.2026",
    "created": "20.05.2026",
    "actions": [
      "visibility",
      "delete"
    ]
  },
  {
    "group": "connection",
    "name": "Anschlusspünktlichkeit – Aktueller Monat",
    "status": "running",
    "periodKey": "current_month",
    "von": "",
    "bis": "",
    "period": "01.05–24.05.2026",
    "created": "25.05.2026",
    "actions": [
      "delete"
    ]
  },
  {
    "group": "connection",
    "name": "Anschlusspünktlichkeit – Q1 2026",
    "status": "done",
    "periodKey": "other",
    "von": "01.01.2026",
    "bis": "31.03.2026",
    "period": "01.01–31.03.2026",
    "created": "08.04.2026",
    "actions": [
      "visibility",
      "delete"
    ]
  },
  {
    "group": "connection",
    "name": "Anschlusspünktlichkeit – ZH Wochentage",
    "status": "done",
    "periodKey": "other",
    "von": "01.03.2026",
    "bis": "31.03.2026",
    "period": "01.03–31.03.2026",
    "created": "15.04.2026",
    "actions": [
      "visibility",
      "delete"
    ]
  },
  {
    "group": "connection",
    "name": "Anschlusspünktlichkeit – Bern Anschlüsse 2025",
    "status": "failed",
    "periodKey": "other",
    "von": "",
    "bis": "",
    "period": "01.01–31.12.2025",
    "created": "10.02.2026",
    "actions": [
      "delete"
    ]
  },
  {
    "group": "trip_failures",
    "name": "Fahrtausfälle DPM – Letzte 30 Tage, alle Linien",
    "status": "done",
    "periodKey": "other",
    "von": "01.04.2026",
    "bis": "30.04.2026",
    "period": "01.04–30.04.2026",
    "created": "25.05.2026",
    "actions": [
      "visibility",
      "delete"
    ]
  },
  {
    "group": "trip_failures",
    "name": "Fahrtausfälle DPM – Letzte 7 Tage, SBB",
    "status": "done",
    "periodKey": "last_7_days",
    "von": "10.06.2026",
    "bis": "23.06.2026",
    "period": "19.05–25.05.2026",
    "created": "25.05.2026",
    "actions": [
      "visibility",
      "delete"
    ]
  },
  {
    "group": "trip_failures",
    "name": "Fahrtausfälle DPM – Aktueller Monat, ZVV",
    "status": "in_progress",
    "periodKey": "current_month",
    "von": "",
    "bis": "",
    "period": "01.05–26.05.2026",
    "created": "26.05.2026",
    "actions": [
      "delete"
    ]
  },
  {
    "group": "trip_failures",
    "name": "Fahrtausfälle DPM – Letzter Monat, BLS, Kanton BE",
    "status": "done",
    "periodKey": "last_month",
    "von": "",
    "bis": "",
    "period": "01.04–30.04.2026",
    "created": "15.05.2026",
    "actions": [
      "delete"
    ]
  },
  {
    "group": "trip_failures",
    "name": "Fahrtausfälle DPM – Letztes Jahr, Bahn Normalspur",
    "status": "done",
    "periodKey": "last_year",
    "von": "",
    "bis": "",
    "period": "01.01–31.12.2025",
    "created": "10.01.2026",
    "actions": [
      "delete"
    ]
  }
];

/** The scheduled reports, likewise. */
var SCHEDULES = [
  {
    "name": "Fahrtausfälle DPM – Wöchentlich",
    "freq": "weekly",
    "status": "active",
    "freqKey": "freq_weekly_mon",
    "next": "01.06.2026",
    "last": "25.05.2026",
    "actions": [
      "pause_circle",
      "edit",
      "delete"
    ]
  },
  {
    "name": "Pünktlichkeit – Kanton ZH, Monatlich",
    "freq": "monthly",
    "status": "active",
    "freqKey": "freq_monthly_1st",
    "next": "01.06.2026",
    "last": "01.05.2026",
    "actions": [
      "pause_circle",
      "edit",
      "delete"
    ]
  },
  {
    "name": "Rohdaten Export – Täglich",
    "freq": "daily",
    "status": "paused",
    "freqKey": "freq_daily",
    "next": "26.05.2026",
    "last": "25.05.2026",
    "actions": [
      "play_circle",
      "edit",
      "delete"
    ]
  },
  {
    "name": "Linienanalyse – SBB Monatlich",
    "freq": "monthly",
    "status": "active",
    "freqKey": "freq_monthly",
    "next": "01.06.2026",
    "last": "01.05.2026",
    "actions": [
      "pause_circle",
      "edit",
      "delete"
    ]
  },
  {
    "name": "Datenqualitätsindex – Wöchentlich BE/FR",
    "freq": "weekly",
    "status": "active",
    "freqKey": "freq_weekly",
    "next": "02.06.2026",
    "last": "26.05.2026",
    "actions": [
      "pause_circle",
      "edit",
      "delete"
    ]
  },
  {
    "name": "Jahresbericht Pünktlichkeit 2025",
    "freq": "yearly",
    "status": "paused",
    "freqKey": "freq_yearly",
    "next": "15.01.2027",
    "last": "15.01.2026",
    "actions": [
      "play_circle",
      "edit",
      "delete"
    ]
  }
];

var scl = n => Math.round((n || 0) * _punctScale);
var sclPunkt = (punkt, ist) => Math.min(scl(ist), Math.round(scl(punkt) * _punctPctShift));
var _punctScale = 1, _punctPctShift = 1;

var DATA = {
    rpv: {
      "Tarifverbund A": {
        cantons: ["ZH","AG","SH","TG","ZG"],
        tu: ["SBB","ZVV","SOB"]
      },
      "Tarifverbund B": {
        cantons: ["BE","SO","FR","VS","NE","JU"],
        tu: ["SBB","BLS","TPF","CJ"]
      },
      "Tarifverbund C": {
        cantons: ["GR","SG","GL","AI","AR","TI","SZ","UR"],
        tu: ["SBB","REGIONALPS SA","SOB"]
      }
    },
    modes: {
      "bahn-ns":  ["SBB","BLS","SOB","CJ","REGIONALPS SA"],
      "vm-bus":   ["ZVV","TPF","CJ","REGIONALPS SA","BLS"],
      "vm-tram":  ["ZVV","TPF"]
    },
    cantonTU: {
      "ZH": ["SBB","ZVV","SOB"],
      "AG": ["SBB","BLS","ZVV"],
      "SH": ["SBB","ZVV"],
      "TG": ["SBB","SOB"],
      "ZG": ["SBB","ZVV","SOB"],
      "BE": ["SBB","BLS","TPF"],
      "SO": ["SBB","BLS"],
      "FR": ["SBB","TPF"],
      "VS": ["SBB","BLS","REGIONALPS SA"],
      "NE": ["SBB","TPF","CJ"],
      "JU": ["SBB","CJ"],
      "GR": ["SBB","REGIONALPS SA"],
      "SG": ["SBB","SOB"],
      "GL": ["SOB"],
      "AI": ["SOB"],
      "AR": ["SOB"],
      "TI": ["SBB","REGIONALPS SA"],
      "SZ": ["SBB","SOB"],
      "UR": ["SBB"]
    },
    tuLines: {
      "SBB":           ["IC 1","IC 5","IC 8","IR 13","IR 15","IR 17","RE 1","RE 3","S 3"],
      "BLS":           ["RE 7","RE 3","S 1","S 5","S 6","S 44"],
      "ZVV":           ["S 2","S 8","S 14","S 24","Bus 46","Bus 72","Bus 83"],
      "SOB":           ["IR 27","RE 8","S 26"],
      "TPF":           ["RE 7","Bus 10","Bus 20","Bus 536"],
      "CJ":            ["RE 23","Bus 60"],
      "REGIONALPS SA": ["RE 1","Bus 70"]
    },
    allStops: ["Aarau","Basel SBB","Basel Bad Bf","Bellinzona","Bern","Biel/Bienne","Brig","Chur","Davos Platz","Fribourg","Genève","Genève-Aéroport","Interlaken Ost","Lausanne","Locarno","Lugano","Luzern","Neuchâtel","Olten","Sion","St. Gallen","Thun","Visp","Winterthur","Zermatt","Zug","Zürich HB","Zürich Flughafen"]
  };

var ALL_TU = [
    { id: "BLS",           label: "BLS AG" },
    { id: "CJ",            label: "CJ — Chemins de fer du Jura" },
    { id: "REGIONALPS SA", label: "REGIONALPS SA" },
    { id: "SBB",           label: "SBB — Schweizerische Bundesbahnen" },
    { id: "SOB",           label: "SOB — Schweizerische Südostbahn" },
    { id: "TPF",           label: "TPF — Transports publics fribourgeois" },
    { id: "ZVV",           label: "ZVV — Zürcher Verkehrsverbund" }
  ];

var ALL_CANTONS = ['AG','AI','AR','BE','BL','BS','FR','GE','GL','GR','JU','LU','NE','NW','OW','SG','SH','SO','SZ','TG','TI','UR','VD','VS','ZG','ZH'];

var CANTON_NAMES = {
    AG:'Aargau', AI:'Appenzell Innerrhoden', AR:'Appenzell Ausserrhoden',
    BE:'Bern', BL:'Basel-Landschaft', BS:'Basel-Stadt', FR:'Fribourg',
    GE:'Genève', GL:'Glarus', GR:'Graubünden', JU:'Jura', LU:'Luzern',
    NE:'Neuchâtel', NW:'Nidwalden', OW:'Obwalden', SG:'St. Gallen',
    SH:'Schaffhausen', SO:'Solothurn', SZ:'Schwyz', TG:'Thurgau',
    TI:'Ticino', UR:'Uri', VD:'Vaud', VS:'Valais/Wallis', ZG:'Zug', ZH:'Zürich'
  };

var FLAT_MODES = [
    { id: 'bahn-ns',      label: 'Bahn Normalspur',    cascade: 'bahn-ns' },
    { id: 'bahn-agglom',  label: 'Bahn Nsp Agglom.',   cascade: 'bahn-ns' },
    { id: 'bahn-ueberl',  label: 'Bahn Nsp Überl./RV', cascade: 'bahn-ns' },
    { id: 'schnellzuege', label: 'Schnellzüge',         cascade: 'bahn-ns' },
    { id: 'vm-bus',       label: 'Bus',                 cascade: 'vm-bus'  },
    { id: 'vm-tram',      label: 'Tram',                cascade: 'vm-tram' }
  ];

var ALL_DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

var DAY_LABELS = {
    en: {Mon:'Mon', Tue:'Tue', Wed:'Wed', Thu:'Thu', Fri:'Fri', Sat:'Sat', Sun:'Sun'},
    de: {Mon:'Mo',  Tue:'Di',  Wed:'Mi',  Thu:'Do',  Fri:'Fr',  Sat:'Sa',  Sun:'So'}
  };

var PROTO_TODAY = new Date(2026, 5, 25);

var MONTH_NAMES = {
    en: ['January','February','March','April','May','June','July','August','September','October','November','December'],
    de: ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'],
  };

var ORDINAL_EN = n => n + (n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th');

var DAY_CHOICES = [1,2,3,4,5,7,10,14,15,20,28];

var ACRONYMS = ['DPM','RPV','DQI','TU'];

var FAIL_REASONS = ['fail_reason_source','fail_reason_timeout','fail_reason_nodata'];

var SCHED_CONFIG = {
    'Fahrtausfälle DPM – Wöchentlich':      { period: 'last_7',    freq: 'weekly',  tu: [],        cantons: [],     lines: [] },
    'Pünktlichkeit – Kanton ZH, Monatlich': { period: 'last_month',freq: 'monthly', tu: [],        cantons: ['ZH'], lines: [] },
    'Rohdaten Export – Täglich':            { period: 'last_7',    freq: 'daily',   tu: [],        cantons: [],     lines: [] },
    'Linienanalyse – SBB Monatlich':        { period: 'last_month',freq: 'monthly', tu: ['SBB'],   cantons: [],     lines: [] },
    'Datenqualitätsindex – Wöchentlich BE/FR': { period: 'last_7', freq: 'weekly',  tu: [],        cantons: ['BE','FR'], lines: [] },
    'Jahresbericht Pünktlichkeit 2025':     { period: 'last_year', freq: 'yearly',  tu: [],        cantons: [],     lines: [] },
  };

var RPT_COLORS = ['#1D4ED8','#15803D','#B45309','#EA580C'];

var RPT_THRESHOLD = 90;

var RPT_DATA = {
    tus: [
      { label:'AAGL BusÜ 1',       v:[96.07,96.70,95.00,72.22,97.60,100.00,91.51], lines:[
        { label:'(50.072) 72 Augst – Artisdorf – Liestal – Seltisberg – Lupsingen', v:[85.81,85.00,98.00,100.00,93.94,100.00,100.00] },
        { label:'(50.081) 81 Liestal – Augst – Basel Aeschenplatz',                 v:[97.55,100.00,94.12,61.54,98.17,100.00,88.52] },
      ]},
      { label:'AAGR BusA 1',        v:[95.71,96.30,92.31,97.56,89.84,92.41,68.59], lines:[
        { label:'(60.040) 40 Littau Bahnhof – Bahnhof Süd – Flugzeugwerke – Wankdorf', v:[95.71,96.30,92.31,97.56,89.84,92.41,68.59] },
      ]},
      { label:'AB BahnS 1',         v:[88.26,62.14,88.21,81.82,88.87,94.61,87.54], lines:[
        { label:'(8.S21) S21/S22 Appenzell – Gais – St. Gallen (– Trogen)',           v:[98.37,100.00,100.00,100.00,87.12,95.51,83.33] },
        { label:'(8.S23) S23 Gossau SG – Herisau – Appenzell – Wasserauen',           v:[83.05,80.11,96.67,68.42,90.10,94.08,90.50] },
      ]},
      { label:'AB BahnS 2',         v:[56.99,54.55,63.16,62.96,93.73,91.84,93.52], lines:[
        { label:'(8.S15) S15 Frauenfeld – Wil SG',                                    v:[56.99,54.55,63.16,62.96,93.73,91.84,93.52] },
      ]},
      { label:'ABI BusÜ 1',         v:[90.35,93.93,90.32,94.62,93.68,94.42,89.85], lines:[
        { label:'(62.131) 131 Biasca – Acquarossa – Olivone',                          v:[86.46,91.30,82.65,100.00,93.58,94.07,89.91] },
        { label:'(62.132) 132 Biasca – Ludiano – Malvaglia',                          v:[93.88,94.44,88.04,89.58,96.06,96.85,96.74] },
        { label:'(62.133) 133 Acquarossa – Leontica',                                  v:[98.42,100.00,98.81,100.00,89.38,91.74,80.92] },
        { label:'(62.134) 134 Acquarossa – Ponto Valentino',                           v:[94.55,100.00,90.96,94.59,89.87,92.19,80.66] },
        { label:'(62.135) 135 Olivone – Campo (Blenio) – Ghirone',                    v:[83.33,83.33,83.33,null,83.33,89.62,85.25] },
        { label:'(62.140) 140 Disentis/Mustér – Lucomagno – Biasca',                  v:[86.21,83.33,null,83.33,97.15,96.55,98.15] },
      ]},
      { label:'AMSA BusÜ 1',        v:[86.38,89.47,84.19,81.73,90.35,93.00,81.20], lines:[
        { label:'AMSA Hauptlinie – Mendrisiotto',                                      v:[86.38,89.47,84.19,81.73,90.35,93.00,81.20] },
      ]},
      { label:'ARAG BusÜ 1',        v:[90.14,96.84,97.12,95.46,96.48,97.00,92.64], lines:[
        { label:'ARAG Hauptlinie – Aargau Ost',                                        v:[90.14,96.84,97.12,95.46,96.48,97.00,92.64] },
      ]},
      { label:'ARL BusÜ 1',         v:[93.88,93.59,91.36,93.10,93.11,94.39,89.96], lines:[
        { label:'ARL Linie – Appenzell Ausserrhoden',                                  v:[93.88,93.59,91.36,93.10,93.11,94.39,89.96] },
      ]},
      { label:'AVA Tram 1',          v:[51.93,47.62,48.56,42.50,90.83,87.92,85.41], lines:[
        { label:'AVA Tram Hauptlinie',                                                 v:[51.93,47.62,48.56,42.50,90.83,87.92,85.41] },
      ]},
      { label:'AVJ BusÜ 1',          v:[null,null,null,null,null,null,null],          lines:[
        { label:'AVJ Hauptlinie – Vallée de Joux',                                     v:[null,null,null,null,null,null,null] },
      ]},
      { label:'BBA BusÜ 1',          v:[83.73,60.00,73.81,64.29,93.11,96.43,87.82], lines:[
        { label:'BBA Hauptlinie – Baselbieter Bergbahnen',                             v:[83.73,60.00,73.81,64.29,93.11,96.43,87.82] },
      ]},
    ],
    gesamt: [89.53,90.41,86.44,88.87,92.34,93.88,86.70],
  };

var RPT_RAW = (function() {
    const base = [
      ['10.06.2026','50.099','(8572240) Giebenach, Lindenplatz','50.072','(8572240) Giebenach, Lindenplatz','06:39:00','06:38:52','06:41:00','06:42:08','00:03:16','00:02:00','ja','ja'],
      ['10.06.2026','50.099','(8572240) Giebenach, Lindenplatz','50.072','(8572240) Giebenach, Lindenplatz','07:09:00','07:09:00','07:11:00','07:12:17','00:03:17','00:02:00','ja','ja'],
      ['10.06.2026','50.099','(8572240) Giebenach, Lindenplatz','50.072','(8572240) Giebenach, Lindenplatz','07:39:00','07:38:45','07:41:00','07:41:39','00:02:54','00:02:00','ja','ja'],
      ['10.06.2026','50.099','(8572240) Giebenach, Lindenplatz','50.072','(8572240) Giebenach, Lindenplatz','08:09:00','08:08:25','08:11:00','08:11:41','00:03:16','00:02:00','ja','ja'],
      ['10.06.2026','50.099','(8572240) Giebenach, Lindenplatz','50.072','(8572240) Giebenach, Lindenplatz','12:39:00','12:39:45','12:41:00','12:44:54','00:05:09','00:02:00','ja','ja'],
      ['10.06.2026','50.099','(8572240) Giebenach, Lindenplatz','50.072','(8572240) Giebenach, Lindenplatz','13:39:00','13:38:51','13:41:00','13:41:47','00:02:56','00:02:00','ja','ja'],
      ['10.06.2026','50.099','(8572240) Giebenach, Lindenplatz','50.072','(8572240) Giebenach, Lindenplatz','14:39:00','14:41:34','14:41:00','14:41:03','-00:00:31','00:02:00','nein','nein'],
      ['10.06.2026','50.099','(8572240) Giebenach, Lindenplatz','50.072','(8572240) Giebenach, Lindenplatz','15:39:00','','15:41:00','','','00:02:00','',''],
      ['10.06.2026','50.099','(8572240) Giebenach, Lindenplatz','50.072','(8572240) Giebenach, Lindenplatz','16:39:00','16:38:13','16:41:00','16:42:34','00:04:21','00:02:00','ja','ja'],
      ['10.06.2026','50.099','(8572240) Giebenach, Lindenplatz','50.072','(8572240) Giebenach, Lindenplatz','17:09:00','17:08:31','17:11:00','17:12:36','00:04:05','00:02:00','ja','ja'],
    ];
    const rows = [];
    const stops = ['(8572240) Giebenach, Lindenplatz','(8572241) Pratteln, Bahnhof','(4573120) Zürich HB','(4573121) Winterthur, Bahnhof','(8572100) Basel SBB','(8572242) Liestal, Bahnhof'];
    const lines = ['50.099','50.072','50.081','60.040','8.S21','8.S23','62.131','62.132'];
    const dates = ['10.06.2026','11.06.2026','12.06.2026','13.06.2026','16.06.2026','17.06.2026','18.06.2026','19.06.2026','20.06.2026','23.06.2026'];
    for (let i = 0; i < 140; i++) {
      if (i < 10) { rows.push([...base[i]]); continue; }
      const d = dates[Math.floor(i/14) % dates.length];
      const h = 6 + (i % 14);
      const min = (i * 7) % 60;
      const pad = n => String(n).padStart(2,'0');
      const st = `${pad(h)}:${pad(min)}:00`;
      const at = `${pad(h)}:${pad((min + (i%3===0 ? 2 : -1) + 60)%60)}:${pad((i*3)%60)}`;
      const dt = `${pad(h)}:${pad((min+2)%60)}:00`;
      const fat = `${pad(h)}:${pad((min + 2 + (i%5===0 ? 3 : 1))%60)}:${pad((i*2)%60)}`;
      const reached = i%7 !== 0 ? 'ja' : 'nein';
      rows.push([d, lines[i%lines.length], stops[i%stops.length], lines[(i+1)%lines.length], stops[(i+2)%stops.length], st, at, dt, fat, '00:02:'+pad((i*3)%60), '00:02:00', reached, reached]);
    }
    return rows;
  })();

var RPT_DIM_LABELS = {
    linienbuendel_abb: 'rpt_opt_linienbuendel_abb', tu_abb: 'rpt_opt_tu_abb',
    haltestelle_abb: 'rpt_opt_haltestelle_abb', verkehrsmittel_abb: 'rpt_opt_verkehrsmittel_abb',
    linie_abb: 'rpt_opt_linie_abb', linie_zub: 'rpt_opt_linie_zub',
    betriebstag: 'rpt_opt_betriebstag', kw: 'rpt_opt_kw',
  };

var RPT_REAL_DIMS = ['linienbuendel_abb','tu_abb','verkehrsmittel_abb','linie_abb','haltestelle_abb'];

var RPT_DAYS = ['Mo','Di','Mi','Do','Fr','Sa','So'];

var RPT_RECORDS = (function () {
    const out = [];
    RPT_DATA.tus.forEach((tu, ti) => {
      const code = tu.label.split(' ')[0];
      const vm = /Bahn/.test(tu.label) ? 'Bahn' : /Tram/.test(tu.label) ? 'Tram' : 'Bus';
      tu.lines.forEach(line => {
        const n = out.length;
        const place = (line.label.match(/\)\s*\d*\s*([^\-–]+)/) || [])[1];
        out.push({
          v: line.v, tuIdx: ti,
          linienbuendel_abb: tu.label,
          tu_abb: code,
          verkehrsmittel_abb: vm,
          linie_abb: line.label,
          linie_zub: line.label.replace(/^\([^)]*\)\s*/, '') + ' ' + t('rpt_feeder_suffix'),
          haltestelle_abb: place ? place.trim() : '—',
          betriebstag: RPT_DAYS[n % 7],
          kw: 'KW ' + (20 + (n % 6)),
        });
      });
    });
    return out;
  })();

var AUFSCHLUSS_OPTIONS = [
    'linienbuendel_abb', 'tu_abb', 'haltestelle_abb',
    'verkehrsmittel_abb', 'linie_abb', 'linie_zub', 'betriebstag', 'kw'
  ];

var FA_DATA = {
    tus: [
      { id:'AAGL', label:'AAGL', v:[7134,53,3994*60+54,27*60+7,148502,1068],
        tage:[
          {d:'10.06.2026',v:[0,0,0,0,0,0]},
          {d:'12.06.2026',v:[558,9,310*60+57,4*60+26,11577,176], ersatz:'fa_kein_ersatz'},
          {d:'13.06.2026',v:[441,10,256*60+12,5*60+18,9507,211], ersatz:'fa_kein_ersatz'},
          {d:'17.06.2026',v:[540,1,299*60+10,0*60+35,11121,19]},
          {d:'19.06.2026',v:[558,9,310*60+57,4*60+26,11577,176]},
          {d:'20.06.2026',v:[441,10,256*60+12,5*60+18,9507,211]},
          {d:'22.06.2026',v:[540,2,299*60+10,1*60+8,11121,43]},
          {d:'23.06.2026',v:[540,12,299*60+10,5*60+56,11121,232]},
        ]},
      { id:'AAGR', label:'AAGR', v:[4038,258,1910*60+14,116*60+46,78322,4835], tage:[] },
      { id:'AAGS', label:'AAGS', v:[9984,524,4984*60+36,183*60+53,288760,7185], tage:[] },
      { id:'AAGU', label:'AAGU', v:[4582,122,2863*60+12,49*60+14,127552,2260], tage:[] },
      { id:'AB',   label:'AB',   v:[5874,63,2966*60+13,17*60+34,103501,410], tage:[] },
      { id:'ABI',  label:'ABI',  v:[1812,0,729*60+22,0,32077,0], tage:[] },
      { id:'AVA',  label:'AVA',  v:[16220,1058,7180*60+16,500*60+18,285082,17353], tage:[] },
      { id:'AVJ',  label:'AVJ',  v:[620,620,176*60+12,176*60+12,9214,9214], tage:[] },
      { id:'AWA',  label:'AWA',  v:[964,2,411*60+32,0*60+43,15786,28], tage:[] },
      { id:'BBA',  label:'BBA',  v:[3818,54,1682*60+12,7*60+54,78666,225], tage:[] },
      { id:'BLAG', label:'BLAG', v:[6052,381,2150*60+4,92*60+45,131784,4474], tage:[] },
    ],
    gesamt: [953278,33483,432893*60+37,12784*60+13,16079228,395968]
  };

var FA_MASK_DATA = [
    ['23.06.2026','AAGL','811','AAGL BusÜ 1','50.070','70135','','(8572212) Liestal, Bahnhof','01:00:00','(8500852) Reigoldswil, Dorfplatz','01:22:00','18','2. Keine Echtzeitdaten für ganze Fahrt',''],
    ['23.06.2026','AAGL','811','AAGL BusÜ 1','50.070','70137','','(8572212) Liestal, Bahnhof','02:00:00','(8500852) Reigoldswil, Dorfplatz','02:22:00','18','2. Keine Echtzeitdaten für ganze Fahrt',''],
    ['23.06.2026','AAGL','811','AAGL BusÜ 1','50.070','70144','','(8500852) Reigoldswil, Dorfplatz','01:02:00','(8572212) Liestal, Bahnhof','01:27:00','17','2. Keine Echtzeitdaten für ganze Fahrt',''],
    ['23.06.2026','AAGL','811','AAGL BusÜ 1','50.071','71050','','(8500852) Reigoldswil, Dorfplatz','02:28:00','(8572212) Liestal, Bahnhof','02:55:00','17','2. Keine Echtzeitdaten für ganze Fahrt',''],
    ['23.06.2026','AAGL','811','AAGL BusÜ 1','50.071','71070','','(8500852) Reigoldswil, Dorfplatz','01:28:00','(8572212) Liestal, Bahnhof','01:55:00','17','2. Keine Echtzeitdaten für ganze Fahrt',''],
    ['23.06.2026','AAGL','811','AAGL BusÜ 1','50.072','72094','','(8511256) Lupsingen, Gewerbe','01:27:00','(8572212) Liestal, Bahnhof','01:43:00','14','2. Keine Echtzeitdaten für ganze Fahrt',''],
    ['23.06.2026','AAGL','811','AAGL BusÜ 1','50.072','72183','','(8500854) Augst BL, Stundeglas','01:33:00','(8572212) Liestal, Bahnhof','02:09:00','22','2. Keine Echtzeitdaten für ganze Fahrt',''],
    ['23.06.2026','AAGL','811','AAGL BusÜ 1','50.081','81088','','(8500073) Basel, Aeschenplatz','01:02:00','(8572212) Liestal, Bahnhof','01:41:00','23','2. Keine Echtzeitdaten für ganze Fahrt',''],
    ['23.06.2026','AAGL','811','AAGL BusÜ 1','50.081','81090','','(8500073) Basel, Aeschenplatz','01:32:00','(8572212) Liestal, Bahnhof','02:11:00','23','2. Keine Echtzeitdaten für ganze Fahrt',''],
    ['23.06.2026','AAGL','811','AAGL BusÜ 1','50.081','81091','','(8572212) Liestal, Bahnhof','01:16:00','(8500073) Basel, Aeschenplatz','01:54:00','24','2. Keine Echtzeitdaten für ganze Fahrt',''],
    ['23.06.2026','AAGL','811','AAGL BusÜ 1','50.081','81095','','(8572212) Liestal, Bahnhof','02:48:00','(8500073) Basel, Aeschenplatz','03:26:00','24','2. Keine Echtzeitdaten für ganze Fahrt',''],
    ['23.06.2026','AAGL','811','AAGL BusÜ 1','50.070','70201','','(8572212) Liestal, Bahnhof','04:00:00','(8500852) Reigoldswil, Dorfplatz','04:22:00','18','2. Keine Echtzeitdaten für ganze Fahrt',''],
  ];

var FA_UBERSICHT_DATA = {
    GESAMT: { totalMin: 75300, ausMin: 469,
      causes: [
        { label: '2. Keine Echtzeitdaten für ganze Fahrt', color: '#EF9A9A', pct: 88.4 },
        { label: '3. Ganze Fahrt zu früh', color: '#FFCC80', pct: 7.1 },
        { label: '4. Ganze Fahrt über Takt', color: '#7986CB', pct: 4.5 },
      ]},
    AAGL: { totalMin: 239694, ausMin: 1627,
      causes: [
        { label: '2. Keine Echtzeitdaten für ganze Fahrt', color: '#EF9A9A', pct: 97.85 },
        { label: '4. Ganze Fahrt über Takt', color: '#7986CB', pct: 2.15 },
      ]},
    AAGS: { totalMin: 505233, ausMin: 3734,
      causes: [
        { label: '2. Keine Echtzeitdaten für ganze Fahrt', color: '#EF9A9A', pct: 81.3 },
        { label: '3. Ganze Fahrt zu früh', color: '#FFCC80', pct: 11.2 },
        { label: '4. Ganze Fahrt über Takt', color: '#7986CB', pct: 7.5 },
      ]},
    AVJ: { totalMin: 10572, ausMin: 10572,
      causes: [
        { label: '1. Fahrt komplett ausgefallen', color: '#EF5350', pct: 100 },
      ]},
  };

var PUNCT_DATA = {
    gesamt: { soll: 2101488, ist: 2048996, punkt: 1861401, delta: 52492, wert: 90.84 },
    bundles: [
      { label: 'AAGL BusÜ 1', soll: 14048, ist: 13954, punkt: 13106, delta: 94, wert: 93.92,
        lines: [
          { label: '70 Liestal - Bubendorf - Ziefen - Reigoldswil', soll: 3392, ist: 3368, punkt: 3189, delta: 24, wert: 94.69 },
          { label: '71 Liestal - Bubendorf - Arboldswil - Reigoldswil', soll: 1802, ist: 1782, punkt: 1623, delta: 20, wert: 91.08 },
          { label: '72 Augst - Arisdorf - Liestal - Seltisberg - Lupsingen', soll: 2262, ist: 2248, punkt: 2111, delta: 14, wert: 93.91 },
          { label: '80 Liestal - Pratteln - Basel Aeschenplatz', soll: 1640, ist: 1638, punkt: 1508, delta: 2, wert: 92.06 },
          { label: '81 Liestal - Augst - Basel Aeschenplatz', soll: 2344, ist: 2312, punkt: 2200, delta: 32, wert: 95.16 },
          { label: '83 Kaiseraugst - Pratteln Bahnhof Süd (- Pratteln Wanne)', soll: 2608, ist: 2606, punkt: 2475, delta: 2, wert: 94.97 }
        ]
      },
      { label: 'AAGR BusA 1', soll: 9850, ist: 9255, punkt: 7883, delta: 595, wert: 85.18, lines: [] },
      { label: 'AAGS BusÜ 1', soll: 12194, ist: 11772, punkt: 10477, delta: 422, wert: 89.00, lines: [] },
      { label: 'AAGS BusÜ 2', soll: 13241, ist: 12951, punkt: 12214, delta: 290, wert: 94.31, lines: [] },
      { label: 'AAGU BusÜ 1', soll: 10326, ist: 10170, punkt: 9826, delta: 156, wert: 96.62, lines: [] },
      { label: 'AB BahnS 1', soll: 9947, ist: 9912, punkt: 9224, delta: 35, wert: 93.06, lines: [] },
      { label: 'AB BahnS 2', soll: 2268, ist: 2260, punkt: 2157, delta: 8, wert: 95.44, lines: [] },
      { label: 'ABI BusÜ 1', soll: 4161, ist: 4161, punkt: 3775, delta: 0, wert: 90.72, lines: [] },
      { label: 'AFA BusÜ 1', soll: 1238, ist: 1238, punkt: 1141, delta: 0, wert: 92.16, lines: [] },
      { label: 'AMSA BusÜ 1', soll: 4844, ist: 4844, punkt: 4496, delta: 0, wert: 92.82, lines: [] },
      { label: 'ARAG BusÜ 1', soll: 15854, ist: 15521, punkt: 12014, delta: 333, wert: 77.40, lines: [] },
      { label: 'ARL BusÜ 1', soll: 11932, ist: 11932, punkt: 10557, delta: 0, wert: 88.48, lines: [] },
      { label: 'AS BusÜ 1', soll: 1166, ist: 1165, punkt: 968, delta: 1, wert: 83.09, lines: [] },
      { label: 'AVA BahnS 1', soll: 13398, ist: 13337, punkt: 12823, delta: 61, wert: 96.15, lines: [] },
      { label: 'AVA BusÜ 1', soll: 11492, ist: 11352, punkt: 10407, delta: 140, wert: 91.68, lines: [] },
      { label: 'AVA Tram 1', soll: 6342, ist: 6295, punkt: 6107, delta: 47, wert: 97.01, lines: [] },
      { label: 'AVJ BusÜ 1', soll: 1418, ist: 0, punkt: 0, delta: 1418, wert: null, lines: [] },
      { label: 'AWA BusÜ 1', soll: 1598, ist: 1595, punkt: 1540, delta: 3, wert: 96.55, lines: [] },
      { label: 'BBA BusÜ 1', soll: 7410, ist: 7364, punkt: 6450, delta: 46, wert: 87.59, lines: [] },
    ]
  };

var PUNCT_RAW = (function() {
    const total = 4950;
    const rows = [];
    const stops = ['(8500855) Bubendorf, Bad','(8500852) Reigoldswil, Dorfplatz','(8572212) Liestal, Bahnhof','(8572213) Pratteln, Hauptstrasse'];
    const bavLines = ['50.070','50.071','50.072','50.080','50.081','50.083'];
    const tuLines  = [70, 71, 72, 80, 81, 83];
    const fahrtIds = [70001,70003,70005,70007,71001,71003,72001,72003,80001,80003];
    const lfdNrs   = [0,4,17,9,13,0,4,17,9,13];
    const anDeltas = [0,3,8,-112,21,-28,5,0,41,-11];
    const abDeltas = [56,0,55,101,21,27,12,0,83,265];
    function p2(n) { return String(n).padStart(2,'0'); }
    function fmtD(sec) {
      if (!sec) return '00:00:00';
      const a=Math.abs(sec), s=sec<0?'-':'';
      return `${s}${p2(Math.floor(a/3600))}:${p2(Math.floor((a%3600)/60))}:${p2(a%60)}`;
    }
    for (let i = 0; i < total; i++) {
      const day = p2(10 + (i % 14));
      const h = p2(5 + (i % 16));
      const m = p2((i * 3) % 60);
      const date = `${day}.06.2026`;
      const soll = `${date} ${h}:${m}:00`;
      const anD = anDeltas[i % 10];
      const abD = abDeltas[i % 10];
      const istAnM = p2(((i * 3) + Math.floor(Math.abs(anD) / 60)) % 60);
      const istAn = `${date} ${h}:${istAnM}:${p2(Math.abs(anD) % 60)}`;
      const abM = p2(((i * 3) + 2) % 60);
      const sollAb = `${date} ${h}:${abM}:00`;
      const istAbM = p2(((i * 3) + 2 + Math.floor(abD / 60)) % 60);
      const istAb = `${date} ${h}:${istAbM}:${p2(abD % 60)}`;
      const hasAn = (i % 5) !== 2;
      const hasAb = (i % 7) !== 3;
      rows.push([
        date, bavLines[i%6], 'ja', tuLines[i%6], fahrtIds[i%10],
        i%2===0?'Hinrichtung':'Rückrichtung',
        lfdNrs[i%10], stops[i%4],
        hasAn?soll:'', hasAn?soll:'', hasAn?istAn:'',
        hasAn?fmtD(anD):'', hasAn?fmtD(anD):'',
        hasAb?sollAb:'', hasAb?sollAb:'', hasAb?istAb:'',
        hasAb?fmtD(abD):'', hasAb?fmtD(abD):'',
      ]);
    }
    return rows;
  })();

var PUNCT_DIM_LABELS = {
    linienbuendel: 'rpt_col_name', linie: 'fa_opt_linie', haltestelle: 'punct_dim_haltestelle',
    monat: 'punct_dim_monat', kw: 'rpt_opt_kw', betriebstag: 'fa_opt_tag',
    tu_konz: 'punct_dim_tu_konz', tu_fahr: 'punct_dim_tu_fahr',
    vm: 'fa_opt_vm', region: 'fa_opt_region',
  };

var PUNCT_REAL_DIMS = ['linienbuendel','linie','tu_konz','tu_fahr','vm'];

var PUNCT_MONTHS = ['Januar','Februar','März','April','Mai','Juni'];

var PUNCT_DAYS = ['Mo','Di','Mi','Do','Fr','Sa','So'];

var PUNCT_REGIONS = ['Nordwestschweiz','Mittelland','Ostschweiz','Zentralschweiz','Ticino'];

var PUNCT_RECORDS = (function () {
    const out = [];
    PUNCT_DATA.bundles.forEach((b, bi) => {
      const tu = b.label.split(' ')[0];
      const vm = /Bahn/.test(b.label) ? 'Bahn' : /Tram/.test(b.label) ? 'Tram' : 'Bus';
      const src = (b.lines && b.lines.length) ? b.lines : [{ label: b.label, soll: b.soll, ist: b.ist, punkt: b.punkt, delta: b.delta, wert: b.wert, collective: true }];
      src.forEach((r, ri) => {
        const n = out.length;
        const place = (r.label.match(/\d+\s+([^\-–]+)/) || [])[1];
        out.push({
          _soll: r.soll, _ist: r.ist, _punkt: r.punkt,
          get soll() { return scl(this._soll); },
          get ist()  { return scl(this._ist);  },
          get punkt(){ return sclPunkt(this._punkt, this._ist);},
          get delta(){ return scl(this._soll) - scl(this._ist); },
          bundleIdx: bi,
          linienbuendel: b.label,
          linie: r.collective ? `${b.label} (${t('punct_collective')})` : r.label,
          haltestelle: place ? place.trim() : '—',
          tu_konz: tu, tu_fahr: tu, vm,
          monat: PUNCT_MONTHS[n % PUNCT_MONTHS.length],
          kw: 'KW ' + (20 + (n % 6)),
          betriebstag: PUNCT_DAYS[n % 7],
          region: PUNCT_REGIONS[bi % PUNCT_REGIONS.length],
        });
      });
    });
    return out;
  })();

var PUNCT_THRESHOLD = 90;

var RD_TU = [
    ['AAGL','Autobus AG Liestal Öffentlicher Verkehr'],
    ['AAGR','Auto AG Rothenburg'],
    ['AAGS','Auto AG Schwyz'],
    ['AAGU','AUTO AG URI'],
    ['AB','Appenzeller Bahnen'],
    ['BLS','BLS AG'],
    ['PostAuto','PostAuto AG'],
    ['SBB','Schweizerische Bundesbahnen'],
    ['THURBO','THURBO AG'],
  ];

var RD_LINE_GROUPS = [
    { bundle: 'AAGL BusÜ 1', lines: [
      ['50.070','70 Liestal - Bubendorf - Ziefen - Reigoldswil'],
      ['50.071','71 Liestal - Bubendorf - Arboldswil - Reigoldswil'],
      ['50.072','72 Augst - Arisdorf - Liestal - Seltisberg - Lupsingen'],
      ['50.080','80 Liestal - Pratteln - Basel Aeschenplatz'],
    ]},
    { bundle: 'AAGR BusA 1', lines: [
      ['60.040','40 Littau Bahnhof - Bahnhof Süd - Flugzeugwerke - Wankdorf'],
    ]},
    { bundle: 'AB BahnS 1', lines: [
      ['8.S21','S21/S22 Appenzell - Gais - St. Gallen (- Trogen)'],
      ['8.S23','S23 Gossau SG - Herisau - Appenzell - Wasserauen'],
    ]},
  ];

var RD_STOPS = [
    ['8500073','Basel, Aeschenplatz'],
    ['8500753','Bretzwil, Dorf'],
    ['8500799','Seltisberg, Zentrum Schule'],
    ['8500850','Bubendorf, Zentrum'],
    ['8500855','Bubendorf, Bad'],
    ['8572212','Liestal, Bahnhof'],
    ['8572213','Pratteln, Hauptstrasse'],
  ];

var RD_MONTHS_KEY = { en: 'MONTH_NAMES', de: 'MONTH_NAMES' };

var DQI_INDICATORS = [
    { n: 1,  key: 'dqi_ind_1'  },
    { n: 2,  key: 'dqi_ind_2'  },
    { n: 3,  key: 'dqi_ind_3'  },
    { n: 4,  key: 'dqi_ind_4'  },
    { n: 5,  key: 'dqi_ind_5'  },
    { n: 6,  key: 'dqi_ind_6'  },
    { n: 7,  key: 'dqi_ind_7'  },
    { n: 8,  key: 'dqi_ind_8'  },
    { n: 9,  key: 'dqi_ind_9'  },
    { n: 10, key: 'dqi_ind_10' },
  ];

var DQI_NATIONAL = [99.91, 97.49, 99.34, 98.41, 98.39, 99.81, 99.79, 99.73, 99.40, 95.02];

var DQI_TU = [
    { label: 'Gesamt', v: [99.10, 98.89, 98.60, 99.01, 98.34, 98.17, 99.96, 99.96, 99.46, 95.51], total: true },
    { label: 'BLS',    v: [99.15, 99.81, 99.75, 99.68, 99.26, 96.37, 100.00, 100.00, 100.00, 98.71] },
    { label: 'RA',     v: [100.00, 99.19, 99.07, 98.33, 96.79, 99.34, 100.00, 100.00, 99.62, 96.55] },
    { label: 'SBB',    v: [98.89, 98.40, 98.06, 99.31, 99.28, 99.28, 99.93, 99.93, 99.50, 94.97],
      children: [
        { label: '11',  gono: true, v: [99.46, 99.50, 99.32, 98.61, 98.07, 99.92, 99.62, 100.00, 99.88, 95.25],
          children: [
            { label: 'SBB Arc Jurassien',    v: [99.51, 99.62, 99.40, 98.72, 98.20, 99.94, 99.70, 100.00, 99.90, 95.60] },
            { label: 'SBB Genève',           v: [99.38, 99.41, 99.18, 98.40, 97.85, 99.88, 99.55, 100.00, 99.82, 94.80] },
            { label: 'SBB Mittelland',       v: [99.60, 99.58, 99.44, 98.81, 98.32, 99.95, 99.71, 100.00, 99.93, 95.71] },
            { label: 'SBB Nordwestschweiz',  v: [99.44, 99.47, 99.29, 98.55, 98.01, 99.90, 99.60, 100.00, 99.86, 95.10] },
            { label: 'SBB Ticino',           v: [98.71, 83.12, 82.90, 96.11, 94.02, 99.44, 97.98, 99.20, 98.55, 76.44] },
            { label: 'SBB Vaud',             v: [99.36, 99.44, 99.22, 98.47, 97.92, 99.89, 99.58, 100.00, 99.84, 94.95] },
            { label: 'SBB Zentralschweiz',   v: [99.58, 99.55, 99.41, 98.77, 98.28, 99.94, 99.69, 100.00, 99.92, 95.66] },
          ] },
        { label: '33',  gono: true, v: [99.50, 99.32, 99.07, 98.61, 98.07, 99.62, 100.00, 100.00, 99.62, 94.97] },
        { label: '53',  gono: true, v: [100.00, 99.32, 99.29, 98.61, 96.91, 100.00, 100.00, 100.00, 99.32, 96.91] },
        { label: '65',  gono: true, v: [98.61, 99.25, 98.61, 95.25, 96.91, 98.61, 99.97, 99.97, 98.61, 92.87] },
        { label: '73',  gono: true, v: [98.07, 99.92, 98.07, 77.23, 95.47, 98.07, 99.92, 99.92, 98.07, 77.23] },
        { label: '74',  gono: true, v: [99.92, 99.62, 99.92, 92.41, 95.47, 99.92, 99.62, 99.62, 99.92, 92.41] },
        { label: '78',  gono: true, v: [99.62, 98.80, 99.62, 98.80, 98.71, 99.62, 100.00, 100.00, 99.62, 98.80] },
        { label: '82',  gono: true, v: [100.00, 83.99, 100.00, 80.96, 83.99, 100.00, 100.00, 100.00, 100.00, 83.99] },
        { label: '351', gono: true, v: [99.88, 99.47, 99.88, 96.55, 99.36, 99.88, 100.00, 100.00, 99.98, 12.65] },
      ] },
    { label: 'SBB-D',  v: [100.00, 98.84, 99.74, 49.94, 42.89, 99.97, 99.77, 99.88, 99.98, 12.65] },
    { label: 'SOB',    v: [99.87, 99.90, 99.87, 99.85, 99.31, 97.47, 100.00, 100.00, 99.88, 99.47] },
    { label: 'SZU',    v: [100.00, 99.91, 99.49, 99.06, 99.07, 99.98, 100.00, 100.00, 100.00, 99.36] },
    { label: 'THURBO', v: [99.65, 99.88, 99.83, 99.53, 99.14, 95.27, 100.00, 100.00, 100.00, 97.18] },
    { label: 'TPF',    v: [94.62, 90.12, 84.72, 99.01, 99.11, 99.84, 100.00, 100.00, 80.96, 83.99] },
    { label: 'TRN',    v: [100.00, 99.68, 99.57, 94.89, 95.21, 99.26, 100.00, 100.00, 100.00, 89.81] },
  ];

var DQI_KANTON = [
    { label: 'Aargau',                 v: [99.74, 99.73, 99.31, 98.86, 98.42, 99.60, 99.88, 99.88, 99.44, 89.12] },
    { label: 'Appenzell Ausserrhoden', v: [99.20, 99.10, 98.88, 97.94, 97.51, 99.31, 99.62, 99.62, 99.05, 92.40] },
    { label: 'Basel-Landschaft',       v: [99.55, 99.41, 99.12, 98.60, 98.11, 99.52, 99.80, 99.80, 99.33, 94.05] },
    { label: 'Bern',                   v: [99.68, 99.29, 99.20, 98.72, 98.30, 99.58, 99.85, 99.85, 99.40, 95.88] },
    { label: 'Genève',                 v: [98.90, 96.44, 97.80, 96.21, 95.60, 98.92, 99.31, 99.31, 98.44, 87.02] },
    { label: 'Ticino',                 v: [98.42, 77.76, 95.10, 94.88, 93.71, 98.40, 98.90, 98.90, 97.66, 78.44] },
    { label: 'Zürich',                 v: [99.81, 99.62, 99.48, 99.10, 98.77, 99.72, 99.94, 99.94, 99.61, 96.70] },
  ];

function chooseTypeFromDialog(key) {
    closeTypeDialog();
    openEvaluationPage(key);
  }

function newEvaluation() {
    if (evalVariant === 1) { openTypeDialog(); return; }
    openEvaluationPage('');
  }

function qxNavGo(view) {
    closeQxNav();
    showView(view);
  }

function t(key) {
    return (translations[lang] || translations.en)[key] || key;
  }

function setLang(newLang) {
    lang = newLang;
    applyLang();
  }

function isSchedulingAllowed() {
    return state.selectedPeriod !== 'custom';
  }

function buildDaysSuffix() {
    const allSelected = ALL_DAYS.every(d => state.selectedDays.includes(d));
    if (allSelected) return '';
    const days = state.selectedDays;
    if (days.length === 0) return '';
    // Check if it's a contiguous range like Mon–Fri
    const indices = days.map(d => ALL_DAYS.indexOf(d)).sort((a, b) => a - b);
    const isContiguous = indices.every((v, i) => i === 0 || v === indices[i - 1] + 1);
    const labels = DAY_LABELS[lang] || DAY_LABELS.en;
    if (isContiguous && days.length > 2) {
      return ', ' + labels[ALL_DAYS[indices[0]]] + '–' + labels[ALL_DAYS[indices[indices.length - 1]]];
    }
    return ', ' + days.map(d => labels[d]).join(', ');
  }

function buildFilterSuffix() {
    let parts = [];

    if (state.selectedTU.length > 0) {
      parts.push(state.selectedTU.join(', '));
    }

    if (state.selectedCantons.length > 0) {
      parts.push(t('canton_label') + ' ' + state.selectedCantons.join(', '));
    }

    if (state.selectedLines.length > 0) {
      parts.push(t('filter_lines') + ': ' + state.selectedLines.join(', '));
    }

    if (state.selectedStops.length > 0) {
      parts.push(t('filter_stops') + ': ' + state.selectedStops.join(', '));
    }

    const daysSuffix = buildDaysSuffix();
    let base = parts.length === 0 ? ', ' + t('all_lines') : ', ' + parts.join(', ');
    return base + daysSuffix;
  }

function formatDate(str) {
    const d = new Date(str);
    return d.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

function infoRow(icon, html) {
    return '<div class="info-contact-row"><span class="material-icons">' + icon + '</span><div>' + html + '</div></div>';
  }

function infoBlock(label, html) {
    return '<div class="info-block"><div class="info-label">' + label + '</div>' + html + '</div>';
  }

function buildInfoContent(key) {
    const de = infoLang() === 'de';

    if (key === 'impressum') {
      return infoBlock(de ? 'Herausgeber' : 'Publisher',
               'Bundesamt für Verkehr BAV<br>Abteilung Finanzierung<br>3003 Bern, Schweiz')
           + infoBlock(de ? 'Betrieb und technische Umsetzung' : 'Operation and technical implementation',
               'ETC Solutions GmbH<br>Musterstrasse 12<br>3000 Bern, Schweiz')
           + infoBlock(de ? 'Anwendung' : 'Application', 'QMS RPV CH · Q-Explorer · v1.7.28')
           + infoBlock(de ? 'Haftung' : 'Liability',
               de ? 'Die Kennzahlen basieren auf den von den Transportunternehmen gelieferten Rohdaten. Für Vollständigkeit und Richtigkeit der gelieferten Daten wird keine Haftung übernommen.'
                  : 'Metrics are based on raw data supplied by the transport companies. No liability is accepted for the completeness or accuracy of the supplied data.')
           + '<div class="info-placeholder-note">' + (de
               ? 'Platzhaltertext im Prototyp — finale Angaben liefert das BAV.'
               : 'Placeholder text in the prototype — final wording to be supplied by the BAV.') + '</div>';
    }

    if (key === 'dokumente') {
      const rows = INFO_DOCS.map(d =>
        '<div class="info-doc-row">'
        + '<div class="info-doc-icon"><span class="material-icons" style="font-size:18px;">description</span></div>'
        + '<div><div class="info-doc-name">' + (de ? d.name.de : d.name.en) + '</div>'
        + '<div class="info-doc-meta">' + d.meta + '</div></div>'
        + '<button class="info-doc-dl" onclick="showToast(\'' + (de ? 'Download gestartet' : 'Download started') + '\')" aria-label="Download">'
        + '<span class="material-icons">download</span></button>'
        + '</div>').join('');
      return '<div class="info-block">' + rows + '</div>'
           + '<div class="info-placeholder-note">' + (de
               ? 'Beispielliste im Prototyp — welche Dokumente hier stehen, ist noch offen.'
               : 'Example list in the prototype — the final document set is still open.') + '</div>';
    }

    if (key === 'support') {
      return infoBlock(de ? 'Erreichbarkeit' : 'Availability',
               de ? 'Montag bis Freitag, 08:00–17:00 Uhr (MEZ)' : 'Monday to Friday, 08:00–17:00 (CET)')
           + infoBlock(de ? 'Kontakt' : 'Contact',
               infoRow('mail', '<a href="mailto:support@etc-solutions.de">support@etc-solutions.de</a>')
             + infoRow('call', '+41 31 000 00 00'))
           + infoBlock(de ? 'Bei einer Fehlermeldung' : 'When reporting an error',
               de ? 'Bitte Zeitstempel und Name der Auswertung angeben — beides steht in der Fehlermeldung und im Kopf des Berichts.'
                  : 'Please include the timestamp and the evaluation name — both appear in the error message and in the report header.')
           + '<div class="info-placeholder-note">' + (de
               ? 'Kontaktangaben sind Platzhalter.'
               : 'Contact details are placeholders.') + '</div>';
    }

    // kontakt
    return infoBlock(de ? 'Fachliche Fragen zu den Kennzahlen' : 'Questions about the metrics',
             'Bundesamt für Verkehr BAV<br>' + (de ? 'Fachstelle Qualitätsmessung RPV' : 'Quality measurement unit RPV')
             + '<br>' + infoRow('mail', '<a href="mailto:qualitaet@bav.admin.ch">qualitaet@bav.admin.ch</a>'))
         + infoBlock(de ? 'Technische Fragen zur Anwendung' : 'Technical questions about the application',
             'ETC Solutions GmbH<br>'
             + infoRow('mail', '<a href="mailto:support@etc-solutions.de">support@etc-solutions.de</a>')
             + infoRow('call', '+41 31 000 00 00'))
         + infoBlock(de ? 'Postadresse' : 'Postal address',
             'Bundesamt für Verkehr BAV<br>Abteilung Finanzierung<br>3003 Bern, Schweiz')
         + '<div class="info-placeholder-note">' + (de
             ? 'Adressen und Telefonnummern sind Platzhalter.'
             : 'Addresses and phone numbers are placeholders.') + '</div>';
  }

function fmtDMY(d) {
    const p2 = n => String(n).padStart(2, '0');
    return `${p2(d.getDate())}.${p2(d.getMonth() + 1)}.${d.getFullYear()}`;
  }

function periodFromKey(key) {
    const end = new Date(PROTO_TODAY), start = new Date(PROTO_TODAY);
    switch (key) {
      case 'last_7_days':  start.setDate(end.getDate() - 6); break;
      case 'last_30_days': start.setDate(end.getDate() - 29); break;
      case 'this_month':   start.setDate(1); break;
      case 'last_month':
        start.setMonth(start.getMonth() - 1, 1);
        end.setMonth(end.getMonth(), 0);
        break;
      case 'this_year':    start.setMonth(0, 1); break;
      case 'last_year':
        start.setFullYear(start.getFullYear() - 1, 0, 1);
        end.setFullYear(end.getFullYear() - 1, 11, 31);
        break;
      default:             start.setDate(end.getDate() - 13);
    }
    return { von: fmtDMY(start), bis: fmtDMY(end), days: Math.round((end - start) / 86400000) + 1 };
  }

function rowPeriod(row) {
    if (row && row.dataset.von && row.dataset.bis) {
      const days = (() => {
        const a = faMaskStamp(row.dataset.von), b = faMaskStamp(row.dataset.bis);
        if (!a || !b) return 14;
        const d = x => new Date(Math.floor(x / 100000000), Math.floor((x % 100000000) / 1000000) - 1, Math.floor((x % 1000000) / 10000));
        return Math.round((d(b) - d(a)) / 86400000) + 1;
      })();
      return { von: row.dataset.von, bis: row.dataset.bis, days };
    }
    return periodFromKey(row ? row.dataset.period : '');
  }

function evalStamp(row) {
    return row && row.dataset.created ? row.dataset.created : '25.06.2026 22:54:42';
  }

function evalHash(row) {
    const name = (row && row.dataset.name) || '';
    let h = 0;
    for (const ch of name) h = (h * 33 + ch.charCodeAt(0)) % 1009;
    return h;
  }

function evalPctShift(row) {
    return 1 + ((evalHash(row) % 31) - 15) / 1000;
  }

function evalScale(row, period) {
    const name = (row && row.dataset.name) || '';
    const scoped = /Kanton|SBB|BLS|Tarifverbund|ZH|BE|PostAuto/i.test(name);
    const base = Math.min(3, Math.max(0.25, (period.days || 14) / 30));
    let h = 0;
    for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 997;
    return (scoped ? base * 0.35 : base) * (0.92 + (h % 17) / 100);
  }

function punctChartSnapshot() {
    showRptApplyToast(t('chart_snapshot_done'));
  }

function faMaskApply() {
    const [von, bis] = faMaskDateInputs().map(i => (i.value || '').trim());
    _faMaskRange = { von, bis };
    faMaskPage = 1;
    renderFaMaskTable();
    showRptApplyToast(von || bis ? t('fa_mask_applied') : t('fa_mask_applied_all'));
  }

function faMaskReset() {
    faMaskDateInputs().forEach(i => { i.value = ''; });
    _faMaskRange = { von: '', bis: '' };
    faMaskPage = 1;
    renderFaMaskTable();
    showRptApplyToast(t('fa_mask_reset_done'));
  }

function faMaskStamp(v) {
    const m = String(v || '').match(/(\d{2})\.(\d{2})\.(\d{4})(?:[,\s]+(\d{2}):(\d{2}))?/);
    if (!m) return null;
    return Number(m[3] + m[2] + m[1] + (m[4] || '00') + (m[5] || '00'));
  }

function cfConfirm() { cfClose(true); }

function cfCancel() { cfClose(false); }

function wizardBack() {
    if (state.isEditingSchedule) {
      showView('scheduled');
      state.isEditingSchedule = false;
    } else {
      newEvaluation();
    }
  }

function saveScheduleChanges() {
    showView('scheduled');
    showToast(lang === 'en' ? 'Schedule updated' : 'Zeitplan aktualisiert');
    state.isEditingSchedule = false;
  }

function clearFilter(name, e) {
    e.stopPropagation();
    if (name === 'rpv')    { state.selectedRPV = []; updateRPVLabel(); }
    if (name === 'mode')   { state.selectedModes = []; renderModeOptions(); updateModeLabel(); }
    if (name === 'tu')     { state.selectedTU = []; updateTULabel(); }
    if (name === 'canton') { state.selectedCantons = []; updateCantonLabel(); renderCantonOptions(''); }
    if (name === 'lines')  { state.selectedLines = []; updateLinesLabel(); renderLinesOptions(); }
    if (name === 'stops')  { state.selectedStops = []; updateStopsLabel(); renderStopsOptions(); }
    updateCascade();
    updateAutoName();
  }

function filterCantons(query) {
    renderCantonOptions(query);
  }

function filterLines(query) {
    renderLinesOptions();
  }

function toggleLine(line) {
    const idx = state.selectedLines.indexOf(line);
    if (idx >= 0) state.selectedLines.splice(idx, 1);
    else state.selectedLines.push(line);
    updateLinesLabel();
    renderLinesOptions();
    updateAutoName();
  }

function filterStops(query) {
    renderStopsOptions();
  }

function initCantonDropdown() {
    renderCantonOptions('');
  }

function editEvaluation(link) {
    const row = link.closest('tr');
    const name = row.dataset.name || '';
    newEvaluation();
    showToast((lang === 'en' ? 'Edit: ' : 'Bearbeiten: ') + name);
  }

function showErrorDetails() {
    const msg = lang === 'en'
      ? 'Error details:\n\nData source unreachable (timeout after 30s)\nTimestamp: 22.05.2026 14:32:07\n\nPlease try again later or contact support.'
      : 'Fehlerdetails:\n\nDatenquelle nicht erreichbar (Timeout nach 30s)\nZeitstempel: 22.05.2026 14:32:07\n\nBitte versuchen Sie es später erneut oder wenden Sie sich an den Support.';
    alert(msg);
  }

function updateCascade() {
    let allowedTU = new Set(ALL_TU.map(tu => tu.id));

    // RPV filter
    if (state.selectedRPV.length > 0) {
      let rpvTUs = new Set();
      state.selectedRPV.forEach(rpv => {
        if (DATA.rpv[rpv]) DATA.rpv[rpv].tu.forEach(tu => rpvTUs.add(tu));
      });
      allowedTU = new Set([...allowedTU].filter(id => rpvTUs.has(id)));
    }

    // Transport mode filter — empty selectedModes means all modes
    if (state.selectedModes.length > 0) {
      const cascadeModeIds = new Set(
        FLAT_MODES.filter(m => state.selectedModes.includes(m.id)).map(m => m.cascade)
      );
      let modeTUs = new Set();
      cascadeModeIds.forEach(modeId => {
        if (DATA.modes[modeId]) DATA.modes[modeId].forEach(tu => modeTUs.add(tu));
      });
      allowedTU = new Set([...allowedTU].filter(id => modeTUs.has(id)));
    }

    // Canton filter
    if (state.selectedCantons.length > 0) {
      let cantonTUs = new Set();
      state.selectedCantons.forEach(c => {
        if (DATA.cantonTU[c]) DATA.cantonTU[c].forEach(tu => cantonTUs.add(tu));
      });
      if (cantonTUs.size > 0) {
        allowedTU = new Set([...allowedTU].filter(id => cantonTUs.has(id)));
      }
    }

    // Auto-uncheck TUs that became disallowed
    state.selectedTU = state.selectedTU.filter(id => allowedTU.has(id));

    renderTUOptions(allowedTU);
    updateCantonDropdown();
    renderLinesOptions();
    updateTULabel();
    updateFilterBadge();
    updateAutoName();
  }

function fmtVal(v) {
    if (v === null || v === undefined || v === '') return '<span class="rpt-val-na">n/a</span>';
    const cls = v >= RPT_THRESHOLD ? 'rpt-val-good' : 'rpt-val-bad';
    return `<span class="rpt-val ${cls}">${v.toFixed(2)}%</span>`;
  }

function rptAggregate(recs) {
    const n = RPT_DATA.gesamt.length;
    return Array.from({ length: n }, (_, i) => {
      const vals = recs.map(r => r.v[i]).filter(v => v !== null && v !== undefined);
      if (!vals.length) return null;
      return vals.reduce((a, b) => a + b, 0) / vals.length;
    });
  }

function rptBuildTree(recs, dims) {
    if (!dims.length) return [];
    const [dim, ...rest] = dims;
    const map = new Map();
    recs.forEach(r => { if (!map.has(r[dim])) map.set(r[dim], []); map.get(r[dim]).push(r); });
    return [...map.entries()].map(([label, group]) => ({
      label, v: rptAggregate(group), tuIdx: group[0].tuIdx,
      children: rptBuildTree(group, rest),
    }));
  }

function closeRptChart() {
    showView('report-connection');
  }

function closeRptRaw() {
    showView('report-connection');
  }

function rptRawFilterChanged() { rptCurrentPage = 1; renderRawTable(); }

function rptGoPage(p) {
    rptCurrentPage = p;
    renderRawTable();
  }

function closeConnectionReport() {
    showView('reports-list');
  }

function fmtMin(m) {
    if (!m && m !== 0) return 'n/a';
    const h = Math.floor(Math.abs(m)/60), mn = Math.abs(m)%60;
    return `${String(h).padStart(2,'0')}:${String(mn).padStart(2,'0')}:00`;
  }

function faPct(aus, total) { return total ? (aus/total*100) : 0; }

function faPctCell(aus, total) {
    const pct = faPct(aus, total);
    if (pct === 0) return `<span class="fa-rate-zero">0.00%</span>`;
    if (pct >= 50) return `<span class="fa-rate-critical">${pct.toFixed(2)}%</span>`;
    if (pct >= 5)  return `<span class="fa-rate-high">${pct.toFixed(2)}%</span>`;
    if (pct >= 2)  return `<span class="fa-rate-medium">${pct.toFixed(2)}%</span>`;
    return `<span class="fa-rate-ok">${pct.toFixed(2)}%</span>`;
  }

function faNum(n) { return n.toLocaleString('de-CH'); }

function faMaskKey(tuId, tagD) { return tuId + '|' + (tagD || ''); }

function faMaskElemId(tuId, tagD) { return 'fa-act-' + (tuId + '_' + (tagD || '')).replace(/[^a-z0-9]/gi, '_'); }

function faMaskHashHref(tuId, tagD) { return '#mask/' + encodeURIComponent(tuId) + (tagD ? '/' + encodeURIComponent(tagD) : ''); }

function renderFAMaskBtnHtml(tuId, tagD) {
    const key = faMaskKey(tuId, tagD);
    const state = faMaskBtnState[key] || 'idle';
    const maskArgs = tagD ? `'${tuId}','${tagD}'` : `'${tuId}'`;
    if (state === 'loading') {
      return `<button class="rpt-act-btn rpt-act-btn-raw is-loading" disabled title="${t('fa_mask_loading')}"><span class="material-icons">hourglass_top</span></button>`;
    } else if (state === 'ready') {
      return `<a class="rpt-act-btn rpt-act-btn-raw is-ready" href="${faMaskHashHref(tuId, tagD)}" title="${t('fa_mask_ready')}" onclick="openFAMask(${maskArgs}); return false;"><span class="material-icons">check_circle</span></a>`;
    } else if (state === 'error') {
      return `<button class="rpt-act-btn rpt-act-btn-raw is-error" title="${t('fa_mask_error')}" onclick="requestFAMask(${maskArgs})"><span class="material-icons">error_outline</span></button>`;
    }
    return `<button class="rpt-act-btn rpt-act-btn-raw" title="${t('fa_mask_title')}" onclick="requestFAMask(${maskArgs})"><span class="material-icons">fact_check</span></button>`;
  }

function requestFAMask(tuId, tagD) {
    const key = faMaskKey(tuId, tagD);
    if (faMaskBtnState[key] === 'loading') return;
    faMaskBtnState[key] = 'loading';
    updateFAMaskBtn(tuId, tagD);
    // Simulate async report generation (2–3 s)
    setTimeout(() => {
      faMaskBtnState[key] = 'ready';
      updateFAMaskBtn(tuId, tagD);
    }, 2000 + Math.random() * 1000);
  }

function setFAChartMetric(idx) {
    faChartMetric = idx;
    _syncFAChartToggle();
    _drawFAChart();
  }

function _drawFAChart() {
    if (faChartTu) drawFALineChart(faChartTu);
    else drawFABarChart();
  }

function fmtHM(min) {
    const h = Math.floor(Math.abs(min) / 60);
    const m = Math.abs(min) % 60;
    return `${h}h ${m}min`;
  }

function fmtN(n) {
    if (n === null || n === undefined) return '';
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

function punctAggregate(recs) {
    const a = recs.reduce((m, r) => ({
      soll: m.soll + (r.soll || 0), ist: m.ist + (r.ist || 0),
      punkt: m.punkt + (r.punkt || 0), delta: m.delta + (r.delta || 0),
    }), { soll: 0, ist: 0, punkt: 0, delta: 0 });
    a.wert = a.ist > 0 ? (a.punkt / a.ist) * 100 : null;
    a.n = recs.length;
    return a;
  }

function punctBuildTree(recs, dims) {
    if (!dims.length) return [];
    const [dim, ...rest] = dims;
    const map = new Map();
    recs.forEach(r => {
      const key = r[dim];
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(r);
    });
    return [...map.entries()].map(([label, group]) => ({
      label, dim,
      agg: punctAggregate(group),
      bundleIdx: group[0].bundleIdx,
      children: punctBuildTree(group, rest),
    }));
  }

function rdShiftMonth(delta) {
    rdState.leftMonth = new Date(rdState.leftMonth.getFullYear(), rdState.leftMonth.getMonth() + delta, 1);
    rdRenderMonths();
  }

function rdSetMonth(which, part, value) {
    const base = new Date(rdState.leftMonth);
    if (which === 'right') base.setMonth(base.getMonth() + 1);
    if (part === 'm') base.setMonth(Number(value));
    else base.setFullYear(Number(value));
    rdState.leftMonth = which === 'right'
      ? new Date(base.getFullYear(), base.getMonth() - 1, 1)
      : new Date(base.getFullYear(), base.getMonth(), 1);
    rdRenderMonths();
  }

function rdIsoWeek(d) {
    const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const day = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    return Math.ceil(((t - yearStart) / 86400000 + 1) / 7);
  }

function rdPickDay(y, m, d) {
    const day = new Date(y, m, d);
    if (!rdState.draftFrom || (rdState.draftFrom && rdState.draftTo)) {
      rdState.draftFrom = day; rdState.draftTo = null;
    } else if (day < rdState.draftFrom) {
      rdState.draftTo = rdState.draftFrom; rdState.draftFrom = day;
    } else {
      rdState.draftTo = day;
    }
    rdRenderMonths();
  }

function rdPreset(which) {
    const base = new Date(PROTO_TODAY);
    if (which === 'this') {
      rdState.draftFrom = new Date(base.getFullYear(), base.getMonth(), 1);
      rdState.draftTo = base;
    } else {
      rdState.draftFrom = new Date(base.getFullYear(), base.getMonth() - 1, 1);
      rdState.draftTo = new Date(base.getFullYear(), base.getMonth(), 0);
    }
    rdState.leftMonth = new Date(rdState.draftFrom.getFullYear(), rdState.draftFrom.getMonth(), 1);
    rdRenderMonths();
  }

function rdDownload(name) {
    showRptApplyToast(t('rd_download_started').replace('{name}', name));
  }

function rdDeleteExport(i) {
    const removed = rdState.exports[i];
    cfAsk('rd_del_title', 'rd_del_body', 'cf_delete').then(ok => {
      if (!ok) return;
      rdState.exports.splice(i, 1);
      rdRenderExports();
      showUndoToast(t('rd_deleted'), () => { rdState.exports.splice(i, 0, removed); rdRenderExports(); });
    });
  }

function dqiBand(i) {
    const vals = [...DQI_TU, ...DQI_KANTON]
      .filter(e => !e.total)
      .map(e => e.v[i])
      .filter(v => typeof v === 'number');
    return { min: Math.min(...vals), max: Math.max(...vals) };
  }

function dqiDimChanged() {
    dqiFillEntities();
    renderDqiOverview();
  }

function dqiSpark(label, i, points) {
    let h = i * 7 + points;
    for (const ch of label) h = (h * 31 + ch.charCodeAt(0)) % 601;
    const vals = Array.from({ length: points }, (_, k) => {
      h = (h * 37 + 11) % 601;
      return 50 + (h % 40) - 20 + (k * ((h % 5) - 2)) / 4;
    });
    const min = Math.min(...vals), max = Math.max(...vals), span = Math.max(1, max - min);
    const pts = vals.map((v, k) => `${(k / (points - 1)) * 64 + 1},${28 - ((v - min) / span) * 24}`).join(' ');
    const rising = vals[vals.length - 1] >= vals[0];
    return `<svg class="dqi-spark" viewBox="0 0 66 30" role="img" aria-label="${t(rising ? 'dqi_trend_up' : 'dqi_trend_down')}">
      <polyline points="${pts}" fill="none" stroke="${rising ? '#16A34A' : '#DC2626'}" stroke-width="1.2"/></svg>`;
  }

function openDqiChart(label) {
    const flat = [];
    const walk = list => list.forEach(e => { flat.push(e); if (e.children) walk(e.children); });
    walk(dqiEntities());
    const entity = flat.find(e => e.label === label);
    const items = entity && entity.children && entity.children.length ? entity.children : [entity];
    _punctChartScale = 1;
    _punctChartPeriod = label;
    _punctChartSub = t('type_data_quality');
    _punctChartItems = items.map(e => ({ label: e.label, wert: e.v[0], v: e.v }));
    drawDqiChart(items, label);
    punctChartOpen('report-dqi', t('type_data_quality'));
  }

function punctChartBack() { showView(_punctChartParent); }

function punctChartReset() {
    _punctChartScale = 1;
    drawPunctChart(_punctChartItems, _punctChartPeriod, _punctChartSub);
  }

function closePunctChart() { punctChartBack(); }

function openPunctRaw() {
    punctRawPage = 1;
    renderPunctRaw();
    showView('raw-punct');
  }

function punctRawFiltered() {
    const fs = punctRawFilters();
    if (!fs.length) return PUNCT_RAW;
    return PUNCT_RAW.filter(row => fs.every(f => String(row[f.col] ?? '').toLowerCase().includes(f.q)));
  }

function punctRawFilterChanged() {
    punctRawPage = 1;
    renderPunctRaw();
  }
