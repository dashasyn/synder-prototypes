/* GENERATED — do not edit.
   Source: projects/etc-optic-timing/index.html (never modified)
   By:     scripts/eo-extract-shared.cjs — re-run to resync.
   Carried 14: STATIONS, stationLabel, RULES, ruleLabel, ruleKind, TYPES, typeLabel, OPTICS, DEFAULTS, STATION_TIMING, ROWS, opticsUsedBy, effective, triggersFor
   Skipped 26 (DOM layer): esc, $, dash, LOCK_ICON, tfText, tfSelect, offsetPhrase, toastTimer, toast, CAPTIONS, setScreen, O_PAGE, fillOpticFilters, filteredOptics, renderOptics, CURRENT_OPTIC, openOptic, cellTiming, renderDefaults, EXPANDED, triggerSubRow, renderTiming, openStation, openRow, openDrawer, closeDrawers */

var STATIONS = [
  { id: '1500', name: 'Acre' },
  { id: '1820', name: 'Ahihud' },
  { id: '5900', name: 'Ashkelon' },
  { id: '1220', name: '' },          // ticket 233 gives the ID and its optics, no name
];

const stationLabel = id => {
  const s = STATIONS.find(x => x.id === id);
  return s ? (s.name ? `${s.id} (${s.name})` : s.id) : id;
};

var RULES = [
  { id: 'BR12', name: 'Arrival',   kind: 'arrival'   },
  { id: 'BR99', name: 'Departure', kind: 'departure' },
];

const ruleLabel = id => { const r = RULES.find(x => x.id === id); return r ? `${r.id} (${r.name})` : id; };

const ruleKind  = id => { const r = RULES.find(x => x.id === id); return r ? r.kind : 'arrival'; };
/* 2806 sub-message types, full list from ticket 233 */

var TYPES = [
  { v: '1',  label: 'Train-number input',        note: '' },
  { v: '5',  label: 'Train-number jump',         note: '' },
  { v: '6',  label: 'Train-number replacement',  note: '' },
  { v: '7',  label: 'Train-number change',       note: '' },
  { v: '50', label: 'Forecast',                  note: 'Early notification of an upcoming optic event. Ticket 233 marks this informational only — see assumption A4.' },
  { v: '70', label: 'Track occupied',            note: '' },
  { v: '71', label: 'Track released',            note: '' },
  { v: '80', label: 'Train position update',     note: 'Core movement logic.' },
  { v: '90', label: 'Platform arrival',          note: 'Occupation of destination track.' },
];

const typeLabel = v => { const t = TYPES.find(x => x.v === v); return t ? `${t.v} — ${t.label}` : v; };
/* Optics. HA2 pair from ticket 668's example rows; HA6 four from ticket 233's FMSILA example. */

var OPTICS = [
  { id: 'HA2 14T87', station: '1500', platform: '2', track: '14', loc: 'Approach, 420 m before platform', dir: 'Westbound',  props: 'Arrival trigger' },
  { id: 'HA2 24T45', station: '1820', platform: '2', track: '24', loc: 'Approach, 380 m before platform', dir: 'Eastbound',  props: 'Arrival trigger' },
  { id: 'HA6 131113', station: '1220', platform: '1', track: '13', loc: '', dir: '', props: '' },
  { id: 'HA6 131111', station: '1220', platform: '1', track: '13', loc: '', dir: '', props: '' },
  { id: 'HA6 131121', station: '1220', platform: '2', track: '21', loc: '', dir: '', props: '' },
  { id: 'HA6 131124', station: '1220', platform: '2', track: '21', loc: '', dir: '', props: '' },
];
/* System defaults + per-station overrides. Values are illustrative; the ticket gives no numbers. */

var DEFAULTS = { arrival: '-2:00', departure: '-0:30', repeat: '3:00' };

var STATION_TIMING = {
  '1500': { arrival: '-3:00', departure: null,    repeat: null   },
  '1820': { arrival: null,    departure: null,    repeat: '2:00' },
  '5900': { arrival: null,    departure: '-0:45', repeat: null   },
  '1220': { arrival: null,    departure: null,    repeat: null   },
};
/* The four example rows, verbatim from ticket 668. */

var ROWS = [
  { station: '1500', rule: 'BR12', platform: '2', basis: 'optic', optic: 'HA2 14T87',  type: '50', offset: '0:00' },
  { station: '1820', rule: 'BR12', platform: '1', basis: 'est',   optic: '',           type: '',   offset: '-2:00' },
  { station: '1820', rule: 'BR12', platform: '2', basis: 'optic', optic: 'HA2 24T45',  type: '50', offset: '+2:00' },
  { station: '5900', rule: 'BR99', platform: '',  basis: 'est',   optic: '',           type: '',   offset: '0:30' },
];
/* ═════════ Helpers ═════════ */

function opticsUsedBy(opticId) {
  return ROWS.filter(r => r.basis === 'optic' && r.optic === opticId);
}

function effective(stationId, key) {
  const ov = STATION_TIMING[stationId] && STATION_TIMING[stationId][key];
  return ov != null ? { value: ov, override: true } : { value: DEFAULTS[key], override: false };
}

function triggersFor(sid) {
  return ROWS.map((r, i) => ({ r, i })).filter(x => x.r.station === sid);
}
