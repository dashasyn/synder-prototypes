# TOOLS.md - Local Notes

## Synder Product Overview

**What Synder is:** AI-driven accounting infrastructure for retail, ecommerce, and SaaS businesses. Connects 30+ sales platforms to accounting systems (QuickBooks, Xero, Sage Intacct, NetSuite).

### Three Core Products

1. **Synder Sync** — Automated multi-channel sales transaction bookkeeping
   - Syncs sales, fees, taxes, refunds from 30+ platforms
   - Daily/hourly import frequency depending on plan
   - Reconciliation, COGS tracking, inventory tracking
   - URL: synder.com/industry/syndersync/

2. **Synder RevRec** — GAAP/ASC 606 revenue recognition for subscriptions
   - Stripe integration + Excel imports
   - Tracks upgrades, downgrades, cancellations, prorations
   - Waterfall reports (by month/customer)
   - Multicurrency support
   - URL: synder.com/industry/revenue-recognition/

3. **Synder Insights** — Business intelligence dashboards
   - Cross-platform KPI tracking
   - Sales analytics, product reports, customer cohorts
   - Daily/weekly email notifications
   - URL: synder.com/industry/business-insights/

### Integrations
- **Accounting:** QuickBooks Online/Desktop, Xero, Sage Intacct, NetSuite, Custom ERP
- **Sales/Payment:** Stripe, PayPal, Shopify, Amazon, eBay, Walmart, Etsy, WooCommerce, Wix, Square, BigCommerce, Clover, TikTok, Faire, Ecwid, ShipStation, Squarespace, Magento + more

### Pricing Tiers (Sync)
- **Starter:** Up to 500 txns/mo, 2 integration slots, daily import, basic support
- **Medium:** 500–3K txns/mo, unlimited integrations, hourly import
- **Scale:** 3K–50K txns/mo, hourly, Sage Intacct/NetSuite access
- **Enterprise:** 50K+ txns/mo, unlimited everything, Slack support, custom dev

### Target Audiences
- Ecommerce businesses (multi-channel sellers)
- SaaS companies (subscription revenue)
- Accounting firms (managing multiple clients)
- Health & wellness, retail, consumer goods

### Key Value Props
- Save 40+ hours/month on reconciliation
- 95% time saved on manual reconciliation
- SOC 2 Type 2, GDPR, HIPAA, CCPA compliant
- "No human in the loop" — fully automated

## Copy Vocabulary
- **Canonical reference:** `vocabulary.md` in workspace root
- Key terms: Integration (not "payment platform"), Books (not "accounting platform"), Enable/Disable (not "turn on/off"), Sync (not "post"), Import (not "fetch"), Higher plan (in upsells), Click (not "press")

## Figma Design System
- **UI Kit:** `tSZzqtd28HCrnaY0Ku0Y6z` — Synder's React component library (Modified Material Design)
- **Pages:** Colors, Typography, Buttons, Select/Input, Alerts, Checkbox, Radio, Toggle, Popup, Table, Tabs, Toast, Tooltip, Sidebar, Icons, Box, Menu, Status_and_chips, Settings, Page elements, Link, Drag_and_drop, General rules, How_to
- **CSS tokens file:** `skills/synder-explorer/references/synder-design-tokens.css`
- **Font:** Roboto (all weights: 300–700), NOT Inter
- **Primary blue:** #0053CC — rgb(0, 83, 204) — NOT Material blue 700
- **Marketing site:** Poppins + different palette — separate system
- **Figma token:** paid seat token (higher rate limits), cached wrapper at `scripts/figma-fetch.sh`
- **Cache:** `.figma-cache/` — styles & nodes cached 24h+, avoid redundant calls
- **⚠️ MINIMIZE API CALLS** — Figma tokens are expensive. Always check cache first, batch requests, avoid repeated fetches for the same nodes.

## UX-Relevant Notes
- Multi-step onboarding: Connect → Import → Reconcile
- Complex pricing page with plan comparison matrix
- Multiple product lines = potential navigation confusion
- Heavy integration setup flows (30+ platforms)
- Dashboard-heavy UI (Insights product)
- Subscription management complexity (RevRec)

## GitHub Hub
- **Prototypes & reports:** https://dashasyn.github.io/synder-prototypes/
- All published HTML reports/audits live here

## Access
- **GitHub token:** stored in `.github-token`
- **Figma API token:** stored in `.figma-token`
- **Synder demo app:** credentials in `.synder-creds` (demo.synderapp.com)
- **LogRocket (session replay & analytics) ✅ CONNECTED**
  - App ID: `vn4kxj/synder_test`
  - API Key: `vn4kxj:synder_test:gy2Tjqcc5zYlbpCh88po`
  - **Galileo AI API** (primary): `POST https://api.logrocket.com/v1/orgs/vn4kxj/apps/synder_test/ask-galileo/`
    - Auth: `Authorization: Token <api_key>`
    - Body: `{"message": "...", "chatID": "..."}` (chatID optional for follow-ups)
    - Async: send query, wait ~15-30s, then send a follow-up in same chatID to get results
    - DO NOT poll with "continue" or "." — causes infinite plan loops
  - **MCP**: configured in mcporter as `logrocket` (OAuth token, 24h expiry)
  - Users identified by **userID**, NOT email
  - Dashboard: `https://app.logrocket.com/vn4kxj/synder_test/sessions`
- **Figma files:**
  - Daily Summary page: `https://www.figma.com/design/4Vomaa8Hihs79IUBC2AZCw/Daily_summary?node-id=12572-94852`

## Jira & Confluence
- **Site:** cloudbusinessllc.atlassian.net
- **Auth:** Classic API token, Basic auth (creds in `.atlassian-creds`)
- **⚠️ READ ONLY** — never create, edit, or delete anything. Ask Ignat for changes.
- **Jira projects:** DIS (Product Discovery), SET (Engineering), SD (Synder), QB (QA board), KB (Knowledge Base), AIS (AI Sandbox), MT (Marketing), SB (Synder Billing), SR (Synder Refunds), CS (Complaints & Suggestions), CP (Consultation Panel), IMPL (Consultation), DR (Donor CRM)
- **Confluence:** Full read access to all spaces
- **Helper:** `scripts/jira-fetch.sh` / `scripts/confluence-fetch.sh` (TODO: build cached wrappers like figma-fetch.sh)

## Communication
- Primary channel: Telegram
- Telegram formatting: bold, italic, code, links OK. No markdown tables — use bullet lists.
