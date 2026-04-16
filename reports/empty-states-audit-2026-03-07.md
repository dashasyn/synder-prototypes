# Synder Empty States & New User Flow Audit
**Date:** March 7, 2026 | **By:** Dasha | **For:** Ignat

---

## Executive Summary

I explored 17 pages as a brand-new user. **13 of 17 pages have problematic empty states.** Only 1 page (Transaction Reconciliation) has a well-designed empty state with illustration, CTA, and FAQ. The rest range from "no message at all" to "shows error-like text that implies user fault."

The biggest gap: **Synder assumes users already understand accounting concepts (journal lines, mapping, reconciliation, COGS).** New users from ecommerce backgrounds often don't.

---

## The Worst Offenders

### 1. Balance Reconciliation — Completely Barren
- Shows: title, one subtitle line, a "Select..." dropdown, and white space
- No illustration, no CTA, no help link, no FAQ
- User thinks: "Is this page broken? What am I supposed to select?"
- **Fix:** Add Transaction Reconciliation's pattern — illustration + "What is balance reconciliation?" FAQ + "Select an account to begin" guidance + link to setup accounts if none exist

### 2. Summaries List — Misleading Loading State
- Shows: "Import is in progress" banner + empty table with 7 filters + "Reload" button
- Import was already finished (2 completed in import log), but banner persists
- Filters visible with zero data to filter
- **Fix:** Adopt the Replit prototype pattern — progress stepper, contextual FAQ, "See imported transactions" escape hatch. Collapse filters until data exists.

### 3. Register — Filter Wall
- Shows: 7 filter dropdowns + date pickers before any context
- No explanation of what "journal lines" are vs "transactions" vs "summaries"
- **Fix:** Add a one-liner comparison: "Register shows your data as accounting journal entries. Looking for raw transactions? → Transactions list"

### 4. Sales & Expenses Reports — Filters on Empty Charts
- Shows: 5 filter controls + empty chart area + upsell banner for Business Insights
- No data message, no "connect more integrations" prompt
- **Fix:** Show sample/demo chart with a "This is what your data will look like" overlay. Or just "No sales data yet — data will appear after your first summary is synced."

### 5. Manual Journals — Error-Like Empty State
- Shows: "No matching records found. Please change your request parameters"
- User hasn't searched for anything — this implies they did something wrong
- **Fix:** Change to: "No manual journals yet. Use journal entries to adjust summary amounts for specific days. → Create your first entry"

### 6. AI Reports — Dead End
- Empty dashboard with no sample queries, no templates, no guidance
- Query input is actually an autocomplete that returns "0 results" for free text
- **Fix:** Show 3-4 sample query cards: "Total sales this month", "Top products by revenue", "Fee breakdown by integration". Click to run.

---

## Pages That Work

### Transaction Reconciliation ✅ (Best empty state)
- Illustration + clear headline + explanatory subtitle + "Start reconciling" CTA + 2 FAQ accordions
- **This should be the template for every other empty state.**

### Mapping ✅ (Good, with room to improve)
- "Review suggested mapping" banner proactively guides the user
- Table layout is clean and scannable

### Transaction Verification ✅ (Decent)
- Has a "guide" link and explains the purpose
- Could use an illustration and a more prominent CTA

---

## Systemic Issues

### 1. No Concept Introduction Anywhere
Users encounter "Summaries", "Register", "Mapping", "Groups", "Dimensions", "Reconciliation" — all domain-specific terms — with no definitions. 

**Proposal:** Add a small (?) tooltip next to each page title explaining the concept in one sentence:
- **Summaries** = "Grouped journal entries ready to sync to your accounting system"
- **Register** = "All transactions broken down into debit/credit journal lines"
- **Mapping** = "Rules that connect your sales data to the right accounts"
- **Groups** = "Advanced categorization for precise mapping control"

### 2. No "What should I do next?" Flow
After connecting an integration and importing data, users land on the Summaries list with no guidance about what to do next. The Replit prototype solved this beautifully with contextual FAQ during the loading state.

**Proposal:** After first import, show a checklist:
```
✅ Integration connected
✅ Transactions imported (4 found)
⬜ Review mapping suggestions → [Review now]
⬜ Generate your first summary → [Generate]
⬜ Sync to your books → [will unlock after above steps]
```

### 3. Inconsistent Empty State Patterns
The team clearly knows how to build good empty states (Transaction Reconciliation proves it), but the pattern isn't applied elsewhere. This should be a reusable component.

**Proposal:** Create a shared `EmptyState` component with:
- Illustration (from a small library of ~5 illustrations)
- Headline
- Subtitle (1-2 sentences)
- Primary CTA button
- Optional FAQ accordion (2-3 questions)

### 4. Sidebar Navigation is Overwhelming
17 items across 7+ categories visible from day one. New users don't need to see Revenue Recognition, Manual Journals, or Transaction Verification on their first session.

**Proposal:** Progressive sidebar — show only core items (Summaries, Transactions, Mapping, Settings) for the first week. Expand as the user completes steps. Or add a "New user" mode toggle.

### 5. "Balance: 500" Is Cryptic
This number appears on every page with no explanation. Is it transaction credits? Money? Tokens? No tooltip, no help link.

**Proposal:** Add a tooltip: "Transaction balance: 500 of 500 monthly transactions remaining." Link to billing/usage page.

---

## Priority Ranking (Impact × Effort)

| # | What | Impact | Effort | Priority |
|---|---|---|---|---|
| 1 | Reusable EmptyState component | 🔴 High | 🟡 Medium | **P0** |
| 2 | Post-import checklist (Replit prototype pattern) | 🔴 High | 🟡 Medium | **P0** |
| 3 | Concept tooltips on page titles | 🔴 High | 🟢 Low | **P1** |
| 4 | Collapse filters when table is empty | 🟡 Medium | 🟢 Low | **P1** |
| 5 | AI Reports sample query cards | 🟡 Medium | 🟢 Low | **P1** |
| 6 | Fix Manual Journals error message | 🟡 Medium | 🟢 Very Low | **P1** |
| 7 | Balance tooltip | 🟡 Medium | 🟢 Very Low | **P2** |
| 8 | Progressive sidebar | 🟡 Medium | 🔴 High | **P2** |
| 9 | "What's the difference?" links between similar pages | 🟢 Low | 🟢 Low | **P2** |

---

## Priority Ranking — Error Copy (Impact × Effort)

| # | What | Impact | Effort | Priority |
|---|---|---|---|---|
| 1 | "Update unavailable" blocker bug | 🔴 High | 🟡 Medium | **P0** |
| 2 | "Turn on auto-sync" — no explanation | 🔴 High | 🟢 Very Low | **P0** |
| 3 | Upsell copy mixed with error states | 🟡 Medium | 🟡 Medium | **P1** |
| 4 | QBO Classes warning hidden in DOM | 🟡 Medium | 🟢 Low | **P1** |
| 5 | Helper text inconsistency across tabs | 🟡 Medium | 🟢 Low | **P2** |

---

## Error Copy Catalog — Settings Page (Per-Transaction Mode)
**Date added:** March 18, 2026 | **Source:** Live browser audit, mzkt.by (Stripe) integration

---

### 🔴 Critical Bug: Settings Page Never Finishes Loading

**Error:** `"Update unavailable: wait until your settings page is loaded and try again."`
**Type:** Popover (on Update button)
**Trigger:** Clicking the Update button on any settings tab
**Where:** Every tab — General, Sales, Invoices, Products/Services, Taxes, Fees, Application Fees, Expenses, Payouts

**What's happening:** The settings page has a JS loading state that never resolves. A spinner (`fa-spinner`) is embedded in multiple form fields and the page waits for all of them to finish loading before allowing saves. In the test environment, the spinner never disappears, leaving the Update button permanently blocked.

**UX problems:**
- The message implies the *user* needs to wait — but there's nothing they can do
- "Wait until your settings page is loaded" gives no timeframe
- No retry button, no help link, no indication of what's loading
- Affects all 10+ settings tabs equally

**Suggested copy:** `"Settings are still loading. Please wait a moment and try again."` + auto-retry or loading indicator with progress

---

### General Tab

| Setting | State | Copy shown |
|---|---|---|
| Auto-import | ON | *"If you enable this setting (recommended), from now on, Synder will fetch all data from your payment/ecommerce platform. To get past data, please go to Import historical data page >>"* |
| Auto-import | OFF → affects Auto-sync | Inline label appears: **"Turn on auto-sync"** — no explanation of why it's disabled or what to do |
| Auto-sync | OFF (blocked) | *"If enabled (recommended), from now on, all new transactions will be synced to your books automatically. If you disable Auto-import setting, Auto-sync won't work."* |
| Skip synchronization of duplicated transactions | ON | *"If enabled, the already existing transactions in your company will be skipped in the synchronization."* |
| Process transactions in multiple currencies | ON | *"If disabled, Synder will only sync transactions matching your accounting platform home currency. Other transactions will be skipped."* |
| Archive Pending transactions after set number of days | OFF | *"If enabled, Synder will automatically archive transactions that remain in Pending status for longer than the specified number of days."* |
| Apply location | OFF | **"Upgrade to use"** (upsell inline, no plan name mentioned) + *"It is an option to assign a location to each transaction."* |
| Sync payments without invoices as | — | *"Use this setting to post your Stripe payments not linked to invoices as Deposits or Sales Receipts. You can then apply deposits to invoices manually. Learn more >>"* |
| Balance Reserve account | — | *"Stripe reserves are funds that Stripe withholds/returns from/to a seller's payouts for various reasons. Learn more >>"* |

**Issues:**
- "Turn on auto-sync" appears when Auto-import is OFF — but there's no explanation. User doesn't know why it's disabled or that Auto-import being OFF is the cause.
- "Upgrade to use" on Apply location gives no plan name. Which plan? How much?

---

### Sales Tab

| Setting | State | Copy shown |
|---|---|---|
| Clearing account | Required | *"Clearing account represents the payment processor in your books. All synced transactions will be deposited here. Learn more >>"* |
| Payment Method | — | *"This Payment Method will be set for QuickBooks Sales Receipts, Refund Receipts, Payments and Expenses."* |
| Enable QuickBooks Doc Numbers | OFF | *"By enabling this configuration your transactions will follow the standard QuickBooks Doc Number sequence."* |
| Apply generic customer | OFF | *"It is an option to assign a generic customer instead of sending over each customer on sales transaction individually."* |
| Generic customer | — (shown when toggle ON) | *"If the generic customer setting is 'ON', choose or type in a name to be used. All of your transactions will be synchronized under the default customer name."* |
| Applied Balance Account | — | *"Used to record Stripe customer applied balances when they reduce an invoice or payment total. Synder uses this account to create and map the 'Stripe applied balance' product."* |
| Discount product account | — | *"Select an account from the books that will be used when creating a new discount product."* |
| Sync discounts as products | OFF | *"Any discount will be synced as an additional product with default 'Stripe discount' name or discount name from the integration (if any)."* |

---

### Invoices Tab

| Setting | State | Copy shown |
|---|---|---|
| Apply payments to unpaid Invoice/Bill transactions | OFF | *"Payment will be applied to the matching unpaid Invoice/Bill transaction."* |
| Cancel sync if there is no matching open invoice found for a payment | OFF | *"If you enable this setting, Synder will search across the existing invoices in your books and if the matching invoice doesn't exist, it will cancel synchronization."* |
| Sync unpaid (open) invoices | OFF | *"This setting allows you to sync open invoices with your accounting system. Once received, the payment will be automatically attached to the corresponding invoice and the invoice will be marked as paid. Learn more >>"* |
| Sync zero invoices | OFF | *"Enable this setting to import and sync invoices where all line amounts are 0 and the totals are 0. Learn more >>"* |

---

### Products/Services Tab

| Setting | State | Copy shown |
|---|---|---|
| Record transactions with | Original / Common | (no help text) |
| If matching product NOT found | Create new / Cancel sync | (no help text) |
| Created product type | Non-inventory / Service / Inventory | (no help text) |
| Inventory management | OFF | *"You can configure the application to create inventory products in your books. Synder will create a new inventory product if no product with the same name exists."* |
| Income account | — | *"Track the sales of the inventory product on this account."* |
| Inventory Asset account | — | *"This account will be used to track the cost of purchased products."* |
| Cost of goods sold account | — | *"Cost of inventory items will be tracked on this account."* |
| Inventory adjustment account | — | *"This account will be used to adjust inventory in case of shrinkage or different write-offs."* |
| Inventory start date | — | *"Select the inventory start date that Synder will use when creating the new inventory product. Please note that posting sales of inventory products, which occurred before the inventory start date, may lead to incorrect inventory values."* |
| Initial Quantity on Hand | — | *"Select the initial Quantity on Hand that Synder will use when creating the new inventory product."* |
| Get product name from a description | OFF | *"When 'ON', Synder will be taking a product name from a description of transaction or order."* |

---

### Product Mapping Tab

**Upsell block — entire tab locked:**

> *"This feature is available on higher plans. Upgrade plan"*

**Type:** Inline upsell, blocks entire tab
**UX problems:**
- No plan name mentioned — "higher plans" is vague
- No price comparison, no CTA to view plans
- The tab is accessible but its content is hidden behind this message
- Inconsistent with Apply location upsell which just says "Upgrade to use"

---

### Taxes Tab

| Setting | State | Copy shown |
|---|---|---|
| Apply Taxes | ON | *"Tax details of your transactions will be recorded as an additional product line in QuickBooks."* |
| Apply generic tax code | OFF | (no help text) |
| Default tax code | — | (no help text) |

**Hidden warning (in DOM, not visible in normal flow):**

> *"Warning: The classes feature is enabled in QuickBooks, however, there are no actual classes found in your QuickBooks company. Please create the required classes in QuickBooks to proceed."*

**Type:** Inline warning (hidden in DOM, surfaced when QBO classes are missing)
**UX problems:**
- Message is buried — users may never see it if it doesn't surface
- Tells user to "go to QuickBooks and create classes" — no link, no instructions
- Uses "classes" without explaining what that means in QBO context

---

### Fees Tab

| Setting | Copy shown |
|---|---|
| Clearing account | *"Clearing account represents the payment processor in your books. All synced transactions will be deposited here. Learn more >>"* |
| Vendor | *"App will use this QuickBooks Vendor for Stripe fees. Select available vendor or type new one."* |
| Category | *"Stripe fees are considered an expense. Please, specify a category to which Stripe fees will be applied."* |

---

### Application Fees Tab

| Setting | Copy shown |
|---|---|
| Clearing account | *"Clearing account represents the payment processor in your books. All synced transactions will be deposited here. Learn more >>"* |
| Category | *"Stripe application fees are considered an expense. Please, specify a category to which Stripe application fees will be applied."* |

---

### Expenses Tab

| Setting | Copy shown |
|---|---|
| Clearing account | *"Clearing account represents the payment processor in your books. All synced transactions will be deposited here. Learn more >>*" |
| Category | *"It specifies the category to which Stripe expenses are applied."* |
| Generic Vendor | OFF | *"Enable this option to assign a generic vendor to each transaction instead of sending over each vendor on expense transaction individually. (E.g. Vendor name: Stripe)"* |
| Generic Vendor Name | — | *"Choose or type in a name to be used. All of your transactions will be synchronized under the generic vendor name."* |

---

### Payouts Tab

| Setting | State | Copy shown |
|---|---|---|
| Process payouts | ON | *"If 'No' app won't receive and synchronize payouts."* |
| Transfer Funds To | — | *"App will transfer funds from sales bank account to this one for payout transactions."* |

**Issue:** Toggle label says "Process payouts" but help text says "If 'No' app won't receive..." — the toggle state is ON/OFF but the help text refers to "Yes/No". Inconsistent.

---

### Multicurrency Tab

No settings visible — empty tab in this configuration.

---

## Copy Consistency Issues Found

1. **"App will use..." vs "Synder will..."** — Fees tab says "App will use this QuickBooks Vendor" while other tabs say "Synder will...". Same product, different voice.

2. **Toggle states described as Yes/No in help text** — Payouts says "If 'No' app won't..." but the toggle shows On/Off. Mismatch.

3. **"Upgrade to use" vs "This feature is available on higher plans"** — Two different upsell messages for the same concept (plan gating). Apply location uses one, Product mapping uses another.

4. **"Learn more >>" links** — Present on some fields (Clearing account, Sync payments without invoices), absent on similar fields. No consistent rule for when to include them.

5. **Generic/ambiguous help text** — Several fields have no help text at all (Record transactions with, If matching product NOT found, Created product type). Others have very detailed multi-sentence explanations. No consistent depth.

6. **"Please go to Import historical data page >>"** — Inline link in a help block. Unusual pattern — other fields link with "Learn more >>" not "please go to X page >>".

---

## Screenshots Reference
All screenshots saved to:
- `workspace/explore-*.png` — empty states audit
- `workspace/.synder-state/error-audit/tab-*.png` — settings tab defaults
- `workspace/.synder-state/error-audit/err-*.png` — triggered error states
