/* ════════════════════════════════════════════════════════════════════
   PIMS Grunddaten — the Audio library (Tondateien) and the playlist
   detail page. Ported from the vanilla prototype's renderSounds /
   renderTracksTab / renderPlaylistsTab / renderPlaylistDetail /
   renderRadioTab and their modal + delete helpers.

   Registers:  VIEWS.sounds  ·  VIEWS.playlistDetail

   The domain arrays (soundFiles, playlists, radioStreams) are mutated in
   place exactly as the vanilla does — push / splice / Object.assign —
   and bump() is what makes the mutation show up. Nothing here copies the
   model, and every rule that already exists as a pure function in data.js
   (plDuration, trackUsage, eventsUsing, findStationsUsingSound,
   musicTracks, getPlaylist, getRadio) is called rather than rewritten.
   ════════════════════════════════════════════════════════════════════ */

/* The vanilla's .b-snd / .b-xfer / .b-evt / .b-music badge palette. These
   are product colours carried across, the same reason LineBadge in ui.js
   keeps its own chip: MUI has no semantic slot for "this is a transfer
   announcement". Everything else on this page is stock MUI. */
const AUD_TYPE_COLOURS = {
  'station-name': { bg: '#E3F2FD', fg: '#1565C0' },
  'transfer':     { bg: '#F3E5F5', fg: '#6A1B9A' },
  'event':        { bg: '#FFF3E0', fg: '#E65100' },
  'music':        { bg: '#F3E5F5', fg: '#6A1B9A' },
};

const AUD_TYPES = ['station-name', 'transfer', 'event', 'music'];

const audTypeKey = type => type === 'station-name' ? 'typeStationName'
                         : type === 'transfer'     ? 'typeTransfer'
                         : type === 'event'        ? 'typeEvent'
                         :                           'typeMusic';

/* The vanilla has no i18n key for either of these: markInvalid() inlines
   the required-field literal, and deleteSpcEntry() inlines "Löschen" /
   "Delete". So the literals are what come across — a t('…') call on a key
   that does not exist would render the key name as if it were a label. */
const audRequiredMsg = lang => lang === 'de' ? 'Dieses Feld ist erforderlich.' : 'This field is required.';
const audDeleteLabel = lang => lang === 'de' ? 'Löschen' : 'Delete';
/* markInvalid(id, msg) takes an optional message; the URL check is the one
   place that uses it, so this literal follows the same rule as above. */
const audBadUrlMsg = lang => lang === 'de'
  ? 'Bitte eine gültige URL eingeben (https://…).'
  : 'Please enter a valid URL (https://…).';
const audUrlOk = v => /^https?:\/\/\S+$/i.test(v.trim());

function AudioTypeChip({ type }) {
  const { t } = useApp();
  const c = AUD_TYPE_COLOURS[type] || { bg: 'rgba(0,0,0,0.07)', fg: 'text.secondary' };
  return html`<${Chip} size="small" label=${t(audTypeKey(type))}
    sx=${{ bgcolor: c.bg, color: c.fg, fontWeight: 500, height: 20,
           '& .MuiChip-label': { px: 1, fontSize: 11 } }} />`;
}

/* ── Tracks tab ─────────────────────────────────────────────────────
   Type filter + search over soundFiles, then the file table. The filter
   loses its "Alle" option — an empty value is every type and the ✕
   clears it (brief §3), which is why it carries the column's own label. */
function AudioTracksTab() {
  const { s, set, t, lang, bump } = useApp();
  const [del, setDel] = useState(null);   // { file, stations } — the in-use warning

  const f = s.soundFilter;
  const q = (s.soundSearch || '').toLowerCase();
  const filtered = soundFiles.filter(sf => {
    const matchType = !f || sf.type === f;
    const matchQ = !q || (sf.name || '').toLowerCase().includes(q)
                      || sf.filename.toLowerCase().includes(q);
    return matchType && matchQ;
  });
  const langLabel = { de: t('langDe'), en: t('langEn') };

  const removeFile = id => {
    const idx = soundFiles.findIndex(sf => sf.id === id);
    if (idx !== -1) soundFiles.splice(idx, 1);
    setDel(null);
    bump();
  };
  /* deleteSoundFile(): a file nothing references goes straight away, a file
     a station still points at gets the warning first. */
  const askDelete = sf => {
    const used = findStationsUsingSound(sf.id);
    if (used.length) setDel({ file: sf, stations: used });
    else removeFile(sf.id);
  };

  return html`
    <${React.Fragment}>
      <${Stack} direction="row" spacing=${2} alignItems="flex-start" sx=${{ mb: 2 }}>
        <${TextField} id="snd-search" label=${t('searchByName')} value=${s.soundSearch}
          onChange=${e => set({ soundSearch: e.target.value })} sx=${{ flex: 1 }}
          InputProps=${{ startAdornment: html`
            <${InputAdornment} position="start"><${Icon} sx=${{ fontSize: 18 }}>search<//><//>` }} />
        <${FilterSelect} id="snd-type-filter" label=${t('colType')} value=${f}
          onChange=${v => set({ soundFilter: v })} minWidth=${200}
          options=${AUD_TYPES.map(ty => ({ value: ty, label: t(audTypeKey(ty)) }))} />
      <//>

      <${TableContainer} component=${Paper} variant="outlined" sx=${{ borderColor: '#E7E7E7' }}>
        <${Table} id="snd-table">
          <${TableHead}><${TableRow}>
            <${TableCell}>${t('colName')}<//>
            <${TableCell}>${t('colType')}<//>
            <${TableCell}>${t('colLang')}<//>
            <${TableCell}>${t('colFilename')}<//>
            <${TableCell}>${t('colSize')}<//>
            <${TableCell}>${t('colDuration')}<//>
            <${TableCell}>${t('colUploaded')}<//>
            <${TableCell}>${t('colUsedBy')}<//>
            <${TableCell} align="right" aria-label=${t('msRowActions')} />
          <//><//>
          <${TableBody}>
            ${filtered.length ? filtered.map(sf => {
              const usedCount = findStationsUsingSound(sf.id).length;
              return html`
                <${TableRow} key=${sf.id} hover>
                  <${TableCell} sx=${{ fontWeight: 500 }}>${sf.name || sf.filename}<//>
                  <${TableCell}><${AudioTypeChip} type=${sf.type} /><//>
                  <${TableCell} sx=${{ color: 'text.secondary' }}>${langLabel[sf.lang] || sf.lang || '—'}<//>
                  <${TableCell} sx=${{ fontFamily: 'monospace', fontSize: 12, color: 'text.secondary' }}>
                    ${sf.filename}<//>
                  <${TableCell} sx=${{ color: 'text.secondary' }}>${sf.size}<//>
                  <${TableCell} sx=${{ color: 'text.secondary' }}>${sf.duration || '—'}<//>
                  <${TableCell} sx=${{ color: 'text.secondary' }}>${sf.uploaded}<//>
                  <${TableCell} sx=${{ color: 'text.secondary' }}>
                    ${sf.type === 'music' ? trackUsage(sf.id)
                      : (usedCount > 0 ? t('fileUsedIn', usedCount) : '—')}<//>
                  ${/* The vanilla's row carries a delete button and nothing else.
                        A preview control was added here and then removed: the
                        prototype cannot play audio, and a button that does
                        nothing is a UI that lies about what it can do. */ ''}
                  <${TableCell} align="right" sx=${{ whiteSpace: 'nowrap' }}>
                    <${IconButton} color="error" aria-label=${'delete ' + sf.id}
                      onClick=${() => askDelete(sf)}>
                      <${Icon} sx=${{ fontSize: 18 }}>delete_outline<//>
                    <//>
                  <//>
                <//>`;
            }) : html`<${EmptyRow} colSpan=${9} label="—" />`}
          <//>
        <//>
      <//>

      ${/* The "used in N stations" warning. Its own Dialog rather than
            ConfirmDialog, because the body is a list of stations and a
            <ul> cannot live inside DialogContentText's <p>. */ ''}
      <${Dialog} open=${!!del} onClose=${() => setDel(null)} fullWidth maxWidth="xs">
        <${DialogTitle}>${t('deleteFile')}<//>
        <${DialogContent}>
          <${DialogContentText}>${t('deleteFileWarning')}<//>
          <${Box} component="ul" sx=${{ pl: 2.5, my: 1.5, color: 'text.secondary' }}>
            ${(del ? del.stations : []).map(st => html`
              <${Box} component="li" key=${st.id} sx=${{ py: .25 }}>
                <${Typography} variant="body2">${st.name}<//>
              <//>`)}
          <//>
          <${Typography} variant="caption" color="text.disabled">${t('deleteFileNote')}<//>
        <//>
        <${DialogActions}>
          <${Button} onClick=${() => setDel(null)}>${t('cancel')}<//>
          <${Button} color="error" variant="contained"
            onClick=${() => removeFile(del.file.id)}>${t('deleteAnyway')}<//>
        <//>
      <//>
    <//>`;
}

/* ── Upload modal → MUI Dialog ──────────────────────────────────────
   showAddAudioModal(). The vanilla's "— wählen —" placeholder option is
   gone: the label names the field and `required` marks it (brief §3). */
function AudioAddDialog({ open, onClose }) {
  const { t, lang, bump } = useApp();
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [fLang, setFLang] = useState('de');
  const [file, setFile] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(''); setType(''); setFLang('de'); setFile(''); setTouched(false);
  }, [open]);

  const errName = touched && !name.trim();
  const errType = touched && !type;
  const errFile = touched && !file.trim();

  const save = () => {
    setTouched(true);
    if (!name.trim() || !type || !file.trim()) return;
    const nextNum = soundFiles.length + 100;
    const today = new Date().toLocaleDateString('de-DE');
    soundFiles.push({
      id: 'SND-' + String(nextNum).padStart(3, '0'),
      name: name.trim(),
      filename: file.trim(),
      type,
      lang: fLang,
      size: '—',
      uploaded: today,
    });
    bump();
    onClose();
  };

  return html`
    <${Dialog} open=${open} onClose=${onClose} fullWidth maxWidth="xs">
      <${DialogTitle}>${t('addAudio')}<//>
      <${DialogContent}>
        <${Stack} spacing=${2} sx=${{ mt: 1 }}>
          <${TextField} id="m-audio-name" required label=${t('audioName')} value=${name}
            placeholder=${lang === 'de' ? 'z.B. Alexanderplatz' : 'e.g. Alexanderplatz'}
            error=${errName} helperText=${errName ? audRequiredMsg(lang) : ' '}
            onChange=${e => setName(e.target.value)} />

          <${FormControl} required error=${errType}>
            <${InputLabel}>${t('audioType')}<//>
            <${Select} id="m-audio-type" value=${type} label=${t('audioType')}
              onChange=${e => setType(e.target.value)}>
              ${AUD_TYPES.map(ty => html`
                <${MenuItem} key=${ty} value=${ty}>${t(audTypeKey(ty))}<//>`)}
            <//>
            <${FormHelperText}>${errType ? audRequiredMsg(lang) : ' '}<//>
          <//>

          <${FormControl} required>
            <${InputLabel}>${t('audioLang')}<//>
            <${Select} id="m-audio-lang" value=${fLang} label=${t('audioLang')}
              onChange=${e => setFLang(e.target.value)}>
              <${MenuItem} value="de">${t('langDe')}<//>
              <${MenuItem} value="en">${t('langEn')}<//>
            <//>
          <//>

          <${TextField} id="m-audio-file" required label=${t('audioFile')} value=${file}
            placeholder="datei.mp3" error=${errFile}
            helperText=${errFile ? audRequiredMsg(lang) : ' '}
            onChange=${e => setFile(e.target.value)} />
        <//>
      <//>
      <${DialogActions}>
        <${Button} onClick=${onClose}>${t('cancel')}<//>
        <${Button} variant="contained" onClick=${save}>${t('saveEntry')}<//>
      <//>
    <//>`;
}

/* ── Playlists tab ──────────────────────────────────────────────────── */
function AudioPlaylistsTab() {
  const { t, lang, nav, bump } = useApp();
  const [del, setDel] = useState(null);

  const doDelete = () => {
    const pl = del && getPlaylist(del.id);
    if (pl) playlists.splice(playlists.indexOf(pl), 1);
    setDel(null);
    bump();
  };

  return html`
    <${React.Fragment}>
      <${TableContainer} component=${Paper} variant="outlined" sx=${{ borderColor: '#E7E7E7' }}>
        <${Table} id="pl-table">
          <${TableHead}><${TableRow}>
            <${TableCell}>${t('colPlaylist')}<//>
            <${TableCell}>${t('colTracks')}<//>
            <${TableCell}>${t('colDuration')}<//>
            <${TableCell}>${t('colPlayMode')}<//>
            <${TableCell}>${t('colUsedBy')}<//>
            <${TableCell} align="right" aria-label=${t('msRowActions')} />
          <//><//>
          <${TableBody}>
            ${playlists.length ? playlists.map(pl => {
              const used = eventsUsing('playlist', pl.id);
              return html`
                <${TableRow} key=${pl.id} hover>
                  <${TableCell} sx=${{ fontWeight: 500 }}>
                    <${Link} component="button" underline="hover" variant="body2"
                      sx=${{ fontWeight: 500 }}
                      onClick=${() => nav('playlistDetail', pl.id)}>${pl.name}<//>
                  <//>
                  <${TableCell} sx=${{ color: 'text.secondary' }}>${pl.trackIds.length}<//>
                  <${TableCell} sx=${{ color: 'text.secondary' }}>${plDuration(pl)}<//>
                  <${TableCell}>
                    <${Chip} size="small" label=${pl.mode === 'shuffle' ? t('modeShuffle') : t('modeOrder')}
                      sx=${{ height: 20, '& .MuiChip-label': { px: 1, fontSize: 11 } }} />
                  <//>
                  <${TableCell} sx=${{ color: 'text.secondary' }}>
                    ${used ? t('usedInEvents', used) : t('notUsed')}<//>
                  <${TableCell} align="right" sx=${{ whiteSpace: 'nowrap' }}>
                    <${Button} onClick=${() => nav('playlistDetail', pl.id)}>${t('msEdit')}<//>
                    <${IconButton} color="error" aria-label=${'delete ' + pl.id}
                      onClick=${() => setDel(pl)}>
                      <${Icon} sx=${{ fontSize: 18 }}>delete_outline<//>
                    <//>
                  <//>
                <//>`;
            }) : html`<${EmptyRow} colSpan=${6} label=${t('noPlaylists')} />`}
          <//>
        <//>
      <//>

      <${ConfirmDialog} open=${!!del} onClose=${() => setDel(null)}
        title=${del ? t('plDelConfirm', del.name) : ''}
        confirmLabel=${audDeleteLabel(lang)} onConfirm=${doDelete} />
    <//>`;
}

/* ── Playlist detail ─────────────────────────────────────────────────
   Basics (name + playback mode) and the ordered track table. Reorder is
   the vanilla's moveToPos() rule — splice out, splice in, clamped to the
   list — driven by the position field and by the two arrow buttons. */
function PlaylistDetailView() {
  const { s, set, t, nav, bump } = useApp();
  const [addOpen, setAddOpen] = useState(false);
  const pl = getPlaylist(s.plId);

  // renderPlaylistDetail() falls back to the library when the id is stale
  if (!pl) return html`<${SoundsView} />`;

  const list = pl.trackIds;
  const moveTo = (i, rawVal) => {
    const newIdx = Math.max(0, Math.min(list.length - 1, parseInt(rawVal, 10) - 1));
    if (isNaN(newIdx) || newIdx === i) return;
    const [item] = list.splice(i, 1);
    list.splice(newIdx, 0, item);
    bump();
  };
  const moveBy = (i, d) => {
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    const [item] = list.splice(i, 1);
    list.splice(j, 0, item);
    bump();
  };
  const removeTrack = i => { list.splice(i, 1); bump(); };

  const toPlaylists = () => { set({ soundTab: 'playlists' }); nav('sounds'); };

  return html`
    <${Box}>
      <${PageHeader}
        crumbs=${[{ label: t('sounds'), onClick: () => nav('sounds') },
                  { label: t('tabPlaylists'), onClick: toPlaylists },
                  { label: pl.name }]}
        title=${pl.name}
        subtitle=${`${list.length} ${t('colTracks')} · ${plDuration(pl)}`} />

      <${PageBody}>
        <${SectionCard} title=${t('evBasics')}>
          <${Stack} direction="row" spacing=${2} flexWrap="wrap" useFlexGap>
            <${TextField} id="pl-name" label=${t('plName')} value=${pl.name}
              sx=${{ minWidth: 320 }}
              onChange=${e => { pl.name = e.target.value; bump(); }} />
            <${FormControl} sx=${{ minWidth: 220 }}>
              <${InputLabel}>${t('colPlayMode')}<//>
              <${Select} id="pl-mode" value=${pl.mode} label=${t('colPlayMode')}
                onChange=${e => { pl.mode = e.target.value; bump(); }}>
                <${MenuItem} value="order">${t('modeOrder')}<//>
                <${MenuItem} value="shuffle">${t('modeShuffle')}<//>
              <//>
            <//>
          <//>
        <//>

        <${SectionCard} title=${t('plTracksTitle')} disablePadding
          action=${html`<${Button} onClick=${() => setAddOpen(true)}>${t('plAddTrack')}<//>`}>
          <${Table} id="pl-track-table">
            <${TableHead}><${TableRow}>
              <${TableCell} sx=${{ width: 96 }}>${t('colPos')}<//>
              <${TableCell}>${t('colName')}<//>
              <${TableCell}>${t('colFilename')}<//>
              <${TableCell}>${t('colDuration')}<//>
              <${TableCell} align="right" aria-label=${t('msRowActions')} />
            <//><//>
            <${TableBody}>
              ${list.length ? list.map((tid, i) => {
                const f = soundFiles.find(x => x.id === tid) || { name: tid, filename: '—', duration: '—' };
                return html`
                  <${TableRow} key=${tid + '-' + i} hover>
                    <${TableCell}>
                      ${/* hiddenLabel: the column heading names this field, the
                            one case the brief lets a control go unlabelled. */ ''}
                      <${TextField} key=${'pos-' + tid + '-' + i} type="number" hiddenLabel
                        defaultValue=${i + 1} sx=${{ width: 76 }}
                        inputProps=${{ min: 1, max: list.length,
                                       'aria-label': `${t('colPos')} ${f.name}` }}
                        onBlur=${e => moveTo(i, e.target.value)}
                        onKeyDown=${e => { if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); } }} />
                    <//>
                    <${TableCell} sx=${{ fontWeight: 500 }}>${f.name}<//>
                    <${TableCell} sx=${{ fontFamily: 'monospace', fontSize: 12, color: 'text.secondary' }}>
                      ${f.filename}<//>
                    <${TableCell} sx=${{ color: 'text.secondary' }}>${f.duration || '—'}<//>
                    <${TableCell} align="right" sx=${{ whiteSpace: 'nowrap' }}>
                      <${IconButton} disabled=${i === 0} aria-label=${'move up ' + tid}
                        onClick=${() => moveBy(i, -1)}>
                        <${Icon} sx=${{ fontSize: 18 }}>arrow_upward<//>
                      <//>
                      <${IconButton} disabled=${i === list.length - 1} aria-label=${'move down ' + tid}
                        onClick=${() => moveBy(i, 1)}>
                        <${Icon} sx=${{ fontSize: 18 }}>arrow_downward<//>
                      <//>
                      <${IconButton} color="error" aria-label=${'remove ' + tid}
                        onClick=${() => removeTrack(i)}>
                        <${Icon} sx=${{ fontSize: 18 }}>delete_outline<//>
                      <//>
                    <//>
                  <//>`;
              }) : html`<${EmptyRow} colSpan=${5} label=${t('plEmpty')} />`}
            <//>
          <//>
        <//>
      <//>

      <${PlaylistAddTrackDialog} open=${addOpen} pl=${pl} onClose=${() => setAddOpen(false)} />
    <//>`;
}

/* plAddTrackModal(). When every music track is already in the playlist the
   vanilla alerts t('plAllAdded'); here the dialog says so and Save is off. */
function PlaylistAddTrackDialog({ open, pl, onClose }) {
  const { t, bump } = useApp();
  const [sel, setSel] = useState('');
  const avail = musicTracks().filter(f => !pl.trackIds.includes(f.id));

  useEffect(() => {
    if (!open) return;
    const first = musicTracks().filter(f => !pl.trackIds.includes(f.id))[0];
    setSel(first ? first.id : '');
  }, [open]);

  const save = () => {
    if (!sel) return;
    pl.trackIds.push(sel);
    bump();
    onClose();
  };

  return html`
    <${Dialog} open=${open} onClose=${onClose} fullWidth maxWidth="xs">
      <${DialogTitle}>${t('plAddTitle')}<//>
      <${DialogContent}>
        ${avail.length ? html`
          <${FormControl} fullWidth required sx=${{ mt: 1 }}>
            <${InputLabel}>${t('colName')}<//>
            <${Select} id="m-pl-track" value=${sel} label=${t('colName')}
              onChange=${e => setSel(e.target.value)}>
              ${avail.map(f => html`
                <${MenuItem} key=${f.id} value=${f.id}>${f.name} — ${f.duration}<//>`)}
            <//>
          <//>`
        : html`<${Alert} severity="info" sx=${{ mt: 1 }}>${t('plAllAdded')}<//>`}
      <//>
      <${DialogActions}>
        <${Button} onClick=${onClose}>${t('cancel')}<//>
        <${Button} variant="contained" disabled=${!avail.length} onClick=${save}>${t('saveEntry')}<//>
      <//>
    <//>`;
}

/* ── Radio tab ──────────────────────────────────────────────────────── */
function AudioRadioTab({ onEdit }) {
  const { t, lang, bump } = useApp();
  const [del, setDel] = useState(null);

  const doDelete = () => {
    const rs = del && getRadio(del.id);
    if (rs) radioStreams.splice(radioStreams.indexOf(rs), 1);
    setDel(null);
    bump();
  };

  return html`
    <${React.Fragment}>
      <${TableContainer} component=${Paper} variant="outlined" sx=${{ borderColor: '#E7E7E7' }}>
        <${Table} id="rs-table">
          <${TableHead}><${TableRow}>
            <${TableCell}>${t('rsName')}<//>
            <${TableCell}>${t('colGenre')}<//>
            <${TableCell}>${t('colStream')}<//>
            <${TableCell}>${t('colUsedBy')}<//>
            <${TableCell} align="right" aria-label=${t('msRowActions')} />
          <//><//>
          <${TableBody}>
            ${radioStreams.length ? radioStreams.map(rs => {
              const used = eventsUsing('radio', rs.id);
              return html`
                <${TableRow} key=${rs.id} hover>
                  <${TableCell} sx=${{ fontWeight: 500 }}>${rs.name}<//>
                  <${TableCell} sx=${{ color: 'text.secondary' }}>${rs.genre || '—'}<//>
                  <${TableCell} sx=${{ fontFamily: 'monospace', fontSize: 12, color: 'text.secondary' }}>
                    ${rs.url}<//>
                  <${TableCell} sx=${{ color: 'text.secondary' }}>
                    ${used ? t('usedInEvents', used) : t('notUsed')}<//>
                  <${TableCell} align="right" sx=${{ whiteSpace: 'nowrap' }}>
                    <${Button} onClick=${() => onEdit(rs.id)}>${t('msEdit')}<//>
                    <${IconButton} color="error" aria-label=${'delete ' + rs.id}
                      onClick=${() => setDel(rs)}>
                      <${Icon} sx=${{ fontSize: 18 }}>delete_outline<//>
                    <//>
                  <//>
                <//>`;
            }) : html`<${EmptyRow} colSpan=${5} label=${t('noRadio')} />`}
          <//>
        <//>
      <//>

      <${ConfirmDialog} open=${!!del} onClose=${() => setDel(null)}
        title=${del ? t('rsDelConfirm', del.name) : ''}
        confirmLabel=${audDeleteLabel(lang)} onConfirm=${doDelete} />
    <//>`;
}

/* showRadioModal(id) — the same dialog adds and edits. The vanilla only
   checks that the URL is non-empty; the format check is the one rule added
   here, and it uses markInvalid()'s optional-message path. */
function RadioDialog({ open, id, onClose }) {
  const { t, lang, bump } = useApp();
  const [name, setName] = useState('');
  const [genre, setGenre] = useState('');
  const [url, setUrl] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    const rs = id ? getRadio(id) : null;
    setName(rs ? rs.name : '');
    setGenre(rs ? rs.genre : '');
    setUrl(rs ? rs.url : '');
    setTouched(false);
  }, [open, id]);

  const errName = touched && !name.trim();
  const errUrlEmpty = touched && !url.trim();
  const errUrlBad = touched && !!url.trim() && !audUrlOk(url);
  const errUrl = errUrlEmpty || errUrlBad;

  const save = () => {
    setTouched(true);
    if (!name.trim() || !url.trim() || !audUrlOk(url)) return;
    const values = { name: name.trim(), genre: genre.trim(), url: url.trim() };
    if (id) {
      Object.assign(getRadio(id), values);
    } else {
      const nextNum = radioStreams.reduce((m, r) => Math.max(m, parseInt(r.id.slice(3), 10) || 0), 0) + 1;
      radioStreams.push({ id: 'RS-' + String(nextNum).padStart(3, '0'), ...values });
    }
    bump();
    onClose();
  };

  return html`
    <${Dialog} open=${open} onClose=${onClose} fullWidth maxWidth="xs">
      <${DialogTitle}>${id ? t('rsEditTitle') : t('rsNewTitle')}<//>
      <${DialogContent}>
        <${Stack} spacing=${2} sx=${{ mt: 1 }}>
          <${TextField} id="m-rs-name" required label=${t('rsName')} value=${name}
            placeholder=${lang === 'de' ? 'z.B. Klassik Radio Berlin' : 'e.g. Klassik Radio Berlin'}
            error=${errName} helperText=${errName ? audRequiredMsg(lang) : ' '}
            onChange=${e => setName(e.target.value)} />
          <${TextField} id="m-rs-genre" label=${t('colGenre')} value=${genre}
            placeholder=${lang === 'de' ? 'z.B. Klassik' : 'e.g. Classical'}
            onChange=${e => setGenre(e.target.value)} />
          <${TextField} id="m-rs-url" required label=${t('colStream')} value=${url}
            placeholder="https://…" error=${errUrl}
            helperText=${errUrlEmpty ? audRequiredMsg(lang) : errUrlBad ? audBadUrlMsg(lang) : ' '}
            onChange=${e => setUrl(e.target.value)} />
        <//>
      <//>
      <${DialogActions}>
        <${Button} onClick=${onClose}>${t('cancel')}<//>
        <${Button} variant="contained" onClick=${save}>${t('saveEntry')}<//>
      <//>
    <//>`;
}

/* ── The Audio library ──────────────────────────────────────────────
   renderSounds(): one header, the Tracks / Playlists / Radio tab bar with
   its counts, and a corner action that follows the tab. Tabs are stock
   MUI, unstyled apart from the surface the bar sits on (brief §2). */
function SoundsView() {
  const { s, set, t, lang, nav, bump } = useApp();
  const [addOpen, setAddOpen] = useState(false);
  const [radioDlg, setRadioDlg] = useState({ open: false, id: null });
  const tab = s.soundTab || 'tracks';

  // newPlaylist(): create, then drop straight into the detail page
  const newPlaylist = () => {
    const nextNum = playlists.reduce((m, pl) => Math.max(m, parseInt(pl.id.slice(3), 10) || 0), 0) + 1;
    const pl = {
      id: 'PL-' + String(nextNum).padStart(3, '0'),
      name: lang === 'de' ? 'Neue Playlist' : 'New playlist',
      mode: 'order',
      trackIds: [],
    };
    playlists.push(pl);
    bump();
    nav('playlistDetail', pl.id);
  };

  const action =
    tab === 'playlists' ? html`<${Button} id="pl-new" variant="contained"
                                 onClick=${newPlaylist}>${t('newPlaylist')}<//>`
  : tab === 'radio'     ? html`<${Button} id="rs-new" variant="contained"
                                 onClick=${() => setRadioDlg({ open: true, id: null })}>${t('newRadio')}<//>`
  :                       html`<${Button} id="snd-add" variant="contained"
                                 startIcon=${html`<${Icon} sx=${{ fontSize: 18 }}>add<//>`}
                                 onClick=${() => setAddOpen(true)}>${t('addAudio')}<//>`;

  const count = n => html`<${Chip} size="small" label=${n}
    sx=${{ ml: 1, height: 18, '& .MuiChip-label': { px: .75, fontSize: 11 } }} />`;
  const tabLabel = (key, n) => html`
    <${Box} sx=${{ display: 'flex', alignItems: 'center' }}>${t(key)}${count(n)}<//>`;

  return html`
    <${Box}>
      <${PageHeader} title=${t('sounds')} subtitle=${t('musicLibIntro')} action=${action} />

      <${Tabs} id="snd-tabs" value=${tab} onChange=${(e, v) => set({ soundTab: v })}
        sx=${{ px: 3, bgcolor: '#fff', borderBottom: '1px solid #E7E7E7' }}>
        <${Tab} value="tracks"    label=${tabLabel('tabTracks', soundFiles.length)} />
        <${Tab} value="playlists" label=${tabLabel('tabPlaylists', playlists.length)} />
        <${Tab} value="radio"     label=${tabLabel('tabRadio', radioStreams.length)} />
      <//>

      <${PageBody}>
        ${tab === 'playlists' ? html`<${AudioPlaylistsTab} />`
        : tab === 'radio'     ? html`<${AudioRadioTab}
                                       onEdit=${id => setRadioDlg({ open: true, id })} />`
        :                       html`<${AudioTracksTab} />`}
      <//>

      <${AudioAddDialog} open=${addOpen} onClose=${() => setAddOpen(false)} />
      <${RadioDialog} open=${radioDlg.open} id=${radioDlg.id}
        onClose=${() => setRadioDlg({ open: false, id: null })} />
    <//>`;
}

VIEWS.sounds = SoundsView;
VIEWS.playlistDetail = PlaylistDetailView;
