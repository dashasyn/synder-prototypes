# State map — projects/txnrecon-setup/finalist-1-sketch.html (Finalist 1 · Automatic retrieval — the #f1 pane of team-compare.html)

URL: https://dashasyn.github.io/synder-prototypes/projects/txnrecon-setup/finalist-1-sketch.html

**Primary task:** Set up a reconciliation run: choose the period, the integration and the QuickBooks account, decide how the two sides of the data get here (automatic retrieval or uploaded files), then start the run.

Page JS errors: none

## Controls

### [header] Close (✕) — icon button
- before: Setup form filled in
- on interaction: no visible change, no dialog, no navigation (url unchanged: true). No confirmation before discarding the setup.
- after interaction still_visible=true, still_clickable=true

### [header] Read-only. Nothing in your books changes. — static badge
- on interaction: Static text beside the primary action. Text: "Read-only. Nothing in your books changes."
- after interaction still_visible=true, still_clickable=true

### [period] Date range — native select (dropdown)
- options: "Last week (Aug 24–30)", "Last month (Aug 1–31)", "Last quarter (Jun 1–Aug 31)", "Custom"
- before: value=last_month, hint="Last full month — the usual close period", custom date inputs visible=false
- on interaction: picked Custom -> value=custom, date inputs visible=true, prefilled 2026-08-01..2026-08-31, hint="2026-08-01 – 2026-08-31". Picked Last week -> hint="" (EMPTY string; Last month is the only option with helper copy), inputs 2026-08-24..2026-08-30, inputs visible=false. Picked Custom again -> visible=true, inputs 2026-08-24..2026-08-30.
- after interaction still_visible=true, still_clickable=true
- commit path: {"picked":true,"reached_apply":true,"apply_note":"no Apply step — native select commits on change; value read back and confirmed changed","second_interaction":true,"still_visible":true,"still_clickable":true}

### [period] Custom start / end date inputs — date inputs
- before: Custom selected, 2026-08-01..2026-08-31
- on interaction: Set end BEFORE start (2026-08-31 -> 2026-08-01): hint shows "2026-08-31 – 2026-08-01", no error element on page (count=0), Run reconciliation disabled=false. Set an entirely future range (2027-01-01..2027-12-31): hint "2027-01-01 – 2027-12-31", Run disabled=false. No validation of any kind on the range.
- after interaction still_visible=true, still_clickable=true

### [period] About date range (?) tooltip — icon button + popover
- on interaction: Keyboard focus on the "?" button -> bubble visible=true. Mouse hover -> bubble visible=true. Bubble text: "Compares transactions dated in this range in QuickBooks and on the platform.". Button carries aria-label but no aria-describedby/aria-expanded linking it to the bubble.
- after interaction still_visible=true, still_clickable=true
- commit path: {"toggled":true,"reached_apply":true,"apply_note":"informational popover — reaching the content IS the commit; recorded whether it can be reached by keyboard as well as mouse","second_interaction":true,"still_visible":true,"still_clickable":true}

### [what to reconcile] Integration — native select (dropdown)
- options: "mzkt.by (Stripe)", "Great payments for every one (PayPal)", "My store (Shopify)"
- before: value=stripe, hint="Timezone: Europe/Minsk", "Upload manually" toggle visible=true, automatic card visible=true
- on interaction: Picked PayPal -> hint="Timezone: UTC +3:00, Vilnius", automatic-retrieval card visible=false, manual upload panel visible=true, the "Upload manually" toggle DISAPPEARS (visible=false) with no explanation, Run disabled=true, account hint="Currency: EUR". Picked Shopify -> hint="Timezone: Europe/Vilnius", toggle visible=false, Run disabled=true. Picked Stripe again -> hint="Timezone: Europe/Minsk", automatic card back (visible=true), Run disabled=false. NOTE the two hint formats: Stripe "Timezone: Europe/Minsk" vs PayPal "Timezone: UTC +3:00, Vilnius".
- after interaction still_visible=true, still_clickable=true
- commit path: {"picked":true,"reached_apply":true,"apply_note":"commits on change; value + downstream panels read back","second_interaction":true,"still_visible":true,"still_clickable":true}

### [what to reconcile] Account to reconcile — native select (dropdown)
- options: "Stripe mzkt.by (required for Synder)", "Stripe fees", "Stripe sales"
- before: value=clearing, hint="Currency: USD" (class=hint)
- on interaction: Picked "Stripe fees" (a shared account) -> hint becomes "Stripe fees is shared across connections, so Synder may not know which one to use. Prefer the account tied to this connection." (class=hint warn), Run reconciliation still enabled (disabled=false). Picked "Stripe sales" -> "Stripe sales is shared across connections, so Synder may not know which one to use. Prefer the account tied to this connection.", Run disabled=false. The currency, which the non-shared hint shows, DISAPPEARS when the warning takes over the same hint slot. Back on "Stripe mzkt.by (required for Synder)" -> hint="Currency: USD".
- after interaction still_visible=true, still_clickable=true
- commit path: {"picked":true,"reached_apply":true,"apply_note":"commits on change; hint + Run state read back","second_interaction":true,"still_visible":true,"still_clickable":true}

### [how we get the data] Automatic file retrieval card — static card
- on interaction: Title "Automatic file retrieval Recommended", body "Synder pulls QuickBooks and Stripe for this period. Large pulls can take a few hours — we’ll email you when it’s ready.". Shown by default for Stripe. Run reconciliation enabled=true.
- after interaction still_visible=true, still_clickable=true

### [how we get the data] Upload manually / Use automatic retrieval toggle — link button switching panel
- before: Automatic file retrieval card shown, label "Upload manually", Run enabled
- on interaction: Click 1 -> manual panel visible=true with 2 source cards; books Import method defaults to "Automated" while the integration side flips to "Assisted" — so "Upload manually" produces a HYBRID where the Accounting side is still automated; Run becomes disabled=true with no on-screen statement of what is missing; focus after click = button#mode-toggle.lnk "Use automatic retrieval". Click 2 -> label "Upload manually", automatic card visible=true, Run re-enabled (disabled=false) and any files already picked are silently discarded. Click 3 -> back to manual, still live.
- after interaction still_visible=true, still_clickable=true
- commit path: {"toggled":true,"reached_apply":true,"apply_note":"the toggle IS the commit — panel swap verified in both directions","second_interaction":true,"still_visible":true,"still_clickable":true}

### [how we get the data · Accounting card] Import method (Accounting) — native select (dropdown)
- options: "Automated (recommended)", "Manual"
- before: Manual mode open, Accounting method = Automated, no upload blocks
- on interaction: Picked Manual -> 1 upload block(s) appear, Run disabled=true; focus after the change = button#mode-toggle.lnk "Use automatic retrieval" (the whole #sources grid is re-rendered via innerHTML on every change). Picked Automated again -> blocks=0. Picked Manual a second time -> still live.
- after interaction still_visible=true, still_clickable=true
- commit path: {"picked":true,"reached_apply":true,"apply_note":"commits on change; upload blocks read back","second_interaction":true,"still_visible":true,"still_clickable":true}

### [how we get the data · Integration card] Import method (Integration) — native select (dropdown)
- options: "Automated (recommended)", "Assisted", "Manual"
- on interaction: Picked Manual -> 1 upload block(s). Picked Assisted -> 2 upload block(s). Picked "Automated (recommended)" from INSIDE the manual panel -> upload blocks=0, Run disabled=true, but the page stays in the manual panel (automatic card visible=false) while the toggle above still reads "Use automatic retrieval" — two different controls now set the same thing and disagree about which mode is active. Picked Assisted again -> blocks back.
- after interaction still_visible=true, still_clickable=true
- commit path: {"picked":true,"reached_apply":true,"apply_note":"commits on change; blocks + Run state read back","second_interaction":true,"still_visible":true,"still_clickable":true}

### [how we get the data · Integration card] How to get <file> — steps accordion — accordion
- before: aria-expanded=false, steps visible=false
- on interaction: Click 1 -> aria-expanded=true, steps visible=true, focus afterwards = body (focus lost). Click 2 (collapse) -> aria-expanded=false, steps visible=false, header still visible=true / clickable=true, focus = body (focus lost). Click 3 -> expands again. The header survives repeat toggling, but every toggle re-renders #sources via innerHTML, so keyboard focus is destroyed each time.
- after interaction still_visible=true, still_clickable=true
- commit path: {"toggled":true,"reached_apply":true,"apply_note":"no Apply — expanding IS the commit; verified the panel content is reachable and the header survives a second toggle","second_interaction":true,"still_visible":true,"still_clickable":true}

### [how we get the data · upload blocks] Browse (file picker) / Remove — button + drop zone
- before: 3 empty drop zone(s), Run disabled=true
- on interaction: Click Browse -> no OS file dialog; the prototype fabricates a file. Chip shows name "General_ledger_export_export.csv" and size "0.1 Mb" (a hard-coded size for a file nobody chose), chips=1, Run disabled=true, focus afterwards = body (focus lost). Filling every block -> chips=3, Run disabled=false. Clicking Remove -> chips=2, Run disabled=true again, with no message naming what is now missing. Re-picking works (second interaction).
- after interaction still_visible=false, still_clickable=false
- commit path: {"picked":true,"reached_apply":true,"apply_note":"the commit here is Run reconciliation becoming enabled once every block is filled — reached and read back; Remove then re-pick exercised the path a second time","second_interaction":true,"still_visible":false,"still_clickable":false}

### [matching rules] Matching rules link -> modal dialog — link opening modal
- before: modal visible=false
- on interaction: Click -> modal visible=true, title "Matching rules", first paragraph "Prototype preview of the product popup. Active profile for this connection:". Focus after opening = a.lnk.match-open "Matching rules" — focus is NOT moved into the dialog. Pressing Tab three times lands on button.lnk "Remove"; focus outside the dialog = true (no focus trap). Close button -> visible=false, focus returns to body (focus lost) (not restored to the link that opened it). Re-opened -> visible=true; Escape closes it -> visible=false. While closed the dialog element computes to {"display":"none","visibility":"visible","opacity":"1","ariaHidden":null,"inert":false}.
- after interaction still_visible=true, still_clickable=true
- commit path: {"toggled":true,"reached_apply":true,"apply_note":"opened, read content, reached and used Close; then re-opened and closed via Escape","second_interaction":true,"still_visible":true,"still_clickable":true}

### [header / status] Run reconciliation — primary button
- before: disabled=false, label "Run reconciliation", automatic retrieval selected
- on interaction: Click -> label "Running…", disabled=true. Status region #running visible=true, in viewport=true, text: "Reconciliation started
Synder is gathering and processing your transactions. We’ll update the status when it’s ready.". The form above stays editable (date select enabled=true) although changing it now does nothing. There is no confirmation step, no summary of what is about to be compared, and no way to cancel.
- after interaction still_visible=true, still_clickable=true

### [header / status] Run reconciliation — disabled state — primary button
- on interaction: When any required upload is missing the button is set disabled with no tooltip, no aria-describedby, no inline list of what is missing, and no visible change to the upload blocks themselves. Nothing on screen names the blocker.
- after interaction still_visible=true, still_clickable=true

## Observations

- Drop zone copy (before any file is picked): "CSV or XLSX formats, up to 100MB" · Browse control label "Browse" + "or drag your file here"
- Upload block label: "Upload file *"
- Example-steps note rendered inside the product UI (PayPal, Assisted): "Example steps — confirm the real report path for this integration."
- PayPal with no automatic option: "Upload manually" toggle visible=false, Run disabled=true, nothing on screen explains why the automatic option is gone.
- There is no error state for a wrong file type or an oversized file anywhere in the prototype, and no progress/parsing state after a file is added.
- Tab order from the close button: button.x "✕" -> button#run.btn.btn-primary "Run reconciliation" -> button.tip "?
Compares transactions dated in this ra" -> select#f-per "Last week (Aug 24–30)
Last month (Aug 1–" -> select#f-int "mzkt.by (Stripe)
Great payments for ever" -> button.tip "?
Any QuickBooks account can be reconcil" -> select#f-acc "Stripe mzkt.by (required for Synder)
Str" -> button#mode-toggle.lnk "Use automatic retrieval" -> select "Automated (recommended)
Manual" -> button.acc-h "How to get General ledger export from Qu" -> button.lnk "Remove" -> a.lnk.match-open "Matching rules" -> select "Automated (recommended)
Assisted
Manual" -> button.acc-h "How to get Balance change from the activ"
- Computed focus style on the "Upload manually" toggle: {"outline":"auto 1px rgb(16, 16, 16)","boxShadow":"none"}

## Not exercised (untested, NOT passed)

- Real OS file upload / drag-and-drop — prototype fabricates the file on Browse; no real input[type=file] exists, so file-type, size and parse errors cannot be reached
- Results / matched-unmatched screen after Run — the prototype ends at the "Reconciliation started" status; no results view is built
- Automatic retrieval failure / empty-result states — not implemented in the prototype
