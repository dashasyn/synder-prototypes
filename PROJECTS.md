# PROJECTS.md - Active Projects & Tools Registry

> Dasha reads this file every session. If a project isn't here, it doesn't exist for me.
> Update after EVERY work session.

## 🔧 Active Projects

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
