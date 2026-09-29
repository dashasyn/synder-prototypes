/* GENERATED — do not edit.
   Source: projects/etc-message-generator/index.html (never modified)
   By:     scripts/mg-extract-shared.cjs — re-run to resync.
   Carried 9: I18N, SOURCES, TEXTS, KNOWN, LIBRARY, RECS, stamp, estDur, fmtDur
   Skipped 38: the DOM layer and the state machine, ported in app.js */

const I18N = {
  title:      { de: 'Meldung bearbeiten',      en: 'Edit message' },
  daisy:      { de: 'Daisy',                   en: 'Daisy' },
  interval:   { de: 'Intervall',               en: 'Interval' },
  source:     { de: 'Quelle',                  en: 'Source' },
  prompt:     { de: 'Prompt',                  en: 'Prompt' },
  zusatz:     { de: 'Zusätzliche Angaben',     en: 'Additional details' },
  meldungen:  { de: 'Meldungen',               en: 'Messages' },
  stations:   { de: 'Stationen',               en: 'Stations' },
  planned:    { de: 'Geplant',                 en: 'Planned' },
  von:        { de: 'Station von',             en: 'Station from' },
  bis:        { de: 'Station bis',             en: 'Station to' },
  library:    { de: 'Gespeicherte Meldung',    en: 'Saved message' },
  rec:        { de: 'Aufnahme',                en: 'Recording' },
  mitteil:    { de: 'Mitteilungen',            en: 'Notices' },
  typ:        { de: 'Typ',                     en: 'Type' },
  stationen:  { de: 'Stationen',               en: 'Stations' },
  linie:      { de: 'Linie',                   en: 'Line' },
  grund:      { de: 'Grund',                   en: 'Reason' },
  erst:       { de: 'Erstmeldung',             en: 'First notice' },
  haupt:      { de: 'Hauptmeldung',            en: 'Main notice' },
  ortspunkt:  { de: 'Ortspunkt',               en: 'Location point' },
  genEla:     { de: 'ELA GENERIEREN',          en: 'GENERATE ELA' },
  genAudio:   { de: 'AUDIO ERZEUGEN',          en: 'GENERATE AUDIO' },
  listen:     { de: 'ANHÖREN',                 en: 'LISTEN GENERATED' },
  stop:       { de: 'STOP',                    en: 'STOP' },
  upload:     { de: 'HOCHLADEN',               en: 'UPLOAD' },
  cancel:     { de: 'ABBRECHEN',               en: 'CANCEL' },
  save:       { de: 'SPEICHERN',               en: 'SAVE' },

  promptHint: { de: 'Aus dem Ereignis zusammengesetzt: Linie, Stationen, Grund. Nicht bearbeitbar — so kann keine Buslinie und keine Uhrzeit erfunden werden.',
                en: 'Assembled from the event: line, stations, reason. Not editable — so no bus route and no time can be invented.' },
  zusatzHint: { de: 'Was das Ereignis nicht hergibt, z. B. „Viel Spaß beim Konzert!“. Bekannte Sätze werden zweisprachig übernommen, freier Text nur auf Deutsch.',
                en: 'Anything the event does not carry, e.g. "Enjoy the concert!". Known sentences are applied in both languages, free text in German only.' },
  srcStd:     { de: 'Vordefinierter Systemtext zum Ereignis. Keine Generierung — bei Bedarf von Hand anpassbar.',
                en: 'Predefined system message for this event. No generation — editable by hand if needed.' },
  srcLib:     { de: 'Bereits freigegebene Meldung aus der Bibliothek übernehmen — keine Generierung.',
                en: 'Reuse an already approved message from the library — no generation.' },
  srcEmp:     { de: 'Empathisch formulierte Meldung aus Prompt und Zusatzangaben. ELA GENERIEREN liefert bei jedem Klick eine andere Formulierung.',
                en: 'An empathetically worded message from the prompt and the additional details. Each click on GENERATE ELA returns a different wording.' },
  srcRec:     { de: 'Menschlich eingesprochene Datei. Kein generierter Text, keine Sprachsynthese.',
                en: 'Human-recorded file. No generated text, no speech synthesis.' },
  libHint:    { de: 'Text und Audio kommen aus der Bibliothek.',
                en: 'Text and audio come from the library.' },
  recHint:    { de: 'Die Datei enthält beide Sprachen. Der Text unten dient nur als Mitschrift.',
                en: 'The file contains both languages. The text below is only a transcript.' },
  uploadStub: { de: 'Upload ist im Prototyp nicht verdrahtet.', en: 'Upload is not wired up in the prototype.' },
  closeStub:  { de: 'Schließen ist im Prototyp nicht verdrahtet.', en: 'Closing is not wired up in the prototype.' },

  stNone:     { de: 'Kein Text',                            en: 'No text' },
  stStd:      { de: 'Vordefinierter Systemtext',            en: 'Predefined system message' },
  stGen:      { de: 'Generiert · empathisch',               en: 'Generated · empathetic' },
  stVariant:  { de: 'Variante',                             en: 'Variant' },
  stEdited:   { de: 'Manuell bearbeitet',                   en: 'Edited by hand' },
  stLib:      { de: 'Aus Bibliothek',                       en: 'From library' },
  stRec:      { de: 'Mitschrift der Aufnahme',              en: 'Transcript of the recording' },
  stEventOld: { de: 'Ereignis geändert — Text passt nicht mehr, bitte neu generieren',
                en: 'Event changed — text no longer matches, please generate again' },
  stTransOld: { de: 'Übersetzung nicht aktuell — DE wurde danach geändert',
                en: 'Translation out of date — DE was changed afterwards' },
  stZusatzDe: { de: 'Zusätzliche Angaben nur auf Deutsch übernommen — EN bitte prüfen',
                en: 'Additional details applied to German only — please check EN' },
  stFail:     { de: 'Generierung fehlgeschlagen — vorherige Fassung unverändert',
                en: 'Generation failed — previous version unchanged' },
  stLoading:  { de: 'Wird generiert …',                     en: 'Generating …' },
  aNone:      { de: 'Kein Audio erzeugt',                   en: 'No audio generated' },
  aRender:    { de: 'Audio wird erzeugt …',                 en: 'Generating audio …' },
  aReady:     { de: 'Audio erzeugt',                        en: 'Audio generated' },
  aStale:     { de: 'Audio veraltet — Text wurde nach der Erzeugung geändert',
                en: 'Audio out of date — text changed after it was generated' },
  aFail:      { de: 'Sprachdienst nicht erreichbar',        en: 'Speech service unavailable' },
  aOneFile:   { de: 'eine Datei, DE + EN',                  en: 'one file, DE + EN' },
  aListened:  { de: 'angehört',                             en: 'listened to' },
  saveOk:     { de: 'Bereit zum Speichern.',                en: 'Ready to save.' },
  saveEvent:  { de: 'Ereignis geändert — der Text beschreibt nicht mehr dieses Ereignis.',
                en: 'Event changed — the text no longer describes this event.' },
  saveEmpty:  { de: 'Kein ELA-Text — es wird nichts gesprochen.',
                en: 'No ELA text — nothing will be spoken.' },
  savedWarn:  { de: 'Gespeichert — mit Warnung:',              en: 'Saved — with warning:' },
  savedClean: { de: 'Gespeichert — DE + EN mit aktuellem Audio',en: 'Saved — DE + EN with current audio' },
  retry:      { de: 'Wiederholen',                            en: 'Retry' },
  stPairOff:  { de: 'DE/EN nicht abgeglichen — EN wurde von Hand geändert, nicht neu übersetzt',
                en: 'DE/EN not reconciled — EN was hand-edited, not re-translated' },
  genBusy:    { de: 'GENERIERT …',                            en: 'GENERATING …' },
  playing:    { de: 'läuft',                                  en: 'playing' },
  fromLib:    { de: 'Aus Bibliothek',                         en: 'From library' },
  saveNoAudio:{ de: 'Noch kein Audio erzeugt — die Meldung wird gespeichert, aber nicht gesprochen.',
                en: 'No audio generated yet — the message will be saved but not spoken.' },
  saveStale:  { de: 'Audio passt nicht zum Text. Bitte neu erzeugen, sonst geht die alte Fassung auf die Lautsprecher.',
                en: 'Audio does not match the text. Regenerate it, or the old version goes to the speakers.' },
  saveUnheard:{ de: 'Audio wurde noch nicht angehört.',     en: 'Audio has not been listened to yet.' },
  saveDaisy:  { de: 'DAISY-Text ist länger als 160 Zeichen — die Anzeige schneidet ab.',
                en: 'DAISY text is longer than 160 characters — the display will cut it off.' },
  saved:      { de: 'Meldung gespeichert.',                 en: 'Message saved.' },
  regenWarn:  { de: 'Der Text wurde manuell bearbeitet. Neu generieren überschreibt ihn. Fortfahren?',
                en: 'The text was edited by hand. Generating again overwrites it. Continue?' },
  capErst:    { de: 'Erstmeldung — wenige Details, kurz. Alternative und Dauer sind noch nicht bekannt.',
                en: 'First notice — few details, short. Alternative and duration not known yet.' },
  capHaupt:   { de: 'Hauptmeldung — mit Grund, Alternative und voraussichtlicher Dauer.',
                en: 'Main notice — with reason, alternative and expected duration.' }
};

const SOURCES = [
  { id: 'standard',   de: 'Standard',   en: 'Standard'   },
  { id: 'library',    de: 'Bibliothek', en: 'Library'    },
  { id: 'record',     de: 'Aufnahme',   en: 'Record'     },
  { id: 'empathetic', de: 'Empathisch', en: 'Empathetic' }
];

const TEXTS = {
  erst: {
    standard:
      { de: 'U2: Kein Halt Stadtmitte aufgrund einer Störung. Weitere Informationen folgen in Kürze.',
        en: 'U2: No stop at Stadtmitte due to a disruption. Further information will follow shortly.' },
    empathetic: [
      { de: 'Liebe Fahrgäste, die U2 hält derzeit nicht in Stadtmitte. Wir informieren Sie, sobald wir mehr wissen.',
        en: 'Dear passengers, the U2 is currently not stopping at Stadtmitte. We will inform you as soon as we know more.' },
      { de: 'Liebe Fahrgäste, leider entfällt der Halt in Stadtmitte. Bitte haben Sie einen Moment Geduld — wir melden uns gleich mit Details.',
        en: 'Dear passengers, unfortunately the stop at Stadtmitte is cancelled. Please bear with us — we will be back shortly with details.' },
      { de: 'Liebe Fahrgäste, in Stadtmitte können wir gerade nicht halten. Sobald wir mehr wissen, sagen wir es Ihnen sofort.',
        en: 'Dear passengers, we cannot stop at Stadtmitte right now. As soon as we know more, we will tell you immediately.' }
    ]
  },
  haupt: {
    standard:
      { de: 'U2: Kein Halt Stadtmitte aufgrund eines Notarzteinsatzes. Bitte nutzen Sie die Buslinie M41. Die Sperrung dauert voraussichtlich bis 23:30 Uhr.',
        en: 'U2: No stop at Stadtmitte due to emergency medical services. Please use bus route M41. The closure is expected to last until 23:30.' },
    empathetic: [
      { de: 'Liebe Fahrgäste, wegen eines Notarzteinsatzes hält die U2 nicht in Stadtmitte. Bitte nutzen Sie die Buslinie M41, voraussichtlich bis 23:30 Uhr. Vielen Dank für Ihr Verständnis.',
        en: 'Dear passengers, due to emergency medical services the U2 is not stopping at Stadtmitte. Please use bus route M41, expected until 23:30. Thank you for your understanding.' },
      { de: 'Liebe Fahrgäste, in Stadtmitte müssen wir wegen eines Notarzteinsatzes den Halt aussetzen. Die Buslinie M41 bringt Sie weiter — voraussichtlich bis 23:30 Uhr. Danke für Ihre Geduld.',
        en: 'Dear passengers, we have to suspend the stop at Stadtmitte because of emergency medical services. Bus route M41 will take you onward — expected until 23:30. Thank you for your patience.' },
      { de: 'Liebe Fahrgäste, ein Notarzteinsatz verhindert derzeit den Halt in Stadtmitte. Am besten steigen Sie auf die Buslinie M41 um; wir rechnen mit einer Sperrung bis 23:30 Uhr.',
        en: 'Dear passengers, emergency medical services currently prevent the stop at Stadtmitte. It is best to change to bus route M41; we expect the closure to last until 23:30.' }
    ]
  }
};
/* Phrases stored bilingually. Anything else typed into Additional
   details lands in German only, and the EN state line says so. */

const KNOWN = [
  { de: 'Viel Spaß beim Konzert!',                  en: 'Enjoy the concert!' },
  { de: 'Bitte vorsichtig — draußen ist es glatt.', en: 'Please take care — it is slippery outside.' },
  { de: 'Wir danken für Ihre Geduld.',              en: 'Thank you for your patience.' }
];

const LIBRARY = [
  { id: '', de: '— bitte wählen —', en: '— please choose —' },
  { id: 'l1', de: 'Aufzug außer Betrieb (Standard)', en: 'Lift out of service (standard)',
    tde: 'Der Aufzug in Stadtmitte ist außer Betrieb. Bitte nutzen Sie die Festtreppe.',
    ten: 'The lift at Stadtmitte is out of service. Please use the stairs.' },
  { id: 'l2', de: 'Kein Halt — Standardtext', en: 'No stop — standard text',
    tde: 'U2: Kein Halt Stadtmitte. Weitere Informationen folgen in Kürze.',
    ten: 'U2: No stop at Stadtmitte. Further information will follow shortly.' },
  { id: 'l3', de: 'Bahnsteig räumen', en: 'Clear the platform',
    tde: 'Bitte verlassen Sie den Bahnsteig über die gekennzeichneten Ausgänge.',
    ten: 'Please leave the platform via the marked exits.' }
];

const RECS = [
  { id: '', de: '— bitte wählen —', en: '— please choose —' },
  { id: 'r1', de: 'Notarzteinsatz_Stadtmitte_DE-EN.wav · 0:31', en: 'Notarzteinsatz_Stadtmitte_DE-EN.wav · 0:31',
    tde: '[Aufnahme] Kein Halt Stadtmitte aufgrund eines Notarzteinsatzes.',
    ten: '[Recording] No stop at Stadtmitte due to emergency medical services.', dur: 31 },
  { id: 'r2', de: 'Bahnsteig_raeumen_DE-EN.wav · 0:22', en: 'Bahnsteig_raeumen_DE-EN.wav · 0:22',
    tde: '[Aufnahme] Bitte verlassen Sie den Bahnsteig.',
    ten: '[Recording] Please leave the platform.', dur: 22 }
];
/* ════════════════════════════════════════════════════════════
   State
   ════════════════════════════════════════════════════════════ */

const stamp = () => { const d = new Date();
  return String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0'); };

const estDur = txt => txt ? Math.round((txt.trim().split(/\s+/).filter(Boolean).length / 2.4 + 0.8) * 10) / 10 : 0;

const fmtDur = s => s <= 0 ? '0:00' : Math.floor(s / 60) + ':' + String(Math.round(s % 60)).padStart(2, '0');

/* from the markup */
const STATIONS_VON = ["Ernst-Reuter-Platz (Rp)","Zoologischer Garten (Zo)","Wittenbergplatz (Wt)","Bülowstraße (Bs)"];
const STATIONS_BIS = ["Nollendorfplatz (No)","Gleisdreieck (Gu)","Wittenbergplatz (Wt)"];
const INTERVALS_DAISY = ["5 min","10 min","15 min"];
const INTERVALS_ELA = ["5 min","10 min","15 min"];
