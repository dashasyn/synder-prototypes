# PROJECTS.md - Active Projects & Tools Registry

> Dasha reads this file every session. If a project isn't here, it doesn't exist for me.
> Update after EVERY work session.

## 🔧 Active Projects

### ETC Notifications — bell + side sheet (2026-08-05)
- **Status:** 🚧 v1 prototype built and published, awaiting Ignat feedback
- **Client:** ETC Solutions GmbH — ITCS DatNet, Israel Railways (ARAMIS feed). Audience: **dispatchers**.
- **Prototype:** https://dashasyn.github.io/synder-prototypes/projects/etc-notifications/ — `projects/etc-notifications/index.html`
- **Problem (from Ignat's screenshot of production):** notifications rendered as a 14-column table (Text, From, To, Delta, Module, Title, Type, Station, Destination, Platform, Actual platform, Event, Count, Time). 39 of the 63 event-describing cells were `-` (9 optional columns × 7 rows), horizontal scroll required, no read state, no bell.
- **Diagnosis:** structural, not cosmetic. A table forces every type to declare all 14 fields when each uses 3–4 (measured: 62% of the event-describing cells are empty). The columns also largely duplicated the Text column, which already contains the whole sentence. Title ≈ Type (identical strings on some rows).
- **Three kinds mixed in one list:** operational events (ARAMIS: platform change, delay, schedule deviation) · announcements (OPS: facilities, speed restriction, timetable) · system-health alarms (data mapping failure, feed interruption — arguably a different audience).
- **Ignat's decisions (2026-08-05):** keep the first-column message as the row body · urgency sign (icon/chip/left colour bar) · Unread/All tabs · details available on demand · date+time · newest first · **delete is per-user** · volume varies 5–100/day per user · no "last updated"/refresh — updates arrive automatically · **events do not expire** (so no Active/Past split for now).
- **Built:** bell + badge (99+ cap) · 424px side sheet · Unread/All tabs with counts · per-type rows (severity left bar + SVG icon, 2-line clamped message, type chip, delay chip, right-aligned time) · sticky Today/Yesterday/date separators · master→detail slide inside the same sheet with `‹ Notifications` back · detail renders **only non-empty fields** · per-row ✕ and detail Delete, both with 5s undo toast · Mark all as read · Mark as unread · Esc closes detail then sheet · "Simulate incoming" demo control (badge pulse + highlight animation)
- **Two production bugs found in the screenshot, worth fixing regardless:** (1) the list is sorted by **time-of-day ignoring the date** — 12:20 (5 Aug) → 12:55 (4 Aug) → 13:05 (5 Aug) → 13:30 (2 Aug); sort key looks like a time field, not a datetime. Also ascending = oldest first. (2) Pagination + "Rows per page 25" for 7 items, and the "Rows per page" label is rendered twice.
- **Real app chrome (2nd + 3rd screenshots, 11:41):** Israel Railways ITCS — navy `#14274e` 34px top bar, train-swoosh logo, nav = Maps ▾ / Station view / Events / Journeys ▾ / Systems ▾ / Pax ▾, 32px navy icon rail on the left, exit icon top-right. Background page rebuilt as the real **Events** screen (filters Date from/to · Stations · Type · Event type · Status, blue `+ ADD EVENT`, table with Time period / Unique number / Stations / Type / Event type / Comment / Status, chips Active-green / Draft-grey / Finished-blue).
- **Three further findings from the real chrome:**
  1. **The bell today is a permanently-red pill** (warning triangle + count). Always red = red carries no information; it reads as a standing alarm. Prototype ships both variants with a toggle — A: today's red pill · B: neutral bell, red only on the count badge. Recommend B.
  2. **The current panel is anchored to the left edge** (starts right of the icon rail) and covers nearly the whole viewport for 7 items. A 424px right sheet keeps the Events table visible behind it.
  3. **The product is bilingual HEB/ENG** — Events store "Text output HEB" + "Text output ENG", so notification text will be Hebrew for some users. Added `dir="auto"` on the row and detail text; a hard-coded `dir="ltr"` list would mangle RTL. Seeded a Hebrew notification to prove it renders. **Verified RTL resolves correctly in both list and detail.**
  4. The Events entity has its own lifecycle — **Active / Draft / Finished** — which is very likely where the "New / Passed" tab instinct came from. Kept separate on purpose: event lifecycle ≠ notification read state (a notification about a now-Finished event can still be unread).
- **Open questions for Ignat:** does the system-health class (mapping failure / feed interruption) belong in the dispatcher's bell at all, or a separate ops-monitoring surface? · at 100/day with no expiry, does the All tab need a type/module filter or grouping of repeats? · is any notification actionable (dispatcher must respond) vs read-only? · does the sheet follow the app UI language, or show whichever text (HEB/ENG) the event carries?
- **Presentation build (2026-08-05, for Ignat to show the team):**
  - **Cover slide** on load — problem vs proposal side by side, "Open the demo →" to dismiss.
  - **Before / After toggle** in a presenter bar at the bottom. "Before" is the production panel reconstructed from the screenshot: all 14 columns, the 7 real rows in their original order, left-anchored full-bleed, "Last updated 14:41:19 ⟳", pagination with the duplicated "Rows per page" label. It genuinely needs horizontal scrolling (measured scrollWidth 1515 vs clientWidth 1374 at 1440px) — the point demonstrates itself rather than being asserted.
  - **Show notes** — 9 numbered annotations that switch by context: 1 on the closed bell, 2–6 on the list, 7–9 on the detail, plus a callout on the Before view walking through the sort bug row by row.
  - **Bell A / B toggle** moved into the presenter bar. Live caption bottom-right narrates the current state.
  - Presenter bar reserves 44px; sheet and backdrop stop above it (verified sheet bottom == bar top).
- **Verified:** headless Chromium, 0 JS errors, no horizontal overflow in the list (scrollWidth == clientWidth), 0 `-` placeholders in detail, undo restores, empty state renders, no meta line wraps, notes hidden in Before view, delta styling on the Delta column only, RTL resolves in list + detail.
- **Corrected claim:** first said "~⅔ of cells are `-`". Measured: 39 of 63 event-describing cells (62%), but 40% of all cells. Cover copy and notes now state the precise figure — it was about to go in front of the team.
- **Registered on the hub:** first card in Transit Projects at https://dashasyn.github.io/synder-prototypes/projects/ (bell icon, navy `#14274E`, tags ITCS / Dispatcher / HEB + ENG).

### Balance Reconciliation — Transaction Reconciliation Results page (2026-08-04)
- **Status:** 🚧 In progress — copy/tooltip fixes reviewed and mostly applied, table sorting reviewed, awaiting a few Ignat decisions
- **Jira:** DIS-259
- **Prototype:** https://dashasyn.github.io/synder-prototypes/projects/balance-recon/ — `projects/balance-recon/index.html`, 6 screens
- **Scope:** Balance block on the Reconciliation Results page (6 rows × 4 cols: Beginning balance · +Debits · −Credits · Computed ending · Reported ending · Delta) + the Reconciliation list table (sorting, status column)
- **Status column — CONFIRMED LOCKED (2026-07-16):** replaced old two-column system (Matching/Reconciling) with one unified Status column — In progress (blue) / Error (red) / Attention required (orange) / Reconciled (green). Reconciled does NOT require balance verification to have run — only that all *applicable* checks passed. Full copy + Jira task body drafted and handed to Ignat (read-only Jira access, can't create tickets directly).
- **Balance block tooltip fixes (2026-08-04 session):**
  - Fixed: "taken from your accounting" → "taken from your books" (grammatically broken + violated vocabulary.md canonical term "Books"). Bonus: also resolves the old mode-mismatch issue (DOM-2) — accurate for Automated, Assisted, Manual, and non-QBO platforms alike.
  - Fixed: Calculated-ending tooltip now explains the *why*, not just restating the formula
  - Open: label/tooltip term mismatch — row label "Accounting beginning balance" vs tooltip "Starting balance." Fix tooltip to say "Beginning balance taken from your books."
  - Open: formula tooltip uses en dash (–) instead of proper minus sign (−)
  - Open: Difference/Delta figure has no direction indicator (e.g. "421.22 USD" doesn't say over/under)
  - Open: "USD" repeated on all 6 line-item figures — show once in block header instead
  - Open: demo data shows 3 different date ranges simultaneously (header May 1–31 2025 / filter Feb–Mar 2024 / rows May 10 2024) — needs dev clarification on which drives the calc
  - Open: DOM-1 typo "blanced" → "balanced" in the Balanced-state banner (Figma fix, trivial)
  - Unverified: does "See details" on an Error-status row actually link to the Process log?
- **Reconciliation list table — sorting review (2026-08-04):**
  - Confirmed by Ignat as intentional (my original flags were wrong, retracted): 2-sortable-column limit with black/grey arrows is a consistent cross-page pattern; Date range as default sort is correct (period matters more than record-creation date)
  - Dropped own suggestion to make Status sortable — locked Status filter already covers "find runs needing attention"
  - Open: which end of "Date range" drives sort when ranges overlap — start date recommended, end date as tiebreaker
  - Open: demo data needs varied Date range/Date created values per row to actually test sort behavior
- **CONFIGURE screens — copy not yet locked:** Manual mode checkbox tooltip + Automated mode "New" badge notice rewrites proposed 2026-07-15/16, not yet confirmed or in Figma
- **Next:** Ignat to confirm remaining open items → apply fixes to prototype → verify Error status wiring → lock CONFIGURE screen copy

### Settings & Billing Rework — 3 layouts (2026-07-31)
- **Status:** 🚧 3 prototypes live, awaiting Ignat's pick
- **Hub:** https://dashasyn.github.io/synder-prototypes/projects/settings-rework/
- **Validator report:** https://dashasyn.github.io/synder-prototypes/projects/settings-rework/review.html
- **Prototype A · One page + drawer:** `/projects/settings-rework/proto-a.html`
- **Prototype B · Org/Billing split + plan matrix:** `/projects/settings-rework/proto-b.html`
- **Prototype C · Overview + task panels + pending-changes cart:** `/projects/settings-rework/proto-c.html`
- **Local files:** `projects/settings-rework/` (index, review, proto-a/b/c, synder.css, FUNCTIONS.md)
- **Raw capture:** `.synder-state/settings-rework/` (capture.js/capture2.js/capture3.js, inventory.json, interactions.json, deep.json, 30+ screenshots, verify.js, regress.js, hero/)
- **Scope:** Reworks 3 live pages — Organization settings `/organizations/settings`, Manage subscription `/organizations/settings/manageSubscription`, Update plan `/organizations/billing?action=UPGRADE` (titled "Choose your plan")
- **Constraint from Ignat:** keep ALL functionality, all users see everything, use actual Synder components, start fresh (don't build on the June 10 manage-subscription variants)
- **43 functions inventoried** and tagged with `data-fn` attributes; coverage verified by script, 43/43 in all three
- **Live-page findings (CUR-1..8):** add-ons sold via 3 different UIs; no price before commit; 6 names for one job; 2 save models with no feedback; card + invoices both hand off to the same Stripe portal in a new tab; connection failures buried mid-page; single-item tab bar + nested tabs; feature comparison collapsed while 7 FAQs sit open
- **Open spec questions (blocking real numbers):**
  - **SPEC-1:** no add-on rate card exists in the UI — all prototype prices are PLACEHOLDERS
  - **SPEC-2:** "all users see all functions" contradicts the live invite modal, which says Member has no billing access
  - **SPEC-3:** Pro Standard↔Max is undocumented — inferred it raises included quantities
  - **SPEC-4:** production has no responsive behaviour below 1280px; prototypes add breakpoints
- **Bugs found & fixed during build (FIX-1..6):** quantity ratchet inflating price on plan round-trip; C's balance purchase bypassing its own cart; A's autocharge toggle hidden behind Save; B's table caption `display:none` (hidden from screen readers); C's cards not keyboard reachable; "99 included" seat sentinel leaking to UI
- **Shared design rule adopted:** anything that costs money confirms explicitly; preferences save instantly and say so
- **My recommendation:** B is strongest for the pricing-blindness problem (only layout where "what does this cost at my volume" is answerable without navigating); A is the smallest shippable change; C best if firms batch changes
- **Round 2 (2026-08-03) — Manage subscription v2, taken in the B direction:** `/projects/settings-rework/manage-subscription-v2.html`
  - Ignat said "let's continue with manage subscription"; he didn't pick a layout, so I went with my recommendation (B) and said so
  - **9 switchable states:** active, trial, past due, cancelling, expired, Premium (quoted), no card on file, loading, billing unavailable
  - **2 org scenarios:** the captured demo org (over-provisioned) and a Pro org with 3 people + real volume — needed because no guardrail can fire on the demo org's usage
  - **New behaviour production lacks:** downgrade validation (blocks stripping occupied seats / configured rules / volume below peak, each with a one-click fix); proration that itemises the non-refundable forfeit and offers "Schedule it for renewal instead"; usage-based right-sizing that can recommend paying *less*; real 8-reason cancel flow with per-reason retention
  - **Cancel taxonomy is real** — recovered from the April capture `.synder-state/unsub-flow/S4-survey-main-reason.png` + `S5-sub-reason.png`
  - **New findings:** CUR-9 (mid-term downgrade silently forfeits paid balance), CUR-10 (no downgrade validation at all), CUR-11 (billing page never shows usage, so it can never advise paying less), SPEC-5 (8 of 9 states are my proposal — dunning timings/trial length unverified)
  - **New fixed bugs:** FIX-7 (hardcoded current price made a downgrade read "+$0.00"), FIX-8 (both guardrails unreachable on the demo org → scenario data)
- **Merged with the April round (2026-08-03):** Ignat pointed me at the older hub — **https://dashasyn.github.io/synder-prototypes/manage-subscription/** — and asked for the new set to be added there. Done; that hub is now the single index for all 11 prototypes across both rounds.
  - **The two rounds independently converged on the same three shapes:** April's V1 Unified Settings ≈ new A · V2 Billing Hub ≈ new B · V3 Org Health Dashboard ≈ new C. Nothing from April was consulted while building A/B/C, so they're a second pass at the same three ideas, not three more options.
  - **They disagree on the conclusion:** April's `FEEDBACK-round2.md` scored per persona (Sarah 4/5 → V1, Mike 5/5 → V2, Viktor IA5 → V3) and recommended a **hybrid** — V3 shell + V1's breakdown in a drawer + V2's tone — because "the three audiences genuinely want three different surfaces". My round argues for picking one. **Unresolved; Ignat's call.**
  - April's `FEEDBACK.md` had already found several of my CUR items independently: no total cost, three inconsistent add-on patterns, no proration preview, Cancel as a plain blue link between two safe links.
  - **Lead on SPEC-1:** April's docs cite **$0.04 per extra sync** and a **$500 autocharge cap**. If real, that's part of the rate card I reported as non-existent — source unconfirmed, asked Ignat.
  - **Housekeeping found:** two conflicting V1/V2/V3 naming systems in the older set (`concepts-v1v2v3` uses Ledger / Calm Overview / Unified Grid; the standalone files use Unified Settings / Billing Hub / Org Health Dashboard). Flagged on the hub, not renamed.
- **Round 3 (2026-08-04) — `organization.html`, the proposed structure:** https://dashasyn.github.io/synder-prototypes/projects/settings-rework/organization.html
  - Ignat redirected: he cares about UX, composition and userflow, not data. Then said "do what you think is better, review with validators later."
  - **The structural argument:** the three live pages mix four different *kinds* of thing as if they were one kind. Zones now separate them, in urgency order — 1 Needs attention (renders only when a connection is broken, disappears when fixed) · 2 Plan & billing (everything that costs money) · 3 Setup (integrations, accounting, people) · 4 Preferences (details = one save, notifications = instant).
  - **One flow shape, reused:** plan change is Pick plan → Set amounts → **Review**; cancellation is Reason → Options → Review. The review step is what production has none of.
  - Guardrails now run while amounts change, not only at confirm.
  - **Round-2 bugs fixed here:** cancelling updates the page · coupon actually applies and shows in the breakdown · autocharge states its rate and takes a spend cap, explained in transactions not just dollars.
  - Verified: 5 states, both flows complete, forfeit arithmetic consistent, zero JS errors.
- **Round 3 revisions (2026-08-04, same file):**
  - v2 — Ignat: "you lost all addons... prefer obvious navigation, maybe tabs at the top... also show side bar". Added the real app shell (org switcher, syncs counter, Synder sidebar with Settings active) and top tabs. Restored the add-ons as a **marketplace**: Synder RevRec, Synder Insights, Invoicing, Smart rules (each with a tier picker showing current total → new total), plus assisted setup / dedicated server / custom development as higher-plan cards, and historical transactions / referral promo / special-plan as top-up cards. Swapped all emoji for geometric glyphs (emoji were rendering as tofu without an emoji font).
  - **Key structural decision:** the broken-connection banner sits **above** the tab bar, not inside a tab — that was prototype B's failure (status buried behind a non-default tab), so tabs are fine as long as urgency lives above them.
  - v3 — Ignat: "move addons to the plan page. Also I think that plan can occupy less space". Add-ons tab folded into Plan & billing (4 tabs now). Plan block cut from ~330px to **187px**: three facts + one button, then a single running fact line (transactions left · autocharge rate and cap · historical reserve · invoices) replacing five stacked rows. Active add-ons summarised as "plan + N add-ons below".
  - Fixed: `.fi { display:flex }` made every text node a flex item, so the comma after "on" rendered detached — inline flow restored.
- **Not yet done:** validator pass on `organization.html` — Ignat asked for it "later".
- **Next:** Ignat picks a layout (or the April hybrid) → swap in real rates (SPEC-1) → answer SPEC-2 (Member role) and SPEC-5 (dunning schedule) → validator round 3

### Smart Rules — Branch Engine Redesign (2026-06-03)
- **Status:** 🚧 In progress — 2 prototypes built, awaiting Ignat feedback
- **Jira:** DIS-336 — Introduce Smart Rules for Xero
- **Context:** Adding parallel branches to rule engine. Independent branches don't cascade-delete. First for Xero, then QBO.
- **Prototype A · List View:** https://dashasyn.github.io/synder-prototypes/rules-prototypes/proto-a-list.html
- **Prototype B · Canvas Fork:** https://dashasyn.github.io/synder-prototypes/rules-prototypes/proto-b-canvas.html
- **Local files:** `reports/rules-prototypes/proto-a-list.html`, `reports/rules-prototypes/proto-b-canvas.html`
- **Sample:** US Sales Tax by State rule (CA, NY, TX + default fallback)
- **Key decisions:** Keep IF-THEN chain, add Branch grouping on top; independent delete; drag-to-reorder branches; execution mode toggle (first match vs run all)

### Manual Match Prototype (2026-05-29)
- **Status:** ✅ v1 complete — 2 validator rounds done
- **Live URL:** https://dashasyn.github.io/synder-prototypes/manual-match/
- **Location:** `manual-match/index.html`
- **Jira:** SD-17432 — Create accounting entries from Not Matched view
- **Figma:** node 21970-412440 in Daily_summary file
- **Features built:**
  - Not matched tab (accounting side): per-row ⋯ menu with "Create journal entry" (eligibility-gated)
  - Bulk toolbar: "Create journal entry" button when accounting rows selected
  - Partial eligibility modal (proceed with eligible subset)
  - One-JE-per-session enforcement modal
  - JE sidesheet: clearing lines (Stripe Clearing, locked/grey), editable income lines, debit/credit totals, balance validation
  - Save to QBO: confirmation modal before posting, spinner, success toast
  - Discard changes confirmation on Cancel (dirty-form tracking)
  - Journal entry tab: table with DocNumber, date, memo, amount, View/Delete actions
  - Delete JE: closed-period soft warning, transactions return to Not matched
  - Currency mismatch error: lists specific off-currency rows by Primary ID + side
- **Design:** Synder design tokens (Roboto, #0053CC, #DFE4EC, #F7F8FA)
- **Validator findings resolved:**
  - Round 1: copy/tone (CLR), accounting terminology (DOM), UX consistency
  - Round 2: Amount double-count bug, Save to QBO rename + confirmation, balance message, notice placement, Discard changes dialog, plain-language closed-period warning, Stripe Clearing label

### Validator Pipeline — Prototype Review System (2026-05-29)
- **Status:** ✅ Infrastructure built, ready to use
- **Purpose:** Automated prototype QA using 4 parallel validator subagents
- **Validators:**
  - `personas/validators/ux-validator.md` — usability issues (max 5)
  - `personas/validators/domain-validator.md` — accounting correctness (max 3)
  - `personas/validators/clarity-validator.md` — business owner clarity (max 3)
  - `personas/validators/fidelity-validator.md` — vs. reference accuracy (max 5)
- **Protocol:** `personas/VALIDATOR_PROTOCOL.md` — full orchestrator instructions
- **Task template:** `personas/TASK_BRIEF.md` — fill this for every new task
- **Design rules:** `DESIGN_RULES.md` — Synder component/spacing/color rules
- **How to trigger:** "Build prototype: [name]" + filled Task Brief
- **Loop:** max 3 iterations, Ignat decides on Critical/High findings only

### Pricing Page Prototype (2026-04-15)
- **Status:** ✅ v1 live
- **Location:** `reports/pricing-prototype/index.html`
- **Live URL:** `/pricing-prototype/index.html` (via reports server + CF tunnel)
- **Description:** Synder pricing page prototype matching Figma design. 4 plans (Basic, Essential, Pro, Premium) with monthly/yearly toggle, transaction selectors, feature lists.
- **Figma source:** `FIzUFVfEC8dOCtq0gL0qhV` (Billing-manage_subscr), node 7933-5935
- **Colors:** Primary blue #0053CC, Popular badge #F59E0B, Save badge #10B981
- **Features:**
  - Monthly/yearly billing toggle with 20% OFF badge
  - 4 pricing cards with proper hierarchy
  - Pro card highlighted with "Most Popular" badge
  - Transaction volume selectors for Essential & Pro
  - Feature lists with checkmarks (included) and X (not included)
  - Underlined links for premium features in Pro plan
  - Responsive grid (4 cols → 2 cols → 1 col)

### Reconciliation Preview Prototype (2026-04-10)
- **Status:** ✅ v1 live
- **Location:** `reports/recon-preview-prototype/index.html`
- **Live URL:** `/recon-preview-prototype/index.html` (via reports server + CF tunnel)
- **Description:** Interactive prototype for Transaction Reconciliation results page, focus on Not matched tab. Three modes: Current (accurate Synder recreation), Improved (proposed design), Side-by-side comparison.
- **Data source:** Real data captured from `rec_7487e8c9c991416684cdb375859c1761` (Stripe mzkt.by / DS_test_2, Jan 1–31 2026) — 44 missing-in-accounting + 6 missing-in-integration records
- **Key findings from the data:**
  - The 6 broken rows have null dates/amounts because user mismapped columns during CSV upload (`gross`→SECONDARY_ID, `created`→AMOUNT, `reporting_category`→DATE)
  - The 44 left-side items are a single recurring Stripe subscription pattern: 24× $21.61 charges + 20 payouts (daily + weekend rollups)
  - Fixing the column mapping would likely auto-match all 50 items in one action
- **Proposed improvements demonstrated:**
  1. Auto-detected column mapping error banner with one-click fix CTA
  2. Pattern clustering — 44 items collapse into 5 recurring-pattern groups
  3. Shared single filter bar (vs 2 duplicated)
  4. Bulk selection bar with Match/Mark expected/Ignore actions
  5. Progress snapshot replacing scary warning
  6. Broken rows visually distinct (red tint, null cells, dedicated cluster)
  7. Insight footer connecting left + right panels
  8. Totals in panel headers
- **Files:** `index.html`, `recon-data.json` (embedded data), `shot-improved.png`, `shot-current.png`, `shot-side.png`
- **Raw data dumps:** `.synder-state/recon-preview/api-*.json`

### Synder UX Audit Tools
- **Status:** In progress
- **Location:** `reports/`
- **Live URL:** ⚠️ Temporary Cloudflare tunnel (changes on restart, run `start.sh`)
- **Files:**
  - `reports/index.html` — UX tools dashboard/hub
  - `reports/per-transaction-audit.html` — main audit (copy + errors + approved columns)
  - `reports/copy-generator.html` — interactive copy generator
  - `reports/error-copy-audit.html` — standalone error catalog
  - `reports/server.js` — Node.js HTTP server (port 8080)
  - `reports/start.sh` — startup script
- **Next:** Need permanent URL (named CF tunnel or open port)

### Unsubscribe Flow Audit (2026-03-30)
- **Status:** ✅ v1 delivered (feedback sent in Telegram)
- **Description:** Full audit of Synder's subscription cancellation flow — current flow walkthrough, LogRocket analytics, Figma mockup review
- **Location:** `reports/unsubscribe-audit/index.html`
- **Screenshots:** `.synder-state/unsub-flow/` (current flow), `.synder-state/unsub-flow/figma/` (14 Figma frames)
- **Figma file:** `FIzUFVfEC8dOCtq0gL0qhV` (Billing-manage_subscr), page "Unsubscribe_(EXP)"
- **Key data:**
  - Current flow: 6+ steps, inverted buttons, contradictory copy ("7 days" vs "1 year")
  - LogRocket 90d: 2,077 sessions on manageSubscription, ~9% complete cancellation, "Too expensive" = #1 reason
  - New design: radio buttons, progressive sub-reasons, 7 contextual retention screens per cancellation reason
  - "Schedule a call" blocks on "Didn't understand" / "Missing features" / "Technical issues" screens
- **Feedback delivered:** Copy errors, taxonomy overlaps, missing progress indicator, dead-end confirmation screen, "Schedule a call" gap for high-plan price-sensitive users
- **Open items:** Can build current-vs-new comparison report if requested

### Onboarding Deep Dive (2026-03-29)
- **Status:** ✅ v1 published
- **Description:** Comprehensive onboarding analysis — role-based flows, drop-off analytics, 8 UX findings, bot-friendliness audit, progress stepper prototype
- **Location:** `reports/onboarding-deep-dive/index.html`
- **Live URL:** via Cloudflare tunnel → `/onboarding-deep-dive/index.html`
- **Sections:** Overview, Role Flows (all 6 roles), Drop-off Analytics, Findings & Recs (8), Bot Audit (12 blocking elements, score 3/10), Progress Stepper concept
- **Data sources:** Playwright browser automation (40+ screenshots), LogRocket 30/90-day data, DOM analysis
- **Browser walkthrough data:** `.synder-state/flow-acct/`, `flow-bizowner/`, `flow-staff/`, `flow-other/`, `flow-integrations/`
- **Key findings:**
  - 3 distinct flow paths (Business, Firm, Other=Firm+freetext)
  - 67% of role options lead to identical flow
  - Hidden Revenue field (conditional) blocks Business Owner flow
  - Industry multi-select (react-select #clickableInput) loses value on Escape
  - Radio buttons below viewport require scroll + force click
  - Bot-friendliness: 3/10 — no data-testid, non-standard selects, no URL-based routing
- **Open items:**
  - LogRocket Galileo API returning 500s on follow-up queries — need fresh data
  - Integration step screenshots incomplete (industry field blocks progression intermittently)
  - Progress stepper needs separate standalone prototype HTML

### Transport Scheme Builder
- **Status:** ✅ MVP v2.7 live
- **Description:** Web tool for building public transit spider maps (bus/trolley routes from a focal stop, London TfL style)
- **Location:** `projects/scheme-builder/index.html`
- **Live URL:** via Cloudflare tunnel on port 8080 → `/projects/scheme-builder/index.html` (URL changes on restart)
- **Features (v2.7):**
  - Upload Excel (.xlsx), CSV, JSON, or plain text route files (multiple files at once)
  - One route per file supported (filename = route ID, T prefix = trolleybus)
  - Select focal stop → auto-generates spider map scheme
  - Two-color system: yellow (bus) / teal (trolleybus)
  - Vertical trunk layout with horizontal branch connectors (routed between stops to avoid label overlap)
  - Route convergence: when branches share a stop name, they merge back (split-and-rejoin loops)
  - Metro M icons (left of line), stop names (right of line), word wrap for long names
  - Route badges at top + branch points, terminal badges at end stops
  - "Вы тут" badge at focal stop
  - Toggle routes on/off, adjust spacing/column width/font/line thickness
  - Pan/zoom canvas, export SVG/PNG
  - SheetJS (xlsx) loaded from CDN for Excel parsing
- **Design decisions:**
  - Vertical trunk (top→down), horizontal branches left/right
  - Trunk = path with most routes at each split (greedy)
  - Bus branches default left, trolleybus default right
  - Horizontal connectors at 40% between trunk stops (avoid label overlap)
  - Three-segment connectors: vertical stub → horizontal → vertical stub
  - Merge detection: if branch stop name matches already-placed stop, draw connector back
- **Reference images saved:** Minsk current posters (ugly), London TfL spider maps, Moscow info posters, Berlin BVG, Ignat's own design sketch
- **Inspiration:** London TfL spider maps, Moscow info posters, Berlin BVG route strips
- **Data format:** Excel with columns: route_id, route_type, stop_order, stop_name, is_metro
- **Sample file:** Ignat sent `bus_2.xlsx` (Apple Numbers → Excel export) — 16 stops, Bus route 2
- **Future plans (discussed, not started):**
  - 🗺️ **OSM integration** — Query OpenStreetMap Overpass API for real Minsk stop coordinates to determine geographic branch directions (west=left, east=right) instead of heuristic. Could also auto-populate all Minsk routes.
  - Rounded corners on branch connectors (attempted, deferred — needs cleaner implementation)
  - Pre-loaded Minsk route database (no manual upload needed)

### QB Books Preview Prototype
- **Status:** ✅ v1 published
- **Description:** Two-tab interactive prototype — Synder settings page + QB Online preview. Shows how transactions land in QuickBooks based on current Synder settings. Settings changes highlight affected rows in amber.
- **GitHub:** `dashasyn/synder-prototypes` → `qb-preview/`
- **Live URL:** `https://dashasyn.github.io/synder-prototypes/qb-preview/settings.html`
- **Local files:** `reports/synder-settings.html` + `reports/qb-preview-v2.html`
- **QB views:** All Sales, Journal Entry, Chart of Accounts, Banking, P&L, Balance Sheet, Dashboard
- **Settings wired:** Clearing account, income/fee/bank accounts, generic customer (+name picker), track fees, include taxes, default product
- **Data:** 10 Stripe transactions (Pamela Anderson, Marcus Reid, etc.) Jan–Mar 2026

### Filtering Options Prototype (2026-04-30; v2 functional, v3 multiselect, v4 Apply-gated, v5 six variants — all 2026-08-04)
- **Status:** ✅ v5 live — six variants, all Apply-gated, on Synder's real 8-status taxonomy
- **Location:** `filtering-options/index.html` (mirror: `reports/filtering-options/index.html` — keep both in sync)
- **Live URL:** https://dashasyn.github.io/synder-prototypes/filtering-options/
- **Description:** Four filter UI patterns to reduce vertical space while maintaining usability. Tab navigation between variants; all four filter the same 24-row dataset.
- **Variants:**
  1. **Current** — Full filter bar, 5 fields + Reset/Apply
  2. **Popular + Sheet** — Date/Status/Platform as dropdown fields in the bar + Reset/Apply (same component as everywhere else); "All Filters" opens a sheet with the complete 5-filter set
  3. **Chips (Stripe style)** — Each filter is one dropdown chip carrying its own inline ×, plus a bar-level Apply; "Add filter" only offers filters not already on the bar
  4. **Button + Chips** — Single "Filters" button opens a popover; badge shows the selected count; selected-chips row below grows its own Apply when it diverges from what's applied
  5. **Quick filters** — One-click presets over the real status groups (Attention required, Failed, Ready to sync, Pending, Synced with warnings, Skipped), each with a live count, above the standard staged bar
  6. **Recommended** — My recommendation rather than another layout: status segmented control with counts + 90-day default as a baseline (not a filter) + single source of truth for status. Reasoning notes render under the prototype.
- **v2 (2026-08-04) — made it work.** v1 was purely decorative: every select, chip, button, × and "Clear all" was a no-op, "Apply 3 Filters" was hardcoded text, V4 had no popover at all, and all variants shared 3 static rows. Fixed with a shared filter engine (`FILTERS` defs + per-filter match fns) and per-variant state.
- **v3 (2026-08-04) — multiselect + dedup.** Three follow-up fixes:
  - **Status and Platform are now multiselect** everywhere (checkbox list, OR within the dimension, AND across dimensions). Built a generic field component (`fieldHtml`/`wireFieldNode`/`refreshFieldNode`/`mountField`) shared by all four variants — each field owns one stable DOM node so toggling a checkbox only rebuilds *that* field, keeping its own dropdown open without disturbing siblings.
  - **V2's "popular filters" were single-value quick-pick chips** (Last 30 days / Synced only / Stripe) with no dropdown — not what was asked. Replaced with the same select-style dropdown fields used in the full bar (Date range, Status, Platform), applying instantly.
  - **V3's chips were duplicated** — a separate "applied filters" row (pill + ×) plus the chip trigger itself both showed the same "Label: value". Removed the applied-filters row; each chip now IS the applied-filter display, with its own inline × once active.
  - **Verified with jsdom** (real DOM, not just visual inspection): 29 checks — multiselect OR/AND matching, panel-stays-open across checkbox toggles (staged and instant-apply contexts), zero `.popular-chip` elements left, chips render as exactly one DOM node with zero duplicate label text, tab-switching with a panel open doesn't throw.
- **v4 (2026-08-04) — Apply-gated everywhere.** Ignat: "All filters should have button apply. We have a lot of data, so we can't update tables for each click."
  - **One model for all four variants:** controls write to `draft.<variant>`, Apply copies draft → `state.<variant>`, and the table renders from `state` alone. No filter interaction can trigger a query. Each variant has a `render*Results()` separate from its bar render, plus a `dirty-hint` ("Unapplied changes — click Apply to update the list").
  - **V2:** popular dropdowns now stage; bar gained Reset + Apply. The sheet snapshots the bar's draft (`draft.sheet = clone(draft.popular)`) so closing it discards only sheet edits while keeping what's staged in the bar; sheet Apply commits both.
  - **V3:** chips stage; bar gained an Apply. Chip × stages the removal; "Clear all" commits (single deliberate action).
  - **V4:** the chips row shows the *selected* set (`draft.button`), not the applied one, so × and "Clear all" stage. When selection diverges from applied, the row grows its own Apply — the popover is usually closed at that point. Badge counts selected.
  - **Removed the "N results" previews** (sheet footer, V4's "Apply · 6 results"). In the real product the count isn't known until the query runs, so previewing it costs exactly the request Apply exists to avoid. Apply labels now count filters ("Apply 2 filters").
  - **Fixed a pre-existing bug that made V4 unusable in a browser:** layers were a flat list, so `closeAllLayers()` from a field trigger inside the popover closed the popover itself — you could never open a dropdown in there. Layers now nest (`registerLayer(el, close)`, `closeLayers(node)` keeps ancestors, `closeLayerTree(el)`); panel clicks stopPropagation because `refreshFieldNode` detaches the target mid-dispatch and a detached target reads as "outside click".
  - **Verified two ways:** 60 jsdom checks (staging, commit, Reset, sheet snapshot/dismiss, chip × staging, row Apply, empty state + recovery, mirror identical) and 21 Playwright checks in real Chromium (nested layers, popover survives checkbox toggles, outside-click/Escape, Apply visible in every bar) + screenshots of all four variants.
- **v5 (2026-08-04) — two new variants + real Synder data.** Ignat: "add one more variant 5 [with] real quick filters … Attention required, Failed, Ready to sync" and "variant 6 — create there filters which you think will work best for Synder."
  - **Dataset now uses Synder's real status taxonomy** — 8 statuses in 3 groups (`STATUS_GROUPS`): Errors = Failed / Rule failed / Rollback failed; Completed = Synced / Synced with warnings / Skipped; Queued = Ready to sync / Pending. Taken from the earlier `reports/transactions-prototype` research, not invented. Added a **Type** dimension (Sale/Refund/Payout/Fee) because `All types` is a real production filter. 26 rows; status badges are group-coloured via `statusClass()`.
  - **V5 Quick filters** — six preset pills with live counts. A preset is a whole status selection in one click, so it **commits** (one click = one query, the same cost as a Summaries status tab) and carries any staged bar changes with it, so there's never a half-applied combination. Clicking the active preset clears it. The bar below stages normally.
  - **V6 Recommended** — one design idea per logged finding, with the reasoning rendered under the prototype:
    - *Status as a segmented control with counts* — FLT-1: 986 tab clicks vs ~0 status-dropdown clicks in 30 days. Counts come from one aggregate over the result set the list already fetches, not a per-click preview.
    - *90-day window as a baseline, not a filter* — dashed, ×-less "Last 90 days (default)" chip; **"Reset to default" does not render until the user leaves the default**; count line reads "last 90 days (default), no filters applied". Fixes Reset appearing on an untouched page.
    - *One source of truth for status* — a granular status from a dashboard deep-link shows as `From dashboard: Rule failed ×` and puts the containing segment in a dashed **partial** state; clicking any segment replaces it. The FLT-2 critical bug (dropdown says Failed, tab says Ready to sync) becomes structurally impossible. `Simulate dashboard deep-link` button demos it.
    - Secondary filters (Platform, Type, Amount, Customer) are staged chips behind "Add filter" + Apply.
  - **`fieldHtml` now takes the ctx** (not `style, fullWidth`) so V6 could add a `baseline` style. `applyBtnText()` stops a disabled Apply from naming a count it isn't going to apply.
  - **Verified:** 110 jsdom checks — including **all 33 single-filter values cross-checked against an independent filter over the dataset parsed out of the source**, so counts aren't taken on trust — plus 48 Playwright checks in real Chromium across three suites (nested layers, V5/V6 behaviour, variants 1–4 regression). Scripts: `/tmp/verify-filters.cjs`, `/tmp/browser-check.cjs`, `/tmp/browser-check2.cjs`.
  - **Open questions for Ignat:** presets/segments commit on click rather than staging (flagged — a staged "quick" filter costs two clicks and kills the thing users do 986×/month); segment counts need a status-count aggregate on the list endpoint; the 5 segments collapse 8 statuses but production has ~18, so grouping needs a product decision; production has two reset labels (`Reset filter`, `Reset all filters`) that should become one.
- **Design decisions:**
  - Consistent Synder styling (Roboto, #0053CC, shadows), Material Icons
  - Status badges coloured by status group (Errors red / Completed green-amber-grey / Queued blue)
  - Compact filter bar height (64px) for variants 2-4 vs current (variable)
  - Every variant is Apply-gated — variants 1-4 differ only in *layout*, which is what makes them comparable; 5 and 6 add behaviour on top

---

## 🔀 Side Projects

### PIMS · Grunddaten Editor (2026-07-09)
- **Status:** 🚧 In progress — v1 prototype built, awaiting feedback
- **Client:** ETC Solutions GmbH — PIMS product for BVG (Berlin transport authority)
- **Purpose:** RailML base data editor for BVG Stadler J/JK vehicles. Replaces manual Excel workflow (JJK.xlsx). Daily export at 04:00 to Stadler FIS-SW via RailML 2.5.
- **Local file:** `projects/grunddaten-editor/index.html`
- **Live URL:** https://dashasyn.github.io/synder-prototypes/projects/grunddaten-editor/
- **4 screens:**
  1. **Stations list** — 10 Berlin U2 stations, completeness progress bars (green/amber/red), search, click-through to detail
  2. **Station detail** — 4 cards: Station Name (+ scheduled name changes), Platform Directions (exit side per direction), Announcements (station-name file, transfer files, special announcements checklist, arrival/departure trigger points in metres), Display Texts checklist
  3. **Sound Library** — upload area, filter tabs (All / Station names / Transfer / Special), file table with type badges and preview
  4. **Display Texts** — editable library (add/edit/delete), usage count per text
- **Design:** Classic Material Design (MUI) — blue `#1976D2` app bar, white drawer with blue left-border active indicator, Roboto, MUI elevation shadows
- **Data model:** Stations → directions (2 per station: exit side) + stationNameFile + transferFiles[] + specialAnnouncements[] + triggerArrival/triggerDeparture + displayTexts[]
- **Completeness formula:** 4 required fields (stationNameFile, both exit sides, triggerArrival, triggerDeparture)
- **Sample data:** 10 stations (Alexanderplatz → Nollendorfplatz), 15 sound files, 4 special announcements, 5 display texts

### ETC Station Area Editor (2026-06-15)
- **Status:** ✅ v1 prototype live
- **Client:** ETC Solutions GmbH — ITCS DatNet product
- **Purpose:** Prototype for the NOTIFICATION ZONE feature in station details — lets operators draw a geofence polygon on a map for each direction of travel. When a train enters the zone, it triggers an announcement.
- **Local file:** `projects/station-area-editor/index.html`
- **Live URL:** https://dashasyn.github.io/synder-prototypes/projects/station-area-editor/
- **Features built:**
  - Station details page mock (matches existing ITCS DatNet UI style)
  - Direction selector: "To Haifa" / "To Beer Sheva" — each direction stores its own independent polygon
  - Leaflet map with CartoDB tiles, station point marker
  - Polygon editor: drag vertices, click edge midpoints to add vertices, click vertex to select, Delete key to remove
  - Auto-generate default asymmetric shape (500m approach side, 100m departure side)
  - Undo/Redo (Ctrl+Z / Ctrl+Y), Clear shape
  - Empty state when no polygon defined
- **Demo data:** Tel Aviv Savidor Center, pre-generated polygons for both directions

### ETC Solutions Website Redesign (2026-06-05)
- **Status:** 🚧 In progress — full prototype built, awaiting feedback
- **Client:** ETC Solutions GmbH (Ignat's client, public transport software company)
- **Scope:** Full website structural redesign + copy rewrite — no live changes, exploration only
- **Audience:** Executives and managers of transport companies
- **Local files:** `prototypes/etc-website/` (10 pages + shared CSS)
- **Live URL:** https://dashasyn.github.io/synder-prototypes/projects/etc-website/
- **Pages built:**
  - `index.html` — Homepage (hero, trust logos, 3 product cards, stats, case studies, industries, testimonials, CTA)
  - `about.html` — Company story, values, offices (Berlin + Olten), team
  - `solutions.html` — Solutions overview, integration diagram, why ETC
  - `solutions-itcs.html` — DatNet ITCS platform (features, RAILTAB, testimonial)
  - `solutions-qdaba.html` — Q.Daba quality database (features, BAV proof point)
  - `solutions-passenger.html` — Passenger information systems
  - `industries.html` — 4 segments: Railways, Bus, Authorities, Vehicle Manufacturers
  - `resources.html` — 4 case studies, 3 brochure downloads, 3 events
  - `career.html` — 6 open positions, team culture, benefits
  - `contact.html` — Contact form + two office locations
- **Design decisions:**
  - Language switcher EN/DE in nav (DE shows "translation coming soon" banner)
  - All images = gray placeholder boxes (no real images needed)
  - Product hierarchy: ITCS DatNet / Passenger Info / Q.Daba (not Vehicle Cleaning)
  - "Industries Served" replaces old "Interactive forecast" nav label
  - Copy is outcome-focused in English; no ÖPNV jargon for executive audience
- **Original site:** https://etc-solutions.de/
- **Reference sketch:** Figma file `wqNAuzPQKe975ly3nNjfXK` (Ignat's token needed)
- **Next:** Ignat to review and provide feedback on structure/copy

---

## 📋 Completed / Reference

### Synder Error Copy Audit (2026-03-18)
- Full settings page audit (per-transaction mode, 7 tabs, 9 errors found)
- Screenshots in `.synder-state/error-audit/`
- Report in `reports/per-transaction-audit.html`

### Empty State Builder (2026-03-20)
- **Status:** ✅ Live
- **Location:** `reports/empty-state-generator.html`
- **Live URL:** via Cloudflare tunnel on port 8080 → `/empty-state-generator.html`
- **Features:**
  - 14 pre-loaded Synder pages (2 reference shipped, 12 needing empty states)
  - AI-powered generation via Anthropic API (claude-haiku-4-5)
  - **Generate options** — 3 variants with ★ Recommended + reasoning for Header, Description, CTA, Trust line
  - **Generate FAQ** — auto-creates FAQ with rationale explaining what user problem it solves
  - **Regenerate** — single-field refresh for illustration prompts
  - **Add new page** — modal with name + URL + description, auto-generates all fields
  - Live preview panel (Synder-style empty state)
  - LocalStorage persistence
  - Server: `reports/server.js` endpoint `/api/generate-options` and `/api/regenerate`
- **Design pattern:** Based on shipped Transaction Reconciliation + Balance Reconciliation empty states
- **Empty state structure:** Illustration prompt → Header → Description → CTA → Trust line → FAQ accordions

### Empty States Audit (2026-03-07)
- Report in `reports/` (enriched with error copy on 03-18)

---

## 📌 How to Remind Dasha About a Project

1. **Best:** Say "Check PROJECTS.md, let's continue [project name]"
2. **If it's not listed:** Send a screenshot or describe it — I'll rebuild and register it
3. **If I built something in a session:** Remind me to update PROJECTS.md before we stop
