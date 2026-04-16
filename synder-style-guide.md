# Synder UX Copy Style Guide

*Source: Ignat, 2026-03-20*

## General Rules

- Phrases/expressions start with a capital letter, subsequent words lowercase
- Examples: Payment method / Data simplification / Accounts receivable / You can change this in Products and services

## Product Names

- **Synder** — always capitalized
- **Synder Sync**
- **Per Transaction Sync**
- **Summary Sync**
- **Synder Insights**
- **Synder RevRec**
- **AI reports**

## Accounting Company Names

- QuickBooks Online
- QuickBooks Desktop
- Xero
- Sage Intacct
- Custom ERP

## Account Names

- All words capitalized: Accounts Receivable, Cost of Goods Sold, Accounts Payable

## Page Names

- Start with a capital letter
- Must match the sidebar name
- In body text: capital letter, no quotation marks
- Examples: Go to Settings / You can change this in Products and services / Go to My account

## Popular Buttons

| Button | Usage |
|--------|-------|
| Apply / Reset filters | Filter actions |
| Add | Preferred over "Create" (Add group, Add product) |
| Download | For all downloadable resources |
| Import historical data | — |
| Learn more | Generic link to a guide |
| New verification | — |
| Regroup | Apply groups |
| Refresh | Update an instance (e.g. summary) with updated settings |
| Reload | Reload page to see progress |
| Reconnect | — |
| Schedule a call | — |
| Sync | Synchronize to books. The main action. |
| Update | Update changes / Update mapping / Update settings / Update organization name |
| Upgrade plan | Used everywhere for plan upsell/change |

## Dropdowns, Selects, Inputs, Search

- Default placeholder: `Select…`
- Default search placeholder: `Search by {list of options}` (e.g. Search by name, amount or email)
- Default validation/error: `Required`

## Date Format

- **MM/DD/YYYY** — default American format
- **Jun 12, 2025** — preferable display format

## Popular Phrases

- Please contact support for help.
- Are you sure you want to proceed?

- **Unpaid (open) invoices** — always use both words together (matches integration terminology)

## Popular Toasts

### Pattern
- ✅ Success: `{Action} {past participle}` — no period, no exclamation
- ❌ Error: `Couldn't {verb} the {noun}.` — with period
- No "successfully" — redundant with success styling
- No "please" prefix
- No exclamation marks

### Examples
- ✅ Report generated
- ✅ Settings updated
- ✅ Sync started
- ✅ Mapping grouping changed
- ✅ COGS mode changed
- ✅ Location tracking enabled
- ❌ Couldn't generate the report.
- ❌ Couldn't send the email.
- ❌ Couldn't start synchronization.
- ℹ️ The report will be sent to your email.
- ℹ️ Request sent

## Alerts

- Header: short and easy to understand
- Description: adds detail to understand the issue
- Progress pattern: `{Action} is in progress…` (e.g. Schedule building is in progress…, Import is in progress…)

## UI Terminology

| Term | Usage |
|------|-------|
| Integration | Name for all supported systems/platforms (Stripe, Amazon, Shopify etc.) |
| Disable | Not "turn off" or "switch off" |
| Enable | Not "turn on" or "switch on" |
| Books | Generic word instead of specific accounting platform name |
| Import | Process of importing data from integrations into Synder |
| Sync (Synchronization) | Process of synchronizing data from Synder to books |
| Rollback | Buttons and statuses (past tense: "rolled back") |
| Higher plan | Not "upper plan" etc. |
| Generic | Preferred over "default/unknown" (generic customer, generic account) |
| Timezone | One word |
| Accounting firm | Real accounting brand (Decimal, Morris Better, Hire Effect) |
| Accounting company | Accounting software connected to Synder (QBO, QBD, Xero) |
| Organization | Main unit in Synder; has integrations + accounting company + subscription plan |
| Subscription | RevRec unit OR a subscription to Synder |
| Pricing | Not "billing" |

- **Click** — for UI elements (buttons, links, toggles, checkboxes)
- **Press** — for keyboard shortcuts only (Press Enter, Press Ctrl+Z)

## Statuses

- Only first word capitalized
- Example: Synced with warnings

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
