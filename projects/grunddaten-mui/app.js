/* ════════════════════════════════════════════════════════════════════
   PIMS Grunddaten — the app shell and the router.

   Loads after ui.js and the views-*.js files, which have registered
   themselves into VIEWS by the time this runs.
   ════════════════════════════════════════════════════════════════════ */

/* i18n.js defines the vanilla's own t(). Alias it before Root shadows the
   name, so the language-aware wrapper below is a wrapper over ONE lookup and
   not a second implementation that can drift from the extracted logic's. */
const t_ = t;

/* The nav highlight rules, lifted from the vanilla's render(): a detail view
   keeps its list's menu entry marked. */
const NAV_PARENT = {
  detail: 'stations', lineDetail: 'lines', playlistDetail: 'sounds',
  musicEvent: 'music',
};
const navActive = (view, entry) => view === entry || NAV_PARENT[view] === entry;

/** The BVG heart, kept as-is: it is the client's mark, not a MUI component. */
function BvgHeart() {
  return html`
    <${Box} sx=${{ width: 30, height: 30, bgcolor: '#FFCC00', borderRadius: '50% 50% 50% 0',
                   transform: 'rotate(-45deg)', display: 'flex', alignItems: 'center',
                   justifyContent: 'center', flexShrink: 0, mr: 2.5 }}>
      <${Box} component="span" sx=${{ transform: 'rotate(45deg)', fontSize: 9, fontWeight: 700,
                                      color: '#000', letterSpacing: '-0.5px' }}>BVG<//>
    <//>`;
}

/** A top-nav entry that opens a real MUI Menu. Never a native select. */
function NavMenu({ label, active, id, children }) {
  const [anchor, setAnchor] = useState(null);
  return html`
    <${React.Fragment}>
      ${/* data-nav, like data-view, is a stable hook: the label itself is
            translated, so a check that clicks "Konfiguration" cannot reach the
            same menu once the page is in English. */ ''}
      <${Button} color="inherit" data-nav=${id} onClick=${e => setAnchor(e.currentTarget)}
        aria-haspopup="menu" aria-expanded=${!!anchor}
        endIcon=${html`<${Icon} sx=${{ fontSize: 18 }}>expand_more<//>`}
        sx=${{ height: BAR_H, borderRadius: 0, px: 1.75, textTransform: 'none', fontSize: 14,
               fontWeight: active ? 500 : 400,
               borderBottom: active ? '3px solid' : '3px solid transparent',
               borderColor: active ? 'primary.main' : 'transparent',
               color: active ? 'primary.main' : 'inherit' }}>${label}<//>
      <${Menu} anchorEl=${anchor} open=${!!anchor} onClose=${() => setAnchor(null)}
        anchorOrigin=${{ vertical: 'bottom', horizontal: 'left' }}>
        ${children(() => setAnchor(null))}
      <//>
    <//>`;
}

function Shell() {
  const app = useApp();
  const { t, s, nav } = app;
  const View = VIEWS[s.view];

  const item = (view, label, onClick) => html`
    <${MenuItem} key=${view} selected=${navActive(s.view, view)} data-view=${view}
      onClick=${onClick}><${ListItemText} primary=${label} /><//>`;

  return html`
    <${Box} sx=${{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>

      ${/* Staging banner — MUI Alert, default styling. */ ''}
      <${Alert} severity="warning" square icon=${false}
        sx=${{ justifyContent: 'center', py: .25, flexShrink: 0 }}>
        <b>Staging</b> – Here you can safely test features. Nothing will be played on DAISYs or ELAs.
      <//>

      ${/* The vanilla's own chrome: white, 52px, a hairline and a 1px shadow. */ ''}
      <${AppBar} position="static" sx=${{ bgcolor: BAR_BG, color: 'text.primary', flexShrink: 0,
                                          borderBottom: '1px solid', borderColor: 'divider',
                                          boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <${Toolbar} sx=${{ minHeight: BAR_H, height: BAR_H, px: 2 }}>
          <${BvgHeart} />
          <${Stack} direction="row" sx=${{ height: BAR_H, alignItems: 'stretch' }}>
            ${['Incidents', 'Line view', 'Messages view'].map(l => html`
              <${Button} key=${l} color="inherit" disabled
                sx=${{ height: BAR_H, borderRadius: 0, px: 1.75, textTransform: 'none', fontSize: 14 }}>${l}<//>`)}

            <${NavMenu} id="evr" label=${t('evrMenu')} active=${EVR_VIEWS.includes(s.view)}>
              ${close => [
                html`<${MenuItem} key="text" onClick=${close}><${ListItemText} primary=${t('evrText')} /><//>`,
                item('music', t('evrMusic'), () => { close(); nav('music'); }),
              ]}
            <//>

            <${NavMenu} id="cfg" label=${state.lang === 'de' ? 'Konfiguration' : 'Configuration'}
              active=${GD_VIEWS.includes(s.view)}>
              ${close => [
                html`<${MenuItem} key="users" onClick=${close}>
                  <${ListItemText} primary=${state.lang === 'de' ? 'Benutzer und Rechte' : 'Users and permissions'} /><//>`,
                html`<${MenuItem} key="tpl" onClick=${close}>
                  <${ListItemText} primary=${state.lang === 'de' ? 'Vorlagen' : 'Templates'} /><//>`,
                item('sounds',   t('sounds'),   () => { close(); nav('sounds'); }),
                item('lineMgmt', t('lineMgmt'), () => { close(); nav('lineMgmt'); }),
                html`<${Divider} key="sep" />`,
                html`<${ListSubheader} key="hdr" sx=${{ lineHeight: '30px' }}>${t('stationConfigs')}<//>`,
                item('stations', t('stations'), () => { close(); nav('stations'); }),
                item('lines',    t('lines'),    () => { close(); nav('lines'); }),
                item('spc',      t('spcPage'),  () => { close(); nav('spc'); }),
                item('texts',    t('texts'),    () => { close(); nav('texts'); }),
              ]}
            <//>
          <//>

          <${Box} sx=${{ flexGrow: 1 }} />

          <${Stack} direction="row" spacing=${1} alignItems="center">
            <${Button} color="primary" sx=${{ textTransform: 'uppercase', fontSize: 13, fontWeight: 500,
                                              letterSpacing: '0.04em' }}
              endIcon=${html`<${Icon} sx=${{ fontSize: 14 }}>north_east<//>`}>Virtual Daisy & ELA<//>
            <${Divider} orientation="vertical" flexItem sx=${{ my: 1.5 }} />
            <${Typography} variant="body2" color="text.secondary">TN I, TN II, TN III<//>
            <${IconButton} color="inherit" aria-label="notifications">
              <${Icon} sx=${{ fontSize: 18 }}>notifications<//><//>
            <${ToggleButtonGroup} exclusive size="small" value=${state.lang}
              onChange=${(e, v) => v && app.setLang(v)}
              sx=${{ '& .MuiToggleButton-root': { py: .25, px: 1, fontSize: 12 } }}>
              <${ToggleButton} value="de" aria-label="Deutsch">DE<//>
              <${ToggleButton} value="en" aria-label="English">EN<//>
            <//>
            <${Avatar} sx=${{ width: 32, height: 32, fontSize: 11, fontWeight: 700,
                              bgcolor: 'primary.main' }}>BVG<//>
            <${Typography} variant="body2" color="text.secondary">BVG BVG<//>
          <//>
        <//>
      <//>

      ${/* Content. Full width, 24px gutters — brief §3. */ ''}
      ${/* data-view is the observable the parity checker reads, so it can walk
            the app and report which views it actually reached rather than
            asserting the ones it happened to remember. */ ''}
      <${Box} component="main" data-view=${s.view} sx=${{ flexGrow: 1, minWidth: 0 }}>
        ${View ? html`<${View} />` : html`
          <${PageBody}><${Alert} severity="error">Unknown view: ${s.view}<//><//>`}
      <//>

      <${Snackbar} open=${!!app.toastMsg} autoHideDuration=${2400} onClose=${app.clearToast}
        message=${app.toastMsg} anchorOrigin=${{ vertical: 'bottom', horizontal: 'center' }} />
    <//>`;
}

function Root() {
  const [s, setS] = useState(INITIAL);
  const [lang, setLangState] = useState('de');   // the vanilla starts in German
  const [rev, setRev] = useState(0);             // in-place mutation nudge
  const [toastMsg, setToastMsg] = useState('');

  // one lookup, shared with the extracted logic in data.js
  setDataLang(lang);
  const t = useCallback((k, ...a) => t_(k, ...a), [lang]);

  const set = useCallback(patch => setS(prev => ({ ...prev, ...patch })), []);

  /** The vanilla's navigate(), with the same per-view argument handling. */
  const nav = useCallback((view, id, line) => {
    setS(prev => {
      const next = { ...prev, view };
      if (view === 'lineDetail') next.selectedLineId = id || null;
      else if (view === 'playlistDetail') next.plId = id || prev.plId;
      else if (view === 'musicEvent') {
        if (id !== undefined && id !== null) { next.evId = id; next.evDraft = cloneEvent(getEvent(id)); }
      } else { next.selectedId = id || null; next.selectedLine = line || null; }
      return next;
    });
  }, []);

  const setLang = useCallback(l => {
    setLangState(l);
    setDataLang(l);
    document.documentElement.lang = l;   // native date/time inputs follow this
  }, []);

  const value = useMemo(() => ({
    s, set, nav, t, lang, setLang, rev,
    bump: () => setRev(r => r + 1),
    toast: m => setToastMsg(m),
    toastMsg, clearToast: () => setToastMsg(''),
  }), [s, lang, rev, toastMsg, set, nav, t, setLang]);

  return html`
    <${ThemeProvider} theme=${theme}>
      <${CssBaseline} />
      <${App.Provider} value=${value}>
        <${Shell} />
      <//>
    <//>`;
}

ReactDOM.createRoot(document.getElementById('root')).render(html`<${Root} />`);
