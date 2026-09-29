/* ════════════════════════════════════════════════════════════════════
   PIMS · ELA-Meldungsgenerator — React 18 + MUI v5, no build step.

   Ignat, 2026-09-29, on projects/etc-message-generator/: "It looks very
   similar to MUI. But it would be great to have it in real MUI." — and
   "it looks fine", so this is a PORT: same side sheet, same sections, same
   order, same fields, same behaviour. Only the components change.

   The original stays live and is never modified. Strings, content and pure
   helpers come from data.js, generated out of it by
   scripts/mg-extract-shared.cjs. The state machine below is the vanilla's
   own, ported function by function onto the same `S` shape: its handlers
   wrote into the DOM, so they could not be extracted, only carried across.
   ════════════════════════════════════════════════════════════════════ */
const { useState, useEffect, useReducer } = React;
const html = htm.bind(React.createElement);
const M = MaterialUI;
const {
  ThemeProvider, createTheme, CssBaseline, Box, Button, IconButton, Typography, TextField,
  FormControl, InputLabel, Select, MenuItem, FormHelperText, InputAdornment, Drawer, Divider,
  ToggleButton, ToggleButtonGroup, LinearProgress, Snackbar, Stack, Link,
  Dialog, DialogContent, DialogContentText, DialogActions,
} = M;

const Icon = ({ children, sx }) =>
  html`<span className="material-icons" aria-hidden="true" style=${{ fontSize: 20, ...(sx || {}) }}>${children}</span>`;

/* Theme copied from the MUI port brief, as for Grunddaten (same PIMS product
   family): MUI defaults, primary #2196F3, flat buttons and cards, small filled
   fields. No AppBar here — the sheet is the whole screen. */
const theme = createTheme({
  palette: { primary: { main: '#2196F3', dark: '#1769AA', light: '#64B5F6' }, background: { default: '#FAFAFA' } },
  shape: { borderRadius: 4 },
  components: {
    MuiButton:      { defaultProps: { size: 'small', disableElevation: true } },
    MuiIconButton:  { defaultProps: { size: 'small' } },
    MuiTextField:   { defaultProps: { size: 'small', variant: 'filled' } },
    MuiFormControl: { defaultProps: { size: 'small', variant: 'filled' } },
    MuiMenuItem:    { styleOverrides: { root: {
                        '&.Mui-selected': { backgroundColor: 'rgba(33,150,243,0.12)' },
                        '&.Mui-selected:hover': { backgroundColor: 'rgba(33,150,243,0.12)' } } } },
  },
});

/* The vanilla's own state-line colours (--ok / --warn / --err), carried over. */
const TONE = { g: '#1e7b34', b: 'primary.main', a: '#8a5a00', r: '#c62828', '': 'text.secondary' };
const TONE_ICON = { ok: 'check', pen: 'edit', warn: 'error_outline', dot: 'radio_button_unchecked' };
/* Icons as in production's source buttons (document · mic · library); the AI
   source takes MUI's usual sparkle. */
const SOURCE_ICON = { standard: 'description', library: 'library_music', record: 'mic', empathetic: 'auto_awesome' };

/* ══ State — the vanilla's S, same shape. Plus the four values it kept in
   <select>s and read back out of the DOM (stations, intervals). ═════════ */
const S = {
  ui: 'de', typ: 'erst', source: 'standard', prompt: '', zusatz: '', daisy: '', daisyCustom: false,
  variant: -1, libId: '', recId: '', srcName: '', pairOff: false, zusatzTranslated: true, failMode: false,
  msg: { de: { text: '', state: 'none', variant: null }, en: { text: '', state: 'none', variant: null } },
  enOutdated: false,
  audio: { state: 'none', forKey: null, dur: 0, listened: false, at: null, pct: 0 },
  genPct: 0, playing: false, playPos: 0,
  von: STATIONS_VON[0], bis: STATIONS_BIS[0], intDaisy: INTERVALS_DAISY[0], intEla: INTERVALS_ELA[0],
};
let rerender = () => {};
let toast = () => {};
let askConfirm = (msg, onYes) => {};

const t = k => (I18N[k] || {})[S.ui] || k;
const audioKey = () => [S.msg.de.text, S.msg.en.text].join(' ');

function defaultDaisy() {
  return S.typ === 'erst'
    ? '{U2}: Kein Halt {Stadtmitte} aufgrund {Störung}. Weitere Informationen folgen in Kürze. ***'
    : '{U2}: Kein Halt {Stadtmitte} aufgrund {Notarzteinsatz}. Bitte {Buslinie M41} nutzen. ***';
}
// the vanilla read von/bis out of the station <select>s; here they are state
function defaultPrompt() {
  const von = S.von, bis = S.bis, de = S.ui === 'de';
  const grund = S.typ === 'erst'
    ? (de ? 'Störung (Details noch offen)' : 'disruption (details still open)')
    : (de ? 'Notarzteinsatz' : 'emergency medical services');
  const p = de
    ? ['Linie U2', 'Kein Halt Stadtmitte', 'Grund: ' + grund, 'Abschnitt: ' + von + ' – ' + bis]
    : ['Line U2', 'No stop at Stadtmitte', 'Reason: ' + grund, 'Section: ' + von + ' – ' + bis];
  if (S.typ === 'haupt') p.push(de ? 'Alternative: Buslinie M41' : 'Alternative: bus route M41',
                                de ? 'Voraussichtlich bis 23:30 Uhr' : 'Expected until 23:30');
  return p.join('. ') + '.';
}

function loadStandard() {
  const base = TEXTS[S.typ].standard;
  ['de', 'en'].forEach(l => { S.msg[l].text = base[l]; S.msg[l].state = 'standard'; S.msg[l].variant = null; });
  S.variant = -1; S.srcName = '';
  S.enOutdated = false; S.pairOff = false; S.zusatzTranslated = true;
  if (S.audio.state === 'ready') S.audio.state = 'stale';
}

/* ── Generate — empathetic only; each click returns the next of three ── */
let genTimer = null, genPulse = null;
function generate() {
  if (S.source !== 'empathetic') return;
  // the vanilla's native confirm(), as an MUI Dialog
  if (S.msg.de.state === 'edited' || S.msg.en.state === 'edited') { askConfirm(t('regenWarn'), runGenerate); return; }
  runGenerate();
}
function runGenerate() {
  ['de', 'en'].forEach(l => { S.msg[l].state = 'loading'; });
  S.genPct = 0; rerender();
  clearInterval(genPulse);
  genPulse = setInterval(() => { S.genPct = Math.min(96, S.genPct + 11); rerender(); }, 90);
  clearTimeout(genTimer);
  genTimer = setTimeout(() => {
    clearInterval(genPulse); S.genPct = 0;
    if (S.failMode) { ['de', 'en'].forEach(l => { S.msg[l].state = 'error'; }); rerender(); return; }
    const set = TEXTS[S.typ].empathetic;
    S.variant = (S.variant + 1) % set.length;
    const base = set[S.variant];
    const extra = S.zusatz.trim();
    const known = extra ? KNOWN.find(k => k.de === extra || k.en === extra) : null;
    S.zusatzTranslated = !extra || !!known;
    ['de', 'en'].forEach(l => {
      const m = S.msg[l]; let txt = base[l];
      if (extra) { if (known) txt += ' ' + known[l]; else if (l === 'de') txt += ' ' + extra; }
      m.text = txt; m.state = 'generated'; m.variant = S.variant + 1;
    });
    S.enOutdated = false; S.pairOff = false;
    if (S.audio.state === 'ready') S.audio.state = 'stale';
    rerender();
  }, 900);
}

function onEdit(lang, val) {
  const m = S.msg[lang];
  if (m.text === val) return;
  m.text = val; m.state = val ? 'edited' : 'none';
  if (lang === 'de') S.enOutdated = !!S.msg.en.text;
  // editing EN clears "translation out of date" but NOT "never reconciled"
  if (lang === 'en' && S.enOutdated) { S.enOutdated = false; S.pairOff = true; }
  rerender();
}
function onDaisy(val) { S.daisy = val; S.daisyCustom = val !== defaultDaisy(); rerender(); }
function onZusatz(val) { S.zusatz = val; rerender(); }
function onSource(v) {
  const prev = S.source; S.source = v;
  if (v !== 'library') S.libId = '';
  if (v !== 'record') S.recId = '';
  if (v === 'standard' && prev !== 'standard') loadStandard();
  rerender();
}
function onLibrary(id) {
  const item = LIBRARY.find(x => x.id === id);
  S.libId = id || '';
  if (!item || !item.id) { S.srcName = ''; ['de', 'en'].forEach(l => { S.msg[l].text = ''; S.msg[l].state = 'none'; }); rerender(); return; }
  S.srcName = item[S.ui];
  ['de', 'en'].forEach(l => { S.msg[l].text = l === 'de' ? item.tde : item.ten; S.msg[l].state = 'library'; S.msg[l].variant = null; });
  S.enOutdated = false; S.pairOff = false; S.zusatzTranslated = true;
  S.audio = { state: 'ready', forKey: null, dur: estDur(item.tde) + estDur(item.ten) + 0.8, listened: false, at: stamp(), pct: 100 };
  S.audio.forKey = audioKey();
  rerender();
}
function onRec(id) {
  const r = RECS.find(x => x.id === id);
  S.recId = id || '';
  if (!r || !r.id) { S.srcName = ''; ['de', 'en'].forEach(l => { S.msg[l].text = ''; S.msg[l].state = 'none'; }); S.audio.state = 'none'; rerender(); return; }
  S.srcName = r[S.ui].split(' · ')[0];
  ['de', 'en'].forEach(l => { S.msg[l].text = l === 'de' ? r.tde : r.ten; S.msg[l].state = 'rec'; S.msg[l].variant = null; });
  S.enOutdated = false; S.pairOff = false; S.zusatzTranslated = true;
  S.audio = { state: 'ready', forKey: null, dur: r.dur, listened: false, at: stamp(), pct: 100 };
  S.audio.forKey = audioKey();
  rerender();
}

/* ── Audio — ONE file containing DE + EN ─────────────────────────── */
function makeAudio() {
  if (!S.msg.de.text && !S.msg.en.text) return;
  S.audio.state = 'rendering'; S.audio.pct = 0; rerender();
  const iv = setInterval(() => {
    S.audio.pct = Math.min(100, S.audio.pct + 12);
    if (S.audio.pct >= 100) {
      clearInterval(iv);
      if (S.failMode) S.audio.state = 'error';
      else {
        S.audio.state = 'ready'; S.audio.forKey = audioKey();
        S.audio.dur = estDur(S.msg.de.text) + estDur(S.msg.en.text) + 0.8;
        S.audio.at = stamp(); S.audio.listened = false;
      }
    }
    rerender();
  }, 120);
}
/* Playback is simulated, as in the vanilla. `endPlay` is exposed so the checks
   can reach the end state without sitting out a 20-second announcement. */
let playTick = null;
function play() {
  stopPlay(); S.playing = true; S.playPos = 0; rerender();
  playTick = setInterval(() => {
    S.playPos = Math.min(S.audio.dur, (S.playPos || 0) + 0.5);
    if (S.playPos >= S.audio.dur) { endPlay(); return; }
    rerender();
  }, 500);
}
function endPlay() {
  clearInterval(playTick);
  if (!S.playing) return;
  S.playing = false; S.playPos = 0;
  S.audio.listened = true;   // reached the end — pressing play is not hearing it
  rerender();
}
function stopPlay() { clearInterval(playTick); S.playPos = 0; S.playing = false; }
window.endPlay = endPlay;

function audioStateNow() {
  let st = S.audio.state;
  if (st === 'ready' && S.audio.forKey !== audioKey()) st = 'stale';
  return st;
}
/* Every active warning, ordered by consequence. */
function saveWarnings() {
  const a = S.audio, st = audioStateNow(), w = [];
  if (st === 'stale') w.push(t('saveStale'));
  if (S.msg.de.state === 'eventChanged' || S.msg.en.state === 'eventChanged') w.push(t('saveEvent'));
  if (!S.msg.de.text && !S.msg.en.text) w.push(t('saveEmpty'));
  else if (st === 'none' || st === 'error') w.push(t('saveNoAudio'));
  if (S.daisy.length > 160) w.push(t('saveDaisy'));
  return w;
}
function save() {
  const w = saveWarnings();
  toast(w.length ? t('savedWarn') + ' ' + w[0] : t('savedClean') + ' (' + fmtDur(S.audio.dur) + ').');
}

/* renderStates(), as data: the rules are the vanilla's, the markup is MUI. */
function stateLine(l) {
  const m = S.msg[l];
  let cls = '', icon = 'dot', txt = t('stNone'), extra = '', retry = false;
  if (m.state === 'loading')        { cls = 'b'; txt = t('stLoading'); }
  else if (m.state === 'error')     { cls = 'r'; icon = 'warn'; txt = t('stFail'); retry = true; }
  else if (m.state === 'generated') { cls = 'g'; icon = 'ok'; txt = t('stGen'); if (m.variant) extra = ' · ' + t('stVariant') + ' ' + m.variant + '/3'; }
  else if (m.state === 'standard')  { cls = 'g'; icon = 'ok'; txt = t('stStd'); }
  else if (m.state === 'edited')    { cls = 'b'; icon = 'pen'; txt = t('stEdited'); }
  else if (m.state === 'library')   { cls = 'g'; icon = 'ok'; txt = t('stLib'); if (S.srcName) extra = ' · ' + S.srcName; }
  else if (m.state === 'rec')       { cls = ''; txt = t('stRec'); if (S.srcName) extra = ' · ' + S.srcName; }
  else if (m.state === 'eventChanged') { cls = 'a'; icon = 'warn'; txt = t('stEventOld'); }
  let warned = m.state === 'eventChanged';
  if (l === 'en' && m.text && !warned) {   // EN-specific warnings win
    if (S.enOutdated)             { cls = 'a'; icon = 'warn'; txt = t('stTransOld'); extra = ''; warned = true; }
    else if (!S.zusatzTranslated) { cls = 'a'; icon = 'warn'; txt = t('stZusatzDe'); extra = ''; warned = true; }
    else if (S.pairOff)           { cls = 'a'; icon = 'warn'; txt = t('stPairOff'); extra = ''; warned = true; }
  }
  return { cls, icon, txt, extra, warned, retry };
}

/* ── presenter ── */
function setUi(l) { S.ui = l; rerender(); }   // as the vanilla: a picked name stays in the language it was picked in
function toggleTyp() {
  S.typ = S.typ === 'erst' ? 'haupt' : 'erst'; S.variant = -1;
  // an untouched system text follows the event; anything a human made does not
  if (S.source === 'standard' && S.msg.de.state === 'standard' && S.msg.en.state === 'standard') loadStandard();
  else ['de', 'en'].forEach(l => { if (S.msg[l].text) S.msg[l].state = 'eventChanged'; });
  rerender();
}
function toggleFail() { S.failMode = !S.failMode; rerender(); }
function resetAll() {
  stopPlay();
  S.typ = 'erst'; S.source = 'standard'; S.variant = -1;
  S.zusatz = ''; S.daisyCustom = false; S.zusatzTranslated = true; S.enOutdated = false;
  S.libId = ''; S.recId = ''; S.srcName = ''; S.pairOff = false;
  S.msg = { de: { text: '', state: 'none', variant: null }, en: { text: '', state: 'none', variant: null } };
  S.audio = { state: 'none', forKey: null, dur: 0, listened: false, at: null, pct: 0 };
  loadStandard(); rerender();
}

/* ══ Components ═══════════════════════════════════════════════════════ */
const SecTitle = ({ children, id, sx }) =>
  html`<${Typography} id=${id} sx=${{ fontSize: 19, fontWeight: 400, mt: 3.25, mb: 1.5, ...(sx || {}) }}>${children}<//>`;
const SubTitle = ({ children, id, sx }) =>
  html`<${Typography} id=${id} sx=${{ fontSize: 15, fontWeight: 500, mt: 2.75, mb: 1.25, ...(sx || {}) }}>${children}<//>`;
const Hint = ({ children, id }) =>
  html`<${FormHelperText} id=${id} sx=${{ mx: '2px', mt: .75, lineHeight: 1.5 }}>${children}<//>`;

function StateLine({ cls, icon, children, id }) {
  return html`
    <${Box} id=${id} className=${'state ' + cls} sx=${{ display: 'flex', alignItems: 'flex-start', gap: .75, pt: .75, px: '2px',
                                fontSize: 12, lineHeight: 1.5, color: TONE[cls] }}>
      <${Icon} sx=${{ fontSize: 14, marginTop: 2 }}>${TONE_ICON[icon]}<//>
      <span>${children}</span>
    <//>`;
}

/** A plain labelled Select — the vanilla's <select>s, as real MUI Menus. */
function Pick({ id, label, value, onChange, options, width, clearable }) {
  const labelId = id + '-label';
  return html`
    <${FormControl} sx=${{ width: width || '100%', flexShrink: width ? 0 : 1, minWidth: 0 }}>
      <${InputLabel} id=${labelId}>${label}<//>
      <${Select} id=${id} labelId=${labelId} value=${value} label=${label} onChange=${e => onChange(e.target.value)}
        endAdornment=${clearable && value ? html`
          <${InputAdornment} position="end" sx=${{ mr: 3 }}>
            <${IconButton} aria-label=${'Clear ' + label} onClick=${() => onChange('')}><${Icon} sx=${{ fontSize: 18 }}>close<//><//>
          <//>` : null}>
        ${options.map(o => html`<${MenuItem} key=${o.value} value=${o.value}>${o.label}<//>`)}
      <//>
    <//>`;
}

function MessageBox({ l }) {
  const m = S.msg[l], s = stateLine(l);
  return html`
    <${Box} sx=${{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
      <${TextField} id=${'ta-' + l} label=${'ELA (' + l.toUpperCase() + ')'} multiline minRows=${3} fullWidth
        value=${m.text} placeholder=${m.state === 'loading' ? t('stLoading') : ''}
        InputProps=${{ readOnly: S.source === 'record' }}
        onChange=${e => onEdit(l, e.target.value)}
        sx=${{ flex: 1, '& .MuiFilledInput-root': { height: '100%', alignItems: 'flex-start', lineHeight: 1.55,
                 ...(s.warned ? { boxShadow: 'inset 0 0 0 1px #f5b400' } : null) } }}
        inputProps=${{ 'data-warn': s.warned ? 'true' : 'false' }} />
      <${StateLine} id=${'state-' + l} cls=${s.cls} icon=${s.icon}>
        ${s.txt}${s.extra}${s.retry ? html` <${Link} component="button" variant="caption" onClick=${generate}>${t('retry')}<//>` : null}
      <//>
    <//>`;
}

function AudioRow() {
  const a = S.audio, st = audioStateNow();
  const hasText = !!(S.msg.de.text || S.msg.en.text);
  const busy = S.msg.de.state === 'loading' || S.msg.en.state === 'loading';
  let cls = '', icon = 'dot', txt = t('aNone');
  if (st === 'rendering')  { cls = 'b'; txt = t('aRender'); }
  else if (st === 'error') { cls = 'r'; icon = 'warn'; txt = t('aFail'); }
  else if (st === 'stale') { cls = 'a'; icon = 'warn'; txt = t('aStale'); }
  else if (st === 'ready') {
    cls = 'g'; icon = 'ok';
    txt = t('aReady') + ' ' + a.at + ' · ' + fmtDur(a.dur) + ' · ' + t('aOneFile')
        + (S.playing ? ' · ' + t('playing') + ' ' + fmtDur(S.playPos || 0) + ' / ' + fmtDur(a.dur)
                     : (a.listened ? ' · ' + t('aListened') : ''));
  }
  // the vanilla's 28-bar waveform, same heights
  const bars = Array.from({ length: 28 }, (_, i) => 20 + Math.round(Math.sin(i * 1.6) * 13 + Math.cos(i * .7) * 6));
  return html`
    <${Stack} direction="row" spacing=${1} alignItems="center" useFlexGap flexWrap="wrap" sx=${{ mt: 2 }} id="audioActs">
      <${Button} variant="outlined" id="btnGen" disabled=${busy || S.source !== 'empathetic'} onClick=${generate}>
        ${busy ? t('genBusy') : t('genEla')}<//>
      <${Button} variant="outlined" id="btnAudio" disabled=${!hasText || st === 'rendering' || S.source === 'record'} onClick=${makeAudio}>
        ${t('genAudio')}<//>
      <${Button} id="btnPlay" disabled=${st !== 'ready' && st !== 'stale'}
        startIcon=${html`<${Icon} sx=${{ fontSize: 18 }}>${S.playing ? 'stop' : 'play_arrow'}<//>`}
        onClick=${() => { if (S.playing) { stopPlay(); rerender(); } else play(); }}>
        ${S.playing ? t('stop') : t('listen')}<//>
      ${busy ? html`<${LinearProgress} id="genBar" variant="determinate" value=${S.genPct || 0} sx=${{ width: 180 }} />` : null}
      ${st === 'rendering' ? html`<${LinearProgress} id="abar" variant="determinate" value=${a.pct} sx=${{ width: 180 }} />` : null}
      ${st === 'ready' || st === 'stale' ? html`
        <${Box} className="wave" aria-hidden="true" sx=${{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: 18, width: 180,
                                     pointerEvents: 'none', opacity: .75 }}>
          ${bars.map((h, i) => html`<${Box} key=${i} sx=${{ flex: 1, height: h + '%', borderRadius: '1px',
                                     bgcolor: S.playing ? 'primary.main' : 'rgba(33,150,243,.3)' }} />`)}
        <//>` : null}
    <//>
    <${StateLine} id="state-audio" cls=${cls} icon=${icon}>${txt}<//>`;
}

function Sheet() {
  const code = s => (s.match(/\(([^)]+)\)/) || [, ''])[1];
  /* Ignat, 2026-09-29: the points follow the production "Edit message" header —
     Location · Type · Stations · Date from · Date to, names bold. EN names and
     "Approaching" are captured from that screenshot; the DE strings and the dates
     are proposed sample data. Line and reason are no longer listed here. */
  const L = (de, en) => S.ui === 'de' ? de : en;
  const meta = [[L('Ortspunkt', 'Location'), L('Einfahrt', 'Approaching')], [t('typ'), t(S.typ)],
                [t('stationen'), code(S.von) + ' - ' + code(S.bis)],
                [L('Datum von', 'Date from'), '29.09.2026'], [L('Datum bis', 'Date to'), '06.10.2026']];
  const over = S.daisy.length > 160;
  const warns = saveWarnings();
  const srcHint = S.source === 'standard' ? t('srcStd') : S.source === 'library' ? t('srcLib') : S.source === 'empathetic' ? t('srcEmp') : t('srcRec');
  const ints = list => list.map(v => ({ value: v, label: v }));

  return html`
    <${Drawer} variant="permanent" anchor="right" id="sheet"
      PaperProps=${{ sx: { width: '66vw', minWidth: 660, maxWidth: 1000, top: 0, bottom: 48, height: 'auto',
                           boxShadow: 8, borderLeft: 'none', display: 'flex', flexDirection: 'column', overflow: 'hidden' } }}>
      <${Box} id="sheetBody" sx=${{ flex: 1, overflowY: 'auto', px: 3.5, pt: 2.75, pb: 3 }}>
        <${Box} sx=${{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 1.5 }}>
          <${Typography} id="tTitle" sx=${{ fontSize: 21, fontWeight: 400 }}>${t('title')}<//>
          <${Box} sx=${{ flex: 1 }} />
          <${ToggleButtonGroup} exclusive size="small" color="primary" value=${S.ui} onChange=${(e, v) => v && setUi(v)}>
            <${ToggleButton} id="uiDe" value="de" sx=${{ px: 1.5, py: .25 }}>DE<//>
            <${ToggleButton} id="uiEn" value="en" sx=${{ px: 1.5, py: .25 }}>EN<//>
          <//>
          <${IconButton} aria-label=${S.ui === 'de' ? 'Schließen' : 'Close'} onClick=${() => toast(t('closeStub'))}><${Icon}>close<//><//>
        <//>

        <${Box} id="metaRow" sx=${{ display: 'flex', flexWrap: 'wrap', gap: '6px 28px', fontSize: 13, color: 'text.primary' }}>
          ${meta.map(([k, v]) => html`<span key=${k}><b style=${{ fontWeight: 700 }}>${k}:</b> ${v}</span>`)}
        <//>

        ${/* ── Daisy ── */ ''}
        <${SecTitle} id="tDaisy">${t('daisy')}<//>
        <${Stack} direction="row" spacing=${2} alignItems="flex-start">
          <${Box} sx=${{ flex: 1, minWidth: 0 }}>
            <${TextField} id="daisy" label="DAISY" multiline minRows=${2} fullWidth value=${S.daisy}
              onChange=${e => onDaisy(e.target.value)} />
            <${FormHelperText} id="daisyCounter" className=${over ? 'over' : ''}
              sx=${{ mx: '2px', mt: .75, ...(over ? { color: '#c62828', fontWeight: 500 } : null) }}>
              <span id="daisyCount">${S.daisy.length}</span> / 160<//>
          <//>
          <${Pick} id="intDaisy" label=${t('interval')} width=${126} value=${S.intDaisy}
            onChange=${v => { S.intDaisy = v; rerender(); }} options=${ints(INTERVALS_DAISY)} />
        <//>

        ${/* ── ELA ── */ ''}
        <${SecTitle}>ELA<//>
        ${/* Ignat, 2026-09-29: one connected group instead of the dropdown. The
              choice is a value — exactly one source per message, and switching it
              changes the text — so a toggle group, not tabs. All options stay in
              view, and the ELA header above says what the choice is for. */ ''}
        ${/* no visible "Quelle" label (Ignat: the workers know it) — the group keeps its name for screen readers */ ''}
        <${ToggleButtonGroup} id="source" exclusive fullWidth size="small" color="primary" value=${S.source}
          aria-label=${t('source')} onChange=${(e, v) => v && onSource(v)}
          sx=${{ '& .MuiToggleButton-root': { gap: 1, py: .75 },
                 '& .MuiToggleButton-root.Mui-selected': { bgcolor: 'rgba(33,150,243,0.12)', fontWeight: 500 } }}>
          ${SOURCES.map(x => html`
            <${ToggleButton} key=${x.id} value=${x.id}>
              <${Icon} sx=${{ fontSize: 18 }}>${SOURCE_ICON[x.id]}<//>${x[S.ui]}
            <//>`)}
        <//>
        <${Hint} id="sourceHint">${srcHint}<//>

        ${S.source === 'empathetic' ? html`
          <${Box} id="blkEmpathetic">
            ${/* assembled from the event and not editable — the vanilla's dotted read-only field */ ''}
            <${TextField} id="prompt" label=${t('prompt')} multiline minRows=${2} fullWidth value=${S.prompt}
              InputProps=${{ readOnly: true }} inputProps=${{ tabIndex: -1 }}
              sx=${{ mt: 2, '& .MuiFilledInput-root:before, & .MuiFilledInput-root:hover:not(.Mui-disabled):before': { borderBottomStyle: 'dotted' },
                     '& .MuiFilledInput-root:after': { display: 'none' }, '& textarea': { color: 'text.secondary', cursor: 'default' },
                     '& .MuiInputLabel-root.Mui-focused': { color: 'text.secondary' } }} />
            <${TextField} id="zusatz" label=${t('zusatz')} multiline minRows=${1} fullWidth value=${S.zusatz}
              placeholder=${KNOWN[0][S.ui]} sx=${{ mt: 2 }} onChange=${e => onZusatz(e.target.value)} />
            <${Hint} id="tZusatzHint">${t('zusatzHint')}<//>
          <//>` : null}

        ${S.source === 'library' ? html`
          <${Box} id="blkLibrary" sx=${{ mt: 2 }}>
            ${/* no "— bitte wählen —" row: an empty value IS "nothing chosen", the label names the field, ✕ clears */ ''}
            <${Pick} id="library" label=${t('library')} value=${S.libId} clearable onChange=${onLibrary}
              options=${LIBRARY.filter(x => x.id).map(x => ({ value: x.id, label: x[S.ui] }))} />
            <${Hint} id="tLibraryHint">${t('libHint')}<//>
          <//>` : null}

        ${S.source === 'record' ? html`
          <${Box} id="blkRecord" sx=${{ mt: 2 }}>
            <${Stack} direction="row" spacing=${2} alignItems="center">
              <${Pick} id="rec" label=${t('rec')} value=${S.recId} clearable onChange=${onRec}
                options=${RECS.filter(x => x.id).map(x => ({ value: x.id, label: x[S.ui] }))} />
              <${Button} variant="outlined" id="btnUpload" startIcon=${html`<${Icon} sx=${{ fontSize: 18 }}>upload<//>`}
                sx=${{ flexShrink: 0 }} onClick=${() => toast(t('uploadStub'))}>${t('upload')}<//>
            <//>
            <${Hint} id="tRecHint">${t('recHint')}<//>
          <//>` : null}

        ${/* ── Meldungen ── */ ''}
        <${SubTitle} id="tMeldungen">${t('meldungen')}<//>
        <${Stack} direction="row" spacing=${2} alignItems="stretch">
          <${Stack} direction="row" spacing=${2} alignItems="stretch" sx=${{ flex: 1, minWidth: 0 }}>
            <${MessageBox} l="de" />
            <${MessageBox} l="en" />
          <//>
          <${Box}>
            <${Pick} id="intEla" label=${t('interval')} width=${126} value=${S.intEla}
              onChange=${v => { S.intEla = v; rerender(); }} options=${ints(INTERVALS_ELA)} />
          <//>
        <//>
        <${AudioRow} />

        ${/* ── Stationen ── */ ''}
        <${SecTitle} id="tStations">${t('stations')}<//>
        <${SubTitle} id="tPlanned" sx=${{ mt: 0 }}>${t('planned')}<//>
        <${Stack} direction="row" spacing=${2}>
          <${Pick} id="stVon" label=${t('von')} value=${S.von} onChange=${v => { S.von = v; rerender(); }}
            options=${STATIONS_VON.map(v => ({ value: v, label: v }))} />
          <${Pick} id="stBis" label=${t('bis')} value=${S.bis} onChange=${v => { S.bis = v; rerender(); }}
            options=${STATIONS_BIS.map(v => ({ value: v, label: v }))} />
        <//>
      <//>

      ${/* only the body scrolls — the decision and its consequences are never scrolled apart */ ''}
      <${Divider} />
      <${Box} sx=${{ flexShrink: 0, px: 3.5, pt: 1.5, pb: 1.75, display: 'flex', alignItems: 'flex-start', gap: 2,
                     boxShadow: '0 -2px 6px rgba(0,0,0,.06)' }}>
        <${Box} id="saveWarns" sx=${{ flex: 1, minWidth: 0 }}>
          ${warns.length
            ? warns.map((x, i) => html`<${StateLine} key=${i} cls="a" icon="warn">${x}<//>`)
            : html`<${StateLine} cls="g" icon="ok">${t('saveOk')}<//>`}
        <//>
        <${Stack} direction="row" spacing=${1} sx=${{ flexShrink: 0 }}>
          <${Button} id="btnCancel" onClick=${() => toast(t('closeStub'))}>${t('cancel')}<//>
          <${Button} variant="contained" id="btnSave" onClick=${save}>${t('save')}<//>
        <//>
      <//>
    <//>`;
}

/* The demo bar — the prototype frame, not product chrome, as in the vanilla. */
function Presenter() {
  const pb = (id, on, label, onClick) => html`
    <${Button} id=${id} variant=${on ? 'contained' : 'outlined'} onClick=${onClick}
      sx=${{ color: '#fff', borderColor: 'rgba(255,255,255,.22)', '&:hover': { borderColor: 'rgba(255,255,255,.5)' } }}>${label}<//>`;
  return html`
    <${Box} id="presenter" sx=${{ position: 'fixed', left: 0, right: 0, bottom: 0, height: 48, bgcolor: '#263238',
                                  display: 'flex', alignItems: 'center', gap: 1, px: 1.5, zIndex: 1400 }}>
      <${Typography} sx=${{ fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,.5)' }}>Demo<//>
      ${pb('pTyp', false, t('typ') + ': ' + t(S.typ), toggleTyp)}
      ${pb('pFail', S.failMode, (S.ui === 'de' ? 'Fehler: ' : 'Failure: ') + (S.failMode ? (S.ui === 'de' ? 'an' : 'on') : (S.ui === 'de' ? 'aus' : 'off')), toggleFail)}
      ${pb('pReset', false, 'Zurücksetzen', resetAll)}
      <${Typography} id="pCap" sx=${{ ml: 'auto', fontSize: 12.5, color: 'rgba(255,255,255,.62)', textAlign: 'right', maxWidth: '44%', lineHeight: 1.35 }}>
        ${S.typ === 'erst' ? t('capErst') : t('capHaupt')}<//>
    <//>`;
}

function Root() {
  const [, force] = useReducer(x => x + 1, 0);
  const [msg, setMsg] = useState('');
  const [confirm, setConfirm] = useState(null);
  rerender = force;
  toast = setMsg;
  askConfirm = (text, onYes) => setConfirm({ text, onYes });

  // what the vanilla's render() did to S before drawing
  document.documentElement.lang = S.ui;
  if (!S.daisyCustom) S.daisy = defaultDaisy();
  S.prompt = defaultPrompt();

  return html`
    <${ThemeProvider} theme=${theme}>
      <${CssBaseline} />
      ${/* the plain scrim — the Ereignis screen behind the sheet is deliberately not drawn */ ''}
      <${Box} id="scrim" sx=${{ position: 'fixed', inset: '0 0 48px 0', bgcolor: '#8f989e' }} />
      <${Sheet} />
      <${Presenter} />
      <${Dialog} open=${!!confirm} onClose=${() => setConfirm(null)}>
        <${DialogContent}><${DialogContentText}>${confirm ? confirm.text : ''}<//><//>
        <${DialogActions}>
          <${Button} onClick=${() => setConfirm(null)}>${t('cancel')}<//>
          <${Button} variant="contained" id="regenYes" onClick=${() => { const f = confirm.onYes; setConfirm(null); f(); }}>${t('genEla')}<//>
        <//>
      <//>
      <${Snackbar} open=${!!msg} autoHideDuration=${3600} onClose=${() => setMsg('')} message=${msg}
        anchorOrigin=${{ vertical: 'bottom', horizontal: 'left' }} sx=${{ bottom: '62px !important' }} />
    <//>`;
}

loadStandard();
ReactDOM.createRoot(document.getElementById('root')).render(html`<${Root} />`);
