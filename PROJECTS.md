# PROJECTS.md - Active Projects & Tools Registry

> Dasha reads this file every session. If a project isn't here, it doesn't exist for me.
> Update after EVERY work session.

## 🔧 Active Projects

### ETC PIS Config — Optics & Station Announcements Timing (2026-08-27)
- **Status:** 🚧 v1 prototype live, awaiting Ignat feedback
- **Client:** ETC Solutions GmbH — ISR (Israel Railways), PIS Configuration module
- **Jira:** DATNETISR-233 (Feature 132, Aramis Optic settings) + DATNETISR-668 (Station Announcements Timing). Built as **one prototype** at Ignat's request — "they are connected".
- **Prototype:** https://dashasyn.github.io/synder-prototypes/projects/etc-optic-timing/ — `projects/etc-optic-timing/index.html`
- **The problem:** PA announcement timing is derived from Aramis *estimated* arrival/departure times. At some stations that estimate is too inaccurate (ISR clarification, Yehuda Yatskan, May 2026). Fix: allow timing to be driven by a real trackside **optic** event (Aramis 2806 telegram) instead of a prediction.
- **What 233 owns:** optic master data (Optic ID, station, platform, Aramis track, location/direction, properties) · periodic import from FMSILA.XML · 2806 ingestion via Kafka · continuous train location from type-80 events.
- **What 668 owns:** per-station lead times (arrival/departure) + repeat interval over a system-wide default · the Station Announcements Timing table keyed by Station + Business rule + Platform, each row choosing Estimated time or Optic (2806).
- **Screens built:**
  1. **Aramis optics** — search + station/platform filters, 6 optics, list showing which timing rows use each. Detail drawer separates **imported (locked, `FMSILA` badge, lock icon)** from **maintained-here (open, `Manual` badge)** fields, states the last-import time, and cross-links to the timing rows using that optic.
  2. **Station announcements timing** — System defaults card, then **one table** (rewritten 2026-08-28 at Ignat's request, replacing the original two). Station rows carry the three lead-time values with `Default`/`Override` chips and a Reset action; each expands to reveal its trigger rows (Business rule · Platform · Based on · Optic · Offset · Time source) plus a scoped "+ Add trigger at <station>". Stations with no trigger say so explicitly.
     - **Why one table now:** the two-table split kept the keys clean (station has one set of lead times, several trigger rows) but read as two places to look. Nesting keeps the keys clean *and* puts it in one place — a station's lead times still exist once, the triggers hang underneath. A flat merge was rejected: it would duplicate the lead times onto every trigger row, push the table to 11 columns with structurally empty cells, and make "set this whole station" inexpressible.
- **The shared "Based on" control** lives in the timing row editor, badged `SHARED CONTROL · 233 + 668`. Estimated time reveals only an offset; Optic (2806) reveals optic picker (filtered by station+platform, showing track designation because a platform can have several optics — station 1220 platform 1 has two), 2806 type, time source and fallback. Every row renders a **plain-English preview** of what it will actually do — the config is too abstract to read otherwise.
- **Visible assumptions** (presenter bar toggle), each mapped to a ticket open question:
  - **A1** lead time / repeat overridden per *station only*, not per Station+BR+Platform (668 open q3). If the finer grain wins, those values move into the table as columns and the per-station card disappears.
  - **A2** the "fall back to estimated time" checkbox is invented (open q2 in *both* tickets). If the answer is "always fall back" or "announce nothing", the control disappears.
  - **A3** offset counts from the selected **time source**, not message reception. The tickets say both; they can't both be the anchor. Picked time source, else the Planned/Forecast/Actual selector does nothing.
  - **A4** type 50 is offered but flagged — 233 calls it "informational only", 668 uses it as the trigger in 3 of 4 example rows.
- **Contradiction to settle with the 2806 owner:** the offset anchor (A3) and the type-50 status (A4). A developer will implement whichever sentence they read first.
- **Still missing:** the **station track schematic** 233 says will be attached (two running tracks, central platform loop, optics along the approach, upper westbound / lower eastbound). Travel direction is a plain two-value select until that image arrives.
- **Sample data:** only what the tickets provide — stations 1500 Acre, 1820 Ahihud, 5900 Ashkelon, 1220 (no name given); rules BR12 Arrival, BR99 Departure; optics HA2 14T87, HA2 24T45 (from 668's rows) and HA6 131113/131111/131121/131124 (from 233's FMSILA example). Timing values are illustrative — the tickets specify no numbers.
- **Verified:** headless Chromium, 33 DOM assertions passing, 0 JS errors, no page-level horizontal overflow. Covers filters, empty state, locked-vs-editable field counts, Default/Override chip counts, basis toggle hiding/showing the optic block, picker filtering by station, offset sign → before/after phrasing, add/edit row, reset-to-default, and both cross-link directions.
- **Registered on the hub:** first card in Transit Projects.


### Platform Transactions + Dashboard drill-through (2026-08-20)
- **Status:** ✅ Prototype live — validator round 1 done, all Critical + High FIXED (2026-08-26)
- **Round 1 (2026-08-26):** 7/7 lenses, gate PASS, 27 findings (6 Critical / 14 High / 7 Medium).
  All 6 Critical + 14 High fixed and pushed (`da9d7d4`); verified in real Chromium, 43 assertions.
  Fix table: `reports/transactions-prototype/review/FIXES-round-1.md`. Raw payloads:
  `reports/transactions-prototype/review/round-1/`.
  **Open:** the 7 Medium findings; the 4 AUTO- dead controls (column sort, gear,
  pagination, rows-per-page); round 2 for variant 2 / V7 side sheet + detail page.
  **Changed by the fixes** (supersedes bullets below): the bulk bar no longer replaces
  the table header row — it is a `role="toolbar"` region ABOVE the table; `Skipped` and
  `Excluded from sync` moved out of **Successful** into a new **Not synced** group
  (7 tabs now); the Status chip renders on the bar from load.
- **Location:** `reports/transactions-prototype/index.html`
- **Live URL:** https://dashasyn.github.io/synder-prototypes/reports/transactions-prototype/
- **Pages:** Dashboard (landing) → Platform transactions list → Transaction detail
- **Built from:** live Synder audit (`/transaction/list`, `/sync/show/{id}`) + Figma Dashboard `iGOk6pFtz9R0yTCUMzXe6n` node 10248-126263
- **Done:**
  - 17 UX improvements from the original audit (platform column, colour-coded amounts, date format, identity header, promo block replaced)
  - Bulk bar **replaces the table header row** on selection (Synder Summaries pattern) — Sync now · Rollback · Cancel · Archive · Unarchive · Export
  - Stripe-style filter bar: inline search + 4 chips (Date/Status/Platform/Type) + "More filters" side sheet
  - Per-chip ✕ clear, clear-search, search inside each dropdown, date presets + custom range
  - **Dashboard Sync card → Transactions drill-through** with origin note and escapes
- **Filters = variant 6 ("Recommended for Synder"), ported 2026-08-21** from `filtering-options/index.html`:
  - Status has a **segmented control with counts** *and* an ordinary **19-status chip**; independent, ANDed
  - Filter bar sits **above** the segments (counts are computed from the applied filters)
  - All chips identical, date included; Date + Platform pinned, rest via "Add filter"
  - Per-panel Apply (staging can't outlive an open panel) → no bar-level Apply
  - Amount = operators, date = presets + Custom range, customer = searchable
  - Segment counts respect the search, so a tab that would strand you reads 0 first
- **Dashboard→table mapping** — resolved by adopting production taxonomy (19 statuses / 5 groups):
  - Ready to sync · Successful · **Needs attention (8 statuses incl. rule failed, rollback failed, warnings)** · Deleted · In progress
  - Both of my 20 Aug open questions are now answered by the real taxonomy: `rule failed`/`rollback failed` **do** belong under Needs attention, and `Deleted` **is** a real production group
- **Dashboard Sync block — TWO VARIANTS behind a switcher (2026-08-21, awaiting Ignat's decision):**
  - **Variant 1** — all 19 statuses listed under the 5 group headings; click → **status chip** for that one status + 90 days, tab stays All
  - **Variant 2** — the 5 groups; click → **matching tab** + 90 days, no status chip (the tab *is* the status filter)
  - **The switcher also picks the filter surface:** variant 1 = V6 chip bar (compose inline, per-chip Apply) · variant 2 = **V7** Filters button + right side sheet + read-only applied chips (compose in the sheet, one Apply)
  - Both surfaces share **one** filter state (`state.rec`/`recGroup`/`recSearch`), so the drill-through doesn't fork and switching can't leave two disagreeing copies
  - V7 keeps **Status out of the sheet** — it belongs to the segments; that's why it fits variant 2. Reset touches only sheet-owned fields; Clear all does clear the segment. Search commits on Enter.
  - The real question: which of V6's two independent status controls should a deep-link own?
  - Switcher is a dark bar at the top; switching resets the list so stale filters can't look like a bug
  - Sync counts now computed from the same 90-day window the drill-through uses — the Figma mock numbers (30/300/50/30/30) are gone, and dashboard count == list count
  - Trade-off to weigh: v1's card is 19 rows tall and dominates the dashboard column; v2 stays compact but needs a second click to reach a specific status
- **Table styling = Summaries list (2026-08-21):** one type scale — 14px Roboto / w400 / #1E1E1E for header *and* body. Only links (blue) and status badges (semantic tone) differ, both still 14px; the 20px logo chip keeps a 10px glyph. Tabs sit inside the table card; single-line Date and Amount; Integration shows connection name + platform (`mzkt.by (Stripe)`); Actions column with one primary verb per row; column-settings gear.
  - `Platform` column renamed **`Integration`** — canonical Synder term, matches the reference, and the vocabulary rule already required it. Column order unchanged. The unlabelled row-menu column gained the header `Actions`.
  - Pagination now derived from the row count (was a hardcoded 1/2/3 next to "Showing 1–8 of 8")
- **Removed on 08-21:** the origin/deep-link note (V6 rejects special deep-link chrome) and the More-filters side sheet (that's variant 7)
- **⚠️ Still open for Ignat:** dashboard counts are Figma mock numbers (30/300/50/30/30) and don't match the dataset — real counts need a shared aggregate. V6 also notes segment counts need a status-count aggregate on the list endpoint.
- **Open validator findings (never applied):** `Platform transactions`→`Integration transactions`; `Syncs history` typo; `posting`→`sync` ×2; no inline View error/Retry on failed rows; payout rows blank primary identifier; detail page duplicates 5 fields
- **Known pre-existing issue:** pagination renders pages 1/2/3 regardless of row count
- **Verified:** Playwright browser test — all 5 drill-throughs land on real rows, chip and Status panel agree, no JS errors

### Validator Pipeline v2 — enforcement rework (2026-08-20)
- **What:** the review system's volume controls were prose with nothing verifying them. Audit of the
  only saved round (`.synder-state/settings-rework/validators-r3/`, 2026-08-03) found: Trust never
  ran, 145 findings against a cap of 20, schema drift to a `per_prototype` wrapper, `findings-log.json`
  never created, and a dead `projects/prototypes/` path. No harness existed at all.
- **Built:**
  - `scripts/validator-check.js` — first enforcement code in the system. `manifest` declares the round
    before spawning; `verify` fails it on missing validators, schema drift, over-cap, unevidenced
    findings, empty `checked`, or a missing findings log. Replaying the Aug-3 round fails on all four
    historical counts. Tested both directions.
  - `personas/VALIDATOR_PROTOCOL.md` v2 (v1 archived alongside) — 11 steps: scope contract → recon
    `statemap.json` → deterministic checks → manifest → fan-out → verify → aggregate → report → log.
  - All six validators rewritten with a three-phase method (inventory → interrogate → select),
    required `checked` coverage array, and an evidence requirement (`action` + `observed`).
  - **New:** `personas/validators/a11y-validator.md` (keyboard, focus, semantics; contrast stays in
    the script).
  - `vocabulary.md` now injected into Domain, Clarity, Fidelity — it had never been passed to any agent.
  - Domain/Clarity tiebreak: book-affecting terms keep the precise word, Clarity's fix becomes an
    added explanation, never a relabel.
  - `personas/MISSES.md` — failure corpus with 5 seeded cases and regression prototypes.
  - `personas/WORKFLOW_AS_IS.md` + `HOW_WE_WORK.md` — review-ready descriptions for colleagues.
- **Not done:** no prompt change has been measured against the regression cases yet, so v2's
  improvement is argued, not demonstrated. Docs not pushed to the Pages hub (needs Ignat's go).
- **Origin:** Ignat's complaint that agents were "overloaded with information"; cross-reviewed by
  Claude, whose tiebreak rule and health-check idea were adopted.

### Reports / Financials Overview redesign (2026-08-06)
- **Status:** 🚧 Prototype live, template-description copy set pending
- **Prototype:** https://dashasyn.github.io/synder-prototypes/reports/financials-overview/ — `reports/financials-overview/index.html`
- **Scope:** merge 3 report pages → 1 Overview (3 pre-loaded reports) · 3-dot Edit/Delete per card + drag handle replacing Customize mode · Add report modal with category sidebar and AI/scratch buttons pinned to bottom · full-screen editor · live date picker (charts update immediately, no Apply)
- **2026-08-06 commits:** `ef32dd9` restored live-Synder template descriptions, modal 920→1080px, card min-width 210→258px, 14px card type, "Use this template" → "Use template" · `0e929fd` removed card hover border/shadow + cursor:pointer (card was never clickable), softened "Use template" hover to light blue tint, sidebar buttons 12.5→14px, sidebar 172→205px
- **Template description audit (2026-08-06):** "new page under construction" copy wins — benefit-focused, semantic chart labels (Summary table / Monthly trend / Ranking / Distribution / Comparison) instead of format badges. 5 copy bugs flagged: Stripe listed as a sales channel · "mini P&L" jargon reintroduced · Gateway Fees card is 3 lines and breaks card rhythm · shipping-country copy drops the revenue dimension · Tax summary lost the negative-amounts caveat. Voice template: "Top 5 expense accounts" → "Where the money went — by account"
- **Next:** write the corrected full 16 template descriptions in that voice → decide Jira split (one story vs. page-restructure + content-fix as two tickets); draft text ready, ticket NOT created (Jira is read-only for me). Slack summary drafted, not sent.

### ETC Notifications — bell + side sheet (2026-08-05)
- **Status:** ✅ Delivered — presentation build shipped 2026-08-05; open questions closed 2026-08-19 (resolved in-product). No action pending.
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
- **~~Open questions~~ CLOSED (2026-08-19):** Ignat confirmed all four were resolved inside the product itself — system-health routing, filtering/grouping at 100/day, actionability, and the HEB/ENG language question. **Do not re-raise these.** The prototype stands as delivered; no further decisions pending from him.
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

### Transaction Reconciliation — One-Click First Run (2026-08-20)
- **Status:** ✅ v3 live (2026-08-27), awaiting Ignat feedback
- **URL:** https://dashasyn.github.io/synder-prototypes/projects/recon-oneclick/
- **Location:** `projects/recon-oneclick/index.html`
- **Idea:** Idea 1 of 6 proposed 2026-08-20. Replace the Transaction reconciliation explainer/FAQ landing with a pre-filled "Ready to run" card — last full month + only integration + its linked account + Automated, all preselected. One click to run.
- **Why:** August LogRocket session watch — **~2 of 3 of 90 sessions read the overview/FAQ/video and never clicked Run audit**. Users arrive already interested and get pitched again.
- **Views:** single proposed pane only (2026-08-27 — Current pane and the toggle removed at Ignat's request, so it presents cleanly to the team).
- **v3 layout (2026-08-27):** page header "Transaction reconciliation" (singular, per the 08-24 naming call) + "Compare your integration data against your books to spot discrepancies." Card splits two ways: left = three preselected selects (Integration `Stripe · mzkt.by` → Account `Stripe mzkt.by (clearing)` → Period `Last month (Jul 1 – 31)`), each with a `?` tooltip and a why-this-default hint; right = pale-blue "WHAT THIS WILL CHECK" panel carrying the three advantages from the live promo box. "Read-only — nothing is changed in your books" promoted to sit beside the CTA at normal weight with a shield icon (was tiny grey text). FAQ demoted below the card under "Common questions", 5 rows, "Will it change anything in my books?" moved to first.
- **Note:** v3 re-adds the Integration selector that v2 deliberately dropped. Ignat's call — the reasoning is that showing all the detail-page selectors *already filled* signals readiness rather than work. Supersedes my "account implies integration" simplification.
- **Interactive:** "Run reconciliation" reveals the In progress state with the locked status copy and disables the button ("Reconciliation running…").
- **Design:** Synder tokens (Roboto, #0053CC, grey scale from `skills/synder-explorer/references/synder-design-tokens.css`)
- **Related:** the other 5 ideas from 2026-08-20 (upload validation at drop, "Run again for next period", example result, delta-as-verdict on results, /transaction/list dead-click investigation) are unbuilt.
- **Context:** exploration captures for the whole create flow in `.synder-state/recon-create-2026-08-19/` (25 states, v11.7.66)

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

### Filtering Options Prototype (2026-04-30; v2 functional, v3 multiselect, v4 Apply-gated, v5 six variants — all 2026-08-04; v7 variant 2026-08-07; v8 V6/V7 refinements 2026-08-11; v9 Variant 8 + v10–v12 V6 rework 2026-08-20; v13 real taxonomy + v14 independent tabs 2026-08-21)
- **Status:** ✅ v14 live and verified — eight variants, all Apply-gated, on Synder's **real production taxonomy: 19 statuses in 5 groups**. 447 jsdom + 242 Chromium checks across eleven suites in `scripts/`.
- **Location:** `filtering-options/index.html` (mirror: `reports/filtering-options/index.html` — keep both in sync)
- **Live URL:** https://dashasyn.github.io/synder-prototypes/filtering-options/
- **Description:** Four filter UI patterns to reduce vertical space while maintaining usability. Tab navigation between variants; all four filter the same 24-row dataset.
- **Variants:**
  1. **Current** — Full filter bar, 5 fields + Reset/Apply
  2. **Popular + Sheet** — Date/Status/Platform as dropdown fields in the bar + Reset/Apply (same component as everywhere else); "All Filters" opens a sheet with the complete 5-filter set
  3. **Chips (Stripe style)** — Each filter is one dropdown chip carrying its own inline ×, plus a bar-level Apply; "Add filter" only offers filters not already on the bar
  4. **Button + Chips** — Single "Filters" button opens a popover; badge shows the selected count; selected-chips row below grows its own Apply when it diverges from what's applied
  5. **Quick filters** — One-click presets over the real status groups (Attention required, Failed, Ready to sync, Pending, Synced with warnings, Skipped), each with a live count, above the standard staged bar
  6. **Recommended** — Status tab row with counts **plus an ordinary status filter with all 19 statuses, grouped as the app groups them — the two are INDEPENDENT dimensions that AND together** (v14; Ignat's call). Date + Platform are pinned to the bar; every chip looks alike; `Clear filters` appears only when something is applied; no count line. Reasoning notes render under the prototype.
  7. **Button + Side sheet** — Search + one "Filters" button on their own row **below** the header (v14); the sheet holds all six filters + Apply/Reset; applied filters show as read-only chips (removable, not editable); badge counts selected values; search commits on Enter; no count line
  8. **Groups + scoped statuses** — Three levels: scope filters above the tab row, group tabs with counts, and a status control below that offers *only* the active group's members. Pills for small groups, a scoped multiselect for the All tab's 8. Dashboard deep-links select their own parent tab.
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
- **v7 (2026-08-07) — Variant 7: Button + Side sheet + read-only chips.** One `Filters` button opens a right-hand sheet holding every filter, Apply/Reset pinned at the bottom. Badge counts selected **values**, not dimensions ("Status: Failed, Pending + Platform: Stripe" reads as 3). Applied filters render as read-only chips under the toolbar — removable but **not editable**, since all composing happens in the sheet; removing one commits immediately (one deliberate action = one query, and there's no outside Apply to defer to). Added a committed search term matching customer + platform. Intro copy updated to "seven variants".
  - **Two pre-existing bugs fixed, affecting every sheet variant:** (1) a closed sheet was only parked off-screen via `right`, leaving its controls in the tab order — keyboard users could tab into an invisible panel; added `visibility: hidden` with `transition: ... visibility 0s linear 0.3s` so the slide-out animation is unchanged. (2) `.sheet-filter-group label` was applying the uppercase field-label style to checkbox-row `<label>`s inside multiselect panels; narrowed to `> label`.
  - **Verified since 2026-08-11** by `/tmp/browser-v7.cjs` (29 Chromium checks: sheet open/close, nested layers, inert closed sheet, chips carry no dropdown).
- **v8 (2026-08-11) — V6 and V7 refinements.**
  - **V7 chip collapse.** 3+ selected values render as `Status: Failed + 3 more`; 1–2 still spell out. Badge and table keep counting all of them — only the chip's width is bounded.
  - **V6 Apply moved into each dropdown**, which forced staging to become **panel-scoped**: opening a panel snapshots what's applied, its Apply commits, closing without Apply discards. Cross-field staged state can no longer exist, so the bar-level Apply, the unapplied-changes hint and `Reset to default` are all gone.
  - **V6 filters now sit ABOVE the segments.** Segment counts are `countForStatuses(state.rec, …)` — i.e. computed from the applied filters — so filters set the scope and segments slice it. With them below, a control changed a number above it and the effect read before its cause. Also puts the tab row directly against the table it labels. The alternative (segments first) only works if counts ignore the filters, which would make `Failed 3` return one row. DOM order is now asserted in the jsdom suite so it can't silently revert.
  - **Two bugs of mine, both caught and fixed:** discarding a panel restored the value but left the chip trigger showing the discarded one (chip said "Platform: Stripe" while the list said no filters applied); and the keep-open re-render path called `closeLayerTree`, firing the new discard handler mid-selection so V6 multiselects closed on the second toggle — **Ignat reported this one**, added `dropLayerSilently()`.
  - **Test lesson:** the Playwright check asserted `isChecked()`, which passes fine against a *closed* panel. New suite `/tmp/panel-visibility.cjs` asserts panels stay **visibly** open across three consecutive toggles in all five multiselect variants. When the question is "can the user keep interacting", assert `isVisible()`, never element state.
  - **V7 status segments (same session).** Adding the segmented control to variant 7 forced **status out of the sheet** — two controls on one dimension is the FLT-2 Summaries bug. So V7's premise changed: the sheet holds every filter *except* status, and the intro copy was updated to match. No status chip (the segment shows it), badge counts sheet filters only, the sheet's Reset leaves the segment alone, but "Clear all" does reset it because that's what the label says and the segment visibly snaps back. Segment counts respect the committed search. V6 and V7 now share `renderSegmentsInto()`; `.rec-segment*` renamed to `.status-segment*`.
  - **Suites:** `/tmp/verify-filters.cjs` (140 jsdom), `/tmp/browser-v6v7.cjs` (24), `/tmp/browser-v7.cjs` (30), `/tmp/browser-check.cjs` (21), `/tmp/panel-visibility.cjs` (10). All green; mirror byte-identical.
- **v9 (2026-08-20) — Variant 8: Group tabs + scoped statuses.** Ignat sent five Shopify Orders screenshots and asked for the pattern to be analysed, not copied: the leading selector owns one dimension and that dimension then **disappears** from "Add filter" (pick *Unfulfilled* → Fulfillment status is gone from the list; pick *Unpaid* → Payment status is gone). One source of truth by **removal**, no syncing.
  - **Why it can't be copied verbatim:** every Shopify leading value is a **leaf** (*Unfulfilled* IS a fulfillment status). Synder's quick filters are **groups** — *Attention required* is four statuses. Copy the removal rule and picking it destroys per-status filtering, i.e. the 986-clicks-a-month behaviour. So V8 **scopes instead of removing**.
  - **Three levels, split by scope not by control type:** Date/Platform/Type/Amount/Customer **above** the tab row (they set the universe the tab counts are computed over) · **group tabs** with counts (they slice it) · **status below**, offering only the active group's members. Status is the only tab-scoped filter, hence the only one underneath.
  - **Resolves the two dead ends Ignat identified.** "Filters get wiped on tab switch" — only the status sub-selection resets, and it *can't* carry over (no *Rule failed* inside *Synced*); everything that cost effort lives above the tabs. And each tab **remembers its own status selection**, so even that returns. "Keep them independent" — that permits *Attention required + Synced*, a provably-empty query where the tab says 7 and the list says 0. FLT-2 in a new coat.
  - **Tab counts stay whole-group when narrowed** (a tab count answers "how many are in here", not "how many am I seeing"); the list header carries the fraction — *"Showing 1 of 7 in Attention required"*.
  - **Pills vs dropdown, both on screen deliberately.** ≤4 members → a row of pills, single-select, commit on click (same cost as a status tab today). The All tab's 8 statuses → a **scoped multiselect** with Apply inside its own panel. This is the one thing that depends on the open ~18-status question: small groups keep pills, a big group has to become the dropdown. `V8_PILL_MAX = 4` is the only knob.
  - **Dashboard deep-links** (Ignat's requirement): a status clicked on the dashboard **selects its own parent tab**, then narrows to itself. Still exactly one status value on the page, so the arriving status can't fight the tab row. A single-status group (*Skipped*) renders no second level. Marked *From dashboard* on a breadcrumb chip.
  - **Breadcrumb only renders where it adds something** — the scoped dropdown (a trigger reading "2 selected" names nothing) or a deep-link (needs attributing). Beside a lit pill it would repeat it, which is exactly the duplicate-chips mistake removed in v3. Caught by screenshotting, not by tests.
  - **Fixed a pre-existing shared-component bug:** `.dropdown-panel-footer` scrolled out of its own panel at 8+ options, taking **Apply** with it — a commit control the user had to scroll to find. Now `position: sticky; bottom: -4px`. Affects every Apply-in-panel field, V6's Customer included.
  - **Suites (now in `scripts/`, not `/tmp/`):** `scripts/verify-v8.cjs` (107 jsdom — every group and member count cross-checked against an independent filter over the dataset parsed out of the source), `scripts/browser-v8.cjs` (71 Chromium — asserts `isVisible()`/clickability, never element state), `scripts/v8-footer.cjs` (2 — Apply inside the panel's visible scrollport), `scripts/v8-shots.cjs` (screenshots). `verify-filters.cjs` updated 7→8 tabs/sections. All eight suites green, mirror byte-identical, live matches local byte-for-byte.
  - **Still open for Ignat:** pills are **single-select**, so "two of the four attention statuses" is only reachable via the All tab's dropdown — making pills multi-select costs an Apply and the one-click speed that is the whole point. The **Is / Is not** operator from Shopify shot 3 (*"Status is not Synced"* currently costs 7 checkbox clicks) is analysed but **not built**. Group counts still need a status-count aggregate on the list endpoint. And `browser-check2.cjs` carries **two stale assertions** (`[data-rec-reset]`, `#recDirtyHint` — both removed from V6 in v8); they fail identically on HEAD, so not a regression, but the suite needs updating.
- **v10 → v11 (2026-08-20) — the three changes landed on Variant 6, not 7.** Ignat: *"make date selection to look the same as other filters · add status filter with all statuses · remove Showing 2 of 26 transactions · 3 filters applied"*. I built it on **V7** first; he then said *"Sorry, I was wrong — all these fixes were for variant 6"*. **V7 is reverted and is byte-identical to `63dc749` in both markup and script** (verified by slicing both blocks and comparing); the `radioOptions` flag went with it.
  - **V6 date is an ordinary filter chip.** Still starts on Synder's real default (last 90 days), but loses the dashed `(default)` treatment — a bar where one control is shaped differently makes the reader stop and work out why. The *Reset-on-a-clean-page* problem the baseline chip was answering is real and unsolved; it moves to the reset-copy item, which is where it belongs. **This drops one of V6's three original ideas** — deliberate, and noted in the variant's own reasoning notes.
  - **V6 status is a filter chip with all 8 statuses, on the bar from load, wired to the SAME value as the segments.** This is *not* FLT-2: that bug was two **values** with nothing keeping them equal. Here there is one value with two views. Pick *Rule failed* in the chip → the containing segment goes dashed **partial**. Click a segment → the chip fills in with that segment's statuses. Pick a set matching no group → every segment goes quiet. Deep-links set the same value and get a **`From dashboard` tag** rather than a second chip repeating it (the old `deeplink-chip` is gone); the tag drops as soon as the user edits status by hand.
  - **Count line removed.** Chips name every applied filter and the segment counts already say how many rows each group holds. V8 keeps its version because it says the one thing chips can't — *"Showing 1 of 7 in Attention required"*.
  - **THREE PRE-EXISTING BUGS found while testing, all confirmed on HEAD:**
    1. **Single-select filters could not be changed at all in the panel-staged variants (6 and 8).** Picking a value called `closeLayerTree`, which fired the discard handler, which reset the draft from committed state — so Date/Amount/Customer silently reverted and a later Apply committed nothing. Picks now stage and keep the panel open, like the multiselect path. **I had this logged as merely ergonomic** ("V6 single-selects cost two clicks") — it was total breakage. Worse: `verify-filters.cjs` had a green assertion over it, which passed only because the test clicked an option while the panel was *closed*, so no discard fired.
    2. **A chip × staged its removal with no bar-level Apply to commit from**, so in V6/V8 the chip left the bar while the list kept filtering by it, and the next panel open put the value back. A control that lies. Now commits in panel-staged contexts; variants with a bar Apply (3, 4) still stage, as they should.
    3. **Active and inactive chips differed by 1px** (the caret's line box), so a bar of chips rendered at two heights. `.chip-trigger` now has a fixed height.
  - **Suites:** `verify-v6.cjs` (70, new) and `browser-v6.cjs` (39, new) join the set; the V6 and V7 blocks in `verify-filters.cjs`, `browser-v7.cjs` and `browser-v6v7.cjs` were rewritten twice today — once for the V7 rework, once back — against whatever design each variant actually has. All nine suites green, mirror byte-identical, live verified byte-for-byte.
- **v12 (2026-08-20) — richer filter controls, shared across every variant.** Ignat: default view should show Date range + Platform · amount needs *exact number* and *is between* · date range needs custom exact dates · customer needs a search · and the deep-link chip should look like a standard filter chip, no "From dashboard".
  - **V6 default bar = Date range + Platform.** Status moved into "Add filter" (`REC_DEFAULT_CHIPS = ['platform']`) — the segments already show status, so nothing is actually hidden.
  - **Amount is operators, not bands.** `Is exactly` / `Greater than` / `Less than` / `Is between`, each with typed numbers. The `Under $100` / `$100–$500` / `Over $500` presets were **removed, not kept alongside** — *Is between* subsumes all three, and keeping both would give two ways to express one query, which is the duplication we keep deleting. Value encodes as `'<op>:<a>:<b>'`, a plain string so `clone`/`sameFilters` need no special case. Apply disabled until a number is typed.
  - **Date range gains `Custom range…`** with two date fields, encoded `'custom:<from>:<to>'`. Apply waits for at least one end (an empty range would filter to nothing and read as a broken list). A **half-filled range filters on the end that IS filled** — *"From Mar 1"* — rather than quietly matching everything.
  - **Customer has a search box.** `All customers` is never filtered out, because it's how you clear the field. Rows are hidden **in place** rather than re-rendered, so the caret doesn't jump mid-word. Term clears on each panel open, so it can't leak between variants.
  - **Deep-link is a plain status chip** — the `From dashboard` tag and `recDeepLink` state are both gone. Marking it special invites "special how?", and the answer is "it isn't".
  - **Consequences that had to be handled:**
    - Typed inputs write to the draft **without re-rendering** their field (re-rendering moves focus out of the box mid-word), so the trigger label is updated on its own via new `syncTriggerText()`. Without it the chip read *"Custom range"* while the draft already held a range.
    - A filter that owns its own `summary()` owns the **null** case too, or an incomplete operator prints its raw encoding (`Amount: between::`). Date's summary therefore had to cover presets as well — the first cut returned null for them and the chip lost its label.
    - Panels holding typed inputs need `min-width: 260px; max-height: 400px`. At the old 280px the FROM/TO inputs were **clipped behind the sticky footer** — `isVisible()` said fine, a user could not reach them. The browser suite now asserts the inputs sit above the footer's top edge.
    - An operator panel **stays open** when you pick an operator, since you still have to type the number. V4's suite asserted the opposite and was updated.
  - **All four control changes live in the shared `FILTERS` set**, so variants 1–8 all get them. Deliberate: one prototype comparing layouts, not eight filter engines.
  - **Suites:** `verify-new.cjs` (62, new) and `browser-inputs.cjs` (42, new). The oracle in `verify-filters.cjs` was extended to the new amount operators and custom date ranges, and its single-filter cross-check matrix now drives amount through operator+input rather than preset picks. Eleven suites, all green; live verified byte-for-byte.
- **v13 (2026-08-21) — production taxonomy + V6 control pass.** Ignat sent a screenshot of production's **grouped status dropdown**, which settles the "8 vs ~18 statuses" question open since 2026-08-04.
  - **19 statuses in 5 groups** — `Ready to sync` · `Successful` (Synced, Skipped, Excluded from sync) · `Needs attention` (Failed, Rollback failed, Synced with rule failed, Canceled, Rollback canceled, Not parsed, Synced with warnings, Deleted with warnings) · `Deleted` · `In progress` (In progress, Scheduled, Rollback in progress, Rollback scheduled, Pending, Delayed). Notable corrections to the old stand-in: "Rule failed" is really **Synced with rule failed**, and **Synced with warnings lives under Needs attention**, not Successful.
  - **SEGMENTS are now built from the group map**, so the tab row can't drift from the dropdown. Tab order keeps *Needs attention* first (right after All) rather than mirroring the dropdown's order, which lists it third — a dropdown can bury the thing users click 986×/month, a tab row shouldn't. One-line change if Ignat disagrees.
  - **Dataset grew 26 → 45 rows** so every one of the 19 statuses actually appears. A taxonomy demo where 11 statuses read zero demonstrates nothing.
  - **Badges are coloured by GROUP**, not per status — 19 colours would be 19 things to keep in sync. Two overrides: *…with warnings* → amber (a warning is not a failure), *Skipped / Excluded from sync* → grey (a deliberate non-sync is not a success). `.status-<slug>` classes replaced by six `.tone-*` classes.
  - **Status panel renders group headers** in the app's own order (`FILTERS.status.groupBy()`), and grouped panels get `max-height: 380px`. A flat 19-item list is a wall.
  - **Chip-style fields drop their "All …" row** — *All time*, *All customers*, *Any amount*. Ignat's reasoning, and it's the dedup argument again: the chip's × already clears the field, so the row is a second way to do the same thing, and it makes "all" read as a value you pick rather than the state you return to. **Select-style fields keep the row** (V1's bar, the sheets) because they have no ×; that asymmetry is the whole justification.
  - **V6: Date and Platform are pinned** (`REC_PINNED`) — always on the bar, never removable. Their × clears the value and leaves the chip in place.
  - **V6: `Clear filters` on the bar**, rendered only when something is applied. It clears to **nothing applied**, not back to the 90-day load state — "clear" that leaves a filter behind isn't clear. On load the 90-day window *is* applied and the chip says so, so the button appearing immediately is honest; the old *Reset-on-a-clean-page* objection was that Reset appeared while the page claimed nothing was applied, and that contradiction is gone. The empty-state button now does the same thing.
  - **Fell out for free:** V8's pills-vs-dropdown threshold is finally doing real work. *Successful* (3 members) renders pills, *Needs attention* (8) and *In progress* (6) render the scoped dropdown, *Ready to sync* and *Deleted* (1 each) render no second level at all. `V8_PILL_MAX = 4` is the only knob, exactly as designed on 2026-08-20.
  - **Test lesson:** every suite hardcoded the 8-status taxonomy and all eleven broke at once. They now **parse `STATUS_GROUPS` out of the source** and derive group membership from it, the same way the row oracle is already parsed from the dataset. Constants copied into a test are a second source of truth waiting to drift.
  - **Answered by Ignat this round:** #3 V8 pills stay single-select (ignore) · #4 Is/Is not stays unbuilt (keep as is) · #7 the date chip needn't say "system selected" — showing the filter as applied is what matters.
- **v14 (2026-08-21) — V6 tabs go independent; V7 header restructured.**
  - **V6: the tab row and the status filter are now two separate dimensions that AND together.** Switching tabs leaves the filter untouched, and vice versa. This is the option I argued against on 2026-08-20 (his "option B"), chosen deliberately — so **V6 became that design and V8 stayed the scoped one**, which makes them a matched pair on exactly one trade-off: here *Needs attention + Synced* is buildable and returns nothing; in V8 the status control only offers the active group's members so the contradiction can't be expressed.
  - **The mitigation that makes independence survivable:** tab counts are computed **with the status filter applied**, so selecting *Synced* makes *Needs attention* read **0 before you click it** rather than after. That's the difference between a trade-off and a trap — and it's what separates this from the original FLT-2 bug, where the two controls disagreed **silently** while the dropdown asserted something untrue. An empty list you can predict is not a label that lies.
  - **Knock-ons:** the dashed **partial** segment state is gone (two values, so a tab is either active or it isn't) · the tab counts as an applied filter, so `Clear filters` clears it and appears when only the tab is set · the **deep-link fills the status filter and resets the tab to All**, because landing on a tab that excludes the arriving status would show an empty list for a link the user just clicked.
  - **V7: search + Filters moved out of the header's action group onto their own row beneath it**, per Ignat's screenshot — the header says what the page is, the row below says how to narrow it. Placeholder is now `Search by customer`, field takes the available width. Count line removed. `Download report` stayed in the header since removing it wasn't asked for.
  - **Suites:** V6's whole shared-value section rewritten as an independence section, plus a tab-aware oracle (`recOracle`) for the sections after it. Eleven suites green; live verified byte-for-byte.
- **Design decisions:**
  - Consistent Synder styling (Roboto, #0053CC, shadows), Material Icons
  - Status badges coloured by status group (Errors red / Completed green-amber-grey / Queued blue)
  - Compact filter bar height (64px) for variants 2-4 vs current (variable)
  - Every variant is Apply-gated — variants 1-4 differ only in *layout*, which is what makes them comparable; 5 and 6 add behaviour on top

---

### Status Filter Usage Research — Platform transactions (2026-08-26)

- **Report:** `reports/status-filter-usage/index.html` — https://dashasyn.github.io/synder-prototypes/reports/status-filter-usage/
- **Question from Ignat:** should Platform transactions group statuses into tabs? Specifically — do users select all statuses from one group, do they select-all-then-deselect, do they use Select/Deselect All, what are the common patterns. Team sessions (synder.com email/user ID) excluded.
- **Source:** LogRocket Galileo AI metrics, 90 days, `go.synder.com/transaction/list` + live DOM inspection of `demo.synderapp.com`.
- **Answer: no, users do not select whole groups.** Successful all-3 = 107 sessions · Needs attention all-8 = 13 · In progress all-6 = 106, vs **1,391 sessions clicking exactly one Successful status** (1,236 Synced alone) — ~13:1. **But partial within-group selection is the real pattern: Failed AND Canceled = 688 sessions**, 58% of the ~1,190 Failed sessions, and 50× more common than exhausting that group.
- **Decisive caveat:** production group headers are `li.dropdown-header` with **no `<a>`, no handler — inert**. No one-action group selection exists today; a group costs 8 clicks + Apply while **Select All** costs one. The data measures cost as much as intent.
- **Bulk controls (selector-scoped, clean):** `.bs-select-all` 2,430 clicks / **1,554 sessions** · `.bs-deselect-all` 1,091 / 696.
- **Also:** `Apply filter` 25,591 · `Reset all filters` 4,699 vs `Reset filter` 3,499 (duplicate-reset item now has data) · failure triage ≈3,880 clicks across Failed/Rollback failed/Synced with warnings/Not parsed · `Synced with rule failed` has **zero clicks before 2026-08-19** · two capitalisations in the data (`Ready to sync` / `Ready to Sync`).
- **Unresolved confound:** row badges (`span.label.label-default`) carry the same status words, so text-matched label totals pool badge + filter clicks and are **upper bounds**. Only *Ready to sync* split cleanly — 5,188 filter vs 3,740 badge. Redoing it properly needs contains-matching per badge.
- **Reading for the tabs decision:** group tabs alone don't fit (a *Needs attention* tab returns 8 when the user wanted 2); **tabs + scoped status control inside the tab** does — the V8 shape already built in filtering-options. Keep single-status fast.
- **Tooling:** `scripts/galileo.sh` (new) — `ask` / `get` wrapper that always saves the full response, because the chatID appears only in the `ask` response and there is no chat-list endpoint.

---

## 🔀 Side Projects

### ETC Q-Explorer / Q.Daba — QMS RPV CH prototype (2026-05-26 → 2026-08-27)
- **Status:** 🔧 Active · reviewed, nothing from the review applied yet
- **Location:** `projects/q-explorer-prototype/index.html` (single file, ~7 000 lines)
- **Live:** https://dashasyn.github.io/synder-prototypes/projects/q-explorer-prototype/
- **Topic:** Telegram group, topic 4309 "ETC_Q.Daba" — client is ETC Solutions GmbH / BAV
- **What it is:** Swiss public-transport quality-management tool. 13 views: login, evaluations list,
  6 report-type cards, 3-step wizard (period → filters → run/schedule), Geplante Berichte, and the
  report views — Anschlusspünktlichkeit, Fahrtausfälle + Ausfallmaske + treemap, Pünktlichkeit +
  chart popup + Pünktlichkeitsdaten (4 950 rows). German-first with an EN/DE switch.
- **2026-08-25:** custom period can no longer be saved as a scheduled report (toggle disabled with a
  reason, clears itself, edit path blocked); Impressum / Dokumente / Support / Kontaktdaten added as a
  bottom utility bar on the sign-in screen matching the ISR/N8 pattern, plus a sidebar footer copy.
- **2026-08-27 · Full review, 2 rounds, both PASS:** `projects/q-explorer-prototype/review-2026-08-27/`
  → report `index.html`, 2 state maps, 12 validator payloads, 9 AUTO findings, 22 screenshots.
  Live: https://dashasyn.github.io/synder-prototypes/projects/q-explorer-prototype/review-2026-08-27/
  - Round 1 = create & manage (26 findings). Round 2 = read a report (26 findings). 6 lenses each
    (UX ×3, Clarity, Trust, A11Y). Fidelity skipped — no spec exists. **52 findings total.**
  - **Verdict:** structure is easy to understand; what it shows cannot be trusted, and the controls
    that would let you interrogate it are decorative (~50 inputs/selects/buttons with no handler).
  - **6 Criticals:** centre-mounted clear-✕ wipes filter values on all six filters · edit-schedule
    shows a blank config under a saved schedule's name · 9 of 19 finished evaluations can't be opened
    · "Aufschlüsseln" (the main analysis control) is inert on all three reports · no keyboard route
    into the tool at all (type cards, all six filter triggers, sidebar nav are unfocusable divs) ·
    the chart popup is not a modal (focus stays behind it, Escape does nothing, 41 Tabs to reach it).
  - **The report lies about its own contents** — the round-2 Trust/Clarity findings, and the reason
    the verdict is "untrustworthy" not just "unfinished": Total row sums a population 13.8× larger
    than the 19 rows beneath it with no truncation marker · two evaluations with different periods
    and scopes render a byte-identical table · one row's list period and report period differ by a
    month (hardcoded fallback at index.html:7239) · every report title contradicts its own date chip.
  - Also: 27 raw-data column filters, 6 buttons and the Ausfallmaske Apply/Reset are unwired;
    37 i18n keys missing from both dictionaries + 5 breakdown options with no key at all.
  - The 29 June review (UX-1…UX-9) is still entirely unapplied and is folded into this report.
  - **Suggested first fixes:** the filter ✕ (one CSS line) · the two-click bundle expander (one class)
    · truncation row + single-source period · the 6 unwired buttons · a "Demodaten" badge.
  - Protocol fix: `validator-check.js manifest --flow <label>` added so parallel-flow rounds aren't
    forced to be deltas of the previous round. Logged in `personas/MISSES.md`.
- **Next:** Ignat to pick the fix order. Suggested: clear-✕ (one CSS line) → bundle-row first-click →
  six unwired buttons → decide whether Rohdaten/Linienanalyse/DQI get report views → breakdown +
  column filters (the real work).

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
- **Sample data:** 10 stations (Alexanderplatz → Nollendorfplatz), 15 sound files, 4 special announcements, 28 display texts
- **Everrunning music (2026-08-27):** new feature area for playing music/radio on stations.
  - *Audio library* now has a tab bar — **Tracks · Playlists · Radio**. 10 music tracks added (type `music`, with duration); type filter and upload modal extended.
  - *Playlists* — list + detail editor: name, playback mode (in order / shuffle), ordered track table with drag reorder + position input, add/remove tracks, "used by N events".
  - *Radio* — reusable streams (name, genre, URL) with add/edit modal and URL validation.
  - New top-nav **Everrunning** dropdown (Text · Music) — Music opens the event page. `EVR_VIEWS` drives its active state.
  - *Event editor* — 4 cards: Basics (name, active) · Audio source (segmented Radio/Playlist/Single track + source select + preview) · Timing (Scheduled = date range + time window · On trigger = train number + metres before arrival + arming date range and window) · Stations (line-grouped picker with per-line select-all, search) + Selected stations table with **per-station time window overrides** (Custom chip, reset).
  - Edits go through a **draft clone** — Cancel discards, Save validates name/source/at-least-one-station.
  - Seed data = Ignat's three use cases: daily classical radio 09:00–12:00, Christmas-train trigger (W-2412, 400 m before arrival), Madonna 3-day 15:00–18:00.
  - `<html lang>` now follows the DE/EN switcher so native date/time inputs render in the right locale.
  - Deferred by Ignat: priority handling between events, interruption behaviour (not a UI concern), timeline/calendar view, volume, weekday patterns.
- **Open questions for BVG/ETC managers (2026-08-27)** — sent to Ignat, unanswered:
  - Trigger identity (train number vs Umlauf vs vehicle no.), fire-per-run vs once-per-day, trigger point (reuse station trigger metres?), behaviour on delay/reroute, non-train triggers
  - Conflicts: overlapping music events on one station, music vs everrunning text, trigger interrupting a running schedule
  - Playback rules that shape UI: resume vs restart after an announcement, playlist loop vs stop, radio dropout fallback, volume scope (system / event / station / night)
  - Operations: who may create events + approval step, whole station forever or speaker zones later, weekday/holiday patterns, global kill switch during disruptions
  - Legal: GEMA licensing owner + whether the tool must store licence reference/expiry per track, and play-out logging for proof
  - Scale: how many events/stations expected (decides bulk edit / templates)
- **Display Texts page (2026-08-25):** position input moved to first column (after drag handle + checkbox), multiselect (per-row + select-all-on-page + shift-click range, selection survives paging), bulk bar with "Move to position N" + bulk delete + clear, block drag (dragging one selected row moves the whole selection), pagination (10/25/50 per page)

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

## Synder UI Kit — Single Source of Truth (2026-08-26)

- **Canonical file:** `ui-kit/synder-ui-kit.css` (46 KB)
- **Live URL:** https://dashasyn.github.io/synder-prototypes/ui-kit/synder-ui-kit.css
- **Component gallery:** `ui-kit/index.html` → https://dashasyn.github.io/synder-prototypes/ui-kit/
- **Why:** five divergent stylesheets existed for one design system. Prototypes were
  picking whichever one was nearest, so button sizes, radii and status colours differed
  between prototypes.

**Precedence rule baked into the file:** production (live computed styles, 2026-06-17)
beats Figma (REST API extraction, 2026-04-02) beats hand-authored. Prototypes are judged
against the shipped app, so production wins and every delta is annotated inline.

**14 value conflicts resolved** — see the file header for the full table. Highlights:
`--warning` #FF9400→#CB7515 (off-palette), `--r-md` 8px→6px, `--r-pill` 14px→12px,
sidebar 224/220px→230px, topbar 48/56px→59px, button 36px→32px and 8px 16px→6px 19px.

**Backwards compatible:** every legacy token name from all five files is aliased inside
`:root`, and legacy class names (`.synder-*`, `.nav-item`, `.tabs-bar`, `.btn-outline`)
are kept. The five superseded files now contain only an `@import` of the canonical file,
so the 11 existing prototypes that link them keep working untouched. Old contents are in
git history.

**Superseded (now @import shims):**
- `prototypes/synder-ui-kit.css`
- `reports/synder-design-system.css`
- `unsubscribe-flow/synder-design-system.css`
- `skills/synder-explorer/references/synder-design-tokens.css`
- `skills/synder-explorer/references/synder-prototype.css`

**NOT superseded — second production stack:** root `synder-design-system.css` uses the
`.sds-*` namespace and documents the legacy GSP/Bootstrap pages. Its differing values
(red #D74A4A, orange #E18013, bold weight 900, radii 3/4/5/10px) are accurate for that
stack, not drift. Left intact with a pointer header. Do not link both on one page —
`.btn`, `.card` and `.table` collide.

**Verified in Chromium (not jsdom)** at 1440px and 700px: computed button height 32px,
padding 6px 19px, letter-spacing normal, sidebar 230px, topbar 59px, `--warning` resolving
to #CB7515, zero unresolved custom properties. Four existing consumers re-rendered clean
(`reports/mapping-prototype.html`, `prototypes/synder-ui-kit.html`,
`unsubscribe-flow/index.html`, `onboarding/index.html`).

**Open item for Ignat:** production's active sidebar item is #007AFF (MUI/iOS system blue)
with dark text — off the Figma palette and a contrast risk. Kept as truth and flagged in
the file header rather than silently "fixed". Needs a design-system decision.

### UI Kit made the default (2026-08-26, later same day)

Ignat: "Please make it default. All prototypes should use only this one source of colors and
elements." Done.

- **All 14 prototypes** now link `ui-kit/synder-ui-kit.css` and nothing else. Previously they
  linked whichever of five stylesheets was nearest by relative path; two of them
  (`onboarding`, `projects/pt-dashboard-prototype`) were linking the `.sds-*`-only root file
  and so were getting **no** kit styling at all for their canonical class names.
- **`--sds-*` tokens folded into the kit** so the one prototype that referenced them
  (`onboarding`) resolves from the single file. The GSP values are preserved as-is — they are
  a different production stack, not drift.
- **293 raw hex values audited across the prototypes.** 60 replaced with `var(--…)` (12 exact
  palette matches, 48 same-hue near matches inside a weighted-distance threshold of 42).
  16 third-party brand colours deliberately left raw. **59 left raw pending Ignat's call** —
  mostly Material/Tailwind defaults that drifted in (#4CAF50, #F59E0B, #FFE082, #E5E7EB) plus
  legacy GSP values (#D74A4A, #E18013, #2F303A, #C8C7CC).
- Substitution was restricted to `<style>` blocks only, never `<script>`, so chart/JS colour
  strings were untouched.

**Verified:** all 14 prototypes load the kit, resolve `--color-primary` to #0053CC and
`--sds-black` to #1A1B24, with zero CSS 404s and zero JS errors. Zero unresolved `var()`
introduced (one pre-existing `--accent` in `reports/prototype-hub.html` predates this work).
In-place before/after pixel diffs: mapping-prototype 0.4%, unsubscribe-flow 3.5% (colour
nudges only, max delta ≤21); onboarding 5.4% and pt-dashboard 17.2%, both because they gained
kit styling they never had — screenshotted and confirmed correct, not regressions.

**Open for Ignat:** the 59 remaining raw values. Worth deciding as a batch — most are
Material/Tailwind defaults that should map to the Synder palette.
