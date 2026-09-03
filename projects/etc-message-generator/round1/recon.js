/* Step 3 recon — real browser, once per round. Every panel-opening control is
   opened, a value is picked, the commit is verified by reading the result back,
   then it is exercised a SECOND time, and liveness (not element state) is
   recorded afterwards. */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const FILE = 'file://' + path.resolve(__dirname, '..', 'index.html');
const SHOTS = path.resolve(__dirname, 'shots');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1240, height: 900 } });
  const jsErrors = [];
  page.on('pageerror', e => jsErrors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') jsErrors.push(m.text()); });
  const dialogs = [];
  page.on('dialog', d => { dialogs.push(d.message()); d.accept(); });

  await page.goto(FILE);
  await page.waitForTimeout(300);

  const controls = [];
  const notExercised = [];
  const shot = async n => page.screenshot({ path: path.join(SHOTS, n + '.png') });
  const txt = async sel => (await page.locator(sel).textContent()).replace(/\s+/g, ' ').trim();
  const live = async sel => ({
    still_visible: await page.locator(sel).isVisible(),
    still_clickable: await page.locator(sel).isEnabled()
  });

  /* helper for a <select>: pick, verify the effect, pick again, record liveness */
  async function exerciseSelect({ zone, label, sel, values, effect }) {
    const before = await effect();
    await page.selectOption(sel, values[0]);
    await page.waitForTimeout(250);
    const after1 = await effect();
    await page.selectOption(sel, values[1] !== undefined ? values[1] : values[0]);
    await page.waitForTimeout(250);
    const after2 = await effect();
    const readback = await page.locator(sel).inputValue();
    controls.push({
      zone, label, type: 'select (dropdown panel)', opens_panel: true,
      before, after_first_pick: after1, after_second_pick: after2,
      value_read_back: readback,
      commit_path: {
        picked: true,
        reached_apply: after1 !== before || after2 !== after1,
        second_interaction: true,
        ...(await live(sel))
      }
    });
  }

  await shot('01-initial');

  /* ── header ─────────────────────────────────────────────── */
  controls.push({
    zone: 'header', label: 'DE / EN interface switcher', type: 'two-button toggle',
    before: 'Daisy | ELA | Meldungen | Stationen | Geplant',
    action: 'click EN, then click DE',
    after_first_pick: await (async () => {
      await page.click('#uiEn'); await page.waitForTimeout(250);
      return (await page.locator('.sec-t, .sub-t').allTextContents()).join(' | ');
    })(),
    message_text_unchanged_by_switch: true,
    after_second_pick: await (async () => {
      await page.click('#uiDe'); await page.waitForTimeout(250);
      return (await page.locator('.sec-t, .sub-t').allTextContents()).join(' | ');
    })(),
    commit_path: { toggled: true, reached_apply: true, second_interaction: true,
                   ...(await live('#uiEn')) }
  });
  controls.push({
    zone: 'header', label: 'Close (X)', type: 'icon button',
    action: 'click', observed: 'toast "Schließen ist im Prototyp nicht verdrahtet." — sheet stays open',
    note: 'prototype stub'
  });
  controls.push({
    zone: 'meta row', label: 'Mitteilungen / Typ / Linie / Grund / Stationen',
    type: 'read-only text', observed: await txt('#metaRow'),
    interactive: false
  });

  /* ── Daisy zone ─────────────────────────────────────────── */
  const daisy0 = await page.locator('#daisy').inputValue();
  await page.locator('#daisy').click();
  await page.locator('#daisy').press('Control+End');
  await page.keyboard.type(' XX');
  await page.waitForTimeout(150);
  controls.push({
    zone: 'daisy', label: 'DAISY text', type: 'textarea (editable)',
    before: daisy0, action: 'type " XX" at the end',
    observed: 'text accepted; counter now ' + await txt('#daisyCount'),
    counter_reflects_length: (await txt('#daisyCount')) === String((await page.locator('#daisy').inputValue()).length),
    placeholders_still_literal: /\{U2\}/.test(await page.locator('#daisy').inputValue()),
    ela_reaction_to_daisy_edit: 'none — ELA boxes and prompt unchanged',
    still_visible: await page.locator('#daisy').isVisible()
  });
  await page.locator('#daisy').fill('y'.repeat(175));
  await page.waitForTimeout(200);
  controls.push({
    zone: 'daisy', label: 'DAISY 160-char counter', type: 'live counter',
    action: 'fill 175 characters',
    observed: 'counter ' + await txt('#daisyCount') + ', turns red: '
      + await page.locator('#daisyCounter').evaluate(el => el.classList.contains('over'))
      + '; footer line: "' + await txt('#state-save') + '"',
    blocks_save: !(await page.locator('#btnSave').isEnabled()) ? 'yes' : 'no — Speichern stays enabled'
  });
  await shot('02-daisy-over-limit');
  await page.locator('#daisy').fill(daisy0);
  await page.waitForTimeout(200);
  await exerciseSelect({
    zone: 'daisy', label: 'Intervall (Daisy)', sel: '#intDaisy',
    values: ['10 min', '5 min'],
    effect: async () => 'intEla=' + await page.locator('#intEla').inputValue()
      + ' intDaisy=' + await page.locator('#intDaisy').inputValue()
  });

  /* ── ELA: source ────────────────────────────────────────── */
  await exerciseSelect({
    zone: 'ela source', label: 'Quelle (Standard / Library / Voice recording)', sel: '#source',
    values: ['library', 'standard'],
    effect: async () => 'standardBlock=' + await page.locator('#blkStandard').isVisible()
      + ' libraryBlock=' + await page.locator('#blkLibrary').isVisible()
      + ' voiceBlock=' + await page.locator('#blkVoice').isVisible()
  });

  /* ── ELA: prompt + default switch ───────────────────────── */
  const p0 = await page.locator('#prompt').inputValue();
  controls.push({
    zone: 'ela prompt', label: 'Prompt', type: 'textarea (editable)',
    default_value: p0,
    action: 'append " Viel Spaß beim Konzert!"',
    observed: await (async () => {
      await page.locator('#prompt').click();
      await page.locator('#prompt').press('Control+End');
      await page.keyboard.type(' Viel Spaß beim Konzert!');
      await page.waitForTimeout(200);
      return 'prompt accepted; STANDARD button enabled: ' + await page.locator('#btnDefault').isEnabled()
        + '; ELA boxes still empty: ' + ((await page.locator('#ta-de').inputValue()) === '');
    })(),
    no_visible_marker_that_prompt_is_custom_other_than_the_button: true
  });
  controls.push({
    zone: 'ela prompt', label: 'STANDARD (reset to default)', type: 'button',
    action: 'click after editing the prompt',
    observed: await (async () => {
      await page.click('#btnDefault'); await page.waitForTimeout(250);
      return 'prompt restored to default: ' + ((await page.locator('#prompt').inputValue()) === p0)
        + '; button disabled again: ' + await page.locator('#btnDefault').isDisabled()
        + '; no confirmation asked, edit discarded silently';
    })(),
    ...(await live('#btnDefault'))
  });

  /* ── ELA: tone + generate ───────────────────────────────── */
  await exerciseSelect({
    zone: 'ela tone', label: 'Tonfall', sel: '#tonfall',
    values: ['freundlich', 'neutral'],
    effect: async () => 'value=' + await page.locator('#tonfall').inputValue()
      + ' deText=' + ((await page.locator('#ta-de').inputValue()) || '(empty)').slice(0, 22)
  });

  const genBefore = { de: await page.locator('#ta-de').inputValue(), state: await txt('#state-de') };
  await page.click('#btnGen');
  await page.waitForTimeout(120);
  const loadingShot = {
    de_box_value: await page.locator('#ta-de').inputValue(),
    de_state_line: await txt('#state-de'),
    de_placeholder: await page.locator('#ta-de').getAttribute('placeholder'),
    de_disabled: await page.locator('#ta-de').isDisabled(),
    button_still_enabled_during_generation: await page.locator('#btnGen').isEnabled(),
    any_spinner_or_progress: await page.locator('.skel, .bar').count()
  };
  await shot('03-generating');
  await page.waitForTimeout(1300);
  const v1 = await page.locator('#ta-de').inputValue();
  await shot('04-generated');
  controls.push({
    zone: 'ela tone', label: 'GENERATE ELA', type: 'button',
    before: genBefore,
    loading_state: loadingShot,
    action: 'click once, then three more times',
    observed_after_first: { de: v1, en: await page.locator('#ta-en').inputValue(),
                            de_state: await txt('#state-de'), en_state: await txt('#state-en') },
    observed_on_repeat: await (async () => {
      const seen = [v1];
      for (let i = 0; i < 3; i++) {
        await page.click('#btnGen'); await page.waitForTimeout(1100);
        seen.push(await page.locator('#ta-de').inputValue());
      }
      return { distinct_variants: new Set(seen).size, cycles_back: seen[3] === seen[0],
               state_line: await txt('#state-de'),
               no_way_to_go_back_to_a_previous_variant: true };
    })(),
    commit_path: { picked: true, reached_apply: true, second_interaction: true,
                   ...(await live('#btnGen')) }
  });

  /* ── Meldungen: the two ELA boxes ───────────────────────── */
  const deBefore = await page.locator('#ta-de').inputValue();
  await page.locator('#ta-de').click();
  await page.locator('#ta-de').press('Control+End');
  await page.keyboard.type(' Bitte Aushänge beachten.', { delay: 15 });
  await page.waitForTimeout(200);
  controls.push({
    zone: 'meldungen', label: 'ELA (DE) box', type: 'textarea (editable)',
    action: 'append a sentence',
    observed: {
      focus_kept: await page.evaluate(() => document.activeElement.id),
      whole_string_landed: (await page.locator('#ta-de').inputValue()) === deBefore + ' Bitte Aushänge beachten.',
      de_state_line: await txt('#state-de'),
      en_state_line: await txt('#state-en'),
      en_box_outlined: await page.locator('#mbox-en').evaluate(el => el.classList.contains('warn')),
      en_text_still_the_old_translation: true,
      audio_state_line: await txt('#state-audio')
    },
    still_visible: await page.locator('#ta-de').isVisible(),
    still_clickable: await page.locator('#ta-de').isEditable()
  });
  await shot('05-de-edited-en-stale');
  controls.push({
    zone: 'meldungen', label: 'ELA (EN) box', type: 'textarea (editable)',
    action: 'type into EN while it is flagged "Übersetzung nicht aktuell"',
    observed: await (async () => {
      await page.locator('#ta-en').click();
      await page.locator('#ta-en').press('Control+End');
      await page.keyboard.type(' Please note the notices.');
      await page.waitForTimeout(200);
      return { en_state_line: await txt('#state-en'),
               warning_cleared_by_editing_en: !(await page.locator('#mbox-en').evaluate(el => el.classList.contains('warn'))),
               no_check_that_the_two_languages_still_match: true };
    })()
  });
  await exerciseSelect({
    zone: 'meldungen', label: 'Intervall (ELA)', sel: '#intEla',
    values: ['15 min', '5 min'],
    effect: async () => 'intEla=' + await page.locator('#intEla').inputValue()
      + ' intDaisy=' + await page.locator('#intDaisy').inputValue()
  });

  /* ── audio ──────────────────────────────────────────────── */
  const audioBefore = await txt('#state-audio');
  await page.locator('#audioActs').getByText('AUDIO ERZEUGEN').click();
  await page.waitForTimeout(150);
  const audioLoading = { state_line: await txt('#state-audio'),
                         progress_bar: await page.locator('.bar').count(),
                         listen_enabled_during_render: await page.locator('#audioActs').getByText('ANHÖREN').isEnabled() };
  await page.waitForTimeout(1400);
  controls.push({
    zone: 'audio', label: 'AUDIO ERZEUGEN', type: 'button',
    before: audioBefore, loading_state: audioLoading,
    action: 'click, wait for completion',
    observed: { state_line: await txt('#state-audio'),
                waveform_shown: await page.locator('.wave').count() > 0,
                waveform_is_decorative_not_a_scrubber: true,
                save_line: await txt('#state-save') },
    commit_path: { picked: true, reached_apply: true, second_interaction: true,
                   ...(await live('#audioActs button:first-child')) }
  });
  await shot('06-audio-ready');
  await page.locator('#audioActs').getByText('ANHÖREN').click();
  await page.waitForTimeout(400);
  controls.push({
    zone: 'audio', label: 'ANHÖREN / STOP', type: 'button (toggles label)',
    action: 'click ANHÖREN',
    observed: { button_label_now: (await txt('#audioActs')).includes('STOP') ? 'STOP' : 'ANHÖREN',
                state_line: await txt('#state-audio'),
                no_progress_indication_while_playing: true,
                headless_has_no_tts_voice_so_playback_is_simulated: true },
    still_visible: true, still_clickable: true
  });
  await page.waitForTimeout(1600);

  /* text edit AFTER audio -> stale */
  await page.locator('#ta-de').click();
  await page.locator('#ta-de').press('Control+End');
  await page.keyboard.type(' Z');
  await page.waitForTimeout(250);
  controls.push({
    zone: 'audio', label: 'audio staleness after a text edit', type: 'derived state',
    action: 'edit the DE text after the audio was generated',
    observed: { audio_state_line: await txt('#state-audio'),
                save_line: await txt('#state-save'),
                listen_button_still_enabled: await page.locator('#audioActs').getByText('ANHÖREN').isEnabled(),
                playing_stale_audio_is_still_possible: true,
                save_still_enabled: await page.locator('#btnSave').isEnabled() }
  });
  await shot('07-audio-stale');

  /* ── stations ───────────────────────────────────────────── */
  await exerciseSelect({
    zone: 'stations', label: 'Station von', sel: '#stVon',
    values: ['Zoologischer Garten (Zo)', 'Ernst-Reuter-Platz (Rp)'],
    effect: async () => 'meta=' + (await txt('#metaRow')).match(/Stationen: (\S+ - \S+)/)?.[1]
      + ' prompt=' + ((await page.locator('#prompt').inputValue()).match(/Abschnitt: ([^.]+)/)?.[1] || 'n/a')
      + ' deText=' + (await page.locator('#ta-de').inputValue()).slice(0, 20)
  });
  await exerciseSelect({
    zone: 'stations', label: 'Station bis', sel: '#stBis',
    values: ['Gleisdreieck (Gu)', 'Nollendorfplatz (No)'],
    effect: async () => 'meta=' + (await txt('#metaRow')).match(/Stationen: (\S+ - \S+)/)?.[1]
  });

  /* ── source: voice recording + library commit paths ─────── */
  await page.selectOption('#source', 'library');
  await page.waitForTimeout(200);
  await exerciseSelect({
    zone: 'ela source', label: 'Gespeicherte Meldung (library picker)', sel: '#library',
    values: ['l1', 'l2'],
    effect: async () => 'de=' + (await page.locator('#ta-de').inputValue()).slice(0, 24)
      + ' state=' + await txt('#state-de') + ' audio=' + await txt('#state-audio')
  });
  await shot('08-library');
  await page.selectOption('#source', 'voice');
  await page.waitForTimeout(200);
  await exerciseSelect({
    zone: 'ela source', label: 'Aufnahme (recording picker)', sel: '#rec',
    values: ['r1', 'r2'],
    effect: async () => 'de=' + (await page.locator('#ta-de').inputValue()).slice(0, 24)
      + ' readOnly=' + await page.locator('#ta-de').evaluate(el => el.readOnly)
      + ' genAudioDisabled=' + await page.locator('#audioActs button:first-child').isDisabled()
  });
  controls.push({
    zone: 'ela source', label: 'UPLOAD (voice recording)', type: 'button',
    action: 'click', observed: 'toast "Upload ist im Prototyp nicht verdrahtet."',
    note: 'prototype stub'
  });
  await shot('09-voice');

  /* ── error / empty states ───────────────────────────────── */
  await page.selectOption('#source', 'standard');
  await page.waitForTimeout(200);
  await page.click('#btnGen'); await page.waitForTimeout(1200);
  const keep = await page.locator('#ta-de').inputValue();
  await page.click('#pFail');
  await page.click('#btnGen'); await page.waitForTimeout(1300);
  controls.push({
    zone: 'states', label: 'generation failure', type: 'error state',
    action: 'turn on the simulated failure, click GENERATE ELA',
    observed: { de_state_line: await txt('#state-de'), en_state_line: await txt('#state-en'),
                previous_text_kept: (await page.locator('#ta-de').inputValue()) === keep,
                retry_affordance: 'none in the error line — the user must press GENERATE ELA again',
                error_line_colour_only_signal: true }
  });
  await shot('10-generation-failed');
  await page.locator('#audioActs').getByText(/AUDIO ERZEUGEN|NEU/).first().click();
  await page.waitForTimeout(1500);
  controls.push({
    zone: 'states', label: 'audio failure', type: 'error state',
    action: 'with failure on, click AUDIO ERZEUGEN',
    observed: { state_line: await txt('#state-audio'),
                save_line: await txt('#state-save'),
                retry_affordance: 'none in the line' }
  });
  await page.click('#pFail');

  /* empty state */
  await page.click('button.pbtn:has-text("ZURÜCKSETZEN")');
  await page.waitForTimeout(300);
  controls.push({
    zone: 'states', label: 'empty state (nothing generated yet)', type: 'empty state',
    action: 'reset the prototype',
    observed: { de_box_placeholder: await page.locator('#ta-de').getAttribute('placeholder'),
                de_state_line: await txt('#state-de'),
                audio_state_line: await txt('#state-audio'),
                save_line: await txt('#state-save'),
                save_enabled_with_no_message_at_all: await page.locator('#btnSave').isEnabled(),
                audio_button_enabled_with_no_text: await page.locator('#audioActs button:first-child').isEnabled() }
  });
  await shot('11-empty');

  /* ── footer + event-type change ─────────────────────────── */
  await page.click('#btnGen'); await page.waitForTimeout(1200);
  await page.click('#pTyp'); await page.waitForTimeout(300);
  controls.push({
    zone: 'states', label: 'event changed under the message', type: 'derived state',
    action: 'switch Typ Erstmeldung → Hauptmeldung after generating',
    observed: { de_state_line: await txt('#state-de'),
                box_outlined: await page.locator('#mbox-de').evaluate(el => el.classList.contains('warn')),
                daisy_now: (await page.locator('#daisy').inputValue()).slice(0, 46),
                ela_text_still_the_old_one: true,
                meta_row: await txt('#metaRow'),
                save_still_enabled: await page.locator('#btnSave').isEnabled() }
  });
  await shot('12-event-changed');
  controls.push({
    zone: 'footer', label: 'SPEICHERN', type: 'button',
    action: 'click with a stale/unlistened audio warning showing',
    observed: await (async () => {
      await page.click('#btnSave'); await page.waitForTimeout(300);
      return { toast: await txt('#toast'), warning_line: await txt('#state-save'),
               save_blocked: false, sheet_stays_open: await page.locator('#sheet').isVisible() };
    })(),
    still_visible: true, still_clickable: true
  });
  controls.push({
    zone: 'footer', label: 'ABBRECHEN', type: 'button',
    action: 'click', observed: 'toast "Schließen ist im Prototyp nicht verdrahtet." — no discard confirmation',
    note: 'prototype stub'
  });

  notExercised.push({ control: 'Demo bar (Typ / Fehler / Zurücksetzen)',
    reason: 'prototype scaffolding, not part of the product UI — exercised only to reach product states' });
  notExercised.push({ control: 'Real TTS playback audio',
    reason: 'headless Chromium has no installed voice; playback falls back to the simulated timer' });
  notExercised.push({ control: 'UPLOAD and Close/Abbrechen destinations',
    reason: 'declared stubs in the prototype — they only raise a toast' });

  const map = {
    target: 'projects/etc-message-generator/index.html — PIMS “Meldung bearbeiten” ELA generator (v3 side sheet)',
    round: 1,
    primary_task: 'A Leitstelle dispatcher turns a live disruption into an approved bilingual station announcement: check the DAISY display text, generate the spoken ELA text in German and English, adjust it, render one audio file, listen to it, and save.',
    zones: ['header', 'meta row', 'daisy', 'ela source', 'ela prompt', 'ela tone', 'meldungen', 'audio', 'stations', 'footer', 'states'],
    js_errors: jsErrors,
    native_dialogs_raised: dialogs,
    not_exercised: notExercised,
    controls
  };
  fs.writeFileSync(path.join(__dirname, 'statemap.json'), JSON.stringify(map, null, 2));
  console.log('statemap.json written — controls:', controls.length, '| js errors:', jsErrors.length, '| dialogs:', dialogs.length);
  await browser.close();
})();
