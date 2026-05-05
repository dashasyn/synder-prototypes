# MEMORY.md - Long-Term Memory

## Who I Am
- **Dasha** — UX research assistant for Ignat
- Role: find friction, inconsistencies, and drift in Synder's product UX

## Who Ignat Is
- UI/UX Designer at synder.com (fintech/accounting platform)
- Timezone: Europe/Vilnius (UTC+2/+3)
- Primary channel: Telegram
- Practical — wants actionable findings, not vague observations
- Preference: don't ask permission for restarts/config changes, just do it

## My Tasks
1. Weekly Friction Summary (stuck points, rage clicks, drop-offs, loops)
2. Flow Deviation Detector (intended vs actual user paths)
3. Feature Usage Snapshot (usage/completion rates, drop-off points, MoM changes)
4. Design Drift Checker (Figma vs production)
5. UX Consistency Guardian (terminology, styles, naming, empty/error states)

## Synder Architecture Rules
- **One org = one accounting platform.** Users cannot switch accounting platforms (QBO/Xero/Sage/NetSuite) within an org. To change platforms, they must create a new organization.
- **No multi-platform users.** Each user is locked to one accounting system. Don't design or suggest features around "platform migration" or "switching" scenarios.

## Synder Product Knowledge
- **Three products:** Synder Sync (multi-channel sales bookkeeping), RevRec (GAAP/ASC 606 subscription revenue recognition), Insights (BI dashboards & KPIs)
- **Integrations:** 30+ sales platforms → QuickBooks, Xero, Sage Intacct, NetSuite
- **Target users:** Ecommerce sellers, SaaS companies, accounting firms
- **4 pricing tiers:** Starter / Medium / Scale / Enterprise
- **Key UX areas to watch:** Onboarding (Connect → Import → Reconcile), pricing page complexity, integration setup flows, dashboard-heavy Insights UI, multi-product navigation

## Setup Status
- **Model:** Claude Opus 4.6, fallback Sonnet 4.6
- **Auto-updates:** stable channel, enabled
- **Telegram:** configured (bot token set, allowlist: Ignat)
- **Browser automation:** Working via Playwright skill (synder-explorer), Chromium snap, headless
- **Synder access:** demo.synderapp.com, credentials in `.synder-creds`
  - **Main org: `Dasha Test Company`** — active subscription, balance: 1000 syncs
  - Integrations: Shopify (Changolivia) + Stripe (mzkt.by)
  - Transactions: Jan–Mar 2026
  - Old org `Test_onboarding_no_transactions` — expired trial, ignore
- **Figma API token:** stored in `.figma-token`
- **LogRocket:** Connected (API key in TOOLS.md)

## UX Tools Server
- Built a permanent UX tools hub at `reports/index.html` with Node.js server + Cloudflare tunnel
- Server: `reports/server.js` (pure Node.js HTTP, no Express) on port 8080
- API: POST/GET `/api/save|load|export/{reportId}` — saves approved copy to `reports/data/`
- Tunnel: `/tmp/cloudflared tunnel --url http://127.0.0.1:8080` (quick tunnel, URL changes on restart)
- Start both with `setsid` to survive shell session closes
- **Need:** Permanent URL — either named CF tunnel or open firewall (needs sudo)

## Persona Review Workflow
- **Trigger:** "Check this idea [link/description]. Focus on [copy/steps/trust/etc.]"
- **No prompt needed** — I run the full 6-persona workflow automatically in Telegram
- **Workflow page:** https://dashasyn.github.io/synder-prototypes/personas/workflow.html
- **Personas page:** https://dashasyn.github.io/synder-prototypes/personas/
- **Steps:** (1) Context framing → (2) 5 personas critique → (3) Cross-agent signals → (4) Alex synthesis → (5) STOP for approval → (6) Apply changes → (7) Validation (max 2 iterations)
- **Anti-overcritique rules:** max 3 issues per persona, only high-impact, always say what works, confidence levels required, acceptable to say "no major issues"
- **Personas:** Sarah (accountant), Mike (biz owner), Viktor (UX), James (CFO), Priya (support), Alex (synthesis — runs last)
- **Output structure:** Critical / Important / Ignore · Quick wins / Structural / Complex · Effort + Confidence per item

## Reports Created
- `reports/per-transaction-audit.html` — main audit (copy + errors + LogRocket + editable approved columns)
- `reports/copy-generator.html` — interactive copy generator with rules, AI prompt, history
- `reports/error-copy-audit.html` — standalone error catalog
- `reports/index.html` — UX tools dashboard

## Workflow
- **ALWAYS read `PROJECTS.md` at session start** — it's the master registry of all projects and tools
- **ALWAYS update `PROJECTS.md` after building or modifying anything** — if it's not there, it doesn't exist next session
- **ALWAYS write daily log to `memory/YYYY-MM-DD.md`** before session ends
- Lost the transport scheme builder (March 2026) because it wasn't saved — never again
- End-of-day protocol: Ignat says "finish" → update PROJECTS.md + daily log
- Next day: Ignat says "continue [project]" → read PROJECTS.md, pick up

## Side Projects
- **Transit Scheme Builder** — Ignat's personal project to redesign Minsk bus stop info posters
  - London TfL spider map style, two-color system (yellow bus / teal trolleybus)
  - Web tool at `projects/scheme-builder/index.html`
  - Served via reports server + Cloudflare tunnel
  - As of 2026-03-19: v2.3, vertical trunk layout with rounded branch connectors working

- **Grunddatenversorgung (Transit Data Manager)** — Transport Information Management System prototype
  - **URL:** https://dashasyn.github.io/synder-prototypes/projects/grunddatenversorgung/
  - **Location:** `projects/grunddatenversorgung/index.html`
  - **Features:** 4 screens (Fahrplansuche, Export Overview, Station Config with Basic Rules + Stations tabs, Route Planner)
  - **Theme:** White with blue buttons (#0053CC)
  - **Built:** 2025-05-05 — Complete with audio players, display configs, rule management
  - **Backup:** `index-backup-20260505-1239.html` saved in same folder

## GitHub Hub
- **Prototypes & published reports:** https://dashasyn.github.io/synder-prototypes/
- This is where all HTML audit reports and prototypes are hosted

## Onboarding Flow Knowledge (2026-03-29)
- **3 distinct paths, not 6:** Business, Firm, Other (=Firm+freetext)
- 67% of role options (4/6) funnel to identical Business flow — simplification opportunity
- **Org = one accounting platform forever** — users can't switch QBO↔Xero within an org, must create new org
- Hidden Revenue field appears conditionally (Business Owner only, after Industry + Duration filled)
- Industry field is react-select multi-select with `#clickableInput` — Escape key undoes selection (bot blocker)
- Staff Accountant gets Business flow (questionable — they're at firms)
- "Other" gets Firm flow (questionable — might be business owners)
- **Bot-friendliness: 3/10** — 12 blocking elements documented
- Report: `reports/onboarding-deep-dive/index.html`

## Lessons & Preferences
- **Minimize Figma API calls** — always use cache, batch node IDs, reuse cached PNG renders. Never re-fetch the same nodes. (See `memory/feedback_figma_tokens.md`)
- Always restart gateway after config changes — don't ask
- Don't assume platform switching is possible — org is locked to one accounting platform
- Never save browser storage state after a failed login — only after confirming dashboard URL
- Always backup storage-state.json before login attempts
- When testing Synder settings toggles: errors appear inline on toggle, NOT on save. Don't need to click Update.
- The "Update unavailable" popover fires on every toggle in headless Chromium — it's a real bug (29 hidden spinners never resolve)
- Use `setsid` for truly daemonized background processes (nohup still dies with shell session in exec tool)
