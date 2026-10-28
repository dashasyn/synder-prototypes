# Synder Dashboard Prototypes — Comparative UX Review
**8 prototypes · 5 personas · Full synthesis**
Date: 2026-06-19

---

## STEP 1 — Context Framing

Quick-reference grid: what's visible above the fold, primary CTA, how errors surface, cold-state behavior.

| # | File | Above-fold content | Primary CTA | Error communication | Cold state |
|---|------|-------------------|-------------|---------------------|------------|
| **V1** | dashboard-prototype | Greeting, 5 stat blocks (Total syncs/Successful/Failed/Ready/Deleted), Integrations + Sync customizations side card | "Run check" button in health check | "Connection lost" pill on QuickBooks row; health check "Token expired" row in always-monitored column | Health check idle pane with explanatory text; stat blocks show numbers |
| **V2** | dashboard-overview-a | "Welcome back" heading + period selector, 5 stat blocks (Successful/Failed/In progress/Ready/Deleted) | "Run health check" button | Health check results hidden until button clicked; reconciliation "Pending" badge below fold | Health check banner: "Run account health check" + description; content sections still visible |
| **V3** | dashboard-overview-b | Same as V2 but sync area shows large line chart (Total syncs) + 5 sparkline stat cards stacked right | "Run health check" button | Same as V2 | Same as V2 |
| **V4** | pt-dashboard-prototype | Status headline banner ("3 items need your attention" / green "Everything is in good shape"), 3 stat cards (Transactions synced · USD synced · Issues need attention) | "See details" link in status banner; per-item "Fix →" / "Review →" links | Status headline changes color (amber/green); Issues card highlighted orange | Not designed (would show 0 issues + green banner) |
| **V5** | pt-dashboard-iter1 | Critical issues banner (if active), 3-cell top strip (Sync health score / Transactions synced / Revenue), partial pipeline view | "Open Monitoring →" in issues banner (critical); health check "Run" button below | Collapsible red issues banner lists critical issues by name; monitoring nav shows red badge count | Onboarding hero: "Connect a platform to begin" + 4-step flow + CTA button |
| **V6** | pt-dashboard-concept | Dark navy band with status pill ("Everything syncing" / "Sync paused"), flow visualization (Stripe→Shopify→Synder orb→QuickBooks), 4 metric cards | Action queue individual CTAs (Reconnect / Review / Enable / Edit per item) | Hub orb changes color blue→amber→red with pulse; platform cards turn red/dashed; top-band status pill | Not designed |
| **V7** | pt-dashboard-simple | Greeting, KPI strip (Transactions imported / Transactions customized / Transactions synced), Issues list | Per-row CTAs (Reconnect / Fix mapping / View transactions) | Colored issue rows (red/amber) with plain-English titles and descriptions; no green state until issues resolved | Success banner ("No issues found — everything is syncing correctly") replaces issue list |
| **V8** | pt-dashboard-iter2 | Sticky pipeline nav (4 mini stages: Import → Customize → Sync → Verify, each showing a mini metric + health color), Critical issues banner, 3-cell top strip | "Open Monitoring →" in issues banner; health check "Run" button below | Sticky nav stage labels go amber/red inline; issues banner; monitoring badge | Same as V5 (onboarding hero) |

---

## STEP 2 — Multi-Persona Critique

---

### Persona 1 — Sarah Chen, Senior Accountant (CPA, 15 years)
*Accounting terminology accuracy · Data integrity · Compliance · Audit-readiness*

#### V1
- **Positive:** Health check "always monitored" column separates real-time from on-demand — a defensible split for audit work. QuickBooks "Connection lost" pill is immediately visible with a "Reconnect" button.
- **Critical concern (High):** "Sync customizations" widget shows overlapping counts: E-commerce Enrichment 8,000 + Smart Rules 1,500 + RevRec 1,000 + Custom Import 200 = 10,700 against a total of 11,000 syncs. The footnote explains the overlap, but a CPA's first instinct is to verify totals. The disclaimer "one sync may appear in multiple rows" is buried at the bottom of the card, not near the headline number.
- **Critical concern (High):** "Failed: 145" has no breakdown by error type (duplicate, unmapped account, API rejection, etc.). For a CPA reviewing before month-end close, this is insufficient.
- **Medium concern:** "Deleted: 305 this month" — the word "Deleted" implies data loss. Was this user-initiated or system-initiated? No explanation.
- **Acceptable:** Plan customizations table accurately labels "Included / Add-on / Not in plan" — clear billing attribution.

#### V2 / V3
- **Positive (High):** The Verification/Reconciliation section at the bottom is the most audit-relevant content in either prototype. "Reconciliation for April — Pending" with "Start →" is concrete and time-bound. The prompt "New month started — time to check the previous one" is contextually useful.
- **Critical concern (High):** In the Customization table, the "% of all transactions" column shows: Smart rules 40% + Custom import 20% + Custom Settings 10% + E-commerce enrichment 40% + RevRec 70% = 180%. Even with the overlap disclaimer, a CPA will flag this column as misleading — the percentages appear to describe coverage ratios but they're not additive because of how the header is phrased.
- **Medium concern:** "Revenue recognition (RevRec) — 70% — Not active" — the 70% for an inactive feature implies 70% of transactions need RevRec but aren't getting it. No explanation of what this percentage represents for an inactive row.
- **Acceptable:** Health check results (after running) show specific items with sub-text: "All 18 accounts mapped correctly" — good audit-trail language.

#### V4
- **Positive (Medium):** "USD synced: $124,350 (Gross volume)" — Sarah appreciates the "Gross volume" qualifier; it sets the correct accounting frame.
- **Medium concern:** "Auto-categorization rules: 3 of 10" — doesn't tell her whether 3 rules are sufficient or whether the other 7 are empty, inactive, or unavailable on this plan.
- **Medium concern:** The status banner "3 items need your attention" is non-specific. A CPA needs to know severity immediately — are these compliance-blocking or informational?
- **Positive (Medium):** Revenue recognition "342 of 1,000 active subscriptions" is the right unit for ASC 606 work.

#### V5 / V8
- **Positive (High):** The 4-stage pipeline (Import → Customize → Sync → Verify/Reconcile) maps directly to the accounting close workflow. Sarah can mentally track where data is at each stage.
- **Positive (High):** Issues banner names specific failing components: "Stripe connection lost — QuickBooks Online disconnected." Named entities are audit-friendly.
- **Medium concern:** The "Sync health score: 82/100" is a proprietary composite metric with no disclosed algorithm. A CPA will not use this in an audit or report to a client.
- **Acceptable:** Customization table in V5/V8 distinguishes "active / at cap / not active" plan states clearly — useful for billing verification.
- **V8 addition:** Sticky pipeline nav with per-stage counts (Import: 20,000, Sync: 3,241) provides the kind of stage-to-stage reconciliation a CPA wants.

#### V6
- **Positive (High):** The accountant demo state has the most complete issue queue: "18 transactions have no GL account assigned — falling back to 'Uncategorized income'" is perfectly precise for month-end close work. "7 transactions failed — currency mismatch (EUR in USD-home-currency org)" shows the root cause. "3 duplicate transactions detected — same external IDs across Stripe + Shopify — may double-count revenue" is exactly the risk-flag a CPA needs.
- **Medium concern:** "Revenue synced: $81,190" in the books card without a link to the underlying ledger is a trust gap. How does she verify this against the QuickBooks P&L?
- **Medium concern:** Account mapping bar chart shows "Taxes: 45%", "Other: 22%" — but the denominator is unclear. 45% of what? Transactions? Categories? Accounts?

#### V7
- **Positive (High):** "18 transaction categories have no GL account assigned. Transactions are falling back to 'Uncategorized income'" is the clearest, most actionable error description of all 8 prototypes from a CPA perspective.
- **Critical concern (High):** The healthy state shows only a green banner + recommendations. There is no persistent view of integration status, reconciliation status, or account mapping coverage. Sarah cannot get a quick weekly status check from this dashboard in the healthy state.
- **Critical concern (High):** "80 summaries need attention — Grouped transactions contain incorrect data. Review before month-end close" is excellent language — but "grouped transactions" needs a one-sentence explanation for non-technical users.

---

### Persona 2 — Mike Torres, Inexperienced Business Owner
*Simplicity · Jargon-free language · Confidence · Quit-risk moments*

#### V1
- **Quit-risk moment (High):** "Sync customizations" panel — headline "Synder customized 9,700 of 11,000 syncs" and then 4 rows with feature names ("E-commerce Data Enrichment," "Smart Rules") that mean nothing to Mike. Combined with bar charts and overlapping numbers, this is abandonment territory within 30 seconds.
- **Medium concern:** "Ready to sync: 850" — Mike doesn't know what "sync" means in the accounting context and has no idea if 850 waiting items is normal.
- **Acceptable:** Integration list is clear — "Stripe · last sync 2 min ago · Auto-sync On" communicates in plain language.

#### V2 / V3
- **Acceptable:** "My wonderful flowers (Stripe) — Connected · Auto-sync is on" is excellent for Mike — uses his store name, not a tech identifier.
- **Medium concern:** "Run health check" — Mike doesn't know what a health check is. He may ignore the button entirely, meaning he'd never see any issues.
- **Quit-risk moment (High):** The Customization table with "1 of 1 · at cap" in orange is alarming without explanation. Mike may think something is broken when it just means he's hit a feature limit.
- **Acceptable:** V3 chart makes the dashboard look more "real" and functional, which increases confidence for business owners.

#### V4
- **Best above-fold language (High):** "3 items need your attention" vs "Everything is in good shape" — this is immediately comprehensible to anyone. No accounting knowledge required.
- **Positive (High):** "USD synced: $124,350" — Mike recognizes dollar amounts as the thing he cares about.
- **Medium concern:** "2 transactions missing tax code — Will sync once resolved" — Mike doesn't know what a "tax code" is or how to find and fix it. The "Review →" link doesn't tell him what he'll see.
- **Positive (Medium):** Demo state toggle works well for the prototype; the "clean" state is genuinely reassuring.

#### V5 / V8
- **Positive (High):** Cold state onboarding "Connect a platform to begin" with 4-step visual (Import → Customize → Sync → Reconcile) gives a new user confidence that there's a structured process.
- **Medium concern:** "Import → Customize → Sync → Verify" pipeline stages — Mike doesn't know what "Customize" means in this context. He might think he needs to do manual customization.
- **Quit-risk moment (Medium):** The critical issues banner "2 critical issues — Synder can't sync until resolved" with a button to "Open Monitoring →" is too technical. "Open Monitoring" sounds like a system administration task, not something a business owner does.
- **Acceptable:** "Syncs left: 1,000" in topbar is simple and clear.

#### V6
- **Quit-risk moment (High):** The flow visualization with Stripe→Shopify→Synder Hub Orb→QuickBooks is visually striking but cognitively complex. A business owner who doesn't know what "Synder Hub" is will be confused by the orb showing "82/100." When the orb turns red, they may panic without understanding what to do.
- **Positive (Medium):** "Time saved: ~47 hrs" is immediately motivating — a business owner understands saved time = saved money.
- **Acceptable:** Action queue items like "Auto-sync is off on Shopify — Shopify transactions are not being automatically synced" are plain-language enough.

#### V7
- **Best for Mike (High):** Clear hierarchy: KPIs → Issues (if any) → Recommendations → Promos. Every issue row has a plain-English title and a single obvious CTA.
- **Positive (High):** "Connection lost — Some integrations lost connection. Transactions won't sync until reconnected. Reconnect →" — this is the closest to "your internet is out, plug it back in" language of any prototype.
- **Medium concern:** "Transactions customized: 3,241" — Mike doesn't know what "customized" means. Tooltip helps but he may not notice it.
- **Acceptable:** The dismissible promo rows ("Get more with Synder") are non-intrusive and give Mike a way to ignore marketing without losing operational data.

#### V8
- **Quit-risk moment (Medium):** The sticky pipeline nav at the top — before any content — lists 4 stages with small metrics. A business owner doesn't have a mental model of this pipeline and will skip over the nav trying to find "is everything OK."
- **Acceptable:** After the nav, the flow is similar to V5 which has decent business-owner signaling.

---

### Persona 3 — Viktor Harsch, Critical UX Designer (20 years)
*Visual hierarchy · Cognitive load · Information architecture · Consistency*

#### V1 — Fix This Yesterday
1. **The health check two-column layout creates false visual symmetry with wasted space.** The "On-demand checks" column is 50% of the card width but shows nothing until the user clicks a button. This wastes prime real estate and creates an asymmetric visual tension with the "always monitored" column which has dense content.
2. **The "Sync customizations" bar chart uses bars that don't represent comparable quantities.** E-commerce Enrichment bar is at 100% (8,000) and Smart Rules is at 19% (1,500) — the bars visually imply a ratio between these features, but they're measuring different things (syncs touched by each feature). The "overlap is intentional" disclaimer doesn't fix the misleading visual encoding.
3. **The "Plan customizations" table at the bottom has the wrong information hierarchy.** Status and billing information belongs in Settings, not on the primary dashboard. It crowds out space that should be used for actionable operational data.

Additional: The 5-stat-block grid is visually clean and the dark sidebar creates good contrast, but the font sizes (30px stat numbers, 11px labels) creates excessive visual jumps.

#### V2
- **Positive:** Section headings (SYNCHRONIZATION / INTEGRATIONS / ACCOUNT HEALTH / CUSTOMIZATION / VERIFICATION) with horizontal dividers create the clearest information architecture of any prototype. Each section is scannable.
- **Fix This Yesterday:**
  1. **Health check is hidden behind a button but the reconciliation section below is fully visible.** The critical operational check is passive; the secondary audit status is persistent. Invert: health check should be always-on with a "Re-run" option; reconciliation can remain persistent.
  2. **The Customization table's "% of all transactions" column shows percentages that sum to >100%.** Even with a footnote, this column header is misleading — "40%" appears to mean "40% of syncs were smart-ruled" but since data overlaps, the actual coverage is indeterminate from the table alone.
  3. **The "at cap" row highlight (orange background on the row) is visually buried** — a table row color change in a 6-row table is easy to miss. The Upgrade button is appropriately colored but the row itself needs a stronger visual treatment.

#### V3
- **Positive:** The line chart adds trend context that the pure count view in V2 lacks. A chart with actual trajectory data is more useful than 5 isolated numbers.
- **Negative (Medium):** The chart x-axis shows no dates — tooltips show "Day 1: 18" etc. This is non-production-ready. A production chart needs date labels.
- **Negative (Medium):** The sparklines in the stat cards (right column) are decorative — they show small static polylines with no hover state and no axis values. They look like data but convey nothing specific.
- Overall V3 > V2 for visual richness, but the chart implementation needs significant work before production.

#### V4
- **Positive (High):** The status headline banner is the best single-sentence UI element in all 8 prototypes. Color-coded (amber/green), binary (attention needed / all good), immediately scannable.
- **Fix This Yesterday:**
  1. **3-stat layout is too sparse for the screen real estate.** Two full-width stat cards (Transactions synced + USD synced) and one issues card is insufficient information density. The page below these cards is mostly occupied by two large panels with inconsistent content.
  2. **Tooltip abuse.** The Customizations panel has 5 tooltip-icon (?) buttons — one per feature. Tooltips are a UX crutch for bad labeling. Fix the labels instead: "Auto-categorization rules" is already better than "Smart rules". One tooltip per panel maximum.
  3. **"Issues need attention: 3" is a count card, not an issue card.** A count with orange styling tells the user something is wrong but doesn't show what. The card should show the most critical issue inline (with a "see all" link), not just a count.

#### V5 / V8
- **V5 Positive (High):** The 4-stage pipeline model is the best mental model for this product across all prototypes. It correctly represents the technical reality of Synder's data flow.
- **V5 Fix This Yesterday:**
  1. **The top strip (sync health score / transactions / revenue) sits above the pipeline, creating a disconnected hierarchy.** The pipeline is the mental model; the top strip is metrics. They should be integrated — metrics belong inside the pipeline stages.
  2. **On-demand health check is the last card above the fold — lower priority than the customization table.** Monitoring content should be closer to the top; customization is secondary.
  3. **Three layers of navigation in V8 (sidebar + topbar + sticky pipeline) creates cognitive overload.** The sticky pipeline nav is valuable but it competes with the topbar for attention. Solution: merge the pipeline nav below the topbar with clear visual separation.

- **V8 Positive (High):** Sticky pipeline nav with per-stage mini metrics is the single best navigation innovation across all prototypes. Allows instant visual triage of "where did my data get stuck."
- **V8 Negative (High):** Before any content, the user sees: topbar (height 59px) + sticky pipeline nav (height ~48px) + issues banner + top strip = ~200px of chrome before content. On a 900px viewport, more than 20% of visible area is structural overhead.

#### V6
- **Positive (High):** The flow visualization is the most conceptually differentiated design. The hub orb as a single status indicator reduces "system overview" to one visual element. Action queue is the best-named pattern (vs "health check" or "issues").
- **Fix This Yesterday:**
  1. **The dark navy top band creates a visual discontinuity with the white/gray content area below.** This looks like two different products stacked. Either commit to a dark theme or use the top band only for branding context (logo area) not for operational status.
  2. **The flow SVG is procedurally generated and lacks visual refinement.** The connector lines between platform cards and the hub are straight path segments without curves or polish. This is fine for a prototype concept but communicates "I'm not designed yet."
  3. **"Time saved: ~47 hrs" has no methodology disclosure.** This metric appears in the top metrics row but its calculation is never explained. A skeptical user (CFO, accountant) will question this immediately. Add a "How is this calculated?" tooltip minimum.

#### V7
- **Positive (High):** The issue-list model is architecturally sound — issues are scannable, color-coded by severity, and each has one specific CTA. The KPI strip (3 boxes) is the cleanest above-fold layout in the set.
- **Fix This Yesterday:**
  1. **The healthy state dashboard is too empty.** When no issues exist: one green banner + recommendations + promos. There is no persistent operational view — no integration statuses, no last sync time, no account coverage. The dashboard becomes a marketing page when healthy.
  2. **Recommendations and promos share the same visual treatment as issues.** A "Turn on Auto-sync" recommendation row looks nearly identical to an issue row. The user must read the section header to understand the difference. These need distinct visual patterns.
  3. **"+ 3 more issues" behind a "View all" link hides potentially critical items.** If there are 7 issues (4 visible + 3 hidden), the 5th issue could be the most important one. Priority-sort issues and show ALL critical (red) items, cap only at warning level.

---

### Persona 4 — James Whitfield, Skeptical CFO
*Trust · Financial risk · Transparency · ROI visibility*

#### V1
- **Trust issue (High):** "Health check — Last on-demand check: never" means the dashboard has no persistent verification. A CFO who opens the dashboard and sees "never" has no assurance that data is correct.
- **Trust issue (High):** "Revenue Recognition" listed as an "Add-on" in the Plan customizations table — James was not expecting an additional billing line on the accounting dashboard.
- **ROI gap (High):** No dollar amount visible above fold. "11,000 syncs" is meaningless to a CFO without a financial value.
- **Acceptable:** "Connected integrations · 4 active" with "last sync 2 min ago" timestamps provide verifiable recency data.

#### V2 / V3
- **Trust issue (High):** Health check results are ephemeral — clicking away and returning shows no history. "Did everything pass last time I ran it?" is unanswerable.
- **Positive (Medium):** The reconciliation table with explicit dates ("Apr 1–30, 2026 — Reconciled"; "May 1–31, 2026 — Pending") is the most trust-building element across V2/V3. It shows concrete periods and actionable status.
- **ROI gap (High):** No revenue amount in V2/V3 above fold. Only V3's chart shows "Total syncs: 2,000" — a count, not a financial figure.
- **Trust issue (Medium):** "My wonderful flowers (Stripe)" and "My ceramic plates (Shopify)" look like test data (placeholder store names). Breaks credibility in a CFO demo.

#### V4
- **Positive (High):** "USD synced: $124,350 (Gross volume)" is the only above-fold financial metric in the first four prototypes. James immediately understands financial throughput.
- **Trust issue (Medium):** "3 items need your attention" — what kind of items? Could be a misconfigured rule or could be a compliance-blocking error. The severity is not communicated.
- **Trust issue (Medium):** The period selector changes the issue count (switching to "Last month" shows 0 issues). James may suspect the dashboard is hiding current problems by defaulting to a "safe" period.
- **Acceptable:** Status headline is unambiguous — green means all good, amber means action needed.

#### V5
- **Trust issue (High):** "Sync health score: 82/100" — James will not trust a proprietary composite score without knowing its components. He needs: success rate, connection status, mapping coverage — separately, not combined into a score.
- **Positive (High):** Critical issues banner names specific failing systems ("Stripe connection lost — QuickBooks Online disconnected") — this is the transparency James needs. Unambiguous, no euphemisms.
- **ROI gap (Medium):** Revenue synced metric is present in the top strip if the data is good, but not shown in the critical/error states where revenue visibility matters most.

#### V6
- **Best for James (High):** "Revenue synced: $84,215 ↑12% vs $75,180 last period" is the only prototype that shows YoY-comparable financial data above fold. The trend arrow adds context.
- **Positive (High):** "Time saved: ~47 hrs" — ROI metric present. Even if the calculation is opaque, the number anchors value.
- **Positive (High):** "Sync paused since Tuesday — $0 today (Stripe)" during critical state is exactly the risk quantification James needs. He sees financial exposure immediately.
- **Trust issue (Medium):** "405 transactions waiting" — quantified risk but no estimated dollar value. "405 transactions ≈ $??,??? not posted" would complete the picture.
- **Trust issue (Medium):** Hub orb "41/100 — Action required" with pulsing red — James knows something is wrong but the orb doesn't tell him what. He has to scroll to the action queue.

#### V7
- **ROI gap (High):** No dollar amounts anywhere on the dashboard. "Transactions synced: 3,219" is a count without financial context. "80 summaries need attention" — what's the dollar exposure? James has no way to assess financial risk.
- **Acceptable:** Issue descriptions are specific enough to be useful once clicked, but James needs financial context at the list level.

#### V8
- **Same trust issues as V5** regarding the health score.
- **Positive (Medium):** Sticky pipeline nav showing per-stage counts gives James a quick way to verify data throughput (import → customize → sync funnel).
- **ROI gap (High):** Revenue synced in top strip but not visible in the sticky pipeline nav where James scans first.

---

### Persona 5 — Priya Nair, Customer Support Agent
*Top 5 predicted support tickets per prototype*

#### V1
1. **"My QuickBooks says Connection lost but I'm logged into QuickBooks fine — why?"** — The error gives no diagnostic detail beyond "Token expired — reconnect." No troubleshooting steps. *Prevention: Add "What causes this?" expandable with 3 common causes.*
2. **"What does Ready to sync: 850 mean? Are these my transactions not going through?"** — Users conflate "ready" with "stuck." *Prevention: Rename to "Waiting to post" with tooltip "Transactions imported from your platforms, waiting to be sent to your accounting software."*
3. **"The Sync customizations numbers add up to more than my total syncs — is there a bug?"** — The overlap footnote is invisible unless the user reads to the bottom. *Prevention: Move the disclaimer to the headline: "9,700 customized (features may overlap)".*
4. **"I ran the health check and it showed 3 potential duplicates — what do I do?"** — No next action from the health check result. *Prevention: Add "Review →" link to each health check result row.*
5. **"What does Deleted: 305 mean? Did someone delete my data?"** — Users interpret "Deleted" as data loss. *Prevention: Rename to "Removed" with tooltip.*

#### V2
1. **"I ran the health check and it showed warnings — do I need to fix them before I can use Synder?"** — Warnings vs errors semantically blurred. *Prevention: Use "Warning (non-blocking)" and "Error (sync paused)" labels.*
2. **"Why does reconciliation show Pending for Shopify?"** — "Pending" means "reconciliation hasn't been run yet" but users interpret it as "something went wrong." *Prevention: Use "Not yet run" instead of "Pending" for unstarted reconciliations.*
3. **"I came back to the dashboard and the health check results are gone — do I need to rerun it every time?"** — Results disappear on navigation. *Prevention: Persist health check results with timestamp.*
4. **"The customization table shows Revenue recognition at 70% but says 'Not active' — what does that mean?"** — Grayed-out row with high percentage is counterintuitive. *Prevention: Remove inactive rows from the default view or explain "70% of your transactions qualify for this feature."*
5. **"There are two rows for My wonderful flowers (Stripe) in the reconciliation table — is this a duplicate?"** — Two reconciliation entries for the same integration (different periods) look like a data error. *Prevention: Group by integration, nest periods.*

#### V3
Tickets 1–4 same as V2. Additional:
5. **"The chart shows Day 1 to Day 30 in tooltips but I don't know which dates those are — can you tell me what the chart represents?"** — Tooltip shows "Day 1: 18" with no actual date. *Prevention: Use actual dates in chart tooltips.*

#### V4
1. **"The status bar says 3 items need attention but where exactly do I go to fix them?"** — "See details" link scrolls to health panel, but the link is small and in muted text. *Prevention: Make the link more prominent and name the issues inline: "Stripe reconnection, 2 missing tax codes, outdated rule."*
2. **"I switched to 'Last month' and now it says 0 issues — but I was told I had issues today. Did they disappear?"** — Period selector changes the issues count, confusing users who don't realize the "3 items need attention" was for the selected period. *Prevention: Issues section should always show CURRENT status regardless of selected period; only the stats change with period.*
3. **"What is Custom import logic: 1 of 1 · At cap in orange — does this mean my transactions aren't processing?"** — "At cap" is opaque. *Prevention: Add inline explanation: "At cap — you've used all your allowed modifications this month. Transactions still sync, but no new custom logic runs."*
4. **"What is Account behaviors: 4 enabled — should it be more or less?"** — Count without context. *Prevention: Add "of 12 available" or similar denominator.*
5. **"Revenue recognition shows 342 of 1,000 subscriptions — what happened to the other 658?"** — Missing data concern. *Prevention: Add "658 ineligible — no subscription pattern detected" in sub-label.*

#### V5
1. **"I see a critical banner saying Synder can't sync — I clicked 'Open Monitoring' but can't find the Fix button."** — Monitoring page lists problems but requires multiple clicks to reach the fix. *Prevention: Show the fix CTA directly in the issues banner ("Reconnect Stripe →") instead of routing to Monitoring.*
2. **"What is Sync health score 82/100 — is 82 good or bad? What do I need to do to get to 100?"** — Abstract gamified score. *Prevention: Explain score: "82/100 · 99.3% success rate · 2 open warnings · No connection issues."*
3. **"I finished onboarding but the Connect your first platform button is still showing — is something wrong?"** — Cold/onboarding state may persist if first platform fails. *Prevention: Add explicit "dismiss" or auto-dismiss after first platform is detected.*
4. **"I ran the health check but yesterday when I came back it was gone — do I need to run it every day?"** — Same persistence issue as V1/V2. *Prevention: Persist results with timestamp.*
5. **"The pipeline shows Verify/Reconcile — what does this stage do? Do I need to do anything?"** — Reconcile stage is confusing as a pipeline step. *Prevention: Add "No action needed right now" or "Run monthly" in the stage card context line.*

#### V6
1. **"Why is the orb red — what exactly is wrong and what do I do first?"** — Orb color change is alarming but actionable information is in the action queue below fold. *Prevention: Keep orb as summary but add 1-line critical issue text next to it: "Stripe connection lost."*
2. **"Stripe connection lost — 405 transactions waiting — when I reconnect, will those transactions automatically sync?"** — Users fear data loss. *Prevention: Add reassurance text in the action queue item: "They'll post automatically when you reconnect."*
3. **"The money flow shows $0 for Stripe today — does that mean I've lost all my Stripe revenue data?"** — In critical state, Stripe shows 0 synced. *Prevention: Show "Sync paused since [date]" in platform card, not $0.*
4. **"Account mapping shows Taxes: 45% — what happened to the other 55%?"** — Percentages without denominators. *Prevention: "Taxes: 45% mapped (11 of 24 accounts)".*
5. **"I see Time saved: ~47 hours — how was this calculated?"** — ROI metric without methodology. *Prevention: Add tooltip: "Estimated based on ~1 min per manual transaction entry."*

#### V7
1. **"There are 7 issues shown but only 4 are visible and it says + 3 more — are the hidden ones worse than what I'm seeing?"** — Critical issues may be hidden. *Prevention: Always show all "Error" (red) items; only collapse "Warning" level.*
2. **"It says Connection lost — some integrations lost connection. Which integrations exactly?"** — Vague error. *Prevention: Always name the specific integration: "Stripe connection lost."*
3. **"I reconnected Stripe but the error is still showing — do I need to refresh the page?"** — No auto-refresh on fix completion. *Prevention: Add auto-refresh or dismissal after successful reconnect action.*
4. **"What's the difference between Issues, Recommendations, and Get more with Synder — why are they all in the same list style?"** — Three content types sharing visual treatment. *Prevention: Distinct visual pattern per category (red/amber for issues, blue outlined for recommendations, white filled for promos).*
5. **"The 'Get more with Synder — Match transactions in Synder' promo — isn't transaction matching something I already paid for?"** — Promo for features the user may already have. *Prevention: Check feature entitlement before showing promos; replace with "You have this feature — try it now."*

#### V8
Tickets 1–4 same as V5 (same core architecture). Additional:
5. **"The sticky navigation at the top shows orange on Sync — what exactly is wrong with my syncing?"** — Mini metrics in the sticky nav show color states but no click-through detail from the nav itself. *Prevention: Make sticky stage tabs clickable → scroll to that section with issues banner pre-expanded.*

---

## STEP 3 — Cross-Agent Signal Detection

### High-Priority Issues (raised by 2+ personas)

| Issue | Prototypes affected | Personas flagging it |
|-------|---------------------|---------------------|
| **Health check results are ephemeral — no persistence** | V1, V2, V3, V5, V8 | Sarah (no audit trail), James (can't verify without clicking each visit), Priya (results disappear between sessions) |
| **"Ready to sync" / "In progress" labels are undefined** | V1, V2, V3 | Sarah (accounting meaning unclear), Mike (doesn't know if normal), Priya (generates tickets) |
| **Sync customization overlap math creates distrust** | V1, V2, V3 | Sarah (reconcilable totals instinct), Viktor (misleading visual encoding), Priya ("are these numbers wrong?") |
| **"Deleted" label implies data loss** | V1, V2, V3 | Sarah (audit red flag), James (data integrity concern), Mike (panic), Priya (generates tickets) |
| **No dollar amount above fold** | V1, V2, V3, V5, V7, V8 | James (ROI invisible), Viktor (dashboard lacks financial weight), Sarah (revenue context for reconciliation) |
| **"Sync health score" is a black box** | V5, V6, V8 | Sarah (algorithm unknown), James (distrusts proprietary scores), Priya (users ask "is 82 good?") |
| **Vague "some integrations" error language** | V7 | Sarah (unacceptable for audit), James (can't assess risk), Priya (generates tickets) |
| **Upsell ("Upgrade →") embedded in operational status view** | V1, V2 | James (commercial mixed with operational), Viktor (visual category confusion), Mike (urgent vs commercial ambiguity) |
| **Issues banner routes to Monitoring, not direct fix** | V5, V8 | Mike (can't find the fix), Priya (multi-step friction), Sarah (workflow break) |

### Notable Persona Disagreements

| Disagreement | Personas | Resolution |
|---|---|---|
| V6 Flow view: Viktor loves the visual clarity; James distrusts the abstraction and wants raw numbers | Viktor vs James | Keep flow as orientation layer; surface specific numbers alongside it |
| V7 Simple: Mike finds it the most accessible; Sarah finds it too thin (no reconciliation, no mapping detail) | Mike vs Sarah | V7's issue-first layout is right for the front matter; role-based depth behind it |
| Health check: Sarah and James both want persistent results; but James wants all-time history, Sarah wants current-state | Both aligned on persistence, differ on depth | Persist current-run results + add "view history" link |
| V5/V8 pipeline stages: Viktor wants them at the top; Sarah is indifferent to navigation, wants content quality | Viktor vs Sarah | Both can be satisfied: pipeline nav at top, content quality below |
| V6 hub orb: Viktor appreciates the single-status concept; James calls it a black box | Viktor vs James | Keep orb as a visual indicator, surface the score components inline below it |

---

## STEP 4 — Alex Synthesis (Product Lead)

### Ranked Verdict: Which Prototype Wins for Which User Type

#### Senior Accountant / CPA → **V8 (iter2)** wins, **V5 (iter1)** is close second

**Evidence:** V8's sticky pipeline nav provides the per-stage data trail a CPA needs to reconcile "20,000 imported → 3,241 synced" discrepancies. The Verify/Reconcile pipeline stage makes the audit step visible. The issues banner names specific systems. Critical distance from V5: the sticky nav surfaces stage health without requiring a scroll, which is how a CPA reviews before month-end. V6's accountant-demo action queue ("18 transactions have no GL account — falling back to Uncategorized income") has better issue language but lacks the structural pipeline view.

#### Business Owner / Non-technical → **V7 (Simple)** wins, **V4 (pt-dashboard-prototype)** is close second

**Evidence:** V7's issue-first layout with plain English titles, specific CTAs per issue, and a clear green success state requires the least accounting knowledge to use. V4's status headline banner is the single best above-fold element for non-technical users — binary, color-coded, immediately actionable — but V4's secondary content (Customizations panel with tooltip-heavy features) loses Mike. V7's healthy state is too thin (recommendation: add a persistent operational strip to V7's healthy state).

#### UX Designer judging design quality → **V8 (iter2)** wins, **V6 (Concept)** is strong runner-up

**Evidence:** V8's sticky pipeline nav is the only navigational innovation in the set that earns its complexity cost — it lets a user orient, monitor, and drill down without extra page loads. V6's action queue pattern name and flow visualization concept are superior in abstraction but the execution (dark/light split, SVG quality) is not production-ready. V8 inherits V5's sound information architecture and improves it with the sticky nav.

#### CFO / Executive → **V6 (Concept)** wins, **V4** is the only viable alternative

**Evidence:** V6 is the only prototype that consistently shows "Revenue synced: $84,215 ↑12% vs last period" AND "Time saved: ~47 hrs" above fold. It quantifies financial risk in critical state ("405 transactions waiting · Sync paused since Tuesday"). No other prototype achieves this financial transparency. V4 shows "USD synced: $124,350" which is sufficient for a CFO scan but lacks trend data and ROI context.

#### Customer Support perspective → **V7** wins (fewest predicted tickets per issue), **V8** runner-up (best resolution paths via Monitoring)

---

### Critical Issues (Must Fix)

**CI-1: Health check results must persist between sessions**
All prototypes with on-demand health checks (V1, V2, V3, V5, V8) show results only for the current visit. A user who ran the check two days ago returns to a blank "Run check" button. This eliminates the audit trail value of the feature entirely.
- **Impact:** High — users (Sarah, James, Priya) have no system-of-record for past check results
- **Fix:** Show last-run results by default with a "Last checked: [timestamp]" header. Replace "Run check" with "Re-run check." Cache results server-side, not just client-side.

**CI-2: "Deleted" label must be renamed and explained**
"Deleted: 305 this month" (V1) and "Deleted: 60" (V2/V3) cause immediate alarm — users assume data was lost. In Synder's context, "Deleted" likely means transactions were deliberately removed from the sync queue.
- **Impact:** High — generates support tickets, erodes trust
- **Fix:** Rename to "Removed from sync" with an inline (?) tooltip: "Transactions excluded from sync by rules or manual removal. No data was deleted from your platform."

**CI-3: "Ready to sync" ambiguity must be resolved**
"Ready to sync: 850" (V1) and "Ready: 40" (V2/V3) — users cannot determine if this is a healthy buffer or a growing backlog. The label "Ready" implies everything is fine; the number 850 implies a large queue.
- **Impact:** High — misleads both business owners and CPAs about system state
- **Fix:** Rename to "Waiting to post" and add a timestamp context: "850 waiting to post · next batch in 8 min" or "850 waiting to post · auto-sync is off."

**CI-4: Dollar amount must appear above fold on all dashboard variants**
V1, V2, V3, V5, V7, V8 show only transaction counts above fold. The CFO's primary question ("how much revenue moved through Synder this month?") is unanswered.
- **Impact:** High — eliminates ROI visibility; CFOs cannot assess value without scrolling
- **Fix:** Add "Revenue synced: $XX,XXX" as one of the top-line metrics in the header row of every prototype. V4 and V6 already do this correctly.

**CI-5: Vague integration identification in error messages**
V7's issue row: "Connection lost — Some integrations lost connection." Never names which platform.
- **Impact:** High — generates preventable support contacts; blocks self-service resolution
- **Fix:** Always name the specific integration: "Stripe connection lost" not "some integrations." V5/V8/V1 do this correctly in health check rows.

**CI-6: Issues banner (V5/V8) routes to Monitoring instead of providing a direct fix**
"2 critical issues — Synder can't sync until resolved → Open Monitoring →" adds a navigation step before the user can act.
- **Impact:** High for non-technical users
- **Fix:** Show inline fix CTA in the banner: "Stripe connection lost — Reconnect →" / "QuickBooks token expired — Reconnect →" directly in the banner body. Keep "Open Monitoring" as a secondary link.

---

### Important Issues (Worth Fixing)

**II-1: Sync customization overlap disclaimer is buried**
V1 bottom footnote; V2/V3 table sub-header. The note "each feature counted independently — one sync may appear in multiple rows" is easy to miss and creates false impression of additive coverage.
- **Fix:** Move to the metric headline itself: "Synder customized 9,700 syncs (features overlap — see details ↓)"

**II-2: "Sync health score" needs a composition tooltip**
V5/V6/V8 show 82/100 (or 98/100, 41/100) with no breakdown. Users and CFOs distrust unexplained scores.
- **Fix:** Add hover/click expansion: "82/100 = 99.3% sync success · 2 open warnings · All connections active." Consider eliminating the score in favor of a status label + breakdown.

**II-3: Reconciliation section is buried below fold (V2/V3)**
The most audit-critical section (Verification) is the last card, below Integrations, Health, and Customization.
- **Fix:** Move reconciliation to the second or third section. In the pipeline model (V5/V8), it's already the fourth stage (Verify) — ensure that stage's health is reflected in the sticky nav with color-coding.

**II-4: V7 healthy state is operationally empty**
When no issues exist, V7 shows only a green success banner + recommendations + promos. No integration status, no last sync time, no account coverage data.
- **Fix:** Add a compact "Current status" strip below the success banner: "Stripe · synced 3 min ago · Auto-sync on | Shopify · synced 11 min ago · Auto-sync on | QuickBooks · connected"

**II-5: Period selector affects issue count in V4 — misleading behavior**
Switching to "Last month" shows 0 issues in V4. Current operational issues should not change with the historical period filter.
- **Fix:** Separate the data clearly: period filter affects the sync stats and charts; the issues/health section always shows CURRENT state regardless of period. Add a note: "Issues reflect current status, not historical period."

**II-6: Three-navigation-layer problem in V8**
Topbar (59px) + sticky pipeline nav (48px) + issues banner + top strip ≈ 200px of overhead before content on a standard laptop screen.
- **Fix:** Consolidate the sticky pipeline nav with the topbar by placing it immediately below — removing the topbar's white space and making the pipeline the primary navigation chrome rather than a secondary layer.

---

### Ignore for Now

- Inter vs Roboto font inconsistency (V2/V3 use Inter; others use Roboto) — design system decision, not UX impact.
- Dark sidebar (V1) vs light sidebar — visual preference, no usability evidence either way.
- Emoji in navigation (V2–V8) vs Material Icons (V1) — implementation detail for the design system team.
- Period selector in topbar (V2/V3) vs page header (V4/V5/V8) — minor placement decision.
- Chart y-axis labels missing in V3 — valid but a production implementation detail.

---

### Structured Improvements

#### A. Quick Wins (copy, labels, small UX fixes)

| Problem | Proposed solution | Effort | Confidence |
|---|---|---|---|
| "Deleted: 305" label causes alarm | Rename to "Removed from sync" + inline tooltip explaining no data was lost | Low | **High** |
| "Ready to sync: 850" is ambiguous | Rename to "Waiting to post" + add next-batch timestamp or reason for queue | Low | **High** |
| Health check "Last on-demand check: never" with no context | Add "Last checked: never" below the button before first run; after first run show "Last checked: [timestamp]" | Low | **High** |
| V4 "See details" link in status banner | Change to "Fix 3 issues →" (with issue count) for attention state; hide in success state | Low | **High** |
| V7 "Some integrations lost connection" | Always name the specific integration: "Stripe connection lost" | Low | **High** |
| "Syncs left: 1,000" in topbar (V2–V8) | Add tooltip: "Monthly sync quota — resets in X days. Need more? Upgrade plan." | Low | **High** |
| V2/V3 reconciliation "Pending" status for unrun reconciliation | Rename "Pending" → "Not yet run" for unstarted reconciliations; keep "Pending" only for in-progress | Low | **High** |
| V6 action queue: "Shopify tax not being captured" | Add financial context inline: "14 orders this month · est. $280 tax gap" | Low-Med | **Medium** |
| Sync customizations overlap disclaimer location | Move from footer to headline: "9,700 customized (features may overlap)" | Low | **High** |
| V5/V8 issues banner CTA "Open Monitoring →" | Add inline per-issue fix links before "Open Monitoring"; make "Open Monitoring" secondary | Low | **High** |

#### B. Structural Changes (layout, hierarchy, flows)

| Problem | Proposed solution | Effort | Confidence |
|---|---|---|---|
| No dollar amount above fold in V1/V2/V3/V5/V7/V8 | Add "Revenue synced: $XX,XXX" as a required metric in the top-level stat group | Med | **High** |
| Reconciliation buried at page bottom (V2/V3) | Move to section 2 (after sync stats) or surface its status in section 1 as an indicator | Med | **High** |
| V1 health check 2-column layout with wasted idle state | Merge to single column: always-on checks at top (persistent), on-demand below; no whitespace columns | Med | **High** |
| V7 healthy state is too empty | Add persistent "Integrations current status" strip below success banner | Med | **High** |
| V8 three-layer navigation overhead | Merge sticky pipeline nav directly below topbar (remove dead space); reduce total chrome to ≤90px | Med | **High** |
| V4 issues count card shows number only | Replace "Issues: 3" card with an inline issue preview: show the most critical issue title with a "see all" link | Med | **High** |
| V1 Plan customizations table belongs in Settings | Remove from dashboard or reduce to a single "Plan usage" metric card that links to full table in Settings | Med | **Medium** |
| V6 dark/light visual split | Unify to light theme throughout; repurpose top band as a subtle brand accent only | Med | **High** |

#### C. Complex Changes (logic, features, data)

| Problem | Proposed solution | Effort | Confidence |
|---|---|---|---|
| No financial impact on issues (V7, V5) | Calculate estimated dollar exposure per issue: "405 transactions not synced ≈ $XX,XXX unposted" | High | **Medium** |
| "Sync health score" is a black box | Replace composite score with explicit status: "99.3% success · 2 warnings · All connections active" — or disclose score formula in a click-through | High | **High** |
| Period selector changes issue count (V4) | Architect issues/health section to always reflect current state, independent of period filter; only stats/charts respond to period changes | Med-High | **High** |
| Cold state not designed in V1/V2/V3/V4/V6 | Implement the V5/V8 onboarding pattern (hero + 4-step flow + CTA) as the cold state for all prototype variants | High | **High** |
| Health check results not persistent | Store health check results server-side; surface as a "last check" snapshot on load; provide "re-run" to update | High | **High** |
| V6 flow SVG is procedurally generated | Design a proper SVG flow illustration with curves, platform logos, and animated data flow for production readiness | High | **Medium** |
| Recommendations vs promos vs issues share the same row visual (V7) | Implement three distinct visual patterns: issue rows (colored left border + filled background), recommendation rows (blue outline), promo rows (white fill + dismiss X); enforce content type separation | Med | **High** |

---

### Overall Winner: V8 (iter2) as the base for accountant/power users; V7 (Simple) as the base for business owners

**V8 wins on architecture** — the sticky pipeline nav, 4-stage model, monitoring sub-section, cold state onboarding, and issues banner together represent the most complete design solution. Its weaknesses (no dollar amount above fold, on-demand health check not persistent, 3-nav-layer overhead, black-box score) are all fixable via Quick Wins and Structural Changes above.

**V7 wins on accessibility** — it is the simplest, most action-oriented dashboard for users without accounting knowledge. Its weakness (too empty in healthy state, no persistent status view, no financial data) can be fixed by adding the "current status" strip from the Structural Changes section above.

**The recommended synthesis** is to develop two dashboard modes on the V8 architecture:
1. **Standard mode (V8 base):** Pipeline nav, stage-level metrics, full monitoring. Default for accountants and power users.
2. **Simplified mode (V7 influence):** Issue-first, plain-English, minimal technical detail. Toggle for business owners or newcomers.

Both modes should share: persistent health check results, named integration errors, dollar amount above fold, and the V5/V8 cold-state onboarding pattern.
