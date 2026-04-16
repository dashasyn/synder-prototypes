# Synder Copy Vocabulary
> Source: Ignat, March 2026. This is the canonical reference for all Synder UI copy.

## General Rules
- Start phrases/expressions with a capital letter. Next words lowercase.
  - ✅ Payment method / Data simplification / Accounts receivable
  - ✅ You can change this in Products and services

## Synder Product Names
- **Synder** — always capitalized
- **Synder Sync**
- **Per Transaction Sync**
- **Summary Sync**
- **Synder Insights**
- **Synder RevRec**
- **AI reports**

## Accounting Companies
- QuickBooks Online
- QuickBooks Desktop
- Xero
- Sage Intacct
- Custom ERP

## Account Names
- All words capitalized: Accounts Receivable, Cost of Goods Sold, Accounts Payable

## Page Names
- Start with capital letter
- Must match the sidebar name
- No quotation marks in text: "Go to Settings", "You can change this in Products and services", "Go to My account"

## Popular Buttons
- **Add** (not "Create"): Add group, Add product
- **Download** — for downloadable resources
- **Import historical data**
- **Learn more** — generic guide link
- **New verification**
- **Regroup** — apply groups
- **Refresh** — update an instance (e.g. summary) with updated settings
- **Reload** — reload the page to see progress
- **Reconnect**
- **Schedule a call**
- **Sync** — synchronize to books. The main action.
- **Update** — Update changes, Update mapping, Update settings, Update organization name
- **Upgrade plan** — across the interface

## Dropdowns, Selects, Inputs, Search
- Default placeholder: `Select…`
- Default search placeholder: `Search by {list}` (e.g. "Search by name, amount or email")
- Default validation/error: `Required`

## Date Format
- **MM/DD/YYYY** — American format by default
- **Jun 12, 2025** — preferable display format

## Popular Phrases
- "Please contact support for help."
- "Unpaid (open) invoices" — or just "Unpaid invoices"
- "Are you sure you want to proceed?"

## Toast Patterns

### Success (enable/change/update): `{Thing} {past participle}!`
- Settings updated!
- Mapping grouping changed!
- Location tracking enabled!
- COGS mode changed!
- Sync mode changed!
- Request sent!

### Disable: `{Thing} disabled.`
- Location tracking disabled.
- Auto-import disabled.

### Informational: `{Sentence}.`
- The report will be sent to your email.

### Failure: `Couldn't {verb} {noun}.`
- Couldn't send the email.
- Couldn't update settings.
- Couldn't save changes.

### Rules
- No "was successfully" — filler, remove it
- Enable/change/update → exclamation mark (positive confirmation)
- Disable → period (neutral)
- Failure → period (calm tone for errors)

## Alerts
- Header: short and easy to understand
- Description: adds details to understand the issue
- Progress pattern: `{Action} is in progress…` (e.g. "Schedule building is in progress…", "Import is in progress…")

## UI Words — Canonical Terms
| Use this | NOT this |
|----------|----------|
| **Integration** | payment platform, sales platform, provider, system — data sources (Stripe, Shopify, Amazon) |
| **Accounting company** | accounting platform, accounting software — the software itself (QBO, Xero, Sage Intacct) |
| **Books** | your company, your accounting, ledger — the data/ledger inside the accounting company |
| **Disable** | turn off, switch off |
| **Enable** | turn on, switch on |
| **Import** | fetch, pull (importing data from integrations into Synder) |
| **Sync** (Synchronization) | post, push (syncing data from Synder to books) |
| **Rollback** | (buttons/statuses; "rolled back" in past tense) |
| **Higher plan** | specific plan names in upsells |
| **Generic** | default/unknown value (generic customer, generic account) |
| **Timezone** | time zone |
| **Click** | press, tap (desktop only) |
| **Pricing** | billing |
| **Upgrade plan** | moving to a higher tier |
| **Update** | changing details within current tier |
| **Add** | standard verb for creating new items (Add group, Add product, Add Smart Rule) |

### Integration vs Books vs Accounting company
- **Integration** = data source (Stripe, Shopify, Amazon)
- **Books** = the data/ledger ("synced to your books", "transactions in your books")
- **Accounting company** = the software (QuickBooks Online, Xero) — use when referring to the platform itself ("Enable multicurrency in your accounting company")

### Error messages
- Pattern: `Couldn't {verb} {noun}.`
- Examples: Couldn't send the email. / Couldn't update settings.

### Validation
- Default: `Required`

### Numbers
- Always use digits: 3, 4, 5 (not "three", "four", "five")

### Unpaid (open) invoices
- Keep both terms: "Unpaid (open) invoices" — different integrations use different terms

## Organizational Terms
- **Accounting firm** — real accounting brand (Decimal, Morris Better, Hire Effect)
- **Accounting company** — accounting software connected to Synder (QBO, QBD, Xero)
- **Organization** — main unit in Synder; has accounting company + integrations + subscription plan
- **Integration** — any supported system/platform (Stripe, Amazon, Shopify, etc.)
- **Subscription** — Synder subscription or main unit in RevRec

## Statuses
- Only first word capitalized (e.g. "Synced with warnings")

### Platform Transactions
Failed, Rollback failed, Rule failed, Canceled, Rollback canceled, Not parsed, Synced, Synced with warnings, Skipped, Excluded from sync, In progress, Scheduled, Rollback in progress, Rollback scheduled, Ready to sync, Pending, Deleted, Deleted with warnings

### Import Verification
Verified, Unable to verify, Ready for review, Pending, File import failed

### Import Activity Log
Finished, In progress, Scheduled, Canceled, Interrupted, Failed

### Groups
Manual, Default

### Summaries (Transaction)
Ready to sync, Scheduled, In progress, Pending, Refresh scheduled, Failed, Rolled back, Synced, Synced with warnings, Rollback scheduled, Rollback in progress, Rollback failed, Partly synced

### Summaries (Sync)
Fetching, Partly fetched, Fully fetched

### RevRec
Incomplete, Paused, Updating, Ready, Trial
