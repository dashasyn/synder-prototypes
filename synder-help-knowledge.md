# Synder Product Knowledge Base
**Built by:** Dasha (UX Research Assistant)  
**Source:** Synder Help Center (synder.com/help) — ~55 articles crawled  
**Coverage:** Getting Started, Sync Modes, Reconciliation, Smart Rules, Summary, Platform-Specific  

---

## 1. Core Concepts

### Sync Modes (the foundational choice)

Synder offers **two mutually exclusive sync modes**. Users pick one during onboarding and everything else (settings UI, reconciliation flow, available features) adapts to that choice.

#### Per-Transaction Sync (a.k.a. "Per Transaction Mode")
- Each payment, refund, fee, and payout syncs as a **separate document** in QuickBooks/Xero
- Sales Receipts, Refund Receipts, Expenses, and Transfers are created individually
- Best for: businesses needing full transaction-level detail, matching to customer records, or applying payments to open invoices
- Enables **Smart Reconciliation** (payment-to-order matching)
- Higher document volume in accounting software (can stress QBO API limits)

#### Summary Sync (a.k.a. "Summary Mode")
- Transactions are **aggregated** into periodic journal entries (daily, per-payout, monthly, or custom)
- Produces Journal Entries in QBO/Xero rather than individual Sales Receipts
- Best for: high-volume sellers who don't need per-customer detail in their books
- Requires **Mapping Groups** to categorize how different transaction types hit accounts
- Does NOT support Smart Reconciliation
- Supports COGS tracking (Summary-specific feature)
- "Close-Ready Summaries" feature provides aggregated view with drilldowns for month-end close

### Clearing Accounts
The **most critical architectural concept** in Synder — misunderstanding this causes most reconciliation failures.

- A **clearing account** is a temporary liability/asset account (NOT your bank account) where transactions are staged before being cleared by a payout
- Sales, refunds, and fees post to the clearing account → the payout transfer moves money from clearing to your checking account → the clearing account nets to zero
- Each payment platform should have its own clearing account
- **Common user error:** setting the clearing account to the actual bank/checking account — this causes everything to double-post

### Transaction Types
Synder syncs the following transaction types from payment platforms:
- **Sales / Payments** — revenue-generating transactions
- **Refunds** — money returned to customers
- **Fees** — processing fees charged by the platform
- **Payouts** — bulk transfers from processor to bank (clears the clearing account)
- **Expenses** — non-sale charges
- **Adjustments** — platform-generated adjustments (e.g., dispute/chargeback entries, reserve movements)
- **Application Fees** — charges when third-party apps process payments on your platform
- **Transfers** — internal money movement between accounts

**Disputes/Chargebacks** create Adjustment transactions:
- When a dispute is initiated: an Expense is created (money leaves the merchant)
- If merchant wins: a Deposit is created (money returns)
- Stripe charges $15 for reviewing disputes, covered by the merchant

### Import vs. Sync (two distinct steps)
1. **Import** — pulls transactions from the payment platform into Synder's internal ledger (does NOT touch your accounting software)
2. **Sync** — pushes imported transactions to your accounting software (QBO, Xero, etc.)

Auto-import and auto-sync can be toggled independently. Both can be turned off for full manual control.

### Transaction Statuses (Per-Transaction Mode)
- **Pending** — transaction arrived from platform, not yet imported
- **Ready to Sync** — imported, awaiting sync to accounting
- **Synced** — successfully pushed to accounting software
- **Failed** — sync attempted but encountered an error
- **Canceled** — sync was canceled (due to settings, duplicate, or manual action)
- **Skipped** — intentionally not synced (e.g., duplicate detected, out of date range)
- **Deleted** — removed from Synder
- **Archived** — hidden from view (recoverable by support)

"Explain" link appears under each status — tells users the specific reason for non-sync states.

### Rollback
Critical recovery mechanism. Rolls back a synced transaction from accounting software back to "Ready to Sync" status in Synder without permanently deleting it. Used before correcting settings and re-syncing. **Rule:** never manually edit synced transactions in QBO/Xero — always rollback in Synder first.

---

## 2. Key User Flows

### Onboarding Flow
1. **Sign up** → verify email
2. **Tell us about you** (business type, size)
3. **Select Synder product(s):** Synder Sync, Business Insights, or both
4. **Provide business details** (company name, timezone)
5. **Select ecommerce/payment platforms** to integrate
6. **Choose accounting platform** (QBO, Xero, Sage Intacct, NetSuite)
7. **Connect accounting platform** (OAuth for QBO/Xero; credentials for Sage Intacct)
8. **Connect payment/ecommerce platforms** (OAuth or API keys)
9. **Choose sync mode** (Summary or Per-Transaction)
10. **Configure settings** (accounts, clearing accounts, product mapping, taxes)
11. **Run settings checklist** before first sync
12. **Historical import** (optional — import past transactions)
13. **First sync** (manual, then enable auto-sync)

**Sage Intacct onboarding** is significantly more complex:
- Must enable Web Services in Sage Intacct
- Must authorize Synder's Sender ID (`cloudbusinesshqMPP`)
- Must create a dedicated Web Services user with GL Read/Write role
- Then provide Company ID, User ID, password to Synder

### Connecting a Payment Platform
1. Go to **Settings** → select integration
2. Click **Connect** (triggers OAuth or API key flow)
3. Authorize Synder access in the platform's UI
4. Return to Synder, verify connection is green
5. Configure integration-specific settings (see per-platform below)

Reconnection: OAuth tokens expire periodically. When they do, auto-sync stops silently. Users must go to Organization Settings → re-authorize.

### Settings Configuration (Pre-Sync Checklist)
Key settings to configure before first sync:
- **Clearing account** — must be set for every connected platform
- **Checking account** (for payouts) — where payouts land
- **Product/service settings** — how to handle new products (auto-create vs. cancel)
- **Tax settings** — US automated tax vs. manual tax rates
- **Customer name source** — which field provides customer name
- **Invoice matching** — whether to match payments to open invoices
- **Multicurrency** — if selling internationally

Settings are organized per-integration (e.g., Stripe settings are separate from Shopify settings).

### Running a Sync
**Manual sync:**
1. Go to **Platform Transactions** (left nav)
2. Select transactions (checkbox)
3. Click **Actions** → **Sync**

**Auto-sync:**
1. Enable **Auto-Import** toggle (General settings)
2. Enable **Auto-Sync** toggle (General settings)
3. Transactions auto-flow from platform → Synder → accounting

**Historical sync:**
1. Go to Platform Transactions
2. Click **Import Historical**
3. Set date range
4. Click Import

### Reconciling (Per-Transaction Mode)
Core flow:
1. All sales, fees, refunds sync to the **clearing account** in accounting
2. Payouts sync as transfers: clearing → checking account
3. Clearing account should net to **zero** (or match the current processor balance)
4. In QBO: go to **Banking** → match transactions → run reconciliation wizard
5. If clearing doesn't zero: check for unsynced transactions, failed syncs, or missing payouts

Per-platform reconciliation guides exist for: Stripe, Shopify, PayPal, Amazon, Walmart USA, Walmart Canada, WooCommerce, Afterpay, Faire, Authorize.Net.

### Reconciling (Summary Mode)
Core flow:
1. Each summary period produces **Journal Entries** in accounting
2. Clearing account should match platform's ending balance for the same period
3. Compare: Synder's clearing account balance vs. platform's report (e.g., Amazon's Custom Unified Transactions report)
4. Discrepancies: check for failed/canceled summaries, unsupported transaction types, timezone mismatches
5. Deep dive: use Excel VLOOKUP to match transaction IDs between platform and accounting reports

**Close-Ready Summaries** feature:
- **Aggregated view**: roll-up by Account or Description — shows debits, credits, grand total for sanity check before posting
- **Clickable drilldowns**: click any amount to see individual transactions behind it (date, processor ID, type, amount)
- Useful for month-end close validation

### Smart Rules Flow
Smart Rules are conditional automation rules that modify how transactions are synced to accounting.

Structure: **Trigger** → **Condition** → **Action**

Creating a rule:
1. Go to **Smart Rules** (left nav) → **Rules**
2. Click **Create Rule** (may require "Start rule trial" for first-time users)
3. Set **Trigger**: entity created event (e.g., Expense created, Deposit created, Sales Receipt created)
4. Set **Condition**: check a field (e.g., Line Description contains "chargeback")
5. Set **Action**: what to change (e.g., Update line → Set category to specific account)

Example use cases:
- Route disputes/chargebacks to a dedicated expense account
- Change descriptions on synced transactions
- Update products in Sales Receipts based on metadata
- Assign different accounts based on transaction source
- Fix revenue recognition line items

Note: Two separate rules are needed for chargebacks (one for Expense lines, one for Deposit lines) due to QBO API structure.

Rules can be rolled back and re-synced: rollback affected transactions → rules update → re-sync.

### Switching Sync Modes
Switching is possible but requires care:
- Rollback all synced transactions in the current mode first (or accept the mix)
- Change mode in settings
- Reconfigure mappings (Summary mode needs Mapping Groups; Per-Transaction needs account mappings)
- Re-sync historical data if needed

There is no automatic migration; users must plan for the cutover date.

---

## 3. Product Architecture

### Summary Mode Deep Dive

#### Aggregation Periods
Four modes for grouping transactions into summaries:
1. **Daily** — one summary per calendar day per platform
2. **Per Payout** — one summary per payout event (aligns with bank deposits)
3. **Monthly** — one summary per calendar month (reduces journal entry volume)
4. **Custom/Manual** — user-defined periods

When to use which:
- Per Payout: ideal for Stripe users wanting easy bank reconciliation
- Daily: good for high-volume sellers needing day-level visibility
- Monthly: best for low-volume or accounting-period-aligned businesses
- Custom: edge cases (fiscal periods, special reporting)

#### Mapping Groups
The system that determines which transactions go to which accounts in Summary mode.

- A **mapping group** is a filter rule that says "transactions matching these conditions → post to this account"
- Default groups exist for: Sales, Refunds, Fees, Payouts, Taxes, Discounts, Shipping, etc.
- Custom groups can be created with conditions (platform, transaction type, description, product, etc.)
- Groups have **priority order** — if a transaction matches multiple groups, highest priority wins
- After changing groups, existing summaries must be **Rebuilt** to apply the new grouping

Rebuilding summaries:
- Go to Summaries list → select summaries → click **Rebuild**
- Rebuild applies current group rules + current settings to the selected summaries
- Does NOT keep old grouping logic — fully regenerates

#### COGS Tracking (Summary Mode only)
1. Enable COGS tracking in Settings → Products and Services
2. Review detected products (auto-detected from previous syncs)
3. Add costs per product (individually or bulk CSV import/export)
4. Mark products as **Verified**
5. Map COGS accounts in Mapping (Cost of Goods Sold, Inventory Assets)
6. Summaries with unverified products get "Attention Required" status and won't sync until verified

Product verification gate: optional setting "Disable sync for summaries with unverified products" — useful to ensure COGS data is complete before posting.

#### Summary Statuses
- **Ready** — generated, awaiting sync
- **Synced** — pushed to accounting
- **Partially Synced** — some transactions within the summary failed
- **Attention Required** — blocked due to unverified products or formation issues
- **Error** — there was a problem forming the summary

### Per-Transaction Mode Deep Dive

#### Document Types Created in QBO/Xero
- **Sales Receipt** — for one-time payments (no invoice)
- **Invoice + Payment** — when Synder matches a payment to an open invoice
- **Refund Receipt** — for refunds to customers
- **Expense** — for fees, chargebacks, costs
- **Deposit** — for chargeback reversals, reserve releases
- **Transfer** — for payouts (clearing → checking)
- **Journal Entry** — used for some revenue recognition entries

#### Smart Reconciliation
- Feature that **enriches payment records** with order details from ecommerce platforms
- Without it: syncs just the payment amount + date
- With it: syncs products, taxes, shipping, discounts, customer info from the matched order
- Matches payments to orders across platforms (e.g., Stripe payment → Shopify order)
- Available only in Per-Transaction mode
- Not available in Summary mode
- Supported e-commerce platforms: Shopify, WooCommerce, BigCommerce, eBay, Ecwid, Wix, Squarespace
- Supported payment processors (varies by e-commerce platform): Stripe, PayPal, Square, Authorize.net, Braintree, Affirm, Afterpay

#### Product Handling
Settings for how products are resolved during sync:
- **Record with original product name** — matches existing products by name/SKU, creates new if not found
- **Record with common name** — always uses a standardized product name
- **Product search priority** — whether to search by SKU first or name first
- **If matching product not found** — either auto-create a new product OR cancel the sync
- **Product mapping** — explicit table mapping platform product names → accounting product names (bypasses name-matching entirely)

Inventory items: Synder cannot create inventory items in QBO (requires Quantity on Hand data it doesn't have). Only syncs to existing inventory items.

### Payout Architecture
How money flows through Synder's accounting model:

```
Customer Payment
       ↓
[Clearing Account] ← Sales Receipts, Fees, Refunds post here
       ↓
  Payout Event (bulk transfer from processor to bank)
       ↓
[Checking/Bank Account] ← Transfer moves funds here
```

The clearing account should zero out when all payouts are synced. Running balance in the clearing account = undeposited funds currently held by the payment processor.

### Auto-Sync Safety Mechanisms
Synder has automatic safeguards:
- **Auto-disables auto-sync** after consecutive failures (prevents large backlogs)
- **Skip duplicates** setting prevents re-syncing already-synced transactions
- **Archive pending transactions** automatically removes Stripe pending transactions that never finalize
- **Plan migration lock**: when upgrading to certain plans, auto-sync is locked until onboarding call with CSM

### Multicurrency Support
- Synder does not convert currencies — it passes exchange rates from the payment processor to the accounting software
- QBO requires separate customer records per currency (QBO limitation, not Synder bug)
- Payout accounts may need to be separate per currency (e.g., USD checking vs. EUR checking)
- Multicurrency must be enabled in QBO before multi-currency transactions can sync

---

## 4. Common Issues & Error Patterns

### Product & Service Errors (Most Frequent)
**"Entity cannot be synchronized without Product or Service"**
- Most common first-sync error for new users
- Two causes: (1) auto-create failed due to special characters in product name, (2) "Cancel if no product found" setting is on
- Fix: set up product mapping, or create the product manually in QBO/Xero with a clean name

**"No matching product found in accounting"**
- Name mismatch between platform and accounting
- Common with multi-platform sellers (Shopify product name ≠ QBO product name)
- Fix: product mapping table, or ensure exact name match

**Auto-created product in wrong income account**
- Synder creates a product and assigns default income account from settings
- Fix: change income account on the product in QBO/Xero, or set up product mapping beforehand

### Auto-Sync Pausing (Very Common)
Seven causes documented:
1. **Mapping conflicts** — unmapped products, taxes, accounts
2. **Accounting software disconnection** — OAuth expired
3. **Payment platform disconnection** — OAuth expired
4. **API rate limits** — too many requests (QBO limits: ~500/minute)
5. **Account renamed/deleted** — target account no longer exists in QBO/Xero
6. **Insufficient Summary mappings** — single missing mapping blocks all Summary syncs
7. **Plan migration lock** — requires CSM onboarding call to re-enable

Signs of paused sync:
- Transactions stuck in "Ready to Sync"
- Failed/Canceled status in Platform Transactions list
- Email notification from Synder

### Reconciliation Failures (Clearing Account Doesn't Zero)
Common causes:
- Payout sync disabled (clearing never gets cleared)
- Missing transactions (platform was disconnected during a period)
- Using checking account as clearing account (double-posting)
- Timezone mismatch between platform and Synder
- Partially synced summaries (Amazon delayed data, especially)
- Unsupported transaction types not being synced

### Summary-Specific Issues
**"Partially synced summary"**
- Summary generated before all transactions arrived (Amazon delayed data is #1 cause)
- Not a bug — expected behavior for Amazon
- Fix: wait for data, re-sync

**"There's been a problem with proper forming of some of your E-commerce summaries"**
- Banner appears when summaries couldn't be formed correctly
- Follow guided steps in the article to identify and fix affected summaries

**"Attention Required" on summaries**
- Triggered by unverified products (COGS feature) or formation issues
- Won't sync until resolved

**Summary and transaction dates differ**
- Webhooks deliver transactions asynchronously; summary date reflects when it was formed, not when transactions occurred
- Doesn't affect accounting accuracy

### Invoice & Customer Matching Errors
**"Customer name is different in Invoice and Payment"**
- Multi-platform common: "John Smith" in Shopify vs. email address in PayPal
- Fix: enable Smart Reconciliation to match across platforms

**"Payment is not matched with Invoice"**
- Invoice already paid, amount mismatch, or customer name mismatch
- Fix: verify invoice is open, check amounts and customer names

### Tax Errors
- Sales tax going to wrong account: tax mapping not configured in Settings → Tax
- Non-US QBO: tax must be applied in Synder settings if processor doesn't calculate it
- Stripe tax discrepancy: Stripe Tax (automated) vs. manual tax calculation conflict

### Connection Errors
- Platform shows as disconnected: re-authorize in Organization Settings
- "Why was my accounting company disconnected from Synder?": password changed, OAuth expired, security settings revoked access
- QBO "Automatically Apply Credits" setting: must be disabled in QBO to prevent Synder sync conflicts

### QuickBooks Desktop Specific Issues
- Requires a local Synder Connector application installed on the PC
- Connector can fail/need troubleshooting independently of Synder's web app
- QBD entities not appearing in dropdowns: connector sync needed
- Product mapping works differently than QBO

---

## 5. UX-Relevant Terminology

### Core Product Terms (must be consistent)

| Term | Usage |
|------|-------|
| **Sync** | The act of pushing transactions to accounting software |
| **Import** | Pulling transactions from payment platform into Synder |
| **Platform Transactions** | The Synder page listing all imported transactions with status |
| **Clearing Account** | Temporary holding account; staging area between platform and bank |
| **Payout** | Bulk transfer from payment processor to bank account |
| **Mapping Group** | Summary mode rule that assigns transactions to accounts |
| **Smart Rules** | Conditional automation rules modifying sync behavior |
| **Smart Reconciliation** | Feature matching payments to ecommerce orders |
| **Rollback** | Undoing a sync (removes record from accounting, returns to "Ready to Sync") |
| **Historical Import** | Importing past transactions (before Synder connection) |
| **Auto-Import** | Automatic periodic pulling from payment platforms |
| **Auto-Sync** | Automatic pushing to accounting after import |
| **Summary** | An aggregated journal entry representing multiple transactions for a time period |
| **Rebuild** | Reprocessing an existing summary with current grouping rules |
| **Mapping** | The settings that define which transactions post to which accounts |
| **Organization** | A Synder account workspace (one company = one organization) |
| **Integration** | A connected platform (e.g., "Stripe integration", "Shopify integration") |
| **Connector** | The local application required for QuickBooks Desktop (not needed for QBO) |
| **Explain** | The UI element under sync status that describes why a transaction didn't sync |
| **Posting Date** | The date used for the accounting document (can be transaction date or balance date) |
| **Home Currency** | The base currency of the accounting company |

### Summary-Mode Specific Terms

| Term | Usage |
|------|-------|
| **Summary Sync** | The sync mode that produces aggregated journal entries |
| **Daily Summary** | Aggregation period: one journal entry per calendar day |
| **Per Payout Summary** | Aggregation period: one journal entry per payout event |
| **Monthly Summary** | Aggregation period: one journal entry per calendar month |
| **Mapping Group** | A conditional filter determining account assignment |
| **Aggregated View** | Tab in summary preview showing rolled-up totals by account/description |
| **Drilldown** | Clickable detail view showing individual transactions behind a summary line |
| **COGS** | Cost of Goods Sold — expense tracking per product |
| **Verified Product** | A product with confirmed cost data, required for COGS sync |
| **Close-Ready** | Summaries formatted for efficient month-end close |

### Navigation Labels (actual UI terms)
- **Settings** (left sidebar) → integration-specific sub-sections
- **Platform Transactions** (left sidebar) — transaction list
- **Reconciliation** (left sidebar, if available)
- **Smart Rules** (left sidebar) → Rules, Templates
- **Summaries** (left sidebar, in Summary mode) → Summaries list, Register
- **Register** — table view within Summaries showing individual transaction assignments to groups
- **Organization Settings** (top-right person icon menu)
- **Changelog** — audit log of setting changes
- **Reporting** — Balance sheet and other reports (within Synder)
- **Products and Services** — product management for COGS and mapping

---

## 6. Platform-Specific Quirks

### Stripe
- Most fully-featured integration in Synder (10 sub-sections in settings)
- **Posting Date** setting: choose between transaction creation date vs. balance date
- **Per Payout Summary** is a key Stripe feature — aligns summaries with bank deposits
- **Manual payouts**: not supported in Per Payout mode (only automatic payouts); must be handled differently
- **Top-ups**: not supported in Per Payout mode
- **Stripe reserves**: separate balance reserve account setting to track reserve holds
- **Application fees**: dedicated settings for Stripe Connect platform use cases
- **Stripe Tax**: can create discrepancies if Stripe Tax (automated) conflicts with manual tax settings
- **Pending transactions**: auto-archive setting keeps dashboard clean when Stripe pending transactions never finalize
- **Disputes**: create Adjustment transactions in Synder (Expense for withdrawal, Deposit for reversal)
- Stripe-QBO reconciliation: per-payout summaries → compare clearing account balance with Stripe's payout balance

### Shopify
- Two parts to connect: **Shopify store** (ecommerce/order data) + **payment processor** (e.g., Shopify Payments, Stripe, PayPal)
- **Shopify Payments** is effectively a wrapper — money flows through Stripe internally
- **Shop Cash** is NOT automatically synced — requires separate "Create Additional Settings" in Shopify settings
- **Shop Pay Installments** similarly need special handling
- **Shopify POS, Manual, and Other Orders** behave differently and may need separate configuration
- **Smart Reconciliation** available: Shopify + Stripe/PayPal/Square/Authorize.net/Braintree/Affirm/Afterpay/Amazon Pay
- **B2B net payment terms**: "Sync Open Invoices" setting required
- **Amazon FBA + Amazon Pay split**: special guide needed when seller uses both FBA and Amazon Pay

### Amazon
- **Delayed data**: Amazon reports are often delivered late — causes partially synced summaries in daily mode
- Recommendation: sync Amazon summaries with a 1-day delay
- **FBA vs Amazon Pay**: separate products; summaries must be correctly split
- **UNSETTLED_FEE**: appears as a transaction type when settlement report isn't released yet — normal behavior, not an error
- **Unsupported transaction types**: some Amazon-specific transaction types are not supported — documented separately
- **Custom Unified Transactions report**: the report to use when reconciling Amazon clearing accounts
- **Reconciliation complexity**: requires Excel VLOOKUP comparison between Amazon report and QBO clearing account report
- Amazon IDs in QBO have format `CHARGE-[ID]`, `REFUND-[ID]`, `COUPON-[ID]` — needs formula adjustment for matching

### PayPal
- **Clearing account reconciliation** has its own guide for Per-Transaction mode
- Customer name discrepancy: PayPal uses email address as customer identifier; other platforms use name — Smart Reconciliation recommended
- Xero users: "Customize PayPal Settings (Xero)" — different settings path than QBO

### WooCommerce
- If using **multiple payment gateways** in WooCommerce (e.g., Stripe + PayPal), each gateway must be connected to Synder separately
- Without connecting all gateways, reconciliation won't be complete

### Square
- Separate detailed settings guide: "Customize Settings for Square Accounting Integration"
- 8 QBO-specific sub-articles, 8 Xero-specific sub-articles

### Afterpay/Clearpay
- **Sales-only integration**: syncs sales and refunds only
- Payouts and processing fees are NOT synced automatically
- Must be recorded manually
- Supported in Smart Reconciliation for Shopify and WooCommerce

### Walmart
- **Walmart USA**: syncs sales, refunds, and processing fees; payouts are NOT synced (manual reconciliation needed)
- **Walmart Canada**: sales-only integration (sales + refunds); fees are NOT synced
- Payout process must be handled manually for both markets

### Authorize.Net
- Syncs only sales and refunds (gross amount)
- Payouts and fees must be recorded manually
- Reconciliation requires creating a manual QBO rule to handle the clearing

### Faire
- Faire posting dates are complex — guide specifically covers date discrepancies
- Multi-step reconciliation: export reports → prepare data → understand Faire's date system → match

### GoCardless
- Available in both QBO and Xero
- Separate sub-sections under each accounting platform

### Brex
- Available in QBO, Xero, and QuickBooks Desktop
- Credit card/expense card integration

### Affirm / Afterpay (BNPL)
- Buy Now Pay Later platforms — Synder treats them as sales integrations
- Available across QBO, Xero, and QuickBooks Desktop

### Klarna
- Video tutorial available specifically for Klarna sync behavior

### TikTok Shop
- Available in QBO, Xero, and QuickBooks Desktop (3 articles each)
- Growing platform with dedicated sub-sections

---

## 7. Accounting Platform Differences

### QuickBooks Online (QBO)
- OAuth-based connection (token expires periodically)
- Automated Sales Tax (US): QBO calculates tax automatically; Synder records it in the tax field
- Non-US: manual tax mapping required in Synder settings
- "Automatically Apply Credits" setting in QBO **must be disabled** to prevent Synder sync conflicts
- Multicurrency: must be enabled in QBO Settings → Advanced → Currency first
- Per-currency customer records required (QBO limitation)
- QBO classes and locations: can be applied via settings or Smart Rules
- Revenue recognition journal entries: can auto-apply classes/locations (QBO-specific feature)
- Clearing account report: downloadable from QBO for reconciliation comparison

### Xero
- OAuth-based connection
- "No Items Available to Sell" error: item not marked "for sale" in Xero — edit item in Xero
- "Customer already exists" error: duplicate contacts — merge/deduplicate in Xero
- Sales tax in Xero: separate guide for Per-Transaction vs. Summary mode
- Amazon settings customization: separate Xero-specific guide

### Sage Intacct
- Enterprise-grade, **not a one-click setup** — multi-step configuration
- Requires Web Services enabled
- Requires creating a dedicated Web Services user with GL Read/Write role
- Provides Company ID, User ID, password (not OAuth)
- Multi-entity support: accounts can be mapped to different entities within Sage Intacct
- Journal entry reconciliation: dedicated guide for Sage Intacct JE reconciliation

### Oracle NetSuite
- Connection guide available ("How to Connect Oracle NetSuite to Synder")
- Requires creating a dedicated NetSuite user with integration credentials
- Shopify reconciliation in NetSuite: separate guide
- Stripe reconciliation in NetSuite: separate guide
- Available on Scale plan and higher

### QuickBooks Desktop
- Requires **Synder Connector** (local application) installed on Windows PC
- Connector must be running for syncs to work
- Connector troubleshooting guide available
- Product mapping works differently (items must exist in QBD)
- Entities (customers, vendors, items) must be synced to Connector before appearing in dropdowns
- "Why Was My Accounting Company Disconnected?" — common issue with QBD connector

---

## 8. Account & Team Management

### Multi-Client / Multi-Org
- Accountants/bookkeepers can manage multiple clients from one Synder account
- "Connect Another Client to Synder" — adds a new organization
- "Add Another QuickBooks/Xero Company to Synder" — adds an accounting company to existing org
- Organizations are independent: separate settings, integrations, transactions

### User Roles
- Organization owners can invite additional users
- Users can be invited via "Invite a User to Synder" flow
- Role-based access (admin vs. limited)

### Plan Details
- **Starter**: up to 500 txns/month, 2 integration slots, daily import, basic support
- **Medium**: 500–3K txns/month, unlimited integrations, hourly import
- **Scale**: 3K–50K txns/month, hourly, Sage Intacct/NetSuite access
- **Enterprise**: 50K+ txns/month, everything unlimited, Slack support, custom development

Plan differences affect:
- Product mapping (available from "Essential" plan and higher)
- Smart Reconciliation: included in Pro and Enterprise plans
- Sync discounts as products: Premium feature (Pro/Premium plans only)
- Apply location: Premium feature
- Generic customer name: available from Essential plan

---

## 9. Synder Accounting (Synder's Own Accounting Platform)

Synder has its own accounting module ("Synder Accounting") separate from QBO/Xero/etc. This appears to be a lighter-weight internal accounting view. Key articles:
- "Per-Transaction: Reconcile Your Checking Account in Synder Accounting"
- Supports multiple platforms natively
- Has per-platform sub-sections (Square, Pin Payments, Amazon, PayPal, etc.)
- 66 articles in this category, mostly platform-specific guides

---

## 10. Synder RevRec (Revenue Recognition)

Separate product from Synder Sync. Key points:
- Handles **GAAP/ASC 606** revenue recognition for subscription businesses
- Primarily integrates with **Stripe** (and Excel imports)
- Tracks subscription changes: upgrades, downgrades, cancellations, prorations
- Generates **waterfall reports** (by month/customer)
- Syncs to **Deferred Revenue** account
- Reconciliation via "Synder RevRec: Deferred Revenue Reconciliation Report"
- "Debits & Credits Report" available for detailed verification
- Error: "Enter a Service Date for the Revenue Recognition Line Item" — common Smart Rules issue with RevRec

---

## 11. Online Payments (Invoice Feature)

Synder has an invoicing module:
- Create invoices directly in Synder
- Schedule recurring invoices
- Send PDF invoices via email
- Customers can pay QBO invoices via credit card through Synder
- Email address for PDF invoices can be customized
- "Why Has an Invoice Not Been Sent?" — troubleshooting guide exists

---

## Key Insights for UX Research

### High-Friction Onboarding Moments
1. **Clearing account setup** — most misunderstood concept; users set it to bank account instead of temporary account
2. **Sync mode choice** — users don't understand Per-Transaction vs. Summary until after they've broken something
3. **Product mapping setup** — most common first-sync error is product-related; feels like a blocker
4. **Sage Intacct connection** — 5-step enterprise setup with high failure potential
5. **QuickBooks Desktop Connector** — separate local app adds friction; connection issues are common

### Common User Mental Models (that don't match Synder's model)
- "Just connect Stripe and it syncs to QuickBooks" — missing the Import step, the configuration step, and the reconciliation step
- "My bank account should be the clearing account" — fundamentally backward
- "I can fix a wrong sync in QuickBooks" — must rollback in Synder first
- "Summary mode is simpler" — it reduces document volume but adds mapping group complexity

### Highest-Volume Help Articles (based on recency/breadth)
- Sync errors troubleshooting
- Sync keeps pausing (7 causes)
- Settings checklist for first sync
- Clearing account reconciliation guides (per platform)
- Transaction statuses explained
- Product mapping

### Features Most Likely to Cause Support Tickets
- Product/service matching failures
- Auto-sync disabling itself
- Amazon partially synced summaries
- Clearing account not zeroing
- OAuth token expiration (silent failure)
- QBO "Automatically Apply Credits" conflict
